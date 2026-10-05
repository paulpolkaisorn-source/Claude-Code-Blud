"""'18' that materialises LED by LED from a converging glow, gets a light glint
sweeping through it while ripple rings radiate outward, then dissolves to dark."""
SPACE = "strip"
import math
import numpy as np
from PIL import Image
from lidgif.effects import _text_tile, _place_center


def setup(ctx, params):
    s, p = ctx.s, ctx.p
    size = params.get("size", 1.6)
    txt = np.asarray(_place_center(s, _text_tile(ctx, params.get("text", "18"), size, 255)),
                     dtype=np.float32) / 255.0
    ctx.txt = txt
    H, W = txt.shape
    ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
    on = np.argwhere(txt > 0.5)
    ctx.cx, ctx.cy = on[:, 1].mean(), on[:, 0].mean()
    # distance from text centre in LED units
    ctx.dist = np.abs(xs - ctx.cx) / p   # along-band distance: rings become bars racing along the stripe
    # per-LED random value for the materialise / dissolve order
    rng = np.random.default_rng(params.get("seed", 5))
    cells = rng.random((int(H / p) + 2, int(W / p) + 2)).astype(np.float32)
    ctx.rnd = cells[(ys / p).astype(int), (xs / p).astype(int)]
    ctx.xs = xs
    ctx.half = (on[:, 1].max() - on[:, 1].min()) / p / 2 + 1


def _ease(x):
    x = min(max(x, 0.0), 1.0)
    return x * x * (3 - 2 * x)


def frame(ctx, i, t):
    s, p = ctx.s, ctx.p
    txt, dist, rnd = ctx.txt, ctx.dist, ctx.rnd
    out = np.zeros_like(txt)

    # 1) converging glow ring: closes in from the band ends onto the digits (0 - 0.3)
    if t < 0.3:
        r = (1 - _ease(t / 0.3)) * 30 + ctx.half
        ring = np.clip(1 - np.abs(dist - r) / 1.5, 0, 1) * 0.8
        out = np.maximum(out, ring)

    # 2) digits materialise LED by LED, each LED popping bright then settling (0.12 - 0.42)
    a = (t - 0.12) / 0.3
    born = np.clip((a - rnd) * 6, 0, 1)                       # 0 -> 1 as each LED arrives
    pop = np.where((born > 0) & (born < 1), 1.0, 0.0) * 0.4
    body = txt * np.clip(born * 0.85 + pop, 0, 1)

    # 3) glint sweeping across the digits twice (0.42 - 0.82)
    if 0.42 <= t < 0.82:
        g = ((t - 0.42) / 0.4 * 2) % 1.0
        gx = ctx.cx + (g * 2 - 1) * (ctx.half + 3) * p
        glint = np.clip(1 - np.abs(ctx.xs - gx) / (1.5 * p), 0, 1)
        body = np.maximum(body, txt * glint)

    # 4) ripple rings radiating from the digits after they lock in (0.42 - 0.85)
    for k, t0 in enumerate((0.42, 0.58)):
        if t0 <= t < t0 + 0.27:
            q = (t - t0) / 0.27
            r = ctx.half + 1 + _ease(q) * 28
            ring = np.clip(1 - np.abs(dist - r) / 1.5, 0, 1) * (1 - q) * 0.75
            out = np.maximum(out, ring * (1 - txt))

    # 5) dissolve to dark, LED by LED (0.82 - 1.0) so the loop restarts clean
    if t >= 0.82:
        d = (t - 0.82) / 0.16
        body = body * (rnd > d)

    out = np.maximum(out, body)
    return Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8), "L")
