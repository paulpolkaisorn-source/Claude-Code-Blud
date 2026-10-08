## 12. Section choreography: act I

Owner: art director. Date: 2026-10-08. Status: LOCKED for act I. Sections: preloader (the boot layer, before act I begins), hero (2 vh), speed (3 vh). Theme: paper on all three (data-theme="paper", data-act="1").

Inputs: design/direction.md headings 1 to 9 and 13 to 16; design/direction-3d.md sections 10 and 11; design/drafts/director-decisions.md (D2.1 to D2.6, D4, D5, D10, D13); design/drafts/critique.md section 7.12; design/drafts/direction-B.md sections 9, 11 and 12; research/facts.md, cited by F-id.

### Act I rules

These rules apply to the three subsections below. A value written in a subsection applies to that subsection only.

- **A1 Time.** t is seconds from loader:done (t = 0). The only line that starts before t = 0 is the hero h1 letter-spacing settle, which starts on the first frame after the h1 exists in the DOM (boot). Nothing starts on a timer.
- **A2 Units.** vh means svh. Pixel values are CSS pixels at 1440 by 900 (desktop) and 375 by 812 (phone) unless a line says otherwise. Positions are measured from the top of the page. The preloader layer is fixed to the viewport.
- **A3 Section progress.** For a section, s = clamp(−(section top) ÷ (section height), 0, 1), where section top is measured from the viewport top. The hero runs s over its 2 vh. The speed section runs s over its 3 vh.
- **A4 Scrub.** ScrollTrigger scrub 0.7 for camera and formation, 0.17 for per-block local progress. Camera and formation curves are sym (ef.sym in JavaScript). Per-block local progress is scrubLocal(k, 17, t, { total 0.35, lead 0.10 }) with k the stagger position; the kireji (position 0) takes anticipate and every follower takes settle.
- **A5 Canvas switch.** A 3D state change that is not scrubbed (reduced motion, no-WebGL) runs in two steps: canvas opacity 1 to 0 with fade over T.half, the pose changes at opacity 0, then canvas opacity 0 to 1 with fade over T.half.
- **A6 Projection P1.** Every screen rectangle in act I uses P1: outlines, annotations, cursor hit tests and the no-WebGL boxes. Block front faces sit at z = +0.23 bu. Let W and H be the canvas size in px, a = W ÷ H, and let the camera be (cx, cy, cz). Set k = (cz − 0.23) × 0.19438 (tan 11 deg). A point (x, y) on a front face is at screen x = W ÷ 2 × (1 + (x − cx) ÷ (k × a)) and screen y = H ÷ 2 × (1 − (y − cy) ÷ k). A block footprint is the rectangle through the projected corners (x_c ± 0.35, y_c ± 0.35). P1 is arithmetic only, with no raycast. It runs at boot, on resize, and once per frame while a pose changes or the pointer is over the canvas (direction-3d 11.12, item 5).
- **A7 Keyframes** (direction-3d 10.6, named as there). hero keyframe, desktop (a ≥ 1.0): z = 5.92 ÷ (0.9 × 0.19438 × a), x = −2.894 at every desktop aspect, y = 0. At 1440 by 900 this is z 21.15. hero keyframe, phone (a < 1.0): z = 5.92 ÷ (1.68 × 0.19438 × a), x = 0, y = −1.10. At 375 by 812 this is z 39.25. speed keyframe, every aspect: z = 15.90 ÷ (1.6 × 0.19438 × a), x = 0, y = 0. At 1440 by 900 this is z 31.95. At 375 by 812 this is z 110.70.
- **A8 Far plane on phones.** direction-3d 10.6 sets far 80. The phone speed keyframe (z 110.70) lies beyond 80, so the race would be clipped. While the speed keyframe is active on phones (a < 1.0), far is 120 and near is 0.5. Desktop keeps far 80. Recorded as a deviation for the director.
- **A9 Breakpoints.** Desktop-landscape: a ≥ 1.0 and width ≥ 1024, the 17-column grid with groups 5, 7 and 5 (direction.md heading 5). Tablet-landscape: a ≥ 1.0 and width 768 to 1023, the 17-column track. Portrait and phone: a < 1.0 at any width, one text column, object above the text (direction-3d 10.6 places the phone stanza in the upper half). Phone landscape: a ≥ 1.0 and width below 768, text boxes are percentages of the viewport width (each subsection gives them).
- **A10 Column positions at 1440 by 900.** Margin 50.00 px, gutter 12.00 px, column 67.53 px. Column 1 starts at 50.00. Column 3 ends at 276.59. Column 4 starts at 288.59. Column 5 ends at 435.65. Column 6 runs from 447.65 to 515.18. Column 8 ends at 674.24. Column 9 starts at 686.24.
- **A11 Colour and type tokens.** Paper theme only (direction.md heading 3): --bg #F1ECE0, --bg-raised #E4DCCB, --text-1 #151512, --text-2 #45413A, --text-3 #5E5A51, --rule-hair #7D786A, --rule-strong #3A3831, --seal #B5312A (fill only), --seal-text #9A2820 (text, hover fill, selection), --focus #9A2820. The 3D block base is block-anodized #2B2A26. Type styles are those of direction.md heading 4: display-xxl (hero h1 only), display-xl (speed title), lede, body, small, label and code.
- **A12 Copy and numbers.** Product wording comes only from research/facts.md, cited by F-id. A slot that needs copy says "copy: <what it carries>". Numbers in act I are: the latency label "Fastest" (F-140), the block counts 05, 07, 05 and 17, the caliper value "x.xx bu", and the readout percentage. Act I has no figure slot and no count-up (direction.md heading 8, rule 14).
- **A13 Cursors, touch and reduced motion.** A custom cursor appears only with (hover: hover) and (pointer: fine) and without reduced motion. The cursor layer is z-index 50 with pointer-events none, and its position is damped with T.micro. Over a link or button the custom cursor hides and the native pointer shows. Touch has no custom cursor. Under reduced motion every scrubbed value sits at its final state at section entry, and there is no breath, tilt, pointer response, hover lift, smear, chromatic aberration, title split or stream loop. Grain is static with seed 17. Colour changes on hover and press are instant.

