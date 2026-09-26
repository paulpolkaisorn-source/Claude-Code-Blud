"""Stickman skeleton: pose library, forward kinematics, 2-bone IK and drawing."""
import math

import numpy as np

from .config import SPINE, NECK, HEAD_R, UARM, FARM, THIGH, SHIN, LIMB_W, TORSO_W

# joint indices
HIP, CHEST, NECKJ, HEAD, ELB_F, HAND_F, ELB_B, HAND_B, KNEE_F, FOOT_F, KNEE_B, FOOT_B = range(12)
NJ = 12
JOINT = dict(hip=HIP, chest=CHEST, neck=NECKJ, head=HEAD, elb_f=ELB_F, hand_f=HAND_F,
             elb_b=ELB_B, hand_b=HAND_B, knee_f=KNEE_F, foot_f=FOOT_F, knee_b=KNEE_B, foot_b=FOOT_B)

ANGLES = ('lean', 'head', 'fa1', 'fa2', 'ba1', 'ba2', 'fl1', 'fl2', 'bl1', 'bl2')

# ---------------------------------------------------------------------------
# Pose library. Facing right. Degrees.
#   lean: torso lean (+ forward)        head: head tilt (+ chin down)
#   fa1/ba1: front/back upper arm from spine-down axis (+ toward forward/up)
#   fa2/ba2: elbow bend (+ natural bend)
#   fl1/bl1: front/back thigh from pelvis-down axis (+ forward)
#   fl2/bl2: knee bend (- natural bend)
# ---------------------------------------------------------------------------
_P = dict(
    stand=(0, 2, 10, 12, -10, 14, 6, -4, -6, -5),
    relaxed=(3, 6, 6, 18, -6, 20, 10, -8, -10, -6),
    stance=(10, 6, 58, 100, 24, 124, 30, -24, -30, -22),
    stance_low=(18, 0, 62, 96, 30, 120, 42, -52, -32, -48),
    jab=(16, 4, 98, 4, 22, 124, 38, -16, -36, -10),
    cross=(24, 6, 44, 112, 104, 6, 42, -20, -40, -6),
    hook=(20, 8, 104, 78, 26, 124, 36, -22, -34, -12),
    uppercut=(6, -8, 36, 110, 70, 138, 24, -10, -26, -6),
    uppercut_wind=(30, 6, 44, 104, -14, 120, 44, -58, -28, -50),
    palm=(20, 2, 100, 0, -12, 44, 44, -18, -40, -8),
    double_palm=(14, 2, 98, 0, 92, 0, 40, -28, -38, -22),
    beam_charge=(2, 8, -34, 112, -40, 108, 40, -30, -40, -24),
    kick_front=(-16, 6, 44, 96, 30, 110, 96, -4, -8, -8),
    kick_front_ch=(-6, 6, 50, 100, 26, 116, 92, -110, -12, -14),
    kick_round=(-34, -4, 44, 92, -34, 40, -4, -6, 116, -10),
    kick_high=(-44, -10, 50, 96, -40, 40, -6, -6, 138, -6),
    kick_round_ch=(-14, 4, 54, 100, -10, 60, -2, -8, 100, -120),
    back_kick=(40, 18, 30, 90, 10, 90, 4, -10, -96, -6),
    axe_up=(-24, -10, 60, 90, 40, 100, 160, -4, -10, -30),
    axe_down=(26, 10, 40, 100, 20, 110, 50, -4, -20, -40),
    sweep=(34, -14, 60, 20, -30, 60, 88, -2, 64, -150),
    duck=(40, -18, 70, 100, 40, 120, 74, -120, -12, -110),
    dodge_back=(-42, -12, 44, 92, -30, 60, 30, -40, -12, -64),
    slip=(34, 4, 66, 100, 32, 124, 48, -60, -26, -48),
    block_high=(4, 10, 118, 108, 104, 116, 30, -26, -30, -24),
    block_mid=(16, 10, 64, 126, 52, 132, 34, -28, -32, -26),
    guard_x=(8, 16, 152, 76, 146, 80, 50, -80, -28, -64),
    hit_head=(-28, -34, 30, 40, -34, 24, 30, -14, -22, -24),
    hit_body=(46, 22, 22, 104, 12, 112, 22, -42, -16, -36),
    hit_air=(-30, -30, 120, 30, -70, 20, 40, -40, -30, -60),
    hit_heavy=(-18, -40, 150, 20, -120, 10, 60, -30, -40, -20),
    lie=(0, -4, 20, 30, -10, 30, 14, -20, -6, -10),
    crouch=(36, -22, 34, 60, -22, 40, 84, -132, 8, -122),
    land3=(58, -38, 52, -6, -62, 30, 88, -142, -36, -96),
    dash=(42, -30, -44, 24, -54, 20, 64, -84, -42, -46),
    dash2=(42, -30, -44, 24, -54, 20, -30, -40, 60, -90),
    tuck=(24, 6, 64, 96, 54, 104, 104, -134, 84, -126),
    fly_kick=(-22, -4, 60, 94, -20, 40, 84, -4, 60, -124),
    knee=(-6, 6, 104, 62, 86, 70, 112, -134, -12, -10),
    elbow_up=(10, 4, 172, 150, 30, 110, 36, -30, -30, -20),
    elbow_down=(40, 10, 96, 150, 20, 110, 40, -40, -30, -30),
    hammer_up=(-18, -14, 176, 40, 170, 50, 40, -40, -20, -40),
    hammer=(34, 14, 104, 8, 98, 14, 40, -60, -30, -50),
    throw=(62, 24, 70, 40, 60, 50, 40, -40, -40, -30),
    catch=(8, 8, 84, 22, 74, 34, 36, -30, -34, -24),
    cast_up=(-12, -26, 162, 12, 150, 16, 20, -10, -20, -10),
    roar=(-22, -42, 124, 16, -112, -10, 34, -20, -34, -14),
    float=(6, 6, 26, 44, -16, 34, 18, -34, -6, -44),
    float_guard=(10, 6, 60, 100, 26, 122, 22, -40, -8, -50),
    float_back=(-8, -4, 40, 60, -30, 40, 34, -60, 10, -80),
    tired=(22, 16, 16, 34, 6, 30, 22, -24, -18, -20),
    slash_up=(-12, -8, 168, 36, -20, 50, 34, -18, -32, -14),
    slash_down=(32, 8, 58, 2, -30, 40, 44, -30, -34, -16),
    slash_across=(20, 4, 112, 0, -20, 50, 42, -22, -36, -12),
    chop=(28, 10, 70, 0, 10, 100, 40, -30, -36, -18),
    backhand=(6, 0, 118, -40, 20, 120, 30, -24, -30, -22),
    superman=(0, -30, 178, 0, -14, 16, 6, -12, -10, -24),
    fist_fwd=(0, -20, 150, 0, -30, 30, 10, -30, -14, -50),
    kip=(-10, -20, 120, 60, 110, 60, 110, -30, 100, -40),
    windup=(-6, 0, 44, 110, -40, 130, 34, -26, -34, -20),
    point=(6, 4, 94, 0, -10, 20, 14, -10, -14, -8),
)
POSES = {k: dict(zip(ANGLES, v)) for k, v in _P.items()}


