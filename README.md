# Claude-Code-Blud
For Mr. CLAWD

## Clawd Physics Playground

A 3D physics sandbox game. You are Clawd: walk, jump, push crates, smash towers,
ride moving platforms, bounce on trampolines and collect all 8 stars.

### Play

The game is plain static files (no build step), but browsers only load ES modules over HTTP,
so serve the folder instead of double-clicking `index.html`:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

It also works as-is on any static host (GitHub Pages, Vercel, Netlify).

### Controls (Roblox-style)

| Action | PC | Mobile |
| --- | --- | --- |
| Move | `W` `A` `S` `D` (or `↑` `↓`) | Left thumbstick (touch the lower-left of the screen) |
| Jump | `Space` (hold to keep hopping) | `JUMP` button |
| Turn camera | Drag with the mouse (left or right button), or `←` `→` | Drag anywhere else on the screen |
| Zoom | Mouse wheel, or `I` / `O` | Pinch |
| First person | Zoom all the way in | Pinch all the way in |
| Mouse lock (shift lock) | `Shift` | – |
| Spawn crate / ball | `F` / `G` | `Crate` / `Ball` buttons |
| Reset the world | `R` | `Reset` button |

### What's in the world

- Crate pyramid, domino run and a ball pit to wreck
- Seesaw with a counterweight, a spinning sweeper bar and a wrecking ball that drops when you walk up
- Trampolines
- A sky course: ramp → moving platform → lift → stepping pads → trampoline → top island

### Files

- `index.html` – page, HUD and touch controls
- `game.js` – rendering, physics, character controller, camera, level
- `vendor/` – [three.js](https://threejs.org) r170 and [cannon-es](https://github.com/pmndrs/cannon-es) 0.20 (both MIT)
