import { afterEach, describe, expect, it } from "bun:test"
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import { judgeCodexArgs, subjectCodexArgs, summarizeVisibleUpdates } from "./evals/codex"
import { formatDuration, summarizeTimings } from "./evals/report"
import {
  gradeLearningSpace,
  evaluatePhaseContract,
  findEvalProfile,
  loadEvalProfiles,
  loadScenarios,
  parseCodexEvents,
  subjectPrompt,
  summarizeDeterministicChecks,
  validateScenario,
} from "./evals/core"

const temporaryRoots: string[] = []

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

describe("eval scenarios", () => {
  it("loads and validates every checked-in scenario", async () => {
    const scenarios = await loadScenarios()
    expect(scenarios.length).toBeGreaterThanOrEqual(4)
    for (const scenario of scenarios) expect(validateScenario(scenario)).toEqual([])
  })

  it("keeps hidden learner notes out of the subject prompt", async () => {
    const [scenario] = await loadScenarios()
    const prompt = subjectPrompt(scenario, "./bootstrap.md")
    expect(prompt).toContain(scenario.learner.initialMessage)
    expect(prompt).not.toContain(scenario.learner.hiddenNotes)
  })

  it("makes the candidate-starter substitution explicit", async () => {
    const [scenario] = await loadScenarios()
    const prompt = subjectPrompt(scenario, "./bootstrap.md", true)
    expect(prompt).toContain("./candidate-starter")
    expect(prompt).toContain("instead of fetching the published template")
  })

  it("defines separate Desktop-default, floor, and judge profiles", async () => {
    const catalog = await loadEvalProfiles()
    const desktop = findEvalProfile(catalog, catalog.defaultSubject, "subject")
    const fast = findEvalProfile(catalog, "desktop-fast", "subject")
    const floor = findEvalProfile(catalog, "instruction-floor", "subject")
    const judge = findEvalProfile(catalog, catalog.defaultJudge, "judge")
    expect(desktop).toMatchObject({ model: "gpt-5.6-sol", reasoning: "medium" })
    expect(fast).toMatchObject({ model: "gpt-5.6-sol", reasoning: "low" })
    expect(floor).toMatchObject({ model: "gpt-5.4-mini", reasoning: "low" })
    expect(judge).toMatchObject({ model: "gpt-5.6-sol", reasoning: "high" })
  })
})

describe("Codex event and command contract", () => {
  it("extracts the thread and usage from JSONL", () => {
    const parsed = parseCodexEvents(
      [
        JSON.stringify({ type: "thread.started", thread_id: "thread-1" }),
        JSON.stringify({ type: "turn.completed", usage: { input_tokens: 10, output_tokens: 2 } }),
      ].join("\n"),
    )
    expect(parsed.threadId).toBe("thread-1")
    expect(parsed.usage).toEqual({ input_tokens: 10, output_tokens: 2 })
    expect(parsed.invalid).toEqual([])
  })

  it("uses explicit low-permission automation flags and resumable sessions", () => {
    const args = subjectCodexArgs(
      { model: "floor-model", reasoning: "low", timeoutMs: 1 },
      "/tmp/subject",
      "/tmp/final.md",
      "learner reply",
      "thread-1",
    )
    expect(args).toContain("workspace-write")
    expect(args).toContain("never")
    expect(args).toContain("--ignore-user-config")
    expect(args).toContain("--ignore-rules")
    expect(args).toContain("plugins")
    expect(args).toContain("resume")
    expect(args).toContain("thread-1")
    expect(args).not.toContain("--ephemeral")
  })

  it("keeps the judge read-only and permits an isolated artifact directory", () => {
    const args = judgeCodexArgs(
      { model: "judge-model", reasoning: "high", timeoutMs: 1 },
      "/tmp/run",
      "/tmp/result.json",
      "/tmp/schema.json",
    )
    expect(args).toContain("read-only")
    expect(args).toContain("--skip-git-repo-check")
    expect(args).toContain("--ephemeral")
    expect(args).toContain("--output-schema")
    expect(args).not.toContain("workspace-write")
  })
})

