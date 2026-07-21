import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import {
  captureWorkspace,
  evaluatePhaseContract,
  evalsRoot,
  gradeLearningSpace,
  parseCodexEvents,
  repoRoot,
  runCommand,
  subjectPrompt,
  type EvalScenario,
  type JudgeResult,
  type PhaseContractResult,
  type Rubric,
} from "./core"

export type CodexOptions = {
  model: string
  reasoning: string
  timeoutMs: number
  codexHome?: string
  sandbox?: "workspace-write" | "danger-full-access"
  collaboration?: "auto" | "off" | "required"
}

export function subjectCodexArgs(
  options: CodexOptions,
  cwd: string,
  finalFile: string,
  prompt: string,
  threadId?: string,
) {
  const global = [
    "-a",
    "never",
    "-C",
    cwd,
    "-s",
    options.sandbox ?? "workspace-write",
    "-m",
    options.model,
    "-c",
    `model_reasoning_effort=${JSON.stringify(options.reasoning)}`,
    "-c",
    "sandbox_workspace_write.network_access=true",
    "--disable",
    "plugins",
  ]
  if (options.collaboration === "off") global.push("--disable", "multi_agent")
  const exec = ["exec", "--ignore-user-config", "--ignore-rules", "--json", "-o", finalFile]
  if (threadId) exec.push("resume", threadId, prompt)
  else exec.push(prompt)
  return ["codex", ...global, ...exec]
}

export function judgeCodexArgs(
  options: CodexOptions,
  runDir: string,
  outputFile: string,
  schemaFile: string,
) {
  return [
    "codex",
    "-a",
    "never",
    "-C",
    runDir,
    "-s",
    "read-only",
    "-m",
    options.model,
    "-c",
    `model_reasoning_effort=${JSON.stringify(options.reasoning)}`,
    "--disable",
    "plugins",
    "exec",
    "--skip-git-repo-check",
    "--ignore-user-config",
    "--ignore-rules",
    "--ephemeral",
    "--json",
    "--output-schema",
    schemaFile,
    "-o",
    outputFile,
    "Read judge/judge-input.md and return the required structured evaluation.",
  ]
}

export function summarizeVisibleUpdates(
  lines: Array<{ elapsedMs: number; line: string }>,
  durationMs: number,
) {
  const updates = lines.flatMap(({ elapsedMs, line }) => {
    try {
      const event = JSON.parse(line) as {
        type?: string
        item?: { type?: string; text?: string }
      }
      return event.type === "item.completed" &&
        event.item?.type === "agent_message" &&
        event.item.text?.trim()
        ? [elapsedMs]
        : []
    } catch {
      return []
    }
  })
  const boundaries = [0, ...updates, durationMs]
  let longestSilentGapMs = 0
  for (let index = 1; index < boundaries.length; index += 1) {
    longestSilentGapMs = Math.max(longestSilentGapMs, boundaries[index] - boundaries[index - 1])
  }
  return {
    updateCount: updates.length,
    firstUpdateMs: updates[0],
    longestSilentGapMs,
  }
}

export function summarizeCollaboration(
  events: Array<Record<string, unknown>>,
  stderr = "",
) {
  const calls = events.flatMap((event) => {
    const item = event.item
    if (!item || typeof item !== "object" || Array.isArray(item)) return []
    const call = item as Record<string, unknown>
    return call.type === "collab_tool_call" ? [call] : []
  })
  const spawnCalls = calls.filter(
    (call) => typeof call.tool === "string" && /spawn/i.test(call.tool),
  )
  const workerThreadIds = new Set(
    spawnCalls.flatMap((call) =>
      Array.isArray(call.receiver_thread_ids)
        ? call.receiver_thread_ids.filter(
            (id): id is string => typeof id === "string" && Boolean(id),
          )
        : [],
    ),
  )
  const errorLines = stderr
    .split(/\r?\n/)
    .filter((line) =>
      /(?:collab|subagent).*(?:fail|error)|(?:fail|error).*(?:collab|subagent)/i.test(
        line,
      ),
    )

  return {
    callCount: calls.length,
    spawnCallCount: spawnCalls.length,
    successfulSpawnCount: spawnCalls.filter(
      (call) =>
        call.status === "completed" &&
        Array.isArray(call.receiver_thread_ids) &&
        call.receiver_thread_ids.length > 0,
    ).length,
    workerCount: workerThreadIds.size,
    waitCallCount: calls.filter((call) => call.tool === "wait").length,
    errorLines,
  }
}

