"""The fight: choreography timeline (world time)."""
import math
from math import pi

from moves import *
import fx as FXM
from fx import YIN_C, YIN_L, YANG_C, YANG_L, WHITE
from rig import sgn, STAND_H


def prologue(sc, ch):
    Y, G = ch.Y, ch.G
    stance_hold(Y, -2.0, 'relax', lean=0.05, h=0.86)
    stance_hold(G, -2.0, 'relax', lean=0.05, h=0.86)
    Y.X.add(0.0, -9.5, 'lin')
    G.X.add(0.0, 9.5, 'lin')
    Y.X.add(8.7, -2.6, 'smooth')
    G.X.add(8.7, 2.6, 'smooth')
    # settle into stances
    for F, style, lean, h in ((Y, 'guard', 0.14, 0.78), (G, 'crane', 0.04, 0.80)):
        begin(F, 8.7)
        set_guard(F, 8.7, 1.0, style, lean, h)
    Y.STANCE.add(9.4, 0.31, 'smooth')
    G.STANCE.add(9.4, 0.29, 'smooth')
    # eyes / aura build
    Y.EYE.add(8.0, 0.35, 'lin')
    G.EYE.add(8.0, 0.35, 'lin')
    Y.EYE.add(11.6, 1.0, 'smooth')
    G.EYE.add(11.6, 1.0, 'smooth')
    Y.AURA.add(9.0, 0.15, 'lin')
    G.AURA.add(9.0, 0.15, 'lin')
    Y.AURA.add(12.8, 0.9, 'smooth')
    G.AURA.add(12.8, 0.9, 'smooth')
    # the leaf
    sc.add(FXM.Leaf(8.6, 0.0, 3.4, vy=0.82, sway=0.30, color=(0.95, 0.72, 0.78), size=0.05))
    # leaf lands at 8.6+3.4/0.82 = 12.75
    sc.add(FXM.Ring(12.75, 0.12, 0.0, 0.03, 0.9, (1, 1, 1), dur=1.2, width=0.03, flat=True, layer='back', alpha=0.8))
    sc.event(12.75, 'splash', 0.35, 0.0)
    # ambient petals drifting through the whole prologue
    for k in range(7):
        sc.add(FXM.Leaf(1.0 + k * 1.3, -6 + k * 1.9, 4.0 + (k % 3), vy=0.55 + 0.05 * k, sway=0.7, phase=k * 1.7,
                        color=(0.95, 0.75, 0.8), size=0.035))


def act1_clash(sc, ch):
    """E1: simultaneous dash and fist clash at the centre."""
    Y, G = ch.Y, ch.G
    tc = 13.05
    for F, s in ((Y, 1), (G, -1)):
        begin(F, tc - 0.30)
        F.X.add(tc - 0.12, F.X(tc - 0.30) - s * 0.30, 'smooth')
        F.X.add(tc, -s * 0.44, 'in')
        F.LEAN.add(tc - 0.12, 0.0, 'smooth')
        F.LEAN.add(tc, 0.36, 'in')
        F.H.add(tc - 0.12, 0.70, 'smooth')
        F.H.add(tc, 0.74, 'smooth')
        hand_key(F, 0, tc - 0.12, 'body', 0.02, 0.48, 'smooth')
        hand_key(F, 0, tc, 'world', 0.0, 1.30, 'in')
        hand_key(F, 1, tc - 0.12, 'body', -0.30, 0.48, 'smooth')
        hand_key(F, 1, tc, 'body', -0.25, 0.55, 'smooth')
        # recoil
        F.X.add(tc + 0.5, -s * 2.4, 'out')
        F.LEAN.add(tc + 0.14, -0.15, 'out')
        F.LEAN.add(tc + 0.9, 0.12, 'smooth')
        F.H.add(tc + 0.20, 0.82, 'out')
        F.H.add(tc + 0.9, 0.80, 'smooth')
        hand_key(F, 0, tc + 0.18, 'body', 0.15, 0.30, 'out')
        hand_key(F, 1, tc + 0.18, 'body', -0.25, 0.60, 'out')
        g = GUARDS['guard']
        hand_key(F, 0, tc + 1.0, 'body', *g[0], 'smooth')
        hand_key(F, 1, tc + 1.0, 'body', *g[1], 'smooth')
        F.STANCE.add(tc + 0.5, 0.33, 'smooth')
    sc.event(tc - 0.35, 'whoosh', 1.4, 0)
    ch.impact(tc, 0.0, 1.30, None, power=1.9, kind='clash', shake=26, stop=0.0, flash=0.55)
    sc.slowmo(tc - 0.03, tc + 0.55, 0.22, ri=0.03, ro=0.28)
    # big shock ring and cracks in water
    sc.add(FXM.Ring(tc, 0, 0.0, 0.2, 5.0, (1, 1, 1), dur=1.3, width=0.09, flat=True, layer='back'))
    sc.add(FXM.Ring(tc + 0.05, 0, 0.0, 0.2, 3.2, (0.8, 0.7, 1.0), dur=1.0, width=0.06, flat=True, layer='back'))
    sc.add(FXM.Particles(tc, 0, 0.1, n=90, speed=(2, 7), angle=pi / 2, spread=2.6, life=(0.6, 1.4), size=(0.02, 0.05),
                         gravity=9.8, drag=0.4, color=(0.9, 0.96, 1.0), shape='drop', seed=3))


def act1_flykick(sc, ch):
    """E2: Yang flying kick, Yin ducks; Yang somersaults over and lands behind."""
    Y, G = ch.Y, ch.G
    # Yin steps forward to meet
    begin(Y, 14.0)
    Y.X.add(14.60, -0.55, 'smooth')
    begin(G, 14.0)
    G.X.add(14.35, 2.5, 'smooth')
    # Yang: crouch, leap
    tl = 14.55
    begin(G, 14.36)
    G.H.add(tl - 0.03, 0.58, 'smooth')
    G.LEAN.add(tl - 0.03, 0.30, 'smooth')
    G.X.add(tl, 2.5, 'lin')
    G.X.add(tl + 0.40, -0.35, 'lin')
    G.X.add(tl + 0.72, -2.15, 'out')
    G.H.add(tl + 0.24, 1.72, 'out')
    G.H.add(tl + 0.50, 1.55, 'smooth')
    G.H.add(tl + 0.72, 0.80, 'in')
    G.H.add(tl + 0.86, 0.74, 'out')
    G.H.add(tl + 1.2, STAND_H - 0.04, 'smooth')
    G.LEAN.add(tl + 0.20, -0.45, 'smooth')
    G.LEAN.add(tl + 0.72, 0.08, 'smooth')
    hand_key(G, 0, tl - 0.03, 'body', -0.25, 0.30, 'smooth')
    hand_key(G, 1, tl - 0.03, 'body', -0.15, 0.22, 'smooth')
    hand_key(G, 0, tl + 0.26, 'body', 0.30, 0.90, 'smooth')
    hand_key(G, 1, tl + 0.26, 'body', -0.55, 0.60, 'smooth')
    g = GUARDS['guard']
    hand_key(G, 0, tl + 1.3, 'body', *g[0], 'smooth')
    hand_key(G, 1, tl + 1.3, 'body', *g[1], 'smooth')
    # jumping side kick with the lead leg
    foot_key(G, 0, tl - 0.04, 'gnd', 0.29, 0.05, 1.0, 'lin')
    foot_key(G, 0, tl + 0.14, 'body', 0.30, -0.15, 1.0, 'smooth')
    foot_key(G, 0, tl + 0.34, 'opph', 0.05, 0.62, 1.0, 'in')
    foot_key(G, 0, tl + 0.48, 'body', 0.25, -0.25, 1.0, 'smooth')
    foot_free(G, 0, tl + 0.62, 0.12)
    face(G, tl + 0.42, 1, 0.14)     # turn in mid-air
    # Yin ducks
    ch.duck(Y, tl + 0.20, depth=0.46, dur=0.14, hold=0.32)
    # Yin turns to face Yang (now on his left)
    face(Y, tl + 0.86, -1, 0.10)
    sc.event(tl + 0.34, 'whoosh', 1.2, -0.3)
    sc.add(FXM.AfterImage(tl + 0.05, tl + 0.8, 'G', sc.styles['G'], (1.0, 0.85, 0.4), delays=(3, 6, 9, 12), alpha=0.35))
    ch.impact(tl + 0.72, -2.15, 0.1, G, 0.4, kind='splash', shake=4, sound='splash')


def act1_sweep(sc, ch):
    """E3: Yin low sweep; Yang leaps over and drops an axe kick; Yin blocks."""
    Y, G = ch.Y, ch.G
    ts = 16.10      # sweep contact
    # Yin drops low and sweeps
    begin(Y, ts - 0.36)
    xg = G.X(ts)
    Y.X.add(ts - 0.14, Y.X(ts - 0.36) - 0.3 * 0, 'lin')
    Y.X.add(ts, xg + 0.72, 'in')
    Y.H.add(ts - 0.12, 0.56, 'smooth')
    Y.H.add(ts + 0.10, 0.58, 'smooth')
    Y.LEAN.add(ts - 0.12, 0.35, 'smooth')
    Y.LEAN.add(ts + 0.10, 0.55, 'smooth')
    hand_key(Y, 0, ts - 0.12, 'body', 0.30, 0.10, 'smooth')
    hand_key(Y, 1, ts - 0.12, 'body', 0.15, 0.05, 'smooth')
    foot_key(Y, 1, ts - 0.20, 'gnd', -0.27, 0.05, 1.0, 'lin')
    foot_key(Y, 1, ts - 0.08, 'gnd', -0.30, 0.15, 1.0, 'smooth')
    foot_key(Y, 1, ts, 'oppg', 0.10 * -1, 0.10, 1.0, 'in')   # sweeps through Yang's feet
    foot_key(Y, 1, ts + 0.14, 'oppg', 0.45 * -1, 0.05, 1.0, 'out')
    # Yang hops the sweep
    tj = ts - 0.10
    begin(G, ts - 0.30)
    G.H.add(tj, 0.62, 'smooth')
    G.H.add(ts + 0.06, 1.26, 'out')
    G.H.add(ts + 0.22, 1.40, 'out')
    G.LEAN.add(ts + 0.10, -0.35, 'smooth')
    hand_key(G, 0, ts + 0.06, 'body', 0.20, 0.85, 'smooth')
    hand_key(G, 1, ts + 0.06, 'body', -0.30, 0.70, 'smooth')
    # axe kick at ta
    ta = ts + 0.46
    G.X.add(tj, G.X(tj), 'lin')
    xy_at = Y.X(ta)
    fy = sgn(G.FACE(ts))
    G.X.add(ta, xy_at - fy * 0.74, 'smooth')
    G.H.add(ta - 0.14, 1.62, 'smooth')
    G.H.add(ta, 1.05, 'in')
    G.LEAN.add(ta - 0.12, -0.55, 'smooth')
    G.LEAN.add(ta, -0.30, 'in')
    foot_key(G, 1, ta - 0.30, 'gnd', -0.29, 0.05, 1.0, 'lin')
    foot_key(G, 1, ta - 0.14, 'body', 0.45, 1.05, 1.0, 'out')    # leg raised high
    foot_key(G, 1, ta, 'opph', 0.0, 0.05, 1.0, 'in')             # heel drops onto Yin's guard
    foot_key(G, 1, ta + 0.10, 'opph', 0.05, 0.0, 1.0, 'lin')
    hand_key(G, 0, ta - 0.14, 'body', 0.10, 0.75, 'smooth')
    hand_key(G, 1, ta - 0.14, 'body', -0.35, 0.65, 'smooth')
    # Yin rises to block with crossed arms
    ch.block(Y, G, ta, power=1.5, recover=0.60, push=0.38, sink=0.14)
    ch.impact(ta, Y.X(ta) - fy * 0.1 - 0.0, 1.55, G, 1.3, kind='block', shake=18, sound='block')
    sc.add(FXM.Ring(ta, Y.X(ta), 0.0, 0.2, 2.6, (1, 0.95, 0.8), dur=0.9, width=0.06, flat=True, layer='back'))
    sc.add(FXM.Particles(ta, Y.X(ta), 0.1, n=40, speed=(1.5, 5), angle=pi / 2, spread=2.4, life=(0.4, 1.0),
                         size=(0.02, 0.045), gravity=9.8, drag=0.5, color=(0.9, 0.96, 1.0), shape='drop', seed=8))
    # Yang springs off with a backflip
    tb = ta + 0.18
    foot_free(G, 1, ta + 0.14, 0.08)
    ch.backflip(G, tb, dur=0.70, dist=1.7, peak=1.45)
    return tb + 1.0


