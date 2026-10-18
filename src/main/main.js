// Fire Shox — processus principal.
// Moteur : Chromium (Electron). Chaque onglet est un <webview> géré par l'interface (src/ui).
// Les sites internes (fireshox://home, fireshox://shoxbench, …) sont servis depuis src/pages.
'use strict';
const {
  app, BrowserWindow, protocol, session, ipcMain, shell, dialog, webContents, clipboard, nativeImage,
} = require('electron');
const path = require('path');
const fs = require('fs');
const store = require('./store');

const ROOT = path.join(__dirname, '..', '..');
const PAGES = path.join(ROOT, 'src', 'pages');
const SHARED = path.join(PAGES, 'shared');
const ASSETS = path.join(ROOT, 'assets');
const UI_FILE = path.join(ROOT, 'src', 'ui', 'index.html');
const WEBVIEW_PRELOAD = path.join(__dirname, 'webview-preload.js');
const UI_PRELOAD = path.join(__dirname, 'preload.js');
const ICON = path.join(ASSETS, process.platform === 'win32' ? 'icon.ico' : 'logo-256.png');
const HOME_URL = 'fireshox://home/';

// ---------------------------------------------------------------------------
// Arguments : --profile=<dossier> (profil séparé), --run=<étapes.json> (pilotage de test),
// --harness (page seule, sans l'interface), et les adresses à ouvrir.
// ---------------------------------------------------------------------------
const args = parseArgs(process.argv.slice(app.isPackaged ? 1 : 2));
function parseArgs(list) {
  const out = { urls: [] };
  for (const a of list) {
    const m = /^--([\w-]+)(?:=(.*))?$/.exec(a);
    if (m) { out[m[1]] = m[2] === undefined ? true : m[2]; continue; }
    if (/^(https?|fireshox|file):/i.test(a)) out.urls.push(a);
    else if (/\.(html?|pdf|svg|png|jpe?g|gif|webp)$/i.test(a) && fs.existsSync(a)) out.urls.push('file:///' + path.resolve(a).replace(/\\/g, '/'));
  }
  return out;
}

if (args.profile) app.setPath('userData', path.resolve(String(args.profile)));
const devRun = !!args.run;
if (devRun) {
  // Captures fiables même si la fenêtre de test est cachée par une autre.
  app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
  app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
  app.commandLine.appendSwitch('disable-renderer-backgrounding');
}

if (!devRun && !app.requestSingleInstanceLock()) {
  app.quit();
  return;
}

app.setName('Fire Shox');
if (process.platform === 'win32') app.setAppUserModelId('com.fireshox.browser');

// Un User-Agent de Chrome classique : beaucoup de sites boudent « Electron ».
{
  const major = process.versions.chrome.split('.')[0];
  const os = process.platform === 'win32' ? 'Windows NT 10.0; Win64; x64'
    : process.platform === 'darwin' ? 'Macintosh; Intel Mac OS X 10_15_7' : 'X11; Linux x86_64';
  app.userAgentFallback = `Mozilla/5.0 (${os}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${major}.0.0.0 Safari/537.36`;
}

// Connexion Google : Google refuse les navigateurs basés sur Electron (« ce navigateur n'est peut-être
// pas sécurisé »). Sur ses pages de connexion uniquement, Fire Shox se présente comme Firefox,
// comme le font d'autres navigateurs Chromium (en-tête, navigator.userAgent, et indices client retirés).
const FIREFOX_UA = (() => {
  const os = process.platform === 'win32' ? 'Windows NT 10.0; Win64; x64'
    : process.platform === 'darwin' ? 'Macintosh; Intel Mac OS X 10.15' : 'X11; Linux x86_64';
  return `Mozilla/5.0 (${os}; rv:150.0) Gecko/20100101 Firefox/150.0`;
})();
const GOOGLE_LOGIN = /^https:\/\/(accounts\.google\.[a-z.]+|accounts\.youtube\.com)(\/|$)/i;
const isGoogleLogin = (url) => GOOGLE_LOGIN.test(url || '');

