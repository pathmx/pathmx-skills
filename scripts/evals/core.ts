import { existsSync } from "node:fs"
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { parse } from "yaml"

export const repoRoot = path.resolve(import.meta.dir, "../..")
export const evalsRoot = path.join(repoRoot, "evals")

export const phases = [
  "onboarding",
  "map",
  "module",
  "session",
  "checkpoint",
  "adaptation",
  "return",
] as const

export type Phase = (typeof phases)[number]

export type EvalTurn = {
  id: string
  phase: Phase
  message: string
  expect?: {
    passed?: string[]
    notPassed?: string[]
  }
}

export type EvalScenario = {
  schema: "pathmx-eval/scenario"
  version: 1
  id: string
  title: string
  objective: string
  tags: string[]
  bootstrap: { source: "local" | "hosted"; url?: string }
  learner: {
    learningSpace: string
    initialMessage: string
    hiddenNotes: string
  }
  turns: EvalTurn[]
}

export type RubricCriterion = {
  id: string
  phase: Phase
  weight: number
  description: string
}

export type Rubric = {
  schema: "pathmx-eval/rubric"
  version: 1
  criteria: RubricCriterion[]
}

export type EvalProfile = {
  id: string
  role: "subject" | "judge"
  model: string
  reasoning: string
  description: string
  evidence?: string
  verifiedOn?: string
}

export type EvalProfiles = {
  schema: "pathmx-eval/profiles"
  version: 1
  defaultSubject: string
  defaultJudge: string
  profiles: EvalProfile[]
}

export type CodexEvent = Record<string, unknown> & {
  type?: string
  thread_id?: string
  usage?: Record<string, number>
  item?: { type?: string; text?: string }
}

export type DeterministicCheck = {
  id: string
  label: string
  passed: boolean
  critical: boolean
  weight: number
  evidence: string
}

export type DeterministicResult = {
  score: number
  maximum: number
  percentage: number
  criticalPassed: boolean
  checks: DeterministicCheck[]
}

export type PhaseContractResult = {
  turnId: string
  phase: Phase
  passed: boolean
  checks: Array<{
    id: string
    expected: "passed" | "not-passed"
    actual: "passed" | "not-passed" | "missing"
    passed: boolean
  }>
}

export type JudgeCriterion = {
  id: string
  score: number
  evidence: string[]
  reason: string
}

