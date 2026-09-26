"""The full 2-minute fight, authored in story time (seconds before slow-motion remapping)."""
import math

import numpy as np

from . import effects as E
from .config import YIN, YANG, NFRAMES, FPS
from .moves import Fight, WHITE
from .rig import P, POSES
from .story import Actor, Story

VIOLET = YIN['energy']
GOLD = YANG['energy']
DUSTC = (0.55, 0.47, 0.55)
ROCK = (0.2, 0.17, 0.24)


def build_story():
    s = Story()
    yin = s.add(Actor('yin', YIN, x=-320, face=1.0, pose='land3'))
    yang = s.add(Actor('yang', YANG, x=320, face=-1.0, pose='land3'))
    F = Fight(s, yin, yang)
    intro(s, F, yin, yang)
    act1(s, F, yin, yang)
    tl = act2(s, F, yin, yang)
    A = act3(s, F, yin, yang, tl)
    FC = act4(s, F, yin, yang, A)
    finale(s, F, yin, yang, FC)
    S, _ = s.speed.build(NFRAMES, FPS)
    tb0 = float(S[int(117.6 * FPS)])
    tb1 = float(S[int(119.75 * FPS)])
    s.fx.key(tb0, black=0.0)
    s.fx.key(tb1, black=(1.0, 'io'))
    F.sfx(tb0, 'fade', amp=1.0)
    return s


# ---------------------------------------------------------------------------
def intro(s, F, yin, yang):
    fx, cam = s.fx, s.cam
    fx.key(0, scene=0.0, letterbox=1.0, vign=0.7, wind=0.15)
    fx.key(3.9, scene=(0.0, 'lin'))
    fx.key(4.75, scene=(1.0, 'io'))
    fx.key(6.8, letterbox=1.0)
    fx.key(8.0, letterbox=0.0, vign=0.5)
    # the symbol
    fx.key(0.0, yy=0.0, yyr=150.0, yyx=0.0, yyy=950.0, yyrot=0.0, yysep=0.0)
    fx.key(1.4, yy=1.0)
    fx.key(3.15, yyrot=(620.0, 'in'), yyr=(150.0, 'lin'))
    fx.key(3.5, yyr=(185.0, 'out'), yyrot=(720.0, 'out'))
    fx.key(3.6, yy=(1.0, 'lin'))
    fx.key(3.62, yy=(0.0, 'lin'), yyr=(30.0, 'in'))
    fx.key(3.55, white=0.0)
    fx.key(3.62, white=(0.85, 'lin'))
    fx.key(3.95, white=(0.0, 'out'))
    s.fxadd(E.Text(0.7, 3.1, 'YIN   VS   YANG', size=58, y=0.83, col=(0.92, 0.9, 0.98),
                   glow=(0.6, 0.4, 1.0), spacing=0.25))
    s.fxadd(E.Flash(3.6, (0, 950), WHITE, size=420, life=0.5, rays=10))
    s.fxadd(E.Ring(3.6, (0, 950), WHITE, r0=40, r1=900, life=0.9, width=10))
    F.sfx(0.2, 'drone_in', amp=0.8)
    F.sfx(3.6, 'boom', amp=0.9)
    F.sfx(3.64, 'whoosh_big', amp=0.8)
    # orbs: separate, then dive to the plateau
    for a, sx in ((yin, -1), (yang, 1)):
        col, core = a.pal['energy'], a.pal['core'] if a is yin else WHITE
        s.fxadd(E.Orb(3.6, 3.95, (sx * 20, 950), (sx * 280, 1030), col, core, r=26, wobble=-sx * 40))
        s.fxadd(E.Orb(3.95, 4.62, (sx * 280, 1030), (sx * 320, 30), col, core, r=26, ease=1.2))
        at = (sx * 320, 0)
        s.fxadd(E.Flash(4.62, at, col, size=260, life=0.45, rays=9))
        s.fxadd(E.Ring(4.62, at, col, r0=10, r1=520, life=0.7, width=10, squash=0.18))
        s.fxadd(E.Ring(4.62, (sx * 320, 60), WHITE, r0=10, r1=260, life=0.4, width=6))
        s.fxadd(E.Dust(4.62, at, n=22, spread=260, col=DUSTC, life=2.4, size=46, speed=520, alpha=0.55))
        s.fxadd(E.Debris(4.62, at, n=16, speed=720, size=9, col=ROCK, life=2.0))
        s.fxadd(E.Cracks(4.62, at, col, n=6, length=200, life=6.0, width=4))
        a.key(0, vis=0.0, eye=0.0, idle=0.0, g=1.0)
        a.key(4.6, vis=(0.0, 'hold'))
        a.key(4.62, 'land3', vis=(1.0, 'hold'))
        a.key(5.5, 'land3')
        a.key(6.9, 'stand', 'io')
        a.key(7.2, idle=1.0)
    F.shake(4.62, 0.9)
    F.sfx(4.62, 'boom_big', amp=1.0)
    F.sfx(4.64, 'debris', amp=0.7)
    s.speed.hitstop(4.62, frames=6)
    # camera: locked on symbol, then follows the orbs down
    cam.key(0, w=1.0, x=0.0, y=950.0, zoom=1.35)
    cam.key(3.4, zoom=(1.5, 'io'))
    cam.key(3.62, zoom=(1.2, 'out'), y=(950.0, 'lin'))
    cam.key(4.0, y=(930.0, 'lin'))
    cam.key(4.7, y=(230.0, 'in'), zoom=(1.45, 'io'))
    cam.key(6.5, y=(240.0, 'io'), zoom=(1.55, 'io'))

    # --- standoff ---------------------------------------------------------
    fx.key(6.5, wind=0.2)
    fx.key(8.0, wind=(0.55, 'io'))
    # close-up Yin
    cam.key(7.9, x=(0.0, 'hold'))
    cam.key(7.95, x=(-300.0, 'hold'), y=(yin.joint(7.95, 'head')[1] + 5, 'hold'), zoom=(4.2, 'hold'))
    cam.key(9.05, x=(-285.0, 'lin'), zoom=(4.6, 'lin'))
    yin.key(8.3, eye=0.0)
    yin.key(8.45, eye=(2.2, 'out'))
    yin.key(9.0, eye=(1.0, 'io'))
    F.sfx(8.4, 'eye', amp=0.7)
    # close-up Yang
    cam.key(9.1, x=(300.0, 'hold'), zoom=(4.2, 'hold'))
    cam.key(10.25, x=(285.0, 'lin'), zoom=(4.6, 'lin'))
    yang.key(9.45, eye=0.0)
    yang.key(9.6, eye=(2.2, 'out'))
    yang.key(10.2, eye=(1.0, 'io'))
    F.sfx(9.55, 'eye', amp=0.7)
    # wide
    cam.key(10.3, x=(0.0, 'hold'), y=(260.0, 'hold'), zoom=(1.2, 'hold'))
    cam.key(12.2, zoom=(1.45, 'io'), y=(240.0, 'io'))
    cam.key(12.4, w=(1.0, 'lin'))
    cam.key(13.0, w=(0.0, 'io'))
    for a in (yin, yang):
        a.key(10.7, 'stand')
        a.key(11.3, 'stance_low', 'io')
        a.key(12.35, 'stance_low', 'lin')
    F.sfx(10.9, 'cloth', amp=0.5)
    # pebbles lift as tension rises, then drop
    rng = np.random.default_rng(3)
    for i in range(9):
        x = rng.uniform(-520, 520)
        sz = rng.uniform(5, 11)
        top = rng.uniform(40, 150)
        t0 = 10.8 + rng.uniform(0, 0.8)
        s.fxadd(E.Boulder([(t0, x, sz * 0.5, 0), (12.45, x + rng.uniform(-10, 10), top, rng.uniform(-40, 40), 'io'),
                           (12.75, x, sz * 0.5, 0, 'in2')], size=sz, seed=i))
    F.sfx(10.9, 'rumble', amp=0.5, dur=1.7)


