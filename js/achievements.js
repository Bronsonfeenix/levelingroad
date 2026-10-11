// =====================================================================
//  The Leveling Road — achievements & titles
//  Achievements are account-wide (like in later WoW): every character
//  contributes, points give a small capped bonus, some unlock titles.
//  Most checks read the character or ACC.stats; achCheck() runs every
//  2 seconds and right after important events.
// =====================================================================
'use strict';

const ACH_BONUS = { per: 100, step: 0.01, max: 0.10 };   // +1% XP and gold per 100 points, up to +10%
const ACH_CATS = [
  ['summary', 'Summary'], ['general', 'General'], ['quests', 'Quests'], ['exploration', 'Exploration'],
  ['dungeons', 'Dungeons'], ['raids', 'Raids'], ['collections', 'Collections'], ['characters', 'Characters'], ['feats', 'Feats of Strength'],
];
// %s is the character's name
const TITLES = {
  explorer: '%s the Explorer', loremaster: 'Loremaster %s', seeker: '%s the Seeker', dungeon_master: '%s, Dungeon Master',
  kingslayer: '%s the Kingslayer', undying: '%s the Undying', jenkins: '%s Jenkins', patient: '%s the Patient',
  scarab_lord: 'Scarab Lord %s', frozen_wastes: '%s, Champion of the Frozen Wastes', blackwing: "%s, Blackwing's Bane",
};
const titleName = (id, name) => TITLES[id] ? TITLES[id].replace('%s', name) : name;
const titleOnly = id => TITLES[id] ? TITLES[id].replace('%s', '').replace(/^,?\s+|\s+$/g, '') : '';

// ---------- account statistics ----------
function freshStats() { return { kills: 0, elites: 0, deaths: 0, quests: 0, gold: 0, bossKills: {}, clears: {}, fastest: {}, roleClears: { tank: 0, heal: 0, dps: 0 }, flawless: 0 }; }
// First time: build the statistics from every saved character, so old progress counts
function ensureStats() {
  if (!ACC || ACC.stats) return;
  const st = freshStats();
  for (const c of ACC.characters) {
    const d = (S && S.charId === c.id) ? S : loadCharacter(c.id);
    if (!d) continue;
    st.kills += d.kills || 0; st.elites += d.elites || 0; st.deaths += d.deaths || 0;
    st.quests += (d.questsDone || []).length; st.gold += d.earned || 0;
    for (const id in d.dungeons || {}) if (d.dungeons[id].clears) st.clears[id] = (st.clears[id] || 0) + d.dungeons[id].clears;
  }
  ACC.stats = st;
  saveAccount();
}
const stats = () => { ensureStats(); return ACC.stats; };

// Per character: zones visited
function seedZonesSeen() {
  if (Array.isArray(S.zonesSeen) && S.zonesSeen.length) return;
  const seen = new Set([S.zoneId]);
  for (const id of S.questsDone || []) { const q = questById(id); if (q) seen.add(q.zone); }
  S.zonesSeen = [...seen];
}
function noteZone(id) { if (S && !G.inBot && id && !S.zonesSeen.includes(id)) S.zonesSeen.push(id); }

// ---------- event hooks ----------
function achOnKill(e) {
  if (G.inBot) return;
  const s = stats();
  s.kills++; if (e.elite) s.elites++;
  if (e.boss) { s.bossKills[e.boss.name] = (s.bossKills[e.boss.name] || 0) + 1; achSoon(); }
}
function achOnDeath() { stats().deaths++; achSoon(); }
function achOnQuest() { stats().quests++; achSoon(); }
function achOnClear(r) {
  const s = stats();
  s.clears[r.id] = (s.clears[r.id] || 0) + 1;
  if (!s.fastest[r.id] || r.t < s.fastest[r.id]) s.fastest[r.id] = Math.round(r.t);
  if (G.partyRole) s.roleClears[G.partyRole] = (s.roleClears[G.partyRole] || 0) + 1;
  if (!r.deaths) s.flawless++;
  saveAccount(); achSoon();
}
const achSoon = () => { G.achT = 1.9; };   // check on the next tick

