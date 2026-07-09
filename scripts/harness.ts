import fs from 'fs';
import jpeg from 'jpeg-js';
import { detectHoles, toGrayscale, boxBlur, findTargetRegion, RawImage } from '../src/vision/detectHoles';

function resize(img: RawImage, targetW: number): RawImage {
  const scale = targetW / img.width;
  const w = targetW, h = Math.round(img.height * scale);
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sx = Math.min(img.width - 1, Math.round(x / scale));
    const sy = Math.min(img.height - 1, Math.round(y / scale));
    const si = (sy * img.width + sx) * 4, di = (y * w + x) * 4;
    out[di] = img.data[si]; out[di+1] = img.data[si+1]; out[di+2] = img.data[si+2]; out[di+3] = 255;
  }
  return { width: w, height: h, data: out };
}

function drawCircle(img: RawImage, cx: number, cy: number, r: number, rgb: [number,number,number]) {
  for (let a = 0; a < 360; a += 2) {
    for (const rr of [r, r+1]) {
      const x = Math.round(cx + rr * Math.cos(a * Math.PI/180));
      const y = Math.round(cy + rr * Math.sin(a * Math.PI/180));
      if (x>=0 && x<img.width && y>=0 && y<img.height) {
        const i = (y*img.width+x)*4;
        img.data[i]=rgb[0]; img.data[i+1]=rgb[1]; img.data[i+2]=rgb[2];
      }
    }
  }
}
function drawRect(img: RawImage, x0:number,y0:number,x1:number,y1:number, rgb:[number,number,number]) {
  for (let x=x0;x<=x1;x++) for (const y of [y0,y1]) { const i=(y*img.width+x)*4; img.data[i]=rgb[0];img.data[i+1]=rgb[1];img.data[i+2]=rgb[2]; }
  for (let y=y0;y<=y1;y++) for (const x of [x0,x1]) { const i=(y*img.width+x)*4; img.data[i]=rgb[0];img.data[i+1]=rgb[1];img.data[i+2]=rgb[2]; }
}

const buf = fs.readFileSync('/Users/g.bourgeois/Downloads/cible.jpg');
const full = jpeg.decode(buf, { useTArray: true });
const img = resize({ width: full.width, height: full.height, data: full.data }, 1000);
console.log(`image ${img.width}x${img.height}`);

const gray = boxBlur(toGrayscale(img), img.width, img.height);
const region = findTargetRegion(gray, img.width, img.height);
console.log('region:', JSON.stringify(region), `(${(((region.x1-region.x0)*(region.y1-region.y0))/(img.width*img.height)*100).toFixed(0)}% of frame)`);

const t0 = Date.now();
const holes = detectHoles(img);
console.log(`detected ${holes.length} holes in ${Date.now()-t0}ms`);
for (const h of holes) console.log(`  (${h.x.toFixed(0)}, ${h.y.toFixed(0)}) r=${h.radiusPx.toFixed(1)} circ=${h.circularity.toFixed(2)}`);

drawRect(img, region.x0, region.y0, region.x1, region.y1, [0,128,255]);
for (const h of holes) drawCircle(img, h.x, h.y, Math.max(h.radiusPx*1.8, 9), [255,0,0]);
fs.writeFileSync('/private/tmp/claude-502/-Users-g-bourgeois-Groupr/2b4a3f6a-a65b-4b19-935f-494f5e0a9bc8/scratchpad/annotated.jpg', jpeg.encode({width:img.width,height:img.height,data:Buffer.from(img.data.buffer)}, 85).data);
console.log('annotated written');
