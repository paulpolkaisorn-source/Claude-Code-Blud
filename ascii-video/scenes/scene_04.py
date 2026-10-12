"""Scene 04 - HOW IT WORKS: THE DENSITY RAMP (18 s)."""
import numpy as np
import engine as E

DURATION = 18.0
LONG = " .'`^\",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$"
RAMPS = [" .:-=+*#%@", " .oO@", " .-+#", "#@"]
CAPS = ["10 levels: soft, photographic shading",
        "5 levels: banded, graphic look",
        "5 levels: shadows lose all ink",
        "2 levels: pure threshold, hard edges"]
SW0, SWP = 5.6, 2.1            # first ramp start, swap period
TYPE_TXT = "Dark pixel -> dense character. Light pixel -> sparse character."
TYPE_T0, TYPE_CPS = 2.4, 24.0

EVENTS = [(0.5, "whoosh")] + [(round(TYPE_T0 + 0.2 * i, 2), "click") for i in range(13)] + \
         [(5.5, "whoosh"), (SW0 + 0.1, "blip")] + [(SW0 + SWP * k, "blip") for k in (1, 2, 3)] + \
         [(14.2, "whoosh"), (15.0, "chime")]

COL_A = np.array([22, 84, 44], float)      # dim green
COL_B = np.array([225, 255, 235], float)   # bright white-green
BGC = np.array([8, 12, 9], np.uint8)
YY, XX = np.mgrid[0:E.ROWS, 0:E.COLS]


def lcol(l):
    l = np.clip(np.asarray(l, float), 0, 1)
    return (COL_A + (COL_B - COL_A) * (0.15 + 0.85 * l)[..., None]).astype(np.uint8)


def ramp_idx(luma, ramp):
    return np.clip((luma * (len(ramp) - 1) + 0.5).astype(int), 0, len(ramp) - 1)


def codes(ramp):
    return np.frombuffer(ramp.encode(), np.uint8)


def blit_arr(h, idx, ramp, x, y, mask=None, color=None):
    """Write ramp chars (idx array) into grid h, optionally masked; space=skipped."""
    ch = codes(ramp)[idx]
    hh, ww = idx.shape
    m = ch != 32
    if mask is not None: m &= mask
    sl = (slice(y, y + hh), slice(x, x + ww))
    sub = h.ch[sl]; sub[m] = ch[m]
    if color is not None:
        f = h.fg[sl]; f[m] = color[m]


def dots(g, t):
    shift = (t * (1.5 + 3.0 * E.hash2(np.arange(E.COLS), 3, 5))).astype(int)
    yy = (YY + shift[None, :]) % E.ROWS
    v = E.hash2(XX, yy, 7) > 0.988
    g.ch[v] = ord('.')
    g.fg[v] = (14, 46, 26)


def layer(g, draw, t, amt, seed):
    """Draw into temp grid then composite with cell-dissolve (amt = fraction hidden)."""
    h = E.Grid(); h.clear(g.bg[0, 0], E.GREEN)
    draw(h, t)
    sel = (h.ch != 32) & (E.hash2(XX, YY, seed) >= amt)
    g.ch[sel] = h.ch[sel]; g.fg[sel] = h.fg[sel]


# ---------------- phase 1 ---------------------------------------------------
def phase1(h, t):
    x0, y0, w, hh = 90, 22, 60, 5
    h.center(15, "- THE DENSITY RAMP -", E.WHITE)
    h.center(17, "turning brightness into characters", E.DIM)
    h.box(x0 - 3, y0 - 2, w + 6, hh + 4, (40, 120, 70))
    X = np.arange(w)[None, :].repeat(hh, 0)
    Y = np.arange(hh)[:, None].repeat(w, 1)
    d = X / (w - 1.0) + 0.025 * np.sin(t * 3 + X * 0.25 + Y * 0.9)
    d = np.clip(d, 0, 1)
    s = E.ease_in_out(E.prog(t, 0.8, 1.6)) * (w + 2)
    quant = (X < s)
    sm = ramp_idx(d, LONG)
    qi = np.clip((np.floor(X / 6.0)).astype(int), 0, 9)   # 10 segments of 6 cols
    ch = np.where(quant, codes(E.RAMP)[qi], codes(LONG)[sm])
    lum = np.where(quant, qi / 9.0, d)
    sl = (slice(y0, y0 + hh), slice(x0, x0 + w))
    h.ch[sl] = ch
    h.fg[sl] = lcol(lum)
    # scan line
    sx = int(s)
    if 0 < s < w + 1:
        for j in range(hh):
            h.set(x0 + min(sx, w - 1), y0 + j, '|', E.WHITE)
    # segment ticks + ramp letters below
    for i in range(10):
        k = E.prog(t, 0.8, 1.6) * (w + 2)
        if i * 6 + 3 < k:
            cx = x0 + i * 6 + 2
            h.put(cx, y0 + hh + 1, "'" , (60, 160, 90))
            h.set(cx + 1, y0 + hh + 1, E.RAMP[i], E.WHITE)
            h.set(cx + 2, y0 + hh + 1, "'", (60, 160, 90))
            h.set(cx + 1, y0 + hh + 2, '^', (60, 160, 90))
    # labels
    ly = y0 + hh + 4
    if t > 2.0:
        a = E.prog(t, 2.0, 0.4)
        h.put(x0, ly, "light", E.mix(E.DIM, E.WHITE, a))
        txt = "dark/dense"
        h.put(x0 + w - len(txt), ly, txt, E.mix(E.DIM, E.WHITE, a))
        mid = w - 5 - len(txt) - 2
        n = int(mid * a)
        h.put(x0 + 7, ly, "<" + "-" * max(0, n - 2) + ">" if n > 2 else "", (60, 160, 90))
        h.center(ly + 3, "RAMP = ' .:-=+*#%@'", E.GREEN)
        h.put(x0, ly + 1, "(sparse)", E.DIM); h.put(x0 + w - 7, ly + 1, "(dense)", E.DIM)
    s_ = E.typed(TYPE_TXT, t, TYPE_T0, TYPE_CPS)
    if s_:
        full = len(s_) == len(TYPE_TXT)
        txt = s_ + ("_" if (not full or E.blink(t, 1.5)) else "")
        h.center(ly + 8, txt, E.WHITE)


