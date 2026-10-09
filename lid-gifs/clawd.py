"""Clawd sprite kit for the SCAR 18 AniMe Vision lid (shared by every Clawd scene).

Import it from a custom effect file that lives next to it:

    import os, sys
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from clawd import POSES, draw_clawd, draw_pocket, pose_size, upright_anchor, band_column

Sprite grids: 'X' = lit body, 'o' = eye (always dark, even over a busy
background when a pocket layer is used), '.' = transparent.
One sprite pixel = one LED (cell = ctx.p) unless you scale it.

Clawd is drawn UPRIGHT in canvas space (SPACE = "canvas") so he stands
straight on the lid while the band slopes under him. Use upright_anchor()
to centre him vertically in the band at any canvas column.
"""
import numpy as np
from PIL import ImageDraw

POSES = {
    # standing, eyes open
    "idle": [
        "..XXXXXXXXXXXX..",
        "..XXXXXXXXXXXX..",
        "..XXooXXXXooXX..",
        "..XXooXXXXooXX..",
        "XXXXXXXXXXXXXXXX",
        "XXXXXXXXXXXXXXXX",
        "..XXXXXXXXXXXX..",
        "..XXXXXXXXXXXX..",
        "...X.X....X.X...",
        "...X.X....X.X...",
    ],
    # eyes shut (one dark line); show for 2-3 frames
    "blink": [
        "..XXXXXXXXXXXX..",
        "..XXXXXXXXXXXX..",
        "..XXXXXXXXXXXX..",
        "..XXooXXXXooXX..",
        "XXXXXXXXXXXXXXXX",
        "XXXXXXXXXXXXXXXX",
        "..XXXXXXXXXXXX..",
        "..XXXXXXXXXXXX..",
        "...X.X....X.X...",
        "...X.X....X.X...",
    ],
    # walk cycle: alternate walk_a / walk_b (diagonal leg pairs)
    "walk_a": [
        "..XXXXXXXXXXXX..",
        "..XXXXXXXXXXXX..",
        "..XXooXXXXooXX..",
        "..XXooXXXXooXX..",
        "XXXXXXXXXXXXXXXX",
        "XXXXXXXXXXXXXXXX",
        "..XXXXXXXXXXXX..",
        "..XXXXXXXXXXXX..",
        "...X.X....X.X...",
        "...X......X.....",
    ],
    "walk_b": [
        "..XXXXXXXXXXXX..",
        "..XXXXXXXXXXXX..",
        "..XXooXXXXooXX..",
        "..XXooXXXXooXX..",
        "XXXXXXXXXXXXXXXX",
        "XXXXXXXXXXXXXXXX",
        "..XXXXXXXXXXXX..",
        "..XXXXXXXXXXXX..",
        "...X.X....X.X...",
        ".....X......X...",
    ],
    # eyes glance right / left (toward text, toward the other tip)
    "look_r": [
        "..XXXXXXXXXXXX..",
        "..XXXXXXXXXXXX..",
        "..XXXooXXXXooX..",
        "..XXXooXXXXooX..",
        "XXXXXXXXXXXXXXXX",
        "XXXXXXXXXXXXXXXX",
        "..XXXXXXXXXXXX..",
        "..XXXXXXXXXXXX..",
        "...X.X....X.X...",
        "...X.X....X.X...",
    ],
    "look_l": [
        "..XXXXXXXXXXXX..",
        "..XXXXXXXXXXXX..",
        "..XooXXXXooXXX..",
        "..XooXXXXooXXX..",
        "XXXXXXXXXXXXXXXX",
        "XXXXXXXXXXXXXXXX",
        "..XXXXXXXXXXXX..",
        "..XXXXXXXXXXXX..",
        "...X.X....X.X...",
        "...X.X....X.X...",
    ],
    # arms thrown up beside the head, happy squint. Flip idle <-> cheer every
    # ~0.15 s (plus a hop) and it reads as cheering / waving on the LEDs.
    "cheer": [
        "..XXXXXXXXXXXX..",
        "XXXXXXXXXXXXXXXX",
        "XXXXooXXXXooXXXX",
        "..XXXXXXXXXXXX..",
        "..XXXXXXXXXXXX..",
        "..XXXXXXXXXXXX..",
        "..XXXXXXXXXXXX..",
        "..XXXXXXXXXXXX..",
        "...X.X....X.X...",
        "...X.X....X.X...",
    ],
    # landing / anticipation squash (7 rows, legs tucked)
    "squish": [
        "..XXXXXXXXXXXX..",
        "..XXooXXXXooXX..",
        "XXXXXXXXXXXXXXXX",
        "XXXXXXXXXXXXXXXX",
        "..XXXXXXXXXXXX..",
        "..XXXXXXXXXXXX..",
        "...X.X....X.X...",
    ],
}