# ---------------------------------------------------------------------------
def act1(s, F, yin, yang):
    fx, cam = s.fx, s.cam
    # dash in
    for a, x1 in ((yin, -95), (yang, 95)):
        a.key(12.45, 'stance_low', idle=0.0)
        a.key(12.55, 'dash', 'out', x=(a.v(12.45, 'x'), 'lin'))
        a.key(12.85, 'dash2', 'lin', x=(x1, 'in2'), ghost=(0.35, 'lin'))
        a.key(13.0, ghost=(0.0, 'lin'))
        s.fxadd(E.Dust(12.5, (a.v(12.45, 'x'), 0), n=10, spread=60, life=1.0, size=26,
                       dirx=-a.v(12.45, 'face') * 300, alpha=0.4))
    F.sfx(12.5, 'dash', amp=0.8)
    # exchange 1
    F.strike(13.0, yin, yang, 'jab', 'hand_f', 'block_high', 'hand_f', windup='stance', wind_t=0.1,
             kind='block', power=0.7)
    F.strike(13.22, yin, yang, 'cross', 'hand_b', 'block_mid', 'hand_f', windup='jab', wind_t=0.1,
             kind='block', power=0.6)
    # Yang hook, Yin ducks under
    yang.key(13.32, 'windup')
    yang.key(13.47, 'hook', 'in2')
    yang.key(13.62, 'stance', 'io')
    yin.key(13.32, 'stance')
    yin.key(13.44, 'duck', 'snap')
    F.sfx(13.4, 'whoosh', amp=0.6)
    # Yin uppercut from the duck, Yang sways back
    yin.key(13.6, 'uppercut_wind')
    yin.key(13.72, 'uppercut', 'in2')
    yang.key(13.7, 'dodge_back', 'snap')
    F.sfx(13.66, 'whoosh', amp=0.6)
    yin.key(13.9, 'stance', 'io')
    yang.key(13.9, 'stance', 'io')
    # Yang front kick into Yin's guard, Yin slides back
    F.strike(14.08, yang, yin, 'kick_front', 'foot_f', 'block_mid', 'hand_f', windup='kick_front_ch',
             wind_t=0.13, kind='block', power=0.9, recover='stance', rec_t=0.3)
    x = yin.v(14.08, 'x')
    yin.key(14.1, x=(x, 'lin'))
    yin.key(14.45, x=(x - 110, 'out'))
    yin.key(14.6, 'stance', 'io')
    s.fxadd(E.Dust(14.12, (x, 0), n=10, spread=80, life=1.0, size=24, dirx=-250, alpha=0.4))
    F.sfx(14.12, 'skid', amp=0.6)
    for a in (yin, yang):
        a.key(14.65, idle=1.0)
        a.key(14.9, idle=0.0)

    # --- round 2: kicks, spin, sweep, axe --------------------------------
    yin.key(15.0, 'stance', x=(-175.0, 'io'), face=1.0)
    yang.key(15.0, 'stance', x=(55.0, 'io'), face=-1.0)
    F.strike(15.25, yin, yang, 'kick_round', 'foot_b', 'block_high', 'hand_f', windup='kick_round_ch',
             wind_t=0.15, kind='block', power=0.9, rec_t=0.25)
    # Yang spins into a back kick, Yin ducks
    yx = yin.v(15.5, 'x')
    yang.key(15.45, 'stance', x=(yx + 150, 'io'))
    yang.key(15.55, P('stance', lean=25), face=1.0)
    yang.key(15.7, 'back_kick', 'in2')
    yang.key(15.78, 'back_kick')
    yin.key(15.55, 'stance')
    yin.key(15.66, 'duck', 'snap')
    F.sfx(15.62, 'whoosh', amp=0.8)
    # Yin sweeps from the duck; Yang hops over and drops an axe kick onto Yin's guard
    yin.key(15.86, 'sweep', 'out')
    F.sfx(15.8, 'whoosh', amp=0.6)
    yang.key(15.8, 'crouch', face=-1.0)
    yang.key(15.8, y=(0.0, 'lin'))
    yang.key(16.08, 'axe_up', 'out', y=(150.0, 'out2'))
    yin.key(16.05, 'crouch', 'io')
    yin.key(16.26, 'guard_x', 'out')
    tg = F.strike(16.3, yang, yin, 'axe_down', 'foot_f', 'guard_x', 'hand_f', windup=None, kind='block',
                  power=1.1, air=True, recover=None, ease='in2')
    yang.key(16.45, 'crouch', 'out', y=(0.0, 'in2'))
    yang.key(16.62, 'stance')
    yp = yin.v(16.3, 'x')
    s.fxadd(E.Cracks(16.3, (yp, 0), VIOLET, n=5, length=150, life=4.0, width=3.5, seed=41))
    s.fxadd(E.Dust(16.3, (yp, 0), n=16, spread=180, life=1.4, size=30, speed=420, alpha=0.5))
    s.fxadd(E.Debris(16.3, (yp, 0), n=10, speed=520, size=6, col=ROCK, life=1.4))
    F.sfx(16.3, 'crack', amp=0.8)
    # Yin shoves; Yang blocks and backflips away
    yin.key(16.45, 'guard_x')
    F.strike(16.6, yin, yang, 'palm', 'hand_f', 'block_mid', 'hand_f', windup='stance', wind_t=0.12,
             kind='block', power=0.7, rec_t=0.3)
    F.jump(yang, 16.66, 17.22, yang.v(16.6, 'x') + 330, 170, air='tuck', land='crouch', spin=360)
    for a in (yin, yang):
        a.key(17.55, 'stance', idle=(1.0, 'lin'))
        a.key(17.7, idle=0.0)

    # --- round 3: Yang's flurry, knee, elbow; Yin's throw -------------------
    yx = yin.v(17.7, 'x')
    yang.key(17.72, 'dash', 'out', x=(yang.v(17.7, 'x'), 'lin'), ghost=0.0)
    yang.key(17.95, 'dash2', x=(yx + 125, 'in2'), ghost=(0.4, 'lin'))
    yang.key(18.1, ghost=(0.0, 'lin'))
    F.sfx(17.75, 'dash', amp=0.7)
    F.strike(18.0, yang, yin, 'jab', 'hand_f', 'block_high', 'hand_f', windup='stance', wind_t=0.07,
             kind='block', power=0.55, rec_t=0.1, recover=None)
    F.strike(18.14, yang, yin, 'cross', 'hand_b', 'block_mid', 'hand_f', windup='jab', wind_t=0.07,
             kind='block', power=0.55, recover=None)
    F.strike(18.28, yang, yin, 'jab', 'hand_f', 'block_high', 'hand_f', windup='cross', wind_t=0.07,
             kind='block', power=0.6, recover=None)
    F.strike(18.46, yang, yin, 'knee', 'knee_f', 'hit_body', 'chest', windup='stance', wind_t=0.1,
             kind='hit', power=0.9, knock=25, recover='stance', rec_t=0.12, pen=12)
    # elbow drop, caught
    F.strike(18.7, yang, yin, 'elbow_down', 'elb_f', 'catch', 'hand_f', windup='elbow_up', wind_t=0.1,
             kind='block', power=0.6, recover=None, place=False)
    yx = yin.v(18.7, 'x')
    gx = yang.v(18.7, 'x')
    yin.key(18.82, 'throw', 'io')
    yang.key(18.74, x=(gx, 'lin'), y=(0.0, 'lin'), rot=(0.0, 'lin'))
    yang.key(18.98, 'tuck', 'io', x=(yx + 10, 'lin'), y=(150.0, 'out2'), rot=(-160.0, 'lin'))
    yang.key(19.16, 'lie', 'io', x=(yx - 125, 'lin'), y=(0.0, 'in2'), rot=(-270.0, 'out'))
    yang.key(18.74, g=1.0)
    F.sfx(18.8, 'whoosh', amp=0.8)
    s.fxadd(E.Dust(19.16, (yx - 125, 0), n=20, spread=220, life=1.6, size=36, speed=400, alpha=0.55))
    s.fxadd(E.Debris(19.16, (yx - 125, 0), n=8, speed=380, size=6, col=ROCK, life=1.2))
    F.impact(19.16, (yx - 125, 10), yin, kind='hit', power=0.9, ring=False)
    F.sfx(19.16, 'slam', amp=1.0)
    yin.key(19.2, 'stance', face=-1.0)
    # hammer fist down; Yang rolls clear
    yin.key(19.32, 'hammer_up', 'io')
    yin.key(19.48, 'hammer', 'in2', x=(yx - 60, 'out'))
    yang.key(19.28, 'lie', rot=(-270.0, 'lin'), x=(yx - 125, 'lin'))
    yang.key(19.62, 'tuck', 'io', rot=(-630.0, 'io2'), x=(yx - 330, 'out'))
    hp = (yx - 60 - 95, 0)
    F.impact(19.48, (yin.id, 'hand_f'), yin, kind='hit', power=0.9, ring=False)
    s.fxadd(E.Cracks(19.48, hp, VIOLET, n=6, length=170, life=4.0, width=4, seed=43))
    s.fxadd(E.Debris(19.48, hp, n=14, speed=600, size=7, col=ROCK, life=1.6))
    s.fxadd(E.Dust(19.48, hp, n=14, spread=150, life=1.4, size=30, alpha=0.5))
    F.sfx(19.48, 'crack', amp=1.0)
    yang.key(19.75, 'land3', 'out', rot=(-720.0, 'out'), face=1.0)
    yang.key(19.7505, rot=(0.0, 'hold'))
    yang.key(20.05, 'stance', 'io')
    yin.key(19.75, 'hammer')
    yin.key(20.05, 'stance', 'io', x=(yx - 40, 'io'))

    # --- round 4: mid-air spinning kick clash in slow motion --------------
    gx = yang.v(20.05, 'x')
    yx = yin.v(20.05, 'x')
    mid = (gx + yx) / 2
    loc = yin.local_joint('kick_round', 'foot_b', g=0)
    d = loc[0] - 4
    for a, sgn, x0 in ((yang, -1, gx), (yin, 1, yx)):
        f = 1.0 if sgn < 0 else -1.0  # yang (left) faces right
        a.key(20.1, 'crouch', 'io', x=(x0, 'lin'), y=(0.0, 'lin'), rot=(a.v(20.05, 'rot'), 'lin'), g=1.0)
        a.key(20.3, 'tuck', 'out', x=((x0 + mid) / 2, 'lin'), y=(150.0, 'out2'))
        a.key(20.55, 'kick_round_ch', 'io', rot=(a.v(20.05, 'rot') + 0, 'lin'))
        a.key(20.72, 'kick_round', 'in2', x=(mid + sgn * d, 'out'), y=(230.0, 'out2'))
        a.key(20.78, 'hit_air', 'snap')
        a.key(21.36, 'crouch', 'io', x=(mid + sgn * 330, 'out'), y=(0.0, 'in2'))
        a.key(21.62, x=(mid + sgn * 390, 'out'))
        a.key(21.85, 'stance', 'io')
        s.fxadd(E.Dust(21.36, (mid + sgn * 330, 0), n=12, spread=90, life=1.2, size=28,
                       dirx=sgn * 280, alpha=0.45))
    F.sfx(20.12, 'jump', amp=0.8)
    s.speed.slow(20.58, 20.84, 0.18, ramp=0.07)
    cp = (mid, 230 + loc[1])
    F.impact(20.72, ('yin', 'foot_b'), yin, kind='clash', power=1.4, hitstop=0)
    s.fxadd(E.Ring(20.72, ('yin', 'foot_b'), WHITE, r0=20, r1=700, life=0.9, width=8, alpha=0.8))
    s.fxadd(E.Ring(20.72, (mid, 0), WHITE, r0=20, r1=900, life=1.0, width=6, squash=0.12, alpha=0.6))
    s.fxadd(E.Dust(20.74, (mid, 0), n=26, spread=500, life=1.8, size=36, speed=700, alpha=0.5))
    F.shake(20.72, 0.8)
    F.sfx(20.72, 'clash_big', amp=1.0)
    fx.key(20.55, desat=0.0, chroma=0.0)
    fx.key(20.7, desat=(0.35, 'io'), chroma=(0.25, 'io'))
    fx.key(20.95, desat=(0.0, 'io'), chroma=(0.0, 'io'))
    cam.key(20.45, zmul=1.0)
    cam.key(20.7, zmul=(1.35, 'io'))
    cam.key(21.0, zmul=(1.0, 'io'))
    F.sfx(21.36, 'land', amp=0.8)
    F.sfx(21.38, 'skid', amp=0.6)

    # --- round 5: Yin presses, Yang slips everything, uppercut counter ------
    gx = yang.v(21.85, 'x')
    yx = yin.v(21.85, 'x')
    yin.key(21.95, 'dash', 'out', x=(yx, 'lin'))
    yin.key(22.12, 'stance', 'io', x=(gx - 115, 'in2'))
    F.sfx(21.97, 'dash', amp=0.6)
    for (t, p, j, dp) in ((22.22, 'jab', 'hand_f', 'dodge_back'), (22.38, 'jab', 'hand_f', 'slip'),
                          (22.55, 'cross', 'hand_b', 'duck')):
        yin.key(t - 0.08, 'stance' if p == 'jab' else 'jab', 'io')
        yin.key(t, p, 'in2')
        yang.key(t - 0.05, dp, 'snap')
        F.sfx(t - 0.03, 'whoosh', amp=0.5)
    yang.key(22.62, 'duck')
    F.strike(22.78, yang, yin, 'uppercut', 'hand_b', 'hit_head', 'head', windup='uppercut_wind', wind_t=0.12,
             kind='hit', power=1.1, recover='stance', rec_t=0.35, place=False)
    yx = yin.v(22.78, 'x')
    yin.key(22.8, x=(yx, 'lin'), y=(0.0, 'lin'), rot=(0.0, 'lin'))
    yin.key(23.02, 'tuck', 'out', x=(yx - 120, 'lin'), y=(150.0, 'out2'), rot=(200.0, 'lin'))
    yin.key(23.36, 'land3', 'out', x=(yx - 240, 'lin'), y=(0.0, 'in2'), rot=(360.0, 'out'))
    yin.key(23.3605, rot=(0.0, 'hold'))
    yin.key(23.62, x=(yx - 330, 'out'))
    s.fxadd(E.Dust(23.36, (yx - 240, 0), n=14, spread=100, life=1.3, size=28, dirx=-300, alpha=0.45))
    for k in range(5):
        s.fxadd(E.Sparks(23.38 + k * 0.04, ('yin', 'hand_f'), (1.0, 0.8, 0.5), n=5, speed=380, spread=60,
                         ang=160, life=0.25, seed=900 + k))
    F.sfx(23.36, 'skid', amp=0.9)
    yin.key(23.9, 'land3')
    yin.key(24.25, 'stance_low', 'io', eye=(1.0, 'lin'))
    yin.key(24.32, eye=(1.8, 'out'))
    yin.key(24.5, eye=(1.0, 'io'))

    # --- round 6: slide, launcher, air roundhouse --------------------------
    gx = yang.v(24.3, 'x')
    yx = yin.v(24.3, 'x')
    yin.key(24.36, 'dash', 'out', x=(yx, 'lin'), ghost=(0.0, 'lin'))
    yin.key(24.58, 'sweep', 'out', x=(gx - 150, 'in2'), ghost=(0.4, 'lin'))
    F.sfx(24.4, 'dash', amp=0.8)
    s.fxadd(E.Dust(24.5, (gx - 190, 0), n=12, spread=120, life=1.1, size=26, dirx=300, alpha=0.45))
    yang.key(24.45, 'crouch', y=(0.0, 'lin'))
    yang.key(24.62, 'tuck', 'out', y=(95.0, 'out2'))
    F.sfx(24.46, 'jump', amp=0.5)
    F.strike(24.72, yin, yang, 'kick_high', 'foot_b', 'hit_air', 'hip', windup='crouch', wind_t=0.1,
             kind='hit', power=1.0, recover=None, place=False, dfn_react_t=0.05)
    yin.key(24.75, ghost=(0.0, 'lin'))
    yang.key(24.74, y=(yang.v(24.72, 'y'), 'lin'), rot=(0.0, 'lin'), x=(gx, 'lin'))
    yang.key(25.02, y=(290.0, 'out2'), rot=(150.0, 'out'), x=(gx + 40, 'lin'))
    # Yin jumps after him
    yin.key(24.84, 'crouch', 'io', y=(0.0, 'lin'))
    yin.key(24.98, 'kick_round_ch', 'out', y=(yin.v(24.84, 'y') + 180, 'out2'))
    F.sfx(24.86, 'jump', amp=0.7)
    F.strike(25.07, yin, yang, 'kick_round', 'foot_b', 'hit_heavy', 'chest', windup=None,
             kind='hit', power=1.3, recover=None, air=True, dfn_react_t=0.04)
    yx2 = yin.v(25.07, 'x')
    gx2 = yang.v(25.07, 'x')
    yin.key(25.2, 'tuck', 'io')
    yin.key(25.45, 'crouch', 'io', y=(0.0, 'in2'), x=(yx2 + 40, 'lin'))
    yin.key(25.75, 'stance', 'io')
    yang.key(25.09, x=(gx2, 'lin'), y=(yang.v(25.07, 'y'), 'lin'), rot=(yang.v(25.07, 'rot'), 'lin'))
    yang.key(25.55, 'hit_heavy', x=(gx2 + 560, 'lin'), y=(0.0, 'in2'), rot=(260.0, 'lin'))
    yang.key(25.95, 'lie', 'out', x=(gx2 + 760, 'out'), rot=(450.0, 'out'))
    yang.key(25.9505, rot=(90.0, 'hold'))
    s.fxadd(E.Ring(25.07, ('yin', 'foot_b'), WHITE, r0=10, r1=320, life=0.5, width=5))
    s.fxadd(E.Dust(25.55, (gx2 + 560, 0), n=24, spread=260, life=1.8, size=38, dirx=450, speed=500, alpha=0.55))
    s.fxadd(E.Debris(25.55, (gx2 + 560, 0), n=12, speed=520, size=7, col=ROCK, life=1.5, ang=60))
    F.shake(25.55, 0.6)
    F.sfx(25.55, 'slam', amp=1.0)
    F.sfx(25.6, 'skid', amp=0.9)
    cam.key(25.0, zmul=1.0)
    cam.key(25.3, zmul=(0.9, 'io'))
    cam.key(26.5, zmul=(1.0, 'io'))

    # --- round 7: Yang gets up, first glimpse of power ---------------------
    yang.key(26.3, 'lie')
    yang.key(26.6, 'crouch', 'io', rot=(0.0, 'io'), face=-1.0)
    yang.key(27.05, 'relaxed', 'io', idle=0.0)
    yang.key(27.3, P('relaxed', head=-18), 'io')
    yang.key(27.35, eye=1.0, aura=0.0)
    yang.key(27.5, eye=(2.0, 'out'), aura=(0.45, 'out'))
    F.sfx(27.45, 'power_small', amp=0.8)
    yin.key(26.9, 'stance', idle=(1.0, 'lin'))
    yin.key(27.5, idle=(0.0, 'lin'))
    yx = yin.v(27.55, 'x')
    F.teleport(yang, 27.58, yx + 120, dur=0.06)
    yang.key(27.58, 'stance')
    F.strike(27.72, yang, yin, 'palm', 'hand_f', 'hit_body', 'chest', windup='windup', wind_t=0.08,
             kind='hit', power=1.3, recover='stance', rec_t=0.4, place=False)
    yang.key(27.72, eye=(1.3, 'io'))
    # Yin skids back, feet ploughing sparks
    yin.key(27.74, x=(yx, 'lin'))
    yin.key(28.4, 'crouch', 'out', x=(yx - 330, 'out'))
    for k in range(9):
        tk = 27.76 + k * 0.06
        s.fxadd(E.Sparks(tk, ('yin', 'foot_f'), (1.0, 0.75, 0.45), n=6, speed=420, spread=50, ang=150,
                         life=0.3, seed=700 + k, width=2.5))
        if k % 2 == 0:
            s.fxadd(E.Dust(tk, ('yin', 'foot_f'), n=4, spread=30, life=0.9, size=20, dirx=-120, alpha=0.35))
    F.sfx(27.76, 'skid', amp=1.0)
    s.fxadd(E.Ring(27.72, ('yin', 'chest'), GOLD, r0=10, r1=380, life=0.5, width=8))

    # --- power-up --------------------------------------------------------
    yin.key(28.6, 'crouch', eye=1.0, aura=0.0)
    yin.key(28.75, eye=(2.2, 'out'), aura=(0.5, 'out'))
    F.sfx(28.7, 'power_small', amp=0.9)
    yin.key(29.1, 'stance_low', 'io')
    yang.key(28.8, 'stance_low', 'io')
    for a in (yin, yang):
        a.key(29.4, 'stance_low', aura=(0.55, 'lin'), glowbody=0.0, eye=(1.3, 'io'))
        a.key(29.9, 'crouch', 'io', aura=(0.8, 'io'))
        a.key(30.3, 'crouch', aura=(0.9, 'lin'))
        a.key(30.45, 'roar', 'snap', aura=(1.3, 'out'), glowbody=(0.6, 'out'), eye=(2.0, 'out'))
        a.key(31.1, 'roar', aura=(1.0, 'io'), glowbody=(0.3, 'io'), eye=(1.4, 'io'))
        a.key(31.5, 'stance_low', 'io', aura=(0.6, 'io'), glowbody=(0.0, 'io'))
        a.key(31.5, eye=(1.2, 'io'))
    F.sfx(29.3, 'charge', amp=0.9, dur=1.2)
    F.sfx(29.3, 'rumble', amp=0.8, dur=1.4)
    for k, amt in enumerate((0.15, 0.2, 0.25, 0.3, 0.35, 0.4)):
        F.shake(29.4 + k * 0.17, amt * 0.5)
    fx.key(29.2, wind=(0.55, 'lin'))
    fx.key(30.45, wind=(1.2, 'out'))
    fx.key(32.0, wind=(0.7, 'io'))
    rng = np.random.default_rng(17)
    for i in range(12):
        x = rng.uniform(-800, 700)
        sz = rng.uniform(8, 22)
        t0 = 29.3 + rng.uniform(0, 0.6)
        hy = rng.uniform(90, 320)
        s.fxadd(E.Boulder([(t0, x, sz * 0.4, 0), (30.4, x, hy, rng.uniform(-60, 60), 'io'),
                           (30.9, x + (x - (-50)) * 1.5, hy + 250, rng.uniform(-200, 200), 'out')],
                          size=sz, seed=100 + i))
    for a in (yin, yang):
        px = a.v(30.45, 'x')
        s.fxadd(E.Cracks(29.5, (px, 0), a.pal['energy'], n=8, length=260, life=6.0, width=4.5, grow=0.9,
                         seed=int(px)))
        s.fxadd(E.Ring(30.45, (a.id, 'chest'), a.pal['energy'], r0=20, r1=1100, life=1.0, width=14))
        s.fxadd(E.Ring(30.45, (px, 0), WHITE, r0=20, r1=1300, life=1.1, width=6, squash=0.1))
        s.fxadd(E.Flash(30.45, (a.id, 'chest'), a.pal['energy'], size=240, life=0.5))
        s.fxadd(E.Dust(30.45, (px, 0), n=24, spread=400, life=1.8, size=40, speed=900, alpha=0.5))
    mid = (yin.v(30.45, 'x') + yang.v(30.45, 'x')) / 2
    s.fxadd(E.Flash(30.62, (mid, 150), WHITE, size=300, life=0.45, rays=12))
    s.fxadd(E.Lightning(30.6, 30.85, (mid, 600), (mid + 30, 0), WHITE, seed=5, width=5))
    F.shake(30.45, 1.0)
    F.sfx(30.45, 'roar', amp=1.0)
    F.sfx(30.62, 'boom_big', amp=1.0)
    s.speed.hitstop(30.45, frames=8)
    cam.key(29.2, zmul=1.0)
    cam.key(30.4, zmul=(1.25, 'in'))
    cam.key(30.5, zmul=(0.85, 'out'))
    cam.key(31.6, zmul=(1.0, 'io'))


