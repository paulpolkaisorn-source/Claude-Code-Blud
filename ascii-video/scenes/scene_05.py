import numpy as np
from functools import lru_cache
import engine as E

DURATION = 18.0
BG = E.rgb("14100A")
CREAM = E.rgb("F3E6C4")
AMB = E.rgb("FFB000")
T0, DT = 1.0, 2.8
STOPS = [T0 + DT * i for i in range(5)]
FINAL_T = 14.2
FINAL = "Text was the first graphics."
FINAL_CPS = 14.0

EVENTS = []
for _s in STOPS:
    EVENTS.append((_s, "chime"))
    for k in range(7):
        EVENTS.append((_s + 0.35 + k * 0.08, "click"))
for k in range(0, len(FINAL), 2):
    EVENTS.append((FINAL_T + k / FINAL_CPS, "click"))
EVENTS.sort()

CX = [int(6 + 228 / 5 * (i + 0.5)) for i in range(5)]
ACC = [E.rgb(h) for h in ("FFB000", "5FD3C8", "7CFF6B", "FF7AB0", "8FB4FF")]
YEARS = ["1890s", "1960s", "1980s", "1982", "1990s+"]
CAPS = ["Typewriter art", "Line printers & computer art", "BBS & ANSI art",
        "The first smiley :-)", "Usenet, email signatures, the web"]

TYPEWRITER = [
    r"        .-------------.        ",
    r"        |  Dear Sir,  |        ",
    r"        |  ---------  |        ",
    r"   _____|_____________|_____   ",
    r"  /   o   o   o   o   o   o \  ",
    r" /  [Q][W][E][R][T][Y][U][I] \ ",
    r"/  [A][S][D][F][G][H][J][K][L] \\".replace("\\\\", "\\"),
    r"|   [Z][X][C][V][B][N][M][,]   |",
    r"|      [________________]      |",
    r"'------------------------------'",
]

MODEM_BASE = [
    r" .----------------------------. ",
    r" | C:\> ATDT 555-0199         | ",
    r" | CONNECT 2400               | ",
    r" |                            | ",
    r" |                            | ",
    r" '----------------------------' ",
    r"          _|__________|_        ",
    r"        /________________\      ",
    r"   [ MODEM ] o  o  o  o         ",
]

ENVELOPE = [
    r".------------------------------.",
    r"|\                            /|",
    r"| \     @  e-mail  @         / |",
    r"|  \                        /  |",
    r"|   '-.                .-'    |",
    r"|      '-.__________.-'        |",
    r"|  -- Paul                     |",
    r"|  http://www.example.com      |",
    r"'------------------------------'",
]


@lru_cache(None)
def bt(text, rows):
    return E.big_text(text, rows)


def paper_rows(t):
    ramp = E.RAMP
    out = []
    off = int(t * 3)
    for j in range(5):
        s = ""
        for i in range(12):
            v = (i + j * 2 + off) % 18
            v = v if v < 10 else 18 - v
            s += ramp[min(9, v)]
        out.append(s)
    return out


def printer_art(t):
    p = paper_rows(t)
    lines = [
        r"      .---------------.      ",
        r"      |:::::::::::::::|      ",
        r" .----'---------------'----. ",
        r" | [ LINE PRINTER ]  o  o  | ",
        r" |_________________________| ",
    ]
    for r in p:
        lines.append("      | " + r + " |      ")
    return lines


def modem_art(t):
    ln = list(MODEM_BASE)
    ansi = "".join("#%@=+:."[(i + int(t * 6)) % 7] for i in range(24))
    ln[3] = " | " + ansi + "   | "
    cur = "_" if E.blink(t, 1.5) else " "
    ln[4] = " | READY" + cur + "                   | "
    return ln


def smiley_art():
    s = bt(":-)", 5)
    w = max(len(x) for x in s)
    pad = (31 - w) // 2
    s = [" " * pad + x for x in s]
    face = [
        r"     .-'''''-.     ",
        r"    / (o) (o) \    ",
        r"   |    \_/    |   ",
        r"    \ '-----' /    ",
        r"     '-.....-'     ",
    ]
    face = [(" " * 6) + f for f in face]
    return s + [""] + face


def stop_art(i, t):
    if i == 0: return TYPEWRITER
    if i == 1: return printer_art(t)
    if i == 2: return modem_art(t)
    if i == 3: return smiley_art()
    return ENVELOPE


def dim(c, k):
    return E.mix(BG, c, k)


