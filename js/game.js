// =====================================================================
//  Ironvale Idle — game logic, saving and UI
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

// ---------- state ----------
let S;           // saved state
let STATS = null; // cached derived stats

const G = {      // runtime-only state
  canvas: null, ctx: null, W: 800, H: 320, scale: 1, groundY: 268, heroX: 110,
  t: 0, cam: 0, walking: true, last: 0,
  enemy: null, spawnTimer: 0.8, heroAtk: 0, heroSwing: -1, heroMighty: false, tapCd: 0, hurt: 0,
  dead: false, deadTimer: 0, levelFx: 0,
  fct: [], particles: [], weather: [], weatherType: null,
  tab: 'character', dirty: true, refreshT: 0, saveT: 0, selected: null, hud: {},
};

function freshState() {
  return {
    version: 1, level: 1, xp: 0, copper: 0, hp: -1, rage: 0,
    equipment: { weapon: null, head: null, chest: null, hands: null, legs: null, feet: null },
    bag: [], upgrades: {}, talents: {},
    zoneId: ZONES[0].id, autoZone: true, autoSell: 1, numbers: true,
    kills: 0, elites: 0, deaths: 0, earned: 0, playTime: 0,
    rate: { xp: 0, copper: 0, kills: 0, time: 0 },
    lastSeen: Date.now(), nextId: 1, log: [], welcomed: false,
  };
}

function giveStarterGear() {
  S.equipment.weapon = { id: S.nextId++, slot: 'weapon', ilvl: 1, req: 1, q: 1, name: 'Worn Shortsword', dmg: 6, armor: 0, stats: {}, sell: 3 };
  S.equipment.chest = { id: S.nextId++, slot: 'chest', ilvl: 1, req: 1, q: 1, name: "Recruit's Tunic", dmg: 0, armor: 10, stats: {}, sell: 3 };
}

function load() {
  try {
    const raw = localStorage.getItem(CONFIG.SAVE_KEY);
    if (raw) { applySave(JSON.parse(raw)); return true; }
  } catch (e) { console.warn('Could not load save', e); }
  S = freshState(); giveStarterGear();
  return false;
}

function applySave(d) {
  const f = freshState();
  S = Object.assign(f, d);
  S.equipment = Object.assign(f.equipment, d.equipment || {});
  S.rate = Object.assign({ xp: 0, copper: 0, kills: 0, time: 0 }, d.rate || {});
  if (!ZONES.find(z => z.id === S.zoneId)) S.zoneId = ZONES[0].id;
  STATS = null;
}

function save() {
  S.lastSeen = Date.now();
  try { localStorage.setItem(CONFIG.SAVE_KEY, JSON.stringify(S)); } catch (e) { console.warn('Save failed', e); }
}

// ---------- derived stats ----------
const rank = id => S.upgrades[id] || 0;
const tal = id => S.talents[id] || 0;
const zone = () => ZONES.find(z => z.id === S.zoneId) || ZONES[0];
function invalidate() { STATS = null; }

function calc() {
  if (STATS) return STATS;
  const L = S.level;
  let str = 18 + 2 * L, agi = 16 + 1.5 * L, sta = 18 + 2 * L, armor = 0, wdmg = 2 + L * 0.6;
  for (const slot of SLOTS) {
    const it = S.equipment[slot];
    if (!it) continue;
    str += it.stats.str || 0; agi += it.stats.agi || 0; sta += it.stats.sta || 0;
    armor += it.armor || 0;
    if (it.dmg) wdmg = it.dmg;
  }
  sta *= 1 + 0.04 * tal('endurance');
  armor = (armor + agi * 2) * (1 + 0.05 * tal('ironhide'));
  const maxHp = Math.round((50 + sta * 9 + L * 6) * (1 + 0.06 * rank('rations') + 0.03 * tal('ironhide')));
  const dmgMult = (1 + 0.06 * rank('sharpen')) * (1 + 0.04 * tal('deepcuts'));
  const dmg = (wdmg + str * 0.45) * dmgMult;
  const speed = (1 + 0.03 * rank('drills')) * (1 + 0.03 * tal('rhythm'));
  const interval = 1.6 / speed;
  const crit = Math.min(0.6, 0.05 + agi * 0.0006 + 0.02 * tal('mastery'));
  const dodge = Math.min(0.25, 0.03 + agi * 0.0002);
  STATS = {
    str: Math.round(str), agi: Math.round(agi), sta: Math.round(sta), armor: Math.round(armor),
    maxHp, dmg, interval, crit, dodge,
    dps: (dmg / interval) * (1 + crit),
    mightyMult: 2 * (1 + 0.15 * tal('crushing')),
    regen: maxHp * 0.012 * (1 + 0.1 * rank('rations')) * (1 + 0.3 * tal('secondwind')),
    xpMult: CONFIG.XP_RATE * (1 + 0.05 * rank('tome')) * (1 + 0.03 * tal('veteran')),
    goldMult: CONFIG.GOLD_RATE * (1 + 0.08 * rank('pockets')) * (1 + 0.04 * tal('treasure')),
    loot: (1 + 0.05 * rank('charm')) * (1 + 0.04 * tal('treasure')),
    travel: 1 + 0.06 * rank('tracking'),
    rageGen: 1 + 0.1 * tal('ragewell'),
  };
  return STATS;
}
function mitigation(armor, lv) { return armor / (armor + 85 * lv + 400); }

