"""Clawd for the 'Clawd Nameplate' scene (lid-gifs/clawd_nameplate.json).

The scene uses this file twice with identical placement computed from (i, t):
  {"pocket": true} -> 'subtract' layer: clears a 1-LED dark moat around Clawd's
                      outline (eyes included), so the slashes and CLAWD never touch him.
  {}               -> 'over' layer: Clawd himself.

Motion (one 3 s segment, seamless): a 1-LED bob with 3 whole cycles, one 3-frame
blink and one 8-frame glance to the right (toward the text).
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import ImageDraw  # noqa: E402
from clawd import POSES, draw_clawd, upright_anchor  # noqa: E402

SPACE = "canvas"

CX = 88.0           # Clawd's centre column (canvas px); his left arm just fits the band's left end
REST_LIFT = 0.0     # rest height in LEDs (the band-centred fit); the bob swings evenly around it
BOB_AMP = 0.5       # bob amplitude in LEDs (1 LED peak to peak)
BOB_CYCLES = 3      # whole bob cycles per segment, so the loop is seamless
BLINK = range(44, 47)    # 3 frames, eyes shut
GLANCE = range(18, 26)   # 8 frames, eyes looking right


def setup(ctx, params):
    ctx.pocket = bool(params.get("pocket", False))


def _placement(s, i, n):
    """(pose, cx, by) for frame i of n. The anchor always uses 'idle' so the
    blink and glance poses stay at exactly the same spot (no jump)."""
    t = i / n
    lift = REST_LIFT + BOB_AMP * math.sin(2 * math.pi * BOB_CYCLES * t)
    if i in BLINK:
        pose = "blink"
    elif i in GLANCE:
        pose = "look_r"
    else:
        pose = "idle"
    cx, by = upright_anchor(s, CX, "idle", lift=lift)
    return pose, cx, by


def _moat(img, pose, cx, by, cell):
    """Light a 1-cell ring around every lit sprite cell (outline and eyes)."""
    g = POSES[pose]
    rows, cols = len(g), len(g[0])
    left = cx - cols * cell / 2.0
    top = by - rows * cell

    def lit(r, c):
        return 0 <= r < rows and 0 <= c < cols and g[r][c] != "."

    d = ImageDraw.Draw(img)
    for r in range(-1, rows + 1):
        for c in range(-1, cols + 1):
            if any(lit(r + dr, c + dc) for dr in (-1, 0, 1) for dc in (-1, 0, 1)):
                x0, y0 = left + c * cell, top + r * cell
                d.rectangle([x0, y0, x0 + cell - 1, y0 + cell - 1], fill=255)
    return img


def frame(ctx, i, t):
    s, p = ctx.s, ctx.p
    img = s.new_canvas()
    pose, cx, by = _placement(s, i, ctx.n)
    if getattr(ctx, "pocket", False):
        _moat(img, pose, cx, by, p)
    else:
        draw_clawd(img, pose, cx, by, p)
    return img
