## 12. Section choreography: act II

Owner: art director. Date: 2026-10-08. Status: LOCKED for act II. Sections: capabilities (3 vh), code (2 vh), family (2 vh). Theme: ink on all three (data-theme="ink", data-act="2"). Inputs: design/direction.md headings 1 to 9 and 13 to 16; design/direction-3d.md sections 10 and 11; design/direction-act1.md, rules A1 to A13 and its deviations, where this act uses the same rule; design/drafts/director-decisions.md (D2 to D6, D13); research/facts.md, cited by F-id.

### Act II rules

These rules apply to the three subsections below. A value written in a subsection applies to that subsection only.

- **C1 Units and time.** vh means svh. Pixel values are CSS pixels at 1440 by 900 (wide) and 375 by 812 (phone) unless a line says otherwise. Nothing starts on a timer. Each motion starts on an activation, on a section entry, or on a scroll position.
- **C2 Section progress.** For capabilities, code and family, p = 0 when the section's top edge is at the vertical centre of the viewport, and p = 1 when its bottom edge is at that centre. In px, p = (0.5 × vh − top) ÷ H, where top is the section's top edge and H its height. This replaces act I's rule A3 for act II only. Reason: capability card k is centred at p = (2k − 1) ÷ 6, so the switch between two cards falls exactly midway; the code panel and the family labels are centred at p = 0.5. Under the draft B trigger, card 2 would switch while it sits at the bottom edge of the screen.
- **C3 Viewport classes.** Wide: width at least 768 px and aspect (width ÷ height) at least 1.0. Narrow: aspect below 1.0 at any width, which covers phones and portrait tablets. Phone landscape (aspect at least 1.0 and width below 768 px) uses the wide placement, with each column edge replaced by the percentage it takes at 1024 px: cards end at 35.8% of the width and panels end at 52.3%. Aspect sets the 3D camera (direction-3d 10.6). Width sets the 2D columns.
- **C4 Grid, wide.** Seventeen columns from 768 px (direction.md heading 5). At 1024 px the margin is 35.56 px, the gutter 8.53 px and a column 48.02 px. At 1440 px the margin is 50 px, the gutter 12 px and a column 67.53 px. At 1920 px the margin is 66.67 px, the gutter 16 px and a column 90.04 px. Columns 1 to 6 are 330.8 px, 465.2 px and 620.2 px wide at those sizes. Columns 1 to 9 are 500.5 px, 703.8 px and 938.4 px wide, and end at 52.3% of the width at each size. At 768 px, columns 1 to 9 are 370.5 px wide.
- **C5 Grid, narrow.** One column at full width. Margin 19 px on each side. Cards and panels have 19 px padding, so the inner width is 299 px at 375 px.
- **C6 Camera.** Capabilities and code use the hero keyframe (direction-3d 10.6). Wide: z 21.15 and x = −0.22 × W(z), which is −2.89 at 1440 by 900, and y 0. Narrow: z 39.25, x 0 and y −1.10. Family uses the family keyframe. Wide: z = 28 ÷ (0.9 × 2 × tan 11° × aspect), which is 50.02 at 1440 by 900, and x 0. Narrow: z 80.03 (fit 0.90 of the height), x = +4.02 bu, which is 0.28 × W(z), and y 0 (decision A4). Every camera move in act II is scrubbed with sym.
- **C7 Colour.** Ink theme only. Tokens: --bg #151512, --bg-raised #22211D, --text-1 #F1ECE0, --text-2 #CFC8B9, --text-3 #A39D90, --rule-hair #75705F, --rule-strong #E4DCCB, --seal #E7735F, --seal-text #E7735F, --focus #E7735F, --code-string #D8C58F. Pairs used, from design/contrast.mjs: text-1 on ink I01 (15.52:1) and on ink-raised I02 (13.67:1); text-2 on ink I03 (10.99:1) and on ink-raised I04 (9.68:1); text-3 on ink I05 (6.78:1) and on ink-raised I06 (5.97:1); seal-ink on ink I07 (6.11:1) and on ink-raised I08 (5.38:1); code-string on ink-raised I09 (9.44:1). Graphics: rule-hair on ink I12 (3.69:1) and on ink-raised I13 (3.25:1); rule-strong on ink I14 (13.41:1) and on ink-raised I22 (11.81:1); seal-ink on ink I18 (6.11:1) and on ink-raised I21 (5.38:1); block-steel on ink I17 (9.16:1); focus on ink I15 (6.11:1) and on ink-raised I16 (5.38:1); phantom outlines I20 (3.69:1).
- **C8 Text.** Text never fades and never moves in y (direction.md heading 8, rule 6). Text colour settles from text-3 to its token colour over T.beat5 with settle, and falls back to text-3 with press over T.micro. A display-xl section title is split into characters with SplitText, its parent keeps an aria-label with the full title, and it reveals once when its top crosses 80% of the viewport height (direction.md heading 8, rule 15). Under reduced motion every title is static.
- **C9 Type styles.** Label style (mono caps) is used for tags, latency labels, prices and bin names. Stair labels use small style in sentence case. Buttons use body style and sentence case (direction-act1 deviation 7). Hyphens are manual. Line length: body 62ch, small 60ch.
- **C10 Motion classes.** Timed motion uses the T table and the stagger rules of direction.md heading 7, and it starts on an activation, a section entry or loader:done. Scrubbed motion is driven by p. Camera and formation moves use sym. Per-block progress is scrubLocal(j, 17, t, { total: 0.35, lead: 0.10 }), with j the block's stagger position. The kireji (index 4) takes anticipate on its local progress, and each other block takes settle.
- **C11 Cursors.** A custom cursor is shown only with (hover: hover) and (pointer: fine), and only without reduced motion. Keyboard focus hides it. Over a button the custom cursor hides and the native pointer shows (direction-act1 A13). The cursor layer is z-index 50 with pointer-events none. Its position is damped with T.micro: x ← x + (target − x) × (1 − e^(−Δt ÷ T.micro)). Act II has three forms. The marker (capabilities) is a 7 px seal-ink square centred on the pointer, and its shape swap from the native pointer is cut over T.snap. The datum (family) is two 1 px text-1 lines, one horizontal and one vertical, each made of two 12 px arms that start 5 px from the pointer on each side, so the centre stays open (direction.md heading 9). The code section uses the native I-beam. No hit test runs in act II, because cards and labels are DOM elements.
- **C12 Pointer.** Every pointer response is damped with T.half after the 0.1 s smoothing of D13.4 (direction-3d 10.13). Offsets stay within 0.2 bu and lifts within 0.6 bu (direction.md heading 8, rule 7). No tilt is used in act II (the hero tilt is its only tilt). Touch has no pointer response.
- **C13 SVG.** Graphics are inline SVG, marked aria-hidden, and each subsection gives its viewBox. A 1 px hairline has vector-effect="non-scaling-stroke", so it stays 1 px at every size. DrawSVG and MorphSVG targets do not use non-scaling-stroke. Graphic text is HTML, placed in percentages of the graphic box, never inside the SVG.
- **C14 Canvas switch.** A 3D change that is not scrubbed (reduced motion, and each change of formation when the card changes under reduced motion) runs in two steps, as direction-act1 A5: canvas opacity 1 to 0 with fade over T.half, the pose changes at opacity 0, then canvas opacity 0 to 1 with fade over T.half.
- **C15 Loops and breath.** A loop runs while its section is in view and pauses when it leaves (direction.md heading 8, rule 9). Reduced motion stops every loop. The idle breath has amplitude 0.012 bu and period T.breath. It starts T.hold after the block's formation arrives, which for a scrubbed arrival means T.hold after the block's scrub value reaches 1. Row phases are 0 for row A, 0.4π for row B and 0.8π for row C (direction-3d 10.12).
- **C16 Focus.** outline 2 px solid var(--focus), outline-offset 3 px. The ring appears in 0 s and shows for keyboard focus only (direction.md heading 13).

