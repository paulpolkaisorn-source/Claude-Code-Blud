Art direction, part 3d: 3D direction and formations. Owner: art director. Date: 2026-10-08. Status: LOCKED. Binding inputs: design/drafts/director-decisions.md (wins over every other input), design/drafts/critique.md section 7 (merge plan), design/drafts/direction-B.md sections 10 and 11 (base values), design/drafts/direction-A.md section 10 (the kireji clearcoat, which the critique keeps; the normal map and seal light are not in this lock). Every label that carries a product fact cites research/facts.md by F-id.

Terms used in this part. bu is one block unit. p1 is the ink-bleed progress of the speed-to-capabilities boundary and p2 the progress of the family-to-pricing boundary (section 10.10). m is the block mix (section 10.3). s is a block's scale. The stagger position of a block is its place in the stagger order of its formation (section 11.1).

## 10. 3D direction

### 10.1 Units, colour space and bloom luminance

- One bu is one scene unit. Axes: x to the right, y up, z toward the camera. The origin is the centre of row B in the stanza.
- The blocks are the only 3D form. The background is one fullscreen quad. Labels, dimension lines and ticks are DOM or SVG. There is no 3D text.
- Colour space (D11): linear working space. Three.js colour management is on (the default). Every hex value is converted to linear when it is uploaded, through THREE.Color. The composer renders into HalfFloat targets. The output pass converts linear to sRGB and then adds the grain (section 10.8).
- Bloom luminance is Rec. 709 on linear RGB: 0.2126 R + 0.7152 G + 0.0722 B. Threshold 0.96. Values computed for this part:

| Value | Linear luminance | Margin to 0.96 |
|---|---:|---:|
| paper #F1ECE0 | 0.8407 | 0.1193 |
| brightest paper fibre (paper + 0.018 on each sRGB channel) | 0.8782 | 0.0818 |
| paper-deep #E4DCCB | 0.7199 | 0.2401 |
| ink #151512 | 0.0074 | 0.9526 |
| brightest ink fibre (ink + 0.010 on each sRGB channel) | 0.0088 | 0.9512 |
| block-anodized #2B2A26 | 0.0231 | 0.9369 |
| block-steel #BDB7A9 | 0.4755 | 0.4845 |
| seal #B5312A | 0.1219 | 0.8381 |
| seal-ink #E7735F | 0.3008 | 0.6592 |

- Rule: no base colour reaches 0.96, so bloom comes only from specular highlights on the blocks. This is the bloom exception of D12. The grain is added after the sRGB conversion, so it never reaches the threshold.

### 10.2 Block geometry

- Shape: RoundedBoxGeometry (three/addons/geometries/RoundedBoxGeometry.js). Width 0.70 bu (x), height 0.70 bu (y), depth 0.46 bu (z). Corner radius 0.035 bu, 3 segments per corner. Depth is 0.46 / 0.70 = 0.657 of height.
- One geometry, one InstancedMesh holding 17 instances. The 17 blocks cost one draw call.
- Scale: each block carries its formation scale s. World size is 0.70 s in x and y, and 0.46 s in z.
- Stanza spacing: in-row pitch 0.87 bu (gap 0.17 bu). Row pitch 1.05 bu (gap 0.35 bu).
- The kireji is instance index 4 (block 05), the last block of the first line. It has the same geometry as the others. Only its colour and finish (section 10.3) differ.

### 10.3 Block material and the mix m

- Mix m: m = 0 on paper (acts I and III), m = 1 on ink (act II). Across the speed-to-capabilities boundary m = p1. Across the family-to-pricing boundary m = 1 - p2. Outside those two windows m is 0 or 1 by act.
- One MeshPhysicalMaterial with colour #FFFFFF. The finish is carried per instance through InstancedMesh.setColorAt.
- Block base colour, linear lerp by m: m = 0 is #2B2A26 (block-anodized), m = 1 is #BDB7A9 (block-steel).
- Metalness lerps 0.35 to 0.85 by m. Roughness lerps 0.42 to 0.28 by m. Clearcoat lerps 0.25 to 0.00 by m. Clearcoat roughness 0.20. Anisotropy 0.5 with anisotropyRotation 0, so the anodising marks run along x.
- Kireji (instance 4): colour linear lerp from #B5312A (m = 0) to #E7735F (m = 1). Roughness 0.36, clearcoat 0.50, clearcoat roughness 0.22, at every m.
- Micro-surface: a 512 by 512 px canvas drawn once at boot. Each pixel row is a 1 px horizontal line with brightness 0.85 + 0.15 r. The random value r comes from xorshift32 with seed 17: x ^= x << 13; x ^= x >>> 17; x ^= x << 5 (unsigned 32-bit), r = x / 2^32. The canvas is used as roughnessMap and as bumpMap with bumpScale 0.6. No image asset is loaded.
- Not in this lock: the 77-groove normal map of draft A.

### 10.4 Lights and shadows

| Light | Type | Colour | Intensity | Position | Target | Shadow |
|---|---|---|---|---|---|---|
| Key | DirectionalLight | #FFF4E2 | lerp 2.4 (m = 0) to 1.7 (m = 1) | (-6, 9, 12) | (0, 0, 0) | on |
| Rim | SpotLight | #F4EEDF | 36 cd | (7, 5, -5) | (0, 0, 0) | off |
| Fill | HemisphereLight | sky #F4EEDF, ground #151512 | 0.35 | none | none | off |

- Key shadow: THREE.PCFShadowMap (D13.1; PCFSoftShadowMap is removed in three 0.186.1). Map 2048 by 2048. Shadow camera left -8, right 8, top 8, bottom -8, near 1, far 40. Bias -0.0004, normalBias 0.02. Softness comes from the map size and the shadow camera extent.
- Rim spot: angle 0.45 rad, penumbra 0.8, decay 2.
- Shadow catcher: a ShadowMaterial plane, 24 by 16 bu, at z -0.9, depthWrite false. Opacity lerps 0.14 (m = 0) to 0.50 (m = 1).
- Not in this lock: the seal point light of draft A.

### 10.5 Environment

- RoomEnvironment (three/addons/environments/RoomEnvironment.js) is rendered once at boot through PMREMGenerator.fromScene(room, 0.04) and assigned to scene.environment. The generator is disposed after the pass. No image asset is loaded.
- scene.environmentIntensity lerps 0.55 (m = 0) to 0.30 (m = 1).

