// =====================================================================
//  The Leveling Road — quests
//  Each zone has a handful of quests that are picked up automatically when
//  you're in the zone and high enough level. Normal fighting completes them:
//    kill    — slay `count` of the mob `target`
//    collect — `target` mobs drop `item` with `chance` until you have `count`
//    elite   — the named elite `target` starts showing up; slay it once
//  Rewards: experience (a share of a level at the quest's level), gold and a
//  choice of items. Quests can chain with `req` (another quest id).
// =====================================================================
'use strict';

const QUEST_LOG_SIZE = 20;
const QUEST_XP_SHARE = { kill: 0.15, collect: 0.16, elite: 0.27 };   // × XP needed for a level at the quest's level
const QUEST_ELITE_CHANCE = 0.15;                                     // chance per spawn that a quest elite appears

const QUESTS = {
  elwynn: [
    { id: 'kobold_camp', name: 'Kobold Camp Cleanup', giver: 'Marshal McBride', level: 2, type: 'kill', target: 'Kobold Vermin', count: 10 },
    { id: 'wolves_border', name: 'Wolves Across the Border', giver: 'Eagan Peltskinner', level: 3, type: 'collect', target: 'Prowler', item: 'Tough Wolf Meat', count: 8, chance: 0.7 },
    { id: 'protect_frontier', name: 'Protect the Frontier', giver: 'Sergeant Willem', level: 5, type: 'kill', target: 'Prowler', count: 12 },
    { id: 'red_linen', name: 'Red Linen Goods', giver: 'Sara Timberlain', level: 6, type: 'collect', target: 'Defias Thug', item: 'Red Linen Bandana', count: 6, chance: 0.6 },
    { id: 'princess', name: 'Princess Must Die!', giver: 'Ma Stonefield', level: 8, type: 'elite', target: 'Princess' },
    { id: 'hogger', name: 'Wanted: Hogger', giver: 'Marshal Dughan', level: 10, type: 'elite', target: 'Hogger', req: 'protect_frontier' },
  ],
  dunmorogh: [
    { id: 'dwarven_outfitters', name: 'Dwarven Outfitters', giver: 'Sten Stoutarm', level: 2, type: 'collect', target: 'Juvenile Snow Leopard', item: 'Snow Leopard Pelt', count: 8, chance: 0.7 },
    { id: 'troll_cave', name: 'The Troll Cave', giver: 'Senir Whitebeard', level: 5, type: 'kill', target: 'Frostmane Troll Whelp', count: 14 },
    { id: 'bear_hides', name: 'A Bundle of Hides', giver: 'Rudra Amberstill', level: 6, type: 'collect', target: 'Ice Claw Bear', item: 'Ice Claw Bear Hide', count: 6, chance: 0.6 },
    { id: 'frostmane_hold', name: 'Frostmane Hold', giver: 'Senir Whitebeard', level: 7, type: 'kill', target: 'Frostmane Troll Whelp', count: 12, req: 'troll_cave' },
    { id: 'grizzled_den', name: 'The Grizzled Den', giver: 'Pilot Stonegear', level: 8, type: 'elite', target: 'Mangeclaw' },
    { id: 'old_icebeard', name: 'The Hunt for Old Icebeard', giver: 'Mountaineer Thalos', level: 10, type: 'elite', target: 'Old Icebeard', req: 'bear_hides' },
  ],
  teldrassil: [
    { id: 'balance_nature', name: 'The Balance of Nature', giver: 'Conservator Ilthalaine', level: 2, type: 'kill', target: 'Nightsaber', count: 10 },
    { id: 'woodland_protector', name: 'The Woodland Protector', giver: 'Tarindrella', level: 3, type: 'kill', target: 'Grell', count: 8 },
    { id: 'webwood_venom', name: 'Webwood Venom', giver: 'Gilshalan Windwalker', level: 4, type: 'collect', target: 'Webwood Spider', item: 'Webwood Venom Sac', count: 10, chance: 0.6 },
    { id: 'gnarlpine_corruption', name: 'Gnarlpine Corruption', giver: 'Athridas Bearmantle', level: 7, type: 'kill', target: 'Gnarlpine Ursa', count: 12 },
    { id: 'ursal', name: 'Ursal the Mauler', giver: 'Sentinel Kyra Starsong', level: 9, type: 'elite', target: 'Ursal the Mauler' },
    { id: 'melenas', name: 'The Fel Lord', giver: 'Corithras Moonrage', level: 10, type: 'elite', target: 'Lord Melenas', req: 'gnarlpine_corruption' },
  ],
  durotar: [
    { id: 'cutting_teeth', name: 'Cutting Teeth', giver: 'Gornek', level: 2, type: 'kill', target: 'Mottled Boar', count: 10 },
    { id: 'sting_scorpid', name: 'Sting of the Scorpid', giver: 'Hana\'zua', level: 3, type: 'collect', target: 'Scorpid Worker', item: 'Scorpid Worker Tail', count: 10, chance: 0.6 },
    { id: 'vile_familiars', name: 'Vile Familiars', giver: 'Zureetha Fargaze', level: 4, type: 'kill', target: 'Vile Familiar', count: 12 },
    { id: 'sarkoth', name: 'Sarkoth', giver: 'Hana\'zua', level: 5, type: 'elite', target: 'Sarkoth', req: 'sting_scorpid' },
    { id: 'burning_blade', name: 'Burning Blade Medallion', giver: 'Zureetha Fargaze', level: 7, type: 'elite', target: 'Gazz\'uz', req: 'vile_familiars' },
    { id: 'flat_tusk', name: 'The Tusk of Flat Tusk', giver: 'Gar\'Thok', level: 9, type: 'elite', target: 'Captain Flat Tusk' },
  ],
  mulgore: [
    { id: 'hunt_begins', name: 'The Hunt Begins', giver: 'Grull Hawkwind', level: 2, type: 'collect', target: 'Plainstrider', item: 'Plainstrider Meat', count: 7, chance: 0.7 },
    { id: 'rite_strength', name: 'Rite of Strength', giver: 'Baine Bloodhoof', level: 4, type: 'kill', target: 'Bristleback Quilboar', count: 12 },
    { id: 'poison_water', name: 'Poison Water', giver: 'Mull Thunderhorn', level: 6, type: 'collect', target: 'Prairie Wolf', item: 'Prairie Wolf Paw', count: 6, chance: 0.6 },
    { id: 'hunt_continues', name: 'The Hunt Continues', giver: 'Grull Hawkwind', level: 6, type: 'kill', target: 'Plainstrider', count: 12, req: 'hunt_begins' },
    { id: 'ghost_howl', name: 'The Ghost of Ghost Howl', giver: 'Harken Windtotem', level: 8, type: 'elite', target: 'Ghost Howl' },
    { id: 'mazzranache', name: 'Mazzranache', giver: 'Maur Raincaller', level: 10, type: 'elite', target: 'Mazzranache', req: 'poison_water' },
  ],
  tirisfal: [
    { id: 'mindless_ones', name: 'The Mindless Ones', giver: 'Executor Arren', level: 2, type: 'kill', target: 'Rotting Dead', count: 8 },
    { id: 'rattlecages', name: 'Rattling the Rattlecages', giver: 'Shadow Priest Sarvis', level: 3, type: 'kill', target: 'Rattlecage Skeleton', count: 12 },
    { id: 'duskbat_pelts', name: 'Duskbat Pelts', giver: 'Martin Prentiss', level: 5, type: 'collect', target: 'Duskbat', item: 'Duskbat Pelt', count: 6, chance: 0.7 },
    { id: 'scarlet_crusade', name: 'The Scarlet Crusade', giver: 'Executor Zygand', level: 7, type: 'collect', target: 'Scarlet Convert', item: 'Scarlet Insignia Ring', count: 8, chance: 0.6 },
    { id: 'bayne', name: 'Hunting Bayne', giver: 'Deathguard Dillinger', level: 8, type: 'elite', target: 'Bayne' },
    { id: 'ressan', name: 'Ressan the Needler', giver: 'Gretchen Dedmar', level: 10, type: 'elite', target: 'Ressan the Needler', req: 'scarlet_crusade' },
  ],
  westfall: [
    { id: 'westfall_stew', name: 'Westfall Stew', giver: 'Salma Saldean', level: 12, type: 'collect', target: 'Fleshripper', item: 'Stringy Vulture Meat', count: 6, chance: 0.6 },
    { id: 'killing_fields', name: 'The Killing Fields', giver: 'Farmer Saldean', level: 12, type: 'kill', target: 'Harvest Golem', count: 12 },
    { id: 'patrolling_westfall', name: 'Patrolling Westfall', giver: 'Deputy Rainer', level: 13, type: 'collect', target: 'Riverpaw Gnoll', item: 'Gnoll Paw', count: 8, chance: 0.6 },
    { id: 'red_leather', name: 'Red Leather Bandanas', giver: 'Scout Galiaan', level: 15, type: 'collect', target: 'Defias Pillager', item: 'Red Leather Bandana', count: 12, chance: 0.6 },
    { id: 'defias_brotherhood', name: 'The Defias Brotherhood', giver: 'Gryan Stoutmantle', level: 16, type: 'kill', target: 'Defias Pillager', count: 15, req: 'red_leather' },
    { id: 'the_harvester', name: 'The Harvester', giver: 'Farmer Saldean', level: 18, type: 'elite', target: 'Foe Reaper 4000', req: 'killing_fields' },
  ],
  barrens: [
    { id: 'the_zhevra', name: 'The Zhevra', giver: 'Sergra Darkthorn', level: 12, type: 'collect', target: 'Zhevra Runner', item: 'Zhevra Hooves', count: 4, chance: 0.6 },
    { id: 'disrupt_attacks', name: 'Disrupt the Attacks', giver: 'Thork', level: 13, type: 'kill', target: 'Razormane Quilboar', count: 12 },
    { id: 'prowlers', name: 'Prowlers of the Barrens', giver: 'Sergra Darkthorn', level: 14, type: 'collect', target: 'Savannah Huntress', item: 'Prowler Claws', count: 7, chance: 0.6 },
    { id: 'disruption_ends', name: 'The Disruption Ends', giver: 'Thork', level: 16, type: 'kill', target: 'Razormane Quilboar', count: 15, req: 'disrupt_attacks' },
    { id: 'humar', name: 'Humar the Pridelord', giver: 'Jorn Skyseer', level: 18, type: 'elite', target: 'Humar the Pridelord', req: 'prowlers' },
    { id: 'rocklance', name: 'Razormane Warlord', giver: 'Regthar Deathgate', level: 20, type: 'elite', target: 'Rocklance', req: 'disruption_ends' },
  ],
  duskwood: [
    { id: 'night_watch', name: 'The Night Watch', giver: 'Commander Althea Ebonlocke', level: 22, type: 'kill', target: 'Skeletal Warrior', count: 15 },
    { id: 'darkshire_supplies', name: 'Supplies from Darkshire', giver: 'Madame Eva', level: 23, type: 'collect', target: 'Venom Web Spider', item: 'Gooey Spider Leg', count: 8, chance: 0.6 },
    { id: 'worgen_woods', name: 'Worgen in the Woods', giver: 'Calor', level: 24, type: 'kill', target: 'Nightbane Worgen', count: 15 },
    { id: 'stitches', name: 'Stitches', giver: 'Lord Ello Ebonlocke', level: 26, type: 'elite', target: 'Stitches', req: 'night_watch' },
    { id: 'naraxis', name: 'Naraxis', giver: 'Jitters', level: 28, type: 'elite', target: 'Naraxis', req: 'darkshire_supplies' },
    { id: 'morladim', name: 'Mor\'Ladim', giver: 'Abercrombie', level: 30, type: 'elite', target: 'Mor\'Ladim', req: 'worgen_woods' },
  ],
  ashenvale: [
    { id: 'ashenvale_hunt', name: 'Ashenvale Hunt', giver: 'Senani Thunderheart', level: 22, type: 'kill', target: 'Ashenvale Bear', count: 12 },
    { id: 'ghostpaw_pelts', name: 'Ghostpaw Pelts', giver: 'Kuray\'bin', level: 23, type: 'collect', target: 'Ghostpaw Runner', item: 'Ghostpaw Pelt', count: 8, chance: 0.6 },
    { id: 'totem_mound', name: 'Foulweald Totem Mound', giver: 'Ruuzel', level: 24, type: 'kill', target: 'Foulweald Totemic', count: 12 },
    { id: 'dark_strand', name: 'The Ritual of the Dark Strand', giver: 'Mastok Wrilehiss', level: 25, type: 'kill', target: 'Dark Strand Cultist', count: 12 },
    { id: 'ursangous', name: 'Ursangous\'s Paw', giver: 'Senani Thunderheart', level: 26, type: 'elite', target: 'Ursangous', req: 'ashenvale_hunt' },
    { id: 'shadumbra', name: 'Shadumbra\'s Head', giver: 'Senani Thunderheart', level: 28, type: 'elite', target: 'Shadumbra', req: 'ursangous' },
  ],
  stv: [
    { id: 'tiger_mastery', name: 'Tiger Mastery', giver: 'Ajeck Rouack', level: 31, type: 'kill', target: 'Stranglethorn Tiger', count: 10 },
    { id: 'raptor_mastery', name: 'Raptor Mastery', giver: 'Hemet Nesingwary', level: 33, type: 'kill', target: 'Lashtail Raptor', count: 10 },
    { id: 'headhunting', name: 'Headhunting', giver: 'Bloodscalp hunter Kin\'weelay', level: 34, type: 'collect', target: 'Bloodscalp Headhunter', item: 'Shrunken Head', count: 10, chance: 0.6 },
    { id: 'venture_mining', name: 'Venture Company Mining', giver: 'Crank Fizzlebub', level: 35, type: 'kill', target: 'Venture Co. Mercenary', count: 15 },
    { id: 'big_game_hunter', name: 'Big Game Hunter', giver: 'Hemet Nesingwary', level: 38, type: 'elite', target: 'King Bangalash', req: 'tiger_mastery' },
    { id: 'moshogg_bounty', name: 'Mosh\'Ogg Bounty', giver: 'Krazek', level: 39, type: 'elite', target: 'Mosh\'Ogg Lord', req: 'venture_mining' },
  ],
  tanaris: [
    { id: 'wastewander_justice', name: 'Wastewander Justice', giver: 'Chief Engineer Bilgewhizzle', level: 41, type: 'kill', target: 'Wastewander Bandit', count: 12 },
    { id: 'field_sampling', name: 'Tanaris Field Sampling', giver: 'Senior Surveyor Fizzledowser', level: 43, type: 'collect', target: 'Scorpid Hunter', item: 'Thick Scorpid Carapace', count: 10, chance: 0.6 },
    { id: 'troll_temper', name: 'Troll Temper', giver: 'Trenton Lighthammer', level: 44, type: 'collect', target: 'Sandfury Axe Thrower', item: 'Troll Temper', count: 10, chance: 0.6 },
    { id: 'rocs', name: 'Rocs', giver: 'Yeh\'kinya', level: 45, type: 'kill', target: 'Searing Roc', count: 10 },
    { id: 'omgorn', name: 'Omgorn the Lost', giver: 'Alchemist Pestlezugg', level: 46, type: 'elite', target: 'Omgorn the Lost', req: 'wastewander_justice' },
    { id: 'soriid', name: 'Soriid the Devourer', giver: 'Marin Noggenfogger', level: 48, type: 'elite', target: 'Soriid the Devourer', req: 'field_sampling' },
  ],
  ungoro: [
    { id: 'ravasaur_hunting', name: 'Ravasaur Hunting', giver: 'Torwa Pathfinder', level: 49, type: 'kill', target: 'Ravasaur Runner', count: 10 },
    { id: 'devilsaur_mastery', name: 'Devilsaur Mastery', giver: 'Hemet Nesingwary', level: 50, type: 'kill', target: 'Devilsaur', count: 8 },
    { id: 'super_sticky', name: 'Super Sticky', giver: 'Krakle', level: 51, type: 'collect', target: 'Tar Lurker', item: 'Super Sticky Tar', count: 10, chance: 0.6 },
    { id: 'bugs', name: 'Bugs!', giver: 'Larion', level: 52, type: 'collect', target: 'Gorishi Reaver', item: 'Gorishi Silithid Sac', count: 10, chance: 0.6 },
    { id: 'clutchmother', name: 'The Clutchmother', giver: 'Torwa Pathfinder', level: 53, type: 'elite', target: 'Clutchmother Zavas', req: 'ravasaur_hunting' },
    { id: 'king_mosh', name: 'The Fare of King Mosh', giver: 'Spraggle Frock', level: 54, type: 'elite', target: 'King Mosh', req: 'devilsaur_mastery' },
  ],
  steppes: [
    { id: 'blackrock_bounty', name: 'Blackrock Bounty', giver: 'Marshal Maxwell', level: 55, type: 'kill', target: 'Blackrock Soldier', count: 15 },
    { id: 'extinguish_firegut', name: 'Extinguish the Firegut', giver: 'Oralius', level: 56, type: 'kill', target: 'Firegut Brute', count: 12 },
    { id: 'dragonkin_menace', name: 'Dragonkin Menace', giver: 'Helendis Riverhorn', level: 57, type: 'kill', target: 'Black Dragonspawn', count: 10 },
    { id: 'fiery_menace', name: 'Fiery Menace!', giver: 'Jalinda Sprig', level: 57, type: 'collect', target: 'Thaurissan Firewalker', item: 'Essence of Fire', count: 8, chance: 0.5 },
    { id: 'hahkzor', name: 'Hahk\'Zor\'s Head', giver: 'Marshal Maxwell', level: 58, type: 'elite', target: 'Hahk\'Zor', req: 'blackrock_bounty' },
    { id: 'gorgonoch', name: 'Gorgon\'och Must Fall', giver: 'Oralius', level: 59, type: 'elite', target: 'Gorgon\'och', req: 'extinguish_firegut' },
    { id: 'terrorspark', name: 'The Terror of the Steppes', giver: 'Helendis Riverhorn', level: 60, type: 'elite', target: 'Terrorspark', req: 'dragonkin_menace' },
  ],
};

