// =====================================================================
//  The Leveling Road — dungeons
//  A run is a fixed sequence of fights: a few trash pulls, then a boss,
//  repeated until the last boss falls. Bosses have simple mechanics
//  (interruptible casts, heavy smashes, fear, enrage, adds) and drop named
//  Classic loot fitted to your class. Dying or leaving keeps the bosses you
//  killed; a full clear starts a cooldown before the dungeon can be run again.
// =====================================================================
'use strict';

const DUNGEON_LOCKOUT_MIN = 15;        // real minutes between full clears of the same dungeon
const DUNGEON_SAVE_HOURS = 2;          // killed bosses stay dead this long after a wipe or leaving
const DUNGEON_HOURLY_CAP = 5;          // new runs per hour, as in Classic (resuming a saved run doesn't count)
const DUNGEON_TRASH_PER_BOSS = 2;      // trash pulls before each boss
const DUNGEON_REST = { hp: 0.65, mana: 0.4, bossHp: 0.95, bossMana: 0.8, max: 25 };   // rest before a pull below this (bosses: higher), for up to `max` seconds
const DUNGEON_POTION = { below: 0.3, heal: 0.4, cd: 120 };   // Healing Potion: used automatically inside dungeons
// Multipliers against a normal mob of the same level (hp, damage, experience, gold)
// Sized for a group of five (see party.js)
const DUNGEON_TUNING = {
  trash: { hp: 10, dmg: 2.8, xp: 2.6, gold: 1.5, loot: 1.6 },
  boss:  { hp: 38, dmg: 3.8, xp: 12,  gold: 6 },
  final: { hp: 42, dmg: 3.7, xp: 20,  gold: 12 },
  add:   { hp: 3,  dmg: 1.8, xp: 1,   gold: 0.5 },
  // raids (raids.js): the rest of the raid helps, so bosses are much bigger
  rtrash: { hp: 14,  dmg: 3,   xp: 0, gold: 2, loot: 1.2 },
  rboss:  { hp: 150, dmg: 4.6, xp: 0, gold: 10 },
  rfinal: { hp: 200, dmg: 5.2, xp: 0, gold: 20 },
  radd:   { hp: 4,   dmg: 2.2, xp: 0, gold: 0.5 },
};
// Boss mechanics: every = seconds between uses, cast = cast time, int = can be interrupted by a stun/Kick
const BOSS_MECHS = {
  bolt:  { every: 10, cast: 2,   int: true,  mult: 1.8 },   // spell hit, ignores armor
  heal:  { every: 14, cast: 2.5, int: true,  pct: 0.12 },   // heals the boss (only when hurt)
  smash: { every: 12, cast: 1.2, int: false, mult: 2 },     // heavy physical hit
  fear:  { every: 22, cast: 1,   int: true,  dur: 2.5 },    // you can't act for a moment
  enrage: { below: 0.3, dmg: 1.4, speed: 0.75 },
  adds:  { below: 0.5 },
  berserk: {},                                              // 'berserk:Berserk:<seconds>': soft enrage timer (raids)
};

// ---------- appearance helpers ----------
const bip = (color, accent, skin, size, weapon, x) => Object.assign({ type: 'biped', ctype: 'humanoid', color, accent, skin, size, weapon }, x);
const beast = (color, accent, size, x) => Object.assign({ type: 'quad', ctype: 'beast', color, accent, size }, x);
const blob = (color, accent, size, ctype) => ({ type: 'blob', ctype: ctype || 'elemental', color, accent, size });
const spider = (color, accent, size) => ({ type: 'spider', ctype: 'beast', color, accent, size });
const UNDEAD = { ctype: 'undead', eye: '#7fe0ff' };
const DEMON = { ctype: 'demon', horns: true, eye: '#7aff4a' };

// Indoor palettes: skyTop = ceiling, skyBottom = back wall glow, far = wall, near = mortar/trim
const DPAL = {
  cave:    { skyTop: '#0e0b08', skyBottom: '#2a2018', sun: '#ffb050', far: '#3a2e24', near: '#241c16', foliage: '#4a3a2a', trunk: '#2a2018', rock: '#5a4a3a', ground: '#3a3026', groundDark: '#241e18' },
  lava:    { skyTop: '#120604', skyBottom: '#4a1608', sun: '#ff6a1a', far: '#3a1a12', near: '#24100a', foliage: '#5a2a14', trunk: '#1e0e08', rock: '#4a2a1e', ground: '#2e1a12', groundDark: '#1a0e08' },
  mine:    { skyTop: '#0c0a08', skyBottom: '#2e2418', sun: '#ffc060', far: '#4a3a28', near: '#2a2016', foliage: '#5a4630', trunk: '#4a3420', rock: '#6a5a46', ground: '#4a3c2c', groundDark: '#2e261c' },
  keep:    { skyTop: '#0a0a10', skyBottom: '#22222e', sun: '#c8d0ff', far: '#3a3a46', near: '#24242e', foliage: '#3a4a3a', trunk: '#2a2a30', rock: '#5a5a66', ground: '#34343c', groundDark: '#22222a' },
  water:   { skyTop: '#06101a', skyBottom: '#123446', sun: '#7ad8ff', far: '#1e3a4a', near: '#122630', foliage: '#2a5a5a', trunk: '#1a2a30', rock: '#3a5a66', ground: '#22404a', groundDark: '#142a32' },
  tech:    { skyTop: '#0a0e0c', skyBottom: '#1e2e26', sun: '#7aff9a', far: '#3a4a46', near: '#222e2a', foliage: '#4a6a3a', trunk: '#3a4440', rock: '#6a7a76', ground: '#3a4642', groundDark: '#242e2a' },
  thorns:  { skyTop: '#140c08', skyBottom: '#3a2614', sun: '#ffb070', far: '#4a3220', near: '#2e1e12', foliage: '#5a4a1e', trunk: '#3a2614', rock: '#6a4a30', ground: '#4a3420', groundDark: '#2e2014' },
  abbey:   { skyTop: '#0e0a0a', skyBottom: '#3a2a26', sun: '#ffd27a', far: '#5a4a44', near: '#3a2e2a', foliage: '#6a2020', trunk: '#3a2a26', rock: '#7a6a62', ground: '#4a3e3a', groundDark: '#2e2624' },
  titan:   { skyTop: '#0a0c10', skyBottom: '#26303a', sun: '#9ad8ff', far: '#4a5058', near: '#2e3238', foliage: '#4a5a5a', trunk: '#3a3e44', rock: '#7a8088', ground: '#44484e', groundDark: '#2a2e34' },
  sand:    { skyTop: '#d89a4a', skyBottom: '#f6dca0', sun: '#ffffff', far: '#c8945a', near: '#b07a44', foliage: '#6a7a3a', trunk: '#6a4a2a', rock: '#a87a4a', ground: '#d8b070', groundDark: '#b48c50' },
  grove:   { skyTop: '#0c120a', skyBottom: '#24361e', sun: '#c8ff7a', far: '#2e3e24', near: '#1e2a16', foliage: '#4a7a2a', trunk: '#3a2e1e', rock: '#5a5a3e', ground: '#34442a', groundDark: '#22301a' },
  plague:  { skyTop: '#0a0c0a', skyBottom: '#26301e', sun: '#b8ff6a', far: '#3a3e34', near: '#24281e', foliage: '#4a5a2a', trunk: '#2a2a22', rock: '#5a5e4e', ground: '#34382c', groundDark: '#22261c' },
};

