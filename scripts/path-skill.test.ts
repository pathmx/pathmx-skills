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
})