async function findRollout(root: string, threadId: string): Promise<string | undefined> {
  const entries = await readdir(root, { withFileTypes: true }).catch(() => [])
  for (const entry of entries) {
    const candidate = path.join(root, entry.name)
    if (entry.isFile() && entry.name.includes(threadId) && entry.name.endsWith(".jsonl")) {
      return candidate
    }
    if (entry.isDirectory()) {
      const nested = await findRollout(candidate, threadId)
      if (nested) return nested
    }
  }
  return undefined
}

export async function summarizeStoredSubagents(
  threadId: string | undefined,
  codexHome?: string,
) {
  if (!threadId) {
    return {
      storeAvailable: false,
      workerThreadIds: [] as string[],
      workers: [] as Array<{ threadId: string; model?: string }>,
      workerCount: 0,
    }
  }
  const sessionsRoot = path.join(codexHome ?? path.join(os.homedir(), ".codex"), "sessions")
  const rollout = await findRollout(sessionsRoot, threadId)
  if (!rollout) {
    return {
      storeAvailable: false,
      workerThreadIds: [] as string[],
      workers: [] as Array<{ threadId: string; model?: string }>,
      workerCount: 0,
    }
  }

  const workerThreadIds = new Set<string>()
  for (const line of (await readFile(rollout, "utf8")).split(/\r?\n/)) {
    if (!line.trim()) continue
    try {
      const event = JSON.parse(line) as {
        type?: string
        payload?: {
          type?: string
          kind?: string
          agent_thread_id?: string
        }
      }
      if (
        event.type === "event_msg" &&
        event.payload?.type === "sub_agent_activity" &&
        event.payload.kind === "started" &&
        event.payload.agent_thread_id
      ) {
        workerThreadIds.add(event.payload.agent_thread_id)
      }
    } catch {}
  }
  const workers = await Promise.all(
    [...workerThreadIds].map(async (workerThreadId) => {
      const workerRollout = await findRollout(sessionsRoot, workerThreadId)
      let model: string | undefined
      if (workerRollout) {
        for (const line of (await readFile(workerRollout, "utf8")).split(/\r?\n/)) {
          if (!line.trim()) continue
          try {
            const event = JSON.parse(line) as {
              type?: string
              payload?: { model?: string }
            }
            if (event.type === "turn_context" && event.payload?.model) {
              model = event.payload.model
              break
            }
          } catch {}
        }
      }
      return { threadId: workerThreadId, model }
    }),
  )
  return {
    storeAvailable: true,
    workerThreadIds: [...workerThreadIds],
    workers,
    workerCount: workerThreadIds.size,
  }
}

