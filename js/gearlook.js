// =====================================================================
//  The Leveling Road — what gear looks like
//  Every armor piece belongs to a "set": armor type × where it came from
//  (zone or dungeon) × quality. All Common cloth from the Burning Steppes
//  looks the same; Rare plate from Scholomance looks different from Rare
//  plate from Stratholme. Looks get grander with quality (Poor → Epic) and
//  with the level of the place it came from (tier 0–4).
//  The painters draw on the pixel grid (PX) used by the pixel-art canvas.
// =====================================================================
'use strict';

// Logical units per screen pixel on the current canvas (set by the renderer; 1 = smooth)
let PX = 1;

// main = signature colour, second = secondary cloth/leather, metal = trim metal, accent = gems/glow, motif = decoration
const GEAR_THEMES = {
  starter:    { main: '#7a6a5a', second: '#5a4a3a', metal: '#8a8a8a', accent: '#a89a7a', motif: null },
  elwynn:     { main: '#2a4ab0', second: '#e8e0c8', metal: '#c8a24a', accent: '#ffd23a', motif: 'crest' },
  dunmorogh:  { main: '#4a6a8a', second: '#8a5a3a', metal: '#a8b0b8', accent: '#7ad8ff', motif: 'fur' },
  teldrassil: { main: '#5a3a8a', second: '#2a5a3a', metal: '#b8c8d8', accent: '#c8a8ff', motif: 'leaf' },
  durotar:    { main: '#a02a1a', second: '#6a4a2a', metal: '#7a6a5a', accent: '#e8c050', motif: 'tusk' },
  mulgore:    { main: '#7a5a2a', second: '#c8a050', metal: '#8a7a5a', accent: '#3a8ad8', motif: 'feather' },
  tirisfal:   { main: '#3a3a4a', second: '#5a6a3a', metal: '#7a7a8a', accent: '#9aff5a', motif: 'skull' },
  westfall:   { main: '#a83228', second: '#6a4a2a', metal: '#8a8a8a', accent: '#e8d8a0', motif: 'bandana' },
  barrens:    { main: '#a8783a', second: '#5a3a1a', metal: '#8a7a6a', accent: '#c82a2a', motif: 'tusk' },
  duskwood:   { main: '#3a3a4a', second: '#6a4a7a', metal: '#8a8a9a', accent: '#b08aff', motif: 'skull' },
  ashenvale:  { main: '#3a5a3a', second: '#5a3a6a', metal: '#b8c8d8', accent: '#7aff9a', motif: 'leaf' },
  stv:        { main: '#3a6a2a', second: '#d8cca0', metal: '#a8844a', accent: '#e84a2a', motif: 'tooth' },
  tanaris:    { main: '#d8b070', second: '#2a9a9a', metal: '#c8a24a', accent: '#2ad8d8', motif: 'scarab' },
  ungoro:     { main: '#5a8a2a', second: '#d87a2a', metal: '#8a7a5a', accent: '#ffd23a', motif: 'spike' },
  steppes:    { main: '#2a2226', second: '#a83a1a', metal: '#4a4a52', accent: '#ff7a1a', motif: 'flame' },
  // dungeons
  rfc:        { main: '#6a1a1a', second: '#3a2a2a', metal: '#5a4a4a', accent: '#ff6a1a', motif: 'flame' },
  wc:         { main: '#2a6a3a', second: '#6a8a3a', metal: '#7a8a6a', accent: '#9aff6a', motif: 'leaf' },
  deadmines:  { main: '#a01e1e', second: '#3a2a1a', metal: '#7a7a7a', accent: '#ffd23a', motif: 'bandana' },
  sfk:        { main: '#3a3a4a', second: '#2a2a2a', metal: '#9aa0b0', accent: '#7ad8ff', motif: 'fur' },
  bfd:        { main: '#2a5a7a', second: '#1a3a4a', metal: '#7aa8b8', accent: '#5ae8ff', motif: 'scale' },
  rfk:        { main: '#7a5a3a', second: '#4a3a1a', metal: '#8a7a5a', accent: '#c8e04a', motif: 'tusk' },
  gnomeregan: { main: '#5a6a72', second: '#a83228', metal: '#a8b0b8', accent: '#7aff9a', motif: 'gear' },
  smgy:       { main: '#b01e1e', second: '#e8e0d0', metal: '#c8c8d0', accent: '#ffd23a', motif: 'crest' },
  smlib:      { main: '#b01e1e', second: '#e8e0d0', metal: '#c8c8d0', accent: '#ffd23a', motif: 'crest' },
  smarm:      { main: '#b01e1e', second: '#e8e0d0', metal: '#c8c8d0', accent: '#ffd23a', motif: 'crest' },
  smcath:     { main: '#b01e1e', second: '#f2ece0', metal: '#e0c060', accent: '#ffd23a', motif: 'crest' },
  rfd:        { main: '#4a4a5a', second: '#8a8a6a', metal: '#9aa0a8', accent: '#7ad8ff', motif: 'skull' },
  uldaman:    { main: '#6a6a72', second: '#a8844a', metal: '#a8a0b0', accent: '#7ad8ff', motif: 'rune' },
  zf:         { main: '#2a6a7a', second: '#c8a050', metal: '#c8a24a', accent: '#e84a2a', motif: 'tooth' },
  mara:       { main: '#5a3a6a', second: '#3a6a3a', metal: '#8a8a6a', accent: '#c8ff5a', motif: 'leaf' },
  brd:        { main: '#2a2224', second: '#8a2a1a', metal: '#3a3a40', accent: '#ff6a1a', motif: 'flame' },
  lbrs:       { main: '#3a2a2a', second: '#6a1a1a', metal: '#5a5a5a', accent: '#ff4a1a', motif: 'spike' },
  scholo:     { main: '#3a2a4a', second: '#d8d0b8', metal: '#8a8a9a', accent: '#b08aff', motif: 'skull' },
  strat:      { main: '#7a1a1a', second: '#c8c8d0', metal: '#d8d8e0', accent: '#ffd23a', motif: 'crest' },
};

