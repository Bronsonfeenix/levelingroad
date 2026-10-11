// =====================================================================
//  The Leveling Road — canvas drawing (background, heroes, enemies, effects)
//  All drawing happens in "world units": 320 units tall, width varies.
// =====================================================================
'use strict';

function hash(i, s) { const x = Math.sin(i * 127.1 + (s || 0) * 311.7) * 43758.5453; return x - Math.floor(x); }
function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = c => Math.max(0, Math.min(255, Math.round(c * k)));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function circ(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
function ell(ctx, x, y, rx, ry, rot) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2); ctx.fill(); }
function line(ctx, x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
function poly(ctx, pts) { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); ctx.fill(); }

// ---------------------------------------------------------------------
//  Background
// ---------------------------------------------------------------------
function hills(ctx, W, off, base, amp, color, gy, seed) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, gy);
  for (let x = 0; x <= W + 8; x += 8) {
    const u = x + off;
    const y = base - Math.sin(u * 0.0045 + seed) * amp - Math.sin(u * 0.013 + seed * 2) * amp * 0.45 - Math.sin(u * 0.031 + seed * 3) * amp * 0.15;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W + 8, gy);
  ctx.closePath();
  ctx.fill();
}

// sc (optional): a separate context for the scenery props (so they can get their own outline pass)
function drawBackground(ctx, G, z, sc) {
  const W = G.W, gy = G.groundY, p = z.palette, cam = G.cam;

  const sky = ctx.createLinearGradient(0, 0, 0, gy);
  sky.addColorStop(0, p.skyTop);
  sky.addColorStop(1, p.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, gy + 2);

  if (z.indoor) drawIndoor(ctx, G, z);
  else drawSky(ctx, G, z);

  // Scenery
  const par = 0.65, sp = 150, off = cam * par;
  const i0 = Math.floor(off / sp) - 2, i1 = i0 + Math.ceil(W / sp) + 4;
  for (let i = i0; i < i1; i++) {
    if (hash(i, 3) < 0.3) continue;
    const type = z.deco[Math.floor(hash(i, 5) * z.deco.length)];
    const x = i * sp - off + hash(i, 7) * 70;
    drawDeco(sc || ctx, type, x, gy - 3, 0.7 + hash(i, 9) * 0.55, p, G.t);
  }
  drawGround(ctx, G, p);
}

function drawSky(ctx, G, z) {
  const W = G.W, gy = G.groundY, p = z.palette, cam = G.cam;
  // Sun / moon
  const sx = W * 0.8, sy = 64;
  const sg = ctx.createRadialGradient(sx, sy, 2, sx, sy, 110);
  sg.addColorStop(0, hexA(p.sun, 1));
  sg.addColorStop(0.2, hexA(p.sun, 0.95));
  sg.addColorStop(0.22, hexA(p.sun, 0.3));
  sg.addColorStop(1, hexA(p.sun, 0));
  ctx.fillStyle = sg;
  ctx.fillRect(sx - 110, sy - 110, 220, 220);

  // Clouds
  if (z.weather !== 'embers') {
    ctx.fillStyle = z.weather === 'rain' ? 'rgba(90,100,110,0.45)' : 'rgba(255,255,255,0.35)';
    const span = W + 300;
    for (let i = 0; i < (z.weather === 'rain' ? 7 : 4); i++) {
      const cx = ((hash(i, 1) * span - cam * 0.04 - G.t * 6) % span + span) % span - 150;
      const cy = 40 + hash(i, 2) * 60;
      ell(ctx, cx, cy, 46, 12); ell(ctx, cx + 22, cy - 8, 26, 12); ell(ctx, cx - 18, cy - 5, 20, 9);
    }
  }

  hills(ctx, W, cam * 0.12, 182, 26, p.far, gy, 1);
  hills(ctx, W, cam * 0.3, 214, 16, p.near, gy, 4);
}

// Dungeons: a stone back wall with torches and a rough ceiling instead of sky and hills
function drawIndoor(ctx, G, z) {
  const W = G.W, gy = G.groundY, p = z.palette, cam = G.cam, t = G.t;
  const top = 34, off = cam * 0.3;
  // Wall: brick courses that scroll slowly
  ctx.fillStyle = p.far; ctx.fillRect(0, top, W, gy - top);
  ctx.strokeStyle = p.near; ctx.lineWidth = 2;
  const bh = 22, bw = 54;
  ctx.strokeStyle = shade(p.near, 0.7); ctx.lineWidth = 3;
  for (let r = 0, y = top + 8; y < gy; r++, y += bh) {
    line(ctx, 0, y, W, y);
    const shift = (r % 2) * bw / 2 - (off % bw);
    for (let x = shift - bw; x < W + bw; x += bw) line(ctx, x, y, x, Math.min(gy, y + bh));
    // lit top edge of each brick row
    ctx.fillStyle = 'rgba(255,220,180,0.10)'; ctx.fillRect(0, y + 2, W, 2);
  }
  // Light falls off towards the ceiling
  const shadow = ctx.createLinearGradient(0, top, 0, gy);
  shadow.addColorStop(0, 'rgba(0,0,0,0.55)'); shadow.addColorStop(0.6, 'rgba(0,0,0,0.15)'); shadow.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = shadow; ctx.fillRect(0, top, W, gy - top);
  // Wall torches with a flickering glow
  const sp = 300, t0 = Math.floor(off / sp) - 1;
  for (let i = t0; i < t0 + Math.ceil(W / sp) + 3; i++) {
    const x = i * sp - off + 120, y = gy - 120;
    const fl = 0.85 + Math.sin(t * 9 + i * 3) * 0.08 + Math.sin(t * 23 + i) * 0.05;
    const g = ctx.createRadialGradient(x, y - 10, 2, x, y - 10, 110 * fl);
    g.addColorStop(0, hexA(p.sun, 0.45)); g.addColorStop(1, hexA(p.sun, 0));
    ctx.fillStyle = g; ctx.fillRect(x - 120, y - 130, 240, 240);
    ctx.fillStyle = '#2a1e14'; ctx.fillRect(x - 3, y - 4, 6, 18);
    ctx.fillStyle = hexA(p.sun, 0.95); ell(ctx, x, y - 12, 5 * fl, 9 * fl);
    ctx.fillStyle = 'rgba(255,255,220,0.9)'; ell(ctx, x, y - 10, 2, 4);
  }
  // Ceiling with hanging rock
  ctx.fillStyle = p.skyTop;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(W, top);
  for (let x = W + 20; x >= -20; x -= 20) {
    const u = Math.floor((x + off) / 20);
    ctx.lineTo(x - ((off % 20)), top + hash(u, 21) * 10 + (hash(u, 23) < 0.15 ? 26 * hash(u, 25) : 0));
  }
  ctx.closePath(); ctx.fill();
}

function drawGround(ctx, G, p) {
  const W = G.W, H = G.H, gy = G.groundY, cam = G.cam;
  ctx.fillStyle = p.ground;
  ctx.fillRect(0, gy - 4, W, H - gy + 4);
  ctx.fillStyle = p.groundDark;
  ctx.fillRect(0, gy + 20, W, H - gy);
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.fillRect(0, gy - 4, W, 3);

  const sp2 = 44, off2 = cam;
  const j0 = Math.floor(off2 / sp2) - 1, j1 = j0 + Math.ceil(W / sp2) + 2;
  for (let j = j0; j < j1; j++) {
    const x = j * sp2 - off2 + hash(j, 11) * 30;
    const h = hash(j, 13);
    if (h < 0.45) {
      ctx.fillStyle = p.groundDark;
      ell(ctx, x, gy + 6 + hash(j, 17) * 10, 3 + h * 6, 2 + h * 2);
    } else if (h < 0.8) {
      ctx.strokeStyle = p.foliage; ctx.lineWidth = 2;
      line(ctx, x, gy - 2, x - 3, gy - 9); line(ctx, x + 2, gy - 2, x + 3, gy - 11); line(ctx, x + 4, gy - 2, x + 8, gy - 8);
    } else {
      ctx.fillStyle = p.groundDark;
      ctx.fillRect(x, gy + 30 + hash(j, 19) * 14, 18 + h * 20, 3);
    }
  }
}

