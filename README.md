# Azerothlike

A browser roguelike inspired by worldslike.com, re-themed around Classic WoW.
One life, level 1 to 60. Twelve tiers of five levels; at each tier you pick a zone,
work through its events, and kill its boss to move on.

No build step, no dependencies. Open `index.html` in a browser, or serve the folder
(`npx serve .` or `python3 -m http.server`) and deploy it to any static host
(GitHub Pages, Netlify, Cloudflare Pages).

## How a run works

```
Pick class ─► Tier 1 (Lv 1–5): choose Elwynn Forest or Durotar
                 │
                 ├─ Step 1 (Lv 1): choose 1 of 3 events ─┐
                 ├─ Step 2 (Lv 2): choose 1 of 3 events  │ each finished event = +1 level
                 ├─ Step 3 (Lv 3): ...                   │
                 ├─ Step 4 (Lv 4): ...                  ─┘
                 └─ Boss   (Lv 5): win to leave the zone
              ► Tier 2 (Lv 6–10): choose Westfall or Silverpine ... ► Tier 12 (Lv 56–60) ► Victory
```

Power comes from three places:

| Source  | Where it comes from                         | What it changes |
|---------|---------------------------------------------|-----------------|
| Levels  | +1 per finished event, tier minimum on entry | Base stats, health, mana, enemy level |
| Gear    | Fights, elites, bosses, treasure, vendors    | Primary stats, armor, weapon damage |
| Skills  | Class trainer events                         | New abilities (actives) and talents (passives) |

Plus smaller levers: the Inn (heal or permanently train a stat), potions (auto-drunk
in combat), and the ability priority list you can reorder in the sidebar.

Combat is an auto-battler: it's resolved instantly when you enter a fight and the log
is played back. Your decisions happen *between* fights: route, gear, skills, priority.

## Files

```
index.html              script load order (config → data → engine → ui → main)
css/style.css           all styling (tokens at the top)
js/config.js            tuning knobs: run length, drop tables, gold, event weights, rarities
js/util/rng.js          seeded RNG; runs are reproducible and saves don't reroll
js/data/
  classes.js            9 classes: stats, growth, resource, armor type, starting skills
  skills.js             every ability and talent, plus enemy abilities
  enemies.js            archetypes (beast, caster, undead…), ranks, enemy stat scaling
  zones.js              the 12 tiers, their zones, enemy lists and bosses
  items.js              slots, armor bases, "of the Bear" suffixes, name prefixes
js/engine/
  stats.js              state → combat stats, and the single "Power" number
  loot.js               procedural item generator, sell/buy prices
  combat.js             round-based auto-battle simulation and log
  events.js             event types (fight, elite, boss, shop, trainer, rest, treasure)
  game.js               run state + every action the UI can trigger; save/load
js/ui/render.js         renders each screen, tooltips, combat playback
js/main.js              routes data-action clicks to game methods, saves, re-renders
tools/simulate.js       headless balance tester (Node)
```

Everything hangs off one global, `WL`. In the browser console, `WL.game.state` is the
live run and `WL.game.stats()` shows computed stats.

## Extending it

**A new skill or talent** — add an entry to `js/data/skills.js`. Actives get `cost`, `cd`,
optional `cond`, and a `use(c)` function built from the combat helpers documented at the
top of that file (`c.hit`, `c.dot`, `c.heal`, `c.shield`, `c.stun`, `c.buff`, …).
Passives get `mods` (`pct` / `flat` changes to stats) and/or an `onRound(c)` hook for
pets and procs. Set `class` and `minLevel` and trainers will start offering it.

**A new class** — add it to `js/data/classes.js` and give it skills with a matching `class`.

**A new zone** — add an object to a tier's `zones` array in `js/data/zones.js`.
A third zone in a tier shows up on the map automatically. Zones can override
`eventWeights` (e.g. a city zone with lots of vendors).

**A new event type** — add it to `WL.EVENTS` in `js/engine/events.js` with a `start(game)`
function, give it a weight in `CONFIG.eventWeights`, and if it needs its own screen,
add a renderer to `UI.screens` in `js/ui/render.js` and any actions as methods on `Game`.
Good next ones: a quest giver (accept a harder fight for a named reward), a mystery
event with a choice, a profession node (craft one item from a list), a dungeon tier
that chains two elites back to back.

**Hand-made items** — the generator lives in `js/engine/loot.js`. To drop named
uniques from specific bosses, add an item list to a zone's boss and push those items
in `Game.finishCombat` when `rank === 'boss'`.

## Balancing

Most numbers live in `js/config.js` and `js/data/enemies.js` (`Enemies.build` holds
the enemy HP/damage curves). After changing anything, run:

```
node tools/simulate.js          # 200 bot runs per class
node tools/simulate.js 500 mage # one class
```

It plays full runs with a simple greedy bot and prints win rate, average level reached,
and the tier where the median death happens. At the time of writing a bot clears all
60 levels roughly 25–85% of the time depending on class (warrior, mage and rogue are
the hardest; priest and warlock the easiest). A human who reorders skills and shops
well should do better than the bot.

## Saves

The run is saved to `localStorage` after every action and resumed on load. Bump
`CONFIG.saveVersion` when you change the state shape so old saves are discarded
instead of breaking.

## A note on names and art

This is a fan project. Zone, class and boss names are used as text only; there is no
Blizzard art, logos, icons or audio in the project, and the icons are Unicode glyphs.
Keep it that way if you publish it: don't pull in ripped game assets, don't call it
"World of Warcraft" in the title, and read Blizzard's fan content / legal FAQ before
putting it online, especially if you plan to monetize it.
