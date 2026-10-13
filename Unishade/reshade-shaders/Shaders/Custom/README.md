# GrandMaster for Unishade + Roblox

One ReShade FX technique that adds **reflections, contact AO, multi-scale detail, natural
bloom, a reversible filmic tone curve and a restrained colour grade** to Roblox frames
captured by Unishade. It is built for Unishade's *estimated* depth (depth-anything-v2-small,
about 266×154): nothing assumes a real depth buffer.

Files:

```
Custom/GrandMaster.fx             the effect (technique "GrandMaster")
Custom/GrandMaster/GM_Common.fxh  helpers (colour, noise, safety)
presets/GrandMaster_Balanced.ini  cheapest, subtle
presets/GrandMaster_Ultra.ini     strongest reflections / detail / glow
presets/GrandMaster_Reality.ini   physical F0, energy-conserving glow, restrained colour
```

## Quick start

1. Install with `tools/Install-GrandMaster.ps1` (from the repo root). It backs up
   `RobloxShadeHost.ini` to `.bak_claude`, changes only `Roblox=` and restarts Unishade.
2. Check `ReShade.log` for `Successfully compiled ... GrandMaster.fx`.
3. In the ReShade overlay (Ctrl+F8), set **General → Debug view = Depth (conditioned)**.
   Near objects must be dark and far objects light, with the sky drawn light blue. If it's
   inverted, the auto polarity is already flipping it. If it's all black or all white, change
   **Estimated depth → Depth source** to *Raw buffer value*. Then set Debug view back to *Off*.
4. Pick a preset with Ctrl+PageUp/PageDown or edit sliders live.

## How it works (pipeline)

Only **one** pass runs at full resolution. Everything expensive runs at half or quarter
resolution and is upsampled with colour-guided (joint-bilateral) filters.

| # | Pass | Resolution | Output (format) | What it does | Tex fetches / px (High) |
|---|---|---|---|---|---|
| 1 | Prep | ½ | ColorH RGBA16F + 6 mips, UIH R8 | sRGB→linear, reversible highlight expansion, 2×2 box, UI-likeness mask | 6 |
| 2 | Stats | 6×1 | RGBA32F | depth polarity vote, depth-response vote, log-depth mean/σ, sky colour, floor plane, global motion | ~100 (6 px) |
| 3 | StatsCopy | 6×1 | RGBA32F | history | 1 |
| 4 | SmallCopy | 1/32 | R16F | previous-frame thumbnail for static-camera detection | 1 |
| 5 | DepthQ | ¼ | RG16F + B1 RGBA16F | depth read + temporal de-flicker; bloom prefilter (Karis, soft knee on max channel, erosion) | 13 |
| 6 | DepthQCopy | ¼ | R16F | depth history | 1 |
| 7 | DepthSnap | ¼ | RG16F | colour-guided edge snapping of the soft estimated depth (only where depth has an edge) | 13 |
| 8 | Geometry | ¼ | 3× MRT | inverse-depth-gradient normals with colour-guided one-sided stencils, planarity, floor test vs frame floor plane, 3-scale Kuwahara roughness, water, AO | ~75 |
| 9 | SSR | ½ | RGBA16F | planar contact-mirror trace (floors/water) or screen-space march (other glossy parts), Fresnel, sky fallback | 5 (early-out) – 37 |
| 10 | SSRResolve | ½ | RGBA16F | roughness-aware depth-weighted blur + temporal accumulation with variance clipping | 4 (early-out) – 23 |
| 11 | SSRCopy | ½ | RGBA16F | history | 1 |
| 12–21 | Down2…6, Up5…1 | ⅛ … 1/128 | RGBA16F | dual-filter bloom pyramid, alpha carries a multi-scale local mean for clarity | 5–8 |
| 22 | Composite | full | back buffer | deband → detail → reflections → AO → haze → bloom → exposure/WB → exact inverse curve → highlight desat → vibrance → contrast → UI grade protection → dither | 28–36 |

Approximate VRAM at 3840×2304: about 110 MB.

### The parts that matter for estimated depth

* **Scale-free depth.** Estimated depth has no units, and every projective step is invariant
  to a global depth scale. Thresholds are relative (Δz/z), and "distance" for haze and fades
  is normalised per frame from the scene's own log-depth statistics.
* **Auto polarity and auto response.** The top/bottom-of-screen vote decides near/far.
  A majority vote decides whether the buffer behaves like linear depth or like inverse depth
  (disparity): it picks whichever reading makes the blocky Roblox scene more planar. Both
  votes have hysteresis.
