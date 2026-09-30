#!/usr/bin/env python3
"""
Render the music video for NIGHTMARE vs LAST SURVIVOR  (1280x720, 30 fps, 90 s).

A procedural corridor chase: the killer's silhouette closes in on the last survivor while
the whole scene reacts to the actual audio events (kicks, snares, impacts, heartbeats, spectrum).

Usage: python make_video.py <song.wav> <song_meta.npz> <out.mp4>
"""
import os
import sys
import time
import subprocess
from multiprocessing import Pool

import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageChops
from scipy import signal
from scipy.io import wavfile
from scipy.ndimage import gaussian_filter
import imageio_ffmpeg

W, H = 1280, 720
FPS = 30
DUR = 90.0
NF = int(round(DUR * FPS))
BPM = 128.0
BEAT = 60.0 / BPM
BAR = 4 * BEAT
FF = imageio_ffmpeg.get_ffmpeg_exe()
NBANDS = 64

SECTIONS = [("INTRO", 0.0, "the melody box"), ("STARTING", 4 * BAR, "the beat begins"), ("MAJOR", 8 * BAR, "the drop"),
            ("CLIMAX", 24 * BAR, "the chaos stops"), ("FINAL", 28 * BAR, "live or die")]
BOUNDS = [4 * BAR, 8 * BAR, 24 * BAR, 28 * BAR]                # section changes
SEC_COL = [(120, 150, 200), (110, 200, 180), (255, 70, 50), (150, 160, 200), (255, 30, 25)]

FONT_SERIF = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"
FONT_SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"

# palettes: corridor tint, far-glow colour, brightness, lamp colour
PALS = [
    dict(tint=(0.55, 0.68, 0.88), glow=(0.62, 0.74, 0.95), bright=0.62, lamp=(0.75, 0.85, 1.0)),      # INTRO   cold blue
    dict(tint=(0.50, 0.80, 0.72), glow=(0.55, 0.88, 0.78), bright=0.72, lamp=(0.75, 1.0, 0.85)),      # STARTING sick green
    dict(tint=(1.00, 0.33, 0.22), glow=(1.00, 0.52, 0.32), bright=1.00, lamp=(1.0, 0.55, 0.40)),      # MAJOR   red alert
    dict(tint=(0.42, 0.48, 0.62), glow=(0.66, 0.72, 0.90), bright=0.48, lamp=(0.70, 0.78, 1.0)),      # CLIMAX  drained
    dict(tint=(1.00, 0.14, 0.10), glow=(1.00, 0.30, 0.20), bright=1.18, lamp=(1.0, 0.35, 0.25)),      # FINAL   blood
]


def smoothstep(x):
    x = np.clip(x, 0.0, 1.0)
    return x * x * (3 - 2 * x)


def lerp(a, b, w):
    return a + (b - a) * w


