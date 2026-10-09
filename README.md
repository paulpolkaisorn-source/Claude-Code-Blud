# Claude-Code-Blud
For Mr. CLAWD

## Palm Cove Pool (`resort-pool/`)

A real-time 3D resort swimming pool with three switchable kinds of water physics, built on three.js r170. Every texture is generated in code; the only network loads are three.js from jsDelivr and two Google Fonts.

### Run it

ES modules need a web server, so opening the file directly won't work:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/resort-pool/
```

It needs a browser with WebGL2.

### What you can do

- Drag on the water to make ripples and wakes. Drag a float to tow it around. Orbit with the mouse (pinch and drag on touch).
- **Water modes** (settings panel):
  - **Waves**: a spectral (DCT) solver of the gravity-wave equation over the whole surface. Waves disperse, reflect off the walls and interfere, and the water volume is conserved exactly.
  - **Spray**: waves plus ballistic splash droplets from impacts, fast drags and things dropping in. Each droplet makes a ripple where it lands.
  - **Particles**: a true 3D FLIP/PIC fluid. About 29.6k particles on a 48×10×24 grid run in a Web Worker. The surface is rebuilt from the particles and rendered with the same water shading. Tick "Show particles" to see them.
- **Drop in**: beach ball, ring float, rubber duck, inflatable mattress, cannonball. These are rigid bodies with exact immersed volume for their shape, buoyancy, drag and added mass. They make waves, ride other bodies' waves and bump into each other. The cannonball splashes, sinks and rests on the floor.
- **Weather and light**: rain (rings on the surface and falling streaks), wind (surface chop), and time of day (moves the sun and sky, from morning to sunset).
- **Quality**: low, medium or high. This sets the reflection and caustics resolution, the shadow map size and the pixel ratio.

### Rendering

The water uses:
- planar reflections;
- refraction that takes depth into account;
- Beer–Lambert absorption, so deeper water looks bluer;
- GGX sun glints;
- caustics on the floor and walls, computed from the surface shape each frame.

The scene has a physical sky with PMREM environment lighting, soft shadows and ACES tone mapping. The resort around the pool is all procedural: a villa, a thatched cabana bar, palms, loungers, parasols, a travertine and teak deck, the beach and the sea.

### Files

| File | What it is |
|---|---|
| `index.html` | Page shell, settings panel styles, import map |
| `resort.js`, `ui.js` | App bootstrap, main loop, pointer input, settings panel |
| `scene/*.js` | Procedural resort: pool shell, terrace, villa, props, plants, palms, sky, textures |
| `water.js` | `PoolWater`: wave solver, water shading, caustics, floating bodies, spray, rain |
| `fluid.js`, `fluid-sim.js`, `fluid-config.js` | `ParticleFluid`: FLIP/PIC simulation (worker with a main-thread fallback) and surface reconstruction |
| `pool-config.js` | Shared pool dimensions, floor profile and heightfield layout |

Debug handle: `window.__pool` exposes `water`, `fluid`, `setMode`, `renderer`, `scene` and `camera`. Add `?fluid=main` to the URL to run the fluid on the main thread.
