"""Scene 07 - WHERE YOU SEE IT TODAY: four ASCII 'windows' pop in one by one."""
import math
import numpy as np
import engine as E

DURATION = 14.0

BG = E.rgb("070B14")
PANEL = E.rgb("0A1220")
TEAL = E.rgb("66FFCC")
GREY = E.rgb("6C8CA8")
FAINT = E.rgb("33506A")

WX = (6, 124)
WY = (9, 35)
WW, WH = 110, 24
STARTS = (1.0, 3.5, 6.0, 8.5)
TITLES = ("[ terminal splash ]", "[ README logos ]", "[ roguelike games ]", "[ email signatures & memes ]")
COLS_ = (E.CYAN, E.GREEN, E.WHITE, TEAL)
FINAL = "Small, fast, works everywhere - even in plain text."
FINAL_T0, FINAL_CPS = 11.0, 30.0


def _clicks(a, b, step):
    n = int((b - a) / step)
    return [(a + i * step, "click") for i in range(n)]


EVENTS = ([(s, "blip") for s in STARTS]
          + _clicks(STARTS[0] + 0.4, STARTS[0] + 1.4, 0.1)
          + _clicks(STARTS[0] + 2.1, STARTS[0] + 3.0, 0.13)
          + _clicks(STARTS[1] + 1.8, STARTS[1] + 2.9, 0.1)
          + _clicks(STARTS[3] + 0.7, STARTS[3] + 2.0, 0.1)
          + _clicks(FINAL_T0, FINAL_T0 + len(FINAL) / FINAL_CPS, 0.1)
          + [(STARTS[2] + 5.3, "chime")])
EVENTS.sort()

# ---- static art ------------------------------------------------------------
LOGO1 = E.big_text("M Y T O O L", 5)
LOGO2 = E.big_text("G L Y P H", 5)

FLOWER = [
    "    _    ",
    "  _(_)_  ",
    " (_)@(_) ",
    "   (_)\\  ",
    "     |/  ",
    "    \\|   ",
]

MAPW, MAPH = 70, 12


def _build_map():
    m = [[" "] * MAPW for _ in range(MAPH)]

    def room(x0, y0, x1, y1):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                edge = x in (x0, x1) or y in (y0, y1)
                m[y][x] = "#" if edge else "."
    room(0, 0, 24, 11)
    room(34, 0, 69, 11)
    for x in range(25, 34):
        m[5][x] = "#"; m[7][x] = "#"; m[6][x] = "."
    m[6][24] = "+"; m[6][34] = "+"
    return m


MAP = _build_map()
ITEMS = {(4, 3): "$", (6, 9): "!", (45, 2): "?", (60, 8): "$", (20, 9): "!"}
WAY = [(3, 9), (3, 6), (36, 6), (45, 6), (45, 2), (60, 2), (60, 8)]


def _path():
    p = [WAY[0]]
    for (ax, ay), (bx, by) in zip(WAY, WAY[1:]):
        while (ax, ay) != (bx, by):
            ax += (bx > ax) - (bx < ax)
            ay += (by > ay) - (by < ay)
            p.append((ax, ay))
    return p


PATH = _path()
SCROLL_I = PATH.index((45, 2))
GOLD_I = len(PATH) - 1


# ---- helpers ---------------------------------------------------------------
def _tp(g, x, y, text, tl, t0, cps, fg, cursor=True):
    s = E.typed(text, tl, t0, cps)
    g.put(x, y, s, fg)
    if cursor and tl > t0 and len(s) < len(text):
        g.set(x + len(s), y, "_", E.WHITE)
    return len(s) >= len(text)


def _perimeter(x, y, w, h):
    pts = [(x + i, y) for i in range(w)]
    pts += [(x + w - 1, y + j) for j in range(1, h)]
    pts += [(x + i, y + h - 1) for i in range(w - 2, -1, -1)]
    pts += [(x, y + j) for j in range(h - 2, 0, -1)]
    return pts


