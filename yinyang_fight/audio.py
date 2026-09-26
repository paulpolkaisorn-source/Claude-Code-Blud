"""Procedural sound design: every SFX cue from the choreography is synthesized with numpy."""
import math
import wave

import numpy as np

from .config import AUDIO_SR as SR, FPS, NFRAMES

_rng = np.random.default_rng(2024)


def _n(sec):
    return max(1, int(sec * SR))


def _t(sec):
    return np.arange(_n(sec)) / SR


def noise(sec):
    return _rng.standard_normal(_n(sec)).astype(np.float64)


def band(x, lo, hi, soft=0.15):
    """Band-pass via FFT mask with soft edges."""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    m = np.ones_like(f)
    if lo > 0:
        m *= 1 / (1 + (lo / np.maximum(f, 1e-3)) ** (2 / soft * 0.3))
    if hi < SR / 2:
        m *= 1 / (1 + (f / hi) ** (2 / soft * 0.3))
    return np.fft.irfft(X * m, len(x))


def lp(x, hi):
    return band(x, 0, hi)


def hp(x, lo):
    return band(x, lo, SR / 2)


def dec(sec, tau, attack=0.002):
    t = _t(sec)
    e = np.exp(-t / tau)
    a = np.minimum(1.0, t / max(attack, 1e-4))
    return e * a


def swell(sec, peak=0.5, p=2.0):
    t = _t(sec) / sec
    return np.where(t < peak, (t / peak) ** p, ((1 - t) / (1 - peak)) ** 1.2)


def sweep(sec, f0, f1, shape='exp', wave_='sine'):
    t = _t(sec)
    u = t / sec
    f = f0 * (f1 / f0) ** u if shape == 'exp' else f0 + (f1 - f0) * u
    ph = 2 * np.pi * np.cumsum(f) / SR
    if wave_ == 'saw':
        return 2 * ((ph / (2 * np.pi)) % 1.0) - 1
    return np.sin(ph)


def tone(sec, f):
    return np.sin(2 * np.pi * f * _t(sec))


def norm(x, peak=1.0):
    m = np.max(np.abs(x)) + 1e-9
    return x / m * peak


def fit(*xs):
    n = max(len(x) for x in xs)
    out = np.zeros(n)
    for x in xs:
        out[:len(x)] += x
    return out


# ---------------------------------------------------------------------------
def s_hit(power=1.0):
    L = 0.35 + 0.25 * power
    thump = sweep(L, 110 + 30 * power, 40) * dec(L, 0.09 + 0.06 * power)
    body = band(noise(L), 150, 900) * dec(L, 0.05 + 0.03 * power)
    click = band(noise(L), 1500, 7000) * dec(L, 0.012)
    return norm(fit(thump * 1.0, norm(body) * 0.7, norm(click) * 0.5))


def s_block(power=1.0):
    L = 0.35
    thud = sweep(L, 160, 70) * dec(L, 0.05)
    clack = band(noise(L), 900, 4500) * dec(L, 0.02)
    ring = (tone(L, 1250) + 0.6 * tone(L, 1870)) * dec(L, 0.09) * 0.25
    return norm(fit(thud * 0.8, norm(clack) * 0.8 * (0.6 + 0.4 * power), ring))


def s_clash(power=1.0, big=False):
    L = 1.2 if big else 0.7
    parts = [523, 1318, 2170, 3057, 4210]
    ring = sum(tone(L, f) * dec(L, 0.35 / (1 + i * 0.4)) / (1 + i) for i, f in enumerate(parts))
    burst = band(noise(L), 800, 9000) * dec(L, 0.03)
    th = sweep(L, 120, 38) * dec(L, 0.18)
    x = fit(norm(ring) * 0.5, norm(burst) * 0.7, th * 0.9)
    if big:
        x = fit(x, s_boom(1.4) * 0.8)
    return norm(x)


def s_whoosh(sec=0.22, lo=300, hi=3200, amp=1.0):
    x = band(noise(sec), lo, hi) * swell(sec, 0.55)
    return norm(x) * amp


