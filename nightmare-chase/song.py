"""Nightmare Chase Theme - song data + MIDI builder.

160 BPM, 4/4, D minor (Phrygian b2 + harmonic-minor V), 80 bars = exactly 2:00.
The last bar (A7b9) resolves back into bar 1 (Dm), so the track loops seamlessly.

Run:  python song.py            -> writes nightmare_chase_theme.mid
"""
from pathlib import Path

BPM = 160
TPB = 480            # MIDI ticks per quarter note
EIGHTH = TPB // 2    # all durations below are counted in eighth notes (8 per bar)
BAR = 8

# --------------------------------------------------------------------------
# Chords: pad voicing (MIDI notes), bass root, ostinato pattern notes
# ostinato = (top, mid, low, neighbor) -> played t m l t m l n t  (3+3+2 feel)
# --------------------------------------------------------------------------
CHORDS = {
    #  name       pad voicing          bass  ostinato (t, m, l, n)
    "Dm":      ([50, 53, 57, 62],      38,   (74, 69, 65, 75)),
    "Dm/C":    ([48, 53, 57, 62],      36,   (74, 69, 72, 75)),
    "Eb":      ([51, 55, 58, 63],      39,   (75, 70, 67, 74)),
    "Eb/D":    ([51, 55, 58, 63],      38,   (75, 70, 67, 74)),
    "A":       ([52, 57, 61, 64],      33,   (76, 73, 69, 77)),
    "A/C#":    ([52, 57, 61, 64],      37,   (76, 73, 69, 77)),
    "A7b9":    ([55, 58, 61, 64],      33,   (76, 73, 70, 77)),
    "Bm7b5":   ([50, 53, 57, 59],      35,   (77, 74, 71, 76)),
    "Bb":      ([50, 53, 58, 62],      34,   (74, 70, 65, 75)),
    "Bb/D":    ([50, 53, 58, 62],      38,   (74, 70, 65, 75)),
    "Ab":      ([51, 56, 60, 63],      32,   (75, 72, 68, 74)),
    "Gm":      ([50, 55, 58, 62],      31,   (74, 70, 67, 75)),
    "Gm/D":    ([50, 55, 58, 62],      38,   (74, 70, 67, 75)),
    "C#dim7":  ([52, 55, 58, 61],      37,   (76, 73, 70, 79)),
}

# --------------------------------------------------------------------------
# Melodies: list of bars, each bar = list of (note, eighths); "r" = rest
# --------------------------------------------------------------------------
CREEP_IN = [
    [("r", 8)], [("r", 8)], [("r", 8)], [("r", 8)],
    [("D6", 8)], [("Eb6", 8)], [("Eb6", 4), ("D6", 4)], [("C#6", 8)],
]

RUN_A1 = [
    [("D5", 3), ("F5", 3), ("A5", 2)],
    [("C#6", 3), ("Bb5", 3), ("A5", 2)],
    [("G5", 3), ("F5", 3), ("E5", 2)],
    [("F5", 3), ("D5", 3), ("B4", 2)],
    [("D5", 3), ("F5", 3), ("Bb5", 2)],
    [("G5", 3), ("Bb5", 3), ("Eb6", 2)],
    [("C#6", 6), ("A5", 2)],
    [("Bb5", 2), ("A5", 2), ("G5", 2), ("E5", 2)],
]
RUN_A2 = RUN_A1[:4] + [
    [("F5", 3), ("D5", 3), ("Bb4", 2)],
    [("Eb5", 3), ("G5", 3), ("Bb5", 2)],
    [("A5", 3), ("C#6", 3), ("E6", 2)],
    [("F6", 2), ("E6", 2), ("C#6", 2), ("A5", 2)],
]

