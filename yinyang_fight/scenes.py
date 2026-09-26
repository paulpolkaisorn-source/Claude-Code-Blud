"""Parallax backgrounds: void, mountain (dusk -> storm, with split), cosmos."""
import math

import cairocffi as cairo
import numpy as np

from .config import rgb
from .effects import glow_dot, lerpc, TAU

_rng = np.random.default_rng(1234)


def _ridge(x0, x1, step, base, amp, seed, rough=0.55):
    rng = np.random.default_rng(seed)
    xs = np.arange(x0, x1 + step, step)
    ys = np.zeros_like(xs, dtype=float)
    a = amp
    f = 1.0 / 900.0
    for o in range(6):
        ph = rng.uniform(0, 100)
        ys += a * np.sin(xs * f + ph) * (0.6 + 0.4 * np.sin(xs * f * 0.37 + ph * 2))
        a *= rough
        f *= 2.05
    peaks = np.abs(np.sin(xs / 2600.0 + seed)) ** 3 * amp * 1.2
    return xs, base + ys + peaks


RANGES = [
    (0.10, _ridge(-9000, 9000, 70, 150, 120, 11)),
    (0.22, _ridge(-9000, 9000, 60, 40, 110, 23)),
    (0.40, _ridge(-9000, 9000, 50, -60, 100, 37)),
]

# main peak (world layer). Flat fighting plateau at y=0 for |x| < 1150.
_pr = np.random.default_rng(77)
PEAK_L = [(-1150, 0)]
x, y = -1150, 0
while x > -3800:
    x -= _pr.uniform(40, 110)
    y -= _pr.uniform(30, 150)
    PEAK_L.append((x + _pr.uniform(-20, 20), y))
PEAK_R = [(1150, 0)]
x, y = 1150, 0
while x < 3800:
    x += _pr.uniform(40, 110)
    y -= _pr.uniform(30, 150)
    PEAK_R.append((x + _pr.uniform(-20, 20), y))
PEAK = PEAK_L[::-1] + PEAK_R + [(4200, -9000), (-4200, -9000)]
STRATA = [(_pr.uniform(-1100, 1100), -_pr.uniform(30, 600), _pr.uniform(60, 260)) for _ in range(26)]
ROCKS = [(-1080, 0, 48), (-1010, 0, 30), (1040, 0, 56), (1110, 0, 36), (-640, 0, 16), (720, 0, 12)]

CLOUDS = []
for d in (0.35, 0.55, 0.8):
    for i in range(34):
        cx = _rng.uniform(-5000, 5000)
        cy = _rng.uniform(-100, 2600) * d + 250
        blobs = [(cx + _rng.uniform(-260, 260), cy + _rng.uniform(-50, 70), _rng.uniform(90, 230))
                 for _ in range(6)]
        CLOUDS.append((d, blobs, _rng.uniform(8, 30)))
FORE_CLOUDS = [(1.35, [(x0 + _rng.uniform(-300, 300), y0 + _rng.uniform(-60, 60), _rng.uniform(140, 300))
                       for _ in range(5)], 60)
               for x0, y0 in zip(_rng.uniform(-6000, 6000, 16), _rng.uniform(500, 2400, 16))]

STARS = [(d, _rng.uniform(0, 1, (n, 2)), _rng.uniform(0.6, 2.0, n), _rng.uniform(0, TAU, n))
         for d, n in ((0.03, 260), (0.07, 160), (0.14, 90))]
NEBULA = [(_rng.uniform(-1400, 1400), _rng.uniform(-300, 1500), _rng.uniform(350, 900),
           [rgb('#5b3a9a'), rgb('#1f6f8b'), rgb('#8a2d6b'), rgb('#2c3f99')][i % 4], _rng.uniform(0.18, 0.34))
          for i in range(14)]
MOTES = _rng.uniform(0, 1, (70, 4))


def layer(ctx, R, d, div=1):
    ctx.identity_matrix()
    ctx.translate(R.Wpx / (2 * div), R.Hpx / (2 * div))
    ctx.rotate(R.crot)
    z = (1 + (R.zoom - 1) * d) * R.s / div if d < 1 else R.zoom * R.s / div
    if d > 1:
        z = R.zoom * d * R.s / div
    ctx.scale(z, -z)
    ctx.translate(-R.cx * d, -R.cy * d)


