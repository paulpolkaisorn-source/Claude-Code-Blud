"""Render the ASCII video.  usage:
  python3 build.py sheet            # PNG contact sheet (3 frames/scene) -> work/sheet_NN_k.png
  python3 build.py scene N          # render one scene mp4 -> work/scene_NN.mp4
  python3 build.py all              # render all scenes (parallel), audio, mux -> out/ascii_art_explainer.mp4
"""
import importlib, os, subprocess, sys
from multiprocessing import Pool
import numpy as np
from PIL import Image
import engine as E

HERE = os.path.dirname(os.path.abspath(__file__))
WORK, OUT = os.path.join(HERE, "work"), os.path.join(HERE, "out")
sys.path.insert(0, os.path.join(HERE, "scenes"))
N_SCENES, TRANS = 8, 0.35   # transition: cell-dissolve in first 0.35 s of scenes 2..8

def load(n):
    return importlib.import_module(f"scene_{n:02d}")

def frame_grid(n, t, prev_last=None):
    m = load(n)
    g = E.Grid()
    m.render(g, t)
    if prev_last is not None and t < TRANS:
        keep_prev = E.hash2(*np.meshgrid(np.arange(E.COLS), np.arange(E.ROWS))) > (t / TRANS)
        g.ch[keep_prev], g.fg[keep_prev], g.bg[keep_prev] = prev_last.ch[keep_prev], prev_last.fg[keep_prev], prev_last.bg[keep_prev]
    return g

def last_grid(n):
    m = load(n)
    g = E.Grid(); m.render(g, m.DURATION - 1.0 / E.FPS)
    return g

def render_scene(n):
    m = load(n)
    nf = round(m.DURATION * E.FPS)
    prev = last_grid(n - 1) if n > 1 else None
    path = os.path.join(WORK, f"scene_{n:02d}.mp4")
    p = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
                          "-s", f"{E.W}x{E.H}", "-r", str(E.FPS), "-i", "-", "-c:v", "libx264",
                          "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p", path], stdin=subprocess.PIPE)
    for i in range(nf):
        p.stdin.write(frame_grid(n, i / E.FPS, prev).to_rgb().tobytes())
    p.stdin.close(); p.wait()
    return path

def sheet():
    for n in range(1, N_SCENES + 1):
        m = load(n)
        prev = last_grid(n - 1) if n > 1 else None
        for k, f in enumerate((0.1, 0.5, 0.92)):
            t = m.DURATION * f
            Image.fromarray(frame_grid(n, t, prev).to_rgb()).save(os.path.join(WORK, f"sheet_{n:02d}_{k}.png"))

def build_all():
    with Pool(4) as pool:
        segs = pool.map(render_scene, range(1, N_SCENES + 1))
    lst = os.path.join(WORK, "list.txt")
    open(lst, "w").write("".join(f"file '{s}'\n" for s in segs))
    video = os.path.join(WORK, "video.mp4")
    subprocess.check_call(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", video])
    import audio
    wav = audio.make(os.path.join(WORK, "audio.wav"))
    subprocess.check_call(["ffmpeg", "-y", "-loglevel", "error", "-i", video, "-i", wav, "-c:v", "copy",
                           "-c:a", "aac", "-b:a", "192k", "-shortest", os.path.join(OUT, "ascii_art_explainer.mp4")])

if __name__ == "__main__":
    os.makedirs(WORK, exist_ok=True); os.makedirs(OUT, exist_ok=True)
    cmd = sys.argv[1]
    if cmd == "sheet": sheet()
    elif cmd == "scene": print(render_scene(int(sys.argv[2])))
    else: build_all()
