#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Headless balance simulator. Plays many runs with a simple bot and reports
// how far each class gets. Use it after changing numbers in config/data.
//
//   node tools/simulate.js            # 200 runs per class
//   node tools/simulate.js 500 mage   # 500 runs, mage only
// ---------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const vm = require('vm');

globalThis.window = globalThis;
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1])
  .filter(src => !src.includes('/ui/') && !src.endsWith('main.js'));
for (const src of scripts) vm.runInThisContext(fs.readFileSync(path.join(root, src), 'utf8'), { filename: src });

const RUNS = Number(process.argv[2] || 200);
const only = process.argv[3];

// --- bot policy: simple and greedy -----------------------------------------
function autoEquip(g) {
  let changed = true;
  while (changed) {
    changed = false;
    for (const it of g.state.bag.slice()) {
      if (g.powerWith(it) > g.power()) { g.equip(it.id); changed = true; }
    }
  }
  g.sellJunk();
}

function pickEvent(g) {
  const types = g.state.choices.map(c => c.type);
  const hp = g.state.hpFrac;
  const order = hp < 0.5 ? ['rest', 'treasure', 'shop', 'trainer', 'fight', 'elite', 'boss']
    : ['trainer', 'treasure', 'elite', 'fight', 'shop', 'rest', 'boss'];
  for (const t of order) { const i = types.indexOf(t); if (i >= 0) return i; }
  return 0;
}

function playRun(classKey, seed) {
  const g = new WL.Game();
  g.newRun(classKey, seed);
  const fights = { normal: 0, elite: 0, boss: 0 };
  for (let guard = 0; guard < 500; guard++) {
    const sc = g.state.screen;
    switch (sc.type) {
      case 'map': g.chooseZone(g.rng.pick(g.tierDef().zones).id); break;
      case 'node': g.chooseEvent(pickEvent(g)); break;
      case 'combat': fights[sc.rank]++; g.finishCombat(); break;
      case 'reward': autoEquip(g); g.leave(); break;
      case 'shop': {
        autoEquip(g);
        while (g.state.potions < 3 && g.state.gold >= sc.potionPrice) g.buyPotion();
        for (const it of sc.items.slice()) {
          if (g.state.gold >= WL.Loot.price(it) && g.powerWith(it) > g.power() * 1.02) { g.buy(it.id); autoEquip(g); }
        }
        g.leave(); break;
      }
      case 'trainer': g.learn(sc.options[0]); break;
      case 'rest': g.state.hpFrac < 0.7 ? g.restHeal() : g.restTrain(); break;
      case 'gameover': case 'victory':
        return { won: sc.type === 'victory', level: g.state.level, tier: g.state.tier, power: g.power(), fights };
    }
  }
  throw new Error('run did not finish');
}

const classes = only ? [only] : Object.keys(WL.CLASSES);
console.log(`${RUNS} runs per class\n`);
console.log('class      win%   avg lvl  median death tier   avg final power');
for (const k of classes) {
  const res = [];
  for (let i = 0; i < RUNS; i++) res.push(playRun(k, 1000 + i * 7919));
  const wins = res.filter(r => r.won).length;
  const avgLvl = res.reduce((n, r) => n + r.level, 0) / RUNS;
  const deaths = res.filter(r => !r.won).map(r => r.tier + 1).sort((a, b) => a - b);
  const med = deaths.length ? deaths[Math.floor(deaths.length / 2)] : '-';
  const pow = res.reduce((n, r) => n + r.power, 0) / RUNS;
  console.log(`${k.padEnd(10)} ${String(Math.round(wins / RUNS * 100)).padStart(4)}%   ${avgLvl.toFixed(1).padStart(6)}   ${String(med).padStart(10)}   ${pow.toFixed(0).padStart(12)}`);
}