// Loot entries: '<type> <Name>'. type = a weapon type, 'shield' / 'held', 'neck' / 'finger' / 'trinket',
// or <armor>.<slot> with armor clo / lea / mai / pla.
const DUNGEONS = [
  {
    id: 'rfc', name: 'Ragefire Chasm', where: 'Orgrimmar', faction: 'horde', min: 13, max: 18, lv: [13, 16],
    palette: DPAL.lava, deco: ['stalagmite', 'rock', 'brazier'], weather: 'embers', music: ['DayVolcanic01-new', 'battle03'],
    trash: [bip('#6a6a7a', '#3a3a46', '#8a8a96', 0.8, 'claws', { name: 'Ragefire Trogg' }), bip('#7a2a1e', '#2a1410', '#6a8a4a', 0.95, 'dagger', { name: 'Searing Blade Cultist', hood: true }), blob('#c84a1a', '#ffb050', 0.8, 'elemental')],
    trashNames: ['Ragefire Trogg', 'Searing Blade Cultist', 'Molten Elemental'],
    bosses: [
      { name: 'Oggleflint', def: bip('#5a5a6a', '#2e2e3a', '#7a7a88', 1.05, 'axe'), mech: ['smash:Cleave'], loot: ['mai.hands Cavedweller Bracers', 'lea.feet Oggleflint\'s Treads'] },
      { name: 'Taragaman the Hungerer', def: bip('#8a1a1a', '#3a0a0a', '#a83a2a', 1.25, 'claws', DEMON), mech: ['smash:Uppercut', 'bolt:Fire Nova'], loot: ['sword Cursed Felblade', 'clo.wrist Crystalline Cuffs', 'clo.chest Robes of Antiquity'] },
      { name: 'Jergosh the Invoker', def: bip('#4a2a5a', '#1e1024', '#6a8a4a', 1.05, 'staff', { hood: true }), mech: ['bolt:Shadow Bolt', 'fear:Curse of Weakness'], loot: ['clo.waist Jergosh\'s Sash', 'trinket Felstone Good Luck Charm'] },
      { name: 'Bazzalan', def: bip('#6a2a2a', '#2a1010', '#a83a2a', 1.1, 'dagger', DEMON), mech: ['bolt:Sinister Strike', 'enrage'], loot: ['dagger Chanting Blade', 'lea.chest Bloodstorm Vest'] },
    ],
  },
  {
    id: 'wc', name: 'Wailing Caverns', where: 'The Barrens', faction: 'both', min: 17, max: 24, lv: [17, 22],
    palette: DPAL.grove, deco: ['fern', 'stalagmite', 'rock'], weather: 'fireflies', music: ['mystery01-zone', 'magic01-zone1'],
    trash: [beast('#5a8a3a', '#2e4a1e', 0.95, { eye: '#ffd24a' }), bip('#3a5a2a', '#1e2e14', '#c89a7a', 0.95, 'staff', { hood: true }), blob('#6ac84a', '#c8ff7a', 0.75, 'beast')],
    trashNames: ['Deviate Raptor', 'Druid of the Fang', 'Evolving Ectoplasm'],
    bosses: [
      { name: 'Lady Anacondra', def: bip('#2a6a3a', '#123018', '#c89a7a', 1.05, 'staff', { hood: true }), mech: ['bolt:Lightning Bolt', 'heal:Healing Touch'], loot: ['lea.shoulder Serpent\'s Shoulders', 'clo.chest Belt of the Fang'] },
      { name: 'Lord Cobrahn', def: bip('#3a6a2a', '#1a3010', '#c89a7a', 1.05, 'staff', { hood: true }), mech: ['bolt:Poison', 'heal:Healing Touch'], loot: ['lea.legs Leggings of the Fang', 'clo.chest Robe of the Moccasin'] },
      { name: 'Lord Pythas', def: bip('#2a5a4a', '#103024', '#c89a7a', 1.05, 'staff', { hood: true }), mech: ['bolt:Thunderclap', 'heal:Healing Touch'], loot: ['mace Stinging Viper', 'lea.hands Gloves of the Fang'] },
      { name: 'Lord Serpentis', def: bip('#4a6a2a', '#243014', '#c89a7a', 1.05, 'staff', { hood: true }), mech: ['bolt:Lightning Bolt', 'heal:Healing Touch'], loot: ['bow Venomstrike', 'lea.feet Footpads of the Fang', 'mai.feet Savage Trodders'] },
      { name: 'Verdan the Everliving', def: blob('#3a8a2a', '#9aff6a', 1.15, 'elemental'), mech: ['smash:Grasping Vines'], loot: ['staff Living Root', 'shield Seedcloud Buckler'] },
      { name: 'Mutanus the Devourer', def: bip('#3a7a8a', '#1a3a44', '#5aa8b8', 1.2, 'claws', { eye: '#ffeb3a' }), mech: ['fear:Terrify', 'smash:Thundercrack'], loot: ['mai.chest Mutant Scale Breastplate', 'lea.hands Slime-encrusted Pads'] },
    ],
  },
  {
    id: 'deadmines', name: 'The Deadmines', where: 'Westfall', faction: 'alliance', min: 17, max: 26, lv: [17, 21],
    palette: DPAL.mine, deco: ['crate', 'beam', 'rock', 'cannon'], weather: 'dust', music: ['mystery03-zone', 'battle04'],
    trash: [bip('#7a5a3a', '#3a2a1a', '#e0b48c', 0.95, 'axe', { hood: true }), bip('#8f2a24', '#3a2a20', '#e0b48c', 0.95, 'dagger', { hood: true }), bip('#4a6a3a', '#2a3a20', '#7ab04a', 0.75, 'axe', { tusks: false })],
    trashNames: ['Defias Miner', 'Defias Pirate', 'Goblin Engineer'],
    bosses: [
      { name: 'Rhahk\'Zor', def: bip('#7a8a5a', '#3a4426', '#9aa86a', 1.25, 'mace', { tusks: true }), mech: ['smash:Rhahk\'Zor Slam'], loot: ['2hmace Rhahk\'Zor\'s Hammer', 'mai.feet Foreman\'s Boots'] },
      { name: 'Sneed', def: blob('#8a8a7a', '#ffb030', 1.1, 'mechanical'), mech: ['smash:Distracting Pain', 'adds:Goblin Engineer:1'], loot: ['axe Buzzer Blade', 'clo.hands Gold-flecked Gloves', '2haxe Taskmaster Axe'] },
      { name: 'Gilnid', def: bip('#4a6a3a', '#2a3a20', '#7ab04a', 0.95, 'mace'), mech: ['bolt:Molten Metal', 'adds:Goblin Craftsman:2'], loot: ['lea.legs Smelting Pants', 'finger Lavishly Jeweled Ring'] },
      { name: 'Mr. Smite', def: bip('#6a4a2a', '#2a1e12', '#8a6a4a', 1.25, 'mace', { horns: true }), mech: ['smash:Smite Stomp', 'enrage'], loot: ['2hmace Smite\'s Mighty Hammer', 'axe Smite\'s Reaver', 'sword Thief\'s Blade'] },
      { name: 'Captain Greenskin', def: bip('#2a3a6a', '#141a30', '#7ab04a', 1.05, 'sword'), mech: ['smash:Cleave', 'adds:Defias Pirate:1'], loot: ['staff Emberstone Staff', 'clo.chest Corsair\'s Overshirt'] },
      { name: 'Edwin VanCleef', def: bip('#7a1a1a', '#1e0e0e', '#e0b48c', 1.1, 'sword', { hood: true }), mech: ['adds:Defias Blackguard:2', 'smash:Thrash', 'enrage'], loot: ['sword Cruel Barb', 'lea.chest Blackened Defias Armor', 'lea.legs Blackened Defias Leggings'] },
    ],
  },
  {
    id: 'sfk', name: 'Shadowfang Keep', where: 'Silverpine Forest', faction: 'both', min: 22, max: 30, lv: [22, 26],
    palette: DPAL.keep, deco: ['pillar', 'banner', 'brazier'], weather: null, music: ['spooky01-moment', 'gloomy02', 'CursedLand02'],
    trash: [bip('#4a4a4a', '#222222', '#6a6a6a', 1, 'claws', { name: 'Shadowfang Moonwalker', ctype: 'humanoid', eye: '#ffd24a' }), bip('#5a5a6a', '#2a2a34', '#9aa8b0', 0.95, 'axe', UNDEAD), beast('#3a3a3a', '#1e1e1e', 1, { eye: '#ff4a2a' })],
    trashNames: ['Shadowfang Moonwalker', 'Haunted Servitor', 'Bleak Worg'],
    bosses: [
      { name: 'Razorclaw the Butcher', def: bip('#6a3a2a', '#2a1610', '#c89a7a', 1.15, 'axe'), mech: ['smash:Butcher Drain', 'enrage'], loot: ['axe Butcher\'s Cleaver', 'sword Butcher\'s Slicer'] },
      { name: 'Baron Silverlaine', def: bip('#4a4a5a', '#24242e', '#9aa8b0', 1.1, 'sword', UNDEAD), mech: ['adds:Haunted Servitor:2', 'bolt:Veil of Shadow'], loot: ['finger Silverlaine\'s Family Seal', 'mace Baron\'s Scepter'] },
      { name: 'Commander Springvale', def: bip('#6a6a7a', '#2e2e3a', '#9aa8b0', 1.15, 'mace', UNDEAD), mech: ['heal:Holy Light', 'smash:Hammer of Justice'], loot: ['shield Commander\'s Crest', 'lea.shoulder Ghostly Mantle'] },
      { name: 'Fenrus the Devourer', def: beast('#2a2a2a', '#141414', 1.2, { eye: '#ff3a2a' }), mech: ['smash:Toxic Saliva', 'enrage'], loot: ['lea.chest Fenrus\' Hide', 'clo.wrist Black Wolf Bracers'] },
      { name: 'Archmage Arugal', def: bip('#4a2a6a', '#1e1030', '#c8c0b0', 1.1, 'staff', { hood: true }), mech: ['bolt:Void Bolt', 'adds:Shadowfang Moonwalker:2', 'fear:Arugal\'s Curse'], loot: ['dagger Meteor Shard', 'clo.chest Robes of Arugal', 'clo.waist Belt of Arugal'] },
    ],
  },
  {
    id: 'bfd', name: 'Blackfathom Deeps', where: 'Ashenvale', faction: 'both', min: 24, max: 32, lv: [24, 28],
    palette: DPAL.water, deco: ['pillar', 'coral', 'rock'], weather: null, music: ['mystery02-zone', 'magic01-zone1'],
    trash: [bip('#2a7a7a', '#103a3a', '#4ab0a0', 1, 'dagger', { name: 'Blackfathom Tide Priestess' }), beast('#4a6a3a', '#24361e', 1, { name: 'Aku\'mai Snapjaw' }), bip('#3a2a5a', '#1a1028', '#c89a7a', 0.95, 'staff', { hood: true })],
    trashNames: ['Blackfathom Tide Priestess', 'Aku\'mai Snapjaw', 'Twilight Acolyte'],
    bosses: [
      { name: 'Ghamoo-ra', def: beast('#4a7a5a', '#244030', 1.25), mech: ['smash:Trample'], loot: ['mai.chest Tortoise Armor'] },
      { name: 'Lady Sarevess', def: bip('#2a8a8a', '#104040', '#4ab0a0', 1.15, 'sword'), mech: ['bolt:Forked Lightning', 'adds:Blackfathom Tide Priestess:1'], loot: ['bow Naga Heartpiercer', '2hsword Strike of the Hydra'] },
      { name: 'Twilight Lord Kelris', def: bip('#2a1a4a', '#120a24', '#c89a7a', 1.1, 'staff', { hood: true }), mech: ['bolt:Mind Blast', 'fear:Sleep'], loot: ['staff Rod of the Sleepwalker', 'clo.legs Gaze Dreamer Pants'] },
      { name: 'Aku\'mai', def: beast('#3a6a4a', '#1a3624', 1.35, { eye: '#ffd24a', tusks: true }), mech: ['smash:Poison Cloud', 'enrage'], loot: ['mai.head Fire-hardened Coif', 'shield Charging Buckler', 'finger Deep Fathom Ring'] },
    ],
  },
  {
    id: 'rfk', name: 'Razorfen Kraul', where: 'The Barrens', faction: 'both', min: 25, max: 35, lv: [25, 30],
    palette: DPAL.thorns, deco: ['thorns', 'rock', 'thorns'], weather: 'dust', music: ['mystery01-zone', 'battle05'],
    trash: [bip('#7a5a3a', '#3a2a1a', '#c8a07a', 1, 'axe', { tusks: true }), bip('#5a3a2a', '#2a1a10', '#c8a07a', 0.95, 'staff', { tusks: true }), beast('#6a5a4a', '#3a2e24', 0.95, { tusks: true })],
    trashNames: ['Razorfen Quilguard', 'Death\'s Head Acolyte', 'Kraul Bat'],
    bosses: [
      { name: 'Aggem Thorncurse', def: bip('#6a4a2a', '#2e2010', '#c8a07a', 1.1, 'staff', { tusks: true }), mech: ['heal:Chain Heal', 'adds:Kraul Bat:1'], loot: ['clo.chest Thorncurse Robe'] },
      { name: 'Death Speaker Jargba', def: bip('#4a2a2a', '#1e1010', '#c8a07a', 1.1, 'staff', { tusks: true }), mech: ['bolt:Shadow Bolt', 'fear:Dominate Mind'], loot: ['clo.shoulder Death Speaker Mantle', 'mace Death Speaker Scepter'] },
      { name: 'Agathelos the Raging', def: beast('#7a4a2a', '#3a2010', 1.3, { tusks: true }), mech: ['smash:Rampage', 'enrage'], loot: ['lea.hands Swine Fists', 'lea.chest Agathelos\' Hide'] },
      { name: 'Charlga Razorflank', def: bip('#6a2a4a', '#2e1020', '#c8a07a', 1.15, 'staff', { tusks: true }), mech: ['bolt:Chain Bolt', 'heal:Renew'], loot: ['shield Heart of Agamaggan', 'finger Agamaggan\'s Clutch', 'clo.waist Razorflank Sash'] },
    ],
  },
  {
    id: 'gnomeregan', name: 'Gnomeregan', where: 'Dun Morogh', faction: 'both', min: 29, max: 38, lv: [28, 34],
    palette: DPAL.tech, deco: ['gear', 'pipe', 'crate'], weather: null, music: ['gnomeragon01-zone'],
    trash: [bip('#4a8a3a', '#24461e', '#9ac87a', 0.7, 'dagger', { name: 'Leper Gnome' }), blob('#8a8a8a', '#ff7a2a', 0.95, 'mechanical'), bip('#4a3a3a', '#1e1414', '#6a5a5a', 0.85, 'mace')],
    trashNames: ['Leper Gnome', 'Mechano-Tank', 'Dark Iron Agent'],
    bosses: [
      { name: 'Grubbis', def: bip('#6a5a3a', '#2e2618', '#a8946a', 1.2, 'claws'), mech: ['smash:Cone of Fire', 'adds:Leper Gnome:2'], loot: ['lea.hands Grubbis Paws'] },
      { name: 'Viscous Fallout', def: blob('#5ac83a', '#c8ff5a', 1.1, 'elemental'), mech: ['bolt:Toxic Volley'], loot: ['dagger Toxic Revenger', 'clo.chest Irradiated Robe'] },
      { name: 'Electrocutioner 6000', def: blob('#9a9aa8', '#7ad8ff', 1.2, 'mechanical'), mech: ['bolt:Shock', 'smash:Megavolt'], loot: ['sword Electrocutioner Leg', 'finger Electrocutioner Lagnut', 'mai.wrist Electromagnetic Bracers'] },
      { name: 'Crowd Pummeler 9-60', def: blob('#8a7a6a', '#ffb030', 1.25, 'mechanical'), mech: ['smash:Arcing Smash', 'enrage'], loot: ['2hmace Manual Crowd Pummeler', 'mai.hands Pummeler\'s Gauntlets'] },
      { name: 'Mekgineer Thermaplugg', def: blob('#6a6a7a', '#ff4a2a', 1.3, 'mechanical'), mech: ['adds:Walking Bomb:2', 'smash:Knock Away', 'enrage'], loot: ['held Thermaplugg\'s Central Core', 'clo.head Electromagnetic Gigaflux Reactivator', '2haxe Thermaplugg\'s Left Arm'] },
    ],
  },
  {
    id: 'smgy', name: 'Scarlet Monastery: Graveyard', short: 'SM Graveyard', where: 'Tirisfal Glades', faction: 'both', min: 28, max: 38, lv: [28, 33],
    palette: DPAL.abbey, deco: ['grave', 'deadtree', 'grave'], weather: null, music: ['CursedLand01', 'gloomy02'],
    trash: [bip('#8a8a9a', '#4a4a5a', '#c8d0d8', 1, 'axe', UNDEAD), bip('#a82a2a', '#3a1010', '#e0b48c', 1, 'sword', { name: 'Scarlet Torturer' }), bip('#7a7a8a', '#3a3a44', '#b0b8c0', 0.95, 'claws', UNDEAD)],
    trashNames: ['Haunting Phantasm', 'Scarlet Torturer', 'Unfettered Spirit'],
    bosses: [
      { name: 'Interrogator Vishas', def: bip('#a82a2a', '#3a1010', '#e0b48c', 1.1, 'sword'), mech: ['bolt:Shadow Word: Pain', 'smash:Thrash'], loot: ['lea.chest Vishas\' Tunic', 'clo.legs Scarlet Leggings'] },
      { name: 'Ironspine', def: bip('#8a8a6a', '#3a3a2a', '#c8c8a8', 1.25, 'axe', UNDEAD), mech: ['smash:Poison Cloud', 'enrage'], loot: ['finger Ironspine\'s Eye', 'mai.feet Ironspine\'s Fist'] },
      { name: 'Bloodmage Thalnos', def: bip('#6a2a3a', '#2a1018', '#9aa8b0', 1.1, 'staff', UNDEAD), mech: ['bolt:Flame Shock', 'bolt:Shadow Bolt'], loot: ['clo.shoulder Bloodmage Mantle', 'held Orb of Thalnos'] },
    ],
  },
  {
    id: 'smlib', name: 'Scarlet Monastery: Library', short: 'SM Library', where: 'Tirisfal Glades', faction: 'both', min: 30, max: 40, lv: [30, 35],
    palette: DPAL.abbey, deco: ['bookshelf', 'pillar', 'banner'], weather: null, music: ['sacred01', 'mystery03-zone'],
    trash: [bip('#a82a2a', '#3a1010', '#e0b48c', 1, 'staff', { hood: true }), bip('#c8c0b0', '#a82a2a', '#e0b48c', 1, 'sword'), beast('#6a5a4a', '#3a2e24', 0.95)],
    trashNames: ['Scarlet Adept', 'Scarlet Gallant', 'Scarlet Tracking Hound'],
    bosses: [
      { name: 'Houndmaster Loksey', def: bip('#a82a2a', '#3a1010', '#e0b48c', 1.1, 'axe'), mech: ['adds:Scarlet Tracking Hound:3', 'enrage'], loot: ['lea.hands Dog Training Gloves', 'trinket Dog Whistle', 'axe Loksey\'s Training Stick'] },
      { name: 'Arcanist Doan', def: bip('#a82a2a', '#5a1010', '#e0b48c', 1.1, 'staff', { hood: true }), mech: ['bolt:Arcane Explosion', 'fear:Polymorph'], loot: ['clo.chest Robe of Doan', 'clo.shoulder Mantle of Doan', 'staff Illusionary Rod', 'dagger Hypnotic Blade'] },
    ],
  },
  {
    id: 'smarm', name: 'Scarlet Monastery: Armory', short: 'SM Armory', where: 'Tirisfal Glades', faction: 'both', min: 32, max: 42, lv: [32, 37],
    palette: DPAL.abbey, deco: ['weaponrack', 'pillar', 'banner'], weather: null, music: ['battle01', 'CursedLand01'],
    trash: [bip('#c8c0b0', '#a82a2a', '#e0b48c', 1, 'axe'), bip('#a82a2a', '#3a1010', '#e0b48c', 1, 'sword'), bip('#a82a2a', '#3a1010', '#e0b48c', 0.95, 'dagger', { hood: true })],
    trashNames: ['Scarlet Defender', 'Scarlet Myrmidon', 'Scarlet Sentry'],
    bosses: [
      { name: 'Herod', def: bip('#c8c0b0', '#a82a2a', '#e0b48c', 1.25, 'axe'), mech: ['smash:Whirlwind', 'adds:Scarlet Trainee:3', 'enrage'], loot: ['2haxe Ravager', 'mai.shoulder Herod\'s Shoulder', 'mai.head Raging Berserker\'s Helm', 'mai.legs Scarlet Leggings'] },
    ],
  },
  {
    id: 'smcath', name: 'Scarlet Monastery: Cathedral', short: 'SM Cathedral', where: 'Tirisfal Glades', faction: 'both', min: 35, max: 45, lv: [35, 40],
    palette: DPAL.abbey, deco: ['pillar', 'banner', 'brazier'], weather: null, music: ['sacred01', 'angelic01'],
    trash: [bip('#c8c0b0', '#a82a2a', '#e0b48c', 1, 'mace'), bip('#e8e0d0', '#a82a2a', '#e0b48c', 1, 'staff', { hood: true }), bip('#a82a2a', '#3a1010', '#e0b48c', 1, 'sword')],
    trashNames: ['Scarlet Champion', 'Scarlet Abbot', 'Scarlet Centurion'],
    bosses: [
      { name: 'High Inquisitor Fairbanks', def: bip('#a8a8b0', '#4a4a54', '#9aa8b0', 1.1, 'staff', UNDEAD), mech: ['heal:Heal', 'fear:Psychic Scream'], loot: ['clo.feet Inquisitor\'s Treads', 'finger Inquisitor\'s Band'] },
      { name: 'Scarlet Commander Mograine', def: bip('#c8c0b0', '#a82a2a', '#e0b48c', 1.2, 'mace'), mech: ['smash:Crusader Strike', 'heal:Lay on Hands'], loot: ['2hmace Mograine\'s Might', 'mai.hands Gauntlets of Divinity', 'pla.chest Scarlet Chestpiece'] },
      { name: 'High Inquisitor Whitemane', def: bip('#e8e0d0', '#a82a2a', '#e8d0b0', 1.1, 'mace', { hood: true }), mech: ['heal:Heal', 'bolt:Holy Smite', 'fear:Deep Sleep'], loot: ['clo.head Whitemane\'s Chapeau', 'neck Triune Amulet', 'mace Hand of Righteousness'] },
    ],
  },
  {
    id: 'rfd', name: 'Razorfen Downs', where: 'The Barrens', faction: 'both', min: 35, max: 43, lv: [35, 40],
    palette: DPAL.thorns, deco: ['thorns', 'bones', 'thorns'], weather: 'dust', music: ['CursedLand04', 'spooky01-moment'],
    trash: [bip('#8a8a9a', '#4a4a5a', '#c8d0d8', 1, 'axe', UNDEAD), bip('#6a4a2a', '#2e2010', '#c8a07a', 1, 'staff', { tusks: true }), spider('#5a5a6a', '#2a2a34', 0.95)],
    trashNames: ['Skeletal Shadowcaster', 'Razorfen Thornweaver', 'Tomb Fiend'],
    bosses: [
      { name: 'Tuten\'kash', def: spider('#4a4a5a', '#24242e', 1.3), mech: ['smash:Web Spray', 'adds:Tomb Fiend:2'], loot: ['mai.chest Carapace of Tuten\'kash', 'clo.chest Silky Spider Robe'] },
      { name: 'Mordresh Fire Eye', def: bip('#5a5a6a', '#24242e', '#c8d0d8', 1.1, 'staff', UNDEAD), mech: ['bolt:Fireball', 'smash:Fire Nova'], loot: ['held Mordresh\'s Lifeless Skull', 'neck Glowing Eye of Mordresh'] },
      { name: 'Glutton', def: bip('#7a8a6a', '#3a4430', '#a8b090', 1.3, 'claws', UNDEAD), mech: ['enrage', 'smash:Disease Cloud'], loot: ['lea.chest Butcher\'s Apron', 'axe Glutton\'s Cleaver'] },
      { name: 'Amnennar the Coldbringer', def: bip('#4a6a8a', '#1e2e44', '#a8c8e0', 1.25, 'staff', UNDEAD), mech: ['bolt:Frostbolt', 'adds:Frozen Spectre:2', 'smash:Frost Nova'], loot: ['dagger Coldrage Dagger', 'pla.head Icemetal Barbute', 'mai.chest Deathchill Armor', 'neck Amberglow Talisman'] },
    ],
  },
  {
    id: 'uldaman', name: 'Uldaman', where: 'Badlands', faction: 'both', min: 41, max: 51, lv: [40, 47],
    palette: DPAL.titan, deco: ['pillar', 'statue', 'rock'], weather: 'dust', music: ['mystery03-zone', 'angelic01'],
    trash: [bip('#6a6a7a', '#3a3a46', '#8a8a96', 0.85, 'claws'), bip('#4a3a3a', '#1e1414', '#6a5a5a', 0.9, 'axe'), bip('#8a8a8a', '#4a4a4a', '#9a9a9a', 1.15, 'mace', { ctype: 'giant' })],
    trashNames: ['Stonevault Ambusher', 'Shadowforge Ruffian', 'Earthen Custodian'],
    bosses: [
      { name: 'Revelosh', def: bip('#6a6a7a', '#2e2e3a', '#8a8a96', 1.1, 'staff'), mech: ['bolt:Chain Lightning'], loot: ['mai.wrist Revelosh\'s Armguards', 'clo.hands Revelosh\'s Gloves'] },
      { name: 'Ironaya', def: bip('#7a6a5a', '#3a3026', '#9a8a7a', 1.35, 'claws', { ctype: 'giant' }), mech: ['smash:Arcing Smash', 'enrage'], loot: ['2hsword Stoneslayer', '2hmace Ironshod Bludgeon', 'clo.wrist Ironaya\'s Bracers'] },
      { name: 'Galgann Firehammer', def: bip('#4a3a3a', '#1e1414', '#6a5a5a', 1.1, 'mace'), mech: ['bolt:Fire Nova', 'smash:Flame Lash'], loot: ['gun Galgann\'s Fireblaster', 'mace Galgann\'s Firehammer'] },
      { name: 'Grimlok', def: bip('#6a6a7a', '#3a3a46', '#8a8a96', 1.2, 'axe'), mech: ['bolt:Chain Bolt', 'adds:Stonevault Ambusher:2'], loot: ['2haxe Grimlok\'s Charge', 'clo.chest Grimlok\'s Tribal Vestments'] },
      { name: 'Archaedas', def: bip('#8a8a9a', '#4a4a56', '#a8a8b8', 1.4, 'mace', { ctype: 'giant', eye: '#7ad8ff' }), mech: ['adds:Earthen Guardian:2', 'smash:Ground Tremor', 'enrage'], loot: ['2hmace The Rockpounder', 'finger Archaedic Stone', 'pla.shoulder Shoulders of the Titans', 'lea.legs Legplates of the Chosen'] },
    ],
  },
  {
    id: 'zf', name: 'Zul\'Farrak', where: 'Tanaris', faction: 'both', min: 44, max: 54, lv: [44, 48],
    palette: DPAL.sand, deco: ['pillar', 'palm', 'statue'], weather: 'dust', outdoor: true, music: ['DayBarrenDry01', 'battle01'],
    trash: [bip('#3a6a7a', '#1a3a44', '#5a8a9a', 1, 'staff', { tusks: true }), bip('#6a3a2a', '#2e1a12', '#5a8a9a', 1, 'axe', { tusks: true }), bip('#5a6a4a', '#2a3424', '#7a8a6a', 1, 'claws', UNDEAD)],
    trashNames: ['Sandfury Shadowcaster', 'Sandfury Blood Drinker', 'Zul\'Farrak Zombie'],
    bosses: [
      { name: 'Antu\'sul', def: bip('#3a5a6a', '#1a2e36', '#5a8a9a', 1.15, 'staff', { tusks: true }), mech: ['heal:Healing Wave', 'adds:Sul\'lithuz Broodling:2'], loot: ['axe Ripsaw', 'staff Spiritchaser Staff'] },
      { name: 'Witch Doctor Zum\'rah', def: bip('#4a3a5a', '#201828', '#5a8a9a', 1.1, 'staff', { tusks: true }), mech: ['bolt:Shadow Bolt Volley', 'adds:Zul\'Farrak Zombie:2'], loot: ['clo.hands Jumanza Grips', 'staff Zum\'rah\'s Vexing Cane'] },
      { name: 'Gahz\'rilla', def: beast('#3a7a8a', '#1a3a44', 1.4, { eye: '#7ad8ff', tusks: true }), mech: ['smash:Gahz\'rilla Slam', 'bolt:Freeze Solid'], loot: ['dagger Gahz\'rilla Fang', 'mai.chest Gahz\'rilla Scale Armor'] },
      { name: 'Chief Ukorz Sandscalp', def: bip('#6a2a2a', '#2e1010', '#5a8a9a', 1.25, 'axe', { tusks: true }), mech: ['smash:Cleave', 'adds:Ruuzlu:1', 'enrage'], loot: ['pla.shoulder Big Bad Pauldrons', 'sword Jang\'thraze the Protector', 'neck Embalmed Shroud'] },
    ],
  },
  {
    id: 'mara', name: 'Maraudon', where: 'Desolace', faction: 'both', min: 46, max: 55, lv: [45, 51],
    palette: DPAL.grove, deco: ['crystal', 'fern', 'stalagmite'], weather: 'fireflies', music: ['magic01-zone1', 'EnchantedForest01'],
    trash: [bip('#4a7a3a', '#24401e', '#9ac87a', 1, 'staff', { horns: true }), blob('#6a5a4a', '#c8a87a', 1.1, 'elemental'), bip('#5a2a4a', '#2a1024', '#a87a9a', 1, 'claws', DEMON)],
    trashNames: ['Celebrian Dryad', 'Primordial Behemoth', 'Putridus Satyr'],
    bosses: [
      { name: 'Noxxion', def: blob('#5a8a2a', '#c8ff5a', 1.2, 'elemental'), mech: ['adds:Noxxion\'s Spawn:3', 'bolt:Toxic Volley'], loot: ['pla.wrist Noxxion\'s Shackles', 'mace Noxious Shooter'] },
      { name: 'Lord Vyletongue', def: bip('#5a2a4a', '#2a1024', '#a87a9a', 1.15, 'dagger', DEMON), mech: ['smash:Multi-Shot', 'adds:Vyletongue Satyr:2'], loot: ['clo.waist Satyrmane Sash', 'mai.legs Infernal Trickster Leggings'] },
      { name: 'Landslide', def: blob('#7a6a5a', '#c8a87a', 1.35, 'elemental'), mech: ['smash:Trample', 'adds:Lesser Rock Elemental:2'], loot: ['mai.hands Rockgrip Gauntlets', 'mace Cragfists'] },
      { name: 'Rotgrip', def: beast('#8a8a7a', '#4a4a3a', 1.35, { tusks: true }), mech: ['smash:Fatal Bite', 'enrage'], loot: ['lea.feet Albino Crocscale Boots', '2haxe Gatorbite Axe'] },
      { name: 'Princess Theradras', def: bip('#6a4a2a', '#2e2010', '#8a7a5a', 1.4, 'claws', { ctype: 'elemental', horns: true }), mech: ['smash:Boulder', 'adds:Theradrim Shardling:2', 'enrage'], loot: ['finger Blackstone Ring', 'dagger Charstone Dirk', 'mai.legs Elemental Rockridge Leggings', 'trinket Gemshard Heart'] },
    ],
  },
  {
    id: 'brd', name: 'Blackrock Depths', where: 'Burning Steppes', faction: 'both', min: 52, max: 60, lv: [50, 58],
    palette: DPAL.lava, deco: ['pillar', 'brazier', 'anvil'], weather: 'embers', music: ['DayVolcanic01-new', 'battle04', 'battle03'],
    trash: [bip('#4a3a3a', '#1e1414', '#6a5a5a', 0.9, 'mace', { name: 'Anvilrage Guardsman' }), bip('#5a2a1a', '#2a100a', '#6a5a5a', 0.9, 'staff', { hood: true }), blob('#5a4a4a', '#ff6a1a', 1.1, 'elemental')],
    trashNames: ['Anvilrage Guardsman', 'Shadowforge Flame Keeper', 'Molten War Golem'],
    bosses: [
      { name: 'High Interrogator Gerstahn', def: bip('#3a2a3a', '#1a101a', '#6a5a5a', 1.05, 'staff', { hood: true }), mech: ['bolt:Shadow Word: Pain', 'fear:Psychic Scream'], loot: ['held Enthralled Sphere', 'clo.shoulder Lead Surveyor\'s Mantle'] },
      { name: 'Bael\'Gar', def: blob('#8a3a1a', '#ffb050', 1.35, 'elemental'), mech: ['adds:Fireguard:2', 'smash:Magma Splash'], loot: ['2hmace Lavastone Hammer', 'lea.hands Molten Fists'] },
      { name: 'Lord Incendius', def: blob('#c84a1a', '#ffd27a', 1.3, 'elemental'), mech: ['bolt:Fire Storm', 'smash:Mighty Blow'], loot: ['pla.wrist Emberplate Armguards', 'clo.shoulder Sunderseer Mantle'] },
      { name: 'General Angerforge', def: bip('#5a3a2a', '#2a1a10', '#6a5a5a', 1.2, 'axe'), mech: ['adds:Anvilrage Reservist:3', 'smash:Mortal Strike', 'enrage'], loot: ['2haxe Angerforge\'s Battle Axe', 'lea.legs Warstrife Leggings'] },
      { name: 'Magmus', def: bip('#5a4a4a', '#2a2020', '#ff6a1a', 1.4, 'mace', { ctype: 'elemental' }), mech: ['smash:War Stomp', 'bolt:Fiery Burst'], loot: ['pla.hands Lavaplate Gauntlets', 'mai.chest Royal Decorated Armor'] },
      { name: 'Emperor Dagran Thaurissan', def: bip('#6a2a1a', '#2a0e08', '#6a5a5a', 1.25, 'mace', { eye: '#ffb030' }), mech: ['smash:Hand of Thaurissan', 'adds:Princess Moira Bronzebeard:1', 'enrage'], loot: ['mace Ironfoe', 'trinket Hand of Justice', 'clo.chest Robes of the Royal Crown', 'held Thaurissan\'s Royal Scepter', 'neck Imperial Jewel'] },
    ],
  },
  {
    id: 'lbrs', name: 'Lower Blackrock Spire', where: 'Burning Steppes', faction: 'both', min: 55, max: 60, lv: [55, 58],
    palette: DPAL.lava, deco: ['banner', 'brazier', 'bones'], weather: 'embers', music: ['battle03', 'DayVolcanic01-new'],
    trash: [bip('#4a6a7a', '#24343c', '#5a8a9a', 1, 'axe', { tusks: true }), bip('#6a3a2a', '#2a1410', '#6a8a4a', 1, 'axe', { tusks: true }), bip('#7a8a5a', '#3a4426', '#9aa86a', 1.25, 'mace', { tusks: true })],
    trashNames: ['Smolderthorn Axe Thrower', 'Firebrand Grunt', 'Spirestone Ogre'],
    bosses: [
      { name: 'Highlord Omokk', def: bip('#7a8a5a', '#3a4426', '#9aa86a', 1.35, 'mace', { tusks: true }), mech: ['smash:Knock Away', 'enrage'], loot: ['pla.waist Omokk\'s Girth Restrainer', 'lea.shoulder Slamshot Shoulders'] },
      { name: 'Shadow Hunter Vosh\'gajin', def: bip('#3a5a6a', '#1a2e36', '#5a8a9a', 1.15, 'staff', { tusks: true }), mech: ['bolt:Hex', 'adds:Smolderthorn Witch Doctor:1'], loot: ['neck Vosh\'gajin\'s Strand', 'clo.shoulder Voodoo Mantle'] },
      { name: 'War Master Voone', def: bip('#4a6a7a', '#24343c', '#5a8a9a', 1.2, 'axe', { tusks: true }), mech: ['smash:Mortal Strike', 'bolt:Throw Axe'], loot: ['bow Voone\'s Twitchbow', 'pla.hands Voone\'s Vice Grips'] },
      { name: 'Mother Smolderweb', def: spider('#5a2a1a', '#ff6a1a', 1.4), mech: ['smash:Crystalize', 'adds:Spire Spiderling:3'], loot: ['mace Venomspitter', 'lea.feet Smolderweb\'s Treads'] },
      { name: 'Overlord Wyrmthalak', def: bip('#7a8a5a', '#3a4426', '#9aa86a', 1.4, 'axe', { tusks: true }), mech: ['adds:Spirestone Warlord:2', 'smash:Cleave', 'enrage'], loot: ['mai.wrist Wyrmthalak\'s Shackles', 'neck Mark of Tyranny', '2haxe Spirestone Battle Axe'] },
    ],
  },
  {
    id: 'scholo', name: 'Scholomance', where: 'Western Plaguelands', faction: 'both', min: 58, max: 60, lv: [57, 59],
    palette: DPAL.keep, deco: ['bookshelf', 'bones', 'pillar'], weather: null, music: ['spooky01-moment', 'gloomy02', 'CursedLand02'],
    trash: [bip('#3a2a4a', '#1a1024', '#9aa8b0', 1, 'staff', { hood: true }), bip('#8a8a9a', '#4a4a5a', '#c8d0d8', 1.05, 'axe', UNDEAD), bip('#6a7a6a', '#343e34', '#8a9a8a', 1, 'claws', UNDEAD)],
    trashNames: ['Scholomance Necrolyte', 'Risen Guard', 'Reanimated Corpse'],
    bosses: [
      { name: 'Rattlegore', def: bip('#c8c0a8', '#6a6450', '#e0d8c0', 1.4, 'mace', UNDEAD), mech: ['smash:Strike', 'enrage'], loot: ['mai.shoulder Bone Golem Shoulders', 'clo.shoulder Deadwalker Mantle'] },
      { name: 'Ras Frostwhisper', def: bip('#4a6a8a', '#1e2e44', '#a8c8e0', 1.25, 'staff', UNDEAD), mech: ['bolt:Frostbolt Volley', 'smash:Freeze'], loot: ['mace Bonechill Hammer', 'clo.waist Frostbite Girdle'] },
      { name: 'Jandice Barov', def: bip('#4a3a5a', '#201828', '#c8c0b0', 1.1, 'staff', UNDEAD), mech: ['adds:Illusion of Jandice Barov:3', 'bolt:Curse of Blood'], loot: ['staff Staff of Metanoia', 'clo.legs Jandice\'s Leggings'] },
      { name: 'Darkmaster Gandling', def: bip('#2a1a3a', '#120a1e', '#a8a0b0', 1.25, 'staff', UNDEAD), mech: ['bolt:Shadow Bolt Volley', 'adds:Risen Guardian:2', 'fear:Curse of the Darkmaster'], loot: ['staff Headmaster\'s Charge', 'clo.head Dreadmist Mask', 'lea.waist Detention Strap', 'clo.chest Tombstone Breastplate'] },
    ],
  },
  {
    id: 'strat', name: 'Stratholme', where: 'Eastern Plaguelands', faction: 'both', min: 58, max: 60, lv: [57, 59],
    palette: DPAL.plague, deco: ['grave', 'pillar', 'bones'], weather: 'dust', outdoor: true, music: ['CursedLand04', 'battle05'],
    trash: [bip('#8a8a9a', '#4a4a5a', '#c8d0d8', 1.05, 'axe', UNDEAD), bip('#6a7a5a', '#343e2a', '#8a9a7a', 1, 'claws', UNDEAD), bip('#a82a2a', '#3a1010', '#e0b48c', 1, 'sword')],
    trashNames: ['Skeletal Guardian', 'Plague Ghoul', 'Crimson Defender'],
    bosses: [
      { name: 'Timmy the Cruel', def: bip('#6a7a5a', '#343e2a', '#8a9a7a', 1.35, 'claws', UNDEAD), mech: ['smash:Ravenous Claw', 'enrage'], loot: ['mai.feet Timmy\'s Galoshes', 'sword Bonecrusher'] },
      { name: 'Archivist Galford', def: bip('#a82a2a', '#3a1010', '#e0b48c', 1.1, 'staff', { hood: true }), mech: ['bolt:Fire Nova', 'heal:Flash Heal'], loot: ['clo.shoulder Archivist Mantle', 'neck Galford\'s Chain'] },
      { name: 'Balnazzar', def: bip('#3a1a3a', '#1a081a', '#7a3a6a', 1.35, 'claws', DEMON), mech: ['bolt:Shadow Shock', 'fear:Psychic Scream', 'enrage'], loot: ['clo.waist Grimgore Noose', 'trinket Royal Seal of Eldre\'Thalas'] },
      { name: 'Ramstein the Gorger', def: bip('#7a8a6a', '#3a4430', '#a8b090', 1.45, 'claws', UNDEAD), mech: ['smash:Trample', 'enrage'], loot: ['trinket Ramstein\'s Lightning Bolts', 'pla.shoulder Gorger\'s Pauldrons'] },
      { name: 'Baron Rivendare', def: bip('#2a2a3a', '#0e0e18', '#9aa8b0', 1.3, 'sword', UNDEAD), mech: ['adds:Skeletal Guardian:2', 'bolt:Death Pact', 'smash:Mortal Strike'], loot: ['2hsword Runeblade of Baron Rivendare', 'pla.waist Deathbone Girdle', 'lea.head Mask of the Unforgiven', 'finger Band of the Unforgiven'] },
    ],
  },
];

