"""Motion-graphics effects for the AniMe Vision stripe.

Every effect is a class with:
  SPACE  = "strip" (draw on the straight ribbon, gets rotated onto the band)
           or "canvas" (draw straight on the GIF canvas, gets masked)
  frame(i, t) -> PIL "L" image   i = frame index in the segment, t = i / n in [0, 1)

Effects marked LOOP are seamless: frame n would equal frame 0, so a segment
can repeat forever in an Armoury Crate slot without a visible jump.
Run `python render.py --list` to print this catalogue.
"""
import importlib.util
import math
import random
import sys
import zlib

import numpy as np
from PIL import Image, ImageDraw

from .core import draw_text, text_size

EFFECTS = {}


def register(name):
    def deco(cls):
        cls.NAME = name
        EFFECTS[name] = cls
        return cls
    return deco


class Ctx:
    """What an effect knows about the render."""

    def __init__(self, stripe, fps, n, duration, seed):
        self.s = stripe
        self.p = stripe.pitch          # px per LED cell
        self.fps, self.n, self.duration, self.seed = fps, n, duration, seed

    def rng(self, *salt):
        # crc32 instead of hash(): Python salts str hashes per process, which would
        # make every render different.
        return random.Random(zlib.crc32(repr((self.seed,) + salt).encode()))


class Effect:
    SPACE = "strip"
    PARAMS = {}

    def __init__(self, ctx, **params):
        unknown = set(params) - set(self.PARAMS)
        if unknown:
            raise ValueError(f"{self.NAME}: unknown params {sorted(unknown)}; allowed {sorted(self.PARAMS)}")
        self.ctx, self.s, self.p = ctx, ctx.s, ctx.p
        for k, (default, _doc) in self.PARAMS.items():
            setattr(self, k, params.get(k, default))
        self.setup()

    def setup(self):
        pass

    def frame(self, i, t):
        raise NotImplementedError

    def clear(self, i, t):
        """Optional: an image (same space) whose lit pixels are cleared to black on the
        layers below before this layer is drawn. Text effects use it for `backing`."""
        return None


def _backing_from(img, cells, p, size):
    """Black pocket: padded box around every lit run of `img` (a strip image)."""
    if not cells:
        return None
    bb = img.getbbox()
    if not bb:
        return None
    m = Image.new("L", size, 0)
    pad = cells * p
    ImageDraw.Draw(m).rectangle([bb[0] - pad, bb[1] - pad, bb[2] + pad, bb[3] + pad], fill=255)
    return m


def _loops_for(speed_cells_per_s, period_px, ctx):
    """Whole number of cycles for a segment so motion stays seamless."""
    return max(1, int(round(speed_cells_per_s * ctx.p * ctx.duration / max(period_px, 1))))


def _text_tile(ctx, text, size, level, dot=1.0):
    cell = ctx.p * size
    w, h = text_size(text, cell)
    tile = Image.new("L", (max(1, w), max(1, h)), 0)
    draw_text(tile, text, 0, 0, cell, fill=level, dot=dot)
    return tile


def _place_center(s, tile, offset_px=0, align="center", margin_px=0):
    """Paste a tile onto a new strip, vertically centred, positioned within the
    usable span of the band's centre row."""
    st = s.new_strip()
    a, b = s.strip_span()
    if align == "left":
        x = a + margin_px
    elif align == "right":
        x = b - margin_px - tile.width
    else:
        x = (a + b) / 2 - tile.width / 2
    x = int(round(x + offset_px))
    y = int(round(s.ST / 2 - tile.height / 2))
    if tile.width > 1 and (x < a - 0.5 * s.pitch or x + tile.width > b + 0.5 * s.pitch or y < 0):
        print(f"  [WARN] text/image ({tile.width / s.pitch:.0f} x {tile.height / s.pitch:.0f} LEDs) runs past the "
              f"stripe ends (usable ~{(b - a) / s.pitch:.0f} LEDs along the centre): shrink size/text or reduce offset",
              file=sys.stderr)
    st.paste(tile, (x, y))
    return st