def s_boom(sec=1.3, sub=50):
    x = lp(noise(sec), 380) * dec(sec, sec * 0.28, 0.005)
    s = sweep(sec, sub * 1.6, sub * 0.7) * dec(sec, sec * 0.3)
    c = band(noise(sec), 1000, 6000) * dec(sec, 0.04)
    return norm(fit(norm(x) * 0.9, s * 0.8, norm(c) * 0.3))


def s_crack():
    L = 1.2
    b = band(noise(L), 300, 8000) * dec(L, 0.03)
    r = lp(noise(L), 150) * dec(L, 0.4)
    cr = np.zeros(_n(L))
    for _ in range(30):
        i = int(_rng.uniform(0, 0.5) * SR * (_rng.uniform() ** 2))
        cr[i:i + 60] += _rng.uniform(-1, 1) * np.exp(-np.arange(min(60, len(cr) - i)) / 8)
    return norm(fit(norm(b), norm(r) * 0.8, norm(band(cr, 800, 9000)) * 0.4))


def s_debris(sec=1.3):
    x = np.zeros(_n(sec))
    for _ in range(26):
        i = int(_rng.uniform(0, 0.85) * len(x))
        k = s_hit(0.2)[:int(0.12 * SR)] * _rng.uniform(0.2, 0.6)
        k = band(k, 200, 3000)
        x[i:i + len(k)] += k[:len(x) - i]
    return norm(x) * 0.8


def s_rumble(sec=1.5):
    x = lp(noise(sec), 110)
    mod = 0.6 + 0.4 * np.sin(2 * np.pi * 3.1 * _t(sec)) * np.sin(2 * np.pi * 0.7 * _t(sec))
    return norm(x * mod * swell(sec, 0.3, 1.5))


def s_charge(sec=1.4, base=80, top=240):
    a = sweep(sec, base, top, wave_='saw') + sweep(sec, base * 1.01, top * 1.012, wave_='saw')
    a = lp(a, 2200)
    vib = 1 + 0.3 * np.sin(2 * np.pi * 7 * _t(sec))
    hiss = hp(noise(sec), 3000) * np.linspace(0, 1, _n(sec)) ** 2
    env = np.linspace(0.15, 1, _n(sec)) ** 1.5
    env[-int(0.05 * SR):] *= np.linspace(1, 0, int(0.05 * SR))
    return norm(fit(norm(a) * vib * env, norm(hiss) * 0.35 * env))


def s_roar(sec=1.3):
    x = band(noise(sec), 90, 1400) * swell(sec, 0.25, 1.2)
    s = tone(sec, 55) * swell(sec, 0.25, 1.2)
    return norm(fit(norm(x), s * 0.6))


def s_shimmer(sec=0.9, fs=(2400, 3600, 4800), tau=0.35):
    x = sum(tone(sec, f) * (1 + 0.3 * np.sin(2 * np.pi * 9 * _t(sec))) / (i + 1) for i, f in enumerate(fs))
    return norm(x * dec(sec, tau, 0.02)) * 0.6


def s_zap(sec=0.45):
    saw = sweep(sec, 140, 90, wave_='saw')
    buzz = hp(noise(sec), 2500) * (np.sin(2 * np.pi * 60 * _t(sec)) > 0)
    return norm(fit(norm(saw) * 0.6, norm(buzz) * 0.7) * dec(sec, 0.18, 0.003))


def s_crackle(sec=0.8, dens=180):
    x = np.zeros(_n(sec))
    for _ in range(int(dens * sec)):
        i = int(_rng.uniform(0, 1) * (len(x) - 50))
        x[i:i + 30] += _rng.uniform(-1, 1) * np.exp(-np.arange(30) / 5)
    return norm(hp(x, 1800)) * 0.7


def s_thunder():
    L = 3.2
    c = band(noise(L), 200, 9000) * dec(L, 0.05)
    r = lp(noise(L), 200)
    mod = np.abs(lp(noise(L), 6)) * 8
    r = r * np.clip(mod, 0, 1) * dec(L, 1.0, 0.1)
    return norm(fit(norm(c) * 0.8, norm(r)))


def s_pad(sec, freqs=(55, 82.5, 110, 165), fade=1.5):
    t = _t(sec)
    x = sum(np.sin(2 * np.pi * f * t + 0.3 * np.sin(2 * np.pi * 0.2 * t * (i + 1))) +
            0.5 * np.sin(2 * np.pi * f * 1.004 * t) for i, f in enumerate(freqs))
    env = np.minimum(1, t / fade) * np.minimum(1, (sec - t) / fade)
    return norm(lp(x, 1500) * env) * 0.7


