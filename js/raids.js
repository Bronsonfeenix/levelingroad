// =====================================================================
//  The Leveling Road — raids & tier sets
//  Raids run on the dungeon engine (instances.js) with a drafted core group
//  (party.js) plus the rest of the raid as simulated backing whose strength
//  depends on your item level. Bosses drop named epics and class tier pieces
//  (T0 from late dungeons, T1 Molten Core, T2 Onyxia/BWL, T3 Naxxramas).
// =====================================================================
'use strict';

const RAID_BERSERK_MULT = 5;     // a boss that hits its berserk timer deals this much more damage
const RAID_RESET_HOUR = 9;       // weekly raids reset on Tuesday at this hour (local time)
// The rest of the raid: damage dealers and healers besides your group of five
const RAID_BACKING = { 20: { dps: 10, heal: 4 }, 40: { dps: 25, heal: 9 } };
const RAID_DPS_SHARE = 0.32, RAID_HEAL_SHARE = 0.32;   // how much each backing member adds, relative to a bot

const RPAL = {
  zg:   { skyTop: '#123a2a', skyBottom: '#4a7a4a', sun: '#c8ff7a', far: '#2a5a3a', near: '#1e4a2a', foliage: '#3a7a2a', trunk: '#4a3a1e', rock: '#5a6a4a', ground: '#3a5a2a', groundDark: '#24401a' },
  mc:   { skyTop: '#140402', skyBottom: '#5a1a06', sun: '#ff8a1a', far: '#3a140a', near: '#240a06', foliage: '#6a2a0e', trunk: '#1e0a04', rock: '#4a2214', ground: '#2a120a', groundDark: '#160804' },
  ony:  { skyTop: '#0c0808', skyBottom: '#2e1e18', sun: '#ff6a2a', far: '#3a2a22', near: '#241a14', foliage: '#4a2a1a', trunk: '#2a1a12', rock: '#5a4232', ground: '#3a2a20', groundDark: '#241a14' },
  bwl:  { skyTop: '#0c0608', skyBottom: '#3a1212', sun: '#ff3a2a', far: '#2e1a1e', near: '#1e1014', foliage: '#5a1a1a', trunk: '#1a0e10', rock: '#4a2e32', ground: '#2a1a1e', groundDark: '#180e10' },
  aq:   { skyTop: '#2a1a08', skyBottom: '#a8783a', sun: '#ffd27a', far: '#7a5a2a', near: '#5a4020', foliage: '#6a3a7a', trunk: '#4a3018', rock: '#8a6a3a', ground: '#a8844a', groundDark: '#7a5a30' },
  naxx: { skyTop: '#06080e', skyBottom: '#1e2a3a', sun: '#7ad8ff', far: '#2a3240', near: '#1a2028', foliage: '#3a4a5a', trunk: '#20262e', rock: '#5a6878', ground: '#2a323c', groundDark: '#1a2028' },
};

