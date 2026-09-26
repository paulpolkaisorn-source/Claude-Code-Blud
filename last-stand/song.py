"""Last Stand - Last Survivor theme (instrumental melodic metal).

180 BPM, 4/4, C# minor (guitars in drop C#), 90 bars = exactly 2:00.
Intro - Verse - Pre-Chorus - Chorus - Post-Chorus - Bridge (breakdown) - Solo - Outro.

All times are in eighth notes (8 per bar, 0.5 = sixteenth).
Run:  python song.py   -> writes last_stand.mid (all parts, for DAWs)
"""
from pathlib import Path

BPM = 180
TPB = 480
EIGHTH = TPB // 2
BAR = 8

# --------------------------------------------------------------------------
# Chords: guitar power chord (drop C#), bass root, string voicing, chord tones (pitch classes)
# --------------------------------------------------------------------------
CHORDS = {
    "C#m":    ([37, 44, 49], 25, [56, 61, 64, 68], {1, 4, 8}),
    "A":      ([45, 52, 57], 33, [57, 61, 64, 69], {9, 1, 4}),
    "E":      ([40, 47, 52], 28, [56, 59, 64, 68], {4, 8, 11}),
    "B":      ([47, 54, 59], 35, [54, 59, 63, 66], {11, 3, 6}),
    "F#m":    ([42, 49, 54], 30, [54, 57, 61, 66], {6, 9, 1}),
    "G#":     ([44, 51, 56], 32, [56, 60, 63, 68], {8, 0, 3}),
    "G#sus4": ([44, 51, 56], 32, [56, 61, 63, 68], {8, 1, 3}),
}
LOW = 37                      # open low string (drop C#) for pedal chugs
C_SHARP_MINOR = [1, 3, 4, 6, 8, 9, 11]
C_SHARP_HARMONIC = [1, 3, 4, 6, 8, 9, 0]

# --------------------------------------------------------------------------
# Melodies (one string per section; notes "PITCH:eighths")
# --------------------------------------------------------------------------
CHORUS_A = [
    "C#6:2 B5:2 G#5:4", "A5:2 G#5:2 E5:4", "G#5:2 F#5:2 E5:2 D#5:2", "F#5:6 D#5:2",
    "C#6:2 B5:2 G#5:4", "A5:2 B5:2 C#6:4", "C#6:2 A5:2 F#5:4", "D#6:4 B#5:2 G#5:2",
]
CHORUS_B = [
    "C#6:2 B5:2 G#5:4", "A5:2 G#5:2 E5:4", "G#5:2 B5:2 E6:4", "D#6:4 B5:2 F#5:2",
    "F#5:2 A5:2 C#6:4", "E6:4 C#6:2 A5:2", "D#6:2 C#6:6", "B#5:8",
]
INTRO_LONE = ["C#5:2 B4:2 G#4:4", "A4:2 G#4:2 E4:4", "G#4:2 F#4:2 E4:2 D#4:2", "F#4:6 D#4:2"]
VERSE_LEAD = ["r:8"] * 8 + [
    "G#5:6 F#5:2", "E5:8", "C#6:6 B5:2", "A5:4 F#5:4",
    "G#5:6 B5:2", "C#6:8", "A5:4 C#6:4", "B#5:8",
]
PRE_LEAD = ["C#5:4 F#5:4", "A5:8", "E5:4 A5:4", "C#6:8", "D#5:4 F#5:4", "B5:8", "C#6:8", "B#5:4 D#6:4"]


def _16(notes):
    return " ".join(f"{n}:0.5" for n in notes.split())