STAB_B1 = [
    [("D5", 1), ("D5", 1), ("r", 1), ("D5", 1), ("r", 1), ("F5", 1), ("E5", 1), ("D5", 1)],
    [("Eb5", 3), ("D5", 3), ("Bb4", 2)],
    [("D5", 1), ("D5", 1), ("r", 1), ("D5", 1), ("r", 1), ("A5", 1), ("G5", 1), ("F5", 1)],
    [("G5", 3), ("Eb5", 3), ("Bb4", 2)],
    [("D6", 2), ("Bb5", 2), ("F5", 2), ("D5", 2)],
    [("C6", 2), ("Ab5", 2), ("Eb5", 2), ("C5", 2)],
    [("A5", 2), ("C#6", 2), ("E6", 4)],
    [("Bb5", 2), ("A5", 2), ("G5", 2), ("C#5", 2)],
]
STAB_B2 = [
    [("D6", 1), ("D6", 1), ("r", 1), ("D6", 1), ("r", 1), ("F6", 1), ("E6", 1), ("D6", 1)],
    [("Eb6", 3), ("D6", 3), ("Bb5", 2)],
    [("D6", 1), ("D6", 1), ("r", 1), ("D6", 1), ("r", 1), ("A6", 1), ("G6", 1), ("F6", 1)],
    [("G6", 3), ("Eb6", 3), ("Bb5", 2)],
    [("F6", 2), ("D6", 2), ("Bb5", 2), ("F5", 2)],
    [("Eb6", 2), ("C6", 2), ("Ab5", 2), ("Eb5", 2)],
    [("E6", 3), ("C#6", 3), ("A5", 2)],
    [("Bb5", 1), ("A5", 1), ("G5", 1), ("F5", 1), ("E5", 1), ("D5", 1), ("C#5", 2)],
]

HIDE_BOX = [
    [("A5", 4), ("F5", 4)],
    [("Bb5", 4), ("F5", 4)],
    [("G5", 4), ("Bb5", 2), ("A5", 2)],
    [("A5", 6), ("E5", 2)],
    [("F5", 4), ("E5", 2), ("D5", 2)],
    [("D5", 4), ("F5", 4)],
    [("Eb5", 4), ("G5", 2), ("Bb5", 2)],
    [("A5", 4), ("C#6", 4)],
]

ESCAPE_LEAD = [
    [("A5", 2), ("D6", 2), ("F6", 3), ("E6", 1)],
    [("D6", 3), ("Bb5", 3), ("G5", 2)],
    [("G5", 2), ("Bb5", 2), ("Eb6", 3), ("D6", 1)],
    [("C#6", 6), ("A5", 2)],
    [("A5", 2), ("D6", 2), ("F6", 3), ("E6", 1)],
    [("F6", 3), ("D6", 3), ("Bb5", 2)],
    [("C#6", 2), ("E6", 2), ("G6", 3), ("F6", 1)],
    [("E6", 4), ("C#6", 2), ("A5", 2)],
]
ESCAPE_HARM = [
    [("F5", 2), ("A5", 2), ("D6", 3), ("C#6", 1)],
    [("Bb5", 3), ("G5", 3), ("D5", 2)],
    [("Eb5", 2), ("G5", 2), ("Bb5", 3), ("Bb5", 1)],
    [("A5", 6), ("E5", 2)],
    [("F5", 2), ("A5", 2), ("D6", 3), ("C#6", 1)],
    [("D6", 3), ("Bb5", 3), ("F5", 2)],
    [("Bb5", 2), ("C#6", 2), ("E6", 3), ("D6", 1)],
    [("C#6", 4), ("A5", 2), ("E5", 2)],
]

CREEP_OUT = [
    [("D6", 8)], [("Eb6", 8)], [("D6", 8)], [("Eb6", 8)],
    [("D6", 4), ("Eb6", 4)], [("D6", 4), ("Eb6", 4)], [("D6", 8)], [("C#6", 8)],
]

REST8 = [[("r", 8)]] * 8

