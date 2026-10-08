Direction A: editorial print. Owner: art-director (draft A). Status: draft for the director to merge with draft B. Fixed inputs: design/architecture.md sections 1, 4, 6, 8 and 9, unchanged. Every value below is exact. Where a value depends on a measurement made by another owner, the line says so and gives the rule. Themes are set per section with data-theme, never by the operating-system preference.

## 1. Concept

A catalogue plate, not a poster. Type leads and the object is a quiet, exact guest on the page. Acts I and III are paper, act II is sumi ink. The seventeen machined blocks are the only three-dimensional matter and they are handled like type. They stand as lines of 5, 7 and 5, race along one line, split into three rows of meaning, step back behind the code, become three stacks, lie down as type slugs, and finally stand as one column read from the top: the haiku set in one line. Block index 4 is the kireji, the seal-red cut after the first five, and it is the only colour on the object. Restraint reads as confidence. Nothing moves unless a rule, a grid or a curve needs it, and every section keeps a slow idle motion so the page never goes dead.

## 2. References

1. Josef Müller-Brockmann, Zürich concert and exhibition posters, 1950s and 1960s. Take the modular grid shown as structure, with one large typographic idea per sheet. Avoid centred titles and geometry added for decoration.
2. Jan Tschichold, Typographische Gestaltung (1935), in English as Asymmetric Typography. Take flush-left, ragged-right text blocks, asymmetric margins and white space measured like type. Avoid the manifesto poster; this is book typography.
3. Postwar Japanese posters, 1950s and 1960s, where one red mark sits on a monochrome sheet. Take a single vermilion mark as the only colour. Avoid a literal disc or flag and any second accent colour.
4. Kenya Hara, "White", a book on emptiness in design. Take blank space treated as content with the same care as type. Avoid luxury blankness with no hierarchy and no captions.
5. Postwar Japanese book covers: one typeface, fixed margins, one small seal. Take the plain cover, the fixed margin and the single small mark. Avoid borders, gradients, foil and ornament.
6. Museum exhibition catalogues on uncoated stock. Take numbered plates and captions in small type at a fixed position on the grid. Avoid gallery-site cards and captions that appear only on hover.

## 3. Palette

Semantic tokens are declared on :root for the paper theme and overridden under [data-theme="ink"]. The paper values are the :root defaults and the ink values override them under [data-theme="ink"]. There is one theme per section and no system switch. Hex is sRGB. OKLCH values are computed by design/drafts/contrast-A.mjs.

| Token | Hex | OKLCH | Role |
|---|---|---|---|
| paper | #F2EDE3 | oklch(0.947 0.014 84.6) | Background of acts I and III, the uncoated stock. |
| paper-deep | #E7E0D2 | oklch(0.908 0.020 84.6) | Second paper: panels, hover rows and table bands in acts I and III. |
| ink | #14130F | oklch(0.186 0.008 95.5) | Background of act II (sumi ink). Also text-1 on paper. |
| ink-raised | #23211C | oklch(0.248 0.010 88.8) | Second ink: code panel, hover rows and panels in act II. |
| text-1 (paper) | #14130F | oklch(0.186 0.008 95.5) | Headings and body on paper. |
| text-2 (paper) | #4A463D | oklch(0.395 0.016 86.9) | Lede and secondary copy on paper. |
| text-3 (paper) | #5F5A4E | oklch(0.469 0.020 88.1) | Mono labels, captions and meta on paper. |
| text-1 (ink) | #EFEADC | oklch(0.937 0.019 90.5) | Headings and body on ink. |
| text-2 (ink) | #BDB7A8 | oklch(0.780 0.022 88.7) | Lede and secondary copy on ink. |
| text-3 (ink) | #A39D8E | oklch(0.697 0.022 88.8) | Mono labels and captions on ink. |
| rule (paper) | #CBC3B1 | oklch(0.819 0.026 86.9) | Decorative hairlines on paper. Not text, no minimum. |
| rule (ink) | #3A372F | oklch(0.337 0.014 89.9) | Decorative hairlines on ink. Not text, no minimum. |
| rule-strong (paper) | #7E7767 | oklch(0.571 0.025 87.2) | Field borders, UI boundaries and link underlines on paper. 3:1 minimum. |
| rule-strong (ink) | #8A8474 | oklch(0.614 0.025 89.9) | Field borders, UI boundaries and link underlines on ink. 3:1 minimum. |
| accent | #B5392B | oklch(0.524 0.163 29.9) | Seal red: kireji block, seal stamp, selection and button hover fill. Fill only, never body text. |
| accent-text (paper) | #9B2D21 | oklch(0.465 0.148 29.9) | Accent for text, links and focus on paper. Passes 4.5:1 on paper and paper-deep. |
| accent-text (ink) | #EE7A64 | oklch(0.707 0.148 32.1) | Accent for text, links and focus on ink. Passes 4.5:1 on ink and ink-raised. |
| on-accent | #F2EDE3 | oklch(0.947 0.014 84.6) | Text on accent fills. Same value as paper. |
| focus (paper) | #9B2D21 | oklch(0.465 0.148 29.9) | Focus ring on paper. 2px. |
| focus (ink) | #EE7A64 | oklch(0.707 0.148 32.1) | Focus ring on ink. 2px. |
| block (paper) | #1E1D19 | oklch(0.230 0.008 95.4) | 3D block base colour in acts I and III. |
| block (ink) | #E4DECD | oklch(0.901 0.024 90.8) | 3D block base colour in act II. |

Contrast table. Output of `node design/drafts/contrast-A.mjs`, pasted verbatim. Body text needs 4.5:1, large text and UI need 3:1. Nothing below its minimum ships.

