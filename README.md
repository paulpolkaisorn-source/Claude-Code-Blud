# Gemini 4 Neon — 30 s motion teaser (unofficial fan concept)

> **Fan concept. Not affiliated with Google.** No official logos, wordmarks or brand fonts are used.
> The four-point star is an original mark (four separate neon tubes + a nucleus dot, outline only).
> No specs, prices, dates or benchmarks appear anywhere: every product line comes from `src/copy.ts`,
> which ships with `[FILL]` placeholders.

Remotion 4 + React Three Fiber. Everything is generated in code: no footage, no stock, no image files.
Deterministic: all motion is driven by `useCurrentFrame()`, randomness uses Remotion's seeded `random()`.

| Spec | Value |
| --- | --- |
| Compositions | `Teaser` 1920×1080, `TeaserVertical` 1080×1920 (same scenes, reframed layouts) |
| Frame rate / length | 60 fps, 1800 frames = 30.0 s |
| Grid | 120 BPM: beat = 30 f, bar = 120 f, half beat = 15 f (`src/timing.ts`) |

## Quick start

```bash
npm install
```

```bash
npm run dev
```

Fonts (`public/fonts`) and the placeholder audio (`public/audio`) are committed. To refetch / resynthesize:

```bash
npm run fonts
```

```bash
npm run audio
```

## Render

```bash
npm run render
```

```bash
npm run render:vertical
```

```bash
npm run render:prores
```

Outputs land in `out/`: `gemini4neon_1920x1080.mp4` and `gemini4neon_1080x1920.mp4` (H.264, CRF 18, AAC)
and `gemini4neon_master_4444.mov` (ProRes 4444, PCM audio). `remotion.config.ts` sets PNG intermediate
frames (no JPEG banding on the glow gradients) and `swangle` GL, which renders WebGL on the CPU so no GPU is
needed. On a machine with a GPU, switch `setChromiumOpenGlRenderer` to `"angle"` for a big speedup.

QA stills (one bundle, one browser, many frames):

```bash
node scripts/stills.mjs Teaser 0,90,240,420,600,780,1020,1260,1440,1620 out/stills
```

QA checks (length, black frames, determinism):

```bash
node scripts/qa.mjs out/gemini4neon_1920x1080.mp4 --determinism=120,330,700,900,1150,1500
```

## Editing copy

Open `src/copy.ts`. Set a field to `""` to hide its text layer; the scene still plays. Lines auto-shrink to
stay inside the 90% title-safe area. Keep each line at 5 words or fewer.

| Field | Where it shows |
| --- | --- |
| `tagline` | S5 speed lane, frames 630–779 |
| `feature1..3` | S6 glass panels, one at a time (796–860, 876–940, 956–1019) |
| `availability` | S10 end card from frame 1680 |

## Edit map

| Scene | Frames | What happens | Cut out (device) |
| --- | --- | --- | --- |
| S01 Ignition | 0–89 | Tube flickers on at 10 / 22 / 31, dust, HUD `Ne / 10` | zoom-through into the tube light (72–89) |
| S02 Into the atom | 90–239 | Out of the light into a 3D neon atom: 10 protons + 10 neutrons, 2 + 8 electrons with trails, 40° orbit, rings tilt open | match cut on shape (continuous) |
| S03 Collapse into the star | 240–419 | Outer ring snaps on the beat, 8 electrons fly in and draw the star, orange → blue/violet | glitch slice 414–417 |
| S04 Title slam | 420–599 | `GEMINI 4` 3 f per letter + 2 px shake decaying over 6 f; `NEON` tube lettering ignites (S1 pattern, first flicker on the beat at 480) | 2-frame white flash 598–599 |
| S05 Speed lane | 600–779 | Streak tunnel + light packet, `copy.tagline`, speed ramp, 6-frame freeze 774–779 | glitch slice 776–779 |
| S06 Feature cards | 780–1019 | Three frosted-glass panels flip in (780 / 860 / 940), neon edge traces the border | whip-pan right 1005–1029 |
| S07 2D → 3D city | 1020–1259 | Circuit-board plan draws on (stroke-dashoffset), extrudes into light-buildings at 1080, camera tilts and dives the avenue | zoom-through (vanishing-point flare) |
| S08 Montage | 1260–1439 | 12 cuts × 15 f, warm/cool alternating; devices per cut: zoom, glitch, whip, white flash | match cut on the star |
| S09 Implosion | 1440–1619 | Particles + remnants (rings, streaks, boxes, panel frames) spiral into the star; bloom to max | 2-frame white flash 1618–1619 |
| S10 End card | 1620–1799 | Star, `GEMINI 4` + tube `NEON`, `copy.availability`, fan-concept line; hum until 1788, last flicker, black on 1799 | cut to black |

## Audio

`public/audio/track.mp3` is a synthesized 120 BPM placeholder bed; the SFX one-shots (`sfx-*.mp3`) are
synthesized too (`scripts/gen-audio.mjs`). Cues by frame are in `src/sfx.ts`: tube buzzes (S1, S4, S10),
whooshes on every whip-pan, sub-bass hits on the title slam and every white flash, a riser across S9 and the
tube hum. Replace any file with real audio under the same name. If a file is missing it is skipped
(`getStaticFiles()`), and with no files at all the film renders silently.

## Structure

```
src/Root.tsx            both compositions
src/Teaser.tsx          master timeline, cut devices, global grain/vignette, audio layer
src/timing.ts           beat(n), bar(n), halfBeat(n), scene table, cue frames
src/theme.ts            palette tokens, easing, springs, fonts
src/copy.ts             all product copy ([FILL] placeholders)
src/sfx.ts              SFX cue list
src/scenes/S01..S10     one file per scene (+ AtomStarStage shared by S2/S3)
src/components/         NeonTube, Atom, StarMark, GlassPanel, StreakTunnel, GlitchSlice, HUD,
                        City, Stage3D (post stack), Overlays, CopyText
scripts/                stills, QA, font fetch, audio synthesis
```

## Implementation notes

- **Post-processing.** `@react-three/postprocessing`'s `<EffectComposer>` assembles its passes across several
  React commits, so under Remotion the first frame after every mount (every still, every render chunk,
  every scene cut) rendered empty. `Stage3D.tsx` builds the same `postprocessing` effects (Bloom,
  ChromaticAberration, plus ACES tone mapping) synchronously, and bloom/CA values are animated per scene by
  mutating the live effects.
- **Grain and vignette** are applied once over the whole film in 2D. postprocessing's `NoiseEffect` advances
  with the wall clock, which would break frame-identical renders; the grain here is a seeded tile offset per
  frame (opacity 0.04).
- **Fonts.** Space Grotesk and JetBrains Mono (SIL OFL) come from the Google Fonts catalog in
  `@remotion/google-fonts`; `npm run fonts` downloads those exact files into `public/fonts`, so renders work
  offline and every render uses identical font bytes.
- **Frosted glass.** Panels are WebGL (body, edge light) plus a CSS-3D layer that mirrors the camera exactly;
  that layer carries the text and a `backdrop-filter` blur that frosts whatever the canvas shows behind it.
