// =====================================================================
//  The Leveling Road — factions, races, classes and class abilities
// =====================================================================
//
//  Ability fields (all optional except id/name):
//    kind      'active' (default, used by the rotation) | 'aura' (passive while known)
//              | 'pet' (summons a pet) | 'charge' (on engage) | 'form' (shapeshift)
//    learn     level the ability becomes trainable; ranks: levels of each rank
//    talent    granted by a talent instead of the trainer
//    school    physical | holy | fire | frost | arcane | nature | shadow
//    cost      rage/energy points, or a fraction of max mana for mana users
//    cd, cast, cdGroup, nogcd, range (usable while the enemy approaches)
//    mult      direct damage as a multiple of the hero's base hit
//    dot       { mult, dur, every }     periodic damage on the target
//    heal / healPct / hot { heal, dur } healing; shield: absorb (× base hit)
//    buff      { dur, fx, oneShot, perCp }  temporary self buff
//    stun      seconds the enemy cannot attack
//    gain      { rage | energy | mana | cp }  resource gain (mana is a fraction)
//    cp / finisher  combo points (Rogue, Cat Form)
//    cond      when the rotation may use it (see usable() in game.js)
//    fx        aura effects (same vocabulary as talents)
//    proj      projectile drawn from the hero to the target
//    names     [[level, name]] — the spell's name changes as ranks are learned
// =====================================================================

const FACTIONS = {
  alliance: { name: 'Alliance', color: '#3f6fd8', icon: '🦁', motto: 'For the Alliance!' },
  horde:    { name: 'Horde',    color: '#b3261e', icon: '🐺', motto: 'For the Horde!' },
};

const SCHOOL_COLORS = { physical: '#ffffff', holy: '#ffe47a', fire: '#ff8a3a', frost: '#8ad8ff', arcane: '#ff9aff', nature: '#8aff6a', shadow: '#c08aff' };

// ---------------------------------------------------------------------
//  Races
// ---------------------------------------------------------------------
const RACES = [
  {
    id: 'human', name: 'Human', faction: 'alliance', icon: '🏰', start: 'elwynn',
    classes: ['warrior', 'paladin', 'rogue', 'priest', 'mage', 'warlock'],
    stats: { spi: 2 },
    racial: { name: 'The Human Spirit', desc: 'Spirit increased by 5%. Sword and Mace Specialization grant 2% damage.', fx: { stat: { spi: 0.05 }, dmg: 0.02 } },
    look: { skin: '#e2b48c', hair: '#6b4a2f', leg: 46, torso: 54, width: 32, head: 15, hairStyle: 'short' },
    names: ['Aldric', 'Brenna', 'Corwin', 'Elara', 'Garrick', 'Liesel', 'Marten', 'Rowena', 'Tobias', 'Wynne', 'Edric', 'Maribel'],
  },
  {
    id: 'dwarf', name: 'Dwarf', faction: 'alliance', icon: '⛏️', start: 'dunmorogh',
    classes: ['warrior', 'paladin', 'hunter', 'rogue', 'priest'],
    stats: { str: 2, sta: 2, agi: -1 },
    racial: { name: 'Stoneform & Find Treasure', desc: 'Armor increased by 10%. 5% more loot from your kills.', fx: { armor: 0.1, loot: 0.05 } },
    look: { skin: '#e0a982', hair: '#a8481e', leg: 30, torso: 50, width: 42, head: 15, hairStyle: 'short', beard: true },
    names: ['Thordin', 'Brunhild', 'Durgan', 'Hilda', 'Bromli', 'Grunda', 'Torvald', 'Kragga', 'Dagna', 'Bolgrim'],
  },
  {
    id: 'nightelf', name: 'Night Elf', faction: 'alliance', icon: '🌙', start: 'teldrassil',
    classes: ['warrior', 'hunter', 'rogue', 'priest', 'druid'],
    stats: { agi: 3, str: -1 },
    racial: { name: 'Quickness & Shadowmeld', desc: 'Dodge chance increased by 1%.', fx: { dodge: 0.01 } },
    look: { skin: '#9c86c9', hair: '#3fbfae', leg: 54, torso: 58, width: 30, head: 14, hairStyle: 'long', ears: 'long' },
    names: ['Elarion', 'Faelyn', 'Ilyara', 'Thaelis', 'Nymara', 'Lunareth', 'Shalendra', 'Kaldris', 'Aerith', 'Valandor'],
  },
  {
    id: 'gnome', name: 'Gnome', faction: 'alliance', icon: '⚙️', start: 'dunmorogh',
    classes: ['warrior', 'rogue', 'mage', 'warlock'],
    stats: { int: 3, str: -2 },
    racial: { name: 'Expansive Mind', desc: 'Intellect increased by 5%.', fx: { stat: { int: 0.05 } } },
    look: { skin: '#f0c8a8', hair: '#ff6fb5', leg: 24, torso: 34, width: 26, head: 17, hairStyle: 'pigtails', ears: 'small' },
    names: ['Fizzwick', 'Tinkra', 'Gimbletop', 'Sprocket', 'Nixie', 'Cogsworth', 'Wizzle', 'Bixie', 'Gearspark', 'Pipwhistle'],
  },
  {
    id: 'orc', name: 'Orc', faction: 'horde', icon: '🪓', start: 'durotar',
    classes: ['warrior', 'hunter', 'rogue', 'shaman', 'warlock'],
    stats: { str: 3, sta: 1, int: -1 },
    racial: { name: 'Blood Fury & Command', desc: 'Periodically enrage for 25% more damage. Pets deal 5% more damage.', fx: { petDmg: 0.05 } },
    look: { skin: '#6f9a3a', hair: '#1a1a1a', leg: 46, torso: 58, width: 40, head: 15, hairStyle: 'topknot', tusks: 'small' },
    names: ['Grokk', 'Durza', 'Morgash', 'Throgg', 'Karga', 'Zugrah', 'Ruknar', 'Ogra', 'Gorzug', 'Shazka'],
    abilities: [
      { id: 'blood_fury', name: 'Blood Fury', icon: '🩸', learn: 1, ranks: [1], cd: 120, nogcd: true, buff: { dur: 15, fx: { dmg: 0.25 } }, cond: { inFight: true }, desc: 'Increases your damage by 25% for 15 sec.' },
    ],
  },
  {
    id: 'undead', name: 'Undead', faction: 'horde', icon: '💀', start: 'tirisfal',
    classes: ['warrior', 'rogue', 'priest', 'mage', 'warlock'],
    stats: { spi: 3, str: -1 },
    racial: { name: 'Cannibalize & Will of the Forsaken', desc: 'Restore 7% of your health after every kill.', fx: { onKillHeal: 0.07 } },
    look: { skin: '#a9b4a6', hair: '#3a2f40', leg: 46, torso: 52, width: 28, head: 14, hairStyle: 'long', jaw: true },
    names: ['Mordric', 'Vesper', 'Cadavera', 'Silas', 'Ashwyn', 'Grimm', 'Lenore', 'Thane', 'Morwen', 'Hollis'],
  },
  {
    id: 'tauren', name: 'Tauren', faction: 'horde', icon: '🐂', start: 'mulgore',
    classes: ['warrior', 'hunter', 'shaman', 'druid'],
    stats: { str: 3, sta: 2, agi: -2 },
    racial: { name: 'Endurance & War Stomp', desc: 'Maximum health increased by 5%. Can stun enemies with War Stomp.', fx: { hp: 0.05 } },
    look: { skin: '#7a5236', hair: '#2c1d12', leg: 52, torso: 64, width: 46, head: 18, hairStyle: 'braids', horns: true, snout: true, hooves: true },
    names: ['Harn', 'Mahka', 'Tahwa', 'Bruul', 'Kotan', 'Shandu', 'Orak', 'Nahla', 'Tonawa', 'Hamuul'],
    abilities: [
      { id: 'war_stomp', name: 'War Stomp', icon: '🦶', learn: 1, ranks: [1], cd: 120, stun: 2, cond: { inFight: true }, desc: 'Stuns the enemy for 2 sec.' },
    ],
  },
  {
    id: 'troll', name: 'Troll', faction: 'horde', icon: '🌴', start: 'durotar',
    classes: ['warrior', 'hunter', 'rogue', 'priest', 'shaman', 'mage'],
    stats: { agi: 2, spi: 1 },
    racial: { name: 'Regeneration & Berserking', desc: 'Health regeneration increased by 10%. Can go Berserk for extra speed.', fx: { regen: 0.1 } },
    look: { skin: '#5f8fb0', hair: '#d63b3b', leg: 54, torso: 56, width: 32, head: 15, hairStyle: 'mohawk', tusks: 'big', ears: 'long', hunch: 6 },
    names: ['Jinzo', 'Tazmaa', 'Zekri', 'Ka\'lan', 'Rozi', 'Mojo', 'Zalazane', 'Jandi', 'Vanjo', 'Zulbo'],
    abilities: [
      { id: 'berserking', name: 'Berserking', icon: '😤', learn: 1, ranks: [1], cd: 180, nogcd: true, buff: { dur: 10, fx: { haste: 0.15 } }, cond: { inFight: true }, desc: 'Increases attack and casting speed by 15% for 10 sec.' },
    ],
  },
];