def pose_size(pose):
    """(cols, rows) of a pose in sprite pixels (= LEDs at cell = ctx.p)."""
    g = POSES[pose]
    return len(g[0]), len(g)


def _cells(pose, cx, by, cell):
    """Yield (char, x0, y0) for every non-transparent sprite pixel, bottom-centre anchored."""
    g = POSES[pose]
    cols, rows = len(g[0]), len(g)
    left = cx - cols * cell / 2.0
    top = by - rows * cell
    for r, row in enumerate(g):
        for c, ch in enumerate(row):
            if ch != ".":
                yield ch, left + c * cell, top + r * cell


def draw_clawd(img, pose, cx, by, cell, level=255, dot=1.0, eye_level=0):
    """Draw Clawd with his feet's bottom-centre at (cx, by). Works in strip or
    canvas images. `dot` < 1 leaves an LED-style gap between pixels. Eyes are
    painted at `eye_level` (0 = holes; lower layers show through unless a
    pocket layer cleared them)."""
    d = ImageDraw.Draw(img)
    pad = cell * (1 - dot) / 2.0
    for ch, x0, y0 in _cells(pose, cx, by, cell):
        v = level if ch == "X" else eye_level
        if v <= 0:
            continue
        d.rectangle([x0 + pad, y0 + pad, x0 + cell - pad - 1, y0 + cell - pad - 1], fill=int(v))
    return img


def draw_pocket(img, pose, cx, by, cell, pad_cells=1, level=255):
    """Black pocket for a `subtract` layer placed right BELOW the Clawd layer:
    lights Clawd's bounding box grown by `pad_cells` LEDs, so busy backgrounds
    (rain, slashes, eq) never fill his eyes or eat his outline."""
    cols, rows = pose_size(pose)
    pad = pad_cells * cell
    x0 = cx - cols * cell / 2.0 - pad
    y0 = by - rows * cell - pad
    ImageDraw.Draw(img).rectangle([x0, y0, x0 + cols * cell + 2 * pad - 1, y0 + rows * cell + 2 * pad - 1],
                                  fill=int(level))
    return img


def band_column(s, x):
    """(y_top, y_bottom) in canvas px of the band at canvas column x (None if outside)."""
    x = int(round(min(max(x, 0), s.W - 1)))
    ys = np.nonzero(s.mask_np[:, x])[0]
    if not len(ys):
        return None
    return int(ys.min()), int(ys.max())


_FIT = {}


def _fit_offset(s, pose, cell):
    """Vertical nudge (px) that keeps the most of `pose` inside the sloped band.
    Measured once per pose on a full-thickness column, so it never jitters."""
    key = (pose, round(cell, 3))
    if key in _FIT:
        return _FIT[key]
    x_ref = s.W * 0.27
    y0, y1 = band_column(s, x_ref)
    cols, rows = pose_size(pose)
    best = (-1, 0.0)
    for k in sorted(range(-8, 9), key=abs):
        off = k * 0.25 * cell
        by = (y0 + y1) / 2.0 + rows * cell / 2.0 + off
        n = 0
        for ch, x0, yy in _cells(pose, x_ref, by, cell):
            if ch != "X":
                continue
            px, py = int(x0 + cell / 2), int(yy + cell / 2)
            if 0 <= px < s.W and 0 <= py < s.H and s.mask_np[py, px]:
                n += 1
        if n > best[0]:
            best = (n, off)
    _FIT[key] = best[1]
    return best[1]


def upright_anchor(s, x, pose="idle", cell=None, lift=0.0):
    """(cx, by) that centres an upright Clawd in the band at canvas column x,
    nudged so the pose fits the slope best. `lift` raises him by that many
    LEDs (hops / bobs). Near the tapered bottom-right tip the band is thinner
    than Clawd, so he gets clipped there - that is how he walks in and out of
    the ends. For x off the canvas the band centre line is extrapolated."""
    cell = cell or s.pitch
    xc = min(max(x, 0), s.W - 1)
    col = band_column(s, xc)
    slope = s.dy / s.dx
    if col is None or x != xc:
        # follow the band centre line (top edge + half thickness) past the ends
        ref = band_column(s, s.W * 0.27)
        half = (ref[1] - ref[0]) / 2.0
        mid = slope * x + (ref[0] - slope * s.W * 0.27) + half
    else:
        mid = (col[0] + col[1]) / 2.0
    _, rows = pose_size(pose)
    by = mid + rows * cell / 2.0 + _fit_offset(s, pose, cell) - lift * cell
    return x, by


def band_x_for_center(s, frac):
    """Canvas x of the band's centre line at `frac` (0 = top-left tip, 1 = bottom-right tip)."""
    u = frac * s.SL
    v = s.ST / 2.0
    return (s.umin + u) * s.dx + (s.vmin + v) * s.nx
