# Final audit

The brief was re-read top to bottom on 2026-10-01 and each item was checked against the code, the data, the tests and the Bedrock Dedicated Server runs. ✅ = done and checked; ⚠️ = done with a stated gap; ❌ = not done.

## Section 10 checklist

| # | Item | Status | Evidence |
|---|---|---|---|
| 1 | One killer + eight survivors every match. Player = Killer → 8 bot survivors. Player = Survivor → 7 bot survivors + 1 bot killer. | ✅ | `config.match.survivorCount` 8, `pickBotCharacters` (tests/setup.test.ts). BDS logs: `match start: you=killer:slasher killer=slasher survivors=<8 ids>` and `you=survivor:noob killer=1x1x1x1 survivors=noob,<7 more>`. |
| 2 | The player can choose the role and the character (or Random) before every match. | ✅ | Menu → role → character list with Random → character card with Pick/Back → difficulty. Driven by the headless client in BDS (scenario `survivor`); "Play again" on the results form reopens the menu. |
| 3 | All 7 FORSAKEN killers, all 12 FORSAKEN survivors and Daemon implemented with all abilities and passives, each working for a human and a bot. | ⚠️ | 20 kits, 337 kit tests; one shared ability engine for humans and bots; a test proves every ability is pressed by its bot. In BDS, bots used abilities in full matches, and a human's slot-1 swing fired the basic attack and jump presses reached the match. **Gap:** right-click item use by a human could not be driven from the headless client (TESTING.md §5), so that input path is verified only against the API types. |
| 4 | Numbers in `data/` match section 4 or the wiki, every difference logged in `docs/CHARACTERS.md`, all `[assumed]` values flagged. | ✅ | Character pages read through the wiki's MediaWiki API. CHARACTERS.md is generated from the data (per-character "Changes from the brief", `[assumed]` and `[undocumented]` values with their numbers). All section 4.4 conflicts are resolved and logged (1x1x1x1 HP, Guest 666 and Nosferatu HP, Two Time kit, Guest 1337 rework, Chance's role, Slasher's normal ENRAGED values). Unsourced config values are listed in `config.assumed`. Daemon is marked original design. |
| 5 | Generators, timer, win conditions and cleanup work back to back for at least 3 consecutive simulated matches. | ✅ | tests/bots.test.ts runs 3 consecutive full bots-only matches (each reaches a result with repairs and damage); tests/world.test.ts runs a full round. In BDS, the `backtoback` scenario played two bots-only matches in one server session (arena reused, cleanup in between), and the player scenarios check cleanup and restore after each match (TESTING.md §4). |
| 6 | No Beta/experimental dependency (or isolated, flagged, documented). | ✅ | `@minecraft/server` 2.10.0 and `@minecraft/server-ui` 2.2.0 (stable), no experiments in the manifests; BDS ran with no experimental toggles. |
| 7 | `npm run typecheck`, `npm test`, `npm run validate`, `npm run build` all pass; `dist/Forsaken.mcaddon` exists and its manifests were checked. | ✅ | Final `npm run check`: typecheck 0 errors, build OK (completeness subset 16/16), 469/469 tests, validate OK (94 JSON files, 76 schema-checked). `validate` opens the `.mcaddon` and checks both packs and manifests (UUIDs, versions, mutual dependencies, script entry). The prebuilt `dist/Forsaken.mcaddon` is committed. |
| 8 | README has install steps, controls (hotbar mapping), commands, known limitations and the fan-project disclaimer. | ✅ | README.md: Install (incl. enabling the packs and world settings), Controls, Commands, Known limitations, disclaimer at the top. The pack descriptions carry the disclaimer too. |
| 9 | `docs/TESTING.md` states exactly what was and wasn't tested, and what a human still needs to check in-game. | ✅ | TESTING.md: summary table, static checks, unit tests per file, simulation, BDS scenarios with results, a "Not verified" list, and manual checklists (match flow, bots, risky APIs, 20 per-character files with 457 checks). |
| 10 | No `TODO`, placeholder code or invented API usage anywhere. | ✅ | `validate` fails on TODO/FIXME in shipped files; source scan finds none. Every Minecraft API used type-checks against the official 2.10.0 typings, and the JSON files pass the official schemas. "Placeholder" appears only for the generated art, which the brief asks for. |

## Section 0: how to work

| Rule | Status |
|---|---|
| Plan first (`docs/PLAN.md`), milestones in order | ✅ PLAN.md written in M0; M0–M8 done in order, one commit per milestone (M3–M6 were developed together and committed as four milestone commits). |
| Never invent APIs, versions or FORSAKEN facts | ✅ Versions from npm / `Mojang/bedrock-samples`; APIs from the official typings; facts from the wiki, with `[assumed]` where there is no source. |
| Don't claim tests you didn't run; BDS smoke test if possible | ✅ BDS was run (TESTING.md §4). Nothing is claimed for a rendering client. |
| Ask only when blocked; log defaults in DECISIONS.md | ✅ D1–D26. |
| Complete output, no stubs | ✅ |
| Commit after each milestone | ✅ |
| Final audit, report skips | ✅ this file |

