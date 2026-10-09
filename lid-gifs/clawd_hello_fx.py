"""Clawd hello layers for the SCAR 18 lid (used by clawd_hello_intro/loop/.json).

Used as a custom layer:
  {"effect": "custom", "params": {"file": "lid-gifs/clawd_hello_fx.py", "params": {...}}}

params:
  mode    "drop"   Clawd falls from above onto x (gravity, whole-LED steps), squishes
                   on landing and then stands still (intro segment C)
          "idle"   Clawd stands, dips 1 LED and back (2 whole cycles), blinks twice and
                   glances right once at the prompt (loop)
          "flash"  full-band flash on the landing frame, decays over 3 frames
                   (intro segment C, bottom layer)
  pocket  true     draw the black pocket under Clawd instead of Clawd (a subtract layer
                   placed under his own layer). Same motion as the body copy.
  x       canvas column of his feet (default 90)
  land    drop / flash: frame index of the landing (default 17)
  lift0   drop: start height in LEDs (default 14)

Body and pocket copies compute identical motion from (i, n, params).
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from clawd import draw_clawd, draw_pocket, upright_anchor  # noqa: E402

SPACE = "canvas"

FLASH = (255, 182, 109, 36)   # landing frame, then three decay frames
SQUISH_FRAMES = 2             # squash on the landing frame and the one after
BLINK_STARTS = (10, 50)       # idle loop: two blinks
BLINK_LEN = 3                 # frames per blink
GLANCE_START, GLANCE_LEN = 28, 10   # idle loop: eyes glance right at the prompt, once
BOB_CYCLES = 2                # whole bob cycles per segment (seamless loop)


def setup(ctx, params):
    ctx.mode = params.get("mode", "idle")
    ctx.pocket = bool(params.get("pocket", False))
    ctx.x = float(params.get("x", 90))
    ctx.land = int(params.get("land", 17))
    ctx.lift0 = int(params.get("lift0", 14))


def _drop_lift(ctx, i):
    # Starts at rest at lift0 LEDs and accelerates to 0 at the landing frame (y = h(1 - (t/T)^2)).
    k = i / float(ctx.land)
    return int(math.floor(ctx.lift0 * (1.0 - k * k) + 0.5))


def _state(ctx, i):
    """(pose, lift in LEDs) for frame i. The feet always sit on the idle ground line."""
    if ctx.mode == "drop":
        if i < ctx.land:
            return "idle", _drop_lift(ctx, i)
        if i < ctx.land + SQUISH_FRAMES:
            return "squish", 0
        return "idle", 0
    # idle loop: periodic in n, so the loop is seamless. Rest is lift 0 (top of the
    # slanted band, where his head corner fits); the bob dips 1 LED down, because
    # lifting him 1 LED pushes the head's top-right LED off the band edge.
    n = ctx.n
    lift = -1 if ((i * BOB_CYCLES) % n) * 2 >= n else 0
    pose = "idle"
    if any(s0 <= i < s0 + BLINK_LEN for s0 in BLINK_STARTS):
        pose = "blink"
    if GLANCE_START <= i < GLANCE_START + GLANCE_LEN:
        pose = "look_r"
    return pose, lift


def _flash_level(ctx, i):
    k = i - ctx.land
    return FLASH[k] if 0 <= k < len(FLASH) else 0


def frame(ctx, i, t):
    s, p = ctx.s, ctx.p
    if ctx.mode == "flash":
        return s.new_canvas(_flash_level(ctx, i))
    pose, lift = _state(ctx, i)
    cx, by = upright_anchor(s, ctx.x, "idle", lift=lift)
    img = s.new_canvas()
    if ctx.pocket:
        draw_pocket(img, pose, cx, by, p)
    else:
        draw_clawd(img, pose, cx, by, p)
    return img