# =====================================================================================
#  audio features -> per-frame arrays
# =====================================================================================
def build_features(wav_path, meta_path, out_path):
    sr, x = wavfile.read(wav_path)
    x = x.astype(np.float32)
    m = x.mean(1)
    tf = (np.arange(NF) + 0.5) / FPS

    def env_from_events(times, weights, decay, span=1.5):
        e = np.zeros(NF, np.float32)
        for t0, w in zip(times, weights):
            f0 = int(np.ceil(t0 * FPS - 0.5))
            for f in range(max(f0, 0), min(NF, f0 + int(span * FPS))):
                dt = tf[f] - t0
                if dt >= 0:
                    e[f] = max(e[f], w * np.exp(-dt / decay))
        return e

    meta = np.load(meta_path, allow_pickle=True)
    kicks = meta["kicks"]
    snares = meta["snares"]
    hearts = meta["hearts"]
    impacts = meta["impacts"]
    sizes = meta["impact_sizes"]
    kick_env = env_from_events(kicks[:, 0], np.clip(kicks[:, 1], 0, 1), 0.11)
    snare_env = env_from_events(snares[:, 0], np.clip(snares[:, 1], 0, 1), 0.08)
    heart_env = env_from_events(hearts[:, 0], np.clip(hearts[:, 1], 0, 1), 0.16)
    imp_w = np.array([{"S": 0.6, "M": 0.85, "L": 1.2}[str(s)] for s in sizes])
    imp_env = env_from_events(impacts, imp_w, 0.55, span=3.0)

    # ECG events: heartbeats + every real kick
    ev = [(t, min(g, 1.0)) for t, g in hearts] + [(t, k) for t, k in kicks if k > 0.3]
    ev.sort()
    ecg = np.array(ev, np.float32)

    # RMS + low band + log-band spectrum
    hop = sr / FPS
    rms = np.zeros(NF, np.float32)
    lo = np.zeros(NF, np.float32)
    sos = signal.butter(4, 150, "lowpass", fs=sr, output="sos")
    ml = signal.sosfilt(sos, m)
    nfft = 4096
    win = np.hanning(nfft).astype(np.float32)
    edges = np.geomspace(40, 15000, NBANDS + 1)
    fr = np.fft.rfftfreq(nfft, 1.0 / sr)
    bidx = [(np.searchsorted(fr, edges[i]), max(np.searchsorted(fr, edges[i + 1]), np.searchsorted(fr, edges[i]) + 1)) for i in range(NBANDS)]
    spec = np.zeros((NF, NBANDS), np.float32)
    tilt = 3.0 * np.log2(np.sqrt(edges[:-1] * edges[1:]) / 200.0)          # +3 dB/oct so highs are visible
    pad = np.concatenate([np.zeros(nfft, np.float32), m, np.zeros(nfft, np.float32)])
    for f in range(NF):
        c = int(tf[f] * sr)
        a, b = max(0, c - int(hop)), min(len(m), c + int(hop))
        rms[f] = np.sqrt(np.mean(m[a:b] ** 2)) if b > a else 0
        lo[f] = np.sqrt(np.mean(ml[a:b] ** 2)) if b > a else 0
        seg = pad[c + nfft - nfft // 2: c + nfft + nfft // 2] * win
        mag = np.abs(np.fft.rfft(seg)) / (nfft / 4)
        for i, (i0, i1) in enumerate(bidx):
            spec[f, i] = np.sqrt(np.mean(mag[i0:i1] ** 2))
    db = 20 * np.log10(spec + 1e-7) + tilt[None, :]
    sp = np.clip((db + 78.0) / 48.0, 0.0, 1.0)
    for f in range(1, NF):                                                  # fast attack / slower release
        sp[f] = np.where(sp[f] > sp[f - 1], sp[f], sp[f - 1] * 0.72 + sp[f] * 0.28)
    rms_n = np.clip(rms / max(np.percentile(rms, 98), 1e-6), 0, 1.2)
    lo_n = np.clip(lo / max(np.percentile(lo, 98), 1e-6), 0, 1.2)
    np.savez(out_path, kick=kick_env, snare=snare_env, heart=heart_env, imp=imp_env, rms=rms_n, lo=lo_n, spec=sp.astype(np.float32), ecg=ecg)


# =====================================================================================
#  per-process assets
# =====================================================================================
A = {}
F = {}


def init_worker(feat_path):
    d = np.load(feat_path)
    for k in d.files:
        F[k] = d[k]
    rng = np.random.default_rng(11)
    w, h = W // 2, H // 2
    vpx, vpy = w / 2.0, 170.0
    jj, ii = np.mgrid[0:h, 0:w].astype(np.float32)
    x = (ii - vpx) / 180.0
    y = (jj - vpy) / 180.0
    AX, BY = 0.9, 0.62
    ax = np.abs(x) + 1e-4
    ay = np.abs(y) + 1e-4
    zs = AX / ax
    zf = BY / ay
    wall = zs < zf
    Z = np.minimum(np.minimum(zs, zf), 80.0).astype(np.float32)
    V = np.where(wall, y * Z, x * Z)
    vi = ((np.where(wall, V / (2 * BY), V / (2 * AX)) + 0.5) * 255).astype(np.int32) & 255
    ceiling = (~wall) & (y < 0)
    A.update(Z=Z, vi=vi, wall=wall, ceiling=ceiling, V=V.astype(np.float32),
             fog=(1 - np.exp(-Z * 0.10)).astype(np.float32),
             glow=np.exp(-(x * x + y * y) / 0.035).astype(np.float32),
             fl=np.where(wall, 0.85, 1.0).astype(np.float32))
    n1 = gaussian_filter(rng.standard_normal((256, 256)), 3, mode="wrap")
    n1 = (n1 - n1.min()) / (n1.max() - n1.min())
    n2 = gaussian_filter(rng.standard_normal((256, 256)), 0.9, mode="wrap")
    n2 = (n2 - n2.min()) / (n2.max() - n2.min())
    streak = gaussian_filter(rng.standard_normal((256, 256)), (9, 0.8), mode="wrap")
    streak = (streak - streak.min()) / (streak.max() - streak.min())
    tex = 0.28 + 0.34 * n1 + 0.16 * n2 + 0.30 * streak
    tex[:, ::64] *= 0.45
    tex[::128, :] *= 0.6
    A["tex"] = tex.astype(np.float32)
    # full-res post masks
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    r = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2)
    vig = np.clip(1.15 - 0.62 * r ** 1.6, 0.0, 1.0)
    scan = np.where(yy % 3 == 0, 0.93, 1.0)
    A["mask"] = (vig * scan)[..., None].astype(np.float32)
    A["grain"] = [rng.integers(-14, 15, (H, W, 1), dtype=np.int16) for _ in range(6)]
    # drifting dust
    A["bx"], A["by"] = np.meshgrid(np.arange(w, dtype=np.float32), np.arange(h, dtype=np.float32))
    A["dust"] = rng.random((90, 4))
    A["fonts"] = {}


