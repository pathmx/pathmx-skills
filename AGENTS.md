# Repository Instructions

This repository owns the canonical PathMX skills and the hosted bootstrap
instructions for a personal learning space.

- `bootstrap.md` gets a nontechnical learner from an agent prompt to a working
  learning repository.
- `pathmx` owns PathMX authoring, tooling, Player use, annotations, and review.
- `learn` owns the agent-led personal learning workflow and uses `pathmx` for
  authoring.
- `teach` owns reusable paths intended for multiple learners and uses `pathmx`
  for authoring.
- `pathmx/library/` owns stable reusable patterns, templates, components, and
  fictional examples shared by `learn` and `teach`.
- `work-log/` keeps design history. It is not installed as skill content.
- The public `pathmx-learning-starter` is a consumer, not a source of truth.

Keep checked-in content self-contained. Keep prose short and plain. Put core
procedure in `SKILL.md`; put detailed syntax and examples in references.

Add only syntax supported by the pinned PathMX version and a local fixture or
verified library item.
Treat Player interactions, annotations, questions, components, routes, and CLI
claims as version-sensitive. Verify them against fixtures or the installed CLI.
The exact dependency in `package.json` is the fixture baseline. Keep bootstrap
instructions pointed at latest, but update this baseline only after the complete
suite passes.

The learning workflow is buffered, not Block-at-a-time:

- map the whole path as visible milestones;
- fully author the current 2–4-session module;
- let a learner finish a session without waiting for an agent;
- adapt at useful session or module boundaries;
- keep annotations and durable evidence in Sources.

Keep learner fixtures and library examples fictional. Do not add real personal
or sensitive data.

Test sync changes with temporary repositories, including check mode, conflicts,
containment, and rollback. Run `bun run check` before handoff.
