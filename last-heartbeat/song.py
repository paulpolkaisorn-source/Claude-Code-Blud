"""Last Heartbeat - Last Survivor theme: song data + MIDI builder.

168 BPM, 4/4, E minor, 84 bars = exactly 2:00.
Intro - Verse - Pre-Chorus - Chorus - Post-Chorus - Bridge - Solo - Outro.
The intro and outro quote the ostinato hook from the Nightmare Chase Theme.

Run:  python song.py            -> writes last_heartbeat.mid
"""
from pathlib import Path

BPM = 168
TPB = 480            # MIDI ticks per quarter note
EIGHTH = TPB // 2    # all durations are counted in eighth notes (8 per bar)
BAR = 8

# --------------------------------------------------------------------------
# Chords: power chord (guitar), pad voicing, bass root
# --------------------------------------------------------------------------
CHORDS = {
    #  name      guitar power chord   pad voicing           bass
    "Em":     ([40, 47, 52],         [52, 55, 59, 64],     28),
    "F":      ([41, 48, 53],         [53, 57, 60, 65],     29),
    "F/E":    ([40, 48, 53],         [53, 57, 60, 64],     28),
    "Fmaj7":  ([41, 48, 53],         [52, 57, 60, 65],     29),
    "G":      ([43, 50, 55],         [55, 59, 62, 67],     31),
    "Em/G":   ([43, 47, 52],         [52, 55, 59, 64],     31),
    "Am":     ([45, 52, 57],         [52, 57, 60, 64],     33),
    "B":      ([47, 54, 59],         [51, 54, 59, 63],     35),
    "Bsus4":  ([47, 54, 59],         [52, 54, 59, 64],     35),
    "B7":     ([47, 54, 59],         [51, 54, 57, 63],     35),
    "B7b9":   ([47, 54, 59],         [51, 57, 60, 63],     35),
    "C":      ([48, 55, 60],         [52, 55, 60, 64],     36),
    "Cmaj7":  ([48, 55, 60],         [52, 55, 59, 64],     36),
    "D":      ([50, 57, 62],         [54, 57, 62, 66],     38),
}

# Ostinato hook from the Nightmare Chase Theme, moved up to E minor:
# played top-mid-low-top-mid-low-neighbor-top (3+3+2 accents)
HOOK = {
    "Em":   (76, 71, 67, 77),   # E5 B4 G4 ... F5
    "F":    (77, 72, 69, 76),   # F5 C5 A4 ... E5
    "F/E":  (77, 72, 69, 76),
    "G":    (74, 71, 67, 76),   # D5 B4 G4 ... E5
    "B":    (78, 75, 71, 79),   # F#5 D#5 B4 ... G5
    "B7":   (78, 75, 71, 79),
    "B7b9": (78, 75, 72, 79),   # F#5 D#5 C5 ... G5
}

# --------------------------------------------------------------------------
# Vocal lines: (lyric with syllables split by "-", notes "PITCH:eighths")
# every line = 2 bars = 16 eighths, one note per syllable ("r" = rest)
# --------------------------------------------------------------------------
REST_LINE = ("", "r:16")

