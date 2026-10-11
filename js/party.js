// =====================================================================
//  The Leveling Road — dungeon groups
//  Dungeons are run by a group of five: one tank, one healer, three damage
//  dealers. Before a run you pick your own role and draft four bots from a
//  pool. Bots are built with the real class engine (talents, spells, gear)
//  at the dungeon's level; what they contribute comes from a small power
//  model: the dungeon's level × how well their spec fits their role.
// =====================================================================
'use strict';

const ROLES = {
  tank: { name: 'Tank', plural: 'Tanks', icon: '🛡️' },
  heal: { name: 'Healer', plural: 'Healers', icon: '✚' },
  dps:  { name: 'Damage', plural: 'Damage dealers', icon: '⚔️' },
};
// How well each spec (talent tree 0/1/2) does each role, 0–1
const ROLE_FIT = {
  warrior: [{ tank: 0.6, heal: 0, dps: 1 }, { tank: 0.55, heal: 0, dps: 1 }, { tank: 1, heal: 0, dps: 0.6 }],
  paladin: [{ tank: 0.4, heal: 1, dps: 0.5 }, { tank: 0.95, heal: 0.35, dps: 0.55 }, { tank: 0.55, heal: 0.4, dps: 0.9 }],
  hunter:  [{ tank: 0.15, heal: 0, dps: 1 }, { tank: 0.15, heal: 0, dps: 1 }, { tank: 0.15, heal: 0, dps: 1 }],
  rogue:   [{ tank: 0.25, heal: 0, dps: 1 }, { tank: 0.25, heal: 0, dps: 1 }, { tank: 0.25, heal: 0, dps: 1 }],
  priest:  [{ tank: 0, heal: 0.95, dps: 0.55 }, { tank: 0, heal: 1, dps: 0.45 }, { tank: 0, heal: 0.45, dps: 0.95 }],
  shaman:  [{ tank: 0.2, heal: 0.55, dps: 0.95 }, { tank: 0.45, heal: 0.45, dps: 0.95 }, { tank: 0.2, heal: 1, dps: 0.5 }],
  mage:    [{ tank: 0.05, heal: 0, dps: 1 }, { tank: 0.05, heal: 0, dps: 1 }, { tank: 0.05, heal: 0, dps: 1 }],
  warlock: [{ tank: 0.1, heal: 0, dps: 1 }, { tank: 0.1, heal: 0, dps: 1 }, { tank: 0.1, heal: 0, dps: 1 }],
  druid:   [{ tank: 0.35, heal: 0.55, dps: 0.9 }, { tank: 0.9, heal: 0.3, dps: 0.95 }, { tank: 0.25, heal: 1, dps: 0.5 }],
};
// The power model. Bot damage = what kills a normal mob of its level in `ttk` seconds;
// bot healing = `hps` enemy hits of its level per second; a healer's mana lasts `manaSec` seconds of full healing.
const PARTY_REF = { ttk: 2.8, hps: 1.85, manaSec: 80, tankDps: 0.45, healerDps: 0.15 };
const MELEE = { warrior: 1, rogue: 1, paladin: 1 };   // stand at the front; shamans/druids depend on spec

const fitFor = (cls, spec, role) => ROLE_FIT[cls][Math.max(0, spec)][role];
const playerFit = role => fitFor(S.cls, specIndex(), role);
const roleFitLabel = f => f >= 0.9 ? 'Ideal' : f >= 0.7 ? 'Good' : f >= 0.4 ? 'Weak' : 'Poor';
const roleFitClass = f => f >= 0.9 ? 'ideal' : f >= 0.7 ? 'good' : f >= 0.4 ? 'weak' : 'poor';
// Damage taken when hit by an enemy: a real tank takes it in stride, a mage does not
const tankTakenMult = f => 1 / (0.35 + 0.65 * f);
const threatSlip = f => (1 - f) * 0.5;
// Healing falls off steeply for specs not made for it (a Shadow priest heals at about a third)
const healEff = f => Math.pow(f, 1.4);
const refDps = L => enemyHp(L) / PARTY_REF.ttk;
const refHps = L => enemyDamage(L) * PARTY_REF.hps;
const botLevelFor = d => Math.min(CONFIG.LEVEL_CAP, d.lv[1] + 1);
const specNameOf = (cls, spec) => TALENT_TREES[cls][Math.max(0, spec)].name;

