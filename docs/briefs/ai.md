GOAL: grid A* + utility-AI bots writing only b.input. API: ARCHITECTURE.md "ai".
FILES: src/ai/astar.js, src/ai/bots.js, tests/unit/ai.test.mjs.
A*: 8-dir, no corner cutting, arena.blocksMove, octile heuristic, typed-array binary heap; LRU cache (64) keyed from/to/navVersion; unreachable → 0.
UTILITY AI (re-score ~0.25s + jitter):
- seek-crystal: nearest active crystal (crystals[i].active), stronger when team behind.
- attack: visible enemy within ~1.2×range, prefer low HP / carriers.
- retreat: hp<35% → path toward own spawn while strafing, resume when regen'd.
- regroup: move near ally carrier when enemies close.
- carrier-protect: self carries ≥4 or own team countdown running → hold near own side, prefer bushes, avoid fights.
MOVEMENT: follow waypoints (repath on target/navVersion change or 1s), strafe while fighting, unstick.
AIMING: lead target (t=dist/projectile speed, predicted=pos+vel*t), angular error scaled by (1-difficulty) up to ±0.35 rad; lob aimLen=dist/range; fire only with LOS (except lob) and ammo≥1; reaction delay 0.6s→0.15s by difficulty. Supers when sensible (dash enemy ≤5 tiles, totem near hurt allies).
FAIRNESS: never use enemies with visibleTo[bot.team]===false; remember last-seen position ≤1.5s.
TESTS (node --test, fake arena/combat stubs): optimal path around walls; cache hit; unreachable→0; bot moves toward crystal; aims at visible enemy; ignores hidden enemy; retreats when low; 6 bots × 600 ticks < 50ms.
