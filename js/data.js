// =====================================================================
//  The Leveling Road — world data & balance formulas
//  Zones, mobs, items, professions and formulas live here.
//  Races & classes: classes.js · Talent trees: talents.js
// =====================================================================

const CONFIG = {
  GAME_NAME: 'The Leveling Road',
  SAVE_KEY: 'leveling-road-wow-v1',
  LEVEL_CAP: 60,
  XP_RATE: 1,              // global XP multiplier (1 = classic-style grind)
  GOLD_RATE: 1,            // global gold multiplier
  ELITE_CHANCE: 0.04,      // chance an enemy spawns as a named Elite
  BASE_LOOT_CHANCE: 0.14,  // chance a normal enemy drops an item
  BAG_SIZE: 24,
  OFFLINE_CAP_HOURS: 12,   // max offline progress
  OFFLINE_EFFICIENCY: 0.5, // offline earns this fraction of online speed
  AUTOSAVE_SECONDS: 15,
  SPAWN_DELAY: 0.6,        // seconds between a kill and the next spawn
  WALK_SPEED: 140,         // background scroll speed (px/s)
  APPROACH_SPEED: 340,     // how fast enemies close in on screen (px/s)
  TALENT_START: 10,        // first level that grants a talent point
  GCD: 1.5,                // global cooldown (energy users: 1.0)
};

// ---------------------------------------------------------------------
//  Item qualities
// ---------------------------------------------------------------------
const QUALITIES = [
  { name: 'Poor',     color: '#9d9d9d', statMult: 0,    armorMult: 0.6,  weaponMult: 0.7,  sell: 0.6 },
  { name: 'Common',   color: '#ffffff', statMult: 0,    armorMult: 1,    weaponMult: 1,    sell: 1 },
  { name: 'Uncommon', color: '#1eff00', statMult: 1,    armorMult: 1.1,  weaponMult: 1.15, sell: 2 },
  { name: 'Rare',     color: '#0070dd', statMult: 1.45, armorMult: 1.25, weaponMult: 1.3,  sell: 4 },
  { name: 'Epic',     color: '#a335ee', statMult: 2,    armorMult: 1.4,  weaponMult: 1.5,  sell: 8 },
];

// Equipment slots. Rings and trinkets have two slots each; their items use the item slot 'finger' / 'trinket'.
const SLOTS = ['weapon', 'offhand', 'head', 'neck', 'shoulder', 'chest', 'shirt', 'tabard', 'wrist', 'hands', 'waist', 'legs', 'feet', 'finger1', 'finger2', 'trinket1', 'trinket2'];
const SLOT_LABELS = {
  weapon: 'Main Hand', offhand: 'Off Hand', head: 'Head', neck: 'Neck', shoulder: 'Shoulder', chest: 'Chest', shirt: 'Shirt', tabard: 'Tabard',
  wrist: 'Wrist', hands: 'Hands', waist: 'Waist', legs: 'Legs', feet: 'Feet', finger: 'Finger', finger1: 'Finger', finger2: 'Finger', trinket: 'Trinket', trinket1: 'Trinket', trinket2: 'Trinket',
};
const ITEM_SLOTS = ['weapon', 'offhand', 'head', 'neck', 'shoulder', 'chest', 'shirt', 'tabard', 'wrist', 'hands', 'waist', 'legs', 'feet', 'finger', 'trinket'];
const ITEM_SLOT_WEIGHT = { weapon: 3, offhand: 2, head: 3, neck: 2, shoulder: 3, chest: 3, shirt: 0.4, tabard: 0.4, wrist: 3, hands: 3, waist: 3, legs: 3, feet: 3, finger: 3, trinket: 2 };
const equipSlotsFor = slot => slot === 'finger' ? ['finger1', 'finger2'] : slot === 'trinket' ? ['trinket1', 'trinket2'] : [slot];
const ARMOR_SLOT_FACTOR = { head: 1, shoulder: 0.9, chest: 1.5, wrist: 0.5, hands: 0.7, waist: 0.7, legs: 1.25, feet: 0.85 };
// Stat budget per slot. Totals are normalised so a full set of 17 slots is about as strong as the old 6-slot set.
const STAT_SLOT_FACTOR = { weapon: 1.4, offhand: 0.6, head: 1, neck: 0.6, shoulder: 0.8, chest: 1.5, wrist: 0.5, hands: 0.7, waist: 0.7, legs: 1.25, feet: 0.85, finger: 0.5, trinket: 0.5 };
const STAT_NORM = 0.62, ARMOR_NORM = 0.62;
const COSMETIC_SLOTS = ['shirt', 'tabard'];
const JEWELRY = {
  neck: ['Pendant', 'Choker', 'Amulet', 'Necklace', 'Medallion'],
  finger: ['Band', 'Ring', 'Loop', 'Signet', 'Seal'],
  trinket: ['Charm', 'Talisman', 'Idol', 'Rune', 'Token'],
};
// Off-hands: shields and held items. Off-hand weapons use WEAPON_TYPES.
const OFFHAND_TYPES = {
  shield: { name: 'Shield', armor: 2.2, bases: ['Buckler', 'Round Shield', 'Heater Shield', 'Kite Shield', 'Tower Shield'] },
  held:   { name: 'Held In Off-hand', armor: 0, bases: ['Orb', 'Tome', 'Lantern', 'Scepter', 'Crystal'] },
};
const SHIRTS = { names: ['Brown Linen Shirt', 'White Linen Shirt', 'Red Linen Shirt', 'Blue Linen Shirt', 'Black Swashbuckler\'s Shirt', 'Stylish Green Shirt', 'Lavender Mageweave Shirt', 'Orange Martial Shirt'],
  colors: ['#7a5a3a', '#e8e4d8', '#a83228', '#2a4a9a', '#1e1a1e', '#3a7a3a', '#9a7ac8', '#d87a2a'] };