def _poly(ctx, pts):
    ctx.move_to(*pts[0])
    for p in pts[1:]:
        ctx.line_to(*p)
    ctx.close_path()


# ---------------------------------------------------------------------------

def draw_void(ctx, R, t):
    ctx.identity_matrix()
    pat = cairo.RadialGradient(R.Wpx / 2, R.Hpx / 2, 0, R.Wpx / 2, R.Hpx / 2, R.Wpx * 0.75)
    pat.add_color_stop_rgb(0, *rgb('#241c35'))
    pat.add_color_stop_rgb(0.5, *rgb('#110d1a'))
    pat.add_color_stop_rgb(1, *rgb('#040306'))
    ctx.set_source(pat)
    ctx.paint()
    layer(ctx, R, 0.3)
    for i in range(40):
        m = MOTES[i]
        x = (m[0] - 0.5) * 2600 + R.cx * 0.3
        y = ((m[1] + t * 0.02 * (0.5 + m[2])) % 1.0 - 0.5) * 1600 + R.cy * 0.3
        a = 0.25 + 0.25 * math.sin(t * 1.5 + m[3] * 9)
        ctx.arc(x, y, 1.5 + 2 * m[2], 0, TAU)
        ctx.set_source_rgba(0.8, 0.75, 0.95, a)
        ctx.fill()


def draw_mountain_far(ctx, R, t, fx):
    st = fx['storm']
    top = lerpc(rgb('#1d1838'), rgb('#10141e'), st)
    mid = lerpc(rgb('#6a3f6e'), rgb('#27303f'), st)
    hor = lerpc(rgb('#f39a6b'), rgb('#4d586d'), st)
    flash = fx['skyflash']
    if flash > 0:
        top = lerpc(top, rgb('#9aa6d8'), flash * 0.6)
        mid = lerpc(mid, rgb('#c4cdf5'), flash * 0.6)
        hor = lerpc(hor, rgb('#dfe5ff'), flash * 0.5)
    layer(ctx, R, 0.12)
    pat = cairo.LinearGradient(0, -250, 0, 1500)
    pat.add_color_stop_rgb(0, *hor)
    pat.add_color_stop_rgb(0.35, *mid)
    pat.add_color_stop_rgb(1, *top)
    ctx.set_source(pat)
    ctx.paint()
    # sun
    if st < 1:
        layer(ctx, R, 0.05)
        a = (1 - st)
        glow_dot(ctx, -420, 250, 800, rgb('#ffb37a'), 0.5 * a)
        ctx.arc(-420, 250, 95, 0, TAU)
        ctx.set_source_rgba(*rgb('#ffe2b8'), a)
        ctx.fill()
    # far ranges
    cols_d = [rgb('#7c5779'), rgb('#57405f'), rgb('#3a2c47')]
    cols_s = [rgb('#3f485e'), rgb('#30384b'), rgb('#232937')]
    for i, (d, (xs, ys)) in enumerate(RANGES):
        layer(ctx, R, d)
        zl = max(0.2, 1 + (R.zoom - 1) * d)
        lo = R.cx * d - 1400 / zl
        hi = R.cx * d + 1400 / zl
        i0 = max(0, int(np.searchsorted(xs, lo)) - 1)
        i1 = min(len(xs), int(np.searchsorted(xs, hi)) + 1)
        ctx.move_to(xs[i0], -5000)
        for k in range(i0, i1):
            ctx.line_to(xs[k], ys[k])
        ctx.line_to(xs[i1 - 1], -5000)
        ctx.close_path()
        c = lerpc(cols_d[i], cols_s[i], st)
        if flash > 0:
            c = lerpc(c, rgb('#8e97c4'), flash * 0.35 * (1 - i * 0.25))
        ctx.set_source_rgb(*c)
        ctx.fill()
        # haze band
        hz = lerpc(hor, mid, 0.3)
        pat = cairo.LinearGradient(0, -300, 0, 250)
        pat.add_color_stop_rgba(0, *hz, 0.0)
        pat.add_color_stop_rgba(1, *hz, 0.22 * (1 - i * 0.2))
        ctx.set_source(pat)
        ctx.paint()
    # clouds
    for d, blobs, sp in CLOUDS:
        dens = 0.25 + 0.75 * st
        if d < 0.5 and st < 0.2:
            continue
        layer(ctx, R, d)
        col = lerpc(rgb('#d08a8f'), rgb('#4a5368'), st)
        if flash > 0:
            col = lerpc(col, rgb('#c9d1ff'), flash * 0.5)
        for bx, by, br in blobs:
            x = ((bx + t * sp + 5000) % 10000) - 5000
            if abs(x - R.cx * d) > 1400 / max(0.3, R.zoom) + br:
                continue
            glow_dot(ctx, x, by, br * 1.4, col, 0.35 * dens)