// Raid loot item levels and how they look (raid themes for gearlook.js)
const RAIDS = [
  {
    id: 'zg', name: 'Zul\'Gurub', short: 'Zul\'Gurub', where: 'Stranglethorn Vale', faction: 'both', raid: true, size: 20, rec: 58, reset: '3day', ilvl: 65, min: 60, max: 60, lv: [62, 63],
    palette: RPAL.zg, deco: ['palm', 'statue', 'fern'], weather: 'fireflies', outdoor: true, music: ['DayJungle01', 'mystery02-zone'],
    trash: [bip('#2a6a7a', '#123a44', '#5a9aaa', 1.05, 'axe', { tusks: true }), beast('#4a6a3a', '#24361e', 1.15, { eye: '#ff3a2a' }), bip('#6a2a6a', '#2a102a', '#5a9aaa', 1, 'staff', { tusks: true })],
    trashNames: ['Gurubashi Berserker', 'Razzashi Raptor', 'Hakkari Shadowcaster'],
    bosses: [
      { name: 'High Priestess Jeklik', def: bip('#4a3a3a', '#1e1414', '#5a9aaa', 1.25, 'staff', { tusks: true }), mech: ['bolt:Shadow Word: Pain', 'adds:Bloodseeker Bat:2', 'berserk:Berserk:200'], loot: ['dagger Fang of Venoxis', 'clo.chest Jeklik\'s Robes'] },
      { name: 'High Priest Venoxis', def: bip('#2a6a3a', '#123a1e', '#5a9aaa', 1.25, 'staff', { tusks: true }), mech: ['bolt:Holy Fire', 'heal:Renew', 'berserk:Berserk:200'], loot: ['held Runecoil Charm', 'lea.feet Zanzil\'s Treads'] },
      { name: 'High Priestess Mar\'li', def: spider('#3a2a4a', '#9a5aea', 1.5), mech: ['adds:Spawn of Mar\'li:3', 'bolt:Poison Bolt Volley', 'berserk:Berserk:200'], loot: ['dagger Mar\'li\'s Eye', 'clo.legs Flowing Ritual Robes'] },
      { name: 'Bloodlord Mandokir', def: bip('#6a1a1a', '#2a0808', '#5a9aaa', 1.35, 'axe', { tusks: true }), mech: ['smash:Whirlwind', 'fear:Threatening Gaze', 'enrage', 'berserk:Berserk:200'], loot: ['sword Bloodlord\'s Defender', 'pla.shoulder Bloodsoaked Pauldrons', 'neck Mandokir\'s Sting'] },
      { name: 'High Priest Thekal', def: beast('#c8902a', '#3a2414', 1.4, { stripes: true, eye: '#ff3a2a' }), mech: ['smash:Mortal Cleave', 'adds:Zealot Lor\'Khan:1', 'berserk:Berserk:200'], loot: ['axe Zulian Stone Axe', 'lea.legs Betrayer\'s Boots'] },
      { name: 'High Priestess Arlokk', def: beast('#4a3a6a', '#1e1430', 1.35, { stripes: true, eye: '#c8ff7a' }), mech: ['adds:Zulian Prowler:3', 'smash:Gouge', 'berserk:Berserk:200'], loot: ['dagger Arlokk\'s Grasp', 'finger Band of Jin'] },
      { name: 'Jin\'do the Hexxer', def: bip('#2a6a7a', '#123a44', '#5a9aaa', 1.25, 'staff', { tusks: true, hood: true }), mech: ['bolt:Shadow Shock', 'adds:Powerful Healing Ward:1', 'fear:Hex', 'berserk:Berserk:220'], loot: ['mace Jin\'do\'s Judgement', 'held Jin\'do\'s Hexxer', 'clo.head Jin\'do\'s Coif'] },
      { name: 'Hakkar the Soulflayer', def: blob('#8a1a1a', '#ff3a2a', 1.6, 'demon'), mech: ['bolt:Corrupted Blood', 'adds:Son of Hakkar:2', 'smash:Cause Insanity', 'berserk:Berserk:240'], loot: ['2hsword Zin\'rokh, Destroyer of Worlds', 'sword Warblade of the Hakkari', 'neck Soul Corrupter\'s Necklace', 'pla.chest Bloodsoaked Breastplate'] },
    ],
  },
  {
    id: 'mc', name: 'Molten Core', where: 'Blackrock Mountain', faction: 'both', raid: true, size: 40, rec: 60, reset: 'weekly', ilvl: 66, tier: 1, min: 60, max: 60, lv: [62, 63],
    palette: RPAL.mc, deco: ['stalagmite', 'brazier', 'rock'], weather: 'embers', music: ['DayVolcanic01-new', 'battle04'],
    trash: [blob('#c84a1a', '#ffd27a', 1.15, 'elemental'), beast('#3a1a14', '#ff6a1a', 1.2, { eye: '#ffd23a' }), bip('#4a2a2a', '#1e0e0e', '#ff6a1a', 1.35, 'mace', { ctype: 'giant' })],
    trashNames: ['Firelord', 'Core Hound', 'Molten Giant'],
    bosses: [
      { name: 'Lucifron', def: bip('#4a1a1a', '#1e0808', '#a83a2a', 1.3, 'staff', { horns: true, ctype: 'demon' }), mech: ['bolt:Impending Doom', 'fear:Lucifron\'s Curse', 'adds:Flamewaker Protector:2', 'berserk:Berserk:180'], tierSlots: ['feet'], loot: ['neck Choker of Enlightenment', 'clo.waist Sash of Whispered Secrets'] },
      { name: 'Magmadar', def: beast('#4a1a0e', '#ff6a1a', 1.5, { eye: '#ffd23a', horns: true }), mech: ['fear:Panic', 'smash:Lava Bomb', 'enrage', 'berserk:Berserk:180'], tierSlots: ['legs'], loot: ['bow Striker\'s Mark', '2hmace Earthshaker', 'lea.legs Wild Growth Spaulders'] },
      { name: 'Gehennas', def: bip('#4a1a1a', '#1e0808', '#a83a2a', 1.3, 'staff', { horns: true, ctype: 'demon' }), mech: ['bolt:Shadow Bolt', 'adds:Flamewaker:2', 'berserk:Berserk:180'], tierSlots: ['hands'], loot: ['finger Ring of Spell Power'] },
      { name: 'Garr', def: blob('#5a4a4a', '#ff8a2a', 1.6, 'elemental'), mech: ['adds:Firesworn:3', 'smash:Antimagic Pulse', 'berserk:Berserk:200'], tierSlots: ['head'], loot: ['shield Drillborer Disk', 'mace Aurastone Hammer', 'sword Brutality Blade'] },
      { name: 'Shazzrah', def: bip('#4a1a3a', '#1e0818', '#a83a2a', 1.3, 'staff', { horns: true, ctype: 'demon' }), mech: ['bolt:Arcane Explosion', 'fear:Counterspell', 'berserk:Berserk:180'], tierSlots: ['hands'], loot: ['dagger Sorcerous Dagger'] },
      { name: 'Baron Geddon', def: blob('#c84a1a', '#ffd27a', 1.6, 'elemental'), mech: ['bolt:Living Bomb', 'smash:Inferno', 'berserk:Berserk:200'], tierSlots: ['shoulder'], loot: ['finger Seal of the Archmagus', 'staff Staff of Dominance'] },
      { name: 'Sulfuron Harbinger', def: bip('#4a2a1a', '#1e0e08', '#a83a2a', 1.35, 'mace', { horns: true, ctype: 'demon' }), mech: ['adds:Flamewaker Priest:2', 'smash:Hand of Ragnaros', 'berserk:Berserk:200'], tierSlots: ['waist'], loot: ['2haxe Shadowstrike'] },
      { name: 'Golemagg the Incinerator', def: bip('#5a3a2a', '#2a1a12', '#ff6a1a', 1.5, 'mace', { ctype: 'giant' }), mech: ['adds:Core Rager:2', 'smash:Magma Splash', 'enrage', 'berserk:Berserk:220'], tierSlots: ['chest'], loot: ['sword Azuresong Mageblade', 'staff Staff of Dominance', 'pla.feet Sabatons of the Flamewalker'] },
      { name: 'Majordomo Executus', def: bip('#6a2a1a', '#2a0e08', '#a83a2a', 1.35, 'staff', { horns: true, ctype: 'demon' }), mech: ['adds:Flamewaker Elite:3', 'bolt:Fireball', 'berserk:Berserk:220'], tierSlots: ['wrist'], loot: ['trinket Talisman of Ephemeral Power'] },
      { name: 'Ragnaros', def: blob('#ff5a1a', '#ffe27a', 1.8, 'elemental'), mech: ['smash:Wrath of Ragnaros', 'adds:Son of Flame:4', 'bolt:Lava Burst', 'berserk:Berserk:240'], tierSlots: ['legs'], tier: 2, loot: ['dagger Perdition\'s Blade', '2hsword Bonereaver\'s Edge', '2haxe Spinal Reaper', 'finger Band of Accuria', 'neck Choker of the Fire Lord', 'mai.head Crown of Destruction'] },
    ],
  },
  {
    id: 'ony', name: 'Onyxia\'s Lair', short: 'Onyxia', where: 'Dustwallow Marsh', faction: 'both', raid: true, size: 40, rec: 64, reset: 'weekly', ilvl: 70, tier: 2, min: 60, max: 60, lv: [62, 63],
    palette: RPAL.ony, deco: ['stalagmite', 'bones', 'rock'], weather: 'embers', music: ['battle05', 'mystery01-zone'],
    trash: [beast('#2a2a2e', '#7a3a1a', 1.1, { horns: true, eye: '#ff6a1a' })],
    trashNames: ['Onyxian Warder'],
    bosses: [
      { name: 'Onyxia', def: beast('#1e1e24', '#7a3a1a', 1.9, { horns: true, eye: '#ffb030', tusks: true }), mech: ['smash:Flame Breath', 'adds:Onyxian Whelp:4', 'fear:Bellowing Roar', 'berserk:Berserk:240'], tierSlots: ['head'], loot: ['axe Deathbringer', 'sword Vis\'kag the Bloodletter', 'finger Ring of Binding', 'neck Eskhandar\'s Collar'] },
    ],
  },
  {
    id: 'aq20', name: 'Ruins of Ahn\'Qiraj', short: 'Ruins of AQ', where: 'Silithus', faction: 'both', raid: true, size: 20, rec: 62, reset: '3day', ilvl: 68, min: 60, max: 60, lv: [62, 63],
    palette: RPAL.aq, deco: ['pillar', 'statue', 'rock'], weather: 'dust', outdoor: true, music: ['DayBarrenDry01', 'mystery03-zone'],
    trash: [spider('#7a5a2a', '#3a2a14', 1.2), bip('#7a6a3a', '#3a2e18', '#a8946a', 1.3, 'axe', { horns: true })],
    trashNames: ['Hive\'Zara Stinger', 'Qiraji Gladiator'],
    bosses: [
      { name: 'Kurinnaxx', def: spider('#8a6a2a', '#3a2a10', 1.6), mech: ['smash:Mortal Wound', 'enrage', 'berserk:Berserk:180'], loot: ['clo.chest Vestments of the Shifting Sands', 'lea.feet Boots of the Desert Protector'] },
      { name: 'General Rajaxx', def: bip('#6a5a2a', '#2a2412', '#a8946a', 1.4, 'axe', { horns: true }), mech: ['adds:Qiraji Warrior:3', 'smash:Thundercrash', 'berserk:Berserk:200'], loot: ['2hsword Manslayer of the Qiraji', 'pla.legs Legplates of the Qiraji Command'] },
      { name: 'Moam', def: bip('#5a5a6a', '#2a2a34', '#8a8a9a', 1.6, 'mace', { ctype: 'elemental' }), mech: ['adds:Mana Fiend:3', 'bolt:Arcane Eruption', 'berserk:Berserk:200'], loot: ['2hmace Gavel of Qiraji Authority', 'clo.waist Belt of the Inquisition'] },
      { name: 'Buru the Gorger', def: beast('#6a5a3a', '#2a2014', 1.7, { tusks: true }), mech: ['smash:Creeping Plague', 'enrage', 'berserk:Berserk:200'], loot: ['lea.legs Leggings of the Black Blizzard', 'shield Buru\'s Skull Fragment'] },
      { name: 'Ayamiss the Hunter', def: spider('#4a6a2a', '#c8e04a', 1.6), mech: ['bolt:Stinger Spray', 'adds:Hive\'Zara Larva:3', 'berserk:Berserk:200'], loot: ['bow Stinger of Ayamiss', 'mai.shoulder Shoulderpads of the Sands'] },
      { name: 'Ossirian the Unscarred', def: bip('#a8844a', '#4a3820', '#c8a87a', 1.6, 'sword', { ctype: 'giant', eye: '#7ad8ff' }), mech: ['smash:Crystalline Wind', 'enrage', 'berserk:Berserk:220'], loot: ['crossbow Crossbow of Imminent Doom', '2hmace Sand Polished Hammer', 'neck Choker of the Shifting Sands'] },
    ],
  },
  {
    id: 'bwl', name: 'Blackwing Lair', where: 'Blackrock Mountain', faction: 'both', raid: true, size: 40, rec: 68, reset: 'weekly', ilvl: 76, tier: 2, min: 60, max: 60, lv: [62, 63],
    palette: RPAL.bwl, deco: ['pillar', 'banner', 'brazier'], weather: 'embers', music: ['battle03', 'battle04'],
    trash: [beast('#2a2a3a', '#8a3a3a', 1.25, { horns: true, eye: '#ffd23a' }), bip('#2a1a1a', '#6a1a1a', '#5a4a4a', 1.2, 'sword', { horns: true })],
    trashNames: ['Death Talon Wyrmguard', 'Blackwing Legionnaire'],
    bosses: [
      { name: 'Razorgore the Untamed', def: beast('#3a2a2a', '#8a2a1a', 1.6, { horns: true }), mech: ['adds:Blackwing Mage:3', 'smash:Conflagration', 'berserk:Berserk:200'], tierSlots: ['wrist'], loot: ['trinket Arcane Infused Gem', 'staff Staff of the Shadow Flame'] },
      { name: 'Vaelastrasz the Corrupt', def: beast('#8a1a1a', '#3a0808', 1.7, { horns: true, eye: '#ffd23a' }), mech: ['bolt:Burning Adrenaline', 'smash:Flame Breath', 'enrage', 'berserk:Berserk:180'], tierSlots: ['waist'], loot: ['trinket Rejuvenating Gem', 'trinket Mind Quickening Gem'] },
      { name: 'Broodlord Lashlayer', def: bip('#2a1a1a', '#8a1a1a', '#5a4a4a', 1.4, 'sword', { horns: true }), mech: ['smash:Mortal Strike', 'adds:Death Talon Hatcher:2', 'berserk:Berserk:200'], tierSlots: ['feet'], loot: ['sword Maladath, Runed Blade of the Black Flight', 'clo.shoulder Mantle of the Blackwing Cabal'] },
      { name: 'Firemaw', def: beast('#1e1e24', '#c84a1a', 1.7, { horns: true }), mech: ['smash:Shadow Flame', 'bolt:Flame Buffet', 'berserk:Berserk:200'], tierSlots: ['hands'], loot: ['2haxe Drake Talon Cleaver', 'pla.shoulder Drake Talon Pauldrons'] },
      { name: 'Ebonroc', def: beast('#1a1a1e', '#5a3a6a', 1.7, { horns: true }), mech: ['smash:Shadow of Ebonroc', 'bolt:Wing Buffet', 'berserk:Berserk:200'], tierSlots: ['hands'], loot: ['trinket Styleen\'s Impeding Scarab', 'dagger Dragonfang Blade'] },
      { name: 'Flamegor', def: beast('#2a1a1a', '#ff6a1a', 1.7, { horns: true }), mech: ['smash:Frenzy', 'bolt:Wing Buffet', 'enrage', 'berserk:Berserk:200'], tierSlots: ['hands'], loot: ['lea.legs Emberweave Leggings', 'trinket Drake Fang Talisman'] },
      { name: 'Chromaggus', def: beast('#4a3a5a', '#c8a03a', 1.8, { horns: true, eye: '#7ad8ff' }), mech: ['bolt:Incinerate', 'smash:Time Lapse', 'enrage', 'berserk:Berserk:220'], tierSlots: ['shoulder'], loot: ['sword Chromatically Tempered Sword', 'crossbow Ashjre\'thul, Crossbow of Smiting', 'pla.feet Chromatic Boots'] },
      { name: 'Nefarian', def: bip('#1a1a1e', '#8a1a1a', '#5a5a5a', 1.6, 'staff', { horns: true, eye: '#ff3a2a' }), mech: ['adds:Chromatic Drakonid:3', 'fear:Bellowing Roar', 'smash:Shadow Flame', 'berserk:Berserk:240'], tierSlots: ['chest'], loot: ['2hsword Ashkandi, Greatsword of the Brotherhood', 'mace Lok\'amir il Romathis', 'axe Crul\'shorukh, Edge of Chaos', 'neck Prestor\'s Talisman of Connivery', 'staff Staff of the Shadow Flame'] },
    ],
  },
  {
    id: 'aq40', name: 'Temple of Ahn\'Qiraj', short: 'Temple of AQ', where: 'Silithus', faction: 'both', raid: true, size: 40, rec: 74, reset: 'weekly', ilvl: 80, min: 60, max: 60, lv: [62, 63],
    palette: RPAL.aq, deco: ['pillar', 'statue', 'crystal'], weather: 'dust', music: ['mystery03-zone', 'battle05'],
    trash: [bip('#6a4a7a', '#2a1a34', '#a87ac8', 1.35, 'claws', { horns: true }), spider('#5a3a6a', '#c8a03a', 1.3)],
    trashNames: ['Anubisath Sentinel', 'Vekniss Soldier'],
    bosses: [
      { name: 'The Prophet Skeram', def: bip('#6a4a2a', '#2a1e12', '#c8a03a', 1.3, 'staff', { horns: true }), mech: ['adds:Image of Skeram:2', 'bolt:Arcane Explosion', 'fear:True Fulfillment', 'berserk:Berserk:200'], loot: ['staff Staff of the Qiraji Prophets', 'clo.legs Leggings of Immersion'] },
      { name: 'Battleguard Sartura', def: bip('#7a5a2a', '#3a2a12', '#c8a03a', 1.4, 'axe', { horns: true }), mech: ['smash:Whirlwind', 'adds:Sartura\'s Royal Guard:3', 'enrage', 'berserk:Berserk:200'], loot: ['held Sartura\'s Might', 'pla.legs Legplates of Blazing Light'] },
      { name: 'Fankriss the Unyielding', def: spider('#5a4a2a', '#c8a03a', 1.8), mech: ['adds:Spawn of Fankriss:3', 'smash:Mortal Wound', 'berserk:Berserk:200'], loot: ['trinket Fetish of Chitinous Spikes', 'sword Ancient Qiraji Ripper'] },
      { name: 'Princess Huhuran', def: spider('#6a5a2a', '#9aff5a', 1.8), mech: ['bolt:Wyvern Sting', 'enrage', 'berserk:Berserk:180'], loot: ['finger Ring of the Martyr', 'bow Huhuran\'s Stinger'] },
      { name: 'The Twin Emperors', def: bip('#8a6a2a', '#3a2a12', '#c8a03a', 1.45, 'claws', { horns: true, eye: '#ff3a2a' }), mech: ['smash:Unbalancing Strike', 'bolt:Blizzard', 'adds:Qiraji Scarab:4', 'berserk:Berserk:240'], loot: ['sword Kalimdor\'s Revenge', 'pla.hands Gauntlets of Annihilation', 'clo.waist Royal Qiraji Belt'] },
      { name: 'Ouro', def: beast('#8a7a4a', '#3a3018', 1.9, { tusks: true }), mech: ['smash:Sand Blast', 'adds:Dirt Mound:2', 'enrage', 'berserk:Berserk:220'], loot: ['gun Larvae of the Great Worm', 'mai.chest Ouro\'s Intact Hide'] },
      { name: 'C\'Thun', def: blob('#5a2a3a', '#ff7a8a', 2, 'demon'), mech: ['bolt:Eye Beam', 'adds:Claw Tentacle:4', 'fear:Dark Glare', 'berserk:Berserk:260'], loot: ['2haxe Dark Edge of Insanity', 'dagger Death\'s Sting', 'neck Eye of C\'Thun', 'finger Grasp of the Old God', 'pla.chest Carapace of the Old God'] },
    ],
  },
  {
    id: 'naxx', name: 'Naxxramas', where: 'Eastern Plaguelands', faction: 'both', raid: true, size: 40, rec: 80, reset: 'weekly', ilvl: 88, tier: 3, min: 60, max: 60, lv: [62, 63],
    palette: RPAL.naxx, deco: ['pillar', 'bones', 'grave'], weather: null, music: ['KelThuzad1A', 'CursedLand04', 'spooky01-moment'],
    trash: [bip('#6a7a6a', '#343e34', '#8a9a8a', 1.4, 'claws', UNDEAD), bip('#8a8a9a', '#4a4a5a', '#c8d0d8', 1.2, 'axe', UNDEAD), spider('#3a3a4a', '#7ad8ff', 1.3)],
    trashNames: ['Patchwork Golem', 'Deathknight Captain', 'Crypt Reaver'],
    bosses: [
      { name: 'Anub\'Rekhan', def: spider('#2a2a3a', '#9ad8ff', 1.8), mech: ['adds:Crypt Guard:2', 'smash:Impale', 'berserk:Berserk:200'], tierSlots: ['wrist'], loot: ['neck Touch of Frost'] },
      { name: 'Grand Widow Faerlina', def: bip('#3a2a3a', '#1a101a', '#c8c0b0', 1.3, 'staff', UNDEAD), mech: ['bolt:Rain of Fire', 'adds:Naxxramas Worshipper:3', 'enrage', 'berserk:Berserk:200'], tierSlots: ['waist'], loot: ['dagger Widow\'s Remorse'] },
      { name: 'Maexxna', def: spider('#4a4a5a', '#9ad8ff', 2), mech: ['smash:Web Wrap', 'adds:Maexxna Spiderling:4', 'enrage', 'berserk:Berserk:220'], tierSlots: ['hands'], loot: ['dagger Maexxna\'s Fang', 'trinket Kiss of the Spider'] },
      { name: 'Noth the Plaguebringer', def: bip('#4a5a3a', '#1e2a14', '#9aa88a', 1.3, 'staff', UNDEAD), mech: ['bolt:Curse of the Plaguebringer', 'adds:Plagued Warrior:3', 'berserk:Berserk:200'], tierSlots: ['wrist'], loot: ['axe Hatchet of Sundered Bone'] },
      { name: 'Heigan the Unclean', def: bip('#3a4a2a', '#1a2410', '#8a9a7a', 1.35, 'staff', UNDEAD), mech: ['smash:Eruption', 'bolt:Spell Disruption', 'berserk:Berserk:200'], tierSlots: ['waist'], loot: ['clo.head Preceptor\'s Hat'] },
      { name: 'Loatheb', def: blob('#4a6a3a', '#c8ff5a', 1.8, 'undead'), mech: ['bolt:Inevitable Doom', 'adds:Spore:3', 'berserk:Berserk:240'], tierSlots: ['hands'], loot: ['trinket Loatheb\'s Reflection', 'staff Brimstone Staff'] },
      { name: 'Instructor Razuvious', def: bip('#5a5a6a', '#2a2a34', '#9aa8b0', 1.4, 'sword', UNDEAD), mech: ['smash:Unbalancing Strike', 'adds:Deathknight Understudy:2', 'berserk:Berserk:200'], tierSlots: ['feet'], loot: ['sword Iblis, Blade of the Fallen Seraph', 'pla.waist Girdle of the Mentor'] },
      { name: 'Gothik the Harvester', def: bip('#3a2a4a', '#1a101a', '#c8c0b0', 1.35, 'staff', UNDEAD), mech: ['adds:Unrelenting Rider:3', 'bolt:Shadow Bolt', 'berserk:Berserk:200'], tierSlots: ['feet'], loot: ['mai.wrist The Soul Harvester\'s Bindings'] },
      { name: 'The Four Horsemen', def: bip('#2a2a3a', '#8a1a1a', '#9aa8b0', 1.5, 'mace', UNDEAD), mech: ['bolt:Holy Wrath', 'smash:Mark of the Horsemen', 'adds:Sir Zeliek:1', 'berserk:Berserk:240'], tierSlots: ['chest'], loot: ['mace Maul of the Redeemed Crusader', 'bow Soulstring'] },
      { name: 'Patchwerk', def: bip('#8a9a7a', '#3a4430', '#a8b090', 1.7, 'claws', UNDEAD), mech: ['smash:Hateful Strike', 'enrage', 'berserk:Berserk:180'], tierSlots: ['shoulder'], loot: ['shield Wall of the Dead', 'finger Ring of the Eternal Flame'] },
      { name: 'Grobbulus', def: blob('#6a8a3a', '#c8ff5a', 1.8, 'undead'), mech: ['bolt:Mutating Injection', 'adds:Fallout Slime:3', 'berserk:Berserk:200'], tierSlots: ['shoulder'], loot: ['gun Toxin Injector'] },
      { name: 'Gluth', def: beast('#6a7a6a', '#3a4434', 1.9, { tusks: true, eye: '#c8ff5a' }), mech: ['smash:Mortal Wound', 'adds:Zombie Chow:4', 'enrage', 'berserk:Berserk:200'], tierSlots: ['legs'], loot: ['shield Death\'s Bargain'] },
      { name: 'Thaddius', def: bip('#6a6a7a', '#2a2a34', '#7ad8ff', 1.8, 'claws', { ctype: 'undead', eye: '#7ad8ff' }), mech: ['bolt:Chain Lightning', 'smash:Polarity Shift', 'berserk:Berserk:240'], tierSlots: ['head'], loot: ['staff Spire of Twilight', 'sword The Castigator'] },
      { name: 'Sapphiron', def: beast('#c8d8e8', '#5a7aa8', 2, { horns: true, eye: '#7ad8ff' }), mech: ['bolt:Frost Breath', 'fear:Ice Bolt', 'smash:Tail Sweep', 'berserk:Berserk:240'], tierSlots: ['legs'], loot: ['trinket Slayer\'s Crest', 'trinket The Restrained Essence of Sapphiron', 'held Sapphiron\'s Left Eye'] },
      { name: 'Kel\'Thuzad', def: bip('#4a5a7a', '#1e2a44', '#a8c8e0', 1.6, 'staff', UNDEAD), mech: ['bolt:Frostbolt Volley', 'adds:Soldier of the Frozen Wastes:4', 'fear:Chains of Kel\'Thuzad', 'berserk:Berserk:280'], tierSlots: ['head'], loot: ['2hsword Corrupted Ashbringer', '2hmace Might of Menethil', 'mace Hammer of the Twisting Nether', 'trinket The Phylactery of Kel\'Thuzad', 'neck Gem of Trapped Innocents', 'staff Atiesh, Greatstaff of the Guardian'] },
    ],
  },
];
for (const d of RAIDS) {
  d.trash.forEach((t, i) => { t.name = t.name || d.trashNames[i]; });
  if (typeof MUSIC !== 'undefined') MUSIC['dng_' + d.id] = d.music;
}

