"""ANIMATION 1 - GLITCH MELTDOWN (4.0 s @ 20 fps = 80 frames, seamless loop).

Edit TEXT / timing constants below and run:  python3 glitch_meltdown.py
LEDs are white-only, so "red / cyan" becomes FULL / HALF brightness.
"""
import numpy as np
from lidkit import *   # noqa: F401,F403  (grid helpers, levels, N, M, VALID, build)

TEXT = "SCAR18"        # max 6 chars (hard rule); the space in "SCAR 18" would make 7
SEED = 11

SWEEP = range(1, 20)       # ~1 s   scanline resolves the text
SPLIT = range(20, 40)      # 1-2 s  two jittering copies
TEAR = range(40, 58)       # 2-3 s  slices slide in opposite directions
FLASH = (58, 59)           # exactly 2 full-white frames
REBUILD = range(60, 80)    # 3-4 s  text rebuilds from static, ends == frame 0

rng = np.random.RandomState(SEED)
tm = text_mask(TEXT)
TX = safe_x(tm.shape[1])
TY = 4
clean = place(blank(), tm, TX, TY, FULL)


def noise(density, level_choices=(LOW, HALF, FULL)):
    lit = rng.rand(M, N) < density
    lv = rng.choice(level_choices, size=(M, N))
    return np.where(lit, lv, 0).astype(np.float32)


def sweep(f):
    k = f - SWEEP.start
    bx = int(round(k * (N + 4) / (len(SWEEP) - 1))) - 2        # bar leaves the band at the end
    g = noise(0.06, (DIM, LOW))                                  # sparse dim static ahead of the bar
    cols = np.arange(N)[None, :].repeat(M, 0)
    behind = cols < bx
    p = np.clip((bx - cols) / 9.0, 0, 1)                         # text gets cleaner further behind the bar
    ok = rng.rand(M, N) < p
    resolved = np.where(ok, clean, noise(0.35, (HALF, FULL)))
    g = np.where(behind, resolved, g)
    rect(g, bx - 1, 0, bx, M, HALF)                              # short trail
    rect(g, bx, 0, bx + 2, M, FULL)                              # solid 2-LED scanline
    return g


def split(f):
    grp = (f - SPLIT.start) // 2                                 # hard cut every 2 frames
    r = np.random.RandomState(100 + grp)
    sep = int(r.choice([2, 3]))
    c = int(r.choice([-1, 0, 1]))
    g = blank()
    place(g, tm, TX + c + sep // 2, TY + int(r.choice([0, 0, 1])), HALF)       # half-bright copy
    place(g, tm, TX + c - (sep - sep // 2), TY, FULL, "set")                    # full copy on top
    return g


def tear(f):
    k = f - TEAR.start
    r = np.random.RandomState(500 + f)
    base = blank()
    place(base, tm, TX + 1, TY, HALF)
    place(base, tm, TX - 2, TY, FULL, "set")
    edges = [0, 2, 5, 7, 9, 12, M]
    amp = 2 + k * 0.4
    g = blank()
    for i in range(len(edges) - 1):
        d = 1 if i % 2 == 0 else -1                              # opposite directions
        off = d * int(round(amp * (0.4 + 0.6 * r.rand())))
        g[edges[i]:edges[i + 1]] = np.roll(base[edges[i]:edges[i + 1]], off, axis=1)
        if r.rand() < 0.08:                        # occasional dropped slice
            g[edges[i]:edges[i + 1]] = 0
    return g


def rebuild(f):
    p = np.clip((f - REBUILD.start) / 15.0, 0, 1)
    dens = 0.5 * (1 - p)
    ok = rng.rand(M, N) < p
    return np.where(ok, clean, noise(dens + 0.02 * (p < 1)))


frames = []
for f in range(80):
    if f == 0:
        g = clean.copy()
    elif f in SWEEP:
        g = sweep(f)
    elif f in SPLIT:
        g = split(f)
    elif f in TEAR:
        g = tear(f)
    elif f in FLASH:
        g = blank(FULL)
    else:
        g = rebuild(f)
    frames.append(to_frame(g))

if __name__ == "__main__":
    build("glitch_meltdown", frames)