def draw_mountain_near(ctx, R, t, fx):
    st = fx['storm']
    flash = fx['skyflash']
    layer(ctx, R, 1.0)
    split = fx['split']
    if split <= 0:
        _draw_peak(ctx, st, flash)
    else:
        sx = fx['splitx']
        for side in (-1, 1):
            ctx.save()
            ctx.rectangle(sx - 20000 if side < 0 else sx, -20000, 20000, 40000)
            ctx.clip()
            ctx.translate(side * 150 * split, -30 * split * (1.5 if side > 0 else 1))
            ctx.rotate(-side * 0.035 * split)
            _draw_peak(ctx, st, flash)
            ctx.restore()
        # glowing rift: jagged V-shaped fissure between the halves
        c = rgb('#9c5cff')
        glow_dot(R.g if R.g is not None else ctx, sx, -500, 800 * split, c, 0.7 * split)
        rng = np.random.default_rng(5)
        depth = 2600
        n = 14
        left, right = [], []
        for k in range(n + 1):
            u = k / n
            wdt = 150 * split * (1 - u) ** 1.2 + 6 * split
            jig = rng.uniform(-30, 30) * split
            left.append((sx - wdt + jig - (-30 * split), -u * depth - 30 * split))
            right.append((sx + wdt + jig + (0 if u > 0 else 0), -u * depth - 45 * split))
        pts = left + right[::-1]
        _poly(ctx, pts)
        pat = cairo.LinearGradient(0, 0, 0, -depth)
        pat.add_color_stop_rgba(0, 0.05, 0.02, 0.1, 1)
        pat.add_color_stop_rgba(0.25, *c, 0.95)
        pat.add_color_stop_rgba(1, 0.9, 0.8, 1.0, 1)
        ctx.set_source(pat)
        ctx.fill()
        ctx.set_source_rgba(0.85, 0.7, 1.0, 0.8)
        ctx.set_line_width(4)
        ctx.move_to(*left[0])
        for p in left[1:]:
            ctx.line_to(*p)
        ctx.move_to(*right[0])
        for p in right[1:]:
            ctx.line_to(*p)
        ctx.stroke()
    # dust motes / embers
    wind = fx['wind']
    for i in range(len(MOTES)):
        m = MOTES[i]
        span_x, span_y = 2600.0 / max(0.35, R.zoom) * 1.2, 1400.0 / max(0.35, R.zoom) * 1.2
        x = R.cx + ((m[0] * span_x - t * (60 + 260 * wind) * (0.4 + m[2]) - R.cx) % span_x) - span_x / 2
        y = R.cy + ((m[1] * span_y + 25 * math.sin(t * 0.8 + m[3] * 6) - R.cy) % span_y) - span_y / 2
        ctx.arc(x, y, 1.2 + 1.8 * m[2], 0, TAU)
        c = lerpc(rgb('#ffd7b0'), rgb('#aab4d0'), st)
        ctx.set_source_rgba(*c, 0.35 + 0.3 * m[3])
        ctx.fill()


def _draw_peak(ctx, st, flash):
    body = lerpc(rgb('#140f1a'), rgb('#10131a'), st)
    edge = lerpc(rgb('#b08aa8'), rgb('#7d8aa8'), st)
    if flash > 0:
        edge = lerpc(edge, rgb('#dde3ff'), flash * 0.6)
    _poly(ctx, PEAK)
    pat = cairo.LinearGradient(0, 0, 0, -900)
    pat.add_color_stop_rgb(0, *lerpc(body, edge, 0.22))
    pat.add_color_stop_rgb(1, *body)
    ctx.set_source(pat)
    ctx.fill()
    for (x, y, w) in STRATA:
        ctx.move_to(x, y)
        ctx.line_to(x + w, y - w * 0.12)
        ctx.set_source_rgba(*edge, 0.12)
        ctx.set_line_width(3)
        ctx.stroke()
    for (x, y, r) in ROCKS:
        ctx.move_to(x - r, y)
        ctx.line_to(x - r * 0.4, y + r * 0.9)
        ctx.line_to(x + r * 0.5, y + r * 0.7)
        ctx.line_to(x + r, y)
        ctx.close_path()
        ctx.set_source_rgb(*body)
        ctx.fill_preserve()
        ctx.set_source_rgba(*edge, 0.8)
        ctx.set_line_width(2.5)
        ctx.stroke()
    ctx.move_to(*PEAK_L[-1])
    for p in PEAK_L[::-1][1:]:
        ctx.line_to(*p)
    for p in PEAK_R:
        ctx.line_to(*p)
    ctx.set_source_rgba(*edge, 0.9)
    ctx.set_line_width(3.5)
    ctx.stroke()


