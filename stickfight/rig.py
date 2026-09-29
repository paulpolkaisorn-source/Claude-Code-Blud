"""Stickman rig: tracks, IK, procedural footwork, cloth, drawing.

World space: metres, y up.  All times are *world time* (seconds).
"""
import bisect
import math
from math import sin, cos, atan2, sqrt, pi, exp, hypot, acos

# ----------------------------------------------------------------------------
# small math helpers
# ----------------------------------------------------------------------------


def clamp(x, a, b):
    return a if x < a else b if x > b else x


def lerp(a, b, t):
    return a + (b - a) * t


def sstep(e0, e1, x):
    t = clamp((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def sgn(x, default=1.0):
    return 1.0 if x > 1e-4 else -1.0 if x < -1e-4 else default


def _back(t, c=1.70158):
    c3 = c + 1
    return 1 + c3 * (t - 1) ** 3 + c * (t - 1) ** 2


def _backin(t, c=1.2):
    c3 = c + 1
    return c3 * t * t * t - c * t * t


def _spring(t):
    if t >= 1:
        return 1.0
    return 1 - exp(-7.0 * t) * cos(11.0 * t)


EASE = {
    'lin': lambda t: t,
    'smooth': lambda t: t * t * (3 - 2 * t),
    'smoother': lambda t: t * t * t * (t * (6 * t - 15) + 10),
    'in': lambda t: t * t * t,
    'in2': lambda t: t * t,
    'out': lambda t: 1 - (1 - t) ** 3,
    'out2': lambda t: 1 - (1 - t) ** 2,
    'out4': lambda t: 1 - (1 - t) ** 4,
    'out5': lambda t: 1 - (1 - t) ** 5,
    'snap': lambda t: 1 - (1 - t) ** 7,
    'back': _back,
    'backin': _backin,
    'spring': _spring,
    'step': lambda t: 1.0 if t >= 1 else 0.0,
    'cr': lambda t: t,  # handled specially
}


WARN = [True]


class Track:
    """Scalar keyframe track. add(t, value, ease): segment *ending* at this key uses ease."""

    def __init__(self, v0=0.0):
        self.t = [-1e9]
        self.v = [v0]
        self.e = ['lin']

    def add(self, t, v, ease='smooth'):
        if t < self.t[-1] - 1e-9 and WARN[0]:
            import traceback
            st = [f for f in traceback.extract_stack() if f.filename.endswith(('script.py', 'moves.py'))]
            where = ' <- '.join('%s:%d' % (f.filename.split('/')[-1], f.lineno) for f in st[-3:])
            print('WARN out-of-order key t=%.3f < last %.3f  at %s' % (t, self.t[-1], where))
        i = bisect.bisect_right(self.t, t)
        self.t.insert(i, t)
        self.v.insert(i, v)
        self.e.insert(i, ease)
        return self

    def last_t(self):
        return self.t[-1]

    def pin(self, t):
        """Add a key at t holding the currently evaluated value (so later keys start from here)."""
        return self.add(t, self(t), 'lin')

    def cut(self, t):
        """Freeze the value at t and drop every later key (a new movement overrides what was planned)."""
        v = self(t)
        while len(self.t) > 1 and self.t[-1] > t:
            self.t.pop()
            self.v.pop()
            self.e.pop()
        return self.add(t, v, 'lin')

    def __call__(self, t):
        ts = self.t
        if t >= ts[-1]:
            return self.v[-1]
        i = bisect.bisect_right(ts, t) - 1
        t0, t1 = ts[i], ts[i + 1]
        v0, v1 = self.v[i], self.v[i + 1]
        u = (t - t0) / (t1 - t0)
        ea = self.e[i + 1]
        if ea == 'cr':
            # Hermite with finite-difference tangents
            dt = t1 - t0
            if i >= 1:
                m0 = (v1 - self.v[i - 1]) / (t1 - ts[i - 1])
            else:
                m0 = 0.0
            if i + 2 < len(ts):
                m1 = (self.v[i + 2] - v0) / (ts[i + 2] - t0)
            else:
                m1 = 0.0
            u2, u3 = u * u, u * u * u
            return ((2 * u3 - 3 * u2 + 1) * v0 + (u3 - 2 * u2 + u) * dt * m0 +
                    (-2 * u3 + 3 * u2) * v1 + (u3 - u2) * dt * m1)
        return v0 + (v1 - v0) * EASE[ea](u)


class PTrack:
    """Target track whose keys live in coordinate frames (see Fighter.basis)."""

    def __init__(self, owner):
        self.o = owner
        self.k = []   # (t, frame, ox, oy, w, ease)

    def add(self, t, frame, ox, oy, w=1.0, ease='smooth'):
        keys = self.k
        i = 0
        ts = [q[0] for q in keys]
        i = bisect.bisect_right(ts, t)
        keys.insert(i, (t, frame, ox, oy, w, ease))
        return self

    def pin(self, t, w=None):
        """Freeze the current target at time t into a body-frame key so a new movement can start from it."""
        cur = self(t)
        if cur is None:
            return self
        b = self.o.basis('body', t)
        dx, dy = cur[0] - b[0], cur[1] - b[1]
        ox = dx * b[2] + dy * b[3]
        ox = ox / (b[2] * b[2] + 1e-9) if abs(b[2]) > 1e-6 else 0.0
        oy = dy
        self.add(t, 'body', ox, oy, cur[2] if w is None else w, 'lin')
        return self

    def cut(self, t):
        if not self.k:
            return self
        self.pin(t)
        self.k = [q for q in self.k if q[0] <= t + 1e-9]
        return self

    def trim(self, t):
        """Drop keys at or after t (no pin)."""
        self.k = [q for q in self.k if q[0] < t]
        return self

    def _pos(self, key, t):
        _, fr, ox, oy, _, _ = key
        b = self.o.basis(fr, t)
        return (b[0] + ox * b[2] + oy * b[4], b[1] + ox * b[3] + oy * b[5])

    def __call__(self, t):
        keys = self.k
        if not keys:
            return None
        if t <= keys[0][0]:
            p = self._pos(keys[0], t)
            return p[0], p[1], keys[0][4]
        if t >= keys[-1][0]:
            p = self._pos(keys[-1], t)
            return p[0], p[1], keys[-1][4]
        lo, hi = 0, len(keys) - 1
        while hi - lo > 1:
            mid = (lo + hi) // 2
            if keys[mid][0] <= t:
                lo = mid
            else:
                hi = mid
        k0, k1 = keys[lo], keys[hi]
        u = (t - k0[0]) / (k1[0] - k0[0])
        e = EASE[k1[5]](u)
        p0 = self._pos(k0, t)
        p1 = self._pos(k1, t)
        return lerp(p0[0], p1[0], e), lerp(p0[1], p1[1], e), lerp(k0[4], k1[4], e)


# ----------------------------------------------------------------------------
# IK
# ----------------------------------------------------------------------------


def ik2(p0, target, l1, l2, side):
    """Two-bone IK. side = +1/-1 picks bend direction. Returns (mid, end)."""
    dx, dy = target[0] - p0[0], target[1] - p0[1]
    D = hypot(dx, dy)
    if D < 1e-6:
        ux, uy = 0.0, -1.0
    else:
        ux, uy = dx / D, dy / D
    d = clamp(D, abs(l1 - l2) + 1e-3, (l1 + l2) * 0.9995)
    a = (l1 * l1 - l2 * l2 + d * d) / (2 * d)
    h = sqrt(max(l1 * l1 - a * a, 0.0))
    px, py = -uy * side, ux * side
    mid = (p0[0] + ux * a + px * h, p0[1] + uy * a + py * h)
    end = (p0[0] + ux * d, p0[1] + uy * d)
    return mid, end


# ----------------------------------------------------------------------------
# Fighter
# ----------------------------------------------------------------------------

L_THIGH = 0.46
L_SHIN = 0.46
L_UARM = 0.30
L_FARM = 0.31
L_SPINE = 0.28
HEAD_R = 0.118
HEAD_OFF = 0.205
STAND_H = 0.84


class Fighter:
    def __init__(self, name, x0, face, style, other=None):
        self.name = name
        self.style = style
        self.opp = other
        self.X = Track(x0)
        self.H = Track(STAND_H)
        self.LEAN = Track(0.10)
        self.BEND = Track(0.0)
        self.HEADT = Track(0.0)
        self.FACE = Track(face)
        self.AURA = Track(0.25)
        self.EYE = Track(0.5)
        self.ALPHA = Track(1.0)
        self.SCALE = Track(1.0)
        self.WL = Track(0.0)       # weapon length 0..1
        self.WANG = Track(0.3)     # weapon angle in facing-relative frame
        self.STANCE = Track(0.27)  # stance half width
        self.hand = [PTrack(self), PTrack(self)]
        self.foot = [PTrack(self), PTrack(self)]
        self.phase = 0.0 if face > 0 else 1.7
        # default guard
        self.hand[0].add(-1e9, 'body', 0.42, 0.50, 1.0)
        self.hand[1].add(-1e9, 'body', 0.28, 0.44, 1.0)
        # sim state
        self.feet = [dict(x=x0 + face * 0.27, y=0.05, step=False, t0=0, dur=0.15, sx=0, ex=0, lift=0.1),
                     dict(x=x0 - face * 0.27, y=0.05, step=False, t0=0, dur=0.15, sx=0, ex=0, lift=0.1)]
        self.prev_hip = None
        self.vx = 0.0
        self.footfalls = []
        self.pose = None
        self.cloth = []
        self.last_t = None
        self._make_cloth()

    # ---- frames -------------------------------------------------------------
    def fs(self, t):
        return self.FACE(t)

    def hip(self, t):
        return (self.X(t), self.H(t) + 0.010 * sin(2 * pi * 0.85 * t + self.phase))

    def _up(self, t, f=None):
        th = self.LEAN(t)
        f = self.FACE(t) if f is None else f
        return (f * sin(th), cos(th))

    def basis(self, fr, t):
        f = self.FACE(t)
        if fr == 'world':
            return (0.0, 0.0, 1.0, 0.0, 0.0, 1.0)
        hx, hy = self.hip(t)
        if fr == 'body':
            return (hx, hy, f, 0.0, 0.0, 1.0)
        if fr == 'gnd':
            return (hx, 0.0, f, 0.0, 0.0, 1.0)
        if fr == 'sh':
            ux, uy = self._up(t, f)
            return (hx + ux * 0.56, hy + uy * 0.56, f, 0.0, 0.0, 1.0)
        if fr == 'trunk':
            th = self.LEAN(t)
            ux, uy = f * sin(th), cos(th)
            return (hx, hy, f * cos(th), -sin(th), ux, uy)
        o = self.opp
        if fr in ('opp', 'oppc', 'opph', 'oppg'):
            ox, oy = o.hip(t)
            if fr == 'oppc':
                oy += 0.40
            elif fr == 'opph':
                oy += 0.72
            elif fr == 'oppg':
                oy = 0.0
            return (ox, oy, f, 0.0, 0.0, 1.0)
        raise KeyError(fr)

    # ---- cloth --------------------------------------------------------------
    def _make_cloth(self):
        self.cloth = []
        for (n, seg, side) in ((18, 0.085, 0.0), (11, 0.075, 0.0)):
            self.cloth.append(dict(n=n, seg=seg,
                                   p=[[self.X(0) - i * seg, 1.4] for i in range(n)],
                                   q=[[self.X(0) - i * seg, 1.4] for i in range(n)]))

    def _sim_cloth(self, anchor, f, t, dt):
        # world dt substepped
        sub = max(1, int(math.ceil(dt / (1 / 200))))
        h = dt / sub
        for si, c in enumerate(self.cloth):
            p, q, n, seg = c['p'], c['q'], c['n'], c['seg']
            for _ in range(sub):
                # anchor
                ax = anchor[0] - f * (0.03 + 0.05 * si)
                ay = anchor[1] + (0.02 if si == 0 else -0.05)
                p[0][0], p[0][1] = ax, ay
                for i in range(1, n):
                    x, y = p[i]
                    ox, oy = q[i]
                    vx, vy = (x - ox) * 0.975, (y - oy) * 0.975
                    wind = 1.3 * sin(t * 1.3 + i * 0.12 + si) + 0.9 * sin(t * 2.3 + i * 0.22)
                    axl = (-f * 3.2 + wind * 0.6) * (0.5 + 0.5 * i / n)
                    ayl = -1.6 + 0.9 * sin(t * 1.7 + i * 0.18 + si * 2)
                    q[i][0], q[i][1] = x, y
                    p[i][0] = x + vx + axl * h * h
                    p[i][1] = y + vy + ayl * h * h
                for _it in range(3):
                    for i in range(1, n):
                        a, b = p[i - 1], p[i]
                        dx, dy = b[0] - a[0], b[1] - a[1]
                        d = hypot(dx, dy) or 1e-6
                        diff = (d - seg) / d
                        if i == 1:
                            b[0] -= dx * diff
                            b[1] -= dy * diff
                        else:
                            a[0] += dx * diff * 0.5
                            a[1] += dy * diff * 0.5
                            b[0] -= dx * diff * 0.5
                            b[1] -= dy * diff * 0.5
                    p[0][0], p[0][1] = ax, ay
                # ground (water) floor
                for i in range(1, n):
                    if p[i][1] < 0.02:
                        p[i][1] = 0.02

    # ---- per-frame update ---------------------------------------------------
    def update(self, t, dt):
        f_raw = self.FACE(t)
        fsn = sgn(f_raw, getattr(self, '_fsgn', 1.0))
        self._fsgn = fsn
        hx, hy = self.hip(t)
        sc = self.SCALE(t)
        if self.prev_hip is None or dt <= 0:
            self.vx = 0.0
        else:
            vx = (hx - self.prev_hip[0]) / dt
            self.vx = lerp(self.vx, vx, 0.5)
        self.prev_hip = (hx, hy)
        th = self.LEAN(t)
        bend = self.BEND(t)
        # spine
        a1 = th - 0.5 * bend
        a2 = th + 0.5 * bend
        f = f_raw
        s1 = (f * sin(a1) * L_SPINE, cos(a1) * L_SPINE)
        s2 = (f * sin(a2) * L_SPINE, cos(a2) * L_SPINE)
        mid = (hx + s1[0], hy + s1[1])
        neck = (mid[0] + s2[0], mid[1] + s2[1])
        ht = self.HEADT(t)
        ah = a2 + ht
        head = (neck[0] + f * sin(ah) * HEAD_OFF, neck[1] + cos(ah) * HEAD_OFF)
        shoulder = (neck[0] - f * sin(a2) * 0.03, neck[1] - cos(a2) * 0.03)

        # ---- arms
        arms = []
        for k in (0, 1):
            tg = self.hand[k](t)
            sh = (shoulder[0] + fsn * (0.015 if k == 0 else -0.015), shoulder[1])
            if tg is None:
                tgt = (sh[0] + fsn * 0.3, sh[1] - 0.2)
            else:
                tgt = (tg[0], tg[1])
            elbow, hand = ik2(sh, tgt, L_UARM, L_FARM, -fsn)
            arms.append((sh, elbow, hand))

        # ---- legs / feet
        airw = sstep(0.87, 1.02, hy)
        ideal = []
        stance = self.STANCE(t)
        speed = abs(self.vx)
        for k in (0, 1):
            ideal.append(hx + fsn * (stance if k == 0 else -stance) + clamp(self.vx, -9, 9) * 0.085)
        legs = []
        for k in (0, 1):
            F = self.feet[k]
            ov = self.foot[k](t)
            w = 0.0 if ov is None else ov[2]
            other = self.feet[1 - k]
            if airw > 0.5:
                F['x'] = hx + fsn * (stance if k == 0 else -stance)
                F['y'] = 0.05
                F['step'] = False
            elif w > 0.98:
                F['x'] = ov[0]
                F['y'] = 0.05
                F['step'] = False
            else:
                if F['step']:
                    u = (t - F['t0']) / F['dur']
                    if u >= 1.0 or dt <= 0:
                        F['step'] = False
                        F['x'] = F['ex']
                        F['y'] = 0.05
                        if speed > 0.5 or True:
                            self.footfalls.append((t, F['x'], min(speed / 8.0, 1.0)))
                    else:
                        e = u * u * (3 - 2 * u)
                        F['x'] = lerp(F['sx'], F['ex'], e)
                        F['y'] = 0.05 + F['lift'] * sin(pi * u) ** 0.8
                else:
                    dev = abs(F['x'] - ideal[k])
                    thr = 0.19 if speed < 1.5 else 0.15
                    if dev > thr and (not other['step'] or dev > 0.42):
                        F['step'] = True
                        F['t0'] = t
                        F['sx'] = F['x']
                        F['ex'] = ideal[k] + clamp(self.vx, -9, 9) * 0.06
                        F['dur'] = clamp(0.20 - 0.013 * speed, 0.085, 0.2)
                        F['lift'] = 0.06 + 0.015 * min(speed, 6)
            gx, gy = F['x'], F['y']
            # air tuck
            if airw > 0.0:
                if k == 0:
                    ax, ay = hx + fsn * 0.20, hy - 0.60
                else:
                    ax, ay = hx - fsn * 0.16, hy - 0.68
                gx, gy = lerp(gx, ax, airw), lerp(gy, ay, airw)
            if w > 0.0:
                gx, gy = lerp(gx, ov[0], w), lerp(gy, ov[1], w)
            hipj = (hx + fsn * (0.012 if k == 0 else -0.012), hy)
            knee, ankle = ik2(hipj, (gx, gy), L_THIGH, L_SHIN, fsn)
            # toe
            sx_, sy_ = ankle[0] - knee[0], ankle[1] - knee[1]
            sl = hypot(sx_, sy_) or 1.0
            sx_, sy_ = sx_ / sl, sy_ / sl
            g = clamp(1 - (ankle[1] - 0.05) / 0.22, 0, 1)
            phi = (28 + 62 * g) * pi / 180
            # rotate shin dir by phi toward the front: (-uy, ux)*s at 90deg
            c_, s_ = cos(phi), sin(phi)
            rx = sx_ * c_ - (fsn * sy_ * -1) * 0  # placeholder (kept simple below)
            # rotation by +phi*fsn' : rotate vector (sx_,sy_) by angle a where a = -phi*fsn (clockwise for right facing)
            a_ = -phi * fsn
            tx = sx_ * cos(a_) - sy_ * sin(a_)
            ty = sx_ * sin(a_) + sy_ * cos(a_)
            toe = (ankle[0] + tx * 0.15, ankle[1] + ty * 0.15)
            legs.append((hipj, knee, ankle, toe))

        # ---- weapon
        wl = self.WL(t)
        weapon = None
        if wl > 0.001:
            ang = self.WANG(t)
            hand0 = arms[0][2]
            dx, dy = fsn * cos(ang), sin(ang)
            weapon = dict(base=(hand0[0] - dx * 0.16, hand0[1] - dy * 0.16),
                          tip=(hand0[0] + dx * 1.25 * wl, hand0[1] + dy * 1.25 * wl),
                          hand=hand0, dir=(dx, dy), length=wl)

        # eye
        eye = (head[0] + fsn * 0.055, head[1] + 0.018)

        # cloth
        self._sim_cloth((neck[0], neck[1] - 0.02), fsn, t, dt if dt > 0 else 1e-4)

        self.pose = dict(hip=(hx, hy), mid=mid, neck=neck, head=head, shoulder=shoulder, arms=arms, legs=legs,
                         face=f, fs=fsn, eye=eye, weapon=weapon, aura=self.AURA(t), alpha=self.ALPHA(t),
                         eyeglow=self.EYE(t), scale=sc,
                         cloth=[[tuple(pp) for pp in c['p']] for c in self.cloth], lean=th)
        return self.pose


# ----------------------------------------------------------------------------
# drawing
# ----------------------------------------------------------------------------


def capsule(ctx, x1, y1, r1, x2, y2, r2):
    dx, dy = x2 - x1, y2 - y1
    d = hypot(dx, dy)
    if d < 1e-6 or d + min(r1, r2) <= max(r1, r2):
        r = max(r1, r2)
        ctx.new_sub_path()
        ctx.arc(x1 if r1 >= r2 else x2, y1 if r1 >= r2 else y2, r, 0, 2 * pi)
        return
    ang = atan2(dy, dx)
    beta = acos(clamp((r1 - r2) / d, -1, 1))
    ctx.new_sub_path()
    ctx.arc(x1, y1, r1, ang + beta, ang + 2 * pi - beta)
    ctx.arc(x2, y2, r2, ang - beta, ang + beta)
    ctx.close_path()


def hexc(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4))


def mix(c1, c2, t):
    return tuple(lerp(a, b, t) for a, b in zip(c1, c2))


def pose_lerp(a, b, u):
    """Linearly interpolate two poses (for motion-blur sub-samples)."""
    if a is None:
        return b

    def lp(p, q):
        return (p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u)
    o = dict(b)
    for k in ('hip', 'mid', 'neck', 'head', 'shoulder', 'eye'):
        o[k] = lp(a[k], b[k])
    o['arms'] = [tuple(lp(a['arms'][i][j], b['arms'][i][j]) for j in range(3)) for i in range(2)]
    o['legs'] = [tuple(lp(a['legs'][i][j], b['legs'][i][j]) for j in range(4)) for i in range(2)]
    if a['weapon'] and b['weapon']:
        w = dict(b['weapon'])
        for k in ('base', 'tip', 'hand'):
            w[k] = lp(a['weapon'][k], b['weapon'][k])
        o['weapon'] = w
    return o


def fighter_shapes(P):
    """Return layered shape lists for a pose: list of layers; each layer = list of capsules (x1,y1,r1,x2,y2,r2) or circles."""
    s = P['scale']
    hip, mid, neck, head = P['hip'], P['mid'], P['neck'], P['head']
    arms, legs = P['arms'], P['legs']

    def arm(k):
        sh, el, ha = arms[k]
        return [(sh[0], sh[1], 0.036 * s, el[0], el[1], 0.030 * s),
                (el[0], el[1], 0.030 * s, ha[0], ha[1], 0.026 * s),
                (ha[0], ha[1], 0.040 * s, ha[0], ha[1], 0.040 * s)]

    def leg(k):
        hj, kn, an, to = legs[k]
        return [(hj[0], hj[1], 0.052 * s, kn[0], kn[1], 0.040 * s),
                (kn[0], kn[1], 0.040 * s, an[0], an[1], 0.030 * s),
                (an[0], an[1], 0.030 * s, to[0], to[1], 0.026 * s)]
    torso = [(hip[0], hip[1], 0.050 * s, mid[0], mid[1], 0.056 * s),
             (mid[0], mid[1], 0.056 * s, neck[0], neck[1], 0.050 * s),
             (neck[0], neck[1], 0.030 * s, head[0], head[1] - 0.06 * 0, 0.022 * s)]
    headc = [(head[0], head[1], HEAD_R * s, head[0], head[1], HEAD_R * s)]
    return dict(far_arm=arm(1), far_leg=leg(1), torso=torso, head=headc, near_leg=leg(0), near_arm=arm(0))


def _draw_group(ctx, shapes, fill, rim, rimw):
    for sh in shapes:
        capsule(ctx, *sh)
    ctx.set_source_rgba(*rim)
    ctx.set_line_width(rimw * 2)
    ctx.set_line_join(1)
    ctx.stroke_preserve()
    ctx.set_source_rgba(*fill)
    ctx.fill()


def draw_cloth(ctx, nodes, w0, w1, fill, rim, rimw, alpha=1.0):
    n = len(nodes)
    left, right = [], []
    for i, (x, y) in enumerate(nodes):
        if i == 0:
            dx, dy = nodes[1][0] - x, nodes[1][1] - y
        elif i == n - 1:
            dx, dy = x - nodes[i - 1][0], y - nodes[i - 1][1]
        else:
            dx, dy = nodes[i + 1][0] - nodes[i - 1][0], nodes[i + 1][1] - nodes[i - 1][1]
        d = hypot(dx, dy) or 1e-6
        nx, ny = -dy / d, dx / d
        u = i / (n - 1)
        wv = lerp(w0, w1, u)
        left.append((x + nx * wv, y + ny * wv))
        right.append((x - nx * wv, y - ny * wv))
    ctx.move_to(*left[0])
    for p in left[1:]:
        ctx.line_to(*p)
    for p in reversed(right):
        ctx.line_to(*p)
    ctx.close_path()
    ctx.set_source_rgba(fill[0], fill[1], fill[2], alpha)
    ctx.fill_preserve()
    ctx.set_source_rgba(rim[0], rim[1], rim[2], alpha * 0.9)
    ctx.set_line_width(rimw)
    ctx.stroke()


def draw_weapon(ctx, W, style, t, alpha=1.0):
    b, tip = W['base'], W['tip']
    dx, dy = W['dir']
    L = hypot(tip[0] - b[0], tip[1] - b[1])
    core = style['blade_core']
    edge = style['blade_edge']
    kind = style['weapon']
    nx, ny = -dy, dx
    # hilt
    ctx.set_line_cap(1)
    ha = W['hand']
    # glow layers
    for wid, al in ((0.16, 0.08), (0.09, 0.16), (0.05, 0.28)):
        ctx.set_source_rgba(edge[0], edge[1], edge[2], al * alpha)
        ctx.set_line_width(wid * min(1, W['length'] * 2))
        if kind == 'curved':
            _curved_path(ctx, W)
        else:
            ctx.move_to(ha[0], ha[1])
            ctx.line_to(*tip)
        ctx.stroke()
    ctx.set_source_rgba(edge[0], edge[1], edge[2], alpha)
    ctx.set_line_width(0.030)
    if kind == 'curved':
        _curved_path(ctx, W)
    else:
        ctx.move_to(ha[0], ha[1])
        ctx.line_to(*tip)
    ctx.stroke()
    ctx.set_source_rgba(core[0], core[1], core[2], alpha)
    ctx.set_line_width(0.016)
    if kind == 'curved':
        _curved_path(ctx, W)
    else:
        ctx.move_to(ha[0], ha[1])
        ctx.line_to(*tip)
    ctx.stroke()
    # handle
    ctx.set_source_rgba(0.12, 0.10, 0.10, alpha)
    ctx.set_line_width(0.038)
    ctx.move_to(*b)
    ctx.line_to(ha[0] + dx * 0.05, ha[1] + dy * 0.05)
    ctx.stroke()
    # guard
    ctx.set_source_rgba(edge[0], edge[1], edge[2], alpha)
    ctx.set_line_width(0.02)
    ctx.move_to(ha[0] + dx * 0.05 - nx * 0.07, ha[1] + dy * 0.05 - ny * 0.07)
    ctx.line_to(ha[0] + dx * 0.05 + nx * 0.07, ha[1] + dy * 0.05 + ny * 0.07)
    ctx.stroke()


def _curved_path(ctx, W):
    ha, tip = W['hand'], W['tip']
    dx, dy = W['dir']
    nx, ny = -dy, dx
    L = hypot(tip[0] - ha[0], tip[1] - ha[1])
    bow = 0.10 * W['length'] * (1 if W.get('curve', 1) > 0 else -1)
    # curve towards the front
    sgn_ = 1 if dx >= 0 else -1
    cx, cy = (ha[0] + tip[0]) / 2 + nx * bow * -sgn_, (ha[1] + tip[1]) / 2 + ny * bow * -sgn_
    ctx.move_to(ha[0], ha[1])
    ctx.curve_to(cx, cy, cx + dx * 0.05, cy + dy * 0.05, tip[0], tip[1])


def draw_fighter(ctx, P, style, t, alpha=1.0, tint=None, aura_mul=1.0, rim_mul=1.0, glow=True):
    """Draw a fighter pose in world coordinates (ctx already transformed, line widths in metres)."""
    if P['alpha'] * alpha <= 0.01:
        return
    a = P['alpha'] * alpha
    fill = style['fill']
    rim = style['rim']
    far = style['far']
    if tint is not None:
        fill = mix(fill, tint, 0.65)
        far = mix(far, tint, 0.65)
        rim = mix(rim, tint, 0.65)
    rimw = 0.0115 * rim_mul
    sh = fighter_shapes(P)
    ctx.set_line_cap(1)
    ctx.set_line_join(1)
    # aura glow
    aura = P['aura'] * aura_mul
    if glow and aura > 0.02:
        ac = style['aura']
        allshapes = sh['far_arm'] + sh['far_leg'] + sh['torso'] + sh['head'] + sh['near_leg'] + sh['near_arm']
        for wid, al in ((0.34, 0.035), (0.22, 0.055), (0.13, 0.085), (0.07, 0.12)):
            for s in allshapes:
                capsule(ctx, *s)
            ctx.set_source_rgba(ac[0], ac[1], ac[2], min(1.0, al * aura * a))
            ctx.set_line_width(wid)
            ctx.stroke()
    # cloth (behind everything)
    cl = P['cloth']
    draw_cloth(ctx, cl[1], 0.040, 0.016, style['cloth2'], style['cloth_rim'], rimw * 0.8, a)
    draw_cloth(ctx, cl[0], 0.055, 0.020, style['cloth'], style['cloth_rim'], rimw * 0.9, a)
    fa = (fill[0], fill[1], fill[2], a)
    ra = (rim[0], rim[1], rim[2], a * 0.95)
    fb = (far[0], far[1], far[2], a)
    _draw_group(ctx, sh['far_arm'], fb, ra, rimw)
    _draw_group(ctx, sh['far_leg'], fb, ra, rimw)
    _draw_group(ctx, sh['torso'] + sh['head'], fa, ra, rimw)
    _draw_group(ctx, sh['near_leg'], fa, ra, rimw)
    # eye
    ex, ey = P['eye']
    fsn = P['fs']
    eg = P['eyeglow']
    ec = style['eye']
    if eg > 0.05:
        for wid, al in ((0.07, 0.10), (0.04, 0.22)):
            ctx.set_source_rgba(ec[0], ec[1], ec[2], al * eg * a)
            ctx.set_line_width(wid)
            ctx.move_to(ex - fsn * 0.03, ey)
            ctx.line_to(ex + fsn * 0.03, ey + 0.004)
            ctx.stroke()
    ctx.set_source_rgba(ec[0], ec[1], ec[2], a)
    ctx.set_line_width(0.016)
    ctx.move_to(ex - fsn * 0.035, ey - 0.004)
    ctx.line_to(ex + fsn * 0.040, ey + 0.010)
    ctx.stroke()
    if P['weapon']:
        draw_weapon(ctx, P['weapon'], style, t, a)
    _draw_group(ctx, sh['near_arm'], fa, ra, rimw)