```
self-test black on white contrast: 21.000 (expected 21) OK
self-test white OKLCH lightness: 1.000 (expected 1) OK

| Pair | Foreground | Background | Ratio | Minimum | Result |
|---|---|---|---|---|---|
| Body and headings, paper | text-1 paper #14130F | paper #F2EDE3 | 15.93:1 | 4.5:1 | PASS |
| Secondary text, paper | text-2 paper #4A463D | paper #F2EDE3 | 8.05:1 | 4.5:1 | PASS |
| Tertiary text and mono labels, paper | text-3 paper #5F5A4E | paper #F2EDE3 | 5.88:1 | 4.5:1 | PASS |
| Body and headings, paper-deep | text-1 paper #14130F | paper-deep #E7E0D2 | 14.15:1 | 4.5:1 | PASS |
| Secondary text, paper-deep | text-2 paper #4A463D | paper-deep #E7E0D2 | 7.16:1 | 4.5:1 | PASS |
| Tertiary text and mono labels, paper-deep | text-3 paper #5F5A4E | paper-deep #E7E0D2 | 5.23:1 | 4.5:1 | PASS |
| Accent text (links, code keywords), paper | accent-text paper #9B2D21 | paper #F2EDE3 | 6.45:1 | 4.5:1 | PASS |
| Accent text, paper-deep | accent-text paper #9B2D21 | paper-deep #E7E0D2 | 5.73:1 | 4.5:1 | PASS |
| Default button label, paper (paper on ink) | paper #F2EDE3 | ink #14130F | 15.93:1 | 4.5:1 | PASS |
| Hover button label and selection, both themes (on-accent on accent) | on-accent #F2EDE3 | accent #B5392B | 5.02:1 | 4.5:1 | PASS |
| Pressed button label, paper (paper on accent-text) | paper #F2EDE3 | accent-text paper #9B2D21 | 6.45:1 | 4.5:1 | PASS |
| Field border and UI boundary, paper | rule-strong paper #7E7767 | paper #F2EDE3 | 3.81:1 | 3.0:1 | PASS |
| Focus ring, paper | focus paper #9B2D21 | paper #F2EDE3 | 6.45:1 | 3.0:1 | PASS |
| Focus ring, paper-deep | focus paper #9B2D21 | paper-deep #E7E0D2 | 5.73:1 | 3.0:1 | PASS |
| Body and headings, ink | text-1 ink #EFEADC | ink #14130F | 15.47:1 | 4.5:1 | PASS |
| Secondary text, ink | text-2 ink #BDB7A8 | ink #14130F | 9.30:1 | 4.5:1 | PASS |
| Tertiary text and mono labels, ink | text-3 ink #A39D8E | ink #14130F | 6.88:1 | 4.5:1 | PASS |
| Body and headings, ink-raised | text-1 ink #EFEADC | ink-raised #23211C | 13.38:1 | 4.5:1 | PASS |
| Secondary text, ink-raised | text-2 ink #BDB7A8 | ink-raised #23211C | 8.04:1 | 4.5:1 | PASS |
| Tertiary text and mono labels, ink-raised | text-3 ink #A39D8E | ink-raised #23211C | 5.95:1 | 4.5:1 | PASS |
| Accent text (links, code keywords), ink | accent-text ink #EE7A64 | ink #14130F | 6.73:1 | 4.5:1 | PASS |
| Accent text, ink-raised | accent-text ink #EE7A64 | ink-raised #23211C | 5.82:1 | 4.5:1 | PASS |
| Default button label and selection, ink (ink on text-1) | ink #14130F | text-1 ink #EFEADC | 15.47:1 | 4.5:1 | PASS |
| Hover button label, ink (ink on accent-text) | ink #14130F | accent-text ink #EE7A64 | 6.73:1 | 4.5:1 | PASS |
| Field border and UI boundary, ink | rule-strong ink #8A8474 | ink #14130F | 4.99:1 | 3.0:1 | PASS |
| Focus ring, ink | focus ink #EE7A64 | ink #14130F | 6.73:1 | 3.0:1 | PASS |
| Focus ring, ink-raised | focus ink #EE7A64 | ink-raised #23211C | 5.82:1 | 3.0:1 | PASS |

RESULT: all pairs pass
```

Pressed states on ink use the accent fill with on-accent text (5.02:1, the hover pair in the table). Block colours are not text and have no minimum; they are checked by eye in the act II screenshot.

## 4. Typography

Two families only, both self-hosted variable fonts from Fontsource 5.3.0. Newsreader Variable (@fontsource-variable/newsreader@5.3.0) is the serif for everything a reader is meant to read. It has a true optical-size axis, so the 224px name keeps the fine, cut-looking hairlines of a catalogue heading while the 16px body reads as a text face. Geist Mono Variable (@fontsource-variable/geist-mono@5.3.0) is the only other face. Its neutral grotesque-mono forms sit with the Swiss grid labels, set code plainly, and are tabular by design, so numbers align in columns. No italic is loaded, no display grotesk is used, and no system face is used for display.

Files, read from the packages with a binary table parser (fvar and GSUB/GPOS feature lists read from the WOFF2 files, not from the CSS):
- Newsreader: `newsreader-latin-opsz-normal.woff2`, 132,000 bytes. Axes: wght 200 to 800, default 400. opsz 6 to 72, default 18. GSUB features: liga, pnum, rvrn, tnum. GPOS: kern.
- Geist Mono: `geist-mono-latin-wght-normal.woff2`, 23,128 bytes. Axis: wght 100 to 900, default 400. GSUB features: ccmp, dnom, frac, locl, numr. GPOS: mark, mkmk. No kern feature, since it is monospace.
- Glyph coverage of both Latin files: “ ” ‘ ’ – — · × − … ° ± / % & # @ are present. → ← ≈ ≤ ≥ are absent in both. Arrows are drawn as SVG: a 12px long, 1px hairline with a 4px head.
- Budget: the two files total 155,128 bytes (151.5 KiB). Architecture section 9 allows 120 KB of fonts. The subset rule below brings the total under budget and is the required step. Perf runs it with fonttools pyftsubset and measures the result before merge; the subset was not run for this draft. Subset to unicode U+0020-007E, U+00A0, U+00B7, U+00D7, U+2009, U+2013, U+2014, U+2018, U+2019, U+201C, U+201D, U+2026, U+2212. Keep both axes of Newsreader. Keep layout features kern, liga, pnum and tnum for Newsreader and no features for Geist Mono. Output names: `public/fonts/newsreader-var-subset.woff2` and `public/fonts/geistmono-var-subset.woff2`.

Axes used. Newsreader wght: 300 (display-xxl), 340 (display-xl), 360 (display-l), 420 (heading), 380 (lede), 400 (body, small). Newsreader opsz: automatic everywhere except display-xxl. Automatic follows the font size in px: 13 to 72 across this scale, and the browser holds the axis at its maximum of 72 above that. Geist Mono wght: 500 for labels, 400 for code and table figures.

Type scale. Sizes are CSS clamp() with the minimum at a 375px viewport and the maximum at a 2560px viewport. The preferred value is linear between them: slope = (max − min) / 2185 px per px, intercept = min − 375 × slope. Viewport widths beyond 2560px hold the maximum.

| Style | Font | Size | Line-height | Letter-spacing | Weight | opsz | Other features |
|---|---|---|---|---|---|---|---|
| display-xxl (hero name) | Newsreader | clamp(56px, 27.17px + 7.689vw, 224px) | 0.92 | -0.035em | 300 | 72 (pinned) | kern, liga; hyphens none |
| display-xl (section titles) | Newsreader | clamp(44px, 28.21px + 4.211vw, 136px) | 0.98 | -0.028em | 340 | auto | kern, liga |
| display-l (closing lines, figures) | Newsreader | clamp(32px, 23.76px + 2.197vw, 80px) | 1.04 | -0.020em | 360 | auto | kern, liga; pnum for prose figures, tnum for the speed figure |
| heading (h3, group titles) | Newsreader | clamp(22px, 19.60px + 0.641vw, 36px) | 1.12 | -0.012em | 420 | auto | kern, liga |
| lede | Newsreader | clamp(19px, 17.46px + 0.412vw, 28px) | 1.36 | 0 | 380 | auto | kern, liga, pnum |
| body | Newsreader | clamp(16px, 15.31px + 0.183vw, 20px) | 1.55 | 0 | 400 | auto | kern, liga, pnum |
| small (captions, footnotes) | Newsreader | clamp(13px, 12.66px + 0.092vw, 15px) | 1.50 | 0.005em | 400 | auto | kern, liga |
| label (mono caps) | Geist Mono | clamp(12px, 11.66px + 0.092vw, 14px), uppercase | 1.20 | 0.12em | 500 | not applicable | none; font-optical-sizing none |
| code | Geist Mono | clamp(13px, 12.49px + 0.137vw, 16px) | 1.60 | 0 | 400 | not applicable | font-variant-ligatures none; tab-size 2 |

