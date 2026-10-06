"""Stripe geometry, strip-space drawing helpers and GIF output for the
ROG Strix SCAR 18 AniMe Vision lid stripe.

Two coordinate spaces:
  canvas space - the GIF itself (W x H). The lit stripe is a slanted band
                 inside it; everything outside the band is forced to black.
  strip space  - a straight horizontal ribbon (SL x ST) that is rotated
                 onto the band. x runs along the band from the top-left tip
                 to the bottom-right tip, y runs across it. Draw text, bars,
                 sweeps here and they follow the stripe automatically.
"""
import json
import math
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFont

from . import font as _font

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_STRIPE = os.path.normpath(os.path.join(HERE, "..", "..", "assets", "stripe.json"))


class Stripe:
    def __init__(self, path=None):
        path = path or os.environ.get("LIDGIF_STRIPE") or DEFAULT_STRIPE
        with open(path) as f:
            cfg = json.load(f)
        self.cfg = cfg
        self.W, self.H = cfg["canvas"]
        self.levels = int(cfg.get("levels", 8))
        self.led_count = int(cfg.get("led_count", 810))
        self.poly = [(x * (self.W - 1), y * (self.H - 1)) for x, y in cfg["polygon"]]
        m = Image.new("L", (self.W, self.H), 0)
        ImageDraw.Draw(m).polygon(self.poly, fill=255)
        self.mask = m
        self.mask_np = np.array(m) > 127

        # Band direction = top edge (top tip -> bottom-right tip).
        (x0, y0), (x1, y1) = self.poly[0], self.poly[1]
        L = math.hypot(x1 - x0, y1 - y0)
        self.dx, self.dy = (x1 - x0) / L, (y1 - y0) / L
        self.nx, self.ny = -self.dy, self.dx          # points across, into the band
        self.angle = math.degrees(math.atan2(self.dy, self.dx))
        us = [x * self.dx + y * self.dy for x, y in self.poly]
        vs = [x * self.nx + y * self.ny for x, y in self.poly]
        self.umin, self.vmin = min(us), min(vs)
        self.SL = int(math.ceil(max(us) - self.umin)) + 1
        self.ST = int(math.ceil(max(vs) - self.vmin)) + 1

        area = 0.5 * abs(sum(self.poly[i][0] * self.poly[i - 1][1] - self.poly[i - 1][0] * self.poly[i][1]
                             for i in range(len(self.poly))))
        self.area = area
        # LEDs sit on a roughly hex-packed grid: area per LED = sqrt(3)/2 * pitch^2
        self.pitch = math.sqrt(area / (self.led_count * math.sqrt(3) / 2))
        # Strip size measured in LED cells - the real "resolution" you design for.
        self.cells_long = self.SL / self.pitch
        self.cells_across = self.ST / self.pitch

    # ---------- spaces ----------
    def new_canvas(self, v=0):
        return Image.new("L", (self.W, self.H), v)

    def new_strip(self, v=0):
        return Image.new("L", (self.SL, self.ST), v)

    def strip_to_canvas(self, strip):
        """Rotate a strip-space image onto the band (bilinear)."""
        if strip.size != (self.SL, self.ST):
            strip = strip.resize((self.SL, self.ST), Image.BILINEAR)
        data = (self.dx, self.dy, -self.umin, self.nx, self.ny, -self.vmin)
        return strip.transform((self.W, self.H), Image.AFFINE, data, resample=Image.BILINEAR, fillcolor=0)

    def canvas_to_strip(self, canvas):
        """Inverse of strip_to_canvas (useful for analysis)."""
        # strip(u,v) -> canvas point = umin*d + vmin*n + u*d + v*n
        ox = self.umin * self.dx + self.vmin * self.nx
        oy = self.umin * self.dy + self.vmin * self.ny
        data = (self.dx, self.nx, ox, self.dy, self.ny, oy)
        return canvas.transform((self.SL, self.ST), Image.AFFINE, data, resample=Image.BILINEAR, fillcolor=0)

    def strip_span(self, y=None):
        """x-range of strip row y (default: centre row) that is actually inside the band."""
        y = self.ST / 2 if y is None else y
        m = np.array(self.canvas_to_strip(self.mask))
        row = np.nonzero(m[int(min(max(y, 0), self.ST - 1))] > 127)[0]
        return (int(row.min()), int(row.max())) if len(row) else (0, self.SL - 1)

    # ---------- output ----------
    def finalize(self, img, levels=None, gamma=1.0, brightness=1.0):
        a = np.asarray(img, dtype=np.float32) / 255.0
        a = np.clip(a * brightness, 0, 1)
        if gamma != 1.0:
            a = a ** gamma
        a[~self.mask_np] = 0.0
        lv = self.levels if levels is None else levels
        if lv and lv >= 2:
            a = np.round(a * (lv - 1)) / (lv - 1)
        return Image.fromarray((a * 255 + 0.5).astype(np.uint8), "L")


