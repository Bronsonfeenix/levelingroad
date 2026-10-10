// =====================================================================
//  The Leveling Road — game logic, combat, saving and UI
// =====================================================================
'use strict';

// ---------- helpers ----------
const $ = (s, r = document) => r.querySelector(s);
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function fmt(n) {
  n = Math.floor(n);
  if (n < 1e5) return n.toLocaleString('en-US');
  const u = ['K', 'M', 'B', 'T']; let i = -1;
  while (n >= 1000 && i < 3) { n /= 1000; i++; }
  return n.toFixed(n < 10 ? 2 : n < 100 ? 1 : 0) + u[i];
}
function moneyParts(c) { c = Math.floor(c); return [Math.floor(c / 10000), Math.floor(c / 100) % 100, c % 100]; }
function moneyHTML(c) {
  const [g, s, cp] = moneyParts(c); let h = '';
  if (g) h += `<span class="coin g">${fmt(g)}</span>`;
  if (g || s) h += `<span class="coin s">${s}</span>`;
  return h + `<span class="coin c">${cp}</span>`;
}
function moneyText(c) {
  const [g, s, cp] = moneyParts(c);
  return [g && fmt(g) + 'g', (g || s) && s + 's', cp + 'c'].filter(Boolean).join(' ');
}
function timeText(sec) {
  sec = Math.floor(sec);
  const h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60, s = sec % 60;
  return h ? `${h}h ${m}m` : m ? `${m}m ${s}s` : `${s}s`;
}
const pct = v => (v * 100).toFixed(1) + '%';
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

// ---------- state ----------
let S = null;      // saved state (null while creating a character)
let STATS = null;  // cached derived stats
let ABIL = null;   // cached ability list for the current race + class
let GRANTS = null; // cached set of talent-granted ability ids

const G = {        // runtime-only state
  canvas: null, ctx: null, W: 800, H: 320, scale: 1, groundY: 268, heroX: 110,
  t: 0, cam: 0, walking: true, last: 0,
  enemy: null, spawnTimer: 0.8, swing: 0.5, heroSwing: -1, heroBig: false, shoot: -1, wandFx: 0, tapCd: 0, hurt: 0,
  gcd: 0, cast: null, cds: {}, buffs: [], procs: {}, proj: [], petAtk: 1.5, petAnim: 0,
  dead: false, deadTimer: 0, levelFx: 0,
  fct: [], particles: [], weather: [], weatherType: null,
  tab: 'character', tree: 0, talSel: null, dirty: true, refreshT: 0, saveT: 0, selected: null, hud: {},
  create: null,
};

function freshState() {
  return {
    version: 2, name: '', faction: 'alliance', race: 'human', cls: 'warrior',
    level: 1, xp: 0, copper: 0, hp: -1, mana: -1, res: 0, combo: 0,
    equipment: { weapon: null, head: null, chest: null, hands: null, legs: null, feet: null },
    bag: [], prof: {}, talents: {}, spells: {},
    zoneId: null, autoZone: true, autoSell: 1, numbers: true, autoTrain: true,
    kills: 0, elites: 0, deaths: 0, earned: 0, playTime: 0,
    rate: { xp: 0, copper: 0, kills: 0, time: 0 },
    lastSeen: Date.now(), nextId: 1, log: [], welcomed: false,
  };
}

function load() {
  try {
    const raw = localStorage.getItem(CONFIG.SAVE_KEY);
    if (raw) { const d = JSON.parse(raw); if (validSave(d)) { applySave(d); return true; } }
  } catch (e) { console.warn('Could not load save', e); }
  S = null;
  return false;
}
function validSave(d) { return d && typeof d.level === 'number' && CLASSES[d.cls] && RACES.some(r => r.id === d.race); }

function applySave(d) {
  const f = freshState();
  S = Object.assign(f, d);
  S.equipment = Object.assign(f.equipment, d.equipment || {});
  S.rate = Object.assign({ xp: 0, copper: 0, kills: 0, time: 0 }, d.rate || {});
  if (!zonesForChar().some(z => z.id === S.zoneId)) S.zoneId = race().start;
  resetRuntime();
}

function resetRuntime() {
  STATS = null; ABIL = null; GRANTS = null;
  Object.assign(G, { enemy: null, dead: false, cast: null, cds: {}, buffs: [], procs: {}, proj: [], gcd: 0, spawnTimer: 1, weather: [] });
}

function save() {
  if (!S) return;
  S.lastSeen = Date.now();
  try { localStorage.setItem(CONFIG.SAVE_KEY, JSON.stringify(S)); } catch (e) { console.warn('Save failed', e); }
}

// ---------- lookups ----------
const cls = () => CLASSES[S.cls];
const race = () => RACES.find(r => r.id === S.race);
const prof = id => S.prof[id] || 0;
const trees = () => TALENT_TREES[S.cls];
const tRank = id => S.talents[id] || 0;
function invalidate() { STATS = null; GRANTS = null; }

function zonesForChar() { return ZONES.filter(z => z.races ? z.races.includes(S.race) : (z.faction === 'both' || z.faction === S.faction)); }
const zone = () => ZONES.find(z => z.id === S.zoneId) || ZONES.find(z => z.id === race().start);

function abilities() {
  const key = S.cls + S.race;
  if (ABIL && ABIL.key === key) return ABIL.list;
  const list = [...(race().abilities || []).map(a => Object.assign({ racial: true }, a)), ...cls().abilities];
  ABIL = { key, list };
  return list;
}
const abById = id => abilities().find(a => a.id === id);

// ---------- talents ----------
function talentById(id) { for (const tr of trees()) { const t = tr.talents.find(x => x.id === id); if (t) return t; } return null; }
function treePoints(i) { return trees()[i].talents.reduce((a, t) => a + tRank(t.id), 0); }
function spentPoints() { return Object.values(S.talents).reduce((a, b) => a + b, 0); }
function talentPoints() { return Math.max(0, S.level - CONFIG.TALENT_START + 1) - spentPoints(); }
function specIndex() { let best = -1, bp = 0; for (let i = 0; i < 3; i++) { const p = treePoints(i); if (p > bp) { bp = p; best = i; } } return best; }
function specName() { const i = specIndex(); return i < 0 ? null : trees()[i].name; }
function talentGrants() {
  if (GRANTS) return GRANTS;
  GRANTS = new Set();
  for (const tr of trees()) for (const t of tr.talents) if (tRank(t.id) > 0 && t.fx.grants) GRANTS.add(t.fx.grants);
  return GRANTS;
}
function canLearnTalent(t) {
  if (S.level < CONFIG.TALENT_START || talentPoints() <= 0 || tRank(t.id) >= t.max) return false;
  if (treePoints(t.tree) < t.tier * 5) return false;
  if (t.req) { const r = talentById(t.req); if (tRank(t.req) < r.max) return false; }
  return true;
}

// ---------- spells & ranks ----------
function knownRanks(ab) {
  if (!ab) return 0;
  if (ab.talent) return talentGrants().has(ab.id) ? Math.max(1, S.spells[ab.id] || 0) : 0;
  return S.level >= ab.learn ? (S.spells[ab.id] || 0) : 0;
}
function nextRankLevel(ab) {
  const k = knownRanks(ab);
  if (ab.talent && !k) return null;
  return k >= ab.ranks.length ? null : ab.ranks[k];
}
const canTrain = ab => { const lv = nextRankLevel(ab); return lv != null && lv <= S.level; };
function rankFactor(ab) {
  const k = knownRanks(ab);
  if (!k || ab.ranks.length <= 1) return 1;
  const lv = ab.ranks[k - 1];
  return clamp(0.6 + 0.4 * (lv + 8) / (S.level + 8), 0.6, 1);
}
function abName(ab) {
  if (!ab.names) return ab.name;
  const lv = ab.ranks[Math.max(1, knownRanks(ab)) - 1];
  let n = ab.name;
  for (const [l, nm] of ab.names) if (lv >= l) n = nm;
  return n;
}
function trainAbility(ab, quiet) {
  if (!canTrain(ab)) return false;
  const lv = nextRankLevel(ab), cost = trainCost(lv);
  if (S.copper < cost) return false;
  S.copper -= cost;
  S.spells[ab.id] = knownRanks(ab) + 1;
  if (!quiet) log(`You have learned <b>${esc(abName(ab))}</b> (Rank ${S.spells[ab.id]}).`, 'sys');
  invalidate(); markDirty();
  return true;
}
function trainableList() {
  return abilities().filter(canTrain).sort((a, b) => nextRankLevel(a) - nextRankLevel(b));
}
function autoTrain() {
  let n = 0, guard = 200;
  while (guard-- > 0) {
    const ab = trainableList()[0];
    if (!ab || !trainAbility(ab, true)) break;
    n++;
  }
  if (n) log(`Your trainer taught you ${n} new spell rank${n > 1 ? 's' : ''}.`, 'sys');
  return n;
}

// ---------- forms, auras & pets ----------
function isCat() { return S.cls === 'druid' && S.level >= 20 && specIndex() === 1 && knownRanks(abById('cat_form')) > 0; }
function hasForm(name) { if (name === 'cat') return isCat(); const ab = abById(name); return !!ab && knownRanks(ab) > 0; }
function auraActive(ab) {
  if (ab.kind !== 'aura' || !knownRanks(ab)) return false;
  if (ab.form === 'cat' && !isCat()) return false;
  if (ab.form === 'caster' && isCat()) return false;
  if (ab.replacedBy && knownRanks(abById(ab.replacedBy))) return false;
  return true;
}
function petKind() {
  if (S.cls === 'hunter') return knownRanks(abById('call_pet')) ? 'beast' : null;
  if (S.cls === 'warlock') {
    const sac = abById('demonic_sacrifice');
    if (sac && auraActive(sac)) return null;
    if (knownRanks(abById('summon_voidwalker'))) return 'voidwalker';
    if (knownRanks(abById('summon_imp'))) return 'imp';
  }
  return null;
}
function petDef() {
  const k = petKind();
  if (k === 'beast') return { kind: k, name: (HUNTER_PETS[S.race] || HUNTER_PETS.orc).name, def: HUNTER_PETS[S.race] || HUNTER_PETS.orc };
  if (k === 'imp') return { kind: k, name: 'Imp' };
  if (k === 'voidwalker') return { kind: k, name: 'Voidwalker' };
  return null;
}
function resType() { return isCat() ? 'energy' : cls().resource; }

// ---------- effects (talents, racials, auras, buffs) ----------
function newFx() { return { stat: {}, school: {}, critSchool: {}, critMultSchool: {}, vs: {}, ab: {} }; }
function weaponMatch(fam) {
  const w = S.equipment.weapon;
  if (!w || !w.wtype) return false;
  const WT = WEAPON_TYPES[w.wtype];
  if (fam === '1h') return WT.hands === 1;
  if (fam === '2h') return WT.hands === 2 && WT.family !== 'bow' && WT.family !== 'gun';
  return WT.family === fam;
}
function addFx(dst, src, k) {
  if (!src || !k) return;
  for (const key in src) {
    const v = src[key];
    if (key === 'grants' || key === 'flavor') continue;
    if (key === 'weapon') { for (const fam in v) if (weaponMatch(fam)) addFx(dst, v[fam], k); continue; }
    if (key === 'ab') {
      for (const id in v) { dst.ab[id] = dst.ab[id] || {}; for (const m in v[id]) dst.ab[id][m] = (dst.ab[id][m] || 0) + v[id][m] * k; }
      continue;
    }
    if (typeof v === 'object') { dst[key] = dst[key] || {}; for (const s in v) dst[key][s] = (dst[key][s] || 0) + v[s] * k; continue; }
    dst[key] = (dst[key] || 0) + v * k;
  }
}
function gatherFx() {
  const fx = newFx();
  addFx(fx, race().racial.fx, 1);
  for (const tr of trees()) for (const t of tr.talents) { const r = tRank(t.id); if (r) addFx(fx, t.fx, r); }
  for (const ab of abilities()) {
    if (!auraActive(ab)) continue;
    const m = fx.ab[ab.id] || {};
    addFx(fx, ab.fx, rankFactor(ab) * (1 + (m.dmg || 0)));
  }
  const pk = petKind();
  if (pk === 'voidwalker') addFx(fx, { dmgTaken: -0.1 }, 1);
  if (pk === 'imp') addFx(fx, { stat: { sta: 0.05 } }, 1);
  for (const b of G.buffs) if (b.fx) addFx(fx, b.fx, 1);
  return fx;
}

// ---------- derived stats ----------
function calc() {
  if (STATS) return STATS;
  const C = cls(), R = race(), L = S.level, fx = gatherFx();
  const f = k => fx[k] || 0;
  const st = {};
  let armor = 0;
  for (const k of STAT_KEYS) st[k] = C.base[k] + C.grow[k] * (L - 1) + ((R.stats || {})[k] || 0);
  for (const slot of SLOTS) {
    const it = S.equipment[slot];
    if (!it) continue;
    for (const k of STAT_KEYS) st[k] += it.stats[k] || 0;
    armor += it.armor || 0;
  }
  for (const k of STAT_KEYS) st[k] = Math.max(1, st[k] * (1 + (fx.stat[k] || 0)));
  if (S.cls === 'warlock' && knownRanks(abById('soul_link')) && !petKind()) fx.dmgTaken = (fx.dmgTaken || 0) + 0.2; // no demon, no link
  armor = armor * (1 + f('armor')) + st.agi * 2 + st.int * f('intArmor');

  const cat = isCat();
  const w = S.equipment.weapon;
  const off = S.equipment.offhand;
  // An off-hand weapon adds a share of its damage (dual wielding)
  const wdmg = (w ? w.dmg : 2 + L * 0.6) + (off && off.wtype ? off.dmg * 0.35 : 0);
  const main = cat ? 'str' : C.main;
  const H = (wdmg + st[main] * 0.45 + st.spi * f('spiritPower') * 0.45) * (1 + 0.06 * prof('blacksmithing'));
  const maxHp = Math.round((50 + st.sta * 9 + L * 6) * C.hpMult * (1 + 0.06 * prof('cooking') + f('hp')));
  const maxMana = C.resource === 'mana' ? Math.round((st.int * 15 + L * 12 + 40) * (1 + f('mana'))) : 0;
  const rt = cat ? 'energy' : C.resource;
  const maxRes = rt === 'mana' ? maxMana : 100 + (rt === 'energy' ? f('maxRes') : 0);
  const haste = (1 + 0.03 * prof('weaponskill')) * (1 + f('haste'));
  const baseSwing = cat ? 1.0 : C.swing;
  STATS = {
    ...Object.fromEntries(STAT_KEYS.map(k => [k, Math.round(st[k])])),
    fx, H, maxHp, maxMana, maxRes, rt, haste,
    armor: Math.round(armor),
    swing: baseSwing / haste,
    white: H * (baseSwing / 1.6) * 0.9 * (cat ? 1 : C.whiteMult || 1) * (1 + f('white')),
    wand: H * 0.45 * (1 + f('wand')),
    meleeCrit: Math.min(0.7, 0.05 + st.agi * 0.0006 + f('crit') + f('meleeCrit')),
    spellCrit: Math.min(0.7, 0.03 + st.int * 0.0005 + f('crit') + f('spellCrit')),
    dodge: Math.min(0.35, 0.03 + st.agi * 0.0002 + f('dodge')),
    dmgTaken: Math.max(0, 1 + f('dmgTaken')),
    regen: maxHp * 0.012 * (1 + 0.1 * prof('firstaid')) * (1 + f('regen')),
    manaRegen: maxMana * (0.012 + 0.016 * st.spi / (st.spi + st.int + 1)) * (1 + f('manaRegen')),
    xpMult: CONFIG.XP_RATE * (1 + 0.05 * prof('inn')) * (1 + f('xp')),
    goldMult: CONFIG.GOLD_RATE * (1 + 0.08 * prof('skinning')) * (1 + f('gold')),
    loot: (1 + 0.05 * prof('gathering')) * (1 + f('loot')),
    travel: (1 + 0.06 * prof('riding')) * (1 + f('travel')),
    instant: f('instant') > 0, free: f('free') > 0,
  };
  return STATS;
}
const fxv = (st, k) => st.fx[k] || 0;
function mitigation(armor, lv) { return armor / (armor + 85 * lv + 400); }

