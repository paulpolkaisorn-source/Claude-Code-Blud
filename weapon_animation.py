#!/usr/bin/env python3
"""
WEAPON MORPH - ASCII animation (standard library only, made for Pydroid 3)

orb -> blade -> gun -> bullet -> mace -> smash -> broken ground
    -> dark energy -> black hole

Just copy this whole file into Pydroid 3 and press the yellow play button.
If the screen looks garbled, run it again and type 2 at the prompt.
"""
import math
import os
import random
import sys
import time

# ----------------------------------------------------------------- settings
W, H = 40, 22        # screen size in characters (fits a phone in portrait)
DELAY = 0.07         # seconds per frame (lower = faster)
LOOP = False         # True = repeat the animation forever
N = 120              # points per outline when morphing
GROUND = 38          # y of the ground surface (see "physical" units below)
HX, HY = 20, 20      # black hole centre (physical units)

# "Physical" units: x = 1 per character column, y = 2 per character row,
# because a terminal character is about twice as tall as it is wide.
# That keeps circles round and angles correct.

rng = random.Random()


# ------------------------------------------------------------------ helpers
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


def line_char(dx, dy):
    ang = abs(math.degrees(math.atan2(dy, dx)))
    if ang < 25 or ang > 155:
        return '-'
    if 65 < ang < 115:
        return '|'
    return '/' if dx * dy < 0 else '\\'


class Canvas:
    def __init__(self):
        self.g = [[' '] * W for _ in range(H)]

    def put(self, col, row, ch):
        if 0 <= col < W and 0 <= row < H:
            self.g[row][col] = ch

    def putp(self, px, py, ch):
        self.put(int(math.floor(px)), int(math.floor(py / 2.0)), ch)

    def linep(self, a, b, ch=None):
        dx, dy = b[0] - a[0], b[1] - a[1]
        d = max(abs(dx), abs(dy) / 2.0)
        steps = int(d * 2) + 1
        if ch is None:
            ch = line_char(dx, dy)
        for i in range(steps + 1):
            t = i / float(steps)
            self.putp(a[0] + dx * t, a[1] + dy * t, ch)

    def text(self, col, row, s):
        for i, ch in enumerate(s):
            self.put(col + i, row, ch)


class World:
    """Holds sparks, the caption and the screen shake."""

    def __init__(self):
        self.sparks = []
        self.shake = 0
        self.caption = ''

    def canvas(self):
        return Canvas()

    def emit(self, px, py, n, speed, chars='*+.', life=10,
             spread=2 * math.pi, base=0.0):
        for _ in range(n):
            a = base + rng.uniform(-spread / 2, spread / 2)
            s = speed * rng.uniform(0.4, 1.0)
            lf = max(2, int(life * rng.uniform(0.6, 1.0)))
            self.sparks.append([px, py, math.cos(a) * s, math.sin(a) * s,
                                lf, lf, chars])

    def finish(self, c):
        alive = []
        for s in self.sparks:
            px, py, vx, vy, life, maxl, chars = s
            k = int((1 - life / float(maxl)) * (len(chars) - 0.001))
            c.putp(px, py, chars[min(k, len(chars) - 1)])
            s[0] += vx
            s[1] += vy
            s[4] -= 1
            if s[4] > 0:
                alive.append(s)
        self.sparks = alive

        grid = c.g
        if self.shake > 0:
            sx = rng.randint(-self.shake, self.shake)
            sy = rng.randint(-1, 1) if self.shake > 1 else 0
            new = [[' '] * W for _ in range(H)]
            for r in range(H):
                for col in range(W):
                    rr, cc = r + sy, col + sx
                    if 0 <= rr < H and 0 <= cc < W:
                        new[rr][cc] = grid[r][col]
            grid = new
        lines = [''.join(r) for r in grid]
        lines.append(self.caption.center(W))
        return lines


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
    k = 0
    acc = 0.0
    for i in range(n):
        t = total * i / n
        while acc + seg[k] < t and k < m - 1:
            acc += seg[k]
            k += 1
        a, b = poly[k], poly[(k + 1) % m]
        f = (t - acc) / seg[k] if seg[k] else 0.0
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


def draw_poly(c, pts, fill='.', edge=None):
    n = len(pts)
    if fill:
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
                    c.put(col, r, fill)
    for i in range(n):
        c.linep(pts[i], pts[(i + 1) % n], edge)


CIRCLE = circle_pts(10)

BLADE = resample([
    (20, 2), (24, 10), (24, 28), (31, 28), (31, 32), (24, 32), (24, 38),
    (16, 38), (16, 32), (9, 32), (9, 28), (16, 28), (16, 10)])