# --------------------------------------------------------------------------
# Song structure (80 bars). Each section:
#   name, chords (one per bar), lead, harmony, music box, bass style, velocity
# --------------------------------------------------------------------------
SECTIONS = [
    dict(name="Intro - Something's Watching",
         chords=["Dm", "Dm", "Eb/D", "Dm", "Dm", "Dm", "Eb/D", "A7b9"],
         lead=CREEP_IN, harm=REST8, box=REST8, ost=True, bass="heartbeat", vel=70),
    dict(name="Chase A - Run",
         chords=["Dm", "A/C#", "Dm/C", "Bm7b5", "Bb", "Eb", "A", "A7b9"] * 2,
         lead=RUN_A1 + RUN_A2, harm=REST8 * 2, box=REST8 * 2, ost=True, bass="drive", vel=92),
    dict(name="Chase B - It Sees You",
         chords=["Dm", "Eb", "Dm", "Eb", "Bb", "Ab", "A", "A7b9"] * 2,
         lead=STAB_B1 + STAB_B2, harm=REST8 * 2, box=REST8 * 2, ost=True, bass="gallop", vel=104),
    dict(name="Breakdown - Hide",
         chords=["Dm", "Bb/D", "Gm/D", "A/C#", "Dm", "Bb/D", "Eb/D", "A7b9"],
         lead=REST8, harm=REST8, box=HIDE_BOX, ost=False, bass="pedal", vel=72),
    dict(name="Climax - No Escape",
         chords=["Dm", "Gm", "Eb", "A", "Dm", "Bb", "C#dim7", "A7b9"] * 3,
         lead=ESCAPE_LEAD * 3, harm=REST8 + ESCAPE_HARM * 2, box=REST8 * 3,
         ost=True, bass="octaves", vel=114),
    dict(name="Outro - Footsteps (loops to Intro)",
         chords=["Dm", "Eb/D", "Dm", "Eb/D", "Dm", "Eb/D", "Bb", "A7b9"],
         lead=CREEP_OUT, harm=REST8, box=REST8, ost=True, bass="heartbeat", vel=78),
]

NOTE_PC = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def note_num(name):
    """'C#6' / 'Eb5' / 'D5' -> MIDI number (C4 = 60)."""
    pc = NOTE_PC[name[0]]
    rest = name[1:]
    if rest[0] == "#":
        pc, rest = pc + 1, rest[1:]
    elif rest[0] == "b":
        pc, rest = pc - 1, rest[1:]
    return 12 * (int(rest) + 1) + pc


def bass_pattern(style, root):
    """Return list of (start_eighth, length_eighths, note, velocity_scale) for one bar."""
    if style == "heartbeat":            # lub-dub, lub-dub
        return [(0, 1, root, 1.0), (1, 1, root, 0.8), (4, 1, root, 1.0), (5, 1, root, 0.8)]
    if style == "drive":                # straight 8ths, 3+3+2 accents
        return [(i, 1, root, 1.0 if i in (0, 3, 6) else 0.7) for i in range(8)]
    if style == "gallop":               # 16ths, 3+3+2 accents
        return [(i / 2, 0.5, root, 1.0 if i in (0, 6, 12) else 0.65) for i in range(16)]
    if style == "pedal":                # held whole note
        return [(0, 8, root, 0.9)]
    if style == "octaves":              # root / octave-up 8ths
        return [(i, 1, root + (12 if i % 2 else 0), 1.0 if i % 2 == 0 else 0.8) for i in range(8)]
    raise ValueError(style)


