// =====================================================================
//  Ironvale Idle — game data & balance formulas
//  Everything you might want to tweak lives in this file.
// =====================================================================

const CONFIG = {
  GAME_NAME: 'Ironvale Idle',
  SAVE_KEY: 'ironvale-idle-save-v1',
  LEVEL_CAP: 60,
  XP_RATE: 1,              // global XP multiplier (1 = classic-style grind)
  GOLD_RATE: 1,            // global gold multiplier
  ELITE_CHANCE: 0.04,      // chance an enemy spawns as an Elite
  BASE_LOOT_CHANCE: 0.14,  // chance a normal enemy drops an item
  BAG_SIZE: 24,
  OFFLINE_CAP_HOURS: 12,   // max offline progress
  OFFLINE_EFFICIENCY: 0.5, // offline earns this fraction of online speed
  AUTOSAVE_SECONDS: 15,
  SPAWN_DELAY: 0.6,        // seconds between a kill and the next spawn
  WALK_SPEED: 140,         // background scroll speed (px/s)
  APPROACH_SPEED: 340,     // how fast enemies close in on screen (px/s)
};

// ---------------------------------------------------------------------
//  Item qualities
// ---------------------------------------------------------------------
const QUALITIES = [
  { name: 'Poor',     color: '#9d9d9d', statMult: 0,    armorMult: 0.6,  weaponMult: 0.7,  sell: 0.6 },
  { name: 'Common',   color: '#ffffff', statMult: 0,    armorMult: 1,    weaponMult: 1,    sell: 1 },
  { name: 'Uncommon', color: '#1eff00', statMult: 1,    armorMult: 1.1,  weaponMult: 1.15, sell: 2 },
  { name: 'Rare',     color: '#2d8cff', statMult: 1.45, armorMult: 1.25, weaponMult: 1.3,  sell: 4 },
  { name: 'Epic',     color: '#b55cff', statMult: 2,    armorMult: 1.4,  weaponMult: 1.5,  sell: 8 },
];

const SLOTS = ['weapon', 'head', 'chest', 'hands', 'legs', 'feet'];
const SLOT_LABELS = { weapon: 'Main Hand', head: 'Head', chest: 'Chest', hands: 'Hands', legs: 'Legs', feet: 'Feet' };
const ARMOR_SLOT_FACTOR = { head: 1, chest: 1.5, hands: 0.7, legs: 1.25, feet: 0.85 };

// Base item names by slot, from low to high item level (one tier every 12 levels)
const ITEM_BASES = {
  weapon: ['Shortsword', 'Longsword', 'Broadsword', 'Claymore', 'Greatsword'],
  head:   ['Cap', 'Coif', 'Helm', 'Greathelm', 'Warcrown'],
  chest:  ['Tunic', 'Jerkin', 'Hauberk', 'Breastplate', 'Warplate'],
  hands:  ['Wraps', 'Gloves', 'Gauntlets', 'Grips', 'Handguards'],
  legs:   ['Trousers', 'Leggings', 'Legguards', 'Legplates', 'Tassets'],
  feet:   ['Shoes', 'Boots', 'Treads', 'Sabatons', 'Stompers'],
};

// Name prefixes per quality
const ITEM_PREFIXES = [
  ['Tattered', 'Rusty', 'Cracked', 'Frayed', 'Moth-eaten'],
  ['Sturdy', 'Plain', 'Militia', 'Forged', "Recruit's"],
  ['Fine', 'Tempered', "Ranger's", "Soldier's", 'Polished'],
  ['Gleaming', "Champion's", 'Runed', 'Vanguard', 'Stormwrought'],
  ['Dragonforged', 'Doomsworn', 'Starfallen', 'Eclipse', 'Worldbreaker'],
];

