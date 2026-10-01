# Risks and unverified assumptions

Each entry: what is uncertain, why, the fallback that ships, and how a tester can confirm it in-game.
"Verified" in this file only ever means "checked against the official type definitions / docs / schemas", never "seen working in Minecraft" — nothing was run inside the game (see TESTING.md).

## Platform / API

| # | Risk | Status | Fallback / mitigation | How to confirm in-game |
|---|---|---|---|---|
| R1 | Minecraft itself could not be launched in the build sandbox. Bedrock Dedicated Server was not run (see TESTING.md for the attempt). | Open | Everything that can be tested without the game is tested (typecheck, unit tests, schema validation, packaging). | Follow TESTING.md checklist. |
| R2 | Writing the player's `minecraft:movement` attribute via `EntityMovementComponent.setCurrentValue()` may be overwritten by the engine (respawn, effects) or rejected for players. | Unverified | The value is re-applied every 2 ticks while it differs. `config.playerSpeedMode = "effects"` switches to vanilla Speed/Slowness amplifiers instead. | Start a match as a Survivor, sprint, compare with a killer bot; toggle `/scriptevent forsaken:debug` to see the applied value. |
| R3 | Hard sprint lock uses the vanilla rule "players cannot sprint with food level ≤ 6" by writing `minecraft:player.hunger` through `EntityHungerComponent.setCurrentValue()`. | Unverified | If hunger writes are ignored, exhaustion also lowers the movement attribute so sprinting gives no speed (soft lock). | Drain stamina to 0 as a survivor; the hunger bar should drop to 3 drumsticks and sprint should stop. |
| R4 | `world.beforeEvents.entityHurt` cancellation blocks *all* vanilla damage to participants (the virtual-HP system). `/kill`, the void and `Entity.kill()` bypass hurt events. | API verified in 2.10.0 typings | `entityDie` on a participant is treated as an elimination (survivor) or a forced respawn at the killer spawn (killer). Falling below the arena floor teleports back to a safe point. | Hit a bot with a vanilla sword — no vanilla damage; `/kill @s` as survivor eliminates you cleanly. |
| R5 | Custom item `itemUse` fires for plain custom items (no food/shooter component). | Common pattern, docs vague | Every ability item also has `minecraft:interact_button` so touch users get a button. | Right-click each hotbar ability. |
| R6 | `Player.startItemCooldown(category, ticks)` draws the cooldown overlay only on items whose `minecraft:cooldown.category` matches. | API verified | The actionbar always shows cooldown text, so the overlay is cosmetic. | Use an ability; the item icon should grey out. |
| R7 | `TextPrimitive` (world.primitiveShapesManager) aura markers, `depthTest = false`, `visibleTo` per player. New stable API. | API verified in 2.10.0 typings | HUD direction/distance callouts are always shown too; particles are spawned as a third channel. `config.useTextPrimitives=false` disables it. | Use Raging Pace as Slasher: the nearest survivor gets a red label visible through walls. |
| R8 | Script-steered bots (velocity impulses every tick toward A* waypoints) may jitter or be pushed. | Design choice (DECISIONS.md D3) | Closed-loop speed controller, stuck detection → hop → teleport to next waypoint → teleport to safe point. | Watch 8 bots for a full round. |
| R9 | Custom fog via `player.fogSettings.push()` needs a valid fog definition id from the RP. | API verified, fog JSON written against docs | If the fog id is invalid, nothing renders (no crash). | The arena should look hazy; Blood Hunt reddens it. |
| R10 | Ticking area creation (`world.tickingAreaManager.createTickingArea`) has a chunk budget. | API verified | `hasCapacity()` is checked first; if there is no capacity the arena is still built after the player is teleported next to it (the player's own simulation distance loads it). | Start a match far from spawn. |
| R11 | Block states were documented as needing "Holiday Creator Features" in an older doc page. | Avoided | Generators use two block types (`forsaken:generator`, `forsaken:generator_lit`) instead of a block state. | Complete a generator — it lights up. |
| R12 | Bot entity uses a self-authored humanoid geometry (standard 64×64 skin UV). | Validated by our validator only | — | Bots render with skins. |

## FORSAKEN data

| # | Risk | Fallback |
|---|---|---|
| D1 | Wiki pages were read through the public MediaWiki API (`api.php?action=parse`), because the HTML pages return 403 to automated clients. No other block was bypassed. Data reflects wiki state on 2026-10-01. | All corrections logged in CHARACTERS.md. |
| D2 | 1x1x1x1 HP: wiki says 102,550 consistently (infobox, Statistics table, trivia, 60+ edits). The task brief expected a typo. | Data uses the wiki value; `config.oneXOneHpOverride` (default `null`) can force 2500 (the brief's fallback). Logged in CHARACTERS.md. |
| D3 | Many values are marked `[undoc]` on the wiki (player-observed). | Used as-is, flagged `wikiUndocumented` in data. |
| D4 | Roblox-only interactions (Flow Free generator puzzles, Bloodhook QTE, cursor targeting, Veeronica's trick timing, Entanglement pop-ups) have no direct Minecraft equivalent. | Substitutes documented in DESIGN.md §Adaptations. |
| D5 | Values with no source at all are marked `[assumed]` in `data/*.json` (`assumed` arrays) and in CHARACTERS.md. | Tunable in data. |
