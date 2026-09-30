#!/usr/bin/env python3
"""LIVE OR DIE - horror chase instrumental (nightmare killer vs. the last survivor).

Everything is synthesized from scratch (no samples) and rendered to a 90 s MP3.
128 BPM, D minor (key change up to Eb minor for the last 15 s). No vocals.

    0.0 -  7.5  INTRO     music box states the theme alone
    7.5 - 15.0  STARTING  heartbeat beat, clock ticks, strings, sub; music box on top; build
   15.0 - 45.0  MAJOR     bass drop: half-time growl bass, BRAAMs, strings, lead + music box
   45.0 - 60.0  CLIMAX    tape-stop kills the chaos; theme + cellos, then build to the final
   60.0 - 90.0  FINAL     everything: full-time chase beat, organ, tremolo strings,
                          key change at 75 s, "LIVE - OR - DIE" hits, final blow

Usage: python3 generate.py [output.mp3] [--wav path.wav] [--analyze]
"""

import sys
import wave

import lameenc
import numpy as np
from numba import njit
from scipy import signal

SR = 44100
BPM = 128
BEAT = 60.0 / BPM
BAR = 4 * BEAT
STEP = BEAT / 4
LENGTH = 90.0
N = int(round(LENGTH * SR))
TAIL = 5.0

rng = np.random.default_rng(1313)

# Mix levels (linear). Tuned by measuring per-bus RMS per section.
G = {
    'kick': 0.64, 'heart': 0.75, 'snare': 0.55, 'rim': 0.22, 'tick': 0.10,
    'hat': 0.17, 'ohat': 0.12, 'taiko': 0.55, 'crash': 0.30,
    'mbox': 0.60, 'lh': 0.55, 'growl': 0.62, 'sub': 0.48,
    'pad': 0.85, 'trem': 0.70, 'cello': 0.80, 'braam': 0.55, 'organ': 0.40,
    'lead': 0.42, 'fx': 0.45, 'boom': 0.95, 'drone': 0.9,
}


# ----------------------------------------------------------------------------
# basic helpers
# ----------------------------------------------------------------------------

def mtof(m):
    return 440.0 * 2.0 ** ((m - 69.0) / 12.0)


def T(bar, beat=0.0):
    return bar * BAR + beat * BEAT


def ns(sec):
    return max(1, int(round(sec * SR)))


def ts(n):
    return np.arange(n) / SR


def noise(n):
    return rng.standard_normal(n)


def _sos(kind, f, order):
    return signal.butter(order, f, btype=kind, fs=SR, output='sos')


def lp(x, f, order=2):
    return signal.sosfilt(_sos('lowpass', min(f, SR * 0.45), order), x, axis=-1)


def hp(x, f, order=2):
    return signal.sosfilt(_sos('highpass', f, order), x, axis=-1)


def bp(x, lo, hi, order=2):
    return signal.sosfilt(_sos('bandpass', [lo, min(hi, SR * 0.45)], order), x, axis=-1)


def shelf(x, f0, gain_db, high=True, q=0.707):
    """RBJ cookbook shelving EQ."""
    A = 10 ** (gain_db / 40)
    w = 2 * np.pi * f0 / SR
    al = np.sin(w) / (2 * q)
    c = np.cos(w)
    sA = 2 * np.sqrt(A) * al
    if high:
        b = [A * ((A + 1) + (A - 1) * c + sA), -2 * A * ((A - 1) + (A + 1) * c), A * ((A + 1) + (A - 1) * c - sA)]
        a = [(A + 1) - (A - 1) * c + sA, 2 * ((A - 1) - (A + 1) * c), (A + 1) - (A - 1) * c - sA]
    else:
        b = [A * ((A + 1) - (A - 1) * c + sA), 2 * A * ((A - 1) - (A + 1) * c), A * ((A + 1) - (A - 1) * c - sA)]
        a = [(A + 1) + (A - 1) * c + sA, -2 * ((A - 1) + (A + 1) * c), (A + 1) + (A - 1) * c - sA]
    return signal.lfilter(np.array(b) / a[0], np.array(a) / a[0], x, axis=-1)


def env_ar(n, a, r):
    """Linear attack of `a` s, flat sustain, raised-cosine release over the last `r` s."""
    e = np.ones(n)
    na = min(n, ns(a)) if a > 0 else 0
    nr = min(n - na, ns(r)) if r > 0 else 0
    if na > 0:
        e[:na] = np.linspace(0.0, 1.0, na, endpoint=False)
    if nr > 0:
        e[n - nr:] *= 0.5 + 0.5 * np.cos(np.linspace(0.0, np.pi, nr))
    return e


def pan(x, p):
    a = (np.clip(p, -1.0, 1.0) + 1.0) * np.pi / 4.0
    return np.vstack([x * np.cos(a), x * np.sin(a)])


def widen(x, amount=0.4, lo_cut=250, delay=0.013):
    """Mono -> stereo via a delayed side signal (mono-compatible, low end stays centred)."""
    s = hp(x, lo_cut)
    d = ns(delay)
    side = np.zeros_like(x)
    side[d:] = s[:-d] * amount
    return np.vstack([x + side, x - side])


# ----------------------------------------------------------------------------
# numba DSP kernels
# ----------------------------------------------------------------------------

@njit(cache=True)
def _saw(freq, ph0):
    """Band-limited (polyBLEP) sawtooth from a per-sample frequency array."""
    n = freq.shape[0]
    out = np.empty(n)
    p = ph0
    for i in range(n):
        dt = freq[i] / SR
        v = 2.0 * p - 1.0
        if p < dt:
            x = p / dt
            v -= x + x - x * x - 1.0
        elif p > 1.0 - dt:
            x = (p - 1.0) / dt
            v -= x * x + x + x + 1.0
        out[i] = v
        p += dt
        if p >= 1.0:
            p -= 1.0
    return out


@njit(cache=True)
def _svf(x, fc, q, mode):
    """Zero-delay-feedback state variable filter with per-sample cutoff."""
    n = x.shape[0]
    out = np.empty(n)
    ic1 = 0.0
    ic2 = 0.0
    k = 1.0 / q
    for i in range(n):
        f = fc[i]
        if f > 0.45 * SR:
            f = 0.45 * SR
        if f < 10.0:
            f = 10.0
        g = np.tan(np.pi * f / SR)
        a1 = 1.0 / (1.0 + g * (g + k))
        a2 = g * a1
        a3 = g * a2
        v3 = x[i] - ic2
        v1 = a1 * ic1 + a2 * v3
        v2 = ic2 + a2 * ic1 + a3 * v3
        ic1 = 2.0 * v1 - ic1
        ic2 = 2.0 * v2 - ic2
        if mode == 0:
            out[i] = v2
        elif mode == 1:
            out[i] = v1
        else:
            out[i] = x[i] - k * v1 - v2
    return out


