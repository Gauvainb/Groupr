import { test } from 'node:test';
import assert from 'node:assert/strict';

import { detectHoles, toGrayscale, otsuThreshold, Hole } from '../detectHoles';
import {
  extremeSpreadPx,
  mmPerPxFromCaliber,
  groupSizeMm,
  mmToMoa,
  parseCaliberMm,
} from '../groupSize';
import { base64ToBytes, decodeJpegBase64 } from '../decodeImage';
import { makeTarget } from './synthetic';

/** Match detected holes to expected centers within tolerance px. */
function matchHoles(
  detected: Hole[],
  expected: { x: number; y: number }[],
  tolPx = 3
): { matched: number; falsePositives: number; misses: number } {
  const used = new Set<number>();
  let matched = 0;
  for (const e of expected) {
    let bestIdx = -1;
    let bestD = Infinity;
    detected.forEach((d, i) => {
      if (used.has(i)) return;
      const dist = Math.hypot(d.x - e.x, d.y - e.y);
      if (dist < bestD) {
        bestD = dist;
        bestIdx = i;
      }
    });
    if (bestIdx >= 0 && bestD <= tolPx) {
      used.add(bestIdx);
      matched++;
    }
  }
  return {
    matched,
    falsePositives: detected.length - used.size,
    misses: expected.length - matched,
  };
}

// ── Core detection ───────────────────────────────────────────────────────────

test('detects 5 clean holes at exact positions', () => {
  const holes = [
    { x: 200, y: 200, r: 8 },
    { x: 400, y: 180, r: 8 },
    { x: 300, y: 350, r: 8 },
    { x: 500, y: 400, r: 8 },
    { x: 250, y: 500, r: 8 },
  ];
  const img = makeTarget({ width: 700, height: 700, holes });
  const detected = detectHoles(img);
  const { matched, falsePositives, misses } = matchHoles(detected, holes);
  assert.equal(matched, 5, `matched ${matched}/5, fp=${falsePositives}`);
  assert.equal(falsePositives, 0);
  assert.equal(misses, 0);
});

test('detected radius close to true radius', () => {
  const img = makeTarget({ width: 400, height: 400, holes: [{ x: 200, y: 200, r: 10 }] });
  const detected = detectHoles(img);
  assert.equal(detected.length, 1);
  assert.ok(Math.abs(detected[0].radiusPx - 10) < 1.5, `radius=${detected[0].radiusPx}`);
});

test('empty target yields zero holes', () => {
  const img = makeTarget({ width: 500, height: 500 });
  assert.equal(detectHoles(img).length, 0);
});

test('single hole detected', () => {
  const img = makeTarget({ width: 500, height: 500, holes: [{ x: 250, y: 250, r: 7 }] });
  assert.equal(detectHoles(img).length, 1);
});

test('robust to noise (amplitude 25)', () => {
  const holes = [
    { x: 150, y: 150, r: 8 },
    { x: 350, y: 200, r: 8 },
    { x: 250, y: 380, r: 8 },
  ];
  const img = makeTarget({ width: 500, height: 500, holes, noise: 25, seed: 7 });
  const { matched, falsePositives } = matchHoles(detectHoles(img), holes);
  assert.equal(matched, 3);
  assert.equal(falsePositives, 0);
});

test('robust across seeds — 10 random noise runs, no misses/fps', () => {
  const holes = [
    { x: 180, y: 160, r: 9 },
    { x: 320, y: 340, r: 9 },
  ];
  for (let seed = 1; seed <= 10; seed++) {
    const img = makeTarget({ width: 500, height: 500, holes, noise: 20, seed });
    const { matched, falsePositives } = matchHoles(detectHoles(img), holes);
    assert.equal(matched, 2, `seed ${seed}`);
    assert.equal(falsePositives, 0, `seed ${seed}`);
  }
});

// ── False-positive rejection ─────────────────────────────────────────────────

