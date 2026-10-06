#!/usr/bin/env python3
"""Make a calibration GIF to check (and fix) how the stripe lines up on the lid.

    python calibration.py --out calibration.gif

Parts (each ~1.5 s, then it loops):
  FILL    whole canvas white  -> every LED the GIF covers lights up.
          Screenshot this in Armoury Crate and run measure_stripe.py on it.
  OUTLINE thick border on the stripe edge + solid triangle at the top-left tip
          -> shows placement and orientation (border should hug the LED edge).
  RAMP    8 brightness steps along the band -> how many gray levels you can see.
  SWEEP   one-LED bar running along the band at 20 fps -> frame rate check.

Import it WITHOUT zooming or moving it in the editor.
"""
import argparse
import os
import sys

sys.dont_write_bytecode = True

from PIL import ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lidgif import Stripe, save_gif  # noqa: E402


def build(s, fps=20):
    frames = []
    hold = int(1.5 * fps)
    fill = s.new_canvas(255)
    frames += [fill] * hold
    out = s.new_canvas()
    d = ImageDraw.Draw(out)
    d.line(s.poly + [s.poly[0]], fill=255, width=int(s.pitch * 1.2))
    x0, y0 = s.poly[0]
    d.polygon([(x0, y0), (x0 + 5 * s.pitch, y0 + 3.5 * s.pitch), (x0, y0 + 6 * s.pitch)], fill=255)
    frames += [s.finalize(out, levels=0)] * hold
    ramp = s.new_strip()
    dr = ImageDraw.Draw(ramp)
    a, b = s.strip_span()
    for k in range(8):
        dr.rectangle([a + k * (b - a) / 8, 0, a + (k + 1) * (b - a) / 8, s.ST], fill=int(255 * (k + 1) / 8))
    frames += [s.finalize(s.strip_to_canvas(ramp), levels=0)] * hold
    n = int(2 * fps)
    for i in range(n):
        st = s.new_strip()
        x = s.SL * i / (n - 1)
        ImageDraw.Draw(st).rectangle([x - s.pitch / 2, 0, x + s.pitch / 2, s.ST], fill=255)
        frames.append(s.finalize(s.strip_to_canvas(st), levels=0))
    # FILL is deliberately not masked: it shows the full GIF footprint.
    return frames


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="scar18_calibration.gif")
    ap.add_argument("--stripe")
    a = ap.parse_args()
    s = Stripe(a.stripe)
    frames = build(s)
    save_gif(frames, a.out, 20, constant_timing=True)
    print(f"wrote {a.out} ({s.W}x{s.H}, {len(frames)} frames). Import into AniMe Vision > Animation Mode, "
          "don't zoom or move it, screenshot each part.")


if __name__ == "__main__":
    main()
