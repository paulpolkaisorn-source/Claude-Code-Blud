# FORSAKEN: Bedrock Edition

An unofficial, fan-made Minecraft Bedrock addon that recreates the Roblox asymmetric horror game FORSAKEN: **one killer against eight survivors** on a generated arena. You pick a side and a character; every other participant is a bot.

> **Unofficial fan project.** Not affiliated with, endorsed by, or connected to the FORSAKEN developers or Roblox Corporation. Character names and mechanics belong to their creators; all art in this pack (skins, icons, models) was drawn procedurally for this project. "Daemon" is an original killer made for this addon.

## What's inside

- **20 characters, every passive and ability implemented**: 7 FORSAKEN killers (Slasher, c00lkidd, John Doe, 1x1x1x1, Noli, Guest 666, Nosferatu), the original killer **Daemon**, and 12 survivors (Noob, 007n7, Veeronica, Guest 1337, Shedletsky, Chance, Two Time, Jane Doe, Elliot, Builderman, Dusekkar, Taph). Numbers come from the FORSAKEN wiki. Values with no source are marked `[assumed]` in the data and listed in [docs/CHARACTERS.md](docs/CHARACTERS.md).
- **Match flow**: menu → role → character (or Random) → bot difficulty → 10 s head start → round with clock, generators, kills (+40 s each), Last Man Standing → results → everything restored.
- **Systems**: virtual HP (hearts show your HP as a fraction), stamina on the hunger bar with a real sprint lock, 30 status effects, stuns with Sentinel immunity rules, shields, terror radius heartbeat, aura reveals visible through walls, map items (Medkit, Bloxy Cola).
- **Bots for both sides** with three difficulties: they see (vision cone and line of sight), hear footsteps, repair generators, flee using distance fields, chase, give up stale chases, and use every character's abilities through the same ability engine you use.
- **Arena "Hollow Hamlet"**: an 81×81 village built in the sky by script (no structure files). 10 generator spots, 5 active per match.

## Requirements

- Minecraft Bedrock **1.26.50 or newer** (Windows, Android, iOS, consoles, or Bedrock Dedicated Server).
- No experimental toggles and no Beta APIs. Stable `@minecraft/server` 2.10.0 and `@minecraft/server-ui` 2.2.0.

## Install

1. Get `Forsaken.mcaddon` (build it with `npm run build`, see below; it lands in `dist/`).
2. Open it (double-click on Windows, or "Open with Minecraft" on mobile). Minecraft imports both packs.
3. Create a world (or edit one) → **Behavior Packs** → activate **FORSAKEN: Bedrock Edition (Behavior)**. The resource pack is added automatically (the two packs depend on each other).
   - World settings: **no experiments** are needed. Turn on **Cheats** only if you want the `/scriptevent` commands below; the menu item works without them. During a match the addon sets the difficulty to Easy if it was Peaceful (Peaceful refills hunger, which is the stamina bar), switches several game rules for the arena (no mob spawning, daylight or weather cycle, natural regeneration, fall damage, fire spread or TNT; keep inventory on), and restores all of it afterwards.
4. Enter the world. On your first join you get the **Forsaken Menu** item (hotbar slot 9). Lost it? `/scriptevent forsaken:give_menu` (needs cheats).

**Dedicated server**: copy `packs/Forsaken_BP` to `behavior_packs/` and `packs/Forsaken_RP` to `resource_packs/`, then list both in the world's `world_behavior_packs.json` / `world_resource_packs.json`.

The arena is built about 220 blocks up at x 4000, z 4000 (change `arena` in `data/config.json`). The first build takes a few seconds (loading the area included); later matches only reset generators and props. The world's terrain is never touched.

## Playing

Use the **Forsaken Menu** item (or `/scriptevent forsaken:menu`) → *Play as KILLER* or *Play as SURVIVOR* → choose a character (or Random) → confirm with **Pick** → choose bot difficulty.

Your inventory, armor, game mode, position, world time, difficulty and game rules are saved before the match and restored afterwards. They're also restored if you leave mid-match or the game crashes: just rejoin.

### Controls