VERSE = [
    ("All my friends are sta-tic on the line",      "r:1 E4:1 E4:1 G4:2 F#4:1 G4:1 A4:1 G4:1 F#4:1 E4:6"),
    ("Ev-ery door I o-pen's out of time",           "r:1 G4:1 G4:1 B4:2 A4:1 G4:1 A4:1 B4:1 A4:1 G4:6"),
    ("Gen-er-a-tor's hum-ming half a song",         "A4:1 A4:1 G4:1 A4:1 C5:2 B4:1 A4:1 G4:1 A4:7"),
    ("One more wire and the lights come on",        "r:1 F#4:1 F#4:1 B4:2 A4:1 G4:1 F#4:2 E4:1 D#4:6"),
    ("But I hear him drag-ging steel on stone",     "r:1 E4:1 E4:1 E4:1 F#4:1 G4:2 F#4:1 E4:2 D4:1 E4:5"),
    ("Hea-vy foot-steps fol-low me a-lone",         "G4:1 G4:1 B4:2 A4:1 G4:1 E4:1 G4:1 A4:1 B4:7"),
    ("There's a heart-beat lou-der than my own",    "A4:1 A4:1 C5:2 B4:1 A4:1 G4:1 F4:1 E4:1 F4:7"),
    ("And it knows I'm the last one home",          "r:1 F#4:1 F#4:1 A4:2 G4:1 F#4:1 B4:2 A4:1 F#4:6"),
]
PRE = [
    ("Don't look back, don't make a sound",         "r:2 A4:1 A4:1 C5:2 A4:1 C5:1 D5:1 E5:7"),
    ("Hold my breath, the walls close in",          "r:2 C5:1 C5:1 E5:2 C5:1 E5:1 G5:1 E5:7"),
    ("Twen-ty sec-onds, one more round",            "r:2 D5:1 D5:1 F#5:2 D5:1 F#5:1 G5:1 A5:7"),
    ("Here's where the last stand be-gins",         "B4:1 B4:1 C5:1 D#5:2 F#5:2 E5:1 F#5:8"),
]
HOOK_LINE = "B4:1 B4:1 E5:2 G5:2 F#5:2 E5:1 F#5:1 G5:6"
CHORUS = [
    ("I'm the last heart-beat in the dark",               HOOK_LINE),
    ("Ev-ery breath I take, you're a step too far",       "D5:1 D5:1 G5:2 F#5:1 E5:1 D5:1 D5:1 F#5:2 E5:1 D5:5"),
    ("You can take them all but you won't take me",      "B4:1 B4:1 E5:2 E5:1 G5:1 F#5:1 E5:1 G5:2 E5:1 C5:5"),
    ("I'm the last heart-beat, I'm still free",          "C5:1 C5:1 E5:2 A5:2 G5:2 D#5:1 E5:1 F#5:6"),
    ("I'm the last heart-beat on the run",               HOOK_LINE),
    ("Till the gates swing wide and the night is done",  "D5:1 D5:1 G5:2 A5:2 G5:2 F#5:1 E5:1 F#5:2 E5:1 D5:3"),
    ("You can chase me down to the end of the line",     "C5:1 C5:1 E5:2 E5:1 G5:1 E5:1 G5:1 A5:2 G5:1 F#5:1 A5:4"),
    ("I'm the last heart-beat, I sur-vive",              "B4:1 B4:1 D#5:2 F#5:2 E5:2 D#5:1 E5:1 F#5:6"),
]
RUN_LINE = ("Run, run, don't look be-hind", "E5:2 E5:2 G5:2 E5:2 E5:2 F5:6")
POST = [
    RUN_LINE,
    ("Last one stand-ing, last a-live",             "G5:1 G5:1 E5:2 D5:2 E5:2 F5:2 C5:6"),
    RUN_LINE,
    ("Heart is pound-ing, keep in time",            "D5:1 D5:1 G5:2 F#5:2 E5:2 D#5:2 F#5:6"),
]
BRIDGE = [
    ("Where you gon-na hide when you're all that's left?", "E4:1 E4:1 E4:1 E4:1 F4:2 E4:1 E4:1 C4:2 B3:1 A3:5"),
    ("I can hear your heart, I can hear your breath",      "E4:1 E4:1 G4:2 F#4:1 E4:2 E4:1 E4:1 G4:2 F4:1 E4:4"),
    ("Then come and find me, I'm not a-fraid",             "A4:1 A4:1 G4:1 C5:2 A4:1 A4:1 G4:1 A4:2 E5:6"),
    ("The last heart-beat nev-er fades",                   "B4:1 E5:2 E5:2 F#5:3 D#5:2 E5:2 F#5:4"),
]
OUTRO = [
    ("I'm the last heart-beat in the dark",         HOOK_LINE),
    ("I'm still a-live",                            "B4:2 D5:2 E5:2 D5:10"),
    ("last heart-beat",                             "r:4 E4:2 E4:2 E4:8"),
    REST_LINE,
]

# Guitar solo, bar by bar (notes "PITCH:eighths", 0.5 = sixteenth)
_RUN16 = lambda notes: " ".join(f"{n}:0.5" for n in notes.split())
SOLO = [
    "E5:1 F#5:1 G5:1 B5:1 A5:1 G5:1 F#5:1 E5:1",
    "G5:3 E5:3 C5:2",
    "D5:1 G5:1 B5:1 D6:1 B5:1 G5:1 D5:1 B4:1",
    "A5:6 F#5:2",
    _RUN16("E6 D6 B5 G5 E6 D6 B5 G5 E6 D6 B5 G5") + " E6:1 D6:1",
    _RUN16("C6 B5 G5 E5 C6 B5 G5 E5 C6 B5 G5 E5") + " G5:2",
    "D6:2 B5:1 G5:1 D6:2 E6:2",
    "A5:2 D6:2 E6:4",
    "A5:1 C6:1 E6:1 C6:1 A5:1 E5:1 C5:1 E5:1",
    "F5:1 A5:1 C6:1 A5:1 F5:1 E5:1 F5:2",
    _RUN16("D#5 E5 F#5 G5 A5 B5 C6 D#6") + " E6:4",
    "D#6:2 C6:2 B5:2 A5:1 F#5:1",
]

