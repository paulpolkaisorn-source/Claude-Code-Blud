#!/usr/bin/env python3
"""
WEAPON MORPH v2 - colour ASCII animation (standard library only)
Made for Pydroid 3 / PyCode / any terminal.

orb -> blade -> gun -> bullet -> mace -> smash -> broken ground
    -> dark energy -> black hole

Run it, then at the prompt:
  ENTER      = colour + clear-screen mode (best)
  n          = no colour (plain text)
  2          = scroll mode (if the screen looks garbled)
  3          = use the "clear" command
  (you can combine them, e.g.  n2 )
"""
import math
import os
import random
import sys
import time

# ----------------------------------------------------------------- settings
W, H = 40, 22        # screen size in characters (fits a phone in portrait)
DELAY = 0.055        # seconds per frame (lower = faster)
LOOP = False         # True = repeat the animation forever
COLOR = True         # 256-colour ANSI (the start prompt can turn it off)
N = 120              # points per outline when morphing
GROUND = 38          # y of the ground surface (physical units, see below)
HX, HY = 20, 20      # black hole centre (physical units)

# "Physical" units: x = 1 per character column, y = 2 per character row,
# because a terminal character is about twice as tall as it is wide.

rng = random.Random()

# ----------------------------------------------------------------- palettes
ICE = [17, 18, 24, 25, 31, 38, 45, 51, 87, 123, 159, 195, 231]
FIRE = [52, 88, 124, 160, 196, 202, 208, 214, 220, 226, 229, 231]
VIOLET = [53, 54, 55, 56, 92, 93, 99, 135, 141, 177, 183, 219]
STEEL = [236, 239, 242, 245, 248, 251, 254, 231]
WOOD = [58, 94, 130, 136, 172, 178]
DUST = [235, 238, 241, 244, 247]
WHITE = [238, 244, 250, 255, 231]
HEAT = [231, 229, 226, 220, 214, 208, 202, 196, 160, 124, 88, 53]
MAGENTA = [53, 90, 127, 163, 199, 205, 213]
RAMP = '.:-=+*#%@'


def clamp(t):
    return max(0.0, min(1.0, t))


def smooth(t):
    t = clamp(t)
    return t * t * (3 - 2 * t)


def ease_in(t):
    t = clamp(t)
    return t * t


def ease_out(t):
    t = clamp(t)
    return 1 - (1 - t) * (1 - t)


def pick(pal, t):
    return pal[int(clamp(t) * (len(pal) - 1) + 0.5)]


def line_char(dx, dy):
    ang = abs(math.degrees(math.atan2(dy, dx)))
    if ang < 25 or ang > 155:
        return '-'
    if 65 < ang < 115:
        return '|'
    return '/' if dx * dy < 0 else '\\'


# ------------------------------------------------------------------- canvas
class Canvas:
    def __init__(self):
        self.g = [[' '] * W for _ in range(H)]
        self.k = [[252] * W for _ in range(H)]
        self.pen = 252

    def put(self, col, row, ch, color=None):
        if 0 <= col < W and 0 <= row < H:
            self.g[row][col] = ch
            self.k[row][col] = self.pen if color is None else color

    def putp(self, px, py, ch, color=None):
        self.put(int(math.floor(px)), int(math.floor(py / 2.0)), ch, color)

    def linep(self, a, b, ch=None, color=None):
        dx, dy = b[0] - a[0], b[1] - a[1]
        d = max(abs(dx), abs(dy) / 2.0)
        steps = int(d * 2) + 1
        if ch is None:
            ch = line_char(dx, dy)
        for i in range(steps + 1):
            t = i / float(steps)
            self.putp(a[0] + dx * t, a[1] + dy * t, ch, color)

    def text(self, col, row, s, color=None):
        for i, ch in enumerate(s):
            self.put(col + i, row, ch, color)


def render(g, k, caption, ccolor):
    out = []
    for r in range(H):
        if not COLOR:
            out.append(''.join(g[r]))
            continue
        parts = []
        cur = -1
        for ch, cc in zip(g[r], k[r]):
            if ch == ' ':
                parts.append(' ')
                continue
            if cc != cur:
                parts.append('\033[38;5;%dm' % cc)
                cur = cc
            parts.append(ch)
        parts.append('\033[0m')
        out.append(''.join(parts))
    cap = caption.center(W)
    out.append(('\033[1;38;5;%dm%s\033[0m' % (ccolor, cap)) if COLOR else cap)
    return out