def s_bell(sec=3.5, fs=(523.25, 659.25, 783.99, 1046.5)):
    x = np.zeros(_n(sec))
    for f in fs:
        for h, a in ((1, 1.0), (2.76, 0.35), (5.4, 0.12)):
            x += a * tone(sec, f * h) * dec(sec, 1.2 / h, 0.005)
    return norm(x) * 0.8


def s_teleport():
    L = 0.25
    return norm(fit(sweep(L, 2200, 280) * dec(L, 0.07), norm(band(noise(L), 1000, 8000)) * 0.4 * dec(L, 0.04)))


def s_snap():
    L = 0.2
    return norm(band(noise(L), 1400, 5000) * dec(L, 0.012))


def s_tick():
    L = 0.1
    return norm(tone(L, 3200) * dec(L, 0.01) + band(noise(L), 3000, 9000) * dec(L, 0.004))


def s_barrage(sec):
    x = np.zeros(_n(sec + 0.4))
    n = int(sec / 0.085)
    for k in range(n):
        h = (s_hit(0.35) if k % 2 else s_block(0.5)) * _rng.uniform(0.5, 0.8)
        i = int(k * 0.085 * SR)
        x[i:i + len(h)] += h[:len(x) - i]
    return norm(x)


def s_beamloop(sec, rise=0.0):
    t = _t(sec)
    nz = band(noise(sec), 70, 2200)
    saw = sweep(sec, 55, 55 * (1 + rise), wave_='saw')
    trem = 1 + 0.25 * np.sin(2 * np.pi * 11 * t)
    env = np.minimum(1, t / 0.2) * np.minimum(1, (sec - t) / 0.3)
    env *= 1 + rise * t / sec
    return norm(fit(norm(nz) * trem, norm(lp(saw, 900)) * 0.6) * env)


def s_timestop():
    L = 1.6
    rev = hp(noise(0.6), 2500) * np.linspace(0, 1, _n(0.6)) ** 3
    bw = sweep(1.0, 120, 45) * dec(1.0, 0.5)
    x = np.zeros(_n(L))
    x[:len(rev)] += norm(rev) * 0.7
    x[len(rev):len(rev) + len(bw)] += bw[:len(x) - len(rev)]
    return norm(x)


def s_swirl(sec):
    x = np.zeros(_n(sec + 0.5))
    tt = 0.0
    k = 0
    while tt < sec:
        gap = 0.45 * (1 - tt / sec) + 0.07
        w = s_whoosh(0.3, 250 + 60 * k % 900, 2500, 0.5 + 0.5 * tt / sec)
        i = int(tt * SR)
        x[i:i + len(w)] += w[:len(x) - i]
        tt += gap
        k += 1
    return norm(x)


def s_breath(sec):
    x = np.zeros(_n(sec))
    for k in range(int(sec / 0.7)):
        b = band(noise(0.45), 400, 2500) * swell(0.45, 0.35) * 0.4
        i = int(k * 0.7 * SR)
        x[i:i + len(b)] += b[:len(x) - i]
    return x


