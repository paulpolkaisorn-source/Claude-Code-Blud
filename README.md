# Claude-Code-Blud
For Mr. CLAWD

## Clawd Physics Playground

A 3D physics sandbox and tag game. You are Clawd: walk, jump, sprint, grab and throw things,
drive a kart, blow stuff up, and collect all 22 stars across the playground.

### Clawd Tag

Hot-potato tag against five bot Clawds. One Clawd is IT and carries a burning fuse; touching someone
passes it on (no instant tag-backs). When the fuse runs out, whoever is IT is blown up and is out.
A new round starts with a shorter fuse, and the last Clawd standing wins.

- Sprinting uses stamina in tag (the yellow bar).
- Hit a bot with a fast-moving prop to stun it for a moment.
- A red marker floats over IT, and an arrow at the screen edge points to IT (or to the nearest runner when you are IT).
- `G` or the Mode button switches between tag and free play.

### Play

The game is plain static files (no build step), but browsers only load ES modules over HTTP,
so serve the folder instead of double-clicking `index.html`:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

It also works as-is on any static host (GitHub Pages, Vercel, Netlify).

**No server?** Open `clawd-playground-standalone.html` instead. It is the whole game in one file
(libraries included), so it runs by double-clicking it or sending it to someone.
Rebuild it after changing the game with `npm install && npm run build:standalone`.

### Controls (Roblox-style)

| Action | PC | Mobile |
| --- | --- | --- |
| Move | `W` `A` `S` `D` (or `↑` `↓`) | Left thumbstick (touch the lower-left of the screen) |
| Jump / double jump | `Space` (press again in the air) | `JUMP` button |
| Sprint | Hold `Q` | `RUN` toggle |
| Turn camera | Drag with the mouse (left or right button), or `←` `→` | Drag anywhere else on the screen |
| Zoom | Mouse wheel, or `I` / `O` | Pinch |
| First person | Zoom all the way in | Pinch all the way in |
| Mouse lock (shift lock) | `Shift` | – |
| Grab / throw / ride kart | `E` | `GRAB` button (label changes with context) |
| Spawn an item | `1`–`8`, or `F` for the selected one; hold a slot to keep spawning | Tap or hold the hotbar |
| Game mode (tag / free play) | `G` | Mode button |
| Dance | `T` | Settings → Clawd → Dance |
| Reset the world (restarts the match in tag) | `R` | `Reset` button |
| Full screen | `P` (`Esc` to leave) | `Full screen` button (not on iPhone Safari, which has no full screen mode for pages) |
| Settings | `M` | `Settings` button |

In the kart: `W`/`S` drive, `A`/`D` steer, `Space` hops, `Q` boosts, `E` gets out.

### Things to play with

- **Spawnable items:** crate, ball, plank, barrel, big ball, balloon, TNT, anvil. Clawd tosses each one straight up
  and it lands about a second and a half later.
  Balloons tie themselves to whatever is nearby (or what you are holding) and lift it.
  TNT has a 3 second fuse and sets off other TNT.
- **Around the map:** crate pyramid, ball pit, dominoes, seesaw, spinner, wrecking ball, trampolines,
  a block castle stuffed with TNT, Newton's cradle, launch pad to a floating island, soccer field with goals
  and a score, carousel, swings, bowling lane, ice rink, pool with a slide tower (things float, Clawd swims),
  wind fan, conveyor belt, and a sky course.
- **Bots:** five Clawds wander near the spawn in free play (you can pick them up) and play tag against you.
- **Checkpoints** on the high platforms move your respawn point.

### Settings

- **Graphics:** quality preset (Low / Medium / High / Ultra), resolution scale, shadow quality,
  view distance, anti-aliasing, particles, clouds and flowers, time of day (day / sunset / night),
  field of view, camera shake, FPS counter.
- **Game:** gravity (moon / normal / heavy), slow motion, double jump, look sensitivity, invert look, sound.
- **Clawd:** body colour and hats.

Settings are saved in the browser's local storage.

### Files

- `index.html` – page, HUD, settings sheet and touch controls
- `game.js` – rendering, physics, character controller, camera, level, settings
- `clawd-playground-standalone.html` – generated single-file build
- `tools/build-standalone.mjs` – builds the single-file version with esbuild
- `vendor/` – [three.js](https://threejs.org) r170 and [cannon-es](https://github.com/pmndrs/cannon-es) 0.20 (both MIT)
