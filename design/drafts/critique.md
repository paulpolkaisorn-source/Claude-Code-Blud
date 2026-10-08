# Art direction critique (Phase 1): direction A against direction B

Date: 2026-10-08. Reviewer: art director (critic). Inputs read in full: design/architecture.md, design/drafts/direction-A.md, design/drafts/direction-B.md, design/drafts/contrast-A.mjs, design/drafts/contrast-B.mjs. Owned output: this file only. Verification scratch lives in /tmp/fontcheck-critic and the session scratchpad.

## 0. Result

| | A (editorial print) | B (industrial object) |
|---|---|---|
| Total (8 criteria, 1 to 10 each, max 80) | 53 | 56 |

B is the better base for the 3D, camera, performance and accessibility contracts. A is the better base for typographic rules, the motion grammar and the 2D placements. The merge takes B as the base and imports A's typography rules, motion tables and 2D placements, with the fixes in section 6 and the heading plan in section 7.

## 1. Scores

| Criterion | A | B | Reason (section refs are to each draft) |
|---|---|---|---|
| (a) Specificity | 7 | 7 | A: exact formulas, coordinates and 2D columns. Missing: CSS token names, a speed camera fit, transitions between group offsets, the preloader group offset, and the size-adjust value (deferred to perf). B: CSS names, ready @font-face, camera fit formulas. Missing: placement of the lede, CTA, speed figure, pricing table and code panel; the 'scrub' ease for the ink front is ambiguous. |
| (b) Concept and ban list | 7 | 7 | A declares four exceptions in its section 14 (long pin, Lenis, bloom, overshoot). B declares none, but its haiku stagger is uniform inside each line (section 7), which the brief bans, and it changes architecture rules (critique section 5). |
| (c) Avoids the generic look | 6 | 6 | Both carry the same stock moves, named exactly in section 2. |
| (d) Typography | 8 | 7 | A: the stronger rule set and the correct size-adjust method. B: the right families, budget (69,388 bytes, no subset) and ready @font-face, but size-adjust 100% (architecture section 5 requires a no-shift fallback) and 16 px body in a high-contrast didone with no reading test. |
| (e) Motion system | 8 | 7 | A: seven curves with "used for" and "never used for", every claimed value reproduces, non-uniform weighted staggers, lead-then-followers. B: haiku stagger uniform inside each line; section switches at T.half where architecture section 8 says T.beat5. |
| (f) 3D direction | 6 | 8 | B: block geometry, material per act, shadow catcher, RoomEnvironment, light rig, camera fit formulas, gated post. A: strong kireji material, but the ink bleed runs ahead of the act boundary and the blocks do not change colour with it (critique section 5, item 1), the key shadows have no receiver, and the room material is not implementable as written. |
| (g) 60 fps on a mid laptop and phone | 5 | 7 | B: tiers with the watchdog order, DoF only in speed and code, a 1D ink front, gated chromatic aberration. A: no tiers, DoF pass stays in the chain at zero strength outside code, and the ink front is a domain-warped 4-octave noise evaluated full-screen per pixel. |
| (h) Accessibility | 6 | 7 | Both contrast tables reproduce and pass. A: paper-theme text and the race blocks can sit on ink at 1.10:1 during the bleed; no reduced-motion rule for the custom cursor. B: the bleed band is far smaller but ungated; no reduced-motion or no-WebGL cut at the act boundary; section fades at T.half. |
| Total | 53 | 56 | |

## 2. Generic-look drift (criterion c), exact places

Both drafts drift toward the stock WebGL and agency-site look. Named places:

