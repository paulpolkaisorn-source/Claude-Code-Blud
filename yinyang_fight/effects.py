"""Timed visual effects. Everything is analytic in (story) time so frames render independently."""
import math

import numpy as np

from .rig import JOINT

TAU = 2 * math.pi
WHITE = (1.0, 1.0, 1.0)


def resolve(spec, sim, t):
    if spec is None:
        return None
    if callable(spec):
        return np.asarray(spec(sim, t), dtype=float)
    if isinstance(spec, tuple) and spec and isinstance(spec[0], str):
        aid, jn = spec[0], spec[1]
        dx = spec[2] if len(spec) > 2 else 0.0
        dy = spec[3] if len(spec) > 3 else 0.0
        a = sim.actors[aid]
        f = sim.frame_of(t)
        return a.J[f, JOINT[jn]] + np.array([dx * a.face[f], dy])
    return np.asarray(spec, dtype=float)


def lerp(a, b, u):
    return a + (b - a) * u


def lerpc(c1, c2, u):
    return tuple(c1[i] + (c2[i] - c1[i]) * u for i in range(3))


def clamp01(x):
    return 0.0 if x < 0 else (1.0 if x > 1 else x)


def smooth(u):
    u = clamp01(u)
    return u * u * (3 - 2 * u)


def glow_dot(g, x, y, r, col, a):
    import cairocffi as cairo
    if a <= 0.003 or r <= 0.5:
        return
    pat = cairo.RadialGradient(x, y, 0, x, y, r)
    pat.add_color_stop_rgba(0, col[0], col[1], col[2], a)
    pat.add_color_stop_rgba(0.35, col[0], col[1], col[2], a * 0.45)
    pat.add_color_stop_rgba(1, col[0], col[1], col[2], 0)
    g.set_source(pat)
    g.arc(x, y, r, 0, TAU)
    g.fill()


def stroke_line(c, pts, w, col, a, cap=1):
    if a <= 0.003:
        return
    c.set_line_cap(cap)
    c.set_line_join(1)
    c.move_to(*pts[0])
    for p in pts[1:]:
        c.line_to(*p)
    c.set_source_rgba(col[0], col[1], col[2], a)
    c.set_line_width(w)
    c.stroke()


class Effect:
    layer = 'front'

    def __init__(self, t0, t1):
        self.t0, self.t1 = t0, t1

    def prepare(self, sim):
        pass

    def active(self, t):
        return self.t0 <= t <= self.t1

    def draw(self, R, t):
        pass


# ---------------------------------------------------------------------------
class Sparks(Effect):
    def __init__(self, t, at, col, n=26, speed=950, spread=360, ang=0.0, life=0.45, grav=-700,
                 width=3.2, seed=0, drag=4.0, hot=WHITE):
        super().__init__(t, t + life * 1.3)
        self.at, self.col, self.hot = at, col, hot
        rng = np.random.default_rng(seed + int(t * 1000) % 100000)
        a = math.radians(ang) + np.radians(rng.uniform(-spread / 2, spread / 2, n))
        s = speed * rng.uniform(0.35, 1.0, n)
        self.v = np.stack([np.cos(a) * s, np.sin(a) * s], 1)
        self.life = life * rng.uniform(0.5, 1.3, n)
        self.w = width * rng.uniform(0.6, 1.3, n)
        self.grav, self.k = grav, drag

    def prepare(self, sim):
        self.p0 = resolve(self.at, sim, self.t0)

    def draw(self, R, t):
        tau = t - self.t0
        k = self.k
        e = math.exp(-k * tau)
        disp = self.v * ((1 - e) / k)
        disp[:, 1] += 0.5 * self.grav * tau * tau
        vel = self.v * e
        vel[:, 1] += self.grav * tau
        P = self.p0 + disp
        for i in range(len(P)):
            u = tau / self.life[i]
            if u >= 1:
                continue
            fade = (1 - u) ** 1.5
            tail = P[i] - vel[i] * 0.028
            col = lerpc(self.hot, self.col, min(1.0, u * 2.2))
            stroke_line(R.ctx, [tail, P[i]], self.w[i] * (1 - 0.5 * u), col, fade)
            stroke_line(R.g, [tail, P[i]], self.w[i] * 3.0, self.col, fade * 0.8)


class Flash(Effect):
    def __init__(self, t, at, col, size=140, life=0.28, rays=7, seed=1, core=WHITE):
        super().__init__(t, t + life)
        self.at, self.col, self.size, self.life, self.core = at, col, size, life, core
        rng = np.random.default_rng(seed + int(t * 997))
        self.ra = rng.uniform(0, TAU, rays)
        self.rl = rng.uniform(0.6, 1.4, rays)

    def prepare(self, sim):
        self.p = resolve(self.at, sim, self.t0)

    def draw(self, R, t):
        u = (t - self.t0) / self.life
        if u > 1:
            return
        a = (1 - u) ** 2
        x, y = self.p
        s = self.size * (0.6 + 0.8 * math.sqrt(u))
        glow_dot(R.g, x, y, s * 1.6, self.col, a)
        glow_dot(R.ctx, x, y, s * 0.55, self.core, a)
        c = R.ctx
        for ang, l in zip(self.ra, self.rl):
            L = s * l * 1.4
            dx, dy = math.cos(ang), math.sin(ang)
            px, py = -dy, dx
            wdt = s * 0.05 * (1 - u)
            c.move_to(x + px * wdt, y + py * wdt)
            c.line_to(x + dx * L, y + dy * L)
            c.line_to(x - px * wdt, y - py * wdt)
            c.close_path()
            c.set_source_rgba(self.core[0], self.core[1], self.core[2], a * 0.9)
            c.fill()


