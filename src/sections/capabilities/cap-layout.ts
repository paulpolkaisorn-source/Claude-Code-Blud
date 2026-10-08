// Where the capability formations sit on screen (direction-act2, capabilities: 3D layer and no-WebGL fallback; D20).
//
// The 3D blocks are drawn by the fixed canvas at the hero keyframe, so the 2D parts that stand next to them are placed
// from src/core/projection.ts and not from fixed columns. The projection gives three numbers, which are written to the
// section as custom properties (capabilities.css reads them):
//   --cap-fx      the x of the formation centre (bu 0, 0), in px of the viewport
//   --cap-fy      the y of the formation centre, in px of the viewport
//   --cap-fk      px per bu, at the active row (the scale the active group is drawn at)
//   --cap-bottom  the lowest px of the three capability formations, which places the intro under the stanza
// When a card is active its slot is centred on the viewport, so these values are also slot-relative: the elevation of
// the no-WebGL fallback sits where the blocks would be drawn.
import { boundsOf, formationRects, viewportSize, type ScreenRect } from '../../core/projection';
import type { FormationId } from '../../core/types';

/** The width of one block at scale 1, in bu (direction-3d 10.2). */
const BLOCK_BU = 0.7;

/** The three capability formations, in card order. */
const CAP_FORMATIONS: readonly FormationId[] = ['cap-0', 'cap-1', 'cap-2'];

/** Block 02 is the middle block of row A. It sits at bu x 0 in cap-0, where row A is the active row at scale 1. */
const MIDDLE_BLOCK = 2;

export interface StageGeometry {
  cx: number;
  cy: number;
  k: number;
  bottom: number;
}

/** Scratch buffers, reused so a resize allocates nothing beyond the first call. */
const rects: ScreenRect[] = [];
const bounds: ScreenRect = { x0: 0, y0: 0, x1: 0, y1: 0 };

/** Measures the capability formations at the hero keyframe for the current viewport. */
export function measureStage(): StageGeometry {
  const size = viewportSize();
  let cx = 0;
  let cy = 0;
  let k = 0;
  let bottom = -Infinity;
  for (const id of CAP_FORMATIONS) {
    const list = formationRects(id, 'hero', size, rects);
    if (id === 'cap-0') {
      // Copy the numbers now: the next formationRects call overwrites the buffer.
      const mid = list[MIDDLE_BLOCK];
      cx = (mid.x0 + mid.x1) / 2;
      cy = (mid.y0 + mid.y1) / 2;
      k = (mid.x1 - mid.x0) / BLOCK_BU;
    }
    bottom = Math.max(bottom, boundsOf(list, 0, list.length - 1, bounds).y1);
  }
  return { cx, cy, k, bottom };
}

/**
 * Measures the stage and writes the custom properties onto the section: the four projection values, and the height of
 * the intro, which the portrait layout puts above card 1.
 */
export function applyStage(section: HTMLElement): void {
  const g = measureStage();
  const style = section.style;
  style.setProperty('--cap-fx', `${g.cx}px`);
  style.setProperty('--cap-fy', `${g.cy}px`);
  style.setProperty('--cap-fk', `${g.k}px`);
  style.setProperty('--cap-bottom', `${g.bottom}px`);
  const intro = section.querySelector<HTMLElement>('.cap__intro');
  style.setProperty('--cap-intro-h', `${intro?.offsetHeight ?? 0}px`);
}
