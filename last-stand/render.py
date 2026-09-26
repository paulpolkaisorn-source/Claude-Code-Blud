"""Render Last Stand to last_stand.mp3.

Signal chain:
- FluidSynth renders each part with the FluidR3 GM soundfont (sampled instruments).
- Guitars are rendered CLEAN (clean + palm-muted guitar samples = "DI"), then go through a
  noise gate, a 4x-oversampled two-stage high-gain amp sim and a 4x12 cabinet EQ.
  Rhythm guitars are double-tracked (two humanized takes, hard left / hard right).
- Drums are rendered per piece (kick, snare, toms, cymbals) and processed separately.
- Buses are auto-levelled against the chorus, then bus compression, EQ, limiter, -9 LUFS.

Run:  python render.py
Needs: fluidsynth + FluidR3_GM.sf2 (apt: fluidsynth fluid-soundfont-gm),
       pip: mido numpy scipy soundfile pyloudnorm imageio-ffmpeg
"""
import hashlib
import subprocess
import tempfile
from pathlib import Path

import mido
import numpy as np
import pyloudnorm as pyln
import soundfile as sf
from scipy.ndimage import minimum_filter1d
from scipy.signal import butter, fftconvolve, lfilter, resample_poly, sosfilt

import song

SF2 = "/usr/share/sounds/sf2/FluidR3_GM.sf2"
SR = 44100
SEC_PER_EIGHTH = 60 / song.BPM / 2
TAIL = 3.0
rng = np.random.default_rng(2026)


# ------------------------------------------------------------------ rendering
CACHE = Path(__file__).parent / ".cache"      # FluidSynth renders, keyed by MIDI content


def render_part(key, notes, total_bars, vibrato=()):
    """Render one part with FluidSynth -> mono float array (cached)."""
    mid = mido.MidiFile(type=1, ticks_per_beat=song.TPB)
    meta = mido.MidiTrack()
    meta.append(mido.MetaMessage("set_tempo", tempo=mido.bpm2tempo(song.BPM), time=0))
    mid.tracks.append(meta)
    mid.tracks.append(song.part_track(key, notes, total_bars, vibrato))
    with tempfile.TemporaryDirectory() as td:
        mp, wp = Path(td) / "p.mid", Path(td) / "p.wav"
        mid.save(mp)
        cached = CACHE / (hashlib.md5(mp.read_bytes()).hexdigest() + ".npy")
        if cached.exists():
            return np.load(cached)
        subprocess.run(["fluidsynth", "-ni", "-q", "-g", "0.5", "-R", "0", "-C", "0", "-r", str(SR),
                        "-O", "float", "-T", "wav", "-F", str(wp), SF2, str(mp)],
                       check=True, capture_output=True)
        x, sr = sf.read(wp, dtype="float64")
    assert sr == SR
    x = x.mean(axis=1) if x.ndim == 2 else x
    CACHE.mkdir(exist_ok=True)
    np.save(cached, x)
    return x


def fit(x, n):
    return np.pad(x, (0, max(0, n - len(x))))[:n]


def humanize(notes, seed, ms, dv):
    """Jitter timing (ms std-dev) and velocity (+-dv) of a note list, deterministically."""
    r = np.random.default_rng(seed)
    out = []
    for s, l, nt, v in notes:
        j = r.normal(0, ms) / 1000 / SEC_PER_EIGHTH
        out.append((max(0.0, s + j), l, nt, int(max(1, min(127, v + r.integers(-dv, dv + 1))))))
    return out


def note_gate(notes, n, release_ms=12, hold_s=None, shape=1.0):
    """Gain envelope that is open while notes sound and closes release_ms after each note-off.
    hold_s fixes every note's open time (used to tighten drum hits)."""
    g = np.zeros(n)
    R = max(1, int(release_ms / 1000 * SR))
    ramp = np.linspace(1, 0, R) ** shape
    for s, l, _, _ in notes:
        a = int(s * SEC_PER_EIGHTH * SR)
        b = a + int((hold_s if hold_s is not None else l * SEC_PER_EIGHTH) * SR)
        if a >= n:
            continue
        g[a:min(b, n)] = 1
        seg = g[b:b + R]
        g[b:b + R] = np.maximum(seg, ramp[:len(seg)])
    return g