async function runCodexTurn(
  args: string[],
  cwd: string,
  artifactDir: string,
  timeoutMs: number,
  codexHome?: string,
) {
  await mkdir(artifactDir, { recursive: true })
  const taskTemp = path.join(cwd, ".eval-tmp")
  await mkdir(taskTemp, { recursive: true })
  const result = await runCommand(args, {
    cwd,
    timeoutMs,
    env: {
      TMPDIR: taskTemp,
      BUN_TMPDIR: taskTemp,
      ...(codexHome ? { CODEX_HOME: codexHome } : {}),
    },
  })
  const visibleUpdates = summarizeVisibleUpdates(result.stdoutLineTimings, result.durationMs)
  const parsed = parseCodexEvents(result.stdout)
  const collaboration = {
    ...summarizeCollaboration(parsed.events, result.stderr),
    ...(await summarizeStoredSubagents(parsed.threadId, codexHome)),
  }
  await writeFile(path.join(artifactDir, "events.jsonl"), result.stdout)
  await writeFile(path.join(artifactDir, "stderr.log"), result.stderr)
  await writeFile(
    path.join(artifactDir, "process.json"),
    `${JSON.stringify(
      {
        command: result.command.map((part, index) => (index === result.command.length - 1 ? "<prompt>" : part)),
        exitCode: result.exitCode,
        timedOut: result.timedOut,
        durationMs: result.durationMs,
        ...visibleUpdates,
        collaboration,
      },
      null,
      2,
    )}\n`,
  )
  if (result.exitCode !== 0 || result.timedOut) {
    throw new Error(
      `Codex turn failed (${result.timedOut ? "timeout" : `exit ${result.exitCode}`}):\n${result.stderr.slice(-3000)}`,
    )
  }
  if (parsed.invalid.length > 0) throw new Error(`Invalid Codex JSONL: ${parsed.invalid.join(", ")}`)
  await writeFile(
    path.join(artifactDir, "turn.json"),
    `${JSON.stringify(
      {
        threadId: parsed.threadId,
        usage: parsed.usage,
        eventCount: parsed.events.length,
        collaboration,
      },
      null,
      2,
    )}\n`,
  )
  return { ...parsed, collaboration }
}

async function capturePhaseGrade(
  workspace: string,
  turnDir: string,
  transcript: Array<{ id: string; phase: string; learner: string; agent: string }>,
) {
  const result = await gradeLearningSpace(workspace, {
    runVerification: false,
    transcript: transcript.map((turn) => turn.agent).join("\n"),
  })
  await writeFile(
    path.join(turnDir, "phase-grade.json"),
    `${JSON.stringify(result, null, 2)}\n`,
  )
  return result
}

