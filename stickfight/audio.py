#!/usr/bin/env python3
"""
audio.py - fully procedural soundtrack + sound effects for "YIN vs YANG".

    python3 audio.py --events events.json --sections sections.json --out audio.wav [--dur 120]
    python3 audio.py --selftest

Importable:
    render(events, sections, dur=120.0, sr=44100) -> np.ndarray float32 (N, 2)
    write_wav(path, data, sr)

Pure numpy (scipy is NOT required).  All filtering is done in the frequency
domain (analog-prototype biquad responses applied through FFTs, or overlap-add
"swept" filtering for time-varying cutoffs), which keeps everything vectorised.
Everything is deterministic (per-sound RNGs are seeded from stable keys).
"""
import argparse
import json
import math
import os
import sys
import time
import wave
import zlib
from functools import lru_cache

import numpy as np

SR = 44100
TWO_PI = 2.0 * np.pi
_CACHED = []


def _cached(fn):
    c = lru_cache(maxsize=None)(fn)
    _CACHED.append(c)
    return c


def _set_sr(sr):
    global SR
    sr = int(sr)
    if sr != SR:
        SR = sr
        for c in _CACHED:
            c.cache_clear()
        _IR_CACHE.clear()


# ----------------------------------------------------------------------------
# basic helpers
# ----------------------------------------------------------------------------
def rng_for(*key):
    return np.random.default_rng(zlib.crc32(repr(key).encode("utf-8")))


def tarr(n):
    return np.arange(n, dtype=np.float64) / SR


def smooth(x):
    x = np.clip(x, 0.0, 1.0)
    return x * x * (3.0 - 2.0 * x)


def attack(t, a):
    return smooth(t / max(a, 1e-6))


def mtof(m):
    return 440.0 * 2.0 ** ((m - 69) / 12.0)


def scale_midis(pcs, lo, hi):
    return [m for m in range(lo, hi + 1) if m % 12 in pcs]


D_MIN_PENT = (2, 5, 7, 9, 0)      # D F G A C
D_MAJ_PENT = (2, 4, 6, 9, 11)     # D E F# A B


def fsine(f, phase0=0.0):
    """sine with per-sample instantaneous frequency array f (Hz)."""
    return np.sin(phase0 + TWO_PI * np.cumsum(f) / SR)


def harm_sum(theta, weights):
    """sum_k weights[k-1]*sin(k*theta) using a complex multiplication chain."""
    z = np.exp(1j * theta)
    p = z
    acc = weights[0] * p.imag
    for w in weights[1:]:
        p = p * z
        acc = acc + w * p.imag
    return acc


def peak(x):
    return float(np.max(np.abs(x))) if len(x) else 0.0


def normpk(x, p=1.0):
    m = np.max(np.abs(x))
    return x * (p / m) if m > 1e-12 else x


def unit_rms(x):
    r = math.sqrt(float(np.mean(x * x))) + 1e-12
    return x / r


# ----------------------------------------------------------------------------
# filters (frequency domain)
# ----------------------------------------------------------------------------
@lru_cache(maxsize=4096)
def _nfft(n):
    n = int(max(n, 16))
    best = 1 << int(math.ceil(math.log2(n)))
    p5 = 1
    while p5 < best:
        p35 = p5
        while p35 < best:
            q = -(-n // p35)
            p2 = 1 << int(math.ceil(math.log2(q))) if q > 1 else 1
            cand = p35 * p2
            if cand < best:
                best = cand
            p35 *= 3
        p5 *= 5
    return best + (best & 1)


def _resp(kind, f, fc, q):
    r = f / fc
    if kind == "lp1":
        return 1.0 / (1.0 + 1j * r)
    if kind == "hp1":
        return (1j * r) / (1.0 + 1j * r)
    den = 1.0 - r * r + 1j * r / q
    if kind == "lp":
        return 1.0 / den
    if kind == "hp":
        return -(r * r) / den
    if kind == "bp":
        return (1j * r / q) / den
    if kind == "lp4":
        return 1.0 / (den * den)
    if kind == "hp4":
        return (r * r) * (r * r) / (den * den)
    raise ValueError(kind)


def filt(x, kind, fc, q=0.707, pad=0.3):
    n = len(x)
    if n == 0:
        return x
    m = _nfft(n + int(SR * pad))
    X = np.fft.rfft(x, m)
    f = np.fft.rfftfreq(m, 1.0 / SR)
    return np.fft.irfft(X * _resp(kind, f, float(fc), float(q)), m)[:n]


def formant(x, bank, pad=0.3):
    n = len(x)
    m = _nfft(n + int(SR * pad))
    X = np.fft.rfft(x, m)
    f = np.fft.rfftfreq(m, 1.0 / SR)
    H = 0
    for fc, q, g in bank:
        H = H + g * _resp("bp", f, float(fc), float(q))
    return np.fft.irfft(X * H, m)[:n]


def sweep(x, kind, fc, q=0.9, hop=1024):
    """Time-varying filter: Hann-windowed 50 % overlap-add frames, each filtered
    with the response for its centre cutoff.  fc / q: scalar or per-sample arrays."""
    n = len(x)
    if n == 0:
        return x
    fc = np.broadcast_to(np.asarray(fc, dtype=np.float64), (n,))
    q = np.broadcast_to(np.asarray(q, dtype=np.float64), (n,))
    nf = (n + hop - 1) // hop + 1
    xp = np.zeros((nf + 1) * hop)
    xp[hop:hop + n] = x
    w = 0.5 - 0.5 * np.cos(TWO_PI * np.arange(2 * hop) / (2 * hop))
    size = 4 * hop
    f = np.fft.rfftfreq(size, 1.0 / SR)[None, :]
    ob = np.zeros((nf + 4, hop))
    ar = np.arange(2 * hop)[None, :]
    for s in range(0, nf, 256):
        e = min(nf, s + 256)
        ks = np.arange(s, e)
        frames = xp[ks[:, None] * hop + ar] * w
        X = np.fft.rfft(frames, size, axis=1)
        cen = np.minimum(ks * hop, n - 1)
        H = _resp(kind, f, fc[cen][:, None], q[cen][:, None])
        y = np.fft.irfft(X * H, size, axis=1)
        for j in range(4):
            ob[s + j:e + j] += y[:, j * hop:(j + 1) * hop]
    return ob.reshape(-1)[hop:hop + n]


def bn(rng, n, kind, fc, q=0.707):
    """unit-std filtered white noise."""
    x = filt(rng.standard_normal(n), kind, fc, q)
    return x / (np.std(x) + 1e-12)


def slow_rand(rng, n, rate_hz):
    """smooth random curve in [-1,1], ~rate_hz new targets per second."""
    k = max(3, int(n / SR * rate_hz) + 3)
    pts = rng.uniform(-1, 1, k)
    xs = np.linspace(0, k - 1, n)
    i = np.minimum(xs.astype(int), k - 2)
    fr = xs - i
    fr = 0.5 - 0.5 * np.cos(np.pi * fr)
    return pts[i] * (1 - fr) + pts[i + 1] * fr


def pan_gains(p):
    a = (np.clip(p, -1, 1) + 1.0) * np.pi / 4.0
    return np.cos(a), np.sin(a)


def st(mono, p=0.0):
    l, r = pan_gains(p)
    return np.stack([mono * l, mono * r])


def st_sweep(mono, p0, p1, curve=None):
    n = len(mono)
    x = np.linspace(0, 1, n) if curve is None else curve
    l, r = pan_gains(p0 + (p1 - p0) * x)
    return np.stack([mono * l, mono * r])


def fade_env(n, fin, fout):
    e = np.ones(n)
    a = int(fin * SR)
    b = int(fout * SR)
    if a > 0:
        a = min(a, n)
        e[:a] *= np.sin(np.pi / 2 * np.arange(a) / a) ** 2
    if b > 0:
        b = min(b, n)
        e[n - b:] *= np.cos(np.pi / 2 * np.arange(b) / b) ** 2
    return e


# ----------------------------------------------------------------------------
# drums / plucks (cached, unit peak)
# ----------------------------------------------------------------------------
@_cached
def _taiko(big, pitch_idx, var):
    rng = rng_for("taiko", big, pitch_idx, var)
    p = 2.0 ** (pitch_idx / 12.0)
    n = int((2.2 if big else 1.0) * SR)
    t = tarr(n)
    if big:
        f0, f1, tf, ta = 100 * p, 45 * p, 0.07, 0.62
    else:
        f0, f1, tf, ta = 138 * p, 72 * p, 0.035, 0.24
    f0 *= rng.uniform(0.97, 1.03)
    f = f1 + (f0 - f1) * np.exp(-t / tf)
    ph = TWO_PI * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t / ta)
    body += 0.32 * np.sin(1.59 * ph + 0.7) * np.exp(-t / (ta * 0.35))
    body += 0.16 * np.sin(2.14 * ph + 1.9) * np.exp(-t / (ta * 0.2))
    stick = bn(rng, n, "bp", rng.uniform(1100, 1700), 0.7) * np.exp(-t / 0.022)
    thump = bn(rng, n, "lp", 220, 0.7) * np.exp(-t / 0.05)
    x = (body + 0.55 * stick + 0.35 * thump) * attack(t, 0.0015)
    x[-int(0.05 * SR):] *= np.linspace(1, 0, int(0.05 * SR))
    return normpk(x, 1.0)


@_cached
def _shime(var):
    rng = rng_for("shime", var)
    n = int(0.28 * SR)
    t = tarr(n)
    f = 280 + 160 * np.exp(-t / 0.02)
    body = fsine(f) * np.exp(-t / 0.05)
    nz = bn(rng, n, "bp", 3200, 1.5) * np.exp(-t / 0.028)
    nz2 = bn(rng, n, "hp", 5000, 0.7) * np.exp(-t / 0.012)
    x = (0.7 * body + nz + 0.4 * nz2) * attack(t, 0.001)
    x[-200:] *= np.linspace(1, 0, 200)
    return normpk(x, 1.0)


@_cached
def _rim(var):
    rng = rng_for("rim", var)
    n = int(0.3 * SR)
    t = tarr(n)
    f = 300 + 60 * np.exp(-t / 0.01)
    body = fsine(f) * np.exp(-t / 0.06)
    a = bn(rng, n, "bp", 2300, 2.0) * np.exp(-t / 0.02)
    b = bn(rng, n, "bp", 900, 3.0) * np.exp(-t / 0.035)
    x = (0.6 * body + a + 0.6 * b) * attack(t, 0.0008)
    x[-300:] *= np.linspace(1, 0, 300)
    return normpk(x, 1.0)


@_cached
def _sub(dur_tau):
    n = int(1.2 * SR)
    t = tarr(n)
    f = 40 + 22 * np.exp(-t / 0.05)
    x = fsine(f) * np.exp(-t / dur_tau) * attack(t, 0.006)
    x[-2000:] *= np.linspace(1, 0, 2000)
    return normpk(x, 1.0)


