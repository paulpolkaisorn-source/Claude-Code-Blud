# SCAR 18 lid GIFs (AniMe Vision)

Three looping animations for the AniMe Vision LED stripe on the ROG Strix SCAR 18 (2026, G835 / G835LXG) lid.

| file | length | what it does |
|---|---|---|
| `glitch_meltdown.gif` | 4.0 s, 80 frames | scanline reveals "SCAR 18" → bright/half-bright split jitter → horizontal tear + 2-frame white flash → rebuild from static |
| `heartbeat_reactor.gif` | 5.0 s, 100 frames | flat line → 3 beats, each taller and faster → mirrored visualizer pulsing out from the centre → full-length lightning bolt → collapse to the flat line |
| `boss_fight_hud.gif` | 6.0 s, 120 frames | health bar fills → hits with white flash, stutter drain and damage numbers → near-zero blink → wipe to "GG" → wipe back to the empty bar |

`<name>_preview.gif` simulates the 810 LEDs. `<name>_sheet.png` and `<name>_keyframes.png` show single frames from that simulation.

## Specs used
These come from the scar18-lid-gif skill's stripe model (`engine/assets/stripe.json`):
- GIF 564x400, black outside the slanted band.
- ~810 white-only LEDs, ~64 LEDs along the band by ~14 across, at 35°.
- 8 brightness steps: 0, 36, 73, 109, 146, 182, 219, 255.
- 20 fps, every frame 50 ms (constant timing), loops forever.

The band is a trapezoid: its lower (inner) rows are much shorter than the outer edge. Everything important keeps at least half an LED clear of the band edge, and `verify.py` checks this on every frame.

## Rebuild after tweaking
You need Python 3.9+, Pillow and NumPy (`pip install pillow numpy`). Every timing and brightness value is a named constant at the top of each animation's `.py`.

```
cd lid-gifs
python build.py                  # all three (or: python build.py boss_fight_hud)
```

`build.py` renders through the bundled engine (`engine/`, a copy of the skill's scripts) and then runs `verify.py`. `verify.py` reports size, frames, delays, KB, the skill's validator, the loop seam, full-white flashes and edge clipping, and writes the keyframe sheets. If you recalibrate the stripe, set `LIDGIF_STRIPE=path/to/stripe.json` before building.

## Import (Armoury Crate)
1. Armoury Crate > AniMe Vision > set the mode dropdown to **Animation Mode**.
2. Click **Insert Image** and pick the `.gif`.
3. Don't zoom, rotate or drag it. It is already sized to the stripe.
4. On the slot, choose `N Loop` or turn on **Use Second**.
5. **Apply Effect**.

## Not verified (no laptop here)
- The real import and playback in Armoury Crate.
- Whether it plays 50 ms frames at full speed (the 2-frame flash is 100 ms only if it does).
- The physical LED grid orientation, and how many brightness steps the LEDs really separate.
- `stripe.json` was measured from an editor screenshot (`verified_on_device: false`).

If an animation sits off the stripe, use the skill's calibration GIF (`engine/scripts/calibration.py`) and `measure_stripe.py`.