// Fill in names on trash defs and register each dungeon's music
for (const d of DUNGEONS) {
  d.trash.forEach((t, i) => { t.name = t.name || d.trashNames[i]; });
  if (typeof MUSIC !== 'undefined') MUSIC['dng_' + d.id] = d.music;
}
const dungeonById = id => DUNGEONS.find(d => d.id === id) || (typeof RAIDS !== 'undefined' && RAIDS.find(d => d.id === id)) || null;
const dungeonsForChar = () => DUNGEONS.filter(d => d.faction === 'both' || d.faction === S.faction);

// ---------- loot ----------
const ARMOR_CODES = { clo: 'cloth', lea: 'leather', mai: 'mail', pla: 'plate' };
const ARMOR_ORDER = ['cloth', 'leather', 'mail', 'plate'];
function parseLoot(s) {
  const sp = s.indexOf(' '), t = s.slice(0, sp), name = s.slice(sp + 1);
  if (WEAPON_TYPES[t]) return { name, slot: 'weapon', wtype: t };
  if (OFFHAND_TYPES[t]) return { name, slot: 'offhand', otype: t };
  if (JEWELRY[t]) return { name, slot: t };
  const [a, slot] = t.split('.');
  return { name, slot, atype: ARMOR_CODES[a] };
}
// Can this class use it? exact = matches the class's own armor type (preferred)
function lootFits(l, exact) {
  if (l.wtype) return cls().weapons.includes(l.wtype);
  if (l.otype) return cls().offhands.includes(l.otype);
  if (!l.atype) return true;
  const mine = armorTypeFor(S.level);
  return exact ? l.atype === mine : ARMOR_ORDER.indexOf(l.atype) <= ARMOR_ORDER.indexOf(mine);
}
function bossLoot(boss, lv, final, quality) {
  const all = boss.loot.map(parseLoot);
  const pool = all.filter(l => lootFits(l, true)).length ? all.filter(l => lootFits(l, true)) : all.filter(l => lootFits(l, false));
  const ilvl = lv + 3, q = quality || (final && Math.random() < 0.06 ? 4 : 3);
  if (!pool.length) return makeItem(ilvl, q);   // nothing this class can use: a random blue instead
  const l = pick(pool);
  return makeItem(ilvl, q, l.slot, l);
}
function giveItem(it, x) {
  fct(x, G.groundY - 165, it.name, QUALITIES[it.q].color, 15, 0.45);
  if (S.bag.length >= CONFIG.BAG_SIZE) { S.copper += it.sell; log(`Bags full — sold ${itemLink(it)} for ${moneyText(it.sell)}`, 'loot'); return; }
  S.bag.push(it);
  log(`You receive loot: ${itemLink(it)}${isUpgrade(it) ? ' <span class="up">▲ upgrade</span>' : ''}`, 'loot');
}

