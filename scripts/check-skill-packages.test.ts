import { afterEach, describe, expect, it } from "bun:test"
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import { validateSkillPackages } from "./check-skill-packages"

const fixtures: string[] = []

afterEach(async () => {
  await Promise.all(
    fixtures.splice(0).map((fixture) => rm(fixture, { recursive: true, force: true })),
  )
})

async function fixture(skillMarkdown: string, extraFile?: string) {
  const root = await mkdtemp(path.join(os.tmpdir(), "pathmx-skill-check-"))
  fixtures.push(root)
  await mkdir(path.join(root, "skills", "demo"), { recursive: true })
  await writeFile(path.join(root, "skills", "demo", "SKILL.md"), skillMarkdown)
  if (extraFile) await writeFile(path.join(root, "skills", "demo", "ref.md"), extraFile)
  await writeFile(
    path.join(root, "skills", "manifest.json"),
    JSON.stringify({
      schema: "pathmx-skills/manifest",
      version: 1,
      skills: [
        {
          name: "demo",
          directory: "skills/demo",
          invocation: "explicit",
          purpose: "Test skill.",
          dependsOn: [],
        },
      ],
    }),
  )
  return root
}

describe("skill package validation", () => {
  it("accepts a valid package", async () => {
    const root = await fixture("---\nname: demo\ndescription: Test.\n---\n\n# Demo\n")
    expect(await validateSkillPackages(root)).toEqual([])
  })

  it("requires frontmatter", async () => {
    const root = await fixture("# Demo\n")
    expect(await validateSkillPackages(root)).toEqual(
      expect.arrayContaining([expect.objectContaining({ message: "missing YAML frontmatter" })]),
    )
  })

  it("requires the name to match the directory", async () => {
    const root = await fixture("---\nname: other\ndescription: Test.\n---\n")
    expect(await validateSkillPackages(root)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: expect.stringContaining("match directory") }),
      ]),
    )
  })

  it("reports broken SKILL links", async () => {
    const root = await fixture(
      "---\nname: demo\ndescription: Test.\n---\n\n[ref](./missing.md)\n",
    )
    expect(await validateSkillPackages(root)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: expect.stringContaining("missing target") }),
      ]),
    )
  })

  it("rejects absolute local paths", async () => {
    const root = await fixture(
      "---\nname: demo\ndescription: Test.\n---\n",
      ["", "Users", "person", "work"].join("/") + "\n",
    )
    expect(await validateSkillPackages(root)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: "absolute local filesystem path" }),
      ]),
    )
  })

  it("requires manifest parity", async () => {
    const root = await fixture("---\nname: demo\ndescription: Test.\n---\n")
    await mkdir(path.join(root, "skills", "extra"))
    await writeFile(
      path.join(root, "skills", "extra", "SKILL.md"),
      "---\nname: extra\ndescription: Extra.\n---\n",
    )
    expect(await validateSkillPackages(root)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: expect.stringContaining("must match directories") }),
      ]),
    )
  })
})