// Run fn with S swapped for another character state (bots use the real calc() / abilities())
function withState(state, fn) {
  const saved = [S, STATS, ABIL, GRANTS, G.buffs];
  S = state; STATS = null; ABIL = null; GRANTS = null; G.buffs = []; G.inBot = true;
  try { return fn(); } finally { [S, STATS, ABIL, GRANTS, G.buffs] = saved; G.inBot = false; }
}

let botIds = 1;
function makeBot(cls, spec, race, level, role, src, ilvl) {
  const R = RACES.find(r => r.id === race);
  const st = Object.assign(freshState(), { name: randomName(race), cls, race, faction: R.faction, level, autoTrain: false, numbers: false });
  const b = { id: 'b' + botIds++, bot: true, cls, spec, race, level, role, name: st.name };
  withState(st, () => {
    autoSpendTalents(spec);
    for (const ab of abilities()) if (!ab.talent) st.spells[ab.id] = ab.ranks.filter(r => r <= level).length;
    for (const slot of [...ITEM_SLOTS, 'finger', 'trinket']) { const it = makeItem(ilvl || level, ilvl ? 4 : Math.random() < 0.25 ? 3 : 2, slot, { src }); it.req = 1; st.bag.push(it); }
    equipBest(true);
    const c = calc();
    const known = abilities().filter(a => knownRanks(a) && a.kind !== 'buff');
    b.maxHp = c.maxHp; b.armor = c.armor; b.dodge = c.dodge; b.maxMana = c.maxMana || 0;
    b.dmgSpells = known.filter(a => a.mult || a.dot).map(a => ({ name: abName(a), school: a.school || 'physical', proj: a.proj || null }));
    b.healSpells = known.filter(a => a.heal || a.hot).map(a => ({ name: abName(a), school: a.school || 'holy' }));
    b.eq = st.equipment;
  });
  b.look = lookFor(race, cls, b.eq);
  b.melee = !!MELEE[cls] || (cls === 'shaman' && spec === 1) || (cls === 'druid' && spec === 1);
  setBotRole(b, role);
  return b;
}
// Role-dependent numbers (a bot in the pool can be shown for one role and drafted for it)
function setBotRole(b, role) {
  b.role = role;
  b.fit = fitFor(b.cls, b.spec, role);
  b.tankFit = fitFor(b.cls, b.spec, 'tank');
  const dpsFit = fitFor(b.cls, b.spec, 'dps');
  b.dps = refDps(b.level) * (role === 'dps' ? dpsFit : role === 'tank' ? PARTY_REF.tankDps * dpsFit : PARTY_REF.healerDps);
  b.hps = role === 'heal' ? refHps(b.level) * healEff(b.fit) : 0;
  b.manaPerHp = b.hps ? b.maxMana / (b.hps * PARTY_REF.manaSec) : 0;
}

// ---------- the draft ----------
function factionClasses() {
  const set = new Set();
  for (const r of RACES) if (r.faction === S.faction) r.classes.forEach(c => set.add(c));
  return CLASS_ORDER.filter(c => set.has(c));
}
const raceFor = cls => pick(RACES.filter(r => r.faction === S.faction && r.classes.includes(cls))).id;
function candidates(role, lo, hi) {
  const out = [];
  for (const c of factionClasses()) for (let s = 0; s < 3; s++) { const f = fitFor(c, s, role); if (f >= lo && f < hi) out.push([c, s]); }
  return out;
}
// Pool: 3 tanks, 3 healers, 5 damage dealers; each role has strong and weak picks
function makePool(d) {
  const L = botLevelFor(d), pool = [];
  const add = (role, list, n) => { for (let k = 0; k < n && list.length; k++) { const [c, s] = pick(list); pool.push(makeBot(c, s, raceFor(c), L, role, d.id, d.raid ? d.rec : 0)); } };
  add('tank', candidates('tank', 0.9, 2), 1); add('tank', candidates('tank', 0.4, 0.9), 1); add('tank', candidates('tank', 0.4, 2), 1);
  add('heal', candidates('heal', 0.9, 2), 1); add('heal', candidates('heal', 0.4, 0.9), 1); add('heal', candidates('heal', 0.4, 2), 1);
  add('dps', candidates('dps', 0.9, 2), 4); add('dps', candidates('dps', 0.5, 0.9), 1);
  return pool;
}

