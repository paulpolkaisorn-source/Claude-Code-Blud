Art direction B: industrial object (Phase 1 draft)

Owner: art director, draft B. Date: 2026-10-08. Companion script: design/drafts/contrast-B.mjs. Font axes and features were read from the WOFF2 files in the Fontsource 5.3.0 packages (fvar, GSUB, GPOS, cmap and post tables). Every number below is set by this draft or measured as stated.

## 1. Concept

The page is a catalogue plate: one object lit like a product photograph and dimensioned like an engineering drawing. The type is its caption and annotation system, and every number on the page measures the object. The rows are 5, 7 and 5 blocks, the kireji is block 05, and the column stands 4.54 bu tall. Act I is printed paper with the blocks in black anodised metal under one key light. Act II is the same object in ink: the blocks become bare steel and the kireji seal-ink. Act III returns to paper, and the blocks stand as one dimensioned column, read top to bottom. Motion behaves like a machine: cuts, settles and one small follow-through, never bounce. Restraint reads as confidence, because nothing moves that has not been measured.

## 2. References

1. West German product sheets for household and studio equipment, 1960s to 1970s. Take: one object photographed flat on a plain field, with a short caption set on a grid beside it. Avoid: lifestyle scenes, props and slogans.
2. Japanese camera and watch brochures, 1960s to 1970s. Take: the mechanism shot sharp and centred, with hairline rules and specification lines in small capitals. Avoid: chrome reflections and gradient lighting.
3. Orthographic engineering drawings in first-angle projection, drawing offices of the 1960s and 1970s. Take: dimension lines with tick ends, centre lines drawn as dash and dot, and a title block in the bottom right corner. Avoid: blueprint blue, gradient fills and drop shadows on drawings.
4. Swiss exhibition posters, 1950s and 1960s, built on a visible grid and set flush left. Take: the grid as structure, one fact per field. Avoid: decorative shapes that sit outside the grid.
5. Exploded-view service manuals, 1960s and 1970s. Take: numbered callouts on plain leader lines. Avoid: labelling every part; only the seventeen blocks get callouts.
6. Japanese seal stamps (hanko) printed in vermilion. Take: one red mark placed like a signature. Avoid: brush calligraphy and ink-texture filters.
7. Engraved instrument scales and dials, 1950s to 1970s. Take: high-contrast serif figures on a plain ground. Avoid: ornament, engraving effects and tight tracking on running text.

No links. Nothing is copied from any of these; each is a rule of thumb for layout, material or annotation.

## 3. Palette

Hex is the source of truth. The oklch() values are computed from the hex by design/drafts/contrast-B.mjs and rounded to three decimals for lightness and chroma and one decimal for hue. Rules: body text reaches 4.5:1 at every size; large text, UI boundaries, focus indicators and graphics reach 3:1. Only the pairs in the contrast table are used anywhere in the layout, and nothing below its required ratio ships.

CSS mapping: the paper theme is the default on :root, and [data-theme="ink"] overrides the theme pairs. Custom properties: --bg (paper or ink), --bg-raised (paper-deep or ink-raised), --text-1, --text-2, --text-3, --rule-hair, --rule-strong, --seal-text (seal-text-paper or seal-ink), --focus (focus-paper or focus-ink) and --seal (seal on paper, seal-ink on ink). Block colours are 3D values and are not CSS tokens (section 10).

| Token | Hex | oklch() | Role |
|---|---|---|---|
| paper | #F1ECE0 | oklch(0.944 0.017 88.0) | Page ground, Act I and Act III (paper theme) |
| paper-deep | #E4DCCB | oklch(0.896 0.024 85.8) | Second paper tone: plates, pricing panel, table bands |
| ink | #151512 | oklch(0.195 0.006 106.9) | Page ground, Act II (ink theme); paper-theme text-1 |
| ink-raised | #22211D | oklch(0.247 0.008 95.4) | Raised panels on ink: code panel, capability card |
| text-1-paper | #151512 | oklch(0.195 0.006 106.9) | Paper theme: headings, body, numerals |
| text-2-paper | #45413A | oklch(0.377 0.013 81.7) | Paper theme: lede, secondary body |
| text-3-paper | #5E5A51 | oklch(0.469 0.015 86.9) | Paper theme: mono labels, captions, dimension text |
| rule-hair-paper | #7D786A | oklch(0.573 0.022 90.6) | Paper theme: 1px hairlines, dimension lines |
| rule-strong-paper | #3A3831 | oklch(0.340 0.012 93.8) | Paper theme: table rules, input borders, 2px title block rules |
| text-1-ink | #F1ECE0 | oklch(0.944 0.017 88.0) | Ink theme: headings, body, numerals |
| text-2-ink | #CFC8B9 | oklch(0.834 0.022 86.0) | Ink theme: lede, secondary body |
| text-3-ink | #A39D90 | oklch(0.697 0.020 86.2) | Ink theme: mono labels, captions, code comments |
| rule-hair-ink | #75705F | oklch(0.545 0.026 93.5) | Ink theme: 1px hairlines, dimension lines |
| rule-strong-ink | #E4DCCB | oklch(0.896 0.024 85.8) | Ink theme: table rules, input borders, title block rules |
| seal | #B5312A | oklch(0.516 0.170 27.8) | Accent fill (cinnabar seal red) on paper: kireji block, seal mark |
| seal-text-paper | #9A2820 | oklch(0.457 0.151 28.6) | Accent as text on paper: kicker labels, link underline, focus ring on paper |
| seal-ink | #E7735F | oklch(0.686 0.148 31.3) | Accent on ink: kicker labels, kireji block, code keywords, focus ring on ink |
| code-string | #D8C58F | oklch(0.826 0.074 90.9) | Ink theme code strings (ochre) |
| focus-paper | #9A2820 | oklch(0.457 0.151 28.6) | Focus ring, paper theme (2px, 3px offset) |
| focus-ink | #E7735F | oklch(0.686 0.148 31.3) | Focus ring, ink theme (2px, 3px offset) |
| block-anodized | #2B2A26 | oklch(0.285 0.007 95.3) | 3D only: block material base, paper acts |
| block-steel | #BDB7A9 | oklch(0.780 0.021 87.5) | 3D only: block material base, ink act |

