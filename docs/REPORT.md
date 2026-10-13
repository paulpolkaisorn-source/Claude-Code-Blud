# GrandMaster: final report

## 0. Read this first: what was and was not tested

This work ran in a **cloud Linux container with no access to your Windows PC**. I could not
start Unishade or Roblox, press Ctrl+F9, or read your `Unishade.log` / `ReShade.log`.
So **none of the numbers below were measured on your machine, and none of the images are
captures of Roblox.** Here is what was done instead.

| Your workflow step | What I did instead | What is still on you |
|---|---|---|
| Compile in Unishade, check `ReShade.log` | Built **ReShade's own FX compiler** (crosire/reshade, `source/effect_*.cpp`) from source and compiled GrandMaster.fx with it. Every one of the 23 entry points was then compiled through **both** back-ends: HLSL SM5 output checked by **DXC**, GLSL output checked by **glslang**. 46/46 stages pass with no warnings. | Run `Install-GrandMaster.ps1`; it checks for the "Successfully compiled … GrandMaster.fx" line itself. |
| Ctrl+F9 before/after in Roblox | A headless executor runs the **compiled effect exactly as ReShade would** (same passes, render targets, mips, samplers, uniforms) on Mesa's software GPU. Inputs are **synthetic Roblox-like scenes** (glossy floor, water, sun/sky, UI overlay, bricks/studs/rock, night neon), plus a simulated Depth-Anything depth: 266×154, blurred, noisy, gamma-distorted, upscaled. | `Test-GrandMaster.ps1 -Scene floor` (and water, sky, ui, texture) captures real Ctrl+F9 pairs and computes the same metrics. The C# metric code is verified to give **identical** numbers to my Python harness. |
| `processing_ms` / `present_fps` table | A per-pass cost profile at 3840×2304 on a CPU rasterizer (relative only), plus a fetch-count GPU estimate. | `Test-GrandMaster.ps1` measures Off / Balanced / Ultra / Reality from your State lines and writes the table. |

My honest expectation is that the shader compiles and runs in Unishade. The remaining
unknowns are Unishade-specific: how its depth buffer is encoded, its State-line format, and
its ReShade version. GrandMaster auto-detects the depth encoding, and the debug views let
you check it in seconds.

## 1. Deliverables