| Action | How |
|---|---|
| Killer basic attack | Hotbar **slot 1**: left-click (swing) while holding it, or use it |
| Abilities (FORSAKEN's Q/E/R/T) | Hotbar **slots 2–5**: right-click / use (touch: the "Use …" button) |
| Charge abilities (Void Rush, Crystal Pitch, Demonic Pursuit, Spawn Protection, Pray) | Use once to start, use again to release (auto-release at full charge) |
| Toggles (Sk8, Carry, Ascension, Vandalism, …) | Use to start, use again to stop |
| Map item (Medkit / Bloxy Cola you picked up) | Hotbar **slot 6** |
| Repair a generator (survivors) | **Sneak while looking at it** within 3 blocks. Moving, getting hit or stunned stops you |
| Tug-of-war (Nosferatu's Bloodhook), closing Entanglement pop-ups, flapping in bat form | Press **jump** repeatedly |
| Match menu (help, leave) | Hotbar **slot 9** |

### HUD

The action bar shows the clock (or head start), generators done, survivors alive, your HP and stamina, each ability's cooldown or state, your status effects, channel/repair progress and arrows to revealed players. The sidebar lists everyone's HP. Hearts show your HP as a fraction, the hunger bar shows stamina, and item cooldown overlays show ability cooldowns. Inside the killer's terror radius you hear a heartbeat.

### Rules (from the FORSAKEN wiki)

- Round: 240 s. Each finished generator layer takes 3 s off the clock (5 layers per generator), each kill adds 40 s.
- Survivors win when the clock runs out (or if the killer dies); the killer wins by eliminating everyone.
- Last survivor alive → **Last Man Standing**: the clock jumps to 75 s and killer and survivor see each other for 3 s every 10 s.
- After a stun, the killer can't be stunned again for 4 s, plus 3 s for each extra living Sentinel.

## Commands

All are `/scriptevent` commands (need cheats or operator permission):

| Command | What it does |
|---|---|
| `forsaken:menu` | Opens the menu (in a match: help / leave) |
| `forsaken:give_menu` | Gives the Forsaken Menu item again |
| `forsaken:stop` | Ends the running match and restores everything |
| `forsaken:debug` | Toggles debug mode: an extra HUD line (script time per tick, bot time, bot states), logging of ability presses and failed effects, and a state report in chat |
| `forsaken:quickstart <killer\|survivor> <characterId\|random> [easy\|normal\|hard]` | Starts a match without menus (character ids are listed in docs/CHARACTERS.md) |
| `forsaken:selftest [killerId] [difficulty]` | Bots-only match with no player involved (used for server smoke tests) |

## Tuning and art

Everything numeric lives in `data/` (`killers.json`, `survivors.json`, `statuses.json`, `config.json`): ability values, statuses, round rules, bot difficulty (reaction time, accuracy, chase give-up, swing timing), arena position. Rebuild after editing (`npm run build`).

Skins and icons are original placeholders generated at build time. Drop your own 64×64 skins into `assets/skin_overrides/` and 16×16 icons into `assets/icon_overrides/` and rebuild; file names are listed in [assets/README.md](assets/README.md).

## Building from source

```
npm ci
npm run build        # generate pack content, bundle the script, write dist/Forsaken.mcaddon
npm run typecheck    # TypeScript (game code and tests)
npm test             # unit, kit, bot and pack tests (vitest)
npm run validate     # JSON, manifests, references, official Mojang schemas (after npm run fetch-schemas)
npm run check        # all of the above
FORSAKEN_COM_MOJANG="<path to com.mojang>" npm run deploy   # copy into development_*_packs
```

Server smoke tests (Linux Bedrock Dedicated Server; optional headless player via the `bedrock-protocol` library) are described in [docs/TESTING.md](docs/TESTING.md).

## Known limitations

- **Visuals were never seen by a human.** All testing ran without a game client that renders: skins, models, icons, particles, aura labels, fog and animations are validated as files only. See [docs/TESTING.md](docs/TESTING.md) for exactly what was and wasn't verified.
- **Right-click ability use and the sprint lock were not machine-tested.** The headless test client's item-use packets were ignored by the server (even for a vanilla snowball), and it could not make the server move it, so the right-click/`itemUse` path and the hunger-bar sprint lock are unverified. Left-click swing, jump, menus, HUD, damage (hearts), speed changes, elimination, results, restore, rejoin and leaving were tested on a real server.
- **Bot balance favours the killer.** In simulated bots-only matches the killer usually eliminates most survivors. Tune `bots.difficulty` in `data/config.json`.
- **One player per match.** Other players in the world aren't part of the match.
- **Roblox-only interactions are adapted**, not copied: the generator puzzles are timed layers, timed prompts are jump-spam tug-of-war, cursor targeting uses your crosshair. Details: [docs/DESIGN.md](docs/DESIGN.md) §6.
- **Footsteps**: "silent" effects (Dusekkar's levitation, Nosferatu) only hide you from bots; Minecraft's own player footstep sounds can't be muted by an addon.
- **Performance**: a full bots-only match averaged 6–9 ms of script time per server tick on the test machine (budget 50 ms). Low-end phones hosting a world may struggle.
- **One arena** (Hollow Hamlet).

## Documentation

- [docs/PLAN.md](docs/PLAN.md): targets, architecture, milestones
- [docs/DESIGN.md](docs/DESIGN.md): layers, tick order, damage pipeline, kit API, adaptations
- [docs/DECISIONS.md](docs/DECISIONS.md): technical decisions and the API spike results
- [docs/CHARACTERS.md](docs/CHARACTERS.md): every character, ability, wiki-vs-brief change and `[assumed]` value
- [docs/RISKS.md](docs/RISKS.md): what could go wrong, and the fallbacks
- [docs/TESTING.md](docs/TESTING.md): what was tested, how, and the results
- [docs/AUDIT.md](docs/AUDIT.md): final requirements audit