// Tag each quest with its zone
for (const z in QUESTS) for (const q of QUESTS[z]) q.zone = z;
const ALL_QUESTS = Object.values(QUESTS).flat();
const questById = id => ALL_QUESTS.find(q => q.id === id);
const questMinLevel = q => Math.max(1, q.level - 3);

function questObjective(q) {
  if (q.type === 'kill') return `${q.target} slain`;
  if (q.type === 'collect') return q.item;
  return `${q.target} slain`;
}
function questText(q) {
  if (q.type === 'kill') return `${q.giver} wants you to slay ${q.count} ${q.target}.`;
  if (q.type === 'collect') return `${q.giver} needs ${q.count} ${q.item}. ${q.target} are said to carry them.`;
  return `${q.giver} has put a bounty on ${q.target}. Hunt it down; it has been sighted in the area.`;
}
const questCount = q => q.count || 1;

// ---------- state helpers (S.quests = { id: { p, done, rewards } }, S.questsDone = [ids]) ----------
const questActive = () => Object.keys(S.quests || {}).map(id => [questById(id), S.quests[id]]).filter(([q]) => q);

function questAvailable(q) {
  if (S.quests[q.id] || S.questsDone.includes(q.id)) return false;
  if (S.level < questMinLevel(q)) return false;
  return !q.req || S.questsDone.includes(q.req);
}

