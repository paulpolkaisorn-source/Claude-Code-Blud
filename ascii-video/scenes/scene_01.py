"""Scene 01 - BOOT / HOOK: cursor, green code rain, rain locks into an ASCII ART banner, caption typed."""
import numpy as np
import engine as E

DURATION = 8.0

PROMPT = "> boot ascii_art"
P_X, P_Y, P_T0, P_CPS = 8, 5, 0.55, 14.0
CAPTION = "Pictures made of text."
C_T0, C_CPS = 5.0, 12.0
LOCK_T0, LOCK_SPAN = 2.7, 1.6        # banner cells lock between ~2.7 s and ~4.5 s

EVENTS = []
EVENTS += [(P_T0 + i / P_CPS, "click") for i in range(len(PROMPT)) if PROMPT[i] != " "]
EVENTS += [(1.55, "blip"), (2.0, "whoosh"), (LOCK_T0 - 0.1, "whoosh"), (3.6, "blip"), (4.5, "chime")]
EVENTS += [(C_T0 + i / C_CPS, "click") for i in range(len(CAPTION)) if CAPTION[i] != " "]
EVENTS.sort()

# ---------------- precomputed layout ----------------
_BANNER = E.big_text("ASCII ART", 12)
_BW = max(len(l) for l in _BANNER)
_BH = len(_BANNER)
_BX, _BY = (E.COLS - _BW) // 2, 17
_CAP = E.big_text(CAPTION, 5)
_CW = max(len(l) for l in _CAP)
_CX, _CY = (E.COLS - _CW) // 2, 41

_R = np.arange(E.ROWS)[:, None]
_C = np.arange(E.COLS)[None, :]

_mask = np.zeros((E.ROWS, E.COLS), bool)
for j, ln in enumerate(_BANNER):
    for i, ch in enumerate(ln):
        if ch == "#" and 0 <= _BY + j < E.ROWS and 0 <= _BX + i < E.COLS:
            _mask[_BY + j, _BX + i] = True

_xn = np.clip((_C - _BX) / max(1, _BW), 0, 1)
_lock_t = LOCK_T0 + LOCK_SPAN * (0.6 * _xn + 0.4 * E.hash2(_R, _C, 11)) + 0.0 * _R


def _blur(a, sx, sy):
    def k(s):
        n = int(s * 3)
        x = np.arange(-n, n + 1)
        w = np.exp(-x * x / (2.0 * s * s))
        return w / w.sum()
    out = np.apply_along_axis(lambda v: np.convolve(v, k(sx), "same"), 1, a)
    return np.apply_along_axis(lambda v: np.convolve(v, k(sy), "same"), 0, out)


_halo = np.clip(_blur(_mask.astype(float), 5.0, 2.4) / 0.4, 0, 1.0)
_halo[_mask] = 0.0

# rain column parameters
_c1 = np.arange(E.COLS)
_start = 1.0 + 1.5 * E.hash2(_c1, 0, 1)
_speed = 9.0 + 24.0 * E.hash2(_c1, 0, 2)
_len = 8.0 + 18.0 * E.hash2(_c1, 0, 3)
_period = E.ROWS + _len + 12.0 * E.hash2(_c1, 0, 4)
_POOL = np.frombuffer(
    b"0123456789ABCDEFabcdefxyz:;<>=+*#%@$&/\\|{}[]()?!~^_-", np.uint8)

_GREEN = E.GREEN.astype(np.float32)
_HEAD = np.array([225, 255, 235], np.float32)
_DIMF = E.DIM.astype(np.float32)