def font(path, size):
    k = (path, size)
    if k not in A["fonts"]:
        try:
            A["fonts"][k] = ImageFont.truetype(path, size)
        except Exception:
            A["fonts"][k] = ImageFont.load_default()
    return A["fonts"][k]


# =====================================================================================
#  scene helpers
# =====================================================================================
def palette_at(t):
    out = {}
    for key in ("tint", "glow", "lamp"):
        v = np.array(PALS[0][key], np.float32)
        for i, b in enumerate(BOUNDS):
            w = smoothstep((t - b + 0.25) / 0.5)
            v = lerp(v, np.array(PALS[i + 1][key], np.float32), w)
        out[key] = v
    br = PALS[0]["bright"]
    for i, b in enumerate(BOUNDS):
        br = lerp(br, PALS[i + 1]["bright"], smoothstep((t - b + 0.25) / 0.5))
    out["bright"] = br
    return out


def section_index(t):
    idx = 0
    for i, b in enumerate(BOUNDS):
        if t >= b:
            idx = i + 1
    return idx


def killer_z(t):
    """distance of the killer (corridor units); smaller = closer"""
    pts_t = [0, 4 * BAR, 8 * BAR, 24 * BAR, 28 * BAR, 46 * BAR, 48 * BAR]
    pts_z = [9.0, 7.0, 4.6, 1.65, 1.5, 0.78, 0.72]
    return float(np.interp(t, pts_t, pts_z))


def cam_speed(t):
    """corridor scroll speed (units / s)"""
    pts_t = [0, 4 * BAR - 0.01, 4 * BAR, 8 * BAR - 0.01, 8 * BAR, 24 * BAR, 24 * BAR + 0.3, 28 * BAR - 0.01, 28 * BAR, 46 * BAR, 47 * BAR, 48 * BAR]
    pts_s = [0.10, 0.35, 0.6, 1.4, 5.5, 6.5, 0.0, 0.5, 8.5, 9.5, 0.0, 0.0]
    return float(np.interp(t, pts_t, pts_s))


def camera_offset(t):
    """integrate scroll speed -> distance (cached table)"""
    if "camtab" not in A:
        tt = np.linspace(0, DUR, 9001)
        sp = np.array([cam_speed(x) for x in tt])
        A["camtab"] = (tt, np.concatenate([[0], np.cumsum((sp[1:] + sp[:-1]) / 2 * np.diff(tt))]))
    return float(np.interp(t, *A["camtab"]))


def corridor(t, pal, off, flick, kick, imp):
    Z = A["Z"]
    ui = ((Z + off) * 32).astype(np.int32) & 255
    T = A["tex"][A["vi"], ui]
    lamp = 0.28 + 0.72 * np.clip(np.cos(2 * np.pi * (Z + off) / 3.5), 0, 1) ** 3
    lit = T * lamp * A["fl"] * (pal["bright"] * flick)
    col = lit[..., None] * pal["tint"][None, None, :]
    fog = A["fog"][..., None]
    gl = (0.30 + 1.5 * A["glow"] + 0.9 * (kick * 0.5 + imp * 0.6) * A["glow"])[..., None] * pal["glow"][None, None, :] * pal["bright"]
    col = col * (1 - fog) + gl * fog
    strip = A["ceiling"] & (np.abs(A["V"]) < 0.11) & (np.cos(2 * np.pi * (Z + off) / 3.5) > 0.5)
    col = col + strip[..., None] * pal["lamp"][None, None, :] * (1.1 * flick)
    return col


# ------------------------------------------------------------------ silhouettes (limb-based, 2x supersampled)
def circ(c, r, n=16):
    return [(c[0] + r * np.cos(q), c[1] + r * np.sin(q)) for q in np.linspace(0, 2 * np.pi, n, endpoint=False)]


def limb(p0, p1, w0, w1):
    dx, dy = p1[0] - p0[0], p1[1] - p0[1]
    n = np.hypot(dx, dy) + 1e-9
    nx, ny = -dy / n, dx / n
    return [(p0[0] + nx * w0 / 2, p0[1] + ny * w0 / 2), (p1[0] + nx * w1 / 2, p1[1] + ny * w1 / 2),
            (p1[0] - nx * w1 / 2, p1[1] - ny * w1 / 2), (p0[0] - nx * w0 / 2, p0[1] - ny * w0 / 2)]


def chain(pts, widths):
    out = [circ(pts[0], widths[0] / 2)]
    for i in range(len(pts) - 1):
        out.append(limb(pts[i], pts[i + 1], widths[i], widths[i + 1]))
        out.append(circ(pts[i + 1], widths[i + 1] / 2))
    return out


