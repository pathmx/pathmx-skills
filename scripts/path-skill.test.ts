import { describe, expect, it } from "bun:test"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { parse } from "yaml"

const repoRoot = path.resolve(import.meta.dir, "..")

async function read(relative: string) {
  return readFile(path.join(repoRoot, relative), "utf8")
}

describe("path skill contract", () => {
  it("uses the path package and explicit invocation", async () => {
    const skill = await read("skills/path/SKILL.md")
    const frontmatter = parse(skill.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "")
    const interfaceConfig = parse(await read("skills/path/agents/openai.yaml"))
    expect(frontmatter.name).toBe("path")
    expect(interfaceConfig.policy.allow_implicit_invocation).toBe(false)
  })

  it("delegates authoring and keeps the learning loop", async () => {
    const skill = await read("skills/path/SKILL.md")
    expect(skill).toContain("`/pathmx`")
    for (const term of [
      "Assess position",
      "proximal edge",
      "retrieval",
      "spacing",
      "interleaving",
      "synthesis",
    ]) {
      expect(skill).toContain(term)
    }
    expect(skill).toMatch(/capability\s+gap/)
  })

  it("does not keep legacy HTML workspace rules", async () => {
    const skill = await read("skills/path/SKILL.md")
    expect(skill).not.toMatch(/MISSION\.md|RESOURCES\.md|NOTES\.md|standalone HTML/)
  })

  it("documents all five worked files", async () => {
    const example = await read("skills/path/references/worked-example.md")
    for (const file of [
      "path.outcome.md",
      "index.path.md",
      "index.lesson.md",
      "lesson.assessment.md",
      "learning.activity.md",
    ]) {
      expect(example).toContain(file)
    }
  })

  it("points at the adaptive loop fixture", async () => {
    const skill = await read("skills/path/SKILL.md")
    const adaptive = await read("skills/path/references/adaptive-loop-example.md")
    const example = await read("skills/path/references/worked-example.md")
    expect(skill).toContain("adaptive-loop-example.md")
    expect(skill).toContain("onboarding/")
    expect(skill).toContain("no core concept missed")
    expect(skill).toContain("pathmx play")
    expect(skill).toContain("paths/index.path.md")
    expect(skill).toContain("theme.css")
    expect(skill).toContain("assets/")
    expect(adaptive).toContain("chess-opening-principles")
    expect(adaptive).toContain("pass = no core miss")
    expect(example).toContain("does **not** include onboarding")
  })

  it("keeps assessment evidence and synthesis linked", async () => {
    const assessment = await read(
      "tests/fixtures/path/paths/sql-foundations/lessons/joins/lesson.assessment.md",
    )
    const activity = await read("tests/fixtures/path/paths/learning.activity.md")
    expect(assessment).toContain("## Rubric")
    expect(assessment).toContain("learning.activity.md")
    expect(activity).toContain("lesson.assessment.md")
    expect(activity).toContain("**Opens next:**")
  })

  it("keeps the chess adaptive loop fixture wired", async () => {
    const pathIndex = await read(
      "tests/fixtures/path/paths/chess-opening-principles/index.path.md",
    )
    const assessment = await read(
      "tests/fixtures/path/paths/chess-opening-principles/lessons/control-center-development/lesson.assessment.md",
    )
    const activity = await read("tests/fixtures/path/paths/learning.activity.md")
    expect(pathIndex).toContain("onboarding/index.lesson.md")
    expect(pathIndex).toContain("lesson.review.md")
    expect(assessment).toContain("pass_rule: no_core_miss")
    expect(assessment).toContain("Agent rubric")
    expect(assessment).toContain("learning.activity.md")
    expect(activity).toContain("chess-opening-principles")
    expect(activity).toContain("**Opens next:**")
  })
})