- A section 9 (cursor table): five custom cursors (registration mark, tick, dot, I-beam, bar). A section 12 closing: a reading rule that follows the pointer and lifts the nearest block. Both are stock.
- A section 13: entry-side hover fill on buttons and table rows, and entry-side underline draw.
- A section 10 post stack: bloom, chromatic aberration keyed to scroll velocity, grain, vignette, depth of field. A section 10 room: a procedural studio softbox.
- A section 4 and section 12 preloader: display tracking settles from -0.05em to -0.035em (kinetic type).
- A section 1: "Restraint reads as confidence."
- B section 9: four custom cursors (datum, caliper, 7 px marker, ruler).
- B section 13: clip-path wipe from the entry side on the primary button; entry-side underline growth.
- B sections 4 and 12: display tracking settles from +0.02em to -0.02em (kinetic type).
- B section 10: the same bloom, chromatic aberration, grain and vignette stack; three-point studio rig plus RoomEnvironment (product-render default).
- B sections 11 and 12: hover lifts on capability cards (0.2 bu) and family rows (0.3 bu).
- B section 1: "Restraint reads as confidence, because nothing moves that has not been measured."

## 3. Verification log (what was run, what matched)

Contrast scripts (run with node, exit codes checked):
- contrast-A.mjs: exit 0. Self-tests pass (21.000, 1.000). The 27 pair rows and the OKLCH table match direction-A.md section 3 value for value.
- contrast-B.mjs: exit 0. 34 pairs, 0 failures. The palette OKLCH table and the 34 rows match direction-B.md section 3 value for value.
- Missing rows, values not wrong: A has no row for the kireji #B5392B on paper (5.02:1, passes as a graphic). A's row "Hover button label and selection, both themes" is wrong for ink (ink hover uses accent-text #EE7A64, which has its own row). B has no row for focus-paper #9A2820 on paper-deep #E4DCCB (5.71:1, passes).

Font packages (npm pack of @fontsource-variable/newsreader, geist-mono and bodoni-moda at 5.3.0, CSS read, WOFF2 tables parsed):

| Claim | Draft | Measured | Result |
|---|---|---|---|
| Newsreader latin opsz file 132,000 bytes | A | 132,000 | OK |
| Newsreader wght 200 to 800; opsz 6 to 72, default 18 | A | same | OK |
| Newsreader GSUB liga, pnum, rvrn, tnum; GPOS kern | A | same, plus GPOS mark and mkmk | OK (list incomplete, harmless) |
| Geist Mono latin file 23,128 bytes; wght 100 to 900 | A and B | same | OK |
| Geist Mono GSUB ccmp, dnom, frac, locl, numr; GPOS mark, mkmk | A and B | same | OK |
| Bodoni Moda latin opsz file 46,260 bytes; opsz 6 to 96, default 11; wght 400 to 900 | B | same | OK |
| Bodoni GSUB liga, pnum, tnum; GPOS kern | B | GSUB also ccmp, frac, locl; GPOS also mark | OK (list incomplete) |
| Newsreader and Bodoni cover degree, plus-minus, multiply, Ø, minus, en and em dash, curly quotes, ellipsis | A and B | present | OK |
| Arrows U+2190 to U+2193 absent in Bodoni and Newsreader; Newsreader lacks ≈ ≤ ≥ | A and B | absent | OK |
| Bodoni has thin space U+2009 and en space U+2002 | B | present | OK |
| Bodoni lacks primes U+2032 and U+2033 and U+2300 | B | absent | OK |
| Geist Mono has ↑ U+2191, ↓ U+2193, ′ U+2032 and ″ U+2033; lacks → U+2192, U+2300, U+2009, U+2002, U+2215 | B | as claimed | OK |
| Newsreader lacks U+2009 | A subset list includes it | absent | Harmless. Remove from the subset list |
| A subset omits degree U+00B0 and plus-minus U+00B1 | A section 4 | Not in the subset list, but A lists both as covered | Mismatch. Fix |
| Budget: A 132,000 + 23,128 = 155,128 bytes; B 46,260 + 23,128 = 69,388 bytes | A and B | same sums | A over the 120 KB budget (needs a subset that is not run). B inside |
| Latin unicode-range list in B's @font-face | B | matches Fontsource latin block | OK, but it declares U+2191 and U+2193 for Bodoni, which the file lacks |