function drawDeco(ctx, type, x, y, s, p, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.lineCap = 'round';
  switch (type) {
    case 'tree':
      ctx.fillStyle = p.trunk; ctx.fillRect(-6, -60, 12, 60);
      ctx.fillStyle = p.foliage; circ(ctx, 0, -84, 30); circ(ctx, -24, -64, 22); circ(ctx, 24, -64, 22);
      ctx.fillStyle = 'rgba(255,255,255,0.09)'; circ(ctx, -9, -94, 14);
      break;
    case 'bigtree': // Teldrassil / Ashenvale giants with violet canopies
      ctx.fillStyle = p.trunk; poly(ctx, [-14, 0, -9, -110, 9, -110, 16, 0]);
      ctx.fillRect(-22, -6, 44, 6);
      ctx.fillStyle = shade(p.foliage, 1.1); ell(ctx, 0, -128, 48, 26); ell(ctx, -30, -108, 30, 16); ell(ctx, 32, -110, 30, 16);
      ctx.fillStyle = 'rgba(180,140,255,0.18)'; ell(ctx, -6, -138, 26, 10);
      break;
    case 'pine':
      ctx.fillStyle = p.trunk; ctx.fillRect(-4, -22, 8, 22);
      ctx.fillStyle = p.foliage;
      for (let k = 0; k < 3; k++) { const w = 26 - k * 5, b = -18 - k * 26; poly(ctx, [-w, b, w, b, 0, b - 44]); }
      break;
    case 'deadtree':
      ctx.strokeStyle = p.trunk; ctx.lineWidth = 7;
      line(ctx, 0, 0, 2, -72); ctx.lineWidth = 5;
      line(ctx, 1, -38, -20, -60); line(ctx, 2, -52, 22, -80); ctx.lineWidth = 3;
      line(ctx, -20, -60, -30, -70); line(ctx, -14, -54, -12, -72); line(ctx, 22, -80, 30, -86);
      break;
    case 'bush':
      ctx.fillStyle = p.foliage; circ(ctx, -14, -11, 14); circ(ctx, 0, -17, 17); circ(ctx, 15, -11, 13);
      break;
    case 'rock':
      ctx.fillStyle = p.rock; poly(ctx, [-24, 2, -18, -18, -4, -26, 14, -20, 24, 2]);
      ctx.fillStyle = 'rgba(255,255,255,0.15)'; poly(ctx, [-16, -16, -4, -24, 4, -18, -8, -12]);
      break;
    case 'cactus':
      ctx.fillStyle = p.foliage;
      rr(ctx, -7, -64, 14, 64, 7); ctx.fill();
      rr(ctx, -22, -46, 8, 22, 4); ctx.fill(); rr(ctx, -22, -30, 20, 8, 4); ctx.fill();
      rr(ctx, 14, -56, 8, 24, 4); ctx.fill(); rr(ctx, 4, -38, 18, 8, 4); ctx.fill();
      break;
    case 'crystal':
      ctx.fillStyle = 'rgba(150,220,255,0.85)'; poly(ctx, [-8, 0, -12, -40, -2, -62, 6, -38, 4, 0]);
      ctx.fillStyle = 'rgba(200,240,255,0.85)'; poly(ctx, [4, 0, 10, -30, 20, -36, 18, 0]);
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; poly(ctx, [-6, -40, -2, -58, 0, -40]);
      break;
    case 'spire':
      ctx.fillStyle = p.rock; poly(ctx, [-18, 2, -6, -92, 2, -62, 10, -112, 20, 2]);
      ctx.strokeStyle = `rgba(255,110,30,${0.55 + Math.sin(t * 2 + x) * 0.3})`; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(-4, -2); ctx.lineTo(0, -30); ctx.lineTo(-3, -50); ctx.lineTo(4, -78); ctx.stroke();
      break;
    case 'windmill': { // Westfall farmland
      ctx.fillStyle = '#c8b89a'; poly(ctx, [-16, 0, -10, -86, 10, -86, 16, 0]);
      ctx.fillStyle = '#8a3a2a'; poly(ctx, [-14, -84, 0, -104, 14, -84]);
      ctx.fillStyle = '#5a3a24'; ctx.fillRect(-5, -22, 10, 22);
      ctx.save(); ctx.translate(0, -84); ctx.rotate(t * 0.8);
      ctx.fillStyle = '#e8dcc0'; ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 2;
      for (let k = 0; k < 4; k++) { ctx.rotate(Math.PI / 2); ctx.fillRect(2, -4, 46, 9); ctx.strokeRect(2, -4, 46, 9); }
      ctx.restore();
      ctx.fillStyle = '#3a2a1a'; circ(ctx, 0, -84, 4);
      break;
    }
    case 'tent': // Mulgore tepee
      ctx.fillStyle = '#d8c8a0'; poly(ctx, [-30, 0, 0, -70, 30, 0]);
      ctx.fillStyle = '#a0402a'; poly(ctx, [-24, -14, 24, -14, 21, -20, -21, -20]);
      ctx.fillStyle = '#3a6a8a'; poly(ctx, [-12, -42, 12, -42, 10, -46, -10, -46]);
      ctx.fillStyle = '#4a3220'; poly(ctx, [-8, 0, 0, -26, 8, 0]);
      ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 3; line(ctx, -6, -62, 6, -80); line(ctx, 6, -62, -6, -80);
      break;
    case 'grave':
      ctx.fillStyle = p.rock;
      ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-10, -26); ctx.arc(0, -26, 10, Math.PI, 0); ctx.lineTo(10, 0); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(-1.5, -30, 3, 14); ctx.fillRect(-6, -26, 12, 3);
      ctx.fillStyle = shade(p.rock, 0.85); ctx.fillRect(22, -40, 5, 40); ctx.fillRect(14, -32, 21, 5);
      break;
    case 'palm':
      ctx.strokeStyle = p.trunk; ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(12, -50, 4, -96); ctx.stroke();
      ctx.fillStyle = p.foliage;
      for (let k = 0; k < 6; k++) {
        const a = -Math.PI / 2 + (k - 2.5) * 0.55 + Math.sin(t + k) * 0.04;
        ctx.save(); ctx.translate(4, -96); ctx.rotate(a);
        ell(ctx, 26, 0, 30, 6, 0.25); ctx.restore();
      }
      ctx.fillStyle = '#6a4a20'; circ(ctx, 2, -92, 4); circ(ctx, 8, -90, 4);
      break;
    case 'fern':
      ctx.strokeStyle = p.foliage; ctx.lineWidth = 4;
      for (let k = 0; k < 5; k++) {
        const a = -Math.PI / 2 + (k - 2) * 0.45;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(Math.cos(a) * 30, Math.sin(a) * 40, Math.cos(a) * 46, Math.sin(a) * 30 - 6); ctx.stroke();
      }
      break;
    // ---- dungeon props ----
    case 'stalagmite':
      ctx.fillStyle = p.rock; poly(ctx, [-16, 0, -4, -78, 4, -60, 10, -92, 20, 0]);
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; poly(ctx, [-6, -10, -4, -70, 2, -12]);
      break;
    case 'pillar':
      ctx.fillStyle = shade(p.rock, 0.8); ctx.fillRect(-20, -14, 40, 14); ctx.fillRect(-20, -150, 40, 12);
      ctx.fillStyle = p.rock; ctx.fillRect(-15, -140, 30, 128);
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(6, -140, 9, 128);
      ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fillRect(-12, -140, 5, 128);
      break;
    case 'brazier': {
      ctx.fillStyle = '#2a2420'; ctx.fillRect(-3, -40, 6, 40); poly(ctx, [-16, -40, 16, -40, 10, -52, -10, -52]);
      const f = Math.sin(t * 11) * 2;
      ctx.fillStyle = 'rgba(255,150,40,0.25)'; circ(ctx, 0, -60, 24);
      ctx.fillStyle = '#ff7a1a'; poly(ctx, [-10, -52, 10, -52, 2 + f, -78, -3, -66]);
      ctx.fillStyle = '#ffd23a'; poly(ctx, [-5, -52, 5, -52, 0 - f, -68]);
      break;
    }
    case 'crate':
      ctx.fillStyle = '#6a4a2a'; ctx.fillRect(-20, -38, 40, 38);
      ctx.strokeStyle = '#3a2614'; ctx.lineWidth = 3; ctx.strokeRect(-20, -38, 40, 38); line(ctx, -20, -38, 20, 0); line(ctx, 20, -38, -20, 0);
      if (hash(Math.round(x), 2) > 0.5) { ctx.fillStyle = '#7a5a34'; ctx.fillRect(-12, -66, 28, 28); ctx.strokeRect(-12, -66, 28, 28); }
      break;
    case 'beam': // mine support
      ctx.fillStyle = '#5a3e22'; ctx.fillRect(-34, -120, 9, 120); ctx.fillRect(25, -120, 9, 120); ctx.fillRect(-40, -128, 80, 10);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(-34, -118, 9, 4);
      break;
    case 'cannon':
      ctx.fillStyle = '#3a2a1a'; circ(ctx, -10, -12, 12); circ(ctx, 14, -12, 12);
      ctx.fillStyle = '#2a2a30'; ctx.save(); ctx.rotate(-0.25); rr(ctx, -26, -40, 62, 18, 8); ctx.fill(); ctx.restore();
      break;
    case 'banner':
      ctx.fillStyle = '#2a2018'; ctx.fillRect(-2, -150, 4, 150);
      ctx.fillStyle = p.foliage; poly(ctx, [2, -146, 34, -146, 34, -86, 18, -96, 2, -86]);
      ctx.fillStyle = 'rgba(255,220,120,0.35)'; circ(ctx, 18, -122, 7);
      break;
    case 'coral':
      ctx.strokeStyle = '#c85a6a'; ctx.lineWidth = 5;
      line(ctx, 0, 0, -10, -40); line(ctx, -10, -40, -22, -58); line(ctx, -10, -40, 0, -64); line(ctx, 0, 0, 14, -34); line(ctx, 14, -34, 22, -52);
      ctx.fillStyle = 'rgba(120,220,255,0.25)'; circ(ctx, 6, -80 - Math.sin(t * 2 + x) * 6, 3); circ(ctx, -8, -96 - Math.sin(t * 2.4 + x) * 6, 2);
      break;
    case 'thorns':
      ctx.strokeStyle = p.foliage; ctx.lineWidth = 6;
      for (let k = 0; k < 4; k++) { const a = -0.6 + k * 0.4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(Math.sin(a) * 60, -50, Math.sin(a) * 30, -90 - k * 6); ctx.stroke(); }
      ctx.fillStyle = shade(p.foliage, 1.3);
      for (let k = 0; k < 8; k++) poly(ctx, [-30 + k * 9, -20 - (k % 3) * 22, -26 + k * 9, -30 - (k % 3) * 22, -22 + k * 9, -20 - (k % 3) * 22]);
      break;
    case 'gear': {
      ctx.fillStyle = '#5a6460'; ctx.save(); ctx.translate(0, -50); ctx.rotate(t * 0.6 + x);
      for (let k = 0; k < 8; k++) { ctx.rotate(Math.PI / 4); ctx.fillRect(-5, -44, 10, 10); }
      circ(ctx, 0, 0, 36); ctx.fillStyle = shade(p.far, 0.8); circ(ctx, 0, 0, 12); ctx.restore();
      break;
    }
    case 'pipe':
      ctx.fillStyle = '#6a7470'; ctx.fillRect(-40, -96, 80, 14); ctx.fillRect(28, -96, 14, 96);
      ctx.fillStyle = '#4a524e'; ctx.fillRect(-44, -100, 10, 22); ctx.fillRect(24, -40, 22, 10);
      ctx.fillStyle = 'rgba(120,255,140,0.5)'; circ(ctx, -34, -78 + ((t * 30 + x) % 60), 3);
      break;
    case 'bookshelf':
      ctx.fillStyle = '#4a3020'; ctx.fillRect(-30, -120, 60, 120);
      for (let r = 0; r < 4; r++) {
        ctx.fillStyle = '#2a1a10'; ctx.fillRect(-26, -114 + r * 29, 52, 25);
        for (let k = 0; k < 7; k++) { ctx.fillStyle = ['#7a2a2a', '#2a4a7a', '#5a6a2a', '#7a5a2a'][(k + r) % 4]; ctx.fillRect(-24 + k * 7, -110 + r * 29 + (k % 2) * 3, 6, 21 - (k % 2) * 3); }
      }
      break;
    case 'weaponrack':
      ctx.fillStyle = '#4a3020'; ctx.fillRect(-30, -70, 60, 6); ctx.fillRect(-28, -70, 5, 70); ctx.fillRect(23, -70, 5, 70);
      ctx.strokeStyle = '#b8bec4'; ctx.lineWidth = 3;
      for (let k = 0; k < 4; k++) line(ctx, -18 + k * 12, -4, -18 + k * 12 + 4, -96);
      break;
    case 'statue':
      ctx.fillStyle = shade(p.rock, 0.75); ctx.fillRect(-24, -20, 48, 20);
      ctx.fillStyle = p.rock; rr(ctx, -14, -96, 28, 76, 6); ctx.fill(); circ(ctx, 0, -110, 14);
      ctx.fillRect(-26, -90, 12, 40); ctx.fillRect(14, -90, 12, 40);
      ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(4, -96, 10, 76);
      break;
    case 'bones':
      ctx.strokeStyle = '#d8d0b8'; ctx.lineWidth = 4;
      line(ctx, -24, -4, 4, -10); line(ctx, -6, -2, 20, -6);
      ctx.fillStyle = '#d8d0b8'; circ(ctx, 14, -16, 9); ctx.fillStyle = '#1b1410'; circ(ctx, 11, -17, 2); circ(ctx, 17, -17, 2);
      break;
    case 'anvil':
      ctx.fillStyle = '#2a2a30'; ctx.fillRect(-10, -26, 20, 26); poly(ctx, [-26, -40, 22, -40, 30, -34, 22, -26, -18, -26]);
      ctx.fillStyle = 'rgba(255,120,40,0.6)'; circ(ctx, 4, -44, 3 + Math.sin(t * 7) * 1.5);
      break;
  }
  ctx.restore();
}