@njit(cache=True)
def _env_follow(x, att, rel):
    out = np.empty_like(x)
    e = 0.0
    for i in range(x.shape[0]):
        v = x[i]
        c = att if v > e else rel
        e = c * e + (1.0 - c) * v
        out[i] = e
    return out


@njit(cache=True)
def _limiter_gain(peak, ceil, look, rel):
    n = peak.shape[0]
    raw = np.empty(n)
    for i in range(n):
        p = peak[i]
        raw[i] = 1.0 if p <= ceil else ceil / p
    la = np.empty(n)
    for i in range(n):
        m = 1.0
        for j in range(i, min(n, i + look)):
            if raw[j] < m:
                m = raw[j]
        la[i] = m
    sm = np.empty(n)
    acc = 0.0
    for i in range(n):
        acc += la[i]
        if i >= look:
            acc -= la[i - look]
        sm[i] = acc / min(i + 1, look)
    out = np.empty(n)
    g = 1.0
    for i in range(n):
        if sm[i] < g:
            g = sm[i]
        else:
            g = g + (sm[i] - g) * (1.0 - rel)
        out[i] = g
    return out


def saw(freq, ph=None):
    return _saw(np.ascontiguousarray(freq, dtype=np.float64), rng.random() if ph is None else ph)


def square(freq, ph=None):
    p = rng.random() if ph is None else ph
    f = np.ascontiguousarray(freq, dtype=np.float64)
    return 0.5 * (_saw(f, p) - _saw(f, (p + 0.5) % 1.0))


def svf(x, fc, q=0.707, mode='lp'):
    fc = np.ascontiguousarray(np.broadcast_to(fc, x.shape), dtype=np.float64)
    return _svf(np.ascontiguousarray(x, dtype=np.float64), fc, q, {'lp': 0, 'bp': 1, 'hp': 2}[mode])


# ----------------------------------------------------------------------------
# instruments
# ----------------------------------------------------------------------------

# Steel comb tine: fundamental, a slightly mistuned twin tooth (slow shimmer),
# soft body harmonics and the inharmonic cantilever modes (6.27x, 17.55x).
MB_PARTIALS = [(1.0, 1.00, 1.00), (1.0017, 0.35, 1.00), (2.0, 0.07, 0.45),
               (3.0, 0.03, 0.30), (6.27, 0.22, 0.10), (17.55, 0.06, 0.025)]


def musicbox(midi, t0, vel=1.0, dur=3.2, detune=0.0):
    f0 = mtof(midi) * 2.0 ** (detune / 1200.0)
    n = ns(dur)
    t = ts(n)
    st = t0 + t
    # wow & flutter tied to song time so the whole box warbles together like an old mechanism
    wow = 1.0 + 0.0022 * np.sin(2 * np.pi * 0.43 * st) + 0.0007 * np.sin(2 * np.pi * 6.1 * st + 0.7)
    base = 2 * np.pi * f0 * np.cumsum(wow) / SR
    tau = 1.25 * (700.0 / f0) ** 0.45
    x = np.zeros(n)
    for r, a, d in MB_PARTIALS:
        if f0 * r > 18500:
            continue
        ph = 0.0 if r < 1.01 else rng.random() * 2 * np.pi
        x += a * np.sin(base * r + ph) * np.exp(-t / (tau * d))
    x *= np.minimum(1.0, t / 0.0015)
    x += hp(noise(n), 3000) * np.exp(-t / 0.0018) * 0.25
    x *= env_ar(n, 0, 0.05)
    return x * vel * 0.5


def kick(kind):
    if kind == 'heart':
        n = ns(0.35)
        t = ts(n)
        f = 48 + 38 * np.exp(-t / 0.035)
        x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.09) * np.minimum(1, t / 0.004)
        return lp(np.tanh(1.8 * x), 350) * env_ar(n, 0, 0.03)
    dur, fend, fsw, ftau, atau, drive, clk = {
        'main': (0.50, 50, 200, 0.026, 0.30, 2.2, 0.30),
        'drop': (0.90, 40, 170, 0.034, 0.36, 2.6, 0.30),
        'final': (0.45, 52, 240, 0.020, 0.24, 2.8, 0.40),
    }[kind]
    n = ns(dur)
    t = ts(n)
    f = fend + fsw * np.exp(-t / ftau) + 0.25 * fsw * np.exp(-t / (ftau * 5))
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / atau) * np.minimum(1, t / 0.0008)
    body = np.tanh(drive * body) / np.tanh(drive)
    click = hp(noise(n), 3000) * np.exp(-t / 0.0035) * clk
    return (body + click) * env_ar(n, 0, 0.02)


def snare_sample(tone=190.0, ntau=0.16, clap=0.6, dur=0.6):
    n = ns(dur)
    t = ts(n)
    f = tone * (1 + 0.3 * np.exp(-t / 0.008))
    body = (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.065)
            + 0.4 * np.sin(2 * np.pi * tone * 1.72 * t) * np.exp(-t / 0.03))
    nz = bp(noise(n), 1400, 9500) * np.exp(-t / ntau)
    src = bp(noise(n), 900, 3200)
    cl = np.zeros(n)
    for k, d in enumerate([0.0, 0.0085, 0.017, 0.026]):
        i = ns(d) if d > 0 else 0
        cl[i:] += src[i:] * np.exp(-t[:n - i] / (0.011 if k < 3 else 0.11))
    x = np.tanh(1.4 * (0.8 * body + nz + clap * cl))
    return x * np.minimum(1, t / 0.0005) * env_ar(n, 0, 0.05)


def rim():
    n = ns(0.12)
    t = ts(n)
    x = (0.6 * np.sin(2 * np.pi * 1700 * t) + 0.4 * np.sin(2 * np.pi * 820 * t)) * np.exp(-t / 0.012)
    return x + bp(noise(n), 2000, 7000) * np.exp(-t / 0.006) * 0.6


def tick(freq):
    n = ns(0.08)
    t = ts(n)
    x = (np.sin(2 * np.pi * freq * t) + 0.5 * np.sin(2 * np.pi * freq * 2.71 * t)) * np.exp(-t / 0.009)
    return x * np.minimum(1, t / 0.0004)


HAT_FREQS = [205.3, 304.4, 369.6, 522.7, 540.0, 800.0]


def hat(open_=False):
    n = ns(0.45 if open_ else 0.09)
    t = ts(n)
    m = sum(square(np.full(n, f * 1.6)) for f in HAT_FREQS)
    x = hp(m, 7500, 4) * 0.35 + hp(noise(n), 8000, 2) * 0.5
    x *= np.exp(-t / (0.16 if open_ else 0.022)) * np.minimum(1, t / 0.0006)
    return x * env_ar(n, 0, 0.01)


def crash(dur=2.6):
    n = ns(dur)
    t = ts(n)
    chans = []
    for _ in range(2):
        m = sum(square(np.full(n, f * 2.3)) for f in HAT_FREQS)
        x = hp(noise(n), 3500, 2) * 0.8 + hp(m, 5000, 2) * 0.2
        chans.append(x * np.exp(-t / 0.95) * np.minimum(1, t / 0.002) * env_ar(n, 0, 0.2))
    return np.vstack(chans) * 0.6