def P(name, **mods):
    """Pose dict by name with optional per-angle overrides (absolute) or deltas (d_ prefix)."""
    p = dict(POSES[name])
    for k, v in mods.items():
        if k.startswith('d_'):
            p[k[2:]] += v
        else:
            p[k] = v
    return p


def mix(a, b, w):
    a = POSES[a] if isinstance(a, str) else a
    b = POSES[b] if isinstance(b, str) else b
    return {k: a[k] + (b[k] - a[k]) * w for k in ANGLES}


# ---------------------------------------------------------------------------
# Kinematics
# ---------------------------------------------------------------------------

def _up(a):
    return (-math.sin(a), math.cos(a))


def _down(a):
    return (math.sin(a), -math.cos(a))


def fk_local(v):
    """Local joint positions (facing right, hip at origin). v: dict with ANGLES + rot."""
    r = math.radians
    rot = r(v.get('rot', 0.0))
    phi = rot - r(v['lean'])
    J = np.zeros((NJ, 2))
    u = _up(phi)
    J[CHEST] = (SPINE * u[0], SPINE * u[1])
    hphi = phi - r(v['head'])
    u2 = _up(phi - 0.4 * r(v['head']))
    J[NECKJ] = J[CHEST] + (NECK * u2[0], NECK * u2[1])
    u3 = _up(hphi)
    J[HEAD] = J[NECKJ] + (HEAD_R * u3[0], HEAD_R * u3[1])
    for (a1n, a2n, e, h) in (('fa1', 'fa2', ELB_F, HAND_F), ('ba1', 'ba2', ELB_B, HAND_B)):
        a1 = phi + r(v[a1n])
        d = _down(a1)
        sh = J[CHEST] - (2.0 * u[0], 2.0 * u[1])
        J[e] = sh + (UARM * d[0], UARM * d[1])
        a2 = a1 + r(v[a2n])
        d = _down(a2)
        J[h] = J[e] + (FARM * d[0], FARM * d[1])
    for (b1n, b2n, k, f) in (('fl1', 'fl2', KNEE_F, FOOT_F), ('bl1', 'bl2', KNEE_B, FOOT_B)):
        b1 = rot + r(v[b1n])
        d = _down(b1)
        J[k] = (THIGH * d[0], THIGH * d[1])
        b2 = b1 + r(v[b2n])
        d = _down(b2)
        J[f] = J[k] + (SHIN * d[0], SHIN * d[1])
    return J


def ground_offset(J):
    """Height the hip must be raised so the lowest body point (not hands) touches y=0."""
    lo = min(J[FOOT_F, 1], J[FOOT_B, 1], J[KNEE_F, 1] - 4, J[KNEE_B, 1] - 4,
             J[HIP, 1] - 5, J[HEAD, 1] - HEAD_R, J[CHEST, 1] - 5)
    return -lo + 1.0


