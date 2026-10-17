# Gummy Bears: Prompt for Claude Opus 5.5

One prompt that builds the whole jelly gummy bear toy (soft-body physics, grab and fling, sound effects) in a single reply, plus two short follow-ups.

## How to use it

1. New chat with Claude Opus 5.5. If your app has an extended thinking or effort setting, turn it up: this is a big build.
2. Paste **The prompt** below. It should come back with one complete HTML file (an artifact in the Claude app).
3. Optional but recommended: send the **Review pass** follow-up. A second look catches most bugs.
4. Something broken? Send the **Bug report** with what you saw.
5. In Claude Code instead of the chat app, the same prompt makes it test the page itself with a headless browser before finishing.

## The prompt

````text
I'd like you to build a single-file web toy: 3D see-through jelly gummy bears with real soft-body physics, in three.js. This has been built successfully once before, so below you'll find the goal, the constraints, the design decisions that worked, and the mistakes that were already made and fixed. Please plan first, then deliver one complete, polished HTML file.

<goal>
A toy with candy-commercial quality that someone pulls up on their phone to show their family, and they say "whoa". Gummy bears drop in, land with a squash, wobble, and settle like real jelly. You can grab a bear and pull it: it stretches and sags as one piece, then snaps back with a wobble. You can fling it, tap empty space to drop a new bear, shake the table, reset, and hear squishy sound effects. The physics is the heart of it. It should feel physically real, not like a canned animation.
</goal>

<hard_constraints>
- One self-contained HTML file. Its only external resources are three.js r170 through exactly this importmap and Google Fonts (Fredoka 600, Inter 400/500/600). Pinned versions keep it working forever, and the file must run when opened straight from disk.
  <script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"}}</script>
- Write the soft-body physics yourself: no cannon, ammo, rapier or oimo. Rigid-body libraries can't do jelly, and the hand-written solver is what makes this feel alive.
- It must work with mouse and touch, on desktop Chrome/Safari and on phones (375 px wide and up).
- Deliver complete code: no placeholders, "...", or TODOs. Someone will open the file directly, and any gap breaks it.
</hard_constraints>

<look>
Art direction is "studio product render", like a candy commercial:
- A seamless cream cyclorama (floor curving up into the back wall, no horizon line). Base #FFE7D6, grading slightly to #FBD3C0 toward the edges.
- Five flavors: red #E3122B, orange #FF7A1A, yellow #FFC61A, green #4CC22E, and a nearly colorless clear/pineapple #F4EBD9.
- Bears made of glossy, see-through jelly: MeshPhysicalMaterial with transmission 1, ior about 1.46, roughness about 0.07, clearcoat 1, color depth from attenuationColor / attenuationDistance (thin ears glow light, the thick belly goes deep and saturated), and a touch of emissive in the flavor color so they read as candy on cream.
- Big soft studio light: a RoomEnvironment PMREM for reflections, a soft key light with shadows, a warm rim light, ACES or AgX tone mapping, sRGB output.
- Every bear gets a soft contact shadow, tinted warm brown, never black. A bear without one looks like it is floating.
- The bear must read instantly as a classic gummy bear: chubby body, head, two round ears, a protruding snout, stubby arms and legs, slightly flat front-to-back, all one smooth continuous surface (not visible spheres). A known-good shape is in <reference_shape>.
- Minimal UI: a title "Gummy Bears" (Fredoka), one hint chip ("Drag to squish & fling · Tap empty space to drop a bear"), and a control bar with Drop bear, Shake, Reset, a Jiggle slider (wobbly ↔ firm) and a speaker mute button. Text #3A1F14 on cream chips, contrast ≥ 4.5:1, touch targets ≥ 44 px.
</look>