# --------------------------------------------------------------------------- text
@register("text")
class Text(Effect):
    """Static pixel-font text along the band. Optional blinking. LOOP."""
    PARAMS = {
        "text": ("SCAR 18", "text to show (about 8 chars fit at size 1)"),
        "size": (1.0, "font pixel size in LED cells (1.0 = one LED per font pixel; max ~1.6)"),
        "level": (255, "brightness 0-255"),
        "align": ("center", "center | left | right"),
        "offset": (0, "shift along the band in LED cells"),
        "blink": (0, "number of on/off blinks per segment (0 = steady)"),
        "backing": (0, "LED cells of black cleared around the text so busy layers below don't swallow it (0 = off)"),
    }

    def setup(self):
        self.img = _place_center(self.s, _text_tile(self.ctx, self.text, self.size, self.level),
                                 self.offset * self.p, self.align, self.p)
        self.pocket = _backing_from(self.img, self.backing, self.p, self.img.size)

    def clear(self, i, t):
        return self.pocket

    def frame(self, i, t):
        if self.blink and math.sin(2 * math.pi * self.blink * t) < -0.2:
            return self.s.new_strip()
        return self.img


@register("glitch_text")
class GlitchText(Effect):
    """Pixel text that tears into shifted slices, ghosts and noise blocks in short
    bursts, clean in between (ROG glitch look). LOOP."""
    PARAMS = {
        "text": ("SCAR 18", "text"),
        "size": (1.0, "font pixel size in LED cells"),
        "level": (255, "brightness"),
        "intensity": (0.6, "0-1, how violent the glitch bursts are"),
        "bursts": (3, "glitch bursts per segment"),
        "flash": (0.15, "chance per burst frame of a full-band inverted flash (x intensity); 0 = never"),
        "align": ("center", "center | left | right"),
        "offset": (0, "shift along band in LED cells"),
        "backing": (0, "LED cells of black cleared around the text so busy layers below don't swallow it (0 = off)"),
    }

    def clear(self, i, t):
        return self.pocket

    def setup(self):
        self.base = _place_center(self.s, _text_tile(self.ctx, self.text, self.size, self.level),
                                  self.offset * self.p, self.align, self.p)
        self.pocket = _backing_from(self.base, self.backing, self.p, self.base.size)
        r = self.ctx.rng("glitch", self.text)
        w = 0.05 + 0.08 * self.intensity
        self.windows = []
        for k in range(int(self.bursts)):
            c = (k + 0.25 + 0.5 * r.random()) / max(1, self.bursts)
            self.windows.append((c - w / 2, c + w / 2))

    def frame(self, i, t):
        in_burst = any(a <= t <= b for a, b in self.windows)
        r = self.ctx.rng("gf", i)
        if not in_burst and r.random() > 0.04 * self.intensity:
            return self.base
        s, p = self.s, self.p
        out = s.new_strip()
        y = 0
        kmax = 1 + int(6 * self.intensity)
        while y < s.ST:
            h = int(p * r.randint(1, 3))
            dx = int(r.randint(-kmax, kmax) * p) if r.random() < 0.7 else 0
            sl = self.base.crop((0, y, s.SL, min(s.ST, y + h)))
            if r.random() < 0.3:
                sl = sl.point(lambda v: int(v * 0.5))
            out.paste(sl, (dx, y))
            y += h
        # ghost copy
        ghost = self.base.point(lambda v: int(v * 0.35))
        g = s.new_strip()
        g.paste(ghost, (int(2 * p * r.choice([-1, 1])), int(p * r.choice([-1, 0, 1]))))
        out = Image.fromarray(np.maximum(np.asarray(out), np.asarray(g)))
        d = ImageDraw.Draw(out)
        a, b = s.strip_span()
        for _ in range(r.randint(1, 3 + int(4 * self.intensity))):
            bw, bh = p * r.randint(1, 5), p * r.randint(1, 2)
            bx, by = r.uniform(a, b - bw), r.uniform(0, s.ST - bh)
            d.rectangle([bx, by, bx + bw, by + bh], fill=r.choice([90, 160, 255]))
        if r.random() < float(self.flash) * self.intensity:
            arr = np.asarray(out)
            out = Image.fromarray((255 - arr).astype(np.uint8))
        return out


