// =====================================================================
//  The Leveling Road — pixel-art post-processing
//  Turns the drawn (vector) scene into crisp sprite-style pixel art:
//  hard edges, cel shading lit from the top-left, inner lines between
//  materials, coloured dark outlines and a curated 64-colour palette.
//  Everything runs on the low-resolution buffers (a few hundred pixels wide).
// =====================================================================
'use strict';

// 64 colours: dark crimsons, plums, slate blues and teals, bone and gold, plus greens and sands for the outdoors
const PALETTE_HEX = [
  '#0e0a0f', '#1c1219', '#2a1a24', '#3d2433', '#542c3a', '#6e3542', '#8c3a44', '#a8434a',
  '#c2504a', '#d8683f', '#e88c4a', '#f2b05a', '#f8d27a', '#fff0b8', '#f2e8d4', '#d8c8b0',
  '#b8a48a', '#94806a', '#73614f', '#564638', '#3c3028', '#2a221e', '#4a2a5a', '#6a3a7a',
  '#8a4a9a', '#ac6ab8', '#c89ad0', '#2a2a4a', '#3a3e6a', '#4a5a8a', '#5a7aaa', '#7aa0c8',
  '#a8c8e0', '#d8ecf4', '#1a3a3e', '#235452', '#2e6e66', '#3e8a78', '#5aa88a', '#8acaa0',
  '#1e3a1e', '#2e5226', '#3e6a2e', '#56863a', '#74a43e', '#9ac24a', '#c4dc6a', '#5a4a1e',
  '#7a6a2a', '#a08a3a', '#c8aa4a', '#e0c86a', '#3a3a42', '#4e4e58', '#66666e', '#808088',
  '#9c9ca4', '#bcbcc4', '#dcdce0', '#ffffff', '#e83a2a', '#3a8ad8', '#4ad8e8', '#9a3aea',
];
const PALETTE = PALETTE_HEX.map(h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
let PAL_LUT = null;   // 15-bit colour → packed RGB of the nearest palette colour
function buildLut() {
  PAL_LUT = new Uint32Array(32768);
  for (let i = 0; i < 32768; i++) {
    const r = ((i >> 10) & 31) * 8.226, g = ((i >> 5) & 31) * 8.226, b = (i & 31) * 8.226;
    let best = 0, bd = Infinity;
    for (let k = 0; k < PALETTE.length; k++) {
      const p = PALETTE[k], dr = r - p[0], dg = g - p[1], db = b - p[2];
      // weighted by how sensitive the eye is to each channel
      const dd = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11;
      if (dd < bd) { bd = dd; best = k; }
    }
    const p = PALETTE[best];
    PAL_LUT[i] = (p[0] << 16) | (p[1] << 8) | p[2];
  }
}
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v / 16 - 0.47) * 22);

// Map a buffer to the palette (dither = ordered dithering for smooth gradients)
function palettePass(ctx, w, h, dither) {
  if (!PAL_LUT) buildLut();
  const img = ctx.getImageData(0, 0, w, h), d = img.data;
  for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i += 4) {
    if (d[i + 3] === 0) continue;
    const o = dither ? BAYER[(y & 3) * 4 + (x & 3)] : 0;
    const r = Math.max(0, Math.min(255, d[i] + o)) >> 3, g = Math.max(0, Math.min(255, d[i + 1] + o)) >> 3, b = Math.max(0, Math.min(255, d[i + 2] + o)) >> 3;
    const c = PAL_LUT[(r << 10) | (g << 5) | b];
    d[i] = c >> 16; d[i + 1] = (c >> 8) & 255; d[i + 2] = c & 255;
  }
  ctx.putImageData(img, 0, 0);
}

// Sprite pass: crisp alpha, top-left light, inner lines and coloured outlines
// opts: { outline: 0..1 strength, light: highlight amount, shade: shadow amount }
function spritePass(ctx, w, h, opts) {
  const o = Object.assign({ outline: 1, light: 0.2, shade: 0.24 }, opts);
  const img = ctx.getImageData(0, 0, w, h), d = img.data, n = w * h;
  const A = new Uint8Array(n);   // 0 empty, 1 soft (shadow/glow), 2 solid
  for (let i = 0; i < n; i++) {
    const a = d[i * 4 + 3];
    if (a >= 128) { A[i] = 2; d[i * 4 + 3] = 255; }
    else if (a >= 36) { A[i] = 1; d[i * 4 + 3] = a >= 80 ? 140 : 70; }
    else { A[i] = 0; d[i * 4 + 3] = 0; }
  }
  const src = new Uint8ClampedArray(d);
  const lum = i => src[i * 4] * 0.3 + src[i * 4 + 1] * 0.59 + src[i * 4 + 2] * 0.11;
  const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && A[y * w + x] === 2;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, p = i * 4;
    if (A[i] === 2) {
      let k = 0;   // >0 lighten, <0 darken
      const up = solid(x, y - 1), left = solid(x - 1, y), down = solid(x, y + 1), right = solid(x + 1, y);
      if (!up || !left) k = o.light;
      else if (!down || !right) k = -o.shade;
      else if (!solid(x, y - 2) || !solid(x - 2, y)) k = o.light * 0.45;
      else if (!solid(x, y + 2) || !solid(x + 2, y)) k = -o.shade * 0.45;
      // Inner line: darker side of a strong material edge
      const L = lum(i);
      if (right && lum(i + 1) - L > 38) k -= 0.22;
      else if (down && lum(i + w) - L > 38) k -= 0.22;
      if (k > 0) { d[p] += (255 - d[p]) * k; d[p + 1] += (255 - d[p + 1]) * k; d[p + 2] += (255 - d[p + 2]) * k; }
      else if (k < 0) { const m = 1 + k; d[p] *= m; d[p + 1] *= m; d[p + 2] *= m; }
    } else if (o.outline > 0) {
      // Outline: an empty (or soft) pixel next to a solid one
      let q = -1;
      if (solid(x, y - 1)) q = i - w; else if (solid(x - 1, y)) q = i - 1; else if (solid(x + 1, y)) q = i + 1; else if (solid(x, y + 1)) q = i + w;
      if (q >= 0) {
        const s = q * 4, k = 0.25 + (1 - o.outline) * 0.3;
        // darken the neighbour and pull it towards a deep plum-brown
        d[p] = src[s] * k * 0.7 + 30 * 0.3; d[p + 1] = src[s + 1] * k * 0.7 + 16 * 0.3; d[p + 2] = src[s + 2] * k * 0.7 + 30 * 0.3;
        d[p + 3] = 255;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}

// Offscreen layers the size of a target canvas
const PIX_LAYERS = {};
function pixLayer(name, w, h) {
  let L = PIX_LAYERS[name];
  if (!L) { const c = document.createElement('canvas'); L = PIX_LAYERS[name] = { c, ctx: c.getContext('2d') }; }
  if (L.c.width !== w || L.c.height !== h) { L.c.width = w; L.c.height = h; }
  L.ctx.setTransform(1, 0, 0, 1, 0, 0);
  L.ctx.clearRect(0, 0, w, h);
  L.ctx.imageSmoothingEnabled = false;
  return L.ctx;
}
// Draw something through the sprite pass onto a target context (character sheet, preview)
function drawAsSprite(target, w, h, scale, fn, opts) {
  const lc = pixLayer('one', w, h);
  lc.setTransform(scale, 0, 0, scale, 0, 0);
  fn(lc);
  spritePass(lc, w, h, opts);
  target.save(); target.setTransform(1, 0, 0, 1, 0, 0); target.drawImage(lc.canvas, 0, 0); target.restore();
}
