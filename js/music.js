// =====================================================================
//  The Leveling Road — background music
//  Each zone has a playlist of tracks from music/ (played shuffled, with a
//  crossfade). Settings are account-wide: volume, mute, mute while the game
//  is in the background. Missing files are skipped.
// =====================================================================
'use strict';

const MUSIC_DIR = 'music/';
const MUSIC = {
  select:     ['TavernAlliance01', 'TavernHorde01', 'stormwind02-moment'],   // character select / creation
  elwynn:     ['DayForest01', 'DayPlains01', 'stormwind04-zone'],
  dunmorogh:  ['DayMountain01', 'IronForge_Walking_01', 'ironforgewalking02', 'ironforgewalking03(glenn)'],
  teldrassil: ['EnchantedForest01', 'NightForest01', 'Darnassus_Walking_1', 'darnassuswalking2', 'darnassuswalking3', 'druidgrove'],
  durotar:    ['DayBarrenDry01', 'orgrimmar01-zone', 'warriorterrace'],
  mulgore:    ['DayPlains01', 'Thunderbluff_Walking_01'],
  tirisfal:   ['CursedLand01', 'CursedLand02', 'undercity01-zone', 'gloomy02', 'spooky01-moment'],
  westfall:   ['DayPlains01', 'DayForest01'],
  barrens:    ['DayBarrenDry01', 'DayPlains01'],
  duskwood:   ['DayEvilForest01', 'CursedLand04', 'NightForest01', 'gloomy02', 'spooky01-moment'],
  ashenvale:  ['NightForest01', 'EnchantedForest01'],
  stv:        ['DayJungle01'],
  tanaris:    ['DayBarrenDry01'],
  ungoro:     ['DayJungle01'],
  steppes:    ['DayVolcanic01-new', 'CursedLand04', 'battle01', 'battle04'],
};
// Themes that aren't tied to one place: mixed into every zone's playlist (one after each zone track)
const MUSIC_GENERAL = ['mystery01-zone', 'mystery02-zone', 'mystery03-zone', 'magic01-zone1', 'sacred01', 'angelic01', 'battle01', 'battle03', 'battle04', 'battle05'];
// Saved for later: Gnomeregan, Naxxramas, battlegrounds
const MUSIC_SPARE = ['gnomeragon01-zone', 'KelThuzad1A', 'pvp1'];
const MUSIC_DING = 'world-of-warcraft-lvl-up';
const MUSIC_GAIN = 0.5;        // overall loudness: the slider's 100% plays at this level
const MUSIC_FADE = 2;          // seconds for a crossfade
const MUSIC_DUCK = 0.3;        // music level while the level-up jingle plays

const TRACK_TITLES = {
  IronForge_Walking_01: 'Ironforge', Darnassus_Walking_1: 'Darnassus', Thunderbluff_Walking_01: 'Thunder Bluff',
  'orgrimmar01-zone': 'Orgrimmar', 'stormwind04-zone': 'Stormwind', 'stormwind02-moment': 'Stormwind Keep', 'undercity01-zone': 'Undercity',
  TavernAlliance01: 'Alliance Tavern', TavernHorde01: 'Horde Tavern', 'mystery01-zone': 'Mystery', 'magic01-zone1': 'Magic',
  'gnomeragon01-zone': 'Gnomeregan', KelThuzad1A: 'Kel\'Thuzad', pvp1: 'Battleground',
  darnassuswalking2: 'Darnassus', darnassuswalking3: 'Darnassus', ironforgewalking02: 'Ironforge', 'ironforgewalking03(glenn)': 'Ironforge',
  druidgrove: 'Druid Grove', warriorterrace: 'Warrior Terrace', 'spooky01-moment': 'Spooky', 'mystery02-zone': 'Mystery', 'mystery03-zone': 'Mystery',
};
// DayForest01 → "Day Forest", DayVolcanic01-new → "Day Volcanic", battle03 → "Battle"
const trackTitle = t => TRACK_TITLES[t] || t.replace(/[-_]?\d+.*$/, '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, c => c.toUpperCase());
const trackUrl = t => MUSIC_DIR + encodeURIComponent(t) + '.mp3';

const MUS = { ctx: null, list: [], i: -1, cur: null, old: [], track: null, unlocked: false, focused: true, master: 0, duckUntil: 0, bad: new Set(), last: 0 };

function musicSettings() {
  const def = { volume: 0.5, muted: false, muteUnfocused: true };
  if (!ACC) return def;
  ACC.settings = ACC.settings || {};
  ACC.settings.music = Object.assign(def, ACC.settings.music || {});
  return ACC.settings.music;
}
function musicSave() { if (ACC) saveAccount(); }

// Volume the music should be at right now
function musicTargetVolume() {
  const s = musicSettings();
  if (s.muted || (s.muteUnfocused && !MUS.focused)) return 0;
  return s.volume * MUSIC_GAIN * (performance.now() < MUS.duckUntil ? MUSIC_DUCK : 1);
}

function shuffled(a) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }

// One cycle of a context's music: zone tracks shuffled, each followed by a random general track
// (at least 3 general tracks per cycle, so zones with few tracks of their own don't loop)
const MUSIC_MIN_GENERAL = 3;
function musicPlaylist(ctx) {
  const own = shuffled(MUSIC[ctx]);
  if (ctx === 'select' || ctx.startsWith('dng_')) return own;   // menus and dungeons keep to their own music
  const extra = shuffled(MUSIC_GENERAL.filter(t => !own.includes(t))).slice(0, Math.max(own.length, MUSIC_MIN_GENERAL));
  const list = [];
  for (let i = 0; i < Math.max(own.length, extra.length); i++) {
    if (own[i]) list.push(own[i]);
    if (extra[i]) list.push(extra[i]);
  }
  return list;
}

// Switch to a zone's (or the select screen's) playlist. Same context: keep the current song.
function musicSetContext(id) {
  if (!MUSIC[id] || MUS.ctx === id) return;
  MUS.ctx = id;
  MUS.list = musicPlaylist(id);
  // Keep playing if the current song is part of the new playlist too
  if (MUS.track && MUS.list.includes(MUS.track)) { MUS.i = MUS.list.indexOf(MUS.track); return; }
  MUS.i = -1;
  musicNext();
}

function musicNext() {
  const list = MUS.list.filter(t => !MUS.bad.has(t));
  if (!list.length) { musicStop(); return; }
  let i = (MUS.i + 1) % MUS.list.length;
  while (MUS.bad.has(MUS.list[i])) i = (i + 1) % MUS.list.length;
  // Reshuffle at the end of the list, without repeating the song that just played
  if (i === 0 && MUS.i >= 0 && MUS.list.length > 1) {
    const prev = MUS.track;
    do MUS.list = musicPlaylist(MUS.ctx); while (MUS.list[0] === prev);
  }
  MUS.i = i;
  musicPlay(MUS.list[i]);
}
function musicSkip() { if (MUS.ctx) musicNext(); musicRefreshUi(); }

function musicStop() {
  if (MUS.cur) { MUS.old.push(MUS.cur); MUS.cur = null; }
  MUS.track = null;
}

function musicPlay(track) {
  musicStop();
  MUS.track = track;
  const el = new Audio();
  el.preload = 'auto'; el.volume = 0; el.gain = 0;
  el.addEventListener('ended', () => { if (el === MUS.cur) musicNext(); });
  el.addEventListener('error', () => { MUS.bad.add(track); if (el === MUS.cur) musicNext(); });
  el.src = trackUrl(track);
  MUS.cur = el;
  if (MUS.unlocked) el.play().catch(() => {});
  musicRefreshUi();
}

// Level-up jingle; the music dips while it plays
function musicDing() {
  const v = musicTargetVolume();
  if (!v || !MUS.unlocked) return;
  const el = new Audio(trackUrl(MUSIC_DING));
  el.volume = Math.min(1, musicSettings().volume * MUSIC_GAIN);
  el.play().catch(() => {});
  MUS.duckUntil = performance.now() + 4000;
}