### 10.6 Camera

- PerspectiveCamera, fov 22 (vertical), near 0.5, far 80, up (0, 1, 0). The camera target is (camera x, camera y, 0).
- Visible width at distance z: W(z) = 2 z tan(11 deg) aspect, with tan(11 deg) = 0.19438 and aspect = canvas width / canvas height.
- Desktop means aspect 1.0 or wider. Phone means aspect below 1.0.
- Fit rule: a keyframe sets z so that a formation of width w bu fills the fraction f of the viewport width, z = w / (f x 2 x tan(11 deg) x aspect). A height fit uses the viewport height in place of the width, so it has no aspect term.
- Desktop x offset for hero, capabilities, code, closing and footer: camera x = -0.22 W(z), computed from the actual aspect. Family, speed and pricing use camera x = 0.

| Keyframe | Sections | Fit | Desktop z (1440 x 900) | Desktop x | Phone z (375 x 812) | Phone y |
|---|---|---|---:|---:|---:|---:|
| hero | hero, capabilities, code | stanza 5.92 bu at f 0.45 (width) | 21.15 | -2.89 | 39.25 (f 0.84) | -1.10 |
| speed | speed | race 15.90 bu at f 0.80 (width) | 31.95 | 0.00 | 110.70 (f 0.80) | 0.00 |
| pricing | pricing | rest 8.74 bu at f 0.70 (width) | 20.07 | 0.00 | 69.54 (f 0.70) | 0.00 |
| closing | closing, footer | column 4.54 bu at f 0.80 (height) | 14.60 | -2.00 | 14.60 | 0.00 |
| family | family | axis 28 bu at f 0.90 (width on desktop, height on phone) | 50.02 | 0.00 | 80.03 | 0.00 |

- Phone hero, capabilities and code use camera y -1.10, which places the formation in the upper half of the screen. Phone closing and footer use camera y 0.00: at -1.10 the column top would sit 0.53 bu above the visible edge (2.27 bu top edge against 1.74 bu, see section 11.13). Desktop y is 0 for every keyframe.
- Phone speed and pricing use their own fit at the phone aspect. The phone rule in the input covers only the stanza. At 375 x 812 the race is 80 percent of the phone width, so one block (0.70 bu) is 13.21 px wide.
- Camera moves between sections are scrubbed with sym (section 10.9).

### 10.7 Labels that carry facts

- Family station latency labels, verbatim from F-140: Claude Fable 5.1 "Slower"; Claude Opus 5.5 "Moderate"; Claude Sonnet 5.5 "Fast"; Claude Haiku 5.5 "Fastest". The source note set under the axis is F-38, verbatim: "Relative to the current lineup. Actual latency depends on prompt length, output length, and thinking effort."
- Family station descriptions, verbatim from F-139: Fable 5.1 "For demanding reasoning and long-horizon agentic work"; Opus 5.5 "For long-running agentic coding and knowledge work"; Sonnet 5.5 "The best combination of speed and intelligence"; Haiku 5.5 "For high-volume, latency-sensitive tasks such as classification, extraction, and routing".
- Family station prices, verbatim from F-142: Fable 5.1 "$10 / input MTok, $50 / output MTok"; Opus 5.5 "$4 / input MTok, $20 / output MTok"; Sonnet 5.5 "$2 / input MTok, $10 / output MTok"; Haiku 5.5 "From $0.10 / input MTok, From $0.50 / output MTok". The Haiku figures are the up-to-100K tier (F-81). Price labels use tabular figures.
- Effort stair labels in the 2D layer (section 11.6 maps them to blocks): index 12 "Low", index 13 "Med", index 14 "High", index 15 "Xhigh", index 16 "Max", verbatim from F-60. The five levels are F-157.
- The 3D layer carries no benchmark figure. The OSWorld bars of capability 1 are in the 2D layer (D6).
- Other 3D labels are geometry and carry no product fact: block numbers "05", "07", "05" and "17", the column "4.54 bu", and the caliper "x.xx bu".

### 10.8 Post-processing

- Chain, in order: RenderPass (blocks and background into one HalfFloat linear target). One merged EffectPass holds the bloom and the chromatic aberration. The depth-of-field pass is a separate EffectPass, present only in speed and code. The output pass converts linear to sRGB and adds the grain in display space.
- When depth of field is off, its pass is removed from the chain. It is not set to zero strength.
- Bloom: BloomEffect with luminanceThreshold 0.96 (linear), luminanceSmoothing 0.02, intensity 0.12, radius 0.2, mipmapBlur true. Neutral: no coloured glow. Section 10.1 gives the threshold margins.
- Chromatic aberration (misregistration): ChromaticAberrationEffect. v is scrollState.velocity in px/s, and its absolute value is damped with time constant T.micro (0.17 s). Offset in px = 0.8 x clamp((|v| - 40) / 2960, 0, 1). So the offset is 0 px at 40 px/s and below, 0.8 px at 3000 px/s and above, and linear between. The offset in uv is the px value divided by the drawing-buffer width.
- Grain: amplitude 0.028 of full scale (7 of 255 levels) at m = 0 and 0.040 of full scale at m = 1, lerped by m. Added after the sRGB conversion, re-seeded every frame. In reduced motion the grain seed stays fixed at 17.
- Depth of field, on only in speed and code, with B's values. Speed: focus distance 31.95 bu, normalised depth (31.95 - 0.5) / 79.5 = 0.3956, bokeh scale 1.2 px. Code: focus distance 21.15 bu, normalised depth (21.15 - 0.5) / 79.5 = 0.2597, bokeh scale 2.0 px. Normalised depth uses near 0.5 and far 80. Off in every other section.

### 10.9 Quality tiers and watchdog

- Starting tiers, from src/core/env.ts: low DPR cap 1.5, mid 1.75, high 2.0. Shadow map 2048 at every tier at start.
- The watchdog compares the median of the last 60 frame times with 18.5 ms. When the median is above 18.5 ms it steps quality down one level. Hysteresis is 3 s between steps.
- Step order. Each step is taken once, in this order, and is never restored in the session: (1) depth of field off, the pass removed; (2) bloom off; (3) DPR cap set to 1.25 whatever the tier; (4) shadow map 2048 to 1024.
- Scroll-linked motion: camera and formation transitions are scrubbed with ScrollTrigger scrub 0.7 and mapped with sym. Per-block local progress uses scrub 0.17 and scrubLocal (section 11.1).

