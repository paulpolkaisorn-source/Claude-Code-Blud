#!/usr/bin/env python3
"""
NIGHTMARE vs LAST SURVIVOR  --  90 s horror-game soundtrack, synthesized from scratch.

No samples, no vocals: every sound (music box, kick, bass, leads, risers, impacts...)
is generated with numpy/numba.  128 BPM, D minor, 48 bars = exactly 90.000 s.

  bars  0- 3  INTRO     music box only: states the theme + chord structure
  bars  4- 7  STARTING  beats/bass/pad come in, music box stays on top, riser -> silence
  bars  8-23  MAJOR     huge bass drop, full-force drop (4 blocks of 4 bars)
  bars 24-27  CLIMAX    chaos stops; skeleton of the final part (theme + chords)
  bars 28-47  FINAL     everything at once, key change up a tone, final stinger

Usage: python make_song.py <out.wav>
"""
import sys
import time
import numpy as np
import numba as nb
from scipy import signal
from scipy.io import wavfile
from scipy.ndimage import maximum_filter1d, minimum_filter1d, uniform_filter1d

SR = 44100
BPM = 128.0
BEAT = 60.0 / BPM
BAR = 4 * BEAT
STEP = BEAT / 4.0                    # one sixteenth
NBARS = 48
DUR = NBARS * BAR                    # 90.0 s
N = int(round(DUR * SR))
rng = np.random.default_rng(20260930)

SECTIONS = [("INTRO", 0, 4), ("STARTING", 4, 8), ("MAJOR", 8, 24),
            ("CLIMAX", 24, 28), ("FINAL", 28, 48)]


# =====================================================================================
#  numba DSP kernels
# =====================================================================================
@nb.njit(cache=True, fastmath=True)
def _pblep(t, dt):
    if t < dt:
        x = t / dt
        return x + x - x * x - 1.0
    if t > 1.0 - dt:
        x = (t - 1.0) / dt
        return x * x + x + x + 1.0
    return 0.0


@nb.njit(cache=True, fastmath=True)
def saw_osc(freq, sr, ph0):
    n = freq.shape[0]
    out = np.empty(n)
    ph = ph0
    for i in range(n):
        dt = freq[i] / sr
        ph += dt
        ph -= np.floor(ph)
        out[i] = 2.0 * ph - 1.0 - _pblep(ph, dt)
    return out


@nb.njit(cache=True, fastmath=True)
def supersaw(freq, det_cents, pans, sr, phases):
    n = freq.shape[0]
    v = det_cents.shape[0]
    L = np.zeros(n)
    R = np.zeros(n)
    for k in range(v):
        ratio = 2.0 ** (det_cents[k] / 1200.0)
        ph = phases[k]
        gl = np.cos((pans[k] + 1.0) * np.pi / 4.0)
        gr = np.sin((pans[k] + 1.0) * np.pi / 4.0)
        for i in range(n):
            dt = freq[i] * ratio / sr
            ph += dt
            ph -= np.floor(ph)
            s = 2.0 * ph - 1.0 - _pblep(ph, dt)
            L[i] += s * gl
            R[i] += s * gr
    return L, R


@nb.njit(cache=True, fastmath=True)
def svf(x, cutoff, q, mode, sr):
    """TPT state-variable filter, per-sample cutoff. mode 0=LP 1=BP(unity) 2=HP"""
    n = x.shape[0]
    y = np.empty(n)
    ic1 = 0.0
    ic2 = 0.0
    k = 1.0 / q
    lim = 0.45 * sr
    for i in range(n):
        fc = cutoff[i]
        if fc > lim:
            fc = lim
        if fc < 15.0:
            fc = 15.0
        g = np.tan(np.pi * fc / sr)
        a1 = 1.0 / (1.0 + g * (g + k))
        a2 = g * a1
        a3 = g * a2
        v3 = x[i] - ic2
        v1 = a1 * ic1 + a2 * v3
        v2 = ic2 + a2 * ic1 + a3 * v3
        ic1 = 2.0 * v1 - ic1
        ic2 = 2.0 * v2 - ic2
        if mode == 0:
            y[i] = v2
        elif mode == 1:
            y[i] = v1 * k
        else:
            y[i] = x[i] - k * v1 - v2
    return y


@nb.njit(cache=True, fastmath=True)
def fm_growl(freq, idx, ratio, fb, sr):
    n = freq.shape[0]
    out = np.empty(n)
    pc = 0.0
    pm = 0.0
    last = 0.0
    for i in range(n):
        pm += 2.0 * np.pi * freq[i] * ratio / sr
        m = np.sin(pm + fb * last)
        pc += 2.0 * np.pi * freq[i] / sr
        out[i] = np.sin(pc + idx[i] * m)
        last = m
    return out


@nb.njit(cache=True, fastmath=True)
def compressor(x, sr, thresh_db, ratio, atk_ms, rel_ms, makeup_db):
    n = x.shape[1]
    out = np.empty_like(x)
    thr = 10.0 ** (thresh_db / 20.0)
    aa = np.exp(-1.0 / (atk_ms * 1e-3 * sr))
    ar = np.exp(-1.0 / (rel_ms * 1e-3 * sr))
    mk = 10.0 ** (makeup_db / 20.0)
    env = 0.0
    for i in range(n):
        lvl = max(abs(x[0, i]), abs(x[1, i]))
        if lvl > env:
            env = aa * env + (1.0 - aa) * lvl
        else:
            env = ar * env + (1.0 - ar) * lvl
        g = 1.0
        if env > thr:
            g = 10.0 ** (-(20.0 * np.log10(env / thr)) * (1.0 - 1.0 / ratio) / 20.0)
        out[0, i] = x[0, i] * g * mk
        out[1, i] = x[1, i] * g * mk
    return out


@nb.njit(cache=True, fastmath=True)
def slow_release(g, coef):
    """gain can drop instantly but may only recover at a fixed slow rate"""
    out = np.empty_like(g)
    cur = 1.0
    for i in range(g.shape[0]):
        if g[i] < cur:
            cur = g[i]
        else:
            cur = cur + (g[i] - cur) * coef
            if cur > g[i]:
                cur = g[i]
        out[i] = cur
    return out


# =====================================================================================
#  small helpers
# =====================================================================================
def mtof(m):
    return 440.0 * 2.0 ** ((np.asarray(m, dtype=float) - 69.0) / 12.0)


_PC = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def n2m(name):
    pc = _PC[name[0]]
    i = 1
    if name[1] == "#":
        pc += 1
        i = 2
    elif name[1] == "b":
        pc -= 1
        i = 2
    return 12 * (int(name[i:]) + 1) + pc


def hp(x, fc, order=2):
    return signal.sosfilt(signal.butter(order, fc, "highpass", fs=SR, output="sos"), x, axis=-1)


def lp(x, fc, order=2):
    return signal.sosfilt(signal.butter(order, fc, "lowpass", fs=SR, output="sos"), x, axis=-1)


def bp(x, lo, hi, order=2):
    return signal.sosfilt(signal.butter(order, [lo, hi], "bandpass", fs=SR, output="sos"), x, axis=-1)


def gate_env(n, dur, atk, rel):
    t = np.arange(n) / SR
    return np.minimum(t / max(atk, 1e-5), 1.0) * np.clip((dur + rel - t) / rel, 0.0, 1.0)


def bt(bar, step=0.0):
    return bar * BAR + step * STEP


# =====================================================================================
#  sound design : one-shot / voice generators
# =====================================================================================
def make_kick(f0=46.0, sweep=170.0, tau_p=0.030, tau_a=0.24, click=0.4, drive=2.4, dur=0.55):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f0 + sweep * np.exp(-t / tau_p)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / tau_a) * np.minimum(t / 0.0008, 1.0)
    body = np.tanh(drive * body)
    r = np.random.default_rng(7)
    ck = hp(r.standard_normal(n), 1800) * np.exp(-t / 0.004) * click
    k = (body * 0.92 + ck) * np.clip((dur - t) / 0.04, 0, 1)
    return k


def make_snare(seed=3, tone=185.0, body=0.75, noise_amt=1.0, tail=0.16):
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    r = np.random.default_rng(seed)
    f = tone * (1 + 0.55 * np.exp(-t / 0.010))
    tn = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.075)
    nz = bp(r.standard_normal(n), 1400, 11000, 2)
    nz *= 0.7 * np.exp(-t / tail) + 0.3 * np.exp(-t / 0.05)
    crack = hp(r.standard_normal(n), 3500) * np.exp(-t / 0.006) * 0.6
    s = np.tanh(1.7 * (body * tn + noise_amt * nz + crack))
    return s * np.clip((0.5 - t) / 0.06, 0, 1) * 0.9