export type JudgeResult = {
  summary: string
  criteria: JudgeCriterion[]
  strengths: string[]
  risks: string[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function requireString(
  value: unknown,
  location: string,
  findings: string[],
): value is string {
  if (typeof value !== "string" || !value.trim()) {
    findings.push(`${location} must be a non-empty string`)
    return false
  }
  return true
}

export function validateScenario(value: unknown, file = "scenario") {
  const findings: string[] = []
  if (!isRecord(value)) return [`${file} must contain a mapping`]
  if (value.schema !== "pathmx-eval/scenario") findings.push(`${file}: invalid schema`)
  if (value.version !== 1) findings.push(`${file}: unsupported version`)
  requireString(value.id, `${file}.id`, findings)
  if (typeof value.id === "string" && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.id)) {
    findings.push(`${file}.id must be kebab-case`)
  }
  requireString(value.title, `${file}.title`, findings)
  requireString(value.objective, `${file}.objective`, findings)
  if (!Array.isArray(value.tags) || value.tags.some((tag) => typeof tag !== "string")) {
    findings.push(`${file}.tags must be an array of strings`)
  }

  if (!isRecord(value.bootstrap)) {
    findings.push(`${file}.bootstrap must be a mapping`)
  } else {
    if (value.bootstrap.source !== "local" && value.bootstrap.source !== "hosted") {
      findings.push(`${file}.bootstrap.source must be local or hosted`)
    }
    if (value.bootstrap.source === "hosted") {
      requireString(value.bootstrap.url, `${file}.bootstrap.url`, findings)
    }
  }

  if (!isRecord(value.learner)) {
    findings.push(`${file}.learner must be a mapping`)
  } else {
    requireString(value.learner.learningSpace, `${file}.learner.learningSpace`, findings)
    if (
      typeof value.learner.learningSpace === "string" &&
      !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(value.learner.learningSpace)
    ) {
      findings.push(`${file}.learner.learningSpace must be a simple directory name`)
    }
    requireString(value.learner.initialMessage, `${file}.learner.initialMessage`, findings)
    requireString(value.learner.hiddenNotes, `${file}.learner.hiddenNotes`, findings)
  }

  if (!Array.isArray(value.turns) || value.turns.length === 0) {
    findings.push(`${file}.turns must contain at least one learner turn`)
  } else {
    const ids = new Set<string>()
    value.turns.forEach((turn, index) => {
      const location = `${file}.turns[${index}]`
      if (!isRecord(turn)) {
        findings.push(`${location} must be a mapping`)
        return
      }
      requireString(turn.id, `${location}.id`, findings)
      if (typeof turn.id === "string") {
        if (ids.has(turn.id)) findings.push(`${location}.id must be unique`)
        ids.add(turn.id)
      }
      if (!phases.includes(turn.phase as Phase)) findings.push(`${location}.phase is invalid`)
      requireString(turn.message, `${location}.message`, findings)
      if (turn.expect !== undefined) {
        if (!isRecord(turn.expect)) findings.push(`${location}.expect must be a mapping`)
        else {
          for (const key of ["passed", "notPassed"] as const) {
            const expected = turn.expect[key]
            if (
              expected !== undefined &&
              (!Array.isArray(expected) || expected.some((id) => typeof id !== "string" || !id))
            ) {
              findings.push(`${location}.expect.${key} must be an array of check IDs`)
            }
          }
        }
      }
    })
  }
  return findings
}

export function evaluatePhaseContract(
  turn: EvalTurn,
  result: DeterministicResult,
): PhaseContractResult | undefined {
  if (!turn.expect) return undefined
  const actual = new Map(result.checks.map((check) => [check.id, check.passed]))
  const checks: PhaseContractResult["checks"] = []
  for (const id of turn.expect.passed ?? []) {
    const state = actual.get(id)
    checks.push({
      id,
      expected: "passed",
      actual: state === undefined ? "missing" : state ? "passed" : "not-passed",
      passed: state === true,
    })
  }
  for (const id of turn.expect.notPassed ?? []) {
    const state = actual.get(id)
    checks.push({
      id,
      expected: "not-passed",
      actual: state === undefined ? "missing" : state ? "passed" : "not-passed",
      passed: state === false,
    })
  }
  return {
    turnId: turn.id,
    phase: turn.phase,
    passed: checks.every((check) => check.passed),
    checks,
  }
}

export function summarizeDeterministicChecks(
  checks: DeterministicCheck[],
): DeterministicResult {
  const maximum = checks.reduce((sum, check) => sum + check.weight, 0)
  const score = checks
    .filter((check) => check.passed)
    .reduce((sum, check) => sum + check.weight, 0)
  return {
    score,
    maximum,
    percentage: maximum ? Math.round((score / maximum) * 1000) / 10 : 0,
    criticalPassed: checks.filter((check) => check.critical).every((check) => check.passed),
    checks,
  }
}

export async function loadScenario(idOrFile: string): Promise<EvalScenario> {
  const file = idOrFile.endsWith(".yaml")
    ? path.resolve(idOrFile)
    : path.join(evalsRoot, "scenarios", `${idOrFile}.yaml`)
  const value = parse(await readFile(file, "utf8"))
  const findings = validateScenario(value, path.relative(repoRoot, file))
  if (findings.length > 0) throw new Error(findings.join("\n"))
  return value as EvalScenario
}

export async function loadScenarios() {
  const root = path.join(evalsRoot, "scenarios")
  const files = (await readdir(root))
    .filter((file) => file.endsWith(".yaml"))
    .sort()
  return Promise.all(files.map((file) => loadScenario(path.join(root, file))))
}

export async function loadRubric(): Promise<Rubric> {
  const file = path.join(evalsRoot, "rubrics", "learning-space.json")
  const value = JSON.parse(await readFile(file, "utf8")) as Rubric
  if (value.schema !== "pathmx-eval/rubric" || value.version !== 1) {
    throw new Error("Unsupported eval rubric")
  }
  const ids = new Set<string>()
  for (const criterion of value.criteria) {
    if (!criterion.id || ids.has(criterion.id)) throw new Error("Rubric IDs must be unique")
    if (!phases.includes(criterion.phase)) throw new Error(`Invalid rubric phase: ${criterion.phase}`)
    if (!Number.isFinite(criterion.weight) || criterion.weight <= 0) {
      throw new Error(`Invalid rubric weight: ${criterion.id}`)
    }
    ids.add(criterion.id)
  }
  return value
}

export async function loadEvalProfiles(): Promise<EvalProfiles> {
  const file = path.join(evalsRoot, "profiles.json")
  const value = JSON.parse(await readFile(file, "utf8")) as EvalProfiles
  if (value.schema !== "pathmx-eval/profiles" || value.version !== 1) {
    throw new Error("Unsupported eval profile catalog")
  }
  const ids = new Set<string>()
  for (const profile of value.profiles) {
    if (!profile.id || ids.has(profile.id)) throw new Error("Eval profile IDs must be unique")
    if (profile.role !== "subject" && profile.role !== "judge") {
      throw new Error(`Invalid eval profile role: ${profile.id}`)
    }
    for (const key of ["model", "reasoning", "description"] as const) {
      if (!profile[key]?.trim()) throw new Error(`Eval profile ${profile.id} needs ${key}`)
    }
    ids.add(profile.id)
  }
  const subject = value.profiles.find((profile) => profile.id === value.defaultSubject)
  const judge = value.profiles.find((profile) => profile.id === value.defaultJudge)
  if (subject?.role !== "subject") throw new Error("defaultSubject must name a subject profile")
  if (judge?.role !== "judge") throw new Error("defaultJudge must name a judge profile")
  return value
}

export function findEvalProfile(
  catalog: EvalProfiles,
  id: string,
  role: "subject" | "judge",
) {
  const profile = catalog.profiles.find((entry) => entry.id === id)
  if (!profile) throw new Error(`Unknown eval profile: ${id}`)
  if (profile.role !== role) throw new Error(`Eval profile ${id} cannot be used as ${role}`)
  return profile
}

export function parseCodexEvents(jsonl: string) {
  const events: CodexEvent[] = []
  const invalid: string[] = []
  for (const [index, line] of jsonl.split(/\r?\n/).entries()) {
    if (!line.trim()) continue
    try {
      events.push(JSON.parse(line) as CodexEvent)
    } catch {
      invalid.push(`line ${index + 1}`)
    }
  }
  const threadId = events.find((event) => event.type === "thread.started")?.thread_id
  const usage = events
    .filter((event) => event.type === "turn.completed" && isRecord(event.usage))
    .map((event) => event.usage ?? {})
    .reduce<Record<string, number>>((total, current) => {
      for (const [key, value] of Object.entries(current)) {
        if (typeof value === "number") total[key] = (total[key] ?? 0) + value
      }
      return total
    }, {})
  return { events, invalid, threadId, usage }
}

export function subjectPrompt(
  scenario: EvalScenario,
  bootstrapReference: string,
  candidateStarter = false,
) {
  const parts = [
    `Follow the bootstrap instructions at ${bootstrapReference} and carry them out rather than only explaining them.`,
    scenario.learner.initialMessage,
    "Treat this as a normal learner interaction. Ask only for information or permission the instructions require.",
  ]
  if (candidateStarter) {
    parts.push(
      "Candidate-starter lane: for bootstrap step 3, create the requested learning repository by copying ./candidate-starter to the requested location instead of fetching the published template with pathmx init. Do not edit ./candidate-starter itself. Then continue every remaining bootstrap step normally, including installation, Git initialization, candidate-version verification, Player review, and onboarding.",
    )
  }
  return parts.join("\n\n")
}

export function defaultArtifactsRoot() {
  return path.join(os.tmpdir(), "pathmx-evals")
}

export async function listFiles(root: string, prefix = ""): Promise<string[]> {
  if (!existsSync(root)) return []
  const files: string[] = []
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if ([".git", "node_modules", ".pathmx", ".pathmx-check"].includes(entry.name)) continue
    const relative = path.join(prefix, entry.name)
    if (entry.isDirectory()) files.push(...(await listFiles(path.join(root, entry.name), relative)))
    else if (entry.isFile()) files.push(relative)
  }
  return files.sort()
}

