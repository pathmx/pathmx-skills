# Subagent learner-loop candidate eval — 2026-07-21

This paired candidate run tested whether the `/learn` skill's bounded worker
lane reduces learner waiting during the first confirmed-module build. It used
Codex CLI 0.145.0, the `desktop-fast` profile (`gpt-5.6-sol`, low reasoning),
the local Learning Starter at PathMX 0.1.24, and deterministic grading. No
independent judge ran because the comparison target was the subject turn.

## Outcome

Subagents did not reduce wall-clock time for the first module. They did reduce
the longest silent interval, but coordination cost outweighed parallel draft
work in this small three-session module.

| Lane | Workers | Module turn | Longest module silence | Total flow | Quality |
| --- | ---: | ---: | ---: | ---: | ---: |
| Collaboration disabled | 0 | 3m04s | 1m43s | 6m00s | 100% checks |
| Required, optional skill wording | 0 | 4m08s | 1m51s | 7m52s | 100% content checks; required-worker fail |
| Required, explicit two-worker wording | 2 Sol/low | 4m35s | 1m05s | 7m28s | 100% checks |
| Required, one-join wording | 2 Sol/low | 4m24s | 1m10s | 7m55s | 100% checks |

The optional wording was too weak for the lower-reasoning subject. After the
skill explicitly required two bounded workers, Codex delegated Session 2 and
Session 3 only after map confirmation. The parent retained Session 1, shared
state, integration, verification, and learner handoff. No collaboration errors
or phase-contract failures occurred.

## Harness changes

- `--collaboration off` provides the single-agent control.
- `--collaboration required` adds a critical proof that real child threads
  started without collaboration errors.
- Reports read worker thread IDs and models from Codex's persisted rollout,
  because `codex exec --json` currently emits wait activity but omits spawn
  records.
- The skill now treats two direct workers as the default only when a confirmed
  module has two independent later outputs and keeps a single fixed join point.
- The learner contract no longer assumes that a named worker changes models.

Two direct probes covered both a natural-language Terra request and a
project-scoped `learning-worker` configured for Terra/low. In both cases Codex
accepted the delegation but launched a Sol/low child. The Starter therefore
does not ship that misleading project worker configuration.

## Recommendation

Do not add more subagents to the initial module. The buffered module remains
the primary learner-speed strategy: useful updates arrive in seconds and the
learner receives a complete runway at handoff.

After PathMX 0.1.25 is published, run two focused validations:

1. one hosted-bootstrap `desktop-power` release smoke for quality and setup;
2. one larger later-module or return flow comparing the same-model worker lane
   with collaboration disabled.

Use repeated pairs before claiming a speed improvement. One candidate pair is
enough to reject the current first-module hypothesis, not to estimate a stable
latency effect.