// ---------------------------------------------------------------------
//  Heroes — race proportions + class outfit + equipped gear
//  look: race look + class look + gear flags; pose: walking/swing/cast/shoot
// ---------------------------------------------------------------------
function swordAngle(sw) {
  if (sw < 0) return 0.22;
  if (sw < 0.28) return 0.22 + (-0.75 - 0.22) * (sw / 0.28);
  if (sw < 0.5) return -0.75 + (2.15 + 0.75) * ((sw - 0.28) / 0.22);
  return 2.15 + (0.22 - 2.15) * ((sw - 0.5) / 0.5);
}

function drawWeapon(ctx, type, q, tier, big, orb) {
  const glow = q >= 3 ? (q === 4 ? 'rgba(163,53,238,0.5)' : 'rgba(0,112,221,0.45)') : null;
  const two = type && type.startsWith('2h');
  const len = (two ? 1.3 : 1) * (60 + Math.min(18, (tier || 0) * 4));
  switch (type) {
    case 'sword': case '2hsword': {
      ctx.fillStyle = '#4a2e1a'; ctx.fillRect(-2.5, -2, 5, two ? 20 : 14);
      ctx.fillStyle = '#d9b04a'; ctx.fillRect(-11, -6, 22, 5); circ(ctx, 0, two ? 20 : 14, 3.5);
      ctx.fillStyle = big ? '#ffb08a' : '#dfe6ee';
      ctx.beginPath(); ctx.moveTo(-5, -6); ctx.lineTo(-5, -6 - len); ctx.lineTo(0, -14 - len); ctx.lineTo(5, -6 - len); ctx.lineTo(5, -6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(0, -6 - len, 5, len);
      if (glow) { ctx.fillStyle = glow; ctx.fillRect(-1.5, -10 - len, 3, len); }
      break;
    }
    case 'axe': case '2haxe': {
      const h = len * 0.85;
      ctx.fillStyle = '#5a3a24'; ctx.fillRect(-2.5, -h, 5, h + 14);
      ctx.fillStyle = big ? '#ffb08a' : '#c8ced4';
      ctx.beginPath(); ctx.moveTo(2, -h + 2); ctx.quadraticCurveTo(two ? 34 : 26, -h + 6, two ? 28 : 22, -h + 30); ctx.lineTo(2, -h + 22); ctx.fill();
      if (two) { ctx.beginPath(); ctx.moveTo(-2, -h + 2); ctx.quadraticCurveTo(-30, -h + 6, -24, -h + 28); ctx.lineTo(-2, -h + 20); ctx.fill(); }
      if (glow) { ctx.fillStyle = glow; circ(ctx, 14, -h + 16, 8); }
      break;
    }
    case 'mace': case '2hmace': {
      const h = len * 0.8;
      ctx.fillStyle = '#5a3a24'; ctx.fillRect(-2.5, -h, 5, h + 14);
      ctx.fillStyle = big ? '#ffb08a' : '#9aa2aa';
      if (two) { rr(ctx, -13, -h - 18, 26, 24, 4); ctx.fill(); ctx.fillStyle = '#d9b04a'; ctx.fillRect(-13, -h - 8, 26, 4); }
      else { circ(ctx, 0, -h - 6, 10); ctx.fillStyle = '#6a727a'; for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.6; circ(ctx, Math.cos(a) * 10, -h - 6 + Math.sin(a) * 10, 3); } }
      if (glow) { ctx.fillStyle = glow; circ(ctx, 0, -h - 6, 14); }
      break;
    }
    case 'dagger': {
      ctx.fillStyle = '#3a2a1a'; ctx.fillRect(-2, -2, 4, 11);
      ctx.fillStyle = '#d9b04a'; ctx.fillRect(-7, -5, 14, 4);
      ctx.fillStyle = big ? '#ffb08a' : '#e4eaf0'; poly(ctx, [-4, -5, 0, -38 - (tier || 0) * 2, 4, -5]);
      if (glow) { ctx.fillStyle = glow; poly(ctx, [-1.5, -6, 0, -36, 1.5, -6]); }
      break;
    }
    case 'staff': {
      ctx.fillStyle = '#5a3a20'; ctx.fillRect(-2.5, -80, 5, 104);
      ctx.fillStyle = '#7a5a30'; ctx.fillRect(-4, -84, 8, 6);
      const oc = orb || '#8ad8ff';
      const g = ctx.createRadialGradient(0, -92, 1, 0, -92, 16);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, oc); g.addColorStop(1, hexA(oc.length === 7 ? oc : '#8ad8ff', 0));
      ctx.fillStyle = g; circ(ctx, 0, -92, big ? 18 : 13);
      ctx.fillStyle = oc; circ(ctx, 0, -92, 5);
      if (glow) { ctx.fillStyle = glow; circ(ctx, 0, -92, 10); }
      break;
    }
    default: // fists
      break;
  }
}

function drawBow(ctx, type, q, draw) {
  ctx.lineCap = 'round';
  if (type === 'gun') {
    ctx.fillStyle = '#5a3a20'; rr(ctx, -10, -4, 22, 9, 3); ctx.fill();
    ctx.fillStyle = '#7a828a'; ctx.fillRect(8, -3, 34, 5);
    ctx.fillStyle = '#d9b04a'; ctx.fillRect(4, -5, 4, 10);
    return;
  }
  if (type === 'crossbow') {
    ctx.fillStyle = '#5a3a20'; ctx.fillRect(-8, -3, 40, 6);
    ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(28, 0, 16, -Math.PI / 2, Math.PI / 2, true); ctx.stroke();
    ctx.strokeStyle = '#e8e0d0'; ctx.lineWidth = 1; line(ctx, 28, -16, 28 - draw * 14, 0); line(ctx, 28 - draw * 14, 0, 28, 16);
    return;
  }
  ctx.strokeStyle = q >= 3 ? (q === 4 ? '#a335ee' : '#3a7ad8') : '#6a4a24'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(0, -38); ctx.quadraticCurveTo(18, 0, 0, 38); ctx.stroke();
  ctx.strokeStyle = '#e8e0d0'; ctx.lineWidth = 1.2;
  const sx = -draw * 20;
  line(ctx, 0, -38, sx, 0); line(ctx, sx, 0, 0, 38);
  if (draw > 0.05) { ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 2; line(ctx, sx, 0, sx + 44, 0); ctx.fillStyle = '#cfd6dc'; poly(ctx, [sx + 44, -3, sx + 51, 0, sx + 44, 3]); }
}

function drawHair(ctx, L, hx, hy, r, covered) {
  ctx.fillStyle = L.hair;
  if (covered) {
    if (L.hairStyle === 'long' || L.hairStyle === 'braids') { ctx.fillRect(hx - r - 2, hy - 2, 7, r * 2.2); }
    return;
  }
  switch (L.hairStyle) {
    case 'short': ctx.beginPath(); ctx.arc(hx, hy - 3, r, Math.PI * 1.02, Math.PI * 1.95); ctx.fill(); break;
    case 'long':
      ctx.beginPath(); ctx.arc(hx, hy - 3, r + 1, Math.PI * 0.95, Math.PI * 1.98); ctx.fill();
      ctx.fillRect(hx - r - 1, hy - 4, 8, r * 2.4); break;
    case 'mohawk':
      for (let k = 0; k < 5; k++) poly(ctx, [hx - 9 + k * 4, hy - r + 3, hx - 7 + k * 4, hy - r - 12 + Math.abs(k - 2) * 2, hx - 4 + k * 4, hy - r + 3]);
      break;
    case 'topknot':
      circ(ctx, hx - 4, hy - r - 2, 5); ctx.fillRect(hx - 6, hy - r - 2, 4, 8); break;
    case 'pigtails':
      ctx.beginPath(); ctx.arc(hx, hy - 3, r + 1, Math.PI * 1.0, Math.PI * 1.98); ctx.fill();
      circ(ctx, hx - r - 4, hy - 2, 7); circ(ctx, hx - r + 2, hy - r - 2, 6); break;
    case 'braids':
      ctx.beginPath(); ctx.arc(hx, hy - 3, r, Math.PI * 1.05, Math.PI * 1.9); ctx.fill();
      ctx.fillRect(hx - r - 1, hy - 2, 6, r * 2.6); circ(ctx, hx - r + 2, hy + r * 2.6, 4); break;
  }
}