def save_gif(frames, path, fps, constant_timing=False):
    """Save grayscale frames as an infinitely looping GIF.
    GIF timing is in 1/100 s, so per-frame durations are spread to keep the
    average fps exact (e.g. 15 fps -> 70,70,60 ms)."""
    n = len(frames)
    total_cs = round(n * 100.0 / fps)
    durs, acc = [], 0
    for i in range(n):
        nxt = round((i + 1) * total_cs / n)
        durs.append(max(2, nxt - acc) * 10)
        acc = nxt
    frames = [f.convert("L") for f in frames]
    if constant_timing:
        # Pillow merges identical consecutive frames into one longer frame. Some players
        # prefer a fixed frame rate, so nudge one pixel of each duplicate by 1/255
        # (invisible on the LEDs) to keep every frame separate.
        out = [frames[0]]
        for k, f in enumerate(frames[1:], 1):
            if np.array_equal(np.asarray(f), np.asarray(out[-1])):
                a = np.asarray(f).copy()
                ys, xs = np.nonzero(a < 255)
                if len(xs):
                    a[ys[0], xs[0]] += 1 if k % 2 else 0
                    if k % 2 == 0:
                        a[ys[-1], xs[-1]] += 1
                f = Image.fromarray(a, "L")
            out.append(f)
        frames = out
    frames[0].save(path, save_all=True, append_images=frames[1:], duration=durs,
                   loop=0, disposal=1, optimize=False)
    return durs


# ---------- drawing helpers ----------
def text_size(text, cell, spacing=1):
    """(width, height) in px of pixel-font text, one font pixel = `cell` px."""
    n = len(text)
    if n == 0:
        return 0, 0
    cols = n * _font.GLYPH_W + (n - 1) * spacing
    return int(round(cols * cell)), int(round(_font.GLYPH_H * cell))


def draw_text(img, text, x, y, cell, fill=255, spacing=1, dot=0.9, ttf_fallback=True):
    """Draw pixel-font text with its top-left at (x, y). `dot` < 1 leaves a gap
    between font pixels (looks like LEDs). Characters missing from the pixel
    font fall back to a TTF glyph scaled into the same cell box."""
    d = ImageDraw.Draw(img)
    cx = x
    pad = cell * (1 - dot) / 2
    for ch in text:
        g = _font.glyph(ch)
        if g is None and ttf_fallback:
            _draw_ttf_char(img, ch, cx, y, cell * _font.GLYPH_W, cell * _font.GLYPH_H, fill)
        elif g is not None:
            for r, row in enumerate(g):
                for c, px in enumerate(row):
                    if px == "#":
                        x0 = cx + c * cell + pad
                        y0 = y + r * cell + pad
                        d.rectangle([x0, y0, x0 + cell - 2 * pad - 1, y0 + cell - 2 * pad - 1], fill=fill)
        cx += (_font.GLYPH_W + spacing) * cell
    return img


_TTF_CACHE = {}
_TTF_CANDIDATES = [
    "C:/Windows/Fonts/arialbd.ttf", "C:/Windows/Fonts/seguiemj.ttf", "C:/Windows/Fonts/LeelUIb.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]


def load_ttf(size):
    if size in _TTF_CACHE:
        return _TTF_CACHE[size]
    f = None
    for p in _TTF_CANDIDATES:
        if os.path.exists(p):
            try:
                f = ImageFont.truetype(p, size)
                break
            except OSError:
                pass
    if f is None:
        f = ImageFont.load_default()
    _TTF_CACHE[size] = f
    return f


def _draw_ttf_char(img, ch, x, y, w, h, fill):
    f = load_ttf(max(8, int(h * 1.1)))
    tmp = Image.new("L", (int(w * 2), int(h * 2)), 0)
    ImageDraw.Draw(tmp).text((0, 0), ch, font=f, fill=255)
    bb = tmp.getbbox()
    if not bb:
        return
    g = tmp.crop(bb).resize((max(1, int(w)), max(1, int(h))), Image.BILINEAR)
    g = g.point(lambda v: 255 if v > 100 else 0)
    img.paste(Image.new("L", g.size, fill), (int(x), int(y)), g)


def blend(base, top, mode="max", opacity=1.0):
    a = np.asarray(base, dtype=np.float32)
    b = np.asarray(top, dtype=np.float32) * opacity
    if mode == "max":
        r = np.maximum(a, b)
    elif mode == "add":
        r = a + b
    elif mode == "over":
        r = np.where(b > 1, b, a)
    elif mode == "mask":   # keep base only where top is lit
        r = a * (b / 255.0)
    elif mode == "subtract":
        r = a - b
    else:
        raise ValueError("unknown blend mode " + mode)
    return Image.fromarray(np.clip(r, 0, 255).astype(np.uint8), "L")


def scale(img, k):
    a = np.asarray(img, dtype=np.float32) * k
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), "L")