// ---------- colour helpers ----------
function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function rgbHex(r, g, b) { return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
function mixC(a, b, t) { const A = hexRgb(a), B = hexRgb(b); return rgbHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); }
function litC(a, k) { const A = hexRgb(a); return rgbHex(A[0] * k, A[1] * k, A[2] * k); }
function satC(a, k) { const A = hexRgb(a), g = (A[0] + A[1] + A[2]) / 3; return rgbHex(g + (A[0] - g) * k, g + (A[1] - g) * k, g + (A[2] - g) * k); }

// Level tier of a source (0–4), from its level range
function srcTier(src) {
  const z = ZONES.find(x => x.id === src) || (typeof dungeonById !== 'undefined' && dungeonById(src));
  if (!z) return 0;
  return Math.max(0, Math.min(4, Math.floor(((z.min + z.max) / 2 - 1) / 12)));
}
// Zone on a route whose levels contain an item level (for items from before sources existed)
function srcForLevel(ilvl, zones) {
  const list = zones || ZONES;
  const z = list.find(z => ilvl >= z.min && ilvl <= z.max) || list.slice().sort((a, b) => Math.abs((a.min + a.max) / 2 - ilvl) - Math.abs((b.min + b.max) / 2 - ilvl))[0];
  return z ? z.id : 'starter';
}

// ---------- the sets ----------
const GEAR_SET_CACHE = {};
// Base material colour per armor type
const MATERIAL = { cloth: null, leather: '#6a4a2a', mail: '#8a8e96', plate: '#a8aeb8' };

function gearSet(it) {
  if (!it || !it.atype) return null;
  const src = GEAR_THEMES[it.src] ? it.src : 'starter';
  const key = it.atype + ':' + src + ':' + it.q;
  if (GEAR_SET_CACHE[key]) return GEAR_SET_CACHE[key];
  const th = GEAR_THEMES[src], type = it.atype, q = it.q, raid = !!th.raid;
  // Raid loot and tier sets count as the highest tier and get grander shapes
  const tier = src === 'starter' ? 0 : (raid || /^t[0-3]_/.test(src)) ? 4 : srcTier(src);
  // Body colour: cloth takes the theme colour, leather is brown tinted by it, mail and plate are metal with the theme as cloth parts
  let base = type === 'cloth' ? th.main : type === 'leather' ? mixC(MATERIAL.leather, th.main, 0.2) : mixC(MATERIAL[type], th.metal, type === 'mail' ? 0.3 : 0.2);
  if (type === 'mail') base = litC(base, 0.85);
  let second = type === 'cloth' ? th.second : th.main;
  let trim = q >= 3 ? th.metal : q >= 2 ? th.second : litC(base, 0.75);
  if (q >= 3 && (type === 'mail' || type === 'plate')) trim = mixC(th.metal, '#ffd76a', 0.45);
  // Quality: poor is drab, common is muted, rare and epic are rich
  if (q === 0) { base = litC(satC(base, 0.25), 0.75); second = litC(satC(second, 0.25), 0.75); trim = litC(satC(trim, 0.2), 0.7); }
  else if (q === 1) { base = mixC(base, '#7a6e60', 0.4); second = mixC(second, '#6a6052', 0.45); }
  else if (q === 4) { base = satC(base, 1.25); second = satC(second, 1.2); }
  // Higher level gear gets slightly richer colours
  base = satC(base, 0.9 + tier * 0.05);
  const s = {
    key, type, q, tier, src, motif: q >= 2 ? th.motif : null,
    c: { base, dark: litC(base, 0.68), light: mixC(base, '#ffffff', 0.25), second, secondDark: litC(second, 0.7), trim, metal: th.metal, accent: th.accent, glow: th.accent },
    gems: q >= 3, glow: q >= 4 || raid, cloak: q >= 3 ? (q >= 4 ? th.main : litC(th.main, 0.8)) : null,
    patched: q === 0,
    // shapes grow with tier and quality
    padR: 8 + tier * 1.5 + Math.max(0, q - 1) * 1.6 + (type === 'plate' ? 3 : type === 'mail' ? 1.5 : 0) + (raid ? 3 : 0),
    layers: type === 'cloth' ? 0 : Math.min(3, Math.floor((tier + Math.max(0, q - 1)) / 2)),
    spikes: type === 'cloth' ? 0 : Math.min(5, (raid ? 1 : 0) + Math.max(0, tier - 2) + (q >= 4 ? 2 : q >= 3 ? 1 : 0) + (th.motif === 'spike' && q >= 2 ? 1 : 0)),
    // Poor and Common gear gets the plainer helm of the tier below, Epic the grander one above
    helm: HELM_SHAPES[type][Math.max(0, Math.min(4, tier + (q <= 1 ? -1 : q >= 4 ? 1 : 0)))],
    surcoat: (type === 'mail' || type === 'plate') && q >= 2,
  };
  GEAR_SET_CACHE[key] = s;
  return s;
}
const HELM_SHAPES = {
  cloth:   ['band', 'hood', 'circlet', 'cowl', 'tallhood'],
  leather: ['cap', 'cap', 'maskhood', 'hornhood', 'skullmask'],
  mail:    ['coif', 'nasal', 'coifhelm', 'winged', 'crestwing'],
  plate:   ['kettle', 'barbute', 'greathelm', 'horned', 'crowned'],
};

