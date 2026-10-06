"""ANIMATION 3 - BOSS FIGHT HUD (6.0 s @ 20 fps = 120 frames, seamless loop).

Run:  python3 boss_fight_hud.py
Timeline (frames @20 fps):
  0-20    health bar fills from the left (frame 0 = empty bar frame)
  20-29   full hold
  30-77   5 hits: white flash, ghost chunk, chunk gone, tiny damage number pops above
  78-91   near-zero blink (~4 s mark)
  92-103  solid wipe sweeps across, spelling "GG" behind it
  104-111 GG hold
  112-119 solid wipe sweeps across again leaving the empty bar frame == frame 0
"""
import numpy as np
from lidkit import *   # noqa: F401,F403

BX0, BX1 = 9, 47          # fill columns [BX0, BX1)  -> 38 LED cells
FR0, FR1 = 8, 47          # outline columns inclusive
Y0, Y1 = 7, 11            # fill rows [Y0, Y1)
FILL_LV = HIGH
HITS = [(30, 9), (42, 10), (53, 7), (63, 6), (72, 4)]   # (frame, damage in cells)
BLINK = range(78, 92)
WIPE_IN = range(92, 104)
GG_HOLD = range(104, 112)
WIPE_OUT = range(112, 120)
HP_MAX = BX1 - BX0

DIG = {
    "0": ["###", "# #", "# #", "# #", "###"], "1": [" # ", "## ", " # ", " # ", "###"],
    "2": ["###", "  #", "###", "#  ", "###"], "3": ["###", "  #", "###", "  #", "###"],
    "4": ["# #", "# #", "###", "  #", "  #"], "5": ["###", "#  ", "###", "  #", "###"],
    "6": ["###", "#  ", "###", "# #", "###"], "7": ["###", "  #", "  #", "  #", "  #"],
    "8": ["###", "# #", "###", "# #", "###"], "9": ["###", "# #", "###", "  #", "###"],
    "-": ["   ", "   ", "###", "   ", "   "],
}


def num_mask(s):
    cols = []
    for i, ch in enumerate(s):
        cols.append(np.array([[c == "#" for c in r] for r in DIG[ch]], bool))
        if i < len(s) - 1:
            cols.append(np.zeros((5, 1), bool))
    return np.concatenate(cols, axis=1)


def big_g():
    """Blocky 10x14 G made of thick rectangles."""
    a = np.zeros((14, 10), bool)
    a[0:3, :] = True
    a[:, 0:3] = True
    a[11:14, :] = True
    a[7:14, 7:10] = True
    a[7:10, 4:10] = True
    return a


GG = np.zeros((14, 23), bool)
GG[:, 0:10] = big_g()
GG[:, 13:23] = big_g()
GG_X = 17                  # centred in the always-lit part of the band


def frame_box(g, level=HALF):
    g[Y0 - 1, FR0:FR1 + 1] = level
    g[Y1, FR0:FR1 + 1] = level
    g[Y0 - 1:Y1 + 1, FR0] = level
    g[Y0 - 1:Y1 + 1, FR1] = level


def draw_fill(g, hp, level=FILL_LV, ghost=0, ghost_lv=HALF):
    if hp > 0:
        g[Y0:Y1, BX0:BX0 + hp] = level
    if ghost > 0:
        g[Y0:Y1, BX0 + hp:BX0 + hp + ghost] = ghost_lv
    for k in range(1, 8):                       # tick marks: dark gap every 5th cell
        g[Y0:Y1, BX0 + 5 * k - 1] = 0


def hp_at(f):
    """(hp, ghost cells, flash stage, last hit index, frames since hit)."""
    hp = HP_MAX
    for i, (hf, dmg) in enumerate(HITS):
        if f >= hf:
            hp -= dmg
    return hp


def bar_scene(f):
    g = blank()
    frame_box(g)
    if f <= 20:
        draw_fill(g, min(HP_MAX, 2 * f))
        return g
    hp = HP_MAX
    for hf, dmg in HITS:
        if f < hf:
            break
        d = f - hf
        new = hp - dmg
        if d < 2:                                    # white damage flash: old bar FULL
            if d == 0:
                g[:] = np.maximum(g, HALF)           # whole stripe pops to half-bright
                frame_box(g, FULL)
            draw_fill(g, hp, FULL)
            g[Y0 - 1:Y1 + 1, BX0 + new:BX0 + hp] = FULL
            hp_after = None
            if d == 1:
                pass
            nm = num_mask("-" + str(dmg))
            place(g, nm, min(max(BX0 + new - 2, 2), 44 - nm.shape[1]), 2 if d == 0 else 1, FULL)
            return g
        if d < 6:                                    # ghost chunk drains, number floats up
            draw_fill(g, new, FILL_LV, ghost=dmg if d < 4 else dmg // 2)
            nm = num_mask("-" + str(dmg))
            place(g, nm, min(max(BX0 + new - 2, 2), 44 - nm.shape[1]), 1 if d < 4 else 0, FULL)
            return g
        hp = new
    if f in BLINK:
        if ((f - BLINK.start) // 2) % 2 == 0:
            draw_fill(g, hp, FULL)
        return g
    draw_fill(g, hp, FILL_LV)
    return g


def wipe(g, f, rng_):
    """Solid wipe front; returns (grid, behind-column) with the front drawn."""
    k = f - rng_.start + 1
    wx = int(round(k * (N + 3) / len(rng_)))
    return wx


frames = []
for f in range(120):
    if f in WIPE_IN:
        wx = wipe(None, f, WIPE_IN)
        g = bar_scene(HITS[-1][0] + 5) * 0
        g = blank()
        place(g, GG, GG_X, 0, FULL)
        g[:, wx:] = 0
        base = bar_scene(91)
        base[:, :min(wx, N)] = 0
        g = np.maximum(g, base)
        rect(g, wx - 3, 0, wx, M, FULL)
    elif f in GG_HOLD:
        g = blank()
        place(g, GG, GG_X, 0, FULL)
    elif f in WIPE_OUT:
        wx = wipe(None, f, WIPE_OUT)
        g = blank()
        place(g, GG, GG_X, 0, FULL)
        g[:, :wx] = 0
        e = blank()
        frame_box(e)
        e[:, wx:] = 0
        g = np.maximum(g, e)
        rect(g, wx - 3, 0, wx, M, FULL)
    else:
        g = bar_scene(f)
    frames.append(to_frame(g))

if __name__ == "__main__":
    build("boss_fight_hud", frames)
