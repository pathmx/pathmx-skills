# PathMX Directives

<!-- TODO: draft. Ground truth: pathmx repo — plugins/core/{include,styles,
     resources,spaceholders}/, paths/demos/includes.demo.md. -->

`@`-prefixed directives written as ordinary markdown links and reference
definitions: includes, imports, resources, and spaceholders. The `@` prefix
marks a PathMX directive; without it, the same syntax is a normal link.

## Includes (transclusion)

<!-- TODO: the three forms —
     `[@include: Label](./shared.include.md)`,
     block targeting via `#block-id`,
     named reference form `[Label][@include.name]` + `[@include.name]: ./x.md`.
     Included content renders inline; its headings/paragraphs become Beats in
     the host Block. -->

## Imports

<!-- TODO: component imports `[@widgets]: ./widgets.components.md`;
     style imports `[@styles]: ./x.css`, `[@styles.print]:`, `[@root.styles]:`
     (see pathmx-styling.md for scope/cascade). -->

## Component resources

<!-- TODO: `[@script.*]`, `[@asset.*]`, `[@data.*]` declared in a component
     definition Block; surfaced via `ctx.assets` / `ctx.data`
     (see pathmx-literate-components.md). -->

## Spaceholders (generated content)

<!-- TODO: attached HTML-comment directive on an image or link, e.g. an image
     followed by an @spaceholder comment carrying `prompt="..."` and `ar=16:9`;
     explicit `@spaceholder.image` / `@spaceholder.pathmx` forms; pipeline
     composition with `|` (e.g. spaceholder piped to `@include` or
     `@image.background`). Keep prompts in the comment, labels human-readable.
     Nested comment examples can't live inside this TODO comment — show them
     in fenced code when drafting. -->
