# Repository Instructions

This repository owns the canonical PathMX skills.

- `pathmx` owns PathMX authoring and tooling.
- `path` owns the personal learning workflow and uses `pathmx` for syntax.
- Keep all checked-in content self-contained. Do not depend on another checkout.
- Keep prose short and plain.
- Add only syntax supported by the pinned PathMX version and a local fixture.
- Add question syntax only when it passes the pinned fixture.
- Do not add general actions or spaceholders until they are ready for this skill.
- Test sync changes with temporary repositories, including check mode, conflicts,
  containment, and rollback.
- Run `bun run check` before handoff.
