# Art direction: core (locked)

Owner: art director. Date: 2026-10-08. Status: LOCKED.

Parts: this file holds headings 1 to 9 and 13 to 16. design/direction-3d.md holds headings 10 and 11. design/direction-act1.md, design/direction-act2.md and design/direction-act3.md hold heading 12 by act.

Binding inputs: design/drafts/director-decisions.md (D1 to D14 win over everything), design/drafts/critique.md section 7, design/drafts/direction-A.md and design/drafts/direction-B.md. Product wording comes only from research/facts.md, and a copy slot cites its F-id. Colour values are produced by design/contrast.mjs, whose output is pasted in heading 3. Easing and timing values are the ones exported by src/core/ease.ts and src/core/timing.ts.

## 1. Concept

A catalogue plate: one object, lit like a product photograph and dimensioned like an engineering drawing. The type is its caption and annotation system. Every number on the page measures the object or is a sourced fact from research/facts.md. Nothing moves that has not been measured.

The object, stated once:
- Seventeen blocks. Each block is 0.70 × 0.70 × 0.46 bu, with corner radius 0.035 bu. bu is the block unit, one scene unit.
- Three rows of 5, 7 and 5 blocks: the haiku's 5-7-5, read in one breath. Pitch within a row is 0.87 bu. Pitch between rows is 1.05 bu.
- Block indices run 0 to 16 in haiku order everywhere on the page. Row A is indices 0 to 4, row B is 5 to 11, row C is 12 to 16.
- Kireji: block index 4 (block 05), the last block of the first line and the cutting word. It is the only seal-coloured block: #B5312A on paper, #E7735F on ink.
- Column: the seventeen blocks in one vertical column, read top to bottom, 4.54 bu tall (16 × 0.27 + 0.22 bu).

The page is three acts. Act I (paper, 5 vh) holds hero and speed. Act II (ink, 7 vh) holds capabilities, code and family. Act III (paper, 5 vh) holds pricing, closing and footer. Scroll lengths in viewport heights (vh) are: hero 2, speed 3, capabilities 3, code 2, family 2, pricing 1.5, closing 2.5, footer 1.

The blocks are dark anodised metal in act I, bare steel in act II, and at the close they stand as one column. Three lines become one breath.

Shared names, used in all five parts:
- Section ids, in page order: preloader, hero, speed, capabilities, code, family, pricing, closing, footer.
- Formation ids: stanza, race, cap-0, cap-1, cap-2, recede, family, rest, column. Defined in design/direction-3d.md, heading 11.
- Type styles: display-xxl, display-xl, display-l, heading, lede, body, small, label, code.
- Curves: cut, settle, anticipate, follow, sym, fade, bleed, press.
- Timing tokens: T.snap, T.flick, T.micro, T.half, T.beat5, T.beat7, T.hold, T.settle, T.breath.

## 2. References

Seven references. Each is a rule of thumb for layout, material or annotation. Nothing is copied from them: no assets, no images and no links.

1. West German product sheets for household and studio equipment, 1960s and 1970s. Take: one object photographed flat on a plain field, with a short caption set on the grid beside it. Avoid: lifestyle scenes, props and slogans.
2. Josef Müller-Brockmann, Zürich concert and exhibition posters, 1950s and 1960s. Take: the modular grid shown as structure, with one large typographic idea per sheet. Avoid: centred titles and geometry added for decoration.
3. Jan Tschichold, Typographische Gestaltung (1935). Take: flush-left, ragged-right text blocks, asymmetric margins and white space measured like type. Avoid: the manifesto poster. This is book typography.
4. Postwar Japanese posters, 1950s and 1960s, where one red mark sits on a monochrome sheet. Take: a single seal-red mark as the only colour. Avoid: a literal disc or flag, and any second accent colour.
5. Orthographic engineering drawings in first-angle projection, drawing offices of the 1960s and 1970s. Take: dimension lines with tick ends, centre lines drawn as dash and dot, and a title block in the bottom right corner. Avoid: blueprint blue, gradient fills and drop shadows.
6. Museum exhibition catalogues on uncoated stock. Take: numbered plates and captions in small type at a fixed position on the grid. Avoid: captions that appear only on hover, and gallery-site cards.
7. Engraved instrument scales and dials, 1950s and 1970s. Take: high-contrast serif figures on a plain ground. Avoid: ornament, engraving effects and tight tracking on running text.

## 3. Palette

Hex is the source of truth. The oklch() values and every contrast ratio come from design/contrast.mjs. Only the pairs printed below are used in the layout, and nothing below its required ratio ships. Body text needs 4.5:1 at every size. Large text, UI boundaries, focus indicators and graphics need 3:1.

Theme mapping. The paper theme is the default on :root. The selector [data-theme="ink"] overrides the same tokens. Each section sets its own theme with data-theme. No operating-system preference changes the theme.

| CSS token | Paper theme (:root) | Ink theme ([data-theme="ink"]) | Used for |
|---|---|---|---|
| --bg | paper #F1ECE0 | ink #151512 | Page ground; section ground when WebGL is off |
| --bg-raised | paper-deep #E4DCCB | ink-raised #22211D | Panels, table bands, hover fills |
| --text-1 | text-1-paper #151512 | text-1-ink #F1ECE0 | Headings, body, numerals |
| --text-2 | text-2-paper #45413A | text-2-ink #CFC8B9 | Lede, secondary body |
| --text-3 | text-3-paper #5E5A51 | text-3-ink #A39D90 | Mono labels, captions, dimension text, colour settle start |
| --rule-hair | rule-hair-paper #7D786A | rule-hair-ink #75705F | 1px hairlines, dimension lines, phantom outlines |
| --rule-strong | rule-strong-paper #3A3831 | rule-strong-ink #E4DCCB | Table rules, input and button borders, link rest underline |
| --seal | seal #B5312A | seal-ink #E7735F | Kireji block, seal mark, capability marker |
| --seal-text | seal-text-paper #9A2820 | seal-ink #E7735F | Kicker labels, link hover underline, button hover fill, selection fill (paper) |
| --focus | focus-paper #9A2820 | focus-ink #E7735F | Focus ring |
| --code-string | code-string #D8C58F | code-string #D8C58F | Code strings (defined on :root; read only in the ink panel) |

Block colours are 3D material values, not CSS tokens. block-anodized #2B2A26 is the base for the blocks in acts I and III. block-steel #BDB7A9 is the base for the blocks in act II. The kireji is seal #B5312A on paper and seal-ink #E7735F on ink.

Rules that follow from the mapping:
- Primary button: fill var(--text-1), label var(--bg). On hover a full-height pseudo-element in var(--seal-text) draws in from the entry side, and the label becomes var(--bg) at the same moment. Pairs P09, P10, I10 and I11.
- Selection, paper: background var(--seal-text), colour var(--bg). Pair P19. Selection, ink: background var(--text-1), colour var(--bg). Pair I19. Both selection pairs are listed below.
- Link hover underline: var(--seal-text) in both themes. Pairs P07 and I07.
- Focus ring: var(--focus) in both themes. Pairs P14, P17, I15 and I16.

Contrast table. Output of `node design/contrast.mjs`, pasted verbatim. Exit code 0.

self-test black on white contrast: 21.000 (expected 21) OK
self-test white OKLCH lightness: 1.000 (expected 1) OK