// Pick up every quest available in the current zone (up to the quest log limit)
function acceptZoneQuests(quiet) {
  if (!S) return;
  const list = (QUESTS[S.zoneId] || []).filter(questAvailable);
  // Make room by dropping unfinished gray quests left behind in other zones
  if (list.length && Object.keys(S.quests).length + list.length > QUEST_LOG_SIZE) {
    for (const [q, st] of questActive()) if (!st.done && q.zone !== S.zoneId && S.level - q.level > 5) delete S.quests[q.id];
  }
  for (const q of list) {
    if (Object.keys(S.quests).length >= QUEST_LOG_SIZE) break;
    S.quests[q.id] = { p: 0, done: false };
    if (!quiet) log(`Quest accepted: <b class="quest">${esc(q.name)}</b>`, 'quest');
  }
  if (list.length) markDirty();
}

// One of the quest elites wanted in the current zone (not yet slain), if any
function questEliteDef(z) {
  const wanted = questActive().filter(([q, st]) => q.type === 'elite' && !st.done && q.zone === z.id)
    .map(([q]) => (z.elites || []).find(d => d.name === q.target)).filter(Boolean);
  return wanted.length ? pick(wanted) : null;
}

function questsOnKill(e) {
  for (const [q, st] of questActive()) {
    if (st.done || e.def.name !== q.target) continue;
    if (q.type === 'collect' && Math.random() >= q.chance) continue;
    st.p = Math.min(questCount(q), st.p + 1);
    if (q.type !== 'elite') uiMessage(`${questObjective(q)}: ${st.p}/${questCount(q)}`, '#ffd100');
    if (st.p >= questCount(q)) completeQuest(q.id);
    markDirty();
  }
}