const TABARDS = { names: ['Tabard of the Argent Dawn', 'Stormwind Tabard', 'Orgrimmar Tabard', 'Tabard of the Defias', 'Tabard of the Scarlet Crusade', 'Guild Tabard', 'Tabard of Frost', 'Tabard of Flames'],
  colors: ['#c8a24a', '#2a4ab0', '#a01e1e', '#7a1a1a', '#c02a2a', '#3a6a2a', '#5ab4e0', '#e05a1a'] };
const STAT_KEYS = ['str', 'agi', 'sta', 'int', 'spi'];
const STAT_NAMES = { str: 'Strength', agi: 'Agility', sta: 'Stamina', int: 'Intellect', spi: 'Spirit' };

// Armor types: materials by tier (one tier every 12 item levels)
const ARMOR_TYPES = {
  cloth: {
    name: 'Cloth', mult: 0.5,
    mats: ['Linen', 'Woolen', 'Silk', 'Mageweave', 'Runecloth'],
    nouns: { head: 'Hood', shoulder: 'Mantle', chest: 'Robe', wrist: 'Cuffs', hands: 'Gloves', waist: 'Sash', legs: 'Pants', feet: 'Boots' },
  },
  leather: {
    name: 'Leather', mult: 0.75,
    mats: ['Rawhide', 'Light Leather', 'Heavy Leather', 'Thick Leather', 'Rugged Leather'],
    nouns: { head: 'Cap', shoulder: 'Shoulderpads', chest: 'Tunic', wrist: 'Bracers', hands: 'Gloves', waist: 'Belt', legs: 'Pants', feet: 'Boots' },
  },
  mail: {
    name: 'Mail', mult: 1,
    mats: ['Chain', 'Ringmail', 'Scalemail', 'Heavy Scale', 'Thick Scale'],
    nouns: { head: 'Coif', shoulder: 'Pauldrons', chest: 'Hauberk', wrist: 'Bracers', hands: 'Gauntlets', waist: 'Girdle', legs: 'Leggings', feet: 'Boots' },
  },
  plate: {
    name: 'Plate', mult: 1.25,
    mats: ['Copper', 'Bronze', 'Iron', 'Thorium', 'Dark Iron'],
    nouns: { head: 'Helm', shoulder: 'Spaulders', chest: 'Breastplate', wrist: 'Vambraces', hands: 'Gauntlets', waist: 'Waistband', legs: 'Legplates', feet: 'Sabatons' },
  },
};

// Weapon types. family drives talents (Sword Specialization etc.), hands drives 2H talents.
const WEAPON_TYPES = {
  sword:    { name: 'Sword',          family: 'sword',  hands: 1, dmg: 1,    bases: ['Shortsword', 'Longsword', 'Broadsword', 'Runeblade', 'Warblade'] },
  axe:      { name: 'Axe',            family: 'axe',    hands: 1, dmg: 1,    bases: ['Hatchet', 'Hand Axe', 'Cleaver', 'War Axe', 'Ravager'] },
  mace:     { name: 'Mace',           family: 'mace',   hands: 1, dmg: 1,    bases: ['Club', 'Cudgel', 'Mace', 'Warhammer', 'Morning Star'] },
  dagger:   { name: 'Dagger',         family: 'dagger', hands: 1, dmg: 0.85, bases: ['Shiv', 'Dirk', 'Stiletto', 'Kris', 'Assassin Blade'] },
  '2hsword':{ name: 'Two-Hand Sword', family: 'sword',  hands: 2, dmg: 1.25, bases: ['Claymore', 'Greatsword', 'Zweihander', 'Bastard Sword', 'Runed Greatblade'] },
  '2haxe':  { name: 'Two-Hand Axe',   family: 'axe',    hands: 2, dmg: 1.25, bases: ['Battle Axe', 'Great Axe', 'Executioner', 'Reaver', 'Decapitator'] },
  '2hmace': { name: 'Two-Hand Mace',  family: 'mace',   hands: 2, dmg: 1.25, bases: ['Maul', 'Sledge', 'War Maul', 'Great Hammer', 'Crusher'] },
  staff:    { name: 'Staff',          family: 'staff',  hands: 2, dmg: 1,    bases: ['Walking Stick', 'Quarterstaff', 'Staff', 'Battle Staff', 'Elder Staff'] },
  bow:      { name: 'Bow',            family: 'bow',    hands: 2, dmg: 1.1,  bases: ['Shortbow', 'Hunting Bow', 'Longbow', 'Recurve Bow', 'Composite Bow'] },
  gun:      { name: 'Gun',            family: 'gun',    hands: 2, dmg: 1.1,  bases: ['Blunderbuss', 'Musket', 'Rifle', 'Hand Cannon', 'Thorium Rifle'] },
  crossbow: { name: 'Crossbow',       family: 'bow',    hands: 2, dmg: 1.1,  bases: ['Light Crossbow', 'Crossbow', 'Heavy Crossbow', 'Repeater', 'Siege Crossbow'] },
};

// Classic-style name parts
const POOR_PREFIXES = ['Tattered', 'Frayed', 'Worn', 'Cracked', 'Rusty', 'Moth-eaten', 'Broken'];
const GREEN_PREFIXES = [
  ['Bandit', 'Willow', 'Pagan', 'Durable', 'Ridge', 'Raider\'s'],
  ['Scouting', 'Forest', 'Superior', 'Brigade', 'Sentinel', 'Infantry'],
  ['Ivycloth', 'Twilight', 'Ranger', 'Huntsman\'s', 'Champion\'s', 'Bloodlust'],
  ['Sage\'s', 'Archer\'s', 'Fortified', 'Wanderer\'s', 'Knight\'s', 'Ravager\'s'],
  ['Highborne', 'Elegant', 'Councillor\'s', 'Ornate', 'Lord\'s', 'Warmonger\'s'],
];
const RARE_PREFIXES = ['Defias', 'Scarlet', 'Stormwind', 'Kor\'kron', 'Darnassian', 'Ironforge', 'Warsong', 'Dalaran', 'Argent', 'Cenarion', 'Thunder Bluff', 'Gilneas'];