@register("marquee")
class Marquee(Effect):
    """Text scrolling along the band, tiled so there is never an empty gap. LOOP."""
    PARAMS = {
        "text": ("FOR THOSE WHO DARE", "text (any length)"),
        "size": (1.0, "font pixel size in LED cells"),
        "level": (255, "brightness"),
        "speed": (14, "LED cells per second (rounded so the loop is seamless)"),
        "gap": (8, "gap between repeats in LED cells"),
        "direction": ("left", "left = toward the top-left tip (normal reading), right = opposite"),
        "backing": (0, "LED cells of black cleared around the text so busy layers below don't swallow it (0 = off)"),
    }

    def setup(self):
        self.tile = _text_tile(self.ctx, self.text, self.size, self.level)
        self.period = self.tile.width + self.gap * self.p
        self.loops = _loops_for(self.speed, self.period, self.ctx)
        self.y = int(round(self.s.ST / 2 - self.tile.height / 2))

    def _xs(self, t):
        shift = t * self.loops * self.period
        if self.direction == "right":
            shift = -shift
        x = -(shift % self.period) - self.period
        while x < self.s.SL + self.period:
            yield int(round(x))
            x += self.period

    def frame(self, i, t):
        out = self.s.new_strip()
        for x in self._xs(t):
            out.paste(self.tile, (x, self.y))
        return out

    def clear(self, i, t):
        if not self.backing:
            return None
        m = self.s.new_strip()
        d = ImageDraw.Draw(m)
        pad = self.backing * self.p
        for x in self._xs(t):
            d.rectangle([x - pad, self.y - pad, x + self.tile.width + pad, self.y + self.tile.height + pad], fill=255)
        return m


# --------------------------------------------------------------------------- light sweeps
@register("scan")
class Scan(Effect):
    """Bright bar sweeping along the band with a fading trail. LOOP."""
    PARAMS = {
        "width": (2, "bar width in LED cells"),
        "trail": (14, "trail length in LED cells"),
        "loops": (1, "sweeps per segment (integer)"),
        "level": (255, "brightness"),
        "bg": (0, "background brightness 0-255"),
        "direction": ("right", "right = from top-left tip to bottom-right tip, left = reverse"),
        "pingpong": (False, "bounce back and forth instead of wrapping"),
    }

    def frame(self, i, t):
        s, p = self.s, self.p
        w, tr = self.width * p, self.trail * p
        travel = s.SL + w + tr
        ph = (t * self.loops) % 1.0
        if self.pingpong:
            ph = 1 - abs(2 * ph - 1)
        head = ph * travel - w
        x = np.arange(s.SL, dtype=np.float32)
        if self.direction == "left":
            x = x[::-1]
        dist = head - x
        prof = np.where((dist >= -w) & (dist <= 0), 1.0, 0.0)
        tail = np.where(dist > 0, np.exp(-dist / max(tr / 3, 1)), 0.0)
        row = np.maximum(prof, tail) * self.level
        row = np.maximum(row, self.bg)
        a = np.tile(row, (s.ST, 1))
        return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


@register("slashes")
class Slashes(Effect):
    """Leaning speed-line streaks racing along the band (kinetic / 'For those who dare' feel). LOOP."""
    PARAMS = {
        "count": (7, "number of streaks in the repeating pattern"),
        "width": (3, "max streak width in LED cells"),
        "lean": (0.0, "0 = streaks cut straight across the band like '/', positive tilts them toward the band direction, about -0.7 makes them vertical on the lid"),
        "loops": (1, "pattern passes per segment (integer)"),
        "level": (255, "max brightness"),
        "direction": ("right", "right or left along the band"),
    }

    def setup(self):
        s, p = self.s, self.p
        r = self.ctx.rng("slash")
        self.P = s.SL + self.width * p + abs(self.lean) * s.ST + p
        self.items = []
        for k in range(int(self.count)):
            x0 = (k + r.random() * 0.6) * self.P / self.count
            w = p * r.choice([1, 1, 1.5, 2, self.width])
            y0 = r.choice([0, 0, r.uniform(0, s.ST * 0.5)])
            y1 = r.choice([s.ST, s.ST, r.uniform(s.ST * 0.5, s.ST)])
            lv = r.choice([0.45, 0.7, 1.0, 1.0])
            self.items.append((x0, w, y0, y1, lv))

    def frame(self, i, t):
        s = self.s
        out = s.new_strip()
        d = ImageDraw.Draw(out)
        shift = t * self.loops * self.P * (1 if self.direction == "right" else -1)
        for x0, w, y0, y1, lv in self.items:
            x = (x0 + shift) % self.P - abs(self.lean) * s.ST
            # top of the streak leans forward
            d.polygon([(x + self.lean * (s.ST - y0), y0), (x + w + self.lean * (s.ST - y0), y0),
                       (x + w + self.lean * (s.ST - y1), y1), (x + self.lean * (s.ST - y1), y1)],
                      fill=int(self.level * lv))
        return out


