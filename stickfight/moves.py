"""Choreography helpers: reusable moves that write keys into fighter tracks + spawn effects."""
import math
import random
from math import sin, cos, pi

from rig import sgn, clamp, lerp, STAND_H
import fx as FXM
from fx import YIN_C, YIN_L, YANG_C, YANG_L, WHITE

# ----------------------------------------------------------------------------
GUARDS = {
    'guard': ((0.40, 0.52), (0.28, 0.44)),
    'high': ((0.34, 0.68), (0.20, 0.58)),
    'low': ((0.36, 0.30), (0.14, 0.26)),
    'open': ((0.30, 0.40), (-0.20, 0.42)),
    'relax': ((0.07, -0.04), (-0.05, -0.05)),
    'crane': ((0.38, 0.86), (0.05, 0.30)),
    'blade': ((0.34, 0.44), (0.25, 0.40)),
}


def begin(F, t, feet=True):
    """Pin every track at t so a new movement starts from the current state."""
    for tr in (F.X, F.H, F.LEAN, F.BEND, F.HEADT, F.STANCE):
        tr.cut(t)
    for k in (0, 1):
        F.hand[k].cut(t)
        if feet and F.foot[k].k:
            F.foot[k].cut(t)
            if F.foot[k].k[-1][4] > 0.01:
                F.foot[k].add(t + 0.14, 'body', 0, 0, 0.0, 'smooth')
    return F


def foot_free(F, k, t, dur=0.12):
    """Blend a foot override out (procedural footwork takes over)."""
    if not F.foot[k].k:
        return
    F.foot[k].pin(t)
    F.foot[k].add(t + dur, 'body', 0, 0, 0.0, 'smooth')


def foot_key(F, k, t, frame, x, y, w=1.0, ease='smooth'):
    if F.foot[k].k and F.foot[k].k[-1][0] >= t:
        F.foot[k].trim(t)
    if not F.foot[k].k:
        F.foot[k].add(t - 0.001, 'gnd', 0, 0, 0.0, 'lin')
    F.foot[k].add(t, frame, x, y, w, ease)


def hand_key(F, k, t, frame, x, y, ease='smooth'):
    F.hand[k].add(t, frame, x, y, 1.0, ease)


def set_guard(F, t, dur=0.25, style='guard', lean=0.10, h=None, ease='smooth'):
    g = GUARDS[style]
    hand_key(F, 0, t + dur, 'body', g[0][0], g[0][1], ease)
    hand_key(F, 1, t + dur, 'body', g[1][0], g[1][1], ease)
    F.LEAN.add(t + dur, lean, ease)
    if h is not None:
        F.H.add(t + dur, h, ease)
    F.BEND.add(t + dur, 0.0, ease)
    F.HEADT.add(t + dur, 0.0, ease)


def face(F, t, d, dur=0.10):
    F.FACE.pin(t)
    F.FACE.add(t + dur, d, 'smooth')


def stance_hold(F, t, style='guard', lean=0.10, h=STAND_H - 0.04):
    """Instant (well, 0.05s) pose set for start-of-scene."""
    g = GUARDS[style]
    hand_key(F, 0, t, 'body', g[0][0], g[0][1], 'smooth')
    hand_key(F, 1, t, 'body', g[1][0], g[1][1], 'smooth')
    F.LEAN.add(t, lean)
    F.H.add(t, h)


