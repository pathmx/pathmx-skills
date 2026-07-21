#!/usr/bin/env bun

import { mkdtemp, readFile, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"

type PathManifest = {
  paths: Record<
    string,
    {
      entry: string
      entrySourceId: string
      outputPath: string
    }
  >
}

type SourceManifest = {
  sources: Record<string, { path: string; blocks: Array<{ id: string }> }>
}

type GraphIndex = {
  sources: Array<{
    id: string
    blocks: Array<{
      id: string
      props?: {
        question?: { type?: string }
        actions?: { submit?: string }
      }
    }>
  }>
}

type BuildResult = {
  outputDir: string
  paths: PathManifest
  stdout: string
  sourcePaths: Set<string>
}

const repoRoot = path.resolve(import.meta.dir, "..")
const pathmxBin = path.join(repoRoot, "node_modules", ".bin", "pathmx")

const referenceEntries = [
  "skills/pathmx/references/pathmx-markdown.md",
  "skills/pathmx/references/pathmx-player.md",
  "skills/pathmx/references/pathmx-directives.md",
  "skills/pathmx/references/pathmx-questions.md",
  "skills/pathmx/references/pathmx-annotations.md",
  "skills/pathmx/references/pathmx-literate-components.md",
  "skills/pathmx/references/pathmx-code.md",
  "skills/pathmx/references/pathmx-math.md",
  "skills/pathmx/references/pathmx-media.md",
  "skills/pathmx/references/pathmx-styling.md",
  "skills/pathmx/references/pathmx-config.md",
  "skills/pathmx/references/pathmx-tooling.md",
]

async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, "utf8")) as T
}

async function build(
  cwd: string,
  outputDir: string,
  entries: string[],
): Promise<BuildResult> {
  const child = Bun.spawn([pathmxBin, "build", ...entries, "-o", outputDir, "--clean"], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  })
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])
  const diagnostics = `${stdout}\n${stderr}`.trim()
  if (exitCode !== 0) throw new Error(diagnostics || `PathMX build failed (${exitCode})`)
  if (!/Built\s+[1-9]\d*\s+path/i.test(stdout)) {
    throw new Error(`PathMX did not report a built Path:\n${diagnostics}`)
  }
  if (/\b(?:warning|error):/i.test(diagnostics)) {
    throw new Error(`PathMX reported diagnostics:\n${diagnostics}`)
  }

  const paths = await readJson<PathManifest>(path.join(outputDir, "paths.json"))
  const sourcePaths = new Set<string>()
  for (const builtPath of Object.values(paths.paths)) {
    const sources = await readJson<SourceManifest>(
      path.join(outputDir, builtPath.outputPath, "sources.json"),
    )
    for (const source of Object.values(sources.sources)) sourcePaths.add(source.path)
  }

  return { outputDir, paths, stdout, sourcePaths }
}

function requireEntries(result: BuildResult, entries: string[]) {
  const builtEntries = new Set(Object.values(result.paths.paths).map((entry) => entry.entry))
  for (const entry of entries) {
    if (!builtEntries.has(entry)) throw new Error(`Missing Path entry: ${entry}`)
    if (!result.sourcePaths.has(entry)) throw new Error(`Missing built Source: ${entry}`)
  }
}

async function outputForEntry(result: BuildResult, entry: string) {
  const builtPath = Object.values(result.paths.paths).find((item) => item.entry === entry)
  if (!builtPath) throw new Error(`Missing output for ${entry}`)
  return path.join(result.outputDir, builtPath.outputPath)
}

async function requirePlayerStarts(cwd: string, outputDir: string) {
  const child = Bun.spawn(
    [pathmxBin, "play", "--print-url", "--port", "0", "-o", outputDir, "--clean"],
    { cwd, stdout: "pipe", stderr: "pipe" },
  )
  const reader = child.stdout.getReader()
  const decoder = new TextDecoder()
  const stderrPromise = new Response(child.stderr).text()
  let stdout = ""
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    child.kill()
  }, 10_000)
  try {
    while (!/https?:\/\/\S+/.test(stdout)) {
      const { done, value } = await reader.read()
      if (done) break
      stdout += decoder.decode(value, { stream: true })
    }
  } finally {
    clearTimeout(timer)
    child.kill("SIGINT")
  }
  const exitCode = await child.exited
  const stderr = await stderrPromise
  if (timedOut || !/https?:\/\/\S+/.test(stdout)) {
    throw new Error(
      `PathMX Player did not start for the multi-root handle fixture (${exitCode}):\n${stdout}\n${stderr}`,
    )
  }
}