GUN_C = (14, 23)
GUN = resample([
    (2, 12), (27, 12), (27, 20), (19, 20), (15, 35), (7, 35), (11, 20),
    (2, 20)])

BULLET_REL = [(-3, -2), (1, -2), (4, 0), (1, 2), (-3, 2)]


def bullet_pts(cx, cy):
    return resample([(cx + x, cy + y) for x, y in BULLET_REL])


def _mace_poly():
    pts = []
    for i in range(16):
        a = -math.pi / 2 + i * math.pi / 8
        r = 8 if i % 2 == 0 else 5
        if i == 8:               # bottom spike is replaced by the handle
            pts.append((22, 38))
            pts.append((18, 38))
            continue
        pts.append((20 + r * math.cos(a), 20 + r * math.sin(a)))
    return pts


MACE = resample(_mace_poly())
MACE_C = (20, 25)


class Ground:
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

    def draw(self, c, reveal=1.0):
        for (col, row) in self.solid:
            if abs(col + 0.5 - 20) <= reveal * 20.5:
                c.put(col, row, self.ch[(col, row)])


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


def draw_hole(c, s, t):
    rv = 5.5 * s
    # inflow rings
    if s > 0.25:
        for j in range(4):
            R = 40 - ((t * 1.2 + j * 10) % 40)
            if R < rv + 4:
                continue
            n = int(R * 1.5)
            for k in range(n):
                th = 2 * math.pi * k / n + t * 0.02 * j
                c.putp(HX + R * math.cos(th), HY + R * math.sin(th), '.')
    return rv


