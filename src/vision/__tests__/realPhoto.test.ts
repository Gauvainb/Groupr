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
