"""Render a rough synth demo of Last Heartbeat to preview.mp3 (and an instrumental).

Pure numpy synths (no soundfont): distorted guitars, drums, bass, pad, music-box hook
and a vowel-like synth voice that sings the vocal melody as a guide.
It's a sketch for hearing the song and for uploading to Suno, not a final mix.

Run:  python render_preview.py
Needs: numpy, scipy, soundfile, imageio-ffmpeg
"""
import subprocess
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.signal import butter, fftconvolve, lfilter, sosfilt

import song

SR = 44100
SPE = 60 / song.BPM / 2          # seconds per eighth note
rng = np.random.default_rng(11)


def hz(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def saw(f, t, detune=0.0):
    return 2 * ((f * (1 + detune) * t) % 1.0) - 1


def lowpass(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR)
    return lfilter([1 - a], [1, -a], x)


def band(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], btype="band", fs=SR, output="sos"), x)


def highpass(x, cutoff, order=2):
    return sosfilt(butter(order, cutoff, btype="high", fs=SR, output="sos"), x)


def adsr(n, a, d, s, r, held):
    """Attack/decay/sustain until `held` samples, then release; cut or zero-padded to n."""
    A, D, R = int(a * SR), int(d * SR), int(r * SR)
    hold = max(held, A)
    env = np.concatenate([np.linspace(0, 1, A, endpoint=False),
                          np.linspace(1, s, D, endpoint=False),
                          np.full(max(0, hold - A - D), s)])[:hold]
    level = env[-1] if len(env) else 0.0
    env = np.concatenate([env, np.linspace(level, 0, R)])
    return np.pad(env, (0, max(0, n - len(env))))[:n]


# ------------------------------------------------------------------ tonal voices
def voice(kind, note, dur):
    f = hz(note)
    tail = {"pad": 0.4, "hook": 1.0, "bass": 0.06, "vocal": 0.12, "lead": 0.1, "gtr": 0.05}[kind]
    n = int((dur + tail) * SR)
    t = np.arange(n) / SR
    held = int(dur * SR)
    if kind == "vocal":           # saw through three vowel formants ("ah")
        vib = 1 + 0.006 * np.sin(2 * np.pi * 5.2 * t) * np.clip((t - 0.15) / 0.25, 0, 1)
        src = saw(f * vib, t) + 0.6 * saw(f * vib, t, 0.003)
        x = band(src, 650, 850) + 0.7 * band(src, 1050, 1300) + 0.35 * band(src, 2400, 2900)
        x += 0.25 * lowpass(src, 900)
        return x * adsr(n, 0.03, 0.1, 0.85, 0.1, held) * 0.55
    if kind == "lead":            # distorted solo guitar with vibrato on long notes
        vib = 1 + 0.008 * np.sin(2 * np.pi * 6 * t) * np.clip((t - 0.2) / 0.2, 0, 1)
        x = np.tanh(7 * (saw(f * vib, t) + 0.5 * saw(f * vib, t, 0.004)))
        x = lowpass(lowpass(x, 4200), 5200)
        return x * adsr(n, 0.005, 0.2, 0.75, 0.08, held) * 0.2
    if kind == "gtr":             # clean saw per string; distortion is applied to the whole bus
        x = saw(f, t) + saw(f, t, 0.002)
        mute = dur < 0.7 * SPE    # palm-muted chugs: short and dark
        env = adsr(n, 0.002, 0.08 if mute else 0.3, 0.3 if mute else 0.8, 0.04, held)
        return lowpass(x, 900 if mute else 2500) * env * 0.28
    if kind == "hook":            # music box
        x = (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t)
             + 0.15 * np.sin(2 * np.pi * 4.2 * f * t) * np.exp(-t / 0.15))
        return x * np.exp(-t / 0.6) * 0.3
    if kind == "pad":
        x = sum(saw(f, t, d) for d in (-0.007, 0.0, 0.0065))
        return lowpass(lowpass(x, 1200), 1200) * adsr(n, 0.2, 0.3, 0.8, 0.4, held) * 0.09
    if kind == "bass":
        x = 0.6 * saw(f, t) + 0.9 * np.sin(2 * np.pi * f * t)
        x = lowpass(x, 650) * adsr(n, 0.004, 0.12, 0.6, 0.05, held)
        return np.tanh(2.2 * x) * 0.34
    raise ValueError(kind)


# ------------------------------------------------------------------ drums
def _noise(sec):
    return rng.standard_normal(int(sec * SR))