function drawHeadgear(ctx, kind, cl, hx, hy, r) {
  switch (kind) {
    case 'helm':
      ctx.fillStyle = '#8a95a1'; ctx.beginPath(); ctx.arc(hx, hy - 2, r + 2, Math.PI, 0); ctx.fill();
      ctx.fillRect(hx - r - 2, hy - 4, (r + 2) * 2, 5);
      ctx.fillStyle = '#6b7682'; ctx.fillRect(hx + r * 0.55, hy - 4, 4, 14);
      ctx.fillStyle = '#c23a2a'; ctx.beginPath(); ctx.moveTo(hx - 8, hy - r - 2); ctx.quadraticCurveTo(hx - 26, hy - r - 14, hx - 28, hy + 8 - r); ctx.quadraticCurveTo(hx - 18, hy - r - 2, hx - 6, hy - r + 2); ctx.fill();
      break;
    case 'crest':
      ctx.fillStyle = '#d8dce2'; ctx.beginPath(); ctx.arc(hx, hy - 2, r + 2, Math.PI, 0); ctx.fill();
      ctx.fillRect(hx - r - 2, hy - 4, (r + 2) * 2, 6);
      ctx.fillStyle = cl.trim; ctx.fillRect(hx - r - 2, hy - 4, (r + 2) * 2, 2); ctx.fillRect(hx - 1.5, hy - r - 2, 3, r);
      ctx.fillStyle = '#ffffff'; poly(ctx, [hx - r, hy - r, hx - r - 14, hy - r - 12, hx - r - 4, hy - r + 4]);
      break;
    case 'coif':
      ctx.fillStyle = '#7a8088'; ctx.beginPath(); ctx.arc(hx - 1, hy, r + 3, Math.PI * 0.62, Math.PI * 2.08); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.15)'; for (let k = 0; k < 4; k++) ctx.fillRect(hx - r, hy - r + k * 6, r * 1.4, 1.5);
      ctx.fillStyle = '#c8a050'; poly(ctx, [hx - r + 2, hy - r, hx - r - 6, hy - r - 16, hx - r + 6, hy - r - 2]);
      break;
    case 'mask':
      ctx.fillStyle = cl.dark; ctx.beginPath(); ctx.arc(hx - 1, hy - 1, r + 3, Math.PI * 0.7, Math.PI * 2.05); ctx.fill();
      ctx.fillStyle = '#1a141a'; ctx.fillRect(hx, hy + 2, r + 2, 6);
      break;
    case 'cowl':
      ctx.fillStyle = cl.main; ctx.beginPath(); ctx.arc(hx - 1, hy - 1, r + 4, Math.PI * 0.62, Math.PI * 2.05); ctx.fill();
      ctx.fillStyle = cl.trim; ctx.beginPath(); ctx.arc(hx - 1, hy - 1, r + 4, Math.PI * 1.55, Math.PI * 2.05); ctx.lineTo(hx - 1, hy - 1); ctx.fill();
      ctx.fillStyle = cl.main; ctx.beginPath(); ctx.arc(hx - 1, hy - 1, r + 2, Math.PI * 1.6, Math.PI * 2.02); ctx.lineTo(hx - 1, hy - 1); ctx.fill();
      break;
    case 'hat':
      ctx.fillStyle = cl.dark; ell(ctx, hx, hy - r + 4, r + 12, 4);
      ctx.fillStyle = cl.main; poly(ctx, [hx - r - 2, hy - r + 3, hx + r + 2, hy - r + 3, hx - 10, hy - r - 34]);
      ctx.fillStyle = cl.trim; ctx.fillRect(hx - r, hy - r - 1, r * 2, 3);
      ctx.fillStyle = '#ffe9a0'; circ(ctx, hx - 4, hy - r - 14, 2);
      break;
    case 'horned':
      ctx.fillStyle = cl.main; ctx.beginPath(); ctx.arc(hx - 1, hy - 1, r + 4, Math.PI * 0.62, Math.PI * 2.05); ctx.fill();
      ctx.fillStyle = '#2a1e18';
      ctx.beginPath(); ctx.moveTo(hx - 6, hy - r - 1); ctx.quadraticCurveTo(hx - 18, hy - r - 18, hx - 4, hy - r - 26); ctx.quadraticCurveTo(hx - 10, hy - r - 12, hx, hy - r); ctx.fill();
      ctx.beginPath(); ctx.moveTo(hx + 4, hy - r - 1); ctx.quadraticCurveTo(hx + 4, hy - r - 18, hx + 16, hy - r - 24); ctx.quadraticCurveTo(hx + 8, hy - r - 10, hx + 9, hy - r + 1); ctx.fill();
      ctx.fillStyle = cl.trim; circ(ctx, hx + r * 0.45, hy - 1, 1.8);
      break;
    case 'feathers':
      ctx.fillStyle = '#6a4a2a'; ctx.fillRect(hx - r, hy - r + 2, r * 2, 4);
      ctx.fillStyle = '#e8e0d0'; poly(ctx, [hx - r + 2, hy - r + 2, hx - r - 4, hy - r - 18, hx - r + 6, hy - r + 2]);
      ctx.fillStyle = '#c23a2a'; poly(ctx, [hx - r + 6, hy - r + 2, hx - r + 2, hy - r - 14, hx - r + 10, hy - r + 2]);
      ctx.fillStyle = '#3a8ad8'; circ(ctx, hx, hy - r + 4, 2.5);
      break;
    case 'antlers':
      ctx.strokeStyle = '#d8c8a0'; ctx.lineWidth = 3;
      line(ctx, hx - 5, hy - r + 2, hx - 12, hy - r - 18); line(ctx, hx - 9, hy - r - 9, hx - 18, hy - r - 12); line(ctx, hx - 11, hy - r - 15, hx - 6, hy - r - 24);
      line(ctx, hx + 5, hy - r + 2, hx + 10, hy - r - 18); line(ctx, hx + 8, hy - r - 9, hx + 16, hy - r - 14);
      ctx.fillStyle = '#5a8a2a'; ctx.fillRect(hx - r, hy - r + 2, r * 2, 4);
      ctx.fillStyle = '#7aa83a'; ell(ctx, hx + r - 2, hy - r + 3, 4, 2.5, 0.4);
      break;
  }
}