export async function runCommand(
  command: string[],
  options: { cwd: string; timeoutMs?: number; env?: Record<string, string | undefined> },
) {
  const started = Date.now()
  const child = Bun.spawn(command, {
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
    stdout: "pipe",
    stderr: "pipe",
  })
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    child.kill()
  }, options.timeoutMs ?? 20 * 60 * 1000)
  const stdoutReader = child.stdout.getReader()
  const stdoutDecoder = new TextDecoder()
  const stdoutParts: string[] = []
  const stdoutLineTimings: Array<{ elapsedMs: number; line: string }> = []
  let pendingLine = ""
  const readStdout = async () => {
    while (true) {
      const { done, value } = await stdoutReader.read()
      if (done) break
      const chunk = stdoutDecoder.decode(value, { stream: true })
      stdoutParts.push(chunk)
      pendingLine += chunk
      let newline = pendingLine.indexOf("\n")
      while (newline >= 0) {
        stdoutLineTimings.push({
          elapsedMs: Date.now() - started,
          line: pendingLine.slice(0, newline),
        })
        pendingLine = pendingLine.slice(newline + 1)
        newline = pendingLine.indexOf("\n")
      }
    }
    const tail = stdoutDecoder.decode()
    if (tail) {
      stdoutParts.push(tail)
      pendingLine += tail
    }
    if (pendingLine) {
      stdoutLineTimings.push({ elapsedMs: Date.now() - started, line: pendingLine })
    }
    return stdoutParts.join("")
  }
  const [stdout, stderr, exitCode] = await Promise.all([
    readStdout(),
    new Response(child.stderr).text(),
    child.exited,
  ])
  clearTimeout(timer)
  return {
    command,
    stdout,
    stderr,
    stdoutLineTimings,
    exitCode,
    timedOut,
    durationMs: Date.now() - started,
  }
}