### preloader

**Leads:** the kireji footprint fills first (stagger position 0). At loader:done the kireji block scales in first.

**Sequence:**
- Appearance (boot, not a timer). Each of the 17 footprints fades in with fade over T.half. Footprint k starts at HAIKU_OFFSETS[k] from boot, where k is its stagger position in the stanza order of direction-3d 11.2: 4, 3, 2, 1, 0, 8, 7, 9, 6, 10, 5, 11, 14, 13, 15, 12, 16. The last footprint finishes at 0.93 s from boot.
- Progress (real). Weights: fonts 2, GL chunk 5, shader compile 2, environment map 1, total 10. progress = (sum of weight × completed fraction) ÷ 10. A task's fraction is 1 when it is done, or its measured byte fraction for the GL chunk. Nothing is reported ahead of its task.
- Fill. Footprint at stagger position k fills, with press over T.snap, when progress ≥ (k + 1) ÷ 17. At progress 1 all 17 are filled.
- Readout. The integer is floor(progress × 100), so it never shows a value ahead of reality. It shows 100 only when all tasks are done.
- loader:done (t = 0). The kireji block (position 0) scales from 0 to 1 with cut over T.beat5. Its footprint fades out with fade over T.half from t = 0.
- Followers (positions 1 to 16). Each block scales from 0 to 1 with settle over T.half, starting at T.micro + HAIKU_OFFSETS[k]: 0.22 s for position 1 and 0.75 s for position 16. Its footprint fades out with fade over T.half from the same start. Overlap between consecutive followers at D = T.half is 0.755 to 0.962, inside the 0.75 to 0.985 rule.
- The readout is removed with a cut at t = 0; the row rules fade out with fade over T.half from t = 0.
- The layer is removed (display none) at t = 1.10 s, when the last follower ends.
- Recorded deviation: the draft handoff ended at 0.87 s, but that needs a 0.35 s span for 17 items. HAIKU_OFFSETS spans 0.580 s, so 0.87 s cannot hold with T.half settle and the T.micro lead. This part keeps HAIKU_OFFSETS and ends at 1.10 s.
- The h1 sits in the hero section and is visible throughout. Nothing in this layer covers it.
- Budget: loader:done before 1.5 s after boot on the QA profile (20 Mbit/s, 40 ms round trip, cold cache).
- Failure: startLoading still resolves and loader:done still fires. The readout keeps its last real value, and no value is invented.