// ---------- pixel drawing helpers ----------
const snap = v => Math.round(v / PX) * PX;
function pxRect(ctx, x, y, w, h) { const X = snap(x), Y = snap(y); ctx.fillRect(X, Y, Math.max(PX, snap(x + w) - X), Math.max(PX, snap(y + h) - Y)); }
function pxDot(ctx, x, y, n) { const s = (n || 1) * PX; ctx.fillRect(snap(x), snap(y), s, s); }
// Chain-link dither over a rectangle
function pxChain(ctx, x, y, w, h, col) {
  ctx.fillStyle = col;
  const step = Math.max(2, PX) * 2;
  for (let yy = 0; yy < h; yy += step) for (let xx = (yy / step) % 2 ? step / 2 : 0; xx < w; xx += step) pxDot(ctx, x + xx, y + yy);
}
const pulse = t => 0.65 + 0.35 * Math.sin(t * 4);

// Small motif decorations (helms, shoulders, chests)
function drawMotif(ctx, s, x, y, k, t) {
  const c = s.c;
  switch (s.motif) {
    case 'feather': ctx.fillStyle = c.accent; poly(ctx, [x, y, x - 3 * k, y - 12 * k, x + 2 * k, y - 1]); ctx.fillStyle = '#f2ead6'; poly(ctx, [x + 2, y, x + 1, y - 9 * k, x + 4 * k, y]); break;
    case 'tooth': case 'tusk': ctx.fillStyle = '#f2ead6'; poly(ctx, [x - 2 * k, y, x, y - 7 * k, x + 2 * k, y]); break;
    case 'skull': ctx.fillStyle = '#e8e0cc'; pxRect(ctx, x - 3 * k, y - 3 * k, 6 * k, 5 * k); ctx.fillStyle = '#1b1410'; pxDot(ctx, x - 2 * k, y - 2 * k); pxDot(ctx, x + k, y - 2 * k); break;
    case 'flame': ctx.fillStyle = mixC(c.accent, '#ffd23a', 0.3); poly(ctx, [x - 3 * k, y, x, y - (8 + Math.sin(t * 9) * 2) * k, x + 3 * k, y]); ctx.fillStyle = c.accent; poly(ctx, [x - 2 * k, y, x, y - 4 * k, x + 2 * k, y]); break;
    case 'leaf': ctx.fillStyle = mixC(c.accent, '#3a8a3a', 0.5); poly(ctx, [x - 4 * k, y, x, y - 6 * k, x + 4 * k, y, x, y + 2 * k]); break;
    case 'crest': ctx.fillStyle = c.trim; poly(ctx, [x - 3 * k, y - 3 * k, x + 3 * k, y - 3 * k, x + 3 * k, y + k, x, y + 4 * k, x - 3 * k, y + k]); ctx.fillStyle = c.accent; pxDot(ctx, x - PX / 2, y - k); break;
    case 'scarab': ctx.fillStyle = c.accent; ell(ctx, x, y, 3 * k, 4 * k); ctx.fillStyle = litC(c.accent, 0.6); pxRect(ctx, x - 0.5, y - 3 * k, 1, 6 * k); break;
    case 'gear': ctx.fillStyle = c.metal; circ(ctx, x, y, 3.5 * k); ctx.fillStyle = c.accent; circ(ctx, x, y, 1.5 * k); break;
    case 'scale': ctx.fillStyle = c.accent; for (let i = 0; i < 3; i++) circ(ctx, x - 3 * k + i * 3 * k, y, 1.6 * k); break;
    case 'rune': ctx.fillStyle = c.accent; pxRect(ctx, x - k, y - 4 * k, 2 * k, 8 * k); pxRect(ctx, x - 3 * k, y - k, 6 * k, 2 * k); break;
    case 'bandana': ctx.fillStyle = '#a01e1e'; poly(ctx, [x - 4 * k, y - 2 * k, x + 4 * k, y - 2 * k, x, y + 4 * k]); break;
    case 'spike': ctx.fillStyle = c.metal; poly(ctx, [x - 2 * k, y, x, y - 7 * k, x + 2 * k, y]); break;
    case 'fur': ctx.fillStyle = '#c8b8a0'; for (let i = -1; i <= 1; i++) circ(ctx, x + i * 3 * k, y, 2.2 * k); break;
  }
}
function drawGem(ctx, s, x, y, r, t) {
  if (!s.gems) return;
  if (s.glow) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
    g.addColorStop(0, hexA(s.c.glow, 0.7 * pulse(t))); g.addColorStop(1, hexA(s.c.glow, 0));
    ctx.fillStyle = g; circ(ctx, x, y, r * 3);
  }
  ctx.fillStyle = s.c.accent; pxRect(ctx, x - r, y - r, r * 2, r * 2);
  ctx.fillStyle = '#ffffff'; pxDot(ctx, x - r, y - r);
}

