import { describe, expect, it } from "bun:test"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { parse } from "yaml"

const repoRoot = path.resolve(import.meta.dir, "..")

async function read(relative: string) {
  return readFile(path.join(repoRoot, relative), "utf8")
}

describe("path skill contract", () => {
  it("pins one machine-readable PathMX compatibility baseline", async () => {
    const packageJson = JSON.parse(await read("package.json"))
    const baseline = packageJson.pathmxCompatibility.baseline
    expect(baseline).toBe(packageJson.devDependencies["@fellowhumans/pathmx"])
    expect(packageJson.pathmxCompatibility.updatePolicy).toBe(
      "latest-after-verification",
    )
    expect(baseline).toMatch(/^\d+\.\d+\.\d+$/)
  })

  it("supports implicit and explicit invocation", async () => {
    const skill = await read("skills/path/SKILL.md")
    const frontmatter = parse(skill.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "")
    const interfaceConfig = parse(await read("skills/path/agents/openai.yaml"))
    const manifest = JSON.parse(await read("skills/manifest.json"))
    const declared = manifest.skills.find((entry: { name: string }) => entry.name === "path")

    expect(frontmatter.name).toBe("path")
    expect(frontmatter.description).toMatch(/automatically/)
    expect(interfaceConfig.policy?.allow_implicit_invocation).not.toBe(false)
    expect(declared.invocation).toBe("automatic-and-explicit")
  })

  it("uses a buffered module instead of Block-at-a-time generation", async () => {
    const skill = await read("skills/path/SKILL.md")
    for (const term of [
      "3–7 milestones",
      "2–4 sessions",
      "current module",
      "worked example",
      "without waiting",
      "module checkpoint",
      "annotations",
    ]) {
      expect(skill).toContain(term)
    }
    expect(skill).not.toMatch(/one agent turn (?:adds|=) one Block/i)
    expect(skill).not.toMatch(/no core concept missed before every/i)
  })

  it("ships a progressive map artifact before the buffered module", async () => {
    const skill = await read("skills/path/SKILL.md")
    const map = await read("skills/path/assets/path/index.path.md")
    expect(skill).toMatch(/before showing it to the\s+learner/)
    expect(skill).toContain("Do not create session, review, or checkpoint Sources")
    expect(map).toContain("# Proposed learning path")
    expect(map.match(/\b(?:ready|planned):?\b/g)?.length ?? 0).toBeGreaterThanOrEqual(3)
    expect(map).toContain("Evidence:")
  })

  it("keeps evidence, progress, and history durable", async () => {
    const skill = await read("skills/path/SKILL.md")
    for (const term of [
      "Point A",
      "Point B",
      "evidence targets",
      "learning.activity.md",
      "append-only",
      "foreground path",
    ]) {
      expect(skill).toContain(term)
    }
  })

  it("personalizes presentation without replacing the learning structure", async () => {
    const skill = await read("skills/path/SKILL.md")
    expect(skill).toContain("visual mood")
    expect(skill).toContain("theme tokens")
    expect(skill).toContain("reduced motion")
    expect(skill).toContain("Keep navigation and learning structure stable")
  })

  it("owns Player uptime, exact routes, and browser fallback", async () => {
    const skill = await read("skills/path/SKILL.md")
    const pathmx = await read("skills/pathmx/SKILL.md")
    for (const content of [skill, pathmx]) {
      expect(content).toContain("pathmx route")
      expect(content).toContain("@Browser")
      expect(content).toMatch(/system browser|clickable/i)
    }
  })

  it("ships self-contained loop and worked references", async () => {
    const loop = await read("skills/path/references/buffered-loop.md")
    const example = await read("skills/path/references/worked-example.md")
    expect(loop).toContain("Planning horizon")
    expect(loop).toContain("One module")
    expect(loop).toContain("Do not use a no-core-miss gate after every session")
    expect(example).toContain("Both sessions exist before the learner starts")
    expect(example).toContain("Milestone checkpoint")
  })

  it("keeps Tram's contribution visible and specific", async () => {
    const readme = await read("README.md")
    expect(readme).toContain("Tram Le")
    expect(readme).toContain("early hands-on testing")
    expect(readme).toContain("math, media, code, tooling")
  })

  it("provides a one-file bootstrap", async () => {
    const bootstrap = await read("bootstrap.md")
    for (const term of [
      "bun --version",
      "pathmx self-update",
      "@fellowhumans/pathmx@latest",
      "pathmx-learning-starter",
      "git init",
      "bun run play",
      "bun run check:candidate",
      "Player tutorial",
      "git restore package.json bun.lock",
    ]) {
      expect(bootstrap).toContain(term)
    }
  })
})