function setupGoogleLogin(ses) {
  ses.webRequest.onBeforeSendHeaders({ urls: ['https://accounts.google.com/*', 'https://accounts.youtube.com/*'] }, (details, cb) => {
    const h = details.requestHeaders;
    h['User-Agent'] = FIREFOX_UA;
    for (const k of Object.keys(h)) if (/^sec-ch-ua/i.test(k)) delete h[k];
    cb({ requestHeaders: h });
  });
}

function watchGoogleLogin(wc) {
  let spoofed = false;
  wc.on('did-start-navigation', (e) => {
    if (!e.isMainFrame || e.isSameDocument) return;
    const google = isGoogleLogin(e.url);
    if (google !== spoofed) {
      spoofed = google;
      wc.setUserAgent(google ? FIREFOX_UA : app.userAgentFallback);
    }
  });
}

protocol.registerSchemesAsPrivileged([{
  scheme: 'fireshox',
  privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true, codeCache: true },
}]);

// ---------------------------------------------------------------------------
// Sites internes : fireshox://<site>/<chemin>
//   /shared/… et /assets/… sont communs à tous les sites (polices, styles, logo, photos).
// ---------------------------------------------------------------------------
const MIME = {
  '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.avif': 'image/avif',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.mp4': 'video/mp4', '.webm': 'video/webm',
  '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8',
};