// Classic random suffixes
const SUFFIXES = [
  { name: 'of Strength',    stats: { str: 1 } },
  { name: 'of Agility',     stats: { agi: 1 } },
  { name: 'of Stamina',     stats: { sta: 1 } },
  { name: 'of Intellect',   stats: { int: 1 } },
  { name: 'of Spirit',      stats: { spi: 1 } },
  { name: 'of the Bear',    stats: { str: 0.6, sta: 0.5 } },
  { name: 'of the Monkey',  stats: { agi: 0.6, sta: 0.5 } },
  { name: 'of the Tiger',   stats: { str: 0.55, agi: 0.55 } },
  { name: 'of the Eagle',   stats: { int: 0.6, sta: 0.5 } },
  { name: 'of the Owl',     stats: { int: 0.6, spi: 0.5 } },
  { name: 'of the Whale',   stats: { sta: 0.6, spi: 0.5 } },
  { name: 'of the Gorilla', stats: { str: 0.6, int: 0.5 } },
  { name: 'of the Boar',    stats: { str: 0.6, spi: 0.5 } },
  { name: 'of the Wolf',    stats: { agi: 0.6, spi: 0.5 } },
  { name: 'of the Falcon',  stats: { agi: 0.6, int: 0.5 } },
];

// Epic drops borrow famous Classic item names
const EPIC_WEAPONS = {
  sword: ['Thunderfury, Blessed Blade of the Windseeker', 'Quel\'Serrar', 'Brutality Blade', 'Chromatically Tempered Sword', 'Maladath, Runed Blade of the Black Flight'],
  axe: ['Crul\'shorukh, Edge of Chaos', 'Deathbringer', 'Axe of the Deep Woods', 'Dooms Edge'],
  mace: ['Ironfoe', 'Empyrean Demolisher', 'Spineshatter', 'Anubisath Warhammer'],
  dagger: ['Perdition\'s Blade', 'Core Hound Tooth', 'Distracting Dagger', 'Gutgore Ripper', 'Alcor\'s Sunrazor'],
  '2hsword': ['Ashkandi, Greatsword of the Brotherhood', 'Obsidian Edged Blade', 'Herod\'s Shoulder', 'Arcanite Champion'],
  '2haxe': ['Arcanite Reaper', 'Bonereaver\'s Edge', 'Drake Talon Cleaver', 'Doomsday Axe'],
  '2hmace': ['Sulfuras, Hand of Ragnaros', 'Hammer of the Titans', 'Earthshaker', 'Unstoppable Force'],
  staff: ['Benediction', 'Staff of Dominance', 'Azuresong Mageblade', 'Staff of the Shadow Flame', 'Hammer of Grace'],
  bow: ['Rhok\'delar, Longbow of the Ancient Keepers', 'Striker\'s Mark', 'Ashjre\'thul, Crossbow of Smiting', 'Blastershot Launcher'],
  gun: ['Blastershot Launcher', 'Dragonbreath Hand Cannon', 'Gurubashi Dwarf Destroyer'],
  crossbow: ['Ashjre\'thul, Crossbow of Smiting', 'Heartstriker'],
};
const EPIC_ARMOR = {
  head:  ['Lionheart Helm', 'Crown of Destruction', 'Helm of Wrath', 'Mask of the Unforgiven', 'Circlet of Prophecy', 'Halo of Transcendence', 'Netherwind Crown', 'Stormrage Cover'],
  chest: ['Robe of Volatile Power', 'Breastplate of Might', 'Nightslayer Chestpiece', 'Earthfury Vestments', 'Robes of Prophecy', 'Cloudkeeper Legplates', 'Judgement Breastplate', 'Cenarion Vestments'],
  hands: ['Flameguard Gauntlets', 'Gauntlets of Might', 'Arcanist Gloves', 'Felheart Gloves', 'Gloves of Prophecy', 'Giantstalker\'s Gloves'],
  legs:  ['Legplates of Wrath', 'Bloodfang Pants', 'Netherwind Pants', 'Nemesis Leggings', 'Judgement Legplates', 'Stormrage Legguards'],
  feet:  ['Sabatons of Might', 'Boots of Prophecy', 'Dragonstalker\'s Greaves', 'Felheart Slippers', 'Nightslayer Boots', 'Earthfury Boots'],
  shoulder: ['Pauldrons of Might', 'Mantle of Prophecy', 'Nightslayer Shoulder Pads', 'Felheart Shoulder Pads', 'Earthfury Epaulets', 'Arcanist Mantle'],
  wrist: ['Bracers of Might', 'Vambraces of Prophecy', 'Nightslayer Bracelets', 'Felheart Bracers', 'Earthfury Bracers', 'Arcanist Bindings'],
  waist: ['Belt of Might', 'Girdle of Prophecy', 'Nightslayer Belt', 'Felheart Belt', 'Earthfury Belt', 'Arcanist Belt'],
  neck: ['Onyxia Tooth Pendant', 'Choker of Enlightenment', 'Medallion of Steadfast Might', 'Animated Chain Necklace', 'Prestor\'s Talisman of Connivery'],
  finger: ['Quick Strike Ring', 'Band of Accuria', 'Ring of Spell Power', 'Cauterizing Band', 'Heavy Dark Iron Ring', 'Seal of the Archmagus'],
  trinket: ['Hand of Justice', 'Blackhand\'s Breadth', 'Talisman of Ephemeral Power', 'Royal Seal of Eldre\'Thalas', 'Lifestone', 'Eye of Moam'],
  shield: ['Drillborer Disk', 'Elementium Reinforced Bulwark', 'Aegis of Preservation', 'Skullflame Shield', 'Malistar\'s Defender'],
  held: ['Sapphiron\'s Left Eye', 'Skull of Burning Shadows', 'Tome of the Ice Lord', 'Royal Scepter of Vek\'lor', 'Lei of Lilies'],
};

