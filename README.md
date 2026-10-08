# Claude-Code-Blud
For Mr. CLAWD

# VELVET HOURS

A cozy, fail-state-free sensory sandbox: four tactile stations on a soft-lit desk, built as **one standalone HTML file** (`velvet-hours.html`) that runs offline by double-clicking it. No CDN, no fetched assets, no audio or image files. Everything (geometry, textures, shaders, sounds) is generated in code.

## Play

Open `velvet-hours.html` in a current Chrome, Edge, Firefox or Safari. Tap **Tap to begin** (sound starts on that gesture; headphones recommended).

| Station | What to do | Sound |
| --- | --- | --- |
| 1 · Kinetic Sand | Press and drag across the block to slice it. Pointer height sets the cut depth. | Crunch and grain ticks scale with cutting speed; a soft hiss follows the drag. |
| 2 · Glass | Tap a crystal. Taps are tuned to a pentatonic scale, with long reverb tails. | Inharmonic bell tones; ripples of light cross the desk. |
| 3 · Slime | Poke it to wobble it. Press and drag on it to stretch it. | Squelch whose pitch follows stretch speed; a drag tone while stretching. |
| 4 · Bubbles | Pop bubbles, or drag across them to pop a row. The sheet re-inflates when it is empty. | Three randomised pop timbres (crisp, thock, crackle), pitch jittered per pop. |

**Keyboard:** `1`–`4` or `Q`/`E` switch stations. Arrow keys move a virtual cursor; `Space` or `Enter` acts (hold to drag). Every station works this way.

**Settings** (gear, top right): quality (Auto, Low, High, Ultra), volume, mute, per-station mix, reduce effects, flow meter. Settings and total time in the room are saved in `localStorage`.

The **flow meter** rises as you keep up a rhythm and falls when you stop. It also opens the quiet generative pad underneath. There are no scores, timers or failure states.

## Build

Requires Node 18 or later.

```bash
npm install
npm run build        # writes velvet-hours.html (about 0.67 MB)
npm run dev          # rebuilds on every change under src/
```

Dependencies are pinned: `three@0.186.1`, `animejs@4.5.0`, and `esbuild@0.28.2` as a build-only tool. `build.mjs` bundles `src/main.js` with esbuild, minifies the JS and CSS, and inlines both into `src/template.html`.

## Source layout

```
src/
  main.js              boot, WebGL check, start screen
  template.html        page shell (inlined by build.mjs)
  styles.css           HUD, panel, start screen, responsive rules
  engine/
    app.js             renderer, post chain, camera dolly, input routing, frame loop, flow meter
    quality.js         Low/High/Ultra tiers and the rolling frame-time monitor
    room.js            desk, felt pads, lights, generated environment, dust motes
    shaders.js         shader patches: ripples, sand slits, slime wobble and subsurface rim
    postfx.js          final pass: aberration, peripheral softening, vignette, grain
  audio/
    engine.js          AudioContext, master chain (high shelf, compressor), generated reverb, buses
    voices.js          every sound: crunch, hiss, chime, squelch, slime tone, pops, room tone, pad
  stations/
    sand.js  crystal.js  slime.js  bubble.js  index.js
  ui/
    hud.js             dock, title, flow ring, settings panel, wipe transition, toast
    settings.js        localStorage with try/catch around every access
  utils/               math, noise, springs and fixed-step loop, procedural textures
```

## Notes

- **Quality:** Auto starts at High and watches frame times against the display's own cadence (measured at startup), so 60, 120 and 144 Hz screens are all judged fairly. It lowers pixel density first, then the tier, and raises them again when there is headroom. Low, High and Ultra pin the tier. Ultra uses a higher pixel-density cap; it does not use MSAA.
- **Frame rate:** the loop is `requestAnimationFrame` with no cap of its own, so it runs at the display's refresh rate. A browser cannot render faster than the display refreshes.
- **Reduced motion:** the system preference, or the "Reduce effects" toggle, cuts camera shake, grain, aberration and bloom pulses, and shortens transitions.
- **Context loss:** the page shows a message, pauses rendering and resumes when the context is restored.
- **Debugging:** the running app is exposed as `window.velvetHours.app`.
