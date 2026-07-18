#!/usr/bin/env bun

import { existsSync, statSync } from "node:fs"
import { readFile } from "node:fs/promises"
import path from "node:path"

export type LinkFinding = {
  file: string
  line: number
  target: string
  reason: "missing target" | "missing anchor"
}

type MarkdownLink = { line: number; target: string }

function maskIgnoredMarkdown(markdown: string) {
  const lines = markdown.split(/\r?\n/)
  let fence: "```" | "~~~" | null = null
  let inComment = false

  return lines.map((line) => {
    const fenceMatch = line.match(/^\s*(```|~~~)/)
    if (fenceMatch) {
      const marker = fenceMatch[1] as "```" | "~~~"
      if (!fence) fence = marker
      else if (fence === marker) fence = null
      return ""
    }
    if (fence) return ""

    let visible = ""
    let cursor = 0
    while (cursor < line.length) {
      if (inComment) {
        const end = line.indexOf("-->", cursor)
        if (end < 0) return visible
        cursor = end + 3
        inComment = false
        continue
      }
      const start = line.indexOf("<!--", cursor)
      if (start < 0) {
        visible += line.slice(cursor)
        break
      }
      visible += line.slice(cursor, start)
      cursor = start + 4
      inComment = true
    }

    return visible.replace(/`+[^`]*`+/g, "")
  })
}

export function extractMarkdownLinks(markdown: string): MarkdownLink[] {
  const links: MarkdownLink[] = []
  for (const [index, line] of maskIgnoredMarkdown(markdown).entries()) {
    for (const match of line.matchAll(/!?\[[^\]]*\]\((<[^>]+>|[^)]+)\)/g)) {
      let target = match[1]?.trim() ?? ""
      if (target.startsWith("<") && target.endsWith(">")) {
        target = target.slice(1, -1)
      } else {
        target = target.split(/\s+["']/)[0] ?? target
      }
      if (target) links.push({ line: index + 1, target })
    }

    const definition = line.match(/^\s*\[[^\]]+\]:\s*(<[^>]+>|\S+)/)
    if (definition?.[1]) {
      links.push({
        line: index + 1,
        target: definition[1].replace(/^<|>$/g, ""),
      })
    }
  }
  return links
}

export function githubHeadingSlugs(markdown: string) {
  const counts = new Map<string, number>()
  const slugs = new Set<string>()
  for (const line of maskIgnoredMarkdown(markdown)) {
    const match = line.match(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/)
    if (!match?.[1]) continue
    const base = match[1]
      .toLowerCase()
      .replace(/<[^>]*>/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[`*_~]/g, "")
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .trim()
      .replace(/\s+/g, "-")
    const count = counts.get(base) ?? 0
    counts.set(base, count + 1)
    slugs.add(count === 0 ? base : `${base}-${count}`)
  }
  return slugs
}

function isExternalTarget(target: string) {
  return /^(?:https?:|mailto:|data:)/i.test(target)
}

export async function checkMarkdownFile(
  filePath: string,
  repoRoot: string,
): Promise<LinkFinding[]> {
  const markdown = await readFile(filePath, "utf8")
  const findings: LinkFinding[] = []
  const absoluteRoot = path.resolve(repoRoot)

  for (const link of extractMarkdownLinks(markdown)) {
    if (isExternalTarget(link.target)) continue

    const hashIndex = link.target.indexOf("#")
    const beforeHash = hashIndex < 0 ? link.target : link.target.slice(0, hashIndex)
    const fragment = hashIndex < 0 ? "" : link.target.slice(hashIndex + 1)
    const targetPath = beforeHash.split("?", 1)[0] ?? ""
    let decodedPath = targetPath
    let decodedFragment = fragment
    try {
      decodedPath = decodeURIComponent(targetPath)
      decodedFragment = decodeURIComponent(fragment)
    } catch {
      // Missing-target output is clearer than a decoder exception.
    }

    const resolved = decodedPath
      ? path.resolve(path.dirname(filePath), decodedPath)
      : filePath
    const relative = path.relative(absoluteRoot, resolved)
    if (relative.startsWith("..") || path.isAbsolute(relative) || !existsSync(resolved)) {
      findings.push({
        file: path.relative(absoluteRoot, filePath),
        line: link.line,
        target: link.target,
        reason: "missing target",
      })
      continue
    }

    if (decodedFragment && statSync(resolved).isFile()) {
      const targetMarkdown = await readFile(resolved, "utf8")
      if (!githubHeadingSlugs(targetMarkdown).has(decodedFragment.toLowerCase())) {
        findings.push({
          file: path.relative(absoluteRoot, filePath),
          line: link.line,
          target: link.target,
          reason: "missing anchor",
        })
      }
    }
  }
  return findings
}

export async function listMarkdownFiles(repoRoot: string) {
  const child = Bun.spawn(
    ["git", "ls-files", "--cached", "--others", "--exclude-standard", "--", "*.md"],
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
    .sort()
    .map((file) => path.join(repoRoot, file))
}

export async function checkMarkdownLinks(repoRoot: string) {
  return (
    await Promise.all(
      (await listMarkdownFiles(repoRoot)).map((file) => checkMarkdownFile(file, repoRoot)),
    )
  )
    .flat()
    .sort(
      (a, b) =>
        a.file.localeCompare(b.file) ||
        a.line - b.line ||
        a.target.localeCompare(b.target),
    )
}

if (import.meta.main) {
  const repoRoot = path.resolve(import.meta.dir, "..")
  const files = await listMarkdownFiles(repoRoot)
  const findings = await checkMarkdownLinks(repoRoot)
  for (const finding of findings) {
    console.error(`${finding.file}:${finding.line}: ${finding.reason}: ${finding.target}`)
  }
  if (findings.length > 0) process.exit(1)
  console.log(`Checked Markdown links (${files.length} files).`)
}
