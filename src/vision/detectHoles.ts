// Bullet hole detection on target photos.
// Pure functions over raw RGBA — runs identically in Node tests and React Native.
// ponytail: v1 detects dark holes on light paper; light holes on black bullseyes
// need polarity inversion pass — add when users shoot black-center targets.

export interface RawImage {
  width: number;
  height: number;
  data: Uint8ClampedArray | Uint8Array; // RGBA, 4 bytes/px
}

export interface Hole {
  x: number; // center, px
  y: number;
  radiusPx: number;
  area: number; // px count
  circularity: number; // 0..1
}

export interface DetectOptions {
  /** Min hole area as fraction of image area. Default 0.00005 (≈40px on 900x900). */
  minAreaFrac?: number;
  /** Max hole area as fraction of image area. Default 0.01. */
  maxAreaFrac?: number;
  /** Min circularity (4πA/P²). Rings and text score low. Default 0.55. */
  minCircularity?: number;
  /** Min blob fill of its bounding box (circle ≈ 0.785). Default 0.5. */
  minFill?: number;
  /** Max bounding-box aspect ratio. Default 2. */
  maxAspect?: number;
}

export function toGrayscale(img: RawImage): Uint8Array {
  const { width, height, data } = img;
  const gray = new Uint8Array(width * height);
  for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
    gray[i] = (data[p] * 299 + data[p + 1] * 587 + data[p + 2] * 114) / 1000;
  }
  return gray;
}

/** 3x3 box blur — kills salt-and-pepper noise before thresholding. */
export function boxBlur(gray: Uint8Array, width: number, height: number): Uint8Array {
  const out = new Uint8Array(gray.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= height) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= width) continue;
          sum += gray[yy * width + xx];
          n++;
        }
      }
      out[y * width + x] = sum / n;
    }
  }
  return out;
}

/** Otsu's method: threshold maximizing between-class variance. */
export function otsuThreshold(gray: Uint8Array): number {
  const hist = new Array(256).fill(0);
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++;

  const total = gray.length;
  let sumAll = 0;
  for (let t = 0; t < 256; t++) sumAll += t * hist[t];

  let sumB = 0;
  let wB = 0;
  let best = 0;
  let bestT = 127;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sumAll - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > best) {
      best = between;
      bestT = t;
    }
  }
  return bestT;
}

/** Binary mask: 1 = dark (candidate hole), 0 = light paper. Otsu's threshold
 * is the upper bound of the dark class, so inclusive compare. */
export function binarize(gray: Uint8Array, threshold: number): Uint8Array {
  const mask = new Uint8Array(gray.length);
  for (let i = 0; i < gray.length; i++) mask[i] = gray[i] <= threshold ? 1 : 0;
  return mask;
}

/**
 * Adaptive mean threshold: pixel is foreground when darker than its local
 * neighborhood mean by `offset`. Immune to lighting gradients and shadows,
 * unlike a global Otsu cut. Local mean via integral image, O(n).
 */
export function adaptiveBinarize(
  gray: Uint8Array,
  width: number,
  height: number,
  offset = 25
): Uint8Array {
  // Integral image (summed-area table), row 0 / col 0 zero-padded.
  const iw = width + 1;
  const integral = new Float64Array(iw * (height + 1));
  for (let y = 0; y < height; y++) {
    let rowSum = 0;
    for (let x = 0; x < width; x++) {
      rowSum += gray[y * width + x];
      integral[(y + 1) * iw + (x + 1)] = integral[y * iw + (x + 1)] + rowSum;
    }
  }

  const half = Math.max(8, Math.round(Math.min(width, height) / 16));
  const mask = new Uint8Array(gray.length);
  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - half);
    const y1 = Math.min(height - 1, y + half);
    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - half);
      const x1 = Math.min(width - 1, x + half);
      const area = (y1 - y0 + 1) * (x1 - x0 + 1);
      const sum =
        integral[(y1 + 1) * iw + (x1 + 1)] -
        integral[y0 * iw + (x1 + 1)] -
        integral[(y1 + 1) * iw + x0] +
        integral[y0 * iw + x0];
      mask[y * width + x] = gray[y * width + x] < sum / area - offset ? 1 : 0;
    }
  }
  return mask;
}