def to_world(J, x, y, face):
    W = J.copy()
    W[:, 0] = x + face * J[:, 0]
    W[:, 1] = y + J[:, 1]
    return W


def ik2(root, target, a, b, knee_hint):
    """2-bone IK. Returns the mid joint closest to knee_hint and the (clamped) end."""
    d = target - root
    dist = math.hypot(d[0], d[1])
    dist_c = min(max(dist, abs(a - b) + 1e-3), a + b - 1e-3)
    if dist < 1e-6:
        return knee_hint, target
    n = d / dist
    end = root + n * dist_c if dist > a + b - 1e-3 else target
    x = (a * a - b * b + dist_c * dist_c) / (2 * dist_c)
    h = math.sqrt(max(a * a - x * x, 0.0))
    perp = np.array([-n[1], n[0]])
    c1 = root + n * x + perp * h
    c2 = root + n * x - perp * h
    if np.sum((c1 - knee_hint) ** 2) < np.sum((c2 - knee_hint) ** 2):
        return c1, end
    return c2, end


# ---------------------------------------------------------------------------
# Drawing
# ---------------------------------------------------------------------------

def _poly(ctx, pts):
    ctx.move_to(*pts[0])
    for p in pts[1:]:
        ctx.line_to(*p)


def head_frame(J, face):
    up = J[HEAD] - J[NECKJ]
    n = math.hypot(*up) or 1.0
    up = up / n
    fwd = np.array([face * up[1], -face * up[0]])
    return up, fwd


def draw_fighter(ctx, J, face, pal, alpha=1.0, eye=1.0, ribbon=None, tint=None, outline=True):
    """Draw a fighter in world coordinates (y up). J: world joints (12x2)."""
    import cairocffi as cairo
    body = tint or pal['body']
    back = tint or pal['back']
    ol = pal['outline']
    ola = pal['outline_a'] * alpha if outline else 0.0
    ctx.save()
    ctx.set_line_cap(cairo.LINE_CAP_ROUND)
    ctx.set_line_join(cairo.LINE_JOIN_ROUND)

    def limb(pts, col, w):
        if ola > 0:
            _poly(ctx, pts)
            ctx.set_source_rgba(ol[0], ol[1], ol[2], ola)
            ctx.set_line_width(w + 3.2)
            ctx.stroke()
        _poly(ctx, pts)
        ctx.set_source_rgba(col[0], col[1], col[2], alpha)
        ctx.set_line_width(w)
        ctx.stroke()

    # ribbon (behind everything)
    if ribbon is not None and len(ribbon) > 1:
        rc = pal['ribbon']
        n = len(ribbon)
        for i in range(n - 1):
            w = 5.0 * (1.0 - i / n) + 1.2
            ctx.move_to(*ribbon[i])
            ctx.line_to(*ribbon[i + 1])
            ctx.set_source_rgba(rc[0], rc[1], rc[2], alpha)
            ctx.set_line_width(w)
            ctx.stroke()

    sh = J[CHEST]
    limb([J[HIP], J[KNEE_B], J[FOOT_B]], back, LIMB_W)
    limb([sh, J[ELB_B], J[HAND_B]], back, LIMB_W)
    # torso + neck
    limb([J[HIP], J[CHEST], J[NECKJ]], body, TORSO_W)
    # head
    hx, hy = J[HEAD]
    if ola > 0:
        ctx.arc(hx, hy, HEAD_R + 1.6, 0, 2 * math.pi)
        ctx.set_source_rgba(ol[0], ol[1], ol[2], ola)
        ctx.fill()
    ctx.arc(hx, hy, HEAD_R, 0, 2 * math.pi)
    ctx.set_source_rgba(body[0], body[1], body[2], alpha)
    ctx.fill()
    limb([J[HIP], J[KNEE_F], J[FOOT_F]], body, LIMB_W)
    limb([sh, J[ELB_F], J[HAND_F]], body, LIMB_W)
    # fists
    for h in (HAND_F,):
        ctx.arc(J[h][0], J[h][1], LIMB_W * 0.72, 0, 2 * math.pi)
        ctx.set_source_rgba(body[0], body[1], body[2], alpha)
        ctx.fill()
    # eye
    if eye > 0.01:
        up, fwd = head_frame(J, face)
        c = np.array([hx, hy])
        p0 = c + fwd * HEAD_R * 0.22 + up * HEAD_R * 0.16
        p1 = c + fwd * HEAD_R * 0.80 + up * HEAD_R * 0.05
        e = pal['eye']
        ctx.move_to(*p0)
        ctx.line_to(*p1)
        ctx.set_source_rgba(e[0], e[1], e[2], alpha * min(1.0, eye))
        ctx.set_line_width(3.4)
        ctx.stroke()
    ctx.restore()


def ribbon_anchor(J, face):
    up, fwd = head_frame(J, face)
    return J[HEAD] - fwd * HEAD_R * 0.85 + up * HEAD_R * 0.25