def killer_shapes(ph, hunch):
    sw = np.sin(ph)
    al, ar = np.sin(ph + 1.2), np.sin(ph + 2.6) * 0.7
    P = []
    for s in (-1, 1):
        hip = (0.05 * s, 0.53)
        knee = (0.05 * s + 0.03 * sw * s, 0.28)
        foot = (0.055 * s + 0.10 * sw * s, 0.015)
        P += chain([hip, knee, foot], [0.11, 0.09, 0.07])
    P.append([(-0.135, 0.84), (0.135, 0.84), (0.19, 0.31), (0.17, 0.21), (0.125, 0.27), (0.085, 0.15), (0.04, 0.24), (-0.015, 0.13),
              (-0.075, 0.25), (-0.12, 0.16), (-0.17, 0.27), (-0.19, 0.32)])                                # long tattered coat
    P += [circ((-0.145, 0.835), 0.05), circ((0.145, 0.835), 0.05)]
    P.append([(-0.145, 0.87 + hunch), (0.145, 0.87 + hunch), (0.13, 0.60), (-0.13, 0.60)])
    hy = 0.935 + hunch
    P.append(circ((0, hy), 0.072))
    P.append([(-0.072, hy), (-0.045, hy + 0.075), (0, hy + 0.125), (0.045, hy + 0.075), (0.072, hy)])       # pointed hood
    hl = (-0.215 + 0.04 * al, 0.40)
    P += chain([(-0.145, 0.83), (-0.20 + 0.02 * al, 0.62), hl], [0.075, 0.06, 0.05])
    for k in (-1, 0, 1):                                                                                  # claws
        P.append([(hl[0] + 0.02 * k, hl[1]), (hl[0] + 0.006 * k + 0.012, hl[1] - 0.09), (hl[0] + 0.02 * k + 0.012, hl[1])])
    hr = (0.225 + 0.03 * ar, 0.44)
    P += chain([(0.145, 0.83), (0.205 + 0.02 * ar, 0.62), hr], [0.075, 0.06, 0.05])
    blade = [(hr[0] - 0.014, hr[1] + 0.01), (hr[0] + 0.016, hr[1] + 0.01), (hr[0] + 0.05, hr[1] - 0.16), (hr[0] + 0.135, hr[1] - 0.40),
             (hr[0] + 0.10, hr[1] - 0.425), (hr[0] + 0.03, hr[1] - 0.27)]
    edge = ((hr[0] + 0.035, hr[1] - 0.10), (hr[0] + 0.125, hr[1] - 0.395))
    return P, blade, edge, hy


def survivor_shapes(ph, breathe, arm_up):
    sw = np.sin(ph)
    P = []
    for s in (-1, 1):
        hip = (0.05 * s, 0.53)
        knee = (0.05 * s + 0.02 * sw * s, 0.28)
        foot = (0.055 * s + 0.07 * sw * s, 0.02)
        P += chain([hip, knee, foot], [0.10, 0.08, 0.06])
        P.append(limb((foot[0], 0.03), (foot[0] + 0.03 * s * 0, 0.0), 0.085, 0.09))
    P.append([(-0.13, 0.85 + breathe), (0.13, 0.85 + breathe), (0.115, 0.50), (-0.115, 0.50)])
    P += [circ((-0.135, 0.835 + breathe), 0.04), circ((0.135, 0.835 + breathe), 0.04)]
    P.append(circ((0, 0.885 + breathe), 0.075))                                                            # hood
    P.append(circ((0, 0.935 + breathe), 0.064))                                                            # head
    P += chain([(-0.14, 0.83 + breathe), (-0.185, 0.68), (-0.17, 0.53)], [0.06, 0.05, 0.045])
    e = (0.335, 0.85 + 0.09 * arm_up)
    P += chain([(0.13, 0.83 + breathe), (0.235, 0.80 + 0.05 * arm_up), e], [0.06, 0.05, 0.045])
    tip = (e[0] + 0.06, e[1] + 0.012 + 0.02 * arm_up)
    P.append(limb(e, tip, 0.05, 0.06))
    pack = [(-0.085, 0.80), (0.085, 0.80), (0.09, 0.56), (-0.09, 0.56)]
    return P, pack, tip


def _actor_canvas(cx, feet, hpx, left=0.5, right=0.65, top=1.2, bottom=0.05, SS=2):
    x0, x1 = int(cx - left * hpx), int(cx + right * hpx)
    y0, y1 = int(feet - top * hpx), int(feet + bottom * hpx)
    bw, bh = max(x1 - x0, 4), max(y1 - y0, 4)
    layer = Image.new("RGBA", (bw * SS, bh * SS), (0, 0, 0, 0))

    def T(poly, dx=0.0):
        return [((cx - x0 + lx * hpx + dx) * SS, (feet - y0 - ly * hpx) * SS) for lx, ly in poly]

    return layer, (x0, y0, bw, bh), T, SS