def render(g, t):
    g.clear(E.BLACK, E.GREEN)

    # ---- 0: boot prompt + blinking cursor ----
    pre = E.typed(PROMPT, t, P_T0, P_CPS)
    if t < 2.3:
        g.put(P_X, P_Y, pre, fg=E.mix(E.GREEN, E.WHITE, 0.25))
        done = len(pre) == len(PROMPT)
        if (not done) or E.blink(t, 2.0):
            g.set(P_X + len(pre), P_Y, "#", fg=E.GREEN)

    # ---- halo (dim '.' ':' glow) ----
    gh = E.ease_in_out(E.prog(t, 3.1, 1.8))
    if gh > 0:
        pulse = 0.88 + 0.12 * np.sin(t * 3.0 - _xn * 4.0)
        tw = 0.65 + 0.35 * E.hash2(_R, _C, 20 + int(t * 6))
        v = _halo * gh * pulse * tw
        ch = np.where(v > 0.5, ord(":"), np.where(v > 0.14, ord("."), 32)).astype(np.uint8)
        sel = ch != 32
        g.ch[sel] = ch[sel]
        col = (_DIMF[None, None, :] * (0.5 + 1.1 * v[..., None])).clip(0, 255).astype(np.uint8)
        g.fg[sel] = col[sel]

    # ---- rain ----
    rf = 1.0 - E.ease_in_out(E.prog(t, 3.5, 1.3))
    if rf > 0.0:
        active = t > _start
        hp = ((t - _start).clip(0) * _speed) % _period
        d = hp[None, :] - _R
        valid = (d >= 0) & (d < _len[None, :]) & active[None, :]
        inten = np.where(valid, 1.0 - d / _len[None, :], 0.0)
        head = valid & (d < 1.0)
        # glyphs
        tick = (t * 9.0 + 7 * E.hash2(_C, 0, 5)).astype(int)
        hv = E.hash2(_R, _C, 100 + tick)
        glyph = _POOL[(hv * len(_POOL)).astype(int) % len(_POOL)]
        hv2 = E.hash2(_R, _C, 300 + int(t * 24))
        glyph = np.where(head, _POOL[(hv2 * len(_POOL)).astype(int) % len(_POOL)], glyph)
        shown = inten * rf
        sel = shown > 0.06
        body = _GREEN[None, None, :] * (0.12 + 0.88 * inten[..., None] ** 1.6) * rf
        hc = _HEAD[None, None, :] * (0.4 + 0.6 * rf)
        col = np.where(head[..., None], hc, body)
        # second cell behind head: bright green-white
        near = valid & (d >= 1.0) & (d < 2.2)
        col = np.where(near[..., None], _GREEN[None, None, :] * 0.5 + _HEAD[None, None, :] * 0.5 * rf, col)
        col = col.clip(0, 255).astype(np.uint8)
        g.ch[sel] = glyph[sel]
        g.fg[sel] = col[sel]

    # ---- banner locking in ----
    if t > LOCK_T0 - 0.4:
        age = t - _lock_t
        locked = _mask & (age >= 0)
        pre_l = _mask & (age < 0) & (age > -0.3)
        # pre-lock: bright random glyphs
        hv3 = E.hash2(_R, _C, 500 + int(t * 30))
        pg = _POOL[(hv3 * len(_POOL)).astype(int) % len(_POOL)]
        g.ch[pre_l] = pg[pre_l]
        g.fg[pre_l] = _HEAD.astype(np.uint8)
        # locked: flash white -> gradient green
        k = np.clip(age / 0.45, 0, 1)[..., None]
        rowg = np.clip((_R - _BY) / max(1, _BH - 1), 0, 1)[..., None]
        base = (np.array([140, 255, 170], np.float32) * (1 - rowg) + _GREEN * rowg * 0.95)
        shimmer = 1.0 + 0.06 * np.sin(t * 4.0 + _C * 0.15 + _R * 0.3)
        col = (_HEAD * (1 - k) + base * k) * shimmer
        col = col.clip(0, 255).astype(np.uint8)
        # a few locked cells use denser glyphs for texture
        gl = np.where(E.hash2(_R, _C, 77) > 0.82, ord("@"), ord("#")).astype(np.uint8)
        g.ch[locked] = gl[locked]
        g.fg[locked] = col[locked]

    # ---- caption (big text wiped in, typed) ----
    if t >= C_T0:
        n = (t - C_T0) * C_CPS            # chars typed so far (float)
        frac = min(1.0, n / len(CAPTION))
        vis = int(frac * _CW)
        done = frac >= 1.0
        lum = E.mix(E.GREEN, E.WHITE, 0.55)
        for j, ln in enumerate(_CAP):
            seg = ln[:vis]
            for i, ch in enumerate(seg):
                if ch == "#":
                    edge = (vis - i) < 6 and not done
                    g.set(_CX + i, _CY + j, "#", fg=E.WHITE if edge else lum)
        # block cursor at the typing front
        cx = _CX + vis + 1
        if (not done) or E.blink(t - C_T0, 2.0):
            for j in range(5):
                for i in range(3):
                    g.set(cx + i, _CY + j, "#", fg=E.GREEN)