// ---------- items ----------
function rollQuality(elite) {
  const r = Math.random() * 100;
  if (elite) return r < 4 ? 4 : r < 30 ? 3 : 2;
  return r < 0.6 ? 4 : r < 5 ? 3 : r < 30 ? 2 : r < 72 ? 1 : 0;
}

function makeItem(ilvl, q, slot) {
  slot = slot || pick(SLOTS);
  const Q = QUALITIES[q];
  const tier = clamp(Math.floor((ilvl - 1) / 12), 0, 4);
  let name = pick(ITEM_PREFIXES[q]) + ' ' + ITEM_BASES[slot][tier];
  const stats = {};
  if (Q.statMult > 0) {
    const suf = pick(SUFFIXES);
    const budget = (ilvl * 0.55 + 2) * Q.statMult * (slot === 'weapon' ? 1.4 : ARMOR_SLOT_FACTOR[slot]);
    for (const k in suf.stats) stats[k] = Math.max(1, Math.round(budget * suf.stats[k]));
    name += ' ' + suf.name;
  }
  return {
    id: S.nextId++, slot, ilvl, q, name, stats,
    req: Math.max(1, Math.min(CONFIG.LEVEL_CAP, ilvl - 2)),
    armor: slot === 'weapon' ? 0 : Math.round((ilvl * 3 + 5) * ARMOR_SLOT_FACTOR[slot] * Q.armorMult),
    dmg: slot === 'weapon' ? Math.round((4 + 2.2 * ilvl) * Q.weaponMult) : 0,
    sell: Math.max(1, Math.round((ilvl * ilvl * 0.3 + ilvl * 3 + 3) * Q.sell)),
  };
}

function itemScore(it) {
  if (!it) return 0;
  return (it.dmg || 0) * 3 + (it.armor || 0) * 0.25 + (it.stats.str || 0) * 2 + (it.stats.agi || 0) * 1.6 + (it.stats.sta || 0) * 1.6;
}
const isUpgrade = it => it.req <= S.level && itemScore(it) > itemScore(S.equipment[it.slot]);

function findItem(id) {
  id = +id;
  return S.bag.find(i => i.id === id) || SLOTS.map(s => S.equipment[s]).find(i => i && i.id === id);
}

function equip(id) {
  const it = S.bag.find(i => i.id === +id);
  if (!it) return;
  if (it.req > S.level) { toast(`Requires level ${it.req}`); return; }
  const old = S.equipment[it.slot];
  S.bag = S.bag.filter(i => i !== it);
  if (old) S.bag.push(old);
  S.equipment[it.slot] = it;
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

function equipBest() {
  let n = 0;
  for (const slot of SLOTS) {
    const cands = S.bag.filter(i => i.slot === slot && i.req <= S.level);
    if (!cands.length) continue;
    const best = cands.reduce((a, b) => (itemScore(b) > itemScore(a) ? b : a));
    if (itemScore(best) > itemScore(S.equipment[slot])) { equip(best.id); n++; }
  }
  toast(n ? `Equipped ${n} upgrade${n > 1 ? 's' : ''}` : 'No upgrades in your bags.');
}

// ---------- combat ----------
function fightX() {
  const e = G.enemy;
  return G.heroX + 118 + (e ? (e.def.size * (e.elite ? 1.25 : 1) - 1) * 50 : 0);
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
    def: pick(z.enemies), lv, elite, hp: hpMax, hpMax,
    x: G.W + 90, state: 'approach', atk: 1.3, anim: 0, hit: 0, lunge: 0, dying: 0, seed: Math.random() * 10,
  };
  // Wide screens get faster approaches so the walk always takes about the same time
  G.enemy.speed = Math.max(CONFIG.APPROACH_SPEED, (G.enemy.x - fightX()) / 1.1);
}