// ---------- items ----------
function rollQuality(elite) {
  const r = Math.random() * 100;
  if (elite) return r < 4 ? 4 : r < 30 ? 3 : 2;
  return r < 0.6 ? 4 : r < 5 ? 3 : r < 30 ? 2 : r < 72 ? 1 : 0;
}
function armorTypeFor(req) { const a = cls().armor; return req >= 40 ? a[1] : a[0]; }
function pickSuffix() {
  const w = cls().weights;
  const scored = SUFFIXES.map(s => { let v = 0; for (const k in s.stats) v += s.stats[k] * (w[k] || 0); return [s, Math.max(0.05, v) ** 2]; });
  let r = Math.random() * scored.reduce((a, b) => a + b[1], 0);
  for (const [s, v] of scored) { r -= v; if (r <= 0) return s; }
  return scored[0][0];
}

function pickItemSlot() {
  const opts = ITEM_SLOTS.filter(s => s !== 'offhand' || cls().offhands.length);
  let r = Math.random() * opts.reduce((a, s) => a + ITEM_SLOT_WEIGHT[s], 0);
  for (const s of opts) { r -= ITEM_SLOT_WEIGHT[s]; if (r <= 0) return s; }
  return opts[0];
}

// Shirts and tabards: cosmetic, no stats. They change the colours of your character.
function makeCosmetic(ilvl, q, slot) {
  const L = slot === 'shirt' ? SHIRTS : TABARDS, i = randi(0, L.names.length - 1);
  return { id: S.nextId++, slot, ilvl, q: Math.min(q, 2), req: 1, stats: {}, armor: 0, dmg: 0, name: L.names[i], color: L.colors[i], sell: Math.max(1, Math.round(ilvl * 2 + 5)) };
}

function makeItem(ilvl, q, slot) {
  slot = slot || pickItemSlot();
  if (slot === 'offhand' && !cls().offhands.length) slot = 'weapon';
  if (COSMETIC_SLOTS.includes(slot)) return makeCosmetic(ilvl, q, slot);
  if (JEWELRY[slot]) q = Math.max(q, 2); // rings, necklaces and trinkets always have stats
  const Q = QUALITIES[q];
  const tier = clamp(Math.floor((ilvl - 1) / 12), 0, 4);
  const req = Math.max(1, Math.min(CONFIG.LEVEL_CAP, ilvl - 2));
  const it = { id: S.nextId++, slot, ilvl, q, req, stats: {}, armor: 0, dmg: 0 };
  let base, plain, epics;
  if (slot === 'weapon') it.wtype = pick(cls().weapons);
  else if (slot === 'offhand') { const o = pick(cls().offhands); if (WEAPON_TYPES[o]) it.wtype = o; else it.otype = o; }
  if (it.wtype) {
    const WT = WEAPON_TYPES[it.wtype];
    base = plain = WT.bases[tier];
    it.dmg = Math.round((4 + 2.2 * ilvl) * Q.weaponMult * WT.dmg);
    epics = EPIC_WEAPONS[it.wtype] || EPIC_WEAPONS.sword;
  } else if (it.otype) {
    const OT = OFFHAND_TYPES[it.otype];
    base = plain = OT.bases[tier];
    if (OT.armor) it.armor = Math.round((ilvl * 3 + 5) * OT.armor * Q.armorMult * ARMOR_NORM);
    epics = EPIC_ARMOR[it.otype];
  } else if (JEWELRY[slot]) {
    base = plain = pick(JEWELRY[slot]);
    epics = EPIC_ARMOR[slot];
  } else {
    it.atype = armorTypeFor(req);
    const AT = ARMOR_TYPES[it.atype];
    base = AT.nouns[slot];
    plain = AT.mats[tier] + ' ' + base;
    it.armor = Math.round((ilvl * 3 + 5) * ARMOR_SLOT_FACTOR[slot] * Q.armorMult * AT.mult * ARMOR_NORM);
    epics = EPIC_ARMOR[slot];
  }
  let name;
  if (q === 0) name = pick(POOR_PREFIXES) + ' ' + plain;
  else if (q === 1) name = plain;
  else if (q === 4) name = pick(epics);
  else name = (q === 2 ? pick(GREEN_PREFIXES[tier]) : pick(RARE_PREFIXES)) + ' ' + base;
  if (Q.statMult > 0) {
    const budget = (ilvl * 0.55 + 2) * Q.statMult * STAT_SLOT_FACTOR[slot] * STAT_NORM;
    const sufs = q === 4 ? [pickSuffix(), pickSuffix()] : [pickSuffix()];
    for (const suf of sufs) for (const k in suf.stats) it.stats[k] = (it.stats[k] || 0) + Math.max(1, Math.round(budget * suf.stats[k] / sufs.length));
    if (q === 2) name += ' ' + sufs[0].name;
  }
  it.name = name;
  it.sell = Math.max(1, Math.round((ilvl * ilvl * 0.3 + ilvl * 3 + 3) * Q.sell));
  return it;
}

function giveStarterGear() {
  for (const s of cls().starter) {
    const it = { id: S.nextId++, slot: s.slot, ilvl: 1, req: 1, q: 1, name: s.name, stats: {}, sell: 3, armor: 0, dmg: 0 };
    if (s.slot === 'weapon') { it.wtype = s.wtype; it.dmg = Math.round(6 * WEAPON_TYPES[s.wtype].dmg); }
    else { it.atype = armorTypeFor(1); it.armor = Math.round(10 * ARMOR_TYPES[it.atype].mult); }
    S.equipment[s.slot] = it;
  }
}

function itemScore(it) {
  if (!it) return 0;
  const w = cls().weights;
  let s = (it.dmg || 0) * w.dmg * (it.slot === 'offhand' ? 0.35 : 1) + (it.armor || 0) * w.armor;
  for (const k of STAT_KEYS) s += (it.stats[k] || 0) * (w[k] || 0);
  return s;
}
const isTwoHand = it => !!it && it.slot === 'weapon' && !!it.wtype && WEAPON_TYPES[it.wtype].hands === 2;
// Which equipment slot an item would go into: an empty ring/trinket slot first, otherwise the weaker one
function targetSlot(it) {
  const slots = equipSlotsFor(it.slot);
  for (const s of slots) if (!S.equipment[s]) return s;
  return slots.reduce((a, b) => (itemScore(S.equipment[b]) < itemScore(S.equipment[a]) ? b : a));
}
function isUpgrade(it) {
  if (it.req > S.level) return false;
  if (COSMETIC_SLOTS.includes(it.slot)) return !S.equipment[it.slot];
  if (it.slot === 'offhand' && isTwoHand(S.equipment.weapon)) return false;
  const cur = itemScore(S.equipment[targetSlot(it)]);
  if (isTwoHand(it)) return itemScore(it) > cur + itemScore(S.equipment.offhand);
  return itemScore(it) > cur;
}
const itemTypeName = it => it.wtype ? WEAPON_TYPES[it.wtype].name : it.otype ? OFFHAND_TYPES[it.otype].name : it.atype ? ARMOR_TYPES[it.atype].name : COSMETIC_SLOTS.includes(it.slot) ? 'Cosmetic' : '';
const WEAPON_ICONS = { sword: '🗡️', axe: '🪓', mace: '🔨', dagger: '🔪', '2hsword': '⚔️', '2haxe': '🪓', '2hmace': '🔨', staff: '🪄', bow: '🏹', gun: '🔫', crossbow: '🏹' };
const SLOT_ICONS = { weapon: '🗡️', offhand: '🛡️', head: '⛑️', neck: '📿', shoulder: '🦺', chest: '🥋', shirt: '👕', tabard: '🎽', wrist: '⌚', hands: '🧤', waist: '🪢', legs: '👖', feet: '🥾',
  finger: '💍', finger1: '💍', finger2: '💍', trinket: '🧿', trinket1: '🧿', trinket2: '🧿' };
const itemIcon = it => (it.wtype && WEAPON_ICONS[it.wtype]) || (it.otype === 'held' ? '📖' : SLOT_ICONS[it.slot]);

function findItem(id) {
  id = +id;
  return S.bag.find(i => i.id === id) || SLOTS.map(s => S.equipment[s]).find(i => i && i.id === id);
}

function equip(id) {
  const it = S.bag.find(i => i.id === +id);
  if (!it) return;
  if (it.req > S.level) { toast(`Requires level ${it.req}`); return; }
  const slot = targetSlot(it);
  S.bag = S.bag.filter(i => i !== it);
  // A two-handed weapon and an off-hand can't be used together
  if (it.slot === 'offhand' && isTwoHand(S.equipment.weapon)) { S.bag.push(S.equipment.weapon); S.equipment.weapon = null; }
  if (isTwoHand(it) && S.equipment.offhand) { S.bag.push(S.equipment.offhand); S.equipment.offhand = null; }
  const old = S.equipment[slot];
  if (old) S.bag.push(old);
  S.equipment[slot] = it;
  if (G.selected === it.id) G.selected = old ? old.id : null;
  invalidate(); markDirty();
}

function unequip(slot) {
  const it = S.equipment[slot];
  if (!it) return;
  if (S.bag.length >= CONFIG.BAG_SIZE) { toast('Your bags are full.'); return; }
  S.equipment[slot] = null; S.bag.push(it);
  invalidate(); markDirty();
}

function sellItem(id) {
  const it = S.bag.find(i => i.id === +id);
  if (!it) return;
  S.bag = S.bag.filter(i => i !== it);
  S.copper += it.sell; S.earned += it.sell;
  if (G.selected === it.id) G.selected = null;
  markDirty();
}

function sellWhere(fn) {
  const sold = S.bag.filter(fn);
  if (!sold.length) { toast('Nothing to sell.'); return; }
  const total = sold.reduce((a, i) => a + i.sell, 0);
  S.bag = S.bag.filter(i => !fn(i));
  S.copper += total; S.earned += total;
  G.selected = null;
  toast(`Sold ${sold.length} item${sold.length > 1 ? 's' : ''} for ${moneyText(total)}`);
  markDirty();
}

function equipBest(quiet) {
  let n = 0, guard = 40;
  while (guard-- > 0) {
    const best = S.bag.filter(isUpgrade).sort((a, b) => itemScore(b) - itemScore(a))[0];
    if (!best) break;
    equip(best.id); n++;
  }
  if (!quiet) toast(n ? `Equipped ${n} upgrade${n > 1 ? 's' : ''}` : 'No upgrades in your bags.');
  return n;
}

// ---------- combat: helpers ----------
function fightX() {
  const e = G.enemy;
  return G.heroX + 118 + (e ? (e.def.size * (e.elite ? 1.25 : 1) - 1) * 50 : 0);
}
const enemyY = e => G.groundY - 55 * e.def.size * (e.elite ? 1.25 : 1);
const alive = e => !!e && e.state !== 'dying' && e.hp > 0;
const inRange = e => alive(e) && (e.state === 'fight' || (e.state === 'approach' && e.x < G.W - 30));
const hasDot = (e, id) => !!e && e.dots.some(d => d.id === id);
const hasBuff = id => G.buffs.some(b => b.id === id);
const gcdLen = () => resType() === 'energy' ? 1.0 : CONFIG.GCD;
const needsTarget = ab => !!(ab.mult || ab.dot || ab.stun || ab.consumeDot);
const isPool = ab => (ab.cost || 0) > 0 && ab.cost < 1 ? 'mana' : 'res';
const WAND_SCHOOL = { priest: 'shadow', mage: 'arcane', warlock: 'shadow', druid: 'nature' };

function addBuff(b) {
  G.buffs = G.buffs.filter(x => x.id !== b.id);
  G.buffs.push(b);
  invalidate();
}
function removeBuff(id) { G.buffs = G.buffs.filter(b => b.id !== id); invalidate(); }

function abCost(ab, st) {
  if (!ab.cost) return 0;
  if (st.free && !ab.nogcd) return 0;
  const m = st.fx.ab[ab.id] || {};
  if (isPool(ab) === 'mana') return ab.cost * Math.max(0.2, 1 + (m.cost || 0) - fxv(st, 'costRed')) * st.maxMana;
  return Math.max(0, ab.cost + (m.cost || 0));
}
const poolValue = ab => isPool(ab) === 'mana' ? S.mana : S.res;

function usable(ab, st, e) {
  if (ab.kind && ab.kind !== 'active') return false;
  if (!knownRanks(ab)) return false;
  if (ab.form === 'cat' && !isCat()) return false;
  if (ab.form === 'caster' && isCat()) return false;
  if ((G.cds[ab.cdGroup || ab.id] || 0) > 0) return false;
  if (poolValue(ab) < abCost(ab, st)) return false;
  const fighting = alive(e) && e.state === 'fight';
  if (needsTarget(ab)) {
    if (!inRange(e)) return false;
    if (!fighting && !ab.range) return false;
  }
  if (ab.finisher && S.combo < 1) return false;
  // Don't waste a global cooldown on a pure DoT when a normal enemy is about to die anyway
  if (ab.dot && ab.dot.mult > (ab.mult || 0) && alive(e) && !e.elite && e.hp < st.H * 4) return false;
  const c = ab.cond;
  if (!c) return true;
  const hp = S.hp / st.maxHp, tgt = e ? e.hp / e.hpMax : 1;
  if (c.inFight && !fighting) return false;
  if (c.hpBelow != null && hp >= c.hpBelow) return false;
  if (c.hpAbove != null && hp <= c.hpAbove) return false;
  if (c.targetBelow != null && (!alive(e) || tgt >= c.targetBelow)) return false;
  if (c.targetAbove != null && (!alive(e) || tgt <= c.targetAbove)) return false;
  if (c.noDot && hasDot(e, c.noDot)) return false;
  if (c.hasDot && !hasDot(e, c.hasDot)) return false;
  if (c.noBuff && hasBuff(c.noBuff)) return false;
  if (c.hasBuff && !hasBuff(c.hasBuff)) return false;
  if (c.combo && S.combo < c.combo) return false;
  if (c.opener && (!alive(e) || e.opened)) return false;
  if (c.manaBelow != null && S.mana >= c.manaBelow * st.maxMana) return false;
  if (c.resAbove != null && S.res < c.resAbove) return false;
  if (c.resBelow != null && S.res >= c.resBelow) return false;
  if (c.proc && !(G.procs[c.proc] > 0)) return false;
  if (c.spec && specName() !== c.spec) return false;
  if (c.pullOrSpec && specName() !== c.pullOrSpec && !(alive(e) && e.state === 'approach')) return false;
  if (c.ctype && !(alive(e) && c.ctype.includes(e.def.ctype))) return false;
  if (c.notForm && hasForm(c.notForm)) return false;
  if (c.hasPet && !petKind()) return false;
  return true;
}

// ---------- combat: actions ----------
function startAbility(ab, st, e) {
  const m = st.fx.ab[ab.id] || {};
  let cast = Math.max(0, (ab.cast || 0) + (m.cast || 0));
  if (cast > 0 && st.instant) cast = 0;
  cast /= st.haste;
  if (!ab.nogcd) G.gcd = gcdLen();
  if (cast > 0.05) { G.cast = { ab, t: 0, total: cast, e, needsTarget: needsTarget(ab) }; return; }
  resolveAbility(ab, st);
}