Rules.
- Kerning: `font-kerning: normal` on html. Newsreader text sets `font-feature-settings: "kern" 1, "liga" 1`. Do not set dlig, smcp or any feature the file does not have.
- Numerals: prose and headings use proportional figures, `"pnum" 1`. The speed figure, pricing figures and any column of numbers use `"tnum" 1`. Geist Mono numbers are tabular by design and take no feature setting.
- Optical sizing: `font-optical-sizing: auto` on Newsreader. Display-xxl sets `font-variation-settings: "opsz" 72` explicitly. Geist Mono sets `font-optical-sizing: none`.
- Hanging punctuation: the declaration `hanging-punctuation: first allow-end last` is set on body for Safari. Chromium and Firefox ignore it, so the fallback is required everywhere. Wrap an opening quotation mark or apostrophe that starts a line in `<span class="hang">` and set `.hang { margin-inline-start: -0.4em; }`. Lists use `padding-inline-start: 1.2em; text-indent: -1.2em;` with the marker set as a mono label. Check each fallback in the 1440px screenshot: the glyph edge must line up with the text edge below it.
- Widows: h1, h2 and h3 use `text-wrap: balance`. Paragraphs use `text-wrap: pretty`. Use a no-break space (U+00A0) between a number and its unit (5&nbsp;MB), between Haiku and 5.5 (Haiku&nbsp;5.5), and after the single-letter words a and I. Headlines do not end on a single word: the balance rule covers it, and the line break is checked at 375, 768 and 1440.
- Line length: body max-width 62ch. Lede max-width 44ch. Display-xl and display-l max-width 12em. Labels have no measure.
- Hyphenation: `hyphens: manual` everywhere. The page never hyphenates automatically.
- Case: uppercase only for the label style. Sentence case everywhere else.

## 5. Grid and spacing

The grid is the page's structure, and the object follows it. Desktop uses 17 columns in groups 5|7|5: group A is columns 1 to 5, group B is columns 6 to 12, group C is columns 13 to 17. Group boundaries are marked by a 1px rule-strong hairline in the label row only, at the 5|6 and 12|13 boundaries.

Breakpoints and values.

| Viewport | Columns | Page padding (each side) | Gutter | Content width | Column width at this width |
|---|---|---|---|---|---|
| 1024px and up | 17 | clamp(32px, 5.5vw, 160px) | clamp(10px, 0.8vw, 20px) | min(100%, 2240px), centred | 44.20px at 1024; 64.55px at 1440; 112.94px at 2560 |
| 768px to 1023px | 5 | 32px | 12px | 100% minus 64px | 131.20px at 768 |
| 375px to 767px | 5 | 16px | 8px | 100% minus 32px | 62.20px at 375 |

Collapse. At 1024px and up the grid has 17 columns. Below 1024px it folds to 5. Between 768px and 1023px the page has 5 columns; the 5|7|5 bands become three full-width bands. At 375px the padding falls to 16px and the gutter to 8px, and every text block spans all 5 columns except labels, which span 2.

Content maximum. The content width is capped at 2240px and centred. At 2560px the padding is 140.8px and the 2240px maximum makes each side 160px, so the 3D canvas still fills the full viewport and only the type stops growing. The content max-width stops at 2560px: above that, the margins grow and the content stays at 2240px.

Spacing scale. The tokens are seeded with 5 and 7 and each token is the sum of the two before it: 5, 7, 12, 19, 31, 50, 81, 131, 212.
- space-1: 5px
- space-2: 7px
- space-3: 12px
- space-4: 19px
- space-5: 31px
- space-6: 50px
- space-7: 81px
- space-8: 131px
- space-9: 212px

Section vertical padding is clamp(81px, 9vw, 212px), which is space-7 at the narrow end and space-9 at the wide end. Gap between a label row and its text is space-2 (7px). Gap between a figure and its caption is space-3 (12px). Hairline offsets from a rule are space-1 (5px).

## 6. Easing library

Seven named curves. Each is a cubic-bezier(x1, y1, x2, y2) in CSS and in GSAP form through CustomEase.create(name, path). Values were checked with a scratch evaluator: x is monotonic on every curve, and the y range below is measured over 4000 samples. Code exports the names as `E` (strings) and `ef` (functions, from the same table, solved by bisection on x to 1e-10).

| Name | cubic-bezier | GSAP CustomEase path | Measured y range | Character | Used for | Never used for |
|---|---|---|---|---|---|---|
| cut | cubic-bezier(0.10, 0.90, 0.05, 1.00) | M0,0 C0.1,0.9 0.05,1 1,1 | 0 to 1.000; y = 0.897 at 25% of duration | Fast out, hard stop. Most of the motion is done in the first quarter. | Lead elements, kireji block, hairline retraction, hover underline draw, cursor shape changes, block lift on hover. | Long movements, scrubbed camera moves, anything that must read as soft. |
| settle | cubic-bezier(0.30, 0.50, 0.10, 1.00) | M0,0 C0.3,0.5 0.1,1 1,1 | 0 to 1.000; y = 0.636 at 25%, 0.911 at 50%, 0.984 at 75% | Long settle. Arrives, then takes its time in a long tail. | Followers of every stagger, text lines, block entrances, the figure count-up, the column settle after a stop. | Opacity-only fades (use fade), camera moves (use sym). |
| anticipate | cubic-bezier(0.40, -0.60, 0.20, 1.00) | M0,0 C0.4,-0.6 0.2,1 1,1 | -0.135 minimum, then 0 to 1.000 | Dips below its start before it moves. | Only the kireji block, at the start of the race and of the column move (z = 0.6 × curve value, section 11). | Any text, any UI, any other block. |
| follow | cubic-bezier(0.25, 0.80, 0.35, 1.10) | M0,0 C0.25,0.8 0.35,1.1 1,1 | 0 to 1.0186 (1.86% overshoot) | Small follow-through. Lands, then gives a little. Not a spring. | Block lift return on the closing reading rule and on the family tier labels. | Anything with more than 3% overshoot, and the closing column. |
| sym | cubic-bezier(0.62, 0.00, 0.38, 1.00) | M0,0 C0.62,0 0.38,1 1,1 | 0 to 1.000; y(0.5) = 0.5 exactly | Symmetric in and out, point-symmetric about the centre. | Every scrubbed camera move, every scrubbed formation transition, race offset. | Time-based entrances and opacity. |
| fade | cubic-bezier(0.30, 0.10, 0.20, 1.00) | M0,0 C0.3,0.1 0.2,1 1,1 | 0 to 1.000; y = 0.392 at 25%, 0.815 at 50% | Gentle opacity crossfade. No movement implied. | Opacity only: text fades, the preloader counter, reduced-motion crossfades, the closing text reveal. | Any transform. Any movement, including 1px. |
| bleed | cubic-bezier(0.55, 0.05, 0.25, 1.00) | M0,0 C0.55,0.05 0.25,1 1,1 | 0 to 1.000; y = 0.131 at 25%, 0.699 at 50%, 0.953 at 75% | Slow start, then the ink flows and finishes slowly. | The ink front at act boundaries, scrubbed on scroll. | Blocks, text, cursor and anything time-based. |

## 7. Timing scale and stagger

