# Director decisions for the merge (binding)

Owner: director. Inputs: direction-A.md, direction-B.md, critique.md, research/notes-*.md. The final design/direction.md follows the critique's merge plan (critique section 7) EXCEPT where this file says otherwise. Where this file and the critique disagree, this file wins.

## D1. Base

Take B as the base (industrial object: lit like a product photograph, annotated like an engineering drawing) with A's typographic rules, motion grammar and 2D placements, exactly as the critique's section 7 lays out. Delete the phrase "Restraint reads as confidence" from the document; show it, don't say it.

## D2. Overrules of the critique (the client brief requires these)

1. Direction-aware hover stays. The brief asks for "hover states that respond to cursor direction". Implement cheaply: a 1px (links) or full-height (buttons, table rows) pseudo-element scaled on X from 0 to 1 with transform-origin on the entry side, `press` curve, T.micro. No clip-path, no gradients. Touch: centre origin. Reduced motion: colour change only.
2. A cursor that changes meaningfully per section stays. Exactly four custom cursor forms, fine pointer only, never under reduced motion, never on touch: hero = datum (B), speed = caliper (B), capabilities = marker (B, 7px square in seal-ink), closing = ruler (B, snaps to the 17 block centres). Family = datum again (it is a measuring view). Code, pricing, footer = native. Throttle any hit test to one per frame using the screen-space block rectangles from the boot camera (critique 7.9).
3. Text that splits and reassembles stays (brief: "text that splits and reassembles on reveal"). Rule: section titles (display-xl, below the fold only, never the hero h1) are split into characters with GSAP SplitText (aria handled: the parent keeps an aria-label with the full text, chars aria-hidden). On reveal (title top crosses 80% of viewport height) each character starts displaced horizontally away from the line centre by `(i - centre) * 0.06em` (the word is "blown open" along the line, never vertical, never hidden) and coloured text-3; it reassembles to its set position and token colour over T.beat7 with `settle`, using the per-line front-profile stagger (critique 7.7). Opacity never goes below 1. Under reduced motion the title is static.
4. Kinetic hero h1 stays: letter-spacing settle (B) from +0.02em to the token value over T.beat7 with settle, plus a variable-axis move on the weight axis from 400 to 430 and back to 400 across the first 0.5 of hero scroll (scrubbed, sym). Text is visible and legible at first paint.
5. The post stack stays, subtle, as in B with the critique's fixes (threshold 0.96 in linear space, DoF pass removed from the chain when off, CA gated below 40 px/s). The brief asks for bloom, chromatic aberration, grain and DoF, all subtle.
6. Lenis stays on for touch as well (architecture default), but with `syncTouch: false` (native touch momentum, Lenis only reads it). Off under reduced motion.

## D3. Facts that change the plan (from research/notes-*.md; final ids come from research/facts.md)