// ---------- saved state (S.dungeons = { id: { clears, cd, saved: { i, until }, best } }) ----------
function dState(id) { S.dungeons = S.dungeons || {}; return S.dungeons[id] || (S.dungeons[id] = { clears: 0, cd: 0, saved: null, best: 0 }); }
function dungeonStatus(d) {
  if (S.level < d.min) return 'locked';
  if (d.raid) return rState(d).killed.length >= d.bosses.length ? 'cooldown' : 'ready';
  const ds = dState(d.id);
  if (ds.cd > Date.now()) return 'cooldown';
  return 'ready';
}
// New runs started in the last hour (S.dungeonRuns = timestamps)
function recentRuns() { S.dungeonRuns = (S.dungeonRuns || []).filter(t => t > Date.now() - 3600e3); return S.dungeonRuns; }
const hourlyCapReached = () => recentRuns().length >= DUNGEON_HOURLY_CAP;
function savedProgress(d) {
  if (d.raid) {
    // Bosses killed this lockout: continue after the last one
    const k = rState(d).killed.length, q = dungeonQueue(d);
    let seen = 0;
    for (let i = 0; i < q.length; i++) if (q[i].kind !== 'trash' && ++seen === k) return i + 1;
    return 0;
  }
  const s = dState(d.id).saved;
  return s && s.until > Date.now() ? s.i : 0;
}

