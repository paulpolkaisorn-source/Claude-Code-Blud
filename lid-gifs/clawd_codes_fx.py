"""Clawd Codes: Clawd's moves for lid-gifs/clawd_codes.json.

Each Clawd layer (and its pocket copy) works out pose, x and hop from
(act, frame index, segment length) only, so the pocket layer (pocket: true,
blend subtract) and the Clawd layer (blend over) of a segment always land on
the same pixels. The "fade" act is a plain brightness ramp used as a mask so
the code rain can fade in without dimming Clawd.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from clawd import draw_clawd, draw_pocket, upright_anchor  # noqa: E402
from PIL import Image  # noqa: E402

SPACE = "canvas"

STAND_X = 100.0                         # where Clawd stands for coding, glitch and celebrate
HOP = [0.0, 0.7, 1.3, 1.5, 0.9, 0.3]    # lift in LEDs over one 6-frame hop (peak 1.5)


def setup(ctx, params):
    ctx.act = params.get("act", "walk_in")
    ctx.pocket = bool(params.get("pocket", False))
    ctx.fade_in_s = float(params.get("fade_in_s", 0.45))


def _walk(i):
    """walk_a / walk_b every 3 frames (scuttle); walk_b bobs up half an LED."""
    pose = "walk_a" if (i // 3) % 2 == 0 else "walk_b"
    return pose, (0.5 if pose == "walk_b" else 0.0)


def _state(ctx, i):
    """(pose, x, lift) for frame i of this segment."""
    n, act = ctx.n, ctx.act
    if act == "walk_in":
        # enter past the left end (x=-100, hidden), ease-out to a stop at STAND_X
        x = -100.0 + 200.0 * (1.0 - (1.0 - i / n) ** 2)
        if i >= n - 4:                       # last 0.2 s: planted, idle
            return "idle", x, 0.0
        pose, lift = _walk(i)
        return pose, x, lift
    if act == "coding":
        # idle at STAND_X, one blink, then a glance to the right
        if 14 <= i <= 16:
            pose = "blink"
        elif 28 <= i <= 41:
            pose = "look_r"
        else:
            pose = "idle"
        return pose, STAND_X, 0.0
    if act == "glitch":
        # landing squash on the first two frames of the hit, then idle again
        return ("squish" if i < 2 else "idle"), STAND_X, 0.0
    if act == "celebrate":
        # idle <-> cheer every 3 frames, with a small hop every 6
        pose = "cheer" if (i // 3) % 2 == 1 else "idle"
        return pose, STAND_X, HOP[i % len(HOP)]
    if act == "walk_out":
        # leave from STAND_X down the band toward the bottom-right tip (gone by x~560)
        x = STAND_X + 560.0 * (i / n) ** 1.4
        pose, lift = _walk(i)
        return pose, x, lift
    raise ValueError("clawd_codes_fx: unknown act %r" % (act,))


def frame(ctx, i, t):
    s = ctx.s
    if ctx.act == "fade":
        v = 255.0 * min(1.0, (i / ctx.fps) / ctx.fade_in_s)
        return Image.new("L", (s.W, s.H), int(round(v)))
    pose, x, lift = _state(ctx, i)
    # feet line is shared by every pose so the squash and the cheer do not jump
    cx, by = upright_anchor(s, x, "idle", cell=ctx.p, lift=lift)
    img = s.new_canvas()
    (draw_pocket if ctx.pocket else draw_clawd)(img, pose, cx, by, ctx.p)
    return img
