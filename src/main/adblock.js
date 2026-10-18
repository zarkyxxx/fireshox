// ShoxBlock — bloqueur de pubs et de traqueurs de Fire Shox (processus principal).
//
// Moteur : @ghostery/adblocker-electron (EasyList, EasyPrivacy, listes uBlock Origin…). Il est gardé en
// cache dans le profil (shoxblock-engine.bin) : ShoxBlock marche hors ligne dès le 2e lancement, et les
// listes sont mises à jour au plus une fois par jour (dans un fil à part pour ne pas figer le navigateur).
//
// ATTENTION : Electron n'accepte qu'UN écouteur par événement webRequest. ShoxBlock prend
// onBeforeRequest et onHeadersReceived de chaque session : rien d'autre dans Fire Shox ne doit les
// utiliser. L'identité du navigateur (main.js) passe par onBeforeSendHeaders, qui reste libre.
//
// Jamais bloqué : les pages internes fireshox://, l'interface, claude.ai (et anthropic.com), les pages
// de connexion Google, et les sites mis en liste blanche (« Activé sur ce site » décoché).
'use strict';
const { app, ipcMain, webContents } = require('electron');
const fs = require('fs');
const path = require('path');

let ElectronBlocker = null;
let tldts = null;
let PRELOAD = null;
try {
  ({ ElectronBlocker } = require('@ghostery/adblocker-electron'));
  tldts = require('tldts-experimental');
  PRELOAD = require.resolve('@ghostery/adblocker-electron-preload');
} catch (err) {
  console.error('[ShoxBlock] bibliothèque introuvable :', err && err.message);
}

const DAY = 24 * 60 * 60 * 1000;
const NEVER_HOST = /(^|\.)(claude\.ai|anthropic\.com)$/i;

let hooks = {};
let engine = null; // moteur courant (null tant que les listes ne sont pas prêtes)
let engineFile = null;
let updating = null;
let total = 0;
let totalTimer = null;
let allow = new Set(); // domaines où ShoxBlock est coupé
const sessions = new WeakSet();
const counts = new Map(); // webContents.id → { site, n }
const notifyTimers = new Map();

// ---------------------------------------------------------------------------
// Adresses
// ---------------------------------------------------------------------------
function hostOf(url) {
  try { return new URL(url).hostname.toLowerCase(); } catch { return ''; }
}
// « Site » d'une adresse : domaine enregistrable (marmiton.org), ou nom complet pour les cas particuliers
// (localhost, pages traduites *.translate.goog qui ont toutes le même domaine).
function siteOf(url) {
  if (!/^https?:/i.test(url || '')) return '';
  const host = hostOf(url);
  let d = null;
  try { d = tldts.getDomain(url); } catch {}
  if (!d || d === 'translate.goog') return host;
  return d;
}
// Jamais bloqué, ni comme page ni comme requête.
function exempt(url) {
  if (!/^https?:/i.test(url || '')) return true;
  const host = hostOf(url);
  if (!host || NEVER_HOST.test(host)) return true;
  return !!(hooks.isGoogleLogin && hooks.isGoogleLogin(url));
}
function settings() { try { return (hooks.store && hooks.store.get('settings')) || {}; } catch { return {}; } }
const enabledGlobally = () => settings().shoxblock !== false;

// ShoxBlock agit-il sur cette page (adresse de l'onglet) ?
function activeFor(page) {
  if (!engine || !enabledGlobally() || exempt(page)) return false;
  return !allow.has(siteOf(page));
}

function contentsOf(id) {
  if (!id) return null;
  const wc = webContents.fromId(id);
  return wc && !wc.isDestroyed() ? wc : null;
}
function pageFor(details) {
  if (details.resourceType === 'mainFrame') return details.url;
  const wc = contentsOf(details.webContentsId);
  if (wc) { try { return wc.getURL(); } catch {} }
  return details.referrer || '';
}

// ---------------------------------------------------------------------------
// Réseau
// ---------------------------------------------------------------------------
function onBeforeRequest(details, callback) {
  try {
    if (!engine || exempt(details.url) || !activeFor(pageFor(details))) { callback({}); return; }
    engine.onBeforeRequest(details, callback);
  } catch { callback({}); }
}
function onHeadersReceived(details, callback) {
  try {
    if (!engine || exempt(details.url) || !activeFor(pageFor(details))) { callback({}); return; }
    engine.onHeadersReceived(details, callback);
  } catch { callback({}); }
}