def _window(g, i, tl):
    """Draw frame + title bar. Returns True once fully popped in."""
    x, y = WX[i % 2], WY[i // 2]
    w, h = WW, WH
    col = COLS_[i]
    p = E.ease_out(E.prog(tl, 0, 0.35))
    cw, ch = max(4, int(w * p)), max(3, int(h * p))
    cx, cy = x + (w - cw) // 2, y + (h - ch) // 2
    g.ch[cy:cy + ch, cx:cx + cw] = 32
    g.bg[cy:cy + ch, cx:cx + cw] = PANEL
    pulse = 0.55 + 0.25 * math.sin(tl * 3.0 + i)
    bcol = E.mix(E.WHITE, E.mix(PANEL, col, pulse), p)
    g.box(cx, cy, cw, ch, fg=bcol)
    if p < 1:
        return False
    # title bar
    g.bg[y + 1, x + 1:x + w - 1] = E.mix(PANEL, col, 0.18)
    g.put(x + 3, y + 1, TITLES[i], col)
    g.put(x + w - 12, y + 1, "[_][#][x]", E.mix(col, PANEL, 0.35))
    for xx in range(x + 1, x + w - 1):
        g.set(xx, y + 2, "-", E.mix(PANEL, col, 0.4))
    # travelling glow comet on the border
    pts = _perimeter(x, y, w, h)
    head = int(tl * 45) % len(pts)
    for k in range(14):
        px, py = pts[(head - k) % len(pts)]
        g.fg[py, px] = E.mix(E.mix(PANEL, col, pulse), E.WHITE, (1 - k / 14.0) ** 1.5)
    return True


def _bg_rain(g, t):
    cols = np.arange(E.COLS)
    rows = np.arange(E.ROWS)[:, None]
    h = E.hash2(cols, 0, 7)
    head = (t * (4 + h * 8) + h * 200) % 100
    d = (head[None, :] - rows) % 100
    live = (E.hash2(cols, 0, 9) < 0.4)[None, :] & (d < 12)
    b = np.clip(1 - d / 12.0, 0, 1)
    glyphs = np.frombuffer(b"01abcdef.:+*#", np.uint8)
    idx = (E.hash2(cols[None, :], rows, 3 + int(t * 3)) * len(glyphs)).astype(int)
    ch = glyphs[idx]
    tint = np.array([40, 110, 140], float)
    base = np.array(BG, float)
    col = base + (tint - base) * (b[..., None] * 0.55)
    g.ch[:] = np.where(live, ch, g.ch)
    g.fg[:] = np.where(live[..., None], col.astype(np.uint8), g.fg)


# ---- window contents -------------------------------------------------------
def _w_terminal(g, tl, x, y):
    ix, iy = x + 4, y + 4
    g.put(ix, iy, "$ ", E.GREEN)
    cmd_done = _tp(g, ix + 2, iy, "mytool --version", tl, 0.4, 18, E.WHITE, cursor=tl < 1.4)
    if tl > 1.4:
        g.put(ix, iy + 1, "mytool 1.0.0 (build 4f2a9c)", GREY)
    rows = int(E.prog(tl, 1.5, 0.6) * len(LOGO1) + 0.001)
    for r in range(rows):
        for c, ch in enumerate(LOGO1[r]):
            if ch != " ":
                k = (c / 30.0 + r / 8.0 + 0.2 * math.sin(tl * 2 + c * 0.2)) % 1.0
                g.set(ix + 2 + c, iy + 3 + r, "#", E.mix(E.CYAN, E.GREEN, k))
    ok = _tp(g, ix, iy + 9, "v1.0.0 ready", tl, 2.1, 14, E.GREEN)
    if tl > 2.1:
        g.put(ix + 14, iy + 9, "*", E.mix(E.GREEN, E.WHITE, 0.5 + 0.5 * math.sin(tl * 6)))
    if tl > 3.0:
        g.put(ix, iy + 11, "[ ok ] ascii engine ......... 95 glyphs", GREY)
    if tl > 3.4:
        g.put(ix, iy + 12, "[ ok ] colour table ......... 256 colours", GREY)
    if tl > 3.8:
        g.put(ix, iy + 13, "[ ok ] zero dependencies ... 0 bytes of images", GREY)
    if tl > 4.2:
        g.put(ix, iy + 15, "$ ", E.GREEN)
        if E.blink(tl, 1.5):
            g.set(ix + 2, iy + 15, "#", E.WHITE)


def _w_readme(g, tl, x, y):
    bw, bh = len(LOGO2[0]) + 8, len(LOGO2) + 4
    bx, by = x + (WW - bw) // 2, y + 4
    if tl < 0.3:
        return
    wipe = int(E.prog(tl, 0.3, 1.0) * bw)
    for j in range(bh):
        for i in range(min(wipe, bw)):
            edge_x = i in (0, bw - 1)
            edge_y = j in (0, bh - 1)
            if edge_x or edge_y:
                ch = "+" if (edge_x and edge_y) else ("|" if edge_x else "-")
                g.set(bx + i, by + j, ch, E.mix(E.GREEN, E.WHITE, 0.3))
    for r, line in enumerate(LOGO2):
        for c, ch in enumerate(line):
            if ch != " " and c + 4 < wipe:
                k = 0.5 + 0.5 * math.sin(c * 0.18 - tl * 3.5)
                g.set(bx + 4 + c, by + 2 + r, "#", E.mix(E.GREEN, E.WHITE, k * 0.8))
    tag = "tiny logos for tiny repos."
    _tp(g, x + (WW - len(tag)) // 2, by + bh + 1, tag, tl, 1.8, 22, E.WHITE)
    if tl > 2.8:
        badges = "[ build: passing ]  [ license: MIT ]  [ size: 2kb ]"
        g.put(x + (WW - len(badges)) // 2, by + bh + 3, badges, E.GREEN)
    if tl > 3.4:
        g.put(x + 6, y + WH - 4, "## install", E.CYAN)
        g.put(x + 6, y + WH - 3, "$ pip install glyph", E.mix(E.GREEN, E.WHITE, 0.4))


def _w_rogue(g, tl, x, y):
    mx, my = x + 3, y + 4
    step = int(max(0.0, tl - 0.7) * 16)
    si = min(step, len(PATH) - 1)
    px, py = PATH[si]
    picked_scroll = si >= SCROLL_I
    picked_gold = si >= GOLD_I
    monsters = {(14 + int(2 + 2 * math.sin(tl * 2)), 3): "g", (52, 9): "k", (38, 9): "O"}
    for j in range(MAPH):
        for i in range(MAPW):
            c = MAP[j][i]
            if c == " ":
                continue
            d = math.hypot((i - px) * 0.5, j - py)
            lit = E.clamp01(1.25 - d / 9.0)
            if (i, j) in monsters:
                g.set(mx + i, my + j, monsters[(i, j)], E.mix(E.mix(PANEL, E.RED, 0.45), E.RED, lit))
                continue
            it = ITEMS.get((i, j))
            if it and not (it == "?" and picked_scroll) and not (it == "$" and (i, j) == (60, 8) and picked_gold):
                ic = {"$": E.AMBER, "!": E.PINK, "?": E.CYAN}[it]
                g.set(mx + i, my + j, it, E.mix(E.mix(PANEL, ic, 0.5), ic, lit))
                continue
            if c == "#":
                col = E.mix(FAINT, E.rgb("9FD4F0"), lit * 0.8)
            elif c == "+":
                col = E.mix(E.mix(PANEL, E.AMBER, 0.5), E.AMBER, lit)
            else:
                col = E.mix(E.rgb("14283A"), E.rgb("5FA8C8"), lit)
            g.set(mx + i, my + j, c, col)
    # player with a glow
    g.set(mx + px, my + py, "@", E.WHITE, E.mix(PANEL, E.CYAN, 0.35 + 0.15 * math.sin(tl * 8)))
    # side panel
    sx = x + 80
    gold = 12 if picked_gold else 0
    hp = 18
    g.put(sx, my, "THE ROGUE   lvl 3", E.WHITE)
    g.put(sx, my + 2, "HP  [" + "#" * (hp // 2) + "-" * (10 - hp // 2) + "] %d/20" % hp, E.GREEN)
    g.put(sx, my + 3, "Gold: %d" % gold, E.AMBER)
    g.put(sx, my + 4, "Depth: 3", GREY)
    g.put(sx, my + 6, "@ you      $ gold", GREY)
    g.put(sx, my + 7, "! potion   ? scroll", GREY)
    g.put(sx, my + 8, "+ door     # wall", GREY)
    g.put(sx, my + 9, "g k O  monsters", E.mix(E.RED, GREY, 0.3))
    # message line
    if tl > 0.5:
        if picked_gold:
            msg, mc = "You found 12 gold pieces.", E.AMBER
        elif picked_scroll:
            msg, mc = "You pick up a scroll.", E.CYAN
        else:
            msg, mc = "You descend into the dungeon...", E.WHITE
        g.put(x + 3, y + WH - 4, "> " + msg, mc)
        if picked_gold and E.blink(tl, 2):
            g.put(x + 3 + 2 + len(msg) + 1, y + WH - 4, "-more-", E.mix(mc, PANEL, 0.4))


def _w_email(g, tl, x, y):
    ix, iy = x + 5, y + 4
    _tp(g, ix, iy, "To: friend@example.com", tl, 0.3, 40, GREY, cursor=False)
    _tp(g, ix, iy + 1, "Subject: re: what is ascii?", tl, 0.35, 40, GREY, cursor=False)
    _tp(g, ix, iy + 3, "Thanks for the quick reply! Talk soon.", tl, 0.7, 30, E.WHITE)
    if tl > 2.0:
        g.put(ix, iy + 5, "-- ", E.GREEN)
    _tp(g, ix, iy + 6, "Paul P.", tl, 2.2, 30, E.WHITE, cursor=False)
    _tp(g, ix, iy + 7, "tiny things, big feelings", tl, 2.4, 30, E.CYAN, cursor=False)
    _tp(g, ix, iy + 8, "mytool.dev | @ascii_fan", tl, 2.8, 30, GREY, cursor=False)
    if tl > 3.1:
        g.put(ix, iy + 10, "( ^_^ )/", E.mix(E.GREEN, E.WHITE, 0.5 + 0.5 * math.sin(tl * 5)))
    # flower grows from the bottom
    n = int(E.prog(tl, 2.0, 1.0) * len(FLOWER) + 0.001)
    fx, fy = x + 62, iy + 1
    for r in range(len(FLOWER) - n, len(FLOWER)):
        line = FLOWER[r]
        for c, ch in enumerate(line):
            if ch == " ":
                continue
            col = E.WHITE if r < 4 else E.GREEN
            if ch == "@":
                col = E.AMBER
            g.set(fx + c, fy + r, ch, col)
    # meme captions
    memes = ((3.2, "much ascii", E.CYAN, 74, 1), (3.5, "very text", E.GREEN, 82, 3),
             (3.8, "wow", E.AMBER, 92, 5), (4.2, "so tiny", E.WHITE, 72, 8))
    for t0, s, c, dx, dy in memes:
        if tl > t0:
            wob = int(round(math.sin(tl * 2 + dx)))
            g.put(x + dx + (0 if dx < 62 else 8), iy + dy + 1 + (wob if dy > 7 else 0) * 0, s, c)


_BODIES = (_w_terminal, _w_readme, _w_rogue, _w_email)


def render(g, t):
    g.clear(BG, E.CYAN)
    _bg_rain(g, t)

    # title
    lines = E.big_text("T O D A Y", 5)
    tw = len(lines[0])
    tx = (E.COLS - tw) // 2
    reveal = int(E.ease_out(E.prog(t, 0.0, 0.9)) * tw)
    for r, line in enumerate(lines):
        for c, ch in enumerate(line):
            if ch != " " and c < reveal:
                k = 0.5 + 0.5 * math.sin(c * 0.22 - t * 3.0)
                g.set(tx + c, 1 + r, "#", E.mix(E.CYAN, E.WHITE, k), E.mix(BG, PANEL, 0.5))
    sub = "W H E R E   Y O U   S E E   I T"
    if t > 0.5:
        g.center(7, E.typed(sub, t, 0.5, 40), E.mix(E.GREEN, BG, 0.25))

    # windows
    for i in range(4):
        tl = t - STARTS[i]
        if tl < 0:
            continue
        done = _window(g, i, tl)
        if done:
            _BODIES[i](g, tl, WX[i % 2], WY[i // 2])

    # final beat
    if t > FINAL_T0:
        s = E.typed(FINAL, t, FINAL_T0, FINAL_CPS)
        x0 = (E.COLS - len(FINAL)) // 2
        for i, c in enumerate(s):
            k = i / float(len(FINAL))
            g.set(x0 + i, 62, c, E.mix(E.mix(E.CYAN, E.WHITE, min(1, k * 2)), E.GREEN, max(0, k * 2 - 1)))
        if len(s) < len(FINAL):
            g.set(x0 + len(s), 62, "_", E.WHITE)
        elif E.blink(t, 1.5):
            g.set(x0 + len(s), 62, "_", E.WHITE)
        for xx in range(x0 - 2, x0 + len(FINAL) + 2):
            g.set(xx, 64, "=", E.mix(BG, E.CYAN, 0.35))