def build_events():
    """Flatten the song into per-track note lists: (start_eighth, len_eighths, note, vel)."""
    tracks = {k: [] for k in ("lead", "harm", "box", "ost", "pad", "bass")}
    chord_marks, section_marks = [], []
    bar = 0
    for sec in SECTIONS:
        n = len(sec["chords"])
        assert len(sec["lead"]) == len(sec["harm"]) == len(sec["box"]) == n, sec["name"]
        section_marks.append((bar * BAR, sec["name"]))
        v = sec["vel"]
        for i, ch in enumerate(sec["chords"]):
            t0 = (bar + i) * BAR
            pad, root, (t, m, l, nb) = CHORDS[ch]
            chord_marks.append((t0, ch))
            tracks["pad"] += [(t0, BAR, p, int(v * 0.55)) for p in pad]
            for s, ln, nt, sc in bass_pattern(sec["bass"], root):
                tracks["bass"].append((t0 + s, ln, nt, int(min(127, v * sc))))
            if sec["ost"]:
                for j, nt in enumerate((t, m, l, t, m, l, nb, t)):
                    tracks["ost"].append((t0 + j, 1, nt, int(v * (0.75 if j in (0, 3, 6) else 0.6))))
            for key, scale in (("lead", 1.0), ("harm", 0.8), ("box", 0.9)):
                pos = t0
                cells = sec[key][i]
                assert sum(d for _, d in cells) == BAR, (sec["name"], key, i + 1)
                for nm, d in cells:
                    if nm != "r":
                        tracks[key].append((pos, d, note_num(nm), int(min(127, v * scale))))
                    pos += d
        bar += n
    return tracks, chord_marks, section_marks, bar


TRACK_INFO = {  # name, channel, GM program (0-based)
    "lead": ("Lead Melody", 0, 81),     # Lead 2 (sawtooth)
    "harm": ("Lead Harmony", 1, 81),
    "box":  ("Music Box", 2, 10),       # Music Box
    "ost":  ("Ostinato Hook", 3, 80),   # Lead 1 (square)
    "pad":  ("Chords", 4, 48),          # String Ensemble 1
    "bass": ("Bass", 5, 38),            # Synth Bass 1
}


def write_midi(path):
    import mido

    tracks, chord_marks, section_marks, total_bars = build_events()
    mid = mido.MidiFile(type=1, ticks_per_beat=TPB)

    meta = mido.MidiTrack()
    meta.append(mido.MetaMessage("track_name", name="Nightmare Chase Theme", time=0))
    meta.append(mido.MetaMessage("set_tempo", tempo=mido.bpm2tempo(BPM), time=0))
    meta.append(mido.MetaMessage("time_signature", numerator=4, denominator=4, time=0))
    meta.append(mido.MetaMessage("key_signature", key="Dm", time=0))
    evs = [(int(t * EIGHTH), 0, mido.MetaMessage("marker", text=name)) for t, name in section_marks]
    evs.append((total_bars * BAR * EIGHTH, 1, mido.MetaMessage("end_of_track")))
    meta += _delta(evs)
    mid.tracks.append(meta)

    for key, (name, ch, prog) in TRACK_INFO.items():
        tr = mido.MidiTrack()
        tr.append(mido.MetaMessage("track_name", name=name, time=0))
        tr.append(mido.Message("program_change", channel=ch, program=prog, time=0))
        evs = []
        if key == "pad":
            evs += [(int(t * EIGHTH), 0, mido.MetaMessage("text", text=c)) for t, c in chord_marks]
        for s, ln, nt, vel in tracks[key]:
            on, off = int(s * EIGHTH), int((s + ln) * EIGHTH) - 10   # tiny gap between repeats
            evs.append((on, 2, mido.Message("note_on", channel=ch, note=nt, velocity=vel)))
            evs.append((off, 1, mido.Message("note_off", channel=ch, note=nt, velocity=0)))
        evs.append((total_bars * BAR * EIGHTH, 3, mido.MetaMessage("end_of_track")))
        tr += _delta(evs)
        mid.tracks.append(tr)

    mid.save(path)
    return mid


def _delta(evs):
    """(abs_tick, order, msg) -> messages with delta times; note_off sorts before note_on."""
    out, last = [], 0
    for tick, _, msg in sorted(evs, key=lambda e: (e[0], e[1])):
        out.append(msg.copy(time=tick - last))
        last = tick
    return out


if __name__ == "__main__":
    out = Path(__file__).with_name("nightmare_chase_theme.mid")
    m = write_midi(out)
    print(f"wrote {out} - {m.length:.2f}s, {len(m.tracks)} tracks")
