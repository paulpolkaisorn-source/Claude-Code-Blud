"""HEARTBEAT TO REACTOR - ROG Strix SCAR 18 (G835) AniMe Vision lid animation.

5.0 s loop at 20 fps = 100 frames (1 frame = 50 ms). The lid is white-only, so the
brief's dim red -> hot orange -> white arc is a brightness climb here.

  f0-46   flat line on a heart monitor (head sweeps along the band, erasing ahead);
          three beats, each taller, narrower and sooner than the last
  f47-53  the line snaps into bar segments that grow out of it
  f54-70  mirrored visualizer bars; three pulses race outward from the band's middle,
          then every bar maxes out
  f71-77  one huge lightning bolt fires tip to tip, flickers, burns down
  f78-85  bars collapse back into the flat line
  f86-99  flat line again, head exactly where frame 0 expects it (seamless)

Edit the constants below, then run:  python build.py heartbeat_reactor
Brightness steps the lid shows: 0, 36, 73, 109, 146, 182, 219, 255.
"""
import os
import sys

import numpy as np
from PIL import ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lidkit as K  # noqa: E402

SPACE = "canvas"
N_FRAMES = 100
CLIP = 0.5            # LEDs kept clear of the band edge for everything important

# ---- heart monitor
BASE = 109            # flat line ("dim red")
TRAIL = 182           # trace drawn in the last TRAIL_FRAMES frames
HEAD = 255
LINE = 2.0            # line thickness, LEDs
HEAD_SIZE = 2.0       # LEDs
PASS_FRAMES = 25      # head crosses the band every 25 frames = 4 passes per loop (seamless)
PHASE = 0.05          # head start offset (fraction of a pass); moves where the beats land
TRAIL_FRAMES = 3
ERASE = 2.0           # LEDs blanked just ahead of the head
MON_INSET = 1.6       # LEDs between the line ends and the band ends
# (peak frame, spike up LEDs, dip down LEDs, half-width frames, level, glow level, glow frames)
BEATS = [(16, 3.0, 1.0, 3.0, 146, 0, 0),
         (29, 4.3, 1.5, 2.4, 219, 36, 1),
         (39, 5.3, 2.0, 1.8, 255, 73, 2)]
SPIKE_X = [-1, -0.35, 0, 0.35, 0.7]   # spike knots in half-widths: start, Q dip, R peak, S dip, back to flat

# ---- visualizer
MORPH = 47            # the line snaps into bar segments
BARS = 11
BAR_W = 2.0           # LEDs
BAR_PITCH = 4.0       # LEDs centre to centre (2-LED gaps)
HMAX = 6.5            # tallest half-height, LEDs (also limited by the band shape per bar)
MORPH_STEPS = [(1.0, 146), (1.0, 146), (1.5, 182), (1.5, 182), (2.0, 182), (1.5, 182), (1.0, 182)]
PULSES = [(54, 0.55, 182), (59, 0.8, 219), (63, 1.0, 255)]   # (emit frame, height share, level)
PULSE_DELAY = 1       # frames for a pulse to move one bar outward
PULSE_DECAY = [1.0, 0.75, 0.5, 0.3, 0.15]
FLOOR_LEVEL = 146     # bars between pulses (1 LED half-height)
CHARGE = (68, 71)     # every bar at full height and level 255
BOLT_BARS = 36        # bars sink to this level while the bolt fires, so the bolt reads
COLLAPSE_START = 78   # (height share, level) per frame from here; then flat segments
COLLAPSE = [(0.7, 182), (0.5, 146), (0.35, 146), (0.2, 109), (0.0, 109)]
MONITOR_BACK = 86     # the heart monitor returns

