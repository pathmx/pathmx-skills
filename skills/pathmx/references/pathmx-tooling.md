# PathMX Tooling & Verification

<!-- TODO: draft. Ground truth: pathmx repo — AGENTS.md (verification workflow),
     .agents/skills/pathmx-authoring/references/tooling-and-verification.md. -->

CLI commands and how to verify authored PathMX actually builds and plays.

## CLI

<!-- TODO: `pathmx init | build | dev | play`; live server watches the repo,
     incrementally builds, pushes updates to attached players. -->

## Verifying a change

<!-- TODO: build into a scratch dir, never the live `.pathmx` dir:

     pathmx build <entry-source> -o .pathmx-check --clean

     Success = clean exit, ≥1 built Path, source present in scratch
     `sources.json`. Inspect warnings (e.g. `choreographer/table-steps-invalid`,
     `icons-lucide/unknown-icon`). -->

## Graph-aware file operations

<!-- TODO: prefer `pathmx mv` / `pathmx rm` over raw `git mv` for linked
     markdown so relative links and `related:` fields are rewritten. -->