| Pair | Text or graphic | Background | Ratio | Needs | Result | Use |
|---|---|---|---|---|---|---|
| P01 | text-1-paper #151512 | paper #F1ECE0 | 15.52:1 | 4.5:1 | PASS | Headings, body on page ground |
| P02 | text-1-paper #151512 | paper-deep #E4DCCB | 13.41:1 | 4.5:1 | PASS | Body on plates and pricing panel |
| P03 | text-2-paper #45413A | paper #F1ECE0 | 8.61:1 | 4.5:1 | PASS | Lede and secondary body |
| P04 | text-2-paper #45413A | paper-deep #E4DCCB | 7.44:1 | 4.5:1 | PASS | Secondary body on panels |
| P05 | text-3-paper #5E5A51 | paper #F1ECE0 | 5.83:1 | 4.5:1 | PASS | Mono labels and captions |
| P06 | text-3-paper #5E5A51 | paper-deep #E4DCCB | 5.04:1 | 4.5:1 | PASS | Mono labels and captions on panels |
| P07 | seal-text-paper #9A2820 | paper #F1ECE0 | 6.60:1 | 4.5:1 | PASS | Kicker labels, link text, pricing emphasis |
| P08 | seal-text-paper #9A2820 | paper-deep #E4DCCB | 5.71:1 | 4.5:1 | PASS | Kicker labels on panels |
| P09 | paper #F1ECE0 | text-1-paper #151512 | 15.52:1 | 4.5:1 | PASS | Primary button: paper label on ink fill |
| P10 | paper #F1ECE0 | seal-text-paper #9A2820 | 6.60:1 | 4.5:1 | PASS | Primary button hover: paper label on seal fill |
| P11 | rule-strong-paper #3A3831 | paper #F1ECE0 | 9.95:1 | 3:1 | PASS | Table rules, input borders |
| P12 | rule-hair-paper #7D786A | paper #F1ECE0 | 3.74:1 | 3:1 | PASS | Dimension lines and 1px hairlines |
| P13 | rule-hair-paper #7D786A | paper-deep #E4DCCB | 3.23:1 | 3:1 | PASS | Dimension lines on panels |
| P14 | focus-paper #9A2820 | paper #F1ECE0 | 6.60:1 | 3:1 | PASS | Focus ring on paper |
| P15 | block-anodized #2B2A26 | paper #F1ECE0 | 12.19:1 | 3:1 | PASS | 3D block material vs page (graphic) |
| P16 | seal #B5312A | paper #F1ECE0 | 5.18:1 | 3:1 | PASS | Kireji block vs page, Act I and III (graphic) |
| I01 | text-1-ink #F1ECE0 | ink #151512 | 15.52:1 | 4.5:1 | PASS | Headings, body on page ground |
| I02 | text-1-ink #F1ECE0 | ink-raised #22211D | 13.67:1 | 4.5:1 | PASS | Code text on code panel |
| I03 | text-2-ink #CFC8B9 | ink #151512 | 10.99:1 | 4.5:1 | PASS | Lede and secondary body |
| I04 | text-2-ink #CFC8B9 | ink-raised #22211D | 9.68:1 | 4.5:1 | PASS | Secondary body on capability card |
| I05 | text-3-ink #A39D90 | ink #151512 | 6.78:1 | 4.5:1 | PASS | Mono labels and captions |
| I06 | text-3-ink #A39D90 | ink-raised #22211D | 5.97:1 | 4.5:1 | PASS | Code comments and labels on panels |
| I07 | seal-ink #E7735F | ink #151512 | 6.11:1 | 4.5:1 | PASS | Kicker labels on page ground |
| I08 | seal-ink #E7735F | ink-raised #22211D | 5.38:1 | 4.5:1 | PASS | Code keywords |
| I09 | code-string #D8C58F | ink-raised #22211D | 9.44:1 | 4.5:1 | PASS | Code strings |
| I10 | ink #151512 | paper #F1ECE0 | 15.52:1 | 4.5:1 | PASS | Primary button label on paper fill (ink theme) |
| I11 | ink #151512 | seal-ink #E7735F | 6.11:1 | 4.5:1 | PASS | Primary button pressed: ink label on seal fill |
| I12 | rule-hair-ink #75705F | ink #151512 | 3.69:1 | 3:1 | PASS | Dimension lines and 1px hairlines |
| I13 | rule-hair-ink #75705F | ink-raised #22211D | 3.25:1 | 3:1 | PASS | Dimension lines on panels |
| I14 | rule-strong-ink #E4DCCB | ink #151512 | 13.41:1 | 3:1 | PASS | Table rules, input borders |
| I15 | focus-ink #E7735F | ink #151512 | 6.11:1 | 3:1 | PASS | Focus ring on ink |
| I16 | focus-ink #E7735F | ink-raised #22211D | 5.38:1 | 3:1 | PASS | Focus ring on ink-raised panels |
| I17 | block-steel #BDB7A9 | ink #151512 | 9.16:1 | 3:1 | PASS | 3D block material vs page (graphic) |
| I18 | seal-ink #E7735F | ink #151512 | 6.11:1 | 3:1 | PASS | Kireji block vs page, Act II (graphic) |

Pairs checked: 34. Failures: 0.

## 4. Typography

Families and why. Two families, both variable, both self-hosted, both OFL 1.1 from Fontsource 5.3.0. Bodoni Moda Variable carries everything set in words: display, headings, lede and body. Its high stroke contrast reads as an engraved scale, which is the material language of the object, and its optical size axis lets one face run from 16 px body to the 232 px hero. Geist Mono Variable carries labels, dimension annotations, counters, table numerals and code. Monospaced figures keep measurements in columns. The two latin files together are 69,388 bytes (46,260 and 23,128), inside the 120 KB font budget. Rejected: Newsreader (its opsz file is 132,000 bytes on its own, so the budget fails with any mono); Bricolage Grotesque (display forms too quirky for precision work); JetBrains Mono (40,404 bytes, contextual alternates on by default); Martian Mono (no U+2032 or U+2033 prime glyphs, and its default width is 112.5).

Axes used. Bodoni Moda Variable: opsz 6 to 96, default 11; wght 400 to 900, default 400. Weight 400 for display, lede, body and small; weight 500 for heading. Optical size is automatic: font-optical-sizing: auto sets opsz to the rendered size in px, clamped to 6 to 96, so body renders at opsz 16 to 19 and the hero at opsz 96. Never set opsz by hand. Geist Mono Variable: wght 100 to 900, default 400. Weight 400 for code and small mono, weight 500 for labels. It has no other axis.

Features and glyphs, verified in the font files. Bodoni Moda: GPOS kern; GSUB liga, pnum, tnum. Default figures are lining (U+0030 maps to the glyph named zero, U+0031 to one). Covered: × (U+00D7), Ø (U+00D8), ± (U+00B1), ° (U+00B0), − (U+2212), en and em dashes, thin space (U+2009), en space (U+2002), no-break space (U+00A0). Not covered: all arrows (U+2190 to U+2193), primes (U+2032, U+2033), diameter sign (U+2300). Geist Mono: GSUB ccmp, dnom, frac, locl, numr; GPOS mark, mkmk; no kern, no ligatures (monospaced). Default figures are lining. Covered: × ± ° − Ø, primes U+2032 and U+2033, up arrow U+2191, down arrow U+2193, no-break space. Not covered: right arrow U+2192, diameter sign U+2300, thin space U+2009, en space U+2002, division slash U+2215.

Consequences: the diameter mark is Ø (U+00D8) in Geist Mono labels, never the diameter sign. Arrows in labels are ↑ or ↓ only. Thin spaces exist in Bodoni only; in Geist Mono use no-break space and letter-spacing. Inch and minute primes are never used, because all dimensions are in bu.

Type scale. Each size is clamp(min, a + b·vw, max), where a is in px and b is in vw, the straight line through (375 px, min) and (2560 px, max). The 375 px and 2560 px endpoints are exact.