def reverse_crash(dur):
    return crash(dur + 0.05)[:, ::-1][:, ns(0.05):].copy()


def taiko(pitch=1.0, dur=1.4):
    n = ns(dur)
    t = ts(n)
    f = (62 + 70 * np.exp(-t / 0.035)) * pitch
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.38)
    skin = lp(noise(n), 900) * np.exp(-t / 0.025) * 0.9
    x = np.tanh(2.0 * (body + skin))
    return x * np.minimum(1, t / 0.001) * env_ar(n, 0, 0.05)


def boom(dur=3.5):
    n = ns(dur)
    t = ts(n)
    f = 28 + 75 * np.exp(-t / 0.1)
    x = np.tanh(2.2 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 1.0)) / np.tanh(2.2)
    x += lp(noise(n), 250) * np.exp(-t / 0.12) * 1.2
    return x * env_ar(n, 0.0008, 0.3)


def sub(midi, dur):
    n = ns(dur)
    t = ts(n)
    x = np.tanh(1.6 * np.sin(2 * np.pi * mtof(midi) * t)) / np.tanh(1.6)
    return x * env_ar(n, 0.004, 0.03) * 0.55


def growl(midi, dur, style='wob', rate=2.0):
    """Dubstep growl: detuned saws + sub square + FM layer -> LFO'd resonant LP + moving
    formant band -> saturation."""
    n = ns(dur)
    t = ts(n)
    f = mtof(midi)
    fr = np.full(n, f)
    x = saw(fr) + 0.75 * saw(fr * 1.0071) + 0.75 * saw(fr * 0.9933) + 0.8 * square(fr * 0.5)
    x += 0.5 * np.sin(2 * np.pi * 2 * f * t + 2.5 * np.sin(2 * np.pi * f * t))
    if style == 'wob':
        lvl = np.maximum(0.5 - 0.5 * np.cos(2 * np.pi * rate * t / BEAT), 0.85 * np.exp(-t / 0.025))
    elif style == 'stab':
        lvl = 0.15 + 0.8 * np.exp(-t / 0.07)
    elif style == 'yoy':
        lvl = 0.95 * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.5
    elif style == 'down':
        ph = rate / BEAT * (t - 0.375 * t * t / dur)
        lvl = (0.5 - 0.5 * np.cos(2 * np.pi * ph)) * (1 - 0.5 * t / dur)
        lvl = np.maximum(lvl, 0.85 * np.exp(-t / 0.025))
    elif style == 'pluck':
        lvl = 0.12 + 0.75 * np.exp(-t / 0.09)
    else:
        lvl = 0.7 + 0.1 * np.sin(2 * np.pi * 0.5 * t)
    cut = 70.0 * 2.0 ** (lvl * 6.8)
    y = svf(x, cut, 2.4, 'lp') + 0.9 * svf(x, np.clip(cut * 0.55, 250, 4000), 6.0, 'bp')
    y = np.tanh(2.8 * y)
    y = lp(hp(y, 80), 11000)
    return y * env_ar(n, 0.003, 0.012) * 0.5


STR_DETUNE = [-17, -9, -3, 3, 9, 17]


def strings(midis, dur, att=0.25, rel=0.45, bright=2600, trem=0.0, vel=1.0):
    n = ns(dur + rel)
    t = ts(n)
    L = np.zeros(n)
    R = np.zeros(n)
    for m in midis:
        f = mtof(m)
        for j, c in enumerate(STR_DETUNE):
            vib = 1 + 0.0024 * np.sin(2 * np.pi * (4.6 + 0.37 * j) * t + rng.random() * 6.28)
            s = saw(f * 2 ** (c / 1200) * vib)
            w = 0.5 + 0.28 * np.sign(c)
            L += s * (1 - w)
            R += s * w
    sig = np.vstack([L, R]) / (len(midis) * 3.0)
    sig += bp(np.vstack([noise(n), noise(n)]), 2500, 7000) * 0.012 * len(midis) ** 0.5
    sig = hp(lp(sig, bright, 2), 70, 2)
    e = env_ar(n, att, rel)
    if trem > 0:
        for ch, r in enumerate((13.2, 14.1)):
            sig[ch] *= 1 - trem * (0.5 + 0.5 * np.cos(2 * np.pi * r * t + ch)) ** 2
    return sig * e * vel


def braam(root, dur=3.2):
    """Trailer 'BRAAM': detuned brass-saw stack scooping into pitch, filter swell, distortion."""
    while root < 36:
        root += 12
    n = ns(dur)
    t = ts(n)
    bend = 1 - 0.035 * np.exp(-t / 0.06)
    x = np.zeros(n)
    for m, a in [(root - 12, 0.7), (root, 1.0), (root + 7, 0.6), (root + 12, 0.5)]:
        for c in (-11, 0, 11):
            x += a * saw(mtof(m) * 2 ** (c / 1200) * bend)
    cut = 120 + 2600 * (1 - np.exp(-t / 0.04)) * np.exp(-t / 1.1) + 250 * np.exp(-t / 3)
    y = np.tanh(1.8 * svf(x, cut, 1.3))
    y += 0.5 * np.sin(2 * np.pi * mtof(root - 12) * t) * np.exp(-t / 1.0)
    y *= env_ar(n, 0.012, min(0.8, dur * 0.4))
    return widen(y * 0.5, 0.45)


ORGAN_STOPS = [(0.5, 0.55), (1, 1.0), (2, 0.6), (3, 0.3), (4, 0.35), (6, 0.12), (8, 0.1)]


def organ(midis, dur, att=0.06, rel=0.35, vel=1.0):
    n = ns(dur + rel)
    t = ts(n)
    L = np.zeros(n)
    R = np.zeros(n)
    for m in midis:
        f = mtof(m)
        for r, a in ORGAN_STOPS:
            if f * r > 12000:
                continue
            ph = rng.random() * 6.28
            L += a * np.sin(2 * np.pi * f * r * 1.0009 * t + ph)
            R += a * np.sin(2 * np.pi * f * r * 0.9991 * t + ph)
    sig = np.vstack([L, R]) / (len(midis) * 2.5)
    sig += bp(np.vstack([noise(n), noise(n)]), 1500, 5000) * np.exp(-t / 0.03) * 0.05
    return sig * env_ar(n, att, rel) * vel


def lead(midi, dur, vel=1.0):
    n = ns(dur + 0.08)
    t = ts(n)
    vib = 1 + 0.006 * np.sin(2 * np.pi * 5.6 * t) * np.clip((t - 0.18) / 0.2, 0, 1)
    fr = mtof(midi) * vib
    x = saw(fr) + 0.8 * saw(fr * 1.005) + 0.5 * square(fr * 0.5)
    y = np.tanh(1.5 * svf(x, 900 + 3800 * np.exp(-t / 0.18), 1.4))
    return y * env_ar(n, 0.006, 0.08) * vel * 0.35


