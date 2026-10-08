# Brawl Arena 3D

An original 3v3 cartoon hero-shooter that runs in the browser: plain HTML/CSS/ES modules + Three.js 0.170.0, no build step.
All characters, maps, art and audio are generated in code. No external assets, no third-party game IP.

## Run

```bash
npx serve .            # or: python3 -m http.server 8000
# open the printed URL (e.g. http://localhost:3000)
```

The page loads Three.js from jsDelivr through an import map, so the first load needs internet access.
Requires a WebGL2 browser (any current desktop or mobile browser).

## Modes

- **Crystal Rush (3v3)**: crystals pop out of the center mine every 6 s. Hold **10+** crystals as a team (and more than the
  enemy) for **15 s** to win. Dying drops every crystal you carry. Match timer is 2:30; when it runs out, the team holding more
  crystals wins, otherwise it's a draw.
- **Training (1v1)**: you against one easy bot; first to hold 5 crystals for 10 s, 1:30 timer.

## Brawlers

| Brawler | Role | Attack | Super |
|---------|------|--------|-------|
| Rivet | Tank | 5-pellet scattergun cone | Shoulder-charge dash: knockback, smashes walls |
| Pip | Sniper | Long single bolt | Piercing rail shot through enemies and walls |
| Mortara | Thrower | Bomb lobbed over walls | Cluster bomb: big blast that destroys walls + bomblets |
| Lumen | Support | Short beam: damages enemies, heals allies | Healing totem zone |

Every brawler has a 3-segment ammo bar that reloads over time, a Super meter that fills by dealing damage or healing,
and regenerates HP after 3 s out of combat. Tall grass hides you unless an enemy is within 2 tiles or you attack.

## Controls

| Action | Desktop | Mobile |
|--------|---------|--------|
| Move | WASD / arrow keys | Left joystick (appears where you touch) |
| Aim + attack | Mouse to aim, left click to fire | Drag the right stick, release to fire |
| Auto-aim attack | Q or Space | Tap the right stick |
| Super | Right click or E (aimed at mouse) | Drag the Super button, release |
| Auto-aim super | F | Tap the Super button |
| Pause | Esc / P (press again to resume) | Pause button (top-right) |

## File map

```
index.html                 page shell, import map, layers (canvas / fx / input / ui)
styles/ui.css              all menu + HUD styling
src/contracts.js           constants, brawler stats, entity shapes, event bus (shared contract)
src/main.js                boot: renderer, UI, input, FX, audio, settings, debug handle
src/game.js                state machine, fixed 60 Hz sim, Crystal Rush rules, visibility, respawns, interpolation
src/render/                renderer + camera rig + post (bloom) + auto quality; toon.js = cel materials & outlines
src/world/                 ASCII maps, symmetric map generator, instanced arena, collision, destructible walls, crystals
src/entities/              procedural brawler models + code animations, select-screen 3D preview
src/combat/                pooled projectiles, damage, ammo/reload, supers, regen, knockback
src/ai/                    grid A* (cached) + utility-AI bots
src/input/                 keyboard/mouse + mobile dual joysticks
src/ui/                    menus, brawler select, matchmaking, HUD, pause, settings, results
src/fx/                    pooled particles, trails, damage numbers, aim indicator, shake/hit-stop hooks
src/audio/                 WebAudio-synthesized SFX + procedural music
tests/                     unit tests (node --test), browser harness (Playwright), QA suite
ARCHITECTURE.md            module contracts     PLAN.md   build plan + subagent ledger     QA.md   QA report
```

## Tests

```bash
npm install                # dev-only: playwright + three (tests route the CDN to node_modules)
npm test                   # unit tests (Node)
node tests/browser-test.mjs tests/browser/<module>.html [--mobile]
npm run qa                 # full Playwright QA suite (33 checks, desktop + 390x844 touch + perf), writes QA.md
node tests/smoke.mjs [--mobile] [--shots]   # quick integration smoke: one match per brawler + a full match
```

Debug handle in the browser console: `window.__BRAWL__` (`stats()`, `quickStart({mode,brawlerId,mapId})`,
`fastForward(seconds)`, `setTimeScale(x)`).