test('rejects scoring rings', () => {
  const holes = [{ x: 300, y: 300, r: 8 }];
  const img = makeTarget({
    width: 600,
    height: 600,
    holes,
    rings: [
      { x: 300, y: 300, r: 80, thickness: 3 },
      { x: 300, y: 300, r: 140, thickness: 3 },
      { x: 300, y: 300, r: 200, thickness: 3 },
    ],
  });
  const detected = detectHoles(img);
  const { matched, falsePositives } = matchHoles(detected, holes);
  assert.equal(matched, 1);
  assert.equal(falsePositives, 0, `rings leaked as holes: ${falsePositives}`);
});

test('rejects grid lines', () => {
  const holes = [{ x: 200, y: 260, r: 8 }];
  const img = makeTarget({
    width: 500,
    height: 500,
    holes,
    lines: [
      { x1: 0, y1: 100, x2: 499, y2: 100, thickness: 2 },
      { x1: 0, y1: 400, x2: 499, y2: 400, thickness: 2 },
      { x1: 100, y1: 0, x2: 100, y2: 499, thickness: 2 },
      { x1: 400, y1: 0, x2: 400, y2: 499, thickness: 2 },
    ],
  });
  const { matched, falsePositives } = matchHoles(detectHoles(img), holes);
  assert.equal(matched, 1);
  assert.equal(falsePositives, 0);
});

test('rejects tiny specks and huge blobs', () => {
  const realHole = { x: 250, y: 250, r: 8 };
  const img = makeTarget({
    width: 500,
    height: 500,
    holes: [
      realHole,
      { x: 100, y: 100, r: 1.2 }, // speck below min area
      { x: 380, y: 380, r: 90 }, // giant blob above max area
    ],
  });
  const detected = detectHoles(img);
  const { matched } = matchHoles(detected, [realHole]);
  assert.equal(matched, 1);
  assert.equal(detected.length, 1, `extra blobs detected: ${detected.length}`);
});

test('hole detected inside ring area (touching nothing)', () => {
  const holes = [
    { x: 300, y: 250, r: 8 },
    { x: 260, y: 330, r: 8 },
  ];
  const img = makeTarget({
    width: 600,
    height: 600,
    holes,
    rings: [{ x: 300, y: 300, r: 120, thickness: 4 }],
    noise: 15,
  });
  const { matched, falsePositives } = matchHoles(detectHoles(img), holes);
  assert.equal(matched, 2);
  assert.equal(falsePositives, 0);
});

// ── Known limitations, documented behavior ──────────────────────────────────

test('two overlapping holes merge into one blob (known v1 behavior)', () => {
  const img = makeTarget({
    width: 400,
    height: 400,
    holes: [
      { x: 200, y: 200, r: 8 },
      { x: 210, y: 200, r: 8 },
    ],
  });
  const detected = detectHoles(img);
  // Merged blob: detect at least one, never more than two.
  assert.ok(detected.length >= 1 && detected.length <= 2, `got ${detected.length}`);
});

// ── Primitives ───────────────────────────────────────────────────────────────

test('otsu separates bimodal distribution', () => {
  const img = makeTarget({ width: 200, height: 200, holes: [{ x: 100, y: 100, r: 30 }] });
  const t = otsuThreshold(toGrayscale(img));
  assert.ok(t >= 30 && t < 235, `threshold=${t}`);
});

test('grayscale of pure gray pixel equals its value', () => {
  const data = new Uint8ClampedArray([120, 120, 120, 255]);
  const g = toGrayscale({ width: 1, height: 1, data });
  assert.ok(Math.abs(g[0] - 120) <= 1);
});

// ── Group size math ──────────────────────────────────────────────────────────

test('extreme spread: known coordinates', () => {
  const pts = [
    { x: 0, y: 0 },
    { x: 3, y: 4 }, // d=5
    { x: 1, y: 1 },
  ];
  assert.equal(extremeSpreadPx(pts), 5);
});

test('extreme spread: fewer than 2 points is 0', () => {
  assert.equal(extremeSpreadPx([]), 0);
  assert.equal(extremeSpreadPx([{ x: 5, y: 5 }]), 0);
});

test('mm/px from caliber uses median diameter', () => {
  const mk = (r: number): Hole => ({ x: 0, y: 0, radiusPx: r, area: 0, circularity: 1 });
  // diameters 10, 10, 40 (torn hole outlier) → median 10
  const scale = mmPerPxFromCaliber([mk(5), mk(5), mk(20)], 5.56);
  assert.ok(scale !== null);
  assert.ok(Math.abs(scale! - 0.556) < 1e-9, `scale=${scale}`);
});