Easing curves (sampled, 200,000 points each). Every claimed value reproduces:
- A: cut y(0.25) = 0.897; settle 0.636, 0.911, 0.984 at 25, 50, 75%; anticipate min -0.1346 at x 0.151; follow max 1.0186; sym y(0.5) = 0.500; fade 0.392, 0.815; bleed 0.131, 0.699, 0.953.
- B: cut 90% at 28% and 99% at 66% of duration; press 50% at 13%, 90% at 49%; settle 90% at 45%, 99% at 78%; wind min -0.0449 at 13%; follow max 1.0242 at 84%; scrub y(0.5) = 0.500; fade 50% at 31%.
- All control x values lie in [0, 1], so x is monotonic on every curve.

Clamp lines: 18 of 18 (A 9, B 9) return their min at 375 px and their max at 2560 px.

Stagger: A's 5-item and 17-item worked examples reproduce (overlap 0.750 to 0.968). A's preloader followers reproduce (0.750 to 0.968). A's scrubbed stagger reaches 0.983 at its last pair, which breaks A's own 0.97 rule. B's haiku offsets reproduce, with uniform gaps inside each line.

Camera: B z = 21.15 (hero), 31.95 (speed), 20.07 (pricing), 14.60 (closing), 39.25 (phone at 375x812); x = -2.89 (hero) and -2.00 (closing) reproduce. A visible height 9.352 at z 22 and 17.005 at z 40 reproduce.

Bloom threshold against paper luminance (Rec. 709 on stored values):
- A paper #F2EDE3: 0.931 as sRGB-encoded values (above A's threshold 0.92); 0.850 linear. A's fibre amplitude of 0.012 lifts the encoded value to about 0.943.
- B paper #F1ECE0: 0.926 encoded; 0.841 linear; plus fibre 0.018 gives 0.944 encoded. Below B's 0.96 in both spaces.

Layout computed from the drafts' own formulas (confirm on screenshots):
- A speed race at 1440x900: visible half width 7.48 bu at z 22. Tick 0 at x -7.68 is outside the frame; block 0 is about 25 percent visible. The same holds for block 16.
- B speed race at z 31.95: visible half width 9.94 bu against a race half extent of 7.95 bu. Fits.
- A hero at group y -0.22 (end of hero): row A top edge at 36.1 percent of viewport height; the h1 second line ends at 40.2 percent (h1 top at 12 percent, font 137.9 px, line-height 0.92). Estimated horizontal overlap over x 34 to 43 percent (text width estimated at four em).
- B hero: stanza spans 49 to 94 percent of width at camera x -2.89; h1 in columns 1 to 8 ends near 43 percent. No overlap.
- A ink front (section 10 formulas: s = (0.85 - topY) / 0.6, p = bleed(s), front = topY - 0.32 p). Front at topY 0.70: 0.658; at 0.60: 0.441; at 0.50: 0.235. The 3D race sits at 50 percent of height.
- B ink front (front = 1.12 - 1.24 p, p linear in topY): front at topY 0.60: 0.624; at 0.40: 0.376. Maximum band above the boundary is 0.12 viewport heights at p = 1.

Research state: research/facts.md does not exist. research/ does contain notes-api-pricing.md (a "## Facts" table with sourced rows, for example A-62 to A-67 pricing rows with URLs), notes-launch.md (L-01 to L-06 launch facts), notes-system-card.md and sources-scout.md (records no facts). B section 15 item 1 says sources-scout.md is the only research file. That was not true when B was written, and it is not true now.

Not verified: no browser render or screenshots; no subset run (fonttools not installed); JetBrains Mono and Martian Mono rejection claims in B section 4 (not packed); frame times; the colour space of the composer (the bloom conclusion depends on it).

## 4. Top 5 strengths to keep