# --------------------------------------------------------------------------
# Structure (84 bars). vocal = 2-bar lines, lead = 1-bar solo cells.
# who: which voice sings each line (used for the Suno lyric sheet)
# --------------------------------------------------------------------------
SECTIONS = [
    dict(name="Intro", chords=["Em", "Em", "F/E", "Em"],
         vocal=[REST_LINE] * 2, hook=True, gtr=None, bass="heartbeat", drums="heartbeat", pad=0.35, vel=72),
    dict(name=None, chords=["Em", "F", "Em", "B7b9"],
         vocal=[REST_LINE] * 2, hook=True, gtr="hits", bass="whole", drums="rock_fill", pad=0.45, vel=92),
    dict(name="Verse", chords=["Em", "Em", "Cmaj7", "Cmaj7", "Am", "Am", "B", "B",
                               "Em", "Em", "Cmaj7", "Cmaj7", "F", "F", "B", "B7"],
         vocal=VERSE, who="Survivor", hook=False, gtr="palm", bass="drive", drums="halftime", pad=0.3, vel=88),
    dict(name="Pre-Chorus", chords=["Am", "Am", "C", "C", "D", "D", "B", "B7"],
         vocal=PRE, who="Survivor", hook=False, gtr="hits", bass="drive", drums="build", pad=0.45, vel=96),
    dict(name="Chorus", chords=["Em", "C", "G", "D", "Em", "C", "Am", "B",
                                "Em", "C", "G", "D", "C", "D", "B", "B7"],
         vocal=CHORUS, who="Survivor", hook=False, gtr="chug", bass="octaves", drums="drive", pad=0.6, vel=112),
    dict(name="Post-Chorus", chords=["Em", "F", "Em", "F", "Em", "F", "G", "B7"],
         vocal=POST, who="Gang", hook=True, gtr="gallop", bass="gallop", drums="gallop", pad=0.4, vel=110),
    dict(name="Bridge", chords=["Am", "Am", "Em/G", "Em/G", "Fmaj7", "Fmaj7", "Bsus4", "B"],
         vocal=BRIDGE, who=["Killer", "Killer", "Survivor", "Survivor"], hook=False,
         gtr="bridge", bass="whole", drums="sparse", pad=0.55, vel=84),
    dict(name="Solo", chords=["Em", "C", "G", "D", "Em", "C", "G", "D", "Am", "F", "B", "B7"],
         vocal=[REST_LINE] * 6, lead=SOLO, hook=False, gtr="chug", bass="octaves", drums="ride", pad=0.5, vel=110),
    dict(name="Outro", chords=["Em", "C", "G", "D"],
         vocal=OUTRO[:2], who="Survivor", hook=False, gtr="chug", bass="octaves", drums="drive", pad=0.6, vel=104),
    dict(name=None, chords=["Em", "F/E", "Em", "Em"],
         vocal=OUTRO[2:], who="Survivor", hook=True, gtr="last", bass="heartbeat", drums="heartbeat_end", pad=0.35, vel=74),
]

NOTE_PC = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}

# General MIDI drum notes
KICK, SNARE, HAT, OHAT, CRASH, RIDE, TOM_H, TOM_M, TOM_L = 36, 38, 42, 46, 49, 51, 50, 47, 45


def note_num(name):
    """'C#6' / 'Eb5' / 'D5' -> MIDI number (C4 = 60)."""
    pc, rest = NOTE_PC[name[0]], name[1:]
    if rest[0] == "#":
        pc, rest = pc + 1, rest[1:]
    elif rest[0] == "b":
        pc, rest = pc - 1, rest[1:]
    return 12 * (int(rest) + 1) + pc


def parse_cells(spec):
    """'E4:1 r:2 G4:0.5' -> [('E4', 1.0), ('r', 2.0), ('G4', 0.5)]"""
    out = []
    for tok in spec.split():
        n, d = tok.split(":")
        out.append((n, float(d)))
    return out


def syllables(lyric):
    return [s for w in lyric.split() for s in w.split("-")] if lyric else []