**2D layer:**
- Layer: a div.preloader-layer, position fixed, inset 0, z-index 2, pointer-events none, aria-hidden="true". section#preloader has height 0 in the flow, so the hero starts at the top of the page.
- Footprints: 17 rounded rectangles placed by P1 with the hero keyframe at the rest pose. Stroke 1px, colour --rule-hair, no fill. Corner radius 0.05 × side (0.035 bu on 0.70 bu). Filled state: 16 footprints solid --text-1; the kireji solid --seal, which matches its 3D colour #B5312A.
- Reference values at 1440 by 900: the kireji footprint is x 1194.1 to 1271.6 px and y 295.1 to 372.5 px. Row B spans 49.49% to 94.99% of the width. Row A spans 56.18% to 88.30%. The stanza spans 32.79% to 67.21% of the height.
- Row rules: 1px --rule-hair, through each row centre y, from the left edge of the row's first footprint to the right edge of its last footprint. Rows A, B and C.
- Readout: label style, colour --text-3. Text is "LOADING", a no-break space, three digits from 000 to 100, and "%". Left edge: the left edge of row C's first footprint. Top: bottom edge of row C's footprints + 19 px (sp-4). Phone uses the same rule.
- Colour tokens used: --rule-hair, --text-1, --seal, --text-3.

**3D layer:**
- Formation: stanza at the rest pose (direction-3d 11.2): row A y 1.05, row B y 0, row C y −1.05, pitch 0.87, yaw 0.
- Camera: hero keyframe (A7), held. Far 80. DoF off.
- Blocks: scale 0 until their start in Sequence. Scale is applied at each block's centre.
- Material: block-anodized at p1 = 0 (direction-3d 10.3). Shadow catcher opacity 0.14 (direction-3d 10.4). Post stack and grain at the paper values (direction-3d 10.8).

**Scroll:** none. The layer is fixed. Lenis runs from boot (direction.md heading 8, rule 19), and this layer does not map scroll.

**Pointer:** none.

**Touch:** none.

**Keep-alive:** none. The layer is removed at 1.10 s. The hero starts its breath at T.hold after loader:done (see hero).

**Reduced motion:** footprints fill with no transition, and the readout changes in place. At loader:done all 17 blocks are set at scale 1 in the stanza. The canvas fades in from opacity 0 to 1 over T.half (second step of A5), and the layer fades out over T.half. No per-block scale runs.

**No-WebGL fallback:** the fill and the readout run as above. At loader:done, which also fires on failure, the layer fades out with fade over T.half, and the hero's static stanza fallback fades in with fade over T.half. The layer is removed at t = T.half in this mode.

### hero

**Leads:** the kireji block at the handoff (stagger position 0), and the display-xxl h1 from the first frame.

**Sequence:**
- Boot (first frame). The h1 letter-spacing settles from +0.02em to −0.02em with settle over T.beat7. It is set at +0.02em at first paint and is legible in every frame.
- t = 0 to 1.10 s. The preloader handoff runs (see preloader). The kireji enters with cut over T.beat5, and the 16 followers enter with settle over T.half at T.micro + HAIKU_OFFSETS[k].
- t = T.half (0.35 s). The dimension lines draw with DrawSVG over T.beat5 with settle. They finish at 0.85 s. Ticks and labels are visible at their final positions from t = 0.
- t = T.beat5 (0.50 s). The lede colour settles from --text-3 to --text-2 over T.beat5 with settle.
- t = T.hold (0.85 s). The idle breath starts (see 3D layer).
- The primary button and the secondary link are drawn at their token colours from the first frame. They are controls, so they have no entrance.
- Scroll changes start at s = 0 (see Scroll).