test('group size end-to-end on synthetic 100m group', () => {
  // .308 (7.82mm) holes, radius 8px → mm/px = 7.82/16 = 0.48875
  const holes = [
    { x: 200, y: 200, r: 8 },
    { x: 260, y: 200, r: 8 }, // 60 px apart → 29.325 mm
    { x: 230, y: 240, r: 8 },
  ];
  const img = makeTarget({ width: 500, height: 500, holes });
  const detected = detectHoles(img);
  assert.equal(detected.length, 3);
  const size = groupSizeMm(detected, 7.82);
  assert.ok(size !== null);
  assert.ok(Math.abs(size! - 29.3) < 3, `size=${size}mm, expected ≈29.3`);
  const moa = mmToMoa(size!, 100);
  assert.ok(Math.abs(moa! - 1.0) < 0.15, `moa=${moa}, expected ≈1.0`);
});

test('group size null for <2 holes or bad caliber', () => {
  const h: Hole = { x: 0, y: 0, radiusPx: 8, area: 200, circularity: 1 };
  assert.equal(groupSizeMm([h], 5.56), null);
  assert.equal(groupSizeMm([h, { ...h, x: 50 }], 0), null);
});

test('parseCaliberMm handles common formats', () => {
  const close = (a: number | null, b: number) =>
    a !== null && Math.abs(a - b) < 0.05;
  assert.ok(close(parseCaliberMm('.308'), 7.82));
  assert.ok(close(parseCaliberMm('0.22'), 5.588));
  assert.ok(close(parseCaliberMm('5.56'), 5.56));
  assert.ok(close(parseCaliberMm('9mm'), 9));
  assert.ok(close(parseCaliberMm('6.5 Creedmoor'), 6.5));
  assert.ok(close(parseCaliberMm('308 Win'), 7.82));
  assert.ok(close(parseCaliberMm('45 ACP'), 11.43));
  assert.ok(close(parseCaliberMm('.223 Rem'), 5.664));
  assert.equal(parseCaliberMm('unknown'), null);
  assert.equal(parseCaliberMm(''), null);
});

test('base64ToBytes round-trip', () => {
  const bytes = new Uint8Array([0, 1, 2, 250, 255, 128, 7]);
  const b64 = Buffer.from(bytes).toString('base64');
  assert.deepEqual(Array.from(base64ToBytes(b64)), Array.from(bytes));
  // unpadded length variant
  const b64b = Buffer.from([1, 2, 3]).toString('base64');
  assert.deepEqual(Array.from(base64ToBytes(b64b)), [1, 2, 3]);
});

test('decodeJpegBase64 → detectHoles end-to-end on encoded synthetic target', () => {
  // encode synthetic target as real JPEG, decode through app path, detect
  const jpeg = require('jpeg-js');
  const holes = [
    { x: 120, y: 120, r: 8 },
    { x: 280, y: 260, r: 8 },
  ];
  const img = makeTarget({ width: 400, height: 400, holes, noise: 8 });
  const encoded = jpeg.encode(
    { width: img.width, height: img.height, data: Buffer.from(img.data) },
    90
  );
  const b64 = Buffer.from(encoded.data).toString('base64');
  const decoded = decodeJpegBase64(b64);
  assert.equal(decoded.width, 400);
  const { matched, falsePositives } = matchHoles(detectHoles(decoded), holes, 4);
  assert.equal(matched, 2, `matched ${matched}/2 through JPEG round-trip`);
  assert.equal(falsePositives, 0);
});

test('mmToMoa known values', () => {
  assert.ok(Math.abs(mmToMoa(29.089, 100)! - 1) < 1e-6);
  assert.ok(Math.abs(mmToMoa(29.089, 200)! - 0.5) < 1e-6);
  assert.equal(mmToMoa(10, 0), null);
});

