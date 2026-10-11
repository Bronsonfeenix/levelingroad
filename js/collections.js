// =====================================================================
//  The Leveling Road — mounts & collections
//  Riding is trained per character; mounts, companion pets and tabards are
//  collected for the whole account. The hero rides between fights, and the
//  collection gives small, capped account bonuses.
// =====================================================================
'use strict';

const RIDING = [
  null,
  { name: 'Apprentice Riding', level: 40, cost: 200000, speed: 0.6 },    // 20g
  { name: 'Journeyman Riding', level: 60, cost: 2000000, speed: 1.0 },   // 200g
];
const MOUNT_PRICE = [0, 100000, 1000000];   // normal 10g, epic 100g (other races of your faction: ×2)
// Collection bonuses: one step per `per` items, capped
const COLLECTION_BONUS = {
  mounts:  { key: 'travel', per: 3, step: 0.01, max: 0.05, label: 'travel speed' },
  pets:    { key: 'xp',     per: 4, step: 0.01, max: 0.05, label: 'experience' },
  tabards: { key: 'gold',   per: 2, step: 0.01, max: 0.04, label: 'gold' },
};

// shape drives drawMount() in render.js; tier 1 = normal (60%), 2 = epic (100%)
const MOUNTS = [
  { id: 'brown_horse', name: 'Brown Horse', race: 'human', tier: 1, shape: 'horse', color: '#7a4e2e', accent: '#3a2414' },
  { id: 'swift_palomino', name: 'Swift Palomino', race: 'human', tier: 2, shape: 'horse', color: '#d8b070', accent: '#f2e6c8', barding: '#2a4ab0' },
  { id: 'gray_ram', name: 'Gray Ram', race: 'dwarf', tier: 1, shape: 'ram', color: '#8a8a8a', accent: '#5a5a5a' },
  { id: 'swift_gray_ram', name: 'Swift Gray Ram', race: 'dwarf', tier: 2, shape: 'ram', color: '#a8a8a8', accent: '#6a6a6a', barding: '#2a4ab0' },
  { id: 'striped_nightsaber', name: 'Striped Nightsaber', race: 'nightelf', tier: 1, shape: 'saber', color: '#4a3a6a', accent: '#2a1e3e' },
  { id: 'swift_frostsaber', name: 'Swift Frostsaber', race: 'nightelf', tier: 2, shape: 'saber', color: '#c8d8e8', accent: '#7a8aa8', barding: '#5a3a8a' },
  { id: 'red_mechanostrider', name: 'Red Mechanostrider', race: 'gnome', tier: 1, shape: 'mech', color: '#a83228', accent: '#5a5a62' },
  { id: 'swift_green_mechanostrider', name: 'Swift Green Mechanostrider', race: 'gnome', tier: 2, shape: 'mech', color: '#3a9a3a', accent: '#8a8a92', barding: '#ffd23a' },
  { id: 'timber_wolf', name: 'Timber Wolf', race: 'orc', tier: 1, shape: 'wolf', color: '#6a5a4a', accent: '#3a2e24' },
  { id: 'swift_timber_wolf', name: 'Swift Timber Wolf', race: 'orc', tier: 2, shape: 'wolf', color: '#7a6a5a', accent: '#3a2e24', barding: '#a01e1e' },
  { id: 'brown_kodo', name: 'Brown Kodo', race: 'tauren', tier: 1, shape: 'kodo', color: '#7a6a5a', accent: '#4a3e34' },
  { id: 'great_brown_kodo', name: 'Great Brown Kodo', race: 'tauren', tier: 2, shape: 'kodo', color: '#8a6a4a', accent: '#4a3a2a', barding: '#a01e1e' },
  { id: 'emerald_raptor', name: 'Emerald Raptor', race: 'troll', tier: 1, shape: 'raptor', color: '#3a8a5a', accent: '#1e4a2e' },
  { id: 'swift_olive_raptor', name: 'Swift Olive Raptor', race: 'troll', tier: 2, shape: 'raptor', color: '#7a8a3a', accent: '#3e4a1e', barding: '#a01e1e' },
  { id: 'red_skeletal_horse', name: 'Red Skeletal Horse', race: 'undead', tier: 1, shape: 'skeletal', color: '#c8b8a0', accent: '#7a2a2a' },
  { id: 'purple_skeletal_warhorse', name: 'Purple Skeletal Warhorse', race: 'undead', tier: 2, shape: 'skeletal', color: '#d8c8b0', accent: '#5a2a7a', barding: '#3a1a4a' },
  // Class mounts (stand-in for the class quests: granted with the riding rank)
  { id: 'warhorse', name: 'Warhorse', cls: 'paladin', tier: 1, shape: 'horse', color: '#e8e0d0', accent: '#a8a090', barding: '#2a4ab0' },
  { id: 'charger', name: 'Charger', cls: 'paladin', tier: 2, shape: 'horse', color: '#f2ece0', accent: '#c8a24a', barding: '#c8a24a' },
  { id: 'felsteed', name: 'Felsteed', cls: 'warlock', tier: 1, shape: 'horse', color: '#2a1a1a', accent: '#4aff3a', fire: true },
  { id: 'dreadsteed', name: 'Dreadsteed', cls: 'warlock', tier: 2, shape: 'horse', color: '#1a0e1a', accent: '#b04aff', fire: true, barding: '#3a1a3a' },
  // Drops
  { id: 'deathcharger', name: 'Deathcharger\'s Reins', tier: 2, shape: 'skeletal', color: '#a8b0b8', accent: '#3a6a9a', barding: '#2a2a3a', boss: 'Baron Rivendare', chance: 0.02, source: 'Baron Rivendare, Stratholme (2%)' },
  { id: 'razzashi_raptor', name: 'Swift Razzashi Raptor', tier: 2, shape: 'raptor', color: '#c84a2a', accent: '#5a1a0e', boss: 'Bloodlord Mandokir', chance: 0.01, source: 'Bloodlord Mandokir, Zul\'Gurub (1%)' },
  { id: 'zulian_tiger', name: 'Swift Zulian Tiger', tier: 2, shape: 'saber', color: '#d8902a', accent: '#3a2414', boss: 'High Priest Thekal', chance: 0.01, source: 'High Priest Thekal, Zul\'Gurub (1%)' },
  { id: 'qiraji_tank', name: 'Black Qiraji Battle Tank', tier: 2, shape: 'kodo', color: '#1e1e24', accent: '#c8a24a', boss: 'C\'Thun', chance: 0.01, source: 'C\'Thun, Temple of Ahn\'Qiraj (1%)' },
];
// shape drives drawCompanion() in render.js
const PETS = [
  { id: 'bombay', name: 'Cat Carrier (Bombay)', faction: 'alliance', price: 4000, shape: 'cat', color: '#1e1e22', accent: '#3a3a40', source: 'Donni Anthania, Elwynn Forest' },
  { id: 'cornish_rex', name: 'Cat Carrier (Cornish Rex)', faction: 'alliance', price: 4000, shape: 'cat', color: '#8a7a6a', accent: '#5a4a3a', source: 'Donni Anthania, Elwynn Forest' },
  { id: 'orange_tabby', name: 'Cat Carrier (Orange Tabby)', faction: 'alliance', price: 4000, shape: 'cat', color: '#d8842a', accent: '#a85a1a', stripes: true, source: 'Donni Anthania, Elwynn Forest' },
  { id: 'silver_tabby', name: 'Cat Carrier (Silver Tabby)', faction: 'alliance', price: 4000, shape: 'cat', color: '#b8bcc4', accent: '#6a6e76', stripes: true, source: 'Donni Anthania, Elwynn Forest' },
  { id: 'siamese', name: 'Cat Carrier (Siamese)', faction: 'alliance', price: 6000, shape: 'cat', color: '#e8dcc4', accent: '#4a3a2a', source: 'Lil Timmy, Stormwind' },
  { id: 'snowshoe_rabbit', name: 'Rabbit Crate (Snowshoe)', faction: 'alliance', price: 2000, shape: 'rabbit', color: '#f0f0f0', accent: '#c8c8c8', source: 'Yarlyn Amberstill, Dun Morogh' },
  { id: 'great_horned_owl', name: 'Great Horned Owl', faction: 'alliance', price: 5000, shape: 'bird', color: '#7a5a3a', accent: '#c8a87a', source: 'Shylenai, Darnassus' },
  { id: 'hawk_owl', name: 'Hawk Owl', faction: 'alliance', price: 5000, shape: 'bird', color: '#8a7a6a', accent: '#e8dcc4', source: 'Shylenai, Darnassus' },
  { id: 'prairie_dog', name: 'Prairie Dog Whistle', faction: 'horde', price: 5000, shape: 'rabbit', color: '#a8844a', accent: '#7a5a2e', source: 'Halpa, Mulgore' },
  { id: 'black_kingsnake', name: 'Black Kingsnake', faction: 'horde', price: 5000, shape: 'snake', color: '#1e1e22', accent: '#d8d0b8', source: 'Xan\'tish, Orgrimmar' },
  { id: 'brown_snake', name: 'Brown Snake', faction: 'horde', price: 5000, shape: 'snake', color: '#7a5a3a', accent: '#a8844a', source: 'Xan\'tish, Orgrimmar' },
  { id: 'crimson_snake', name: 'Crimson Snake', faction: 'horde', price: 5000, shape: 'snake', color: '#a82a2a', accent: '#1e1e22', source: 'Xan\'tish, Orgrimmar' },
  { id: 'cockroach', name: 'Undercity Cockroach', faction: 'horde', price: 5000, shape: 'bug', color: '#5a3a1e', accent: '#2a1a0e', source: 'Jeremiah Payson, Undercity' },
  { id: 'ancona_chicken', name: 'Ancona Chicken', faction: 'both', price: 1000, shape: 'chicken', color: '#2a2a2a', accent: '#f0f0f0', source: 'Magus Tirth, Thousand Needles' },
  { id: 'cockatiel', name: 'Parrot Cage (Cockatiel)', faction: 'both', price: 4000, shape: 'bird', color: '#d8d0a8', accent: '#ffb030', source: 'Narkk, Booty Bay' },
  { id: 'senegal', name: 'Parrot Cage (Senegal)', faction: 'both', price: 4000, shape: 'bird', color: '#5a8a3a', accent: '#ffb030', source: 'Narkk, Booty Bay' },
  { id: 'mechanical_squirrel', name: 'Mechanical Squirrel Box', faction: 'both', price: 10000, shape: 'mech', color: '#8a8a92', accent: '#c8a24a', source: 'Engineering' },
  { id: 'pet_bombling', name: 'Pet Bombling', faction: 'both', price: 10000, shape: 'bomb', color: '#3a3a42', accent: '#ff7a2a', source: 'Engineering' },
  { id: 'lil_smoky', name: 'Lil\' Smoky', faction: 'both', price: 10000, shape: 'mech', color: '#5a5a62', accent: '#7ad8ff', source: 'Engineering' },
  // Drops
  { id: 'black_tabby', name: 'Cat Carrier (Black Tabby)', faction: 'both', shape: 'cat', color: '#2a2a2e', accent: '#5a5a62', stripes: true, zone: 'duskwood', chance: 0.002, source: 'Rare drop in Duskwood' },
  { id: 'hyacinth_macaw', name: 'Parrot Cage (Hyacinth Macaw)', faction: 'both', shape: 'bird', color: '#3a4ab0', accent: '#ffd23a', zone: 'stv', chance: 0.002, source: 'Rare drop in Stranglethorn Vale' },
  { id: 'green_wing_macaw', name: 'Parrot Cage (Green Wing Macaw)', faction: 'both', shape: 'bird', color: '#3a9a3a', accent: '#c82a2a', dungeon: 'deadmines', chance: 0.02, source: 'Defias Pirates, The Deadmines' },
  { id: 'dark_whelpling', name: 'Dark Whelpling', faction: 'both', shape: 'whelp', color: '#2a2a34', accent: '#7a3a8a', zone: 'steppes', chance: 0.003, source: 'Black dragonkin, Burning Steppes' },
  { id: 'oozeling', name: 'Disgusting Oozeling', faction: 'both', shape: 'ooze', color: '#6a8a3a', accent: '#c8ff5a', zone: 'ungoro', chance: 0.002, source: 'Rare drop in Un\'Goro Crater' },
  { id: 'smolderweb', name: 'Smolderweb Carrier', faction: 'both', shape: 'spider', color: '#5a2a1a', accent: '#ff7a2a', boss: 'Mother Smolderweb', chance: 0.1, source: 'Mother Smolderweb, Lower Blackrock Spire' },
];
const mountById = id => MOUNTS.find(m => m.id === id);
const petById = id => PETS.find(p => p.id === id);
const raceFaction = r => (RACES.find(x => x.id === r) || {}).faction;
const mountFaction = m => m.race ? raceFaction(m.race) : 'both';

