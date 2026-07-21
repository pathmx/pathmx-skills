#!/usr/bin/env bun

import { existsSync } from "node:fs"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

import {
  defaultArtifactsRoot,
  evalsRoot,
  findEvalProfile,
  gradeLearningSpace,
  loadEvalProfiles,
  loadRubric,
  loadScenario,
  loadScenarios,
  repoRoot,
  runCommand,
  selectedWorkspaceContent,
  summarizeDeterministicChecks,
  subjectPrompt,
  validateScenario,
} from "./evals/core"
import { runJudge, runSubject } from "./evals/codex"
import { formatDuration, writeReport } from "./evals/report"

type Options = Record<string, string | boolean>

function parseArgs(args: string[]) {
  const positional: string[] = []
  const options: Options = {}
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (!argument.startsWith("--")) {
      positional.push(argument)
      continue
    }
    const key = argument.slice(2)
    if (key.startsWith("no-")) {
      options[key.slice(3)] = false
      continue
    }
    const next = args[index + 1]
    if (next && !next.startsWith("--")) {
      options[key] = next
      index += 1
    } else options[key] = true
  }
  return { positional, options }
}

function usage() {
  return `PathMX eval harness

Usage:
  bun run eval -- check
  bun run eval -- list
  bun run eval -- plan <scenario>
  bun run eval -- run <scenario> [options]
  bun run eval -- grade <run-directory> [--judge]

Run options:
  --profile <id>             Subject profile (default: desktop-power)
  --model <slug>             Override the subject profile model
  --reasoning <effort>       Override the subject profile reasoning effort
  --runs <count>             Repetitions (default: 1)
  --judge                    Run independent model judge
  --judge-profile <id>       Judge profile (default: judge-quality)
  --judge-model <slug>       Override the judge profile model
  --judge-reasoning <effort> Override the judge profile effort
  --bootstrap-url <url>      Override local/hosted bootstrap source
  --candidate-starter <dir>  Stage a local starter candidate instead of fetching
  --artifacts <directory>    Artifact root outside the subject workspace
  --codex-home <directory>   Optional clean, already-authenticated CODEX_HOME
  --sandbox <mode>           workspace-write (default) or danger-full-access
  --collaboration <mode>     auto (default), off, or required
  --timeout-minutes <n>      Per-turn timeout (default: 30)
`
}

