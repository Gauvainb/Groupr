// Synthetic target image generator for detection tests.
import { RawImage } from '../detectHoles';

export interface SyntheticSpec {
  width: number;
  height: number;
  /** Paper gray level 0-255. Default 235. */
  paper?: number;
  /** Scene background outside the paper. Default: paper fills the frame. */
  scene?: { background: number; paperRect: { x: number; y: number; w: number; h: number } };
  /** Filled dark discs (e.g. black bullseye zones). */
  discs?: { x: number; y: number; r: number; shade?: number }[];
  /** Holes: filled dark circles. */
  holes?: { x: number; y: number; r: number; shade?: number }[];
  /** Thin ring outlines (scoring rings). */
  rings?: { x: number; y: number; r: number; thickness?: number; shade?: number }[];
  /** Straight lines (grid/text strokes). */
  lines?: { x1: number; y1: number; x2: number; y2: number; thickness?: number; shade?: number }[];
  /** Gaussian-ish noise amplitude. */
  noise?: number;
  /** Deterministic PRNG seed. */
  seed?: number;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeTarget(spec: SyntheticSpec): RawImage {
  const { width, height, paper = 235, noise = 0, seed = 42 } = spec;
  const gray = new Float64Array(width * height).fill(
    spec.scene ? spec.scene.background : paper
  );
  if (spec.scene) {
    const { x, y, w, h } = spec.scene.paperRect;
    for (let py = y; py < y + h; py++) {
      for (let px = x; px < x + w; px++) {
        if (px >= 0 && px < width && py >= 0 && py < height) gray[py * width + px] = paper;
      }
    }
  }

  for (const disc of spec.discs ?? []) {
    const shade = disc.shade ?? 25;
    forEachInBox(width, height, disc.x, disc.y, disc.r + 1, (px, py, idx) => {
      if (Math.hypot(px - disc.x, py - disc.y) <= disc.r) gray[idx] = shade;
    });
  }

  for (const ring of spec.rings ?? []) {
    const t = ring.thickness ?? 2;
    const shade = ring.shade ?? 60;
    const lo = ring.r - t / 2;
    const hi = ring.r + t / 2;
    forEachInBox(width, height, ring.x, ring.y, hi + 1, (px, py, idx) => {
      const d = Math.hypot(px - ring.x, py - ring.y);
      if (d >= lo && d <= hi) gray[idx] = shade;
    });
  }

  for (const line of spec.lines ?? []) {
    const t = (line.thickness ?? 2) / 2;
    const shade = line.shade ?? 60;
    const dx = line.x2 - line.x1;
    const dy = line.y2 - line.y1;
    const len2 = dx * dx + dy * dy || 1;
    const minX = Math.max(0, Math.floor(Math.min(line.x1, line.x2) - t - 1));
    const maxX = Math.min(width - 1, Math.ceil(Math.max(line.x1, line.x2) + t + 1));
    const minY = Math.max(0, Math.floor(Math.min(line.y1, line.y2) - t - 1));
    const maxY = Math.min(height - 1, Math.ceil(Math.max(line.y1, line.y2) + t + 1));
    for (let py = minY; py <= maxY; py++) {
      for (let px = minX; px <= maxX; px++) {
        const u = Math.max(0, Math.min(1, ((px - line.x1) * dx + (py - line.y1) * dy) / len2));
        const d = Math.hypot(px - (line.x1 + u * dx), py - (line.y1 + u * dy));
        if (d <= t) gray[py * width + px] = shade;
      }
    }
  }

  for (const hole of spec.holes ?? []) {
    const shade = hole.shade ?? 30;
    forEachInBox(width, height, hole.x, hole.y, hole.r + 1, (px, py, idx) => {
      if (Math.hypot(px - hole.x, py - hole.y) <= hole.r) gray[idx] = shade;
    });
  }

  const rand = mulberry32(seed);
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < gray.length; i++) {
    let v = gray[i];
    if (noise > 0) v += (rand() - 0.5) * 2 * noise;
    v = Math.max(0, Math.min(255, v));
    data[i * 4] = v;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }
  return { width, height, data };
}

function forEachInBox(
  width: number,
  height: number,
  cx: number,
  cy: number,
  reach: number,
  fn: (px: number, py: number, idx: number) => void
) {
  const minX = Math.max(0, Math.floor(cx - reach));
  const maxX = Math.min(width - 1, Math.ceil(cx + reach));
  const minY = Math.max(0, Math.floor(cy - reach));
  const maxY = Math.min(height - 1, Math.ceil(cy + reach));
  for (let py = minY; py <= maxY; py++) {
    for (let px = minX; px <= maxX; px++) {
      fn(px, py, py * width + px);
    }
  }
}