# ------------------------------------------------------------------ DSP helpers
def sos(kind, f, order=2):
    return butter(order, f, btype=kind, fs=SR, output="sos")


def hp(x, f, order=2):
    return sosfilt(sos("high", f, order), x)


def lp(x, f, order=2):
    return sosfilt(sos("low", f, order), x)


def peq(x, f, gain_db, q=1.0):
    """RBJ peaking EQ."""
    A = 10 ** (gain_db / 40)
    w = 2 * np.pi * f / SR
    al = np.sin(w) / (2 * q)
    b = [1 + al * A, -2 * np.cos(w), 1 - al * A]
    a = [1 + al / A, -2 * np.cos(w), 1 - al / A]
    return lfilter(np.array(b) / a[0], np.array(a) / a[0], x)


def shelf(x, f, gain_db, high=True):
    """RBJ shelf EQ (S = 1)."""
    A = 10 ** (gain_db / 40)
    w = 2 * np.pi * f / SR
    al = np.sin(w) / 2 * np.sqrt(2)
    c = np.cos(w)
    s = 1 if high else -1
    b = [A * ((A + 1) + s * (A - 1) * c + 2 * np.sqrt(A) * al),
         -2 * s * A * ((A - 1) + s * (A + 1) * c),
         A * ((A + 1) + s * (A - 1) * c - 2 * np.sqrt(A) * al)]
    a = [(A + 1) - s * (A - 1) * c + 2 * np.sqrt(A) * al,
         2 * s * ((A - 1) - s * (A + 1) * c),
         (A + 1) - s * (A - 1) * c - 2 * np.sqrt(A) * al]
    return lfilter(np.array(b) / a[0], np.array(a) / a[0], x)


def envelope(x, attack_ms, release_ms, block=32):
    """Peak envelope follower (block-based for speed), returned at sample rate."""
    nb = int(np.ceil(len(x) / block))
    pk = np.abs(np.pad(x, (0, nb * block - len(x)))).reshape(nb, block).max(axis=1)
    at = np.exp(-block / (SR * attack_ms / 1000))
    rl = np.exp(-block / (SR * release_ms / 1000))
    env = np.empty(nb)
    e = 0.0
    for k in range(nb):
        c = at if pk[k] > e else rl
        e = c * e + (1 - c) * pk[k]
        env[k] = e
    return np.repeat(env, block)[:len(x)]


def compress(x, thresh_db, ratio, attack_ms, release_ms, detector=None):
    env = envelope(x if detector is None else detector, attack_ms, release_ms)
    lvl = 20 * np.log10(env + 1e-9)
    over = np.maximum(0, lvl - thresh_db)
    return x * 10 ** (-over * (1 - 1 / ratio) / 20)


def amp(x, gain=60.0, tight=110, boost_db=6, level=0.3):
    """Clean DI -> tube-screamer-style boost -> 2 gain stages (4x oversampled) -> 4x12 cab."""
    x = hp(x, tight)
    x = peq(x, 800, boost_db, 0.7)
    up = resample_poly(x, 4, 1)
    y = np.tanh(gain * up + 0.15) - np.tanh(0.15)
    y = hp(y, 40)
    y = np.tanh(2.5 * y)
    y = resample_poly(y, 1, 4)
    y = hp(y, 75)
    y = sosfilt(sos("low", 5200, 8), y)                 # speaker roll-off
    y = peq(y, 110, 3.0, 1.0)                           # cab thump
    y = peq(y, 450, -4.5, 0.9)                          # mid scoop
    y = peq(y, 2600, 3.0, 1.2)                          # presence
    return y * level


def reverb_ir(seconds=1.6, decay=0.45, predelay_ms=15, damp=6000, seed=0):
    r = np.random.default_rng(seed)
    n = int(seconds * SR)
    t = np.arange(n) / SR
    ir = r.standard_normal(n) * np.exp(-t / decay)
    ir = lp(ir, damp)
    ir = np.concatenate([np.zeros(int(predelay_ms / 1000 * SR)), ir])
    return ir / np.sqrt(np.sum(ir ** 2))


IR_L, IR_R = reverb_ir(seed=1), reverb_ir(seed=2)


def reverb(x):
    return fftconvolve(x, IR_L)[:len(x)], fftconvolve(x, IR_R)[:len(x)]


