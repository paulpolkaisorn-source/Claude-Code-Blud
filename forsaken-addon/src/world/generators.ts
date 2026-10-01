// Generators (wiki "Objectives"): 5 per map, 5 layers each, up to 3 repairers in parallel, no decay.
// Noli's Prankster adds fake generators that grant Hallucination instead of progress.
import { config } from "../core/config";
import type { Vec3 } from "../util/vec";
import type { GridPos } from "./nav";

export interface Generator {
  id: string;
  index: number;
  cell: GridPos;
  /** World position of the generator block (integer block coords). */
  block: Vec3;
  /** Progress in layers (0..layers), fractional while a layer is in progress. */
  progress: number;
  layers: number;
  fake: boolean;
  completed: boolean;
  /** Actor ids currently repairing. */
  repairers: Set<string>;
  /** Completed layers per actor (fake generators track their own count for Hallucination). */
  layerCredit: Map<string, number>;
  lastNoiseTick: number;
}

export function createGenerators(spots: Array<{ cell: GridPos; block: Vec3 }>, fakeIdx: number[] = []): Generator[] {
  const layers = config().match.generatorLayers;
  return spots.map((s, i) => ({
    id: `gen${i}`,
    index: i,
    cell: s.cell,
    block: s.block,
    progress: 0,
    layers,
    fake: fakeIdx.includes(i),
    completed: false,
    repairers: new Set(),
    layerCredit: new Map(),
    lastNoiseTick: -1000,
  }));
}

export interface RepairStep {
  /** Layers finished during this step (by integer boundary crossings). */
  layersFinished: number;
  completedNow: boolean;
}

/**
 * Advances a generator by dt seconds with the given per-repairer speed multipliers.
 * Each repairer solves their own puzzle in parallel (wiki), so speeds add up linearly.
 */
export function advanceGenerator(gen: Generator, dt: number, speedMultipliers: number[]): RepairStep {
  if (gen.completed || speedMultipliers.length === 0) return { layersFinished: 0, completedNow: false };
  const layerSeconds = config().match.layerSecondsSolo;
  const rate = speedMultipliers.reduce((a, b) => a + b, 0) / layerSeconds; // layers per second
  const before = gen.progress;
  gen.progress = Math.min(gen.layers, gen.progress + rate * dt);
  const layersFinished = Math.floor(gen.progress + 1e-9) - Math.floor(before + 1e-9);
  let completedNow = false;
  if (gen.progress >= gen.layers - 1e-9) {
    gen.progress = gen.layers;
    if (!gen.fake) {
      gen.completed = true;
      completedNow = true;
    }
  }
  return { layersFinished, completedNow };
}

/** Fake generators reset when finished (wiki: "Finishing one gives Hallucination III and resets its progress"). */
export function resetFake(gen: Generator): void {
  gen.progress = 0;
  gen.layerCredit.clear();
}

export function realGenerators(gens: Generator[]): Generator[] {
  return gens.filter((g) => !g.fake);
}

export function generatorsDone(gens: Generator[]): number {
  return gens.filter((g) => !g.fake && g.completed).length;
}
