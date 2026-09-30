# LIVE OR DIE

Horror chase instrumental: nightmare killer vs. the last survivor. 90 s, 128 BPM, D minor
(up to Eb minor for the last 15 s). No lyrics, no vocals. Every sound is synthesized from
scratch by `generate.py`. No samples are used.

File: `Live_or_Die.mp3` (320 kbps, 44.1 kHz stereo, peak -1.5 dBFS)

| Time        | Section  | What happens |
|-------------|----------|--------------|
| 0:00 - 0:07.5 | Intro    | Antique music box plays the main theme alone over a faint dark drone |
| 0:07.5 - 0:15 | Starting | Heartbeat kick, ticking clock, rim, hats, low strings and sub come in. Music box stays on top, then a snare-roll build and a one-beat silence |
| 0:15 - 0:45   | Major    | Bass drop: impact, blade "shing", BRAAM, half-time growl/wobble bass, strings. Second half adds the lead doubling the theme, tremolo strings and "psycho" stabs. Tape-stop at the end |
| 0:45 - 1:00   | Climax   | The chaos stops. Music box and cellos state the theme over a slow heartbeat, then organ, tremolo strings, a Shepard-tone riser and an accelerating snare roll build up. One beat of silence with a lone, out-of-tune music box note |
| 1:00 - 1:30   | Final    | Everything: full-time chase beat, galloping growl bass, organ, BRAAMs, taiko, music box and lead theme. Key change at 1:15, then three "LIVE - OR - DIE" hits and the final blow |

## Suno

Upload `Live_or_Die.mp3` as the audio source and keep **Instrumental** on.

Style prompt:

```
dark horror trailer dubstep, creepy antique music box lead melody, 128 BPM, D minor, heartbeat and ticking clock intro, massive bass drop, growling wobble bass, trailer braams, tremolo horror strings, pipe organ, taiko drums, psycho string stabs, tape-stop breakdown, epic chase finale, key change, cinematic, instrumental
```

Exclude styles: `vocals, singing, choir, lyrics, spoken word, rap`

## Regenerate

```
pip install numpy scipy numba lameenc
python3 generate.py Live_or_Die.mp3 [--wav out.wav] [--analyze]
```

The output is deterministic because the random seed is fixed.