function heroAttack(st, e, tap) {
  let mult = 1, mighty = false;
  if (tap) mult = 0.35;
  else if (S.rage >= 30) { S.rage -= 30; mighty = true; mult = st.mightyMult; }
  const crit = Math.random() < st.crit;
  let dmg = st.dmg * rand(0.9, 1.1) * mult * (crit ? 2 : 1);
  const diff = e.lv - S.level;
  if (diff > 0) dmg *= Math.max(0.4, 1 - 0.06 * diff);
  if (e.hp / e.hpMax < 0.25) dmg *= 1 + 0.15 * tal('executioner');
  dmg = Math.max(1, Math.round(dmg));
  e.hp -= dmg; e.hit = 1;
  if (!tap && !mighty) S.rage = Math.min(100, S.rage + 8 * st.rageGen);
  if (!tap || G.heroSwing < 0) { G.heroSwing = 0; G.heroMighty = mighty; }

  const ey = G.groundY - 95 * e.def.size;
  if (S.numbers) fct(e.x + rand(-14, 14), ey, fmt(dmg) + (crit ? '!' : ''), mighty ? '#ff7a3a' : crit ? '#ffd23a' : tap ? '#d8d8d8' : '#ffffff', crit || mighty ? 26 : tap ? 15 : 19);
  if (mighty) fct(G.heroX + 40, G.groundY - 165, 'Mighty Strike', '#ff9a5a', 15);
  burst(e.x - 20, G.groundY - 50 * e.def.size, mighty ? '#ff6a2a' : '#ffffff', mighty ? 12 : 5);
  if (e.hp <= 0) killEnemy(e, st);
}

function enemyAttack(st, e) {
  e.lunge = 1;
  if (Math.random() < st.dodge) { if (S.numbers) fct(G.heroX, G.groundY - 150, 'Dodge', '#9fd3ff', 15); return; }
  let d = enemyDamage(e.lv) * (e.elite ? 1.8 : 1) * rand(0.85, 1.15);
  const diff = e.lv - S.level;
  if (diff > 0) d *= 1 + 0.12 * diff;
  d = Math.max(1, Math.round(d * (1 - mitigation(st.armor, e.lv))));
  S.hp -= d; G.hurt = 1;
  S.rage = Math.min(100, S.rage + 4 * st.rageGen);
  if (S.numbers) fct(G.heroX + rand(-10, 10), G.groundY - 150, '-' + fmt(d), '#ff4d4d', 17);
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
  S.hp = 0; S.deaths++; G.dead = true; G.deadTimer = 6; S.rage = 0;
  log(`You were slain by <b>${esc(e.def.name)}</b> (level ${e.lv}).`, 'death');
  G.enemy = null; G.spawnTimer = 1.5;
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
    S.hp = calc().maxHp;
    if (!quiet) {
      G.levelFx = 2.2;
      fct(G.heroX, G.groundY - 185, 'LEVEL UP!', '#ffe27a', 26);
      burst(G.heroX, G.groundY - 80, '#ffe27a', 30);
      toast(`Ding! You reached level ${S.level}!`);
    }
    log(`<b class="ding">Congratulations, you have reached level ${S.level}!</b>${S.level >= 10 ? ' You gained a talent point.' : ''}`, 'level');
    if (S.level === CONFIG.LEVEL_CAP) log('<b class="ding">You have reached the level cap. Legendary!</b>', 'level');
    if (S.autoZone) autoPickZone(quiet);
    markDirty();
  }
  return gained;
}

function autoPickZone(quiet) {
  const best = ZONES.filter(z => z.min <= S.level).pop() || ZONES[0];
  const cur = zone();
  if (best.id !== cur.id && S.level > cur.max - 1) travel(best.id, quiet);
}

function zoneUnlocked(z) { return S.level >= z.min - 3; }

function travel(id, quiet) {
  const z = ZONES.find(x => x.id === id);
  if (!z || !zoneUnlocked(z) || z.id === S.zoneId) return;
  S.zoneId = z.id;
  G.enemy = null; G.spawnTimer = 1; G.weather = [];
  showZoneBanner();
  if (!quiet) log(`You travel to <b>${esc(z.name)}</b>.`, 'sys');
  markDirty();
}

