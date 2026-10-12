import functools
import numpy as np
import engine as E

DURATION = 16.0

BG = E.rgb("120A00")
AMB = E.AMBER
AMB_D = E.mix(AMB, BG, 0.45)
AMB_DD = E.mix(AMB, BG, 0.75)
WHT = E.rgb("FFF4DC")

SUB = "American Standard Code for Information Interchange - 1963"
CAP = "A few of these become the brushes."
FIN = "128 codes. 7 bits. Plain text."
RAMP_CODES = [ord(c) for c in E.RAMP]

TX, TY, TW, TH = 14, 13, 98, 35        # table box
CELLW = 15
PX, PW = 122, 112                      # right panel

T_REV = 1.2          # table reveal start
T_SWEEP = 2.4        # sweep start
SWEEP_RATE = 13.0    # cells per second
T_RAMP = 9.2         # ramp cycling starts (white highlight from t>9)
T_CAP = 9.6
T_FIN = 13.0
SUB_CPS = 30.0

# ---- events ---------------------------------------------------------------
EVENTS = []
for _i in range(0, 95, 2):
    EVENTS.append((T_SWEEP + _i / SWEEP_RATE, "blip"))
for _k in range(0, len(SUB), 3):
    EVENTS.append((0.6 + _k / SUB_CPS, "click"))
for _k in range(10):
    EVENTS.append((T_RAMP + _k * 0.4, "blip"))
for _k in range(0, 24, 3):
    EVENTS.append((T_CAP + _k / 14.0, "click"))
for _k in range(0, 24, 3):
    EVENTS.append((T_FIN + _k / 14.0, "click"))
EVENTS.append((0.2, "whoosh"))
EVENTS.append((T_FIN, "chime"))
EVENTS.sort()


DIG = {"1": ["  #  ", " ##  ", "  #  ", "  #  ", " ### "],
       "0": [" ### ", "#   #", "#   #", "#   #", " ### "]}


@functools.lru_cache(maxsize=None)
def _big(text, rows):
    return E.big_text(text, rows)


def _draw_big(g, lines, x, y, k, colfn, cursor=True):
    """Draw big text lines, showing first k columns (wipe reveal)."""
    w = max(len(l) for l in lines)
    k = int(min(k, w))
    for j, ln in enumerate(lines):
        for i in range(min(k, len(ln))):
            if ln[i] != " ":
                g.set(x + i, y + j, "#", colfn(i, j, w, len(lines)))
    if cursor and 0 < k < w:
        for j in range(len(lines)):
            g.set(x + k, y + j, "#", WHT)


def _name(c):
    return "SP" if c == 32 else chr(c)


def _cell_pos(code):
    i = code - 32
    r, c = divmod(i, 6)
    return TX + 3 + c * CELLW, TY + 2 + r * 2