1. B font decision: Bodoni Moda Variable plus Geist Mono Variable, 69,388 bytes, no subset, real axes (opsz 6 to 96, wght 400 to 900; Geist wght 100 to 900), ready @font-face. Every glyph and feature claim checks out.
2. B camera and rig: fit formulas per section (z = k / (f x 2 x tan 11 deg x aspect)) that reproduce, so the stanza, race and column fit at any desktop aspect; phone framing; RoomEnvironment through PMREM; ShadowMaterial catcher with opacity 0.14 and 0.5; key, rim, hemisphere values.
3. B performance governance: quality tiers (DPR 1.5, 1.75, 2.0), watchdog order (DoF off, bloom off, DPR 1.25, shadow 1024), DoF only in speed and code, 1D ink front, chromatic aberration gated below 40 px/s, bloom threshold 0.96 safe in both colour spaces, block material and environment coupled to the ink front.
4. A motion grammar: seven curves each with "used for" and "never used for", every claimed value reproduces; weighted non-uniform staggers with verified worked examples; the lead-then-followers rule; reduced-motion alternatives per tween.
5. A typographic rules and scale: nine clamp lines exact at 375 and 2560 px; no-break space list; hyphenation manual; figure rules (pnum for prose, tnum for figures); measure per style; the 2D placements (hero h1 columns 1 to 11, lede 12 to 17, closing text 11 to 13).

Shared (both): complete contrast tables that reproduce; the same spacing scale (5, 7, 12, 19, 31, 50, 81, 131, 212); the same nine formation ids as architecture section 6; a no-WebGL fallback for every section.

## 5. Top 5 defects to fix

1. A ink bleed runs ahead of the act boundary. Front at 0.441 when the capabilities top is at 0.60, and at 0.235 when it is at 0.50 (A section 10 formulas). The 3D race at 50 percent of height and paper-theme text sit on ink. A's blocks keep act colour with no tie to the front, so the paper-act block #1E1D19 on ink #14130F is 1.10:1 and disappears. Fix: front tracks the boundary (B's model); couple block material and environment intensity to p; text-free band before each ink boundary.
2. A speed race overflows the frame at 16:10. The camera holds at z 22 with no aspect fit. Tick 0 and tick 16 sit outside the frame (block 0 about 25 percent visible), so the 17-tick axis loses two ticks. Fix: B's speed fit, z = 15.9 / (0.8 x 2 x tan 11 deg x aspect), which gives z 31.95 at 16:10.
3. B haiku stagger is uniform inside each line (gaps 0, 5, 10, 15, 20 SU for the line of five; 0, 7, ... 42 SU for the line of seven). The brief bans uniform staggers. The fix as drafted needs a fourth weight in weightedStagger, which changes the architecture contract. Fix: apply weightedStagger's front profile per line with line totals 0.10 s and 0.21 s and keep the 0.085 s break between lines (section 7 has the offsets).
4. A post and performance are not governed. Bloom threshold 0.92 sits below A's own paper in encoded values (0.931), so a linear buffer that receives sRGB hex blooms the whole paper; the colour space is not stated. The DoF pass stays in the chain at zero strength outside code. No quality tiers or DPR steps (architecture section 9 requires them). The ink front is a full-screen domain-warped noise. The key light casts shadows with no receiver. Fix: B's threshold 0.96 with the colour space declared; B's tiers; remove the DoF pass when off; 1D front or baked fibre; B's catcher.
5. B architecture deviations and one false statement. (a) size-adjust fixed at 100% (architecture section 5 requires a no-shift fallback). (b) Section fades at T.half (architecture section 8 says T.beat5 for section crossfades). (c) Lenis off on touch (architecture section 6 has Lenis on by default). (d) research/sources-scout.md described as the only research file, which is false. Fix each, and record (c) as a decision for the director.

## 6. Cross-cutting defects (both drafts)