// ---------- the achievements ----------
const ACHIEVEMENTS = [];
const A = (cat, id, name, desc, pts, icon, check, extra) => ACHIEVEMENTS.push(Object.assign({ cat, id, name, desc, pts, icon, check }, extra || {}));
const countOf = (n, cur) => [Math.min(n, cur), n];

// General
for (const L of [10, 20, 30, 40, 50, 60]) A('general', 'level' + L, `Level ${L}`, `Reach level ${L}.`, L === 60 ? 25 : 10, '⭐', () => S.level >= L, { prog: () => countOf(L, S.level) });
for (const [n, nm] of [[1000, 'Slayer'], [10000, 'Butcher'], [50000, 'Annihilator']]) A('general', 'kills' + n, `${nm}`, `Slay ${n.toLocaleString('en-US')} enemies (account).`, n >= 50000 ? 25 : 10, '⚔️', () => stats().kills >= n, { prog: () => countOf(n, stats().kills) });
for (const n of [10, 100, 500]) A('general', 'elites' + n, `Elite Hunter${n > 10 ? (n > 100 ? ' III' : ' II') : ''}`, `Slay ${n} elite enemies (account).`, n >= 500 ? 20 : 10, '💀', () => stats().elites >= n, { prog: () => countOf(n, stats().elites) });
for (const g of [100, 1000, 10000]) A('general', 'gold' + g, g === 100 ? 'Got My Mind On My Money' : g === 1000 ? 'A Tidy Sum' : 'Gold Baron', `Earn ${g.toLocaleString('en-US')} gold (account).`, g >= 10000 ? 25 : 10, '💰', () => stats().gold >= g * 10000, { prog: () => countOf(g, Math.floor(stats().gold / 10000)) });
A('general', 'talents31', 'Deep Roots', 'Spend 31 talent points in one tree.', 10, '🌳', () => [0, 1, 2].some(i => treePoints(i) >= 31));
A('general', 'riding1', 'Giddy Up!', 'Learn Apprentice Riding.', 10, '🐎', () => (S.riding || 0) >= 1);
A('general', 'riding2', 'Fast and Furious', 'Learn Journeyman Riding.', 10, '🏇', () => (S.riding || 0) >= 2);
A('general', 'survivor', 'Survivor', 'Reach level 20 without dying.', 10, '🛡️', () => S.level >= 20 && S.deaths === 0);

// Quests
const routeQuestZones = () => zonesForChar().filter(z => (QUESTS[z.id] || []).length);
for (const z of ZONES) if (QUESTS[z.id]) A('quests', 'q_' + z.id, `${z.name} Quests`, `Complete every quest in ${z.name}.`, 10, '📜',
  () => QUESTS[z.id].every(q => S.questsDone.includes(q.id)), { faction: z.faction, prog: () => countOf(QUESTS[z.id].length, QUESTS[z.id].filter(q => S.questsDone.includes(q.id)).length) });
for (const n of [50, 100, 250]) A('quests', 'quests' + n, n === 250 ? 'The Seeker' : `${n} Quests`, `Complete ${n} quests (account).`, n === 250 ? 25 : 10, '📖', () => stats().quests >= n, { prog: () => countOf(n, stats().quests), title: n === 250 ? 'seeker' : null });
A('quests', 'loremaster', 'Loremaster', 'Complete every quest along your faction\'s route on one character.', 25, '📚',
  () => routeQuestZones().every(z => QUESTS[z.id].every(q => S.questsDone.includes(q.id))),
  { title: 'loremaster', criteria: () => routeQuestZones().map(z => [z.name, QUESTS[z.id].every(q => S.questsDone.includes(q.id))]) });