interface Blob {
  area: number;
  perimeter: number;
  sumX: number;
  sumY: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/** Iterative BFS connected components (4-connectivity). */
export function findBlobs(mask: Uint8Array, width: number, height: number): Blob[] {
  const labels = new Int32Array(mask.length); // 0 = unvisited
  const blobs: Blob[] = [];
  const queue = new Int32Array(mask.length);

  for (let start = 0; start < mask.length; start++) {
    if (mask[start] !== 1 || labels[start] !== 0) continue;

    const label = blobs.length + 1;
    const b: Blob = {
      area: 0,
      perimeter: 0,
      sumX: 0,
      sumY: 0,
      minX: width,
      maxX: 0,
      minY: height,
      maxY: 0,
    };
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    labels[start] = label;

    while (head < tail) {
      const idx = queue[head++];
      const x = idx % width;
      const y = (idx / width) | 0;

      b.area++;
      b.sumX += x;
      b.sumY += y;
      if (x < b.minX) b.minX = x;
      if (x > b.maxX) b.maxX = x;
      if (y < b.minY) b.minY = y;
      if (y > b.maxY) b.maxY = y;

      let edge = false;
      // 4-neighbors: enqueue foreground, count boundary pixels for perimeter
      if (x > 0) {
        const n = idx - 1;
        if (mask[n] === 1) {
          if (labels[n] === 0) {
            labels[n] = label;
            queue[tail++] = n;
          }
        } else edge = true;
      } else edge = true;
      if (x < width - 1) {
        const n = idx + 1;
        if (mask[n] === 1) {
          if (labels[n] === 0) {
            labels[n] = label;
            queue[tail++] = n;
          }
        } else edge = true;
      } else edge = true;
      if (y > 0) {
        const n = idx - width;
        if (mask[n] === 1) {
          if (labels[n] === 0) {
            labels[n] = label;
            queue[tail++] = n;
          }
        } else edge = true;
      } else edge = true;
      if (y < height - 1) {
        const n = idx + width;
        if (mask[n] === 1) {
          if (labels[n] === 0) {
            labels[n] = label;
            queue[tail++] = n;
          }
        } else edge = true;
      } else edge = true;

      if (edge) b.perimeter++;
    }

    blobs.push(b);
  }
  return blobs;
}

export function detectHoles(img: RawImage, opts: DetectOptions = {}): Hole[] {
  const {
    minAreaFrac = 0.00005,
    maxAreaFrac = 0.01,
    minCircularity = 0.55,
    minFill = 0.5,
    maxAspect = 2,
  } = opts;

  const gray = boxBlur(toGrayscale(img), img.width, img.height);
  const mask = adaptiveBinarize(gray, img.width, img.height);
  const blobs = findBlobs(mask, img.width, img.height);

  const imgArea = img.width * img.height;
  const minArea = imgArea * minAreaFrac;
  const maxArea = imgArea * maxAreaFrac;

  const holes: Hole[] = [];
  for (const b of blobs) {
    if (b.area < minArea || b.area > maxArea) continue;

    const w = b.maxX - b.minX + 1;
    const h = b.maxY - b.minY + 1;
    const aspect = Math.max(w, h) / Math.min(w, h);
    if (aspect > maxAspect) continue;

    const fill = b.area / (w * h);
    if (fill < minFill) continue;

    // Perimeter from boundary-pixel count underestimates true contour length;
    // 0.95 correction keeps circles near 1.0 without letting rings through.
    const perim = b.perimeter * 0.95;
    const circularity = Math.min(1, (4 * Math.PI * b.area) / (perim * perim));
    if (circularity < minCircularity) continue;

    holes.push({
      x: b.sumX / b.area,
      y: b.sumY / b.area,
      radiusPx: Math.sqrt(b.area / Math.PI),
      area: b.area,
      circularity,
    });
  }
  return holes;
}