# --------------------------------------------------------------------------- particles
@register("rain")
class Rain(Effect):
    """Digital rain: LED-sized drops with fading tails. direction 'down'/'up'
    falls straight down the lid; 'along'/'against' streams along the band. Drops only
    travel the part of each column that is inside the band, so nothing is wasted
    off-stripe. For a denser storm raise `drops` (or stack two rain layers with
    different "seed" values). LOOP."""
    PARAMS = {
        "density": (0.7, "0-1 share of lanes (columns) that carry drops"),
        "drops": (2, "drops per lane, evenly spaced (1-4; 3+ = heavy storm)"),
        "speed": (2, "cycles per segment (integer, higher = faster)"),
        "tail": (5, "tail length in LED cells"),
        "level": (255, "head brightness"),
        "direction": ("down", "down | up | along | against"),
    }

    def setup(self):
        s, p = self.s, self.p
        self.vertical = self.direction in ("down", "up")
        self.SPACE = "canvas" if self.vertical else "strip"
        self.lane_rows = []
        if self.vertical:
            for lane in range(int(s.W / p) + 1):
                col = s.mask_np[:, min(s.W - 1, int((lane + 0.5) * p))]
                ys = np.nonzero(col)[0]
                self.lane_rows.append((int(ys.min() / p), int(ys.max() / p) + 1) if len(ys) else None)
        else:
            rows = int(s.SL / p) + 1
            self.lane_rows = [(0, rows)] * (int(s.ST / p) + 1)
        r = self.ctx.rng("rain")
        nd = max(1, int(self.drops))
        self.items = []
        for lane, rr in enumerate(self.lane_rows):
            if rr is None or r.random() > self.density:
                continue
            base = r.random()
            m = int(self.speed) * r.choice([1, 1, 2])
            for j in range(nd):
                self.items.append((lane, (base + j / nd + r.uniform(-0.1, 0.1) / nd) % 1.0, m))

    def frame(self, i, t):
        s, p = self.s, self.p
        size = (s.W, s.H) if self.vertical else (s.SL, s.ST)
        out = Image.new("L", size, 0)
        d = ImageDraw.Draw(out)
        rev = self.direction in ("up", "against")
        tail = int(self.tail)
        for lane, ph, m in self.items:
            r0, r1 = self.lane_rows[lane]
            span = (r1 - r0) + tail
            head = ((ph + m * t) % 1.0) * span
            for k in range(tail + 1):
                rel = math.floor(head) - k
                if rel < 0 or rel >= r1 - r0:
                    continue
                pos = (r1 - 1 - rel) if rev else (r0 + rel)
                lv = int(self.level * (1 - k / (tail + 1)) ** 1.5)
                if self.vertical:
                    x0, y0 = lane * p, pos * p
                else:
                    x0, y0 = pos * p, lane * p
                d.rectangle([x0 + 1, y0 + 1, x0 + p - 1, y0 + p - 1], fill=lv)
        return out


@register("sparkle")
class Sparkle(Effect):
    """Random LEDs twinkling on and off. LOOP."""
    SPACE = "canvas"
    PARAMS = {
        "count": (40, "number of twinkling points"),
        "speed": (2, "max twinkles per point per segment (integer)"),
        "size": (1, "point size in LED cells"),
        "level": (255, "brightness"),
    }

    def setup(self):
        r = self.ctx.rng("sparkle")
        ys, xs = np.nonzero(self.s.mask_np)
        self.pts = []
        for _ in range(int(self.count)):
            k = r.randrange(len(xs))
            self.pts.append((xs[k], ys[k], r.random(), r.randint(1, max(1, int(self.speed)))))

    def frame(self, i, t):
        out = self.s.new_canvas()
        d = ImageDraw.Draw(out)
        h = self.size * self.p / 2
        for x, y, ph, k in self.pts:
            b = max(0.0, math.sin(2 * math.pi * (k * t + ph))) ** 4
            if b > 0.02:
                d.rectangle([x - h, y - h, x + h, y + h], fill=int(self.level * b))
        return out


@register("static")
class Static(Effect):
    """TV static / data noise at LED resolution. Not seamless (it is noise), so use it short."""
    SPACE = "canvas"
    PARAMS = {
        "density": (0.5, "0-1 share of LEDs lit"),
        "level": (255, "max brightness"),
        "grain": (1, "noise block size in LED cells"),
    }

    def frame(self, i, t):
        s, g = self.s, max(1, int(self.grain))
        gw, gh = int(s.W / (self.p * g)) + 1, int(s.H / (self.p * g)) + 1
        r = np.random.default_rng((self.ctx.seed, i))
        a = (r.random((gh, gw)) < self.density) * r.choice([0.35, 0.7, 1.0], (gh, gw)) * self.level
        return Image.fromarray(a.astype(np.uint8)).resize((s.W, s.H), Image.NEAREST)