// ---------------------------------------------------------------------
//  Zones & mobs
//  enemy.type controls how it is drawn: 'quad' | 'biped' | 'spider' | 'blob'
//  enemy.ctype is the creature type (Beast, Humanoid, Undead, Demon…)
//  A zone is shown to a character when its races include the character's
//  race, or (without races) its faction is 'both' or the character's faction.
// ---------------------------------------------------------------------
const PALETTES = {
  elwynn:   { skyTop: '#6fb7e6', skyBottom: '#d6effa', sun: '#fff3b0', far: '#8fbf78', near: '#6fa257', foliage: '#4f8a3a', trunk: '#6b4a2b', rock: '#8d8f86', ground: '#7a9a43', groundDark: '#5a7631' },
  snow:     { skyTop: '#8fb3d9', skyBottom: '#e6f0fa', sun: '#ffffff', far: '#cfdcea', near: '#b4c7dc', foliage: '#2f4f4a', trunk: '#3e3a36', rock: '#9aa8b8', ground: '#eef4fa', groundDark: '#c7d6e6' },
  teldrassil: { skyTop: '#1a1f45', skyBottom: '#4a4a8a', sun: '#e6e6ff', far: '#2c3b5a', near: '#24304a', foliage: '#2f5a4a', trunk: '#4a3a5a', rock: '#5a5a7a', ground: '#3a5a3a', groundDark: '#2a4030' },
  durotar:  { skyTop: '#e9a66b', skyBottom: '#f6dcb3', sun: '#fff0c2', far: '#b0674a', near: '#94513a', foliage: '#6b6b35', trunk: '#5a3a24', rock: '#8a4a36', ground: '#a8603a', groundDark: '#7a432a' },
  mulgore:  { skyTop: '#7fb8e8', skyBottom: '#e0f0f8', sun: '#fff3b0', far: '#b8b06a', near: '#a09a50', foliage: '#7a8a3a', trunk: '#6b4a2b', rock: '#9a8a70', ground: '#b8a858', groundDark: '#8a7e40' },
  tirisfal: { skyTop: '#3a3f4a', skyBottom: '#7a8070', sun: '#d8d8c0', far: '#4a5040', near: '#3a4234', foliage: '#4a4a32', trunk: '#3a3028', rock: '#6a6a62', ground: '#4a5034', groundDark: '#343a24' },
  westfall: { skyTop: '#86c0e8', skyBottom: '#f0eac8', sun: '#fff3b0', far: '#c8b46a', near: '#b09a50', foliage: '#8a9a3a', trunk: '#6b4a2b', rock: '#9a8a70', ground: '#c8b060', groundDark: '#9a8440' },
  barrens:  { skyTop: '#9ccbe8', skyBottom: '#f4e2b8', sun: '#ffffff', far: '#c8a868', near: '#b08e50', foliage: '#7a7a3a', trunk: '#5a3a24', rock: '#a88a60', ground: '#c8a860', groundDark: '#a08440' },
  duskwood: { skyTop: '#1f2a3d', skyBottom: '#4c5a6b', sun: '#dfe6f0', far: '#2c3b34', near: '#24332b', foliage: '#1d3b2c', trunk: '#3a2a1f', rock: '#55595c', ground: '#3d4a2f', groundDark: '#2a3420' },
  ashenvale:{ skyTop: '#3a4a7a', skyBottom: '#9a9ac8', sun: '#f0f0ff', far: '#4a5a7a', near: '#3a4a6a', foliage: '#3a5a5a', trunk: '#4a3a4a', rock: '#6a6a8a', ground: '#4a6a4a', groundDark: '#344a34' },
  stv:      { skyTop: '#7ab8c8', skyBottom: '#d8ecd0', sun: '#fff8d0', far: '#3a6a3a', near: '#2a5a2a', foliage: '#2a6a2a', trunk: '#5a4a2a', rock: '#6a7a5a', ground: '#4a6a2a', groundDark: '#344a1e' },
  tanaris:  { skyTop: '#f2c36b', skyBottom: '#fbe9b8', sun: '#ffffff', far: '#e0b26e', near: '#d19c58', foliage: '#5f8a4a', trunk: '#7a5a35', rock: '#b98a55', ground: '#e2bc78', groundDark: '#c39a58' },
  ungoro:   { skyTop: '#8ac0a8', skyBottom: '#e0f0d0', sun: '#fff8c0', far: '#4a7a4a', near: '#3a6a3a', foliage: '#3a7a2a', trunk: '#5a4a2a', rock: '#7a6a5a', ground: '#5a7a3a', groundDark: '#3e5a28' },
  steppes:  { skyTop: '#2a0f0f', skyBottom: '#7a2a14', sun: '#ff7a2a', far: '#3a1a16', near: '#2a1310', foliage: '#3a2a24', trunk: '#1e1412', rock: '#3b2c28', ground: '#2e2220', groundDark: '#1c1412' },
};