const coll = () => ACC.collections;
const ownsMount = id => coll().mounts.includes(id);
const ownsPet = id => coll().pets.includes(id);

// ---------- riding ----------
function mountPrice(m) {
  if (!m.race) return 0;
  return MOUNT_PRICE[m.tier] * (m.race === S.race ? 1 : 2);
}
const canRide = m => !!m && (S.riding || 0) >= m.tier;
// Extra travel speed from the active mount (none indoors)
function mountSpeed() {
  if (!S.mount || G.run) return 0;
  const m = mountById(S.mount);
  return canRide(m) ? RIDING[m.tier].speed : 0;
}
// On the mount right now? (between fights, outside dungeons)
function isMounted() {
  return mountSpeed() > 0 && !G.dead && !G.party && G.walking && !(G.enemy && G.enemy.state === 'fight');
}
function trainRiding() {
  const next = (S.riding || 0) + 1, R = RIDING[next];
  if (!R) return;
  if (S.level < R.level) { toast(`Requires level ${R.level}`); return; }
  if (S.copper < R.cost) { toast('You cannot afford that yet.'); return; }
  S.copper -= R.cost; S.riding = next;
  log(`You have learned <b>${R.name}</b>.`, 'sys');
  // Class mounts come with the riding rank
  for (const m of MOUNTS) if (m.cls === S.cls && m.tier === next) grantMount(m.id, 'Your class trainer hands you');
  pickBestMount();
  invalidate(); markDirty();
}
// Use the fastest mount you can ride (keeps your choice if it's just as fast)
function pickBestMount() {
  const cur = mountById(S.mount);
  const best = MOUNTS.filter(m => ownsMount(m.id) && canRide(m)).sort((a, b) => b.tier - a.tier)[0];
  if (best && (!canRide(cur) || best.tier > cur.tier)) S.mount = best.id;
}
function buyMount(id) {
  const m = mountById(id);
  if (!m || ownsMount(id) || !m.race || mountFaction(m) !== S.faction) return;
  if (!canRide(m)) { toast(`Requires ${RIDING[m.tier].name}`); return; }
  const p = mountPrice(m);
  if (S.copper < p) { toast('You cannot afford that yet.'); return; }
  S.copper -= p;
  grantMount(id, 'You buy');
  S.mount = id;
  invalidate(); markDirty();
}
function setMount(id) { if (ownsMount(id) && canRide(mountById(id))) { S.mount = id; invalidate(); markDirty(); } }