| Token | Hex | oklch() | Role |
|---|---|---|---|
| paper | #F1ECE0 | oklch(0.944 0.017 88.0) | Page ground, acts I and III (paper theme) |
| paper-deep | #E4DCCB | oklch(0.896 0.024 85.8) | Second paper: plates, pricing panel, table bands, hover rows |
| ink | #151512 | oklch(0.195 0.006 106.9) | Page ground, act II (ink theme); paper-theme text-1 |
| ink-raised | #22211D | oklch(0.247 0.008 95.4) | Raised panels on ink: code panel, capability card, hover rows |
| text-1-paper | #151512 | oklch(0.195 0.006 106.9) | Paper theme: headings, body, numerals |
| text-2-paper | #45413A | oklch(0.377 0.013 81.7) | Paper theme: lede, secondary body |
| text-3-paper | #5E5A51 | oklch(0.469 0.015 86.9) | Paper theme: mono labels, captions, dimension text |
| rule-hair-paper | #7D786A | oklch(0.573 0.022 90.6) | Paper theme: 1px hairlines, dimension lines, preloader outlines |
| rule-strong-paper | #3A3831 | oklch(0.340 0.012 93.8) | Paper theme: table rules, input borders, title block rules, rest underline of links |
| text-1-ink | #F1ECE0 | oklch(0.944 0.017 88.0) | Ink theme: headings, body, numerals |
| text-2-ink | #CFC8B9 | oklch(0.834 0.022 86.0) | Ink theme: lede, secondary body |
| text-3-ink | #A39D90 | oklch(0.697 0.020 86.2) | Ink theme: mono labels, captions, code comments |
| rule-hair-ink | #75705F | oklch(0.545 0.026 93.5) | Ink theme: 1px hairlines, dimension lines, phantom outlines |
| rule-strong-ink | #E4DCCB | oklch(0.896 0.024 85.8) | Ink theme: table rules, input borders, active card border, rest underline of links |
| seal | #B5312A | oklch(0.516 0.170 27.8) | Seal red on paper: kireji block and seal mark (fill only) |
| seal-text-paper | #9A2820 | oklch(0.457 0.151 28.6) | Seal red on paper as text, focus ring, hover fill, selection fill |
| seal-ink | #E7735F | oklch(0.686 0.148 31.3) | Seal on ink: kireji block, kicker labels, code keywords, focus ring, hover fill, cursor marker |
| code-string | #D8C58F | oklch(0.826 0.074 90.9) | Ink theme code strings (ochre) |
| focus-paper | #9A2820 | oklch(0.457 0.151 28.6) | Focus ring, paper theme (2px, 3px offset) |
| focus-ink | #E7735F | oklch(0.686 0.148 31.3) | Focus ring, ink theme (2px, 3px offset) |
| block-anodized | #2B2A26 | oklch(0.285 0.007 95.3) | 3D only: block material base, paper acts |
| block-steel | #BDB7A9 | oklch(0.780 0.021 87.5) | 3D only: block material base, ink act |

| Pair | Text or graphic | Background | Ratio | Needs | Result | Use |
|---|---|---|---|---|---|---|
| P01 | text-1-paper #151512 (text) | paper #F1ECE0 | 15.52:1 | 4.5:1 | PASS | Headings, body, numerals on the page ground |
| P02 | text-1-paper #151512 (text) | paper-deep #E4DCCB | 13.41:1 | 4.5:1 | PASS | Body on plates, pricing panel, hover rows |
| P03 | text-2-paper #45413A (text) | paper #F1ECE0 | 8.61:1 | 4.5:1 | PASS | Lede and secondary body |
| P04 | text-2-paper #45413A (text) | paper-deep #E4DCCB | 7.44:1 | 4.5:1 | PASS | Secondary body on panels |
| P05 | text-3-paper #5E5A51 (text) | paper #F1ECE0 | 5.83:1 | 4.5:1 | PASS | Mono labels, captions, dimension text; colour settle starts here |
| P06 | text-3-paper #5E5A51 (text) | paper-deep #E4DCCB | 5.04:1 | 4.5:1 | PASS | Mono labels and captions on panels |
| P07 | seal-text-paper #9A2820 (text) | paper #F1ECE0 | 6.60:1 | 4.5:1 | PASS | Kicker labels, pricing emphasis, link hover underline |
| P08 | seal-text-paper #9A2820 (text) | paper-deep #E4DCCB | 5.71:1 | 4.5:1 | PASS | Kicker labels on panels |
| P09 | paper #F1ECE0 (text) | text-1-paper #151512 | 15.52:1 | 4.5:1 | PASS | Primary button label on ink fill (paper theme) |
| P10 | paper #F1ECE0 (text) | seal-text-paper #9A2820 | 6.60:1 | 4.5:1 | PASS | Primary button hover: paper label on seal-text fill |
| P11 | rule-strong-paper #3A3831 (graphic) | paper #F1ECE0 | 9.95:1 | 3:1 | PASS | Table rules, input and secondary button borders, rest underline of links |
| P12 | rule-hair-paper #7D786A (graphic) | paper #F1ECE0 | 3.74:1 | 3:1 | PASS | Dimension lines, 1px hairlines, preloader outlines |
| P13 | rule-hair-paper #7D786A (graphic) | paper-deep #E4DCCB | 3.23:1 | 3:1 | PASS | Dimension lines on panels |
| P14 | focus-paper #9A2820 (graphic) | paper #F1ECE0 | 6.60:1 | 3:1 | PASS | Focus ring on paper |
| P15 | block-anodized #2B2A26 (graphic) | paper #F1ECE0 | 12.19:1 | 3:1 | PASS | 3D block material against the page (graphic) |
| P16 | seal #B5312A (graphic) | paper #F1ECE0 | 5.18:1 | 3:1 | PASS | Kireji block against the page, acts I and III (graphic) |
| P17 | focus-paper #9A2820 (graphic) | paper-deep #E4DCCB | 5.71:1 | 3:1 | PASS | Focus ring on paper-deep panels and table rows |
| P18 | rule-strong-paper #3A3831 (graphic) | paper-deep #E4DCCB | 8.60:1 | 3:1 | PASS | Table rules on the pricing panel (graphic) |
| P19 | paper #F1ECE0 (text) | seal-text-paper #9A2820 | 6.60:1 | 4.5:1 | PASS | Selected text, paper theme (::selection: background seal-text, colour paper) |
| I01 | text-1-ink #F1ECE0 (text) | ink #151512 | 15.52:1 | 4.5:1 | PASS | Headings, body, numerals on the page ground |
| I02 | text-1-ink #F1ECE0 (text) | ink-raised #22211D | 13.67:1 | 4.5:1 | PASS | Code text on the code panel; body on the capability card |
| I03 | text-2-ink #CFC8B9 (text) | ink #151512 | 10.99:1 | 4.5:1 | PASS | Lede and secondary body |
| I04 | text-2-ink #CFC8B9 (text) | ink-raised #22211D | 9.68:1 | 4.5:1 | PASS | Secondary body on the capability card and code panel |
| I05 | text-3-ink #A39D90 (text) | ink #151512 | 6.78:1 | 4.5:1 | PASS | Mono labels and captions |
| I06 | text-3-ink #A39D90 (text) | ink-raised #22211D | 5.97:1 | 4.5:1 | PASS | Code comments and labels on panels |
| I07 | seal-ink #E7735F (text) | ink #151512 | 6.11:1 | 4.5:1 | PASS | Kicker labels; link hover underline on ink |
| I08 | seal-ink #E7735F (text) | ink-raised #22211D | 5.38:1 | 4.5:1 | PASS | Code keywords |
| I09 | code-string #D8C58F (text) | ink-raised #22211D | 9.44:1 | 4.5:1 | PASS | Code strings |
| I10 | ink #151512 (text) | paper #F1ECE0 | 15.52:1 | 4.5:1 | PASS | Primary button label on paper fill (ink theme) |
| I11 | ink #151512 (text) | seal-ink #E7735F | 6.11:1 | 4.5:1 | PASS | Primary button hover: ink label on seal-ink fill (ink theme) |
| I12 | rule-hair-ink #75705F (graphic) | ink #151512 | 3.69:1 | 3:1 | PASS | Dimension lines, 1px hairlines |
| I13 | rule-hair-ink #75705F (graphic) | ink-raised #22211D | 3.25:1 | 3:1 | PASS | Dimension lines on panels |
| I14 | rule-strong-ink #E4DCCB (graphic) | ink #151512 | 13.41:1 | 3:1 | PASS | Table rules, input and secondary button borders, rest underline of links |
| I15 | focus-ink #E7735F (graphic) | ink #151512 | 6.11:1 | 3:1 | PASS | Focus ring on ink |
| I16 | focus-ink #E7735F (graphic) | ink-raised #22211D | 5.38:1 | 3:1 | PASS | Focus ring on panels |
| I17 | block-steel #BDB7A9 (graphic) | ink #151512 | 9.16:1 | 3:1 | PASS | 3D block material against the page (graphic) |
| I18 | seal-ink #E7735F (graphic) | ink #151512 | 6.11:1 | 3:1 | PASS | Kireji block against the page, act II (graphic); cursor marker |
| I19 | ink #151512 (text) | text-1-ink #F1ECE0 | 15.52:1 | 4.5:1 | PASS | Selected text, ink theme (::selection: background text-1, colour ink) |
| I20 | rule-hair-ink #75705F (graphic) | ink #151512 | 3.69:1 | 3:1 | PASS | Phantom outlines in the family section; inactive capability groups in the no-WebGL fallback (graphic) |
| I21 | seal-ink #E7735F (graphic) | ink-raised #22211D | 5.38:1 | 3:1 | PASS | Capability mark and cap-2 active step on a raised card (graphic) |
| I22 | rule-strong-ink #E4DCCB (graphic) | ink-raised #22211D | 11.81:1 | 3:1 | PASS | Active capability card border (graphic) |