function within(base, file) {
  const rel = path.relative(base, file);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

function resolveInternal(u) {
  let rel;
  try { rel = decodeURIComponent(u.pathname || '/'); } catch { return null; }
  let base;
  if (u.hostname === 'assets') base = ASSETS;
  else if (u.hostname === 'shared') base = SHARED;
  else if (rel.startsWith('/shared/')) { base = SHARED; rel = rel.slice(7); }
  else if (rel.startsWith('/assets/')) { base = ASSETS; rel = rel.slice(7); }
  else base = path.join(PAGES, u.hostname);
  if (!/^[\w-]+$/.test(u.hostname) || !fs.existsSync(base)) return null;
  let file = path.normalize(path.join(base, rel));
  if (!within(base, file)) return null;
  try { if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html'); } catch { return null; }
  return fs.existsSync(file) ? file : null;
}

function registerInternalProtocol(ses) {
  ses.protocol.handle('fireshox', async (req) => {
    const u = new URL(req.url);
    const file = resolveInternal(u);
    if (!file) {
      const nf = path.join(PAGES, 'error', 'index.html');
      const body = fs.existsSync(nf) ? await fs.promises.readFile(nf) : 'Page introuvable';
      return new Response(body, { status: 404, headers: { 'content-type': 'text/html; charset=utf-8' } });
    }
    const body = await fs.promises.readFile(file);
    return new Response(body, {
      status: 200,
      headers: { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-cache' },
    });
  });
}

// ---------------------------------------------------------------------------
// Fenêtres
// ---------------------------------------------------------------------------
const windows = new Set();

function createBrowserWindow(urls = []) {
  const st = store.get('window') || {};
  const isMac = process.platform === 'darwin';
  const win = new BrowserWindow({
    width: st.width || 1380,
    height: st.height || 880,
    x: windows.size ? undefined : st.x,
    y: windows.size ? undefined : st.y,
    minWidth: 560,
    minHeight: 420,
    title: 'Fire Shox',
    icon: ICON,
    show: false,
    backgroundColor: '#0c0b10',
    titleBarStyle: 'hidden',
    ...(isMac ? { trafficLightPosition: { x: 14, y: 15 } } : { titleBarOverlay: { color: '#0e0d13', symbolColor: '#ece6dc', height: 44 } }),
    webPreferences: {
      preload: UI_PRELOAD,
      contextIsolation: true,
      sandbox: true,
      webviewTag: true,
      spellcheck: false,
    },
  });
  const first = windows.size === 0;
  windows.add(win);
  if (st.maximized && first) win.maximize();
  win.loadFile(UI_FILE, { query: { urls: JSON.stringify(urls), platform: process.platform, restore: first ? '1' : '0' } });
  win.once('ready-to-show', () => win.show());

  const saveBounds = () => {
    if (win.isDestroyed() || win.isMinimized() || win.isFullScreen()) return;
    const maximized = win.isMaximized();
    const b = maximized ? (store.get('window') || {}) : win.getBounds();
    store.set('window', { x: b.x, y: b.y, width: b.width, height: b.height, maximized });
  };
  win.on('resize', saveBounds);
  win.on('move', saveBounds);
  win.on('maximize', () => win.webContents.send('win:state', { maximized: true }));
  win.on('unmaximize', () => win.webContents.send('win:state', { maximized: false }));
  win.on('enter-full-screen', () => win.webContents.send('win:state', { fullscreen: true }));
  win.on('leave-full-screen', () => win.webContents.send('win:state', { fullscreen: false }));
  // Boutons « précédent / suivant » de la souris (Windows).
  win.on('app-command', (_e, cmd) => {
    if (cmd === 'browser-backward') win.webContents.send('shortcut', 'back');
    if (cmd === 'browser-forward') win.webContents.send('shortcut', 'forward');
  });
  win.webContents.on('before-input-event', (e, input) => handleShortcutInput(win, e, input));
  win.on('closed', () => windows.delete(win));
  return win;
}

// Fenêtre « page seule » pour les tests : charge directement un site interne, sans onglets.
function createHarnessWindow(url, size) {
  const win = new BrowserWindow({
    width: size?.[0] || 1280, height: size?.[1] || 800, useContentSize: true, show: !args.hidden,
    backgroundColor: '#0c0b10', icon: ICON, autoHideMenuBar: true,
    webPreferences: { preload: WEBVIEW_PRELOAD, contextIsolation: true, sandbox: true },
  });
  win.setMenu(null);
  win.loadURL(url || HOME_URL);
  windows.add(win);
  win.on('closed', () => windows.delete(win));
  return win;
}

function focusedWindow() {
  const w = BrowserWindow.getFocusedWindow();
  if (w && windows.has(w)) return w;
  return [...windows].pop() || null;
}

function uiOf(contents) {
  // Interface (fenêtre) qui contient ce webview, ou null.
  const host = contents.hostWebContents;
  return host && !host.isDestroyed() ? host : null;
}

// ---------------------------------------------------------------------------
// Raccourcis clavier (interface ET pages) → envoyés à l'interface
// ---------------------------------------------------------------------------
function shortcutFor(input) {
  if (input.type !== 'keyDown') return null;
  const mod = process.platform === 'darwin' ? input.meta : input.control;
  const { code, key } = input;
  if (mod && !input.alt) {
    if (key === '+' || key === '=' || code === 'NumpadAdd') return 'zoom-in';
    if (key === '-' || code === 'NumpadSubtract') return 'zoom-out';
    if (code === 'Digit0' || code === 'Numpad0') return 'zoom-reset';
  }
  if (mod && input.shift && !input.alt) {
    if (code === 'KeyT') return 'reopen-tab';
    if (code === 'Tab') return 'prev-tab';
    if (code === 'KeyB') return 'toggle-bookmarks';
    if (code === 'KeyI') return 'devtools';
    if (code === 'KeyR') return 'hard-reload';
    if (code === 'Delete') return 'clear-data';
    return null;
  }
  if (mod && !input.shift && !input.alt) {
    switch (code) {
      case 'KeyT': return 'new-tab';
      case 'KeyW': case 'F4': return 'close-tab';
      case 'KeyN': return 'new-window';
      case 'KeyL': return 'focus-omnibox';
      case 'KeyR': return 'reload';
      case 'KeyF': return 'find';
      case 'KeyH': return 'history';
      case 'KeyJ': return 'downloads';
      case 'KeyD': return 'bookmark';
      case 'KeyP': return 'print';
      case 'KeyU': return 'view-source';
      case 'Tab': case 'PageDown': return 'next-tab';
      case 'PageUp': return 'prev-tab';
      case 'F5': return 'hard-reload';
    }
    if (/^Digit[1-9]$/.test(code)) return 'tab-' + code.slice(5);
    return null;
  }
  if (input.alt && !mod && !input.shift) {
    if (code === 'ArrowLeft') return 'back';
    if (code === 'ArrowRight') return 'forward';
    if (code === 'Home') return 'home';
    if (code === 'KeyD') return 'focus-omnibox';
    return null;
  }
  if (!mod && !input.alt) {
    switch (code) {
      case 'F5': return 'reload';
      case 'F6': return 'focus-omnibox';
      case 'F11': return 'fullscreen';
      case 'F12': return 'devtools';
      case 'BrowserBack': return 'back';
      case 'BrowserForward': return 'forward';
    }
  }
  return null;
}

function handleShortcutInput(win, e, input) {
  if (input.type === 'keyDown' && input.key === 'Escape') {
    // Échap reste aussi pour la page : on prévient juste l'interface.
    win.webContents.send('shortcut', 'escape');
    return;
  }
  const s = shortcutFor(input);
  if (!s) return;
  e.preventDefault();
  if (s === 'new-window') { createBrowserWindow(); return; }
  win.webContents.send('shortcut', s);
}

// ---------------------------------------------------------------------------
// Onglets (webviews) : sécurité, popups, menus contextuels, liens externes
// ---------------------------------------------------------------------------
const SAFE_SCHEMES = /^(https?|fireshox|file|about|data|blob|view-source|chrome-extension|devtools):/i;

app.on('web-contents-created', (_e, contents) => {
  watchGoogleLogin(contents);
  if (contents.getType() === 'window') {
    contents.on('will-attach-webview', (_ev, webPreferences, params) => {
      webPreferences.preload = WEBVIEW_PRELOAD;
      delete webPreferences.preloadURL;
      webPreferences.nodeIntegration = false;
      webPreferences.nodeIntegrationInSubFrames = false;
      webPreferences.contextIsolation = true;
      webPreferences.sandbox = true;
      webPreferences.plugins = true; // lecteur PDF intégré
      webPreferences.spellcheck = true;
      if (params.src && !SAFE_SCHEMES.test(params.src)) params.src = HOME_URL;
    });
  }
  if (contents.getType() !== 'webview') return;

  contents.setWindowOpenHandler(({ url, disposition }) => {
    if (!SAFE_SCHEMES.test(url)) { openExternalSafely(url); return { action: 'deny' }; }
    const ui = uiOf(contents);
    if (disposition === 'new-window' && ui) {
      // Vraie fenêtre popup (connexions Google, paiements…) : garde le lien avec la page.
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 520, height: 680, autoHideMenuBar: true, icon: ICON, backgroundColor: '#ffffff',
          webPreferences: { preload: WEBVIEW_PRELOAD, contextIsolation: true, sandbox: true, nodeIntegration: false },
        },
      };
    }
    if (ui) ui.send('tab:new', { url, background: disposition === 'background-tab', opener: contents.id });
    return { action: 'deny' };
  });

  contents.on('will-navigate', (e, url) => {
    if (!SAFE_SCHEMES.test(url) && !/^javascript:/i.test(url)) { e.preventDefault(); openExternalSafely(url); }
  });

  contents.on('context-menu', (_e, p) => {
    const ui = uiOf(contents);
    if (!ui) return;
    ui.send('guest:context-menu', contents.id, {
      x: p.x, y: p.y, linkURL: p.linkURL, linkText: p.linkText, srcURL: p.srcURL, mediaType: p.mediaType,
      hasImageContents: p.hasImageContents, selectionText: p.selectionText, isEditable: p.isEditable,
      editFlags: p.editFlags, misspelledWord: p.misspelledWord, dictionarySuggestions: p.dictionarySuggestions,
      pageURL: p.pageURL, frameURL: p.frameURL, canGoBack: contents.navigationHistory.canGoBack(),
      canGoForward: contents.navigationHistory.canGoForward(),
    });
  });

  // Ctrl + molette : zoom de l'onglet
  contents.on('zoom-changed', (_e, dir) => {
    const ui = uiOf(contents);
    if (ui) ui.send('shortcut', dir === 'in' ? 'zoom-in' : 'zoom-out');
  });

  contents.on('before-input-event', (e, input) => {
    const ui = uiOf(contents);
    if (!ui) return;
    const win = BrowserWindow.fromWebContents(ui);
    if (win) handleShortcutInput(win, e, input);
  });
});

function openExternalSafely(url) {
  if (!/^(mailto|tel|sms|steam|discord|spotify|zoommtg|msteams|ms-[\w-]+|magnet|webcal|slack|whatsapp|tg|skype):/i.test(url)) return;
  const win = focusedWindow();
  dialog.showMessageBox(win, {
    type: 'question', buttons: ['Ouvrir', 'Annuler'], defaultId: 0, cancelId: 1, title: 'Fire Shox',
    message: 'Ouvrir cette adresse avec une autre application ?', detail: url.slice(0, 300),
  }).then((r) => { if (r.response === 0) shell.openExternal(url); });
}

// ---------------------------------------------------------------------------
// Téléchargements
// ---------------------------------------------------------------------------
const downloads = new Map();
let dlSeq = Date.now();

function uniquePath(p) {
  if (!fs.existsSync(p)) return p;
  const dir = path.dirname(p), ext = path.extname(p), base = path.basename(p, ext);
  for (let i = 1; i < 1000; i++) {
    const c = path.join(dir, `${base} (${i})${ext}`);
    if (!fs.existsSync(c)) return c;
  }
  return path.join(dir, `${base}-${Date.now()}${ext}`);
}

function broadcastUI(channel, ...payload) {
  for (const w of windows) if (!w.isDestroyed() && w.webContents.getURL().startsWith('file:')) w.webContents.send(channel, ...payload);
}

function setupDownloads(ses) {
  ses.on('will-download', (_e, item) => {
    const dir = app.getPath('downloads');
    const savePath = uniquePath(path.join(dir, item.getFilename() || 'telechargement'));
    item.setSavePath(savePath);
    const rec = {
      id: ++dlSeq, name: path.basename(savePath), path: savePath, url: item.getURL(),
      total: item.getTotalBytes(), received: 0, state: 'progressing', paused: false, start: Date.now(),
    };
    downloads.set(rec.id, { item, rec });
    broadcastUI('download:update', rec, true);
    let last = 0;
    item.on('updated', (_ev, state) => {
      rec.received = item.getReceivedBytes();
      rec.total = item.getTotalBytes();
      rec.state = state;
      rec.paused = item.isPaused();
      const now = Date.now();
      if (now - last > 200) { last = now; broadcastUI('download:update', rec); }
    });
    item.once('done', (_ev, state) => {
      rec.state = state;
      rec.received = item.getReceivedBytes();
      rec.end = Date.now();
      broadcastUI('download:update', rec);
      const list = (store.get('downloads') || []).filter((d) => d.id !== rec.id);
      list.unshift({ ...rec });
      store.set('downloads', list.slice(0, 200));
      downloads.delete(rec.id);
    });
  });
}

// ---------------------------------------------------------------------------
// Autorisations (caméra, micro, position…) : on demande, comme Chrome.
// ---------------------------------------------------------------------------
const PERMISSION_LABELS = {
  media: 'utiliser votre caméra et/ou votre micro',
  geolocation: 'connaître votre position',
  notifications: 'afficher des notifications',
  midi: 'utiliser vos appareils MIDI',
  midiSysex: 'contrôler vos appareils MIDI',
  'clipboard-read': 'lire votre presse-papiers',
  'display-capture': 'partager votre écran',
  hid: 'accéder à vos périphériques',
  serial: 'accéder à vos ports série',
  usb: 'accéder à vos appareils USB',
  'idle-detection': 'savoir quand vous êtes inactif',
};
const ALWAYS_OK = new Set(['fullscreen', 'pointerLock', 'clipboard-sanitized-write', 'window-management', 'speaker-selection', 'keyboardLock']);

function originOf(url) {
  try { const u = new URL(url); return u.protocol === 'fireshox:' ? 'fireshox://' + u.host : u.origin; } catch { return ''; }
}

function setupPermissions(ses) {
  ses.setPermissionRequestHandler((wc, permission, callback, details) => {
    const origin = originOf(details.requestingUrl || wc.getURL());
    if (origin.startsWith('fireshox://') || ALWAYS_OK.has(permission)) return callback(true);
    const label = PERMISSION_LABELS[permission];
    if (!label) return callback(false);
    const saved = store.get('permissions') || {};
    const key = origin + '|' + permission;
    if (key in saved) return callback(!!saved[key]);
    const host = (() => { try { return new URL(origin).host; } catch { return origin; } })();
    const win = BrowserWindow.fromWebContents(wc.hostWebContents || wc) || focusedWindow();
    dialog.showMessageBox(win, {
      type: 'question', buttons: ['Autoriser', 'Bloquer'], defaultId: 1, cancelId: 1, title: 'Fire Shox — ShoxGuard',
      message: `${host} veut ${label}.`, checkboxLabel: 'Se souvenir de ce choix pour ce site', checkboxChecked: true,
    }).then((r) => {
      const ok = r.response === 0;
      if (r.checkboxChecked) { saved[key] = ok; store.set('permissions', saved); }
      callback(ok);
    }).catch(() => callback(false));
  });
  ses.setPermissionCheckHandler((_wc, permission, requestingOrigin) => {
    const origin = originOf(requestingOrigin);
    if (origin.startsWith('fireshox://') || ALWAYS_OK.has(permission)) return true;
    const saved = store.get('permissions') || {};
    return saved[origin + '|' + permission] === true;
  });
}

// ---------------------------------------------------------------------------
// IPC
// ---------------------------------------------------------------------------
function trusted(e) {
  if (e.sender.getType() === 'window' && windows.has(BrowserWindow.fromWebContents(e.sender))) {
    const url = e.senderFrame?.url || '';
    return url.startsWith('file:') || url.startsWith('fireshox:');
  }
  const url = e.senderFrame?.url || '';
  return url.startsWith('fireshox:');
}

function notifyStoreChange(key, value, sender) {
  for (const wc of webContents.getAllWebContents()) {
    if (wc.isDestroyed() || wc === sender) continue;
    const url = wc.getURL();
    if (url.startsWith('fireshox:') || url.startsWith('file:')) wc.send('store:changed', key, value);
  }
}

ipcMain.on('store:get', (e, key) => { e.returnValue = trusted(e) ? store.get(key) : undefined; });
ipcMain.on('store:set', (e, key, value) => {
  if (!trusted(e) || typeof key !== 'string') return;
  store.set(key, value);
  notifyStoreChange(key, value, e.sender);
});
ipcMain.handle('store:get-async', (e, key) => (trusted(e) ? store.get(key) : undefined));

// Une page interne demande l'ouverture d'une adresse (nouvel onglet ou même onglet).
ipcMain.on('page:open', (e, url, opts = {}) => {
  if (!trusted(e) || typeof url !== 'string' || !SAFE_SCHEMES.test(url)) return;
  const ui = uiOf(e.sender);
  if (ui) ui.send('tab:new', { url, background: !!opts.background, sameTab: !!opts.sameTab, from: e.sender.id });
  else if (opts.sameTab !== false) e.sender.loadURL(url);
});

ipcMain.handle('app:info', () => ({
  version: app.getVersion(), electron: process.versions.electron, chrome: process.versions.chrome,
  node: process.versions.node, platform: process.platform, packaged: app.isPackaged,
  userData: app.getPath('userData'), downloads: app.getPath('downloads'),
}));

ipcMain.on('app:new-window', (e, urls) => { if (trusted(e)) createBrowserWindow(Array.isArray(urls) ? urls : []); });

ipcMain.handle('download:list', () => ({ active: [...downloads.values()].map((d) => d.rec), past: store.get('downloads') || [] }));
ipcMain.on('download:action', (e, id, action) => {
  if (!trusted(e)) return;
  const live = downloads.get(id);
  const rec = live?.rec || (store.get('downloads') || []).find((d) => d.id === id);
  if (!rec) return;
  if (action === 'open') shell.openPath(rec.path);
  if (action === 'show') shell.showItemInFolder(rec.path);
  if (action === 'pause' && live) live.item.pause();
  if (action === 'resume' && live && live.item.canResume()) live.item.resume();
  if (action === 'cancel' && live) live.item.cancel();
  if (action === 'remove') {
    store.set('downloads', (store.get('downloads') || []).filter((d) => d.id !== id));
    broadcastUI('download:removed', id);
  }
});
ipcMain.on('download:clear', (e) => { if (trusted(e)) { store.set('downloads', []); broadcastUI('download:removed', 'all'); } });

ipcMain.handle('data:clear', async (e, what = {}) => {
  if (!trusted(e)) return false;
  const ses = session.defaultSession;
  if (what.history) { store.set('history', []); notifyStoreChange('history', [], null); }
  if (what.cache) await ses.clearCache();
  if (what.cookies) await ses.clearStorageData({ storages: ['cookies', 'localstorage', 'indexdb', 'serviceworkers', 'cachestorage', 'websql', 'filesystem', 'shadercache'] });
  if (what.permissions) store.set('permissions', {});
  if (what.downloads) store.set('downloads', []);
  return true;
});

ipcMain.on('guest:op', (e, id, op, a, b) => {
  if (!trusted(e)) return;
  const wc = webContents.fromId(id);
  if (!wc || wc.isDestroyed()) return;
  if (op === 'copyImageAt') wc.copyImageAt(a, b);
  if (op === 'saveImage') wc.downloadURL(a);
  if (op === 'inspect') wc.inspectElement(a, b);
  if (op === 'addWord') wc.session.addWordToSpellCheckerDictionary(a);
});

ipcMain.on('clipboard:write', (e, text) => { if (trusted(e)) clipboard.writeText(String(text)); });
ipcMain.on('shell:external', (e, url) => { if (trusted(e) && /^https?:/i.test(url)) shell.openExternal(url); });
// Ouvre le réglage Windows « Applications par défaut » (l'installateur a déclaré Fire Shox comme navigateur).
ipcMain.on('shell:default-apps', (e) => {
  if (!trusted(e)) return;
  if (process.platform === 'win32') shell.openExternal('ms-settings:defaultapps');
  else if (process.platform === 'darwin') shell.openExternal('x-apple.systempreferences:com.apple.preference.general');
});
ipcMain.on('win:set-overlay', (e, colors) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (win && process.platform !== 'darwin') { try { win.setTitleBarOverlay(colors); } catch {} }
});
ipcMain.on('win:fullscreen', (e, on) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (win) win.setFullScreen(on === undefined ? !win.isFullScreen() : !!on);
});

