"""CLI: preview stills / clips, or render the full 1080p60 MP4 with audio.

    python -m yinyang_fight.main --full                       # output/yin_vs_yang.mp4
    python -m yinyang_fight.main --stills 10,20.5,33 --res 640x360 --out sheet.png
    python -m yinyang_fight.main --clip 13:18 --res 960x540 --out clip.mp4
"""
import argparse
import math
import multiprocessing as mp
import os
import subprocess
import sys
import time

import numpy as np

from . import render
from .config import W, H, FPS, NFRAMES, AUDIO_SR

FFMPEG = None


def ffmpeg_exe():
    global FFMPEG
    if FFMPEG is None:
        import imageio_ffmpeg
        FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
    return FFMPEG


def build(nframes=NFRAMES):
    from .choreography import build_story
    from .sim import Sim
    t0 = time.time()
    story = build_story()
    sim = Sim(story, nframes)
    print(f'[sim] {nframes} frames simulated in {time.time() - t0:.1f}s; story length {sim.S[-1]:.2f}s',
          flush=True)
    return sim


def _encode_range(args):
    f0, f1, w, h, path, crf, preset = args
    cmd = [ffmpeg_exe(), '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'bgra',
           '-s', f'{w}x{h}', '-r', str(FPS), '-i', '-', '-an', '-c:v', 'libx264', '-preset', preset,
           '-crf', str(crf), '-pix_fmt', 'yuv420p', '-threads', '2', '-g', '120',
           '-x264-params', 'keyint=120:min-keyint=120:scenecut=0', path]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for f in range(f0, f1):
        arr = render.render_frame(f, w, h)
        p.stdin.write(np.ascontiguousarray(arr).tobytes())
    p.stdin.close()
    p.wait()
    if p.returncode != 0:
        raise RuntimeError(f'ffmpeg failed for {path}')
    return path


def render_video(sim, out, f0, f1, w, h, workers, crf=17, preset='medium', audio=None, chunk=600):
    render.init(sim)
    tmpdir = out + '.parts'
    os.makedirs(tmpdir, exist_ok=True)
    jobs = []
    for a in range(f0, f1, chunk):
        b = min(f1, a + chunk)
        jobs.append((a, b, w, h, os.path.join(tmpdir, f'seg_{a:06d}.mp4'), crf, preset))
    t0 = time.time()
    ctx = mp.get_context('fork')
    done = 0
    with ctx.Pool(workers) as pool:
        for path in pool.imap(_encode_range, jobs):
            done += 1
            print(f'[render] {done}/{len(jobs)} segments ({time.time() - t0:.0f}s)', flush=True)
    lst = os.path.join(tmpdir, 'list.txt')
    with open(lst, 'w') as fh:
        for j in jobs:
            fh.write(f"file '{os.path.abspath(j[4])}'\n")
    cmd = [ffmpeg_exe(), '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', lst]
    if audio:
        cmd += ['-i', audio, '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '192k']
    cmd += ['-c:v', 'copy', '-movflags', '+faststart', '-r', str(FPS), out]
    subprocess.run(cmd, check=True)
    for j in jobs:
        os.remove(j[4])
    os.remove(lst)
    os.rmdir(tmpdir)
    print(f'[render] wrote {out} in {time.time() - t0:.0f}s', flush=True)


def stills(sim, times, w, h, out, cols=4):
    import cairocffi as cairo
    render.init(sim)
    n = len(times)
    rows = math.ceil(n / cols)
    sheet = cairo.ImageSurface(cairo.FORMAT_RGB24, cols * w, rows * (h + 22))
    ctx = cairo.Context(sheet)
    ctx.set_source_rgb(0.1, 0.1, 0.1)
    ctx.paint()
    for i, tv in enumerate(times):
        f = min(sim.F - 1, int(round(tv * FPS)))
        arr = np.ascontiguousarray(render.render_frame(f, w, h))
        s = cairo.ImageSurface.create_for_data(memoryview(arr.reshape(-1)), cairo.FORMAT_ARGB32, w, h, w * 4)
        x, y = (i % cols) * w, (i // cols) * (h + 22)
        ctx.set_source_surface(s, x, y)
        ctx.paint()
        ctx.set_source_rgb(1, 1, 1)
        ctx.select_font_face('DejaVu Sans')
        ctx.set_font_size(15)
        ctx.move_to(x + 6, y + h + 16)
        ctx.show_text(f'{tv:.2f}s  (story {sim.S[f]:.2f})')
    sheet.write_to_png(out)
    print('wrote', out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--full', action='store_true')
    ap.add_argument('--stills')
    ap.add_argument('--clip')
    ap.add_argument('--res', default=f'{W}x{H}')
    ap.add_argument('--out')
    ap.add_argument('--workers', type=int, default=os.cpu_count() or 4)
    ap.add_argument('--crf', type=int, default=17)
    ap.add_argument('--preset', default='medium')
    ap.add_argument('--cols', type=int, default=4)
    ap.add_argument('--noaudio', action='store_true')
    a = ap.parse_args()
    w, h = map(int, a.res.split('x'))
    sim = build()
    if a.stills:
        times = [float(x) for x in a.stills.split(',')]
        stills(sim, times, w, h, a.out or 'stills.png', a.cols)
    if a.clip:
        s0, s1 = map(float, a.clip.split(':'))
        f0, f1 = int(round(s0 * FPS)), min(NFRAMES, int(round(s1 * FPS)))
        wav = None
        if not a.noaudio:
            from .audio import render_audio
            wav = (a.out or 'clip.mp4') + '.wav'
            render_audio(sim, wav, f0, f1)
        render_video(sim, a.out or 'clip.mp4', f0, f1, w, h, a.workers, a.crf, 'veryfast', wav,
                     chunk=max(30, (f1 - f0) // a.workers + 1))
        if wav:
            os.remove(wav)
    if a.full:
        out = a.out or os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                                    'output', 'yin_vs_yang.mp4')
        os.makedirs(os.path.dirname(out), exist_ok=True)
        from .audio import render_audio
        wav = out + '.wav'
        render_audio(sim, wav, 0, NFRAMES)
        render_video(sim, out, 0, NFRAMES, w, h, a.workers, a.crf, a.preset, wav, chunk=300)
        os.remove(wav)


if __name__ == '__main__':
    main()