async function checkSuite() {
  const findings: string[] = []
  const scenarios = await loadScenarios().catch((error) => {
    findings.push(error instanceof Error ? error.message : String(error))
    return []
  })
  for (const scenario of scenarios) {
    findings.push(...validateScenario(scenario, scenario.id))
  }
  await loadRubric().catch((error) => findings.push(error instanceof Error ? error.message : String(error)))
  const profiles = await loadEvalProfiles().catch((error) => {
    findings.push(error instanceof Error ? error.message : String(error))
    return undefined
  })
  for (const file of ["scenario.schema.json", "judge-result.schema.json"]) {
    try {
      JSON.parse(await readFile(path.join(evalsRoot, "schemas", file), "utf8"))
    } catch (error) {
      findings.push(`${file}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  const codex = await runCommand(["codex", "--version"], { cwd: repoRoot, timeoutMs: 10_000 })
  if (codex.exitCode !== 0) findings.push("codex CLI is not available")
  if (codex.exitCode === 0 && profiles) {
    const models = await runCommand(["codex", "debug", "models"], {
      cwd: repoRoot,
      timeoutMs: 10_000,
    })
    if (models.exitCode !== 0) findings.push("could not read the Codex model catalog")
    else {
      const available = new Set(
        (JSON.parse(models.stdout).models as Array<{ slug: string }>).map((model) => model.slug),
      )
      for (const profile of profiles.profiles) {
        if (!available.has(profile.model)) {
          findings.push(`eval profile ${profile.id} model is unavailable: ${profile.model}`)
        }
      }
    }
  }
  if (findings.length > 0) throw new Error(findings.join("\n"))
  console.log(`Checked ${scenarios.length} scenarios and the shared rubric.`)
  console.log(codex.stdout.trim())
}

async function gradeRun(runDir: string, withJudge: boolean, options: Options) {
  const metadata = JSON.parse(await readFile(path.join(runDir, "run.json"), "utf8"))
  const scenarioFile = path.join(runDir, "scenario.json")
  const scenario = existsSync(scenarioFile)
    ? (JSON.parse(await readFile(scenarioFile, "utf8")) as Awaited<ReturnType<typeof loadScenario>>)
    : await loadScenario(metadata.scenarioId)
  const rubric = await loadRubric()
  const profiles = await loadEvalProfiles()
  const judgeProfileId = String(
    options["judge-profile"] ?? metadata.judgeProfile ?? profiles.defaultJudge,
  )
  const judgeProfile = findEvalProfile(profiles, judgeProfileId, "judge")
  const workspace = path.join(runDir, "subject", scenario.learner.learningSpace)
  const transcript = await readFile(path.join(runDir, "transcript.md"), "utf8").catch(() => "")
  let deterministic = await gradeLearningSpace(workspace, { transcript })
  const phaseContracts = JSON.parse(
    await readFile(path.join(runDir, "phase-contracts.json"), "utf8").catch(() => "[]"),
  ) as Array<{
    turnId: string
    passed: boolean
    checks: Array<{ id: string; expected: string; actual: string; passed: boolean }>
  }>
  if (phaseContracts.length > 0) {
    const failures = phaseContracts.flatMap((contract) =>
      contract.checks
        .filter((check) => !check.passed)
        .map(
          (check) =>
            `${contract.turnId}: ${check.id} expected ${check.expected}, got ${check.actual}`,
        ),
    )
    deterministic = summarizeDeterministicChecks([
      ...deterministic.checks,
      {
        id: "sequence.phase-contract",
        label: "Learning work appears at the intended phase",
        passed: failures.length === 0,
        critical: false,
        weight: 3,
        evidence: failures.length ? failures.join("; ") : `${phaseContracts.length} phase contracts passed`,
      },
    ])
  }
  const collaboration = JSON.parse(
    await readFile(path.join(runDir, "collaboration.json"), "utf8").catch(() => "{}"),
  ) as {
    totals?: {
      successfulSpawnCount?: number
      workerCount?: number
      errorCount?: number
    }
  }
  if (metadata.collaborationMode === "required") {
    const successfulSpawnCount = collaboration.totals?.successfulSpawnCount ?? 0
    const errorCount = collaboration.totals?.errorCount ?? 0
    deterministic = summarizeDeterministicChecks([
      ...deterministic.checks,
      {
        id: "orchestration.subagents",
        label: "The learning workflow used healthy direct subagents",
        passed: successfulSpawnCount > 0 && errorCount === 0,
        critical: true,
        weight: 2,
        evidence: `successful spawns=${successfulSpawnCount}; workers=${collaboration.totals?.workerCount ?? 0}; collaboration errors=${errorCount}`,
      },
    ])
  }
  await writeFile(
    path.join(runDir, "deterministic.json"),
    `${JSON.stringify(deterministic, null, 2)}\n`,
  )
  await writeFile(
    path.join(runDir, "workspace-content.md"),
    await selectedWorkspaceContent(workspace),
  )
  const judge = withJudge
    ? await runJudge(runDir, rubric, scenario, {
        model: String(options["judge-model"] ?? metadata.judgeModel ?? judgeProfile.model),
        reasoning: String(
          options["judge-reasoning"] ?? metadata.judgeReasoning ?? judgeProfile.reasoning,
        ),
        timeoutMs: Number(options["timeout-minutes"] ?? 30) * 60_000,
        codexHome:
          typeof options["codex-home"] === "string"
            ? path.resolve(options["codex-home"])
            : metadata.codexHome,
      })
    : undefined
  const report = await writeReport(runDir, scenario, deterministic, rubric, judge)
  console.log(`${scenario.id}: ${report.combined.percentage}% (${report.combined.criticalPassed ? "critical pass" : "critical fail"})`)
  console.log(path.join(runDir, "report.md"))
  return report
}

async function main() {
  const { positional, options } = parseArgs(Bun.argv.slice(2))
  const command = positional[0] ?? "help"
  if (command === "help" || command === "--help") {
    console.log(usage())
    return
  }
  if (command === "check") {
    await checkSuite()
    return
  }
  if (command === "list") {
    for (const scenario of await loadScenarios()) {
      console.log(`${scenario.id.padEnd(24)} ${scenario.title}`)
    }
    return
  }
  if (command === "plan") {
    const scenario = await loadScenario(positional[1] ?? "")
    const bootstrap = scenario.bootstrap.source === "local" ? "./bootstrap.md" : scenario.bootstrap.url ?? ""
    console.log(subjectPrompt(scenario, bootstrap))
    for (const turn of scenario.turns) console.log(`\n[${turn.phase}:${turn.id}]\n${turn.message}`)
    return
  }
  if (command === "grade") {
    const runDir = path.resolve(positional[1] ?? "")
    if (!existsSync(path.join(runDir, "run.json"))) throw new Error("Run directory has no run.json")
    await gradeRun(runDir, options.judge === true, options)
    return
  }
  if (command !== "run") throw new Error(`Unknown command: ${command}\n\n${usage()}`)

  const scenario = await loadScenario(positional[1] ?? "")
  const artifactsRoot = path.resolve(String(options.artifacts ?? defaultArtifactsRoot()))
  const repetitions = Number(options.runs ?? 1)
  if (!Number.isInteger(repetitions) || repetitions < 1 || repetitions > 20) {
    throw new Error("--runs must be an integer from 1 to 20")
  }
  const timeoutMs = Number(options["timeout-minutes"] ?? 30) * 60_000
  const profiles = await loadEvalProfiles()
  const subjectProfileId = String(options.profile ?? profiles.defaultSubject)
  const subjectProfile = findEvalProfile(profiles, subjectProfileId, "subject")
  const model = String(options.model ?? subjectProfile.model)
  const reasoning = String(options.reasoning ?? subjectProfile.reasoning)
  const sandbox = String(options.sandbox ?? "workspace-write")
  if (sandbox !== "workspace-write" && sandbox !== "danger-full-access") {
    throw new Error("--sandbox must be workspace-write or danger-full-access")
  }
  const collaboration = String(options.collaboration ?? "auto")
  if (!new Set(["auto", "off", "required"]).has(collaboration)) {
    throw new Error("--collaboration must be auto, off, or required")
  }
  const judgeProfileId = String(options["judge-profile"] ?? profiles.defaultJudge)
  const judgeProfile = findEvalProfile(profiles, judgeProfileId, "judge")
  const judgeModel = String(options["judge-model"] ?? judgeProfile.model)
  const judgeReasoning = String(options["judge-reasoning"] ?? judgeProfile.reasoning)
  const codexVersion = await runCommand(["codex", "--version"], {
    cwd: repoRoot,
    timeoutMs: 10_000,
  })
  const packageJson = JSON.parse(await readFile(path.join(repoRoot, "package.json"), "utf8"))
  await mkdir(artifactsRoot, { recursive: true })
  const stamp = new Date().toISOString().replaceAll(":", "-").replace(/\.\d{3}Z$/, "Z")
  const batchDir = path.join(artifactsRoot, `${scenario.id}-${stamp}`)
  await mkdir(batchDir, { recursive: false })
  const reports: Awaited<ReturnType<typeof gradeRun>>[] = []

  for (let repetition = 1; repetition <= repetitions; repetition += 1) {
    const runDir = path.join(batchDir, `run-${String(repetition).padStart(2, "0")}`)
    await mkdir(runDir, { recursive: false })
    const metadata = {
      schema: "pathmx-eval/run",
      version: 1,
      scenarioId: scenario.id,
      scenarioFile: `evals/scenarios/${scenario.id}.yaml`,
      startedAt: new Date().toISOString(),
      repetition,
      subjectProfile: subjectProfileId,
      subjectModel: model,
      subjectReasoning: reasoning,
      subjectSandbox: sandbox,
      collaborationMode: collaboration,
      codexVersion: codexVersion.stdout.trim(),
      pathmxCompatibility: packageJson.pathmxCompatibility,
      judgeRequested: options.judge === true,
      judgeProfile: judgeProfileId,
      judgeModel,
      judgeReasoning,
      bootstrapUrl: options["bootstrap-url"],
      candidateStarter:
        typeof options["candidate-starter"] === "string"
          ? path.resolve(options["candidate-starter"])
          : undefined,
      codexHome:
        typeof options["codex-home"] === "string"
          ? path.resolve(options["codex-home"])
          : undefined,
    }
    await writeFile(path.join(runDir, "run.json"), `${JSON.stringify(metadata, null, 2)}\n`)
    await writeFile(path.join(runDir, "scenario.json"), `${JSON.stringify(scenario, null, 2)}\n`)
    console.log(`Starting ${scenario.id} run ${repetition}/${repetitions}`)
    console.log(runDir)
    await runSubject(scenario, runDir, {
      model,
      reasoning,
      timeoutMs,
      sandbox,
      collaboration: collaboration as "auto" | "off" | "required",
      codexHome:
        typeof options["codex-home"] === "string"
          ? path.resolve(options["codex-home"])
          : undefined,
      bootstrapUrl: typeof options["bootstrap-url"] === "string" ? options["bootstrap-url"] : undefined,
      candidateStarter:
        typeof options["candidate-starter"] === "string"
          ? path.resolve(options["candidate-starter"])
          : undefined,
    })
    reports.push(await gradeRun(runDir, options.judge === true, options))
  }

  const percentages = reports
    .map((report) => report.combined.percentage)
    .sort((a, b) => a - b)
  const middle = Math.floor(percentages.length / 2)
  const median = percentages.length % 2
    ? percentages[middle]
    : (percentages[middle - 1] + percentages[middle]) / 2
  const batch = {
    scenarioId: scenario.id,
    subjectProfile: subjectProfileId,
    subjectModel: model,
    subjectReasoning: reasoning,
    runs: reports.length,
    criticalPasses: reports.filter((report) => report.combined.criticalPassed).length,
    criticalPassRate:
      Math.round(
        (reports.filter((report) => report.combined.criticalPassed).length / reports.length) *
          1000,
      ) / 10,
    median,
    worst: percentages[0],
    best: percentages.at(-1),
    medianTotalDurationMs: 0,
    slowestTurnDurationMs: Math.max(
      ...reports.map((report) => report.timing.slowestTurn?.durationMs ?? 0),
    ),
    runsWithTurnsOverFiveMinutes: reports.filter(
      (report) => report.timing.turnsOverFiveMinutes > 0,
    ).length,
    longestSilentGapMs: Math.max(
      ...reports.map((report) => report.timing.longestSilentTurn?.longestSilentGapMs ?? 0),
    ),
    runsWithSilentMinute: reports.filter(
      (report) => report.timing.turnsWithSilentMinute > 0,
    ).length,
  }
  const totalDurations = reports
    .map((report) => report.timing.totalDurationMs)
    .sort((left, right) => left - right)
  const durationMiddle = Math.floor(totalDurations.length / 2)
  batch.medianTotalDurationMs = totalDurations.length % 2
    ? totalDurations[durationMiddle]
    : (totalDurations[durationMiddle - 1] + totalDurations[durationMiddle]) / 2
  await writeFile(path.join(batchDir, "batch-report.json"), `${JSON.stringify(batch, null, 2)}\n`)
  await writeFile(
    path.join(batchDir, "batch-report.md"),
    `# Eval batch: ${scenario.title}\n\n- Subject profile: ${batch.subjectProfile}\n- Model: ${batch.subjectModel}\n- Reasoning: ${batch.subjectReasoning}\n- Runs: ${batch.runs}\n- Critical pass rate: ${batch.criticalPassRate}%\n- Median: ${batch.median}%\n- Worst: ${batch.worst}%\n- Best: ${batch.best}%\n- Median total model time: ${formatDuration(batch.medianTotalDurationMs)}\n- Slowest turn: ${formatDuration(batch.slowestTurnDurationMs)}\n- Runs with a turn over five minutes: ${batch.runsWithTurnsOverFiveMinutes}/${batch.runs}\n- Longest silent gap: ${formatDuration(batch.longestSilentGapMs)}\n- Runs with a silent gap over one minute: ${batch.runsWithSilentMinute}/${batch.runs}\n`,
  )
  console.log(`Batch: ${batch.criticalPassRate}% critical pass; median ${batch.median}%; worst ${batch.worst}%`)
  console.log(path.join(batchDir, "batch-report.md"))
}

await main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error))
  process.exit(1)
})
