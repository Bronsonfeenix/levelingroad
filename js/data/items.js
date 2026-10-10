// ---------------------------------------------------------------------------
// ITEM DATA
// Items are generated procedurally (engine/loot.js) from these tables.
// To add hand-made items (named uniques, set pieces), put them in WL.UNIQUE_ITEMS
// with the same shape the generator produces and drop them from events/bosses.
// ---------------------------------------------------------------------------
WL.ITEMS = {
  // budget: share of the stat budget; armor: share of the armor budget
  slots: {
    weapon:    { label: 'Main Hand', budget: 0.8,  armor: 0 },
    head:      { label: 'Head',      budget: 0.9,  armor: 0.13 },
    shoulders: { label: 'Shoulders', budget: 0.75, armor: 0.12 },
    chest:     { label: 'Chest',     budget: 1.0,  armor: 0.2 },
    hands:     { label: 'Hands',     budget: 0.7,  armor: 0.1 },
    waist:     { label: 'Waist',     budget: 0.55, armor: 0.07 },
    legs:      { label: 'Legs',      budget: 0.95, armor: 0.17 },
    feet:      { label: 'Feet',      budget: 0.7,  armor: 0.11 },
    ring:      { label: 'Finger',    budget: 0.6,  armor: 0 },
    trinket:   { label: 'Trinket',   budget: 0.6,  armor: 0 },
  },

  // armor per item level, before slot share and rarity
  armorPerIlvl: { cloth: 3, leather: 6, mail: 11, plate: 18 },

  armorBases: {
    cloth:   { head: 'Hood', shoulders: 'Mantle', chest: 'Robe', hands: 'Gloves', waist: 'Sash', legs: 'Pants', feet: 'Sandals' },
    leather: { head: 'Cap', shoulders: 'Shoulderpads', chest: 'Tunic', hands: 'Gloves', waist: 'Belt', legs: 'Leggings', feet: 'Boots' },
    mail:    { head: 'Coif', shoulders: 'Pauldrons', chest: 'Hauberk', hands: 'Gauntlets', waist: 'Girdle', legs: 'Chain Leggings', feet: 'Footguards' },
    plate:   { head: 'Helm', shoulders: 'Spaulders', chest: 'Breastplate', hands: 'Gauntlets', waist: 'Waistguard', legs: 'Legplates', feet: 'Sabatons' },
  },
  jewelryBases: { ring: ['Band', 'Ring', 'Loop', 'Signet'], trinket: ['Charm', 'Idol', 'Talisman', 'Totem'] },

  // Classic-style "of the X" suffixes. Picked with weights from the class's statWeights.
  suffixes: [
    { name: 'of the Bear',    stats: ['str', 'sta'] },
    { name: 'of the Eagle',   stats: ['int', 'sta'] },
    { name: 'of the Monkey',  stats: ['agi', 'sta'] },
    { name: 'of the Owl',     stats: ['int', 'spi'] },
    { name: 'of the Tiger',   stats: ['str', 'agi'] },
    { name: 'of the Gorilla', stats: ['str', 'int'] },
    { name: 'of the Falcon',  stats: ['agi', 'int'] },
    { name: 'of the Whale',   stats: ['sta', 'spi'] },
    { name: 'of Stamina',     stats: ['sta'] },
    { name: 'of Sorcery',     stats: ['int', 'sp'] },
    { name: 'of Power',       stats: ['ap', 'sta'] },
  ],
  // How many budget points one stat point costs.
  statCost: { str: 1, agi: 1, int: 1, sta: 1, spi: 1, sp: 1.2, ap: 0.5 },

  prefixes: {
    poor:      ['Tattered', 'Frayed', 'Rusty', 'Cracked', 'Moth-eaten'],
    common:    ['Worn', 'Sturdy', 'Reinforced', 'Fine', 'Masterwork', 'Exalted'], // by ilvl band
    uncommon:  ["Bandit's", "Sentry's", 'Scouting', 'Raider\'s', 'Glyphed', 'Ornate', 'Embossed', 'Ritual', 'Imperial', 'Brutal'],
    rare:      ['Stormforged', 'Ashenbrand', 'Duskwoven', 'Ironheart', 'Gloomweave', 'Sunfire', 'Wolfsbane', 'Ravencrest'],
    epic:      ['Worldbreaker', 'Dreadflame', 'Starfall', 'Kingsfall', 'Emberwrought', 'Doomcaller'],
    legendary: ['Ancient', 'Eternal'],
  },
};
