"""Environment: sky, mountains, lake, reflections, mood palettes, camera."""
import math
import random
from math import sin, cos, pi, hypot

import cairo

from rig import clamp, lerp, sstep, mix, hexc, Track

W, H = 1920, 1080
HOR_Y = 0.70   # world height of the horizon line


# ----------------------------------------------------------------------------
# palettes
# ----------------------------------------------------------------------------
def pal(top, mid, hor, water_far, water_near, mtn, fog, star=0.0, sun=0.6, sunc='#ffe8c8'):
    return dict(top=hexc(top), mid=hexc(mid), hor=hexc(hor), wf=hexc(water_far), wn=hexc(water_near),
                mtn=hexc(mtn), fog=hexc(fog), star=star, sun=sun, sunc=hexc(sunc))


PALETTES = {
    'dusk': pal('#111a34', '#38507e', '#e3a98c', '#34496e', '#0b1424', '#0b1222', '#8fa0c8', 0.25, 0.55, '#ffe6c8'),
    'gloom': pal('#141a2e', '#33405f', '#a58f9a', '#2b3a58', '#0a1020', '#0a0f1c', '#7c88a8', 0.35, 0.35, '#f0d8d0'),
    'storm': pal('#151230', '#3b2f5c', '#b5707c', '#2a2648', '#0a0818', '#0b0914', '#6a5a90', 0.3, 0.2, '#ffb8b0'),
    'night': pal('#05060f', '#111631', '#39406a', '#141a36', '#04050c', '#03040a', '#2c3458', 0.9, 0.0, '#c8d8ff'),
    'void_dark': pal('#000000', '#08080e', '#241b3a', '#0a0912', '#020204', '#020204', '#1a1428', 0.9, 0.0, '#ffffff'),
    'void_light': pal('#e6e0d0', '#f4ecd8', '#fff7e0', '#cdc6b4', '#8f8a7c', '#3c3830', '#f0e8d4', 0.0, 1.0, '#ffffff'),
    'dawn': pal('#5f7fb4', '#b5b6c8', '#ffd9b0', '#8da2c4', '#3c5378', '#42506e', '#f4d8c4', 0.0, 1.0, '#fff0d0'),
    'calm': pal('#7d9bcc', '#cbd3e0', '#ffe9cc', '#9db6d2', '#4a6488', '#56647f', '#f8ecdc', 0.0, 1.0, '#fff4dc'),
}


class PaletteTrack:
    def __init__(self, name):
        self.keys = [(-1e9, name)]

    def add(self, t, name, dur=2.0):
        self.keys.append((t, name, dur))
        return self

    def __call__(self, t):
        cur = self.keys[0][1]
        prev = cur
        u = 1.0
        for k in self.keys[1:]:
            if t >= k[0]:
                prev = cur
                cur = k[1]
                u = clamp((t - k[0]) / k[2], 0, 1)
                u = u * u * (3 - 2 * u)
            else:
                break
        a, b = PALETTES[prev], PALETTES[cur]
        if u >= 1.0 or prev == cur:
            return b
        out = {}
        for key in a:
            if isinstance(a[key], tuple):
                out[key] = mix(a[key], b[key], u)
            else:
                out[key] = lerp(a[key], b[key], u)
        return out


# ----------------------------------------------------------------------------
# noise profiles
# ----------------------------------------------------------------------------
def make_profile(seed, n=2048, octaves=5, ridged=True, base_freq=6.0):
    rng = random.Random(seed)
    tabs = []
    for o in range(octaves):
        m = int(base_freq * (2 ** o))
        tabs.append([rng.random() for _ in range(m)])
    out = []
    for i in range(n):
        x = i / n
        v = 0.0
        amp = 1.0
        tot = 0.0
        for o in range(octaves):
            tab = tabs[o]
            m = len(tab)
            fx = x * m
            i0 = int(fx) % m
            i1 = (i0 + 1) % m
            f = fx - int(fx)
            f = f * f * (3 - 2 * f)
            nv = tab[i0] * (1 - f) + tab[i1] * f
            if ridged:
                nv = 1 - abs(2 * nv - 1)
            v += nv * amp
            tot += amp
            amp *= 0.5
        out.append(v / tot)
    return out


