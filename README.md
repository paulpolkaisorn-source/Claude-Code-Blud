# hush — an ASMR playground

Six tiny interactive worlds (3 in 2D, 3 in 3D) with **fully synthesized audio** — there are no sound, image or model files. Best with headphones.

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

Settings (gear on the menu): volume, ambient music, haptics, graphics quality (Auto / High / Battery saver). `Esc` returns to the menu.

## Develop

```bash
npm install
npm run build   # writes docs/hush.js, docs/hush.html, docs/index.html, docs/style.css
npm start       # dev server with live rebuild at http://localhost:8080
```

Source is plain ES modules in `src/`; `build.mjs` bundles with esbuild. Each game is a module exporting `create(env)` (see `src/games/`).