// ---------- painters (character faces right; coordinates as in drawCharacter) ----------
// Head: returns true if the hair is covered
function drawGearHead(ctx, s, hx, hy, r, t) {
  const c = s.c, k = 1;
  ctx.fillStyle = c.base;
  let covered = true;
  switch (s.helm) {
    case 'band':
      covered = false;
      pxRect(ctx, hx - r, hy - r * 0.55, r * 2, 3 * PX);
      ctx.fillStyle = c.trim; pxRect(ctx, hx - r, hy - r * 0.55, r * 2, PX);
      break;
    case 'circlet':
      covered = false;
      ctx.fillStyle = c.metal; pxRect(ctx, hx - r, hy - r * 0.6, r * 2, 2 * PX);
      drawGem(ctx, Object.assign({}, s, { gems: true }), hx + r * 0.5, hy - r * 0.6, 1.6, t);
      break;
    case 'hood': case 'cowl': case 'tallhood': case 'maskhood': case 'hornhood': {
      const tall = s.helm === 'tallhood' ? 10 : 0;
      ctx.beginPath(); ctx.moveTo(hx - r - 4, hy + r * 0.9);
      ctx.quadraticCurveTo(hx - r - 6, hy - r - 6 - tall, hx - 2, hy - r - 4 - tall);
      ctx.quadraticCurveTo(hx + r + 4, hy - r - 2, hx + r + 3, hy - 2);
      ctx.lineTo(hx + r * 0.2, hy - 3); ctx.lineTo(hx - r * 0.3, hy + r * 0.9); ctx.closePath(); ctx.fill();
      ctx.fillStyle = c.dark; pxRect(ctx, hx - r - 3, hy - r * 0.2, 3 * PX, r * 1.1);
      if (s.helm !== 'hood') { ctx.fillStyle = c.trim; ctx.beginPath(); ctx.moveTo(hx + r + 3, hy - 2); ctx.lineTo(hx + r * 0.2, hy - 3); ctx.lineTo(hx + r * 0.25, hy - 3 + PX); ctx.lineTo(hx + r + 3, hy - 2 + PX); ctx.fill(); }
      if (s.helm === 'maskhood' || s.helm === 'hornhood') { ctx.fillStyle = c.dark; pxRect(ctx, hx, hy + 2, r + 3, 5); }
      if (s.helm === 'hornhood') { ctx.fillStyle = c.metal; poly(ctx, [hx - 6, hy - r - 2, hx - 16, hy - r - 16, hx - 2, hy - r - 4]); poly(ctx, [hx + 4, hy - r - 3, hx + 10, hy - r - 16, hx + 8, hy - r - 2]); }
      if (s.helm === 'tallhood') { ctx.fillStyle = c.trim; pxRect(ctx, hx - 4, hy - r - 6 - tall, 3 * PX, 3 * PX); }
      break;
    }
    case 'cap':
      ctx.beginPath(); ctx.arc(hx, hy - 2, r + 1, Math.PI * 1.02, Math.PI * 1.98); ctx.fill();
      ctx.fillStyle = c.dark; pxRect(ctx, hx - r - 1, hy - 3, (r + 1) * 2, 2 * PX);
      covered = true;
      break;
    case 'skullmask':
      ctx.fillStyle = '#e8e0cc'; ctx.beginPath(); ctx.arc(hx, hy - 1, r + 2, Math.PI * 0.75, Math.PI * 2.25); ctx.fill();
      ctx.fillStyle = '#1b1410'; pxRect(ctx, hx + r * 0.25, hy - 3, 4, 3); pxRect(ctx, hx + r * 0.25, hy + 4, r * 0.8, 2);
      ctx.fillStyle = c.base; poly(ctx, [hx - 4, hy - r - 1, hx - 14, hy - r - 18, hx, hy - r - 3]);
      break;
    case 'coif': case 'nasal': case 'coifhelm': case 'winged': case 'crestwing':
      ctx.beginPath(); ctx.arc(hx - 1, hy, r + 3, Math.PI * 0.62, Math.PI * 2.08); ctx.fill();
      pxChain(ctx, hx - r - 1, hy - r, r * 1.6, r * 1.8, c.dark);
      if (s.helm !== 'coif') {
        ctx.fillStyle = s.helm === 'nasal' ? c.base : c.trim;
        ctx.beginPath(); ctx.arc(hx, hy - 3, r + 2, Math.PI, 0); ctx.fill();
        ctx.fillStyle = c.trim; pxRect(ctx, hx + r * 0.5, hy - 4, 2 * PX, 10);
      }
      if (s.helm === 'winged' || s.helm === 'crestwing') {
        ctx.fillStyle = c.second;
        poly(ctx, [hx - r + 2, hy - r + 2, hx - r - 16, hy - r - 14, hx - r - 4, hy - r - 4, hx - r - 14, hy - r - 2, hx - r, hy - 4]);
      }
      if (s.helm === 'crestwing') { ctx.fillStyle = c.accent; poly(ctx, [hx - 6, hy - r - 2, hx + 2, hy - r - 14, hx + 4, hy - r - 2]); }
      break;
    case 'kettle': case 'barbute': case 'greathelm': case 'horned': case 'crowned':
      ctx.fillStyle = c.base;
      ctx.beginPath(); ctx.arc(hx, hy - 1, r + 3, Math.PI, 0); ctx.fill();
      if (s.helm === 'kettle') { ctx.fillStyle = c.dark; pxRect(ctx, hx - r - 7, hy - 3, (r + 7) * 2, 2 * PX); covered = false; break; }
      pxRect(ctx, hx - r - 3, hy - 2, (r + 3) * 2, r + 6);
      ctx.fillStyle = c.dark; pxRect(ctx, hx - r - 3, hy + r + 2, (r + 3) * 2, PX);
      // visor slit and breaths
      ctx.fillStyle = '#120c0a'; pxRect(ctx, hx + r * 0.1, hy - 2, r + 3, 2 * PX);
      if (s.helm !== 'barbute') { ctx.fillStyle = c.dark; for (let i = 0; i < 3; i++) pxDot(ctx, hx + r * 0.4 + i * 2 * PX, hy + 5); }
      ctx.fillStyle = c.trim; pxRect(ctx, hx - PX, hy - r - 3, 2 * PX, r + 2);
      if (s.helm === 'horned') { ctx.fillStyle = '#e8dcc0'; ctx.beginPath(); ctx.moveTo(hx - 4, hy - r); ctx.quadraticCurveTo(hx - 22, hy - r - 4, hx - 20, hy - r - 20); ctx.quadraticCurveTo(hx - 14, hy - r - 6, hx, hy - r + 2); ctx.fill(); }
      if (s.helm === 'crowned') {
        ctx.fillStyle = c.trim; for (let i = 0; i < 4; i++) poly(ctx, [hx - r + i * 6, hy - r - 1, hx - r + 3 + i * 6, hy - r - 9, hx - r + 6 + i * 6, hy - r - 1]);
        drawGem(ctx, s, hx + 1, hy - r - 3, 1.6, t);
      }
      break;
  }
  if (s.motif && s.tier >= 1 && s.helm !== 'band' && s.helm !== 'circlet') drawMotif(ctx, s, hx - r * 0.7, hy - r * 0.8, 0.8, t);
  if (s.gems && s.helm !== 'circlet' && s.helm !== 'crowned') drawGem(ctx, s, hx + r * 0.3, hy - r * 0.55, 1.4, t);
  if (s.patched) { ctx.fillStyle = litC(c.base, 1.3); pxRect(ctx, hx - r * 0.6, hy - r * 0.6, 3 * PX, 2 * PX); }
  return covered;
}

