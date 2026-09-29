"""Build the scene, render frames in parallel, encode to mp4, synthesize + mux audio."""
import json
import multiprocessing as mp
import os
import subprocess
import sys
import time

import cairo
import imageio_ffmpeg

from scene import Scene
from styles import STYLES
import script
from compose import render_frame
from env import W, H

FF = imageio_ffmpeg.get_ffmpeg_exe()
SC = None
OUT_DIR = None
TOTAL = 120.0


def make_scene(total=TOTAL):
    sc = Scene(STYLES)
    script.build(sc)
    script.cameras(sc)
    script.finish(sc, total)
    sc.build(total)
    return sc


def export_audio_inputs(sc, d, total=TOTAL):
    wp = sc.warp
    ev = []
    for e in sc.events:
        d_ = dict(t=round(wp.video_time(e['w']), 4), kind=e['kind'], amp=e['amp'], x=e['x'])
        if 'dur' in e:
            d_['dur'] = e['dur']
        ev.append(d_)
    ev.sort(key=lambda q: q['t'])
    A = sc.aux
    V = wp.video_time
    secs = [
        dict(t0=0, t1=V(9.0), name='intro', intensity=0.3),
        dict(t0=V(9.0), t1=V(12.9), name='standoff', intensity=0.5),
        dict(t0=V(12.9), t1=V(A['t_act1_end']), name='act1', intensity=0.7),
        dict(t0=V(A['t_act1_end']), t1=V(A['t_act2']), name='standoff', intensity=0.6),
        dict(t0=V(A['t_act2']), t1=V(A['t_weapons']), name='act2', intensity=0.85),
        dict(t0=V(A['t_weapons']), t1=V(A['t_charge']), name='act3', intensity=1.0),
        dict(t0=V(A['t_charge']), t1=V(A['t_finale']) - 0.3, name='silence', intensity=0.3),
        dict(t0=V(A['t_finale']) - 0.3, t1=V(A['t_finale_white']) + 0.1, name='finale', intensity=1.0),
        dict(t0=V(A['t_finale_white']) + 0.1, t1=V(A['t_finale_white']) + 3.0, name='whiteout', intensity=0.4),
        dict(t0=V(A['t_finale_white']) + 3.0, t1=total, name='ending', intensity=0.4),
    ]
    json.dump(ev, open(os.path.join(d, 'events.json'), 'w'), indent=1)
    json.dump(secs, open(os.path.join(d, 'sections.json'), 'w'), indent=1)
    return ev, secs


def _chunk(args):
    idx, f0, f1 = args
    path = os.path.join(OUT_DIR, 'chunk_%03d.mp4' % idx)
    cmd = [FF, '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'bgra', '-s', '%dx%d' % (W, H), '-r', '60',
           '-i', '-', '-an', '-c:v', 'libx264', '-preset', 'medium', '-tune', 'animation', '-crf', '20', '-maxrate', '10M',
           '-bufsize', '20M', '-pix_fmt', 'yuv420p', '-g', '60', '-keyint_min', '60', '-sc_threshold', '0', '-threads', '2',
           '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', path]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    surf = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H)
    for i in range(f0, f1):
        render_frame(SC, i, surf)
        p.stdin.write(surf.get_data())
    p.stdin.close()
    p.wait()
    return idx, path


def render_video(sc, out_dir, f0=0, f1=None, chunk=240, workers=4, log=print):
    global SC, OUT_DIR
    SC, OUT_DIR = sc, out_dir
    os.makedirs(out_dir, exist_ok=True)
    f1 = sc.nframes if f1 is None else f1
    jobs = []
    idx = 0
    for a in range(f0, f1, chunk):
        jobs.append((idx, a, min(f1, a + chunk)))
        idx += 1
    t0 = time.time()
    done = 0
    paths = {}
    ctx = mp.get_context('fork')
    with ctx.Pool(workers) as pool:
        for idx, path in pool.imap_unordered(_chunk, jobs):
            done += 1
            paths[idx] = path
            el = time.time() - t0
            log('chunk %d/%d done  elapsed %.0fs  eta %.0fs' % (done, len(jobs), el, el / done * (len(jobs) - done)))
    lst = os.path.join(out_dir, 'list.txt')
    with open(lst, 'w') as f:
        for k in sorted(paths):
            f.write("file '%s'\n" % os.path.abspath(paths[k]))
    return lst


def mux(list_file, audio, out_path, log=print):
    cmd = [FF, '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list_file]
    if audio:
        cmd += ['-i', audio, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest']
    else:
        cmd += ['-c:v', 'copy']
    cmd += ['-movflags', '+faststart', out_path]
    subprocess.check_call(cmd)
    log('wrote ' + out_path)


if __name__ == '__main__':
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default='/home/user/Claude-Code-Blud/yin_yang_fight.mp4')
    ap.add_argument('--work', default='/tmp/claude-0/-home-user-Claude-Code-Blud/60ca8b32-3211-5b8d-b610-9607a068dc32/scratchpad/render')
    ap.add_argument('--t0', type=float, default=0.0)
    ap.add_argument('--t1', type=float, default=None)
    ap.add_argument('--noaudio', action='store_true')
    ap.add_argument('--audio-only', action='store_true')
    a = ap.parse_args()
    sc = make_scene()
    os.makedirs(a.work, exist_ok=True)
    ev, secs = export_audio_inputs(sc, a.work)
    print('events', len(ev), flush=True)
    wav = os.path.join(a.work, 'audio.wav')
    if not a.noaudio:
        subprocess.check_call([sys.executable, os.path.join(os.path.dirname(__file__), 'audio.py'), '--events',
                               os.path.join(a.work, 'events.json'), '--sections', os.path.join(a.work, 'sections.json'),
                               '--out', wav, '--dur', str(TOTAL)])
    if a.audio_only:
        sys.exit(0)
    f0 = int(a.t0 * 60)
    f1 = None if a.t1 is None else int(a.t1 * 60)
    lst = render_video(sc, os.path.join(a.work, 'chunks'), f0, f1, log=lambda s: print(s, flush=True))
    mux(lst, None if a.noaudio or a.t0 > 0 or a.t1 else wav, a.out)
