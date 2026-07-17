---
name: pathmx
description: Author rich interactive curriculum repositiories using Paths Markdown eXtension
---


# PathMX

PathMX is a modern markdown-first framework for building learning-oriented websites.

What you can do with PathMX:

- Author rich, interactive learning sites entirely in markdown
- Build custom components and interactions
- Create personalized learning paths through linked content
- Ship production-ready sites that are portable, agent-friendly, and future-proof

PathMX is both a methodology and a development framework. The methodology can be used without special tooling on any operating system.

## Methodology


# PathMX Methodology

There are three core principles to the PathMX methodology:

## Principle 1: Markdown-first

Markdown is the lingua franca of modern human and agent interactions. It is a well-established, stable and portable format for authoring human-and-agent readable plain text documents with hyperlink support. PathMX-compatible markdown should support CommonMark and GFM flavoured markdown as well as more advanced PathMX-specific examples. In general PathMX markdown should be written to be human-readable and agent friendly.

See the [PathMX Markdown Guide](./references/pathmx-markdown.md) for more information on how write proper PathMX markdown.

## Principle 2: Explicit file types

Type hints allow you to indicate the role of a file in the name of the file. This pattern allows agents and humans to quickly intuit the purpose of a file without having to read the contents. This is especially important in modern agentic harnesses since agents naturally look at file paths to search for relevant patterns and context. PathMX files are type-hinted with an extension prefix e.g. `lesson-1.slides.md` or `week-1.lab.md` etc.

See the [Simple PathMX Repo Example](./references/repo-example/pathmx-repository.md#file-types) for an example of a PathMX repository with type hints and an ontology map file.

## Principle 3: Hyperlinked paths

Links between documents create a natural knowledge graph and allow for creating paths through it. A large knowledge graph may have many different paths depending on where the user is coming from or entering the space. PathMX repositories are organized by root entry points that create a graph-per-root for each link that is reachable fromt he root. This allows for multiple "views" of the same learning graph and serves as a natural permissions 
layer for who can see what. Most PathMX repos start with a single root, convetionally located in `paths/index.path.md`. 

See the [Simple PathMX Repo Example](./references/repo-example) for an example PathMX repository. Note that the desired structure and setup will depend on the use case and domain PathMX is being used to model.

---

# PathMX framework

The PathMX development framework handles building/bundling PathMX markdown source repositories into "playable" interactive web-based curriculum. The primary tool that handles the building/server is the `pathmx` cli tool. The PathMX CLI will create a local live server that watches the repository and incrementally builds and sends live updates to attached client players. 

# Setup and Installation

Make sure the user has the latest `bun` runtime installed on their system as pathmx currently relies on bun to run.

## 1. Install Or Update PathMX

If `pathmx` is not installed:

```sh
bun add -g @fellowhumans/pathmx@latest
```

If it is installed, update it through the supported CLI path:

```sh
pathmx self-update
```

Then record the exact version and inspect the current init help:

```sh
pathmx --version
pathmx init --help
```

--- 

# PathMX Authoring

PathMX should be written as simple, human readable common/GFM markdown with by default with extensions used where appropriate to the learning experience.

## Built in PathMX Capabilities

The most important different between PathMX and other markdown-based content authoring tools is that its primary use is to be "played" in a focused, direct learning sequence. 

Understanding how PahtMX content should be structured from a LX (learner eXperience) perspective is essential to authoring great PathMX experiences.