function openDraft(id) {
  const d = dungeonById(id);
  if (!d || G.run) return;
  const st = dungeonStatus(d);
  if (st === 'locked') { toast(`Requires level ${d.min}`); return; }
  if (st === 'cooldown') { toast(`${d.name} can't be entered yet`); return; }
  if (!d.raid && !savedProgress(d) && hourlyCapReached()) { toast('You have entered too many instances recently.'); return; }
  G.draft = { id, role: bestPlayerRole(), pool: makePool(d), picks: [], rerolled: false };
  G.tab = 'dungeons'; renderTabs(); markDirty();
}
function bestPlayerRole() { return ['tank', 'heal', 'dps'].reduce((a, r) => playerFit(r) > playerFit(a) ? r : a, 'dps'); }
// Slots each role still needs (the player fills one of their own role)
function slotsFor(role, myRole) { return (role === 'dps' ? 3 : 1) - (myRole === role ? 1 : 0); }
function draftPicked(role) { return G.draft.picks.map(id => G.draft.pool.find(b => b.id === id)).filter(b => b && b.role === role); }
function draftToggle(id) {
  const D = G.draft, b = D.pool.find(x => x.id === id);
  if (!b) return;
  if (D.picks.includes(id)) D.picks = D.picks.filter(x => x !== id);
  else if (draftPicked(b.role).length < slotsFor(b.role, D.role)) D.picks.push(id);
  else toast(`Your group already has ${slotsFor(b.role, D.role) === 1 ? 'a' : 'enough'} ${ROLES[b.role].name.toLowerCase()}${slotsFor(b.role, D.role) === 1 ? '' : 's'}.`);
  markDirty();
}
function draftSetRole(role) {
  const D = G.draft;
  D.role = role;
  // Drop picks that no longer fit
  for (const r of Object.keys(ROLES)) { const p = draftPicked(r); while (p.length > slotsFor(r, role)) D.picks = D.picks.filter(x => x !== p.pop().id); }
  markDirty();
}
function draftBest() {
  const D = G.draft;
  D.picks = [];
  for (const r of Object.keys(ROLES)) D.picks.push(...D.pool.filter(b => b.role === r).sort((a, b) => b.fit - a.fit).slice(0, slotsFor(r, D.role)).map(b => b.id));
  markDirty();
}
function draftReroll() { const D = G.draft; if (D.rerolled) return; D.pool = makePool(dungeonById(D.id)); D.picks = []; D.rerolled = true; markDirty(); }
function draftLast() {
  const D = G.draft, last = S.lastParty;
  if (!last || !last.length) return;
  const L = botLevelFor(dungeonById(D.id));
  D.role = last.find(m => m.player).role;
  const bots = last.filter(m => !m.player).map(m => { const dd = dungeonById(D.id), b = makeBot(m.cls, m.spec, m.race, L, m.role, D.id, dd.raid ? dd.rec : 0); b.name = m.name; return b; });
  D.pool = bots.concat(D.pool.filter(b => !bots.some(x => x.cls === b.cls && x.role === b.role)).slice(0, 7));
  D.picks = bots.map(b => b.id);
  markDirty();
}
const draftFull = () => Object.keys(ROLES).every(r => draftPicked(r).length === slotsFor(r, G.draft.role));
function draftEnter() {
  const D = G.draft;
  if (!draftFull()) { toast('Your group needs a tank, a healer and three damage dealers.'); return; }
  const bots = D.picks.map(id => D.pool.find(b => b.id === id));
  S.lastParty = [{ player: true, role: D.role }, ...bots.map(b => ({ cls: b.cls, spec: b.spec, race: b.race, role: b.role, name: b.name }))];
  const id = D.id;
  G.draft = null;
  startDungeon(id, false, { role: D.role, bots });
}
// For automatic runs: your best role and the best bots of a fresh pool
function autoParty(d) {
  const role = bestPlayerRole(), pool = makePool(d), bots = [];
  for (const r of Object.keys(ROLES)) bots.push(...pool.filter(b => b.role === r).sort((a, b) => b.fit - a.fit).slice(0, slotsFor(r, role)));
  return { role, bots };
}