export async function captureWorkspace(workspace: string, destination: string) {
  await mkdir(destination, { recursive: true })
  const files = await listFiles(workspace)
  const gitStatus = existsSync(path.join(workspace, ".git"))
    ? await runCommand(["git", "status", "--short"], { cwd: workspace, timeoutMs: 10_000 })
    : undefined
  const gitLog = existsSync(path.join(workspace, ".git"))
    ? await runCommand(["git", "log", "--oneline", "--decorate", "-10"], {
        cwd: workspace,
        timeoutMs: 10_000,
      })
    : undefined
  await writeFile(
    path.join(destination, "workspace.json"),
    `${JSON.stringify({ exists: existsSync(workspace), files, gitStatus, gitLog }, null, 2)}\n`,
  )
}

async function readIfPresent(file: string) {
  return existsSync(file) ? readFile(file, "utf8") : ""
}

function addCheck(
  checks: DeterministicCheck[],
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
  options: { critical?: boolean; weight?: number } = {},
) {
  checks.push({
    id,
    label,
    passed,
    evidence,
    critical: options.critical ?? false,
    weight: options.weight ?? 1,
  })
}

async function pathDirectories(pathsRoot: string) {
  if (!existsSync(pathsRoot)) return []
  const ignored = new Set(["assets", "getting-started", ".fixtures"])
  const directories: string[] = []
  for (const entry of await readdir(pathsRoot, { withFileTypes: true })) {
    if (
      entry.isDirectory() &&
      !ignored.has(entry.name) &&
      existsSync(path.join(pathsRoot, entry.name, "index.path.md"))
    ) {
      directories.push(path.join(pathsRoot, entry.name))
    }
  }
  return directories.sort()
}

async function moduleDirectories(pathRoots: string[]) {
  const modules: string[] = []
  for (const pathRoot of pathRoots) {
    const root = path.join(pathRoot, "modules")
    if (!existsSync(root)) continue
    for (const entry of await readdir(root, { withFileTypes: true })) {
      if (entry.isDirectory()) modules.push(path.join(root, entry.name))
    }
  }
  return modules.sort()
}