def act1_chase(sc, ch):
    """E4/E5/E6: Yin chases, Yang parries and counters, combo, launch."""
    Y, G = ch.Y, ch.G
    # Yin dashes after the flipping Yang
    t0 = 17.45
    xg = G.X(t0 + 0.6)
    ch.dash(Y, t0, t0 + 0.38, xg + 1.75)
    # G lands around t0+0.1 facing right, Yin approaches from the right
    ch.punch(Y, G, 18.20, hand=0, gap=0.95, aim=0.10, fx=False, wind=0.16,
             contact=ch.contact_point(Y, G, 18.20, 0.10))
    P1 = ch.contact_point(Y, G, 18.20, 0.10)
    ch.parry_at(G, Y, 18.20, P1, hand=0, step=0.25)
    ch.punch(Y, G, 18.42, hand=1, gap=0.88, aim=0.05, fx=False, wind=0.10, lean=0.34,
             contact=ch.contact_point(Y, G, 18.42, 0.05), back=0.02)
    P2 = ch.contact_point(Y, G, 18.42, 0.05)
    ch.parry_at(G, Y, 18.42, P2, hand=1, step=0.22)
    # Yang counter: hook to the head, lands
    ch.punch(G, Y, 18.78, hand=0, gap=0.88, aim=0.34, power=0.9, hook=True, wind=0.14, lean=0.30)
    ch.recoil(Y, G, 18.78, power=0.8, aim_high=True, recover=0.30)
    # combo: jab, cross, then roundhouse
    ch.punch(G, Y, 19.22, hand=1, gap=0.88, aim=0.05, power=0.8, wind=0.10, back=0.03)
    ch.recoil(Y, G, 19.22, power=0.6, recover=0.22)
    ch.kick(G, Y, 19.72, foot=1, gap=0.90, aim=0.10, power=1.7, high=True, wind=0.26, snd='kick', lean=-0.42)
    ch.recoil(Y, G, 19.72, power=0.4, recover=0.2)
    tend = ch.fly(Y, G, 19.78, dist=4.6, peak=1.15, dur=0.72, slide=1.6, slide_dur=0.55)
    sc.slowmo(19.70, 20.15, 0.30, ri=0.02, ro=0.15)
    ch.getup(Y, tend + 0.15, dur=0.80)
    return tend + 1.1


def act1_skid_lock(sc, ch):
    """E6 spinning kick, skid; E7 grapple lock and headbutt."""
    Y, G = ch.Y, ch.G
    t = 22.6
    # Yin dashes in and kicks; Yang takes it on the guard and skids
    xg = G.X(t)
    ch.dash(Y, t - 0.55, t - 0.10, xg + 1.55)
    ch.kick(Y, G, t + 0.30, foot=1, gap=0.95, aim=0.05, power=1.3, wind=0.24, lean=-0.36)
    ch.block(G, Y, t + 0.30, power=1.5, push=1.9, recover=0.6, sink=0.10)
    xs = G.X(t + 0.30)
    for k in range(6):
        sc.add(FXM.Particles(t + 0.32 + k * 0.045, xs - 0.3 * k, 0.05, n=14, speed=(1.0, 3.5), angle=1.9, spread=1.4,
                             life=(0.3, 0.6), size=(0.012, 0.03), gravity=9.0, drag=0.5, color=(0.9, 0.96, 1.0),
                             shape='drop', seed=k + 40))
    sc.add(FXM.Ring(t + 0.30, xs, 0.0, 0.1, 2.4, (1, 1, 1), dur=0.8, width=0.05, flat=True, layer='back'))
    # ---- grapple: both to the centre, hands locked
    tl = 23.95
    for F, s_, hy in ((G, +1, 1.0), (Y, -1, 1.0)):
        f = sgn(F.FACE(tl))
    xg = G.X(tl - 0.6)
    ch.dash(G, tl - 0.55, tl, -0.62, ease='in')
    ch.dash(Y, tl - 0.55, tl, 0.62, ease='in')
    for F in (Y, G):
        f = sgn(F.FACE(tl))
        begin(F, tl - 0.001)
        s_ = -1 if F is Y else 1          # Yin on the right (facing left)
        F.hand[0].add(tl + 0.06, 'world', -0.07 * f * -1 * 0 + (0.05 if F is Y else -0.05), 1.30, 1.0, 'out')
        F.hand[1].add(tl + 0.06, 'world', (0.05 if F is Y else -0.05), 1.04, 1.0, 'out')
        F.LEAN.add(tl + 0.10, 0.30, 'out')
        F.H.add(tl + 0.10, 0.70, 'out')
    ch.impact(tl, 0.0, 1.2, None, 1.0, kind='clash', shake=14)
    # struggle: trembling and slowly sinking, ripples pulsing
    import random
    rng = random.Random(4)
    for k in range(int(1.15 / 0.06)):
        tt = tl + 0.15 + k * 0.06
        for F, sg in ((Y, 1), (G, -1)):
            f = sgn(F.FACE(tt))
            base = (0.62 if F is Y else -0.62)
            F.X.add(tt, base + (rng.random() - 0.5) * 0.05 + (-f) * 0.0 + 0.0 + 0.0, 'lin')
        Y.H.add(tt, 0.70 - 0.05 * min(1, k / 20.0) + (rng.random() - 0.5) * 0.012, 'lin')
        G.H.add(tt, 0.70 - 0.05 * min(1, k / 20.0) + (rng.random() - 0.5) * 0.012, 'lin')
    for k in range(6):
        tk = tl + 0.15 + k * 0.22
        sc.add(FXM.Ring(tk, 0.0, 0.0, 0.3, 1.6 + 0.1 * k, (1, 0.95, 0.85) if k % 2 else (0.8, 0.7, 1.0), dur=0.9,
                        width=0.05, flat=True, layer='back', alpha=0.9))
        sc.add(FXM.Particles(tk, 0.0, 1.2, n=8, speed=(1.5, 4), angle=pi / 2, spread=2 * pi, life=(0.2, 0.5),
                             size=(0.012, 0.025), gravity=6, drag=1.0, color=(1, 0.95, 0.8), shape='spark', seed=k + 90))
    sc.event(tl + 0.4, 'charge', 0.8, 0.0)
    # headbutt
    th = tl + 1.45
    # Yang rears back then head-butts
    begin(G, th - 0.30)
    G.LEAN.add(th - 0.08, -0.32, 'smooth')
    G.LEAN.add(th, 0.75, 'in')
    G.X.add(th - 0.08, -0.72, 'smooth')
    G.X.add(th, -0.46, 'in')
    G.H.add(th - 0.08, 0.76, 'smooth')
    G.H.add(th, 0.72, 'in')
    for k in (0, 1):
        hand_key(G, k, th - 0.02, 'world', -0.05, 1.20 - 0.12 * k, 'smooth')
    ch.impact(th, 0.05, 1.55, G, 1.6, kind='hit', shake=22, stop=0.06, flash=0.35)
    sc.slowmo(th - 0.04, th + 0.30, 0.3, ri=0.02, ro=0.15)
    # both stagger apart
    for F, sg in ((Y, 1), (G, -1)):
        begin(F, th - 0.001)
        f = sgn(F.FACE(th))
        F.X.add(th + 0.35, (0.62 if F is Y else -0.62) + sg * 1.4, 'out')
        F.LEAN.add(th + 0.10, -0.35, 'out')
        F.LEAN.add(th + 0.9, 0.10, 'smooth')
        F.BEND.add(th + 0.10, -0.4, 'out')
        F.BEND.add(th + 0.7, 0.0, 'smooth')
        F.HEADT.add(th + 0.1, -0.7, 'out')
        F.HEADT.add(th + 0.7, 0.0, 'smooth')
        F.H.add(th + 0.12, 0.76, 'out')
        F.H.add(th + 0.9, STAND_H - 0.04, 'smooth')
        hand_key(F, 0, th + 0.12, 'body', 0.10, 0.55, 'out')
        hand_key(F, 1, th + 0.12, 'body', -0.30, 0.45, 'out')
        g = GUARDS['guard']
        hand_key(F, 0, th + 1.0, 'body', *g[0], 'smooth')
        hand_key(F, 1, th + 1.0, 'body', *g[1], 'smooth')
    return th + 1.1