def make(snd, kw):
    amp = kw.get('amp', 1.0)
    dur = kw.get('dur', 1.0)
    power = kw.get('power', 1.0)
    if snd == 'hit':
        x = s_hit(power)
    elif snd == 'block':
        x = s_block(power)
    elif snd == 'clash':
        x = s_clash(power)
    elif snd == 'clash_big':
        x = s_clash(1.5, big=True)
    elif snd == 'whoosh':
        x = s_whoosh(0.2)
    elif snd == 'whoosh_big':
        x = s_whoosh(0.55, 150, 1800)
    elif snd in ('dash', 'throw'):
        x = fit(s_whoosh(0.3, 200, 2500), s_whoosh(0.15, 1500, 7000) * 0.4)
    elif snd == 'zip':
        x = s_whoosh(0.12, 900, 7000)
    elif snd == 'jump':
        x = s_whoosh(0.18, 400, 2500) * 0.6
    elif snd == 'land':
        x = fit(s_hit(0.3) * 0.7, norm(lp(noise(0.5), 900) * dec(0.5, 0.12)) * 0.4)
    elif snd == 'skid':
        g = band(noise(0.7), 500, 4500) * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 37 * _t(0.7))))
        x = norm(g * dec(0.7, 0.25, 0.01)) * 0.7
    elif snd == 'crack':
        x = s_crack()
    elif snd == 'slam':
        x = fit(s_hit(1.4), s_boom(0.8) * 0.5)
    elif snd == 'boom':
        x = s_boom(1.3)
    elif snd == 'boom_big':
        x = s_boom(2.2, 42)
    elif snd == 'boom_huge':
        x = fit(s_boom(3.6, 36), s_crackle(1.0) * 0.3)
    elif snd == 'explode':
        x = fit(s_boom(1.0, 60), s_crackle(0.5) * 0.35)
    elif snd == 'debris':
        x = s_debris()
    elif snd == 'rumble':
        x = s_rumble(dur)
    elif snd == 'eye':
        x = s_shimmer(1.0)
    elif snd == 'cloth':
        x = s_whoosh(0.15, 1000, 4000) * 0.4
    elif snd == 'power_small':
        x = fit(norm(sweep(0.8, 180, 520) * swell(0.8, 0.7)) * 0.6, s_roar(0.8) * 0.4)
    elif snd == 'charge':
        x = s_charge(dur)
    elif snd == 'charge_big':
        x = fit(s_charge(dur, 50, 200), s_charge(dur, 75, 300) * 0.6, s_rumble(dur) * 0.5)
    elif snd == 'roar':
        x = s_roar(1.3)
    elif snd == 'orb_fire':
        x = fit(sweep(0.35, 700, 140) * dec(0.35, 0.12), s_whoosh(0.3) * 0.5)
    elif snd == 'blade_on':
        x = fit(norm(sweep(0.45, 300, 1300) * swell(0.45, 0.8)) * 0.6, s_shimmer(0.6, (1800, 2700)) * 0.5)
    elif snd == 'blade_off':
        x = norm(sweep(0.4, 1200, 250) * dec(0.4, 0.15)) * 0.5
    elif snd in ('slash', 'slash_big'):
        L = 0.35 if snd == 'slash' else 0.6
        x = fit(s_whoosh(L, 2000, 9000), s_shimmer(L + 0.4, (3100, 4700), 0.2) * 0.5)
        if snd == 'slash_big':
            x = fit(x, s_boom(0.6) * 0.4)
    elif snd == 'dark_arm':
        x = norm(np.tanh(3 * tone(0.5, 70)) * swell(0.5, 0.2)) * 0.6
    elif snd == 'tendril':
        L = 1.1
        x = norm(band(noise(L), 150, 900) * (0.5 + 0.5 * np.sin(2 * np.pi * 9 * _t(L))) * swell(L, 0.2)) * 0.9
    elif snd == 'levitate':
        x = norm(sweep(1.0, 60, 110) * swell(1.0, 0.8)) * 0.6
    elif snd == 'rock_break':
        x = fit(s_crack(), s_debris(0.8) * 0.5)
    elif snd == 'pillar':
        x = fit(s_hit(0.8) * 0.7, norm(hp(noise(0.6), 3000) * dec(0.6, 0.15)) * 0.5)
    elif snd == 'thunder':
        x = s_thunder()
    elif snd == 'crackle':
        x = s_crackle(dur)
    elif snd == 'zap':
        x = fit(s_zap(), s_crackle(0.4) * 0.5)
    elif snd == 'spears_form':
        x = s_shimmer(1.1, (880, 1108, 1318, 1760), 0.6)
    elif snd == 'spear':
        x = fit(s_whoosh(0.14, 1500, 8000) * 0.7, s_shimmer(0.3, (2600,), 0.08) * 0.4)
    elif snd == 'shatter':
        x = fit(norm(hp(noise(0.4), 4000) * dec(0.4, 0.05)), s_shimmer(0.5, (3900, 5200, 6100), 0.1) * 0.6)
    elif snd == 'beam_fire':
        x = fit(s_whoosh(0.6, 120, 2500), s_boom(1.0) * 0.6)
    elif snd == 'beam_loop':
        x = s_beamloop(dur, 0.3)
    elif snd == 'struggle':
        x = fit(s_beamloop(dur, 0.8), s_crackle(dur, 90) * 0.35)
    elif snd == 'split':
        x = fit(s_crack(), s_rumble(2.4) * 0.8, s_debris(2.0) * 0.5)
    elif snd == 'eruption':
        x = fit(s_roar(1.6), s_boom(1.8) * 0.7)
    elif snd == 'teleport':
        x = s_teleport()
    elif snd == 'drone_in':
        x = s_pad(3.8, (55, 82.5, 110, 220), 1.2)
    elif snd == 'drone_space':
        x = s_pad(dur, (41.2, 61.7, 82.4, 123.5), 1.5)
    elif snd == 'barrage':
        x = s_barrage(dur)
    elif snd == 'timestop':
        x = s_timestop()
    elif snd == 'timeresume':
        x = fit(s_whoosh(0.5, 200, 6000), s_shatter_fallback())
    elif snd == 'tick':
        x = s_tick()
    elif snd == 'snap':
        x = s_snap()
    elif snd == 'hit_triple':
        x = np.zeros(_n(2.0))
        for k in range(3):
            h = s_hit(1.3)
            i = int(k * 0.05 * SR)
            x[i:i + len(h)] += h
        x = fit(x, s_boom(1.8) * 0.7)
    elif snd == 'nova':
        x = fit(s_boom(1.8), s_shimmer(1.5, (1200, 1800, 2400), 0.6) * 0.6)
    elif snd == 'vortex':
        L = dur
        x = norm(lp(noise(L), 300) * (0.6 + 0.4 * np.sin(2 * np.pi * 5 * _t(L))) + 0.5 * tone(L, 45)) * swell(L, 0.8)
    elif snd == 'breath':
        x = s_breath(dur)
    elif snd == 'whiteout':
        L = 4.0
        x = fit(s_boom(3.0, 32), norm(tone(L, 3950) * dec(L, 1.4, 0.3)) * 0.12)
    elif snd == 'swirl':
        x = s_swirl(dur)
    elif snd == 'chime':
        x = fit(s_bell(4.0), s_boom(1.2) * 0.3)
    elif snd == 'resolve':
        x = s_pad(7.0, (130.8, 196.0, 261.6, 329.6), 2.5) * 0.8
    elif snd == 'fade':
        x = np.zeros(10)
    else:
        raise KeyError(snd)
    return x * amp