// Pauldron at (x, y)
function drawGearShoulder(ctx, s, x, y, t) {
  const c = s.c, r = s.padR;
  if (s.type === 'cloth') {
    // soft mantle drooping over the arm
    ctx.fillStyle = c.base; ctx.beginPath(); ctx.ellipse(x, y + 2, r + 2, r * 0.7, 0, Math.PI, 0); ctx.lineTo(x + r + 2, y + 2 + r * 0.6); ctx.lineTo(x - r - 2, y + 2 + r * 0.6); ctx.fill();
    ctx.fillStyle = c.trim; pxRect(ctx, x - r - 2, y + 1 + r * 0.6, (r + 2) * 2, PX * (s.q >= 2 ? 2 : 1));
    if (s.tier >= 2) { ctx.fillStyle = c.second; for (let i = -1; i <= 1; i++) pxRect(ctx, x + i * r * 0.6, y + 2 + r * 0.6, PX, 4 + s.tier); }
  } else {
    ctx.fillStyle = c.dark; circ(ctx, x, y, r + 1);
    ctx.fillStyle = c.base; circ(ctx, x, y - 1, r);
    // shade band: lower half of the pauldron
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.arc(x, y - 1, r, 0.15, Math.PI - 0.15); ctx.fill();
    if (s.type === 'mail') pxChain(ctx, x - r * 0.7, y - r * 0.5, r * 1.4, r, c.dark);
    if (s.type === 'leather') { ctx.fillStyle = c.second; pxRect(ctx, x - r, y, r * 2, 2 * PX); }
    // layered bands
    for (let i = 0; i < s.layers; i++) { ctx.fillStyle = i % 2 ? c.dark : c.trim; pxRect(ctx, x - r + 1, y + 2 + i * 3, (r - 1) * 2, PX); }
    // rim
    if (s.q >= 2) { ctx.fillStyle = c.trim; ctx.beginPath(); ctx.arc(x, y - 1, r, Math.PI * 1.05, Math.PI * 1.95); ctx.lineTo(x + r * 0.9, y - 1 + PX); ctx.arc(x, y - 1, r - PX, Math.PI * 1.95, Math.PI * 1.05, true); ctx.fill(); }
    // spikes
    ctx.fillStyle = s.type === 'leather' ? '#e8dcc0' : c.metal;
    for (let i = 0; i < s.spikes; i++) { const a = -Math.PI / 2 - 0.5 + i * 0.5; const bx = x + Math.cos(a) * r, by = y - 1 + Math.sin(a) * r; poly(ctx, [bx - 2, by + 1, bx + Math.cos(a) * (6 + s.tier), by + Math.sin(a) * (6 + s.tier), bx + 2, by + 1]); }
  }
  if (s.motif && s.tier >= 1) drawMotif(ctx, s, x, y + 1, 0.9, t);
  else if (s.gems) drawGem(ctx, s, x, y, 1.6, t);
  // Epic: a glowing rim
  if (s.glow && s.type !== 'cloth') { ctx.strokeStyle = hexA(c.glow, 0.45 + 0.4 * Math.sin(t * 3)); ctx.lineWidth = PX; ctx.beginPath(); ctx.arc(x, y - 1, r + PX, Math.PI * 1.02, Math.PI * 1.98); ctx.stroke(); }
  if (s.patched) { ctx.fillStyle = litC(c.base, 1.3); pxRect(ctx, x - 2, y - 1, 3 * PX, 2 * PX); }
}