SOLO = [
    _16("C#5 D#5 E5 F#5 G#5 A5 B5 C#6") + " E6:3 D#6:1",
    "C#6:2 A5:1 E5:1 " + _16("A5 B5 C#6 E6") + " C#6:2",
    _16("E6 D#6 B5 G#5 E6 D#6 B5 G#5") + " B5:4",
    "D#6:6 B5:1 F#5:1",
    _16("C#5 E5 G#5 C#6 E6 C#6 G#5 E5 C#5 E5 G#5 C#6 E6 C#6 G#5 E5"),
    _16("A4 C#5 E5 A5 C#6 A5 E5 C#5") + " E6:4",
    _16("F#5 A5 C#6 F#5 A5 C#6 F#5 A5") + " C#6:2 A5:2",
    _16("G#5 B#5 D#6 G#5 B#5 D#6") + " D#6:4 B#5:1",
    "C#6:4 B5:1 C#6:1 E6:2",
    _16("E6 C#6 A5 E5 E6 C#6 A5 E5") + " C#6:4",
    _16("G#5 A5 B5 C#6 D#6 E6 D#6 C#6") + " B5:2 G#5:2",
    _16("F#5 G#5 A5 B5 C#6 D#6 E6 D#6") + " B5:4",
    "A5:2 C#6:2 E6:4",
    _16("E6 C#6 B5 A5 G#5 E5 C#5 E5") + " A5:4",
    "C#6:4 D#6:4",
    _16("G#5 A5 B#5 C#6 D#6 E6 D#6 B#5") + " G#5:4",
]

# Post-chorus thrash riff (16ths on the low strings)
RIFF_CM = [37, 37, 40, 37, 37, 42, 37, 44, 37, 37, 40, 37, 45, 44, 42, 40]
RIFF_G = [44, 44, 48, 44, 44, 49, 44, 51, 44, 44, 48, 44, 51, 49, 48, 44]

# Verse / breakdown chug grids: C = power chord, c = palm-muted open low string
VERSE_GRID = ["C..c.cC..c.cC.cc", "C..c.cC..c.cCcCc"]
BREAK_GRID = ["C..c..c.C..c.cc."]

# --------------------------------------------------------------------------
# Structure (90 bars)
# lead: melody bars for guitar 1; harm: add guitar 2 in harmony; trem: tremolo-pick the melody
# --------------------------------------------------------------------------
SECTIONS = [
    dict(name="Intro", chords=["C#m", "A", "E", "B"], lead=INTRO_LONE, trem=True, harm=False,
         gtr=None, bass=None, drums="intro_build", strings=0.0, vel=96),
    dict(name=None, chords=["C#m", "A", "F#m", "G#"], lead=CHORUS_A[4:], trem=True, harm=True,
         gtr="drive8", bass="drive8", drums="double", strings=0.5, vel=112),
    dict(name="Verse", chords=["C#m", "C#m", "A", "B", "C#m", "C#m", "F#m", "G#"] * 2, lead=VERSE_LEAD,
         trem=False, harm=False, gtr="verse", bass="verse", drums="riff", strings=0.3, vel=104),
    dict(name="Pre-Chorus", chords=["F#m", "F#m", "A", "A", "B", "B", "G#sus4", "G#"], lead=PRE_LEAD,
         trem=False, harm="last4", gtr="ring", bass="ring", drums="halftime", strings=0.55, vel=104),
    dict(name="Chorus", chords=["C#m", "A", "E", "B", "C#m", "A", "F#m", "G#",
                                "C#m", "A", "E", "B", "F#m", "A", "G#sus4", "G#"],
         lead=CHORUS_A + CHORUS_B, trem=True, harm=True, gtr="drive8", bass="drive8", drums="double",
         strings=0.7, vel=118),
    dict(name="Post-Chorus", chords=["C#m", "C#m", "C#m", "G#", "C#m", "C#m", "C#m", "G#"],
         lead=["r:8"] * 4 + CHORUS_A[:3] + CHORUS_A[7:], trem=True, harm=True, gtr="thrash", bass="thrash",
         drums="skank", strings=0.4, vel=116),
    dict(name="Bridge", chords=["C#m", "C#m", "A", "G#", "C#m", "C#m", "A", "G#"], lead=["r:8"] * 8,
         trem=False, harm=False, gtr="breakdown", bass="breakdown", drums="breakdown", strings=0.5, vel=120),
    dict(name="Solo", chords=["C#m", "A", "E", "B", "C#m", "A", "F#m", "G#",
                              "C#m", "A", "E", "B", "F#m", "A", "G#sus4", "G#"],
         lead=SOLO, trem=False, harm=False, solo=True, gtr="chug16", bass="drive8", drums="double_ride",
         strings=0.5, vel=114),
    dict(name="Outro", chords=["C#m", "A", "E", "B", "C#m", "A", "F#m", "G#"], lead=CHORUS_A,
         trem=True, harm=True, gtr="drive8", bass="drive8", drums="double", strings=0.7, vel=118),
    dict(name=None, chords=["C#m", "C#m"], lead=["C#6:16"], trem=False, harm=True, solo=True,
         gtr="end", bass="end", drums="end", strings=0.7, vel=118),
]

