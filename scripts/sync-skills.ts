#!/usr/bin/env bun
/**
 * Sync the skills in this repo into another repository.
 *
 * Usage: bun scripts/sync-skills.ts <target-repo>
 *
 * Copies each `skills/<name>` (any directory with a SKILL.md) into the
 * target's `.agents/skills/<name>` — the canonical cross-agent location,
 * which OpenAI Codex discovers natively — then ensures `.claude/skills`
 * resolves there so Claude Code finds the same skills.
 */
import {
  cp,
  lstat,
  mkdir,
  readdir,
  realpath,
  rm,
  symlink,
} from "node:fs/promises"
import path from "node:path"

const repoRoot = path.resolve(import.meta.dir, "..")
const skillsRoot = path.join(repoRoot, "skills")

async function exists(p: string) {
  return lstat(p).then(
    () => true,
    () => false,
  )
}

async function listSkills() {
  const entries = await readdir(skillsRoot, { withFileTypes: true })
  const names: string[] = []
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    if (await exists(path.join(skillsRoot, entry.name, "SKILL.md"))) {
      names.push(entry.name)
    }
  }
  return names.sort()
}

type LinkStatus = "ok" | "created" | "conflict"

/** Ensure linkPath is a relative symlink resolving to targetDir. */
async function ensureLink(
  linkPath: string,
  targetDir: string,
): Promise<LinkStatus> {
  const stats = await lstat(linkPath).catch(() => null)
  if (stats) {
    const resolved = await realpath(linkPath).catch(() => null)
    if (resolved && resolved === (await realpath(targetDir))) return "ok"
    // Never replace a real file or directory; only retarget symlinks.
    if (!stats.isSymbolicLink()) return "conflict"
    await rm(linkPath)
  }
  await mkdir(path.dirname(linkPath), { recursive: true })
  await symlink(path.relative(path.dirname(linkPath), targetDir), linkPath)
  return "created"
}

async function main() {
  const [target, ...rest] = process.argv.slice(2)
  if (!target || rest.length > 0) {
    console.error("Usage: bun scripts/sync-skills.ts <target-repo>")
    process.exit(2)
  }

  const targetRoot = path.resolve(process.cwd(), target)
  if (!(await exists(path.join(targetRoot, ".git")))) {
    throw new Error(`Target is not a git repository: ${targetRoot}`)
  }
  if (targetRoot === repoRoot) {
    throw new Error("Target must be a different repository")
  }

  const skills = await listSkills()
  if (skills.length === 0) throw new Error(`No skills found in ${skillsRoot}`)

  // 1. Byte-sync each skill into the canonical .agents/skills directory.
  //    OpenAI Codex discovers repo skills here natively.
  const agentSkillsDir = path.join(targetRoot, ".agents/skills")
  await mkdir(agentSkillsDir, { recursive: true })
  for (const name of skills) {
    const dest = path.join(agentSkillsDir, name)
    await rm(dest, { force: true, recursive: true })
    await cp(path.join(skillsRoot, name), dest, { recursive: true })
    console.log(`synced  .agents/skills/${name}`)
  }

  // 2. Claude Code discovery: .claude/skills -> ../.agents/skills
  const claudeSkills = path.join(targetRoot, ".claude/skills")
  const status = await ensureLink(claudeSkills, agentSkillsDir)
  if (status === "conflict") {
    // .claude/skills is a real directory with its own content;
    // link each synced skill inside it instead of replacing it.
    for (const name of skills) {
      const entry = await ensureLink(
        path.join(claudeSkills, name),
        path.join(agentSkillsDir, name),
      )
      if (entry === "conflict") {
        console.error(
          `skipped .claude/skills/${name} — existing non-symlink entry; align it manually`,
        )
        process.exitCode = 1
      } else {
        console.log(`linked  .claude/skills/${name}`)
      }
    }
  } else {
    console.log(`${status === "ok" ? "ok" : "linked"}  .claude/skills -> ../.agents/skills`)
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