Pairs checked: 41. Failures: 0.

Bloom check: luminanceThreshold 0.96 compared in linear space (Rec. 709 weights on linear RGB).

| Surface | Linear luminance | Encoded luminance (information only) | Threshold | Result |
|---|---|---|---|---|
| paper base #F1ECE0 | 0.841 | 0.926 | 0.96 | PASS (below threshold) |
| paper fibre peak (base +0.018 sRGB) | 0.878 | 0.944 | 0.96 | PASS (below threshold) |
| ink base #151512 | 0.007 | 0.082 | 0.96 | PASS (below threshold) |
| ink fibre peak (base +0.010 sRGB) | 0.009 | 0.092 | 0.96 | PASS (below threshold) |

RESULT: all pairs, self-tests and the bloom check pass.

Colour space (D11). The composer works in linear light with HalfFloat render targets. Hex values are converted to linear before they are uploaded. three.js converts sRGB to linear when ColorManagement is enabled, which is the default from r152. The final pass writes sRGB. The bloom threshold of 0.96 is compared with linear luminance. The paper ground peaks at 0.878 linear with its fibre, so the ground never blooms.

Retired from draft A: every A hex value. Accent #B5392B is replaced by seal #B5312A. Accent-text on ink #EE7A64 is replaced by seal-ink #E7735F, which gives 6.11:1 on ink and 5.38:1 on ink-raised.

## 4. Typography

Families. Two variable families, both self-hosted, latin subsets, OFL 1.1, from Fontsource 5.3.0.
- Bodoni Moda Variable carries everything set in words: display, headings, lede, body and small. Its high stroke contrast reads as an engraved scale, the material language of the object. Its optical size axis runs from 16 px body to the 232 px hero.
- Geist Mono Variable carries labels, dimension annotations, counters, table figures and code. Monospaced figures keep measurements in columns.

Rejected. Newsreader Variable: its opsz file is 132,000 bytes on its own, which breaks the font budget with any mono face. Bricolage Grotesque: its display forms are too quirky for precision work.

Files and budget. Byte counts come from the Phase 1 package check, design/drafts/critique.md section 3, which parsed the WOFF2 tables.
- bodoni-moda-latin-opsz-normal.woff2: 46,260 bytes. Axes: opsz 6 to 96 (default 11), wght 400 to 900 (default 400).
- geist-mono-latin-wght-normal.woff2: 23,128 bytes. Axis: wght 100 to 900 (default 400).
- Total: 69,388 bytes, inside the 120 KB font budget of architecture section 9.
- Fallback file set, used only if heading 15, question 1 resolves that way: newsreader-latin-wght-normal.woff2 (58,084 bytes) with geist-mono-latin-wght-normal.woff2, 81,212 bytes in total. The Newsreader opsz file is never used.
- Both woff2 files are copied to public/fonts/ and preloaded in index.html with rel="preload", as="font", type="font/woff2" and crossorigin.

Weights and sizing.
- Bodoni Moda weight 400 for display-xxl, display-xl, display-l, lede, body and small. Weight 500 for heading. No other weight is used.
- Optical size is automatic. :root sets font-optical-sizing: auto, so the opsz axis follows the rendered size in px, clamped to 6 to 96. Body renders at opsz 16 to 19. The hero h1 renders at opsz 96: at 1440 px it is 141.8 px. Nothing sets opsz by hand.
- Geist Mono has no optical axis. Weight 500 for label, weight 400 for code.

Glyph coverage, from the same Phase 1 check (design/drafts/critique.md section 3).
- Bodoni Moda: GSUB liga, pnum, tnum, ccmp, frac, locl; GPOS kern, mark. Covered: × (U+00D7), Ø (U+00D8), ± (U+00B1), ° (U+00B0), − (U+2212), en dash, em dash, thin space (U+2009), en space (U+2002), no-break space (U+00A0), curly quotes, ellipsis. Not covered: arrows U+2190 to U+2193, primes U+2032 and U+2033, diameter sign U+2300.
- Geist Mono: GSUB ccmp, dnom, frac, locl, numr; GPOS mark, mkmk; no kern feature. Covered: × ± ° − Ø, primes U+2032 and U+2033, up arrow U+2191, down arrow U+2193, no-break space. Not covered: right arrow U+2192, diameter sign U+2300, thin space U+2009, en space U+2002, division slash U+2215.

Consequences. The diameter mark in labels is Ø (U+00D8), never U+2300. Arrows in labels are ↑ or ↓ only, and they come from Geist Mono. Thin spaces exist in Bodoni only; Geist Mono uses a no-break space with letter-spacing. Primes are never used, because every dimension is in bu. U+2215 is used in neither face.

Type scale. Each size is clamp(min, calc(a px + b vw), max). The straight line through (375 px, min) and (2560 px, max) gives a and b. Above 2560 px the maximum holds. For this file the endpoints were recomputed at 375 px and 2560 px, and each matches its minimum and maximum within 0.001 px.

| Style | Font | Size (px) | Line-height | Letter-spacing | Weight | Measure and rules |
|---|---|---|---|---|---|---|
| display-xxl (hero h1 only) | Bodoni Moda Variable | clamp(56px, calc(25.794px + 8.0549vw), 232px) | 0.92 | -0.02em | 400 | Two lines, forced break after Claude. Kinetic rules in heading 8, rule 16. |
| display-xl (section titles) | Bodoni Moda Variable | clamp(44px, calc(25.465px + 4.9428vw), 152px) | 0.98 | -0.015em | 400 | Maximum 14ch per line. Split and reassembled, heading 8, rule 15. |
| display-l (statements, figures) | Bodoni Moda Variable | clamp(30px, calc(20.046px + 2.6545vw), 88px) | 1.04 | -0.01em | 400 | Lining figures. |
| heading | Bodoni Moda Variable | clamp(22px, calc(19.941px + 0.5492vw), 34px) | 1.2 | 0 | 500 | Card titles, group titles. |
| lede | Bodoni Moda Variable | clamp(19px, calc(17.455px + 0.4119vw), 28px) | 1.4 | 0 | 400 | Maximum 36ch. |
| body | Bodoni Moda Variable | clamp(16px, calc(15.485px + 0.1373vw), 19px) | 1.55 | 0 | 400 | Maximum 62ch. |
| small | Bodoni Moda Variable | clamp(14px, calc(13.828px + 0.0458vw), 15px) | 1.5 | 0.01em | 400 | Maximum 60ch. Captions and footnotes. |
| label | Geist Mono Variable | clamp(12px, calc(11.828px + 0.0458vw), 13px) | 1.3 | 0.12em | 500 | Uppercase. white-space: nowrap. Dimension text, counters, figure labels. |
| code | Geist Mono Variable | clamp(13px, calc(12.485px + 0.1373vw), 16px) | 1.6 | 0 | 400 | Ligatures off, tab-size 2, overflow-x auto, never wraps. |

