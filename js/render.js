// =====================================================================
//  Ironvale Idle — canvas drawing (background, hero, enemies, effects)
//  All drawing happens in "world units": 320 units tall, width varies.
// =====================================================================
'use strict';

function hash(i, s) { const x = Math.sin(i * 127.1 + (s || 0) * 311.7) * 43758.5453; return x - Math.floor(x); }
function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
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

function drawBackground(ctx, G, z) {
  const W = G.W, H = G.H, gy = G.groundY, p = z.palette, cam = G.cam;

  const sky = ctx.createLinearGradient(0, 0, 0, gy);
  sky.addColorStop(0, p.skyTop);
  sky.addColorStop(1, p.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, gy + 2);

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
  if (z.id !== 'ashen') {
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    const span = W + 300;
    for (let i = 0; i < 4; i++) {
      const cx = ((hash(i, 1) * span - cam * 0.04 - G.t * 6) % span + span) % span - 150;
      const cy = 40 + hash(i, 2) * 60;
      ell(ctx, cx, cy, 46, 12); ell(ctx, cx + 22, cy - 8, 26, 12); ell(ctx, cx - 18, cy - 5, 20, 9);
    }
  }

  hills(ctx, W, cam * 0.12, 182, 26, p.far, gy, 1);
  hills(ctx, W, cam * 0.3, 214, 16, p.near, gy, 4);

  // Scenery
  const par = 0.65, sp = 150, off = cam * par;
  const i0 = Math.floor(off / sp) - 2, i1 = i0 + Math.ceil(W / sp) + 4;
  for (let i = i0; i < i1; i++) {
    if (hash(i, 3) < 0.3) continue;
    const type = z.deco[Math.floor(hash(i, 5) * z.deco.length)];
    const x = i * sp - off + hash(i, 7) * 70;
    drawDeco(ctx, type, x, gy - 3, 0.7 + hash(i, 9) * 0.55, p, G.t);
  }

  // Ground
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
  }
  ctx.restore();
}

// ---------------------------------------------------------------------
//  Hero (a classic plate-wearing warrior with sword & shield)
// ---------------------------------------------------------------------
function swordAngle(sw) {
  if (sw < 0) return 0.22;
  if (sw < 0.28) return 0.22 + (-0.75 - 0.22) * (sw / 0.28);
  if (sw < 0.5) return -0.75 + (2.15 + 0.75) * ((sw - 0.28) / 0.22);
  return 2.15 + (0.22 - 2.15) * ((sw - 0.5) / 0.5);
}