1. Ink bleed over text. The paper-to-ink front covers the preceding paper section (A up to 0.32 viewport heights above the boundary plus a 0.06 warp, so about 0.38; B about 0.12 plus its 0.06 noise term, so about 0.18). Fix: front tracks the boundary; text-free band at the bottom of each paper section before an ink boundary (A 0.38 vh, B 0.18 vh); per-element colour where a band crosses text.
2. Reduced motion and no-WebGL at act boundaries. Architecture section 4 requires a plain cut at the boundary when WebGL is off or reduced motion is on. Neither draft states it. Scrubbed bleed is forbidden under reduced motion (architecture section 8). Add the rule to both bleed sections.
3. Entry-side and wipe hovers (both) and the display tracking settle (both): see section 2.
4. Research facts: the slots (speed figure, family names, pricing rows, capability copy) cannot be filled from memory. The sourced rows exist in research/notes-*.md; create research/facts.md from them with their URLs before filling any slot.
5. Architecture changes requested by the drafts: weightedStagger fourth weight (B, rejected in section 7); size-adjust value (A deferred, B 100%); Lenis on touch (B); section crossfade duration (B).

## 7. Merge plan, heading by heading

Each heading gives the take (A, B or combine), then the concrete defects to fix in the merged version.

### 7.1 Concept
Take: combine. B's framing (a catalogue plate lit like a product and dimensioned like a drawing; every number measures the object; "nothing moves that has not been measured") with A's single seal colour on the kireji (index 4, block 05).
Fix:
- Delete "Restraint reads as confidence" (both).
- State the object once: 17 blocks of 0.70 bu; rows 5, 7, 5; kireji index 4; column 4.54 bu.
- One kireji colour name across palette and 3D: seal #B5312A on paper, seal-ink #E7735F on ink. Retire A's #B5392B.

### 7.2 References
Take: combine seven. Keep from A: 1 (Müller-Brockmann, grid as structure), 2 (Tschichold, flush-left asymmetric text), 3 (postwar vermilion mark on a monochrome sheet), 6 (museum catalogue plates, numbered captions at fixed grid positions). Keep from B: 1 (one object on a plain field), 3 (orthographic drawings, dimension lines, title block), 7 (engraved instrument scales for the figures). Drop B 2, 4, 5 and 6 (hanko duplicates A 3).
Fix:
- Keep the "take / avoid" line per reference and the no-copy rule.

### 7.3 Palette
Take: B. Its hex values, OKLCH values (verified), token names (--bg, --bg-raised, --text-1, --text-2, --text-3, --rule-hair, --rule-strong, --seal, --seal-text, --focus), and graphic pairs (P15, P16, I17, I18). Keep A's selection rule: paper theme selection is seal fill with paper text (6.60:1); ink theme selection is text-1 fill with ink text (15.52:1).
Fix:
- Replace A's values. A's accent-text ink #EE7A64 becomes seal-ink #E7735F (6.11:1 on ink, 5.38:1 on ink-raised).
- Add rows: focus-paper on paper-deep (5.71:1); both selection pairs.
- Extend contrast-B.mjs to the merged table and retire contrast-A.mjs. The merged script must print every pair used in the layout, and it must fail on any miss.
- Drop A's label "both themes" from the hover row.

### 7.4 Typography
Take: B for families, files, @font-face, budget and scale. Add A's rules: no-break space list (5&nbsp;blocks, Haiku&nbsp;5.5), hyphens manual, figure rules (pnum for prose; tnum for pricing and the speed figure), measure per style, sentence case except labels, hanging-punctuation values.
Fix:
- A's display weights 300, 340, 360, 380 and 420 are outside Bodoni's 400 to 900 axis. Use 400 for display, lede, body and small; 500 for heading.
- B's size-adjust 100% must be replaced. Measure it: the width of "Haiku 5.5" at 1440 px in the Bodoni 400 face must match the fallback within 1 px (A's method, A section 12). Do not rely on local("Georgia") alone; add a second local face and measure both.
- Remove U+2191 and U+2193 from the Bodoni unicode-range; arrows come from Geist Mono.
- Test 16 px body at 375 and 1440 on screenshots before lock. If it fails, use Newsreader wght-only (newsreader-latin-wght-normal.woff2, 58,084 bytes) with Geist Mono: 81,212 bytes in total. Do not take the Newsreader opsz file (132,000 bytes) without a subset that has been run.
- Drop A's subset step and A open question 1.
- Drop B's unverified rejection claims (JetBrains, Martian Mono) unless they are checked.

