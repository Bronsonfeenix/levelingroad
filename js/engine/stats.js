// ---------------------------------------------------------------------------
// STATS — turns run state (class, level, gear, talents, bonuses) into combat stats,
// and boils those down to a single "power level" number for the UI.
// ---------------------------------------------------------------------------
WL.Stats = {
  PRIMARY: ['str', 'agi', 'int', 'sta', 'spi'],
  NAMES: {
    str: 'Strength', agi: 'Agility', int: 'Intellect', sta: 'Stamina', spi: 'Spirit',
    ap: 'Attack Power', sp: 'Spell Power', crit: 'Crit', armor: 'Armor', maxHp: 'Health',
  },

  compute(state) {
    const cls = WL.CLASSES[state.classKey];
    const L = state.level;
    const p = {};
    for (const k of this.PRIMARY) p[k] = cls.base[k] + cls.growth[k] * (L - 1) + ((state.bonus || {})[k] || 0);

    const flat = { ap: 0, sp: 0, armor: 0, crit: 0 };
    let weapon = null;
    for (const item of Object.values(state.gear || {})) {
      if (!item) continue;
      for (const [k, v] of Object.entries(item.stats || {})) {
        if (k in p) p[k] += v; else flat[k] = (flat[k] || 0) + v;
      }
      flat.armor += item.armor || 0;
      if (item.weapon) weapon = item.weapon;
    }
    for (const k of this.PRIMARY) p[k] = Math.round(p[k]);

    const s = {
      level: L, ...p,
      maxHp: cls.hp.base + cls.hp.perLevel * (L - 1) + p.sta * 10,
      ap: cls.ap.str * p.str + cls.ap.agi * p.agi + flat.ap,
      sp: p.int * 0.6 + flat.sp,
      crit: 5 + p[cls.critStat] / cls.critDiv + flat.crit,
      armor: flat.armor + p.agi * 2,
      weapon: weapon || { min: 1, max: 3, speed: 2 },
      dmgDone: 0, dmgTaken: 0, healDone: 0,
      onRound: [],
    };

    const r = cls.resource;
    if (r.type === 'mana') {
      const max = r.base + r.perLevel * (L - 1) + p.int * 5;
      s.resource = { type: 'mana', max, regen: max * 0.02 + p.spi * 0.25, start: max };
    } else {
      s.resource = { type: r.type, max: r.max, regen: r.regen, start: r.start };
    }

    // Talents / passives
    for (const id of state.skills || []) {
      const sk = WL.SKILLS[id];
      if (!sk || sk.type !== 'passive') continue;
      const { pct = {}, flat: fl = {} } = sk.mods || {};
      for (const [k, v] of Object.entries(pct)) this._apply(s, k, x => x * (1 + v));
      for (const [k, v] of Object.entries(fl)) this._apply(s, k, x => x + v);
      if (sk.onRound) s.onRound.push(sk);
    }

    s.maxHp = Math.round(s.maxHp);
    s.ap = Math.round(s.ap);
    s.sp = Math.round(s.sp);
    s.armor = Math.round(s.armor);
    s.crit = Math.round(s.crit * 10) / 10;
    s.resource.max = Math.round(s.resource.max);
    s.resource.regen = Math.round(s.resource.regen);
    if (s.resource.type === 'mana') s.resource.start = s.resource.max;
    return s;
  },

  _apply(s, key, fn) {
    if (key === 'resMax') s.resource.max = fn(s.resource.max);
    else if (key === 'resRegen') s.resource.regen = fn(s.resource.regen);
    else s[key] = fn(s[key] || 0);
  },

  // A rough "how strong am I" number: sqrt(offense x defense).
  power(s) {
    const w = s.weapon;
    const swing = (w.min + w.max) / 2 + (s.ap / 14) * w.speed;
    const offense = (swing + s.sp * 0.9 + s.level * 3) * (1 + s.crit / 100) * (1 + s.dmgDone);
    const mit = s.armor / (s.armor + 400 + 85 * s.level);
    const defense = s.maxHp / (1 - mit) / Math.max(0.2, 1 + s.dmgTaken);
    const passives = 1 + 0.08 * s.onRound.length;
    return Math.round(Math.sqrt(offense * defense * passives));
  },
};