Rules.
- Kerning and features. Bodoni text sets font-kerning: normal and font-feature-settings: "kern" 1, "liga" 1. No dlig, smcp or stylistic set is ever set. Geist Mono text sets font-variant-ligatures: none and font-kerning: none.
- Figures. Prose sets pnum 1 explicitly. tnum 1 is used only in the price table of the pricing section and in the title block date. Geist Mono figures are tabular by design and take no feature setting.
- Measure. Body 62ch, small 60ch, lede 36ch, display-xl 14ch. Labels have no measure and never wrap.
- Balance. display-xxl, display-xl, display-l and heading use text-wrap: balance. body and lede use text-wrap: pretty.
- Hyphenation. :root sets hyphens: manual. The page never hyphenates automatically.
- No-break spaces, written as &nbsp; in the markup: "5&nbsp;blocks", "7&nbsp;blocks", "17&nbsp;blocks", "block&nbsp;05", "Haiku&nbsp;5.5", "Claude&nbsp;Haiku&nbsp;5.5", "0.70&nbsp;bu", "4.54&nbsp;bu", and the words "a" and "I" before the next word.
- Hero h1 markup: Claude<br>Haiku&nbsp;5.5, with the forced break.
- Hanging punctuation. body and lede set hanging-punctuation: first last, which only Safari applies. In other browsers an opening quotation mark or apostrophe that starts a line is wrapped in span.hang, and .hang sets margin-inline-start: -0.4em. QA checks the glyph edge against the text edge at 1440 px and 375 px.
- Case. Uppercase only in the label style. Sentence case everywhere else, including headings and buttons.
- Entrance colour. Body, lede, heading and label settle their colour from text-3 to their token colour over T.beat5 with settle (heading 8, rule 6).

Font-face declarations. The perf owner writes these to src/styles/fonts.css, and the files are copied to public/fonts/. The unicode-range of Bodoni Moda omits U+2191, U+2193 and U+2215, because that face has no arrows and no division slash. Geist Mono omits U+2215 for the same reason.

```css
@font-face {
  font-family: "Bodoni Moda Variable";
  font-style: normal;
  font-display: swap;
  font-weight: 400 900;
  src: url(/fonts/bodoni-moda-latin-opsz-normal.woff2) format("woff2");
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2212, U+FEFF, U+FFFD;
}
@font-face {
  font-family: "Geist Mono Variable";
  font-style: normal;
  font-display: swap;
  font-weight: 100 900;
  src: url(/fonts/geist-mono-latin-wght-normal.woff2) format("woff2");
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+2191, U+2193, U+2212, U+FEFF, U+FFFD;
}
```

Fallback faces, so that the first paint has the right size and line box. A local face cannot be assumed, so each local candidate gets its own @font-face rule with its own measured metrics. The stacks are "Bodoni Moda Variable", "Bodoni Fallback Georgia", "Bodoni Fallback Times", serif, and "Geist Mono Variable", "Geist Mono Fallback Menlo", "Geist Mono Fallback Consolas", "Geist Mono Fallback Liberation", monospace. Each fallback rule has src: local() naming exactly its own face, and the descriptors size-adjust, ascent-override, descent-override and line-gap-override.

Method, owned by perf and recorded as comments in fonts.css:
1. Size-adjust. Render "Haiku 5.5" in Bodoni Moda Variable at weight 400, at the h1 size for 1440 px (141.8 px, which renders at opsz 96). Render the same string in each fallback at 100%. Set size-adjust to the Bodoni width divided by the fallback width, as a percentage. Accept when the two widths agree within 1 px.
2. Vertical metrics. Read ascender, descender, lineGap and unitsPerEm from the hhea table of bodoni-moda-latin-opsz-normal.woff2. Set ascent-override and descent-override to those values divided by unitsPerEm, as percentages, and line-gap-override to 0%. The h1 line box is then the same height and the baseline sits in the same place within 1 px.
3. Geist Mono. Repeat steps 1 and 2 for geist-mono-latin-wght-normal.woff2, measuring "ABCDEFGHIJ0123456789" at 13 px with the label letter-spacing.
4. Choice. The first local face found in stack order is used. Its values are the ones written in fonts.css.

The h1 has a forced line break, so a font swap changes widths but never the line count, and line-height 0.92 fixes the block height.

## 5. Grid and spacing

Breakpoints.

| Viewport | Columns | Margin | Gutter | Text placement |
|---|---|---|---|---|
| 375 px to 767 px | 1 | 19px | 12px | One column, full width. Section rules in heading 12 place the 3D below the text. |
| 768 px to 1023 px | 17 | clamp(31px, 3.4722vw, 81px) | 7px (fixed below 1024 px) | 17-column track. All text spans columns 1 to 17. |
| 1024 px and wider | 17 | clamp(31px, 3.4722vw, 81px) | clamp(7px, 0.8333vw, 19px) | Groups of 5, 7 and 5: columns 1 to 5, 6 to 12 and 13 to 17. |

Derived values, computed for this file from the clamp formulas.
- At 1440 px: margin 50.00px, gutter 12.00px, content width 1340px, column 67.53px ((1340 − 16 × 12) ÷ 17). Group widths: 385.6px (5 columns), 544.7px (7 columns), 385.6px (5 columns).
- At 2560 px: margin 81px (cap), gutter 19px (cap), content width 2398px, column 123.18px. Group widths: 691.9px, 976.2px and 691.9px.
- The wrap is max-inline-size 2560px, margin-inline auto and padding-inline var(--margin). Above 2560 px the wrap stays 2560px wide and centred, and the margin stays 81px.

Groups. From 1024 px the text groups are columns 1 to 5, 6 to 12 and 13 to 17. The gap between groups is one gutter. A 1px rule-strong hairline marks the 5|6 and 12|13 boundaries in the label row only, from 1024 px. Nothing else marks the groups.

Spacing tokens, seeded with 5 and 7, each the sum of the two before it:
- --sp-1 5px: hairline offsets, tick lengths.
- --sp-2 7px: label to value; small gutters.
- --sp-3 12px: phone gutter; cursor offsets.
- --sp-4 19px: phone margin.
- --sp-5 31px: tablet margin; panel padding.
- --sp-6 50px: desktop margin at 1440 px; phone section padding.
- --sp-7 81px: maximum margin; tablet section padding.
- --sp-8 131px: desktop section padding.
- --sp-9 212px: largest vertical gap between text blocks.

Section padding-block is 131px (--sp-8) from 1024 px, 81px (--sp-7) from 768 px to 1023 px, and 50px (--sp-6) below 768 px. At 768 px and wider, full-width bands run across the full 17-column track inside the margin.

## 6. Easing library

Eight curves. Each is written once, in src/core/ease.ts.
- CustomEase.create('hk.<name>', path) registers each curve with GSAP. E.<name> is the GSAP ease string 'hk.<name>'.
- ef.<name>(t) evaluates the same curve for GL and JavaScript maths, solved by bisection on x to 1e-10.
- cssEase.<name> is the cubic-bezier string for CSS transitions. CSS motion takes its curve only from cssEase.

Measured values are read from each cubic: y at a given fraction of duration (x), and the fraction of duration at which y reaches a given value. They come from a solve of each curve on 200,000 samples.

