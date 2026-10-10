// ---------------------------------------------------------------------------
// UI — renders game.state into #app. Pure-ish: reads state, writes HTML.
// Buttons carry data-action / data-arg; main.js routes clicks to game methods.
// Add a renderer for a new screen type in UI.screens.
// ---------------------------------------------------------------------------
WL.UI = (() => {
  const C = WL.CONFIG;
  let game = null;
  let anim = { screen: null, timer: null, i: 0 };

  // ----- helpers -----------------------------------------------------------
  const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const cls = () => WL.CLASSES[game.state.classKey];
  const rarityColor = r => C.rarities[r].color;
  const btn = (label, action, arg = '', extra = '') =>
    `<button class="btn ${extra}" data-action="${action}" data-arg="${esc(arg)}">${label}</button>`;
  const pct = (v, max) => Math.max(0, Math.min(100, (v / max) * 100));

  function itemName(item) {
    return `<span class="item-name" style="color:${rarityColor(item.rarity)}" data-item="${item.id}">[${esc(item.name)}]</span>`;
  }

  function powerDelta(item) {
    const d = game.powerWith(item) - game.power();
    if (d === 0) return `<span class="delta same">±0</span>`;
    return `<span class="delta ${d > 0 ? 'up' : 'down'}">${d > 0 ? '+' : ''}${d}</span>`;
  }

  function itemTooltip(item) {
    const slot = WL.ITEMS.slots[item.slot].label;
    const lines = [
      `<div class="tt-title" style="color:${rarityColor(item.rarity)}">${esc(item.name)}</div>`,
      `<div class="tt-row"><span>${slot}</span><span>${item.slot === 'weapon' ? '' : WL.CLASSES[game.state.classKey].armor}</span></div>`,
    ];
    if (item.weapon) {
      lines.push(`<div class="tt-row"><span>${item.weapon.min} - ${item.weapon.max} Damage</span><span>Speed ${item.weapon.speed.toFixed(2)}</span></div>`);
    }
    if (item.armor) lines.push(`<div>${item.armor} Armor</div>`);
    for (const [k, v] of Object.entries(item.stats)) {
      const green = k === 'ap' || k === 'sp';
      lines.push(`<div class="${green ? 'tt-green' : ''}">${green ? 'Equip: ' : ''}+${v} ${WL.Stats.NAMES[k]}</div>`);
    }
    lines.push(`<div class="tt-dim">Item Level ${item.ilvl}</div>`);
    const cur = game.state.gear[item.slot];
    if (cur && cur.id !== item.id) lines.push(`<div class="tt-cmp">Power vs equipped: ${powerDelta(item)}</div>`);
    else if (!cur) lines.push(`<div class="tt-cmp">Empty slot: ${powerDelta(item)}</div>`);
    lines.push(`<div class="tt-dim">Sells for <span class="coin">${WL.Loot.value(item)}g</span></div>`);
    return lines.join('');
  }

  function skillTooltip(sk) {
    const cost = typeof sk.cost === 'function' ? Math.round(sk.cost(game.state.level)) : sk.cost;
    const res = WL.CLASSES[game.state.classKey].resource.type;
    const meta = sk.type === 'passive' ? 'Passive'
      : [cost ? `${cost} ${res}` : 'No cost', sk.cd ? (sk.cd >= 99 ? 'Once per fight' : `${sk.cd} round cooldown`) : 'No cooldown'].join(', ');
    return `<div class="tt-title">${esc(sk.name)}</div><div class="tt-dim">${meta}</div><div class="tt-desc">${esc(sk.desc || '')}</div>`;
  }

  // ----- chrome -------------------------------------------------------------
  function xpBar() {
    const st = game.state;
    const cells = WL.TIERS.map((t, ti) => {
      const ticks = [];
      for (let l = t.min; l <= t.max; l++) {
        const state = l < st.level ? 'done' : l === st.level ? 'now' : '';
        ticks.push(`<i class="${state}"></i>`);
      }
      const zoneId = st.path[ti];
      const zone = zoneId ? t.zones.find(z => z.id === zoneId) : null;
      const label = zone ? zone.name : `${t.min}–${t.max}`;
      return `<div class="xp-seg ${ti === st.tier ? 'current' : ''} ${ti < st.tier ? 'cleared' : ''}" title="Levels ${t.min}–${t.max}${zone ? ': ' + esc(zone.name) : ''}">
        <div class="xp-ticks">${ticks.join('')}</div><div class="xp-label">${esc(label)}</div></div>`;
    }).join('');
    return `<div class="xpbar" aria-label="Level ${st.level} of 60">${cells}</div>`;
  }

  function topbar() {
    if (!game.state) return '';
    const st = game.state;
    return `<header class="topbar">
      <div class="brand">${esc(C.title)}</div>
      ${xpBar()}
      <div class="purse"><span class="coin">${st.gold}g</span><span class="potions" title="Healing potions are drunk automatically below ${Math.round(C.potionThreshold * 100)}% health">${st.potions} potion${st.potions === 1 ? '' : 's'}</span></div>
    </header>`;
  }

  function unitFrame({ name, level, hp, maxHp, res, color, initial, sub, id }) {
    return `<div class="unit" ${id ? `id="${id}"` : ''}>
      <div class="portrait" style="--c:${color}">${esc(initial)}<span class="lvl">${level}</span></div>
      <div class="unit-body">
        <div class="unit-name" style="color:${color}">${esc(name)}</div>
        ${sub ? `<div class="unit-sub">${esc(sub)}</div>` : ''}
        <div class="bar hp"><div class="fill" style="width:${pct(hp, maxHp)}%"></div><span class="bar-text">${Math.round(hp)} / ${maxHp}</span></div>
        ${res ? `<div class="bar res ${res.type}"><div class="fill" style="width:${pct(res.cur, res.max)}%"></div><span class="bar-text">${Math.round(res.cur)} / ${res.max}</span></div>` : ''}
      </div>
    </div>`;
  }

  function sheet() {
    const st = game.state;
    const s = game.stats();
    const c = cls();
    const locked = st.screen.type === 'combat';
    const statRows = [
      ['Strength', s.str], ['Agility', s.agi], ['Stamina', s.sta], ['Intellect', s.int], ['Spirit', s.spi],
      ['Attack Power', s.ap], ['Spell Power', s.sp], ['Crit', s.crit + '%'], ['Armor', s.armor],
    ].map(([k, v]) => `<div class="stat"><span>${k}</span><b>${v}</b></div>`).join('');

    const gear = Object.entries(WL.ITEMS.slots).map(([slot, def]) => {
      const it = st.gear[slot];
      return `<div class="slot"><span class="slot-label">${def.label}</span>${it ? itemName(it) : '<span class="empty">Empty</span>'}</div>`;
    }).join('');

    const bag = st.bag.length ? st.bag.map(it => `<div class="bag-row">${itemName(it)} ${powerDelta(it)}
        ${locked ? '' : btn('Equip', 'equip', it.id, 'small')}</div>`).join('')
      : '<p class="hint">Loot you don\'t equip goes here. Sell it at a vendor.</p>';

    const actives = st.skills.filter(id => WL.SKILLS[id].type === 'active');
    const skills = st.skills.map(id => {
      const sk = WL.SKILLS[id];
      const ai = actives.indexOf(id);
      const up = sk.type === 'active' && ai > 0 && !locked
        ? `<button class="icon-btn" data-action="skillUp" data-arg="${id}" title="Raise priority" aria-label="Raise ${esc(sk.name)} priority">▲</button>` : '';
      return `<div class="skill-row ${sk.type}" data-skill="${id}">
        <span class="skill-pri">${sk.type === 'active' ? ai + 1 : '◇'}</span>
        <span class="skill-name">${esc(sk.name)}</span>${up}</div>`;
    }).join('');

    return `<aside class="sheet">
      ${unitFrame({ name: c.name, level: st.level, hp: s.maxHp * st.hpFrac, maxHp: s.maxHp, color: c.color, initial: c.name[0],
        sub: `Power ${game.power()}`, res: { type: s.resource.type, cur: s.resource.start, max: s.resource.max } })}
      <section><h3>Attributes</h3><div class="stats">${statRows}</div></section>
      <section><h3>Abilities <span class="h-note">used top to bottom</span></h3><div class="skills">${skills}</div></section>
      <section><h3>Equipment</h3><div class="gear">${gear}</div></section>
      <section><h3>Bags <span class="h-note">${st.bag.length} items</span></h3><div class="bag">${bag}</div></section>
      <div class="sheet-foot">${btn('Abandon run', 'abandon', '', 'ghost small')}</div>
    </aside>`;
  }

  // ----- screens -------------------------------------------------------------
  const screens = {
    classSelect() {
      const cards = Object.entries(WL.CLASSES).map(([key, c]) => `
        <button class="class-card" data-action="newRun" data-arg="${key}" style="--c:${c.color}">
          <span class="class-name">${c.name}</span>
          <span class="class-role">${c.role}, uses ${c.resource.type}</span>
          <span class="class-blurb">${esc(c.blurb)}</span>
          <span class="class-skills">${[...c.starting].map(id => WL.SKILLS[id].name).join(', ')}</span>
        </button>`).join('');
      return `<div class="title-screen">
        <h1 class="logo">${esc(C.title)}</h1>
        <p class="tagline">One run from level 1 to 60. Twelve zones, one boss each. Die and you start over.</p>
        <div class="class-grid">${cards}</div>
      </div>`;
    },

    map() {
      const t = game.tierDef();
      const cards = t.zones.map(z => `
        <article class="zone">
          <h3>${esc(z.name)}</h3>
          <p class="zone-blurb">${esc(z.blurb)}</p>
          <p class="zone-foes"><span>Foes</span> ${z.enemies.map(e => esc(e.name)).join(', ')}</p>
          <p class="zone-boss"><span>Boss</span> ${esc(z.boss.name)}</p>
          ${btn(`Travel to ${esc(z.name)}`, 'chooseZone', z.id)}
        </article>`).join('');
      return `<div class="page">
        <h2>Levels ${t.min}–${t.max}</h2>
        <p class="lede">Choose where to quest next. Each zone has ${C.stepsPerNode} events and a boss; every event you finish is worth a level.</p>
        <div class="zones">${cards}</div>
      </div>`;
    },

    node() {
      const st = game.state;
      const z = game.zone();
      const steps = [];
      for (let i = 0; i <= C.stepsPerNode; i++) {
        const boss = i === C.stepsPerNode;
        steps.push(`<li class="${i < st.step ? 'done' : i === st.step ? 'now' : ''} ${boss ? 'boss' : ''}">${boss ? 'Boss' : 'Lv ' + (game.tierDef().min + i)}</li>`);
      }
      const choices = st.choices.map((ch, i) => {
        const ev = WL.EVENTS[ch.type];
        return `<button class="quest" data-action="chooseEvent" data-arg="${i}">
          <span class="quest-icon">${ev.icon}</span>
          <span class="quest-text"><span class="quest-name">${esc(ev.name)}</span><span class="quest-blurb">${esc(ev.blurb)}</span></span>
        </button>`;
      }).join('');
      return `<div class="page">
        <h2>${esc(z.name)}</h2>
        <ol class="steps" aria-label="Zone progress">${steps.join('')}</ol>
        <p class="lede">${st.step >= C.stepsPerNode ? `${esc(z.boss.name)} blocks the way out.` : 'Pick your next event.'}</p>
        <div class="quests">${choices}</div>
      </div>`;
    },

    combat() {
      const sc = game.state.screen;
      const c = cls();
      const s = game.stats();
      const e = sc.enemy;
      const rankTag = e.rank === 'normal' ? '' : WL.RANKS[e.rank].label;
      return `<div class="arena">
        <div class="frames">
          ${unitFrame({ id: 'uf-p', name: 'You', level: game.state.level, hp: sc.player.startHp, maxHp: sc.player.maxHp, color: c.color, initial: c.name[0],
            res: { type: s.resource.type, cur: s.resource.start, max: s.resource.max } })}
          <div class="versus">vs</div>
          ${unitFrame({ id: 'uf-e', name: e.name, level: e.level, hp: e.maxHp, maxHp: e.maxHp, color: e.rank === 'normal' ? '#e8c26a' : '#ff6a4d',
            initial: e.name[0], sub: [rankTag, e.arch].filter(Boolean).join(' ') })}
        </div>
        <div class="log" id="combat-log" aria-live="polite"></div>
        <div class="arena-actions" id="combat-actions">${btn('Skip', 'skipCombat', '', 'ghost')}</div>
      </div>`;
    },

    reward() {
      const sc = game.state.screen;
      const items = sc.itemIds.map(id => game.findItem(id)).filter(Boolean);
      const rows = items.map(it => {
        const inBag = game.state.bag.includes(it);
        return `<div class="loot-row">${itemName(it)} ${powerDelta(it)}
          ${inBag ? btn('Equip', 'equip', it.id, 'small') + btn(`Sell ${WL.Loot.value(it)}g`, 'sell', it.id, 'small ghost') : '<span class="hint">Equipped</span>'}</div>`;
      }).join('');
      return `<div class="page">
        <h2>${esc(sc.title)}</h2>
        ${sc.gold ? `<p class="lede">You receive <span class="coin">${sc.gold}g</span>.</p>` : ''}
        ${rows ? `<div class="loot">${rows}</div>` : '<p class="hint">No items this time.</p>'}
        <div class="page-actions">${btn(sc.then === 'tier' ? 'Leave the zone' : 'Continue', 'leave', '', 'primary')}</div>
      </div>`;
    },

    shop() {
      const st = game.state;
      const sc = st.screen;
      const wares = sc.items.map(it => {
        const price = WL.Loot.price(it);
        return `<div class="loot-row">${itemName(it)} ${powerDelta(it)}
          <button class="btn small" data-action="buy" data-arg="${it.id}" ${st.gold < price ? 'disabled' : ''}>Buy ${price}g</button></div>`;
      }).join('') || '<p class="hint">Sold out.</p>';
      const sellable = st.bag.map(it => `<div class="loot-row">${itemName(it)} ${powerDelta(it)}
          ${btn(`Sell ${WL.Loot.value(it)}g`, 'sell', it.id, 'small ghost')}</div>`).join('');
      return `<div class="page">
        <h2>Vendor</h2>
        <p class="lede">You have <span class="coin-ink">${st.gold}g</span>. Hover an item to compare it with what you're wearing.</p>
        <div class="loot">${wares}
          <div class="loot-row"><span class="item-name potion">[Healing Potion]</span><span class="hint">Restores ${Math.round(C.potionHealPct * 100)}% health</span>
          <button class="btn small" data-action="buyPotion" ${st.gold < sc.potionPrice ? 'disabled' : ''}>Buy ${sc.potionPrice}g</button></div>
        </div>
        ${sellable ? `<h3>Sell from your bags</h3><div class="loot">${sellable}</div>
          <div class="page-actions left">${btn('Sell everything that isn\'t an upgrade', 'sellJunk', '', 'ghost small')}</div>` : ''}
        <div class="page-actions">${btn('Leave the vendor', 'leave', '', 'primary')}</div>
      </div>`;
    },

    trainer() {
      const sc = game.state.screen;
      const cards = sc.options.map(id => {
        const sk = WL.SKILLS[id];
        return `<button class="quest" data-action="learn" data-arg="${id}" data-skill="${id}">
          <span class="quest-icon">${sk.type === 'passive' ? '◇' : '✦'}</span>
          <span class="quest-text"><span class="quest-name">${esc(sk.name)} <span class="tag">${sk.type === 'passive' ? 'Talent' : 'Ability'}</span></span>
          <span class="quest-blurb">${esc(sk.desc)}</span></span></button>`;
      }).join('');
      return `<div class="page">
        <h2>Class Trainer</h2>
        <p class="lede">Learn one. Abilities join the end of your priority list; reorder them in the sidebar.</p>
        <div class="quests">${cards}</div>
        <div class="page-actions">${btn('Leave without training', 'leave', '', 'ghost')}</div>
      </div>`;
    },

    rest() {
      const c = cls();
      const top = Object.entries(c.statWeights).filter(([k]) => WL.Stats.PRIMARY.includes(k)).sort((a, b) => b[1] - a[1])[0][0];
      const amt = C.restTrainStat(game.state.level);
      return `<div class="page">
        <h2>The Inn</h2>
        <p class="lede">A warm hearth and a soft bed. You have time for one thing.</p>
        <div class="quests">
          <button class="quest" data-action="restHeal"><span class="quest-icon">☾</span><span class="quest-text">
            <span class="quest-name">Sleep</span><span class="quest-blurb">Recover ${Math.round(C.restHealPct * 100)}% of your health.</span></span></button>
          <button class="quest" data-action="restTrain"><span class="quest-icon">⚒</span><span class="quest-text">
            <span class="quest-name">Train</span><span class="quest-blurb">Permanently gain ${amt} ${WL.Stats.NAMES[top]}${top === 'sta' ? '' : ` and ${Math.ceil(amt / 2)} Stamina`}.</span></span></button>
        </div>
      </div>`;
    },

    gameover() {
      const st = game.state;
      return `<div class="page end">
        <h2>You have died</h2>
        <p class="lede">Slain by ${esc(st.screen.killer)} at level ${st.level} in ${esc(game.zone() ? game.zone().name : '')}.</p>
        ${summary()}
        <div class="page-actions">${btn('Start a new run', 'abandon', '', 'primary')}</div>
      </div>`;
    },

    victory() {
      return `<div class="page end">
        <h2>Level 60</h2>
        <p class="lede">The final boss is dead. You reached the level cap in a single life.</p>
        ${summary()}
        <div class="page-actions">${btn('Start a new run', 'abandon', '', 'primary')}</div>
      </div>`;
    },
  };

  function summary() {
    const st = game.state;
    const route = st.path.map((id, i) => WL.TIERS[i].zones.find(z => z.id === id).name).join(' → ');
    return `<dl class="summary">
      <div><dt>Class</dt><dd>${cls().name}</dd></div>
      <div><dt>Power</dt><dd>${game.power()}</dd></div>
      <div><dt>Kills</dt><dd>${st.kills}</dd></div>
      <div><dt>Gold</dt><dd>${st.gold}g</dd></div>
      <div class="wide"><dt>Route</dt><dd>${esc(route)}</dd></div>
    </dl>`;
  }

  // ----- combat playback -------------------------------------------------------
  function setBar(frameId, kind, cur, max) {
    const frame = document.getElementById(frameId);
    if (!frame) return;
    const bar = frame.querySelector(`.bar.${kind}`);
    if (!bar) return;
    bar.querySelector('.fill').style.width = pct(cur, max) + '%';
    bar.querySelector('.bar-text').textContent = `${Math.max(0, Math.round(cur))} / ${max}`;
  }

  function appendLog(entry) {
    const log = document.getElementById('combat-log');
    if (!log) return;
    const sc = game.state.screen;
    const div = document.createElement('div');
    div.className = `log-line ${entry.who}${entry.crit ? ' crit' : ''}${entry.heal ? ' heal' : ''}${entry.end ? ' end' : ''}`;
    div.innerHTML = `<span class="rnd">${entry.round || ''}</span>${esc(entry.text)}`;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    setBar('uf-p', 'hp', entry.p, sc.player.maxHp);
    setBar('uf-e', 'hp', entry.e, sc.enemy.maxHp);
    setBar('uf-p', 'res', entry.pr, sc.player.res.max);
  }

  function finishPlayback() {
    clearTimeout(anim.timer);
    const sc = game.state.screen;
    const log = sc.result.log;
    while (anim.i < log.length) appendLog(log[anim.i++]);
    const actions = document.getElementById('combat-actions');
    if (actions) actions.innerHTML = btn(sc.result.won ? 'Collect your spoils' : 'Release spirit', 'finishCombat', '', 'primary');
    const focus = actions && actions.querySelector('button');
    if (focus) focus.focus();
  }

  function playCombat() {
    const sc = game.state.screen;
    clearTimeout(anim.timer);
    anim = { screen: sc, timer: null, i: 0 };
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return finishPlayback();
    const step = () => {
      if (anim.screen !== game.state.screen) return;
      if (anim.i >= sc.result.log.length) return finishPlayback();
      appendLog(sc.result.log[anim.i++]);
      anim.timer = setTimeout(step, C.logStepMs);
    };
    step();
  }

  // ----- tooltip ------------------------------------------------------------------
  function bindTooltip() {
    const tip = document.getElementById('tooltip');
    const show = (html, x, y) => {
      tip.innerHTML = html; tip.hidden = false;
      const r = tip.getBoundingClientRect();
      const left = Math.min(x + 16, window.innerWidth - r.width - 8);
      const top = y + 16 + r.height > window.innerHeight ? y - r.height - 12 : y + 16;
      tip.style.left = Math.max(8, left) + 'px';
      tip.style.top = Math.max(8, top) + 'px';
    };
    document.addEventListener('mousemove', ev => {
      if (!game.state) { tip.hidden = true; return; }
      const it = ev.target.closest('[data-item]');
      const sk = ev.target.closest('[data-skill]');
      if (it) { const item = game.findItem(it.dataset.item); if (item) return show(itemTooltip(item), ev.clientX, ev.clientY); }
      if (sk) return show(skillTooltip(WL.SKILLS[sk.dataset.skill]), ev.clientX, ev.clientY);
      tip.hidden = true;
    });
    document.addEventListener('click', () => { tip.hidden = true; });
  }

  // ----- public ----------------------------------------------------------------------
  return {
    screens,
    init(g) { game = g; bindTooltip(); },
    skip() { finishPlayback(); },
    render() {
      const app = document.getElementById('app');
      if (!game.state) {
        app.innerHTML = `<main class="solo">${screens.classSelect()}</main>`;
        return;
      }
      const sc = game.state.screen;
      const body = (screens[sc.type] || (() => `<div class="page"><p>Unknown screen: ${esc(sc.type)}</p></div>`))();
      app.innerHTML = `${topbar()}<main class="layout"><section class="stage">${body}</section>${sheet()}</main>`;
      if (sc.type === 'combat' && anim.screen !== sc) playCombat();
      else if (sc.type === 'combat') { anim.i = 0; finishPlayback(); }
    },
  };
})();