def render(g, t):
    g.clear(BG, CREAM)

    # drifting warm dust
    xs = np.arange(E.COLS)[None, :]
    ys = np.arange(E.ROWS)[:, None]
    sh = int(t * 4)
    hv = E.hash2(xs + sh, ys, 7)
    mask = hv < 0.004
    g.ch[mask] = ord(".")
    g.fg[mask] = E.mix(BG, AMB, 0.22)
    mask2 = (E.hash2(xs - sh // 2, ys, 3) < 0.002)
    g.ch[mask2] = ord("+")
    g.fg[mask2] = E.mix(BG, AMB, 0.18)

    # title
    ti = bt("HISTORY", 5)
    tw = len(ti[0])
    x0 = (E.COLS - tw) // 2
    for j, ln in enumerate(ti):
        for i, c in enumerate(ln):
            if c != " ":
                k = i / max(1, tw - 1)
                col = E.mix(AMB, CREAM, 0.35 + 0.4 * k + 0.1 * np.sin(t * 2 + i * 0.1))
                g.set(x0 + i, 2 + j, c, col)
    sub = "-- A SHORT HISTORY OF TEXT AS PICTURES --"
    g.center(8, E.typed(sub, t, 0.2, 40).ljust(len(sub)) if False else E.typed(sub, t, 0.2, 40), dim(CREAM, 0.7))

    # active stop
    n_vis = sum(1 for s in STOPS if t >= s)
    active = n_vis - 1

    # timeline
    kt = [0.0] + STOPS + [STOPS[-1] + 1.5]
    kx = [6] + CX + [233]
    head = float(np.interp(t, kt, kx))
    TY = 23
    for x in range(6, 234):
        if x > head:
            break
        c = "+" if (x - 6) % 4 == 0 else "="
        near = max(0.0, 1 - (head - x) / 14)
        col = E.mix(dim(AMB, 0.45), CREAM, near * 0.9) if head - x < 14 else dim(AMB, 0.5)
        g.set(x, TY, c, col)
    if t < STOPS[-1] + 1.5:
        g.set(int(head) + 1, TY, ">", CREAM)

    for i in range(5):
        if t < STOPS[i]:
            continue
        la = t - STOPS[i]
        is_act = (i == active) and t < FINAL_T + 4
        if t >= FINAL_T + 0.0:
            is_act = False
        acc = ACC[i]
        b = 1.0 if is_act else 0.5
        cx = CX[i]
        # marker
        g.put(cx - 1, TY, "[+]", acc if is_act else dim(acc, 0.6))
        if is_act and E.blink(t, 2.0):
            g.set(cx, TY + 1, "^", CREAM)
        elif is_act:
            g.set(cx, TY + 1, " ")
        else:
            g.set(cx, TY + 1, "'", dim(acc, 0.5))

        # art
        art = stop_art(i, t)
        h = len(art)
        ay = 21 - h
        vis = int(E.prog(la, 0.0, 0.9) * h + 0.999)
        w = max(len(a) for a in art)
        ax = cx - w // 2
        for j in range(min(vis, h)):
            k = j / max(1, h - 1)
            col = E.mix(acc, CREAM, 0.15 + 0.35 * (1 - k)) if is_act else dim(acc, b)
            if is_act:
                col = E.mix(col, CREAM, 0.12 * (0.5 + 0.5 * np.sin(t * 3 + j)))
            g.put(ax, ay + j, art[j], col, None, True)
        # reveal flash line
        if vis < h and vis > 0:
            g.put(ax, ay + vis - 1, "#" * w, CREAM, None, False)

        # year
        yb = bt(YEARS[i], 5)
        yw = len(yb[0])
        yx = cx - yw // 2
        ycol = acc if is_act else dim(acc, 0.55)
        yvis = E.prog(la, 0.2, 0.6)
        ncol = int(yw * yvis)
        for j, ln in enumerate(yb):
            for q in range(min(ncol, yw)):
                if ln[q] != " ":
                    g.set(yx + q, 27 + j, ln[q], ycol)

        # caption
        lines = E.wrap(CAPS[i], 34)
        ccol = CREAM if is_act else dim(CREAM, 0.55)
        cnt = int(max(0.0, la - 0.35) * 40)
        for li, ln in enumerate(lines):
            cut = ln[:max(0, cnt)]
            cnt -= len(ln)
            g.put(cx - len(ln) // 2, 34 + li, cut, ccol)

    # final line
    if t >= FINAL_T:
        fb = bt(FINAL, 5)
        fw = len(fb[0])
        fx = (E.COLS - fw) // 2
        n = int((t - FINAL_T) * FINAL_CPS / len(FINAL) * fw)
        n = min(n, fw)
        FY = 45
        g.center(FY - 2, "+" + "=" * 60 + "+", dim(AMB, 0.5))
        for j, ln in enumerate(fb):
            for q in range(n):
                if ln[q] != " ":
                    k = q / max(1, fw - 1)
                    g.set(fx + q, FY + j, ln[q], E.mix(AMB, CREAM, 0.3 + 0.6 * k))
        if n < fw and E.blink(t, 4):
            for j in range(5):
                g.set(fx + n, FY + j, "#", CREAM)
        elif n >= fw and E.blink(t, 1.5):
            for j in range(5):
                g.set(fx + fw + 1, FY + j, "_" if j == 4 else " ", CREAM)
        g.center(FY + 7, "+" + "=" * 60 + "+", dim(AMB, 0.5))