@_cached
def _heart(kind):
    rng = rng_for("heart", kind)
    n = int((1.6 if kind == "deep" else 0.5) * SR)
    t = tarr(n)
    if kind == "deep":
        f = 33 + 20 * np.exp(-t / 0.09)
        x = fsine(f) * np.exp(-t / 0.42)
        x += 0.25 * bn(rng, n, "lp", 110, 0.7) * np.exp(-t / 0.2)
        x *= attack(t, 0.012)
    else:
        f = 46 + 30 * np.exp(-t / 0.04)
        x = fsine(f) * np.exp(-t / 0.11)
        x += 0.25 * bn(rng, n, "lp", 160, 0.7) * np.exp(-t / 0.05)
        x *= attack(t, 0.008)
    x[-int(0.04 * SR):] *= np.linspace(1, 0, int(0.04 * SR))
    return normpk(x, 1.0)


@_cached
def _ks(f10, dur, var):
    """Karplus-Strong pluck (block-wise vectorised), slight pitch twang."""
    f = f10 / 10.0
    rng = rng_for("ks", f10, dur, var)
    n_out = int(dur * SR)
    N = max(2, int(round(SR / f - 0.5)))
    fa = SR / (N + 0.5)
    tau = 1.5 if f < 400 else 1.1
    rho = math.exp(-(N / SR) / tau)
    speed_avg = f / fa
    nat_needed = int(n_out * speed_avg * 1.05) + 2 * N + 8
    blocks = nat_needed // N + 2
    Y = np.zeros(blocks * N + 1)
    ex = rng.uniform(-1, 1, N)
    # pluck excitation: one-pole smoothed noise + comb (pluck position)
    a = rng.uniform(0.35, 0.6)
    for i in range(1, N):
        ex[i] = ex[i] * (1 - a) + a * ex[i - 1]
    k = max(1, int(N * rng.uniform(0.12, 0.22)))
    ex[k:] = ex[k:] - 0.6 * ex[:-k]
    ex -= np.mean(ex)
    Y[1:1 + N] = ex
    g = 0.5 * rho
    for b in range(blocks - 1):
        s = 1 + b * N
        Y[s + N:s + 2 * N] = g * (Y[s:s + N] + Y[s - 1:s + N - 1])
    y = Y[1:]
    tt = tarr(n_out)
    speed = speed_avg * (1.0 + 0.012 * np.exp(-tt / 0.05))
    idx = np.cumsum(speed) - speed[0]
    idx = np.minimum(idx, len(y) - 2)
    i0 = idx.astype(np.int64)
    fr = idx - i0
    out = y[i0] * (1 - fr) + y[i0 + 1] * fr
    out = out - np.mean(out)
    pick = bn(rng, n_out, "bp", 3200, 1.2) * np.exp(-tt / 0.004) * 0.15 * peak(out)
    out = out + pick
    out *= np.minimum(1.0, (n_out - np.arange(n_out)) / (0.08 * SR))
    return normpk(out, 1.0)


def pluck_sig(midi, dur=2.0, var=0):
    f = mtof(midi)
    return _ks(int(round(f * 10)), float(dur), int(var))


# ----------------------------------------------------------------------------
# bells, gongs, flute, choir building blocks
# ----------------------------------------------------------------------------
BELL_RATIOS = [0.56, 0.92, 1.19, 1.71, 2.0, 2.74, 3.0, 3.76, 4.07]
BELL_AMPS = [0.9, 0.6, 0.55, 0.6, 0.5, 0.35, 0.28, 0.18, 0.12]
BOWL_RATIOS = [1.0, 2.71, 5.15, 8.4]
BOWL_AMPS = [1.0, 0.55, 0.3, 0.12]


def bell_tone(rng, f, dur, style="bell"):
    n = int(dur * SR)
    t = tarr(n)
    out = np.zeros(n)
    if style == "bell":
        ratios, amps, tau0, a_t = BELL_RATIOS, BELL_AMPS, 2.9, 0.003
    else:
        ratios, amps, tau0, a_t = BOWL_RATIOS, BOWL_AMPS, 3.4, 0.05
    for i, (r, a) in enumerate(zip(ratios, amps)):
        fr = f * r
        if fr > 0.45 * SR:
            continue
        tau = tau0 / (1.0 + 0.5 * i) * (0.85 + 0.3 * rng.random())
        ph = rng.uniform(0, TWO_PI)
        env = np.exp(-t / tau) * attack(t, a_t + 0.002 * i)
        beat = 0.35 + 0.25 * i
        out += a * env * (np.sin(TWO_PI * fr * t + ph)
                          + 0.55 * np.sin(TWO_PI * (fr + beat) * t + ph * 1.7))
    if style == "bell":
        out += 0.5 * bn(rng, n, "bp", 3200, 1.0) * np.exp(-t / 0.012)
    out *= np.minimum(1.0, (n - np.arange(n)) / (0.6 * SR))
    return normpk(out, 1.0)


def shaku_note(rng, f, dur, breath=1.0, vib=1.0):
    """breathy shakuhachi-like note: mono."""
    n = int((dur + 0.5) * SR)
    t = tarr(n)
    scoop = 1.0 - 0.045 * np.exp(-t / 0.09)
    vibd = 0.006 * vib * smooth((t - 0.4) / 0.6)
    ff = f * scoop * (1.0 + vibd * np.sin(TWO_PI * 5.1 * t + rng.uniform(0, 6)))
    ff = ff * (1.0 + 0.002 * np.sin(TWO_PI * 0.7 * t))
    theta = TWO_PI * np.cumsum(ff) / SR
    tone = harm_sum(theta, [1.0, 0.28, 0.12, 0.06])
    env = attack(t, 0.13) * (0.85 + 0.15 * np.sin(TWO_PI * 4.2 * t + 1.0))
    rel = np.clip((dur + 0.5 - t) / 0.45, 0, 1)
    rel = np.sin(np.pi / 2 * rel) ** 2
    env = env * rel * (0.9 + 0.1 * smooth(t / dur))
    nz = rng.standard_normal(n)
    b1 = filt(nz, "bp", min(f * 2.0, 8000), 3.0)
    b2 = filt(nz, "bp", min(f * 3.0, 9000), 2.0)
    b1 /= np.std(b1) + 1e-9
    b2 /= np.std(b2) + 1e-9
    chiff = bn(rng, n, "bp", min(f * 2.2, 8000), 1.5) * np.exp(-t / 0.06)
    breath_env = 0.32 * breath * (0.6 + 0.4 * env)
    x = tone * 0.9 + (0.55 * b1 + 0.3 * b2) * breath_env + 0.35 * breath * chiff
    return x * env


def bird_chirp(rng, base):
    n = int(rng.uniform(0.05, 0.09) * SR)
    t = tarr(n)
    x = t / (n / SR)
    f = base * (1 + rng.uniform(-0.25, 0.35) * x)
    f = f * (1 + 0.04 * np.sin(TWO_PI * rng.uniform(25, 45) * t))
    return fsine(f) * np.sin(np.pi * x) ** 1.5


# ----------------------------------------------------------------------------
# SFX renderers: f(rng, amp, p, dur) -> (stereo (2,n), start_offset_seconds)
# ----------------------------------------------------------------------------
def _fin(x, ms=8):
    k = int(ms / 1000 * SR)
    x[-k:] *= np.linspace(1, 0, k)
    return x


def _impact(rng, heavy):
    if heavy:
        n = int(0.9 * SR)
        t = tarr(n)
        f0, f1, tf, ta = 125 * rng.uniform(0.94, 1.06), 40, 0.05, 0.17
    else:
        n = int(0.45 * SR)
        t = tarr(n)
        f0, f1, tf, ta = 145 * rng.uniform(0.93, 1.07), 58, 0.035, 0.075
    f = f1 + (f0 - f1) * np.exp(-t / tf)
    body = fsine(f) * np.exp(-t / ta) * attack(t, 0.002)
    nz = rng.standard_normal(n)
    click = bn(rng, n, "bp", rng.uniform(1800, 3200), 1.2) * np.exp(-t / 0.010)
    slap = bn(rng, n, "hp", 4000, 0.7) * np.exp(-t / 0.006)
    thump = bn(rng, n, "lp", 240 if heavy else 320, 0.7) * np.exp(-t / (0.07 if heavy else 0.045))
    x = body * (1.3 if heavy else 1.0) + 0.55 * click + 0.25 * slap + 0.55 * thump
    if heavy:
        x += 0.5 * bn(rng, n, "lp", 90, 0.7) * np.exp(-t / 0.3)
    return _fin(x)


def r_punch(rng, amp, p, dur):
    return st(normpk(_impact(rng, False), 0.62), p), 0.0


def r_kick(rng, amp, p, dur):
    return st(normpk(_impact(rng, True), 0.78), p), 0.0


def r_block(rng, amp, p, dur):
    n = int(0.3 * SR)
    t = tarr(n)
    x = bn(rng, n, "bp", 1300, 1.4) * np.exp(-t / 0.012)
    for fr, a, tau in ((430, 1.0, 0.045), (890, 0.6, 0.03), (1370, 0.4, 0.02), (2100, 0.2, 0.012)):
        fr *= rng.uniform(0.96, 1.04)
        x += a * np.sin(TWO_PI * fr * t + rng.uniform(0, 6)) * np.exp(-t / tau)
    x += 0.7 * bn(rng, n, "lp", 260, 0.7) * np.exp(-t / 0.03)
    x *= attack(t, 0.0008)
    return st(normpk(_fin(x), 0.5), p), 0.0


def r_clash(rng, amp, p, dur):
    L = 1.6 + 0.9 * min(amp, 2.0)
    n = int(L * SR)
    t = tarr(n)
    base = rng.uniform(820, 1050)
    ratios = [1.0, 1.58, 2.76, 3.9, 5.4, 6.7, 8.93, 11.34]
    x = np.zeros(n)
    for i, r in enumerate(ratios):
        fr = base * r
        if fr > 15000:
            continue
        tau = (0.55 * (0.7 + 0.3 * amp)) / (1 + 0.35 * i)
        a = 1.0 / (1 + 0.25 * i)
        x += a * np.sin(TWO_PI * fr * t + rng.uniform(0, 6)) * np.exp(-t / tau)
        x += 0.5 * a * np.sin(TWO_PI * (fr + 1.7 + i) * t + rng.uniform(0, 6)) * np.exp(-t / tau)
    burst = bn(rng, n, "hp", 2500, 0.7) * np.exp(-t / 0.05)
    crack = bn(rng, n, "bp", 5000, 0.8) * np.exp(-t / 0.15) * 0.4
    low = np.sin(TWO_PI * 90 * t) * np.exp(-t / 0.1) * 0.7
    x = (x * 0.55 + 1.0 * burst + crack + low) * attack(t, 0.0006)
    x *= np.minimum(1.0, (n - np.arange(n)) / (0.3 * SR))
    return st(normpk(x, 0.7), p), 0.0


