# Hosted PathMX 0.1.25 release smoke — 2026-07-21

This run exercised the public learner entry rather than a local candidate:

- hosted `bootstrap.md` from `pathmx-skills/main`;
- published `pathmx-learning-starter/main`;
- exact PathMX 0.1.25 dependency and compatibility baseline;
- Codex CLI 0.145.0 with the `desktop-power` profile;
- collaboration `auto`; no independent judge.

## Result

The SQL beginner flow passed 100% of deterministic checks and every critical
check. The agent created a private local Git repository with no remote,
installed `/learn` and `/pathmx`, persisted the proposed five-milestone map
before sessions, prepared a complete three-session module plus review and
checkpoint after confirmation, supplied an exact Player URL, and passed the
Starter check on 0.1.25.

| Turn | Duration | First update | Longest silence |
| --- | ---: | ---: | ---: |
| Bootstrap | 2m12s | 4s | 1m01s |
| Preferences | 55s | 11s | 39s |
| Point A and proposed map | 1m40s | 9s | 53s |
| Confirmed module | 6m20s | 11s | 1m56s |

Total model time was 11m07s. The quality gate passed, but latency remains
**attention**: one turn exceeded five minutes and two turns had a silent gap
over one minute.

During the confirmed-module turn Codex started two direct child threads. Both
used `gpt-5.6-sol`; no collaboration error was observed. This is consistent
with the candidate comparison: worker use is functioning, but is not evidence
of a faster worker model or a wall-clock speed improvement.

## Environment finding

The eval's default `workspace-write` sandbox blocked global `pathmx
self-update` and Player state under `~/.pathmx`. The agent reported that limit,
continued with the exact project dependency, built successfully, and resolved
the exact route. It also caught and removed one unsupported nested
`@root.styles` import before committing the proposed map. A manual Codex
Desktop run remains the release check for normal Player startup and Browser
handoff.