class Ring(Effect):
    def __init__(self, t, at, col, r0=10, r1=320, life=0.55, width=12, squash=1.0, alpha=0.9,
                 fill=0.0):
        super().__init__(t, t + life)
        self.at, self.col, self.r0, self.r1, self.life = at, col, r0, r1, life
        self.width, self.squash, self.alpha, self.fill = width, squash, alpha, fill

    def prepare(self, sim):
        self.p = resolve(self.at, sim, self.t0)

    def draw(self, R, t):
        u = (t - self.t0) / self.life
        if u > 1:
            return
        e = 1 - (1 - u) ** 3
        r = lerp(self.r0, self.r1, e)
        a = self.alpha * (1 - u) ** 1.4
        for c, wm, am in ((R.ctx, 1.0, 1.0), (R.g, 2.6, 0.7)):
            c.save()
            c.translate(*self.p)
            c.scale(1, self.squash)
            c.arc(0, 0, r, 0, TAU)
            c.restore()
            if self.fill > 0 and c is R.g:
                c.set_source_rgba(self.col[0], self.col[1], self.col[2], a * self.fill)
                c.fill_preserve()
            c.set_source_rgba(self.col[0], self.col[1], self.col[2], a * am)
            c.set_line_width(max(0.5, self.width * (1 - u * 0.7) * wm))
            c.stroke()


class Dust(Effect):
    layer = 'front'

    def __init__(self, t, at, n=14, spread=140, col=(0.62, 0.56, 0.62), life=1.3, rise=50, size=34,
                 dirx=0.0, speed=260, seed=3, alpha=0.5, back=False):
        super().__init__(t, t + life)
        if back:
            self.layer = 'back'
        self.at, self.col, self.life, self.alpha = at, col, life, alpha
        rng = np.random.default_rng(seed + int(t * 733))
        self.off = np.stack([rng.uniform(-spread, spread, n) * 0.25, rng.uniform(0, 12, n)], 1)
        ang = rng.uniform(0, math.pi, n)
        spd = speed * rng.uniform(0.3, 1.0, n)
        self.v = np.stack([np.cos(ang) * spd + dirx, np.sin(ang) * spd * 0.35 + rise], 1)
        self.sz = size * rng.uniform(0.6, 1.4, n)
        self.lf = life * rng.uniform(0.6, 1.0, n)

    def prepare(self, sim):
        self.p = resolve(self.at, sim, self.t0)

    def draw(self, R, t):
        tau = t - self.t0
        e = (1 - math.exp(-3.0 * tau)) / 3.0
        c = R.ctx
        for i in range(len(self.v)):
            u = tau / self.lf[i]
            if u >= 1:
                continue
            x = self.p[0] + self.off[i, 0] + self.v[i, 0] * e
            y = self.p[1] + self.off[i, 1] + self.v[i, 1] * e
            r = self.sz[i] * (0.5 + 1.1 * math.sqrt(u))
            a = self.alpha * (1 - u) ** 1.6 * min(1.0, u * 8)
            glow_dot(c, x, y, r, self.col, a)


class Debris(Effect):
    def __init__(self, t, at, n=12, speed=560, size=10, col=(0.2, 0.17, 0.24), life=1.8, grav=-1500,
                 ground=True, spread=160, ang=90, seed=5, hot=None):
        super().__init__(t, t + life)
        self.at, self.col, self.life, self.grav, self.ground, self.hot = at, col, life, grav, ground, hot
        rng = np.random.default_rng(seed + int(t * 331))
        a = np.radians(ang + rng.uniform(-spread / 2, spread / 2, n))
        s = speed * rng.uniform(0.35, 1.0, n)
        self.v = np.stack([np.cos(a) * s, np.sin(a) * s], 1)
        self.sz = size * rng.uniform(0.5, 1.5, n)
        self.spin = rng.uniform(-12, 12, n)
        self.shape = rng.uniform(0.6, 1.0, (n, 5))

    def prepare(self, sim):
        self.p = resolve(self.at, sim, self.t0)

    def draw(self, R, t):
        tau = t - self.t0
        u = tau / self.life
        a = 1.0 if u < 0.7 else (1 - u) / 0.3
        c = R.ctx
        for i in range(len(self.v)):
            x = self.p[0] + self.v[i, 0] * tau
            y = self.p[1] + self.v[i, 1] * tau + 0.5 * self.grav * tau * tau
            rot = self.spin[i] * tau
            if self.ground and y < 0 and self.p[1] >= -1:
                # crude landing: slide to stop on the ground
                y = 0 + self.sz[i] * 0.3
                rot = self.spin[i] * 0.3
            c.save()
            c.translate(x, y)
            c.rotate(rot)
            s = self.sz[i]
            for k in range(5):
                ang = k / 5 * TAU
                r = s * self.shape[i, k]
                if k == 0:
                    c.move_to(math.cos(ang) * r, math.sin(ang) * r)
                else:
                    c.line_to(math.cos(ang) * r, math.sin(ang) * r)
            c.close_path()
            c.set_source_rgba(self.col[0], self.col[1], self.col[2], a)
            c.fill()
            c.restore()
            if self.hot is not None and u < 0.5:
                glow_dot(R.g, x, y, s * 2.5, self.hot, (0.5 - u) * 1.2)