class World:
    """Sparks, rings, stars, caption, camera shake and screen flash."""

    def __init__(self):
        self.sparks = []
        self.rings = []
        self.shake = 0
        self.flash = 0.0
        self.caption = ''
        self.ccolor = 51
        self.t = 0
        self.stars = [[rng.uniform(0, W), rng.uniform(0, 2 * H),
                       rng.uniform(0.3, 1.0), rng.uniform(0, 6.28)]
                      for _ in range(70)]

    def canvas(self):
        return Canvas()

    # --- effects -------------------------------------------------------
    def emit(self, px, py, n, speed, chars='*+.', life=10,
             spread=2 * math.pi, base=0.0, pal=FIRE, grav=0.0):
        for _ in range(n):
            a = base + rng.uniform(-spread / 2, spread / 2)
            s = speed * rng.uniform(0.4, 1.0)
            lf = max(2, int(life * rng.uniform(0.6, 1.0)))
            self.sparks.append([px, py, math.cos(a) * s, math.sin(a) * s,
                                lf, lf, chars, pal, grav])

    def pull(self, px, py, tx, ty, life, chars, pal):
        self.sparks.append([px, py, (tx - px) / life, (ty - py) / life,
                            life, life, chars, pal, 0.0])

    def ring(self, cx, cy, r0, dr, life, ch='o', pal=WHITE, flat=1.0,
             upper=False):
        self.rings.append([cx, cy, r0, dr, life, life, ch, pal, flat, upper])

    def draw_stars(self, c, warp=0.0):
        for s in self.stars:
            x, y, d, ph = s
            if warp > 0:
                dx, dy = x - HX, (y - HY)
                r = math.hypot(dx, dy)
                if r < 3.0:
                    a = rng.uniform(0, 6.283)
                    rr = rng.uniform(26, 44)
                    s[0], s[1] = HX + rr * math.cos(a), HY + rr * math.sin(a)
                    continue
                f = 1 - 0.022 * warp * (1 + 14.0 / r)
                a = 0.03 * warp * (12.0 / (r + 4))
                ca, sa = math.cos(a), math.sin(a)
                s[0] = HX + (dx * ca - dy * sa) * f
                s[1] = HY + (dx * sa + dy * ca) * f
                x, y = s[0], s[1]
                c.putp(x + dx * 0.05, y + dy * 0.05, '.', 238)
            else:
                s[0] -= 0.03 * d
                if s[0] < 0:
                    s[0] += W
                x = s[0]
            tw = 0.5 + 0.5 * math.sin(self.t * 0.2 + ph)
            ch = '.' if tw < 0.45 else ('+' if tw < 0.85 else '*')
            c.putp(x, y, ch, pick(WHITE, d * (0.35 + 0.65 * tw) * 0.8))

    def bolt(self, c, a, b, color):
        pts = [a]
        n = 6
        for i in range(1, n):
            t = i / float(n)
            pts.append((a[0] + (b[0] - a[0]) * t + rng.uniform(-2.2, 2.2),
                        a[1] + (b[1] - a[1]) * t + rng.uniform(-3.0, 3.0)))
        pts.append(b)
        for i in range(len(pts) - 1):
            c.linep(pts[i], pts[i + 1], None, color)

    def finish(self, c):
        self.t += 1
        # rings
        keep = []
        for r in self.rings:
            cx, cy, rad, dr, life, maxl, ch, pal, flat, upper = r
            n = int(rad * 2.6) + 8
            col = pick(pal, life / float(maxl))
            for q in range(n):
                th = (math.pi + math.pi * q / n) if upper else (2 * math.pi * q / n)
                c.putp(cx + rad * math.cos(th), cy + rad * math.sin(th) * flat, ch, col)
            r[2] += dr
            r[4] -= 1
            if r[4] > 0:
                keep.append(r)
        self.rings = keep
        # sparks
        alive = []
        for s in self.sparks:
            px, py, vx, vy, life, maxl, chars, pal, grav = s
            k = int((1 - life / float(maxl)) * (len(chars) - 0.001))
            c.putp(px, py, chars[min(k, len(chars) - 1)], pick(pal, life / float(maxl)))
            s[0] += vx
            s[1] += vy
            s[3] += grav
            s[4] -= 1
            if s[4] > 0:
                alive.append(s)
        self.sparks = alive

        g, k = c.g, c.k
        if self.shake > 0:
            sx = rng.randint(-self.shake, self.shake)
            sy = rng.randint(-1, 1) if self.shake > 1 else 0
            ng = [[' '] * W for _ in range(H)]
            nk = [[252] * W for _ in range(H)]
            for r in range(H):
                for col in range(W):
                    rr, cc = r + sy, col + sx
                    if 0 <= rr < H and 0 <= cc < W:
                        ng[rr][cc] = g[r][col]
                        nk[rr][cc] = k[r][col]
            g, k = ng, nk
        if self.flash > 0.05:
            for r in range(H):
                for col in range(W):
                    if rng.random() < self.flash:
                        g[r][col] = '@' if self.flash > 0.6 else '#'
                        k[r][col] = 231
            self.flash *= 0.45
        return render(g, k, self.caption, self.ccolor)


