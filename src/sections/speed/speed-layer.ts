// The object layer of the speed section: the race dimension line, its 17 ticks and the "17" label, and the no-WebGL
// race (design/direction-act1.md, speed, 2D and 3D layers; design/drafts/director-decisions.md D5, D15.1, D20.2, D21.2
// and D21.7).
//
// The annotations follow the 3D blocks at every progress, not only at rest (D20.2, D21.7). follow(u) rebuilds the 17
// race poses at u the way src/sections/speed/gl.ts writes them: the hero's exit pose, the race pose of each block,
// scrubLocal on the block's race stagger position, anticipate on the kireji and settle on the other sixteen. It blends
// the hero and the speed camera keys with ef.sym as src/gl/rig.ts does, and projects the drawn outline of each block
// with projection.ts (projectPoint on its eight corners, as blocks.projectRects does), so the line ends sit on the
// edges that are drawn. The layer is fixed to the viewport, as the canvas is, so the sticky stage cannot move it
// against the blocks. The pure modules it imports (formations, timing, rig and projection) hold no three.js code.
//
// The dimension line runs from the left edge of block 01 to the right edge of block 17, 19 px (sp-4) outside the
// blocks: below them in landscape, and beside them in portrait, where the race is a column (D15.1). It is drawn to
// settle(u). Tick k sits at block k's centre and shows once settle(u) reaches (k + 0.5) / 17. The label "17" shows when
// the line is complete. In portrait the label sits centred under the line's end: the 19 px beside the column leave no
// room for it on a phone.
import { ef } from '../../core/ease';
import {
  boundsOf,
  formationRects,
  projectPoint,
  viewportSize,
  type Point,
  type ScreenRect,
  type Size,
} from '../../core/projection';
import { scrubLocal } from '../../core/timing';
import {
  BLOCK,
  BLOCK_COUNT,
  formationFor,
  lerpPose,
  staggerPosition,
  stanzaOpen,
  type Pose,
} from '../../gl/blocks/formations';
import { cameraKey, FIT } from '../../gl/rig';
import type { CameraKey } from '../../gl/section-gl';

/** The race scrub profile, as src/sections/speed/gl.ts uses it: total 0.35 and lead 0.10. */
const SCRUB = { total: 0.35, lead: 0.1 } as const;
/** Gap between the blocks and the dimension line: 19 px (sp-4). */
const DIM_GAP = 19;
/** Half of a 5 px tick (sp-1), centred on the line. */
const TICK_HALF = 2.5;
/** Gap between the dimension line and the "17" label: 5 px (sp-1). */
const LABEL_GAP = 5;
/** The hero's exit pose, where the race starts: the stanza at open progress 1 (gl.ts: heroExitPoses(false, [])). */
const EXIT: readonly Pose[] = stanzaOpen(1, []);
/** The race stagger position of each block: element i is the position k of block i. */
const RACE_POSITION: readonly number[] = staggerPosition('race');

/** The elements the layer drives. */
export interface LayerParts {
  art: HTMLElement;
  rowFallback: HTMLElement;
  colFallback: HTMLElement;
  dim: SVGSVGElement;
  dimLine: SVGLineElement;
  dimTicks: SVGPathElement;
  dimLabel: HTMLElement;
}

export interface SpeedLayer {
  /** Places what does not move with the progress: the no-WebGL race boxes and the dimension svg. Call on boot and resize. */
  layout(): void;
  /** Places the annotations on the blocks at race progress u (0 to 1, u = clamp(s / 0.25)), in the current viewport. */
  follow(u: number): void;
  /** Shows or hides the whole layer. */
  show(on: boolean): void;
  /** Whether the last layout was landscape (aspect 1 or wider). */
  isLandscape(): boolean;
  /** The left edge of the rest race in px (the race at u = 1): the column's left edge in portrait. */
  raceLeft(): number;
}

function clamp01(value: number): number {
  return Number.isNaN(value) ? 0 : Math.min(1, Math.max(0, value));
}

function blankRect(): ScreenRect {
  return { x0: 0, y0: 0, x1: 0, y1: 0 };
}

function blankKey(): CameraKey {
  return { position: [0, 0, 0], target: [0, 0, 0], fov: FIT.fovDeg };
}

/**
 * The drawn outline of each block through key: the bounds of its eight projected corners, which is the rectangle that
 * blocks.projectRects reports. The outline includes the side faces, so an edge of a block can be a back-face corner.
 * Writes into out, reusing its entries, and centre is a scratch point.
 */
