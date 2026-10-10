// Seeded RNG (mulberry32). Runs are reproducible from a seed, and the
// RNG state is saved with the run so reloading doesn't reroll outcomes.
WL.RNG = function (seed) {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const api = {
    next,
    int: (a, b) => a + Math.floor(next() * (b - a + 1)),
    range: (a, b) => a + next() * (b - a),
    chance: p => next() < p,
    pick: arr => arr[Math.floor(next() * arr.length)],
    // weighted({a: 3, b: 1}) -> 'a' 75% of the time
    weighted(table) {
      const entries = Object.entries(table).filter(([, w]) => w > 0);
      const total = entries.reduce((n, [, w]) => n + w, 0);
      let r = next() * total;
      for (const [k, w] of entries) { if ((r -= w) < 0) return k; }
      return entries[entries.length - 1][0];
    },
    shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
    getState: () => s >>> 0,
    setState: v => { s = v >>> 0; },
  };
  return api;
};