// ---------- group strength (what the dungeon asks for vs what the group brings) ----------
function playerEstimate(role) {
  const st = calc(), f = playerFit(role);
  return {
    dps: role === 'heal' ? st.H * 0.2 : st.H * 0.9,
    hps: role === 'heal' ? st.H * 1.2 * healEff(f) : 0,
    tankHp: st.maxHp, tankFit: playerFit('tank'),
  };
}
// The rest of a raid (beyond your group of five): damage and healing, scaled by your item level
function raidBacking(d) {
  if (!d || !d.raid) return null;
  const B = RAID_BACKING[d.size], gf = raidGearFactor(d);
  return { dps: refDps(CONFIG.LEVEL_CAP) * B.dps * RAID_DPS_SHARE * gf, hps: refHps(CONFIG.LEVEL_CAP) * B.heal * RAID_HEAL_SHARE * gf, n: d.size - 5, gf };
}
function groupStrength(d, role, bots) {
  const lvF = d.lv[1] + 1, T = DUNGEON_TUNING[d.raid ? 'rfinal' : 'final'], me = playerEstimate(role), rb = raidBacking(d);
  const tank = role === 'tank' ? { fit: playerFit('tank'), hp: me.tankHp } : (bots.find(b => b.role === 'tank') || null);
  const healer = role === 'heal' ? { hps: me.hps } : (bots.find(b => b.role === 'heal') || null);
  const intake = enemyDamage(lvF) * T.dmg / 2 * 0.68 * (tank ? tankTakenMult(tank.fit) : 2.5) + enemyDamage(lvF) * BOSS_MECHS.bolt.mult / BOSS_MECHS.bolt.every;
  const needHp = enemyDamage(lvF) * T.dmg * 0.68 * 5;
  const dps = me.dps + bots.reduce((a, b) => a + b.dps, 0) + (rb ? rb.dps : 0);
  const needDps = enemyHp(lvF) * T.hp / (d.raid ? 150 : 50);
  return {
    tank: tank ? Math.min(1.5, (tank.fit) * (tank.hp || tank.maxHp) / needHp) : 0,
    heal: healer ? Math.min(1.5, (healer.hps + (rb ? rb.hps * 0.6 : 0)) / intake) : 0,
    dps: Math.min(1.5, dps / needDps),
  };
}

// ---------- running party ----------
// G.party = [members]; the player is { player: true, role }
function setupParty(cfg) {
  const me = { player: true, role: cfg.role, fit: playerFit(cfg.role), tankFit: playerFit('tank'), cls: S.cls, name: S.name };
  const bots = cfg.bots.map(b => Object.assign(b, { hp: b.maxHp, mana: b.maxMana, dead: false, t: rand(0.3, 1.5), swing: -1, castT: 0, hurt: 0, feared: 0, si: 0, hot: null }));
  // Front to back: tank, melee, ranged, healer
  const order = m => m.role === 'tank' ? 0 : m.role === 'heal' ? 3 : (m.player ? MELEE[S.cls] || (S.cls === 'druid' && isCat()) : m.melee) ? 1 : 2;
  G.party = [me, ...bots].sort((a, b) => order(a) - order(b));
  G.partyRole = cfg.role;
  partyLayout();
}
function partyLayout() {
  if (!G.party) { G.heroX = clamp(G.W * 0.16, 80, 180); G.frontX = null; return; }
  const front = clamp(G.W * 0.34, 230, 330), gap = Math.min(52, (front - 40) / 4);
  G.party.forEach((m, i) => { m.x = front - i * gap; });
  G.heroX = G.party.find(m => m.player).x;
  G.frontX = front;
}
function endParty() { G.party = null; G.partyRole = null; partyLayout(); }

const partyMe = () => G.party && G.party.find(m => m.player);
const memberAlive = m => m.player ? !G.dead && S.hp > 0 : !m.dead;
const memberPct = m => m.player ? S.hp / calc().maxHp : m.hp / m.maxHp;
const livingBots = () => G.party ? G.party.filter(m => !m.player && !m.dead) : [];
const partyTank = () => G.party && G.party.find(m => m.role === 'tank' && memberAlive(m));

// Who the enemy is hitting: the tank, unless it slips (bad threat) or the tank is dead
function enemyTarget(e) {
  const alive = G.party.filter(memberAlive);
  if (!alive.length) return null;
  let t = e.target && memberAlive(e.target) ? e.target : partyTank() || pick(alive);
  e.target = t;
  if (t.role === 'tank' && alive.length > 1 && Math.random() < threatSlip(t.player ? playerFit('tank') : t.tankFit)) t = pick(alive.filter(m => m !== t));
  return t;
}