NOTE_PC = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}

# General MIDI drums
KICK_R, KICK_L, SNARE = 36, 35, 38
HAT, OHAT, CRASH, CRASH2, RIDE, CHINA = 42, 46, 49, 57, 51, 52
TOMS = [50, 48, 47, 45, 43, 41]   # high -> floor


def note_num(name):
    """'C#6' / 'B#5' / 'D5' -> MIDI number (C4 = 60)."""
    pc, rest = NOTE_PC[name[0]], name[1:]
    if rest[0] == "#":
        pc, rest = pc + 1, rest[1:]
    elif rest[0] == "b":
        pc, rest = pc - 1, rest[1:]
    return 12 * (int(rest) + 1) + pc


def parse(spec):
    out = []
    for tok in spec.split():
        n, d = tok.split(":")
        out.append((n, float(d)))
    return out


def harmony_note(m, chord):
    """Twin-guitar harmony under melody note m: nearest chord tone 3-9 semitones below,
    or a diatonic third below for passing notes."""
    tones = CHORDS[chord][3]
    if m % 12 in tones:
        for h in range(m - 3, m - 10, -1):
            if h % 12 in tones:
                return h
    scale = C_SHARP_HARMONIC if chord.startswith("G#") else C_SHARP_MINOR
    below = [n for n in range(m - 5, m - 2) if n % 12 in scale]
    return below[0] if below else m - 4


# --------------------------------------------------------------------------
# Pattern generators -> [(start, length, note, velocity_scale)] per bar, plus track tag
# --------------------------------------------------------------------------
def guitar_bar(style, chord, i, n):
    """Returns (open_notes, muted_notes)."""
    pc = CHORDS[chord][0]
    last = i == n - 1
    op, mu = [], []
    if style is None:
        pass
    elif style == "drive8":
        op = [(k, 0.9, p, 1.0 if k % 2 == 0 else 0.85) for k in range(8) for p in pc]
    elif style in ("verse", "breakdown"):
        grid = (VERSE_GRID if style == "verse" else BREAK_GRID)[i % (2 if style == "verse" else 1)]
        for s, ch in enumerate(grid):
            if ch == "C":
                op += [(s * 0.5, 1.0 if style == "verse" else 1.4, p, 1.0) for p in pc]
            elif ch == "c":
                mu.append((s * 0.5, 0.45, LOW, 0.95))
        if style == "breakdown" and last:          # stop for the drum fill
            op = [x for x in op if x[0] < 4]
            mu = [x for x in mu if x[0] < 4]
    elif style == "ring":
        if last:
            op = [(k, 0.9, p, 1.0) for k in range(8) for p in pc]
        else:
            op = [(0, 8, p, 1.0) for p in pc]
    elif style == "thrash":
        riff = RIFF_G if chord.startswith("G#") else RIFF_CM
        mu = [(s * 0.5, 0.45, nt, 1.0 if s % 4 == 0 else 0.85) for s, nt in enumerate(riff)]
    elif style == "chug16":
        mu = [(s * 0.5, 0.45, p, 1.0 if s % 4 == 0 else 0.8) for s in range(16) for p in pc[:2]]
    elif style == "end":
        op = [(0, 16, p, 1.0) for p in pc] if i == 0 else []
    else:
        raise ValueError(style)
    return op, mu


