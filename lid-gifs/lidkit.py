"""Shared helpers for the SCAR 18 AniMe Vision lid animations in this folder.

Design in LED units: 1 LED = ctx.p px (about 10.7 px on the 564x400 canvas).
Strip space = the straight ribbon the engine rotates onto the slanted band:
x runs along the band from the top-left tip, y runs across it from the outer
(top-right) edge. The band is a trapezoid in strip space - the outer edge is
~64 LEDs long, the inner edge only ~34 - so lower rows lose both ends.
safe_span() tells you where a block of rows is fully lit.
"""
import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ENGINE = os.path.join(HERE, "engine", "scripts")
if ENGINE not in sys.path:
    sys.path.insert(0, ENGINE)

from lidgif import font as _font  # noqa: E402

# The 8 brightness steps the lid shows (stripe.json "levels": 8).
LEVELS = (0, 36, 73, 109, 146, 182, 219, 255)

_MASKS = {}


# --------------------------------------------------------------------------- geometry
def strip_mask(s, inset=0.0):
    """Bool array (ST, SL): True where a strip pixel lands inside the band.
    `inset` (LEDs) pulls the edge in on every side."""
    key = (id(s), round(inset, 3))
    if key not in _MASKS:
        m = s.canvas_to_strip(s.mask)
        k = int(round(inset * s.pitch))
        if k > 0:
            # pad with black first: MinFilter repeats border pixels, which would leave
            # the band's outer edge (strip row 0) un-eroded
            pad = Image.new("L", (s.SL + 2 * k + 2, s.ST + 2 * k + 2), 0)
            pad.paste(m, (k + 1, k + 1))
            m = pad.filter(ImageFilter.MinFilter(2 * k + 1)).crop((k + 1, k + 1, k + 1 + s.SL, k + 1 + s.ST))
        _MASKS[key] = np.asarray(m) > 127
    return _MASKS[key]


def safe_span(s, y0, y1, inset=1.0):
    """(x0, x1) in px: the x-range where every strip row from y0 to y1 (px) is
    inside the band, pulled in by `inset` LEDs at both ends."""
    m = strip_mask(s)
    lo, hi = 0, s.SL - 1
    for y in range(max(0, int(math.floor(y0))), min(s.ST - 1, int(math.ceil(y1))) + 1):
        xs = np.nonzero(m[y])[0]
        if not len(xs):
            return None
        lo, hi = max(lo, int(xs.min())), min(hi, int(xs.max()))
    pad = inset * s.pitch
    return lo + pad, hi - pad


def ends_mask(s, end_inset, edge_inset=0.5):
    """Bool (ST, SL) band mask pulled in by `end_inset` LEDs from the two slanted
    ends only (measured square to each end), and `edge_inset` LEDs from the long
    edges. For long shapes like a health bar that should hug the band's length."""
    m = strip_mask(s)
    rows = [y for y in range(5, s.ST - 5) if m[y].any()]
    lo = np.array([np.nonzero(m[y])[0].min() for y in rows], np.float64)
    hi = np.array([np.nonzero(m[y])[0].max() for y in rows], np.float64)
    a1, a0 = np.polyfit(rows, lo, 1)          # left end:  x = a0 + a1 * y
    b1, b0 = np.polyfit(rows, hi, 1)          # right end: x = b0 + b1 * y
    y = np.arange(s.ST, dtype=np.float64)[:, None]
    x = np.arange(s.SL, dtype=np.float64)[None, :]
    d = end_inset * s.pitch
    keep = (x >= a0 + a1 * y + d * math.hypot(1, a1)) & (x <= b0 + b1 * y - d * math.hypot(1, b1))
    return keep & strip_mask(s, edge_inset)


def column_bottom(s, inset=0.0):
    """For every strip column x: the lowest y (px) still inside the band (-1 if none)."""
    m = strip_mask(s, inset)
    rows = np.arange(s.ST)[:, None]
    return np.where(m.any(axis=0), np.max(np.where(m, rows, -1), axis=0), -1)


def canvas_x(s):
    """Canvas column index for every canvas pixel (H, W) - for upright wipes."""
    return np.broadcast_to(np.arange(s.W, dtype=np.float32)[None, :], (s.H, s.W))


# --------------------------------------------------------------------------- bitmaps
def draw_bitmap(img, rows, x, y, cell, level=255):
    """Draw '#' cells of a bitmap (list of strings) with its top-left at (x, y) px.
    Cell edges are rounded so neighbouring cells tile without gaps."""
    d = ImageDraw.Draw(img)
    for r, row in enumerate(rows):
        for c, ch in enumerate(row):
            if ch == "#":
                x0, y0 = x + c * cell, y + r * cell
                d.rectangle([round(x0), round(y0), round(x0 + cell) - 1, round(y0 + cell) - 1], fill=level)
    return img


def bitmap_cells(rows):
    """[(row, col)] of every lit cell."""
    return [(r, c) for r, row in enumerate(rows) for c, ch in enumerate(row) if ch == "#"]


def hcat(glyphs, gap=1):
    """Join bitmaps side by side with `gap` empty columns between them."""
    h = len(glyphs[0])
    out = [""] * h
    for k, g in enumerate(glyphs):
        if k:
            out = [o + " " * gap for o in out]
        out = [o + row for o, row in zip(out, g)]
    return out


def text_bitmap(text, space=1):
    """5x7 pixel-font text (the engine's font) as a bitmap. `space` = width of a
    space character in columns (the font's own is 5, too wide for the lid)."""
    glyphs = []
    for ch in text:
        g = [" " * space] * 7 if ch == " " else _font.glyph(ch)
        if g is None:
            raise ValueError(f"no pixel glyph for {ch!r}")
        glyphs.append(g)
    return hcat(glyphs, 1)


# Big blocky G: 10 x 12 LEDs, 2-LED strokes.
BIG_G = [
    " #########",
    "##########",
    "##        ",
    "##        ",
    "##        ",
    "##   #####",
    "##   #####",
    "##      ##",
    "##      ##",
    "##      ##",
    "##########",
    " #########",
]


# --------------------------------------------------------------------------- images
def arr(img):
    return np.asarray(img, dtype=np.uint8)


def img(a):
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), "L")


def vmax(*imgs):
    """Pixel-wise max of PIL images / arrays (light adds up)."""
    out = None
    for im in imgs:
        if im is None:
            continue
        a = np.asarray(im, dtype=np.uint8)
        out = a.copy() if out is None else np.maximum(out, a)
    return img(out)
