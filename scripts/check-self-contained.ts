#!/usr/bin/env bun

import { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import path from "node:path"

export type SelfContainmentFinding = {
  file: string
  line: number
  message: string
}

const forbiddenText: Array<[RegExp, string]> = [
  [/(?:\/Users\/|\/home\/|(?:^|[\s"'(])[A-Za-z]:\\[A-Za-z0-9])/, "absolute local path"],
  [/\b(?:another|sibling|external) (?:repository|source tree).{0,50}\b(?:canonical|ground truth|source of truth)\b/i, "external source of truth"],
  [/\b(?:canonical|ground truth|source of truth).{0,50}\b(?:another|sibling|external) (?:repository|source tree)\b/i, "external source of truth"],
]

export function inspectSelfContainedText(
  file: string,
  content: string,
  repoRoot: string,
) {
  const findings: SelfContainmentFinding[] = []
  for (const [index, line] of content.split(/\r?\n/).entries()) {
    for (const [pattern, message] of forbiddenText) {
      if (pattern.test(line)) findings.push({ file, line: index + 1, message })
    }
    if (
      line.includes("bun run sync-skills") &&
      /--(?:check|write)\b/.test(line) &&
      !line.includes("<target-repository>")
    ) {
      findings.push({ file, line: index + 1, message: "non-generic sync target" })
    }

    for (const match of line.matchAll(/\.\.\/[A-Za-z0-9._/-]+/g)) {
      const token = match[0].replace(/[),.;:]+$/g, "")
      const resolved = path.resolve(repoRoot, path.dirname(file), token)
      const relative = path.relative(repoRoot, resolved)
      if (relative.startsWith("..") || path.isAbsolute(relative)) {
        findings.push({ file, line: index + 1, message: "sibling checkout path" })
      }
    }
  }
  return findings
}

async function listRepositoryFiles(repoRoot: string) {
  const child = Bun.spawn(
    ["git", "ls-files", "--cached", "--others", "--exclude-standard"],
    { cwd: repoRoot, stdout: "pipe", stderr: "pipe" },
  )
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])
  if (exitCode !== 0) throw new Error(stderr.trim() || "git ls-files failed")
  return stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((file) => existsSync(path.join(repoRoot, file)))
    .filter((file) => !file.startsWith("plans/"))
    .filter((file) => file !== "scripts/check-self-contained.test.ts")
    .sort()
}

export async function checkSelfContained(repoRoot: string) {
  const findings: SelfContainmentFinding[] = []
  for (const file of await listRepositoryFiles(repoRoot)) {
    const content = await readFile(path.join(repoRoot, file), "utf8").catch(() => "")
    findings.push(...inspectSelfContainedText(file, content, repoRoot))
  }
  return findings.sort(
    (a, b) =>
      a.file.localeCompare(b.file) || a.line - b.line || a.message.localeCompare(b.message),
  )
}

if (import.meta.main) {
  const repoRoot = path.resolve(import.meta.dir, "..")
  const findings = await checkSelfContained(repoRoot)
  for (const finding of findings) {
    console.error(`${finding.file}:${finding.line}: ${finding.message}`)
  }
  if (findings.length > 0) process.exit(1)
  console.log("Checked repository self-containment.")
}