def delay(x, time_s, feedback=0.3, mix=0.25, repeats=5):
    d = int(time_s * SR)
    out = np.zeros_like(x)
    tap = x.copy()
    for k in range(1, repeats + 1):
        tap = lp(tap, 4500)
        out[d * k:] += tap[:len(x) - d * k] * (feedback ** (k - 1))
    return x + mix * out


def pan(x, p):
    """Equal-power pan, p in [-1, 1] -> (L, R)."""
    a = (p + 1) * np.pi / 4
    return x * np.cos(a), x * np.sin(a)


def rms_db(x):
    return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)


# ------------------------------------------------------------------ mix
def render_mix():
    parts, vib, markers, _, total = song.build()
    n = int(total * song.BAR * SEC_PER_EIGHTH * SR)
    N = n + int(TAIL * SR)

    def part(key, notes, **kw):
        print(f"  rendering {key} ({len(notes)} notes)")
        return fit(render_part(key, notes, total, **kw), N)

    stems = {}                                                  # name -> (L, R)
    # rhythm guitars: two humanized takes, each = open + palm-muted DI summed, then amp
    for side, seed, p in (("L", 11, -0.95), ("R", 22, 0.95)):
        op = humanize(parts["gtr_open"], seed, 5.0, 8)
        mu = humanize(parts["gtr_mute"], seed + 1, 5.0, 8)
        di = (part("gtr_open", op) * note_gate(op, N, 25)
              + part("gtr_mute", mu) * note_gate(mu, N, 10))
        g = amp(di, gain=70, tight=120)
        stems[f"gtr_{side}"] = pan(g, p)
    # leads
    for key, p, seed in (("lead1", -0.2, 31), ("lead2", 0.25, 32)):
        ln = humanize(parts[key], seed, 3.0, 5)
        di = part(key, ln, vibrato=vib if key == "lead1" else ()) * note_gate(ln, N, 60)
        g = amp(di, gain=45, tight=250, boost_db=8, level=0.3)
        g = peq(g, 1500, 2.5, 0.8)
        g = delay(g, 1.5 * SEC_PER_EIGHTH, feedback=0.3, mix=0.18)   # dotted-8th delay
        if key == "lead1":                   # lone intro guitar: filtered and quieter, opens up by bar 5
            bar_n = int(song.BAR * SEC_PER_EIGHTH * SR)
            r = np.clip((np.arange(N) - 2 * bar_n) / (2 * bar_n), 0, 1)
            g = (hp(lp(g, 1400, 4), 250) * 0.8 * (1 - r) + g * r) * np.where(np.arange(N) < 4 * bar_n, 0.75, 1)
        stems[key] = pan(g, p)
    # bass: clean low end + distorted mids in parallel
    bn = humanize(parts["bass"], 5, 3.0, 6)
    b = part("bass", bn) * note_gate(bn, N, 20)
    low = lp(b, 250)
    grit = lp(hp(np.tanh(8 * hp(b, 300)), 200), 3500) * 0.35
    bass = compress(low + grit, -20, 4, 5, 80)
    stems["bass"] = pan(bass, 0)
    # strings
    s = part("strings", parts["strings"])
    s = hp(s, 180)
    stems["strings"] = (s * 0.8, np.roll(s, int(0.013 * SR)) * 0.8)
    # drums, rendered per piece
    groups = {"kick": {35, 36}, "snare": {38}, "toms": {41, 43, 45, 47, 48, 50},
              "cymbals": {42, 44, 46, 49, 51, 52, 55, 57}}
    for gname, notes_set in groups.items():
        hits = [x for x in parts["drums"] if x[2] in notes_set]
        d = part("drums", hits)
        if gname == "kick":
            d = d * note_gate(hits, N, release_ms=70, hold_s=0.03, shape=2.0)   # tight metal kick
            d = peq(hp(d, 40), 62, 5, 1.0)
            d = peq(d, 380, -6, 1.2)
            d = peq(d, 4000, 7, 1.0)
            d = compress(d, -18, 4, 2, 60)
            stems["kick"] = pan(d, 0)
        elif gname == "snare":
            d = peq(hp(d, 90), 220, 3, 1.0)
            d = peq(d, 5500, 4, 0.8)
            d = compress(d, -16, 3, 3, 90)
            stems["snare"] = pan(d, 0)
        elif gname == "toms":
            d = peq(hp(d, 60), 3500, 3, 1.0)
            stems["toms"] = pan(d, 0)
        else:
            d = hp(d, 350)
            stems["cymbals"] = (d, np.roll(d, int(0.009 * SR)))

    # ---- auto-level buses against the chorus (bars 33-48)
    a, e = [int(b * song.BAR * SEC_PER_EIGHTH * SR) for b in (32, 48)]
    targets = {"gtr_L": -17, "gtr_R": -17, "lead1": -17.5, "lead2": -20, "bass": -18.5,
               "strings": -27, "kick": -17.5, "snare": -19, "cymbals": -25}
    for k, t in targets.items():
        L, R = stems[k]
        cur = rms_db((L[a:e] + R[a:e]) / 2) if np.any(L[a:e]) else rms_db((L + R) / 2)
        gdb = t - cur
        stems[k] = (L * 10 ** (gdb / 20), R * 10 ** (gdb / 20))
        print(f"  level {k:8s} {cur:6.1f} -> {t} dB")
    # toms: match their peak to the snare's peak
    sp = np.max(np.abs(stems["snare"][0]))
    tp = np.max(np.abs(stems["toms"][0])) + 1e-12
    stems["toms"] = tuple(c * 0.85 * sp / tp for c in stems["toms"])

    # ---- reverb send
    send = sum((stems[k][0] + stems[k][1]) * amt for k, amt in
               (("lead1", 0.35), ("lead2", 0.35), ("snare", 0.25), ("toms", 0.3), ("strings", 0.5),
                ("gtr_L", 0.04), ("gtr_R", 0.04)))
    rl, rr = reverb(send)
    L = sum(v[0] for v in stems.values()) + 0.22 * rl
    R = sum(v[1] for v in stems.values()) + 0.22 * rr

    # ---- master: glue comp, tone, fade, limiter, loudness
    mono = (L + R) / 2
    L = compress(L, -16, 2.5, 20, 150, detector=mono)
    R = compress(R, -16, 2.5, 20, 150, detector=mono)
    L, R = shelf(L, 90, 1.0, high=False), shelf(R, 90, 1.0, high=False)
    L, R = shelf(L, 9000, 1.5), shelf(R, 9000, 1.5)
    L, R = L[:n], R[:n]
    fade = int(1.8 * SR)
    ramp = np.linspace(1, 0, fade) ** 2
    L[-fade:] *= ramp
    R[-fade:] *= ramp
    return np.stack([L, R], axis=1), stems, markers