// Exploration
A('exploration', 'explorer', 'Explorer', 'Visit every zone along your faction\'s route.', 25, '🗺️',
  () => zonesForChar().every(z => S.zonesSeen.includes(z.id)), { title: 'explorer', criteria: () => zonesForChar().map(z => [z.name, S.zonesSeen.includes(z.id)]) });
A('exploration', 'traveler', 'World Traveler', 'Visit 5 zones on one character.', 10, '🧭', () => S.zonesSeen.length >= 5, { prog: () => countOf(5, S.zonesSeen.length) });
for (const z of ZONES) if (z.min >= 10) A('exploration', 'visit_' + z.id, `Explore ${z.name}`, `Visit ${z.name}.`, 5, '🏞️', () => S.zonesSeen.includes(z.id), { faction: z.faction });

// Dungeons
for (const d of DUNGEONS) A('dungeons', 'd_' + d.id, d.name, `Defeat every boss in ${d.name}.`, 10, '🏰', () => (stats().clears[d.id] || 0) > 0, { faction: d.faction });
for (const [boss, nm, pts] of [['Edwin VanCleef', 'The Defias Brotherhood', 10], ['Archmage Arugal', 'Arugal\'s Folly', 10], ['Mutanus the Devourer', 'The Nightmare Ends', 10], ['Herod', 'Blades of Light', 10],
  ['High Inquisitor Whitemane', 'Scarlet Fall', 10], ['Darkmaster Gandling', 'Detention', 15], ['Baron Rivendare', 'The Baron\'s Last Ride', 15]]) {
  A('dungeons', 'boss_' + boss.replace(/\W/g, ''), nm, `Defeat ${boss}.`, pts, '☠️', () => (stats().bossKills[boss] || 0) > 0);
}
A('dungeons', 'kingslayer', 'Kingslayer', 'Defeat Emperor Dagran Thaurissan in Blackrock Depths.', 20, '👑', () => (stats().bossKills['Emperor Dagran Thaurissan'] || 0) > 0, { title: 'kingslayer' });
for (const r of ['tank', 'heal', 'dps']) A('dungeons', 'role_' + r, { tank: 'Hold the Line', heal: 'Keeping Them Alive', dps: 'Pure Damage' }[r], `Clear a dungeon as the group's ${ROLES[r].name.toLowerCase()}.`, 10, { tank: '🛡️', heal: '💚', dps: '⚔️' }[r], () => (stats().roleClears[r] || 0) > 0);
A('dungeons', 'flawless', 'Flawless Victory', 'Clear a dungeon without anyone in your group dying.', 15, '✨', () => stats().flawless > 0);
A('dungeons', 'speedrun', 'Speed Run', 'Clear a dungeon in under 4 minutes.', 15, '⏱️', () => Object.values(stats().fastest).some(t => t < 240));
A('dungeons', 'dungeon_master', 'Dungeon Master', 'Clear every dungeon your faction can enter.', 25, '🗝️',
  () => dungeonsForChar().every(d => (stats().clears[d.id] || 0) > 0), { title: 'dungeon_master', criteria: () => dungeonsForChar().map(d => [d.short || d.name, (stats().clears[d.id] || 0) > 0]) });

// Raids
for (const d of RAIDS) A('raids', 'r_' + d.id, d.name, `Defeat every boss in ${d.name}.`, d.size >= 40 ? 25 : 20, '🐉', () => (stats().clears[d.id] || 0) > 0);
for (const [boss, nm, pts, title] of [['Ragnaros', 'The Firelord Falls', 20], ['Onyxia', 'Onyxia\'s Lair', 15], ['Hakkar the Soulflayer', 'The Soulflayer', 15],
  ['Nefarian', 'Blackwing\'s Bane', 25, 'blackwing'], ['C\'Thun', 'The Old God', 25, 'scarab_lord'], ['Kel\'Thuzad', 'The Fall of Naxxramas', 30, 'frozen_wastes']]) {
  A('raids', 'rboss_' + boss.replace(/\W/g, ''), nm, `Defeat ${boss}.`, pts, '👑', () => (stats().bossKills[boss] || 0) > 0, title ? { title } : null);
}
for (let t = 0; t < 4; t++) A('raids', 'tierset' + t, `${['Tier 0', 'Tier 1', 'Tier 2', 'Tier 3'][t]} Complete`, `Wear all 8 pieces of your class's ${['Tier 0', 'Tier 1', 'Tier 2', 'Tier 3'][t]} set.`, t ? 20 : 15, '🛡️',
  () => (equippedSets()[tierSetId(t, S.cls)] || 0) >= 8, { prog: () => countOf(8, equippedSets()[tierSetId(t, S.cls)] || 0) });

