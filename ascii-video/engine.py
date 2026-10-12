"""Shared ASCII grid engine. Every pixel of the video is a printable ASCII glyph (32..126)."""
import numpy as np
from PIL import Image, ImageDraw, ImageFont

W, H, FPS = 1920, 1080, 30
CW, CH = 8, 16                      # cell size in px
COLS, ROWS = W // CW, H // CH       # 240 x 67
RAMP = " .:-=+*#%@"                 # light -> dense
FONT_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"

# ---- colours -------------------------------------------------------------
def rgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.uint8)

BLACK, GREEN, WHITE, AMBER = rgb("0C0C0C"), rgb("33FF66"), rgb("E5E5E5"), rgb("FFB000")
CYAN, RED, PINK, BLUE, DIM = rgb("33DDFF"), rgb("FF4D4D"), rgb("FF66CC"), rgb("5577FF"), rgb("2E6B3E")

def mix(a, b, k):
    """Blend colour a->b by k in [0,1]."""
    k = float(min(max(k, 0.0), 1.0))
    return (np.asarray(a, float) * (1 - k) + np.asarray(b, float) * k).astype(np.uint8)

# ---- easing --------------------------------------------------------------
def clamp01(x): return min(max(x, 0.0), 1.0)
def ease_out(x): x = clamp01(x); return 1 - (1 - x) ** 3
def ease_in_out(x): x = clamp01(x); return 3 * x * x - 2 * x ** 3
def prog(t, t0, dur): return clamp01((t - t0) / dur)   # 0..1 progress of a timed beat

# ---- glyph atlas (95 printable chars) -----------------------------------
def _atlas():
    font = ImageFont.truetype(FONT_REG, 13)
    bold = ImageFont.truetype(FONT_BOLD, 13)
    a = np.zeros((128, CH, CW), np.float32)
    for c in range(32, 127):
        im = Image.new("L", (CW, CH), 0)
        ImageDraw.Draw(im).text((0, 0), chr(c), font=font if c != 0 else bold, fill=255)
        a[c] = np.asarray(im, np.float32) / 255.0
    return a

ATLAS = _atlas()