* **No raw per-pixel normals.** Normals come from the slope of *inverse* depth, which is
  exactly affine on a plane, measured over a stencil of ~1.5 depth-estimate texels. Each
  side of the stencil is weighted by colour similarity, so a floor pixel next to a wall only
  uses floor samples.
* **Reflections that need only the floor's orientation.** One floor plane is fitted per
  frame over the whole screen (no camera roll in Roblox). For floor and water pixels the trace
  marches along the reflected direction until the estimated depth leaves that plane. That
  contact is reconstructed from the occluder's own depth, which makes it robust to the blurry
  estimate. The trace then mirrors about the contact in 3D. For a horizontal reflector and
  vertical objects this is exact. It never relies on per-pixel normal accuracy, because a 6°
  normal error would become a 12° reflection error. If the mirrored point is not on the
  occluder (the object is shorter than the mirror height), the trace continues to the next
  contact behind it, as a real ray would.
* **Stable when still.** Ray jitter is only active while the frame is moving. A still frame
  uses a fixed pattern, so temporal accumulation converges exactly with no shimmer.

### UI protection

Roblox UI is kept free of local effects (reflections, AO, sharpening, bloom-onto and
bloom-from):

* the top bar band (`GM_UI_TopBar`, default 5% of the height, soft edge),
* high-contrast near-white achromatic strokes (text, icons, chat),
* perfectly flat near-white achromatic areas (white panels; real lit surfaces nearly always
  carry a shading gradient). The clipped sun is excluded via depth.

Reflections also reject hits that land on UI, so panels are never mirrored onto the floor.
Bloom ignores thin bright strokes through morphological erosion in the prefilter.

## Debug views (General → Debug view)

| View | Expect |
|---|---|
| Depth (conditioned) | near dark → far light, sky light blue |
| Normals | floors greenish, camera-facing walls blue/purple, smooth (no noise) |
| Reflection mask | only flat glossy floors / water, not grass, studs, walls |
| Reflections only | mirrored objects under their bases; black where nothing reflects |
| Ambient occlusion | white with soft dark contact lines at object bases |
| Bloom only | glow around bright lights / sun / neon only |
| UI protection mask | red = text/panels, green = everything protected, blue = top bar |
| Detail delta | grey 0.5 = unchanged; texture detail visible; no halos around edges |
| Roughness / water / planarity | R = rough, G = water, B = planar |

## Tuning tips

* **Reflections too weak or strong:** `GM_SSR_Strength` (Fresnel multiplier) first, then
  `GM_SSR_F0`. Floors far from the camera reflect more than near ones (Fresnel), as in reality.
* **Rough floors reflecting:** raise `GM_SSR_TexGloss` (default 1.0, the maximum) or lower
  `GM_SSR_Gloss`.
* **Reflections on walls/glass parts:** `GM_SSR_Vertical` (default 0). Estimated depth is
  least reliable on vertical geometry, so expect approximate results.
* **Glow too strong in daylight:** keep `GM_Bloom_Adapt` high. For a softer core, raise
  `GM_Bloom_Conserve` (1 = fully energy conserving, no brightening).
* **Crunchy distance:** raise `GM_DetailDistanceFade`.
* **Halos:** lower `GM_Overshoot` (0 = output can never leave the local 3×3 min/max). The
  clarity band is bell-shaped and ignores strong edges by design.
* **UI still affected:** adjust `GM_UI_TopBar` to your top bar height. `GM_UI_GradeProtect`
  (default 1) keeps detected UI at its exact colours. Coloured flat buttons are not detected
  (they look like flat plastic parts), so lower `GM_Vibrance` if they get too saturated.
* **Unishade "Effect resolution":** everything scales automatically. Analysis windows are
  defined in screen fractions, so the look stays the same at 1080p and 4K.

## Uniform reference

