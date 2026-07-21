# PathMX Skills

This is the canonical, self-contained collection of PathMX agent skills.

| Skill | Use |
| --- | --- |
| `/pathmx` | PathMX syntax, tooling, authoring, review, Play, and verification. |
| `/path` | One opinionated, adaptive personal learning path. Uses `/pathmx` for authoring. |

## Develop

Requires Bun. Dependencies include a pinned PathMX CLI.

```sh
bun install --frozen-lockfile
bun run check
```

Examples and syntax claims must pass the local checks.

## Evals

Use [the agent rubric](./evals/pathmx-skills.rubric.md) to score task output and
verification evidence.

## Work log

Design briefs that informed `/path` live under [work-log/](./work-log/). They
are reference notes, not synced skill packages.

## Sync

Check a target without writing:

```sh
bun run sync-skills -- --check <target-repository>
```

Apply the canonical copies:

```sh
bun run sync-skills -- --write <target-repository>
```

Write mode manages only the skill packages declared in
`skills/manifest.json` and their Claude discovery links. It leaves unrelated
target content and skills alone. Edit canonical skill content here; a later
sync replaces edits made inside managed target copies.