def limit(x, ceiling_db=-1.0, lookahead_ms=5, release_ms=80):
    c = 10 ** (ceiling_db / 20)
    peak = np.max(np.abs(x), axis=1)
    g = np.minimum(1, c / (peak + 1e-12))
    g = minimum_filter1d(g, size=int(lookahead_ms / 1000 * SR) * 2 + 1)
    a = np.exp(-1 / (SR * release_ms / 1000))
    gs = lfilter([1 - a], [1, -a], g - 1) + 1                 # smooth the release
    gs = np.minimum(gs, g)
    return np.clip(x * gs[:, None], -c, c)


def master(mix, target_lufs=-9.0):
    meter = pyln.Meter(SR)
    for _ in range(3):
        lufs = meter.integrated_loudness(mix)
        mix = mix * 10 ** ((target_lufs - lufs) / 20)
        mix = limit(mix)
    return mix, meter.integrated_loudness(mix)


def to_mp3(audio, path):
    import imageio_ffmpeg

    wav = path.with_suffix(".wav")
    sf.write(wav, audio, SR, subtype="FLOAT")
    subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), "-y", "-loglevel", "error", "-i", str(wav),
                    "-codec:a", "libmp3lame", "-b:a", "320k", str(path)], check=True)
    wav.unlink()


if __name__ == "__main__":
    here = Path(__file__).parent
    mix, stems, markers = render_mix()
    out, lufs = master(mix)
    print(f"  loudness {lufs:.1f} LUFS, peak {20 * np.log10(np.max(np.abs(out))):.2f} dBFS")
    to_mp3(out, here / "last_stand.mp3")
    print(f"wrote {here / 'last_stand.mp3'} ({len(out) / SR:.2f}s)")