def make_drums():
    kit = {}
    t = np.arange(int(0.45 * SR)) / SR
    f = 48 + 110 * np.exp(-t / 0.035)
    kick = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.22)
    kick[:120] += np.linspace(0.6, 0, 120) * rng.standard_normal(120)
    kit[song.KICK] = np.tanh(1.6 * kick) * 0.9
    t = np.arange(int(0.3 * SR)) / SR
    kit[song.SNARE] = (band(_noise(0.3), 1200, 8000) * np.exp(-t / 0.09) * 0.7
                       + np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.06) * 0.6)
    t = np.arange(int(0.08 * SR)) / SR
    kit[song.HAT] = highpass(_noise(0.08), 7000) * np.exp(-t / 0.02) * 0.35
    t = np.arange(int(0.4 * SR)) / SR
    kit[song.OHAT] = highpass(_noise(0.4), 6500) * np.exp(-t / 0.12) * 0.3
    t = np.arange(int(2.0 * SR)) / SR
    kit[song.CRASH] = highpass(_noise(2.0), 4000) * np.exp(-t / 0.7) * 0.35
    t = np.arange(int(0.6 * SR)) / SR
    kit[song.RIDE] = (highpass(_noise(0.6), 6000) * np.exp(-t / 0.25) * 0.15
                      + (np.sin(2 * np.pi * 3150 * t) + 0.6 * np.sin(2 * np.pi * 4730 * t))
                      * np.exp(-t / 0.3) * 0.05)
    t = np.arange(int(0.4 * SR)) / SR
    for note, base in ((song.TOM_H, 210), (song.TOM_M, 160), (song.TOM_L, 115)):
        f = base * (1 + 0.5 * np.exp(-t / 0.04))
        kit[note] = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.18) * 0.7
    return kit


# ------------------------------------------------------------------ mix
def render(include_vocal=True):
    tracks, _, _, _, _, total_bars = song.build_events()
    length = int(total_bars * song.BAR * SPE * SR)
    pad = 3 * SR
    buses = {k: np.zeros(length + pad) for k in tracks}
    kit = make_drums()
    for kind, notes in tracks.items():
        if kind == "vocal" and not include_vocal:
            continue
        for start, ln, note, vel in notes:
            s = int(round(start * SPE * SR))
            if kind == "drums":
                x = kit[note] * (vel / 110)
            else:
                x = voice(kind, note, ln * SPE) * (vel / 100)
            buses[kind][s:s + len(x)] += x

    g = buses["gtr"]                                   # amp + cabinet on the rhythm guitar bus
    g = np.tanh(9 * highpass(g, 90)) * 0.9
    buses["gtr"] = lowpass(lowpass(g, 3800), 5000) * 0.45
    buses["lead"] *= 2.6
    buses["vocal"] *= 2.8
    buses["drums"] *= 0.8

    dry = sum(buses.values())
    send = (buses["vocal"] + buses["lead"] + buses["hook"] + buses["pad"]
            + 0.3 * buses["drums"] + 0.15 * buses["gtr"])
    ir_t = np.arange(int(1.4 * SR)) / SR
    ir = lowpass(rng.standard_normal(len(ir_t)) * np.exp(-ir_t / 0.4), 5000)
    ir /= np.sqrt(np.sum(ir ** 2))
    mix = dry + 0.22 * fftconvolve(send, ir)[:len(dry)]

    out = mix[:length].copy()                           # wrap tails onto the start -> loops
    out[:pad] += mix[length:]
    out = np.tanh(out / np.max(np.abs(out)) * 1.6)
    out /= np.max(np.abs(out)) * 1.12
    return np.stack([out, np.roll(out, int(0.012 * SR)) * 0.97 + out * 0.03], axis=1)


def to_mp3(audio, path):
    import imageio_ffmpeg

    wav = path.with_suffix(".wav")
    sf.write(wav, audio, SR)
    subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), "-y", "-loglevel", "error", "-i", str(wav),
                    "-codec:a", "libmp3lame", "-b:a", "192k", str(path)], check=True)
    wav.unlink()


if __name__ == "__main__":
    here = Path(__file__).parent
    for name, vocal in (("preview.mp3", True), ("instrumental.mp3", False)):
        audio = render(include_vocal=vocal)
        to_mp3(audio, here / name)
        print(f"wrote {here / name} ({len(audio) / SR:.2f}s)")