function grantMount(id, how) {
  if (ownsMount(id)) return false;
  coll().mounts.push(id); saveAccount(); invalidate();
  const m = mountById(id);
  log(`${how || 'You obtain'} <b class="epic">${esc(m.name)}</b>! It is added to your mount collection.`, 'loot');
  toast(`New mount: ${m.name}`);
  if (!S.mount && canRide(m)) S.mount = id;
  return true;
}
function grantPet(id, how) {
  if (ownsPet(id)) return false;
  coll().pets.push(id); saveAccount(); invalidate();
  const p = petById(id);
  log(`${how || 'You obtain'} <b class="rare">${esc(p.name)}</b>! It is added to your companion collection.`, 'loot');
  toast(`New companion: ${p.name}`);
  if (!S.companion) S.companion = id;
  return true;
}
function buyPet(id) {
  const p = petById(id);
  if (!p || ownsPet(id) || !p.price || (p.faction !== 'both' && p.faction !== S.faction)) return;
  if (S.copper < p.price) { toast('You cannot afford that yet.'); return; }
  S.copper -= p.price;
  grantPet(id, 'You buy');
  S.companion = id; markDirty();
}
function setPet(id) { S.companion = S.companion === id ? null : ownsPet(id) ? id : S.companion; markDirty(); }

