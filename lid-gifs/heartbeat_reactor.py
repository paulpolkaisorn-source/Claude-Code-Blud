"""ANIMATION 2 - HEARTBEAT TO REACTOR (5.0 s @ 20 fps = 100 frames, seamless loop).

Run:  python3 heartbeat_reactor.py
White-only LEDs: the "dim red -> hot orange -> white" arc is brightness steps
(LOW -> HALF -> BRIGHT -> FULL).  Edit the timing constants to retime.
"""
import numpy as np
from PIL import Image, ImageDraw
from lidkit import *   # noqa: F401,F403

YC = 6                      # baseline occupies rows YC, YC+1 (centre of the band)
SCROLL = 3                  # LED columns per frame; dash period 6 -> 100 frames = whole cycles
PERIOD = 6                  # 5 on, 1 off
BEATS = [(6, 3, HIGH), (20, 4, BRIGHT), (30, 6, FULL)]   # (spawn frame, height, level) - gaps 14 then 10
BARS = range(52, 72)        # line becomes symmetrical visualiser
BOLT = range(72, 82)        # lightning bolt peak
COLLAPSE_END = 88           # bars fully collapsed by here, then baseline steps back down
CX = 29                     # mirror axis of the visualiser (centre of the always-lit area)


def baseline_level(f):
    if f < BEATS[1][0]:
        return MID
    if f < BEATS[2][0]:
        return HALF
    if f < 92:
        return BRIGHT
    return HALF if f < 96 else MID


def draw_baseline(g, f, level):
    off = (SCROLL * f) % PERIOD
    for x in range(N):
        if (x + off) % PERIOD < 5:
            g[YC:YC + 2, x] = np.maximum(g[YC:YC + 2, x], level)


def draw_spike(g, sx, h, level):
    dd = h // 2 + 1
    cols = {-1: -h, 0: -h, 1: dd, 2: dd}
    for dx, o in cols.items():
        x = sx + dx
        if not 0 <= x < N:
            continue
        if o < 0:
            g[YC + o:YC + 2, x] = level
        else:
            g[YC:YC + 2 + o, x] = level


def draw_bars(g, amp, phase, level):
    if amp <= 0:
        return
    for j in range(9):
        wave = 0.35 + 0.65 * (0.5 + 0.5 * np.cos(2 * np.pi * (j / 9.0 - phase)))
        h = int(round(amp * wave * (1 - 0.35 * j / 8)))
        for x0 in (CX + 3 * j, CX - 2 - 3 * j):
            g[YC - h:YC + 2 + h, x0:x0 + 2] = np.maximum(g[YC - h:YC + 2 + h, x0:x0 + 2], level)


def bolt_mask():
    im = Image.new("L", (N, M), 0)
    pts = [(5, 6), (14, 1), (24, 10), (33, 1), (43, 10), (54, 5)]
    d = ImageDraw.Draw(im)
    d.line(pts, fill=255, width=3, joint="curve")
    return np.asarray(im) > 0


BM = bolt_mask()
frames = []
for f in range(100):
    g = blank()
    if f < BARS.start:
        draw_baseline(g, f, baseline_level(f))
        for bf, h, lv in BEATS:
            sx = 58 - SCROLL * (f - bf)
            if f >= bf and sx > -4:
                draw_spike(g, sx, h, lv)
    elif f in BARS:
        k = f - BARS.start
        amp = min(5.0, 0.8 + k * 0.55)
        draw_bars(g, amp, k / 8.0, FULL if k > 5 else BRIGHT)
    elif f in BOLT:
        k = f - BOLT.start
        if k == 0:
            g[:] = LOW                       # ignition flash under the bolt
        elif k % 2 == 0:
            draw_bars(g, 5.0, (f - BARS.start) / 8.0, LOW)
        g[BM] = FULL
    else:
        k = f - BOLT.stop
        amp = 5.0 * (1 - k / 6.0)
        if f < COLLAPSE_END:
            draw_bars(g, amp, (f - BARS.start) / 8.0, FULL if amp > 2 else HALF)
            draw_baseline(g, f, MID) if amp <= 0 else None
        else:
            draw_baseline(g, f, baseline_level(f))
    frames.append(to_frame(g))

if __name__ == "__main__":
    build("heartbeat_reactor", frames)