// Damage to a party member. raw = before armor; spell hits ignore armor and dodge.
function partyHit(m, raw, e, spell, label) {
  if (m.player) {
    const st = calc();
    let d = raw * (spell ? 1 : (1 - mitigation(st.armor, e.lv)) * tankTakenMult(playerFit('tank'))) * st.dmgTaken;
    if (!spell && Math.random() < st.dodge) { if (S.numbers) fct(G.heroX, G.groundY - 150, 'Dodge', '#9fd3ff', 15); G.procs.dodge = 5; return; }
    hitHero(Math.max(1, Math.round(d)), e, label);
    return;
  }
  if (m.dead) return;
  if (!spell && Math.random() < m.dodge) { fct(m.x, G.groundY - 140, 'Dodge', '#9fd3ff', 12); return; }
  const d = Math.max(1, Math.round(raw * (spell ? 1 : (1 - mitigation(m.armor, e.lv)) * tankTakenMult(m.tankFit))));
  m.hp -= d; m.hurt = 1;
  if (S.numbers) fct(m.x + rand(-8, 8), G.groundY - 140, '-' + fmt(d), '#ff7a6a', label ? 16 : 13);
  if (label) fct(m.x, G.groundY - 168, label, '#ffb070', 12);
  if (m.hp <= 0) {
    m.hp = 0; m.dead = true; m.hot = null;
    if (G.run) G.run.deaths = (G.run.deaths || 0) + 1;
    log(`<b>${esc(m.name)}</b> (${ROLES[m.role].name.toLowerCase()}) has died.`, 'death');
    uiMessage(`${m.name} has died`, '#ff7a5a');
    if (e.target === m) e.target = null;
    if (!livingBots().length && G.run) {
      log('Your whole party has fallen.', 'death');
      endDungeon('wipe');
    }
  }
}

function healMember(m, amt, label) {
  amt = Math.round(amt);
  if (amt <= 0 || !memberAlive(m)) return;
  if (m.player) { healHero(amt); return; }
  m.hp = Math.min(m.maxHp, m.hp + amt);
  if (S.numbers) fct(m.x + rand(-8, 8), G.groundY - 150, '+' + fmt(amt), '#5aff6a', 13);
  if (label) fct(m.x, G.groundY - 172, label, '#7dff8a', 11);
}
// Lowest-health living member (by %), optionally only below a threshold
function lowestMember(below) {
  let best = null, bp = below == null ? 2 : below;
  for (const m of G.party) if (memberAlive(m)) { const p = memberPct(m); if (p < bp) { bp = p; best = m; } }
  return best;
}

// A bot's attack: like damage() but with the bot's own numbers (no player procs)
function botHit(e, amt, school, b, label) {
  if (!alive(e)) return;
  const diff = e.lv - b.level;
  if (diff > 0) amt *= Math.max(0.4, 1 - 0.06 * diff);
  const crit = Math.random() < 0.08;
  const dmg = Math.max(1, Math.round(amt * (crit ? 1.5 : 1) * rand(0.9, 1.1)));
  e.hp -= dmg; e.hit = Math.max(e.hit, 0.6);
  if (S.numbers) fct(e.x + rand(-20, 20), enemyY(e) - 30, fmt(dmg) + (crit ? '!' : ''), shade(SCHOOL_COLORS[school] || '#ffffff', 0.8), crit ? 16 : 12);
  if (label) fct(b.x, G.groundY - 172, label, '#ffd27a', 11);
  if (e.hp <= 0) killEnemy(e, calc());
}
const SCHOOL_PROJ = { fire: 'fireball', frost: 'frostbolt', shadow: 'shadowbolt', arcane: 'arcane', holy: 'holy', nature: 'wrath' };

