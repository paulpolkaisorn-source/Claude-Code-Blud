"""Synthetic Roblox-like test scenes (numpy ray caster) + simulated Unishade depth.

Each scene returns dict(color=uint8 HxWx3 sRGB, z=float32 view depth (inf = sky),
masks={...}) . The renderer is deliberately simple (Lambert + sun shadows + sky
ambient + Blinn spec + ACES-ish tonemap) but has the features GrandMaster must
handle: flat plastic floors, studs, bricks, water, bright sky/sun, UI overlays.
"""
import numpy as np
from PIL import Image, ImageDraw, ImageFont

FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
FONT_B = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'


def hash2(ix, iy, seed=0):
    h = (ix * 374761393 + iy * 668265263 + seed * 2147483647) & 0xffffffff
    h = ((h ^ (h >> 13)) * 1274126177) & 0xffffffff
    return ((h ^ (h >> 16)) & 0xffff) / 65535.0


def value_noise(x, y, seed=0):
    ix, iy = np.floor(x).astype(np.int64), np.floor(y).astype(np.int64)
    fx, fy = x - ix, y - iy
    fx, fy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
    a, b = hash2(ix, iy, seed), hash2(ix + 1, iy, seed)
    c, d = hash2(ix, iy + 1, seed), hash2(ix + 1, iy + 1, seed)
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy


def fbm(x, y, oct=4, seed=0):
    s, a, t = 0.0, 0.5, 0.0
    for i in range(oct):
        s = s + a * value_noise(x, y, seed + i)
        t += a
        x, y, a = x * 2.03, y * 2.03, a * 0.5
    return s / t


class Box:
    def __init__(self, lo, hi, color, tex='plain', gloss=0.2, emit=0.0):
        self.lo, self.hi = np.array(lo, float), np.array(hi, float)
        self.color, self.tex, self.gloss, self.emit = np.array(color, float), tex, gloss, emit


def srgb_to_lin(c):
    c = np.asarray(c, float)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def lin_to_srgb(c):
    c = np.clip(c, 0, 1)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055)


def aces(x):
    a, b, c, d, e = 2.51, 0.03, 2.43, 0.59, 0.14
    return np.clip((x * (a * x + b)) / (x * (c * x + d) + e), 0, 1)


def texture(tex, P, N, base):
    """Returns albedo (linear) for hit points P with normals N."""
    col = np.broadcast_to(base, P.shape).copy()
    ax = np.argmax(np.abs(N), axis=-1)
    # planar coords on the face
    u = np.where(ax == 0, P[..., 2], P[..., 0])
    v = np.where(ax == 1, P[..., 2], P[..., 1])
    if tex == 'bricks':
        bh, bw = 0.5, 1.0
        row = np.floor(v / bh)
        uu = u + (row % 2) * 0.5
        col_i = np.floor(uu / bw)
        fu, fv = uu / bw - col_i, v / bh - row
        mortar = (fu < 0.06) | (fv < 0.12)
        var = 0.75 + 0.35 * hash2(col_i.astype(np.int64), row.astype(np.int64), 7)
        n = fbm(u * 9, v * 9, 3, 3)
        col = col * (var * (0.85 + 0.3 * n))[..., None]
        col = np.where(mortar[..., None], np.array([0.42, 0.40, 0.37]) * (0.8 + 0.3 * n[..., None]), col)
    elif tex == 'studs':
        fu, fv = u - np.floor(u) - 0.5, v - np.floor(v) - 0.5
        r = np.sqrt(fu * fu + fv * fv)
        ring = (np.abs(r - 0.28) < 0.04)
        top = r < 0.28
        shade = np.where(top, 1.06 + 0.12 * (-fu - fv), 1.0) * np.where(ring, 0.72, 1.0)
        col = col * shade[..., None]
    elif tex == 'grass':
        n = fbm(u * 3, v * 3, 4, 11) * 0.6 + fbm(u * 25, v * 25, 2, 12) * 0.4
        col = col * (0.7 + 0.6 * n)[..., None]
    elif tex == 'rock':
        n = fbm(u * 2.5, v * 2.5, 5, 21)
        cr = np.abs(fbm(u * 6, v * 6, 3, 22) - 0.5) < 0.03
        col = col * (0.55 + 0.9 * n)[..., None] * np.where(cr, 0.55, 1.0)[..., None]
    elif tex == 'wood':
        n = fbm(u * 0.6, v * 12, 4, 31)
        col = col * (0.75 + 0.5 * n)[..., None]
    elif tex == 'smooth':
        n = fbm(u * 0.15, v * 0.15, 2, 41)
        col = col * (0.97 + 0.06 * n)[..., None]
    return col


