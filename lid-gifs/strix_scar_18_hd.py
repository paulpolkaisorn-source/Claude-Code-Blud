"""STRIX -> SCAR -> 18, drawn natively on the lid's LED grid.

Instead of drawing text in a rotated ribbon (which lands between LEDs and leaves
half-lit grey edges), every frame here is a value per LED on the hex-packed LED
grid, and each LED's whole cell is painted with that one value. The font is a
bold italic pixel font whose slant follows the hex grid's 60 deg axis, so every
stroke sits exactly on LEDs: no zig-zag, no grey fringe.

    python lid-gifs/strix_scar_18_hd.py [--out lid-gifs/strix_scar_18_hd.gif] [--sheet-frames 24]
"""
import argparse
import glob
import math
import os
import sys

import numpy as np
from PIL import Image


def _find_skill_scripts():
    env = os.environ.get("SCAR18_SKILL")
    cands = [env] if env else []
    cands += glob.glob(os.path.expanduser("~/.claude/skills/**/scar18-lid-gif/scripts"), recursive=True)
    for c in cands:
        if c and os.path.isdir(os.path.join(c, "lidgif")):
            return c
    raise SystemExit("scar18-lid-gif skill not found; set SCAR18_SKILL to its scripts folder")


sys.path.insert(0, _find_skill_scripts())
from lidgif.core import Stripe, save_gif  # noqa: E402
from lidgif.preview import led_points, make_preview  # noqa: E402
from validate import validate  # noqa: E402

FPS = 20
SEG = 2.0                        # seconds per word
N = int(FPS * SEG)               # frames per word
STRIX_SHIFT = -2.5               # LEDs toward the top-left end, so the X clears the pointed tip

# --------------------------------------------------------------------------- font
# Bold pixel font, 2-LED stems. Drawn upright here; it is slanted onto the hex
# grid's 60 deg axis when stamped (half an LED to the right per row going up).
WORD_FONT = {  # 6 x 9
    "S": [" #####", "######", "##    ", "##    ", "######", "    ##", "    ##", "######", "##### "],
    "T": ["######", "######", "  ##  ", "  ##  ", "  ##  ", "  ##  ", "  ##  ", "  ##  ", "  ##  "],
    "R": ["##### ", "######", "##  ##", "##  ##", "##### ", "##  ##", "##  ##", "##  ##", "##  ##"],
    "I": ["######", "######", "  ##  ", "  ##  ", "  ##  ", "  ##  ", "  ##  ", "######", "######"],
    "X": ["##  ##", "##  ##", " #### ", "  ##  ", "  ##  ", "  ##  ", " #### ", "##  ##", "##  ##"],
    "C": [" #####", "######", "##    ", "##    ", "##    ", "##    ", "##    ", "######", " #####"],
    "A": [" #### ", "######", "##  ##", "##  ##", "######", "##  ##", "##  ##", "##  ##", "##  ##"],
    "5": ["######", "######", "##    ", "##    ", "##### ", "    ##", "    ##", "######", "##### "],
    "4": ["##  ##", "##  ##", "##  ##", "##  ##", "######", "    ##", "    ##", "    ##", "    ##"],
}
HERO_FONT = {  # 12 rows, for the 18
    "1": ["  ##", " ###", "####", "  ##", "  ##", "  ##", "  ##", "  ##", "  ##", "  ##", "  ##", "  ##"],
    "8": [" ##### ", "#######", "##   ##", "##   ##", "##   ##", " ##### ", "#######", "##   ##", "##   ##",
          "##   ##", "#######", " ##### "],
}