# ------------------------------------------------------------------- shapes
def resample(poly, n=N):
    """Evenly spaced points along a closed polygon."""
    m = len(poly)
    seg = []
    total = 0.0
    for i in range(m):
        a, b = poly[i], poly[(i + 1) % m]
        d = math.hypot(b[0] - a[0], b[1] - a[1])
        seg.append(d)
        total += d
    out = []
    kk = 0
    acc = 0.0
    for i in range(n):
        t = total * i / n
        while acc + seg[kk] < t and kk < m - 1:
            acc += seg[kk]
            kk += 1
        a, b = poly[kk], poly[(kk + 1) % m]
        f = (t - acc) / seg[kk] if seg[kk] else 0.0
        out.append((a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f))
    return out


def circle_pts(r, cx=20.0, cy=22.0, n=N):
    return [(cx + r * math.cos(-math.pi / 2 + 2 * math.pi * i / n),
             cy + r * math.sin(-math.pi / 2 + 2 * math.pi * i / n))
            for i in range(n)]


def lerp_pts(a, b, t):
    return [(p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t)
            for p, q in zip(a, b)]


def xform(pts, cx, cy, ang=0.0, dx=0.0, dy=0.0, s=1.0):
    ca, sa = math.cos(ang), math.sin(ang)
    out = []
    for x, y in pts:
        rx, ry = (x - cx) * s, (y - cy) * s
        out.append((cx + rx * ca - ry * sa + dx, cy + rx * sa + ry * ca + dy))
    return out


def draw_poly(c, pts, fill=None, shade=None, edge=None, ecolor=None):
    """fill = a character, shade = f(x, y) -> (char, colour)."""
    n = len(pts)
    if fill or shade:
        for r in range(H):
            y = 2 * r + 1
            xs = []
            for i in range(n):
                x1, y1 = pts[i]
                x2, y2 = pts[(i + 1) % n]
                if (y1 <= y < y2) or (y2 <= y < y1):
                    xs.append(x1 + (y - y1) * (x2 - x1) / (y2 - y1))
            xs.sort()
            for j in range(0, len(xs) - 1, 2):
                a = int(math.ceil(xs[j] - 0.5))
                b = int(math.floor(xs[j + 1] - 0.5))
                for col in range(a, b + 1):
                    if shade:
                        ch, cl = shade(col + 0.5, y)
                        c.put(col, r, ch, cl)
                    else:
                        c.put(col, r, fill)
    if edge != '':
        for i in range(n):
            c.linep(pts[i], pts[(i + 1) % n], edge, ecolor)


def ghost(c, pts, color):
    for i in range(0, len(pts), 3):
        c.putp(pts[i][0], pts[i][1], '.', color)


def sphere_shader(cx, cy, R, pal, light=(-0.45, -0.55, 0.7)):
    def f(x, y):
        nx, ny = (x - cx) / R, (y - cy) / R
        z = math.sqrt(max(0.0, 1 - nx * nx - ny * ny))
        b = clamp(0.12 + 0.88 * max(0.0, nx * light[0] + ny * light[1] + z * light[2]))
        return RAMP[int(b * (len(RAMP) - 1))], pick(pal, b)
    return f


def blade_shader(phase):
    def f(x, y):
        t = 1 - abs(x - 20) / 6.0
        gl = max(0.0, 1 - abs((x * 0.9 + y * 0.35) - phase) / 3.0)
        b = clamp(0.22 + 0.45 * t + 0.7 * gl)
        return RAMP[int(b * (len(RAMP) - 1))], pick(STEEL, b)
    return f


def gun_shader(phase):
    def f(x, y):
        if y > 22 and x < 22:                        # grip
            b = clamp(0.25 + 0.4 * (1 - (x - 8) / 12.0))
            return RAMP[int(b * 5)], pick(WOOD, b)
        gl = max(0.0, 1 - abs((x * 0.8 + y * 0.3) - phase) / 3.0)
        b = clamp(0.25 + 0.4 * (1 - (y - 10) / 14.0) + 0.7 * gl)
        return RAMP[int(b * (len(RAMP) - 1))], pick(STEEL, b)
    return f


def mace_shader(hx, hy):
    sph = sphere_shader(hx, hy, 9.5, [52, 88, 124, 160, 196, 203, 210, 217])
    steel = sphere_shader(hx, hy, 9.5, STEEL)

    def f(x, y):
        d = math.hypot(x - hx, y - hy)
        if d <= 9.2:
            ch, cl = steel(x, y)
            return ch, cl
        return ':', pick(WOOD, 0.3 + 0.5 * ((x * 1.7) % 1.0))
    return f


CIRCLE = circle_pts(10)

BLADE = resample([
    (20, 2), (24, 10), (24, 28), (31, 28), (31, 32), (24, 32), (24, 38),
    (16, 38), (16, 32), (9, 32), (9, 28), (16, 28), (16, 10)])

