// Regression test against a real range photo: ISSF air-pistol target hanging
// in an indoor range — concrete walls, backlit holes, printed score table,
// paper tear, hanging wire. Coordinates below are fractions of image size.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import jpeg from 'jpeg-js';

import { detectHoles } from '../detectHoles';

const buf = fs.readFileSync(path.join(__dirname, 'fixtures', 'cible-issf.jpg'));
const img = jpeg.decode(buf, { useTArray: true });
const holes = detectHoles(img);
const fx = (h: { x: number }) => h.x / img.width;
const fy = (h: { y: number }) => h.y / img.height;

test('real photo: plausible hole count', () => {
  assert.ok(holes.length >= 20 && holes.length <= 40, `count=${holes.length}`);
});

test('real photo: no detections outside the paper', () => {
  // paper spans roughly x 0.10–0.94, y 0.24–0.84 of the frame
  const outside = holes.filter(
    (h) => fx(h) < 0.1 || fx(h) > 0.94 || fy(h) < 0.24 || fy(h) > 0.84
  );
  assert.equal(outside.length, 0, JSON.stringify(outside.map((h) => [h.x, h.y])));
});

test('real photo: printed score table not detected as holes', () => {
  // table occupies the top-right corner of the paper
  const inTable = holes.filter((h) => fx(h) > 0.85 && fy(h) < 0.38);
  assert.equal(inTable.length, 0, JSON.stringify(inTable.map((h) => [h.x, h.y])));
});

test('real photo: known holes found', () => {
  // hand-labeled, clearly visible holes (fractions of frame size)
  const known = [
    { x: 0.315, y: 0.379 }, // dark hole upper-left paper
    { x: 0.838, y: 0.372 }, // dark hole upper-right paper
    { x: 0.52, y: 0.49 }, // bullseye cluster, white on black
    { x: 0.61, y: 0.6 }, // lower-right bullseye white hole
    { x: 0.75, y: 0.49 }, // right cluster on paper
  ];
  for (const k of known) {
    const hit = holes.some(
      (h) => Math.hypot(fx(h) - k.x, fy(h) - k.y) < 0.02
    );
    assert.ok(hit, `missing known hole near (${k.x}, ${k.y})`);
  }
});

test('real photo: bullseye cluster dense', () => {
  // most shots landed in/near the black disc (x 0.35–0.68, y 0.42–0.66)
  const inCluster = holes.filter(
    (h) => fx(h) > 0.35 && fx(h) < 0.68 && fy(h) > 0.42 && fy(h) < 0.66
  );
  assert.ok(inCluster.length >= 12, `cluster=${inCluster.length}`);
});

// ── cible2: outdoor, flat on sunlit table, hands and beer glass in frame ────

const img2 = jpeg.decode(
  fs.readFileSync(path.join(__dirname, 'fixtures', 'cible2-outdoor.jpg')),
  { useTArray: true }
);
const holes2 = detectHoles(img2);
const f2x = (h: { x: number }) => h.x / img2.width;
const f2y = (h: { y: number }) => h.y / img2.height;

test('outdoor photo: bullseye holes found', () => {
  // shot cluster sits in the black disc (x 0.37–0.70, y 0.38–0.65)
  const inDisc = holes2.filter(
    (h) => f2x(h) > 0.37 && f2x(h) < 0.7 && f2y(h) > 0.38 && f2y(h) < 0.65
  );
  assert.ok(inDisc.length >= 5, `disc=${inDisc.length}`);
});

test('outdoor photo: hands, glass, clothing not detected', () => {
  // table/glass above the paper, hands at frame edges, legs below
  const bad = holes2.filter(
    (h) => f2y(h) < 0.17 || f2y(h) > 0.88 || f2x(h) > 0.95
  );
  assert.equal(bad.length, 0, JSON.stringify(bad.map((h) => [h.x, h.y])));
});

test('outdoor photo: bounded false positives', () => {
  assert.ok(holes2.length <= 16, `count=${holes2.length}`);
});

// ── cible3: hung target, ragged tan holes on black and white ────────────────

const img3 = jpeg.decode(
  fs.readFileSync(path.join(__dirname, 'fixtures', 'cible3-torn.jpg')),
  { useTArray: true }
);
const holes3 = detectHoles(img3);
const f3x = (h: { x: number }) => h.x / img3.width;
const f3y = (h: { y: number }) => h.y / img3.height;

test('torn-holes photo: holes found on the black disc', () => {
  const inDisc = holes3.filter(
    (h) => f3x(h) > 0.34 && f3x(h) < 0.66 && f3y(h) > 0.39 && f3y(h) < 0.65
  );
  assert.ok(inDisc.length >= 7, `disc=${inDisc.length}`);
});

test('torn-holes photo: dark holes on white paper found', () => {
  const known = [
    { x: 0.457, y: 0.338 }, // upper hole near "5" ring
    { x: 0.641, y: 0.347 }, // upper-right hole
  ];
  for (const k of known) {
    const hit = holes3.some((h) => Math.hypot(f3x(h) - k.x, f3y(h) - k.y) < 0.02);
    assert.ok(hit, `missing known hole near (${k.x}, ${k.y})`);
  }
});

test('torn-holes photo: nothing outside the paper', () => {
  const outside = holes3.filter(
    (h) => f3x(h) < 0.08 || f3x(h) > 0.95 || f3y(h) < 0.2 || f3y(h) > 0.85
  );
  assert.equal(outside.length, 0, JSON.stringify(outside.map((h) => [h.x, h.y])));
});