### 10.10 Background and ink bleed

Background: one fullscreen quad in the scene, depthTest off, renderOrder -1, drawn first.

- Base: paper #F1ECE0 at m = 0 and ink #151512 at m = 1, lerped by m in linear space.
- Fibre: fBm with 4 octaves, lacunarity 2.03, gain 0.5, stretched 8:1 along 12 degrees, base frequency one cycle per 160 CSS px. Amplitude plus or minus 0.018 (paper) and plus or minus 0.010 (ink), in sRGB units, lerped by m.
- Vignette: strength 0.06 at m = 0 and 0.10 at m = 1, lerped by m. Smoothstep from radius 0.55 to 1.25, in normalised screen space corrected for aspect.
- Dither: triangular noise of plus or minus 1/255, added after tone mapping, to stop banding.

Ink bleed: the ground changes along an irregular front at two boundaries. Boundary 1 is the top of capabilities (paper to ink). Boundary 2 is the top of pricing (ink to paper). Each boundary has its own progress, p1 and p2.

- Progress: p = clamp((scrollY - (Y - vh)) / vh, 0, 1). Y is the page y of the boundary section's top and vh is the viewport height. p = 0.5 when the section top is at the middle of the viewport. p is eased with sym and smoothed over T.beat7 (0.7 s).
- Front height in viewport heights, measured from the top of the viewport: y_front(X) = y_b + 0.06 * fbm3(2.2 * X + 0.4 * t), where X is the horizontal position in viewport widths from the left edge and t is the page time in seconds. fbm3 has 3 octaves, lacunarity 2.03, gain 0.5, normalised by its amplitude sum (1.75) so it stays in [-1, 1].
- Boundary height: y_b = 1.12 - 1.24 p. The boundary itself is at 1 - p. So the front lies 0.12 - 0.24 p viewport heights below the boundary (positive values are lower on screen). It is 0.12 below at p = 0, level at p = 0.5, and 0.12 above at p = 1, which is the intrusion into the section above.
- Edge softness 0.012 vh. Rim band 0.010 vh wide takes the mid colour: ink-raised over ink, paper-deep over paper.
- Boundary 1: the region below the front is ink. Boundary 2: the region below the front is paper. The same y_b and p formulas apply to both.
- Maximum intrusion of the front above its boundary is 0.12 vh from y_b plus 0.06 vh from the fbm term, so 0.18 vh. This sets the text-free band (D10): the bottom 0.18 vh of the paper section before boundary 1 and the bottom 0.18 vh of the ink section before boundary 2 carry no text.
- The data-theme of the section that starts the new act switches at p = 0.5 (capabilities at p1, pricing at p2), with no blend.
- Blocks follow m (section 10.3). Light, environment, grain, vignette and shadow opacity follow m as well.
- Reduced motion and no WebGL: no front. The background is CSS, and the boundary is a plain cut at the section edge, with the data-theme switching at the cut (section 10.15).

### 10.11 Smear

- Active only in the speed section, on the race formation. Everywhere else the blocks receive velocity 0.
- Strength: s_v = clamp(|v| / 2400, 0, 1), with v = scrollState.velocity in px/s. s_v is damped with time constant T.micro (0.17 s).
- Each block is stretched along y, the scroll axis, about its own centre. Its height becomes 0.70 + 0.245 s_v bu, so the full stretch is 35 percent of the 0.70 bu block width (0.245 bu). The width and depth are unchanged.
- Zero at rest. At 2400 px/s and above the stretch is at its full value.

### 10.12 Idle breath

- Vertical offset: dy_i = 0.012 x sin(2 pi t / T.breath + phi_i), with T.breath 1.7 s, applied to the block's y after its formation pose.
- Phase phi_i follows the block's row in the stanza, so each block keeps its phase in every formation: row A (indices 0 to 4) phi = 0; row B (indices 5 to 11) phi = 0.4 pi; row C (indices 12 to 16) phi = 0.8 pi.
- Start: T.hold (0.85 s) after the block entrance. Blocks settle first.
- Exceptions. Speed (race): phi = 0 for all 17 blocks. Pricing (rest): amplitude 0.010 bu, phi = 0 for all 17. Closing (column): travelling wave dy_k = 0.010 x sin(2 pi t / T.breath - 0.2 k), with k the index, so the wave runs down the column. Capabilities: only the active group breathes. Inactive groups hold still.
- Reduced motion: no breath.

### 10.13 Pointer, hover and tap

- The pointer values pointer.sx and pointer.sy are in [-1, 1] and are smoothed by the architecture (time constant 0.1 s, D13.4). Every 3D pointer response is damped again with time constant T.half (0.35 s).
- Tilt, hero only. The stanza group rotates rotX = -sy x 0.035 rad and rotY = sx x 0.035 rad about the group origin. The tilt is capped at 0.035 rad on each axis. B places the tilt in the hero, and the other sections keep their pointer roles: speed and closing need true positions (the caliper and the ruler read them), family labels sit at projected positions, and pricing and footer are native.
- Code, recede group. The group moves with the pointer: x = sx x 0.2 bu and y = sy x 0.2 bu. No tilt.
- Speed. A block under the pointer lifts +0.15 bu on y over T.beat5 (0.5 s) with settle. Touch: a tap lifts the block the same way.
- Capabilities. A hovered card lifts its group 0.2 bu toward the camera (+0.2 bu on z) over T.beat5 with settle.
- Family. The Haiku station label lifts the stanza +0.15 bu on y over T.beat5 with follow (overshoot 1.86 percent, section 10.14). Hover over a sibling station label runs the dash of its phantom outline (section 11.8). Touch: a tap on a label toggles the lift or the run.
- Closing. No lift and no tilt. The ruler cursor reads the block centres (section 10.16).
- Pricing and footer: no 3D pointer response.
- Reduced motion: every lift and run is removed. Hover states change colour only, through the 2D layer.

### 10.14 Motion limits

