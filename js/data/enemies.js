// ---------------------------------------------------------------------------
// ENEMIES
// Zones list enemy templates ({ name, arch, skills? }). An archetype supplies
// stat multipliers and default abilities; a rank (normal/elite/boss) scales on top.
// Final stats come from WL.Enemies.build(template, level, rank).
// ---------------------------------------------------------------------------
WL.ARCHETYPES = {
  beast:     { hp: 1.0,  dmg: 1.05, armor: 0.7, speed: 2.0, skills: ['e_frenzy'] },
  humanoid:  { hp: 1.0,  dmg: 1.0,  armor: 1.0, speed: 2.4, skills: ['e_heavy_strike'] },
  caster:    { hp: 0.8,  dmg: 0.75, armor: 0.4, speed: 2.0, skills: ['e_shadow_bolt', 'e_heal'] },
  undead:    { hp: 1.1,  dmg: 0.95, armor: 0.9, speed: 2.4, skills: ['e_poison'] },
  elemental: { hp: 1.2,  dmg: 0.95, armor: 1.2, speed: 2.2, skills: ['e_fire'] },
  construct: { hp: 1.15, dmg: 0.9,  armor: 1.8, speed: 2.8, skills: ['e_harden', 'e_heavy_strike'] },
  demon:     { hp: 1.0,  dmg: 1.05, armor: 0.9, speed: 2.2, skills: ['e_fire', 'e_shadow_bolt'] },
  dragonkin: { hp: 1.25, dmg: 1.1,  armor: 1.3, speed: 2.4, skills: ['e_fire', 'e_heavy_strike'] },
};

WL.RANKS = {
  normal: { label: 'Normal', hp: 1.0, dmg: 1.0,  levelBonus: 0, skills: [] },
  elite:  { label: 'Elite',  hp: 1.5, dmg: 1.15, levelBonus: 1, skills: [] },
  boss:   { label: 'Boss',   hp: 2.0, dmg: 1.15, levelBonus: 1, skills: ['e_enrage'] },
};

WL.Enemies = {
  build(tpl, level, rank = 'normal') {
    const a = WL.ARCHETYPES[tpl.arch] || WL.ARCHETYPES.humanoid;
    const r = WL.RANKS[rank];
    const lvl = level + r.levelBonus;
    const maxHp = Math.round((40 + lvl * 28 + lvl * lvl * 0.42) * a.hp * r.hp);
    const dmg = (3 + lvl * 1.9 + lvl * lvl * 0.012) * a.dmg * r.dmg;
    const skills = [...new Set([...(tpl.skills || a.skills), ...r.skills])];
    return {
      name: tpl.name, arch: tpl.arch, rank, level: lvl, maxHp,
      armor: Math.round(lvl * 18 * a.armor),
      crit: 5,
      weapon: { min: dmg * 0.8, max: dmg * 1.2, speed: a.speed },
      skills,
    };
  },
};
