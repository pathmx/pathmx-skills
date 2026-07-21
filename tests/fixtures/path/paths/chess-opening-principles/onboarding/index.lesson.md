---
type: lesson
status: active
start: Starting a new path; goal and constraints not yet recorded
destination: Has answered onboarding so the agent can run a Point A evidence diagnostic and draft the plan
---

# New Path — Onboarding

This is the **New Path** onboarding flow for `/path`.
Answer each question. Your agent copies confirmed answers into
[learner.profile.md](../../learner.profile.md), then asks for **evidence**
before drafting Point A.

Play step by step → **Point A evidence** → **Confirm your plan**.

---

<!--
type: question
id: what-goal
question:
  type: short
actions:
  submit: questions.submitText
-->

## What do you want to be able to do?

One concrete capability — for this demo, something like: play sensible opening
moves in the first 8–10 moves without memorizing a long line.

---

<!--
type: question
id: why-matters
question:
  type: short
actions:
  submit: questions.submitText
-->

## Why does that matter to you right now?

---

<!--
type: question
id: already-know
question:
  type: short
actions:
  submit: questions.submitText
-->

## What do you already know about chess openings?

Mention piece moves, any openings you have tried, or what still feels random.

---

<!--
type: question
id: get-stuck
question:
  type: short
actions:
  submit: questions.submitText
-->

## Where do you tend to get stuck?

---

<!--
type: question
id: time-pace
question:
  type: fields
actions:
  submit: questions.submitFields
-->

## Time and pace

I can spend about **___**<!-- @response.field id=minutes label="Minutes" placeholder="e.g. 20" --> minutes per session, about **___**<!-- @response.field id=times-per-week label="Times per week" placeholder="e.g. 3" --> times per week.

---

<!--
type: question
id: experience-feel
actions:
  submit: questions.submitSingleChoice
-->

## How should this path feel?

- Calm and stepwise — short Blocks, clear checks
- Brisk — more positions, fewer words
- Mix — explain briefly, then practice on the board

---

<!--
id: next-evidence
-->

## Next: show where you are (Point A evidence)

Self-description alone is not enough. Open the short diagnostic so the agent
can scaffold Lesson 1 from what you can **do**:

**→ [Point A evidence](./point-a-evidence.md)**

Then review and confirm the draft plan. Teaching Blocks stay locked until
confirm.