// Stat suffixes (only Uncommon and better items roll stats)
const SUFFIXES = [
  { name: 'of Might',       stats: { str: 1 } },
  { name: 'of Swiftness',   stats: { agi: 1 } },
  { name: 'of Fortitude',   stats: { sta: 1 } },
  { name: 'of the Warlord', stats: { str: 0.6, sta: 0.5 } },
  { name: 'of the Duelist', stats: { str: 0.55, agi: 0.55 } },
  { name: 'of the Wolf',    stats: { agi: 0.6, sta: 0.5 } },
];

// ---------------------------------------------------------------------
//  Zones & enemies
//  enemy.type controls how it is drawn: 'quad' | 'biped' | 'spider' | 'blob'
// ---------------------------------------------------------------------
const ZONES = [
  {
    id: 'greenvale', name: 'Greenvale Meadows', min: 1, max: 10,
    weather: 'leaves', deco: ['tree', 'tree', 'bush', 'rock'],
    palette: { skyTop: '#6fb7e6', skyBottom: '#d6effa', sun: '#fff3b0', far: '#8fbf78', near: '#6fa257', foliage: '#4f8a3a', trunk: '#6b4a2b', rock: '#8d8f86', ground: '#7a9a43', groundDark: '#5a7631' },
    enemies: [
      { name: 'Mangy Wolf', type: 'quad', color: '#8b857c', accent: '#5f5a53', size: 0.9 },
      { name: 'Young Boar', type: 'quad', color: '#7a4e33', accent: '#4e301e', size: 0.85, tusks: true },
      { name: 'Meadow Cutpurse', type: 'biped', color: '#5e4a7a', accent: '#3a2e4a', skin: '#d9a77a', size: 0.95, weapon: 'dagger', hood: true },
    ],
  },
  {
    id: 'gloomhollow', name: 'Gloomhollow Forest', min: 10, max: 20,
    weather: 'fireflies', deco: ['pine', 'deadtree', 'pine', 'rock'],
    palette: { skyTop: '#1f2a3d', skyBottom: '#4c5a6b', sun: '#dfe6f0', far: '#2c3b34', near: '#24332b', foliage: '#1d3b2c', trunk: '#3a2a1f', rock: '#55595c', ground: '#3d4a2f', groundDark: '#2a3420' },
    enemies: [
      { name: 'Shadow Wolf', type: 'quad', color: '#3b3a45', accent: '#24232b', size: 1.0, eye: '#ff4a4a' },
      { name: 'Webwood Lurker', type: 'spider', color: '#2e2a26', accent: '#8a1f1f', size: 1.0 },
      { name: 'Restless Ghoul', type: 'biped', color: '#4a5a3a', accent: '#2e3a24', skin: '#9fb08a', size: 1.0, weapon: 'claws' },
    ],
  },
  {
    id: 'redstone', name: 'Redstone Highlands', min: 20, max: 30,
    weather: 'dust', deco: ['rock', 'pine', 'rock', 'bush'],
    palette: { skyTop: '#e9a66b', skyBottom: '#f6dcb3', sun: '#fff0c2', far: '#b0674a', near: '#94513a', foliage: '#5a6b35', trunk: '#5a3a24', rock: '#8a4a36', ground: '#9a5e3c', groundDark: '#73432a' },
    enemies: [
      { name: 'Highland Bear', type: 'quad', color: '#5b3a22', accent: '#3a2412', size: 1.3 },
      { name: 'Redstone Bandit', type: 'biped', color: '#8f2a24', accent: '#3a2a20', skin: '#c98f6a', size: 1.0, weapon: 'axe' },
      { name: 'Crag Golem', type: 'blob', color: '#7c6a5e', accent: '#ffb04a', size: 1.0 },
    ],
  },
  {
    id: 'sunscald', name: 'Sunscald Expanse', min: 30, max: 40,
    weather: 'dust', deco: ['cactus', 'rock', 'cactus'],
    palette: { skyTop: '#f2c36b', skyBottom: '#fbe9b8', sun: '#ffffff', far: '#e0b26e', near: '#d19c58', foliage: '#5f8a4a', trunk: '#7a5a35', rock: '#b98a55', ground: '#e2bc78', groundDark: '#c39a58' },
    enemies: [
      { name: 'Dune Stalker', type: 'spider', color: '#b8894a', accent: '#5a3a1a', size: 1.15 },
      { name: 'Sandscar Raider', type: 'biped', color: '#c9a46a', accent: '#5a2f1a', skin: '#a8754a', size: 1.0, weapon: 'axe', hood: true },
      { name: 'Cackling Hyena', type: 'quad', color: '#b09060', accent: '#5e4428', size: 0.95 },
    ],
  },
  {
    id: 'frostpeak', name: 'Frostpeak Pass', min: 40, max: 50,
    weather: 'snow', deco: ['pine', 'crystal', 'rock'],
    palette: { skyTop: '#8fb3d9', skyBottom: '#e6f0fa', sun: '#ffffff', far: '#cfdcea', near: '#b4c7dc', foliage: '#2f4f4a', trunk: '#3e3a36', rock: '#9aa8b8', ground: '#eef4fa', groundDark: '#c7d6e6' },
    enemies: [
      { name: 'Frostmane Wolf', type: 'quad', color: '#dfe7ef', accent: '#9fb0c2', size: 1.05, eye: '#3fc8ff' },
      { name: 'Snowpeak Yeti', type: 'biped', color: '#e8eef3', accent: '#9aa8b8', skin: '#f2f6fa', size: 1.3, weapon: 'claws' },
      { name: 'Rime Wraith', type: 'blob', color: '#7fd3f0', accent: '#ffffff', size: 1.0 },
    ],
  },
  {
    id: 'ashen', name: 'The Ashen Wastes', min: 50, max: 60,
    weather: 'embers', deco: ['spire', 'deadtree', 'rock'],
    palette: { skyTop: '#2a0f0f', skyBottom: '#7a2a14', sun: '#ff7a2a', far: '#3a1a16', near: '#2a1310', foliage: '#3a2a24', trunk: '#1e1412', rock: '#3b2c28', ground: '#2e2220', groundDark: '#1c1412' },
    enemies: [
      { name: 'Cinder Hound', type: 'quad', color: '#5a1e14', accent: '#ff6a1a', size: 1.05, horns: true, eye: '#ffd24a' },
      { name: 'Ashbound Cultist', type: 'biped', color: '#1e1a1e', accent: '#c23a1a', skin: '#d9b08a', size: 1.0, weapon: 'staff', hood: true },
      { name: 'Magma Elemental', type: 'blob', color: '#d9541a', accent: '#ffd36a', size: 1.2 },
    ],
  },
];

