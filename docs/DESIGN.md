# GrandMaster: design doc

Target: Unishade 0.6.2 (ReShade-based) capturing Roblox, at 3840×2304 on an RTX 5090 laptop GPU.
Budget: ≤ ~6 ms Unishade `processing_ms`, ≤ 10% `present_fps` loss versus shader off.

## 1. Constraints that drive the design

| Constraint | Consequence |
|---|---|
| Depth is a ~266×154 neural *estimate* (affine-ambiguous inverse depth), blurry at edges, noisy, unknown encoding | All depth math is relative and scale-free. Auto polarity and auto linear/disparity detection by voting. Colour-guided edge snapping. No per-pixel normals from raw depth. Floors use a frame-wide fitted plane. |
| The input is an LDR, already-tonemapped game frame | A reversible highlight expansion `m/(1−km)` on the max channel, with exact inverse `m/(1+km)`: effects-off is bit-exact identity; added light rolls off softly. |
| Roblox UI is drawn into the same frame | A UI-likeness mask (top bar band, near-white achromatic strokes, perfectly flat white panels) gates local effects. Reflections reject UI hits. Bloom prefilter erodes thin strokes. |
| No motion vectors | Temporal accumulation without reprojection, with variance clipping. Jitter only while the frame moves (global-motion detector), so still frames converge exactly. |
| One full-res pass budget at 8.85 MP | Everything heavy runs at ½ or ¼ resolution with joint-bilateral upsampling. Bloom pyramid starts at ¼. Only the composite is full-res. |

## 2. Pass list, textures, formats

Resolution symbols: F = full, H = ½, Q = ¼.

| Pass | Res | Reads | Writes (format) |
|---|---|---|---|
| Prep | H | back buffer (4 exact taps), depth | `ColorH` RGBA16F (expanded linear rgb, perceptual luma a), 6 mips; `UIH` R8 |
| Stats | 6×1 | depth grid, ColorH mips, last frame's CompQ / GeoQ / Geo2Q / PrevSmall | `Stats` RGBA32F ×6 |
| StatsCopy | 6×1 | Stats | `StatsHist` |
| SmallCopy | F/32 | ColorH mip 4 | `PrevSmall` R16F |
| DepthQ | Q | depth, DepthQHist, ColorH, UIH | `DepthQ` RG16F (depth, guide luma); `B1` RGBA16F (bloom prefilter) |
| DepthQCopy | Q | DepthQ | `DepthQHist` R16F |
| DepthSnap | Q | DepthQ | `DepthS` RG16F |
| Geometry | Q | DepthS, DepthQ, ColorH, Stats | `GeoQ` RGBA16F (n.xy, reflectivity, ao); `Geo2Q` RGBA8 (rough, water, planar, floor); `CompQ` RGBA16F (depth, luma, ao, response vote) |
| SSR | H | GeoQ, Geo2Q, DepthS, ColorH, UIH, Stats | `SSR` RGBA16F |
| SSRResolve | H | SSR, SSRHist, DepthS, Geo2Q | `SSRRes` RGBA16F |
| SSRCopy | H | SSRRes | `SSRHist` |
| Down2..6 | F/8..F/128 | B(n−1) | B2..B6 RGBA16F |
| Up5..1 | F/64..F/4 | B(n), U(n+1) | U5..U1 RGBA16F |
| Composite | F | back buffer 3×3, CompQ, ColorH, SSRRes, U1, U2, B1, Stats | back buffer |

21 passes plus the composite; only the composite is full-res. VRAM at 4K: about 110 MB.

## 3. Cost estimate per pass (3840×2304, Quality = High)

GPU estimate model: texture fetches × pixels / ~250 G fetch/s effective, plus ALU, for an
RTX 5090-laptop-class GPU. This is an **estimate**, not a measurement. It must be confirmed
with `tools/Test-GrandMaster.ps1` on the real machine.

| Pass | Pixels | Fetch/px | Fetches | Est. GPU ms |
|---|---|---|---|---|
| Prep (+ mip build) | 2.2 M | 6 | 13 M | 0.08 |
| DepthQ | 0.55 M | 13 | 7 M | 0.03 |
| DepthSnap | 0.55 M | 13 | 7 M | 0.03 |
| Geometry | 0.55 M | ~75 | 41 M | 0.18 |
| SSR (≈40% of pixels trace) | 2.2 M | 5–37 | ~35 M | 0.20 |
| SSRResolve | 2.2 M | 4–23 | ~25 M | 0.12 |
| Bloom pyramid (10 passes) | small | 5–8 | ~5 M | 0.05 |
| Composite | 8.85 M | 28–36 | ~280 M | 1.1 |
| Pass overhead (22 passes) | | | | 0.1 |
| **Total** | | | **~420 M** | **≈1.5–3 ms** |

Measured *relative* cost (CPU rasterizer, Mesa llvmpipe, same shader, same resolution) is in
`docs/evidence/metrics/perf_table.md`. The composite is ~55% and Geometry+SSR+Resolve ~33%,
which matches the model's shape.

## 4. Effect order (composite)

`deband → (detail computed on source) → linearize/expand → reflections → AO (multi-bounce)
→ detail (luma ratio) → depth haze → bloom (energy-conserving, adaptive, UI-gated)
→ exposure/WB → exact inverse curve → highlight desaturation of added light → vibrance
(neutral + skin protected) → filmic S-curve on luma → UI grade protection (top bar, text, white panels) → vignette/grain
(off) → triangular dither`

## 5. Deviations from the brief, and why

* **Hi-Z:** not used. With a ~266×154 source, a Hi-Z max-pyramid buys nothing over a
  stride-adaptive march on the ¼-res smoothed depth, and the expensive part is texture
  fetches into a low-frequency buffer. The march is stride-adaptive (quadratic/1.5-power step
  distribution), dithered, and binary-refined.
* **Floor reflections use a planar contact-mirror trace instead of normal-based SSR.**
  Measured during development: the estimated floor normal was off by ~6°, and a reflected
  ray doubles that. Rays then overshot the objects they should hit. The contact-mirror trace
  needs only the frame-wide floor orientation and is exact for Roblox's horizontal floors and
  vertical parts. Generic SSR remains for non-floor glossy parts, which are off by default.
* **Build order.** The stack was written in one go and then validated stage by stage, by
  toggling each effect's enable switch in the test harness (bloom+colour, detail, reflections,
  AO), not by growing the file incrementally.