// Draw a full humanoid hero facing right with its feet at (x, gy)
function drawCharacter(ctx, x, gy, t, pose, look) {
  const L = look, cl = look.cls, gear = look.gear, sets = gear.sets || {};
  ctx.save();
  // Stand on whole pixels so the pixel-art gear stays crisp
  ctx.translate(snap(x), snap(gy));
  if (pose.scale) ctx.scale(pose.scale, pose.scale);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ell(ctx, 0, 0, L.width * 0.9 + 6, 7);

  const ph = t * 11;
  const step = pose.walking ? Math.sin(ph) : 0;
  const bob = pose.walking ? Math.abs(Math.sin(ph)) * 3 : Math.sin(t * 2) * 1.2;
  const shake = pose.hurt > 0 ? Math.sin(t * 80) * pose.hurt * 2 : 0;
  ctx.translate(snap(shake), -snap(bob));
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  const W = L.width, leg = L.leg, torso = L.torso, hr = L.head * 1.1;   // slightly big heads read better as sprites
  const hipY = -leg, topY = hipY - torso, shY = topY + 8;
  const hx = 2 + (L.hunch || 0), hy = topY - hr + 4 + (L.hunch || 0) * 0.5;
  const sChest = sets.chest, sLegs = sets.legs, sFeet = sets.feet, sHands = sets.hands, sHead = sets.head, sShoulder = sets.shoulder, sWaist = sets.waist, sWrist = sets.wrist;
  // Without item sets (e.g. the creation preview) the class outfit is used
  const armored = gear.chest && !sChest;
  const shirt = gear.shirt || '#8a6a4a';
  const main = armored ? cl.main : shirt, dark = armored ? cl.dark : shade(shirt, 0.7);
  const tabard = gear.tabard || (armored ? cl.tabard : null);
  const legsC = sLegs ? gearLegColor(sLegs) : gear.legs ? cl.dark : '#4a3424';
  const boots = gear.feet ? (cl.robe ? cl.dark : '#3e3a3a') : '#3a2a1c';
  const robe = cl.robe && armored;
  const legW = Math.max(7, W * 0.3);
  const handC = sHands ? sHands.c.base : gear.hands ? dark : L.skin;
  const sleeve = sChest ? sChest.c.dark : null;
  const epic = [sChest, sShoulder, sHead, sLegs].find(s => s && s.glow);

  if (epic) drawGearAura(ctx, epic, W, topY, t);
  // Cloak, quiver and totem behind the body
  if (sChest && sChest.cloak) drawGearCloak(ctx, sChest, W, topY, hipY, leg, t, pose.walking);
  else if (cl.cloak && armored) {
    const sway = Math.sin(t * 3) * 3 + (pose.walking ? 6 : 0);
    ctx.fillStyle = cl.cloak; poly(ctx, [-W / 2 + 2, topY + 4, W / 2 - 6, topY + 4, -W / 2 - 4 - sway, hipY + leg * 0.55, -W / 2 - 14 - sway, hipY + leg * 0.4]);
  }
  if (cl.quiver) {
    ctx.save(); ctx.translate(-W / 2 + 2, topY + 18); ctx.rotate(-0.35);
    ctx.fillStyle = '#6a4a24'; ctx.fillRect(-5, -6, 10, 34);
    ctx.fillStyle = '#e8e0d0'; for (let k = 0; k < 3; k++) poly(ctx, [-4 + k * 4, -6, -2 + k * 4, -14, k * 4, -6]);
    ctx.restore();
  }
  if (cl.totem) {
    ctx.save(); ctx.translate(-W / 2 + 3, topY + 22); ctx.rotate(-0.3);
    ctx.fillStyle = '#7a5a3a'; ctx.fillRect(-4, -18, 8, 36);
    ctx.fillStyle = '#c23a2a'; ctx.fillRect(-5, -14, 10, 4); ctx.fillStyle = '#3a8ad8'; ctx.fillRect(-5, -2, 10, 4);
    ctx.restore();
  }

  // Back arm (+ off-hand / bow)
  const ranged = pose.ranged;
  const bshX = -W / 2 + 6, bshY = shY + 2;
  if (ranged) {
    const bx = W / 2 + 18, by = shY + 4;
    ctx.strokeStyle = sleeve || handC; ctx.lineWidth = 7; line(ctx, bshX + 4, bshY, bx, by);
    if (sHands) drawGearHand(ctx, sHands, bx, by);
    ctx.save(); ctx.translate(bx, by); drawBow(ctx, L.weaponType, gear.weaponQ, Math.max(0, pose.shoot)); ctx.restore();
  } else {
    const bhx = bshX - 6, bhy = shY + 22;
    ctx.strokeStyle = sleeve || handC; ctx.lineWidth = 8; line(ctx, bshX, bshY, bhx, bhy);
    if (sHands) drawGearHand(ctx, sHands, bhx, bhy);
    const oh = gear.offhand, oth = gear.offhandTheme;
    if (oh === 'shield') {
      const sr = Math.max(14, W * 0.55);
      ctx.fillStyle = oth ? oth.main : gear.offhandQ >= 3 ? (gear.offhandQ === 4 ? '#4a2a6a' : '#2a3a6a') : '#6a3e1e'; circ(ctx, bhx, bhy + 2, sr);
      ctx.strokeStyle = oth ? oth.metal : '#c9a64a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(bhx, bhy + 2, sr - 2, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = oth && gear.offhandQ >= 3 ? oth.accent : '#c9a64a'; circ(ctx, bhx, bhy + 2, 5);
    } else if (oh === 'held') {
      const c = (oth && oth.accent) || cl.orb || '#8ad8ff', g = ctx.createRadialGradient(bhx, bhy, 1, bhx, bhy, 12);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, c); g.addColorStop(1, hexA(c, 0));
      ctx.fillStyle = g; circ(ctx, bhx, bhy, 12 + Math.sin(t * 3));
    } else if (oh && WEAPON_TYPES[oh]) {
      ctx.save(); ctx.translate(bhx, bhy); ctx.rotate(0.9 + Math.sin(t * 3) * 0.05); drawWeapon(ctx, oh, gear.offhandQ, gear.weaponTier); ctx.restore();
    }
  }

  // Legs (or the class robe)
  if (robe) {
    ctx.fillStyle = boots;
    rr(ctx, -12 + step * 8, -8, 14, 8, 3); ctx.fill(); rr(ctx, 0 - step * 8, -8, 14, 8, 3); ctx.fill();
    ctx.fillStyle = cl.main; poly(ctx, [-W / 2 + 2, hipY - 6, W / 2 - 2, hipY - 6, W / 2 + 8 + step * 3, -6, -W / 2 - 8 - step * 3, -6]);
    ctx.fillStyle = cl.trim; ctx.fillRect(-W / 2 - 8 - step * 3, -9, W + 16 + step * 6, 3);
    ctx.fillStyle = cl.dark; poly(ctx, [-3, hipY - 6, 3, hipY - 6, 5, -9, -5, -9]);
  } else {
    const f1 = -W * 0.25 + step * 12, f2 = W * 0.25 - step * 12;
    ctx.strokeStyle = legsC; ctx.lineWidth = legW;
    line(ctx, -W * 0.15, hipY - 4, f1, -6);
    line(ctx, W * 0.15, hipY - 4, f2, -6);
    if (sLegs) { drawGearKnee(ctx, sLegs, (-W * 0.15 + f1) / 2, hipY / 2 - 3); drawGearKnee(ctx, sLegs, (W * 0.15 + f2) / 2, hipY / 2 - 3); }
    if (sFeet) { drawGearFoot(ctx, sFeet, f1, 0); drawGearFoot(ctx, sFeet, f2, 0); }
    else {
      ctx.fillStyle = L.hooves ? '#2a2018' : boots;
      rr(ctx, f1 - 8, -9, 16, 9, 3); ctx.fill();
      rr(ctx, f2 - 8, -9, 16, 9, 3); ctx.fill();
    }
  }
  if (sChest) drawGearSkirt(ctx, sChest, W, hipY, leg, step);

  // Torso
  if (sChest) {
    drawGearChest(ctx, sChest, W, topY, hipY, torso, t, gear.tabard);
    if (sWaist) drawGearWaist(ctx, sWaist, W, hipY, t);
    else { ctx.fillStyle = '#3e2a1a'; pxRect(ctx, -W / 2, hipY - 6, W, 5); }
  } else {
    ctx.fillStyle = main; rr(ctx, -W / 2, topY, W, torso + 4, 7); ctx.fill();
    if (armored) {
      if (robe) {
        ctx.fillStyle = cl.trim; ctx.fillRect(-2, topY + 4, 4, torso);
        ctx.fillStyle = cl.dark; ctx.fillRect(-W / 2, hipY - 10, W, 5);
      } else {
        ctx.fillStyle = tabard; rr(ctx, -W * 0.25, topY + 6, W * 0.5, torso, 3); ctx.fill();
        ctx.fillStyle = cl.trim; ctx.fillRect(-W * 0.25, topY + 6, W * 0.5, 3);
        ctx.fillStyle = gear.waist ? cl.dark : '#3e2a1a'; ctx.fillRect(-W / 2, hipY - 6, W, 6);
        ctx.fillStyle = cl.trim; ctx.fillRect(-3, hipY - 6, 6, 6);
      }
    } else {
      if (gear.tabard) { ctx.fillStyle = gear.tabard; rr(ctx, -W * 0.25, topY + 6, W * 0.5, torso, 3); ctx.fill(); }
      if (sWaist) drawGearWaist(ctx, sWaist, W, hipY, t);
      else { ctx.fillStyle = '#3e2a1a'; ctx.fillRect(-W / 2, hipY - 6, W, 5); }
    }
  }

  // Head
  if (L.ears === 'long') {
    ctx.fillStyle = L.skin; poly(ctx, [hx - hr * 0.4, hy - 3, hx - hr - 14, hy - hr - 8, hx - hr * 0.2, hy + 3]);
  } else if (L.ears === 'small') {
    ctx.fillStyle = L.skin; poly(ctx, [hx - hr * 0.5, hy - 2, hx - hr - 6, hy - 8, hx - hr * 0.4, hy + 4]);
  }
  ctx.fillStyle = L.skin; circ(ctx, hx, hy, hr);
  if (L.snout) { ctx.fillStyle = shade(L.skin, 0.8); ell(ctx, hx + hr * 0.75, hy + 5, hr * 0.55, hr * 0.42); ctx.fillStyle = '#1b1410'; circ(ctx, hx + hr * 1.1, hy + 4, 1.6); }
  if (L.jaw) { ctx.fillStyle = shade(L.skin, 0.7); ctx.fillRect(hx + 1, hy + hr * 0.45, hr * 0.8, 5); ctx.fillStyle = '#e8e4d4'; for (let k = 0; k < 3; k++) ctx.fillRect(hx + 3 + k * 3, hy + hr * 0.45, 2, 3); }
  ctx.fillStyle = '#f2e8d4'; pxRect(ctx, hx + hr * 0.3, hy - 3, PX * 2, PX * 1.5);
  ctx.fillStyle = L.eye || '#1b1410'; pxRect(ctx, hx + hr * 0.3 + PX, hy - 3, PX, PX * 1.5);
  if (L.tusks) {
    ctx.strokeStyle = '#f2ead6'; ctx.lineWidth = L.tusks === 'big' ? 3 : 2;
    const tl = L.tusks === 'big' ? 9 : 5;
    ctx.beginPath(); ctx.moveTo(hx + hr * 0.6, hy + hr * 0.55); ctx.quadraticCurveTo(hx + hr * 0.9, hy + hr * 0.2, hx + hr * 0.8, hy + hr * 0.55 - tl); ctx.stroke();
  }
  if (sHead) {
    drawHair(ctx, L, hx, hy, hr, gearHeadCovers(sHead));
    drawGearHead(ctx, sHead, hx, hy, hr, t);
  } else {
    drawHair(ctx, L, hx, hy, hr, gear.head);
    if (gear.head) drawHeadgear(ctx, cl.head, cl, hx, hy, hr);
  }
  if (L.horns && !(sHead && sHead.type === 'plate' && sHead.helm !== 'kettle')) {
    ctx.fillStyle = '#e8dcc0';
    ctx.beginPath(); ctx.moveTo(hx - 6, hy - hr + 4); ctx.quadraticCurveTo(hx - 24, hy - hr, hx - 22, hy - hr - 16); ctx.quadraticCurveTo(hx - 16, hy - hr - 4, hx - 2, hy - hr + 8); ctx.fill();
    ctx.beginPath(); ctx.moveTo(hx + 6, hy - hr + 4); ctx.quadraticCurveTo(hx + 22, hy - hr, hx + 20, hy - hr - 16); ctx.quadraticCurveTo(hx + 14, hy - hr - 4, hx + 2, hy - hr + 8); ctx.fill();
  }
  if (L.beard) {
    ctx.fillStyle = L.hair; ctx.beginPath(); ctx.moveTo(hx - 2, hy + 2); ctx.quadraticCurveTo(hx + hr + 4, hy + 2, hx + hr * 0.6, hy + hr + 16); ctx.quadraticCurveTo(hx + 2, hy + hr + 22, hx - 4, hy + hr * 0.6); ctx.fill();
  }

  // Pauldron
  if (sShoulder) drawGearShoulder(ctx, sShoulder, W / 2 - 4, shY - 3, t);
  else if ((armored && !robe) || gear.shoulder) {
    const pr = gear.shoulder ? 13 : 10;
    ctx.fillStyle = gear.shoulder ? cl.dark : dark; circ(ctx, W / 2 - 4, shY - 2, pr);
    ctx.fillStyle = gear.shoulder ? cl.main : main; circ(ctx, W / 2 - 4, shY - 4, pr - 2);
    if (gear.shoulder) { ctx.fillStyle = cl.trim; ctx.fillRect(W / 2 - 4 - pr + 2, shY - 3, (pr - 2) * 2, 2); }
  }

  // Front arm + weapon
  const shX = W / 2 - 4;
  if (ranged) {
    const pull = Math.max(0, pose.shoot);
    const hx2 = W / 2 + 18 - pull * 20, hy2 = shY + 4;
    ctx.strokeStyle = sleeve || handC; ctx.lineWidth = 7; line(ctx, shX, shY, hx2, hy2);
    if (sWrist) drawGearWrist(ctx, sWrist, shX + (hx2 - shX) * 0.7, shY + (hy2 - shY) * 0.7 + 2);
    if (sHands) drawGearHand(ctx, sHands, hx2, hy2);
  } else {
    let a;
    if (pose.cast) a = -0.5 - pose.cast.p * 0.35 + Math.sin(t * 9) * 0.05;
    else if (pose.swing >= 0) a = swordAngle(pose.swing);
    else a = L.weaponType === 'staff' ? 0.05 : 0.22;
    const hx2 = shX + Math.sin(a) * 24, hy2 = shY - Math.cos(a) * 24 + 26;
    ctx.strokeStyle = sleeve || handC; ctx.lineWidth = 8;
    line(ctx, shX, shY, hx2, hy2);
    if (sWrist) drawGearWrist(ctx, sWrist, shX + (hx2 - shX) * 0.7, shY + (hy2 - shY) * 0.7 + 2);
    ctx.save();
    ctx.translate(hx2, hy2);
    ctx.rotate(a);
    if (pose.swing >= 0.28 && pose.swing < 0.6 && !pose.cast) {
      ctx.fillStyle = pose.big ? 'rgba(255,90,40,0.35)' : 'rgba(255,255,255,0.22)';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 84, -Math.PI / 2 - 1.6, -Math.PI / 2); ctx.closePath(); ctx.fill();
    }
    if (gear.weapon) drawWeapon(ctx, L.weaponType, gear.weaponQ, gear.weaponTier, pose.big && pose.swing >= 0, (gear.weaponTheme && gear.weaponTheme.accent) || cl.orb);
    else { ctx.fillStyle = L.skin; circ(ctx, 0, 0, 5); }
    ctx.restore();
    if (sHands) drawGearHand(ctx, sHands, hx2, hy2);
    if (pose.cast) {
      const c = pose.cast.color || '#8ad8ff';
      const g = ctx.createRadialGradient(hx2, hy2 - 30, 2, hx2, hy2 - 30, 30 + pose.cast.p * 12);
      g.addColorStop(0, hexA(c, 0.8)); g.addColorStop(1, hexA(c, 0));
      ctx.fillStyle = g; circ(ctx, hx2, hy2 - 30, 30 + pose.cast.p * 12);
    }
  }
  ctx.restore();
}

// Druid Cat Form
function drawCatForm(ctx, x, gy, t, walking, swing, hurt, look) {
  ctx.save();
  ctx.translate(x + (swing >= 0 ? Math.sin(Math.min(1, swing) * Math.PI) * 16 : 0) + (hurt > 0 ? Math.sin(t * 80) * hurt * 2 : 0), gy);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ell(ctx, 0, 0, 34, 6);
  ctx.scale(-0.9, 0.9);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const fur = look.race === 'tauren' ? '#a0794f' : '#5a4a7a';
  drawQuad(ctx, { color: fur, accent: shade(fur, 0.65), eye: '#ffe14a' }, t * (walking ? 12 : 3), walking);
  ctx.restore();
}

