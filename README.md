# PathMX Skills

Canonical agent instructions for authoring PathMX, personal learning, and
shared learning paths.

Give an agent [the bootstrap instructions](./bootstrap.md) to create a new
learning repository. After setup, repository instructions and these skills
carry the workflow:

| Skill | Use |
| --- | --- |
| `/pathmx` | Author, play, review, and verify PathMX. Invoked automatically for PathMX work. |
| `/learn` | Start or resume a buffered adaptive learning path for one learner. |
| `/teach` | Design, author, pilot, and review a reusable path for many learners. |

The `/pathmx` [library](./skills/pathmx/library/index.md) holds stable patterns,
templates, components, and fictional examples shared by `/learn` and `/teach`.
Reusable material is verified in place; diagnostic-only cases stay under
`tests/fixtures/`.

Skills install under `.agents/skills/`. Codex discovers that directory
directly. Claude Code uses the matching `.claude/skills` discovery link and a
small `CLAUDE.md` that imports `AGENTS.md`.

## Develop

Requires Bun. The repository pins a published PathMX version so every syntax
claim and fixture is reproducible. `package.json` names that exact compatibility
baseline. It is the safe fallback for latest-after-verification updates, not
the version of this skills repository.

```sh
bun install --frozen-lockfile
bun run check
```

## Sync

Check a target repository without writing:

```sh
bun run sync-skills -- --check <target-repository>
```

Apply the canonical packages:

```sh
bun run sync-skills -- --write <target-repository>
```

Write mode owns the packages declared in `skills/manifest.json`, names they
explicitly replace, and their Claude discovery links. It removes the retired
`/path` package while installing `/learn`, and leaves unrelated target content
and skills alone.

## Evals

The [eval harness](./evals/README.md) drives the real Codex CLI through a
multi-turn bootstrap and learning flow, grades the resulting repository, and
can add an independent structured model judge.

```sh
bun run eval:check
bun run eval -- list
bun run eval -- run sql-beginner
bun run eval -- run sql-beginner --profile instruction-floor
```

## Design history and contributors

Design briefs live under [work-log](./work-log/). They are reference notes, not
installed skill content.

The buffered adaptive learning loop grew from early hands-on testing by Tram Le
and Mark Johnson, which exposed the limits of Block-by-Block curriculum
generation. Tram also contributed the original math, media, code, tooling,
styling, and adaptive-path reference work that this repository continues to
build on.
