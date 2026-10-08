// The object layer of the speed section: the race dimension line, its 17 ticks and the "17" label, and the no-WebGL race
// (design/direction-act1.md, speed, 2D layer; direction-act1 A6 and A7; director decisions D5 and D15.1).
//
// Every rectangle comes from projection.ts (formationRects with the 'speed' key), so the annotations sit on the 3D blocks.
// The race is taken at the speed keyframe: the dimension line is placed at its final position and drawn with settle(u)
// as the race forms. Portrait turns the race vertical (D15.1), so the dimension line runs vertically beside the column,
// 19 px (sp-4) to its right, and its ticks are horizontal.
import { boundsOf, formationRects, viewportSize, type ScreenRect, type Size } from '../../core/projection';

/** Race blocks, in index order (direction-3d 11.3). */
const BLOCKS = 17;
/** Gap between the race edge and the dimension line: 19 px (sp-4). */
const DIM_GAP = 19;
/** Half of a 5 px tick (sp-1), centred on the line. */
const TICK_HALF = 2.5;
/** Gap between the dimension line and the "17" label: 5 px (sp-1). */
const LABEL_GAP = 5;

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
  /** Places everything for the current viewport. Call on boot, on resize and on a ScrollTrigger refresh. */
  layout(): void;
  /** Draws the dimension line and its ticks for progress, the settled value settle(u) in [0, 1]. */
  paint(progress: number): void;
  /** Shows or hides the whole layer (the section is in view). */
  show(on: boolean): void;
  /** Whether the last layout was landscape (aspect 1 or wider). */
  isLandscape(): boolean;
  /** The left edge of the race in px: the column's left edge in portrait. */
  raceLeft(): number;
}

function clamp01(value: number): number {
  return Number.isNaN(value) ? 0 : Math.min(1, Math.max(0, value));
}

function blankRect(): ScreenRect {
  return { x0: 0, y0: 0, x1: 0, y1: 0 };
}

/** Builds the object layer. Nothing is measured until layout is called. */
export function createSpeedLayer(parts: LayerParts): SpeedLayer {
  const { art, rowFallback, colFallback, dim, dimLine, dimTicks, dimLabel } = parts;
  let size: Size = viewportSize();
  let landscape = true;
  let progress = 0;
  const rects: ScreenRect[] = [];
  const box: ScreenRect = blankRect();
  /** Line ends in landscape: x0 and x1 at y. In portrait: y0 and y1 at x. */
  let lineStart = 0;
  let lineEnd = 0;
  let lineFixed = 0;
  /** The centre of each block along the line: x in landscape, y in portrait. */
  const centres: number[] = [];

  /** Places the race, the fallback boxes and the dimension line for the viewport (A6, placed at the speed keyframe). */
  function layout(): void {
    size = viewportSize();
    landscape = size.width >= size.height;
    formationRects('race', 'speed', size, rects);
    boundsOf(rects, 0, BLOCKS - 1, box);

    // The no-WebGL race sits over the P1 rectangle of the race. Only the orientation that is shown is visible.
    for (const node of [rowFallback, colFallback]) {
      node.style.left = `${box.x0}px`;
      node.style.top = `${box.y0}px`;
      node.style.width = `${box.x1 - box.x0}px`;
      node.style.height = `${box.y1 - box.y0}px`;
    }

    dim.setAttribute('width', String(size.width));
    dim.setAttribute('height', String(size.height));
    dim.setAttribute('viewBox', `0 0 ${size.width} ${size.height}`);

    centres.length = BLOCKS;
    if (landscape) {
      const y = box.y1 + DIM_GAP;
      lineFixed = y;
      lineStart = rects[0].x0;
      lineEnd = rects[BLOCKS - 1].x1;
      for (let k = 0; k < BLOCKS; k += 1) centres[k] = (rects[k].x0 + rects[k].x1) / 2;
      const labelX = (lineStart + lineEnd) / 2;
      dimLabel.style.transform = `translate(${labelX}px, ${y + LABEL_GAP}px) translateX(-50%)`;
    } else {
      const x = box.x1 + DIM_GAP;
      lineFixed = x;
      lineStart = rects[0].y0;
      lineEnd = rects[BLOCKS - 1].y1;
      for (let k = 0; k < BLOCKS; k += 1) centres[k] = (rects[k].y0 + rects[k].y1) / 2;
      const labelY = (lineStart + lineEnd) / 2;
      dimLabel.style.transform = `translate(${x + LABEL_GAP}px, ${labelY}px) translateY(-50%)`;
    }
    paint(progress);
  }

  /** Draws the line to settle(u) and shows each tick once the line has passed its block (k + 0.5) / 17. */
  function paint(value: number): void {
    progress = clamp01(value);
    const reach = lineStart + (lineEnd - lineStart) * progress;
    if (landscape) {
      dimLine.setAttribute('x1', String(lineStart));
      dimLine.setAttribute('y1', String(lineFixed));
      dimLine.setAttribute('x2', String(reach));
      dimLine.setAttribute('y2', String(lineFixed));
    } else {
      dimLine.setAttribute('x1', String(lineFixed));
      dimLine.setAttribute('y1', String(lineStart));
      dimLine.setAttribute('x2', String(lineFixed));
      dimLine.setAttribute('y2', String(reach));
    }
    // Tick k is visible when progress >= (k + 0.5) / 17. Those k form a prefix, so the count gives the ticks.
    const count = Math.min(BLOCKS, Math.max(0, Math.floor(progress * BLOCKS - 0.5 + 1e-9) + 1));
    let d = '';
    for (let k = 0; k < count; k += 1) {
      const c = centres[k];
      d += landscape
        ? `M${c} ${lineFixed - TICK_HALF}V${lineFixed + TICK_HALF}`
        : `M${lineFixed - TICK_HALF} ${c}H${lineFixed + TICK_HALF}`;
    }
    dimTicks.setAttribute('d', d === '' ? 'M0 0' : d);
    // The label appears with the line's completion.
    dimLabel.classList.toggle('is-on', progress >= 1);
  }

  function show(on: boolean): void {
    art.classList.toggle('is-on', on);
  }

  return {
    layout,
    paint,
    show,
    isLandscape: () => landscape,
    raceLeft: () => box.x0,
  };
}
