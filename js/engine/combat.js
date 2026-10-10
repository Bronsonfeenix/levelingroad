// ---------------------------------------------------------------------------
// COMBAT — auto-battler, resolved instantly and played back by the UI.
//
// Each round, player then enemy take a turn:
//   1. tick effects (DoTs, HoTs, buff durations), cooldowns, resource regen
//   2. skip turn if stunned
//   3. player only: drink a potion if below the threshold
//   4. cast the first usable skill in priority order
//   5. auto-attack with weapon
//   6. passives with onRound (pets, procs)
//
// simulate() returns { won, rounds, hpFrac, potionsUsed, log[] } where each log
// entry carries HP snapshots so the UI can animate bars as it replays.
// ---------------------------------------------------------------------------
WL.Combat = (() => {
  const critMult = (c, school) => (c.isPlayer && school === 'physical' ? 2 : 1.5); // enemies & spells crit for 1.5x

  function combatant(o) {
    return Object.assign({
      effects: [], cds: {}, dmgDone: 0, dmgTaken: 0, healDone: 0, crit: 5, ap: 0, sp: 0, armor: 0,
      onRound: [], res: { type: 'none', max: 0, cur: 0, regen: 0 },
    }, o);
  }

  function fromPlayer(game) {
    const st = game.state;
    const s = game.stats();
    const cls = WL.CLASSES[st.classKey];
    return combatant({
      name: 'You', isPlayer: true, level: s.level,
      maxHp: s.maxHp, hp: Math.max(1, Math.round(s.maxHp * st.hpFrac)),
      res: { type: s.resource.type, max: s.resource.max, cur: s.resource.start, regen: s.resource.regen },
      ap: s.ap, sp: s.sp, crit: s.crit, armor: s.armor, weapon: s.weapon,
      dmgDone: s.dmgDone, dmgTaken: s.dmgTaken, healDone: s.healDone,
      skills: st.skills.map(id => WL.SKILLS[id]).filter(sk => sk && sk.type === 'active'),
      onRound: s.onRound, potions: st.potions, className: cls.name,
    });
  }

  function fromEnemy(def) {
    return combatant({
      name: def.name, isPlayer: false, level: def.level,
      maxHp: def.maxHp, hp: def.maxHp, armor: def.armor, crit: def.crit, weapon: def.weapon,
      skills: def.skills.map(id => WL.SKILLS[id]).filter(Boolean),
    });
  }

  function simulate(p, e, rng) {
    const C = WL.CONFIG;
    const log = [];
    let potionsUsed = 0;
    let round = 0;

    const mod = (c, k) => c.effects.reduce((v, ef) => v + ((ef.mods && ef.mods[k]) || 0), c[k] || 0);
    const write = (who, text, extra = {}) => log.push({
      who, text, round, p: Math.max(0, Math.round(p.hp)), e: Math.max(0, Math.round(e.hp)),
      pr: Math.round(p.res.cur), ...extra,
    });
    const nameOf = c => (c.isPlayer ? 'You' : c.name);

    function damage(src, tgt, amount, school, label, canCrit) {
      let amt = amount * (1 + mod(src, 'dmgDone')) * (1 + mod(tgt, 'dmgTaken'));
      let crit = false;
      if (canCrit && rng.next() * 100 < mod(src, 'crit')) { crit = true; amt *= critMult(src, school); }
      if (school === 'physical') {
        const m = Math.min(0.75, tgt.armor / (tgt.armor + 400 + 85 * src.level));
        amt *= 1 - m;
      }
      amt = Math.max(0, Math.round(amt));
      let absorbed = 0;
      for (const ef of tgt.effects) {
        if (ef.kind !== 'shield' || amt <= 0) continue;
        const take = Math.min(ef.value, amt);
        ef.value -= take; amt -= take; absorbed += take;
      }
      tgt.effects = tgt.effects.filter(ef => ef.kind !== 'shield' || ef.value > 0);
      tgt.hp -= amt;
      if (tgt.res.type === 'rage') tgt.res.cur = Math.min(tgt.res.max, tgt.res.cur + (amt / tgt.maxHp) * 60);
      const absTxt = absorbed ? ` (${absorbed} absorbed)` : '';
      write(src.isPlayer ? 'p' : 'e', `${label} hits ${tgt.isPlayer ? 'you' : tgt.name} for ${amt}${crit ? ' (crit!)' : ''}${absTxt}.`, { crit, school });
      return amt;
    }

    function healUnit(c, amount, label) {
      const amt = Math.round(amount * (1 + mod(c, 'healDone')));
      const before = c.hp;
      c.hp = Math.min(c.maxHp, c.hp + amt);
      const got = Math.round(c.hp - before);
      write(c.isPlayer ? 'p' : 'e', `${label} heals ${c.isPlayer ? 'you' : c.name} for ${got}.`, { heal: true });
      return got;
    }

    function ctx(src, tgt, skillName) {
      return {
        src, tgt, rng, lvl: src.level, ap: src.ap, sp: src.sp,
        get selfHp() { return src.hp / src.maxHp; },
        get tgtHp() { return tgt.hp / tgt.maxHp; },
        weap(mult = 1) {
          const w = src.weapon;
          return (w.min + rng.next() * (w.max - w.min) + (src.ap / 14) * w.speed) * mult;
        },
        hit: (amount, school = 'physical', label = skillName) => damage(src, tgt, amount, school, label, true),
        heal: (amount, label = skillName) => healUnit(src, amount, label),
        shield(amount, label = skillName) {
          src.effects.push({ kind: 'shield', label, value: Math.round(amount * (1 + mod(src, 'healDone'))), rounds: 99 });
          write(src.isPlayer ? 'p' : 'e', `${label} shields ${src.isPlayer ? 'you' : src.name}.`);
        },
        dot(label, per, rounds, school = 'physical') {
          tgt.effects.push({ kind: 'dot', label, value: per * (1 + mod(src, 'dmgDone')), rounds, school, srcLevel: src.level });
          write(src.isPlayer ? 'p' : 'e', `${label} afflicts ${tgt.isPlayer ? 'you' : tgt.name}.`);
        },
        hot(label, per, rounds) {
          src.effects.push({ kind: 'hot', label, value: per, rounds });
          write(src.isPlayer ? 'p' : 'e', `${label} begins healing ${src.isPlayer ? 'you' : src.name}.`);
        },
        stun(rounds) {
          if (tgt.effects.some(ef => ef.kind === 'dr')) { write('sys', `${nameOf(tgt)} resists the stun.`); return; }
          tgt.effects.push({ kind: 'stun', label: 'Stunned', rounds });
          tgt.effects.push({ kind: 'dr', label: 'Stun immunity', rounds: rounds + 3 });
          write(src.isPlayer ? 'p' : 'e', `${tgt.isPlayer ? 'You are' : tgt.name + ' is'} stunned!`);
        },
        buff(label, mods, rounds) {
          src.effects.push({ kind: 'buff', label, mods, rounds });
          write(src.isPlayer ? 'p' : 'e', `${src.isPlayer ? 'You gain' : src.name + ' gains'} ${label}.`);
        },
        debuff(label, mods, rounds) {
          tgt.effects.push({ kind: 'debuff', label, mods, rounds });
        },
      };
    }

    function costOf(sk, c) {
      const v = typeof sk.cost === 'function' ? sk.cost(c.level) : (sk.cost || 0);
      return Math.round(v);
    }

    function turn(a, d) {
      // 1. effects
      const stunned = a.effects.some(ef => ef.kind === 'stun');
      for (const ef of a.effects) {
        if (ef.kind === 'dot') {
          let amt = ef.value * (1 + mod(a, 'dmgTaken'));
          if (ef.school === 'physical') amt *= 1 - Math.min(0.75, a.armor / (a.armor + 400 + 85 * ef.srcLevel));
          amt = Math.max(0, Math.round(amt));
          a.hp -= amt;
          write(a.isPlayer ? 'e' : 'p', `${ef.label} ticks on ${a.isPlayer ? 'you' : a.name} for ${amt}.`, { dot: true });
        } else if (ef.kind === 'hot') {
          healUnit(a, ef.value, ef.label);
        }
        ef.rounds -= 1;
      }
      a.effects = a.effects.filter(ef => ef.rounds > 0);
      for (const k in a.cds) if (a.cds[k] > 0) a.cds[k] -= 1;
      if (a.res.type !== 'none') a.res.cur = Math.min(a.res.max, a.res.cur + a.res.regen);
      if (a.hp <= 0) return;

      // 2. stun
      if (stunned) { write('sys', `${a.isPlayer ? 'You are' : a.name + ' is'} stunned and loses the turn.`); return; }

      // 3. potion
      if (a.isPlayer && a.potions > 0 && a.hp / a.maxHp < WL.CONFIG.potionThreshold) {
        a.potions -= 1; potionsUsed += 1;
        healUnit(a, a.maxHp * WL.CONFIG.potionHealPct, 'Healing Potion');
      }

      // 4. skill
      for (const sk of a.skills) {
        if ((a.cds[sk.id] || 0) > 0) continue;
        const cost = costOf(sk, a);
        if (a.res.type !== 'none' && a.res.cur < cost) continue;
        const c = ctx(a, d, sk.name);
        if (sk.cond && !sk.cond(c)) continue;
        if (a.res.type !== 'none') a.res.cur -= cost;
        a.cds[sk.id] = sk.cd || 0;
        sk.use(c);
        break;
      }
      if (d.hp <= 0) return;

      // 5. auto attack
      const c = ctx(a, d, a.isPlayer ? 'Your attack' : a.name);
      c.hit(c.weap(1), 'physical');

      // 6. passives
      for (const pas of a.onRound) {
        if (d.hp <= 0) break;
        pas.onRound(ctx(a, d, pas.name));
      }
    }

    write('sys', `${p.className || 'You'} engages ${e.name}!`);
    while (round < WL.CONFIG.combatMaxRounds && p.hp > 0 && e.hp > 0) {
      round += 1;
      turn(p, e);
      if (e.hp <= 0 || p.hp <= 0) break;
      turn(e, p);
    }

    const won = e.hp <= 0 && p.hp > 0;
    if (won) write('sys', `${e.name} dies.`, { end: true });
    else if (p.hp <= 0) write('sys', 'You have died.', { end: true });
    else write('sys', `${e.name} outlasts you. You collapse from exhaustion.`, { end: true });

    return {
      won, rounds: round, potionsUsed,
      hpFrac: won ? Math.max(0.01, p.hp / p.maxHp) : 0,
      log,
    };
  }

  return { fromPlayer, fromEnemy, simulate };
})();