Durations, all derived from 5, 7 and 17 (tenths or hundredths of a second) or from products of them. Code exports them as `T`.

| Token | Seconds | Derivation | Used for |
|---|---|---|---|
| T.snap | 0.05 | 5 hundredths | Press states, focus ring appearance, cursor shape swap. |
| T.micro | 0.17 | 17 hundredths | Hover, underline draw, cursor follow lag, the lead delay before followers, block lift. |
| T.half | 0.35 | 0.5 × 0.7 (5 × 7 hundredths) | Block entrance and handoff, pointer damping time constant, the stagger total for 5 items. |
| T.beat5 | 0.5 | 5 tenths | Text lines, lead tweens, reduced-motion crossfades, the kireji entrance. |
| T.beat7 | 0.7 | 7 tenths | Standard entrance, follower tween duration, the stagger total for 17 items. |
| T.breath | 1.7 | 17 tenths | Column settle after scroll stops, closing text reveal, the ink front hold after a boundary completes. |
| T.long | 3.4 | 2 × 1.7 | Idle micro-motion period for every block, keep-alive cycle. |

Stagger profile. Offsets are non-uniform and come only from `weightedStagger(count, { total, lead, weight })`, which returns seconds (or normalised 0 to 1 for scrub). The front profile is offset_i = total × sqrt(i / (count − 1)), so the gaps shrink along the sequence. The back profile is total × (1 − sqrt(1 − i / (count − 1))), so the gaps grow. The center profile is total × sqrt(|2i / (count − 1) − 1|), so the centre item moves first. The square root is a stagger distribution over indices, never a tween easing. The lead element is always the first item in the array passed in, and `lead` is added to every other item's offset. A call with lead 0.17 therefore makes the lead start 0.17 s before the rest.

Worked example, 5 items, front profile, total T.half (0.35 s), each item tweened over T.beat7 (0.7 s) with settle. Offsets in seconds: [0.0000, 0.1750, 0.2475, 0.3031, 0.3500]. Gaps: 0.1750, 0.0725, 0.0556, 0.0469. Overlap ratio between consecutive items = 1 − gap / 0.7 = 0.750, 0.896, 0.921, 0.933.

Worked example, 17 items, front profile, total T.beat7 (0.7 s), each item tweened over T.beat7 (0.7 s) with settle. Offsets in seconds, index 0 to 16:
0.0000, 0.1750, 0.2475, 0.3031, 0.3500, 0.3913, 0.4287, 0.4630, 0.4950, 0.5250, 0.5534, 0.5804, 0.6062, 0.6310, 0.6548, 0.6778, 0.7000.
Gaps run from 0.1750 (between 0 and 1) to 0.0222 (between 15 and 16). Overlap ratio between consecutive items runs from 0.750 to 0.968. The first five offsets equal the 5-item example, because 0.35 over four steps and 0.7 over sixteen steps give the same square-root coefficient, 0.175.

Scrubbed stagger, used in formations. The normalised transition has total 0.35 of the transition span. Item i starts at o_i = 0.35 × sqrt(i / 16), which is 0.0875 × sqrt(i). Its local progress is clamp((t − o_i) / 0.65, 0, 1). Item 1 starts at 0.0875, item 16 at 0.3500. Lead in a scrub is 0.10 of the transition span: on a 1.7 s transition that is 0.17 s, so the same feel holds.

Overlap ratio rule for every stagger: 1 − gap / duration must sit between 0.75 and 0.97. Any stagger that falls outside this range is refused in review.

Rhythm by act. Each act has one quick thing and one slow thing, so the rhythm changes section to section.
- Act I (paper, the quick act): text enters on T.beat7 with settle and T.half for blocks. The speed race takes its time through a sym scrub across 40% of the section. The figure counts up on settle over the rest.
- Act II (ink, the slow act): capabilities and family scrub on sym for the whole group segment, with settle on text. The code section is the one cut: each line is revealed on T.micro with cut. The ink front takes T.breath to hold after each boundary.
- Act III (paper, the breath): pricing is quick (T.beat5 row fades on T.half offsets). The closing column takes the most time on the page: a sym scrub over 40% of the section and a T.breath text reveal after the stop. The footer is still for one viewport height.

## 8. Motion principles

1. The lead element of every group starts 0.17 s before its followers and uses cut. Followers use settle. A group with no lead is a defect.
2. Only the seven curves in section 6 exist in the code. A grep for cubic-bezier outside src/core/ease.ts returns nothing. The easings CSS ease, ease-in, ease-out and linear are never used for motion.
3. Every duration comes from the T table. A literal number of seconds in a tween is a defect.
4. Staggers are never uniform. The offsets come from weightedStagger, and the overlap ratio of every pair sits between 0.75 and 0.97.
5. Scroll-linked motion is scrubbed with sym for camera and formations, with bleed for ink, and with settle for text. No scroll position starts a timed tween.
6. Entrances never translate text. Text enters by opacity (fade, T.beat5) or by a variable axis or letter-spacing change, never by a position change.
7. Entrance micro-motions (lifts, tilts, lead dips) stay within 0.6 world units or 24px. Formation transitions are scrubbed moves and are exempt. The kireji anticipate dip is 0.08 world units (0.6 × 0.135).
8. Every section has a live element after its entrance: an idle micro-motion on T.long (blocks), a scrubbed value, or a moving reading rule. No section is still for a full viewport of scroll.
9. Pointer response is damped with a time constant of T.half, and capped at 0.05 rad of rotation or 0.16 world units of offset.
10. Nothing starts on a timer alone. Entrances start on loader:done or on a scroll position, and the only loop is the T.long idle cycle.
11. Reduced motion has an instant alternative for every tween: the final state is set with no scrub, and the only transition is a fade at T.beat5.
12. The kireji is the only seal-coloured 3D object and the only block that receives anticipate. Every other block stays in its act's block colour.

## 9. Cursor per section

On a fine pointer the native cursor is replaced by a custom cursor in section-specific form. The cursor is a 2D element in the cursor layer (z-index 50, pointer-events none). Its position is damped with T.micro. Colour is text-1 of the section's theme.

| Section | Cursor | Size and shape | Why it means something there |
|---|---|---|---|
| preloader | none | none | Nothing can be pointed at until the object exists. |
| hero | registration mark | ring 17px diameter, 1px stroke, arms 9px each side, 1px | A printer's mark placed on a plate: the reader is registering the page. |
| speed | tick | 1px wide, 24px tall, vertical | It reads the measure. Moving across the race reads position on the scale. |
| capabilities | dot | disc 6px diameter | A single point on a row. It marks the group being read. Hovering a row tilts it. |
| code | text cursor | native I-beam, no custom element | Text is selectable, so the native cursor is the honest one. |
| family | registration mark, becomes bar over a tier label | mark as in hero; bar is 1px by 16px | Over a tier label the bar points at the stack that label names. |
| pricing | native | native | Prices are read and copied, so no decoration. |
| closing | reading rule | 1px horizontal line, the full content width (min(100%, 2240px)) | A rule laid under the line being read. The nearest block lifts so the reader sees which line is current. |
| footer | native | native | A utility area. Links use the native pointer. |