function drawPet(ctx, x, gy, t, pet, walking, attack) {
  ctx.save();
  const lunge = attack > 0 ? Math.sin(Math.min(1, attack) * Math.PI) * 14 : 0;
  ctx.translate(x + lunge, gy);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (pet.kind === 'beast') {
    const s = pet.def.size || 0.75;
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ell(ctx, 0, 0, 30 * s, 5);
    ctx.scale(-s, s); drawQuad(ctx, pet.def, t * (walking ? 12 : 3), walking);
  } else if (pet.kind === 'imp') {
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ell(ctx, 0, 0, 14, 4);
    ctx.translate(0, -Math.abs(Math.sin(t * 3)) * 6 - 6);
    ctx.scale(-0.5, 0.5); drawBiped(ctx, { color: '#b8321a', accent: '#6a1408', skin: '#d8502a', weapon: 'claws', horns: true }, t * (walking ? 10 : 3), walking, attack);
  } else {
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ell(ctx, 0, 0, 26, 5);
    ctx.scale(0.75, 0.75); drawBlob(ctx, { color: '#4a3a8a', accent: '#c0a0ff' }, t);
  }
  ctx.restore();
}

function drawTotem(ctx, x, gy, t) {
  ctx.save(); ctx.translate(x, gy);
  ctx.fillStyle = 'rgba(0,0,0,0.22)'; ell(ctx, 0, 0, 10, 3);
  ctx.fillStyle = '#7a4a2a'; ctx.fillRect(-5, -34, 10, 34);
  ctx.fillStyle = '#c23a2a'; ctx.fillRect(-6, -30, 12, 4);
  ctx.fillStyle = '#1b1410'; circ(ctx, -2, -22, 1.4); circ(ctx, 2, -22, 1.4);
  const g = ctx.createRadialGradient(0, -40, 1, 0, -40, 12);
  g.addColorStop(0, '#ffe08a'); g.addColorStop(0.5, `rgba(255,120,30,${0.7 + Math.sin(t * 12) * 0.2})`); g.addColorStop(1, 'rgba(255,80,20,0)');
  ctx.fillStyle = g; circ(ctx, 0, -40, 12);
  ctx.restore();
}

function drawTombstone(ctx, x, gy, t) {
  ctx.save(); ctx.translate(x, gy);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ell(ctx, 0, 0, 30, 6);
  ctx.fillStyle = '#7b7f86'; ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(-18, -38); ctx.arc(0, -38, 18, Math.PI, 0); ctx.lineTo(18, 0); ctx.fill();
  ctx.fillStyle = '#5e6268'; ctx.fillRect(-2, -48, 4, 26); ctx.fillRect(-9, -42, 18, 4);
  const gyo = -90 + Math.sin(t * 2) * 6;
  ctx.globalAlpha = 0.55;
  const g = ctx.createRadialGradient(0, gyo, 2, 0, gyo, 40);
  g.addColorStop(0, 'rgba(180,230,255,0.9)'); g.addColorStop(1, 'rgba(180,230,255,0)');
  ctx.fillStyle = g; circ(ctx, 0, gyo, 40);
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ---------------------------------------------------------------------
//  Enemies (all face left, toward the hero)
// ---------------------------------------------------------------------
function drawEnemy(ctx, e, G) {
  const d = e.def;
  const s = d.size * (e.elite ? 1.25 : 1);
  const lungeOff = Math.sin(Math.min(1, e.lunge) * Math.PI) * 18;
  const x = e.x - lungeOff + e.hit * 6;
  const gy = G.groundY;
  const fade = e.state === 'dying' ? Math.max(0, 1 - e.dying / 0.6) : 1;

  ctx.save();
  ctx.globalAlpha = fade;
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ell(ctx, x, gy, 38 * s, 7 * s);
  if (e.elite) {
    const g = ctx.createRadialGradient(x, gy - 4, 4, x, gy - 4, 60 * s);
    g.addColorStop(0, `rgba(255,210,80,${0.35 + Math.sin(G.t * 4) * 0.1})`); g.addColorStop(1, 'rgba(255,210,80,0)');
    ctx.fillStyle = g; ell(ctx, x, gy - 4, 60 * s, 16 * s);
  }
  if (e.stun > 0) {
    ctx.fillStyle = '#ffe14a';
    for (let k = 0; k < 3; k++) { const a = G.t * 4 + k * 2.1; circ(ctx, x + Math.cos(a) * 16 * s, gy - 110 * s + Math.sin(a) * 4, 3); }
  }
  ctx.translate(x, gy + (1 - fade) * 10);
  if (e.state === 'dying') ctx.rotate(-(1 - fade) * 0.35);
  ctx.scale(s, s);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const walking = e.state === 'approach';
  const ph = e.anim * (walking ? 10 : 3);
  switch (d.type) {
    case 'quad': drawQuad(ctx, d, ph, walking); break;
    case 'biped': drawBiped(ctx, d, ph, walking, e.lunge); break;
    case 'spider': drawSpider(ctx, d, ph, walking); break;
    case 'blob': drawBlob(ctx, d, G.t + e.seed); break;
  }
  ctx.restore();
}

// Head-and-shoulders portrait of an enemy for the target frame (faces left, like the target frame)
const PORTRAIT_FOCUS = { biped: [0, -100], quad: [-40, -50], spider: [-8, -32], blob: [0, -50] };
function drawPortrait(ctx, W, H, d, t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const g = ctx.createRadialGradient(W / 2, H / 2, 2, W / 2, H / 2, W / 2);
  g.addColorStop(0, '#3a3a3a'); g.addColorStop(1, '#0a0a0a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const [fx, fy] = PORTRAIT_FOCUS[d.type] || [0, -60];
  const k = H / 70;
  ctx.translate(W / 2 - fx * k, H * 0.55 - fy * k);
  ctx.scale(k, k);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  switch (d.type) {
    case 'quad': drawQuad(ctx, d, 0, false); break;
    case 'biped': drawBiped(ctx, d, 0, false, 0); break;
    case 'spider': drawSpider(ctx, d, 0, false); break;
    case 'blob': drawBlob(ctx, d, t); break;
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function drawQuad(ctx, d, ph, walking) {
  const sw = walking ? Math.sin(ph) * 0.55 : Math.sin(ph) * 0.05;
  const bob = walking ? Math.abs(Math.sin(ph)) * 2 : 0;
  ctx.translate(0, -bob);
  const leg = (x0, a, col) => { ctx.strokeStyle = col; ctx.lineWidth = 7; line(ctx, x0, -32, x0 + Math.sin(a) * 30, -32 + Math.cos(a) * 30); };
  leg(-20, -sw, d.accent); leg(24, sw, d.accent);
  // tail
  ctx.strokeStyle = d.color; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(34, -44); ctx.quadraticCurveTo(50, -46, 54, -58 + Math.sin(ph * 0.7) * 4); ctx.stroke();
  ctx.fillStyle = d.color; ell(ctx, 0, -42, 38, 17);
  ctx.fillStyle = d.accent; ell(ctx, -4, -54, 24, 6);
  if (d.stripes) { ctx.fillStyle = d.accent; for (let k = 0; k < 4; k++) ctx.fillRect(-14 + k * 10, -56, 4, 22); }
  leg(-28, sw, d.color); leg(16, -sw, d.color);
  // head
  ctx.fillStyle = d.color; ell(ctx, -40, -52, 15, 13);
  ell(ctx, -54, -47, 10, 7);
  ctx.fillStyle = d.accent; poly(ctx, [-40, -62, -33, -76, -30, -60]);
  ctx.fillStyle = '#1b1410'; circ(ctx, -62, -48, 2.4);
  ctx.fillStyle = d.eye || '#1b1410'; circ(ctx, -46, -55, d.eye ? 2.8 : 2.2);
  if (d.tusks) { ctx.strokeStyle = '#f2ead6'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-56, -42); ctx.quadraticCurveTo(-62, -44, -60, -52); ctx.stroke(); }
  if (d.horns) { ctx.strokeStyle = d.accent; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-36, -62); ctx.quadraticCurveTo(-30, -80, -18, -84); ctx.stroke(); }
}

function drawBiped(ctx, d, ph, walking, lunge) {
  ctx.scale(-1, 1); // draw facing right, mirrored to face left
  const step = walking ? Math.sin(ph) : 0;
  ctx.strokeStyle = d.accent; ctx.lineWidth = 9;
  line(ctx, -4, -48, -7 + step * 11, -4); line(ctx, 4, -48, 7 - step * 11, -4);
  ctx.strokeStyle = d.accent; ctx.lineWidth = 7; line(ctx, -8, -88, -14, -64);
  ctx.fillStyle = d.color; rr(ctx, -14, -98, 28, 54, 7); ctx.fill();
  ctx.fillStyle = d.accent; ctx.fillRect(-14, -56, 28, 5);
  ctx.fillStyle = d.skin; circ(ctx, 1, -112, 14);
  if (d.hood) { ctx.fillStyle = d.accent; ctx.beginPath(); ctx.arc(-1, -114, 17, Math.PI * 0.75, Math.PI * 2.05); ctx.lineTo(-14, -98); ctx.fill(); }
  if (d.horns) { ctx.fillStyle = '#2a1e18'; poly(ctx, [-6, -122, -14, -140, -1, -125]); poly(ctx, [5, -124, 10, -142, 10, -124]); }
  if (d.tusks) { ctx.strokeStyle = '#f2ead6'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(9, -104); ctx.quadraticCurveTo(14, -108, 12, -114); ctx.stroke(); }
  if (d.candle) { ctx.fillStyle = '#f0e6c0'; ctx.fillRect(-4, -134, 6, 9); ctx.fillStyle = '#ffb030'; ell(ctx, -1, -138, 2.5, 4); }
  ctx.fillStyle = d.eye || (d.weapon === 'staff' ? '#ff5a2a' : '#1b1410'); circ(ctx, 7, -113, 2);
  // weapon arm
  const a = 0.4 + Math.sin(Math.min(1, lunge) * Math.PI) * 1.5;
  const hx = 10 + Math.sin(a) * 22, hy = -90 - Math.cos(a) * 22 + 24;
  ctx.strokeStyle = d.skin; ctx.lineWidth = 7; line(ctx, 10, -90, hx, hy);
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(a);
  switch (d.weapon) {
    case 'dagger': ctx.fillStyle = '#cfd6dc'; poly(ctx, [-3, -4, 0, -30, 3, -4]); ctx.fillStyle = '#5a3a24'; ctx.fillRect(-2, -4, 4, 9); break;
    case 'axe': ctx.fillStyle = '#5a3a24'; ctx.fillRect(-2, -46, 4, 54); ctx.fillStyle = '#b8bec4'; ctx.beginPath(); ctx.moveTo(2, -44); ctx.quadraticCurveTo(22, -40, 18, -24); ctx.lineTo(2, -30); ctx.fill(); break;
    case 'staff': ctx.fillStyle = '#3a2418'; ctx.fillRect(-2, -64, 4, 80); ctx.fillStyle = '#ff7a2a'; circ(ctx, 0, -68, 6); ctx.fillStyle = 'rgba(255,140,40,0.3)'; circ(ctx, 0, -68, 12); break;
    case 'claws': ctx.strokeStyle = '#efe6d0'; ctx.lineWidth = 2.5; line(ctx, -3, 0, -5, -12); line(ctx, 0, 0, 0, -14); line(ctx, 3, 0, 5, -12); break;
    case 'sword': ctx.fillStyle = '#d0d6dc'; poly(ctx, [-3, -6, -2, -50, 0, -56, 2, -50, 3, -6]); ctx.fillStyle = '#8a6a2a'; ctx.fillRect(-9, -8, 18, 4); ctx.fillStyle = '#4a2e1a'; ctx.fillRect(-2, -4, 4, 12); break;
    case 'mace': ctx.fillStyle = '#5a3a24'; ctx.fillRect(-2, -44, 4, 52); ctx.fillStyle = '#9aa0a8'; rr(ctx, -10, -58, 20, 18, 4); ctx.fill(); ctx.fillStyle = '#6a7078'; ctx.fillRect(-12, -52, 24, 5); break;
  }
  ctx.restore();
}

function drawSpider(ctx, d, ph, walking) {
  const sp = walking ? 1 : 0.15;
  for (let side = 0; side < 2; side++) {
    ctx.strokeStyle = side === 0 ? d.accent : d.color; ctx.lineWidth = side === 0 ? 4 : 5;
    for (let i = 0; i < 4; i++) {
      const o = Math.sin(ph + i * 1.6 + side * 3) * 7 * sp;
      const bx = -12 + i * 6, kx = -34 + i * 18 + o, fx = -44 + i * 24 + o * 1.4;
      ctx.beginPath(); ctx.moveTo(bx, -28); ctx.lineTo(kx, -54 + side * 4); ctx.lineTo(fx, 0); ctx.stroke();
    }
  }
  ctx.fillStyle = d.color; ell(ctx, 22, -34, 27, 21);
  ctx.fillStyle = d.accent; poly(ctx, [16, -48, 28, -48, 22, -38]); poly(ctx, [16, -28, 28, -28, 22, -38]);
  ctx.fillStyle = d.color; ell(ctx, -12, -28, 16, 12);
  ctx.fillStyle = '#ff3a2a'; circ(ctx, -23, -32, 2.2); circ(ctx, -19, -35, 2); circ(ctx, -25, -27, 1.6); circ(ctx, -20, -29, 1.6);
  ctx.strokeStyle = '#1b1410'; ctx.lineWidth = 2.5; line(ctx, -26, -22, -30, -14); line(ctx, -21, -21, -23, -13);
}

function drawBlob(ctx, d, t) {
  const cy = -50 + Math.sin(t * 2) * 4;
  const g = ctx.createRadialGradient(0, cy, 6, 0, cy, 64);
  g.addColorStop(0, hexA(d.accent, 0.45)); g.addColorStop(1, hexA(d.accent, 0));
  ctx.fillStyle = g; circ(ctx, 0, cy, 64);
  ctx.fillStyle = d.color;
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    const r = 32 + Math.sin(a * 5 + t * 3) * 3 + Math.sin(a * 3 - t * 2) * 2;
    const px = Math.cos(a) * r, py = cy + Math.sin(a) * r * 1.1;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = hexA(d.accent, 0.55); ell(ctx, 4, cy + 6, 14, 12);
  ctx.fillStyle = d.accent; ell(ctx, -16, cy - 8, 4, 3); ell(ctx, -2, cy - 9, 4, 3);
  for (let i = 0; i < 3; i++) {
    const a = t * 1.5 + i * 2.1;
    ctx.fillStyle = d.color; circ(ctx, Math.cos(a) * 46, cy + Math.sin(a) * 14, 5);
  }
}

// ---------------------------------------------------------------------
//  Effects
// ---------------------------------------------------------------------
const PROJ_COLORS = {
  fireball: '#ff7a2a', frostbolt: '#8ad8ff', shadowbolt: '#9a4aff', arcane: '#ff8aff', holy: '#ffe47a',
  wrath: '#8aff6a', starfire: '#d8e8ff', lightning: '#bfe8ff', arrow: '#e8e0d0', wand: '#c8a8ff', firebolt: '#ff9a3a', drain: '#7aff5a',
};

function drawProjectiles(ctx, list) {
  for (const p of list) {
    const c = PROJ_COLORS[p.type] || '#ffffff';
    if (p.type === 'lightning') {
      ctx.globalAlpha = Math.max(0, p.life / 0.2);
      ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.shadowColor = '#8ad8ff'; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.moveTo(p.sx, p.sy);
      const n = 7;
      for (let k = 1; k < n; k++) ctx.lineTo(p.sx + (p.tx - p.sx) * k / n, p.sy + (p.ty - p.sy) * k / n + (hash(k, p.seed) - 0.5) * 26);
      ctx.lineTo(p.tx, p.ty); ctx.stroke();
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      continue;
    }
    if (p.type === 'drain') {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / 0.3));
      ctx.strokeStyle = c; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(p.tx, p.ty);
      for (let k = 1; k <= 12; k++) { const f = k / 12; ctx.lineTo(p.tx + (p.sx - p.tx) * f, p.ty + (p.sy - p.ty) * f + Math.sin(f * 12 + p.t * 20) * 6); }
      ctx.stroke(); ctx.globalAlpha = 1;
      continue;
    }
    if (p.type === 'arrow') {
      ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 2; line(ctx, p.x - 22, p.y, p.x, p.y);
      ctx.fillStyle = '#cfd6dc'; poly(ctx, [p.x, p.y - 3, p.x + 7, p.y, p.x, p.y + 3]);
      ctx.fillStyle = '#c23a2a'; poly(ctx, [p.x - 22, p.y, p.x - 27, p.y - 4, p.x - 18, p.y]);
      continue;
    }
    const r = p.type === 'fireball' ? (p.big ? 14 : 9) : p.type === 'starfire' ? 10 : p.type === 'wand' || p.type === 'firebolt' ? 5 : 7;
    const g = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, r * 2.4);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, c); g.addColorStop(1, hexA(c, 0));
    ctx.fillStyle = g; circ(ctx, p.x, p.y, r * 2.4);
    ctx.fillStyle = hexA(c, 0.35); ell(ctx, p.x - r * 2, p.y, r * 2, r * 0.6);
  }
}