def screech(dur=0.3, top=96):
    """'Psycho' strings stab: high dissonant cluster, hard bow."""
    n = ns(dur)
    t = ts(n)
    x = np.zeros(n)
    for m in (top, top + 1, top + 3, top + 6):
        for c in (-12, 12):
            x += saw(mtof(m) * 2 ** (c / 1200) * (1 + 0.012 * t / dur))
    x += bp(noise(n), 3000, 9000) * 0.6
    x = hp(x, 1500)
    return x * np.minimum(1, t / 0.004) * np.exp(-t / 0.11) * 0.08


def blade(dur=1.8, base=1250.0):
    """Metal 'shing': inharmonic ring gliding up + a swept scrape."""
    n = ns(dur)
    t = ts(n)
    glide = 1 + 0.07 * (1 - np.exp(-t / 0.12))
    ph = 2 * np.pi * np.cumsum(glide) / SR
    x = np.zeros(n)
    for r, a, d in [(1, 1.0, 0.9), (2.76, 0.6, 0.5), (5.40, 0.4, 0.3), (8.93, 0.25, 0.18)]:
        if base * r * 1.07 < 18000:
            x += a * np.sin(ph * base * r) * np.exp(-t / d)
    sweep = 1500 * 6 ** np.clip(t / 0.35, 0, 1)
    scrape = svf(noise(n), sweep, 4.0, 'bp') * np.minimum(1, t / 0.02) * np.exp(-t / 0.25)
    y = (0.35 * x + 0.6 * scrape) * np.minimum(1, t / 0.03) * env_ar(n, 0, 0.2)
    return widen(y, 0.5) * 0.4


def riser(dur, f0=300.0, f1=9000.0):
    n = ns(dur)
    t = ts(n)
    p = t / dur
    cut = f0 * (f1 / f0) ** (p ** 1.6)
    sig = np.vstack([svf(noise(n), cut, 3.0, 'bp'), svf(noise(n), cut, 3.0, 'bp')])
    return sig * p ** 2 * 0.5


def swell(dur):
    n = ns(dur)
    t = ts(n)
    sig = bp(np.vstack([noise(n), noise(n)]), 600, 4000)
    return sig * (t / dur) ** 2.5 * 0.5


def shepard(dur, speed=0.55, f_lo=55.0, octs=7):
    """Endlessly rising Shepard tone for the climax build."""
    n = ns(dur)
    t = ts(n)
    x = np.zeros(n)
    for k in range(octs):
        pos = (k + speed * t) % octs
        f = f_lo * 2 ** pos
        ph = 2 * np.pi * np.cumsum(f) / SR
        amp = np.exp(-0.5 * ((pos - octs / 2) / (octs / 6)) ** 2)
        x += amp * (np.sin(ph) + 0.25 * np.sin(2 * ph))
    return widen(x / 2.5 * (t / dur) ** 1.2 * env_ar(n, 0, 0.02), 0.5)


def drone(midis, dur):
    n = ns(dur)
    t = ts(n)
    x = np.zeros(n)
    for m in midis:
        for c in (-6, 6):
            x += saw(np.full(n, mtof(m) * 2 ** (c / 1200)))
    x = svf(x, 300 + 150 * np.sin(2 * np.pi * 0.2 * t), 0.9)
    return widen(x * env_ar(n, dur * 0.35, dur * 0.3) * 0.12, 0.5)


# ----------------------------------------------------------------------------
# score
# ----------------------------------------------------------------------------

# 8-bar theme: (beat, beats, midi) per bar. Lullaby shape, tritone + b9 colours.
THEME = [
    [(0, 1, 81), (1, 1, 86), (2, .5, 89), (2.5, .5, 88), (3, .5, 86), (3.5, .5, 81)],   # Dm
    [(0, 1, 82), (1, 1, 81), (2, .5, 79), (2.5, .5, 77), (3, .5, 76), (3.5, .5, 77)],   # Bb
    [(0, 1, 79), (1, 1, 82), (2, .5, 86), (2.5, .5, 84), (3, .5, 82), (3.5, .5, 81)],   # Gm
    [(0, .5, 85), (.5, .5, 86), (1, 1, 82), (2, 2, 81)],                                # A (b9)
    [(0, .5, 89), (.5, .5, 88), (1, .5, 86), (1.5, .5, 81), (2, 1, 89), (3, 1, 93)],   # Dm
    [(0, .5, 91), (.5, .5, 89), (1, 1, 86), (2, 1, 82), (3, 1, 86)],                    # Bb
    [(0, .5, 88), (.5, .5, 89), (1, .5, 91), (1.5, .5, 94), (2, 1, 93), (3, 1, 85)],   # Gm | A
    [(0, 2, 86), (2, .5, 81), (2.5, .5, 77), (3, 1, 74)],                              # Dm
]
CHORDS = ['Dm', 'Bb', 'Gm', 'A', 'Dm', 'Bb', 'Gm/A', 'Dm']
LH = [[62, 69, 65, 69], [58, 65, 62, 65], [55, 62, 58, 62], [57, 64, 61, 64],
      [62, 69, 65, 69], [58, 65, 62, 65], [55, 62, 57, 64], [62, 69, 65, 69]]
VOICING = {'Dm': [50, 53, 57, 62], 'Bb': [50, 53, 58, 62], 'Gm': [50, 55, 58, 62], 'A': [49, 52, 57, 61]}
ROOT = {'Dm': 38, 'Bb': 34, 'Gm': 31, 'A': 33}


def chords_of(idx):
    c = CHORDS[idx]
    return [(0, 2, 'Gm'), (2, 2, 'A')] if c == 'Gm/A' else [(0, 4, c)]


def chord_at(idx, beat):
    for b0, bl, c in chords_of(idx):
        if b0 <= beat < b0 + bl:
            return c
    return chords_of(idx)[-1][2]


# growl patterns: (step, steps, interval, style, lfo cycles per beat)
P_MAJ_A = [(0, 3, 0, 'wob', 4), (3, 1, 12, 'stab', 0), (4, 2, 0, 'yoy', 0), (6, 2, 1, 'wob', 6),
           (8, 2, 0, 'stab', 0), (10, 2, 12, 'wob', 3), (12, 4, 0, 'down', 4)]
P_MAJ_B = [(0, 4, 0, 'wob', 2), (4, 1, 0, 'stab', 0), (5, 1, 12, 'stab', 0), (6, 2, 0, 'yoy', 0),
           (8, 3, 0, 'wob', 6), (11, 1, 13, 'stab', 0), (12, 2, 7, 'wob', 4), (14, 2, 0, 'yoy', 0)]
P_MAJ_C = [(0, 2, 0, 'wob', 8), (2, 1, 12, 'stab', 0), (3, 1, 0, 'stab', 0), (4, 2, 1, 'wob', 6),
           (6, 1, 12, 'stab', 0), (7, 1, 0, 'stab', 0), (8, 4, 0, 'wob', 3), (12, 1, 12, 'stab', 0),
           (13, 1, 13, 'stab', 0), (14, 2, 0, 'down', 8)]
