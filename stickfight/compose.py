"""Frame compositor: draws one video frame from precomputed scene data."""
import math
from math import sin, cos, pi, hypot

import cairo
import numpy as np

from rig import draw_fighter, pose_lerp, clamp, lerp, mix, sstep, hexc
from env import W, H, PALETTES
import fx as FXM

TRAIL_N = 9


class RC:
    """Render context passed to effects."""

    def __init__(self, sc, i):
        self.sc = sc
        self.frames = sc.frames
        self.i = i
        fr = sc.frames[i]
        self.w = fr['w']
        self.tv = fr['tv']
        self.cam = fr['cam']
        self._warp = sc.warp

    def tv0(self, w):
        return self._warp.video_time(w)

    tv1 = tv0


def set_world(ctx, cam):
    ctx.identity_matrix()
    ctx.translate(W / 2 + cam['shx'], H / 2 + cam['shy'])
    ctx.rotate(cam['roll'])
    ctx.scale(cam['k'], -cam['k'])
    ctx.translate(-cam['cx'], -cam['cy'])


def draw_trails(ctx, sc, i, who, style):
    """Auto swoosh trails for fast hands / feet / blade tip."""
    fr = sc.frames
    if i < 2:
        return
    n = min(TRAIL_N, i)
    col = style['trail']
    pts_sets = {}
    for j in range(n + 1):
        P = fr[i - j][who]
        for name, p in (('h0', P['arms'][0][2]), ('h1', P['arms'][1][2]),
                        ('f0', P['legs'][0][3]), ('f1', P['legs'][1][3])):
            pts_sets.setdefault(name, []).append(p)
        if P['weapon']:
            pts_sets.setdefault('w', []).append(P['weapon']['tip'])
            pts_sets.setdefault('wm', []).append(((P['weapon']['tip'][0] + P['weapon']['hand'][0]) / 2,
                                                  (P['weapon']['tip'][1] + P['weapon']['hand'][1]) / 2))
    ctx.save()
    ctx.set_operator(cairo.OPERATOR_ADD if style['trail_add'] else cairo.OPERATOR_OVER)
    ctx.set_line_cap(1)
    ctx.set_line_join(1)
    for name, pts in pts_sets.items():
        if len(pts) < 3:
            continue
        sp = hypot(pts[0][0] - pts[1][0], pts[0][1] - pts[1][1]) + hypot(pts[1][0] - pts[2][0], pts[1][1] - pts[2][1])
        thr = 0.16 if name in ('w', 'wm') else 0.22
        if sp < thr:
            continue
        inten = clamp((sp - thr) / 0.5, 0.15, 1.0)
        m = len(pts)
        # ribbon
        for pass_, (wid, al) in enumerate(((0.10, 0.18), (0.045, 0.55))):
            for q in range(m - 1):
                u = q / (m - 1)
                a = (1 - u) ** 1.5 * inten * al
                ctx.set_source_rgba(col[0], col[1], col[2], a)
                ctx.set_line_width(wid * (1 - u * 0.8) * (1.4 if name in ('w', 'wm') else 1))
                ctx.move_to(*pts[q])
                ctx.line_to(*pts[q + 1])
                ctx.stroke()
    ctx.restore()


def draw_fighters(ctx, sc, i, R):
    fr = sc.frames[i]
    t = fr['w']
    for who in ('Y', 'G'):
        style = sc.styles[who]
        P = fr[who]
        Pp = sc.frames[i - 1][who] if i > 0 else P
        # motion blur ghosts
        mv = 0.0
        for k in ('hip', 'neck', 'head'):
            mv = max(mv, hypot(P[k][0] - Pp[k][0], P[k][1] - Pp[k][1]))
        for a in range(2):
            mv = max(mv, hypot(P['arms'][a][2][0] - Pp['arms'][a][2][0], P['arms'][a][2][1] - Pp['arms'][a][2][1]) * 0.8)
            mv = max(mv, hypot(P['legs'][a][3][0] - Pp['legs'][a][3][0], P['legs'][a][3][1] - Pp['legs'][a][3][1]) * 0.8)
        if mv > 0.06:
            ng = min(3, 1 + int(mv / 0.08))
            for g in range(ng, 0, -1):
                u = 1 - g / (ng + 1.0) * 1.0
                Pg = pose_lerp(Pp, P, u - 0.0) if False else pose_lerp(Pp, P, 1 - g / (ng + 1.0))
                # ghosts sit *behind* current pose in time: between previous and current
                draw_fighter(ctx, Pg, style, t, alpha=0.30, aura_mul=0.0, glow=False)
        draw_fighter(ctx, P, style, t)