| Token | Font | Size | Line-height | Letter-spacing | Weight | opsz | Other |
|---|---|---|---|---|---|---|---|
| display-xxl (hero name) | Bodoni Moda Variable | clamp(56px, calc(25.794px + 8.0549vw), 232px) | 0.92 | -0.02em | 400 | auto | Two lines, forced break after Claude; kinetic tracking (rules below) |
| display-xl (section titles) | Bodoni Moda Variable | clamp(44px, calc(25.465px + 4.9428vw), 152px) | 0.98 | -0.015em | 400 | auto | Maximum 14ch |
| display-l (figures, statements) | Bodoni Moda Variable | clamp(30px, calc(20.046px + 2.6545vw), 88px) | 1.04 | -0.01em | 400 | auto | Lining figures by default |
| heading | Bodoni Moda Variable | clamp(22px, calc(19.941px + 0.5492vw), 34px) | 1.2 | 0 | 500 | auto | Card and row titles |
| lede | Bodoni Moda Variable | clamp(19px, calc(17.455px + 0.4119vw), 28px) | 1.4 | 0 | 400 | auto | Maximum 36ch |
| body | Bodoni Moda Variable | clamp(16px, calc(15.485px + 0.1373vw), 19px) | 1.55 | 0 | 400 | auto | Maximum 62ch |
| small | Bodoni Moda Variable | clamp(14px, calc(13.828px + 0.0458vw), 15px) | 1.5 | 0.01em | 400 | auto | Maximum 60ch |
| label (mono caps) | Geist Mono Variable | clamp(12px, calc(11.828px + 0.0458vw), 13px) | 1.3 | 0.12em | 500 | none (no axis) | Uppercase; never wraps (white-space: nowrap) |
| code | Geist Mono Variable | clamp(13px, calc(12.485px + 0.1373vw), 16px) | 1.6 | 0 | 400 | none (no axis) | Ligatures off; tab-size 2; overflow-x auto, never wraps |

Font-face declarations (perf owner writes them to src/styles/fonts.css; files are copied from the package files folder to public/fonts/):

@font-face { font-family: "Bodoni Moda Variable"; font-style: normal; font-display: swap; font-weight: 400 900; src: url(/fonts/bodoni-moda-latin-opsz-normal.woff2) format("woff2-variations"); unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }

@font-face { font-family: "Geist Mono Variable"; font-style: normal; font-display: swap; font-weight: 100 900; src: url(/fonts/geist-mono-latin-wght-normal.woff2) format("woff2-variations"); unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }

Fallback faces, so the first paint has the right line box: @font-face { font-family: "Bodoni Fallback"; src: local("Georgia"); size-adjust: 100%; ascent-override: 112.5%; descent-override: 40%; line-gap-override: 0%; } and @font-face { font-family: "Geist Mono Fallback"; src: local("Menlo"), local("Consolas"), local("Liberation Mono"); size-adjust: 100%; ascent-override: 100.5%; descent-override: 29.5%; line-gap-override: 0%; }. The two font-family stacks are "Bodoni Moda Variable", "Bodoni Fallback", serif and "Geist Mono Variable", "Geist Mono Fallback", monospace. Both woff2 files are preloaded in index.html with rel="preload", as="font", type="font/woff2" and crossorigin. Advance widths are not matched (size-adjust stays at 100%); the h1 has a forced line break, so a font swap changes widths but never the line count or the block height.

Rules.

Kerning and features: Bodoni text uses font-kerning: normal and font-feature-settings: "kern" 1, "liga" 1 (both are on by default; set explicitly). No dlig, smcp or stylistic sets. Geist Mono text uses font-variant-ligatures: none and font-kerning: none.

Optical sizing: :root sets font-optical-sizing: auto. Sizes above 96 px render at opsz 96, the axis maximum. Nothing else sets opsz.

Hanging punctuation: body and lede use hanging-punctuation: first last, which works in Safari only. Chromium and Firefox fallback: an opening quote or opening single quote that starts a line is wrapped in span.hang with margin-inline-start: -0.4em. The value is the design value; QA checks the alignment in the 1440 px and 375 px screenshots.

Widows in headlines: display-xxl, display-xl, display-l and heading use text-wrap: balance. Body and lede use text-wrap: pretty. No-break spaces are set in the markup: "5&nbsp;blocks", "7&nbsp;blocks", "17&nbsp;blocks", "block&nbsp;05", "Haiku&nbsp;5.5" and "Claude&nbsp;Haiku&nbsp;5.5" in the title block. The hero h1 is "Claude<br>Haiku&nbsp;5.5".

Numerals: lining figures in both families. Bodoni prose and display use the proportional default. Bodoni tabular figures (font-variant-numeric: tabular-nums, the tnum feature) are used only in the pricing table and the title block date. Geist Mono carries every dimension label, counter and the preloader percentage, which are tabular by design.

Maximum line length: body 62ch, small 60ch, lede 36ch, display-xl 14ch. Labels never wrap.

Kinetic type: type is never hidden before it moves. Display-xxl and display-xl settle letter-spacing from +0.02em to the token value over T.beat with the settle curve, so the hero is legible in its first frame. Body, lede, heading and label settle colour from text-3 to their token colour over T.beat with settle. text-3 holds 4.5:1 on both grounds in both themes (pairs P05, P06, I05, I06), so the move never drops below the text contrast rule.

## 5. Grid and spacing

Breakpoints.

| Viewport | Columns | Margin | Gutter | Text placement |
|---|---|---|---|---|
| 375 px to 767 px | 1 | 19px | 12px | One column, full width |
| 768 px to 1023 px | 17 | 31px | 7px | 17-column track; all text spans columns 1 to 17 |
| 1024 px and wider | 17 | clamp(31px, 3.4722vw, 81px) | clamp(7px, 0.8333vw, 19px) | Groups of 5, 7 and 5: columns 1 to 5, 6 to 12, 13 to 17 |

Below 768 px the 17-column track is not used for text: one column, text full width, and the 3D is placed by the section rules in section 12. From 768 px to 1023 px the track stays at 17 with 7px gutters so block placement still aligns; text spans the whole track. From 1024 px the 5, 7, 5 grouping is used for text placement.

Derived values at 1440 px: margin 50px (3.4722vw × 1440), gutter 12px, content width 1340px, column 67.53px ((1340 − 16 × 12) ÷ 17). Group widths: 5 columns 385.6px, 7 columns 544.7px, 5 columns 385.6px. The gap between groups is the standard 12px gutter.

Derived values at 2560 px: margin 81px (cap), gutter 19px (cap), content width 2398px, column 123.18px, group widths 691.9px, 976.3px and 691.9px.

Content maximum: .wrap { max-inline-size: 2560px; margin-inline: auto; padding-inline: var(--margin); box-sizing: border-box; }. Above 2560 px the wrap stays 2560px wide and centred, and the margin stays at 81px. The grid is grid-template-columns: repeat(17, minmax(0, 1fr)) with column-gap: var(--gutter).

Spacing scale: seeded with 5 and 7, each token is the sum of the two before it: 5, 7, 12, 19, 31, 50, 81, 131, 212.

| Token | Value | Use |
|---|---|---|
| --sp-1 | 5px | Hairline offsets, tick lengths |
| --sp-2 | 7px | Label to value gap, small gutters at tablet |
| --sp-3 | 12px | Phone gutter, cursor offsets |
| --sp-4 | 19px | Phone margin |
| --sp-5 | 31px | Tablet margin, panel padding |
| --sp-6 | 50px | Desktop margin at 1440 px, phone section padding |
| --sp-7 | 81px | Maximum margin; tablet section padding |
| --sp-8 | 131px | Desktop section padding |
| --sp-9 | 212px | Largest vertical gap between text blocks |

Section padding-block: 131px (sp-8) from 1024 px, 81px (sp-7) from 768 px to 1023 px, 50px (sp-6) below 768 px.

## 6. Easing library

Seven curves. Each is registered in src/core/ease.ts with CustomEase.create(name, path); the same bezier is solved for the GL side (ef). CSS uses the cubic-bezier form. Measured values are read from the bezier: the fraction of duration at which progress reaches a given value.