MAJ = {'A': P_MAJ_A, 'B': P_MAJ_B, 'C': P_MAJ_C}
MAJ_ORDER = 'ABABABAC' + 'CBCACBCC'
# final: galloping chase bass
P_FIN = [(s, 2 if s % 4 == 0 else 1, 12 if s % 4 == 3 else 0, 'pluck', 0) for s in range(16) if s % 4 != 1]
P_FIN2 = [p for p in P_FIN if p[0] < 12] + [(12, 2, 1, 'stab', 0), (14, 2, 0, 'wob', 8)]

SC_TIMES = []   # kick/impact times that pump the bass, pads and lead


# ----------------------------------------------------------------------------
# layers / mixing
# ----------------------------------------------------------------------------

def make_ir(rt60, pre=0.02, bright=7000, seed=0):
    r = np.random.default_rng(seed)
    n = ns(rt60 * 1.1)
    t = ts(n)
    out = []
    for ch in range(2):
        x = r.standard_normal(n)
        lo = lp(x, 900)
        ir = lo * np.exp(-6.9 * t / rt60) + (x - lo) * np.exp(-6.9 * t / (rt60 * 0.55))
        ir = lp(ir, bright) * np.minimum(1, t / 0.012)
        rms = np.sqrt(np.mean(ir[:ns(0.1)] ** 2))
        for d, g in [(0.011, 2.5), (0.019, 1.8), (0.027, 1.5), (0.041, 1.1)]:
            ir[ns(d + 0.003 * ch)] += g * rms * (1 if (ch + int(d * 1000)) % 2 else -1)
        ir = np.concatenate([np.zeros(ns(pre)), ir])
        out.append(ir / np.sqrt(np.sum(ir ** 2)))
    return out


IR_HALL = make_ir(3.0, 0.028, 6500, 11)
IR_ROOM = make_ir(1.1, 0.010, 8000, 12)


def conv(x, ir):
    return np.vstack([signal.fftconvolve(x[c], ir[c])[:x.shape[1]] for c in range(2)])


def pingpong(x, delay, fb, taps, wet, lpf=5000):
    out = x.copy()
    tap = x.mean(axis=0)
    d0 = ns(delay)
    for k in range(1, taps + 1):
        tap = lp(tap, lpf)
        d = d0 * k
        if d >= x.shape[1]:
            break
        out[(k - 1) % 2, d:] += wet * fb ** (k - 1) * tap[:-d]
    return out


def duck_curve(t0, n, depth, release=0.16):
    g = np.zeros(n)
    seg = ns(0.7)
    s = ts(seg)
    shape = np.where(s < 0.004, s / 0.004, np.exp(-(s - 0.004) / release))
    for tk in SC_TIMES:
        i = int(round((tk - t0) * SR))
        a, b = max(i, 0), min(i + seg, n)
        if a < b:
            g[a:b] = np.maximum(g[a:b], shape[a - i:b - i])
    return 1 - depth * g


class Layer:
    """A time slice of the arrangement with its own buses, so a section can be cut
    (or tape-stopped) together with its reverb tails."""

    def __init__(self, t0, t1, cut=None, tape=None, auto=None):
        self.t0, self.t1, self.cut, self.tape, self.auto = t0, t1, cut, tape, auto
        self.n = ns(t1 - t0 + TAIL)
        self.b = {}

    def add(self, bus, t, sig, gain=1.0, pan_=0.0):
        if sig.ndim == 1:
            sig = pan(sig, pan_)
        i = int(round((t - self.t0) * SR))
        if i < 0:
            sig = sig[:, -i:]
            i = 0
        j = min(i + sig.shape[1], self.n)
        if j <= i:
            return
        if bus not in self.b:
            self.b[bus] = np.zeros((2, self.n))
        self.b[bus][:, i:j] += gain * sig[:, :j - i]

    def get(self, bus):
        return self.b.get(bus, np.zeros((2, self.n)))

    def render(self):
        n = self.n
        mbox = pingpong(self.get('mbox'), 0.75 * BEAT, 0.38, 5, 0.22)
        lead_ = pingpong(self.get('lead'), 0.75 * BEAT, 0.3, 3, 0.12)
        bass = self.get('bass') * duck_curve(self.t0, n, 0.7)
        subb = self.get('sub') * duck_curve(self.t0, n, 0.85)
        orch = hp(self.get('orch'), 90) * duck_curve(self.t0, n, 0.3)
        lead_ *= duck_curve(self.t0, n, 0.15)
        fx, perc, drums = self.get('fx'), self.get('perc'), self.get('drums')
        hall = 0.30 * mbox + 0.22 * orch + 0.20 * lead_ + 0.30 * fx + 0.22 * perc
        room = 0.22 * drums
        wet = hp(conv(hall, IR_HALL) + conv(room, IR_ROOM), 150)
        out = self.get('kick') + drums + perc + mbox + bass + subb + orch + lead_ + fx + self.get('dry') + wet
        self.stats = {k: v for k, v in [('mbox', mbox), ('bass', bass), ('sub', subb), ('orch', orch),
                                         ('lead', lead_), ('fx', fx), ('perc', perc), ('drums', drums),
                                         ('kick', self.get('kick')), ('wet', wet)]}
        if self.auto:   # volume automation: [(time, dB), ...], linear in dB
            tp, dbs = zip(*self.auto)
            out *= 10 ** (np.interp(self.t0 + ts(n), tp, dbs) / 20)
        if self.tape:
            i0, i1 = (ns(x - self.t0) for x in self.tape)
            L = i1 - i0
            speed = (1 - np.arange(L) / L) ** 1.6
            pos = i0 + np.cumsum(speed) - speed[0]
            idx = np.arange(n)
            for c in range(2):
                out[c, i0:i1] = np.interp(pos, idx, out[c]) * speed ** 0.35
            out[:, i1:] = 0
        if self.cut:
            i = ns(self.cut - self.t0)
            f = ns(0.012)
            out[:, i - f:i] *= np.linspace(1, 0, f)
            out[:, i:] = 0
        return out


# ----------------------------------------------------------------------------
# arrangement helpers
# ----------------------------------------------------------------------------

S = {
    'kick_main': kick('main'), 'kick_drop': kick('drop'), 'kick_final': kick('final'), 'heart': kick('heart'),
    'snare': [snare_sample() for _ in range(4)], 'snare_roll': [snare_sample(210, 0.1, 0.3, 0.3) for _ in range(4)],
    'rim': rim(), 'tick_hi': tick(2400), 'tick_lo': tick(1800),
    'hat': [hat() for _ in range(6)], 'ohat': [hat(True) for _ in range(3)],
    'crash': crash(), 'taiko': taiko(), 'tom_hi': taiko(1.7, 0.7), 'tom_mid': taiko(1.3, 0.9),
}