def bass_bar(style, chord, i, n):
    root = CHORDS[chord][1]
    if style is None:
        return []
    if style == "drive8":
        return [(k, 0.9, root, 1.0 if k % 2 == 0 else 0.85) for k in range(8)]
    if style in ("verse", "breakdown"):
        grid = (VERSE_GRID if style == "verse" else BREAK_GRID)[i % (2 if style == "verse" else 1)]
        hits = [s for s, ch in enumerate(grid) if ch in "Cc"] + [len(grid)]
        out = [(s * 0.5, min(0.9, (nxt - s) * 0.5), root if grid[s] == "C" else LOW - 12, 1.0)
               for s, nxt in zip(hits, hits[1:])]
        return [x for x in out if not (style == "breakdown" and i == n - 1 and x[0] >= 4)]
    if style == "ring":
        return [(k, 0.9, root, 0.9) for k in range(8)] if i == n - 1 else [(0, 8, root, 0.95)]
    if style == "thrash":
        riff = RIFF_G if chord.startswith("G#") else RIFF_CM
        return [(s * 0.5, 0.45, nt - 12, 0.95) for s, nt in enumerate(riff)]
    if style == "end":
        return [(0, 16, root, 1.0)] if i == 0 else []
    raise ValueError(style)


def drum_bar(style, i, n, first):
    last = i == n - 1
    h = []

    def fill(start=4.0, toms=True):
        seq = [SNARE, SNARE, SNARE, SNARE] + (TOMS[1:5] if toms else [SNARE] * 4)
        return [(start + k * 0.5, 0.5, seq[k], 0.7 + 0.04 * k) for k in range(8)] + [
            (start + k * 0.5, 0.5, KICK_R if k % 2 == 0 else KICK_L, 0.8) for k in range(0, 8, 2)]

    if style == "intro_build":
        if last:
            h = [(4 + k * 0.5, 0.5, SNARE, 0.35 + 0.08 * k) for k in range(8)]
        return h
    if style in ("double", "double_ride"):
        h = [(s * 0.5, 0.5, KICK_R if s % 2 == 0 else KICK_L, 0.95 if s % 4 == 0 else 0.82) for s in range(16)]
        h += [(2, 1, SNARE, 1.0), (6, 1, SNARE, 1.0)]
        if style == "double":
            h += [(k, 1, HAT, 0.75 if k % 2 == 0 else 0.6) for k in range(8)]
            if i % 2 == 0:
                h.append((0, 8, CRASH if i % 4 == 0 else CRASH2, 0.95))
        else:
            h += [(k, 1, RIDE, 0.8 if k % 2 == 0 else 0.65) for k in range(8)]
            if i % 4 == 0:
                h.append((0, 8, CRASH, 0.95))
    elif style == "riff":
        grid = VERSE_GRID[i % 2]
        h = [(s * 0.5, 0.5, KICK_R if s % 2 == 0 else KICK_L, 0.95) for s, c in enumerate(grid) if c in "Cc"]
        h += [(2, 1, SNARE, 1.0), (6, 1, SNARE, 1.0)] + [(k, 1, HAT, 0.7) for k in range(8)]
        h += [(s * 0.5, 0.5, CHINA, 0.55) for s, c in enumerate(grid) if c == "C"]
    elif style == "halftime":
        if i >= n - 2:                       # snare build: 8ths, then 16ths
            step = 1 if i == n - 2 else 0.5
            cnt = int(8 / step)
            h = [(k * step, step, SNARE, 0.5 + 0.5 * k / cnt) for k in range(cnt)]
            h += [(k * 2, 1, KICK_R, 0.9) for k in range(4)]
            return h + ([(0, 8, CRASH, 0.8)] if i == n - 2 else [])
        h = [(0, 1, KICK_R, 1.0), (3, 1, KICK_R, 0.85), (4, 1, SNARE, 1.0)]
        h += [(k * 2, 2, RIDE, 0.75) for k in range(4)]
    elif style == "skank":
        for k in range(8):
            h.append((k, 1, KICK_R if k % 2 == 0 else SNARE, 1.0 if k % 2 == 0 else 0.9))
        h += [(k * 2, 2, RIDE, 0.7) for k in range(4)]
        if i % 2 == 0:
            h.append((0, 8, CRASH2, 0.95))
    elif style == "breakdown":
        grid = BREAK_GRID[0]
        h = [(s * 0.5, 0.5, KICK_R, 1.0) for s, c in enumerate(grid) if c in "Cc"]
        h += [(4, 2, SNARE, 1.0), (0, 4, CHINA, 0.95), (4, 4, CHINA, 0.8)]
        if i % 4 == 0:
            h.append((0, 8, CRASH, 1.0))
        if last:
            return _dedupe([x for x in h if x[0] < 4] + fill(4.0))
    elif style == "end":
        if i == 0:
            return [(0, 16, CRASH, 1.0), (0, 16, CRASH2, 0.9), (0, 16, CHINA, 0.7), (0, 1, KICK_R, 1.0),
                    (0, 1, KICK_L, 1.0), (0, 1, TOMS[5], 0.9)]
        return []
    else:
        raise ValueError(style)
    if last and style in ("double", "double_ride", "riff", "skank"):
        h = [x for x in h if x[0] < 4 or x[2] in (KICK_R, KICK_L)] + fill(4.0)
    if first and not any(x[2] in (CRASH, CRASH2) and x[0] == 0 for x in h):
        h.append((0, 8, CRASH, 1.0))
    return _dedupe(h)


