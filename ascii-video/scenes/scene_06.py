import functools
import numpy as np
import engine as E

DURATION = 18.0
BG = E.rgb("07090C")
FRAME = E.rgb("1F3A46")
SEG = [0.0, 4.0, 8.0, 12.0, 16.5, 18.0]
TRANS = 0.5
TITLES = ["LINE ART", "SHADED", "BLOCK / BANNER", "ANIMATED"]
CAPS = ["STRAIGHT LINES ONLY", "LIGHT TO DARK GLYPHS", "BIG LETTERS FROM #", "MOTION IN EVERY FRAME"]
TCOL = [(E.CYAN, E.BLUE), (E.PINK, E.AMBER), (E.AMBER, E.PINK), (E.GREEN, E.CYAN)]
EVENTS = [(0.3, "blip"), (4.0, "whoosh"), (4.35, "blip"), (8.0, "whoosh"), (8.35, "blip"),
          (12.0, "whoosh"), (12.35, "blip"), (16.5, "whoosh"),
          (16.85, "blip"), (17.1, "blip"), (17.35, "blip"), (17.6, "blip")]

XX, YY = np.meshgrid(np.arange(E.COLS), np.arange(E.ROWS))
STARS = E.hash2(XX, YY, 3)


@functools.lru_cache(maxsize=None)
def bt(text, rows):
    return tuple(E.big_text(text, rows))


def pal(stops, u):
    """stops: list of (pos, colour); u: array in [0,1] -> (...,3) uint8"""
    pos = [s[0] for s in stops]
    out = np.stack([np.interp(u, pos, [float(s[1][c]) for s in stops]) for c in range(3)], -1)
    return out.astype(np.uint8)


def hsv(h, s=0.65, v=1.0):
    h = np.asarray(h) % 1.0
    r = np.clip(np.abs(h * 6 - 3) - 1, 0, 1)
    gg = np.clip(2 - np.abs(h * 6 - 2), 0, 1)
    b = np.clip(2 - np.abs(h * 6 - 4), 0, 1)
    rgb = np.stack([r, gg, b], -1)
    return ((1 - s + s * rgb) * v * 255).astype(np.uint8)


def new_layer(t):
    g = E.Grid()
    g.clear(BG, E.DIM)
    tw = (np.sin(t * 2.0 + STARS * 40) * 0.5 + 0.5)
    m = STARS > 0.985
    g.ch[m] = ord(".")
    g.fg[m] = (np.array([60, 90, 100]) * (0.3 + 0.7 * tw[m])[:, None]).astype(np.uint8)
    return g


def draw_big(g, rows_txt, x, y, c0, c1, reveal=1.0, phase=0.0):
    w = max(len(r) for r in rows_txt)
    n = int(w * reveal)
    for j, ln in enumerate(rows_txt):
        for i, ch in enumerate(ln):
            if ch != " " and i < n:
                k = (i / max(1, w - 1) + 0.15 * np.sin(phase + j * 0.5))
                g.set(x + i, y + j, ch, E.mix(c0, c1, k))
    # bright head
    if reveal < 1.0:
        for j in range(len(rows_txt)):
            g.set(x + n, y + j, "#", E.WHITE) if n < w and rows_txt[j][n:n + 1] == "#" else None