# ---------------------------------------------------------------------------
def boom(s, F, t, at, col, size=1.0, ground=True, sound='explode'):
    s.fxadd(E.Flash(t, at, col, size=160 * size, life=0.4, rays=8))
    s.fxadd(E.Ring(t, at, WHITE, r0=10, r1=260 * size, life=0.5, width=6))
    s.fxadd(E.Sparks(t, at, col, n=int(20 * size), speed=900 * size, life=0.5, seed=int(t * 100)))
    if ground:
        s.fxadd(E.Debris(t, at, n=int(12 * size), speed=620 * size, size=8, col=ROCK, life=1.6))
        s.fxadd(E.Dust(t, at, n=int(14 * size), spread=160 * size, life=1.6, size=34 * size, speed=450,
                       alpha=0.5))
    F.shake(t, 0.35 * size)
    F.sfx(t, sound, amp=min(1.0, 0.6 + 0.3 * size))


def act2(s, F, yin, yang):
    fx, cam = s.fx, s.cam
    # reposition with leaps
    F.jump(yin, 31.55, 32.02, -470.0, 150, air='tuck', land='crouch', recover='stance_low')
    F.jump(yang, 31.55, 32.05, 200.0, 180, air='tuck', land='crouch', recover='stance', spin=360)
    F.face_each_other(32.1)
    # --- dark orb volley --------------------------------------------------
    T = 32.3
    gx = 200.0
    yx = -470.0
    for i, t in enumerate((T, T + 0.25, T + 0.5)):
        yin.key(t - 0.1, 'windup' if i % 2 == 0 else 'stance', 'io')
        yin.key(t, 'palm' if i % 2 == 0 else P('cross', ba2=0), 'snap')
        F.sfx(t, 'orb_fire', amp=0.8)
        s.fxadd(E.Flash(t, ('yin', 'hand_f' if i % 2 == 0 else 'hand_b'), VIOLET, size=70, life=0.2))
    yin.key(T + 0.75, 'stance_low', 'io')
    hy = 150.0
    # 1: deflected into the sky
    s.fxadd(E.Orb(T, T + 0.35, ('yin', 'hand_f'), (gx - 40, hy), VIOLET, YIN['core'], r=20))
    yang.key(T + 0.25, 'stance')
    yang.key(T + 0.35, 'backhand', 'snap')
    F.impact(T + 0.35, (gx - 40, hy), yang, kind='block', power=0.6, ring=False)
    s.fxadd(E.Orb(T + 0.35, T + 0.75, (gx - 40, hy), (gx + 450, 820), VIOLET, YIN['core'], r=20))
    boom(s, F, T + 0.75, (gx + 450, 820), VIOLET, 1.2, ground=False)
    # 2: sliced by a light blade
    yang.key(T + 0.4, blade=0.0)
    yang.key(T + 0.55, 'slash_up', 'io', blade=(1.0, 'out'))
    s.fxadd(E.Orb(T + 0.25, T + 0.72, ('yin', 'hand_b'), (gx - 60, hy + 10), VIOLET, YIN['core'], r=20))
    F.sfx(T + 0.5, 'blade_on', amp=0.8)
    yang.key(T + 0.72, 'slash_down', 'in2')
    F.sfx(T + 0.68, 'slash', amp=0.9)
    s.fxadd(E.Flash(T + 0.72, (gx - 60, hy + 10), GOLD, size=110, life=0.25))
    s.fxadd(E.Orb(T + 0.72, T + 1.0, (gx - 60, hy + 25), (gx + 380, 420), VIOLET, YIN['core'], r=13))
    s.fxadd(E.Orb(T + 0.72, T + 0.95, (gx - 60, hy - 5), (gx + 330, 0), VIOLET, YIN['core'], r=13))
    boom(s, F, T + 1.0, (gx + 380, 420), VIOLET, 0.8, ground=False)
    boom(s, F, T + 0.95, (gx + 330, 0), VIOLET, 0.8)
    # 3: dodged by teleport, explodes on the ground
    s.fxadd(E.Orb(T + 0.5, T + 0.85, ('yin', 'hand_f'), (gx - 20, 60), VIOLET, YIN['core'], r=22))
    F.teleport(yang, T + 0.78, yx + 70, y=250.0, dur=0.07)
    yang.key(T + 0.78, 'slash_up')
    yang.key(T + 0.86, 'slash_up', face=-1.0)
    boom(s, F, T + 0.85, (gx - 20, 0), VIOLET, 1.1)
    s.fxadd(E.Cracks(T + 0.85, (gx - 20, 0), VIOLET, n=6, length=180, life=4.0, seed=51))
    # overhead slash onto Yin's hardened guard -> ground shatters
    yin.key(T + 0.85, 'stance_low', dark=0.0)
    yin.key(T + 0.98, dark=(1.0, 'out'))
    F.sfx(T + 0.9, 'dark_arm', amp=0.8)
    t = T + 1.05
    F.strike(t, yang, yin, 'slash_down', 'hand_f', 'block_high', 'hand_f', windup=None, kind='block',
             power=1.4, air=True, recover=None)
    s.fxadd(E.Cracks(t, (yx, 0), GOLD, n=9, length=260, life=5.0, width=5, seed=52))
    s.fxadd(E.Debris(t, (yx, 0), n=22, speed=720, size=9, col=ROCK, life=2.0))
    s.fxadd(E.Dust(t, (yx, 0), n=22, spread=320, life=2.0, size=40, speed=650, alpha=0.55))
    s.fxadd(E.Ring(t, (yx, 0), WHITE, r0=10, r1=700, life=0.8, width=6, squash=0.12))
    F.sfx(t, 'crack', amp=1.0)
    yin.key(t + 0.05, P('block_high', fl2=-60, bl2=-55))
    yang.key(t + 0.18, 'crouch', 'io', y=(0.0, 'in2'), x=(yx + 120, 'out'))
    yang.key(t + 0.4, 'stance', 'io')
    yin.key(t + 0.4, 'stance', 'io')
    # --- blade vs shadow fists -------------------------------------------
    t = 33.85
    F.strike(t, yang, yin, 'slash_across', 'hand_f', 'block_mid', 'hand_f', windup='slash_up', wind_t=0.13,
             kind='block', power=0.8, recover=None)
    F.strike(t + 0.24, yang, yin, 'slash_down', 'hand_f', 'block_high', 'hand_f', windup='slash_up',
             wind_t=0.12, kind='block', power=0.9, recover='stance', rec_t=0.15)
    F.strike(t + 0.46, yin, yang, 'cross', 'hand_b', 'block_mid', 'hand_f', windup='stance', wind_t=0.1,
             kind='block', power=0.8, rec_t=0.12)
    # tendrils
    t = 34.55
    gx = yang.v(t, 'x')
    yin.key(t - 0.05, 'crouch', 'io', dark=(0.0, 'io'))
    yin.key(t + 0.06, 'land3', 'snap')
    F.sfx(t + 0.06, 'tendril', amp=1.0)
    s.fxadd(E.Cracks(t + 0.06, ('yin', 'hand_f'), VIOLET, n=5, length=160, life=3.0, seed=61))
    for k, dx in enumerate((-70, 40, 150, 260)):
        s.fxadd(E.Tendril(t + 0.1 + k * 0.05, t + 1.1 + k * 0.05, (gx + dx, 0), ('yang', 'chest'),
                          VIOLET, seed=k * 1.7, width=15))
    F.jump(yang, t + 0.08, t + 0.62, gx + 330, 190, air='tuck', land='crouch', recover='stance', spin=360)
    yang.key(t + 0.35, blade=1.0)
    for k, tk in enumerate((t + 0.3, t + 0.45)):
        s.fxadd(E.Flash(tk, ('yang', 'hand_f'), GOLD, size=80, life=0.2))
        F.sfx(tk, 'slash', amp=0.6)
    yin.key(t + 0.7, 'stance_low', 'io')
    # crescent wave, split by Yin's chop
    t = 35.35
    yang.key(t - 0.15, 'slash_up', 'io')
    yang.key(t, 'slash_across', 'in2')
    yang.key(t + 0.35, 'stance', 'io')
    F.sfx(t, 'slash_big', amp=1.0)
    yx = yin.v(t, 'x')
    sp_ = (yx + 45, 150)
    s.fxadd(E.Crescent(t, t + 0.38, ('yang', 'hand_f'), sp_, GOLD, size=85))
    yin.key(t + 0.25, 'hammer_up', 'io', dark=(1.0, 'io'))
    yin.key(t + 0.38, 'chop', 'in2')
    F.impact(t + 0.38, sp_, yin, kind='clash', power=1.0)
    s.fxadd(E.Crescent(t + 0.38, t + 0.75, sp_, (yx - 900, 650), GOLD, size=60, ang=0))
    s.fxadd(E.Crescent(t + 0.38, t + 0.72, sp_, (yx - 700, -40), GOLD, size=60, ang=0))
    boom(s, F, t + 0.72, (yx - 700, 0), GOLD, 1.0)
    yin.key(t + 0.7, 'stance_low', 'io', dark=(0.0, 'io'))
    yang.key(t + 0.8, blade=(0.0, 'io'))
    F.sfx(t + 0.78, 'blade_off', amp=0.5)

    # --- levitating boulders --------------------------------------------
    t = 36.3
    yx = yin.v(t, 'x')
    gx = yang.v(t, 'x')
    yin.key(t, 'stance_low')
    yin.key(t + 0.35, 'cast_up', 'io', aura=(0.8, 'io'))
    F.sfx(t + 0.1, 'rumble', amp=0.9, dur=1.0)
    F.sfx(t + 0.2, 'levitate', amp=0.8)
    rocks = [(yx - 190, 230, 30), (yx - 80, 330, 26), (yx + 30, 260, 32), (yx - 150, 420, 28), (yx - 30, 470, 64)]
    throws = []
    for i, (bx, by, sz) in enumerate(rocks):
        ts = t + 0.05 + i * 0.07
        s.fxadd(E.Dust(ts, (bx, 0), n=8, spread=60, life=1.0, size=24, alpha=0.4))
        s.fxadd(E.Cracks(ts, (bx, 0), VIOLET, n=3, length=90, life=3.0, seed=70 + i))
        throws.append((bx, by, sz, ts))
    responses = []
    for i in range(4):
        bx, by, sz, ts = throws[i]
        tt = 36.95 + i * 0.25
        ta = tt + 0.3
        yin.key(tt - 0.08, 'stance' if i % 2 == 0 else 'windup', 'io')
        yin.key(tt, 'palm' if i % 2 == 0 else P('cross', ba2=0), 'snap')
        F.sfx(tt, 'throw', amp=0.7)
        hit = (gx - 70, 150 if i != 2 else 175)
        if i == 2:
            end = (gx + 700, 0)
            keys = [(ts, bx, sz * 0.3, 0), (ts + 0.55, bx, by, 30, 'out'), (tt, bx, by + 10, 40, 'io'),
                    (ta + 0.3, end[0], 60, 400, 'lin')]
            s.fxadd(E.Boulder(keys, size=sz, seed=200 + i, glow=VIOLET))
            boom(s, F, ta + 0.3, end, VIOLET, 0.9)
            yang.key(ta - 0.1, 'stance')
            yang.key(ta - 0.02, 'duck', 'snap')
            yang.key(ta + 0.15, 'stance', 'io')
        else:
            keys = [(ts, bx, sz * 0.3, 0), (ts + 0.55, bx, by, 30, 'out'), (tt, bx, by + 10, 40, 'io'),
                    (ta, hit[0], hit[1], 200, 'lin')]
            s.fxadd(E.Boulder(keys, size=sz, seed=200 + i, glow=VIOLET))
            pose, j, wu = [('jab', 'hand_f', 'stance'), ('kick_round', 'foot_b', 'kick_round_ch'), None,
                           ('chop', 'hand_f', 'hammer_up')][i]
            yang.key(ta - 0.12, wu, 'io')
            yang.key(ta, pose, 'in2')
            yang.key(ta + 0.14, 'stance', 'io')
            boom(s, F, ta, hit, GOLD, 0.8, ground=False, sound='rock_break')
            s.fxadd(E.Debris(ta, hit, n=14, speed=600, size=10, col=ROCK, life=1.6, ang=0 if False else 180,
                             spread=140))
            F.sfx(ta - 0.08, 'whoosh', amp=0.5)
    # the big one: Yang flies straight through it
    bx, by, sz, ts = throws[4]
    tt = 38.35
    yin.key(38.1, 'cast_up', 'io')
    yin.key(tt, 'double_palm', 'snap')
    F.sfx(tt, 'throw', amp=1.0)
    meet = ((bx + gx) / 2 + 60, 190)
    keys = [(ts, bx, sz * 0.3, 0), (ts + 0.6, bx, by, 20, 'out'), (tt, bx, by + 20, 50, 'io'),
            (tt + 0.2, meet[0], meet[1], 180, 'lin')]
    s.fxadd(E.Boulder(keys, size=sz, seed=300, glow=VIOLET))
    yang.key(tt - 0.1, 'crouch', 'io', y=(0.0, 'lin'))
    yang.key(tt + 0.2, 'fly_kick', 'out', x=(meet[0] + 60, 'in2'), y=(110.0, 'out2'), ghost=(0.5, 'lin'))
    F.sfx(tt, 'jump', amp=0.7)
    boom(s, F, tt + 0.2, meet, GOLD, 1.6, ground=False, sound='rock_break')
    s.fxadd(E.Debris(tt + 0.2, meet, n=26, speed=800, size=12, col=ROCK, life=2.0, ang=180, spread=160))
    s.speed.hitstop(tt + 0.2, frames=4)
    yin.key(tt + 0.25, 'stance', 'io')
    t = tt + 0.4
    F.strike(t, yang, yin, 'fly_kick', 'foot_f', 'catch', 'hand_f', windup=None, kind='clash', power=1.3,
             air=True, recover=None)
    yang.key(t + 0.02, ghost=(0.0, 'lin'))
    # thrown skyward
    yx = yin.v(t, 'x')
    gx = yang.v(t, 'x')
    gy = yang.v(t, 'y')
    yin.key(t + 0.2, 'throw', 'io')
    yang.key(t + 0.05, x=(gx, 'lin'), y=(gy, 'lin'), rot=(0.0, 'lin'))
    yang.key(t + 0.55, 'tuck', 'io', x=(yx + 260, 'lin'), y=(420.0, 'out2'), rot=(-540.0, 'lin'))
    yang.key(t + 0.95, 'land3', 'io', x=(yx + 520, 'lin'), y=(0.0, 'in2'), rot=(-720.0, 'out'), face=-1.0)
    yang.key(t + 0.9505, rot=(0.0, 'hold'))
    F.sfx(t + 0.1, 'whoosh_big', amp=0.8)
    F.sfx(t + 0.95, 'land', amp=0.9)
    # --- light pillars march toward Yin -----------------------------------
    t0 = t + 1.0
    gxl = yx + 520
    yang.key(t0, 'land3', aura=(0.8, 'io'), glowbody=(0.35, 'io'))
    yin.key(t + 0.9, 'stance_low', 'io')
    for k in range(5):
        tk = t0 + 0.08 + k * 0.1
        px = gxl - 105 * (k + 1)
        s.fxadd(E.Pillar(tk, px, GOLD, width=62, life=0.55))
        s.fxadd(E.Cracks(tk, (px, 0), GOLD, n=3, length=100, life=2.5, seed=80 + k))
        s.fxadd(E.Debris(tk, (px, 0), n=6, speed=500, size=6, col=ROCK, life=1.2))
        F.sfx(tk, 'pillar', amp=0.8)
        F.shake(tk, 0.18)
    tl = t0 + 0.08 + 4 * 0.1
    yin.key(tl - 0.12, 'guard_x', 'out', dark=(1.0, 'out'))
    F.impact(tl, ('yin', 'chest'), yang, kind='hit', power=1.3, ring=True)
    yang.key(tl + 0.3, 'stance', 'io', glowbody=(0.0, 'io'))
    return tl