class Cracks(Effect):
    """Glowing fissures running down into the ground face from an impact point."""
    layer = 'back'

    def __init__(self, t, at, col, n=6, length=170, life=5.0, seed=7, width=4, grow=0.18):
        life = min(life, 3.2)
        super().__init__(t, t + life)
        self.at, self.col, self.life, self.width, self.grow = at, col, life, width, grow
        rng = np.random.default_rng(seed + int(t * 101))
        self.paths = []
        for i in range(n):
            ang = math.radians(-90 + rng.uniform(-75, 75))
            pts = [np.zeros(2)]
            L = length * rng.uniform(0.5, 1.2)
            segs = 7
            for k in range(segs):
                ang += math.radians(rng.uniform(-35, 35))
                ang = min(math.radians(-8), max(math.radians(-172), ang))
                pts.append(pts[-1] + np.array([math.cos(ang), math.sin(ang)]) * L / segs)
            self.paths.append(np.array(pts))

    def prepare(self, sim):
        self.p = resolve(self.at, sim, self.t0).copy()
        self.p[1] = min(self.p[1], 0.0)

    def draw(self, R, t):
        tau = t - self.t0
        g = smooth(tau / self.grow)
        fade = 1.0 if tau < self.life - 1.5 else max(0.0, (self.life - tau) / 1.5)
        heat = math.exp(-tau * 2.0)
        for pts in self.paths:
            n = max(2, int(round(g * (len(pts) - 1))) + 1)
            P = self.p + pts[:n]
            stroke_line(R.ctx, P, self.width * 0.8, (0.03, 0.02, 0.04), 0.65 * fade)
            stroke_line(R.ctx, P, self.width * 0.4, self.col, (0.15 + 0.75 * heat) * fade)
            stroke_line(R.g, P, self.width * 1.8, self.col, 0.85 * heat * fade)


class Orb(Effect):
    """Energy projectile travelling from src to dst between t0 and t1."""

    def __init__(self, t0, t1, src, dst, col, core, r=22, ease=0.0, wobble=0.0, dark=False):
        super().__init__(t0, t1)
        self.src, self.dst, self.col, self.core, self.r = src, dst, col, core, r
        self.ease, self.wobble, self.dark = ease, wobble, dark

    def prepare(self, sim):
        self.a = resolve(self.src, sim, self.t0)
        self.b = resolve(self.dst, sim, self.t1)

    def pos(self, t):
        u = clamp01((t - self.t0) / (self.t1 - self.t0))
        u = u ** (1 + self.ease)
        p = lerp(self.a, self.b, u)
        if self.wobble:
            d = self.b - self.a
            n = np.array([-d[1], d[0]]) / (np.hypot(*d) + 1e-6)
            p = p + n * math.sin(u * math.pi) * self.wobble
        return p

    def draw(self, R, t):
        p = self.pos(t)
        trail = [self.pos(t - k * 0.012) for k in range(10)]
        stroke_line(R.g, trail, self.r * 1.6, self.col, 0.55)
        for k in range(1, 10):
            stroke_line(R.ctx, [trail[k - 1], trail[k]], self.r * 1.4 * (1 - k / 10), self.col,
                        0.5 * (1 - k / 10))
        pulse = 1 + 0.12 * math.sin(t * 60)
        glow_dot(R.g, p[0], p[1], self.r * 3.2 * pulse, self.col, 0.9)
        c = R.ctx
        c.arc(p[0], p[1], self.r * pulse, 0, TAU)
        c.set_source_rgba(*self.col, 1.0)
        c.fill()
        c.arc(p[0], p[1], self.r * 0.62 * pulse, 0, TAU)
        c.set_source_rgba(*self.core, 1.0)
        c.fill()