def title_caption(g, i, tl):
    tt = bt(TITLES[i], 5)
    w = len(tt[0])
    draw_big(g, tt, (E.COLS - w) // 2, 4, TCOL[i][0], TCOL[i][1], E.ease_out(E.prog(tl, 0.15, 0.6)), tl * 3)
    cc = bt(CAPS[i], 5)
    w2 = len(cc[0])
    draw_big(g, cc, (E.COLS - w2) // 2, 59, E.WHITE, TCOL[i][0], E.prog(tl, 0.9, 1.4), tl * 2)


# ---------------------------------------------------------------- panel 1: cat
CAT = [
    "      /\\                 /\\",
    "     /  \\_______________/  \\",
    "    /                       \\",
    "   |    .---.       .---.    |",
    "   |    | E |       | E |    |",
    "   |    '---'   ^   '---'    |",
    " --|            ( )          |--",
    " --|         \\__ v __/       |--",
    "   |        ____________     |",
    "    \\                       /",
    "     \\_____________________/",
    "        /                 \\",
    "       /                   \\___",
    "      (_____|_____|_____)___)~~",
]
YARN = [
    "   ____   ",
    "  /,-.-\\  ",
    " ( ( X ) ) ",
    "  \\`-'-/  ",
    "   `~~'   ",
]


def panel_cat(g, tl):
    x0 = (E.COLS - 33) // 2 - 6
    y0 = 24
    blink_eye = (int(tl * 2.0) % 5 == 4) and (tl * 2.0 % 1.0 < 0.25)
    pup = 1 if int(tl * 1.3) % 2 else -1
    for j, ln in enumerate(CAT):
        shown = int(max(0, (tl - 0.5 - j * 0.14)) * 45)
        for i, ch in enumerate(ln[:shown]):
            if ch == " ":
                continue
            k = j / (len(CAT) - 1)
            col = E.mix(E.CYAN, E.PINK, k)
            if ch == "E":
                ch = "-" if blink_eye else "@"
                col = E.AMBER
            elif ch == "^" or ch == "v":
                col = E.PINK
            elif ch in "-" and (i < 4 or i > 28) and j in (6, 7):
                col = E.AMBER
            g.set(x0 + i, y0 + j, ch, col)
    if tl > 2.4:
        # wagging whiskers sparks and floor
        n = int(E.prog(tl, 2.4, 0.8) * 46)
        g.put(x0 - 6, y0 + 14, ("=" * 46)[:n], E.DIM)
        for k in range(5):
            xx = x0 + 34 + int(4 * k + 2 * np.sin(tl * 3 + k))
            g.set(xx, y0 - 1 - (k % 2) * 2 + int(np.sin(tl * 2 + k * 2)), "*", E.AMBER if k % 2 else E.WHITE)
        g.put(x0 + 40, y0 + 8, "".join(YARN[0]), E.PINK)
        for j, ln in enumerate(YARN):
            g.put(x0 + 40, y0 + 9 + j, ln, E.mix(E.PINK, E.AMBER, j / 4), transparent_space=True)
        # trailing thread
        for i in range(18):
            g.set(x0 + 39 - i, y0 + 13 + int(np.sin(i * 0.7 + tl * 4)), "~", E.mix(E.PINK, E.DIM, i / 18))
        if int(tl * 2) % 2 == 0:
            g.put(x0 + 12, y0 - 2, "z", E.DIM)
    # outline pointer


# ---------------------------------------------------------------- panel 2: sphere
def panel_sphere(g, tl):
    h, w = 44, 92
    y0, x0 = 12, (E.COLS - w) // 2
    ys = (np.arange(h) - h / 2 + 0.5) / (h / 2)
    xs = (np.arange(w) - w / 2 + 0.5) / (w / 2)
    X, Y = np.meshgrid(xs, ys)
    r2 = X * X + Y * Y
    inside = r2 < 1.0
    Z = np.sqrt(np.clip(1 - r2, 0, 1))
    a = tl * 0.9
    # rotate about vertical axis for texture
    xr = X * np.cos(a) + Z * np.sin(a)
    zr = -X * np.sin(a) + Z * np.cos(a)
    lon = np.arctan2(xr, zr)
    lat = np.arcsin(np.clip(-Y, -1, 1))
    tex = ((np.floor(lon * 6 / np.pi) + np.floor(lat * 6 / np.pi)) % 2)
    L = np.array([-0.5 + 0.2 * np.sin(tl), -0.55, 0.65])
    L = L / np.linalg.norm(L)
    diff = np.clip(X * L[0] + Y * L[1] + Z * L[2], 0, 1)
    spec = np.clip(diff, 0, 1) ** 24
    lum = np.clip(0.07 + 0.78 * diff * (0.72 + 0.28 * tex) + 0.5 * spec, 0, 1)
    colr = pal([(0, E.rgb("1A2A6A")), (0.3, E.rgb("5577FF")), (0.55, E.rgb("FF66CC")),
                (0.8, E.rgb("FFB000")), (1, E.rgb("FFFFFF"))], lum)
    rim = np.clip(1 - Z, 0, 1) ** 3
    colr = np.where(tex[..., None] > 0, colr, (colr * 0.8).astype(np.uint8))
    lum = np.where(inside, lum, 0)
    reveal = E.ease_out(E.prog(tl, 0.3, 1.0))
    rr = np.sqrt(r2) <= reveal * 1.0
    img = np.where(rr, lum, 0)
    idx_ok = (img > 0.02)
    sub = E.Grid()
    ramp = " .:-=+*#%@"
    g.image(img, x0, y0, color=colr, ramp=ramp)
    # clear glyph where not inside (image writes ' ' there but preserve stars)
    # ring of orbiting glyphs
    for k in range(40):
        ang = tl * 1.2 + k * 2 * np.pi / 40
        px = int(E.COLS / 2 + 54 * np.cos(ang))
        py = int(34 + 22 * np.sin(ang) * 0.9)
        if np.sin(ang) < 0 or True:
            g.set(px, py, ramp[1 + k % 9], E.mix(E.BLUE, E.PINK, (k % 10) / 10))
    # ramp legend
    if tl > 1.5:
        leg = "RAMP: [" + ramp + "]"
        n = int(E.prog(tl, 1.5, 1.0) * len(leg))
        g.put((E.COLS - len(leg)) // 2, 57, leg[:n], E.DIM)


# ---------------------------------------------------------------- panel 3: banner
def panel_banner(g, tl):
    rows_txt = bt("HELLO", 16)
    w = len(rows_txt[0])
    x0, y0 = (E.COLS - w) // 2, 22
    mask = np.array([[c == "#" for c in r] for r in rows_txt])
    ys, xs = np.nonzero(mask)
    reveal = E.ease_out(E.prog(tl, 0.3, 1.2))
    keep = xs < int(w * reveal) + 1
    ys, xs = ys[keep], xs[keep]
    shift = np.round(2.2 * np.sin(xs * 0.18 - tl * 3.0)).astype(int)
    hue = xs * 0.014 - tl * 0.45
    col = hsv(hue, 0.65, 1.0)
    sweep = (tl * 28) % (w + 40) - 20
    d = np.abs(xs - sweep)
    boost = np.clip(1 - d / 6.0, 0, 1)[:, None]
    col = (col * (1 - boost) + 255 * boost).astype(np.uint8)
    # shadow
    sy, sx = ys + y0 + shift + 1, xs + x0 + 2
    ok = (sy >= 0) & (sy < E.ROWS) & (sx < E.COLS)
    g.ch[sy[ok], sx[ok]] = ord("%")
    g.fg[sy[ok], sx[ok]] = (col[ok] * 0.22).astype(np.uint8)
    py, px = ys + y0 + shift, xs + x0
    g.ch[py, px] = ord("#")
    g.fg[py, px] = col
    # rainbow underline bar and markers
    if tl > 1.6:
        n = int(E.prog(tl, 1.6, 1.0) * (w + 8))
        bx = x0 - 4
        cols = np.arange(n)
        g.ch[44, bx:bx + n] = ord("=")
        g.fg[44, bx:bx + n] = hsv(cols * 0.014 - tl * 0.45, 0.65, 0.8)
        g.put(x0 - 4, 46, "'#' x 5 rows x 5 cols per glyph...", E.DIM) if False else None
    if tl > 2.2:
        s = "each letter is made of # characters"
        g.put((E.COLS - len(s)) // 2, 47, E.typed(s, tl, 2.2, 22), E.DIM)
    # side rainbow rain
    for k in range(10):
        for side in (0, 1):
            xx = 12 + k * 2 if side == 0 else E.COLS - 13 - k * 2
            yy = int((tl * 14 + k * 7 + side * 11) % 40) + 12
            g.set(xx, yy, "#", hsv(k * 0.1 + tl * 0.3))


# ---------------------------------------------------------------- panel 4: donut
RAMP_D = ".,-~:;=!*#$@"
_th = np.arange(0, 2 * np.pi, 2 * np.pi / 100)
_ph = np.arange(0, 2 * np.pi, 2 * np.pi / 100)
TH, PH = np.meshgrid(_th, _ph)
TH, PH = TH.ravel(), PH.ravel()
CTH, STH, CPH, SPH = np.cos(TH), np.sin(TH), np.cos(PH), np.sin(PH)


def panel_donut(g, tl):
    A, B = tl * 1.0, tl * 0.5
    cA, sA, cB, sB = np.cos(A), np.sin(A), np.cos(B), np.sin(B)
    cx_, cy_ = 2 + CTH, STH
    x = cx_ * (cB * CPH + sA * sB * SPH) - cy_ * cA * sB
    y = cx_ * (sB * CPH - sA * cB * SPH) + cy_ * cA * cB
    z = 5 + cA * cx_ * SPH + cy_ * sA
    ooz = 1.0 / z
    xp = (E.COLS // 2 + 62 * ooz * x).astype(int)
    yp = (34 - 33 * ooz * y).astype(int)
    L = CPH * CTH * sB - cA * CTH * SPH - sA * STH + cB * (cA * STH - CTH * sA * SPH)
    ok = (xp >= 0) & (xp < E.COLS) & (yp >= 0) & (yp < E.ROWS)
    xp, yp, ooz, L = xp[ok], yp[ok], ooz[ok], L[ok]
    flat = yp * E.COLS + xp
    zb = np.full(E.ROWS * E.COLS, -1.0)
    np.maximum.at(zb, flat, ooz)
    win = ooz >= zb[flat] - 1e-12
    flat, L = flat[win], L[win]
    li = np.clip((L * 8).astype(int), 0, 11)
    lum = np.full(E.ROWS * E.COLS, -1, int)
    lum[flat] = li
    lum = lum.reshape(E.ROWS, E.COLS)
    m = lum >= 0
    # only below title / above caption
    m[:11] = False
    m[58:] = False
    codes = np.frombuffer(RAMP_D.encode(), np.uint8)[np.clip(lum, 0, 11)]
    g.ch[m] = codes[m]
    u = np.clip(lum / 11.0, 0, 1)
    colr = pal([(0, E.rgb("1D6B3A")), (0.4, E.rgb("33FF66")), (0.75, E.rgb("33DDFF")), (1, E.rgb("FFFFFF"))], u)
    g.fg[m] = colr[m]
    # readout
    g.put(10, 12, "A=%.2f" % (A % 6.2832), E.DIM)
    g.put(10, 13, "B=%.2f" % (B % 6.2832), E.DIM)
    g.put(10, 15, "RAMP", E.DIM)
    g.put(10, 16, RAMP_D, E.GREEN)


# ---------------------------------------------------------------- recap
def recap(g, tl):
    names = [["LINE", "ART"], ["SHADED"], ["BLOCK /", "BANNER"], ["ANIMATED"]]
    colw = 55
    gap = 2
    total = colw * 4 + gap * 3
    x0 = (E.COLS - total) // 2
    for i, nm in enumerate(names):
        k = E.ease_out(E.prog(tl, 0.1 + i * 0.2, 0.45))
        bx = x0 + i * (colw + gap)
        by = 20
        bh = 27
        h = int(bh * k)
        if h > 2:
            c = TCOL[i][0]
            g.box(bx, by + (bh - h) // 2, colw, h, c)
        if k >= 1.0:
            g.center_x = None
            tops = []
            for ln in nm:
                tops.append(bt(ln, 4))
            tot = len(tops) * 4 + (len(tops) - 1)
            yy = by + (bh - tot) // 2
            for tp in tops:
                ww = len(tp[0])
                draw_big(g, tp, bx + (colw - ww) // 2, yy, TCOL[i][0], TCOL[i][1], 1.0, tl * 3)
                yy += 5
            g.put(bx + 3, by + 2, "%d/4" % (i + 1), TCOL[i][0])
            sh = (tl * 14 + i * 9) % (colw - 4)
            g.set(bx + 2 + int(sh), by, "#", E.WHITE)
            g.set(bx + colw - 3 - int(sh), by + bh - 1, "#", E.WHITE)
    s = "ONE IDEA - MANY STYLES"
    if tl > 1.6:
        g.center(52, E.typed(s, tl, 1.6, 14), E.DIM)


def content(i, t):
    g = new_layer(t)
    tl = t - SEG[i]
    if i < 4:
        title_caption(g, i, tl)
        [panel_cat, panel_sphere, panel_banner, panel_donut][i](g, tl)
    else:
        recap(g, tl)
    return g


def render(g, t):
    seg = max(i for i in range(5) if t >= SEG[i])
    tl = t - SEG[seg]
    cur = content(seg, t)
    if seg > 0 and tl < TRANS:
        prev = content(seg - 1, t - 0.0 if False else min(t, SEG[seg] - 0.01) + 0.0)
        k = tl / TRANS
        sel = E.hash2(XX, YY, 11) < k
        # use previous panel frozen-ish (still animating slightly) then new
        g.ch[:] = np.where(sel, cur.ch, prev.ch)
        g.fg[:] = np.where(sel[..., None], cur.fg, prev.fg)
        g.bg[:] = BG
        # glitch fringe
        edge = (np.abs(E.hash2(XX, YY, 11) - k) < 0.03)
        g.ch[edge] = 35
        g.fg[edge] = E.WHITE
    else:
        g.ch[:], g.fg[:], g.bg[:] = cur.ch, cur.fg, cur.bg
    # frame
    g.box(2, 1, E.COLS - 4, E.ROWS - 2, FRAME)
    p = 2 * (E.COLS - 4) + 2 * (E.ROWS - 2)
    for q in range(6):
        s = int((t * 40 + q * 2) % p)
        W_, H_ = E.COLS - 4, E.ROWS - 2
        if s < W_:
            xx, yy = 2 + s, 1
        elif s < W_ + H_:
            xx, yy = 2 + W_ - 1, 1 + s - W_
        elif s < 2 * W_ + H_:
            xx, yy = 2 + W_ - 1 - (s - W_ - H_), 1 + H_ - 1
        else:
            xx, yy = 2, 1 + H_ - 1 - (s - 2 * W_ - H_)
        g.set(xx, yy, "#" if q == 5 else "+", E.mix(E.CYAN, FRAME, (5 - q) / 5.0))