// Collections
for (const n of [5, 10, 20]) A('collections', 'mounts' + n, n === 20 ? 'Stable Keeper' : n === 10 ? 'Leading the Cavalry' : 'Mountain o\' Mounts', `Collect ${n} mounts.`, n === 20 ? 20 : 10, '🐴', () => ACC.collections.mounts.length >= n, { prog: () => countOf(n, ACC.collections.mounts.length) });
for (const n of [5, 10, 20]) A('collections', 'pets' + n, n === 20 ? 'Menagerie' : n === 10 ? 'Plenty of Pets' : 'Can I Keep Him?', `Collect ${n} companion pets.`, n === 20 ? 20 : 10, '🐾', () => ACC.collections.pets.length >= n, { prog: () => countOf(n, ACC.collections.pets.length) });
for (const n of [4, 8]) A('collections', 'tabards' + n, n === 8 ? 'Tabard Collector' : 'Represent', `Collect ${n} tabards.`, 10, '🎽', () => ACC.collections.tabards.length >= n, { prog: () => countOf(n, ACC.collections.tabards.length) });
A('collections', 'epic_mount', 'Swift and Mighty', 'Obtain an epic mount.', 10, '🏇', () => ACC.collections.mounts.some(id => (mountById(id) || {}).tier === 2));

// Characters (account)
for (const n of [2, 3, 5]) A('characters', 'chars' + n, n === 2 ? 'Second Wind' : n === 3 ? 'Altoholic' : 'Army of One', `Create ${n} characters.`, 10, '👥', () => ACC.characters.length >= n, { prog: () => countOf(n, ACC.characters.length) });
A('characters', 'classes5', 'Jack of All Trades', 'Have characters of 5 different classes.', 15, '🎭', () => new Set(ACC.characters.map(c => c.cls)).size >= 5, { prog: () => countOf(5, new Set(ACC.characters.map(c => c.cls)).size) });
A('characters', 'two60', 'Double Trouble', 'Have two characters at level 60.', 20, '🏅', () => ACC.characters.filter(c => c.level >= CONFIG.LEVEL_CAP).length >= 2, { prog: () => countOf(2, ACC.characters.filter(c => c.level >= CONFIG.LEVEL_CAP).length) });
A('characters', 'races', 'United Races', 'Have a character of every race of your faction.', 15, '🌍', () => RACES.filter(r => r.faction === S.faction).every(r => ACC.characters.some(c => c.race === r.id)),
  { criteria: () => RACES.filter(r => r.faction === S.faction).map(r => [r.name, ACC.characters.some(c => c.race === r.id)]) });

// Feats of Strength (no points, only shown once earned)
A('feats', 'feat_deathcharger', 'Deathcharger\'s Reins', 'Obtained the Deathcharger from Baron Rivendare.', 0, '💀', () => ACC.collections.mounts.includes('deathcharger'));
A('feats', 'feat_undying', 'The Undying', 'Reached level 60 without dying.', 0, '🔥', () => S.level >= CONFIG.LEVEL_CAP && S.deaths === 0, { title: 'undying' });
A('feats', 'feat_jenkins', 'Jenkins', 'Died 50 times. At least you have chicken.', 0, '🍗', () => stats().deaths >= 50, { title: 'jenkins' });
A('feats', 'feat_patient', 'The Patient', 'Played one character for 24 hours.', 0, '⌛', () => S.playTime >= 86400, { title: 'patient' });