// Cloak behind the body
function drawGearCloak(ctx, s, W, topY, hipY, leg, t, walking) {
  if (!s.cloak) return;
  const sway = Math.sin(t * 3) * 3 + (walking ? 6 : 0);
  ctx.fillStyle = s.cloak; poly(ctx, [-W / 2 + 2, topY + 4, W / 2 - 6, topY + 4, -W / 2 - 4 - sway, hipY + leg * 0.75, -W / 2 - 16 - sway, hipY + leg * 0.6]);
  ctx.fillStyle = s.glow ? hexA(s.c.glow, 0.6 + 0.3 * Math.sin(t * 3)) : s.c.trim;
  ctx.beginPath(); ctx.moveTo(-W / 2 - 4 - sway, hipY + leg * 0.75); ctx.lineTo(-W / 2 - 16 - sway, hipY + leg * 0.6); ctx.lineTo(-W / 2 - 16 - sway, hipY + leg * 0.6 - PX * 2); ctx.lineTo(-W / 2 - 4 - sway, hipY + leg * 0.75 - PX * 2); ctx.fill();
}

// Torso piece
function drawGearChest(ctx, s, W, topY, hipY, torso, t, tabard) {
  const c = s.c;
  ctx.fillStyle = c.base; rr(ctx, -W / 2, topY, W, torso + 4, 7); ctx.fill();
  switch (s.type) {
    case 'cloth':
      ctx.fillStyle = c.second; pxRect(ctx, -W * 0.12, topY + 4, W * 0.24, torso);
      if (s.q >= 2) { ctx.fillStyle = c.trim; pxRect(ctx, -W * 0.12, topY + 4, PX, torso); pxRect(ctx, W * 0.12 - PX, topY + 4, PX, torso); }
      ctx.fillStyle = c.dark; pxRect(ctx, -W / 2 + 2, topY + 2, W - 4, 3 * PX);   // collar
      break;
    case 'leather':
      ctx.fillStyle = c.dark; pxRect(ctx, -W / 2, topY + torso * 0.45, W, PX);
      if (s.q >= 2) { ctx.strokeStyle = c.second; ctx.lineWidth = 3; line(ctx, -W / 2 + 3, topY + 4, W / 2 - 3, hipY - 8); line(ctx, W / 2 - 3, topY + 4, -W / 2 + 3, hipY - 8); }
      if (s.q >= 3) { ctx.fillStyle = c.metal; for (let i = 0; i < 4; i++) pxDot(ctx, -W / 2 + 4 + i * (W - 8) / 3, topY + torso * 0.3); }
      if (s.motif === 'fur' || s.tier >= 3) { ctx.fillStyle = '#c8b8a0'; for (let i = 0; i < 5; i++) circ(ctx, -W / 2 + 3 + i * (W - 6) / 4, topY + 2, 3); }
      break;
    case 'mail':
      pxChain(ctx, -W / 2 + 2, topY + 3, W - 4, torso - 2, c.dark);
      if (s.q >= 2) { ctx.fillStyle = c.second; rr(ctx, -W * 0.22, topY + 8, W * 0.44, torso - 6, 3); ctx.fill(); ctx.fillStyle = c.trim; pxRect(ctx, -W * 0.22, topY + 8, W * 0.44, PX); }
      break;
    case 'plate':
      if (s.surcoat) { ctx.fillStyle = c.second; pxRect(ctx, -W * 0.2, topY + torso * 0.5, W * 0.4, torso * 0.55); }
      ctx.fillStyle = c.light; pxRect(ctx, -W / 2 + 3, topY + 3, W * 0.35, torso * 0.4);
      ctx.fillStyle = c.dark;
      for (let i = 0; i < 2 + Math.min(2, s.tier); i++) pxRect(ctx, -W / 2 + 2, topY + torso * 0.5 + i * 5, W - 4, PX);
      pxRect(ctx, -PX / 2, topY + 4, PX, torso * 0.45);   // ridge
      if (s.q >= 3) { ctx.fillStyle = c.trim; pxRect(ctx, -W / 2 + 1, topY + 1, W - 2, PX); pxRect(ctx, -W / 2 + 1, topY + torso * 0.48, W - 2, PX); }
      break;
  }
  if (tabard) { ctx.fillStyle = tabard; rr(ctx, -W * 0.25, topY + 6, W * 0.5, torso, 3); ctx.fill(); ctx.fillStyle = c.trim; pxRect(ctx, -W * 0.25, topY + 6, W * 0.5, PX); }
  else if (s.motif && s.q >= 2 && s.type !== 'cloth') drawMotif(ctx, s, W * 0.1, topY + torso * 0.3, 1, t);
  if (s.gems) drawGem(ctx, s, 0, topY + torso * 0.3 + (tabard ? 4 : 0), 2, t);
  if (s.glow) {   // epic runes
    ctx.fillStyle = hexA(s.c.glow, 0.5 + 0.4 * Math.sin(t * 3));
    for (let i = 0; i < 3; i++) pxRect(ctx, -W / 2 + 4 + i * (W - 8) / 2, topY + torso * 0.7, PX, 3 * PX);
  }
  if (s.patched) { ctx.fillStyle = litC(c.base, 1.3); pxRect(ctx, W * 0.1, topY + torso * 0.55, 4 * PX, 3 * PX); ctx.fillStyle = c.dark; pxDot(ctx, -W * 0.3, topY + torso * 0.3, 2); }
}