| Curve | cubic-bezier | GSAP path | Measured | Character | Used for | Never used for |
|---|---|---|---|---|---|---|
| cut | cubic-bezier(0.10, 0.90, 0.05, 1.00) | M0,0 C0.1,0.9 0.05,1 1,1 | y(0.25) = 0.897. Reaches 0.90 at x 0.25 and 0.99 at x 0.62. | Fast out, hard stop. Most of the motion is done in the first quarter. | Lead entrances of timed groups, including the kireji; capability marker fill; cursor shape swap; ruler snap; code live line marker; preloader kireji scale. | Text; hover and colour (press); long travel; scrubbed motion. |
| settle | cubic-bezier(0.30, 0.50, 0.10, 1.00) | M0,0 C0.3,0.5 0.1,1 1,1 | y(0.25) = 0.636, y(0.50) = 0.911, y(0.75) = 0.984. Reaches 0.90 at x 0.48 and 0.99 at x 0.80. | Long settle. It arrives, then takes its time in a long tail. | Followers of every timed group; colour settle of type; DrawSVG of rules; display tracking settle; split title reassembly; capability group lift; smear decay. | The kireji; hover and press responses; scrubbed motion; fades. |
| anticipate | cubic-bezier(0.40, -0.60, 0.20, 1.00) | M0,0 C0.4,-0.6 0.2,1 1,1 | Minimum −0.1346 at x 0.151. y(0.50) = 0.658. | Pulls back before it runs. | The kireji only, as the lead of the scrubbed race and column moves. Its position between two poses follows the curve, so it pulls back 13.46% of its travel first. | Text; UI; every other block; timed groups. |
| follow | cubic-bezier(0.25, 0.80, 0.35, 1.10) | M0,0 C0.25,0.8 0.35,1.1 1,1 | Maximum 1.0186 at x 0.784 (1.86% overshoot). y(0.50) = 0.959. | Small follow-through. It lands, then gives a little. Not a spring. | Block arrival at the end of a keyboard formation change, once per arrival; family stanza lift when a Haiku label is hovered, once per arrival. | Text; colour; any loop; anything overshooting more than 3%; the column. |
| sym | cubic-bezier(0.62, 0.00, 0.38, 1.00) | M0,0 C0.62,0 0.38,1 1,1 | y(0.25) = 0.077, y(0.50) = 0.500 exactly, y(0.75) = 0.923. | Symmetric, point-symmetric about (0.5, 0.5). | Every scroll-scrubbed camera move; formation transitions; ink front progress p; hero weight axis; family flank drift; race offset. | Time-based entrances; hover; colour; text. |
| fade | cubic-bezier(0.30, 0.10, 0.20, 1.00) | M0,0 C0.3,0.1 0.2,1 1,1 | y(0.25) = 0.392, y(0.50) = 0.815. | Opacity crossfade. No movement is implied. | Canvas crossfades (reduced motion and no-WebGL switches); preloader square appearance and fade-out; readout fade; reduced-motion section crossfade at T.beat5. | Any transform; any text entrance (heading 8, rule 6). |
| bleed | cubic-bezier(0.55, 0.05, 0.25, 1.00) | M0,0 C0.55,0.05 0.25,1 1,1 | y(0.25) = 0.131, y(0.50) = 0.699, y(0.75) = 0.953. | Slow start, then the ink flows and finishes slowly. | Colour mix of the ink-bleed rim band, mixed by bleed(p), so the rim fills in slowly and then flows. | The front position (sym, D10); blocks and text, which follow p itself; the cursor. |
| press | cubic-bezier(0.10, 0.50, 0.20, 1.00) | M0,0 C0.1,0.5 0.2,1 1,1 | y(0.25) = 0.704, y(0.50) = 0.905, y(0.75) = 0.981. Reaches 0.50 at x 0.13 and 0.90 at x 0.49. | Quick response with a soft landing. | Hover pseudo-element draws; hover, press and selection colour; preloader square fill; capability cards not active (colour to text-3). | Anything longer than T.beat7; scroll-linked motion; text position. |

Notes.
- Every control x lies in [0, 1], so x is monotonic on every curve. Only anticipate (y1 = −0.60) and follow (y2 = 1.10) have control y outside [0, 1].
- The set is seven curves from draft A and press from draft B. Draft B's wind, its follow at 2.42% and its scrub name are not used. scrub is renamed sym.
- scripts/check-ease.mjs (owner qa) asserts each measured value above to ±0.001 and each control x to [0, 1], and fails the build on any change.

## 7. Timing scale and stagger

Durations in seconds. Every duration in JavaScript and CSS is one of these nine tokens, exported as T by src/core/timing.ts. Each value is a product of 5, 7 and 17 in hundredths of a second, or of 10 times one of them. There is no other duration. T.long is not used. Loops use T.breath.

| Token | Seconds | Derivation | Used for |
|---|---|---|---|
| T.snap | 0.05 | 5 | Press colour response; preloader square fill; cursor shape swap (cut). |
| T.flick | 0.07 | 7 | Cursor label swap between the datum and a block label. |
| T.micro | 0.17 | 17 | Hover pseudo-element draw and hover colour (press). Lead delay in timed groups. Lead entrances (cut): capability marker fill, code live line marker, ruler snap. Cursor position damping time constant. |
| T.half | 0.35 | 5 × 7 | Block entrances in act I. Canvas crossfades and the reduced-motion canvas switch. Pointer damping time constant (D13). Preloader outline fade. |
| T.beat5 | 0.50 | 5 × 10 | Block entrances in act II. Colour settle of type. DrawSVG of rules. Capability card group lift. Reduced-motion section crossfade. Preloader kireji scale (cut). |
| T.beat7 | 0.70 | 7 × 10 | Block entrances in act III. Keyboard formation changes. Split title reassembly. Hero h1 letter-spacing settle. Ink front smoothing (D10). |
| T.hold | 0.85 | 5 × 17 | Delay between an entrance and the start of the idle breath. |
| T.settle | 1.19 | 7 × 17 | Footer title block rule (DrawSVG). The longest single move on the page. |
| T.breath | 1.70 | 17 × 10 | Idle breath period. Closing wave period. Touch label display time. "Copied" label display time. |

Stagger, one weighted profile. weightedStagger(count, { total, lead?, weight }) returns offsets in seconds for count items, in sequence order, item 0 first. The index is i, running from 0 to count − 1.
- front: total × sqrt(i ÷ (count − 1)). The gaps shrink along the sequence.
- back: total × (1 − sqrt(1 − i ÷ (count − 1))). The gaps grow along the sequence.
- center: total × sqrt(|2i ÷ (count − 1) − 1|). The centre item moves first and the ends move last.
- lead, when given, is added to every item except item 0. Item 0 starts first and every other item starts lead seconds later.
- The square root distributes offsets over the sequence. It is never a tween easing.
- Example, count 5, total 0.35, front: 0, 0.1750, 0.2475, 0.3031, 0.3500 s.

Stagger, the haiku. The seventeen blocks that enter together are three lines, and lineStagger builds one weighted profile per line and joins the lines with a fixed break.
- lineStagger(lines, gap): line 1 starts at 0. Each later line starts at the previous line's start, plus its total, plus gap. Within a line, item k has offset start + total × sqrt(k ÷ (count − 1)).
- Lines: five items with total 0.10 s, seven items with total 0.21 s, five items with total 0.10 s. Gap 0.085 s.
- HAIKU_OFFSETS is that result rounded to four decimals. It is a constant table, and code never recomputes it. Position p of the formation's stagger order takes HAIKU_OFFSETS[p]. The formation stagger orders are in design/direction-3d.md, heading 11. The first five positions are line one, the next seven are line two, and the last five are line three.

0, 0.0500, 0.0707, 0.0866, 0.1000 | 0.1850, 0.2707, 0.3062, 0.3335, 0.3565, 0.3767, 0.3950 | 0.4800, 0.5300, 0.5507, 0.5666, 0.5800

The span is 0.580 s. The largest gap is 0.0857 s, into line two. The smallest gap is 0.0134 s, inside line three.

