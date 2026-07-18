---
type: pathmx/rubric
status: active
---

# PathMX Skills Agent Rubric

Score observable work and verification evidence. Do not infer hidden work.

## Scoring

Score each applicable row:

- `0` — missing, wrong, or unsupported
- `1` — partly complete
- `2` — complete and supported by evidence

Mark a row `N/A` only when it does not apply. Calculate the percentage from
applicable points.

| Result | Score |
| --- | ---: |
| Meets | 90–100% |
| Mostly meets | 80–89% |
| Partial | 60–79% |
| Fails | Below 60% or any critical failure |

## Task profiles

| Task | Sections to score |
| --- | --- |
| Author or revise PathMX content | Core and PathMX |
| Review or diagnose PathMX content | Core and PathMX review |
| Work on components, styling, or Play | Core, PathMX, and experience |
| Author durable assessment questions | Core and PathMX |
| Start or resume a personal learning path | Core and personal path |
| Sync these skills into a target repository | Core and distribution |

## Critical failures

Any of these makes the result `Fails`:

- Invents PathMX syntax or uses syntax unsupported by the installed version.
- Authors general actions or spaceholders as supported features.
- Writes diagnostic build output into a live `.pathmx` directory.
- Claims a build or test passed without evidence.
- Makes the repository depend on another checkout or named consumer.
- Advances a personal path without assessment evidence and synthesis.
- Records unconfirmed or unnecessary sensitive learner data.

## Core

| Criterion | Score |
| --- | ---: |
| Reads the nearest instructions and stays within the task scope. | 0–2 |
| Uses local files, installed versions, and command output as evidence. | 0–2 |
| Keeps changes focused, plain, and readable. | 0–2 |
| Preserves unrelated work and existing repository conventions. | 0–2 |
| Reports changed files, verification, and any remaining gap. | 0–2 |

## PathMX

| Criterion | Score |
| --- | ---: |
| Inspects local config, scripts, PathMX version, entry Source, and nearby examples. | 0–2 |
| Identifies the Source role and audience before changing structure. | 0–2 |
| Starts with ordinary Markdown and uses Blocks or Beats only when they help. | 0–2 |
| Uses relative links and reuses local directives, components, and styles. | 0–2 |
| Keeps the Source useful as plain Markdown and uses source-facing `type`. | 0–2 |
| Builds into scratch output and checks warnings or errors. | 0–2 |

## PathMX review

| Criterion | Score |
| --- | ---: |
| Checks the installed version and relevant local examples before judging syntax. | 0–2 |
| Gives specific findings tied to files, output, or rendered behavior. | 0–2 |
| Separates defects from optional improvements and states impact. | 0–2 |
| Runs relevant read-only checks or explains why a check could not run. | 0–2 |

## Experience

| Criterion | Score |
| --- | ---: |
| Components and styles follow local contracts and preserve semantic HTML. | 0–2 |
| Play pacing uses Blocks and Beats intentionally. | 0–2 |
| The result is checked for keyboard use, narrow screens, and readable contrast. | 0–2 |
| Rendered or interactive behavior is reviewed when the task changes it. | 0–2 |

## Personal path

| Criterion | Score |
| --- | ---: |
| Uses one learner, one goal, and learner-confirmed context. | 0–2 |
| Establishes Point A, Point B, and a small evidence rubric for a new path. | 0–2 |
| Reads the latest activity, assessment, and synthesis before resuming a path. | 0–2 |
| Builds only the first or next lesson at the learner's proximal edge. | 0–2 |
| Records an observable `start`, `destination`, practice, retrieval, and feedback. | 0–2 |
| Uses a plain Markdown assessment and durable question responses, linked evidence, or both. | 0–2 |
| Gates progress on evidence and remediates gaps before advancing. | 0–2 |
| Records synthesis and logs explicit goal changes without rewriting history. | 0–2 |

## Distribution

| Criterion | Score |
| --- | ---: |
| Runs check mode before write mode. | 0–2 |
| Validates the target, containment, and conflicts before writing. | 0–2 |
| Updates only declared skill packages and managed discovery links. | 0–2 |
| Preserves unrelated target content and verifies rollback behavior. | 0–2 |

## Evaluator report

```text
Task profile:
Score:
Result:
Critical failures:
Evidence:
Gaps:
```