def r_slam(rng, amp, p, dur):
    n = int(1.9 * SR)
    t = tarr(n)
    f = 34 + 45 * np.exp(-t / 0.09)
    body = fsine(f) * np.exp(-t / 0.3) * attack(t, 0.003)
    fc = 3500 * (700 / 3500) ** np.clip(t / 0.6, 0, 1)
    spl = sweep(rng.standard_normal(n), "bp", fc, 0.9)
    spl = spl / (np.std(spl) + 1e-9) * np.exp(-t / 0.28) * attack(t, 0.004)
    thud = bn(rng, n, "lp", 260, 0.7) * np.exp(-t / 0.07)
    bub = _bubbles(rng, n, 18, 0.9, t0=0.05)
    x = 1.25 * body + 0.6 * spl + 0.7 * thud + 0.25 * bub
    x *= np.minimum(1.0, (n - np.arange(n)) / (0.2 * SR))
    return st(normpk(x, 0.85), p), 0.0


def r_boom(rng, amp, p, dur):
    n = int(3.8 * SR)
    t = tarr(n)
    f = 33 + 20 * np.exp(-t / 0.4)
    ph = TWO_PI * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t / 1.15) * attack(t, 0.006)
    body = np.tanh(1.6 * body) / 1.6 + 0.18 * np.sin(2 * ph) * np.exp(-t / 0.5)
    rum = bn(rng, n, "lp4", 85, 0.7) * (1 + 0.3 * np.sin(TWO_PI * 3.1 * t + 1.0))
    rum *= np.exp(-t / 1.15) * attack(t, 0.12)
    crack = bn(rng, n, "lp", 480, 0.7) * np.exp(-t / 0.1) * attack(t, 0.002)
    tail = bn(rng, n, "lp", 900, 0.7) * np.exp(-t / 0.5) * 0.25
    x = 1.0 * body + 0.9 * rum + 0.75 * crack + tail
    x *= np.minimum(1.0, (n - np.arange(n)) / (0.6 * SR))
    return st(normpk(x, 1.0), p * 0.5), 0.0


def r_whoosh(rng, amp, p, dur):
    d = float(np.clip(dur if dur else 0.3, 0.15, 0.6))
    n = int((d + 0.05) * SR)
    x = np.linspace(0, 1, n)
    up = rng.random() < 0.6
    fc = 450 * (2600 / 450) ** (x if up else 1 - x)
    nz = sweep(rng.standard_normal(n), "bp", fc, 1.6)
    nz /= np.std(nz) + 1e-9
    env = np.sin(np.pi * np.clip(x ** 0.8, 0, 1)) ** 1.6
    lowb = bn(rng, n, "lp", 500, 0.7) * env * 0.35
    y = normpk(nz * env + lowb, 0.35)
    _fin(y, 15)
    s = 1 if rng.random() < 0.5 else -1
    return st_sweep(y, p - 0.3 * s, p + 0.3 * s), 0.0


def _bubbles(rng, n, count, span, t0=0.0):
    t = tarr(n)
    out = np.zeros(n)
    for _ in range(count):
        ts = t0 + rng.exponential(span / 3.0)
        i0 = int(ts * SR)
        ln = int(rng.uniform(0.02, 0.05) * SR)
        if i0 + ln >= n:
            continue
        tt = np.arange(ln) / SR
        f = rng.uniform(600, 2800) * (1 + 3.0 * tt / 0.05)
        b = np.sin(TWO_PI * np.cumsum(f) / SR) * np.exp(-tt / 0.012) * rng.uniform(0.3, 1.0)
        out[i0:i0 + ln] += b
    return out


def r_splash(rng, amp, p, dur):
    n = int(1.0 * SR)
    t = tarr(n)
    a = bn(rng, n, "hp", 900, 0.7) * np.exp(-t / 0.12) * attack(t, 0.003)
    b = bn(rng, n, "bp", 600, 0.9) * np.exp(-t / 0.2) * 0.5
    bub = _bubbles(rng, n, int(rng.integers(16, 28)), 0.6, 0.02)
    imp = (rng.random(n) < (0.004 * np.exp(-t / 0.25))).astype(float) * rng.standard_normal(n)
    crack = filt(imp, "hp", 4000, 0.7)
    crack = crack / (np.std(crack) + 1e-9) * 0.6 * np.exp(-t / 0.3)
    x = a + b + 0.35 * bub + 0.5 * crack
    x *= np.minimum(1.0, (n - np.arange(n)) / (0.15 * SR))
    return st(normpk(x, 0.6), p), 0.0


def _thunder_core(rng, dur):
    n = int(dur * SR)
    t = tarr(n)
    crack = bn(rng, n, "hp", 1500, 0.7) * np.exp(-t / 0.05) * attack(t, 0.001)
    crack += 0.7 * bn(rng, n, "bp", 400, 0.8) * np.exp(-t / 0.18) * attack(t, 0.001)
    e = np.zeros(n)
    k = int(rng.integers(6, 10))
    for i in range(k):
        tk = rng.uniform(0.05, dur * 0.6)
        a = rng.uniform(0.4, 1.0) * (1.0 - 0.6 * tk / dur)
        tau = rng.uniform(0.25, 0.7)
        m = t >= tk
        e[m] += a * np.exp(-(t[m] - tk) / tau) * attack(t[m] - tk, 0.05)
    e = e * np.exp(-t / (dur * 0.42)) + 0.4 * np.exp(-t / 1.6) * attack(t, 0.08)
    rum = rng.standard_normal(n)
    fc = 380 * (70 / 380) ** np.clip(t / dur, 0, 1)
    rum = sweep(rum, "lp4", fc, 0.7)
    rum = rum / (np.std(rum) + 1e-9) * e
    rum2 = bn(rng, n, "bp", 140, 1.0) * e * 0.6
    x = 0.9 * crack + 1.0 * rum + rum2
    x *= np.minimum(1.0, (n - np.arange(n)) / (0.7 * SR))
    return x


def r_thunder(rng, amp, p, dur):
    x = _thunder_core(rng, 4.2)
    return st(normpk(x, 0.9), p * 0.6), 0.0


def r_lightning(rng, amp, p, dur):
    n = int(3.8 * SR)
    t = tarr(n)
    gate = ((np.sin(TWO_PI * 100 * t) > -0.3) * (0.5 + 0.5 * np.sin(TWO_PI * 37 * t + 1))).astype(float)
    buzz = bn(rng, n, "hp", 900, 0.7) * gate * np.exp(-t / 0.18) * attack(t, 0.001)
    imp = (rng.random(n) < (0.02 * np.exp(-t / 0.2))).astype(float) * rng.standard_normal(n)
    zap = filt(imp, "hp", 2500, 0.7)
    zap = zap / (np.std(zap) + 1e-9) * 0.9 * np.exp(-t / 0.35)
    saw = (2 * ((120 * t) % 1) - 1) * np.exp(-t / 0.12) * 0.4
    saw = filt(saw, "bp", 1400, 1.0)
    sig = 0.9 * buzz + zap + 1.2 * saw
    th = _thunder_core(rng, 3.7)
    d = int(0.05 * SR)
    out = np.zeros(n)
    out[:] += sig
    m = min(len(th), n - d)
    out[d:d + m] += 0.85 * th[:m]
    out *= np.minimum(1.0, (n - np.arange(n)) / (0.6 * SR))
    return st(normpk(out, 0.9), p * 0.6), 0.0


def r_charge(rng, amp, p, dur):
    d = float(np.clip(dur if dur else 2.0, 0.3, 8.0))
    n = int((d + 0.12) * SR)
    t = tarr(n)
    x = np.clip(t / d, 0, 1)
    fc = 250 * 24.0 ** x
    nz = sweep(rng.standard_normal(n), "bp", fc, 2.2)
    nz = nz / (np.std(nz) + 1e-9) * (x ** 2.2)
    f = 100 * 5.0 ** (x ** 1.4)
    saw = np.zeros(n)
    for c in (-13, -5, 0, 5, 12):
        ph = np.cumsum(f * 2 ** (c / 1200)) / SR + rng.random()
        saw += 2 * (ph % 1) - 1
    saw = sweep(saw / 5, "lp", 500 * 8.0 ** x, 0.9)
    saw = saw / (np.std(saw) + 1e-9) * (x ** 2.0)
    sine = fsine(f * 2) * (x ** 2.5)
    y = 0.8 * nz + 0.7 * saw + 0.5 * sine
    tail = np.clip(1 - (t - d) / 0.08, 0, 1)
    y *= np.where(t <= d, 1.0, tail)
    y *= attack(t, 0.05)
    return st(normpk(y, 0.55), p), -d


def r_bell(rng, amp, p, dur):
    f = mtof(int(rng.choice([50, 57, 62, 65, 67, 69])) + 12 * int(rng.integers(0, 2)))
    x = bell_tone(rng, f, float(np.clip(dur if dur else 7.5, 3, 10)), "bell")
    return st(normpk(x, 0.5), p), 0.0


def r_gong(rng, amp, p, dur):
    n = int(8.0 * SR)
    t = tarr(n)
    f0 = rng.uniform(88, 100)
    ratios = [1.0, 1.39, 1.98, 2.31, 2.86, 3.52, 4.18, 5.05, 6.4, 7.9]
    x = np.zeros(n)
    for i, r in enumerate(ratios):
        fr = f0 * r * (1 + 0.012 * np.exp(-t / 0.6))
        ta = 0.15 + 0.12 * i
        tau = 4.6 / (1 + 0.32 * i)
        env = (1 - np.exp(-t / ta)) * np.exp(-t / tau)
        a = 1.0 / (1 + 0.18 * i)
        ph = rng.uniform(0, 6)
        x += a * env * (np.sin(ph + TWO_PI * np.cumsum(fr) / SR)
                        + 0.6 * np.sin(ph + TWO_PI * np.cumsum(fr + 0.5 + 0.3 * i) / SR))
    strike = bn(rng, n, "bp", 700, 0.8) * np.exp(-t / 0.08) * attack(t, 0.002)
    wash = bn(rng, n, "bp", 1900, 0.7) * (1 - np.exp(-t / 0.7)) * np.exp(-t / 1.8)
    x = x * 0.5 + 0.6 * strike + 0.3 * wash
    x *= np.minimum(1.0, (n - np.arange(n)) / (1.0 * SR))
    return st(normpk(x, 0.8), p), 0.0


def r_shatter(rng, amp, p, dur):
    n = int(1.4 * SR)
    t = tarr(n)
    rate = 260 * np.exp(-t / 0.3) + 25
    imp = (rng.random(n) < rate / SR).astype(float) * rng.exponential(1.0, n)
    imp *= rng.choice([-1.0, 1.0], n)
    c = np.zeros(n)
    for kind, fc, q, g in (("bp", 3500, 3.0, 1.0), ("bp", 6500, 4.0, 0.9), ("hp", 9000, 0.7, 0.7)):
        b = filt(imp, kind, fc, q)
        c += g * b / (np.std(b) + 1e-9)
    c *= np.exp(-t / 0.45)
    crack = bn(rng, n, "hp", 1500, 0.7) * np.exp(-t / 0.02) * attack(t, 0.0006)
    crunch = bn(rng, n, "bp", 420, 1.0) * np.exp(-t / 0.06)
    ticks = np.zeros(n)
    for _ in range(int(rng.integers(7, 12))):
        i0 = int(rng.uniform(0, 0.5) * SR)
        ln = int(0.05 * SR)
        tt = np.arange(ln) / SR
        ticks[i0:i0 + ln] += (rng.uniform(0.3, 1.0) * np.sin(TWO_PI * rng.uniform(2500, 9000) * tt)
                              * np.exp(-tt / rng.uniform(0.006, 0.018)))
    x = 0.55 * c + 1.0 * crack + 0.4 * crunch + 0.6 * ticks
    x *= np.minimum(1.0, (n - np.arange(n)) / (0.2 * SR))
    return st(normpk(x, 0.6), p), 0.0