| Name | cubic-bezier | GSAP CustomEase path | Character | Used for | Never used for |
|---|---|---|---|---|---|
| cut | cubic-bezier(0.16, 0.84, 0, 1) | M0,0 C0.16,0.84 0,1 1,1 | Fast out, decisive stop. 90% of progress at 28% of duration; 99% at 66%. Almost no tail. | Kireji entrance in every act; ruler snap; capability mark fill; kireji handoff | Text; long travel; anything that must read as settled |
| press | cubic-bezier(0.1, 0.5, 0.2, 1) | M0,0 C0.1,0.5 0.2,1 1,1 | Quick response with a soft landing. 50% at 13% of duration; 90% at 49%. | Hover and press states; colour changes; progress fill smoothing; pressed translate | Anything longer than T.beat; scroll-linked motion |
| settle | cubic-bezier(0.3, 0.6, 0.1, 1) | M0,0 C0.3,0.6 0.1,1 1,1 | Long settle. 90% at 45% of duration; 99% at 78%. The tail is the point. | Follower blocks; colour settle of type; DrawSVG of rules; display tracking settle | Kireji; hover responses; scroll-scrubbed motion |
| wind | cubic-bezier(0.5, -0.3, 0.2, 1) | M0,0 C0.5,-0.3 0.2,1 1,1 | Anticipation. Dips to -0.045 (4.5% of travel backwards) at 13% of duration, then runs to 1. | Kireji at the start of the race only, scrubbed | Any ending; any text; any repeated motion |
| follow | cubic-bezier(0.3, 0.1, 0.3, 1.2) | M0,0 C0.3,0.1 0.3,1.2 1,1 | Follow-through. One overshoot to 1.0242 (2.42%) at 84% of duration, then it lands. No second swing. | Block arrival at the end of a keyboard formation change, once per arrival | Text; colour; any loop; any element overshooting more than 3% |
| scrub | cubic-bezier(0.7, 0, 0.3, 1) | M0,0 C0.7,0 0.3,1 1,1 | Symmetric in-out, point-symmetric about (0.5, 0.5). Equal acceleration and deceleration. | Scroll-scrubbed camera moves; formation blends; ink-bleed front | Time-based entrances; hover; text |
| fade | cubic-bezier(0.4, 0, 0.1, 1) | M0,0 C0.4,0 0.1,1 1,1 | Opacity-only crossfade. 50% at 31% of duration. | Canvas crossfades (reduced motion, no-WebGL); preloader squares to blocks | Any transform; any text (text never fades, section 8) |

Only follow and wind leave the 0 to 1 range, and only by the stated amounts (-0.045 and 1.0242).

## 7. Timing scale

Base unit: 0.01 s. Every duration is N × 0.01 s, where N is a product of 5, 7, 17 and 10.

| Token | Seconds | Built from | Used for |
|---|---|---|---|
| T.tick | 0.05 | 5 | Press feedback; progress fill smoothing; pressed translate |
| T.flick | 0.07 | 7 | Cursor label change; link colour change |
| T.micro | 0.17 | 17 | Hover and press responses; kireji entrance; ruler snap; capability mark fill; kireji handoff |
| T.half | 0.35 | 5 × 7 | Act I block entrance; canvas crossfade; reduced-motion section switch |
| T.beat | 0.5 | 5 × 10 | Act II block entrance; colour settle of type; DrawSVG of rules; display tracking settle |
| T.stride | 0.7 | 7 × 10 | Act III block entrance; keyboard formation change |
| T.hold | 0.85 | 5 × 17 | Delay before the idle breath starts (blocks settle first) |
| T.settle | 1.19 | 7 × 17 | Footer title block rule draw (DrawSVG); the longest single move on the page |
| T.breath | 1.7 | 17 × 10 | Idle loop period; tap label display time |
| SU | 0.005 | 5 ms | Stagger unit, the gap unit of the haiku pattern |

Stagger rule: the haiku pattern. Items that enter together are grouped as the haiku is: a line of 5, a line of 7, a line of 5. Within a line the gap is the line's count in SU (5 SU for a line of 5, 7 SU for a line of 7). Between lines the gap is 17 SU (0.085 s). Offsets are cumulative from the first item and are assigned in the sequence order given in section 11, position 0 first.

Worked example, 5 items (one line): offsets [0, 0.025, 0.050, 0.075, 0.100] s.

Worked example, 7 items (one line): offsets [0, 0.035, 0.070, 0.105, 0.140, 0.175, 0.210] s.

Worked example, 17 items (three lines, in stanza order): offsets [0, 0.025, 0.050, 0.075, 0.100, 0.185, 0.220, 0.255, 0.290, 0.325, 0.360, 0.395, 0.480, 0.505, 0.530, 0.555, 0.580] s. The span is 0.580 s, which is (4 × 5 + 17 + 6 × 7 + 17 + 4 × 5) SU = 116 SU × 0.005 s.

Overlap: the overlap of an item with its predecessor is (D − gap) ÷ D, where D is the item's duration and gap is the offset between their starts.

| Act | D | Overlap, gap 0.025 (line of 5) | Overlap, gap 0.035 (line of 7) | Overlap, gap 0.085 (between lines) |
|---|---|---|---|---|
| I (paper) | 0.35 | 92.9% | 90.0% | 75.7% |
| II (ink) | 0.50 | 95.0% | 93.0% | 83.0% |
| III (paper) | 0.70 | 96.4% | 95.0% | 87.9% |

Rhythm per act. The scroll lengths are 5, 7 and 5 viewport heights, the same counts as the haiku.

Act I (5 vh, paper) is quick. Block entrances last 0.35 s, the kireji 0.17 s, type colour settles in 0.5 s. The race runs on a 3 vh scrub, so the speed lives in the scroll, not in the clock.

Act II (7 vh, ink) is the middle tempo. Block entrances last 0.5 s. Capability changes made from the keyboard take T.stride (0.7 s). The code block itself is still; the recede formation is scrubbed.

Act III (5 vh, paper) is slow. Block entrances last 0.7 s, the column writes over a 2.5 vh scrub, and the footer rules take T.settle (1.19 s).

Interface note: weightedStagger in src/core/timing.ts needs a fourth weight value, 'haiku', that returns the pattern above. See section 15.

## 8. Motion principles

1. The kireji is block index 4 (block 05). In every formation change it starts at offset 0, uses cut for T.micro (0.17 s) and is the first block to land. Exception: the column, where blocks write top to bottom and the kireji takes its own slot in that order, moving on scrub.
2. Followers enter with settle over the act's D (0.35, 0.5 or 0.7 s), each starting at its haiku offset. No follower starts before the kireji.
3. Text is never hidden by an entrance. Display text settles letter-spacing; other text settles colour from text-3 to its token colour. There are no masks, clips or fades on text.
4. Text does not translate. Hover states on text change colour or the underline only.
5. Time-based block travel is at most 1.0 bu per move. Longer travel happens only in scroll-scrubbed motion, or in keyboard-driven changes lasting T.stride (0.7 s).
6. Any list that enters together uses the haiku pattern, so it has at least two gap sizes: the line gap and the 17 SU break. A single uniform gap is not used.
7. Nothing ends in a bounce. The only overshoot is follow (2.42%), once per block arrival.
8. Every section keeps one motion running after its entrance: the idle breath (T.breath loop, amplitude 0.012 bu, phase 0 for row A, 0.4π for row B, 0.8π for row C) or, on desktop, the pointer response. A section is still only when reduced motion is on.
9. Scroll-linked motion uses scrub. ScrollTrigger scrub is 0.7 for camera and formation and 0.17 for per-block local progress.
10. Formation rotations are about the vertical axis only (yaw), and occur only in the capability formations (±0.35 rad on inactive groups). Pointer tilt rotates the whole formation group up to 0.035 rad about x and y and is the only other rotation.
11. Hover and press responses finish within T.micro (0.17 s). Focus rings appear in 0 s.
12. Reduced motion sets every state at once. Canvas and section switches use fade over T.half. No scrub, no breath, no tilt, no custom cursor.