def draw_hole_core(c, s, t):
    rv = 5.5 * s
    if s <= 0.02:
        return

    def disk(front):
        a = rv + 3.0
        top = rv + 3.0 + 11.5 * s
        while a < top:
            n = int(a * 6)
            idx = int((a - rv - 3.0) / 11.5 * (len(DISK_CH) - 1) + 0.5)
            ch = DISK_CH[min(idx, len(DISK_CH) - 1)]
            for k in range(n):
                th = 2 * math.pi * k / n + t * 0.5 * (10.0 / (a + 2))
                sn = math.sin(th)
                if (sn >= 0) != front:
                    continue
                px = HX + a * math.cos(th)
                py = HY + a * 0.28 * sn + a * math.cos(th) * 0.12
                c.putp(px, py, ch)
            a += 1.3

    # halo arcs (light bent around the hole)
    for k in range(40):
        th = math.pi + math.pi * k / 39.0
        c.putp(HX + (rv + 4) * math.cos(th), HY + (rv + 4) * math.sin(th), ':')
        th2 = math.pi * k / 39.0
        c.putp(HX + (rv + 3) * math.cos(th2), HY + (rv + 3) * math.sin(th2) * 0.9, '.')

    disk(False)
    for row in range(H):
        for col in range(W):
            d = math.hypot(col + 0.5 - HX, 2 * row + 1 - HY)
            if d < rv:
                c.g[row][col] = ' '
            elif d < rv + 2:
                c.g[row][col] = '@'
    disk(True)


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

    # 1 --- the orb ---------------------------------------------------------
    w.caption = 'THE ORB'
    for f in range(32):
        c = w.canvas()
        grow = smooth(f / 12.0)
        r = 2 + 8 * grow + 0.8 * math.sin(f * 0.6) * grow
        draw_poly(c, circle_pts(r), fill='.')
        draw_poly(c, circle_pts(r * 0.45), fill='o', edge='O')
        for k in range(3):
            a = f * 0.35 + k * 2.094
            rr = r + 2.5
            c.putp(20 + rr * math.cos(a), 22 + rr * math.sin(a), '*')
        yield w.finish(c)

    # 2 --- orb stretches into a blade ----------------------------------------
    w.caption = 'IT STRETCHES INTO A BLADE'
    for f in range(40):
        c = w.canvas()
        p = smooth(f / 26.0)
        pts = lerp_pts(CIRCLE, BLADE, p)
        if f < 26:
            j = 0.9 * math.sin(math.pi * p)
            pts = xform(pts, 20, 22, 0, rng.uniform(-j, j), rng.uniform(-j, j))
        draw_poly(c, pts, fill='.')
        if f == 26:
            w.emit(20, 22, 18, 1.8, '*+.', 10)
        if f >= 26:
            c.linep((20, 9), (20, 27), '|')
            g = (f - 26) / 13.0
            y = 34 - 28 * g
            c.putp(20, y, '*')
            c.putp(18, y, '-')
            c.putp(22, y, '-')
        yield w.finish(c)

    # 3 --- blade becomes a gun ------------------------------------------------
    w.caption = 'THE BLADE BECOMES A GUN'
    for f in range(38):
        c = w.canvas()
        p = smooth(f / 22.0)
        pts = lerp_pts(BLADE, GUN, p)
        if f < 22:
            j = 0.9 * math.sin(math.pi * p)
            pts = xform(pts, 14, 23, 0, rng.uniform(-j, j), rng.uniform(-j, j))
        draw_poly(c, pts, fill='.')
        if f == 22:
            w.emit(14, 23, 18, 1.8, '*+.', 10)
        if f >= 22:
            c.linep((4, 16), (25, 16), '=')
            c.linep((20, 13), (20, 19), '|')
            c.putp(27.5, 16, 'o')
        yield w.finish(c)

    # 4 --- the gun shoots a bullet --------------------------------------------
    w.caption = 'BANG!'
    for f in range(34):
        c = w.canvas()
        recoil = -2.5 * max(0.0, 1 - f / 5.0)
        s = 1 - smooth((f - 12) / 14.0)
        if s > 0.05:
            draw_poly(c, xform(GUN, 14, 23, 0, recoil, 0, s), fill='.')
            if s > 0.95:
                c.linep((4 + recoil, 16), (25 + recoil, 16), '=')
                c.linep((20 + recoil, 13), (20 + recoil, 19), '|')
        if f == 0:
            w.emit(28, 16, 16, 1.8, '*+.', 8, spread=1.6, base=0.0)
        if f < 4:
            c.text(28, 8, '@*')
            c.text(29, 7, '\\|/')
            c.text(29, 9, '/|\\')
        if f >= 1:
            t = min(1.0, f / 14.0)
            bx = 30 + 6 * ease_out(t)
            by = 16.0
            if f >= 14:
                by = 16 + math.sin((f - 14) * 0.8) * 1.2
            if f < 14:
                x = 29.0
                while x < bx - 4:
                    c.putp(x, by, '=')
                    x += 2
            draw_poly(c, bullet_pts(bx, by), fill='#')
            if f >= 16:
                w.emit(bx + 3, by, 1, 0.7, '+.', 6)
        yield w.finish(c)

    # 5 --- the bullet becomes a mace --------------------------------------------
    w.caption = 'THE BULLET BECOMES A MACE'
    start = bullet_pts(36, 16)
    for f in range(38):
        c = w.canvas()
        p = smooth(f / 22.0)
        pts = lerp_pts(start, MACE, p)
        if f < 22:
            j = 0.8 * math.sin(math.pi * p)
            pts = xform(pts, 20, 25, 0, rng.uniform(-j, j), rng.uniform(-j, j))
        ground.draw(c, p)
        draw_poly(c, pts, fill='.')
        if f == 22:
            w.emit(20, 20, 20, 1.8, '*+.', 10)
        if f >= 22:
            c.putp(20, 20, 'O')
        yield w.finish(c)

    # 6 --- the mace smashes down ---------------------------------------------------
    w.caption = 'SMASH!'
    poses = []
    for i in range(10):                      # wind up
        t = ease_out(i / 9.0)
        poses.append((math.radians(-25) * t, -8 * t))
    for i in range(11):                      # flip over
        t = ease_in(i / 10.0)
        poses.append((math.radians(-25 + 205 * t), -8.0))
    for i in range(5):                       # slam
        t = (i + 1) / 5.0
        poses.append((math.pi, -8 * (1 - ease_in(t))))
    for i, (ang, dy) in enumerate(poses):
        c = w.canvas()
        ground.draw(c)
        pts = xform(MACE, MACE_C[0], MACE_C[1], ang, 0, dy)
        draw_poly(c, pts, fill='.')
        head = xform([(20, 20)], MACE_C[0], MACE_C[1], ang, 0, dy)[0]
        c.putp(head[0], head[1], 'O')
        if 10 <= i < 21:
            tail = xform(MACE, MACE_C[0], MACE_C[1], ang - 0.35, 0, dy)
            for q in tail[::6]:
                c.putp(q[0], q[1], '.')
        if i == len(poses) - 1:
            w.shake = 2
            w.emit(20, GROUND, 34, 2.4, '*+#.', 12, spread=math.pi,
                   base=-math.pi / 2)
        yield w.finish(c)

    # 7 --- the ground cracks --------------------------------------------------------
    w.caption = 'THE GROUND CRACKS'
    cracks = make_cracks()
    final = xform(MACE, MACE_C[0], MACE_C[1], math.pi, 0, 0)
    head = xform([(20, 20)], MACE_C[0], MACE_C[1], math.pi, 0, 0)[0]
    for f in range(26):
        c = w.canvas()
        w.shake = 2 if f < 6 else (1 if f < 12 else 0)
        k = clamp((f + 1) / 14.0)
        for path in cracks:
            for (col, row) in path[:int(len(path) * k) + 1]:
                ground.solid.discard((col, row))
        ground.draw(c)
        s = 1 - smooth((f - 8) / 10.0)
        if s > 0.03:
            draw_poly(c, xform(final, 20, GROUND, 0, 0, 0, s), fill='.')
            if s > 0.7:
                c.putp(20, 30, 'O')
        if 8 <= f < 18:
            w.emit(20, 30, 2, 1.2, '*+.', 8)
        R = 3 + f * 2.4
        n = int(R * 2)
        for q in range(n):
            th = math.pi + math.pi * q / n
            px = 20 + R * math.cos(th)
            py = GROUND + R * math.sin(th) * 0.45 - 1
            if f < 18:
                c.putp(px, py, '~')
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
               rng.uniform(-0.12, 0.12)] for a, b, ch in g]
        pieces.append([mx, my, vx, vy, cl])
    dark = '#%@*+:.'
    for f in range(28):
        c = w.canvas()
        w.shake = 2 if f < 4 else 0
        w.caption = 'THE GROUND SHATTERS' if f < 14 else 'INTO DARK ENERGY'
        q = f / 27.0
        for pc in pieces:
            pc[0] += pc[2]
            pc[1] += pc[3]
            pc[2] *= 0.94
            pc[3] *= 0.9
            for cell in pc[4]:
                if f >= 12:
                    cell[0] += cell[3]
                    cell[1] += cell[4]
                ch = cell[2]
                if q > 0.3:
                    idx = int((q - 0.3) / 0.7 * (len(dark) - 1)
                              + rng.uniform(-0.6, 0.6))
                    ch = dark[max(0, min(idx, len(dark) - 1))]
                c.put(int(round(pc[0] + cell[0])), int(round(pc[1] + cell[1])), ch)
        if f == 0:
            w.emit(20, GROUND, 30, 2.4, '*+.', 10, spread=math.pi,
                   base=-math.pi / 2)
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
    total = 84
    for f in range(total):
        c = w.canvas()
        s = smooth((f - 10) / 58.0)
        ramp = smooth(f / 12.0)
        flat = 1 - 0.5 * s
        if f < 46 and f % 2 == 0:
            for _ in range(3):
                parts.append([rng.uniform(26, 38),
                              rng.uniform(0, 2 * math.pi),
                              rng.uniform(0.94, 0.965)])
        if f == 16:
            w.caption = 'A BLACK HOLE FORMS'
        draw_hole(c, s, f)
        keep = []
        for p in parts:
            r, th, k = p
            r *= 1 - (1 - k) * ramp
            th += 4.5 / (r + 8.0) * ramp
            p[0], p[1] = r, th
            if r < max(5.5 * s, 2.0) + 0.8:
                continue
            c.putp(HX + r * math.cos(th), HY + r * math.sin(th) * flat,
                   dark_char(r))
            keep.append(p)
        parts = keep
        draw_hole_core(c, s, f)
        yield w.finish(c)

    # 10 --- the finished black hole ---------------------------------------------------------
    w.caption = 'BLACK HOLE'
    for f in range(40):
        c = w.canvas()
        draw_hole(c, 1.0, total + f)
        draw_hole_core(c, 1.0, total + f)
        yield w.finish(c)


# --------------------------------------------------------------------- player
def main():
    print('ASCII WEAPON MORPH')
    print('ENTER = start  |  2 = scroll mode (if screen looks garbled)')
    print('3 = use "clear" command mode')
    try:
        mode = input('> ').strip()
    except EOFError:
        mode = ''
    out = sys.stdout
    try:
        if mode not in ('2', '3'):
            out.write('\033[2J\033[H')
        while True:
            for lines in frames():
                text = '\n'.join(lines)
                if mode == '2':
                    out.write('\n' * 30 + text + '\n')
                elif mode == '3':
                    os.system('cls' if os.name == 'nt' else 'clear')
                    out.write(text + '\n')
                else:
                    out.write('\033[H' + text + '\n')
                out.flush()
                time.sleep(DELAY)
            if not LOOP:
                break
        out.write('\n   ~ THE END ~\n')
    except KeyboardInterrupt:
        out.write('\n')


if __name__ == '__main__':
    main()
