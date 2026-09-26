"""Per-frame renderer: background, fighters, effects, glow, post-processing."""
import math

import cairocffi as cairo
import numpy as np

from . import scenes
from .config import GLOW_DIV, HEAD_R
from .effects import glow_dot, stroke_line, lerpc, smooth, TAU, WHITE
from .rig import (draw_fighter, head_frame, HIP, CHEST, NECKJ, HEAD, ELB_F, HAND_F, ELB_B, HAND_B,
                  KNEE_F, FOOT_F, KNEE_B, FOOT_B)

SIM = None


def init(sim):
    global SIM
    SIM = sim


class R_:
    pass


_VIG = {}


def _vignette(w, h):
    if (w, h) not in _VIG:
        s = cairo.ImageSurface(cairo.FORMAT_ARGB32, w, h)
        c = cairo.Context(s)
        pat = cairo.RadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, w * 0.72)
        pat.add_color_stop_rgba(0, 0, 0, 0, 0)
        pat.add_color_stop_rgba(1, 0, 0, 0, 1)
        c.set_source(pat)
        c.paint()
        _VIG[(w, h)] = s
    return _VIG[(w, h)]


def _box_blur(a, r, axis):
    if r < 1:
        return a
    n = a.shape[axis]
    pad = [(0, 0)] * a.ndim
    pad[axis] = (r + 1, r)
    p = np.pad(a, pad, mode='edge')
    c = np.cumsum(p, axis=axis, dtype=np.float32)
    hi = np.take(c, np.arange(2 * r + 1, 2 * r + 1 + n), axis=axis)
    lo = np.take(c, np.arange(0, n), axis=axis)
    return (hi - lo) / (2 * r + 1)


def blur(a, r, passes=3):
    for _ in range(passes):
        a = _box_blur(a, r, 0)
        a = _box_blur(a, r, 1)
    return a


