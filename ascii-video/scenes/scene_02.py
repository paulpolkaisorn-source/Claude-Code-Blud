import numpy as np
import engine as E

DURATION = 14.0

BG = E.rgb("0A0F1A")
PANEL = E.rgb("0D1526")
C_DEEP = np.array([16, 62, 104], float)
C_CYAN = np.array([51, 221, 255], float)
C_WHITE = np.array([245, 252, 255], float)
FRAME = E.rgb("2A5C7C")

# face panel geometry (cells)
FW, FH = 80, 40
FX, FY = 8, 13

# right column
RX = 128
HEAD = "IMAGES MADE OF TEXT"
BODY = "ASCII art draws pictures using only letters, numbers and symbols placed on a grid."
LAST = "Every dot you see is a character."
BODY_T0, BODY_CPS = 2.6, 14.0
LAST_T0, LAST_CPS = 10.3, 14.0
BODY_W = 74

LEVELS = [(0.0, 8, 4), (1.3, 5, 2), (2.6, 4, 2), (4.0, 2, 1), (5.4, 1, 1)]
MAG_T0 = 6.4

_HL = E.big_text("IMAGES MADE", 6)
_HL2 = E.big_text("OF TEXT", 6)

def _events():
    ev = [(0.35, "whoosh")]
    for t0, b, r in LEVELS[1:]:
        ev.append((t0, "blip"))
    ev.append((5.4, "chime"))
    ev.append((MAG_T0, "whoosh"))
    pos = 0
    for w in BODY.split():
        ev.append((BODY_T0 + pos / BODY_CPS, "click"))
        pos += len(w) + 1
    pos = 0
    for w in LAST.split():
        ev.append((LAST_T0 + pos / LAST_CPS, "click"))
        pos += len(w) + 1
    ev.append((LAST_T0 + len(LAST) / LAST_CPS + 0.1, "chime"))
    for k in range(6):
        ev.append((0.5 + k * 0.28, "click"))
    return sorted(ev)

EVENTS = _events()

_yy, _xx = np.mgrid[0:FH, 0:FW]
_U = ((_xx + 0.5) * 8.0 - 320.0) / 320.0
_V = ((_yy + 0.5) * 16.0 - 320.0) / 320.0

def _clip(a, lo=0.0, hi=1.0):
    return np.clip(a, lo, hi)