// Every frame inside a dungeon
function partyTick(dt, e) {
  const fighting = alive(e) && e.state === 'fight';
  // The rest of the raid: steady damage on the enemy and healing on whoever needs it, once a second
  const rb = G.run && raidBacking(dungeonById(G.run.id));
  if (rb && fighting) {
    G.run.rbT = (G.run.rbT || 0) - dt;
    if (G.run.rbT <= 0) {
      G.run.rbT += 1;
      const dmg = Math.round(rb.dps * rand(0.85, 1.15));
      launchProjectile(pick(['fireball', 'frostbolt', 'arrow', 'shadowbolt', 'holy']), e, () => {}, false, { x: -10, y: G.groundY - 60 - Math.random() * 90 });
      e.hp -= dmg; e.hit = Math.max(e.hit, 0.3);
      if (S.numbers && Math.random() < 0.35) fct(e.x + rand(-30, 30), enemyY(e) - 60, fmt(dmg), '#e8c890', 11);
      const m = lowestMember(0.85);
      if (m) healMember(m, rb.hps * rand(0.85, 1.15));
      if (e.hp <= 0) killEnemy(e, calc());
    }
  }
  for (const b of G.party) {
    if (b.player) continue;
    b.hurt = Math.max(0, b.hurt - dt * 3);
    b.castT = Math.max(0, b.castT - dt);
    if (b.swing >= 0) { b.swing += dt / 0.36; if (b.swing >= 1) b.swing = -1; }
    b.feared = Math.max(0, b.feared - dt);
    if (b.dead) continue;
    if (b.hot) { b.hot.t -= dt; if (b.hot.t <= 0) { b.hot.t += 3; b.hot.left -= 3; healMember(b, b.hot.per); if (b.hot.left <= 0) b.hot = null; } }
    if (!fighting) {   // between fights: eat and drink
      b.hp = Math.min(b.maxHp, b.hp + b.maxHp * 0.04 * dt);
      b.mana = Math.min(b.maxMana, b.mana + b.maxMana * 0.05 * dt);
      continue;
    }
    b.mana = Math.min(b.maxMana, b.mana + b.maxMana * 0.006 * dt);
    if (b.feared > 0) continue;
    b.t -= dt;
    if (b.t > 0) continue;
    if (b.role === 'heal') {
      const m = lowestMember(0.9), cost = m ? b.hps * 2 * b.manaPerHp : 0;
      if (m && b.mana >= cost && b.hps > 0) {
        const sp = b.healSpells.length ? b.healSpells[b.si++ % b.healSpells.length] : { name: 'Bandage' };
        healMember(m, b.hps * 2 * rand(0.85, 1.15), sp.name);
        b.mana -= cost; b.castT = 1.6; b.t = 2;
        continue;
      }
    }
    // Attack with one of the bot's own spells (or a plain swing)
    const list = b.dmgSpells.length ? b.dmgSpells : [{ name: 'Attack', school: 'physical' }];
    const sp = b.si++ % 3 === 0 ? list[(b.si / 3 | 0) % list.length] : null;
    const school = sp ? sp.school : b.melee ? 'physical' : (b.dmgSpells.find(s => s.school !== 'physical') || { school: 'physical' }).school;
    const every = b.melee ? 2 : 2.2;
    const amt = b.dps * every;
    b.t = every * rand(0.9, 1.1);
    if (b.melee || school === 'physical' && !(sp && sp.proj)) { b.swing = 0; botHit(e, amt, school, b, sp && sp.name); }
    else {
      b.castT = 1;
      const type = (sp && sp.proj) || SCHOOL_PROJ[school] || (b.cls === 'hunter' ? 'arrow' : 'wand');
      launchProjectile(type, e, () => botHit(e, amt, school, b, null), false, { x: b.x + 20, y: G.groundY - 100 });
      if (sp) fct(b.x, G.groundY - 172, sp.name, '#ffd27a', 11);
    }
  }
}

// Between pulls: a living healer brings the dead back
function partyRez() {
  const healer = G.party.find(m => m.role === 'heal' && memberAlive(m) && (m.player ? playerFit('heal') > 0 : true));
  if (!healer) return;
  for (const b of G.party) if (!b.player && b.dead) {
    b.dead = false; b.hp = b.maxHp * 0.5; b.mana = b.maxMana * 0.5;
    fct(b.x, G.groundY - 160, 'Resurrected', '#ffe47a', 13);
    log(`<b>${esc(healer.player ? S.name : healer.name)}</b> resurrects ${esc(b.name)}.`, 'sys');
  }
}
// Is the group ready for the next pull?
function partyRested(boss) {
  const R = DUNGEON_REST;
  const hpMin = boss ? R.bossHp : R.hp, manaMin = boss ? R.bossMana : R.mana;
  for (const m of G.party) {
    if (!memberAlive(m) || m.player) continue;
    if (m.hp < m.maxHp * hpMin) return false;
    if (m.role === 'heal' && m.maxMana && m.mana < m.maxMana * manaMin) return false;
  }
  return true;
}

