#!/usr/bin/env python3
"""Check a GIF is ready to import into AniMe Vision for the SCAR 18 lid stripe.

    python validate.py lid.gif [--json]

Checks: opens as an animated GIF, loops forever, canvas matches the stripe
aspect, frames are grayscale, nothing is lit outside the stripe, the stripe
is not blank, frame timing is sane, file size is reasonable.
Exit code 0 = all hard checks pass.
"""
import argparse
import json
import os
import sys

sys.dont_write_bytecode = True

import numpy as np
from PIL import Image, ImageSequence

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lidgif import Stripe  # noqa: E402


def validate(path, stripe=None):
    s = stripe or Stripe()
    res = []

    def check(name, ok, detail, hard=True):
        res.append({"check": name, "passed": bool(ok), "detail": detail, "hard": hard})

    try:
        im = Image.open(path)
    except Exception as e:  # noqa: BLE001
        check("opens", False, str(e))
        return res
    check("is_gif", im.format == "GIF", f"format={im.format}")
    n = getattr(im, "n_frames", 1)
    check("animated", n > 1, f"{n} stored frames (identical neighbours are merged; 1 = still image, fine if intended)", hard=False)
    check("loops_forever", n == 1 or im.info.get("loop") == 0, f"loop={im.info.get('loop')}")
    W, H = im.size
    want = s.W / s.H
    check("aspect_matches_stripe", abs(W / H - want) / want < 0.02, f"{W}x{H} (aspect {W / H:.3f}, stripe {want:.3f})")

    durs, outside, inside_max, gray, inside_means = [], 0.0, 0, True, []
    mask = s.mask_np if (W, H) == (s.W, s.H) else np.array(s.mask.resize((W, H), Image.NEAREST)) > 127
    for fr in ImageSequence.Iterator(im):
        durs.append(fr.info.get("duration", 100))
        rgb = np.asarray(fr.convert("RGB"), dtype=np.int16)
        if gray and (np.abs(rgb[..., 0] - rgb[..., 1]).max() > 2 or np.abs(rgb[..., 1] - rgb[..., 2]).max() > 2):
            gray = False
        L = rgb.mean(axis=2)
        outside = max(outside, float(L[~mask].max()) if (~mask).any() else 0)
        inside_max = max(inside_max, int(L[mask].max()))
        inside_means.append(float(L[mask].mean()))
    check("grayscale", gray, "all frames neutral gray" if gray else "colour found - AniMe Vision is white-only")
    check("dark_outside_stripe", outside <= 8, f"max brightness outside stripe = {outside:.0f}")
    check("stripe_not_blank", inside_max >= 128, f"max brightness inside stripe = {inside_max}")
    check("frame_timing", min(durs) >= 20, f"durations {min(durs)}-{max(durs)} ms, total {sum(durs) / 1000:.2f}s")
    total = sum(durs) / 1000
    check("length_reasonable", 0.2 <= total <= 20, f"{total:.2f}s", hard=False)
    kb = os.path.getsize(path) / 1024
    check("file_size", kb < 4096, f"{kb:.0f} KB", hard=False)
    blank = sum(1 for m in inside_means if m < 1)
    check("few_blank_frames", blank <= 0.5 * len(inside_means), f"{blank}/{len(inside_means)} frames fully dark", hard=False)
    return res


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("gif")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--stripe")
    a = ap.parse_args()
    res = validate(a.gif, Stripe(a.stripe) if a.stripe else None)
    if a.json:
        print(json.dumps(res, indent=2))
    else:
        for r in res:
            tag = "PASS" if r["passed"] else ("FAIL" if r["hard"] else "WARN")
            print(f"[{tag}] {r['check']}: {r['detail']}")
    sys.exit(0 if all(r["passed"] or not r["hard"] for r in res) else 1)


if __name__ == "__main__":
    main()