class Beam(Effect):
    """Energy beam from a (moving) source to an end point function."""

    def __init__(self, t0, t1, src, end_fn, col, core, width=46, seed=11, grow=0.12, dark=False):
        super().__init__(t0, t1)
        self.src, self.end_fn, self.col, self.core, self.width = src, end_fn, col, core, width
        self.seed, self.grow, self.dark = seed, grow, dark

    def prepare(self, sim):
        self.sim = sim

    def draw(self, R, t):
        a = resolve(self.src, self.sim, t)
        b = np.asarray(self.end_fn(self.sim, t), dtype=float)
        u = t - self.t0
        grow = smooth(u / self.grow)
        fade = smooth((self.t1 - t) / 0.15)
        b = a + (b - a) * grow
        d = b - a
        L = math.hypot(*d) + 1e-6
        n = np.array([-d[1], d[0]]) / L
        dirv = d / L
        fr = int(t * 60)
        rng = np.random.default_rng(self.seed * 1000 + fr)
        segs = max(4, int(L / 22))
        wmul = fade * (0.8 + 0.2 * math.sin(t * 50))
        top, bot = [], []
        for k in range(segs + 1):
            s = k / segs
            p = a + d * s
            w = self.width * wmul * (0.55 + 0.45 * min(1.0, s * 6)) * (1 + 0.12 * rng.standard_normal())
            top.append(p + n * w * 0.5)
            bot.append(p - n * w * 0.5)
        poly = top + bot[::-1]
        c = R.ctx
        glow = R.g
        # glow
        glow.move_to(*poly[0])
        for p in poly[1:]:
            glow.line_to(*p)
        glow.close_path()
        glow.set_source_rgba(*self.col, 0.95 * fade)
        glow.set_line_width(self.width * 1.6)
        glow.stroke_preserve()
        glow.fill()
        c.move_to(*poly[0])
        for p in poly[1:]:
            c.line_to(*p)
        c.close_path()
        c.set_source_rgba(*self.col, 0.95 * fade)
        c.fill()
        stroke_line(c, [a, b], self.width * 0.42 * wmul, self.core, fade)
        # sparkles along the beam
        for k in range(10):
            s = rng.uniform(0, 1)
            p = a + d * s + n * rng.uniform(-1, 1) * self.width * 0.8
            q = p - dirv * rng.uniform(15, 45)
            stroke_line(c, [q, p], 2.2, self.core if not self.dark else self.col, 0.8 * fade)
        glow_dot(R.g, a[0], a[1], self.width * 2.2, self.col, fade)


class Crescent(Effect):
    """A flying crescent-shaped slash wave."""

    def __init__(self, t0, t1, src, dst, col, core=WHITE, size=90, ang=0.0, spin=0.0):
        super().__init__(t0, t1)
        self.src, self.dst, self.col, self.core, self.size, self.ang, self.spin = src, dst, col, core, size, ang, spin

    def prepare(self, sim):
        self.a = resolve(self.src, sim, self.t0)
        self.b = resolve(self.dst, sim, self.t1)

    def draw(self, R, t):
        u = clamp01((t - self.t0) / (self.t1 - self.t0))
        p = lerp(self.a, self.b, u)
        d = self.b - self.a
        ang = math.atan2(d[1], d[0]) + math.radians(self.ang) + self.spin * u
        s = self.size * (0.7 + 0.5 * u)
        fade = smooth((1 - u) / 0.15) if u > 0.85 else 1.0
        for c, al, sc in ((R.g, 0.9, 1.25), (R.ctx, 1.0, 1.0)):
            c.save()
            c.translate(*p)
            c.rotate(ang)
            c.scale(s * sc, s * sc)
            c.arc(0, 0, 1.0, -1.25, 1.25)
            c.arc_negative(-0.28, 0, 0.9, 1.05, -1.05)
            c.close_path()
            c.restore()
            c.set_source_rgba(*self.col, al * fade)
            c.fill()
        c = R.ctx
        c.save()
        c.translate(*p)
        c.rotate(ang)
        c.scale(s, s)
        c.arc(0, 0, 0.96, -1.0, 1.0)
        c.restore()
        c.set_source_rgba(*self.core, fade)
        c.set_line_width(3.0)
        c.stroke()


class Tendril(Effect):
    """Shadow tendril erupting from `root` toward a target, whipping, then retracting."""
    layer = 'front'

    def __init__(self, t0, t1, root, target, col, core=(0.02, 0.0, 0.05), seed=0, width=16, reach=1.0):
        super().__init__(t0, t1)
        self.root, self.target, self.col, self.core, self.seed, self.width, self.reach = root, target, col, core, seed, width, reach

    def prepare(self, sim):
        self.sim = sim
        self.r = resolve(self.root, sim, self.t0)

    def draw(self, R, t):
        dur = self.t1 - self.t0
        u = (t - self.t0) / dur
        grow = smooth(u / 0.3) * (1 - smooth((u - 0.72) / 0.28))
        if grow <= 0.01:
            return
        tg = resolve(self.target, self.sim, t)
        d = (tg - self.r) * self.reach
        L = math.hypot(*d) + 1e-6
        n = np.array([-d[1], d[0]]) / L
        pts = []
        N = 22
        for k in range(N + 1):
            s = k / N * grow
            wave = math.sin(s * 9 - t * 14 + self.seed) * 40 * s * (1 - s * 0.5)
            curl = math.sin(self.seed * 2.1) * 120 * s * s
            pts.append(self.r + d * s + n * (wave + curl))
        left, right = [], []
        for k in range(N + 1):
            s = k / N
            w = (self.width * (1 - s) ** 0.8 + 1.5) * 0.5
            p0 = pts[max(0, k - 1)]
            p1 = pts[min(N, k + 1)]
            d = p1 - p0
            nn = np.array([-d[1], d[0]]) / (math.hypot(*d) + 1e-6)
            left.append(pts[k] + nn * w)
            right.append(pts[k] - nn * w)
        poly = left + right[::-1]
        for c, extra, col, al in ((R.g, 8, self.col, 0.7), (R.ctx, 3, self.col, 0.9), (R.ctx, 0, self.core, 1.0)):
            c.move_to(*poly[0])
            for p in poly[1:]:
                c.line_to(*p)
            c.close_path()
            c.set_source_rgba(*col, al)
            if extra:
                c.set_line_width(extra)
                c.set_line_join(1)
                c.stroke_preserve()
            c.fill()


