# Next Steps

Working notes for resuming the skills work. Delete items as they land.

## 1. Draft `pathmx-player.md` (priority)

Still a TODO skeleton, but it's the guided-player UX doc — a core goal — and
is linked from SKILL.md, pathmx-markdown.md, and pathmx-code.md. Ground truth:
pathmx repo `paths/docs/play-authoring.design.md`,
`paths/docs/specs/pathmx-play-mode.spec.md`, and
`packages/build/src/plugins/core/choreographer/`. Match the house style:
quick-reference table, rendered/playable examples, verification section.

## 2. Finish `pathmx-markdown.md`

- Draft the **Links** section (currently a TODO outline): one syntax, three
  roles — inline links = graph edges, asset links = build deps, `@`-labeled
  reference definitions = directives. Link it from SKILL.md Principle 3.
- Fill or remove the empty **Index Files** heading.

## 3. Remaining stub references

- `pathmx-directives.md` — includes, imports, resources.
- `pathmx-questions.md` — question blocks, types, tasks, responses.
- `pathmx-config.md` — config files, roots, plugins.
- Repo example — SKILL.md links to a `#file-types` anchor in
  `references/pathmx-repo-example/pathmx-repository.md` that doesn't exist yet.

## 4. Small consistency fixes

- SKILL.md terminology table: topmatter row says "HTML comment"; bare-YAML
  topmatter is build-verified to work too — say both, note comment form is
  preferred in the pathmx repo.

## 5. Parked decisions

- **Spaceholders** — deliberately excluded while the design is in flux; the
  exclusion note lives in `pathmx-directives.md`. Reintroduce there (plus one
  SKILL.md terminology row and two link-text tweaks) when the design lands.
- **Progress-checking automation / scheduled check-ins** — open TODO comment
  in `skills/learn/SKILL.md`.
- **Starter template extras** — `scripts/` folder and automation prompts/loops
  (from the old starter AGENTS.md notes); decide whether they belong in
  pathmx-learning-starter or the CLI.
- **Seeding via `pathmx init`** — the starter's scaffolding (welcome path,
  components, theme) could eventually graduate into CLI init templates.

## Reminders

- Sync after skill changes: `bun run sync-skills ../pathmx-learning-starter`
  (starter's `paths/` is user-owned; only `.agents/skills/` gets overwritten).
- Verify any reference doc with
  `pathmx build <doc> -o .pathmx-check --clean` and review warnings.
