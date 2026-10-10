# The Leveling Road

A World of Warcraft Classic inspired idle RPG that runs entirely in the browser. Choose your faction, race and class, then fight your way from your race's starting zone to level 60. Your hero stands on the left and enemies march in from the right. Every kill brings experience, gold and loot.

## Features

- **Character creation**: Alliance or Horde, 8 races (Human, Dwarf, Night Elf, Gnome, Orc, Undead, Tauren, Troll) and all 9 Classic classes, with the original race/class restrictions
- **Class-based combat**: each class fights with its real abilities and resource:
  - Warriors build **Rage**, Rogues spend **Energy** and combo points, everyone else uses **Mana**
  - Hunters fight alongside a beast; Warlocks summon an Imp or Voidwalker
  - Druids shapeshift into Cat Form when Feral
- **Spellbook & Trainer**: learn new spell ranks for gold as you level (optionally automatic)
- **Full Classic talent trees**: 3 trees per class (431 talents) with the original tier and column layout, prerequisites, the 5-points-per-tier rule and 31-point abilities such as Mortal Strike, Pyroblast and Shadowform
- **Heroes drawn by race and class**: tusks, horns, beards and ears by race; plate, robes, hoods, hats and staves by class; equipped gear shows on the character
- **Real leveling route**: race starting zones such as Elwynn Forest, Durotar and Teldrassil, then Westfall or The Barrens and Duskwood or Ashenvale, then Stranglethorn Vale, Tanaris, Un'Goro Crater and the Burning Steppes. Mobs and named elites come from those zones
- **Loot**: Poor → Epic items in your class's armor type (cloth / leather / mail / plate) and weapon types, with Classic suffixes ("of the Bear", "of the Owl"…)
- **Professions** (Blacksmithing, Cooking, First Aid, Skinning, Riding…) bought with gold for permanent bonuses
- **Autosave**, **offline progress** (50% speed, up to 12 hours), and save export/import
- Works on desktop and mobile

## Publish on GitHub Pages

1. Push this folder to a GitHub repository (`index.html`, `.nojekyll`, `css/`, `js/` and this README at the root).
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to *Deploy from a branch*, choose **main** and **/ (root)**, and click **Save**.
4. After a minute or two your game is live at `https://<your-username>.github.io/<repo-name>/`.

To test locally, just open `index.html` in a browser — there is no build step. Add `?debug` to the URL to get a `dbg` console helper (`dbg.level(40)`, `dbg.gold(100)`).

## Project layout

```
index.html      page layout: top bar, battlefield, menu tabs, character creation overlay
css/style.css   all styling
js/data.js      ← zones, mobs, items, professions, balance formulas
js/classes.js   ← factions, races, classes and their abilities (rotation order = priority)
js/talents.js   ← talent trees (3 per class) and their effects
js/render.js    canvas drawing: backgrounds, heroes, pets, enemies, spell effects
js/game.js      character creation, combat engine, loot, saving, menus
```

## Tweaking the game

| Want to… | Change |
| --- | --- |
| Level faster or slower | `CONFIG.XP_RATE` in `data.js` |
| Earn more gold | `CONFIG.GOLD_RATE` |
| More loot / elites | `CONFIG.BASE_LOOT_CHANCE`, `CONFIG.ELITE_CHANCE` |
| Add a zone | add an entry to `ZONES` (faction or races, palette, weather, scenery, mobs, elites) |
| Add a mob | add to a zone's `enemies`; `type` is `quad`, `biped`, `spider` or `blob` |
| Change an ability | edit it in `CLASSES.<class>.abilities` — the list order is the rotation priority |
| Change a talent | edit its row in `TALENT_TREES`; effects use the keys documented at the top of `talents.js` |

### Original WoW art

The UI can use original World of Warcraft art: unit frames, dialog borders, buttons, tabs, coins, the Friz Quadrata font, talent tree backgrounds, and spell, item, race and faction icons. Each file is optional, and missing ones fall back to the built-in look. [ASSETS.md](ASSETS.md) lists every file, where it goes and where to get it.

### Talent icons

Talent icons are loaded from `icons/<Class>/talents/<Talent Name>.jpg` (a `.png` also works). For example: `icons/Warlock/talents/Shadow Mastery.jpg`. The file name must match the talent name exactly, including capitals and apostrophes. Each class folder has a `_talents.txt` listing every expected file name. A talent without an icon shows its emoji instead.

If you change the save format in a way that breaks old saves, bump `CONFIG.SAVE_KEY`.

*Fan-made project inspired by World of Warcraft Classic. Not affiliated with or endorsed by Blizzard Entertainment. World of Warcraft names are trademarks of Blizzard Entertainment.*