# ---------------------------------------------------------------------------
def bg_bolt(s, F, t, x, seed, dur=0.22):
    b = E.Lightning(t, t + dur, (x, 3200), (x + 200, 400), (0.75, 0.8, 1.0), seed=seed, width=4, branches=4)
    b.layer = 'back'
    s.fxadd(b)
    s.fx.key(t - 0.01, skyflash=0.0)
    s.fx.key(t + 0.02, skyflash=(1.0, 'lin'))
    s.fx.key(t + 0.35, skyflash=(0.0, 'out'))
    F.sfx(t, 'thunder', amp=0.8)


def act3(s, F, yin, yang, tl):
    fx, cam = s.fx, s.cam
    yx = yin.v(tl, 'x')
    # --- launched into the storm -------------------------------------------
    yin.key(tl, g=(1.0, 'lin'), y=(0.0, 'lin'), rot=(0.0, 'lin'), dark=(1.0, 'lin'))
    yin.key(tl + 0.06, 'hit_heavy', 'snap', dark=(0.0, 'io'))
    yin.key(tl + 0.3, g=(0.0, 'lin'))
    yin.key(tl + 0.85, 'hit_air', 'io', y=(1000.0, 'out2'), x=(yx - 60, 'out'), rot=(300.0, 'out'))
    F.sfx(tl + 0.05, 'whoosh_big', amp=0.9)
    cam.key(tl + 0.1, gframe=1.0)
    cam.key(tl + 0.8, gframe=(0.0, 'io'))
    fx.key(tl + 0.4, storm=0.0, wind=0.7)
    fx.key(tl + 2.6, storm=(1.0, 'io'), wind=(0.9, 'io'))
    gx = yang.v(tl, 'x')
    yang.key(tl + 0.25, 'crouch', 'io', y=(0.0, 'lin'), g=(1.0, 'lin'))
    yang.key(tl + 0.42, 'superman', 'snap', ghost=(0.6, 'lin'))
    yang.key(tl + 0.6, g=(0.0, 'lin'))
    F.sfx(tl + 0.42, 'dash', amp=0.9)
    t = tl + 0.95
    F.strike(t, yang, yin, 'superman', 'hand_f', 'hit_air', 'hip', windup=None, kind='hit', power=1.1,
             air=True, recover=None, ease='in2')
    yang.key(t + 0.1, ghost=(0.0, 'lin'))
    yx = yin.v(t, 'x')
    yy = yin.v(t, 'y')
    yin.key(t + 0.02, y=(yy, 'lin'), x=(yx, 'lin'), rot=(300.0, 'lin'))
    yin.key(t + 0.55, 'tuck', 'io', y=(yy + 330, 'out2'), x=(yx - 120, 'out'), rot=(640.0, 'out'))
    yin.key(t + 0.85, 'float_guard', 'io', rot=(720.0, 'io'))
    yin.key(t + 0.8505, rot=(0.0, 'hold'))
    C = yx - 120 + 180
    Y = yy + 300
    yang.key(t + 0.35, 'float', 'io', x=(C + 180, 'io'), y=(Y + 60, 'io'))
    yang.key(t + 0.85, 'float_guard', 'io', x=(C + 190, 'io'), y=(Y, 'io'), face=-1.0)
    yin.key(t + 0.86, face=1.0)
    for a in (yin, yang):
        a.key(t + 0.9, idle=(1.0, 'lin'), aura=(0.6, 'io'))
    bg_bolt(s, F, t + 1.1, C + 500, 1)
    F.cam_track(tl + 0.15, t + 1.0, zoom=lambda tt: 1.15, blend=0.3)
    # --- flash-step clashes ------------------------------------------------
    rng = np.random.default_rng(99)
    moves = [('jab', 'hand_f', 'block_high', 'hand_f', 'block'),
             ('kick_round', 'foot_b', 'block_mid', 'hand_f', 'block'),
             ('cross', 'hand_b', 'cross', 'hand_b', 'clash'),
             ('kick_high', 'foot_b', 'kick_high', 'foot_b', 'clash'),
             ('palm', 'hand_f', 'palm', 'hand_f', 'clash'),
             ('fly_kick', 'foot_f', 'guard_x', 'hand_f', 'block'),
             ('hook', 'hand_f', 'block_high', 'hand_f', 'block'),
             ('knee', 'knee_f', 'block_mid', 'hand_f', 'block'),
             ('jab', 'hand_f', 'jab', 'hand_f', 'clash'),
             ('kick_round', 'foot_b', 'kick_round', 'foot_b', 'clash')]
    gaps = [0.5, 0.42, 0.38, 0.34, 0.31, 0.29, 0.27, 0.26, 0.25]
    tc = t + 1.7
    for i, (ap, aj, dp, dj, kind) in enumerate(moves):
        ang = rng.uniform(0, 2 * math.pi)
        rad = rng.uniform(80, 280)
        px, py = C + math.cos(ang) * rad, Y + math.sin(ang) * rad * 0.6
        att, dfn = (yin, yang) if i % 2 == 0 else (yang, yin)
        side = 1.0 if rng.uniform() < 0.5 else -1.0   # side of the attacker relative to the defender
        d0 = tc - 0.13
        for a in (yin, yang):
            a.key(d0, ghost=(0.0, 'lin'), idle=(0.0, 'lin'))
            a.key(d0 + 0.02, ghost=(1.0, 'lin'))
            a.key(tc + 0.12, ghost=(0.0, 'lin'))
        dfn.key(d0, x=(dfn.v(d0, 'x'), 'lin'), y=(dfn.v(d0, 'y'), 'lin'))
        dfn.key(tc - 0.03, 'float_guard', 'io', x=(px - side * 55, 'io2'), y=(py, 'io2'))
        att.key(d0, x=(att.v(d0, 'x'), 'lin'), y=(att.v(d0, 'y'), 'lin'))
        att.key(tc - 0.03, face=side * -1.0)
        dfn.key(tc - 0.03, face=side)
        F.strike(tc, att, dfn, ap, aj, dp, dj, windup='float_guard', wind_t=0.08, kind=kind,
                 power=0.8 + 0.06 * i, air=True, recover='float_guard', rec_t=0.2, whoosh=False,
                 hitstop=2 if i < 9 else 6)
        if kind == 'clash':
            dfn.key(tc, dp, 'in2')
        F.sfx(tc - 0.1, 'zip', amp=0.6)
        s.fxadd(E.Ring(tc, (att.id, aj), WHITE, r0=10, r1=220 + 25 * i, life=0.35, width=4, alpha=0.7))
        if i < len(gaps):
            tc += gaps[i]
    # final collision clears the clouds
    tc_end = tc
    s.fxadd(E.Ring(tc_end, ('yin', 'foot_b'), WHITE, r0=20, r1=1600, life=1.1, width=12))
    s.fxadd(E.Flash(tc_end, ('yin', 'foot_b'), WHITE, size=320, life=0.5, rays=12))
    F.shake(tc_end, 0.9)
    F.sfx(tc_end, 'clash_big', amp=1.0)
    fx.key(tc_end - 0.01, skyflash=0.0)
    fx.key(tc_end + 0.03, skyflash=(0.8, 'lin'))
    fx.key(tc_end + 0.6, skyflash=(0.0, 'out'))
    # repelled apart
    for a, sg in ((yin, -1), (yang, 1)):
        x0, y0 = a.v(tc_end, 'x'), a.v(tc_end, 'y')
        a.key(tc_end + 0.05, x=(x0, 'lin'), y=(y0, 'lin'))
        a.key(tc_end + 0.7, 'float_back', 'out', x=(C + sg * 430, 'out'), y=(Y, 'out'))
        a.key(tc_end + 1.0, 'float_guard', 'io', face=-sg, idle=(1.0, 'lin'))
    # --- lightning grab ----------------------------------------------------
    LG = tc_end + 1.1
    yin.key(LG, 'float', idle=(0.0, 'lin'))
    yin.key(LG + 0.3, 'cast_up', 'io')
    hand = ('yin', 'hand_f')
    bolt = E.Lightning(LG + 0.4, LG + 0.8, (C - 330, 3400), hand, (0.8, 0.85, 1.0), seed=7, width=6, branches=5)
    s.fxadd(bolt)
    fx.key(LG + 0.39, skyflash=0.0)
    fx.key(LG + 0.42, skyflash=(1.0, 'lin'))
    fx.key(LG + 0.9, skyflash=(0.0, 'out'))
    F.sfx(LG + 0.4, 'thunder', amp=1.0)
    F.shake(LG + 0.4, 0.5)
    yin.key(LG + 0.4, aura=(0.6, 'lin'), glowbody=0.0)
    yin.key(LG + 0.5, aura=(1.2, 'out'), glowbody=(0.5, 'out'))
    for k in range(6):
        tk = LG + 0.8 + k * 0.1
        s.fxadd(E.Lightning(tk, tk + 0.12, hand, (lambda sim, tt, k=k: sim.joint('yin', 'hand_f', tt)
                                                        + np.array([math.cos(k * 2.1) * 70, math.sin(k * 2.1) * 70])),
                            VIOLET, seed=30 + k, width=3, branches=1))
    F.sfx(LG + 0.8, 'crackle', amp=0.8, dur=0.7)
    t = LG + 1.45
    yin.key(t - 0.12, 'windup', 'io')
    yin.key(t, 'palm', 'snap')
    s.fxadd(E.Lightning(t, t + 0.35, ('yin', 'hand_f'), ('yang', 'chest'), VIOLET, seed=77, width=7, branches=4))
    F.sfx(t, 'zap', amp=1.0)
    yang.key(t - 0.05, 'guard_x', 'out')
    gx, gy = yang.v(t, 'x'), yang.v(t, 'y')
    yang.key(t + 0.02, x=(gx, 'lin'))
    yang.key(t + 0.5, x=(gx + 360, 'out'), y=(gy + 40, 'out'))
    F.impact(t + 0.02, ('yang', 'hand_f'), yin, kind='block', power=1.2)
    s.fxadd(E.Dust(t + 0.25, (gx + 250, gy + 40), n=22, spread=300, col=(0.55, 0.6, 0.72), life=1.6,
                   size=70, speed=700, alpha=0.45))
    yin.key(t + 0.4, 'float_guard', 'io', aura=(0.7, 'io'), glowbody=(0.0, 'io'))
    yang.key(t + 0.8, 'float_guard', 'io')
    # --- light spear barrage ------------------------------------------------
    SP = t + 0.9
    gx, gy = yang.v(SP, 'x'), yang.v(SP, 'y')
    yang.key(SP, 'float', 'io', aura=(0.9, 'io'))
    yang.key(SP + 0.35, 'cast_up', 'io')
    F.sfx(SP + 0.2, 'spears_form', amp=0.9)
    yin_path = []
    for k in range(8):
        ang = math.radians(70 + 22 * k)
        hover = (gx + math.cos(ang) * 200 * 1.0, gy + 60 + math.sin(ang) * 170)
        tf = SP + 1.1 + 0.12 * k
        yin_path.append(tf)
        tgt = yin.joint(SP + 1.0, 'chest') + np.array([0.0, rng.uniform(-40, 40)])
        d = tgt - np.array(hover)
        if k in (3, 5):
            dst = np.array(hover) + d * 0.8
            t1 = tf + 0.24
            s.fxadd(E.Flash(t1, tuple(dst), GOLD, size=80, life=0.25))
            s.fxadd(E.Sparks(t1, tuple(dst), GOLD, n=16, speed=600, life=0.35, seed=500 + k))
            F.sfx(t1, 'shatter', amp=0.6)
        elif k == 7:
            dst = tgt
            t1 = tf + 0.3
        else:
            dst = np.array(hover) + d * 2.2
            t1 = tf + 0.6
        s.fxadd(E.Spear(SP + 0.25 + 0.05 * k, tf, t1, hover, tuple(dst), GOLD, length=110))
        F.sfx(tf, 'spear', amp=0.6)
    yang.key(SP + 1.1, 'point', 'snap')
    # Yin weaves
    yx, yy = yin.v(SP + 1.0, 'x'), yin.v(SP + 1.0, 'y')
    yin.key(SP + 1.15, 'float_guard', x=(yx, 'lin'), y=(yy, 'lin'))
    yin.key(SP + 1.32, 'float_back', 'out', y=(yy + 130, 'out'))
    yin.key(SP + 1.5, 'duck', 'io', y=(yy - 110, 'io'))
    yin.key(SP + 1.62, 'float_guard', 'io', y=(yy, 'io'))
    for k, tk in enumerate((SP + 1.36, SP + 1.6)):
        s.fxadd(E.Tendril(tk - 0.1, tk + 0.35, ('yin', 'hand_f'), (lambda sim, tt, x=yx, y=yy, k=k:
                                                                    np.array([x + 200, y + (80 if k else -60)])),
                          VIOLET, seed=3 + k, width=10))
    yin.key(SP + 1.9, 'float_guard')
    tg = SP + 1.1 + 0.12 * 7 + 0.3
    yin.key(tg, 'float_guard')
    yin.key(tg + 0.06, 'hit_air', 'snap', rot=(0.0, 'lin'))
    yin.key(tg + 0.4, 'float_back', 'io', rot=(-40.0, 'io'), x=(yx - 120, 'out'))
    yin.key(tg + 0.7, 'float_guard', 'io', rot=(0.0, 'io'))
    F.impact(tg, ('yin', 'chest'), yang, kind='hit', power=1.0)
    yang.key(tg + 0.2, 'float_guard', 'io')

    # --- beam struggle -----------------------------------------------------
    B = tg + 0.8
    bx0 = C
    Yb = Y
    for a, sg in ((yin, -1), (yang, 1)):
        a.key(B, 'float', 'io', x=(a.v(B, 'x'), 'lin'), y=(a.v(B, 'y'), 'lin'), idle=0.0)
        a.key(B + 0.6, 'float_back', 'io', x=(bx0 + sg * 540, 'io'), y=(Yb, 'io'), face=-sg)
        a.key(B + 0.8, 'beam_charge', 'io', charge=0.0, chargeat=1.0, aura=(0.9, 'io'))
        a.key(B + 2.3, 'beam_charge', charge=(34.0, 'io'), aura=(1.3, 'in'))
        s.fxadd(E.ChargeLines(B + 0.8, B + 2.3, (a.id, 'hand_f'), a.pal['energy'], radius=300, seed=40 + sg))
    F.sfx(B + 0.8, 'charge', amp=1.0, dur=1.5)
    for k in range(6):
        F.shake(B + 0.9 + k * 0.23, 0.12 + 0.03 * k)
    F0 = B + 2.35
    hy = yin.joint(F0 + 0.05, 'hand_f')[1] if False else Yb + 40
    fx.key(F0, bx=0.0)
    fx.key(F0 + 0.2, bx=(0.0, 'lin'))
    fx.key(F0 + 1.2, bx=(-170.0, 'io'))
    fx.key(F0 + 1.9, bx=(-250.0, 'io'))
    fx.key(F0 + 2.4, bx=(-230.0, 'io'))
    fx.key(F0 + 3.0, bx=(160.0, 'io'))
    fx.key(F0 + 3.5, bx=(200.0, 'io'))
    fx.key(F0 + 4.1, bx=(0.0, 'io'))
    X = F0 + 4.6
    fx.key(X, bx=(0.0, 'lin'))

    def cp(sim, t, bx0=bx0, hy=hy):
        return np.array([bx0 + sim.story.fx.ch['bx'].at(t), hy])

    for a in (yin, yang):
        a.key(F0, 'double_palm', 'snap', charge=(0.0, 'out'), chargeat=0.0)
        a.key(X, 'double_palm')
        s.fxadd(E.Beam(F0, X, (a.id, 'hand_f'), cp, a.pal['energy'], a.pal['core'] if a is yin else WHITE,
                       width=54, seed=3 if a is yin else 9, dark=a is yin))
    s.fxadd(E.ClashBall(F0 + 0.1, X, cp, VIOLET, GOLD, size=85))
    F.sfx(F0, 'beam_fire', amp=1.0)
    F.sfx(F0 + 0.1, 'beam_loop', amp=0.9, dur=X - F0)
    for k in range(int((X - F0) / 0.3)):
        F.shake(F0 + 0.2 + k * 0.3, 0.2)
    yin.key(F0 + 2.3, aura=1.3)
    yin.key(F0 + 2.5, aura=(2.0, 'out'), eye=(2.0, 'out'), glowbody=(0.7, 'out'))
    F.sfx(F0 + 2.45, 'roar', amp=0.9)
    yang.key(F0 + 3.4, aura=1.3)
    yang.key(F0 + 3.7, aura=(2.0, 'out'), eye=(2.0, 'out'), glowbody=(0.7, 'out'))
    F.sfx(F0 + 3.65, 'roar', amp=0.9)
    fx.key(F0 + 3.8, chroma=0.0)
    fx.key(X - 0.1, chroma=(0.5, 'in'))
    fx.key(X + 0.5, chroma=(0.0, 'out'))
    cam.key(F0, zmul=1.0)
    cam.key(F0 + 4.3, zmul=(1.25, 'io'))
    cam.key(X + 0.1, zmul=(0.8, 'out'))
    cam.key(X + 1.5, zmul=(1.0, 'io'))
    # detonation
    s.fxadd(E.Nova(X, cp, WHITE, r1=1900, life=1.3))
    s.fxadd(E.Flash(X, cp, WHITE, size=520, life=0.7, rays=14))
    s.fxadd(E.Ring(X, cp, VIOLET, r0=30, r1=1700, life=1.0, width=16))
    s.fxadd(E.Ring(X + 0.08, cp, GOLD, r0=30, r1=1500, life=1.0, width=12))
    s.fxadd(E.Dust(X + 0.1, (bx0, hy), n=30, spread=900, col=(0.5, 0.54, 0.64), life=2.6, size=110, speed=900,
                   alpha=0.5))
    fx.key(X - 0.01, white=0.0)
    fx.key(X + 0.04, white=(0.9, 'lin'))
    fx.key(X + 0.6, white=(0.0, 'out'))
    F.shake(X, 1.2)
    F.sfx(X, 'boom_huge', amp=1.0)
    s.speed.hitstop(X, frames=8)
    for a, sg in ((yin, -1), (yang, 1)):
        x0 = a.v(X, 'x')
        a.key(X + 0.02, x=(x0, 'lin'), rot=(0.0, 'lin'), y=(Yb, 'lin'))
        a.key(X + 0.1, 'hit_heavy', 'snap', aura=(0.8, 'io'), glowbody=(0.0, 'io'), eye=(1.0, 'io'))
        a.key(X + 0.8, 'tuck', 'io', x=(x0 + sg * 380, 'out'), y=(Yb + 90, 'out'), rot=(sg * 330, 'out'))
        a.key(X + 1.1, 'float_guard', 'io', rot=(sg * 360, 'io'))
        a.key(X + 1.1005, rot=(0.0, 'hold'))

    # --- hammer fist: Yin is smashed into the mountain -----------------------
    H = X + 1.25
    yx, yy = yin.v(H, 'x'), yin.v(H, 'y')
    F.teleport(yang, H, yx + 45, y=yy + 210, dur=0.07)
    yang.key(H + 0.07, 'hammer_up', face=-1.0)
    F.strike(H + 0.25, yang, yin, 'hammer', 'hand_f', 'hit_heavy', 'chest', windup=None, kind='hit',
             power=1.5, air=True, recover='float', rec_t=0.4)
    tfall = H + 0.27
    crash_t = H + 0.85
    splitx = max(-350.0, min(350.0, yx - 40))
    yin.key(tfall, x=(yx, 'lin'), y=(yy, 'lin'), rot=(0.0, 'lin'), ghost=(0.0, 'lin'))
    yin.key(tfall + 0.05, ghost=(1.0, 'lin'))
    yin.key(crash_t, 'hit_air', x=(splitx, 'lin'), y=(0.0, 'in2'), rot=(-400.0, 'lin'))
    yin.key(crash_t + 0.001, vis=(1.0, 'hold'))
    yin.key(crash_t + 0.03, vis=(0.0, 'lin'), ghost=(0.0, 'lin'), rot=(0.0, 'hold'), aura=(0.0, 'lin'))
    fall_y0 = yy
    F.cam_track(H + 0.05, crash_t, fixed=lambda tt: (
        (yx + (splitx - yx) * min(1, max(0, (tt - tfall) / (crash_t - tfall)))),
        max(260.0, yin.joint(max(tt, tfall), 'chest')[1] + 40) if tt > tfall else
        (yin.joint(tt, 'chest')[1] + yang.joint(tt, 'chest')[1]) / 2),
        zoom=lambda tt: 1.2 if tt < tfall else max(0.75, 1.2 - 0.45 * (tt - tfall) / (crash_t - tfall)),
        blend=0.25, release=False)
    at = (splitx, 0)
    s.fxadd(E.Flash(crash_t, at, VIOLET, size=520, life=0.7, rays=12))
    s.fxadd(E.Ring(crash_t, at, WHITE, r0=20, r1=1500, life=1.1, width=10, squash=0.15))
    s.fxadd(E.Ring(crash_t, (splitx, 60), VIOLET, r0=20, r1=700, life=0.8, width=10))
    s.fxadd(E.Debris(crash_t, at, n=40, speed=1100, size=14, col=ROCK, life=2.6))
    s.fxadd(E.Dust(crash_t, at, n=34, spread=700, life=3.0, size=80, speed=900, alpha=0.6))
    F.shake(crash_t, 1.2)
    F.sfx(crash_t, 'boom_huge', amp=1.0)
    s.speed.hitstop(crash_t, frames=6)
    # mountain splits
    fx.key(crash_t, split=0.0, splitx=splitx)
    fx.key(crash_t + 0.25, split=(0.0, 'lin'))
    fx.key(crash_t + 1.8, split=(1.0, 'out'))
    F.sfx(crash_t + 0.3, 'rumble', amp=1.0, dur=2.2)
    F.sfx(crash_t + 0.3, 'split', amp=1.0)
    for k in range(6):
        F.shake(crash_t + 0.3 + k * 0.25, 0.3)
        s.fxadd(E.Debris(crash_t + 0.3 + k * 0.25, (splitx + rng.uniform(-150, 150), -20), n=6, speed=300,
                         size=16, col=ROCK, life=2.0, ground=False))
    # violet eruption, Yin rises
    R0 = crash_t + 2.1
    s.fxadd(E.Pillar(R0, splitx, VIOLET, width=190, life=1.4, height=5000))
    s.fxadd(E.Ring(R0, (splitx, 0), VIOLET, r0=20, r1=1200, life=1.0, width=14, squash=0.2))
    F.sfx(R0, 'eruption', amp=1.0)
    F.shake(R0, 0.8)
    yin.key(R0, 'superman', x=(splitx, 'lin'), y=(-150.0, 'lin'), rot=(0.0, 'lin'), face=1.0, vis=(0.0, 'lin'))
    yin.key(R0 + 0.05, vis=(1.0, 'lin'), aura=(1.6, 'lin'), ghost=(1.0, 'lin'), glowbody=(0.5, 'lin'),
            eye=(2.2, 'lin'))
    gx, gy = yang.v(R0, 'x'), yang.v(R0, 'y')
    yang.key(R0, 'float', 'io', x=(gx, 'lin'), y=(gy, 'lin'))
    yin.key(R0 + 0.55, x=(splitx + 120, 'io2'), y=(gy + 400, 'in'))
    F.sfx(R0 + 0.3, 'whoosh_big', amp=1.0)
    yang.key(R0 + 0.5, P('float', head=-30), 'io')
    # --- ascent to space ----------------------------------------------------
    A = R0 + 0.7
    yang.key(A, 'superman', 'snap', ghost=(0.8, 'lin'), aura=(1.0, 'io'))
    F.sfx(A, 'dash', amp=1.0)
    yin.key(A + 2.0, x=(splitx + 40, 'io2'), y=(5000.0, 'io2'))
    yang.key(A + 2.1, x=(splitx + 180, 'io2'), y=(4880.0, 'io2'))
    for k, tk in enumerate((A + 0.8, A + 1.35)):
        s.fxadd(E.Flash(tk, (lambda sim, tt: (sim.joint('yin', 'chest', tt) + sim.joint('yang', 'chest', tt)) / 2),
                        WHITE, size=200, life=0.3))
        F.sfx(tk, 'clash', amp=0.8)
        F.shake(tk, 0.3)
    split_cam_end = crash_t + 0.05
    s.cam.key(split_cam_end, w=1.0, x=(splitx, 'lin'), y=(260.0, 'lin'), zoom=(0.75, 'lin'))
    s.cam.key(crash_t + 0.6, x=(splitx, 'io'), y=(60.0, 'io'), zoom=(0.52, 'io'))
    s.cam.key(R0 - 0.05, w=(1.0, 'lin'), x=(splitx, 'lin'), y=(160.0, 'io'), zoom=(0.55, 'io'))
    F.cam_track(R0 + 0.05, A + 2.4, zoom=lambda tt: 0.85, blend=0.4, dy=60, engage=False)
    fx.key(A + 0.5, scene=1.0, speed=0.0, speedang=90.0)
    fx.key(A + 0.8, speed=(1.0, 'io'))
    fx.key(A + 1.6, scene=(2.0, 'io'))
    fx.key(A + 2.1, speed=(0.0, 'io'))
    for a, sg in ((yin, -1), (yang, 1)):
        a.key(A + 2.2, 'float_back', 'io', ghost=(0.0, 'io'))
        a.key(A + 2.7, 'float_guard', 'io', x=(splitx + 110 + sg * 300, 'io'), y=(4950.0, 'io'), face=-sg,
              aura=(0.8, 'io'), glowbody=(0.0, 'io'), eye=(1.2, 'io'), idle=(1.0, 'lin'))
    return A + 2.7


