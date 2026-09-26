# Last Stand: Last Survivor Theme (instrumental metal)

This replaces *Last Heartbeat*. It's melodic metal with its own sound and has no callbacks to the Nightmare Chase Theme.

| | |
|---|---|
| **File** | `last_stand.mp3` (320 kbps, mastered to -9 LUFS, peaks -1 dBFS) |
| **Tempo** | 180 BPM, 4/4 |
| **Key** | C# minor, guitars in drop C# |
| **Length** | 90 bars = exactly 2:00 |
| **Vocals** | None, fully instrumental |

## Structure

| Section | Bars | Time | What happens |
|---|---|---|---|
| Intro | 1–8 | 0:00–0:11 | A lone, radio-filtered guitar plays the main theme, a snare roll builds, then the full band slams in with twin harmony leads |
| Verse | 9–24 | 0:11–0:32 | Stop-start syncopated riff on the low C# string, with the kick locked to every chug; a high lead enters in the second half |
| Pre-Chorus | 25–32 | 0:32–0:43 | Half-time groove, ringing chords, a rising lead with a harmony guitar, and a snare build into the chorus |
| Chorus | 33–48 | 0:43–1:04 | The main theme: tremolo-picked twin-guitar harmony over 16th-note double kick and strings |
| Post-Chorus | 49–56 | 1:04–1:15 | Thrash section: fast "skank" beat and a galloping 16th riff, then the theme returns on the leads |
| Bridge | 57–64 | 1:15–1:25 | Breakdown: half-time, heavy chugs with gaps, china cymbal hits, and a tom fill into the solo |
| Solo | 65–80 | 1:25–1:47 | Shred solo (scale runs, sweep-style arpeggios, harmonic-minor licks) over double kick and ride |
| Outro | 81–90 | 1:47–2:00 | The chorus theme one last time, then a final hit that rings out and fades |

**Chorus progression:** C#m – A – E – B – C#m – A – F#m – G# | C#m – A – E – B – F#m – A – G#sus4 – G#

## How it's made

- **Instruments:** real sampled instruments from the FluidR3 GM soundfont, rendered with FluidSynth: clean and palm-muted guitars, picked bass, strings, and the "Power" drum kit.
- **Guitar tone:** the guitars are rendered clean, like a DI recording. Each one then goes through a MIDI-timed noise gate, a 4x-oversampled two-stage high-gain amp sim and a 4x12 cabinet EQ.
- **Double-tracking:** the rhythm guitars are two separately humanized takes, panned hard left and hard right.
- **Drums:** each drum piece is processed separately. The kick is gated to about 80 ms per hit so the 16th-note double kick stays tight.
- **Mix and master:** the buses are auto-levelled against the chorus, then bus compression, EQ, a lookahead limiter and loudness normalisation are applied.

## Files

| File | What it is |
|---|---|
| `last_stand.mp3` | The finished track |
| `last_stand.mid` | All parts as MIDI (leads, harmony, rhythm guitars, bass, strings, drums) for a DAW |
| `song.py` | Composition: chords, melodies, solo, riffs, drum patterns |
| `render.py` | Production: FluidSynth render → amp sims → mix → master → mp3 |
| `SUNO_PROMPT.md` | Instrumental Suno prompt: title, style (short and detailed), exclude list, structure tags |

## Rebuild

```bash
sudo apt install fluidsynth fluid-soundfont-gm
pip install mido numpy scipy soundfile pyloudnorm imageio-ffmpeg
python song.py     # -> last_stand.mid
python render.py   # -> last_stand.mp3 (first run ~1.5 min; renders are cached in .cache/)
```