// Fades: each element's gain moves towards 1 (current) or 0 (old), the master towards the target volume
function musicTick() {
  const now = performance.now(), dt = Math.min(1, (now - (MUS.last || now)) / 1000); MUS.last = now;
  const step = dt / MUSIC_FADE, target = musicTargetVolume();
  MUS.master += Math.sign(target - MUS.master) * Math.min(Math.abs(target - MUS.master), dt / 1.2);
  if (MUS.cur) MUS.cur.gain = Math.min(1, MUS.cur.gain + step);
  for (const el of MUS.old) el.gain = Math.max(0, el.gain - step);
  MUS.old = MUS.old.filter(el => { if (el.gain > 0) return true; el.pause(); el.removeAttribute('src'); el.load(); return false; });
  for (const el of [MUS.cur, ...MUS.old]) if (el) el.volume = Math.max(0, Math.min(1, el.gain * MUS.master));
}

function musicUpdateFocus() { MUS.focused = !document.hidden && document.hasFocus(); }

// ---------- settings ----------
function musicSetVolume(v) { musicSettings().volume = Math.max(0, Math.min(1, v)); musicSave(); }
function musicToggleMute(on) {
  const s = musicSettings();
  s.muted = on === undefined ? !s.muted : !!on;
  musicSave(); musicRefreshUi();
  if (typeof S !== 'undefined' && S && G.tab === 'settings') markDirty();
}
function musicSetUnfocused(on) { musicSettings().muteUnfocused = !!on; musicSave(); }

function musicNowPlaying() {
  if (!MUS.track) return 'Nothing';
  const where = MUS.ctx === 'select' ? 'Character Select' : MUS.ctx.startsWith('dng_') ? (dungeonById(MUS.ctx.slice(4)) || {}).name : ((typeof ZONES !== 'undefined' && ZONES.find(z => z.id === MUS.ctx)) || {}).name || '';
  return trackTitle(MUS.track) + (where ? ` (${where})` : '');
}

function musicRefreshUi() {
  const b = document.getElementById('muteBtn');
  if (b) { const m = musicSettings().muted; b.textContent = m ? '🔇' : '🔊'; b.title = (m ? 'Unmute music' : 'Mute music') + ' (M)'; b.classList.toggle('off', m); }
  const np = document.getElementById('nowPlaying');
  if (np) np.textContent = musicNowPlaying();
}

function musicSettingsHTML() {
  const s = musicSettings();
  return `<div class="sound">
    <h4>Sound</h4>
    <label class="vol">Music volume <input type="range" min="0" max="100" step="1" value="${Math.round(s.volume * 100)}" data-act="musicVolume"> <b id="volText">${Math.round(s.volume * 100)}%</b></label>
    <label class="toggle"><input type="checkbox" data-act="musicMute" ${s.muted ? 'checked' : ''}> Mute music</label>
    <label class="toggle"><input type="checkbox" data-act="musicUnfocused" ${s.muteUnfocused ? 'checked' : ''}> Mute while the game is in the background</label>
    <div class="np">Now playing: <b id="nowPlaying">${esc(musicNowPlaying())}</b> <button class="btn" data-act="musicSkip">Skip song</button></div>
  </div>`;
}

function initMusic() {
  // Browsers only allow audio after the player has interacted with the page
  const unlock = () => {
    if (MUS.unlocked) return;
    MUS.unlocked = true;
    if (MUS.cur) MUS.cur.play().catch(() => {});
  };
  window.addEventListener('pointerdown', unlock, true);
  window.addEventListener('keydown', unlock, true);
  document.addEventListener('visibilitychange', musicUpdateFocus);
  window.addEventListener('blur', musicUpdateFocus);
  window.addEventListener('focus', musicUpdateFocus);
  musicUpdateFocus();
  window.addEventListener('keydown', ev => {
    if (ev.key !== 'm' && ev.key !== 'M') return;
    if (ev.ctrlKey || ev.metaKey || ev.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName)) return;
    musicToggleMute();
  });
  const b = document.getElementById('muteBtn');
  if (b) b.addEventListener('click', () => musicToggleMute());
  setInterval(musicTick, 50);
  musicRefreshUi();
}