# ---------------- phase 2 ---------------------------------------------------
SW, SH = 62, 30
SY = 20
def sphere_luma(t):
    a = t * 1.5
    L = np.array([0.9 * np.cos(a), 0.7 * np.sin(a) - 0.15, 0.55])
    L /= np.linalg.norm(L)
    nx = (np.arange(SW)[None, :] + 0.5 - SW / 2) / (SW / 2)
    ny = (np.arange(SH)[:, None] + 0.5 - SH / 2) / (SH / 2)
    r2 = nx * nx + ny * ny
    m = r2 <= 1.0
    nz = np.sqrt(np.clip(1 - r2, 0, 1))
    lam = np.clip(nx * L[0] + ny * L[1] + nz * L[2], 0, 1)
    luma = 0.03 + 0.97 * lam ** 0.85
    return luma, m, L


def label_box(h, cx, y, w, hgt, title, lines, col=(60, 160, 90)):
    h.box(cx - w // 2, y, w, hgt, col)
    h.center_at = None
    h.put(cx - len(title) // 2, y + 1, title, E.WHITE)


def phase2(h, t):
    h.center(3, "SAME SPHERE, SAME LIGHT  -  ONLY THE RAMP CHANGES", E.WHITE)
    k = int(np.clip((t - SW0) // SWP, 0, 3))
    ramp = RAMPS[k]
    since = t - (SW0 + SWP * k)
    luma, m, L = sphere_luma(t)
    cxl, cxr = 60, 180
    # left sphere: full ramp
    il = ramp_idx(luma, LONG)
    blit_arr(h, il, LONG, cxl - SW // 2, SY, m, lcol(il / (len(LONG) - 1.0)))
    # right sphere: active ramp
    ir = ramp_idx(luma, ramp)
    n = len(ramp)
    blit_arr(h, ir, ramp, cxr - SW // 2, SY, m, lcol(ir / max(1, n - 1.0)))
    # faint sphere outline cue + light markers
    for cx in (cxl, cxr):
        mx = int(cx + L[0] * 31 * 1.18); my = int(SY + SH / 2 + L[1] * 15 * 1.18)
        h.set(mx, my, 'O', E.WHITE); h.set(mx - 1, my, '(', E.GREEN); h.set(mx + 1, my, ')', E.GREEN)
    # divider
    for y in range(6, 60, 2): h.set(120, y, ':', (30, 90, 50))
    # titles
    h.put(cxl - 11, 15, "A) PLAIN GREYSCALE", E.GREEN)
    h.put(cxr - 14, 15, "B) QUANTISED BY THE RAMP", E.GREEN)
    # left box: full ramp
    bw = 42
    h.box(cxl - bw // 2, 7, bw, 6, (60, 160, 90))
    h.put(cxl - 9, 8, f"FULL RAMP  {len(LONG)} levels", E.WHITE)
    half = len(LONG) // 2
    for j, part in enumerate((LONG[:half], LONG[half:])):
        h.put(cxl - len(part) // 2, 9 + j, part, E.mix(E.DIM, E.WHITE, 0.55 + 0.4 * j))
    # right box: active ramp
    bw = 40
    fl = max(0.0, 1 - since / 0.5)
    bc = E.mix((60, 160, 90), E.WHITE, fl)
    h.box(cxr - bw // 2, 7, bw, 6, bc)
    h.put(cxr - 11, 8, f"ACTIVE RAMP  {n} levels", E.mix(E.WHITE, E.AMBER, fl))
    rs = "'" + ramp + "'"
    x = cxr - len(rs) * 2 // 2
    h.set(x, 10, "'", E.DIM)
    for i, c in enumerate(ramp):
        col = E.mix(lcol(i / max(1, n - 1.0)), E.WHITE, fl)
        h.set(x + 2 + 2 * i, 10, c if c != ' ' else '_', col)
    h.set(x + 2 + 2 * n, 10, "'", E.DIM)
    h.put(cxr - 10, 11, "light" + " " * 10 + "dark", E.DIM)
    # connectors
    for cx in (cxl, cxr):
        for j, y in enumerate((13, 14)):
            h.set(cx, y, 'v' if (int(t * 6) + j) % 2 == 0 else ':', E.GREEN)
    # captions
    h.center_at = None
    h.put(cxl - 14, 55, "smooth luma: reads as a photo", E.DIM)
    cap = CAPS[k]
    h.put(cxr - len(cap) // 2, 55, cap, E.mix(E.GREEN, E.WHITE, fl))
    # level pips
    for i in range(4):
        h.put(cxr - 10 + i * 6, 58, "[" + ("#" if i == k else " ") + "]", E.WHITE if i == k else E.DIM)


# ---------------- phase 3 ---------------------------------------------------
BIG = E.big_text("LUMINANCE -> CHARACTER", 6)

def arrow_row(h, t, y, x0, w, direction, col):
    i = np.arange(w)
    shift = int(t * 22)
    mm = ((i - shift) % 14) if direction > 0 else ((i + shift) % 14)
    for xi in range(w):
        m = mm[xi]
        if direction > 0:
            c = '>' if m == 13 else ('=' if m >= 9 else '-')
            lum = 1.0 if m == 13 else (0.2 + 0.06 * m)
        else:
            c = '<' if m == 0 else ('=' if m <= 4 else '-')
            lum = 1.0 if m == 0 else (0.2 + 0.06 * (13 - m))
        h.set(x0 + xi, y, c, E.mix(col, E.WHITE, lum if lum > 0.9 else lum * 0.5))


def phase3(h, t):
    bw = len(BIG[0])
    bx = (E.COLS - bw) // 2
    by = 30
    p = E.ease_out(E.prog(t, 14.3, 1.0))
    w = 200
    arrow_row(h, t, 22, 20, w, +1, (30, 150, 80))
    arrow_row(h, t, 40, 20, w, -1, (30, 150, 80))
    h.center(24, "light pixel", E.DIM) if False else None
    for j, ln in enumerate(BIG):
        for i, c in enumerate(ln):
            if c != ' ' and i < p * bw:
                sh = 0.5 + 0.5 * np.sin(i * 0.12 - t * 4 + j * 0.3)
                h.set(bx + i, by + j, c, lcol(0.45 + 0.55 * sh))
    # wave ramp bar
    ww = 200
    Xa = np.arange(ww)[None, :].repeat(4, 0)
    Ya = np.arange(4)[:, None].repeat(ww, 1)
    lum = 0.5 + 0.5 * np.sin(Xa * 0.09 - t * 3.5 + Ya * 0.7)
    lum = lum * E.ease_out(E.prog(t, 14.6, 0.8))
    idx = ramp_idx(lum, E.RAMP)
    blit_arr(h, idx, E.RAMP, 20, 46, None, lcol(idx / 9.0))
    # ramp readout with moving highlight
    a = int(t * 6) % 10
    s = "light  "
    x = (E.COLS - 40) // 2
    h.put(x, 52, "light", E.DIM)
    for i, c in enumerate(E.RAMP):
        h.set(x + 8 + 3 * i, 52, c if c != ' ' else '_', E.WHITE if i == a else (50, 140, 80))
    h.put(x + 8 + 30 + 1, 52, "dark", E.DIM)
    h.center(56, "brightness in  ->  glyph out", E.GREEN)


def render(g, t):
    g.clear(BGC, E.GREEN)
    dots(g, t)
    # phase 1: 0 .. 5.6 (dissolve out 5.0-5.6)
    if t < 6.1:
        amt = E.prog(t, 5.5, 0.5)
        layer(g, phase1, t, amt, 11)
    if 5.4 < t < 14.7:
        amt = max(1 - E.prog(t, 5.4, 0.6), E.prog(t, 14.1, 0.6))
        layer(g, phase2, t, amt, 23)
    if t > 14.2:
        amt = 1 - E.prog(t, 14.2, 0.5)
        layer(g, phase3, t, amt, 37)
