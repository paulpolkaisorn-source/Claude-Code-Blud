"""Clawd Walk: Clawd scuttles from the top-left tip to the bottom-right tip, once per loop.

The scene uses this file twice with identical motion: {"pocket": true} on a
subtract layer (black pocket round him), then the default on an over layer (Clawd).
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from clawd import POSES, draw_clawd, draw_pocket, upright_anchor  # noqa: E402

SPACE = "canvas"

# Blink eyes (rows 0-7 of "blink") on top of walk legs (rows 8-9), so the legs
# keep stepping through the blink.
POSES["blink_walk_a"] = POSES["blink"][:8] + POSES["walk_a"][8:]
POSES["blink_walk_b"] = POSES["blink"][:8] + POSES["walk_b"][8:]

X_START, X_END = -100.0, 660.0  # canvas x of his centre at t=0 and t->1 (off the band both times)
STEP = 3                        # frames per walk step: walk_a x3, walk_b x3, ...
BLINK_AT = 0.5                  # blink begins at this fraction of the loop
BLINK_FRAMES = 3
BOB_LIFT = 0.5                  # walk_b sits this many LEDs higher


def setup(ctx, params):
    ctx.pocket = bool(params.get("pocket", False))


def _state(ctx, i, t):
    x = X_START + (X_END - X_START) * t
    phase = (i // STEP) % 2     # 0 = walk_a, 1 = walk_b
    b0 = int(round(BLINK_AT * ctx.n))
    blinking = b0 <= i < b0 + BLINK_FRAMES
    if blinking:
        pose = "blink_walk_b" if phase else "blink_walk_a"
    else:
        pose = "walk_b" if phase else "walk_a"
    return x, pose, (BOB_LIFT if phase else 0.0)


def frame(ctx, i, t):
    s, p = ctx.s, ctx.p
    img = s.new_canvas()
    x, pose, lift = _state(ctx, i, t)
    # anchor on "idle" every frame so the body never shifts; only legs and eyes change
    cx, by = upright_anchor(s, x, "idle", cell=p, lift=lift)
    if ctx.pocket:
        draw_pocket(img, pose, cx, by, p, pad_cells=1)
    else:
        draw_clawd(img, pose, cx, by, p)
    return img