// ---------- lockouts (S.raids = { id: { resetAt, killed: [] } }) ----------
function nextRaidReset(d, from) {
  const now = new Date(from || Date.now());
  if (d.reset === '3day') {
    const epoch = new Date(2026, 0, 6, RAID_RESET_HOUR).getTime(), span = 3 * 864e5;
    return epoch + Math.ceil((now.getTime() - epoch + 1) / span) * span;
  }
  const r = new Date(now); r.setHours(RAID_RESET_HOUR, 0, 0, 0);
  let add = (2 - r.getDay() + 7) % 7;   // Tuesday
  if (add === 0 && r.getTime() <= now.getTime()) add = 7;
  r.setDate(r.getDate() + add);
  return r.getTime();
}
function rState(d) {
  S.raids = S.raids || {};
  let s = S.raids[d.id];
  if (!s || s.resetAt <= Date.now()) s = S.raids[d.id] = { resetAt: nextRaidReset(d), killed: [], clears: (s && s.clears) || 0 };
  return s;
}

// Average item level of what you're wearing (empty slots count as 0)
function avgItemLevel(eq) {
  eq = eq || S.equipment;
  const slots = ['weapon', 'head', 'neck', 'shoulder', 'chest', 'wrist', 'hands', 'waist', 'legs', 'feet', 'finger1', 'finger2', 'trinket1', 'trinket2'];
  if (!(eq.weapon && WEAPON_TYPES[eq.weapon.wtype] && WEAPON_TYPES[eq.weapon.wtype].hands === 2)) slots.push('offhand');
  return Math.round(slots.reduce((s, k) => s + ((eq[k] && eq[k].ilvl) || 0), 0) / slots.length);
}
// How well the rest of the raid does, from your gear compared to what the raid expects
const raidGearFactor = d => Math.max(0.4, Math.min(1.4, 1 + (avgItemLevel() - d.rec) * 0.04));