def render(cam_pos, yaw, pitch, boxes, ground, W=1280, H=768, fov=70.0, sun_dir=(0.4, 0.75, 0.35),
           sun_in_view_boost=1.0, clouds=False, water=None, seed=0, night=False):
    amb_scale = 0.06 if night else 1.0
    cam_pos = np.array(cam_pos, float)
    t = np.tan(np.radians(fov) / 2)
    ys, xs = np.mgrid[0:H, 0:W]
    nx = ((xs + 0.5) / W * 2 - 1) * t * W / H
    ny = (1 - (ys + 0.5) / H * 2) * t
    cy, sy, cp, sp = np.cos(yaw), np.sin(yaw), np.cos(pitch), np.sin(pitch)
    fwd = np.array([sy * cp, sp, cy * cp])
    right = np.array([cy, 0, -sy])
    up = np.cross(fwd, right)
    D = fwd[None, None] + nx[..., None] * right[None, None] + ny[..., None] * up[None, None]
    D = D / np.linalg.norm(D, axis=-1, keepdims=True)
    O = np.broadcast_to(cam_pos, D.shape)
    T = np.full((H, W), np.inf)
    N = np.zeros((H, W, 3))
    obj = np.full((H, W), -1)
    # ground plane y=0
    with np.errstate(divide='ignore', invalid='ignore'):
        tg = np.where(D[..., 1] < -1e-6, -cam_pos[1] / D[..., 1], np.inf)
    hitg = tg < T
    T = np.where(hitg, tg, T)
    N[hitg] = [0, 1, 0]
    obj[hitg] = 1000
    for i, b in enumerate(boxes):
        with np.errstate(divide='ignore', invalid='ignore'):
            t1 = (b.lo - O) / D
            t2 = (b.hi - O) / D
        tmin = np.minimum(t1, t2)
        tmax = np.maximum(t1, t2)
        tn = tmin.max(-1)
        tf = tmax.min(-1)
        hit = (tn < tf) & (tf > 0) & (tn > 0) & (tn < T)
        ax = tmin.argmax(-1)
        T = np.where(hit, tn, T)
        nrm = np.zeros((H, W, 3))
        sgn = -np.sign(np.take_along_axis(D, ax[..., None], -1)[..., 0])
        for a in range(3):
            nrm[..., a] = np.where(ax == a, sgn, 0)
        N = np.where(hit[..., None], nrm, N)
        obj = np.where(hit, i, obj)
    P = O + D * np.where(np.isfinite(T), T, 0)[..., None]
    S = np.array(sun_dir, float)
    S = S / np.linalg.norm(S)
    sun_col = np.array([1.0, 0.95, 0.85]) * 2.6
    # shadows
    shadow = np.ones((H, W))
    Ps = P + N * 1e-3
    for b in boxes:
        with np.errstate(divide='ignore', invalid='ignore'):
            t1 = (b.lo - Ps) / S
            t2 = (b.hi - Ps) / S
        tn = np.minimum(t1, t2).max(-1)
        tf = np.maximum(t1, t2).min(-1)
        shadow = np.where((tn < tf) & (tf > 0), 0.0, shadow)
    # sky
    sky_dir_y = np.clip(D[..., 1], -1, 1)
    zen = srgb_to_lin([0.33, 0.55, 0.88])
    hor = srgb_to_lin([0.78, 0.86, 0.95])
    sky = hor + (zen - hor) * np.clip(sky_dir_y, 0, 1)[..., None] ** 0.6
    cosS = np.clip((D * S).sum(-1), -1, 1)
    sky = sky + (np.exp((cosS - 1) * 60) * 2.0 + np.exp((cosS - 1) * 8) * 0.25)[..., None] * sun_col * sun_in_view_boost
    sky = sky + (cosS > 0.9995)[..., None] * 30.0
    if clouds:
        with np.errstate(divide='ignore', invalid='ignore'):
            cu = np.where(D[..., 1] > 0.02, D[..., 0] / D[..., 1], 0)
            cv = np.where(D[..., 1] > 0.02, D[..., 2] / D[..., 1], 0)
        cl = np.clip((fbm(cu * 1.5, cv * 1.5, 5, 77) - 0.48) * 4, 0, 1) * (D[..., 1] > 0.02)
        sky = sky * (1 - cl[..., None] * 0.8) + cl[..., None] * np.array([1.0, 1.0, 1.0]) * 1.1
    color = np.zeros((H, W, 3))
    amb_sky = srgb_to_lin([0.55, 0.65, 0.8]) * 0.55
    amb_gnd = srgb_to_lin([0.45, 0.42, 0.38]) * 0.35
    V = -D
    for i in list(range(len(boxes))) + [1000]:
        m = obj == i
        if not m.any():
            continue
        em = 0.0
        if i == 1000:
            base, tex, gl = np.array(ground['color'], float), ground['tex'], ground.get('gloss', 0.2)
        else:
            base, tex, gl, em = boxes[i].color, boxes[i].tex, boxes[i].gloss, boxes[i].emit
        alb = texture(tex, P[m], N[m], srgb_to_lin(base))
        n = N[m]
        ndl = np.clip((n * S).sum(-1), 0, 1) * shadow[m]
        amb = amb_sky * (0.5 + 0.5 * n[:, 1:2]) + amb_gnd * (0.5 - 0.5 * n[:, 1:2])
        h = S + V[m]
        h = h / np.linalg.norm(h, axis=-1, keepdims=True)
        spec = np.clip((n * h).sum(-1), 0, 1) ** (8 + 120 * gl) * gl * 0.6 * ndl
        color[m] = alb * (sun_col * ndl[:, None] + amb) * amb_scale + spec[:, None] * sun_col * amb_scale + srgb_to_lin(base) * em
    if water is not None:
        # water plane at height water['y'] covering region; rendered over ground
        wy = water['y']
        with np.errstate(divide='ignore', invalid='ignore'):
            tw = np.where(D[..., 1] < -1e-6, (wy - cam_pos[1]) / D[..., 1], np.inf)
        Pw = O + D * np.where(np.isfinite(tw), tw, 0)[..., None]
        x0, x1, z0, z1 = water['rect']
        inside = (Pw[..., 0] > x0) & (Pw[..., 0] < x1) & (Pw[..., 2] > z0) & (Pw[..., 2] < z1) & (tw < T)
        wx, wz = Pw[..., 0], Pw[..., 2]
        dx = 0.06 * np.cos(wx * 1.7 + wz * 0.9) + 0.04 * np.cos(wx * 3.1 - wz * 2.3) + 0.02 * np.cos(wx * 7 + wz * 5)
        dz = 0.06 * np.cos(wz * 1.3 - wx * 0.7) + 0.04 * np.cos(wz * 2.9 + wx * 1.9) + 0.02 * np.cos(wz * 6.5 - wx * 4)
        wn = np.stack([-dx, np.ones_like(dx), -dz], -1)
        wn = wn / np.linalg.norm(wn, axis=-1, keepdims=True)
        cosv = np.clip((wn * V).sum(-1), 0, 1)
        fr = 0.02 + 0.98 * (1 - cosv) ** 5
        Rw = D - 2 * (D * wn).sum(-1, keepdims=True) * wn
        sky_r = hor + (zen - hor) * np.clip(Rw[..., 1], 0, 1)[..., None] ** 0.6
        deep = srgb_to_lin([0.05, 0.33, 0.37])
        h = S + V
        h = h / np.linalg.norm(h, axis=-1, keepdims=True)
        spec = np.clip((wn * h).sum(-1), 0, 1) ** 300 * 4.0
        wcol = deep * (0.6 + 0.4 * np.clip((wn * S).sum(-1), 0, 1))[..., None] * 1.2 + fr[..., None] * sky_r * 0.6 + spec[..., None] * sun_col
        color = np.where(inside[..., None], wcol, color)
        T = np.where(inside, tw, T)
        obj = np.where(inside, 2000, obj)
    if night:
        sky = sky * 0.03 + np.array([0.002, 0.003, 0.008])
    color = np.where(np.isfinite(T)[..., None], color, sky)
    # view-space depth (z along forward)
    z = np.where(np.isfinite(T), T * (D * fwd).sum(-1), np.inf)
    img = lin_to_srgb(aces(color * 0.8))
    return dict(color=(img * 255 + 0.5).astype(np.uint8), z=z.astype(np.float32), obj=obj, normal=N)