### capabilities (ink, 3 vh)

Structure. Three slots, each exactly 1 vh high, stacked from the section top: slot k has its top at section top + (k − 1) × 1 vh and holds card k. Card k is active while p is in [(k − 1) ÷ 3, k ÷ 3). The active card is the one whose slot centre is nearest the vertical centre of the viewport. The section has no sticky element and no pin. The cards scroll with the page, and the 3D stage is the fixed canvas.

**Leads:** on an activation the card's mark fills first (cut over T.micro), and the kireji moves first in the formation (cut over T.micro). Its followers settle after it. In a scrub, the lead is position 0 of scrubLocal, which is the kireji on anticipate.

**Sequence:**
- Scrubbed blends. At each boundary b in {1/3, 2/3}, u = clamp((p − (b − 0.05)) ÷ 0.1, 0, 1) and t = sym(u). Each block's local progress is q = scrubLocal(j, 17, t, { total: 0.35, lead: 0.10 }), where j is the block's stagger position in the order of the formation it is entering (direction-3d 11.1). Its pose is the mix of its pose in the formation it is leaving and its pose in the formation it is entering, by the curve on q: anticipate for the kireji and settle for the other 16. Outside the bands the formation is the active card's. b = 1/3 runs cap-0 to cap-1, and b = 2/3 runs cap-1 to cap-2.
- Timed activation (tap or key). Step 1: aria-pressed moves to card k, and its mark fills with cut over T.micro. Its heading and body settle to text-1 and text-2 over T.beat5 with settle, and the card it leaves falls back to text-3 with press over T.micro. Step 2: the formation tweens to cap-k over T.beat7. The kireji moves with cut over T.micro from offset 0. The other 16 blocks settle over T.beat7 from offset T.micro + HAIKU_OFFSETS[j], where j is the block's stagger position in the cap-k order (j is at least 1 for these blocks, because position 0 is the kireji). The blocks of the arriving active group use follow for their last move, once per arrival. Step 3: scrollToTarget(slot k) moves the page. Step 4: while steps 2 and 3 run, p does not drive the formation. Control returns to p when the nearest slot is slot k, or at the reader's next wheel, touch or key input, whichever comes first. No timer runs.
- Stair. L = clamp((p − 2/3) × 3, 0, 1), and the active step is min(4, floor(5 × L)). Step 0 is Low and step 4 is Max. The stair follows p and not the activation.
- Title. copy: "Capabilities" (display-xl, text-1). It sits above card 1 in slot 1.
- Camera entry. The camera enters the section at the hero keyframe. The move from the speed keyframe is driven by the bleed progress p1 of direction-3d 10.10, which is already eased with sym: z = 31.95 + (21.15 − 31.95) × p1 and x = −2.894 × p1 at 1440 by 900. On phones the move is z 110.70 to 39.25 and y 0 to −1.10, with x 0. The far plane is 120 while z is above 80, as act I A8 sets it.

