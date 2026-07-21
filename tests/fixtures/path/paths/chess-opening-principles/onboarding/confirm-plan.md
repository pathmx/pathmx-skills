---
type: assessment
status: ready
roadmap:
  status: proposed
---

# Confirm your plan

The agent drafted this plan from your onboarding answers **and**
[Point A evidence](./point-a-evidence.md). Demo defaults below — replace with
evidence-based Point A before treating as final. Request changes with your
agent, or confirm to unlock Lesson 1.

Full outcome text: [path.outcome.md](../path.outcome.md).

---

<!--
id: draft-summary
-->

## Draft Point A *(must cite diagnostic evidence)*

**Based on your evidence** *(agent fills: mode + artifact/experience summary
and/or question pattern, e.g. “repo … + chose Nf3” or “questions only: unsure”)*:

You can move pieces legally and know check exists, but opening moves still feel
arbitrary. You cannot yet use **center**, **development**, and **king safety**
to choose between two sensible-looking moves.

*(If evidence showed stronger play, raise Point A and shorten Lesson 1. If
weaker, keep Lesson 1 at naming principles before move choice.)*

## Draft Point B

In a new game, you can play the first 8–10 moves by those three principles,
compare two candidate moves, reject one common early mistake, and explain your
plan without a long memorized line.

## Rubric (path)

- Name the three principles and what each looks like on the board
- Choose between two moves and justify with a principle
- Spot one early mistake (e.g. premature queen outing)
- Explain a short opening plan in plain language

## Proposed roadmap

1. **Lesson 1 — Control, development, and king safety** *(first)*  
   Destination: state the three principles; pick the better of two moves; justify.
2. **Later — Contested center** — when to push vs develop *(title only)*
3. **Later — Early mistakes** — queen raids and neglected development *(title only)*
4. **Later — Mini-game** — first 10 moves with a short postmortem *(title only)*

---

<!--
type: question
id: confirm-roadmap
actions:
  submit: questions.submitSingleChoice
-->

## Are you satisfied with this plan?

- Yes — confirm and start Lesson 1
- Not yet — I want changes before we continue

---

<!--
id: after-confirm
-->

## After you confirm

If you chose **Yes**, tell your agent (or continue this prototype) so they can
set `roadmap.status: confirmed` on this file, [path.outcome.md](../path.outcome.md),
and [index.path.md](../index.path.md), then open:

**→ [Lesson 1: Control, development, and king safety](../lessons/control-center-development/index.lesson.md)**

(Start with the lesson **shell** only in the live product; this prototype
includes all Stages for pacing.)

If you chose **Not yet**, list the change you want (narrower Point B, different
Later titles, more/less time). The agent revises only the draft outcome and
roadmap — no Lesson 1 teaching Blocks until you confirm.

### Agent note

Confirm is binary for the gate. “Yes” → `roadmap.status: confirmed` and unlock
Lesson 1. “Not yet” keeps `proposed`.
