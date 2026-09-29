"""Visual effects. Every effect: t0/t1 in world time; draw(ctx, R, i) where R is the render context."""
import math
import random
from math import sin, cos, pi, hypot, atan2, exp

import cairo

from rig import clamp, lerp, sstep, mix, capsule, fighter_shapes, draw_fighter, pose_lerp, hexc

# element colours
YIN_C = hexc('#7d4dff')
YIN_D = hexc('#0a0716')
YIN_L = hexc('#cdb8ff')
YANG_C = hexc('#ffd35a')
YANG_L = hexc('#fff6d6')
WHITE = (1.0, 1.0, 1.0)


def _u(fx, w):
    return clamp((w - fx.t0) / max(1e-6, fx.t1 - fx.t0), 0.0, 1.0)


class FX:
    layer = 'front'
    t0 = 0.0
    t1 = 0.0

    def draw(self, ctx, R, i):
        pass


# ----------------------------------------------------------------------------
class Flash(FX):
    def __init__(self, t0, x, y, r, color=WHITE, dur=0.22, add=True, layer='front', core=True, power=2.0):
        self.t0, self.t1 = t0, t0 + dur
        self.x, self.y, self.r, self.c, self.add, self.layer, self.core, self.pw = x, y, r, color, add, layer, core, power

    def draw(self, ctx, R, i):
        u = _u(self, R.w)
        a = (1 - u) ** self.pw
        r = self.r * (0.55 + 0.7 * u ** 0.5)
        c = self.c
        ctx.save()
        if self.add:
            ctx.set_operator(cairo.OPERATOR_ADD)
        rg = cairo.RadialGradient(self.x, self.y, 0, self.x, self.y, r)
        rg.add_color_stop_rgba(0, c[0], c[1], c[2], 0.75 * a)
        rg.add_color_stop_rgba(0.35, c[0], c[1], c[2], 0.30 * a)
        rg.add_color_stop_rgba(1, c[0], c[1], c[2], 0)
        ctx.set_source(rg)
        ctx.arc(self.x, self.y, r, 0, 2 * pi)
        ctx.fill()
        if self.core:
            ctx.set_source_rgba(1, 1, 1, min(1, a * 1.2))
            ctx.arc(self.x, self.y, r * 0.16 * (1 - u * 0.5), 0, 2 * pi)
            ctx.fill()
        ctx.restore()


class Burst(FX):
    """Radial hit-spark lines."""

    def __init__(self, t0, x, y, n=14, length=1.0, color=WHITE, dur=0.28, width=0.05, seed=0, r_in=0.05, add=True,
                 angle=None, spread=2 * pi, layer='front'):
        rng = random.Random(seed * 7919 + int(t0 * 1000))
        self.t0, self.t1 = t0, t0 + dur
        self.x, self.y, self.c, self.w0, self.add, self.r_in, self.layer = x, y, color, width, add, r_in, layer
        a0 = 0.0 if angle is None else angle - spread / 2
        self.lines = [(a0 + rng.random() * spread, length * (0.35 + 0.65 * rng.random())) for _ in range(n)]

    def draw(self, ctx, R, i):
        u = _u(self, R.w)
        e = 1 - (1 - u) ** 3
        ctx.save()
        if self.add:
            ctx.set_operator(cairo.OPERATOR_ADD)
        ctx.set_line_cap(1)
        for (a, L) in self.lines:
            r0 = self.r_in + L * 0.55 * e
            r1 = self.r_in + L * e
            ctx.set_source_rgba(self.c[0], self.c[1], self.c[2], (1 - u) ** 1.2)
            ctx.set_line_width(max(0.004, self.w0 * (1 - u)))
            ctx.move_to(self.x + cos(a) * r0, self.y + sin(a) * r0)
            ctx.line_to(self.x + cos(a) * r1, self.y + sin(a) * r1)
            ctx.stroke()
        ctx.restore()


class Ring(FX):
    def __init__(self, t0, x, y, r0, r1, color=WHITE, dur=0.6, width=0.08, flat=False, add=True, layer='front',
                 ease='out', alpha=1.0, squash=0.20):
        self.t0, self.t1 = t0, t0 + dur
        self.x, self.y, self.r0, self.r1, self.c, self.w0 = x, y, r0, r1, color, width
        self.flat, self.add, self.layer, self.ease, self.alpha, self.sq = flat, add, layer, ease, alpha, squash

    def draw(self, ctx, R, i):
        u = _u(self, R.w)
        e = 1 - (1 - u) ** 3 if self.ease == 'out' else u
        r = lerp(self.r0, self.r1, e)
        a = (1 - u) ** 1.4 * self.alpha
        ctx.save()
        if self.add:
            ctx.set_operator(cairo.OPERATOR_ADD)
        ctx.translate(self.x, self.y)
        if self.flat:
            ctx.scale(1, self.sq)
        ww = max(0.004, self.w0 * (1 - u) ** 0.8)
        if self.flat:
            ww = ww / self.sq * 0.35
        ctx.set_source_rgba(self.c[0], self.c[1], self.c[2], a * 0.35)
        ctx.set_line_width(ww * 2.5)
        ctx.arc(0, 0, r, 0, 2 * pi)
        ctx.stroke()
        ctx.set_source_rgba(self.c[0], self.c[1], self.c[2], a)
        ctx.set_line_width(ww)
        ctx.arc(0, 0, r, 0, 2 * pi)
        ctx.stroke()
        ctx.restore()