function drawFCT(ctx, list) {
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  for (const f of list) {
    if (f.delay > 0) continue;
    ctx.globalAlpha = Math.max(0, Math.min(1, (f.life / f.max) * 2.5));
    ctx.font = `700 ${f.size}px Cinzel, Georgia, serif`;
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.strokeText(f.text, f.x, f.y);
    ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}

function drawParticles(ctx, list) {
  for (const p of list) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    circ(ctx, p.x, p.y, p.size);
  }
  ctx.globalAlpha = 1;
}

function drawWeather(ctx, list, type) {
  for (const w of list) {
    switch (type) {
      case 'snow': ctx.fillStyle = 'rgba(255,255,255,0.85)'; circ(ctx, w.x, w.y, w.s); break;
      case 'leaves': ctx.fillStyle = w.c; ell(ctx, w.x, w.y, w.s * 1.6, w.s * 0.8, w.r); break;
      case 'embers': ctx.fillStyle = `rgba(255,${120 + (w.s * 30) | 0},40,${0.5 + 0.5 * Math.sin(w.r)})`; circ(ctx, w.x, w.y, w.s * 0.8); break;
      case 'fireflies': {
        const a = 0.4 + 0.6 * Math.abs(Math.sin(w.r));
        ctx.fillStyle = `rgba(220,255,120,${a * 0.25})`; circ(ctx, w.x, w.y, 6);
        ctx.fillStyle = `rgba(240,255,160,${a})`; circ(ctx, w.x, w.y, 1.6); break;
      }
      case 'dust': ctx.fillStyle = 'rgba(255,240,210,0.35)'; ctx.fillRect(w.x, w.y, w.s * 6, 1.2); break;
      case 'rain': ctx.strokeStyle = 'rgba(200,220,255,0.45)'; ctx.lineWidth = 1.2; line(ctx, w.x, w.y, w.x - 4, w.y + 12); break;
    }
  }
}

function drawLevelUp(ctx, x, gy, k) {
  const a = Math.min(1, k);
  const g = ctx.createLinearGradient(0, 0, 0, gy);
  g.addColorStop(0, 'rgba(255,220,100,0)'); g.addColorStop(1, `rgba(255,220,100,${0.55 * a})`);
  ctx.fillStyle = g; ctx.fillRect(x - 40, 0, 80, gy);
  ctx.fillStyle = `rgba(255,240,170,${0.5 * a})`; ell(ctx, x, gy, 60, 12);
}