def composite_glow(ctx, gsurf, R, strong=1.0):
    gw, gh = gsurf.get_width(), gsurf.get_height()
    gsurf.flush()
    ga = np.ndarray((gh, gsurf.get_stride() // 4, 4), dtype=np.uint8, buffer=gsurf.get_data())[:, :gw]
    gf = ga.astype(np.float32)
    rs = max(1, int(round(2 * R.s)))
    rl = max(2, int(round(9 * R.s)))
    bl = blur(gf, rs, 2) * 0.9 + blur(gf, rl, 3) * 0.95 * strong
    np.clip(bl, 0, 255, out=bl)
    out = np.ascontiguousarray(bl.astype(np.uint8))
    osurf = cairo.ImageSurface.create_for_data(memoryview(out.reshape(-1)), cairo.FORMAT_ARGB32, gw, gh, gw * 4)
    ctx.save()
    ctx.identity_matrix()
    ctx.scale(R.Wpx / gw, R.Hpx / gh)
    ctx.set_source_surface(osurf, 0, 0)
    pat = ctx.get_source()
    pat.set_filter(cairo.FILTER_BILINEAR)
    pat.set_extend(cairo.EXTEND_PAD)
    ctx.set_operator(cairo.OPERATOR_ADD)
    ctx.paint()
    ctx.restore()


def set_world(ctx, R, div=1):
    ctx.identity_matrix()
    ctx.translate(R.Wpx / (2 * div), R.Hpx / (2 * div))
    ctx.rotate(R.crot)
    z = R.zoom * R.s / div
    ctx.scale(z, -z)
    ctx.translate(-R.cx, -R.cy)


def _cr(p0, p1, p2, p3, u):
    u2, u3 = u * u, u * u * u
    return 0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3)


def _history(arr, f, n):
    idx = [max(0, f - k) for k in range(n)]
    return arr[idx]


def draw_smears(R, a, f):
    """Anime-style motion smears on fast limbs (sweep area between elbow/knee and hand/foot)."""
    ctx = R.ctx
    body = a.pal['body']
    en = a.pal['energy']
    blade = a.ch['blade'][f]
    aura = a.ch['aura'][f]
    chains = [(ELB_F, HAND_F), (ELB_B, HAND_B), (KNEE_F, FOOT_F), (KNEE_B, FOOT_B)]
    H = _history(a.J, f, 6)  # H[0] = current
    if f > 0 and np.hypot(*(a.J[f, HIP] - a.J[f - 1, HIP])) > 140:
        return  # teleport: no smear
    for (m, e) in chains:
        spd = np.hypot(*(H[0, e] - H[1, e]))
        rel = np.hypot(*((H[0, e] - H[0, HIP]) - (H[1, e] - H[1, HIP])))
        s = max(rel, spd * 0.35)
        if s < 7:
            continue
        amt = min(1.0, (s - 7) / 22.0)
        # sub-sample path with Catmull-Rom
        pts_m, pts_e = [], []
        K = 4
        for i in range(K):
            for j in range(3):
                u = j / 3
                i0, i1, i2, i3 = max(0, i - 1), i, i + 1, min(5, i + 2)
                pts_e.append(_cr(H[i0, e], H[i1, e], H[i2, e], H[i3, e], u))
                pts_m.append(_cr(H[i0, m], H[i1, m], H[i2, m], H[i3, m], u))
        n = len(pts_e)
        for i in range(n - 1):
            al = amt * 0.55 * (1 - i / n) ** 1.3
            ctx.move_to(*pts_m[i])
            ctx.line_to(*pts_e[i])
            ctx.line_to(*pts_e[i + 1])
            ctx.line_to(*pts_m[i + 1])
            ctx.close_path()
            ctx.set_source_rgba(*body, al)
            ctx.fill()
            if aura > 0.2:
                stroke_line(R.g, [pts_e[i], pts_e[i + 1]], 14, en, al * aura)
        if blade > 0.1 and e == HAND_F:
            tips = []
            for i in range(n):
                k = min(5, i // 3)
                d = H[k, HAND_F] - H[k, ELB_F]
                d = d / (np.hypot(*d) + 1e-6)
                tips.append(pts_e[i] + d * 85 * blade)
            for i in range(n - 1):
                al = amt * 0.8 * (1 - i / n) ** 1.2
                ctx.move_to(*pts_e[i])
                ctx.line_to(*tips[i])
                ctx.line_to(*tips[i + 1])
                ctx.line_to(*pts_e[i + 1])
                ctx.close_path()
                ctx.set_source_rgba(*a.pal['energy2'], al * 0.7)
                ctx.fill()
                stroke_line(R.g, [tips[i], tips[i + 1]], 12, en, al * 0.7)


def draw_aura(R, a, f, t):
    amt = a.ch['aura'][f]
    if amt <= 0.01:
        return
    J = a.J[f]
    en, en2 = a.pal['energy'], a.pal['energy2']
    vis = a.ch['vis'][f]
    amt *= vis
    glow_dot(R.gu, J[CHEST][0], J[CHEST][1], 150 * min(1.6, amt), en, 0.32 * min(1, amt))
    pts = [HIP, CHEST, HEAD, ELB_F, HAND_F, ELB_B, HAND_B, KNEE_F, FOOT_F, KNEE_B, FOOT_B]
    seed = 0 if a.id == 'yin' else 50
    for i, j in enumerate(pts):
        for k in range(3):
            ph = seed + i * 3.7 + k * 1.9
            cyc = (t * (1.6 + 0.3 * k) + ph * 0.13) % 1.0
            L = (40 + 55 * amt) * (0.6 + 0.4 * math.sin(ph * 5.1)) * math.sin(cyc * math.pi)
            base = J[j] + np.array([math.sin(ph) * 8, math.cos(ph * 1.3) * 6])
            sway = math.sin(t * 7 + ph) * 12
            p1 = base + np.array([sway * 0.5, L * 0.5 + cyc * 20])
            p2 = base + np.array([sway, L + cyc * 40])
            al = min(1.0, amt) * (1 - cyc) * 0.75
            stroke_line(R.gu, [base, p1, p2], 8 * (1 - cyc * 0.5), en, al)
            stroke_line(R.ctx, [base, p1, p2], 2.0 * (1 - cyc * 0.5), en2, al * 0.45)


def draw_actor_under(R, a, f, t):
    ctx = R.ctx
    J = a.J[f]
    vis = a.ch['vis'][f]
    pal = a.pal
    en = pal['energy']
    # ground shadow
    if R.scene_mtn > 0.01 and vis > 0.05:
        hy = J[HIP][1]
        if -40 < hy < 500:
            k = max(0.0, 1 - hy / 500)
            ctx.save()
            ctx.translate(J[HIP][0], 1.5)
            ctx.scale(1, 0.13)
            ctx.arc(0, 0, 62 * (0.6 + 0.4 * k), 0, TAU)
            ctx.restore()
            ctx.set_source_rgba(0.02, 0.0, 0.04, 0.38 * k * vis * R.scene_mtn)
            ctx.fill()
    # afterimages
    gh = a.ch['ghost'][f]
    if gh > 0.01:
        prev = None
        for k in range(12, 0, -2):
            fk = max(0, f - k)
            Jk = a.J[fk]
            if prev is not None and np.hypot(*(Jk[HIP] - prev)) < 3:
                continue
            prev = Jk[HIP]
            al = gh * 0.42 * (1 - k / 13)
            draw_fighter(ctx, Jk, a.face[fk], pal, alpha=al, eye=0, tint=en, outline=False)
        path = [a.J[max(0, f - k), CHEST] for k in range(0, 14)]
        stroke_line(R.gu, path, 40, en, gh * 0.7)
        stroke_line(ctx, path, 4, pal['energy2'], gh * 0.45)
    if vis <= 0.01:
        return
    draw_aura(R, a, f, t)
    gb = max(a.ch['glowbody'][f], 0.0)
    if gb > 0.01:
        for chain in ([HIP, CHEST, NECKJ], [CHEST, ELB_F, HAND_F], [CHEST, ELB_B, HAND_B],
                      [HIP, KNEE_F, FOOT_F], [HIP, KNEE_B, FOOT_B]):
            stroke_line(R.gu, [J[i] for i in chain], 18, en, gb * vis * 0.8)
        glow_dot(R.gu, J[HEAD][0], J[HEAD][1], 40, en, gb * vis * 0.8)


def draw_actor(R, a, f, t):
    ctx = R.ctx
    J = a.J[f]
    face = a.face[f]
    vis = a.ch['vis'][f]
    pal = a.pal
    en = pal['energy']
    if vis <= 0.01:
        return
    draw_smears(R, a, f)
    dk = a.ch['dark'][f]
    if dk > 0.01:
        for chain in ([CHEST, ELB_F, HAND_F], [CHEST, ELB_B, HAND_B]):
            stroke_line(R.gu, [J[i] for i in chain], 20, en, dk * vis * 0.9)
            stroke_line(ctx, [J[i] for i in chain], 12, en, dk * vis * 0.45)
    ribbon = a.rib[f] if vis > 0.5 else None
    tint = None
    tw = a.ch['tint'][f]
    if tw > 0.01:
        tint = lerpc(pal['body'], pal['energy2'], tw)
    draw_fighter(ctx, J, face, pal, alpha=vis, eye=a.ch['eye'][f], ribbon=ribbon, tint=tint)
    # eye glow
    eye = a.ch['eye'][f]
    if eye > 0.01:
        up, fwd = head_frame(J, face)
        p = J[HEAD] + fwd * HEAD_R * 0.5 + up * HEAD_R * 0.1
        glow_dot(R.g, p[0], p[1], 12 * (0.7 + 0.3 * min(eye, 2.0)), pal['eye'], 0.8 * min(1.0, eye) * vis)
        if eye > 1.05:
            # flare streak
            stroke_line(R.g, [p - fwd * 30 * (eye - 1), p + fwd * 10], 3, pal['eye'], min(1, eye - 1) * 0.7)
            stroke_line(R.ctx, [p - fwd * 22 * (eye - 1), p + fwd * 6], 1.5, WHITE, min(1, eye - 1) * 0.8)
    # blade
    bl = a.ch['blade'][f]
    if bl > 0.01:
        d = J[HAND_F] - J[ELB_F]
        d = d / (np.hypot(*d) + 1e-6)
        tip = J[HAND_F] + d * 85 * bl
        stroke_line(R.g, [J[HAND_F], tip], 14, en, vis * 0.8)
        stroke_line(ctx, [J[HAND_F], tip], 7, en, vis)
        stroke_line(ctx, [J[HAND_F], tip], 3, WHITE, vis)
    # charge sphere
    ch = a.ch['charge'][f]
    if ch > 0.5:
        w = a.ch['chargeat'][f]
        p = J[HAND_F] * (1 - w) + (J[HAND_F] + J[HAND_B]) * 0.5 * w
        if w > 1.0:
            p = J[HEAD] + np.array([0, 60 + ch * 1.2]) * (w - 1) + p * 0 + (J[HAND_F] + J[HAND_B]) * 0.5 * (2 - w) - J[HEAD] * (2 - w)
        pul = 1 + 0.1 * math.sin(t * 45) + 0.05 * math.sin(t * 91)
        r = ch * pul
        glow_dot(R.g, p[0], p[1], r * 3.2, en, 1.0)
        glow_dot(ctx, p[0], p[1], r * 2.0, en, 0.5)
        ctx.arc(p[0], p[1], r, 0, TAU)
        ctx.set_source_rgba(*en, 1)
        ctx.fill()
        ctx.arc(p[0], p[1], r * 0.68, 0, TAU)
        ctx.set_source_rgba(*pal['core'], 1)
        ctx.fill()


def draw_yinyang(R, fx, t):
    """Taijitu at (yyx, yyy), radius yyr, rotation yyrot (deg). Dot size grows with yysep."""
    a = fx['yy']
    if a <= 0.005:
        return
    ctx = R.ctx
    r = fx['yyr']
    x0, y0 = fx['yyx'], fx['yyy']
    rot = math.radians(fx['yyrot'])
    dot = r * (0.13 + fx['yysep'])
    black = (0.03, 0.02, 0.05)
    white = (0.98, 0.97, 0.94)
    glow_dot(R.g, x0, y0, r * 2.6, (0.56, 0.33, 1.0), 0.22 * a)
    glow_dot(R.g, x0, y0, r * 1.9, (1.0, 0.79, 0.29), 0.12 * a)
    ctx.save()
    ctx.translate(x0, y0)
    ctx.rotate(rot)
    ctx.push_group()
    ctx.arc(0, 0, r, 0, TAU)
    ctx.set_source_rgb(*white)
    ctx.fill()
    ctx.save()
    ctx.rectangle(0, -r - 2, r + 2, 2 * r + 4)
    ctx.clip()
    ctx.arc(0, 0, r, 0, TAU)
    ctx.set_source_rgb(*black)
    ctx.fill()
    ctx.restore()
    ctx.arc(0, r / 2, r / 2, 0, TAU)
    ctx.set_source_rgb(*white)
    ctx.fill()
    ctx.arc(0, -r / 2, r / 2, 0, TAU)
    ctx.set_source_rgb(*black)
    ctx.fill()
    ctx.arc(0, r / 2, dot, 0, TAU)
    ctx.set_source_rgb(*black)
    ctx.fill()
    ctx.arc(0, -r / 2, dot, 0, TAU)
    ctx.set_source_rgb(*white)
    ctx.fill()
    ctx.arc(0, 0, r, 0, TAU)
    ctx.set_source_rgba(0.75, 0.68, 0.95, 0.8)
    ctx.set_line_width(max(2.0, r * 0.012))
    ctx.stroke()
    ctx.pop_group_to_source()
    ctx.paint_with_alpha(min(1.0, a))
    ctx.restore()


def draw_speedlines(R, fx, f):
    amt = fx['speed']
    if amt <= 0.01:
        return
    c = R.sctx
    ang = math.radians(fx['speedang'])
    d = np.array([math.cos(ang), -math.sin(ang)])
    n = np.array([-d[1], d[0]])
    rng = np.random.default_rng(f)
    cx, cy = R.Wpx / 2, R.Hpx / 2
    L = math.hypot(R.Wpx, R.Hpx)
    for i in range(int(40 * amt) + 4):
        off = rng.uniform(-0.5, 0.5) * L
        if abs(off) < 90 * R.s:
            continue
        s = rng.uniform(-0.6, 0.6) * L
        ln = rng.uniform(0.15, 0.5) * L
        p = np.array([cx, cy]) + n * off + d * s
        c.move_to(*p)
        c.line_to(*(p + d * ln))
        c.set_source_rgba(1, 1, 1, rng.uniform(0.08, 0.28) * amt)
        c.set_line_width(rng.uniform(1, 4) * R.s)
        c.stroke()


def render_frame(f, Wpx, Hpx):
    sim = SIM
    R = R_()
    R.Wpx, R.Hpx = Wpx, Hpx
    R.s = Wpx / 1920.0
    R.f = f
    t = float(sim.S[f])
    R.t = t
    R.cx, R.cy, R.zoom, R.crot = float(sim.cx[f]), float(sim.cy[f]), float(sim.zoom[f]), float(sim.crot[f])
    fx = {k: float(v[f]) for k, v in sim.fx.items()}
    surf = cairo.ImageSurface(cairo.FORMAT_ARGB32, Wpx, Hpx)
    gw, gh = Wpx // GLOW_DIV, Hpx // GLOW_DIV
    gsurf = cairo.ImageSurface(cairo.FORMAT_ARGB32, gw, gh)
    ctx = cairo.Context(surf)
    g = cairo.Context(gsurf)
    usurf = cairo.ImageSurface(cairo.FORMAT_ARGB32, gw, gh)
    gu = cairo.Context(usurf)
    R.ctx, R.g, R.gu = ctx, g, gu
    set_world(g, R, GLOW_DIV)
    set_world(gu, R, GLOW_DIV)

    # --- background ------------------------------------------------------
    scene = fx['scene']
    lo = int(math.floor(scene))
    w = scene - lo
    R.scene_mtn = max(0.0, 1 - abs(scene - 1))

    def draw_scene(i, target):
        # soft far layers at half resolution, crisp near layers at full resolution
        hw, hh = Wpx // 2, Hpx // 2
        half = cairo.ImageSurface(cairo.FORMAT_ARGB32, hw, hh)
        hc = cairo.Context(half)
        R2 = R_()
        R2.__dict__.update(R.__dict__)
        R2.Wpx, R2.Hpx, R2.s = hw, hh, R.s / 2
        R2.g = None
        if i <= 0:
            scenes.draw_void(hc, R2, t)
        elif i == 1:
            scenes.draw_mountain_far(hc, R2, t, fx)
        else:
            scenes.draw_cosmos_far(hc, R2, t, fx)
        target.save()
        target.identity_matrix()
        target.scale(Wpx / hw, Hpx / hh)
        target.set_source_surface(half, 0, 0)
        target.get_source().set_filter(cairo.FILTER_BILINEAR)
        target.get_source().set_extend(cairo.EXTEND_PAD)
        target.paint()
        target.restore()
        if i == 1:
            scenes.draw_mountain_near(target, R, t, fx)
        elif i >= 2:
            scenes.draw_cosmos_near(target, R, t, fx)

    draw_scene(lo, ctx)
    if w > 0.002:
        ctx.push_group()
        draw_scene(lo + 1, ctx)
        ctx.pop_group_to_source()
        ctx.identity_matrix()
        ctx.paint_with_alpha(w)

    set_world(ctx, R)
    effs = [e for e in sim.story.effects if e.t0 <= t <= e.t1]
    for e in effs:
        if e.layer == 'back':
            set_world(ctx, R)
            e.draw(R, t)
    set_world(ctx, R)
    draw_yinyang(R, fx, t)
    order = sorted(sim.actors.values(), key=lambda a: a.ch['z'][f])
    for a in order:
        set_world(ctx, R)
        draw_actor_under(R, a, f, t)
    composite_glow(ctx, usurf, R, strong=1.1)
    for a in order:
        set_world(ctx, R)
        draw_actor(R, a, f, t)
    for e in effs:
        if e.layer == 'front':
            set_world(ctx, R)
            e.draw(R, t)
    scenes.draw_fore_clouds(ctx, R, t, fx) if R.scene_mtn > 0.01 else None

    composite_glow(ctx, gsurf, R)

    # --- screen-space ----------------------------------------------------
    R.sctx = ctx
    ctx.identity_matrix()
    draw_speedlines(R, fx, f)
    ctx.identity_matrix()
    # vignette
    vg = fx['vign']
    if vg > 0:
        ctx.set_source_surface(_vignette(Wpx, Hpx), 0, 0)
        ctx.paint_with_alpha(min(1.0, vg))
    if fx['white'] > 0.001:
        ctx.set_source_rgba(1, 1, 1, min(1, fx['white']))
        ctx.paint()
    lb = fx['letterbox']
    if lb > 0.001:
        h = Hpx * 0.1 * lb
        ctx.rectangle(0, 0, Wpx, h)
        ctx.rectangle(0, Hpx - h, Wpx, h)
        ctx.set_source_rgb(0, 0, 0)
        ctx.fill()
    for e in effs:
        if e.layer == 'screen':
            ctx.identity_matrix()
            e.draw(R, t)
    surf.flush()
    arr = np.ndarray((Hpx, surf.get_stride() // 4, 4), dtype=np.uint8, buffer=surf.get_data())[:, :Wpx]
    arr = arr.copy()
    # --- numpy post ------------------------------------------------------
    inv = fx['invert']
    if inv > 0.001:
        rgbp = arr[..., :3].astype(np.float32)
        arr[..., :3] = (rgbp + (255 - 2 * rgbp) * min(1, inv)).astype(np.uint8)
    ch = max(fx['chroma'], 0.6 * max(0.0, float(sim.trauma[f]) - 0.35))
    k = int(round(9 * min(1.0, ch) * R.s))
    if k >= 1:
        arr[:, k:, 2] = arr[:, :-k, 2]      # red channel (BGRA) shifted right
        arr[:, :-k, 0] = arr[:, k:, 0]      # blue shifted left
    ds = fx['desat']
    if ds > 0.001:
        lum = arr[..., :3].astype(np.float32).mean(axis=2, keepdims=True)
        arr[..., :3] = (arr[..., :3] + (lum - arr[..., :3]) * min(1, ds)).astype(np.uint8)
    blk = fx['black']
    if blk > 0.001:
        arr[..., :3] = (arr[..., :3].astype(np.float32) * (1 - min(1, blk))).astype(np.uint8)
    return arr
