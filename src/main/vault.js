// ShoxVault — gestionnaire de mots de passe de Fire Shox (processus principal).
//
// Règles de sécurité (ne pas assouplir) :
//  • Les mots de passe sont chiffrés avec safeStorage (DPAPI sous Windows) et rangés dans un fichier à
//    part, passwords.json (dossier du profil). Jamais dans fireshox-data.json (lisible par les pages
//    fireshox://). Sans chiffrement disponible, on refuse d'enregistrer.
//  • Un mot de passe n'est rendu qu'au cadre principal d'une page dont l'ORIGINE (protocole + domaine +
//    port) est exactement celle de l'enregistrement, en https: (ou http://localhost). L'origine vient de
//    e.senderFrame (Chromium), jamais d'une valeur envoyée par la page.
//  • Seule la page fireshox://passwords/ (cadre principal) peut lister, afficher, copier, modifier ou
//    supprimer. Rien ne part sur internet. Aucun mot de passe en clair dans un fichier ou un journal.
'use strict';
const { app, safeStorage, ipcMain, webContents, clipboard, dialog, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const STEP_TTL = 5 * 60 * 1000; // identifiant tapé à l'étape 1 d'une connexion en deux temps
const CONT_TTL = 60 * 1000; // « connexion en 1 clic » qui continue sur la page suivante
const OFFER_TTL = 15 * 60 * 1000; // proposition d'enregistrement en attente
const MAX_USER = 512;
const MAX_PASS = 1024;
const MANAGER_ORIGIN = 'fireshox://passwords';

let file = null;
let data = { v: 1, entries: [], never: [] };
let touchTimer = null;
let hooks = {};

const offers = new Map(); // id → { wcId, origin, username, enc, update, entryId, len, t }
const steps = new Map(); // wcId → { origin, username, t }
const conts = new Map(); // wcId → { origin, id, until }
const rates = new Map(); // wcId → { n, t }

// ---------------------------------------------------------------------------
// Origines
// ---------------------------------------------------------------------------
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

// Origine « remplissable » d'une adresse, ou null : https:, ou http: sur la machine elle-même.
function fillableOrigin(url) {
  let u;
  try { u = new URL(String(url)); } catch { return null; }
  if (u.username || u.password) return null;
  if (u.protocol === 'https:') return u.origin;
  if (u.protocol === 'http:' && LOCAL_HOSTS.has(u.hostname)) return u.origin;
  return null;
}

function hostOf(origin) {
  try { const u = new URL(origin); return u.protocol === 'https:' && !u.port ? u.hostname : u.host; } catch { return origin; }
}

// Origine du cadre qui envoie un message de site, ou null s'il n'a droit à rien.
function siteOrigin(e) {
  const f = e.senderFrame;
  if (!f || f.parent) return null; // cadre principal uniquement : aucune iframe
  const o = fillableOrigin(f.url);
  if (!o) return null;
  if (typeof f.origin === 'string' && f.origin !== o) return null; // iframe sandbox, about:blank…
  const type = e.sender.getType();
  if (type !== 'webview' && type !== 'window') return null;
  if (hooks.isUi && hooks.isUi(e)) return null;
  return o;
}

// La page de gestion fireshox://passwords/ (cadre principal) et rien d'autre.
function isManager(e) {
  const f = e.senderFrame;
  if (!f || f.parent) return false;
  let u;
  try { u = new URL(f.url); } catch { return false; }
  if (u.protocol !== 'fireshox:' || u.host !== 'passwords') return false;
  if (typeof f.origin === 'string' && f.origin && f.origin !== MANAGER_ORIGIN) return false;
  return true;
}

const isUi = (e) => !!(hooks.isUi && hooks.isUi(e));

// ---------------------------------------------------------------------------
// Chiffrement
// ---------------------------------------------------------------------------
function encryptionAvailable() {
  try {
    if (!safeStorage.isEncryptionAvailable()) return false;
    if (process.platform === 'linux' && safeStorage.getSelectedStorageBackend() === 'basic_text') return false;
    return true;
  } catch { return false; }
}
const encrypt = (plain) => safeStorage.encryptString(plain).toString('base64');
const decrypt = (b64) => safeStorage.decryptString(Buffer.from(b64, 'base64'));

// ---------------------------------------------------------------------------
// Fichier passwords.json (écriture atomique, copie de secours .bak)
// ---------------------------------------------------------------------------
function clean(raw) {
  const out = { v: 1, entries: [], never: [] };
  if (!raw || typeof raw !== 'object') return out;
  for (const x of Array.isArray(raw.entries) ? raw.entries : []) {
    if (!x || typeof x.id !== 'string' || typeof x.pw !== 'string' || !fillableOrigin(x.origin)) continue;
    out.entries.push({
      id: x.id, origin: fillableOrigin(x.origin), username: typeof x.username === 'string' ? x.username : '', pw: x.pw,
      created: +x.created || Date.now(), updated: +x.updated || +x.created || Date.now(), used: +x.used || 0, uses: +x.uses || 0,
    });
  }
  for (const o of Array.isArray(raw.never) ? raw.never : []) { const n = fillableOrigin(o); if (n && !out.never.includes(n)) out.never.push(n); }
  return out;
}

function load() {
  file = path.join(app.getPath('userData'), 'passwords.json');
  let raw = null;
  if (fs.existsSync(file)) {
    try { raw = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {
      // Fichier abîmé : on le garde de côté (jamais écrasé) et on tente la copie de secours.
      try { fs.copyFileSync(file, file + '.abime-' + Date.now()); } catch {}
      try { raw = JSON.parse(fs.readFileSync(file + '.bak', 'utf8')); } catch { raw = null; }
    }
  }
  data = clean(raw);
}

function save() {
  clearTimeout(touchTimer);
  touchTimer = null;
  if (!file) return;
  try {
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data));
    if (fs.existsSync(file)) fs.copyFileSync(file, file + '.bak');
    fs.renameSync(tmp, file);
  } catch (err) {
    console.error('[ShoxVault] écriture impossible :', err && err.code ? err.code : 'erreur');
  }
}
// Petites mises à jour (date de dernière utilisation) : regroupées.
function saveSoon() { clearTimeout(touchTimer); touchTimer = setTimeout(save, 800); }