function resolveAbility(ab, st) {
  const e = G.enemy;
  const m = st.fx.ab[ab.id] || {};
  const cost = abCost(ab, st);
  if (poolValue(ab) < cost) return;
  if (isPool(ab) === 'mana') S.mana -= cost; else S.res -= cost;
  if (ab.cd) G.cds[ab.cdGroup || ab.id] = Math.max(0.5, ab.cd + (m.cd || 0));

  const rf = rankFactor(ab), H = st.H;
  const cp = S.combo;
  const cpScale = ab.finisher ? 0.3 + 0.7 * cp / 5 : 1;
  const school = ab.school || 'physical';
  const name = abName(ab);
  const tgt = needsTarget(ab) && alive(e) ? e : null;

  if (ab.mult && tgt) {
    const amount = H * ab.mult * rf * (1 + (m.dmg || 0)) * cpScale;
    const hit = () => damage(tgt, amount, school, { ab, leech: ab.leech });
    if (ab.proj) launchProjectile(ab.proj, tgt, hit, ab.id === 'pyroblast');
    else hit();
  }
  if (ab.dot && tgt) {
    const total = H * ab.dot.mult * rf * (1 + (m.dmg || 0)) * cpScale * (1 + fxv(st, 'dotDmg'));
    addDot(tgt, ab.id, name, school, total, ab.dot.dur * (1 + (m.dur || 0)), ab.dot.every || 3, ab.dot.leech);
  }
  if (ab.stun && tgt) { tgt.stun = Math.max(tgt.stun, ab.stun + (m.stun || 0)); }
  if (ab.consumeDot && tgt) tgt.dots = tgt.dots.filter(d => d.id !== ab.consumeDot);
  if (ab.heal) {
    let amt = H * ab.heal * rf * (1 + (m.dmg || 0)) * (1 + fxv(st, 'heal'));
    const crit = Math.random() < st.spellCrit + (st.fx.critSchool[school] || 0);
    healHero(crit ? amt * 1.5 : amt, crit);
  }
  if (ab.healPct) healHero(st.maxHp * ab.healPct);
  if (ab.hot) {
    const total = H * ab.hot.heal * rf * (1 + (m.dmg || 0)) * (1 + fxv(st, 'heal'));
    addBuff({ id: ab.id, name, icon: ab.icon, left: ab.hot.dur, max: ab.hot.dur, hot: { per: total / (ab.hot.dur / 3), every: 3, t: 3 } });
  }
  if (ab.shield) addBuff({ id: ab.id, name, icon: ab.icon, left: 30, max: 30, absorb: H * ab.shield * rf * (1 + (m.dmg || 0)) });
  if (ab.buff) {
    const dur = ab.buff.dur * (1 + (m.dur || 0)) + (ab.buff.perCp || 0) * cp;
    addBuff({ id: ab.id, name, icon: ab.icon, left: dur, max: dur, fx: ab.buff.fx, oneShot: ab.buff.oneShot });
  }
  if (ab.gain) {
    const g = ab.gain;
    if (g.rage || g.energy) S.res = Math.min(st.maxRes, S.res + (g.rage || g.energy) + (m.gain || 0));
    if (g.mana) S.mana = Math.min(st.maxMana, S.mana + st.maxMana * (g.mana + (m.gain || 0)));
    if (g.cp) addCombo(g.cp);
  }
  if (ab.cp) addCombo(ab.cp + (Math.random() < (m.cp || 0) ? 1 : 0));
  if (ab.finisher) {
    S.combo = 0;
    if (fxv(st, 'relentless') && Math.random() < 0.2 * cp) S.res = Math.min(st.maxRes, S.res + 25);
    if (Math.random() < fxv(st, 'cpOnFinish')) S.combo = 1;
  }
  if (ab.hpCost) S.hp = Math.max(1, S.hp - st.maxHp * ab.hpCost);
  if (ab.resetCds) for (const k in G.cds) if (k !== ab.id) G.cds[k] = 0;

  // Animation & feedback
  const physical = school === 'physical' && !ab.proj;
  if (tgt && physical) { G.heroSwing = 0; G.heroBig = true; }
  if (ab.proj === 'arrow') G.shoot = 0;
  if (!ab.mult || ab.cd >= 10 || ab.cast) fct(G.heroX + 40, G.groundY - 175, name, ab.heal || ab.hot || ab.healPct ? '#7dff8a' : '#ffd27a', 14);

  if (!ab.nogcd) {
    if (tgt) tgt.opened = true;
    if (G.buffs.some(b => b.oneShot)) { G.buffs = G.buffs.filter(b => !b.oneShot || b.id === ab.id); invalidate(); }
    if (fxv(st, 'clearcast') && (ab.mult || ab.dot) && Math.random() < fxv(st, 'clearcast')) {
      addBuff({ id: 'clearcasting', name: 'Clearcasting', icon: '💭', left: 15, max: 15, fx: { free: 1 }, oneShot: true });
    }
  }
}

function addCombo(n) { S.combo = Math.min(5, S.combo + n); }

// Fights are short, so damage over time is compressed: long DoTs deal their full damage over at most 9 sec.
function addDot(e, id, name, school, total, dur, every, leech) {
  e.dots = e.dots.filter(d => d.id !== id);
  dur = Math.min(dur, 9); every = Math.min(every, 1.5);
  const ticks = Math.max(1, Math.round(dur / every));
  e.dots.push({ id, name, school, per: total / ticks, left: ticks, every, t: every, leech });
}

function damage(e, amount, school, o = {}) {
  if (!alive(e)) return;
  const st = calc(), fx = st.fx;
  let mult = (1 + fxv(st, 'dmg')) * (school === 'physical' && !o.spell ? 1 + fxv(st, 'melee') : 1 + fxv(st, 'spell'));
  mult *= (1 + (fx.school[school] || 0)) * (1 + (fx.vs[e.def.ctype] || 0));
  const diff = e.lv - S.level;
  if (diff > 0) mult *= Math.max(0.4, 1 - 0.06 * diff);
  let crit = false;
  if (!o.noCrit && !o.dot) {
    const phys = school === 'physical' && !o.spell;
    let chance = (phys ? st.meleeCrit : st.spellCrit) + (fx.critSchool[school] || 0) + (o.ab ? ((fx.ab[o.ab.id] || {}).crit || 0) : 0);
    if (!phys && e.stun > 0) chance += fxv(st, 'shatter');
    crit = Math.random() < chance;
    if (crit) {
      const bonus = (phys ? 1 : 0.5) * (1 + fxv(st, 'critMult') + (phys ? 0 : fxv(st, 'spellCritMult') * 2) + (fx.critMultSchool[school] || 0));
      mult *= 1 + bonus;
    }
  }
  const dmg = Math.max(1, Math.round(amount * mult * rand(0.92, 1.08)));
  e.hp -= dmg; e.hit = Math.max(e.hit, o.dot ? 0.4 : 1);
  if (S.numbers) {
    const col = crit ? '#ffd23a' : o.dot ? shade(SCHOOL_COLORS[school] || '#ffffff', 0.85) : SCHOOL_COLORS[school] || '#ffffff';
    fct(e.x + rand(-16, 16), enemyY(e) - 40, fmt(dmg) + (crit ? '!' : ''), col, crit ? 26 : o.dot ? 13 : o.white ? 17 : 19);
  }
  if (!o.dot && !o.pet) burst(e.x - 20, G.groundY - 50 * e.def.size, crit ? '#ffd23a' : SCHOOL_COLORS[school] || '#ffffff', crit ? 10 : 5);

  // Leech & procs
  const leech = (o.leech || 0) + (school === 'shadow' ? fxv(st, 'leech') : 0);
  if (leech > 0) healHero(dmg * leech, false, true);
  if (cls().resource === 'rage' && !isCat() && o.white) S.res = Math.min(100, S.res + 8 * (1 + fxv(st, 'resGen')));
  if (!o.noProc && !o.dot && !o.pet) {
    const phys = school === 'physical' && !o.spell;
    if (crit && phys) {
      if (fxv(st, 'flurry')) addBuff({ id: 'flurry', name: 'Flurry', icon: '🌪️', left: 5, max: 5, fx: { haste: fxv(st, 'flurry') } });
      if (fxv(st, 'critDot')) addDot(e, 'deep_wounds', 'Deep Wounds', 'physical', st.H * fxv(st, 'critDot'), 12, 3);
      if (o.ab && o.ab.cp && Math.random() < fxv(st, 'sealFate')) addCombo(1);
    }
    if (crit && school === 'fire' && fxv(st, 'ignite')) addDot(e, 'ignite', 'Ignite', 'fire', dmg * fxv(st, 'ignite'), 4, 2);
    if (Math.random() < fxv(st, 'stunChance')) { e.stun = Math.max(e.stun, 2); fct(e.x, enemyY(e) - 70, 'Stunned', '#ffe14a', 13); }
    if (phys && fxv(st, 'poison') && Math.random() < fxv(st, 'poison')) damage(e, st.H * 0.3 * (1 + fxv(st, 'poisonDmg')), 'nature', { noProc: true, spell: true });
  }
  if (o.dot && (o.id === 'corruption' || o.id === 'drain_life') && Math.random() < fxv(st, 'nightfall')) {
    addBuff({ id: 'shadow_trance', name: 'Shadow Trance', icon: '🌙', left: 10, max: 10, fx: { instant: 1 }, oneShot: true });
  }
  if (e.hp <= 0) killEnemy(e, st);
}

function healHero(amt, crit, quiet) {
  const st = calc();
  amt = Math.round(amt);
  if (amt <= 0) return;
  S.hp = Math.min(st.maxHp, S.hp + amt);
  if (S.numbers && !quiet) fct(G.heroX + rand(-10, 10), G.groundY - 160, '+' + fmt(amt) + (crit ? '!' : ''), '#5aff6a', crit ? 22 : 17);
}

function launchProjectile(type, e, onHit, big, from) {
  const sx = from ? from.x : G.heroX + 30, sy = from ? from.y : G.groundY - 100;
  const tx = e.x - 10, ty = enemyY(e);
  const beam = type === 'lightning' || type === 'drain';
  G.proj.push({ type, x: sx, y: sy, sx, sy, tx, ty, speed: type === 'arrow' ? 950 : 640, onHit, life: beam ? (type === 'drain' ? 0.6 : 0.22) : 10, t: 0, seed: Math.random() * 10, target: e, big });
}

function whiteSwing(st, e) {
  G.heroSwing = 0; G.heroBig = false;
  if (Math.random() < 0.05) { // enemy dodges
    if (S.numbers) fct(e.x, enemyY(e) - 40, 'Dodge', '#c8c8c8', 15);
    G.procs.overpower = 5;
    return;
  }
  damage(e, st.white, 'physical', { white: true });
  if (alive(e) && Math.random() < fxv(st, 'extraAttack')) {
    if (S.numbers) fct(G.heroX + 40, G.groundY - 165, 'Extra Attack', '#9fd3ff', 13);
    damage(e, st.white, 'physical', { white: true });
  }
}

function autoShot(st, e) {
  G.shoot = 0;
  launchProjectile('arrow', e, () => damage(e, st.white, 'physical', { white: true }));
}

function wandShot(st, e) {
  G.wandFx = 0.35;
  launchProjectile('wand', e, () => damage(e, st.wand, WAND_SCHOOL[S.cls] || 'arcane', { spell: true, noProc: true }));
}

function engage(e, st) {
  G.swing = Math.min(G.swing, 0.2);
  if (cls().resource === 'rage' && !isCat()) {
    const charge = abById('charge');
    if (charge && knownRanks(charge)) {
      S.res = Math.min(100, S.res + 9 + 3 * (knownRanks(charge) - 1) + fxv(st, 'startRes'));
      fct(G.heroX + 40, G.groundY - 175, 'Charge', '#ffd27a', 14);
    }
  } else if (isCat()) S.res = Math.min(st.maxRes, S.res + fxv(st, 'startRes'));
}

function spawnEnemy() {
  const z = zone(), L = S.level;
  let lv;
  if (L >= z.min && L <= z.max) lv = clamp(L + randi(-2, 1), z.min, z.max);
  else if (L > z.max) lv = randi(Math.max(z.min, z.max - 3), z.max);
  else lv = randi(z.min, Math.min(z.max, z.min + 3));
  const elite = Math.random() < CONFIG.ELITE_CHANCE;
  const hpMax = Math.round(enemyHp(lv) * (elite ? 3.2 : 1));
  G.enemy = {
    def: elite ? pick(z.elites || z.enemies) : pick(z.enemies), lv, elite, hp: hpMax, hpMax,
    x: G.W + 90, state: 'approach', atk: 1.3, anim: 0, hit: 0, lunge: 0, dying: 0, seed: Math.random() * 10,
    dots: [], stun: 0, opened: false,
  };
  // Wide screens get faster approaches so the walk always takes about the same time
  G.enemy.speed = Math.max(CONFIG.APPROACH_SPEED, (G.enemy.x - fightX()) / 1.1);
  S.combo = 0; G.procs = {};
}

function enemyAttack(st, e) {
  e.lunge = 1;
  if (Math.random() < st.dodge) {
    if (S.numbers) fct(G.heroX, G.groundY - 150, 'Dodge', '#9fd3ff', 15);
    G.procs.dodge = 5;
    return;
  }
  let d = enemyDamage(e.lv) * (e.elite ? 1.8 : 1) * rand(0.85, 1.15);
  const diff = e.lv - S.level;
  if (diff > 0) d *= 1 + 0.12 * diff;
  d = Math.max(1, Math.round(d * (1 - mitigation(st.armor, e.lv)) * st.dmgTaken));
  for (const b of G.buffs) {
    if (b.absorb > 0 && d > 0) { const a = Math.min(b.absorb, d); b.absorb -= a; d -= a; if (S.numbers && a) fct(G.heroX - 20, G.groundY - 130, `Absorb ${fmt(a)}`, '#c8e6ff', 13); }
  }
  if (d > 0) {
    S.hp -= d; G.hurt = 1;
    if (cls().resource === 'rage' && !isCat()) S.res = Math.min(100, S.res + 4 * (1 + fxv(st, 'resGen')));
    if (S.numbers) fct(G.heroX + rand(-10, 10), G.groundY - 150, '-' + fmt(d), '#ff4d4d', 17);
  }
  if (fxv(st, 'thorns') && alive(e)) damage(e, st.H * fxv(st, 'thorns'), S.cls === 'paladin' ? 'holy' : 'nature', { noCrit: true, noProc: true, spell: true });
  if (S.hp <= 0) die(e);
}

function killEnemy(e, st) {
  e.state = 'dying'; e.dying = 0;
  S.kills++; if (e.elite) S.elites++;
  const xp = S.level >= CONFIG.LEVEL_CAP ? 0 : Math.round(xpForKill(e.lv, S.level) * (e.elite ? 2.5 : 1) * st.xpMult);
  const cop = Math.max(1, Math.round(copperForKill(e.lv) * (e.elite ? 3 : 1) * st.goldMult));
  S.copper += cop; S.earned += cop;
  S.rate.xp += xp; S.rate.copper += cop; S.rate.kills++;
  const ey = G.groundY - 120 * e.def.size;
  if (xp) fct(e.x, ey, `+${fmt(xp)} XP`, '#c58cff', 16, 0.15);
  fct(e.x, ey + 20, '+' + moneyText(cop), '#ffd75a', 14, 0.3);
  burst(e.x, G.groundY - 40, e.def.color, 14);
  if (Math.random() < (e.elite ? 1 : CONFIG.BASE_LOOT_CHANCE * st.loot)) dropLoot(e);
  if (e.elite) log(`Slain: <b class="elite">${esc(e.def.name)}</b> (Elite)`, 'kill');
  if (fxv(st, 'onKillHeal')) healHero(st.maxHp * fxv(st, 'onKillHeal'), false, true);
  if (xp && Math.random() < fxv(st, 'spiritTap')) addBuff({ id: 'spirit_tap', name: 'Spirit Tap', icon: '👻', left: 15, max: 15, fx: { manaRegen: 1 } });
  if (G.cast && G.cast.needsTarget) G.cast = null;
  S.combo = 0;
  if (xp) addXp(xp);
}

