import { Impact } from '../types';

export function toMeters(d: number, unit: string): number {
  return unit === 'yd' ? d * 0.9144 : d;
}

export function toMoa(sizeMm: number, distM: number): string {
  return (sizeMm / (distM * 0.02908)).toFixed(2);
}

export function calcGroup(impacts: Impact[], wMm: number, hMm: number): number {
  let max = 0;
  for (let i = 0; i < impacts.length; i++) {
    for (let j = i + 1; j < impacts.length; j++) {
      const dx = (impacts[i].x - impacts[j].x) * wMm;
      const dy = (impacts[i].y - impacts[j].y) * hMm;
      max = Math.max(max, Math.sqrt(dx * dx + dy * dy));
    }
  }
  return max;
}

export function calcMeanRadius(impacts: Impact[], wMm: number, hMm: number): number | null {
  if (impacts.length < 2) return null;
  const cx = impacts.reduce((s, i) => s + i.x, 0) / impacts.length;
  const cy = impacts.reduce((s, i) => s + i.y, 0) / impacts.length;
  const sum = impacts.reduce((s, imp) => {
    const dx = (imp.x - cx) * wMm;
    const dy = (imp.y - cy) * hMm;
    return s + Math.sqrt(dx * dx + dy * dy);
  }, 0);
  return sum / impacts.length;
}

export function calcCenterOfImpact(impacts: Impact[]): { x: number; y: number } | null {
  if (impacts.length === 0) return null;
  return {
    x: impacts.reduce((s, i) => s + i.x, 0) / impacts.length,
    y: impacts.reduce((s, i) => s + i.y, 0) / impacts.length,
  };
}