def render(g, t):
    g.clear(BG, AMB)

    # ---- background drifting dim glyphs -------------------------------------
    ys, xs = np.mgrid[0:E.ROWS, 0:E.COLS]
    drift = int(t * 6)
    hv = E.hash2(xs, (ys + drift * (1 + (xs % 3))) % 997, 7)
    mask = hv > 0.965
    codes = (33 + (hv * 9000).astype(int) % 94).astype(np.uint8)
    g.ch[mask] = codes[mask]
    g.fg[mask] = E.mix(BG, AMB, 0.13)

    # ---- banner -------------------------------------------------------------
    ban = _big("ASCII", 7)
    bw = len(ban[0])
    bx = (E.COLS - bw) // 2
    wipe = E.ease_out(E.prog(t, 0.15, 0.9)) * (bw + 1)
    shine = ((t * 28) % (bw + 60)) - 20

    def bcol(i, j, w, h):
        base = E.mix(AMB, E.rgb("B36A00"), j / (h - 1))
        d = abs(i - shine)
        return E.mix(base, WHT, max(0.0, 1 - d / 7.0) * 0.9)

    _draw_big(g, ban, bx, 2, wipe, bcol, cursor=t < 1.1)

    # ---- subtitle -----------------------------------------------------------
    s = E.typed(SUB, t, 0.6, SUB_CPS)
    sx = (E.COLS - len(SUB)) // 2
    g.put(sx, 11, s, AMB)
    if len(s) < len(SUB) and t > 0.6:
        g.set(sx + len(s), 11, "_", WHT)
    elif E.blink(t, 1.2) and t < 4:
        g.set(sx + len(s), 11, "_", AMB_D)

    # ---- table box ----------------------------------------------------------
    boxp = E.prog(t, 1.0, 0.6)
    if boxp > 0:
        g.box(TX, TY, TW, TH, E.mix(BG, AMB, 0.55 * boxp))
        title = "[ PRINTABLE ASCII  32..126 ]"
        g.put(TX + 3, TY, title, AMB if boxp >= 1 else AMB_D)

    # sweep state
    sweep_idx = int((t - T_SWEEP) * SWEEP_RATE) if t >= T_SWEEP else -1
    sweeping = 0 <= sweep_idx < 95
    in_ramp = t > 9.0
    fade_tail = 0.0

    ramp_cur = None
    if t >= T_RAMP:
        ramp_cur = RAMP_CODES[min(9, int((t - T_RAMP) / 0.4))]

    for code in range(32, 127):
        i = code - 32
        r, c = divmod(i, 6)
        rt = T_REV + r * 0.13
        if t < rt:
            continue
        x, y = _cell_pos(code)
        label = "%03d %s" % (code, _name(code))
        age = t - rt
        flash = max(0.0, 1 - age / 0.25)
        fg = E.mix(AMB_D, WHT, flash)
        num_fg = E.mix(AMB_DD, WHT, flash)
        bg = BG
        is_ramp = code in RAMP_CODES
        if in_ramp:
            k = E.ease_out(E.prog(t, 9.0 + RAMP_CODES.index(code) * 0.04, 0.3)) if is_ramp else 0
            if is_ramp:
                pulse = 0.5 + 0.5 * np.sin(t * 6 + RAMP_CODES.index(code))
                fg = E.mix(fg, WHT, k)
                num_fg = E.mix(num_fg, WHT, k)
                bg = E.mix(BG, E.rgb("4A2C00"), k * (0.5 + 0.4 * pulse))
            else:
                fg = E.mix(fg, AMB_DD, 0.5)
                num_fg = E.mix(num_fg, BG, 0.3)
        # sweep trail (dim glow behind head)
        if sweep_idx >= 0 and sweeping and 0 < sweep_idx - i <= 4 and not in_ramp:
            kk = 1 - (sweep_idx - i) / 5.0
            bg = E.mix(BG, E.rgb("5A3400"), kk * 0.8)
            fg = E.mix(fg, AMB, kk)
        head = sweeping and i == sweep_idx
        if head:
            g.put(x - 1, y, " " + label + "  ", BG, AMB)
        else:
            g.put(x - 1, y, " " * 11, fg, bg)
            g.put(x, y, label[:3], num_fg, bg)
            g.put(x + 4, y, label[4:], fg, bg)

    # ---- right panel: callout ----------------------------------------------
    cur = None
    if sweeping:
        cur = 32 + sweep_idx
    elif t >= T_SWEEP + 95 / SWEEP_RATE:
        cur = ramp_cur if ramp_cur is not None else 126
    if cur is not None:
        text = "%s = %d = %s" % (_name(cur), cur, format(cur, "07b"))
        lines = _big(text, 5)
        if len(lines[0]) > PW - 4:
            lines = _big(text, 4)
        lw = len(lines[0])
        lx = PX + (PW - lw) // 2
        pbox = E.mix(BG, AMB, 0.45)
        g.box(PX - 2, TY, PW + 4, TH, pbox)
        g.put(PX + 1, TY, "[ DECODER ]", AMB)
        g.put(PX + 2, TY + 3, "character", AMB_D)
        g.put(PX + 22, TY + 3, "decimal", AMB_D)
        g.put(PX + 40, TY + 3, "7-bit binary", AMB_D)
        # big current glyph (real glyph repeated large) - use the callout line
        ccol = (lambda i, j, w, h: E.mix(AMB, WHT, 0.6 if in_ramp else 0.15 * (j == 0)))
        _draw_big(g, lines, lx, TY + 6, 999, ccol, cursor=False)
        # bit boxes
        bits = format(cur, "07b")
        bwid = 10
        total = 7 * bwid + 6 * 2
        bx0 = PX + (PW - total) // 2
        for b in range(7):
            on = bits[b] == "1"
            x0 = bx0 + b * (bwid + 2)
            col = WHT if on else AMB_DD
            fillc = E.mix(BG, E.rgb("6B4000"), 0.9) if on else BG
            for yy in range(TY + 15, TY + 22):
                for xx in range(x0, x0 + bwid):
                    g.set(xx, yy, " ", None, fillc)
            g.box(x0, TY + 15, bwid, 7, col, fillc)
            big = DIG[bits[b]]
            bw2 = len(big[0])
            for j, ln in enumerate(big):
                for i2, chh in enumerate(ln):
                    if chh != " ":
                        g.set(x0 + (bwid - bw2) // 2 + i2, TY + 16 + j,
                              "#", WHT if on else AMB_D, fillc)
            g.put(x0 + bwid // 2 - 3, TY + 22, "b%d=%2d" % (6 - b, 1 << (6 - b)), AMB_D)
        # sum line
        parts = [str(1 << (6 - b)) for b in range(7) if bits[b] == "1"]
        sline = " + ".join(parts) + " = %d" % cur
        g.put(PX + (PW - len(sline)) // 2, TY + 26, sline, E.mix(AMB, WHT, 0.4))
        g.put(PX + (PW - 40) // 2, TY + 30, "each code is just a number in 7 bits", AMB_DD)
        # progress meter
        frac = (cur - 32) / 94.0
        mw = PW - 8
        n = int(frac * mw)
        g.put(PX + 4, TY + 32, "32 " + "=" * 0, AMB_DD)
        g.put(PX + 4, TY + 33, "[" + "#" * n + "." * (mw - n) + "]", AMB_D)
        g.put(PX + 4 + mw - 3, TY + 32, "126", AMB_DD)

    # ---- caption / final ------------------------------------------------------
    if T_CAP <= t < T_FIN + 0.2:
        lines = _big(CAP, 4)
        w = len(lines[0])
        k = (t - T_CAP) * 110
        if t > T_FIN - 0.3:
            k = w
        fadeout = E.prog(t, T_FIN - 0.4, 0.5)
        _draw_big(g, lines, (E.COLS - w) // 2, 52, k,
                  lambda i, j, ww, hh: E.mix(E.mix(AMB, WHT, 0.55 + 0.3 * np.sin(t * 3 - i * 0.1)), BG, fadeout))
    if t >= T_FIN:
        lines = _big(FIN, 5)
        w = len(lines[0])
        k = (t - T_FIN) * 120
        _draw_big(g, lines, (E.COLS - w) // 2, 52, k,
                  lambda i, j, ww, hh: E.mix(AMB, WHT, 0.5 + 0.5 * max(0, np.sin(t * 4 - i * 0.12))),
                  cursor=k < w)

    # status footer
    if t > 1.0:
        g.put(TX, 62, "7 bits = 0..127   |   32..126 printable   |   0..31 control", AMB_DD)