## 9. Cursor per section

The custom cursor is a DOM element with z-index 50 and pointer-events none. It is shown only with a fine pointer and without reduced motion. Touch and reduced motion use the native cursor.

Preloader: no custom cursor. Native.

Hero: the datum. Two 1px hairlines, each 12px long, starting 5px from the centre, in text-1 of the theme, crossing at the pointer. Over a block (a 3D raycast hit), the datum is replaced by the block's two-digit label (index plus one, label style), placed 12px right and 12px below the pointer. Why: the hero is a measuring point, and the label names the block being measured.

Speed: the caliper. A 12px vertical tick at the pointer's x, and a 1px dimension line from the left edge of block 01 to the pointer's x, with the label "x.xx bu" (two decimals, the distance from the left edge of block 01). Why: the race is a measured distance, and the caliper reads it.

Capabilities: the marker. Over a capability card the cursor is a 7px square in seal-ink, and that card's block group lifts 0.2 bu toward the camera (settle over T.beat). Why: a block marks the capability it belongs to.

Code: native I-beam over the code block, so selection and copying stay exact. The copy button uses the native pointer. Why: code is selected, not pointed at.

Family: native pointer. Hovering a family row lifts its block row 0.3 bu (settle over T.beat). Why: the row responds without a cursor of its own.

Pricing: native pointer. Why: plans are read, not pointed at.

Closing: the ruler. A 12px horizontal tick snaps to the nearest of the 17 block centres in the column (press over T.tick), labelled with the snapped block's two-digit number. Why: the column is a scale, and the ruler reads it.

Footer: native pointer. Why: the footer is a title block.

Touch: no custom cursor. A tap on a block shows its two-digit label for T.breath (1.7 s), fading in and out over T.half. Scrolling is native; Lenis is off on touch.

Keyboard: custom cursors are hidden, and focus rings are shown. In the capabilities section, ArrowDown and ArrowRight move to the next card, ArrowUp and ArrowLeft to the previous card, Home to the first and End to the last; the card activates at once and its formation changes over T.stride (0.7 s). Enter and Space activate buttons. In the code section, Tab reaches the code block (tabindex 0) and then the copy button.

## 10. 3D direction

Units. One bu (block unit) is one scene unit. Axes: x right, y up, z toward the camera. The origin is the centre of row B in the stanza.

Block. RoundedBoxGeometry (three/addons/geometries/RoundedBoxGeometry.js), 0.70 bu wide, 0.70 bu high and 0.46 bu deep. Corner radius 0.035 bu, 3 segments per corner. All 17 blocks share one geometry. The depth is 66% of the height, so each block reads as a machined block and not a cube. Gap between blocks in a row: 0.17 bu (in-row pitch 0.87 bu). Gap between rows: 0.35 bu (row-to-row pitch 1.05 bu). One InstancedMesh holds all 17 blocks, so the blocks are one draw call.

Material. One MeshPhysicalMaterial with color #FFFFFF. The finish is carried per instance through InstancedMesh.setColorAt. Paper acts (I and III): blocks #2B2A26, metalness 0.35, roughness 0.42, clearcoat 0.25, clearcoatRoughness 0.2, anisotropy 0.5 with anisotropyRotation 0, so the anodised lathe marks run along x. Ink act (II): blocks #BDB7A9, metalness 0.85, roughness 0.28, clearcoat 0, anisotropy 0.5. Micro-surface: a canvas of 512 by 512 px drawn at boot with 1px horizontal lines, each line's brightness set to 0.85 + 0.15 × r, where r comes from a seeded generator with seed 17. The canvas is used as roughnessMap and as bumpMap with bump scale 0.6. No image assets are loaded.

Kireji. Index 4, block 05, the last block of the first line. It is the cutting word: the eye stops there and the line is cut. Its colour is #B5312A in the paper acts and #E7735F in the ink act (per instance). Its material is otherwise the same as the others.

Lighting rig.
Key: DirectionalLight, colour #FFF4E2, intensity 2.4 in the paper acts and 1.7 in the ink act, position (-6, 9, 12), target (0, 0, 0). Shadows on: map 2048 by 2048; shadow camera left -8, right 8, top 8, bottom -8, near 1, far 40; bias -0.0004; normalBias 0.02; PCFSoftShadowMap.
Rim: SpotLight, colour #F4EEDF, intensity 36 (candela), position (7, 5, -5), target (0, 0, 0), angle 0.45 rad, penumbra 0.8, decay 2, no shadow.
Fill: HemisphereLight, sky #F4EEDF, ground #151512, intensity 0.35.
Shadow catcher: a ShadowMaterial plane, 24 by 16 bu, at z -0.9 and not writing depth; opacity 0.14 in the paper acts and 0.5 in the ink act.

Environment, no asset files. RoomEnvironment (three/addons/environments/RoomEnvironment.js) is rendered once at boot through PMREMGenerator.fromScene(room, 0.04) and assigned to scene.environment. scene.environmentIntensity is 0.55 in the paper acts and 0.3 in the ink act; the ink-bleed progress (below) lerps it between the two.

Camera. PerspectiveCamera, fov 22 (vertical), near 0.5, far 80. Visible width at distance z: W(z) = 2 × z × tan(11°) × aspect, with tan(11°) = 0.19438 and aspect = canvas width ÷ canvas height.

Desktop (aspect 1.0 or wider): camera z = 5.92 ÷ (0.45 × 2 × tan(11°) × aspect). This is 21.15 at 1440 by 900. Desktop x offset, for hero, capabilities, code, family, closing and footer: camera x = -0.22 × W(z); at 1440 by 900 that is -2.89 bu. Camera y is 0.

Desktop keyframes for the other sections: speed fits 15.9 bu with f = 0.8, z = 15.9 ÷ (0.8 × 2 × tan(11°) × aspect), which is 31.95 at 1440 by 900, and camera x = 0. Pricing fits 8.74 bu with f = 0.7, z = 8.74 ÷ (0.7 × 2 × tan(11°) × aspect), which is 20.07 at 1440 by 900, and camera x = 0. Closing and footer fit the 4.54 bu column to 80% of the viewport height: z = 4.54 ÷ (0.8 × 2 × tan(11°)) = 14.60 at any aspect, with the desktop x offset, which is -2.00 bu at 1440 by 900.

Phone (aspect below 1.0): camera z = 5.92 ÷ (0.84 × 2 × tan(11°) × aspect), which is 39.25 at 375 by 812. Camera x = 0 everywhere. Camera y = -1.1 bu for hero, capabilities, code, family, closing and footer, placing the formation in the upper half of the screen; camera y = 0 for speed and pricing.

Camera target is (camera x, camera y, 0). Camera moves between sections are scrubbed (section 12). The hero keyframe, used by hero, capabilities, code and family, is z 21.15 and x -2.89 at 1440 by 900.

Background. A fullscreen quad in the scene, depthTest off, renderOrder -1. Paper acts: base #F1ECE0. Fibre: fBm with 4 octaves, lacunarity 2.03, gain 0.5, stretched 8:1 along 12 degrees, base frequency one cycle per 160 CSS px, amplitude ±0.018 in sRGB units around the base. Ink act: base #151512, fibre amplitude ±0.010, same frequency and stretch. Vignette: strength 0.06 on paper and 0.10 on ink, applied as smoothstep from radius 0.55 to 1.25 in normalised, aspect-corrected screen space. Dither: triangular noise of ±1/255 added after tone, to stop banding in the vignette.

