import { afterEach, describe, expect, it } from "bun:test"
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readlink,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import {
  compareSkill,
  discoverSkills,
  inspectDrift,
  inspectTarget,
  runCli,
  writeSkills,
} from "./sync-skills"

const fixtures: string[] = []

afterEach(async () => {
  await Promise.all(
    fixtures.splice(0).map((fixture) => rm(fixture, { recursive: true, force: true })),
  )
})

async function temp(prefix: string) {
  const root = await mkdtemp(path.join(os.tmpdir(), prefix))
  fixtures.push(root)
  return root
}

async function createCanonical() {
  const root = await temp("pathmx-canonical-")
  const skills = path.join(root, "skills")
  for (const name of ["pathmx", "learn", "teach"]) {
    await mkdir(path.join(skills, name, "references"), { recursive: true })
    await writeFile(
      path.join(skills, name, "SKILL.md"),
      `---\nname: ${name}\ndescription: ${name}\n---\n`,
    )
    await writeFile(path.join(skills, name, "references", "note.md"), `# ${name}\n`)
  }
  const manifest = path.join(skills, "manifest.json")
  await writeFile(
    manifest,
    JSON.stringify({
      skills: [
        { name: "pathmx" },
        { name: "learn", replaces: ["path"] },
        { name: "teach" },
      ],
    }),
  )
  return { root, skills, manifest }
}

async function createTarget(gitFile = false) {
  const root = await temp("pathmx-target-")
  if (gitFile) await writeFile(path.join(root, ".git"), "gitdir: elsewhere\n")
  else await mkdir(path.join(root, ".git"))
  return root
}

async function layoutFor(target: string, canonical: Awaited<ReturnType<typeof createCanonical>>) {
  return inspectTarget(target, canonical.root, canonical.skills, canonical.manifest)
}