def act1_flurry(sc, ch, t0):
    """E8: rapid fist exchange at the centre, ending with a double cross-counter."""
    Y, G = ch.Y, ch.G
    # both step in
    ch.dash(G, t0 - 0.55, t0 - 0.12, -0.55, ease='smooth', trail=False)
    ch.dash(Y, t0 - 0.55, t0 - 0.12, 0.55, ease='smooth', trail=False)
    ys = [1.35, 1.05, 1.50, 1.20, 0.60, 1.45, 1.10, 1.55, 1.25, 1.40, 1.15, 1.50]
    ts = [0.0, 0.24, 0.44, 0.62, 0.78, 0.94, 1.08, 1.21, 1.33, 1.44, 1.55, 1.66]
    steps = []
    for n, (dt, y) in enumerate(zip(ts, ys)):
        who = Y if n % 2 == 0 else G
        kind = 'kick' if n == 4 else 'fist'
        steps.append(dict(t=t0 + dt, P=(0.02 * (-1) ** n, y), who=who, kind=kind, hand=(n // 1) % 2,
                          power=0.5 + 0.03 * n, shake=4 + n * 0.5))
    ch.clash_seq(steps)
    # double cross-counter: both fists land
    tx = t0 + 2.00
    for F, D in ((Y, G), (G, Y)):
        ch.punch(F, D, tx, hand=0, gap=0.98, aim=0.30, power=1.5, wind=0.13, lean=0.34, fx=False)
    for F, D in ((Y, G), (G, Y)):
        pass
    ch.impact(tx, 0.0, 1.62, None, 1.7, kind='hit', shake=26, stop=0.07, flash=0.4)
    sc.slowmo(tx - 0.03, tx + 0.40, 0.25, ri=0.02, ro=0.2)
    for F in (Y, G):
        f = sgn(F.FACE(tx))
        begin(F, tx + 0.001)
        s_ = -1 if F is Y else 1
        F.X.add(tx + 0.45, (0.55 if F is Y else -0.55) - s_ * 0 + (1.9 if F is Y else -1.9), 'out')
        F.LEAN.add(tx + 0.12, -0.55, 'out')
        F.LEAN.add(tx + 1.0, 0.10, 'smooth')
        F.BEND.add(tx + 0.12, -0.5, 'out')
        F.BEND.add(tx + 0.8, 0.0, 'smooth')
        F.HEADT.add(tx + 0.12, -0.8, 'out')
        F.HEADT.add(tx + 0.8, 0.0, 'smooth')
        F.H.add(tx + 0.12, 0.72, 'out')
        F.H.add(tx + 1.0, STAND_H - 0.04, 'smooth')
        hand_key(F, 0, tx + 0.14, 'body', 0.0, 0.55, 'out')
        hand_key(F, 1, tx + 0.14, 'body', -0.35, 0.45, 'out')
        g = GUARDS['guard']
        hand_key(F, 0, tx + 1.05, 'body', *g[0], 'smooth')
        hand_key(F, 1, tx + 1.05, 'body', *g[1], 'smooth')
    return tx + 1.1


def act1_aerial(sc, ch, t0):
    """E9: both leap and trade blows in mid-air, swap sides, end with a foot clash and a heavy landing."""
    Y, G = ch.Y, ch.G
    # leap up together (from ~+-2.4)
    for F in (Y, G):
        f = sgn(F.FACE(t0))
        begin(F, t0 - 0.2)
        F.H.add(t0 - 0.04, 0.60, 'smooth')
        F.LEAN.add(t0 - 0.04, 0.3, 'smooth')
        F.X.add(t0, F.X(t0 - 0.2), 'lin')
        hand_key(F, 0, t0 - 0.04, 'body', -0.25, 0.28, 'smooth')
        hand_key(F, 1, t0 - 0.04, 'body', -0.15, 0.20, 'smooth')
    steps = []
    tt = [0.62, 0.84, 1.03, 1.20, 1.36, 1.52]
    ys = [2.9, 3.15, 2.8, 3.2, 3.0, 3.25]
    for n, (dt, y) in enumerate(zip(tt, ys)):
        steps.append(dict(t=t0 + dt, P=(0.0, y), who=Y if n % 2 == 0 else G, hand=n % 2, power=0.7 + 0.05 * n,
                          shake=5 + n, h=(y - 0.38, y - 0.38), lean=(0.22, 0.22)))
    # hold in the air between contacts (H keys are set by the clash steps); arc up before the first one
    for F in (Y, G):
        F.H.add(t0 + 0.28, 2.6, 'out')
    ch.clash_seq(steps)
    # swap sides in mid-air
    ts_ = t0 + 1.28
    for F in (Y, G):
        face(F, ts_, -sgn(F.FACE(ts_)), 0.10)
    # final: both kick, feet clash
    tk = t0 + 1.78
    for F in (Y, G):
        f = sgn(F.FACE(tk))
        begin(F, tk - 0.2)
        F.H.add(tk - 0.06, 3.05, 'smooth')
        F.X.add(tk, (0.72 if f < 0 else -0.72) * 1.0, 'smooth')
        F.LEAN.add(tk, -0.6, 'smooth')
        foot_key(F, 0, tk - 0.14, 'body', 0.30, -0.2, 1.0, 'smooth')
        foot_key(F, 0, tk, 'world', 0.0, 2.75, 1.0, 'in')
        foot_key(F, 0, tk + 0.20, 'world', 0.0, 2.75, 1.0, 'lin')
        hand_key(F, 0, tk - 0.06, 'body', 0.35, 0.75, 'smooth')
        hand_key(F, 1, tk - 0.06, 'body', -0.35, 0.60, 'smooth')
    ch.impact(tk, 0.0, 2.75, None, 1.8, kind='clash', shake=24, stop=0.06, flash=0.5)
    sc.add(FXM.Ring(tk, 0.0, 2.75, 0.2, 4.0, (1, 1, 1), dur=0.9, width=0.08, flat=True, layer='back', squash=0.25))
    sc.slowmo(tk - 0.03, tk + 0.55, 0.22, ri=0.03, ro=0.25)
    # thrown apart, fall and land
    tl_ = tk + 0.28
    for F, sgn_ in ((Y, 1), (G, -1)):
        f = sgn(F.FACE(tl_))
        begin(F, tk + 0.001)
        for k in (0, 1):
            foot_free(F, k, tk + 0.10, 0.1) if F.foot[k].k else None
        F.X.add(tl_ + 0.55, (2.1 if F is Y else -2.1) * (1 if True else 1), 'out')
        F.H.add(tk + 0.35, 2.4, 'out')
        F.H.add(tl_ + 0.85, 0.92, 'in')
        F.H.add(tl_ + 1.05, 0.66, 'out')
        F.H.add(tl_ + 1.65, STAND_H - 0.04, 'smooth')
        F.LEAN.add(tk + 0.30, -0.9, 'out')
        F.LEAN.add(tl_ + 0.80, 0.2, 'smooth')
        F.LEAN.add(tl_ + 1.6, 0.10, 'smooth')
        hand_key(F, 0, tk + 0.3, 'body', 0.35, 0.70, 'out')
        hand_key(F, 1, tk + 0.3, 'body', -0.35, 0.60, 'out')
        g = GUARDS['guard']
        hand_key(F, 0, tl_ + 1.6, 'body', *g[0], 'smooth')
        hand_key(F, 1, tl_ + 1.6, 'body', *g[1], 'smooth')
    tland = tl_ + 0.92
    for x in (-2.1, 2.1):
        sc.add(FXM.Ring(tland, x, 0.0, 0.1, 2.2, (1, 1, 1), dur=0.8, width=0.06, flat=True, layer='back'))
        sc.add(FXM.Particles(tland, x, 0.1, n=40, speed=(1.5, 5), angle=pi / 2, spread=2.4, life=(0.4, 1.0),
                             size=(0.02, 0.045), gravity=9.8, drag=0.5, color=(0.9, 0.96, 1.0), shape='drop', seed=int(x * 10)))
    sc.event(tland, 'slam', 1.0, -2.1)
    sc.event(tland, 'slam', 1.0, 2.1)
    return tl_ + 1.7


def stand_off2(sc, ch, t1):
    """E11: they rise, walk apart, breathing hard; auras erupt; the sky darkens."""
    Y, G = ch.Y, ch.G
    for F, x in ((Y, 3.4), (G, -3.4)):
        begin(F, t1)
        F.X.add(t1 + 1.6, x, 'smooth')
        F.STANCE.add(t1 + 1.6, 0.30, 'smooth')
        set_guard(F, t1, 1.4, 'guard', 0.14, 0.78)
    sc.palette.add(t1 + 0.6, 'gloom', 3.0)
    for F in (Y, G):
        F.AURA.add(t1, F.AURA(t1), 'lin')
        F.AURA.add(t1 + 2.6, 1.8, 'smooth')
        F.EYE.add(t1 + 2.6, 1.6, 'smooth')
    sc.add(FXM.Wisps(t1 + 1.0, t1 + 4.4, 'Y', (0.55, 0.35, 1.0), n=26, up=1.4, size=0.06, intensity=1.0, seed=1))
    sc.add(FXM.Wisps(t1 + 1.0, t1 + 4.4, 'G', (1.0, 0.85, 0.4), n=26, up=1.4, size=0.06, intensity=1.0, seed=2))
    sc.event(t1 + 1.0, 'ambience_swell', 1.0, 0)
    # energy pulses toward each other
    tp = t1 + 2.6
    sc.add(FXM.Ring(tp, 3.4, 0.0, 0.3, 7.0, (0.6, 0.4, 1.0), dur=1.4, width=0.10, flat=True, layer='back'))
    sc.add(FXM.Ring(tp, -3.4, 0.0, 0.3, 7.0, (1.0, 0.85, 0.4), dur=1.4, width=0.10, flat=True, layer='back'))
    sc.add(FXM.Ring(tp, 3.4, 1.0, 0.3, 3.4, (0.6, 0.4, 1.0), dur=1.0, width=0.06))
    sc.add(FXM.Ring(tp, -3.4, 1.0, 0.3, 3.4, (1.0, 0.85, 0.4), dur=1.0, width=0.06))
    sc.add(FXM.Particles(tp, 3.4, 0.2, n=60, speed=(1, 5), angle=pi / 2, spread=2.6, life=(0.6, 1.4), size=(0.02, 0.05),
                         gravity=-1.0, drag=0.8, color=(0.55, 0.35, 1.0), shape='ember', seed=71))
    sc.add(FXM.Particles(tp, -3.4, 0.2, n=60, speed=(1, 5), angle=pi / 2, spread=2.6, life=(0.6, 1.4), size=(0.02, 0.05),
                         gravity=-1.0, drag=0.8, color=(1.0, 0.85, 0.4), shape='ember', seed=72))
    sc.shake(tp, 8, 0.8)
    sc.event(tp, 'boom', 0.8, 0)
    return t1 + 3.6


def act2_shadow(sc, ch, t2):
    """II-1: shadow step, then the supersonic exchange."""
    Y, G = ch.Y, ch.G
    sc.palette.add(t2 - 0.3, 'storm', 4.0)
    # Yin vanishes in an ink burst
    tv = t2
    sc.add(FXM.Particles(tv, Y.X(tv), 1.0, n=80, speed=(1, 6), life=(0.4, 1.1), size=(0.05, 0.14), gravity=-0.5, drag=1.4,
                         color=(0.08, 0.04, 0.16), shape='ink', seed=5, add=False))
    sc.add(FXM.Ring(tv, Y.X(tv), 1.0, 0.1, 2.4, (0.55, 0.35, 1.0), dur=0.5, width=0.07))
    sc.event(tv, 'whoosh', 1.5, Y.X(tv))
    Y.ALPHA.add(tv - 0.03, 1.0, 'lin')
    Y.ALPHA.add(tv + 0.03, 0.0, 'lin')
    tr = tv + 0.42
    xr = G.X(tr) + 1.05 * sgn(-G.FACE(tr)) * -1     # appears behind Yang
    xr = G.X(tr) - 1.10 * sgn(G.FACE(tr)) * 1
    begin(Y, tv - 0.03)
    Y.X.add(tv + 0.03, Y.X(tv), 'lin')
    Y.X.add(tr - 0.02, xr, 'lin')
    Y.ALPHA.add(tr - 0.02, 0.0, 'lin')
    Y.ALPHA.add(tr + 0.03, 1.0, 'lin')
    face(Y, tr - 0.05, sgn(G.FACE(tr)), 0.02)
    sc.add(FXM.Particles(tr, xr, 1.0, n=80, speed=(1, 6), life=(0.4, 1.1), size=(0.05, 0.14), gravity=-0.5, drag=1.4,
                         color=(0.08, 0.04, 0.16), shape='ink', seed=6, add=False))
    sc.add(FXM.Ring(tr, xr, 1.0, 0.1, 2.4, (0.55, 0.35, 1.0), dur=0.5, width=0.07))
    # Yin strikes Yang's back; Yang whirls and blocks with a flare of light
    ts = tr + 0.35
    ch.punch(Y, G, ts, hand=0, gap=0.92, aim=0.15, fx=False, wind=0.14, lean=0.4,
             contact=None)
    face(G, ts - 0.2, -sgn(G.FACE(ts)), 0.08)
    ch.block(G, Y, ts + 0.02, power=1.6, push=1.2, recover=0.4)
    ch.impact(ts, Y.hip(ts)[0] + 0.85 * sgn(Y.FACE(ts)), 1.4, G, 1.6, kind='clash', shake=20, stop=0.05, flash=0.4)
    G.AURA.add(ts, 1.8, 'lin')
    G.AURA.add(ts + 0.2, 3.0, 'out')
    G.AURA.add(ts + 1.5, 1.8, 'smooth')
    # ---- supersonic exchange
    t0 = ts + 1.0
    xs = [0.0, -3.4, 2.6, -1.2, 3.6, 0.0, -4.2, 1.6, -2.6, 4.0, 0.0, -3.0, 2.4, 0.0]
    ys = [1.3, 1.6, 1.0, 2.9, 0.7, 1.4, 3.6, 1.2, 2.2, 1.5, 4.2, 1.2, 1.6, 1.35]
    dts = [0.0, 0.26, 0.48, 0.66, 0.82, 0.97, 1.11, 1.24, 1.36, 1.47, 1.58, 1.69, 1.80, 1.92]
    steps = []
    side = 1
    for n in range(len(xs)):
        side = -side if n % 2 == 0 else side
        y = ys[n]
        hh = (y - 0.42, y - 0.42) if y > 2.0 else (STAND_H - 0.06,) * 2
        steps.append(dict(t=t0 + dts[n], P=(xs[n], y), who=Y if n % 2 == 0 else G, sideY=(-1 if n % 3 != 1 else 1),
                          power=0.9 + 0.02 * n, shake=8, h=hh, kind='fist'))
    ch.clash_seq(steps, hipd=0.60, lunge=0.10)
    for n, st in enumerate(steps):
        tt = st['t']
        x, y = st['P']
        sc.add(FXM.Ring(tt, x, y, 0.2, 2.0 + 0.6 * (n % 3), (1, 1, 1) if n % 2 else (0.7, 0.55, 1.0), dur=0.5, width=0.07))
        if y < 1.8:
            if n % 2 == 0:
                sc.add(FXM.Column(tt + 0.02, x, 0.45 + 0.1 * (n % 3), 3.0 + 1.2 * (n % 3), dur=0.9, seed=n))
            sc.event(tt, 'splash', 0.8, x)
        sc.event(tt, 'clash', 1.0, x)
    sc.add(FXM.AfterImage(t0 - 0.1, t0 + 2.1, 'Y', sc.styles['Y'], (0.55, 0.35, 1.0), delays=(2, 4, 6, 8, 10), alpha=0.4))
    sc.add(FXM.AfterImage(t0 - 0.1, t0 + 2.1, 'G', sc.styles['G'], (1.0, 0.85, 0.4), delays=(2, 4, 6, 8, 10), alpha=0.4))
    ch.aux['t_exch0'] = t0
    ch.aux['t_exch1'] = t0 + dts[-1]
    return t0 + dts[-1] + 0.4


def _face_each(ch, t):
    Y, G = ch.Y, ch.G
    for F, D in ((Y, G), (G, Y)):
        want = 1.0 if D.X(t) > F.X(t) else -1.0
        if sgn(F.FACE(t)) != want:
            face(F, t, want, 0.05)


def act2_sky(sc, ch, t):
    """II-2: uppercut launches Yin skyward, sky duel, axe-kick plunge, splash."""
    Y, G = ch.Y, ch.G
    _face_each(ch, t)
    tu = t + 0.85
    fG = sgn(G.FACE(tu))
    ch.dash(G, t + 0.1, tu - 0.12, Y.X(tu) - fG * 1.5, trail=True)
    ch.punch(G, Y, tu, hand=1, gap=0.82, aim=-0.10, power=2.4, wind=0.14, lean=0.5, fx=False, follow=0.1)
    xg = G.X(tu)
    ch.impact(tu, xg + fG * 0.6, 1.0, G, 2.4, kind='boom', shake=34, stop=0.07, flash=0.55)
    sc.add(FXM.Column(tu, xg + fG * 0.9, 0.9, 7.5, dur=1.6, seed=3))
    sc.slowmo(tu - 0.02, tu + 0.5, 0.25, ri=0.02, ro=0.2)
    # Yin launched
    begin(Y, tu - 0.001)
    fx_ = Y.X(tu)
    Y.X.add(tu + 0.9, fx_ + fG * 1.6, 'out')
    Y.H.add(tu + 0.9, 9.6, 'out')
    Y.LEAN.add(tu + 0.9, -9.4, 'smooth')
    for k in (0, 1):
        hand_key(Y, k, tu + 0.15, 'trunk', 0.4 - 0.7 * k, 0.6, 'out')
    # Yang follows
    begin(G, tu + 0.12)
    G.X.add(tu + 0.92, fx_ + fG * 1.6 - fG * 1.3, 'out')
    G.H.add(tu + 0.92, 9.5, 'out')
    G.LEAN.add(tu + 0.5, 0.3, 'smooth')
    G.LEAN.add(tu + 0.92, 0.1, 'smooth')
    sc.add(FXM.AfterImage(tu + 0.1, tu + 1.0, 'G', sc.styles['G'], (1.0, 0.85, 0.4), delays=(3, 6, 9, 12), alpha=0.4))
    sc.event(tu + 0.15, 'whoosh', 1.5, xg)
    # sky duel
    ts0 = tu + 1.05
    x0 = fx_ + fG * 1.6
    ys = [9.8, 10.3, 9.6, 10.6, 10.0, 10.4]
    dts = [0.0, 0.24, 0.42, 0.58, 0.72, 0.86]
    steps = []
    for n in range(6):
        steps.append(dict(t=ts0 + dts[n], P=(x0 + 0.2 * (-1) ** n, ys[n]), who=Y if n % 2 == 0 else G, sideY=(1 if n % 2 == 0 else -1) * (-fG) if n else -fG,
                          power=1.0 + 0.05 * n, shake=8, h=(ys[n] - 0.42,) * 2))
    # make Yin land at his own side consistently
    _sky_fix = None
    ch.clash_seq(steps, hipd=0.60)
    sc.event(ts0 - 0.2, 'whoosh', 1.0, x0)
    # Yin axe-kicks Yang into the lake
    tp = ts0 + 1.15
    begin(Y, tp - 0.25)
    Y.H.add(tp - 0.05, 10.6, 'smooth')
    Y.LEAN.add(tp - 0.05, -0.35, 'smooth')
    foot_key(Y, 1, tp - 0.20, 'gnd', -0.27, 0.05, 1.0, 'lin')
    foot_key(Y, 1, tp - 0.08, 'body', 0.30, 1.0, 1.0, 'out')
    foot_key(Y, 1, tp, 'oppc', -0.02, 0.10, 1.0, 'in')
    ch.impact(tp, G.hip(tp)[0], G.hip(tp)[1] + 0.4, Y, 2.0, kind='boom', shake=28, stop=0.06, flash=0.5)
    sc.slowmo(tp - 0.02, tp + 0.4, 0.3, ri=0.02, ro=0.15)
    begin(G, tp - 0.001)
    G.H.add(tp + 0.2, 8.0, 'lin')
    G.H.add(tp + 0.62, 0.20, 'in')
    G.LEAN.add(tp + 0.15, -3.0, 'out')
    G.LEAN.add(tp + 0.62, -3.0, 'lin')
    G.LEAN.add(tp + 0.85, -1.5, 'out')
    G.X.add(tp + 0.62, G.X(tp) - fG * 0.4, 'lin')
    hand_key(G, 0, tp + 0.2, 'trunk', 0.35, 0.7, 'out')
    hand_key(G, 1, tp + 0.2, 'trunk', -0.35, 0.7, 'out')
    tc = tp + 0.62
    xc = G.X(tc)
    ch.aux.update(t_tu=tu, t_tp=tp, t_tc=tc, t_sky0=ts0, plunge_x=xc + 1.5)
    sc.event(tc, 'slam', 2.0, xc)
    ch.impact(tc, xc, 0.2, G, 2.6, kind='boom', shake=44, stop=0.06, flash=0.7)
    sc.add(FXM.Column(tc, xc, 1.5, 10.0, dur=2.4, seed=9))
    sc.add(FXM.Column(tc + 0.05, xc - 1.6, 0.9, 6.0, dur=1.8, seed=10))
    sc.add(FXM.Column(tc + 0.08, xc + 1.7, 0.9, 6.5, dur=1.8, seed=11))
    for k, r in enumerate((6, 11, 16)):
        sc.add(FXM.Ring(tc + 0.08 * k, xc, 0.0, 0.3, r, (1, 1, 1), dur=1.6 + 0.3 * k, width=0.12, flat=True, layer='back'))
    sc.add(FXM.Particles(tc, xc, 0.2, n=220, speed=(3, 13), angle=pi / 2, spread=2.4, life=(0.8, 2.2), size=(0.02, 0.06),
                         gravity=9.8, drag=0.3, color=(0.9, 0.96, 1.0), shape='drop', seed=12))
    sc.slowmo(tc - 0.02, tc + 0.6, 0.25, ri=0.02, ro=0.3)
    # Yin descends gently
    begin(Y, tp + 0.3)
    Y.X.add(tp + 2.9, xc + 3.6, 'smooth')
    Y.H.add(tp + 2.9, STAND_H - 0.02, 'smooth')
    Y.LEAN.add(tp + 0.7, 0.0, 'smooth')
    for k in (0, 1):
        hand_key(Y, k, tp + 0.9, 'body', 0.30 - 0.6 * k, 0.15, 'smooth')
    _face_each(ch, tp + 0.6) if False else None
    face(Y, tp + 0.4, -sgn(fG) if False else (1.0 if xc > xc + 3.6 else -1.0), 0.1)
    sc.add(FXM.Ring(tp + 2.9, xc + 3.6, 0.0, 0.2, 3.0, (0.6, 0.4, 1.0), dur=1.2, width=0.08, flat=True, layer='back'))
    # Yang rises out of the crater
    ch.getup(G, tc + 1.5, dur=0.85)
    sc.palette.add(tc, 'storm', 2.5)
    return tc + 2.6, xc


def act2_storm(sc, ch, t, xc):
    """II-3: lightning storm, the crescents collide."""
    Y, G = ch.Y, ch.G
    # positions: Yang at xc (left), Yin right
    xy0 = Y.X(t)
    xg = G.X(t)
    face(G, t - 0.3, 1.0 if xy0 > xg else -1.0, 0.05)
    t3 = t
    begin(G, t3)
    hand_key(G, 0, t3 + 0.5, 'body', 0.15, 1.75, 'smooth')
    hand_key(G, 1, t3 + 0.5, 'body', -0.2, 0.5, 'smooth')
    G.LEAN.add(t3 + 0.5, -0.15, 'smooth')
    G.AURA.add(t3 + 0.5, 2.6, 'smooth')
    sc.event(t3, 'ambience_swell', 1.2, 0)
    bx = [xy0, xy0 + 2.4 * (1 if xy0 > 0 else -1), xy0 - 3.2 * (1 if xy0 > 0 else -1), xy0 + 1.0]
    tb = [t3 + 0.85, t3 + 1.25, t3 + 1.6, t3 + 1.95]
    dirn = 1 if xy0 > xg else -1
    px = [xy0, xy0 + 2.6 * dirn, xy0 - 3.2 * dirn * 1.0, xy0 + 0.8 * dirn]
    for i in range(3):
        ch.dash(Y, tb[i] - 0.16, tb[i] + 0.03, px[i + 1], trail=True, settle=0.1)
    for i in range(4):
        x = px[i]
        w = tb[i]
        sc.add(FXM.Bolt(w, (x + 0.6, 16.0), (x, 0.1), color=(0.75, 0.85, 1.0), dur=0.28, width=0.12, jag=0.9, seed=i + 1,
                        branches=4))
        sc.add(FXM.Flash(w, x, 0.4, 2.2, (0.8, 0.9, 1.0), dur=0.28))
        sc.add(FXM.Ring(w, x, 0.0, 0.2, 3.2, (0.85, 0.92, 1.0), dur=0.8, width=0.08, flat=True, layer='back'))
        sc.add(FXM.ScreenFlash(w, 0.16, (0.85, 0.9, 1.0), peak=0.55, attack=0.01))
        sc.add(FXM.Particles(w, x, 0.1, n=50, speed=(2, 8), angle=pi / 2, spread=2.4, life=(0.4, 1.0), size=(0.02, 0.05),
                             gravity=9.8, drag=0.4, color=(0.9, 0.96, 1.0), shape='drop', seed=20 + i))
        sc.shake(w, 16, 0.4)
        sc.event(w, 'lightning', 1.2, x)
    # Yin catches the last one
    ta = tb[3]
    begin(Y, ta - 0.4)
    hand_key(Y, 0, ta - 0.05, 'body', 0.20, 1.80, 'smooth')
    hand_key(Y, 1, ta - 0.05, 'body', 0.0, 0.5, 'smooth')
    Y.LEAN.add(ta, -0.15, 'smooth')
    _y = Y
    sc.add(FXM.Orb(ta, ta + 1.55, lambda R: (R.frames[R.i]['Y']['arms'][0][2][0], R.frames[R.i]['Y']['arms'][0][2][1] + 0.3),
                   0.10, 0.85, (0.6, 0.35, 1.0), dark=True, motes=22, seed=4))
    sc.add(FXM.Bolt(ta + 0.05, (px[3] + 0.4, 16.0), (0, 0), color=(0.75, 0.85, 1.0), dur=0.6, width=0.10, jag=0.7, seed=9,
                    pos1=lambda R: (R.frames[R.i]['Y']['arms'][0][2][0], R.frames[R.i]['Y']['arms'][0][2][1] + 0.1)))
    Y.AURA.add(ta + 0.2, 3.0, 'out')
    sc.event(ta - 0.5, 'charge', 1.0, px[3])
    # both throw crescents that collide
    tth = ta + 1.6
    tcl = tth + 0.20
    xm = (Y.X(tth) + G.X(tth)) / 2
    yx, gx = Y.X(tth), G.X(tth)
    begin(Y, tth - 0.1)
    hand_key(Y, 0, tth, 'body', 0.75, 1.35, 'out')
    Y.LEAN.add(tth, 0.35, 'out')
    begin(G, tth - 0.05)
    hand_key(G, 0, tth + 0.04, 'body', 0.75, 1.35, 'out')
    hand_key(G, 1, tth + 0.04, 'body', 0.45, 1.25, 'out')
    G.LEAN.add(tth + 0.04, 0.35, 'out')
    dur = tcl - tth
    ycx, gcx = yx - 0.5 * dirn, gx + 0.5 * dirn
    sc.add(FXM.Crescent(tth, ycx, 1.4, (xm - ycx) / dur, 0.0, size=2.0, color=(0.30, 0.12, 0.85), core=(0.03, 0.0, 0.08), dur=dur, add=False,
                        thick=0.3))
    sc.add(FXM.Crescent(tth, gcx, 1.4, (xm - gcx) / dur, 0.0, size=2.0, color=YANG_C, core=WHITE, dur=dur, add=True, thick=0.3))
    sc.event(tth, 'whoosh', 1.4, xm)
    ch.impact(tcl, xm, 1.4, None, 2.8, kind='boom', shake=46, stop=0.0, flash=0.85)
    sc.slowmo(tcl - 0.02, tcl + 0.7, 0.22, ri=0.02, ro=0.35)
    for k, r in enumerate((5, 9, 14)):
        sc.add(FXM.Ring(tcl + 0.05 * k, xm, 1.4, 0.3, r * 0.6, (1, 1, 1) if k != 1 else (0.7, 0.5, 1.0), dur=1.2, width=0.12))
        sc.add(FXM.Ring(tcl + 0.05 * k, xm, 0.0, 0.3, r, (1, 1, 1), dur=1.6, width=0.10, flat=True, layer='back'))
    # blown back
    for F in (Y, G):
        begin(F, tcl)
        s_ = 1 if F.X(tcl) > xm else -1
        F.X.add(tcl + 0.6, F.X(tcl) + s_ * 2.4, 'out')
        F.LEAN.add(tcl + 0.15, -0.35, 'out')
        F.LEAN.add(tcl + 1.0, 0.10, 'smooth')
        F.H.add(tcl + 0.2, STAND_H - 0.06, 'out')
        set_guard(F, tcl + 0.5, 0.6, 'guard', 0.12, 0.80)
    return tcl + 1.4


def weapons_on(sc, ch, t, dur=0.35):
    Y, G = ch.Y, ch.G
    for F in (Y, G):
        F.WL.add(t, 0.0, 'lin')
        F.WL.add(t + dur, 1.0, 'out')
        F.WANG.add(t, 0.9, 'lin')
        begin(F, t)
        set_guard(F, t, 0.4, 'blade', 0.10, 0.78)
    for F, col in ((Y, (0.6, 0.4, 1.0)), (G, (1.0, 0.9, 0.5))):
        sc.add(FXM.Particles(t, F.X(t) + 0.35 * sgn(F.FACE(t)), 1.0, n=60, speed=(1, 5), life=(0.3, 0.8), size=(0.015, 0.035),
                             gravity=0, drag=2.0, color=col, shape='spark', seed=31 if F is Y else 32))
        sc.add(FXM.Ring(t, F.X(t) + 0.35 * sgn(F.FACE(t)), 1.0, 0.1, 1.6, col, dur=0.5, width=0.06))
    sc.event(t, 'sword', 1.2, 0)
    sc.event(t + 0.1, 'sword', 1.0, 0)


def act3_duel(sc, ch, t):
    """III-1: blade duel ending in a blade lock, then a shockwave separates them."""
    Y, G = ch.Y, ch.G
    _face_each(ch, t)
    ch.dash(Y, t - 0.05, t + 0.40, 1.0 if Y.X(t) > 0 else -1.0, trail=True, arms=False)
    ch.dash(G, t - 0.05, t + 0.40, -1.0 if Y.X(t) > 0 else 1.0, trail=True, arms=False)
    sy = 1 if Y.X(t) > 0 else -1     # side of Yin
    t0 = t + 0.62
    dts = [0.0, 0.28, 0.50, 0.70, 0.88, 1.05, 1.20, 1.34, 1.47]
    Ps = [(0, 1.5), (-0.4, 1.0), (0.5, 1.95), (-0.2, 0.8), (0.3, 1.6), (0.0, 2.05), (-0.3, 1.2), (0.4, 1.75), (0.0, 1.5)]
    angs = [(0.9, 0.5), (-0.2, 0.7), (1.5, 0.2), (-0.5, 0.9), (1.1, -0.1), (1.7, 1.3), (0.3, 0.3), (1.3, 0.9), (0.8, 0.8)]
    steps = []
    for n in range(len(dts)):
        steps.append(dict(t=t0 + dts[n], P=Ps[n], who=Y if n % 2 == 0 else G, kind='sword', ang=angs[n],
                          power=1.0 + 0.05 * n, shake=8 + n))
    ch.clash_seq(steps, mode='sword', blade_d=0.60)
    for n, st in enumerate(steps):
        sc.add(FXM.Particles(st['t'], st['P'][0], st['P'][1], n=40, speed=(3, 9), life=(0.25, 0.7), size=(0.012, 0.03),
                             gravity=8, drag=1.0, color=(1.0, 0.95, 0.75) if n % 2 else (0.8, 0.65, 1.0), shape='spark',
                             seed=n + 60))
        sc.event(st['t'], 'clash', 1.1, st['P'][0])
    # blade lock
    tl = t0 + dts[-1] + 0.35
    P = (0.0, 1.6)
    for F in (Y, G):
        f = sgn(F.FACE(tl))
        a_ = 0.85
        dx, dy = f * math.cos(a_), math.sin(a_)
        hp = (P[0] - dx * 0.6, P[1] - dy * 0.6)
        begin(F, tl - 0.12)
        F.WANG.add(tl, a_, 'in')
        F.hand[0].add(tl, 'world', hp[0], hp[1], 1.0, 'in')
        F.hand[1].add(tl, 'world', hp[0] - dx * 0.12, hp[1] - dy * 0.12 - 0.03, 1.0, 'in')
        F.X.add(tl, hp[0] - f * 0.5, 'in')
        F.LEAN.add(tl, 0.32, 'in')
        F.H.add(tl, 0.72, 'in')
    ch.impact(tl, P[0], P[1], None, 1.8, kind='clash', shake=22, stop=0.05, flash=0.45)
    tk = tl + 0.05
    for k in range(int(1.1 / 0.06)):
        tt = tk + 0.1 + k * 0.06
        for F in (Y, G):
            f = sgn(F.FACE(tt))
            F.X.add(tt, F.X(tk) + (0.03 if k % 2 else -0.03) * (1 if F is Y else -1) * 1.0, 'lin')
    for k in range(6):
        c = (0.7, 0.5, 1.0) if k % 2 else (1.0, 0.9, 0.5)
        sc.add(FXM.Ring(tk + 0.1 + k * 0.18, 0.0, 1.6, 0.2, 2.6, c, dur=0.7, width=0.07))
        sc.add(FXM.Ring(tk + 0.1 + k * 0.18, 0.0, 0.0, 0.3, 4.5, c, dur=0.9, width=0.07, flat=True, layer='back'))
    sc.add(FXM.Particles(tk, 0.0, 1.6, n=120, speed=(2, 8), life=(0.4, 1.2), size=(0.012, 0.03), gravity=4, drag=0.8,
                         color=(1.0, 0.95, 0.75), color2=(0.7, 0.5, 1.0), shape='spark', seed=88, delay_spread=1.0))
    sc.event(tk, 'charge', 1.0, 0.0)
    # shockwave hurls them apart
    tsw = tk + 1.35
    ch.impact(tsw, 0.0, 1.6, None, 2.6, kind='boom', shake=40, stop=0.06, flash=0.7)
    sc.slowmo(tsw - 0.02, tsw + 0.5, 0.25, ri=0.02, ro=0.25)
    for F in (Y, G):
        begin(F, tsw)
        s_ = 1 if F is Y and sy > 0 or (F is G and sy < 0) else -1
        F.X.add(tsw + 0.7, (1.0 * s_) + 4.2 * s_, 'out')
        F.LEAN.add(tsw + 0.2, -0.35, 'out')
        F.LEAN.add(tsw + 1.0, 0.10, 'smooth')
        F.WANG.add(tsw + 0.3, 0.9, 'smooth')
        set_guard(F, tsw + 0.4, 0.6, 'blade', 0.12, 0.78)
    return tsw + 1.3


def act3_solar(sc, ch, t):
    """III-2: Yang's solar slash; Yin deflects it and it slices the mountain."""
    Y, G = ch.Y, ch.G
    _face_each(ch, t)
    dirn = 1 if Y.X(t) > G.X(t) else -1
    tS = t + 0.8
    begin(G, t)
    G.WANG.add(tS - 0.45, 2.7, 'smooth')
    G.WANG.add(tS, -0.5, 'in')
    G.WANG.add(tS + 0.4, 0.6, 'smooth')
    hand_key(G, 0, tS - 0.45, 'body', 0.10, 1.65, 'smooth')
    hand_key(G, 1, tS - 0.45, 'body', 0.02, 1.55, 'smooth')
    hand_key(G, 0, tS, 'body', 0.62, 0.55, 'in')
    hand_key(G, 1, tS, 'body', 0.50, 0.50, 'in')
    G.H.add(tS - 0.45, 1.05, 'smooth')
    G.H.add(tS, 0.72, 'in')
    G.LEAN.add(tS - 0.45, -0.25, 'smooth')
    G.LEAN.add(tS, 0.45, 'in')
    G.AURA.add(tS - 0.4, 3.0, 'smooth')
    sc.event(tS - 0.4, 'charge', 1.0, G.X(tS))
    xg = G.X(tS)
    xy = Y.X(tS)
    dist = abs(xy - xg)
    v = 46.0
    tb = tS + (dist - 0.8) / v
    sc.add(FXM.Crescent(tS, xg + dirn * 0.8, 1.3, dirn * v, 0.0, size=4.2, color=YANG_C, core=WHITE, dur=(dist - 0.8) / v,
                        add=True, thick=0.26, trail=1.0))
    sc.event(tS, 'slice', 1.5, xg)
    # Yin raises the blade and deflects it upward
    begin(Y, tS - 0.3)
    Y.WANG.add(tb - 0.12, 1.55, 'smooth')
    hand_key(Y, 0, tb - 0.12, 'body', 0.45, 1.10, 'out')
    hand_key(Y, 1, tb - 0.12, 'body', 0.35, 1.00, 'out')
    Y.LEAN.add(tb, -0.2, 'out')
    Y.X.add(tb + 0.3, xy + dirn * 0.9, 'out')
    ch.impact(tb, xy - dirn * 0.7, 1.5, None, 2.4, kind='boom', shake=34, stop=0.06, flash=0.6)
    sc.slowmo(tb - 0.02, tb + 0.55, 0.28, ri=0.02, ro=0.25)
    # deflected crescent flies up into the mountains
    sc.add(FXM.Crescent(tb, xy - dirn * 0.7, 1.5, -dirn * 8.0, 30.0, size=3.2, color=YANG_C, core=WHITE, dur=0.6,
                        add=True, thick=0.26, angle=math.atan2(30.0, -dirn * 8.0) - 0.0))
    tcut = tb + 0.45
    for li, ln in ((0, (-40.0, 1.2, 40.0, 6.4)), (1, (-30.0, 0.8, 30.0, 4.6)), (2, (-30.0, 0.3, 30.0, 2.6))):
        sc.env.layers[li].cut = dict(line=ln, w=tcut + 0.06 * li, slide=-260.0, fall=110.0, until=1e9)
    sc.shake(tcut, 28, 1.6, 18.0)
    sc.add(FXM.ScreenFlash(tcut, 0.25, (1.0, 0.95, 0.8), peak=0.5, attack=0.02))
    sc.event(tcut, 'boom', 2.0, 0.0)
    sc.event(tcut + 0.1, 'shatter', 1.5, 0.0)
    for k in range(6):
        sc.add(FXM.Particles(tcut + 0.1 * k, -6 + 3.0 * k, 5.5, n=26, speed=(0.5, 3.5), life=(1.0, 2.6), size=(0.08, 0.30),
                             gravity=7.0, drag=0.2, color=(0.35, 0.32, 0.38), shape='rock', seed=k + 200, jitter=3.0))
        sc.add(FXM.Particles(tcut + 0.1 * k, -6 + 3.0 * k, 4.5, n=16, speed=(0.3, 2.0), life=(1.5, 3.2), size=(0.35, 0.7),
                             gravity=-0.2, drag=0.6, color=(0.75, 0.68, 0.66), shape='dust', seed=k + 210, jitter=3.0,
                             add=False, alpha=0.6))
    return tcut + 1.6


def act3_tide(sc, ch, t):
    """III-3: Yin lifts the lake into a wave; gravity fails; the sky splits."""
    Y, G = ch.Y, ch.G
    _face_each(ch, t)
    dirn = 1 if Y.X(t) > G.X(t) else -1      # Yin's side
    tT = t + 0.5
    begin(Y, t)
    Y.WANG.add(tT - 0.3, 2.4, 'smooth')
    hand_key(Y, 0, tT - 0.3, 'body', 0.10, 1.70, 'smooth')
    hand_key(Y, 1, tT - 0.3, 'body', 0.02, 1.60, 'smooth')
    Y.WANG.add(tT, -1.5, 'in')
    hand_key(Y, 0, tT, 'body', 0.35, 0.05, 'in')
    hand_key(Y, 1, tT, 'body', 0.28, 0.10, 'in')
    Y.H.add(tT - 0.3, 1.0, 'smooth')
    Y.H.add(tT, 0.68, 'in')
    Y.LEAN.add(tT, 0.5, 'in')
    Y.AURA.add(tT, 3.4, 'out')
    sc.event(tT - 0.3, 'charge', 1.0, Y.X(tT))
    xt = Y.X(tT) + dirn * 0.9
    ch.impact(tT, xt, 0.1, Y, 2.4, kind='boom', shake=36, stop=0.05, flash=0.5)
    for k, r in enumerate((6, 12, 20)):
        sc.add(FXM.Ring(tT + 0.1 * k, Y.X(tT), 0.0, 0.3, r, (0.6, 0.4, 1.0), dur=1.8, width=0.14, flat=True, layer='back'))
    sc.palette.add(tT, 'night', 2.0)
    sc.envx['split'].add(tT, 0.0, 'lin')
    sc.envx['split'].add(tT + 3.5, 1.0, 'smooth')
    sc.envx['cloud'].add(tT, 1.0, 'lin')
    sc.envx['cloud'].add(tT + 3.0, 0.2, 'smooth')
    # wave
    sc.add(FXM.Wave(tT + 0.1, Y.X(tT) + dirn * 6.0, -dirn, height=9.5, length=7.5, dur=4.6, speed=4.4))
    sc.event(tT + 0.2, 'boom', 1.6, Y.X(tT))
    tw = tT + 2.45
    # Yang slashes the wave apart
    begin(G, tT + 1.0)
    dg = -dirn
    G.WANG.add(tw - 0.35, 2.3, 'smooth')
    hand_key(G, 0, tw - 0.35, 'body', 0.10, 1.60, 'smooth')
    hand_key(G, 1, tw - 0.35, 'body', 0.02, 1.50, 'smooth')
    G.WANG.add(tw, -0.3, 'in')
    hand_key(G, 0, tw, 'body', 0.62, 0.60, 'in')
    hand_key(G, 1, tw, 'body', 0.50, 0.55, 'in')
    G.LEAN.add(tw, 0.4, 'in')
    G.H.add(tw - 0.35, 1.0, 'smooth')
    G.H.add(tw, 0.72, 'in')
    xg = G.X(tw)
    sc.add(FXM.Crescent(tw, xg - dg * -0.8, 1.6, -dg * 34.0 * -1 if False else (dirn * 34.0), 0.0, size=4.5, color=YANG_C, core=WHITE, dur=0.55,
                        add=True, thick=0.26))
    sc.event(tw, 'slice', 1.5, xg)
    tx = tw + 0.16
    sc.add(FXM.Flash(tx, xg + dirn * 4.2, 3.0, 6.0, (1, 1, 1), dur=0.5))
    sc.add(FXM.ScreenFlash(tx, 0.3, (1, 1, 1), peak=0.65, attack=0.02))
    sc.shake(tx, 30, 1.0)
    # gravity fails: everything rises
    sc.add(FXM.Particles(tx, xg + dirn * 3.0, 0.3, n=380, speed=(0.3, 2.4), angle=pi / 2, spread=2.8, life=(3.0, 6.0),
                         size=(0.015, 0.05), gravity=-1.4, drag=0.5, color=(0.85, 0.95, 1.0), shape='drop', seed=120,
                         jitter=14.0, delay_spread=1.0))
    sc.add(FXM.Particles(tx, xg + dirn * 3.0, 0.3, n=46, speed=(0.3, 1.6), angle=pi / 2, spread=2.8, life=(4.0, 7.0),
                         size=(0.10, 0.34), gravity=-0.9, drag=0.4, color=(0.30, 0.28, 0.34), shape='rock', seed=121,
                         jitter=14.0, delay_spread=1.2))
    sc.slowmo(tx, tx + 2.6, 0.45, ri=0.3, ro=0.4)
    for F in (Y, G):
        begin(F, tx)
        F.H.add(tx + 1.4, 2.6, 'smooth')
        F.LEAN.add(tx + 1.0, 0.0, 'smooth')
        F.WANG.add(tx + 1.0, 0.7, 'smooth')
        set_guard(F, tx + 0.6, 0.8, 'blade', 0.05, 2.6)
    return tx + 2.3


def act3_float(sc, ch, t):
    """III-4: zero-gravity blade duel under the split sky; ends in a huge lock and the blades explode."""
    Y, G = ch.Y, ch.G
    _face_each(ch, t)
    sy = 1 if Y.X(t) > G.X(t) else -1
    dts = [0.0, 0.34, 0.62, 0.86, 1.08, 1.28, 1.46]
    Ps = [(0.0, 3.6), (-0.3, 4.4), (0.4, 3.2), (-0.2, 5.0), (0.3, 4.2), (0.0, 3.4), (0.0, 4.4)]
    angs = [(1.0, 0.6), (0.1, 1.0), (1.5, 0.0), (-0.4, 1.2), (1.2, 0.2), (0.4, 0.4), (0.9, 0.9)]
    t0 = t + 0.5
    for F in (Y, G):
        begin(F, t)
        F.X.add(t0 - 0.1, (sy * 1.1) if F is Y else (-sy * 1.1), 'smooth')
        F.H.add(t0 - 0.1, 3.5, 'smooth')
    steps = []
    for n in range(len(dts)):
        h = Ps[n][1] - 0.5
        steps.append(dict(t=t0 + dts[n], P=Ps[n], who=Y if n % 2 == 0 else G, kind='sword', ang=angs[n],
                          power=1.1 + 0.06 * n, shake=10, h=(h, h), sideY=sy if n < 4 else -sy))
    ch.clash_seq(steps, mode='sword', blade_d=0.60)
    for n, st in enumerate(steps):
        sc.add(FXM.Particles(st['t'], st['P'][0], st['P'][1], n=50, speed=(3, 9), life=(0.3, 0.9), size=(0.012, 0.035),
                             gravity=-1.0, drag=1.0, color=(1.0, 0.95, 0.75), color2=(0.7, 0.5, 1.0), shape='spark', seed=n + 300))
        sc.event(st['t'], 'clash', 1.2, st['P'][0])
    # epic lock
    tl = t0 + dts[-1] + 0.4
    P = (0.0, 4.2)
    for F in (Y, G):
        f = sgn(F.FACE(tl))
        a_ = 0.9
        dx, dy = f * math.cos(a_), math.sin(a_)
        hp = (P[0] - dx * 0.6, P[1] - dy * 0.6)
        begin(F, tl - 0.12)
        F.WANG.add(tl, a_, 'in')
        F.hand[0].add(tl, 'world', hp[0], hp[1], 1.0, 'in')
        F.hand[1].add(tl, 'world', hp[0] - dx * 0.12, hp[1] - dy * 0.12 - 0.03, 1.0, 'in')
        F.X.add(tl, hp[0] - f * 0.5, 'in')
        F.H.add(tl, 3.7, 'in')
        F.LEAN.add(tl, 0.30, 'in')
    sc.add(FXM.Orb(tl, tl + 1.7, P, 0.3, 1.5, (1.0, 0.9, 0.55), core=WHITE, motes=30, seed=8))
    sc.add(FXM.Orb(tl + 0.1, tl + 1.7, (P[0], P[1]), 0.3, 1.2, (0.55, 0.35, 1.0), dark=True, motes=30, seed=9))
    ch.impact(tl, P[0], P[1], None, 2.0, kind='clash', shake=26, stop=0.05, flash=0.5)
    for k in range(7):
        c = (0.7, 0.5, 1.0) if k % 2 else (1.0, 0.9, 0.5)
        sc.add(FXM.Ring(tl + 0.1 + k * 0.2, P[0], P[1], 0.3, 3.4 + 0.2 * k, c, dur=0.8, width=0.08))
    sc.event(tl, 'charge', 1.2, 0.0)
    # the blades explode
    tb = tl + 1.75
    ch.impact(tb, P[0], P[1], None, 3.0, kind='boom', shake=44, stop=0.06, flash=0.8)
    for F in (Y, G):
        F.WL.add(tb - 0.02, 1.0, 'lin')
        F.WL.add(tb + 0.15, 0.0, 'out')
        begin(F, tb)
        s_ = 1 if (F is Y) == (sy > 0) else -1
        F.X.add(tb + 0.8, s_ * 6.0, 'out')
        F.H.add(tb + 0.5, 3.0, 'smooth')
        F.LEAN.add(tb + 0.2, -0.4, 'out')
        F.LEAN.add(tb + 1.0, 0.05, 'smooth')
        set_guard(F, tb + 0.5, 0.6, 'open', 0.05, 3.0)
    sc.slowmo(tb - 0.02, tb + 0.7, 0.25, ri=0.02, ro=0.3)
    return tb + 1.2


def act3_charge(sc, ch, t):
    """III-5: they drift to opposite ends and gather their final energy."""
    Y, G = ch.Y, ch.G
    xs = {Y: 8.0 * (1 if Y.X(t) > G.X(t) else -1)}
    xs[G] = -xs[Y]
    tc = t + 0.5
    for F in (Y, G):
        begin(F, t)
        F.X.add(tc + 1.4, xs[F], 'smooth')
        F.H.add(tc + 1.4, 3.2, 'smooth')
        F.STANCE.add(tc + 1.4, 0.3, 'smooth')
        hand_key(F, 0, tc + 1.2, 'body', 0.30, 1.60, 'smooth')
        hand_key(F, 1, tc + 1.2, 'body', 0.05, 0.40, 'smooth')
        F.LEAN.add(tc + 1.2, -0.05, 'smooth')
        F.AURA.add(tc + 2.5, 3.6, 'smooth')
        F.EYE.add(tc + 2.5, 2.4, 'smooth')
    face(Y, tc + 1.0, -sgn(xs[Y]), 0.2)
    face(G, tc + 1.0, -sgn(xs[G]), 0.2)
    tg = tc + 1.3
    sc.add(FXM.Orb(tg, tg + 3.2, lambda R: (R.frames[R.i]['Y']['arms'][0][2][0], R.frames[R.i]['Y']['arms'][0][2][1] + 0.3),
                   0.15, 1.0, (0.6, 0.35, 1.0), dark=True, motes=30, collapse=True, seed=41))
    sc.add(FXM.Orb(tg, tg + 3.2, lambda R: (R.frames[R.i]['G']['arms'][0][2][0], R.frames[R.i]['G']['arms'][0][2][1] + 0.3),
                   0.15, 1.0, (1.0, 0.88, 0.45), core=WHITE, motes=30, collapse=True, seed=42))
    sc.add(FXM.Wisps(tg - 0.5, tg + 3.6, 'Y', (0.55, 0.35, 1.0), n=34, up=2.0, size=0.07, intensity=1.3, seed=5))
    sc.add(FXM.Wisps(tg - 0.5, tg + 3.6, 'G', (1.0, 0.85, 0.4), n=34, up=2.0, size=0.07, intensity=1.3, seed=6))
    sc.event(tg, 'charge', 1.5, 0.0, )
    sc.events[-1]['dur'] = 3.2
    sc.envx['vignette'].add(tg, 0.55, 'smooth')
    sc.envx['vignette'].add(tg + 3.0, 0.85, 'smooth')
    return tg + 3.3


def finale(sc, ch, t):
    """Final clash, white-out, dissolve, rebirth."""
    Y, G = ch.Y, ch.G
    tf = t
    tcol = tf + 0.85
    for F in (Y, G):
        begin(F, tf - 0.1)
        s_ = 1 if F is Y and Y.X(tf) > 0 or (F is G and G.X(tf) > 0) else -1
        F.X.add(tcol, 0.95 * s_, 'in')
        F.H.add(tf + 0.15, 2.6, 'smooth')
        F.H.add(tcol, 2.9, 'smooth')
        F.LEAN.add(tf + 0.15, 0.55, 'smooth')
        hand_key(F, 0, tcol, 'body', 0.55, 0.55, 'in')
    sc.add(FXM.AfterImage(tf, tcol + 0.1, 'Y', sc.styles['Y'], (0.55, 0.35, 1.0), delays=(2, 4, 6, 8, 10, 12), alpha=0.45))
    sc.add(FXM.AfterImage(tf, tcol + 0.1, 'G', sc.styles['G'], (1.0, 0.85, 0.4), delays=(2, 4, 6, 8, 10, 12), alpha=0.45))
    sc.slowmo(tf, tcol + 0.1, 0.42, ri=0.15, ro=0.05)
    sc.event(tf, 'whoosh', 2.0, 0.0)
    # collision
    sc.add(FXM.Flash(tcol, 0.0, 2.9, 14.0, (1, 1, 1), dur=1.4, power=1.2))
    for k, r in enumerate((5, 10, 18, 28)):
        sc.add(FXM.Ring(tcol + 0.06 * k, 0.0, 2.9, 0.3, r, (1, 1, 1) if k % 2 == 0 else (0.7, 0.5, 1.0), dur=2.0, width=0.2))
        sc.add(FXM.Ring(tcol + 0.06 * k, 0.0, 0.0, 0.3, r * 1.4, (1, 1, 1), dur=2.0, width=0.15, flat=True, layer='back'))
    sc.add(FXM.ScreenFlash(tcol - 0.02, 2.3, (1, 1, 1), peak=1.0, attack=0.05))
    sc.shake(tcol, 60, 1.2, 22)
    sc.event(tcol, 'boom', 2.0, 0.0)
    sc.event(tcol + 0.05, 'thunder', 2.0, 0.0)
    # the mountains and lake reset while everything is white
    tw = tcol + 0.5
    for li in (0, 1, 2):
        sc.env.layers[li].cut = dict(sc.env.layers[li].cut, until=tw)
    sc.palette.add(tw, 'dawn', 3.5)
    sc.envx['split'].add(tw - 0.5, 1.0, 'lin')
    sc.envx['split'].add(tw + 1.5, 0.0, 'smooth')
    sc.envx['cloud'].add(tw + 1.0, 1.0, 'smooth')
    sc.envx['vignette'].add(tw, 0.85, 'lin')
    sc.envx['vignette'].add(tw + 3.0, 0.45, 'smooth')
    # both float, side by side, lying on the air, and dissolve into light and shadow
    tl = tw + 1.0
    for F, x in ((Y, -1.5), (G, 1.5)):
        begin(F, tcol)
        F.X.add(tl, x, 'out')
        set_guard(F, tl, 0.6, 'relax', -1.45, 2.4)
        F.BEND.add(tl + 0.6, -0.25, 'smooth')
        F.H.add(tl + 4.0, 3.2, 'smooth')
        F.LEAN.add(tl + 4.0, -1.55, 'smooth')
        F.AURA.add(tl, 2.0, 'smooth')
        F.AURA.add(tl + 4.0, 0.0, 'smooth')
        F.EYE.add(tl + 1.0, 0.0, 'smooth')
        F.ALPHA.add(tl + 1.2, 1.0, 'lin')
        F.ALPHA.add(tl + 4.2, 0.0, 'smooth')
        F.WL.add(tcol, 0.0, 'lin')
    sc.add(FXM.Wisps(tl, tl + 4.4, 'Y', (0.55, 0.35, 1.0), n=40, up=2.6, size=0.06, intensity=1.4, seed=7))
    sc.add(FXM.Wisps(tl, tl + 4.4, 'G', (1.0, 0.9, 0.5), n=40, up=2.6, size=0.06, intensity=1.4, seed=8))
    for k in range(14):
        tt = tl + 1.2 + k * 0.22
        sc.add(FXM.Particles(tt, -1.5, 2.6, n=26, speed=(0.5, 2.6), angle=pi / 2, spread=2.6, life=(1.4, 2.4),
                             size=(0.03, 0.09), gravity=-1.2, drag=0.8, color=(0.10, 0.05, 0.22), shape='ink', seed=400 + k, add=False,
                             jitter=1.2, alpha=0.9))
        sc.add(FXM.Particles(tt, 1.5, 2.6, n=26, speed=(0.5, 2.6), angle=pi / 2, spread=2.6, life=(1.4, 2.4),
                             size=(0.03, 0.09), gravity=-1.2, drag=0.8, color=(1.0, 0.95, 0.75), shape='ember', seed=500 + k,
                             jitter=1.2))
    # the taiji is born from the particles
    tt0 = tl + 1.8
    sc.add(FXM.Taiji(tt0, tt0 + 7.0, (0.0, 6.2), 1.7, alpha=1.0, spin=0.9, layer='front', fade=(1.8, 1.8), gleam=0.5))
    sc.event(tt0, 'bell', 1.4, 0.0)
    sc.event(tt0 + 0.05, 'gong', 1.0, 0.0)
    sc.add(FXM.Sprout(tl + 2.6, 0.0, dur=7.0, size=1.0))
    for k in range(8):
        sc.add(FXM.Leaf(tl + 2.0 + k * 0.7, -5 + k * 1.4, 5.0 + (k % 3), vy=0.5 + 0.03 * k, sway=0.6, phase=k * 1.3,
                        color=(1.0, 0.8, 0.85), size=0.035))
    ch.aux['t_finale_white'] = tcol
    ch.aux['t_dawn'] = tw
    ch.aux['t_taiji'] = tt0
    return tl + 4.4


def build(sc):
    ch = Ch(sc)
    ch.aux = {}
    sc.aux = ch.aux
    prologue(sc, ch)
    act1_clash(sc, ch)
    act1_flykick(sc, ch)
    act1_sweep(sc, ch)
    act1_chase(sc, ch)
    t = act1_skid_lock(sc, ch)
    t = act1_flurry(sc, ch, t + 0.2)
    t = act1_aerial(sc, ch, t + 0.1)
    ch.aux['t_act1_end'] = t
    t = stand_off2(sc, ch, t)
    ch.aux['t_act2'] = t
    t = act2_shadow(sc, ch, t)
    ch.aux['t_act2_next'] = t
    t, xc = act2_sky(sc, ch, t)
    ch.aux['t_storm'] = t
    t = act2_storm(sc, ch, t, xc)
    ch.aux['t_weapons'] = t
    weapons_on(sc, ch, t)
    t = act3_duel(sc, ch, t + 0.6)
    ch.aux['t_solar'] = t
    t = act3_solar(sc, ch, t)
    ch.aux['t_tide'] = t
    t = act3_tide(sc, ch, t)
    ch.aux['t_float'] = t
    t = act3_float(sc, ch, t)
    ch.aux['t_charge'] = t
    t = act3_charge(sc, ch, t)
    ch.aux['t_finale'] = t
    t = finale(sc, ch, t)
    ch.aux['t_end'] = t
    return ch


def cameras(sc):
    A = sc.aux
    C = sc.cam
    C.shots = []
    C.shot(-5, 'auto', padx=2.6, pady=2.6, zmax=330, om=4.5)
    # prologue: wide push, then close cuts on walking feet, then the two-shot
    C.shot(0.0, 'fixed', cx=0.0, cy=1.9, k=100, cx1=0.0, cy1=1.7, k1=118, dur=5.5, cut=True)
    C.shot(5.5, 'follow', who=0, dx=1.5, dy=-0.6, ymin=0.95, k=280, cut=True, om=6.0)
    C.shot(7.4, 'follow', who=1, dx=-1.5, dy=-0.6, ymin=0.95, k=280, cut=True, om=6.0)
    C.shot(9.1, 'auto', padx=3.6, pady=3.0, zmax=250, cut=True, om=3.0)
    C.shot(10.7, 'fixed', cx=-2.15, cy=1.5, k=620, cx1=-2.22, cy1=1.52, k1=680, dur=0.9, cut=True)
    C.shot(11.6, 'fixed', cx=2.15, cy=1.5, k=620, cx1=2.22, cy1=1.52, k1=680, dur=0.9, cut=True)
    C.shot(12.5, 'auto', padx=3.0, pady=2.6, zmax=220, cut=True, om=6.0)
    C.shot(12.95, 'fixed', cx=0.0, cy=1.35, k=260, cx1=0.0, cy1=1.35, k1=300, dur=1.0, cut=True)
    C.shot(13.8, 'auto', padx=2.6, pady=2.6, zmax=330, om=3.5)
    C.shot(A['t_exch0'] - 0.5, 'fixed', cx=0.0, cy=2.3, k=112, cx1=0.0, cy1=2.2, k1=122, dur=A['t_exch1'] - A['t_exch0'] + 1.2, cut=True)
    C.shot(A['t_exch1'] + 0.8, 'auto', padx=2.8, pady=2.8, zmax=300, om=4.0)
    C.shot(A['t_act2_next'] + 1.2, 'auto', padx=2.6, pady=3.2, zmax=250, om=5.0)
    C.shot(A['t_tu'] - 0.2, 'auto', padx=4.0, pady=3.2, zmax=210, om=8.0)
    C.shot(A['t_sky0'], 'auto', padx=3.4, pady=3.2, zmax=250, om=9.0, ymin=3.0)
    C.shot(A['t_tp'] + 0.02, 'fixed', cx=A['plunge_x'], cy=4.6, k=68, cx1=A['plunge_x'], cy1=4.2, k1=72, dur=A['t_storm'] - A['t_tp'] - 0.2, cut=True)
    C.shot(A['t_storm'] - 0.2, 'auto', padx=6.0, pady=3.2, zmax=170, om=3.0)
    C.shot(A['t_storm'] + 4.4, 'fixed', cx=0.0, cy=2.1, k=125, cx1=0.0, cy1=2.0, k1=135, dur=2.6, cut=True)
    C.shot(A['t_weapons'] - 0.3, 'auto', padx=3.2, pady=2.6, zmax=260, om=4.0, cut=True)
    C.shot(A['t_weapons'] + 0.8, 'auto', padx=2.4, pady=2.4, zmax=340, om=5.5)
    C.shot(A['t_solar'] + 0.4, 'auto', padx=5.0, pady=3.0, zmax=170, om=4.0)
    C.shot(A['t_solar'] + 1.65, 'fixed', cx=0.0, cy=3.6, k=72, cx1=0.0, cy1=3.4, k1=78, dur=2.4, cut=True)
    C.shot(A['t_tide'] - 0.4, 'auto', padx=5.5, pady=3.5, zmax=150, om=3.0, cut=True)
    C.shot(A['t_tide'] + 1.2, 'fixed', cx=0.0, cy=4.6, k=78, cx1=0.0, cy1=4.2, k1=82, dur=4.4, roll=0.0, roll1=0.04, cut=True)
    C.shot(A['t_float'], 'auto', padx=2.8, pady=3.0, zmax=230, om=3.0, roll=0.05)
    C.shot(A['t_float'] + 2.4, 'auto', padx=2.6, pady=3.0, zmax=250, om=3.0, roll=-0.06)
    C.shot(A['t_charge'], 'fixed', cx=0.0, cy=3.8, k=80, dur=1.0, cut=True)
    C.shot(A['t_charge'] + 1.0, 'fixed', cx=6.9, cy=3.8, k=240, cx1=7.1, cy1=3.9, k1=270, dur=1.4, cut=True)
    C.shot(A['t_charge'] + 2.4, 'fixed', cx=-6.9, cy=3.8, k=240, cx1=-7.1, cy1=3.9, k1=270, dur=1.4, cut=True)
    C.shot(A['t_charge'] + 3.8, 'fixed', cx=0.0, cy=3.6, k=62, cx1=0.0, cy1=3.5, k1=78, dur=1.5, cut=True)
    C.shot(A['t_finale_white'] - 0.6, 'fixed', cx=0.0, cy=3.2, k=120, cx1=0.0, cy1=3.1, k1=170, dur=0.7, cut=True)
    C.shot(A['t_finale_white'] + 0.2, 'fixed', cx=0.0, cy=3.4, k=95, cx1=0.0, cy1=3.6, k1=105, dur=2.0, cut=True)
    C.shot(A['t_dawn'] + 1.6, 'fixed', cx=0.0, cy=3.6, k=80, cx1=0.0, cy1=3.2, k1=92, dur=19.0, cut=False)


def finish(sc, total=120.0):
    """Global tracks, titles and fade; called after build()."""
    A = sc.aux
    tw = A['t_dawn']
    sc.envx['fade'].add(0.0, 0.0, 'lin')
    sc.envx['fade'].add(1.6, 1.0, 'smooth')
    sc.envx['bloom'].add(0.0, 0.42, 'lin')
    T = sc.warp_hint(total)      # world time of the video end
    sc.envx['fade'].add(T - 2.4, 1.0, 'lin')
    sc.envx['fade'].add(T - 0.05, 0.0, 'smooth')
    sc.add(FXM.Title(0.9, 5.6, 'YIN  \u00b7  YANG', size=118, y=0.44, color=(0.96, 0.94, 0.9), spacing=0.32, fade=(1.4, 1.4),
                     sub='B L A C K   V S   W H I T E', subsize=30))
    t1 = tw + 8.0
    sc.add(FXM.Title(t1, t1 + 5.2, 'TWO HALVES.  ONE WHOLE.', size=70, y=0.80, color=(1.0, 0.98, 0.94), spacing=0.22, fade=(1.4, 1.4), glow=False))
    t2 = T - 8.2
    sc.add(FXM.Title(t2, T - 1.0, 'YIN  \u00b7  YANG', size=104, y=0.46, color=(0.14, 0.14, 0.2), spacing=0.32, fade=(1.6, 1.6),
                     sub='\u9670   \u967d', subsize=44, glow=False, font='WenQuanYi Zen Hei'))
