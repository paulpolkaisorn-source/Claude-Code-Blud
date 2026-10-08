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
| 1 | render | haiku | max | max | DONE |
| 2 | world | haiku | max | max | DONE |
| 3 | models | haiku | max | max | DONE |
| 4 | combat | haiku | max | max | DONE |
| 5 | ai | haiku | max | max | DONE |
| 6 | input | haiku | max | max | DONE |
| 7 | ui | haiku | max | max | DONE |
| 8 | fx | haiku | max | max | DONE |
| 9 | audio | haiku | max | max | DONE |
| 10 | qa | haiku | max | max | DONE (run 1: 27/32, DEF-01 found) → re-run via SendMessage (same agent) |

Spawned: **10 / 10** (workers 1–9 via Workflow `wf_ecbece45-394`, 2 concurrent on 4 CPUs; worker 10 via Agent tool,
`subagent_type: qa`, transcript meta `model: haiku`, `effort: max`). The QA re-run continues the same agent (no new spawn).

Model/effort verification: every worker transcript records `"model":"claude-haiku-5-5"` and `"effort":"max"`.
Note: the workflow first tried `agentType: <name>` (the `.claude/agents/*.md` definitions). Those types were not yet
registered in the running session, so each lookup failed before any model ran (journal `agentId: ""`, 0 tokens);
the script then spawned the default workflow subagent pinned to `model: haiku`, `effort: max`. The UI lists those
9 failed lookups as "Error" rows — they are not subagents and consumed no tokens. The custom types registered later
in the session, so worker 10 (QA) uses `subagent_type: qa` directly.

## Opus integration/fix log (no extra subagents)
- game.js/main.js written against ARCHITECTURE.md, then aligned to the shipped module shapes (HUD/labels/results, matchmaking roster).
- Fixes: model revive after death; merged per-target damage numbers + smaller on phones; no hit-stop from totem ticks;
  full-length aim line + radius-aware arc/circle decals; outer meadow so tall cameras never show sky; camera framing
  (~15.5 tiles landscape / ~12 portrait) clamped to the arena; Esc/P toggles pause; DEF-01 (preview context loss);
  touch tap window 220 → 350 ms.

## Notes
- Three.js pinned to 0.170.0 (r170) on jsDelivr; verified URLs return 200 (build + addons).
- "≤150 lines" read as: `ARCHITECTURE.md` ≤150 and `src/contracts.js` ≤150, each.