Overlap rule for timed groups. For consecutive items k and k + 1 with tween duration D, overlap = 1 − (offset(k + 1) − offset(k)) ÷ D. In every timed group each overlap lies in [0.75, 0.985]. Computed values:
- HAIKU_OFFSETS with D = T.half (act I): 0.755 to 0.962.
- HAIKU_OFFSETS with D = T.beat5 (act II): 0.829 to 0.973.
- HAIKU_OFFSETS with D = T.beat7 (act III): 0.878 to 0.981.
- Split section titles (heading 8, rule 15), n characters, total T.half, front profile, D = T.beat7: n = 5 gives 0.750 to 0.933, and n = 14 gives 0.861 to 0.980. A line of fewer than five characters gets no stagger, and all its characters start together.
- Scrubbed staggers are exempt from this rule, because scroll drives them.

Scrubbed stagger, scrubLocal(i, count, t, { total = 0.35, lead = 0.10 }). Given the normalised transition progress t from 0 to 1, it returns the local progress q of position i in a scrubbed formation, clamped to [0, 1].
- Position 0 is the lead: q = t ÷ lead, clamped. The lead completes its own move within the first lead of the transition.
- A follower, position i ≥ 1: start o(i) = lead + total × sqrt((i − 1) ÷ (count − 2)), and q = (t − o(i)) ÷ (1 − o(i)), clamped. When count is 2, o = lead.
- The caller applies the named curve to q: settle for followers, anticipate for the kireji.
- ScrollTrigger scrub is 0.7 for camera and formation moves, and 0.17 for per-block local progress.
- Count 17: follower 1 starts at t = 0.100, follower 8 at t = 0.339 and follower 16 at t = 0.450. Every follower window ends at t = 1, and the last window is 0.550 long.

Act rhythm. Each act has its own pace, set by the durations above.
- Act I (paper, 5 vh, quick): block entrances over T.half. Kireji leads the entrance. Text colour settles over T.beat5.
- Act II (ink, 7 vh, middle): block entrances over T.beat5. Keyboard formation changes over T.beat7. Code lines do not move.
- Act III (paper, 5 vh, slow): block entrances over T.beat7. Footer rule over T.settle. The column writes along its scrub.

## 8. Motion principles

1. Lead. Every group has one lead that starts first. In a timed group the lead starts T.micro before its followers and moves with cut, and the followers settle. In a scrubbed group the lead is position 0 of scrubLocal. A group with no lead is a defect.
2. Curves. Only the eight curves of heading 6 exist. A grep for cubic-bezier or CustomEase.create outside src/core/ease.ts returns nothing. CSS takes its curve from cssEase. CSS ease, ease-in, ease-out and linear are never used for motion.
3. Durations. Every duration comes from the table in heading 7. A literal number of seconds in a tween or transition is a defect.
4. Stagger. Staggers are never uniform. Timed groups follow the overlap rule of heading 7. Scrubbed staggers are exempt.
5. Scroll. Scroll-linked motion is tied to scroll position and is scrubbed. Camera and formation moves use sym. Per-block local progress uses scrubLocal, with settle for followers and anticipate for the kireji. The ink front progress p uses sym, smoothed over T.beat7 (D10). An entrance is a timed tween. It starts once, when its element's top crosses the trigger line at 80% of the viewport height, and it never replays.
6. Text. Text enters in one of three ways. Its colour settles from text-3 to its token colour over T.beat5 with settle. A letter-spacing or variable-axis change moves it (the hero h1, rule 16). Or the section title split moves its characters horizontally (rule 15). Text never fades and never moves in y. It moves in x only under rule 15. Under reduced motion a whole section may crossfade (fade, T.beat5, when 20% visible), as architecture section 8 requires.
7. Limits. Lifts, tilts, lead dips and pointer offsets stay within 0.6 bu or 24 px. Time-based block travel stays within 1.0 bu per move. Longer travel happens only in scrubbed moves, which are exempt from the 0.6 bu limit, or in keyboard formation changes over T.beat7.
8. Overshoot. Only follow overshoots, by 1.86%, once per arrival, and only on objects. Nothing bounces. No spring is used.
9. Keep-alive. After its entrance every section keeps one motion running: the idle breath, a scrubbed value, or a pointer response on desktop. The idle breath has amplitude 0.012 bu and period T.breath. It starts T.hold after the entrance, with phase 0 for row A, 0.4π for row B and 0.8π for row C. A loop starts when its section enters the viewport and pauses when the section leaves it. Reduced motion stops every loop.
10. Rotation. Formation rotations are about the vertical axis only (yaw), at ±0.35 rad on inactive capability groups. Pointer tilt about x and y is the only other rotation, up to 0.035 rad.
11. Pointer. Pointer response uses a damping time constant of T.half. Pointer velocity is smoothed with a local time constant of 0.1 s (D13). Pointer offsets stay within 0.2 bu and tilt within 0.035 rad. Touch has no pointer response.
12. Kireji. Block index 4 (block 05) is the only seal-coloured block and the only block that receives anticipate. In every formation change it takes position 0, moves with cut in a timed group, and lands first. In a scrubbed race or column move its position follows anticipate between its two poses. The column is the exception: the blocks write top to bottom in index order, and the kireji keeps its slot in that order.
13. Ink front. The front tracks the act boundary (D10). Its progress p is linear in the section position and is eased with sym, so the section's data-theme switches at p = 0.5 and the block material and environment intensity follow the same p. The rim band's colour mix is bleed(p). Each section that ends at a theme boundary keeps its last 0.18 vh free of text: the bottom of each paper section before an ink boundary, and the bottom of each ink section before a paper boundary. Text that crosses the band is set in the section's own theme colour. The front's geometry is in design/direction-3d.md, heading 10. Under reduced motion and without WebGL the boundary is a plain cut.
14. Numbers. No number counts up on this page. No verified speed figure exists (F-37, F-38, F-140), so there is no figure and no count-up.
15. Section titles (D2.3). Display-xl section titles below the fold are split into characters with GSAP SplitText. The parent keeps an aria-label with the full title, and the characters are aria-hidden. On reveal, once, when the title top crosses 80% of the viewport height, each character starts displaced horizontally by (i − centre) × 0.06em, where centre is (n − 1) ÷ 2 for a line of n characters. Each character starts in text-3. Each line is staggered with the front profile at total T.half, and each character tweens to its set position and token colour with settle over T.beat7. Opacity stays at 1. Lines of fewer than five characters start together. Under reduced motion the title is static.
16. Hero h1 (D2.4). Letter-spacing settles from +0.02em to −0.02em over T.beat7 with settle, from the first frame, so the h1 is legible at first paint. The weight axis is scrubbed with sym across the first 0.5 of the hero's scroll progress, which is the first 1 vh of its 2 vh: 400 at progress 0, 430 at progress 0.25, and 400 at progress 0.5. The axis is set through font-variation-settings with wght.
17. Reduced motion. Every state is set at once. Scrub, breath, tilt, pointer response, custom cursor, hover lift and title split are off. Hover and press change colour instantly. A section crossfades with fade over T.beat5 when 20% visible. Canvas switches use fade over T.half.
18. No timers. Nothing starts on a timer alone. Entrances start on loader:done or on the trigger line.
19. Engineering (D13 and D2.6). gsap.ticker is the only application loop, and initTicker sets lagSmoothing(0). ScrollTrigger's internal empty requestAnimationFrame callback is accepted. Lenis runs with lerp 0.1 on wheel and touch, with syncTouch false, and is off under reduced motion. Every programmatic jump uses scrollToTarget. WebGL is detected with typeof WebGL2RenderingContext !== 'undefined' and the ?nogl query, and a context that fails later adds html.no-gl. Shadows use THREE.PCFShadowMap; softness comes from the shadow camera size and map resolution (D13.1).
20. Scope. design/direction-3d.md and the three act files obey rules 1 to 19. A part that must break a rule states the rule and the reason in its own file.

## 9. Cursor per section