# --------------------------------------------------------------------------
# Pattern generators: each returns [(start_eighth, len_eighths, note, vel_scale)]
# --------------------------------------------------------------------------
def bass_bar(style, root, bar_in_sec, bars_in_sec):
    if style == "heartbeat":
        return [(0, 1, root, 1.0), (1, 1, root, 0.8), (4, 1, root, 1.0), (5, 1, root, 0.8)]
    if style == "whole":
        return [(0, 8, root, 0.9)]
    if style == "drive":        # 8ths, 3+3+2 accents (same feel as the chase theme)
        return [(i, 1, root, 1.0 if i in (0, 3, 6) else 0.7) for i in range(8)]
    if style == "octaves":
        return [(i, 1, root + (12 if i % 2 else 0), 1.0 if i % 2 == 0 else 0.8) for i in range(8)]
    if style == "gallop":       # 8th + two 16ths per beat
        out = []
        for b in range(4):
            out += [(b * 2, 1, root, 1.0), (b * 2 + 1, 0.5, root, 0.75), (b * 2 + 1.5, 0.5, root, 0.75)]
        return out
    raise ValueError(style)


def guitar_bar(style, chord, bar_in_sec, bars_in_sec):
    pc = CHORDS[chord][0]
    last = bar_in_sec == bars_in_sec - 1
    if style is None:
        return []
    if style == "hits":         # ring out a power chord each bar, 8th chugs in the last bar
        if last:
            return [(i, 1, n, 1.0 if i in (0, 3, 6) else 0.8) for i in range(8) for n in pc]
        return [(0, 8, n, 1.0) for n in pc]
    if style == "palm":         # palm-muted root+5th, 3+3+2 accents
        return [(i, 0.6, n, 1.0 if i in (0, 3, 6) else 0.65) for i in range(8) for n in pc[:2]]
    if style == "chug":
        return [(i, 0.9, n, 1.0 if i in (0, 3, 6) else 0.8) for i in range(8) for n in pc]
    if style == "gallop":
        out = []
        for b in range(4):
            out += [(b * 2, 1, n, 1.0) for n in pc]
            out += [(b * 2 + 1, 0.45, n, 0.7) for n in pc[:2]]
            out += [(b * 2 + 1.5, 0.45, n, 0.7) for n in pc[:2]]
        return out
    if style == "bridge":       # silent, then hits in the last two bars
        if bar_in_sec >= bars_in_sec - 2:
            return [(i * 2, 2, n, 0.9) for i in range(4) for n in pc]
        return []
    if style == "last":         # one final chord that rings out
        return [(0, 8, n, 1.0) for n in pc] if bar_in_sec == 0 else []
    raise ValueError(style)