GUN = resample([
    (2, 12), (7, 12), (8, 10), (11, 10), (12, 12), (25, 12), (26, 10),
    (28, 10), (28, 21), (21, 21), (19, 36), (8, 36), (10, 21), (2, 21)])

BULLET_REL = [(-3, -2), (1, -2), (4, 0), (1, 2), (-3, 2)]


def bullet_pts(cx, cy):
    return resample([(cx + x, cy + y) for x, y in BULLET_REL])


def _mace_poly():
    pts = []
    for i in range(16):
        a = -math.pi / 2 + i * math.pi / 8
        r = 8 if i % 2 == 0 else 5.5
        if i == 8:               # bottom spike is replaced by the handle
            pts.append((22, 38))
            pts.append((18, 38))
            continue
        pts.append((20 + r * math.cos(a), 20 + r * math.sin(a)))
    return pts


MACE = resample(_mace_poly())
MACE_C = (20, 25)


class Ground:
    ROWC = {19: 137, 20: 94, 21: 58}

    def __init__(self):
        r = random.Random(3)
        self.ch = {}
        self.solid = set()
        for row in (19, 20, 21):
            for col in range(W):
                if row == 19:
                    ch = r.choice('=====#')
                elif row == 20:
                    ch = r.choice('#%#%.')
                else:
                    ch = r.choice('%#%@')
                self.ch[(col, row)] = ch
                self.solid.add((col, row))

    def color(self, col, row, q=0.0):
        base = self.ROWC[row] + (col * 7 % 3 == 0)
        if q <= 0:
            return base
        return pick(VIOLET, q)

    def draw(self, c, reveal=1.0):
        for (col, row) in self.solid:
            if abs(col + 0.5 - 20) <= reveal * 20.5:
                c.put(col, row, self.ch[(col, row)], self.color(col, row))


def make_cracks():
    paths = []
    for i in range(8):
        x, y = 20, 19
        dirx = -1 if i % 2 == 0 else 1
        path = [(x, y)]
        for _ in range(26):
            r = rng.random()
            if r < 0.5:
                x += dirx
            elif r < 0.78:
                y += 1
            else:
                x += dirx
                y += 1
            y = min(y, 21)
            if not 0 <= x < W:
                break
            path.append((x, y))
        paths.append(path)
    return paths


# ----------------------------------------------------------- black hole fx
DISK_CH = '@#%*+=-:.'


def draw_rings_in(c, s, t):
    rv = 5.5 * s
    if s > 0.25:
        for j in range(4):
            R = 40 - ((t * 1.2 + j * 10) % 40)
            if R < rv + 4:
                continue
            n = int(R * 1.5)
            col = pick(VIOLET, 0.25 + 0.5 * (1 - R / 40.0))
            for kk in range(n):
                th = 2 * math.pi * kk / n + t * 0.02 * j
                c.putp(HX + R * math.cos(th), HY + R * math.sin(th), '.', col)


def draw_hole_core(c, s, t):
    rv = 5.5 * s
    if s <= 0.02:
        return
    span = 11.5

    def disk(front):
        a = rv + 3.0
        top = rv + 3.0 + span * s
        while a < top:
            n = int(a * 6)
            idx = (a - rv - 3.0) / span
            for kk in range(n):
                th = 2 * math.pi * kk / n + t * 0.5 * (10.0 / (a + 2))
                sn = math.sin(th)
                if (sn >= 0) != front:
                    continue
                cs = math.cos(th)
                heat = clamp(idx + (-0.12 if cs < 0 else 0.12))   # doppler glow
                ch = DISK_CH[int(clamp(heat) * (len(DISK_CH) - 1))]
                c.putp(HX + a * cs, HY + a * 0.28 * sn + a * cs * 0.12, ch,
                       pick(HEAT, heat))
            a += 1.3

    for kk in range(40):                    # light bent around the hole
        th = math.pi + math.pi * kk / 39.0
        c.putp(HX + (rv + 4) * math.cos(th), HY + (rv + 4) * math.sin(th), ':', 214)
        th2 = math.pi * kk / 39.0
        c.putp(HX + (rv + 3) * math.cos(th2), HY + (rv + 3) * math.sin(th2) * 0.9, '.', 208)

    disk(False)
    for row in range(H):
        for col in range(W):
            d = math.hypot(col + 0.5 - HX, 2 * row + 1 - HY)
            if d < rv:
                c.g[row][col] = ' '
            elif d < rv + 2:
                c.g[row][col] = '@'
                c.k[row][col] = 231 if d < rv + 1 else 229
    disk(True)

    if s > 0.8:                             # relativistic jets
        top = int((HY - rv - 4) / 2)
        for row in range(0, top):
            if rng.random() < 0.8:
                col = pick(ICE, 0.3 + 0.7 * row / max(1, top))
                c.put(20, row, '|' if rng.random() < 0.7 else ':', col)
        for row in range(int((HY + rv + 4) / 2) + 1, H):
            if rng.random() < 0.8:
                c.put(20, row, '|' if rng.random() < 0.7 else ':',
                      pick(ICE, 0.3 + 0.7 * (H - row) / float(H - top)))


