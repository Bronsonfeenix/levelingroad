// ---------------------------------------------------------------------------
// EVENT TYPES — what can appear as a choice at each step of a zone.
//
// To add a new event:
//   1. Add an entry here with name/icon/blurb and a start(game) function.
//   2. Give it a weight in CONFIG.eventWeights (or a zone's eventWeights).
//   3. If it needs its own screen, have start() call game.setScreen({ type: 'yourType', ... })
//      and add a renderer for 'yourType' in ui/render.js (UI.screens.yourType).
//
// available(game) is optional and filters the event out when it returns false.
// ---------------------------------------------------------------------------
WL.EVENTS = {
  fight: {
    name: 'Skirmish', icon: '⚔', blurb: 'Fight a local enemy. Gold and a chance at loot.',
    start: g => g.startCombat('normal'),
  },
  elite: {
    name: 'Elite Foe', icon: '☠', blurb: 'A dangerous enemy. Guaranteed quality loot.',
    start: g => g.startCombat('elite'),
  },
  boss: {
    name: 'Zone Boss', icon: '♛', blurb: 'Defeat the boss to leave the zone.',
    start: g => g.startCombat('boss'),
  },
  shop: {
    name: 'Vendor', icon: '⚖', blurb: 'Buy gear and potions; sell what you don\'t need.',
    start: g => g.openShop(),
  },
  trainer: {
    name: 'Class Trainer', icon: '✦', blurb: 'Learn one of three new skills or talents.',
    available: g => g.trainerPool().length > 0,
    start: g => g.openTrainer(),
  },
  rest: {
    name: 'Inn', icon: '☾', blurb: 'Heal up, or train to permanently raise a stat.',
    start: g => g.setScreen({ type: 'rest' }),
  },
  treasure: {
    name: 'Treasure', icon: '◆', blurb: 'An unguarded chest. Free loot!',
    start: g => g.openTreasure(),
  },
};