// The run: trash pulls, then the boss, for every boss in order
function dungeonQueue(d) {
  const q = [], n = d.bosses.length;
  const trash = d.raid ? 1 : DUNGEON_TRASH_PER_BOSS;
  d.bosses.forEach((b, bi) => {
    for (let k = 0; k < trash + (bi === 0 && !d.raid ? 1 : 0); k++) q.push({ kind: 'trash', bi });
    q.push({ kind: bi === n - 1 ? 'final' : 'boss', bi, boss: b });
  });
  return q;
}
// Level of a fight: climbs through the dungeon's range; bosses a level above their trash
function encounterLevel(d, enc) {
  const p = enc.bi / (d.bosses.length - 1 || 1);
  const base = Math.round(d.lv[0] + (d.lv[1] - d.lv[0]) * p);
  return base + (enc.kind === 'trash' ? 0 : 1);
}

// party = { role, bots } from the draft; automatic runs draft their own
function startDungeon(id, auto, party) {
  const d = dungeonById(id);
  if (!d || G.run || G.dead) return false;
  const status = dungeonStatus(d);
  if (status === 'locked') { toast(`Requires level ${d.min}`); return false; }
  if (status === 'cooldown') { toast(`${d.name} can't be entered yet`); return false; }
  const queue = dungeonQueue(d), i = savedProgress(d);
  if (!i && !d.raid) {
    if (hourlyCapReached()) { if (!auto) toast('You have entered too many instances recently.'); return false; }
    S.dungeonRuns.push(Date.now());
  }
  G.run = { id, queue, i, killed: d.bosses.slice(0, queue.slice(0, i).filter(e => e.kind !== 'trash').length).map(b => b.name), adds: [], resume: null, rest: 0, t: 0, xp: 0, loot: [], auto: !!auto };
  G.enemy = null; G.spawnTimer = 2; G.cast = null; G.proj = []; G.weather = [];
  setupParty(party || autoParty(d));
  showZoneBanner();
  const group = G.party.filter(m => !m.player).map(m => `${ROLES[m.role].icon} ${esc(m.name)}`).join(', ');
  log(`You enter <b>${esc(d.name)}</b> as ${ROLES[G.partyRole].name.toLowerCase()} with ${group}${i ? ` (${G.run.killed.length} of ${d.bosses.length} bosses already defeated)` : ''}.`, 'sys');
  markDirty();
  return true;
}