**2D layer:**
- h1: display-xxl, colour --text-1, weight 400 at rest. Markup: "Claude", a forced line break, then "Haiku&nbsp;5.5". Line-height 0.92. Letter-spacing as in Sequence.
- Desktop-landscape (width ≥ 1024). h1 box: columns 1 to 8, which is 624.24 px at 1440 and 443.9 px at 1024. Top of the box at 12vh. Line 2 "Haiku 5.5" measures 4.327 em at +0.02em and 3.967 em at −0.02em, both at weight 400, and 3.996 em at weight 430 with −0.02em. At 1024 px the first-frame line runs 24.6 px past column 8 for T.beat7. Nothing sits in that band. Row B starts at 49.49% of the width, but it lies below the h1 band, and row A starts at 56.18%.
- Lede: lede style, colour --text-2 after its settle. Columns 1 to 5 (50.00 to 435.65 px at 1440). Top = h1 box bottom + 50 px (sp-6). Maximum measure 36ch. Copy: F-22, verbatim: "Claude Haiku 5.5 is designed for high-volume, cost-sensitive tasks."
- Primary button: columns 1 to 3 (50.00 to 276.59 px at 1440). Top = lede bottom + 31 px (sp-5). Height 50 px (sp-6), horizontal padding 19 px (sp-4). Fill --text-1, label --bg, body style, sentence case, white-space nowrap. Copy: "copy: CTA label that names the Haiku 5.5 overview docs (URL from F-02: https://platform.claude.com/docs/en/models/haiku-5-5/overview). Sentence case, three words or fewer."
- Secondary link: columns 4 to 5 (288.59 to 435.65 px at 1440), vertically centred on the primary button. Body style, colour --text-1. Copy: "copy: link label; it jumps to the speed section through scrollToTarget('speed'). Sentence case, three words or fewer."
- Row-end counts: label style, colour --text-3, reading "05" for row A, "07" for row B and "05" for row C. Left edge = row's right edge + 12 px (sp-3) at desktop. Vertical centre = row centre. Positions come from P1.
- Dimension line under row C: 1px --rule-hair, from the left edge of row B's first block to the right edge of row B's last block. It sits 19 px (sp-4) below row C's bottom edge. Two end ticks, each 5 px (sp-1) long and perpendicular. Label "17" in label style, colour --text-3, centred on the midpoint, 5 px (sp-1) below the line.
- Tablet-landscape (width 768 to 1023). h1 box: columns 1 to 17. Its text ends at 49.3% of the width at 768 px, before row A at 56.18%. Lede: columns 1 to 8. Primary button: columns 1 to 4. Secondary link: columns 5 to 8. Vertical rules as desktop.
- Phone-landscape (a ≥ 1.0, width below 768). h1 box: left 47% of the width. Lede: left 31%. Primary button and secondary link: left 47%. Vertical rules as desktop. Row-end counts sit 5 px (sp-1) from the row edge.
- Portrait and phone (a < 1.0). Object above, text below (A9). h1 top at 56vh, text full width (19 px margins below 768, clamp margins from 768). Lede top = h1 bottom + 31 px (sp-5). Primary button top = lede bottom + 31 px. Secondary link top = button bottom + 19 px (sp-4). Row-end counts sit 5 px from each row edge. At aspects 0.46 to 0.85, row C's bottom edge is at 51.98% to 53.67% of the height, so 56vh clears the object by at least 2.33%.
- Colour tokens used: --text-1 (h1, button fill, link), --bg (button label), --text-2 (lede), --text-3 (labels), --rule-hair (dimension lines), --rule-strong (link rest underline), --seal-text (link hover line and button hover fill).
- Type styles used: display-xxl (h1), lede, body (button, link), label (annotations).
- Hover and press (fine pointer): the primary button's hover is a full-height pseudo-element in --seal-text that scales on X from the entry side, with press over T.micro. The label stays --bg. The link's hover line is --seal-text, scaled on X from the entry side, with press over T.micro. Touch and reduced motion are as direction.md heading 13 states.