// ---------- update loop ----------
function update(dt) {
  G.t += dt; S.playTime += dt;
  const st = calc();
  if (S.hp < 0 || S.hp > st.maxHp) S.hp = S.hp < 0 ? st.maxHp : Math.min(S.hp, st.maxHp);
  G.tapCd = Math.max(0, G.tapCd - dt);
  G.hurt = Math.max(0, G.hurt - dt * 3);
  G.levelFx = Math.max(0, G.levelFx - dt);
  if (G.heroSwing >= 0) { G.heroSwing += dt / 0.36; if (G.heroSwing >= 1) G.heroSwing = -1; }

  S.rate.time += dt;
  if (S.rate.time > 900) for (const k in S.rate) S.rate[k] *= 0.5;

  if (G.dead) {
    G.walking = false;
    G.deadTimer -= dt;
    if (G.deadTimer <= 0) { G.dead = false; S.hp = st.maxHp * 0.5; log('You return to life at the spirit healer.', 'sys'); markDirty(); }
    updateFx(dt);
    return;
  }

  const e = G.enemy;
  const fighting = e && e.state === 'fight';
  S.hp = Math.min(st.maxHp, S.hp + st.regen * dt * (fighting ? 0.35 : 1));
  G.walking = !e || e.state === 'approach';
  if (G.walking) G.cam += CONFIG.WALK_SPEED * st.travel * dt;

  if (!e) {
    S.rage = Math.max(0, S.rage - dt * 4);
    G.spawnTimer -= dt * st.travel;
    if (G.spawnTimer <= 0) spawnEnemy();
  } else {
    e.anim += dt;
    e.hit = Math.max(0, e.hit - dt * 5);
    e.lunge = Math.max(0, e.lunge - dt * 3);
    if (e.state === 'approach') {
      e.x -= e.speed * st.travel * dt;
      if (e.x <= fightX()) { e.x = fightX(); e.state = 'fight'; G.heroAtk = 0.2; }
    } else if (e.state === 'fight') {
      G.heroAtk -= dt;
      if (G.heroAtk <= 0) { G.heroAtk += st.interval; heroAttack(st, e, false); }
      if (e.state === 'fight') { e.atk -= dt; if (e.atk <= 0) { e.atk += 2; enemyAttack(st, e); } }
    } else if (e.state === 'dying') {
      e.dying += dt;
      if (e.dying > 0.6) { G.enemy = null; G.spawnTimer = CONFIG.SPAWN_DELAY; }
    }
  }
  updateFx(dt);
}

function tap(ev) {
  if (ev) ev.preventDefault();
  if (G.dead || G.tapCd > 0) return;
  const e = G.enemy;
  if (!e) { G.spawnTimer = Math.min(G.spawnTimer, 0.05); return; }
  if (e.state === 'approach') { e.x = Math.max(fightX(), e.x - 90); G.tapCd = 0.08; return; }
  if (e.state === 'fight') { G.tapCd = 0.14; heroAttack(calc(), e, true); }
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
  const want = { snow: 70, leaves: 14, embers: 40, fireflies: 18, dust: 24 }[type] || 0;
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
    }
    if (w.x < -20) w.x += G.W + 60;
    if (w.x > G.W + 60) w.x -= G.W + 60;
    if (w.y > G.groundY + 10 && type !== 'embers') { w.y = -5; }
    if (w.y < -10) { w.y = G.H + 5; }
  }
}

// ---------- drawing ----------
function draw() {
  const ctx = G.ctx, z = zone();
  ctx.setTransform(G.scale, 0, 0, G.scale, 0, 0);
  drawBackground(ctx, G, z);
  drawWeather(ctx, G.weather, z.weather);
  if (G.levelFx > 0) drawLevelUp(ctx, G.heroX, G.groundY, G.levelFx);
  if (G.dead) drawTombstone(ctx, G.heroX, G.groundY, G.t);
  else {
    const w = S.equipment.weapon;
    drawHero(ctx, G.heroX, G.groundY, G.t, G.walking, G.heroSwing, G.heroMighty, G.hurt, {
      weapon: !!w, weaponTier: w ? Math.floor((w.ilvl - 1) / 12) : 0, weaponQ: w ? w.q : 0,
      head: !!S.equipment.head, chest: !!S.equipment.chest, hands: !!S.equipment.hands, legs: !!S.equipment.legs, feet: !!S.equipment.feet,
    });
  }
  if (G.enemy) drawEnemy(ctx, G.enemy, G);
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
  G.heroX = clamp(G.W * 0.14, 70, 170);
}

// ---------- HUD ----------
function setText(key, el, v) { if (G.hud[key] !== v) { G.hud[key] = v; el.textContent = v; } }
function setHTML(key, el, v) { if (G.hud[key] !== v) { G.hud[key] = v; el.innerHTML = v; } }
function setPct(key, el, p) { p = clamp(p, 0, 1); const v = (p * 100).toFixed(1) + '%'; if (G.hud[key] !== v) { G.hud[key] = v; el.style.width = v; } }