// ---------- player as healer ----------
function playerHealSpells() { return abilities().filter(a => knownRanks(a) && (a.heal || a.hot) && !a.cd && a.kind !== 'buff'); }
// Returns true if the player started a heal (or is busy healing)
function healerBrain(st) {
  if (G.gcd > 0 || G.cast) return !!G.cast;
  const m = lowestMember(0.92);
  if (!m) return false;
  const spells = playerHealSpells().filter(a => poolValue(a) >= abCost(a, st));
  if (!spells.length) return false;
  const pct = memberPct(m), hasHot = m.player ? false : !!m.hot;
  const hot = spells.find(a => a.hot);
  const direct = spells.filter(a => a.heal).sort((a, b) => b.heal - a.heal)[0];
  const ab = pct > 0.6 && hot && !hasHot && !(m.player && G.buffs.some(b => b.id === hot.id)) ? hot : direct || hot;
  if (!ab) return false;
  const cost = abCost(ab, st);
  if (isPool(ab) === 'mana') S.mana -= cost; else S.res -= cost;
  G.gcd = gcdLen();
  const total = ab.cast ? ab.cast / st.haste : 0;
  if (total > 0) G.cast = { ab, t: 0, total, partyHeal: true, target: m };
  else resolvePartyHeal(ab, m, st);
  return true;
}
function resolvePartyHeal(ab, m, st) {
  const f = healEff(playerFit('heal')), rf = rankFactor(ab);
  const name = abName(ab);
  fct(G.heroX + 30, G.groundY - 175, name, '#7dff8a', 13);
  if (ab.hot) {
    const total = st.H * ab.hot.heal * rf * (1 + fxv(st, 'heal')) * f;
    if (m.player) addBuff({ id: ab.id, name, icon: ab.icon, left: ab.hot.dur, max: ab.hot.dur, hot: { per: total / (ab.hot.dur / 3), every: 3, t: 3 } });
    else m.hot = { per: total / (ab.hot.dur / 3), t: 3, left: ab.hot.dur };
  }
  if (ab.heal) {
    const crit = Math.random() < st.spellCrit;
    healMember(m, st.H * ab.heal * rf * (1 + fxv(st, 'heal')) * f * (crit ? 1.5 : 1));
  }
}

// ---------- drawing ----------
function drawParty(ctx) {
  const gy = G.groundY;
  for (const b of G.party) {
    if (b.player) continue;
    if (b.dead) { drawTombstone(ctx, b.x, gy, G.t); continue; }
    const cast = b.castT > 0 && !b.melee ? { p: 1 - b.castT, color: SCHOOL_COLORS[(b.role === 'heal' ? (b.healSpells[0] || {}).school : (b.dmgSpells.find(s => s.school !== 'physical') || {}).school)] || '#ffffff' } : null;
    drawCharacter(ctx, b.x, gy, G.t + b.x * 0.01, { walking: G.walking, swing: b.swing, big: false, hurt: b.hurt, cast, ranged: b.cls === 'hunter', shoot: b.cls === 'hunter' && b.castT > 0 ? 0.6 : 0, scale: 0.92 }, b.look);
    // health bar over the head
    const w = 34, y = gy - 150;
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(b.x - w / 2 - 1, y - 1, w + 2, 6);
    ctx.fillStyle = b.hp / b.maxHp > 0.35 ? '#3fc84a' : '#e0402a'; ctx.fillRect(b.x - w / 2, y, w * clamp(b.hp / b.maxHp, 0, 1), 4);
  }
}

// Party frames under the player frame
function partyFramesUpdate() {
  const el = $('#party');
  if (!el) return;
  const bots = G.party ? G.party.filter(m => !m.player) : [];
  const rbk = G.run && raidBacking(dungeonById(G.run.id));
  const key = bots.map(b => b.id).join() + (rbk ? ':raid' : '');
  if (G.hud.partyKey !== key) {
    G.hud.partyKey = key;
    el.innerHTML = (rbk ? `<div class="pf pf-raid"><span class="pf-role">⚔️</span><span class="pf-name">Raid: ${rbk.n} more players · strength ${Math.round(rbk.gf * 100)}%</span></div>` : '') + bots.map(b => `<div class="pf" data-bot="${b.id}"><span class="pf-role">${ROLES[b.role].icon}</span>${classIconHTML(b.cls, 'pf-ci')}<div class="pf-bars"><span class="pf-name" style="color:${CLASSES[b.cls].color}">${esc(b.name)}</span><div class="pf-hp"><i></i></div>${b.role === 'heal' ? '<div class="pf-mp"><i></i></div>' : ''}</div></div>`).join('');
    el.classList.toggle('hidden', !bots.length);
  }
  for (const b of bots) {
    const f = el.querySelector(`[data-bot="${b.id}"]`);
    if (!f) continue;
    f.classList.toggle('dead', b.dead);
    f.querySelector('.pf-hp i').style.width = (100 * clamp(b.hp / b.maxHp, 0, 1)).toFixed(1) + '%';
    const mp = f.querySelector('.pf-mp i');
    if (mp) mp.style.width = (100 * clamp(b.mana / (b.maxMana || 1), 0, 1)).toFixed(1) + '%';
  }
}

