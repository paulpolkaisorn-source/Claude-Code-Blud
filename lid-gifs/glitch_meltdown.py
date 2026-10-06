"""GLITCH MELTDOWN - ROG Strix SCAR 18 (G835) AniMe Vision lid animation.

4.0 s loop at 20 fps = 80 frames (1 frame = 50 ms). The lid is white-only, so the
brief's red / cyan copies are two brightness levels here.

  f0-19   upright scanline sweeps left -> right; "SCAR 18" snaps from a dim ghost
          to full white behind it
  f20-39  text splits into a bright and a half-bright copy that jitter 2-3 LEDs
          apart, hard cuts every 2 frames
  f40-59  the whole stripe tears into horizontal slices sliding opposite ways,
          then exactly 2 frames of full white (f58-59)
  f60-79  text rebuilds out of static, steps down to the ghost = frame 0 (seamless)

Edit the constants below, then run:  python build.py glitch_meltdown
Brightness steps the lid shows: 0, 36, 73, 109, 146, 182, 219, 255.
"""
import os
import sys

import numpy as np
from PIL import ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lidkit as K  # noqa: E402

SPACE = "canvas"

# ---- text
TEXT = "SCAR 18"
WORD_GAP = 1          # columns for the space; with letter spacing that is a 3-LED gap
RAISE = 1.0           # LEDs above the band centre (the band's upper rows are longer)

# ---- brightness
GHOST = 73            # text the scan hasn't reached yet; also the first and last frame
FULL = 255
HALF = 109            # the second ('cyan') copy
SCAN_TRAIL = 73       # 1-frame afterimage behind the scanline (0 = none)
TEAR_BAND = 73        # band lights up during the tear so the whole stripe visibly shears
TEAR_BLOCKS = (182, 255)
STEP_DOWN = 146       # settle after the rebuild: FULL -> STEP_DOWN -> GHOST

# ---- timeline (frame numbers at 20 fps)
N_FRAMES = 80
SCAN = (0, 16)        # bar runs from just off the left end (f0) to past the right end (f16)
SCAN_WIDTH = 3        # LEDs
SPLIT = (20, 40)
SPLIT_HOLD = 2        # frames per jitter position
SPLIT_GAP = (2, 3)    # LEDs between the two copies
SPLIT_MAX = 3         # max LEDs a copy moves from home (the slanted ends crop beyond that)
TEAR = (40, 58)
TEAR_RECUT = 49       # the slices are re-cut here
TEAR_OFFSETS = [0, 1, 1, 2, 3, 3, 5, 5, 8, 2, 3, 3, 5, 8, 8, 12, 17, 24]   # LEDs, one per tear frame
FLASH = (58, 60)      # full white, exactly 2 frames
REBUILD = (60, 72)    # static thins out while the text cells pop back in
NOISE_START = 0.6     # share of LEDs lit by static at the start of the rebuild
SETTLE = 76           # f72-75 full text, f76 STEP_DOWN, f77-79 ghost

KEY_FRAMES = [("scan", 7), ("split", 25), ("split", 33), ("tear", 47), ("tear", 56),
              ("flash", 58), ("static", 62), ("rebuild", 68), ("rebuilt", 73), ("settle", 76)]


def setup(ctx, params):
    s, p = ctx.s, ctx.p
    ctx.rows = K.text_bitmap(TEXT, WORD_GAP)
    ctx.cells = K.bitmap_cells(ctx.rows)
    w, h = len(ctx.rows[0]) * p, len(ctx.rows) * p
    ctx.ty = s.ST / 2 - h / 2 - RAISE * p
    lo, hi = K.safe_span(s, ctx.ty, ctx.ty + h, inset=0)
    ctx.tx = (lo + hi) / 2 - w / 2
    ctx.X = K.canvas_x(s)
    ctx.band = K.arr(s.mask)
    ctx.ghost_c = K.arr(s.strip_to_canvas(_text(ctx, GHOST)))
    ctx.full_c = K.arr(s.strip_to_canvas(_text(ctx, FULL)))
    r = ctx.rng("arrive")
    ctx.arrive = [r.randint(REBUILD[0] + 1, REBUILD[1] - 1) for _ in ctx.cells]


def _text(ctx, level, dx=0, dy=0, cells=None):
    """Text in strip space, shifted by (dx, dy) LEDs; optionally only some cells."""
    p = ctx.p
    im = ctx.s.new_strip()
    rows = ctx.rows
    if cells is not None:
        keep = set(cells)
        rows = ["".join("#" if (r, c) in keep else " " for c in range(len(row))) for r, row in enumerate(rows)]
    return K.draw_bitmap(im, rows, ctx.tx + dx * p, ctx.ty + dy * p, p, level)


def _scan_x(ctx, f):
    f0, f1 = SCAN
    bw = SCAN_WIDTH * ctx.p
    return -bw + (ctx.s.W + bw) * (f - f0) / (f1 - f0)