test('robust to lighting gradient (shadow across target)', () => {
  const holes = [
    { x: 150, y: 200, r: 8 },
    { x: 450, y: 250, r: 8 },
    { x: 700, y: 300, r: 8 },
  ];
  const img = makeTarget({ width: 800, height: 500, holes, noise: 10, seed: 5 });
  // brightness falls 1.0 → 0.45 left to right
  for (let y = 0; y < 500; y++) {
    for (let x = 0; x < 800; x++) {
      const f = 1 - 0.55 * (x / 800);
      const i = (y * 800 + x) * 4;
      img.data[i] *= f;
      img.data[i + 1] *= f;
      img.data[i + 2] *= f;
    }
  }
  const { matched, falsePositives } = matchHoles(detectHoles(img), holes);
  assert.equal(matched, 3, `matched ${matched}/3`);
  assert.equal(falsePositives, 0, `false positives: ${falsePositives}`);
});

// ── Target region + polarity ────────────────────────────────────────────────

test('ignores clutter outside the paper target', () => {
  // paper occupies center; dark hole-sized clutter on the table around it
  const holes = [
    { x: 400, y: 350, r: 7 },
    { x: 470, y: 420, r: 7 },
  ];
  const img = makeTarget({
    width: 900,
    height: 700,
    scene: { background: 90, paperRect: { x: 250, y: 150, w: 400, h: 400 } },
    holes: [
      ...holes,
      // hole-sized dark spots OUTSIDE the paper (bolts, debris, shadows)
      { x: 100, y: 100, r: 7, shade: 20 },
      { x: 800, y: 600, r: 7, shade: 20 },
      { x: 120, y: 550, r: 8, shade: 20 },
    ],
    noise: 10,
  });
  const detected = detectHoles(img);
  const { matched, falsePositives } = matchHoles(detected, holes);
  assert.equal(matched, 2, `matched ${matched}/2`);
  assert.equal(falsePositives, 0, `clutter leaked: ${falsePositives}`);
});

test('detects white holes on black bullseye', () => {
  // black disc center, holes punched through show white paper
  const whiteHoles = [
    { x: 290, y: 300, r: 7, shade: 240 },
    { x: 320, y: 280, r: 7, shade: 240 },
  ];
  const darkHoles = [{ x: 150, y: 150, r: 7 }];
  const img = makeTarget({
    width: 600,
    height: 600,
    discs: [{ x: 300, y: 300, r: 100, shade: 25 }],
    holes: [...whiteHoles, ...darkHoles],
    noise: 8,
  });
  const all = [...whiteHoles, ...darkHoles];
  const { matched, falsePositives } = matchHoles(detectHoles(img), all);
  assert.equal(matched, 3, `matched ${matched}/3`);
  assert.equal(falsePositives, 0);
});

test('detects backlit holes (light through paper)', () => {
  // light from behind: holes brighter than the paper
  const holes = [
    { x: 200, y: 220, r: 7, shade: 255 },
    { x: 340, y: 300, r: 7, shade: 255 },
    { x: 260, y: 380, r: 7, shade: 255 },
  ];
  const img = makeTarget({ width: 550, height: 550, paper: 190, holes, noise: 8 });
  const { matched, falsePositives } = matchHoles(detectHoles(img), holes);
  assert.equal(matched, 3, `matched ${matched}/3`);
  assert.equal(falsePositives, 0);
});

test('bullseye disc itself is not a hole', () => {
  const img = makeTarget({
    width: 600,
    height: 600,
    discs: [{ x: 300, y: 300, r: 90, shade: 25 }],
    noise: 8,
  });
  assert.equal(detectHoles(img).length, 0);
});

test('full scene: paper on dark background, bullseye, rings, mixed holes', () => {
  const darkHoles = [
    { x: 380, y: 250, r: 6 },
    { x: 520, y: 300, r: 6 },
  ];
  const whiteHoles = [{ x: 450, y: 400, r: 6, shade: 245 }];
  const img = makeTarget({
    width: 900,
    height: 800,
    scene: { background: 70, paperRect: { x: 250, y: 120, w: 400, h: 550 } },
    discs: [{ x: 450, y: 400, r: 80, shade: 25 }],
    rings: [
      { x: 450, y: 400, r: 130, thickness: 3 },
      { x: 450, y: 400, r: 180, thickness: 3 },
    ],
    holes: [...darkHoles, ...whiteHoles, { x: 120, y: 700, r: 7, shade: 15 }],
    noise: 10,
    seed: 11,
  });
  const expected = [...darkHoles, ...whiteHoles];
  const { matched, falsePositives } = matchHoles(detectHoles(img), expected, 4);
  assert.equal(matched, 3, `matched ${matched}/3`);
  assert.equal(falsePositives, 0, `false positives: ${falsePositives}`);
});