function endDungeon(reason) {
  const r = G.run;
  if (!r) return;
  const d = dungeonById(r.id);
  if (reason !== 'clear' && d.raid) {
    log(reason === 'wipe' ? `Your raid has wiped in <b>${esc(d.name)}</b>. Defeated bosses stay dead until the raid resets.` : `You leave <b>${esc(d.name)}</b>.`, reason === 'wipe' ? 'death' : 'sys');
  } else if (reason !== 'clear') {
    // Keep the bosses you killed: start again after the last one
    const lastBoss = r.queue.slice(0, r.i).map(e => e.kind).lastIndexOf('boss');
    const lastFinal = r.queue.slice(0, r.i).map(e => e.kind).lastIndexOf('final');
    const at = Math.max(lastBoss, lastFinal) + 1;
    dState(r.id).saved = at > 0 ? { i: at, until: Date.now() + DUNGEON_SAVE_HOURS * 3600e3 } : null;
    log(reason === 'wipe' ? `Your attempt at <b>${esc(d.name)}</b> has failed. Defeated bosses stay dead for ${DUNGEON_SAVE_HOURS} hours.` : `You leave <b>${esc(d.name)}</b>.`, reason === 'wipe' ? 'death' : 'sys');
  }
  G.run = null;
  endParty();
  if (!G.dead) { G.enemy = null; G.spawnTimer = 1.5; }
  G.cast = null; G.proj = []; G.weather = []; G.feared = 0;
  showZoneBanner();
  if (S.autoZone) autoPickZone(true);
  markDirty();
}