- Time-based block travel is at most 1.0 bu per move. Lifts and breath are inside this limit. Preloader entrances scale in place and do not travel.
- Keyboard formation changes in capabilities last T.stride (0.7 s) and may travel further than 1.0 bu. This is the only exception. Scroll-scrubbed moves are exempt by definition.
- Overshoot: the follow curve, 1.86 percent, once per arrival, on blocks only. It applies to the end of a keyboard formation change in capabilities and to the Haiku station lift in family. It never applies to text, the camera or the background. No oscillation and no spring.
- Camera moves use sym, which never overshoots.
- Rotation: formations rotate about yaw only, except the phone family group, which turns about z (section 11.8). The hero tilt is the only other rotation.

### 10.15 Reduced motion, no WebGL and touch

- Reduced motion (prefers-reduced-motion, env.reducedMotion): each formation is set at once at the section entry and shown through a canvas opacity crossfade of T.half (0.35 s, opacity only). No scrub, no breath, no smear (velocity 0), no tilt, no lifts, no depth of field (the pass is removed), chromatic aberration 0 px, grain static at its m amplitude, the dash of phantom outlines static, no custom cursor. The ink bleed is a plain cut at the section boundary, painted by CSS, and the data-theme switches at the cut.
- No WebGL (html.no-gl): the canvas is removed. Each section's 3D moment is replaced by its static SVG in the act files (architecture section 8). The section backgrounds are CSS and the boundaries are plain cuts.
- Touch (env.touch): no custom cursor and no tilt. Tap responses are the speed block lift, the family label toggle and the capability card activation (section 10.13). Taps never change the formations except through the cards.

### 10.16 Hit testing and draw calls

- Hit test (blocks, fine pointer only): the 17 screen-space rectangles are the projected axis-aligned bounds of each block's eight corners, taken with the current camera, formation, lift and tilt. They are recomputed at most once per frame, and only while the pointer is over the canvas. The test is a point-in-rectangle check. There is no raycast.
- The rectangles also drive the caliper (speed) and the ruler (closing), which snap to block centres.
- Draw calls per frame, by pass: shadow pass 1; blocks 1 (InstancedMesh); background quad 1; phantom outlines 1 (family only); composer render 1; merged EffectPass 1 (bloom and chromatic aberration); depth-of-field pass 1 (speed and code only); output pass 1. The bloom's internal mipmap blur belongs to the library and is counted in the perf measurement, not here.
- Memory: no textures other than the 512 by 512 micro-surface canvas and the PMREM environment. Drawing buffer = CSS size x the tier's DPR cap.

## 11. Formations

Every formation below is a table of 17 rows generated from the formulas stated with it. Index i is the same block in every formation. Row A is indices 0 to 4 (5 blocks), row B is 5 to 11 (7 blocks), row C is 12 to 16 (5 blocks). Index 4 is the kireji.

### 11.1 Conventions

- Units are bu. Columns: x, y, z in bu; scale s (block size 0.70 s in x and y, 0.46 s in z); rotX, rotY (yaw), rotZ in radians. rotX and rotZ are 0 in every formation except the phone family group (section 11.8).
- Row placement: a row of n blocks with pitch p puts block k (k counted from 0 at the left) at x = (k - (n - 1) / 2) x p, centred on the row centre.
- Stagger order: each formation lists the 17 indices in the order they receive their offsets. Timed entries give stagger position k the offset HAIKU_OFFSETS[k] in seconds: 0, 0.0500, 0.0707, 0.0866, 0.1000, 0.1850, 0.2707, 0.3062, 0.3335, 0.3565, 0.3767, 0.3950, 0.4800, 0.5300, 0.5507, 0.5666, 0.5800.
- Scrubbed transitions use the same stagger position k: scrubLocal(k, 17, t, {total 0.35, lead 0.10}), with t the section-local transition progress from 0 to 1.
- Numbers are shown to four decimal places. Every value is a product of constants with at most four decimals, except the column scale, which is 0.22 / 0.70 and is shown as 0.3143. The code uses 0.22 / 0.70.

### 11.2 stanza (hero rest pose and preloader handoff)

- Row A: y 1.05, z 0, s 1, p 0.87, yaw 0. Row B: y 0, z 0, s 1, p 0.87, yaw 0. Row C: y -1.05, z 0, s 1, p 0.87, yaw 0.
- Stagger order: 4, 3, 2, 1, 0, 8, 7, 9, 6, 10, 5, 11, 14, 13, 15, 12, 16. Each line starts at the kireji or its centre and moves outward.
- Hero scroll modulation of this pose is in section 11.11. It is not a separate formation.

| index | x | y | z | scale | rotX | rotY | rotZ |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 0 | -1.7400 | 1.0500 | 0.0000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 1 | -0.8700 | 1.0500 | 0.0000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 2 | 0.0000 | 1.0500 | 0.0000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 3 | 0.8700 | 1.0500 | 0.0000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 4 | 1.7400 | 1.0500 | 0.0000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 5 | -2.6100 | 0.0000 | 0.0000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 6 | -1.7400 | 0.0000 | 0.0000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 7 | -0.8700 | 0.0000 | 0.0000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 8 | 0.0000 | 0.0000 | 0.0000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 9 | 0.8700 | 0.0000 | 0.0000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 10 | 1.7400 | 0.0000 | 0.0000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 11 | 2.6100 | 0.0000 | 0.0000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 12 | -1.7400 | -1.0500 | 0.0000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 13 | -0.8700 | -1.0500 | 0.0000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 14 | 0.0000 | -1.0500 | 0.0000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 15 | 0.8700 | -1.0500 | 0.0000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 16 | 1.7400 | -1.0500 | 0.0000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |

### 11.3 race (speed)

- Index k at x = (k - 8) x 0.95, y 0, z 0, s 1, yaw 0. Pitch 0.95. The line is 15.90 bu wide, from -7.95 to +7.95 at the block edges.
- Stagger order: 4, 3, 2, 1, 0, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5. The kireji leads and the run starts from the far end of the line.

| index | x | y | z | scale | rotX | rotY | rotZ |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 0 | -7.6000 | 0.0000 | 0.0000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 1 | -6.6500 | 0.0000 | 0.0000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 2 | -5.7000 | 0.0000 | 0.0000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 3 | -4.7500 | 0.0000 | 0.0000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 4 | -3.8000 | 0.0000 | 0.0000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 5 | -2.8500 | 0.0000 | 0.0000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 6 | -1.9000 | 0.0000 | 0.0000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 7 | -0.9500 | 0.0000 | 0.0000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 8 | 0.0000 | 0.0000 | 0.0000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 9 | 0.9500 | 0.0000 | 0.0000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 10 | 1.9000 | 0.0000 | 0.0000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 11 | 2.8500 | 0.0000 | 0.0000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 12 | 3.8000 | 0.0000 | 0.0000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 13 | 4.7500 | 0.0000 | 0.0000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 14 | 5.7000 | 0.0000 | 0.0000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 15 | 6.6500 | 0.0000 | 0.0000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 16 | 7.6000 | 0.0000 | 0.0000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |

### 11.4 cap-0 (capability 1, computer and browser use)

- Active row A (indices 0 to 4): y 0, z +0.90, s 1, p 0.87, yaw 0.
- Row B (indices 5 to 11): y +1.05, z -1.40, s 0.90, p 0.783, yaw +0.35.
- Row C (indices 12 to 16): y -1.05, z -1.40, s 0.90, p 0.783, yaw -0.35.
- The inactive yaws are mirrored (B section 11). The kireji is index 4, in the active row.
- Stagger order: 4, 3, 2, 1, 0 (active row, kireji first), then 5 to 16 in index order.

| index | x | y | z | scale | rotX | rotY | rotZ |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 0 | -1.7400 | 0.0000 | 0.9000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 1 | -0.8700 | 0.0000 | 0.9000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 2 | 0.0000 | 0.0000 | 0.9000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 3 | 0.8700 | 0.0000 | 0.9000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 4 | 1.7400 | 0.0000 | 0.9000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 5 | -2.3490 | 1.0500 | -1.4000 | 0.9000 | 0.0000 | 0.3500 | 0.0000 |
| 6 | -1.5660 | 1.0500 | -1.4000 | 0.9000 | 0.0000 | 0.3500 | 0.0000 |
| 7 | -0.7830 | 1.0500 | -1.4000 | 0.9000 | 0.0000 | 0.3500 | 0.0000 |
| 8 | 0.0000 | 1.0500 | -1.4000 | 0.9000 | 0.0000 | 0.3500 | 0.0000 |
| 9 | 0.7830 | 1.0500 | -1.4000 | 0.9000 | 0.0000 | 0.3500 | 0.0000 |
| 10 | 1.5660 | 1.0500 | -1.4000 | 0.9000 | 0.0000 | 0.3500 | 0.0000 |
| 11 | 2.3490 | 1.0500 | -1.4000 | 0.9000 | 0.0000 | 0.3500 | 0.0000 |
| 12 | -1.5660 | -1.0500 | -1.4000 | 0.9000 | 0.0000 | -0.3500 | 0.0000 |
| 13 | -0.7830 | -1.0500 | -1.4000 | 0.9000 | 0.0000 | -0.3500 | 0.0000 |
| 14 | 0.0000 | -1.0500 | -1.4000 | 0.9000 | 0.0000 | -0.3500 | 0.0000 |
| 15 | 0.7830 | -1.0500 | -1.4000 | 0.9000 | 0.0000 | -0.3500 | 0.0000 |
| 16 | 1.5660 | -1.0500 | -1.4000 | 0.9000 | 0.0000 | -0.3500 | 0.0000 |

### 11.5 cap-1 (capability 2, high-volume work)

- Active row B (indices 5 to 11): y 0, z +0.90, s 1, p 0.87, yaw 0.
- Row A (indices 0 to 4): y +1.05, z -1.40, s 0.90, p 0.783, yaw +0.35.
- Row C (indices 12 to 16): y -1.05, z -1.40, s 0.90, p 0.783, yaw -0.35.
- Stagger order: 4 (the kireji leads from its inactive row), then 5 to 11, then 0 to 3, then 12 to 16.

| index | x | y | z | scale | rotX | rotY | rotZ |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 0 | -1.5660 | 1.0500 | -1.4000 | 0.9000 | 0.0000 | 0.3500 | 0.0000 |
| 1 | -0.7830 | 1.0500 | -1.4000 | 0.9000 | 0.0000 | 0.3500 | 0.0000 |
| 2 | 0.0000 | 1.0500 | -1.4000 | 0.9000 | 0.0000 | 0.3500 | 0.0000 |
| 3 | 0.7830 | 1.0500 | -1.4000 | 0.9000 | 0.0000 | 0.3500 | 0.0000 |
| 4 | 1.5660 | 1.0500 | -1.4000 | 0.9000 | 0.0000 | 0.3500 | 0.0000 |
| 5 | -2.6100 | 0.0000 | 0.9000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 6 | -1.7400 | 0.0000 | 0.9000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 7 | -0.8700 | 0.0000 | 0.9000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 8 | 0.0000 | 0.0000 | 0.9000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 9 | 0.8700 | 0.0000 | 0.9000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 10 | 1.7400 | 0.0000 | 0.9000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 11 | 2.6100 | 0.0000 | 0.9000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 12 | -1.5660 | -1.0500 | -1.4000 | 0.9000 | 0.0000 | -0.3500 | 0.0000 |
| 13 | -0.7830 | -1.0500 | -1.4000 | 0.9000 | 0.0000 | -0.3500 | 0.0000 |
| 14 | 0.0000 | -1.0500 | -1.4000 | 0.9000 | 0.0000 | -0.3500 | 0.0000 |
| 15 | 0.7830 | -1.0500 | -1.4000 | 0.9000 | 0.0000 | -0.3500 | 0.0000 |
| 16 | 1.5660 | -1.0500 | -1.4000 | 0.9000 | 0.0000 | -0.3500 | 0.0000 |

### 11.6 cap-2 (capability 3, adjustable effort, with the stair)

- Active row C (indices 12 to 16): y 0, z +0.90, s 1, p 0.87, yaw 0, plus the stair offsets below.
- Stair (D6): y offsets above the active line are 0.00 for index 12, 0.17 for 13, 0.34 for 14, 0.51 for 15 and 0.68 for 16. The stair is static in 3D. The 2D labels map to the blocks in the same order: 12 "Low", 13 "Med", 14 "High", 15 "Xhigh", 16 "Max" (F-60).
- Row A (indices 0 to 4): y +1.05, z -1.40, s 0.90, p 0.783, yaw +0.35.
- Row B (indices 5 to 11): y -1.05, z -1.40, s 0.90, p 0.783, yaw -0.35.
- Stagger order: 4, then 12 to 16, then 0 to 3, then 5 to 11.
- Screen-space overlap, accepted by design: on screen, blocks 15 and 16 of the stair cover parts of blocks 3 and 4 of the back row A. The pairs are 3-15, 4-15 and 4-16, and their depth separation is 2.30 bu. No two blocks intersect in 3D (section 11.13).