test('stress: 30 randomized scenes, ≥95% recall, ≤2% FP rate', () => {
  let rngState = 1234;
  const rand = () => {
    rngState = (rngState * 48271) % 2147483647;
    return rngState / 2147483647;
  };

  let totalExpected = 0;
  let totalMatched = 0;
  let totalFp = 0;
  for (let scene = 0; scene < 30; scene++) {
    const paperX = 150 + Math.floor(rand() * 100);
    const paperY = 100 + Math.floor(rand() * 80);
    const paperW = 400 + Math.floor(rand() * 150);
    const paperH = 400 + Math.floor(rand() * 150);
    const cx = paperX + paperW / 2;
    const cy = paperY + paperH / 2;
    const discR = 60 + rand() * 40;

    const holes: { x: number; y: number; r: number; shade?: number }[] = [];
    const n = 3 + Math.floor(rand() * 4);
    for (let i = 0; i < n; i++) {
      // scatter within inner half of paper, off the ring radii
      let x = 0;
      let y = 0;
      let ok = false;
      for (let tries = 0; tries < 50 && !ok; tries++) {
        x = paperX + paperW * (0.25 + rand() * 0.5);
        y = paperY + paperH * (0.25 + rand() * 0.5);
        const dc = Math.hypot(x - cx, y - cy);
        ok =
          Math.abs(dc - (discR + 40)) > 15 && // off ring 1
          Math.abs(dc - (discR + 80)) > 15 && // off ring 2
          Math.abs(dc - discR) > 12 && // off bullseye edge
          holes.every((h) => Math.hypot(h.x - x, h.y - y) > 30);
      }
      if (!ok) continue;
      const inDisc = Math.hypot(x - cx, y - cy) < discR;
      holes.push({ x, y, r: 5 + rand() * 4, shade: inDisc ? 240 : 30 });
    }

    const img = makeTarget({
      width: 850,
      height: 750,
      scene: { background: 60 + rand() * 50, paperRect: { x: paperX, y: paperY, w: paperW, h: paperH } },
      discs: [{ x: cx, y: cy, r: discR, shade: 25 }],
      rings: [
        { x: cx, y: cy, r: discR + 40, thickness: 3 },
        { x: cx, y: cy, r: discR + 80, thickness: 3 },
      ],
      holes,
      noise: 8 + rand() * 10,
      seed: scene * 7 + 1,
    });
    const { matched, falsePositives } = matchHoles(detectHoles(img), holes, 5);
    totalExpected += holes.length;
    totalMatched += matched;
    totalFp += falsePositives;
  }

  const recall = totalMatched / totalExpected;
  assert.ok(recall >= 0.95, `recall ${(recall * 100).toFixed(1)}% (${totalMatched}/${totalExpected})`);
  assert.ok(
    totalFp <= Math.ceil(totalExpected * 0.02),
    `false positives ${totalFp} on ${totalExpected} holes`
  );
});

// ── Scale / realism ─────────────────────────────────────────────────────────

test('realistic phone-photo scale: 1000px image, small holes, rings, noise', () => {
  const holes = [
    { x: 480, y: 470, r: 6 },
    { x: 520, y: 505, r: 6 },
    { x: 455, y: 530, r: 6 },
    { x: 500, y: 460, r: 6 },
    { x: 470, y: 495, r: 6 },
  ];
  const img = makeTarget({
    width: 1000,
    height: 1000,
    holes,
    rings: [
      { x: 500, y: 500, r: 150, thickness: 3 },
      { x: 500, y: 500, r: 250, thickness: 3 },
      { x: 500, y: 500, r: 350, thickness: 3 },
    ],
    noise: 12,
    seed: 3,
  });
  const detected = detectHoles(img);
  const { matched, falsePositives } = matchHoles(detected, holes, 4);
  assert.equal(matched, 5, `matched ${matched}/5`);
  assert.equal(falsePositives, 0);
});