def dark_char(r):
    if r > 25:
        return '.'
    if r > 15:
        return ':'
    if r > 9:
        return '+'
    if r > 5:
        return '*'
    return '@'


# ------------------------------------------------------------------ timeline
def frames():
    w = World()
    ground = Ground()

    # 0 --- title card -------------------------------------------------------
    w.caption = ''
    lines = [('W E A P O N', 8), ('M O R P H', 11)]
    for f in range(40):
        c = w.canvas()
        w.draw_stars(c)
        for text, row in lines:
            col0 = (W - len(text)) // 2
            for i, ch in enumerate(text):
                if ch == ' ':
                    continue
                reveal = (f - i * 1.2 - (6 if row > 8 else 0))
                if reveal < 0:
                    continue
                if reveal < 4:
                    ch = rng.choice('#%@*+=:;<>/\\')
                    cl = 238
                else:
                    cl = pick(ICE if row < 10 else FIRE,
                              0.5 + 0.5 * math.sin(f * 0.25 + i * 0.6))
                c.put(col0 + i, row, ch, cl)
        if f > 14:
            n = int((f - 14) / 20.0 * 28)
            c.text((W - 28) // 2, 14, '=' * min(28, n), 245)
        if f > 22:
            c.text((W - 21) // 2, 16, 'an ASCII animation', 246)
        yield w.finish(c)

    # 1 --- the orb ---------------------------------------------------------
    w.caption = 'THE ORB'
    for f in range(48):
        c = w.canvas()
        w.draw_stars(c)
        grow = smooth(f / 16.0)
        r = 2 + 8 * grow + 0.6 * math.sin(f * 0.5) * grow
        if f < 18:
            for _ in range(3):
                a = rng.uniform(0, 6.283)
                rr = rng.uniform(16, 24)
                w.pull(20 + rr * math.cos(a), 22 + rr * math.sin(a) * 0.9,
                       20, 22, 8, '*+.', ICE)
        a_r = r + 5

        def ring(front):
            for kk in range(60):
                th = 2 * math.pi * kk / 60 + f * 0.2
                if (math.sin(th) >= 0) != front:
                    continue
                x, y = a_r * math.cos(th), a_r * 0.3 * math.sin(th)
                ca, sa = math.cos(-0.35), math.sin(-0.35)
                c.putp(20 + x * ca - y * sa, 22 + x * sa + y * ca, 'o' if front else '.',
                       pick(MAGENTA, 0.5 + 0.5 * math.sin(th * 2 + f * 0.3)))
        if grow > 0.5:
            ring(False)
        draw_poly(c, circle_pts(r), shade=sphere_shader(20, 22, r + 0.5, ICE),
                  ecolor=159)
        if grow > 0.5:
            ring(True)
        yield w.finish(c)

    # 2 --- orb stretches into a blade --------------------------------------
    w.caption = 'IT STRETCHES INTO A BLADE'
    trail = []
    for f in range(60):
        c = w.canvas()
        w.draw_stars(c)
        p = smooth(f / 34.0)
        pts = lerp_pts(CIRCLE, BLADE, p)
        if f < 34:
            j = 0.9 * math.sin(math.pi * p)
            pts = xform(pts, 20, 22, 0, rng.uniform(-j, j), rng.uniform(-j, j))
            trail.append(pts)
            trail = trail[-4:]
            for i, tp in enumerate(trail[:-1]):
                ghost(c, tp, [17, 18, 24][i % 3])
        phase = 4 + 40 * ((f - 34) / 22.0) if f >= 34 else -99
        draw_poly(c, pts, shade=blade_shader(phase), ecolor=159)
        if f == 34:
            w.flash = 0.7
            w.ring(20, 22, 4, 1.8, 14, '*', WHITE)
            w.emit(20, 22, 22, 1.8, '*+.', 12, pal=ICE)
        yield w.finish(c)

    # 3 --- blade becomes a gun -----------------------------------------------
    w.caption = 'THE BLADE BECOMES A GUN'
    trail = []
    for f in range(54):
        c = w.canvas()
        w.draw_stars(c)
        p = smooth(f / 32.0)
        pts = lerp_pts(BLADE, GUN, p)
        if f < 32:
            j = 0.9 * math.sin(math.pi * p)
            pts = xform(pts, 14, 23, 0, rng.uniform(-j, j), rng.uniform(-j, j))
            trail.append(pts)
            trail = trail[-4:]
            for i, tp in enumerate(trail[:-1]):
                ghost(c, tp, [236, 239, 242][i % 3])
        phase = 2 + 34 * ((f - 32) / 20.0) if f >= 32 else -99
        draw_poly(c, pts, shade=gun_shader(phase), ecolor=250)
        if f >= 32:
            for x in (3, 4, 5):                       # slide serrations
                c.linep((x, 13), (x, 19), '|', 240)
            c.linep((14, 14), (24, 14), ':', 244)
            c.putp(27.5, 16, 'o', 231)
            c.putp(16.5, 26, 'o', 208)                # trigger
        if f == 32:
            w.flash = 0.7
            w.ring(14, 23, 4, 1.8, 14, '*', WHITE)
            w.emit(14, 23, 22, 1.8, '*+.', 12, pal=FIRE)
        yield w.finish(c)

    # 4 --- the gun shoots a bullet -------------------------------------------
    w.caption = 'BANG!'
    for f in range(58):
        c = w.canvas()
        w.draw_stars(c)
        recoil = -3.0 * max(0.0, 1 - f / 6.0)
        s = 1 - smooth((f - 16) / 18.0)
        if s > 0.05:
            pts = xform(GUN, 15, 23, 0, recoil, 0, s)
            draw_poly(c, pts, shade=gun_shader(-99), ecolor=250)
            if s > 0.95:
                for x in (3, 4, 5):
                    c.linep((x + recoil, 13), (x + recoil, 19), '|', 240)
                c.linep((14 + recoil, 14), (24 + recoil, 14), ':', 244)
            elif f % 2 == 0:
                w.emit(15 + (GUN[0][0] - 15) * s, 23, 1, 1.0, '*+.', 8, pal=ICE)
        if f == 0:
            w.flash = 0.8
            w.shake = 2
            w.emit(29, 16, 22, 2.2, '*+.', 9, spread=1.8, base=0.0, pal=FIRE)
            w.emit(14, 11, 1, 1.0, '-', 24, spread=0.4, base=-2.2,
                   pal=[94, 136, 178], grav=0.12)           # ejected shell
        if f == 5:
            w.shake = 0
        if f < 5:
            c.text(29, 8, '@*', 231)
            c.text(29, 7, '\\|/', 226)
            c.text(29, 9, '/|\\', 226)
        if 1 <= f < 24:
            w.emit(30, 16, 1, 0.5, '.:', 14, spread=1.0, base=-1.2, pal=DUST)
        if f >= 1:
            t = min(1.0, f / 22.0)
            bx = 30 + 6.5 * (1 - (1 - t) ** 3)          # bullet-time slow down
            by = 16.0
            if f >= 22:
                by = 16 + math.sin((f - 22) * 0.7) * 1.2
            if f < 22:
                x = 29.0
                while x < bx - 4:
                    c.putp(x, by, '=', pick(FIRE, 0.3 + 0.7 * (x - 29) / 8.0))
                    x += 1.5
                if f % 3 == 1:
                    w.ring(bx - 1, by, 1, 1.4, 5, '(', WHITE, flat=1.4)
            draw_poly(c, bullet_pts(bx, by), shade=lambda x, y: ('#', 226),
                      ecolor=231)
            if f >= 24:
                w.emit(bx + 3, by, 1, 0.8, '+.', 7, pal=FIRE)
                if f % 4 == 0:
                    a = rng.uniform(0, 6.283)
                    w.pull(bx + 8 * math.cos(a), by + 9 * math.sin(a), bx, by,
                           6, '*+.', FIRE)
        yield w.finish(c)

    # 5 --- the bullet becomes a mace -------------------------------------------
    w.caption = 'THE BULLET BECOMES A MACE'
    start = bullet_pts(36, 16)
    for f in range(52):
        c = w.canvas()
        w.draw_stars(c)
        p = smooth(f / 32.0)
        pts = lerp_pts(start, MACE, p)
        if f < 32:
            j = 0.8 * math.sin(math.pi * p)
            pts = xform(pts, 20, 25, 0, rng.uniform(-j, j), rng.uniform(-j, j))
        ground.draw(c, p)
        hx, hy = 36 + (20 - 36) * p, 16 + (20 - 16) * p
        draw_poly(c, pts, shade=mace_shader(hx, hy), ecolor=250)
        if f == 32:
            w.flash = 0.6
            w.ring(20, 20, 4, 1.8, 12, '*', WHITE)
            w.emit(20, 20, 24, 1.8, '*+.', 12, pal=FIRE)
        yield w.finish(c)

    # 6 --- the mace smashes down --------------------------------------------------
    w.caption = 'SMASH!'
    poses = []
    for i in range(12):                      # wind up
        t = ease_out(i / 11.0)
        poses.append((math.radians(-25) * t, -8 * t))
    for i in range(12):                      # flip over
        t = ease_in(i / 11.0)
        poses.append((math.radians(-25 + 205 * t), -8.0))
    for i in range(6):                       # slam
        t = (i + 1) / 6.0
        poses.append((math.pi, -8 * (1 - ease_in(t))))
    hist = []
    for i, (ang, dy) in enumerate(poses):
        c = w.canvas()
        w.draw_stars(c)
        ground.draw(c)
        pts = xform(MACE, MACE_C[0], MACE_C[1], ang, 0, dy)
        hx, hy = xform([(20, 20)], MACE_C[0], MACE_C[1], ang, 0, dy)[0]
        for hp, col in zip(hist[-3:], (236, 240, 244)):
            ghost(c, hp, col)                                   # motion blur
        hist.append(pts)
        draw_poly(c, pts, shade=mace_shader(hx, hy), ecolor=250)
        if 12 <= i < 24:
            w.emit(hx, hy, 1, 0.3, '.', 6, pal=WHITE)
        if i == len(poses) - 1:
            w.flash = 1.0
            w.shake = 3
            w.ring(20, GROUND - 1, 3, 3.0, 14, '~', WHITE, flat=0.45, upper=True)
            w.ring(20, GROUND - 1, 1, 2.0, 14, '-', FIRE, flat=0.45, upper=True)
            w.emit(20, GROUND, 40, 2.6, '*+#.', 14, spread=math.pi,
                   base=-math.pi / 2, pal=FIRE, grav=0.1)
            w.emit(20, GROUND, 40, 1.8, '.:', 16, spread=math.pi,
                   base=-math.pi / 2, pal=DUST, grav=0.05)
        yield w.finish(c)

    # 7 --- the ground cracks ----------------------------------------------------------
    w.caption = 'THE GROUND CRACKS'
    cracks = make_cracks()
    lava = set()
    final = xform(MACE, MACE_C[0], MACE_C[1], math.pi, 0, 0)
    for f in range(32):
        c = w.canvas()
        w.draw_stars(c)
        w.shake = 3 if f < 5 else (2 if f < 12 else (1 if f < 18 else 0))
        k = clamp((f + 1) / 16.0)
        for path in cracks:
            for cell in path[:int(len(path) * k) + 1]:
                ground.solid.discard(cell)
                lava.add(cell)
        ground.draw(c)
        for (col, row) in lava:                        # glowing cracks
            c.put(col, row, rng.choice('*#%'), pick(FIRE, rng.uniform(0.4, 1.0)))
            if row == 19 and rng.random() < 0.25:
                for up in range(1, rng.randint(2, 4)):
                    c.put(col, 19 - up, rng.choice('|:'), pick(FIRE, 0.7 - up * 0.2))
        s = 1 - smooth((f - 8) / 12.0)
        if s > 0.03:
            sph = xform(final, 20, GROUND, 0, 0, 0, s)
            draw_poly(c, sph, shade=mace_shader(20, GROUND - 8 * s), ecolor=250)
        if 8 <= f < 20:
            w.emit(20, 30, 2, 1.2, '*+.', 8, pal=FIRE)
        if f == 3:
            w.ring(20, GROUND - 1, 4, 2.6, 12, '~', FIRE, flat=0.45, upper=True)
        yield w.finish(c)

    # 8 --- the ground breaks into pieces ----------------------------------------------
    cells = [(col, row, ground.ch[(col, row)]) for (col, row) in ground.solid]
    seeds = [(2 + i * 3.4 + rng.uniform(-1, 1), rng.uniform(19, 22))
             for i in range(12)]
    groups = [[] for _ in seeds]
    for col, row, ch in cells:
        best = min(range(len(seeds)),
                   key=lambda i: (col - seeds[i][0]) ** 2
                   + 0.3 * (2 * (row - seeds[i][1])) ** 2)
        groups[best].append((col, row, ch))
    pieces = []
    for g in groups:
        if not g:
            continue
        mx = sum(a for a, _, _ in g) / float(len(g))
        my = sum(b for _, b, _ in g) / float(len(g))
        vy = -(0.9 + rng.random() * 0.5) * max(0.4, 1.2 - abs(mx - 20) / 25.0)
        vx = (mx - 20) * 0.03 + rng.uniform(-0.1, 0.1)
        cl = [[a - mx, b - my, ch, rng.uniform(-0.18, 0.18),
               rng.uniform(-0.12, 0.12), ground.color(a, b)]
              for a, b, ch in g]
        pieces.append([mx, my, vx, vy, cl])
    dark = '#%@*+:.'
    for f in range(36):
        c = w.canvas()
        w.draw_stars(c)
        w.shake = 3 if f < 4 else (1 if f < 8 else 0)
        w.caption = 'THE GROUND SHATTERS' if f < 18 else 'INTO DARK ENERGY'
        q = f / 35.0
        for (col, row) in lava:                       # embers in the void
            if rng.random() < 0.3 and f < 14:
                c.put(col, row, '*', pick(FIRE, rng.uniform(0.2, 0.8)))
        for pc in pieces:
            pc[0] += pc[2]
            pc[1] += pc[3]
            pc[2] *= 0.94
            pc[3] *= 0.9
            for cell in pc[4]:
                if f >= 14:
                    cell[0] += cell[3]
                    cell[1] += cell[4]
                ch = cell[2]
                col = cell[5]
                if q > 0.25:
                    idx = int((q - 0.25) / 0.75 * (len(dark) - 1)
                              + rng.uniform(-0.6, 0.6))
                    ch = dark[max(0, min(idx, len(dark) - 1))]
                    col = pick(VIOLET, (q - 0.25) / 0.75 * 0.9 + rng.uniform(0, 0.1))
                c.put(int(round(pc[0] + cell[0])), int(round(pc[1] + cell[1])), ch, col)
        if f >= 12 and rng.random() < 0.6:            # dark lightning
            a, b = rng.sample(pieces, 2)
            w.bolt(c, (a[0], a[1] * 2), (b[0], b[1] * 2), pick(VIOLET, rng.uniform(0.6, 1)))
        if f == 0:
            w.emit(20, GROUND, 30, 2.4, '*+.', 10, spread=math.pi,
                   base=-math.pi / 2, pal=FIRE)
        yield w.finish(c)

    # 9 --- dark energy spirals into a black hole -----------------------------------------
    parts = []
    for pc in pieces:
        for cell in pc[4]:
            px = pc[0] + cell[0] + 0.5
            py = (pc[1] + cell[1]) * 2 + 1
            ddx, ddy = px - HX, py - HY
            parts.append([math.hypot(ddx, ddy), math.atan2(ddy, ddx),
                          rng.uniform(0.935, 0.965)])
    w.caption = 'DARK ENERGY GATHERS'
    total = 96
    for f in range(total):
        c = w.canvas()
        s = smooth((f - 10) / 64.0)
        ramp = smooth(f / 12.0)
        flat = 1 - 0.5 * s
        w.draw_stars(c, warp=ramp * (0.4 + 1.6 * s))
        w.shake = 1 if (s > 0.5 and f % 3 == 0) else 0
        if f < 50 and f % 2 == 0:
            for _ in range(3):
                parts.append([rng.uniform(26, 38), rng.uniform(0, 2 * math.pi),
                              rng.uniform(0.94, 0.965)])
        if f == 18:
            w.caption = 'A BLACK HOLE FORMS'
        draw_rings_in(c, s, f)
        keep = []
        for p in parts:
            r, th, kk = p
            r *= 1 - (1 - kk) * ramp
            th += 4.5 / (r + 8.0) * ramp
            p[0], p[1] = r, th
            if r < max(5.5 * s, 2.0) + 0.8:
                continue
            c.putp(HX + r * math.cos(th), HY + r * math.sin(th) * flat,
                   dark_char(r), pick(VIOLET, 1.0 - r / 40.0 + 0.15))
            keep.append(p)
        parts = keep
        draw_hole_core(c, s, f)
        yield w.finish(c)

    # 10 --- the finished black hole ------------------------------------------------------
    w.caption = 'BLACK HOLE'
    for f in range(60):
        c = w.canvas()
        w.draw_stars(c, warp=1.6)
        draw_rings_in(c, 1.0, total + f)
        draw_hole_core(c, 1.0, total + f)
        if f > 30:
            w.caption = '~ THE END ~'
            w.ccolor = 226
        if f == 0:
            w.flash = 0.5
        yield w.finish(c)


# --------------------------------------------------------------------- player
def main():
    global COLOR
    print('ASCII WEAPON MORPH v2')
    print('ENTER = colour | n = no colour | 2 = scroll mode | 3 = "clear" mode')
    try:
        mode = input('> ').strip().lower()
    except EOFError:
        mode = ''
    if 'n' in mode:
        COLOR = False
    out = sys.stdout
    try:
        if '2' not in mode and '3' not in mode:
            out.write('\033[2J\033[H')
        while True:
            nxt = time.time()
            for lines in frames():
                text = '\n'.join(lines)
                if '2' in mode:
                    out.write('\n' * 30 + text + '\n')
                elif '3' in mode:
                    os.system('cls' if os.name == 'nt' else 'clear')
                    out.write(text + '\n')
                else:
                    out.write('\033[H' + text + '\n')
                out.flush()
                nxt += DELAY
                time.sleep(max(0.0, nxt - time.time()))
            if not LOOP:
                break
        out.write('\033[0m\n')
    except KeyboardInterrupt:
        out.write('\033[0m\n')


if __name__ == '__main__':
    main()