// ---------------------------------------------------------------------------
// Mises à jour automatiques (versions publiées sur GitHub)
// ---------------------------------------------------------------------------
let updater = null;
function setupUpdater() {
  if (!app.isPackaged) return;
  try {
    ({ autoUpdater: updater } = require('electron-updater'));
  } catch { return; }
  updater.autoDownload = true;
  updater.autoInstallOnAppQuit = true;
  updater.on('update-available', (i) => broadcastUI('update:status', { state: 'downloading', version: i.version }));
  updater.on('download-progress', (p) => broadcastUI('update:status', { state: 'downloading', percent: Math.round(p.percent) }));
  updater.on('update-downloaded', (i) => broadcastUI('update:status', { state: 'ready', version: i.version }));
  updater.on('update-not-available', () => broadcastUI('update:status', { state: 'none' }));
  updater.on('error', (err) => broadcastUI('update:status', { state: 'error', message: String(err?.message || err).slice(0, 200) }));
  setTimeout(() => updater.checkForUpdates().catch(() => {}), 4000);
  setInterval(() => updater.checkForUpdates().catch(() => {}), 2 * 60 * 60 * 1000);
}
ipcMain.handle('update:check', async (e) => {
  if (!trusted(e)) return { state: 'error' };
  if (!updater) return { state: app.isPackaged ? 'error' : 'dev' };
  try { await updater.checkForUpdates(); return { state: 'checking' }; } catch (err) { return { state: 'error', message: String(err?.message || err) }; }
});
ipcMain.on('update:install', (e) => { if (trusted(e) && updater) updater.quitAndInstall(false, true); });

