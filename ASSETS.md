# Original World of Warcraft assets

The game uses original WoW art when the files below exist and falls back to its own look when they don't. You can add them one at a time. Nothing in the repository downloads them for you.

> These are Blizzard Entertainment's copyrighted files. Putting them in a public repository or on GitHub Pages redistributes them, so only add them if you're comfortable with that. Replace them if the project ever becomes commercial.

## How to get the files

- **Interface textures (PNG):** [Gethe/wow-ui-textures](https://github.com/Gethe/wow-ui-textures) holds the game's Interface folder already converted to PNG. Switch to the branch for Classic Era and copy files keeping their folder names. `.png`, `.PNG` and `.jpg` all work.
- **Straight from the game:** [wago.tools](https://wago.tools/files) lets you browse and download any file from a Classic Era build. Textures come as ``.blp``, which you can convert to PNG with a BLP converter such as [BLPConverter](https://github.com/Kanma/BLPConverter).
- **Icons:** every icon can be downloaded from Wowhead's CDN: `https://wow.zamimg.com/images/wow/icons/large/<iconname>.jpg`. To find the right icon for a spell, open its Wowhead page (search links below) and click the icon. You can also browse all icons on the [Wowhead icon list](https://www.wowhead.com/classic/icons).

File names are case-sensitive on GitHub Pages, so keep the capitalisation shown here.

> **Testing locally:** the dialog and tooltip borders are rebuilt in the browser, and browsers only allow that when the page is served over http. To see them, run ``python -m http.server`` in the project folder and open http://localhost:8000. Everything else also works when you open ``index.html`` directly.

## Interface textures

| File in this project | Used for | Source |
| --- | --- | --- |
| `assets/fonts/FRIZQT__.TTF` | Font for all text (Friz Quadrata) | [wago.tools: fonts/frizqt__.ttf](https://wago.tools/files) (game client, ``Fonts`` folder) |
| `assets/Interface/FrameGeneral/UI-Background-Rock.png` | Page background | [FrameGeneral/UI-Background-Rock](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/framegeneral/ui-background-rock.blp` |
| `assets/Interface/DialogFrame/UI-DialogBox-Background.png` | Panel, dialog, creation screen and character sheet background | [DialogFrame/UI-DialogBox-Background](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/dialogframe/ui-dialogbox-background.blp` |
| `assets/Interface/DialogFrame/UI-DialogBox-Border.png` | Gold/grey dialog border | [DialogFrame/UI-DialogBox-Border](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/dialogframe/ui-dialogbox-border.blp` |
| `assets/Interface/DialogFrame/UI-DialogBox-Header.png` | Title plate on dialogs | [DialogFrame/UI-DialogBox-Header](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/dialogframe/ui-dialogbox-header.blp` |
| `assets/Interface/Tooltips/UI-Tooltip-Border.png` | Tooltip border, inner boxes | [Tooltips/UI-Tooltip-Border](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/tooltips/ui-tooltip-border.blp` |
| `assets/Interface/TargetingFrame/UI-TargetingFrame.png` | Player and target unit frames | [TargetingFrame/UI-TargetingFrame](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/targetingframe/ui-targetingframe.blp` |
| `assets/Interface/TargetingFrame/UI-TargetingFrame-Elite.png` | Gold dragon frame for elites | [TargetingFrame/UI-TargetingFrame-Elite](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/targetingframe/ui-targetingframe-elite.blp` |
| `assets/Interface/TargetingFrame/UI-StatusBar.png` | Health, mana, rage, energy, XP and cast bar fill | [TargetingFrame/UI-StatusBar](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/targetingframe/ui-statusbar.blp` |
| `assets/Interface/CastingBar/UI-CastingBar-Border.png` | Cast bar border | [CastingBar/UI-CastingBar-Border](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/castingbar/ui-castingbar-border.blp` |
| `assets/Interface/Buttons/UI-Panel-Button-Up.png` | Red buttons | [Buttons/UI-Panel-Button-Up](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/buttons/ui-panel-button-up.blp` |
| `assets/Interface/Buttons/UI-Panel-Button-Down.png` | Pressed buttons | [Buttons/UI-Panel-Button-Down](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/buttons/ui-panel-button-down.blp` |
| `assets/Interface/Buttons/UI-Panel-Button-Disabled.png` | Disabled buttons | [Buttons/UI-Panel-Button-Disabled](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/buttons/ui-panel-button-disabled.blp` |
| `assets/Interface/PaperDollInfoFrame/UI-Character-ActiveTab.png` | Selected menu tab | [PaperDollInfoFrame/UI-Character-ActiveTab](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/paperdollinfoframe/ui-character-activetab.blp` |
| `assets/Interface/PaperDollInfoFrame/UI-Character-InActiveTab.png` | Other menu tabs | [PaperDollInfoFrame/UI-Character-InActiveTab](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/paperdollinfoframe/ui-character-inactivetab.blp` |
| `assets/Interface/PaperDoll/UI-Backpack-EmptySlot.png` | Bag slots | [PaperDoll/UI-Backpack-EmptySlot](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/paperdoll/ui-backpack-emptyslot.blp` |
| `assets/Interface/Buttons/UI-EmptySlot-Disabled.png` | Bag slots (used if UI-Backpack-EmptySlot is missing) | [Buttons/UI-EmptySlot-Disabled](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/buttons/ui-emptyslot-disabled.blp` |
| `assets/Interface/MoneyFrame/UI-GoldIcon.png` | Gold coin | [MoneyFrame/UI-GoldIcon](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/moneyframe/ui-goldicon.blp` |
| `assets/Interface/MoneyFrame/UI-SilverIcon.png` | Silver coin | [MoneyFrame/UI-SilverIcon](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/moneyframe/ui-silvericon.blp` |
| `assets/Interface/MoneyFrame/UI-CopperIcon.png` | Copper coin | [MoneyFrame/UI-CopperIcon](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/moneyframe/ui-coppericon.blp` |
| `assets/Interface/Glues/LoadingScreens/LoadScreenEasternKingdom.png` | Character creation background (Alliance) | [Glues/LoadingScreens/LoadScreenEasternKingdom](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/glues/loadingscreens/loadscreeneasternkingdom.blp` |
| `assets/Interface/Glues/LoadingScreens/LoadScreenKalimdor.png` | Character creation background (Horde) | [Glues/LoadingScreens/LoadScreenKalimdor](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/glues/loadingscreens/loadscreenkalimdor.blp` |
| `assets/Interface/DressUpFrame/DressUpBackground-Human1.png` | Character sheet scene behind the model (Human, piece 1 of 4) | [DressUpFrame/DressUpBackground-Human1](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/dressupframe/dressupbackground-human1.blp` |
| `assets/Interface/DressUpFrame/DressUpBackground-Human2.png` | Character sheet scene behind the model (Human, piece 2 of 4) | [DressUpFrame/DressUpBackground-Human2](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/dressupframe/dressupbackground-human2.blp` |
| `assets/Interface/DressUpFrame/DressUpBackground-Human3.png` | Character sheet scene behind the model (Human, piece 3 of 4) | [DressUpFrame/DressUpBackground-Human3](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/dressupframe/dressupbackground-human3.blp` |
| `assets/Interface/DressUpFrame/DressUpBackground-Human4.png` | Character sheet scene behind the model (Human, piece 4 of 4) | [DressUpFrame/DressUpBackground-Human4](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/dressupframe/dressupbackground-human4.blp` |
| `assets/Interface/DressUpFrame/DressUpBackground-Dwarf1.png` | Character sheet scene behind the model (Dwarf, piece 1 of 4) | [DressUpFrame/DressUpBackground-Dwarf1](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/dressupframe/dressupbackground-dwarf1.blp` |
| `assets/Interface/DressUpFrame/DressUpBackground-Dwarf2.png` | Character sheet scene behind the model (Dwarf, piece 2 of 4) | [DressUpFrame/DressUpBackground-Dwarf2](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/dressupframe/dressupbackground-dwarf2.blp` |
| `assets/Interface/DressUpFrame/DressUpBackground-Dwarf3.png` | Character sheet scene behind the model (Dwarf, piece 3 of 4) | [DressUpFrame/DressUpBackground-Dwarf3](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/dressupframe/dressupbackground-dwarf3.blp` |
| `assets/Interface/DressUpFrame/DressUpBackground-Dwarf4.png` | Character sheet scene behind the model (Dwarf, piece 4 of 4) | [DressUpFrame/DressUpBackground-Dwarf4](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/dressupframe/dressupbackground-dwarf4.blp` |
| `assets/Interface/DressUpFrame/DressUpBackground-NightElf1.png` | Character sheet scene behind the model (NightElf, piece 1 of 4) | [DressUpFrame/DressUpBackground-NightElf1](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/dressupframe/dressupbackground-nightelf1.blp` |
| `assets/Interface/DressUpFrame/DressUpBackground-NightElf2.png` | Character sheet scene behind the model (NightElf, piece 2 of 4) | [DressUpFrame/DressUpBackground-NightElf2](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/dressupframe/dressupbackground-nightelf2.blp` |
| `assets/Interface/DressUpFrame/DressUpBackground-NightElf3.png` | Character sheet scene behind the model (NightElf, piece 3 of 4) | [DressUpFrame/DressUpBackground-NightElf3](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/dressupframe/dressupbackground-nightelf3.blp` |
| `assets/Interface/DressUpFrame/DressUpBackground-NightElf4.png` | Character sheet scene behind the model (NightElf, piece 4 of 4) | [DressUpFrame/DressUpBackground-NightElf4](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/dressupframe/dressupbackground-nightelf4.blp` |
| `assets/Interface/DressUpFrame/DressUpBackground-Gnome1.png` | Character sheet scene behind the model (Gnome, piece 1 of 4) | [DressUpFrame/DressUpBackground-Gnome1](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/dressupframe/dressupbackground-gnome1.blp` |
| `assets/Interface/DressUpFrame/DressUpBackground-Gnome2.png` | Character sheet scene behind the model (Gnome, piece 2 of 4) | [DressUpFrame/DressUpBackground-Gnome2](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/dressupframe/dressupbackground-gnome2.blp` |
| `assets/Interface/DressUpFrame/DressUpBackground-Gnome3.png` | Character sheet scene behind the model (Gnome, piece 3 of 4) | [DressUpFrame/DressUpBackground-Gnome3](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/dressupframe/dressupbackground-gnome3.blp` |
| `assets/Interface/DressUpFrame/DressUpBackground-Gnome4.png` | Character sheet scene behind the model (Gnome, piece 4 of 4) | [DressUpFrame/DressUpBackground-Gnome4](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/dressupframe/dressupbackground-gnome4.blp` |
| `assets/Interface/DressUpFrame/DressUpBackground-Orc1.png` | Character sheet scene behind the model (Orc, piece 1 of 4) | [DressUpFrame/DressUpBackground-Orc1](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/dressupframe/dressupbackground-orc1.blp` |
| `assets/Interface/DressUpFrame/DressUpBackground-Orc2.png` | Character sheet scene behind the model (Orc, piece 2 of 4) | [DressUpFrame/DressUpBackground-Orc2](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/dressupframe/dressupbackground-orc2.blp` |
| `assets/Interface/DressUpFrame/DressUpBackground-Orc3.png` | Character sheet scene behind the model (Orc, piece 3 of 4) | [DressUpFrame/DressUpBackground-Orc3](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/dressupframe/dressupbackground-orc3.blp` |
| `assets/Interface/DressUpFrame/DressUpBackground-Orc4.png` | Character sheet scene behind the model (Orc, piece 4 of 4) | [DressUpFrame/DressUpBackground-Orc4](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/dressupframe/dressupbackground-orc4.blp` |
| `assets/Interface/DressUpFrame/DressUpBackground-Scourge1.png` | Character sheet scene behind the model (Scourge, piece 1 of 4) | [DressUpFrame/DressUpBackground-Scourge1](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/dressupframe/dressupbackground-scourge1.blp` |
| `assets/Interface/DressUpFrame/DressUpBackground-Scourge2.png` | Character sheet scene behind the model (Scourge, piece 2 of 4) | [DressUpFrame/DressUpBackground-Scourge2](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/dressupframe/dressupbackground-scourge2.blp` |
| `assets/Interface/DressUpFrame/DressUpBackground-Scourge3.png` | Character sheet scene behind the model (Scourge, piece 3 of 4) | [DressUpFrame/DressUpBackground-Scourge3](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/dressupframe/dressupbackground-scourge3.blp` |
| `assets/Interface/DressUpFrame/DressUpBackground-Scourge4.png` | Character sheet scene behind the model (Scourge, piece 4 of 4) | [DressUpFrame/DressUpBackground-Scourge4](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/dressupframe/dressupbackground-scourge4.blp` |
| `assets/Interface/DressUpFrame/DressUpBackground-Tauren1.png` | Character sheet scene behind the model (Tauren, piece 1 of 4) | [DressUpFrame/DressUpBackground-Tauren1](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/dressupframe/dressupbackground-tauren1.blp` |
| `assets/Interface/DressUpFrame/DressUpBackground-Tauren2.png` | Character sheet scene behind the model (Tauren, piece 2 of 4) | [DressUpFrame/DressUpBackground-Tauren2](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/dressupframe/dressupbackground-tauren2.blp` |
| `assets/Interface/DressUpFrame/DressUpBackground-Tauren3.png` | Character sheet scene behind the model (Tauren, piece 3 of 4) | [DressUpFrame/DressUpBackground-Tauren3](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/dressupframe/dressupbackground-tauren3.blp` |
| `assets/Interface/DressUpFrame/DressUpBackground-Tauren4.png` | Character sheet scene behind the model (Tauren, piece 4 of 4) | [DressUpFrame/DressUpBackground-Tauren4](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/dressupframe/dressupbackground-tauren4.blp` |
| `assets/Interface/DressUpFrame/DressUpBackground-Troll1.png` | Character sheet scene behind the model (Troll, piece 1 of 4) | [DressUpFrame/DressUpBackground-Troll1](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/dressupframe/dressupbackground-troll1.blp` |
| `assets/Interface/DressUpFrame/DressUpBackground-Troll2.png` | Character sheet scene behind the model (Troll, piece 2 of 4) | [DressUpFrame/DressUpBackground-Troll2](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/dressupframe/dressupbackground-troll2.blp` |
| `assets/Interface/DressUpFrame/DressUpBackground-Troll3.png` | Character sheet scene behind the model (Troll, piece 3 of 4) | [DressUpFrame/DressUpBackground-Troll3](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/dressupframe/dressupbackground-troll3.blp` |
| `assets/Interface/DressUpFrame/DressUpBackground-Troll4.png` | Character sheet scene behind the model (Troll, piece 4 of 4) | [DressUpFrame/DressUpBackground-Troll4](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/dressupframe/dressupbackground-troll4.blp` |
| `assets/Interface/MainMenuBar/UI-MainMenuBar-Dwarf.png` | Action bar | [MainMenuBar/UI-MainMenuBar-Dwarf](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/mainmenubar/ui-mainmenubar-dwarf.blp` |
| `assets/Interface/QuestFrame/QuestBG.png` | Quest log parchment | [QuestFrame/QuestBG](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/questframe/questbg.blp` |
| `assets/Interface/QuestFrame/UI-QuestLog-BookIcon.png` | Quest log icon | [QuestFrame/UI-QuestLog-BookIcon](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/questframe/ui-questlog-bookicon.blp` |
| `assets/Interface/AchievementFrame/UI-Achievement-Alert-Background.png` | Achievements (toast, rows, shields, progress bars) | [AchievementFrame/UI-Achievement-Alert-Background](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/achievementframe/ui-achievement-alert-background.blp` |
| `assets/Interface/AchievementFrame/UI-Achievement-Parchment-Horizontal.png` | Achievements (toast, rows, shields, progress bars) | [AchievementFrame/UI-Achievement-Parchment-Horizontal](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/achievementframe/ui-achievement-parchment-horizontal.blp` |
| `assets/Interface/AchievementFrame/UI-Achievement-Parchment-Horizontal-Desaturated.png` | Achievements (toast, rows, shields, progress bars) | [AchievementFrame/UI-Achievement-Parchment-Horizontal-Desaturated](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/achievementframe/ui-achievement-parchment-horizontal-desaturated.blp` |
| `assets/Interface/AchievementFrame/UI-Achievement-Shield.png` | Achievements (toast, rows, shields, progress bars) | [AchievementFrame/UI-Achievement-Shield](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/achievementframe/ui-achievement-shield.blp` |
| `assets/Interface/AchievementFrame/UI-Achievement-Shield-Desaturated.png` | Achievements (toast, rows, shields, progress bars) | [AchievementFrame/UI-Achievement-Shield-Desaturated](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/achievementframe/ui-achievement-shield-desaturated.blp` |
| `assets/Interface/AchievementFrame/UI-Achievement-IconFrame.png` | Achievements (toast, rows, shields, progress bars) | [AchievementFrame/UI-Achievement-IconFrame](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/achievementframe/ui-achievement-iconframe.blp` |
| `assets/Interface/AchievementFrame/UI-Achievement-ProgressBar-Border.png` | Achievements (toast, rows, shields, progress bars) | [AchievementFrame/UI-Achievement-ProgressBar-Border](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/achievementframe/ui-achievement-progressbar-border.blp` |
| `assets/Interface/AchievementFrame/UI-Achievement-Criteria-Check.png` | Achievements (toast, rows, shields, progress bars) | [AchievementFrame/UI-Achievement-Criteria-Check](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/achievementframe/ui-achievement-criteria-check.blp` |
| `assets/Interface/Buttons/UI-Quickslot2.png` | Action bar buttons | [Buttons/UI-Quickslot2](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/buttons/ui-quickslot2.blp` |
| `assets/Interface/Buttons/UI-Quickslot-Depress.png` | Action bar buttons | [Buttons/UI-Quickslot-Depress](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/buttons/ui-quickslot-depress.blp` |
| `assets/Interface/Buttons/ButtonHilight-Square.png` | Action bar buttons | [Buttons/ButtonHilight-Square](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/buttons/buttonhilight-square.blp` |
| `assets/Interface/Buttons/CheckButtonHilight.png` | Action bar buttons | [Buttons/CheckButtonHilight](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/buttons/checkbuttonhilight.blp` |
| `assets/Interface/PaperDoll/UI-PaperDoll-Slot-Head.png` | Empty Head slot | [PaperDoll/UI-PaperDoll-Slot-Head](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/paperdoll/ui-paperdoll-slot-head.blp` |
| `assets/Interface/PaperDoll/UI-PaperDoll-Slot-Neck.png` | Empty Neck slot | [PaperDoll/UI-PaperDoll-Slot-Neck](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/paperdoll/ui-paperdoll-slot-neck.blp` |
| `assets/Interface/PaperDoll/UI-PaperDoll-Slot-Shoulder.png` | Empty Shoulder slot | [PaperDoll/UI-PaperDoll-Slot-Shoulder](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/paperdoll/ui-paperdoll-slot-shoulder.blp` |
| `assets/Interface/PaperDoll/UI-PaperDoll-Slot-Chest.png` | Empty Chest slot | [PaperDoll/UI-PaperDoll-Slot-Chest](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/paperdoll/ui-paperdoll-slot-chest.blp` |
| `assets/Interface/PaperDoll/UI-PaperDoll-Slot-Shirt.png` | Empty Shirt slot | [PaperDoll/UI-PaperDoll-Slot-Shirt](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/paperdoll/ui-paperdoll-slot-shirt.blp` |
| `assets/Interface/PaperDoll/UI-PaperDoll-Slot-Tabard.png` | Empty Tabard slot | [PaperDoll/UI-PaperDoll-Slot-Tabard](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/paperdoll/ui-paperdoll-slot-tabard.blp` |
| `assets/Interface/PaperDoll/UI-PaperDoll-Slot-Wrists.png` | Empty Wrists slot | [PaperDoll/UI-PaperDoll-Slot-Wrists](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/paperdoll/ui-paperdoll-slot-wrists.blp` |
| `assets/Interface/PaperDoll/UI-PaperDoll-Slot-Hands.png` | Empty Hands slot | [PaperDoll/UI-PaperDoll-Slot-Hands](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/paperdoll/ui-paperdoll-slot-hands.blp` |
| `assets/Interface/PaperDoll/UI-PaperDoll-Slot-Waist.png` | Empty Waist slot | [PaperDoll/UI-PaperDoll-Slot-Waist](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/paperdoll/ui-paperdoll-slot-waist.blp` |
| `assets/Interface/PaperDoll/UI-PaperDoll-Slot-Legs.png` | Empty Legs slot | [PaperDoll/UI-PaperDoll-Slot-Legs](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/paperdoll/ui-paperdoll-slot-legs.blp` |
| `assets/Interface/PaperDoll/UI-PaperDoll-Slot-Feet.png` | Empty Feet slot | [PaperDoll/UI-PaperDoll-Slot-Feet](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/paperdoll/ui-paperdoll-slot-feet.blp` |
| `assets/Interface/PaperDoll/UI-PaperDoll-Slot-Finger.png` | Empty Finger slot | [PaperDoll/UI-PaperDoll-Slot-Finger](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/paperdoll/ui-paperdoll-slot-finger.blp` |
| `assets/Interface/PaperDoll/UI-PaperDoll-Slot-RFinger.png` | Empty RFinger slot | [PaperDoll/UI-PaperDoll-Slot-RFinger](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/paperdoll/ui-paperdoll-slot-rfinger.blp` |
| `assets/Interface/PaperDoll/UI-PaperDoll-Slot-Trinket.png` | Empty Trinket slot | [PaperDoll/UI-PaperDoll-Slot-Trinket](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/paperdoll/ui-paperdoll-slot-trinket.blp` |
| `assets/Interface/PaperDoll/UI-PaperDoll-Slot-MainHand.png` | Empty MainHand slot | [PaperDoll/UI-PaperDoll-Slot-MainHand](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/paperdoll/ui-paperdoll-slot-mainhand.blp` |
| `assets/Interface/PaperDoll/UI-PaperDoll-Slot-SecondaryHand.png` | Empty SecondaryHand slot | [PaperDoll/UI-PaperDoll-Slot-SecondaryHand](https://github.com/Gethe/wow-ui-textures) · [wago.tools](https://wago.tools/files) `interface/paperdoll/ui-paperdoll-slot-secondaryhand.blp` |

### Talent tree backgrounds

Four pieces per tree: ``<Name>-TopLeft``, ``-TopRight``, ``-BottomLeft`` and ``-BottomRight`` in ``assets/Interface/TalentFrame/`` ([source]({0}), folder ``TalentFrame``). The background only shows once all four pieces of a tree are there.

| Class | Trees (file name prefix) |
| --- | --- |
| Warrior | WarriorArms, WarriorFury, WarriorProtection |
| Paladin | PaladinHoly, PaladinProtection, PaladinCombat (= Retribution) |
| Hunter | HunterBeastMastery, HunterMarksmanship, HunterSurvival |
| Rogue | RogueAssassination, RogueCombat, RogueSubtlety |
| Priest | PriestDiscipline, PriestHoly, PriestShadow |
| Shaman | ShamanElementalCombat, ShamanEnhancement, ShamanRestoration |
| Mage | MageArcane, MageFire, MageFrost |
| Warlock | WarlockCurses (= Affliction), WarlockSummoning (= Demonology), WarlockDestruction |
| Druid | DruidBalance, DruidFeralCombat, DruidRestoration |

## Music

Background music is played from `music/<Name>.mp3` (see `MUSIC` and `MUSIC_GENERAL` in `js/music.js`). Each zone plays its own tracks, each followed by a random general track (at least 3 general tracks per cycle). Missing files are skipped. Volume, mute, mute-in-background and skip are under Settings; `M` toggles mute.

| File | Used in |
| --- | --- |
| `TavernAlliance01.mp3` | Character select |
| `TavernHorde01.mp3` | Character select |
| `stormwind02-moment.mp3` | Character select |
| `DayForest01.mp3` | Elwynn Forest, Westfall |
| `DayPlains01.mp3` | Elwynn Forest, Mulgore, Westfall, The Barrens |
| `stormwind04-zone.mp3` | Elwynn Forest |
| `DayMountain01.mp3` | Dun Morogh |
| `IronForge_Walking_01.mp3` | Dun Morogh |
| `ironforgewalking02.mp3` | Dun Morogh |
| `ironforgewalking03(glenn).mp3` | Dun Morogh |
| `EnchantedForest01.mp3` | Teldrassil, Ashenvale |
| `NightForest01.mp3` | Teldrassil, Duskwood, Ashenvale |
| `Darnassus_Walking_1.mp3` | Teldrassil |
| `darnassuswalking2.mp3` | Teldrassil |
| `darnassuswalking3.mp3` | Teldrassil |
| `druidgrove.mp3` | Teldrassil |
| `DayBarrenDry01.mp3` | Durotar, The Barrens, Tanaris |
| `orgrimmar01-zone.mp3` | Durotar |
| `warriorterrace.mp3` | Durotar |
| `Thunderbluff_Walking_01.mp3` | Mulgore |
| `CursedLand01.mp3` | Tirisfal Glades |
| `CursedLand02.mp3` | Tirisfal Glades |
| `undercity01-zone.mp3` | Tirisfal Glades |
| `gloomy02.mp3` | Tirisfal Glades, Duskwood |
| `spooky01-moment.mp3` | Tirisfal Glades, Duskwood |
| `DayEvilForest01.mp3` | Duskwood |
| `CursedLand04.mp3` | Duskwood, Burning Steppes |
| `DayJungle01.mp3` | Stranglethorn Vale, Un'Goro Crater |
| `DayVolcanic01-new.mp3` | Burning Steppes |
| `battle01.mp3` | Burning Steppes, **All zones (general)** |
| `battle04.mp3` | Burning Steppes, **All zones (general)** |
| `mystery01-zone.mp3` | **All zones (general)** |
| `mystery02-zone.mp3` | **All zones (general)** |
| `mystery03-zone.mp3` | **All zones (general)** |
| `magic01-zone1.mp3` | **All zones (general)** |
| `sacred01.mp3` | **All zones (general)** |
| `angelic01.mp3` | **All zones (general)** |
| `battle03.mp3` | **All zones (general)** |
| `battle05.mp3` | **All zones (general)** |
| `world-of-warcraft-lvl-up.mp3` | Level-up jingle |
| `gnomeragon01-zone.mp3`, `KelThuzad1A.mp3`, `pvp1.mp3` | Not used yet (saved for dungeons, raids and battlegrounds) |

## Mount and companion icons

Optional icons for the Collections tab, named like the mount or companion (an emoji is shown until the file exists): ``icons/mounts/<Name>.jpg`` and ``icons/pets/<Name>.jpg``. Source: the item icons on Wowhead (e.g. ``inv_misc_foot_kodo``).

Mounts: `Brown Horse`, `Swift Palomino`, `Gray Ram`, `Swift Gray Ram`, `Striped Nightsaber`, `Swift Frostsaber`, `Red Mechanostrider`, `Swift Green Mechanostrider`, `Timber Wolf`, `Swift Timber Wolf`, `Brown Kodo`, `Great Brown Kodo`, `Emerald Raptor`, `Swift Olive Raptor`, `Red Skeletal Horse`, `Purple Skeletal Warhorse`, `Warhorse`, `Charger`, `Felsteed`, `Dreadsteed`, `Deathcharger's Reins`, `Swift Razzashi Raptor`, `Swift Zulian Tiger`, `Black Qiraji Battle Tank`

Companions: `Cat Carrier (Bombay)`, `Cat Carrier (Cornish Rex)`, `Cat Carrier (Orange Tabby)`, `Cat Carrier (Silver Tabby)`, `Cat Carrier (Siamese)`, `Rabbit Crate (Snowshoe)`, `Great Horned Owl`, `Hawk Owl`, `Prairie Dog Whistle`, `Black Kingsnake`, `Brown Snake`, `Crimson Snake`, `Undercity Cockroach`, `Ancona Chicken`, `Parrot Cage (Cockatiel)`, `Parrot Cage (Senegal)`, `Mechanical Squirrel Box`, `Pet Bombling`, `Lil' Smoky`, `Cat Carrier (Black Tabby)`, `Parrot Cage (Hyacinth Macaw)`, `Parrot Cage (Green Wing Macaw)`, `Dark Whelpling`, `Disgusting Oozeling`, `Smolderweb Carrier`

## Achievement icons

Optional icons for the Achievements tab and toast, named like the achievement (an emoji is shown until the file exists): `icons/achievements/<Name>.jpg`. Any achievement-style icon from Wowhead works (e.g. `achievement_level_10`).

Fixed names: `Deep Roots`, `Giddy Up!`, `Fast and Furious`, `Survivor`, `Loremaster`, `Explorer`, `World Traveler`, `Kingslayer`, `Flawless Victory`, `Speed Run`, `Dungeon Master`, `Swift and Mighty`, `Jack of All Trades`, `Double Trouble`, `United Races`, `Deathcharger's Reins`, `The Undying`, `Jenkins`, `The Patient`. Generated ones: `Level 10`…`Level 60`, `<Zone> Quests`, `Explore <Zone>`, one per dungeon name, and the kill/gold/collection milestones.

## Icons

Icons are ``.jpg`` (``.png`` also works). Any missing icon shows an emoji instead.

### Already added

- Class icons: ``icons/<Class>/class/classicon_<class>.jpg``
- Talent icons: ``icons/<Class>/talents/<Talent Name>.jpg``

### Races and factions

| File | Suggested icon |
| --- | --- |
| `icons/races/human.jpg` | [achievement_character_human_male](https://wow.zamimg.com/images/wow/icons/large/achievement_character_human_male.jpg) |
| `icons/races/dwarf.jpg` | [achievement_character_dwarf_male](https://wow.zamimg.com/images/wow/icons/large/achievement_character_dwarf_male.jpg) |
| `icons/races/nightelf.jpg` | [achievement_character_nightelf_male](https://wow.zamimg.com/images/wow/icons/large/achievement_character_nightelf_male.jpg) |
| `icons/races/gnome.jpg` | [achievement_character_gnome_male](https://wow.zamimg.com/images/wow/icons/large/achievement_character_gnome_male.jpg) |
| `icons/races/orc.jpg` | [achievement_character_orc_male](https://wow.zamimg.com/images/wow/icons/large/achievement_character_orc_male.jpg) |
| `icons/races/undead.jpg` | [achievement_character_undead_male](https://wow.zamimg.com/images/wow/icons/large/achievement_character_undead_male.jpg) |
| `icons/races/tauren.jpg` | [achievement_character_tauren_male](https://wow.zamimg.com/images/wow/icons/large/achievement_character_tauren_male.jpg) |
| `icons/races/troll.jpg` | [achievement_character_troll_male](https://wow.zamimg.com/images/wow/icons/large/achievement_character_troll_male.jpg) |
| `icons/factions/alliance.jpg` | [inv_bannerpvp_02](https://wow.zamimg.com/images/wow/icons/large/inv_bannerpvp_02.jpg) |
| `icons/factions/horde.jpg` | [inv_bannerpvp_01](https://wow.zamimg.com/images/wow/icons/large/inv_bannerpvp_01.jpg) |

### Items

One icon per weapon type and per armor type and slot. The suggestions are only examples: any icon you like works, as long as the file name matches. Browse the [Wowhead icon list](https://www.wowhead.com/classic/icons) for alternatives.

| File | Suggested icon |
| --- | --- |
| `icons/items/sword.jpg` | [inv_sword_04](https://wow.zamimg.com/images/wow/icons/large/inv_sword_04.jpg) |
| `icons/items/axe.jpg` | [inv_axe_01](https://wow.zamimg.com/images/wow/icons/large/inv_axe_01.jpg) |
| `icons/items/mace.jpg` | [inv_mace_01](https://wow.zamimg.com/images/wow/icons/large/inv_mace_01.jpg) |
| `icons/items/dagger.jpg` | [inv_weapon_shortblade_01](https://wow.zamimg.com/images/wow/icons/large/inv_weapon_shortblade_01.jpg) |
| `icons/items/2hsword.jpg` | [inv_sword_06](https://wow.zamimg.com/images/wow/icons/large/inv_sword_06.jpg) |
| `icons/items/2haxe.jpg` | [inv_axe_09](https://wow.zamimg.com/images/wow/icons/large/inv_axe_09.jpg) |
| `icons/items/2hmace.jpg` | [inv_hammer_04](https://wow.zamimg.com/images/wow/icons/large/inv_hammer_04.jpg) |
| `icons/items/staff.jpg` | [inv_staff_08](https://wow.zamimg.com/images/wow/icons/large/inv_staff_08.jpg) |
| `icons/items/bow.jpg` | [inv_weapon_bow_02](https://wow.zamimg.com/images/wow/icons/large/inv_weapon_bow_02.jpg) |
| `icons/items/gun.jpg` | [inv_weapon_rifle_01](https://wow.zamimg.com/images/wow/icons/large/inv_weapon_rifle_01.jpg) |
| `icons/items/crossbow.jpg` | [inv_weapon_crossbow_01](https://wow.zamimg.com/images/wow/icons/large/inv_weapon_crossbow_01.jpg) |
| `icons/items/cloth-head.jpg` | [inv_helmet_29](https://wow.zamimg.com/images/wow/icons/large/inv_helmet_29.jpg) |
| `icons/items/cloth-chest.jpg` | [inv_chest_cloth_21](https://wow.zamimg.com/images/wow/icons/large/inv_chest_cloth_21.jpg) |
| `icons/items/cloth-hands.jpg` | [inv_gauntlets_17](https://wow.zamimg.com/images/wow/icons/large/inv_gauntlets_17.jpg) |
| `icons/items/cloth-legs.jpg` | [inv_pants_08](https://wow.zamimg.com/images/wow/icons/large/inv_pants_08.jpg) |
| `icons/items/cloth-feet.jpg` | [inv_boots_05](https://wow.zamimg.com/images/wow/icons/large/inv_boots_05.jpg) |
| `icons/items/leather-head.jpg` | [inv_helmet_15](https://wow.zamimg.com/images/wow/icons/large/inv_helmet_15.jpg) |
| `icons/items/leather-chest.jpg` | [inv_chest_leather_09](https://wow.zamimg.com/images/wow/icons/large/inv_chest_leather_09.jpg) |
| `icons/items/leather-hands.jpg` | [inv_gauntlets_21](https://wow.zamimg.com/images/wow/icons/large/inv_gauntlets_21.jpg) |
| `icons/items/leather-legs.jpg` | [inv_pants_06](https://wow.zamimg.com/images/wow/icons/large/inv_pants_06.jpg) |
| `icons/items/leather-feet.jpg` | [inv_boots_08](https://wow.zamimg.com/images/wow/icons/large/inv_boots_08.jpg) |
| `icons/items/mail-head.jpg` | [inv_helmet_10](https://wow.zamimg.com/images/wow/icons/large/inv_helmet_10.jpg) |
| `icons/items/mail-chest.jpg` | [inv_chest_chain_05](https://wow.zamimg.com/images/wow/icons/large/inv_chest_chain_05.jpg) |
| `icons/items/mail-hands.jpg` | [inv_gauntlets_10](https://wow.zamimg.com/images/wow/icons/large/inv_gauntlets_10.jpg) |
| `icons/items/mail-legs.jpg` | [inv_pants_03](https://wow.zamimg.com/images/wow/icons/large/inv_pants_03.jpg) |
| `icons/items/mail-feet.jpg` | [inv_boots_plate_06](https://wow.zamimg.com/images/wow/icons/large/inv_boots_plate_06.jpg) |
| `icons/items/plate-head.jpg` | [inv_helmet_01](https://wow.zamimg.com/images/wow/icons/large/inv_helmet_01.jpg) |
| `icons/items/plate-chest.jpg` | [inv_chest_plate01](https://wow.zamimg.com/images/wow/icons/large/inv_chest_plate01.jpg) |
| `icons/items/plate-hands.jpg` | [inv_gauntlets_04](https://wow.zamimg.com/images/wow/icons/large/inv_gauntlets_04.jpg) |
| `icons/items/plate-legs.jpg` | [inv_pants_04](https://wow.zamimg.com/images/wow/icons/large/inv_pants_04.jpg) |
| `icons/items/plate-feet.jpg` | [inv_boots_plate_01](https://wow.zamimg.com/images/wow/icons/large/inv_boots_plate_01.jpg) |
| `icons/items/cloth-shoulder.jpg` | [inv_shoulder_02](https://wow.zamimg.com/images/wow/icons/large/inv_shoulder_02.jpg) |
| `icons/items/cloth-wrist.jpg` | [inv_bracer_07](https://wow.zamimg.com/images/wow/icons/large/inv_bracer_07.jpg) |
| `icons/items/cloth-waist.jpg` | [inv_belt_08](https://wow.zamimg.com/images/wow/icons/large/inv_belt_08.jpg) |
| `icons/items/leather-shoulder.jpg` | [inv_shoulder_07](https://wow.zamimg.com/images/wow/icons/large/inv_shoulder_07.jpg) |
| `icons/items/leather-wrist.jpg` | [inv_bracer_04](https://wow.zamimg.com/images/wow/icons/large/inv_bracer_04.jpg) |
| `icons/items/leather-waist.jpg` | [inv_belt_03](https://wow.zamimg.com/images/wow/icons/large/inv_belt_03.jpg) |
| `icons/items/mail-shoulder.jpg` | [inv_shoulder_09](https://wow.zamimg.com/images/wow/icons/large/inv_shoulder_09.jpg) |
| `icons/items/mail-wrist.jpg` | [inv_bracer_02](https://wow.zamimg.com/images/wow/icons/large/inv_bracer_02.jpg) |
| `icons/items/mail-waist.jpg` | [inv_belt_13](https://wow.zamimg.com/images/wow/icons/large/inv_belt_13.jpg) |
| `icons/items/plate-shoulder.jpg` | [inv_shoulder_10](https://wow.zamimg.com/images/wow/icons/large/inv_shoulder_10.jpg) |
| `icons/items/plate-wrist.jpg` | [inv_bracer_14](https://wow.zamimg.com/images/wow/icons/large/inv_bracer_14.jpg) |
| `icons/items/plate-waist.jpg` | [inv_belt_09](https://wow.zamimg.com/images/wow/icons/large/inv_belt_09.jpg) |
| `icons/items/shield.jpg` | [inv_shield_06](https://wow.zamimg.com/images/wow/icons/large/inv_shield_06.jpg) |
| `icons/items/held.jpg` | [inv_misc_orb_01](https://wow.zamimg.com/images/wow/icons/large/inv_misc_orb_01.jpg) |
| `icons/items/neck.jpg` | [inv_jewelry_necklace_07](https://wow.zamimg.com/images/wow/icons/large/inv_jewelry_necklace_07.jpg) |
| `icons/items/finger.jpg` | [inv_jewelry_ring_03](https://wow.zamimg.com/images/wow/icons/large/inv_jewelry_ring_03.jpg) |
| `icons/items/trinket.jpg` | [inv_jewelry_talisman_01](https://wow.zamimg.com/images/wow/icons/large/inv_jewelry_talisman_01.jpg) |
| `icons/items/shirt.jpg` | [inv_shirt_01](https://wow.zamimg.com/images/wow/icons/large/inv_shirt_01.jpg) |
| `icons/items/tabard.jpg` | [inv_shirt_guildtabard_01](https://wow.zamimg.com/images/wow/icons/large/inv_shirt_guildtabard_01.jpg) |

### Spells

Spell icons go in ``icons/<Class>/spells/<Spell Name>.jpg`` and racial abilities in ``icons/Racial/<Ability Name>.jpg``. They are shown in the spellbook, the buff bar and the target's debuffs. Each name below links to a Wowhead search; open the spell and download its icon. Every folder has a ``_spells.txt`` with the same list.

**Warrior** (`icons/Warrior/spells/`): [Battle Shout](https://www.wowhead.com/classic/search?q=Battle%20Shout), [Charge](https://www.wowhead.com/classic/search?q=Charge), [Bloodrage](https://www.wowhead.com/classic/search?q=Bloodrage), [Last Stand](https://www.wowhead.com/classic/search?q=Last%20Stand), [Death Wish](https://www.wowhead.com/classic/search?q=Death%20Wish), [Sweeping Strikes](https://www.wowhead.com/classic/search?q=Sweeping%20Strikes), [Execute](https://www.wowhead.com/classic/search?q=Execute), [Overpower](https://www.wowhead.com/classic/search?q=Overpower), [Mortal Strike](https://www.wowhead.com/classic/search?q=Mortal%20Strike), [Bloodthirst](https://www.wowhead.com/classic/search?q=Bloodthirst), [Shield Slam](https://www.wowhead.com/classic/search?q=Shield%20Slam), [Concussion Blow](https://www.wowhead.com/classic/search?q=Concussion%20Blow), [Whirlwind](https://www.wowhead.com/classic/search?q=Whirlwind), [Rend](https://www.wowhead.com/classic/search?q=Rend), [Heroic Strike](https://www.wowhead.com/classic/search?q=Heroic%20Strike)

**Paladin** (`icons/Paladin/spells/`): [Seal of Righteousness](https://www.wowhead.com/classic/search?q=Seal%20of%20Righteousness), [Seal of Command](https://www.wowhead.com/classic/search?q=Seal%20of%20Command), [Devotion Aura](https://www.wowhead.com/classic/search?q=Devotion%20Aura), [Blessing of Might](https://www.wowhead.com/classic/search?q=Blessing%20of%20Might), [Blessing of Kings](https://www.wowhead.com/classic/search?q=Blessing%20of%20Kings), [Blessing of Sanctuary](https://www.wowhead.com/classic/search?q=Blessing%20of%20Sanctuary), [Sanctity Aura](https://www.wowhead.com/classic/search?q=Sanctity%20Aura), [Lay on Hands](https://www.wowhead.com/classic/search?q=Lay%20on%20Hands), [Divine Favor](https://www.wowhead.com/classic/search?q=Divine%20Favor), [Holy Light](https://www.wowhead.com/classic/search?q=Holy%20Light), [Holy Shield](https://www.wowhead.com/classic/search?q=Holy%20Shield), [Hammer of Justice](https://www.wowhead.com/classic/search?q=Hammer%20of%20Justice), [Repentance](https://www.wowhead.com/classic/search?q=Repentance), [Hammer of Wrath](https://www.wowhead.com/classic/search?q=Hammer%20of%20Wrath), [Holy Shock](https://www.wowhead.com/classic/search?q=Holy%20Shock), [Exorcism](https://www.wowhead.com/classic/search?q=Exorcism), [Judgement](https://www.wowhead.com/classic/search?q=Judgement), [Consecration](https://www.wowhead.com/classic/search?q=Consecration)

**Hunter** (`icons/Hunter/spells/`): [Aspect of the Hawk](https://www.wowhead.com/classic/search?q=Aspect%20of%20the%20Hawk), [Hunter's Mark](https://www.wowhead.com/classic/search?q=Hunter's%20Mark), [Trueshot Aura](https://www.wowhead.com/classic/search?q=Trueshot%20Aura), [Call Pet](https://www.wowhead.com/classic/search?q=Call%20Pet), [Bestial Wrath](https://www.wowhead.com/classic/search?q=Bestial%20Wrath), [Rapid Fire](https://www.wowhead.com/classic/search?q=Rapid%20Fire), [Deterrence](https://www.wowhead.com/classic/search?q=Deterrence), [Intimidation](https://www.wowhead.com/classic/search?q=Intimidation), [Scatter Shot](https://www.wowhead.com/classic/search?q=Scatter%20Shot), [Wyvern Sting](https://www.wowhead.com/classic/search?q=Wyvern%20Sting), [Counterattack](https://www.wowhead.com/classic/search?q=Counterattack), [Aimed Shot](https://www.wowhead.com/classic/search?q=Aimed%20Shot), [Multi-Shot](https://www.wowhead.com/classic/search?q=Multi-Shot), [Serpent Sting](https://www.wowhead.com/classic/search?q=Serpent%20Sting), [Arcane Shot](https://www.wowhead.com/classic/search?q=Arcane%20Shot), [Raptor Strike](https://www.wowhead.com/classic/search?q=Raptor%20Strike)

**Rogue** (`icons/Rogue/spells/`): [Instant Poison](https://www.wowhead.com/classic/search?q=Instant%20Poison), [Premeditation](https://www.wowhead.com/classic/search?q=Premeditation), [Preparation](https://www.wowhead.com/classic/search?q=Preparation), [Evasion](https://www.wowhead.com/classic/search?q=Evasion), [Cold Blood](https://www.wowhead.com/classic/search?q=Cold%20Blood), [Adrenaline Rush](https://www.wowhead.com/classic/search?q=Adrenaline%20Rush), [Blade Flurry](https://www.wowhead.com/classic/search?q=Blade%20Flurry), [Slice and Dice](https://www.wowhead.com/classic/search?q=Slice%20and%20Dice), [Rupture](https://www.wowhead.com/classic/search?q=Rupture), [Eviscerate](https://www.wowhead.com/classic/search?q=Eviscerate), [Riposte](https://www.wowhead.com/classic/search?q=Riposte), [Backstab](https://www.wowhead.com/classic/search?q=Backstab), [Ghostly Strike](https://www.wowhead.com/classic/search?q=Ghostly%20Strike), [Kick](https://www.wowhead.com/classic/search?q=Kick), [Hemorrhage](https://www.wowhead.com/classic/search?q=Hemorrhage), [Sinister Strike](https://www.wowhead.com/classic/search?q=Sinister%20Strike)

**Priest** (`icons/Priest/spells/`): [Power Word: Fortitude](https://www.wowhead.com/classic/search?q=Power%20Word%3A%20Fortitude), [Inner Fire](https://www.wowhead.com/classic/search?q=Inner%20Fire), [Shadowform](https://www.wowhead.com/classic/search?q=Shadowform), [Vampiric Embrace](https://www.wowhead.com/classic/search?q=Vampiric%20Embrace), [Power Word: Shield](https://www.wowhead.com/classic/search?q=Power%20Word%3A%20Shield), [Inner Focus](https://www.wowhead.com/classic/search?q=Inner%20Focus), [Power Infusion](https://www.wowhead.com/classic/search?q=Power%20Infusion), [Lesser Heal](https://www.wowhead.com/classic/search?q=Lesser%20Heal), [Renew](https://www.wowhead.com/classic/search?q=Renew), [Lightwell](https://www.wowhead.com/classic/search?q=Lightwell), [Silence](https://www.wowhead.com/classic/search?q=Silence), [Holy Nova](https://www.wowhead.com/classic/search?q=Holy%20Nova), [Shadow Word: Pain](https://www.wowhead.com/classic/search?q=Shadow%20Word%3A%20Pain), [Mind Blast](https://www.wowhead.com/classic/search?q=Mind%20Blast), [Mind Flay](https://www.wowhead.com/classic/search?q=Mind%20Flay), [Holy Fire](https://www.wowhead.com/classic/search?q=Holy%20Fire), [Smite](https://www.wowhead.com/classic/search?q=Smite)

**Shaman** (`icons/Shaman/spells/`): [Rockbiter Weapon](https://www.wowhead.com/classic/search?q=Rockbiter%20Weapon), [Windfury Weapon](https://www.wowhead.com/classic/search?q=Windfury%20Weapon), [Lightning Shield](https://www.wowhead.com/classic/search?q=Lightning%20Shield), [Strength of Earth Totem](https://www.wowhead.com/classic/search?q=Strength%20of%20Earth%20Totem), [Elemental Mastery](https://www.wowhead.com/classic/search?q=Elemental%20Mastery), [Nature's Swiftness](https://www.wowhead.com/classic/search?q=Nature's%20Swiftness), [Mana Tide Totem](https://www.wowhead.com/classic/search?q=Mana%20Tide%20Totem), [Healing Wave](https://www.wowhead.com/classic/search?q=Healing%20Wave), [Stormstrike](https://www.wowhead.com/classic/search?q=Stormstrike), [Flame Shock](https://www.wowhead.com/classic/search?q=Flame%20Shock), [Earth Shock](https://www.wowhead.com/classic/search?q=Earth%20Shock), [Searing Totem](https://www.wowhead.com/classic/search?q=Searing%20Totem), [Chain Lightning](https://www.wowhead.com/classic/search?q=Chain%20Lightning), [Lightning Bolt](https://www.wowhead.com/classic/search?q=Lightning%20Bolt)

**Mage** (`icons/Mage/spells/`): [Arcane Intellect](https://www.wowhead.com/classic/search?q=Arcane%20Intellect), [Frost Armor](https://www.wowhead.com/classic/search?q=Frost%20Armor), [Evocation](https://www.wowhead.com/classic/search?q=Evocation), [Ice Block](https://www.wowhead.com/classic/search?q=Ice%20Block), [Ice Barrier](https://www.wowhead.com/classic/search?q=Ice%20Barrier), [Mana Shield](https://www.wowhead.com/classic/search?q=Mana%20Shield), [Arcane Power](https://www.wowhead.com/classic/search?q=Arcane%20Power), [Combustion](https://www.wowhead.com/classic/search?q=Combustion), [Presence of Mind](https://www.wowhead.com/classic/search?q=Presence%20of%20Mind), [Pyroblast](https://www.wowhead.com/classic/search?q=Pyroblast), [Frost Nova](https://www.wowhead.com/classic/search?q=Frost%20Nova), [Blast Wave](https://www.wowhead.com/classic/search?q=Blast%20Wave), [Fire Blast](https://www.wowhead.com/classic/search?q=Fire%20Blast), [Arcane Missiles](https://www.wowhead.com/classic/search?q=Arcane%20Missiles), [Frostbolt](https://www.wowhead.com/classic/search?q=Frostbolt), [Fireball](https://www.wowhead.com/classic/search?q=Fireball)

**Warlock** (`icons/Warlock/spells/`): [Demon Skin](https://www.wowhead.com/classic/search?q=Demon%20Skin), [Summon Imp](https://www.wowhead.com/classic/search?q=Summon%20Imp), [Summon Voidwalker](https://www.wowhead.com/classic/search?q=Summon%20Voidwalker), [Demonic Sacrifice](https://www.wowhead.com/classic/search?q=Demonic%20Sacrifice), [Soul Link](https://www.wowhead.com/classic/search?q=Soul%20Link), [Drain Life](https://www.wowhead.com/classic/search?q=Drain%20Life), [Life Tap](https://www.wowhead.com/classic/search?q=Life%20Tap), [Dark Pact](https://www.wowhead.com/classic/search?q=Dark%20Pact), [Shadowburn](https://www.wowhead.com/classic/search?q=Shadowburn), [Conflagrate](https://www.wowhead.com/classic/search?q=Conflagrate), [Corruption](https://www.wowhead.com/classic/search?q=Corruption), [Curse of Agony](https://www.wowhead.com/classic/search?q=Curse%20of%20Agony), [Siphon Life](https://www.wowhead.com/classic/search?q=Siphon%20Life), [Immolate](https://www.wowhead.com/classic/search?q=Immolate), [Shadow Bolt](https://www.wowhead.com/classic/search?q=Shadow%20Bolt)

**Druid** (`icons/Druid/spells/`): [Mark of the Wild](https://www.wowhead.com/classic/search?q=Mark%20of%20the%20Wild), [Thorns](https://www.wowhead.com/classic/search?q=Thorns), [Cat Form](https://www.wowhead.com/classic/search?q=Cat%20Form), [Moonkin Form](https://www.wowhead.com/classic/search?q=Moonkin%20Form), [Leader of the Pack](https://www.wowhead.com/classic/search?q=Leader%20of%20the%20Pack), [Nature's Swiftness](https://www.wowhead.com/classic/search?q=Nature's%20Swiftness), [Swiftmend](https://www.wowhead.com/classic/search?q=Swiftmend), [Healing Touch](https://www.wowhead.com/classic/search?q=Healing%20Touch), [Rejuvenation](https://www.wowhead.com/classic/search?q=Rejuvenation), [Rip](https://www.wowhead.com/classic/search?q=Rip), [Ferocious Bite](https://www.wowhead.com/classic/search?q=Ferocious%20Bite), [Shred](https://www.wowhead.com/classic/search?q=Shred), [Rake](https://www.wowhead.com/classic/search?q=Rake), [Claw](https://www.wowhead.com/classic/search?q=Claw), [Insect Swarm](https://www.wowhead.com/classic/search?q=Insect%20Swarm), [Moonfire](https://www.wowhead.com/classic/search?q=Moonfire), [Starfire](https://www.wowhead.com/classic/search?q=Starfire), [Wrath](https://www.wowhead.com/classic/search?q=Wrath)

**Racial** (`icons/Racial/`): [Blood Fury](https://www.wowhead.com/classic/search?q=Blood%20Fury), [War Stomp](https://www.wowhead.com/classic/search?q=War%20Stomp), [Berserking](https://www.wowhead.com/classic/search?q=Berserking)

Effects that come from talents (Flurry, Clearcasting, Spirit Tap, Shadow Trance, Deep Wounds, Ignite) reuse the talent icons you already added.