function drawnRects(poses: readonly Pose[], key: CameraKey, size: Size, out: ScreenRect[], centre: Point): void {
  for (let i = 0; i < poses.length; i += 1) {
    const pose = poses[i];
    const hw = (BLOCK.width / 2) * pose.s;
    const hh = (BLOCK.height / 2) * pose.s;
    const hd = (BLOCK.depth / 2) * pose.s;
    let x0 = Number.POSITIVE_INFINITY;
    let y0 = Number.POSITIVE_INFINITY;
    let x1 = Number.NEGATIVE_INFINITY;
    let y1 = Number.NEGATIVE_INFINITY;
    for (let c = 0; c < 8; c += 1) {
      const dx = (c & 1) !== 0 ? hw : -hw;
      const dy = (c & 2) !== 0 ? hh : -hh;
      const dz = (c & 4) !== 0 ? hd : -hd;
      projectPoint(pose.p[0] + dx, pose.p[1] + dy, pose.p[2] + dz, key, size, centre);
      x0 = Math.min(x0, centre.x);
      y0 = Math.min(y0, centre.y);
      x1 = Math.max(x1, centre.x);
      y1 = Math.max(y1, centre.y);
    }
    let rect = out[i];
    if (rect === undefined) {
      rect = { x0, y0, x1, y1 };
      out[i] = rect;
    } else {
      rect.x0 = x0;
      rect.y0 = y0;
      rect.x1 = x1;
      rect.y1 = y1;
    }
  }
  out.length = poses.length;
}

