# Claude-Code-Blud
For Mr. CLAWD

## Yin vs Yang — 2D stickman fight (1080p60, 2:00)

`output/yin_vs_yang.mp4` is a fully procedural animation: black (Yin) vs white (Yang) stickmen,
escalating from martial arts on a mountain peak at dusk, to a storm-sky battle (flash-step clashes,
lightning, spear barrage, beam struggle, the mountain splitting), to a fight in orbit (teleport
exchanges, a time-stop, a nova), a final fist-to-fist clash, and a fusion ending where both
energies spiral into a yin-yang with each fighter inside the other's dot.

Everything (rig, choreography, effects, camera, and all sound effects) is generated in code —
no external assets.

### Render it yourself

```bash
pip install -r requirements.txt
python -m yinyang_fight.main --full                     # -> output/yin_vs_yang.mp4 (1920x1080, 60 fps, AAC)
python -m yinyang_fight.main --stills 15,45,98 --res 640x360 --out sheet.png   # preview frames
python -m yinyang_fight.main --clip 13:18 --res 960x540 --out clip.mp4         # preview a clip
```

### How it works (`yinyang_fight/`)

| Module | Role |
|---|---|
| `rig.py` | 12-joint stickman: pose library, forward kinematics, 2-bone IK, drawing |
| `anim.py` | Keyframe channels with easing curves; story-time speed curve for slow-mo / hit-stop |
| `story.py`, `moves.py` | Authoring layer: actors, camera/fx tracks, strike/teleport/jump helpers |
| `choreography.py` | The full 2-minute fight script |
| `sim.py` | Sequential pass: foot-locking IK, ribbon (headband) physics, spring camera with shake |
| `effects.py` | Sparks, flashes, shockwaves, beams, lightning, tendrils, boulders, spears, novas... |
| `scenes.py` | Parallax backgrounds: void, mountain (dusk → storm, splitting), cosmos |
| `render.py` | Per-frame cairo renderer, two bloom layers, post (chromatic aberration, invert, letterbox) |
| `audio.py` | Procedural numpy sound design for every cue, ambient beds, slow-mo pitch-down |
| `main.py` | CLI; renders frame chunks in parallel and encodes H.264 segments with ffmpeg |