def _split_pose(ctx, i):
    r = ctx.rng("split", (i - SPLIT[0]) // SPLIT_HOLD)
    while True:
        bright_dx = r.choice([-1, 0, 1])
        half_dx = bright_dx + r.choice(SPLIT_GAP) * r.choice([-1, 1])
        if abs(half_dx) <= SPLIT_MAX:
            break
    half_dy = r.choice([0, 0, -1])
    if abs(half_dx) == SPLIT_MAX:
        half_dy = -1          # widest offsets ride 1 LED higher, where the band's rows are longer
    return bright_dx, half_dx, half_dy


def _tear(ctx, i):
    s, p = ctx.s, ctx.p
    strip = _text(ctx, FULL)
    r = ctx.rng("blocks", (i - TEAR[0]) // 3)
    lo, hi = s.strip_span()
    d = ImageDraw.Draw(strip)
    for _ in range(r.randint(3, 5)):
        bw, bh = r.randint(2, 7) * p, r.randint(1, 2) * p
        bx, by = r.uniform(lo, hi - bw), r.uniform(0, s.ST - bh)
        d.rectangle([bx, by, bx + bw, by + bh], fill=r.choice(TEAR_BLOCKS))
    c = np.maximum(K.arr(s.strip_to_canvas(strip)), (ctx.band.astype(np.uint16) * TEAR_BAND // 255).astype(np.uint8))
    rs = ctx.rng("slices", 0 if i < TEAR_RECUT else 1)
    off = TEAR_OFFSETS[i - TEAR[0]]
    out = np.zeros_like(c)
    y, j = 0.0, 0
    while y < s.H:
        y1 = y + rs.choice([2, 3]) * p
        a, b = int(round(y)), min(s.H, int(round(y1)))
        dx = int(round(off * p * rs.choice([0.6, 1.0, 1.0, 1.6]))) * (1 if j % 2 == 0 else -1)
        seg = c[a:b]
        if dx > 0:
            out[a:b, dx:] = seg[:, :-dx]
        elif dx < 0:
            out[a:b, :dx] = seg[:, -dx:]
        else:
            out[a:b] = seg
        y, j = y1, j + 1
    return out


def _noise(ctx, i, density):
    s, p = ctx.s, ctx.p
    gw, gh = int(s.W / p) + 1, int(s.H / p) + 1
    r = np.random.default_rng((ctx.seed, i))
    a = (r.random((gh, gw)) < density) * r.choice([0.43, 0.71, 1.0], (gh, gw)) * 255
    return K.arr(K.img(a).resize((s.W, s.H), 0))


def _render(ctx, i):
    """(canvas array, important strip image or None) for frame i."""
    s, p = ctx.s, ctx.p
    i %= N_FRAMES
    if i < SPLIT[0]:                                   # scanline reveal
        bw = SCAN_WIDTH * p
        xl = _scan_x(ctx, min(i, SCAN[1]))
        X = ctx.X
        a = np.where(X < xl, ctx.full_c, ctx.ghost_c)
        a = np.where((X >= xl) & (X < xl + bw), FULL, a)
        if SCAN_TRAIL and SCAN[0] < i <= SCAN[1]:
            xp = _scan_x(ctx, i - 1)
            a = np.maximum(a, ((X >= xp) & (X < xp + bw)) * SCAN_TRAIL)
        return a, _text(ctx, FULL)
    if i < SPLIT[1]:                                   # bright / half-bright split
        bdx, hdx, hdy = _split_pose(ctx, i)
        strip = K.vmax(_text(ctx, HALF, hdx, hdy), _text(ctx, FULL, bdx, 0))
        return K.arr(s.strip_to_canvas(strip)), K.vmax(_text(ctx, FULL, hdx, hdy), _text(ctx, FULL, bdx, 0))
    if i < TEAR[1]:                                    # horizontal tear
        return _tear(ctx, i), None
    if i < FLASH[1]:                                   # full white
        return np.full((s.H, s.W), FULL, np.uint8), None
    if i < REBUILD[1]:                                 # static -> text
        k = (i - REBUILD[0]) / (REBUILD[1] - REBUILD[0])
        cells = [c for c, f in zip(ctx.cells, ctx.arrive) if f <= i]
        strip = _text(ctx, FULL, cells=cells)
        return np.maximum(_noise(ctx, i, NOISE_START * (1 - k)), K.arr(s.strip_to_canvas(strip))), strip
    if i < SETTLE:
        return ctx.full_c, _text(ctx, FULL)
    if i == SETTLE:
        return K.arr(s.strip_to_canvas(_text(ctx, STEP_DOWN))), _text(ctx, FULL)
    return ctx.ghost_c, _text(ctx, FULL)             # = frame 0


def frame(ctx, i, t):
    return K.img(_render(ctx, i)[0])


def important(ctx, i, t):
    return _render(ctx, i)[1]