// ---------------------------------------------------------------------
//  Trainer upgrades (bought with gold). cost = base * growth^rank (copper)
// ---------------------------------------------------------------------
const UPGRADES = [
  { id: 'sharpen',  name: 'Whetstone',       icon: '🪨', base: 30,  growth: 1.22, max: 60, desc: r => `+${6 * r}% damage` },
  { id: 'drills',   name: 'Combat Drills',   icon: '⚔️', base: 60,  growth: 1.32, max: 30, desc: r => `+${3 * r}% attack speed` },
  { id: 'rations',  name: 'Hearty Rations',  icon: '🍖', base: 45,  growth: 1.26, max: 50, desc: r => `+${6 * r}% max health, +${10 * r}% regeneration` },
  { id: 'tome',     name: "Scholar's Tome",  icon: '📖', base: 100, growth: 1.38, max: 40, desc: r => `+${5 * r}% experience` },
  { id: 'pockets',  name: 'Deep Pockets',    icon: '💰', base: 80,  growth: 1.33, max: 40, desc: r => `+${8 * r}% gold from kills` },
  { id: 'tracking', name: 'Tracking',        icon: '🐾', base: 150, growth: 1.6,  max: 10, desc: r => `+${6 * r}% travel & spawn speed` },
  { id: 'charm',    name: 'Lucky Charm',     icon: '🍀', base: 200, growth: 1.5,  max: 20, desc: r => `+${5 * r}% loot drop chance` },
];