def draw_fore_clouds(ctx, R, t, fx):
    st = fx['storm']
    if st < 0.3 or fx['scene'] > 1.5:
        return
    col = rgb('#58627a')
    for d, blobs, sp in FORE_CLOUDS:
        layer(ctx, R, d)
        for bx, by, br in blobs:
            x = ((bx + t * sp + 6000) % 12000) - 6000
            if abs(x - R.cx * d) > 1300 / max(0.3, R.zoom * d) + br:
                continue
            glow_dot(ctx, x, by, br * 1.5, col, 0.28 * (st - 0.3) / 0.7)


def draw_cosmos_far(ctx, R, t, fx):
    ctx.identity_matrix()
    pat = cairo.LinearGradient(0, 0, 0, R.Hpx)
    pat.add_color_stop_rgb(0, *rgb('#060918'))
    pat.add_color_stop_rgb(1, *rgb('#1a0f33'))
    ctx.set_source(pat)
    ctx.paint()
    layer(ctx, R, 0.03)
    for (x, y, r, c, a) in NEBULA:
        glow_dot(ctx, x + R.cx * 0.0, y + 150, r, c, a)


def draw_cosmos_near(ctx, R, t, fx):
    for d, P, sz, ph in STARS:
        layer(ctx, R, d)
        span_x = 2400.0 / max(0.4, 1 + (R.zoom - 1) * d)
        span_y = 1500.0 / max(0.4, 1 + (R.zoom - 1) * d)
        X = R.cx * d + ((P[:, 0] * span_x - R.cx * d) % span_x) - span_x / 2
        Y = R.cy * d + ((P[:, 1] * span_y - R.cy * d) % span_y) - span_y / 2
        tw = 0.55 + 0.45 * np.sin(t * 2.3 + ph * 5)
        for i in range(len(X)):
            ctx.arc(X[i], Y[i], sz[i] * (0.8 + d * 4), 0, TAU)
            ctx.set_source_rgba(0.9, 0.92, 1.0, tw[i])
            ctx.fill()
    # moon
    layer(ctx, R, 0.1)
    mx, my = -650, 640
    glow_dot(ctx, mx, my, 260, rgb('#9fb4ff'), 0.25)
    ctx.arc(mx, my, 92, 0, TAU)
    pat = cairo.RadialGradient(mx + 30, my + 30, 10, mx, my, 92)
    pat.add_color_stop_rgb(0, *rgb('#e8e6f2'))
    pat.add_color_stop_rgb(1, *rgb('#8a87a3'))
    ctx.set_source(pat)
    ctx.fill()
    for (dx, dy, r) in ((-30, 20, 14), (25, -30, 18), (35, 35, 9), (-20, -45, 8)):
        ctx.arc(mx + dx, my + dy, r, 0, TAU)
        ctx.set_source_rgba(0.45, 0.43, 0.55, 0.5)
        ctx.fill()
    # planet
    layer(ctx, R, 0.2)
    px, py, pr = 0, -3300, 4000
    glow_dot(ctx, px, py, pr + 300, rgb('#4fc3ff'), 0.35)
    ctx.arc(px, py, pr, 0, TAU)
    pat = cairo.RadialGradient(px - 900, py + 3600, 100, px, py, pr)
    pat.add_color_stop_rgb(0, *rgb('#2e6fa8'))
    pat.add_color_stop_rgb(0.5, *rgb('#12325c'))
    pat.add_color_stop_rgb(1, *rgb('#061126'))
    ctx.set_source(pat)
    ctx.fill()
    ctx.arc(px, py, pr + 6, 0, TAU)
    ctx.set_source_rgba(*rgb('#8fe3ff'), 0.7)
    ctx.set_line_width(14)
    ctx.stroke()