// Skirt below the chest (cloth robes, mail skirts, plate tassets); drawn before the torso
function drawGearSkirt(ctx, s, W, hipY, leg, step) {
  const c = s.c;
  if (s.type === 'cloth') {
    const len = leg - 6;
    ctx.fillStyle = c.base; poly(ctx, [-W / 2 + 2, hipY - 6, W / 2 - 2, hipY - 6, W / 2 + 8 + step * 3, hipY - 6 + len, -W / 2 - 8 - step * 3, hipY - 6 + len]);
    ctx.fillStyle = c.second; poly(ctx, [-3, hipY - 6, 3, hipY - 6, 6, hipY - 9 + len, -6, hipY - 9 + len]);
    ctx.fillStyle = c.trim; pxRect(ctx, -W / 2 - 8 - step * 3, hipY - 9 + len, W + 16 + step * 6, (s.q >= 2 ? 2 : 1) * PX);
    if (s.glow) { ctx.fillStyle = hexA(c.glow, 0.6); pxRect(ctx, -W / 2 - 6, hipY - 12 + len, W + 12, PX); }
    return true;   // covers the legs
  }
  if (s.type === 'mail' || (s.type === 'plate' && s.tier >= 1) || (s.type === 'leather' && s.tier >= 2)) {
    const len = s.type === 'mail' ? leg * 0.45 : leg * 0.32;
    ctx.fillStyle = s.type === 'mail' ? c.base : c.dark;
    poly(ctx, [-W / 2 + 1, hipY - 6, W / 2 - 1, hipY - 6, W / 2 + 3, hipY - 6 + len, -W / 2 - 3, hipY - 6 + len]);
    if (s.type === 'mail') pxChain(ctx, -W / 2 + 2, hipY - 4, W - 4, len - 2, c.dark);
    else { ctx.fillStyle = c.trim; pxRect(ctx, -W / 2 - 3, hipY - 6 + len - PX, W + 6, PX); ctx.fillStyle = c.base; pxRect(ctx, -PX, hipY - 6, 2 * PX, len); }
    // Surcoat flap in the theme colour hanging between the legs
    if (s.surcoat) { ctx.fillStyle = c.second; poly(ctx, [-W * 0.18, hipY - 6, W * 0.18, hipY - 6, W * 0.14 + step * 2, hipY + leg * 0.62, -W * 0.14 + step * 2, hipY + leg * 0.62]); ctx.fillStyle = c.trim; pxRect(ctx, -W * 0.14 + step * 2, hipY + leg * 0.62 - PX, W * 0.28, PX); }
  }
  return false;
}