function drawHero(ctx, x, gy, t, walking, swing, mighty, hurt, gear) {
  ctx.save();
  ctx.translate(x, gy);

  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ell(ctx, 0, 0, 34, 7);

  const ph = t * 11;
  const step = walking ? Math.sin(ph) : 0;
  const bob = walking ? Math.abs(Math.sin(ph)) * 3 : Math.sin(t * 2) * 1.2;
  const shake = hurt > 0 ? Math.sin(t * 80) * hurt * 2 : 0;
  ctx.translate(shake, -bob);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  const plate = gear.chest ? '#9aa6b2' : '#8a6a4a';
  const plateDark = gear.chest ? '#6b7682' : '#5f4630';
  const legsC = gear.legs ? '#7b8692' : '#4a3424';

  // Legs
  ctx.strokeStyle = legsC; ctx.lineWidth = 10;
  line(ctx, -5, -50, -8 + step * 12, -6);
  line(ctx, 5, -50, 8 - step * 12, -6);
  ctx.fillStyle = gear.feet ? '#4b4f57' : '#3a2a1c';
  rr(ctx, -16 + step * 12, -9, 16, 9, 3); ctx.fill();
  rr(ctx, 0 - step * 12, -9, 16, 9, 3); ctx.fill();

  // Shield (back arm)
  ctx.strokeStyle = plateDark; ctx.lineWidth = 8;
  line(ctx, -10, -92, -16, -72);
  ctx.fillStyle = '#6a3e1e'; circ(ctx, -16, -70, 19);
  ctx.strokeStyle = '#c9a64a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(-16, -70, 17, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#c9a64a'; circ(ctx, -16, -70, 5);

  // Torso
  ctx.fillStyle = plate; rr(ctx, -16, -104, 32, 58, 7); ctx.fill();
  ctx.fillStyle = '#a3282a'; rr(ctx, -8, -98, 16, 54, 3); ctx.fill();
  ctx.fillStyle = '#e1b84a'; ctx.fillRect(-8, -98, 16, 3); ctx.fillRect(-2, -88, 4, 14); ctx.fillRect(-6, -83, 12, 4);
  ctx.fillStyle = '#3e2a1a'; ctx.fillRect(-16, -56, 32, 6);
  ctx.fillStyle = '#d9b04a'; ctx.fillRect(-3, -56, 6, 6);

  // Head
  ctx.fillStyle = '#e2b48c'; circ(ctx, 2, -120, 15);
  ctx.fillStyle = '#6b4a2f'; ctx.beginPath(); ctx.moveTo(-6, -114); ctx.quadraticCurveTo(2, -98, 15, -112); ctx.lineTo(14, -118); ctx.lineTo(-6, -118); ctx.fill();
  if (gear.head) {
    ctx.fillStyle = '#8a95a1'; ctx.beginPath(); ctx.arc(2, -122, 17, Math.PI, 0); ctx.fill();
    ctx.fillRect(-15, -124, 34, 5);
    ctx.fillStyle = '#6b7682'; ctx.fillRect(10, -124, 4, 14);
    ctx.fillStyle = '#c23a2a'; ctx.beginPath(); ctx.moveTo(-6, -138); ctx.quadraticCurveTo(-24, -150, -26, -126); ctx.quadraticCurveTo(-16, -138, -4, -134); ctx.fill();
  } else {
    ctx.fillStyle = '#6b4a2f'; ctx.beginPath(); ctx.arc(2, -124, 15, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
  }
  ctx.fillStyle = '#1b1410'; circ(ctx, 8, -121, 1.8);

  // Pauldron
  ctx.fillStyle = plateDark; circ(ctx, 12, -98, 10);
  ctx.fillStyle = plate; circ(ctx, 12, -100, 8);

  // Sword arm
  const a = swordAngle(swing);
  const shX = 12, shY = -96;
  const hx = shX + Math.sin(a) * 24, hy = shY - Math.cos(a) * 24 + 26;
  ctx.strokeStyle = gear.hands ? '#7b8692' : '#e2b48c'; ctx.lineWidth = 8;
  line(ctx, shX, shY, hx, hy);

  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(a);
  if (swing >= 0.28 && swing < 0.6) {
    ctx.fillStyle = mighty ? 'rgba(255,90,40,0.35)' : 'rgba(255,255,255,0.22)';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 84, -Math.PI / 2 - 1.6, -Math.PI / 2); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = '#4a2e1a'; ctx.fillRect(-2.5, -2, 5, 14);
  ctx.fillStyle = '#d9b04a'; ctx.fillRect(-11, -6, 22, 5); circ(ctx, 0, 14, 3.5);
  const blade = gear.weapon ? 66 + Math.min(18, gear.weaponTier * 5) : 0;
  if (blade) {
    ctx.fillStyle = mighty && swing >= 0 ? '#ffb08a' : '#dfe6ee';
    ctx.beginPath(); ctx.moveTo(-5, -6); ctx.lineTo(-5, -6 - blade); ctx.lineTo(0, -14 - blade); ctx.lineTo(5, -6 - blade); ctx.lineTo(5, -6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(0, -6 - blade, 5, blade);
    if (gear.weaponQ >= 3) { ctx.fillStyle = gear.weaponQ === 4 ? 'rgba(181,92,255,0.5)' : 'rgba(45,140,255,0.45)'; ctx.fillRect(-1.5, -10 - blade, 3, blade); }
  }
  ctx.restore();

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
  ctx.fillStyle = d.weapon === 'staff' ? '#ff5a2a' : '#1b1410'; circ(ctx, 7, -113, 2);
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