// ---------------------------------------------------------------------------
// Données
// ---------------------------------------------------------------------------
const byId = (id) => data.entries.find((x) => x.id === id);
const forOrigin = (origin) => data.entries.filter((x) => x.origin === origin)
  .sort((a, b) => (b.used || 0) - (a.used || 0) || (b.updated || 0) - (a.updated || 0));

function validText(s, max) { return typeof s === 'string' && s.length <= max && !s.includes('\u0000'); }

// Ajoute ou met à jour (même origine + même identifiant). Renvoie 'added' | 'updated' | 'same'.
function upsert(origin, username, pwB64, plain) {
  const now = Date.now();
  const cur = data.entries.find((x) => x.origin === origin && x.username === username);
  if (cur) {
    if (plain !== undefined) { try { if (decrypt(cur.pw) === plain) return 'same'; } catch {} }
    cur.pw = pwB64;
    cur.updated = now;
    return 'updated';
  }
  data.entries.push({ id: crypto.randomUUID(), origin, username, pw: pwB64, created: now, updated: now, used: 0, uses: 0 });
  return 'added';
}

function notifyChanged(origin) {
  for (const wc of webContents.getAllWebContents()) {
    if (wc.isDestroyed()) continue;
    let url = '';
    try { url = wc.getURL(); } catch {}
    if (url.startsWith(MANAGER_ORIGIN + '/') || (hooks.isUiContents && hooks.isUiContents(wc))) wc.send('vault:changed');
    else if (origin && fillableOrigin(url) === origin) wc.send('vault:refresh');
  }
}