def pick(name):
    v = S[name]
    return v[rng.integers(len(v))] if isinstance(v, list) else v


def hit(L, bus, name, t, gain, pan_=0.0, sc=False):
    L.add(bus, t, pick(name), gain, pan_)
    if sc:
        SC_TIMES.append(t)


def heart(L, t, vel=1.0):
    hit(L, 'kick', 'heart', t, G['heart'] * vel)
    hit(L, 'kick', 'heart', t + 0.2, G['heart'] * vel * 0.65)


def mb_bar(L, bar, idx, key=0, vel=1.0, lh=0.5, until=4.0):
    for b, d, m in THEME[idx]:
        if b >= until:
            continue
        t = T(bar, b) + rng.normal(0, 0.003)
        v = vel * rng.uniform(0.9, 1.0) * (1.08 if b == 0 else 1.0)
        mm = m + key
        L.add('mbox', t, musicbox(mm, t, v, detune=rng.normal(0, 5)), G['mbox'], np.clip((mm - 80) / 24, -0.4, 0.4))
    if lh > 0:
        for i, m in enumerate(LH[idx]):
            if i >= until:
                continue
            t = T(bar, i) + rng.normal(0, 0.004)
            L.add('mbox', t, musicbox(m + key, t, lh * rng.uniform(0.85, 1.0), 2.4, rng.normal(0, 5)),
                  G['lh'], -0.3)


def lead_bar(L, bar, idx, key, vel=1.0, oct_=-12):
    for b, d, m in THEME[idx]:
        L.add('lead', T(bar, b), lead(m + key + oct_, d * BEAT * 0.95, vel), G['lead'])


def cello_bar(L, bar, idx, key=0, vel=1.0, until=4.0):
    for b, d, m in THEME[idx]:
        if b < until:
            L.add('orch', T(bar, b), strings([m + key - 24], d * BEAT, 0.08, 0.3, 1700, 0, vel), G['cello'])


def pad_bar(L, bar, idx, key=0, oct_=0, att=0.25, bright=2400, trem=0.0, vel=1.0, gain=None, dur_scale=1.0):
    for b0, bl, c in chords_of(idx):
        L.add('orch', T(bar, b0),
              strings([m + key + oct_ for m in VOICING[c]], bl * BEAT * dur_scale, att, 0.35, bright, trem, vel),
              G['trem' if trem else 'pad'] if gain is None else gain)


def organ_bar(L, bar, idx, key=0, vel=1.0):
    for b0, bl, c in chords_of(idx):
        notes = sorted(set([ROOT[c] + 12 + key] + [m + key for m in VOICING[c]] + [VOICING[c][-1] + key + 12]))
        L.add('orch', T(bar, b0), organ(notes, bl * BEAT, vel=vel), G['organ'])


def sub_bar(L, bar, idx, key=0, gain=1.0):
    for b0, bl, c in chords_of(idx):
        L.add('sub', T(bar, b0), sub(ROOT[c] + key, bl * BEAT), G['sub'] * gain)


def growl_bar(L, bar, idx, key, pattern, gain=1.0):
    for st, ln, iv, style, rate in pattern:
        m = ROOT[chord_at(idx, st / 4)] + key + iv
        L.add('bass', T(bar, st / 4), widen(growl(m, ln * STEP, style, rate), 0.35), G['growl'] * gain)


def braam_at(L, t, chord, key, gain=1.0, dur=3.2):
    L.add('orch', t, braam(ROOT[chord] + key, dur), G['braam'] * gain)


def impact(L, t, big=1.0):
    L.add('dry', t, boom(), G['boom'] * big)
    L.add('fx', t, S['crash'], G['crash'] * 1.6 * big)
    hit(L, 'perc', 'taiko', t, G['taiko'] * 1.2 * big)
    hit(L, 'kick', 'kick_drop', t, G['kick'] * big, sc=True)
    L.add('fx', t, blade(), G['fx'] * 0.9 * big)


def screech_run(L, bar, key=0):
    for k, b in enumerate((3.0, 3.25, 3.5, 3.75)):
        L.add('fx', T(bar, b), screech(0.25, 96 + key + (k % 2)), G['fx'] * (0.7 + 0.1 * k),
              pan_=-0.4 if k % 2 else 0.4)


def hats16(L, bar, vel=1.0, rolls=()):
    for st in range(16):
        acc = [0.9, 0.35, 0.6, 0.35][st % 4]
        t = T(bar, st / 4) + rng.normal(0, 0.002)
        if st in rolls:
            for k in range(2):
                hit(L, 'drums', 'hat', t + k * STEP / 2, G['hat'] * vel * (0.45 + 0.3 * k), 0.25)
        else:
            hit(L, 'drums', 'hat', t, G['hat'] * vel * acc, 0.25)


def snare_fill(L, bar, start=12, vel=1.0):
    for k, st in enumerate(range(start, 16)):
        t = T(bar, st / 4)
        hit(L, 'drums', 'snare', t, G['snare'] * vel * (0.5 + 0.12 * k), -0.05)
        hit(L, 'perc', 'tom_hi' if k % 2 else 'tom_mid', t, G['taiko'] * 0.5, 0.3 if k % 2 else -0.3)


# ----------------------------------------------------------------------------
# sections
# ----------------------------------------------------------------------------

def build_intro_starting(L):
    # INTRO: music box alone over a barely-there drone
    L.add('orch', T(0), drone([38, 45], T(7, 3) + 0.5), G['drone'])
    for b in range(4):
        mb_bar(L, b, b, vel=0.85 + 0.05 * b, lh=0.42)
    # STARTING: heartbeat beat, ticking clock, strings and sub come in; box stays on top
    for b in range(4, 8):
        build = b == 7
        mb_bar(L, b, b, vel=1.0, lh=0.5, until=3.0 if build else 4.0)
        pad_bar(L, b, b, att=0.6, bright=1400, vel=0.55 + 0.1 * (b - 4))
        sub_bar(L, b, b, gain=0.45)
        if not build:
            for st in (0, 8):
                heart(L, T(b, st / 4))
                hit(L, 'kick', 'kick_main', T(b, st / 4), G['kick'] * 0.35)
            for st in range(0, 16, 2):
                hit(L, 'drums', 'tick_hi' if st % 4 == 0 else 'tick_lo', T(b, st / 4), G['tick'], 0.35)
            for st in (4, 12):
                hit(L, 'drums', 'rim', T(b, st / 4), G['rim'], -0.1)
            if b >= 5:
                hats16(L, b, vel=0.45)
        else:
            for bt in (0, 1, 2):
                hit(L, 'kick', 'heart', T(b, bt), G['heart'])
                hit(L, 'kick', 'kick_main', T(b, bt), G['kick'] * 0.5)
            for k, st in enumerate([0, 2, 4, 6, 8, 9, 10, 11]):
                hit(L, 'drums', 'snare_roll', T(b, st / 4), G['snare'] * (0.3 + 0.09 * k), -0.05)
    L.add('fx', T(6), riser(T(7, 3) - T(6)), G['fx'] * 0.55)