- There is NO verified speed number (no tokens per second, no latency in ms). The verified speed facts are: the models overview "Comparative latency" row (Fable 5.1 "Slower", Opus 5.5 "Moderate", Sonnet 5.5 "Fast", Haiku 5.5 "Fastest", with the note "Relative to the current lineup. Actual latency depends on prompt length, output length, and thinking effort."), and the launch post's "our fastest model to date" with its footnote ("at each model's standard speed, although it runs less quickly than our Opus models in Fast Mode").
- Therefore the speed section has NO figure slot and NO count-up. Remove every figure slot from speed. Speed shows what fast feels like through motion: the race formation driven by the reader's own scroll velocity (smear), plus a 2D layer of a streamed response (illustrative text streaming in fast, clearly an example, no claims), plus the verified line "Fastest" in the current lineup with the footnote qualifier set in small type. No comparison race against other models (a race would imply magnitudes we cannot verify).
- Family (verified, models overview): four current models in the comparison table, in this order: Claude Fable 5.1 ("For demanding reasoning and long-horizon agentic work", Slower, $10 / $50 per MTok), Claude Opus 5.5 ("For long-running agentic coding and knowledge work", Moderate, $4 / $20), Claude Sonnet 5.5 ("The best combination of speed and intelligence", Fast, $2 / $10), Claude Haiku 5.5 ("For high-volume, latency-sensitive tasks such as classification, extraction, and routing", Fastest, from $0.10 / from $0.50). Do not show Claude Mythos 5.1 (not in the comparison table; limited availability).
- Capabilities, fixed by the director (three, one per row, rows 5 / 7 / 5):
  - cap-0, row A (5 blocks): Computer use and browser use. Verified number: OSWorld 2.1, offline subset, partial-credit score: Haiku 5.5 72.4%, Haiku 4.5 15.7%.
  - cap-1, row B (7 blocks): High-volume work: summaries, compaction, classification, routing (launch post wording). No number.
  - cap-2, row C (5 blocks): Adjustable effort: "the first Haiku with effort controls"; the five effort levels on the launch charts are Low, Med, High, Xhigh, Max. Five levels, five blocks in row C.
- Pricing (verified, launch post and docs): per million tokens, prompts up to 100K tokens: $0.10 input, $0.50 output; prompts over 100K: $0.50 input, $2.50 output. Batch 50% off; prompt caching saves up to 90%. "On average, it now costs around 75% less to run" than Haiku 4.5. Context 1M tokens, max output 128K tokens.
- Availability (verified): Claude API, Amazon Bedrock, Claude Platform on AWS, Google Cloud, Microsoft Foundry; Claude Code; Claude.ai for Free, Pro, Max, Team and Enterprise on web, iOS and Android.

## D4. Family formation and layout (replaces A's stacks and B's rows)

The family section is a dimensioned axis, read like a drawing: a horizontal dimension line labelled with the docs' four latency labels at four stations, left to right: Slower, Moderate, Fast, Fastest. At each of the first three stations, the sibling model is drawn as a PHANTOM OUTLINE (drafting convention for adjacent parts shown for reference): a 3D rounded-box outline the size of the full stanza bounding box (5.92 x 2.80 x 0.46 bu at B's pitch), drawn with dashed lines (dash 0.17 bu, gap 0.07 bu, in rule-hair-ink), no fill, no shading. At the Fastest station, the 17 real blocks stand in the stanza, solid and lit. One label block per station in the 2D layer (DOM, positioned from the projected station centre on resize): model name (heading), latency label (label style), description (small), price (label style, tnum). Haiku's label is text-1-ink; sibling labels are text-2-ink.
- Station x positions (bu): -10.5, -3.5, +3.5, +10.5 (station pitch 7.0). The stanza at the Fastest station is centred at x +10.5. Camera fits the whole axis width (28 bu including margins) at 0.9 of the viewport width using B's fit formula; on phones (aspect below 1.0) the whole axis rotates to vertical (stations stacked top to bottom: Slower at top, Fastest at bottom), group rotation z = -PI/2 with blocks counter-rotated so they stay upright, and the label blocks sit to the right of each station.
- Formation `family`: the stanza translated to x +10.5 (scale 1.0). Stagger: kireji first, then the per-line front profile.
- Phantom outlines are part of the family section's GL layer: one LineSegments object with LineDashedMaterial (3 boxes in one geometry, one draw call). This is not a wireframe globe; it is a static drafting convention with a written reason, recorded in the ban-list exceptions.
- Hover a label block (fine pointer): its phantom outline's dash pattern runs (dashOffset animated) for as long as the pointer is over it; Haiku's label lifts the stanza 0.15 bu with `follow`. Touch: tap toggles. Keyboard: the label blocks are plain text, not focusable.

## D5. Speed section layout

