import { describe, expect, it } from "bun:test"

import { inspectSelfContainedText } from "./check-self-contained"

const root = "/workspace/project"

describe("self-containment checks", () => {
  it("rejects local absolute paths", () => {
    expect(inspectSelfContainedText("README.md", "Use /Users/name/source", root)).toHaveLength(1)
    expect(inspectSelfContainedText("README.md", "Use C:\\source\\repo", root)).toHaveLength(1)
  })

  it("rejects sibling checkout paths", () => {
    expect(
      inspectSelfContainedText("README.md", "Run the check in ../other-repo", root),
    ).toEqual([expect.objectContaining({ message: "sibling checkout path" })])
  })

  it("allows internal parent links", () => {
    expect(
      inspectSelfContainedText(
        "skills/learn/references/example.md",
        "[Skill](../SKILL.md)",
        root,
      ),
    ).toEqual([])
  })

  it("rejects external source-of-truth claims", () => {
    expect(
      inspectSelfContainedText(
        "AGENTS.md",
        "Another repository is the canonical source of truth.",
        root,
      ),
    ).toEqual([expect.objectContaining({ message: "external source of truth" })])
  })

  it("rejects a concrete sync target", () => {
    expect(
      inspectSelfContainedText(
        "README.md",
        "bun run sync-skills -- --write named-target",
        root,
      ),
    ).toEqual([expect.objectContaining({ message: "non-generic sync target" })])
  })

  it("allows generic targets and web URLs", () => {
    expect(
      inspectSelfContainedText(
        "README.md",
        "Sync <target-repository>. See https://pathmx.dev/docs.",
        root,
      ),
    ).toEqual([])
  })
})