// ---------------------------------------------------------------------
//  Classes
// ---------------------------------------------------------------------
const CLASSES = {
  // ===================================================================
  warrior: {
    id: 'warrior', name: 'Warrior', color: '#C79C6E', icon: '⚔️', resource: 'rage', main: 'str', auto: 'melee', swing: 1.8,
    armor: ['mail', 'plate'], weapons: ['sword', 'axe', 'mace', '2hsword', '2haxe', '2hmace'], offhands: ['shield', 'sword', 'axe', 'dagger'],
    base: { str: 23, agi: 20, sta: 22, int: 20, spi: 20 }, grow: { str: 2.0, agi: 1.3, sta: 1.9, int: 0.2, spi: 0.4 }, hpMult: 1.1,
    weights: { str: 2, agi: 1.2, sta: 1.5, int: 0, spi: 0.2, dmg: 3, armor: 0.25 },
    blurb: 'A master of arms who builds Rage by trading blows. Wears mail, then plate from level 40.',
    look: { main: '#9aa6b2', dark: '#6b7682', trim: '#e1b84a', tabard: '#a3282a', robe: false, head: 'helm', offhand: 'shield', weapon: 'sword', cloak: '#7a1d1d' },
    starter: [{ slot: 'weapon', name: 'Worn Shortsword', wtype: 'sword' }, { slot: 'chest', name: 'Recruit\'s Shirt' }],
    abilities: [
      { id: 'battle_shout', name: 'Battle Shout', icon: '📯', kind: 'aura', learn: 1, ranks: [1, 12, 22, 32, 42, 52, 60], fx: { melee: 0.08 }, desc: 'Increases the melee attack power of party members.' },
      { id: 'charge', name: 'Charge', icon: '🐂', kind: 'charge', learn: 4, ranks: [4, 26, 46], gain: { rage: 9 }, desc: 'Charge an enemy at the start of each fight, generating rage.' },
      { id: 'bloodrage', name: 'Bloodrage', icon: '💢', learn: 10, ranks: [10], cd: 60, nogcd: true, gain: { rage: 20 }, cond: { inFight: true, resBelow: 60 }, desc: 'Generates 20 rage.' },
      { id: 'last_stand', name: 'Last Stand', icon: '🏴', talent: true, ranks: [20], cd: 600, nogcd: true, healPct: 0.3, cond: { hpBelow: 0.25 }, desc: 'Grants 30% of your maximum health.' },
      { id: 'death_wish', name: 'Death Wish', icon: '☠️', talent: true, ranks: [30], cost: 10, cd: 180, nogcd: true, buff: { dur: 30, fx: { dmg: 0.2, dmgTaken: 0.1 } }, cond: { inFight: true }, desc: 'Increases physical damage by 20% for 30 sec, but you take more damage.' },
      { id: 'sweeping_strikes', name: 'Sweeping Strikes', icon: '🌀', talent: true, ranks: [20], cost: 30, cd: 30, buff: { dur: 10, fx: { melee: 0.1 } }, cond: { inFight: true, resAbove: 50 }, desc: 'Your melee attacks strike harder for 10 sec.' },
      { id: 'execute', name: 'Execute', icon: '🪓', learn: 24, ranks: [24, 32, 40, 48, 56], cost: 15, mult: 2.6, cond: { targetBelow: 0.2 }, desc: 'Attempt to finish off a wounded foe.' },
      { id: 'overpower', name: 'Overpower', icon: '💥', learn: 12, ranks: [12, 28, 44, 60], cost: 5, cd: 5, mult: 1.4, cond: { proc: 'overpower' }, desc: 'Instantly overpower the enemy after it dodges.' },
      { id: 'mortal_strike', name: 'Mortal Strike', icon: '💀', talent: true, ranks: [40, 48, 54, 60], cost: 30, cd: 6, mult: 1.9, desc: 'A vicious strike that deals weapon damage and wounds the target.' },
      { id: 'bloodthirst', name: 'Bloodthirst', icon: '🩸', talent: true, ranks: [40, 48, 54, 60], cost: 30, cd: 6, mult: 1.8, leech: 0.1, desc: 'Instantly attack the target and restore a little health.' },
      { id: 'shield_slam', name: 'Shield Slam', icon: '🛡️', talent: true, ranks: [40, 48, 54, 60], cost: 20, cd: 6, mult: 1.5, desc: 'Slam the target with your shield.' },
      { id: 'concussion_blow', name: 'Concussion Blow', icon: '💫', talent: true, ranks: [30], cost: 15, cd: 45, mult: 0.5, stun: 5, cond: { inFight: true }, desc: 'Stuns the opponent for 5 sec.' },
      { id: 'whirlwind', name: 'Whirlwind', icon: '🌪️', learn: 36, ranks: [36], cost: 25, cd: 10, mult: 1.5, desc: 'In a whirlwind of steel you attack all nearby enemies.' },
      { id: 'rend', name: 'Rend', icon: '🩸', learn: 4, ranks: [4, 10, 20, 30, 40, 50, 60], cost: 10, dot: { mult: 1.2, dur: 9 }, cond: { noDot: 'rend', targetAbove: 0.5 }, desc: 'Wounds the target, causing it to bleed.' },
      { id: 'heroic_strike', name: 'Heroic Strike', icon: '🗡️', learn: 1, ranks: [1, 8, 16, 24, 32, 40, 48, 56, 60], cost: 15, mult: 1.25, cond: { resAbove: 30 }, desc: 'A strong attack that increases melee damage.' },
    ],
  },
  // ===================================================================
  paladin: {
    id: 'paladin', name: 'Paladin', color: '#F58CBA', icon: '🔨', resource: 'mana', main: 'str', auto: 'melee', swing: 2.0,
    armor: ['mail', 'plate'], weapons: ['2hmace', '2hsword', 'mace', 'sword'], offhands: ['shield'],
    base: { str: 22, agi: 20, sta: 22, int: 20, spi: 21 }, grow: { str: 1.8, agi: 0.8, sta: 1.7, int: 0.9, spi: 0.9 }, hpMult: 1.08,
    weights: { str: 2, agi: 0.8, sta: 1.4, int: 0.8, spi: 0.4, dmg: 3, armor: 0.25 },
    blurb: 'A holy warrior who smites with the Light and heals between blows. Uses Mana. Mail, then plate from 40.',
    look: { main: '#d8dce2', dark: '#9aa0aa', trim: '#f5c542', tabard: '#3a5ab0', robe: false, head: 'crest', offhand: null, weapon: '2hmace', cloak: '#3a5ab0' },
    starter: [{ slot: 'weapon', name: 'Battleworn Hammer', wtype: '2hmace' }, { slot: 'chest', name: 'Squire\'s Vest' }],
    abilities: [
      { id: 'seal_of_righteousness', name: 'Seal of Righteousness', icon: '⚖️', kind: 'aura', learn: 1, ranks: [1, 10, 18, 26, 34, 42, 50, 58], fx: { white: 0.2 }, desc: 'Fills you with Holy spirit; your melee attacks deal extra Holy damage.' },
      { id: 'seal_of_command', name: 'Seal of Command', icon: '⚔️', kind: 'aura', talent: true, ranks: [20, 30, 40, 50, 60], fx: { extraAttack: 0.07 }, desc: 'Gives your melee attacks a chance to deal an extra Holy strike.' },
      { id: 'devotion_aura', name: 'Devotion Aura', icon: '🛡️', kind: 'aura', learn: 1, ranks: [1, 10, 20, 30, 40, 50, 60], fx: { armor: 0.15 }, desc: 'Increases the armor of party members.' },
      { id: 'blessing_of_might', name: 'Blessing of Might', icon: '💪', kind: 'aura', learn: 4, ranks: [4, 12, 22, 32, 42, 52, 60], fx: { melee: 0.08 }, replacedBy: 'blessing_of_kings', desc: 'Increases melee attack power.' },
      { id: 'blessing_of_kings', name: 'Blessing of Kings', icon: '👑', kind: 'aura', talent: true, ranks: [20], fx: { stat: { str: 0.1, agi: 0.1, sta: 0.1, int: 0.1, spi: 0.1 } }, desc: 'Increases total stats by 10%.' },
      { id: 'blessing_of_sanctuary', name: 'Blessing of Sanctuary', icon: '🏛️', kind: 'aura', talent: true, ranks: [30, 40, 50, 60], fx: { dmgTaken: -0.05, thorns: 0.12 }, desc: 'Reduces damage taken; attackers take Holy damage.' },
      { id: 'sanctity_aura', name: 'Sanctity Aura', icon: '🔆', kind: 'aura', talent: true, ranks: [30], fx: { school: { holy: 0.1 } }, desc: 'Increases Holy damage done by 10%.' },
      { id: 'lay_on_hands', name: 'Lay on Hands', icon: '🙌', learn: 10, ranks: [10, 30, 50], cd: 900, nogcd: true, healPct: 1, cond: { hpBelow: 0.15 }, school: 'holy', desc: 'Heals you for your maximum health.' },
      { id: 'divine_favor', name: 'Divine Favor', icon: '🌟', talent: true, ranks: [30], cd: 120, nogcd: true, buff: { dur: 20, fx: { crit: 1 }, oneShot: true }, cond: { hpBelow: 0.5 }, desc: 'Your next spell is a guaranteed critical effect.' },
      { id: 'holy_light', name: 'Holy Light', icon: '💛', learn: 1, ranks: [1, 6, 14, 22, 30, 38, 46, 54, 60], cost: 0.08, cast: 2.5, heal: 3.0, school: 'holy', cond: { hpBelow: 0.45 }, desc: 'Heals you with the Light.' },
      { id: 'holy_shield', name: 'Holy Shield', icon: '🛡️', talent: true, ranks: [40, 50, 60], cost: 0.05, cd: 10, buff: { dur: 10, fx: { dmgTaken: -0.25, thorns: 0.15 } }, school: 'holy', cond: { inFight: true, noBuff: 'holy_shield' }, desc: 'Increases your block chance and damages attackers for 10 sec.' },
      { id: 'hammer_of_justice', name: 'Hammer of Justice', icon: '🔨', learn: 8, ranks: [8, 24, 40, 54], cost: 0.05, cd: 60, stun: 3, school: 'holy', cond: { inFight: true, hpBelow: 0.7 }, desc: 'Stuns the target for 3 sec.' },
      { id: 'repentance', name: 'Repentance', icon: '🙇', talent: true, ranks: [40], cost: 0.06, cd: 60, stun: 6, school: 'holy', cond: { inFight: true, hpBelow: 0.6 }, desc: 'Incapacitates the enemy for up to 6 sec.' },
      { id: 'hammer_of_wrath', name: 'Hammer of Wrath', icon: '⚡', learn: 44, ranks: [44, 52, 60], cost: 0.08, cd: 6, cast: 1, mult: 2.2, school: 'holy', range: true, proj: 'holy', cond: { targetBelow: 0.2 }, desc: 'Hurls a hammer that strikes a wounded enemy.' },
      { id: 'holy_shock', name: 'Holy Shock', icon: '⚡', talent: true, ranks: [40, 48, 56], cost: 0.08, cd: 30, mult: 1.6, school: 'holy', range: true, proj: 'holy', desc: 'Blasts the target with Holy energy.' },
      { id: 'exorcism', name: 'Exorcism', icon: '✝️', learn: 20, ranks: [20, 28, 36, 44, 52, 60], cost: 0.07, cd: 15, mult: 2.0, school: 'holy', range: true, proj: 'holy', cond: { ctype: ['undead', 'demon'] }, desc: 'Causes Holy damage to an Undead or Demon target.' },
      { id: 'judgement', name: 'Judgement', icon: '⚖️', learn: 4, ranks: [4], cost: 0.05, cd: 8, mult: 1.4, school: 'holy', desc: 'Unleashes the energy of your Seal on the enemy.' },
      { id: 'consecration', name: 'Consecration', icon: '🔆', talent: true, ranks: [20, 30, 40, 50, 60], cost: 0.12, cd: 8, dot: { mult: 1.2, dur: 8, every: 2 }, school: 'holy', cond: { inFight: true, noDot: 'consecration', targetAbove: 0.3 }, desc: 'Consecrates the land beneath you, burning enemies.' },
    ],
  },
  // ===================================================================
  hunter: {
    id: 'hunter', name: 'Hunter', color: '#ABD473', icon: '🏹', resource: 'mana', main: 'agi', auto: 'ranged', swing: 2.0, ranged: true, whiteMult: 0.75,
    armor: ['leather', 'mail'], weapons: ['bow', 'gun', 'crossbow'], offhands: [],
    base: { str: 20, agi: 23, sta: 21, int: 20, spi: 21 }, grow: { str: 0.8, agi: 2.0, sta: 1.4, int: 0.9, spi: 0.9 }, hpMult: 1,
    weights: { str: 0.6, agi: 2, sta: 1.3, int: 0.6, spi: 0.4, dmg: 3, armor: 0.2 },
    blurb: 'A marksman who fights from range with a loyal beast at their side. Uses Mana. Leather, then mail from 40.',
    look: { main: '#5a7a3a', dark: '#3a5226', trim: '#c8a050', tabard: '#6a4a2a', robe: false, head: 'coif', offhand: null, weapon: 'bow', cloak: '#3a5226', quiver: true },
    starter: [{ slot: 'weapon', name: 'Worn Shortbow', wtype: 'bow' }, { slot: 'chest', name: 'Trapper\'s Shirt' }],
    abilities: [
      { id: 'aspect_of_the_hawk', name: 'Aspect of the Hawk', icon: '🦅', kind: 'aura', learn: 10, ranks: [10, 18, 28, 38, 48, 58], fx: { melee: 0.1 }, desc: 'Increases ranged attack power.' },
      { id: 'hunters_mark', name: 'Hunter\'s Mark', icon: '🎯', kind: 'aura', learn: 6, ranks: [6, 22, 40, 58], fx: { melee: 0.05 }, desc: 'Marks every target, increasing ranged attack power against it.' },
      { id: 'trueshot_aura', name: 'Trueshot Aura', icon: '🎯', kind: 'aura', talent: true, ranks: [40, 50, 60], fx: { melee: 0.06 }, desc: 'Increases attack power.' },
      { id: 'call_pet', name: 'Call Pet', icon: '🐾', kind: 'pet', pet: 'beast', learn: 10, ranks: [10], desc: 'Your tamed beast fights at your side.' },
      { id: 'bestial_wrath', name: 'Bestial Wrath', icon: '👹', talent: true, ranks: [40], cost: 0.08, cd: 120, nogcd: true, buff: { dur: 18, fx: { petDmg: 0.5 } }, cond: { inFight: true }, desc: 'Your pet deals 50% more damage for 18 sec.' },
      { id: 'rapid_fire', name: 'Rapid Fire', icon: '⏩', learn: 26, ranks: [26], cost: 0.08, cd: 300, nogcd: true, buff: { dur: 15, fx: { haste: 0.4 } }, cond: { inFight: true }, desc: 'Increases ranged attack speed by 40% for 15 sec.' },
      { id: 'deterrence', name: 'Deterrence', icon: '🛡️', talent: true, ranks: [20], cd: 300, nogcd: true, buff: { dur: 10, fx: { dodge: 0.25 } }, cond: { hpBelow: 0.4 }, desc: 'Increases your dodge chance by 25% for 10 sec.' },
      { id: 'intimidation', name: 'Intimidation', icon: '😨', talent: true, ranks: [30], cost: 0.06, cd: 60, stun: 3, cond: { inFight: true, hasPet: true }, desc: 'Your pet stuns the target for 3 sec.' },
      { id: 'scatter_shot', name: 'Scatter Shot', icon: '💨', talent: true, ranks: [30], cost: 0.06, cd: 30, mult: 0.5, stun: 4, proj: 'arrow', cond: { inFight: true, hpBelow: 0.6 }, desc: 'Deals 50% weapon damage and disorients the target.' },
      { id: 'wyvern_sting', name: 'Wyvern Sting', icon: '🐉', talent: true, ranks: [40, 50, 60], cost: 0.1, cd: 120, stun: 4, dot: { mult: 1.6, dur: 12 }, school: 'nature', range: true, proj: 'arrow', desc: 'Puts the target to sleep, then poisons it.' },
      { id: 'counterattack', name: 'Counterattack', icon: '↩️', talent: true, ranks: [30, 42, 54], cost: 0.03, cd: 5, mult: 0.9, stun: 1.5, cond: { proc: 'dodge' }, desc: 'A strike that becomes active after you parry.' },
      { id: 'aimed_shot', name: 'Aimed Shot', icon: '🏹', talent: true, ranks: [20, 28, 36, 44, 52, 60], cost: 0.1, cd: 6, cast: 3, mult: 2.4, range: true, proj: 'arrow', desc: 'An aimed shot that increases ranged damage.' },
      { id: 'multi_shot', name: 'Multi-Shot', icon: '🎇', learn: 18, ranks: [18, 30, 42, 54], cost: 0.08, cd: 10, mult: 1.1, range: true, proj: 'arrow', desc: 'Fires several missiles.' },
      { id: 'serpent_sting', name: 'Serpent Sting', icon: '🐍', learn: 4, ranks: [4, 10, 18, 26, 34, 42, 50, 58], cost: 0.05, dot: { mult: 1.5, dur: 15 }, school: 'nature', range: true, proj: 'arrow', cond: { noDot: 'serpent_sting', targetAbove: 0.5 }, desc: 'Stings the target, causing Nature damage over time.' },
      { id: 'arcane_shot', name: 'Arcane Shot', icon: '✴️', learn: 6, ranks: [6, 12, 20, 28, 36, 44, 52, 60], cost: 0.06, cd: 6, mult: 1.15, school: 'arcane', range: true, proj: 'arcane', desc: 'An instant shot that causes Arcane damage.' },
      { id: 'raptor_strike', name: 'Raptor Strike', icon: '🦖', learn: 1, ranks: [1, 8, 16, 24, 32, 40, 48, 56], cost: 0.03, cd: 6, mult: 1.0, desc: 'A strong attack that increases melee damage.' },
    ],
  },
  // ===================================================================
  rogue: {
    id: 'rogue', name: 'Rogue', color: '#FFF569', icon: '🗡️', resource: 'energy', main: 'agi', auto: 'melee', swing: 1.4, combo: true,
    armor: ['leather', 'leather'], weapons: ['dagger', 'sword'], offhands: ['dagger', 'sword'],
    base: { str: 21, agi: 23, sta: 21, int: 20, spi: 20 }, grow: { str: 1.0, agi: 2.0, sta: 1.2, int: 0.3, spi: 0.4 }, hpMult: 1,
    weights: { str: 0.8, agi: 2, sta: 1.3, int: 0, spi: 0.2, dmg: 3, armor: 0.2 },
    blurb: 'A deadly duelist who builds combo points and unleashes finishing moves. Uses Energy. Wears leather.',
    look: { main: '#3a3038', dark: '#221c22', trim: '#8a6a9a', tabard: '#4a3a4a', robe: false, head: 'mask', offhand: 'dagger', weapon: 'dagger', cloak: '#2a222a' },
    starter: [{ slot: 'weapon', name: 'Worn Dagger', wtype: 'dagger' }, { slot: 'chest', name: 'Footpad\'s Shirt' }],
    abilities: [
      { id: 'instant_poison', name: 'Instant Poison', icon: '🧪', kind: 'aura', learn: 20, ranks: [20, 28, 36, 44, 52, 60], fx: { poison: 0.2 }, desc: 'Coats your weapons; hits have a chance to deal Nature damage.' },
      { id: 'premeditation', name: 'Premeditation', icon: '🧠', talent: true, ranks: [40], cd: 60, nogcd: true, gain: { cp: 2 }, cond: { opener: true }, desc: 'Adds 2 combo points at the start of a fight.' },
      { id: 'preparation', name: 'Preparation', icon: '⏳', talent: true, ranks: [30], cd: 600, nogcd: true, resetCds: true, cond: { inFight: true, hpBelow: 0.4 }, desc: 'Finishes the cooldown of your other abilities.' },
      { id: 'evasion', name: 'Evasion', icon: '💨', learn: 8, ranks: [8], cd: 300, nogcd: true, buff: { dur: 15, fx: { dodge: 0.5 } }, cond: { hpBelow: 0.5, inFight: true }, desc: 'Increases your dodge chance by 50% for 15 sec.' },
      { id: 'cold_blood', name: 'Cold Blood', icon: '🧊', talent: true, ranks: [30], cd: 180, nogcd: true, buff: { dur: 30, fx: { crit: 1 }, oneShot: true }, cond: { combo: 4 }, desc: 'Your next offensive ability is a critical strike.' },
      { id: 'adrenaline_rush', name: 'Adrenaline Rush', icon: '💉', talent: true, ranks: [40], cd: 300, nogcd: true, buff: { dur: 15, fx: { resGen: 1 } }, cond: { inFight: true }, desc: 'Doubles your Energy regeneration for 15 sec.' },
      { id: 'blade_flurry', name: 'Blade Flurry', icon: '🌀', talent: true, ranks: [30], cost: 25, cd: 120, nogcd: true, buff: { dur: 15, fx: { haste: 0.2 } }, cond: { inFight: true }, desc: 'Increases your attack speed by 20% for 15 sec.' },
      { id: 'slice_and_dice', name: 'Slice and Dice', icon: '🔪', learn: 10, ranks: [10, 42], cost: 25, finisher: true, buff: { dur: 9, perCp: 3, fx: { haste: 0.2 } }, cond: { combo: 2, noBuff: 'slice_and_dice', targetAbove: 0.5 }, desc: 'Finishing move that increases attack speed by 20%.' },
      { id: 'rupture', name: 'Rupture', icon: '🩸', learn: 20, ranks: [20, 28, 36, 44, 52, 60], cost: 25, finisher: true, dot: { mult: 2.4, dur: 12 }, cond: { combo: 4, noDot: 'rupture', targetAbove: 0.6 }, desc: 'Finishing move that causes the target to bleed.' },
      { id: 'eviscerate', name: 'Eviscerate', icon: '🗡️', learn: 1, ranks: [1, 8, 16, 24, 32, 40, 48, 56, 60], cost: 35, finisher: true, mult: 3.0, cond: { combo: 4 }, desc: 'Finishing move that causes damage per combo point.' },
      { id: 'riposte', name: 'Riposte', icon: '↩️', talent: true, ranks: [20], cost: 10, cd: 6, mult: 1.5, cond: { proc: 'dodge' }, desc: 'A strike that becomes active after you parry.' },
      { id: 'backstab', name: 'Backstab', icon: '🔪', learn: 4, ranks: [4, 12, 20, 28, 36, 44, 52, 60], cost: 60, mult: 1.9, cp: 1, cond: { opener: true }, desc: 'Backstab the target from behind. Awards 1 combo point.' },
      { id: 'ghostly_strike', name: 'Ghostly Strike', icon: '👻', talent: true, ranks: [20], cost: 40, cd: 20, mult: 1.25, cp: 1, buff: { dur: 7, fx: { dodge: 0.15 } }, desc: 'Deals weapon damage and increases your dodge. Awards 1 combo point.' },
      { id: 'kick', name: 'Kick', icon: '🦶', learn: 12, ranks: [12, 26, 42, 58], cost: 25, cd: 10, mult: 0.2, stun: 1, cond: { inFight: true, ctype: ['humanoid', 'demon', 'undead'] }, desc: 'Interrupts the enemy.' },
      { id: 'hemorrhage', name: 'Hemorrhage', icon: '🩸', talent: true, ranks: [30, 46, 58], cost: 35, mult: 1.2, cp: 1, desc: 'An instant strike that makes the target bleed. Awards 1 combo point.' },
      { id: 'sinister_strike', name: 'Sinister Strike', icon: '🗡️', learn: 1, ranks: [1, 6, 14, 22, 30, 38, 46, 54], cost: 45, mult: 1.3, cp: 1, desc: 'An instant strike. Awards 1 combo point.' },
    ],
  },
  // ===================================================================
  priest: {
    id: 'priest', name: 'Priest', color: '#FFFFFF', icon: '✨', resource: 'mana', main: 'int', auto: 'wand', swing: 1.5, ranged: true,
    armor: ['cloth', 'cloth'], weapons: ['staff', 'mace', 'dagger'], offhands: ['held'],
    base: { str: 20, agi: 20, sta: 20, int: 22, spi: 23 }, grow: { str: 0.3, agi: 0.3, sta: 0.8, int: 1.9, spi: 2.0 }, hpMult: 0.92,
    weights: { str: 0, agi: 0, sta: 1.3, int: 2, spi: 1.2, dmg: 2, armor: 0.2 },
    blurb: 'A healer who wields the Holy Light or the Shadow. Shields and heals themselves through any fight. Wears cloth.',
    look: { main: '#ece6d6', dark: '#b8ad94', trim: '#e6c068', tabard: '#e6c068', robe: true, head: 'cowl', offhand: null, weapon: 'staff', orb: '#ffe47a' },
    starter: [{ slot: 'weapon', name: 'Bent Staff', wtype: 'staff' }, { slot: 'chest', name: 'Neophyte\'s Robe' }],
    abilities: [
      { id: 'power_word_fortitude', name: 'Power Word: Fortitude', icon: '💪', kind: 'aura', learn: 1, ranks: [1, 12, 24, 36, 48, 60], fx: { stat: { sta: 0.1 } }, desc: 'Increases Stamina.' },
      { id: 'inner_fire', name: 'Inner Fire', icon: '🔥', kind: 'aura', learn: 12, ranks: [12, 20, 30, 40, 50, 60], fx: { armor: 0.3 }, desc: 'Increases armor.' },
      { id: 'shadowform', name: 'Shadowform', icon: '👤', kind: 'aura', talent: true, ranks: [40], form: 'shadowform', fx: { school: { shadow: 0.15 }, dmgTaken: -0.15 }, desc: 'Increases Shadow damage by 15% and reduces physical damage taken. You may not cast Holy spells.' },
      { id: 'vampiric_embrace', name: 'Vampiric Embrace', icon: '🧛', kind: 'aura', talent: true, ranks: [30], fx: { leech: 0.2 }, desc: 'You are healed for 20% of your Shadow damage.' },
      { id: 'power_word_shield', name: 'Power Word: Shield', icon: '🛡️', learn: 6, ranks: [6, 12, 18, 24, 30, 36, 42, 48, 54, 60], cost: 0.1, cd: 15, shield: 2.2, school: 'holy', cond: { inFight: true, noBuff: 'power_word_shield' }, desc: 'Absorbs damage. Weakened Soul prevents reuse for 15 sec.' },
      { id: 'inner_focus', name: 'Inner Focus', icon: '🧘', talent: true, ranks: [20], cd: 180, nogcd: true, buff: { dur: 30, fx: { free: 1, crit: 0.25 }, oneShot: true }, cond: { inFight: true }, desc: 'Your next spell costs no mana and has 25% more critical chance.' },
      { id: 'power_infusion', name: 'Power Infusion', icon: '✨', talent: true, ranks: [40], cost: 0.08, cd: 180, nogcd: true, buff: { dur: 15, fx: { dmg: 0.2, heal: 0.2 } }, cond: { inFight: true }, desc: 'Increases spell damage and healing by 20% for 15 sec.' },
      { id: 'lesser_heal', name: 'Lesser Heal', names: [[1, 'Lesser Heal'], [16, 'Heal'], [40, 'Greater Heal']], icon: '💚', learn: 1, ranks: [1, 4, 10, 16, 22, 28, 34, 40, 46, 52, 58, 60], cost: 0.12, cast: 2.5, heal: 3.0, school: 'holy', cond: { hpBelow: 0.45 }, desc: 'Heals you.' },
      { id: 'renew', name: 'Renew', icon: '🌿', learn: 8, ranks: [8, 14, 20, 26, 32, 38, 44, 50, 56, 60], cost: 0.07, hot: { heal: 1.8, dur: 15 }, school: 'holy', cond: { hpBelow: 0.7, noBuff: 'renew' }, desc: 'Heals you over 15 sec.' },
      { id: 'lightwell', name: 'Lightwell', icon: '🕯️', talent: true, ranks: [40, 50, 60], cost: 0.12, cd: 300, hot: { heal: 3, dur: 10 }, school: 'holy', cond: { hpBelow: 0.5 }, desc: 'Creates a holy Lightwell that heals you over 10 sec.' },
      { id: 'silence', name: 'Silence', icon: '🤐', talent: true, ranks: [30], cost: 0.05, cd: 45, stun: 3, school: 'shadow', cond: { inFight: true, ctype: ['humanoid', 'demon', 'undead', 'dragonkin'] }, desc: 'Silences the target.' },
      { id: 'holy_nova', name: 'Holy Nova', icon: '💫', talent: true, ranks: [20, 28, 36, 44, 52, 60], cost: 0.12, cd: 6, mult: 0.9, heal: 0.6, school: 'holy', cond: { inFight: true, notForm: 'shadowform' }, desc: 'An explosion of holy light that damages enemies and heals you.' },
      { id: 'shadow_word_pain', name: 'Shadow Word: Pain', icon: '💀', learn: 4, ranks: [4, 10, 18, 26, 34, 42, 50, 58], cost: 0.06, dot: { mult: 1.8, dur: 18 }, school: 'shadow', range: true, cond: { noDot: 'shadow_word_pain', targetAbove: 0.4 }, desc: 'A word of darkness that causes Shadow damage over time.' },
      { id: 'mind_blast', name: 'Mind Blast', icon: '🧠', learn: 10, ranks: [10, 16, 22, 28, 34, 40, 46, 52, 58], cost: 0.1, cd: 8, cast: 1.5, mult: 2.2, school: 'shadow', range: true, proj: 'shadowbolt', desc: 'Blasts the target for Shadow damage.' },
      { id: 'mind_flay', name: 'Mind Flay', icon: '🌀', talent: true, ranks: [20, 28, 36, 44, 52, 60], cost: 0.07, cast: 2.5, mult: 3.0, school: 'shadow', range: true, proj: 'shadowbolt', desc: 'Assaults the target\'s mind with Shadow energy.' },
      { id: 'holy_fire', name: 'Holy Fire', icon: '🔥', learn: 20, ranks: [20, 24, 30, 36, 42, 48, 54, 60], cost: 0.11, cd: 10, cast: 2.5, mult: 2.0, dot: { mult: 0.5, dur: 10 }, school: 'holy', range: true, proj: 'holy', cond: { notForm: 'shadowform', noDot: 'holy_fire' }, desc: 'Consumes the enemy in Holy flames.' },
      { id: 'smite', name: 'Smite', icon: '☀️', learn: 1, ranks: [1, 6, 14, 22, 30, 38, 46, 54], cost: 0.08, cast: 2, mult: 2.5, school: 'holy', range: true, proj: 'holy', cond: { notForm: 'shadowform' }, desc: 'Smite an enemy for Holy damage.' },
    ],
  },
  // ===================================================================
  shaman: {
    id: 'shaman', name: 'Shaman', color: '#0070DE', icon: '⚡', resource: 'mana', main: 'str', auto: 'melee', swing: 2.0,
    armor: ['leather', 'mail'], weapons: ['mace', '2hmace', 'staff', 'axe', '2haxe'], offhands: ['shield'],
    base: { str: 21, agi: 20, sta: 21, int: 21, spi: 22 }, grow: { str: 1.4, agi: 0.6, sta: 1.5, int: 1.2, spi: 1.3 }, hpMult: 1.04,
    weights: { str: 1.8, agi: 0.8, sta: 1.4, int: 1.0, spi: 0.6, dmg: 3, armor: 0.22 },
    blurb: 'A spiritual guide who calls on the elements: shocks, totems and lightning. Uses Mana. Leather, then mail from 40.',
    look: { main: '#2a5a9a', dark: '#1a3a6a', trim: '#c8a050', tabard: '#6a4a2a', robe: false, head: 'feathers', offhand: null, weapon: 'mace', cloak: '#1a3a6a', totem: true },
    starter: [{ slot: 'weapon', name: 'Primitive Mace', wtype: 'mace' }, { slot: 'chest', name: 'Primitive Mantle' }],
    abilities: [
      { id: 'rockbiter_weapon', name: 'Rockbiter Weapon', icon: '🪨', kind: 'aura', learn: 1, ranks: [1, 8, 16, 24, 34, 44, 54], fx: { white: 0.15 }, replacedBy: 'windfury_weapon', desc: 'Imbues your weapon with the power of earth.' },
      { id: 'windfury_weapon', name: 'Windfury Weapon', icon: '🌬️', kind: 'aura', learn: 30, ranks: [30, 40, 50, 60], fx: { extraAttack: 0.2 }, desc: 'Each hit has a 20% chance of granting an extra attack.' },
      { id: 'lightning_shield', name: 'Lightning Shield', icon: '⚡', kind: 'aura', learn: 8, ranks: [8, 16, 24, 32, 40, 48, 56], fx: { thorns: 0.25 }, desc: 'Charged orbs strike back at attackers.' },
      { id: 'strength_of_earth', name: 'Strength of Earth Totem', icon: '🗿', kind: 'aura', learn: 10, ranks: [10, 24, 38, 52, 60], fx: { stat: { str: 0.08 } }, desc: 'A totem that increases Strength.' },
      { id: 'elemental_mastery', name: 'Elemental Mastery', icon: '🌟', talent: true, ranks: [40], cd: 180, nogcd: true, buff: { dur: 30, fx: { free: 1, crit: 1 }, oneShot: true }, cond: { inFight: true }, desc: 'Your next spell is a free critical strike.' },
      { id: 'natures_swiftness', name: 'Nature\'s Swiftness', icon: '🍃', talent: true, ranks: [30], cd: 180, nogcd: true, buff: { dur: 30, fx: { instant: 1 }, oneShot: true }, cond: { hpBelow: 0.4 }, desc: 'Your next spell becomes instant.' },
      { id: 'mana_tide', name: 'Mana Tide Totem', icon: '🌊', talent: true, ranks: [40, 48, 58], cd: 300, nogcd: true, gain: { mana: 0.3 }, cond: { manaBelow: 0.4 }, desc: 'Restores mana.' },
      { id: 'healing_wave', name: 'Healing Wave', icon: '🌊', learn: 1, ranks: [1, 6, 12, 18, 24, 32, 40, 48, 56, 60], cost: 0.12, cast: 2.5, heal: 3.0, school: 'nature', cond: { hpBelow: 0.45 }, desc: 'Heals you with a wave of water.' },
      { id: 'stormstrike', name: 'Stormstrike', icon: '⛈️', talent: true, ranks: [40], cost: 0.06, cd: 20, mult: 1.7, desc: 'Gives you an extra attack and empowers Nature damage.' },
      { id: 'flame_shock', name: 'Flame Shock', icon: '🔥', learn: 10, ranks: [10, 18, 28, 40, 52], cost: 0.08, cd: 6, cdGroup: 'shock', mult: 0.6, dot: { mult: 1.2, dur: 12 }, school: 'fire', range: true, cond: { noDot: 'flame_shock', targetAbove: 0.5 }, desc: 'Instantly sears the target with fire.' },
      { id: 'earth_shock', name: 'Earth Shock', icon: '🌍', learn: 4, ranks: [4, 8, 14, 24, 36, 48, 60], cost: 0.07, cd: 6, cdGroup: 'shock', mult: 1.5, school: 'nature', range: true, desc: 'Instantly shocks the target with concussive force.' },
      { id: 'searing_totem', name: 'Searing Totem', icon: '🔥', learn: 10, ranks: [10, 20, 30, 40, 50, 60], cost: 0.05, dot: { mult: 1.4, dur: 15, every: 2.5 }, school: 'fire', range: true, cond: { noDot: 'searing_totem', targetAbove: 0.5 }, desc: 'Summons a totem that attacks enemies with fire.' },
      { id: 'chain_lightning', name: 'Chain Lightning', icon: '🌩️', learn: 32, ranks: [32, 40, 48, 56], cost: 0.1, cd: 6, cast: 2.5, mult: 2.1, school: 'nature', range: true, proj: 'lightning', cond: { spec: 'Elemental' }, desc: 'Hurls a lightning bolt that jumps between targets.' },
      { id: 'lightning_bolt', name: 'Lightning Bolt', icon: '⚡', learn: 1, ranks: [1, 8, 14, 20, 26, 32, 38, 44, 50, 56], cost: 0.08, cast: 2, mult: 2.3, school: 'nature', range: true, proj: 'lightning', cond: { pullOrSpec: 'Elemental' }, desc: 'Casts a bolt of lightning at the target.' },
    ],
  },
  // ===================================================================
  mage: {
    id: 'mage', name: 'Mage', color: '#69CCF0', icon: '🔮', resource: 'mana', main: 'int', auto: 'wand', swing: 1.5, ranged: true,
    armor: ['cloth', 'cloth'], weapons: ['staff', 'dagger', 'sword'], offhands: ['held'],
    base: { str: 20, agi: 20, sta: 20, int: 23, spi: 22 }, grow: { str: 0.2, agi: 0.3, sta: 0.7, int: 2.1, spi: 1.8 }, hpMult: 0.9,
    weights: { str: 0, agi: 0, sta: 1.2, int: 2, spi: 1, dmg: 2, armor: 0.2 },
    blurb: 'A wielder of Arcane, Fire and Frost who blasts foes from afar. Uses Mana. Wears cloth.',
    look: { main: '#5a4ab0', dark: '#3a2a80', trim: '#e6c068', tabard: '#e6c068', robe: true, head: 'hat', offhand: null, weapon: 'staff', orb: '#8ad8ff' },
    starter: [{ slot: 'weapon', name: 'Bent Staff', wtype: 'staff' }, { slot: 'chest', name: 'Apprentice\'s Robe' }],
    abilities: [
      { id: 'arcane_intellect', name: 'Arcane Intellect', icon: '🧠', kind: 'aura', learn: 1, ranks: [1, 14, 28, 42, 56], fx: { stat: { int: 0.1 } }, desc: 'Increases Intellect.' },
      { id: 'frost_armor', name: 'Frost Armor', names: [[1, 'Frost Armor'], [30, 'Ice Armor']], icon: '❄️', kind: 'aura', learn: 1, ranks: [1, 10, 20, 30, 40, 50, 60], fx: { armor: 0.3 }, desc: 'Increases armor.' },
      { id: 'evocation', name: 'Evocation', icon: '🌀', learn: 20, ranks: [20], cd: 480, cast: 6, gain: { mana: 0.6 }, cond: { manaBelow: 0.12 }, desc: 'Regain 60% of your mana while channeling.' },
      { id: 'ice_block', name: 'Ice Block', icon: '🧊', talent: true, ranks: [30], cd: 300, nogcd: true, buff: { dur: 10, fx: { dmgTaken: -1 } }, cond: { hpBelow: 0.2 }, desc: 'You become immune to all attacks for 10 sec.' },
      { id: 'ice_barrier', name: 'Ice Barrier', icon: '🛡️', talent: true, ranks: [40, 46, 52, 58], cost: 0.12, cd: 30, shield: 3, school: 'frost', cond: { inFight: true, noBuff: 'ice_barrier' }, desc: 'Instantly shields you, absorbing damage.' },
      { id: 'mana_shield', name: 'Mana Shield', icon: '🔵', learn: 20, ranks: [20, 28, 36, 44, 52, 60], cost: 0.12, cd: 12, shield: 2, school: 'arcane', cond: { inFight: true, hpBelow: 0.6, noBuff: 'mana_shield' }, desc: 'Absorbs damage, draining mana instead.' },
      { id: 'arcane_power', name: 'Arcane Power', icon: '⚡', talent: true, ranks: [40], cd: 180, nogcd: true, buff: { dur: 15, fx: { spell: 0.3 } }, cond: { inFight: true }, desc: 'Your spells deal 30% more damage for 15 sec.' },
      { id: 'combustion', name: 'Combustion', icon: '🌋', talent: true, ranks: [40], cd: 180, nogcd: true, buff: { dur: 15, fx: { critSchool: { fire: 0.3 } } }, cond: { inFight: true }, desc: 'Increases the critical strike chance of your Fire spells.' },
      { id: 'presence_of_mind', name: 'Presence of Mind', icon: '⏱️', talent: true, ranks: [30], cd: 180, nogcd: true, buff: { dur: 30, fx: { instant: 1 }, oneShot: true }, cond: { inFight: true }, desc: 'Your next spell becomes instant.' },
      { id: 'pyroblast', name: 'Pyroblast', icon: '☄️', talent: true, ranks: [20, 24, 30, 36, 42, 48, 54, 60], cost: 0.14, cast: 4.5, mult: 5, dot: { mult: 0.6, dur: 12 }, school: 'fire', range: true, proj: 'fireball', cond: { opener: true }, desc: 'Hurls an immense fiery boulder. Used to open a fight.' },
      { id: 'frost_nova', name: 'Frost Nova', icon: '❄️', learn: 10, ranks: [10, 26, 40, 54], cost: 0.06, cd: 25, mult: 0.2, stun: 4, school: 'frost', cond: { inFight: true, hpBelow: 0.75 }, desc: 'Freezes the enemy in place.' },
      { id: 'blast_wave', name: 'Blast Wave', icon: '🌊', talent: true, ranks: [30, 36, 44, 52, 60], cost: 0.12, cd: 45, mult: 1.6, stun: 1.5, school: 'fire', cond: { inFight: true }, desc: 'A wave of flame radiates outward from you.' },
      { id: 'fire_blast', name: 'Fire Blast', icon: '💥', learn: 6, ranks: [6, 14, 22, 30, 38, 46, 54], cost: 0.08, cd: 8, mult: 1.3, school: 'fire', range: true, desc: 'Blasts the enemy for Fire damage.' },
      { id: 'arcane_missiles', name: 'Arcane Missiles', icon: '✨', learn: 8, ranks: [8, 16, 24, 32, 40, 48, 56], cost: 0.12, cast: 3, mult: 3.7, school: 'arcane', range: true, proj: 'arcane', cond: { spec: 'Arcane' }, desc: 'Launches Arcane Missiles at the enemy.' },
      { id: 'frostbolt', name: 'Frostbolt', icon: '🧊', learn: 4, ranks: [4, 8, 14, 20, 26, 32, 38, 44, 50, 56], cost: 0.08, cast: 2, mult: 2.7, school: 'frost', range: true, proj: 'frostbolt', cond: { spec: 'Frost' }, desc: 'Launches a bolt of frost at the enemy.' },
      { id: 'fireball', name: 'Fireball', icon: '🔥', learn: 1, ranks: [1, 6, 12, 18, 24, 30, 36, 42, 48, 54, 60], cost: 0.09, cast: 2.5, mult: 3.0, dot: { mult: 0.25, dur: 8, every: 2 }, school: 'fire', range: true, proj: 'fireball', desc: 'Hurls a fiery ball that causes Fire damage.' },
    ],
  },
  // ===================================================================
  warlock: {
    id: 'warlock', name: 'Warlock', color: '#9482C9', icon: '😈', resource: 'mana', main: 'int', auto: 'wand', swing: 1.5, ranged: true,
    armor: ['cloth', 'cloth'], weapons: ['staff', 'dagger', 'sword'], offhands: ['held'],
    base: { str: 20, agi: 20, sta: 21, int: 22, spi: 22 }, grow: { str: 0.4, agi: 0.4, sta: 1.0, int: 1.9, spi: 1.9 }, hpMult: 0.95,
    weights: { str: 0, agi: 0, sta: 1.4, int: 2, spi: 1, dmg: 2, armor: 0.2 },
    blurb: 'A master of curses and demons who drains the life of their foes. Uses Mana. Wears cloth.',
    look: { main: '#4a2a5a', dark: '#2a163a', trim: '#7aff5a', tabard: '#7aff5a', robe: true, head: 'horned', offhand: null, weapon: 'staff', orb: '#7aff5a' },
    starter: [{ slot: 'weapon', name: 'Bent Staff', wtype: 'staff' }, { slot: 'chest', name: 'Acolyte\'s Robe' }],
    abilities: [
      { id: 'demon_skin', name: 'Demon Skin', names: [[1, 'Demon Skin'], [20, 'Demon Armor']], icon: '😈', kind: 'aura', learn: 1, ranks: [1, 10, 20, 30, 40, 50, 60], fx: { armor: 0.3, regen: 0.2 }, desc: 'Increases armor and health regeneration.' },
      { id: 'summon_imp', name: 'Summon Imp', icon: '👺', kind: 'pet', pet: 'imp', learn: 1, ranks: [1], desc: 'Summons an Imp that hurls Firebolts.' },
      { id: 'summon_voidwalker', name: 'Summon Voidwalker', icon: '👤', kind: 'pet', pet: 'voidwalker', learn: 10, ranks: [10], desc: 'Summons a Voidwalker that shields you from harm.' },
      { id: 'demonic_sacrifice', name: 'Demonic Sacrifice', icon: '🔪', kind: 'aura', talent: true, ranks: [30], nopet: true, replacedBy: 'soul_link', fx: { school: { shadow: 0.15 } }, desc: 'Sacrifice your demon: your Shadow damage is increased by 15%.' },
      { id: 'soul_link', name: 'Soul Link', icon: '🔗', kind: 'aura', talent: true, ranks: [40], fx: { dmgTaken: -0.2 }, desc: '20% of the damage you take is taken by your demon instead.' },
      { id: 'drain_life', name: 'Drain Life', icon: '🩸', learn: 14, ranks: [14, 22, 30, 38, 46, 54], cost: 0.1, cast: 4, mult: 1.6, leech: 1, school: 'shadow', range: true, proj: 'drain', cond: { hpBelow: 0.45 }, desc: 'Drains the health of the target, healing you.' },
      { id: 'life_tap', name: 'Life Tap', icon: '💉', learn: 6, ranks: [6, 16, 26, 36, 46, 56], nogcd: true, cd: 3, hpCost: 0.08, gain: { mana: 0.12 }, cond: { manaBelow: 0.3, hpAbove: 0.6 }, desc: 'Converts health into mana.' },
      { id: 'dark_pact', name: 'Dark Pact', icon: '🤝', talent: true, ranks: [40, 50, 60], cd: 20, nogcd: true, gain: { mana: 0.15 }, cond: { manaBelow: 0.3, hasPet: true }, desc: 'Drains mana from your pet, returning it to you.' },
      { id: 'shadowburn', name: 'Shadowburn', icon: '🔥', talent: true, ranks: [20, 24, 32, 40, 48, 56], cost: 0.1, cd: 15, mult: 1.8, school: 'shadow', range: true, cond: { targetBelow: 0.3 }, desc: 'Instantly blasts the target for Shadow damage.' },
      { id: 'conflagrate', name: 'Conflagrate', icon: '💥', talent: true, ranks: [40, 48, 54, 60], cost: 0.1, cd: 10, mult: 1.8, school: 'fire', range: true, consumeDot: 'immolate', cond: { hasDot: 'immolate' }, desc: 'Ignites a target afflicted by Immolate.' },
      { id: 'corruption', name: 'Corruption', icon: '💀', learn: 4, ranks: [4, 14, 24, 34, 44, 54], cost: 0.07, cast: 2, dot: { mult: 1.8, dur: 18 }, school: 'shadow', range: true, cond: { noDot: 'corruption', targetAbove: 0.4 }, desc: 'Corrupts the target, causing Shadow damage over time.' },
      { id: 'curse_of_agony', name: 'Curse of Agony', icon: '😖', learn: 8, ranks: [8, 18, 28, 38, 48, 58], cost: 0.06, dot: { mult: 2.0, dur: 24 }, school: 'shadow', range: true, cond: { noDot: 'curse_of_agony', targetAbove: 0.5 }, desc: 'Curses the target with agony.' },
      { id: 'siphon_life', name: 'Siphon Life', icon: '🩸', talent: true, ranks: [30, 38, 48, 58], cost: 0.08, dot: { mult: 1.2, dur: 30, leech: 1 }, school: 'shadow', range: true, cond: { noDot: 'siphon_life', targetAbove: 0.5 }, desc: 'Transfers health from the target to you.' },
      { id: 'immolate', name: 'Immolate', icon: '🔥', learn: 1, ranks: [1, 10, 20, 30, 40, 50, 60], cost: 0.08, cast: 2, mult: 0.7, dot: { mult: 1.2, dur: 15 }, school: 'fire', range: true, cond: { noDot: 'immolate', targetAbove: 0.4 }, desc: 'Burns the enemy for Fire damage and more over time.' },
      { id: 'shadow_bolt', name: 'Shadow Bolt', icon: '🌑', learn: 1, ranks: [1, 6, 12, 20, 28, 36, 44, 52, 60], cost: 0.09, cast: 2.5, mult: 3.1, school: 'shadow', range: true, proj: 'shadowbolt', desc: 'Sends a shadowy bolt at the enemy.' },
    ],
  },
  // ===================================================================
  druid: {
    id: 'druid', name: 'Druid', color: '#FF7D0A', icon: '🐾', resource: 'mana', main: 'int', auto: 'wand', swing: 1.5, ranged: true,
    armor: ['leather', 'leather'], weapons: ['staff', '2hmace', 'mace', 'dagger'], offhands: ['held'],
    base: { str: 21, agi: 20, sta: 20, int: 22, spi: 22 }, grow: { str: 1.4, agi: 0.9, sta: 1.2, int: 1.8, spi: 1.5 }, hpMult: 1,
    weights: { str: 1.2, agi: 0.8, sta: 1.4, int: 1.6, spi: 0.9, dmg: 2.5, armor: 0.2 },
    blurb: 'A shapeshifter of the wild: a caster of Moonfire and Wrath, or a stalking cat when Feral. Uses Mana (Energy in Cat Form). Wears leather.',
    look: { main: '#6a4a2a', dark: '#4a321a', trim: '#7aa83a', tabard: '#3a6a2a', robe: false, head: 'antlers', offhand: null, weapon: 'staff', orb: '#8aff6a', cloak: '#3a6a2a' },
    starter: [{ slot: 'weapon', name: 'Gnarled Staff', wtype: 'staff' }, { slot: 'chest', name: 'Rugged Leather Vest' }],
    abilities: [
      { id: 'mark_of_the_wild', name: 'Mark of the Wild', icon: '🐾', kind: 'aura', learn: 1, ranks: [1, 10, 20, 30, 40, 50, 60], fx: { stat: { str: 0.05, agi: 0.05, sta: 0.05, int: 0.05, spi: 0.05 }, armor: 0.1 }, desc: 'Increases armor and all attributes.' },
      { id: 'thorns', name: 'Thorns', icon: '🌵', kind: 'aura', learn: 6, ranks: [6, 14, 24, 34, 44, 54], fx: { thorns: 0.15 }, desc: 'Thorns sprout from you, damaging attackers.' },
      { id: 'cat_form', name: 'Cat Form', icon: '🐈', kind: 'form', learn: 20, ranks: [20], desc: 'Shapeshift into a cat when Feral Combat is your specialization. Uses Energy and combo points.' },
      { id: 'moonkin_form', name: 'Moonkin Form', icon: '🦉', kind: 'aura', talent: true, ranks: [40], form: 'caster', fx: { spellCrit: 0.03, armor: 0.5 }, desc: 'Increases armor and spell critical chance.' },
      { id: 'leader_of_the_pack', name: 'Leader of the Pack', icon: '🐺', kind: 'aura', talent: true, ranks: [40], form: 'cat', fx: { meleeCrit: 0.03 }, desc: 'Increases critical chance by 3% in Cat Form.' },
      { id: 'natures_swiftness', name: 'Nature\'s Swiftness', icon: '🍃', talent: true, ranks: [30], cd: 180, nogcd: true, buff: { dur: 30, fx: { instant: 1 }, oneShot: true }, cond: { hpBelow: 0.4 }, desc: 'Your next Nature spell becomes instant.' },
      { id: 'swiftmend', name: 'Swiftmend', icon: '🌿', talent: true, ranks: [40], cost: 0.08, cd: 15, heal: 2, school: 'nature', cond: { hasBuff: 'rejuvenation', hpBelow: 0.6 }, desc: 'Consumes Rejuvenation to instantly heal you.' },
      { id: 'healing_touch', name: 'Healing Touch', icon: '💚', learn: 1, ranks: [1, 8, 14, 20, 26, 32, 38, 44, 50, 56, 60], cost: 0.14, cast: 3, heal: 3.4, school: 'nature', cond: { hpBelow: 0.4 }, desc: 'Heals you.' },
      { id: 'rejuvenation', name: 'Rejuvenation', icon: '🌿', learn: 4, ranks: [4, 10, 16, 22, 28, 34, 40, 46, 52, 58, 60], cost: 0.08, hot: { heal: 2, dur: 12 }, school: 'nature', cond: { hpBelow: 0.7, noBuff: 'rejuvenation' }, desc: 'Heals you over 12 sec.' },
      // ---- Cat Form ----
      { id: 'rip', name: 'Rip', icon: '🩸', learn: 20, ranks: [20, 28, 36, 44, 52, 60], form: 'cat', cost: 30, finisher: true, dot: { mult: 2.4, dur: 12 }, cond: { combo: 4, noDot: 'rip', targetAbove: 0.6 }, desc: 'Finishing move that causes the target to bleed.' },
      { id: 'ferocious_bite', name: 'Ferocious Bite', icon: '🦷', learn: 32, ranks: [32, 40, 48, 56, 60], form: 'cat', cost: 35, finisher: true, mult: 3.0, cond: { combo: 4 }, desc: 'Finishing move that causes damage per combo point.' },
      { id: 'shred', name: 'Shred', icon: '🐾', learn: 22, ranks: [22, 30, 38, 46, 54], form: 'cat', cost: 60, mult: 2.0, cp: 1, cond: { opener: true }, desc: 'Shred the target from behind. Awards 1 combo point.' },
      { id: 'rake', name: 'Rake', icon: '🐾', learn: 24, ranks: [24, 34, 46, 58], form: 'cat', cost: 40, mult: 0.4, cp: 1, dot: { mult: 1, dur: 9 }, cond: { noDot: 'rake', targetAbove: 0.5 }, desc: 'Rake the target for bleed damage. Awards 1 combo point.' },
      { id: 'claw', name: 'Claw', icon: '🐾', learn: 20, ranks: [20, 28, 38, 48, 58], form: 'cat', cost: 45, mult: 1.3, cp: 1, desc: 'Claw the enemy. Awards 1 combo point.' },
      // ---- Caster ----
      { id: 'insect_swarm', name: 'Insect Swarm', icon: '🦟', talent: true, ranks: [20, 30, 40, 50, 60], form: 'caster', cost: 0.08, dot: { mult: 1.4, dur: 12 }, school: 'nature', range: true, cond: { noDot: 'insect_swarm', targetAbove: 0.4 }, desc: 'Swarms the target with insects.' },
      { id: 'moonfire', name: 'Moonfire', icon: '🌙', learn: 4, ranks: [4, 10, 16, 22, 28, 34, 40, 46, 52, 58], form: 'caster', cost: 0.08, mult: 1.1, dot: { mult: 0.8, dur: 12 }, school: 'arcane', range: true, cond: { noDot: 'moonfire', targetAbove: 0.4 }, desc: 'Burns the enemy with Arcane damage.' },
      { id: 'starfire', name: 'Starfire', icon: '⭐', learn: 20, ranks: [20, 26, 34, 42, 50, 58], form: 'caster', cost: 0.12, cast: 3, mult: 3.7, school: 'arcane', range: true, proj: 'starfire', cond: { spec: 'Balance' }, desc: 'Causes Arcane damage to the target.' },
      { id: 'wrath', name: 'Wrath', icon: '🌿', learn: 1, ranks: [1, 6, 14, 22, 30, 38, 46, 54], form: 'caster', cost: 0.07, cast: 1.7, mult: 2.0, school: 'nature', range: true, proj: 'wrath', desc: 'Causes Nature damage to the target.' },
    ],
  },
};

const CLASS_ORDER = ['warrior', 'paladin', 'hunter', 'rogue', 'priest', 'shaman', 'mage', 'warlock', 'druid'];
const RESOURCE_NAMES = { rage: 'Rage', energy: 'Energy', mana: 'Mana' };

// Hunter pet by race (drawn with the beast body)
const HUNTER_PETS = {
  dwarf:    { name: 'Bear',      color: '#5b3a22', accent: '#3a2412', size: 0.8 },
  nightelf: { name: 'Nightsaber', color: '#4a3a6a', accent: '#2a2040', size: 0.75, eye: '#c0ff6a' },
  orc:      { name: 'Wolf',      color: '#6a6a6a', accent: '#3a3a3a', size: 0.72 },
  tauren:   { name: 'Plainstrider', color: '#b89a70', accent: '#7a5e40', size: 0.72 },
  troll:    { name: 'Raptor',    color: '#5a7a3a', accent: '#34481e', size: 0.75 },
};