def gauss_blur(a, sigma):
    r = max(1, int(3 * sigma))
    k = np.exp(-0.5 * (np.arange(-r, r + 1) / sigma) ** 2)
    k /= k.sum()
    p = np.pad(a, r, mode='edge')
    tmp = sum(k[i] * p[:, i:i + a.shape[1]] for i in range(2 * r + 1))
    return sum(k[i] * tmp[i:i + a.shape[0], :] for i in range(2 * r + 1)).astype(np.float32)


def simulate_unishade_depth(z, W, H, zfar=120.0, seed=0, est_w=266, est_h=154, mode='linear'):
    """Emulate depth-anything-v2-small at ~266x154: low-res, soft edges, mild noise and
    affine/gamma distortion; returned as the value GetLinearizedDepth should yield
    (0 near .. 1 far/sky) for mode='linear'."""
    rng = np.random.default_rng(seed)
    disp = np.where(np.isfinite(z), 1.0 / np.maximum(z, 0.05), 0.0)
    disp = disp / max(disp.max(), 1e-6)
    img = Image.fromarray(disp.astype(np.float32), mode='F')
    lo = np.array(img.resize((est_w, est_h), Image.BOX), dtype=np.float32)
    # estimator smoothing + relative errors (soft blobs, not per-pixel noise)
    lo = gauss_blur(lo, 0.8)
    yy, xx = np.mgrid[0:est_h, 0:est_w]
    wob = (fbm(xx / 18.0, yy / 18.0, 3, seed + 5) - 0.5) * 0.04
    lo = np.clip(lo * (1 + wob + rng.normal(0, 0.004, lo.shape)), 0, 1)  # relative error: sky stays 0
    lo = lo ** 0.9  # affine-invariant disparity is never exactly 1/z
    up = np.array(Image.fromarray(lo.astype(np.float32), mode='F').resize((W, H), Image.BILINEAR), dtype=np.float32)
    up = np.clip(up, 0, 1)
    if mode == 'disparity':
        return (1.0 - up).astype(np.float32)          # near 0, far 1, but in disparity units
    # linear: invert disparity to depth, normalise so the far clip / sky is 1
    dmin = 1.0 / zfar
    zl = 1.0 / np.maximum(up, 1e-4)
    lin = np.clip(zl / (1.0 / dmin) , 0, 1)
    lin = np.where(up <= dmin, 1.0, lin)
    if mode == 'linear_inverted':
        return (1.0 - lin).astype(np.float32)
    return lin.astype(np.float32)


