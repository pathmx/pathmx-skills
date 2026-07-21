# Roadmap

## Release gates

- After the skill pack and learning starter pass candidate and published-flow
  evals, audit their commit history and remove unwanted Claude-generated commit
  attribution or trailers before the public release. Confirm the exact history
  rewrite and affected remotes before changing published history.
- Sync the canonical skills and `AGENTS.md` instructions into
  `pathmx-build-week-2026` and `pathmx-learning-starter`. Replace stale managed
  copies in both repositories and verify them with the sync checker and each
  repository's own checks.
- Rewrite or replace
  `pathmx-build-week-2026/paths/guides/self-learning-manual-test.guide.md` so a
  teammate can manually reproduce the automated scenario from `bootstrap.md`
  in a fresh Codex Desktop task. Keep its learner messages and phase checks
  aligned with the scored eval, then add Desktop-only observations for
  permission requests, integrated Browser routing, Player appearance and Play
  mode, annotations, waiting time, and the learner's sense of progress. Remove
  the old direct-init flow and stale minimum-version language.
- Verify bootstrap and installed skills against the latest stable PathMX
  release before publishing. The current candidate is `0.1.21`; keep the
  bootstrap on `latest`, advance fixture baselines only after the full suite
  passes, and do not leave prose or examples pinned to an older release.
- Review `evals/profiles.json` against the current Codex Desktop model guide
  before release so the primary experience lane still matches the documented
  default Power setting.

## Later work

- Forward-test bootstrap and both implicit skill triggers in clean Codex and
  Claude Code sessions.
- Expand stable annotation review and reply workflows after field use.
- Add more learning-path examples only when they cover a distinct domain or
  learner need.
- Explore an optional, more playful home and milestone map without making it a
  dependency of the minimal starter.
- Add general actions or spaceholders only after their public authoring
  contracts are stable and fixture-backed.