/** Builds the object layer. Nothing is measured until layout is called. */
export function createSpeedLayer(parts: LayerParts): SpeedLayer {
  const { art, rowFallback, colFallback, dim, dimLine, dimTicks, dimLabel } = parts;
  /** The rest race (u = 1): the no-WebGL boxes and the head band are placed from it. */
  const restRects: ScreenRect[] = [];
  const restBox: ScreenRect = blankRect();
  let landscape = true;
  /** The 17 race poses at the current u, reused by every call. */
  const poses: Pose[] = Array.from({ length: BLOCK_COUNT }, (): Pose => ({ p: [0, 0, 0], r: [0, 0, 0], s: 1 }));
  /** The drawn outlines of the blocks at the current u, and their union. */
  const rects: ScreenRect[] = [];
  const box: ScreenRect = blankRect();
  const heroKey = blankKey();
  const raceKey = blankKey();
  const blended = blankKey();
  const centre: Point = { x: 0, y: 0 };
  /** The centre of each block along the line: x in landscape, y in portrait. */
  const centres: number[] = Array.from({ length: BLOCK_COUNT }, (): number => 0);
  // What was last written. A frame that changes nothing writes nothing.
  let lastLine = '';
  let lastTicks = '';
  let lastLabel = '';
  let labelOn: boolean | null = null;
  let shown: boolean | null = null;

  /** Places the no-WebGL boxes and the dimension svg for the viewport. The race itself is placed by follow. */
  function layout(): void {
    const size = viewportSize();
    landscape = size.width >= size.height;
    formationRects('race', 'speed', size, restRects);
    boundsOf(restRects, 0, BLOCK_COUNT - 1, restBox);
    for (const node of [rowFallback, colFallback]) {
      node.style.left = `${restBox.x0}px`;
      node.style.top = `${restBox.y0}px`;
      node.style.width = `${restBox.x1 - restBox.x0}px`;
      node.style.height = `${restBox.y1 - restBox.y0}px`;
    }
    dim.setAttribute('width', String(size.width));
    dim.setAttribute('height', String(size.height));
    dim.setAttribute('viewBox', `0 0 ${size.width} ${size.height}`);
    // A new viewport rewrites every annotation attribute on the next follow.
    lastLine = '';
    lastTicks = '';
    lastLabel = '';
  }

  /** The race poses at u, written as src/sections/speed/gl.ts writes them (writePoses). */
  function buildPoses(u: number, portrait: boolean): void {
    const to = formationFor('race', portrait);
    for (let i = 0; i < BLOCK_COUNT; i += 1) {
      const k = RACE_POSITION[i];
      const q = scrubLocal(k, BLOCK_COUNT, u, SCRUB);
      const e = k === 0 ? ef.anticipate(q) : ef.settle(q);
      lerpPose(EXIT[i], to[i], e, poses[i]);
    }
  }

  /** The camera at u: the hero key blended to the speed key with ef.sym, as rig.blend does for the entry (gl.ts). */
  function buildCamera(u: number, size: Size): void {
    cameraKey('hero', size, heroKey);
    cameraKey('speed', size, raceKey);
    const k = ef.sym(u);
    for (let c = 0; c < 3; c += 1) {
      blended.position[c] = heroKey.position[c] + (raceKey.position[c] - heroKey.position[c]) * k;
      blended.target[c] = heroKey.target[c] + (raceKey.target[c] - heroKey.target[c]) * k;
    }
    blended.fov = heroKey.fov + (raceKey.fov - heroKey.fov) * k;
  }

  /** Draws the dimension line, its ticks and the label from the outlines in rects and their union, box. */
  function draw(u: number): void {
    const p = ef.settle(u);
    let start: number;
    let end: number;
    let fixed: number;
    if (landscape) {
      fixed = box.y1 + DIM_GAP;
      start = rects[0].x0;
      end = rects[BLOCK_COUNT - 1].x1;
    } else {
      fixed = box.x1 + DIM_GAP;
      start = rects[0].y0;
      end = rects[BLOCK_COUNT - 1].y1;
    }
    const reach = start + (end - start) * p;
    const line = landscape ? `${start} ${fixed} ${reach} ${fixed}` : `${fixed} ${start} ${fixed} ${reach}`;
    if (line !== lastLine) {
      lastLine = line;
      if (landscape) {
        dimLine.setAttribute('x1', String(start));
        dimLine.setAttribute('y1', String(fixed));
        dimLine.setAttribute('x2', String(reach));
        dimLine.setAttribute('y2', String(fixed));
      } else {
        dimLine.setAttribute('x1', String(fixed));
        dimLine.setAttribute('y1', String(start));
        dimLine.setAttribute('x2', String(fixed));
        dimLine.setAttribute('y2', String(reach));
      }
    }

    // Tick k is visible when settle(u) >= (k + 0.5) / 17. Those k form a prefix, so the count gives the ticks.
    const count = Math.min(BLOCK_COUNT, Math.max(0, Math.floor(p * BLOCK_COUNT - 0.5 + 1e-9) + 1));
    let d = '';
    for (let k = 0; k < count; k += 1) {
      const c = centres[k];
      d += landscape
        ? `M${c} ${fixed - TICK_HALF}V${fixed + TICK_HALF}`
        : `M${fixed - TICK_HALF} ${c}H${fixed + TICK_HALF}`;
    }
    if (d === '') d = 'M0 0';
    if (d !== lastTicks) {
      lastTicks = d;
      dimTicks.setAttribute('d', d);
    }

    // The label is centred on the line: under its midpoint in landscape, under its end in portrait.
    const labelTransform = landscape
      ? `translate(${(start + end) / 2}px, ${fixed + LABEL_GAP}px) translateX(-50%)`
      : `translate(${fixed}px, ${end + LABEL_GAP}px) translateX(-50%)`;
    if (labelTransform !== lastLabel) {
      lastLabel = labelTransform;
      dimLabel.style.transform = labelTransform;
    }
    // The label has its own visibility rule, which would show it through a hidden layer, so it is wanted only while the
    // layer is shown (show clears it when the layer goes).
    const labelWanted = p >= 1 && shown === true;
    if (labelWanted !== labelOn) {
      labelOn = labelWanted;
      dimLabel.classList.toggle('is-on', labelWanted);
    }
  }

  function follow(progress: number): void {
    const size = viewportSize();
    if (!(size.width > 0 && size.height > 0)) return;
    const u = clamp01(progress);
    const portrait = size.width < size.height;
    landscape = !portrait;
    buildPoses(u, portrait);
    buildCamera(u, size);
    // The drawn outlines through the blended camera, and the centre of each block projected at its own centre (not at
    // its front face), so that the ticks sit where the block's centre is drawn.
    drawnRects(poses, blended, size, rects, centre);
    boundsOf(rects, 0, BLOCK_COUNT - 1, box);
    for (let i = 0; i < BLOCK_COUNT; i += 1) {
      const pose = poses[i];
      projectPoint(pose.p[0], pose.p[1], pose.p[2], blended, size, centre);
      centres[i] = landscape ? centre.x : centre.y;
    }
    draw(u);
  }

  /**
   * Forces the layer on or off. The argument is taken as a strict boolean, because classList.toggle with undefined flips
   * the class. Hiding the layer also clears the label, which has its own visibility rule.
   */
  function show(on: boolean): void {
    const value = on === true;
    if (value === shown) return;
    shown = value;
    art.classList.toggle('is-on', value);
    if (!value) {
      labelOn = false;
      dimLabel.classList.remove('is-on');
    }
  }

  return {
    layout,
    follow,
    show,
    isLandscape: () => landscape,
    raceLeft: () => restBox.x0,
  };
}
