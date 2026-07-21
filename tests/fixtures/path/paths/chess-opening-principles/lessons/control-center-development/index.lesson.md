---
type: lesson
status: active
start: Knows piece moves; opening choices feel arbitrary
destination: Can state three opening principles, pick the better of two moves, and justify with a principle
stage: lesson-frame
---

# Control, development, and king safety

<!-- Stage shell — in the live loop this is the only Block at Start Lesson -->

---

<!--
id: lesson-frame
-->

## This lesson

You will learn three opening principles and use them to choose between two
moves. In Play, advance one Beat at a time. In the live product, each **Stage**
below would be generated as its own agent turn after you continue or submit.

---

<!--
id: three-principles
-->

## Stage 1 — Three principles

In the opening, most good plans lean on three ideas:

- **Center** — fight for d4, d5, e4, and e5 so your pieces have room
- **Development** — bring knights and bishops out to useful squares early
- **King safety** — get the king secure (often by castling) before starting
  adventures

You do not need a named opening yet — only these lenses.

---

<!--
id: center-on-board
play:
  steps:
    tables: rows
-->

## Stage 2 — What “center” looks like

Imagine the board after `1. e4`. White’s pawn sits on **e4**, claiming space
in the center.

| Idea | On the board |
| --- | --- |
| Center claim | Pawn on e4 influences d5 and f5 |
| Next useful idea | Develop a knight (e.g. Nf3) or challenge with …e5 / …c5 later |
| Not the priority yet | Chasing the opponent’s queen around the board |

<flashcard label="Center check">
  <slot name="front">After 1. e4, which goal did White invest in first?</slot>
  <slot name="back">Center — the e-pawn takes space and opens lines for the bishop and queen.</slot>
</flashcard>

[@learning]: ../../../assets/learning.components.md

---

<!--
type: question
id: check-principles
actions:
  submit: questions.submitSingleChoice
-->

## Stage 3 — Quick check

White plays `1. e4` and Black answers `1… e5`. White then plays `2. Qh5`,
attacking the e5 pawn and eyeing f7.

Which principle is White **neglecting** most clearly?

- Center control
- Development of minor pieces
- King safety by castling immediately on move two

---

<!--
id: feedback-principles
-->

## Stage 4 — Check your thinking

*(Live loop: the agent appends this Block after your submit, using your
answer.)*

The best fit is **development of minor pieces**. `2. Qh5` brings the queen out
very early while the knights and bishops stay home. Center was already being
contested with e4/e5; castling on move two was never realistic. Early queen
trips often waste time if Black develops and kicks the queen.

If you missed it — good signal. The next stages practice choosing with
principles, not memorizing “never move the queen.”

---

<!--
id: two-moves
play:
  steps:
    tables: rows
-->

## Stage 5 — Two candidate moves

Same position: after `1. e4 e5`, it is White’s second move.

| Move | What it does |
| --- | --- |
| **A. Nf3** | Develops a knight, attacks e5, prepares castling |
| **B. Qg4** | Brings the queen out early, eyes g7, delays minor pieces |

Which move better follows the three principles?

---

<!--
type: question
id: choose-move
actions:
  submit: questions.submitSingleChoice
-->

## Stage 6 — Choose

Which move is the better opening choice here?

- A. Nf3 — develop, pressure the center, prepare king safety
- B. Qg4 — early queen attack on g7

---

<!--
id: feedback-choice
-->

## Stage 7 — Feedback

*(Live loop: generated from your choice.)*

**A. Nf3** fits development, keeps pressure on the center, and prepares
castling. **B. Qg4** is an early queen outing that Black can often meet by
developing and later harassing the queen — you fall behind in development.

If you picked B, you are not “bad at chess” — you are learning to prefer
principled development over early attacks. That is exactly what Lesson 2 can
reteach if assessment shows the same gap.

---

<!--
type: question
id: justify
question:
  type: short
actions:
  submit: questions.submitText
-->

## Stage 8 — Justify in one sentence

Why is Nf3 a better opening move than Qg4 here? Name at least one principle.

---

<!--
id: wrap
-->

## Stage 9 — Wrap

You should now be able to name the three principles and use them to prefer a
developing move over an early queen raid in a simple position.

Next (required by the loop):

1. [Short review](./lesson.review.md) — ready or name the gap  
2. [Extra practice](./lesson.practice.md) — only if still unsure  
3. [Assessment before Lesson 2](./lesson.assessment.md) — when ready; pass = no core miss  

Agent: after each generated Stage, set frontmatter `stage` to that Block `id`
so reload resumes deterministically.