Rules for every section.
- A custom cursor is shown only with a fine pointer, matchMedia '(hover: hover) and (pointer: fine)', and only without reduced motion. Touch and reduced motion use the native cursor. Keyboard focus hides the custom cursor.
- The cursor is a DOM element in the cursor layer, with z-index 50 and pointer-events none. Its position follows the pointer with a damping time constant of T.micro.
- Exactly four custom forms exist: datum, caliper, marker and ruler. The family section uses the datum again.
- Hit tests run at most once per frame, and never as a raycast. Block rectangles are computed at boot from the boot camera, which is the hero keyframe camera that the preloader outlines use, and they are recomputed on resize. The closing ruler's 17 centres are the column's projected centres, computed at boot from the closing keyframe camera and recomputed on resize.

| Section | Cursor | Geometry | Behaviour | Why |
|---|---|---|---|---|
| preloader | native | none | none | Nothing can be pointed at until the object exists. |
| hero | datum | Two 1px lines, one horizontal and one vertical. Each line is two 12px arms that start 5px from the pointer on each side, so the centre stays open. Colour text-1. | Over a block the datum is replaced by the block's two-digit label (index + 1, label style), placed 12px right and 12px below the pointer. The swap is cut over T.flick. | The hero is a measuring point, and the label names the block being measured. |
| speed | caliper | A 1px vertical tick, 12px tall, centred on the pointer x. A 1px horizontal dimension line at the pointer y, from the left edge of block 01 to the pointer x. Label "x.xx bu" in label style, 5px above the line's midpoint. | The value is the pointer x in bu minus the left edge of block 01, to two decimals. In the race layout that edge is at −7.95 bu. | The race is a measured distance, and the caliper reads it. |
| capabilities | marker | A 7px square in seal-ink, centred on the pointer. | Over a capability card, the card's block group lifts 0.2 bu toward the camera (settle over T.beat5). The marker fill is cut over T.micro when the card activates. | A block marks the capability it belongs to. |
| code | native I-beam | Native. | None. | Code is selected and copied, so the native pointer stays exact. |
| family | datum | As hero, without the block label. | Hovering a label block runs the dash of its phantom outline. Haiku's label lifts the stanza 0.15 bu with follow (D4). | The family is a measuring view. |
| pricing | native | Native. | None. | Plans are read, not pointed at. |
| closing | ruler | A 1px horizontal tick, 12px wide. It snaps to the nearest of the 17 column centres with cut over T.micro. Label: the snapped block's two-digit number in label style, 12px right of the tick. | Colour text-1 of the paper theme. | The column is a scale, and the ruler reads it. |
| footer | native | Native. | None. | The footer is a title block. |

Touch. No custom cursor. A tap on a block shows its two-digit label for T.breath, placed as the hero label, with cut over T.flick when it shows and when it hides. A tap on a capability card activates it. A tap on a family label toggles its stanza lift (D4). Touch has no pointer response.

Keyboard. Focus rings show, and custom cursors are hidden. In capabilities, ArrowDown and ArrowRight move to the next card, ArrowUp and ArrowLeft move to the previous card, Home moves to the first card and End to the last. The card activates at once and its formation changes over T.beat7. Enter and Space activate buttons. In code, Tab reaches the code block (tabindex 0), then the copy button.

## 10. 3D direction

See design/direction-3d.md.

## 11. Formations

See design/direction-3d.md.

## 12. Section choreography

Act I (preloader, hero, speed): see design/direction-act1.md.

Act II (capabilities, code, family): see design/direction-act2.md.

Act III (pricing, closing, footer): see design/direction-act3.md.

## 13. Focus and interaction states

Focus ring, every focusable element. outline: 2px solid var(--focus); outline-offset: 3px. The ring appears in 0 s, with no transition, and only for keyboard focus (:focus-visible). Contrast: paper #9A2820 is 6.60:1 on paper (P14) and 5.71:1 on paper-deep (P17). Ink #E7735F is 6.11:1 on ink (I15) and 5.38:1 on ink-raised (I16).

Hover direction (D2.1). Hover responses show the side from which the pointer entered. On pointerenter the script compares the pointer x with the element's centre and writes data-enter="left" or data-enter="right". CSS sets the transform-origin of the hover pseudo-element to that entry side. The pseudo-element scales on X from 0 to 1 with the press curve over T.micro. No clip-path and no gradient are used. On touch no data-enter is written and the origin is the centre. Under reduced motion there is no pseudo-element motion and the colour changes instantly.

Text links. No native text-decoration is used. Two 1px pseudo-elements sit at the underline position, 0.18em below the baseline.
- ::before is the rest underline, background var(--rule-strong), full width.
- ::after is the hover line, background var(--seal-text), starting at scaleX 0. On hover it scales to 1 from the entry side over T.micro with press.
- The link text stays var(--text-1) in every state. Under reduced motion ::after is shown at full width with no motion.

Primary button. Fill var(--text-1), label var(--bg). On hover, a full-height pseudo-element in var(--seal-text) scales on X from the entry side over T.micro with press, and the label becomes var(--bg) at the same moment. Pairs P09 and P10 in paper, I10 and I11 in ink. Pressed: the fill stays in its hover colour. There is no transform, and the label does not move.

Secondary button. Transparent fill, 1px solid var(--rule-strong) border, label var(--text-1). On hover the border changes to var(--seal-text) over T.micro with press. Pressed looks the same as hover. Pairs P11 and I14 for the rest border.

Table rows and panel rows. On hover, a full-height pseudo-element in var(--bg-raised) scales on X from the entry side over T.micro with press. There is no shadow and no lift.

Capability cards (buttons). Hover lifts the card's block group 0.2 bu (heading 9). The card background does not change. An active card carries aria-pressed="true" and its marker is filled. The only state beyond focus is that marker fill.

Copy button. Secondary button. On activation its label reads "Copied" for T.breath, then returns to "Copy".

Blocks (3D). Blocks are not focusable and have no focus state. A tap shows the two-digit label of heading 9. Family label blocks are plain text and are not focusable.

Selection. Paper: ::selection background var(--seal-text), colour var(--bg). Pair P19, 6.60:1. Ink: ::selection background var(--text-1), colour var(--bg). Pair I19, 15.52:1.

Reduced motion. Every hover and press change is instant, with no pseudo-element motion. Focus rings are unchanged.

## 14. Ban-list exceptions

Anything not listed here is not used. Each exception gives its reason.

1. Bloom (D12, D11). BloomEffect with luminanceThreshold 0.96 in linear space, luminanceSmoothing 0.02, intensity 0.12, radius 0.2 and mipmapBlur on. Only specular highlights above 0.96 bloom, and the paper ground peaks at 0.878 linear, so it never blooms. The bloom is neutral, has no colour and touches no text. Reason: the lacquer edge of a block must read as a machined highlight, not a flat spot.
2. Lenis smooth scrolling (D12, D2.6). Lerp 0.1 on wheel and touch, syncTouch false, off under reduced motion. It never snaps to a section and never changes where a scroll lands. Every programmatic jump uses scrollToTarget. Reason: scrubbed motion needs continuous scroll values. This is not scroll-jacking.
3. Follow overshoot (D12). The follow curve overshoots by 1.86%, on objects only, once per arrival, with a cap of 3%. It is not a spring: one overshoot and no oscillation. Reason: a flat settle after a lift reads as dead.
4. Phantom outlines in the family section (D12, D4). Three rounded-box outlines show the sibling models at their stations. They are one LineSegments object with LineDashedMaterial: dash 0.17 bu, gap 0.07 bu, colour rule-hair-ink (pair I20). They have no fill and no shading. They are static, except that the dash runs while a label block is hovered. Reason: a drafting convention for adjacent parts shown for reference. They are not a wireframe globe, and they do not rotate.
5. Section title displacement (D2.3, recorded here). Characters of display-xl titles move horizontally once on reveal, by (i − centre) × 0.06em, and reassemble over T.beat7. Opacity stays at 1, and no character moves in y. Reason: the brief asks for text that splits and reassembles on reveal. Heading 8, rule 6 names this as the one exception to the no-translation rule.