function publicOffer(o) {
  return { id: o.id, contentsId: o.wcId, origin: o.origin, host: hostOf(o.origin), username: o.username, update: o.update, len: Math.min(o.len, 24), unavailable: !o.enc };
}

function settings() { try { return (hooks.settings && hooks.settings()) || {}; } catch { return {}; } }

function prune() {
  const now = Date.now();
  for (const [k, o] of offers) if (now - o.t > OFFER_TTL) offers.delete(k);
  for (const [k, s] of steps) if (now - s.t > STEP_TTL) steps.delete(k);
  for (const [k, c] of conts) if (c.until < now) conts.delete(k);
}

// Pas plus de 12 envois par minute et par onglet (une page ne peut pas noyer l'interface).
function rateOk(wcId) {
  const now = Date.now();
  const r = rates.get(wcId) || { n: 0, t: now };
  if (now - r.t > 60000) { r.n = 0; r.t = now; }
  r.n++;
  rates.set(wcId, r);
  return r.n <= 12;
}

// ---------------------------------------------------------------------------
// Messages des sites (webview-preload.js, monde isolé)
// ---------------------------------------------------------------------------
function onSiteQuery(e) {
  prune();
  const origin = siteOrigin(e);
  if (!origin) return null;
  const wcId = e.sender.id;
  const list = forOrigin(origin);
  const st = steps.get(wcId);
  const remembered = st && st.origin === origin ? st.username : null;
  const prefer = remembered != null ? (list.find((x) => x.username === remembered) || {}).id || null : null;
  let cont = null;
  const c = conts.get(wcId);
  if (c && c.origin === origin && c.until > Date.now() && byId(c.id)) cont = c.id;
  conts.delete(wcId);
  return {
    accounts: list.map((x) => ({ id: x.id, username: x.username })),
    autofill: settings().pwAutofill !== false,
    prefer, cont, stepKnown: remembered != null,
  };
}

function onSiteFill(e, id, opts) {
  const origin = siteOrigin(e);
  if (!origin || typeof id !== 'string') return null;
  const entry = byId(id);
  if (!entry || entry.origin !== origin) return null; // jamais le mot de passe d'une autre origine
  let password;
  try { password = decrypt(entry.pw); } catch { return null; }
  const wcId = e.sender.id;
  entry.used = Date.now();
  entry.uses = (entry.uses || 0) + 1;
  saveSoon();
  steps.set(wcId, { origin, username: entry.username, t: Date.now() });
  if (opts && opts.oneClick) conts.set(wcId, { origin, id, until: Date.now() + CONT_TTL });
  else if (opts && opts.consume) conts.delete(wcId);
  return { username: entry.username, password };
}

function onSiteStep(e, username) {
  const origin = siteOrigin(e);
  if (!origin || !validText(username, MAX_USER)) return;
  const u = username.trim();
  if (!u) return;
  steps.set(e.sender.id, { origin, username: u, t: Date.now() });
}