// Experience: a share of a level at the quest's level; much less once you've outlevelled it (as in WoW)
function questXp(q) {
  if (S.level >= CONFIG.LEVEL_CAP) return 0;
  const diff = S.level - q.level;
  const gray = diff <= 5 ? 1 : Math.max(0.1, 1 - 0.2 * (diff - 5));
  const lvl = Math.min(q.level, CONFIG.LEVEL_CAP - 1);
  return Math.round(xpToLevel(lvl) * QUEST_XP_SHARE[q.type] * gray * calc().xpMult);
}
function questGold(q) {
  const avg = q.level * q.level * 0.4 + q.level * 4 + 3;
  return Math.round(avg * (q.type === 'elite' ? 12 : 6) * calc().goldMult);
}

// Item rewards: a choice of 2–3 class-appropriate items (blue for elite and final quests)
function questRewards(q) {
  const zq = QUESTS[q.zone];
  const rare = q.type === 'elite' || zq[zq.length - 1] === q;
  const n = rare ? 3 : 2, slots = [];
  while (slots.length < n) { const s = pickItemSlot(); if (!slots.includes(s) && !COSMETIC_SLOTS.includes(s)) slots.push(s); }
  return slots.map(s => { const it = makeItem(Math.max(q.level + 1, 2), rare ? 3 : 2, s); it.req = Math.min(it.req, S.level); return it; });
}