describe("eval timing signal", () => {
  it("keeps learner wait time separate and identifies long turns", () => {
    const timing = summarizeTimings([
      { turn: "03-module", durationMs: 763_385, timedOut: false },
      { turn: "00-bootstrap", durationMs: 322_688, timedOut: false },
      { turn: "01-context", durationMs: 11_113, timedOut: false },
    ])
    expect(timing.totalDurationMs).toBe(1_097_186)
    expect(timing.slowestTurn?.turn).toBe("03-module")
    expect(timing.turnsOverFiveMinutes).toBe(2)
    expect(timing.turns.map((turn) => turn.turn)).toEqual([
      "00-bootstrap",
      "01-context",
      "03-module",
    ])
    expect(formatDuration(763_385)).toBe("12m 43s")
  })

  it("measures learner-visible progress updates and silent gaps", () => {
    const timing = summarizeVisibleUpdates(
      [
        { elapsedMs: 15_000, line: JSON.stringify({ type: "turn.started" }) },
        {
          elapsedMs: 25_000,
          line: JSON.stringify({
            type: "item.completed",
            item: { type: "agent_message", text: "I have the scaffold ready." },
          }),
        },
        {
          elapsedMs: 80_000,
          line: JSON.stringify({
            type: "item.completed",
            item: { type: "agent_message", text: "Verification is starting." },
          }),
        },
      ],
      100_000,
    )
    expect(timing).toEqual({
      updateCount: 2,
      firstUpdateMs: 25_000,
      longestSilentGapMs: 55_000,
    })
  })
})

describe("phase contracts", () => {
  it("catches a module authored before a map-first confirmation", () => {
    const base = summarizeDeterministicChecks([
      {
        id: "path.milestones",
        label: "milestones",
        passed: true,
        critical: false,
        weight: 1,
        evidence: "present",
      },
      {
        id: "module.buffered",
        label: "module",
        passed: true,
        critical: true,
        weight: 1,
        evidence: "present",
      },
    ])
    const contract = evaluatePhaseContract(
      {
        id: "show-map",
        phase: "map",
        message: "Show the map first.",
        expect: { passed: ["path.milestones"], notPassed: ["module.buffered"] },
      },
      base,
    )
    expect(contract?.passed).toBe(false)
    expect(contract?.checks.find((check) => check.id === "module.buffered")).toMatchObject({
      expected: "not-passed",
      actual: "passed",
      passed: false,
    })
  })
})

describe("deterministic grader", () => {
  it("recognizes a private buffered learning repository", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "pathmx-eval-test-"))
    temporaryRoots.push(root)
    for (const directory of [
      ".git",
      ".agents/skills/path",
      ".agents/skills/pathmx",
      "paths/sql/modules/01-basics",
    ]) {
      await mkdir(path.join(root, directory), { recursive: true })
    }
    await writeFile(path.join(root, ".agents/skills/path/SKILL.md"), "path")
    await writeFile(path.join(root, ".agents/skills/pathmx/SKILL.md"), "pathmx")
    await writeFile(
      path.join(root, "package.json"),
      JSON.stringify({
        pathmxCompatibility: { baseline: "1.2.3" },
        dependencies: { "@fellowhumans/pathmx": "1.2.3" },
      }),
    )
    await writeFile(path.join(root, "paths/index.path.md"), "# Home")
    await writeFile(
      path.join(root, "paths/learner.profile.md"),
      "**Foreground path:** SQL\n**Point B:** Ask questions\n**Point A evidence:** Reads tables",
    )
    await writeFile(
      path.join(root, "paths/learning.activity.md"),
      "**Foreground path:** SQL\n",
    )
    await writeFile(
      path.join(root, "paths/sql/index.path.md"),
      "---\nstatus: ready\n---\n\n## Milestone map\n\n- Select rows: ready\n- Filter rows: planned\n- Combine rows: planned",
    )
    const moduleRoot = path.join(root, "paths/sql/modules/01-basics")
    await writeFile(path.join(moduleRoot, "index.path.md"), "# Basics")
    const support = "Hint. Worked example. Self-check rationale. Try a smaller version. Stretch task."
    await writeFile(path.join(moduleRoot, "01-select.lesson.md"), support)
    await writeFile(path.join(moduleRoot, "02-filter.lesson.md"), support)
    await writeFile(path.join(moduleRoot, "review.practice.md"), "Review")
    await writeFile(path.join(moduleRoot, "milestone.assessment.md"), "Checkpoint")

    const result = await gradeLearningSpace(root, {
      runVerification: false,
      transcript: "Open http://localhost:3000/paths/sql/index.path.html",
    })
    for (const id of [
      "repo.exists",
      "skills.installed",
      "version.verified-baseline",
      "path.foreground",
      "path.milestones",
      "module.buffered",
      "session.immediate-support",
      "player.exact-route",
    ]) {
      expect(result.checks.find((check) => check.id === id)?.passed).toBe(true)
    }
  })
})
