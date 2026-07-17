# PathMX Markdown

PathMX supports full CommonMark and GFM out-of-the box. It also supports several unique extensions that should be used where approprate.

The overall goal when creating PathMX markdown is that it should serve as a human and agent readable canonical source for the topic being covered. It should render in most markdown tools like Obsidian or in browse mode on Github with more advanced/interactive interactions authored using html/css and PathMX "literate components" (see below).

## Core Concepts

### Blocks

PathMX processes markdown files into Sources + Blocks. Every source has at least one block and may add additional blocks by using the `---` thematic greak syntax. This creates a modular/playable experience through an instructional document so the user can play it in a focused way in the [pathmx player](./pathmx-player.md).


#### Beats

Beats are a single focusable unit of content within a Bliock. Like a step in a slide, bullet in a list, or a paragraph in a document.

PathMX automatically choreagraphs normal markdown into the following beats:

<!-- TODO: pathmx beat behavior -->


### Root Sources

Root sources are entry points into a knowledge graph that PathMX usees to project a build for a player.


### Index Files


---

# Specific Extensions/Pluging

- [Math](./pathmx-math.md)