function completeQuest(id) {
  const q = questById(id), st = S.quests[id];
  if (!st || st.done) return;
  st.done = true; st.p = questCount(q);
  st.rewards = questRewards(q);
  uiMessage(`${q.name} completed.`, '#ffd100');
  log(`<b class="quest">${esc(q.name)}</b> completed.`, 'quest');
  if (S.autoQuest) turnInQuest(id, bestQuestReward(st.rewards));
}

// The reward that is the biggest upgrade over what you wear
function bestQuestReward(rewards) {
  let best = 0, bestGain = -Infinity;
  (rewards || []).forEach((it, i) => { const gain = itemScore(it) - itemScore(S.equipment[targetSlot(it)]); if (gain > bestGain) { bestGain = gain; best = i; } });
  return best;
}

function turnInQuest(id, choice) {
  const q = questById(id), st = S.quests[id];
  if (!st || !st.done) return;
  const xp = questXp(q), gold = questGold(q);
  S.copper += gold; S.earned += gold;
  const it = st.rewards && st.rewards[choice || 0];
  delete S.quests[id];
  S.questsDone.push(id);
  let msg = `Quest turned in: <b class="quest">${esc(q.name)}</b>. Received ${moneyText(gold)}`;
  if (it) {
    if (S.bag.length < CONFIG.BAG_SIZE) { S.bag.push(it); msg += ` and ${itemLink(it)}`; }
    else { S.copper += it.sell; msg += ` (bags full: ${itemLink(it)} sold)`; }
  }
  log(msg + '.', 'quest');
  if (xp) { fct(G.heroX, G.groundY - 200, `+${fmt(xp)} XP`, '#c58cff', 20); addXp(xp); }
  if ((QUESTS[q.zone] || []).every(x => S.questsDone.includes(x.id))) {
    log(`<b class="ding">You have completed every quest in ${esc((ZONES.find(z => z.id === q.zone) || {}).name)}!</b>`, 'level');
    toast(`Zone complete: ${(ZONES.find(z => z.id === q.zone) || {}).name}`);
  }
  acceptZoneQuests();
  if (S.autoZone) autoPickZone();
  markDirty();
}