export async function checkPathmxDocs() {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "pathmx-skills-check-"))
  const relativeTemp = path.relative(repoRoot, tempRoot)
  if (!relativeTemp.startsWith("..") || path.isAbsolute(relativeTemp)) {
    throw new Error("PathMX check output must be outside the repository")
  }

  try {
    const references = await build(repoRoot, path.join(tempRoot, "references"), referenceEntries)
    requireEntries(references, referenceEntries)

    const codeOutput = await outputForEntry(
      references,
      "skills/pathmx/references/pathmx-code.md",
    )
    const codeMap = await readFile(
      path.join(
        codeOutput,
        "source-maps",
        "skills%2Fpathmx%2Freferences%2Fpathmx-code.json",
      ),
      "utf8",
    )
    if (!/"type"\s*:\s*"code-step"/.test(codeMap)) {
      throw new Error("Code reference did not produce code-step Beats")
    }

    const componentOutput = await outputForEntry(
      references,
      "skills/pathmx/references/pathmx-literate-components.md",
    )
    const componentHtml = await readFile(
      path.join(
        componentOutput,
        "skills",
        "pathmx",
        "references",
        "pathmx-literate-components.html",
      ),
      "utf8",
    )
    if (!componentHtml.includes('class="flip-note"')) {
      throw new Error("Literate Component example did not expand")
    }

    const coreRoot = path.join(repoRoot, "tests", "fixtures", "pathmx", "core")
    const core = await build(coreRoot, path.join(tempRoot, "core"), ["index.path.md"])
    requireEntries(core, ["index.path.md"])
    for (const source of ["index.path.md", "shared.include.md", "widgets.components.md"]) {
      if (!core.sourcePaths.has(source)) throw new Error(`Core fixture missing ${source}`)
    }
    const coreOutput = await outputForEntry(core, "index.path.md")
    const coreHtml = await readFile(path.join(coreOutput, "index.path.html"), "utf8")
    if (!coreHtml.includes("This Block is included") || !coreHtml.includes("fixture-card")) {
      throw new Error("Core include or component fixture did not render")
    }

    const configRoot = path.join(repoRoot, "tests", "fixtures", "pathmx", "config")
    const config = await build(configRoot, path.join(tempRoot, "config"), [])
    requireEntries(config, ["index.path.md", "workshop.path.md"])
    await requirePlayerStarts(configRoot, path.join(tempRoot, "config-player"))

    const questionsRoot = path.join(repoRoot, "tests", "fixtures", "pathmx", "questions")
    const questions = await build(questionsRoot, path.join(tempRoot, "questions"), [
      "index.quiz.md",
    ])
    requireEntries(questions, ["index.quiz.md"])
    const questionsOutput = await outputForEntry(questions, "index.quiz.md")
    const questionsHtml = await readFile(
      path.join(questionsOutput, "index.quiz.html"),
      "utf8",
    )
    const questionsGraph = await readJson<GraphIndex>(
      path.join(questionsOutput, "graph-index.json"),
    )
    const questionSource = questionsGraph.sources.find(
      (source) => source.id === "index.quiz",
    )
    if (!questionSource) throw new Error("Question fixture missing graph Source")
    const expectedQuestions = [
      ["index.quiz#source-of-truth", "questions.submitSingleChoice", undefined],
      ["index.quiz#define-beat", "questions.submitText", "short"],
      ["index.quiz#explain-navigation", "questions.submitText", "long"],
      ["index.quiz#study-plan", "questions.submitFields", "fields"],
    ] as const
    for (const [id, action, type] of expectedQuestions) {
      const block = questionSource.blocks.find((candidate) => candidate.id === id)
      if (block?.props?.actions?.submit !== action || (type && block.props.question?.type !== type)) {
        throw new Error(`Question fixture missing graph contract: ${id}`)
      }
    }
    for (const expected of ["@response.field id=minutes", "@response.field id=topic"]) {
      if (!questionsHtml.includes(expected)) {
        throw new Error(`Question fixture missing authored field: ${expected}`)
      }
    }

    const annotationsRoot = path.join(
      repoRoot,
      "tests",
      "fixtures",
      "pathmx",
      "annotations",
    )
    const annotations = await build(
      annotationsRoot,
      path.join(tempRoot, "annotations"),
      ["index.path.md"],
    )
    requireEntries(annotations, ["index.path.md"])
    const annotationsOutput = await outputForEntry(annotations, "index.path.md")
    const annotationsHtml = await readFile(
      path.join(annotationsOutput, "index.path.html"),
      "utf8",
    )
    for (const expected of [
      'data-pathmx-annotation-thread="c1"',
      'data-pathmx-annotation-status="resolved"',
      'data-pathmx-annotation-text="c2"',
    ]) {
      if (!annotationsHtml.includes(expected)) {
        throw new Error(`Annotation fixture missing rendered evidence: ${expected}`)
      }
    }

    const exampleRoot = path.join(
      repoRoot,
      "skills",
      "pathmx",
      "references",
      "pathmx-repo-example",
    )
    const example = await build(exampleRoot, path.join(tempRoot, "repo-example"), [
      "paths/index.path.md",
    ])
    requireEntries(example, ["index.path.md"])
    for (const source of [
      "index.path.md",
      "lessons/code-with-agents.lesson.md",
    ]) {
      if (!example.sourcePaths.has(source)) throw new Error(`Repo example missing ${source}`)
    }

    const pathRoot = path.join(repoRoot, "tests", "fixtures", "path")
    const personalPath = await build(pathRoot, path.join(tempRoot, "path"), [
      "paths/sql-foundations/index.path.md",
    ])
    requireEntries(personalPath, ["sql-foundations/index.path.md"])
    const expectedPathSources = [
      "sql-foundations/index.path.md",
      "sql-foundations/path.outcome.md",
      "sql-foundations/modules/01-combine-tables/index.path.md",
      "sql-foundations/modules/01-combine-tables/01-rows-that-survive.lesson.md",
      "sql-foundations/modules/01-combine-tables/02-choose-the-join.lesson.md",
      "sql-foundations/modules/01-combine-tables/review.practice.md",
      "sql-foundations/modules/01-combine-tables/milestone.assessment.md",
      "learner.profile.md",
      "learning.activity.md",
    ]
    for (const source of expectedPathSources) {
      if (!personalPath.sourcePaths.has(source)) {
        throw new Error(`Personal path fixture missing ${source}`)
      }
    }

    const personalOutput = await outputForEntry(
      personalPath,
      "sql-foundations/index.path.md",
    )
    const personalAssessmentHtml = await readFile(
      path.join(
        personalOutput,
        "sql-foundations",
        "modules",
        "01-combine-tables",
        "milestone.assessment.html",
      ),
      "utf8",
    )
    if (!personalAssessmentHtml.includes("Explain why the other join would drop rows")) {
      throw new Error("Personal path checkpoint missing authored prompt")
    }
    const personalGraph = await readJson<GraphIndex>(
      path.join(personalOutput, "graph-index.json"),
    )
    const assessmentSource = personalGraph.sources.find(
      (source) =>
        source.id ===
        "sql-foundations/modules/01-combine-tables/milestone.assessment",
    )
    const explanation = assessmentSource?.blocks.find(
      (block) => block.id.endsWith("#join-explanation"),
    )
    if (
      explanation?.props?.actions?.submit !== "questions.submitText" ||
      explanation.props.question?.type !== "long"
    ) {
      throw new Error("Personal path checkpoint missing question graph contract")
    }

    return {
      paths:
        Object.keys(references.paths.paths).length +
        Object.keys(core.paths.paths).length +
        Object.keys(config.paths.paths).length +
        Object.keys(questions.paths.paths).length +
        Object.keys(annotations.paths.paths).length +
        Object.keys(example.paths.paths).length +
        Object.keys(personalPath.paths.paths).length,
      sources: new Set([
        ...references.sourcePaths,
        ...core.sourcePaths,
        ...config.sourcePaths,
        ...questions.sourcePaths,
        ...annotations.sourcePaths,
        ...example.sourcePaths,
        ...personalPath.sourcePaths,
      ]).size,
    }
  } finally {
    await rm(tempRoot, { recursive: true, force: true })
  }
}

if (import.meta.main) {
  const result = await checkPathmxDocs()
  console.log(`Verified ${result.paths} Path entries and ${result.sources} Sources.`)
}
