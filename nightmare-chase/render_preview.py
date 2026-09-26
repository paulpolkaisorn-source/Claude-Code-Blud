"""Render a rough synth preview of the MIDI arrangement to preview.mp3.

Pure numpy synths (no soundfont) - it's a sketch to hear the chords and melody,
not a final mix. Reverb/note tails wrap around to the start so the 2:00 file loops.

Run:  python render_preview.py
Needs: numpy, scipy, soundfile, imageio-ffmpeg
"""
import subprocess
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.signal import fftconvolve, lfilter

import song

SR = 44100
SEC_PER_EIGHTH = 60 / song.BPM / 2
rng = np.random.default_rng(7)


def hz(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def saw(f, t, detune=0.0):
    ph = (f * (1 + detune) * t) % 1.0
    return 2 * ph - 1


def square(f, t):
    return np.sign(np.sin(2 * np.pi * f * t))


def lowpass(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR)
    return lfilter([1 - a], [1, -a], x)


def adsr(n, a, d, s, r, sustain_len):
    """Envelope of total length n samples; note held for sustain_len samples, then release."""
    env = np.zeros(n)
    A, D, R = int(a * SR), int(d * SR), int(r * SR)
    hold = max(sustain_len, A + D)
    env[:A] = np.linspace(0, 1, A, endpoint=False)
    env[A:A + D] = np.linspace(1, s, D, endpoint=False)
    env[A + D:hold] = s
    rel = min(R, n - hold)
    if rel > 0:
        env[hold:hold + rel] = np.linspace(s, 0, rel)
    return env


def voice(kind, note, dur):
    f = hz(note)
    tail = {"pad": 0.4, "box": 1.2, "bass": 0.08, "ost": 0.25}.get(kind, 0.12)
    n = int((dur + tail) * SR)
    t = np.arange(n) / SR
    held = int(dur * SR)
    if kind in ("lead", "harm"):
        vib = 1 + 0.004 * np.sin(2 * np.pi * 5.5 * t) * np.clip(t / 0.3, 0, 1)
        x = saw(f * vib, t) + saw(f * vib, t, 0.006) + 0.5 * saw(f * vib, t, -0.004)
        x = lowpass(x, 3200) * adsr(n, 0.01, 0.12, 0.7, 0.1, held)
        return x * 0.22
    if kind == "ost":
        x = lowpass(square(f, t), 2400) * np.exp(-t / 0.16) * (np.arange(n) < held + 0.2 * SR)
        return x * 0.16
    if kind == "box":
        x = (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t)
             + 0.15 * np.sin(2 * np.pi * 4.2 * f * t) * np.exp(-t / 0.15))
        return x * np.exp(-t / 0.7) * 0.35
    if kind == "pad":
        x = sum(saw(f, t, d) for d in (-0.007, 0.0, 0.0065))
        x = lowpass(lowpass(x, 1100), 1100) * adsr(n, 0.18, 0.3, 0.8, 0.4, held)
        return x * 0.05
    if kind == "bass":
        x = 0.6 * saw(f, t) + 0.8 * np.sin(2 * np.pi * f * t)
        x = lowpass(x, 700) * adsr(n, 0.004, 0.15, 0.55, 0.06, held)
        return np.tanh(2.0 * x) * 0.32
    raise ValueError(kind)


def render():
    tracks, _, _, total_bars = song.build_events()
    length = int(total_bars * song.BAR * SEC_PER_EIGHTH * SR)
    buf = np.zeros(length + 3 * SR)
    for kind, notes in tracks.items():
        for start, ln, note, vel in notes:
            x = voice(kind, note, ln * SEC_PER_EIGHTH) * (vel / 100)
            s = int(start * SEC_PER_EIGHTH * SR)
            buf[s:s + len(x)] += x
    # simple reverb: exponentially decaying noise impulse response
    ir_t = np.arange(int(1.2 * SR)) / SR
    ir = rng.standard_normal(len(ir_t)) * np.exp(-ir_t / 0.35)
    ir = lowpass(ir, 5000)
    ir /= np.sqrt(np.sum(ir ** 2))
    wet = fftconvolve(buf, ir)[:len(buf)]
    mix = buf + 0.25 * wet
    # wrap everything past 2:00 back onto the start -> seamless loop
    out = mix[:length].copy()
    over = mix[length:]
    out[:len(over)] += over
    out = np.tanh(out / np.max(np.abs(out)) * 1.4)
    out /= np.max(np.abs(out)) * 1.12
    stereo = np.stack([out, np.roll(out, int(0.011 * SR)) * 0.97 + out * 0.03], axis=1)
    return stereo


if __name__ == "__main__":
    import imageio_ffmpeg

    here = Path(__file__).parent
    audio = render()
    wav = here / "preview.wav"
    sf.write(wav, audio, SR)
    mp3 = here / "preview.mp3"
    subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), "-y", "-loglevel", "error", "-i", str(wav),
                    "-codec:a", "libmp3lame", "-b:a", "192k", str(mp3)], check=True)
    wav.unlink()
    print(f"wrote {mp3} ({len(audio) / SR:.2f}s)")
