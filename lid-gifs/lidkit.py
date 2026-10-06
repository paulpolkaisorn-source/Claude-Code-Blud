"""Shared kit for the SCAR 18 AniMe Vision lid GIFs.

Animations are drawn on a tiny LED grid (N x M cells, 1 cell = 1 LED, ~64 x 14),
upscaled to the straight "strip" ribbon, rotated onto the slanted band by the
scar18-lid-gif engine, then quantised to the real 8 brightness levels.

Change SKILL_DIR if the skill lives somewhere else. Everything else (canvas size,
slant, pitch, levels) is read from the engine's assets/stripe.json, so the canvas
size is a single source of truth there (default 564 x 400).
"""
import os
import sys

import numpy as np
from PIL import Image

SKILL_DIR = os.environ.get(
    "SCAR18_SKILL",
    "/root/.claude/skills/synced/ecd02de6-08e7-4cef-b6a2-02396e404a0a_fb809415-1b84-49ba-8df3-5ea0c65b848d/scar18-lid-gif",
)
sys.path.insert(0, os.path.join(SKILL_DIR, "scripts"))
sys.dont_write_bytecode = True

from lidgif import Stripe, save_gif  # noqa: E402
from lidgif import font as _font  # noqa: E402
from lidgif.preview import make_preview  # noqa: E402
from validate import validate  # noqa: E402

# 8 real brightness levels
OFF, DIM, LOW, MID, HALF, HIGH, BRIGHT, FULL = 0, 36, 73, 109, 146, 182, 219, 255

S = Stripe()
P = S.pitch
N = int(S.SL // P)          # LED columns along the band (64)
M = int(S.ST // P)          # LED rows across the band (14)
FPS = 20


def _valid_mask():
    v = np.zeros((M, N), bool)
    for m in range(M):
        for n in range(N):
            u = (n + .5) * P + S.umin
            w = (m + .5) * P + S.vmin
            x = u * S.dx + w * S.nx
            y = u * S.dy + w * S.ny
            xi, yi = int(round(x)), int(round(y))
            v[m, n] = 0 <= xi < S.W and 0 <= yi < S.H and S.mask_np[yi, xi]
    return v


VALID = _valid_mask()


def blank(v=0):
    return np.full((M, N), v, np.float32)


def glyph_rows(ch):
    g = _font.glyph(ch)
    return g if g is not None else ["     "] * 7


def text_mask(text, scale=1):
    """Boolean array (7*scale rows) of the pixel-font text (1 font px = scale cells)."""
    cols = []
    for k, ch in enumerate(text):
        g = glyph_rows(ch)
        a = np.array([[c == "#" for c in r] for r in g], bool)
        a = np.kron(a, np.ones((scale, scale), bool))
        cols.append(a)
        if k < len(text) - 1:
            cols.append(np.zeros((7 * scale, scale), bool))
    return np.concatenate(cols, axis=1)


def place(g, mask, x, y, level=FULL, mode="max"):
    """Stamp a boolean mask onto grid g at column x, row y (clipped)."""
    h, w = mask.shape
    for r in range(h):
        yy = y + r
        if not 0 <= yy < M:
            continue
        for c in range(w):
            xx = x + c
            if 0 <= xx < N and mask[r, c]:
                g[yy, xx] = level if mode == "set" else max(g[yy, xx], level)
    return g


def rect(g, x0, y0, x1, y1, level=FULL):
    """Inclusive-exclusive rectangle in cell coords, clipped."""
    x0, x1 = max(0, int(x0)), min(N, int(x1))
    y0, y1 = max(0, int(y0)), min(M, int(y1))
    if x1 > x0 and y1 > y0:
        g[y0:y1, x0:x1] = np.maximum(g[y0:y1, x0:x1], level)
    return g


def to_frame(g):
    """LED grid -> finished canvas frame (rotated onto the band, 8 levels, black outside)."""
    img = Image.fromarray(np.clip(g, 0, 255).astype(np.uint8), "L")
    img = img.resize((int(round(N * P)), int(round(M * P))), Image.NEAREST)
    strip = S.new_strip()
    strip.paste(img, (0, 0))
    return S.finalize(S.strip_to_canvas(strip))


def safe_x(text_w):
    """Left column that centres something of width text_w in the always-lit middle."""
    return int(round((N - text_w) / 2 - 3))


def build(name, frames, fps=FPS, outdir=None):
    """Save <name>.gif (+ _preview.gif and _sheet.png) and print the validator report."""
    outdir = outdir or os.path.dirname(os.path.abspath(sys.argv[0]))
    out = os.path.join(outdir, name + ".gif")
    durs = save_gif(frames, out, fps, constant_timing=True)
    base = out[:-4]
    make_preview(frames, durs, S, base + "_preview.gif", base + "_sheet.png", 12)
    print(f"{out}: {len(frames)} frames, {sum(durs) / 1000:.2f}s, {S.W}x{S.H}, {os.path.getsize(out) // 1024} KB")
    rep = validate(out, S)
    print(rep if isinstance(rep, str) else "\n".join(map(str, rep)))
    a, b = np.asarray(frames[0]), np.asarray(frames[-1])
    print("last frame == first frame:", bool(np.array_equal(a, b)),
          "| mean abs diff last->first (flow):", float(np.abs(a.astype(int) - b.astype(int)).mean()))
    return out
