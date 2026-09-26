"""High-level fight choreography helpers built on Story/Actor keyframes."""
import math

import numpy as np

from . import effects as fxm
from .rig import POSES, P
from .story import Actor, Story

WHITE = (1.0, 1.0, 1.0)
SPARK_HOT = (1.0, 0.95, 0.8)


class Fight:
    def __init__(self, story: Story, yin: Actor, yang: Actor):
        self.s = story
        self.yin = yin
        self.yang = yang
        self.seed = 1

    def _seed(self):
        self.seed += 1
        return self.seed

    def other(self, a):
        return self.yang if a is self.yin else self.yin

    # --- audio / camera cues ------------------------------------------------
    def sfx(self, t, kind, x=0.0, amp=1.0, **kw):
        self.s.ev(t, 'sfx', snd=kind, x=x, amp=amp, **kw)

    def shake(self, t, amt):
        self.s.ev(t, 'shake', amt=amt)

    # --- basic motion -------------------------------------------------------
    def pose(self, a, t, pose, ease='io', **kw):
        a.key(t, pose, ease, **kw)

    def face_each_other(self, t):
        yx, gx = self.yin.v(t, 'x'), self.yang.v(t, 'x')
        self.yin.key(t, face=1.0 if gx >= yx else -1.0)
        self.yang.key(t, face=1.0 if yx >= gx else -1.0)

    def jump(self, a, t0, t1, x1, h, air='tuck', land='crouch', recover='stance', rot=None,
             spin=0.0, dust=True, sound=True, y0=0.0, y1=0.0):
        tm = (t0 + t1) / 2
        x0 = a.v(t0, 'x')
        a.key(t0, 'crouch', 'io', x=x0, y=y0)
        a.key(t0 + 0.06, None, x=(x0, 'lin'))
        a.key(tm, air, 'out', y=(y0 + h, 'out2'), x=((x0 + x1) / 2, 'lin'))
        a.key(t1, None, y=(y1, 'in2'), x=(x1, 'lin'))
        if spin:
            r0 = a.v(t0, 'rot')
            a.key(t0 + 0.05, None, rot=(r0, 'lin'))
            a.key(t1 - 0.04, None, rot=(r0 + spin, 'io2'))
            a.key(t1 - 0.0395, None, rot=(r0, 'hold'))
        a.key(t1, land, 'out')
        if recover:
            a.key(t1 + 0.3, recover, 'io')
        if sound:
            self.sfx(t0 + 0.04, 'jump', x=x0, amp=0.6)
            self.sfx(t1, 'land', x=x1, amp=0.8)
        if dust:
            self.s.fxadd(fxm.Dust(t0 + 0.04, (x0, 0), n=8, spread=60, life=0.8, size=22, alpha=0.35))
            self.s.fxadd(fxm.Dust(t1, (x1, 0), n=12, spread=90, life=1.1, size=26, alpha=0.4))

    def teleport(self, a, t, x, y=None, dur=0.07, flash=True, sound=True):
        """Vanish at t, reappear at (x, y) at t+dur with afterimage streak."""
        x0, y0 = a.v(t, 'x'), a.v(t, 'y')
        a.key(t - 0.001, vis=(1.0, 'hold'), ghost=(0.0, 'lin'))
        a.key(t, x=(x0, 'lin'), y=(y0, 'lin'), ghost=(1.0, 'lin'))
        a.key(t + dur, x=(x, 'io2'), y=(y if y is not None else y0, 'io2'))
        a.key(t + dur + 0.2, ghost=(0.0, 'lin'))
        col = a.pal['energy']
        if flash:
            self.s.fxadd(fxm.Flash(t, (a.id, 'chest'), col, size=90, life=0.2))
            self.s.fxadd(fxm.Flash(t + dur, lambda sim, tt, a=a, t2=t + dur: sim.joint(a.id, 'chest', t2),
                                   col, size=110, life=0.25))
            self.s.fxadd(fxm.Ring(t + dur, (a.id, 'chest'), col, r0=10, r1=140, life=0.3, width=6))
        if sound:
            self.sfx(t, 'teleport', x=x0, amp=0.8)

    def cam_track(self, t0, t1, who=('yin', 'yang'), zoom=None, dy=30.0, blend=0.25, step=0.05,
                  fixed=None, engage=True, release=True):
        """Author an exact tracking camera between t0 and t1 (blends in/out over `blend`)."""
        cam = self.s.cam
        a0 = t0 - blend if engage else t0
        a1 = t1 + blend if release else t1
        if engage:
            cam.key(t0 - blend, w=(0.0, 'lin'))
        cam.key(t0, w=(1.0, 'io'))
        cam.key(t1, w=(1.0, 'lin'))
        if release:
            cam.key(t1 + blend, w=(0.0, 'io'))
        n = max(2, int((a1 - a0) / step) + 1)
        for i in range(n):
            t = a0 + (a1 - a0) * i / (n - 1)
            if fixed is not None:
                x, y = fixed(t)
            else:
                pts = [self.s.actors[a].joint(t, 'chest') for a in who]
                x = sum(p[0] for p in pts) / len(pts)
                y = sum(p[1] for p in pts) / len(pts) + dy
            kw = dict(x=(x, 'cr'), y=(y, 'cr'))
            if zoom is not None:
                kw['zoom'] = (zoom(t) if callable(zoom) else zoom, 'cr')
            cam.key(t, **kw)

    # --- impacts ----------------------------------------------------------------
    def impact(self, t, at, att, kind='hit', power=1.0, ang=None, hitstop=None, ring=True):
        """kind: 'hit' | 'block' | 'clash'. power scales everything."""
        col = att.pal['energy']
        other = self.other(att)
        if kind == 'clash':
            col2 = other.pal['energy']
        else:
            col2 = col
        seed = self._seed()
        spread = 360 if (kind == 'clash' or ang is None) else 130
        self.s.fxadd(fxm.Sparks(t, at, col, n=int(14 + 18 * power), speed=700 + 500 * power,
                                spread=spread, ang=ang or 0.0, life=0.3 + 0.2 * power, seed=seed))
        if kind == 'clash':
            self.s.fxadd(fxm.Sparks(t, at, col2, n=int(14 + 18 * power), speed=700 + 500 * power,
                                    spread=360, life=0.3 + 0.2 * power, seed=seed + 7))
        self.s.fxadd(fxm.Flash(t, at, col if kind != 'block' else SPARK_HOT, size=60 + 70 * power,
                               life=0.16 + 0.1 * power, seed=seed))
        if ring and power >= 0.8:
            self.s.fxadd(fxm.Ring(t, at, WHITE if kind != 'hit' else col, r0=8, r1=40 + 130 * power,
                                  life=0.22 + 0.15 * power, width=2 + 3 * power, alpha=0.55))
        hs = hitstop if hitstop is not None else (int(2 + 4 * power) if power >= 0.5 else 0)
        if hs:
            self.s.speed.hitstop(t, frames=hs)
        self.shake(t, 0.12 + 0.35 * power)
        snd = {'hit': 'hit', 'block': 'block', 'clash': 'clash'}[kind]
        self.sfx(t, snd, x=0, amp=0.5 + 0.5 * power, power=power)

    # --- strikes ------------------------------------------------------------
    def strike(self, t, att, dfn, apose, joint, dpose, target, windup='windup', wind_t=0.13,
               recover='stance', rec_t=0.22, kind='hit', knock=0.0, knock_t=0.3, power=0.6,
               pen=6.0, air=False, dfn_react_t=0.07, dfn_recover=None, dfn_rec_t=0.45,
               dy=0.0, ease='in2', whoosh=True, place=True, fx=True, hitstop=None, after=None):
        """Keyframe an attack whose `joint` lands on the defender's `target` joint at time t."""
        face = 1.0 if dfn.v(t, 'x') >= att.v(t - wind_t, 'x') else -1.0
        dface = -face
        # defender
        if kind == 'hit':
            dfn.key(t, None, x=(dfn.v(t, 'x'), 'lin'))
            dfn.hold(t - 0.001, t, chans=list(POSES['stand'].keys()))
            dfn.key(t + dfn_react_t, dpose, 'snap', face=dface)
        else:
            dfn.key(t - 0.02, dpose, 'out', face=dface)
        dx_ = dfn.v(t, 'x')
        dy_ = dfn.v(t, 'y')
        dg = dfn.v(t, 'g')
        tgt_local = dfn.local_joint(dpose if kind != 'hit' else self._pose_at(dfn, t), target,
                                    rot=dfn.v(t, 'rot'), g=dg)
        tgt = np.array([dx_ + dface * tgt_local[0], dy_ + tgt_local[1]]) + np.array([0, dy])
        # attacker
        if windup:
            att.key(t - wind_t, windup, 'io', face=face)
        ag = att.v(t, 'g')
        loc = att.local_joint(apose, joint, rot=att.v(t, 'rot'), g=ag)
        ax = tgt[0] - face * (loc[0] - pen)
        if place:
            if air:
                ay = tgt[1] - loc[1]
                att.key(t, apose, ease, x=(ax, 'out'), y=(ay, 'out'), face=face)
            else:
                att.key(t, apose, ease, x=(ax, 'out'), face=face)
        else:
            att.key(t, apose, ease, face=face)
        att.hold(t, t + 0.05, chans=list(POSES['stand'].keys()))
        if recover:
            att.key(t + rec_t, recover, 'io')
        if kind == 'hit' and knock:
            dfn.key(t + knock_t, None, x=(dx_ + face * knock, 'out'))
        if dfn_recover:
            dfn.key(t + dfn_rec_t, dfn_recover, 'io')
        if whoosh:
            self.sfx(t - wind_t * 0.6, 'whoosh', x=ax, amp=0.35 + 0.4 * power)
        if fx:
            self.impact(t, (att.id, joint), att, kind=kind, power=power, hitstop=hitstop,
                        ang=15.0 if face > 0 else 165.0)
        return tgt

    def _pose_at(self, a, t):
        return {k: a.v(t, k) for k in POSES['stand']}