const achById = id => ACHIEVEMENTS.find(a => a.id === id);
const achEarned = id => !!(ACC && ACC.achievements[id]);
// Achievements that belong to the other faction are hidden (and don't count towards totals)
const achVisible = a => !a.faction || a.faction === 'both' || a.faction === S.faction || achEarned(a.id);
function achPoints() { let p = 0; for (const id in ACC.achievements) { const a = achById(id); if (a) p += a.pts; } return p; }
function achFx() {
  if (!ACC) return {};
  const b = Math.min(ACH_BONUS.max, Math.floor(achPoints() / ACH_BONUS.per) * ACH_BONUS.step);
  return { xp: b, gold: b };
}

// ---------- checking & earning ----------
function achCheck() {
  if (!S || !ACC || G.inBot) return;
  ensureStats();
  // gold earned since the last check
  if (G.achEarned == null || G.achEarned > S.earned) G.achEarned = S.earned;
  if (S.earned > G.achEarned) { ACC.stats.gold += S.earned - G.achEarned; G.achEarned = S.earned; }
  let any = false;
  for (const a of ACHIEVEMENTS) {
    if (achEarned(a.id)) continue;
    let ok = false;
    try { ok = a.check(); } catch (e) { ok = false; }
    if (ok) { earnAchievement(a); any = true; }
  }
  if (any) { invalidate(); markDirty(); }
}
function earnAchievement(a) {
  ACC.achievements[a.id] = Date.now();
  if (a.title && !ACC.titles.includes(a.title)) ACC.titles.push(a.title);
  saveAccount();
  log(`<b class="ach">Achievement earned: [${esc(a.name)}]</b>${a.pts ? ` (+${a.pts} points)` : ''}${a.title ? ` — new title: <b>${esc(titleOnly(a.title))}</b>` : ''}`, 'ach');
  (G.achQueue = G.achQueue || []).push(a);
  showAchToast();
}

// ---------- toast ----------
let achToastTimer = 0;
function showAchToast() {
  const el = $('#achToast');
  if (!el || el.classList.contains('show') || !(G.achQueue || []).length) return;
  const a = G.achQueue.shift();
  el.innerHTML = `<span class="at-ico">${iconHTML('icons/achievements/' + iconFileName(a.name), a.icon, 'ach-img', 'ach-fb')}</span>
    <span class="at-txt"><small>${a.cat === 'feats' ? 'Feat of Strength' : 'Achievement Earned'}</small><b>${esc(a.name)}</b></span>
    <span class="at-pts">${a.pts || ''}</span>`;
  el.classList.add('show');
  clearTimeout(achToastTimer);
  achToastTimer = setTimeout(() => { el.classList.remove('show'); setTimeout(showAchToast, 500); }, 4200);
}

// ---------- titles ----------
function setTitle(id) { S.title = id && ACC.titles.includes(id) ? id : null; markDirty(); G.hud.pname = null; }
const displayName = () => S.title ? titleName(S.title, S.name) : S.name;
function titleSelectHTML() {
  if (!ACC.titles.length) return '<span class="muted small">Earn achievements to unlock titles.</span>';
  return `<select data-act="setTitle"><option value="">No title</option>${ACC.titles.map(t => `<option value="${t}" ${S.title === t ? 'selected' : ''}>${esc(titleName(t, S.name))}</option>`).join('')}</select>`;
}

