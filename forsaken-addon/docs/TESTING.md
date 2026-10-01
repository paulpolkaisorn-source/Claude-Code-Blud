# Testing

What was tested, how, with what result, and what a human still has to check in the game.
Everything below was run on 2026-10-01 in a Linux sandbox. **No rendering Minecraft client was available.**

## Summary

| Area | How | Result |
|---|---|---|
| Types | `npm run typecheck` (game code and tests against `@minecraft/server` 2.10.0 / `server-ui` 2.2.0 typings) | 0 errors |
| Pack files | `npm run validate` (JSON, manifests, references, lang, entity ids, render controllers, fogs, vanilla sound/particle ids, override sizes, import rules, no TODO/FIXME, `.mcaddon` contents) plus the official Mojang JSON schemas for 76 files | OK |
| Build | `npm run build` → `dist/Forsaken.mcaddon` (packs + bundled script); refuses to package if a character lacks data, a handler, an icon, a lang name or a bot profile (`npm run completeness`) | OK |
| Game logic | `npm test`: 469 tests in 29 files (vitest, Minecraft API mocked) | all pass |
| Bots and full matches | Headless Node simulation of complete bots-only matches (`tests/sim.ts`), 3 back-to-back in the test suite, 72 more in a balance batch | all reach a result |
| Real server, bots only | Bedrock Dedicated Server 1.26.52.3 with the packs, `/scriptevent forsaken:selftest` | full matches, no script or content errors |
| Real server, as a player | BDS + a headless protocol client (`bedrock-protocol`) joining as a player, scripted by `tools/bds-smoke.mjs` | see [BDS smoke scenarios](#4-bedrock-dedicated-server) |
| Rendering, sound, feel | — | **not tested**: needs a person with the game (checklists below) |

## 1. Static checks

- `npm run typecheck`: `tsc -p tsconfig.json` (game code) and `tsc -p tsconfig.tests.json --noEmit` (tests). 0 errors.
- `npm run validate`: `[validate] OK (94 JSON files, 72 items, 2 blocks, 2 entities, 78 lang keys, 76 files schema-checked)`. The schema check uses the official schemas from `Mojang/bedrock-samples` 1.26.50.4 (`npm run fetch-schemas` downloads them into `.cache/`; they are not committed because of their licence).
- `npm run build`: `dist/Forsaken.mcaddon` (210 files, about 388 KiB). The validator opens the archive and checks it contains `Forsaken_BP/` and `Forsaken_RP/` with their manifests.

## 2. Unit and integration tests (`npm test`)

| File | Tests | Covers |
|---|---|---|
| `tests/core.test.ts` | 36 | scale conversion (studs, speeds, movement attribute), cooldown manager (reduce one/all, Blood Orb −3 s, Eviscerate halving, pause), status stacking/expiry/cleanse, Strength/Weakness, match state machine transitions, round clock and win rules (layers −3 s, kills +40 s, LMS, Blood Hunt blocking the timer), scheduler |
| `tests/combat.test.ts` | 34 | damage pipeline (Resistance/Vulnerable/Creatures, Strength/Weakness, overheal, Shatterpoint-style layers, floors, invulnerability, lethal hooks, Metal Frame heal block, kill credit +40 s, on-hit speed), damage over time, stuns (Sentinel immunity, killer recovery), stamina and limping, ability engine (cooldowns, Helpless, head start, charge/release, failed casts), auras, dashes |
| `tests/kits/*.test.ts` | 337 | every ability and passive of all 20 characters (one file per character; for example Two Time's second life, Veeronica's heal immunity, Guest 666's Blood Hunt, Nosferatu's tug-of-war) |
| `tests/world.test.ts` | 20 | arena layout, navigation (A*, line of sight, exact distance fields vs a brute-force reference), generators, a full simulated round |
| `tests/bots.test.ts` | 9 | every character has a bot profile, every ability is pressed by its bot, bot hooks only press real abilities, killer target selection, survivor flee/return, **3 consecutive bots-only matches** each reaching a result with repairs, damage and ability use |
| `tests/setup.test.ts` | 8 | bot character picks (distinct, role-balanced, human first), generator spot picks (Noli fakes) |
| `tests/hud.test.ts` | 11 | HUD text (clock, generators, HP/stamina, abilities, Noli fake HP, hidden statuses, terror cue, Daemon's Flagged list, aura callouts, spectating), sidebar, menu cards, results |
| `tests/packs.test.ts` | 5 | every ability has an item with icon texture, lang name and cooldown category; menu and map items; hotbar slots; every character/minion skin; every prop texture |
| `tests/data.test.ts` | 8 | roster against the brief, structure, `[assumed]`/`[undocumented]` paths resolve, one kit per character, a handler per ability, charge/toggle abilities have a release |
| `tests/smoke.test.ts` | 1 | pinned Minecraft module versions |

## 3. Headless match simulation

`tests/sim.ts` runs a whole bots-only match without Minecraft: bodies integrate the same steering the adapter applies, against the arena grid. Used by the tests above and for profiling and balance.

**Balance** (72 matches: 8 killers × 3 seeds × 3 difficulties, random survivors):

| Difficulty | Matches | Average eliminations (of 8) | Survivor wins | Average length |
|---|---|---|---|---|
| easy | 24 | 6.71 | 10 | 315 s |
| normal | 24 | 7.38 | 5 | 285 s |
| hard | 24 | 6.58 | 11 | 313 s |

Difficulty applies to both sides in these runs, so it barely moves the result; with a human on one side it decides how good the other side is. The killer side is strong in bot-vs-bot play (RISKS.md R14).

**CPU** (Node/V8): 0.08 ms per tick on average for game + bots (was 0.73 ms before the fixes in DECISIONS.md D24).

## 4. Bedrock Dedicated Server

Environment: BDS 1.26.52.3 for Linux, a fresh world per run, the packs from `packs/`, content log on. `tools/bds.mjs` starts the server, sends commands (optionally only after a log line appears) and fails on script errors, content-log errors or pack-loading failures. `tools/smoke-client.mjs` joins as an offline player named `Smoke` over NetherNet (the BDS default transport; the RakNet transport needs IPv6, which the sandbox lacks) and logs what a player receives: forms, titles and action bar, chat, and its own movement/hunger/health attributes. It can answer forms, swing, jump, leave and rejoin. `tools/bds-smoke.mjs` runs the scenarios below and checks the log for the expected lines.

```
BDS_DIR=<bedrock-server> BEDROCK_CLIENT_DIR=<folder with bedrock-protocol installed> node tools/bds-smoke.mjs
```

### Scenarios

Results of `tools/bds-smoke.mjs` run from 17:41 to 18:00:

| Scenario | What happens | Checked in the log | Result |
|---|---|---|---|
| `bots` | `/scriptevent forsaken:selftest slasher normal`: a bots-only match | match runs to `SELFTEST DONE` with a winner; no script/content errors | PASS: survivors outlasted the clock, 6699 ticks, average 7.18 ms per tick, worst tick 117 ms |
| `killer` | player as Slasher via quickstart, has 5 diamonds and is in Creative before; stays idle | movement attribute 0 during the head start, `HUNT` title, round over (survivors win on time), `SURVIVORS WIN` results form, `restored Smoke: game mode Creative, position, inventory`, `Smoke has 5 items` | PASS (196 s) |
| `survivor` | `/scriptevent forsaken:menu`; the client answers Play as SURVIVOR → Noob → Pick → Normal; stays idle | menu forms in order, match start as Noob, HUD shows `HP …/100`, round over, restore, items back | PASS (435 s): hearts 20 → 16 → 11 → 6 → 1, eliminated, survivors then won on time |
| `rejoin` | player leaves 40 s into a match and joins again | `cleanup done (host left)`, `Restoring your inventory…`, Creative and 4 diamonds back | PASS (62 s) |
| `leave` | in-match menu → Leave match → confirm | `Leave match?` form, `cleanup done (You left the match.)`, 7 iron ingots back | PASS (29 s) |
| `swing` | left-click with slot 1 as Slasher | `input: swing slash -> ok` | PASS (40 s) |

Earlier manual runs of the same scenarios (17:11–17:35) also showed: the action bar HUD text arriving every few ticks (`⏱ 3:58 | ⚡ 0/5 | ☺ 8 alive ⏎ HP 100/100 | STA ██████████ 100 ⏎ [2] Bloxy Cola READY | …`), the terror cue (`♥ TERROR`), kill messages, the `LAST MAN STANDING` title, hearts following virtual HP on the player (20 → 14 → 10 → 9 → 8 → 4), the movement attribute changing with statuses (0.06 walking as a survivor, 0.072 with the on-hit speed boost, 0.054 when slowed), the `ELIMINATED` / `DEFEAT` titles and the spectator switch.

### Performance in BDS

| Version | Bots-only match | Average script time per tick | Worst tick |
|---|---|---|---|
| before the bot fixes | Slasher, normal | 80 ms (during chases) | 803 ms |
| after (DECISIONS.md D24) | Slasher, normal, 443 s | 8.87 ms | 108 ms (round start) |
| suite run above | Slasher, normal, 335 s | 7.18 ms | 117 ms |

The budget is 50 ms per tick; the worst ticks happen once, when the round starts.

### Bugs found by the BDS runs (all fixed)

- Bot CPU: 80 ms per tick (distance fields re-expanding cells because of float32 rounding, per-bot fields, A* every tick). Fixed (DECISIONS.md D24).
- Rejoin after leaving mid-match did not restore the player: offline players without an Xbox id get a fresh player record, so the snapshot in the player's dynamic properties was gone, and the vault chunk was not loaded yet. The snapshot is now also kept in a world property keyed by name, and the restore waits for the vault before clearing it (RISKS.md R15).

## 5. Not verified

- **Anything visual or audible**: skins, the humanoid model and animations, icons, particles, `TextPrimitive` aura labels, fog, sounds, the sidebar layout. The files are validated against the official schemas, but nobody has looked at them.
- **Right-click ability use (`world.afterEvents.itemUse`)**: the headless client's item-use packets (`inventory_transaction` and `player_auth_input` item interactions) were ignored by the server even for a vanilla snowball, so this could not be driven from the test harness. The left-click path (`playerSwingStart`) is verified.
- **Sprint lock and stamina on the hunger bar** (RISKS.md R3): the headless client sent forward + sprint input, but the server never moved it (no stamina drain), so the hunger writes while sprinting and the lock at 0 stamina were not observed.
- **Generator repair by a human** (sneak + look at the generator): covered by unit tests; bots repair in BDS.
- **Touch controls, consoles, multiplayer with a second human, Realms, low-end devices.**
- **How the game feels**: speeds, hit ranges, cooldown pacing, bot difficulty against a human.

## 6. Manual checklist (needs the game)

Use a world with the addon, cheats on (for the commands), and run `/scriptevent forsaken:debug` once: ability presses are then logged in the content log.

### Match flow
- [ ] First join gives the Forsaken Menu item in slot 9 and a chat hint.
- [ ] Menu → Play as SURVIVOR → pick a character → **Pick** → difficulty. You are teleported to the arena; the title says who the killer is; your inventory is replaced by the ability hotbar.
- [ ] Head start: the killer bot is frozen for 10 s, then "The killer is free".
- [ ] Menu → Play as KILLER: you can't move or use abilities for 10 s, then "HUNT".
- [ ] The arena looks like a small ruined village: buildings with doors (a chapel, a barn, a shack and more), crates, lantern pillars, and 5 unlit generators.
- [ ] The action bar shows the clock, generators, survivors alive, HP, stamina, abilities, statuses; the sidebar lists everyone's HP.
- [ ] Sprint until stamina hits 0: you can't sprint for a moment (hunger bar drops low), then stamina regenerates.
- [ ] Get hit: hearts drop proportionally; you get a short speed boost; below half HP you limp.
- [ ] Sneak while looking at a generator within 3 blocks: the repair bar fills; each finished layer takes 3 s off the clock; a finished generator lights up.
- [ ] A killer near you: heartbeat, `TERROR` on the HUD.
- [ ] Get eliminated: "ELIMINATED", you become a spectator; the match continues to the end.
- [ ] Last survivor: "LAST MAN STANDING", the clock jumps to 1:15, killer and survivor see each other's label every 10 s.
- [ ] End: "VICTORY"/"DEFEAT" title, results form (Play again / Close), and you are back where you were, with your inventory, armor, game mode and gamerules.
- [ ] `/scriptevent forsaken:stop` mid-match restores everything the same way.
- [ ] Leave the world mid-match and come back: your things are restored ("Restoring your inventory…").
- [ ] Play two or three matches in a row: the arena resets (generators unlit, no leftover props or bots).

### Bots
- [ ] Bot survivors walk to generators, repair them (up to three per generator), pick up Medkits/Colas, flee when the killer comes, open doors, and don't get stuck for long.
- [ ] The bot killer patrols, investigates generator noise, chases, swings, uses its abilities, and switches targets after a long chase.
- [ ] Easy bots are noticeably sloppier than hard ones.

### Known-risky APIs
- [ ] Ability items: right-click (and the touch "Use" button) fires abilities (R5).
- [ ] Cooldown overlays appear on the ability items (R6).
- [ ] Aura labels show through walls only for the right player (R7).
- [ ] Fog: the arena looks hazy; Blood Hunt turns it red (R9).
- [ ] Bot skins differ per character; Daemon's face blinks (R12).

### Characters
One file per character, each with step-by-step checks of every ability and passive, as a human and against/with bots:

[Slasher](testing/slasher.md) · [c00lkidd](testing/c00lkidd.md) · [John Doe](testing/john_doe.md) · [1x1x1x1](testing/1x1x1x1.md) · [Noli](testing/noli.md) · [Guest 666](testing/guest_666.md) · [Nosferatu](testing/nosferatu.md) · [Daemon](testing/daemon.md) · [Noob](testing/noob.md) · [007n7](testing/007n7.md) · [Veeronica](testing/veeronica.md) · [Guest 1337](testing/guest_1337.md) · [Shedletsky](testing/shedletsky.md) · [Chance](testing/chance.md) · [Two Time](testing/two_time.md) · [Jane Doe](testing/jane_doe.md) · [Elliot](testing/elliot.md) · [Builderman](testing/builderman.md) · [Dusekkar](testing/dusekkar.md) · [Taph](testing/taph.md)

Please report back which boxes failed, with the content log lines (`[forsaken]`) around it.