function onSiteSubmit(e, payload) {
  prune();
  const origin = siteOrigin(e);
  if (!origin || !payload || typeof payload !== 'object') return;
  let { username, password } = payload;
  if (!validText(username, MAX_USER) || !validText(password, MAX_PASS) || !password) return;
  const wc = e.sender;
  if (!rateOk(wc.id)) return;
  username = username.trim();
  if (!username) {
    const st = steps.get(wc.id);
    if (st && st.origin === origin && Date.now() - st.t < STEP_TTL) username = st.username;
  }
  if (settings().pwSave === false) return;
  if (hooks.noSave && hooks.noSave(wc)) return; // fenêtre Fantôme : remplir oui, enregistrer jamais
  if (data.never.includes(origin)) return;

  let same = data.entries.find((x) => x.origin === origin && x.username === username);
  // Mot de passe seul sur un site où un seul compte est connu : c'est sans doute ce compte.
  if (!same && !username) {
    const list = forOrigin(origin);
    if (list.length === 1) { same = list[0]; username = same.username; }
  }
  if (same) {
    let cur = null;
    try { cur = decrypt(same.pw); } catch {}
    if (cur === password) { same.used = Date.now(); saveSoon(); return; } // déjà connu : rien à proposer
  }
  const available = encryptionAvailable();
  const offer = {
    id: crypto.randomUUID(), wcId: wc.id, origin, username, update: !!same, entryId: same ? same.id : null,
    len: password.length, t: Date.now(), enc: available ? safeStorage.encryptString(password) : null,
  };
  password = null;
  for (const [k, o] of offers) if (o.wcId === wc.id) offers.delete(k);
  offers.set(offer.id, offer);
  const ui = hooks.uiFor && hooks.uiFor(wc);
  if (ui && !ui.isDestroyed()) ui.send('vault:offer', publicOffer(offer));
}

function onSiteManage(e) {
  if (!siteOrigin(e)) return;
  if (hooks.openTab) hooks.openTab(e.sender, MANAGER_ORIGIN + '/');
}

// ---------------------------------------------------------------------------
// Messages de l'interface du navigateur (src/ui)
// ---------------------------------------------------------------------------
function onUiSite(e, contentsId) {
  if (!isUi(e)) return null;
  prune();
  const wc = webContents.fromId(+contentsId);
  if (!wc || wc.isDestroyed()) return { accounts: [], available: encryptionAvailable() };
  const origin = fillableOrigin(wc.mainFrame ? wc.mainFrame.url : wc.getURL());
  const offer = [...offers.values()].find((o) => o.wcId === wc.id);
  return {
    origin, host: origin ? hostOf(origin) : '',
    accounts: origin ? forOrigin(origin).map((x) => ({ id: x.id, username: x.username })) : [],
    never: !!(origin && data.never.includes(origin)),
    offer: offer ? publicOffer(offer) : null,
    available: encryptionAvailable(),
  };
}

function onUiReveal(e, offerId) {
  if (!isUi(e)) return null;
  const o = offers.get(offerId);
  if (!o || !o.enc) return null;
  try { return safeStorage.decryptString(o.enc); } catch { return null; }
}

function onUiDecide(e, offerId, action, username) {
  if (!isUi(e)) return { ok: false };
  const o = offers.get(offerId);
  if (!o) return { ok: false, error: 'expired' };
  offers.delete(offerId);
  if (action === 'never') {
    if (!data.never.includes(o.origin)) data.never.push(o.origin);
    save();
    notifyChanged(null);
    return { ok: true, never: true, host: hostOf(o.origin) };
  }
  if (action !== 'save') return { ok: true };
  if (!o.enc || !encryptionAvailable()) return { ok: false, error: 'unavailable' };
  const user = validText(username, MAX_USER) ? username.trim() : o.username;
  const res = upsert(o.origin, user, o.enc.toString('base64'));
  data.never = data.never.filter((x) => x !== o.origin);
  save();
  notifyChanged(o.origin);
  return { ok: true, result: res, host: hostOf(o.origin) };
}

function onUiFill(e, contentsId, id) {
  if (!isUi(e)) return;
  const wc = webContents.fromId(+contentsId);
  const entry = byId(id);
  if (!wc || wc.isDestroyed() || !entry) return;
  if (wc.getType() === 'webview' && wc.hostWebContents !== e.sender) return;
  const frame = wc.mainFrame;
  if (!frame || fillableOrigin(frame.url) !== entry.origin) return;
  // On ne pousse que l'identifiant de l'enregistrement : la page le redemande (vérification d'origine).
  frame.send('vault:fill-request', { id: entry.id });
}

function onUiCopyUser(e, id) {
  if (!isUi(e)) return;
  const entry = byId(id);
  if (entry) clipboard.writeText(entry.username);
}