function abandonQuest(id) {
  if (!S.quests[id]) return;
  log(`Quest abandoned: ${esc(questById(id).name)}`, 'quest');
  delete S.quests[id];
  if (G.questSel === id) G.questSel = null;
  markDirty();
}

// Reward items waiting on a completed quest (so tooltips can find them)
function questRewardItem(id) {
  for (const [, st] of questActive()) for (const it of st.rewards || []) if (it.id === id) return it;
  return null;
}

// ---------- quest tracker on the battlefield ----------
function questTrackerHTML() {
  const list = questActive().sort(([a], [b]) => (a.zone === S.zoneId ? 0 : 1) - (b.zone === S.zoneId ? 0 : 1) || a.level - b.level).slice(0, 5);
  return list.map(([q, st]) => `<div class="qt-q${st.done ? ' done' : ''}"><b>${esc(q.name)}</b><span>${st.done ? 'Complete — ready to turn in' : `- ${esc(questObjective(q))}: ${st.p}/${questCount(q)}`}</span></div>`).join('');
}

// ---------- Quest Log tab ----------
function panelQuests() {
  const active = questActive();
  const byZone = {};
  for (const [q, st] of active) (byZone[q.zone] = byZone[q.zone] || []).push([q, st]);
  if (!G.questSel || !S.quests[G.questSel]) G.questSel = active.length ? active[0][0].id : null;
  const zoneName = id => (ZONES.find(z => z.id === id) || {}).name || id;
  const list = Object.keys(byZone).sort((a, b) => (a === S.zoneId ? -1 : b === S.zoneId ? 1 : 0)).map(z =>
    `<div class="ql-zone">${esc(zoneName(z))}</div>` + byZone[z].sort(([a], [b]) => a.level - b.level).map(([q, st]) =>
      `<button class="ql-q${G.questSel === q.id ? ' sel' : ''}" data-act="questSel" data-v="${q.id}" style="color:${conColor(q.level, S.level)}">[${q.level}] ${esc(q.name)}${st.done ? ' <span class="ql-done">(Complete)</span>' : ''}</button>`).join('')).join('');
  const done = S.questsDone.length;
  const upcoming = (QUESTS[S.zoneId] || []).filter(q => !S.quests[q.id] && !S.questsDone.includes(q.id));
  let detail = '<div class="qdetail empty"><p>Your quest log is empty. Quests are picked up automatically as you explore each zone.</p></div>';
  const sel = G.questSel && questById(G.questSel), st = sel && S.quests[sel.id];
  if (sel && st) {
    const rewards = st.done && st.rewards ? st.rewards : null;
    detail = `<div class="qdetail">
      <h4>${esc(sel.name)}</h4>
      <p>${esc(questText(sel))}</p>
      <h5>Objectives</h5>
      <p>${esc(questObjective(sel))}: ${st.p}/${questCount(sel)}${st.done ? ' <b class="ql-done">(Complete)</b>' : ''}</p>
      <h5>Rewards</h5>
      <p>${fmt(questXp(sel))} experience · ${moneyHTML(questGold(sel))}</p>
      ${rewards ? `<p class="small">Choose one of these rewards:</p><div class="qrewards">${rewards.map((it, i) => `<button class="qreward q${it.q}${(G.questChoice || 0) === i ? ' sel' : ''}" data-act="questChoice" data-v="${i}" data-item="${it.id}"><span class="qr-i">${itemIconHTML(it)}</span><span style="color:${QUALITIES[it.q].color}">${esc(it.name)}</span></button>`).join('')}</div>` : `<p class="small">You will also be able to choose ${sel.type === 'elite' ? 'one of three rare items' : 'an item'}.</p>`}
      <div class="btns">${st.done ? `<button class="btn primary" data-act="questTurnIn" data-v="${sel.id}">Complete Quest</button>` : ''}<button class="btn" data-act="questAbandon" data-v="${sel.id}">Abandon Quest</button></div>
    </div>`;
  }
  const book = assetNow('assets/Interface/QuestFrame/UI-QuestLog-BookIcon', TEXTURE_EXTS);
  return `<h3>${book ? `<img class="qbook" src="${book}" alt="">` : '📜'} Quest Log <span class="muted">${active.length}/${QUEST_LOG_SIZE} · ${done} completed</span></h3>
    <label class="toggle"><input type="checkbox" data-act="autoQuest" ${S.autoQuest ? 'checked' : ''}> Turn in completed quests automatically (picks the best reward)</label>
    <div class="qlog"><div class="qlist">${list || '<p class="muted">No active quests.</p>'}
      ${upcoming.length ? `<div class="ql-zone muted">Later in ${esc(zoneName(S.zoneId))}</div>` + upcoming.map(q => `<div class="ql-q locked">[${q.level}] ${esc(q.name)} <span class="muted small">${S.level < questMinLevel(q) ? `level ${questMinLevel(q)}` : 'after an earlier quest'}</span></div>`).join('') : ''}
    </div>${detail}</div>`;
}