**3D layer:**
- Formation: stanza (direction-3d 11.2) with the stanza-open modulation of direction-3d 11.11. With q = hero progress s over 2 vh and k = ef.sym(q): pitch = 0.87 + 0.08 × k; row A at y = +(1.05 + 0.08 × k); row B at y 0; row C at y = −(1.05 + 0.08 × k). At q = 1 the pitch is 0.95 and the row offsets are 1.13.
- Camera: hero keyframe (A7), held for the whole section. DoF off. Far 80.
- Shadow catcher opacity 0.14 at p1 = 0. Block material and lights at p1 = 0 (direction-3d 10.3 and 10.4).
- Breath (direction-3d 10.12): dy_i = 0.012 × sin(2π × t ÷ T.breath + φ_i), applied to each block's y after the formation pose. φ is 0 for row A, 0.4π for row B and 0.8π for row C. It starts at t = T.hold.

**Scroll:** s is hero progress (A3), over 2 vh.
- Stanza open: the pose follows the 3D layer formulas above, scrubbed with scrub 0.7.
- h1 weight: u = clamp(s ÷ 0.5, 0, 1), and wght = 400 + 30 × (1 − |2 × ef.sym(u) − 1|). The weight is 400 at s = 0, 430 at s = 0.25, and 400 at s = 0.5, and it stays 400 for s from 0.5 to 1. It is applied through font-variation-settings "wght".
- Camera holds. No text moves on scroll.
- Annotations and the dimension line are placed by P1 once per frame while the pose changes.

**Pointer** (fine pointer only):
- Datum: two 1px lines in --text-1, one horizontal and one vertical. Each line is two 12 px arms that start 5 px from the pointer on each side, so the centre stays open.
- Over a block, the datum is replaced by that block's two-digit label (index + 1, label style, colour --text-1), placed 12 px right and 12 px below the pointer. The hit test is P1 applied to the 17 footprints, once per frame. The swap is cut over T.flick.
- Tilt (direction-3d 10.13): rotX = −sy × 0.035 rad and rotY = sx × 0.035 rad on the group origin, with sx and sy from the architecture's 0.1 s smoothing. The tilt is damped with T.half and capped at 0.035 rad per axis.

**Touch:** no datum and no tilt. A tap on a block shows its two-digit label for T.breath (1.7 s), placed 12 px right and 12 px below the tap point, with cut over T.flick when it shows and when it hides. Taps on the button and link behave as links. Scrolling is native, with Lenis on touch and syncTouch false (D2.6).

**Keep-alive:** the breath above runs while the hero is in view and pauses when the hero leaves the viewport (direction.md heading 8, rule 9). The stanza open continues through the scroll.

**Reduced motion:** at first paint the h1 is at −0.02em and weight 400. The lede is at --text-2. The dimension lines are drawn at full length. The stanza is at the rest pose (pitch 0.87, row offsets 1.05). There is no scroll mapping, no breath, no tilt and no datum (native pointer). Button and link colour changes are instant.

**No-WebGL fallback:** a static inline SVG in div.gl-fallback, aria-hidden="true", shown only under html.no-gl. Its viewBox is "-2.96 -1.40 5.92 2.80" with a group transform of scale(1 -1), so y points up. It holds 17 rects of 0.70 × 0.70 bu with rx 0.035 at the rest-pose positions of direction-3d 11.2. Fill is #2B2A26 (block-anodized), and the kireji is #B5312A. There is no stroke and no shading. The SVG fills the P1 rectangle of the rest-pose stanza, which JavaScript sets on resize. At 1440 by 900 that is left 49.49%, width 45.50% and vertical centre 50%. At 375 by 812 it is left 7.75%, width 84.50% and vertical centre 42.75%. The annotations stay in the DOM and are placed by P1 in this mode too.

### speed

**Leads:** the kireji block (race stagger position 0) moves first on anticipate. The other 16 blocks move in race order on settle.