def overlay_ui(img_u8):
    """Roblox-style UI: top bar pills, leaderboard, white shop panel, chat box."""
    H, W = img_u8.shape[:2]
    im = Image.fromarray(img_u8).convert('RGBA')
    ov = Image.new('RGBA', im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    s = H / 768.0
    f_small = ImageFont.truetype(FONT, int(14 * s))
    f_med = ImageFont.truetype(FONT_B, int(18 * s))
    f_big = ImageFont.truetype(FONT_B, int(26 * s))
    mask = np.zeros((H, W), bool)
    # top bar pills (dark translucent with white icons)
    for i in range(3):
        x0, y0 = int((10 + i * 46) * s), int(6 * s)
        box = (x0, y0, x0 + int(40 * s), y0 + int(28 * s))
        d.rounded_rectangle(box, radius=int(10 * s), fill=(18, 18, 21, 175))
        cx, cy = (box[0] + box[2]) // 2, (box[1] + box[3]) // 2
        if i == 0:
            d.rounded_rectangle((cx - 8 * s, cy - 8 * s, cx + 8 * s, cy + 8 * s), radius=int(3 * s), outline=(255, 255, 255, 255), width=max(1, int(2 * s)))
        elif i == 1:
            for k in range(3):
                d.line((cx - 8 * s, cy - 6 * s + k * 6 * s, cx + 8 * s, cy - 6 * s + k * 6 * s), fill=(255, 255, 255, 255), width=max(1, int(2 * s)))
        else:
            d.ellipse((cx - 8 * s, cy - 7 * s, cx + 8 * s, cy + 7 * s), outline=(255, 255, 255, 255), width=max(1, int(2 * s)))
        mask[box[1]:box[3], box[0]:box[2]] = True
    # leaderboard
    lb = (W - int(230 * s), int(6 * s), W - int(8 * s), int(150 * s))
    d.rounded_rectangle(lb, radius=int(6 * s), fill=(20, 20, 24, 160))
    d.text((lb[0] + 10 * s, lb[1] + 6 * s), "People", font=f_med, fill=(255, 255, 255, 255))
    for k, n in enumerate(["Builderman", "NoobMaster99", "rog_player", "Guest_1337"]):
        d.text((lb[0] + 10 * s, lb[1] + (34 + k * 26) * s), n, font=f_small, fill=(235, 235, 235, 255))
    mask[lb[1]:lb[3], lb[0]:lb[2]] = True
    # white shop panel
    sp = (int(W * 0.36), int(H * 0.30), int(W * 0.64), int(H * 0.62))
    d.rounded_rectangle(sp, radius=int(12 * s), fill=(250, 250, 250, 255), outline=(200, 200, 200, 255), width=2)
    d.text((sp[0] + 18 * s, sp[1] + 14 * s), "SHOP", font=f_big, fill=(25, 25, 30, 255))
    for k, n in enumerate(["Gravity Coil   100 R$", "Speed Coil      75 R$", "Rainbow Carpet 200 R$"]):
        d.text((sp[0] + 18 * s, sp[1] + (62 + k * 30) * s), n, font=f_small, fill=(40, 40, 45, 255))
    bt = (sp[0] + int(18 * s), sp[3] - int(52 * s), sp[0] + int(160 * s), sp[3] - int(14 * s))
    d.rounded_rectangle(bt, radius=int(8 * s), fill=(0, 176, 111, 255))
    d.text((bt[0] + 22 * s, bt[1] + 8 * s), "BUY", font=f_med, fill=(255, 255, 255, 255))
    mask[sp[1]:sp[3], sp[0]:sp[2]] = True
    # chat
    ch = (int(8 * s), int(52 * s), int(340 * s), int(200 * s))
    d.rounded_rectangle(ch, radius=int(6 * s), fill=(30, 30, 30, 120))
    for k, n in enumerate(["[Server]: Tsunami incoming!", "rog_player: run to the hill", "Guest_1337: lol"]):
        d.text((ch[0] + 10 * s, ch[1] + (10 + k * 24) * s), n, font=f_small, fill=(255, 255, 255, 255), stroke_width=1, stroke_fill=(0, 0, 0, 200))
    mask[ch[1]:ch[3], ch[0]:ch[2]] = True
    out = Image.alpha_composite(im, ov).convert('RGB')
    return np.array(out), mask, dict(shop=sp, chat=ch, lb=lb)


def make_scenes(W=1280, H=768):
    sc = {}
    # 1) flat glossy floor (SmoothPlastic lobby) with parts and a character
    boxes = [
        Box((-3, 0, 6), (-1, 4, 8), [0.85, 0.2, 0.2], 'plain', 0.5),
        Box((1.5, 0, 9), (4.5, 2.5, 12), [0.15, 0.45, 0.9], 'studs', 0.4),
        Box((-8, 0, 14), (-4, 6, 18), [0.95, 0.75, 0.2], 'plain', 0.3),
        Box((5, 0, 16), (9, 3, 20), [0.3, 0.8, 0.35], 'plain', 0.3),
        Box((-0.5, 0, 3.2), (0.5, 1.2, 3.8), [0.2, 0.3, 0.75], 'plain', 0.2),  # legs
        Box((-0.6, 1.2, 3.1), (0.6, 2.3, 3.9), [0.95, 0.85, 0.15], 'plain', 0.2),  # torso
        Box((-0.3, 2.3, 3.3), (0.3, 2.9, 3.7), [0.98, 0.8, 0.35], 'plain', 0.2),  # head
        Box((-30, 0, 40), (30, 12, 42), [0.75, 0.75, 0.78], 'bricks', 0.1),
    ]
    sc['floor'] = render((0, 4.5, -2), 0.0, -0.32, boxes, dict(color=[0.55, 0.58, 0.62], tex='smooth', gloss=0.5), W, H)
    # 2) water pool
    boxes_w = [
        Box((-6, 0, 18), (6, 1.5, 24), [0.86, 0.78, 0.55], 'grass', 0.05),
        Box((-2, 1.5, 19), (1, 5, 22), [0.6, 0.35, 0.2], 'wood', 0.1),
        Box((-30, 0, 45), (30, 9, 47), [0.6, 0.62, 0.6], 'rock', 0.05),
        Box((7, 0, 6), (10, 3, 10), [0.85, 0.25, 0.25], 'plain', 0.4),
    ]
    sc['water'] = render((0, 5, -4), 0.0, -0.28, boxes_w, dict(color=[0.35, 0.6, 0.25], tex='grass', gloss=0.05), W, H,
                         water=dict(y=0.3, rect=(-25, 25, 0, 40)))
    # 3) bright sky / sun
    boxes_s = [
        Box((-40, 0, 60), (-10, 18, 70), [0.7, 0.7, 0.72], 'bricks', 0.1),
        Box((15, 0, 50), (35, 25, 60), [0.8, 0.8, 0.85], 'plain', 0.2),
        Box((-4, 0, 12), (4, 3, 16), [0.9, 0.2, 0.2], 'plain', 0.4),
    ]
    sc['sky'] = render((0, 3, -2), 0.25, 0.12, boxes_s, dict(color=[0.35, 0.6, 0.25], tex='grass', gloss=0.05), W, H,
                       sun_dir=(0.42, 0.33, 0.85), clouds=True)
    # 4) UI on top of the floor scene
    ui_img, ui_mask, ui_boxes = overlay_ui(sc['floor']['color'])
    sc['ui'] = dict(sc['floor'])
    sc['ui']['color'] = ui_img
    sc['ui']['ui_mask'] = ui_mask
    sc['ui']['ui_boxes'] = ui_boxes
    # 5) high-detail textures: bricks, studs, rock
    boxes_t = [
        Box((-6, 0, 6), (-0.5, 6, 7), [0.7, 0.32, 0.22], 'bricks', 0.1),
        Box((0.5, 0, 5), (4, 2.5, 8.5), [0.55, 0.55, 0.55], 'rock', 0.05),
        Box((-30, 0, 30), (30, 8, 31), [0.6, 0.6, 0.6], 'bricks', 0.1),
    ]
    sc['texture'] = render((0.5, 2.6, -0.5), -0.15, -0.22, boxes_t, dict(color=[0.36, 0.62, 0.3], tex='studs', gloss=0.25), W, H)
    # 6) night with neon parts and a lamp (bloom test) + white UI text
    boxes_n = [
        Box((-6, 0, 10), (-5, 6, 11), [1.0, 0.1, 0.6], 'plain', 0.2, emit=6.0),     # neon pink pillar
        Box((3, 0.2, 12), (9, 1.0, 12.6), [0.1, 0.8, 1.0], 'plain', 0.2, emit=5.0),  # neon cyan bar
        Box((-0.25, 0, 14), (0.25, 5, 14.5), [0.3, 0.3, 0.32], 'plain', 0.2),        # lamp post
        Box((-0.8, 5, 13.6), (0.8, 5.6, 14.9), [1.0, 0.92, 0.7], 'plain', 0.2, emit=9.0),  # lamp
        Box((-20, 0, 30), (20, 10, 32), [0.6, 0.6, 0.62], 'bricks', 0.1),
    ]
    sc['neon'] = render((0, 3, -2), 0.0, -0.08, boxes_n, dict(color=[0.45, 0.47, 0.5], tex='smooth', gloss=0.5), W, H, night=True)
    img = Image.fromarray(sc['neon']['color'])
    d = ImageDraw.Draw(img)
    f = ImageFont.truetype(FONT_B, int(22 * H / 768))
    d.text((int(W * 0.04), int(H * 0.88)), "Survived: 3 disasters   Coins: 1,250", font=f, fill=(255, 255, 255))
    sc['neon']['color'] = np.array(img)
    m = np.zeros((H, W), bool); m[int(H * 0.87):int(H * 0.95), int(W * 0.03):int(W * 0.6)] = True
    sc['neon']['ui_mask'] = m
    sc['neon']['ui_boxes'] = dict(shop=(int(W * 0.03), int(H * 0.87), int(W * 0.6), int(H * 0.95)))
    return sc