class Boulder(Effect):
    """A rock following keyed positions [(t, x, y, rot), ...]; bursts at its last key if burst=True."""

    def __init__(self, keys, size=46, seed=0, col=(0.24, 0.2, 0.28), edge=(0.45, 0.38, 0.5), glow=None):
        super().__init__(keys[0][0], keys[-1][0])
        self.keys, self.size, self.col, self.edge, self.glowc = keys, size, col, edge, glow
        rng = np.random.default_rng(seed)
        n = 9
        self.shape = [(k / n * TAU + rng.uniform(-0.2, 0.2), size * rng.uniform(0.7, 1.05)) for k in range(n)]

    def state(self, t):
        ks = self.keys
        for i in range(len(ks) - 1):
            if ks[i][0] <= t <= ks[i + 1][0]:
                u = (t - ks[i][0]) / max(1e-6, ks[i + 1][0] - ks[i][0])
                e = ks[i + 1][4] if len(ks[i + 1]) > 4 else 'io'
                from .anim import ease
                w = ease(e, u)
                return [ks[i][j] + (ks[i + 1][j] - ks[i][j]) * w for j in (1, 2, 3)]
        return list(ks[-1][1:4])

    def draw(self, R, t):
        x, y, rot = self.state(t)
        c = R.ctx
        if self.glowc is not None:
            glow_dot(R.g, x, y, self.size * 2.0, self.glowc, 0.35 + 0.1 * math.sin(t * 7))
        c.save()
        c.translate(x, y)
        c.rotate(math.radians(rot))
        for k, (a, r) in enumerate(self.shape):
            if k == 0:
                c.move_to(math.cos(a) * r, math.sin(a) * r)
            else:
                c.line_to(math.cos(a) * r, math.sin(a) * r)
        c.close_path()
        c.set_source_rgba(*self.col, 1)
        c.fill_preserve()
        c.set_source_rgba(*self.edge, 1)
        c.set_line_width(3)
        c.stroke()
        c.restore()


class Pillar(Effect):
    """Vertical light pillar erupting from the ground."""

    def __init__(self, t, x, col, width=70, life=0.6, height=1400, core=WHITE):
        super().__init__(t, t + life)
        self.x, self.col, self.width, self.life, self.height, self.core = x, col, width, life, height, core

    def draw(self, R, t):
        u = (t - self.t0) / self.life
        h = self.height * smooth(u / 0.15)
        wv = self.width * (1 - u) ** 0.7 * (0.9 + 0.1 * math.sin(t * 70))
        a = (1 - u) ** 1.2
        x = self.x
        R.g.rectangle(x - wv, 0, wv * 2, h)
        R.g.set_source_rgba(*self.col, a)
        R.g.fill()
        R.ctx.rectangle(x - wv * 0.5, 0, wv, h)
        R.ctx.set_source_rgba(*self.col, a)
        R.ctx.fill()
        R.ctx.rectangle(x - wv * 0.2, 0, wv * 0.4, h)
        R.ctx.set_source_rgba(*self.core, a)
        R.ctx.fill()