// ---------- tier sets ----------
const TIER_INFO = [
  { name: 'Tier 0', q: 3, ilvl: 58, metal: '#c8ccd4', tint: null, motif: 'crest' },
  { name: 'Tier 1', q: 4, ilvl: 66, metal: '#ffb030', tint: '#c8501a', motif: 'flame' },
  { name: 'Tier 2', q: 4, ilvl: 76, metal: '#e0b040', tint: '#8a1a1a', motif: 'spike' },
  { name: 'Tier 3', q: 4, ilvl: 88, metal: '#c8e0f0', tint: '#5a7aa8', motif: 'rune' },
];
// [set name, word used on pieces, prefix (true) or "of X" (false)]
const TIER_SETS = {
  warrior: [['Battlegear of Valor', 'Valor', false], ['Battlegear of Might', 'Might', false], ['Battlegear of Wrath', 'Wrath', false], ['Dreadnaught\'s Battlegear', 'Dreadnaught', true]],
  paladin: [['Lightforge Armor', 'Lightforge', true], ['Lawbringer Armor', 'Lawbringer', true], ['Judgement Armor', 'Judgement', false], ['Redemption Armor', 'Redemption', false]],
  hunter:  [['Beaststalker Armor', 'Beaststalker', true], ['Giantstalker Armor', 'Giantstalker', true], ['Dragonstalker Armor', 'Dragonstalker', true], ['Cryptstalker Armor', 'Cryptstalker', true]],
  rogue:   [['Shadowcraft Armor', 'Shadowcraft', true], ['Nightslayer Armor', 'Nightslayer', true], ['Bloodfang Armor', 'Bloodfang', true], ['Bonescythe Armor', 'Bonescythe', true]],
  priest:  [['Vestments of the Devout', 'the Devout', false], ['Vestments of Prophecy', 'Prophecy', false], ['Vestments of Transcendence', 'Transcendence', false], ['Vestments of Faith', 'Faith', false]],
  shaman:  [['The Elements', 'the Elements', false], ['The Earthfury', 'Earthfury', true], ['The Ten Storms', 'Ten Storms', false], ['The Earthshatter', 'Earthshatter', true]],
  mage:    [['Magister\'s Regalia', 'Magister\'s', true], ['Arcanist Regalia', 'Arcanist', true], ['Netherwind Regalia', 'Netherwind', true], ['Frostfire Regalia', 'Frostfire', true]],
  warlock: [['Dreadmist Raiment', 'Dreadmist', true], ['Felheart Raiment', 'Felheart', true], ['Nemesis Raiment', 'Nemesis', true], ['Plagueheart Raiment', 'Plagueheart', true]],
  druid:   [['Wildheart Raiment', 'Wildheart', true], ['Cenarion Raiment', 'Cenarion', true], ['Stormrage Raiment', 'Stormrage', true], ['Dreamwalker Raiment', 'Dreamwalker', true]],
};
const TIER_SLOTS = ['head', 'shoulder', 'chest', 'wrist', 'hands', 'waist', 'legs', 'feet'];
const TIER_NOUNS = {
  plate:   { head: 'Helm', shoulder: 'Pauldrons', chest: 'Breastplate', wrist: 'Bracers', hands: 'Gauntlets', waist: 'Belt', legs: 'Legplates', feet: 'Sabatons' },
  mail:    { head: 'Headpiece', shoulder: 'Spaulders', chest: 'Breastplate', wrist: 'Bracers', hands: 'Gauntlets', waist: 'Belt', legs: 'Legguards', feet: 'Boots' },
  leather: { head: 'Cover', shoulder: 'Shoulderpads', chest: 'Chestpiece', wrist: 'Bracers', hands: 'Gloves', waist: 'Belt', legs: 'Pants', feet: 'Boots' },
  cloth:   { head: 'Circlet', shoulder: 'Mantle', chest: 'Robes', wrist: 'Bindings', hands: 'Gloves', waist: 'Belt', legs: 'Leggings', feet: 'Boots' },
};
const tierSetId = (tier, cls) => `t${tier}_${cls}`;
const tierArmor = cls => CLASSES[cls].armor[1];
function tierPieceName(tier, cls, slot) {
  const [, word, prefix] = TIER_SETS[cls][tier], noun = TIER_NOUNS[tierArmor(cls)][slot];
  return prefix ? `${word} ${noun}` : `${noun} of ${word}`;
}
function makeTierItem(tier, cls, slot) {
  const T = TIER_INFO[tier], id = tierSetId(tier, cls);
  const it = makeItem(T.ilvl, T.q, slot, { atype: tierArmor(cls), name: tierPieceName(tier, cls, slot), src: id });
  for (const k in it.stats) it.stats[k] = Math.round(it.stats[k] * 1.1);
  it.set = id; it.req = Math.min(it.req, CONFIG.LEVEL_CAP);
  return it;
}