const ZONES = [
  // ---- Starting zones (1–10), one per race ----
  {
    id: 'elwynn', name: 'Elwynn Forest', min: 1, max: 10, faction: 'alliance', races: ['human'],
    weather: 'leaves', deco: ['tree', 'tree', 'bush', 'rock'], palette: PALETTES.elwynn,
    enemies: [
      { name: 'Kobold Vermin', type: 'biped', ctype: 'humanoid', color: '#8a6a3a', accent: '#5a4022', skin: '#b58a52', size: 0.75, weapon: 'dagger', candle: true },
      { name: 'Prowler', type: 'quad', ctype: 'beast', color: '#7d7a74', accent: '#55524c', size: 0.9 },
      { name: 'Defias Thug', type: 'biped', ctype: 'humanoid', color: '#8f2a24', accent: '#3a2a20', skin: '#e0b48c', size: 0.95, weapon: 'dagger', hood: true },
    ],
    elites: [
      { name: 'Hogger', type: 'biped', ctype: 'humanoid', color: '#7a5a3a', accent: '#4a3220', skin: '#9a7650', size: 1.15, weapon: 'axe' },
      { name: 'Princess', type: 'quad', ctype: 'beast', color: '#7a4e33', accent: '#4e301e', size: 1.1, tusks: true },
      { name: 'Gruff Swiftbite', type: 'quad', ctype: 'beast', color: '#5f5a53', accent: '#3a3632', size: 1.05, eye: '#ffd24a' },
    ],
  },
  {
    id: 'dunmorogh', name: 'Dun Morogh', min: 1, max: 10, faction: 'alliance', races: ['dwarf', 'gnome'],
    weather: 'snow', deco: ['pine', 'rock', 'pine'], palette: PALETTES.snow,
    enemies: [
      { name: 'Frostmane Troll Whelp', type: 'biped', ctype: 'humanoid', color: '#3a6a5a', accent: '#2a3a2a', skin: '#7fb0c8', size: 0.9, weapon: 'axe', tusks: true },
      { name: 'Ice Claw Bear', type: 'quad', ctype: 'beast', color: '#e6edf2', accent: '#9fb0c2', size: 1.1 },
      { name: 'Juvenile Snow Leopard', type: 'quad', ctype: 'beast', color: '#d8d4c8', accent: '#8a8478', size: 0.85, eye: '#7fd3ff' },
    ],
    elites: [
      { name: 'Old Icebeard', type: 'biped', ctype: 'beast', color: '#e8eef3', accent: '#9aa8b8', skin: '#f2f6fa', size: 1.3, weapon: 'claws' },
      { name: 'Timber', type: 'quad', ctype: 'beast', color: '#6a5f50', accent: '#4a4238', size: 1.1 },
      { name: 'Mangeclaw', type: 'quad', ctype: 'beast', color: '#8a7a6a', accent: '#5a4a3a', size: 1.25 },
    ],
  },
  {
    id: 'teldrassil', name: 'Teldrassil', min: 1, max: 10, faction: 'alliance', races: ['nightelf'],
    weather: 'fireflies', deco: ['bigtree', 'bush', 'bigtree', 'rock'], palette: PALETTES.teldrassil,
    enemies: [
      { name: 'Grell', type: 'biped', ctype: 'demon', color: '#5a7a3a', accent: '#3a4a22', skin: '#8ab060', size: 0.7, weapon: 'claws' },
      { name: 'Nightsaber', type: 'quad', ctype: 'beast', color: '#4a3a6a', accent: '#2a2040', size: 0.95, eye: '#c0ff6a' },
      { name: 'Gnarlpine Ursa', type: 'biped', ctype: 'humanoid', color: '#6a4a2a', accent: '#3a2a18', skin: '#7a5a3a', size: 1.1, weapon: 'claws' },
      { name: 'Webwood Spider', type: 'spider', ctype: 'beast', color: '#3a2a3a', accent: '#7a2a8a', size: 0.85 },
    ],
    elites: [
      { name: 'Lord Melenas', type: 'biped', ctype: 'humanoid', color: '#5a3a22', accent: '#3a2414', skin: '#7a5a3a', size: 1.25, weapon: 'staff' },
      { name: 'Ursal the Mauler', type: 'quad', ctype: 'beast', color: '#3a3030', accent: '#221c1c', size: 1.25 },
      { name: 'Duskstalker', type: 'quad', ctype: 'beast', color: '#2a2040', accent: '#18122a', size: 1.05, eye: '#c0ff6a' },
    ],
  },
  {
    id: 'durotar', name: 'Durotar', min: 1, max: 10, faction: 'horde', races: ['orc', 'troll'],
    weather: 'dust', deco: ['rock', 'cactus', 'rock', 'bush'], palette: PALETTES.durotar,
    enemies: [
      { name: 'Mottled Boar', type: 'quad', ctype: 'beast', color: '#6a4a30', accent: '#3e2a1a', size: 0.85, tusks: true },
      { name: 'Scorpid Worker', type: 'spider', ctype: 'beast', color: '#a8502a', accent: '#4a2010', size: 0.85 },
      { name: 'Vile Familiar', type: 'biped', ctype: 'demon', color: '#a02a1a', accent: '#5a1408', skin: '#d0502a', size: 0.65, weapon: 'claws', horns: true },
    ],
    elites: [
      { name: 'Sarkoth', type: 'spider', ctype: 'beast', color: '#7a2a1a', accent: '#3a1008', size: 1.2 },
      { name: 'Captain Flat Tusk', type: 'quad', ctype: 'beast', color: '#5a3a24', accent: '#3a2414', size: 1.15, tusks: true },
      { name: 'Gazz\'uz', type: 'biped', ctype: 'humanoid', color: '#3a1a3a', accent: '#1a0a1a', skin: '#6f9a3a', size: 1.05, weapon: 'staff', hood: true },
    ],
  },
  {
    id: 'mulgore', name: 'Mulgore', min: 1, max: 10, faction: 'horde', races: ['tauren'],
    weather: 'leaves', deco: ['tent', 'bush', 'rock', 'tree'], palette: PALETTES.mulgore,
    enemies: [
      { name: 'Plainstrider', type: 'quad', ctype: 'beast', color: '#b89a70', accent: '#7a5e40', size: 0.85 },
      { name: 'Prairie Wolf', type: 'quad', ctype: 'beast', color: '#a08060', accent: '#6a5038', size: 0.9 },
      { name: 'Bristleback Quilboar', type: 'biped', ctype: 'humanoid', color: '#6a4a3a', accent: '#3a2418', skin: '#a07a5a', size: 0.95, weapon: 'axe', tusks: true },
    ],
    elites: [
      { name: 'Ghost Howl', type: 'quad', ctype: 'beast', color: '#e8e8f0', accent: '#a8a8b8', size: 1.1, eye: '#8ad8ff' },
      { name: 'Snagglespear', type: 'biped', ctype: 'humanoid', color: '#5a3a2a', accent: '#2a1a10', skin: '#8a6a4a', size: 1.15, weapon: 'axe', tusks: true },
      { name: 'Mazzranache', type: 'quad', ctype: 'beast', color: '#5a4a3a', accent: '#3a2a1a', size: 1.2 },
    ],
  },
  {
    id: 'tirisfal', name: 'Tirisfal Glades', min: 1, max: 10, faction: 'horde', races: ['undead'],
    weather: 'fireflies', deco: ['deadtree', 'grave', 'deadtree', 'rock'], palette: PALETTES.tirisfal,
    enemies: [
      { name: 'Rattlecage Skeleton', type: 'biped', ctype: 'undead', color: '#d8d4c4', accent: '#8a8678', skin: '#e8e4d4', size: 0.95, weapon: 'axe' },
      { name: 'Scarlet Convert', type: 'biped', ctype: 'humanoid', color: '#c02a2a', accent: '#e8e0d0', skin: '#e0b48c', size: 1, weapon: 'axe' },
      { name: 'Rotting Dead', type: 'biped', ctype: 'undead', color: '#5a6a4a', accent: '#3a4a2a', skin: '#8a9a7a', size: 1, weapon: 'claws' },
      { name: 'Duskbat', type: 'quad', ctype: 'beast', color: '#3a3040', accent: '#1a1420', size: 0.7, eye: '#ff4a4a' },
    ],
    elites: [
      { name: 'Bayne', type: 'quad', ctype: 'beast', color: '#4a3a2a', accent: '#2a2018', size: 1.1, eye: '#ff4a4a' },
      { name: 'Ressan the Needler', type: 'spider', ctype: 'beast', color: '#4a3a3a', accent: '#8a1f1f', size: 1.15 },
      { name: 'Muad', type: 'biped', ctype: 'humanoid', color: '#3a7a5a', accent: '#24503a', skin: '#5aa080', size: 1.0, weapon: 'dagger' },
    ],
  },
  // ---- 10–20 ----
  {
    id: 'westfall', name: 'Westfall', min: 10, max: 20, faction: 'alliance',
    weather: 'dust', deco: ['windmill', 'bush', 'tree', 'rock', 'bush'], palette: PALETTES.westfall,
    enemies: [
      { name: 'Defias Pillager', type: 'biped', ctype: 'humanoid', color: '#8f2a24', accent: '#3a2a20', skin: '#e0b48c', size: 1, weapon: 'staff', hood: true },
      { name: 'Harvest Golem', type: 'blob', ctype: 'mechanical', color: '#8a7a5a', accent: '#ffb04a', size: 0.95 },
      { name: 'Riverpaw Gnoll', type: 'biped', ctype: 'humanoid', color: '#8a6a3a', accent: '#5a4022', skin: '#a07a4a', size: 1, weapon: 'axe' },
      { name: 'Fleshripper', type: 'quad', ctype: 'beast', color: '#5a4a40', accent: '#2a2018', size: 0.85 },
    ],
    elites: [
      { name: 'Foe Reaper 4000', type: 'blob', ctype: 'mechanical', color: '#6a6a7a', accent: '#ff4a2a', size: 1.25 },
      { name: 'Vultros', type: 'quad', ctype: 'beast', color: '#4a3a30', accent: '#2a2018', size: 1.1 },
      { name: 'Leprithus', type: 'biped', ctype: 'undead', color: '#4a4a3a', accent: '#2a2a22', skin: '#a8b0a0', size: 1.1, weapon: 'staff', hood: true },
    ],
  },
  {
    id: 'barrens', name: 'The Barrens', min: 10, max: 20, faction: 'horde',
    weather: 'dust', deco: ['tree', 'rock', 'bush', 'rock'], palette: PALETTES.barrens,
    enemies: [
      { name: 'Zhevra Runner', type: 'quad', ctype: 'beast', color: '#e8e0d0', accent: '#3a3028', size: 0.95, stripes: true },
      { name: 'Razormane Quilboar', type: 'biped', ctype: 'humanoid', color: '#5a3a2a', accent: '#2a1a10', skin: '#8a6a4a', size: 1, weapon: 'axe', tusks: true },
      { name: 'Savannah Huntress', type: 'quad', ctype: 'beast', color: '#c8a060', accent: '#8a6a3a', size: 1.0 },
    ],
    elites: [
      { name: 'Humar the Pridelord', type: 'quad', ctype: 'beast', color: '#a07a3a', accent: '#6a4a1a', size: 1.25 },
      { name: 'Rocklance', type: 'biped', ctype: 'humanoid', color: '#4a2a1a', accent: '#2a1a10', skin: '#7a5a3a', size: 1.15, weapon: 'axe', tusks: true },
      { name: 'Brokespear', type: 'biped', ctype: 'humanoid', color: '#5a3a1a', accent: '#2a1a0a', skin: '#8a6a4a', size: 1.15, weapon: 'staff', tusks: true },
    ],
  },
  // ---- 20–30 ----
  {
    id: 'duskwood', name: 'Duskwood', min: 20, max: 30, faction: 'alliance',
    weather: 'fireflies', deco: ['pine', 'deadtree', 'grave', 'pine'], palette: PALETTES.duskwood,
    enemies: [
      { name: 'Nightbane Worgen', type: 'biped', ctype: 'humanoid', color: '#3a3a40', accent: '#22222a', skin: '#5a5a62', size: 1.1, weapon: 'claws', eye: '#ffd24a' },
      { name: 'Skeletal Warrior', type: 'biped', ctype: 'undead', color: '#d8d4c4', accent: '#8a8678', skin: '#e8e4d4', size: 1, weapon: 'axe' },
      { name: 'Venom Web Spider', type: 'spider', ctype: 'beast', color: '#2e2a26', accent: '#8a1f1f', size: 1.0 },
    ],
    elites: [
      { name: 'Mor\'Ladim', type: 'biped', ctype: 'undead', color: '#5a5a5a', accent: '#2a2a2a', skin: '#c8c4b4', size: 1.25, weapon: 'axe' },
      { name: 'Stitches', type: 'biped', ctype: 'undead', color: '#7a8a6a', accent: '#4a5a3a', skin: '#9aa88a', size: 1.4, weapon: 'axe' },
      { name: 'Naraxis', type: 'spider', ctype: 'beast', color: '#1e1a16', accent: '#a02a2a', size: 1.3 },
    ],
  },
  {
    id: 'ashenvale', name: 'Ashenvale', min: 20, max: 30, faction: 'horde',
    weather: 'leaves', deco: ['bigtree', 'pine', 'bush'], palette: PALETTES.ashenvale,
    enemies: [
      { name: 'Ashenvale Bear', type: 'quad', ctype: 'beast', color: '#4a3a2a', accent: '#2a2018', size: 1.15 },
      { name: 'Foulweald Totemic', type: 'biped', ctype: 'humanoid', color: '#5a4a3a', accent: '#3a2a1a', skin: '#6a5a4a', size: 1.1, weapon: 'staff' },
      { name: 'Ghostpaw Runner', type: 'quad', ctype: 'beast', color: '#c8c8d8', accent: '#8a8aa0', size: 0.95, eye: '#8ad8ff' },
      { name: 'Dark Strand Cultist', type: 'biped', ctype: 'humanoid', color: '#2a1a3a', accent: '#140a20', skin: '#9c86c9', size: 1, weapon: 'staff', hood: true },
    ],
    elites: [
      { name: 'Ursangous', type: 'quad', ctype: 'beast', color: '#3a2a20', accent: '#1e1410', size: 1.3 },
      { name: 'Terrowulf Packlord', type: 'biped', ctype: 'humanoid', color: '#3a3a40', accent: '#22222a', skin: '#5a5a62', size: 1.2, weapon: 'claws', eye: '#ffd24a' },
      { name: 'Shadumbra', type: 'quad', ctype: 'beast', color: '#2a2a3a', accent: '#14141e', size: 1.1, eye: '#c0ff6a' },
    ],
  },
  // ---- Shared zones 30–60 ----
  {
    id: 'stv', name: 'Stranglethorn Vale', min: 30, max: 40, faction: 'both',
    weather: 'rain', deco: ['palm', 'fern', 'palm', 'bush'], palette: PALETTES.stv,
    enemies: [
      { name: 'Stranglethorn Tiger', type: 'quad', ctype: 'beast', color: '#d8882a', accent: '#2a1a10', size: 1.05, stripes: true },
      { name: 'Bloodscalp Headhunter', type: 'biped', ctype: 'humanoid', color: '#3a5a3a', accent: '#2a2a18', skin: '#4a8a8a', size: 1.05, weapon: 'axe', tusks: true },
      { name: 'Venture Co. Mercenary', type: 'biped', ctype: 'humanoid', color: '#5a4a3a', accent: '#3a3a3a', skin: '#6a9a3a', size: 0.8, weapon: 'axe' },
      { name: 'Lashtail Raptor', type: 'quad', ctype: 'beast', color: '#5a7a3a', accent: '#34481e', size: 0.95 },
    ],
    elites: [
      { name: 'King Bangalash', type: 'quad', ctype: 'beast', color: '#e8e0d0', accent: '#2a2a2a', size: 1.3, stripes: true },
      { name: 'Mosh\'Ogg Lord', type: 'biped', ctype: 'humanoid', color: '#5a3a6a', accent: '#2a1a3a', skin: '#8a6a9a', size: 1.4, weapon: 'axe' },
      { name: 'King Mukla', type: 'biped', ctype: 'beast', color: '#3a3030', accent: '#1e1818', skin: '#5a4a4a', size: 1.3, weapon: 'claws' },
    ],
  },
  {
    id: 'tanaris', name: 'Tanaris', min: 40, max: 48, faction: 'both',
    weather: 'dust', deco: ['cactus', 'rock', 'cactus'], palette: PALETTES.tanaris,
    enemies: [
      { name: 'Wastewander Bandit', type: 'biped', ctype: 'humanoid', color: '#c9a46a', accent: '#5a2f1a', skin: '#a8754a', size: 1.0, weapon: 'dagger', hood: true },
      { name: 'Scorpid Hunter', type: 'spider', ctype: 'beast', color: '#b8894a', accent: '#5a3a1a', size: 1.1 },
      { name: 'Sandfury Axe Thrower', type: 'biped', ctype: 'humanoid', color: '#7a5a3a', accent: '#4a3220', skin: '#5a8ab0', size: 1.05, weapon: 'axe', tusks: true },
      { name: 'Searing Roc', type: 'quad', ctype: 'beast', color: '#b06a3a', accent: '#6a3a1a', size: 1.05 },
    ],
    elites: [
      { name: 'Omgorn the Lost', type: 'biped', ctype: 'humanoid', color: '#6a4a3a', accent: '#3a2a1a', skin: '#c08060', size: 1.45, weapon: 'axe' },
      { name: 'Kregg Keelhaul', type: 'biped', ctype: 'humanoid', color: '#2a3a6a', accent: '#1a1a2a', skin: '#6a9a3a', size: 0.95, weapon: 'dagger' },
      { name: 'Soriid the Devourer', type: 'blob', ctype: 'beast', color: '#c8a050', accent: '#6a4a1a', size: 1.4 },
    ],
  },
  {
    id: 'ungoro', name: 'Un\'Goro Crater', min: 48, max: 54, faction: 'both',
    weather: 'leaves', deco: ['fern', 'palm', 'crystal', 'fern'], palette: PALETTES.ungoro,
    enemies: [
      { name: 'Devilsaur', type: 'quad', ctype: 'beast', color: '#3a5a3a', accent: '#2a3a1e', size: 1.5 },
      { name: 'Ravasaur Runner', type: 'quad', ctype: 'beast', color: '#8a6a3a', accent: '#4a3a1a', size: 0.9 },
      { name: 'Tar Lurker', type: 'blob', ctype: 'elemental', color: '#1e1a1a', accent: '#6a5a4a', size: 1.0 },
      { name: 'Gorishi Reaver', type: 'spider', ctype: 'beast', color: '#a89a3a', accent: '#4a4a1a', size: 1.05 },
    ],
    elites: [
      { name: 'King Mosh', type: 'quad', ctype: 'beast', color: '#7a2a1a', accent: '#3a140a', size: 1.7 },
      { name: 'Clutchmother Zavas', type: 'quad', ctype: 'beast', color: '#6a5a2a', accent: '#3a2a10', size: 1.2 },
      { name: 'Uhk\'loc', type: 'biped', ctype: 'beast', color: '#3a3030', accent: '#1e1818', skin: '#5a4a4a', size: 1.35, weapon: 'claws' },
    ],
  },
  {
    id: 'steppes', name: 'Burning Steppes', min: 54, max: 60, faction: 'both',
    weather: 'embers', deco: ['spire', 'deadtree', 'rock'], palette: PALETTES.steppes,
    enemies: [
      { name: 'Blackrock Soldier', type: 'biped', ctype: 'humanoid', color: '#2a2a2a', accent: '#8a1a1a', skin: '#6a8a3a', size: 1.05, weapon: 'axe', tusks: true },
      { name: 'Firegut Brute', type: 'biped', ctype: 'humanoid', color: '#6a4a3a', accent: '#3a2a1a', skin: '#c08060', size: 1.35, weapon: 'axe' },
      { name: 'Thaurissan Firewalker', type: 'blob', ctype: 'elemental', color: '#d9541a', accent: '#ffd36a', size: 1.1 },
      { name: 'Black Dragonspawn', type: 'biped', ctype: 'dragonkin', color: '#2a1a1a', accent: '#5a1a1a', skin: '#3a2a2a', size: 1.3, weapon: 'claws', horns: true, eye: '#ffb04a' },
    ],
    elites: [
      { name: 'Gorgon\'och', type: 'biped', ctype: 'humanoid', color: '#5a2a1a', accent: '#2a140a', skin: '#c08060', size: 1.5, weapon: 'staff' },
      { name: 'Hahk\'Zor', type: 'biped', ctype: 'humanoid', color: '#3a2a2a', accent: '#1a1414', skin: '#b07050', size: 1.45, weapon: 'axe' },
      { name: 'Terrorspark', type: 'blob', ctype: 'demon', color: '#ff6a1a', accent: '#ffe08a', size: 1.3 },
    ],
  },
];