### 7.5 Grid and spacing
Take: B. 17-column track from 768 px up (7 px gutters below 1024), one text column below 768 px, margin clamp(31px, 3.4722vw, 81px), gutter clamp(7px, 0.8333vw, 19px), 2560 px wrap. Keep A's hairline group marks at the 5|6 and 12|13 boundaries in the label row at 1024 px and up. Spacing: identical in both; take once.
Fix:
- A's margin clamp(32px, 5.5vw, 160px) and 2240 px cap conflict with B's; use B's.
- A's 5-column layout at 768 to 1023 and 375 to 767 px conflicts with B's 17 track; use B. A's full-width bands at 768 px become full-width bands on the 17 track.
- B's derived values reproduce (1440 px: margin 50 px, column 67.53 px, groups 385.6, 544.7, 385.6 px).

### 7.6 Easing library
Take: combine. A's seven (cut, settle, anticipate, follow, sym, fade, bleed) with their "used for / never used for" tables, plus B's press for hover and colour responses. Eight curves in total; architecture does not fix a count.
Fix:
- Hover and colour changes use press, not cut. Keep cut for lead elements and the cursor shape swap only.
- Drop B's wind (same job as anticipate, smaller dip).
- Rename B's scrub to sym (B's name collides with ScrollTrigger's scrub option).
- Follow: keep A's 1.86% (0.25, 0.80, 0.35, 1.10). Drop B's 2.42% follow. Both are inside the cap, but only one may ship.
- Turn the verified values into unit tests in the ease module.

### 7.7 Timing scale and stagger
Take: combine. Timing values: the shared numbers (0.05, 0.17, 0.35, 0.5, 0.7, 1.7) with B's extras (T.flick 0.07, T.hold 0.85, T.settle 1.19). Names: A's (T.snap, T.micro, T.half, T.beat5, T.beat7, T.breath) plus the three extras. Drop T.long (3.4) and use T.breath for loops. Stagger: A's weightedStagger (front, back, center), no fourth weight, applied per line.
Merged offsets (computed, seconds). Line of five, total 0.10; break 0.085; line of seven, total 0.21; break 0.085; line of five, total 0.10:
0, 0.0500, 0.0707, 0.0866, 0.1000 | 0.1850, 0.2707, 0.3062, 0.3335, 0.3565, 0.3767, 0.3950 | 0.4800, 0.5300, 0.5507, 0.5666, 0.5800. Span 0.580 s, the same as B's span.
Overlap at D = 0.35 runs 0.755 to 0.962; at D = 0.50, 0.829 to 0.973; at D = 0.70, 0.878 to 0.981.
Fix:
- Replace B's uniform in-line offsets with the per-line front profile above.
- Remove B's 'haiku' weight; the architecture contract stays.
- Overlap rule: A's upper bound 0.97 is broken by A's own scrub stagger (0.983) and by the merged profile at D 0.5 and 0.7. Set the timed-stagger rule to 0.75 to 0.985 and exempt scrubbed staggers, which are scroll-driven.

### 7.8 Motion principles
Take: A's twelve (lead rule, only named curves, every duration from the T table, non-uniform staggers, scrub rules, text enters by opacity or axis only, micro-motion at most 0.6 bu or 24 px, keep-alive, pointer damping at T.half capped at 0.05 rad, nothing starts on a timer, reduced motion as instant state, kireji as the only seal object).
Add from B: one overshoot per arrival at 3% or less, objects only; time-based block travel at most 1.0 bu per move; formation rotations about yaw only; block material and environment follow the ink front.
Fix:
- Principle 2 says "only the seven curves"; update to the merged eight.
- Add the plain-cut rule for the bleed under reduced motion and without WebGL (architecture section 4).
- Section crossfades use T.beat5 when 20 percent visible (architecture section 8). B's T.half for section switches is replaced.
- Canvas crossfades may use T.half (architecture gives no duration).

