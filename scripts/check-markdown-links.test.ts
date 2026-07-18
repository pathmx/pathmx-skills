import { afterEach, describe, expect, it } from "bun:test"
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import { checkMarkdownFile } from "./check-markdown-links"

const fixtures: string[] = []

afterEach(async () => {
  await Promise.all(
    fixtures.splice(0).map((fixture) => rm(fixture, { recursive: true, force: true })),
  )
})

async function check(markdown: string) {
  const root = await mkdtemp(path.join(os.tmpdir(), "pathmx-links-"))
  fixtures.push(root)
  await mkdir(path.join(root, "docs"))
  await writeFile(path.join(root, "docs", "target.md"), "# Target Heading\n")
  const source = path.join(root, "source.md")
  await writeFile(source, markdown)
  return checkMarkdownFile(source, root)
}

describe("Markdown links", () => {
  it("accepts valid files, directories, anchors, and query strings", async () => {
    expect(
      await check(
        "[file](./docs/target.md) [dir](./docs) [anchor](./docs/target.md?view=1#target-heading)\n",
      ),
    ).toEqual([])
  })

  it("reports missing files", async () => {
    expect(await check("[missing](./nope.md)\n")).toMatchObject([
      { line: 1, target: "./nope.md", reason: "missing target" },
    ])
  })

  it("reports missing anchors", async () => {
    expect(await check("[missing](./docs/target.md#nope)\n")).toMatchObject([
      { line: 1, reason: "missing anchor" },
    ])
  })

  it("accepts same-file anchors", async () => {
    expect(await check("# Here\n\n[go](#here)\n")).toEqual([])
  })

  it("ignores links in fences, inline code, and comments", async () => {
    expect(
      await check(
        "```md\n[no](./missing-a.md)\n```\n`[no](./missing-b.md)`\n<!-- [no](./missing-c.md) -->\n",
      ),
    ).toEqual([])
  })

  it("checks reference definitions", async () => {
    expect(await check("[label][ref]\n\n[ref]: ./missing.md\n")).toMatchObject([
      { line: 3, target: "./missing.md" },
    ])
  })
})