# --------------------------------------------------------------------------- LED grid
class Grid:
    def __init__(self, stripe):
        s = self.s = stripe
        p = self.p = s.pitch
        rh = self.rh = p * math.sqrt(3) / 2
        pts = led_points(s)
        rows = [int(round((y - rh / 2) / rh)) for _, y in pts]
        cols = [int(round((x - p / 2 - (p / 2) * (r % 2)) / p)) for (x, _), r in zip(pts, rows)]
        self.NR, self.NC = max(rows) + 1, max(cols) + 1
        self.valid = np.zeros((self.NR, self.NC), bool)
        self.valid[rows, cols] = True
        r, c = np.mgrid[0:self.NR, 0:self.NC]
        self.R, self.C = r, c
        self.X = p / 2 + c * p + (p / 2) * (r % 2)          # LED centres, px
        self.Y = rh / 2 + r * rh
        # band coordinates in LED units: U along the band, V across it
        self.U = (self.X * s.dx + self.Y * s.dy - s.umin) / p
        self.V = (self.X * s.nx + self.Y * s.ny - s.vmin) / p
        Uv = self.U[self.valid]
        self.umin, self.umax = Uv.min(), Uv.max()
        self.vmid = s.ST / 2 / p
        # every canvas pixel inside the stripe -> its nearest LED cell
        ys, xs = np.nonzero(s.mask_np)
        vi = np.flatnonzero(self.valid)
        cx, cy = self.X.flat[vi], self.Y.flat[vi]
        idx = np.empty(len(xs), np.int64)
        for a in range(0, len(xs), 4096):
            d = (xs[a:a + 4096, None] - cx[None]) ** 2 + (ys[a:a + 4096, None] - cy[None]) ** 2
            idx[a:a + 4096] = vi[np.argmin(d, axis=1)]
        self.pix = (ys, xs, idx)

    def zeros(self):
        return np.zeros((self.NR, self.NC), np.float32)

    def to_canvas(self, vals):
        ys, xs, idx = self.pix
        out = np.zeros((self.s.H, self.s.W), np.float32)
        out[ys, xs] = np.clip(vals, 0, 1).flat[idx]
        return Image.fromarray((out * 255 + 0.5).astype(np.uint8), "L")

    def cell_at(self, x, y):
        """Nearest cell to a canvas point given in px."""
        r = int(round((y - self.rh / 2) / self.rh))
        c = int(round((x - self.p / 2 - (self.p / 2) * (r % 2)) / self.p))
        if 0 <= r < self.NR and 0 <= c < self.NC and self.valid[r, c]:
            return r, c
        return None

    def centre_point(self, u):
        """Canvas px of the band's centre line at U = u (LED units)."""
        s, p = self.s, self.p
        ox = s.umin * s.dx + s.vmin * s.nx
        oy = s.umin * s.dy + s.vmin * s.ny
        v = s.ST / 2
        return ox + u * p * s.dx + v * s.nx, oy + u * p * s.dy + v * s.ny

    def layout(self, text, font, gap=2, shift=0.0):
        """Italic word centred on the band. Returns a list of letters, each a list
        of (row, col) cells."""
        p, rh = self.p, self.rh
        widths = [len(font[ch][0]) for ch in text]
        total = sum(widths) + gap * (len(text) - 1)
        mid_u = (self.umin + self.umax) / 2 + shift
        ax, ay = self.centre_point(mid_u)
        tan = self.s.dy / self.s.dx
        letters, a = [], 0
        for ch, w in zip(text, widths):
            g = font[ch]
            n = len(g)
            h = (a + w / 2 - total / 2) * p
            cx, cy = ax + h, ay + h * tan
            rb = int(round((cy - rh / 2) / rh + (n - 1) / 2))
            cb = int(round((cx - p / 2) / p - (w - 1) / 2 - (n - 1) / 4 - 0.5 * (rb % 2)))
            cells = []
            for r, row in enumerate(g):
                k = n - 1 - r                      # height above the base row
                R = rb - k
                for c, ch2 in enumerate(row):
                    if ch2 == "#":
                        xh = 2 * (cb + c) + k + (rb % 2)
                        cells.append((R, (xh - R % 2) // 2))
            letters.append(cells)
            a += w + gap
        return letters

    def stamp(self, vals, cells, level=1.0, dr=0, dc=0):
        for r, c in cells:
            r2, c2 = r + dr, c + dc
            if 0 <= r2 < self.NR and 0 <= c2 < self.NC:
                vals[r2, c2] = max(vals[r2, c2], level)
        return vals

    def check_fit(self, name, letters):
        missing = sum(1 for L in letters for r, c in L
                      if not (0 <= r < self.NR and 0 <= c < self.NC and self.valid[r, c]))
        edge = 0
        for L in letters:
            for r, c in L:
                if 0 <= r < self.NR and 0 <= c < self.NC and self.valid[r, c]:
                    nb = [(r - 1, c), (r + 1, c), (r, c - 1), (r, c + 1)]
                    if any(not (0 <= a < self.NR and 0 <= b < self.NC and self.valid[a, b]) for a, b in nb):
                        edge += 1
        print(f"  fit {name}: {missing} cells off-stripe, {edge} cells on the stripe edge")


def ease_out(x):
    x = min(max(x, 0.0), 1.0)
    return 1 - (1 - x) ** 3


def ease_in_out(x):
    x = min(max(x, 0.0), 1.0)
    return x * x * (3 - 2 * x)


def cells_mask(g, letters):
    m = g.zeros()
    for L in letters:
        g.stamp(m, L)
    return m


def shift_rows(vals, rows, dc):
    out = vals.copy()
    for r in rows:
        if 0 <= r < vals.shape[0]:
            out[r] = np.roll(vals[r], dc)
    return out


def halo(g, mask, radius=1):
    """Cells within `radius` hex steps of the mask but not in it."""
    m = mask > 0
    grown = m.copy()
    for _ in range(radius):
        n = grown.copy()
        n[1:, :] |= grown[:-1, :]
        n[:-1, :] |= grown[1:, :]
        n[:, 1:] |= grown[:, :-1]
        n[:, :-1] |= grown[:, 1:]
        grown = n
    return grown & ~m


# --------------------------------------------------------------------------- segment 1: STRIX
def seg_strix(g, rng):
    letters = g.layout("STRIX", WORD_FONT, gap=1, shift=STRIX_SHIFT)
    g.check_fit("STRIX", letters)
    word = cells_mask(g, letters)
    frames = []
    for i in range(N):
        t = i / FPS
        v = g.zeros()
        # 0.00-0.50: a light bar sweeps the band and writes the word behind it
        if t < 0.55:
            pos = g.umin - 4 + ease_in_out(t / 0.5) * (g.umax - g.umin + 10)
            d = pos - g.U
            v = np.where(d > 0, word, 0).astype(np.float32)
            bar = np.clip(1 - np.abs(d) / 1.2, 0, 1)
            trail = np.where((d > 0) & (d < 9), (1 - d / 9) * 0.45, 0)
            v = np.maximum(v, np.maximum(bar, trail) * g.valid)
            # letters flash as they are written, then settle
            v = np.maximum(v, word * np.clip(1 - (d - 1) / 3, 0, 1) * (d > 0))
        else:
            v = word.copy()
        # subtle glitches: a letter slips, a slice tears, a letter drops a frame
        if i in (19, 20):
            v = g.zeros()
            for k, L in enumerate(letters):
                g.stamp(v, L, 1.0, dc=1 if k == 2 else 0)
            g.stamp(v, letters[2], 0.45, dc=-1)
        if i == 27:
            rows = range(int(np.median([r for r, _ in letters[1]])) - 1, int(np.median([r for r, _ in letters[1]])) + 2)
            v = shift_rows(v, rows, 2)
        if i == 28:
            v = word.copy()
            for r, c in letters[3]:
                v[r, c] = 0.3
        # 1.70-2.00: tear out - slices drift apart and the word breaks up
        if t >= 1.7:
            q = (t - 1.7) / 0.3
            out = v.copy()
            for r in range(g.NR):
                if rng.random() < 0.25 + 0.6 * q:
                    out[r] = np.roll(v[r], int(rng.integers(-1, 2) * (1 + 6 * q)))
            keep = rng.random(out.shape) > q * 0.8
            v = out * keep
        frames.append(v * g.valid)
    return frames


# --------------------------------------------------------------------------- segment 2: SCAR
def seg_scar(g, rng):
    letters = g.layout("SCAR", WORD_FONT)
    alt = g.layout("5C4R", WORD_FONT)
    g.check_fit("SCAR", letters)
    word = cells_mask(g, letters)
    word_alt = cells_mask(g, alt)
    rows_used = sorted({r for L in letters for r, _ in L})
    r_lo, r_hi = rows_used[0], rows_used[-1]
    bursts = [(0.10, 0.30), (0.55, 0.70), (0.95, 1.20), (1.42, 1.50), (1.62, 1.70)]
    frames = []
    for i in range(N):
        t = i / FPS
        burst = any(a <= t < b for a, b in bursts)
        v = word.copy()
        if i == 0:                              # slam in: full-band flash
            v = g.valid.astype(np.float32)
        elif i == 1:                            # inverted: dark letters cut out of a lit band
            v = (g.valid & (word == 0)).astype(np.float32) * 0.85
        elif i == 2:
            v = np.maximum(word, np.roll(word, 3, axis=1) * 0.45)
        elif t >= 1.75:                         # CRT shut-off: squash to a line, then a point
            q = (t - 1.75) / 0.25
            mid = (r_lo + r_hi) / 2
            f = max(0.0, 1 - q * 1.6)
            v = g.zeros()
            if f > 0.08:
                src = np.clip(np.round(mid + (g.R - mid) / f).astype(int), 0, g.NR - 1)
                v = word[src, g.C] * (np.abs(g.R - mid) <= (r_hi - r_lo) / 2 * f + 0.5)
                v = np.maximum(v, (np.abs(g.R - mid) < 0.6) * (np.abs(g.U - (g.umin + g.umax) / 2) < 30) * 0.6)
            else:                               # line shrinks into the centre point
                L = 30 * (1 - (q - 0.6) / 0.4)
                uc = (g.umin + g.umax) / 2
                v = ((np.abs(g.V - g.vmid) < 0.7) & (np.abs(g.U - uc) < max(L, 0.8))).astype(np.float32)
        elif burst:
            base = word_alt if rng.random() < 0.3 else word
            v = base.copy()
            # chromatic-style ghost
            gd = int(rng.choice([-3, -2, 2, 3]))
            v = np.maximum(v, np.roll(base, gd, axis=1) * 0.45)
            # horizontal slice tears
            for _ in range(int(rng.integers(2, 5))):
                r0 = int(rng.integers(r_lo - 2, r_hi + 1))
                v = shift_rows(v, range(r0, r0 + int(rng.integers(1, 4))), int(rng.integers(-6, 7)))
            # corrupted blocks
            for _ in range(int(rng.integers(1, 4))):
                r0 = int(rng.integers(r_lo - 3, r_hi + 2))
                c0 = int(rng.integers(0, g.NC - 6))
                h, w = int(rng.integers(1, 4)), int(rng.integers(3, 9))
                blk = (rng.random((h, w)) < 0.55).astype(np.float32) * rng.choice([0.45, 1.0])
                rr, cc = slice(max(r0, 0), max(r0, 0) + h), slice(c0, c0 + w)
                v[rr, cc] = blk[: v[rr, cc].shape[0], : v[rr, cc].shape[1]]
            # speed streaks across the band
            ph = rng.random() * 12
            streak = ((np.mod(g.U * 1.0 + g.V * 0.9 + ph, 12) < 1.0) * 0.3)
            v = np.maximum(v, streak * (word == 0))
            if rng.random() < 0.18:             # occasional inverted hit
                v = (g.valid & (v < 0.5)).astype(np.float32) * 0.85
        elif rng.random() < 0.12:               # micro jitter between bursts
            v = np.roll(word, int(rng.choice([-1, 1])), axis=1)
        frames.append(np.clip(v, 0, 1) * g.valid)
    return frames


# --------------------------------------------------------------------------- segment 3: 18
def seg_18(g, rng):
    letters = g.layout("18", HERO_FONT, gap=3)
    g.check_fit("18", letters)
    word = cells_mask(g, letters)
    ring = halo(g, word, 1).astype(np.float32) * g.valid
    targets = [(r, c) for L in letters for r, c in L if g.valid[r, c]]
    uc = (g.umin + g.umax) / 2
    ox, oy = g.centre_point(uc)
    # every LED of the 18 is a particle bursting out of the centre point
    parts = []
    for r, c in targets:
        tx, ty = g.X[r, c], g.Y[r, c]
        ang = rng.uniform(0, 2 * math.pi)
        parts.append(dict(t=(tx, ty), delay=rng.uniform(0, 0.18), bow=rng.uniform(-1, 1) * 2.5 * g.p, ang=ang))
    out_dir = np.array([g.s.dx, g.s.dy])
    sparkle_cells = [tuple(x) for x in np.argwhere(g.valid & (word == 0) & (ring == 0))]
    sp = [sparkle_cells[k] for k in rng.choice(len(sparkle_cells), 16, replace=False)]
    sp_phase = rng.uniform(0, 1, len(sp))
    trail = g.zeros()
    frames = []
    for i in range(N):
        t = i / FPS
        v = g.zeros()
        if t < 0.6:                             # converge with curved paths and trails
            trail *= 0.5
            for pt in parts:
                q = ease_out((t - pt["delay"]) / 0.42)
                if t < pt["delay"]:
                    continue
                tx, ty = pt["t"]
                x = ox + (tx - ox) * q
                y = oy + (ty - oy) * q
                bend = math.sin(math.pi * q) * pt["bow"]
                x += -out_dir[1] * bend
                y += out_dir[0] * bend
                cell = g.cell_at(x, y)
                if cell:
                    trail[cell] = 1.0
            v = trail.copy()
            if t < 0.1:                         # the point that SCAR collapsed into, flaring
                v = np.maximum(v, ((np.abs(g.U - uc) < 1.2) & (np.abs(g.V - g.vmid) < 1.2)) * 1.0)
        if 0.5 <= t < 1.55:
            v = np.maximum(v, word)
        # lock-in: halo flash + shockwave bars racing to both ends
        if 0.5 <= t < 1.0:
            q = (t - 0.5) / 0.5
            v = np.maximum(v, ring * max(0.0, 1 - q * 3) * 0.4)        # brief halo flash
            r_ = 7 + ease_out(q) * 30
            wave = np.clip(1 - np.abs(np.abs(g.U - uc) - r_) / 1.3, 0, 1) * (1 - q) * 0.85
            v = np.maximum(v, wave * (word == 0) * g.valid)
        # hold: a crisp beam of light sweeping behind the digits along the hex 60 deg axis
        if 0.95 <= t < 1.55:
            q = (t - 0.95) / 0.5
            gx = g.X / g.p + (g.s.H - g.Y) / g.p * 0.577          # coordinate along x, slanted 60 deg
            lo, hi = np.min(gx[word > 0]) - 3, np.max(gx[word > 0]) + 3
            pos = lo + ease_in_out(q) * (hi - lo)
            glint = np.clip(1 - np.abs(gx - pos) / 1.0, 0, 1)
            v = np.maximum(v, glint * g.valid * 0.55 * (word == 0))
        if 0.6 <= t < 1.75:                     # twinkles
            for (r, c), ph in zip(sp, sp_phase):
                k = math.sin(2 * math.pi * (2 * (t - 0.6) / 1.15 + ph))
                if k > 0.6:
                    v[r, c] = max(v[r, c], 0.55 * (k - 0.6) / 0.4)
        # 1.55-2.00: dissolve into particles drifting off along the band
        if t >= 1.55:
            q = (t - 1.55) / 0.45
            for pt, (r, c) in zip(parts, targets):
                local = q * 1.4 - pt["delay"] * 2
                if local <= 0:
                    v[r, c] = 1.0
                    continue
                if local > 1:
                    continue
                d = ease_in_out(local) * (14 + 10 * math.cos(pt["ang"])) * g.p
                x = g.X[r, c] + out_dir[0] * d * (1 if pt["ang"] < math.pi else -1)
                y = g.Y[r, c] + out_dir[1] * d * (1 if pt["ang"] < math.pi else -1)
                cell = g.cell_at(x, y)
                if cell:
                    v[cell] = max(v[cell], 1 - local)
        frames.append(np.clip(v, 0, 1) * g.valid)
    return frames


def main():
    ap = argparse.ArgumentParser()
    here = os.path.dirname(os.path.abspath(__file__))
    ap.add_argument("--out", default=os.path.join(here, "strix_scar_18_hd.gif"))
    ap.add_argument("--sheet-frames", type=int, default=24)
    ap.add_argument("--seed", type=int, default=18)
    a = ap.parse_args()

    s = Stripe()
    g = Grid(s)
    rng = np.random.default_rng(a.seed)
    vals = seg_strix(g, rng) + seg_scar(g, rng) + seg_18(g, rng)
    frames = [s.finalize(g.to_canvas(v)) for v in vals]
    durs = save_gif(frames, a.out, FPS)
    base = os.path.splitext(a.out)[0]
    make_preview(frames, durs, s, base + "_preview.gif", base + "_sheet.png", sheet_frames=a.sheet_frames)
    print(f"wrote {a.out} ({len(frames)} frames, {len(frames) / FPS:.2f}s), {base}_preview.gif, {base}_sheet.png")
    ok = True
    for r in validate(a.out, s):
        tag = "PASS" if r["passed"] else ("FAIL" if r["hard"] else "WARN")
        ok &= r["passed"] or not r["hard"]
        print(f"  [{tag}] {r['check']}: {r['detail']}")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