## Other sections, briefly

- **§1 Product / §1.2 disclaimer:** ✅ README and both pack manifests' descriptions.
- **§2 Platform and tooling:** ✅ versions recorded in PLAN.md; TypeScript + esbuild into one `scripts/main.js`; no runtime dependencies besides the Minecraft modules; all required commands exist (`deploy` included); `validate` covers every check listed in §2.
- **§3.1 Match flow:** ✅ `LOBBY → ROLE_SELECT → LOADING → HEAD_START → ROUND → ENDING → RESULTS → LOBBY` (`core/match.ts`, transitions tested). Menu item on first join, `give_menu`, `stop`, `debug` (HUD overlay + logging). Results list character, generators/layers, damage dealt/taken, alive or eliminated. Back-to-back reset ✅.
- **§3.2 Rosters:** ✅ distinct survivors by default, `allowDuplicateSurvivors`, the player's character always included, role mix balanced.
- **§3.3 Timer:** ✅ wiki values instead of the brief's assumed ones (240 s, −15 s per generator as −3 s per layer, +40 s per kill); Last Man Standing exists on the wiki and is implemented (config-gated). Logged in DECISIONS.md D13.
- **§3.4 Generators:** ✅ two block types (lit/unlit), 5 per match from 10 spots, sneak + look to repair, up to 3 repairers, interruption on damage/stun/moving, sound + announcement + clock reduction; extensible (Order Up!, Noli's fake generators).
- **§3.5 Health / stamina:** ✅ virtual HP via cancelled hurt events (edge cases in DECISIONS.md D4), no natural regeneration, limping, shield layers, stamina with hunger-based sprint lock (⚠️ sprint lock not exercised by a real player, RISKS.md R3), elimination → spectator, killers can die (wiki).
- **§3.6 Statuses:** ✅ 30 statuses from the wiki's Status Effects page (stacking, cleanse tags, HUD text); vanilla effects only where identical.
- **§3.7 Terror radius / auras:** ✅ heartbeat + HUD cue; aura reveals as HUD callouts + particles + `TextPrimitive` labels (⚠️ rendering unverified); Jane Doe's footprints.
- **§3.8 Controls / HUD:** ✅ slot 1 basic attack, 2–5 abilities, cooldown overlay + action-bar text, charge abilities start/release, name tags `<Character> [BOT]`. Mask attachable (stretch goal) not done.
- **§3.9 Arena:** ✅ procedural horror village, time-sliced build, ticking area, configurable location, fixed night, game rules set and restored. Second arena (bonus) not done.
- **§3.10 Scale:** ✅ one conversion module and one table in `config.json`; speeds as sprint multiples. Players use the movement attribute written by script instead of a `player.json` override (DECISIONS.md D7; verified in BDS that the values reach the client).
- **§4 Roster:** ✅ see item 4. **§4.3 Daemon:** ✅ original kit, own texture with a two-frame cursor blink, 1.15× scale.
- **§5 Bots:** ✅ one entity with character/role properties; bots think every 5 ticks staggered (profiled in TESTING.md); script steering chosen after the spike (DECISIONS.md D5); doors opened, void/stuck recovery; survivor and killer state machines with every per-character heuristic from §5.3/§5.4; difficulty scales reaction, accuracy, escape quality, repair speed, memory, swing timing and chase give-up; teammates' shouts; bots only know what they perceive. ⚠️ Bot-vs-bot balance favours the killer (RISKS.md R14).
- **§6.2 Details:** ✅ formats verified against the official schemas; runtime entities tagged `forsaken:runtime` and purged on load and match end; time-sliced work; a second human is told a match is running and left alone; player leave/rejoin restores the snapshot (verified in BDS).
- **§7 Visuals and audio:** ✅ original procedural skins (golden-angle hues, darker killers with red trim, chest initial), icons with letters, override folders `assets/skin_overrides/` and `assets/icon_overrides/` (documented in assets/README.md); vanilla sounds only, through a `sounds` mapping in `config.json`; vanilla particles. ⚠️ Not seen on screen.
- **§8 Testing:** ✅ all six points; the data-completeness test also runs inside `npm run build`.

## Skipped, and why

- **Right-click ability use not machine-verified**: the headless client could not make the server fire `itemUse` (even for a vanilla snowball). Covered by the manual checklist.
- **Rendering, sound and feel not verified**: no game client with a screen was available.
- **Head-slot "mask" attachable and a second arena**: optional stretch goals in the brief; not done.
- **Player movement through `player.json` component groups**: the brief's preferred route was replaced by the script-written movement attribute, which the spike showed working and which avoids overriding the vanilla player entity (DECISIONS.md D7).