def _dedupe(hits):
    """One hit per (time, drum): keep the loudest."""
    best = {}
    for x in hits:
        k = (x[0], x[2])
        if k not in best or x[3] > best[k][3]:
            best[k] = x
    return sorted(best.values())


# --------------------------------------------------------------------------
def build():
    """Return dict of parts: name -> list of (start, len, note, vel), plus markers."""
    parts = {k: [] for k in ("lead1", "lead2", "gtr_open", "gtr_mute", "bass", "strings", "drums")}
    solo_notes = []            # (start, len) of long solo notes, for vibrato
    markers, chord_marks = [], []
    bar = 0
    for sec in SECTIONS:
        n = len(sec["chords"])
        if sec["name"]:
            markers.append((bar * BAR, sec["name"]))
        v = sec["vel"]
        for i, ch in enumerate(sec["chords"]):
            t0 = (bar + i) * BAR
            chord_marks.append((t0, ch))
            op, mu = guitar_bar(sec["gtr"], ch, i, n)
            parts["gtr_open"] += [(t0 + s, l, p, int(min(127, v * 0.9 * sc))) for s, l, p, sc in op]
            parts["gtr_mute"] += [(t0 + s, l, p, int(min(127, v * 0.95 * sc))) for s, l, p, sc in mu]
            parts["bass"] += [(t0 + s, l, p, int(min(127, v * sc))) for s, l, p, sc in bass_bar(sec["bass"], ch, i, n)]
            parts["drums"] += [(t0 + s, l, p, int(min(127, v * sc)))
                               for s, l, p, sc in drum_bar(sec["drums"], i, n, i == 0 and bar > 0)]
            if sec["strings"]:
                pad = CHORDS[ch][2]
                parts["strings"] += [(t0, BAR, p, int(v * sec["strings"] * 0.8)) for p in pad]
        # lead melody (can cross bar lines)
        if len(sec["lead"]) == n:
            for bi, spec in enumerate(sec["lead"]):
                assert abs(sum(d for _, d in parse(spec)) - BAR) < 1e-9, (sec["name"], "bar", bi + 1)
        cells = [c for spec in sec["lead"] for c in parse(spec)]
        assert abs(sum(d for _, d in cells) - n * BAR) < 1e-9, (sec["name"], sum(d for _, d in cells))
        pos = bar * BAR
        for k, (nm, d) in enumerate(cells):
            if nm != "r":
                m = note_num(nm)
                ch = sec["chords"][int((pos - bar * BAR) // BAR)]
                harm = sec["harm"] is True or (sec["harm"] == "last4" and pos >= (bar + n - 4) * BAR)
                if sec["trem"]:
                    pieces = [(pos + j * 0.5, 0.5) for j in range(int(d * 2))]
                else:
                    pieces = [(pos, d)]
                for ps, pl in pieces:
                    vel = int(min(127, v * (0.85 if sec["trem"] else 1.0)))
                    parts["lead1"].append((ps, pl, m, vel))
                    if harm:
                        parts["lead2"].append((ps, pl, harmony_note(m, ch), int(vel * 0.92)))
                if sec.get("solo") and d >= 2:
                    solo_notes.append((pos, d))
                elif not sec["trem"] and d >= 4:
                    solo_notes.append((pos, d))
            pos += d
        bar += n
    return parts, solo_notes, markers, chord_marks, bar


PART_INFO = {  # track name, channel, GM program, bank
    "lead1":    ("Lead Guitar 1", 0, 27, 0),     # clean DI -> amp sim when rendering
    "lead2":    ("Lead Guitar 2 (harmony)", 1, 27, 0),
    "gtr_open": ("Rhythm Guitar (open)", 2, 27, 0),
    "gtr_mute": ("Rhythm Guitar (palm-muted)", 3, 28, 0),
    "bass":     ("Bass", 4, 34, 0),
    "strings":  ("Strings", 5, 48, 0),
    "drums":    ("Drums", 9, 16, 128),           # Power kit
}


def _delta(evs):
    out, last = [], 0
    for tick, _, msg in sorted(evs, key=lambda e: (e[0], e[1])):
        out.append(msg.copy(time=tick - last))
        last = tick
    return out


def part_track(key, notes, total_bars, vibrato=()):
    """Build one mido track for a part (notes as (start, len, note, vel) in eighths)."""
    import mido

    name, ch, prog, _ = PART_INFO[key]
    tr = mido.MidiTrack()
    tr.append(mido.MetaMessage("track_name", name=name, time=0))
    tr.append(mido.Message("program_change", channel=ch, program=prog, time=0))
    tr.append(mido.Message("control_change", channel=ch, control=7, value=110, time=0))
    evs = []
    for s, l, nt, vel in notes:
        on, off = max(0, int(round(s * EIGHTH))), max(1, int(round((s + l) * EIGHTH)) - 8)
        evs.append((on, 2, mido.Message("note_on", channel=ch, note=nt, velocity=vel)))
        evs.append((off, 1, mido.Message("note_off", channel=ch, note=nt, velocity=0)))
    for s, l in vibrato:                              # mod-wheel vibrato that swells in
        a, b = int(s * EIGHTH + EIGHTH), int((s + l) * EIGHTH)
        steps = max(2, (b - a) // 60)
        for k in range(steps):
            val = int(90 * k / (steps - 1))
            evs.append((a + (b - a) * k // steps, 0, mido.Message("control_change", channel=ch, control=1, value=val)))
        evs.append((b, 0, mido.Message("control_change", channel=ch, control=1, value=0)))
    evs.append((total_bars * BAR * EIGHTH, 3, mido.MetaMessage("end_of_track")))
    tr += _delta(evs)
    return tr


def write_midi(path):
    import mido

    parts, vib, markers, chords, total = build()
    mid = mido.MidiFile(type=1, ticks_per_beat=TPB)
    meta = mido.MidiTrack()
    meta.append(mido.MetaMessage("track_name", name="Last Stand", time=0))
    meta.append(mido.MetaMessage("set_tempo", tempo=mido.bpm2tempo(BPM), time=0))
    meta.append(mido.MetaMessage("time_signature", numerator=4, denominator=4, time=0))
    meta.append(mido.MetaMessage("key_signature", key="C#m", time=0))
    evs = [(int(t * EIGHTH), 0, mido.MetaMessage("marker", text=nm)) for t, nm in markers]
    evs += [(int(t * EIGHTH), 0, mido.MetaMessage("text", text=c)) for t, c in chords]
    evs.append((total * BAR * EIGHTH, 1, mido.MetaMessage("end_of_track")))
    meta += _delta(evs)
    mid.tracks.append(meta)
    for key in PART_INFO:
        mid.tracks.append(part_track(key, parts[key], total, vib if key == "lead1" else ()))
    mid.save(path)
    return mid


if __name__ == "__main__":
    out = Path(__file__).with_name("last_stand.mid")
    m = write_midi(out)
    print(f"wrote {out} - {m.length:.2f}s, {len(m.tracks)} tracks")
