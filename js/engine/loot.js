// ---------------------------------------------------------------------------
// LOOT — procedural item generation.
// Item shape:
// { id, name, slot, rarity, ilvl, armor, stats: { sta: 5, ... }, weapon?: { min, max, speed } }
// ---------------------------------------------------------------------------
WL.Loot = {
  slotsFor(classKey) {
    return Object.keys(WL.ITEMS.slots);
  },

  rollRarity(rng, table) {
    return rng.weighted(table);
  },

  generate(rng, { ilvl, rarity, slot, classKey, id }) {
    const D = WL.ITEMS;
    const cls = WL.CLASSES[classKey];
    const R = WL.CONFIG.rarities[rarity];
    slot = slot || rng.pick(this.slotsFor(classKey));
    const S = D.slots[slot];

    // --- stats ---
    const budget = Math.max(1, ilvl * 0.55 * R.mult * S.budget + (rarity === 'poor' ? 0 : 1));
    const stats = {};
    let suffixName = null;
    if (rarity !== 'poor') {
      const suffix = this.pickSuffix(rng, cls);
      const shares = suffix.stats.map(() => rng.range(0.7, 1.3));
      const total = shares.reduce((a, b) => a + b, 0);
      suffix.stats.forEach((k, i) => {
        const v = Math.max(1, Math.round((budget * shares[i] / total) / D.statCost[k]));
        stats[k] = (stats[k] || 0) + v;
      });
      suffixName = suffix.name;
    }

    // --- armor / weapon ---
    const armor = Math.round(ilvl * D.armorPerIlvl[cls.armor] * S.armor * Math.sqrt(R.mult));
    let weapon;
    if (slot === 'weapon') {
      const dps = 1.2 + ilvl * 0.5 * R.mult;
      const speed = cls.weaponSpeed;
      const avg = dps * speed;
      weapon = { min: Math.max(1, Math.round(avg * 0.75)), max: Math.max(2, Math.round(avg * 1.25)), speed };
    }

    return {
      id, slot, rarity, ilvl,
      name: this.name(rng, { slot, rarity, ilvl, cls, suffixName }),
      armor, stats, weapon,
    };
  },

  pickSuffix(rng, cls) {
    const table = {};
    WL.ITEMS.suffixes.forEach((sfx, i) => {
      table[i] = sfx.stats.reduce((n, k) => n + (cls.statWeights[k] || 0.1), 0) ** 2;
    });
    return WL.ITEMS.suffixes[rng.weighted(table)];
  },

  name(rng, { slot, rarity, ilvl, cls, suffixName }) {
    const D = WL.ITEMS;
    let base;
    if (slot === 'weapon') base = rng.pick(cls.weaponNames);
    else if (D.jewelryBases[slot]) base = rng.pick(D.jewelryBases[slot]);
    else base = D.armorBases[cls.armor][slot];

    let prefix;
    if (rarity === 'common') {
      const band = D.prefixes.common;
      prefix = band[Math.min(band.length - 1, Math.floor(ilvl / 11))];
    } else prefix = rng.pick(D.prefixes[rarity]);

    return [prefix, base, suffixName].filter(Boolean).join(' ');
  },

  value(item) {
    const R = WL.CONFIG.rarities[item.rarity];
    return Math.max(1, Math.round(item.ilvl * R.value * 0.6));
  },

  price(item) {
    return this.value(item) * 4;
  },
};