| Item | Path (repo) | Install target |
|---|---|---|
| Effect | `Unishade/reshade-shaders/Shaders/Custom/GrandMaster.fx` | `…\reshade-shaders\Shaders\Custom\GrandMaster.fx` |
| Include | `Unishade/reshade-shaders/Shaders/Custom/GrandMaster/GM_Common.fxh` | `…\Custom\GrandMaster\GM_Common.fxh` |
| Docs | `Unishade/reshade-shaders/Shaders/Custom/README.md` (passes, every uniform, tuning) | `…\Custom\README.md` |
| Presets | `Unishade/presets/GrandMaster_{Balanced,Ultra,Reality}.ini` | `…\presets\` |
| Install / restore | `tools/Install-GrandMaster.ps1`, `tools/Restore-RobloxPreset.ps1` | run from the repo |
| On-machine test | `tools/Test-GrandMaster.ps1`, `tools/Compare-Shots.ps1` | run from the repo |
| Design doc | `docs/DESIGN.md` | |
| Evidence | `docs/evidence/` (scenes, debug buffers, zooms, metrics) | |
| Test harness (Linux) | `tools/linux-harness/` | |

## 2. Results per goal (synthetic scenes, 1280×768, evidence in `docs/evidence`)

### Goal 1: reflections. **Met on the test scenes.**
* Floor: the boxes, character and back wall are mirrored under their bases with correct
  perspective convergence (`debug/floor_reflection_trace_rgb_alpha.png`,
  `zoom/evidence_reflection_zoom.png`). Fresnel makes the far floor reflect more than the
  near floor.
* Water: the red box and the island reflect with ripple distortion taken from the water's own
  shading. The water keeps its colour; there is no milky double sky
  (`scenes/water_off_balanced_ultra_reality.png`).
* Night: neon reflects as long streaks on the glossy floor (`scenes/neon_*`).
* Stability, camera still, dither off: once settled (≥30 frames), the frame-to-frame change is
  **≤1 level** in floor/sky/ui/texture/neon and ≤4 levels on 3 pixels in water
  (`metrics/stability_final.txt`). Jitter freezes when the frame is static, so accumulation
  converges exactly.
* Screen edges: rays fade to the measured sky colour (never black). Hits in the top-bar band
  or on UI are rejected. No streaks appeared at borders in any scene.
* Not reflective, by design and verified: grass, the studs baseplate (Balanced/Reality),
  bricks, the white UI panel.

### Goal 2: detail. **Met on the test scenes.**
* Edge energy up 20–64% on daylight scenes, about 2× in the night neon scene (mostly from
  bloom + reflections).
* Bricks, rock and studs visibly crisper (`zoom/evidence_detail_zoom.png`).
* Halo/ringing: the mean overshoot beyond the source's local 7×7 range at strong edges is
  0.007–0.019 of full scale (1.7–4.9 levels). The worst 0.1% of edge pixels reach
  0.034–0.061 (9–15 levels), in Ultra (detail plus reflections). No visible halos or ringing
  in the 3× zooms.
* Deband runs before sharpening: 8-bit banding rings on the night floor are removed
  (`zoom/neon_floor_deband.png`).

### Goal 3: bloom. **Met on the test scenes.**
* Neon pink/cyan and lamps glow softly. Daylight scenes change by ≤ +0.2 levels on average,
  so there is no haze.
* UI: the white SHOP panel's text contrast is **0.799 → 0.818–0.822** (unchanged to slightly
  better). The HUD text over the night scene is 0.899 → 0.926–0.938. Text pixels are
  untouched (`zoom/evidence_ui_zoom.png`).
* Two real bugs were found and fixed during testing: the original luminance threshold never
  triggered on saturated Neon, and the clipped sun was misread as a "flat white UI panel".

### Goal 4: ultra stack. **Done in the requested order, in 22 passes with one at full resolution.**
Linearize → reflections → AO → detail → bloom → filmic curve → vibrance grade → dither.
The highlight expansion and its inverse are exact, so with every effect at zero the output
equals the input (except the 1-LSB dither).

### Goal 5: reality. **Met on the test scenes.**
* Mean RGB change versus input: Balanced ≤ 2.9 levels; Ultra ≤ 4.4 (blue channel, from sky
  reflections); Reality ≤ 4.1 (floor/UI, from contrast + haze). White balance is neutral by
  default, and grain/vignette are off.
* Vibrance is muted-first with skin and neutral protection. Highlight desaturation applies
  only to *added* light.

### Goal 6: speed. **Not measured on your GPU (see §4). Estimated to fit the budget.**

## 3. Metrics (synthetic scenes)

`metrics/presets_table.md`. Values are 8-bit levels; edge energy is mean luma gradient;
halo is overshoot past the source's 7×7 min/max at strong edges, in 0–1 luma units.

| scene | preset | mean RGB in | mean RGB out | edge energy in→out | halo mean / p99.9 |
|---|---|---|---|---|---|
| floor | Balanced | 158.0, 163.6, 171.9 | 160.1, 166.2, 174.7 | 0.0068→0.0095 (+39%) | 0.0117 / 0.037 |
|  | Ultra |  | 160.7, 167.3, 176.2 | 0.0068→0.0095 (+39%) | 0.0163 / 0.055 |
|  | Reality |  | 162.2, 167.9, 175.9 | 0.0068→0.0090 (+32%) | 0.0154 / 0.042 |
| water | Balanced | 88.5, 133.3, 139.0 | 89.0, 133.2, 139.7 | 0.0111→0.0147 (+33%) | 0.0060 / 0.043 |
|  | Ultra |  | 90.8, 133.7, 140.6 | 0.0111→0.0152 (+37%) | 0.0092 / 0.061 |
|  | Reality |  | 91.2, 133.6, 140.0 | 0.0111→0.0138 (+25%) | 0.0069 / 0.050 |
| sky/sun | Balanced | 120.2, 142.7, 130.2 | 120.1, 142.9, 130.9 | 0.0083→0.0125 (+51%) | 0.0075 / 0.034 |
|  | Ultra |  | 120.1, 143.2, 131.5 | 0.0083→0.0135 (+63%) | 0.0127 / 0.046 |
|  | Reality |  | 120.8, 142.8, 131.2 | 0.0083→0.0123 (+49%) | 0.0099 / 0.039 |
| UI panel | Balanced | 164.5, 171.7, 178.2 | 166.3, 173.9, 180.5 | 0.0122→0.0149 (+22%) | 0.0057 / 0.039 |
|  | Ultra |  | 166.8, 174.6, 181.6 | 0.0122→0.0150 (+23%) | 0.0080 / 0.058 |
|  | Reality |  | 168.3, 175.3, 181.6 | 0.0122→0.0145 (+19%) | 0.0076 / 0.043 |
| texture | Balanced | 100.5, 127.1, 93.8 | 100.2, 127.4, 94.0 | 0.0107→0.0150 (+40%) | 0.0123 / 0.035 |
|  | Ultra |  | 100.1, 127.5, 94.5 | 0.0107→0.0153 (+43%) | 0.0182 / 0.049 |
|  | Reality |  | 102.2, 128.5, 96.1 | 0.0107→0.0145 (+35%) | 0.0147 / 0.041 |
| night neon | Balanced | 23.4, 24.7, 34.6 | 25.4, 24.9, 37.9 | 0.0030→0.0062 (+105%) | 0.0084 / 0.034 |
|  | Ultra |  | 25.3, 24.5, 38.6 | 0.0030→0.0064 (+111%) | 0.0118 / 0.045 |
|  | Reality |  | 24.4, 24.1, 36.1 | 0.0030→0.0062 (+103%) | 0.0123 / 0.053 |

UI-specific (UI scene): mean abs change inside UI boxes 2.6 / 3.9 / 3.7 levels versus outside
3.6 / 5.5 / 5.2 (Balanced / Ultra / Reality). The maximum change inside the SHOP panel is
16 / 21 / 26 levels, on its border pixels only. No non-finite values appeared in any buffer,
scene or resolution (also tested at 1366×768 and 3840×2304).

### Robustness to Unishade's unknown depth encoding (`metrics/robust_final.txt`)

| Simulated encoding | Polarity detected | Response detected | Floor normal (true ≈ 0.95,−0.31) |
|---|---|---|---|
| linear depth, near = 0 | +1 ✔ | linear ✔ (vote +0.51…+0.72) | 0.91, −0.41 |
| disparity-like | +1 ✔ | disparity ✔ (vote −0.40…−0.81) | 0.91, −0.42 |
| linear, inverted (near = 1) | −1 ✔ (by frame 10) | linear ✔ | 0.91, −0.41 (neon: settles in ~1 s) |

## 4. Performance

### What I can show: relative per-pass cost at 3840×2304 (CPU rasterizer, Mesa llvmpipe)

These are **CPU milliseconds on a 4-core software renderer, not GPU time.** They only show
where the cost goes. Full table: `metrics/perf_table.md`.

| | Balanced | Ultra | Reality |
|---|---|---|---|
| Composite (only full-res pass) | 574 | 547 | 514 |
| Geometry (¼) | 143 | 175 | 143 |
| SSR (½) | 95 | 167 | 116 |
| SSRResolve (½) | 72 | 73 | 50 |
| Prep (½) | 58 | 57 | 54 |
| everything else | 73 | 87 | 72 |
| **total (CPU ms)** | **1015** | **1106** | **949** |

Optimizations made from this profile, with output differences of 0.05–0.17 levels mean:
- bloom final upsample: 8 taps → 1 (the source is already tent-filtered);
- prep: 9 taps → 4 (the box average comes from the 4 exact taps);
- empty-neighbourhood early-out in the resolve pass;
- deband only in flat regions;
- AO, coarse detail and UI work skipped where they can't contribute;
- jitter frozen when static.

Total went from 1079 to 975 at that stage (−10%). Later quality fixes (the roughness
analysis) added some of it back.

### Estimate for your GPU

The fetch-count model in `docs/DESIGN.md` gives **≈1.5–3 ms GPU time at 3840×2304** for
High/Ultra, against your ~6 ms budget. **This is an estimate, not a measurement.**

### Your numbers (please run)

```
powershell -ExecutionPolicy Bypass -File .\tools\Test-GrandMaster.ps1 -Scene floor
```

It fills this table from your State lines and also writes `report.md` / `results.json`
plus Ctrl+F9 shots and ×4 diff maps:

| preset | processing_ms (mean / p95) | present_fps | capture_fps | fps vs Off |
|---|---|---|---|---|
| Off | ? | ? | ? | — |
| Balanced | ? | ? | ? | ? |
| Ultra | ? | ? | ? | ? |
| Reality | ? | ? | ? | ? |

If Ultra exceeds the budget: set **General → Quality = High** (the default; it looks
near-Extreme). Then try `GM_SSR_Temporal` 0.9 with Balanced. Then reduce Unishade "Effect
resolution", which GrandMaster follows automatically.

## 5. What does not work, or works only approximately

* **Not verified on Roblox/Unishade itself** (see §0). The State-line regex accepts
  `processing_ms=3.2`, `processing_ms: 3.2` and `processing_ms 3.2`. If your log uses another
  format, the perf table comes out empty: send me a State line and I'll adapt it.
* **Mirrors are reconstructed, not real.** The reflection is the screen image mirrored about
  each object's contact line with the fitted floor plane.
  * Objects not touching the floor (floating parts, jumping avatars) reflect as if they stood
    on it.
  * Overhangs and object backsides cannot appear, since they aren't on screen.
  * Thin posts give slightly ragged mirror edges.
* **Studs baseplate in Ultra:** very sparse patterns close to the camera can read as glossy,
  leaving faint smudges. Balanced and Reality are clean. A wider analysis window fixed this
  but made glossy floors patchy, so I reverted it.
* **Non-floor reflections** (`GM_SSR_Vertical`) are off by default. Vertical geometry is
  where estimated depth is worst.
* **AO** is deliberately mild. It gives contact shadows at bases; on vertical faces it shows
  faint low-frequency mottling from estimator noise (`debug/ao_floor_texture.png`).
* **Depth lag:** if Unishade updates depth slower than the game frame rate, reflections and
  AO trail slightly during fast camera moves. The motion detector re-enables jitter while
  moving, and scene cuts re-converge within ~6 frames.
* **Inverted-depth encodings** settle within ~1 s after start. Set *Depth polarity = Flip* to
  skip even that.
* **Haze** distance is normalised per frame (estimated depth has no units), so some haze
  always sits on the farthest part of any view. Defaults are subtle; Reality is slightly
  stronger.

## 6. Limits of the estimated-depth approach (why the design looks like this)

1. **Affine ambiguity:** relative inverse depth has an unknown scale *and* shift. The scale
   cancels in projective math; the shift bends planes. Hence: normals from inverse-depth
   slope, planarity from its second difference, and auto linear/disparity selection.
2. **266×154 resolution:** each estimate texel is ~14 px at 4K, so silhouettes are blurred
   over ~30 px. Hence colour-guided snapping, colour-guided one-sided stencils, the slope test
   against the floor plane, and silhouette/sky exclusion.
3. **Normals are ±5–15° noisy.** Reflection doubles a normal error, hence the frame-wide floor
   plane and the contact-mirror trace.
4. **No material information.** Gloss is inferred from texture busyness at three scales
   (flat-colour SmoothPlastic, glass and water read as glossy; grass, studs and bricks as
   rough). It is a heuristic and can be wrong.

## 7. Recommended Unishade settings

These follow from the design; I could not test Unishade's settings themselves.

* **Depth detail / DepthSize:** keep the default (~266×154) or go one step higher. The
  stencils are sized for 266-wide estimates; higher is fine and sharpens reflection contacts,
  but costs inference time in `processing_ms`. Lower than default makes object bases soft.
* **Effect resolution:** native (100%) for best detail. If over budget, 75% before turning
  GrandMaster down. All analysis windows are in screen fractions, so the look holds.
* In GrandMaster: start with **Debug view → Depth** once; leave *Depth source / polarity /
  response* on Auto unless that view looks wrong.

## 8. Restoring your original Roblox preset

`Install-GrandMaster.ps1` prints the original value and saves the untouched file as
`RobloxShadeHost.ini.bak_claude` (made once, never overwritten). **I do not know your
original value**, since I couldn't read your machine; the script shows it to you. To restore:

```
powershell -ExecutionPolicy Bypass -File .\tools\Restore-RobloxPreset.ps1
:: or also remove all GrandMaster files:
powershell -ExecutionPolicy Bypass -File .\tools\Restore-RobloxPreset.ps1 -RemoveGrandMaster
```

Manual fallback: open `RobloxShadeHost.ini.bak_claude`, copy the `Roblox=` line under
`[GamePresets]` into `RobloxShadeHost.ini`, and restart Unishade.

Tested here against a fake Unishade folder (UTF-8 BOM + CRLF, a decoy `Roblox=` key in
another section):
- install changes exactly that one value;
- restore makes the file byte-identical to the original;
- your current preset file is not modified.

## 9. Development log (improve → test cycles)

**Reflections:**
1. Mask failed at object bases → colour-guided one-sided stencils and inverse-depth normals.
2. Grass mirrored the sky → measured roughness thresholds (flat ≤0.002, grass ≥0.015).
3. Edge-adjacent floor read as rough → Kuwahara variance.
4. Normal error doubled in reflections → frame floor plane plus contact-mirror trace.
5. Stretched mirrors → contact reconstructed from occluder depth, plus mirror validation.
6. UI panel mirrored onto the floor → half-res UI mask.
7. Silhouette ramps → slope test against the floor plane.
8. Residual shimmer at reflection edges → static-frame jitter freeze.

**Bloom:**
1. Haze from bright floors → threshold 0.85 / knee 0.3.
2. Sun glow invisible → strength sweep (measured ring deltas).
3. Neon never bloomed → max-channel threshold.
4. Sun treated as UI → sky-aware UI mask.