| index | x | y | z | scale | rotX | rotY | rotZ |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 0 | -1.5660 | 1.0500 | -1.4000 | 0.9000 | 0.0000 | 0.3500 | 0.0000 |
| 1 | -0.7830 | 1.0500 | -1.4000 | 0.9000 | 0.0000 | 0.3500 | 0.0000 |
| 2 | 0.0000 | 1.0500 | -1.4000 | 0.9000 | 0.0000 | 0.3500 | 0.0000 |
| 3 | 0.7830 | 1.0500 | -1.4000 | 0.9000 | 0.0000 | 0.3500 | 0.0000 |
| 4 | 1.5660 | 1.0500 | -1.4000 | 0.9000 | 0.0000 | 0.3500 | 0.0000 |
| 5 | -2.3490 | -1.0500 | -1.4000 | 0.9000 | 0.0000 | -0.3500 | 0.0000 |
| 6 | -1.5660 | -1.0500 | -1.4000 | 0.9000 | 0.0000 | -0.3500 | 0.0000 |
| 7 | -0.7830 | -1.0500 | -1.4000 | 0.9000 | 0.0000 | -0.3500 | 0.0000 |
| 8 | 0.0000 | -1.0500 | -1.4000 | 0.9000 | 0.0000 | -0.3500 | 0.0000 |
| 9 | 0.7830 | -1.0500 | -1.4000 | 0.9000 | 0.0000 | -0.3500 | 0.0000 |
| 10 | 1.5660 | -1.0500 | -1.4000 | 0.9000 | 0.0000 | -0.3500 | 0.0000 |
| 11 | 2.3490 | -1.0500 | -1.4000 | 0.9000 | 0.0000 | -0.3500 | 0.0000 |
| 12 | -1.7400 | 0.0000 | 0.9000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 13 | -0.8700 | 0.1700 | 0.9000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 14 | 0.0000 | 0.3400 | 0.9000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 15 | 0.8700 | 0.5100 | 0.9000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 16 | 1.7400 | 0.6800 | 0.9000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |

### 11.7 recede (code)

- Every block: x = 0.62 x stanza x (in-row pitch 0.5394), y = 0.62 x stanza y (row A +0.651, row B 0.000, row C -0.651), z -4.00, s 0.62, yaw 0. Block size is 0.434 bu.
- Stagger order: 4, then 0 to 3, then 5 to 11, then 12 to 16, each in left-to-right order.
- Code pointer translation applies to the group (section 10.13).

| index | x | y | z | scale | rotX | rotY | rotZ |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 0 | -1.0788 | 0.6510 | -4.0000 | 0.6200 | 0.0000 | 0.0000 | 0.0000 |
| 1 | -0.5394 | 0.6510 | -4.0000 | 0.6200 | 0.0000 | 0.0000 | 0.0000 |
| 2 | 0.0000 | 0.6510 | -4.0000 | 0.6200 | 0.0000 | 0.0000 | 0.0000 |
| 3 | 0.5394 | 0.6510 | -4.0000 | 0.6200 | 0.0000 | 0.0000 | 0.0000 |
| 4 | 1.0788 | 0.6510 | -4.0000 | 0.6200 | 0.0000 | 0.0000 | 0.0000 |
| 5 | -1.6182 | 0.0000 | -4.0000 | 0.6200 | 0.0000 | 0.0000 | 0.0000 |
| 6 | -1.0788 | 0.0000 | -4.0000 | 0.6200 | 0.0000 | 0.0000 | 0.0000 |
| 7 | -0.5394 | 0.0000 | -4.0000 | 0.6200 | 0.0000 | 0.0000 | 0.0000 |
| 8 | 0.0000 | 0.0000 | -4.0000 | 0.6200 | 0.0000 | 0.0000 | 0.0000 |
| 9 | 0.5394 | 0.0000 | -4.0000 | 0.6200 | 0.0000 | 0.0000 | 0.0000 |
| 10 | 1.0788 | 0.0000 | -4.0000 | 0.6200 | 0.0000 | 0.0000 | 0.0000 |
| 11 | 1.6182 | 0.0000 | -4.0000 | 0.6200 | 0.0000 | 0.0000 | 0.0000 |
| 12 | -1.0788 | -0.6510 | -4.0000 | 0.6200 | 0.0000 | 0.0000 | 0.0000 |
| 13 | -0.5394 | -0.6510 | -4.0000 | 0.6200 | 0.0000 | 0.0000 | 0.0000 |
| 14 | 0.0000 | -0.6510 | -4.0000 | 0.6200 | 0.0000 | 0.0000 | 0.0000 |
| 15 | 0.5394 | -0.6510 | -4.0000 | 0.6200 | 0.0000 | 0.0000 | 0.0000 |
| 16 | 1.0788 | -0.6510 | -4.0000 | 0.6200 | 0.0000 | 0.0000 | 0.0000 |

### 11.8 family (family section, D4)

Stations and labels. Four stations, left to right, at x = -10.5, -3.5, +3.5 and +10.5 (pitch 7.00 bu). Slower (Claude Fable 5.1) at -10.5 and Moderate (Claude Opus 5.5) at -3.5 are phantom outlines. Fast (Claude Sonnet 5.5) at +3.5 is a phantom outline. Fastest (Claude Haiku 5.5) at +10.5 is the real stanza. Labels are 2D (section 10.7) and are placed from the projected station centre on resize.

Real blocks. The stanza of section 11.2 translated to x +10.5, with scale 1, yaw 0, and the stanza's y and z. Stagger order: 4, 3, 2, 1, 0, 8, 7, 9, 6, 10, 5, 11, 14, 13, 15, 12, 16 (kireji first, then the per-line front profile).

Phantom outlines. Three outlines, one per sibling station, centred at y 0 and z 0 (table below). Each outline is a rounded box of 5.92 x 2.80 x 0.46 bu, the size of the stanza bounding box (6 x 0.87 + 0.70 wide, 2 x 1.05 + 0.70 high). Geometry: a front loop at z +0.23 and a back loop at z -0.23. Each loop is a rounded rectangle with half sizes 2.96 (x) and 1.40 (y) and corner radius 0.035 bu. A loop is 4 straight edges and 4 corner arcs of 3 segments each, so 16 segments. Four depth edges join the loops at the 45 degree point of each corner arc, which is the corner centre plus 0.035 x (cos 45 deg, sin 45 deg). Each outline is 36 segments (72 vertices), with no fill and no shading.