def s_shatter_fallback():
    return fit(norm(hp(noise(0.4), 4000) * dec(0.4, 0.05)), s_shimmer(0.5, (3900, 5200, 6100), 0.1) * 0.6)


LEVELS = {  # per-sound mix gain
    'hit': 0.8, 'block': 0.6, 'clash': 0.7, 'clash_big': 0.9, 'whoosh': 0.35, 'whoosh_big': 0.45,
    'dash': 0.4, 'throw': 0.4, 'zip': 0.3, 'jump': 0.3, 'land': 0.45, 'skid': 0.35, 'crack': 0.7,
    'slam': 0.85, 'boom': 0.8, 'boom_big': 0.9, 'boom_huge': 1.0, 'explode': 0.7, 'debris': 0.4,
    'rumble': 0.45, 'eye': 0.35, 'cloth': 0.2, 'power_small': 0.45, 'charge': 0.45,
    'charge_big': 0.55, 'roar': 0.55, 'orb_fire': 0.45, 'blade_on': 0.4, 'blade_off': 0.3,
    'slash': 0.45, 'slash_big': 0.6, 'dark_arm': 0.4, 'tendril': 0.45, 'levitate': 0.35,
    'rock_break': 0.6, 'pillar': 0.55, 'thunder': 0.7, 'crackle': 0.3, 'zap': 0.55,
    'spears_form': 0.35, 'spear': 0.35, 'shatter': 0.4, 'beam_fire': 0.7, 'beam_loop': 0.5,
    'struggle': 0.6, 'split': 0.8, 'eruption': 0.8, 'teleport': 0.35, 'drone_in': 0.45,
    'drone_space': 0.35, 'barrage': 0.6, 'timestop': 0.7, 'timeresume': 0.6, 'tick': 0.4,
    'snap': 0.6, 'hit_triple': 0.95, 'nova': 0.8, 'vortex': 0.5, 'breath': 0.25, 'whiteout': 0.95,
    'swirl': 0.5, 'chime': 0.7, 'resolve': 0.55, 'fade': 0.0,
}