function dungeonComplete() {
  const r = G.run, d = dungeonById(r.id);
  if (d.raid) {
    const rs = rState(d); rs.clears = (rs.clears || 0) + 1;
    achOnClear(r);
    const gold = Math.round(copperForKill(60) * 60 * calc().goldMult);
    S.copper += gold; S.earned += gold;
    log(`<b class="ding">${esc(d.name)} has been cleared</b> in ${timeText(r.t)}! Your share of the raid's gold: ${moneyText(gold)}.`, 'level');
    toast(`${d.name} cleared!`);
    endDungeon('clear');
    return;
  }
  const ds = dState(r.id);
  ds.clears++; ds.cd = Date.now() + DUNGEON_LOCKOUT_MIN * 60e3; ds.saved = null;
  achOnClear(r);
  if (!ds.best || r.t < ds.best) ds.best = Math.round(r.t);
  // End-of-run chest: gold, a share of a level and one more blue
  const lv = d.lv[1], st = calc();
  const gold = Math.round(copperForKill(lv) * 25 * st.goldMult);
  S.copper += gold; S.earned += gold;
  const xp = S.level >= CONFIG.LEVEL_CAP ? 0 : Math.round(xpToLevel(Math.min(S.level, CONFIG.LEVEL_CAP - 1)) * 0.06 * st.xpMult);
  log(`<b class="ding">${esc(d.name)} cleared</b> in ${timeText(r.t)}! The chest holds ${moneyText(gold)}.`, 'level');
  toast(`${d.name} cleared!`);
  giveItem(makeItem(lv + 2, 3), G.heroX + 80);
  if (S.level >= CONFIG.LEVEL_CAP) { ACC.currency.badges = (ACC.currency.badges || 0) + 2; log('You receive 2 Badges of Justice.', 'loot'); }
  endDungeon('clear');
  if (xp) { fct(G.heroX, G.groundY - 200, `+${fmt(xp)} XP`, '#c58cff', 20); addXp(xp); }
}

// ---------- fights ----------
function makeDungeonEnemy(def, lv, kind, boss) {
  const raid = G.run && (dungeonById(G.run.id) || {}).raid;
  const T = DUNGEON_TUNING[(raid ? 'r' : '') + kind];
  const hpMax = Math.round(enemyHp(lv) * T.hp);
  const e = {
    def, lv, elite: kind === 'boss' || kind === 'final', hp: hpMax, hpMax,
    x: G.W + 90, state: 'approach', atk: 1.3, anim: 0, hit: 0, lunge: 0, dying: 0, seed: Math.random() * 10,
    dots: [], stun: 0, opened: false,
    dng: kind, dmgMult: T.dmg, xpMult: T.xp, goldMult: T.gold, lootMult: T.loot || 0, atkSpeed: 2,
  };
  if (boss) {
    e.boss = boss;
    // 'type:Name' or 'adds:Name:count' (names may contain colons, e.g. Shadow Word: Pain)
    e.mechs = boss.mech.map(m => {
      const [, type, name, n] = m.match(/^(\w+)(?::(.*?))?(?::(\d+))?$/);
      return { type, name: name || '', n: +n || 1, t: (BOSS_MECHS[type].every || 0) * rand(0.4, 0.7) };
    });
  }
  e.speed = Math.max(CONFIG.APPROACH_SPEED, (e.x - fightX()) / 1.1);
  return e;
}

function spawnDungeonEnemy() {
  const r = G.run, d = dungeonById(r.id), st = calc();
  if (r.i >= r.queue.length && !r.adds.length && !r.resume) { dungeonComplete(); return; }
  // Between pulls: resurrect the fallen, then rest (eat and drink) until the group is ready
  const next = r.queue[r.i], bossNext = next && next.kind !== 'trash' && !r.adds.length && !r.resume;
  if (!r.adds.length && !r.resume) partyRez();
  const hpMin = bossNext ? DUNGEON_REST.bossHp : DUNGEON_REST.hp, manaMin = bossNext ? DUNGEON_REST.bossMana : DUNGEON_REST.mana;
  const low = S.hp < st.maxHp * hpMin || (st.maxMana && S.mana < st.maxMana * manaMin) || !partyRested(bossNext);
  if (low && r.rest < DUNGEON_REST.max && !r.adds.length && !r.resume) {
    if (r.rest === 0) fct(G.heroX, G.groundY - 170, 'Resting…', '#9fd3ff', 15);
    r.rest += 0.5; G.spawnTimer = 0.5;
    return;
  }
  r.rest = 0;
  if (r.adds.length) { G.enemy = r.adds.shift(); }
  else if (r.resume) {
    const e = r.resume; r.resume = null;
    Object.assign(e, { x: G.W + 90, state: 'approach', lunge: 0, cast: null });
    e.speed = Math.max(CONFIG.APPROACH_SPEED, (e.x - fightX()) / 1.1);
    G.enemy = e;
  } else {
    const enc = r.queue[r.i];
    const lv = encounterLevel(d, enc);
    G.enemy = enc.kind === 'trash' ? makeDungeonEnemy(pick(d.trash), lv, 'trash') : makeDungeonEnemy(enc.boss.def, lv, enc.kind, enc.boss);
    if (enc.kind !== 'trash') G.enemy.def = Object.assign({}, enc.boss.def, { name: enc.boss.name });
  }
  if (!keepsCombo()) S.combo = 0;
  G.procs = {};
}

// Damage from a boss ability (spell = ignores armor and can't be dodged)
// Spells (bolts) hit a random member other than the tank, ignoring armor; smashes hit whoever the boss is fighting
function bossHit(e, mult, spell, label) {
  const alive = G.party.filter(memberAlive);
  const pool = spell ? alive.filter(m => m.role !== 'tank') : [];
  const m = spell ? (pool.length ? pick(pool) : pick(alive)) : enemyTarget(e);
  if (!m) return;
  const lvRef = m.player ? S.level : m.level;
  let d = enemyDamage(e.lv) * e.dmgMult * mult * rand(0.9, 1.1);
  if (e.lv > lvRef) d *= 1 + 0.12 * (e.lv - lvRef);
  partyHit(m, d, e, spell, label);
}

