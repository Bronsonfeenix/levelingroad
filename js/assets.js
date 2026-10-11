// =====================================================================
//  The Leveling Road — optional original World of Warcraft art
//  Every file listed here is optional: when it exists the UI uses it,
//  otherwise the built-in look is kept. See ASSETS.md for where to get them.
// =====================================================================
'use strict';

// Interface textures. Paths mirror the game's Interface folder; .png/.PNG/.jpg all work.
const UI_ASSETS = {
  font:          { path: 'assets/fonts/FRIZQT__', exts: ['.TTF', '.ttf'], font: 'Friz' },
  rock:          'assets/Interface/FrameGeneral/UI-Background-Rock',
  dialogBg:      'assets/Interface/DialogFrame/UI-DialogBox-Background',
  dialogBorder:  { path: 'assets/Interface/DialogFrame/UI-DialogBox-Border', backdrop: true },
  dialogHeader:  'assets/Interface/DialogFrame/UI-DialogBox-Header',
  tooltipBorder: { path: 'assets/Interface/Tooltips/UI-Tooltip-Border', backdrop: true },
  targetFrame:   'assets/Interface/TargetingFrame/UI-TargetingFrame',
  targetElite:   'assets/Interface/TargetingFrame/UI-TargetingFrame-Elite',
  statusBar:     'assets/Interface/TargetingFrame/UI-StatusBar',
  castBorder:    'assets/Interface/CastingBar/UI-CastingBar-Border',
  btnUp:         'assets/Interface/Buttons/UI-Panel-Button-Up',
  btnDown:       'assets/Interface/Buttons/UI-Panel-Button-Down',
  btnDisabled:   'assets/Interface/Buttons/UI-Panel-Button-Disabled',
  tabActive:     'assets/Interface/PaperDollInfoFrame/UI-Character-ActiveTab',
  tabInactive:   'assets/Interface/PaperDollInfoFrame/UI-Character-InActiveTab',
  bagSlotAlt:    'assets/Interface/Buttons/UI-EmptySlot-Disabled',
  bagSlot:       'assets/Interface/PaperDoll/UI-Backpack-EmptySlot',
  // Empty equipment slots use assets/Interface/PaperDoll/UI-PaperDoll-Slot-<Slot> (see SLOT_TEXTURES in game.js)
  mainBar:       'assets/Interface/MainMenuBar/UI-MainMenuBar-Dwarf',
  quickslot:     'assets/Interface/Buttons/UI-Quickslot2',
  quickslotDown: 'assets/Interface/Buttons/UI-Quickslot-Depress',
  btnHilight:    'assets/Interface/Buttons/ButtonHilight-Square',
  checkHilight:  'assets/Interface/Buttons/CheckButtonHilight',
  gold:          'assets/Interface/MoneyFrame/UI-GoldIcon',
  silver:        'assets/Interface/MoneyFrame/UI-SilverIcon',
  copper:        'assets/Interface/MoneyFrame/UI-CopperIcon',
  loadAlliance:  'assets/Interface/Glues/LoadingScreens/LoadScreenEasternKingdom',
  loadHorde:     'assets/Interface/Glues/LoadingScreens/LoadScreenKalimdor',
  questBg:       'assets/Interface/QuestFrame/QuestBG',
  achAlert:      'assets/Interface/AchievementFrame/UI-Achievement-Alert-Background',
  achParch:      'assets/Interface/AchievementFrame/UI-Achievement-Parchment-Horizontal',
  achParchGrey:  'assets/Interface/AchievementFrame/UI-Achievement-Parchment-Horizontal-Desaturated',
  achShield:     'assets/Interface/AchievementFrame/UI-Achievement-Shield',
  achShieldGrey: 'assets/Interface/AchievementFrame/UI-Achievement-Shield-Desaturated',
  achIconFrame:  'assets/Interface/AchievementFrame/UI-Achievement-IconFrame',
  achBar:        'assets/Interface/AchievementFrame/UI-Achievement-ProgressBar-Border',
  achCheck:      'assets/Interface/AchievementFrame/UI-Achievement-Criteria-Check',
};
const TEXTURE_EXTS = ['.png', '.PNG', '.jpg'];
const ICON_EXTS = ['.jpg', '.png'];

