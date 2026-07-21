#!/usr/bin/env bun

import { existsSync } from "node:fs"
import { readFile, readdir } from "node:fs/promises"
import path from "node:path"
import { parse } from "yaml"

import { checkMarkdownFile } from "./check-markdown-links"

export type SkillFinding = { file: string; message: string }

type SkillManifest = {
  schema: string
  version: number
  skills: Array<{
    name: string
    directory: string
    invocation: "automatic-and-explicit" | "explicit"
    purpose: string
    dependsOn: string[]
    replaces?: string[]
  }>
}

function parseFrontmatter(markdown: string) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
  if (!match?.[1]) throw new Error("missing YAML frontmatter")
  const data = parse(match[1])
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("frontmatter must be a mapping")
  }
  return data as Record<string, unknown>
}

export async function discoverSkillDirectories(skillsRoot: string) {
  const entries = await readdir(skillsRoot, { withFileTypes: true })
  return entries
    .filter(
      (entry) =>
        entry.isDirectory() && existsSync(path.join(skillsRoot, entry.name, "SKILL.md")),
    )
    .map((entry) => entry.name)
    .sort()
}

async function listFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const entryPath = path.join(root, entry.name)
    if (entry.isDirectory()) files.push(...(await listFiles(entryPath)))
    else if (entry.isFile()) files.push(entryPath)
  }
  return files.sort()
}

export async function validateSkillPackages(repoRoot: string) {
  const findings: SkillFinding[] = []
  const skillsRoot = path.join(repoRoot, "skills")
  const names = await discoverSkillDirectories(skillsRoot)

  for (const name of names) {
    const skillDir = path.join(skillsRoot, name)
    const skillPath = path.join(skillDir, "SKILL.md")
    const relativeSkillPath = path.relative(repoRoot, skillPath)
    const markdown = await readFile(skillPath, "utf8")
    try {
      const frontmatter = parseFrontmatter(markdown)
      if (frontmatter.name !== name) {
        findings.push({
          file: relativeSkillPath,
          message: `name must match directory (${name})`,
        })
      }
      if (typeof frontmatter.description !== "string" || !frontmatter.description.trim()) {
        findings.push({ file: relativeSkillPath, message: "description is required" })
      }
      const extraKeys = Object.keys(frontmatter).filter(
        (key) => key !== "name" && key !== "description",
      )
      if (extraKeys.length > 0) {
        findings.push({
          file: relativeSkillPath,
          message: `unsupported frontmatter keys: ${extraKeys.sort().join(", ")}`,
        })
      }
    } catch (error) {
      findings.push({
        file: relativeSkillPath,
        message: error instanceof Error ? error.message : String(error),
      })
    }

    for (const link of await checkMarkdownFile(skillPath, repoRoot)) {
      findings.push({
        file: `${link.file}:${link.line}`,
        message: `${link.reason}: ${link.target}`,
      })
    }

    for (const file of await listFiles(skillDir)) {
      const content = await readFile(file, "utf8").catch(() => "")
      if (/(?:\/Users\/|\/home\/|(?:^|[\s"'(])[A-Za-z]:\\[A-Za-z0-9])/.test(content)) {
        findings.push({
          file: path.relative(repoRoot, file),
          message: "absolute local filesystem path",
        })
      }
    }
  }

  const manifestPath = path.join(skillsRoot, "manifest.json")
  if (!existsSync(manifestPath)) {
    findings.push({ file: "skills/manifest.json", message: "missing manifest" })
  } else {
    try {
      const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as SkillManifest
      if (manifest.schema !== "pathmx-skills/manifest" || manifest.version !== 1) {
        findings.push({ file: "skills/manifest.json", message: "unsupported schema or version" })
      }
      const manifestNames = manifest.skills.map((skill) => skill.name).sort()
      const replacedNames = manifest.skills.flatMap((skill) => skill.replaces ?? [])
      if (JSON.stringify(manifestNames) !== JSON.stringify(names)) {
        findings.push({
          file: "skills/manifest.json",
          message: `manifest skills (${manifestNames.join(", ")}) must match directories (${names.join(", ")})`,
        })
      }
      if (
        new Set(replacedNames).size !== replacedNames.length ||
        replacedNames.some((name) => manifestNames.includes(name))
      ) {
        findings.push({
          file: "skills/manifest.json",
          message: "replaced skill names must be unique and retired",
        })
      }
      for (const skill of manifest.skills) {
        if (skill.directory !== `skills/${skill.name}`) {
          findings.push({
            file: "skills/manifest.json",
            message: `invalid directory for ${skill.name}`,
          })
        }
        if (!skill.purpose?.trim() || !Array.isArray(skill.dependsOn)) {
          findings.push({
            file: "skills/manifest.json",
            message: `invalid metadata for ${skill.name}`,
          })
        }
        if (skill.replaces && !Array.isArray(skill.replaces)) {
          findings.push({
            file: "skills/manifest.json",
            message: `invalid replacements for ${skill.name}`,
          })
        }
        for (const dependency of skill.dependsOn) {
          if (!manifestNames.includes(dependency)) {
            findings.push({
              file: "skills/manifest.json",
              message: `${skill.name} depends on unknown skill ${dependency}`,
            })
          }
        }
      }
    } catch (error) {
      findings.push({
        file: "skills/manifest.json",
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return findings.sort(
    (a, b) => a.file.localeCompare(b.file) || a.message.localeCompare(b.message),
  )
}

if (import.meta.main) {
  const repoRoot = path.resolve(import.meta.dir, "..")
  const findings = await validateSkillPackages(repoRoot)
  for (const finding of findings) console.error(`${finding.file}: ${finding.message}`)
  if (findings.length > 0) process.exit(1)
  console.log(
    `Checked ${(await discoverSkillDirectories(path.join(repoRoot, "skills"))).length} skill packages.`,
  )
}
