#!/usr/bin/env python3
"""Measure the AniMe Vision stripe shape from an Armoury Crate screenshot.

Take a screenshot of the AniMe Vision editor (Animation Mode) while the
calibration GIF's FILL part is showing (or any busy animation), then run:

    python measure_stripe.py screenshot.png [--crop x0 y0 x1 y1] [--write]

It finds the lit LED region, fits the 4-corner stripe outline
(top tip, left-edge bottom, bottom-edge left end, bottom-right tip)
and prints it normalised to its bounding box. With --write it updates
assets/stripe.json so every render uses the measured shape.
"""
import argparse
import json
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
STRIPE_JSON = os.path.join(HERE, "..", "assets", "stripe.json")


def measure(path, crop=None, thr=100):
    im = Image.open(path).convert("L")
    off = (0, 0)
    if crop:
        im = im.crop(tuple(crop))
        off = (crop[0], crop[1])
    W, H = im.size
    # Ignore the editor chrome: keep the central region where the stripe lives.
    a = np.array(im)
    lit = a > thr
    # Merge the tiny preview dots into one solid blob.
    blob = Image.fromarray((lit * 255).astype("uint8")).filter(ImageFilter.MaxFilter(9))
    b = np.array(blob) > 0
    # Keep only the largest blob: label by flood fill (numpy-only BFS on a downscaled grid).
    small = Image.fromarray((b * 255).astype("uint8")).resize((W // 4, H // 4), Image.NEAREST)
    s = np.array(small) > 0
    lab = np.zeros(s.shape, int)
    best, best_n, cur = 0, 0, 0
    for y0, x0 in zip(*np.nonzero(s)):
        if lab[y0, x0]:
            continue
        cur += 1
        stack = [(y0, x0)]
        lab[y0, x0] = cur
        n = 0
        while stack:
            y, x = stack.pop()
            n += 1
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                yy, xx = y + dy, x + dx
                if 0 <= yy < s.shape[0] and 0 <= xx < s.shape[1] and s[yy, xx] and not lab[yy, xx]:
                    lab[yy, xx] = cur
                    stack.append((yy, xx))
        if n > best_n:
            best, best_n = cur, n
    keep = np.array(Image.fromarray(((lab == best) * 255).astype("uint8")).resize((W, H), Image.NEAREST)) > 0
    ys, xs = np.nonzero(lit & keep)
    if len(xs) < 100:
        sys.exit("Could not find a lit stripe. Try --crop around it or a lower --thr.")
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    w, h = x1 - x0, y1 - y0
    tol = max(3, int(0.03 * h))
    top = (xs[ys <= y0 + tol].min(), y0)                       # top tip
    left_bottom = (x0, ys[xs <= x0 + tol].max())               # bottom of vertical left edge
    bottom_left = (xs[ys >= y1 - tol].min(), y1)               # left end of flat bottom edge
    bottom_right = (x1, y1)                                    # bottom-right tip
    pts = [top, bottom_right, bottom_left, left_bottom]
    norm = [[round((px - x0) / w, 4), round((py - y0) / h, 4)] for px, py in pts]
    return {
        "bbox_px": [int(x0 + off[0]), int(y0 + off[1]), int(x1 + off[0]), int(y1 + off[1])],
        "aspect": round(w / h, 4),
        "polygon": norm,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("screenshot")
    ap.add_argument("--crop", type=int, nargs=4)
    ap.add_argument("--thr", type=int, default=100)
    ap.add_argument("--write", action="store_true", help="update assets/stripe.json")
    a = ap.parse_args()
    r = measure(a.screenshot, a.crop, a.thr)
    print(json.dumps(r, indent=2))
    if a.write:
        with open(STRIPE_JSON) as f:
            cfg = json.load(f)
        cfg["polygon"] = r["polygon"]
        W = cfg["canvas"][0]
        cfg["canvas"] = [W, int(round(W / r["aspect"]))]
        cfg["source"] = "measured with measure_stripe.py from " + os.path.basename(a.screenshot)
        with open(STRIPE_JSON, "w") as f:
            json.dump(cfg, f, indent=2)
        print("updated", os.path.normpath(STRIPE_JSON))


if __name__ == "__main__":
    main()