Touch and keyboard. On touch (`touch` class), no custom cursor is drawn and no pointer tilt is applied. Tap on a capability navigation link scrolls to that group. Taps never change the 3D state except through scroll. Keyboard: every link and button is in the tab order, the focus ring is shown (section 13), and no 3D element takes focus. The three capability links (01, 02, 03) move the stage to the matching group segment with scrollToTarget.

## 10. 3D direction

Units: one world unit. Blocks are the only meshes. The background is one fullscreen shader quad.

Block geometry. Each block is a rounded box 0.8 wide (x), 0.8 high (y) and 0.4 deep (z). Corner radius 0.024. Within a row the gap is 0.16 (pitch 0.96). Between rows the gap is 0.32 (pitch 1.12). In the column the gap is 0.16 (pitch 0.96). All 17 blocks are identical in size. The rounded box uses RoundedBoxGeometry with radius 0.024 and 3 segments. Instancing: one InstancedMesh of 17 instances, with material colour #FFFFFF and per-instance colour carrying the block colour.

Material. MeshPhysicalMaterial, roughness 0.42, metalness 0.0, clearcoat 0.35, clearcoatRoughness 0.28 in acts I and III, with instance colour #1E1D19. In act II the instance colour is #E4DECD, roughness 0.46, clearcoat 0.25, clearcoatRoughness 0.30. The kireji is instance 4 with colour #B5392B, roughness 0.36, clearcoat 0.50, clearcoatRoughness 0.22.

Micro-surface. A procedural normal map, generated once on a 512 by 512 canvas, carries machining marks: 77 fine horizontal grooves per face, spaced 0.0104 world units (77 × 0.0104 = 0.80), 0.0006 units deep, with a sine profile. Normal scale 0.35 in x and y. Roughness varies by ±0.04 across the face through a second procedural map, so highlights are slightly streaked across the grooves. Edges show no bevel beyond the corner radius.

Kireji. Index 4, the fifth block of the first row. The haiku's kireji is the cutting word: the place where the poem turns on a pause. Placing it at index 4 puts the cut after the first five syllables, which is the first line. It leads the race and leads the move into the column. It is the only block that carries the accent colour, so the cut is visible in every formation.

Lighting rig, in world space, all lights in the scene:
- Key: DirectionalLight, position (3.5, 5.5, 6.0), target (0, 0, 0), colour #FFF6E8, intensity 2.1, casts shadows. Shadow map 1024 by 1024, PCFSoftShadowMap, orthographic camera left -5, right 5, top 5, bottom -5, near 1, far 20, bias -0.0004, normalBias 0.02.
- Fill: HemisphereLight, sky colour #F2EDE3, ground colour #14130F, intensity 0.45.
- Rim: DirectionalLight, position (-4.0, 2.0, -5.0), colour #E8E0CF, intensity 0.9, no shadow.
- Seal glow: PointLight, position (1.2, 2.4, 2.8), colour #EE7A64, intensity 0.6, decay 2, distance 8. It lights the seal block's upper edge only.

Environment without asset files. A procedural room is built in code: a box 12 units wide, 8 high and 12 deep, interior colour #F2EDE3 with MeshBasicMaterial multiplied by 0.18. A softbox plane 3 by 2 units, centred at (0, 4, 0), faces down with colour #FFF6E8 multiplied by 6.0. PMREMGenerator.fromScene(room, 0.04, 0.1, 100) produces scene.environment, and scene.environmentIntensity is 0.55. The room is disposed after the PMREM pass.

Camera. PerspectiveCamera, fov 24, near 0.1, far 80, default position (0, 0, 22), target (0, 0, 0). Visible height at distance 22 is 9.352 units and visible width at 16:9 is 16.627 units. Portrait (aspect below 0.8): the distance doubles to 44 for hero, speed, capabilities, code, family and pricing. Closing and footer use 44 in portrait and 40 in landscape. The closing distance is 40 in landscape: visible height 17.005 units, enough for the 16.16-unit column with margin.

Paper and ink background shader. A fullscreen triangle, depthWrite false, drawn before the blocks.
- Paper base: #F2EDE3. Fibre: value noise, 3 octaves, sampled at (px.x / 280, px.y / 6) so the fibres run horizontal. Amplitude ±0.012 in sRGB, lighter where the noise is above 0.5 and darker below.
- Ink base: #14130F. Fibre: same noise, amplitude ±0.010 in sRGB, lighter fibres only.
- Vignette: darkens by 0.06 at the edges, with smoothstep from 0.55 to 1.15 of the normalised radius (x scaled by aspect).
- Dither: triangular noise of ±1/255 added to the final colour to stop banding in the ink tones.

Ink-bleed transition. Two boundaries: the top of capabilities (paper to ink) and the top of pricing (ink to paper). Let yB be the boundary's screen position as a fraction of viewport height, 0 at the top. Let d = yB − y for points above the boundary. The bleed front reaches spread = p × 0.32 viewport heights above the boundary. The ink fraction at a point above the boundary is 1 − smoothstep(spread − 0.012, spread + 0.012, d + (n − 0.5) × 0.12), where n is 4-octave fbm over domain-warped coordinates with warp 0.24 and scale 2.6 across the viewport width. The front edge is therefore soft at 0.012 viewport heights and fibrous. Points below the boundary are ink on the paper-to-ink boundary. On the ink-to-paper boundary the same mask gives the paper fraction, with the regions swapped. Timing: s = clamp((0.85 − topY) / 0.6, 0, 1), where topY is the section top as a viewport fraction. p = bleed(s). The front starts when the section top crosses 85% of the viewport height and completes when it reaches 25%. At 25% the front has spread 0.32 above the boundary, which covers the viewport.

Post-processing (postprocessing library). One RenderPass for the blocks, one EffectPass for the combined effects and one separate EffectPass for depth of field.
- Bloom: BloomEffect with luminanceThreshold 0.92, luminanceSmoothing 0.05, intensity 0.12, radius 0.4, mipmapBlur true. This is the one exception in section 14.
- Chromatic aberration (misregistration): ChromaticAberrationEffect, horizontal offset 0.0 px at rest and 0.6 px at scroll velocity of 2400 px/s or more. The offset is linear in |velocity| / 2400, clamped to [0, 1], and damped with T.micro. Convert px to uv as offset_uv = px / drawing-buffer width.
- Grain: NoiseEffect, blend ADD, opacity 0.028 (peak 7 of 255 levels), per device pixel, re-seeded every frame. In reduced motion the grain is static.
- Depth of field: DepthOfFieldEffect, focusDistance 0.2741 (the normalised depth of 22 units with near 0.1 and far 80), focalLength 0.02. bokehScale = 2.2 × recede progress (0 to 1), so the effect is disabled outside the code section.

Smear. setVelocity(v) drives a stretch along the velocity axis: the race stretches by up to 35% of its block width at 2400 px/s. Stretch is zero at rest.

Idle micro-motion. Each block's z offset is 0.012 × sin(2π × t / 3.4 + i × 0.37) world units, with rotation y of 0.004 × sin(2π × t / 3.4 + i × 0.61) radians. Phase depends on the index, so no two blocks move together.

Pointer tilt. The block group rotates y by pointer.sx × 0.035 rad and x by −pointer.sy × 0.025 rad, with damping time constant T.half. Caps at ±0.05 rad. Off on touch and in reduced motion.

## 11. Formations

