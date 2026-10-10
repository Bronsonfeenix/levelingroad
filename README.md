# Ironvale Idle

A classic-MMO inspired idle RPG that runs entirely in the browser. Your warrior stands on the left, enemies march in from the right, and every kill brings experience, gold and loot. Reach level 60 and conquer the Ashen Wastes.

## Features

- **Auto-combat** with rage and a *Mighty Strike* ability; tap or click the battlefield to strike faster
- **Levels 1–60** using a classic-style XP curve, with gray/green/yellow/orange/red enemy levels
- **6 zones**, each with its own enemies, colors and weather (leaves, fireflies, dust, snow, embers)
- **Loot** in Poor → Epic quality across 6 gear slots, with stats, upgrade arrows and comparisons
- **Trainer** upgrades bought with gold, and **talents** from level 10
- **Elite** enemies that hit harder and always drop loot
- **Autosave**, **offline progress** (50% speed, up to 12 hours), and save export/import
- Works on desktop and mobile

## Publish on GitHub Pages

1. Create a new repository on GitHub (for example `ironvale-idle`).
2. Upload everything in this folder to the repository root: `index.html`, `.nojekyll`, `css/`, `js/` and this README.
   - On the website: **Add file → Upload files**, drag the files in, then **Commit changes**.
   - Or from a terminal:
     ```bash
     git init
     git add .
     git commit -m "Ironvale Idle"
     git branch -M main
     git remote add origin https://github.com/<your-username>/ironvale-idle.git
     git push -u origin main
     ```
3. In the repository, open **Settings → Pages**.
4. Under **Build and deployment**, set **Source** to *Deploy from a branch*, choose **main** and **/ (root)**, and click **Save**.
5. After a minute or two your game is live at `https://<your-username>.github.io/ironvale-idle/`.

To test locally, just open `index.html` in a browser — there is no build step.

## Project layout

```
index.html      page layout: top bar, battlefield, menu tabs
css/style.css   all styling
js/data.js      ← balance & content: zones, enemies, items, upgrades, talents, formulas
js/render.js    canvas drawing: background, hero, enemies, effects
js/game.js      game loop, combat, loot, saving, menus
```

## Tweaking the game

Almost everything you'd want to change lives in `js/data.js`:

| Want to… | Change |
| --- | --- |
| Level faster or slower | `CONFIG.XP_RATE` |
| Earn more gold | `CONFIG.GOLD_RATE` |
| More loot / elites | `CONFIG.BASE_LOOT_CHANCE`, `CONFIG.ELITE_CHANCE` |
| Add a zone | add an entry to `ZONES` (palette, weather, scenery, enemies) |
| Add an enemy | add to a zone's `enemies` list; `type` is `quad`, `biped`, `spider` or `blob` |
| Add a trainer upgrade or talent | add to `UPGRADES` / `TALENTS`, then use its `id` in `calc()` in `game.js` |

If you change the save format in a way that breaks old saves, bump `CONFIG.SAVE_KEY`.

## Ideas for next steps

- More classes (Mage, Rogue, Hunter) with their own abilities
- Dungeons/bosses every 10 levels, rested XP, quests with bonus rewards
- Prestige ("rebirth") after level 60 for permanent bonuses
- Sound effects and music

*Fan-made project inspired by classic MMOs. Not affiliated with Blizzard Entertainment.*
