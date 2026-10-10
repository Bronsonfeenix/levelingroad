// Global namespace. Every file attaches to window.WL so the game runs from file:// with no build step.
window.WL = window.WL || {};

// ---------------------------------------------------------------------------
// Tuning knobs. Most balance work happens here and in data/*.js.
// ---------------------------------------------------------------------------
WL.CONFIG = {
  title: 'Azerothlike',
  saveKey: 'azerothlike.save.v1',
  saveVersion: 1,

  // Run structure: 12 tiers x 5 levels = 1..60.
  // Entering a tier sets you to its min level; each completed event step gives +1 level,
  // so after `stepsPerNode` steps you're at the tier's max level and face the boss.
  maxLevel: 60,
  levelsPerNode: 5,
  stepsPerNode: 4,
  choicesPerStep: 3,

  startingGold: 15,
  universalSkills: ['first_aid'],   // every class starts with these (after class skills)
  startingPotions: 1,

  potionHealPct: 0.35,      // potions auto-drink in combat
  potionThreshold: 0.35,    // ...when HP drops below this fraction
  potionPrice: lvl => Math.round(6 + lvl * 2.5),

  restHealPct: 0.6,
  restTrainStat: lvl => 3 + Math.floor(lvl / 6),
  tierHealPct: 0.25,        // free heal when moving to a new zone
  stepHealPct: 0.1,         // small heal after every completed step

  combatMaxRounds: 60,
  logStepMs: 240,           // combat log playback speed

  // Item rarity: `mult` scales stat budget, `value` scales sell price.
  rarities: {
    poor:      { label: 'Poor',      color: '#9d9d9d', mult: 0.6,  value: 0.5 },
    common:    { label: 'Common',    color: '#ffffff', mult: 1.0,  value: 1 },
    uncommon:  { label: 'Uncommon',  color: '#1eff00', mult: 1.45, value: 2 },
    rare:      { label: 'Rare',      color: '#0070dd', mult: 1.9,  value: 4 },
    epic:      { label: 'Epic',      color: '#a335ee', mult: 2.5,  value: 8 },
    legendary: { label: 'Legendary', color: '#ff8000', mult: 3.3,  value: 20 },
  },

  // What drops where. `rarity` is a weight table.
  dropTables: {
    normal:   { chance: 0.4, count: 1, rarity: { poor: 2, common: 5, uncommon: 3, rare: 0.4 } },
    elite:    { chance: 1,   count: 1, rarity: { uncommon: 6, rare: 3, epic: 0.3 } },
    boss:     { chance: 1,   count: 2, rarity: { uncommon: 2, rare: 6, epic: 1.2 } },
    treasure: { chance: 1,   count: 1, rarity: { common: 3, uncommon: 5, rare: 1.5, epic: 0.2 } },
    shop:     { count: 4,              rarity: { common: 3, uncommon: 5, rare: 1.2 } },
  },

  goldReward: {
    normal:   lvl => 4 + lvl * 1.5,
    elite:    lvl => 10 + lvl * 3,
    boss:     lvl => 25 + lvl * 6,
    treasure: lvl => 6 + lvl * 2,
  },

  // Relative odds of each event type being offered at a step (boss is forced on the last step).
  eventWeights: { fight: 5, elite: 1.6, shop: 1.4, trainer: 1.6, rest: 1.2, treasure: 1 },
};