function onUiTabClosed(e, contentsId) {
  if (!isUi(e)) return;
  for (const [k, o] of offers) if (o.wcId === +contentsId) offers.delete(k);
}

// ---------------------------------------------------------------------------
// Messages de la page de gestion fireshox://passwords/
// ---------------------------------------------------------------------------
function mgrList(e) {
  if (!isManager(e)) return null;
  return {
    available: encryptionAvailable(),
    entries: data.entries.map((x) => ({
      id: x.id, origin: x.origin, host: hostOf(x.origin), username: x.username,
      created: x.created, updated: x.updated, used: x.used, uses: x.uses || 0,
    })).sort((a, b) => a.host.localeCompare(b.host) || a.username.localeCompare(b.username)),
    never: data.never.map((o) => ({ origin: o, host: hostOf(o) })).sort((a, b) => a.host.localeCompare(b.host)),
  };
}

function mgrReveal(e, id) {
  if (!isManager(e)) return null;
  const entry = byId(id);
  if (!entry) return null;
  try { return decrypt(entry.pw); } catch { return null; }
}

function mgrCopy(e, id, field) {
  if (!isManager(e)) return false;
  const entry = byId(id);
  if (!entry) return false;
  if (field === 'username') { clipboard.writeText(entry.username); return true; }
  try { clipboard.writeText(decrypt(entry.pw)); return true; } catch { return false; }
}

function mgrUpdate(e, id, patch) {
  if (!isManager(e) || !patch || typeof patch !== 'object') return { ok: false };
  const entry = byId(id);
  if (!entry) return { ok: false, error: 'introuvable' };
  if (patch.username !== undefined) {
    if (!validText(patch.username, MAX_USER)) return { ok: false, error: 'identifiant' };
    const u = patch.username.trim();
    if (data.entries.some((x) => x !== entry && x.origin === entry.origin && x.username === u)) return { ok: false, error: 'doublon' };
    entry.username = u;
  }
  if (patch.password !== undefined) {
    if (!validText(patch.password, MAX_PASS) || !patch.password) return { ok: false, error: 'mot de passe' };
    if (!encryptionAvailable()) return { ok: false, error: 'unavailable' };
    entry.pw = encrypt(patch.password);
  }
  entry.updated = Date.now();
  save();
  notifyChanged(entry.origin);
  return { ok: true };
}

function mgrDelete(e, id) {
  if (!isManager(e)) return { ok: false };
  const entry = byId(id);
  if (!entry) return { ok: false };
  data.entries = data.entries.filter((x) => x !== entry);
  save();
  notifyChanged(entry.origin);
  return { ok: true };
}

function mgrAdd(e, rec) {
  if (!isManager(e) || !rec || typeof rec !== 'object') return { ok: false };
  let url = typeof rec.url === 'string' ? rec.url.trim() : '';
  if (url && !/^[a-z][a-z0-9+.-]*:/i.test(url)) url = (/^(localhost|127\.0\.0\.1)(:|\/|$)/i.test(url) ? 'http://' : 'https://') + url;
  const origin = fillableOrigin(url);
  if (!origin) return { ok: false, error: 'adresse' };
  if (!validText(rec.username || '', MAX_USER)) return { ok: false, error: 'identifiant' };
  if (!validText(rec.password, MAX_PASS) || !rec.password) return { ok: false, error: 'mot de passe' };
  if (!encryptionAvailable()) return { ok: false, error: 'unavailable' };
  const res = upsert(origin, (rec.username || '').trim(), encrypt(rec.password), rec.password);
  save();
  notifyChanged(origin);
  return { ok: true, result: res };
}

function mgrUnblock(e, origin) {
  if (!isManager(e)) return { ok: false };
  data.never = data.never.filter((x) => x !== origin);
  save();
  notifyChanged(null);
  return { ok: true };
}

// Import du fichier CSV exporté par Chrome (name,url,username,password,note) — aussi Edge, Firefox, Bitwarden.
function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => x !== ''));
}

