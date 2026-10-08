// The persistent WebGL stage (architecture sections 6, 7 and 8).
// One WebGLRenderer on one canvas, drawn from the shared ticker. Every GL-side layer draws into
// this stage, and nothing else creates a renderer. Resizes are applied at most once per frame,
// before the GL update tick runs.
import * as THREE from 'three';
import { env } from '../core/env';
import { addTick, PRIORITY } from '../core/ticker';

export interface Stage {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  canvas: HTMLCanvasElement;
  /** Drawing size in CSS pixels and the device-pixel ratio applied to it. Updated in place on each applied resize. */
  size: { width: number; height: number; dpr: number };
  /** Calls fn after each applied resize, with a copy of the new size. Returns the unsubscribe function. */
  onResize(fn: (s: Stage['size']) => void): () => void;
  /** Replaces the per-frame draw. The default is renderer.render(scene, camera); post.ts installs its composer here. */
  setRenderHook(fn: () => void): void;
  /** Sets the device-pixel-ratio cap. It is written to env.dprCap and applied on the next frame. */
  setDprCap(cap: number): void;
  /** Removes the ticks and listeners and disposes the renderer. The stage is not usable afterwards. */
  dispose(): void;
}

/** Paper. The background shader paints over it, so this only shows if that shader is absent. */
const CLEAR_COLOR = 0xf1ece0;
const FOV_DEG = 22;
const NEAR = 0.5;
const FAR = 80;
const CAMERA_Z = 21.15;

interface Viewport {
  width: number;
  height: number;
  dpr: number;
}

/** Reads the viewport now. The cap is env.dprCap, which quality.ts moves through setTier. */
function measure(): Viewport {
  return {
    width: Math.max(1, window.innerWidth),
    height: Math.max(1, window.innerHeight),
    dpr: Math.min(window.devicePixelRatio || 1, env.dprCap),
  };
}

function sameViewport(a: Viewport, b: Viewport): boolean {
  return a.width === b.width && a.height === b.height && a.dpr === b.dpr;
}

function makeRenderer(canvas: HTMLCanvasElement): THREE.WebGLRenderer {
  try {
    return new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      stencil: false,
      depth: true,
      powerPreference: 'high-performance',
    });
  } catch (err) {
    // three throws when no WebGL2 context can be created. Keep its error as the cause.
    throw new Error('createStage: WebGL2 is unavailable', { cause: err });
  }
}

/**
 * Builds the stage on canvas. Throws if WebGL2 is unavailable, so the caller checks env.gl first.
 * Listens for window and visualViewport resizes, and for context loss on the canvas.
 */
export function createStage(canvas: HTMLCanvasElement): Stage {
  const renderer = makeRenderer(canvas);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true;
  // This three release removed PCFSoftShadowMap for WebGL. WebGLShadowMap warns and swaps in
  // PCFShadowMap on every shadow pass, so the filter is requested directly.
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setClearColor(CLEAR_COLOR, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV_DEG, 1, NEAR, FAR);
  camera.position.set(0, 0, CAMERA_Z);
  camera.lookAt(0, 0, 0);

  const size = { width: 1, height: 1, dpr: 1 };
  // What the renderer currently holds. The first apply always runs because dpr starts at 0.
  let applied: Viewport = { width: 0, height: 0, dpr: 0 };
  let dirty = false;
  let lost = false;
  let disposed = false;
  let renderHook: () => void = () => renderer.render(scene, camera);
  const resizeListeners = new Set<(s: Stage['size']) => void>();

  function applyViewport(next: Viewport): void {
    if (next.dpr !== applied.dpr) renderer.setPixelRatio(next.dpr);
    // false: the page CSS keeps the canvas fixed to the viewport, so three must not write its style.
    renderer.setSize(next.width, next.height, false);
    camera.aspect = next.width / next.height;
    camera.updateProjectionMatrix();
    applied = next;
    size.width = next.width;
    size.height = next.height;
    size.dpr = next.dpr;
    for (const listener of [...resizeListeners]) {
      try {
        listener({ width: size.width, height: size.height, dpr: size.dpr });
      } catch (err) {
        console.error('[stage] an onResize listener threw; the other listeners still run', err);
      }
    }
  }

  function markDirty(): void {
    dirty = true;
  }

  window.addEventListener('resize', markDirty, { passive: true });
  window.visualViewport?.addEventListener('resize', markDirty, { passive: true });

  // Runs once per frame, just before the GL update tick (PRIORITY.glUpdate - 1).
  const removeResizeTick = addTick(() => {
    if (disposed || lost || !dirty) return;
    dirty = false;
    const next = measure();
    if (!sameViewport(next, applied)) applyViewport(next);
  }, PRIORITY.glUpdate - 1);

  const removeRenderTick = addTick(() => {
    if (disposed || lost || document.hidden) return;
    renderHook();
  }, PRIORITY.glRender);

  function onContextLost(event: Event): void {
    event.preventDefault();
    if (lost) return;
    lost = true;
    document.documentElement.classList.add('no-gl');
    console.warn('[stage] WebGL context lost; the page stays on its static fallbacks.');
  }
  // webglcontextrestored is deliberately not handled. After a restore the page stays static.
  canvas.addEventListener('webglcontextlost', onContextLost);

  applyViewport(measure());

  const stage: Stage = {
    renderer,
    scene,
    camera,
    canvas,
    size,
    onResize(fn) {
      // A wrapper per registration, so the same fn can be added twice and removed separately.
      const entry = (s: Stage['size']): void => fn(s);
      resizeListeners.add(entry);
      return () => {
        resizeListeners.delete(entry);
      };
    },
    setRenderHook(fn) {
      renderHook = fn;
    },
    setDprCap(cap) {
      if (!Number.isFinite(cap) || cap <= 0) {
        throw new RangeError(`setDprCap: ${cap} is not a usable cap`);
      }
      // env.dprCap stays the single source of the cap. The next frame applies it.
      env.dprCap = cap;
      dirty = true;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      removeResizeTick();
      removeRenderTick();
      window.removeEventListener('resize', markDirty);
      window.visualViewport?.removeEventListener('resize', markDirty);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      resizeListeners.clear();
      renderer.dispose();
    },
  };
  return stage;
}