// Filtres cosmétiques (masquer les emplacements de pub) : le script de la bibliothèque, chargé dans
// chaque page de la session, demande les règles. On se fie à l'adresse vue par Chromium, pas à celle
// envoyée par la page.
function onCosmetic(event, _url, msg) {
  if (!engine) return undefined;
  const url = (event.senderFrame && event.senderFrame.url) || '';
  if (!activeFor(url)) return undefined;
  // La bibliothèque lance CSS et scriptlets sans attendre le résultat : on avale leurs erreurs (page
  // fermée entre-temps, CSP…) au lieu d'inonder le journal de rejets non gérés.
  const wc = event.sender;
  const quiet = {
    frameId: event.frameId,
    processId: event.processId,
    sender: {
      insertCSS: (css, o) => wc.insertCSS(css, o).catch(() => {}),
      executeJavaScript: (code, gesture) => wc.executeJavaScript(code, gesture).catch(() => {}),
    },
  };
  return engine.onInjectCosmeticFilters(quiet, url, msg);
}

// ---------------------------------------------------------------------------
// Compteurs (par onglet, et total depuis toujours)
// ---------------------------------------------------------------------------
function onBlocked(request) {
  total++;
  if (!totalTimer) totalTimer = setTimeout(saveTotal, 4000);
  const wc = contentsOf(request.tabId);
  if (!wc) return;
  const site = siteOf(wc.getURL());
  let c = counts.get(wc.id);
  if (!c || c.site !== site) { c = { site, n: 0 }; counts.set(wc.id, c); }
  c.n++;
  notifySoon(wc);
}
function saveTotal() {
  clearTimeout(totalTimer);
  totalTimer = null;
  if (hooks.store) hooks.store.set('shoxblock.total', total);
}
function notifySoon(wc) {
  if (notifyTimers.has(wc.id)) return;
  notifyTimers.set(wc.id, setTimeout(() => { notifyTimers.delete(wc.id); notify(wc); }, 220));
}
function notify(wc) {
  if (!wc || wc.isDestroyed()) return;
  const ui = hooks.uiOf && hooks.uiOf(wc);
  const c = counts.get(wc.id);
  if (ui && !ui.isDestroyed()) ui.send('shoxblock:count', wc.id, c ? c.n : 0, total);
}

function watchContents(wc) {
  if (wc.getType() !== 'webview') return;
  const id = wc.id;
  // Le compteur est « par site » : il repart de zéro quand l'onglet change de site.
  wc.on('did-navigate', (_e, url) => {
    const site = siteOf(url);
    const c = counts.get(id);
    if (c && c.site === site) return;
    counts.set(id, { site, n: 0 });
    notify(wc);
  });
  wc.once('destroyed', () => { counts.delete(id); clearTimeout(notifyTimers.get(id)); notifyTimers.delete(id); });
}

// ---------------------------------------------------------------------------
// Moteur : chargement (cache disque), mise à jour quotidienne
// ---------------------------------------------------------------------------
function setEngine(e) {
  e.on('request-blocked', onBlocked);
  e.on('request-redirected', onBlocked);
  engine = e;
}

async function load() {
  if (!ElectronBlocker) return;
  const fresh = !fs.existsSync(engineFile);
  try {
    // Lit le cache s'il existe, sinon télécharge les listes et écrit le cache.
    const e = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch, {
      path: engineFile, read: fs.promises.readFile, write: fs.promises.writeFile,
    });
    setEngine(e);
    if (fresh) hooks.store.set('shoxblock.updated', Date.now());
    else if (!hooks.store.get('shoxblock.updated')) {
      try { hooks.store.set('shoxblock.updated', Math.round(fs.statSync(engineFile).mtimeMs)); } catch {}
    }
    console.log('[ShoxBlock] prêt' + (fresh ? ' (listes téléchargées)' : ' (cache)'));
  } catch (err) {
    console.error('[ShoxBlock] listes indisponibles (hors ligne ?) :', err && err.message);
  }
}

function age() {
  try { return Date.now() - fs.statSync(engineFile).mtimeMs; } catch { return Infinity; }
}
function maybeUpdate() {
  if (!engine || age() >= DAY) update().catch(() => {});
}

// Fabrique le moteur dans un fil à part (l'analyse des listes prend ~0,5 s) ; sinon, sur place.
function buildInWorker() {
  return new Promise((resolve, reject) => {
    let w;
    try {
      const { Worker } = require('worker_threads');
      const lib = require.resolve('@ghostery/adblocker');
      w = new Worker(`
        const { parentPort, workerData } = require('worker_threads');
        const { FiltersEngine } = require(workerData.lib);
        FiltersEngine.fromPrebuiltAdsAndTracking(fetch).then((e) => {
          const buf = e.serialize();
          parentPort.postMessage(buf, [buf.buffer]);
        }, (err) => parentPort.postMessage({ error: String((err && err.message) || err) }));
      `, { eval: true, workerData: { lib } });
    } catch (err) { reject(err); return; }
    const timer = setTimeout(() => { w.terminate(); reject(new Error('délai dépassé')); }, 180000);
    w.once('message', (m) => {
      clearTimeout(timer);
      w.terminate();
      if (!m || m.error || !m.byteLength) reject(new Error((m && m.error) || 'réponse vide'));
      else resolve(m);
    });
    w.once('error', (err) => { clearTimeout(timer); reject(err); });
  });
}

