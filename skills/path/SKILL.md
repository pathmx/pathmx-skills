---
name: path
description: Create and resume an opinionated personal learning path in a PathMX workspace. Use assessment evidence to choose the next lesson for one learner and one learning goal.
---

# Personal Learning Path

Build one durable, adaptive path for one learner. Use `/pathmx` for PathMX
syntax and verification.

Present learner-facing lessons, reviews, and assessments in the PathMX Player.
Start or reuse `pathmx play` for the active root Source and give the learner
its Player route. Do not use the raw Markdown file as the learning interface.
After creating or updating playable material, open it in the Player again.

## Learning loop

Run the same loop at path and lesson level:

1. **Assess position.** Find Point A from evidence, not vibes: past work,
   artifact, sample, picture, or a short diagnostic.
2. **Aim.** Agree on Point B, a small rubric, Lesson 1’s destination, and two
   or three Later titles. Confirm before teaching.
3. **Experience.** Build one lesson at the proximal edge. One agent turn adds
   one Block with a stable `id` (~40–120 words).
4. **Review.** Ask what the learner can do now and what is still fuzzy. Offer
   gap help and short practice until they are ready.
5. **Assess outcome.** Use 3–4 multiple-choice items plus one short answer
   grounded in what was taught. Pass = no core concept missed.
6. **Record and advance.** Write a synthesis, update current Point A, and
   place the next lesson from evidence.

Do not build the whole path ahead. Later items stay titles until they are next.

## Start or resume

Before teaching, read the nearest repository instructions and root Path
Source. Reuse the workspace's layout when one exists.

For a new path:

1. Onboard: goal, why, prior knowledge, stuck points, time/pace, preferred feel.
2. Collect Point A evidence, then write Point A in observable language citing it.
3. Draft Point B, rubric, Lesson 1 destination, and Later titles.
4. Persist the plan and wait for confirm (`roadmap.status: confirmed`).
5. Build only the first lesson shell, then teach one Block at a time.

For a returning path:

1. Read `paths/index.path.md`, the learner profile, activity log, active path,
   latest assessment, and latest synthesis.
2. Give a short recap and two or three retrieval prompts from earlier work.
3. Continue from the recorded `stage` cursor and current Point A.

Record only learner-confirmed context. Avoid sensitive data by default.

## Build one lesson

1. Set `start` from the current position and latest synthesis.
2. Set `destination` as an observable learner capability.
3. Teach one small win at the proximal edge with retrieval, practice, and
   immediate feedback.
4. Persist `stage` in lesson frontmatter after each turn.
5. After teaching, run a short review. If unsure, name the gap and add practice.
6. Write a plain Markdown assessment with agent-facing rationales, concept
   tags (core vs peripheral), and a short-answer rubric.
7. Gate the next lesson on evidence. Prefer spaced assessment at the next
   session when a break occurs.
8. On a core miss, encourage and retry with variant items. After 2–3 failed
   attempts, build a smaller remediation lesson instead of advancing Later.
9. If remediation assessment also fails, renegotiate Point B or pace — do not
   loop remediation again.
10. Record a synthesis: evidence, change in perspective, review-queue items,
    placement, and what opens next.

If the installed tools cannot capture suitable evidence, report the capability
gap. Do not weaken the assessment. PathMX does not grade automatically; the
agent scores against the rubric and writes the durable result.

## Default layout

This is `/path`'s default, not a general PathMX requirement:

```text
paths/
├── index.path.md
├── learner.profile.md
├── learning.activity.md
├── theme.css
├── assets/
│   └── learning.components.md
└── <path-name>/
    ├── index.path.md
    ├── path.outcome.md
    ├── onboarding/
    │   ├── index.lesson.md
    │   ├── point-a-evidence.md
    │   └── confirm-plan.md
    ├── lessons/
    │   └── <lesson-name>/
    │       ├── index.lesson.md
    │       ├── lesson.review.md
    │       ├── lesson.practice.md
    │       └── lesson.assessment.md
    └── references/
        └── index.references.md
```

- `paths/index.path.md` is the learner home / root Source.
- `theme.css` and `assets/` are optional shared styling and components.
- `path.outcome.md` records Point A, Point B, and the path rubric.
- Path `index.path.md` records the outline, gates, and current position.
- `index.lesson.md` records historical `start`, `destination`, and `stage`.
- `lesson.review.md` gates readiness before assessment.
- `lesson.assessment.md` asks for observable evidence; pass = no core miss.
- `learning.activity.md` records reviews, syntheses, placements, and the
  review queue.

Renegotiate Point B explicitly when evidence changes the learner's goal. Log
the change; do not rewrite history silently. Complete a path only when its
rubric is met and the learner agrees.

## Learning rules

- Use backward design: define evidence before content.
- Teach at the zone of proximal development.
- Use retrieval, spacing, and interleaving to build storage strength.
- Keep lessons small and concrete.
- Prefer real transfer tasks over recall alone.
- Advance on evidence, not fluency or impressions.

See the compact [worked example](./references/worked-example.md) and the full
[adaptive loop fixture](./references/adaptive-loop-example.md).