def make_clap(seed=5):
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    r = np.random.default_rng(seed)
    nz = bp(r.standard_normal(n), 900, 5500, 2)
    env = np.zeros(n)
    for k, d in enumerate([0.0, 0.010, 0.021, 0.034]):
        i = int(d * SR)
        env[i:] += np.exp(-np.arange(n - i) / SR / 0.012) * (0.6 if k < 3 else 1.0)
    env += 0.5 * np.exp(-t / 0.11) * (t > 0.034)
    return np.tanh(1.6 * nz * env) * np.clip((0.45 - t) / 0.06, 0, 1) * 0.8


def make_hat(open_=False, seed=1):
    dur = 0.42 if open_ else 0.11
    n = int(dur * SR)
    t = np.arange(n) / SR
    fr = np.array([205.3, 304.4, 369.6, 522.7, 540.0, 800.0]) * 1.95
    s = sum(np.sign(np.sin(2 * np.pi * f * t + seed * 0.37 * k)) for k, f in enumerate(fr)) / 6.0
    r = np.random.default_rng(seed)
    s = hp(s + 0.5 * r.standard_normal(n), 6500, 4)
    s = lp(s, 16000, 2)
    env = np.exp(-t / (0.13 if open_ else 0.022)) * np.clip((dur - t) / 0.02, 0, 1) * np.minimum(t / 0.0005, 1)
    return s * env * 0.55


def make_tom(freq, dur=0.9, seed=2):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = freq * (1 + 1.2 * np.exp(-t / 0.035))
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.28)
    r = np.random.default_rng(seed)
    slap = bp(r.standard_normal(n), 200, 2500) * np.exp(-t / 0.02) * 0.5
    return np.tanh(1.5 * (y + slap)) * np.clip((dur - t) / 0.05, 0, 1) * 0.9


def make_impact(dur=4.2, seed=9, boom=1.0, crash=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 26 + 70 * np.exp(-t / 0.30)
    bm = np.tanh(1.8 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 1.5))
    r = np.random.default_rng(seed)
    rum = lp(r.standard_normal(n), 110, 2) * np.exp(-t / 1.2) * 6
    cr = hp(r.standard_normal(n), 2400, 2) * np.minimum(t / 0.004, 1) * (0.6 * np.exp(-t / 0.35) + 0.4 * np.exp(-t / 1.5))
    hit = lp(r.standard_normal(n), 2500) * np.exp(-t / 0.05) * 2
    y = boom * 0.9 * bm + 0.25 * rum + crash * 0.35 * cr + 0.4 * hit
    y *= np.clip((dur - t) / 0.4, 0, 1)
    return y / max(np.max(np.abs(y)), 1e-9) * 0.95


