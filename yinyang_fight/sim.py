"""Sequential simulation pass: time remap, actor joints with foot locking, ribbons, camera."""
import math

import numpy as np

from .anim import smooth_noise
from .config import FPS, NFRAMES, THIGH, SHIN, W, H
from .rig import (fk_local, ground_offset, to_world, ik2, ribbon_anchor, NJ, HIP, HEAD, KNEE_F,
                  FOOT_F, KNEE_B, FOOT_B, JOINT, ANGLES)

NRIB = 9
RIB_SEG = 8.0
EXTRA = ('vis', 'eye', 'aura', 'ghost', 'blade', 'z', 'charge', 'chargeat', 'dark', 'glowbody',
         'g', 'rot', 'tint', 'idle')


class ActorSim:
    def __init__(self, a, F):
        self.id = a.id
        self.pal = a.pal
        self.J = np.zeros((F, NJ, 2))
        self.face = np.ones(F)
        self.ch = {k: np.zeros(F) for k in EXTRA}
        self.rib = np.zeros((F, NRIB, 2))


class Sim:
    def __init__(self, story, nframes=NFRAMES):
        self.story = story
        self.F = F = nframes
        S, spd = story.speed.build(F, FPS)
        self.S = S[:F]
        self.spd = spd[:F]
        self.vt = np.arange(F) / FPS
        self.actors = {}
        for k, a in story.actors.items():
            self.actors[k] = self._sim_actor(a)
        self.fx = {k: np.array([c.at(t) for t in self.S]) for k, c in story.fx.ch.items()}
        self._sim_camera()
        for e in story.effects:
            e.prepare(self)

    # ------------------------------------------------------------------
    def frame_of(self, t):
        return int(min(self.F - 1, max(0, np.searchsorted(self.S, t))))

    def joint(self, aid, name, t):
        a = self.actors[aid]
        return a.J[self.frame_of(t), JOINT[name]].copy()

    # ------------------------------------------------------------------
    def _sim_actor(self, a):
        F = self.F
        s = ActorSim(a, F)
        tr = a.tr
        lock = [dict(on=False, lp=None, w=0.0, prev=None) for _ in range(2)]
        legs = ((KNEE_F, FOOT_F), (KNEE_B, FOOT_B))
        rib = None
        for f in range(F):
            t = self.S[f]
            v = tr.sample(t)
            idle = v['idle']
            if idle > 0:
                ph = t * 2 * math.pi / 2.6
                b = math.sin(ph)
                v['lean'] += 1.6 * b * idle
                v['fa1'] += 3.0 * math.sin(ph + 0.6) * idle
                v['ba1'] += 2.5 * math.sin(ph + 1.1) * idle
                v['head'] += 1.5 * math.sin(ph + 0.3) * idle
                v['fl2'] -= 3.0 * (0.5 + 0.5 * b) * idle
                v['bl2'] -= 3.0 * (0.5 + 0.5 * b) * idle
            J = fk_local(v)
            face = 1.0 if v['face'] >= 0 else -1.0
            g = v['g']
            hy = v['y'] + g * ground_offset(J)
            Wj = to_world(J, v['x'], hy, face)
            # foot locking
            for li, (kn, ft) in enumerate(legs):
                L = lock[li]
                fk = Wj[ft].copy()
                cand = g > 0.5 and fk[1] < 3.0
                slow = L['prev'] is not None and np.hypot(*(fk - L['prev'])) < 4.0
                if L['on']:
                    if (not cand) or fk[1] > 6.0 or np.hypot(*(fk - L['lp'])) > 26.0 or g < 0.5:
                        L['on'] = False
                elif cand and slow:
                    L['on'] = True
                    L['lp'] = np.array([fk[0], max(0.0, fk[1])])
                    L['w'] = 1.0
                if not L['on']:
                    L['w'] = max(0.0, L['w'] - 0.25)
                if L['w'] > 0 and L['lp'] is not None:
                    knee, end = ik2(Wj[HIP], L['lp'], THIGH, SHIN, Wj[kn])
                    w = L['w']
                    w = w * w * (3 - 2 * w)
                    Wj[kn] = Wj[kn] + (knee - Wj[kn]) * w
                    Wj[ft] = Wj[ft] + (end - Wj[ft]) * w
                L['prev'] = fk
            s.J[f] = Wj
            s.face[f] = face
            for k in EXTRA:
                s.ch[k][f] = v[k]
            # ribbon verlet
            anc = ribbon_anchor(Wj, face)
            dt = self.spd[f] / FPS
            if rib is None or np.hypot(*(anc - rib[0][0])) > 90:
                pts = np.array([anc + np.array([-face * RIB_SEG * i, -2.0 * i]) for i in range(NRIB)])
                rib = [pts.copy(), pts.copy()]
            p, pp = rib
            p[0] = anc
            wind = self.story.fx.ch['wind'].at(t)
            vt = f / FPS
            for i in range(1, NRIB):
                vel = (p[i] - pp[i]) * (0.90 if dt > 0 else 1.0)
                gust = wind * (1.0 + 0.6 * smooth_noise(vt * 1.3 + i * 0.13, 5.0))
                acc = np.array([-700.0 * gust,
                                -420.0 + 160.0 * smooth_noise(vt * 2.1 + i * 0.4, 9.0)])
                pp[i] = p[i].copy()
                p[i] = p[i] + vel + acc * dt * dt
            for _ in range(4):
                for i in range(1, NRIB):
                    d = p[i] - p[i - 1]
                    n = math.hypot(d[0], d[1]) or 1e-6
                    p[i] = p[i - 1] + d * (RIB_SEG / n)
            s.rib[f] = p
        return s

    # ------------------------------------------------------------------
    def _sim_camera(self):
        F = self.F
        cam = self.story.cam
        self.cx = np.zeros(F)
        self.cy = np.zeros(F)
        self.zoom = np.ones(F)
        self.crot = np.zeros(F)
        self.trauma = np.zeros(F)
        shakes = {}
        for e in self.story.events:
            if e.kind == 'shake':
                f = self.frame_of(e.t)
                shakes[f] = shakes.get(f, 0.0) + e.kw.get('amt', 0.3)
        st = None
        vel = np.zeros(3)
        tr = 0.0
        dt = 1.0 / FPS
        ids = list(self.actors)
        for f in range(F):
            t = self.S[f]
            c = cam.sample(t)
            pts = []
            foc = c['focus']
            for aid in ids:
                a = self.actors[aid]
                if a.ch['vis'][f] < 0.3:
                    continue
                if foc < -0.5 and aid != ids[0]:
                    continue
                if foc > 0.5 and aid != ids[1]:
                    continue
                J = a.J[f]
                pts.extend([J[HIP], J[HEAD], J[FOOT_F], J[FOOT_B]])
            if not pts:
                target = st if st is not None else np.array([c['x'], c['y'], c['zoom']])
            else:
                P = np.array(pts)
                mn, mx = P.min(0), P.max(0)
                cx = (mn[0] + mx[0]) / 2
                cy = (mn[1] + mx[1]) / 2 + 10
                z = min(W / (mx[0] - mn[0] + 560), H / (mx[1] - mn[1] + 330))
                z = min(2.3, max(0.45, z)) * c['zmul']
                gcy = 0.29 * H / z
                cy = cy + (max(cy, gcy) - cy) * c['gframe'] + c['ybias']
                target = np.array([cx, cy, z])
            if st is None:
                st = target.copy()
            om = np.array([6.0, 6.0, 4.0])
            acc = om * om * (target - st) - 2 * om * vel
            vel = vel + acc * dt
            st = st + vel * dt
            w = c['w']
            out = st + (np.array([c['x'], c['y'], c['zoom']]) - st) * w
            rot = c['rot'] * w
            tr = tr * math.exp(-2.6 * dt) + shakes.get(f, 0.0)
            tr = min(tr, 1.2)
            t2 = min(1.0, tr) ** 2
            vt = f * dt
            out[0] += 30.0 * t2 * smooth_noise(vt * 23.0, 1.0) / out[2]
            out[1] += 30.0 * t2 * smooth_noise(vt * 21.0, 2.0) / out[2]
            rot += 0.03 * t2 * smooth_noise(vt * 17.0, 3.0)
            self.cx[f], self.cy[f], self.zoom[f] = out
            self.crot[f] = rot
            self.trauma[f] = tr