<physics_design_that_worked>
Use this as your starting architecture. Change it only for a clearly better reason.
- Particles: about 140–175 per bear, sampled inside the bear's SDF and mirror-symmetric. Each particle's collision radius is about its depth below the surface (clamped to roughly 0.10–0.205), so the collision surface matches the visible surface. Mass is bottom-heavy (the extra mass decays with height) so bears stand back up like toys.
- Deformation: region-based shape matching (Müller et al. 2005, "Meshless deformations based on shape matching") with about 17 overlapping local clusters (pelvis, belly, chest, shoulders, head, face, ears, arms, legs) plus one global cluster. Extract each cluster's rotation with the Müller 2016 quaternion iteration, warm-started from the last step (2 iterations per substep is enough). Local clusters blend in the volume-normalized linear part (beta about 0.45–0.8) for squash and shear. Particles get a spring toward the goal, with damping relative to the goal's motion.
- Time: a fixed 1/240 s substep. Clamp the frame dt to 1/30 s, run at most about 10 substeps per frame, and never carry a backlog. That keeps tab switches and hitches from exploding the sim.
- Contacts: bear-to-bear particle spheres through a spatial hash (a Verlet pair list is a good speedup) with mass-weighted position projection, about 3 iterations, Coulomb friction, plus floor and invisible walls. Add rolling resistance while a bear is touching something, or bears rock forever. Add sleeping (a bear whose particles stay within about 0.03 units for 0.5 s stops completely), and wake it on grabs and real hits. Add a NaN guard that respawns a broken bear.
- Render mesh: polygonize the SDF once (surface nets or marching cubes, about 3–7k triangles) and share it between bears. Skin each vertex to its 4 nearest particles using per-particle affine frames from the clusters. GPU skinning (a float texture of frames) scales best; CPU skinning is fine for up to 16 bears.
- Known-good numbers: a bear is about 2.4 units tall, gravity 17, air damping 0.12, speed cap 24, floor friction 0.9, bear-to-bear friction 0.55, restitution very low (jelly doesn't bounce much). The Jiggle slider maps stiffness k from 1800 (wobbly) to 6000 (firm), exponentially.
- Arena: invisible walls sized to the viewport, with a camera that fits it. Cap the scene at 16 bears: the oldest shrinks away smoothly when a new one drops.
</physics_design_that_worked>

<interaction>
- Grab: raycast the bears. Pull a smooth patch of particles around the hit point toward the pointer, on a camera-facing plane through the hit point. On release the bear keeps its velocity, so a fast drag is a fling.
- Tap or click on empty space (short and barely moved) drops a bear above that floor point.
- Shake throws every bear up with a random kick and spin. Reset clears the scene and replays the opening drop: 7 bears in mixed flavors, dropped one by one.
- Use pointer events with pointer capture, touch-action: none on the canvas, and ignore right-click.
</interaction>

<sound>
All sound effects are synthesized live with the Web Audio API (no audio files): a plop when a bear lands (louder for harder hits, each flavor at a slightly different pitch), soft bumps between bears, a wet squelch on grab, a cartoon boing on release (bigger for faster flings), a pop for new bears, a rumble for Shake, a whoosh for Reset, and a little bloop when the oldest bear shrinks away. Add a light compressor, a small room reverb, a voice cap, and a mute button whose state is remembered (localStorage in try/catch).
</sound>

<lessons_already_learned>
These went wrong in the first build, so please design around them from the start:
1. If a grab pulls only the nearest few particles, it yanks a spike ("unicorn horn") out of the head. Instead, grab a smooth head-sized patch (radius about 1.1 units, falloff (1 − d²/R²)³, weights normalized to a constant total stiffness), saturate the pull distance, and drag the whole body gently along at the pointer's velocity. That way the bear elongates as one piece.
2. Measure pointer velocity for flings in simulated time, smoothed and capped. Otherwise a slow frame rate makes fast drags feel dead.
3. On a tall phone, a landscape-style camera leaves big empty bands above and below the bears. In portrait, use a deeper, narrower arena and fit the camera to the free space between the title and the control bar (measure their DOM rects).
4. Impact sounds keyed off per-particle speeds make a resting pile tick forever, because contact projection jitters. Make a sound only when a bear STARTS touching the floor or another bear, with loudness from the whole bear's center-of-mass speed in the previous frame. Use a per-bear cooldown of about 0.2 s.
5. Browsers only allow audio after a user gesture. Unlock on pointerdown, pointerup, touchend, click and keydown, because on iOS a touch pointerdown alone doesn't count. Only schedule sounds into a running AudioContext, or queued sounds blurt out all at once later. Suspend on tab hide. Also note: the iPhone silent switch mutes web audio.
6. Transmission needs something behind it to refract. The cream backdrop and the other bears provide that, so don't make the background pure white or flat.
7. Wrap every localStorage access in try/catch: private modes throw.
</lessons_already_learned>

<reference_shape>
A known-good gummy bear SDF (local space, the bear faces +z, the sole is flat at y = −1.04, the head top is about y = 1.37). Use it as-is or improve it.
```js
/* ---------- signed distance field of one gummy bear (local space, faces +z) ---------- */
function smin(a, b, k) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}
function sdEll(px, py, pz, rx, ry, rz) {
  const qx = px / rx, qy = py / ry, qz = pz / rz;
  const k0 = Math.sqrt(qx * qx + qy * qy + qz * qz);
  const wx = qx / rx, wy = qy / ry, wz = qz / rz;
  const k1 = Math.sqrt(wx * wx + wy * wy + wz * wz);
  if (k1 < 1e-12) return -Math.min(rx, ry, rz);
  return (k0 * (k0 - 1)) / k1;
}
function sdCone(px, py, pz, ax, ay, az, bx, by, bz, r1, r2) {
  const bax = bx - ax, bay = by - ay, baz = bz - az;
  const pax = px - ax, pay = py - ay, paz = pz - az;
  let t = (pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz);
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const dx = pax - bax * t, dy = pay - bay * t, dz = paz - baz * t;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) - (r1 + (r2 - r1) * t);
}
function sdRoundBox(px, py, pz, bx, by, bz, r) {
  const qx = Math.abs(px) - bx + r, qy = Math.abs(py) - by + r, qz = Math.abs(pz) - bz + r;
  const mx = Math.max(qx, 0), my = Math.max(qy, 0), mz = Math.max(qz, 0);
  return Math.sqrt(mx * mx + my * my + mz * mz) + Math.min(Math.max(qx, qy, qz), 0) - r;
}
function bearSDF(x, y, z) {
  const ax = Math.abs(x); // left/right symmetric
  let d = sdEll(x, y + 0.24, z, 0.64, 0.78, 0.5); // chubby body
  d = smin(d, sdRoundBox(x, y + 0.82, z - 0.02, 0.6, 0.26, 0.54, 0.25), 0.2); // broad, softly rounded seat: butt + hips
  d = smin(d, sdEll(x, y - 0.8, z - 0.03, 0.54, 0.47, 0.47), 0.24); // head
  d = smin(d, sdEll(x, y - 0.68, z - 0.42, 0.22, 0.165, 0.2), 0.12); // snout
  d = smin(d, sdEll(ax - 0.4, y - 1.17, z + 0.02, 0.2, 0.2, 0.13), 0.1); // ears
  d = smin(d, sdCone(ax, y, z, 0.5, 0.3, 0.02, 0.84, -0.02, 0.17, 0.2, 0.155), 0.15); // arms
  d = smin(d, sdCone(ax, y, z, 0.32, -0.6, 0.0, 0.42, -0.9, 0.34, 0.29, 0.25), 0.17); // legs / feet (feet point forward a little: a stable stance)
  d = smin(d, sdEll(ax - 0.19, y - 0.93, z - 0.4, 0.06, 0.06, 0.06), 0.05); // eye bumps
  d = smin(d, sdEll(x, y - 0.74, z - 0.61, 0.085, 0.06, 0.065), 0.05); // nose bump
  // flat sole: smooth intersection with the half space y > -1.04 (butt and both feet touch down together)
  const cut = -(y + 1.04);
  const k = 0.12, hh = Math.max(k - Math.abs(d - cut), 0) / k;
  return Math.max(d, cut) + hh * hh * k * 0.25;
}
function sdfGrad(f, x, y, z, out, e) {
  e = e || 0.002;
  out[0] = f(x + e, y, z) - f(x - e, y, z);
  out[1] = f(x, y + e, z) - f(x, y - e, z);
  out[2] = f(x, y, z + e) - f(x, y, z - e);
  const k = 1 / (2 * e);
  out[0] *= k; out[1] *= k; out[2] *= k;
}
```
</reference_shape>

<acceptance>
Before you finalize, check the code against each of these:
- Opening: 7 bears drop one by one, squash on landing, wobble, and are completely still within about 3 s. Nothing ever sinks into the floor, sticks in a wall, or passes through another bear.
- Grab and pull up by the head: the whole bear stretches and sags with a round head and visible ears, then wobbles back on release. A fast drag flings it.
- Spamming Drop bear never shows more than 16 bears, and the oldest shrinks away smoothly. Shake, then waiting about 3 s: everything settles and sleeps.
- A tab switch or a 5 s hitch never explodes the sim (no NaN).
- Sounds start after the first tap. A resting pile is silent. Mute works and is remembered after a reload.
- Phone (375–430 px wide, portrait): no horizontal scroll, the buttons don't wrap, and the bears fill the space between the title and the controls.
- prefers-reduced-motion: the bears start standing (no drop-in) and nothing moves on its own. The device pixel ratio is capped at 2, and the render loop pauses while the tab is hidden.
- Expose a small debug API on window.__gummy: { ready, step(n), advance(seconds), stats() → { bears, particles, hasNaN, minY, maxSpeed, asleep }, spawn(color), shake(), reset() }, so the physics can be tested from the console.
</acceptance>

<process>
1. Plan briefly first: the module layout, the data structures (typed arrays per bear slot), and the per-frame order (input → substeps of shape matching, integrate, contacts → sounds → skinning → render).
2. Write the complete file.
3. Review your own code against <hard_constraints> and <acceptance>, item by item, and fix what you find before finishing. Then tell me plainly anything you could not verify.
</process>

<output_format>
If you can create artifacts, deliver it as one HTML artifact. Otherwise, use one ```html code block containing the whole file. Afterwards, add a short list of the controls and any known limitations. Keep the explanation brief; the file is the deliverable.
</output_format>

<if_you_can_run_commands>
If you are in an environment with a shell (for example Claude Code), save the file as gummy-bears.html and verify it before finishing:
- Load it in headless Chromium with Playwright. Use the flags --use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist, and drive the physics through window.__gummy (software rendering is slow).
- Confirm zero console errors.
- Run a soak test: 16 bears, several shakes, 20+ simulated seconds. Expect no NaN, nothing below the floor or outside the walls, and every bear asleep after 10 s idle. Also run a hitch test with advance(5).
- Take screenshots at 1280×800 and 390×844 and one mid-drag. Look at them and iterate until they really look like a candy commercial.
</if_you_can_run_commands>
````

## Follow-up: Review pass

````text
Great. Now do a careful second pass as if you were a picky reviewer seeing this for the first time:
1. Re-read the whole file and list the 5 most likely bugs or weak spots (physics stability, touch handling, audio unlock, phone layout, performance), each with the line or function.
2. Fix them.
3. Run through <acceptance> again, item by item.
Then deliver the complete updated file.
````

## Follow-up: Bug report

````text
Bug report:
- What I did: <steps>
- What I expected: <...>
- What happened: <...>
- Device / browser: <e.g. iPhone 15, Safari>
- Console errors (if any): <paste>

Find the root cause first and explain it in 2–3 lines. Then fix it with the smallest change that addresses it, without touching unrelated parts, and deliver the complete updated file.
````
