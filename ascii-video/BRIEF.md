# Shared contract for scene workers (ASCII-only explainer video "What is ASCII art?")

Video: 1920x1080, 30fps, 120 s, 8 scenes. EVERY pixel is an ASCII glyph (chars 32..126 only; no unicode, no images, no drawn shapes). Only text + ASCII art.
Read `engine.py` first (short). You own ONLY your file `scenes/scene_NN.py`. Do not edit engine.py, build.py, audio.py or other scenes.

## Scene module contract
```python
import numpy as np
import engine as E          # scenes/ is on sys.path; build.py lives one dir up and imports engine
DURATION = <seconds, given in your task>
EVENTS = [(t_seconds, "click"|"blip"|"whoosh"|"chime"), ...]   # optional sound cues, scene-local time; keep <= ~120 events
def render(g: "E.Grid", t: float) -> None:   # t in [0, DURATION); pure function of t (no state, no randomness without a fixed seed / E.hash2)
    g.clear(bg, fg)   # you choose bg/fg colours for your scene
    ...draw...
```
Grid is E.COLS x E.ROWS = 240 x 67 cells (cell 8x16 px). Useful: g.put/center/blit/blit_center/box/fill/set, g.image(luma, x, y, fg=/color=) for density-ramp images (E.RAMP=" .:-=+*#%@"), E.big_text(text, rows) for block-letter banners, E.typed(text,t,t0,cps) typewriter, E.blink, E.ease_out/ease_in_out/prog, E.mix(colorA,colorB,k), E.hash2(x,y,seed), E.wrap, colours E.GREEN/WHITE/AMBER/CYAN/RED/PINK/BLUE/DIM/BLACK or E.rgb("RRGGBB").
Aspect: a cell is 8x16 px, so to draw a round circle use x radius = 2 * y radius in cells.
Rules: normal body text is small (8x16 px glyphs) - use E.big_text for headlines/captions the viewer must read (rows>=5), and keep key sentences on screen long enough to read (~15 chars/s max typing, hold >=2 s after finished). Keep text inside the grid and not overlapping unless intended. Scene starts with a 0.35 s cell-dissolve from the previous scene (handled by build.py), so make t=0 look reasonable. Make it BEAUTIFUL: layered motion (something always moving), per-glyph colour gradients, glow-like bright heads with dim tails, consistent margins (>=6 cells), centered compositions. Quality bar: "ultra quality ASCII".
Performance: render(t) must take < 0.15 s; use numpy vectorisation for any full-screen/ per-cell effects (no per-cell Python loops over the whole 240x67 grid each frame).

## Verify yourself (cheap)
`cd /home/user/Claude-Code-Blud/ascii-video && python3 -c "import sys;sys.path.insert(0,'scenes');import engine as E,scene_NN as S;from PIL import Image;[Image.fromarray((lambda g:(S.render(g,S.DURATION*f),g.to_rgb())[1])(E.Grid())).save(f'work/w_NN_{i}.png') for i,f in enumerate((0.1,0.4,0.7,0.95))]"` then look at 2-3 PNGs with the image reader and fix obvious problems (clipping, unreadable text, empty screen). Do not render video.
Final reply <= 5 lines: file written, DURATION, one-line summary, any problem. No code in the reply.