function collectTabard(it) {
  if (!it || G.inBot || it.slot !== 'tabard' || coll().tabards.includes(it.name)) return;
  coll().tabards.push(it.name); saveAccount(); invalidate();
  log(`<b>${esc(it.name)}</b> is added to your tabard collection.`, 'loot');
}

// Rare companion and mount drops (called from killEnemy)
function collectionDropsOnKill(e) {
  const bossName = e.boss && e.boss.name;
  for (const p of PETS) {
    if (!p.chance || ownsPet(p.id)) continue;
    const here = p.boss ? p.boss === bossName : p.dungeon ? G.run && G.run.id === p.dungeon && e.dng === 'trash' : p.zone ? !G.run && S.zoneId === p.zone : false;
    if (here && Math.random() < p.chance) grantPet(p.id, 'You loot');
  }
  for (const m of MOUNTS) if (m.boss && m.boss === bossName && !ownsMount(m.id) && Math.random() < m.chance) grantMount(m.id, 'You loot');
}

// Account bonuses for the collection (merged by accountFx in account.js)
function collectionFx() {
  const fx = {};
  if (!ACC) return fx;
  for (const k in COLLECTION_BONUS) {
    const B = COLLECTION_BONUS[k], n = (ACC.collections[k] || []).length;
    fx[B.key] = Math.min(B.max, Math.floor(n / B.per) * B.step);
  }
  return fx;
}

