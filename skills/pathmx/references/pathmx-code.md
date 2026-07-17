# PathMX Code

<!-- TODO: draft. Ground truth: pathmx repo — plugins/core/code-highlight/,
     plugin-backed-authoring reference (code focus steps). -->

Code fences: highlighting, fence flags, and authored reveal steps for Play.

## Syntax highlighting

<!-- TODO: standard fenced code with a language tag; highlighting is an opt-in
     plugin (`codeHighlight`) — check project config. -->

## Fence flags

<!-- TODO: `no-copy`, `no-select` in fence info; stripped before render. -->

## Code focus steps (Play)

<!-- TODO: reveal.js-style step spec after the language in fence info, e.g.
     ```js [1-2|3]. `|` separates steps; within a step, commas and `N-M`
     ranges light lines together. 1-based, inclusive. Each step needs ≥1 valid
     line; invalid specs warn. Steps become child `code-step` Beats. -->

## Play density

<!-- TODO: a plain fence is one Beat; `play.steps.code: none` removes fences
     from the route entirely. -->