No other exception is used. Checked against the banned list: no default easings, no uniform staggers, no gradients (the link underline is a solid pseudo-element), no glow beyond item 1, no glassmorphism, no particles, no wireframe globes (item 4 is a drafting outline), no blobs, no emoji, no logo or wordmark, no AI imagery, and no spring (item 3 is the only overshoot).

## 15. Open questions

1. Body legibility at 16 px (D9). Bodoni Moda Variable at weight 400 is the body face. Legibility of 16 px body text in a high-contrast serif at 375 px and 1440 px is untested. Proposed default: keep Bodoni Moda with Geist Mono (69,388 bytes). Run the test on polish pass 1 screenshots. Switch to the Newsreader wght-only fallback (81,212 bytes with Geist Mono) only if the art director's review of the 1x screenshot rejects the body text.
2. Fallback metrics (heading 4). perf measures size-adjust and the vertical overrides by the method in heading 4. Proposed default: use the first local face found in stack order. If no candidate meets the 1 px tolerance, use the candidate with the smallest error, and record that error in fonts.css as a comment.
3. Copy for every slot. The closing haiku, the speed panel text (labelled Example output), the hero lede and button label, the capability body copy, the family descriptions, the price table note and the footer copy are not set here. Proposed default: the copy owner writes each slot from research/facts.md and cites its F-id in the copy file. A slot with no sourced fact keeps its copy specification in the act file, and no fact is invented.
4. Layout confirmation at 1440 by 900 and 375 by 812. The hero placement in design/direction-act1.md is proposed and not yet confirmed on screenshots. Proposed default: keep the placement as written. If the h1 overlaps the stanza, move the h1 up by the overlap, measured in vh.

## 16. Changelog from drafts

Each row gives the inputs for one heading. "Overridden" names the decision that replaced a critique fix or a draft value.

| # | Heading | From A | From B | From the director | Critique fixes applied | Critique fixes overridden, and by which decision |
|---|---|---|---|---|---|---|
| 1 | Concept | Single seal colour on the kireji. | Catalogue plate framing; "nothing moves that has not been measured"; rows of 5, 7 and 5; column 4.54 bu. | D1: B is the base. The "restraint" line is deleted. | 7.1: the object stated once; kireji #B5312A on paper and #E7735F on ink; A's #B5392B retired. | The "restraint" line is deleted in both drafts (D1). |
| 2 | References | Items 1, 2, 3 and 6. | Items 1, 3 and 7. | None. | 7.2: seven kept, each with take and avoid lines and the no-copy rule. | B items 2, 4, 5 and 6 dropped (7.2). |
| 3 | Palette | Selection and hover rule, with values replaced. | Every hex and OKLCH value, token names, pairs P01 to P16 and I01 to I18. | D11: colour space note. | 7.3: B palette; accent-text ink replaced by seal-ink; pairs P17 to P19, I19 to I22 added (focus on paper-deep, selections, phantom outline, table rules); "both themes" hover label dropped; contrast-A.mjs retired and contrast.mjs merged. | None. |
| 4 | Typography | Subset step (dropped); no-break, hyphen, figure, measure and hanging rules. | Families, files, bytes, axes, @font-face, scale and glyph coverage. | D9: fallback metrics measured by perf, method stated. | 7.4: weights 400 and 500 only (A's 300 to 420 removed); two local fallbacks measured; arrows removed from the Bodoni range; fallback bytes stated; B's unverified rejections dropped. | D9 defers the 16 px legibility test to polish pass 1, and it is open question 1 in heading 15. |
| 5 | Grid and spacing | Spacing scale; hairline group marks at the 5 to 6 and 12 to 13 boundaries. | Track, breakpoints, clamp margins and gutters, derived values, 2560 px wrap. | None. | 7.5: B's grid; margin clamp from 768 px up, 7px gutters below 1024 px; A's five-column layout and its margin clamp and 2240 px cap removed. | B's fixed 31px margin at 768 to 1023 px replaced by the clamp, which the vocabulary and 7.5 both give. |
| 6 | Easing library | Seven curves, used-for and never-used-for tables, measured values. | press. | D2.1: press for hover. D10: the ink front is eased with sym. | 7.6: eight curves; wind dropped; scrub renamed sym; follow at 1.86%; press for colour; script check. | D10: A's bleed use for the ink front moves to sym, and bleed mixes the rim band only. |
| 7 | Timing and stagger | T names and values; weightedStagger front, back and center; scrub stagger. | T.flick, T.hold, T.settle; the uniform-within-line pattern (replaced). | D2.3: title stagger per line with the front profile. | 7.7: merged haiku offsets; no fourth weight; per-line profile; timed overlap 0.75 to 0.985; scrubs exempt; T.long dropped; T.breath for loops. | B's fourth weight 'haiku' (B section 15, item 2) rejected by 7.7 and 7.15, item 6. scrubLocal's follower start is new here: lead + total × sqrt((i − 1) ÷ (count − 2)). |
| 8 | Motion principles | A's twelve principles: lead, named curves, T table, non-uniform staggers, scrub, text by opacity or axis, micro limit, keep-alive, pointer damping, no timers, reduced motion, kireji. | B's principles: kireji first, followers settle, no text translation, one overshoot, 1.0 bu travel, haiku pattern, yaw only, reduced motion. | D2.3 and D2.4: title split and kinetic h1. D2.6: Lenis on touch. D13: ticker, boot check, shadows, pointer smoothing. D10: ink front, band and plain cut. | 7.8: eight curves; plain cut for the bleed under reduced motion and without WebGL; sections crossfade at T.beat5; material follows the front; overshoot rule. 6.1: text-free band of 0.18 vh before each theme boundary (rule 13). | D2.3 and D2.4 override B's principle 4 (text never translates) and are recorded as the rule 6 exception. A's text fades dropped in favour of B's principle 3 (text never fades). |
| 9 | Cursor per section | Registration mark, tick, dot, I-beam, bar; closing reading rule. | Datum, caliper, marker, ruler; native pointers; touch and keyboard rules. | D2.2: four forms; family uses the datum; hit tests once per frame. | 7.9: reduced-motion rule added; A's extra cursors and reading rule dropped; boot rectangles; native I-beam kept. | B's tap label fade replaced by cut over T.flick, because text never fades (rule 6). |
| 10 | 3D direction | Not used here. | Not used here. | D2.5 post stack and D13.1 shadows are applied in design/direction-3d.md. D11 is in heading 3. | Pointer only. | Not applicable. |
| 11 | Formations | Not used here. | Not used here. | D4 and D6 are applied in design/direction-3d.md and the act files. | Pointer only. | Not applicable. |
| 12 | Section choreography | Not used here. | Not used here. | D5, D6, D7 and D8 are applied in the act files. | Pointer only. The act files carry the 7.12 fixes. | Not applicable. |
| 13 | Focus and interaction | Entry-side fill and underline; focus ring with opacity over T.snap; selection rule (kept). | Focus ring at 0 s; reduced-motion rule; button and link anatomy. | D2.1: direction-aware hover as pseudo-elements, press over T.micro, centre origin on touch, colour only under reduced motion. | 7.13: B's clip-path wipe and gradient underline replaced by solid pseudo-elements; focus ring from B. | D2.1 keeps the directional hover that 7.13 removed. B's pressed 1px translate dropped, because button labels are text and text does not translate (rule 6). |
| 14 | Ban-list exceptions | Exceptions: long pin (dropped), Lenis, bloom, follow. | None declared. | D12 list. D2.3 displacement recorded. | 7.14: bloom, Lenis and follow listed; long pin dropped; uniform stagger removed and not declared. | D12 adds the phantom outlines (exception 4). D2.3 adds exception 5. |
| 15 | Open questions | Five questions. | Five questions. | D9 on fonts. | 7.15: fonts resolved to B with the fallback named; capability hold moot; research/facts.md exists, so B's item 1 is out of date; kireji confirmed; preloader budget 1.5 s; no fourth weight; colour space decided (D11). | D9 defers the 16 px test, overriding 7.4's test before lock. |
