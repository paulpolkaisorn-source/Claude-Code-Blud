# PLAN — Brawl Arena 3D

Lead: Opus (architecture, contracts, `main.js`, `game.js`, `index.html`, `src/render/toon.js`, integration, review).
Workers: Haiku subagents only (`.claude/agents/*.md`, `model: haiku`, `effort: max`). Hard cap: **10 total**.

## Phases
1. Opus: contracts (`src/contracts.js`, `ARCHITECTURE.md`, `src/render/toon.js`), test infra, briefs (`docs/briefs/`).
2. Workers 1–9 in parallel (exclusive file sets) via one Workflow run.
3. Opus integration (`src/main.js`, `src/game.js`).
4. Worker 10 (QA) → Opus fix pass → QA re-run (same QA subagent, continued, not a new spawn).

## Subagent ledger
| # | worker | model | effort requested | effort applied | status |
|---|--------|-------|------------------|----------------|--------|
| 1 | render | haiku | max | pending | pending |
| 2 | world | haiku | max | pending | pending |
| 3 | models | haiku | max | pending | pending |
| 4 | combat | haiku | max | pending | pending |
| 5 | ai | haiku | max | pending | pending |
| 6 | input | haiku | max | pending | pending |
| 7 | ui | haiku | max | pending | pending |
| 8 | fx | haiku | max | pending | pending |
| 9 | audio | haiku | max | pending | pending |
| 10 | qa | haiku | max | pending | pending |

Spawned so far: **0 / 10**.

## Notes
- Three.js pinned to 0.170.0 (r170) on jsDelivr; verified URLs return 200 (build + addons).
- "≤150 lines" read as: `ARCHITECTURE.md` ≤150 and `src/contracts.js` ≤150, each.