def face_luma(t):
    breathe = 0.012 * np.sin(t * 1.8)
    turn = np.sin(t * 0.7) * 0.8 + 0.2 * np.sin(t * 1.9)
    Z = 0.76
    u = _U * Z
    v = _V * Z * (1.0 - breathe) + 0.02
    hx = 0.05 * turn
    fx = hx + 0.075 * turn

    def G(u0, v0, su, sv):
        return np.exp(-((u - u0) / su) ** 2 - ((v - v0) / sv) ** 2)

    # head
    d = ((u - hx) / 0.5) ** 2 + ((v + 0.08) / 0.66) ** 2
    mh = _clip((1 - d) / 0.1)
    shade = (0.5 + 0.34 * G(hx - 0.18, -0.25, 0.35, 0.35) + 0.12 * G(hx + 0.22, 0.15, 0.2, 0.2)
             + 0.16 * G(hx + 0.5, -0.05, 0.12, 0.5))
    shade = shade * (1 - 0.5 * _clip(d) ** 2.5)
    face = mh * shade

    # hair
    dh = ((u - hx) / 0.58) ** 2 + ((v + 0.12) / 0.78) ** 2
    hline = -0.40 + 1.0 * (u - hx) ** 2
    hm = _clip((1 - dh) / 0.08) * _clip((hline - v) / 0.05)
    hair = 0.30 + 0.12 * np.sin(u * 44 + v * 9 + hx * 10) + 0.28 * G(hx - 0.2, -0.56, 0.28, 0.1)
    L = face * (1 - hm) + hair * hm

    # neck + shoulders
    neck = _clip((0.19 - np.abs(u - hx * 0.5)) / 0.03) * _clip((v - 0.4) / 0.05)
    neck = neck * (0.34 - 0.2 * G(hx, 0.55, 0.22, 0.1) + 0.06 * G(hx - 0.1, 0.8, 0.15, 0.2))
    sh = _clip((v - (0.80 + 1.1 * u ** 2)) / 0.05) * (0.36 + 0.14 * G(-0.4, 0.9, 0.4, 0.15))
    L = np.maximum(L, np.maximum(neck, sh))

    # features
    f = np.zeros_like(L)
    ph = (t % 4.2)
    bl = 1.0 - 0.9 * np.exp(-((ph - 3.6) / 0.07) ** 2)
    for s in (-1, 1):
        ex, ev = fx + s * 0.2, -0.10
        f += -0.34 * G(ex, ev, 0.16, 0.09)
        f += 0.75 * G(ex, ev, 0.1, 0.05 * bl)
        f += -1.3 * G(ex + 0.025 * turn, ev, 0.045, 0.05 * bl)
        f += 0.6 * G(ex - 0.012, ev - 0.012, 0.01, 0.01) * bl
        f += -0.5 * G(ex, ev - 0.12 + s * 0.012 * np.sin(t * 0.9), 0.13, 0.03)
    f += 0.13 * G(fx, -0.02, 0.03, 0.17)
    f += -0.3 * G(fx + 0.09, 0.12, 0.05, 0.08)
    f += 0.25 * G(fx, 0.10, 0.04, 0.03)
    for s in (-1, 1):
        f += -0.6 * G(fx + s * 0.06, 0.15, 0.03, 0.03)
    vm = 0.31 - 1.4 * (u - fx) ** 2
    f += -1.0 * np.exp(-((v - vm) / 0.024) ** 2) * _clip((0.17 - np.abs(u - fx)) / 0.04)
    f += 0.22 * G(fx, 0.375, 0.1, 0.025)
    f += 0.1 * G(fx, 0.335, 0.12, 0.03)
    f += -0.15 * G(fx, 0.45, 0.12, 0.04)
    L = L + mh * (1 - hm) * f
    L = _clip(L)
    # scan shimmer
    L = _clip(L + 0.04 * np.sin(t * 2.2 - _yy * 0.35) * (L > 0.05))
    return L

def grad(k):
    k = np.asarray(k, float)[..., None]
    lo = C_DEEP + (C_CYAN - C_DEEP) * (k * 2)
    hi = C_CYAN + (C_WHITE - C_CYAN) * (k * 2 - 1)
    return np.clip(np.where(k < 0.5, lo, hi), 0, 255).astype(np.uint8)

def level_at(t):
    cur = LEVELS[0]
    for lv in LEVELS:
        if t >= lv[0]:
            cur = lv
    return cur