// ---------- draft view (inside the Dungeons tab) ----------
function panelDraft() {
  const D = G.draft, d = dungeonById(D.id), L = botLevelFor(d);
  const myFit = r => playerFit(r);
  const spec = specName() || cls().name;
  const roleBtns = Object.keys(ROLES).map(r => `<button class="drole${D.role === r ? ' sel' : ''}" data-act="draftRole" data-v="${r}">
      <span class="dr-icon">${ROLES[r].icon}</span><b>${ROLES[r].name}</b>
      <span class="fit ${roleFitClass(myFit(r))}">${esc(spec)} ${cls().name}: ${roleFitLabel(myFit(r))}</span></button>`).join('');
  const picked = D.picks.map(id => D.pool.find(b => b.id === id));
  const slot = (role, b) => b ? botChip(b) : `<span class="dslot empty">${ROLES[role].icon} ${ROLES[role].name}</span>`;
  const slots = [];
  for (const r of Object.keys(ROLES)) {
    const p = draftPicked(r);
    if (D.role === r) slots.push(`<span class="dslot me">${ROLES[r].icon} You (${esc(S.name)})</span>`);
    for (let k = 0; k < slotsFor(r, D.role); k++) slots.push(slot(r, p[k]));
  }
  const cards = Object.keys(ROLES).map(r => `<div class="dpool-role"><h5>${ROLES[r].icon} ${ROLES[r].plural}</h5>${D.pool.filter(b => b.role === r).map(b => `
      <button class="dbot${D.picks.includes(b.id) ? ' sel' : ''}" data-act="draftPick" data-v="${b.id}">
        ${classIconHTML(b.cls, 'db-ci')}
        <span class="db-txt"><b style="color:${CLASSES[b.cls].color}">${esc(b.name)}</b><span>${esc(RACES.find(x => x.id === b.race).name)} ${esc(specNameOf(b.cls, b.spec))} ${CLASSES[b.cls].name} · ${b.level}</span></span>
        <span class="fit ${roleFitClass(b.fit)}">${'★'.repeat(b.fit >= 0.9 ? 3 : b.fit >= 0.7 ? 2 : 1)} ${roleFitLabel(b.fit)}</span>
      </button>`).join('')}</div>`).join('');
  const gs = groupStrength(d, D.role, picked);
  const bar = (label, v) => `<div class="gs"><span>${label}</span><div class="gs-bar"><i class="${v >= 1 ? 'ok' : v >= 0.75 ? 'meh' : 'bad'}" style="width:${Math.round(v / 1.5 * 100)}%"></i><em></em></div><b>${Math.round(v * 100)}%</b></div>`;
  const full = draftFull();
  const worst = full ? Object.entries(gs).sort((a, b) => a[1] - b[1])[0] : null;
  const verdict = !full ? 'Fill every slot to see how your group measures up.'
    : worst[1] >= 1 ? 'This group should handle the dungeon.'
    : { tank: 'Your tank will struggle to survive the bosses.', heal: 'Your healing won\'t keep up with the damage.', dps: 'Your damage is low: fights will drag on and drain your healer.' }[worst[0]];
  return `<h3>Group Finder — ${esc(d.name)} <span class="muted">Levels ${d.min}–${d.max} · party members are level ${L}</span></h3>
    <h5 class="dsub">Your role</h5><div class="droles">${roleBtns}</div>
    <h5 class="dsub">Your group</h5><div class="dslots">${slots.join('')}</div>
    <div class="gstrength">${bar('Tank', gs.tank)}${bar('Healing', gs.heal)}${bar('Damage', gs.dps)}<p class="small">${verdict}</p></div>
    <div class="btns">
      <button class="btn primary" data-act="draftEnter" ${full ? '' : 'disabled'}>Enter Dungeon</button>
      <button class="btn" data-act="draftBest">Best Group</button>
      <button class="btn" data-act="draftReroll" ${D.rerolled ? 'disabled' : ''}>New Players</button>
      ${S.lastParty && S.lastParty.length ? '<button class="btn" data-act="draftLast">Last Group</button>' : ''}
      <button class="btn" data-act="draftBack">Back</button>
    </div>
    <h5 class="dsub">Looking for group</h5><div class="dpool">${cards}</div>`;
}
const botChip = b => `<span class="dslot" style="border-color:${CLASSES[b.cls].color}">${ROLES[b.role].icon} <b style="color:${CLASSES[b.cls].color}">${esc(b.name)}</b> <span class="fit ${roleFitClass(b.fit)}">${roleFitLabel(b.fit)}</span></span>`;