// Backdrop edge files hold 8 square pieces side by side: left, right, top, bottom, then the 4 corners.
// The top and bottom pieces are stored as vertical strips: the top one like the left edge (lines on the left),
// the bottom one like the right edge (lines on the right). Rotating both clockwise puts the lines on the outside.
const BACKDROP_ROTATION = { top: Math.PI / 2, bottom: Math.PI / 2 };

const ASSET_CACHE = {};  // base path -> url | false | Promise
const encodePath = p => p.split('/').map(encodeURIComponent).join('/');

function probeAsset(base, exts) {
  const v = ASSET_CACHE[base];
  if (v !== undefined) return v instanceof Promise ? v : Promise.resolve(v);
  const list = exts || ICON_EXTS;
  const p = new Promise(res => {
    let i = 0;
    const next = () => {
      if (i >= list.length) return res(false);
      const url = encodePath(base + list[i++]);
      const img = new Image();
      img.onload = () => res(url);
      img.onerror = next;
      img.src = url;
    };
    next();
  }).then(u => { ASSET_CACHE[base] = u; return u; });
  ASSET_CACHE[base] = p;
  return p;
}

// Returns the URL if the file is known to exist, otherwise null (and starts looking for it).
let assetRefresh = 0;
function assetNow(base, exts) {
  const v = ASSET_CACHE[base];
  if (v === undefined) {
    probeAsset(base, exts).then(u => {
      if (!u) return;
      clearTimeout(assetRefresh);
      assetRefresh = setTimeout(() => { if (typeof onAssetsChanged === 'function') onAssetsChanged(); }, 60);
    });
    return null;
  }
  return v instanceof Promise ? null : v;
}

// An <img> when the icon exists, otherwise the emoji fallback.
function iconHTML(base, emoji, imgClass, fbClass) {
  const u = assetNow(base);
  return u ? `<img class="${imgClass || 'ico'}" src="${u}" alt="" draggable="false">` : `<span class="${fbClass || 'ico-fb'}">${emoji || ''}</span>`;
}

// Turn a WoW backdrop edge file into a standard 3×3 image for CSS border-image.
// (Needs the page to be served over http(s); browsers block this for file:// pages.)
function composeBackdrop(url) {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => {
      try {
        const e = img.width / 8, h = img.height;
        const c = document.createElement('canvas');
        c.width = c.height = e * 3;
        const x = c.getContext('2d');
        const piece = (i, dx, dy, rot) => {
          x.save(); x.translate(dx + e / 2, dy + e / 2); x.rotate(rot || 0);
          x.drawImage(img, i * e, 0, e, h, -e / 2, -e / 2, e, e);
          x.restore();
        };
        piece(0, 0, e); piece(1, 2 * e, e);
        piece(2, e, 0, BACKDROP_ROTATION.top); piece(3, e, 2 * e, BACKDROP_ROTATION.bottom);
        piece(4, 0, 0); piece(5, 2 * e, 0); piece(6, 0, 2 * e); piece(7, 2 * e, 2 * e);
        res({ url: c.toDataURL(), edge: e });
      } catch (err) { res(null); }
    };
    img.onerror = () => res(null);
    img.src = url;
  });
}

// Look for every interface texture and switch on the matching parts of css/wow-skin.css.
function applyUiAssets() {
  const root = document.documentElement;
  for (const key in UI_ASSETS) {
    const def = typeof UI_ASSETS[key] === 'string' ? { path: UI_ASSETS[key] } : UI_ASSETS[key];
    if (def.font) {
      (async () => {
        for (const ext of def.exts) {
          try {
            const face = new FontFace(def.font, `url("${encodePath(def.path + ext)}")`);
            await face.load(); document.fonts.add(face); root.classList.add('has-' + key); return;
          } catch (e) { /* try the next extension */ }
        }
      })();
      continue;
    }
    probeAsset(def.path, TEXTURE_EXTS).then(async url => {
      if (!url) return;
      // Absolute URL: relative ones inside CSS variables would resolve against css/ instead of the page
      root.style.setProperty('--a-' + key, `url("${new URL(url, document.baseURI).href}")`);
      root.classList.add('has-' + key);
      if (def.backdrop) {
        const b = await composeBackdrop(url);
        if (!b) return;
        root.style.setProperty('--a-' + key + 'Nine', `url("${b.url}")`);
        root.style.setProperty('--a-' + key + 'Edge', b.edge);
        root.classList.add('has-' + key + 'Nine');
      }
    });
  }
}
