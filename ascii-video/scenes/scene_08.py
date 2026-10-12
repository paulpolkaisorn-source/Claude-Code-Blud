import numpy as np
import engine as E

DURATION = 14.0
TAG = "Made with 95 characters."
EVENTS = [(4.0, "whoosh"), (8.0, "chime")] + [(9.2 + i / 15.0, "click") for i in range(len(TAG)) if TAG[i] != " "]

R, C = E.ROWS, E.COLS
YY, XX = np.mgrid[0:R, 0:C].astype(np.float32)
H1 = E.hash2(XX.astype(int), YY.astype(int), 8)
H2 = E.hash2(XX.astype(int), YY.astype(int), 81)
L1 = E.big_text("EVERYTHING IS A PICTURE", 6)
L2 = E.big_text("IF YOU SQUINT", 6)
TAGB = E.big_text(TAG, 5)
TITLE = E.big_text("ASCII ART", 9)
GRAD = [E.rgb("0B3D1C"), E.rgb("1E9A44"), E.rgb("33FF66"), E.rgb("D8FFE4")]


def plasma(t):
    x, y = XX / 24.0, YY / 12.0
    v = (np.sin(x + t * 0.5) + np.sin(y * 1.3 - t * 0.4) + np.sin((x + y) * 0.7 + t * 0.3)
         + np.sin(np.hypot(x - 5 + np.sin(t * 0.2) * 2, (y - 2.8) * 1.6) * 1.2 - t * 0.6))
    l = np.clip((v + 4) / 8, 0, 1)
    return np.clip((l - 0.3) * 2.0, 0, 1) ** 0.8


def gradient(l):
    pos = np.clip(l, 0, 1) * (len(GRAD) - 1)
    i = np.minimum(pos.astype(int), len(GRAD) - 2)
    f = (pos - i)[..., None]
    G = np.array(GRAD, np.float32)
    return (G[i] * (1 - f) + G[i + 1] * f).astype(np.uint8)


def draw_big(g, lines, y, t_scan, color, fade=None):
    """Left-to-right scan reveal of centred block lines."""
    yy = y
    for ln in lines:
        w = len(ln)
        x0 = (C - w) // 2
        n = int(E.clamp01(t_scan) * (w + 6))
        for j, row in enumerate(ln):
            pass
        yy += 0
    return


def big_block(g, rows, x0, y0, reveal, color, dissolve=0.0):
    w = len(rows[0])
    edge = reveal * (w + 8)
    for j, row in enumerate(rows):
        a = np.frombuffer(row.encode(), np.uint8)
        xs = np.arange(w)
        on = (a == 35) & (xs < edge)
        if dissolve > 0:
            on &= H1[(y0 + j) % R, (x0 + xs) % C] > dissolve
        d = edge - xs  # distance behind scan head
        for x in xs[on]:
            col = color
            ch = "#"
            if d[x] < 6:
                col = E.mix(color, E.WHITE, 1 - d[x] / 6.0)
                ch = "%@#*+="[int(max(0, d[x]))] if d[x] < 6 else "#"
            g.set(x0 + int(x), y0 + j, ch, col)
    if 0 < reveal < 1:
        for j in range(len(rows)):
            g.set(x0 + int(edge), y0 + j, "|", E.WHITE)


def render(g, t):
    g.clear(E.BLACK, E.GREEN)
    fade = E.prog(t, 12.0, 1.9)
    FADE = lambda c: E.mix(c, E.BLACK, E.ease_in_out(fade))

    # ---- beat 1+2: plasma field dissolving
    if t < 6.2:
        l = plasma(t)
        p = E.ease_in_out(E.prog(t, 4.0, 1.9))
        intro = E.ease_out(E.prog(t, 0.0, 0.8))
        keep = (H1 > p * 1.05 - 0.05 + 0.0) | (p == 0)
        # sort towards sparse: density shrinks as p grows
        ll = l * (1 - 0.75 * p) * (0.4 + 0.6 * intro)
        ll = np.where(H2 < p * 0.9, ll * 0.3, ll)
        ll = np.where(keep, ll, 0)
        # fixed-ramp ordering of characters: slight drift row shift
        col = gradient(ll * 1.25)
        g.image(ll, 0, 0, color=col)
        # dim empty cells' colour irrelevant

    # ---- ramp line
    if 4.9 <= t < 7.0:
        s = " .:-=+*#%@"
        line = "  ".join(s[1:]) 
        line = "[ " + line + " ]"
        a = E.prog(t, 4.9, 0.8)
        b = E.prog(t, 6.3, 0.7)
        n = int(len(line) * E.ease_out(a))
        x0 = (C - len(line)) // 2
        for i in range(n):
            if E.hash2(i, 3, 5) < b: continue
            c = line[i]
            k = (s.find(c) / 9.0) if c in s else 0.3
            g.set(x0 + i, 33, c, E.mix(E.DIM, E.WHITE, max(0.2, k)) if c not in "[]" else E.DIM)

    # ---- beat: EVERYTHING IS A PICTURE
    if 6.3 <= t < 8.3:
        rev = E.prog(t, 6.5, 1.1)
        dis = E.prog(t, 7.7, 0.5)
        big_block(g, L1, (C - len(L1[0])) // 2, 20, rev, E.WHITE, dis)
        big_block(g, L2, (C - len(L2[0])) // 2, 30, E.prog(t, 6.9, 1.0), E.GREEN, dis)

    # ---- beat: title + tagline + cursor
    if t >= 8.0:
        rev = E.prog(t, 8.0, 1.2)
        x0 = (C - len(TITLE[0])) // 2
        big_block(g, TITLE, x0, 22, rev, FADE(E.WHITE) if fade > 0 else E.WHITE)
        # re-tint with fade handled below
        frac = E.clamp01((t - 9.2) / (len(TAG) / 15.0))
        tw = len(TAGB[0]); tx = (C - tw) // 2
        nshow = int(frac * tw)
        for j, row in enumerate(TAGB):
            for i in range(min(nshow, tw)):
                if row[i] == "#":
                    g.set(tx + i, 38 + j, "#", E.GREEN)
        if t >= 9.0 and E.blink(t, 1.6):
            for j in range(4, 5):
                g.set(tx + nshow, 38 + j, "_", E.GREEN)
                g.set(tx + nshow + 1, 38 + j, "_", E.GREEN)
        # decorative border rules
        if rev > 0:
            n = int(E.ease_out(rev) * 60)
            for i in range(n):
                for sgn in (-1, 1):
                    xx = C // 2 + sgn * i
                    g.set(xx, 19, "-", E.mix(E.DIM, E.GREEN, 1 - i / 60.0))
                    g.set(xx, 33, "-", E.mix(E.DIM, E.GREEN, 1 - i / 60.0))

    # ---- fade to black
    if fade > 0:
        k = E.ease_in_out(fade)
        g.fg[:] = (g.fg.astype(np.float32) * (1 - k) + np.asarray(E.BLACK, np.float32) * k).astype(np.uint8)
        # lone blinking cursor at the end
        if t >= 12.4 and E.blink(t, 1.6) and k < 0.97:
            g.set(C // 2, 42, "_", E.mix(E.GREEN, E.BLACK, k * 0.5))
