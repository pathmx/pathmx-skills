import { readFile, readdir, writeFile } from "node:fs/promises"
import path from "node:path"

import type {
  DeterministicResult,
  EvalScenario,
  JudgeResult,
  Rubric,
} from "./core"

export type TurnTiming = {
  turn: string
  durationMs: number
  timedOut: boolean
  updateCount?: number
  firstUpdateMs?: number
  longestSilentGapMs?: number
}

export type TimingSummary = {
  turns: TurnTiming[]
  totalDurationMs: number
  slowestTurn?: TurnTiming
  turnsOverFiveMinutes: number
  turnsWithSilentMinute: number
  longestSilentTurn?: TurnTiming
}

export function summarizeTimings(turns: TurnTiming[]): TimingSummary {
  const sorted = [...turns].sort((left, right) => left.turn.localeCompare(right.turn))
  return {
    turns: sorted,
    totalDurationMs: sorted.reduce((total, turn) => total + turn.durationMs, 0),
    slowestTurn: sorted.reduce<TurnTiming | undefined>(
      (slowest, turn) => (!slowest || turn.durationMs > slowest.durationMs ? turn : slowest),
      undefined,
    ),
    turnsOverFiveMinutes: sorted.filter((turn) => turn.durationMs > 5 * 60_000).length,
    turnsWithSilentMinute: sorted.filter((turn) => (turn.longestSilentGapMs ?? 0) > 60_000).length,
    longestSilentTurn: sorted.reduce<TurnTiming | undefined>(
      (longest, turn) =>
        !longest || (turn.longestSilentGapMs ?? 0) > (longest.longestSilentGapMs ?? 0)
          ? turn
          : longest,
      undefined,
    ),
  }
}

async function readTimingSummary(runDir: string) {
  const turnsRoot = path.join(runDir, "turns")
  const directories = await readdir(turnsRoot, { withFileTypes: true }).catch(() => [])
  const turns: TurnTiming[] = []
  for (const entry of directories) {
    if (!entry.isDirectory()) continue
    const processFile = path.join(turnsRoot, entry.name, "process.json")
    const process = JSON.parse(await readFile(processFile, "utf8").catch(() => "{}")) as {
      durationMs?: unknown
      timedOut?: unknown
      updateCount?: unknown
      firstUpdateMs?: unknown
      longestSilentGapMs?: unknown
    }
    if (typeof process.durationMs !== "number") continue
    turns.push({
      turn: entry.name,
      durationMs: process.durationMs,
      timedOut: process.timedOut === true,
      updateCount: typeof process.updateCount === "number" ? process.updateCount : undefined,
      firstUpdateMs: typeof process.firstUpdateMs === "number" ? process.firstUpdateMs : undefined,
      longestSilentGapMs:
        typeof process.longestSilentGapMs === "number" ? process.longestSilentGapMs : undefined,
    })
  }
  return summarizeTimings(turns)
}