function dropLoot(e) {
  const it = makeItem(e.lv, rollQuality(e.elite));
  const Q = QUALITIES[it.q];
  fct(e.x, G.groundY - 165, it.name, Q.color, 14, 0.45);
  if (it.q < S.autoSell || S.bag.length >= CONFIG.BAG_SIZE) {
    S.copper += it.sell; S.earned += it.sell;
    if (it.q >= 2) log(`${S.bag.length >= CONFIG.BAG_SIZE ? 'Bags full — sold' : 'Auto-sold'} ${itemLink(it)} for ${moneyText(it.sell)}`, 'loot');
    return;
  }
  S.bag.push(it);
  log(`You receive loot: ${itemLink(it)}${isUpgrade(it) ? ' <span class="up">▲ upgrade</span>' : ''}`, 'loot');
  markDirty();
}

function die(e) {
  const st = calc();
  S.hp = 0; S.deaths++; G.dead = true; G.deadTimer = 6 * (1 - Math.min(0.5, fxv(st, 'reviveFaster'))); S.res = 0; S.combo = 0;
  log(`You were slain by <b>${esc(e.def.name)}</b> (level ${e.lv}).`, 'death');
  G.enemy = null; G.spawnTimer = 1.5; G.cast = null; G.proj = [];
  G.buffs = []; invalidate();
  markDirty();
}

function addXp(n, quiet) {
  if (S.level >= CONFIG.LEVEL_CAP) return 0;
  S.xp += n;
  const before = S.level;
  while (S.level < CONFIG.LEVEL_CAP && S.xp >= xpToLevel(S.level)) { S.xp -= xpToLevel(S.level); S.level++; }
  if (S.level >= CONFIG.LEVEL_CAP) S.xp = 0;
  const gained = S.level - before;
  if (gained) {
    invalidate();
    const fresh = abilities().filter(a => !a.talent && a.learn > before && a.learn <= S.level);
    if (S.autoTrain) autoTrain();
    const st = calc();
    S.hp = st.maxHp; if (st.maxMana) S.mana = st.maxMana;
    if (!quiet) {
      G.levelFx = 2.2;
      fct(G.heroX, G.groundY - 185, 'LEVEL UP!', '#ffe27a', 26);
      burst(G.heroX, G.groundY - 80, '#ffe27a', 30);
      toast(`Ding! You reached level ${S.level}!`);
    }
    log(`<b class="ding">Ding! You have reached level ${S.level}!</b>${S.level >= CONFIG.TALENT_START ? ' You gained a talent point.' : ''}`, 'level');
    if (fresh.length && !S.autoTrain) log(`New abilities await at your class trainer: ${fresh.map(a => `<b>${esc(a.name)}</b>`).join(', ')}.`, 'sys');
    if (S.level === 40 && cls().armor[0] !== cls().armor[1]) log(`You can now wear <b>${ARMOR_TYPES[cls().armor[1]].name}</b> armor.`, 'sys');
    if (S.level === CONFIG.LEVEL_CAP) log('<b class="ding">You have reached level 60. Your journey on the Leveling Road is complete!</b>', 'level');
    if (S.autoZone) autoPickZone(quiet);
    markDirty();
  }
  return gained;
}

function autoPickZone(quiet) {
  const best = zonesForChar().filter(z => z.min <= S.level).pop();
  const cur = zone();
  if (best && best.id !== cur.id && S.level > cur.max - 1) travel(best.id, quiet);
}

function zoneUnlocked(z) { return S.level >= z.min - 3; }

function travel(id, quiet) {
  const z = zonesForChar().find(x => x.id === id);
  if (!z || !zoneUnlocked(z) || z.id === S.zoneId) return;
  S.zoneId = z.id;
  G.enemy = null; G.spawnTimer = 1; G.weather = []; G.cast = null; G.proj = [];
  showZoneBanner();
  if (!quiet) log(`You travel to <b>${esc(z.name)}</b>.`, 'sys');
  markDirty();
}

// ---------- update loop ----------
function update(dt) {
  G.t += dt; S.playTime += dt;
  const st = calc();
  if (S.hp < 0) S.hp = st.maxHp;
  S.hp = Math.min(S.hp, st.maxHp);
  if (st.maxMana) { if (S.mana < 0) S.mana = st.maxMana; S.mana = clamp(S.mana, 0, st.maxMana); }
  S.res = clamp(S.res, 0, st.rt === 'mana' ? 0 : st.maxRes);
  G.tapCd = Math.max(0, G.tapCd - dt);
  G.hurt = Math.max(0, G.hurt - dt * 3);
  G.levelFx = Math.max(0, G.levelFx - dt);
  G.gcd = Math.max(0, G.gcd - dt);
  G.wandFx = Math.max(0, G.wandFx - dt);
  if (G.heroSwing >= 0) { G.heroSwing += dt / 0.36; if (G.heroSwing >= 1) G.heroSwing = -1; }
  if (G.shoot >= 0) { G.shoot += dt / 0.4; if (G.shoot >= 1) G.shoot = -1; }
  for (const k in G.cds) G.cds[k] = Math.max(0, G.cds[k] - dt);
  for (const k in G.procs) G.procs[k] = Math.max(0, G.procs[k] - dt);
  const nb = G.buffs.length;
  for (const b of G.buffs) {
    b.left -= dt;
    if (b.hot) { b.hot.t -= dt; if (b.hot.t <= 0 && !G.dead) { b.hot.t += b.hot.every; healHero(b.hot.per); } }
  }
  G.buffs = G.buffs.filter(b => b.left > 0 && !(b.absorb !== undefined && b.absorb <= 0));
  if (G.buffs.length !== nb) invalidate();

  S.rate.time += dt;
  if (S.rate.time > 900) for (const k in S.rate) S.rate[k] *= 0.5;

  if (G.dead) {
    G.walking = false;
    G.deadTimer -= dt;
    if (G.deadTimer <= 0) {
      G.dead = false; S.hp = st.maxHp * 0.5; if (st.maxMana) S.mana = st.maxMana * 0.5;
      log('You return to life at the Spirit Healer.', 'sys'); markDirty();
    }
    updateFx(dt);
    return;
  }

  const e = G.enemy;
  const fighting = alive(e) && e.state === 'fight';
  S.hp = Math.min(st.maxHp, S.hp + st.regen * dt * (fighting ? 0.35 : 1));
  if (st.maxMana) {
    S.mana = Math.min(st.maxMana, S.mana + st.manaRegen * dt * (fighting ? 1 : 4));
  }
  if (st.rt === 'energy') S.res = Math.min(st.maxRes, S.res + 10 * (1 + fxv(st, 'resGen')) * dt);
  if (st.rt === 'rage') S.res = fighting ? Math.min(100, S.res + fxv(st, 'rageRegen') * dt) : Math.max(0, S.res - dt * 4);

  G.walking = !e || e.state === 'approach';
  if (G.walking) G.cam += CONFIG.WALK_SPEED * st.travel * dt;

  if (!e) {
    G.spawnTimer -= dt * st.travel;
    if (G.spawnTimer <= 0) spawnEnemy();
  } else {
    e.anim += dt;
    e.hit = Math.max(0, e.hit - dt * 5);
    e.lunge = Math.max(0, e.lunge - dt * 3);
    e.stun = Math.max(0, e.stun - dt);
    for (const d of e.dots) {
      d.t -= dt;
      if (d.t <= 0 && d.left > 0 && alive(e)) { d.t += d.every; d.left--; damage(e, d.per, d.school, { dot: true, id: d.id, leech: d.leech }); }
    }
    e.dots = e.dots.filter(d => d.left > 0);
    if (e.state === 'approach') {
      e.x -= e.speed * st.travel * dt;
      if (e.x <= fightX()) { e.x = fightX(); e.state = 'fight'; engage(e, st); }
    } else if (e.state === 'fight') {
      if (e.stun <= 0) { e.atk -= dt; if (e.atk <= 0) { e.atk += 2; enemyAttack(st, e); } }
    } else if (e.state === 'dying') {
      e.dying += dt;
      if (e.dying > 0.6) { G.enemy = null; G.spawnTimer = CONFIG.SPAWN_DELAY; }
    }
  }
  if (!G.dead) heroAct(dt, calc(), G.enemy);
  updatePet(dt, calc(), G.enemy);
  updateProjectiles(dt);
  updateFx(dt);
}

function heroAct(dt, st, e) {
  G.swing -= dt;
  if (G.cast) {
    const c = G.cast;
    if (c.needsTarget && (!alive(e) || c.e !== e)) G.cast = null;
    else {
      c.t += dt;
      if (c.t >= c.total) { G.cast = null; resolveAbility(c.ab, st); }
      return;
    }
  }
  const list = abilities();
  for (const ab of list) if (ab.nogcd && usable(ab, st, e)) startAbility(ab, calc(), e);
  let acted = false;
  if (G.gcd <= 0) {
    for (const ab of list) {
      if (ab.nogcd || !usable(ab, st, e)) continue;
      startAbility(ab, calc(), e);
      acted = true;
      break;
    }
  }
  if (G.cast) return;
  const auto = isCat() ? 'melee' : cls().auto;
  if (G.swing > 0) return;
  if (auto === 'melee' && alive(e) && e.state === 'fight') { G.swing = st.swing; whiteSwing(st, e); }
  else if (auto === 'ranged' && inRange(e)) { G.swing = st.swing; autoShot(st, e); }
  else if (auto === 'wand' && inRange(e) && !acted && G.gcd <= 0) { G.swing = 1.5 / st.haste; wandShot(st, e); }
}

function updatePet(dt, st, e) {
  const p = petDef();
  G.petAnim = Math.max(0, G.petAnim - dt * 3);
  if (!p || !alive(e) || e.state !== 'fight') { G.petAtk = Math.min(G.petAtk, 0.8); return; }
  G.petAtk -= dt * st.haste;
  if (G.petAtk > 0) return;
  G.petAtk = 2;
  G.petAnim = 1;
  const mult = (p.kind === 'beast' ? 0.32 : p.kind === 'imp' ? 0.36 : 0.26) * (1 + fxv(st, 'petDmg'));
  if (p.kind === 'imp') launchProjectile('firebolt', e, () => damage(e, st.H * mult, 'fire', { pet: true, noProc: true, spell: true }), false, { x: G.heroX - 40, y: G.groundY - 50 });
  else damage(e, st.H * mult, 'physical', { pet: true, noProc: true });
}

function updateProjectiles(dt) {
  for (const p of G.proj) {
    p.t += dt;
    if (p.type === 'lightning' || p.type === 'drain') {
      if (!p.done) { p.done = true; p.onHit(); }
      p.life -= dt; continue;
    }
    const e = G.enemy;
    if (!alive(e) || e !== p.target) { p.life = 0; continue; }
    const tx = e.x - 10, ty = enemyY(e);
    const dx = tx - p.x, dy = ty - p.y, dist = Math.hypot(dx, dy), step = p.speed * dt;
    if (dist <= step) { p.life = 0; p.onHit(); }
    else { p.x += dx / dist * step; p.y += dy / dist * step; }
  }
  G.proj = G.proj.filter(p => p.life > 0);
}

function tap(ev) {
  if (ev) ev.preventDefault();
  if (!S || G.dead || G.tapCd > 0) return;
  const e = G.enemy;
  if (!e) { G.spawnTimer = Math.min(G.spawnTimer, 0.05); return; }
  if (e.state === 'approach') { e.x = Math.max(fightX(), e.x - 90); G.tapCd = 0.08; return; }
  if (e.state === 'fight') {
    G.tapCd = 0.14;
    const st = calc();
    const caster = cls().auto === 'wand' && !isCat();
    if (caster) G.wandFx = 0.2; else if (G.heroSwing < 0) { G.heroSwing = 0; G.heroBig = false; }
    damage(e, st.H * 0.3, caster ? WAND_SCHOOL[S.cls] : 'physical', { noProc: true, noCrit: true, spell: caster });
  }
}

// ---------- effects ----------
function fct(x, y, text, color, size, delay) {
  G.fct.push({ x, y, text, color, size: size || 18, life: 1.3, max: 1.3, delay: delay || 0 });
  if (G.fct.length > 40) G.fct.shift();
}
function burst(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, sp = rand(40, 160);
    G.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, life: rand(0.3, 0.7), max: 0.7, color, size: rand(1.2, 3) });
  }
  if (G.particles.length > 200) G.particles.splice(0, G.particles.length - 200);
}

function updateFx(dt) {
  for (const f of G.fct) { if (f.delay > 0) { f.delay -= dt; continue; } f.y -= 38 * dt; f.life -= dt; }
  G.fct = G.fct.filter(f => f.life > 0);
  for (const p of G.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt; }
  G.particles = G.particles.filter(p => p.life > 0);

  const type = zone().weather;
  if (G.weatherType !== type) { G.weather = []; G.weatherType = type; }
  const want = { snow: 70, leaves: 14, embers: 40, fireflies: 18, dust: 24, rain: 90 }[type] || 0;
  while (G.weather.length < want) {
    G.weather.push({ x: Math.random() * (G.W + 100), y: type === 'embers' ? G.H + Math.random() * 40 : Math.random() * G.groundY, s: rand(1, 3), r: Math.random() * 6, c: pick(['#c7922f', '#a8642a', '#7fa83a']), v: rand(0.6, 1.4) });
  }
  const scroll = G.walking ? CONFIG.WALK_SPEED * calc().travel * 0.8 : 0;
  for (const w of G.weather) {
    w.r += dt * 2;
    switch (type) {
      case 'snow': w.y += 30 * w.v * dt; w.x += (Math.sin(w.r) * 12 - scroll) * dt; break;
      case 'leaves': w.y += 24 * w.v * dt; w.x += (Math.sin(w.r) * 30 - 20 - scroll) * dt; break;
      case 'embers': w.y -= 26 * w.v * dt; w.x += (Math.sin(w.r) * 10 - scroll) * dt; break;
      case 'fireflies': w.y += Math.sin(w.r * 0.7) * 10 * dt; w.x += (Math.cos(w.r * 0.5) * 14 - scroll * 0.6) * dt; break;
      case 'dust': w.x -= (120 * w.v + scroll) * dt; break;
      case 'rain': w.y += 380 * w.v * dt; w.x -= (110 + scroll) * dt; break;
    }
    if (w.x < -20) w.x += G.W + 60;
    if (w.x > G.W + 60) w.x -= G.W + 60;
    if (w.y > G.groundY + 10 && type !== 'embers') { w.y = -5; }
    if (w.y < -10) { w.y = G.H + 5; }
  }
}

// ---------- drawing ----------
function lookFor(raceId, clsId, eq) {
  const R = RACES.find(r => r.id === raceId), C = CLASSES[clsId];
  const w = eq.weapon, off = eq.offhand;
  return Object.assign({}, R.look, {
    race: raceId, cls: C.look, weaponType: w ? w.wtype : C.look.weapon,
    gear: {
      weapon: !!w, weaponQ: w ? w.q : 0, weaponTier: w ? Math.floor((w.ilvl - 1) / 12) : 0,
      head: !!eq.head, chest: !!eq.chest, hands: !!eq.hands, legs: !!eq.legs, feet: !!eq.feet,
      shoulder: !!eq.shoulder, waist: !!eq.waist,
      offhand: off ? (off.otype || off.wtype) : null, offhandQ: off ? off.q : 0,
      tabard: eq.tabard ? eq.tabard.color : null, shirt: eq.shirt ? eq.shirt.color : null,
    },
  });
}

function heroPose() {
  const hunter = S.cls === 'hunter';
  const c = G.cast;
  let cast = null;
  if (c && !hunter) cast = { p: c.t / c.total, color: SCHOOL_COLORS[c.ab.school] || '#ffffff' };
  else if (G.wandFx > 0 && !hunter) cast = { p: 0.4, color: SCHOOL_COLORS[WAND_SCHOOL[S.cls]] || '#c8a8ff' };
  return {
    walking: G.walking, swing: G.heroSwing, big: G.heroBig, hurt: G.hurt, cast, ranged: hunter,
    shoot: hunter ? (c ? c.t / c.total : G.shoot >= 0 ? Math.sin(G.shoot * Math.PI) : 0) : 0,
  };
}