def r_sword(rng, amp, p, dur):
    n = int(1.6 * SR)
    t = tarr(n)
    x = np.clip(t / 0.36, 0, 1)
    fc = 1800 * (9000 / 1800) ** smooth(x)
    nz = sweep(rng.standard_normal(n), "bp", fc, 7.0 + 5 * x)
    nz = nz / (np.std(nz) + 1e-9)
    env = attack(t, 0.28) * np.exp(-np.maximum(t - 0.3, 0) / 0.22)
    ring = np.zeros(n)
    tr = np.maximum(t - 0.2, 0)
    for i, fr in enumerate((3100, 4650, 6280, 8330, 10300)):
        fr *= rng.uniform(0.985, 1.015)
        e = np.exp(-tr / (0.6 / (1 + 0.3 * i))) * attack(tr, 0.01) * (t > 0.2)
        ring += (0.8 / (1 + 0.4 * i)) * e * (np.sin(TWO_PI * fr * t)
                                             + 0.5 * np.sin(TWO_PI * (fr + 3 + i) * t))
    rasp = bn(rng, n, "hp", 4000, 0.7) * env * 0.3
    y = 0.9 * nz * env + 0.55 * ring + rasp
    y *= np.minimum(1.0, (n - np.arange(n)) / (0.3 * SR))
    return st(normpk(y, 0.5), p), -0.15


def r_slice(rng, amp, p, dur):
    n = int(0.6 * SR)
    t = tarr(n)
    x = np.clip(t / 0.12, 0, 1)
    fc = 2500 * (8000 / 2500) ** x
    nz = sweep(rng.standard_normal(n), "bp", fc, 2.5)
    nz = nz / (np.std(nz) + 1e-9) * np.exp(-t / 0.05) * attack(t, 0.003)
    hp = bn(rng, n, "hp", 6000, 0.7) * np.exp(-t / 0.025)
    ring = np.zeros(n)
    for fr, a in ((5200, 1.0), (7700, 0.6), (9100, 0.4)):
        ring += a * np.sin(TWO_PI * fr * rng.uniform(0.99, 1.01) * t) * np.exp(-t / 0.18)
    y = nz + 0.3 * hp + 0.14 * ring * attack(t, 0.004)
    y *= np.minimum(1.0, (n - np.arange(n)) / (0.1 * SR))
    return st(normpk(y, 0.5), p), 0.0


def r_swell(rng, amp, p, dur):
    d = float(np.clip(dur if dur else 4.0, 1.0, 12.0))
    n = int(d * SR)
    t = tarr(n)
    x = np.linspace(0, 1, n)
    fc = 250 * (1400 / 250) ** np.sin(np.pi * x)
    outs = []
    for _ in range(2):
        nz = sweep(rng.standard_normal(n), "bp", fc, 0.8)
        outs.append(nz / (np.std(nz) + 1e-9))
    env = np.sin(np.pi * x ** 0.9) ** 2
    pad = np.sin(TWO_PI * 73.4 * t) + 0.6 * np.sin(TWO_PI * 110.0 * t)
    o = np.stack([outs[0] * env + 0.25 * pad * env, outs[1] * env + 0.25 * pad * env])
    o = o * np.array([[pan_gains(p)[0] * 1.4142], [pan_gains(p)[1] * 1.4142]])
    return normpk(o, 0.35), 0.0


def r_thud(rng, amp, p, dur):
    n = int(0.4 * SR)
    t = tarr(n)
    f = 50 + 55 * np.exp(-t / 0.04)
    x = fsine(f) * np.exp(-t / 0.09) * attack(t, 0.003)
    x += 0.5 * bn(rng, n, "lp", 300, 0.7) * np.exp(-t / 0.05)
    return st(normpk(_fin(x), 0.4), p), 0.0


# kind -> (renderer, reverb send, duck depth, duck release s)
KINDS = {
    "punch": (r_punch, 0.12, 0.0, 0),
    "hit": (r_punch, 0.12, 0.0, 0),
    "kick": (r_kick, 0.16, 0.10, 0.25),
    "block": (r_block, 0.10, 0.0, 0),
    "clash": (r_clash, 0.40, 0.32, 0.45),
    "slam": (r_slam, 0.28, 0.40, 0.6),
    "boom": (r_boom, 0.35, 0.60, 1.0),
    "whoosh": (r_whoosh, 0.10, 0.0, 0),
    "splash": (r_splash, 0.22, 0.0, 0),
    "thunder": (r_thunder, 0.30, 0.35, 0.9),
    "charge": (r_charge, 0.20, 0.0, 0),
    "bell": (r_bell, 0.55, 0.0, 0),
    "gong": (r_gong, 0.45, 0.25, 0.9),
    "shatter": (r_shatter, 0.28, 0.12, 0.3),
    "sword": (r_sword, 0.25, 0.0, 0),
    "slice": (r_slice, 0.18, 0.0, 0),
    "lightning": (r_lightning, 0.30, 0.30, 0.7),
    "ambience_swell": (r_swell, 0.30, 0.0, 0),
}
ALIASES = {"swell": "ambience_swell", "ambience": "ambience_swell", "impact": "hit",
           "strike": "hit", "stab": "slice", "crash": "clash", "explosion": "boom"}


# ----------------------------------------------------------------------------
# Mixer
# ----------------------------------------------------------------------------
class Mixer:
    def __init__(self, N):
        self.N = N
        self.M = np.zeros((2, N), np.float32)     # music dry
        self.MS = np.zeros((2, N), np.float32)    # music -> reverb
        self.S = np.zeros((2, N), np.float32)     # sfx dry
        self.SS = np.zeros((2, N), np.float32)    # sfx -> reverb
        self.duck = np.zeros(N, np.float32)

    def _put(self, dry, snd, sig, t, g, send):
        i0 = int(round(t * SR))
        n = sig.shape[1]
        a = max(0, -i0)
        b = min(n, self.N - i0)
        if b <= a:
            return
        seg = sig[:, a:b] * g
        dry[:, i0 + a:i0 + b] += seg
        if send > 0:
            snd[:, i0 + a:i0 + b] += seg * send

    def music(self, sig, t, g=1.0, send=0.2):
        self._put(self.M, self.MS, sig, t, g, send)

    def mono(self, x, t, g=1.0, pan=0.0, send=0.2):
        self._put(self.M, self.MS, st(x, pan), t, g, send)

    def sfx(self, sig, t, g, send):
        self._put(self.S, self.SS, sig, t, g, send)

    def add_duck(self, t, depth, rel, att=0.012):
        i0 = int(t * SR)
        if i0 >= self.N or depth <= 0:
            return
        n = int((att + 5 * rel) * SR)
        i1 = min(self.N, i0 + n)
        if i1 <= i0:
            return
        tt = np.arange(i1 - i0) / SR
        d = depth * np.minimum(tt / att, 1.0) * np.exp(-tt / rel)
        seg = self.duck[i0:i1]
        np.maximum(seg, d.astype(np.float32), out=seg)


def sec_env(a, n, t0, t1, xf=1.5):
    t = a + tarr(n)
    h = xf / 2.0
    r = np.clip((t - (t0 - h)) / xf, 0, 1)
    f = np.clip(((t1 + h) - t) / xf, 0, 1)
    return np.sin(np.pi / 2 * r) * np.sin(np.pi / 2 * f)


def lin(t, t0, t1, v0, v1):
    return v0 + (v1 - v0) * np.clip((t - t0) / max(t1 - t0, 1e-9), 0, 1)


# ----------------------------------------------------------------------------
# music layers (return (2,n) stereo covering [a,b])
# ----------------------------------------------------------------------------
def layer_wind(rng, a, b, bright=1.0, whistle=0.3):
    n = int((b - a) * SR)
    t = a + tarr(n)
    out = np.zeros((2, n))
    for ch in range(2):
        s1 = slow_rand(rng, n, 0.22)
        s2 = slow_rand(rng, n, 0.13)
        fc = 550 * bright * 2.0 ** (1.1 * s1)
        nz = sweep(rng.standard_normal(n), "bp", fc, 0.75)
        nz /= np.std(nz) + 1e-9
        gust = 0.55 + 0.45 * (0.5 + 0.5 * s2)
        x = nz * gust
        if whistle > 0:
            wf = 1900 * 2.0 ** (0.4 * slow_rand(rng, n, 0.3))
            w = sweep(rng.standard_normal(n), "bp", wf, 9.0)
            w = w / (np.std(w) + 1e-9) * (0.5 + 0.5 * s2) ** 3 * whistle
            x = x + w
        out[ch] = x
    return unit_rms(out)


def layer_drone(a, b, notes=((26, 0.6), (33, 0.7), (38, 0.7)), nh=7, warmth=1.0):
    n = int((b - a) * SR)
    t = a + tarr(n)
    out = np.zeros((2, n))
    for i, (m, w) in enumerate(notes):
        f = mtof(m)
        hw = [1.0 / (k ** 0.55) for k in range(1, nh + 1)]
        hw = [h * (1.0 if k == 0 else warmth) for k, h in enumerate(hw)]
        lfo = 1 + 0.3 * np.sin(TWO_PI * (0.061 + 0.017 * i) * t + i)
        for ch, det in enumerate((-0.0011, 0.0011)):
            theta = TWO_PI * f * (1 + det) * t + 0.7 * i + 1.3 * ch
            out[ch] += w * harm_sum(theta, hw) * lfo
    return unit_rms(out)


VOWELS = {
    "ah": [(800, 9, 1.0), (1150, 10, 0.55), (2900, 12, 0.22), (450, 6, 0.4)],
    "oh": [(500, 9, 1.0), (900, 9, 0.6), (2800, 12, 0.12), (300, 6, 0.4)],
    "oo": [(320, 8, 1.0), (800, 9, 0.3), (2500, 12, 0.08)],
    "eh": [(600, 9, 1.0), (1700, 10, 0.5), (2600, 12, 0.2)],
}