# ----------------------------------------------------------------------------
class Ch:
    """Choreography context."""

    def __init__(self, sc):
        self.sc = sc
        self.Y, self.G = sc.Y, sc.G

    def other(self, F):
        return F.opp

    def col(self, F):
        return (YIN_C, YIN_L) if F is self.Y else (YANG_C, YANG_L)

    # ---- impacts -------------------------------------------------------------
    def impact(self, w, x, y, who=None, power=1.0, kind='hit', shake=None, stop=None, flash=None, sound=None,
               angle=None, flat_ring=True):
        sc = self.sc
        if who is None:
            c1, c2 = (0.85, 0.75, 1.0), (1.0, 0.92, 0.6)
            cm = (1, 1, 1)
        elif who is self.Y:
            c1, c2, cm = (0.62, 0.45, 1.0), (0.85, 0.78, 1.0), (0.85, 0.8, 1.0)
        else:
            c1, c2, cm = (1.0, 0.82, 0.35), (1.0, 0.95, 0.75), (1, 0.95, 0.8)
        p = power
        sc.add(FXM.Flash(w, x, y, 0.40 + 0.55 * p, c1, dur=0.14 + 0.08 * p))
        sc.add(FXM.Burst(w, x, y, n=int(9 + 8 * p), length=0.55 + 0.9 * p, color=c2, dur=0.20 + 0.10 * p,
                         width=0.035 + 0.03 * p, seed=int(w * 91) % 1000, angle=angle,
                         spread=(2 * pi if angle is None else 2.2)))
        if p >= 0.9:
            sc.add(FXM.Ring(w, x, y, 0.08, 0.4 + 0.7 * p, cm, dur=0.30 + 0.12 * p, width=0.05 + 0.03 * p))
        sc.add(FXM.Particles(w, x, y, n=int(10 + 14 * p), speed=(2.0, 5.0 + 4 * p), angle=angle, spread=(2 * pi if angle is None else 2.6),
                             life=(0.20, 0.55), size=(0.014, 0.028), gravity=8, drag=1.6, color=c2, shape='spark',
                             seed=int(w * 53) % 1000))
        if y < 1.6 and power >= 0.9:
            sc.add(FXM.Ring(w, x, 0.0, 0.1, 0.8 + 1.3 * p, cm, dur=0.55 + 0.2 * p, width=0.05, flat=True, layer='back',
                            alpha=0.9))
        sh = (4 + 12 * p) if shake is None else shake
        if sh > 0:
            sc.shake(w, sh, decay=0.18 + 0.12 * p)
        st = (0.03 + 0.05 * p) if stop is None else stop
        if st > 0 and p >= 0.55:
            sc.hitstop(w, st)
        if flash is None:
            flash = 0.15 * p if p > 0.9 else 0
        if flash > 0:
            sc.add(FXM.ScreenFlash(w, 0.10 + 0.05 * p, (1, 1, 1), peak=flash, attack=0.01))
        sc.event(w, sound or kind, power, x)

    # ---- attacks -------------------------------------------------------------
    def punch(self, att, dfn, t, hand=0, gap=0.86, aim=0.05, power=1.0, wind=0.14, follow=0.22, recover=0.38,
              lunge_from=None, hook=False, lean=0.30, fx=True, snd='punch', hold=0.09, back=0.06, contact=None):
        """Straight (or hook) punch landing at time t."""
        f = sgn(att.FACE(t))
        h, o = att.hand[hand], att.hand[1 - hand]
        begin(att, t - wind - 0.02)
        x_start = att.X(t - wind - 0.02)
        att.X.add(t - wind, x_start - f * back, 'smooth')
        xhit = dfn.X(t) - f * gap
        att.X.add(t, xhit, 'in')
        att.X.add(t + hold + 0.12, xhit + f * follow, 'out')
        att.X.add(t + recover + 0.25, xhit + f * follow * 0.5, 'smooth')
        att.LEAN.add(t - wind, 0.0, 'smooth')
        att.LEAN.add(t, lean, 'in')
        att.LEAN.add(t + recover + 0.20, 0.10, 'smooth')
        att.H.add(t - wind, STAND_H - 0.07, 'smooth')
        att.H.add(t, STAND_H - 0.05, 'smooth')
        att.H.add(t + recover, STAND_H - 0.04, 'smooth')
        # arms
        if hook:
            hand_key(att, hand, t - wind, 'body', -0.05, 0.62, 'smooth')
            hand_key(att, hand, t - wind * 0.45, 'body', 0.12, 0.90, 'smooth')
        else:
            hand_key(att, hand, t - wind, 'body', 0.14, 0.44, 'smooth')
        if contact is None:
            h.add(t, 'oppc', -0.11, aim, 1.0, 'in')
            h.add(t + hold, 'oppc', -0.06, aim, 1.0, 'lin')
        else:
            h.add(t, 'world', contact[0], contact[1], 1.0, 'in')
            h.add(t + hold, 'world', contact[0] - f * 0.04, contact[1], 1.0, 'lin')
        hand_key(att, hand, t + recover, 'body', *GUARDS['guard'][hand], 'smooth')
        gd = GUARDS['guard'][1 - hand]
        o.add(t - wind, 'body', 0.30, 0.56, 1.0, 'smooth')
        o.add(t + recover, 'body', gd[0], gd[1], 1.0, 'smooth')
        if fx:
            xh, yh = dfn.hip(t)
            self.impact(t, xh - f * 0.14, yh + 0.40 + aim, att, power, sound=snd)

    def kick(self, att, dfn, t, foot=1, gap=0.82, aim=0.10, power=1.0, wind=0.22, recover=0.45, high=False,
             chamber=(0.26, 0.10), lean=-0.30, fx=True, hold=0.10, snd='kick', spin=False):
        f = sgn(att.FACE(t))
        k = foot
        begin(att, t - wind - 0.06)
        x_start = att.X(t - wind - 0.06)
        xhit = dfn.X(t) - f * gap
        att.X.add(t - wind, x_start + (xhit - x_start) * 0.35 - f * 0.04, 'smooth')
        att.X.add(t, xhit, 'smooth')
        att.X.add(t + recover, xhit, 'lin')
        att.LEAN.add(t - wind, 0.05, 'smooth')
        att.LEAN.add(t, lean, 'in')
        att.LEAN.add(t + recover + 0.15, 0.10, 'smooth')
        att.H.add(t - wind, STAND_H - 0.06, 'smooth')
        att.H.add(t, STAND_H - 0.10, 'smooth')
        att.H.add(t + recover + 0.1, STAND_H - 0.04, 'smooth')
        # balance arms
        hand_key(att, 0, t - wind, 'body', 0.20, 0.55, 'smooth')
        hand_key(att, 1, t - wind, 'body', -0.15, 0.45, 'smooth')
        hand_key(att, 0, t, 'body', 0.42, 0.72 if high else 0.60, 'smooth')
        hand_key(att, 1, t, 'body', -0.45, 0.50, 'smooth')
        g = GUARDS['guard']
        hand_key(att, 0, t + recover + 0.1, 'body', *g[0], 'smooth')
        hand_key(att, 1, t + recover + 0.1, 'body', *g[1], 'smooth')
        # kicking leg
        foot_key(att, k, t - wind - 0.04, 'gnd', (0.27 if k == 0 else -0.27), 0.05, 1.0, 'lin')
        foot_key(att, k, t - wind * 0.45, 'body', chamber[0], chamber[1] - 0.35 if not spin else -0.1, 1.0, 'smooth')
        foot_key(att, k, t, 'oppc', -0.10, aim + (0.30 if high else 0.0), 1.0, 'in')
        foot_key(att, k, t + hold, 'oppc', -0.04, aim + (0.30 if high else 0.0), 1.0, 'lin')
        foot_key(att, k, t + recover * 0.6, 'body', chamber[0], chamber[1] - 0.35, 1.0, 'smooth')
        foot_key(att, k, t + recover, 'gnd', (0.27 if k == 0 else -0.27), 0.05, 1.0, 'smooth')
        foot_free(att, k, t + recover + 0.02, 0.1)
        if fx:
            xh, yh = dfn.hip(t)
            self.impact(t, xh - f * 0.14, yh + 0.40 + aim + (0.3 if high else 0), att, power, sound=snd)

    # ---- reactions -----------------------------------------------------------
    def recoil(self, dfn, att, t, power=1.0, dist=None, aim_high=False, dur=0.30, recover=0.5):
        f = sgn(att.FACE(t))
        d = (0.30 + 0.55 * power) if dist is None else dist
        begin(dfn, t - 0.04)
        x0 = dfn.X(t)
        dfn.X.add(t, x0, 'lin')
        dfn.X.add(t + dur, x0 + f * d, 'out')
        dfn.X.add(t + dur + 0.25, x0 + f * d * 1.05, 'smooth')
        lb = -(0.20 + 0.30 * power)
        dfn.LEAN.add(t + 0.06, lb, 'out')
        dfn.LEAN.add(t + recover + 0.25, 0.10, 'smooth')
        dfn.BEND.add(t + 0.06, -0.35 * power, 'out')
        dfn.BEND.add(t + recover, 0.0, 'smooth')
        dfn.HEADT.add(t + 0.05, -0.55 * power - (0.2 if aim_high else 0), 'out')
        dfn.HEADT.add(t + recover, 0.0, 'smooth')
        dfn.H.add(t + 0.06, STAND_H - 0.07 * power, 'out')
        dfn.H.add(t + recover, STAND_H - 0.04, 'smooth')
        hand_key(dfn, 0, t + 0.07, 'body', 0.05, 0.62, 'out')
        hand_key(dfn, 1, t + 0.07, 'body', -0.32, 0.40, 'out')
        g = GUARDS['guard']
        hand_key(dfn, 0, t + recover + 0.2, 'body', *g[0], 'smooth')
        hand_key(dfn, 1, t + recover + 0.2, 'body', *g[1], 'smooth')

    def block(self, dfn, att, t, power=1.0, style='cross', recover=0.42, push=None, sink=0.0):
        f = sgn(att.FACE(t))
        d = (0.12 + 0.22 * power) if push is None else push
        begin(dfn, t - 0.14)
        x0 = dfn.X(t)
        dfn.X.add(t, x0, 'lin')
        dfn.X.add(t + 0.22, x0 + f * d, 'out')
        dfn.LEAN.add(t - 0.05, 0.16, 'smooth')
        dfn.LEAN.add(t + 0.06, 0.02, 'out')
        dfn.LEAN.add(t + recover + 0.15, 0.10, 'smooth')
        dfn.H.add(t - 0.05, STAND_H - 0.08, 'smooth')
        dfn.H.add(t + 0.1, STAND_H - 0.12 * power - 0.02 - sink, 'out')
        dfn.H.add(t + recover + 0.15, STAND_H - 0.04, 'smooth')
        if style == 'cross':
            hand_key(dfn, 0, t - 0.06, 'body', 0.34, 0.70, 'smooth')
            hand_key(dfn, 1, t - 0.06, 'body', 0.30, 0.56, 'smooth')
        else:   # low block
            hand_key(dfn, 0, t - 0.06, 'body', 0.36, 0.28, 'smooth')
            hand_key(dfn, 1, t - 0.06, 'body', 0.30, 0.16, 'smooth')
        g = GUARDS['guard']
        hand_key(dfn, 0, t + recover, 'body', *g[0], 'smooth')
        hand_key(dfn, 1, t + recover, 'body', *g[1], 'smooth')

    def parry(self, dfn, att, t, hand=0, out=True, recover=0.34):
        """Quick deflection with one hand (attack is *not* landing)."""
        begin(dfn, t - 0.14)
        hd = dfn.hand[hand]
        xh, yh = att.hip(t)
        f = sgn(dfn.FACE(t))
        hand_key(dfn, hand, t - 0.08, 'body', 0.26, 0.55, 'smooth')
        hd.add(t, 'oppc', 0.40 * -f * -1 * 0 + (-0.30), 0.10, 1.0, 'out')
        hand_key(dfn, hand, t + recover, 'body', *GUARDS['guard'][hand], 'smooth')

    def duck(self, F, t, depth=0.50, dur=0.20, hold=0.25, back=0.0):
        begin(F, t - 0.02)
        f = sgn(F.FACE(t))
        F.H.add(t + dur, depth, 'out')
        F.H.add(t + dur + hold, depth, 'lin')
        F.H.add(t + dur + hold + 0.25, STAND_H - 0.04, 'smooth')
        F.LEAN.add(t + dur, 0.55, 'out')
        F.LEAN.add(t + dur + hold + 0.25, 0.10, 'smooth')
        F.X.add(t + dur, F.X(t) - f * back, 'out')
        hand_key(F, 0, t + dur, 'body', 0.30, 0.30, 'smooth')
        hand_key(F, 1, t + dur, 'body', 0.18, 0.22, 'smooth')
        g = GUARDS['guard']
        hand_key(F, 0, t + dur + hold + 0.25, 'body', *g[0], 'smooth')
        hand_key(F, 1, t + dur + hold + 0.25, 'body', *g[1], 'smooth')
        F.STANCE.add(t + dur, 0.34, 'smooth')
        F.STANCE.add(t + dur + hold + 0.25, 0.27, 'smooth')

    def backflip(self, F, t, dur=0.75, dist=1.8, peak=1.55, turns=1.0):
        """Back handspring / backflip away from the facing direction."""
        f = sgn(F.FACE(t))
        begin(F, t - 0.02)
        x0 = F.X(t)
        F.X.add(t + dur * 0.12, x0 - f * 0.1, 'smooth')
        F.X.add(t + dur, x0 - f * dist, 'lin')
        # hip arc
        F.H.add(t + dur * 0.12, STAND_H - 0.22, 'smooth')
        F.H.add(t + dur * 0.5, peak, 'out')
        F.H.add(t + dur * 0.92, STAND_H - 0.10, 'in')
        F.H.add(t + dur + 0.12, STAND_H - 0.10, 'smooth')
        F.H.add(t + dur + 0.35, STAND_H - 0.04, 'smooth')
        F.LEAN.add(t + dur * 0.12, 0.0, 'smooth')
        F.LEAN.add(t + dur * 0.92, -2 * pi * turns, 'smooth')
        F.LEAN.add(t + dur + 0.1, -2 * pi * turns + 0.0, 'lin')
        for k in (0, 1):
            foot_key(F, k, t + dur * 0.16, 'gnd', (0.27 if k == 0 else -0.27), 0.05, 1.0, 'lin')
            foot_key(F, k, t + dur * 0.36, 'trunk', 0.12 - 0.05 * k, -0.62 + 0.05 * k, 1.0, 'smooth')
            foot_key(F, k, t + dur * 0.62, 'trunk', 0.24 - 0.05 * k, -0.30 + 0.05 * k, 1.0, 'smooth')
            foot_key(F, k, t + dur * 0.86, 'trunk', 0.10 - 0.05 * k, -0.66 + 0.05 * k, 1.0, 'smooth')
            foot_free(F, k, t + dur * 0.95, 0.12)
        hand_key(F, 0, t + dur * 0.12, 'body', 0.20, 0.30, 'smooth')
        hand_key(F, 1, t + dur * 0.12, 'body', -0.10, 0.35, 'smooth')
        hand_key(F, 0, t + dur * 0.36, 'trunk', 0.15, 0.95, 'smooth')
        hand_key(F, 1, t + dur * 0.36, 'trunk', 0.05, 0.95, 'smooth')
        hand_key(F, 0, t + dur * 0.62, 'trunk', 0.15, 0.30, 'smooth')
        hand_key(F, 1, t + dur * 0.62, 'trunk', -0.02, 0.25, 'smooth')
        g = GUARDS['guard']
        hand_key(F, 0, t + dur + 0.30, 'body', *g[0], 'smooth')
        hand_key(F, 1, t + dur + 0.30, 'body', *g[1], 'smooth')
        F.LEAN.add(t + dur + 0.3, 0.10 - 2 * pi * turns, 'smooth')
        # normalise lean back to 0 mod 2pi at end (invisible: same pose)
        self._norm_lean(F, t + dur + 0.31, 2 * pi * turns)

    def _norm_lean(self, F, t, off):
        # add two keys at (almost) the same time to wrap the angle without a visible change
        v = F.LEAN(t)
        F.LEAN.add(t, v, 'lin')
        F.LEAN.add(t + 0.001, v + off * (1 if v < 0 else -1), 'lin')

    def fly(self, dfn, att, t, dist=4.5, peak=1.2, dur=0.7, spin=0.0, slide=1.4, slide_dur=0.5, rise=0.9,
            face_up=True, land_pose=True, getup=True):
        """Knocked back in the direction the attacker faces; lands sliding, then gets up."""
        f = sgn(att.FACE(t))
        begin(dfn, t - 0.03)
        x0 = dfn.X(t)
        dfn.X.add(t, x0, 'lin')
        dfn.X.add(t + dur, x0 + f * dist, 'out')
        dfn.X.add(t + dur + slide_dur, x0 + f * (dist + slide), 'out')
        # body goes horizontal, face-up
        fd = sgn(dfn.FACE(t))
        dfn.H.add(t + 0.08, STAND_H + 0.1, 'out')
        dfn.H.add(t + dur * 0.5, peak, 'out')
        dfn.H.add(t + dur, 0.18, 'in')
        dfn.H.add(t + dur + slide_dur * 0.6, 0.12, 'smooth')
        lean_end = -1.50 - spin
        dfn.LEAN.add(t + 0.12, -0.9, 'out')
        dfn.LEAN.add(t + dur * 0.6, lean_end, 'smooth')
        dfn.LEAN.add(t + dur + slide_dur * 0.7, lean_end, 'lin')
        dfn.BEND.add(t + 0.1, -0.6, 'out')
        dfn.BEND.add(t + dur + slide_dur, -0.15, 'smooth')
        dfn.HEADT.add(t + 0.1, -0.6, 'out')
        dfn.HEADT.add(t + dur, -0.2, 'smooth')
        for k in (0, 1):
            foot_key(dfn, k, t + 0.05, 'gnd', (0.27 if k == 0 else -0.27), 0.05, 1.0, 'lin')
            foot_key(dfn, k, t + 0.2, 'trunk', -0.05 - 0.1 * k, -0.55 - 0.02 * k, 1.0, 'out')
            foot_key(dfn, k, t + dur + slide_dur * 0.7, 'trunk', -0.2 - 0.12 * k, -0.62, 1.0, 'smooth')
        hand_key(dfn, 0, t + 0.10, 'trunk', 0.30, 0.65, 'out')
        hand_key(dfn, 1, t + 0.10, 'trunk', -0.30, 0.75, 'out')
        hand_key(dfn, 0, t + dur, 'trunk', 0.42, 0.20, 'smooth')
        hand_key(dfn, 1, t + dur, 'trunk', -0.40, 0.30, 'smooth')
        return t + dur + slide_dur

    def getup(self, F, t, dur=0.75, style='kip'):
        """Recover from lying (lean ~ -1.5) to guard with a kip-up."""
        f = sgn(F.FACE(t))
        begin(F, t - 0.01)
        F.LEAN.add(t + dur * 0.35, -2.4, 'smooth')
        F.LEAN.add(t + dur * 0.7, -0.6, 'smooth')
        F.LEAN.add(t + dur, 0.10, 'smooth')
        F.H.add(t + dur * 0.4, 0.75, 'out')
        F.H.add(t + dur * 0.62, 1.22, 'out')
        F.H.add(t + dur * 0.92, STAND_H - 0.06, 'in')
        F.H.add(t + dur + 0.2, STAND_H - 0.04, 'smooth')
        F.BEND.add(t + dur * 0.5, 0.2, 'smooth')
        F.BEND.add(t + dur, 0.0, 'smooth')
        F.HEADT.add(t + dur * 0.5, 0.0, 'smooth')
        F.X.add(t + dur, F.X(t) + f * 0.0, 'smooth')
        for k in (0, 1):
            foot_key(F, k, t + dur * 0.55, 'trunk', 0.15 + 0.05 * k, -0.62, 1.0, 'smooth')
            foot_free(F, k, t + dur * 0.88, 0.14)
        g = GUARDS['guard']
        hand_key(F, 0, t + dur * 0.5, 'trunk', 0.2, 0.8, 'smooth')
        hand_key(F, 1, t + dur * 0.5, 'trunk', -0.1, 0.8, 'smooth')
        hand_key(F, 0, t + dur + 0.1, 'body', *g[0], 'smooth')
        hand_key(F, 1, t + dur + 0.1, 'body', *g[1], 'smooth')


    # ---- locomotion ----------------------------------------------------------
    def dash(self, F, t0, t1, x1, ease='smooth', lean=None, trail=True, sound=True, spray=True, arms=True, settle=0.25):
        f = sgn(F.FACE(t0))
        x0 = F.X(t0)
        fwd = (x1 - x0) * f > 0
        if lean is None:
            lean = 0.50 if fwd else -0.12
        begin(F, t0)
        F.X.add(t1, x1, ease)
        F.LEAN.add(t0 + min(0.10, (t1 - t0) * 0.4), lean, 'smooth')
        F.LEAN.add(t1 + settle * 0.6, 0.10, 'smooth')
        F.H.add(t0 + min(0.10, (t1 - t0) * 0.4), STAND_H - 0.13, 'smooth')
        F.H.add(t1 + settle * 0.7, STAND_H - 0.04, 'smooth')
        if arms:
            if fwd:
                hand_key(F, 0, t0 + 0.08, 'body', -0.34, 0.34, 'smooth')
                hand_key(F, 1, t0 + 0.08, 'body', -0.22, 0.26, 'smooth')
            g = GUARDS['guard']
            hand_key(F, 0, t1 + settle, 'body', *g[0], 'smooth')
            hand_key(F, 1, t1 + settle, 'body', *g[1], 'smooth')
        if trail and abs(x1 - x0) > 1.2:
            st = self.sc.styles['Y' if F is self.Y else 'G']
            tint = (0.55, 0.35, 1.0) if F is self.Y else (1.0, 0.85, 0.4)
            self.sc.add(FXM.AfterImage(t0, t1 + 0.1, 'Y' if F is self.Y else 'G', st, tint))
            self.sc.add(FXM.Vanish(t0, x0, x1, 1.0, tint, n=9, dur=(t1 - t0) + 0.15, seed=int(t0 * 10)))
        if sound and abs(x1 - x0) > 1.0:
            self.sc.event(t0, 'whoosh', min(1.5, abs(x1 - x0) / 4), (x0 + x1) / 2)

    def leap(self, F, t0, t1, x1, peak=1.7, crouch=0.62, ease='smooth', land_lean=0.10, arms=True, spin=False):
        """Jump arc from now to x1 landing at t1 (crouch anticipation 0.14s before t0)."""
        f = sgn(F.FACE(t0))
        begin(F, t0 - 0.16)
        F.H.add(t0 - 0.02, crouch, 'smooth')
        F.LEAN.add(t0 - 0.02, 0.35 * (1 if (x1 - F.X(t0 - 0.16)) * f > 0 else -1), 'smooth')
        F.X.add(t0, F.X(t0 - 0.16), 'lin')
        F.X.add(t1, x1, 'lin')
        F.H.add(t0 + (t1 - t0) * 0.45, peak, 'out')
        F.H.add(t1 - 0.02, STAND_H - 0.02, 'in')
        F.H.add(t1 + 0.14, crouch + 0.10, 'out')
        F.H.add(t1 + 0.40, STAND_H - 0.04, 'smooth')
        F.LEAN.add(t0 + (t1 - t0) * 0.5, 0.05, 'smooth')
        F.LEAN.add(t1 + 0.3, land_lean, 'smooth')
        if arms:
            hand_key(F, 0, t0 - 0.02, 'body', -0.25, 0.30, 'smooth')
            hand_key(F, 1, t0 - 0.02, 'body', -0.15, 0.22, 'smooth')
            hand_key(F, 0, t0 + (t1 - t0) * 0.4, 'body', 0.35, 0.80, 'smooth')
            hand_key(F, 1, t0 + (t1 - t0) * 0.4, 'body', -0.25, 0.75, 'smooth')
            g = GUARDS['guard']
            hand_key(F, 0, t1 + 0.4, 'body', *g[0], 'smooth')
            hand_key(F, 1, t1 + 0.4, 'body', *g[1], 'smooth')
        self.sc.event(t0, 'whoosh', 0.8, F.X(t0))

    def parry_at(self, dfn, att, t, P, hand=0, step=0.22, recover=0.36, sparks=True, power=0.45):
        """Defender's hand meets the incoming strike at world point P; a small step back."""
        f = sgn(att.FACE(t))
        begin(dfn, t - 0.16)
        hd = dfn.hand[hand]
        hand_key(dfn, hand, t - 0.07, 'body', 0.25, 0.55, 'smooth')
        hd.add(t, 'world', P[0], P[1], 1.0, 'out')
        hd.add(t + 0.06, 'world', P[0] + f * 0.12, P[1] + 0.06, 1.0, 'out')
        hand_key(dfn, hand, t + recover, 'body', *GUARDS['guard'][hand], 'smooth')
        x0 = dfn.X(t)
        dfn.X.add(t, x0, 'lin')
        dfn.X.add(t + 0.20, x0 + f * step, 'out')
        dfn.LEAN.add(t + 0.05, 0.02, 'out')
        dfn.LEAN.add(t + recover + 0.1, 0.10, 'smooth')
        dfn.H.add(t + 0.05, STAND_H - 0.08, 'out')
        dfn.H.add(t + recover + 0.1, STAND_H - 0.04, 'smooth')
        if sparks:
            self.impact(t, P[0], P[1], None, power, kind='block', shake=2 + 4 * power, stop=0.0)

    def contact_point(self, att, dfn, t, aim=0.05, bias=0.12):
        xa, ya = att.hip(t)
        xd, yd = dfn.hip(t)
        f = sgn(att.FACE(t))
        return ((xa + xd) / 2 + f * bias, (ya + yd) / 2 + 0.42 + aim)

    # ---- generic clash sequence (fists / feet / blades meeting at world points) --------------
    def clash_seq(self, steps, mode='fist', hipd=0.56, lunge=0.14, blade_d=0.58, spark=True):
        """steps: dicts with t, P=(x,y), who=initiator fighter, power, kind('fist'|'kick'), ang=(aY,aG) for swords,
        h=(hY,hG), lean=(lY,lG), hand (0/1)"""
        Y, G = self.Y, self.G
        for n, st in enumerate(steps):
            t = st['t']
            P = st['P']
            who = st.get('who', Y)
            kind = st.get('kind', 'fist' if mode == 'fist' else 'sword')
            hand = st.get('hand', n % 2)
            for F in (Y, G):
                f = sgn(F.FACE(t))
                ini = (F is who)
                begin(F, t - 0.13)
                if 'sideY' in st:
                    side = st['sideY'] if F is Y else -st['sideY']
                    if f != -side:
                        face(F, t - 0.10, -side, 0.06)
                        f = -side
                hipx = P[0] - f * (hipd - (lunge if ini else -0.05))
                if kind == 'sword':
                    a = st['ang'][0 if F is Y else 1]
                    dx, dy = f * math.cos(a), math.sin(a)
                    hp = (P[0] - dx * blade_d, P[1] - dy * blade_d)
                    hipx = hp[0] - f * (0.50 - (lunge * 0.6 if ini else -0.03))
                    F.WANG.add(t - 0.06, F.WANG(t - 0.13) if False else a - (0.5 if ini else 0.15), 'smooth')
                    F.WANG.add(t, a, 'in')
                    F.hand[0].add(t - 0.06, 'body', 0.20, 0.55 + (0.2 if ini else 0.0), 1.0, 'smooth')
                    F.hand[0].add(t, 'world', hp[0], hp[1], 1.0, 'in')
                    F.hand[0].add(t + 0.05, 'world', hp[0] - f * 0.03, hp[1], 1.0, 'lin')
                    F.hand[1].add(t - 0.06, 'body', 0.14, 0.50, 1.0, 'smooth')
                    F.hand[1].add(t, 'world', hp[0] - dx * 0.12 - f * 0.02, hp[1] - dy * 0.12 - 0.03, 1.0, 'in')
                elif kind == 'kick':
                    if F is who:
                        pass
                    F.hand[0].add(t - 0.06, 'body', 0.30, 0.60, 1.0, 'smooth')
                    F.hand[1].add(t - 0.06, 'body', -0.30, 0.50, 1.0, 'smooth')
                    foot_key(F, 1, t - 0.16, 'gnd', -0.27, 0.05, 1.0, 'lin')
                    foot_key(F, 1, t - 0.08, 'body', 0.26, 0.05, 1.0, 'smooth')
                    foot_key(F, 1, t, 'world', P[0], P[1], 1.0, 'in')
                    foot_key(F, 1, t + 0.07, 'world', P[0] - f * 0.03, P[1], 1.0, 'lin')
                    foot_key(F, 1, t + 0.22, 'body', 0.24, 0.0, 1.0, 'smooth')
                    foot_key(F, 1, t + 0.36, 'gnd', -0.27, 0.05, 1.0, 'smooth')
                    foot_free(F, 1, t + 0.38, 0.1)
                    hipx = P[0] - f * (0.86 - (lunge if ini else -0.05))
                else:
                    hd, oh = F.hand[hand], F.hand[1 - hand]
                    if ini:
                        hd.add(t - 0.06, 'body', 0.06, 0.48, 1.0, 'smooth')
                    else:
                        hd.add(t - 0.06, 'body', 0.32, 0.62, 1.0, 'smooth')
                    hd.add(t, 'world', P[0], P[1], 1.0, 'in')
                    hd.add(t + 0.05, 'world', P[0] - f * 0.02, P[1], 1.0, 'lin')
                    g = GUARDS['guard'][1 - hand]
                    oh.add(t - 0.03, 'body', g[0], g[1] + 0.06, 1.0, 'smooth')
                    oh.add(t + 0.06, 'body', g[0] + 0.04, g[1] + 0.04, 1.0, 'smooth')
                F.X.add(t, hipx, 'in' if ini else 'out')
                F.X.add(t + 0.09, hipx - f * 0.03, 'out')
                hh = st.get('h', (STAND_H - 0.06, STAND_H - 0.06))[0 if F is Y else 1]
                F.H.add(t - 0.05, hh - 0.03, 'smooth')
                F.H.add(t, hh, 'smooth')
                ll = st.get('lean', (0.30 if ini else 0.06,) * 2)
                F.LEAN.add(t, ll[0 if F is Y else 1] if 'lean' in st else (0.32 if ini else 0.04), 'in')
                F.LEAN.add(t + 0.10, 0.10, 'smooth')
            if spark:
                self.impact(t, P[0], P[1], None, st.get('power', 0.6), kind='clash' if kind != 'fist' else 'block',
                            shake=st.get('shake', 5), stop=st.get('stop', 0.0))