// Legs: colours for the leg strokes, then knee guards
function gearLegColor(s) { return s.type === 'cloth' ? s.c.dark : s.type === 'leather' ? s.c.base : s.c.base; }
function drawGearKnee(ctx, s, x, y) {
  const c = s.c;
  if (s.type === 'plate') { ctx.fillStyle = c.light; circ(ctx, x, y, 4 + s.tier * 0.4); ctx.fillStyle = c.trim; pxDot(ctx, x - PX / 2, y - PX / 2); }
  else if (s.type === 'mail') { ctx.fillStyle = c.dark; pxRect(ctx, x - 4, y - 1, 8, PX); pxRect(ctx, x - 4, y + 3, 8, PX); }
  else if (s.type === 'leather' && s.q >= 2) { ctx.fillStyle = c.second; pxRect(ctx, x - 4, y - 2, 8, 2 * PX); }
}
// Boot / sabaton with its sole at (x, y)
function drawGearFoot(ctx, s, x, y) {
  const c = s.c;
  const big = s.type === 'plate' ? 3 : s.type === 'mail' ? 2 : 0;
  ctx.fillStyle = c.dark; rr(ctx, x - 8 - big / 2, y - 9 - big, 16 + big, 9 + big, 3); ctx.fill();
  ctx.fillStyle = c.base; pxRect(ctx, x - 7, y - 9 - big, 13, 3 * PX);
  if (s.type === 'plate' && s.tier >= 2) { ctx.fillStyle = c.metal; poly(ctx, [x + 8, y - 6, x + 14 + s.tier, y - 2, x + 8, y - 1]); }
  if (s.type === 'leather') { ctx.fillStyle = c.second; pxRect(ctx, x - 7, y - 5, 12, PX); }
  if (s.q >= 3) { ctx.fillStyle = c.trim; pxRect(ctx, x - 8, y - 2, 16 + big, PX); }
}
// Glove / gauntlet at the hand
function drawGearHand(ctx, s, x, y) {
  const c = s.c, r = s.type === 'plate' ? 6 : s.type === 'mail' ? 5.5 : 5;
  ctx.fillStyle = c.base; circ(ctx, x, y, r);
  ctx.fillStyle = c.dark; pxRect(ctx, x - r, y - 1, r * 2, PX);
  if (s.q >= 3) { ctx.fillStyle = c.trim; pxRect(ctx, x - r, y - r + 1, r * 2, PX); }
}
// Bracer: a band on the forearm just above the hand
function drawGearWrist(ctx, s, x, y) {
  const c = s.c;
  ctx.fillStyle = c.base; pxRect(ctx, x - 5, y - 4, 10, 4 * PX);
  ctx.fillStyle = s.q >= 3 ? c.trim : c.dark; pxRect(ctx, x - 5, y - 4, 10, PX);
}
// Belt
function drawGearWaist(ctx, s, W, hipY, t) {
  const c = s.c;
  ctx.fillStyle = s.type === 'cloth' ? c.second : c.dark; pxRect(ctx, -W / 2, hipY - 7, W, 6);
  const b = 3 + s.tier * 0.8;
  ctx.fillStyle = s.q >= 2 ? c.metal : litC(c.dark, 1.3); pxRect(ctx, -b, hipY - 6 - b / 2 + 2, b * 2, b + 1);
  if (s.type === 'leather') { ctx.fillStyle = c.base; pxRect(ctx, -W / 2 + 2, hipY - 4, 5, 6); }   // pouch
  if (s.type === 'cloth' && s.tier >= 1) { ctx.fillStyle = c.second; pxRect(ctx, -W / 2 + 4, hipY - 2, 2 * PX, 8 + s.tier * 2); }   // sash tail
  if (s.gems) drawGem(ctx, s, 0, hipY - 5, 1.4, t);
}
// Epic aura: a few motes rising around the character
function drawGearAura(ctx, s, W, topY, t) {
  if (!s || !s.glow) return;
  const g = ctx.createRadialGradient(0, topY + 20, 4, 0, topY + 20, W * 1.6);
  g.addColorStop(0, hexA(s.c.glow, 0.16 + 0.06 * Math.sin(t * 2))); g.addColorStop(1, hexA(s.c.glow, 0));
  ctx.fillStyle = g; ctx.fillRect(-W * 1.6, topY - 30, W * 3.2, -topY + 34);
  for (let i = 0; i < 8; i++) {
    const a = t * 0.8 + i * 1.3, y = -((t * 22 + i * 37) % 110);
    ctx.fillStyle = hexA(s.c.glow, 0.75 * (1 + y / 110));
    pxDot(ctx, Math.sin(a) * (W * 0.8), y - 6, 1 + (i % 2));
  }
}
// Does this helm hide the hair?
const gearHeadCovers = s => !['band', 'circlet', 'kettle'].includes(s.helm);
// Theme colours for a weapon or off-hand (grip and gem match the zone's armor)
const gearTheme = it => it && it.src && GEAR_THEMES[it.src] && it.q >= 2 ? GEAR_THEMES[it.src] : null;