# ---- lightning bolt (path in LEDs: x along the band from the top-left tip, y across from the outer edge)
BOLT_PATH = [(3.5, 1.8), (17, 9.5), (14.5, 5.5), (30, 12), (27.5, 7.5), (43, 11), (40.5, 6.5), (57.5, 1.8)]
BOLT_W = 2.4          # core thickness, LEDs
BOLT_HALO = 73        # 1-LED dim outline that separates the bolt from the bars
# frame: (share of the path drawn, core level, band flash level)
BOLT = {71: (0.5, 255, 109), 72: (1.0, 255, 73), 73: (1.0, 255, 0), 74: (0.0, 0, 0),
        75: (1.0, 255, 0), 76: (1.0, 146, 0), 77: (1.0, 73, 0)}

KEY_FRAMES = [("flat", 8), ("beat 1", 17), ("beat 2", 30), ("beat 3", 40), ("segments", 49),
              ("pulse", 60), ("pulse", 66), ("charged", 69), ("bolt fires", 71), ("bolt", 73),
              ("collapse", 79), ("line", 84)]


def setup(ctx, params):
    s, p = ctx.s, ctx.p
    ctx.yc = s.ST / 2
    ctx.X0, ctx.X1 = K.safe_span(s, ctx.yc - LINE / 2 * p, ctx.yc + LINE / 2 * p, inset=MON_INSET)
    ctx.L = ctx.X1 - ctx.X0
    # place the bar row where the band leaves the most room, keeping it mirror-symmetric
    bottom = K.column_bottom(s, CLIP)
    up = ctx.yc / p - CLIP

    def room(xc):
        x0, x1 = int(xc - BAR_W / 2 * p), int(xc + BAR_W / 2 * p)
        if x0 < 0 or x1 >= s.SL or bottom[x0:x1 + 1].min() < 0:
            return 0.0
        return min(up, (bottom[x0:x1 + 1].min() - ctx.yc) / p)

    best = None
    for xc in np.arange(s.SL * 0.3, s.SL * 0.6, p / 4):
        hs = [min(room(xc + d * BAR_PITCH * p), room(xc - d * BAR_PITCH * p), HMAX)
              for d in range(-(BARS // 2), BARS // 2 + 1)]
        if min(hs) >= 1.0 and (best is None or sum(hs) > best[0]):
            best = (sum(hs), xc, hs)
    if best is None:
        raise ValueError("visualizer bars don't fit the band - lower BARS or BAR_PITCH")
    ctx.Xc, ctx.hmax = best[1], best[2]
    pts = [(u * p, v * p) for u, v in BOLT_PATH]
    seg = [np.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(pts, pts[1:])]
    ctx.bolt, ctx.bolt_len = pts, np.cumsum([0] + seg)


def _sig(tau):
    """(height in LEDs, level) of the heart signal at loop time tau (frames)."""
    for fb, up, down, w, lv, _, _ in BEATS:
        rel = (tau - fb + N_FRAMES / 2) % N_FRAMES - N_FRAMES / 2
        if -w < rel < w:
            v = np.interp(rel / w, SPIKE_X, [0, -0.2 * up, up, -down, 0])
            return float(v), lv
    return 0.0, 0


def _monitor(ctx, i, strip, imp):
    p, L, X0 = ctx.p, ctx.L, ctx.X0
    d, di = ImageDraw.Draw(strip), ImageDraw.Draw(imp)
    xh = X0 + ((i / PASS_FRAMES + PHASE) % 1.0) * L
    step = p / 3
    pts = []
    for k in range(int(L / step) + 2):
        x = X0 + min(k * step, L)
        ahead = (x - xh) % L
        if 0 < ahead <= ERASE * p:
            pts.append(None)
            continue
        back = ((xh - x) % L) / L * PASS_FRAMES
        v, lv = _sig(i - back)
        lv = lv or BASE
        if back <= TRAIL_FRAMES:
            lv = max(lv, TRAIL)
        pts.append((x, ctx.yc - v * p, lv, back))
    segs = [(max(a[2], b[2]), a[:2], b[:2]) for a, b in zip(pts, pts[1:])
            if a and b and abs(a[3] - b[3]) < PASS_FRAMES / 2]
    w = round(LINE * p)
    for lv, a, b in sorted(segs, key=lambda q: q[0]):
        for dr, fill in ((d, lv), (di, 255)):
            dr.line([a, b], fill=fill, width=w)
            for x, y in (a, b):
                dr.ellipse([x - w / 2 + 1, y - w / 2 + 1, x + w / 2 - 1, y + w / 2 - 1], fill=fill)
    hv, _ = _sig(i)
    hy, hs = ctx.yc - hv * p, HEAD_SIZE * p / 2
    for dr, fill in ((d, HEAD), (di, 255)):
        dr.rectangle([xh - hs, hy - hs, xh + hs - 1, hy + hs - 1], fill=fill)


def _bar_heights(ctx, i):
    """[(half-height LEDs, level)] per bar."""
    if i < PULSES[0][0]:
        h, lv = MORPH_STEPS[i - MORPH]
        return [(h, lv)] * BARS
    if i >= COLLAPSE_START + len(COLLAPSE):
        return [(1.0, BASE)] * BARS
    if CHARGE[0] <= i < COLLAPSE_START:
        lv = BOLT_BARS if i in BOLT else 255
        return [(np.floor(hm * 2) / 2, lv) for hm in ctx.hmax]
    out = []
    for j in range(BARS):
        hm = ctx.hmax[j]
        if i >= COLLAPSE_START:
            share, lv = COLLAPSE[i - COLLAPSE_START]
        else:
            share, lv = 0.0, FLOOR_LEVEL
            dist = abs(j - BARS // 2)
            for emit, amp, plv in PULSES:
                a = i - (emit + dist * PULSE_DELAY)
                if 0 <= a < len(PULSE_DECAY) and amp * PULSE_DECAY[a] > share:
                    share, lv = amp * PULSE_DECAY[a], plv
        h = max(1.0, np.floor(share * hm * 2) / 2)      # whole half-LED steps, never past the band
        out.append((h, lv if share * hm > 1.0 or i >= COLLAPSE_START else FLOOR_LEVEL))
    return out


def _bolt_points(ctx, share):
    pts, cum = ctx.bolt, ctx.bolt_len
    if share >= 1.0:
        return pts
    stop = share * cum[-1]
    out = [pts[0]]
    for k in range(1, len(pts)):
        if cum[k] <= stop:
            out.append(pts[k])
        else:
            f = (stop - cum[k - 1]) / (cum[k] - cum[k - 1])
            a, b = pts[k - 1], pts[k]
            out.append((a[0] + f * (b[0] - a[0]), a[1] + f * (b[1] - a[1])))
            break
    return out


def _render(ctx, i):
    s, p = ctx.s, ctx.p
    i %= N_FRAMES
    imp = s.new_strip()
    if i < MORPH or i >= MONITOR_BACK:
        glow = max([g for fb, _, _, _, _, g, gn in BEATS if fb <= i < fb + gn] or [0])
        strip = s.new_strip(glow)
        _monitor(ctx, i, strip, imp)
        return K.arr(s.strip_to_canvas(strip)), imp
    share, core, flash = BOLT.get(i, (0.0, 0, 0))
    strip = s.new_strip(flash)
    d, di = ImageDraw.Draw(strip), ImageDraw.Draw(imp)
    for j, (h, lv) in enumerate(_bar_heights(ctx, i)):
        xc = ctx.Xc + (j - BARS // 2) * BAR_PITCH * p
        box = [xc - BAR_W / 2 * p, ctx.yc - h * p, xc + BAR_W / 2 * p - 1, ctx.yc + h * p - 1]
        d.rectangle(box, fill=lv)
        di.rectangle(box, fill=255)
    if share > 0 and core > 0:
        pts = _bolt_points(ctx, share)
        if core == 255 and BOLT_HALO:
            d.line(pts, fill=BOLT_HALO, width=round((BOLT_W + 2) * p), joint="curve")
        for dr, fill in ((d, core), (di, 255)):
            dr.line(pts, fill=fill, width=round(BOLT_W * p), joint="curve")
    return K.arr(s.strip_to_canvas(strip)), imp


def frame(ctx, i, t):
    return K.img(_render(ctx, i)[0])


def important(ctx, i, t):
    return _render(ctx, i)[1]
