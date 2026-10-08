## 12. Section choreography: act III

Owner: art director. Date: 2026-10-08. Status: LOCKED for act III. Sections: pricing (1.5 vh), closing (2.5 vh), footer (1 vh). Theme: paper on closing and footer (data-theme="paper", data-act="3"). Pricing carries data-act="3" and its data-theme is "ink" until p2 reaches 0.5, then "paper" (C11, direction-3d 10.10).

Inputs: design/direction.md headings 1 to 9 and 13 to 16; design/direction-3d.md sections 10 and 11 (LOCKED: keyframes, formations, post, ink bleed); design/direction-act1.md Act I rules A1 to A13 (projection P1, canvas switch, far plane, breakpoints) and its section format; design/drafts/director-decisions.md (D2.1, D2.2, D2.3, D7, D8, D10, D11, D13); design/drafts/critique.md sections 7.7 and 7.12; design/drafts/direction-B.md sections 9, 11 and 12 where the inputs above do not replace them; research/facts.md, cited by F-id.

### Act III rules

These rules apply to the three subsections below. A value written in a subsection applies to that subsection only.

- **C1 Time.** Timed entrances start when the element's top crosses 80% of the viewport height, measured from the viewport top. They are the pricing title reveal, the table rules and prices, the statements, the availability items and the footer title block. Nothing starts on a timer alone. Every timed value is a T value: T.snap 0.05 s, T.flick 0.07 s, T.micro 0.17 s, T.half 0.35 s, T.beat5 0.5 s, T.beat7 0.7 s, T.hold 0.85 s, T.settle 1.19 s, T.breath 1.7 s.
- **C2 Units.** vh means svh. Pixel values are CSS pixels at 1440 by 900 (desktop) and 375 by 812 (phone) unless a line says otherwise. Positions inside a section are measured from the section's top edge.
- **C3 Progress.** topVh is the section's top edge in viewport heights, 0 at the viewport top and 1 at the viewport bottom. Two scrubbed values derive from it. Entrance progress w = clamp((1 − topVh) ÷ span, 0, 1). Reading progress s = clamp(−topVh ÷ H, 0, 1), where H is the section height in vh. Pricing: span 0.4 and H 1.5 (the progress is w_p). Closing: span 0.6 and H 2.5 (the progress is w_c, and s is the reading progress). Footer: no progress. Camera and formation are scrubbed with ScrollTrigger scrub 0.7 and sym. Per-block local progress is scrubbed with scrub 0.17. This replaces A3 of act I for act III only (Deviation 1).
- **C4 Stagger, scrub and lead.** Per-block local progress is scrubLocal(k, 17, t, { total 0.35, lead 0.10 }), where k is the stagger position and t is the formation progress. In pricing the kireji (stagger position 0) leads and uses cut on its local progress. Every follower uses settle. In closing no block leads (direction-3d 11.10): all 17 use settle in write order.
- **C5 Canvas switch.** A 3D state change that is not scrubbed (reduced motion, no WebGL) follows act I A5: canvas opacity 1 to 0 over T.half, the pose changes at opacity 0, canvas opacity 0 to 1 over T.half.
- **C6 Projection.** Screen rectangles and block centres use P1 of act I A6, with each block's own front face at z_front = 0.23 × s, where s is the block scale (act I uses s = 1). The ruler reads these centres, recomputed at most once per frame while pointer.inside is true (direction-3d 10.16).
- **C7 Keyframes (direction-3d 10.6).** Desktop (a ≥ 1.0): family, the camera at the start of pricing, z 50.02, x 0, y 0. Pricing z 20.07, x 0, y 0. Closing and footer z 14.60, x −0.22 × W(z), which is −2.00 at 1440 by 900. Phone (a < 1.0): family z 80.03 (height fit), x 0, y 0. Pricing z 69.54, x 0, y 0. Closing and footer z 14.60, x 0, y 0. The camera target is (x, y, 0).
- **C8 Far plane.** Far is 80 on desktop and 120 on phones throughout act III. The phone family keyframe (z 80.03) lies beyond 80, as act I A8 records for its phone speed keyframe.
- **C9 Breakpoints.** As act I A9: desktop-landscape (a ≥ 1.0 and width 1024 or more), tablet-landscape (a ≥ 1.0 and width 768 to 1023), portrait and phone (a < 1.0 at any width), and phone-landscape (a ≥ 1.0 and width below 768).
- **C10 Columns at 1440 by 900.** The 17-column grid has margin 50.00 px, gutter 12.00 px and column width 67.53 px. Column k starts at 50.00 + (k − 1) × 79.53 px. Group A is columns 1 to 5 (50.00 to 435.65 px). Groups B and C are columns 6 to 12 (447.65 to 992.35 px) and 13 to 17 (1004.35 to 1390.00 px). Column 8 ends at 674.24 px, column 9 starts at 686.24 px, column 11 starts at 845.29 px and column 12 ends at 992.35 px.
- **C11 Colour and type tokens.** Paper tokens (the closing and footer, and pricing from p2 = 0.5): --bg #F1ECE0, --bg-raised #E4DCCB, --text-1 #151512, --text-2 #45413A, --text-3 #5E5A51, --rule-hair #7D786A, --rule-strong #3A3831, --seal #B5312A (fill only), --seal-text #9A2820 (text, link underline and button hover fill), --focus #9A2820 (2 px, offset 3 px). Ink tokens (pricing while p2 is below 0.5, and only then): --bg #151512, --bg-raised #22211D, --text-1 #F1ECE0, --text-2 #CFC8B9, --text-3 #A39D90, --rule-hair #75705F, --rule-strong #E4DCCB, --seal-text #E7735F, --focus #E7735F. Block colours are 3D values (direction-3d 10.3) and are not tokens. Type styles are B's type table: display-xl (the pricing title), heading (the footer title value), body (table, statements, buttons, haiku), small (availability, footnote, footer lists), label (table headers, cell labels, footer labels) and code (the Claude Code command and the model ID). Sizes at 1440: display-xl 96.61 px, heading 27.85 px, body 17.46 px, small 14.49 px, label 12.49 px, code 14.46 px. Sizes at 375: display-xl 44.00 px, heading 22.00 px, body 16.00 px, small 14.00 px, label 12.00 px, code 13.00 px.
- **C12 Copy and numbers.** Product wording comes only from research/facts.md, cited by F-id. A slot that needs copy says "copy: <what it carries>". The F-ids in this file are traceability keys and are not printed on the page; the sources list in the footer carries the URLs. Numbers keep the fact's wording, units and per-MTok basis. No-break spaces (U+00A0) join each number to its unit: 5&nbsp;min, 1&nbsp;h, 100K&nbsp;tokens, Haiku&nbsp;5.5, Claude&nbsp;Haiku&nbsp;5.5. Apostrophes are typographic (U+2019). Model IDs and commands are set in code style and never break.
- **C13 Cursors, touch and reduced motion.** The custom cursor appears only with (hover: hover) and (pointer: fine), and never under reduced motion. It is a DOM element in the cursor layer (z-index 50, pointer-events none), follows the pointer damped with T.micro, and uses text-1 of the theme. Over a link or button the custom cursor hides and the native pointer shows. Touch has no custom cursor and no tilt. Under reduced motion every scrubbed value sits at its final state when the section top crosses 80% of the viewport height, there is no breath, wave, tilt or lift, the title is static, and every hover or press change is an instant colour change.
- **C14 Timed stagger rule.** Act III timed items use T.beat7 with settle, except leads (T.beat5 with cut) and the footer outer rule (T.settle with settle, D8). Offsets are weightedStagger(count, { total: T.half, weight: 'front' }) plus the base delay the item states. Every consecutive pair has overlap 1 − gap ÷ T.beat7 inside [0.75, 0.985]. Five items: offsets 0, 0.1750, 0.2475, 0.3031, 0.3500 s (overlaps 0.750, 0.896, 0.921, 0.933). Seven items (the title): offsets 0, 0.1429, 0.2021, 0.2475, 0.2858, 0.3195, 0.3500 s (overlaps 0.796 to 0.956). No stagger is uniform.
- **C15 Closing text layer.** The closing text (haiku, CTA row, dimension line and label) is one fixed layer inside the closing section. It is position fixed with no z-index, so the footer, which follows in the DOM, paints over it where they overlap. Its visibility is set in the closing subsection. Without JavaScript the layer is in flow (position static) and the section is its natural height.