// Set bonuses at 2/4/6/8 pieces (effect keys from the talent system)
function setBonuses(tier, cls) {
  const heal = (cls === 'priest') || (S && S.cls === cls && specName && /Holy|Restoration|Discipline/.test(specName() || ''));
  const B = [
    [{ armor: 0.05 }, heal ? { heal: 0.03 } : { dmg: 0.03 }, { crit: 0.02 }, { hp: 0.04 }],
    [{ armor: 0.06 }, heal ? { heal: 0.04 } : { dmg: 0.04 }, { crit: 0.03 }, { hp: 0.05, heal: 0.05 }],
    [{ armor: 0.07 }, heal ? { heal: 0.05 } : { dmg: 0.05 }, { crit: 0.04 }, { haste: 0.04 }],
    [{ armor: 0.08 }, heal ? { heal: 0.06 } : { dmg: 0.06 }, { crit: 0.05 }, { haste: 0.06, dmgTaken: -0.05 }],
  ][tier];
  return [[2, B[0]], [4, B[1]], [6, B[2]], [8, B[3]]];
}
const FX_LABEL = { armor: 'armor', dmg: 'damage', heal: 'healing', crit: 'critical strike chance', hp: 'maximum health', haste: 'attack and casting speed', dmgTaken: 'damage taken' };
const fxLabel = fx => Object.entries(fx).map(([k, v]) => `${v > 0 ? '+' : ''}${Math.round(v * 100)}% ${FX_LABEL[k] || k}`).join(', ');
// Equipped pieces per set id
function equippedSets(eq) {
  const n = {};
  for (const s of SLOTS) { const it = (eq || S.equipment)[s]; if (it && it.set) n[it.set] = (n[it.set] || 0) + 1; }
  return n;
}
// Merged into gatherFx (game.js)
function setBonusFx() {
  const fx = {};
  const sets = equippedSets();
  for (const id in sets) {
    const [, t, c] = id.match(/^t(\d)_(\w+)$/) || [];
    if (!c) continue;
    for (const [need, b] of setBonuses(+t, c)) if (sets[id] >= need) for (const k in b) fx[k] = (fx[k] || 0) + b[k];
  }
  return fx;
}
// Tooltip block for a set piece
function setTooltipHTML(it) {
  const [, t, c] = it.set.match(/^t(\d)_(\w+)$/) || [];
  if (!c) return '';
  const have = equippedSets()[it.set] || 0;
  const worn = new Set(SLOTS.map(s => S.equipment[s]).filter(x => x && x.set === it.set).map(x => x.slot));
  return `<div class="tt-set"><div class="tt-setname">${esc(TIER_SETS[c][t][0])} (${have}/8)</div>
    ${TIER_SLOTS.map(sl => `<div class="${worn.has(sl) ? 'on' : 'off'}">${esc(tierPieceName(+t, c, sl))}</div>`).join('')}
    ${setBonuses(+t, c).map(([need, b]) => `<div class="tt-setb ${have >= need ? 'on' : 'off'}">(${need}) Set: ${fxLabel(b)}</div>`).join('')}</div>`;
}
// Character sheet box
function setBonusesHTML() {
  const sets = equippedSets();
  const rows = Object.entries(sets).map(([id, n]) => {
    const [, t, c] = id.match(/^t(\d)_(\w+)$/) || [];
    if (!c) return '';
    const act = setBonuses(+t, c).filter(([need]) => n >= need);
    return `<div class="srow"><span>${esc(TIER_SETS[c][t][0])} <span class="muted">(${n}/8)</span></span><b>${act.length ? act.map(([, b]) => fxLabel(b)).join('; ') : '—'}</b></div>`;
  }).join('');
  return rows ? `<div class="sidecard"><h3>Set Bonuses</h3>${rows}</div>` : '';
}