function updateHUD() {
  const st = calc();
  const need = xpToLevel(S.level);
  const capped = S.level >= CONFIG.LEVEL_CAP;
  setPct('xp', $('#xpFill'), capped ? 1 : S.xp / need);
  setText('xpT', $('#xpText'), capped ? `Level ${S.level} — max level` : `Level ${S.level} · ${fmt(S.xp)} / ${fmt(need)} XP (${Math.floor((S.xp / need) * 100)}%)`);
  setHTML('money', $('#money'), moneyHTML(S.copper));
  setText('plv', $('#pLevel'), S.level);
  setPct('php', $('#pHp'), S.hp / st.maxHp);
  setText('phpT', $('#pHpText'), `${fmt(Math.max(0, S.hp))} / ${fmt(st.maxHp)}`);
  setPct('prage', $('#pRage'), S.rage / 100);
  setText('prageT', $('#pRageText'), `${Math.floor(S.rage)} / 100`);

  const e = G.enemy;
  const tf = $('#target');
  const show = !!e && !G.dead;
  if (G.hud.tshow !== show) { G.hud.tshow = show; tf.classList.toggle('hidden', !show); }
  if (show) {
    setText('tname', $('#tName'), e.def.name);
    const col = conColor(e.lv, S.level);
    if (G.hud.tcol !== col) { G.hud.tcol = col; $('#tName').style.color = col; $('#tLevel').style.color = col; }
    setText('tlv', $('#tLevel'), e.lv);
    if (G.hud.telite !== e.elite) { G.hud.telite = e.elite; tf.classList.toggle('elite', e.elite); }
    setPct('thp', $('#tHp'), e.hp / e.hpMax);
    setText('thpT', $('#tHpText'), `${fmt(Math.max(0, e.hp))} / ${fmt(e.hpMax)}`);
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

// ---------- panels ----------
const TABS = [
  ['character', 'Character', '🛡️'], ['bags', 'Bags', '🎒'], ['trainer', 'Trainer', '📜'],
  ['talents', 'Talents', '⭐'], ['zones', 'Zones', '🗺️'], ['log', 'Log', '📋'], ['settings', 'Settings', '⚙️'],
];
const SLOT_ICONS = { weapon: '🗡️', head: '⛑️', chest: '🥋', hands: '🧤', legs: '👖', feet: '🥾' };

function markDirty() { G.dirty = true; }
function talentPoints() { const spent = Object.values(S.talents).reduce((a, b) => a + b, 0); return Math.max(0, S.level - 9) - spent; }
function upgradeCost(u) { return Math.round(u.base * Math.pow(u.growth, rank(u.id))); }

function renderTabs() {
  $('#tabs').innerHTML = TABS.map(([id, label, icon]) =>
    `<button class="tab${G.tab === id ? ' active' : ''}" data-tab="${id}"><span class="ti">${icon}</span><span class="tl">${label}</span><span class="badge" id="badge-${id}"></span></button>`).join('');
}

function renderPanel() {
  G.dirty = false;
  const fn = { character: panelCharacter, bags: panelBags, trainer: panelTrainer, talents: panelTalents, zones: panelZones, log: panelLog, settings: panelSettings }[G.tab];
  $('#panel').innerHTML = fn();
  refreshPanel();
}

function refreshPanel() {
  const tp = talentPoints();
  const b1 = $('#badge-talents'); if (b1) b1.textContent = tp > 0 ? tp : '';
  const b2 = $('#badge-bags'); if (b2) b2.textContent = S.bag.length ? `${S.bag.length}` : '';
  if (G.tab === 'trainer') {
    for (const u of UPGRADES) {
      const btn = document.querySelector(`[data-act="buy"][data-v="${u.id}"]`);
      if (!btn) continue;
      const maxed = rank(u.id) >= u.max;
      btn.disabled = maxed || S.copper < upgradeCost(u);
    }
  }
}

function statRow(label, value, hint) { return `<div class="srow"${hint ? ` title="${esc(hint)}"` : ''}><span>${label}</span><b>${value}</b></div>`; }
const pct = v => (v * 100).toFixed(1) + '%';

function panelCharacter() {
  const st = calc(), L = S.level;
  const slots = SLOTS.map(s => {
    const it = S.equipment[s];
    return it
      ? `<button class="slot q${it.q}" data-act="unequip" data-v="${s}" data-item="${it.id}" title="Click to unequip"><span class="si">${SLOT_ICONS[s]}</span><span class="sn" style="color:${QUALITIES[it.q].color}">${esc(it.name)}</span><span class="sl">${SLOT_LABELS[s]} · ilvl ${it.ilvl}</span></button>`
      : `<div class="slot empty"><span class="si">${SLOT_ICONS[s]}</span><span class="sn">Empty</span><span class="sl">${SLOT_LABELS[s]}</span></div>`;
  }).join('');
  return `<div class="char">
    <div class="paperdoll"><h3>Equipment</h3><div class="slots">${slots}</div></div>
    <div class="sheet">
      <h3>Warrior · Level ${L}</h3>
      <div class="cols">
        <div>
          ${statRow('Health', fmt(st.maxHp))}
          ${statRow('Strength', st.str, 'Increases damage')}
          ${statRow('Agility', st.agi, 'Increases crit, dodge and armor')}
          ${statRow('Stamina', st.sta, 'Increases health')}
          ${statRow('Armor', fmt(st.armor), `Reduces damage taken by ${pct(mitigation(st.armor, L))} vs. level ${L}`)}
          ${statRow('Damage / hit', fmt(st.dmg))}
          ${statRow('Attack speed', st.interval.toFixed(2) + 's')}
          ${statRow('Critical strike', pct(st.crit))}
          ${statRow('Dodge', pct(st.dodge))}
          ${statRow('Est. DPS', fmt(st.dps))}
        </div>
        <div>
          ${statRow('Experience bonus', '+' + Math.round((st.xpMult / CONFIG.XP_RATE - 1) * 100) + '%')}
          ${statRow('Gold bonus', '+' + Math.round((st.goldMult / CONFIG.GOLD_RATE - 1) * 100) + '%')}
          ${statRow('Loot bonus', '+' + Math.round((st.loot - 1) * 100) + '%')}
          ${statRow('Regeneration', fmt(st.regen) + '/s')}
          ${statRow('Enemies slain', fmt(S.kills))}
          ${statRow('Elites slain', fmt(S.elites))}
          ${statRow('Deaths', fmt(S.deaths))}
          ${statRow('Gold earned', moneyHTML(S.earned))}
          ${statRow('Time played', timeText(S.playTime))}
        </div>
      </div>
    </div>
  </div>`;
}

function panelBags() {
  const cells = [];
  for (let i = 0; i < CONFIG.BAG_SIZE; i++) {
    const it = S.bag[i];
    if (!it) { cells.push('<div class="cell empty"></div>'); continue; }
    cells.push(`<button class="cell q${it.q}${G.selected === it.id ? ' sel' : ''}" data-act="select" data-v="${it.id}" data-item="${it.id}">
      <span class="si">${SLOT_ICONS[it.slot]}</span>${isUpgrade(it) ? '<span class="upm">▲</span>' : ''}${it.req > S.level ? '<span class="lock">🔒</span>' : ''}</button>`);
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

function panelTrainer() {
  return `<h3>Trainer <span class="muted">— spend gold on permanent training</span></h3><div class="list">` + UPGRADES.map(u => {
    const r = rank(u.id), maxed = r >= u.max;
    return `<div class="row">
      <div class="ricon">${u.icon}</div>
      <div class="rinfo"><div class="rname">${u.name} <span class="muted">${r}/${u.max}</span></div>
        <div class="rdesc">${r ? u.desc(r) : 'Not trained'}${maxed ? '' : ` <span class="next">→ ${u.desc(r + 1)}</span>`}</div></div>
      <button class="btn buy" data-act="buy" data-v="${u.id}">${maxed ? 'Mastered' : moneyHTML(upgradeCost(u))}</button>
    </div>`;
  }).join('') + '</div>';
}

function panelTalents() {
  const pts = talentPoints();
  const head = S.level < 10
    ? '<p class="muted">Talents unlock at level 10. You gain one talent point per level after that.</p>'
    : `<p>Unspent points: <b class="gold">${pts}</b> <button class="btn small" data-act="resetTalents">Reset talents</button></p>`;
  return `<h3>Talents <span class="muted">— Arms</span></h3>${head}<div class="talents">` + TALENTS.map(t => {
    const r = tal(t.id), maxed = r >= t.max, can = pts > 0 && !maxed && S.level >= 10;
    return `<button class="talent${r ? ' has' : ''}${maxed ? ' maxed' : ''}" data-act="talent" data-v="${t.id}" ${can ? '' : 'disabled'}>
      <span class="ticon">${t.icon}</span><span class="trank">${r}/${t.max}</span>
      <span class="tname">${t.name}</span><span class="tdesc">${t.desc(Math.max(1, r))}</span></button>`;
  }).join('') + '</div>';
}

function panelZones() {
  return `<h3>World Map</h3>
    <label class="toggle"><input type="checkbox" data-act="autoZone" ${S.autoZone ? 'checked' : ''}> Automatically move to the next zone when you outlevel this one</label>
    <div class="zones">` + ZONES.map(z => {
    const open = zoneUnlocked(z), cur = z.id === S.zoneId;
    const col = conColor(Math.round((z.min + z.max) / 2), S.level);
    return `<button class="zone${cur ? ' cur' : ''}" data-act="travel" data-v="${z.id}" ${open && !cur ? '' : 'disabled'} style="--z1:${z.palette.skyTop};--z2:${z.palette.near}">
      <span class="zname">${esc(z.name)}</span>
      <span class="zlv" style="color:${col}">Levels ${z.min}–${z.max}</span>
      <span class="zmobs">${z.enemies.map(e => esc(e.name)).join(' · ')}</span>
      <span class="zstate">${cur ? 'You are here' : open ? 'Travel' : `🔒 Requires level ${z.min - 3}`}</span></button>`;
  }).join('') + '</div>';
}

function panelLog() {
  if (!S.log.length) return '<h3>Log</h3><p class="muted">Nothing has happened yet. Go slay something!</p>';
  return '<h3>Log</h3><div class="log">' + S.log.map(l => {
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
  const statNames = { str: 'Strength', agi: 'Agility', sta: 'Stamina' };
  let h = `<div class="tt-name" style="color:${Q.color}">${esc(it.name)}</div>
    <div class="tt-sub"><span>${SLOT_LABELS[it.slot]}</span><span>${Q.name}</span></div>`;
  if (it.dmg) h += `<div>${fmt(it.dmg * 0.9)} – ${fmt(it.dmg * 1.1)} Damage</div>`;
  if (it.armor) h += `<div>${fmt(it.armor)} Armor</div>`;
  for (const k in it.stats) h += `<div class="tt-stat">+${it.stats[k]} ${statNames[k]}</div>`;
  h += `<div class="tt-req${it.req > S.level ? ' bad' : ''}">Requires Level ${it.req}</div>`;
  h += `<div class="muted">Item Level ${it.ilvl}</div>`;
  h += `<div class="tt-sell">Sell price: ${moneyHTML(it.sell)}</div>`;
  const cur = S.equipment[it.slot];
  if (cur && cur.id !== it.id) {
    const rows = [];
    const diff = (label, a, b) => { const d = Math.round(a - b); if (d) rows.push(`<div class="${d > 0 ? 'pos' : 'neg'}">${d > 0 ? '+' : ''}${d} ${label}</div>`); };
    diff('Damage', it.dmg || 0, cur.dmg || 0); diff('Armor', it.armor || 0, cur.armor || 0);
    for (const k in statNames) diff(statNames[k], it.stats[k] || 0, cur.stats[k] || 0);
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

// ---------- actions ----------
const ACTIONS = {
  buy(id) {
    const u = UPGRADES.find(x => x.id === id);
    if (!u || rank(id) >= u.max) return;
    const cost = upgradeCost(u);
    if (S.copper < cost) return;
    S.copper -= cost; S.upgrades[id] = rank(id) + 1;
    invalidate(); markDirty();
  },
  talent(id) {
    const t = TALENTS.find(x => x.id === id);
    if (!t || talentPoints() <= 0 || tal(id) >= t.max || S.level < 10) return;
    S.talents[id] = tal(id) + 1; invalidate(); markDirty();
  },
  resetTalents() {
    modal('<h3>Reset talents?</h3><p>All talent points will be refunded.</p>', [['Reset', () => { S.talents = {}; invalidate(); markDirty(); }, 'danger'], ['Cancel']]);
  },
  travel(id) { travel(id); },
  autoZone(v, el) { S.autoZone = el.checked; if (S.autoZone) autoPickZone(); },
  numbers(v, el) { S.numbers = el.checked; },
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
          if (typeof d.level !== 'number') throw new Error('bad');
          applySave(d); G.enemy = null; G.dead = false; save(); showZoneBanner(); markDirty(); toast('Save imported!');
        } catch (e) { toast('That save code is not valid.'); return false; }
      }, 'primary'], ['Cancel']]);
  },
  reset() {
    modal('<h3>Delete character?</h3><p>This permanently erases all progress in this browser.</p>', [
      ['Delete', () => { localStorage.removeItem(CONFIG.SAVE_KEY); S = freshState(); giveStarterGear(); S.welcomed = true; invalidate(); G.enemy = null; G.dead = false; save(); showZoneBanner(); markDirty(); }, 'danger'], ['Cancel']]);
  },
};

// ---------- tooltip ----------
function bindTooltip() {
  const tt = $('#tooltip');
  if (!window.matchMedia('(hover: hover)').matches) return;
  document.addEventListener('mouseover', ev => {
    const el = ev.target.closest('[data-item]');
    if (!el) { tt.classList.add('hidden'); return; }
    const it = findItem(el.dataset.item);
    if (!it) { tt.classList.add('hidden'); return; }
    tt.innerHTML = itemTooltipHTML(it); tt.classList.remove('hidden');
  });
  document.addEventListener('mousemove', ev => {
    if (tt.classList.contains('hidden')) return;
    const w = tt.offsetWidth, h = tt.offsetHeight;
    let x = ev.clientX + 16, y = ev.clientY + 16;
    if (x + w > innerWidth - 8) x = ev.clientX - w - 16;
    if (y + h > innerHeight - 8) y = innerHeight - h - 8;
    tt.style.left = x + 'px'; tt.style.top = Math.max(8, y) + 'px';
  });
}

// ---------- offline progress ----------
function applyOffline(sec) {
  sec = Math.min(sec, CONFIG.OFFLINE_CAP_HOURS * 3600);
  if (sec < 60 || S.rate.time < 30 || S.rate.kills < 3) return;
  const eff = CONFIG.OFFLINE_EFFICIENCY * sec / S.rate.time;
  const xp = Math.round(S.rate.xp * eff), cop = Math.round(S.rate.copper * eff), kills = Math.floor(S.rate.kills * eff);
  if (!kills) return;
  S.copper += cop; S.earned += cop; S.kills += kills;
  const lv = addXp(xp, true);
  invalidate(); S.hp = calc().maxHp; markDirty();
  modal(`<h3>Welcome back!</h3><p>While you were away for <b>${timeText(sec)}</b> your hero kept fighting:</p>
    <ul class="gains"><li>⚔️ ${fmt(kills)} enemies slain</li><li>✨ ${fmt(xp)} experience${lv ? ` — <b class="ding">+${lv} level${lv > 1 ? 's' : ''}!</b>` : ''}</li><li>💰 ${moneyHTML(cop)}</li></ul>`,
  [['Onward!', null, 'primary']]);
}

// ---------- main loop & boot ----------
function frame(ts) {
  const dt = Math.min(0.1, (ts - (G.last || ts)) / 1000);
  G.last = ts;
  update(dt);
  draw();
  updateHUD();
  if (G.dirty) renderPanel();
  G.refreshT += dt;
  if (G.refreshT > 0.25) { G.refreshT = 0; refreshPanel(); }
  G.charT = (G.charT || 0) + dt;
  if (G.tab === 'character' && G.charT > 1) { G.charT = 0; renderPanel(); }
  G.saveT += dt;
  if (G.saveT > CONFIG.AUTOSAVE_SECONDS) { G.saveT = 0; save(); }
  requestAnimationFrame(frame);
}

function boot() {
  G.canvas = $('#game');
  G.ctx = G.canvas.getContext('2d');
  document.title = CONFIG.GAME_NAME;
  const existing = load();
  resize();
  new ResizeObserver(resize).observe(G.canvas);
  renderTabs();
  showZoneBanner();
  bindTooltip();

  $('#tabs').addEventListener('click', ev => {
    const b = ev.target.closest('[data-tab]');
    if (!b) return;
    G.tab = b.dataset.tab; renderTabs(); renderPanel();
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
  $('#stage').addEventListener('pointerdown', tap);

  // Pause handling: browsers stop animating hidden tabs, so treat long absences as offline time
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) save();
    else { const away = (Date.now() - S.lastSeen) / 1000; G.last = 0; applyOffline(away); }
  });
  window.addEventListener('pagehide', save);

  if (existing) applyOffline((Date.now() - S.lastSeen) / 1000);
  if (!S.welcomed) {
    S.welcomed = true;
    modal(`<h3>Welcome to ${esc(CONFIG.GAME_NAME)}</h3>
      <p>Your warrior fights on their own. Enemies march in from the east — every kill brings experience, gold and the chance of loot.</p>
      <p><b>Tap or click the battlefield</b> to strike faster. Spend gold at the <b>Trainer</b>, equip loot from your <b>Bags</b>, and pick <b>Talents</b> from level 10.</p>
      <p class="muted">Reach level 60 and conquer the Ashen Wastes.</p>`, [['Begin the grind', null, 'primary']]);
  }
  if (!existing) log('Welcome to Ironvale. Your adventure begins.', 'sys');
  requestAnimationFrame(frame);
}

document.addEventListener('DOMContentLoaded', boot);