function draw() {
  const ctx = G.ctx, z = zone();
  ctx.setTransform(G.scale, 0, 0, G.scale, 0, 0);
  drawBackground(ctx, G, z);
  drawWeather(ctx, G.weather, z.weather);
  if (G.levelFx > 0) drawLevelUp(ctx, G.heroX, G.groundY, G.levelFx);
  const e = G.enemy;
  if (e && hasDot(e, 'searing_totem')) drawTotem(ctx, G.heroX + 46, G.groundY + 4, G.t);
  const pet = G.dead ? null : petDef();
  if (pet && pet.kind !== 'beast') drawPet(ctx, G.heroX - 46, G.groundY, G.t, pet, G.walking, G.petAnim);
  if (G.dead) drawTombstone(ctx, G.heroX, G.groundY, G.t);
  else if (isCat()) drawCatForm(ctx, G.heroX, G.groundY, G.t, G.walking, G.heroSwing, G.hurt, { race: S.race });
  else drawCharacter(ctx, G.heroX, G.groundY, G.t, heroPose(), lookFor(S.race, S.cls, S.equipment));
  if (pet && pet.kind === 'beast') drawPet(ctx, G.heroX + 52, G.groundY + 2, G.t, pet, G.walking, G.petAnim);
  if (e) drawEnemy(ctx, e, G);
  drawProjectiles(ctx, G.proj);
  drawParticles(ctx, G.particles);
  drawFCT(ctx, G.fct);
}

function resize() {
  const c = G.canvas, r = c.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = Math.max(1, Math.round(r.width * dpr));
  c.height = Math.max(1, Math.round(r.height * dpr));
  G.scale = c.height / G.H;
  G.W = c.width / G.scale;
  G.heroX = clamp(G.W * 0.16, 80, 180);
}

// ---------- HUD ----------
function setText(key, el, v) { if (G.hud[key] !== v) { G.hud[key] = v; el.textContent = v; } }
function setHTML(key, el, v) { if (G.hud[key] !== v) { G.hud[key] = v; el.innerHTML = v; } }
function setPct(key, el, p) { p = clamp(p, 0, 1); const v = (p * 100).toFixed(1) + '%'; if (G.hud[key] !== v) { G.hud[key] = v; el.style.width = v; } }

function updateHUD() {
  const st = calc(), C = cls();
  const need = xpToLevel(S.level);
  const capped = S.level >= CONFIG.LEVEL_CAP;
  setPct('xp', $('#xpFill'), capped ? 1 : S.xp / need);
  setText('xpT', $('#xpText'), capped ? `Level ${S.level} — max level` : `Level ${S.level} · ${fmt(S.xp)} / ${fmt(need)} XP (${Math.floor((S.xp / need) * 100)}%)`);
  setHTML('money', $('#money'), moneyHTML(S.copper));
  setText('plv', $('#pLevel'), S.level);
  setHTML('picon', $('#pIcon'), isCat() ? '🐈' : classIconHTML(S.cls));
  setText('pname', $('#pName'), S.name);
  if (G.hud.pcol !== C.color) { G.hud.pcol = C.color; $('#pName').style.color = C.color; }
  setPct('php', $('#pHp'), S.hp / st.maxHp);
  setText('phpT', $('#pHpText'), `${fmt(Math.max(0, S.hp))} / ${fmt(st.maxHp)}`);
  const rt = st.rt, rv = rt === 'mana' ? S.mana : S.res;
  if (G.hud.rt !== rt) { G.hud.rt = rt; $('#pResBar').dataset.res = rt; }
  setPct('pres', $('#pRes'), rv / st.maxRes);
  setText('presT', $('#pResText'), `${fmt(Math.max(0, rv))} / ${fmt(st.maxRes)}`);
  const combo = C.combo || isCat() ? '●'.repeat(S.combo) + '○'.repeat(5 - S.combo) : '';
  setText('combo', $('#combo'), combo);

  // Cast bar
  const c = G.cast;
  const castOn = !!c && !G.dead;
  if (G.hud.cast !== castOn) { G.hud.cast = castOn; $('#cast').classList.toggle('hidden', !castOn); }
  if (castOn) {
    setPct('castP', $('#castFill'), c.t / c.total);
    setText('castT', $('#castText'), `${abName(c.ab)} · ${Math.max(0, c.total - c.t).toFixed(1)}s`);
  }

  // Buffs: active auras + temporary buffs
  const auras = G.dead ? [] : abilities().filter(auraActive);
  const pet = petDef();
  const key = auras.map(a => a.id).join() + '|' + G.buffs.map(b => b.id + Math.ceil(b.left)).join() + (pet ? pet.kind : '');
  if (G.hud.buffs !== key) {
    G.hud.buffs = key;
    $('#buffs').innerHTML = (pet ? `<span class="buff pet" title="${esc(pet.name)}">${pet.kind === 'beast' ? '🐾' : pet.kind === 'imp' ? '👺' : '👤'}</span>` : '') +
      auras.map(a => `<span class="buff" title="${esc(abName(a))}">${spellIconHTML(a)}</span>`).join('') +
      G.buffs.map(b => `<span class="buff temp" title="${esc(b.name)}">${effectIconHTML(b.id, b.icon)}<i>${Math.ceil(b.left)}</i></span>`).join('');
  }

  const e = G.enemy;
  const tf = $('#target');
  const show = !!e && !G.dead;
  if (G.hud.tshow !== show) { G.hud.tshow = show; tf.classList.toggle('hidden', !show); }
  if (show) {
    setText('tname', $('#tName'), e.def.name);
    const col = conColor(e.lv, S.level);
    if (G.hud.tcol !== col) { G.hud.tcol = col; $('#tName').style.color = col; $('#tLevel').style.color = col; }
    setText('tlv', $('#tLevel'), e.lv);
    setText('ttype', $('#tType'), CREATURE_TYPES[e.def.ctype] || '');
    if (G.hud.telite !== e.elite) { G.hud.telite = e.elite; tf.classList.toggle('elite', e.elite); }
    setPct('thp', $('#tHp'), e.hp / e.hpMax);
    const pc = $('#tPortrait');
    if (pc) drawPortrait(pc.getContext('2d'), pc.width, pc.height, e.def, G.t + e.seed);
    setText('thpT', $('#tHpText'), `${fmt(Math.max(0, e.hp))} / ${fmt(e.hpMax)}`);
    const dk = e.dots.map(d => d.id).join() + (e.stun > 0 ? 's' : '');
    if (G.hud.tdots !== dk) {
      G.hud.tdots = dk;
      $('#tDebuffs').innerHTML = e.dots.map(d => `<span class="buff small" title="${esc(d.name)}">${effectIconHTML(d.id, (abById(d.id) || {}).icon || (d.id === 'ignite' ? '🔥' : '🩸'))}</span>`).join('') + (e.stun > 0 ? '<span class="buff small" title="Stunned">💫</span>' : '');
    }
  }
  const dead = G.dead;
  if (G.hud.dead !== dead) { G.hud.dead = dead; $('#death').classList.toggle('hidden', !dead); }
  if (dead) setText('deadT', $('#deathTimer'), Math.ceil(G.deadTimer));
  const hint = S.kills < 15 && !dead;
  if (G.hud.hint !== hint) { G.hud.hint = hint; $('#tapHint').classList.toggle('hidden', !hint); }
}

function showZoneBanner() {
  const z = zone(), el = $('#zoneBanner');
  el.innerHTML = `<div class="zb-name">${esc(z.name)}</div><div class="zb-lv">Levels ${z.min}–${z.max}</div>`;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  $('#zoneLabel').textContent = z.name;
}

// ---------- log & toast ----------
function log(html, cls) {
  S.log.unshift({ t: Date.now(), html, cls });
  if (S.log.length > 80) S.log.length = 80;
  if (G.tab === 'log') markDirty();
}
function itemLink(it) { return `<span class="ilink" style="color:${QUALITIES[it.q].color}" data-item="${it.id}">[${esc(it.name)}]</span>`; }
let toastTimer = 0;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

// ---------- descriptions ----------
const SCHOOL_NAMES = { physical: 'Physical', holy: 'Holy', fire: 'Fire', frost: 'Frost', arcane: 'Arcane', nature: 'Nature', shadow: 'Shadow' };
function fxText(fx, k) {
  if (!fx) return '';
  k = k == null ? 1 : k;
  const p = v => Math.round(v * k * 100) + '%';
  const out = [];
  for (const key in fx) {
    const v = fx[key];
    switch (key) {
      case 'stat': for (const s in v) out.push(`+${p(v[s])} ${STAT_NAMES[s]}`); break;
      case 'school': for (const s in v) out.push(`+${p(v[s])} ${SCHOOL_NAMES[s]} damage`); break;
      case 'critSchool': for (const s in v) out.push(`+${p(v[s])} ${SCHOOL_NAMES[s]} critical chance`); break;
      case 'dmg': out.push(`+${p(v)} damage`); break;
      case 'melee': out.push(`+${p(v)} attack power`); break;
      case 'spell': out.push(`+${p(v)} spell damage`); break;
      case 'white': out.push(`+${p(v)} weapon damage`); break;
      case 'armor': out.push(`+${p(v)} armor`); break;
      case 'haste': out.push(`+${p(v)} attack and casting speed`); break;
      case 'dodge': out.push(`+${p(v)} dodge`); break;
      case 'crit': out.push(v >= 1 ? 'Guaranteed critical strike' : `+${p(v)} critical chance`); break;
      case 'meleeCrit': out.push(`+${p(v)} melee critical chance`); break;
      case 'spellCrit': out.push(`+${p(v)} spell critical chance`); break;
      case 'dmgTaken': out.push(v <= -1 ? 'Immune to all damage' : v < 0 ? `${p(-v)} less damage taken` : `${p(v)} more damage taken`); break;
      case 'thorns': out.push('Damages attackers'); break;
      case 'extraAttack': out.push(`${p(v)} chance for an extra attack`); break;
      case 'poison': out.push(`${p(v)} chance to poison on hit`); break;
      case 'regen': out.push(`+${p(v)} health regeneration`); break;
      case 'manaRegen': out.push(`+${p(v)} mana regeneration`); break;
      case 'resGen': out.push(`+${p(v)} resource generation`); break;
      case 'petDmg': out.push(`+${p(v)} pet damage`); break;
      case 'leech': out.push(`Heals you for ${p(v)} of Shadow damage dealt`); break;
      case 'free': out.push('Next spell costs nothing'); break;
      case 'instant': out.push('Next spell is instant'); break;
      case 'heal': out.push(`+${p(v)} healing`); break;
    }
  }
  return out.join(', ');
}

function abilityDesc(ab, st) {
  st = st || calc();
  const rf = rankFactor(ab), m = st.fx.ab[ab.id] || {}, H = st.H;
  const school = SCHOOL_NAMES[ab.school || 'physical'];
  const parts = [];
  if (ab.kind === 'aura') {
    parts.push(fxText(ab.fx, rf * (1 + (m.dmg || 0))) || 'Passive');
  } else if (ab.kind === 'pet') parts.push('Summons a companion that fights with you');
  else if (ab.kind === 'charge') parts.push('Generates rage when a fight begins');
  else if (ab.kind === 'form') parts.push('Feral Combat Druids fight as a cat');
  else {
    const meta = [];
    const cast = Math.max(0, (ab.cast || 0) + (m.cast || 0));
    meta.push(cast ? `${cast.toFixed(1)} sec cast` : 'Instant');
    if (ab.cost) meta.push(isPool(ab) === 'mana' ? `${fmt(abCost(ab, st))} Mana` : `${Math.round(abCost(ab, st))} ${RESOURCE_NAMES[isCat() || cls().resource === 'energy' ? 'energy' : 'rage']}`);
    if (ab.cd) meta.push(`${Math.max(0.5, ab.cd + (m.cd || 0))} sec cooldown`);
    parts.push(meta.join(' · '));
    const scale = rf * (1 + (m.dmg || 0));
    if (ab.mult) parts.push(`Deals ~${fmt(H * ab.mult * scale)} ${school} damage${ab.finisher ? ' at 5 combo points' : ''}`);
    if (ab.dot) parts.push(`${fmt(H * ab.dot.mult * scale)} ${school} damage over ${ab.dot.dur} sec`);
    if (ab.heal) parts.push(`Heals ~${fmt(H * ab.heal * scale * (1 + fxv(st, 'heal')))}`);
    if (ab.healPct) parts.push(`Heals ${Math.round(ab.healPct * 100)}% of your health`);
    if (ab.hot) parts.push(`Heals ${fmt(H * ab.hot.heal * scale)} over ${ab.hot.dur} sec`);
    if (ab.shield) parts.push(`Absorbs ${fmt(H * ab.shield * scale)} damage`);
    if (ab.stun) parts.push(`Stuns for ${ab.stun} sec`);
    if (ab.buff) parts.push(fxText(ab.buff.fx) + ` for ${ab.buff.dur} sec`);
    if (ab.gain) parts.push(ab.gain.mana ? `Restores ${Math.round(ab.gain.mana * 100)}% mana` : ab.gain.cp ? `Adds ${ab.gain.cp} combo points` : `Generates ${ab.gain.rage || ab.gain.energy} ${ab.gain.rage ? 'rage' : 'energy'}`);
    if (ab.cp) parts.push('Awards 1 combo point');
  }
  return `<div class="tt-sub2">${esc(ab.desc || '')}</div><div class="tt-meta">${parts.map(esc).join('<br>')}</div>`;
}