- 2D: the verified line set large: "Fastest" (display-xl, split-and-reassemble rule D2.3) with the latency label source note in small type ("Comparative latency, relative to the current lineup") and the footnote qualifier. A streamed-response panel (columns 1 to 6 on desktop, top 58% of viewport): an illustrative summary that streams in token by token, paced by scroll velocity (faster scroll, faster stream; floor of 34 tokens per second of page time so it never stalls), in the code style, with a label "Example output". It contains no product claims.
- 3D: race formation (B), camera fit (B), smear from scroll velocity, DoF (B values).
- Remove the 17-tick figure axis from A; keep B's dimension line under the race with the label "17".

## D6. Capabilities motion graphics (2D layer, one hand-built SVG each, no two alike)

- cap-0 computer and browser use: a 5-field form drawn in hairlines; a cursor path (DrawSVG) visits the fields in order and each field fills with a short bar (MorphSVG from an empty caret to a filled bar). The OSWorld figures sit beside it as two horizontal bars on a shared dimension line (72.4 and 15.7, labelled with model names and the benchmark name and condition), drawn with DrawSVG, tnum.
- cap-1 high volume: a conveyor of 7 small squares entering from the left, each sorted into one of three labelled bins (summary, classification, routing) along leader lines; it loops while the section is in view, paused when out of view.
- cap-2 effort: a 5-step stair of squares labelled Low, Med, High, Xhigh, Max (the launch chart labels, verbatim). Scroll scrubs the active step; the active step fills seal-ink. In 3D the 5 blocks of row C step up the same stair (cap-2 formation: row C blocks at y offsets 0, 0.17, 0.34, 0.51, 0.68 bu above the row line, front row).

## D7. Closing

B's column (4.54 bu) and camera keyframe, with the per-character colour turn-on of a 17-syllable haiku set vertically (vertical-rl) beside the column. The haiku is written by the copywriter, 5-7-5 syllables, makes no product claim that is not in research/facts.md, at most 26 characters per line is NOT required (it is set as three short vertical lines, right to left, each line one vertical column, so the closing shows a three-line haiku next to a one-column object: the reader sees the text in three lines and the object in one). CTA under it: "Read the docs" (links to the Haiku 5.5 docs page) and a secondary "View sources" (jumps to the footer sources list).

## D8. Footer

B's title block plus: a sources list (every URL cited on the page, from research/facts.md, as plain links), links to official docs (models overview, Haiku 5.5 overview, pricing), and the line "Unofficial fan and showcase page. Not affiliated with Anthropic." DATE cell is 2026-10-08.

## D9. Fonts

