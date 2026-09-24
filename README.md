# AMD Ryzen + Radeon: 100-second motion piece (Remotion)

1920x1080, 30 fps, 3000 frames, H.264. Every animation is driven by `useCurrentFrame()`, `interpolate()` and `spring()`.

## Render

```bash
npm install
npx remotion render AmdRyzenRadeon out/amd-ryzen-radeon.mp4 --codec=h264
# preview / edit
npm run dev
```

## Editing

- **Copy:** all on-screen text is in `src/data/content.ts`.
- **Look:** colors, fonts, easing presets and `BEAT = 15` are in `src/theme.ts`.
- **Timeline:** scene boundaries are in `src/Video.tsx` (`SCENES`). Every cut sits on the 120 BPM grid (multiples of 15 frames).

## Optional assets

| Path | Effect |
| --- | --- |
| `public/brand/amd.svg`, `ryzen.svg`, `radeon.svg` | Used on the title card and end card. If a file is missing, the text version is used instead. |
| `public/audio/track.mp3` | Plays under the whole video with a 1 s fade-in and 2 s fade-out. If it's missing, the video renders silent. |

Logos are never drawn in code. Add official files only if you have the rights to use them.

## Fonts

Space Grotesk (headlines) and Inter (labels) come from Google Fonts (OFL). The font files are bundled in `public/fonts/` and loaded with `@remotion/fonts`, so renders don't need network access.

## Claims check (against amd.com, Sept 2026)

- "Zen 5 cores", "AM5 socket", "DDR5 memory and PCIe 5.0": confirmed on the Ryzen desktop and Ryzen 9 9950X3D product pages.
- 3D V-Cache: confirmed. The label reads "stacked with the compute die" rather than "on the die", because on Ryzen 9000X3D the cache die sits *below* the cores (per AMD's 3D V-Cache page). The animation lifts the compute die and slides the cache in underneath.
- "FSR 4 upscaling" became **"FSR Upscaling"**: AMD's FSR page says FSR 4 has been renamed FSR Upscaling.
- "RDNA 4" and "Ray tracing": confirmed on the Radeon desktop graphics page.
- Smart Access Memory: amd.com only describes it (in footnotes) as AMD Smart Access Memory / PCIe Resizable BAR. The line "the CPU can reach all of the GPU's memory at once" couldn't be confirmed there, so it now reads: "Built on PCIe Resizable BAR, for Ryzen and Radeon working together."
- There are no performance numbers anywhere in the video.