# ---------------------------------------------------------------------------
def act4(s, F, yin, yang, P0):
    fx, cam = s.fx, s.cam
    CX = (yin.v(P0, 'x') + yang.v(P0, 'x')) / 2
    CY = yin.v(P0, 'y')
    rng = np.random.default_rng(404)
    for i in range(7):
        ax = CX + rng.uniform(-1600, 1600)
        ay = CY + rng.uniform(-500, 500)
        if abs(ax - CX) < 500:
            ax += 900 * (1 if ax >= CX else -1)
        s.fxadd(E.Asteroid(P0 - 1.0, P0 + 40, (ax, ay), rng.uniform(25, 65), seed=i,
                           col=(0.17, 0.15, 0.22), drift=(rng.uniform(-15, 15), rng.uniform(-8, 8))))
    F.sfx(P0 - 0.3, 'drone_space', amp=0.8, dur=6.0)
    cam.key(P0, zmul=1.0)
    cam.key(P0 + 2.0, zmul=(1.2, 'io'))
    cam.key(P0 + 2.3, zmul=(1.0, 'io'))
    for a in (yin, yang):
        a.key(P0 + 1.2, aura=(1.1, 'io'), eye=(1.6, 'io'))
        a.key(P0 + 1.9, 'float_guard', aura=(0.9, 'io'), eye=(1.2, 'io'))
    F.sfx(P0 + 1.2, 'power_small', amp=0.7)
    # --- teleport flash exchange ------------------------------------------
    T1 = P0 + 2.1
    for a in (yin, yang):
        a.key(T1 - 0.12, idle=(0.0, 'lin'))
        F.teleport(a, T1 - 0.1, a.v(T1 - 0.1, 'x'), dur=0.01)
        a.key(T1 - 0.09, vis=(0.0, 'lin'))
    combos = [('cross', 'hand_b', 'cross', 'hand_b'), ('kick_high', 'foot_b', 'kick_high', 'foot_b'),
              ('jab', 'hand_f', 'palm', 'hand_f'), ('kick_round', 'foot_b', 'block_high', 'hand_f'),
              ('palm', 'hand_f', 'palm', 'hand_f'), ('knee', 'knee_f', 'block_mid', 'hand_f'),
              ('fly_kick', 'foot_f', 'guard_x', 'hand_f'), ('hook', 'hand_f', 'block_high', 'hand_f'),
              ('kick_round', 'foot_b', 'kick_round', 'foot_b'), ('cross', 'hand_b', 'palm', 'hand_f'),
              ('kick_high', 'foot_b', 'block_high', 'hand_f'), ('cross', 'hand_b', 'cross', 'hand_b')]
    gaps = [0.36, 0.32, 0.29, 0.27, 0.25, 0.23, 0.21, 0.2, 0.19, 0.18, 0.3]
    tc = T1 + 0.05
    for i, (ap, aj, dp, dj) in enumerate(combos):
        px = CX + rng.uniform(-620, 620)
        py = CY + rng.uniform(-260, 260)
        att, dfn = (yin, yang) if i % 2 == 0 else (yang, yin)
        side = 1.0 if rng.uniform() < 0.5 else -1.0
        last = i == len(combos) - 1
        dfn.key(tc - 0.03, dp, 'hold', x=(px + side * 50, 'hold'), y=(py, 'hold'), face=-side)
        att.key(tc - 0.03, face=side)
        F.strike(tc, att, dfn, ap, aj, dp, dj, windup=None, kind='clash', power=0.85 + (0.5 if last else 0),
                 air=True, recover=None, whoosh=False, hitstop=2 if not last else 7, ease='hold')
        ax, ay = att.v(tc, 'x'), att.v(tc, 'y')
        att.key(tc - 0.03, ap, 'hold', x=(ax, 'hold'), y=(ay, 'hold'))
        for a in (att, dfn):
            a.key(tc - 0.031, vis=(0.0, 'lin'))
            a.key(tc - 0.03, vis=(1.0, 'hold'))
            if not last:
                a.key(tc + 0.11, vis=(1.0, 'lin'))
                a.key(tc + 0.12, vis=(0.0, 'hold'))
        s.fxadd(E.Ring(tc, (att.id, aj), WHITE, r0=10, r1=260, life=0.4, width=5, alpha=0.8))
        F.sfx(tc - 0.03, 'zip', amp=0.5)
        if not last:
            tc += gaps[i]
    T2 = tc
    s.fxadd(E.Ring(T2, (yin.id, 'hand_b'), WHITE, r0=10, r1=1400, life=1.0, width=10))
    F.sfx(T2, 'clash_big', amp=1.0)
    F.shake(T2, 0.8)
    # --- point-blank barrage ----------------------------------------------
    yx, yy = yin.v(T2, 'x'), yin.v(T2, 'y')
    gx, gy = yang.v(T2, 'x'), yang.v(T2, 'y')
    fy = yin.v(T2, 'face')
    mid = np.array([(yx + gx) / 2, (yy + gy) / 2])
    for a, x0, y0 in ((yin, yx, yy), (yang, gx, gy)):
        a.key(T2 + 0.15, 'float_guard', 'io', x=(x0, 'lin'), y=(y0, 'lin'))
    step = 0.085
    nb = 24
    for k in range(nb):
        tk = T2 + 0.25 + k * step
        pa = 'jab' if k % 2 == 0 else 'cross'
        pb = 'cross' if k % 2 == 0 else 'jab'
        yin.key(tk, pa, 'in2')
        yang.key(tk, pb, 'in2')
        yin.key(tk + step * 0.5, 'float_guard', 'out')
        yang.key(tk + step * 0.5, 'float_guard', 'out')
        hp = yin.joint(tk, 'hand_f' if pa == 'jab' else 'hand_b')
        hq = yang.joint(tk, 'hand_f' if pb == 'jab' else 'hand_b')
        cpt = tuple((hp + hq) / 2)
        s.fxadd(E.Sparks(tk, cpt, VIOLET if k % 2 else GOLD, n=10, speed=700, life=0.25, seed=600 + k))
        s.fxadd(E.Flash(tk, cpt, WHITE, size=60, life=0.12, rays=4, seed=k))
        if k % 3 == 0:
            F.shake(tk, 0.12)
    F.sfx(T2 + 0.25, 'barrage', amp=0.9, dur=nb * step)
    cam.key(T2, zmul=1.0)
    cam.key(T2 + 0.4, zmul=(1.5, 'io'))
    cam.key(T2 + 0.25 + nb * step, zmul=(1.5, 'lin'))
    cam.key(T2 + 0.6 + nb * step, zmul=(1.0, 'io'))
    tb = T2 + 0.25 + nb * step + 0.05
    F.strike(tb + 0.15, yang, yin, 'kick_high', 'foot_b', 'hit_air', 'chest', windup='kick_round_ch',
             wind_t=0.14, kind='hit', power=1.3, air=True, recover='float_guard', rec_t=0.4, place=False)
    yx = yin.v(tb + 0.15, 'x')
    yin.key(tb + 0.17, x=(yx, 'lin'))
    yin.key(tb + 0.7, 'float_back', 'io', x=(yx - fy * 330, 'out'))
    yin.key(tb + 0.95, 'float_guard', 'io')
    # --- time stop -----------------------------------------------------------
    TS = tb + 1.05
    gx, gy = yang.v(TS, 'x'), yang.v(TS, 'y')
    yx, yy = yin.v(TS, 'x'), yin.v(TS, 'y')
    yang.key(TS - 0.1, 'float_guard')
    yang.key(TS + 0.3, 'superman', 'out', x=(gx + (yx - gx) * 0.4, 'in2'), rot=(-70.0, 'io'), ghost=(0.6, 'lin'))
    yin.key(TS, 'float_guard', eye=(1.2, 'lin'))
    yin.key(TS + 0.15, P('point', fa1=110), 'snap', eye=(2.6, 'out'))
    F.sfx(TS + 0.15, 'timestop', amp=1.0)
    fx.key(TS + 0.15, invert=0.0, desat=0.0)
    fx.key(TS + 0.3, invert=(1.0, 'in'), desat=(0.25, 'in'))
    frozen0, frozen1 = TS + 0.3, TS + 2.3
    yang.hold(frozen0, frozen1)
    s.fxadd(E.Ring(TS + 0.2, ('yin', 'hand_f'), WHITE, r0=10, r1=2400, life=0.5, width=8))
    # Yin moves freely
    gxf, gyf = yang.v(frozen0, 'x'), yang.v(frozen0, 'y')
    gface = yang.v(frozen0, 'face')
    behind = gxf - gface * 150
    F.teleport(yin, TS + 0.45, behind, y=gyf - 20, dur=0.05)
    yin.key(TS + 0.5, 'float_guard', face=gface)
    marks = []
    for (tk, pose, j, wu) in ((TS + 0.75, 'palm', 'hand_f', 'windup'), (TS + 1.05, 'kick_round', 'foot_b', 'kick_round_ch'),
                              (TS + 1.35, 'hammer', 'hand_f', 'hammer_up')):
        yin.key(tk - 0.12, wu, 'io')
        yin.key(tk, pose, 'in2')
        yin.key(tk + 0.12, 'float_guard', 'io')
        s.fxadd(E.Mark(tk, frozen1 + 0.05, (yin.id, j), VIOLET))
        s.fxadd(E.Flash(tk, (yin.id, j), VIOLET, size=50, life=0.15))
        F.sfx(tk, 'tick', amp=0.8)
        marks.append((yin.id, j, tk))
    F.teleport(yin, TS + 1.6, yx, y=yy, dur=0.05)
    yin.key(TS + 1.66, 'float_guard', face=-gface)
    yin.key(TS + 1.95, P('point', fa1=100, fa2=20), 'snap')
    F.sfx(TS + 1.95, 'snap', amp=1.0)
    fx.key(frozen1 - 0.05, invert=(1.0, 'lin'), desat=(0.25, 'lin'))
    fx.key(frozen1 + 0.05, invert=(0.0, 'lin'), desat=(0.0, 'lin'))
    F.sfx(frozen1, 'timeresume', amp=1.0)
    # all three hits land at once
    tr = frozen1 + 0.05
    for (_, j, tk) in marks:
        s.fxadd(E.Flash(tr, (lambda sim, tt, j=j, tk=tk: sim.joint('yin', j, tk)), VIOLET, size=220, life=0.45))
        s.fxadd(E.Sparks(tr, (lambda sim, tt, j=j, tk=tk: sim.joint('yin', j, tk)), VIOLET, n=26, speed=1100,
                         life=0.5, seed=int(tk * 10)))
    F.shake(tr, 1.1)
    F.sfx(tr, 'hit_triple', amp=1.0)
    s.speed.hitstop(tr, frames=8)
    ast = (gxf - gface * 950, gyf + 40)
    s.fxadd(E.Asteroid(P0, tr + 0.7, ast, 120, seed=77, col=(0.2, 0.18, 0.25), drift=(0, 0)))
    yang.key(tr, x=(gxf, 'lin'), y=(gyf, 'lin'), rot=(-70.0, 'lin'), ghost=(0.0, 'lin'))
    yang.key(tr + 0.05, 'hit_heavy', 'snap')
    yang.key(tr + 0.7, 'hit_heavy', x=(ast[0] + gface * 60, 'in2'), y=(ast[1], 'lin'), rot=(-70 - gface * 300, 'lin'))
    s.fxadd(E.Flash(tr + 0.7, ast, WHITE, size=380, life=0.6, rays=10))
    s.fxadd(E.Debris(tr + 0.7, ast, n=40, speed=900, size=22, col=(0.3, 0.27, 0.36), life=3.0, grav=0,
                     ground=False, spread=360))
    s.fxadd(E.Dust(tr + 0.7, ast, n=24, spread=300, col=(0.45, 0.42, 0.55), life=2.5, size=90, speed=600,
                   alpha=0.5, rise=0))
    F.shake(tr + 0.7, 0.9)
    F.sfx(tr + 0.7, 'boom_big', amp=1.0)
    F.sfx(tr + 0.72, 'debris', amp=0.9)
    # --- Yang returns with a nova ---------------------------------------------
    YR = tr + 1.1
    yang.key(YR, 'hit_heavy', rot=(-70 - gface * 300, 'lin'))
    yang.key(YR + 0.4, 'float', 'io', rot=(-gface * 360, 'io'), x=(ast[0] + gface * 150, 'io'))
    yang.key(YR + 0.4005, rot=(0.0, 'hold'))
    yang.key(YR + 0.5, face=-gface)
    yang.key(YR + 0.6, 'crouch', 'io', aura=(1.0, 'io'))
    yang.key(YR + 0.95, 'roar', 'snap', aura=(1.8, 'out'), glowbody=(0.6, 'out'), eye=(2.4, 'out'))
    F.sfx(YR + 0.9, 'roar', amp=1.0)
    s.fxadd(E.Nova(YR + 0.95, ('yang', 'chest'), GOLD, r1=2400, life=1.2))
    s.fxadd(E.Ring(YR + 0.95, ('yang', 'chest'), WHITE, r0=20, r1=2200, life=1.1, width=10))
    F.shake(YR + 0.95, 0.9)
    F.sfx(YR + 0.95, 'nova', amp=1.0)
    yx = yin.v(YR + 1.0, 'x')
    yin.key(YR + 1.05, 'guard_x', 'snap', x=(yx, 'lin'))
    yin.key(YR + 1.5, x=(yx + gface * 180, 'out'))
    yang.key(YR + 1.5, 'float_guard', 'io', aura=(1.3, 'io'), glowbody=(0.3, 'io'), eye=(1.4, 'io'))
    # combo
    t = YR + 1.7
    yx = yin.v(t, 'x')
    F.teleport(yang, t, yx - gface * 110, dur=0.05)
    yang.key(t + 0.05, 'float_guard')
    yin.key(t, 'float_guard', 'io')
    F.strike(t + 0.18, yang, yin, 'palm', 'hand_f', 'hit_body', 'chest', windup='windup', wind_t=0.1,
             kind='hit', power=1.0, recover=None, air=True)
    F.strike(t + 0.4, yang, yin, 'knee', 'knee_f', 'hit_body', 'chest', windup='float_guard', wind_t=0.1,
             kind='hit', power=1.0, recover=None, air=True)
    F.strike(t + 0.72, yang, yin, 'kick_round', 'foot_b', 'hit_heavy', 'chest', windup='kick_round_ch',
             wind_t=0.15, kind='hit', power=1.5, recover='float_guard', rec_t=0.5, air=True)
    yx, yy = yin.v(t + 0.72, 'x'), yin.v(t + 0.72, 'y')
    yin.key(t + 0.74, x=(yx, 'lin'), y=(yy, 'lin'), rot=(0.0, 'lin'))
    yin.key(t + 1.4, 'tuck', 'io', x=(yx - gface * 560, 'out'), y=(yy - 60, 'out'), rot=(-gface * 540, 'out'))
    yin.key(t + 1.7, 'float_back', 'io', rot=(-gface * 720, 'io'))
    yin.key(t + 1.7005, rot=(0.0, 'hold'))
    for k in range(6):
        s.fxadd(E.Sparks(t + 1.1 + k * 0.08, ('yin', 'foot_f'), VIOLET, n=6, speed=400, spread=60,
                         ang=90 - gface * 90, life=0.3, seed=800 + k))
    F.sfx(t + 1.1, 'skid', amp=0.8)
    # --- dark vortex vs giant light blade ----------------------------------------
    VX = t + 1.9
    yin.key(VX, 'float_back')
    yin.key(VX + 0.3, 'cast_up', 'io', aura=(1.4, 'io'), eye=(2.0, 'io'))
    s.fxadd(E.Vortex(VX + 0.3, VX + 1.4, VX + 1.85, lambda sim, tt: sim.joint('yin', 'head', tt) + np.array([0, 120]),
                     ('yang', 'chest'), VIOLET, rmax=85))
    F.sfx(VX + 0.3, 'vortex', amp=1.0, dur=1.6)
    for k in range(5):
        F.shake(VX + 0.4 + k * 0.2, 0.15)
    yin.key(VX + 1.3, 'hammer_up', 'io')
    yin.key(VX + 1.42, 'double_palm', 'snap')
    F.sfx(VX + 1.42, 'throw', amp=1.0)
    yang.key(VX + 0.5, 'float_guard', 'io', blade=(0.0, 'lin'))
    yang.key(VX + 1.2, 'slash_up', 'io', blade=(3.4, 'out'), aura=(1.5, 'io'), glowbody=(0.4, 'io'))
    F.sfx(VX + 1.0, 'blade_on', amp=1.0)
    yang.key(VX + 1.85, 'slash_down', 'in2')
    F.sfx(VX + 1.78, 'slash_big', amp=1.0)
    vp = lambda sim, tt: sim.joint('yang', 'chest', VX + 1.85) + np.array([-sim.actors['yang'].face[sim.frame_of(VX + 1.85)] * -60, 30])
    s.fxadd(E.Flash(VX + 1.85, ('yang', 'chest'), WHITE, size=380, life=0.5, rays=12))
    gxv, gyv = yang.v(VX + 1.85, 'x'), yang.v(VX + 1.85, 'y')
    gf = yang.v(VX + 1.85, 'face')
    for k, dy in enumerate((260, -260)):
        s.fxadd(E.Orb(VX + 1.87, VX + 2.2, (gxv, gyv + 60), (gxv - gf * 520, gyv + dy), VIOLET, (0.02, 0, 0.05), r=45))
        boom(s, F, VX + 2.2 + k * 0.06, (gxv - gf * 520, gyv + dy), VIOLET, 1.4, ground=False, sound='explode')
    F.shake(VX + 1.85, 0.8)
    s.speed.hitstop(VX + 1.85, frames=6)
    yang.key(VX + 2.3, 'float_guard', 'io', blade=(1.0, 'io'))
    # Yin's surprise follow-up, blocked by the blade
    t2 = VX + 2.45
    F.teleport(yin, t2, gxv + gf * 120, y=gyv, dur=0.05)
    yin.key(t2 + 0.05, 'float_guard', face=-gf)
    F.strike(t2 + 0.2, yin, yang, 'cross', 'hand_b', 'slash_across', 'hand_f', windup='windup', wind_t=0.1,
             kind='clash', power=1.3, air=True, recover=None)
    for a, sg in ((yin, gf), (yang, -gf)):
        x0 = a.v(t2 + 0.2, 'x')
        a.key(t2 + 0.22, x=(x0, 'lin'))
        a.key(t2 + 0.7, 'float_back', 'out', x=(x0 + sg * 260, 'out'))
    yang.key(t2 + 0.8, blade=(0.0, 'io'))
    F.sfx(t2 + 0.8, 'blade_off', amp=0.6)
    t = t2 + 0.9 - 1.9 + 0.2
    # --- exhaustion --------------------------------------------------------------
    TI = t + 1.9
    for a in (yin, yang):
        a.key(TI, 'float', 'io')
        a.key(TI + 0.4, 'tired', 'io', aura=(0.5, 'io'), glowbody=(0.0, 'io'), eye=(1.0, 'io'), idle=(1.0, 'lin'))
        a.key(TI + 1.8, 'tired')
        a.key(TI + 2.3, 'float', 'io', idle=(0.0, 'lin'))
    F.sfx(TI + 0.3, 'breath', amp=0.7, dur=1.6)
    cam.key(TI, zmul=1.0)
    cam.key(TI + 1.8, zmul=(1.15, 'io'))
    cam.key(TI + 2.6, zmul=(1.0, 'io'))
    FC = TI + 2.6
    CX2 = (yin.v(FC, 'x') + yang.v(FC, 'x')) / 2
    for a in (yin, yang):
        sg = 1.0 if a.v(FC, 'x') > CX2 else -1.0
        a.key(FC, 'float_back', 'io', x=(CX2 + sg * 650, 'io'), y=(CY, 'io'), face=-sg)
    return FC + 0.1