class Grid:
    def __init__(self):
        self.ch = np.full((ROWS, COLS), 32, np.uint8)
        self.fg = np.zeros((ROWS, COLS, 3), np.uint8)
        self.bg = np.zeros((ROWS, COLS, 3), np.uint8)
        self.clear()

    def clear(self, bg=BLACK, fg=GREEN):
        self.ch[:] = 32
        self.bg[:] = bg
        self.fg[:] = fg

    def copy_from(self, o):
        self.ch[:], self.fg[:], self.bg[:] = o.ch, o.fg, o.bg

    # -- drawing ----------------------------------------------------------
    def set(self, x, y, c, fg=None, bg=None):
        if 0 <= x < COLS and 0 <= y < ROWS:
            self.ch[y, x] = ord(c) if isinstance(c, str) else c
            if fg is not None: self.fg[y, x] = fg
            if bg is not None: self.bg[y, x] = bg

    def put(self, x, y, text, fg=None, bg=None, transparent_space=False):
        """Write a single line of text at cell (x,y). Clips to the grid."""
        for i, c in enumerate(text):
            if transparent_space and c == " ":
                continue
            self.set(x + i, y, c, fg, bg)

    def center(self, y, text, fg=None, bg=None):
        self.put((COLS - len(text)) // 2, y, text, fg, bg)

    def blit(self, lines, x, y, fg=None, bg=None, transparent_space=True):
        """Draw a list of strings (ASCII art) with its top-left at (x,y)."""
        for j, ln in enumerate(lines):
            self.put(x, y + j, ln, fg, bg, transparent_space)

    def blit_center(self, lines, y, fg=None, bg=None, transparent_space=True):
        w = max(len(l) for l in lines)
        self.blit(lines, (COLS - w) // 2, y, fg, bg, transparent_space)

    def fill(self, x, y, w, h, c=" ", fg=None, bg=None):
        for j in range(h):
            for i in range(w):
                self.set(x + i, y + j, c, fg, bg)

    def box(self, x, y, w, h, fg=None, bg=None):
        """ASCII frame +---+ / | |."""
        for i in range(1, w - 1):
            self.set(x + i, y, "-", fg, bg); self.set(x + i, y + h - 1, "-", fg, bg)
        for j in range(1, h - 1):
            self.set(x, y + j, "|", fg, bg); self.set(x + w - 1, y + j, "|", fg, bg)
        for cx, cy in ((x, y), (x + w - 1, y), (x, y + h - 1), (x + w - 1, y + h - 1)):
            self.set(cx, cy, "+", fg, bg)

    def image(self, luma, x, y, fg=None, ramp=RAMP, color=None):
        """Draw a 2D float array luma in [0,1] (rows x cols already in cell units) via the density ramp.
        color: optional (h,w,3) uint8 per-glyph colour."""
        h, w = luma.shape
        idx = np.clip((luma * (len(ramp) - 1) + 0.5).astype(int), 0, len(ramp) - 1)
        codes = np.frombuffer(ramp.encode(), np.uint8)[idx]
        y0, x0 = max(0, y), max(0, x)
        y1, x1 = min(ROWS, y + h), min(COLS, x + w)
        if y1 <= y0 or x1 <= x0: return
        sub = (slice(y0 - y, y1 - y), slice(x0 - x, x1 - x))
        dst = (slice(y0, y1), slice(x0, x1))
        self.ch[dst] = codes[sub]
        if color is not None: self.fg[dst] = color[sub]
        elif fg is not None: self.fg[dst] = fg

    # -- rasterise to RGB frame --------------------------------------------
    def to_rgb(self):
        m = ATLAS[self.ch]                                   # (R,C,CH,CW)
        m = m.transpose(0, 2, 1, 3).reshape(ROWS * CH, COLS * CW, 1)
        fg = np.repeat(np.repeat(self.fg, CH, 0), CW, 1).astype(np.float32)
        bg = np.repeat(np.repeat(self.bg, CH, 0), CW, 1).astype(np.float32)
        out = np.zeros((H, W, 3), np.uint8)
        out[:ROWS * CH, :COLS * CW] = (bg * (1 - m) + fg * m).astype(np.uint8)
        return out

# ---- helpers ---------------------------------------------------------------
def typed(text, t, t0, cps=30.0):
    """Typewriter: visible prefix of text at scene time t."""
    n = int(max(0.0, (t - t0)) * cps)
    return text[:n]

def blink(t, rate=2.0): return int(t * rate * 2) % 2 == 0

def big_text(text, rows=7, bold=True):
    """Render text as big block letters made of '#' (cell aspect 1:2 compensated). Returns list[str]."""
    f = ImageFont.truetype(FONT_BOLD if bold else FONT_REG, 200)
    bb = f.getbbox(text)
    im = Image.new("L", (bb[2] - bb[0], bb[3] - bb[1]), 0)
    ImageDraw.Draw(im).text((-bb[0], -bb[1]), text, font=f, fill=255)
    cols = max(1, round(rows * (im.width / im.height) * 2))
    a = np.asarray(im.resize((cols, rows), Image.BOX), np.float32) / 255.0
    return ["".join("#" if v > 0.35 else " " for v in r) for r in a]

def text_luma(text, cols, rows, bold=True):
    """Anti-aliased luma (rows x cols) of text, to use with Grid.image for shaded lettering."""
    f = ImageFont.truetype(FONT_BOLD if bold else FONT_REG, 200)
    bb = f.getbbox(text)
    im = Image.new("L", (bb[2] - bb[0], bb[3] - bb[1]), 0)
    ImageDraw.Draw(im).text((-bb[0], -bb[1]), text, font=f, fill=255)
    return np.asarray(im.resize((cols, rows), Image.BOX), np.float32) / 255.0

def hash2(x, y, seed=0):
    """Deterministic per-cell pseudo-random in [0,1). x,y may be arrays."""
    n = (np.asarray(x) * 374761393 + np.asarray(y) * 668265263 + seed * 2246822519) & 0xFFFFFFFF
    n = ((n ^ (n >> 13)) * 1274126177) & 0xFFFFFFFF
    return ((n ^ (n >> 16)) & 0xFFFF) / 65536.0

def wrap(text, width):
    out, line = [], ""
    for w in text.split():
        if len(line) + len(w) + (1 if line else 0) > width:
            out.append(line); line = w
        else:
            line = (line + " " + w).strip()
    if line: out.append(line)
    return out
