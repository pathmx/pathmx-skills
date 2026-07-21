# Start a PathMX Learning Space

Follow these instructions as an agent. Carry out the setup instead of only
explaining it. Ask for permission when the environment requires it.

The result is one private, local Git repository where one learner can keep
multiple learning paths, use the PathMX Player, and return to an agent over
time.

## 1. Choose the location

Ask where the learner wants the repository and what to call it. Suggest a short
name such as `my-learning-space`. Do not replace or merge into an existing
directory.

## 2. Ensure Bun and PathMX are ready

Check `bun --version`. If Bun is missing, ask to install it with the official
installer for the learner's operating system:

```sh
# macOS or Linux
curl -fsSL https://bun.com/install | bash
```

```powershell
# Windows PowerShell
powershell -c "irm bun.sh/install.ps1|iex"
```

Open a fresh shell or update the current shell path when the installer asks.
Verify `bun --version` before continuing.

If `pathmx` already exists, update its native command:

```sh
pathmx self-update
```

Otherwise install the current native command through the latest published
package:

```sh
bunx @fellowhumans/pathmx@latest self-update
```

Verify `pathmx --version` and retain that version for the project comparison
below.

## 3. Create the learning repository

Create the chosen directory from the official starter. This command also
installs the current official `/learn` and `/pathmx` skills:

```sh
pathmx init <learning-space> --template pathmx-learning-starter
cd <learning-space>
bun install --frozen-lockfile
```

Read `AGENTS.md` and, when present, the instructions for the current agent
harness. Confirm that `.agents/skills/learn/SKILL.md` and
`.agents/skills/pathmx/SKILL.md` exist.

Shell tool calls may not preserve a prior `cd`. Run every following project
command from the new repository explicitly, either by setting its working
directory or by using `cd <learning-space> && ...`.

Initialize a fresh local history and make the scaffold commit. If Git identity
is not configured, explain that clearly and keep the staged scaffold as the
rollback point without inventing an identity.

```sh
git init
git add .
git commit -m "Create personal PathMX learning space"
```

Do not create or push a remote unless the learner asks. Treat the repository as
private personal data.

Compare the exact project dependency with the updated native `pathmx --version`.
When they already match, do not reinstall the same package; run `bun run check`
once and continue. When they differ, attempt to bring the project dependency
to the latest release:

```sh
bun add --exact @fellowhumans/pathmx@latest
bun run check:candidate
```

Keep and commit that update only if the full build succeeds and the Player
tutorial, questions, annotations, and bundled component behavior pass a smoke
test. Then set `pathmxCompatibility.baseline` in `package.json` to the exact
installed dependency and run `bun run check` before committing. If verification
fails, run `git restore package.json bun.lock` to recover those files from the
scaffold commit or staged baseline, run `bun install --frozen-lockfile`, and
continue on that verified baseline. Report the incompatibility; do not rewrite
learner content to make an update pass.

## 4. Start the Player

Run the repository's Player command in a long-lived terminal. Reuse a healthy
Player that already belongs to this repository; do not stop an unknown server.

```sh
bun run play
```

Use `bunx pathmx route` and the server's printed base URL to resolve the exact
Source route with the project dependency. Prefer the most useful Source, Block,
or Beat position instead of linking only to the home page.

When an integrated browser is available, open and review the Player there. In
Codex, prefer `@Browser`; in Claude Code, use its Chrome integration when it is
already configured. Otherwise open the system browser. If no browser can be
opened, give the learner a clickable URL.

Open the bundled Player tutorial for a first-time learner. They may skip it.

## 5. Begin learning

Use `/learn` implicitly. Ask a few questions at a time about:

- what the learner wants to be able to do and why;
- what they already know, with one small piece of evidence;
- their available time and preferred pace;
- the visual mood, color direction, light or dark preference, and any
  readability or motion needs.

Confirm the learner's profile, milestone map, and first module before teaching.
When showing the proposed map, first write and link a proposed Path Source with
3–7 visibly statused milestones and evidence targets. Give its exact Player
URL, but do not create session, review, or checkpoint Sources yet. Wait for
explicit confirmation, then fully prepare the current module so the learner
can complete each session without waiting for another agent turn. Before
handoff, verify the embedded help and give an exact Player URL with brief
Play-mode and return instructions.