**Sequence:**
- Title reveal (once, when the title's top crosses 80% of the viewport height, and never replayed). "Fastest" is split into its 7 characters. Each character starts displaced horizontally by (i − 3) × 0.06em, for i from 0 to 6, and in --text-3. Its start offset is weightedStagger(7, { total: T.half, weight: 'front' }), which is 0, 0.1429, 0.2021, 0.2475, 0.2858, 0.3195 and 0.3500 s. Each character then tweens to its set position and colour --text-1 with settle over T.beat7. Opacity stays at 1. Overlap ratios run from 0.796 to 0.956.
- Source note and footnote. Their colour settles from --text-3 to --text-2 over T.beat5 with settle, starting T.half after the title reveal starts.
- Race (scrubbed on s). u = clamp(s ÷ 0.25, 0, 1). The race is complete at u = 1, which is 0.75 vh of scroll. The start pose is the stanza at the end of the hero (pitch 0.95, row offsets 1.13). Each block moves from that pose to its race pose (direction-3d 11.3). Position k takes q_k = scrubLocal(k, 17, u, { total 0.35, lead 0.10 }). The kireji moves on anticipate(q_0). Each follower moves on settle(q_k).
- Camera. The camera moves from the hero keyframe to the speed keyframe with ef.sym(u): z from 21.15 to 31.95 and x from −2.894 to 0 at 1440 by 900. It holds at u = 1. Act II returns the camera to the hero keyframe.
- Dimension line under the race. It draws from the left edge of block 01 to the right edge of block 17 with settle(u). Tick k (5 px, at block k's centre) becomes visible when settle(u) ≥ (k + 0.5) ÷ 17. The label "17" appears with the line's completion.
- Breath starts at T.hold (0.85 s) after u reaches 1 (see 3D layer).
- The example stream starts when the section enters the viewport and pauses when it leaves (see Keep-alive).
- The section ends at the speed-to-capabilities ink-bleed p1 (direction-3d 10.10). The last 0.18 vh of the section holds no text (direction.md heading 8, rule 13). All speed text sits in the first 0.85 vh of scroll.

**2D layer:**
- Desktop-landscape (width ≥ 1024). All speed text sits in columns 1 to 6 (50.00 to 515.18 px at 1440).
- Title "Fastest": display-xl, colour --text-1, weight 400, letter-spacing −0.015em, line-height 0.98. Top at 18vh when s = 0. Measures 290.7 px wide at 1440. The text is split with GSAP SplitText. The h2 keeps aria-label="Fastest", and the characters are aria-hidden. Copy: F-140 label "Fastest" (Haiku 5.5 in the "Comparative latency" row).
- Footnote marker "1": label style, colour --seal-text, as a superscript after the title, outside the split.
- Source note: small style, colour --text-2 after its settle, top = title bottom + 12 px (sp-3). Text: "Comparative latency, relative to the current lineup." (F-140 and F-38).
- Footnote: small style, colour --text-2 after its settle, top = source note bottom + 7 px (sp-2). It starts with the label-style marker "1" and a no-break space, then this text (F-37, the qualifier clause, with its first letter capitalised): "At each model’s standard speed, although it runs less quickly than our Opus models in Fast Mode."
- No figure slot. No count-up. A verified speed number does not exist (direction.md heading 8, rule 14).
- Example panel: "Example output". Columns 1 to 6, top at 58vh (522 px at 900). Width 465.18 px at 1440. Background --bg-raised, 1px border --rule-hair, padding 31 px (sp-5), no radius. Fixed height of 31 px + label line + 19 px (sp-4) + eight code lines + 31 px.
- Panel label: "Example output" in label style, colour --text-3.
- Stream: code style (Geist Mono 400, line-height 1.6), colour --text-1. Each token enters at --text-3 and settles to --text-1 with settle over T.beat5. A token is one whitespace-delimited word, shown with its trailing space. The stream wraps inside the panel. This is a stated exception to the code style's no-wrap rule, because the stream is prose and must fit the panel width. Copy: "copy: 40 words exactly, an illustrative summary of a generic support message. No product name, no number and no product claim. At most 240 characters with spaces, so it fits in eight lines at 375 px."
- Caret: 2px wide, 1em tall, colour --seal-text, after the last visible token. It is solid and does not blink.
- Race dimension line: 1px --rule-hair, placed 19 px (sp-4) below the race's bottom edge (475.5 px at 1440, so the line sits at 494.5 px). Ticks are 5 px tall at each block centre. Label "17" in label style, colour --text-3, centred, 5 px below the line.
- Tablet-landscape (width 768 to 1023). All speed text sits in columns 1 to 8. Vertical positions as desktop.
- Portrait and phone (a < 1.0). One text column, full width. Title top at 12vh, then source note and footnote. Panel top at 58vh, full width. The race is centred at 50vh, which is the camera at y 0. At 375 by 812 the race blocks are 13.24 px tall, the race spans 9.92% to 90.08% of the width, and its centre is at 406 px. The race dimension line sits at 432 px (19 px below the race bottom at 412.6 px).
- Phone-landscape (a ≥ 1.0, width below 768). Speed text sits in the left 47% of the width, and the panel is 47% wide.
- Colour tokens used: --text-1, --text-2, --text-3, --bg-raised, --rule-hair, --seal-text.
- Type styles used: display-xl (title), small (source note and footnote), label (marker, panel label, annotations), code (stream).

**3D layer:**
- Formation: race (direction-3d 11.3). Index k at x = (k − 8) × 0.95, y 0, z 0, scale 1, yaw 0. The line is 15.90 bu wide, from −7.95 to +7.95 at the block edges. Stagger order: 4, 3, 2, 1, 0, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5.
- Camera: speed keyframe (A7), reached through ef.sym(u) from the hero keyframe. Far 80 on desktop and 120 on phones (A8).
- DoF: on, while the section overlaps the viewport. Focus = the speed keyframe z. Desktop: focus 31.95 bu, normalised (31.95 − 0.5) ÷ 79.5 = 0.3956, bokeh 1.2 px (direction-3d 10.8). Phone: focus 110.70 bu, normalised (110.70 − 0.5) ÷ 119.5 = 0.9221, bokeh 1.2 px. The pass is removed from the chain when the section leaves the viewport.
- Smear (direction-3d 10.11): s_v = clamp(|v| ÷ 2400, 0, 1), with v = scrollState.velocity in px/s, damped with T.micro. Each block's height along y becomes 0.70 + 0.245 × s_v bu, centred on the block's own centre. Width and depth are unchanged. Zero at rest.
- Chromatic aberration and grain: direction-3d 10.8.
- Materials and lights: direction-3d 10.3 and 10.4 at p1, the speed-to-capabilities ink-bleed. The kireji is #B5312A at p1 = 0 (direction-3d 10.3). The shadow catcher is 0.14 at p1 = 0.
- Breath (direction-3d 10.12): amplitude 0.012 bu, phase 0 for all 17 blocks, period T.breath. It starts at u = 1 plus T.hold.
- Hover lift: +0.15 bu on y with settle over T.beat5 (direction-3d 10.13). Touch lifts the same way.

**Scroll:** s is speed progress (A3), over 3 vh. u = clamp(s ÷ 0.25, 0, 1).
- Race, camera and dimension line are as in the Sequence.
- Scroll velocity drives the smear and the chromatic aberration (direction-3d 10.8 and 10.11), and it sets the stream rate (Keep-alive).
- Text does not move on scroll. The title is not scroll-linked.
- The ink-bleed p1 starts when the capabilities top enters from the bottom edge (direction-3d 10.10).

**Pointer** (fine pointer only, and only when u = 1):
- Caliper tick: 1 px wide, 12 px tall, centred on the pointer x, colour --text-1.
- Caliper dimension line: 1px --text-1 at the pointer y, from the screen x of block 01's left edge (139.8 px at 1440 by 900) to the pointer x.
- Label: "x.xx bu" in label style, colour --text-1, 5 px above the midpoint of the line.
- Value: x = (2 × px ÷ W − 1) × 9.866 at 1440 by 900, which is P1 at the speed keyframe on the block front face. In general the half-width is (z − 0.23) × 0.19438 × a. The value is x + 7.95, shown to two decimals and clamped to 0.00 to 15.90.
- Block hover: P1 on the race rectangles without the lift, once per frame. The block under the pointer lifts +0.15 bu on y with settle over T.beat5. It returns the same way when the pointer leaves.

**Touch:** no caliper. A tap on a block lifts it by +0.15 bu on y with settle over T.beat5, and a second tap on the same block lowers it the same way. The title, notes and panel take no taps. Scrolling is native.

**Keep-alive:**
- Breath, as in the 3D layer, while the section is in view.
- Example stream. Rate r = clamp(0.04 × |v|, 34, 160) tokens per second, with v in px/s from scrollState.velocity and time from gsap.ticker, read once when a run starts. A run is 40 tokens. Token k of a run (k from 0 to 39) enters at weightedStagger(40, { total: 39 ÷ r, weight: 'front' })[k] seconds after the run's first token. The mean interval is 1 ÷ r, and the gaps shrink along the run, so no two intervals are equal (direction.md heading 8, rule 4). At the floor rate of 34 tokens per second the first offsets are 0, 0.1837, 0.2598 and 0.3181 s, and the last is 1.1471 s. The rate never falls below 34 tokens per second, so the stream never stalls. After the 40th token the stream holds for T.breath (1.7 s), clears the panel and restarts at token 0. It runs only while the section is in view. When the section leaves the viewport it pauses and keeps its place.
- Smear decays through its T.micro damping when the scroll stops.

**Reduced motion:** when the section is 20% visible, the race pose is applied through the canvas switch (A5), and the camera is at the speed keyframe. DoF is off. There is no smear, no chromatic aberration, and the grain is static (seed 17). The title is plain text in --text-1, with no split and no displacement. The source note and footnote are at --text-2 at once. The dimension line is drawn at full length with all 17 ticks. The stream shows its 40 tokens at --text-1 with no settle and no loop. The caliper, hover lift and breath are off.

**No-WebGL fallback:** a static inline SVG in div.gl-fallback, aria-hidden="true", shown only under html.no-gl. Its viewBox is "-7.95 -0.35 15.90 0.70" with a group transform of scale(1 -1). It holds 17 rects of 0.70 × 0.70 bu with rx 0.035, at x = (k − 8) × 0.95 in index order along the line. Block 04 (the kireji) is #B5312A and the other 16 are #2B2A26. The SVG fills the P1 rectangle of the race at the speed keyframe, which JavaScript sets on resize. At 1440 by 900 that is left 9.71%, width 80.58% and vertical centre 50%. At 375 by 812 it is left 9.92%, width 80.16% and vertical centre 50%. The dimension line, ticks, label, title, notes and panel stay in the DOM.

### Deviations recorded for the director (act I)

1. Preloader handoff ends at 1.10 s, not the draft's 0.87 s. Reason: HAIKU_OFFSETS spans 0.580 s, and a 0.35 s settle with the T.micro lead ends at 1.10 s (see preloader).
2. Phone speed keyframe uses far 120 (A8). Reason: direction-3d 10.6 sets far 80, and the phone speed z of 110.70 would clip the race.
3. Phone hero places the object above the text (A9). Reason: direction-3d 10.6 places the phone stanza in the upper half. This overrides the heading 5 phrase "3D below the text" for act I only.
4. Projection P1 runs once per frame while a pose changes (A6). Reason: direction-3d 11.12, item 5, requires per-frame rectangles for the tilt and the lifts. This replaces the boot-only rule of direction.md heading 9.
5. The speed race completes at u = 1, which is 0.75 vh of scroll, because the span is left to the act files by direction-3d 11.3.
6. The example stream wraps inside its panel. Reason: it is prose set in the code style, and it must fit the panel width.
7. Buttons use body style and sentence case, as direction.md heading 4 requires. Label style is uppercase and is therefore not used for buttons.
8. The preloader kireji fills with --seal #B5312A, which matches its 3D colour. The draft used seal-text #9A2820.
9. The readout uses floor(progress × 100), so it never shows a value ahead of reality.
10. Tablet-landscape hero text: h1 in 17 columns, lede in columns 1 to 8, button in columns 1 to 4 and link in columns 5 to 8. Reason: the stanza occupies the right half, which starts at column 9 of the 768 px track.