| Outline | Station | Centre x, y, z (bu) | Size w x h x d (bu) |
|---|---|---|---|
| P1 | Slower (Claude Fable 5.1) | -10.50, 0.00, 0.00 | 5.92 x 2.80 x 0.46 |
| P2 | Moderate (Claude Opus 5.5) | -3.50, 0.00, 0.00 | 5.92 x 2.80 x 0.46 |
| P3 | Fast (Claude Sonnet 5.5) | 3.50, 0.00, 0.00 | 5.92 x 2.80 x 0.46 |

- Material: one LineSegments with one LineDashedMaterial for all three outlines (one draw call). dashSize 0.17 bu, gapSize 0.07 bu, scale 1, colour #75705F (rule-hair-ink, linear). computeLineDistances() runs once at build.
- Gap between neighbouring boxes, and between P3 and the real stanza: 7.00 - 5.92 = 1.08 bu.
- Hover run (fine pointer or tap): while the run is on, the lineDistance attribute of each vertex is offset by 0.24 bu per second, so the dash pattern moves along each outline at one dash period per second. Reduced motion: static.
- Desktop: camera per section 10.6 (z 50.02, x 0). Phone: the group rotates about z by -1.5708 rad (-pi/2), so Slower is at the top and Fastest at the bottom. Each real block has rotZ +1.5708 (+pi/2) so it stays upright. The phantom outlines turn with the group. The stanza rows then read as three vertical columns of 5, 7 and 5 blocks. Phone camera is z 80.03 (height fit), y 0.

| index | x | y | z | scale | rotX | rotY | rotZ |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 0 | 8.7600 | 1.0500 | 0.0000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 1 | 9.6300 | 1.0500 | 0.0000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 2 | 10.5000 | 1.0500 | 0.0000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 3 | 11.3700 | 1.0500 | 0.0000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 4 | 12.2400 | 1.0500 | 0.0000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 5 | 7.8900 | 0.0000 | 0.0000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 6 | 8.7600 | 0.0000 | 0.0000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 7 | 9.6300 | 0.0000 | 0.0000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 8 | 10.5000 | 0.0000 | 0.0000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 9 | 11.3700 | 0.0000 | 0.0000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 10 | 12.2400 | 0.0000 | 0.0000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 11 | 13.1100 | 0.0000 | 0.0000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 12 | 8.7600 | -1.0500 | 0.0000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 13 | 9.6300 | -1.0500 | 0.0000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 14 | 10.5000 | -1.0500 | 0.0000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 15 | 11.3700 | -1.0500 | 0.0000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |
| 16 | 12.2400 | -1.0500 | 0.0000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 |

### 11.9 rest (pricing)

- Index k at x = (k - 8) x 0.52, y -1.45, z 0, s 0.60 (block size 0.42 bu), yaw 0. Pitch 0.52. The line is 8.74 bu wide (16 x 0.52 + 0.42), which is the pricing fit.
- Stagger order: 4, then 0 to 3, then 5 to 16.

| index | x | y | z | scale | rotX | rotY | rotZ |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 0 | -4.1600 | -1.4500 | 0.0000 | 0.6000 | 0.0000 | 0.0000 | 0.0000 |
| 1 | -3.6400 | -1.4500 | 0.0000 | 0.6000 | 0.0000 | 0.0000 | 0.0000 |
| 2 | -3.1200 | -1.4500 | 0.0000 | 0.6000 | 0.0000 | 0.0000 | 0.0000 |
| 3 | -2.6000 | -1.4500 | 0.0000 | 0.6000 | 0.0000 | 0.0000 | 0.0000 |
| 4 | -2.0800 | -1.4500 | 0.0000 | 0.6000 | 0.0000 | 0.0000 | 0.0000 |
| 5 | -1.5600 | -1.4500 | 0.0000 | 0.6000 | 0.0000 | 0.0000 | 0.0000 |
| 6 | -1.0400 | -1.4500 | 0.0000 | 0.6000 | 0.0000 | 0.0000 | 0.0000 |
| 7 | -0.5200 | -1.4500 | 0.0000 | 0.6000 | 0.0000 | 0.0000 | 0.0000 |
| 8 | 0.0000 | -1.4500 | 0.0000 | 0.6000 | 0.0000 | 0.0000 | 0.0000 |
| 9 | 0.5200 | -1.4500 | 0.0000 | 0.6000 | 0.0000 | 0.0000 | 0.0000 |
| 10 | 1.0400 | -1.4500 | 0.0000 | 0.6000 | 0.0000 | 0.0000 | 0.0000 |
| 11 | 1.5600 | -1.4500 | 0.0000 | 0.6000 | 0.0000 | 0.0000 | 0.0000 |
| 12 | 2.0800 | -1.4500 | 0.0000 | 0.6000 | 0.0000 | 0.0000 | 0.0000 |
| 13 | 2.6000 | -1.4500 | 0.0000 | 0.6000 | 0.0000 | 0.0000 | 0.0000 |
| 14 | 3.1200 | -1.4500 | 0.0000 | 0.6000 | 0.0000 | 0.0000 | 0.0000 |
| 15 | 3.6400 | -1.4500 | 0.0000 | 0.6000 | 0.0000 | 0.0000 | 0.0000 |
| 16 | 4.1600 | -1.4500 | 0.0000 | 0.6000 | 0.0000 | 0.0000 | 0.0000 |

### 11.10 column (closing)

- Index k at x 0, y (8 - k) x 0.27, z 0, s 0.3143 (= 0.22 / 0.70, block size 0.22 bu), yaw 0. Index 0 is the top block at y +2.16 and index 16 the bottom block at y -2.16. Column height 4.54 bu (16 x 0.27 + 0.22).
- Write order: 0 to 16. The kireji keeps its own slot in this order (position 4), with no special lead.

