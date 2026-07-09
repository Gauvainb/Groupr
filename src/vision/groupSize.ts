import { Hole } from './detectHoles';

/** Extreme spread: max center-to-center distance, px. 0 for fewer than 2 holes. */
export function extremeSpreadPx(holes: { x: number; y: number }[]): number {
  let max = 0;
  for (let i = 0; i < holes.length; i++) {
    for (let j = i + 1; j < holes.length; j++) {
      const dx = holes[i].x - holes[j].x;
      const dy = holes[i].y - holes[j].y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > max) max = d;
    }
  }
  return max;
}

/**
 * mm per pixel derived from known bullet diameter: median detected hole
 * diameter in px corresponds to the caliber. Median resists outliers from
 * torn or overlapping holes.
 */
export function mmPerPxFromCaliber(holes: Hole[], caliberMm: number): number | null {
  if (holes.length === 0 || caliberMm <= 0) return null;
  const diameters = holes.map((h) => h.radiusPx * 2).sort((a, b) => a - b);
  const mid = diameters.length >> 1;
  const median =
    diameters.length % 2 === 1 ? diameters[mid] : (diameters[mid - 1] + diameters[mid]) / 2;
  if (median <= 0) return null;
  return caliberMm / median;
}

export function groupSizeMm(holes: Hole[], caliberMm: number): number | null {
  if (holes.length < 2) return null;
  const scale = mmPerPxFromCaliber(holes, caliberMm);
  if (scale === null) return null;
  return extremeSpreadPx(holes) * scale;
}

/** Group size in MOA at a distance. 1 MOA ≈ 29.09 mm at 100 m. */
export function mmToMoa(sizeMm: number, distanceM: number): number | null {
  if (distanceM <= 0) return null;
  return sizeMm / (distanceM * 0.29089);
}

/**
 * Parse a caliber string to mm. Handles ".308", "0.22", "5.56", "9mm",
 * "6.5 Creedmoor", "308 Win", "45 ACP".
 */
export function parseCaliberMm(s: string): number | null {
  const m = s.match(/(\d*\.?\d+)/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (!isFinite(n) || n <= 0) return null;
  if (n <= 1) return n * 25.4; // decimal inches: .308, 0.45
  if (n <= 25) return n; // millimeters: 5.56, 9, 12.7
  // bare inch caliber without the dot: 223, 308, 45
  return (n / Math.pow(10, Math.ceil(Math.log10(n + 1)))) * 25.4;
}