def ambience(sim, n):
    """Wind on the mountain, storm hiss in the sky, a low hum in space."""
    fr = np.arange(n) / SR * FPS
    fi = np.clip(fr.astype(int), 0, sim.F - 1)
    scene = sim.fx['scene'][fi]
    wind = sim.fx['wind'][fi]
    storm = sim.fx['storm'][fi]
    mtn = np.clip(1 - np.abs(scene - 1), 0, 1)
    cos = np.clip(scene - 1, 0, 1)
    base = noise(n / SR)
    w = band(base, 120, 900)
    gust = 0.6 + 0.4 * np.sin(2 * np.pi * 0.13 * np.arange(n) / SR) * np.sin(2 * np.pi * 0.047 * np.arange(n) / SR + 1)
    w = norm(w) * gust * (0.25 + 0.6 * wind) * mtn * (1 + 0.6 * storm)
    hiss = norm(band(noise(n / SR), 2000, 9000)) * 0.12 * storm * mtn
    t = np.arange(n) / SR
    hum = (np.sin(2 * np.pi * 41.2 * t) + 0.5 * np.sin(2 * np.pi * 61.8 * t)) * 0.18 * cos
    return (w * 0.16 + hiss + hum * 0.6)


def render_audio(sim, path, f0=0, f1=NFRAMES):
    total = NFRAMES / FPS
    n = int(total * SR)
    L = np.zeros(n)
    Rr = np.zeros(n)
    amb = ambience(sim, n)
    # silence ambience during white-outs and the very end
    fr = np.clip((np.arange(n) / SR * FPS).astype(int), 0, sim.F - 1)
    duck = 1 - np.clip(sim.fx['white'][fr], 0, 1) * 0.8
    duck *= 1 - np.clip(sim.fx['black'][fr], 0, 1)
    amb *= duck
    L += amb
    Rr += amb
    for e in sim.story.events:
        if e.kind != 'sfx':
            continue
        f = sim.frame_of(e.t)
        vt = f / FPS
        snd = e.kw['snd']
        x = make(snd, e.kw) * LEVELS.get(snd, 0.5)
        spd = float(sim.spd[min(f + 2, sim.F - 1)])
        if spd < 0.8 and snd not in ('drone_in', 'drone_space', 'resolve', 'chime'):
            # slow-motion: stretch and pitch down
            fac = max(0.35, math.sqrt(spd))
            idx = np.arange(0, len(x) - 1, fac)
            x = np.interp(idx, np.arange(len(x)), x)
        # pan from on-screen position
        px = e.kw.get('x', 0.0)
        pan = 0.0
        if px:
            pan = float(np.clip((px - sim.cx[f]) * sim.zoom[f] / 1100.0, -0.8, 0.8))
        gl = math.cos((pan + 1) * math.pi / 4)
        gr = math.sin((pan + 1) * math.pi / 4)
        i = int(vt * SR)
        if i >= n:
            continue
        m = min(len(x), n - i)
        L[i:i + m] += x[:m] * gl * 1.2
        Rr[i:i + m] += x[:m] * gr * 1.2
    st = np.stack([L, Rr], 1)
    # gentle bus compression + soft clip, then normalize to -1 dBFS
    env = np.abs(st).max(1)
    k = int(0.01 * SR)
    env = np.convolve(env, np.ones(k) / k, mode='same')
    thr = np.percentile(env, 99.0) * 0.6 + 1e-6
    gain = np.where(env > thr, (thr / np.maximum(env, 1e-9)) ** 0.5, 1.0)
    gain = np.convolve(gain, np.ones(k * 4) / (k * 4), mode='same')
    st *= gain[:, None]
    st = np.tanh(st / (np.max(np.abs(st)) + 1e-9) * 1.6) / math.tanh(1.6)
    st *= 10 ** (-1 / 20)
    a = int(f0 / FPS * SR)
    b = int(f1 / FPS * SR)
    pcm = (np.clip(st[a:b], -1, 1) * 32767).astype(np.int16)
    with wave.open(path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    return path