**2D layer, wide (1024 px and up).** Title: columns 1 to 6, top at slot 1 top + 8% of the viewport height. Cards: columns 1 to 6, or columns 1 to 9 from 768 px to 1023 px. Each card is centred vertically in its slot, so the card centre is the slot centre. Card box: background var(--bg-raised), a 1 px border in rule-hair (I13) when inactive and in rule-strong (I22) when active, padding 31 px, no border-radius. Inside the card, from the top:
- label row, label style, text-3: "BLOCKS 01 TO 05" (card 1), "BLOCKS 06 TO 12" (card 2) or "BLOCKS 13 TO 17" (card 3). Gap 7 px.
- heading row, a button with aria-pressed. It holds the mark, a 7 by 7 px square with a 1 px outline in seal-ink (I21) when inactive and a seal-ink fill when active, then a 7 px gap, then the heading (heading style, text-3 when inactive and text-1 when active). Headings: "Computer use and browser use", "High-volume work", "Adjustable effort". Gap 12 px.
- body, body style, text-3 when inactive and text-2 when active. Copy: card 1, copy: F-151 in full, then F-153 in full. Card 2, copy: F-146 in full, then F-148 in full. Card 3, copy: F-155 in full, then F-156 in full. Gap 19 px.
- the card's graphic from the card graphics above, with its HTML labels.

**2D layer, narrow (phone and portrait).** Title: top at slot 1 top + 10% of the viewport height, full width. Cards: full width with margin 19 px and padding 19 px. A card's top is at slot top + 52% of the slot height (422 px at 812 px), and its height is at most 46% of the slot height (373 px at 812 px). Cards are not centred. Body copy is shorter. Card 1, copy: the first clause of F-151, "Haiku 5.5 is a strong computer use agent for repetitive tasks like form filling, data entry, and moving information between apps". Card 2, copy: F-146 in full. Card 3, copy: F-155 in full. Headings wrap to at most two lines at 375 px; card 1 is at most 373 px tall (QA).

**2D layer, phone landscape.** The wide placement with cards at the left 35.8% of the viewport width, and the title at the wide top.

**Marker.** The marker of C11 appears over a card, except over the card's heading button, where the native pointer shows.

**3D layer.** Formations: cap-0 (direction-3d 11.4), cap-1 (11.5) and cap-2 (11.6), including its stair offsets of 0, 0.17, 0.34, 0.51 and 0.68 bu for indices 12 to 16. The active group is at z +0.90 with scale 1. Inactive groups are at z −1.40 with scale 0.90 and yaw ±0.35. The camera holds at the hero keyframe after the entry move. A hovered card's group lifts +0.2 bu on z over T.beat5 with settle (direction-3d 10.13). Only the active group breathes, with the breath of C15. Inactive groups hold still (direction-3d 10.12).

**Scroll.** p as in C2. The blends, the stair and the card activation follow p, as in Sequence. The camera is fixed after the entry move. The title and cards scroll with the page.

**Pointer.** Fine pointer only. Hovering a card lifts its group (3D layer). The marker follows the pointer over the card (C11). There is no tilt. Hover does not activate a card.

**Touch.** No custom cursor and no hover lift. A tap on a card runs the timed activation in Sequence. A tap on a graphic does nothing.

**Keyboard.** The three cards are buttons in the tab order, with a roving tabindex: the active card's button has tabindex 0 and the other two have −1. ArrowDown and ArrowRight move to the next card, ArrowUp and ArrowLeft move to the previous card, Home moves to card 1 and End to card 3. Each move is a timed activation (Sequence). Enter and Space activate the focused button. Focus shows the ring of C16 and hides the custom cursor.