Ink-bleed. At each act boundary (speed to capabilities; family to pricing) the ground changes along an irregular front. The front height is y_front(x) = y_b + 0.06 × fbm3(2.2x + 0.4t), in viewport-height units, with fbm3 a 3-octave noise and t the page time in seconds. y_b moves from 1.12 (below the viewport) to -0.12 (above it) as progress p goes from 0 to 1, so the ink rises from the bottom edge as the reader scrolls down. Edge softness is 0.012 viewport heights. A rim band 0.010 viewport heights wide takes the mid colour (ink-raised over ink, paper-deep over paper), so the bleed reads as spreading ink. Timing: p = clamp((scrollY - (B - vh)) ÷ vh, 0, 1), where B is the page y of the top of the boundary section and vh is the viewport height; p = 0.5 when the section top reaches the middle of the viewport. p is eased with scrub and smoothed over 0.7 s. The section's data-theme takes effect at p = 0.5, so text colours switch at that moment with no blend. Blocks change material colour and environment intensity with the same p.

Post-processing (one merged EffectPass where possible).
Bloom: luminance threshold 0.96, smoothing 0.02, intensity 0.12, radius 0.2, mipmap blur on. Only specular highlights above 0.96 luminance bloom; the seal and steel blocks do not bloom. No coloured glow.
Chromatic aberration: offset 0 px at rest, with the pass off below 40 px/s of scroll velocity; 0.8 px at 3000 px/s of scroll velocity or more; linear between. Offset converted to UV as px ÷ drawing-buffer width.
Grain: amplitude 0.028 in the paper acts and 0.040 in the ink act; a new seed each frame; applied to the full frame, background included.
Depth of field: on only in speed (focus distance 31.95 bu, normalised (31.95 - 0.5) ÷ 79.5 = 0.396; bokeh scale 1.2 px) and code (focus distance 21.15 bu, normalised 0.260; bokeh scale 2.0 px). Off everywhere else.

Quality tiers. Tier starts: low DPR cap 1.5, mid 1.75, high 2.0. The watchdog steps down when the median frame over 60 frames exceeds 18.5 ms, with 3 s hysteresis, in this order: 1) depth of field off; 2) bloom off; 3) DPR cap 1.5 to 1.25; 4) shadow map 2048 to 1024.

## 11. Formations

Coordinates. Each formation is a set of rows. A row is given by its index range, y, z, scale s, pitch p and yaw. Block size is 0.70 × s. For a row of n blocks, the k-th block (k from 0) sits at x = (k − (n − 1) ÷ 2) × p, centred on x = 0. Unless stated, yaw is 0. The stagger order lists the sequence in which the 17 haiku offsets of section 7 are assigned, position 0 first.

stanza. The rest state: the seventeen blocks as three lines of 5, 7 and 5. Row A, indices 0 to 4: y +1.05, z 0, s 1.00, p 0.87. Row B, indices 5 to 11: y 0.00, z 0, s 1.00, p 0.87. Row C, indices 12 to 16: y -1.05, z 0, s 1.00, p 0.87. Stagger order: 4, 3, 2, 1, 0, then 8, 7, 9, 6, 10, 5, 11, then 14, 13, 15, 12, 16. Each line starts at the kireji or at its centre and moves outward.

race. The speed state: the same seventeen blocks on one line in index order. Index k at x = (k - 8) × 0.95, y 0, z 0, s 1.00, p 0.95, yaw 0. Stagger order: 4, 3, 2, 1, 0, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5. The kireji leads, and the run then starts from the far end of the line (index 16).

cap-0. Capability 1 is in front: indices 0 to 4 form the front line. Active row, indices 0 to 4: y 0.00, z +0.90, s 1.00, p 0.87, yaw 0. Indices 5 to 11 (seven blocks): y +1.05, z -1.40, s 0.90, p 0.783, yaw +0.35. Indices 12 to 16 (five blocks): y -1.05, z -1.40, s 0.90, p 0.783, yaw -0.35. Stagger order: 4, 3, 2, 1, 0 (active, kireji first), then 5 to 11, then 12 to 16.

cap-1. Capability 2 is in front: indices 5 to 11 form the front line. Active row, indices 5 to 11: y 0.00, z +0.90, s 1.00, p 0.87, yaw 0. Indices 0 to 4: y +1.05, z -1.40, s 0.90, p 0.783, yaw +0.35. Indices 12 to 16: y -1.05, z -1.40, s 0.90, p 0.783, yaw -0.35. Stagger order: 4 (the kireji leads from its inactive row), then 5 to 11, then 0 to 3, then 12 to 16.

cap-2. Capability 3 is in front: indices 12 to 16 form the front line. Active row, indices 12 to 16: y 0.00, z +0.90, s 1.00, p 0.87, yaw 0. Indices 0 to 4: y +1.05, z -1.40, s 0.90, p 0.783, yaw +0.35. Indices 5 to 11: y -1.05, z -1.40, s 0.90, p 0.783, yaw -0.35. Stagger order: 4, then 12 to 16, then 0 to 3, then 5 to 11.

recede. The blocks step back behind the code panel and keep the stanza's three lines at 62% of their stanza positions. Every block: x = 0.62 × stanza x (pitch 0.539), y = 0.62 × stanza y (row A +0.651, row B 0.000, row C -0.651), z -4.00, s 0.62, yaw 0. Stagger order: 4, then 0 to 3, then 5 to 11, then 12 to 16, each in left-to-right order.

family. Three members, one line each, at three depths and sizes. Row A, indices 0 to 4: y +0.735, z -1.20, s 0.70, p 0.609. Row B, indices 5 to 11: y 0.000, z 0.00, s 1.00, p 0.870. Row C, indices 12 to 16: y -1.155, z +0.80, s 1.10, p 0.957. Stagger order: 4, then 0 to 3, then 12 to 16, then 5 to 11.

rest. All seventeen on one low line, the surface the pricing section sits above. Index k at x = (k - 8) × 0.52, y -1.45, z 0, s 0.60 (block size 0.42 bu), p 0.52, yaw 0. Stagger order: 4, then 0 to 3, then 5 to 16.

column. The closing: one vertical column, read top to bottom, the haiku's one line. Index k at x 0, y = (8 - k) × 0.27 (top block at +2.16, bottom block at -2.16), z 0, s 0.314 (block size 0.22 bu), yaw 0. Column height is 4.54 bu: 16 × 0.27 + 0.22. Write order: 0 to 16. The kireji keeps its own slot in that order (section 8, rule 1).

## 12. Section choreography

Trigger rule: a text or annotation entrance starts when its element's top crosses 80% of the viewport height, unless the section says otherwise. Scroll progress p for a section runs from 0 when the section top reaches the viewport bottom to 1 when the section bottom leaves the viewport top, unless the section says otherwise.

preloader (act I, from page load until loader:done)

Leads: the kireji square.

Layout: seventeen block footprints drawn as 1px outlines in rule-hair-paper, at the screen rectangles where the blocks will stand. The rectangles are computed at boot from the same camera as the GL scene, so the outlines and the blocks coincide. A 1px rule-hair-paper line runs through each row centre, from the first to the last square of that row.

Progress: real loader progress p in [0, 1], a weighted sum: fonts 2, GL chunk 5, shader compile 2, environment map 1. The squares fill solid text-1-paper in stanza order, kireji first; the kireji fills seal-text-paper. Fill transition press over T.tick. Square k fills when p reaches (position + 1) ÷ 17, where position is its place in stanza order.