function update() {
  if (!ElectronBlocker) return Promise.resolve(false);
  if (updating) return updating;
  updating = (async () => {
    let buf = null;
    try { buf = await buildInWorker(); } catch (err) {
      console.warn('[ShoxBlock] fil séparé indisponible, mise à jour sur place :', err && err.message);
      buf = (await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch)).serialize();
    }
    const e = ElectronBlocker.deserialize(buf);
    const tmp = engineFile + '.tmp';
    await fs.promises.writeFile(tmp, buf);
    await fs.promises.rename(tmp, engineFile);
    setEngine(e);
    hooks.store.set('shoxblock.updated', Date.now());
    console.log('[ShoxBlock] listes mises à jour');
    return true;
  })().catch((err) => {
    console.error('[ShoxBlock] mise à jour impossible :', err && err.message);
    return false;
  }).finally(() => { updating = null; });
  return updating;
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------
function enable(ses) {
  if (!ElectronBlocker || !ses || sessions.has(ses)) return;
  sessions.add(ses);
  ses.webRequest.onBeforeRequest({ urls: ['<all_urls>'] }, onBeforeRequest);
  ses.webRequest.onHeadersReceived({ urls: ['<all_urls>'] }, onHeadersReceived);
  try { ses.registerPreloadScript({ type: 'frame', id: 'shoxblock-cosmetics', filePath: PRELOAD }); } catch (err) {
    console.warn('[ShoxBlock] filtres cosmétiques indisponibles :', err && err.message);
  }
}

// ---------------------------------------------------------------------------
// Interface (bouton bouclier) et page Paramètres
// ---------------------------------------------------------------------------
function stateFor(contentsId) {
  const wc = contentsOf(+contentsId);
  const url = wc ? wc.getURL() : '';
  const site = siteOf(url);
  const c = wc ? counts.get(wc.id) : null;
  return {
    ready: !!engine,
    enabled: enabledGlobally(),
    site,
    exempt: exempt(url),
    allowed: !!site && allow.has(site),
    count: c && c.site === site ? c.n : 0,
    total,
    updated: hooks.store.get('shoxblock.updated') || 0,
  };
}
function saveAllow() { hooks.store.set('shoxblock.allow', [...allow].sort()); }

function init(h) {
  hooks = h || {};
  engineFile = path.join(app.getPath('userData'), 'shoxblock-engine.bin');
  total = +hooks.store.get('shoxblock.total') || 0;
  allow = new Set((hooks.store.get('shoxblock.allow') || []).filter((s) => typeof s === 'string'));

  ipcMain.handle('@ghostery/adblocker/inject-cosmetic-filters', onCosmetic);
  ipcMain.handle('@ghostery/adblocker/is-mutation-observer-enabled', () => !!(engine && engine.config.enableMutationObserver));

  ipcMain.handle('shoxblock:state', (e, contentsId) => (hooks.isUi(e) ? stateFor(contentsId) : null));
  ipcMain.handle('shoxblock:set-site', (e, contentsId, on) => {
    if (!hooks.isUi(e)) return null;
    const wc = contentsOf(+contentsId);
    const site = wc ? siteOf(wc.getURL()) : '';
    if (!site) return stateFor(contentsId);
    if (on) allow.delete(site); else allow.add(site);
    saveAllow();
    return stateFor(contentsId);
  });
  // Page Paramètres (fireshox://settings/) : liste blanche et mise à jour des listes.
  ipcMain.handle('shoxblock:info', (e) => (hooks.trusted(e) ? {
    ready: !!engine, total, allow: [...allow].sort(), updated: hooks.store.get('shoxblock.updated') || 0,
  } : null));
  ipcMain.handle('shoxblock:unallow', (e, site) => {
    if (!hooks.trusted(e) || typeof site !== 'string') return false;
    allow.delete(site);
    saveAllow();
    return true;
  });
  ipcMain.handle('shoxblock:update', async (e) => {
    if (!hooks.trusted(e)) return { ok: false };
    const ok = await update();
    return { ok: !!ok, updated: hooks.store.get('shoxblock.updated') || 0 };
  });

  app.on('web-contents-created', (_e, wc) => watchContents(wc));
  app.on('before-quit', flush);

  load().then(() => {
    setTimeout(maybeUpdate, 45000);
    setInterval(maybeUpdate, 60 * 60 * 1000);
  });
}

function flush() {
  if (totalTimer) saveTotal();
}

module.exports = { init, enable, flush, siteOf, update, isReady: () => !!engine };
