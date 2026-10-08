// The preloader section's 3D layer (design/direction-act1.md, preloader; design/direction-3d.md sections 10.6 and 11.2).
// The section has height 0 and is never current, so update() and setActive() do nothing. Its job is the handoff,
// which runs on a tick of its own. Until loader:done the 17 blocks of the stanza stand at scale 0 (entrance 0).
// At loader:done the kireji grows first (ef.cut over T.beat5), and each follower grows (ef.settle over T.half)
// after T.micro plus its HAIKU_OFFSETS entry. The clock is the page clock, read on the first tick after
// loader:done. There are no timers. The camera holds the hero keyframe until the handoff ends, because the 2D
// footprints are placed with that key.
import { bus } from '../../core/bus';
import { ef } from '../../core/ease';
import { env } from '../../core/env';
import { addTick, PRIORITY, type Tick } from '../../core/ticker';
import { HAIKU_OFFSETS, T } from '../../core/timing';
import { BLOCK_COUNT, FORMATIONS, STAGGER_ORDER } from '../../gl/blocks/formations';
import { cameraKey } from '../../gl/rig';
import type { CameraKey, GLWorld, SectionGL, SectionGLContext, SectionGLHandle } from '../../gl/section-gl';

/**
 * Whether loader:done has fired. bus.last cannot answer this, because a void event stores undefined. The listener
 * is added when this module is evaluated. The module belongs to the GL chunk, which is a loader task (src/main.ts),
 * so the listener is in place before loader:done is emitted.
 */
let loaderDone = false;
bus.once('loader:done', () => {
  loaderDone = true;
});

/** The block at each stagger position of the stanza (direction-3d 11.2). Position 0 is the kireji, block 4. */
const BLOCK_AT_POSITION: readonly number[] = STAGGER_ORDER.stanza;

/** Seconds from loader:done to the end of the handoff. The last follower ends at T.micro + HAIKU_OFFSETS[16] + T.half. */
const HANDOFF_END = Math.max(T.beat5, T.micro + HAIKU_OFFSETS[BLOCK_COUNT - 1] + T.half);

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/** Scale of stagger position k, in seconds after loader:done (direction-act1 preloader, Sequence). */
function entranceAt(k: number, elapsed: number): number {
  if (k === 0) return ef.cut(clamp01(elapsed / T.beat5));
  return ef.settle(clamp01((elapsed - T.micro - HAIKU_OFFSETS[k]) / T.half));
}

/**
 * The preloader's handle on the shared world. It creates no objects of its own: the blocks and the camera rig are
 * the shared ones, and the only state it adds is the handoff clock.
 */
function setup(world: GLWorld): SectionGLHandle {
  const { blocks, rig, stage } = world;
  const canvas = stage.canvas;

  // The stanza is the rest pose. formationFor leaves it unturned in portrait, so FORMATIONS.stanza serves both.
  blocks.setPoses(FORMATIONS.stanza);

  // The hero keyframe, recomputed when the viewport size changes, because cameraKey reads the aspect.
  const key: CameraKey = cameraKey('hero', stage.size);
  let keyWidth = stage.size.width;
  let keyHeight = stage.size.height;

  /** Holds the camera on the hero keyframe: a blend from the key to itself (direction-act1 A7). */
  function holdCamera(): void {
    if (stage.size.width !== keyWidth || stage.size.height !== keyHeight) {
      cameraKey('hero', stage.size, key);
      keyWidth = stage.size.width;
      keyHeight = stage.size.height;
    }
    rig.blend(key, key, 1);
  }

  /** Sets the entrance of every block at once, by block index. */
  function setAllEntrances(value: number): void {
    for (let k = 0; k < BLOCK_COUNT; k += 1) blocks.setEntrance(BLOCK_AT_POSITION[k], value);
  }

  // Reduced motion (direction-act1 A5, second step): the canvas stays at opacity 0 until the handoff, then fades in.
  let canvasHeld = false;
  function releaseCanvas(): void {
    if (!canvasHeld) return;
    canvasHeld = false;
    canvas.style.opacity = '';
  }

  // boot: loader:done has not fired. pending: it has, and the clock starts on the next tick.
  // running: the clock is running. done: the handoff is over and the tick has been removed.
  type Phase = 'boot' | 'pending' | 'running' | 'done';
  let phase: Phase = 'boot';
  let t0 = 0;
  let disposed = false;
  let removeTick: () => void = () => undefined;
  let removeLoaded: () => void = () => undefined;

  function finish(): void {
    phase = 'done';
    removeTick();
    removeLoaded();
  }

  // PRIORITY.state runs before blocks.update (PRIORITY.glUpdate), so an entrance change lands on the same frame.
  function onTick(t: Tick): void {
    if (phase === 'done') return;
    holdCamera();
    if (phase === 'boot') return;
    if (phase === 'pending') {
      t0 = t.time;
      phase = 'running';
    }
    const elapsed = t.time - t0;

    if (env.reducedMotion) {
      // Reduced motion: every block at full scale at once. A held canvas fades in over T.half.
      setAllEntrances(1);
      if (!canvasHeld) {
        finish();
        return;
      }
      if (elapsed >= T.half) {
        releaseCanvas();
        finish();
      } else {
        canvas.style.opacity = ef.fade(clamp01(elapsed / T.half)).toFixed(4);
      }
      return;
    }

    releaseCanvas();
    if (elapsed >= HANDOFF_END) {
      setAllEntrances(1);
      finish();
      return;
    }
    for (let k = 0; k < BLOCK_COUNT; k += 1) blocks.setEntrance(BLOCK_AT_POSITION[k], entranceAt(k, elapsed));
  }

  if (loaderDone) {
    // loader:done fired before setup, so the handoff is over and the blocks are at rest now.
    setAllEntrances(1);
    phase = 'done';
    holdCamera();
  } else {
    setAllEntrances(0);
    if (env.reducedMotion) {
      canvas.style.opacity = '0';
      canvasHeld = true;
    }
    removeLoaded = bus.once('loader:done', () => {
      if (phase === 'boot') phase = 'pending';
    });
    removeTick = addTick(onTick, PRIORITY.state);
  }

  return {
    // The preloader is never current, so it has no per-frame work. The handoff runs on the page clock (onTick).
    update(_progress: number, _tick: Tick, _ctx: SectionGLContext): void {
      // Nothing visible happens here.
    },
    // Nothing is set and nothing needs tidying: the layer has no lifts, tilt, group offset or extra objects.
    setActive(_active: boolean, _ctx: SectionGLContext): void {
      // Nothing visible happens here.
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      removeTick();
      removeLoaded();
      if (phase !== 'done') {
        // Released before the handoff ends: leave the blocks at full scale, not hidden.
        phase = 'done';
        setAllEntrances(1);
        releaseCanvas();
      }
    },
  };
}

/** The preloader's GL layer. It is never the current section, so its formation and key are the rest pose only. */
export const preloaderGL: SectionGL = {
  id: 'preloader',
  formation: 'stanza',
  key: 'hero',
  ink: 0,
  dof: null,
  breath: null,
  setup,
};