export async function runSubject(
  scenario: EvalScenario,
  runDir: string,
  options: CodexOptions & { bootstrapUrl?: string; candidateStarter?: string },
) {
  const subjectRoot = path.join(runDir, "subject")
  const turnsRoot = path.join(runDir, "turns")
  await mkdir(subjectRoot, { recursive: true })
  const git = await runCommand(["git", "init", "-q"], { cwd: subjectRoot, timeoutMs: 10_000 })
  if (git.exitCode !== 0) throw new Error(`Could not initialize subject root: ${git.stderr}`)

  let bootstrapReference: string
  if (options.bootstrapUrl || scenario.bootstrap.source === "hosted") {
    bootstrapReference = options.bootstrapUrl ?? scenario.bootstrap.url ?? ""
  } else {
    const destination = path.join(subjectRoot, "bootstrap.md")
    await Bun.write(destination, Bun.file(path.join(repoRoot, "bootstrap.md")))
    bootstrapReference = "./bootstrap.md"
  }

  if (options.candidateStarter) {
    const source = path.resolve(options.candidateStarter)
    const destination = path.join(subjectRoot, "candidate-starter")
    await cp(source, destination, {
      recursive: true,
      dereference: false,
      filter(candidate) {
        const relative = path.relative(source, candidate)
        return !relative
          .split(path.sep)
          .some((part) => [".git", "node_modules", ".pathmx", ".pathmx-check"].includes(part))
      },
    })
  }

  const initialPrompt = subjectPrompt(
    scenario,
    bootstrapReference,
    Boolean(options.candidateStarter),
  )
  await writeFile(path.join(runDir, "subject-prompt.md"), `${initialPrompt}\n`)
  const transcript: Array<{ id: string; phase: string; learner: string; agent: string }> = []
  const phaseContracts: PhaseContractResult[] = []
  const collaborationTurns: Array<{
    id: string
    phase: string
    collaboration: ReturnType<typeof summarizeCollaboration>
  }> = []
  let threadId: string | undefined
  const initialDir = path.join(turnsRoot, "00-bootstrap")
  const initialFinal = path.join(initialDir, "final.md")
  const initial = await runCodexTurn(
    subjectCodexArgs(options, subjectRoot, initialFinal, initialPrompt),
    subjectRoot,
    initialDir,
    options.timeoutMs,
    options.codexHome,
  )
  threadId = initial.threadId
  if (!threadId) throw new Error("Codex did not emit a thread.started event")
  const initialAgent = await readFile(initialFinal, "utf8").catch(() => "")
  transcript.push({ id: "bootstrap", phase: "bootstrap", learner: initialPrompt, agent: initialAgent })
  collaborationTurns.push({
    id: "bootstrap",
    phase: "bootstrap",
    collaboration: initial.collaboration,
  })
  await captureWorkspace(
    path.join(subjectRoot, scenario.learner.learningSpace),
    path.join(initialDir, "snapshot"),
  )
  await capturePhaseGrade(
    path.join(subjectRoot, scenario.learner.learningSpace),
    initialDir,
    transcript,
  )

  for (const [index, turn] of scenario.turns.entries()) {
    const turnDir = path.join(
      turnsRoot,
      `${String(index + 1).padStart(2, "0")}-${turn.id}`,
    )
    const finalFile = path.join(turnDir, "final.md")
    const result = await runCodexTurn(
      subjectCodexArgs(options, subjectRoot, finalFile, turn.message, threadId),
      subjectRoot,
      turnDir,
      options.timeoutMs,
      options.codexHome,
    )
    const agent = await readFile(finalFile, "utf8").catch(() => "")
    transcript.push({ id: turn.id, phase: turn.phase, learner: turn.message, agent })
    collaborationTurns.push({
      id: turn.id,
      phase: turn.phase,
      collaboration: result.collaboration,
    })
    await captureWorkspace(
      path.join(subjectRoot, scenario.learner.learningSpace),
      path.join(turnDir, "snapshot"),
    )
    const phaseGrade = await capturePhaseGrade(
      path.join(subjectRoot, scenario.learner.learningSpace),
      turnDir,
      transcript,
    )
    const phaseContract = evaluatePhaseContract(turn, phaseGrade)
    if (phaseContract) {
      phaseContracts.push(phaseContract)
      await writeFile(
        path.join(turnDir, "phase-contract.json"),
        `${JSON.stringify(phaseContract, null, 2)}\n`,
      )
    }
  }

  await writeFile(path.join(runDir, "transcript.json"), `${JSON.stringify(transcript, null, 2)}\n`)
  await writeFile(
    path.join(runDir, "transcript.md"),
    `${transcript
      .map(
        (turn) =>
          `# Turn: ${turn.id} (${turn.phase})\n\n## Learner\n\n${turn.learner}\n\n## Agent\n\n${turn.agent}`,
      )
      .join("\n\n")}\n`,
  )
  const phaseEvidence: string[] = []
  for (const [index, turn] of transcript.entries()) {
    const directoryName =
      index === 0
        ? "00-bootstrap"
        : `${String(index).padStart(2, "0")}-${scenario.turns[index - 1].id}`
    const phaseGrade = JSON.parse(
      await readFile(path.join(turnsRoot, directoryName, "phase-grade.json"), "utf8"),
    )
    phaseEvidence.push(
      `## ${turn.id} (${turn.phase})\n\nStructural score: ${phaseGrade.percentage}%\n\nPassed: ${phaseGrade.checks
        .filter((check: { passed: boolean }) => check.passed)
        .map((check: { id: string }) => check.id)
        .join(", ") || "none"}\n\nNot yet passed: ${phaseGrade.checks
        .filter((check: { passed: boolean }) => !check.passed)
        .map((check: { id: string }) => check.id)
        .join(", ") || "none"}`,
    )
  }
  await writeFile(path.join(runDir, "phase-evidence.md"), `${phaseEvidence.join("\n\n")}\n`)
  await writeFile(
    path.join(runDir, "phase-contracts.json"),
    `${JSON.stringify(phaseContracts, null, 2)}\n`,
  )
  const workerThreadIds = [
    ...new Set(
      collaborationTurns.flatMap((turn) => turn.collaboration.workerThreadIds),
    ),
  ]
  const workers = [
    ...new Map(
      collaborationTurns
        .flatMap((turn) => turn.collaboration.workers)
        .map((worker) => [worker.threadId, worker]),
    ).values(),
  ]
  const collaboration = {
    mode: options.collaboration ?? "auto",
    turns: collaborationTurns,
    totals: {
      spawnCallCount: collaborationTurns.reduce(
        (total, turn) => total + turn.collaboration.spawnCallCount,
        0,
      ),
      successfulSpawnCount: workerThreadIds.length,
      workerCount: workerThreadIds.length,
      workerThreadIds,
      workers,
      workerModels: [...new Set(workers.flatMap((worker) => worker.model ?? []))],
      errorCount: collaborationTurns.reduce(
        (total, turn) => total + turn.collaboration.errorLines.length,
        0,
      ),
    },
  }
  await writeFile(
    path.join(runDir, "collaboration.json"),
    `${JSON.stringify(collaboration, null, 2)}\n`,
  )
  return {
    threadId,
    subjectRoot,
    workspace: path.join(subjectRoot, scenario.learner.learningSpace),
    transcript,
  }
}

export async function runJudge(
  runDir: string,
  rubric: Rubric,
  scenario: EvalScenario,
  options: CodexOptions,
): Promise<JudgeResult> {
  const judgeDir = path.join(runDir, "judge")
  await mkdir(judgeDir, { recursive: true })
  const promptFile = path.join(judgeDir, "judge-input.md")
  const outputFile = path.join(judgeDir, "result.json")
  const eventsFile = path.join(judgeDir, "events.jsonl")
  const deterministic = await readFile(path.join(runDir, "deterministic.json"), "utf8")
  const transcript = await readFile(path.join(runDir, "transcript.md"), "utf8")
  const workspace = await readFile(path.join(runDir, "workspace-content.md"), "utf8")
  const phases = await readFile(path.join(runDir, "phase-evidence.md"), "utf8")
  const prompt = `# PathMX learning-space judge\n\nYou are an independent evaluator. Score only the supplied evidence. Do not repair the subject's work. The subject never saw this rubric.\n\nUse exactly the criterion IDs below. Score each 0, 1, or 2: 0 = absent or harmful, 1 = partial or inconsistent, 2 = clearly successful. Cite a transcript turn ID or repository file for every score. Deterministic failures are facts and must not be contradicted.\n\n## Scenario objective\n\n${scenario.objective}\n\n## Hidden learner notes\n\n${scenario.learner.hiddenNotes}\n\n## Rubric\n\n${JSON.stringify(rubric.criteria, null, 2)}\n\n## Final deterministic result\n\n\`\`\`json\n${deterministic}\n\`\`\`\n\n## Structural evidence by turn\n\n${phases}\n\n## Transcript\n\n${transcript}\n\n## Repository content\n\n${workspace}\n`
  await writeFile(promptFile, prompt)

  const args = judgeCodexArgs(
    options,
    runDir,
    outputFile,
    path.join(evalsRoot, "schemas", "judge-result.schema.json"),
  )
  const result = await runCommand(args, {
    cwd: runDir,
    timeoutMs: options.timeoutMs,
    env: options.codexHome ? { CODEX_HOME: options.codexHome } : undefined,
  })
  await writeFile(eventsFile, result.stdout)
  await writeFile(path.join(judgeDir, "stderr.log"), result.stderr)
  if (result.exitCode !== 0 || result.timedOut) {
    throw new Error(`Judge failed: ${result.stderr.slice(-3000)}`)
  }
  const judged = JSON.parse(await readFile(outputFile, "utf8")) as JudgeResult
  const expectedIds = rubric.criteria.map((criterion) => criterion.id).sort()
  const actualIds = judged.criteria.map((criterion) => criterion.id).sort()
  if (JSON.stringify(expectedIds) !== JSON.stringify(actualIds)) {
    throw new Error(`Judge criterion IDs did not match rubric`)
  }
  return judged
}
