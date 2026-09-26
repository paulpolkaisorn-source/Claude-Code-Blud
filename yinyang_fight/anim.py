"""Keyframe channels, easing curves and the story-time speed curve."""
import bisect
import math

import numpy as np


def _back(u, s=1.70158):
    u -= 1.0
    return 1.0 + (s + 1.0) * u ** 3 + s * u ** 2


EASES = {
    'lin': lambda u: u,
    'io': lambda u: u * u * u * (u * (u * 6 - 15) + 10),          # smootherstep
    'io2': lambda u: u * u * (3 - 2 * u),                         # smoothstep
    'in': lambda u: u * u * u,
    'in2': lambda u: u * u,
    'out': lambda u: 1 - (1 - u) ** 3,
    'out2': lambda u: 1 - (1 - u) ** 2,
    'snap': lambda u: 1 - (1 - u) ** 5,                           # very fast attack
    'back': _back,
    'back2': lambda u: _back(u, 3.0),
    'hold': lambda u: 1.0 if u >= 1.0 else 0.0,
    'expo_in': lambda u: 0.0 if u <= 0 else 2 ** (10 * (u - 1)) * (1 - u) + u * u * u * u * u,
}


def ease(name, u):
    return EASES[name](min(1.0, max(0.0, u)))


class Channel:
    __slots__ = ('ts', 'vs', 'es', 'default')

    def __init__(self, default=0.0):
        self.ts, self.vs, self.es = [], [], []
        self.default = default

    def add(self, t, v, e):
        i = bisect.bisect_right(self.ts, t)
        self.ts.insert(i, t)
        self.vs.insert(i, float(v))
        self.es.insert(i, e)

    def last_before(self, t):
        """Value of the channel just before time t (used by authoring helpers)."""
        return self.at(t - 1e-6)

    def at(self, t):
        ts = self.ts
        if not ts:
            return self.default
        i = bisect.bisect_right(ts, t) - 1
        if i < 0:
            return self.vs[0]
        if i >= len(ts) - 1:
            return self.vs[-1]
        t0, t1 = ts[i], ts[i + 1]
        v0, v1 = self.vs[i], self.vs[i + 1]
        if t1 <= t0:
            return v1
        u = (t - t0) / (t1 - t0)
        e = self.es[i + 1]
        if e == 'cr':
            p0 = self.vs[i - 1] if i > 0 else v0
            p3 = self.vs[i + 2] if i + 2 < len(ts) else v1
            u2, u3 = u * u, u * u * u
            return 0.5 * (2 * v0 + (-p0 + v1) * u
                          + (2 * p0 - 5 * v0 + 4 * v1 - p3) * u2
                          + (-p0 + 3 * v0 - 3 * v1 + p3) * u3)
        return v0 + (v1 - v0) * ease(e, u)


class Track:
    """A bag of sparse, independently keyed channels."""

    def __init__(self, defaults):
        self.ch = {k: Channel(v) for k, v in defaults.items()}

    def key(self, t, ease='io', **vals):
        for k, v in vals.items():
            if v is None:
                continue
            e = ease
            if isinstance(v, tuple):
                v, e = v
            if k not in self.ch:
                self.ch[k] = Channel(0.0)
            self.ch[k].add(t, v, e)
        return self

    def at(self, t, name):
        return self.ch[name].at(t)

    def sample(self, t):
        return {k: c.at(t) for k, c in self.ch.items()}


class SpeedCurve:
    """Maps video frames to story time. speed(story_t) scales how fast story time runs."""

    def __init__(self):
        self.segs = []  # (t0, t1, speed, ramp)

    def slow(self, t0, t1, speed, ramp=0.0):
        self.segs.append((t0, t1, speed, ramp))

    def hitstop(self, t, frames=5, speed=0.07):
        # story duration so that the stop lasts `frames` video frames
        self.segs.append((t, t + frames / 60.0 * speed, speed, 0.0))

    def speed(self, t):
        s = 1.0
        for t0, t1, sp, r in self.segs:
            if t0 - r <= t <= t1 + r:
                if t < t0:
                    w = (t - (t0 - r)) / r
                elif t > t1:
                    w = 1.0 - (t - t1) / r
                else:
                    w = 1.0
                w = w * w * (3 - 2 * w)
                s = min(s, 1.0 + (sp - 1.0) * w)
        return s

    def build(self, nframes, fps):
        S = np.zeros(nframes + 1)
        spd = np.zeros(nframes + 1)
        t = 0.0
        for f in range(nframes + 1):
            S[f] = t
            sp = self.speed(t)
            spd[f] = sp
            # midpoint integration for smooth ramps
            sp2 = self.speed(t + sp / (2 * fps))
            t += sp2 / fps
        return S, spd


def smooth_noise(t, seed=0.0, octaves=3):
    """Cheap deterministic 1D noise in [-1, 1] from incommensurate sines."""
    v = 0.0
    a = 1.0
    tot = 0.0
    f = 1.0
    for o in range(octaves):
        v += a * math.sin(t * f * 1.713 + seed * 12.9898 + o * 4.1) * math.sin(t * f * 0.917 + seed * 7.233 + o * 1.7)
        tot += a
        a *= 0.5
        f *= 2.13
    return v / tot
