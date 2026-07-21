# Candidate learning-space smoke evals — 2026-07-21

These results use the real resumable Codex CLI with the candidate learning
starter. They are development evidence, not a published-template release gate.
Raw workspaces were written under the operating system's temporary
`pathmx-evals` directory.

## Outcome

The four representative `desktop-power` smoke scenarios passed their critical
and deterministic checks. A weaker-model loop then exposed three instruction
defects: premature module authoring, a chat-only map, and accidental
registration of nested learner Paths as extra Player roots. Each finding
produced a checked instruction, fixture, starter guardrail, or phase contract.

After those changes, the ambiguous-goal scenario passed at 100% deterministic
and 100% independent-judge quality on `desktop-fast`. The complete flow took
6m56s; its slowest turn was the 3m22s module build. The learner saw the first
visible update in 4–13 seconds on every turn. One 1m54s silent gap remains an
experience warning.

The corrected return-and-adapt scenario also passed at 100% deterministic and
100% independent-judge quality on `desktop-fast`. Its two complete modules,
map-first boundary, checkpoint record, open learner feedback, and exact
next-session route all passed. The five-turn flow took 10m07s with no
individual turn over five minutes.

## Representative runs

| Profile | Scenario | Result | Total time | Main evidence |
| --- | --- | --- | --- | --- |
| `desktop-power` | SQL beginner | 100% deterministic, critical pass | 8m55s | Buffered module and exact route passed. |
| `desktop-power` | Ambiguous AI goal | 100% deterministic and judge, critical pass | 18m55s | Quality passed, but the final turn took 12m43s. |
| `desktop-power` | Offline guitar | 100% deterministic, critical pass | 10m51s | Non-screen practice constraints survived the flow. |
| `desktop-power` | Return with confusion | 100% deterministic and judge, critical pass | 13m46s | Completed work and reported annotation were preserved honestly. |
| `instruction-floor` | Ambiguous AI goal, initial | 90.9% combined, critical pass | 5m10s | Authored the module before map confirmation and under-supplied help. |
| `instruction-floor` | Ambiguous AI goal, map-only revision | 86.5% deterministic, critical pass | 5m29s | Avoided the module, but left the proposed map only in chat. |
| `instruction-floor` | Ambiguous AI goal, persisted-map revision | 59% capped, critical fail | 13m56s | Map phase passed; module turn added an invalid extra Player root and lacked support. |
| `desktop-fast` | Ambiguous AI goal, current candidate | 100% deterministic and judge, critical pass | 6m56s | Map and module phase contracts passed. |
| `desktop-fast` | Return with confusion, current candidate | 100% deterministic and judge, critical pass | 10m07s | Three phase contracts passed; completed work and open feedback were preserved. |

The repeated floor failures are retained because they show the
self-improvement loop working; they are not results from the final candidate.

## Changes driven by eval evidence

- Map-first requests now persist and link a proposed Path with statused
  milestones before confirmation, while session and checkpoint Sources remain
  absent.
- The skill pack ships Path and two-session module scaffolds so agents start
  from useful artifacts instead of blank files.
- The learning starter keeps one configured Player root. Nested learner Paths
  are linked from home and the starter check rejects extra config roots.
- Multiple-root Source handle syntax is documented as `@name` and verified by
  a live Player-start fixture.
- The starter check rejects modules without 2–4 sessions, review, checkpoint,
  examples, hints, smaller attempts, self-check or rationale, and stretch work.
- Exact-route guidance now forbids ambiguous basename queries and broad
  recursive searches of generated `.pathmx` caches.
- Eval phase contracts catch work authored too early. Reports separately track
  total duration, first visible update, update count, longest silence, and
  five-minute turns.
- Bootstrap compares the updated native version with the exact project
  dependency before reinstalling and makes the project working directory
  explicit for every shell call.

## Remaining release work

- Repeat final-candidate scenarios to measure variance; the current post-fix
  fast-model result is one run.
- Run the published-template lane after the starter and skills are released.
- Keep the manual Codex Desktop Player review because the CLI does not reproduce
  the integrated Browser or permission UI exactly.
- Treat silent gaps over one minute as an experience warning even when quality
  passes. The buffered module prevents that delay from interrupting ordinary
  learner progress after handoff, but initial authoring latency still matters.
