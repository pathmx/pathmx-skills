---
type: assessment
status: ready
---

# Point A evidence

Show where you are — so Lesson 1 is scaffolded from proof, not a guess. Pick
**how** you want to show it, then give that evidence. You can use questions
only if you have nothing to attach.

After this → [Confirm your plan](./confirm-plan.md).

Privacy: share only what you are comfortable making durable in this workspace.
No passwords, private invites, or sensitive personal data.

---

<!--
type: question
id: evidence-mode
actions:
  submit: questions.submitSingleChoice
-->

## How do you want to show your current level?

- Past experience — what I’ve tried and how far I got
- Artifact link — repo, gist, notebook, portfolio, or game history URL
- Code or work sample — I’ll paste a small snippet or describe a file
- Picture / screenshot — link or path to an image (board, UI, notes, etc.)
- Quick questions only — I don’t have an artifact; just ask me

---

<!--
type: question
id: past-experience
question:
  type: long
actions:
  submit: questions.submitText
-->

## Past experience *(if you chose that)*

What have you already done in this area? Mention courses, games, projects,
tutors, or apps — and where you usually get stuck. If you chose another mode,
write “n/a”.

---

<!--
type: question
id: artifact-link
question:
  type: short
actions:
  submit: questions.submitText
-->

## Artifact link *(if you chose that)*

Paste a **public** URL (or a path inside this workspace) to a repo, gist,
notebook, portfolio page, or game history. If not using a link, write “n/a”.

---

<!--
type: question
id: code-or-sample
question:
  type: long
actions:
  submit: questions.submitText
-->

## Code or work sample *(if you chose that)*

Paste a **small** snippet (about 5–20 lines) or describe exactly which file /
position the agent should look at. If not using a sample, write “n/a”.

---

<!--
type: question
id: picture-or-shot
question:
  type: short
actions:
  submit: questions.submitText
-->

## Picture / screenshot *(if you chose that)*

Paste a public image URL, or a relative path to an image in this workspace
(e.g. `./assets/my-board.png`). If not using a picture, write “n/a”.

---

<!--
id: questions-header
-->

## Quick questions *(everyone can answer these — required if you chose questions only)*

Even if you shared an artifact, these help the agent double-check level.

---

<!--
type: question
id: second-move
actions:
  submit: questions.submitSingleChoice
-->

## 1. What would you play?

You are White. The game started `1. e4 e5`. It is your second move. Which
choice best matches how you would actually play today?

- Nf3 — develop a knight and look at the center
- Qh5 or Qg4 — bring the queen out early to attack
- I’m not sure — I usually pick something random or copy a video move

---

<!--
type: question
id: why-second-move
question:
  type: short
actions:
  submit: questions.submitText
-->

## 2. Why that choice?

In one or two sentences. If unsure, say what feels confusing.

---

<!--
type: question
id: development-meaning
actions:
  submit: questions.submitSingleChoice
-->

## 3. Quick meaning check

Which best matches what **development** means in the opening?

- Bringing knights and bishops to useful squares early
- Moving the queen as far as possible on move two
- Capturing every pawn you can see
- I don’t know that word in chess yet

---

<!--
id: agent-use
-->

## What the agent does next

1. Read the mode you chose + any artifact / experience / sample.  
2. Use the quick questions to confirm or adjust.  
3. Write Point A in observable language **citing that evidence**.  
4. Draft Point B and the roadmap at your proximal edge.  

| Signal | Likely Point A sketch |
| --- | --- |
| Thin evidence + unsure answers | Legal moves; openings feel arbitrary; principles not yet usable |
| Early-queen habits / weak “why” | Knows pieces; overweights early attacks |
| Solid Nf3 + clear why, or strong game/repo evidence | Near Lesson 1 destination — shorten or skip basics |

**→ [Confirm your plan](./confirm-plan.md)**