Readout: "LOADING" and the integer percentage, Geist Mono label style, placed under row C. The percentage is the real progress.

Appearance: the squares fade in with fade over T.half, each at its haiku offset (0.000 to 0.580 s).

Handoff at loader:done: each square fades out over T.half (fade) while its block scales from 0 to 1 at the same offset: the kireji with cut over T.micro, the followers with settle over T.half. The readout fades out over T.half. The hero h1 is HTML and is visible throughout.

Timing: the target for loader:done is under 1.5 s on a good connection (QA profile: 20 Mbit/s, 40 ms round trip, cold cache). The preloader never delays or hides the h1.

Reduced motion: squares fill without transition; blocks appear at once, crossfaded with fade over T.half.

No-WebGL: squares fill as above. On loader:done, which resolves on failure too, the outlines are replaced by the no-WebGL stanza SVG (section 12, hero) with fade over T.half.

hero (act I, scroll length 2 vh)

Leads: the kireji block and the display type.

Sequence, starting at handoff end: display-xxl letter-spacing settles from +0.02em to -0.02em over T.beat with settle. The dimension lines (1px rule-hair-paper) draw by DrawSVG over T.beat with settle, starting at 0.35 s. The lede and labels settle colour from text-3-paper to their token colour over T.beat with settle, starting at 0.5 s. The primary button is drawn at its token colour from the first frame; it is a control. The idle breath starts at T.hold (0.85 s).

2D layer: h1 in display-xxl on desktop, columns 1 to 8. The lede (copy from research/facts.md). One primary button (style in section 13). Dimension annotation: labels "05", "07" and "05" in label style at the right end of rows A, B and C; a 1px dimension line under row C, with the label "17" at its midpoint.

3D: stanza formation; hero camera keyframe; shadow catcher on.

Scroll: across the hero's 2 vh the stanza opens from pitch 0.87 to 0.95 and from row offset 1.05 to 1.13, scrubbed (scrub 0.7). Camera holds.

Pointer (desktop): the formation group tilts by rotation x = -pointer.sy × 0.035 rad and rotation y = pointer.sx × 0.035 rad, damped with a 0.17 s time constant. Touch: no tilt.

After the entrance: breath amplitude 0.012 bu, phases per row as in section 8.

Reduced motion: formation set at once; h1 at its final letter-spacing; dimension lines drawn; no breath; no tilt.

No-WebGL: an inline SVG in div.gl-fallback (aria-hidden="true"), showing seventeen rounded squares (corner radius 5% of side) in the stanza arrangement, fill #2B2A26 with the kireji #B5312A, with the dimension lines and labels drawn in Geist Mono. Static.

speed (act I, scroll length 3 vh)

Leads: the kireji, which pulls back before it runs.

Sequence, scrubbed with section progress p: per-block local progress q_i = clamp((p - 0.2 × o_i ÷ 0.58) ÷ 0.8, 0, 1), where o_i is the block's haiku offset in the race order (section 11). Blocks move from stanza to race pose with scrub. The kireji uses wind on q instead, so it pulls back 4.5% of its travel and then runs.

Camera: z from 21.15 to 31.95 and x from -2.89 to 0, scrubbed.

2D layer: the figure slot in display-l, placed above the race at the left margin, with its figure and source line from research/facts.md. A dimension line under the race, drawn by DrawSVG with progress p, from the left edge of block 01 to the right edge of block 17, with a tick at each block pitch and the label "17" in label style.

3D: race formation; depth of field on.

Pointer and touch: the caliper cursor (section 9). Hovering a block lifts it 0.15 bu (settle over T.beat). Touch: a tap lifts the block the same way.

After the entrance: breath amplitude 0.012 bu, phase 0.

Reduced motion: race formation set on section entry with fade over T.half; dimension line at full length; depth of field off.

No-WebGL: an inline SVG with seventeen squares on one line, the kireji in #B5312A, and the dimension line with its label.

capabilities (act II, scroll length 3 vh)

Leads: the active card's mark, then the active group, kireji first.

Sequence: card 1 is cap-0 (blocks 0 to 4), card 2 is cap-1 (blocks 5 to 11), card 3 is cap-2 (blocks 12 to 16). Card k is active while p is in its third: 0 to 1/3, 1/3 to 2/3, and 2/3 to 1. On activation the mark fills with cut over T.micro; the card's heading and body settle colour from text-3-ink to text-1-ink and text-2-ink over T.beat; the other cards settle to text-3-ink with press over T.micro. Formation blends between thirds run with scrub across a band of 0.1 of p around each boundary, using the cap order in section 11.

Keyboard activation tweens the formation over T.stride (0.7 s) with settle for followers; the arriving front group's blocks use follow for their last move, once per arrival.

Camera: fixed at the hero keyframe (z 21.15, x -2.89).

2D layer: three cards stacked in columns 1 to 6 on desktop. Each card has a 7px mark in seal-ink, a heading (heading style), a body paragraph (body style, copy from research/facts.md) and a 1px rule-hair-ink border; the active card's border is rule-strong-ink.

3D: capability formations; active group at z +0.90, inactive groups yawed.

Pointer and touch: hovering a card lifts its group 0.2 bu (settle over T.beat). A tap on a card activates it, the same as the keyboard.

After the entrance: breath amplitude 0.012 bu on the active group; inactive groups hold still.

Reduced motion: formation set on activation with fade over T.half; no blends.

No-WebGL: each card holds an inline SVG front elevation of its formation: seventeen squares in the cap arrangement, active group filled #F1ECE0 and inactive groups #75705F.

code (act II, scroll length 2 vh)

Leads: the code panel, which is visible throughout, and the recede formation.

Sequence: at section entry the formation changes from cap-2 to recede with scrub across the first half of the section's progress, then holds. The code panel is visible from the first frame; its two dimension ticks (1px rule-hair-ink) draw by DrawSVG over T.beat with settle at entry. The copy button is drawn at its token colour from the first frame.

2D layer: code panel in ink-raised, 1px rule-hair-ink border, padding 31px (sp-5), code style, overflow-x auto, never wrapped. The panel holds a request and response example using the model ID claude-haiku-5-5. The frame is fixed here: at most 12 lines, at most 60 characters per line. The text itself comes from the copy owner.

3D: recede formation; depth of field on (bokeh 2.0 px, focus 21.15 bu); hero camera keyframe.

Pointer (desktop): the recede group moves with the pointer, x by pointer.sx × 0.2 bu and y by pointer.sy × 0.2 bu, damped with a 0.17 s time constant. Touch: none.

After the entrance: breath amplitude 0.012 bu.

Reduced motion: formation set at entry; no parallax; depth of field off.

No-WebGL: an inline SVG of the recede pose, scaled to the 62% layout, fill #75705F at opacity 0.5, placed behind the panel and aria-hidden.

family (act II, scroll length 2 vh)

Leads: the kireji (row A, index 4), then row C.

Sequence: the formation changes from recede to family, scrubbed across the first 0.6 of the section's progress, in the family order of section 11. Each family row's text settles colour from text-3-ink to text-1-ink over T.beat as its row arrives: row A at progress 0.2, row B at 0.5 and row C at 0.8.

2D layer: three rows, each a line of label (Geist Mono), a heading and a lede from research/facts.md. Each text row aligns with its block row: row A at the top, row B in the middle and row C at the bottom, using the projected block centres from boot (recomputed on resize).

3D: family formation; hero camera keyframe.