def build_major(L):
    rc = reverse_crash(BAR)
    L.add('fx', T(8) - rc.shape[1] / SR, rc, G['crash'] * 1.6)
    L.add('fx', T(7, 3), swell(BEAT), G['fx'] * 0.7)
    impact(L, T(8), 1.2)
    for b in range(8, 24):
        idx = b % 8
        second = b >= 16
        mb_bar(L, b, idx, vel=1.0, lh=0.45)
        if second:
            lead_bar(L, b, idx, 0, vel=0.9)
        growl_bar(L, b, idx, 0, MAJ[MAJ_ORDER[b - 8]])
        sub_bar(L, b, idx)
        pad_bar(L, b, idx, att=0.03, bright=4000, vel=0.8)
        if second:
            pad_bar(L, b, idx, oct_=12, att=0.05, bright=5500, trem=0.8, vel=0.55)
        if b % 4 == 0:
            braam_at(L, T(b), CHORDS[idx].split('/')[0], 0)
            if b != 8:
                L.add('fx', T(b), S['crash'], G['crash'])
        # half-time drums
        kicks = [0, 10] if b % 2 == 0 else [0, 11, 14]
        for st in kicks:
            hit(L, 'kick', 'kick_drop' if st == 0 else 'kick_main', T(b, st / 4), G['kick'] * (1 if st == 0 else 0.8),
                sc=True)
        fill = b in (11, 15, 19)
        hit(L, 'drums', 'snare', T(b, 2), G['snare'], -0.05)
        hit(L, 'perc', 'taiko', T(b, 2), G['taiko'] * 0.45)
        hats16(L, b, vel=1.0 if second else 0.85, rolls=(6, 14) if second else ())
        hit(L, 'drums', 'ohat', T(b, 3.5), G['ohat'], 0.3)
        if fill:
            snare_fill(L, b, 12)
        if b in (11, 19):
            screech_run(L, b)


def build_climax(L):
    L.add('fx', T(24, 0.5), blade(2.6, 900.0), G['fx'] * 0.45)   # the killer, somewhere close
    for b in range(24, 32):
        idx = b % 8
        last = b == 31
        until = 3.0 if last else 4.0
        mb_bar(L, b, idx, vel=0.95, lh=0.5, until=until)
        cello_bar(L, b, idx, vel=0.4 + 0.07 * (b - 24), until=until)
        pad_bar(L, b, idx, att=0.5, bright=1600, vel=0.35 + 0.06 * (b - 24))
        sub_bar(L, b, idx, gain=0.25 + 0.06 * (b - 24))
        # heartbeat speeds up
        if b < 28:
            for bt in (0, 2):
                heart(L, T(b, bt), 0.75)
        elif b < 30:
            for bt in range(4):
                heart(L, T(b, bt), 1.0)
        else:
            for k in range(8 if not last else 6):
                hit(L, 'kick', 'heart', T(b, k / 2), G['heart'])
        if b >= 28:
            ramp = (b - 28) / 3
            organ_bar(L, b, idx, vel=0.45 + 0.55 * ramp)
            pad_bar(L, b, idx, oct_=12, att=0.3, bright=3500, trem=0.8, vel=0.35 + 0.5 * ramp)
            # accelerating snare roll: quarters -> 8ths -> 16ths -> 32nds
            div = {28: 4, 29: 2, 30: 1, 31: 0.5}[b]
            st = 0.0
            while st < (12 if last else 16):
                p = ((b - 28) * 16 + st) / 64
                hit(L, 'drums', 'snare_roll', T(b, st / 4), G['snare'] * (0.25 + 0.75 * p), -0.05)
                st += div
            if b >= 30:
                for bt in range(4 if not last else 3):
                    hit(L, 'perc', 'taiko', T(b, bt), G['taiko'] * (0.6 + 0.2 * (b - 30)))
    build = T(31, 3) - T(28)
    L.add('fx', T(28), riser(build, 250, 11000), G['fx'] * 0.9)
    L.add('fx', T(28), shepard(build), G['fx'] * 0.55)


def build_final(L):
    # the silent beat before the final: a lone, out-of-tune music box note
    t = T(31, 3)
    L.add('mbox', t, musicbox(74, t, 0.9, 2.0, -35), G['mbox'])
    rc = reverse_crash(BAR)
    L.add('fx', T(32) - rc.shape[1] / SR, rc, G['crash'] * 1.8)
    L.add('fx', T(31, 3), swell(BEAT), G['fx'] * 0.8)
    for b in range(32, 48):
        key = 0 if b < 40 else 1
        idx = b % 8
        hot = b >= 40
        if b in (32, 40):
            impact(L, T(b), 1.3 if b == 32 else 1.1)
        if b == 47:
            final_blow(L, b, key)
            continue
        if b == 46:
            live_or_die(L, b, idx, key)
            continue
        mb_bar(L, b, idx, key, vel=1.0, lh=0.45)
        lead_bar(L, b, idx, key, vel=1.0 if hot else 0.9)
        if hot:
            cello_bar(L, b, idx, key, vel=0.7)
        growl_bar(L, b, idx, key, P_FIN if b % 2 == 0 else P_FIN2)
        sub_bar(L, b, idx, key)
        pad_bar(L, b, idx, key, att=0.05, bright=3800, vel=0.75)
        pad_bar(L, b, idx, key, oct_=12, att=0.04, bright=5500, trem=0.85, vel=0.6 if not hot else 0.72)
        organ_bar(L, b, idx, key, vel=0.85)
        if hot or b % 2 == 0:
            braam_at(L, T(b), chords_of(idx)[0][2], key, 1.0 if not hot else 0.9)
        if b in (36, 44):
            L.add('fx', T(b), S['crash'], G['crash'] * 1.2)
        # full-time chase beat
        kicks = [0, 4, 8, 12] + ([14] if b % 2 else []) + ([3, 11] if hot else [])
        for st in kicks:
            hit(L, 'kick', 'kick_final', T(b, st / 4), G['kick'] * (1 if st % 4 == 0 else 0.7), sc=True)
        fill = b in (35, 39, 43)
        for st in (4, 12):
            hit(L, 'drums', 'snare', T(b, st / 4), G['snare'], -0.05)
        if not fill:
            for st in (7, 15):
                hit(L, 'drums', 'snare_roll', T(b, st / 4), G['snare'] * 0.22, -0.05)
        hats16(L, b, vel=1.0, rolls=(14, 15) if hot else ())
        for st in (2, 6, 10, 14):
            hit(L, 'drums', 'ohat', T(b, st / 4), G['ohat'] * 0.8, 0.3)
        hit(L, 'perc', 'taiko', T(b, 0), G['taiko'] * 0.8)
        hit(L, 'perc', 'taiko', T(b, 2), G['taiko'] * 0.5)
        if fill:
            snare_fill(L, b, 8 if b == 39 else 12, 1.1)
        if b in (35, 43):
            screech_run(L, b, key)
        if b == 39:
            L.add('fx', T(39), riser(BAR, 400, 12000), G['fx'] * 0.7)