| index | x | y | z | scale | rotX | rotY | rotZ |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 0 | 0.0000 | 2.1600 | 0.0000 | 0.3143 | 0.0000 | 0.0000 | 0.0000 |
| 1 | 0.0000 | 1.8900 | 0.0000 | 0.3143 | 0.0000 | 0.0000 | 0.0000 |
| 2 | 0.0000 | 1.6200 | 0.0000 | 0.3143 | 0.0000 | 0.0000 | 0.0000 |
| 3 | 0.0000 | 1.3500 | 0.0000 | 0.3143 | 0.0000 | 0.0000 | 0.0000 |
| 4 | 0.0000 | 1.0800 | 0.0000 | 0.3143 | 0.0000 | 0.0000 | 0.0000 |
| 5 | 0.0000 | 0.8100 | 0.0000 | 0.3143 | 0.0000 | 0.0000 | 0.0000 |
| 6 | 0.0000 | 0.5400 | 0.0000 | 0.3143 | 0.0000 | 0.0000 | 0.0000 |
| 7 | 0.0000 | 0.2700 | 0.0000 | 0.3143 | 0.0000 | 0.0000 | 0.0000 |
| 8 | 0.0000 | 0.0000 | 0.0000 | 0.3143 | 0.0000 | 0.0000 | 0.0000 |
| 9 | 0.0000 | -0.2700 | 0.0000 | 0.3143 | 0.0000 | 0.0000 | 0.0000 |
| 10 | 0.0000 | -0.5400 | 0.0000 | 0.3143 | 0.0000 | 0.0000 | 0.0000 |
| 11 | 0.0000 | -0.8100 | 0.0000 | 0.3143 | 0.0000 | 0.0000 | 0.0000 |
| 12 | 0.0000 | -1.0800 | 0.0000 | 0.3143 | 0.0000 | 0.0000 | 0.0000 |
| 13 | 0.0000 | -1.3500 | 0.0000 | 0.3143 | 0.0000 | 0.0000 | 0.0000 |
| 14 | 0.0000 | -1.6200 | 0.0000 | 0.3143 | 0.0000 | 0.0000 | 0.0000 |
| 15 | 0.0000 | -1.8900 | 0.0000 | 0.3143 | 0.0000 | 0.0000 | 0.0000 |
| 16 | 0.0000 | -2.1600 | 0.0000 | 0.3143 | 0.0000 | 0.0000 | 0.0000 |

### 11.11 Stanza open (hero scroll; a modulation, not a formation id)

- Over the hero's 2 vh of scroll, q runs from 0 to 1 and s = sym(q), scrubbed with scrub 0.7. Pitch p = 0.87 + 0.08 s. Row A at y = +(1.05 + 0.08 s), row B at y 0, row C at y = -(1.05 + 0.08 s).
- At q = 0 this is the rest pose of section 11.2. At q = 1 the pitch is 0.95 and the row offsets are 1.13.
- The camera holds during the open (section 10.6, hero keyframe).

### 11.12 Decisions in this part that differ from the inputs

1. Phone closing and footer camera y is 0.00, not the -1.10 of draft B. At -1.10 the column top (2.27 bu) sits 0.53 bu above the visible top edge, so it is clipped.
2. Desktop family camera x is 0.00, not the -0.22 W(z) of the desktop offset. At z 50.02 that offset would move the visible right edge to 8.71 bu, which cuts the Fastest stanza (7.54 to 13.46 bu).
3. Phone speed and pricing use their own fit at the phone aspect (section 10.6). Draft B gives a phone z only for the stanza.
4. Pointer tilt is on the hero only, as in draft B. The code recede translation is damped with T.half, as D13.4 sets for all pointer damping.
5. The hit test uses projected rectangles recomputed once per frame while the pointer is over the canvas (section 10.16). Rectangles computed once at boot would ignore the tilt and the lifts. No raycast is used.
6. Smear is active in the speed section only and stretches along y.
7. Kireji finish is roughness 0.36 and clearcoat 0.50 at every m (draft A finish, kept by critique 7.10).
8. Scrubbed transitions use scrubLocal on stagger positions (architecture section 6). The per-section spans are set in the act files.
9. The column scale is exactly 0.22 / 0.70, so the column is 4.54 bu tall.
10. Cap-2 overlaps on screen between the front stair (blocks 15 and 16) and back row A blocks 3 and 4. This is the front-row layering of D6 and is accepted.
11. The phone family axis is fitted by height (z 80.03), because the axis is rotated to vertical.

### 11.13 Verification record

A one-off node script recomputed all nine formation tables from the formulas in section 11, and the camera keyframes from the formulas in section 10.6. It checked 17 rows per formation, the stagger orders, the block overlaps and the family outline gaps. Result: 0 failures. Output summary:

- Rows: 17 in each of the 9 formations. PASS.
- Stagger orders: each is a permutation of 0 to 16. PASS for all 9.
- Haiku offsets: recomputed from the per-line front profile (totals 0.10, 0.21 and 0.10, breaks at 0.185 and 0.480). Maximum difference from the table is 4.36e-5 s, which is the four-decimal rounding. PASS.
- Overlap, rule 1 (centre distance at least block size x scale, using the larger scale of the pair). The minimum ratio is 1.243 for stanza, cap-0, cap-1, cap-2, recede and family; 1.357 for race; 1.238 for rest; 1.227 for column. PASS for all 9 (a ratio of 1 or more passes).
- Overlap, rule 2 (oriented boxes, rotation about y, separating-axis test, sharp boxes, which is conservative). The minimum separation is 0.1700 bu for stanza and family, 0.2500 for race, 0.1055 for cap-0, cap-1 and cap-2, 0.1054 for recede, 0.1000 for rest and 0.0500 for column. All above 0, so no two blocks intersect in 3D in any formation. PASS.
- Screen-space overlap (depth-separated pairs). Only cap-2 has it: pairs 3-15, 4-15 and 4-16, depth separation 2.30 bu. Section 11.6 accepts this. No other formation has it.
- Family outlines: neighbouring gaps are 1.08, 1.08 and 1.08 bu. PASS.
- Camera at 1440 x 900 (aspect 1.6): hero z 21.15 and x -2.89; speed z 31.95; pricing z 20.07; closing z 14.60 and x -2.00; family z 50.02 and x 0. Fit fractions: race 0.8000, rest 0.7000, family axis 0.9000. PASS.
- Camera at 375 x 812: hero z 39.25; speed z 110.70; pricing z 69.54; family z 80.03 (height fit); closing z 14.60. With camera y -1.10 at closing, the column top is clipped by 0.53 bu, which is why the phone closing y is 0. Finding confirmed.