# --------------------------------------------------------------------------- fields
@register("plasma")
class Plasma(Effect):
    """Smooth flowing light field (liquid / aurora look). LOOP."""
    PARAMS = {
        "scale": (1.0, "pattern size (bigger = broader blobs)"),
        "speed": (1, "cycles per segment (integer)"),
        "contrast": (1.6, "contrast boost"),
        "level": (255, "max brightness"),
        "threshold": (None, "0-255: if set, LEDs are hard on/off above this brightness"),
    }

    def frame(self, i, t):
        s = self.s
        gu, gv = int(s.cells_long) + 2, int(s.cells_across) + 2
        u, v = np.meshgrid(np.arange(gu, dtype=np.float32), np.arange(gv, dtype=np.float32))
        k = 2 * math.pi * t * int(self.speed)
        sc = float(self.scale)
        f = (np.sin(u * 0.33 / sc + k) + np.sin((v * 0.7 + u * 0.12) / sc - k)
             + np.sin(np.hypot(u - gu / 2, (v - gv / 2) * 2) * 0.35 / sc - 2 * k))
        a = (f + 3) / 6
        a = np.clip((a - 0.5) * self.contrast + 0.5, 0, 1)
        if self.threshold is not None:
            a = (a * 255 > float(self.threshold)).astype(np.float32)
        img = Image.fromarray((a * self.level).astype(np.uint8))
        return img.resize((s.SL, s.ST), Image.BILINEAR)


@register("fill")
class Fill(Effect):
    """Whole band at one brightness, or ramping from `start` to `end` over the segment."""
    PARAMS = {
        "start": (255, "brightness at segment start"),
        "end": (None, "brightness at segment end (None = same as start)"),
    }

    def frame(self, i, t):
        e = self.start if self.end is None else self.end
        return self.s.new_strip(int(self.start + (e - self.start) * t))


# --------------------------------------------------------------------------- audio / heartbeat
@register("eq")
class EQ(Effect):
    """Fake audio-visualiser bars standing across the band, segmented like LED meters. LOOP."""
    PARAMS = {
        "bars": (0, "number of bars (0 = auto, one every 2 LEDs)"),
        "style": ("mirror", "mirror (from the centre line) | bottom | top"),
        "speed": (2, "bounce cycles per segment (integer)"),
        "level": (255, "brightness"),
        "peaks": (True, "dim peak cap above each bar"),
    }

    def setup(self):
        s, p = self.s, self.p
        a, b = s.strip_span()
        self.a, self.b = a, b
        n = self.bars or int((b - a) / (2 * p))
        self.n = max(3, int(n))
        r = self.ctx.rng("eq")
        self.ph = [(r.random(), r.random(), r.random()) for _ in range(self.n)]

    def height(self, j, t):
        k = int(self.speed)
        f1, f2, f3 = self.ph[j]
        v = (0.45 + 0.3 * math.sin(2 * math.pi * (k * t + f1 + j * 0.07))
             + 0.18 * math.sin(2 * math.pi * (2 * k * t + f2)) + 0.12 * math.sin(2 * math.pi * (3 * k * t + f3)))
        return min(1.0, max(0.08, v))

    def frame(self, i, t):
        s, p = self.s, self.p
        out = s.new_strip()
        d = ImageDraw.Draw(out)
        bw = (self.b - self.a) / self.n
        cells_total = int(s.ST / p)
        for j in range(self.n):
            h = self.height(j, t)
            x0 = self.a + j * bw + 1
            x1 = x0 + max(p * 0.8, bw - p * 0.6)
            if self.style == "mirror":
                half = int(round(h * cells_total / 2))
                for c in range(half):
                    for sgn in (-1, 1):
                        yc = s.ST / 2 + sgn * (c + 0.5) * p
                        d.rectangle([x0, yc - p * 0.4, x1, yc + p * 0.4], fill=self.level)
            else:
                cells = int(round(h * cells_total))
                for c in range(cells):
                    yc = (s.ST - (c + 0.5) * p) if self.style == "bottom" else (c + 0.5) * p
                    d.rectangle([x0, yc - p * 0.4, x1, yc + p * 0.4], fill=self.level)
            if self.peaks and self.style != "mirror":
                hp = max(h, self.height(j, (t - 0.04) % 1))
                c = int(round(hp * cells_total)) + 1
                yc = (s.ST - (c + 0.5) * p) if self.style == "bottom" else (c + 0.5) * p
                d.rectangle([x0, yc - p * 0.3, x1, yc + p * 0.3], fill=int(self.level * 0.45))
        return out


