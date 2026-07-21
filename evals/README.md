# PathMX learning-space evals

These evals exercise the same entry point given to a learner: `bootstrap.md`.
The subject is a real resumable Codex CLI session. It sees only the bootstrap,
the learner's messages, and the repository it creates. Deterministic checks and
an optional independent judge score the result afterward.

The latest checked summaries are the
[hosted PathMX 0.1.25 release smoke](./results/release-smoke-0.1.25-2026-07-21.md),
the [candidate smoke](./results/candidate-smoke-2026-07-21.md), and the paired
[subagent candidate](./results/subagent-candidate-2026-07-21.md).

Run workspaces live outside this repository by default so the subject cannot
read hidden scenarios or inherit this repository's `AGENTS.md`.

## Operator prerequisites

Before a model-backed run:

1. Install dependencies with `bun install --frozen-lockfile`.
2. Confirm `bun --version`, `codex --version`, and `bunx pathmx --version`.
3. Sign in to the Codex CLI. For a release gate, use a dedicated, already
   authenticated Codex home with no personal skills or configuration.
4. Keep network access available for Codex, package installation, the hosted
   bootstrap, and the public Starter.
5. Allow temporary disk space for transcripts, repository snapshots, build
   output, and reports. Never use a directory containing personal work as an
   eval subject or artifact directory.

A single subject run commonly takes 5–20 minutes. Power, hosted-bootstrap, and
judge runs can take longer. Repeated runs and an independent judge use
additional model quota. Start with `check`, `list`, or `plan`; none of those
commands calls a model.

## Quick start

Validate the suite without calling a model:

```sh
bun run eval:check
bun run eval -- list
bun run eval -- plan sql-beginner
```

Run one subject session using the Codex Desktop-like default profile and
deterministic grading:

```sh
bun run eval -- run sql-beginner
```

Run the deliberately weaker instruction floor:

```sh
bun run eval -- run sql-beginner \
  --profile instruction-floor
```

Add the independent model judge:

```sh
bun run eval -- run sql-beginner --judge
```

Use `--runs 3` to measure variance. Use `--artifacts <directory>` to retain
runs in a chosen location. The default is the operating system's temporary
directory under `pathmx-evals/`.

## Which eval should I run?

Use the smallest lane that can detect the risk introduced by the change.

| Change | Minimum verification | Add a model run when… |
| --- | --- | --- |
| CSS tokens, spacing, or typography only | Starter checks plus light/dark, narrow, keyboard, and Play review | Build time, Source structure, or learner-visible content changes materially |
| Presentational Literate Component | Starter checks and manual Browse/Play review | It adds ordered states, interaction, persistence, or a new learner activity |
| Interactive component, route, or Player behavior | Starter candidate checks plus one candidate scenario and manual Desktop review | Always; choose the scenario that exercises the changed surface |
| Starter files, templates, `AGENTS.md`, or `/learn` instructions | `instruction-floor` candidate run | Add `desktop-power` before publishing when the learner contract changes |
| `bootstrap.md`, installation, or version migration | Local run, then hosted `desktop-power` after publishing | Always |
| Eval harness, scenario, rubric, or profile | `eval:check`, tests, and one smoke whose expected result is already understood | Add more lanes only when the harness change affects them |
| Subagent instructions | Paired `desktop-fast` runs with collaboration `off` and `required` | Repeat each lane at least twice before making a speed claim |
| Release claim | Hosted `desktop-power`, selected judge run, and manual Codex Desktop flow | Use three runs for a release-rate or latency claim |

Cosmetic Starter changes do not invalidate earlier instructional results. Label
those results with the Starter commit they used, run repository and visual
checks, and reserve a model rerun for interaction, structure, performance, or
learner-contract changes.

## Canonical run recipes

Test the current skills checkout with the published Starter:

```sh
bun run eval -- run sql-beginner \
  --profile instruction-floor \
  --artifacts ./eval-artifacts/local-floor
```

Test an unpublished Starter checkout explicitly:

```sh
bun run eval -- run sql-beginner \
  --candidate-starter /absolute/path/to/pathmx-learning-starter \
  --profile instruction-floor \
  --artifacts ./eval-artifacts/starter-candidate
```

Test the public learner entry after publishing:

```sh
bun run eval -- run sql-beginner \
  --bootstrap-url https://raw.githubusercontent.com/pathmx/pathmx-skills/main/bootstrap.md \
  --profile desktop-power \
  --artifacts ./eval-artifacts/hosted-release
```

Add an independent judge only after the subject lane is otherwise healthy:

```sh
bun run eval -- run ambiguous-ai-goal \
  --profile desktop-power \
  --judge \
  --artifacts ./eval-artifacts/judged
```

Use an artifact directory outside the repository for release evidence when
possible. If `./eval-artifacts` is used for a short local investigation, do not
commit raw transcripts or learner repositories without reviewing them first.

To measure the learning skill's subagent lane, run the same scenario as a
paired control and candidate:

```sh
bun run eval -- run sql-beginner --profile desktop-fast --collaboration off
bun run eval -- run sql-beginner --profile desktop-fast --collaboration required
```

`required` adds a critical check that at least one direct worker was actually
spawned without a collaboration error. `off` disables Codex's stable
`multi_agent` feature for the control. Compare the module turn—not only the
whole setup—across duration, first visible update, longest silence, structural
quality, and judge score. Run each lane more than once before attributing a
speed change to delegation rather than model variance.

For release-gating runs, point `--codex-home` at a dedicated, already
authenticated Codex home containing no personal skills or configuration. The
runner also ignores config and rules and disables plugins. It does not copy or
manage authentication files. Without this option, the CLI uses the caller's
normal authentication and may still discover global instruction surfaces that
live outside `config.toml`.

Do not copy authentication files into an artifact directory or commit them.
The harness accepts an existing Codex home; it does not create, sanitize, or
authenticate one.

## What a run contains

Each run retains:

- the exact scenario and CLI configuration;
- one JSONL event stream and final message per learner turn;
- file inventories, Git state, and a structural grade captured after each turn;
- deterministic checks and command output;
- observed subagent spawn, worker, wait, and collaboration-error counts;
- a structured judge result when requested;
- `report.json` and a concise `report.md`.

Reports show learner wait time per turn and for the full run. They also measure
time to the first learner-visible agent update, update count, and the longest
silent gap. A turn over five minutes or silent gap over one minute is an
experience warning, not a quality-score penalty: model latency, visible
progress, and curriculum correctness are separate release signals.

The rubric is never copied into the subject workspace. Fictional learner
profiles must not contain real personal information.

## Read the result

The command prints the run directory followed by the final `report.md` and
batch report paths. Review them in this order:

1. **Critical checks.** A critical failure is a release failure even when the
   percentage looks high. It caps the combined score at 59%.
2. **Deterministic evidence.** Confirm the expected repository, version,
   phase, module, route, and check evidence rather than reading only the score.
3. **Learner wait-time signal.** A turn over five minutes or silent gap over
   one minute is `attention`, not a quality failure. Record both signals.
4. **Subagent orchestration.** Verify real worker thread IDs, models, errors,
   phase, and ownership. A spawn count alone is not a speed improvement.
5. **Judge evidence.** Require cited transcript turns or repository files;
   never use a judge score to excuse a critical deterministic failure.

Useful files inside one run:

| Path | Use |
| --- | --- |
| `report.md` | Human-readable quality, latency, collaboration, and judge summary |
| `report.json` | Machine-readable result for comparisons or charts |
| `run.json` and `scenario.json` | Exact runtime and learner scenario contract |
| `turns/*/events.jsonl` | Visible Codex events and progress updates |
| `turns/*/process.json` and `stderr.log` | CLI exit, timeout, and diagnostic evidence |
| `turns/*/snapshot/` | Repository state captured at that phase |
| `subject/learning-space/` | Final generated learning repository |
| `batch-report.md` | Pass rate, median, worst score, and latency across repetitions |