### pricing

Section id pricing, data-act="3". Scroll length 1.5 vh on desktop; on phone the section is as tall as its content plus 50 px (sp-6) at each end. The section runs the w_p entrance progress of C3 for its formation and camera.

**Leads:** the table's header rule (cut over T.beat5 at the table trigger), then the five row rules and their prices. The formation and camera start at w_p = 0, when the section top reaches the viewport bottom, so the rest formation is set before the table reaches the rest band.

**Sequence:**
1. Formation and camera (scrubbed by w_p = clamp((1 − topVh) ÷ 0.4, 0, 1)). At w_p = 0 the 17 blocks hold the family formation (direction-3d 11.8) and the camera holds the family keyframe. Over w_p 0 to 1 the blocks move to the rest formation (direction-3d 11.9) with scrubLocal(k, 17, w_p, { total 0.35, lead 0.10 }) over the rest stagger order 4, then 0 to 3, then 5 to 16. The kireji uses cut on its local progress and every follower uses settle. Position, scale (1.00 to 0.60) and the phone rotation about z (+π/2 to 0 for the real blocks) interpolate with the same local progress. The camera moves from the family keyframe to the pricing keyframe with sym over w_p 0 to 1.
2. Phantom outlines (family-owned, direction-3d 11.8): their material opacity runs from 1 to 0 with sym over w_p 0 to 1, and the outlines are hidden at 0. The family handle owns the material; this section sets the end state only.
3. Ink bleed at the family-to-pricing boundary (direction-3d 10.10). p2 = clamp((scrollY − (Y − vh)) ÷ vh, 0, 1), where Y is the page y of the pricing top. The block mix is m = 1 − p2 (direction-3d 10.3). Block colour, environment intensity, shadow opacity, grain and vignette follow m. The pricing data-theme is "ink" while p2 is below 0.5 and "paper" from 0.5, with no blend.
4. Title (trigger, C1). "Pricing" in display-xl is split into its 7 characters with SplitText (D2.3). At the trigger each character starts displaced horizontally by (i − 3) × 0.06em for i from 0 to 6, which is −0.18em, −0.12em, −0.06em, 0, 0.06em, 0.12em and 0.18em, and it is coloured text-3 with opacity 1. Each character settles to its set position and to text-1 over T.beat7 with settle. Offsets are 0, 0.1429, 0.2021, 0.2475, 0.2858, 0.3195 and 0.3500 s (C14).
5. Table (trigger: the table panel's top crosses 80%). The header rule (2 px, rule-strong) draws with DrawSVG over T.beat5 with cut from 0 s; it is the lead. The five row rules (1 px, rule-hair, one under each body row) draw with DrawSVG over T.beat7 with settle at 0.17 s plus the front offsets 0, 0.1750, 0.2475, 0.3031 and 0.3500 s, which gives 0.17, 0.345, 0.4175, 0.4731 and 0.52 s. The price in row k settles from text-3 to text-1 over T.beat7 with settle, starting at the start time of row rule k. Row labels are text-1 from the first frame.
6. Statements. The savings line and the 75% line settle from text-3 to text-1 over T.beat7 with settle, starting at 0.52 s. The footnote settles from text-3 to text-2 over T.beat7 with settle, starting at 0.52 s.
7. Availability (trigger: the availability panel's top crosses 80%). Its five timed items (platform list, Bedrock note, Claude apps line, Claude Code block, model ID) settle from text-3 to their token colour over T.beat7 with settle at offsets 0, 0.1750, 0.2475, 0.3031 and 0.3500 s. The label "Availability" is text-3 from the first frame.
8. Breath. It starts T.hold after w_p reaches 1 (see Keep-alive).

**2D layer:**
- Desktop-landscape (width 1024 and wider). Title: "Pricing", display-xl, text-1, weight 400, letter-spacing −0.015em, line-height 0.98, columns 1 to 5, top at 131 px (sp-8) from the section top. It is an h2 with aria-label "Pricing"; its characters are aria-hidden.
- Availability panel: columns 1 to 5 (50.00 to 435.65 px). Top = title bottom + 31 px (sp-5), which is 256.7 px at 1440 by 900. Background --bg-raised, no border, padding 19 px (sp-4). Items from top to bottom with 7 px (sp-2) between them:
  1. "Availability" (label, text-3).
  2. "Claude API, Amazon Bedrock, Google Cloud, Microsoft Foundry, Claude Platform on AWS" (small, text-1) [F-115].
  3. "Amazon Bedrock lists Haiku 5.5 access as “See Access”." (small, text-2) [F-128].
  4. "Claude.ai: Free, Pro, Max, Team and Enterprise users can select Haiku 5.5 on web, iOS and Android." (small, text-1) [F-120].
  5. "Also available in Claude Code." (small, text-1) [F-121]; then "claude --model claude-haiku-5-5" (code, text-1) [F-123]; then "Needs Claude Code v2.1.293 or later." (small, text-2) [F-124].
  6. "Model ID: " (small, text-2) followed by "claude-haiku-5-5" (code, text-1) [F-02].
  At 1440 by 900 the panel runs from 256.7 px to about 540 px (60% of the height).
- Table panel: columns 6 to 17 (447.65 to 1390.00 px). Top 131 px (the title's top). Background --bg, 1 px rule-hair border, padding 31 px (sp-5). It holds the table, then the statements.
  - Table: three columns, 38%, 31% and 31% of the panel's inner width. Header row 40 px high, label style, text-3, bottom border 2 px rule-strong. Header cells: "USD per MTok" (left), "Prompts up to 100K&nbsp;tokens" (right), "Prompts over 100K&nbsp;tokens" (right). Five body rows, each 40 px high, body style, text-1, bottom border 1 px rule-hair. Row label on the left; prices right-aligned with tabular figures (tnum). Rows, token type then up to 100K then over 100K:
    - Input | $0.10 [F-81] | $0.50 [F-82]
    - Output | $0.50 [F-81] | $2.50 [F-82]
    - Cache write 5&nbsp;min | $0.125 [F-91] | $0.625 [F-92]
    - Cache write 1&nbsp;h | $0.20 [F-93] | $1.00 [F-94]
    - Cache read | $0.01 [F-89] | $0.05 [F-90]
    The table is a real table element with a visually hidden caption "Haiku&nbsp;5.5 prices, USD per million tokens (MTok)" and th scope set on headers and row labels.
  - Statements, 19 px (sp-4) below the table: "You can save up to 90% with prompt caching and 50% with batch processing." (body, text-1) [F-100, F-102]. Then 7 px (sp-2) later: "Compared with Haiku 4.5, Haiku 5.5 costs around 75% less to run on average." (body, text-1) [F-85]. Then 19 px later: "Haiku 5.5 has an updated tokenizer (similar to Sonnet 5.5’s and Opus 5.5’s), which means it uses slightly more tokens per task." (small, text-2) [F-88].
  - At 1440 by 900 the panel is 444.7 px tall, so its bottom edge is at 575.7 px (64.0% of the height). The rest band's top edge is at 66.00%, which leaves 18 px of clear space.
- Tablet-landscape (a ≥ 1.0, width 768 to 1023). Title in columns 1 to 17, top 81 px (sp-7). Table panel in columns 1 to 17, top = title bottom + 31 px. Availability panel in columns 1 to 9, top = table panel bottom + 31 px. The rest band follows the desktop keyframe (C7).
- Portrait and phone (a < 1.0, any width). Title in one full-width column, top = section top + 50 px (sp-6), display-xl at 44.00 px (375 px viewport). Table panel full width with 19 px side margins, top = section top + 60svh (487 px at 812), padding 19 px (sp-4). Its table has columns 40%, 30% and 30%, and the header cells may wrap (the one exception to the label no-wrap rule). The statements and footnote follow the table at the same gaps. Availability panel full width, top = table panel bottom + 31 px, padding 19 px. The rest band sits at 54.6% to 56.2% of the height, above the table panel's top edge.
- Phone-landscape (a ≥ 1.0, width below 768). Title left 6.0% of the width, top 81 px. Table panel left 47%, width 47%, top 131 px. Availability panel left 6.0%, width 35%, top = title bottom + 31 px.

**3D layer:**
- Formation: rest (direction-3d 11.9). Index k at x = (k − 8) × 0.52, y −1.45, z 0, scale 0.60 (block 0.42 bu), yaw 0. The row is 8.74 bu wide. The transition order is 4, then 0 to 3, then 5 to 16 (C4).
- Camera: the pricing keyframe at w_p = 1 (C7). Far 80 on desktop and 120 on phones.
- Ink mix m = 1 − p2 (C11). Block base colour, metalness, roughness, clearcoat, environment intensity, key light, grain, vignette and shadow opacity lerp with m (direction-3d 10.3, 10.4, 10.5, 10.10). The kireji keeps its colour rule (#B5312A at m = 0).
- Shadow catcher 24 by 16 bu at z −0.9, opacity 0.14 at m = 0.
- Depth of field off (the pass is removed). Chromatic aberration as direction-3d 10.8 (0 px at rest). Smear: none, velocity 0.
- Phantom outlines: material opacity with sym over w_p 0 to 1, hidden at 0 (see Sequence 2).

**Scroll:** the formation and camera follow w_p (C3). p2 follows the ink-bleed window (C11). No 2D element is scroll-linked: the title, table, statements and availability move with the page and do not change position relative to each other.

**Pointer:** native cursor across the section (B 9, C13). On a fine pointer each body row of the table has a direction-aware fill (D2.1): a full-height pseudo-element in --bg-raised, scaled on X from 0 to 1 with transform-origin on the entry side (left when the pointer enters from the left, right when it enters from the right, read at mouseenter), with press over T.micro. On leave the fill scales back to 0 from the same side. The row text does not change, and rows are not focusable. No 3D pointer response (direction-3d 10.13).

**Touch:** no row fill, because touch has no hover, and no 3D response. Scrolling is native, with Lenis on touch and syncTouch false (D2.6).

**Keep-alive:** the rest breath (direction-3d 10.12): dy_i = 0.010 × sin(2π t ÷ T.breath) bu, phase 0 for all 17 blocks, applied after the rest pose. It starts T.hold after w_p reaches 1 and runs while the section overlaps the viewport. Nothing else moves.

**Reduced motion:** when the section top crosses 80% of the viewport height, the rest pose, the pricing camera and the family outline end state are set at once through the canvas switch (C5), and the outlines are hidden. The title is static: no split, no displacement, text-1. Rules are at full length. Prices, statements and availability items are at token colour from the first frame. Row fills change colour instantly. There is no breath. The data-theme is "paper" from the start: the ink bleed is a plain CSS edge between the family and pricing sections (direction-3d 10.15), so no theme flip runs.

**No-WebGL fallback:** the canvas is removed. The rest band is a static inline SVG in div.gl-fallback (aria-hidden="true"), shown only under html.no-gl. Its viewBox is "0 0 8.74 0.42". It holds 17 rectangles of 0.42 by 0.42 with rx 0.021, at x = 0.52 × k and y = 0. The fill is #2B2A26 (block-anodized) and the kireji (k = 4) is #B5312A. There is no stroke and no shading. The SVG sits at the P1 rectangle of the rest pose, set on load and on resize: at 1440 by 900 that is left 14.76%, width 70.48%, top 66.00% and height 5.42%; at 375 by 812 it is left 14.93%, width 70.14%, top 54.60% and height 1.55%. The 2D layer and its entrances are the same as with WebGL.

### closing

Section id closing, data-theme="paper", data-act="3". Scroll length 2.5 vh on desktop. The section's in-flow content is its height only; the text is the fixed layer of C15. Its entrance progress is w_c and its reading progress is s (C3).

**Leads:** the write. At w_c = 0, when the section top reaches the viewport bottom, the 17 blocks stand in the rest pose. No block leads. The kireji keeps its own slot in write order (direction-3d 11.10).

**Sequence:**
1. Write (scrubbed by w_c = clamp((1 − topVh) ÷ 0.6, 0, 1)). All 17 blocks move from the rest pose (direction-3d 11.9) to the column pose (direction-3d 11.10) with scrubLocal(i, 17, w_c, { total 0.35, lead 0.10 }), where i is the block index, so the column is written from index 0 down to index 16. Every block uses settle on its local progress. Position and scale (0.60 to 0.3143) interpolate with the same local progress. The write completes at topVh 0.4.
2. Camera (scrubbed with sym over w_c 0 to 1). The camera moves from the pricing keyframe to the closing keyframe: desktop z 20.07 to 14.60 and x 0 to −2.00; phone z 69.54 to 14.60, with x 0 and y 0.
3. Text layer (C15). It is visible while the section top is at or above topVh 0.86 on desktop, or at or above 0 on phone and portrait, and the section bottom is still below the viewport top. It hides when s reaches 1. On desktop the pricing section ends 0.86 vh above the closing top, so no pricing content is visible when the layer appears. On phone the pricing content runs to the section's bottom, so the threshold is 0.
4. Dimension line. Its draw progress is p_d = settle(clamp((w_c − w0) ÷ (1 − w0), 0, 1)), with w0 = 0.2333 on desktop (the value of w_c at topVh 0.86) and w0 = 0 on phone. It starts at 0 when the layer appears and reaches 1 with the write.
5. Haiku colour (scrubbed by reading progress s). Each visible character j in reading order gets colour mix(text-3, text-1, settle(q_j)), where q_j = scrubLocal(j, N, s, { total 0.35, lead 0.10 }). Reading order is line 1 top to bottom, then line 2, then line 3. N is the number of visible characters, spaces excluded. Colours are written only when they change.
6. Wave. It starts T.hold after w_c reaches 1 (see Keep-alive).

**2D layer:**
- Desktop-landscape values are at 1440 by 900 unless a line says otherwise.
- Haiku: columns 11 to 12 (845.29 to 992.35 px), right-aligned so that its right edge sits at 992.35 px. Top at 20vh (180 px). writing-mode vertical-rl, text-orientation mixed, body style, line-height 1.55, text-1. Three lines separated by line breaks; line 1 is the right-most column. Copy: "copy: the haiku, three lines of 5, 7 and 5 syllables (17 in all), each line one vertical column; no product claim unless it is in research/facts.md, cited by F-id in the copy file." No character limit applies. The element is a p with lang="en".
- CTA row: top = haiku bottom + 31 px (sp-5), right-aligned to 992.35 px, items 19 px (sp-4) apart. Primary button "Read the docs" (body style, sentence case, white-space nowrap, height 50 px (sp-6), horizontal padding 19 px (sp-4), fill text-1, label paper). It links to https://platform.claude.com/docs/en/models/haiku-5-5/overview [F-14, F-31]. Secondary "View sources" (body style, text-1 link with a 1 px rule-strong underline) calls scrollToTarget('sources').
- Dimension line, 1 px rule-hair, from the top edge of block 00 to the bottom edge of block 16: y 88.2 px to 811.8 px, at x 1075.3 px (the column's right edge at 1056.3 px plus 19 px, sp-4). Two end ticks 5 px (sp-1) long, perpendicular to the line.
- Label "4.54 bu" (label style, text-3), left edge 7 px (sp-2) right of the line at x 1082.3 px, vertically centred on the line's midpoint (y 450 px).
- Column reference (P1 for the closing keyframe): the column centre is at x 1038.8 px (72.14% of the width), its left edge at 1021.2 px and its right edge at 1056.3 px. The haiku's right edge sits 28.9 px left of the column's left edge.
- Phone and portrait (a < 1.0): the haiku's right edge is at 40.7% of the width (152.7 px at 375), with its top at 20svh. The column is centred at 187.5 px, with its left edge at 171.7 px and right edge at 203.3 px. The dimension line is at x 222.3 px, from 9.8% to 90.2% of the height, and the label is 7 px right of it, centred on the midpoint. The CTA row is fixed at 19 px from the bottom and 19 px from the left edge, with the primary button, a 19 px gap and the "View sources" link. It stays clear of the column, whose bottom block ends at 90.2% of the height.
- Phone-landscape (a ≥ 1.0 and width below 768): the desktop placements apply, with the haiku's right edge set 19 px (sp-4) left of the column's left edge (P1 at the closing keyframe for this aspect), and the CTA row right-aligned to the haiku.

**3D layer:**
- Formation: column (direction-3d 11.10). Index k at x 0, y (8 − k) × 0.27, z 0, scale 0.3143 (block 0.22 bu), yaw 0. Block 00 is the top block at y +2.16 and block 16 the bottom block at y −2.16. The column is 4.54 bu tall. Write order 0 to 16.
- Camera: the closing keyframe at w_c = 1 (C7). Desktop z 14.60 and x −2.00 at 1440 by 900 (x = −0.22 × W(z) at the actual aspect). Phone z 14.60, x 0, y 0. Far 80 on desktop and 120 on phones.
- Ink mix m = 0 (paper). Grain amplitude 0.028. Depth of field pass removed. Bloom threshold 0.96 (linear), specular only. Shadow catcher opacity 0.14. Key light 2.4, rim spot 36 cd, hemisphere 0.35, environment 0.55 (direction-3d 10.4, 10.5, 10.8). The kireji is #B5312A.
- No phantom outlines and no smear (both family or speed only). Chromatic aberration as direction-3d 10.8.

**Scroll:** the write and the camera follow w_c during the entrance (C3). The haiku colour and the text layer's exit follow the reading progress s (C3). The text layer does not move on scroll: it is fixed. Lenis is on (syncTouch false on touch, D2.6).

**Pointer:** the ruler on a fine pointer, active when pointer.inside is true, the closing section overlaps the viewport, and no link or button is under the pointer (C13). The ruler is a 12 px wide, 1 px tall tick in text-1. Its x is the pointer's x, damped with T.micro. Its y snaps to the nearest of the 17 block centres projected per C6, recomputed at most once per frame while pointer.inside is true, with press over T.snap. Its label is the snapped block's two-digit number, index + 1 (01 to 17), in label style and text-1, placed 13 px (the tick's half length of 6 px plus 7 px, sp-2) right of the pointer's x and vertically centred on the tick. Over a link or button the custom cursor hides and the native pointer shows.

**Touch:** no ruler and no tilt. The haiku colour follows the scroll. The primary button and the link keep their touch states (D2.1: the fill starts from the centre on touch).

**Keep-alive:** the travelling wave down the column. It starts T.hold after w_c reaches 1. Each block's vertical offset is dy_k = 0.010 × sin(2π t ÷ T.breath − 0.2 k) bu, where k is the block index (0 at the top) and the offset is added after the column pose, so the wave runs down the column once per T.breath. It runs while the closing overlaps the viewport and while the footer shows the column.

**Reduced motion:** when the section top crosses 80% of the viewport height, the column pose and the closing camera are set at once through the canvas switch (C5), and the dimension line is at full length. The text layer appears at its thresholds (C15) with no draw on the line. The haiku is text-1 from the first frame, with no per-character turn-on. There is no write, no wave, no ruler and no tilt.

**No-WebGL fallback:** the canvas is removed. The column is a static inline SVG in div.gl-fallback (aria-hidden="true"), shown only under html.no-gl. Its viewBox is "-0.11 0 0.22 4.54". It holds 17 rectangles of 0.22 by 0.22 with rx 0.011, at x = −0.11 and y = 0.27 × k, filled #2B2A26, and the kireji (k = 4) is #B5312A. The dimension line and the label "4.54 bu" are drawn in the same SVG in rule-hair and text-3. On desktop the text layer becomes part of the section's flow: the haiku in columns 9 to 11, right-aligned, with its top at 20vh; the CTA row beneath it in columns 9 to 11, right-aligned; and the SVG column in columns 12 to 13 (924.82 to 1071.88 px), 80svh tall. On phone the haiku sits centred above the SVG column, the SVG column is 60svh tall and centred, and the CTA row sits centred below it.

### footer

Section id footer, data-theme="paper", data-act="3". The section is as tall as its content. Its formation and camera do not change: the column of the closing stays held.

**Leads:** the outer rule of the title block. It draws with DrawSVG over T.settle with settle, starting when the footer top crosses 80% of the viewport height (D8).

**Sequence:**
1. Outer rule (2 px, rule-strong) draws with DrawSVG over T.settle with settle, from 0 s.
2. Cell values settle from text-3 to text-1 over T.beat7 with settle, in cell order TITLE, SCALE, SHEET, REV and DATE, at 0.17, 0.345, 0.4175, 0.4731 and 0.52 s. These are T.micro plus the front offsets 0, 0.1750, 0.2475, 0.3031 and 0.3500 s (C14). TITLE is heading style; the other values are body style with tabular figures.
3. Inner rules (1 px, rule-hair) draw with DrawSVG over T.beat7 with settle. The horizontal rule under TITLE starts at 0.17 s. The vertical rule after SCALE starts at 0.345 s, the one after SHEET at 0.4175 s and the one after REV at 0.4731 s.
4. Cell labels, the disclaimer, the docs links and the sources list are at token colour from the first frame. Text is never hidden.

**2D layer:**
- Desktop-landscape values are at 1440 by 900 unless a line says otherwise.
- Title block: columns 1 to 8 (50.00 to 674.24 px). Top = footer top + 131 px (sp-8). A table with two rows. Row 1 (minimum height 92 px) holds TITLE across all eight columns. Row 2 (minimum height 86 px) holds four cells: SCALE in columns 1 to 2, SHEET in columns 3 to 4, REV in columns 5 to 6 and DATE in columns 7 to 8. Each cell has its label above its value, in label style and text-3, with 7 px (sp-2) between label and value and 12 px (sp-3) of padding. Values, with exact text: TITLE "Claude Haiku 5.5"; SCALE "1:1"; SHEET "1 / 1"; REV "A"; DATE "2026-10-08". The outer rule is 2 px rule-strong around the whole block. The inner rules are 1 px rule-hair: one horizontal under TITLE and three vertical between the lower cells.
- Disclaimer: top = title block bottom + 19 px (sp-4), columns 1 to 8, small style, text-2, exact text: "Unofficial fan and showcase page. Not affiliated with Anthropic."
- Official docs: top = disclaimer bottom + 31 px (sp-5). A label "Official docs" (label, text-3). Then three body-style links, 7 px apart, in this order: "Models overview" to https://platform.claude.com/docs/en/models/overview [F-02]; "Haiku 5.5 overview" to https://platform.claude.com/docs/en/models/haiku-5-5/overview [F-14]; "Pricing" to https://platform.claude.com/docs/en/about-claude/pricing [F-81].
- Sources: top = docs bottom + 31 px. A label "Sources" (label, text-3). Then an ordered list with id="sources", small style, 7 px between items. Each item is the URL itself as a plain link, text-1 with a 1 px rule-strong underline, with overflow-wrap: anywhere. Rule: the list holds each URL that appears in the Source line of an F-id printed anywhere on the page, once, in order of first appearance from the top of the page. The footer build checks every printed F-id against the list. The ten URLs that act III's printed F-ids need are: https://platform.claude.com/docs/en/models/overview; https://platform.claude.com/docs/en/models/haiku-5-5/overview; https://www.anthropic.com/claude-haiku-5-5; https://www.anthropic.com/claude/haiku; https://platform.claude.com/docs/en/about-claude/pricing; https://claude.com/pricing; https://platform.claude.com/docs/en/build-with-claude/prompt-caching; https://platform.claude.com/docs/en/build-with-claude/claude-in-amazon-bedrock; https://support.claude.com/en/articles/11940350-claude-code-model-configuration; https://code.claude.com/docs/en/model-config. Acts I and II add their own URLs by the same rule.
- Back to top: top = sources bottom + 31 px, columns 1 to 2, body-style text link "Back to top". It calls scrollToTarget('preloader'). The preloader section has height 0 at the top of the page, so this is y 0.
- All footer text sits in columns 1 to 8, so it never sits over the column, which is at 72% of the width.
- Phone (a < 1.0). The title block is full width with 19 px margins: row 1 TITLE, row 2 as two rows of two cells (SCALE and SHEET, then REV and DATE). The text blocks below it are full width. The whole footer text sits in one opaque panel (background --bg, padding 19 px (sp-4), top = footer top + 50 px (sp-6)). The panel covers the column where the two overlap (Deviation 6).

**3D layer:** the column held at the closing keyframe (desktop z 14.60 and x −2.00 at 1440 by 900; phone z 14.60, x 0, y 0), with the closing's colours, post stack and grain (m = 0). No formation change and no camera move. The travelling wave continues (Keep-alive).

**Scroll:** none. The footer is not scroll-linked, and the column does not move with it.

**Pointer:** native cursor (B 9, C13). On a fine pointer, links only: the direction-aware hover of D2.1. A 1 px pseudo-element in seal-text sits on the link's text baseline and scales on X from 0 to 1 with transform-origin on the entry side, with press over T.micro. The text colour changes to seal-text (#9A2820) over T.micro at the same time. The rest underline stays at 1 px rule-strong.

**Touch:** a tap on a link shows the same state with the centre as its origin (D2.1). Nothing else responds.

**Keep-alive:** the closing's travelling wave continues while the footer is in view, so the column keeps its wave. Nothing else moves.

**Reduced motion:** the outer rule and the inner rules are at full length at the trigger. Every cell value is text-1 from the first frame. The wave stops and the column stays in its closing final state. Link hovers change colour instantly (C13).

**No-WebGL fallback:** the canvas is removed. The column is a static inline SVG in div.gl-fallback (aria-hidden="true"), shown only under html.no-gl, with the same markup and viewBox as the closing fallback. It sits in columns 12 to 13 (924.82 to 1071.88 px) with its top at footer top + 131 px, 60svh tall. The title block, disclaimer, docs links and sources list are unchanged. On phone the SVG column sits centred above the footer panel.

### Deviations recorded for the director (act III)

1. Progress for act III. The pricing and closing 3D transitions run on the entrance progress w_p and w_c (C3), not on act I's A3. With A3 the closing showed only the rest band for about 1 vh before its first move. The reading progress s keeps A3's form. Acts I and II are not changed.
2. Timed duration. The table rules, the footer cells and the footer's inner rules use T.beat7, where B uses T.beat. The footer outer rule keeps T.settle (D8). With T.beat the front profile over T.half gives a first overlap of 0.65, below the 0.75 minimum (C14).
3. Uniform offsets. B's table offsets (0, 0.035 and 0.070 s) and footer offsets (0, 0.025 to 0.100 s) are uniform. The brief bans uniform staggers and B's own rule 8.6 forbids them. Both are replaced by the front profile (C14).
4. Pricing camera start. The pricing camera starts at the family keyframe (z 50.02 on desktop, z 80.03 on phone), as direction-3d 11.12 sets it. B names the hero keyframe, which the family section does not use.
5. Closing text layer. The closing text is a fixed layer (C15), so it can sit beside the column while the column is held. The critique dropped sticky holds, so no sticky element is used. The layer appears and hides at section thresholds with a hard cut and no fade on text (B 8.3).
6. Phone footer panel. On phone the footer text sits in an opaque panel that hides the column behind it. B expects the column to stay on screen at every breakpoint. On a 375 px screen the column sits at the centre and the footer text spans the full width, so the two cannot share the screen without overlap. This applies to phone only.
7. Far plane 120 on phones throughout act III (C8), as act I A8 records.
8. Haiku colour is scrubbed (scrubLocal on s), not a timed tween started per character by scroll as B describes. A's rule 5 forbids scroll positions that start timed tweens.
9. Table rows take the D2.1 direction-aware fill. B leaves the pricing table native. The fill adds one pseudo-element per row and is a colour and scale response only.
10. Kireji lead. In pricing the kireji leads with cut on its local progress, following B 8.1. In closing no block leads, as direction-3d 11.10 requires, which is the exception B 8.1 records for the column.

### Decisions this section could not apply

- The haiku text is a copy slot. It is written by the copy owner under the constraints in the closing layout. This section sets no words for it.
- The sources list is complete only when acts I and II copy exist. Its rule and the ten act III URLs are set here (pricing and closing footer).
- The pricing title "Pricing" and the table header wording come from the layout brief. They are labels, not product claims, and the copy owner may replace them.
- The phantom outline material belongs to the family handle (direction-3d 11.8). This section sets its end state only.

### Verification record (act III)

Computed with a script (scratchpad act3_check.py and act3_contrast.py), tan 11 deg = 0.19438:
- Keyframes: pricing z 20.07 (desktop) and 69.54 (phone); closing z 14.60 at any aspect; closing desktop x −1.998, which rounds to −2.00 at 1440 by 900; family z 50.02 (desktop) and 80.03 (phone, height fit).
- Rest band by P1 with front faces at z 0.138: desktop top 66.00%, bottom 71.42%, x 14.76% to 85.24%. Phone top 54.60%, bottom 56.15%, x 14.93% to 85.07%.
- Column by P1 with front faces at z 0.0723: desktop centre x 1038.8 px (72.14%), block edges 1021.2 px and 1056.3 px, vertical span 9.8% to 90.2%, block 35.1 px tall, dimension line at x 1075.3 px. Phone column 171.7 to 203.3 px; haiku right edge 152.7 px (40.7%).
- Grid at 1440 (C10): column 8 ends at 674.24 px, column 9 starts at 686.24 px, column 11 starts at 845.29 px, column 12 ends at 992.35 px, column 13 starts at 1004.35 px. Haiku right edge to column left edge: 28.9 px.
- Pricing clearances at 1440 by 900: table panel bottom 575.7 px (64.0%) against the rest band top at 594 px (66.0%), 18 px clear. Availability panel bottom about 540 px (60.0%).
- Stagger overlaps with T.beat7: 5 items 0.750, 0.896, 0.921, 0.933; 7 items 0.796 to 0.956; all inside [0.75, 0.985]. Table row rules start at 0.17, 0.345, 0.4175, 0.4731 and 0.52 s.
- Contrast, recomputed by WCAG relative luminance and matching B's table: text-1 on paper 15.52:1; text-1 on paper-deep 13.41:1; text-2 on paper 8.61:1 and on paper-deep 7.44:1; text-3 on paper 5.83:1 and on paper-deep 5.04:1; seal-text on paper 6.60:1 and on paper-deep 5.71:1; paper on text-1 15.52:1; paper on seal-text 6.60:1; rule-strong on paper 9.95:1; rule-hair on paper 3.74:1 and on paper-deep 3.23:1; focus on paper 6.60:1. Graphics: block-anodized on paper 12.19:1, kireji seal on paper 5.18:1. The closing haiku's mid-colour #3A3832 on paper is 9.94:1. The row-hover band (paper against paper-deep) is 1.157:1.
- Type sizes at 1440 and 375 computed from B's clamp lines; the values are in C11.
- Not verified: no browser render. The panel clearances, the closing layer thresholds and the 375 by 812 layout still need the screenshot check in qa/shots/act3/ (pricing, closing and footer at 1440 by 900 and 375 by 812).