def _ecg(x):
    """One heartbeat, x in [0,1) -> -1..1"""
    def bump(c, w, a):
        return a * math.exp(-((x - c) / w) ** 2)
    return (bump(0.18, 0.04, 0.18) - bump(0.36, 0.012, 0.25) + bump(0.40, 0.014, 1.0)
            - bump(0.44, 0.014, 0.35) + bump(0.66, 0.06, 0.3))


@register("pulse")
class Pulse(Effect):
    """Heart-monitor trace drawn by a moving head, with the whole band breathing on each beat. LOOP."""
    PARAMS = {
        "beats": (2, "heartbeats visible along the band"),
        "loops": (1, "sweeps per segment (integer)"),
        "trail": (40, "how far the glowing trace lasts, in LED cells"),
        "level": (255, "trace brightness"),
        "glow": (60, "max background flash brightness on each beat (0 = none)"),
    }

    def frame(self, i, t):
        s, p = self.s, self.p
        out = s.new_strip()
        a, b = s.strip_span()
        L = b - a
        head = a + ((t * self.loops) % 1.0) * L
        # beat flash when the head passes a spike
        beat_x = [a + (k + 0.40) * L / self.beats for k in range(int(self.beats))]
        dist = min(((head - bx) % L) for bx in beat_x)
        flash = int(self.glow * math.exp(-dist / (3 * p)))
        if flash:
            out = s.new_strip(flash)
        d = ImageDraw.Draw(out)
        amp = s.ST * 0.38
        prev = None
        step = max(1.0, p / 3)
        x = a
        while x <= b:
            ph = ((x - a) / (L / self.beats)) % 1.0
            y = s.ST / 2 - _ecg(ph) * amp
            behind = (head - x) % L
            br = math.exp(-behind / (self.trail * p / 3)) if behind < self.trail * p else 0
            if prev and br > 0.03:
                d.line([prev, (x, y)], fill=max(flash, int(self.level * br ** 0.6)), width=max(2, int(p * 1.15)))
            prev = (x, y)
            x += step
        hy = s.ST / 2 - _ecg(((head - a) / (L / self.beats)) % 1.0) * amp
        d.ellipse([head - p, hy - p, head + p, hy + p], fill=self.level)
        return out