class Particles(FX):
    """Analytic particle emitter.  shape: spark | dust | drop | ember | rock | ink"""

    def __init__(self, t0, x, y, n=30, speed=(2, 6), angle=None, spread=2 * pi, life=(0.4, 1.0), size=(0.02, 0.05),
                 gravity=9.0, drag=1.2, color=WHITE, shape='spark', seed=0, add=None, layer='front', jitter=0.0,
                 color2=None, vy_bias=0.0, delay_spread=0.0, alpha=1.0):
        rng = random.Random(seed * 104729 + int(t0 * 1000) + n)
        self.t0 = t0
        self.shape = shape
        self.layer = layer
        self.add = (shape in ('spark', 'ember', 'drop')) if add is None else add
        self.g, self.k = gravity, drag
        self.alpha = alpha
        P = []
        tmax = 0
        a0 = 0.0 if angle is None else angle - spread / 2
        for _ in range(n):
            a = a0 + rng.random() * spread
            sp = lerp(speed[0], speed[1], rng.random() ** 0.7)
            lf = lerp(life[0], life[1], rng.random())
            d0 = rng.random() * delay_spread
            col = color if (color2 is None or rng.random() < 0.5) else color2
            P.append((x + (rng.random() - 0.5) * jitter, y + (rng.random() - 0.5) * jitter * 0.5,
                      cos(a) * sp, sin(a) * sp + vy_bias, lf, lerp(size[0], size[1], rng.random()), d0, col,
                      rng.random() * 6.28, (rng.random() - 0.5) * 8))
            tmax = max(tmax, lf + d0)
        self.p = P
        self.t1 = t0 + tmax

    def draw(self, ctx, R, i):
        w = R.w
        ctx.save()
        if self.add:
            ctx.set_operator(cairo.OPERATOR_ADD)
        ctx.set_line_cap(1)
        g, k = self.g, self.k
        shape = self.shape
        for (x0, y0, vx, vy, lf, sz, d0, col, ph, spin) in self.p:
            a = w - self.t0 - d0
            if a < 0 or a > lf:
                continue
            u = a / lf
            f = (1 - exp(-k * a)) / k if k > 1e-6 else a
            x = x0 + vx * f
            y = y0 + vy * f - 0.5 * g * a * a
            al = (1 - u) ** 1.3 * self.alpha
            if shape == 'spark':
                sp = hypot(vx * exp(-k * a), vy * exp(-k * a) - g * a) * 0.028
                dx, dy = vx * exp(-k * a), vy * exp(-k * a) - g * a
                dd = hypot(dx, dy) or 1
                ctx.set_source_rgba(col[0], col[1], col[2], al)
                ctx.set_line_width(sz * (1 - u * 0.7))
                ctx.move_to(x, y)
                ctx.line_to(x - dx / dd * sp, y - dy / dd * sp)
                ctx.stroke()
            elif shape in ('dust', 'ink'):
                r = sz * (1 + 3.0 * u ** 0.6)
                rg = cairo.RadialGradient(x, y, 0, x, y, r)
                rg.add_color_stop_rgba(0, col[0], col[1], col[2], al * 0.55)
                rg.add_color_stop_rgba(1, col[0], col[1], col[2], 0)
                ctx.set_source(rg)
                ctx.arc(x, y, r, 0, 2 * pi)
                ctx.fill()
            elif shape == 'rock':
                ang = ph + spin * a
                r = sz
                ctx.save()
                ctx.translate(x, y)
                ctx.rotate(ang)
                ctx.move_to(r, 0)
                for q in range(1, 6):
                    aa = q * 2 * pi / 5
                    rr = r * (0.65 + 0.35 * abs(sin(ph * 3 + q * 2.1)))
                    ctx.line_to(rr * cos(aa), rr * sin(aa))
                ctx.close_path()
                ctx.set_source_rgba(col[0], col[1], col[2], min(1, (1 - u) ** 0.4) * self.alpha)
                ctx.fill_preserve()
                ctx.set_source_rgba(0.05, 0.05, 0.08, 0.7)
                ctx.set_line_width(0.012)
                ctx.stroke()
                ctx.restore()
            else:  # drop / ember
                r = sz * (1 - u * 0.5)
                ctx.set_source_rgba(col[0], col[1], col[2], al)
                ctx.arc(x, y, r, 0, 2 * pi)
                ctx.fill()
        ctx.restore()


class Leaf(FX):
    """A drifting leaf / petal."""

    def __init__(self, t0, x, y0, vy=0.55, sway=0.35, color=(0.95, 0.8, 0.85), size=0.045, phase=0.0, layer='front'):
        self.t0, self.t1 = t0, t0 + y0 / vy
        self.x, self.y0, self.vy, self.sway, self.c, self.size, self.ph, self.layer = x, y0, vy, sway, color, size, phase, layer

    def draw(self, ctx, R, i):
        a = R.w - self.t0
        x = self.x + self.sway * sin(a * 2.2 + self.ph) + 0.05 * a
        y = self.y0 - self.vy * a + 0.04 * sin(a * 5.0)
        ang = 0.9 * sin(a * 2.2 + self.ph + 1.1) + a * 0.4
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(ang)
        ctx.scale(1, 0.45 + 0.4 * abs(sin(a * 3.0)))
        ctx.set_source_rgba(self.c[0], self.c[1], self.c[2], 0.95)
        ctx.move_to(-self.size, 0)
        ctx.curve_to(-self.size * 0.3, self.size * 0.9, self.size * 0.8, self.size * 0.5, self.size, 0)
        ctx.curve_to(self.size * 0.8, -self.size * 0.5, -self.size * 0.3, -self.size * 0.9, -self.size, 0)
        ctx.fill()
        ctx.restore()