// ---------------------------------------------------------------------
//  Talents — 1 point per level from level 10 (51 points at 60)
// ---------------------------------------------------------------------
const TALENTS = [
  { id: 'deepcuts',    name: 'Deep Cuts',       icon: '🩸', max: 5, desc: r => `+${4 * r}% damage dealt` },
  { id: 'mastery',     name: 'Weapon Mastery',  icon: '🗡️', max: 5, desc: r => `+${2 * r}% critical strike chance` },
  { id: 'rhythm',      name: 'Battle Rhythm',   icon: '🥁', max: 5, desc: r => `+${3 * r}% attack speed` },
  { id: 'crushing',    name: 'Crushing Blows',  icon: '🔨', max: 5, desc: r => `Mighty Strike deals +${15 * r}% damage` },
  { id: 'executioner', name: 'Executioner',     icon: '🪓', max: 3, desc: r => `+${15 * r}% damage to enemies below 25% health` },
  { id: 'ragewell',    name: 'Wellspring of Rage', icon: '🔥', max: 5, desc: r => `+${10 * r}% rage generation` },
  { id: 'ironhide',    name: 'Iron Hide',       icon: '🛡️', max: 5, desc: r => `+${5 * r}% armor, +${3 * r}% max health` },
  { id: 'endurance',   name: 'Endurance',       icon: '❤️', max: 5, desc: r => `+${4 * r}% stamina` },
  { id: 'secondwind',  name: 'Second Wind',     icon: '🌬️', max: 3, desc: r => `+${30 * r}% health regeneration` },
  { id: 'treasure',    name: 'Treasure Hunter', icon: '💎', max: 5, desc: r => `+${4 * r}% gold and loot chance` },
  { id: 'veteran',     name: 'Veteran',         icon: '🎖️', max: 5, desc: r => `+${3 * r}% experience` },
];

// ---------------------------------------------------------------------
//  Formulas
// ---------------------------------------------------------------------

// XP needed to go from level L to L+1 (classic-style curve: 400 at 1, ~7.6k at 10, ~210k at 59)
function xpToLevel(L) {
  if (L >= CONFIG.LEVEL_CAP) return Infinity;
  const diff = L <= 28 ? 0 : L === 29 ? 1 : L === 30 ? 3 : L === 31 ? 6 : 5 * (Math.min(L, 59) - 30);
  return Math.round(((8 * L + diff) * (45 + 5 * L)) / 100) * 100;
}

// Enemies at or below this level give no XP ("gray" mobs)
function grayLevel(L) {
  if (L <= 5) return 0;
  if (L <= 39) return L - Math.floor(L / 10) - 5;
  return L - Math.floor(L / 5) - 1;
}

function zeroDiff(L) {
  return L < 8 ? 5 : L < 10 ? 6 : L < 12 ? 7 : L < 16 ? 8 : L < 20 ? 9 : L < 30 ? 11 : L < 40 ? 12 : L < 45 ? 13 : L < 50 ? 14 : L < 55 ? 15 : 16;
}

function xpForKill(mobL, plL) {
  const base = 45 + 5 * mobL;
  if (mobL >= plL) return base * (1 + 0.05 * Math.min(mobL - plL, 4));
  if (mobL <= grayLevel(plL)) return 0;
  return base * (1 - (plL - mobL) / zeroDiff(plL));
}

// Copper dropped by an enemy (100 copper = 1 silver, 100 silver = 1 gold)
function copperForKill(L) {
  return (L * L * 0.4 + L * 4 + 3) * (0.6 + Math.random() * 0.8);
}

function enemyHp(L) { return Math.round(12 + 2.5 * Math.pow(L, 1.5)); }
function enemyDamage(L) { return 3 + 2.4 * L; }

// Name color by level difference (gray / green / yellow / orange / red)
function conColor(mobL, plL) {
  const d = mobL - plL;
  if (d >= 5) return '#ff3030';
  if (d >= 3) return '#ff8040';
  if (d >= -2) return '#ffff00';
  if (mobL > grayLevel(plL)) return '#40c040';
  return '#9d9d9d';
}
