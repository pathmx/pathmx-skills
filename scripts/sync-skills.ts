#!/usr/bin/env bun

import {
  cp,
  lstat,
  mkdir,
  readFile,
  readdir,
  readlink,
  realpath,
  rename,
  rm,
  rmdir,
  symlink,
} from "node:fs/promises"
import path from "node:path"

const repoRoot = path.resolve(import.meta.dir, "..")
const skillsRoot = path.join(repoRoot, "skills")
const manifestPath = path.join(skillsRoot, "manifest.json")

export type Drift = {
  kind: "missing" | "changed" | "extra"
  path: string
}

type FileEntry = {
  path: string
  kind: "file" | "symlink"
}

export type TargetLayout = {
  root: string
  agentDir: string
  agentSkillsDir: string
  claudeDir: string
  claudeSkills: string
  claudeMode: "root-link" | "per-skill-links"
  skills: string[]
  retiredSkills: string[]
}

export type SyncHooks = {
  afterStage?: () => Promise<void> | void
  afterInstall?: (name: string, index: number) => Promise<void> | void
}

async function stats(target: string) {
  return lstat(target).catch(() => null)
}

function assertInside(root: string, target: string) {
  const relative = path.relative(root, target)
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Path escapes target repository: ${target}`)
  }
}

export async function discoverSkills(
  root = skillsRoot,
  declaredManifest = manifestPath,
) {
  const entries = await readdir(root, { withFileTypes: true })
  const names: string[] = []
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    if (await stats(path.join(root, entry.name, "SKILL.md"))) names.push(entry.name)
  }
  names.sort()

  const manifest = JSON.parse(await readFile(declaredManifest, "utf8")) as {
    skills?: Array<{ name?: string }>
  }
  const declared = (manifest.skills ?? [])
    .map((skill) => skill.name)
    .filter((name): name is string => typeof name === "string")
    .sort()
  if (JSON.stringify(names) !== JSON.stringify(declared)) {
    throw new Error(
      `Skill manifest does not match packages: ${declared.join(", ")} != ${names.join(", ")}`,
    )
  }
  return names
}

async function discoverRetiredSkills(declaredManifest = manifestPath) {
  const manifest = JSON.parse(await readFile(declaredManifest, "utf8")) as {
    skills?: Array<{ name?: string; replaces?: string[] }>
  }
  const current = new Set(
    (manifest.skills ?? [])
      .map((skill) => skill.name)
      .filter((name): name is string => typeof name === "string"),
  )
  const retired = (manifest.skills ?? []).flatMap((skill) => skill.replaces ?? [])
  if (retired.some((name) => current.has(name))) {
    throw new Error("Replaced skill names must not match current packages")
  }
  if (new Set(retired).size !== retired.length) {
    throw new Error("Replaced skill names must be unique")
  }
  return retired.sort()
}

export async function listFiles(root: string): Promise<FileEntry[]> {
  const rootStats = await stats(root)
  if (!rootStats) return []
  if (rootStats.isSymbolicLink()) return [{ path: "", kind: "symlink" }]
  if (!rootStats.isDirectory()) return [{ path: "", kind: "file" }]

  const files: FileEntry[] = []
  async function visit(directory: string, prefix: string) {
    const entries = await readdir(directory, { withFileTypes: true })
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const absolute = path.join(directory, entry.name)
      const relative = path.join(prefix, entry.name)
      const entryStats = await lstat(absolute)
      if (entryStats.isDirectory() && !entryStats.isSymbolicLink()) {
        await visit(absolute, relative)
      } else {
        files.push({
          path: relative,
          kind: entryStats.isSymbolicLink() ? "symlink" : "file",
        })
      }
    }
  }
  await visit(root, "")
  return files
}

export async function compareSkill(source: string, target: string, name: string) {
  const sourceFiles = await listFiles(source)
  const targetFiles = await listFiles(target)
  const sourceMap = new Map(sourceFiles.map((entry) => [entry.path, entry]))
  const targetMap = new Map(targetFiles.map((entry) => [entry.path, entry]))
  const drift: Drift[] = []

  for (const [relative, sourceEntry] of sourceMap) {
    const targetEntry = targetMap.get(relative)
    const display = relative ? `${name}/${relative}` : name
    if (!targetEntry) {
      drift.push({ kind: "missing", path: display })
      continue
    }
    if (sourceEntry.kind !== "file" || targetEntry.kind !== "file") {
      drift.push({ kind: "changed", path: display })
      continue
    }
    const [sourceBytes, targetBytes] = await Promise.all([
      readFile(path.join(source, relative)),
      readFile(path.join(target, relative)),
    ])
    if (!sourceBytes.equals(targetBytes)) drift.push({ kind: "changed", path: display })
  }

  for (const relative of targetMap.keys()) {
    if (!sourceMap.has(relative)) {
      drift.push({ kind: "extra", path: relative ? `${name}/${relative}` : name })
    }
  }

  return drift.sort(
    (a, b) => a.path.localeCompare(b.path) || a.kind.localeCompare(b.kind),
  )
}

async function requireRealDirectoryOrMissing(target: string, label: string) {
  const targetStats = await stats(target)
  if (!targetStats) return
  if (targetStats.isSymbolicLink() || !targetStats.isDirectory()) {
    throw new Error(`${label} must be a real directory: ${target}`)
  }
}

function expectedLink(linkPath: string, targetPath: string) {
  return path.relative(path.dirname(linkPath), targetPath)
}

async function linkMatches(linkPath: string, targetPath: string) {
  const linkStats = await stats(linkPath)
  if (!linkStats?.isSymbolicLink()) return false
  const current = await readlink(linkPath)
  return path.resolve(path.dirname(linkPath), current) === targetPath
}

export async function inspectTarget(
  target: string,
  canonicalRoot = repoRoot,
  canonicalSkills = skillsRoot,
  canonicalManifest = manifestPath,
): Promise<TargetLayout> {
  const requested = path.resolve(target)
  const root = await realpath(requested).catch(() => {
    throw new Error(`Target does not exist: ${requested}`)
  })
  const canonical = await realpath(canonicalRoot)
  if (root === canonical) throw new Error("Target must be a different repository")

  const gitStats = await stats(path.join(root, ".git"))
  if (!gitStats || gitStats.isSymbolicLink()) {
    throw new Error(`Target is not a Git repository: ${root}`)
  }

  const skills = await discoverSkills(canonicalSkills, canonicalManifest)
  const retiredSkills = await discoverRetiredSkills(canonicalManifest)
  const agentDir = path.join(root, ".agents")
  const agentSkillsDir = path.join(agentDir, "skills")
  const claudeDir = path.join(root, ".claude")
  const claudeSkills = path.join(claudeDir, "skills")
  for (const targetPath of [agentDir, agentSkillsDir, claudeDir]) {
    assertInside(root, targetPath)
  }
  await requireRealDirectoryOrMissing(agentDir, ".agents")
  await requireRealDirectoryOrMissing(agentSkillsDir, ".agents/skills")
  await requireRealDirectoryOrMissing(claudeDir, ".claude")

  const claudeSkillsStats = await stats(claudeSkills)
  let claudeMode: TargetLayout["claudeMode"] = "root-link"
  if (claudeSkillsStats && !claudeSkillsStats.isSymbolicLink()) {
    if (!claudeSkillsStats.isDirectory()) {
      throw new Error(`.claude/skills must be a directory or symlink: ${claudeSkills}`)
    }
    claudeMode = "per-skill-links"
    for (const name of [...skills, ...retiredSkills]) {
      const link = path.join(claudeSkills, name)
      assertInside(root, link)
      const linkStats = await stats(link)
      if (linkStats && !linkStats.isSymbolicLink()) {
        throw new Error(`Claude skill conflict: ${link}`)
      }
    }
  }

  for (const name of [...skills, ...retiredSkills]) {
    assertInside(root, path.join(agentSkillsDir, name))
  }

  return {
    root,
    agentDir,
    agentSkillsDir,
    claudeDir,
    claudeSkills,
    claudeMode,
    skills,
    retiredSkills,
  }
}

export async function inspectDrift(layout: TargetLayout, canonicalSkills = skillsRoot) {
  const drift: Drift[] = []
  for (const name of layout.skills) {
    drift.push(
      ...(await compareSkill(
        path.join(canonicalSkills, name),
        path.join(layout.agentSkillsDir, name),
        name,
      )),
    )
  }
  for (const name of layout.retiredSkills) {
    if (await stats(path.join(layout.agentSkillsDir, name))) {
      drift.push({ kind: "extra", path: `${name} (retired)` })
    }
  }

  const linkDrift: string[] = []
  if (layout.claudeMode === "root-link") {
    if (!(await linkMatches(layout.claudeSkills, layout.agentSkillsDir))) {
      const current = await stats(layout.claudeSkills)
      const value = current?.isSymbolicLink() ? await readlink(layout.claudeSkills) : "missing"
      linkDrift.push(`link    .claude/skills -> ${value}`)
    }
  } else {
    for (const name of layout.skills) {
      const link = path.join(layout.claudeSkills, name)
      const target = path.join(layout.agentSkillsDir, name)
      if (!(await linkMatches(link, target))) {
        const current = await stats(link)
        const value = current?.isSymbolicLink() ? await readlink(link) : "missing"
        linkDrift.push(`link    .claude/skills/${name} -> ${value}`)
      }
    }
    for (const name of layout.retiredSkills) {
      const link = path.join(layout.claudeSkills, name)
      const current = await stats(link)
      if (current) {
        const value = current.isSymbolicLink() ? await readlink(link) : "conflict"
        linkDrift.push(`extra   .claude/skills/${name} -> ${value}`)
      }
    }
  }

  return {
    files: drift.sort(
      (a, b) => a.path.localeCompare(b.path) || a.kind.localeCompare(b.kind),
    ),
    links: linkDrift.sort(),
  }
}

async function removeEntry(target: string) {
  await rm(target, { recursive: true, force: true })
}

async function cleanupCreatedDirectories(paths: string[]) {
  for (const target of paths.reverse()) await rmdir(target).catch(() => {})
}

export async function writeSkills(
  layout: TargetLayout,
  canonicalSkills = skillsRoot,
  hooks: SyncHooks = {},
) {
  const initialDrift = await inspectDrift(layout, canonicalSkills)
  if (initialDrift.files.length === 0 && initialDrift.links.length === 0) return false

  const createdDirectories: string[] = []
  if (!(await stats(layout.agentDir))) {
    await mkdir(layout.agentDir)
    createdDirectories.push(layout.agentDir)
  }
  if (!(await stats(layout.agentSkillsDir))) {
    await mkdir(layout.agentSkillsDir)
    createdDirectories.push(layout.agentSkillsDir)
  }
  await requireRealDirectoryOrMissing(layout.agentDir, ".agents")
  await requireRealDirectoryOrMissing(layout.agentSkillsDir, ".agents/skills")

  const transaction = path.join(
    layout.agentDir,
    `.pathmx-skills-transaction-${crypto.randomUUID()}`,
  )
  const stageRoot = path.join(transaction, "stage")
  const skillBackupRoot = path.join(transaction, "backup-skills")
  const linkBackupRoot = path.join(transaction, "backup-links")
  await mkdir(stageRoot, { recursive: true })
  await mkdir(skillBackupRoot)
  await mkdir(linkBackupRoot)

  const backedUpSkills: string[] = []
  const installedSkills: string[] = []
  const backedUpLinks: Array<{ original: string; backup: string }> = []
  const createdLinks: string[] = []
  let createdClaudeDir = false

  async function backupLink(linkPath: string, backupName: string) {
    const linkStats = await stats(linkPath)
    if (!linkStats) return
    if (!linkStats.isSymbolicLink()) {
      throw new Error(`Claude skill conflict: ${linkPath}`)
    }
    const backup = path.join(linkBackupRoot, backupName)
    await rename(linkPath, backup)
    backedUpLinks.push({ original: linkPath, backup })
  }

  async function rollback() {
    for (const link of createdLinks.reverse()) await removeEntry(link)
    for (const link of backedUpLinks.reverse()) await rename(link.backup, link.original)
    for (const name of installedSkills.reverse()) {
      await removeEntry(path.join(layout.agentSkillsDir, name))
    }
    for (const name of backedUpSkills.reverse()) {
      await rename(
        path.join(skillBackupRoot, name),
        path.join(layout.agentSkillsDir, name),
      )
    }
    await removeEntry(transaction)
    if (createdClaudeDir) await rmdir(layout.claudeDir).catch(() => {})
    await cleanupCreatedDirectories(createdDirectories)
  }

  try {
    for (const name of layout.skills) {
      await cp(path.join(canonicalSkills, name), path.join(stageRoot, name), {
        recursive: true,
        errorOnExist: true,
      })
      const stagedDrift = await compareSkill(
        path.join(canonicalSkills, name),
        path.join(stageRoot, name),
        name,
      )
      if (stagedDrift.length > 0) throw new Error(`Staged copy mismatch: ${name}`)
    }
    await hooks.afterStage?.()

    for (const name of [...layout.skills, ...layout.retiredSkills]) {
      const destination = path.join(layout.agentSkillsDir, name)
      if (await stats(destination)) {
        await rename(destination, path.join(skillBackupRoot, name))
        backedUpSkills.push(name)
      }
    }
    for (const [index, name] of layout.skills.entries()) {
      await rename(path.join(stageRoot, name), path.join(layout.agentSkillsDir, name))
      installedSkills.push(name)
      await hooks.afterInstall?.(name, index)
    }

    if (layout.claudeMode === "root-link") {
      if (!(await stats(layout.claudeDir))) {
        await mkdir(layout.claudeDir)
        createdClaudeDir = true
      }
      await requireRealDirectoryOrMissing(layout.claudeDir, ".claude")
      const claudeSkillsStats = await stats(layout.claudeSkills)
      if (claudeSkillsStats && !claudeSkillsStats.isSymbolicLink()) {
        throw new Error(`Claude skill conflict: ${layout.claudeSkills}`)
      }
      await backupLink(layout.claudeSkills, "skills")
      await symlink(
        expectedLink(layout.claudeSkills, layout.agentSkillsDir),
        layout.claudeSkills,
      )
      createdLinks.push(layout.claudeSkills)
    } else {
      await requireRealDirectoryOrMissing(layout.claudeDir, ".claude")
      await requireRealDirectoryOrMissing(layout.claudeSkills, ".claude/skills")
      for (const name of layout.skills) {
        const link = path.join(layout.claudeSkills, name)
        await backupLink(link, name)
        await symlink(
          expectedLink(link, path.join(layout.agentSkillsDir, name)),
          link,
        )
        createdLinks.push(link)
      }
      for (const name of layout.retiredSkills) {
        await backupLink(path.join(layout.claudeSkills, name), `retired-${name}`)
      }
    }

    await removeEntry(transaction)
    return true
  } catch (error) {
    await rollback()
    throw error
  }
}

function printDrift(drift: Awaited<ReturnType<typeof inspectDrift>>) {
  for (const item of drift.files) console.log(`${item.kind.padEnd(7)} ${item.path}`)
  for (const item of drift.links) console.log(item)
}

export async function runCli(
  args: string[],
  cwd = process.cwd(),
  canonicalRoot = repoRoot,
  canonicalSkills = skillsRoot,
  canonicalManifest = manifestPath,
) {
  const [mode, target, ...rest] = args
  if ((mode !== "--check" && mode !== "--write") || !target || rest.length > 0) {
    console.error("Usage: bun run sync-skills -- --check|--write <target-repository>")
    return 2
  }

  try {
    const layout = await inspectTarget(
      path.resolve(cwd, target),
      canonicalRoot,
      canonicalSkills,
      canonicalManifest,
    )
    if (mode === "--check") {
      const drift = await inspectDrift(layout, canonicalSkills)
      printDrift(drift)
      return drift.files.length === 0 && drift.links.length === 0 ? 0 : 1
    }

    const changed = await writeSkills(layout, canonicalSkills)
    const drift = await inspectDrift(layout, canonicalSkills)
    if (drift.files.length > 0 || drift.links.length > 0) {
      printDrift(drift)
      return 1
    }
    console.log(changed ? `Synced ${layout.skills.join(", ")}.` : "Skills are aligned.")
    return 0
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    return 1
  }
}

if (import.meta.main) process.exit(await runCli(process.argv.slice(2)))
