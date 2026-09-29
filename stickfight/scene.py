"""Scene container: time warp, precompute of frames, effects bookkeeping."""
import bisect
import math
import random

from rig import Fighter, Track, clamp, sstep, lerp, hexc
from env import Env, PaletteTrack, Camera
import fx as FXM

FPS = 60


class Warp:
    """Maps world time <-> video time through slow-motion windows."""

    def __init__(self, windows, wmax=200.0, dw=0.001):
        self.windows = windows
        self.dw = dw
        self.T = [0.0]
        n = int(wmax / dw)
        t = 0.0
        for k in range(n):
            w = (k + 0.5) * dw
            t += dw / self.ts(w)
            self.T.append(t)

    def ts(self, w):
        s = 1.0
        for (a, b, sp, ri, ro) in self.windows:
            if a <= w < b:
                f = 1.0
                if ri > 0:
                    f = min(f, sstep(a, a + ri, w))
                if ro > 0:
                    f = min(f, 1 - sstep(b - ro, b, w))
                s *= 1 + (sp - 1) * f
        return max(s, 0.005)

    def video_time(self, w):
        x = w / self.dw
        i = int(x)
        if i >= len(self.T) - 1:
            return self.T[-1] + (w - (len(self.T) - 1) * self.dw)
        f = x - i
        return self.T[i] + (self.T[i + 1] - self.T[i]) * f

    def world_time(self, tv):
        T = self.T
        i = bisect.bisect_right(T, tv) - 1
        if i >= len(T) - 1:
            return (len(T) - 1) * self.dw + (tv - T[-1])
        f = (tv - T[i]) / (T[i + 1] - T[i])
        return (i + f) * self.dw


class Scene:
    def __init__(self, styles):
        self.styles = styles
        self.Y = Fighter('Y', -9.5, 1, styles['Y'])
        self.G = Fighter('G', 9.5, -1, styles['G'])
        self.Y.opp = self.G
        self.G.opp = self.Y
        self.env = Env()
        self.palette = PaletteTrack('dusk')
        self.envx = {k: Track(v) for k, v in dict(split=0.0, split_shift=0.0, cloud=1.0, moon=1.0, water_shake=0.0,
                                                  vignette=0.55, fade=1.0, bloom=0.5, hue=0.0).items()}
        self.cam = Camera()
        self.fx = []
        self.events = []       # dict(w, kind, amp, x)
        self.shakes = []       # (w, amp, decay, freq)
        self.slow = []         # warp windows
        self.frames = []
        self.aux = {}          # misc: cuts, etc.

    # ---- registration -----------------------------------------------------
    def add(self, e):
        self.fx.append(e)
        return e

    def event(self, w, kind, amp=1.0, x=0.0):
        self.events.append(dict(w=w, kind=kind, amp=amp, x=x))

    def shake(self, w, amp, decay=0.35, freq=28.0):
        self.shakes.append((w, amp, decay, freq))

    def slowmo(self, a, b, speed, ri=0.15, ro=0.25):
        self.slow.append((a, b, speed, ri, ro))

    def hitstop(self, w, dur=0.07, speed=0.03):
        """Freeze for ~dur seconds of *video* time."""
        self.slow.append((w, w + dur * speed, speed, 0.0, 0.0))

    # ---- build ------------------------------------------------------------
    def warp_hint(self, total_video_s):
        """World time that corresponds to the given video time (uses the current slow-mo windows)."""
        w = Warp(self.slow, wmax=220.0)
        return w.world_time(total_video_s)

    def build(self, total_video_s, progress=None):
        self.warp = Warp(self.slow, wmax=220.0)
        for (w, amp, dec, fr) in self.shakes:
            self.cam.add_shake(self.warp.video_time(w), amp, dec, fr)
        n = int(round(total_video_s * FPS))
        self.nframes = n
        Y, G = self.Y, self.G
        prev_w = None
        frames = []
        for i in range(n):
            tv = i / FPS
            w = self.warp.world_time(tv)
            dt = max(1e-4, w - prev_w) if prev_w is not None else 1 / FPS
            Y.update(w, dt)
            G.update(w, dt)
            cam = self.cam.step(w, tv, (Y, G), 1 / FPS)
            frames.append(dict(w=w, tv=tv, Y=Y.pose, G=G.pose, cam=cam))
            prev_w = w
            if progress and i % 600 == 0:
                progress(i, n)
        self.frames = frames
        self._auto_fx()
        self.ws = [f['w'] for f in frames]
        self._index_fx()

    def _auto_fx(self):
        """Footfall ripples, run spray."""
        for F, col in ((self.Y, (0.75, 0.82, 1.0)), (self.G, (0.9, 0.95, 1.0))):
            for (t, x, sp) in F.footfalls:
                if sp < 0.08 and random.random() < 0.6:
                    continue
                self.fx.append(FXM.Ring(t, x, 0.0, 0.05, 0.28 + 0.9 * sp, color=col, dur=0.55 + 0.4 * sp,
                                        width=0.05 + 0.05 * sp, flat=True, layer='back', alpha=0.55 + 0.3 * sp))
                if sp > 0.25:
                    self.fx.append(FXM.Particles(t, x, 0.05, n=int(6 + 14 * sp), speed=(0.8, 2.6 + 3 * sp), angle=pi_2(),
                                                 spread=1.6, life=(0.25, 0.55), size=(0.012, 0.03), gravity=9.0,
                                                 drag=0.3, color=(0.9, 0.96, 1.0), shape='drop', seed=int(t * 100)))

    def _index_fx(self):
        n = self.nframes
        self.active = [[] for _ in range(n)]
        ws = self.ws
        for idx, e in enumerate(self.fx):
            i0 = bisect.bisect_left(ws, e.t0 - 1e-9)
            i1 = bisect.bisect_right(ws, e.t1 + 1e-9)
            for i in range(max(0, i0 - 1), min(n, i1 + 1)):
                self.active[i].append(idx)


def pi_2():
    return math.pi / 2