// ---------------------------------------------------------------------------
// Pilotage de test (--run=étapes.json) : ouvrir, attendre, exécuter du JS, cliquer, capturer.
// ---------------------------------------------------------------------------
async function runSteps(file) {
  const steps = JSON.parse(fs.readFileSync(file, 'utf8'));
  const harness = !!args.harness;
  const first = steps.find((s) => s.open)?.open || HOME_URL;
  const size = steps.find((s) => s.size)?.size;
  const win = harness ? createHarnessWindow(first, size) : createBrowserWindow([first]);
  if (!harness && size) win.setContentSize(size[0], size[1]);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  win.webContents.on('console-message', (e) => { if (e.level === 'error' || e.level === 'warning' || e.level === 3) console.log('[console]', e.message, e.sourceId ? '(' + e.sourceId.split('/').pop() + ':' + e.lineNumber + ')' : ''); });
  await new Promise((r) => win.webContents.once('did-finish-load', r));
  await sleep(600);
  const log = (...m) => console.log('[run]', ...m);
  const guest = async () => {
    if (harness) return win.webContents;
    const id = await win.webContents.executeJavaScript('window.FS && FS.activeContentsId && FS.activeContentsId()');
    return id ? webContents.fromId(id) : win.webContents;
  };
  for (const s of steps) {
    try {
      if (s.open && s !== steps.find((x) => x.open)) {
        if (harness) await win.webContents.loadURL(s.open);
        else win.webContents.send('tab:new', { url: s.open });
        await sleep(400);
      }
      if (s.wait) await sleep(s.wait);
      if (s.js) { const r = await (await guest()).executeJavaScript(s.js, true); if (r !== undefined) log('js →', JSON.stringify(r).slice(0, 2000)); }
      if (s.ui) { const r = await win.webContents.executeJavaScript(s.ui, true); if (r !== undefined) log('ui →', JSON.stringify(r).slice(0, 2000)); }
      if (s.click) {
        const target = s.target === 'ui' ? win.webContents : await guest();
        const [x, y] = s.click;
        const button = s.button || 'left';
        target.sendInputEvent({ type: 'mouseMove', x, y });
        target.sendInputEvent({ type: 'mouseDown', x, y, button, clickCount: 1 });
        target.sendInputEvent({ type: 'mouseUp', x, y, button, clickCount: 1 });
      }
      if (s.key) {
        const target = s.target === 'ui' ? win.webContents : await guest();
        target.sendInputEvent({ type: 'keyDown', keyCode: s.key, modifiers: s.modifiers || [] });
        if (s.key.length === 1) target.sendInputEvent({ type: 'char', keyCode: s.key });
        target.sendInputEvent({ type: 'keyUp', keyCode: s.key });
      }
      if (s.type) {
        const target = s.target === 'ui' ? win.webContents : await guest();
        for (const ch of s.type) target.sendInputEvent({ type: 'char', keyCode: ch });
      }
      if (s.shot) {
        const img = await win.webContents.capturePage();
        fs.mkdirSync(path.dirname(path.resolve(s.shot)), { recursive: true });
        fs.writeFileSync(path.resolve(s.shot), img.toPNG());
        log('capture', s.shot);
      }
      if (s.log) log(s.log);
      if (s.quit) break;
    } catch (err) {
      log('ERREUR étape', JSON.stringify(s).slice(0, 200), String(err?.stack || err));
    }
  }
  store.flush();
  app.exit(0);
}