### 7.9 Cursor per section
Take: B's rules. Custom cursor only with a fine pointer and without reduced motion; native on touch; DOM element at z-index 50 with pointer-events none. Keep B's speed caliper (x.xx bu label) and closing ruler (snap to the 17 block centres, labelled with the two-digit number). Keep B's hero datum as an option.
Fix:
- A has no reduced-motion rule for cursors; architecture section 8 requires it. Add it.
- Cut to three custom cursors in total. Drop A's registration mark, dot and bar; drop A's closing reading rule and its block lift.
- B's block label on hover needs a raycast against 17 instanced blocks. Throttle it to one test per frame and use the screen-space block rectangles computed at boot (the same rectangles as the preloader outlines).
- Keep native pointers in code (I-beam), pricing and footer.

### 7.10 3D direction
Take: B: block 0.70 x 0.70 x 0.46 with radius 0.035; material per act with anisotropy; kireji per instance; the rig; the ShadowMaterial catcher; RoomEnvironment through PMREM; camera fov 22 with fit formulas; post with threshold 0.96 and gates; quality tiers. Keep from A, optional: clearcoat 0.50 on the kireji; the machined normal map (77 grooves) if the budget allows; the seal point light only if the kireji reads too dark on paper.
Fix:
- A's key shadows have no receiver. Use B's catcher at z -0.9 with opacity 0.14 (paper) and 0.5 (ink), or set castShadow off.
- A's room "MeshBasicMaterial multiplied by 0.18" cannot be built as written. Use B's RoomEnvironment.
- Declare the composer's colour space (linear HalfFloat buffer; hex converted to linear before writing). Compare the bloom threshold on linear values: paper is 0.841 linear and 0.926 encoded, both below 0.96.
- Remove the DoF pass from the chain when DoF is off; zeroing bokeh is not enough.
- Couple block material and environment intensity to p (B section 10). A's act colours cannot stay fixed through the bleed.
- Kireji colour per act: #B5312A on paper, #E7735F on ink (B). Retire A's #B5392B.
- Light values: B's key (-6, 9, 12) at 2.4 paper and 1.7 ink; rim spot 36 cd at (7, 5, -5); hemisphere 0.35; environment intensity 0.55 paper and 0.3 ink.

