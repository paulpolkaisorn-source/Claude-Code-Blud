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
