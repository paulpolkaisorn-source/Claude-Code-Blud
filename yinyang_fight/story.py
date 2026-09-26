"""Authoring layer: actors, camera/fx tracks, events. Choreography scripts build a Story."""
import math

import numpy as np

from .anim import Track, SpeedCurve
from .rig import ANGLES, POSES, P, fk_local, ground_offset, JOINT, to_world

ACTOR_DEFAULTS = dict(x=0.0, y=0.0, rot=0.0, face=1.0, g=1.0, vis=1.0, eye=1.0, aura=0.0,
                      ghost=0.0, blade=0.0, z=0.0, charge=0.0, chargeat=0.0, idle=0.0,
                      dark=0.0, glowbody=0.0, tint=0.0)

POS_CH = ('x', 'y', 'rot')


class Actor:
    def __init__(self, key, pal, x=0.0, face=1.0, pose='stand'):
        self.id = key
        self.pal = pal
        d = dict(ACTOR_DEFAULTS)
        d.update(POSES[pose])
        d['x'] = x
        d['face'] = face
        self.tr = Track(d)

    def key(self, t, pose=None, ease='io', pe=None, **vals):
        """Key a pose and/or channels at story time t.
        pose: name or dict; ease applies to angles/other channels; pe overrides x/y/rot ease.
        A channel value may be a (value, ease) tuple for a per-channel ease."""
        if pose is not None:
            p = POSES[pose] if isinstance(pose, str) else pose
            for k in ANGLES:
                self.tr.key(t, ease, **{k: p[k]})
        for k, v in vals.items():
            if v is None:
                continue
            e = ease
            if isinstance(v, tuple):
                v, e = v
            elif k in POS_CH and pe is not None:
                e = pe
            if k == 'face':
                e = 'hold'
            self.tr.key(t, e, **{k: v})
        return self

    def hold(self, t0, t1, chans=None):
        """Freeze all (or given) channels from t0 until t1."""
        names = chans or list(self.tr.ch)
        for k in names:
            self.tr.key(t1, 'lin' if k != 'face' else 'hold', **{k: self.tr.ch[k].at(t0)})
        return self

    def v(self, t, k):
        return self.tr.ch[k].at(t)

    def vals(self, t):
        return self.tr.sample(t)

    def world(self, t):
        """World joints at story time t (no foot-lock; used for authoring)."""
        v = self.vals(t)
        J = fk_local(v)
        hy = v['y'] + v['g'] * ground_offset(J)
        return to_world(J, v['x'], hy, 1.0 if v['face'] >= 0 else -1.0)

    def joint(self, t, name):
        return self.world(t)[JOINT[name]]

    # --- placement helpers -------------------------------------------------
    def local_joint(self, pose, name, rot=0.0, g=1.0, y=0.0):
        p = dict(POSES[pose] if isinstance(pose, str) else pose)
        p['rot'] = rot
        J = fk_local(p)
        off = g * ground_offset(J) + y
        return J[JOINT[name]] + np.array([0.0, off])


class Event:
    """A timed event (audio + optional effect). `at` may be (actor, joint[, dx, dy]) or (x, y)."""

    def __init__(self, t, kind, **kw):
        self.t = t
        self.kind = kind
        self.kw = kw


class Story:
    def __init__(self):
        self.actors = {}
        self.cam = Track(dict(w=0.0, x=0.0, y=0.0, zoom=1.0, rot=0.0, zmul=1.0, gframe=1.0,
                              focus=0.0, lead=0.0, ybias=0.0))
        self.fx = Track(dict(scene=0.0, storm=0.0, letterbox=0.0, invert=0.0, white=0.0,
                             black=0.0, chroma=0.0, speed=0.0, speedang=0.0, split=0.0, splitx=0.0,
                             yy=0.0, yyr=160.0, yyrot=0.0, yysep=0.0, yyx=0.0, yyy=0.0,
                             title=0.0, title2=0.0, wind=0.3, skyflash=0.0, crack=0.0,
                             swirl=0.0, halves=0.0, vign=0.55, desat=0.0))
        self.speed = SpeedCurve()
        self.events = []
        self.effects = []

    def add(self, a):
        self.actors[a.id] = a
        return a

    def ev(self, t, kind, **kw):
        self.events.append(Event(t, kind, **kw))

    def fxadd(self, eff):
        self.effects.append(eff)
        return eff
