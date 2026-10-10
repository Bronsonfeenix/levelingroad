// =====================================================================
//  The Leveling Road — account: several characters + account-wide progress
//  Each character is saved under its own key; the account record holds the
//  character list and everything shared between characters (achievements,
//  collections, heirlooms, badges). Later systems add to accountFx().
// =====================================================================
'use strict';

const ACCOUNT_KEY = 'leveling-road-account-v1';
const charKey = id => 'leveling-road-char-' + id;
const LEGACY_XP_PER_60 = 0.05, LEGACY_XP_CAP = 0.25;

let ACC = null;

function freshAccount() {
  return {
    version: 1, characters: [], activeId: null, nextCharId: 1,
    achievements: {}, titles: [],
    collections: { mounts: [], pets: [], tabards: [] },
    heirlooms: {}, currency: { badges: 0 },
    settings: {},
  };
}

function charSummary(id, d) {
  return { id, name: d.name, race: d.race, cls: d.cls, faction: d.faction, level: d.level, zoneId: d.zoneId, lastPlayed: d.lastSeen || Date.now() };
}

// Load the account. The first time, the old single-character save becomes character 1
// (the old save is left in place as a backup).
function loadAccount() {
  try {
    const raw = localStorage.getItem(ACCOUNT_KEY);
    if (raw) {
      const d = JSON.parse(raw), f = freshAccount();
      ACC = Object.assign(f, d);
      ACC.collections = Object.assign(f.collections, d.collections || {});
      ACC.currency = Object.assign(f.currency, d.currency || {});
      return;
    }
  } catch (e) { console.warn('Could not load account', e); }
  ACC = freshAccount();
  try {
    const old = localStorage.getItem(CONFIG.SAVE_KEY);
    const d = old && JSON.parse(old);
    if (d && validSave(d)) {
      const id = ACC.nextCharId++;
      d.charId = id;
      localStorage.setItem(charKey(id), JSON.stringify(d));
      ACC.characters.push(charSummary(id, d));
      ACC.activeId = id;
    }
  } catch (e) { console.warn('Could not migrate the old save', e); }
  saveAccount();
}

function saveAccount() {
  try { localStorage.setItem(ACCOUNT_KEY, JSON.stringify(ACC)); } catch (e) { console.warn('Account save failed', e); }
}

function loadCharacter(id) {
  try {
    const d = JSON.parse(localStorage.getItem(charKey(id)));
    return validSave(d) ? d : null;
  } catch (e) { return null; }
}

function saveCharacter(d) {
  if (!d || !d.charId) return;
  try { localStorage.setItem(charKey(d.charId), JSON.stringify(d)); } catch (e) { console.warn('Save failed', e); }
  const i = ACC.characters.findIndex(c => c.id === d.charId);
  if (i >= 0) ACC.characters[i] = charSummary(d.charId, d);
  saveAccount();
}

// Register a brand-new character and return its id
function addCharacter(d) {
  d.charId = ACC.nextCharId++;
  ACC.characters.push(charSummary(d.charId, d));
  ACC.activeId = d.charId;
  saveAccount();
  return d.charId;
}

function deleteCharacter(id) {
  localStorage.removeItem(charKey(id));
  ACC.characters = ACC.characters.filter(c => c.id !== id);
  if (ACC.activeId === id) ACC.activeId = ACC.characters.length ? ACC.characters[0].id : null;
  saveAccount();
}

// Bonuses every character on the account gets (merged into gatherFx in game.js)
function accountFx() {
  const at60 = ACC ? ACC.characters.filter(c => c.level >= CONFIG.LEVEL_CAP).length : 0;
  return { xp: Math.min(LEGACY_XP_CAP, at60 * LEGACY_XP_PER_60) };
}

// Export / import the whole account (all characters) as one code
function exportAccount() {
  const chars = {};
  for (const c of ACC.characters) { const d = loadCharacter(c.id); if (d) chars[c.id] = d; }
  return btoa(unescape(encodeURIComponent(JSON.stringify({ account: ACC, chars }))));
}

// Accepts an account export, or an old single-character save (added as a new character)
function importAccount(code) {
  const d = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
  if (d && d.account && d.chars) {
    for (const c of ACC.characters) localStorage.removeItem(charKey(c.id));
    ACC = Object.assign(freshAccount(), d.account);
    for (const id in d.chars) localStorage.setItem(charKey(id), JSON.stringify(d.chars[id]));
    saveAccount();
    return 'account';
  }
  if (validSave(d)) {
    addCharacter(d);
    localStorage.setItem(charKey(d.charId), JSON.stringify(d));
    saveAccount();
    return 'character';
  }
  throw new Error('invalid');
}