**Keep-alive.** The active group breathes (C15). The cap-1 graphic loops while the section is in view (card graphics above). The cap-0 graphic and the stair hold their state when the reader scrolls past them.

**Reduced motion.** No scrub, no blend, no breath, no lift, no marker and no title split. Each card change sets the formation by the canvas switch of C14. Card text changes colour at once. Graphics: cap-0 sits in its final state, with all five fields filled and both bars drawn. cap-1 shows its seven squares in their bins (card graphics above). The stair sits at step 1, Med, which is the default on the Claude API and in Claude Code (F-157).

**No-WebGL fallback.** Each card holds a static front elevation of its formation, which is shown only under html.no-gl and is aria-hidden. It draws 17 squares, each 0.70 bu wide, at the x and y of its formation in direction-3d 11.4 to 11.6, including the stair offsets. The active group is scale 1 and the inactive groups scale 0.90. The active group is filled text-1 (#F1ECE0), the inactive groups are filled rule-hair (#75705F, I20), and the kireji is seal-ink (#E7735F) in every state. Wide: the elevation sits in columns 10 to 17, vertically centred in the card's slot, at 1024 px and up. Narrow: the elevation sits at slot top + 22% of the slot height, full width, with a height of 22% of the slot height.

**Card graphics.** Each card carries one hand-built SVG, drawn in the coordinates below. The graphics are 2D. Their timings are T values, and their curves are named curves of direction.md heading 6.

*cap-0, computer and browser use.* The box is as wide as the card's inner width, up to 400 px, and 0.4 times as tall. viewBox 0 0 400 160.
- Fields: five rectangles, each x 0, width 190 and height 16, at y = 10, 38, 66, 94 and 122. Each has a 1 px outline in rule-hair (I13) and no fill.
- Caret i: a 1 px text-1 line at x 8 from y_c − 5 to y_c + 5, with y_c = 18, 46, 74, 102 and 130.
- Bar i: when field i is filled, a rectangle at x 8, width 96 and height 6, centred on y_c, filled text-2 (#CFC8B9).
- Cursor path: 1 px text-1 line, drawn as four segments from (180, y_c_i) to (180, y_c_{i+1}). Segment i draws with DrawSVG from 0% to 100% over T.half with settle, starting at field i's offset: 0, 0.700, 0.990 and 1.212 s for i = 1 to 4.
- Field fill: fields 1 to 5 fill at weightedStagger(5, { total: 1.40, weight: 'front' }) = 0, 0.700, 0.990, 1.212 and 1.400 s after activation. MorphSVG takes the caret to the bar with cut over T.micro, starting at each field's offset.
- OSWorld dimension line: a 1 px rule-hair line at y 134, from x 210 to x 400, with 1 px ticks from y 130 to y 138 at x 210 and x 400. It is the 0 to 100% scale of the benchmark.
- Bar A, Haiku 5.5: a line from (210, 52) to (347.56, 52), that is 210 + 190 × 0.724, with a 14-unit stroke in text-1 and butt caps. It is the lead, and it draws by DrawSVG from 0% to 100% with cut over T.micro, starting at 1.40 s.
- Bar B, Haiku 4.5: a line from (210, 96) to (239.83, 96), that is 210 + 190 × 0.157, with a 14-unit stroke in text-3 and butt caps. It is the follower, and it draws by DrawSVG from 0% to 100% with settle over T.beat5, starting at 1.40 s + T.micro (1.57 s).
- HTML labels, label style, nowrap. "HAIKU 5.5" at left 52.5% and top 17.5% (text-1). "72.4%" at left 88.4% and top 27.5% (text-1). "HAIKU 4.5" at left 52.5% and top 45% (text-3). "15.7%" at left 61.5% and top 55% (text-3). "0" at left 52.5% and top 87.5%. "100%", right-aligned to 100% of the box width, at top 87.5%.
- Caption, small style, text-3, below the box. copy: "OSWorld 2.1, offline subset, partial-credit score (%)", with the values from F-44, the unit from F-56 and the definition from F-51.
- Timing in total: the fields fill by 1.40 s, the last cursor segment ends at 1.562 s, bar A starts at 1.40 s, and bar B runs from 1.57 s to 2.07 s.

*cap-1, high-volume work.* The graphic is a row. On the left is a label column 136 px wide, with its labels. On the right is the lane drawing, at a width of the card's inner width minus 148 px (136 px plus a 12 px gap). The drawing's viewBox is 0 0 252 160, and its height is its width × 160 ÷ 252.
- Labels, label style, text-2, nowrap, centred on the lane centres: "SUMMARY" at top 16.25%, "CLASSIFICATION" at top 50% and "ROUTING" at top 83.75%. CLASSIFICATION is 121 px at 12 px and 131 px at 13 px, so the 136 px column holds it on one line.
- Belt: a 1 px rule-hair line from (0, 12) to (48, 12). Spine: a 1 px rule-hair line from (48, 12) to (48, 134).
- Lanes at y = 26 (summary), 80 (classification) and 134 (routing). Each lane has a 1 px leader from (48, y) to (64, y), and a bin: a rectangle at x 64, width 188 and height 26, centred on y, with a 1 px rule-hair outline and no fill.
- Items: seven squares, each 14 by 14 units, filled text-2. Item j goes to lane [0, 1, 2, 0, 1, 2, 0][j]. Item j is released at weightedStagger(7, { total: 2.10, weight: 'front' })[j] = 0, 0.857, 1.212, 1.485, 1.715, 1.917 and 2.100 s.
- Motion of an item: stage 1 moves its centre from x −8 to x 48 along y 12 over T.beat7 with settle. Stage 2 moves its centre along the path (48, 12) to (48, y) to (64, y) by arc length over T.beat5 with settle. The item is removed at the bin entrance with no transition. An item lasts T.beat7 + T.beat5. Items are released one at a time, so each is its own timed entrance and takes settle; the lead rule of direction.md heading 8 applies to groups that enter together.
- Loop: the period is 2.100 s + T.beat7 + T.beat5 = 3.30 s, since the last item starts at 2.100 s and lasts T.beat7 + T.beat5. The loop runs while the section is in view and pauses when it leaves. It resumes from its paused time, and it does not restart.
- Reduced motion: no motion. Lane 0 holds three items at x 84, 102 and 120, and lanes 1 and 2 hold two items each, at x 84 and 102. Every item sits on its lane's centre line.

*cap-2, adjustable effort.* The box is as wide as the card's inner width, up to 400 px, and 0.4 times as tall. viewBox 0 0 400 160.
- Five squares, each 26 by 26 units, with centres at x = 40, 120, 200, 280 and 360. Their tops are at y = 122, 100, 78, 56 and 34, so each step rises 22 units.
- Inactive steps: a 1 px rule-hair outline (I13) and no fill. The active step: a seal-ink fill (I21) and no outline. The fill changes at the threshold of the stair rule in Sequence, with no transition, because the stair is scroll-driven.
- Labels, HTML, small style, sentence case, centred under each column. They read "Low", "Med", "High", "Xhigh" and "Max", which are the chart labels of F-60. Each label is text-3 when its step is inactive and text-1 when active. The colour changes at the threshold, with no transition.
- Caption, small style, text-3, below the labels. copy: "Effort levels on the launch charts: Low, Med, High, Xhigh, Max (F-60). Medium is the default on the Claude API and in Claude Code (F-157)."

### code (ink, 2 vh)

Structure. The section is 2 vh tall. One content block of exactly 100 svh sits in the middle of the section, with its top at section top + 0.5 vh, so the block's centre is the section's middle. The block holds the title and the panel. The 0.5 vh above and below the block are empty.

**Leads:** the recede's kireji (stagger position 0 of the recede order, on anticipate) moves first. The live line marker moves with cut over T.micro.

**Sequence:**
- Recede, scrubbed. t = sym(clamp(p ÷ 0.5, 0, 1)). The formation moves from cap-2 (direction-3d 11.6, with its stair) to recede (11.7) over p from 0 to 0.5, and then holds. Positions follow the recede stagger order 4, 0, 1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16 (direction-3d 11.7). Each block's local progress is scrubLocal(j, 17, t, { total: 0.35, lead: 0.10 }), with j its position in that order. The kireji takes anticipate and the other 16 take settle.
- Response colour, scrubbed. q2 = clamp((p − 0.25) ÷ 0.5, 0, 1). Response character j, of J characters in the response, changes from text-3 to its token colour (text-1, seal-ink for keywords, or code-string for strings) when q2 ≥ (j + 1) ÷ J. The change happens at the threshold, with no transition, because the stream is scroll-driven. Only colour changes. No character appears or fades.
- Live line marker. Line index = min(N − 1, floor(q2 × N)), where N is the number of code lines in both blocks together. The marker jumps to the new line with cut over T.micro.
- Code lines do not move (direction.md heading 7, the act rhythm of act II). The request is in its token colours from the first frame.
- Title. copy: "In code" (display-xl, text-1). It reveals as C8 says.

**2D layer, wide (1024 px and up).** The content block is a column: the title, a gap of 31 px, then the panel. The column is centred vertically in the block. The panel ends at 52.3% of the width, before the 55% limit, and sits in columns 1 to 9: 500.5 px at 1024, 703.8 px at 1440 and 938.4 px at 1920. At 768 to 1023 px it also sits in columns 1 to 9. Its box: background var(--bg-raised), a 1 px border in rule-hair (I13), padding 31 px, no border-radius. Its rows, from the top:
- a row with the label "REQUEST" (label style, text-3) on the left and the copy button on the right. The gap below is 19 px.
- the request code block: code style, text-1 (I02). Keywords are seal-ink (I08), strings are code-string (I09), and comments are text-3 (I06). The gap below is 31 px.
- the label "EXAMPLE OUTPUT" (label style, text-3). The gap below is 19 px.
- the response code block: code style. Its characters are text-3 until the response colour stream of Sequence reaches them.

The copy button is body style, sentence case, text-1 (I02), with a 1 px border in rule-strong (I22), no fill and padding 5 px 12 px. It reads "Copy". On activation it reads "Copied" for T.breath, then "Copy" again.

The code blocks use the code style: clamp(13px, 12.485px + 0.1373vw, 16px), line-height 1.6, letter-spacing 0, font-variant-ligatures none, tab-size 2, white-space pre and overflow-x auto. A line never wraps.

Copy. Request: copy: a request whose model value is claude-haiku-5-5 (F-02), at most 6 lines. Response: copy: an example response, at most 6 lines, labelled "EXAMPLE OUTPUT", with no product claim. The two blocks together hold at most 12 lines of at most 52 characters each. At 1024 px the panel holds 52 characters: 438.5 px of inner width divided by 0.600 em at 13.89 px. Above 1024 px lines have room to spare. Below 1024 px the longest line scrolls horizontally inside the panel, as the code style allows.

**2D layer, narrow (phone and portrait).** Title: top at block top + 12%, full width, margin 19 px. Panel: top at block top + 50% (406 px at 812 px), full width with margin 19 px and padding 19 px. QA measures the panel at 375 by 812 and checks that its bottom edge is at most 800 px. The copy button sits in the panel's first row, on the right.

**3D layer.** Formation: recede (direction-3d 11.7). Camera: the hero keyframe (C6), held. Depth of field is on in this section only. The DoF pass is inserted on the bus event section:enter for code and removed on section:leave for code. Focus 21.15 bu, bokeh 2.0 px (direction-3d 10.8). Breath: the 17 blocks breathe with the row phases of C15 once the recede arrives.

**Scroll.** p as in C2. The recede runs over p from 0 to 0.5. The response colour and the live marker run over p from 0.25 to 0.75, while the panel is in view. The panel and its text do not move.

**Pointer.** Fine pointer only. The recede group moves with the pointer: x = sx × 0.2 bu and y = sy × 0.2 bu, damped with T.half (direction-3d 10.13). There is no tilt. The panel uses the native I-beam cursor, with no custom cursor (direction.md heading 9).

**Touch.** No pointer translation. A tap on the copy button runs the copy action of the keyboard.

**Keep-alive.** The recede blocks breathe (C15) while the section is in view. The colour stream and the live marker move with the scroll. They do not run on their own.

**Reduced motion.** The recede is set at section entry by the canvas switch of C14, with depth of field off (the pass is removed). There is no pointer translation and no breath. The response is in its token colours from the start, and the live marker sits on line 1. The title is static. The copy button changes colour at once.

**No-WebGL fallback.** An inline SVG of the recede pose (direction-3d 11.7). It draws 17 squares, each 0.434 bu wide, with a corner radius of 0.0217 bu, at x = 0.62 × stanza x and y = 0.62 × stanza y. Its fill is rule-hair (#75705F) at opacity 0.5. Its viewBox is "-2 -1.2 4 2.4" in bu, with the y axis flipped by scale(1, −1). Wide: the SVG sits in columns 10 to 17, vertically centred in the block. Narrow: the SVG spans the full width, with its top at block top + 22% and a height of 25% of the block. Both are aria-hidden and shown only under html.no-gl.

### family (ink, 2 vh)

Structure. The section is 2 vh tall. One content block of exactly 100 svh sits in the middle of the section, with its top at section top + 0.5 vh. At p = 0.5 the block's top edge is the viewport's top edge, so block coordinates are viewport coordinates at rest. The source notes sit in the 0.5 vh spacer below the block, which keeps them out of the last 0.18 vh of the section (direction.md heading 8, rule 13).

**Leads:** the kireji (position 0 of the family order, on anticipate) moves first. The 16 followers settle in their order.

**Sequence:**
- Formation, scrubbed. t = sym(clamp(p ÷ 0.5, 0, 1)). The formation moves from recede (direction-3d 11.7) to family (11.8) over p from 0 to 0.5, and then holds. Positions follow the family stagger order 4, 3, 2, 1, 0, 8, 7, 9, 6, 10, 5, 11, 14, 13, 15, 12, 16 (direction-3d 11.8), with scrubLocal(j, 17, t, { total: 0.35, lead: 0.10 }). The kireji takes anticipate and the others take settle.
- Camera, scrubbed. The camera moves from the hero keyframe (C6) to the family keyframe over p from 0 to 0.5, with sym. Wide: z and x. Narrow: z, x and y.
- Title. copy: "Family" (display-xl, text-1). It reveals as C8 says.
- Axis, station labels and notes are DOM. They are static at rest and respond only to hover and tap (Pointer and Touch).

**2D layer, wide (768 px and up).**
- Title: columns 1 to 6, top at block top + 12% of 100 svh (108 px at 900 px).
- Axis: a 1 px rule-hair line (I12) at y = block centre + 2.3 bu (up), which is 343.5 px at 1440 by 900. It runs from x = −14 bu to x = +14 bu, which is 5% to 95% of the width. Ticks are 1 px and 12 px tall, centred on the line, at x = −14, −10.5, −3.5, +3.5, +10.5 and +14 bu.
- Latency labels, label style, centred over the four station ticks and set 12 px above the top end of each tick: "SLOWER" at −10.5 bu, "MODERATE" at −3.5 bu, "FAST" at +3.5 bu and "FASTEST" at +10.5 bu. The sibling labels are text-2 (I03) and the Haiku label is text-1 (I01). Copy: F-140.
- Axis title: label style, text-3 (I05), 7 px below the line, left-aligned at x = −14 bu. copy: "Comparative latency" (the row label of F-140).
- Station label blocks (DOM), one per station. Each is 6.4 bu wide, which is 296 px at 1440 and 211 px at 1024. Its left edge is the station x − 3.2 bu, and its top edge is at group y = −1.9 bu (538 px at 1440 by 900). From top to bottom: the model name (heading style); a gap of 7 px; the latency label (label style); a gap of 12 px; the description (small style); a gap of 12 px; the price (label style, tabular by design). Every line in a sibling block is text-2 and every line in the Haiku block is text-1. The names are "Claude Fable 5.1", "Claude Opus 5.5", "Claude Sonnet 5.5" and "Claude Haiku 5.5" (the overview table columns, F-139). The descriptions are copy: F-139, verbatim per model. The prices are copy: F-142, verbatim per model: "$10 / input MTok, $50 / output MTok"; "$4 / input MTok, $20 / output MTok"; "$2 / input MTok, $10 / output MTok"; "From $0.10 / input MTok, From $0.50 / output MTok".
- Source notes, in the spacer 31 px below the block's bottom edge: small style, text-3 (I05), left-aligned at x = −14 bu, width 50% of the viewport. copy: F-38 in full, then F-81 in full (the price tier of the Haiku line).
- Tablet-landscape (768 to 1023): title in columns 1 to 9, source notes in columns 1 to 9, axis from 5% to 95% of the width, station blocks 6.4 bu wide as in the wide rule, scaled by the projection at the family keyframe.

**2D layer, narrow (phone and portrait).**
- Title: top at block top + 7 px, left at 19 px, display-xl with a minimum of 44 px. Axis title: label style, text-3, in the same row, with its right edge at W − 19 px (at 192 px to 356 px on a 375 px screen), which keeps it clear of the title. copy: "Comparative latency".
- Axis: a vertical 1 px rule-hair line at 2.3 bu to the left of the stanza centre. The stanza centre is at 22% of the width (82.6 px at 375 px), so the axis is at 22.5 px at 375 px. It runs from +14 bu to −14 bu (projected). Ticks are horizontal, 12 px long, centred on the axis, at the four stations and at both ends. The axis carries no latency text; each station block carries its own label.
- Station label blocks: left edge at the stanza's right edge (119 px) + 0.5 bu (13 px), which is 132 px, and right edge at W − 19 px (356 px), so each block is 224 px wide. Each is centred vertically on its station: 132 px, 314.7 px, 497.4 px and 680.1 px at 812 px high. The contents and colours are those of the wide blocks.
- Source notes: in the spacer below the block, left at 19 px, width W − 38 px, with the copy of the wide notes.

**3D layer.** Formations: recede to family (direction-3d 11.7 and 11.8). The four stations are at x −10.5, −3.5, +3.5 and +10.5 bu (pitch 7.0 bu). Slower (Claude Fable 5.1), Moderate (Claude Opus 5.5) and Fast (Claude Sonnet 5.5) are phantom outlines. Fastest (Claude Haiku 5.5) is the real stanza, translated to x +10.5 at scale 1. Phantom outlines P1, P2 and P3 (11.8) form one LineSegments object with one LineDashedMaterial: dashSize 0.17 bu, gapSize 0.07 bu, colour #75705F, computeLineDistances once. There is no fill and no shading. Phone: the family group rotates about z by −π/2, so Slower is at the top and Fastest at the bottom. Each real block has rotZ +π/2 and stays upright. The outlines turn with the group. The camera far plane is 120 on phones in this section (decision A3). Camera: C6.

**Scroll.** p as in C2. The formation and the camera move over p from 0 to 0.5. At p = 0.5 the labels, the axis and the blocks line up on screen. Off that rest state the DOM moves with the page while the canvas does not, which is accepted.

**Pointer.** Fine pointer only.
- Hover a sibling label block: its phantom's dash runs while the pointer is over the block. The run is a ping-pong of each vertex's lineDistance offset: it goes from 0 to 0.24 bu (one dash period, 0.17 + 0.07 bu) over T.beat7 with press, then back to 0 over T.beat7 with press, and it repeats while the pointer stays on the block (direction-3d 11.8). On leave the tween stops and the offset holds where it is.
- Hover the Haiku label block: the stanza lifts +0.15 bu on y over T.beat5 with follow (overshoot 1.86%, once per arrival). On leave it returns to 0 with settle over T.beat5.
- The datum cursor of C11 shows over the section, with no block label.

**Touch.** No datum. A tap on a sibling label block starts its run, and a second tap stops it. A tap on the Haiku label block lifts the stanza, and a second tap returns it.

**Keep-alive.** After the formation arrives, each row breathes with the phases of C15: row A at 0, row B at 0.4π and row C at 0.8π. The lift is pointer-driven. The run repeats only while the pointer is on its label.

**Reduced motion.** The family formation and the camera are set at section entry by the canvas switch of C14. There is no scrub, no run (the outlines are static), no lift, no breath, no datum and no title split. The labels, the axis and the notes are visible at their rest positions.

**No-WebGL fallback.** The canvas is removed. The DOM stays: the title, the axis, the four station blocks and the notes. The stanzas are drawn as one inline SVG overlay (aria-hidden, shown only under html.no-gl) whose box is the viewport, redrawn on resize from the projection of the 3D layer. At each station the overlay draws three dashed rounded outlines of 5.92 by 2.80 bu (0.035 bu radius), dashed 0.17 bu and 0.07 bu, in #75705F, and at the Haiku station it draws 17 squares of 0.70 bu with a 0.035 bu radius, filled block-steel (#BDB7A9), with the kireji in seal-ink (#E7735F). On phones the overlay is drawn in the rotated arrangement of the phone group.

### Decisions and deviations in this part (for the director)

- **A1 Progress.** Capabilities, code and family use the centred progress of C2, not the default trigger of draft B section 12. Act I keeps its own rule A3. Each act states its own.
- **A2 Line limit.** The copy limit is 52 characters per code line, not the 60 of the draft B frame for the code panel (draft B section 12). At 1024 px the panel's inner width is 438.5 px and a code character is 8.33 px (0.600 em at 13.89 px), so 60 characters need 500 px and do not fit. 52 is the largest whole number that fits. The limit is stricter than the 60 maximum, so it complies with it. Below 1024 px the longest line scrolls inside the panel, as the code style allows.
- **A3 Far plane on phones, family.** direction-3d 10.6 sets far 80. The family stanza sits at distance 80.03 from the phone camera, so far 80 would clip it. Family on phones uses far 120, as act I does for the phone speed keyframe (direction-act1 A8). Desktop keeps far 80.
- **A4 Phone camera x, family.** direction-3d 10.6 gives no phone x for family. With x 0 the station label blocks would be 119 px wide. With x = +4.02 bu (0.28 × W(z)) the stanza sits at 22% of the width and the blocks are 224 px wide, which fits "Claude Fable 5.1" and its description. The director adds this to the 10.6 table.
- **A6 Keyboard lock.** The lock that holds p while a keyboard activation moves the page ends at the nearest slot or at the reader's next input. It has no timer, which follows direction.md heading 8, rule 18.
- **A7 Source notes.** The family notes sit in the spacer below the 100 svh block. They never overlap a label, and they stay out of the last 0.18 vh of the section, which direction.md heading 8, rule 13 requires.
- **A8 Phone landscape.** Phone landscape (aspect at least 1.0, width below 768 px) uses the wide placement, with its column edges as percentages of the width (C3). This follows direction-act1 A9.
- **A9 Section titles.** "Capabilities", "In code" and "Family" are copy slots. They name the content and make no product claim. The director may replace them.
- **A10 Depth of field.** The code pass is inserted and removed on the bus events section:enter and section:leave for code (architecture section 6). direction-3d 10.8 keeps the pass only in speed and code, so act II adds no pass of its own.
- **A11 Card graphics.** cap-1 uses a label column of 136 px, which holds CLASSIFICATION at 121 px (12 px) and 131 px (13 px). The advance width of Geist Mono is 0.600 em, read from the Geist Mono TTF in the skills folder. perf confirms it on the shipped variable file.
- **A12 Phone card placement.** On narrow viewports the cards start at 52% of their slot. Above that line the cap formation's lowest block ends at 420 px at 812 px, so a card placed higher would cover the 3D.