def drum_bar(style, bar_in_sec, bars_in_sec, first_of_section):
    hits = []
    last = bar_in_sec == bars_in_sec - 1

    def fill(start=4):
        return [(start + i * 0.5, 0.5, SNARE if i < 4 else (TOM_H, TOM_M, TOM_L, TOM_L)[i - 4],
                 0.6 + 0.05 * i) for i in range(8)]

    if style in ("heartbeat", "heartbeat_end"):
        if style == "heartbeat_end" and bar_in_sec == bars_in_sec - 1:
            return [(0, 1, KICK, 0.9), (1, 1, KICK, 0.7)]          # the last heartbeat
        hits = [(0, 1, KICK, 1.0), (1, 1, KICK, 0.75), (4, 1, KICK, 1.0), (5, 1, KICK, 0.75)]
        if style == "heartbeat_end" and bar_in_sec == 0:
            hits.append((0, 8, CRASH, 0.9))
        return hits
    if style == "rock_fill":
        hits = [(0, 1, KICK, 1.0), (4, 1, KICK, 1.0), (2, 1, SNARE, 1.0), (6, 1, SNARE, 1.0)]
        hits += [(i, 1, HAT, 0.6) for i in range(8)]
        if bar_in_sec == 0:
            hits.append((0, 8, CRASH, 1.0))
        if last:
            hits = [h for h in hits if h[0] < 4] + fill()
        return hits
    if style == "halftime":
        hits = [(0, 1, KICK, 1.0), (3, 1, KICK, 0.8), (4, 1, SNARE, 1.0)]
        hits += [(i, 1, HAT, 0.7 if i % 2 == 0 else 0.5) for i in range(8)]
        if last:
            hits = [h for h in hits if h[0] < 4] + fill()
    elif style == "build":
        hits = [(0, 1, KICK, 1.0), (4, 1, KICK, 1.0), (2, 1, SNARE, 0.9), (6, 1, SNARE, 0.9)]
        hits += [(i, 1, HAT, 0.6) for i in range(8)]
        if bar_in_sec >= bars_in_sec - 2:                      # snare 8ths, then 16ths
            step = 1 if bar_in_sec == bars_in_sec - 2 else 0.5
            n = int(8 / step)
            hits = [(0, 1, KICK, 1.0), (4, 1, KICK, 1.0)] + [
                (i * step, step, SNARE, 0.55 + 0.45 * i / n) for i in range(n)]
    elif style == "drive":
        hits = [(i * 2, 1, KICK, 1.0) for i in range(4)] + [(2, 1, SNARE, 1.0), (6, 1, SNARE, 1.0)]
        hits += [(i * 2 + 1, 1, OHAT, 0.6) for i in range(4)] + [(i * 2, 1, HAT, 0.5) for i in range(4)]
        if bar_in_sec % 4 == 0:
            hits.append((0, 8, CRASH, 0.9))
        if last:
            hits = [h for h in hits if h[0] < 4 and h[2] != CRASH] + fill()
    elif style == "gallop":
        for b in range(4):
            hits += [(b * 2, 1, KICK, 1.0), (b * 2 + 1, 0.5, KICK, 0.7), (b * 2 + 1.5, 0.5, KICK, 0.7)]
        hits += [(2, 1, SNARE, 1.0), (6, 1, SNARE, 1.0), (0, 8, CRASH, 0.8 if bar_in_sec % 2 == 0 else 0.6)]
        if last:
            hits = [h for h in hits if h[0] < 4] + fill()
    elif style == "sparse":
        hits = [(0, 1, KICK, 0.9), (4, 1, SNARE, 0.5)] + [(i * 2, 1, HAT, 0.45) for i in range(4)]
        if bar_in_sec >= bars_in_sec - 2:
            hits = [(i, 1, KICK, 0.8) for i in range(8)] + [(2, 1, SNARE, 0.8), (6, 1, SNARE, 0.8)]
            if last:
                hits = [h for h in hits if h[0] < 4] + fill()
    elif style == "ride":
        hits = [(i, 1, KICK, 0.9 if i % 2 == 0 else 0.75) for i in range(8)]
        hits += [(2, 1, SNARE, 1.0), (6, 1, SNARE, 1.0)] + [(i, 1, RIDE, 0.6) for i in range(8)]
        if bar_in_sec % 4 == 0:
            hits.append((0, 8, CRASH, 0.9))
        if last:
            hits = [h for h in hits if h[0] < 4 and h[2] != CRASH] + fill()
    else:
        raise ValueError(style)
    if first_of_section and not any(h[2] == CRASH for h in hits):
        hits.append((0, 8, CRASH, 1.0))
    return hits


