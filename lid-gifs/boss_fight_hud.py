"""BOSS FIGHT HUD - ROG Strix SCAR 18 (G835) AniMe Vision lid animation.

6.0 s loop at 20 fps = 120 frames (1 frame = 50 ms). Bold blocks, high contrast,
readable across a room.

  f0      empty health bar (dim track with tick notches) = also the last frames
  f1-11   bar fills in from the left, one tick segment per frame
  f20-75  hits: white flash, the lost chunk drains in stutter steps, damage
          numbers pop up above the bar and blink out
  f76-85  near-zero sliver blinks
  f86-97  a solid upright wipe sweeps across and leaves "GG" behind it
  f98-109 GG holds
  f110-117 a second wipe clears GG back to the empty bar -> refill = frame 1

The bar's ends are slanted parallel to the band's own ends, so it fills the
stripe's real shape instead of a rectangle that the slant would crop.
Edit the constants below, then run:  python build.py boss_fight_hud
Brightness steps the lid shows: 0, 36, 73, 109, 146, 182, 219, 255.
"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lidkit as K  # noqa: E402

SPACE = "canvas"
N_FRAMES = 120

# ---- brightness
TRACK = 36            # empty part of the bar
FILL = 182            # health
HIT = 255             # damage flash / chunk being knocked off
DRAIN = 109           # chunk mid-drain
FLASH_BAND = 73       # whole stripe pops on the hit frame
NUMBER = 255
GG_LEVEL = 255
WIPE = 255

# ---- layout (LEDs; y across the band from its outer edge, band is ~14.4 LEDs across)
BAR_TOP = 9.0
BAR_H = 4.0
BAR_INSET = 1.6       # LEDs between the bar's slanted ends and the band's ends (room for the shake)
TICKS = 10            # segments; notches between them
TICK_ROWS = 2         # notch depth from the bar's top edge, LEDs
TICK_W = 1.0
NUM_TOP = 0.8         # damage numbers (5x7 LED font, 7 LEDs tall) sit here, above the bar
GG_GAP = 3            # LEDs between the two G's
WIPE_W = 6.0          # wipe block width, LEDs

# ---- timeline (frame numbers at 20 fps)
FILL_END = 11         # f1..f10 add one segment each, f11 settles
# (frame, share of the bar lost, damage number or None, shake)
HITS = [(20, 0.16, "24", False), (29, 0.10, None, False), (33, 0.10, "15", False),
        (46, 0.22, "99", True), (59, 0.12, None, False), (66, 0.12, "18", False),
        (71, 0.12, None, False)]
NUM_SHOW = [1, 2, 3, 4, 5, 6, 8]   # frames after the hit where the number is lit (pops on, blinks out)
BLINK = (76, 86)      # near-zero sliver: 2 frames on, 2 off
WIPE_IN = (86, 98)
GG_HOLD = (98, 110)
WIPE_OUT = (110, 118)

KEY_FRAMES = [("filling", 5), ("full", 15), ("hit flash", 20), ("chunk", 21), ("stutter", 22),
              ("crit 99", 48), ("drained", 74), ("low blink", 77), ("wipe", 91), ("GG", 103), ("wipe out", 113)]


def setup(ctx, params):
    s, p = ctx.s, ctx.p
    y0, y1 = int(round(BAR_TOP * p)), int(round((BAR_TOP + BAR_H) * p))
    inside = K.ends_mask(s, BAR_INSET)
    bar = np.zeros((s.ST, s.SL), bool)
    bar[y0:y1] = inside[y0:y1]
    xs = np.arange(s.SL, dtype=np.float32)
    fx = np.full((s.ST, s.SL), -1.0, np.float32)     # 0..1 position along each bar row
    for y in range(y0, y1):
        cols = np.nonzero(bar[y])[0]
        if not len(cols):
            raise ValueError("the bar runs off the band - lower BAR_TOP / BAR_H or BAR_INSET")
        lo, n = cols.min(), cols.max() - cols.min() + 1
        fx[y] = (xs - lo) / n
    ticks = np.zeros_like(bar)
    for k in range(1, TICKS):
        ticks |= bar & (np.abs(fx - k / TICKS) * _row_len(bar) < TICK_W * p / 2)
    ticks[int(round((BAR_TOP + TICK_ROWS) * p)):] = False
    ctx.bar, ctx.fx, ctx.ticks, ctx.bar_rows = bar, fx, ticks, (y0, y1)
    top = np.nonzero(bar[y0])[0]
    ctx.top_lo, ctx.top_len = top.min(), top.max() - top.min() + 1
    ctx.X = K.canvas_x(s)
    # GG
    gg = K.hcat([K.BIG_G, K.BIG_G], GG_GAP)
    gw, gh = len(gg[0]) * p, len(gg) * p
    gy = (s.ST - gh) / 2
    lo, hi = K.safe_span(s, gy, gy + gh, inset=1.0)
    ctx.gg = K.draw_bitmap(s.new_strip(), gg, (lo + hi) / 2 - gw / 2, gy, p, GG_LEVEL)
    ctx.gg_c = K.arr(s.strip_to_canvas(ctx.gg))
    empty, _ = _hud(ctx, 0)
    ctx.empty_c = K.arr(s.strip_to_canvas(empty))
    # health before each hit
    hp, ctx.hp_before = 1.0, []
    for _, loss, _, _ in HITS:
        ctx.hp_before.append(hp)
        hp -= loss
    ctx.hp_final = hp


def _row_len(bar):
    n = np.zeros(bar.shape, np.float32)
    for y in np.nonzero(bar.any(axis=1))[0]:
        cols = np.nonzero(bar[y])[0]
        n[y] = cols.max() - cols.min() + 1
    return n


def _bar(ctx, fill, chunk=None, flash=False, dx=0):
    """Strip array of the bar: fill share 0..1, chunk = (from, to, level)."""
    bar, fx = ctx.bar, ctx.fx
    a = np.zeros(bar.shape, np.uint8)
    a[bar] = TRACK
    a[bar & (fx < fill - 1e-6)] = FILL
    if chunk:
        a[bar & (fx >= chunk[0] - 1e-6) & (fx < chunk[1] - 1e-6)] = chunk[2]
    if flash:
        a[bar] = HIT
    a[ctx.ticks] = 0
    if dx:
        a = np.roll(a, int(round(dx * ctx.p)), axis=1)
    return a


def _hud(ctx, i):
    """(strip image of the HUD, important strip image) for HUD frames."""
    s, p = ctx.s, ctx.p
    shape_dx, band = 0, 0
    if i == 0:
        a = _bar(ctx, 0.0)
    elif i < FILL_END:
        k = min(i, TICKS) / TICKS
        a = _bar(ctx, k, (k - 1 / TICKS, k, HIT) if i <= TICKS else None)
    elif i < HITS[0][0]:
        a = _bar(ctx, 1.0)
    elif i >= BLINK[0]:
        on = ((i - BLINK[0]) // 2) % 2 == 0
        a = _bar(ctx, ctx.hp_final, (0, ctx.hp_final, HIT)) if on else _bar(ctx, 0.0)
    else:
        h = max(k for k, hit in enumerate(HITS) if hit[0] <= i)
        f0, loss, _, shake = HITS[h]
        before, r = ctx.hp_before[h], i - f0
        after = before - loss
        if shake and r < 2:
            shape_dx = 1 if r == 0 else -1
        if r == 0:
            a, band = _bar(ctx, before, flash=True, dx=shape_dx), FLASH_BAND
        elif r == 1:
            a = _bar(ctx, after, (after, before, HIT), dx=shape_dx)
        elif r < 4:
            a = _bar(ctx, after, (after, after + loss / 2, DRAIN))
        else:
            a = _bar(ctx, after)
    bar_now = np.roll(ctx.bar, int(round(shape_dx * p)), 1)
    strip = np.maximum(a, np.where(bar_now, 0, band).astype(np.uint8)) if band else a
    imp = bar_now.astype(np.uint8) * 255
    for f0, loss, num, _ in HITS:
        r = i - f0
        if num is None or r not in NUM_SHOW:
            continue
        h = [x[0] for x in HITS].index(f0)
        mid = ctx.hp_before[h] - loss / 2
        rows = K.text_bitmap(num)
        w = len(rows[0]) * p
        y = NUM_TOP * p
        lo, hi = K.safe_span(s, y, y + len(rows) * p, inset=1.0)
        x = min(max(ctx.top_lo + mid * ctx.top_len - w / 2, lo), hi - w)
        num_img = K.draw_bitmap(s.new_strip(), rows, x, y, p, NUMBER)
        strip = np.maximum(strip, K.arr(num_img))
        imp = np.maximum(imp, K.arr(num_img))
    return K.img(strip), K.img(imp)


def _render(ctx, i):
    s, p = ctx.s, ctx.p
    i %= N_FRAMES
    if i < WIPE_IN[0]:
        strip, imp = _hud(ctx, i)
        return K.arr(s.strip_to_canvas(strip)), imp
    ww = WIPE_W * p
    X = ctx.X
    if i < WIPE_IN[1]:
        hud = K.arr(s.strip_to_canvas(_hud(ctx, BLINK[0] + (i - BLINK[0]) % 4)[0]))
        xl = -ww + (s.W + ww) * (i - WIPE_IN[0] + 1) / (WIPE_IN[1] - WIPE_IN[0] + 1)
        a = np.where(X < xl, ctx.gg_c, hud)
        a = np.where((X >= xl) & (X < xl + ww), WIPE, a)
        return a.astype(np.uint8), K.vmax(ctx.gg, K.img(ctx.bar.astype(np.uint8) * 255))
    if i < GG_HOLD[1]:
        return ctx.gg_c, ctx.gg
    if i < WIPE_OUT[1]:
        xl = -ww + (s.W + ww) * (i - WIPE_OUT[0] + 1) / (WIPE_OUT[1] - WIPE_OUT[0] + 1)
        a = np.where(X < xl, ctx.empty_c, ctx.gg_c)
        a = np.where((X >= xl) & (X < xl + ww), WIPE, a)
        return a.astype(np.uint8), K.vmax(ctx.gg, K.img(ctx.bar.astype(np.uint8) * 255))
    return ctx.empty_c, K.img(ctx.bar.astype(np.uint8) * 255)     # = frame 0


def frame(ctx, i, t):
    return K.img(_render(ctx, i)[0])


def important(ctx, i, t):
    return _render(ctx, i)[1]
