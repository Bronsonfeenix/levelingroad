// ---------------------------------------------------------------------------
// TIERS & ZONES
// 12 tiers of 5 levels each. At each tier the player picks one of the zones listed.
// Add a third zone to any tier and the map will show it automatically.
// Optional per-zone overrides: eventWeights: { shop: 3, ... }
// ---------------------------------------------------------------------------
const E = (name, arch, skills) => (skills ? { name, arch, skills } : { name, arch });

WL.TIERS = [
  { min: 1, max: 5, zones: [
    { id: 'elwynn', name: 'Elwynn Forest', blurb: 'Rolling hills, quiet farms, and kobolds in every mine.',
      enemies: [E('Kobold Tunneler', 'humanoid'), E('Young Wolf', 'beast'), E('Defias Thug', 'humanoid'), E('Murloc Streamrunner', 'humanoid')],
      boss: E('Hogger', 'beast', ['e_frenzy', 'e_heavy_strike']) },
    { id: 'durotar', name: 'Durotar', blurb: 'Red canyons baking under a merciless sun.',
      enemies: [E('Mottled Boar', 'beast'), E('Scorpid Worker', 'beast', ['e_poison']), E('Vile Familiar', 'demon'), E('Burning Blade Cultist', 'caster')],
      boss: E("Gazz'uz", 'caster') },
  ]},
  { min: 6, max: 10, zones: [
    { id: 'westfall', name: 'Westfall', blurb: 'Abandoned farmland overrun by bandits and scarecrows.',
      enemies: [E('Defias Pillager', 'caster'), E('Harvest Watcher', 'construct'), E('Riverpaw Gnoll', 'humanoid'), E('Coyote', 'beast')],
      boss: E('Edwin VanCleef', 'humanoid', ['e_heavy_strike', 'e_poison']) },
    { id: 'silverpine', name: 'Silverpine Forest', blurb: 'Fog-bound pines where worgen prowl.',
      enemies: [E('Moonrage Whitescalp', 'beast'), E('Rot Hide Gnoll', 'undead'), E('Dalaran Apprentice', 'caster'), E('Giant Rabid Bear', 'beast')],
      boss: E('Bloodfang Packlord', 'beast') },
  ]},
  { min: 11, max: 15, zones: [
    { id: 'barrens', name: 'The Barrens', blurb: 'Endless savannah. Someone is asking where Mankrik\'s wife is.',
      enemies: [E('Razormane Quilboar', 'humanoid'), E('Savannah Prowler', 'beast'), E('Venture Co. Overseer', 'humanoid'), E('Deviate Lasher', 'beast', ['e_poison'])],
      boss: E('Mutanus the Devourer', 'caster', ['e_shadow_bolt', 'e_stun']) },
    { id: 'redridge', name: 'Redridge Mountains', blurb: 'Lakeside town under siege by blackrock orcs.',
      enemies: [E('Blackrock Grunt', 'humanoid'), E('Redridge Mongrel', 'humanoid'), E('Tarantula', 'beast', ['e_poison']), E('Blackrock Shadowcaster', 'caster')],
      boss: E("Gath'Ilzogg", 'humanoid') },
  ]},
  { min: 16, max: 20, zones: [
    { id: 'wetlands', name: 'Wetlands', blurb: 'Bogs, crocolisks and dragonmaw orcs.',
      enemies: [E('Mottled Crocolisk', 'beast'), E('Dragonmaw Raider', 'humanoid'), E('Mudsnout Gnoll', 'humanoid'), E('Fen Creeper', 'elemental')],
      boss: E('Dragonmaw Warlord', 'humanoid', ['e_heavy_strike', 'e_frenzy']) },
    { id: 'bfd', name: 'Blackfathom Deeps', blurb: 'A flooded temple full of naga and twilight cultists.',
      enemies: [E('Blindlight Murloc', 'humanoid'), E('Twilight Acolyte', 'caster'), E('Aku\'mai Fisher', 'beast'), E('Murkshallow Snapclaw', 'beast')],
      boss: E("Aku'mai", 'beast', ['e_poison', 'e_frenzy']) },
  ]},
  { min: 21, max: 25, zones: [
    { id: 'duskwood', name: 'Duskwood', blurb: 'Eternal night. Something stitched together walks the road.',
      enemies: [E('Skeletal Fiend', 'undead'), E('Nightbane Worgen', 'beast'), E('Plague Spreader', 'undead'), E('Black Widow Hatchling', 'beast', ['e_poison'])],
      boss: E('Stitches', 'undead', ['e_heavy_strike', 'e_poison']) },
    { id: 'stonetalon', name: 'Stonetalon Mountains', blurb: 'Logging goblins tearing down an ancient forest.',
      enemies: [E('Venture Co. Logger', 'humanoid'), E('Cliff Stormer', 'elemental'), E('Deepmoss Venomspitter', 'beast', ['e_poison']), E('Grimtotem Shaman', 'caster')],
      boss: E('Sharptalon', 'beast') },
  ]},
  { min: 26, max: 30, zones: [
    { id: 'scarlet', name: 'Scarlet Monastery', blurb: 'Zealots who see the plague in everyone.',
      enemies: [E('Scarlet Myrmidon', 'humanoid'), E('Scarlet Sorcerer', 'caster'), E('Scarlet Monk', 'humanoid', ['e_stun']), E('Haunting Phantasm', 'undead')],
      boss: E('High Inquisitor Whitemane', 'caster', ['e_heal', 'e_shadow_bolt', 'e_heavy_strike']) },
    { id: 'rfk', name: 'Razorfen Kraul', blurb: 'A thorny warren of quilboar and their kin.',
      enemies: [E('Razorfen Defender', 'humanoid'), E('Death\'s Head Acolyte', 'caster'), E('Kraul Bat', 'beast'), E('Razorfen Beastmaster', 'humanoid')],
      boss: E('Charlga Razorflank', 'caster') },
  ]},
  { min: 31, max: 35, zones: [
    { id: 'arathi', name: 'Arathi Highlands', blurb: 'Crumbling keeps, ogre camps, and the Syndicate.',
      enemies: [E('Boulderfist Ogre', 'humanoid'), E('Syndicate Assassin', 'humanoid', ['e_poison']), E('Highland Strider', 'beast'), E('Witherbark Hexer', 'caster')],
      boss: E('Boulderfist Lord', 'humanoid', ['e_heavy_strike', 'e_stun']) },
    { id: 'desolace', name: 'Desolace', blurb: 'A grey wasteland of centaur war-bands and demons.',
      enemies: [E('Kolkar Marauder', 'humanoid'), E('Burning Blade Felsworn', 'demon'), E('Scorpashi Venomlash', 'beast', ['e_poison']), E('Thunderhead', 'elemental')],
      boss: E('Princess Theradras', 'elemental', ['e_heavy_strike', 'e_harden']) },
  ]},
  { min: 36, max: 40, zones: [
    { id: 'stv', name: 'Stranglethorn Vale', blurb: 'Jungle trolls, raptors, and a very angry tiger king.',
      enemies: [E('Bloodscalp Headhunter', 'humanoid'), E('Jungle Stalker', 'beast'), E('Venture Co. Geologist', 'caster'), E('Skullsplitter Mystic', 'caster')],
      boss: E('King Bangalash', 'beast', ['e_frenzy', 'e_heavy_strike']) },
    { id: 'rfd', name: 'Razorfen Downs', blurb: 'The Scourge has taken root beneath the quilboar.',
      enemies: [E('Skeletal Summoner', 'undead'), E('Tomb Fiend', 'undead'), E('Razorfen Thornweaver', 'caster'), E('Bone Golem', 'construct')],
      boss: E('Amnennar the Coldbringer', 'undead', ['e_shadow_bolt', 'e_heal']) },
  ]},
  { min: 41, max: 45, zones: [
    { id: 'zf', name: "Zul'Farrak", blurb: 'Sandfury trolls guard the temple steps.',
      enemies: [E('Sandfury Blood Drinker', 'humanoid'), E('Sandfury Witch Doctor', 'caster'), E('Zombie', 'undead'), E('Scarab', 'beast', ['e_poison'])],
      boss: E('Chief Ukorz Sandscalp', 'humanoid', ['e_heavy_strike', 'e_frenzy']) },
    { id: 'uldaman', name: 'Uldaman', blurb: 'Titan halls patrolled by stone keepers.',
      enemies: [E('Stone Keeper', 'construct'), E('Shadowforge Darkcaster', 'caster'), E('Earthen Guardian', 'elemental'), E('Stonevault Brawler', 'humanoid')],
      boss: E('Archaedas', 'construct', ['e_harden', 'e_heavy_strike']) },
  ]},
  { min: 46, max: 50, zones: [
    { id: 'hinterlands', name: 'The Hinterlands', blurb: 'Wildhammer skies and trolls in the high temple.',
      enemies: [E('Vilebranch Raiding Wolf', 'beast'), E('Witherbark Shadow Hunter', 'caster'), E('Silvermane Stalker', 'beast'), E('Vilebranch Berserker', 'humanoid')],
      boss: E('Vile Priestess Hexx', 'caster', ['e_shadow_bolt', 'e_heal', 'e_poison']) },
    { id: 'st', name: 'Sunken Temple', blurb: 'A drowned temple where a green dragon dreams in torment.',
      enemies: [E('Atal\'ai Priest', 'caster'), E('Hakkari Minion', 'demon'), E('Nightmare Scalebane', 'dragonkin'), E('Saturated Ooze', 'elemental')],
      boss: E('Shade of Eranikus', 'dragonkin') },
  ]},
  { min: 51, max: 55, zones: [
    { id: 'brd', name: 'Blackrock Depths', blurb: 'The Dark Iron capital, deep in the mountain\'s heart.',
      enemies: [E('Anvilrage Guardsman', 'humanoid'), E('Shadowforge Flame Keeper', 'caster'), E('Molten Elemental', 'elemental'), E('Doomforge Craftsman', 'construct')],
      boss: E('Emperor Dagran Thaurissan', 'humanoid', ['e_fire', 'e_heavy_strike', 'e_stun']) },
    { id: 'ungoro', name: "Un'Goro Crater", blurb: 'A primeval jungle where devilsaurs rule.',
      enemies: [E('Frenzied Pterrordax', 'beast'), E('Ironhide Devilsaur', 'beast', ['e_heavy_strike']), E('Gorishi Stinger', 'beast', ['e_poison']), E('Living Blaze', 'elemental')],
      boss: E('King Mosh', 'beast', ['e_frenzy', 'e_heavy_strike']) },
  ]},
  { min: 56, max: 60, zones: [
    { id: 'mc', name: 'Molten Core', blurb: 'The Firelord waits at the bottom of the mountain.',
      enemies: [E('Core Hound', 'beast'), E('Flamewaker Priest', 'caster'), E('Lava Surger', 'elemental'), E('Firelord', 'elemental')],
      boss: E('Ragnaros', 'elemental', ['e_fire', 'e_heavy_strike']) },
    { id: 'strat', name: 'Stratholme', blurb: 'A burned city still crawling with the Scourge.',
      enemies: [E('Plague Ghoul', 'undead'), E('Crimson Conjuror', 'caster'), E('Mangled Cadaver', 'undead'), E('Thuzadin Necromancer', 'caster')],
      boss: E('Baron Rivendare', 'undead', ['e_shadow_bolt', 'e_heavy_strike', 'e_poison']) },
  ]},
];
