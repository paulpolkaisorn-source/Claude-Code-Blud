# Sundown Audio subwoofer – 3D model from 5 photos

A fully procedural, photo-fitted 3D model of the competition subwoofer in the five reference pictures
(`refs/1..5.webp`). Everything – geometry, carbon-fibre weave, embossed lettering and logos, studio lighting –
is generated in code, so the result is deterministic and editable.

| Deliverable | Where |
| --- | --- |
| Interactive viewer (single self-contained HTML, works offline) | `dist/index.html` |
| Binary glTF (metres, +Z = front of the speaker, PBR textures embedded) | `out/sundown-subwoofer.glb` |
| Source | `src/` |

Open `dist/index.html` in a browser: drag to orbit, scroll to zoom, right-drag to pan. The preset buttons jump to
the cameras that were recovered from the photos (front, front ¾, two rear ¾ views, cone close-up).
"Download .glb" exports the current model from the page.

## What is modelled

* **Mounting flange** – gloss-black ring, 8 mounting holes with raised bezels, 8 screws, 8 recessed brand plates
  (`SUNDOWN / AUDIO`), rear fasteners.
* **Roll surround** – tall half-round matte rubber roll.
* **Cone** – carbon-fibre twill with clear-coat, stitched seam rows and black edge tape; gloss-black back side.
* **Dust cap** – carbon dome, polished rim, white Sundown Audio logo.
* **Basket** – 4 cast spokes with raised rails and cross-ribs, large windows, stepped neck, 2 push terminals in a cup.
* **Motor** – chrome flared collar with bolts, matte blasted band with embossed `SUNDOWN AUDIO INHUMAN` lettering,
  alien-head and hornet emblems, black rubber lip, convex chrome end dish with brushed vent plate (16 + 8 vent
  holes) and nickel pole bore.

## How the model was matched to the photos

1. Silhouettes (alpha) were extracted from the photos.
2. A symmetric **chamfer distance** between photo and model outlines drives a stochastic search over the camera of
   each photo (yaw / pitch / roll / distance / principal point), one lens shared by the oblique shots, and the shared
   dimensions of the model (`tools/fit4.mjs`). Plain IoU turned out to be too forgiving for such blobby shapes.
3. The clocking of the cone logo, band lettering, emblems and terminal bay was measured per photo by rendering
   marker colours and matching their projected positions (`tools/spinscan.mjs`, `tools/spin.mjs`).
4. Materials/lighting were tuned by rendering photo | render | blend sheets (`tools/compare.mjs`,
   `tools/pose_cmp.mjs`, `tools/sbs.py`, `tools/blend.py`).

Dimensions are in inches (flange outer diameter 16″, overall depth ≈ 12″ including the roll); the GLB is scaled
to metres. The numbers live in `src/params.js`.

## Build

```bash
cd subwoofer
npm install
npm run build        # -> dist/index.html (add --min for a minified bundle)
npm run export       # headless Chromium -> out/sundown-subwoofer.glb
```

Headless rendering uses the pre-installed Chromium with SwiftShader (`tools/browser.mjs`).

## Honest limitations

* The photos show only one side of the speaker, so hidden surfaces (e.g. the far side of the basket) are plausible
  reconstructions, not measurements.
* Exact casting details of the basket (ladder ribs, fillets), the real logo artwork and the font of the lettering are
  approximated by hand-built vector shapes.
* Absolute size is estimated from the photos (the flange is assumed to be 16″); there is no scale reference in them.