| Uniform | Label | Default | Balanced / Ultra / Reality | Range | Notes |
|---|---|---|---|---|---|
| **General** | | | | | |
| `GM_Quality` | Quality | 1 | 0 / 2 / 1 | Balanced / High / Extreme | Ray-march steps, AO directions and depth-filter taps. High is the default and looks close to Extreme at a fraction of the cost. |
| `GM_Debug` | Debug view | 0 | 0 / 0 / 0 | Off / Depth (conditioned) / Normals / Reflection mask / Reflections only / Ambient occlusion / Bloom only / UI protection mask / Detail delta / Roughness / water / planarity | Visualise intermediate buffers. Use 'Depth' first: near must be dark, far/sky white. |
| **Estimated depth** | | | | | |
| `GM_DepthMode` | Depth source | 0 | 0 / 0 / 0 | ReShade linearized (global depth settings) / Raw buffer value / Raw buffer value, inverted | How the Unishade depth estimate is read. Keep 'ReShade linearized' unless the Depth debug view looks wrong. |
| `GM_DepthPolarity` | Depth polarity | 0 | 0 / 0 / 0 | Auto (detect near/far) / As provided / Flip | Auto compares the top and bottom of the screen over time and flips the depth if near/far are swapped. Hysteresis prevents flicker. |
| `GM_DepthResponse` | Depth response | 0 | 0 / 0 / 0 | Auto (pick the more planar interpretation) / Linear depth / Disparity-like (inverse depth) | Depth estimators output inverse depth. Auto tests which reading makes the (very blocky) Roblox scene more planar and uses that, with hysteresis. |
| `GM_FOV` | Camera vertical FOV | 70 | 70 / 70 / 70 | 40 – 110 | Roblox default is 70. Only affects reflection/AO geometry. |
| `GM_SkyDepth` | Sky depth threshold | 0.985 | 0.985 / 0.985 / 0.985 | 0.8 – 0.999 | Pixels at or beyond this depth are treated as sky (early-out for AO, SSR, detail). |
| `GM_DepthTemporal` | Depth temporal smoothing | 0.5 | 0.5 / 0.5 / 0.5 | 0 – 0.9 | Blends the depth estimate with the previous frame where it barely changed. Removes estimator flicker; resets automatically on real motion. |
| `GM_DepthEdgeSnap` | Depth edge snapping | 1 | 1 / 1 / 1 | 0 – 1 | Snaps the soft, low-res depth edges to the real colour edges (joint-bilateral). |
| **Reflections** | | | | | |
| `GM_SSR_Enable` | Enable reflections | 1 | 1 / 1 / 1 | on/off |  |
| `GM_SSR_Strength` | Reflection strength | 2.5 | 2 / 2.8 / 1.6 | 0 – 4 | Multiplier on the Fresnel reflectance. |
| `GM_SSR_F0` | Base reflectance (F0) | 0.1 | 0.08 / 0.12 / 0.05 | 0.02 – 0.5 | Schlick F0. 0.02 water, 0.04 plastic, higher = polished / lacquered look. |
| `GM_SSR_Gloss` | Glossiness | 0.7 | 0.7 / 0.75 / 0.65 | 0 – 1 | Global smoothness. Lower = blurrier, softer reflections. |
| `GM_SSR_TexGloss` | Texture-aware gloss | 1 | 1 / 1 / 1 | 0 – 1 | How much busy textures (grass, gravel) reduce gloss compared to flat plastic. |
| `GM_SSR_FloorMin` | Floor detection threshold | 0.45 | 0.45 / 0.45 / 0.45 | 0.2 – 0.9 | Minimum upward tilt (from smoothed depth) for a surface to count as floor. |
| `GM_SSR_Vertical` | Non-floor glossy parts | 0 | 0 / 0 / 0 | 0 – 1 | Reflections on flat walls / glossy parts that are not floors. Off by default: vertical geometry is the least reliable part of estimated depth. |
| `GM_SSR_FloorSnap` | Floor plane snapping | 0.85 | 0.85 / 0.85 / 0.85 | 0 – 1 | Floor pixels use one frame-wide floor plane (fitted over thousands of pixels, no camera roll) instead of their noisy local normal: straight, stable mirror images. |
| `GM_SSR_Water` | Water reflections | 1 | 1 / 1 / 1 | 0 – 1 | Extra reflectance for blue/teal flat surfaces (Roblox water), F0 = 0.02. |
| `GM_SSR_Ripple` | Water ripple distortion | 0.5 | 0.5 / 0.5 / 0.5 | 0 – 1 |  |
| `GM_SSR_Env` | Sky fallback on miss | 0.4 | 0.4 / 0.5 / 0.35 | 0 – 1 | When a ray leaves the screen it reflects the measured sky colour instead of going black. |
| `GM_SSR_Thickness` | Ray thickness | 0.06 | 0.06 / 0.06 / 0.06 | 0.01 – 0.3 | Relative depth tolerance for a hit. Larger = more coherent, less exact. |
| `GM_SSR_MaxDist` | Max ray length | 1.5 | 1.5 / 1.5 / 1.5 | 0.2 – 4 |  |
| `GM_SSR_Temporal` | Temporal accumulation | 0.8 | 0.8 / 0.8 / 0.8 | 0 – 0.95 | History weight. Variance clipping keeps it ghost-free when the camera moves. |
| `GM_SSR_EdgeFade` | Screen edge fade | 0.08 | 0.08 / 0.08 / 0.08 | 0.01 – 0.3 |  |
| **Ambient occlusion** | | | | | |
| `GM_AO_Enable` | Enable ambient occlusion | 1 | 1 / 1 / 1 | on/off |  |
| `GM_AO_Strength` | AO strength | 0.5 | 0.4 / 0.6 / 0.5 | 0 – 1 |  |
| `GM_AO_Radius` | AO radius | 1 | 1 / 1 / 1 | 0.3 – 3 |  |
| `GM_AO_Range` | AO depth range | 0.12 | 0.12 / 0.12 / 0.12 | 0.02 – 0.5 | Relative depth difference over which occluders count. Small = contact shadows only, no halos. |
| `GM_AO_Bounce` | AO multi-bounce colour | 0.5 | 0.5 / 0.5 / 0.5 | 0 – 1 | Keeps occluded bright surfaces from turning grey (GTAO multi-bounce approximation). |
| **Detail** | | | | | |
| `GM_Detail_Enable` | Enable detail | 1 | 1 / 1 / 1 | on/off |  |
| `GM_Sharpen` | Fine sharpening | 0.5 | 0.4 / 0.6 / 0.35 | 0 – 1.5 | Luma-only, edge-aware 3x3 sharpening with overshoot clamp. |
| `GM_MicroContrast` | Micro-contrast | 0.45 | 0.35 / 0.55 / 0.3 | 0 – 1.5 | Mid-frequency texture detail (studs, bricks, rock). |
| `GM_LocalContrast` | Local contrast (clarity) | 0.2 | 0.15 / 0.25 / 0.2 | 0 – 1 | Large-scale local contrast, soft-limited so strong edges do not halo. |
| `GM_DetailLimit` | Detail limiter | 0.06 | 0.06 / 0.06 / 0.06 | 0.01 – 0.2 | Soft cap on how much any band can change luma. |
| `GM_Overshoot` | Overshoot clamp | 0.012 | 0.012 / 0.012 / 0.012 | 0 – 0.1 | Allowed overshoot beyond the local 3x3 min/max. 0 = no halos/ringing at all. |
| `GM_DebandStrength` | Deband | 1 | 1 / 1 / 1 | 0 – 1 | Smooths 8-bit banding in flat gradients (sky) before sharpening. |
| `GM_DetailDistanceFade` | Detail distance fade | 0.5 | 0.5 / 0.5 / 0.5 | 0 – 1 | Reduces detail enhancement on far geometry (depth-guided) to avoid crunchy distance. |
| **Bloom** | | | | | |
| `GM_Bloom_Enable` | Enable bloom | 1 | 1 / 1 / 1 | on/off |  |
| `GM_Bloom_Strength` | Bloom strength | 0.35 | 0.3 / 0.45 / 0.25 | 0 – 1 |  |
| `GM_Bloom_Threshold` | Threshold (display linear) | 0.85 | 0.85 / 0.85 / 0.85 | 0.3 – 0.98 | Brightness where glow starts. 0.85 linear ~ sRGB 0.93: sun, lamps, neon, speculars. |
| `GM_Bloom_Knee` | Soft knee | 0.3 | 0.3 / 0.3 / 0.3 | 0.05 – 1 |  |
| `GM_Bloom_Radius` | Radius | 0.45 | 0.45 / 0.5 / 0.45 | 0 – 1 | 0 = tight glow, 1 = wide atmospheric glow. |
| `GM_Bloom_Conserve` | Energy conservation | 0.5 | 0.5 / 0.5 / 0.8 | 0 – 1 | 1 = glow energy is taken from the source (no overall brightening / haze). |
| `GM_Bloom_Adapt` | Light adaptation | 0.6 | 0.6 / 0.6 / 0.8 | 0 – 1 | Reduces bloom in bright scenes and raises it slightly in dark ones. |
| `GM_Bloom_TextReject` | Thin-feature rejection | 1 | 1 / 1 / 1 | 0 – 1 | Morphological erosion in the prefilter: thin bright strokes (UI text) do not glow. |
| **Tone & colour** | | | | | |
| `GM_Tone_Enable` | Enable tone & colour | 1 | 1 / 1 / 1 | on/off |  |
| `GM_Expansion` | Highlight headroom | 0.75 | 0.75 / 0.75 / 0.75 | 0 – 0.9 | Reversible inverse-tonemap strength. Higher = softer highlight roll-off for added light. |
| `GM_Exposure` | Exposure (EV) | 0 | 0 / 0 / 0 | -1 – 1 |  |
| `GM_Contrast` | Filmic contrast | 0.08 | 0.06 / 0.1 / 0.08 | -0.5 – 0.5 | S-curve around mid grey with toe and shoulder; black and white points stay fixed. |
| `GM_HighlightDesat` | Highlight desaturation | 0.5 | 0.5 / 0.5 / 0.7 | 0 – 1 | Added light (bloom) desaturates towards white like real overexposure. |
| `GM_Temperature` | White balance: temperature | 0 | 0 / 0 / 0 | -1 – 1 |  |
| `GM_Tint` | White balance: tint | 0 | 0 / 0 / 0 | -1 – 1 |  |
| `GM_Vibrance` | Vibrance | 0.18 | 0.15 / 0.22 / 0.08 | -0.5 – 1 | Saturation boost weighted towards muted colours. |
| `GM_Saturation` | Saturation | 1 | 1 / 1 / 0.98 | 0.5 – 1.5 |  |
| `GM_SkinProtect` | Skin-tone protection | 0.7 | 0.7 / 0.7 / 0.9 | 0 – 1 |  |
| `GM_NeutralProtect` | Neutral protection | 0.8 | 0.8 / 0.8 / 1 | 0 – 1 | Keeps greys and whites neutral (no colour cast amplification). |
| **Atmosphere** | | | | | |
| `GM_Haze_Enable` | Enable depth haze | 1 | 1 / 1 / 1 | on/off |  |
| `GM_Haze_Strength` | Haze strength | 0.06 | 0.05 / 0.08 / 0.06 | 0 – 0.6 | Subtle aerial perspective towards the measured sky colour. |
| `GM_Haze_Start` | Haze start (scene-relative distance) | 0.7 | 0.7 / 0.7 / 0.6 | 0 – 0.95 | 0 = nearest part of the scene, 1 = farthest. Distance is normalised per frame from the scene's own depth statistics, because estimated depth has no units. |
| **Film** | | | | | |
| `GM_Vignette` | Vignette | 0 | 0 / 0 / 0 | 0 – 1 |  |
| `GM_Grain` | Film grain | 0 | 0 / 0 / 0 | 0 – 1 |  |
| `GM_Dither` | Output dither | 1 | 1 / 1 / 1 | on/off | Triangular 1-LSB dither, prevents banding from the grade. |
| **UI protection** | | | | | |
| `GM_UI_Protect` | UI protection | 1 | 1 / 1 / 1 | 0 – 1 | Keeps Roblox UI (top bar, white text, icons) free of bloom, sharpening, reflections and AO. |
| `GM_UI_TopBar` | Top bar height (fraction) | 0.05 | 0.05 / 0.05 / 0.05 | 0 – 0.15 | Height of the Roblox top bar as a fraction of the screen. 0 disables. |
| `GM_UI_TextDetect` | Detect UI text / icons | 1 | 1 / 1 / 1 | on/off | High-contrast, near-white, low-saturation strokes are left untouched. |
| `GM_UI_GradeProtect` | UI grade protection | 1 | 1 / 1 / 1 | 0 – 1 | How much of the global colour grade (contrast, vibrance, tone) is skipped on detected UI: top bar, text strokes, flat white panels. 1 = UI keeps its exact colours. |

## Known limits

See `docs/REPORT.md` in the repository. In short:
* Estimated depth cannot separate an object from its own reflection *in the game image*.
  Mirrors are rebuilt from colour plus a fitted floor plane.
* Floating objects (not touching the floor) reflect as if they stood on it.
* Very sparse textures seen close up (studs plate rings) can read as glossy in **Ultra**.
* Coloured flat UI buttons are graded like scene content; text, white panels and the top
  bar are protected.
* If Unishade updates depth slower than the game frame rate, reflections and AO lag
  slightly during fast camera moves.

Original code. No code was copied from other shader packs. The references studied were
ReShade.fxh/ReShadeUI.fxh, qUINT SSR/bloom and iMMERSE MXAO, for conventions only.