// ---------- looks: raid themes and tier themes for gearlook.js ----------
Object.assign(GEAR_THEMES, {
  zg:   { main: '#1e6a6a', second: '#c8a03a', metal: '#d8b04a', accent: '#ff3a5a', motif: 'tooth' },
  mc:   { main: '#3a1a12', second: '#c84a1a', metal: '#ff9a2a', accent: '#ffd23a', motif: 'flame' },
  ony:  { main: '#1e1e24', second: '#7a3a1a', metal: '#c8a03a', accent: '#ff6a2a', motif: 'spike' },
  aq20: { main: '#c8a050', second: '#5a3a7a', metal: '#e0c060', accent: '#9a5aea', motif: 'scarab' },
  bwl:  { main: '#2a1418', second: '#8a1a1a', metal: '#c8a03a', accent: '#ff3a2a', motif: 'spike' },
  aq40: { main: '#5a3a7a', second: '#c8a050', metal: '#e0c060', accent: '#c87aff', motif: 'scarab' },
  naxx: { main: '#2a3240', second: '#c8d8e8', metal: '#a8c8e0', accent: '#7ad8ff', motif: 'skull' },
});
for (const c of Object.keys(TIER_SETS)) TIER_INFO.forEach((T, t) => {
  const base = CLASSES[c].look.main;
  GEAR_THEMES[tierSetId(t, c)] = {
    main: T.tint ? mixC(base, T.tint, 0.45) : base, second: T.tint ? mixC(CLASSES[c].color, T.tint, 0.3) : CLASSES[c].look.trim,
    metal: T.metal, accent: t === 3 ? '#7ad8ff' : t === 2 ? '#ff3a2a' : t === 1 ? '#ffd23a' : CLASSES[c].color, motif: T.motif, raid: t > 0,
  };
});
for (const d of RAIDS) if (GEAR_THEMES[d.id]) GEAR_THEMES[d.id].raid = true;

