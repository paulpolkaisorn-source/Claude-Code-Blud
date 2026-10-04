# hush — an ASMR playground

Twelve tiny interactive worlds (6 in 2D, 6 in 3D) with **fully synthesized audio** — there are no sound, image or model files. Best with headphones.

## Play it

Open **`docs/hush.html`** in any modern browser. It is a single self-contained file (CSS + JS + Three.js inlined) and works offline, straight from disk — no server needed.

(`docs/index.html` is the same app split into separate files, ready for GitHub Pages.)

## The worlds

| | Game | What it does |
|---|---|---|
| 2D | **Bubble Wrap** | Pop a translucent sheet by tapping or sweeping. Layered snap + air-thock + crinkle sounds, "Cascade" crescendo mode, fresh sheet when done. |
| 2D | **Zen Sand** | A real lit height-field of sand. Rake / comb / finger / smooth tools, set and lift stones with spreading ripples. Granular sand hiss driven by stroke speed. |
| 2D | **Rainy Window** | Wipe fog off cold glass. Refracting raindrops merge and run, bokeh city (Night / Dusk / Neon), drizzle → storm with lightning and thunder, squeaky finger-on-glass. |
| 3D | **Slime Squish** | ~14k-vertex soft-body slime: press, grab and stretch it. Translucent physical material, bubbles inside, squelch/bubble/wet-click audio. |
| 3D | **Moonlit Pond** | Wave-equation water with a custom shader (moon glitter, caustics, pebbles), lily pads, lotus, koi, fireflies. Every drop plays a pentatonic note; crickets and rain. |
| 3D | **Crystal Chimes** | Pendulum crystals with collisions and bloom. Brush through them; each rings with inharmonic glass partials through a long reverb. Breeze and gusts. |

| 2D | **Pop It** | Silicone fidget board with spring-animated bubbles that toggle in and out. Pentatonic thops, board shapes and palettes. |
| 2D | **Chalkboard** | Grainy chalk, felt eraser, falling dust, scratchy stick-slip sound. |
| 2D | **Clicky Keys** | Mechanical keyboard you can really type on. Five switch sounds, RGB ripples. |
| 3D | **Glass Marbles** | Tilt a glass bowl; custom marble physics with glass clacks and rolling rumble. |
| 3D | **Campfire** | Flames, embers, crackle synthesis, poke and feed the fire. |
| 3D | **Sky Lanterns** | Light lanterns that rise over a moonlit lake, each with a chime. |

## Graphics levels

Settings (gear on the menu, or the quality button while playing) offers **Auto, Low, Normal, High, Extra, Max, ULTRA by RTX**. They scale resolution (up to 1.5x supersampling), MSAA, bloom, ambient occlusion (GTAO), real soft shadows, mesh/simulation density and particle counts. Auto detects the GPU. ULTRA is the top tier of *rasterized* rendering — browsers cannot do hardware ray tracing — and is meant for RTX-class GPUs. If a game runs below ~24 fps it suggests a lower level.

Other settings: volume, ambient music, haptics. `Esc` returns to the menu.

## Develop

```bash
npm install
npm run build   # writes docs/hush.js, docs/hush.html, docs/index.html, docs/style.css
npm start       # dev server with live rebuild at http://localhost:8080
```

Source is plain ES modules in `src/`; `build.mjs` bundles with esbuild. Each game is a module exporting `create(env)` (see `src/games/`).