describe("skill sync", () => {
  it("discovers declared skills in sorted order", async () => {
    const canonical = await createCanonical()
    expect(await discoverSkills(canonical.skills, canonical.manifest)).toEqual([
      "learn",
      "pathmx",
      "teach",
    ])
  })

  it("writes byte-identical skills and the root Claude link", async () => {
    const canonical = await createCanonical()
    const target = await createTarget()
    const layout = await layoutFor(target, canonical)
    expect(await writeSkills(layout, canonical.skills)).toBe(true)
    expect((await inspectDrift(layout, canonical.skills)).files).toEqual([])
    expect((await inspectDrift(layout, canonical.skills)).links).toEqual([])
    expect(await readlink(path.join(target, ".claude", "skills"))).toBe("../.agents/skills")
  })

  it("is idempotent", async () => {
    const canonical = await createCanonical()
    const target = await createTarget()
    const layout = await layoutFor(target, canonical)
    await writeSkills(layout, canonical.skills)
    expect(await writeSkills(layout, canonical.skills)).toBe(false)
  })

  it("reports changed, missing, and extra managed files", async () => {
    const canonical = await createCanonical()
    const target = await createTarget()
    const layout = await layoutFor(target, canonical)
    await writeSkills(layout, canonical.skills)
    await writeFile(path.join(layout.agentSkillsDir, "learn", "SKILL.md"), "changed\n")
    await rm(path.join(layout.agentSkillsDir, "learn", "references", "note.md"))
    await writeFile(path.join(layout.agentSkillsDir, "learn", "extra.md"), "extra\n")
    expect(await compareSkill(
      path.join(canonical.skills, "learn"),
      path.join(layout.agentSkillsDir, "learn"),
      "learn",
    )).toEqual([
      { kind: "extra", path: "learn/extra.md" },
      { kind: "missing", path: "learn/references/note.md" },
      { kind: "changed", path: "learn/SKILL.md" },
    ])
  })

  it("removes non-canonical target skills", async () => {
    const canonical = await createCanonical()
    const target = await createTarget()
    await mkdir(path.join(target, ".agents", "skills", "local"), { recursive: true })
    await writeFile(path.join(target, ".agents", "skills", "local", "SKILL.md"), "local\n")
    const layout = await layoutFor(target, canonical)
    expect((await inspectDrift(layout, canonical.skills)).files).toContainEqual({
      kind: "extra",
      path: "local (non-canonical)",
    })
    await writeSkills(layout, canonical.skills)
    await expect(lstat(path.join(layout.agentSkillsDir, "local"))).rejects.toThrow()
  })

  it("removes the retired path skill while installing learn", async () => {
    const canonical = await createCanonical()
    const target = await createTarget(true)
    await mkdir(path.join(target, ".agents", "skills", "path"), { recursive: true })
    await writeFile(
      path.join(target, ".agents", "skills", "path", "SKILL.md"),
      "old-path\n",
    )
    await mkdir(path.join(target, ".claude", "skills"), { recursive: true })
    await symlink(
      ["..", "..", ".agents", "skills", "path"].join("/"),
      path.join(target, ".claude", "skills", "path"),
    )

    const layout = await layoutFor(target, canonical)
    expect((await inspectDrift(layout, canonical.skills)).files).toContainEqual({
      kind: "extra",
      path: "path (retired)",
    })
    expect((await inspectDrift(layout, canonical.skills)).links).toContain(
      "link    .claude/skills -> non-link",
    )

    await writeSkills(layout, canonical.skills)
    await expect(lstat(path.join(layout.agentSkillsDir, "path"))).rejects.toThrow()
    await expect(lstat(path.join(layout.claudeSkills, "path"))).rejects.toThrow()
    expect(await readFile(path.join(layout.agentSkillsDir, "learn", "SKILL.md"), "utf8"))
      .toContain("name: learn")
  })

  it("replaces a real Claude skills directory with the canonical root link", async () => {
    const canonical = await createCanonical()
    const target = await createTarget(true)
    await mkdir(path.join(target, ".claude", "skills"), { recursive: true })
    await writeFile(path.join(target, ".claude", "skills", "local.txt"), "keep\n")
    const layout = await layoutFor(target, canonical)
    await writeSkills(layout, canonical.skills)
    expect(await readlink(layout.claudeSkills)).toBe("../.agents/skills")
    await expect(lstat(path.join(layout.claudeSkills, "local.txt"))).rejects.toThrow()
  })

  it("replaces a real per-skill Claude conflict", async () => {
    const canonical = await createCanonical()
    const target = await createTarget()
    await mkdir(path.join(target, ".claude", "skills", "learn"), { recursive: true })
    const layout = await layoutFor(target, canonical)
    await writeSkills(layout, canonical.skills)
    expect(await readlink(layout.claudeSkills)).toBe("../.agents/skills")
  })

  it("removes staging changes when staging fails", async () => {
    const canonical = await createCanonical()
    const target = await createTarget()
    const layout = await layoutFor(target, canonical)
    await expect(
      writeSkills(layout, canonical.skills, {
        afterStage() {
          throw new Error("staging failure")
        },
      }),
    ).rejects.toThrow("staging failure")
    await expect(lstat(path.join(target, ".agents"))).rejects.toThrow()
  })

  it("restores all managed skills after a mid-transaction failure", async () => {
    const canonical = await createCanonical()
    const target = await createTarget()
    for (const name of ["learn", "pathmx", "teach"]) {
      await mkdir(path.join(target, ".agents", "skills", name), { recursive: true })
      await writeFile(path.join(target, ".agents", "skills", name, "SKILL.md"), `old-${name}\n`)
    }
    await mkdir(path.join(target, ".agents", "skills", "path"), { recursive: true })
    await writeFile(path.join(target, ".agents", "skills", "path", "SKILL.md"), "old-path\n")
    const layout = await layoutFor(target, canonical)
    await expect(
      writeSkills(layout, canonical.skills, {
        afterInstall(_name, index) {
          if (index === 0) throw new Error("install failure")
        },
      }),
    ).rejects.toThrow("install failure")
    expect(await readFile(path.join(layout.agentSkillsDir, "learn", "SKILL.md"), "utf8")).toBe(
      "old-learn\n",
    )
    expect(await readFile(path.join(layout.agentSkillsDir, "pathmx", "SKILL.md"), "utf8")).toBe(
      "old-pathmx\n",
    )
    expect(await readFile(path.join(layout.agentSkillsDir, "teach", "SKILL.md"), "utf8")).toBe(
      "old-teach\n",
    )
    expect(await readFile(path.join(layout.agentSkillsDir, "path", "SKILL.md"), "utf8")).toBe(
      "old-path\n",
    )
  })

  it("rejects symlinked parents without touching the outside target", async () => {
    const canonical = await createCanonical()
    const target = await createTarget()
    const outside = await temp("pathmx-outside-")
    await writeFile(path.join(outside, "sentinel"), "safe\n")
    await symlink(outside, path.join(target, ".agents"))
    await expect(layoutFor(target, canonical)).rejects.toThrow("real directory")
    expect(await readFile(path.join(outside, "sentinel"), "utf8")).toBe("safe\n")
  })

  it("rejects a symlinked Claude parent", async () => {
    const canonical = await createCanonical()
    const target = await createTarget()
    const outside = await temp("pathmx-claude-outside-")
    await symlink(outside, path.join(target, ".claude"))
    await expect(layoutFor(target, canonical)).rejects.toThrow("real directory")
  })

  it("rejects the canonical repository as a target", async () => {
    const canonical = await createCanonical()
    await expect(
      inspectTarget(
        canonical.root,
        canonical.root,
        canonical.skills,
        canonical.manifest,
      ),
    ).rejects.toThrow("different repository")
  })

  it("reports and repairs a wrong Claude link only in write mode", async () => {
    const canonical = await createCanonical()
    const target = await createTarget()
    await mkdir(path.join(target, ".claude"))
    await symlink("../wrong", path.join(target, ".claude", "skills"))
    const layout = await layoutFor(target, canonical)
    expect((await inspectDrift(layout, canonical.skills)).links).toEqual([
      "link    .claude/skills -> ../wrong",
    ])
    expect(await readlink(layout.claudeSkills)).toBe("../wrong")
    await writeSkills(layout, canonical.skills)
    expect(await readlink(layout.claudeSkills)).toBe("../.agents/skills")
  })

  it("invalid CLI forms do not write", async () => {
    const canonical = await createCanonical()
    const target = await createTarget()
    expect(
      await runCli(
        [target],
        process.cwd(),
        canonical.root,
        canonical.skills,
        canonical.manifest,
      ),
    ).toBe(2)
    await expect(lstat(path.join(target, ".agents"))).rejects.toThrow()
  })

  it("check mode is read-only and reports alignment", async () => {
    const canonical = await createCanonical()
    const target = await createTarget()
    expect(
      await runCli(
        ["--check", target],
        process.cwd(),
        canonical.root,
        canonical.skills,
        canonical.manifest,
      ),
    ).toBe(1)
    await expect(lstat(path.join(target, ".agents"))).rejects.toThrow()
    expect(
      await runCli(
        ["--write", target],
        process.cwd(),
        canonical.root,
        canonical.skills,
        canonical.manifest,
      ),
    ).toBe(0)
    expect(
      await runCli(
        ["--check", target],
        process.cwd(),
        canonical.root,
        canonical.skills,
        canonical.manifest,
      ),
    ).toBe(0)
  })
})
