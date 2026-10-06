#!/usr/bin/env python3
"""Check the lid GIFs in this folder before importing them into Armoury Crate.

    python verify.py                      # all three
    python verify.py boss_fight_hud       # just one

Per GIF it reports:
- size, frame count, frame delays, length, file size
- the skill's validator (size, loop flag, grayscale, black outside the band)
- seam: how much the last frame differs from the first, next to normal frame-to-frame steps
- full-white flashes (runs of frames with the whole band at 255)
- clip: lit pixels of the important elements (text, bars, numbers, GG) that fall
  within half an LED of the band edge or outside it, checked on every frame
And it writes <name>_keyframes.png: first / middle / peak / last plus each phase's
key frames, simulated on the real LED layout.
"""
import importlib.util
import json
import math
import os
import sys

sys.dont_write_bytecode = True

import numpy as np  # noqa: E402
from PIL import Image, ImageDraw, ImageFont, ImageSequence  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "engine", "scripts"))
sys.path.insert(0, HERE)
from lidgif import Stripe  # noqa: E402
from lidgif.effects import Ctx  # noqa: E402
from lidgif.preview import led_points, render_leds  # noqa: E402
from validate import validate  # noqa: E402
import lidkit  # noqa: E402

NAMES = ["glitch_meltdown", "heartbeat_reactor", "boss_fight_hud"]
CLIP_INSET = 0.5      # LEDs: important pixels must stay this far inside the band edge


def load_frames(path):
    im = Image.open(path)
    frames, durs = [], []
    for fr in ImageSequence.Iterator(im):
        durs.append(fr.info.get("duration", 0))
        frames.append(np.asarray(fr.convert("L"), dtype=np.int16))
    return im, frames, durs


def load_module(path):
    spec = importlib.util.spec_from_file_location("lid_anim_" + os.path.basename(path)[:-3], path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def keyframe_sheet(frames, durs, stripe, picks, out):
    pts = led_points(stripe)
    tiles = []
    t_ms = np.cumsum([0] + list(durs))
    for label, fi in picks:
        led = render_leds(Image.fromarray(frames[fi].astype(np.uint8), "L"), stripe, pts)
        led = led.resize((led.width // 2, led.height // 2), Image.LANCZOS)
        tiles.append((f"{label}: frame {fi}  t={t_ms[fi] / 1000:.2f}s", led))
    cols = 4 if len(tiles) > 4 else len(tiles)
    rows = math.ceil(len(tiles) / cols)
    tw, th = tiles[0][1].size
    sheet = Image.new("L", (cols * tw, rows * (th + 18)), 0)
    d = ImageDraw.Draw(sheet)
    f = ImageFont.load_default()
    for j, (txt, im) in enumerate(tiles):
        x, y = (j % cols) * tw, (j // cols) * (th + 18)
        sheet.paste(im, (x, y + 18))
        d.text((x + 4, y + 3), txt, fill=210, font=f)
    sheet.save(out)


def check(name, stripe):
    gif = os.path.join(HERE, name + ".gif")
    scene_path = os.path.join(HERE, name + ".json")
    ok = True
    print(f"\n=== {name}.gif")
    if not os.path.exists(gif):
        print("  [FAIL] missing - run build.py first")
        return False
    with open(scene_path, encoding="utf-8") as fh:
        scene = json.load(fh)
    fps = float(scene.get("fps", 20))
    seg = scene["segments"][0]
    dur = float(seg["duration"])
    n_expected = int(round(dur * fps))

    im, frames, durs = load_frames(gif)
    mask = stripe.mask_np
    W, H = im.size
    kb = os.path.getsize(gif) / 1024
    print(f"  size {W}x{H}, {len(frames)} frames stored (expected {n_expected}), "
          f"delays {sorted(set(durs))} ms, length {sum(durs) / 1000:.2f}s, {kb:.0f} KB")
    if (W, H) != (stripe.W, stripe.H) or len(frames) != n_expected or abs(sum(durs) / 1000 - dur) > 0.011:
        print("  [FAIL] size / frame count / length differ from the scene")
        ok = False

    for r in validate(gif, stripe):
        if not r["passed"]:
            tag = "FAIL" if r["hard"] else "WARN"
            ok &= not r["hard"]
            print(f"  [{tag}] validator {r['check']}: {r['detail']}")
    print("  validator: all hard checks pass" if ok else "  validator: see above")

    # seam
    band = [f[mask] for f in frames]
    steps = [float(np.abs(band[k + 1] - band[k]).mean()) for k in range(len(band) - 1)]
    seam = float(np.abs(band[0] - band[-1]).mean())
    seam_max = int(np.abs(band[0] - band[-1]).max())
    identical = seam_max <= 2          # constant timing may nudge one pixel by 1
    p90 = float(np.percentile(steps, 90))
    print(f"  seam last->first: mean diff {seam:.2f} (max px {seam_max}); "
          f"normal steps median {np.median(steps):.2f}, p90 {p90:.2f}; "
          f"steps around the seam {steps[-1]:.2f} / {steps[0]:.2f}"
          + ("  -> last frame == first frame" if identical else ""))
    if not identical and seam > p90:
        print("  [FAIL] the loop seam is a bigger jump than 90% of normal frame steps")
        ok = False

    # flashes
    white = [bool((f[mask] >= 250).mean() >= 0.99) for f in frames]
    runs, k = [], 0
    while k < len(white):
        if white[k]:
            j = k
            while j < len(white) and white[j]:
                j += 1
            runs.append((k, j - k))
            k = j
        else:
            k += 1
    print("  full-white flashes: " + (", ".join(f"frames {a}-{a + n - 1} ({n} frames)" for a, n in runs) or "none"))

    # clip check on the important elements, straight from the animation code
    mod = load_module(os.path.join(HERE, seg["layers"][0]["params"]["file"]))
    ctx = Ctx(stripe, fps, n_expected, dur, int(scene.get("seed", 7)))
    if hasattr(mod, "setup"):
        mod.setup(ctx, dict(seg["layers"][0]["params"].get("params", {})))
    inside = lidkit.strip_mask(stripe, CLIP_INSET)
    worst, bad = 0, []
    for i in range(n_expected):
        imp = mod.important(ctx, i, i / n_expected)
        if imp is None:
            continue
        lit = np.asarray(imp) > 60
        out = int((lit & ~inside).sum())
        if out:
            bad.append(i)
            worst = max(worst, out)
    if bad:
        print(f"  [FAIL] clip: important pixels within {CLIP_INSET} LED of the edge on frames {bad[:12]}"
              f"{'...' if len(bad) > 12 else ''} (worst {worst} px)")
        ok = False
    else:
        print(f"  clip: 0 important pixels outside the band (inset {CLIP_INSET} LED) on all {n_expected} frames")

    # key frames
    peak = int(np.argmax([f[mask].mean() for f in frames]))
    picks = [("first", 0), ("middle", len(frames) // 2), ("peak", peak)]
    picks += [(lab, fi) for lab, fi in getattr(mod, "KEY_FRAMES", [])]
    picks += [("last", len(frames) - 1)]
    keyframe_sheet(frames, durs, stripe, picks, os.path.join(HERE, name + "_keyframes.png"))
    print(f"  wrote {name}_keyframes.png")
    print("  RESULT: " + ("PASS" if ok else "FAIL"))
    return ok


def main():
    names = sys.argv[1:] or NAMES
    stripe = Stripe()
    ok = all([check(n, stripe) for n in names])
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