Bodoni Moda Variable + Geist Mono Variable (B). Perf measures size-adjust and ascent/descent overrides for both fallbacks against the real fonts (A's method) instead of 100%. Run the 16px body legibility check on screenshots in polish pass 1; the fallback path (Newsreader wght-only) is decided then, not now.

## D10. Ink bleed

B's 1D front that tracks the boundary, with these fixes: text-free band of 0.18 vh at the bottom of each paper section before an ink boundary and at the bottom of each ink section before a paper boundary; block colour and environment intensity follow p; plain cut under reduced motion and without WebGL; the section's data-theme switches at p = 0.5.

## D11. Composer colour space

Linear working space with HalfFloat render targets; hex values are converted to linear before upload (THREE.Color handles sRGB to linear when ColorManagement is enabled, which is the default in three r152+); output sRGB in the final pass. Bloom threshold 0.96 is compared in linear space.

## D12. Ban-list exceptions to record

Bloom (specular only, threshold 0.96), Lenis (lerp 0.1, off under reduced motion), follow overshoot (1.86%, objects only, once per arrival), phantom dashed outlines in the family section (drafting convention, static, not a globe or a rotating wireframe).

## D13. Engineering facts discovered in Phase 2 (apply in the direction)

1. three 0.186.1 removed PCFSoftShadowMap for WebGL. Shadows use THREE.PCFShadowMap; softness comes from the shadow camera size and map resolution, not the map type.
2. The head script no longer creates a WebGL context (43 ms cold in software GL). It checks `typeof WebGL2RenderingContext !== 'undefined'` and `?nogl`. If context creation fails later, boot adds `html.no-gl` and the static fallbacks appear.
3. gsap.ticker is the page's only application loop. ScrollTrigger keeps an internal empty requestAnimationFrame callback (a Safari workaround in gsap 3.15) that cannot be removed without disabling ScrollTrigger; it is accepted.
4. Pointer velocity smoothing uses a 0.1 s time constant (local constant), damping uses T.half.

## D14. Document split (the direction is written as five files)

- design/direction.md: headings 1-9 and 13-16 (concept, references, palette, typography, grid and spacing, easing, timing, motion principles, cursor, focus and interaction, ban-list exceptions, open questions, changelog). Heading 10, 11 and 12 in this file are one line each pointing to the files below.
- design/direction-3d.md: heading 10 (3D direction) and heading 11 (formations).
- design/direction-act1.md: heading 12 for preloader, hero, speed.
- design/direction-act2.md: heading 12 for capabilities, code, family.
- design/direction-act3.md: heading 12 for pricing, closing, footer.

## D15. Director review of direction-3d.md (applies on top of it)

1. Phone race (aspect below 1.0): the race formation turns vertical, like the phone family axis. Pose transform for portrait: (x, y) -> (y, -x) for positions, so index 0 is at the top and index 16 at the bottom; blocks keep rotZ 0 (they are square, so no counter-rotation is needed). Camera fit by height: z = 15.90 / (0.80 x 2 x tan 11 deg) = 51.12, x 0, y 0. Smear still stretches along screen y, which is now the race direction.
2. "T.stride" in any direction file means T.beat7 (0.7 s). The timing module has no T.stride.
3. Pose scale is a single number s (uniform). Smear is a shader stretch, not a pose scale.

## D16. Copy overrides after the fact-check (director)

These override the act files where they differ.
1. Code section: a complete, runnable TypeScript program, not a fragment. At most 11 lines in the REQUEST block, at most 52 characters per line; the EXAMPLE OUTPUT block at most 4 lines of at most 52 characters. Shape: import Anthropic from "@anthropic-ai/sdk"; const client = new Anthropic(); await client.messages.stream({ model: "claude-haiku-5-5", max_tokens: <n>, output_config: { effort: "low" }, messages: [...] }).on("text", (t) => process.stdout.write(t)); — each part confirmed on a primary docs page and recorded in research/facts.md (streaming page TypeScript example; effort page request shape).
2. Hero lede: Anthropic's positioning line, attributed and quoted: Anthropic calls it "the cheapest, fastest, and most capable small model we've ever released", designed for high-volume, cost-sensitive tasks. [F-20, F-22]. At most 28 words.
3. Capabilities title: "Narrow tasks, at volume" [F-15, F-22]. Kicker stays "Capabilities".
4. Family title: "Four models, by latency" [F-139, F-140]. Kicker stays "Family".
5. The streaming docs page is a source: the researcher adds a facts.md entry for it, and the copy cites it in code-sources and the footer sources list.

## D17. Accepted after the D16 verification

1. capabilities.title cites [F-22, F-24]; D16.3's F-15 was a wrong id.
2. The code example combines two documented shapes: messages.stream(...).on("text") (F-231) and output_config as a top-level Messages request parameter (F-233, F-234, F-235). No docs page shows the two together, and it has not been run against the live API (no key in this environment). Logged in PROGRESS.md under "Cut or unverifiable".
3. The hero quote (F-20) is Anthropic's own unqualified lead line; the standard-speed qualifier (F-37) stays with the speed section footnote.

## D18. Backgrounds and the canvas (resolves a layering conflict)

The canvas sits behind main (z-index 0), so an opaque CSS section background hides the 3D. Therefore:
1. By default (no JS, while loading, html.no-gl) every section paints its own CSS background from its data-theme (paper or ink), with plain cuts at the act boundaries.
2. When the GL boot has rendered its first full frame it adds html.gl-ready. Under html.gl-ready every section background is transparent and the background shader paints the ground.
3. Under reduced motion with WebGL on, the background shader paints a plain cut at the act boundaries (the bleed progress snaps to 0 or 1 at the boundary line, no front, no fibre motion). CSS backgrounds are not used for this, because they would cover the blocks.
4. The switch to html.gl-ready is seamless because the shader's base colours equal the CSS colours.

## D19. Act III and family camera (after the cross-file review)

1. Pricing availability panel: option (a) of direction-act3's "Decisions this section could not apply": no extra gap inside availability item 5, so the panel bottom sits at 588.3 px at 1440 x 900, 5.7 px clear of the rest band.
2. Phone family camera x is +4.02 bu (0.28 x W(z) at the phone family key), so the station label blocks fit to the right of the vertical axis. Desktop family x stays 0. src/gl/rig.ts cameraKey('family') must return this on phones; src/core/projection.ts stationCenters follows cameraKey automatically.
3. Act III five-item groups get a lead: the first item starts T.micro before the others and uses cut, the followers settle (direction.md heading 8 rule 1).
4. D16 wins over direction-act2.md where they differ: the code request is up to 11 lines (D16.1), and the family title is "Four models, by latency" with the kicker "Family" (D16.4).

## D20. 2D labels and 3D objects stay locked together on screen (integration review)

The canvas is fixed and the DOM scrolls. Any 2D element that labels or annotates a 3D object must stay on its object at every scroll position, not only at one rest progress.
1. Family: DOM-anchored 3D. The family GL handle reads the screen y of the station label row (the 2D layer exposes it as the element [data-anchor="family-stations"]; read its rect once per frame, it is a single getBoundingClientRect on a cached element) and offsets the family group (blocks group and phantom outlines) in world y so the stations sit at their label positions: dy_bu = dy_px / pxPerBu at the family plane (pxPerBu from projection of a 1 bu segment at z 0 with the current camera). The same offset drives the vertical axis on phones (x and y swap per the portrait rotation). The 3D therefore scrolls with the page through the section; the entry move (formation and camera) still follows p.
2. Hero annotations (05, 07, 05, 17, the dimension line) and the speed race dimension line live in a fixed overlay layer positioned from the projection each frame, or are compensated for scroll, so they never drift off their blocks. Whichever the section uses, verify at s = 0, 0.25, 0.5 and 1.
3. Chromatic aberration must be exactly 0 px at rest (scroll velocity below 40 px/s, D2.5). Fringes on block or outline edges in a still screenshot are a bug.

## D21. Phase 3 integration decisions (2D agents' open items)

1. Accepted as built: hero and speed sticky stages; raw (unscrubbed) section progress in 2D and 3D, with Lenis as the only smoothing; the hero kicker "Launched October 7, 2026"; the capabilities title/intro/card placements and taller phone cards; code panel placement on phones (fully visible from p 0.53); the preloader keeping its live region exposed; the footer's added Bedrock source.
2. Speed on phones (aspect below 1): the vertical race stays (D15.1) but moves to the right edge: camera x offset so the race column's centre sits at 86% of the viewport width (height fit 0.80 unchanged). All speed text and the example panel live in the left band, from the margin to (race column left edge minus 12 px). The rig owner adds the offset to cameraKey('speed') on phones; the speed 2D owner narrows the panel to the band; projection follows cameraKey.
3. Code: the request types itself out (client brief: "an animated API call ... that types itself out and streams a response"). Driven by section progress p from 0.10 to 0.45 (reversible with scroll), character groups appear left to right line by line with a 2 px seal-text caret at the insertion point; then the response streams in as the act specifies (p 0.45 to 0.75). The full code is in the HTML, so no-JS, reduced motion and screen readers get it whole; under reduced motion everything is shown at once with no caret. This overrides direction-act2's "no character appears" rule for the code section only.
4. Reduced motion: no section crossfades. Every section is fully visible and static under reduced motion; only the canvas crossfade of act I rule A5 remains (it hides nothing that is text).
5. The kireji stays seal in every no-WebGL fallback, including the code section's recede elevation.
6. scroll.ts: before every scrollToTarget, if |window.scrollY - lenis.animatedScroll| > 1, resync Lenis to the native position (immediate) so element targets land exactly; then capabilities can drop its compensation.
7. Speed race annotations follow the blocks during the entry (s 0 to 0.25): the speed 2D may import the pure data module src/gl/blocks/formations.ts (FORMATIONS, lerpPose, staggerPosition) and src/core/timing.ts scrubLocal to build the pose at u, then blockRects from projection.ts. Same exception as hero.

## D22. Integration fixes (first full-page review)

1. Choreography update order: every frame, update the current section, then update the next section in page order whenever its own progress is above 0 (it is entering), so the entering section's pose and camera are the last write. Never let a current section overwrite an entering one.
2. Depth of field focus = the distance from the camera to the z = 0 plane for the section's key at the current aspect (cameraKey(key, size).position[2]); bokeh as given. This keeps the stanza plane in focus on phones (hero z 39.25) and desktops (21.15) alike.
3. Exposure (m = 0, paper, hero camera, 1440 x 900): the rendered front face of an anodised block must read within 8 per channel of #34332F, and the kireji front face within 10 per channel of #A9372E (sample the centre of a front face in a screenshot). Tune scene.environmentIntensity and the key intensity (lighting.ts) to hit it; keep the paper ground exact (#F1ECE0) because the background is unlit. Record the final values in a comment and in direction-3d.md is not required (the director records the deviation).
4. Shadow: the shadow catcher moves to z -0.5 with key shadow.radius 4 (PCFShadowMap supports radius) so the shadow tucks under the blocks as a soft contact shadow, not an offset drop shadow; opacity 0.12 on paper, 0.45 on ink.
5. Chromatic aberration is exactly 0 at rest (velocity below 40 px/s after damping): find why fringes show in still frames and fix it in post.ts.
6. Cursor labels (block numbers, caliper value, ruler number) sit on a knockout: background var(--bg), padding 2px 4px, so they read over blocks; the unit "bu" stays lowercase (wrap it in a span with text-transform: none).
7. Hero no-WebGL fallback stays at opacity 0 until loader:done, then fades in over T.half (preloader handoff, act I).
8. SectionGLContext gains bleed: { p1, p2 }: the eased (sym) and smoothed (T.beat7) boundary progress, the same values that drive the background's ink front (0 or 1 under reduced motion). The choreography fills it every frame before it calls any handle. Capabilities' camera entry follows p1 as act II line 37 specifies, so the camera and the ink front move together.
9. With the update order of item 1 in place, section handles must not re-apply their own state from extra ticks (no "guard" or "re-apply" ticks at PRIORITY.state + 6). Remove them from capabilities/gl.ts and closing/gl.ts; a handle writes only from update().
10. Speed on phones: a hovered or tapped block lifts sideways (+0.15 bu on screen x, i.e. along the pose's x after the portrait transform), not along the column. Tap toggles (act I).
11. Choreography calls: the current section's update() runs every frame with no skipping on unchanged progress, then the entering section's (item 1). When an entering section's progress returns to 0, its update(0) runs once more, so the last write is its entry-start pose (the previous section's exit pose).
12. Family DOM anchor (D20.1, exact contract): the 2D stage element .family__stage carries data-anchor="family-stations". It is the viewport-sized box (100 svh tall, full width) in whose coordinates the 2D places every station label from projection.ts, as if its top-left were the viewport origin. The family GL reads its rect.top each frame (dy_px) and sets an IMMEDIATE (undamped) world y offset of -dy_px / pxPerBu on the blocks and on the phantom outline group, multiplied by the family entry completion e (0 at the entry start, 1 when the entry is complete), so the handoff from code has no jump. The family handle writes this offset unconditionally on every update() call. pxPerBu = viewport height / (2 d tan(fov / 2)) with d the camera's distance to the z = 0 plane.
13. Blocks.setGroupOffset(x, y, z, immediate = false): immediate sets the current value as well as the target (no damping), and a getter groupOffset returns the current target (read-only). Used by family (item 12) and pricing (item 14).
14. Pricing entry inherits the family offset: each update() reads blocks.groupOffset and the y of the object named 'family-phantom-group' (both written by family earlier in the same frame) and writes them back multiplied by 1 - sym(eff), immediate, so the blocks come back from where the family left them. At eff 1 both are 0.

## D23. Phase 4 round 2 (from the integration-fix reports)

1. Text theme follows the ink front, per block. A single section-level theme flip at p = 0.5 leaves text on the wrong ground while the front crosses it (pricing title cream on paper at p2 0.23). With WebGL, for each boundary b (1: speed above, capabilities below; 2: family above, pricing below), every element marked data-theme-block inside those two sections takes the theme of the lower section when its rect centre is below the front's screen line, and the theme of the upper section otherwise. The front line is the same eased and smoothed value that draws the background front. Outside a bleed window this reduces to each section's own theme. Without WebGL the plain section-level cut stays. Sections stop applying the global 'theme' event to themselves. Granularity: one data-theme-block per visually separate text block (a head group, a card, a panel, a label row, a table).
2. A section whose entry follows a bleed value counts as entering while that value is above 0: capabilities is called (step b, and the single return-to-0 call of step c) while ctx.bleed.p1 > 0, not only from its centre-line progress. Its handle reads p1 itself.
3. Scroll velocity is measured on the wall clock (performance.now), not the clamped page clock, so a slow frame cannot inflate it (root cause of the chromatic aberration at rest). The post damping already runs on the wall clock. The speed smear, which reads the same velocity, is rechecked.
4. Code: the request starts typing when its first code line reaches 85 % of the viewport height (converted to section progress at layout time) and types over 0.30 of progress; the response then streams over the next 0.25: it appears in bursts of 1 to 4 words at an uneven cadence with the caret at its end, space reserved, reversible with scroll. This replaces the act's dim-to-lit colour stream for the response (client brief: "streams a response"). The marker stays hidden while typing (accepted).
5. Closing: the text layer is on only while the closing section is in its own range (strict booleans from ScrollTrigger; phone start at the section top). Every "bu" unit on the page is lowercase (closing labels and the footer SVG text included).
6. Speed: the no-WebGL fallback row stays hidden until loader:done (as the hero, D22.7); paint never runs before layout; the speed annotation layer is off outside the speed section at every scroll position.
7. Family GL: the phantom outlines fade in with the entry completion e (no pop at the entry start), and the x group offset the code section leaves (pointer) is carried as x = groupOffset[0] x (1 - e).
8. Family 2D on phones: each station label sits at its own station's projected y (the label pitch equals the station pitch), not in a fixed stack.
9. Blocks under reduced motion: the group offset snaps to its target (no damping, no forced 0), so DOM-anchored offsets hold. No section writes a pointer offset under reduced motion.
10. Pricing: the inherited offset fades with cut (front-loaded) instead of sym, so the blocks come back into view early in the entry.
11. Loader: the timeout warning is development-only, and the case where every task has settled but loader:done has not been emitted is a bug to fix at its root.
12. Speed GL: the setDof call in speed/gl.ts is redundant under D22.2 and is removed. The single-lift rule for touch in both orientations is accepted.
13. Cursor: the caliper and ruler ticks and lines get a 1 px var(--bg) halo so they read where they cross blocks.
14. Accepted as built: hero annotations from the front-face P1 (sub-pixel against the silhouette), annotations shown at loader:done with WebGL; the speed overlay hidden from s 0.833; lighting fill 1.6 at paper (4.6 x the direction value, D22.3 measured targets win); catcher 30 x 30 and shadow camera +-14; capabilities blocks also follow p1.

## D24. Phase 4 round 2 follow-ups

1. Family on phones: the head group (kicker, title, intro) moves out of the stage into the section's flow above it (the first 50 svh of the section), so the stage holds only the axis and the four station labels, each at its own station's projected y (within 3 px). The stage keeps the D22.12 anchor contract. This replaces the stacked labels that sat up to 61 px off their stations, and stops the Slower outline crossing the title.
2. Family entry: the anchor residual dy x (1 - e) while the entry runs (8 px at stage top +0.2 vh) is accepted; the lock is exact from the end of the entry.
3. Pricing under reduced motion: the family stanza scrolls away with its labels and the pricing row appears at the reduced-motion cut (w_p 0.5). Accepted.
4. The speed smear damps on the wall clock, like the post (timeline.ts).
5. Footer: the footer box passes pointer events through except on its own links, buttons and text blocks, so the closing CTA stays clickable wherever it is visible.
6. Closing text layer and keyboard: the CTA links must stay reachable by Tab from anywhere on the page. When one receives focus outside the layer's range, the page scrolls the closing into range (scrollToTarget) so the focused link is visible. (Phase 6, accessibility.)
7. Family GL round 2 choices accepted: the carried x also moves the phantom group; the phantom material is transparent; the carry is read on the first entering frame and kept through setActive(true).
8. Tokens: [data-theme="paper"] restates the paper colour tokens so a paper block inside an ink section flips back (added by the director in tokens.css).

## D25. Legibility at the act boundaries (round 2 findings)

1. The ink front is drawn at the DOM boundary. Its mean line is the screen y of the lower section's top edge in every frame (from cached geometry and scrollState.y), with no easing and no smoothing of its position, in normal and reduced motion. The wave stays, with its amplitude capped below 60 % of the lower section's top padding at the current size, so no text block can ever sit on the other section's ground. The 3D keeps the eased and smoothed values (ctx.bleed, block mix m, lighting, post). theme-front.ts uses the same front line, so every block resolves to its own section's theme by construction. Reason: a per-block flip cannot keep a tall title legible while an eased front crosses it (measured: title upper half at 1.0:1 for about 300 px of scroll), and the act's reduced-motion edge "at the pricing top" now holds in both modes.
2. Text that scrolls across the fixed 3D gets a per-line knockout (background var(--bg), box-decoration-break: clone, padding 0 0.2em, no other change of layout): the hero lede and CTA row on phones, the capabilities head and intro, the pricing head and intro. Labels already have knockouts (D22.6).
3. The speed annotation layer turns off as soon as the capabilities top edge passes above the dimension line's y (the boundary would otherwise cross the "17" label).
4. Seal #B5312A on paper-deep #E4DCCB (4.48:1) is allowed for graphics only (card mark, cap-2 active step); never for text.

## D26. Family and footer follow-ups (round 3 reports)

1. The family head (kicker, title, intro) joins the D25.2 knockout list: the code section's recede pose and the phantom outlines cross it during the family entry at every size.
2. Short phones (narrow layout, viewport height below what the four labels need): labels stay centred on their stations where the stack fits, and are pushed apart by the minimum amount (12 px gaps) only where it does not. Centring wins wherever it is possible.
3. Accepted: the family head scrolls in above the stage on phones (it is above the viewport while the stage is at rest); the anchor residual during the phone entry (up to 22 px at stage top +0.2 vh); the axis title stays above the axis inside the stage; head padding sp-6.
4. Footer: pass-through accepted as built. The phone-landscape overlap of the closing CTA and the footer title block goes to the polish passes.
