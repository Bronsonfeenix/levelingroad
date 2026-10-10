// ---------------------------------------------------------------------------
// GAME — owns the run state and every action the UI can trigger.
//
// The UI never mutates state directly: it calls a method here (via data-action
// buttons), then saves and re-renders. `state.screen` says what to show.
//
// Screens: classSelect, map, node, combat, reward, shop, trainer, rest, gameover, victory
// ---------------------------------------------------------------------------
WL.Game = class Game {
  constructor() {
    this.state = null;
    this.rng = null;
  }

  // ----- lifecycle --------------------------------------------------------
  newRun(classKey, seed = Date.now() % 2147483647) {
    const C = WL.CONFIG;
    const cls = WL.CLASSES[classKey];
    this.rng = WL.RNG(seed);
    this.state = {
      v: C.saveVersion, seed, rngState: 0, classKey,
      level: 1, gold: C.startingGold, potions: C.startingPotions, hpFrac: 1,
      gear: {}, bag: [], skills: [], bonus: {},
      tier: 0, zoneId: null, step: 0, choices: [],
      screen: null, kills: 0, nextId: 1, path: [],
    };
    for (const id of [...cls.starting, ...C.universalSkills]) this.addSkill(id);
    this.state.gear.weapon = this.makeItem({ ilvl: 2, rarity: 'common', slot: 'weapon' });
    this.toMap();
  }

  toClassSelect() { this.state = null; }

  save() {
    if (!this.state) { try { localStorage.removeItem(WL.CONFIG.saveKey); } catch (e) {} return; }
    this.state.rngState = this.rng.getState();
    try { localStorage.setItem(WL.CONFIG.saveKey, JSON.stringify(this.state)); } catch (e) { /* storage unavailable */ }
  }

  load() {
    try {
      const raw = localStorage.getItem(WL.CONFIG.saveKey);
      if (!raw) return false;
      const st = JSON.parse(raw);
      if (st.v !== WL.CONFIG.saveVersion) return false;
      this.state = st;
      this.rng = WL.RNG(st.seed);
      this.rng.setState(st.rngState);
      return true;
    } catch (e) { return false; }
  }

  abandon() { this.state = null; }

  // ----- derived ----------------------------------------------------------
  stats(state = this.state) { return WL.Stats.compute(state); }
  power(state = this.state) { return WL.Stats.power(this.stats(state)); }
  tierDef() { return WL.TIERS[this.state.tier]; }
  zone() { return this.tierDef().zones.find(z => z.id === this.state.zoneId); }
  ilvl() { return this.state.level + 1; }

  powerWith(item) {
    const gear = { ...this.state.gear, [item.slot]: item };
    return this.power({ ...this.state, gear });
  }

  findItem(id) {
    id = Number(id);
    const st = this.state;
    const pools = [Object.values(st.gear), st.bag, (st.screen && st.screen.items) || []];
    for (const pool of pools) { const it = pool.find(i => i && i.id === id); if (it) return it; }
    return null;
  }

  makeItem(opts) {
    return WL.Loot.generate(this.rng, { classKey: this.state.classKey, id: this.state.nextId++, ...opts });
  }

  setScreen(screen) { this.state.screen = screen; }

  // ----- map & zones ------------------------------------------------------
  toMap() {
    const t = this.tierDef();
    this.state.level = t.min;
    this.state.zoneId = null;
    this.setScreen({ type: 'map' });
  }

  chooseZone(id) {
    this.state.zoneId = id;
    this.state.step = 0;
    this.state.path.push(id);
    this.rollChoices();
    this.setScreen({ type: 'node' });
  }

  rollChoices() {
    const C = WL.CONFIG;
    const st = this.state;
    if (st.step >= C.stepsPerNode) { st.choices = [{ type: 'boss' }]; return; }
    const weights = { ...C.eventWeights, ...(this.zone().eventWeights || {}) };
    for (const k of Object.keys(weights)) {
      const ev = WL.EVENTS[k];
      if (!ev || (ev.available && !ev.available(this))) delete weights[k];
    }
    const picked = [];
    while (picked.length < C.choicesPerStep && Object.keys(weights).length) {
      const k = this.rng.weighted(weights);
      picked.push(k);
      delete weights[k];
    }
    // Always offer at least one fight so a run can't stall on non-combat choices.
    if (!picked.some(k => k === 'fight' || k === 'elite')) picked[picked.length - 1] = 'fight';
    st.choices = picked.map(type => ({ type }));
  }

  chooseEvent(i) {
    const ch = this.state.choices[Number(i)];
    if (!ch) return;
    WL.EVENTS[ch.type].start(this, ch);
  }

  // Called after any event resolves (except the boss).
  completeStep() {
    const st = this.state;
    st.step += 1;
    st.hpFrac = Math.min(1, st.hpFrac + WL.CONFIG.stepHealPct);
    st.level = Math.min(this.tierDef().max, st.level + 1);
    this.rollChoices();
    this.setScreen({ type: 'node' });
  }

  advanceTier() {
    const st = this.state;
    st.tier += 1;
    if (st.tier >= WL.TIERS.length) {
      st.tier = WL.TIERS.length - 1;
      this.setScreen({ type: 'victory' });
      return;
    }
    st.hpFrac = Math.min(1, st.hpFrac + WL.CONFIG.tierHealPct);
    this.toMap();
  }

  leave() {
    const then = this.state.screen && this.state.screen.then;
    if (then === 'tier') this.advanceTier();
    else this.completeStep();
  }

  // ----- combat -----------------------------------------------------------
  startCombat(rank) {
    const z = this.zone();
    const tpl = rank === 'boss' ? z.boss : this.rng.pick(z.enemies);
    const def = WL.Enemies.build(tpl, this.state.level, rank);
    const player = WL.Combat.fromPlayer(this);
    const startHp = player.hp;
    const result = WL.Combat.simulate(player, WL.Combat.fromEnemy(def), this.rng);
    const s = this.stats();
    this.setScreen({
      type: 'combat', rank,
      enemy: { name: def.name, level: def.level, maxHp: def.maxHp, rank, arch: def.arch },
      player: { maxHp: s.maxHp, startHp, res: s.resource },
      result,
    });
  }

  finishCombat() {
    const st = this.state;
    const sc = st.screen;
    if (sc.type !== 'combat') return;
    const r = sc.result;
    st.potions -= r.potionsUsed;
    if (!r.won) {
      st.hpFrac = 0;
      this.setScreen({ type: 'gameover', killer: sc.enemy.name });
      return;
    }
    st.hpFrac = r.hpFrac;
    st.kills += 1;
    const lvl = st.level;
    const gold = Math.round(WL.CONFIG.goldReward[sc.rank](lvl) * this.rng.range(0.85, 1.15));
    const items = this.rollDrops(WL.CONFIG.dropTables[sc.rank], sc.rank === 'normal' ? 0 : 1);
    this.giveReward({
      title: sc.rank === 'boss' ? `${sc.enemy.name} is defeated!` : 'Victory',
      gold, items, then: sc.rank === 'boss' ? 'tier' : 'step',
    });
  }

  rollDrops(table, ilvlBonus = 0) {
    const items = [];
    for (let i = 0; i < (table.count || 1); i++) {
      if (!this.rng.chance(table.chance ?? 1)) continue;
      items.push(this.makeItem({ ilvl: this.ilvl() + ilvlBonus, rarity: WL.Loot.rollRarity(this.rng, table.rarity) }));
    }
    return items;
  }

  giveReward({ title, gold = 0, items = [], then = 'step', note }) {
    const st = this.state;
    st.gold += gold;
    st.bag.push(...items);
    this.setScreen({ type: 'reward', title, gold, itemIds: items.map(i => i.id), then, note });
  }

  // ----- gear -------------------------------------------------------------
  equip(id) {
    const st = this.state;
    const idx = st.bag.findIndex(i => i.id === Number(id));
    if (idx < 0) return;
    const item = st.bag[idx];
    st.bag.splice(idx, 1);
    const old = st.gear[item.slot];
    st.gear[item.slot] = item;
    if (old) st.bag.push(old);
  }

  sell(id) {
    const st = this.state;
    const idx = st.bag.findIndex(i => i.id === Number(id));
    if (idx < 0) return;
    st.gold += WL.Loot.value(st.bag[idx]);
    st.bag.splice(idx, 1);
  }

  sellJunk() {
    for (const it of this.state.bag.slice()) {
      if (this.powerWith(it) <= this.power()) this.sell(it.id);
    }
  }

  // ----- shop -------------------------------------------------------------
  openShop() {
    const t = WL.CONFIG.dropTables.shop;
    const items = [];
    for (let i = 0; i < t.count; i++) {
      items.push(this.makeItem({ ilvl: this.ilvl(), rarity: WL.Loot.rollRarity(this.rng, t.rarity) }));
    }
    this.setScreen({ type: 'shop', items, potionPrice: WL.CONFIG.potionPrice(this.state.level) });
  }

  buy(id) {
    const st = this.state;
    const sc = st.screen;
    const idx = sc.items.findIndex(i => i.id === Number(id));
    if (idx < 0) return;
    const price = WL.Loot.price(sc.items[idx]);
    if (st.gold < price) return;
    st.gold -= price;
    st.bag.push(sc.items[idx]);
    sc.items.splice(idx, 1);
  }

  buyPotion() {
    const st = this.state;
    if (st.gold < st.screen.potionPrice) return;
    st.gold -= st.screen.potionPrice;
    st.potions += 1;
  }

  // ----- trainer ----------------------------------------------------------
  trainerPool() {
    const st = this.state;
    return Object.values(WL.SKILLS).filter(sk =>
      sk.class === st.classKey && !st.skills.includes(sk.id) && (sk.minLevel || 1) <= st.level + 1);
  }

  openTrainer() {
    const options = this.rng.shuffle(this.trainerPool()).slice(0, 3).map(sk => sk.id);
    this.setScreen({ type: 'trainer', options });
  }

  learn(id) {
    const sc = this.state.screen;
    if (!sc.options.includes(id)) return;
    this.addSkill(id);
    this.completeStep();
  }

  // Default priority: conditional skills (heals, panic buttons) first, then cooldown skills,
  // then "filler" skills with no cooldown. Players can reorder afterwards.
  addSkill(id) {
    const list = this.state.skills;
    const sk = WL.SKILLS[id];
    const rank = s => (s.type !== 'active' ? 3 : s.cond ? 0 : s.cd ? 1 : 2);
    const at = list.findIndex(other => rank(WL.SKILLS[other]) > rank(sk));
    if (at < 0) list.push(id); else list.splice(at, 0, id);
  }

  // Move an active skill earlier in the priority list.
  skillUp(id) {
    const list = this.state.skills;
    const i = list.indexOf(id);
    if (i <= 0) return;
    [list[i - 1], list[i]] = [list[i], list[i - 1]];
  }

  // ----- rest -------------------------------------------------------------
  restHeal() {
    this.state.hpFrac = Math.min(1, this.state.hpFrac + WL.CONFIG.restHealPct);
    this.completeStep();
  }

  restTrain() {
    const cls = WL.CLASSES[this.state.classKey];
    const top = Object.entries(cls.statWeights).filter(([k]) => WL.Stats.PRIMARY.includes(k))
      .sort((a, b) => b[1] - a[1])[0][0];
    const amt = WL.CONFIG.restTrainStat(this.state.level);
    this.state.bonus[top] = (this.state.bonus[top] || 0) + amt;
    this.state.bonus.sta = (this.state.bonus.sta || 0) + (top === 'sta' ? 0 : Math.ceil(amt / 2));
    this.completeStep();
  }

  // ----- treasure ---------------------------------------------------------
  openTreasure() {
    const lvl = this.state.level;
    const gold = Math.round(WL.CONFIG.goldReward.treasure(lvl) * this.rng.range(0.8, 1.2));
    const items = this.rollDrops(WL.CONFIG.dropTables.treasure);
    this.giveReward({ title: 'You open the chest…', gold, items, then: 'step' });
  }
};