# --------------------------------------------------------------------------- sequences
@register("boot")
class Boot(Effect):
    """One-shot boot-up: loading bar fills, text types on with a cursor, white flash, hold.
    Not seamless by design - set the slot to '1 Loop' or put it first in a scene."""
    PARAMS = {
        "text": ("SCAR 18", "text revealed after loading"),
        "size": (1.0, "font pixel size in LED cells"),
        "level": (255, "brightness"),
        "backing": (0, "LED cells of black cleared around the text so busy layers below don't swallow it (0 = off)"),
    }

    def clear(self, i, t):
        return _backing_from(_place_center(self.s, self.tile), self.backing, self.p, (self.s.SL, self.s.ST))

    def setup(self):
        self.tile = _text_tile(self.ctx, self.text, self.size, self.level)

    def frame(self, i, t):
        s, p = self.s, self.p
        a, b = s.strip_span()
        out = s.new_strip()
        d = ImageDraw.Draw(out)
        cy = s.ST / 2
        if t < 0.4:
            k = (t / 0.4) ** 0.7
            x0, x1 = a + p, b - p
            d.rectangle([x0, cy - 1.5 * p, x1, cy + 1.5 * p], outline=int(self.level * 0.6), width=max(1, int(p * 0.5)))
            cells = int((x1 - x0 - 2 * p) / p)
            for c in range(int(cells * k)):
                xx = x0 + p + c * p
                d.rectangle([xx + 1, cy - 0.6 * p, xx + p - 2, cy + 0.6 * p], fill=self.level)
            return out
        if t < 0.75:
            k = (t - 0.4) / 0.35
            n = len(self.text)
            shown = min(n, int(k * n) + 1)
            tile = _text_tile(self.ctx, self.text[:shown], self.size, self.level)
            full_w = self.tile.width
            x = (a + b) / 2 - full_w / 2
            out.paste(tile, (int(x), int(cy - tile.height / 2)))
            if (i // max(1, int(self.ctx.fps / 6))) % 2 == 0:
                cx = x + tile.width + p
                d.rectangle([cx, cy - 3.5 * p * self.size, cx + p * self.size, cy + 3.5 * p * self.size], fill=self.level)
            return out
        hold = _place_center(s, self.tile)
        if t < 0.85:
            k = (t - 0.75) / 0.1
            return Image.fromarray(np.maximum(np.asarray(hold), int(255 * (1 - k)) * np.ones((s.ST, s.SL), np.uint8)))
        return hold


@register("image")
class ImageFx(Effect):
    """Your own logo / picture on the band. space='strip' lays it along the band (best for
    wide logos and words); space='canvas' maps it 1:1 onto the GIF canvas (for art drawn for
    the stripe shape). Colour logos: set tones=2-4 so each colour region gets its own
    clearly different brightness (plain luma often merges colours into one blob).
    mode: still | reveal (bright bar sweeps the whole band, logo appears behind it, flash, hold)
    | reveal_out (reveal, hold, dissolve away) | pulse (heartbeat, LOOP) | scroll (LOOP)."""
    PARAMS = {
        "path": (None, "image file (png/jpg/gif first frame)"),
        "space": ("strip", "strip | canvas"),
        "fit": ("contain", "contain | cover"),
        "mode": ("still", "still | reveal | reveal_out | pulse | scroll"),
        "tones": (0, "0 = brightness from luma; 2-4 = split the logo's colours into that many distinct LED levels"),
        "tone_floor": (70, "dimmest level used by tones (0-255)"),
        "invert": (False, "swap dark and light"),
        "threshold": (None, "0-255: hard on/off LEDs (crisper logos)"),
        "alpha": ("auto", "auto | shape | luma : how transparency is used"),
        "level": (255, "max brightness"),
        "margin": (1, "margin in LED cells (strip space)"),
        "beats": (2, "pulses per segment (mode=pulse, integer)"),
        "floor": (0.35, "lowest brightness during a pulse, 0-1 (keep >= 0.3 or the logo vanishes)"),
        "speed": (12, "scroll speed in LED cells per second (mode=scroll)"),
    }

    def _tones(self, src, alpha):
        rgb = src.convert("RGB")
        a = np.asarray(rgb).copy()
        opaque = alpha > 0.5
        if not opaque.any():
            opaque[:] = True
        fill = np.median(a[opaque], axis=0).astype(np.uint8)
        a[~opaque] = fill
        q = Image.fromarray(a).quantize(colors=int(self.tones), method=Image.Quantize.MEDIANCUT)
        idx = np.asarray(q)
        pal = np.array(q.getpalette()[: 3 * 256]).reshape(-1, 3)
        used = sorted(set(idx[opaque].tolist()), key=lambda c: pal[c] @ [0.299, 0.587, 0.114])
        lv = np.linspace(self.tone_floor / 255.0, 1.0, len(used)) if len(used) > 1 else [1.0]
        val = np.zeros(idx.shape, np.float32)
        for c, v in zip(used, lv):
            val[idx == c] = v
        val[~opaque] = 0
        return val

    def setup(self):
        if not self.path:
            raise ValueError("image: 'path' is required")
        self.SPACE = self.space
        src = Image.open(self.path)
        src.seek(0)
        src = src.convert("RGBA")
        rgb = np.asarray(src.convert("RGB"), dtype=np.float32)
        luma = (0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]) / 255.0
        alpha = np.asarray(src.getchannel("A"), dtype=np.float32) / 255.0
        has_alpha = alpha.min() < 0.99
        if self.tones and int(self.tones) >= 2:
            val = self._tones(src, alpha if has_alpha else np.ones_like(alpha))
            if self.invert:
                val = np.where(val > 0, 1 - val + self.tone_floor / 255.0, 0)
        else:
            mode = self.alpha
            if mode == "auto":
                mode = "luma"
                if has_alpha and luma[alpha > 0.5].mean() < 0.35:
                    mode = "shape"          # dark logo on transparent background
            val = alpha if mode == "shape" else luma * alpha
            if self.invert:
                val = (1 - val) * (alpha if has_alpha else 1)
            if mode != "shape" and val.max() > val.min():   # autocontrast
                val = (val - val.min()) / (val.max() - val.min())
        img = Image.fromarray((np.clip(val, 0, 1) * 255).astype(np.uint8))
        bb = img.getbbox()
        if bb:
            img = img.crop(bb)
        s, p = self.s, self.p
        if self.space == "canvas":
            box_w, box_h, cx, cy, size = s.W, s.H, s.W / 2, s.H / 2, (s.W, s.H)
        else:
            a, b = s.strip_span()
            m = self.margin * p
            box_w, box_h, cx, cy, size = (b - a) - 2 * m, s.ST - 2 * m, (a + b) / 2, s.ST / 2, (s.SL, s.ST)
        k = (min if self.fit == "contain" else max)(box_w / img.width, box_h / img.height)
        resample = Image.NEAREST if (self.tones and int(self.tones) >= 2) else Image.LANCZOS
        img = img.resize((max(1, int(img.width * k)), max(1, int(img.height * k))), resample)
        if self.threshold is not None:
            img = img.point(lambda v: 255 if v >= int(self.threshold) else 0)
        img = img.point(lambda v: int(v * self.level / 255))
        self.tile = img
        self.base = Image.new("L", size, 0)
        self.base.paste(img, (int(cx - img.width / 2), int(cy - img.height / 2)))
        if self.mode == "scroll":
            self.period = img.width + 6 * p
            self.loops = _loops_for(self.speed, self.period, self.ctx)

    def _reveal(self, t, wipe=0.35):
        p = self.p
        W = self.base.width
        if t >= wipe + 0.06:
            return self.base
        if t >= wipe:   # landing flash
            k = 1 - (t - wipe) / 0.06
            return Image.fromarray(np.maximum(np.asarray(self.base), int(150 * k)).astype(np.uint8))
        edge = (t / wipe) * (W + 2 * p)          # sweeps the full band, tip to tip
        a = np.asarray(self.base).copy()
        a[:, int(max(0, edge)):] = 0
        e0, e1 = int(max(0, edge - 1.5 * p)), int(min(W, edge + 0.5 * p))
        a[:, e0:e1] = 255
        tr0 = int(max(0, edge - 6 * p))
        if tr0 < e0:
            ramp = np.linspace(0, 120, e0 - tr0)[None, :].astype(np.uint8)
            a[:, tr0:e0] = np.maximum(a[:, tr0:e0], ramp)
        return Image.fromarray(a)

    def frame(self, i, t):
        p = self.p
        if self.mode == "still":
            return self.base
        if self.mode == "pulse":
            ph = (t * max(1, int(self.beats))) % 1.0
            b = math.exp(-ph * 6)                       # sharp hit, slow decay
            k = float(self.floor) + (1 - float(self.floor)) * b
            return self.base.point(lambda v: int(v * k))
        if self.mode == "scroll":
            out = Image.new("L", self.base.size, 0)
            x = -((t * self.loops * self.period) % self.period) - self.period
            y = int(self.base.height / 2 - self.tile.height / 2)
            while x < self.base.width + self.period:
                out.paste(self.tile, (int(x), y))
                x += self.period
            return out
        if self.mode == "reveal":
            return self._reveal(t)
        # reveal_out
        if t < 0.8:
            return self._reveal(t / 0.8 * 1.0, wipe=0.35)
        k = (t - 0.8) / 0.2
        r = np.random.default_rng((self.ctx.seed, 77))
        W = self.base.width
        cells = r.random((int(self.base.height / p) + 1, int(W / p) + 1))
        keep = Image.fromarray(((cells > k) * 255).astype(np.uint8)).resize(self.base.size, Image.NEAREST)
        return Image.fromarray((np.asarray(self.base) * (np.asarray(keep) / 255.0)).astype(np.uint8))


@register("custom")
class Custom(Effect):
    """Your own Python effect. The file defines SPACE = 'strip' | 'canvas' and
    def frame(ctx, i, t) -> PIL 'L' image (ctx.s = Stripe, ctx.p = LED pitch px).
    Optional def setup(ctx, params). Extra keys in `params` are passed through."""
    PARAMS = {"file": (None, "path to the .py file"), "params": ({}, "dict passed to setup()")}

    def setup(self):
        spec = importlib.util.spec_from_file_location("lidgif_custom", self.file)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        self.mod = mod
        self.SPACE = getattr(mod, "SPACE", "strip")
        if hasattr(mod, "setup"):
            mod.setup(self.ctx, dict(self.params))

    def frame(self, i, t):
        return self.mod.frame(self.ctx, i, t).convert("L")


def catalogue():
    lines = []
    for name, cls in EFFECTS.items():
        lines.append(f"\n{name}  [{cls.SPACE}]\n    {cls.__doc__.strip()}")
        for k, (dv, doc) in cls.PARAMS.items():
            lines.append(f"      {k} = {dv!r}  - {doc}")
    return "\n".join(lines)