def layer_pad(rng, a, b, freqs, kind="strings", fc=2200, trem=(0.0, 0.0), vowel="ah",
              fin=0.75, fout=0.75, voices=(-11, 0, 11)):
    n = int((b - a) * SR)
    t = a + tarr(n)
    L = np.zeros(n)
    R = np.zeros(n)
    spreads = [(1.0, 0.3), (0.75, 0.75), (0.3, 1.0)]
    for i, f in enumerate(freqs):
        for v, cents in enumerate(voices):
            ff = f * 2.0 ** (cents / 1200.0)
            phi = rng.random()
            ph = ff * t + phi
            if kind == "choir":
                vf = 5.2 + 0.4 * rng.random()
                vd = 0.0045
                ph = ph + (vd * ff / (TWO_PI * vf)) * (1 - np.cos(TWO_PI * vf * t + rng.uniform(0, 6)))
            if kind == "warm":
                wv = harm_sum(TWO_PI * ph, [1.0, 0.35, 0.15, 0.06])
            else:
                wv = 2 * (ph % 1.0) - 1.0
            sl, sr_ = spreads[v % 3]
            L += sl * wv
            R += sr_ * wv
    x = [L, R]
    for ch in range(2):
        y = x[ch]
        if kind == "choir":
            y = formant(y, VOWELS[vowel])
            br = bn(rng, n, "bp", 1500, 1.0)
            y = y / (np.std(y) + 1e-9) + 0.06 * br
        elif np.ndim(fc) == 0:
            y = filt(y, "lp", float(fc), 0.8)
        else:
            y = sweep(y, "lp", fc, 0.8)
        x[ch] = y
    out = np.stack(x)
    out = unit_rms(out)
    if trem[0] > 0:
        env = 1 + trem[1] * np.sin(TWO_PI * trem[0] * t)
        out = out * env
    return out * fade_env(n, fin, fout)


def layer_sine_ring(a, b, freqs, amps, tr_rate=0.2):
    n = int((b - a) * SR)
    t = a + tarr(n)
    out = np.zeros((2, n))
    for i, (f, g) in enumerate(zip(freqs, amps)):
        for ch in range(2):
            out[ch] += g * np.sin(TWO_PI * (f + 0.7 * ch * (i + 1)) * t + i)
    return out * (0.7 + 0.3 * np.sin(TWO_PI * tr_rate * t))


# ----------------------------------------------------------------------------
# section builders
# ----------------------------------------------------------------------------
def _jit(rng, t, ms=4):
    return t + rng.uniform(-ms, ms) / 1000.0


def _hit(mx, sig, t, g, pan=0.0, send=0.15):
    mx.mono(sig, t, g, pan, send)


def _sus(mx, sig, a, t0, t1, g, send=0.25):
    env = sec_env(a, sig.shape[1], t0, t1)
    mx.music(sig * env * 1.0, a, g, send)


def _sus_curve(mx, sig, a, t0, t1, g, curve, send=0.25):
    env = sec_env(a, sig.shape[1], t0, t1) * curve
    mx.music(sig * env, a, g, send)


def _bounds(mx, t0, t1, xf=1.5):
    a = max(0.0, t0 - xf / 2)
    b = min(mx.N / SR, t1 + xf / 2)
    return a, b