// ---------- Achievements tab ----------
function achRow(a) {
  const earned = achEarned(a.id);
  const p = !earned && a.prog ? a.prog() : null;
  const crit = a.criteria ? a.criteria() : null;
  return `<div class="ach${earned ? ' done' : ''}">
    <span class="ach-ico">${iconHTML('icons/achievements/' + iconFileName(a.name), a.icon, 'ach-img', 'ach-fb')}</span>
    <div class="ach-body">
      <b class="ach-name">${esc(a.name)}</b>
      <span class="ach-desc">${esc(a.desc)}</span>
      ${p ? `<div class="ach-bar"><i style="width:${Math.round(100 * p[0] / p[1])}%"></i><span>${fmt(p[0])} / ${fmt(p[1])}</span></div>` : ''}
      ${crit ? `<div class="ach-crit">${crit.map(([n, ok]) => `<span class="${ok ? 'ok' : ''}">${esc(n)}</span>`).join('')}</div>` : ''}
      ${a.title ? `<span class="ach-reward">Title reward: ${esc(titleOnly(a.title))}</span>` : ''}
    </div>
    <div class="ach-side">${a.pts ? `<span class="ach-shield"><span>${a.pts}</span></span>` : ''}${earned ? `<span class="ach-date">${new Date(ACC.achievements[a.id]).toLocaleDateString()}</span>` : ''}</div>
  </div>`;
}
function panelAchievements() {
  ensureStats();
  const cat = G.achCat || 'summary';
  const visible = ACHIEVEMENTS.filter(a => a.cat !== 'feats' && achVisible(a));
  const done = visible.filter(a => achEarned(a.id)).length;
  const pts = achPoints(), maxPts = visible.reduce((s, a) => s + a.pts, 0), fx = achFx();
  const catPts = c => ACHIEVEMENTS.filter(a => a.cat === c && achEarned(a.id)).reduce((s, a) => s + a.pts, 0);
  const nav = ACH_CATS.map(([id, nm]) => `<button class="achcat${cat === id ? ' sel' : ''}" data-act="achCat" data-v="${id}">${nm}${id !== 'summary' && id !== 'feats' ? `<em>${catPts(id)}</em>` : ''}</button>`).join('');
  const navSel = `<select class="achcat-sel" data-act="achCatSel">${ACH_CATS.map(([id, nm]) => `<option value="${id}" ${cat === id ? 'selected' : ''}>${nm}</option>`).join('')}</select>`;
  let body;
  if (cat === 'summary') {
    const recent = Object.entries(ACC.achievements).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => achById(id)).filter(Boolean);
    const nextAt = fx.xp >= ACH_BONUS.max ? null : (Math.floor(pts / ACH_BONUS.per) + 1) * ACH_BONUS.per;
    body = `<div class="achsum">
        <div class="achsum-pts"><span class="ach-shield big"><span>${pts}</span></span><div><b>${pts} / ${maxPts} points</b><span>${done} of ${visible.length} achievements</span>
          <div class="ach-bar"><i style="width:${Math.round(100 * done / Math.max(1, visible.length))}%"></i><span>${Math.round(100 * done / Math.max(1, visible.length))}%</span></div></div></div>
        <p>Account bonus: <b>+${Math.round(fx.xp * 100)}% experience and gold</b>${nextAt ? ` · next +1% at ${nextAt} points` : ' (maximum)'}</p>
        <p>Title: ${titleSelectHTML()}</p>
      </div>
      <h4 class="csec">Recent achievements</h4>${recent.length ? recent.map(achRow).join('') : '<p class="muted">None yet. Keep playing!</p>'}`;
  } else {
    const list = ACHIEVEMENTS.filter(a => a.cat === cat && achVisible(a) && (cat !== 'feats' || achEarned(a.id)));
    list.sort((a, b) => (achEarned(b.id) ? 1 : 0) - (achEarned(a.id) ? 1 : 0) || 0);
    body = list.length ? list.map(achRow).join('') : '<p class="muted">Feats of Strength are rare deeds. None yet.</p>';
  }
  return `<h3>Achievements <span class="muted">— shared by all your characters</span></h3>
    <div class="achwrap"><div class="achnav">${nav}${navSel}</div><div class="achlist">${body}</div></div>`;
}