function bossTick(e, dt, st) {
  const frac = e.hp / e.hpMax;
  e.fightT = (e.fightT || 0) + dt;
  for (const m of e.mechs) {
    const M = BOSS_MECHS[m.type];
    if (m.type === 'berserk') {
      if (!m.done && e.fightT > m.n) {
        m.done = true; e.dmgMult *= RAID_BERSERK_MULT; e.atkSpeed *= 0.6;
        fct(e.x, enemyY(e) - 90, 'Berserk!', '#ff3a2a', 22);
        log(`<b class="elite">${esc(e.def.name)}</b> goes berserk!`, 'kill');
        uiMessage(`${e.def.name} goes berserk!`, '#ff5a3a');
      }
    } else if (m.type === 'enrage') {
      if (!m.done && frac < M.below) {
        m.done = true; e.dmgMult *= M.dmg; e.atkSpeed *= M.speed;
        fct(e.x, enemyY(e) - 90, 'Enraged!', '#ff5a3a', 20);
        log(`<b class="elite">${esc(e.def.name)}</b> becomes enraged!`, 'kill');
      }
    } else if (m.type === 'adds') {
      if (!m.done && frac < M.below) {
        m.done = true;
        const d = dungeonById(G.run.id), base = d.trash.find(t => t.name === m.name) || d.trash[0];
        for (let k = 0; k < m.n; k++) {
          const add = makeDungeonEnemy(Object.assign({}, base, { name: m.name }), Math.max(1, e.lv - 1), 'add');
          G.run.adds.push(add);
        }
        uiMessage(`${e.def.name} calls for help!`, '#ff7a5a');
        log(`<b class="elite">${esc(e.def.name)}</b> calls for help: ${m.n > 1 ? m.n + '× ' : ''}${esc(m.name)}.`, 'kill');
        // The boss steps back until the adds are dead
        G.run.resume = e; e.cast = null;
        G.enemy = null; G.spawnTimer = 0.4;
        return;
      }
    } else if (!e.cast) {
      m.t -= dt;
      if (m.t <= 0 && (m.type !== 'heal' || frac < 0.7)) {
        m.t = M.every * rand(0.9, 1.15);
        e.cast = { m, t: 0, total: M.cast, name: m.name, int: M.int };
      }
    }
  }
  const c = e.cast;
  if (!c) return;
  if (e.stun > 0) {
    if (c.int) { e.cast = null; fct(e.x, enemyY(e) - 80, 'Interrupted', '#7ad8ff', 16); }
    return;
  }
  c.t += dt;
  if (c.t < c.total) return;
  e.cast = null;
  const M = BOSS_MECHS[c.m.type];
  switch (c.m.type) {
    case 'bolt': bossHit(e, M.mult, true, c.name); break;
    case 'smash': e.lunge = 1; bossHit(e, M.mult, false, c.name); break;
    case 'heal': {
      const h = Math.round(e.hpMax * M.pct); e.hp = Math.min(e.hpMax, e.hp + h);
      fct(e.x, enemyY(e) - 60, `+${fmt(h)}`, '#5aff7a', 18); break;
    }
    case 'fear':
      G.feared = M.dur; G.cast = null;
      for (const b of G.party) if (!b.player) b.feared = M.dur;
      fct(G.heroX, G.groundY - 170, c.name, '#c58cff', 16); break;
  }
}

// Healing Potion: drunk automatically when low inside a dungeon (called every frame from update)
function dungeonPotion(st) {
  const r = G.run;
  if (!r || G.dead || S.hp >= st.maxHp * DUNGEON_POTION.below || (r.potionCd || 0) > r.t) return;
  r.potionCd = r.t + DUNGEON_POTION.cd;
  healHero(st.maxHp * DUNGEON_POTION.heal, false, true);
  fct(G.heroX, G.groundY - 175, 'Healing Potion', '#5aff7a', 15);
}

// Called from killEnemy for every enemy that dies inside a dungeon
function dungeonOnKill(e) {
  const r = G.run;
  if (!r || e.dng === 'add') return;
  r.i++;
  if (e.boss) {
    const final = e.dng === 'final';
    r.killed.push(e.boss.name);
    log(`<b class="elite">${esc(e.boss.name)}</b> has been defeated!`, 'level');
    const d = dungeonById(r.id);
    if (d.raid) {
      // Raid boss: named epics, a tier piece for your class, badges; saved until the reset
      const drops = d.size >= 40 ? 2 : 1;
      for (let k = 0; k < drops; k++) giveItem(bossLoot(e.boss, d.ilvl - 3, false, 4), e.x - k * 30);
      const tier = e.boss.tier || d.tier;
      if (e.boss.tierSlots && tier) giveItem(makeTierItem(tier, S.cls, pick(e.boss.tierSlots)), e.x + 30);
      ACC.currency.badges = (ACC.currency.badges || 0) + 2;
      const rs = rState(d); if (!rs.killed.includes(e.boss.name)) rs.killed.push(e.boss.name);
    } else {
      const drops = final ? 2 : 1;
      for (let k = 0; k < drops; k++) giveItem(bossLoot(e.boss, e.lv, final), e.x - k * 30);
      // Tier 0 from the level-60 dungeons
      if (['scholo', 'strat', 'lbrs'].includes(d.id) && Math.random() < 0.3) giveItem(makeTierItem(0, S.cls, pick(TIER_SLOTS)), e.x + 30);
      if (S.level >= CONFIG.LEVEL_CAP) { ACC.currency.badges = (ACC.currency.badges || 0) + 1; }
      // Progress is kept if the page is closed
      if (!final) dState(r.id).saved = { i: r.i, until: Date.now() + DUNGEON_SAVE_HOURS * 3600e3 };
    }
  }
  markDirty();
}

// Best dungeon to run automatically: ready, not too low for you
function autoDungeonPick() {
  const ok = dungeonsForChar().filter(d => dungeonStatus(d) === 'ready' && S.level <= d.max && (savedProgress(d) || !hourlyCapReached()));
  return ok.pop() || null;
}

// The battlefield scene while in a dungeon
function dungeonScene() {
  const d = G.run && dungeonById(G.run.id);
  return d && { id: 'dng_' + d.id, name: d.name, min: d.min, max: d.max, palette: d.palette, deco: d.deco, weather: d.weather, indoor: !d.outdoor, dungeon: true, raid: d.raid, size: d.size };
}

// ---------- HUD: boss progress strip ----------
function dungeonProgressHTML() {
  const r = G.run;
  if (!r) return '';
  const d = dungeonById(r.id);
  const cur = r.queue[Math.min(r.i, r.queue.length - 1)];
  const next = d.bosses[cur ? cur.bi : d.bosses.length - 1];
  const pips = d.bosses.map(b => `<i class="${r.killed.includes(b.name) ? 'dead' : b === next ? 'next' : ''}" title="${esc(b.name)}"></i>`).join('');
  return `<b>${esc(d.short || d.name)}</b><span class="pips">${pips}</span><span class="dp-next">${r.killed.length >= d.bosses.length ? 'Cleared' : `Next: ${esc(next.name)}`}</span>`;
}

// ---------- Dungeons tab ----------
function panelDungeons() {
  if (G.draft) return panelDraft();
  const r = G.run, now = Date.now(), runs = recentRuns(), capped = runs.length >= DUNGEON_HOURLY_CAP;
  const cur = r ? `<div class="drun"><div>${dungeonProgressHTML()}</div><div class="muted small">${timeText(r.t)} inside · ${r.killed.length}/${dungeonById(r.id).bosses.length} bosses</div><button class="btn danger" data-act="dungeonLeave">Leave Dungeon</button></div>` : '';
  const cards = dungeonsForChar().map(d => {
    const status = dungeonStatus(d), ds = dState(d.id), saved = savedProgress(d);
    const killed = saved ? d.bosses.filter((b, i) => dungeonQueue(d).slice(0, saved).filter(e => e.kind !== 'trash').length > i).map(b => b.name) : [];
    const col = conColor(Math.round((d.min + d.max) / 2), S.level);
    const inside = r && r.id === d.id;
    const blocked = status === 'ready' && !saved && capped;
    const state = inside ? 'You are inside' : blocked ? 'Too many instances this hour' : status === 'locked' ? `🔒 Requires level ${d.min}` : status === 'cooldown' ? `Resets in ${timeText((ds.cd - now) / 1000)}` : saved ? `Ready · ${killed.length}/${d.bosses.length} bosses defeated` : 'Ready';
    const bosses = d.bosses.map(b => `<span class="dboss${killed.includes(b.name) || (inside && r.killed.includes(b.name)) ? ' dead' : ''}" title="${esc(b.name)} — ${esc(b.loot.map(l => parseLoot(l).name).join(', '))}">${esc(b.name)}</span>`).join('');
    return `<div class="dcard ${status}${inside ? ' inside' : ''}" style="--z1:${d.palette.skyBottom};--z2:${d.palette.far}">
      <div class="dhead"><span class="dname">${esc(d.name)}</span><span class="dlv" style="color:${col}">Levels ${d.min}–${d.max}</span></div>
      <div class="dwhere">${esc(d.where)}${d.faction !== 'both' ? ` · ${FACTIONS[d.faction].name}` : ''}${ds.clears ? ` · Cleared ${ds.clears}×${ds.best ? ` (best ${timeText(ds.best)})` : ''}` : ''}</div>
      <div class="dbosses">${bosses}</div>
      <div class="dfoot"><span class="dstate">${state}</span>${inside || status !== 'ready' || blocked || r ? '' : `<button class="btn primary" data-act="dungeonEnter" data-v="${d.id}">Enter</button>`}</div>
    </div>`;
  }).join('');

  const capText = `Instances this hour: <b>${runs.length}/${DUNGEON_HOURLY_CAP}</b>${capped ? ` — next in ${timeText((Math.min(...runs) + 3600e3 - now) / 1000)}` : ''}`;
  return `<h3>Dungeons <span class="muted">— bosses drop named blue items for your class</span></h3>
    <label class="toggle"><input type="checkbox" data-act="autoDungeon" ${S.autoDungeon ? 'checked' : ''}> Automatically run the best available dungeon</label>
    <p class="small">${capText}</p>
    ${cur}<div class="dgrid">${cards}</div>
    <p class="muted small">You enter with a group of five drafted from the Group Finder. Stuns and Kick interrupt boss spells. Dying or leaving keeps the bosses you killed for ${DUNGEON_SAVE_HOURS} hours; after a full clear a dungeon resets in ${DUNGEON_LOCKOUT_MIN} minutes.${S.level >= CONFIG.LEVEL_CAP ? ` Badges of Justice: <b>${ACC.currency.badges || 0}</b>.` : ''}</p>
    ${raidsPanelHTML()}`;
}