// ---------- icons (files listed in ASSETS.md; missing ones fall back to the emoji) ----------
// Characters Windows can't use in file names (e.g. the colon in "Power Word: Shield") are left out.
const iconFileName = name => name.replace(/[\\/:*?"<>|]/g, '');
const talentIconBase = t => `icons/${cls().name}/talents/${iconFileName(t.name)}`;
const spellIconBase = ab => ab.racial ? `icons/Racial/${iconFileName(ab.name)}` : `icons/${cls().name}/spells/${iconFileName(ab.name)}`;
const itemIconBase = it => `icons/items/${it.wtype || it.otype || (it.atype ? it.atype + '-' + it.slot : it.slot)}`;
const talentIconHTML = (t, imgClass) => iconHTML(talentIconBase(t), t.icon, imgClass, 'ticon');
const spellIconHTML = (ab, imgClass) => iconHTML(spellIconBase(ab), ab.icon, imgClass);
const itemIconHTML = (it, imgClass) => iconHTML(itemIconBase(it), itemIcon(it), imgClass || 'iico');
const raceIconHTML = (id, imgClass) => iconHTML(`icons/races/${id}`, RACES.find(r => r.id === id).icon, imgClass);
const factionIconHTML = (id, imgClass) => iconHTML(`icons/factions/${id}`, FACTIONS[id].icon, imgClass);
// Buffs and debuffs that come from talents rather than abilities
const EFFECT_TALENTS = { flurry: 'Flurry', spirit_tap: 'Spirit Tap', shadow_trance: 'Nightfall', deep_wounds: 'Deep Wounds', ignite: 'Ignite',
  clearcasting: { mage: 'Arcane Concentration', druid: 'Omen of Clarity', shaman: 'Elemental Focus' } };
function effectIconHTML(id, emoji, imgClass) {
  const ab = abById(id);
  if (ab) return spellIconHTML(ab, imgClass);
  let tn = EFFECT_TALENTS[id];
  if (tn && typeof tn === 'object') tn = tn[S.cls];
  for (const tr of trees()) { const t = tr.talents.find(x => x.name === tn); if (t) return iconHTML(talentIconBase(t), emoji, imgClass); }
  return `<span class="ico-fb">${emoji}</span>`;
}
// Talent tree backgrounds: Interface/TalentFrame/<Name>-TopLeft/-TopRight/-BottomLeft/-BottomRight
const TREE_ART = {
  warrior: ['WarriorArms', 'WarriorFury', 'WarriorProtection'], paladin: ['PaladinHoly', 'PaladinProtection', 'PaladinCombat'],
  hunter: ['HunterBeastMastery', 'HunterMarksmanship', 'HunterSurvival'], rogue: ['RogueAssassination', 'RogueCombat', 'RogueSubtlety'],
  priest: ['PriestDiscipline', 'PriestHoly', 'PriestShadow'], shaman: ['ShamanElementalCombat', 'ShamanEnhancement', 'ShamanRestoration'],
  mage: ['MageArcane', 'MageFire', 'MageFrost'], warlock: ['WarlockCurses', 'WarlockSummoning', 'WarlockDestruction'],
  druid: ['DruidBalance', 'DruidFeralCombat', 'DruidRestoration'],
};
function treeArtStyle(i) {
  const base = `assets/Interface/TalentFrame/${TREE_ART[S.cls][i]}-`;
  const urls = ['TopLeft', 'TopRight', 'BottomLeft', 'BottomRight'].map(p => assetNow(base + p, TEXTURE_EXTS));
  if (urls.some(u => !u)) return '';
  // Absolute URLs: relative ones inside a CSS variable would resolve against css/
  return `--tart:${urls.map(u => `url('${new URL(u, document.baseURI).href}')`).join(',')};`;
}
function onAssetsChanged() {
  G.hud = {};
  markDirty();
  if (G.create) renderCreate();
}

function talentTooltipHTML(t) {
  const r = tRank(t.id);
  const tree = trees()[t.tree];
  let h = `<div class="tt-name tt-tal">${talentIconHTML(t, 'tt-icon')} ${esc(t.name)}</div><div class="tt-sub"><span>${esc(tree.name)}</span><span>Rank ${r}/${t.max}</span></div>`;
  if (treePoints(t.tree) < t.tier * 5) h += `<div class="tt-req bad">Requires ${t.tier * 5} points in ${esc(tree.name)} Talents</div>`;
  if (t.req) { const q = talentById(t.req); if (tRank(t.req) < q.max) h += `<div class="tt-req bad">Requires ${q.max} point${q.max > 1 ? 's' : ''} in ${esc(q.name)}</div>`; }
  h += `<div class="tt-desc">${esc(talentText(t.desc, Math.max(1, r)))}</div>`;
  if (r > 0 && r < t.max) h += `<div class="tt-next">Next rank:<br>${esc(talentText(t.desc, r + 1))}</div>`;
  if (t.fx.grants) { const ab = abById(t.fx.grants); if (ab) h += `<div class="tt-grant">Teaches: ${spellIconHTML(ab, 'inl')} ${esc(ab.name)}</div>`; }
  if (t.fx.flavor) h += '<div class="muted small">Has little effect while adventuring.</div>';
  return h;
}

function spellTooltipHTML(ab) {
  const k = knownRanks(ab);
  return `<div class="tt-name tt-tal">${spellIconHTML(ab, 'tt-icon')} ${esc(abName(ab))}</div><div class="tt-sub"><span>${ab.racial ? 'Racial' : ab.talent ? 'Talent' : cls().name}</span><span>${k ? `Rank ${k}` : 'Not learned'}</span></div>${abilityDesc(ab)}`;
}

// ---------- panels ----------
const TABS = [
  ['character', 'Character', '🛡️'], ['bags', 'Bags', '🎒'], ['spells', 'Spellbook', '📖'], ['talents', 'Talents', '⭐'],
  ['professions', 'Professions', '⚒️'], ['zones', 'World Map', '🗺️'], ['log', 'Combat Log', '📋'], ['settings', 'Settings', '⚙️'],
];

function markDirty() { G.dirty = true; }
function profCost(u) { return Math.round(u.base * Math.pow(u.growth, prof(u.id))); }

function renderTabs() {
  $('#tabs').innerHTML = TABS.map(([id, label, icon]) =>
    `<button class="tab${G.tab === id ? ' active' : ''}" data-tab="${id}"><span class="ti">${icon}</span><span class="tl">${label}</span><span class="badge" id="badge-${id}"></span></button>`).join('');
}

function renderPanel() {
  G.dirty = false;
  if (!S) return;
  const fn = { character: panelCharacter, bags: panelBags, spells: panelSpells, talents: panelTalents, professions: panelProfessions, zones: panelZones, log: panelLog, settings: panelSettings }[G.tab];
  $('#panel').innerHTML = fn();
  refreshPanel();
}

function refreshPanel() {
  if (!S) return;
  const tp = talentPoints();
  const b1 = $('#badge-talents'); if (b1) b1.textContent = tp > 0 ? tp : '';
  const b2 = $('#badge-bags'); if (b2) b2.textContent = S.bag.length ? `${S.bag.length}` : '';
  const nt = trainableList().length;
  const b3 = $('#badge-spells'); if (b3) b3.textContent = nt && !S.autoTrain ? nt : '';
  if (G.tab === 'professions') {
    for (const u of PROFESSIONS) {
      const btn = document.querySelector(`[data-act="buy"][data-v="${u.id}"]`);
      if (!btn) continue;
      btn.disabled = prof(u.id) >= u.max || S.copper < profCost(u) || (u.minLevel && S.level < u.minLevel);
    }
  }
  if (G.tab === 'spells') {
    document.querySelectorAll('[data-act="train"]').forEach(btn => {
      const ab = abById(btn.dataset.v);
      btn.disabled = !ab || !canTrain(ab) || S.copper < trainCost(nextRankLevel(ab));
    });
  }
}

function statRow(label, value, hint) { return `<div class="srow"${hint ? ` title="${esc(hint)}"` : ''}><span>${label}</span><b>${value}</b></div>`; }

// ---------- class icons ----------
const classIconHTML = (id, extra) => iconHTML(`icons/${CLASSES[id].name}/class/classicon_${id}`, CLASSES[id].icon, 'cicon ' + (extra || ''), 'cicon-fb');

// ---------- character sheet (Classic paper doll) ----------
// Same arrangement as the Classic character frame
const SHEET_LEFT = ['head', 'neck', 'shoulder', 'chest', 'shirt', 'tabard', 'wrist'];
const SHEET_RIGHT = ['hands', 'waist', 'legs', 'feet', 'finger1', 'finger2', 'trinket1', 'trinket2'];
const SHEET_VIEWS = { base: 'Base Stats', melee: 'Melee', ranged: 'Ranged', spell: 'Spell', defense: 'Defenses' };
// Empty-slot art: assets/Interface/PaperDoll/UI-PaperDoll-Slot-<name>
const SLOT_TEXTURES = { weapon: 'MainHand', offhand: 'SecondaryHand', head: 'Head', neck: 'Neck', shoulder: 'Shoulder', chest: 'Chest', shirt: 'Shirt', tabard: 'Tabard',
  wrist: 'Wrists', hands: 'Hands', waist: 'Waist', legs: 'Legs', feet: 'Feet', finger1: 'Finger', finger2: 'RFinger', trinket1: 'Trinket', trinket2: 'Trinket' };

// Stone character-frame art behind the model: UI-PaperDollBackground-L1/R1 (top) and -L2/R2 (bottom), 288×512 in total
function paperDollBg() {
  const urls = ['L1', 'R1', 'L2', 'R2'].map(p => assetNow(`assets/Interface/PaperDoll/UI-PaperDollBackground-${p}`, TEXTURE_EXTS));
  if (urls.some(u => !u)) return '';
  return `background-image:${urls.map(u => `url('${u}')`).join(',')};background-size:88.9% 50%,11.1% 50%,88.9% 50%,11.1% 50%;background-position:0 0,100% 0,0 100%,100% 100%;background-repeat:no-repeat;`;
}

function sheetSlot(s) {
  const it = S.equipment[s];
  if (it) return `<button class="sslot q${it.q}" data-act="unequip" data-v="${s}" data-item="${it.id}" aria-label="${esc(it.name)}" title="${esc(it.name)} — click to unequip">${itemIconHTML(it)}</button>`;
  const tex = assetNow(`assets/Interface/PaperDoll/UI-PaperDoll-Slot-${SLOT_TEXTURES[s]}`, TEXTURE_EXTS);
  const label = s === 'weapon' && S.cls === 'hunter' ? 'Ranged' : SLOT_LABELS[s];
  return tex
    ? `<div class="sslot empty tex" title="${label}" style="background-image:url('${tex}')"></div>`
    : `<div class="sslot empty" title="${label}">${SLOT_ICONS[s]}</div>`;
}

function sheetDefaultView() {
  if (S.cls === 'hunter') return 'ranged';
  return cls().main === 'int' && !isCat() ? 'spell' : 'melee';
}

function sheetStats(view, st) {
  const L = S.level, row = (l, v, hint, cls2) => `<div class="wrow"${hint ? ` title="${esc(hint)}"` : ''}><span>${l}:</span><b class="${cls2 || ''}">${v}</b></div>`;
  const dmg = v => `${fmt(v * 0.9)}–${fmt(v * 1.1)}`;
  switch (view) {
    case 'base': return STAT_KEYS.map(k => row(STAT_NAMES[k], st[k], k === cls().main ? 'Primary stat: increases your damage' : '', k === cls().main ? 'hi' : '')).join('')
      + row('Armor', fmt(st.armor), `Reduces physical damage taken by ${pct(mitigation(st.armor, L))}`);
    case 'melee': return row('Damage', dmg(st.white)) + row('Attack Power', fmt(st.H), 'Base damage of your attacks', 'hi')
      + row('Attack Speed', st.swing.toFixed(2)) + row('Critical Strike', pct(st.meleeCrit)) + row('Weapon Skill', `${L * 5}/${L * 5}`);
    case 'ranged': return row('Damage', dmg(st.white)) + row('Attack Power', fmt(st.H), '', 'hi')
      + row('Attack Speed', st.swing.toFixed(2)) + row('Critical Strike', pct(st.meleeCrit)) + row('Pet Damage', '+' + Math.round(fxv(st, 'petDmg') * 100) + '%');
    case 'spell': return row('Spell Power', fmt(st.H), 'Base damage of your spells', 'hi') + row('Healing Bonus', '+' + Math.round(fxv(st, 'heal') * 100) + '%')
      + row('Mana Regen', st.maxMana ? fmt(st.manaRegen * 5) + ' / 5s' : '—') + row('Critical Strike', pct(st.spellCrit)) + row('Haste', '+' + Math.round((st.haste - 1) * 100) + '%');
    case 'defense': return row('Armor', fmt(st.armor)) + row('Damage Reduction', pct(mitigation(st.armor, L)))
      + row('Dodge', pct(st.dodge)) + row('Health', fmt(st.maxHp)) + row('Health Regen', fmt(st.regen * 5) + ' / 5s');
  }
  return '';
}

function sheetPanel(side, st) {
  const v = side === 'L' ? (G.sheetL || 'base') : (G.sheetR || sheetDefaultView());
  return `<div class="wstat"><select class="wsel" data-act="sheetView" data-v="${side}" aria-label="Stat category">${Object.entries(SHEET_VIEWS).map(([k, n]) => `<option value="${k}" ${k === v ? 'selected' : ''}>${n}</option>`).join('')}</select>
    <div class="wrows">${sheetStats(v, st)}</div></div>`;
}

function panelCharacter() {
  const st = calc(), L = S.level, C = cls(), R = race();
  const spec = specName();
  const tr = trees();
  return `<div class="sheetwrap">
    <div class="wowframe">
      <div class="wf-head">
        <div class="wf-portrait">${isCat() ? '<span class="cicon-fb">🐈</span>' : classIconHTML(S.cls)}</div>
        <div class="wf-title">
          <div class="wf-name">${esc(S.name)}</div>
          <div class="wf-sub">Level ${L} ${R.name} <span style="color:${C.color}">${C.name}</span></div>
          <div class="wf-guild">${spec ? `${esc(spec)} · ` : ''}${esc(zone().name)}</div>
        </div>
      </div>
      <div class="wf-body">
        <div class="wf-col">${SHEET_LEFT.map(sheetSlot).join('')}</div>
        <div class="wf-model${paperDollBg() ? ' pd' : ''}" style="${paperDollBg()}"><canvas id="sheetModel"></canvas>
          <div class="wf-res">
            <span title="Health">❤️<b>${fmt(st.maxHp)}</b></span>
            <span title="${RESOURCE_NAMES[st.rt]}">${st.rt === 'mana' ? '🔷' : st.rt === 'rage' ? '💢' : '⚡'}<b>${fmt(st.maxRes)}</b></span>
          </div>
        </div>
        <div class="wf-col">${SHEET_RIGHT.map(sheetSlot).join('')}</div>
      </div>
      <div class="wf-weapons">${sheetSlot('weapon')}${cls().offhands.length ? sheetSlot('offhand') : ''}</div>
      <div class="wf-stats">${sheetPanel('L', st)}${sheetPanel('R', st)}</div>
    </div>
    <div class="sheetside">
      <div class="sidecard">
        <h3>Talents</h3>
        ${tr.map((t, i) => `<div class="wrow"><span>${t.icon} ${esc(t.name)}</span><b class="${specIndex() === i ? 'hi' : ''}">${treePoints(i)}</b></div>`).join('')}
        <div class="wrow"><span>Unspent points</span><b>${talentPoints()}</b></div>
      </div>
      <div class="sidecard">
        <h3>${raceIconHTML(R.id, 'inl')} ${R.name}</h3>
        <div class="wrow"><span>${esc(R.racial.name)}</span></div>
        <p class="muted small">${esc(R.racial.desc)}</p>
      </div>
      <div class="sidecard">
        <h3>Statistics</h3>
        ${statRow('Experience bonus', '+' + Math.round((st.xpMult / CONFIG.XP_RATE - 1) * 100) + '%')}
        ${statRow('Gold bonus', '+' + Math.round((st.goldMult / CONFIG.GOLD_RATE - 1) * 100) + '%')}
        ${statRow('Loot bonus', '+' + Math.round((st.loot - 1) * 100) + '%')}
        ${statRow('Enemies slain', fmt(S.kills))}
        ${statRow('Elites slain', fmt(S.elites))}
        ${statRow('Deaths', fmt(S.deaths))}
        ${statRow('Gold earned', moneyHTML(S.earned))}
        ${statRow('Time played', timeText(S.playTime))}
      </div>
    </div>
  </div>`;
}

function panelBags() {
  const cells = [];
  for (let i = 0; i < Math.max(CONFIG.BAG_SIZE, S.bag.length); i++) {
    const it = S.bag[i];
    if (!it) { cells.push('<div class="cell empty"></div>'); continue; }
    cells.push(`<button class="cell q${it.q}${G.selected === it.id ? ' sel' : ''}" data-act="select" data-v="${it.id}" data-item="${it.id}">
      <span class="si">${itemIconHTML(it)}</span>${isUpgrade(it) ? '<span class="upm">▲</span>' : ''}${it.req > S.level ? '<span class="lock">🔒</span>' : ''}</button>`);
  }
  const sel = G.selected && S.bag.find(i => i.id === G.selected);
  const detail = sel
    ? `<div class="detail">${itemTooltipHTML(sel)}<div class="btns">
        <button class="btn primary" data-act="equip" data-v="${sel.id}" ${sel.req > S.level ? 'disabled' : ''}>Equip</button>
        <button class="btn" data-act="sell" data-v="${sel.id}">Sell</button></div></div>`
    : '<div class="detail muted">Select an item to see its details. Items marked <span class="up">▲</span> are upgrades.</div>';
  return `<div class="bags">
    <div class="bagtop"><h3>Backpack <span class="muted">${S.bag.length}/${CONFIG.BAG_SIZE}</span></h3>
      <div class="btns">
        <button class="btn primary" data-act="equipBest">Equip upgrades</button>
        <button class="btn" data-act="sellBelow" data-v="2">Sell Poor &amp; Common</button>
        <button class="btn" data-act="sellJunk">Sell non-upgrades</button>
      </div></div>
    <div class="bagbody"><div class="grid">${cells.join('')}</div>${detail}</div>
  </div>`;
}

function panelSpells() {
  const list = abilities().slice().sort((a, b) => (a.racial ? -1 : 0) - (b.racial ? -1 : 0) || (a.talent ? 99 : a.learn) - (b.talent ? 99 : b.learn));
  const trainable = trainableList();
  const total = trainable.reduce((a, ab) => a + trainCost(nextRankLevel(ab)), 0);
  const C = cls();
  const rows = list.map(ab => {
    const k = knownRanks(ab), next = nextRankLevel(ab);
    const granted = !ab.talent || talentGrants().has(ab.id);
    let status;
    if (!granted) status = '<span class="muted">Talent</span>';
    else if (next != null && next <= S.level) status = `<button class="btn buy" data-act="train" data-v="${ab.id}">Train ${moneyHTML(trainCost(next))}</button>`;
    else if (next != null && k === 0) status = `<span class="muted">Level ${next}</span>`;
    else if (next != null) status = `<span class="muted">Rank ${k + 1} at ${next}</span>`;
    else status = '<span class="known">Learned</span>';
    return `<div class="row spell${k ? '' : ' unknown'}" data-spell="${ab.id}">
      <div class="ricon">${spellIconHTML(ab, 'rimg')}</div>
      <div class="rinfo"><div class="rname">${esc(abName(ab))} <span class="muted">${ab.ranks.length > 1 ? `Rank ${k}/${ab.ranks.length}` : ''}${ab.racial ? ' · Racial' : ''}${ab.talent ? ' · Talent' : ''}</span></div>
        <div class="rdesc">${esc(ab.desc || '')}</div></div>
      ${status}
    </div>`;
  }).join('');
  return `<h3>${classIconHTML(S.cls, 'inline')} ${C.name} Trainer <span class="muted">— spells are learned for gold as you level</span></h3>
    <div class="spelltop">
      <label class="toggle"><input type="checkbox" data-act="autoTrain" ${S.autoTrain ? 'checked' : ''}> Automatically train new spell ranks</label>
      <button class="btn primary" data-act="trainAll" ${trainable.length ? '' : 'disabled'}>Train all (${trainable.length})${trainable.length ? ' ' + moneyHTML(total) : ''}</button>
    </div>
    <div class="list">${rows}</div>
    <p class="muted small">${C.auto === 'wand' ? 'When out of mana, you fall back to shooting your wand. ' : ''}Your rotation uses the first ability in this list that is ready, affordable and useful.</p>`;
}

function panelTalents() {
  const pts = talentPoints();
  const spec = specName();
  const head = S.level < CONFIG.TALENT_START
    ? `<p class="muted">Talents unlock at level ${CONFIG.TALENT_START}. You gain one talent point per level, 51 in total at level 60.</p>`
    : `<p>Unspent talent points: <b class="gold">${pts}</b>${spec ? ` · Specialization: <b style="color:${cls().color}">${spec}</b>` : ''} <button class="btn small" data-act="resetTalents">Reset talents</button></p>`;
  const tr = trees();
  const switcher = `<div class="treetabs">${tr.map((t, i) => `<button class="ttab${G.tree === i ? ' active' : ''}" data-act="tree" data-v="${i}">${t.icon} ${esc(t.name)} <b>${treePoints(i)}</b></button>`).join('')}</div>`;
  const treesHTML = tr.map((tree, i) => {
    const cells = tree.talents.map(t => {
      const r = tRank(t.id), can = canLearnTalent(t);
      const state = r >= t.max ? 'maxed' : r > 0 ? 'has' : can ? 'avail' : 'locked';
      return `<button class="tal ${state}${G.talSel === t.id ? ' sel' : ''}" style="grid-row:${t.tier + 1};grid-column:${t.col + 1}" data-act="talent" data-v="${t.id}" data-talent="${t.id}" aria-label="${esc(t.name)}">
        ${talentIconHTML(t, 'timg')}<span class="trank">${r}/${t.max}</span></button>`;
    }).join('');
    const arrows = tree.talents.filter(t => t.req).map(t => {
      const q = talentById(t.req);
      if (q.col !== t.col) return `<div class="tarrow h${tRank(q.id) >= q.max ? ' on' : ''}" style="grid-row:${t.tier + 1};grid-column:${Math.min(q.col, t.col) + 1} / ${Math.max(q.col, t.col) + 2}"></div>`;
      return `<div class="tarrow${tRank(q.id) >= q.max ? ' on' : ''}" style="grid-column:${t.col + 1};grid-row:${q.tier + 1} / ${t.tier + 2}"></div>`;
    }).join('');
    const art = treeArtStyle(i);
    return `<div class="tree${G.tree === i ? ' show' : ''}${art ? ' art' : ''}" style="--tbg:${tree.bg};${art}">
      <div class="thead">${tree.icon} ${esc(tree.name)} <span class="muted">${treePoints(i)} pts</span></div>
      <div class="tgrid">${arrows}${cells}</div></div>`;
  }).join('');
  const sel = G.talSel && talentById(G.talSel);
  const detail = sel ? `<div class="detail tdetail">${talentTooltipHTML(sel)}</div>` : '<div class="detail tdetail muted">Click a talent to learn a rank. Hover or tap a talent to read it. Each row needs 5 more points spent in that tree.</div>';
  return `<h3>${classIconHTML(S.cls, 'inline')} Talents <span class="muted">— ${cls().name}</span></h3>${head}${switcher}<div class="trees">${treesHTML}</div>${detail}`;
}

function panelProfessions() {
  return `<h3>Professions <span class="muted">— train secondary skills for permanent bonuses</span></h3><div class="list">` + PROFESSIONS.map(u => {
    const r = prof(u.id), maxed = r >= u.max, locked = u.minLevel && S.level < u.minLevel;
    return `<div class="row">
      <div class="ricon">${u.icon}</div>
      <div class="rinfo"><div class="rname">${u.name} <span class="muted">${r}/${u.max}</span></div>
        <div class="rdesc">${r ? u.desc(r) : 'Not trained'}${maxed ? '' : ` <span class="next">→ ${u.desc(r + 1)}</span>`}</div></div>
      <button class="btn buy" data-act="buy" data-v="${u.id}">${maxed ? 'Mastered' : locked ? `Requires level ${u.minLevel}` : moneyHTML(profCost(u))}</button>
    </div>`;
  }).join('') + '</div>';
}

function panelZones() {
  const F = FACTIONS[S.faction];
  return `<h3>World Map <span class="muted">— ${factionIconHTML(S.faction, 'inl')} ${F.name} leveling route</span></h3>
    <label class="toggle"><input type="checkbox" data-act="autoZone" ${S.autoZone ? 'checked' : ''}> Automatically move to the next zone when you outlevel this one</label>
    <div class="zones">` + zonesForChar().map(z => {
    const open = zoneUnlocked(z), cur = z.id === S.zoneId;
    const col = conColor(Math.round((z.min + z.max) / 2), S.level);
    return `<button class="zone${cur ? ' cur' : ''}" data-act="travel" data-v="${z.id}" ${open && !cur ? '' : 'disabled'} style="--z1:${z.palette.skyTop};--z2:${z.palette.near}">
      <span class="zname">${esc(z.name)}</span>
      <span class="zlv" style="color:${col}">Levels ${z.min}–${z.max}${z.faction === 'both' ? ' · Contested' : ''}</span>
      <span class="zmobs">${z.enemies.map(e => esc(e.name)).join(' · ')}</span>
      <span class="zstate">${cur ? 'You are here' : open ? 'Travel' : `🔒 Requires level ${z.min - 3}`}</span></button>`;
  }).join('') + '</div>';
}

function panelLog() {
  if (!S.log.length) return '<h3>Combat Log</h3><p class="muted">Nothing has happened yet. Go slay something!</p>';
  return '<h3>Combat Log</h3><div class="log">' + S.log.map(l => {
    const d = new Date(l.t);
    return `<div class="logline ${l.cls || ''}"><span class="lt">${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}</span> ${l.html}</div>`;
  }).join('') + '</div>';
}

function panelSettings() {
  const opts = ['Nothing', 'Poor items', 'Poor & Common', 'Poor, Common & Uncommon'];
  return `<h3>Settings</h3>
  <div class="settings">
    <label>Auto-sell loot below quality:
      <select data-act="autoSell">${opts.map((o, i) => `<option value="${i}" ${S.autoSell === i ? 'selected' : ''}>${o}</option>`).join('')}</select></label>
    <label class="toggle"><input type="checkbox" data-act="numbers" ${S.numbers ? 'checked' : ''}> Show damage numbers</label>
    <label class="toggle"><input type="checkbox" data-act="autoTrain" ${S.autoTrain ? 'checked' : ''}> Automatically train new spell ranks</label>
    <div class="btns">
      <button class="btn" data-act="saveNow">Save now</button>
      <button class="btn" data-act="export">Export save</button>
      <button class="btn" data-act="import">Import save</button>
      <button class="btn danger" data-act="reset">Delete character</button>
    </div>
    <p class="muted">Progress saves automatically in this browser every ${CONFIG.AUTOSAVE_SECONDS} seconds. While you're away you keep earning at ${CONFIG.OFFLINE_EFFICIENCY * 100}% speed for up to ${CONFIG.OFFLINE_CAP_HOURS} hours.</p>
  </div>`;
}

function itemTooltipHTML(it) {
  const Q = QUALITIES[it.q];
  let h = `<div class="tt-name" style="color:${Q.color}">${esc(it.name)}</div>
    <div class="tt-sub"><span>${SLOT_LABELS[it.slot]}</span><span>${itemTypeName(it)}</span></div>`;
  if (it.dmg) h += `<div>${fmt(it.dmg * 0.9)} – ${fmt(it.dmg * 1.1)} Damage</div>`;
  if (it.armor) h += `<div>${fmt(it.armor)} Armor</div>`;
  for (const k of STAT_KEYS) if (it.stats[k]) h += `<div class="tt-stat">+${it.stats[k]} ${STAT_NAMES[k]}</div>`;
  h += `<div class="tt-req${it.req > S.level ? ' bad' : ''}">Requires Level ${it.req}</div>`;
  h += `<div class="muted">Item Level ${it.ilvl} · ${Q.name}</div>`;
  h += `<div class="tt-sell">Sell Price: ${moneyHTML(it.sell)}</div>`;
  const cur = S.equipment[targetSlot(it)];
  if (cur && cur.id !== it.id) {
    const rows = [];
    const diff = (label, a, b) => { const d = Math.round(a - b); if (d) rows.push(`<div class="${d > 0 ? 'pos' : 'neg'}">${d > 0 ? '+' : ''}${d} ${label}</div>`); };
    diff('Damage', it.dmg || 0, cur.dmg || 0); diff('Armor', it.armor || 0, cur.armor || 0);
    for (const k of STAT_KEYS) diff(STAT_NAMES[k], it.stats[k] || 0, cur.stats[k] || 0);
    h += `<div class="tt-cmp"><div class="muted">Compared to <span style="color:${QUALITIES[cur.q].color}">${esc(cur.name)}</span>:</div>${rows.join('') || '<div class="muted">No difference</div>'}</div>`;
  } else if (!cur && it.slot) {
    h += '<div class="tt-cmp pos">Slot is empty — straight upgrade!</div>';
  }
  return h;
}

// ---------- modal ----------
function modal(html, buttons) {
  const m = $('#modal');
  m.innerHTML = `<div class="mbox">${html}<div class="btns">${(buttons || [['OK', null, 'primary']]).map((b, i) => `<button class="btn ${b[2] || ''}" data-mb="${i}">${b[0]}</button>`).join('')}</div></div>`;
  m.classList.remove('hidden');
  m.onclick = ev => {
    const b = ev.target.closest('[data-mb]');
    if (!b) return;
    const fn = (buttons || [])[+b.dataset.mb]?.[1];
    if (fn && fn() === false) return;
    m.classList.add('hidden');
  };
}

// ---------- character creation ----------
function randomName(raceId) { return pick(RACES.find(r => r.id === raceId).names); }

function openCreate() {
  const r = RACES[0];
  G.create = { faction: r.faction, race: r.id, cls: r.classes[0], name: randomName(r.id) };
  $('#create').classList.remove('hidden');
  document.body.classList.add('creating');
  renderCreate();
}

function renderCreate() {
  const c = G.create, R = RACES.find(r => r.id === c.race), C = CLASSES[c.cls], F = FACTIONS[c.faction];
  $('#create').className = 'create ' + c.faction;
  const factions = Object.entries(FACTIONS).map(([id, f]) =>
    `<button class="cfac${c.faction === id ? ' on' : ''}" style="--fc:${f.color}" data-c="faction" data-v="${id}"><span class="cf-i">${factionIconHTML(id, 'cf-img')}</span>${f.name}</button>`).join('');
  const races = RACES.filter(r => r.faction === c.faction).map(r =>
    `<button class="cpick${c.race === r.id ? ' on' : ''}" data-c="race" data-v="${r.id}"><span class="cp-i">${raceIconHTML(r.id, 'cp-img')}</span><span class="cp-n">${r.name}</span></button>`).join('');
  const classes = CLASS_ORDER.map(id => {
    const k = CLASSES[id], ok = R.classes.includes(id);
    return `<button class="cpick${c.cls === id ? ' on' : ''}" style="--cc:${k.color}" data-c="class" data-v="${id}" ${ok ? '' : 'disabled'} title="${ok ? '' : `${R.name}s cannot be ${k.name}s`}"><span class="cp-i">${classIconHTML(id, 'cp-img')}</span><span class="cp-n">${k.name}</span></button>`;
  }).join('');
  const armor = C.armor[0] === C.armor[1] ? ARMOR_TYPES[C.armor[0]].name : `${ARMOR_TYPES[C.armor[0]].name} → ${ARMOR_TYPES[C.armor[1]].name} at 40`;
  const startZone = ZONES.find(z => z.id === R.start);
  $('#create').innerHTML = `<div class="cbox">
    <div class="ctitle">⚔️ The Leveling Road</div>
    <div class="csub">Create your character</div>
    <div class="cgrid">
      <div class="cleft">
        <div class="clabel">Faction</div><div class="cfacs">${factions}</div>
        <div class="clabel">Race</div><div class="cpicks races">${races}</div>
        <div class="clabel">Class</div><div class="cpicks classes">${classes}</div>
      </div>
      <div class="cright">
        <canvas id="preview" class="preview"></canvas>
        <div class="cinfo">
          <div class="cin-title">${classIconHTML(c.cls, 'inline big')} <span style="color:${C.color}">${C.name}</span> <span class="muted">· ${R.name}</span></div>
          <p>${esc(C.blurb)}</p>
          <div class="cin-row"><b>Resource</b> ${RESOURCE_NAMES[C.resource]}${c.cls === 'druid' ? ' / Energy' : ''}</div>
          <div class="cin-row"><b>Armor</b> ${armor}</div>
          <div class="cin-row"><b>Racial</b> ${esc(R.racial.name)} — <span class="muted">${esc(R.racial.desc)}</span></div>
          <div class="cin-row"><b>Starts in</b> ${esc(startZone.name)}</div>
        </div>
        <div class="cname"><input id="cName" maxlength="12" value="${esc(c.name)}" aria-label="Character name" autocomplete="off" spellcheck="false"><button class="btn" data-c="dice" title="Random name">🎲</button></div>
        <button class="btn primary enter" data-c="enter" style="--fc:${F.color}">Enter World</button>
      </div>
    </div>
  </div>`;
  sizePreview();
}

function sizePreview() {
  const cv = $('#preview');
  if (!cv) return;
  const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.max(1, Math.round(r.width * dpr)); cv.height = Math.max(1, Math.round(r.height * dpr));
}

function drawPreview(t) {
  const cv = $('#preview');
  if (!cv || !G.create) return;
  const ctx = cv.getContext('2d'), c = G.create;
  const R = RACES.find(r => r.id === c.race), z = ZONES.find(x => x.id === R.start), p = z.palette;
  const H = 220, s = cv.height / H, W = cv.width / s;
  ctx.setTransform(s, 0, 0, s, 0, 0);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, p.skyTop); g.addColorStop(0.75, p.skyBottom); g.addColorStop(0.75, p.ground); g.addColorStop(1, p.groundDark);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  hills(ctx, W, t * 6, 150, 14, p.far, 166, 1);
  ctx.fillStyle = p.ground; ctx.fillRect(0, 164, W, H);
  const C0 = CLASSES[c.cls], ow = C0.offhands[0];
  const eq = { weapon: { wtype: C0.look.weapon, q: 3, ilvl: 30 }, head: 1, chest: 1, hands: 1, legs: 1, feet: 1, shoulder: 1, waist: 1,
    offhand: ow && WEAPON_TYPES[C0.look.weapon].hands === 1 ? (WEAPON_TYPES[ow] ? { wtype: ow, q: 3 } : { otype: ow, q: 3 }) : null };
  const look = lookFor(c.race, c.cls, eq);
  const sw = (t % 3.2) / 0.9;
  const hunter = c.cls === 'hunter', caster = CLASSES[c.cls].auto === 'wand';
  const pose = { walking: false, swing: !hunter && !caster && sw < 1 ? sw : -1, hurt: 0, ranged: hunter, shoot: hunter ? Math.max(0, Math.sin(t * 1.6)) : 0,
    cast: caster && Math.sin(t * 1.2) > 0.3 ? { p: (Math.sin(t * 1.2) - 0.3) / 0.7, color: CLASSES[c.cls].look.orb || '#8ad8ff' } : null, scale: 1.05 };
  drawCharacter(ctx, W * 0.42, 176, t, pose, look);
}

// The hero model in the character sheet
function drawSheetModel() {
  const cv = $('#sheetModel');
  if (!cv) return;
  const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  const ctx = cv.getContext('2d');
  // With the stone frame art (288×512 units) the hero stands in its black window; otherwise on a dark backdrop
  const pd = cv.parentElement.classList.contains('pd');
  const H = pd ? 512 : 230, s = h / H, W = w / s;
  const cx = pd ? 169 : W / 2 - 4, feet = pd ? 340 : 200, scale = pd ? 1.45 : 1.15;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.setTransform(s, 0, 0, s, 0, 0);
  if (pd) {
    const g = ctx.createRadialGradient(cx, feet - 110, 10, cx, feet - 110, 160);
    g.addColorStop(0, 'rgba(90,80,70,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(60, 75, 218, 287);
  } else {
    const g = ctx.createRadialGradient(W / 2, H * 0.55, 10, W / 2, H * 0.55, W * 0.8);
    g.addColorStop(0, '#3a3530'); g.addColorStop(1, '#0c0b0a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.05)'; ell(ctx, cx, feet, 70, 10);
  const t = G.t;
  if (isCat()) drawCatForm(ctx, cx + 10, feet, t, false, -1, 0, { race: S.race });
  else drawCharacter(ctx, cx, feet, t, { walking: false, swing: -1, hurt: 0, ranged: S.cls === 'hunter', shoot: 0, cast: null, scale }, lookFor(S.race, S.cls, S.equipment));
}

function enterWorld() {
  const c = G.create;
  let name = ($('#cName').value || '').replace(/[^A-Za-z' -]/g, '').trim();
  if (name.length < 2) name = randomName(c.race);
  name = cap(name.toLowerCase()).slice(0, 12);
  S = freshState();
  Object.assign(S, { name, faction: c.faction, race: c.race, cls: c.cls, welcomed: true });
  resetRuntime();
  S.zoneId = race().start;
  giveStarterGear();
  for (const ab of abilities()) if (!ab.talent && ab.learn <= 1) S.spells[ab.id] = 1;
  invalidate();
  const st = calc(); S.hp = st.maxHp; S.mana = st.maxMana; S.res = st.rt === 'energy' ? 100 : 0;
  G.create = null; G.tab = 'character'; G.tree = 0; G.talSel = null; G.hud = {};
  $('#create').classList.add('hidden'); document.body.classList.remove('creating');
  log(`${esc(name)} the ${race().name} ${cls().name} begins their journey in <b>${esc(zone().name)}</b>.`, 'sys');
  save();
  renderTabs(); showZoneBanner(); markDirty();
  const F = FACTIONS[S.faction];
  modal(`<h3>${factionIconHTML(S.faction, 'inl')} ${F.motto}</h3>
    <p>Welcome, <b style="color:${cls().color}">${esc(name)}</b>. Your ${cls().name.toLowerCase()} fights on their own. Enemies march in from the east, and every kill brings experience, gold and the chance of loot.</p>
    <p><b>Tap or click the battlefield</b> to strike faster. Learn new ranks in your <b>Spellbook</b>, equip loot from your <b>Bags</b>, train <b>Professions</b> and spend <b>Talents</b> from level 10.</p>
    <p class="muted">Reach level 60 and conquer the Burning Steppes.</p>`, [['Begin the grind', null, 'primary']]);
}

const CREATE_ACTIONS = {
  faction(v) { const c = G.create; if (c.faction === v) return; c.faction = v; const r = RACES.find(x => x.faction === v); c.race = r.id; if (!r.classes.includes(c.cls)) c.cls = r.classes[0]; c.name = randomName(r.id); },
  race(v) { const c = G.create, r = RACES.find(x => x.id === v); c.race = v; if (!r.classes.includes(c.cls)) c.cls = r.classes[0]; c.name = randomName(v); },
  class(v) { G.create.cls = v; },
  dice() { G.create.name = randomName(G.create.race); },
  enter() { enterWorld(); },
};

// ---------- actions ----------
const ACTIONS = {
  buy(id) {
    const u = PROFESSIONS.find(x => x.id === id);
    if (!u || prof(id) >= u.max || (u.minLevel && S.level < u.minLevel)) return;
    const cost = profCost(u);
    if (S.copper < cost) return;
    S.copper -= cost; S.prof[id] = prof(id) + 1;
    invalidate(); markDirty();
  },
  train(id) { const ab = abById(id); if (ab && !trainAbility(ab)) toast('You cannot afford that yet.'); },
  trainAll() { const n = autoTrain(); toast(n ? `Learned ${n} spell rank${n > 1 ? 's' : ''}.` : 'Nothing you can afford right now.'); markDirty(); },
  talent(id) {
    const t = talentById(id);
    if (!t) return;
    G.talSel = id;
    if (canLearnTalent(t)) {
      S.talents[id] = tRank(id) + 1;
      if (t.fx.grants && tRank(id) === 1) { const ab = abById(t.fx.grants); if (ab) log(`You have learned a new ability: <b>${ab.icon} ${esc(ab.name)}</b>.`, 'sys'); }
      invalidate();
    }
    markDirty();
  },
  tree(i) { G.tree = +i; markDirty(); },
  sheetView(side, el) { G['sheet' + side] = el.value; markDirty(); },
  resetTalents() {
    modal('<h3>Reset talents?</h3><p>All talent points will be refunded. (Unlike a real class trainer, this is free.)</p>', [['Reset', () => { S.talents = {}; G.cast = null; invalidate(); markDirty(); }, 'danger'], ['Cancel']]);
  },
  travel(id) { travel(id); },
  autoZone(v, el) { S.autoZone = el.checked; if (S.autoZone) autoPickZone(); },
  numbers(v, el) { S.numbers = el.checked; },
  autoTrain(v, el) { S.autoTrain = el.checked; if (S.autoTrain) autoTrain(); markDirty(); },
  autoSell(v, el) { S.autoSell = +el.value; },
  select(id) { G.selected = G.selected === +id ? null : +id; markDirty(); },
  equip(id) { equip(id); },
  sell(id) { sellItem(id); },
  unequip(slot) { unequip(slot); },
  equipBest() { equipBest(); },
  sellBelow(q) { sellWhere(i => i.q < +q); },
  sellJunk() { sellWhere(i => !isUpgrade(i)); },
  saveNow() { save(); toast('Game saved.'); },
  export() {
    save();
    const code = btoa(unescape(encodeURIComponent(JSON.stringify(S))));
    modal(`<h3>Export save</h3><p>Copy this code somewhere safe.</p><textarea readonly id="exportBox">${code}</textarea>`, [
      ['Copy', () => { navigator.clipboard?.writeText(code).then(() => toast('Copied!')).catch(() => {}); return false; }, 'primary'], ['Close']]);
    setTimeout(() => $('#exportBox')?.select(), 50);
  },
  import() {
    modal('<h3>Import save</h3><p>Paste a save code. This replaces your current character.</p><textarea id="importBox"></textarea>', [
      ['Import', () => {
        try {
          const d = JSON.parse(decodeURIComponent(escape(atob($('#importBox').value.trim()))));
          if (!validSave(d)) throw new Error('bad');
          applySave(d); save(); G.hud = {}; renderTabs(); showZoneBanner(); markDirty(); toast('Save imported!');
        } catch (e) { toast('That save code is not valid.'); return false; }
      }, 'primary'], ['Cancel']]);
  },
  reset() {
    modal('<h3>Delete character?</h3><p>This permanently erases all progress in this browser.</p>', [
      ['Delete', () => { localStorage.removeItem(CONFIG.SAVE_KEY); S = null; resetRuntime(); openCreate(); }, 'danger'], ['Cancel']]);
  },
};

// ---------- tooltip ----------
function bindTooltip() {
  const tt = $('#tooltip');
  if (!window.matchMedia('(hover: hover)').matches) return;
  document.addEventListener('mouseover', ev => {
    if (!S) { tt.classList.add('hidden'); return; }
    const el = ev.target.closest('[data-item],[data-talent],[data-spell]');
    if (!el) { tt.classList.add('hidden'); return; }
    let html = '';
    if (el.dataset.item) { const it = findItem(el.dataset.item); if (it) html = itemTooltipHTML(it); }
    else if (el.dataset.talent) { const t = talentById(el.dataset.talent); if (t) html = talentTooltipHTML(t); }
    else if (el.dataset.spell) { const ab = abById(el.dataset.spell); if (ab) html = spellTooltipHTML(ab); }
    if (!html) { tt.classList.add('hidden'); return; }
    tt.innerHTML = html; tt.classList.remove('hidden');
  });
  document.addEventListener('mousemove', ev => {
    if (tt.classList.contains('hidden')) return;
    const w = tt.offsetWidth, h = tt.offsetHeight;
    let x = ev.clientX + 16, y = ev.clientY + 16;
    if (x + w > innerWidth - 8) x = ev.clientX - w - 16;
    if (y + h > innerHeight - 8) y = innerHeight - h - 8;
    tt.style.left = Math.max(8, x) + 'px'; tt.style.top = Math.max(8, y) + 'px';
  });
}

// ---------- offline progress ----------
function applyOffline(sec) {
  if (!S) return;
  sec = Math.min(sec, CONFIG.OFFLINE_CAP_HOURS * 3600);
  if (sec < 60 || S.rate.time < 30 || S.rate.kills < 3) return;
  const eff = CONFIG.OFFLINE_EFFICIENCY * sec / S.rate.time;
  const xp = Math.round(S.rate.xp * eff), cop = Math.round(S.rate.copper * eff), kills = Math.floor(S.rate.kills * eff);
  if (!kills) return;
  S.copper += cop; S.earned += cop; S.kills += kills;
  const lv = addXp(xp, true);
  invalidate(); S.hp = calc().maxHp; markDirty();
  modal(`<h3>Welcome back, ${esc(S.name)}!</h3><p>While you were away for <b>${timeText(sec)}</b> you kept fighting:</p>
    <ul class="gains"><li>⚔️ ${fmt(kills)} enemies slain</li><li>✨ ${fmt(xp)} experience${lv ? ` — <b class="ding">+${lv} level${lv > 1 ? 's' : ''}!</b>` : ''}</li><li>💰 ${moneyHTML(cop)}</li></ul>`,
  [['Onward!', null, 'primary']]);
}

// ---------- main loop & boot ----------
function frame(ts) {
  const dt = Math.min(0.1, (ts - (G.last || ts)) / 1000);
  G.last = ts;
  if (!S) {
    drawPreview(ts / 1000);
    requestAnimationFrame(frame);
    return;
  }
  update(dt);
  draw();
  updateHUD();
  if (G.dirty) renderPanel();
  G.refreshT += dt;
  if (G.refreshT > 0.25) { G.refreshT = 0; refreshPanel(); }
  G.charT = (G.charT || 0) + dt;
  // Refresh the character sheet every second, but not while a stat dropdown is open
  if (G.tab === 'character' && G.charT > 1 && !(document.activeElement && document.activeElement.tagName === 'SELECT')) { G.charT = 0; renderPanel(); }
  if (G.tab === 'character') drawSheetModel();
  G.saveT += dt;
  if (G.saveT > CONFIG.AUTOSAVE_SECONDS) { G.saveT = 0; save(); }
  requestAnimationFrame(frame);
}

function boot() {
  G.canvas = $('#game');
  G.ctx = G.canvas.getContext('2d');
  document.title = CONFIG.GAME_NAME;
  applyUiAssets();
  const existing = load();
  resize();
  new ResizeObserver(resize).observe(G.canvas);
  window.addEventListener('resize', sizePreview);
  renderTabs();
  bindTooltip();

  $('#tabs').addEventListener('click', ev => {
    const b = ev.target.closest('[data-tab]');
    if (!b || !S) return;
    G.tab = b.dataset.tab;
    if (G.tab === 'talents') G.tree = Math.max(0, specIndex());
    renderTabs(); renderPanel();
  });
  const panel = $('#panel');
  panel.addEventListener('click', ev => {
    const el = ev.target.closest('[data-act]');
    if (!el || el.tagName === 'SELECT' || el.type === 'checkbox') return;
    ACTIONS[el.dataset.act]?.(el.dataset.v, el, ev);
  });
  panel.addEventListener('change', ev => {
    const el = ev.target.closest('[data-act]');
    if (el) ACTIONS[el.dataset.act]?.(el.dataset.v, el, ev);
  });
  $('#create').addEventListener('click', ev => {
    const el = ev.target.closest('[data-c]');
    if (!el || el.disabled || !G.create) return;
    const nameEl = $('#cName'); if (nameEl) G.create.name = nameEl.value;
    CREATE_ACTIONS[el.dataset.c]?.(el.dataset.v);
    if (S) return;
    renderCreate();
  });
  $('#create').addEventListener('keydown', ev => { if (ev.key === 'Enter' && ev.target.id === 'cName') enterWorld(); });
  $('#stage').addEventListener('pointerdown', tap);

  // Pause handling: browsers stop animating hidden tabs, so treat long absences as offline time
  document.addEventListener('visibilitychange', () => {
    if (!S) return;
    if (document.hidden) save();
    else { const away = (Date.now() - S.lastSeen) / 1000; G.last = 0; applyOffline(away); }
  });
  window.addEventListener('pagehide', save);

  if (existing) {
    if (S.autoTrain) autoTrain();
    showZoneBanner();
    applyOffline((Date.now() - S.lastSeen) / 1000);
  } else openCreate();

  if (/[?&]debug/.test(location.search)) {
    window.dbg = {
      level(n) { while (S.level < Math.min(n, CONFIG.LEVEL_CAP)) addXp(xpToLevel(S.level) - S.xp, true); markDirty(); },
      gold(g) { S.copper += g * 10000; markDirty(); },
      state: () => S, stats: () => calc(),
    };
  }
  requestAnimationFrame(frame);
}

document.addEventListener('DOMContentLoaded', boot);