class Bolt(FX):
    def __init__(self, t0, p0, p1, color=(0.85, 0.9, 1.0), dur=0.25, width=0.09, jag=0.35, seed=0, branches=3,
                 pos0=None, pos1=None, layer='front', flick=True):
        self.t0, self.t1 = t0, t0 + dur
        self.p0, self.p1, self.c, self.w0, self.jag, self.seed, self.br = p0, p1, color, width, jag, seed, branches
        self.pos0, self.pos1, self.layer, self.flick = pos0, pos1, layer, flick

    def _path(self, a, b, rng, depth=0, n=None):
        d = hypot(b[0] - a[0], b[1] - a[1])
        n = n or max(4, int(d / 0.45))
        nx, ny = -(b[1] - a[1]) / (d or 1), (b[0] - a[0]) / (d or 1)
        pts = [a]
        for q in range(1, n):
            t = q / n
            o = (rng.random() - 0.5) * 2 * self.jag * min(1.0, d / 4) * (1 - abs(t - 0.5) * 0.4)
            pts.append((lerp(a[0], b[0], t) + nx * o, lerp(a[1], b[1], t) + ny * o))
        pts.append(b)
        return pts

    def draw(self, ctx, R, i):
        u = _u(self, R.w)
        rng = random.Random(self.seed * 999 + (i // 2) * 31)
        p0 = self.pos0(R) if self.pos0 else self.p0
        p1 = self.pos1(R) if self.pos1 else self.p1
        pts = self._path(p0, p1, rng)
        al = (1 - u) ** 0.6
        if self.flick and rng.random() < 0.18:
            al *= 0.35
        paths = [pts]
        for _ in range(self.br):
            j = rng.randint(2, max(2, len(pts) - 3))
            a = pts[j]
            ang = atan2(p1[1] - p0[1], p1[0] - p0[0]) + (rng.random() - 0.5) * 1.6
            L = (0.4 + rng.random() * 1.2)
            b = (a[0] + cos(ang) * L, a[1] + sin(ang) * L)
            paths.append(self._path(a, b, rng, 1, 4))
        ctx.save()
        ctx.set_operator(cairo.OPERATOR_ADD)
        ctx.set_line_cap(1)
        ctx.set_line_join(1)
        c = self.c
        for wid, a_, col in ((self.w0 * 5, 0.10, c), (self.w0 * 2.4, 0.28, c), (self.w0, 0.9, (1, 1, 1))):
            ctx.set_source_rgba(col[0], col[1], col[2], a_ * al)
            ctx.set_line_width(wid)
            for pi_, p in enumerate(paths):
                ctx.move_to(*p[0])
                for q in p[1:]:
                    ctx.line_to(*q)
                if pi_ == 0 or wid > self.w0:
                    pass
            ctx.stroke()
        ctx.restore()


class Beam(FX):
    """Straight energy beam that swells and fades."""

    def __init__(self, t0, p0, p1, color, width=0.5, dur=0.6, add=True, core=(1, 1, 1), grow=0.12, layer='front',
                 pos0=None, pos1=None):
        self.t0, self.t1 = t0, t0 + dur
        self.p0, self.p1, self.c, self.w0, self.add, self.core, self.grow, self.layer = p0, p1, color, width, add, core, grow, layer
        self.pos0, self.pos1 = pos0, pos1

    def draw(self, ctx, R, i):
        u = _u(self, R.w)
        p0 = self.pos0(R) if self.pos0 else self.p0
        p1 = self.pos1(R) if self.pos1 else self.p1
        env = sstep(0, self.grow, u) * (1 - sstep(0.55, 1.0, u))
        L = hypot(p1[0] - p0[0], p1[1] - p0[1])
        # head travels out
        hd = min(1.0, u / max(0.001, self.grow * 1.2))
        q1 = (lerp(p0[0], p1[0], hd), lerp(p0[1], p1[1], hd))
        ctx.save()
        if self.add:
            ctx.set_operator(cairo.OPERATOR_ADD)
        ctx.set_line_cap(1)
        wob = 1 + 0.08 * sin(R.w * 60)
        for wid, a in ((3.2, 0.10), (1.9, 0.22), (1.0, 0.6)):
            ctx.set_source_rgba(self.c[0], self.c[1], self.c[2], a * env)
            ctx.set_line_width(self.w0 * wid * env * wob)
            ctx.move_to(*p0)
            ctx.line_to(*q1)
            ctx.stroke()
        ctx.set_source_rgba(self.core[0], self.core[1], self.core[2], env)
        ctx.set_line_width(self.w0 * 0.42 * env * wob)
        ctx.move_to(*p0)
        ctx.line_to(*q1)
        ctx.stroke()
        ctx.restore()


class Crescent(FX):
    """Flying slash projectile (a lune)."""

    def __init__(self, t0, x, y, vx, vy, size=1.6, color=YANG_C, core=WHITE, dur=1.0, angle=None, add=True,
                 thick=0.32, layer='front', trail=0.5):
        self.t0, self.t1 = t0, t0 + dur
        self.x, self.y, self.vx, self.vy, self.size, self.c, self.core, self.add = x, y, vx, vy, size, color, core, add
        self.ang = atan2(vy, vx) if angle is None else angle
        self.thick, self.layer, self.trail = thick, layer, trail

    def draw(self, ctx, R, i):
        a = R.w - self.t0
        u = _u(self, R.w)
        x, y = self.x + self.vx * a, self.y + self.vy * a
        al = min(1.0, a * 30) * (1 - sstep(0.75, 1.0, u))
        ctx.save()
        if self.add:
            ctx.set_operator(cairo.OPERATOR_ADD)
        ctx.translate(x, y)
        ctx.rotate(self.ang)
        r = self.size
        for tr in range(5):
            f = tr * 0.16 * self.trail
            aa = al * (1 - tr * 0.2) * (0.6 if tr else 1.0)
            sp = hypot(self.vx, self.vy)
            ctx.save()
            ctx.translate(-f * sp * 0.25, 0)
            # lune: outer arc bulging forward, inner arc
            ctx.move_to(0, -r)
            ctx.curve_to(r * 0.55, -r * 0.55, r * 0.55, r * 0.55, 0, r)
            ctx.curve_to(r * (0.55 - self.thick * (1 - tr * 0.1)), r * 0.5, r * (0.55 - self.thick * (1 - tr * 0.1)), -r * 0.5, 0, -r)
            ctx.close_path()
            c = self.c if tr else self.core
            ctx.set_source_rgba(c[0], c[1], c[2], aa)
            ctx.fill()
            ctx.restore()
        # glow
        rg = cairo.RadialGradient(0, 0, 0, 0, 0, r * 1.4)
        rg.add_color_stop_rgba(0, self.c[0], self.c[1], self.c[2], 0.28 * al)
        rg.add_color_stop_rgba(1, self.c[0], self.c[1], self.c[2], 0)
        ctx.set_source(rg)
        ctx.arc(0, 0, r * 1.4, 0, 2 * pi)
        ctx.fill()
        ctx.restore()


class Orb(FX):
    """Charging energy sphere; pos(R) -> (x,y) or fixed."""

    def __init__(self, t0, t1, pos, r0, r1, color, core=WHITE, dark=False, add=None, layer='front', motes=18,
                 collapse=False, seed=0, pulse=8.0):
        self.t0, self.t1 = t0, t1
        self.pos, self.r0, self.r1, self.c, self.core, self.dark = pos, r0, r1, color, core, dark
        self.add = (not dark) if add is None else add
        self.layer, self.motes, self.seed, self.pulse = layer, motes, seed, pulse
        self.collapse = collapse

    def draw(self, ctx, R, i):
        u = _u(self, R.w)
        p = self.pos(R) if callable(self.pos) else self.pos
        r = lerp(self.r0, self.r1, u ** 1.5) * (1 + 0.05 * sin(R.w * self.pulse * 2))
        fade = sstep(0, 0.06, u) * (1 - sstep(0.94, 1.0, u))
        c = self.c
        ctx.save()
        if self.add:
            ctx.set_operator(cairo.OPERATOR_ADD)
        rg = cairo.RadialGradient(p[0], p[1], 0, p[0], p[1], r * 2.6)
        rg.add_color_stop_rgba(0, c[0], c[1], c[2], 0.55 * fade)
        rg.add_color_stop_rgba(0.4, c[0], c[1], c[2], 0.18 * fade)
        rg.add_color_stop_rgba(1, c[0], c[1], c[2], 0)
        ctx.set_source(rg)
        ctx.arc(p[0], p[1], r * 2.6, 0, 2 * pi)
        ctx.fill()
        if self.dark:
            ctx.set_source_rgba(0.02, 0.0, 0.05, 0.96 * fade)
            ctx.arc(p[0], p[1], r, 0, 2 * pi)
            ctx.fill()
            ctx.set_source_rgba(c[0], c[1], c[2], 0.9 * fade)
            ctx.set_line_width(max(0.02, r * 0.07))
            ctx.arc(p[0], p[1], r, 0, 2 * pi)
            ctx.stroke()
        else:
            ctx.set_source_rgba(self.core[0], self.core[1], self.core[2], 0.95 * fade)
            ctx.arc(p[0], p[1], r * 0.75, 0, 2 * pi)
            ctx.fill()
        # orbiting motes (in-falling)
        rng = random.Random(self.seed + 5)
        for q in range(self.motes):
            ph = rng.random()
            sp = 0.6 + rng.random() * 0.8
            a = rng.random() * 6.28 + R.w * (2.0 + rng.random() * 3) * (1 if q % 2 else -1)
            cyc = (R.w * sp + ph) % 1.0
            rr = r * (1.2 + 2.6 * (1 - cyc if not self.collapse else 1 - cyc))
            ctx.set_source_rgba(c[0], c[1], c[2], fade * (0.8 * cyc))
            ctx.arc(p[0] + cos(a) * rr, p[1] + sin(a) * rr * 0.9, 0.018 + 0.02 * cyc, 0, 2 * pi)
            ctx.fill()
        ctx.restore()


class Column(FX):
    """Rising water/energy column (geyser)."""

    def __init__(self, t0, x, width, height, dur=1.6, color=(0.75, 0.88, 1.0), edge=(1, 1, 1), y0=0.0, layer='front',
                 rise=0.18, seed=0):
        self.t0, self.t1 = t0, t0 + dur
        self.x, self.wd, self.h, self.c, self.edge, self.y0, self.layer, self.rise = x, width, height, color, edge, y0, layer, rise
        self.seed = seed

    def draw(self, ctx, R, i):
        u = _u(self, R.w)
        up = sstep(0, self.rise, u)
        h = self.h * (1 - (1 - up) ** 3) * (1 - 0.25 * sstep(0.5, 1, u))
        wd = self.wd * (0.4 + 0.6 * up) * (1 - 0.55 * sstep(0.35, 1.0, u))
        al = (1 - sstep(0.55, 1.0, u))
        top = self.y0 + h
        ctx.save()
        g = cairo.LinearGradient(0, self.y0, 0, top)
        g.add_color_stop_rgba(0, self.c[0], self.c[1], self.c[2], 0.60 * al)
        g.add_color_stop_rgba(1, self.c[0], self.c[1], self.c[2], 0.06 * al)
        ctx.move_to(self.x - wd * 0.5, self.y0)
        n = 14
        for q in range(n + 1):
            yy = lerp(self.y0, top, q / n)
            ww = wd * (0.5 + 0.10 * sin(q * 1.1 + R.w * 9 + self.seed)) * (1 - 0.75 * (q / n) ** 1.6)
            ctx.line_to(self.x - ww, yy)
        for q in range(n, -1, -1):
            yy = lerp(self.y0, top, q / n)
            ww = wd * (0.5 + 0.10 * sin(q * 1.3 + R.w * 8 + 1.7 + self.seed)) * (1 - 0.75 * (q / n) ** 1.6)
            ctx.line_to(self.x + ww, yy)
        ctx.close_path()
        ctx.set_source(g)
        ctx.fill_preserve()
        ctx.set_source_rgba(self.edge[0], self.edge[1], self.edge[2], 0.55 * al)
        ctx.set_line_width(0.02)
        ctx.stroke()
        # base foam
        rg = cairo.RadialGradient(self.x, self.y0, 0, self.x, self.y0, wd * 1.6)
        rg.add_color_stop_rgba(0, 1, 1, 1, 0.5 * al)
        rg.add_color_stop_rgba(1, 1, 1, 1, 0)
        ctx.save()
        ctx.translate(self.x, self.y0)
        ctx.scale(1, 0.3)
        ctx.translate(-self.x, -self.y0)
        ctx.set_source(rg)
        ctx.arc(self.x, self.y0, wd * 1.6, 0, 2 * pi)
        ctx.fill()
        ctx.restore()
        ctx.restore()


class Crack(FX):
    """Glowing fissures radiating from a point (ground plane if flat, else screen-space/world)."""

    def __init__(self, t0, x, y, dur=4.0, n=9, length=4.0, color=(1, 0.9, 0.6), flat=True, seed=0, layer='back',
                 grow=0.25, width=0.05, sq=0.22, add=True):
        rng = random.Random(seed * 13 + int(t0 * 100))
        self.t0, self.t1 = t0, t0 + dur
        self.x, self.y, self.c, self.flat, self.layer, self.grow, self.w0, self.sq, self.add = x, y, color, flat, layer, grow, width, sq, add
        self.segs = []
        for k in range(n):
            a = k * 2 * pi / n + rng.random() * 0.5
            L = length * (0.5 + 0.7 * rng.random())
            pts = [(0.0, 0.0)]
            cx, cy, ca = 0.0, 0.0, a
            steps = int(L / 0.35) + 2
            for s in range(steps):
                ca += (rng.random() - 0.5) * 0.9
                cx += cos(ca) * 0.35
                cy += sin(ca) * 0.35
                pts.append((cx, cy))
                if rng.random() < 0.18:
                    b = [(cx, cy)]
                    bx, by, ba = cx, cy, ca + (rng.random() - 0.5) * 2.0
                    for _ in range(3):
                        ba += (rng.random() - 0.5) * 0.8
                        bx += cos(ba) * 0.3
                        by += sin(ba) * 0.3
                        b.append((bx, by))
                    self.segs.append(b)
            self.segs.append(pts)

    def draw(self, ctx, R, i):
        u = _u(self, R.w)
        gr = sstep(0, self.grow, u)
        al = 1 - sstep(0.6, 1.0, u)
        ctx.save()
        if self.add:
            ctx.set_operator(cairo.OPERATOR_ADD)
        ctx.translate(self.x, self.y)
        if self.flat:
            ctx.scale(1, self.sq)
        ctx.set_line_cap(1)
        ctx.set_line_join(1)
        flick = 0.85 + 0.15 * sin(R.w * 31)
        for wid, a in ((self.w0 * 6, 0.10), (self.w0 * 2.5, 0.3), (self.w0, 0.95)):
            ctx.set_source_rgba(self.c[0], self.c[1], self.c[2], a * al * flick)
            ctx.set_line_width(wid * (1 if not self.flat else 1 / self.sq * 0.5))
            for seg in self.segs:
                n = max(2, int(len(seg) * gr) + 1)
                if gr <= 0.01:
                    continue
                ctx.move_to(*seg[0])
                for q in seg[1:n]:
                    ctx.line_to(*q)
            ctx.stroke()
        ctx.restore()


class Taiji(FX):
    def __init__(self, t0, t1, pos, r, alpha=1.0, spin=0.6, layer='front', glow=True, fade=(0.6, 0.6), screen=False,
                 dark=hexc('#07070d'), light=hexc('#f6f2e6'), gleam=0.4, phase=0.0, r_fn=None):
        self.t0, self.t1 = t0, t1
        self.pos, self.r, self.alpha, self.spin, self.layer = pos, r, alpha, spin, layer
        self.glow, self.fade, self.dark, self.light, self.gleam, self.phase, self.r_fn = glow, fade, dark, light, gleam, phase, r_fn

    def draw(self, ctx, R, i):
        w = R.w
        u = (w - self.t0) / (self.t1 - self.t0)
        fi = sstep(0, self.fade[0] / (self.t1 - self.t0), u) if self.fade[0] > 0 else 1
        fo = 1 - sstep(1 - self.fade[1] / (self.t1 - self.t0), 1, u) if self.fade[1] > 0 else 1
        al = self.alpha * fi * fo
        p = self.pos(R) if callable(self.pos) else self.pos
        r = self.r_fn(w) if self.r_fn else self.r
        ang = self.phase + self.spin * (w - self.t0)
        draw_taiji(ctx, p[0], p[1], r, ang, al, self.dark, self.light, self.glow, self.gleam)


def draw_taiji(ctx, x, y, r, ang, al, dark, light, glow=True, gleam=0.4):
    ctx.save()
    ctx.translate(x, y)
    if glow:
        for rr, a, col in ((r * 2.0, 0.10, light), (r * 1.4, 0.16, light)):
            rg = cairo.RadialGradient(0, 0, r * 0.6, 0, 0, rr)
            rg.add_color_stop_rgba(0, col[0], col[1], col[2], a * al)
            rg.add_color_stop_rgba(1, col[0], col[1], col[2], 0)
            ctx.set_source(rg)
            ctx.arc(0, 0, rr, 0, 2 * pi)
            ctx.fill()
    ctx.rotate(ang)
    # light half (right side) = right half disc + upper lobe - lower lobe
    ctx.set_source_rgba(light[0], light[1], light[2], al)
    ctx.arc(0, 0, r, -pi / 2, pi / 2)
    ctx.arc(0, r / 2, r / 2, pi / 2, 3 * pi / 2)
    ctx.arc_negative(0, -r / 2, r / 2, pi / 2, -pi / 2)
    ctx.close_path()
    ctx.fill()
    # dark half (left side)
    ctx.set_source_rgba(dark[0], dark[1], dark[2], al)
    ctx.arc(0, 0, r, pi / 2, 3 * pi / 2)
    ctx.arc(0, -r / 2, r / 2, 3 * pi / 2, 5 * pi / 2)
    ctx.arc_negative(0, r / 2, r / 2, 3 * pi / 2, pi / 2)
    ctx.close_path()
    ctx.fill()
    # dots
    ctx.set_source_rgba(dark[0], dark[1], dark[2], al)
    ctx.arc(0, r / 2, r * 0.11, 0, 2 * pi)
    ctx.fill()
    ctx.set_source_rgba(light[0], light[1], light[2], al)
    ctx.arc(0, -r / 2, r * 0.11, 0, 2 * pi)
    ctx.fill()
    ctx.set_source_rgba(0.5, 0.5, 0.5, al * gleam)
    ctx.set_line_width(max(0.008, r * 0.012))
    ctx.arc(0, 0, r, 0, 2 * pi)
    ctx.stroke()
    ctx.restore()


class Wisps(FX):
    """Aura wisps around a fighter (uses current pose)."""

    def __init__(self, t0, t1, who, color, n=26, up=1.1, add=True, size=0.05, intensity=1.0, dark=False, layer='front',
                 seed=0, spread=0.35):
        self.t0, self.t1 = t0, t1
        self.who, self.c, self.n, self.up, self.add, self.size, self.k, self.dark, self.layer = who, color, n, up, add, size, intensity, dark, layer
        rng = random.Random(seed + 11)
        self.p = [(rng.random(), rng.random(), rng.random(), rng.random(), rng.random()) for _ in range(n)]
        self.spread = spread

    def draw(self, ctx, R, i):
        P = R.frames[i][self.who]
        u = (R.w - self.t0) / (self.t1 - self.t0)
        env = sstep(0, 0.08, u) * (1 - sstep(0.9, 1.0, u)) * self.k
        if env <= 0.01:
            return
        segs = [(P['hip'], P['neck']), (P['arms'][0][1], P['arms'][0][2]), (P['arms'][1][1], P['arms'][1][2]),
                (P['legs'][0][1], P['legs'][0][2]), (P['legs'][1][1], P['legs'][1][2]), (P['neck'], P['head'])]
        ctx.save()
        if self.add:
            ctx.set_operator(cairo.OPERATOR_ADD)
        ctx.set_line_cap(1)
        for (a, b, c, d, e) in self.p:
            cyc = (R.w * (0.55 + 0.5 * d) + a) % 1.0
            s = segs[int(b * len(segs)) % len(segs)]
            x = lerp(s[0][0], s[1][0], c) + (e - 0.5) * self.spread + sin(R.w * 3 + a * 20) * 0.06 * cyc
            y = lerp(s[0][1], s[1][1], c) + cyc * self.up * (0.5 + d)
            al = sin(cyc * pi) * 0.75 * env
            L = 0.10 + 0.32 * d
            ctx.set_source_rgba(self.c[0], self.c[1], self.c[2], al)
            ctx.set_line_width(self.size * (1 - cyc * 0.7))
            ctx.move_to(x, y - L * 0.4)
            ctx.line_to(x + sin(R.w * 4 + a * 9) * 0.03, y + L * 0.6)
            ctx.stroke()
        ctx.restore()


class AfterImage(FX):
    """Dash after-images from stored poses."""

    def __init__(self, t0, t1, who, style, tint, delays=(3, 6, 9, 12, 15), alpha=0.45):
        self.t0, self.t1 = t0, t1
        self.who, self.style, self.tint, self.delays, self.alpha = who, style, tint, delays, alpha
        self.layer = 'back'

    def draw(self, ctx, R, i):
        u = (R.w - self.t0) / (self.t1 - self.t0)
        env = sstep(0, 0.1, u) * (1 - sstep(0.7, 1.0, u))
        for n, d in enumerate(self.delays):
            j = i - d
            if j < 0:
                continue
            P = R.frames[j][self.who]
            draw_fighter(ctx, P, self.style, R.w, alpha=self.alpha * env * (1 - n / (len(self.delays) + 1.0)),
                         tint=self.tint, aura_mul=0.0, glow=False)


class Vanish(FX):
    """Speed-lines strokes drawn across the world at a dash."""

    def __init__(self, t0, x0, x1, y, color, n=10, dur=0.35, seed=0, add=True):
        rng = random.Random(seed + int(t0 * 100))
        self.t0, self.t1 = t0, t0 + dur
        self.c, self.add = color, add
        self.lines = [(lerp(x0, x1, rng.random() * 0.4), lerp(x0, x1, 0.6 + rng.random() * 0.4), y + (rng.random() - 0.3) * 1.6,
                       0.01 + rng.random() * 0.03) for _ in range(n)]
        self.layer = 'front'

    def draw(self, ctx, R, i):
        u = _u(self, R.w)
        e = 1 - (1 - u) ** 2
        ctx.save()
        if self.add:
            ctx.set_operator(cairo.OPERATOR_ADD)
        ctx.set_line_cap(1)
        for (xa, xb, y, wd) in self.lines:
            a = (1 - u) ** 1.5
            ctx.set_source_rgba(self.c[0], self.c[1], self.c[2], a * 0.8)
            ctx.set_line_width(wd)
            ctx.move_to(lerp(xa, xb, e * 0.6), y)
            ctx.line_to(lerp(xa, xb, 0.2 + e * 0.8), y)
            ctx.stroke()
        ctx.restore()


# ----------------------------------------------------------------------------
# screen-space effects
# ----------------------------------------------------------------------------
class ScreenFlash(FX):
    layer = 'screen'

    def __init__(self, t0, dur, color=WHITE, peak=0.9, attack=0.02, add=False):
        self.t0, self.t1 = t0, t0 + dur
        self.c, self.peak, self.att, self.add = color, peak, attack, add

    def draw(self, ctx, R, i):
        a = R.tv - R.tv0(self.t0)
        d = R.tv1(self.t1) - R.tv0(self.t0)
        if d <= 0:
            return
        u = clamp(a / d, 0, 1)
        at = clamp(self.att / d, 0.001, 0.9)
        al = (u / at if u < at else (1 - (u - at) / (1 - at)) ** 2) * self.peak
        ctx.save()
        if self.add:
            ctx.set_operator(cairo.OPERATOR_ADD)
        ctx.set_source_rgba(self.c[0], self.c[1], self.c[2], clamp(al, 0, 1))
        ctx.paint()
        ctx.restore()


class SpeedLines(FX):
    layer = 'screen'

    def __init__(self, t0, dur, color=(1, 1, 1), n=70, seed=0, focus=None, inner=0.30, alpha=0.5, add=False):
        rng = random.Random(seed + 5)
        self.t0, self.t1 = t0, t0 + dur
        self.c, self.focus, self.inner, self.alpha, self.add = color, focus, inner, alpha, add
        self.l = [(rng.random() * 2 * pi, rng.random(), rng.random()) for _ in range(n)]
        self.seed = seed

    def draw(self, ctx, R, i):
        u = _u(self, R.w)
        fx, fy = self.focus if self.focus else (960, 540)
        ctx.save()
        if self.add:
            ctx.set_operator(cairo.OPERATOR_ADD)
        rng = random.Random(self.seed * 77 + i // 2)
        for (a, b, c) in self.l:
            a2 = a + (rng.random() - 0.5) * 0.02
            r0 = 1920 * (self.inner + 0.25 * c) * (1 + 0.1 * rng.random())
            r1 = r0 + 900 * (0.4 + b)
            ctx.set_source_rgba(self.c[0], self.c[1], self.c[2], self.alpha * (1 - u) * (0.4 + 0.6 * b))
            ctx.set_line_width(1.5 + 5 * c)
            ctx.move_to(fx + cos(a2) * r0, fy + sin(a2) * r0 * 0.75)
            ctx.line_to(fx + cos(a2) * r1, fy + sin(a2) * r1 * 0.75)
            ctx.stroke()
        ctx.restore()


class Title(FX):
    layer = 'screen'

    def __init__(self, t0, t1, text, size=110, y=0.5, color=(1, 1, 1), font='serif', spacing=0.35, fade=(0.8, 0.8),
                 weight='normal', sub=None, subsize=34, alpha=1.0, glow=True, x=0.5, video_time=False):
        self.t0, self.t1 = t0, t1
        self.text, self.size, self.y, self.c, self.font, self.sp = text, size, y, color, font, spacing
        self.fade, self.weight, self.sub, self.subsize, self.alpha, self.glow, self.x = fade, weight, sub, subsize, alpha, glow, x

    def draw(self, ctx, R, i):
        tv = R.tv
        a0, a1 = R.tv0(self.t0), R.tv1(self.t1)
        al = clamp((tv - a0) / self.fade[0], 0, 1) * clamp((a1 - tv) / self.fade[1], 0, 1) * self.alpha
        if al <= 0.001:
            return
        ctx.save()
        ctx.identity_matrix()
        ctx.select_font_face(self.font, cairo.FONT_SLANT_NORMAL,
                             cairo.FONT_WEIGHT_BOLD if self.weight == 'bold' else cairo.FONT_WEIGHT_NORMAL)
        ctx.set_font_size(self.size)
        # manual letter spacing
        widths = []
        for ch in self.text:
            widths.append(ctx.text_extents(ch).x_advance + self.size * self.sp)
        total = sum(widths) - self.size * self.sp
        x = W_ * self.x - total / 2
        y = H_ * self.y
        drift = (tv - a0) * 4
        if self.glow:
            for (bw, ba) in ((14, 0.05), (7, 0.10)):
                ctx.set_source_rgba(self.c[0], self.c[1], self.c[2], al * ba)
                xx = x
                for ch, wd in zip(self.text, widths):
                    ctx.move_to(xx + drift, y)
                    ctx.text_path(ch)
                    ctx.set_line_width(bw)
                    ctx.stroke()
                    xx += wd
        ctx.set_source_rgba(self.c[0], self.c[1], self.c[2], al)
        xx = x
        for ch, wd in zip(self.text, widths):
            ctx.move_to(xx + drift, y)
            ctx.show_text(ch)
            xx += wd
        if self.sub:
            ctx.set_font_size(self.subsize)
            wsub = [ctx.text_extents(ch).x_advance + self.subsize * 0.5 for ch in self.sub]
            tot = sum(wsub) - self.subsize * 0.5
            xx = W_ * self.x - tot / 2
            ctx.set_source_rgba(self.c[0], self.c[1], self.c[2], al * 0.75)
            for ch, wd in zip(self.sub, wsub):
                ctx.move_to(xx + drift * 0.5, y + self.size * 0.62)
                ctx.show_text(ch)
                xx += wd
        ctx.restore()


W_, H_ = 1920, 1080


class Wave(FX):
    """Giant curling wave (world space). Rises from the water, curls over, then collapses."""

    def __init__(self, t0, x0, direction, height=9.0, length=7.0, dur=4.5, speed=3.0, color=(0.03, 0.05, 0.14),
                 foam=(0.75, 0.85, 1.0), layer='front', alpha=0.95):
        self.t0, self.t1 = t0, t0 + dur
        self.x0, self.d, self.hh, self.L, self.speed, self.c, self.foam, self.layer, self.alpha = x0, direction, height, length, speed, color, foam, layer, alpha

    def draw(self, ctx, R, i):
        u = _u(self, R.w)
        rise = sstep(0.0, 0.35, u)
        fall = sstep(0.62, 1.0, u)
        h = self.hh * rise * (1 - 0.92 * fall)
        d = self.d
        xc = self.x0 + d * self.speed * (R.w - self.t0)
        L = self.L * (0.6 + 0.6 * u)
        al = self.alpha * (1 - sstep(0.85, 1.0, u))
        if h < 0.05:
            return
        ctx.save()
        ctx.translate(xc, 0)
        ctx.scale(d, 1)
        # body of the wave (back is toward -x, curl forward toward +x)
        ctx.move_to(-L * 1.6, 0)
        ctx.curve_to(-L * 1.2, h * 0.55, -L * 0.6, h * 1.02, 0, h)
        ctx.curve_to(L * 0.35, h * 0.99, L * 0.85, h * 0.85, L * 0.95, h * 0.5)
        ctx.curve_to(L * 0.6, h * 0.74, L * 0.15, h * 0.55, L * 0.1, h * 0.05)
        ctx.line_to(L * 0.1, 0)
        ctx.close_path()
        g = cairo.LinearGradient(0, 0, 0, h)
        g.add_color_stop_rgba(0, self.c[0] * 2, self.c[1] * 2.5, self.c[2] * 2, al)
        g.add_color_stop_rgba(1, self.c[0], self.c[1], self.c[2], al)
        ctx.set_source(g)
        ctx.fill_preserve()
        ctx.set_source_rgba(self.foam[0], self.foam[1], self.foam[2], 0.75 * al)
        ctx.set_line_width(0.07)
        ctx.stroke()
        # foam streaks
        ctx.set_line_width(0.04)
        for q in range(9):
            a = q / 9.0
            ctx.set_source_rgba(self.foam[0], self.foam[1], self.foam[2], 0.28 * al)
            ctx.move_to(-L * (1.3 - a), h * (0.1 + 0.8 * a) * 0.9)
            ctx.curve_to(-L * (0.8 - a * 0.5), h * (0.3 + 0.7 * a), -L * 0.2, h * (0.4 + 0.5 * a), L * (0.1 + 0.6 * a), h * (0.55 + 0.35 * a))
            ctx.stroke()
        ctx.restore()


class Sprout(FX):
    """A glowing lotus/sprout growing from the water."""

    def __init__(self, t0, x, dur=8.0, size=1.0, layer='front'):
        self.t0, self.t1 = t0, t0 + dur
        self.x, self.size, self.layer = x, size, layer

    def draw(self, ctx, R, i):
        u = _u(self, R.w)
        g = sstep(0.0, 0.55, u) * self.size
        al = sstep(0, 0.1, u) * (1 - sstep(0.96, 1.0, u))
        x = self.x
        ctx.save()
        ctx.translate(x, 0)
        rg = cairo.RadialGradient(0, 0.3 * g, 0, 0, 0.3 * g, 1.6 * g + 0.01)
        rg.add_color_stop_rgba(0, 1, 0.95, 0.75, 0.35 * al)
        rg.add_color_stop_rgba(1, 1, 0.95, 0.75, 0)
        ctx.set_source(rg)
        ctx.arc(0, 0.3 * g, 1.6 * g + 0.01, 0, 2 * pi)
        ctx.fill()
        ctx.set_line_cap(1)
        ctx.set_source_rgba(0.55, 0.85, 0.5, al)
        ctx.set_line_width(0.05)
        ctx.move_to(0, 0)
        ctx.curve_to(0.03, 0.25 * g, -0.05, 0.4 * g, 0, 0.55 * g)
        ctx.stroke()
        for s in (-1, 1):
            ctx.move_to(0, 0.5 * g)
            ctx.curve_to(s * 0.25 * g, 0.62 * g, s * 0.38 * g, 0.5 * g, s * 0.34 * g, 0.34 * g)
            ctx.curve_to(s * 0.2 * g, 0.38 * g, s * 0.05 * g, 0.42 * g, 0, 0.5 * g)
            ctx.set_source_rgba(0.6, 0.9, 0.55, al)
            ctx.fill()
        bloom = sstep(0.4, 0.85, u)
        if bloom > 0.01:
            for k in range(-2, 3):
                a = k * 0.32
                ctx.save()
                ctx.translate(0, 0.55 * g)
                ctx.rotate(-a)
                ctx.scale(0.09 * g * bloom + 0.001, 0.30 * g * bloom + 0.001)
                ctx.arc(0, 0.5, 1, 0, 2 * pi)
                ctx.restore()
                ctx.set_source_rgba(1.0, 0.85 + 0.05 * k, 0.9, al)
                ctx.fill()
        ctx.restore()
