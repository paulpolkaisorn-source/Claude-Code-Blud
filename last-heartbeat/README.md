# Last Heartbeat: Last Survivor Theme

This theme plays when one survivor is left and the killer is hunting them. It's the big final-stand song, and it follows on from the Nightmare Chase Theme in `../nightmare-chase/`.

| | |
|---|---|
| **Tempo** | 168 BPM, 4/4 (a step up in intensity from the chase theme's 160) |
| **Key** | E minor (Phrygian F for dread, harmonic-minor B for tension) |
| **Length** | 84 bars = **exactly 2:00** |
| **Sections** | Intro · Verse · Pre-Chorus · Chorus · Post-Chorus · Bridge · Solo · Outro |
| **Suno** | Copy-paste instrumental prompt is in **[SUNO_PROMPT.md](SUNO_PROMPT.md)** |

## Files

| File | What it is |
|---|---|
| `SUNO_PROMPT.md` | Instrumental Suno prompt: title, style (short and detailed), exclude list, optional structure tags |
| `last_heartbeat.mid` | 7 tracks: vocal melody with embedded lyrics, lead guitar, chase hook, rhythm guitar, strings, bass, drums |
| `preview.mp3` | Rough synth demo with a synth voice singing the melody (upload to Suno for a Cover) |
| `instrumental.mp3` | The same demo without the guide vocal |
| `song.py` | Every note, chord and lyric as editable data, plus the MIDI builder |
| `render_preview.py` | Renders the two mp3s |

## The story

- **Intro:** the chase theme's music-box hook returns (same 3+3+2 pattern, now in E minor) over a heartbeat. Then the band slams in.
- **Verse:** the survivor is alone. Their friends' signals are dead and they're fixing the last generator while the killer drags a weapon closer.
- **Pre-Chorus:** hiding and holding their breath, with 20 seconds left on the clock.
- **Chorus:** defiance: *"I'm the last heartbeat in the dark."*
- **Post-Chorus:** gang chant over an E–F half-step riff.
- **Bridge:** the killer whispers to the survivor, and the survivor answers.
- **Solo:** the escape run.
- **Outro:** the hook one last time, then a lone heartbeat that stops.

## Structure

| Section | Bars | Time | Chords (1 per bar) |
|---|---|---|---|
| Intro | 1–8 | 0:00.0–0:11.4 | Em Em F/E Em Em F Em B7♭9 |
| Verse | 9–24 | 0:11.4–0:34.3 | Em Em Cmaj7 Cmaj7 Am Am B B Em Em Cmaj7 Cmaj7 F F B B7 |
| Pre-Chorus | 25–32 | 0:34.3–0:45.7 | Am Am C C D D B B7 |
| Chorus | 33–48 | 0:45.7–1:08.6 | Em C G D Em C Am B Em C G D C D B B7 |
| Post-Chorus | 49–56 | 1:08.6–1:20.0 | Em F Em F Em F G B7 |
| Bridge | 57–64 | 1:20.0–1:31.4 | Am Am Em/G Em/G Fmaj7 Fmaj7 Bsus4 B |
| Solo | 65–76 | 1:31.4–1:48.6 | Em C G D Em C G D Am F B B7 |
| Outro | 77–84 | 1:48.6–2:00.0 | Em C G D Em F/E Em Em |

## Vocal melody (one note per syllable)

Lengths are in the MIDI file. Notes use C4 = middle C. The melody sits in a female range; a male singer would sing it one octave lower. The killer lines are low, almost spoken, and meant to be whispered.

**Verse**

| Voice | Lyric | Melody (syllable → note) |
|---|---|---|
| Survivor | All my friends are static on the line | All E4 · my E4 · friends G4 · are F#4 · sta G4 · tic A4 · on G4 · the F#4 · line E4 |
| Survivor | Every door I open's out of time | Ev G4 · ery G4 · door B4 · I A4 · o G4 · pen's A4 · out B4 · of A4 · time G4 |
| Survivor | Generator's humming half a song | Gen A4 · er A4 · a G4 · tor's A4 · hum C5 · ming B4 · half A4 · a G4 · song A4 |
| Survivor | One more wire and the lights come on | One F#4 · more F#4 · wire B4 · and A4 · the G4 · lights F#4 · come E4 · on D#4 |
| Survivor | But I hear him dragging steel on stone | But E4 · I E4 · hear E4 · him F#4 · drag G4 · ging F#4 · steel E4 · on D4 · stone E4 |
| Survivor | Heavy footsteps follow me alone | Hea G4 · vy G4 · foot B4 · steps A4 · fol G4 · low E4 · me G4 · a A4 · lone B4 |
| Survivor | There's a heartbeat louder than my own | There's A4 · a A4 · heart C5 · beat B4 · lou A4 · der G4 · than F4 · my E4 · own F4 |
| Survivor | And it knows I'm the last one home | And F#4 · it F#4 · knows A4 · I'm G4 · the F#4 · last B4 · one A4 · home F#4 |

**Pre-Chorus**

| Voice | Lyric | Melody (syllable → note) |
|---|---|---|
| Survivor | Don't look back, don't make a sound | Don't A4 · look A4 · back C5 · don't A4 · make C5 · a D5 · sound E5 |
| Survivor | Hold my breath, the walls close in | Hold C5 · my C5 · breath E5 · the C5 · walls E5 · close G5 · in E5 |
| Survivor | Twenty seconds, one more round | Twen D5 · ty D5 · sec F#5 · onds D5 · one F#5 · more G5 · round A5 |
| Survivor | Here's where the last stand begins | Here's B4 · where B4 · the C5 · last D#5 · stand F#5 · be E5 · gins F#5 |

**Chorus**

| Voice | Lyric | Melody (syllable → note) |
|---|---|---|
| Survivor | I'm the last heartbeat in the dark | I'm B4 · the B4 · last E5 · heart G5 · beat F#5 · in E5 · the F#5 · dark G5 |
| Survivor | Every breath I take, you're a step too far | Ev D5 · ery D5 · breath G5 · I F#5 · take E5 · you're D5 · a D5 · step F#5 · too E5 · far D5 |
| Survivor | You can take them all but you won't take me | You B4 · can B4 · take E5 · them E5 · all G5 · but F#5 · you E5 · won't G5 · take E5 · me C5 |
| Survivor | I'm the last heartbeat, I'm still free | I'm C5 · the C5 · last E5 · heart A5 · beat G5 · I'm D#5 · still E5 · free F#5 |
| Survivor | I'm the last heartbeat on the run | I'm B4 · the B4 · last E5 · heart G5 · beat F#5 · on E5 · the F#5 · run G5 |
| Survivor | Till the gates swing wide and the night is done | Till D5 · the D5 · gates G5 · swing A5 · wide G5 · and F#5 · the E5 · night F#5 · is E5 · done D5 |
| Survivor | You can chase me down to the end of the line | You C5 · can C5 · chase E5 · me E5 · down G5 · to E5 · the G5 · end A5 · of G5 · the F#5 · line A5 |
| Survivor | I'm the last heartbeat, I survive | I'm B4 · the B4 · last D#5 · heart F#5 · beat E5 · I D#5 · sur E5 · vive F#5 |

**Post-Chorus**

| Voice | Lyric | Melody (syllable → note) |
|---|---|---|
| Gang | Run, run, don't look behind | Run E5 · run E5 · don't G5 · look E5 · be E5 · hind F5 |
| Gang | Last one standing, last alive | Last G5 · one G5 · stand E5 · ing D5 · last E5 · a F5 · live C5 |
| Gang | Run, run, don't look behind | Run E5 · run E5 · don't G5 · look E5 · be E5 · hind F5 |
| Gang | Heart is pounding, keep in time | Heart D5 · is D5 · pound G5 · ing F#5 · keep E5 · in D#5 · time F#5 |

**Bridge**

| Voice | Lyric | Melody (syllable → note) |
|---|---|---|
| Killer | Where you gonna hide when you're all that's left? | Where E4 · you E4 · gon E4 · na E4 · hide F4 · when E4 · you're E4 · all C4 · that's B3 · left A3 |
| Killer | I can hear your heart, I can hear your breath | I E4 · can E4 · hear G4 · your F#4 · heart E4 · I E4 · can E4 · hear G4 · your F4 · breath E4 |
| Survivor | Then come and find me, I'm not afraid | Then A4 · come A4 · and G4 · find C5 · me A4 · I'm A4 · not G4 · a A4 · fraid E5 |
| Survivor | The last heartbeat never fades | The B4 · last E5 · heart E5 · beat F#5 · nev D#5 · er E5 · fades F#5 |

**Outro**

| Voice | Lyric | Melody (syllable → note) |
|---|---|---|
| Survivor | I'm the last heartbeat in the dark | I'm B4 · the B4 · last E5 · heart G5 · beat F#5 · in E5 · the F#5 · dark G5 |
| Survivor | I'm still alive | I'm B4 · still D5 · a E5 · live D5 |
| Survivor | last heartbeat | last E4 · heart E4 · beat E4 |

## Guitar solo (bars 65–76)

Numbers are lengths in 8th notes (8 = one bar). 0.5 = a 16th note.

| Bar | Chord | Notes |
|---|---|---|
| 65 | Em | E5(1) F#5(1) G5(1) B5(1) A5(1) G5(1) F#5(1) E5(1) |
| 66 | C | G5(3) E5(3) C5(2) |
| 67 | G | D5(1) G5(1) B5(1) D6(1) B5(1) G5(1) D5(1) B4(1) |
| 68 | D | A5(6) F#5(2) |
| 69 | Em | E6(0.5) D6(0.5) B5(0.5) G5(0.5) E6(0.5) D6(0.5) B5(0.5) G5(0.5) E6(0.5) D6(0.5) B5(0.5) G5(0.5) E6(1) D6(1) |
| 70 | C | C6(0.5) B5(0.5) G5(0.5) E5(0.5) C6(0.5) B5(0.5) G5(0.5) E5(0.5) C6(0.5) B5(0.5) G5(0.5) E5(0.5) G5(2) |
| 71 | G | D6(2) B5(1) G5(1) D6(2) E6(2) |
| 72 | D | A5(2) D6(2) E6(4) |
| 73 | Am | A5(1) C6(1) E6(1) C6(1) A5(1) E5(1) C5(1) E5(1) |
| 74 | F | F5(1) A5(1) C6(1) A5(1) F5(1) E5(1) F5(2) |
| 75 | B | D#5(0.5) E5(0.5) F#5(0.5) G5(0.5) A5(0.5) B5(0.5) C6(0.5) D#6(0.5) E6(4) |
| 76 | B7 | D#6(2) C6(2) B5(2) A5(1) F#5(1) |

## Arrangement

| Section | Drums | Guitars | Bass |
|---|---|---|---|
| Intro (bars 1–4) | heartbeat kick only | none (music-box hook) | heartbeat |
| Intro (bars 5–8) | rock beat, crash, fill | ringing power chords | whole notes |
| Verse | half-time groove | palm-muted 8ths, 3+3+2 accents | driving 8ths |
| Pre-Chorus | snare builds 8ths → 16ths | ringing chords, chugs on the last bar | driving 8ths |
| Chorus | four-on-the-floor, open hats | full 8th-note chugs | octave 8ths |
| Post-Chorus | metal gallop kick | gallop riff on E and F power chords (+ music-box hook returns) | gallop |
| Bridge | sparse, builds in the last 2 bars | silent, then hits | whole notes |
| Solo | double kick 8ths + ride | 8th chugs under the lead | octave 8ths |
| Outro | chorus beat → heartbeat that stops | chugs → one last ringing chord | octaves → heartbeat |

## Rebuild / tweak

```bash
pip install mido numpy scipy soundfile imageio-ffmpeg
python song.py            # -> last_heartbeat.mid (checks that every lyric syllable has a note)
python render_preview.py  # -> preview.mp3 + instrumental.mp3
```