The harness exits nonzero for runner, validation, timeout, or command failures.
A completed eval with failed critical checks can still exit normally because
the failed evaluation is valid output; inspect `report.md` or `report.json`
instead of treating exit code zero as a passing learner flow.

## Model profiles

The machine-readable profiles in `profiles.json` keep model roles separate:

- `desktop-power` is the primary experience lane. It currently uses the Codex
  Desktop app's documented default Power setting: `gpt-5.6-sol` with medium
  reasoning.
- `desktop-fast` approximates moving that Desktop setting toward Faster by
  retaining `gpt-5.6-sol` with low reasoning.
- `instruction-floor` uses `gpt-5.4-mini` with low reasoning to expose weak or
  overly implicit instructions.
- `judge-quality` uses `gpt-5.6-sol` with high reasoning only for independent
  qualitative scoring.

Use `--model` or `--reasoning` only for an intentional one-off override; the
selected profile and effective overrides are recorded in every run. Review the
profile catalog whenever Codex changes its documented default. The current
default is documented in the [Codex model
guide](https://learn.chatgpt.com/docs/models).

## Lanes

The default `local` bootstrap lane copies this checkout's `bootstrap.md` into
an otherwise empty subject repository. It tests the instructions under review
while still using the real package and template installation flow.

Before a starter release, stage a local candidate while retaining the rest of
the real bootstrap flow:

```sh
bun run eval -- run sql-beginner \
  --candidate-starter <path-to-starter-checkout> \
  --profile instruction-floor
```

The runner copies the candidate into the isolated subject root without its
Git history, dependencies, or build output. The subject is told to use that
copy in place of the published `pathmx init` template. This candidate lane is
not the release gate: rerun without `--candidate-starter` after publication to
test the exact learner installation path.

A scenario may use a hosted bootstrap URL instead. Hosted runs test URL access
and the published installation path, so they are slower and more sensitive to
network and registry failures.

Codex runs with `workspace-write`, approval policy `never`, and network access
enabled because bootstrap must install packages and the starter. Never point an
eval at a directory containing personal work. Use an externally isolated
runner before considering broader sandbox permissions.

A truly fresh-machine lane may need to update global tooling outside the
workspace. Run that only inside an externally isolated VM or container and opt
in with `--sandbox danger-full-access`. A permission failure in the default
lane remains visible in the transcript instead of silently broadening access.

## Scoring

Deterministic checks are hard evidence: repository creation, local Git safety,
installed skills, version policy, PathMX verification, durable learner state,
and buffered-module structure. A failed critical check caps the result.

The optional judge scores qualities such as clarity, coherent progress,
nontechnical language, immediate learning support, and proportional adaptation.
It must cite transcript turns or repository files for every score. The subject
model never sees these criteria.

Run each release-gating scenario at least three times. Compare critical-pass
rate, median score, worst score, median total model time, the slowest turn, and
silent-gap warnings rather than relying on one average.

## Codex App coverage

The CLI covers instruction discovery, skills, filesystem behavior, commands,
and resumable conversations. It does not reproduce the Codex App's integrated
Browser or permission UI exactly. Keep a small manual App smoke pass for Player
appearance, exact-route opening, and browser fallback until those surfaces have
a stable automation interface.

The default `workspace-write` lane may block global `pathmx self-update` and
Player state under `~/.pathmx`. That is useful permission evidence, but it is
not a substitute for the manual Desktop run. The manual flow should record:

- permission language and whether approval feels proportionate;
- successful Player startup and ownership of the active server;
- the exact route opened in the integrated Browser;
- light/dark, narrow, keyboard, and Play behavior;
- first useful update, longest silent gap, and uninterrupted module runway.

Use the Build Week repository's
[`self-learning-manual-test.guide.md`](https://github.com/pathmx/pathmx-build-week-2026/blob/main/paths/guides/self-learning-manual-test.guide.md)
for that human protocol.

The runner uses the documented [Codex non-interactive
mode](https://learn.chatgpt.com/docs/non-interactive-mode) and [`codex
exec`](https://learn.chatgpt.com/docs/developer-commands?surface=cli#cli-codex-exec)
session-resume and JSONL interfaces.