// ---------------------------------------------------------------------------
// Cycle de vie
// ---------------------------------------------------------------------------
app.on('second-instance', (_e, argv) => {
  const extra = parseArgs(argv.slice(1)).urls;
  const win = focusedWindow();
  if (!win) { createBrowserWindow(extra); return; }
  if (win.isMinimized()) win.restore();
  win.focus();
  for (const url of extra) win.webContents.send('tab:new', { url });
});

app.whenReady().then(() => {
  store.init();
  const ses = session.defaultSession;
  registerInternalProtocol(ses);
  setupDownloads(ses);
  setupPermissions(ses);
  setupGoogleLogin(ses);
  try { ses.setSpellCheckerLanguages(['fr', 'en-US']); } catch {}
  ses.on('session-created', () => {});
  app.on('session-created', (s) => { try { registerInternalProtocol(s); setupDownloads(s); setupPermissions(s); } catch {} });

  if (devRun) { runSteps(path.resolve(String(args.run))); return; }
  createBrowserWindow(args.urls);
  setupUpdater();

  app.on('activate', () => { if (windows.size === 0) createBrowserWindow(); });
});

app.on('window-all-closed', () => {
  store.flush();
  if (process.platform !== 'darwin') app.quit();
});
app.on('before-quit', () => store.flush());

// Exposé pour les tests éventuels.
module.exports = { resolveInternal, shortcutFor, nativeImage };