class Layer:
    def __init__(self, p, ls, base, amp, seed, fog, period=260.0, ridged=True, freq=6.0, octaves=5, shape=1.7):
        self.p, self.ls, self.base, self.amp, self.fog = p, ls, base, amp, fog
        self.shape = shape
        self.period = period
        self.prof = make_profile(seed, 2048, octaves, ridged, freq)
        self.n = len(self.prof)
        self.cut = None    # dict(u0,h0,u1,h1,t0,slide)

    def height(self, u):
        x = (u / self.period) % 1.0
        fx = x * self.n
        i0 = int(fx) % self.n
        i1 = (i0 + 1) % self.n
        f = fx - int(fx)
        v = self.prof[i0] * (1 - f) + self.prof[i1] * f
        return self.base + self.amp * (v ** self.shape)


class Env:
    def __init__(self, seed=7):
        rng = random.Random(seed)
        self.layers = [
            Layer(0.02, 0.55, 1.2, 5.0, 11, 0.72, period=120, ridged=True, freq=12, octaves=5, shape=1.8),
            Layer(0.05, 0.75, 0.6, 3.6, 23, 0.50, period=120, ridged=True, freq=15, octaves=5, shape=1.8),
            Layer(0.10, 0.95, 0.2, 2.4, 37, 0.30, period=120, ridged=True, freq=20, octaves=5, shape=1.7),
            Layer(0.20, 1.20, -0.2, 1.3, 41, 0.10, period=120, ridged=False, freq=26, octaves=4, shape=1.4),
        ]
        self.stars = [(rng.random(), rng.random() ** 0.8, rng.random() * 6.28, 0.6 + rng.random() * 1.6)
                      for _ in range(260)]
        self.clouds = [(rng.random() * 1.0, rng.random(), 0.4 + rng.random() * 1.0, rng.random()) for _ in range(16)]
        self.hclouds = [(rng.random() * 60 - 30, 6 + rng.random() * 34, 0.6 + rng.random() * 1.4, rng.random()) for _ in range(34)]
        self.petals = [(rng.random(), rng.random(), rng.random() * 6.28, 0.5 + rng.random()) for _ in range(46)]
        self.glints = [(rng.random(), rng.random() ** 1.6, rng.random() * 6.28, rng.random()) for _ in range(120)]
        self.wave_lines = [(rng.random(), rng.random() ** 1.8, rng.random(), rng.random() * 6.28) for _ in range(90)]

    # -- helpers -------------------------------------------------------------
    def layer_screen(self, L, u, hgt, cam, hy):
        sx = W / 2 + (u - cam['cx'] * L.p) * cam['k'] * L.ls
        sy = hy - hgt * cam['k'] * L.ls
        return sx, sy

    def draw_backdrop(self, ctx, cam, t, P, fx):
        """Sky + mountains + haze in screen space above the horizon (also used for reflection)."""
        k = cam['k']
        hy = H / 2 + (cam['cy'] - HOR_Y) * k
        hy = clamp(hy, -4000, 6000)
        top, mid, hor = P['top'], P['mid'], P['hor']
        gp = cairo.LinearGradient(0, hy - 1300, 0, hy)
        gp.add_color_stop_rgb(0, *top)
        gp.add_color_stop_rgb(0.55, *mid)
        gp.add_color_stop_rgb(1.0, *hor)
        ctx.rectangle(-400, -2600, W + 800, hy + 2600 + 4)
        ctx.set_source(gp)
        ctx.fill()
        # sun / moon glow
        sx = W / 2 + (4.5 - cam['cx'] * 0.02) * k * 0.55
        sy = hy - 3.4 * k * 0.6
        sunc = P['sunc']
        if P['sun'] > 0.01:
            for r, a in ((9.0, 0.10), (5.0, 0.16), (2.6, 0.22)):
                rg = cairo.RadialGradient(sx, sy, 0, sx, sy, r * k * 0.6)
                rg.add_color_stop_rgba(0, sunc[0], sunc[1], sunc[2], a * P['sun'])
                rg.add_color_stop_rgba(1, sunc[0], sunc[1], sunc[2], 0)
                ctx.set_source(rg)
                ctx.arc(sx, sy, r * k * 0.6, 0, 2 * pi)
                ctx.fill()
            if fx.get('moon', 1):
                ctx.set_source_rgba(sunc[0], sunc[1], sunc[2], 0.92 * min(1, P['sun'] * 1.6))
                ctx.arc(sx, sy, 0.62 * k * 0.6, 0, 2 * pi)
                ctx.fill()
        # stars
        if P['star'] > 0.02:
            for (a, b, ph, s) in self.stars:
                x = a * (W + 200) - 100
                y = hy - 40 - b * (hy + 100)
                if y < -50 or y > hy - 10:
                    continue
                tw = 0.55 + 0.45 * sin(t * 2.1 + ph)
                ctx.set_source_rgba(1, 1, 1, P['star'] * tw * 0.9)
                ctx.arc(x, y, s, 0, 2 * pi)
                ctx.fill()
        # clouds (soft)
        cl = fx.get('cloud', 1.0)
        if cl > 0.02:
            base = hor
            for (a, b, sz, d) in self.clouds:
                drift = (a + t * (0.004 + 0.006 * d) + cam['cx'] * 0.01) % 1.3 - 0.15
                x = drift * (W + 400) - 200
                y = hy - (0.4 + b * 3.4) * k * 0.5
                r = (2.5 + 3.0 * sz) * k * 0.30
                c = mix(mid, hor, 0.45)
                for j in range(3):
                    xx = x + (j - 1) * r * 0.9
                    rg = cairo.RadialGradient(xx, y, 0, xx, y, r)
                    rg.add_color_stop_rgba(0, c[0], c[1], c[2], 0.22 * cl)
                    rg.add_color_stop_rgba(1, c[0], c[1], c[2], 0)
                    ctx.save()
                    ctx.translate(xx, y)
                    ctx.scale(1, 0.28)
                    ctx.translate(-xx, -y)
                    ctx.set_source(rg)
                    ctx.arc(xx, y, r, 0, 2 * pi)
                    ctx.fill()
                    ctx.restore()
        # high clouds (world-anchored altitude, slow parallax)
        hc = fx.get('hicloud', 1.0)
        if hc > 0.02:
            cc = mix(mid, hor, 0.5)
            for (xw, alt, sz, d) in self.hclouds:
                sx_ = W / 2 + (xw - cam['cx'] * 0.35 + t * (0.15 + 0.2 * d)) * k * 0.35
                sx_ = (sx_ + 3000) % 6000 - 1500 + 0
                sy_ = hy - (alt - 0.7) * k * 0.35 + (cam['cy'] - 0.7) * 0.0
                if sy_ < -200 or sy_ > hy - 20:
                    continue
                r = (2.5 + 3.5 * sz) * k * 0.3
                for j in range(3):
                    xx = sx_ + (j - 1) * r * 0.8
                    rg = cairo.RadialGradient(xx, sy_, 0, xx, sy_, r)
                    rg.add_color_stop_rgba(0, cc[0], cc[1], cc[2], 0.20 * hc)
                    rg.add_color_stop_rgba(1, cc[0], cc[1], cc[2], 0)
                    ctx.save()
                    ctx.translate(xx, sy_)
                    ctx.scale(1, 0.30)
                    ctx.translate(-xx, -sy_)
                    ctx.set_source(rg)
                    ctx.arc(xx, sy_, r, 0, 2 * pi)
                    ctx.fill()
                    ctx.restore()
        # mountains
        for li, L in enumerate(self.layers):
            fogc = mix(P['mtn'], mix(P['mid'], hor, 0.35), L.fog)
            self._draw_layer(ctx, L, cam, hy, fogc, t, (hor,))
        # haze band at horizon
        hz = cairo.LinearGradient(0, hy - 260, 0, hy + 2)
        hz.add_color_stop_rgba(0, hor[0], hor[1], hor[2], 0)
        hz.add_color_stop_rgba(1, hor[0], hor[1], hor[2], 0.55)
        ctx.rectangle(-400, hy - 260, W + 800, 262)
        ctx.set_source(hz)
        ctx.fill()

    def _draw_layer(self, ctx, L, cam, hy, col, t, P_hor=None):
        k = cam['k']
        step = 8
        pts = []
        xs = range(-400, W + 401, step)
        for sx in xs:
            u = (sx - W / 2) / (k * L.ls) + cam['cx'] * L.p
            pts.append((sx, hy - L.height(u) * k * L.ls, u))
        cut = L.cut
        if cut is None or cut['w'] is None or t < cut['w'] or t > cut.get('until', 1e9):
            ctx.move_to(-400, hy + 4)
            for (sx, sy, u) in pts:
                ctx.line_to(sx, sy)
            ctx.line_to(W + 400, hy + 4)
            ctx.close_path()
            g = cairo.LinearGradient(0, hy - 7 * k * L.ls, 0, hy + 4)
            g.add_color_stop_rgb(0, *col)
            g.add_color_stop_rgb(1, *mix(col, P_hor[0], 0.55 - 0.3 * L.fog))
            ctx.set_source(g)
            ctx.fill()
            return
        # sliced mountain: draw lower part, then upper part slid along the cut
        (u0, h0, u1, h1) = cut['line']
        s0 = self.layer_screen(L, u0, h0, cam, hy)
        s1 = self.layer_screen(L, u1, h1, cam, hy)
        dx, dy = s1[0] - s0[0], s1[1] - s0[1]
        d = hypot(dx, dy) or 1
        dx, dy = dx / d, dy / d
        # normal pointing "up" (screen y negative)
        nx, ny = dy, -dx
        if ny > 0:
            nx, ny = -nx, -ny
        age = max(0.0, t - cut['w'])
        slide = cut['slide'] * (1 - math.exp(-age * 1.6)) * k * L.ls * 0.02
        fall = cut['fall'] * age * age * 0.5 * k * L.ls * 0.02
        for part in (0, 1):
            ctx.save()
            big = 6000
            # half-plane polygon
            ax, ay = s0[0] - dx * big, s0[1] - dy * big
            bx, by = s0[0] + dx * big, s0[1] + dy * big
            sgn_ = 1 if part == 1 else -1
            ctx.move_to(ax, ay)
            ctx.line_to(bx, by)
            ctx.line_to(bx + sgn_ * nx * big, by + sgn_ * ny * big)
            ctx.line_to(ax + sgn_ * nx * big, ay + sgn_ * ny * big)
            ctx.close_path()
            ctx.clip()
            if part == 1:
                ctx.translate(dx * slide, dy * slide + fall)
            ctx.move_to(-400, hy + 4)
            for (sx, sy, u) in pts:
                ctx.line_to(sx, sy)
            ctx.line_to(W + 400, hy + 4)
            ctx.close_path()
            ctx.set_source_rgb(*col)
            ctx.fill()
            # glow along cut edge
            if part == 0 and age < 6:
                ctx.set_source_rgba(1, 0.95, 0.8, max(0, 0.8 - age * 0.25))
                ctx.set_line_width(4)
                ctx.move_to(s0[0], s0[1])
                ctx.line_to(s1[0], s1[1])
                ctx.stroke()
            ctx.restore()

    # -- full background -------------------------------------------------------
    def draw(self, ctx, cam, t, P, fx, P2=None):
        """Draw sky/water. fx: dict of extras: split (0..1), moon, cloud, water_shake ..."""
        k = cam['k']
        hy = H / 2 + (cam['cy'] - HOR_Y) * k
        ctx.save()
        ctx.identity_matrix()
        ctx.translate(W / 2, H / 2)
        ctx.rotate(cam['roll'])
        ctx.translate(-W / 2, -H / 2)
        split = fx.get('split', 0.0)
        ctx.push_group()
        if split > 0.01 and P2 is not None:
            self._draw_split(ctx, cam, t, P, P2, fx, hy)
        else:
            self.draw_backdrop(ctx, cam, t, P, fx)
        back = ctx.pop_group()
        ctx.set_source(back)
        ctx.paint()
        # water
        wf, wn = P['wf'], P['wn']
        if split > 0.01 and P2 is not None:
            wf = mix(wf, P2['wf'], 0.0)
        wg = cairo.LinearGradient(0, hy, 0, H + 400)
        wg.add_color_stop_rgb(0, *wf)
        wg.add_color_stop_rgb(1, *wn)
        ctx.rectangle(-400, hy, W + 800, H + 800 - hy)
        ctx.set_source(wg)
        ctx.fill()
        # reflection of backdrop (flipped about horizon) in distorted strips
        nstrip = 42
        y_end = min(H + 200, hy + 900)
        if hy < H + 100:
            sh = max(8.0, (y_end - hy) / nstrip)
            ctm = ctx.get_matrix()
            ctx.save()
            ctx.rectangle(-400, hy, W + 800, H + 800 - hy)
            ctx.clip()
            ctx.push_group()
            for si in range(nstrip):
                y0 = float(int(hy + si * sh))
                if y0 > H + 20:
                    break
                depth = (y0 - hy) / max(1, (y_end - hy))
                ox = sin(t * 1.6 + si * 0.9) * (2 + 10 * depth) * (1 + fx.get('water_shake', 0) * 3)
                ctx.save()
                ctx.rectangle(-400, y0, W + 800, H + 800)
                ctx.clip()
                back.set_matrix(cairo.Matrix(1, 0, 0, -1, -ox, 2 * hy) * ctm)
                ctx.set_source(back)
                ctx.paint()
                ctx.restore()
            refl = ctx.pop_group()
            ctx.set_source(refl)
            mg = cairo.LinearGradient(0, hy, 0, y_end)
            mg.add_color_stop_rgba(0, 1, 1, 1, 0.70)
            mg.add_color_stop_rgba(0.5, 1, 1, 1, 0.30)
            mg.add_color_stop_rgba(1, 1, 1, 1, 0.08)
            ctx.mask(mg)
            ctx.restore()
        # moon road glints
        sunc = P['sunc']
        if P['sun'] > 0.05:
            sx = W / 2 + (4.5 - cam['cx'] * 0.02) * k * 0.55
            for (a, b, ph, s) in self.glints:
                y = hy + 6 + b * min(H - hy + 100, 700)
                if y > H + 10:
                    continue
                wdt = (8 + 90 * b) * (0.5 + 0.5 * s)
                x = sx + (a - 0.5) * (40 + 220 * b) + sin(t * 1.3 + ph) * 8
                al = (0.25 + 0.25 * sin(t * 3 + ph)) * P['sun'] * (1 - b * 0.6)
                ctx.set_source_rgba(sunc[0], sunc[1], sunc[2], max(0, al))
                ctx.set_line_width(1.5 + 2.5 * b)
                ctx.move_to(x - wdt / 2, y)
                ctx.line_to(x + wdt / 2, y)
                ctx.stroke()
        # wave lines
        wl = mix(P['hor'], (1, 1, 1), 0.3)
        for (a, b, ln, ph) in self.wave_lines:
            y = hy + 4 + b * min(H - hy + 100, 900)
            if y > H + 10:
                continue
            u = (y - hy) / 900.0
            x = ((a * 2.2 - 0.6) * (W + 400) + cam['cx'] * k * 0.35 * (0.3 + u) + sin(t * 0.7 + ph) * 12) % (W + 400) - 200
            wdt = (30 + 240 * ln) * (0.4 + u)
            ctx.set_source_rgba(wl[0], wl[1], wl[2], 0.09 + 0.10 * u)
            ctx.set_line_width(1 + 2 * u)
            ctx.move_to(x, y)
            ctx.line_to(x + wdt, y)
            ctx.stroke()
        # low fog bank
        fg = mix(P['fog'], P['hor'], 0.5)
        f = cairo.LinearGradient(0, hy - 30, 0, hy + 200)
        f.add_color_stop_rgba(0, fg[0], fg[1], fg[2], 0.0)
        f.add_color_stop_rgba(0.25, fg[0], fg[1], fg[2], 0.32)
        f.add_color_stop_rgba(1, fg[0], fg[1], fg[2], 0.0)
        ctx.rectangle(-400, hy - 30, W + 800, 230)
        ctx.set_source(f)
        ctx.fill()
        ctx.restore()

    def _draw_split(self, ctx, cam, t, PA, PB, fx, hy):
        """Sky divided by a giant taiji S-curve: left dark, right light."""
        split = fx.get('split', 0.0)
        shift = fx.get('split_shift', 0.0)
        self.draw_backdrop(ctx, cam, t, PB, dict(fx, cloud=0.3))
        ctx.save()
        # S-curve boundary
        cx = W / 2 + shift * 600
        ctx.move_to(cx + 260 * sin(t * 0.25) - W * (1 - split) * 1.3 - 400 + W * 0.0, -600)
        pts = []
        n = 40
        top, bot = -600, H + 400
        for i in range(n + 1):
            y = lerp(top, bot, i / n)
            x = cx + 240 * sin((y - top) / 520.0 * 2 * pi * 0.5 + t * 0.3) + 120 * sin(y * 0.012 + t * 0.5)
            pts.append((x, y))
        # dark side region: everything left of the curve, scaled by split (curve slides in)
        off = (1 - split) * (W * 0.75)
        ctx.move_to(-800 - off, top)
        for (x, y) in pts:
            ctx.line_to(x - off, y)
        ctx.line_to(-800 - off, bot)
        ctx.close_path()
        ctx.clip()
        self.draw_backdrop(ctx, cam, t, PA, dict(fx, cloud=0.2))
        ctx.restore()
        # glowing boundary
        ctx.set_line_width(5)
        ctx.set_source_rgba(1, 1, 1, 0.35 * split)
        ctx.move_to(pts[0][0] - off, pts[0][1])
        for (x, y) in pts:
            ctx.line_to(x - off, y)
        ctx.stroke()