def make_riser(dur, f0=250.0, f1=10000.0, seed=11, tonal=0.0, curve=2.2, tone_lo=110.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    r = np.random.default_rng(seed)
    cut = f0 * (f1 / f0) ** (t / dur)
    y = np.stack([svf(r.standard_normal(n), cut, 2.5, 1, SR) for _ in range(2)])
    env = (t / dur) ** curve
    y *= env
    if tonal > 0:
        fr = tone_lo * (16.0) ** (t / dur)
        det = np.array([-18.0, -6.0, 0.0, 6.0, 18.0])
        pans = np.array([-0.8, -0.4, 0.0, 0.4, 0.8])
        L, R = supersaw(fr, det, pans, SR, rng.random(5))
        c2 = 250 + 7000 * (t / dur) ** 2
        y += tonal * np.stack([svf(L, c2, 0.9, 0, SR), svf(R, c2, 0.9, 0, SR)]) * env * 0.35
    y *= np.clip((dur - t) / 0.01, 0, 1)
    return y * 0.9


def make_dive(f_start, f_end, dur, seed=4, shape=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    fr = f_start * (f_end / f_start) ** ((t / dur) ** shape)
    fr = fr * (1 + 0.006 * np.sin(2 * np.pi * 6.5 * t))
    det = np.array([-30.0, -12.0, 0.0, 14.0, 32.0])
    pans = np.array([-0.9, -0.4, 0.0, 0.4, 0.9])
    L, R = supersaw(fr, det, pans, SR, np.random.default_rng(seed).random(5))
    c = np.maximum(fr * 3.0, 800)
    y = np.stack([svf(L, c, 1.6, 0, SR), svf(R, c, 1.6, 0, SR)])
    y = np.tanh(1.6 * y * 0.5)
    env = np.minimum(t / 0.02, 1.0) * np.clip((dur - t) / 0.12, 0, 1)
    return y * env * 0.7


def make_step(seed=0, weight=1.0):
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    r = np.random.default_rng(100 + seed)
    f = 62 * (1 + 0.7 * np.exp(-t / 0.03))
    th = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.10)
    nz = lp(r.standard_normal(n), 700) * np.exp(-t / 0.03) * 1.6
    hi = bp(r.standard_normal(n), 1800, 5000) * np.exp(-t / 0.012) * 0.25
    return np.tanh(1.3 * (th + nz + hi)) * weight * np.clip((0.5 - t) / 0.08, 0, 1)


def make_scrape(dur=2.4, seed=21):
    n = int(dur * SR)
    t = np.arange(n) / SR
    r = np.random.default_rng(seed)
    nz = r.standard_normal(n)
    sweep = 1800 + 2600 * (t / dur) + 250 * np.sin(2 * np.pi * 3.1 * t)
    y = svf(nz, sweep, 14.0, 1, SR) + 0.6 * svf(nz, sweep * 1.51, 18.0, 1, SR)
    env = np.minimum(t / 0.5, 1.0) * np.clip((dur - t) / 0.7, 0, 1)
    env *= 0.6 + 0.4 * np.sin(2 * np.pi * 7.0 * t) ** 2
    return np.tanh(y * env * 0.4) * 0.8


def make_wind(dur, seed=31):
    n = int(dur * SR)
    t = np.arange(n) / SR
    r = np.random.default_rng(seed)
    cut = 480 + 260 * np.sin(2 * np.pi * 0.21 * t) + 120 * np.sin(2 * np.pi * 0.53 * t + 1.0)
    y = svf(r.standard_normal(n), cut, 1.8, 1, SR)
    y *= 0.6 + 0.4 * np.sin(2 * np.pi * 0.17 * t + 0.5)
    return y


def make_heart(strength=1.0):
    n = int(0.8 * SR)
    t = np.arange(n) / SR

    def thump(f0, tau, amp, t0):
        tt = np.maximum(t - t0, 0.0)
        f = f0 * (1 + 0.5 * np.exp(-tt / 0.02))
        env = (t >= t0) * np.exp(-tt / tau) * np.minimum(tt / 0.003, 1.0)
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * env * amp

    y = thump(58, 0.11, 1.0, 0.0) + thump(66, 0.09, 0.75, 0.27)
    r = np.random.default_rng(55)
    y += lp(r.standard_normal(n), 400) * (np.exp(-t / 0.02) + 0.7 * np.exp(-np.maximum(t - 0.27, 0) / 0.02) * (t >= 0.27)) * 0.6
    return np.tanh(1.4 * y) * strength * np.clip((0.8 - t) / 0.1, 0, 1)


_MB = {}


def music_box(midi, vel):
    """comb-tine music box: pure fundamental + beating twin + bell partials + comb 'ping'"""
    key = (int(midi), int(round(vel * 10)))
    if key in _MB:
        return _MB[key]
    f = float(mtof(midi))
    v = key[1] / 10.0
    tau = float(np.clip(1.10 * (523.25 / f) ** 0.42, 0.22, 1.9))
    dur = min(2.8, tau * 5.0)
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = np.sin(2 * np.pi * f * t) * np.exp(-t / tau)
    y += 0.38 * np.sin(2 * np.pi * f * 1.0032 * t + 0.7) * np.exp(-t / (tau * 0.85))
    y += 0.30 * np.sin(2 * np.pi * 2.0 * f * t + 0.3) * np.exp(-t / (tau * 0.50))
    y += 0.15 * np.sin(2 * np.pi * 3.0 * f * t) * np.exp(-t / (tau * 0.30))
    for ratio, amp, dec in ((6.27, 0.20, 0.10), (17.55, 0.07, 0.035)):
        if f * ratio < 19000:
            y += amp * v * np.sin(2 * np.pi * f * ratio * t) * np.exp(-t / dec)
    r = np.random.default_rng(int(midi) * 31 + key[1])
    y += hp(r.standard_normal(n), 2500) * np.exp(-t / 0.0025) * 0.20 * v
    y *= np.minimum(t / 0.0004, 1.0) * np.clip((dur - t) / 0.05, 0, 1)
    y *= (0.25 + 0.75 * v) / 1.6
    _MB[key] = y
    return y


def make_sub(freq, dur, glide=1.0, drive=1.6):
    n = int((dur + 0.05) * SR)
    t = np.arange(n) / SR
    f = freq * (1 + 0.5 * glide * np.exp(-t / 0.02))
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = np.tanh(drive * (np.sin(ph) + 0.15 * np.sin(2 * ph)))
    return y * gate_env(n, dur, 0.004, 0.05) * (0.8 + 0.2 * np.exp(-t / 0.25)) * 0.85


def make_wobble(midi, dur, rate_hz, lo=150.0, hi=3200.0, q=2.6, drive=3.0, shape=0, phase=-np.pi / 2):
    f0 = float(mtof(midi))
    n = int((dur + 0.05) * SR)
    t = np.arange(n) / SR
    fr = np.full(n, f0)
    s = saw_osc(fr, SR, 0.0) + 0.9 * saw_osc(fr * 1.0059, SR, 0.31) + 0.7 * saw_osc(fr * 0.4971, SR, 0.62)
    lfo = 0.5 + 0.5 * np.sin(2 * np.pi * rate_hz * t + phase)
    if shape == 1:
        lfo = lfo ** 2
    cut = lo * (hi / lo) ** lfo
    y = np.tanh(drive * svf(s, cut, q, 0, SR) * 0.5)
    return y * gate_env(n, dur, 0.003, 0.04) * 0.6


def make_growl(midi, dur, rate_hz, i_lo=1.0, i_hi=6.0, ratio=2.0, fb=0.3, drive=3.0):
    f0 = float(mtof(midi))
    n = int((dur + 0.05) * SR)
    t = np.arange(n) / SR
    lfo = 0.5 + 0.5 * np.sin(2 * np.pi * rate_hz * t - np.pi / 2)
    y = fm_growl(np.full(n, f0), i_lo + (i_hi - i_lo) * lfo, ratio, fb, SR)
    y = np.tanh(drive * y)
    y = 0.6 * y + 0.5 * svf(y, 350 + 2600 * lfo, 1.3, 1, SR)
    return y * gate_env(n, dur, 0.003, 0.04) * 0.55


def make_pluck_bass(midi, dur=0.11, cut0=3800.0, cut1=340.0, q=1.6, drive=2.6):
    f0 = float(mtof(midi))
    n = int((dur + 0.03) * SR)
    t = np.arange(n) / SR
    fr = np.full(n, f0)
    s = saw_osc(fr, SR, 0.0) + 0.8 * saw_osc(fr * 1.004, SR, 0.4) + 0.4 * np.sign(np.sin(2 * np.pi * f0 * 0.5 * t))
    cut = cut1 + (cut0 - cut1) * np.exp(-t / 0.035)
    y = np.tanh(drive * svf(s, cut, q, 0, SR) * 0.6)
    return y * gate_env(n, dur, 0.002, 0.02) * 0.65


def make_lead(midi, dur, cutoff=5500.0, spread=1.0, atk=0.006, rel=0.09, pluck=0.55,
              res=0.9, drive=1.6, sub=0.3):
    f0 = float(mtof(midi))
    n = int((dur + rel) * SR)
    t = np.arange(n) / SR
    det = np.array([-26, -15, -6, 0, 6, 15, 26.0]) * spread
    pans = np.array([-1, -0.6, -0.28, 0, 0.28, 0.6, 1.0]) * 0.9
    L, R = supersaw(np.full(n, f0), det, pans, SR, rng.random(7))
    cut = np.maximum(cutoff * ((1 - pluck) + pluck * np.exp(-t / 0.22)), 300.0)
    L = svf(L, cut, res, 0, SR)
    R = svf(R, cut, res, 0, SR)
    s = np.sin(2 * np.pi * f0 * 0.5 * t) * sub
    y = np.stack([L, R]) * (0.9 / np.sqrt(7)) + s * 0.5
    return np.tanh(drive * y) * gate_env(n, dur, atk, rel)


def make_pad(midis, dur, cut_lo, cut_hi, atk=0.5, rel=0.7, gain=0.12):
    n = int((dur + rel) * SR)
    t = np.arange(n) / SR
    Ls = np.zeros(n)
    Rs = np.zeros(n)
    det = np.array([-14, -7, 0, 7, 14.0])
    pans = np.array([-0.8, -0.4, 0.0, 0.4, 0.8])
    for m in midis:
        L, R = supersaw(np.full(n, float(mtof(m))), det, pans, SR, rng.random(5))
        Ls += L
        Rs += R
    cut = np.linspace(cut_lo, cut_hi, n) * (1 + 0.15 * np.sin(2 * np.pi * 0.18 * t))
    y = np.stack([svf(Ls, cut, 0.9, 0, SR), svf(Rs, cut, 0.9, 0, SR)])
    env = np.minimum(t / atk, 1.0) * np.clip((dur + rel - t) / rel, 0, 1)
    return y * env * gain


def make_strings(midis, dur, rate=11.0, depth=0.55, atk=0.3, rel=0.4, gain=0.10, cresc=1.0):
    n = int((dur + rel) * SR)
    t = np.arange(n) / SR
    Ls = np.zeros(n)
    Rs = np.zeros(n)
    det = np.array([-10, 0, 10.0])
    pans = np.array([-0.7, 0.0, 0.7])
    for m in midis:
        vib = 1 + 0.003 * np.sin(2 * np.pi * 5.3 * t + rng.random() * 6.28)
        L, R = supersaw(float(mtof(m)) * vib, det, pans, SR, rng.random(3))
        Ls += L
        Rs += R
    y = np.stack([svf(Ls, np.full(n, 3800.0), 0.8, 0, SR), svf(Rs, np.full(n, 3800.0), 0.8, 0, SR)])
    trem = (1 - depth) + depth * (0.5 + 0.5 * np.sin(2 * np.pi * rate * t + rng.random() * 6.28))
    env = np.minimum(t / atk, 1.0) * np.clip((dur + rel - t) / rel, 0, 1)
    env *= (1 - cresc) + cresc * (0.25 + 0.75 * (t / (dur + rel)) ** 1.4)
    return y * trem * env * gain


# =====================================================================================
#  score : harmony + themes
# =====================================================================================
P1 = [(0, "m"), (8, "M"), (5, "m"), (7, "M")]          # Dm | Bb | Gm | A
PBc = [(0, "m"), (8, "M"), (10, "M"), (7, "M")]        # Dm | Bb | C  | A
B_BARS = set(list(range(16, 20)) + list(range(32, 36)) + list(range(40, 44)))

# (eighth-step, note, length in eighths) -- 3+3+2 rhythm in every bar
THEME = {
    "A": [[(0, "A4", 3), (3, "D5", 3), (6, "F5", 2)],
          [(0, "F5", 3), (3, "D5", 3), (6, "Bb4", 2)],
          [(0, "Bb4", 3), (3, "D5", 3), (6, "G5", 2)],
          [(0, "E5", 3), (3, "C#5", 3), (6, "A4", 2)]],
    "B": [[(0, "D5", 3), (3, "F5", 3), (6, "A5", 2)],
          [(0, "Bb5", 3), (3, "A5", 3), (6, "F5", 2)],
          [(0, "G5", 3), (3, "E5", 3), (6, "C5", 2)],
          [(0, "C#5", 3), (3, "E5", 3), (6, "G5", 2)]],
}
# soaring held top line (two notes per bar) for the Final
ANTHEM = {
    "A": [("A5", "D6"), ("D6", "F6"), ("D6", "G6"), ("E6", "C#6")],
    "B": [("A5", "D6"), ("D6", "F6"), ("E6", "G6"), ("C#6", "E6")],
}


def phrase(b):
    return "B" if b in B_BARS else "A"


def shift(b):
    return 2 if b >= 36 else 0


def chord(b):
    if b == 44:
        return (0, "m")
    if b == 45:
        return (7, "M")
    if b >= 46:
        return (0, "m")
    return (PBc if phrase(b) == "B" else P1)[b % 4]


def root_pc(b):
    return (2 + chord(b)[0] + shift(b)) % 12


def bass_midi(b):
    return 26 + ((root_pc(b) - 2) % 12)


def chord_midis(b, low=55):
    r = low + ((root_pc(b) - low) % 12)
    return [r, r + (3 if chord(b)[1] == "m" else 4), r + 7]


# =====================================================================================
#  mixing buses
# =====================================================================================
BUS_NAMES = ["mb", "drum", "kick", "bass", "sub", "lead", "pad", "fx", "heart",
             "hall", "room", "big", "pp"]
B = {k: np.zeros((2, N)) for k in BUS_NAMES}
KICKS = []          # (time, strength)  -> sidechain + video
SNARES = []
HEARTS = []         # heartbeat events -> video ECG
EVENTS = {"impact": []}


def _place(buf, x, t, gain, pan):
    i0 = int(round(t * SR))
    n = x.shape[-1]
    if i0 >= buf.shape[1] or i0 + n <= 0:
        return
    a = max(0, -i0)
    b = min(n, buf.shape[1] - i0)
    if b <= a:
        return
    if x.ndim == 1:
        th = (pan + 1) * np.pi / 4
        buf[0, i0 + a:i0 + b] += x[a:b] * gain * np.cos(th)
        buf[1, i0 + a:i0 + b] += x[a:b] * gain * np.sin(th)
    else:
        buf[:, i0 + a:i0 + b] += x[:, a:b] * gain


# hard cut points: dry sound started before a cut is truncated there (reverb sends keep ringing).
# 14.65 s -> pre-drop vacuum | 45.0 s -> "the chaos stops" | 51.56 s -> pre-final vacuum
CUTS = [bt(7, 13), bt(24), bt(27, 8)]
GAPS = [(bt(7, 13), bt(8)), (bt(27, 8), bt(28))]      # echoes (ping-pong) are muted here too


def put(bus, x, t, g=1.0, pan=0.0, sends=None, tmax=None):
    if t >= DUR:
        return
    full = x
    for c in CUTS:
        if t < c - 1e-6:
            tmax = c if tmax is None else min(tmax, c)
            break
    if tmax is not None:
        keep = int((tmax - t) * SR)
        if keep <= 0:
            return
        if keep < x.shape[-1]:
            x = x[..., :keep].copy()
            f = min(keep, int(0.006 * SR))
            x[..., -f:] *= np.linspace(1, 0, f)
    _place(B[bus], x, t, g, pan)
    if sends:
        for k, a in sends.items():
            _place(B[k], full if k != "pp" else x, t, g * a, pan)


# -------- cached one-shots
SNARE = make_snare()
SNARE_B = make_snare(seed=8, tone=210, body=0.55, tail=0.12)
CLAP = make_clap()
HAT_C = [make_hat(False, s) for s in (1, 2, 3)]
HAT_O = make_hat(True, 4)
IMPACT_S = make_impact(dur=3.4, seed=9, boom=0.8, crash=0.7)
IMPACT_M = make_impact(dur=4.2, seed=10, boom=1.0, crash=1.0)
IMPACT_L = make_impact(dur=6.0, seed=12, boom=1.0, crash=1.2)
HEART = make_heart()
STEPS = [make_step(i) for i in range(3)]
_TOMS = {}


def tom(freq):
    k = int(round(freq))
    if k not in _TOMS:
        _TOMS[k] = make_tom(k)
    return _TOMS[k]


# -------- instrument triggers
def heart_at(t, g=0.8, sends=None, sample=None):
    HEARTS.append((t, g))
    put("heart", HEART if sample is None else sample, t, g, 0.0, sends)


_KICK_CACHE = {}


def kick_freq(b):
    """kick fundamental = the bar's bass root folded into 41-82 Hz, so kick and bass never fight"""
    f = float(mtof(bass_midi(min(max(b, 0), NBARS - 1))))
    while f < 41.0:
        f *= 2.0
    while f >= 82.0:
        f /= 2.0
    return round(f, 1)


def kick_at(t, vel=1.0, soft=False, depth=1.0):
    f0 = kick_freq(int(t // BAR))
    key = (f0, soft)
    if key not in _KICK_CACHE:
        _KICK_CACHE[key] = (lp(make_kick(f0=f0 * 0.98, sweep=60, tau_p=0.04, tau_a=0.17, click=0.03, drive=1.1), 320) if soft
                            else make_kick(f0=f0 * 0.98))
    put("kick", _KICK_CACHE[key], t, 0.95 * vel)
    KICKS.append((t, vel * depth))


def snare_at(t, vel=1.0, alt=False, tmax=None):
    put("drum", SNARE_B if alt else SNARE, t, 0.85 * vel, 0.0, {"room": 0.28, "big": 0.10}, tmax)
    SNARES.append((t, vel))


def clap_at(t, vel=1.0):
    put("drum", CLAP, t, 0.75 * vel, 0.0, {"room": 0.35, "big": 0.22})
    SNARES.append((t, vel))


def hat_at(t, vel=0.5, open_=False):
    x = HAT_O if open_ else HAT_C[int(rng.integers(0, 3))]
    put("drum", x, t, 0.5 * vel, float(rng.uniform(-0.25, 0.25)), {"room": 0.06})


def tom_at(t, freq, vel=0.8):
    put("drum", tom(freq), t, 0.8 * vel, 0.0, {"room": 0.22, "big": 0.25})


def crash_at(t, vel=1.0):
    put("fx", hp(IMPACT_M, 2500) * 0.5, t, vel, 0.0, {"big": 0.25})


def impact_at(t, size="M", vel=1.0):
    x = {"S": IMPACT_S, "M": IMPACT_M, "L": IMPACT_L}[size]
    put("fx", x, t, 0.9 * vel, 0.0, {"big": 0.35})
    EVENTS["impact"].append((t, size))


def mb_note(midi, t, vel=0.8, pan=0.0, pp=0.45, hall=0.45):
    put("mb", music_box(midi, vel), t, 1.0, pan, {"hall": hall, "pp": pp})


def snare_roll(t0, t1, vel0=0.3, vel1=1.0, n0=8, n1=32, alt=False):
    t = t0
    total = t1 - t0
    while t < t1 - 1e-6:
        frac = (t - t0) / total
        snare_at(t, vel0 + (vel1 - vel0) * frac, alt=alt, tmax=t1)
        t += BAR / (n0 + (n1 - n0) * frac)


# =====================================================================================
#  arrangement helpers
# =====================================================================================
def melody(b, octave=12):
    """theme notes of bar b -> list of (t, midi, dur_seconds)"""
    out = []
    for s8, name, d8 in THEME[phrase(b)][b % 4]:
        out.append((bt(b) + s8 * 2 * STEP, n2m(name) + octave + shift(b), d8 * 2 * STEP))
    return out


def mbox_melody(b, octave=12, vel=0.85, restrike=False, upper=0.0):
    for i, (t, m, d) in enumerate(melody(b, octave)):
        j = float(rng.normal(0, 0.003))
        mb_note(m, max(t + j, 0.0), vel * float(rng.uniform(0.95, 1.05)), pan=(-0.22 if i % 2 == 0 else 0.22))
        if restrike and d > 0.5:
            mb_note(m, t + 2 * 2 * STEP, vel * 0.5, pan=(0.25 if i % 2 == 0 else -0.25))
        if upper > 0:
            mb_note(m + 12, t + 0.004, vel * upper, pan=(0.35 if i % 2 == 0 else -0.35), pp=0.3)


def mbox_arp(b, mode="8th", vel=0.3, octave=0, start=0, stop=16):
    r, t3, f5 = chord_midis(b, low=57)
    tones = [r + octave, t3 + octave, f5 + octave, r + 12 + octave]
    tones = [m - 12 if m > 96 else m for m in tones]
    if mode == "8th":
        pat = [0, 1, 2, 3, 2, 1, 2, 1]
        for i, k in enumerate(pat):
            s = i * 2
            if start <= s < stop:
                mb_note(tones[k], bt(b, s), vel * (1.0 if i % 2 == 0 else 0.78), pan=(-0.5 if i % 2 == 0 else 0.5), pp=0.25, hall=0.35)
    else:   # 16th
        pat = [0, 1, 2, 3, 2, 1, 2, 3, 3, 2, 1, 2, 3, 2, 1, 0]
        for s in range(16):
            if start <= s < stop:
                mb_note(min(tones[pat[s]] + (12 if s % 8 >= 4 else 0), 100), bt(b, s), vel * (1.0 if s % 2 == 0 else 0.7),
                        pan=float(np.sin(s * 1.7) * 0.6), pp=0.15, hall=0.30)


def pad_bar(b, nb_bars=1, cut=(500.0, 1400.0), gain=0.12, low=43, tmax=None, sends=0.3):
    ms = chord_midis(b, low=low) + [chord_midis(b, low=low)[0] + 12]
    x = make_pad(ms, nb_bars * BAR, cut[0], cut[1], gain=gain)
    put("pad", x, bt(b), 1.0, 0.0, {"hall": sends}, tmax)


def strings_bar(b, nb_bars=1, gain=0.10, low=55, cresc=1.0, rate=11.0, tmax=None):
    ms = chord_midis(b, low=low) + [chord_midis(b, low=low)[0] + 12, chord_midis(b, low=low)[1] + 12]
    x = make_strings(ms, nb_bars * BAR, gain=gain, cresc=cresc, rate=rate)
    put("pad", x, bt(b), 1.0, 0.0, {"hall": 0.4}, tmax)


def sub_at(t, midi, dur, g=0.9, tmax=None):
    put("sub", make_sub(float(mtof(midi)), dur), t, g, 0.0, None, tmax)


def lead_note(t, midi, dur, g=0.5, hall=0.25, big=0.10, **kw):
    put("lead", make_lead(midi, dur, **kw), t, g, 0.0, {"hall": hall, "big": big})


def stab(t, b, dur=0.22, g=0.5, low=50, cutoff=3800.0, tmax=None):
    for m in chord_midis(b, low=low) + [chord_midis(b, low=low)[0] + 12]:
        put("lead", make_lead(m, dur, cutoff=cutoff, pluck=0.8, spread=1.3, sub=0.0, rel=0.05), t, g * 0.5, 0.0,
            {"hall": 0.15, "big": 0.2}, tmax)


def riser(t0, dur, g=0.6, tonal=0.0, f0=250.0, f1=10000.0, seed=11, tmax=None):
    put("fx", make_riser(dur, f0=f0, f1=f1, seed=seed, tonal=tonal), t0, g, 0.0, {"hall": 0.15}, tmax)


def reverse_crash(t_end, dur=1.6, g=0.5):
    x = hp(IMPACT_M[: int(dur * SR)], 2000)[::-1].copy()
    put("fx", x, t_end - dur, g, 0.0, {"hall": 0.12})


def dive(t, f0, f1, dur, g=0.35, seed=4):
    put("fx", make_dive(f0, f1, dur, seed), t, g, 0.0, {"big": 0.35})


# =====================================================================================
#  THE SONG
# =====================================================================================
def arrange():
    T = time.time()

    # ------------------------------------------------------------------ INTRO (0-7.5s)
    put("fx", make_wind(BAR * 4 + 1.0), 0.0, 0.05, 0.0, {"hall": 0.5})
    put("pad", make_pad([26 + 12, 33 + 12, 38 + 12], BAR * 2 + 0.6, 180, 420, atk=1.6, rel=0.9, gain=0.10),
        bt(2), 1.0, 0.0, {"hall": 0.4}, tmax=bt(4))
    for b in range(0, 4):
        mbox_melody(b, octave=12, vel=0.86 if b else 0.80)
        mbox_arp(b, "8th", vel=0.30)
    heart_at(bt(3, 12) - 0.02, 0.35, sample=make_heart(0.5))      # first heartbeat before the beat enters
    riser(bt(3, 4), BAR * 0.75, g=0.10, f0=400, f1=6000, seed=3, tmax=bt(4))

    # ------------------------------------------------------------------ STARTING (7.5-15s)
    put("fx", make_scrape(BAR * 1.4), bt(4, 2), 0.13, -0.3, {"hall": 0.4})
    put("fx", make_wind(BAR * 4), bt(4), 0.05, 0.0, {"hall": 0.5})
    for b in range(4, 8):
        k = b - 4
        mbox_melody(b, octave=12, vel=0.90, restrike=(k >= 1), upper=(0.35 if k >= 2 else 0.0))
        mbox_arp(b, "8th" if k < 2 else "16th", vel=0.26 if k < 2 else 0.30, start=0, stop=(13 if k == 3 else 16))
        pad_bar(b, 1, cut=(300 + 150 * k, 700 + 450 * k), gain=0.10 + 0.02 * k, tmax=(bt(7, 13) if k == 3 else None))
        # ---- drums / beat
        if k == 0:
            for s, v in ((0, 0.8), (3, 0.35), (8, 0.75), (11, 0.35)):
                kick_at(bt(b, s), v, soft=True, depth=0.4)
            for s in (4, 12):
                put("fx", STEPS[int(rng.integers(0, 3))], bt(b, s), 0.30, -0.2, {"hall": 0.3})   # killer footsteps
        elif k == 1:
            for s in (0, 4, 8, 12):
                kick_at(bt(b, s), 0.78, soft=True, depth=0.6)
            for s in (2, 6, 10, 14):
                hat_at(bt(b, s), 0.32)
            sub_at(bt(b, 0), bass_midi(b) + 12, BAR * 0.9, g=0.55)
            for s in (0, 8):
                put("fx", STEPS[int(rng.integers(0, 3))], bt(b, s), 0.32, 0.2, {"hall": 0.3})
        elif k == 2:
            for s in (0, 4, 8, 12):
                kick_at(bt(b, s), 0.90, depth=0.8)
            for s in (4, 12):
                snare_at(bt(b, s), 0.55)
            for s in range(16):
                hat_at(bt(b, s), (0.42 if s % 4 == 2 else 0.24) * (1.0 if s % 2 == 0 else 0.7))
            for s in (0, 6, 12):
                tom_at(bt(b, s), float(mtof(bass_midi(b) + 12)) * 1.5, 0.45)
            sub_at(bt(b, 0), bass_midi(b) + 12, BAR * 0.9, g=0.65)
        else:
            for s in (0, 4, 8, 12):
                if s <= 12:
                    kick_at(bt(b, s), 0.95, depth=0.9)
            snare_at(bt(b, 4), 0.6)
            snare_roll(bt(b, 8), bt(b, 13), 0.25, 0.95, n0=8, n1=22, alt=True)
            for s in range(0, 13):
                hat_at(bt(b, s), 0.3 + 0.02 * s)
            sub_at(bt(b, 0), bass_midi(b) + 12, bt(b, 13) - bt(b), g=0.7, tmax=bt(b, 13))
            riser(bt(6, 0), bt(7, 13) - bt(6, 0), g=0.75, tonal=1.0, f0=200, f1=12000, seed=5, tmax=bt(7, 13))
            reverse_crash(bt(7, 13), dur=1.4, g=0.45)
            # rising music-box run into the silence
            r0 = chord_midis(b, low=64)
            run = [r0[0], r0[1], r0[2], r0[0] + 12, r0[1] + 12, r0[2] + 12, r0[0] + 24, r0[1] + 24]
            for i, m in enumerate(run):
                mb_note(m, bt(b, 8 + i * 0.6), 0.6 + 0.04 * i, pan=(-0.5 if i % 2 == 0 else 0.5), pp=0.2)

    # ------------------------------------------------------------------ MAJOR (15-45s)
    impact_at(bt(8), "L", 1.0)
    for b in range(8, 24):
        blk = (b - 8) // 4
        k = (b - 8) % 4
        r = bass_midi(b)
        first = (k == 0)
        rates = [[1, 2, 1, 3], [2, 3, 2, 4], [2, 2, 2, 2], [4, 4, 3, 4]][blk]
        cpb = rates[k]
        rate_hz = cpb / BEAT

        # ---- crash / impact accents
        if first and b > 8:
            impact_at(bt(b), "M" if blk < 3 else "L", 0.85)

        # ---- drums
        if blk == 0 or blk == 1 or blk == 3:      # half-time groove
            kp = [0, 6, 12] if blk != 1 else [0, 6, 10, 12]
            for s in kp:
                kick_at(bt(b, s), 1.0 if s == 0 else 0.85, depth=1.0)
            snare_at(bt(b, 8), 1.0)
            clap_at(bt(b, 8), 0.8)
            for s in range(16):
                acc = 0.55 if s % 4 == 2 else 0.30
                if blk >= 1 and s in (3, 7, 11, 15):
                    acc = 0.42
                hat_at(bt(b, s), acc * (1.0 if s % 2 == 0 else 0.75))
            if blk >= 1:
                hat_at(bt(b, 6), 0.5, open_=True)
                hat_at(bt(b, 14), 0.5, open_=True)
            for s in (0, 6, 12):
                tom_at(bt(b, s), float(mtof(r + 12)) * 1.5, 0.55)
            if blk >= 1:
                snare_at(bt(b, 15), 0.3, alt=True)
                snare_at(bt(b, 3), 0.25, alt=True)
        else:                                     # M3: double-time drum'n'bass-style break
            for s in (0, 10):
                kick_at(bt(b, s), 1.0, depth=1.0)
            kick_at(bt(b, 11), 0.55, depth=0.5)
            for s in (4, 12):
                snare_at(bt(b, s), 1.0)
                clap_at(bt(b, s), 0.7)
            for s in range(16):
                hat_at(bt(b, s), (0.5 if s % 2 == 0 else 0.28))
            for s in (2, 6, 14):
                hat_at(bt(b, s), 0.45, open_=True)
            tom_at(bt(b, 8), float(mtof(r + 12)) * 1.5, 0.5)
        # ---- 4-bar fills (last bar of each block)
        if k == 3:
            if blk == 0:
                snare_roll(bt(b, 8), bt(b + 1), 0.4, 1.0, n0=8, n1=24)
                for i, s in enumerate((12, 13, 14, 15)):
                    tom_at(bt(b, s), float(mtof(r + 12)) * (2.0 - 0.25 * i), 0.7)
                dive(bt(b, 8), 3000, 500, BEAT * 2, 0.30, seed=6)
            elif blk == 1:
                snare_roll(bt(b, 4), bt(b + 1), 0.3, 1.0, n0=8, n1=32)
                riser(bt(b, 0), BAR, g=0.6, tonal=0.8, f0=300, f1=11000, seed=13)
                dive(bt(b, 8), 3600, 400, BEAT * 2, 0.32, seed=7)
            elif blk == 2:
                snare_roll(bt(b, 4), bt(b + 1), 0.3, 1.0, n0=8, n1=32)
                riser(bt(b, 0), BAR, g=0.6, tonal=0.8, f0=300, f1=11000, seed=14)
                dive(bt(b, 4), 2400, 300, BEAT * 2, 0.32, seed=8)
        if b == 22:
            riser(bt(22), BAR * 2 - 0.02, g=0.8, tonal=1.0, f0=200, f1=14000, seed=15, tmax=bt(24) - 0.001)
        if b == 23:
            snare_roll(bt(23, 4), bt(24) - 0.001, 0.35, 1.0, n0=8, n1=40)
            for i in range(8):
                tom_at(bt(23, 8 + i), float(mtof(r + 12)) * (2.2 - 0.12 * i), 0.55 + 0.05 * i)
            reverse_crash(bt(24) - 0.001, dur=1.4, g=0.5)

        # ---- bass
        if blk == 0:
            for s, ln in ((0, 6), (6, 6), (12, 4)):
                m = r + 12 + (7 if (s == 6 and k in (1, 3)) else 0)
                put("bass", make_wobble(m, ln * STEP * 0.93, rate_hz, lo=140, hi=3000, q=2.6), bt(b, s), 0.8, 0.0, None,
                    tmax=(bt(24) - 0.01 if b == 23 else None))
                sub_at(bt(b, s), r, ln * STEP * 0.95, g=0.75)
        elif blk == 1:
            for s, ln, up in ((0, 5, 0), (6, 3, 12), (10, 2, 7), (12, 4, 0)):
                put("bass", make_wobble(r + 12 + up, ln * STEP * 0.93, rate_hz, lo=160, hi=3600, q=3.0, drive=3.6), bt(b, s), 0.8)
                sub_at(bt(b, s), r, ln * STEP * 0.95, g=0.75)
            put("bass", make_growl(r + 12, STEP * 2, rate_hz * 2, i_lo=2.0, i_hi=7.0), bt(b, 14), 0.5)
        elif blk == 2:
            for s, semi in ((0, 0), (2, 0), (3, 12), (6, 0), (8, 0), (10, 12), (11, 0), (14, 7)):
                put("bass", make_growl(r + 12 + semi, STEP * 1.6, rate_hz * 1.5, i_lo=1.5, i_hi=6.5, ratio=2.0), bt(b, s), 0.8)
            for s in (0, 8):
                sub_at(bt(b, s), r, BEAT * 1.9, g=0.75)
        else:
            for s, ln in ((0, 6), (6, 6), (12, 4)):
                put("bass", make_wobble(r + 12, ln * STEP * 0.93, rate_hz, lo=120, hi=4200, q=3.4, drive=4.2, shape=1),
                    bt(b, s), 0.85, 0.0, None, tmax=(bt(24) - 0.01 if b == 23 else None))
                put("bass", make_growl(r + 24, ln * STEP * 0.9, rate_hz * 2, i_lo=2.0, i_hi=8.0, drive=3.5), bt(b, s), 0.35, 0.0, None,
                    tmax=(bt(24) - 0.01 if b == 23 else None))
                sub_at(bt(b, s), r, ln * STEP * 0.95, g=0.8, tmax=(bt(24) - 0.01 if b == 23 else None))

        # ---- melodic layers
        if blk == 0:
            mbox_melody(b, 12, 0.70)
            for (t, m, d) in melody(b, 0):
                lead_note(t, m, d * 0.9, g=0.38, cutoff=3200, spread=0.5, pluck=0.5, sub=0.0)
        elif blk == 1:
            mbox_melody(b, 12, 0.75, upper=0.3)
            mbox_arp(b, "8th", 0.24, octave=12)
            for (t, m, d) in melody(b, 0):
                lead_note(t, m, d * 0.92, g=0.50, cutoff=4500, spread=1.0)
                lead_note(t, m - 12, d * 0.92, g=0.30, cutoff=2600, spread=0.6, sub=0.0)
            for s in (0, 6, 12):
                stab(bt(b, s), b, dur=0.20, g=0.32)
        elif blk == 2:
            mbox_melody(b, 12, 0.75, upper=0.35)
            mbox_arp(b, "16th", 0.24, octave=12)
            for (t, m, d) in melody(b, 0):
                lead_note(t, m, d * 0.92, g=0.50, cutoff=5200, spread=1.2)
            for s in (0, 6, 12):
                stab(bt(b, s), b, dur=0.20, g=0.30)
            pad_bar(b, 1, cut=(900, 2600), gain=0.10, low=43)
        else:
            mbox_melody(b, 12, 0.85, upper=0.45, restrike=True)
            mbox_arp(b, "16th", 0.28, octave=12)
            for (t, m, d) in melody(b, 0):
                td = d * 0.92
                tmx = bt(24) - 0.01 if b == 23 else None
                put("lead", make_lead(m, td, cutoff=6500, spread=1.4), t, 0.55, 0.0, {"hall": 0.25, "big": 0.12}, tmx)
                put("lead", make_lead(m + 12, td, cutoff=5200, spread=1.1, sub=0.0), t, 0.28, 0.0, {"hall": 0.25, "big": 0.12}, tmx)
                put("lead", make_lead(m - 12, td, cutoff=2400, spread=0.6, sub=0.0), t, 0.30, 0.0, None, tmx)
            for s in (0, 6, 12):
                stab(bt(b, s), b, dur=0.22, g=0.40, tmax=(bt(24) - 0.01 if b == 23 else None))
            pad_bar(b, 1, cut=(1000, 3000), gain=0.11, low=43, tmax=(bt(24) - 0.01 if b == 23 else None))
            strings_bar(b, 1, gain=0.09, cresc=0.0, rate=12.0, tmax=(bt(24) - 0.01 if b == 23 else None))
    print(f"  major done {time.time() - T:.1f}s", flush=True)

    # ------------------------------------------------------------------ CLIMAX (45-52.5s)
    impact_at(bt(24), "L", 1.0)
    kick_at(bt(24), 1.0, depth=0.0)
    sub_at(bt(24), 26, BAR * 1.2, g=0.9)
    for b in range(24, 28):
        k = b - 24
        mbox_melody(b, 12, 0.92, restrike=True, upper=(0.3 if k >= 2 else 0.0))
        mbox_arp(b, "8th", 0.27, octave=0, stop=(8 if b == 27 else 16))
        strings_bar(b, 1, gain=0.11 + 0.02 * k, cresc=0.6, rate=9.0 + 1.5 * k, tmax=(bt(27, 8) if b == 27 else None))
        pad_bar(b, 1, cut=(350 + 300 * k, 900 + 700 * k), gain=0.09 + 0.02 * k, low=43, tmax=(bt(27, 8) if b == 27 else None))
        # survivor's heartbeat accelerates, killer's steps close in
        hb = [[0, 8], [0, 8], [0, 4, 8, 12], [0, 3, 6, 8, 11, 14]][k]
        for s in hb:
            heart_at(bt(b, s) + 0.02, 0.70 + 0.05 * k, {"room": 0.10})
        if k <= 1:
            for s in (0, 8) if k == 0 else (4, 12):
                if not (k == 0 and s == 0):
                    put("fx", STEPS[int(rng.integers(0, 3))], bt(b, s), 0.34, 0.15 * (1 if s == 4 else -1), {"hall": 0.3})
        if k >= 2:
            for s in ((0, 4, 8, 12) if k == 2 else (0, 2, 4, 6, 8)):
                put("drum", tom(float(mtof(bass_midi(b) + 12)) * 1.4), bt(b, s), 0.30 + 0.05 * k, 0.0, {"big": 0.35}, tmax=bt(27, 8))
    riser(bt(25), BAR * 2.5 - 0.02, g=0.55, tonal=1.0, f0=250, f1=13000, seed=17, tmax=bt(27, 8))
    snare_roll(bt(27, 0), bt(27, 8), 0.15, 0.8, n0=8, n1=24)
    dive(bt(26, 8), 900, 3600, BAR * 0.9, 0.16, seed=19)
    # one-beat vacuum, then a single lub-dub in the silence
    heart_at(bt(27, 8) + 0.30, 0.95, {"big": 0.15})

    # ------------------------------------------------------------------ FINAL (52.5-90s)
    impact_at(bt(28), "L", 1.15)
    for b in range(28, 46):
        k = b - 28
        r = bass_midi(b)
        lvl = 0.92 if k < 4 else (1.0 if k < 8 else 1.06)
        first4 = (k % 4 == 0)
        if first4 and b > 28:
            impact_at(bt(b), "L" if b in (36,) else "M", 1.0)
        if not first4:
            crash_at(bt(b), 0.55)

        # ---- drums: four-on-the-floor, offbeat open hats, taiko on 3-3-2, hard backbeat
        lastbars = b in (44, 45)
        for s in (0, 4, 8, 12):
            if lastbars and s >= 8 and b == 45:
                continue
            kick_at(bt(b, s), 1.0 if s == 0 else 0.92, depth=1.0)
        if not lastbars:
            for s in (4, 12):
                snare_at(bt(b, s), 1.0 * lvl)
                clap_at(bt(b, s), 0.85 * lvl)
        for s in range(16):
            if lastbars:
                break
            if s in (2, 6, 10, 14):
                hat_at(bt(b, s), 0.50 * lvl, open_=True)
            else:
                hat_at(bt(b, s), (0.46 if s % 4 == 0 else 0.30) * (1.0 if s % 2 == 0 else 0.75))
        for s in (6, 12) if not lastbars else (0, 6, 12):
            tom_at(bt(b, s), float(mtof(r + 12)) * 1.5, 0.6)
        if k % 4 == 3 and not lastbars:      # 4-bar fills
            snare_roll(bt(b, 8), bt(b + 1), 0.4, 1.0, n0=16, n1=48)
            dive(bt(b, 8), 3400, 380, BEAT * 2, 0.32, seed=20 + k)
            for i, s in enumerate((12, 13, 14, 15)):
                tom_at(bt(b, s), float(mtof(r + 12)) * (2.2 - 0.25 * i), 0.7)
        if b in (30, 34, 42):
            riser(bt(b, 0), BAR * 2 - 0.01, g=0.6, tonal=0.9, f0=250, f1=13000, seed=30 + b)
        # ---- bass: sub + rolling 16th plucks that pump with the kick
        sub_at(bt(b, 0), r, BAR * 0.98, g=0.85 * lvl)
        if not lastbars:
            for s in range(16):
                if s % 4 == 0:
                    continue
                semi = 12 if s % 4 == 2 else 0
                put("bass", make_pluck_bass(r + 12 + semi, dur=STEP * 0.85), bt(b, s), 0.75 * lvl)
        # ---- lead layers
        tmx = None
        for (t, m, d) in melody(b, 0):
            if lastbars:
                break
            td = d * 0.95
            put("lead", make_lead(m, td, cutoff=7000, spread=1.5), t, 0.60 * lvl, 0.0, {"hall": 0.22, "big": 0.12})
            put("lead", make_lead(m + 12, td, cutoff=5600, spread=1.2, sub=0.0), t, 0.30 * lvl, 0.0, {"hall": 0.22, "big": 0.12})
            put("lead", make_lead(m - 12, td, cutoff=2500, spread=0.6, sub=0.0), t, 0.32 * lvl, 0.0, None)
        if not lastbars:
            a1, a2 = ANTHEM[phrase(b)][b % 4]
            for (name, off) in ((a1, 0), (a2, 2)):
                m = n2m(name) + shift(b)
                lead_note(bt(b, off * 4), m, BEAT * 2 * 0.97, g=0.30 * lvl, cutoff=6800, spread=1.6, pluck=0.15, atk=0.02, sub=0.0,
                          hall=0.4, big=0.2)
            for s in (0, 6, 12):
                stab(bt(b, s), b, dur=0.21, g=0.42 * lvl)
        # ---- music-box glitter (melody + 16th arps) & pads/strings
        if not lastbars:
            mbox_melody(b, 12, 0.85, upper=0.5, restrike=(k >= 4))
            mbox_arp(b, "16th", 0.26 * lvl, octave=12)
            pad_bar(b, 1, cut=(1400, 3600), gain=0.12, low=43)
            strings_bar(b, 1, gain=0.10, cresc=0.0, rate=12.5, low=55)
        # ---- extra screams on the first bar of each 8-bar half
        if k in (0, 8):
            dive(bt(b), 500, 3200, BEAT * 3, 0.16, seed=40 + k)

    # last two bars of build: unison hits, then the stinger
    # bar 44-45: unison hits on 3-3-2
    for b in (44, 45):
        for s in (0, 6, 12):
            stab(bt(b, s), b, dur=0.25, g=0.6, low=50)
            put("lead", make_lead(chord_midis(b, 62)[0] + 12, 0.25, cutoff=6500, spread=1.5), bt(b, s), 0.45, 0.0, {"big": 0.3})
    snare_roll(bt(45, 4), bt(46) - 0.001, 0.4, 1.0, n0=16, n1=64)
    riser(bt(44), BAR * 2 - 0.01, g=0.8, tonal=1.0, f0=250, f1=14000, seed=77)

    # ---- final stinger: LIVE OR DIE
    E = 28   # E1
    impact_at(bt(46), "L", 1.25)
    kick_at(bt(46), 1.0, depth=0.0)
    sub_at(bt(46), E, BAR * 1.6, g=1.0)
    for m, g in ((E + 24, 0.55), (E + 31, 0.45), (E + 36, 0.35)):
        put("lead", make_lead(m, BAR * 1.1, cutoff=5000, spread=1.6, pluck=0.4, atk=0.01, rel=0.9, sub=0.0),
            bt(46), g, 0.0, {"hall": 0.5, "big": 0.5})
    put("pad", make_pad([E + 24, E + 31, E + 36], BAR * 1.6, 500, 2500, atk=0.05, rel=1.5, gain=0.14), bt(46), 1.0, 0.0, {"hall": 0.5})
    # the melody box, alone again -- unresolved
    for i, nme in enumerate(("A4", "D5", "F5")):
        mb_note(n2m(nme) + 12 + 2, bt(46, 8) + i * BEAT * 1.0, 0.80 - 0.10 * i, pan=(-0.3 if i % 2 == 0 else 0.3), pp=0.6, hall=0.7)
    mb_note(n2m("C#5") + 12 + 2, bt(46, 8) + 3 * BEAT * 1.0 + 0.1, 0.62, pan=0.0, pp=0.6, hall=0.8)   # leading tone, never resolves
    for s, v in ((0, 0.9), (12, 0.75)):
        heart_at(bt(47, s) + 0.04, v, {"big": 0.2})
    heart_at(bt(47, 0) + 0.04 + BEAT * 1.9, 0.5, {"big": 0.3})
    print(f"  arrangement done {time.time() - T:.1f}s", flush=True)


# =====================================================================================
#  reverbs, sidechain, master
# =====================================================================================
def make_ir(rt60, predelay=0.015, damp=7000.0, seed=1):
    n = int((rt60 + predelay) * SR)
    t = np.arange(n) / SR
    r = np.random.default_rng(seed)
    out = np.zeros((2, n))
    for ch in range(2):
        nz = r.standard_normal(n)
        bright = lp(nz, damp, 2) * np.exp(-6.9 * np.maximum(t - predelay, 0) / (rt60 * 0.5))
        dark = lp(nz, damp * 0.28, 2) * np.exp(-6.9 * np.maximum(t - predelay, 0) / rt60) * 1.5
        ir = (0.55 * bright + dark)
        ir[t < predelay] = 0.0
        ir *= np.minimum(np.maximum(t - predelay, 0) / 0.006, 1.0)
        ir = hp(ir, 120, 2)
        out[ch] = ir
    # normalise so that the wet signal has the same level as the send in the 300-3000 Hz band
    spec = np.abs(np.fft.rfft(out, axis=1)) ** 2
    fr = np.fft.rfftfreq(n, 1.0 / SR)
    band = (fr > 300) & (fr < 3000)
    out /= np.sqrt(spec[:, band].mean(axis=1))[:, None]
    return out


def conv(x, ir):
    return np.stack([signal.oaconvolve(x[c], ir[c])[:N] for c in range(2)])


def duck_env(times_strength, depth, rel=0.16, atk=0.004):
    env = np.ones(N)
    L = int(rel * 4.5 * SR)
    tt = np.arange(L) / SR
    shape = np.exp(-tt / rel)
    for t, s in times_strength:
        i0 = int(t * SR)
        if i0 >= N:
            continue
        m = min(L, N - i0)
        dip = 1.0 - depth * min(s, 1.0) * shape[:m] * np.minimum(tt[:m] / atk, 1.0) ** 0.5
        env[i0:i0 + m] = np.minimum(env[i0:i0 + m], dip)
    return env


def pingpong(x, d, fb, taps, wet=1.0):
    mono = lp(x[0] + x[1], 6500, 2)
    y = np.zeros((2, N))
    for k in range(1, taps + 1):
        sh = int(round(k * d * SR))
        if sh >= N:
            break
        y[k % 2, sh:] += mono[: N - sh] * (fb ** (k - 1)) * 0.7 * wet
    return y


def limiter(x, ceiling=0.86, look_ms=4.0, rel_ms=90.0):
    look = int(look_ms * 1e-3 * SR)
    pk = np.maximum(np.abs(x[0]), np.abs(x[1]))
    pk = maximum_filter1d(pk, size=2 * look + 1)
    g = np.minimum(1.0, ceiling / np.maximum(pk, 1e-9))
    g = minimum_filter1d(g, size=2 * look + 1)
    g = uniform_filter1d(g, size=look + 1)
    coef = 1.0 - np.exp(-1.0 / (rel_ms * 1e-3 * SR))
    g = slow_release(g, coef)
    return x * g


def bar_curve(points):
    """piecewise-linear curve (in dB) over bar position -> linear gain array of length N"""
    xs = [q[0] for q in points]
    ys = [q[1] for q in points]
    tb = np.arange(N) / SR / BAR
    return 10.0 ** (np.interp(tb, xs, ys) / 20.0)


# per-bus mix automation in dB (bar, dB).  Music box sits on top in Intro/Starting/Climax, tucks under the band in Major/Final.
BUS_AUTO = {
    "mb": [(0, 0), (7.99, 0), (8, -5.5), (23.99, -5.5), (24, -1), (27.99, -1), (28, -5), (45.99, -5), (46, 0), (48, 0)],
    "pad": [(0, 0), (48, 0)],
}
# loudness arc: target RMS (dBFS, per channel, before the glue compressor) for each section
TARGET_DB = {"INTRO": -27.0, "STARTING": -22.5, "MAJOR": -16.0, "CLIMAX": -23.5, "FINAL": -14.0}
# gentle build inside a section (dB offsets, added to the section target)
RAMP_DB = [(0, -1.0), (3.99, 1.0), (4, -3.0), (7.8, 2.0), (8, 0), (23.99, 0.5), (24, -1.5), (27.7, 3.0),
           (28, -0.5), (35.99, 0.0), (36, 1.0), (45.99, 1.0), (46, 0.5), (47.3, -1.0), (48, -2.0)]


def auto_level(mix):
    """set the dynamic arc: measure each section's RMS and ride one smooth gain per section"""
    g_db = np.zeros(N)
    for name, a, b in SECTIONS:
        i0, i1 = int(a * BAR * SR), int(min(b, NBARS) * BAR * SR)
        seg = mix[:, i0:i1]
        rms_db = 20 * np.log10(np.sqrt((seg ** 2).mean()) + 1e-12)
        g_db[i0:i1] = TARGET_DB[name] - rms_db
        print(f"    {name:9s} measured {rms_db:6.1f} dB -> gain {TARGET_DB[name] - rms_db:+5.1f} dB", flush=True)
    g_db = uniform_filter1d(g_db, size=int(0.6 * SR), mode="nearest")
    tb = np.arange(N) / SR / BAR
    g_db += np.interp(tb, [q[0] for q in RAMP_DB], [q[1] for q in RAMP_DB])
    return mix * (10.0 ** (g_db / 20.0))[None, :]


def master():
    T = time.time()
    # ------- sidechain (kick ducks bass/pad/lead/mb)
    d_hard = duck_env(KICKS, 0.90, 0.17)
    d_med = duck_env(KICKS, 0.60, 0.15)
    d_soft = duck_env(KICKS, 0.22, 0.12)
    for bus in ("sub", "bass"):
        B[bus] *= d_hard
    B["pad"] *= d_med
    B["lead"] *= d_med * 0.5 + 0.5
    B["mb"] *= d_soft
    for bus, pts in BUS_AUTO.items():
        B[bus] *= bar_curve(pts)[None, :]
    B["pp"] *= bar_curve(BUS_AUTO["mb"])[None, :]        # echoes follow the music-box level
    B["hall"] *= bar_curve(BUS_AUTO["mb"])[None, :] ** 0.5

    # ------- reverbs (IRs are level-matched to their sends in the mids)
    irs = {"hall": make_ir(3.4, 0.02, 7000, 1), "room": make_ir(0.9, 0.008, 6500, 2), "big": make_ir(4.8, 0.03, 4500, 3)}
    wet = {}
    for k, ir in irs.items():
        wet[k] = conv(hp(B[k], 250, 2), ir)
    pp = pingpong(B["pp"], 3 * STEP, 0.55, 7)
    for g0, g1 in GAPS:
        i0, i1 = int(g0 * SR), int(g1 * SR)
        pp[:, i0:i1] = 0.0
        ramp = np.linspace(1.0, 0.10, i1 - i0)
        for k in wet:
            wet[k][:, i0:i1] *= ramp          # the tail of the last bar fades into the vacuum
    print(f"  reverb done {time.time() - T:.1f}s", flush=True)

    mix = (B["mb"] * 1.0 + B["drum"] * 1.0 + B["kick"] * 1.0 + B["bass"] * 0.85 + B["sub"] * 0.72 +
           B["lead"] * 1.0 + B["pad"] * 1.0 + B["fx"] * 1.0 + B["heart"] * 1.0 +
           wet["hall"] * 0.95 + wet["room"] * 0.8 + wet["big"] * 0.8 + pp * 0.6)

    stems = {"mb": B["mb"] + pp * 0.6, "drums": B["drum"] + B["kick"], "bass": B["bass"] + B["sub"], "lead": B["lead"], "pad": B["pad"],
             "fx": B["fx"], "verb": wet["hall"] + wet["room"] + wet["big"]}
    mix = hp(mix, 30, 4)
    mix = auto_level(mix)
    mix = compressor(np.ascontiguousarray(mix), SR, -13.0, 2.0, 12.0, 140.0, 1.5)
    mix = np.tanh(mix * 1.1) / np.tanh(1.1)
    mix = limiter(mix, 0.86)
    # gentle end fade so the last tail never clicks
    tail = int(1.2 * SR)
    mix[:, -tail:] *= np.linspace(1, 0, tail) ** 1.5
    mix[:, :int(0.004 * SR)] *= np.linspace(0, 1, int(0.004 * SR))
    print(f"  master done {time.time() - T:.1f}s", flush=True)
    return mix, stems


def main(out):
    t0 = time.time()
    print(f"BPM {BPM}  bar {BAR:.4f}s  total {DUR:.3f}s  samples {N}", flush=True)
    arrange()
    mix, stems = master()
    wavfile.write(out, SR, (mix.T).astype(np.float32))
    np.savez(out.replace(".wav", "_meta.npz"),
             kicks=np.array(KICKS), snares=np.array(SNARES), hearts=np.array(HEARTS),
             impacts=np.array([t for t, _ in EVENTS["impact"]]),
             impact_sizes=np.array([s for _, s in EVENTS["impact"]]))
    print(f"wrote {out}  ({time.time() - t0:.1f}s)", flush=True)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "song.wav")