export function formatDuration(durationMs: number) {
  const totalSeconds = Math.round(durationMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return minutes ? `${minutes}m ${String(seconds).padStart(2, "0")}s` : `${seconds}s`
}

export function scoreJudge(judge: JudgeResult, rubric: Rubric) {
  const weights = new Map(rubric.criteria.map((criterion) => [criterion.id, criterion.weight]))
  let score = 0
  let maximum = 0
  for (const criterion of judge.criteria) {
    const weight = weights.get(criterion.id) ?? 0
    score += criterion.score * weight
    maximum += 2 * weight
  }
  return {
    score,
    maximum,
    percentage: maximum ? Math.round((score / maximum) * 1000) / 10 : 0,
  }
}

export async function writeReport(
  runDir: string,
  scenario: EvalScenario,
  deterministic: DeterministicResult,
  rubric: Rubric,
  judge?: JudgeResult,
) {
  const judgeScore = judge ? scoreJudge(judge, rubric) : undefined
  const timing = await readTimingSummary(runDir)
  const collaboration = JSON.parse(
    await readFile(path.join(runDir, "collaboration.json"), "utf8").catch(() => "{}"),
  ) as {
    mode?: string
    totals?: {
      spawnCallCount?: number
      successfulSpawnCount?: number
      workerCount?: number
      workerModels?: string[]
      errorCount?: number
    }
  }
  let combined = deterministic.percentage
  if (judgeScore) combined = deterministic.percentage * 0.6 + judgeScore.percentage * 0.4
  if (!deterministic.criticalPassed) combined = Math.min(combined, 59)
  combined = Math.round(combined * 10) / 10

  const report = {
    scenario: { id: scenario.id, title: scenario.title, objective: scenario.objective },
    deterministic,
    timing,
    collaboration,
    judge: judge ? { score: judgeScore, result: judge } : undefined,
    combined: {
      percentage: combined,
      criticalPassed: deterministic.criticalPassed,
      note: judge
        ? "60% deterministic and 40% judge; critical failure caps the score at 59"
        : "deterministic score only; no model judge requested",
    },
  }
  await writeFile(path.join(runDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`)

  const checkRows = deterministic.checks
    .map(
      (check) =>
        `| ${check.passed ? "pass" : "fail"} | ${check.critical ? "yes" : "no"} | ${check.label} | ${check.evidence.replaceAll("|", "\\|").replaceAll("\n", " ").slice(0, 240)} |`,
    )
    .join("\n")
  const judgeRows = judge
    ? `\n## Model judge\n\nScore: **${judgeScore?.percentage}%**\n\n${judge.criteria
        .map((criterion) => `- ${criterion.id}: ${criterion.score}/2 — ${criterion.reason}`)
        .join("\n")}\n\n${judge.summary}\n`
    : "\nNo model judge was requested.\n"
  const slowest = timing.slowestTurn
  const timingSignal =
    timing.turnsOverFiveMinutes > 0 || timing.turnsWithSilentMinute > 0
      ? "attention"
      : "within turn and visible-update budgets"
  const timingRows = timing.turns
    .map(
      (turn) =>
        `| ${turn.turn} | ${formatDuration(turn.durationMs)} | ${turn.firstUpdateMs === undefined ? "unknown" : formatDuration(turn.firstUpdateMs)} | ${turn.longestSilentGapMs === undefined ? "unknown" : formatDuration(turn.longestSilentGapMs)} | ${turn.updateCount ?? "unknown"} | ${turn.timedOut ? "yes" : "no"} |`,
    )
    .join("\n")
  const timingMarkdown = timing.turns.length
    ? `\n## Learner wait-time signal\n\nThis signal is reported separately and does not change the quality score.\n\n- Status: **${timingSignal}**\n- Total model time: ${formatDuration(timing.totalDurationMs)}\n- Slowest turn: ${slowest?.turn ?? "none"} (${formatDuration(slowest?.durationMs ?? 0)})\n- Turns over five minutes: ${timing.turnsOverFiveMinutes}\n- Turns with a silent gap over one minute: ${timing.turnsWithSilentMinute}\n- Longest silent turn: ${timing.longestSilentTurn?.turn ?? "none"} (${formatDuration(timing.longestSilentTurn?.longestSilentGapMs ?? 0)})\n\n| Turn | Duration | First visible update | Longest silence | Updates | Timed out |\n| --- | --- | --- | --- | --- | --- |\n${timingRows}\n`
    : "\n## Learner wait-time signal\n\nNo turn timing artifacts were found.\n"
  const collaborationMarkdown = `
## Subagent orchestration signal

- Mode: ${collaboration.mode ?? "unknown"}
- Spawn calls observed: ${collaboration.totals?.spawnCallCount ?? 0}
- Successful spawns: ${collaboration.totals?.successfulSpawnCount ?? 0}
- Worker threads observed: ${collaboration.totals?.workerCount ?? 0}
- Worker models: ${collaboration.totals?.workerModels?.join(", ") || "unknown"}
- Collaboration errors: ${collaboration.totals?.errorCount ?? 0}

This signal verifies whether the subject actually delegated work. Compare it
with module-turn duration, first-update time, longest silence, and quality; a
spawn count alone is not a speed win.
`
  const markdown = `# Eval report: ${scenario.title}\n\nCombined score: **${combined}%**  \nCritical checks: **${deterministic.criticalPassed ? "pass" : "fail"}**\n\n## Deterministic checks\n\nScore: **${deterministic.percentage}%**\n\n| Result | Critical | Check | Evidence |\n| --- | --- | --- | --- |\n${checkRows}\n${timingMarkdown}${collaborationMarkdown}${judgeRows}`
  await writeFile(path.join(runDir, "report.md"), markdown)
  return report
}