Pointer: hovering a text row lifts its block row 0.3 bu (settle over T.beat). Touch: a tap on a row toggles the lift.

After the entrance: each row breathes with phases 0 (row A), 0.4π (row B) and 0.8π (row C).

Reduced motion: formation set at entry; rows visible at token colour.

No-WebGL: an inline SVG of three rows at scales 0.70, 1.00 and 1.10, aligned with their text rows.

pricing (act III, scroll length 1.5 vh)

Leads: the table's top rule (DrawSVG over T.beat with settle), then the blocks.

Sequence: the formation changes from family to rest, scrubbed across the first half of the section's progress. Camera moves from the hero keyframe to the pricing keyframe (z 20.07, x 0), scrubbed. Table rules draw by DrawSVG over T.beat with settle; each row's rule starts at offsets 0, 0.035 and 0.070 s in row order (the 7 SU gap). Each row's price settles colour from text-3-paper to text-1-paper over T.beat.

2D layer: a plans table with copy from research/facts.md. Numerals are tabular. Row rules are 1px rule-hair-paper; the header rule is 2px rule-strong-paper. Section title in display-xl.

3D: rest formation along the bottom of the viewport.

Pointer and touch: native.

After the entrance: rest breath, vertical amplitude 0.01 bu, phase 0.

Reduced motion: rest set at entry; rules at full length; no breath.

No-WebGL: an inline SVG with seventeen squares in one row at the bottom, kireji in #B5312A.

closing (act III, scroll length 2.5 vh)

Leads: block 00 at the top, writing downward; the kireji keeps its slot in that order.

Sequence, scrubbed: per-block local progress q_i = clamp((p - 0.5 × o_i ÷ 0.58) ÷ 0.5, 0, 1), where o_i is the write offset of section 7 for index i, so the column is written top to bottom. Blocks move from rest to column with scrub. The kireji follows the same scrub, as the exception in section 8, rule 1. Camera moves from the pricing keyframe to the closing keyframe (z 14.60, x -2.00 at 1440 by 900), scrubbed.

Closing text: the haiku, set in body style in vertical-rl, one line, line-height 1.55, at most 26 characters, placed to the left of the column and centred on it vertically. The text is visible throughout. Each character starts at text-3-paper and turns text-1-paper when p reaches (j + 1) ÷ len, where j is the character index and len is the character count, with settle over T.micro.

Dimension: a 1px dimension line beside the column, from the top edge of block 00 to the bottom edge of block 16, drawn by DrawSVG with progress p, with the label "4.54 bu" in label style at its midpoint.

3D: column formation; depth of field off.

Pointer and touch: the ruler cursor (section 9). Touch has none.

After the entrance: a travelling wave down the column. Each block's vertical offset is 0.01 × sin(2π t ÷ 1.7 - 0.2 × k) bu, so the wave runs down the column with the T.breath period.

Reduced motion: column set at entry; text at its final colour; dimension line drawn; no wave.

No-WebGL: an inline SVG of the column with seventeen squares (kireji #B5312A), the dimension line and its label, and the haiku in vertical text.

footer (act III, scroll length 1 vh)

Leads: the outer rule of the title block, drawn by DrawSVG over T.settle with settle.

Sequence: the title block cells settle colour from text-3-paper to text-1-paper over T.beat, in cell order, at offsets 0, 0.025, 0.050, 0.075 and 0.100 s. The column stays on screen; there is no formation change.

2D layer: a title block at the bottom of the page, as a table, with cells TITLE "Claude Haiku 5.5", SCALE "1:1", SHEET "1 / 1", REV "A" and DATE "2026-10-08". Below the table, small text: "Unofficial fan and showcase page. Not affiliated with Anthropic."

3D: column held at the closing keyframe; the travelling wave continues.

Scroll, pointer and touch: the footer is not scroll-linked. Pointer behaviour is on the links only (section 13).

After the entrance: the wave is the only motion on the page at this point.

Reduced motion: everything visible at once; no wave.

No-WebGL: an inline SVG of the column, static.

## 13. Focus and interaction states

Focus ring, every focusable element: outline 2px solid var(--focus); outline-offset 3px. It appears in 0 s, with no transition, and only for keyboard focus (:focus-visible). Paper theme --focus is #9A2820 (6.60:1 on paper, pair P14). Ink theme --focus is #E7735F (6.11:1 on ink, pair I15; 5.38:1 on ink-raised, pair I16).

Text link (text in text-1 of the theme): no native text-decoration. The underline is a single-colour line drawn as a background: background-image linear-gradient(seal-text, seal-text) with no-repeat, background-position left bottom, background-size 100% 1px. Hover: background-size 100% 2px over T.micro with press. Entry side: the script sets background-position to left bottom when the pointer enters from the left and right bottom when it enters from the right, so the line grows from the side the pointer came from. Seal-text is seal-text-paper in the paper theme and seal-ink in the ink theme.

Primary button: fill text-1 of the theme (paper theme: #151512 with a paper label; ink theme: #F1ECE0 with an ink label). Label contrast is 15.52:1 (pairs P09 and I10). Hover: the fill wipes in from the entry side to seal-text (clip-path inset over T.micro with cut), and the label changes to paper on seal-text-paper (6.60:1, pair P10) or to ink on seal-ink (6.11:1, pair I11) at the same moment. Pressed: translateY 1px over T.tick with press; the fill stays in its hover colour; no scale. Focus ring as above.

Secondary button: transparent fill; 1px rule-strong border; label in text-1 of the theme. Hover: border changes to seal-text over T.micro with press. Pressed: translateY 1px over T.tick. Focus ring as above.

Capability card (a button): hover lifts its block group and shows the seal mark (section 9). Active state: mark filled with cut over T.micro; aria-pressed="true". No press state beyond the focus ring.

Copy button (code): secondary button. On activation its label reads "Copied" for T.breath (1.7 s), then returns to "Copy".

Blocks (3D): hover shows the two-digit label; a tap on touch shows it too. Blocks are not otherwise interactive and have no focus state.

Reduced motion: every hover and press change is instant, with no transitions; focus rings are unchanged.

## 14. Ban list exceptions

None. Checked against the list: no default easings (every curve is in section 6); no uniform staggers (section 7); no text moves in y and no fades on text; no gradients (the link underline is one solid colour); no glow (bloom threshold 0.96, specular only, no colour); no particles, glass, globes, blobs or emoji; no pinning, since the canvas is fixed and no content is pinned; no springs (one 2.42% follow-through per block arrival, on objects only); no logo or wordmark artwork; no AI imagery.

## 15. Open questions for the director

1. Copy. The speed figure, the family rows and the pricing plans need sourced facts in research/facts.md. That file does not exist yet; research/sources-scout.md is the only research file, so the layout keeps its slots and carries no number. The closing haiku must be exactly 17 syllables in 5, 7, 5 and at most 26 characters for the vertical line.
2. Interface change. weightedStagger in src/core/timing.ts needs a fourth weight value, 'haiku', that returns the pattern in section 7 (the 5 and 7 lines with 5 and 7 SU gaps and the 17 SU break). Approve it, or name the replacement.
3. Family order. Row A at scale 0.70 and row C at scale 1.10 imply a size order. Confirm the facts support that order, or set all three scales to 1.00.
4. Kireji position. Index 4 (block 05) closes the first line. Index 11 (block 12) closes the second line and is the alternative. Confirm.
5. Families. This draft uses Bodoni Moda Variable and Geist Mono Variable, 69,388 bytes together. If the other draft uses different families, the merged set must stay within two families and the 120 KB budget.
