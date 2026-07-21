import { describe, expect, it } from "bun:test"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { parse } from "yaml"

const repoRoot = path.resolve(import.meta.dir, "..")

async function read(relative: string) {
  return readFile(path.join(repoRoot, relative), "utf8")
}

describe("learn and teach skill contracts", () => {
  it("pins one machine-readable PathMX compatibility baseline", async () => {
    const packageJson = JSON.parse(await read("package.json"))
    const baseline = packageJson.pathmxCompatibility.baseline
    expect(baseline).toBe(packageJson.devDependencies["@fellowhumans/pathmx"])
    expect(packageJson.pathmxCompatibility.updatePolicy).toBe(
      "latest-after-verification",
    )
    expect(baseline).toMatch(/^\d+\.\d+\.\d+$/)
  })

  it("supports implicit and explicit learn invocation", async () => {
    const skill = await read("skills/learn/SKILL.md")
    const frontmatter = parse(skill.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "")
    const interfaceConfig = parse(await read("skills/learn/agents/openai.yaml"))
    const manifest = JSON.parse(await read("skills/manifest.json"))
    const declared = manifest.skills.find((entry: { name: string }) => entry.name === "learn")

    expect(frontmatter.name).toBe("learn")
    expect(frontmatter.description).toMatch(/automatically/)
    expect(interfaceConfig.interface.default_prompt).toContain("$learn")
    expect(interfaceConfig.policy?.allow_implicit_invocation).not.toBe(false)
    expect(declared.invocation).toBe("automatic-and-explicit")
  })

  it("uses a buffered module instead of Block-at-a-time generation", async () => {
    const skill = await read("skills/learn/SKILL.md")
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

  it("uses bounded orchestration without moving the learner loop to workers", async () => {
    const skill = await read("skills/learn/SKILL.md")
    const loop = await read("skills/learn/references/buffered-loop.md")

    expect(skill).toMatch(/Do not draft\s+session Sources before confirmation/)
    expect(skill).toMatch(/one owner\s+per file/)
    expect(skill).toContain("explicitly spawn two direct workers in parallel")
    expect(skill).toContain("default orchestration path")
    expect(skill).toMatch(/without promising a faster worker\s+model/)
    expect(skill).toContain("Do not poll workers repeatedly")
    expect(skill).toContain("The parent agent owns the learner conversation")
    expect(skill).toContain("Never wait for optional worker output")
    expect(loop).toContain("## Fast orchestration lane")
    expect(loop).toMatch(/Workers return concise\s+drafts or findings/)
    expect(loop).toContain("explicitly spawn two direct workers in parallel")
    expect(loop).toMatch(/without promising a faster worker\s+model/)
    expect(loop).toMatch(/do not draft session Sources/)
    expect(loop).toContain("Do not allow nested delegation")
    expect(loop).toMatch(/shared\s+terminology/)
    expect(loop).toMatch(/parent runs one full check/)
    expect(loop).toContain("Set a join point before learner handoff")
    expect(loop).toMatch(/continue in\s+the parent/)
    expect(`${skill}\n${loop}`).not.toContain("context: fork")
  })

  it("ships a progressive map artifact before the buffered module", async () => {
    const skill = await read("skills/learn/SKILL.md")
    const map = await read("skills/pathmx/library/templates/learn/path/index.path.md")
    expect(skill).toMatch(/before showing it to the\s+learner/)
    expect(skill).toContain("Do not create session, review, or checkpoint Sources")
    expect(map).toContain("# Proposed learning path")
    expect(map.match(/\b(?:ready|planned):?\b/g)?.length ?? 0).toBeGreaterThanOrEqual(3)
    expect(map).toContain("Evidence:")
  })

  it("keeps evidence, progress, and history durable", async () => {
    const skill = await read("skills/learn/SKILL.md")
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
    const skill = await read("skills/learn/SKILL.md")
    expect(skill).toContain("visual mood")
    expect(skill).toContain("theme tokens")
    expect(skill).toContain("reduced motion")
    expect(skill).toContain("Keep navigation and learning structure stable")
  })

  it("owns Player uptime, exact routes, and browser fallback", async () => {
    const skill = await read("skills/learn/SKILL.md")
    const pathmx = await read("skills/pathmx/SKILL.md")
    for (const content of [skill, pathmx]) {
      expect(content).toContain("pathmx route")
      expect(content).toContain("@Browser")
      expect(content).toMatch(/system browser|clickable/i)
    }
  })

  it("ships the buffered loop and complete library example", async () => {
    const loop = await read("skills/learn/references/buffered-loop.md")
    const exampleModule = await read(
      "skills/pathmx/library/examples/learn-sql-foundations/paths/sql-foundations/modules/01-combine-tables/index.path.md",
    )
    expect(loop).toContain("Planning horizon")
    expect(loop).toContain("One module")
    expect(loop).toContain("Do not use a no-core-miss gate after every session")
    expect(exampleModule).toContain("Both sessions are ready")
    expect(exampleModule).toContain("Milestone checkpoint")
  })

  it("separates personal learning from reusable teaching paths", async () => {
    const learn = await read("skills/learn/SKILL.md")
    const teach = await read("skills/teach/SKILL.md")
    const teachContract = await read("skills/teach/references/shared-path-contract.md")
    const teachFrontmatter = parse(
      teach.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "",
    )
    const manifest = JSON.parse(await read("skills/manifest.json"))
    const declared = manifest.skills.find((entry: { name: string }) => entry.name === "teach")

    expect(learn).toContain("one learner")
    expect(teachFrontmatter.name).toBe("teach")
    expect(teachFrontmatter.description).toContain("multiple learners")
    expect(teach).toContain("Do not make a personal")
    expect(teachContract).toContain("Pilot-ready")
    expect(declared.dependsOn).toEqual(["pathmx"])
  })

  it("provides one shared verified library", async () => {
    const library = await read("skills/pathmx/library/index.md")
    const learn = await read("skills/learn/SKILL.md")
    const teach = await read("skills/teach/SKILL.md")
    const component = await read(
      "skills/pathmx/library/components/feedback-panel.components.md",
    )

    for (const kind of ["Pattern", "Template", "Component", "Example"]) {
      expect(library).toContain(kind)
    }
    expect(library).toContain("pinned PathMX baseline")
    expect(learn).toContain("../pathmx/library/index.md")
    expect(teach).toContain("../pathmx/library/index.md")
    expect(component).toContain("componentName: feedback-panel")
  })

  it("documents the verified Lucide icon contract", async () => {
    const skill = await read("skills/pathmx/SKILL.md")
    const icons = await read("skills/pathmx/references/pathmx-icons.md")

    expect(skill).toContain("[Lucide icons](./references/pathmx-icons.md)")
    expect(icons).toContain(":lucide-sparkles:")
    expect(icons).toContain(":lucide-info[Information]:")
    expect(icons).toContain("assistive technology")
    expect(icons).toContain("unknown name is a build error")
    expect(icons).toContain(".pmx-icon__svg")
  })

  it("documents and fixtures authored Source and Block style classes", async () => {
    const styling = await read("skills/pathmx/references/pathmx-styling.md")
    const fixture = await read("tests/fixtures/pathmx/styling/themed.path.md")

    expect(styling).toContain("styles.classes")
    expect(styling).toContain(".pmx-document.landing-page")
    expect(styling).toContain(".pmx-block.pmx-prose.page-header.full-bleed")
    expect(styling).toContain("`pmx-` prefix is reserved")
    expect(styling).toContain("prose and feature baselines at zero specificity")
    expect(fixture).toContain("classes: [technical-lab]")
    expect(fixture).toContain("classes: [callout, full-bleed, callout]")
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
      ".agents/skills/learn/SKILL.md",
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
