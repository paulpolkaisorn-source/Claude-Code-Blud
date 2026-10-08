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