def draw_killer(ov, cx, feet, hpx, ph, eyes, glint, rim):
    P, blade, edge, hy = killer_shapes(ph, 0.012 * np.sin(ph * 0.5))
    layer, (x0, y0, bw, bh), T, SS = _actor_canvas(cx, feet, hpx)
    d = ImageDraw.Draw(layer)
    for poly in P + [blade]:
        d.polygon(T(poly, 0.012 * hpx), fill=rim)
    for poly in P + [blade]:
        d.polygon(T(poly), fill=(7, 6, 9, 255))
    if glint > 0.02:
        d.line(T(list(edge)), fill=(255, 235, 220, int(255 * min(glint, 1.0))), width=max(2, int(hpx * 0.010 * SS)))
    if eyes > 0.02:
        for ex in (-0.026, 0.026):
            px, py = (cx - x0 + ex * hpx) * SS, (feet - y0 - (hy + 0.005) * hpx) * SS
            r = max(1.5, 0.010 * hpx) * SS
            for rr, al_ in ((r * 3.4, 55), (r * 1.9, 120), (r, 255)):
                d.ellipse((px - rr, py - rr * 0.6, px + rr, py + rr * 0.6), fill=(255, 25, 10, int(al_ * eyes)))
    layer = layer.resize((bw, bh), Image.BOX)
    ov.paste(layer, (x0, y0), layer)


def draw_survivor(ov, cx, feet, hpx, ph, breathe, arm_up, rim):
    P, pack, tip = survivor_shapes(ph, breathe, arm_up)
    layer, (x0, y0, bw, bh), T, SS = _actor_canvas(cx, feet, hpx, left=0.45, right=0.62)
    d = ImageDraw.Draw(layer)
    for poly in P:
        d.polygon(T(poly, 0.012 * hpx), fill=rim)
    for poly in P:
        d.polygon(T(poly), fill=(10, 9, 13, 255))
    d.polygon(T(pack), fill=(22, 19, 27, 255))
    layer = layer.resize((bw, bh), Image.BOX)
    ov.paste(layer, (x0, y0), layer)
    return cx + tip[0] * hpx, feet - tip[1] * hpx


def draw_text_c(dr, cx, cy, text, fnt, fill, spacing=0):
    widths = [dr.textlength(ch, font=fnt) for ch in text]
    total = sum(widths) + spacing * (len(text) - 1)
    x = cx - total / 2
    asc, desc = fnt.getmetrics()
    y = cy - (asc + desc) / 2
    for ch, wd in zip(text, widths):
        dr.text((x, y), ch, font=fnt, fill=fill)
        x += wd + spacing