// ---------- Raids section of the Dungeons & Raids tab ----------
function raidsPanelHTML() {
  const r = G.run, now = Date.now(), my = avgItemLevel();
  const cards = RAIDS.map(d => {
    const rs = rState(d), inside = r && r.id === d.id;
    const cleared = rs.killed.length >= d.bosses.length;
    const locked = S.level < CONFIG.LEVEL_CAP;
    const gf = raidGearFactor(d), col = my >= d.rec ? '#4fe060' : my >= d.rec - 6 ? '#ffd23a' : '#ff5a4a';
    const state = inside ? 'You are inside' : locked ? `🔒 Requires level ${CONFIG.LEVEL_CAP}` : cleared ? `Cleared · resets in ${timeText((rs.resetAt - now) / 1000)}` : rs.killed.length ? `Saved: ${rs.killed.length}/${d.bosses.length} bosses · resets in ${timeText((rs.resetAt - now) / 1000)}` : `Ready · resets in ${timeText((rs.resetAt - now) / 1000)}`;
    const bosses = d.bosses.map(b => `<span class="dboss${rs.killed.includes(b.name) ? ' dead' : ''}" title="${esc(b.name)} — ${esc(b.loot.map(l => parseLoot(l).name).join(', '))}${b.tierSlots ? ` + Tier ${b.tier || d.tier}` : ''}">${esc(b.name)}</span>`).join('');
    return `<div class="dcard raidcard${locked ? ' locked' : ''}${inside ? ' inside' : ''}" style="--z1:${d.palette.skyBottom};--z2:${d.palette.far}">
      <div class="dhead"><span class="dname">${esc(d.name)}</span><span class="dlv">${d.size}-player</span></div>
      <div class="dwhere">${esc(d.where)} · ${d.tier ? `Tier ${d.tier} · ` : ''}recommended item level <b>${d.rec}</b> · yours <b style="color:${col}">${my}</b>${locked ? '' : ` · raid strength ${Math.round(gf * 100)}%`}${rs.clears ? ` · Cleared ${rs.clears}×` : ''}</div>
      <div class="dbosses">${bosses}</div>
      <div class="dfoot"><span class="dstate">${state}</span>${inside || locked || cleared || r ? '' : `<button class="btn primary" data-act="dungeonEnter" data-v="${d.id}">Enter</button>`}</div>
    </div>`;
  }).join('');
  return `<h3 class="raidhead">Raids <span class="muted">— level ${CONFIG.LEVEL_CAP}. You bring a group of five; the rest of the raid fights as well as your gear allows</span></h3>
    <div class="dgrid">${cards}</div>
    <p class="muted small">Weekly raids reset on Tuesday, Zul'Gurub and the Ruins of Ahn'Qiraj every 3 days. Bosses you kill stay dead until the reset. Bosses hit their berserk timer if your raid is too weak.</p>`;
}