# ----------------------------------------------------------------------------
# camera director
# ----------------------------------------------------------------------------
class Camera:
    def __init__(self):
        self.shots = []  # (t0, dict) sorted
        self.cx, self.cy, self.k, self.roll = 0.0, 1.3, 170.0, 0.0
        self.init = False
        self.shakes = []   # (t_video, amp, decay, freq)

    def shot(self, t0, mode='auto', cut=False, **kw):
        kw.update(mode=mode, cut=cut, t0=t0)
        self.shots.append(kw)
        self.shots.sort(key=lambda s: s['t0'])

    def cur_shot(self, t):
        cur = self.shots[0]
        for s in self.shots:
            if s['t0'] <= t:
                cur = s
        return cur

    def add_shake(self, tv, amp, decay=0.35, freq=28.0):
        self.shakes.append((tv, amp, decay, freq))

    def step(self, t, tv, fighters, dt_v, extra_roll=0.0):
        """t = world time, tv = video time."""
        s = self.cur_shot(t)
        A, B = fighters
        ax, ay = A.pose['hip']
        bx, by = B.pose['hip']
        if s['mode'] == 'auto':
            mx, my = (ax + bx) / 2, (ay + by) / 2 + 0.55
            dist = abs(ax - bx)
            hgt = abs(ay - by)
            zfit_w = 1780.0 / (dist + s.get('padx', 3.4))
            zfit_h = 900.0 / (hgt + s.get('pady', 3.0))
            tk = clamp(min(zfit_w, zfit_h) * s.get('zmul', 1.0), s.get('zmin', 95), s.get('zmax', 330))
            tcx = mx + s.get('dx', 0.0)
            tcy = max(my + s.get('dy', 0.0), s.get('ymin', 1.25))
            troll = s.get('roll', 0.0)
        elif s['mode'] == 'follow':
            f = A if s.get('who', 0) == 0 else B
            fx_, fy_ = f.pose['hip']
            tcx = fx_ + s.get('dx', 0.0)
            tcy = max(fy_ + 0.5 + s.get('dy', 0.0), s.get('ymin', 1.2))
            tk = s.get('k', 240)
            troll = s.get('roll', 0.0)
        else:
            # fixed: keyed values with optional drift (cx0->cx1 over shot duration)
            dur = s.get('dur', 1.0)
            u = clamp((t - s['t0']) / dur, 0, 1)
            e = u * u * (3 - 2 * u) if s.get('ease', 'smooth') == 'smooth' else u
            tcx = lerp(s['cx'], s.get('cx1', s['cx']), e)
            tcy = lerp(s['cy'], s.get('cy1', s['cy']), e)
            tk = lerp(s['k'], s.get('k1', s['k']), e)
            troll = lerp(s.get('roll', 0.0), s.get('roll1', s.get('roll', 0.0)), e)
        if not self.init or (s.get('cut') and self._last_shot is not s):
            self.cx, self.cy, self.k, self.roll = tcx, tcy, tk, troll
            self.vx = self.vy = self.vk = self.vr = 0.0
            self.init = True
        elif s['mode'] == 'fixed':
            self.cx, self.cy, self.k, self.roll = tcx, tcy, tk, troll
            self.vx = self.vy = self.vk = self.vr = 0.0
        else:
            om = s.get('om', 5.0)
            # critically damped smoothing
            for name, tgt, vname in (('cx', tcx, 'vx'), ('cy', tcy, 'vy'), ('k', tk, 'vk'), ('roll', troll, 'vr')):
                x = getattr(self, name)
                v = getattr(self, vname)
                a = -2 * om * v - om * om * (x - tgt)
                v += a * dt_v
                x += v * dt_v
                setattr(self, name, x)
                setattr(self, vname, v)
        self._last_shot = s
        # shake
        shx = shy = shr = 0.0
        for (t0, amp, dec, fr) in self.shakes:
            a = tv - t0
            if 0 <= a < dec * 5:
                e = amp * math.exp(-a / dec)
                shx += e * sin(a * fr * 1.0 + t0 * 91.0) * 1.0
                shy += e * cos(a * fr * 1.3 + t0 * 57.0) * 0.8
                shr += e * sin(a * fr * 0.7 + t0 * 33.0) * 0.0004
        return dict(cx=self.cx, cy=self.cy, k=self.k, roll=self.roll + shr + extra_roll, shx=shx, shy=shy)