Coordinates are in block units, world space: x right, y up, z toward the camera. Group offsets set by a section are applied on top. Index i is the same block everywhere. Row A is indices 0 to 4, row B is 5 to 11, row C is 12 to 16. Each entry gives x, y, z and rotation. Scale is 1 unless stated.

stanza. The three rows as set on the page, the haiku's 5-7-5 read as lines. Row A (y = 1.12): indices 0 to 4 at x = -1.92, -0.96, 0, 0.96, 1.92. Row B (y = 0): indices 5 to 11 at x = -2.88, -1.92, -0.96, 0, 0.96, 1.92, 2.88. Row C (y = -1.12): indices 12 to 16 at x = -1.92, -0.96, 0, 0.96, 1.92. z = 0, rotations 0. Entering stagger: array order is index 4 first (lead, on cut), then 0 to 3, then 5 to 16, with the front profile over total T.half and followers on settle. This is the handoff from the preloader.

race. One line, the speed section's only formation. x_i = (i − 8) × 0.96, so index 0 is at -7.68 and index 16 at +7.68. y = 0, z = 0, rotations 0. The line is 16.16 units wide and runs past the frame at narrow aspects, which is the point. Entering stagger: the kireji leads with anticipate over the first T.beat5 of its window, with z = 0.6 × curve value, so it dips 0.08 units back before it comes forward. The other 16 follow in index order with settle and the front profile over a scrub total of 0.35, lead 0.10.

cap-0. Row A is the active group. Row A: y = 1.12, x as stanza, z = +0.6, rotation y 0, scale 1. Rows B and C are inactive: y as stanza, x as stanza, z = -1.2, rotation y = -0.14 rad, scale 0.92. Entering stagger: active row first, index order, with cut for the lead (index 0) and settle for the rest. Inactive rows follow after lead 0.17.

cap-1. Row B is the active group: y = 0, x as stanza, z = +0.6, rotation y 0, scale 1. Rows A and C are inactive as in cap-0. The stagger from cap-0 is row B first, then A and C after lead 0.17.

cap-2. Row C is the active group: y = -1.12, x as stanza, z = +0.6, rotation y 0, scale 1. Rows A and B are inactive as in cap-0. Stagger as in cap-1, with row C first.

recede. The blocks step back and to the right so the code can be read on the left. x_i = 0.6 × stanza_x_i + 3.6, y_i = 0.6 × stanza_y_i, z = -2.4, scale 0.72, rotation 0. From cap-2 the stagger is reverse index order with lead index 16 on cut, followers on settle with the front profile over a scrub total of 0.35. The DoF bokeh scales with recede progress, so the blocks soften as they go back.

family. Three stacks, one per tier. The left stack is indices 0 to 4 at x = -3.84, the middle stack is indices 5 to 11 at x = 0, and the right stack is indices 12 to 16 at x = +3.84. Within each stack the index runs top to bottom. Left: index 0 at y = 1.92, then 0.96, 0, -0.96, index 4 at y = -1.92. Middle: index 5 at y = 2.88, then 1.92, 0.96, 0, -0.96, -1.92, index 11 at y = -2.88. Right: index 12 at y = 1.92, then 0.96, 0, -0.96, index 16 at y = -1.92. z = 0, rotation 0, scale 1. The kireji sits at the foot of the left stack. Entering stagger: middle stack first in index order, flanks after lead 0.10 of the transition span, each flank in index order.

rest. The blocks lie down as type slugs. x_i = stanza_x_i, y_i = 0.8 × stanza_y_i (so the rows sit at 0.896, 0 and -0.896), z = 0, rotation x = -1.2 rad, rotation y = 0, rotation z = 0. Each slug presents a projected height of 0.66 units, so the rows keep a 0.23-unit clear gap. Entering stagger: index order, lead index 0 on cut, followers settle with the front profile over a scrub total of 0.35.

column. One vertical line, read top to bottom. x = 0, z = 0, rotations 0, scale 1. y_i = (8 − i) × 0.96: index 0 at 7.68, index 4 (kireji) at 3.84, index 8 at 0, index 12 at -3.84, index 16 at -7.68. The column is 16.16 units tall. Entering stagger from rest: the kireji leads with anticipate (z = 0.6 × curve value, as in race), followers settle in index order over a scrub total of 0.35, lead 0.10. This is the close of the page and the only place the blocks stand in one line.

## 12. Section choreography

Section list and acts from architecture section 4. Scroll lengths are the desktop targets: hero 2 vh, speed 3 vh, capabilities 3 vh, code 2 vh, family 2 vh, pricing 1.5 vh, closing 2.5 vh, footer 1 vh.

Shared values. Background paper or ink per section theme. The canvas is fixed and its background is transparent when WebGL is on. Group offsets: hero y −1.12, capabilities y +1.9, pricing y −2.5, footer x −6.0, all other sections 0. Camera per section in section 10.

preloader. Leads: the kireji block's entrance at loader:done.
- Before loader:done (real progress): three hairlines, each at the screen position of its row in stanza. Row A at 50% of the viewport height, row B at 62%, row C at 74%. Each hairline's length is the projected width of its row (5, 7 and 5 blocks), computed from the camera at load. Each fills from left to right with real progress, weighted by block count: row A 0.000 to 0.294, row B 0.294 to 0.706, row C 0.706 to 1.000. Counter: a mono label at the left under row C, three figures, tabular, from 000 to 100, rounded from progress × 100.
- Loader tasks and weights: fonts 0.20 (both woff2 files, preloaded), GL chunk 0.30, shader compile with renderer.compileAsync 0.30, environment PMREM 0.20.
- Handoff, starting at t = 0 at loader:done. Kireji (index 4) scales 0 to 1 with cut over T.beat5 (0.5 s). The three hairlines retract to scaleX 0 with cut over T.micro (0.17 s). The counter fades with fade over T.beat5. Followers (the other 16 blocks) start at 0.17 + the front offsets over total T.half (0.35 s): offset_i = 0.35 × sqrt(i / 16). Each follower scales 0 to 1 with settle over T.half (0.35 s). Last follower ends at 0.17 + 0.35 + 0.35 = 0.87 s.
- h1 letter-spacing goes from -0.05em to -0.035em with settle over T.beat7, starting at t = 0.17 s. The h1 is visible throughout, so this is a change of tracking on text the reader can already read.
- Budget. The preloader must end at 1.37 s after first paint on a good connection: loader:done by 0.50 s after first paint, handoff 0.87 s. Perf measures loader:done with a Playwright trace of the production build on localhost. The h1 is in the HTML and visible at first paint. The fallback face for the h1 is set in fonts.css with size-adjust chosen by perf so that the width of "Haiku 5.5" at 1440px matches the Newsreader width within 1px. The value is measured, not set here.
- 2D layer: the hairlines and counter sit in a fixed layer at bottom 16vh, pointer-events none, z-index 2, aria-hidden. The h1 sits above it in the document.
- 3D layer: none until loader:done. The canvas is hidden (opacity 0) during load.
- Pointer and touch: none.
- Keeps alive: not applicable. The preloader is removed after 0.87 s.
- Reduced motion: no hairline fill, counter shown at its final value 100, the handoff is instant: blocks set at stanza at loader:done, the preloader is removed with fade over T.beat5.
- No WebGL: the preloader counter and hairlines run as above. At loader:done the preloader fades out. The static stanza fallback in the hero is visible as soon as the preloader ends.

