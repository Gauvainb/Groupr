import jpeg from 'jpeg-js';
import { RawImage } from './detectHoles';

const B64 =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64_LOOKUP = new Uint8Array(128);
for (let i = 0; i < B64.length; i++) B64_LOOKUP[B64.charCodeAt(i)] = i;

/** base64 → bytes. Own impl: atob unavailable on some Hermes versions. */
export function base64ToBytes(b64: string): Uint8Array {
  let len = b64.length;
  while (len > 0 && (b64[len - 1] === '=' || b64[len - 1] === '\n')) len--;
  const outLen = Math.floor((len * 3) / 4);
  const out = new Uint8Array(outLen);
  let o = 0;
  let buf = 0;
  let bits = 0;
  for (let i = 0; i < len; i++) {
    const c = b64.charCodeAt(i);
    if (c === 10 || c === 13) continue;
    buf = (buf << 6) | B64_LOOKUP[c];
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o++] = (buf >> bits) & 0xff;
    }
  }
  return out.subarray(0, o);
}

/** Decode a base64 JPEG string into raw RGBA. */
export function decodeJpegBase64(b64: string): RawImage {
  const bytes = base64ToBytes(b64);
  const { width, height, data } = jpeg.decode(bytes, { useTArray: true });
  return { width, height, data };
}