def live_or_die(L, b, idx, key):
    """Bar 47: the groove stops; three full-band hits - LIVE ... OR ... DIE."""
    mb_bar(L, b, idx, key, vel=1.05, lh=0.45)
    lead_bar(L, b, idx, key, vel=1.05)
    cello_bar(L, b, idx, key, vel=0.8)
    for k, bt in enumerate((0.0, 1.5, 3.0)):
        c = chord_at(idx, bt)
        t = T(b, bt)
        g = 0.9 + 0.1 * k
        hit(L, 'kick', 'kick_drop', t, G['kick'] * g, sc=True)
        hit(L, 'drums', 'snare', t, G['snare'] * g, -0.05)
        hit(L, 'perc', 'taiko', t, G['taiko'] * 1.1 * g)
        L.add('fx', t, S['crash'], G['crash'] * g)
        braam_at(L, t, c, key, g * 1.1, BEAT * 1.3)
        L.add('orch', t, strings([m + key for m in VOICING[c]] + [m + key + 12 for m in VOICING[c]],
                                 BEAT * 0.8, 0.01, 0.15, 4200, 0, 1.0), G['pad'] * g)
        L.add('bass', t, widen(growl(ROOT[c] + key, BEAT * 0.9, 'stab'), 0.35), G['growl'] * g)
        L.add('sub', t, sub(ROOT[c] + key, BEAT * 0.9), G['sub'] * g)
    for k in range(8):   # 32nd-note snare run into the last hit
        hit(L, 'drums', 'snare_roll', T(b, 3.5 + k / 16), G['snare'] * (0.4 + 0.08 * k), -0.05)


def final_blow(L, b, key):
    t = T(b)
    c = 'Dm'
    impact(L, t, 1.4)
    braam_at(L, t, c, key, 1.2)
    L.add('orch', t, strings([m + key for m in VOICING[c]] + [m + key + 12 for m in VOICING[c]], 1.4, 0.01, 0.5,
                             3800, 0, 1.0), G['pad'])
    L.add('orch', t, organ([ROOT[c] + key + 12] + [m + key for m in VOICING[c]], 1.3, 0.01, 0.5), G['organ'] * 1.2)
    L.add('sub', t, sub(ROOT[c] + key, 1.6), G['sub'])
    L.add('lead', t, lead(74 + key, 1.2, 1.0), G['lead'])
    for m, v in ((86, 1.1), (74, 0.8), (62, 0.6)):
        L.add('mbox', t, musicbox(m + key, t, v, 3.0), G['mbox'])


# ----------------------------------------------------------------------------
# render / master / export
# ----------------------------------------------------------------------------

def master(x):
    x = hp(x, 25, 2)
    x = shelf(shelf(x, 3500, 3.0, True), 70, -2.0, False)
    fin = x[:, ns(60):ns(88)]
    x *= 10 ** ((-16.0 - 10 * np.log10(np.mean(fin ** 2))) / 20)
    # glue compression
    lvl = np.max(np.abs(x), axis=0)
    env = _env_follow(lvl, np.exp(-1 / (0.01 * SR)), np.exp(-1 / (0.2 * SR)))
    gdb = -np.maximum(0, 20 * np.log10(env + 1e-9) + 12) * (1 - 1 / 2.2)
    x = x * 10 ** (gdb / 20)
    # loudness target on the loudest section, then brickwall limit at -1.5 dBFS
    fin = x[:, ns(60):ns(88)]
    x *= 10 ** ((-11.0 - 10 * np.log10(np.mean(fin ** 2))) / 20)
    ceil = 10 ** (-1.5 / 20)
    g = _limiter_gain(np.max(np.abs(x), axis=0), ceil, ns(0.0015), np.exp(-1 / (0.08 * SR)))
    x = np.clip(x * g, -ceil, ceil)
    # fade the last ring-out into silence exactly at 90 s
    f = ns(0.9)
    x[:, -f:] *= np.cos(np.linspace(0, np.pi / 2, f)) ** 2
    x[:, :ns(0.004)] *= np.linspace(0, 1, ns(0.004))
    return x, g


def render():
    layers = [
        (Layer(0.0, T(8), cut=T(7, 3), auto=[(0, -3.5), (T(7), -3.0)]), build_intro_starting),
        (Layer(T(7), T(24), tape=(T(23, 2), T(24))), build_major),
        (Layer(T(24), T(32), cut=T(31, 3), auto=[(T(24), -5.0), (T(28), -4.0), (T(31, 3), 0.0)]), build_climax),
        (Layer(T(31, 3), LENGTH), build_final),
    ]
    for L, build in layers:
        build(L)
    song = np.zeros((2, N + ns(TAIL) * 2))
    stats = []
    for L, _ in layers:
        out = L.render()
        i = ns(L.t0) if L.t0 > 0 else 0
        song[:, i:i + out.shape[1]] += out
        stats.append((L.t0, L.stats))
    return song[:, :N], stats


def write_wav(path, x):
    pcm = (np.clip(x, -1, 1) * 32767).astype('<i2').T.copy()
    with wave.open(path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def write_mp3(path, x):
    pcm = (np.clip(x, -1, 1) * 32767).astype('<i2').T.copy()
    enc = lameenc.Encoder()
    enc.set_bit_rate(320)
    enc.set_in_sample_rate(SR)
    enc.set_channels(2)
    enc.set_quality(2)
    data = enc.encode(pcm.tobytes()) + enc.flush()
    with open(path, 'wb') as f:
        f.write(data)


def analyze(x, g, stats):
    def db(v):
        return 10 * np.log10(np.mean(v ** 2) + 1e-12)
    print('section            rms dB   peak   limiter GR dB (worst / mean)')
    for name, a, b in [('intro', 0, 7.5), ('starting', 7.5, 15), ('major', 15, 45), ('climax', 45, 60),
                       ('final', 60, 90)]:
        seg = x[:, ns(a):ns(b)]
        gs = 20 * np.log10(g[ns(a):ns(b)])
        print(f'{name:16s} {db(seg):7.2f} {np.max(np.abs(seg)):6.3f} {gs.min():8.2f} {gs.mean():6.2f}')
    for t0, st in stats:
        print(f'layer @ {t0:5.2f}s bus rms dB: ' + ', '.join(f'{k}={db(v):.1f}' for k, v in st.items() if np.any(v)))


def main():
    args = sys.argv[1:]
    out = next((a for a in args if a.endswith('.mp3')), 'Live_or_Die.mp3')
    song, stats = render()
    mix, g = master(song)
    assert np.all(np.isfinite(mix))
    if '--wav' in args:
        write_wav(args[args.index('--wav') + 1], mix)
    write_mp3(out, mix)
    if '--analyze' in args:
        analyze(mix, g, stats)
    print(f'wrote {out}: {mix.shape[1] / SR:.2f} s')


if __name__ == '__main__':
    main()