def draw_reflections(ctx, sc, i, cam):
    fr = sc.frames[i]
    t = fr['w']
    for who in ('Y', 'G'):
        P = fr[who]
        y = P['hip'][1]
        if y > 4.5:
            continue
        ctx.save()
        cx = P['hip'][0]
        ctx.rectangle(cx - 6, -6.0, 12, 6.0)
        ctx.clip()
        ctx.push_group()
        ctx.save()
        ctx.scale(1, -1)
        draw_fighter(ctx, P, sc.styles[who], t, alpha=1.0, aura_mul=0.5, glow=False)
        ctx.restore()
        pat = ctx.pop_group()
        ctx.set_source(pat)
        g = cairo.LinearGradient(0, 0, 0, -3.2)
        a0 = 0.34 / (1 + 0.35 * max(0.0, y - 0.9))
        g.add_color_stop_rgba(0, 1, 1, 1, a0)
        g.add_color_stop_rgba(1, 1, 1, 1, 0.0)
        ctx.mask(g)
        ctx.restore()


def bloom_and_grade(surf, ctx, sc, i, fr):
    """Cheap bloom via small-surface blur (numpy) + vignette."""
    w = fr['w']
    bloom_amt = sc.envx['bloom'](w)
    vig = sc.envx['vignette'](w)
    if bloom_amt > 0.01:
        sw, sh = W // 4, H // 4
        small = cairo.ImageSurface(cairo.FORMAT_ARGB32, sw, sh)
        sctx = cairo.Context(small)
        sctx.scale(0.25, 0.25)
        pat = cairo.SurfacePattern(surf)
        pat.set_filter(cairo.FILTER_GOOD)
        sctx.set_source(pat)
        sctx.paint()
        small.flush()
        stride = small.get_stride()
        buf = np.frombuffer(small.get_data(), dtype=np.uint8).reshape(sh, stride // 4, 4)[:, :sw, :3].astype(np.float32) / 255.0
        lum = buf.mean(axis=2, keepdims=True)
        bright = np.clip(buf - 0.72, 0, None) * 2.6
        # blur (box x3) via cumulative sums
        a = bright
        for _ in range(3):
            for ax in (0, 1):
                r = 6
                c = np.cumsum(np.pad(a, [(r + 1, r) if k == ax else (0, 0) for k in range(3)], mode='edge'), axis=ax)
                if ax == 0:
                    a = (c[2 * r + 1:, :, :] - c[:-(2 * r + 1), :, :]) / (2 * r + 1)
                else:
                    a = (c[:, 2 * r + 1:, :] - c[:, :-(2 * r + 1), :]) / (2 * r + 1)
        a = np.clip(a * 255.0, 0, 255).astype(np.uint8)
        out = np.zeros((sh, sw, 4), dtype=np.uint8)
        out[:, :, :3] = a
        out[:, :, 3] = 255
        bs = cairo.ImageSurface.create_for_data(bytearray(out.tobytes()), cairo.FORMAT_ARGB32, sw, sh, sw * 4)
        ctx.save()
        ctx.identity_matrix()
        ctx.set_operator(cairo.OPERATOR_ADD)
        ctx.scale(4, 4)
        bp = cairo.SurfacePattern(bs)
        bp.set_filter(cairo.FILTER_BILINEAR)
        ctx.set_source(bp)
        ctx.paint_with_alpha(clamp(bloom_amt, 0, 1))
        ctx.restore()
    if vig > 0.01:
        ctx.save()
        ctx.identity_matrix()
        rg = cairo.RadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 1.05)
        rg.add_color_stop_rgba(0, 0, 0, 0, 0)
        rg.add_color_stop_rgba(1, 0, 0, 0.02, vig)
        ctx.set_source(rg)
        ctx.paint()
        ctx.restore()


def render_frame(sc, i, surf=None):
    if surf is None:
        surf = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H)
    ctx = cairo.Context(surf)
    fr = sc.frames[i]
    w = fr['w']
    cam = fr['cam']
    R = RC(sc, i)
    P = sc.palette(w)
    fxp = {k: tr(w) for k, tr in sc.envx.items()}
    P2 = PALETTES['void_light'] if fxp['split'] > 0.01 else None
    if fxp['split'] > 0.01:
        P = PALETTES['void_dark']
    sc.env.draw(ctx, cam, w, P, fxp, P2)

    act = [sc.fx[j] for j in sc.active[i] if sc.fx[j].t0 <= w <= sc.fx[j].t1]
    back = [e for e in act if e.layer == 'back']
    front = [e for e in act if e.layer == 'front']
    screen = [e for e in act if e.layer == 'screen']

    set_world(ctx, cam)
    for e in back:
        e.draw(ctx, R, i)
    draw_reflections(ctx, sc, i, cam)
    for who in ('Y', 'G'):
        draw_trails(ctx, sc, i, who, sc.styles[who])
    draw_fighters(ctx, sc, i, R)
    for e in front:
        e.draw(ctx, R, i)

    ctx.identity_matrix()
    surf.flush()
    bloom_and_grade(surf, ctx, sc, i, fr)
    for e in screen:
        ctx.save()
        ctx.identity_matrix()
        e.draw(ctx, R, i)
        ctx.restore()
    fade = fxp['fade']
    if fade < 0.999:
        ctx.identity_matrix()
        ctx.set_source_rgba(0, 0, 0, 1 - fade)
        ctx.paint()
    surf.flush()
    return surf