export async function gradeLearningSpace(
  workspace: string,
  options: { runVerification?: boolean; transcript?: string } = {},
): Promise<DeterministicResult> {
  const checks: DeterministicCheck[] = []
  const pathsRoot = path.join(workspace, "paths")
  const exists = existsSync(workspace)
  addCheck(checks, "repo.exists", "Learning repository exists", exists, workspace, {
    critical: true,
    weight: 3,
  })
  const gitExists = existsSync(path.join(workspace, ".git"))
  addCheck(checks, "git.initialized", "Local Git repository initialized", gitExists, ".git", {
    critical: true,
    weight: 2,
  })

  let remotes = ""
  let remoteCommandPassed = false
  if (gitExists) {
    const result = await runCommand(["git", "remote"], { cwd: workspace, timeoutMs: 10_000 })
    remotes = result.stdout.trim()
    remoteCommandPassed = result.exitCode === 0
  }
  addCheck(
    checks,
    "git.no-remotes",
    "No remote was created",
    gitExists && remoteCommandPassed && !remotes,
    remoteCommandPassed ? remotes || "none" : "git remote failed",
    { critical: true, weight: 2 },
  )

  const skills = ["learn", "pathmx"].filter((name) =>
    existsSync(path.join(workspace, ".agents", "skills", name, "SKILL.md")),
  )
  addCheck(
    checks,
    "skills.installed",
    "Learn and PathMX skills installed",
    skills.length === 2,
    skills.join(", ") || "none",
    { critical: true, weight: 3 },
  )

  let packageJson: Record<string, any> = {}
  try {
    packageJson = JSON.parse(await readFile(path.join(workspace, "package.json"), "utf8"))
  } catch {}
  const baseline = packageJson.pathmxCompatibility?.baseline
  const dependency = packageJson.dependencies?.["@fellowhumans/pathmx"]
  const exactVersions =
    /^\d+\.\d+\.\d+$/.test(baseline ?? "") &&
    /^\d+\.\d+\.\d+$/.test(dependency ?? "") &&
    baseline === dependency
  addCheck(
    checks,
    "version.verified-baseline",
    "Project dependency matches an exact verified baseline",
    exactVersions,
    `baseline=${baseline ?? "missing"}; dependency=${dependency ?? "missing"}`,
    { critical: true, weight: 3 },
  )

  const coreFiles = ["index.path.md", "learner.profile.md", "learning.activity.md"]
  const presentCore = coreFiles.filter((file) => existsSync(path.join(pathsRoot, file)))
  addCheck(
    checks,
    "learning.durable-state",
    "Home, learner profile, and activity history exist",
    presentCore.length === coreFiles.length,
    presentCore.join(", ") || "none",
    { critical: true, weight: 3 },
  )

  const profile = await readIfPresent(path.join(pathsRoot, "learner.profile.md"))
  const activity = await readIfPresent(path.join(pathsRoot, "learning.activity.md"))
  const confirmedProfile =
    profile.length > 0 &&
    !/Point B:\*\* Not confirmed/i.test(profile) &&
    !/Point A evidence:\*\* Not collected/i.test(profile)
  addCheck(
    checks,
    "learner.confirmed-profile",
    "Point A and Point B are confirmed",
    confirmedProfile,
    confirmedProfile ? "learner.profile.md contains confirmed state" : "starter placeholders remain",
    { weight: 2 },
  )

  const pathRoots = await pathDirectories(pathsRoot)
  const foregroundNamed =
    pathRoots.length > 0 &&
    !/Foreground path:\*\* (?:None|Not chosen yet)/i.test(`${profile}\n${activity}`)
  addCheck(
    checks,
    "path.foreground",
    "A foreground learning path exists",
    foregroundNamed,
    pathRoots.map((root) => path.basename(root)).join(", ") || "none",
    { critical: true, weight: 3 },
  )

  const pathIndexes = await Promise.all(
    pathRoots.map((root) => readIfPresent(path.join(root, "index.path.md"))),
  )
  const milestoneLines = pathIndexes
    .flatMap((content) => {
      const afterHeading = content.split(/^## Milestone map\s*$/im)[1]
      return afterHeading?.split(/^##\s/m)[0]?.split(/\r?\n/) ?? []
    })
    .filter((line) => /\b(?:planned|ready|in progress|demonstrated|paused)\b/i.test(line))
  const milestoneCount = milestoneLines.length
  addCheck(
    checks,
    "path.milestones",
    "Milestone map has 3–7 visible status entries",
    milestoneCount >= 3 && milestoneCount <= 7,
    `${milestoneCount} candidate milestone lines`,
    { weight: 2 },
  )

  const modules = await moduleDirectories(pathRoots)
  const sessionCounts = await Promise.all(
    modules.map(async (moduleRoot) => {
      const files = await readdir(moduleRoot).catch(() => [])
      return {
        root: moduleRoot,
        count: files.filter((file) => file.endsWith(".lesson.md")).length,
        checkpoint: files.some((file) => /(?:milestone|checkpoint).*\.assessment\.md$/i.test(file)),
        review: files.some((file) => /(?:review|practice).*\.practice\.md$/i.test(file)),
      }
    }),
  )
  const readyModule = sessionCounts.find(
    (module) => module.count >= 2 && module.count <= 4 && module.checkpoint,
  )
  addCheck(
    checks,
    "module.buffered",
    "A module has 2–4 sessions and a checkpoint",
    Boolean(readyModule),
    sessionCounts
      .map((module) => `${path.basename(module.root)}:${module.count}`)
      .join(", ") || "none",
    { critical: true, weight: 3 },
  )
  addCheck(
    checks,
    "module.review-ready",
    "Buffered review or practice is ready",
    sessionCounts.some((module) => module.review),
    sessionCounts.filter((module) => module.review).map((module) => path.basename(module.root)).join(", ") || "none",
    { weight: 1 },
  )

  const lessonFiles = (await listFiles(pathsRoot)).filter((file) => file.endsWith(".lesson.md"))
  const lessonText = (
    await Promise.all(lessonFiles.map((file) => readIfPresent(path.join(pathsRoot, file))))
  ).join("\n")
  const supportKinds = [
    /\bhint\b/i,
    /worked example|\bexample\b/i,
    /\b(?:rationale|rubric|self-check)\b/i,
    /\bsmaller\b/i,
    /\bstretch\b/i,
  ].filter((pattern) => pattern.test(lessonText)).length
  addCheck(
    checks,
    "session.immediate-support",
    "Sessions contain several kinds of immediate support",
    supportKinds >= 3,
    `${supportKinds}/5 support kinds found`,
    { weight: 2 },
  )

  const transcript = options.transcript ?? ""
  const routeEvidence = /https?:\/\/(?:localhost|127\.0\.0\.1):\d+\/\S+/i.test(transcript)
  addCheck(
    checks,
    "player.exact-route",
    "Agent supplied a specific local Player URL",
    routeEvidence,
    routeEvidence ? "local Player URL found in transcript" : "no local Player URL found",
    { weight: 1 },
  )

  if (options.runVerification !== false && exists && packageJson.scripts?.check) {
    const verification = await runCommand(["bun", "run", "check"], {
      cwd: workspace,
      timeoutMs: 3 * 60 * 1000,
    })
    const diagnostics = `${verification.stdout}\n${verification.stderr}`.trim()
    addCheck(
      checks,
      "pathmx.verification",
      "Repository check passes",
      verification.exitCode === 0 && !verification.timedOut,
      diagnostics.slice(-2000) || `exit ${verification.exitCode}`,
      { critical: true, weight: 4 },
    )
  } else if (options.runVerification !== false) {
    addCheck(
      checks,
      "pathmx.verification",
      "Repository check passes",
      false,
      "check script missing",
      { critical: true, weight: 4 },
    )
  }

  return summarizeDeterministicChecks(checks)
}

export async function selectedWorkspaceContent(workspace: string) {
  const files = (await listFiles(workspace)).filter(
    (file) =>
      file === "AGENTS.md" ||
      file === "package.json" ||
      (file.startsWith("paths/") && /\.(?:md|css)$/.test(file)),
  )
  const chunks: string[] = []
  let budget = 80_000
  for (const file of files) {
    const content = await readIfPresent(path.join(workspace, file))
    const chunk = `\n## FILE: ${file}\n\n${content}\n`
    if (chunk.length > budget) break
    chunks.push(chunk)
    budget -= chunk.length
  }
  return chunks.join("")
}