def finale(s, F, yin, yang, FC):
    fx, cam = s.fx, s.cam
    CX = (yin.v(FC, 'x') + yang.v(FC, 'x')) / 2
    CY = yin.v(FC, 'y')
    ult = P('windup', fa1=-55, fa2=112, ba1=62, ba2=96, lean=8)
    for a in (yin, yang):
        a.key(FC + 0.3, ult, 'io', charge=0.0, chargeat=0.0, aura=(1.2, 'io'))
        a.key(FC + 3.0, ult, charge=(58.0, 'in'), aura=(2.3, 'in'), glowbody=(0.8, 'in'), eye=(2.4, 'in'))
        s.fxadd(E.ChargeLines(FC + 0.3, FC + 3.0, (a.id, 'hand_f'), a.pal['energy'], radius=560, n=40,
                              seed=90 + int(a is yin)))
        s.fxadd(E.SpaceCracks(FC + 1.6, FC + 3.2, (a.id, 'chest'), a.pal['energy'], n=6, length=600,
                              seed=5 + int(a is yin), width=2))
    F.sfx(FC + 0.3, 'charge_big', amp=1.0, dur=2.8)
    F.sfx(FC + 0.3, 'rumble', amp=0.9, dur=2.8)
    for k in range(10):
        F.shake(FC + 0.5 + k * 0.25, 0.08 + 0.035 * k)
    # cinematic cuts during the charge
    yj = yin.joint(FC + 1.0, 'chest')
    gj = yang.joint(FC + 1.8, 'chest')
    cam.key(FC + 0.9, w=(0.0, 'hold'))
    cam.key(FC + 0.92, w=(1.0, 'hold'), x=(yj[0], 'hold'), y=(yj[1] + 20, 'hold'), zoom=(2.6, 'hold'))
    cam.key(FC + 1.65, x=(yj[0] + 10, 'lin'), zoom=(2.9, 'lin'))
    cam.key(FC + 1.67, x=(gj[0], 'hold'), y=(gj[1] + 20, 'hold'), zoom=(2.6, 'hold'))
    cam.key(FC + 2.4, x=(gj[0] - 10, 'lin'), zoom=(2.9, 'lin'))
    cam.key(FC + 2.42, x=(CX, 'hold'), y=(CY + 30, 'hold'), zoom=(0.95, 'hold'))
    cam.key(FC + 3.0, zoom=(1.05, 'io'))
    # --- the rush --------------------------------------------------------------
    RU = FC + 3.05
    sup = P('superman')
    loc = yin.local_joint(sup, 'hand_f', rot=-90.0, g=0.0)
    MEET = RU + 0.5
    for a in (yin, yang):
        sg = 1.0 if a.v(FC, 'x') > CX else -1.0
        a.key(RU, ult, x=(a.v(RU, 'x'), 'lin'), y=(CY, 'lin'), rot=(0.0, 'lin'))
        a.key(RU + 0.12, sup, 'snap', rot=(-90.0, 'out'), ghost=(1.0, 'lin'))
        a.key(MEET, sup, x=(CX + sg * (loc[0] - 3), 'in2'), y=(CY - loc[1], 'lin'))
    F.sfx(RU, 'dash', amp=1.0)
    fx.key(RU, speed=0.0, speedang=0.0)
    fx.key(RU + 0.15, speed=(1.0, 'io'))
    fx.key(MEET + 0.3, speed=(0.0, 'io'))
    cam.key(MEET - 0.05, x=(CX, 'lin'), zoom=(1.25, 'io'))
    s.speed.slow(MEET - 0.12, MEET + 0.25, 0.12, ramp=0.08)
    cpt = (CX, CY)

    def cpf(sim, t):
        return np.array([CX, CY])

    END = MEET + 3.4
    s.fxadd(E.ClashBall(MEET, END + 0.2, cpf, VIOLET, GOLD, size=62, seed=66))
    s.fxadd(E.Flash(MEET, cpt, WHITE, size=300, life=0.22, rays=12))
    for k in range(5):
        s.fxadd(E.Ring(MEET + k * 0.5, cpt, [VIOLET, GOLD][k % 2], r0=30, r1=2200, life=1.2, width=7))
    s.fxadd(E.SpaceCracks(MEET, END + 0.3, cpt, WHITE, n=8, length=1300, seed=12, width=3))
    F.shake(MEET, 1.2)
    F.sfx(MEET, 'boom_huge', amp=1.0)
    F.sfx(MEET + 0.1, 'struggle', amp=1.0, dur=3.3)
    s.speed.hitstop(MEET, frames=10)
    for k in range(int(3.3 / 0.28)):
        F.shake(MEET + 0.3 + k * 0.28, 0.35)
    for a in (yin, yang):
        sg = 1.0 if a.v(FC, 'x') > CX else -1.0
        x0 = CX + sg * (loc[0] - 3)
        a.key(MEET + 0.3, ghost=(0.0, 'lin'))
        for k in range(8):
            tk = MEET + 0.4 + k * 0.38
            a.key(tk, x=(x0 + sg * (6 if k % 2 else -4), 'io'))
        a.key(MEET + 0.2, aura=(1.4, 'io'), glowbody=(0.4, 'io'))
        a.key(MEET + 1.5, aura=(1.7, 'io'), glowbody=(0.5, 'io'))
        a.key(END, aura=(2.2, 'in'))
    fx.key(MEET, chroma=0.3)
    fx.key(END, chroma=(0.8, 'in'))
    fx.key(MEET + 2.6, white=0.0)
    fx.key(END, white=(1.0, 'in'))
    cam.key(MEET + 0.2, zoom=(1.25, 'lin'))
    cam.key(END, zoom=(1.7, 'in'), x=(CX, 'lin'), y=(CY, 'lin'))
    F.sfx(END, 'whiteout', amp=1.0)
    # --- fusion ending -----------------------------------------------------------
    EN = END + 0.05
    for e in s.effects:
        if isinstance(e, E.Asteroid):
            e.t1 = min(e.t1, EN)
    fx.key(EN + 0.3, white=(1.0, 'lin'), chroma=(0.0, 'lin'), scene=(2.0, 'lin'), letterbox=0.0)
    fx.key(EN + 0.31, scene=(0.0, 'hold'))
    fx.key(EN + 1.5, white=(0.0, 'io'))
    fx.key(EN + 1.0, letterbox=(1.0, 'io'))
    for a in (yin, yang):
        a.key(EN, vis=(1.0, 'lin'), ghost=0.0)
        a.key(EN + 0.01, vis=(0.0, 'hold'), aura=(0.0, 'hold'), glowbody=(0.0, 'hold'), charge=(0.0, 'hold'))
    cam.key(EN + 0.3, x=(CX, 'hold'), y=(CY, 'hold'), zoom=(0.78, 'hold'))
    s.fxadd(E.Comets(EN + 1.0, EN + 5.0, (CX, CY), 620, VIOLET, GOLD, (0.05, 0.02, 0.1), WHITE, turns=4.0))
    F.sfx(EN + 1.0, 'swirl', amp=0.9, dur=4.0)
    m = EN + 5.0
    s.fxadd(E.Flash(m, (CX, CY), WHITE, size=700, life=0.8, rays=12))
    s.fxadd(E.Ring(m, (CX, CY), WHITE, r0=20, r1=1400, life=1.2, width=8))
    F.sfx(m, 'chime', amp=1.0)
    fx.key(m - 0.01, yy=0.0, yyr=470.0, yyx=CX, yyy=CY, yyrot=0.0, yysep=0.0)
    fx.key(m + 0.25, yy=(1.0, 'out'))
    fx.key(m + 3.6, yyrot=(90.0 + 720.0, 'out'))
    fx.key(m + 3.2, yysep=0.0)
    fx.key(m + 4.2, yysep=(0.2, 'io'))
    r = 470.0
    for a, sx, face in ((yang, -1, 1.0), (yin, 1, -1.0)):
        a.key(m + 4.3, 'float', x=(CX + sx * r / 2, 'hold'), y=(CY - 12, 'hold'), rot=(0.0, 'hold'),
              g=(0.0, 'hold'), face=face, eye=(0.0, 'hold'), idle=(1.0, 'hold'))
        a.key(m + 4.31, vis=(0.0, 'lin'))
        a.key(m + 5.2, vis=(1.0, 'io'))
        a.key(m + 5.6, eye=(0.8, 'io'), aura=(0.25, 'io'))
    F.sfx(m + 4.4, 'resolve', amp=0.8)
    s.fxadd(E.Text(m + 5.6, m + 30, 'BALANCE', size=54, y=0.948, col=(0.95, 0.93, 1.0), glow=(0.6, 0.45, 1.0),
                   spacing=0.55, fade=1.4))
    cam.key(m + 4.3, zoom=(0.8, 'lin'))
    cam.key(m + 16, zoom=(0.9, 'lin'))
    fx.key(m + 1.0, vign=0.55)
    fx.key(m + 6.0, vign=(0.8, 'io'))
    s.ending_t = m