# =====================================================================================
#  the frame
# =====================================================================================
def render_frame(fi):
    t = (fi + 0.5) / FPS
    rs = np.random.default_rng(1000 + fi)
    k = float(F["kick"][fi])
    sn = float(F["snare"][fi])
    imp = float(F["imp"][fi])
    hb = float(F["heart"][fi])
    rms = float(F["rms"][fi])
    lo = float(F["lo"][fi])
    sec = section_index(t)
    pal = palette_at(t)
    hot = 1.0 if sec in (2, 4) else 0.0                       # Major / Final
    endp = smoothstep((t - 46 * BAR) / 0.06)                  # final stinger impact

    # ---- flicker: dying lights early on, strobing later
    flick = 1.0
    if sec in (0, 1, 3):
        flick = 0.82 + 0.18 * np.sin(t * 17.0) * np.sin(t * 5.3)
        if rs.random() < (0.05 if sec != 3 else 0.09):
            flick *= 0.25
    else:
        flick = 0.78 + 0.5 * k + 0.35 * sn
    if t > 46 * BAR:
        flick *= 1.0 - 0.72 * smoothstep((t - 46 * BAR - 0.15) / 0.5)
    flick = float(flick)

    off = camera_offset(t)
    col = corridor(t, pal, off, flick, k * hot, imp)

    # ---- geometry of the actors
    zk = killer_z(t) * (1 - 0.04 * imp - 0.03 * k * hot)
    hk = 1.18 * 360.0 / zk
    feet_k = 340.0 + 0.62 * 360.0 / zk
    kx = 640.0 + (0.16 + 0.05 * np.sin(t * 0.7)) * 360.0 / zk
    step_hz = {0: 1 / (2 * BEAT), 1: 1 / (2 * BEAT), 2: 1 / BEAT, 3: 0.0, 4: 1 / BEAT}[sec]
    if t > 46 * BAR:
        step_hz = 0.0
    kphase = 2 * np.pi * step_hz * t
    bob = abs(np.sin(kphase)) * 0.012 * hk * (1 if step_hz else 0)
    eyes = float(np.clip((7.5 - zk) / 4.0, 0, 1)) * (0.6 + 0.4 * hot * (0.6 + k))
    if t > 46 * BAR:
        eyes = 1.0

    # survivor (over-the-shoulder, foreground left)
    s_hz = {0: 0.0, 1: 1 / (2 * BEAT), 2: 1 / BEAT, 3: 0.0, 4: 0.0}[sec]
    sphase = 2 * np.pi * s_hz * t
    crouch = smoothstep((t - 24 * BAR) / 0.5) * (1 - smoothstep((t - 28 * BAR + 0.6) / 0.6))
    sh = 450.0 * (1 - 0.13 * crouch)
    sx = 300.0 + 8 * np.sin(sphase) * (1 if s_hz else 0) + rs.normal(0, 0.9 + 1.6 * hb + (2.5 if sec == 0 else 0))
    sfeet = 752.0 - abs(np.sin(sphase)) * (14 if sec == 2 else 5) * (1 if s_hz else 0)
    if sec == 2:
        sx += 10 * np.sin(sphase * 0.5)
    breathe = 0.004 * np.sin(t * 2.4) + 0.006 * hb
    arm_up = 0.35 + 0.5 * smoothstep((t - 28 * BAR) / 1.5) - 0.25 * (sec == 2)
    tipx = sx + 0.395 * sh
    tipy = sfeet - (0.862 + 0.09 * arm_up + 0.012 + 0.02 * arm_up) * sh

    # ---- flashlight beam: analytic cone that dies out around the killer (added at half-res)
    beam_on = 1.0
    if sec == 0:
        beam_on = 0.55 + 0.45 * (rs.random() > 0.08)
    if sec == 3:
        beam_on = 0.6 + 0.4 * (rs.random() > 0.2)
    if t > 46 * BAR:
        beam_on = 1.0 - smoothstep((t - 46 * BAR - 0.03) / 0.10)
    tgt = (kx, feet_k - 0.62 * hk)
    ang = np.arctan2(tgt[1] - tipy, tgt[0] - tipx)
    length = float(np.hypot(tgt[0] - tipx, tgt[1] - tipy)) * 1.25 + 60
    dx_, dy_ = A["bx"] - tipx / 2, A["by"] - tipy / 2
    ca, sa = np.cos(ang), np.sin(ang)
    u = dx_ * ca + dy_ * sa
    v = -dx_ * sa + dy_ * ca
    uu = np.maximum(u, 0)
    wdt = (0.10 + 0.04 * (sec == 4)) * uu + 3.0
    inten = np.exp(-1.3 * (v / wdt) ** 2) * np.exp(-uu / (length / 2.0)) * (u > 0) / (1 + uu / 40.0)
    bcol = np.array([1.0, 0.95, 0.82], np.float32)
    col = col + (inten * (1.35 * beam_on * (0.85 + 0.2 * hb)))[..., None] * bcol[None, None, :]

    img = Image.fromarray(np.clip(col * 255, 0, 255).astype(np.uint8)).resize((W, H), Image.BILINEAR)

    # ---- dust motes
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dr = ImageDraw.Draw(ov, "RGBA")
    for i, (a, b, c, d) in enumerate(A["dust"][: 60 + 30 * (sec in (2, 4))]):
        px = (a * W + t * (8 + 40 * c) * (1 + 3 * hot)) % W
        py = (b * H + np.sin(t * (0.4 + c) + d * 6) * 30 - t * 6 * c) % H
        al = int(40 + 70 * c * (0.4 + 0.6 * rms))
        dr.ellipse((px, py, px + 1.5 + 2 * c, py + 1.5 + 2 * c), fill=(220, 210, 200, al))
    img.paste(ov, (0, 0), ov)

    # ---- actors
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    rimc = tuple(int(c * 255) for c in pal["glow"]) + (150,)
    glint = max(sn * 1.4, imp) * (1 if sec in (2, 4) else 0.0)
    draw_killer(ov, kx, feet_k - bob, hk, kphase, eyes, glint, rimc)
    draw_survivor(ov, sx, sfeet, sh, sphase, breathe, arm_up, rimc)
    dr = ImageDraw.Draw(ov, "RGBA")
    if beam_on > 0.05:                                                        # flashlight lens glow
        for rr, al in ((16, 50), (9, 110), (4, 230)):
            dr.ellipse((tipx - rr, tipy - rr, tipx + rr, tipy + rr), fill=(255, 245, 215, int(al * beam_on)))
    img.paste(ov, (0, 0), ov)

    arr = np.asarray(img).astype(np.float32)

    # ---- teeth spectrum along the bottom (in front of the survivor's feet)
    spec = F["spec"][fi]
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dr = ImageDraw.Draw(ov, "RGBA")
    gain = 0.55 + 0.75 * (0.25 * sec / 4 + 0.75 * rms)
    bw = W / NBANDS
    edge = (255, 90, 70, 235) if hot else (190, 200, 230, 210)
    fillc = (95, 8, 14, 230) if hot else (20, 24, 34, 225)
    for i in range(NBANDS):
        h = 10 + spec[i] * 135 * gain
        x0 = i * bw
        dr.polygon([(x0, H - 6), (x0 + bw * 0.5, H - 6 - h), (x0 + bw, H - 6)], fill=fillc, outline=edge)
    for i in range(0, NBANDS, 2):
        h = 6 + spec[i] * 70 * gain * (0.5 + 0.5 * hot)
        x0 = i * bw
        dr.polygon([(x0, 0), (x0 + bw, h), (x0 + 2 * bw, 0)], fill=(fillc[0], fillc[1], fillc[2], 170))
    img2 = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    img2.paste(ov, (0, 0), ov)
    arr = np.asarray(img2).astype(np.float32)

    # ---- grade / post: red strobe, flash, chromatic split, vignette, grain
    arr[..., 0] += hot * (k * 42 + sn * 18) + imp * 60
    arr[..., 1:] += imp * 45
    if t > 46 * BAR:
        arr += 210 * (1 - smoothstep((t - 46 * BAR) / 0.22)) * (t < 46 * BAR + 0.4)
    arr *= A["mask"] * (1.0 + 0.10 * hb)
    arr += A["grain"][fi % 6] * (0.30 if sec in (0, 1, 3) else 0.18)
    arr = np.clip(arr, 0, 255).astype(np.uint8)
    d = int(round(2 + 9 * imp + 3 * sn * hot)) if (imp > 0.15 or (hot and sn > 0.4)) else 0
    if d:
        arr[..., 0] = np.roll(arr[..., 0], d, axis=1)
        arr[..., 2] = np.roll(arr[..., 2], -d, axis=1)
    shake = (2.5 * k + 9 * imp) * hot + (1.2 * hb if sec in (0, 1, 3) else 0)
    if shake > 0.4:
        dx, dy = int(rs.normal(0, shake)), int(rs.normal(0, shake * 0.7))
        arr = np.roll(np.roll(arr, dx, axis=1), dy, axis=0)

    img = Image.fromarray(arr)

    # ---- HUD: ECG trace, section label, timecode, progress bar, title cards
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dr = ImageDraw.Draw(ov, "RGBA")
    ecg = F["ecg"]
    speed = 300.0
    xs = np.arange(W, dtype=np.float32)
    tx_ = t - (W - 1 - xs) / speed
    sel = ecg[(ecg[:, 0] > t - (W / speed) - 0.5) & (ecg[:, 0] < t + 0.1)]
    yv = np.zeros(W, np.float32)
    for te, g in sel:
        dt = tx_ - te
        shape = (0.10 * np.exp(-((dt + 0.16) / 0.035) ** 2) - 0.13 * np.exp(-((dt + 0.03) / 0.010) ** 2) + 1.0 * np.exp(-(dt / 0.014) ** 2)
                 - 0.28 * np.exp(-((dt - 0.03) / 0.012) ** 2) + 0.22 * np.exp(-((dt - 0.22) / 0.05) ** 2))
        yv += shape * (0.55 + 0.6 * g)
    base = 112.0
    ampl = 40.0 * (0.7 + 0.3 * sec / 4)
    yv = base - yv * ampl + rs.normal(0, 0.5, W)
    pts = list(zip(xs.tolist(), yv.tolist()))
    ec = (255, 70, 60) if sec >= 2 else (120, 255, 170)
    dr.line(pts, fill=ec + (60,), width=9)
    dr.line(pts, fill=ec + (235,), width=2)
    dr.ellipse((W - 7, yv[-1] - 4, W + 1, yv[-1] + 4), fill=(255, 255, 255, 255))

    # section label + timecode
    name = SECTIONS[sec][0]
    dr.text((28, 20), name, font=font(FONT_SANS, 30), fill=SEC_COL[sec] + (240,))
    dr.text((30, 58), "%02d:%02d / 01:30" % (int(t) // 60, int(t) % 60), font=font(FONT_MONO, 17), fill=(220, 220, 225, 170))
    dr.text((W - 268, 24), "128 BPM  ·  D MINOR", font=font(FONT_MONO, 17), fill=(220, 220, 225, 150))

    # progress bar with the five parts
    starts = [0, 4 * BAR, 8 * BAR, 24 * BAR, 28 * BAR, 48 * BAR]
    for i in range(5):
        x0, x1 = starts[i] / DUR * W, starts[i + 1] / DUR * W
        c = SEC_COL[i]
        dr.rectangle((x0 + 1, H - 5, x1 - 1, H - 1), fill=c + (70,))
        xe = min(x1 - 1, t / DUR * W)
        if t > starts[i] and xe > x0 + 1:
            dr.rectangle((x0 + 1, H - 5, xe, H - 1), fill=c + (255,))

    # title card at the very start
    if t < 6.4:
        a = smoothstep((t - 0.3) / 0.8) * (1 - smoothstep((t - 5.0) / 1.2))
        if a > 0.01:
            draw_text_c(dr, W / 2, 262, "NIGHTMARE", font(FONT_SERIF, 118), (235, 235, 240, int(235 * a)), spacing=14)
            draw_text_c(dr, W / 2, 352, "VS  THE LAST SURVIVOR", font(FONT_SERIF, 38), (200, 60, 55, int(235 * a)), spacing=8)

    # section cards
    for i, (nm, ts, sub) in enumerate(SECTIONS):
        if i == 0:
            continue
        age = t - ts
        if 0 <= age < 2.6:
            a = smoothstep(age / 0.12) * (1 - smoothstep((age - 1.9) / 0.7))
            gl = max(0.0, 1 - age / 0.35)
            fnt = font(FONT_SERIF, 132 if nm != "STARTING" else 112)
            cy = 300
            if gl > 0:
                draw_text_c(dr, W / 2 + 16 * gl, cy, nm, fnt, (255, 0, 40, int(140 * a)), spacing=10)
                draw_text_c(dr, W / 2 - 16 * gl, cy, nm, fnt, (0, 220, 255, int(110 * a)), spacing=10)
            draw_text_c(dr, W / 2, cy, nm, fnt, (240, 240, 245, int(245 * a)), spacing=10)
            draw_text_c(dr, W / 2, cy + 92, sub.upper(), font(FONT_SANS, 30), SEC_COL[i] + (int(235 * a),), spacing=10)

    # ending: LIVE OR DIE
    if t > 46 * BAR + 0.6:
        a = smoothstep((t - 46 * BAR - 0.6) / 0.6) * (0.75 + 0.25 * (rs.random() > 0.12))
        draw_text_c(dr, W / 2, 330, "LIVE  OR  DIE", font(FONT_SERIF, 92), (235, 30, 30, int(235 * a)), spacing=12)
    img.paste(ov, (0, 0), ov)

    fade = 1.0 - smoothstep((t - 88.7) / 1.3)
    if t < 0.5:
        fade = min(fade, smoothstep(t / 0.5))
    out = np.asarray(img)
    if fade < 0.999:
        out = (out.astype(np.float32) * fade).astype(np.uint8)
    return out


# =====================================================================================
#  driver
# =====================================================================================
def render_segment(args):
    idx, f0, f1, path = args
    cmd = [FF, "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
           "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "24", "-maxrate", "5M", "-bufsize", "10M",
           "-x264-params", "aq-mode=3", "-pix_fmt", "yuv420p", "-g", "30", "-bf", "2", path]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for f in range(f0, f1):
        p.stdin.write(render_frame(f).tobytes())
    p.stdin.close()
    p.wait()
    return idx


def main(wav, meta, out):
    t0 = time.time()
    work = os.path.join(os.path.dirname(os.path.abspath(out)), "_vidwork")
    os.makedirs(work, exist_ok=True)
    feat = os.path.join(work, "feat.npz")
    print("features...", flush=True)
    build_features(wav, meta, feat)
    print(f"  done {time.time() - t0:.1f}s", flush=True)
    seg = 90
    jobs = [(i, f0, min(f0 + seg, NF), os.path.join(work, f"seg_{i:03d}.mp4")) for i, f0 in enumerate(range(0, NF, seg))]
    with Pool(os.cpu_count(), initializer=init_worker, initargs=(feat,)) as pool:
        for n, _ in enumerate(pool.imap_unordered(render_segment, jobs)):
            print(f"  segment {n + 1}/{len(jobs)}  ({time.time() - t0:.0f}s)", flush=True)
    lst = os.path.join(work, "list.txt")
    with open(lst, "w") as fh:
        for j in jobs:
            fh.write(f"file '{j[3]}'\n")
    silent = os.path.join(work, "silent.mp4")
    subprocess.check_call([FF, "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", silent])
    subprocess.check_call([FF, "-y", "-loglevel", "error", "-i", silent, "-i", wav, "-map", "0:v", "-map", "1:a", "-c:v", "copy",
                           "-c:a", "aac", "-b:a", "320k", "-ar", "44100", "-movflags", "+faststart", "-shortest", out])
    print(f"wrote {out}  ({time.time() - t0:.0f}s)", flush=True)


if __name__ == "__main__":
    if len(sys.argv) >= 5 and sys.argv[1] == "--frames":
        # debug: render selected frames to PNG   --frames <wav> <meta> <outdir> <t1> <t2> ...
        wav, meta, outdir = sys.argv[2], sys.argv[3], sys.argv[4]
        os.makedirs(outdir, exist_ok=True)
        feat = os.path.join(outdir, "feat.npz")
        if not os.path.exists(feat):
            build_features(wav, meta, feat)
        init_worker(feat)
        for ts in sys.argv[5:]:
            fi = int(float(ts) * FPS)
            Image.fromarray(render_frame(fi)).save(os.path.join(outdir, f"f_{float(ts):05.1f}.png"))
        print("frames done")
    else:
        main(sys.argv[1], sys.argv[2], sys.argv[3])