class Lightning(Effect):
    def __init__(self, t0, t1, p0, p1, col, core=WHITE, seed=0, width=5, rate=30, branches=3,
                 jag=0.22, flicker=True):
        super().__init__(t0, t1)
        self.p0s, self.p1s, self.col, self.core, self.seed = p0, p1, col, core, seed
        self.width, self.rate, self.branches, self.jag, self.flicker = width, rate, branches, jag, flicker

    def prepare(self, sim):
        self.sim = sim

    @staticmethod
    def bolt(a, b, rng, jag, depth=6):
        pts = [a, b]
        disp = np.hypot(*(b - a)) * jag
        for _ in range(depth):
            new = [pts[0]]
            for i in range(len(pts) - 1):
                m = (pts[i] + pts[i + 1]) / 2
                d = pts[i + 1] - pts[i]
                n = np.array([-d[1], d[0]]) / (np.hypot(*d) + 1e-6)
                new.append(m + n * rng.uniform(-disp, disp))
                new.append(pts[i + 1])
            pts = new
            disp *= 0.55
        return pts

    def draw(self, R, t):
        a = resolve(self.p0s, self.sim, t)
        b = resolve(self.p1s, self.sim, t)
        k = int(t * self.rate)
        rng = np.random.default_rng(self.seed * 7919 + k)
        fl = 1.0
        if self.flicker:
            fl = 0.55 + 0.45 * rng.uniform()
        u = (t - self.t0) / max(1e-6, self.t1 - self.t0)
        fade = min(1.0, (1 - u) * 5)
        pts = self.bolt(a, b, rng, self.jag)
        al = fl * fade
        stroke_line(R.g, pts, self.width * 5, self.col, al)
        stroke_line(R.ctx, pts, self.width * 1.6, self.col, al * 0.9)
        stroke_line(R.ctx, pts, self.width * 0.6, self.core, al)
        for _ in range(self.branches):
            i = rng.integers(len(pts) // 5, len(pts) - 2)
            p = pts[i]
            d = b - a
            ang = math.atan2(d[1], d[0]) + rng.uniform(-1.0, 1.0)
            L = np.hypot(*d) * rng.uniform(0.1, 0.3)
            q = p + np.array([math.cos(ang), math.sin(ang)]) * L
            bp = self.bolt(p, q, rng, self.jag, 4)
            stroke_line(R.g, bp, self.width * 2.5, self.col, al * 0.8)
            stroke_line(R.ctx, bp, self.width * 0.5, self.core, al * 0.8)


class Spear(Effect):
    """Light spear: materialises at `hover`, aims, then flies to `dst` between t_fire and t1."""

    def __init__(self, t0, t_fire, t1, hover, dst, col, core=WHITE, length=120):
        super().__init__(t0, t1)
        self.tf, self.hover, self.dst, self.col, self.core, self.length = t_fire, hover, dst, col, core, length

    def prepare(self, sim):
        self.sim = sim
        self.h = resolve(self.hover, sim, self.t0)
        self.d = resolve(self.dst, sim, self.t1)

    def draw(self, R, t):
        if t < self.tf:
            u = smooth((t - self.t0) / 0.35)
            p = self.h + np.array([0, 6 * math.sin(t * 5 + self.h[0])])
            aimu = smooth((t - self.t0) / (self.tf - self.t0))
            d0 = np.array([0.0, 1.0])
            d1 = (self.d - self.h)
            d1 = d1 / (np.hypot(*d1) + 1e-6)
            dirv = lerp(d0, d1, aimu)
            dirv = dirv / (np.hypot(*dirv) + 1e-6)
            alpha = u
            L = self.length * u
        else:
            u = clamp01((t - self.tf) / (self.t1 - self.tf))
            u = u * u
            p = lerp(self.h, self.d, u)
            dirv = (self.d - self.h) / (np.hypot(*(self.d - self.h)) + 1e-6)
            alpha = 1.0
            L = self.length * (1 + 0.6 * u)
            stroke_line(R.g, [p - dirv * L * 2.5, p], 16, self.col, 0.6)
        n = np.array([-dirv[1], dirv[0]])
        tip = p + dirv * L * 0.5
        tail = p - dirv * L * 0.5
        w = 9
        c = R.ctx
        c.move_to(*tip)
        c.line_to(*(p + n * w))
        c.line_to(*tail)
        c.line_to(*(p - n * w))
        c.close_path()
        c.set_source_rgba(*self.col, alpha)
        c.fill()
        stroke_line(c, [tail, tip], 3, self.core, alpha)
        stroke_line(R.g, [tail, tip], 26, self.col, alpha * 0.9)


class Nova(Effect):
    def __init__(self, t, at, col, r1=900, life=0.9, core=WHITE):
        super().__init__(t, t + life)
        self.at, self.col, self.r1, self.life, self.core = at, col, r1, life, core

    def prepare(self, sim):
        self.p = resolve(self.at, sim, self.t0)

    def draw(self, R, t):
        import cairocffi as cairo
        u = (t - self.t0) / self.life
        r = self.r1 * (1 - (1 - u) ** 3)
        a = (1 - u) ** 1.5
        x, y = self.p
        for c, al in ((R.ctx, 0.55), (R.g, 0.9)):
            pat = cairo.RadialGradient(x, y, r * 0.2, x, y, r)
            pat.add_color_stop_rgba(0, *self.core, 0)
            pat.add_color_stop_rgba(0.75, *self.col, a * al * 0.4)
            pat.add_color_stop_rgba(0.95, *self.core, a * al)
            pat.add_color_stop_rgba(1, *self.col, 0)
            c.set_source(pat)
            c.arc(x, y, r, 0, TAU)
            c.fill()


class SpaceCracks(Effect):
    """Reality fractures: glowing jagged lines from a point."""

    def __init__(self, t0, t1, at, col, n=9, length=900, seed=4, width=5):
        super().__init__(t0, t1)
        self.at, self.col, self.n, self.length, self.seed, self.width = at, col, n, length, seed, width

    def prepare(self, sim):
        self.p = resolve(self.at, sim, self.t0)
        rng = np.random.default_rng(self.seed)
        self.paths = []
        for i in range(self.n):
            ang = i / self.n * TAU + rng.uniform(-0.3, 0.3)
            pts = [self.p.copy()]
            L = self.length * rng.uniform(0.5, 1.1)
            for k in range(10):
                ang += rng.uniform(-0.4, 0.4)
                pts.append(pts[-1] + np.array([math.cos(ang), math.sin(ang)]) * L / 10)
            self.paths.append(np.array(pts))

    def draw(self, R, t):
        u = (t - self.t0) / (self.t1 - self.t0)
        g = smooth(u / 0.25)
        fade = 1 - smooth((u - 0.8) / 0.2)
        for P in self.paths:
            n = max(2, int(g * (len(P) - 1)) + 1)
            stroke_line(R.g, P[:n], self.width * 3, self.col, fade * 0.7)
            stroke_line(R.ctx, P[:n], self.width, WHITE, fade * 0.85)


class ClashBall(Effect):
    """Pulsing collision sphere where two energies meet (beam struggle / final clash)."""

    def __init__(self, t0, t1, pos_fn, c1, c2, size=110, seed=21):
        super().__init__(t0, t1)
        self.pos_fn, self.c1, self.c2, self.size, self.seed = pos_fn, c1, c2, size, seed

    def prepare(self, sim):
        self.sim = sim

    def draw(self, R, t):
        p = np.asarray(self.pos_fn(self.sim, t), dtype=float)
        u = (t - self.t0) / (self.t1 - self.t0)
        grow = smooth(u / 0.1) * (1 - smooth((u - 0.92) / 0.08))
        s = self.size * grow * (1 + 0.15 * math.sin(t * 40) + 0.08 * math.sin(t * 97))
        x, y = p
        glow_dot(R.g, x - s * 0.3, y, s * 3.0, self.c1, 0.65)
        glow_dot(R.g, x + s * 0.3, y, s * 3.0, self.c2, 0.65)
        glow_dot(R.ctx, x, y, s * 1.0, WHITE, 1.0)
        rng = np.random.default_rng(self.seed * 991 + int(t * 60))
        for k in range(10):
            ang = rng.uniform(0, TAU)
            L = s * rng.uniform(1.2, 3.2)
            q = p + np.array([math.cos(ang), math.sin(ang)]) * L
            col = self.c1 if k % 2 else self.c2
            pts = Lightning.bolt(p, q, rng, 0.25, 4)
            stroke_line(R.ctx, pts, 2.2, WHITE, 0.9)
            stroke_line(R.g, pts, 8, col, 0.9)


class ChargeLines(Effect):
    """Particles streaking inward toward a (moving) charge point."""

    def __init__(self, t0, t1, at, col, radius=260, n=26, seed=31, core=WHITE):
        super().__init__(t0, t1)
        self.at, self.col, self.radius, self.n, self.seed, self.core = at, col, radius, n, seed, core
        rng = np.random.default_rng(seed)
        self.ph = rng.uniform(0, 1, n)
        self.ang = rng.uniform(0, TAU, n)
        self.per = rng.uniform(0.35, 0.7, n)

    def prepare(self, sim):
        self.sim = sim

    def draw(self, R, t):
        p = resolve(self.at, self.sim, t)
        u = (t - self.t0) / (self.t1 - self.t0)
        amp = smooth(u / 0.2) * (1 - smooth((u - 0.9) / 0.1))
        for i in range(self.n):
            ph = ((t - self.t0) / self.per[i] + self.ph[i]) % 1.0
            cyc = int((t - self.t0) / self.per[i] + self.ph[i])
            ang = self.ang[i] + cyc * 2.4
            r = self.radius * (1 - ph) ** 1.5
            d = np.array([math.cos(ang), math.sin(ang)])
            a = p + d * r
            b = p + d * (r + 40 * (1 - ph) + 10)
            al = amp * math.sin(ph * math.pi)
            stroke_line(R.ctx, [b, a], 2.4, self.core, al)
            stroke_line(R.g, [b, a], 7, self.col, al)


class Asteroid(Effect):
    layer = 'back'

    def __init__(self, t0, t1, pos, r, seed=0, shatter_t=None, col=(0.30, 0.27, 0.36), drift=(0, 0)):
        super().__init__(t0, t1)
        self.pos, self.r, self.st, self.col, self.drift = np.array(pos, float), r, shatter_t, col, np.array(drift, float)
        rng = np.random.default_rng(seed)
        n = 12
        self.shape = [(k / n * TAU, r * rng.uniform(0.75, 1.0)) for k in range(n)]
        self.craters = [(rng.uniform(-0.5, 0.5) * r, rng.uniform(-0.5, 0.5) * r, rng.uniform(0.08, 0.2) * r) for _ in range(4)]

    def draw(self, R, t):
        if self.st is not None and t > self.st:
            return
        p = self.pos + self.drift * (t - self.t0)
        c = R.ctx
        c.save()
        c.translate(*p)
        c.rotate(t * 0.1)
        for k, (a, r) in enumerate(self.shape):
            (c.move_to if k == 0 else c.line_to)(math.cos(a) * r, math.sin(a) * r)
        c.close_path()
        c.set_source_rgba(*self.col, 1)
        c.fill_preserve()
        c.set_source_rgba(0.55, 0.5, 0.65, 1)
        c.set_line_width(3)
        c.stroke()
        for (x, y, r) in self.craters:
            c.arc(x, y, r, 0, TAU)
            c.set_source_rgba(0.2, 0.18, 0.25, 1)
            c.fill()
        c.restore()


class Text(Effect):
    layer = 'screen'

    def __init__(self, t0, t1, text, size=90, y=0.5, col=WHITE, font='DejaVu Serif', spacing=0.35,
                 fade=0.6, glow=None, bold=True):
        super().__init__(t0, t1)
        self.text, self.size, self.y, self.col, self.font, self.spacing, self.fade = text, size, y, col, font, spacing, fade
        self.glowc, self.bold = glow, bold

    def draw(self, R, t):
        import cairocffi as cairo
        u = min(smooth((t - self.t0) / self.fade), smooth((self.t1 - t) / self.fade))
        if u <= 0:
            return
        c = R.sctx
        s = R.s
        c.save()
        c.select_font_face(self.font, cairo.FONT_SLANT_NORMAL,
                           cairo.FONT_WEIGHT_BOLD if self.bold else cairo.FONT_WEIGHT_NORMAL)
        size = self.size * s
        c.set_font_size(size)
        chars = list(self.text)
        widths = [c.text_extents(ch)[4] for ch in chars]
        sp = size * self.spacing * (1 + 0.15 * (1 - u))
        total = sum(widths) + sp * (len(chars) - 1)
        x = R.Wpx / 2 - total / 2
        y = R.Hpx * self.y + size * 0.35
        for ch, w in zip(chars, widths):
            c.move_to(x, y)
            c.text_path(ch)
            x += w + sp
        if self.glowc is not None:
            c.set_source_rgba(*self.glowc, 0.35 * u)
            c.set_line_width(size * 0.08)
            c.stroke_preserve()
        c.set_source_rgba(*self.col, u)
        c.fill()
        c.restore()


class Mark(Effect):
    """A glowing sigil left on a frozen target during time-stop; bursts at t1."""

    def __init__(self, t0, t1, at, col):
        super().__init__(t0, t1)
        self.at, self.col = at, col

    def prepare(self, sim):
        self.p = resolve(self.at, sim, self.t0)

    def draw(self, R, t):
        x, y = self.p
        pul = 1 + 0.2 * math.sin(t * 12)
        glow_dot(R.g, x, y, 40 * pul, self.col, 0.9)
        c = R.ctx
        c.arc(x, y, 9 * pul, 0, TAU)
        c.set_source_rgba(*self.col, 0.9)
        c.set_line_width(2.5)
        c.stroke()
        for k in range(4):
            a = t * 3 + k * math.pi / 2
            c.move_to(x + math.cos(a) * 13, y + math.sin(a) * 13)
            c.line_to(x + math.cos(a) * 20, y + math.sin(a) * 20)
            c.stroke()


class Comets(Effect):
    """Two energies (black/violet and white/gold) spiralling into each other."""

    def __init__(self, t0, t1, center, r0, c1, c2, core1, core2, turns=4.5):
        super().__init__(t0, t1)
        self.c, self.r0, self.c1, self.c2, self.k1, self.k2, self.turns = np.array(center, float), r0, c1, c2, core1, core2, turns

    def pos(self, t, side):
        u = clamp01((t - self.t0) / (self.t1 - self.t0))
        r = self.r0 * (1 - u) ** 1.3
        ang = self.turns * TAU * (u ** 1.6) + (0 if side == 0 else math.pi)
        return self.c + np.array([math.cos(ang) * r, math.sin(ang) * r * 0.8])

    def draw(self, R, t):
        u = clamp01((t - self.t0) / (self.t1 - self.t0))
        app = smooth(u / 0.1)
        for side, col, core in ((0, self.c1, self.k1), (1, self.c2, self.k2)):
            trail = [self.pos(t - k * 0.02, side) for k in range(26)]
            stroke_line(R.g, trail, 34, col, 0.9 * app)
            for k in range(1, 26):
                stroke_line(R.ctx, [trail[k - 1], trail[k]], 16 * (1 - k / 26), col, app * (1 - k / 26))
            p = trail[0]
            glow_dot(R.g, p[0], p[1], 110, col, app)
            R.ctx.arc(p[0], p[1], 16, 0, TAU)
            R.ctx.set_source_rgba(*core, app)
            R.ctx.fill()


class Vortex(Effect):
    """Dark gravity sphere: forms at `src` (moving), grows, then is hurled to `dst`."""

    def __init__(self, t0, tl, t1, src, dst, col, rmax=90, seed=3):
        super().__init__(t0, t1)
        self.tl, self.src, self.dst, self.col, self.rmax, self.seed = tl, src, dst, col, rmax, seed

    def prepare(self, sim):
        self.sim = sim
        self.b = resolve(self.dst, sim, self.t1)
        self.la = resolve(self.src, sim, self.tl)

    def draw(self, R, t):
        if t < self.tl:
            p = resolve(self.src, self.sim, t)
            r = self.rmax * smooth((t - self.t0) / (self.tl - self.t0))
        else:
            u = clamp01((t - self.tl) / (self.t1 - self.tl))
            p = lerp(self.la, self.b, u * u)
            r = self.rmax
        if r < 1:
            return
        x, y = p
        glow_dot(R.g, x, y, r * 2.6, self.col, 0.9)
        c = R.ctx
        for k in range(4):
            a0 = t * (5 + k) + k * 1.3
            c.save()
            c.translate(x, y)
            c.scale(1, 0.35 + 0.1 * k)
            c.arc(0, 0, r * (1.25 + 0.18 * k), a0, a0 + 2.2)
            c.restore()
            c.set_source_rgba(*self.col, 0.8)
            c.set_line_width(3)
            c.stroke()
        c.arc(x, y, r, 0, TAU)
        c.set_source_rgba(0.02, 0.0, 0.05, 1)
        c.fill()
        c.arc(x, y, r, 0, TAU)
        c.set_source_rgba(*self.col, 0.9)
        c.set_line_width(4)
        c.stroke()
        rng = np.random.default_rng(self.seed * 77 + int(t * 60))
        for k in range(12):
            ang = rng.uniform(0, TAU)
            L = r * rng.uniform(1.8, 3.2)
            a_ = np.array([x, y]) + np.array([math.cos(ang), math.sin(ang)]) * L
            b_ = np.array([x, y]) + np.array([math.cos(ang + 0.4), math.sin(ang + 0.4)]) * r * 1.1
            stroke_line(c, [a_, b_], 2, self.col, 0.6)