def pixelate(L, b, r):
    if b == 1 and r == 1:
        return L
    h, w = L.shape
    c = L.reshape(h // r, r, w // b, b).mean(axis=(1, 3))
    return np.repeat(np.repeat(c, r, 0), b, 1)

def stars(g, t):
    X, Y = np.meshgrid(np.arange(E.COLS), np.arange(E.ROWS))
    sh = int(t * 2.5)
    h = E.hash2(X, (Y + sh) % E.ROWS, 5)
    m = h > 0.982
    tw = 0.5 + 0.5 * np.sin(t * 2 + h * 60)
    ch = np.where(h > 0.992, ord(":"), ord("."))
    g.ch[m] = ch[m]
    col = (np.array([22, 40, 62], float) * (0.5 + 0.7 * tw[..., None])).astype(np.uint8)
    g.fg[m] = col[m]

def blit_np(g, lines, x, y, colors, reveal):
    """lines of block letters; colors(cols_idx,row_idx)->(h,w,3); only first `reveal` columns shown."""
    h = len(lines); w = max(len(l) for l in lines)
    arr = np.array([[ord(c) for c in l.ljust(w)] for l in lines], np.uint8)
    reveal = int(min(w, max(0, reveal)))
    if reveal <= 0:
        return
    arr = arr[:, :reveal]
    m = arr != 32
    sub = (slice(y, y + h), slice(x, x + reveal))
    g.ch[sub] = np.where(m, arr, g.ch[sub])
    col = colors[:, :reveal]
    g.fg[sub] = np.where(m[..., None], col, g.fg[sub])

def line_pts(x0, y0, x1, y1):
    n = int(max(abs(x1 - x0), abs(y1 - y0)))
    if n == 0:
        return [(x0, y0)]
    return [(int(round(x0 + (x1 - x0) * i / n)), int(round(y0 + (y1 - y0) * i / n))) for i in range(n + 1)]

def render(g, t):
    g.clear(BG, E.CYAN)
    stars(g, t)

    # ---------------- left: portrait panel ----------------
    g.ch[FY - 2:FY + FH + 2, FX - 2:FX + FW + 2] = 32
    g.bg[FY - 1:FY + FH + 1, FX - 1:FX + FW + 1] = PANEL
    appear = E.prog(t, 0.0, 0.5)
    fcol = E.mix(BG, FRAME, appear)
    g.box(FX - 2, FY - 2, FW + 4, FH + 4, fg=fcol, bg=BG)
    for i in range(0, FW + 4, 8):
        g.set(FX - 2 + i, FY - 2, "+", fg=E.mix(FRAME, E.CYAN, 0.5), bg=BG)
        g.set(FX - 2 + i, FY + FH + 1, "+", fg=E.mix(FRAME, E.CYAN, 0.5), bg=BG)

    t0, b, r = level_at(t)
    L = pixelate(face_luma(t), b, r) * min(1.0, 0.3 + t * 2.0)
    col = grad(L)
    flash = max(0.0, 1.0 - (t - t0) / 0.18) if t0 > 0 else 0.0
    if flash > 0:
        col = np.clip(col.astype(float) * (1 - 0.6 * flash) + 255 * 0.6 * flash, 0, 255).astype(np.uint8)
    g.image(np.clip(L ** 0.9, 0, 1), FX, FY, color=col)

    # labels
    g.put(FX - 2, FY - 5, "FIG. 1", fg=E.CYAN)
    g.put(FX + 6, FY - 5, "// A PORTRAIT, DRAWN WITH CHARACTERS", fg=E.mix(E.CYAN, BG, 0.45))
    resx, resy = FW // b, FH // r
    g.put(FX - 2, FY - 3, "RESOLUTION", fg=E.mix(E.CYAN, BG, 0.5))
    g.put(FX + 9, FY - 3, "%3d x %-3d  CHARACTERS" % (resx, resy), fg=E.WHITE)
    # resolution progress bar
    n_lv = len(LEVELS)
    idx = LEVELS.index((t0, b, r))
    barx = FX + FW - 24
    g.put(barx - 2, FY - 3, "[", fg=FRAME)
    for i in range(n_lv):
        on = i <= idx
        g.put(barx + i * 4, FY - 3, "####" if on else "----", fg=E.CYAN if on else FRAME)
    g.put(barx + n_lv * 4, FY - 3, "]", fg=FRAME)

    # density ramp legend under face
    ly = FY + FH + 3
    g.put(FX - 2, ly, "DENSITY", fg=E.mix(E.CYAN, BG, 0.5))
    ramp = E.RAMP
    sweep = (t * 1.6) % (len(ramp) + 6)
    for i, c in enumerate(ramp):
        k = i / (len(ramp) - 1)
        c_col = grad(np.array(k * 0.9 + 0.1))
        near = max(0.0, 1.0 - abs(i - sweep) / 1.8)
        c_col = E.mix(c_col, E.WHITE, near)
        g.put(FX + 8 + i * 3, ly, c if c != " " else "_", fg=c_col)
    g.put(FX + 8 + len(ramp) * 3 + 1, ly, "<- light to dense", fg=E.mix(E.CYAN, BG, 0.5))

    # ---------------- magnifier ----------------
    if t >= MAG_T0:
        mk = E.ease_out((t - MAG_T0) / 0.7)
        PW, PH = 12, 6
        s = 0.5 + 0.5 * np.sin((t - MAG_T0) * 0.9)
        # sweep from eye (upper) to mouth (lower)
        cx = FX + FW // 2 - 8 + int(round(10 * (1 - s) * 0 + 6 * np.sin((t - MAG_T0) * 0.9) * 0.5)) - 4
        cy = FY + 10 + int(round(14 * s))
        px = int(cx - PW // 2)
        py = int(cy - PH // 2)
        px = max(FX, min(FX + FW - PW, px))
        py = max(FY, min(FY + FH - PH, py))
        mc = E.mix(BG, E.WHITE, mk)
        # inset
        IX, IY = FX + FW + 6, FY + 8
        IW, IH = 2 * PW + 4, 2 * PH + 2
        g.bg[IY:IY + IH, IX:IX + IW] = E.mix(PANEL, E.rgb("12203A"), mk)
        g.ch[IY:IY + IH, IX:IX + IW] = 32
        # patch contents spread out (individual characters)
        pc = g.ch[py:py + PH, px:px + PW].copy()
        pf = g.fg[py:py + PH, px:px + PW].copy()
        # connector (dotted)
        lc = E.mix(BG, E.CYAN, 0.55 * mk)
        for (a, bb) in (((px + PW, py - 1), (IX - 1, IY - 1)), ((px + PW, py + PH), (IX - 1, IY + IH))):
            for (qx, qy) in line_pts(a[0], a[1], bb[0], bb[1])[1:-1:2]:
                if 0 <= qx < E.COLS and 0 <= qy < E.ROWS:
                    g.set(qx, qy, ".", fg=lc)
        # patch box
        g.box(px - 1, py - 1, PW + 2, PH + 2, fg=mc)
        g.box(IX - 1, IY - 1, IW + 2, IH + 2, fg=mc)
        shown = int(mk * PW * PH * 1.0)
        for j in range(PH):
            for i in range(PW):
                if j * PW + i < shown:
                    ch = int(pc[j, i])
                    col_i = np.clip(pf[j, i].astype(float) * 1.15 + 20, 0, 255).astype(np.uint8)
                    g.set(IX + 2 + i * 2, IY + 1 + j * 2, ch if ch != 32 else ord("."), fg=col_i if ch != 32 else E.mix(PANEL, E.CYAN, 0.25))
        # blinking cursor character highlighted in the patch
        hi = int(t * 4) % (PW * PH)
        hj, hi_i = divmod(hi, PW)
        g.set(IX + 2 + hi_i * 2, IY + 1 + hj * 2, int(pc[hj, hi_i]) or 46, fg=E.BLACK, bg=E.WHITE)
        g.set(px + hi_i, py + hj, int(pc[hj, hi_i]), fg=E.BLACK, bg=E.WHITE)
        g.put(IX - 1, IY - 3, "ZOOM x2", fg=E.CYAN)
        g.put(IX - 1, IY + IH + 2, "ONE CHARACTER = ONE DOT", fg=E.mix(E.CYAN, BG, 0.5))
        g.put(IX - 1, IY + IH + 3, "[ %s ]" % chr(int(pc[hj, hi_i]) if pc[hj, hi_i] > 32 else 46), fg=E.WHITE)

    # ---------------- right: headline + typed text ----------------
    g.ch[5:62, RX - 3:E.COLS - 4] = 32
    hy = 8
    reveal = int(E.ease_in_out((t - 0.3) / 1.8) * 108)
    sweep = ((t * 22) % 160) - 20
    for lines, y0, off in ((_HL, hy, 0), (_HL2, hy + 7, 0)):
        h = len(lines); w = max(len(l) for l in lines)
        xs = np.arange(w)[None, :] + np.zeros((h, 1))
        ys = np.arange(h)[:, None] + np.zeros((1, w)) + (0 if y0 == hy else 7)
        k = _clip(0.55 + 0.45 * (1 - ys / 12.0) * 0.8 + 0.5 * np.exp(-((xs + ys * 2 - sweep) / 9.0) ** 2))
        colors = grad(k)
        blit_np(g, lines, RX, y0, colors, reveal if y0 == hy else reveal - 0)
        # bright head at reveal edge
        if 0 < reveal < w and t < 2.4:
            for j in range(h):
                if reveal < w and lines[j][reveal - 1] != " ":
                    g.set(RX + reveal - 1, y0 + j, "#", fg=E.WHITE)
    # underline rule
    ruleW = int(E.ease_out((t - 1.6) / 1.0) * 104)
    g.put(RX, hy + 14, "=" * ruleW, fg=FRAME)
    if ruleW > 0:
        g.set(RX, hy + 14, "+", fg=E.CYAN)
        g.set(RX + ruleW - 1, hy + 14, "+", fg=E.CYAN)

    # body
    by = hy + 17
    if t >= BODY_T0 - 0.3:
        g.put(RX, by - 1, "> DEFINITION", fg=E.mix(E.CYAN, BG, 0.5))
    lines = E.wrap(BODY, BODY_W)
    n = int(max(0.0, t - BODY_T0) * BODY_CPS)
    n = min(n, len(BODY))
    consumed = 0
    cur_pos = None
    for i, ln in enumerate(lines):
        take = max(0, min(len(ln), n - consumed))
        if take:
            cc = E.WHITE
            g.put(RX + 2, by + i * 2, ln[:take], fg=cc)
            # recent glyphs glow cyan
            for q in range(max(0, take - 4), take):
                g.set(RX + 2 + q, by + i * 2, ln[q], fg=E.mix(E.WHITE, E.CYAN, (take - q) / 5.0))
            cur_pos = (RX + 2 + take, by + i * 2)
        consumed += len(ln) + 1
        if n < consumed:
            break
    done_body = n >= len(BODY)
    if cur_pos is not None and (not done_body or t < LAST_T0) and E.blink(t, 2.0):
        g.set(cur_pos[0], cur_pos[1], "_", fg=E.CYAN)

    # density ramp showcase (right)
    sy = by + 7
    if t >= 7.0:
        k = E.ease_out((t - 7.0) / 0.8)
        g.put(RX, sy, "> LETTERS BECOME BRIGHTNESS", fg=E.mix(BG, E.mix(E.CYAN, BG, 0.5), k))
        cw = 10
        for i, c in enumerate(E.RAMP):
            cx0 = RX + 2 + i * cw
            on = max(0.0, 1.0 - abs(i - ((t * 2.0) % (len(E.RAMP) + 2))) / 1.5)
            kk = i / (len(E.RAMP) - 1)
            cc = E.mix(grad(np.array(0.15 + 0.85 * kk)), E.WHITE, on * 0.8)
            cc = E.mix(BG, cc, k)
            glyph = c if c != " " else "_"
            big = E.big_text(glyph if glyph.isalnum() else glyph, 3) if False else None
            # 3x7 swatch of the glyph repeated, density visible as texture
            for jj in range(3):
                g.put(RX + 2 + i * cw, sy + 2 + jj, (glyph if c != " " else " ") * 8, fg=cc)
            g.put(RX + 2 + i * cw + 3, sy + 6, "%d" % i, fg=E.mix(BG, E.mix(E.CYAN, BG, 0.5), k))

    # final beat
    if t >= LAST_T0 - 0.4:
        fy = sy + 11
        kk = E.ease_out((t - (LAST_T0 - 0.4)) / 0.4)
        bw = 104
        fc = E.mix(BG, E.CYAN, kk)
        g.box(RX - 1, fy, bw, 5, fg=fc, bg=BG)
        txt = E.typed(LAST, t, LAST_T0, LAST_CPS)
        tx = RX + (bw - len(LAST)) // 2 - 1
        for q, c in enumerate(txt):
            age = (len(txt) - 1 - q) / 6.0
            g.set(tx + q, fy + 2, c, fg=E.mix(E.WHITE, E.CYAN, min(1.0, age)))
        if len(txt) < len(LAST):
            if E.blink(t, 3.0):
                g.set(tx + len(txt), fy + 2, "_", fg=E.WHITE)
        else:
            # twinkle border after completion
            tt = t - (LAST_T0 + len(LAST) / LAST_CPS)
            for i in range(0, bw, 6):
                if (i // 6 + int(tt * 6)) % 3 == 0:
                    g.set(RX - 1 + i, fy, "+", fg=E.WHITE)
                    g.set(RX - 1 + i, fy + 4, "+", fg=E.WHITE)

    # soft fade-out at end
    if t > DURATION - 0.25:
        pass