const CREATURE_TYPES = { beast: 'Beast', humanoid: 'Humanoid', undead: 'Undead', demon: 'Demon', elemental: 'Elemental', mechanical: 'Mechanical', dragonkin: 'Dragonkin', giant: 'Giant' };

// ---------------------------------------------------------------------
//  Professions (bought with gold). cost = base * growth^rank (copper)
// ---------------------------------------------------------------------
const PROFESSIONS = [
  { id: 'blacksmithing', name: 'Blacksmithing', icon: '⚒️', base: 30,  growth: 1.22, max: 60, desc: r => `Sharpening stones & weightstones: +${6 * r}% damage` },
  { id: 'weaponskill',   name: 'Weapon Skill',  icon: '🎯', base: 60,  growth: 1.32, max: 30, desc: r => `+${3 * r}% attack and casting speed` },
  { id: 'cooking',       name: 'Cooking',       icon: '🍖', base: 45,  growth: 1.26, max: 50, desc: r => `Well Fed: +${6 * r}% maximum health` },
  { id: 'firstaid',      name: 'First Aid',     icon: '🩹', base: 40,  growth: 1.28, max: 40, desc: r => `Linen to Runecloth Bandages: +${10 * r}% health regeneration` },
  { id: 'inn',           name: 'Rested at the Inn', icon: '🍺', base: 100, growth: 1.38, max: 40, desc: r => `Rested bonus: +${5 * r}% experience` },
  { id: 'skinning',      name: 'Skinning',      icon: '🔪', base: 80,  growth: 1.33, max: 40, desc: r => `+${8 * r}% gold from kills` },
  { id: 'riding',        name: 'Riding',        icon: '🐎', base: 150, growth: 1.6,  max: 10, minLevel: 40, desc: r => `Mounted: +${6 * r}% travel and spawn speed` },
  { id: 'gathering',     name: 'Herbalism & Mining', icon: '🌿', base: 200, growth: 1.5, max: 20, desc: r => `+${5 * r}% loot drop chance` },
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

// Class trainer price for a spell rank learned at level lv (copper)
function trainCost(lv) { return Math.round(lv * lv * lv * 0.06 + lv * 10); }

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
