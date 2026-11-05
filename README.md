# Forearm Forge

A training app for a 13-year-old who wants to start lifting dumbbells, eat right, and build toward arm wrestling like Devon Larratt, the teen-safe way.

Fan-made. Not connected to Devon Larratt.

## Open it

- **On your computer or phone:** open `index.html` in any browser. Your logs save in that browser.
- **As a Claude artifact:** the same app is published as a private claude.ai page, where logs save to your Claude account and follow you between devices.

## What's inside

| Tab | What it does |
| --- | --- |
| **Today** | Today's mission (training day, rest day or resume), this week's strip, protein and water at a glance, sleep log, quests, tip of the day |
| **Train** | 3-phase dumbbell program (Day A Hook, Day B Top Roll, Day C Endurance), exercise how-tos, live workout logger with rest timer, auto weight suggestions, a "Something hurts" button |
| **Fuel** | Protein goal from your body weight (1.2–1.6 g/kg), tap-to-add foods, custom foods, breakfast, fruit & veg, calcium, water, sleep, fuel rules |
| **Progress** | Level + XP, workouts, week streak, 12-week calendar, strength chart per exercise, badges, body check-ins (weight, height, forearm) |
| **Lore** | The Devon Files, how the plan copies him, the 8 Gym Rules, safe pulling with friends, sources |

## The program in one paragraph

Three workouts a week, never two days in a row. Each has 8 exercises: legs, push, pull, arms, then forearm and grip work (cupping, rising, pronation, pinch, farmer holds), then core. Phase 1 (first 12 workouts) is light and about learning form; the first 3 workouts are 1 set each. Phase 2 adds sets, Phase 3 adds weight. Weight only goes up after you hit the top of the rep range on every set with clean form, and the app tells you when. No max lifts, no full-power table matches yet. See [RESEARCH.md](RESEARCH.md) for why.

## Files

- `src/app.html`: the app source (also what gets published as the artifact)
- `index.html`: the standalone page, generated from the source
- `build.mjs`: regenerates `index.html` after you edit the source: `node build.mjs`
- `RESEARCH.md`: the research and sources behind every number in the app
