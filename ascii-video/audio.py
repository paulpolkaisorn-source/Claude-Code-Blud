"""Procedural soundtrack: synth pad + per-scene EVENTS (typing clicks, blips, whooshes, chimes)."""
import importlib, os, sys, wave
import numpy as np

SR = 44100
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "scenes"))

def _click(rng):
    n = int(SR * 0.025); e = np.exp(-np.linspace(0, 9, n)); return (rng.standard_normal(n) * e * 0.35)
def _blip(f=880):
    n = int(SR * 0.12); t = np.arange(n) / SR; return np.sin(2 * np.pi * f * t) * np.exp(-t * 28) * 0.25
def _whoosh(rng):
    n = int(SR * 0.5); x = rng.standard_normal(n); k = np.hanning(n); w = np.convolve(x, np.ones(40) / 40, "same") * k * 0.5; return w
def _chime():
    n = int(SR * 1.2); t = np.arange(n) / SR
    return sum(np.sin(2 * np.pi * f * t) * np.exp(-t * 3) for f in (660, 990, 1320)) * 0.12

def make(path, durations=None):
    rng = np.random.default_rng(7)
    mods = [importlib.import_module(f"scene_{n:02d}") for n in range(1, 9)]
    total = sum(m.DURATION for m in mods)
    out = np.zeros(int((total + 1) * SR))
    t = np.arange(len(out)) / SR
    # slow pad: A minor drone with gentle tremolo, fades in/out
    pad = sum(np.sin(2 * np.pi * f * t) * a for f, a in ((55, .5), (82.4, .3), (110, .25), (164.8, .1)))
    pad *= (0.6 + 0.4 * np.sin(2 * np.pi * 0.11 * t)) * 0.07
    pad *= np.clip(t / 3, 0, 1) * np.clip((total - t) / 3, 0, 1)
    out += pad
    t0 = 0.0
    for m in mods:
        for et, kind in getattr(m, "EVENTS", []):
            s = {"click": _click(rng), "blip": _blip(), "whoosh": _whoosh(rng), "chime": _chime()}.get(kind)
            if s is None: continue
            i = int((t0 + et) * SR); out[i:i + len(s)] += s[:len(out) - i]
        t0 += m.DURATION
    out = out[:int(total * SR)]
    out = np.tanh(out * 1.2)
    pcm = (out * 32767 * 0.9).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    return path