// Old saves: the Riding profession becomes Apprentice Riding and a race mount (or the gold back)
function migrateRiding() {
  const r = S.prof && S.prof.riding;
  if (!r) return;
  delete S.prof.riding;
  if (S.level >= RIDING[1].level) {
    S.riding = Math.max(S.riding || 0, 1);
    const m = MOUNTS.find(x => x.race === S.race && x.tier === 1);
    if (m && !ownsMount(m.id)) { coll().mounts.push(m.id); saveAccount(); }
    S.mount = S.mount || (m && m.id);
    log('Your riding lessons have been converted: you know <b>Apprentice Riding</b> and own a mount.', 'sys');
  } else {
    let refund = 0; for (let k = 0; k < r; k++) refund += Math.round(150 * Math.pow(1.6, k));
    S.copper += refund;
  }
}

// ---------- Collections tab ----------
function panelCollections() {
  const C = coll(), fx = collectionFx();
  const showAll = !!G.collAll;
  const next = RIDING[(S.riding || 0) + 1];
  const trainer = `<div class="ctrain">
      <div><b>${S.riding ? RIDING[S.riding].name : 'No riding skill'}</b>${S.riding ? ` <span class="muted">— mounts up to ${S.riding === 2 ? 'epic' : 'normal'} speed</span>` : ''}</div>
      ${next ? `<button class="btn" data-act="trainRiding" ${S.level < next.level || S.copper < next.cost ? 'disabled' : ''}>Train ${next.name} · ${S.level < next.level ? `level ${next.level}` : moneyHTML(next.cost)}</button>` : '<span class="muted">Mastered</span>'}
    </div>`;
  const bonus = Object.keys(COLLECTION_BONUS).map(k => { const B = COLLECTION_BONUS[k]; return `+${Math.round(fx[B.key] * 100)}% ${B.label}`; }).join(' · ');
  const mounts = MOUNTS.filter(m => showAll || ownsMount(m.id) || mountFaction(m) === 'both' || mountFaction(m) === S.faction || !m.race).filter(m => !m.cls || m.cls === S.cls || ownsMount(m.id));
  const mcards = mounts.map(m => {
    const own = ownsMount(m.id), active = S.mount === m.id, ride = canRide(m);
    const src = m.race ? `${RACES.find(r => r.id === m.race).name} vendor` : m.cls ? `${CLASSES[m.cls].name} trainer (with ${RIDING[m.tier].name})` : m.source;
    let btn = '';
    if (own) btn = active && ride ? '<span class="cstate on">Riding</span>' : ride ? `<button class="btn" data-act="setMount" data-v="${m.id}">Ride</button>` : `<span class="cstate">Needs ${RIDING[m.tier].name}</span>`;
    else if (m.race && mountFaction(m) === S.faction) btn = `<button class="btn" data-act="buyMount" data-v="${m.id}" ${ride && S.copper >= mountPrice(m) ? '' : 'disabled'}>${ride ? moneyHTML(mountPrice(m)) : `Needs ${RIDING[m.tier].name}`}</button>`;
    return `<div class="ccard${own ? ' own' : ''}${active ? ' active' : ''}" title="${esc(src)}">
      <span class="cico">${iconHTML('icons/mounts/' + iconFileName(m.name), m.tier === 2 ? '🏇' : '🐎', 'cimg', 'ico-fb')}</span>
      <span class="ctxt"><b class="${m.tier === 2 ? 'epic' : 'rare'}">${esc(m.name)}</b><span>${m.tier === 2 ? 'Epic · 100%' : 'Normal · 60%'} · ${esc(src)}</span></span>${btn}</div>`;
  }).join('');
  const pets = PETS.filter(p => showAll || ownsPet(p.id) || p.faction === 'both' || p.faction === S.faction);
  const pcards = pets.map(p => {
    const own = ownsPet(p.id), active = S.companion === p.id;
    let btn = '';
    if (own) btn = `<button class="btn" data-act="setPet" data-v="${p.id}">${active ? 'Dismiss' : 'Summon'}</button>`;
    else if (p.price && (p.faction === 'both' || p.faction === S.faction)) btn = `<button class="btn" data-act="buyPet" data-v="${p.id}" ${S.copper >= p.price ? '' : 'disabled'}>${moneyHTML(p.price)}</button>`;
    return `<div class="ccard${own ? ' own' : ''}${active ? ' active' : ''}" title="${esc(p.source)}">
      <span class="cico">${iconHTML('icons/pets/' + iconFileName(p.name), '🐾', 'cimg', 'ico-fb')}</span>
      <span class="ctxt"><b>${esc(p.name)}</b><span>${esc(p.source)}</span></span>${btn}</div>`;
  }).join('');
  const tcards = TABARDS.names.map((n, i) => `<div class="ccard ctabcard${C.tabards.includes(n) ? ' own' : ''}"><span class="ctab" style="background:${TABARDS.colors[i]}"></span><span class="ctxt"><b>${esc(n)}</b><span>${C.tabards.includes(n) ? 'Collected' : 'Drops anywhere'}</span></span></div>`).join('');
  return `<h3>Collections <span class="muted">— shared by all your characters</span></h3>
    <p class="small">Collection bonuses: <b>${bonus}</b></p>
    <label class="toggle"><input type="checkbox" data-act="collAll" ${showAll ? 'checked' : ''}> Show the other faction's mounts and companions</label>
    <h4 class="csec">Riding</h4>${trainer}
    <h4 class="csec">Mounts <span class="muted">${C.mounts.length}/${MOUNTS.length}</span></h4><div class="colgrid">${mcards}</div>
    <h4 class="csec">Companions <span class="muted">${C.pets.length}/${PETS.length}</span></h4><div class="colgrid">${pcards}</div>
    <h4 class="csec">Tabards <span class="muted">${C.tabards.length}/${TABARDS.names.length}</span></h4><div class="colgrid">${tcards}</div>`;
}