// ---------------------------------------------------------------------
//  Mounts (drawn facing right under the hero) and companion pets
// ---------------------------------------------------------------------
function drawMount(ctx, x, gy, t, m, walking) {
  const ph = t * (walking ? 13 : 3);
  const sw = walking ? Math.sin(ph) * 0.55 : 0;
  const bob = walking ? Math.abs(Math.sin(ph)) * 2.5 : 0;
  ctx.save();
  ctx.translate(x, gy);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ell(ctx, 0, 0, 46, 7);
  ctx.scale(-1.05, 1.05);   // drawn facing left like the enemies, mirrored to face right
  ctx.translate(0, -bob);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const C = m.color, A = m.accent;
  const leg = (x0, a, col, len) => { ctx.strokeStyle = col; ctx.lineWidth = 7; line(ctx, x0, -40, x0 + Math.sin(a) * len, -40 + Math.cos(a) * len); };
  const hooves = pts => { if (m.fire) { ctx.fillStyle = A; for (const [px, py] of pts) circ(ctx, px, py, 4 + Math.sin(t * 20 + px) * 1.5); } };
  if (m.shape === 'raptor' || m.shape === 'mech') {
    const mech = m.shape === 'mech';
    // two legs, bird-like
    for (const [x0, a] of [[-4, sw], [10, -sw]]) {
      ctx.strokeStyle = mech ? A : C; ctx.lineWidth = mech ? 4 : 7;
      const kx = x0 + Math.sin(a) * 14 + 6, fx = x0 + Math.sin(a) * 20;
      ctx.beginPath(); ctx.moveTo(x0, -48); ctx.lineTo(kx, -26); ctx.lineTo(fx, -2); ctx.stroke();
      ctx.lineWidth = 3; line(ctx, fx, -2, fx - 8, -1);
    }
    if (mech) {
      ctx.fillStyle = A; rr(ctx, -26, -76, 52, 28, 12); ctx.fill();
      ctx.fillStyle = C; rr(ctx, -22, -74, 44, 20, 10); ctx.fill();
      ctx.fillStyle = 'rgba(160,220,255,0.6)'; ell(ctx, -18, -82, 12, 8);
      ctx.fillStyle = A; poly(ctx, [-26, -66, -46, -62, -26, -58]);
      ctx.fillStyle = '#ffd23a'; circ(ctx, -30, -70, 2.5);
      ctx.strokeStyle = A; ctx.lineWidth = 3; line(ctx, 24, -66, 40, -74);
      if (m.barding) { ctx.fillStyle = m.barding; ctx.fillRect(-20, -60, 40, 4); }
    } else {
      ctx.strokeStyle = C; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(26, -56); ctx.quadraticCurveTo(48, -54, 62, -66 + Math.sin(ph * 0.5) * 3); ctx.stroke();
      ctx.fillStyle = C; ell(ctx, 0, -56, 32, 15, -0.12);
      ctx.fillStyle = A; ell(ctx, 2, -66, 20, 5, -0.12);
      if (m.barding) { ctx.fillStyle = m.barding; rr(ctx, -16, -70, 34, 14, 5); ctx.fill(); }
      ctx.strokeStyle = C; ctx.lineWidth = 10; line(ctx, -24, -62, -36, -86);
      ctx.fillStyle = C; ell(ctx, -44, -90, 14, 8, 0.15);
      ctx.fillStyle = '#1b1410'; circ(ctx, -46, -94, 2);
      ctx.strokeStyle = '#f2ead6'; ctx.lineWidth = 1.5; line(ctx, -56, -86, -50, -85);
      ctx.fillStyle = A; for (let k = 0; k < 3; k++) poly(ctx, [-30 + k * 6, -92 + k * 6, -24 + k * 6, -100 + k * 6, -22 + k * 6, -88 + k * 6]);
    }
  } else {
    const big = m.shape === 'kodo' ? 1.2 : 1;
    ctx.scale(big, big);
    leg(-24, -sw, A, 38); leg(26, sw, A, 38);
    hooves([[-24 - sw * 20, -2], [26 + sw * 20, -2]]);
    // tail
    ctx.strokeStyle = m.shape === 'skeletal' ? A : C; ctx.lineWidth = m.shape === 'saber' ? 5 : 7;
    ctx.beginPath(); ctx.moveTo(38, -52);
    if (m.shape === 'saber') ctx.quadraticCurveTo(64, -50, 60, -74 + Math.sin(ph * 0.6) * 4);
    else ctx.quadraticCurveTo(52, -48, 50 + Math.sin(ph * 0.6) * 3, -30);
    ctx.stroke();
    // body
    ctx.fillStyle = C; ell(ctx, 0, -50, 42, m.shape === 'kodo' ? 22 : 17);
    if (m.shape === 'ram') { ctx.fillStyle = shade(C, 1.15); for (let k = 0; k < 6; k++) circ(ctx, -26 + k * 10, -62 + (k % 2) * 4, 9); }
    if (m.shape === 'saber') { ctx.fillStyle = A; for (let k = 0; k < 5; k++) ctx.fillRect(-20 + k * 10, -64, 4, 18); }
    if (m.shape === 'skeletal') { ctx.strokeStyle = shade(C, 0.6); ctx.lineWidth = 2.5; for (let k = 0; k < 5; k++) line(ctx, -18 + k * 9, -64, -16 + k * 9, -38); }
    if (m.barding) { ctx.fillStyle = m.barding; rr(ctx, -30, -66, 60, 22, 6); ctx.fill(); ctx.fillStyle = 'rgba(255,220,120,0.6)'; ctx.fillRect(-30, -48, 60, 3); }
    leg(-32, sw, C, 38); leg(18, -sw, C, 38);
    hooves([[-32 + sw * 20, -2], [18 - sw * 20, -2]]);
    // neck and head
    ctx.fillStyle = C;
    if (m.shape === 'horse' || m.shape === 'skeletal') {
      poly(ctx, [-26, -64, -44, -98, -34, -102, -14, -60]);
      ctx.save(); ctx.translate(-48, -98); ctx.rotate(0.5); ell(ctx, 0, 0, 16, 8); ctx.restore();
      ctx.fillStyle = A; poly(ctx, [-30, -100, -14, -66, -22, -64, -38, -98]);   // mane
      ctx.fillStyle = m.shape === 'skeletal' ? '#7ad8ff' : '#1b1410'; circ(ctx, -46, -102, m.shape === 'skeletal' ? 3 : 2);
      ctx.fillStyle = A; poly(ctx, [-38, -106, -34, -116, -32, -104]);
    } else if (m.shape === 'kodo') {
      ell(ctx, -46, -50, 18, 15);
      ctx.strokeStyle = '#e8dcc4'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-50, -60); ctx.quadraticCurveTo(-66, -70, -60, -84); ctx.stroke();
      ctx.fillStyle = '#1b1410'; circ(ctx, -54, -54, 2.2);
    } else {
      // ram, saber, wolf: head on a short neck
      ell(ctx, -42, -62, 15, 13); ell(ctx, -56, -56, 10, 7);
      ctx.fillStyle = '#1b1410'; circ(ctx, -64, -57, 2.2);
      ctx.fillStyle = m.shape === 'saber' ? '#c8ff7a' : '#1b1410'; circ(ctx, -48, -66, 2.4);
      if (m.shape === 'ram') { ctx.strokeStyle = A; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(-38, -70, 9, Math.PI * 0.9, Math.PI * 2.4); ctx.stroke(); }
      else { ctx.fillStyle = A; poly(ctx, [-44, -72, -38, -88, -32, -72]); }
    }
  }
  ctx.restore();
}

function drawCompanion(ctx, x, gy, t, p, walking) {
  const ph = t * (walking ? 12 : 3);
  ctx.save();
  ctx.translate(x, gy);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const C = p.color, A = p.accent;
  const flyer = p.shape === 'bird' || p.shape === 'whelp';
  ctx.fillStyle = 'rgba(0,0,0,0.2)'; ell(ctx, 0, 0, flyer ? 8 : 14, 3);
  switch (p.shape) {
    case 'bird': case 'whelp': {
      ctx.translate(0, -58 + Math.sin(t * 3) * 6);
      const flap = Math.sin(t * 16) * 0.8, whelp = p.shape === 'whelp';
      ctx.fillStyle = whelp ? A : shade(C, 0.8);
      ctx.save(); ctx.rotate(-0.3 - flap * 0.5); poly(ctx, [0, -2, 6, -18, 12, -2]); ctx.restore();
      ctx.fillStyle = C; ell(ctx, 0, 0, 10, 7);
      ctx.fillStyle = whelp ? C : A; circ(ctx, 9, -5, 5);
      ctx.fillStyle = '#1b1410'; circ(ctx, 11, -6, 1.2);
      ctx.fillStyle = whelp ? C : '#e8a030'; poly(ctx, [13, -5, 18, -3, 13, -2]);
      ctx.save(); ctx.rotate(0.3 + flap * 0.5); ctx.fillStyle = whelp ? A : C; poly(ctx, [0, -2, -6, -16, -10, 0]); ctx.restore();
      if (whelp) { ctx.strokeStyle = C; ctx.lineWidth = 3; line(ctx, -9, 1, -18, 4 + Math.sin(t * 5) * 2); }
      else { ctx.fillStyle = A; poly(ctx, [-9, 0, -16, -2, -14, 4]); }
      break;
    }
    case 'cat':
      ctx.scale(-0.34, 0.34);
      drawQuad(ctx, { color: C, accent: A, stripes: p.stripes, eye: '#c8ff5a' }, ph, walking);
      break;
    case 'rabbit': {
      ctx.translate(0, walking ? -Math.abs(Math.sin(ph * 0.7)) * 8 : 0);
      ctx.fillStyle = C; ell(ctx, 0, -7, 9, 7); circ(ctx, 8, -12, 5);
      ctx.fillStyle = A; ell(ctx, 7, -21, 2, 6); ell(ctx, 10, -21, 2, 6);
      ctx.fillStyle = '#1b1410'; circ(ctx, 10, -13, 1.2);
      ctx.fillStyle = '#ffffff'; circ(ctx, -9, -8, 3);
      break;
    }
    case 'chicken': {
      const peck = walking ? Math.sin(ph) * 2 : Math.max(0, Math.sin(t * 4)) * 4;
      ctx.fillStyle = C; ell(ctx, 0, -12, 9, 8);
      ctx.fillStyle = A; ell(ctx, -2, -12, 5, 4);
      ctx.fillStyle = C; circ(ctx, 7, -20 + peck, 5);
      ctx.fillStyle = '#e83a2a'; circ(ctx, 7, -26 + peck, 2.5);
      ctx.fillStyle = '#e8a030'; poly(ctx, [11, -21 + peck, 15, -19 + peck, 11, -18 + peck]);
      ctx.strokeStyle = '#e8a030'; ctx.lineWidth = 2; line(ctx, -2, -4, -2, 0); line(ctx, 3, -4, 3, 0);
      break;
    }
    case 'snake': {
      ctx.strokeStyle = C; ctx.lineWidth = 5; ctx.beginPath();
      for (let k = 0; k <= 10; k++) { const xx = -20 + k * 3.5, yy = -3 + Math.sin(k * 0.9 + t * 6) * 3; if (k) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy); }
      ctx.stroke();
      ctx.fillStyle = C; ell(ctx, 18, -6, 5, 4); ctx.fillStyle = A; circ(ctx, 20, -7, 1.2);
      break;
    }
    case 'bug':
      ctx.fillStyle = C; ell(ctx, 0, -4, 8, 4); ctx.fillStyle = A; ell(ctx, 7, -4, 3, 3);
      ctx.strokeStyle = A; ctx.lineWidth = 1; for (let k = -1; k <= 1; k++) line(ctx, k * 4, -2, k * 4 + Math.sin(ph + k) * 2, 1);
      line(ctx, 9, -6, 15, -10);
      break;
    case 'mech': {
      const st = walking ? Math.sin(ph) * 3 : 0;
      ctx.strokeStyle = A; ctx.lineWidth = 2; line(ctx, -4, -6, -4 + st, 0); line(ctx, 4, -6, 4 - st, 0);
      ctx.fillStyle = C; rr(ctx, -9, -20, 18, 14, 4); ctx.fill();
      ctx.fillStyle = A; circ(ctx, 6, -16, 2.5);
      ctx.strokeStyle = C; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-9, -14); ctx.quadraticCurveTo(-18, -18, -14, -28); ctx.stroke();
      break;
    }
    case 'bomb':
      ctx.translate(0, walking ? -Math.abs(Math.sin(ph)) * 4 : 0);
      ctx.fillStyle = C; circ(ctx, 0, -9, 9);
      ctx.strokeStyle = '#8a7a5a'; ctx.lineWidth = 2; line(ctx, 3, -17, 7, -22);
      ctx.fillStyle = Math.sin(t * 20) > 0 ? '#ffd23a' : A; circ(ctx, 8, -23, 2.5);
      ctx.fillStyle = '#ffffff'; circ(ctx, 3, -11, 1.5);
      break;
    case 'ooze':
      ctx.fillStyle = C; ell(ctx, 0, -6, 11, 6 + Math.sin(t * 4) * 1.5);
      ctx.fillStyle = A; circ(ctx, -3, -8, 1.5); circ(ctx, 3, -8, 1.5);
      break;
    case 'spider':
      ctx.scale(-0.3, 0.3); drawSpider(ctx, { color: C, accent: A }, ph, walking);
      break;
  }
  ctx.restore();
}