### 7.11 Formations
Take: combine. B's coordinates and unit system (block 0.70; row pitch 0.87; row gap 1.05; race pitch 0.95; recede at 0.62 of stanza; rest at y -1.45 with scale 0.60; column pitch 0.27 with block 0.22; cap formations with yaw plus or minus 0.35). From A: family as three tier stacks with the labels under each stack; the kireji at the foot of the left stack.
Fix:
- Re-express A's family stacks at B's pitch: vertical pitch 0.87; left and right stacks at x = plus or minus 3.48 (A's 3.84 scaled by 0.87 / 0.96); middle stack at x 0 with seven blocks.
- A's race fails at 16:10 with a fixed camera (section 5 item 2). Use B's fit.
- Retire A's 16.16 bu column. Use B's 4.54 bu column.
- Family row scales: B's 0.70, 1.00, 1.10 is open (B section 15 item 3). Set all three to 1.00 unless a sourced fact supports an order.
- Use B's mirrored inactive-row yaw (plus or minus 0.35 rad); A's inactive rows both yaw -0.14 rad, which is not mirrored.

### 7.12 Section choreography
Take: by section.
- Preloader: B (outlines from the boot camera; weights 2, 5, 2, 1; squares fill in stanza order) with A's handoff timing (kireji scale over 0.5 s with cut; followers settle; last follower ends at 0.87 s).
- Hero: B's camera and composition with A's text rules. Proposed placement, to confirm on screenshot: h1 columns 1 to 8, top 12 percent; lede columns 1 to 5 below the h1 (about 46 to 58 percent of height); CTA columns 1 to 3 below the lede. Stanza stays on the right (49 to 94 percent of width).
- Speed: B's camera fit and dimension line. Figure at columns 1 to 6, top about 18 percent of height (specify; B says only "above the race at the left margin").
- Capabilities: B (no sticky; cards in columns 1 to 6, which end at 38 percent of width; arrow keys). Drop A's sticky exception.
- Code: B's panel and recede. Keep A's live line marker (cut over T.micro). Panel must end before 55 percent of width, since recede blocks sit at 57 to 80 percent.
- Family: A's three stacks with labels under each stack at 88 percent of height. Drop B's text rows aligned to block rows (they do not apply to stacks). Flank drift only if the budget allows.
- Pricing: B's table rules draw and tnum prices; A's per-row front stagger for row fades; B's rest at the bottom. Specify the table's columns (B gives none).
- Closing: B's camera from pricing to closing keyframe (z 14.60, x -2.00), per-character colour turn-on, dimension line. Drop A's reading rule.
- Footer: B's title block with the outer rule drawn over T.settle; keep A's Back to top through scrollToTarget.
Fix:
- A hero collision: at group y -0.22, row A's top edge (36.1 percent) sits over the h1 second line (ends 40.2 percent) over an estimated x 34 to 43 percent. Confirm on a 1440x900 screenshot; the proposed hero placement avoids it.
- A preloader offset: hairlines at 50, 62 and 74 percent need group y -1.12, but A section 12 sets the preloader to 0 by default. Use B's boot-camera outlines and drop the dependency.
- A group offsets (hero to -0.22, capabilities +1.9, pricing -2.5, footer -6.0) have no transition rule. Use B's camera keyframes with scrubbed moves between them.
- B's lede, CTA, speed figure, pricing table and code panel have no columns; specify them as above.
- B's section switches: T.beat5, not T.half.
- B's Lenis off on touch: decide, and declare as a deviation from architecture section 6 if kept.

### 7.13 Focus and interaction states
Take: B's focus ring (2 px solid var(--focus), 3 px offset, 0 s appearance, :focus-visible only) and B's reduced-motion rule (every hover instant). Map A's button and link colour changes onto B's tokens.
Fix:
- Remove the directional wipes: A's entry-side hover fill and underline; B's clip-path wipe and entry-side underline growth. Replace with colour changes over T.micro using press. These are stock moves and cost a repaint.
- B's underline is written as linear-gradient(seal, seal). It is a solid colour, but the rule says no gradients. Use background-color on a 1 px pseudo-element.

### 7.14 Ban list exceptions
Take: combine. Keep: bloom (threshold 0.96, specular only, neutral); Lenis (lerp 0.1, off under reduced motion; touch decision recorded); follow overshoot (1.86%, once per arrival, objects only). Drop A's sticky long pin; B's capabilities has no sticky.
Fix:
- B's "None" is not accurate; list bloom, Lenis and the overshoot.
- The uniform in-line stagger is removed, not declared as an exception.

### 7.15 Open questions
Resolve as follows, for the director to confirm:
1. Fonts: B's Bodoni Moda and Geist Mono (69,388 bytes, no subset). Fallback path: Newsreader wght-only plus Geist Mono (81,212 bytes) if body text fails the test in 7.4. Drop A's subset step.
2. Capabilities hold: moot (no sticky).
3. Facts: create research/facts.md from the sourced tables in research/notes-api-pricing.md (pricing rows A-62 to A-67 and others), research/notes-launch.md (L-01 to L-06) and research/notes-system-card.md, with their URLs. Slots fill only from that file; a slot without a sourced value stays empty.
4. Kireji index 4: both drafts agree; confirmed.
5. Preloader budget: use B's target (loader:done under 1.5 s on the QA profile). Drop A's 0.50 s.
6. weightedStagger: no fourth weight; per-line calls (7.7).
7. Composer colour space and the bleed text rule (section 6 items 1 and 2) need a decision.

## 8. Not verified

- No browser render. The race overflow, hero collision and ink front positions are computed from the drafts' formulas. Confirm on 1440x900 and 375x812 screenshots.
- Subset not run (fonttools not installed). Body legibility of Bodoni at 16 px not tested.
- Frame times not measured. The cost ranking of the two shaders is an estimate.
- JetBrains Mono and Martian Mono rejection claims in B section 4 not checked.
- The bloom conclusion depends on the composer pipeline. Confirm in code.