# --------------------------------------------------------------------------
def build_events():
    """Flatten the song into per-track note lists: (start_eighth, len_eighths, note, vel)."""
    keys = ("vocal", "lead", "hook", "gtr", "pad", "bass", "drums")
    tracks = {k: [] for k in keys}
    lyrics = []           # (start_eighth, syllable_text)
    chord_marks, section_marks, lyric_sheet = [], [], []
    bar = 0
    for sec in SECTIONS:
        n = len(sec["chords"])
        assert len(sec["vocal"]) * 2 == n, (sec["name"], "vocal lines must cover 2 bars each")
        if sec["name"]:
            section_marks.append((bar * BAR, sec["name"]))
        v = sec["vel"]
        for i, ch in enumerate(sec["chords"]):
            t0 = (bar + i) * BAR
            _, pad, root = CHORDS[ch]
            chord_marks.append((t0, ch))
            tracks["pad"] += [(t0, BAR, p, int(v * sec["pad"])) for p in pad]
            for s, ln, nt, sc in bass_bar(sec["bass"], root, i, n):
                tracks["bass"].append((t0 + s, ln, nt, int(min(127, v * sc))))
            for s, ln, nt, sc in guitar_bar(sec["gtr"], ch, i, n):
                tracks["gtr"].append((t0 + s, ln, nt, int(min(127, v * 0.85 * sc))))
            for s, ln, nt, sc in drum_bar(sec["drums"], i, n, i == 0 and sec["name"] is not None and bar > 0):
                tracks["drums"].append((t0 + s, ln, nt, int(min(127, v * sc))))
            if sec["hook"]:
                t, m, l, nb = HOOK[ch]
                for j, nt in enumerate((t, m, l, t, m, l, nb, t)):
                    tracks["hook"].append((t0 + j, 1, nt, int(v * (0.7 if j in (0, 3, 6) else 0.55))))
            if "lead" in sec:
                pos = t0
                cells = parse_cells(sec["lead"][i])
                assert abs(sum(d for _, d in cells) - BAR) < 1e-9, (sec["name"], "solo bar", i + 1)
                for nm, d in cells:
                    tracks["lead"].append((pos, d, note_num(nm), int(min(127, v * 0.95))))
                    pos += d
        # vocal lines
        who = sec.get("who", "")
        for li, (lyric, spec) in enumerate(sec["vocal"]):
            pos = (bar + li * 2) * BAR
            cells = parse_cells(spec)
            assert abs(sum(d for _, d in cells) - 2 * BAR) < 1e-9, (sec["name"], lyric)
            sylls = syllables(lyric)
            notes = [c for c in cells if c[0] != "r"]
            assert len(sylls) == len(notes), (lyric, len(sylls), len(notes))
            k = 0
            for nm, d in cells:
                if nm != "r":
                    tracks["vocal"].append((pos, d, note_num(nm), int(min(127, v * 0.95))))
                    lyrics.append((pos, sylls[k]))
                    k += 1
                pos += d
            if lyric:
                singer = who[li] if isinstance(who, list) else who
                lyric_sheet.append((sec["name"], singer, lyric.replace("-", ""), list(zip(sylls, [n for n, _ in notes]))))
        bar += n
    return tracks, lyrics, chord_marks, section_marks, lyric_sheet, bar


TRACK_INFO = {  # name, channel, GM program (0-based)
    "vocal": ("Vocal Melody (guide)", 0, 54),   # Synth Voice
    "lead":  ("Lead Guitar (solo)", 1, 30),     # Distortion Guitar
    "hook":  ("Chase Hook", 2, 10),             # Music Box
    "gtr":   ("Rhythm Guitar", 3, 30),          # Distortion Guitar
    "pad":   ("Strings / Pad", 4, 48),          # String Ensemble 1
    "bass":  ("Bass", 5, 38),                   # Synth Bass 1
    "drums": ("Drums", 9, 0),                   # GM drum channel
}


def write_midi(path):
    import mido

    tracks, lyrics, chord_marks, section_marks, _, total_bars = build_events()
    end = total_bars * BAR * EIGHTH
    mid = mido.MidiFile(type=1, ticks_per_beat=TPB)

    meta = mido.MidiTrack()
    meta.append(mido.MetaMessage("track_name", name="Last Heartbeat", time=0))
    meta.append(mido.MetaMessage("set_tempo", tempo=mido.bpm2tempo(BPM), time=0))
    meta.append(mido.MetaMessage("time_signature", numerator=4, denominator=4, time=0))
    meta.append(mido.MetaMessage("key_signature", key="Em", time=0))
    evs = [(int(t * EIGHTH), 0, mido.MetaMessage("marker", text=name)) for t, name in section_marks]
    evs.append((end, 1, mido.MetaMessage("end_of_track")))
    meta += _delta(evs)
    mid.tracks.append(meta)

    for key, (name, ch, prog) in TRACK_INFO.items():
        tr = mido.MidiTrack()
        tr.append(mido.MetaMessage("track_name", name=name, time=0))
        if ch != 9:
            tr.append(mido.Message("program_change", channel=ch, program=prog, time=0))
        evs = []
        if key == "pad":
            evs += [(int(t * EIGHTH), 0, mido.MetaMessage("text", text=c)) for t, c in chord_marks]
        if key == "vocal":
            evs += [(int(t * EIGHTH), 0, mido.MetaMessage("lyrics", text=s)) for t, s in lyrics]
        for s, ln, nt, vel in tracks[key]:
            on, off = int(round(s * EIGHTH)), int(round((s + ln) * EIGHTH)) - 10
            evs.append((on, 2, mido.Message("note_on", channel=ch, note=nt, velocity=vel)))
            evs.append((off, 1, mido.Message("note_off", channel=ch, note=nt, velocity=0)))
        evs.append((end, 3, mido.MetaMessage("end_of_track")))
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
    out = Path(__file__).with_name("last_heartbeat.mid")
    m = write_midi(out)
    print(f"wrote {out} - {m.length:.2f}s, {len(m.tracks)} tracks")
