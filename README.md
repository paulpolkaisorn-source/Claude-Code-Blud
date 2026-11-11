# Clawd vs Bugs

A lane-defense game starring Clawd, the Claude Code mascot. Open `clawd-vs-bugs.html` in any browser: it is one standalone file that works offline, with fullscreen and on-device saves.

## Project layout

| Path | What it is |
|---|---|
| `clawd-vs-bugs.html` | **Built game** (single file, all assets inlined). Don't edit by hand. |
| `src/game.html` | Game source (code, art, UI). |
| `assets/sfx/*.mp3` | Sound effects (generated with ElevenLabs Sound Effects v2, trimmed and loudness-normalized). |
| `assets/music/*.mp3` | Soundtrack cues (optional): `menu`, `first`, `midA`, `midB`, `final`. |
| `assets/sprites/*.png` | Sprite overrides (optional): `u_<unit>.png`, `b_<bug>.png`. |
| `tools/build.py` | Inlines `assets/` into `src/game.html` and writes `clawd-vs-bugs.html`. |
| `tools/process_sfx.sh` | Trim, normalize and encode raw audio into `assets/sfx`. |

## Build

```bash
python3 tools/build.py
```

## Adding music (4-stage adaptive soundtrack)

Drop MP3s into `assets/music/` named `first.mp3`, `midA.mp3`, `midB.mp3`, `final.mp3` (plus an optional `menu.mp3`), then rebuild. The game crossfades between them as the waves progress: First Wave, then Mid Wave A at 30% of the waves, Mid Wave B at 60%, and Final Wave when the final wave is announced. Without these files a built-in procedural score follows the same 4 stages.

## Adding 3D-rendered sprites

Drop transparent PNGs into `assets/sprites/` and rebuild:
- Units: `u_token.png`, `u_shooter.png`, `u_wall.png`, `u_mine.png`, `u_lobber.png`, `u_bomb.png`, `u_frost.png`, `u_double.png`, `u_gc.png`, `u_spike.png`, `u_laser.png`, `u_freeze.png`, `u_punch.png`, `u_compiler.png`, `u_tri.png`, `u_twin.png`. They face right, with their feet at the bottom edge.
- Bugs: `b_bug.png`, `b_flag.png`, `b_hard.png`, `b_racer.png`, `b_moth.png`, `b_shield.png`, `b_hopper.png`, `b_fork.png`, `b_server.png`, `b_mini.png`, `b_garg.png`. They face left, with their feet at the bottom edge.

Each sprite replaces the procedural drawing for that character. The squash/stretch animation, hit flashes and VFX still apply to it.