# Common ostinato machinery ---------------------------------------------------
def drum_bars(mx, rng, t0, t1, bpm, pats, lvl, fills=True, sub=False, shime_mode="8th",
              pan_w=0.25, big_send=0.25):
    beat = 60.0 / bpm
    step = beat / 4.0
    bar_len = 16 * step
    nb = int(math.ceil((t1 - t0) / bar_len))
    for bar in range(nb):
        pat = pats[bar % len(pats)]
        fill = fills and (bar % 4 == 3)
        for s in range(16):
            tt = t0 + bar * bar_len + s * step
            if tt >= t1:
                break
            tt = _jit(rng, tt, 3)
            g = lvl * rng.uniform(0.9, 1.05)
            if s in pat.get("don", ()) and not (fill and s >= 12):
                big = (s == 0 and bar % 4 == 0)
                _hit(mx, _taiko(bool(big), 0, int(rng.integers(0, 3))), tt,
                     g * (1.0 if not big else 1.25), rng.uniform(-0.1, 0.1),
                     big_send if big else 0.15)
            if s in pat.get("ka", ()) and not (fill and s >= 12):
                _hit(mx, _rim(int(rng.integers(0, 3))), tt, g * 0.5, rng.uniform(-pan_w, pan_w), 0.12)
            sh = pat.get("shime", ())
            if s in sh:
                acc = 1.0 if s % 4 == 0 else 0.6
                _hit(mx, _shime(int(rng.integers(0, 3))), tt, g * 0.40 * acc,
                     0.5 * pan_w * (1 if (s // 2) % 2 else -1), 0.1)
            if sub and s % 4 == 0:
                _hit(mx, _sub(0.16), tt, g * 0.6, 0.0, 0.0)
                mx.add_duck(tt, 0.18, 0.13, 0.006)
            if fill and s >= 12:
                k = s - 12
                _hit(mx, _taiko(False, 0, k % 3), tt,
                     g * (0.55 + 0.12 * k), (-0.3 + 0.2 * k), 0.15)


def melody_plucks(mx, rng, t0, t1, bpm, notes, patterns, shifts, gain, grid=2, send=0.3, offbeat_only=False):
    """arpeggiated guzheng: 8th notes (grid=2) or 16ths (grid=1) across bars."""
    beat = 60.0 / bpm
    step = beat / 4.0 * grid
    per_bar = 16 // grid
    nb = int(math.ceil((t1 - t0) / (16 * beat / 4.0)))
    for bar in range(nb):
        pat = patterns[(bar // 2) % len(patterns)]
        sh = shifts[bar % len(shifts)]
        for k in range(per_bar):
            tt = t0 + bar * 16 * beat / 4.0 + k * step
            if tt >= t1:
                return
            if offbeat_only and k % 2 == 0:
                continue
            idx = pat[k % len(pat)] + sh
            if idx is None or idx < 0:
                continue
            idx = min(idx, len(notes) - 1)
            g = gain * (1.0 if k % 4 == 0 else 0.7) * rng.uniform(0.85, 1.05)
            pan = -0.5 + (idx / max(1, len(notes) - 1)) * 1.0 + rng.uniform(-0.05, 0.05)
            _hit(mx, pluck_sig(notes[idx], 1.6, int(rng.integers(0, 2))), _jit(rng, tt, 5), g, pan, send)


def build_intro(mx, rng, t0, t1, I):
    a, b = _bounds(mx, t0, t1)
    D = t1 - t0
    t = a + tarr(int((b - a) * SR))
    w = layer_wind(rng, a, b, 0.9, 0.35)
    _sus_curve(mx, w, a, t0, t1, 0.055, lin(t, t0, t1, 0.55, 1.1), 0.25)
    d = layer_drone(a, b)
    _sus_curve(mx, d, a, t0, t1, 0.09, lin(t, t0, t1, 0.35, 1.0), 0.2)
    # tension pad grows in the second half (minor-2nd shimmer over D/A)
    tp = layer_pad(rng, a, b, [mtof(38), mtof(45), mtof(51)], "strings", 700, (0.19, 0.25))
    _sus_curve(mx, tp, a, t0, t1, 0.05, np.clip(lin(t, t0 + D * 0.45, t1, 0.0, 1.0), 0, 1), 0.3)
    # sparse shakuhachi
    mel = [74, 69, 72, 67, 65, 69, 74, 72, 77, 74, 69, 67]
    tt = t0 + min(1.6, D * 0.2)
    i = 0
    while tt < t1 - 1.4:
        dur = float(rng.uniform(1.8, 3.3))
        prog = (tt - t0) / max(D, 1)
        m = mel[i % len(mel)] + (0 if prog < 0.5 else (0 if i % 3 else 0))
        x = shaku_note(rng, mtof(m), dur, breath=1.0, vib=0.6 + prog)
        _hit(mx, x, tt, 0.17 * (0.65 + 0.5 * prog), rng.uniform(-0.3, 0.3), 0.6)
        tt += dur + rng.uniform(0.8, 1.8)
        i += 1
    # single taiko + plucks
    for k, fr in enumerate((0.42, 0.75)):
        tk = t0 + D * fr
        _hit(mx, _taiko(True, -2, k), tk, 0.42 + 0.2 * k, 0.0, 0.5)
    for fr, m in ((0.30, 50), (0.58, 57), (0.86, 62)):
        _hit(mx, pluck_sig(m, 2.2, 0), t0 + D * fr, 0.28, rng.uniform(-0.3, 0.3), 0.45)


def build_standoff(mx, rng, t0, t1, I):
    a, b = _bounds(mx, t0, t1)
    D = t1 - t0
    t = a + tarr(int((b - a) * SR))
    d = layer_drone(a, b, notes=((26, 1.0), (33, 0.5)), warmth=0.7)
    _sus_curve(mx, d, a, t0, t1, 0.08, lin(t, t0, t1, 0.4, 1.0), 0.15)
    w = layer_wind(rng, a, b, 1.3, 0.5)
    _sus_curve(mx, w, a, t0, t1, 0.03, lin(t, t0, t1, 0.4, 0.7), 0.25)
    rn = layer_sine_ring(a, b, [2210.0, 3315.0], [0.5, 0.25], 0.15)
    _sus_curve(mx, rn, a, t0, t1, 0.006, lin(t, t0, t1, 0.0, 1.0), 0.4)
    # heartbeat lub-dub, accelerating
    tt = t0 + 0.2
    while tt < t1:
        prog = (tt - t0) / max(D, 1)
        bpm = 56 + 34 * prog
        per = 60.0 / bpm
        g = 0.55 + 0.5 * prog
        _hit(mx, _heart("lub"), tt, g, 0.0, 0.15)
        _hit(mx, _heart("lub"), tt + 0.24 * per * 1.15, g * 0.7, 0.0, 0.15)
        mx.add_duck(tt, 0.1, 0.2, 0.01)
        tt += per


PATS_A1 = [
    dict(don=(0, 3, 8, 11), ka=(4, 7, 12, 15), shime=(0, 2, 4, 6, 8, 10, 12, 14)),
    dict(don=(0, 3, 6, 8, 11, 14), ka=(4, 12), shime=(0, 2, 4, 6, 8, 10, 12, 14)),
]
PATS_A2 = [
    dict(don=(0, 3, 6, 8, 11, 14), ka=(4, 10, 12, 15), shime=tuple(range(0, 16))),
    dict(don=(0, 2, 6, 8, 10, 14), ka=(4, 7, 12, 15), shime=tuple(range(0, 16))),
]


def build_act1(mx, rng, t0, t1, I):
    a, b = _bounds(mx, t0, t1)
    lv = 0.7 + 0.3 * I
    bpm = 120.0
    t = a + tarr(int((b - a) * SR))
    d = layer_drone(a, b)
    _sus(mx, d, a, t0, t1, 0.05, 0.15)
    w = layer_wind(rng, a, b, 1.0, 0.1)
    _sus(mx, w, a, t0, t1, 0.02, 0.2)
    drum_bars(mx, rng, t0, t1, bpm, PATS_A1, 0.62 * lv, fills=True)
    notes = scale_midis(D_MIN_PENT, 50, 79)
    pats = [[4, 7, 9, 7, 5, 7, 4, 2], [2, 5, 7, 9, 12, 9, 7, 5], [4, 9, 7, 9, 5, 7, 9, 11], [7, 5, 4, 5, 2, 4, 5, 7]]
    melody_plucks(mx, rng, t0, t1, bpm, notes, pats, [0, 0, 2, 1], 0.36 * lv, grid=2, send=0.3)
    # bass pluck each bar
    bar = 16 * 60.0 / bpm / 4.0
    tt = t0
    roots = [38, 38, 41, 36]
    k = 0
    while tt < t1:
        _hit(mx, pluck_sig(roots[k % 4], 1.8, k % 2), tt, 0.35 * lv, -0.05, 0.15)
        tt += bar
        k += 1
    # sparse shakuhachi phrase every 4 bars
    tt = t0 + 4 * bar - 0.05
    ph = [74, 72, 69, 67, 69, 72]
    j = 0
    while tt < t1 - 2.5:
        x = shaku_note(rng, mtof(ph[j % len(ph)]), 2.4, 1.0, 0.8)
        _hit(mx, x, tt, 0.11, 0.25, 0.5)
        tt += 4 * bar * 0.5 + (bar if j % 2 else 0)
        j += 1


def chord_seq(mx, rng, t0, t1, step_len, chords, kind, g, send, fc_fn=None, trem=(0, 0), vowel="ah",
              vowels=None, fade=0.75, level_curve=None):
    """sustained chord layer; overlapping cos^2 fades between chords."""
    k = 0
    tt = t0
    while tt < t1:
        s = tt - fade
        e = min(tt + step_len + fade, t1 + 0.75)
        a = max(0.0, s)
        b = min(mx.N / SR, e)
        if b - a > 0.2:
            fc = fc_fn((a, b)) if fc_fn else 2200
            vw = vowels[k % len(vowels)] if vowels else vowel
            x = layer_pad(rng, a, b, chords[k % len(chords)], kind, fc, trem, vw,
                          fin=fade if s >= 0 else 0.01, fout=fade)
            env = sec_env(a, x.shape[1], t0, t1)
            if level_curve is not None:
                env = env * level_curve(a + tarr(x.shape[1]))
            mx.music(x * env, a, g, send)
        tt += step_len
        k += 1


CH_MIN = [[mtof(m) for m in ch] for ch in (
    (50, 57, 62, 65), (53, 57, 60, 65), (43, 50, 55, 57), (48, 55, 60, 62))]
CH_BIG = [[mtof(m) for m in ch] for ch in (
    (38, 45, 50, 53, 57), (41, 48, 53, 57, 60), (43, 50, 55, 57, 62), (36, 43, 48, 55, 60))]


def build_act2(mx, rng, t0, t1, I):
    a, b = _bounds(mx, t0, t1)
    lv = 0.75 + 0.25 * I
    bpm = 144.0
    D = t1 - t0
    bar = 16 * 60.0 / bpm / 4.0
    d = layer_drone(a, b)
    _sus(mx, d, a, t0, t1, 0.05, 0.15)
    drum_bars(mx, rng, t0, t1, bpm, PATS_A2, 0.62 * lv, fills=True, sub=True)
    notes = scale_midis(D_MIN_PENT, 50, 84)
    pats = [[4, 7, 9, 11, 9, 7, 5, 7], [2, 5, 7, 9, 12, 14, 12, 9], [7, 9, 11, 14, 11, 9, 7, 5], [4, 7, 5, 7, 9, 7, 5, 4]]
    melody_plucks(mx, rng, t0, t1, bpm, notes, pats, [0, 0, 2, 1], 0.36 * lv, grid=2, send=0.3)
    # rising strings, cutoff climbing across section
    fcf = lambda ab: 500 * (4500 / 500) ** np.clip((ab[0] + np.linspace(0, ab[1] - ab[0], int((ab[1] - ab[0]) * SR)) - t0) / D, 0, 1)
    lc = lambda tt: lin(tt, t0, t1, 0.45, 1.0)
    chord_seq(mx, rng, t0, t1, 2 * bar, CH_MIN, "strings", 0.085, 0.35, fcf, (7.5, 0.22), level_curve=lc)
    chord_seq(mx, rng, t0, t1, 2 * bar, [[c * 0.5 for c in ch[:3]] + [ch[3]] for ch in CH_MIN], "choir",
              0.045, 0.45, None, (0, 0), vowels=["oh", "ah"], level_curve=lambda tt: lin(tt, t0, t1, 0.2, 1.0))
    # low bass pluck on quarter notes
    beat = 60.0 / bpm
    tt = t0
    roots = [38, 38, 41, 43, 38, 38, 36, 43]
    k = 0
    while tt < t1:
        for q in (0, 2):
            _hit(mx, pluck_sig(roots[(k // 2) % len(roots)], 1.0, 0), tt + q * beat, 0.28 * lv, 0.0, 0.1)
        tt += 2 * beat
        k += 2
    # gong-ish bell accent every 8 bars
    tt = t0 + 4 * bar
    while tt < t1 - 1:
        _hit(mx, bell_tone(rng, mtof(62), 5.0, "bell"), tt, 0.10, 0.2, 0.5)
        tt += 8 * bar


def build_act3(mx, rng, t0, t1, I):
    a, b = _bounds(mx, t0, t1)
    lv = 0.8 + 0.2 * I
    bpm = 128.0
    beat = 60.0 / bpm
    bar = 4 * beat
    D = t1 - t0
    d = layer_drone(a, b, notes=((26, 1.0), (33, 0.7), (38, 0.6), (45, 0.3)))
    _sus(mx, d, a, t0, t1, 0.06, 0.2)
    # huge layered pad + choir
    lc = lambda tt: lin(tt, t0, t0 + 6, 0.5, 1.0)
    chord_seq(mx, rng, t0, t1, 2 * bar, CH_BIG, "strings",
              0.10, 0.4, lambda ab: 2600, (8.5, 0.28), level_curve=lc)
    chord_seq(mx, rng, t0, t1, 2 * bar, [[c * 2 for c in ch[:4]] for ch in CH_MIN], "choir",
              0.07, 0.5, None, (0, 0), vowels=["ah", "oh", "ah", "eh"], level_curve=lc)
    chord_seq(mx, rng, t0, t1, 2 * bar, [[c * 0.5 for c in ch[:2]] for ch in CH_BIG], "warm",
              0.06, 0.3, None, (0, 0), level_curve=lc)
    # brass-like low swells, one per 2 bars
    k = 0
    tt = t0
    roots = [38, 41, 43, 36]
    while tt < t1:
        L = 2 * bar
        s = max(0.0, tt - 0.4)
        e = min(mx.N / SR, tt + L + 0.4)
        if e - s > 0.3:
            n = int((e - s) * SR)
            x = np.linspace(0, 1, n)
            fc = 300 * (1900 / 300) ** (np.sin(np.pi * np.clip((s + x * (e - s) - tt) / L, 0, 1)) ** 1.3)
            r = roots[k % 4]
            br = layer_pad(rng, s, e, [mtof(r), mtof(r + 7), mtof(r + 12)], "strings", fc, (0, 0),
                           fin=0.4, fout=0.4, voices=(-7, 0, 7))
            sw = np.sin(np.pi * np.clip((s + x * (e - s) - tt) / L, 0, 1)) ** 1.2
            env = sec_env(s, n, t0, t1) * (0.35 + 0.65 * sw)
            mx.music(br * env, s, 0.10, 0.35)
        tt += L
        k += 1
    # drums
    tt = t0
    k = 0
    while tt < t1:
        for bi in range(4):
            tb = tt + bi * beat
            if tb >= t1:
                break
            if bi == 0:
                _hit(mx, _taiko(True, 0, k % 3), _jit(rng, tb, 2), 1.0 * lv, 0.0, 0.5)
                _hit(mx, _sub(0.35), tb, 0.65 * lv, 0.0, 0.0)
                mx.add_duck(tb, 0.30, 0.35, 0.008)
            elif bi == 2:
                _hit(mx, _taiko(True, 3, k % 3), _jit(rng, tb, 2), 0.72 * lv, -0.15, 0.4)
            for h in (0, 1):
                th = tb + h * beat / 2
                if th >= t1:
                    break
                _hit(mx, _taiko(False, 0, (k + bi + h) % 3), _jit(rng, th, 2),
                     0.42 * lv * (0.8 if h else 1.0), 0.2 * (1 if h else -1), 0.15)
                _hit(mx, _shime(int(rng.integers(0, 3))), th, 0.30 * lv, 0.35 * (1 if h else -1), 0.1)
                _hit(mx, _shime(int(rng.integers(0, 3))), th + beat / 4, 0.22 * lv, -0.3 * (1 if h else -1), 0.1)
            if bi in (1, 3):
                _hit(mx, _rim(k % 3), tb + beat * 0.75, 0.32 * lv, 0.3, 0.1)
        # rolls at the end of every 4th bar
        if k % 4 == 3:
            for j in range(8):
                tj = tt + 3 * beat + j * beat / 8
                if tj < t1:
                    _hit(mx, _taiko(False, 0, j % 3), tj, lv * (0.4 + 0.07 * j), -0.4 + 0.11 * j, 0.15)
        tt += bar
        k += 1
    # sparse guzheng answers
    notes = scale_midis(D_MIN_PENT, 62, 86)
    tt = t0 + bar
    seq = [12, 10, 9, 7, 9, 10, 12, 14]
    j = 0
    while tt < t1 - 1.0:
        for q in range(4):
            idx = min(len(notes) - 1, seq[(j * 4 + q) % len(seq)])
            _hit(mx, pluck_sig(notes[idx], 1.6, q % 2), tt + q * beat * 0.5 + beat, 0.24 * lv,
                 -0.4 + 0.25 * q, 0.4)
        tt += 2 * bar
        j += 1


def build_silence(mx, rng, t0, t1, I):
    a, b = _bounds(mx, t0, t1)
    t = a + tarr(int((b - a) * SR))
    d = layer_drone(a, b, notes=((26, 1.0), (33, 0.4)), warmth=0.5)
    _sus(mx, d, a, t0, t1, 0.03, 0.15)
    rn = layer_sine_ring(a, b, [3390.0, 5087.0], [0.6, 0.25], 0.11)
    _sus(mx, rn, a, t0, t1, 0.004, 0.4)
    w = layer_wind(rng, a, b, 0.7, 0.15)
    _sus(mx, w, a, t0, t1, 0.008, 0.3)


def build_finale(mx, rng, t0, t1, I):
    a, b = _bounds(mx, t0, t1)
    D = t1 - t0
    t = a + tarr(int((b - a) * SR))
    lc = lambda tt: lin(tt, t0, t1, 0.25, 1.0) ** 1.4
    d = layer_drone(a, b, notes=((26, 1.0), (33, 0.7), (38, 0.6)))
    _sus_curve(mx, d, a, t0, t1, 0.06, lin(t, t0, t1, 0.5, 1.0), 0.2)
    bpm = 150.0
    bar = 4 * 60.0 / bpm
    chord_seq(mx, rng, t0, t1, bar, CH_BIG, "strings", 0.10, 0.4,
              lambda ab: 500 * (5500 / 500) ** np.clip((ab[0] + np.linspace(0, ab[1] - ab[0], int((ab[1] - ab[0]) * SR)) - t0) / D, 0, 1),
              (8.0, 0.3), level_curve=lc)
    chord_seq(mx, rng, t0, t1, bar, [[c * 2 for c in ch[:4]] for ch in CH_MIN], "choir", 0.07, 0.5,
              None, (0, 0), vowels=["oh", "ah", "ah", "eh"], level_curve=lc)
    # noise riser
    n = int((b - a) * SR)
    x = np.clip((t - t0) / D, 0, 1)
    nz = sweep(rng.standard_normal(n), "bp", 300 * 20.0 ** x, 1.5)
    nz = unit_rms(nz) * (x ** 2)
    mx.music(st(nz, 0) * sec_env(a, n, t0, t1) * 0.05, a, 1.0, 0.3)
    # accelerating taiko roll (interval 0.5s -> 0.09s)
    tt = t0 + 0.1
    k = 0
    end_hits = t1 - 0.9
    while tt < end_hits:
        prog = (tt - t0) / D
        iv = 0.5 * (0.09 / 0.5) ** prog
        big = (k % 4 == 0)
        _hit(mx, _taiko(bool(big), 0 if big else 3, k % 3), tt, (0.35 + 0.65 * prog) * (1.0 if big else 0.75),
             rng.uniform(-0.3, 0.3), 0.3)
        if big:
            _hit(mx, _sub(0.25), tt, 0.5 + 0.4 * prog, 0.0, 0.0)
            mx.add_duck(tt, 0.2 * (0.5 + prog), 0.25, 0.008)
        if k % 2 == 0:
            _hit(mx, _shime(k % 3), tt + iv / 2, 0.15 + 0.15 * prog, 0.3, 0.1)
        tt += iv
        k += 1
    for j, o in enumerate((0.9, 0.6, 0.3)):
        tb = t1 - o
        if tb > t0:
            _hit(mx, _taiko(True, -2 * j, j), tb, 1.0, 0.0, 0.5)
            _hit(mx, _sub(0.4), tb, 1.0, 0.0, 0.0)
            mx.add_duck(tb, 0.35, 0.3, 0.008)
    # plucked ascending run
    notes = scale_midis(D_MIN_PENT, 62, 91)
    tt = t0 + 0.2
    j = 0
    while tt < t1 - 1.0:
        _hit(mx, pluck_sig(notes[min(len(notes) - 1, j % 12 + int(3 * (tt - t0) / D))], 1.2, j % 2), tt,
             0.26 * lin(tt, t0, t1, 0.5, 1.0), -0.4 + 0.08 * (j % 10), 0.35)
        tt += 60.0 / bpm / 2
        j += 1


def build_whiteout(mx, rng, t0, t1, I):
    a, b = _bounds(mx, t0, t1)
    D = t1 - t0
    t = a + tarr(int((b - a) * SR))
    rn = layer_sine_ring(a, b, [4186.0, 4200.0, 8372.0, 2093.0], [1.0, 0.8, 0.25, 0.35], 0.09)
    _sus_curve(mx, rn, a, t0, t1, 0.035, 0.6 + 0.4 * smooth((t - t0) / max(D, 1) * 1.5), 0.5)
    d = layer_drone(a, b, notes=((26, 1.0), (33, 0.4)), warmth=0.4)
    _sus(mx, d, a, t0, t1, 0.03, 0.15)
    tt = t0 + 0.15
    while tt < t1:
        _hit(mx, _heart("deep"), tt, 0.5, 0.0, 0.45)
        tt += 1.7


def build_ending(mx, rng, t0, t1, I):
    a, b = _bounds(mx, t0, t1)
    D = t1 - t0
    n = int((b - a) * SR)
    t = a + tarr(n)
    bpm = 66.0
    beat = 60.0 / bpm
    d = layer_drone(a, b, notes=((26, 0.7), (33, 0.5), (38, 0.6)), warmth=0.5)
    _sus_curve(mx, d, a, t0, t1, 0.06, lin(t, t0, t0 + 4, 0.4, 1.0) * lin(t, t1 - 6, t1, 1.0, 0.5), 0.2)
    w = layer_wind(rng, a, b, 0.75, 0.0)
    _sus(mx, w, a, t0, t1, 0.02, 0.3)
    # warm major pad
    maj = [[mtof(m) for m in ch] for ch in (
        (50, 57, 62, 66), (47, 54, 59, 62), (43, 50, 59, 64), (45, 52, 57, 61))]
    chord_seq(mx, rng, t0, t1, 4 * beat, maj, "warm", 0.07, 0.45, None, (0, 0),
              level_curve=lambda tt: lin(tt, t0, t0 + 3, 0.3, 1.0))
    chord_seq(mx, rng, t0, t1, 4 * beat, [[c * 2 for c in ch[1:]] for ch in maj], "strings", 0.05, 0.45,
              lambda ab: 1100, (0, 0), level_curve=lambda tt: lin(tt, t0 + 2, t0 + 6, 0.0, 1.0))
    # singing bowls
    k = 0
    tb = t0 + 0.4
    fr = [62, 69, 66, 62, 74]
    while tb < t1 - 1.0:
        x = bell_tone(rng, mtof(fr[k % len(fr)]), 9.0, "bowl")
        _hit(mx, x, tb, 0.24, rng.uniform(-0.35, 0.35), 0.6)
        tb += 4.5 * beat
        k += 1
    # guzheng melody (D major pentatonic)
    phrase = [(0, 74, 1), (1, 76, 1), (2, 78, 1.5), (3.5, 76, 0.5), (4, 74, 1), (5, 71, 1), (6, 69, 2),
              (8, 71, 1), (9, 74, 1), (10, 78, 2), (12, 76, 1), (13, 74, 1), (14, 69, 1), (15, 71, 1), (16, 74, 3)]
    gl = scale_midis(D_MAJ_PENT, 62, 90)
    t_start = t0 + 1.0 * beat
    plen = 20 * beat
    pi = 0
    while t_start < t1 - 3.0:
        # glissando flourish leading into the phrase
        first = phrase[0][1]
        run = [m for m in gl if first - 14 <= m < first][-5:]
        for r_i, m in enumerate(run):
            tg = t_start - (len(run) - r_i) * 0.07
            if tg > t0 - 0.3:
                _hit(mx, pluck_sig(m, 1.6, r_i % 2), tg, 0.3, -0.3 + 0.1 * r_i, 0.4)
        for (bt, m, ln) in phrase:
            tn = t_start + bt * beat
            if tn >= t1 - 1.0:
                break
            mm = m + (0 if pi % 2 == 0 else 0)
            _hit(mx, pluck_sig(mm, 2.4, int(bt) % 2), tn, 0.55, 0.15 + 0.1 * math.sin(bt), 0.45)
        # soft low-octave echo notes
        _hit(mx, pluck_sig(50, 2.5, 0), t_start, 0.4, -0.2, 0.3)
        _hit(mx, pluck_sig(57, 2.5, 1), t_start + 8 * beat, 0.35, -0.2, 0.3)
        t_start += plen + 2 * beat
        pi += 1
    # birdsong-ish chirps
    tc = t0 + 2.0
    while tc < t1 - 1.0:
        base = rng.uniform(3000, 5200)
        pan = rng.uniform(-0.8, 0.8)
        for s in range(int(rng.integers(2, 5))):
            _hit(mx, bird_chirp(rng, base * (1 + 0.05 * s)), tc + s * rng.uniform(0.09, 0.14), 0.08, pan, 0.4)
        tc += rng.uniform(1.6, 4.2)


def build_default(mx, rng, t0, t1, I):
    a, b = _bounds(mx, t0, t1)
    d = layer_drone(a, b, notes=((26, 1.0), (33, 0.5)), warmth=0.6)
    _sus(mx, d, a, t0, t1, 0.05, 0.15)
    w = layer_wind(rng, a, b, 0.8, 0.0)
    _sus(mx, w, a, t0, t1, 0.012, 0.25)


BUILDERS = {
    "intro": build_intro, "standoff": build_standoff, "act1": build_act1, "act2": build_act2,
    "act3": build_act3, "silence": build_silence, "finale": build_finale,
    "whiteout": build_whiteout, "ending": build_ending,
}


def _fill_gaps(sections, dur):
    """Return sections plus 'drone' fillers for uncovered timeline."""
    secs = sorted(sections, key=lambda s: s["t0"])
    out = []
    cur = 0.0
    for s in secs:
        if s["t0"] > cur + 0.05:
            out.append(dict(t0=cur, t1=s["t0"], name="drone", intensity=0.3))
        out.append(s)
        cur = max(cur, s["t1"])
    if cur < dur - 0.05:
        out.append(dict(t0=cur, t1=dur, name="drone", intensity=0.3))
    return out


# ----------------------------------------------------------------------------
# reverb
# ----------------------------------------------------------------------------
_IR_CACHE = {}


def make_ir(seed, length=3.4):
    key = (seed, length, SR)
    if key in _IR_CACHE:
        return _IR_CACHE[key]
    rng = rng_for("ir", seed)
    n = int(length * SR)
    t = tarr(n)
    nz = rng.standard_normal(n)
    lo = filt(nz, "lp", 2600, 0.7)
    hi = filt(nz, "hp", 2600, 0.7)
    lo /= np.std(lo)
    hi /= np.std(hi)
    ir = lo * np.exp(-t / 0.50) + 0.55 * hi * np.exp(-t / 0.20)
    ir *= attack(t, 0.006)
    # low-mid warmth, damp the sub
    ir = filt(ir, "hp", 90, 0.7)
    pre = int(0.018 * SR)
    ir = np.concatenate([np.zeros(pre), ir])[:n]
    for dt, g in ((0.011, 0.6), (0.023, -0.5), (0.037, 0.4), (0.052, -0.35), (0.071, 0.3)):
        i = int((dt + 0.006 * rng.random()) * SR)
        ir[i] += g * 3.0
    ir /= math.sqrt(float(np.sum(ir * ir)))
    _IR_CACHE[key] = ir
    return ir


def reverb(inp):
    """inp (2,N) -> wet (2,N) via FFT convolution with synthetic stereo IRs."""
    N = inp.shape[1]
    irs = [make_ir(1), make_ir(2)]
    m = _nfft(N + len(irs[0]))
    out = np.zeros((2, N), np.float32)
    for ch in range(2):
        X = np.fft.rfft(inp[ch].astype(np.float64), m)
        H = np.fft.rfft(irs[ch], m)
        out[ch] = np.fft.irfft(X * H, m)[:N]
    # gentle cross-bleed for width
    l = out[0] * 0.85 + out[1] * 0.15
    r = out[1] * 0.85 + out[0] * 0.15
    return np.stack([l, r])


# ----------------------------------------------------------------------------
# main render
# ----------------------------------------------------------------------------
def render(events, sections, dur=120.0, sr=44100):
    _set_sr(sr)
    N = int(round(dur * SR))
    mx = Mixer(N)
    # ---------------- music bed ----------------
    secs = _fill_gaps([dict(t0=float(s.get("t0", 0)), t1=float(s.get("t1", 0)),
                            name=str(s.get("name", "")).lower().strip(),
                            intensity=float(s.get("intensity", 0.5)))
                       for s in (sections or []) if float(s.get("t1", 0)) > float(s.get("t0", 0))], dur)
    for i, s in enumerate(secs):
        rng = rng_for("sec", i, s["name"])
        fn = BUILDERS.get(s["name"], build_default)
        t0 = max(0.0, s["t0"])
        t1 = min(dur + 0.75, s["t1"])
        if t0 >= dur:
            continue
        fn(mx, rng, t0, t1, float(np.clip(s["intensity"], 0, 1)))

    # ---------------- sound effects ----------------
    evs = []
    for i, e in enumerate(events or []):
        try:
            evs.append((float(e.get("t", 0.0)), i, e))
        except Exception:
            continue
    evs.sort(key=lambda z: (z[0], z[1]))
    for t, i, e in evs:
        kind = str(e.get("kind", "hit")).lower().strip()
        kind = ALIASES.get(kind, kind)
        fn, send, dd, dr = KINDS.get(kind, (r_thud, 0.08, 0.0, 0))
        amp = float(np.clip(e.get("amp", 1.0), 0.2, 2.0))
        x = float(e.get("x", 0.0))
        p = float(np.clip(x / 8.0, -1, 1))
        d = e.get("dur", None)
        d = float(d) if d is not None else None
        rng = rng_for("ev", i, kind, round(t, 4))
        sig, off = fn(rng, amp, p, d)
        if not np.all(np.isfinite(sig)):
            sig = np.nan_to_num(sig)
        mx.sfx(sig, t + off, amp, send)
        if dd > 0:
            mx.add_duck(t, min(0.85, dd * amp), dr)

    # ---------------- mix ----------------
    duck = 1.0 - mx.duck
    # smooth the duck curve a bit (click-free)
    k = int(0.004 * SR)
    if k > 1:
        ker = np.ones(k) / k
        duck = np.convolve(duck, ker, mode="same").astype(np.float32)
    M = mx.M * duck
    MS = mx.MS * duck
    rms_m = math.sqrt(float(np.mean(M.astype(np.float64) ** 2)))
    gm = (0.126 / rms_m) if rms_m > 1e-6 else 0.0
    gm = min(gm, 60.0)
    M *= gm
    MS *= gm
    wet = reverb(MS + mx.SS)
    out = M + mx.S + wet
    del M, MS, wet
    # DC / sub rumble protection
    out = _master_eq(out)
    # loudness + soft limiter
    ref = float(np.percentile(np.abs(out[:, ::7]), 99.99)) if N > 100 else 1.0
    if ref < 1e-9:
        ref = 1.0
    out = out * (0.85 / ref)
    thr = 0.6
    a = np.abs(out)
    over = a > thr
    if np.any(over):
        out = np.where(over, np.sign(out) * (thr + (1 - thr) * np.tanh((a - thr) / (1 - thr))), out)
    pk = float(np.max(np.abs(out))) or 1.0
    out = out * (0.92 / pk)
    # fades
    tt = np.arange(N) / SR
    fi = np.clip(tt / 0.3, 0, 1)
    fo = np.clip((dur - tt) / 3.0, 0, 1)
    env = (np.sin(np.pi / 2 * fi) ** 2 * np.sin(np.pi / 2 * fo) ** 2).astype(np.float32)
    out = out * env[None, :]
    out = np.nan_to_num(out, nan=0.0, posinf=0.0, neginf=0.0)
    return np.ascontiguousarray(out.T.astype(np.float32))


def _master_eq(out):
    """20 Hz high-pass + gentle high shelf (+~4 dB above ~3 kHz) in one FFT pass per channel."""
    N = out.shape[1]
    m = _nfft(N + int(0.2 * SR))
    f = np.fft.rfftfreq(m, 1.0 / SR)
    H = _resp("hp", f, 20.0, 0.707) * (1.0 + 0.6 * _resp("hp1", f, 3000.0, 1.0))
    for ch in range(2):
        X = np.fft.rfft(out[ch].astype(np.float64), m)
        out[ch] = np.fft.irfft(X * H, m)[:N].astype(np.float32)
    return out


def write_wav(path, data, sr=44100):
    d = np.asarray(data, dtype=np.float32)
    if d.ndim == 1:
        d = np.stack([d, d], axis=1)
    pcm = np.clip(np.round(d * 32767.0), -32768, 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(d.shape[1])
        w.setsampwidth(2)
        w.setframerate(int(sr))
        w.writeframes(pcm.tobytes())


# ----------------------------------------------------------------------------
# selftest / CLI
# ----------------------------------------------------------------------------
def _selftest_data(dur=120.0):
    rng = np.random.default_rng(1234)
    ev = []
    kinds = ["punch", "kick", "clash", "hit", "block", "punch", "kick"]
    for i in range(120):
        t = 12.0 + (i + rng.uniform(0, 0.8)) * (100.0 / 120.0)
        ev.append(dict(t=float(t), kind=kinds[i % len(kinds)], amp=float(rng.uniform(0.6, 1.5)),
                       x=float(rng.uniform(-8, 8))))
    for t, k, a, x, extra in [
        (3.0, "whoosh", 1.0, -6, {}), (9.5, "charge", 1.0, 0, {"dur": 2.0}), (11.9, "gong", 1.0, 0, {}),
        (14.0, "sword", 1.0, -3, {}), (17.0, "slice", 1.0, 4, {}), (20.5, "splash", 1.0, 2, {}),
        (24.0, "slam", 1.2, -2, {}), (30.0, "shatter", 1.0, 5, {}), (44.0, "lightning", 1.2, 0, {}),
        (50.0, "thunder", 1.2, 0, {}), (57.0, "charge", 1.0, 0, {"dur": 2.5}), (60.0, "boom", 1.0, 0, {}),
        (75.0, "slam", 1.5, 3, {}), (80.0, "whoosh", 1.0, 5, {"dur": 0.4}), (90.0, "ambience_swell", 1.0, 0, {"dur": 4.0}),
        (94.0, "bell", 1.0, 0, {}), (98.0, "charge", 1.2, 0, {"dur": 3.0}), (100.0, "boom", 1.6, 0, {}),
        (101.5, "clash", 2.0, 0, {}), (108.0, "made_up_kind", 1.0, 0, {}), (112.0, "bell", 1.0, 0, {}),
        (119.9, "punch", 1.0, 0, {}),
    ]:
        ev.append(dict(t=t, kind=k, amp=a, x=x, **extra))
    sec = [
        dict(t0=0, t1=9, name="intro", intensity=0.3), dict(t0=9, t1=12, name="standoff", intensity=0.4),
        dict(t0=12, t1=38, name="act1", intensity=0.5), dict(t0=38, t1=60, name="act2", intensity=0.75),
        dict(t0=60, t1=92, name="act3", intensity=1.0), dict(t0=92, t1=96, name="silence", intensity=0.1),
        dict(t0=96, t1=102, name="finale", intensity=1.0), dict(t0=102, t1=106, name="whiteout", intensity=0.3),
        dict(t0=106, t1=120, name="ending", intensity=0.3),
    ]
    return ev, sec


def analyze(y, sr, win=10.0):
    print("  window     RMS dBFS   peak    low<150  mid<2k  high>2k  centroid Hz")
    W = int(win * sr)
    for s in range(0, len(y), W):
        seg = y[s:s + W].mean(axis=1) if y.ndim == 2 else y[s:s + W]
        if len(seg) < sr:
            continue
        rms = math.sqrt(float(np.mean(seg ** 2))) + 1e-12
        pk = float(np.max(np.abs(y[s:s + W])))
        sp = np.abs(np.fft.rfft(seg * np.hanning(len(seg)))) ** 2
        fr = np.fft.rfftfreq(len(seg), 1 / sr)
        tot = sp.sum() + 1e-20
        lo = sp[fr < 150].sum() / tot
        mid = sp[(fr >= 150) & (fr < 2000)].sum() / tot
        hi = sp[fr >= 2000].sum() / tot
        cen = float((sp * fr).sum() / tot)
        print("  %3d-%3ds  %7.1f    %.3f   %5.1f%%  %5.1f%%  %5.1f%%   %7.0f" % (
            s // sr, min(len(y), s + W) // sr, 20 * math.log10(rms), pk, 100 * lo, 100 * mid, 100 * hi, cen))


def selftest():
    here = os.path.dirname(os.path.abspath(__file__))
    ev, sec = _selftest_data(120.0)
    t0 = time.time()
    y = render(ev, sec, 120.0, 44100)
    dt = time.time() - t0
    out = os.path.join(here, "_audio_selftest.wav")
    write_wav(out, y, 44100)
    ok = True
    print("render time: %.1f s" % dt)
    print("shape:", y.shape, "dtype:", y.dtype, "expected N:", 120 * 44100)
    if y.shape != (120 * 44100, 2):
        ok = False
        print("FAIL: wrong shape")
    if not np.all(np.isfinite(y)):
        ok = False
        print("FAIL: NaN/inf")
    pk = float(np.max(np.abs(y)))
    rms = math.sqrt(float(np.mean(y.astype(np.float64) ** 2)))
    print("peak %.4f  rms %.4f (%.1f dBFS)" % (pk, rms, 20 * math.log10(rms + 1e-12)))
    if pk > 1.0:
        ok = False
        print("FAIL: clipping")
    print("first/last sample:", y[0], y[-1], " last 0.1 s max:", float(np.max(np.abs(y[-4410:]))))
    analyze(y, 44100)
    print("wrote", out)
    print("SELFTEST", "PASS" if ok else "FAIL")
    return 0 if ok else 1


def main(argv=None):
    ap = argparse.ArgumentParser(description="YIN vs YANG procedural soundtrack")
    ap.add_argument("--events")
    ap.add_argument("--sections")
    ap.add_argument("--out", default="audio.wav")
    ap.add_argument("--dur", type=float, default=120.0)
    ap.add_argument("--sr", type=int, default=44100)
    ap.add_argument("--selftest", action="store_true")
    a = ap.parse_args(argv)
    if a.selftest:
        return selftest()
    if not a.events or not a.sections:
        ap.error("--events and --sections are required (or use --selftest)")
    with open(a.events) as f:
        ev = json.load(f)
    with open(a.sections) as f:
        sec = json.load(f)
    if isinstance(ev, dict):
        ev = ev.get("events", [])
    if isinstance(sec, dict):
        sec = sec.get("sections", [])
    t0 = time.time()
    y = render(ev, sec, a.dur, a.sr)
    write_wav(a.out, y, a.sr)
    print("wrote %s  (%.1f s audio, rendered in %.1f s, peak %.3f)" % (a.out, len(y) / a.sr, time.time() - t0,
                                                                     float(np.max(np.abs(y)))))
    return 0


if __name__ == "__main__":
    sys.exit(main())