async function mgrImport(e) {
  if (!isManager(e)) return { ok: false };
  if (!encryptionAvailable()) return { ok: false, error: 'unavailable' };
  const win = BrowserWindow.fromWebContents(e.sender.hostWebContents || e.sender);
  const pick = await dialog.showOpenDialog(win, {
    title: 'Importer des mots de passe (fichier CSV de Chrome)',
    filters: [{ name: 'Mots de passe (CSV)', extensions: ['csv'] }], properties: ['openFile'],
  });
  if (pick.canceled || !pick.filePaths[0]) return { ok: false, canceled: true };
  let text;
  try {
    const st = fs.statSync(pick.filePaths[0]);
    if (st.size > 5 * 1024 * 1024) return { ok: false, error: 'trop gros' };
    text = fs.readFileSync(pick.filePaths[0], 'utf8').replace(/^﻿/, '');
  } catch { return { ok: false, error: 'lecture' }; }
  const rows = parseCsv(text);
  text = null;
  if (!rows.length) return { ok: false, error: 'vide' };
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const col = (...names) => head.findIndex((h) => names.includes(h));
  const iu = col('url', 'login_uri', 'website', 'origin');
  const in_ = col('username', 'login_username', 'login', 'user');
  const ip = col('password', 'login_password');
  if (iu < 0 || ip < 0) return { ok: false, error: 'format' };
  const res = { ok: true, added: 0, updated: 0, skipped: 0 };
  for (const r of rows.slice(1)) {
    const origin = fillableOrigin(r[iu] || '');
    const user = in_ >= 0 ? (r[in_] || '').trim() : '';
    const pass = r[ip] || '';
    if (!origin || !pass || !validText(user, MAX_USER) || !validText(pass, MAX_PASS)) { res.skipped++; continue; }
    const k = upsert(origin, user, encrypt(pass), pass);
    if (k === 'added') res.added++; else if (k === 'updated') res.updated++; else res.skipped++;
  }
  save();
  notifyChanged(null);
  return res;
}

// ---------------------------------------------------------------------------
// Mise en route
// ---------------------------------------------------------------------------
function init(h) {
  hooks = h || {};
  load();
  ipcMain.handle('vault:site-query', onSiteQuery);
  ipcMain.handle('vault:site-fill', onSiteFill);
  ipcMain.on('vault:site-step', onSiteStep);
  ipcMain.on('vault:site-submit', onSiteSubmit);
  ipcMain.on('vault:site-manage', onSiteManage);

  ipcMain.handle('vault:ui-site', onUiSite);
  ipcMain.handle('vault:ui-reveal', onUiReveal);
  ipcMain.handle('vault:ui-decide', onUiDecide);
  ipcMain.on('vault:ui-fill', onUiFill);
  ipcMain.on('vault:ui-copy-user', onUiCopyUser);
  ipcMain.on('vault:ui-tab-closed', onUiTabClosed);

  ipcMain.handle('vault:mgr-list', mgrList);
  ipcMain.handle('vault:mgr-reveal', mgrReveal);
  ipcMain.handle('vault:mgr-copy', mgrCopy);
  ipcMain.handle('vault:mgr-update', mgrUpdate);
  ipcMain.handle('vault:mgr-delete', mgrDelete);
  ipcMain.handle('vault:mgr-add', mgrAdd);
  ipcMain.handle('vault:mgr-unblock', mgrUnblock);
  ipcMain.handle('vault:mgr-import', mgrImport);

  app.on('web-contents-created', (_e, wc) => {
    const id = wc.id;
    wc.once('destroyed', () => { steps.delete(id); conts.delete(id); rates.delete(id); });
  });
  app.on('before-quit', () => { if (touchTimer) save(); });
}

module.exports = { init, fillableOrigin, siteOrigin, isManager, parseCsv, flush: () => { if (touchTimer) save(); } };