hero (act I, paper, 2 vh). Leads: kireji, then the h1 tracking.
- Sequence: t = 0.17 s h1 tracking settle. t = 0.87 s lede fade over T.beat5 (0.5 s), ends at 1.37 s. t = 1.02 s CTA row fade over T.beat5, ends at 1.52 s.
- 2D: h1 "Claude" on line 1 and "Haiku 5.5" on line 2, display-xxl, with the nbsp rule in section 4, at grid columns 1 to 11 with its top at 12% of the viewport height. From 1024px up, the lede sits at columns 12 to 17 with its top aligned to the top of the h1's second line, max 44ch, and the CTA row sits below it at columns 12 to 17 with a gap of space-5 (31px). Below 1024px the lede and CTA row stack under the h1 with a gap of space-5 (31px) and span all 5 columns.
- 3D: stanza, group y −1.12, so row B sits at 62% of the viewport height.
- Scroll: group y rises from −1.12 to −0.22 across the section (sym, scrub over 2 vh). h1 tracking scrubs from -0.035em at the top to -0.050em at the end (settle).
- Pointer: rows tilt with the pointer as in section 10. Touch: no tilt.
- Keeps alive: idle micro-motion on all 17 blocks (T.long cycle); the h1 tracking scrub keeps moving with scroll.
- Reduced motion: no handoff motion. Blocks are placed at stanza at loader:done. The lede and CTA row fade in with fade over T.beat5 at the same times. h1 static at -0.035em. No scrub, no tilt, no idle motion.
- No WebGL: an inline SVG of the stanza, rows as squares 0.8 units with rx 0.024 scaled to the layout, flat ink (#14130F) on paper, kireji in #B5392B. Placed in the .gl-fallback element at the same screen position as row B's centre (62% of the viewport height), aria-hidden.

speed (act I, paper, 3 vh). Leads: kireji on the race.
- Sequence: the scrub runs over the first 40% of the section's scroll: stanza to race with sym (camera holds at 22). After that the race holds. Race group x runs from 0 to −1.2 units across the rest of the section on sym.
- 2D: a scale axis along the bottom at 84% of the viewport height: 17 ticks, each 1px by 12px, at the centres of the 17 blocks. Tick i is text-3 until race progress reaches 0.40 + 0.50 × i / 16, then changes to text-1 with cut over T.micro. The figure in display-l, tnum, at columns 1 to 6 with its top at 62% of the viewport height, counts up from 0 to the value in research/facts.md on settle between 40% and 90% of the section scroll. The figure and its caption come from the facts file only. The facts file is absent from the repository, so no figure is set here and the count-up has no target until it is supplied.
- 3D: race, depth of field off, smear from scroll velocity.
- Pointer: race group x follows pointer.sx × 0.25 world units, damped with T.half. Touch: none.
- Keeps alive: the race holds with the idle micro-motion; smear decays with settle over T.beat7 when scroll stops.
- Reduced motion: race at its final position at section entry (no scrub). Ticks and figure set at final value. Section crossfade with fade over T.beat5 when 20% visible.
- No WebGL: an inline SVG row of 17 squares across the width at 50% of the viewport height, ink on paper, kireji in #B5392B, with the tick axis below.

capabilities (act II, ink, 3 vh). Leads: the active row lifts on cut.
- Sticky stage: the 3D stage and the three capability texts are inside a 100svh sticky element. The sticky hold is 2.0 vh (exception 1). Hold progress q runs from 0 to 1 over those 2 vh.
- Groups: cap-0 is active for q from 0 to 0.34, cap-1 from 0.34 to 0.67, cap-2 from 0.67 to 1. Each switch is a sym scrub over q of width 0.12, centred on the boundary (0.28 to 0.40 and 0.61 to 0.73).
- Entrance at section top: the active row (cap-0, row A) lifts on cut over T.beat5 (0.5 s), its inactive neighbours settle back over T.beat7 from 0.17 s (lead rule).
- 2D: group text blocks sit in the lower 40% of the viewport. Each block is a heading (group name from the facts file), a body paragraph and a label with the group's count (5, 7 or 5). Text switches with fade over the same switch windows.
- Navigation: three label links, 01, 02, 03, at the top left. They jump to the group's segment with scrollToTarget.
- 3D: cap formations as in section 11. Group offset y +1.9.
- Pointer: the active row tilts 0.05 rad maximum with pointer.sx and pointer.sy, damped with T.half. Touch: none.
- Keeps alive: idle micro-motion on all blocks, so the stage never freezes during the hold.
- Reduced motion: no sticky. Each group sits in order, its formation set instantly when its text is 20% visible, and the text crossfades with fade over T.beat5.
- No WebGL: each group block carries its own inline SVG row of 5, 7 or 5 squares, in paper on ink, kireji in #B5392B for the first row, placed beside its text.

code (act II, ink, 2 vh). Leads: the first code line, on cut.
- Sequence: the recede transition runs over the first 50% of the section's scroll (sym, reverse index order, the lead first with cut, followers settle with the front profile over a scrub total of 0.35). Code lines reveal from the top with fade over T.half, each line starting after the one before by the front profile over a total of T.beat7.
- 2D: the code panel is ink-raised at columns 1 to 9, vertically centred in the viewport, with mono code (code style). It carries a copy button in label style. A live line marker (2px wide accent-text ink bar at the left edge of the panel) moves to the line that matches section progress: line = floor(progress × line count), changed with cut over T.micro.
- 3D: recede, DoF bokeh scales from 0 to 2.2 with recede progress.
- Pointer: none on the 3D. Text cursor on the panel. Touch: none.
- Keeps alive: the live line marker moves with scroll; blocks idle.
- Reduced motion: lines all visible, marker static on line 1, recede set instantly, no DoF.
- No WebGL: an inline SVG of the recede layout at 0.6 scale (paper on ink) placed at the right of the panel, aria-hidden.

family (act II, ink, 2 vh). Leads: the middle stack on settle.
- Sequence: the family transition runs over the first 50% of the section scroll with sym. Stack order: middle stack first, then the flanks after a lead of 0.10 of the transition span (the scrub rule). Flanks drift outward by 0.48 world units across the section on sym.
- 2D: three tier labels, one under each stack, at 88% of the viewport height, label style, text from the facts file. Hover of a tier label lifts the top block of its stack by 0.16 units on cut over T.micro, and the lift returns on settle over T.beat7 when the pointer leaves. Labels are not focusable: the lift is a pointer enhancement, and the text carries the same information.
- Pointer: as above. Touch: tap the label lifts the stack, tap again returns it.
- Keeps alive: idle micro-motion; the drift continues with scroll.
- Reduced motion: stacks at family positions at section entry, no drift, no lift.
- No WebGL: an inline SVG of the three stacks, flat, paper on ink, kireji in #B5392B at the foot of the left stack.

pricing (act III, paper, 1.5 vh). Leads: the first pricing row, on fade.
- Sequence: family to rest over the first 40% of the section's scroll (sym). Rows of the pricing table reveal by opacity only: each row fades over T.beat5 (fade), and the row start offsets are weightedStagger(rowCount, { total: T.half, weight: 'front' }), computed from the actual row count.
- 2D: the pricing table sits in the top 50% of the viewport. Figures use tnum, labels use label style. Row hover sets the background to paper-deep with a T.micro cut. Rows are focusable; the focus ring is in section 13. The figures come from research/facts.md; the facts file is absent, so no figures are set here.
- 3D: rest, group y −2.5, rows at 67%, 77% and 86% of the viewport height.
- Pointer: none on blocks. Touch: none.
- Keeps alive: rest blocks idle with rotation z 0.003 × sin(2π × t / 3.4 + i × 0.37) radians.
- Reduced motion: rest at final state; rows visible with no reveal.
- No WebGL: an inline SVG of three rows of tipped slugs in ink on paper with the kireji in #B5392B, placed below the table.

closing (act III, paper, 2.5 vh). Leads: the kireji, on anticipate (section 11).
- Sequence: the scrub runs over the first 40% of the section's scroll on sym. Rest to column: the kireji leads on anticipate, and the other 16 settle in index order with lead 0.10. Camera distance goes from 22 to 40 on sym over the same span. After that the column holds.
- Text: the closing line is in display-l, set with writing-mode vertical-rl, text-orientation mixed, at columns 11 to 13 of the 17-column grid. It reveals with fade over T.breath (1.7 s) starting when the scrub reaches 40%.
- 2D reading rule: a 1px line the full content width (section 9) follows the pointer's vertical position with damping T.micro. The block nearest the rule lifts 0.08 world units on cut over T.micro, and settles back on settle over T.beat7 when the rule moves on.
- Pointer: the reading rule and lift above. Touch: none; the column holds still.
- Keeps alive: the column idle micro-motion; the text stays in place.
- Reduced motion: column at its final state at section entry, text visible at the final state, crossfade with fade over T.beat5 when 20% visible. No rule, no lift.
- No WebGL: an inline SVG of the column, flat, ink on paper, kireji in #B5392B at index 4, with the vertical text beside it.

footer (act III, paper, 1 vh). Leads: none. The column is held.
- Sequence: none. The column holds at x = −6.0 (landscape and portrait), camera 40 in landscape and 44 in portrait.
- 2D: footer links in label style and the copyright line in small. "Back to top" uses scrollToTarget with the page top. The footer copy comes from the copy owner.
- Pointer: native. Touch: none.
- Keeps alive: column idle micro-motion.
- Reduced motion: static.
- No WebGL: an inline SVG of the column at x = −6 in the layout, flat, ink on paper.

## 13. Focus and interaction states

Focus ring (focus-visible only, never on pointer click). Two pixels solid, outline-offset 3px, outline-style solid. Paper: #9B2D21 (3.0:1 minimum passed at 6.45:1 on paper). Ink: #EE7A64 (6.73:1 on ink). The ring appears with opacity over T.snap. No glow, no shadow.

Links. Text-decoration: underline with 1px thickness and underline-offset 0.18em, colour rule-strong (paper #7E7767, ink #8A8474). On hover the underline draws from the side the pointer entered: a ::after pseudo-element, 1px high and solid, is scaled on X from 0 to 1 with transform-origin set to the entry side. Entry side: the pointer position relative to the link's centre, left or right. The colour changes to accent-text (paper #9B2D21, ink #EE7A64) over T.micro. Draw uses cut over T.micro. On pressed the colour holds and nothing moves.

Buttons. Paper theme: default fill ink #14130F with paper text (15.93:1); hover fill accent #B5392B with on-accent text (5.02:1); pressed fill accent-text #9B2D21 with paper text (6.45:1). Ink theme: default fill text-1 #EFEADC with ink text (15.47:1); hover fill accent-text #EE7A64 with ink text (6.73:1); pressed fill accent #B5392B with on-accent text (5.02:1). Hover fill draws from the pointer's entry side with cut over T.micro, the same as the link underline. Pressed changes colour at T.snap. No transform on any state, so nothing bounces.

Hover on table rows and cards. Background becomes paper-deep (paper) or ink-raised (ink) with a cut over T.micro from the entry side. No shadow, no lift.

Selection. Paper: background accent, text on-accent. Ink: background text-1 (#EFEADC), text ink.

Cursor-direction response. The JS records the pointer entry side with mouseenter (client x against the element's centre). Left or right is written to data-enter, and the CSS reads it to set transform-origin for the fill or underline. Touch devices have no entry side and use the centre origin.

Reduced motion. All of the above change colour only, with no draw. Focus ring unchanged.

## 14. Ban list exceptions

1. Long pin (capabilities). The capabilities stage is a CSS position: sticky element held for 2.0 vh of native scroll inside a 3 vh section. It is not a GSAP pin, it does not hijack scroll speed or position, and the stage is released when the section ends. Reason: the three capability groups must be read in sequence against a stable 3D stage, and a 1.5 vh hold leaves each group 0.5 vh, which is too short to read a group's text. The director may reduce this to 1.5 vh, in which case the groups switch every 0.5 vh.
2. Smooth scrolling (every section). Lenis is kept with lerp 0.1 and wheel smoothing on, unless reduced motion is on. It smooths wheel and touch input, never snaps to sections, and never changes where a scroll lands. Every programmatic jump goes through scrollToTarget. Reason: the scrub maps look right only with continuous scroll values. It is not scroll-jacking, and it is listed here so the director can see it.
3. Bloom (the seal block, every act). A BloomEffect with luminanceThreshold 0.92 and intensity 0.12 is used on the specular highlight of the seal block. It is neutral, not coloured, and it touches no text. Reason: the lacquer highlight on the seal block must read as a machined edge, and without the bloom the highlight is a hard flat spot. The threshold is set so that only specular highlights exceed it.
4. Overshoot curve (follow). The follow curve overshoots by 1.86%. It is a small follow-through, not a spring: one overshoot, no oscillation, and the cap is 3%. It is used only on the block lift return (closing reading rule and family tier labels). Reason: the brief allows up to 3%, and a flat settle after a lift reads as dead.

No other banned item is used: no purple-to-blue gradient, no neon glow, no glassmorphism, no particles, no wireframe globes, no 20px fades, no default easings, no uniform staggers, no one-shot animation without a keep-alive, no bouncy springs, no emoji, no stock 3D, no AI imagery, no Anthropic logo or wordmark.

## 15. Open questions for the director

1. Font budget. The two Latin files total 155,128 bytes against the 120 KB font budget in architecture section 9. The subset rule in section 4 brings them under budget and is the recommended path. Subsetting was not run here: fonttools is not installed in this environment and was not installed. Decide: subset (recommended) or raise the budget.
2. Capabilities hold. Approve the 2.0 vh sticky hold (section 14, exception 1), or set the section to 1.5 vh with groups switching every 0.5 vh.
3. Missing facts. research/facts.md does not exist in the repository. The three capability group names, the three family tier names, the speed figure, and the pricing rows are missing. Until supplied, those slots show no text and no figure, and the count-up has no target.
4. Reading order. Confirm that the kireji is index 4, the cut after the first five, since the family, the column and the race lead all depend on it.
5. Preloader budget. Confirm perf can reach loader:done by 0.50 s after first paint on the production build with the GL chunk split as in section 12. If it cannot, the 1.5 s limit allows loader:done up to 0.63 s after first paint (0.63 + 0.87 = 1.50 s), and beyond that the limit breaks.
