// Fire Shox — processus principal.
// Moteur : Chromium (Electron). Chaque onglet est un <webview> géré par l'interface (src/ui).
// Les sites internes (fireshox://home, fireshox://shoxbench, …) sont servis depuis src/pages.
'use strict';
const {
  app, BrowserWindow, protocol, session, ipcMain, shell, dialog, webContents, clipboard, nativeImage, screen,
} = require('electron');
const path = require('path');
const fs = require('fs');
const store = require('./store');
const vault = require('./vault');
const adblock = require('./adblock');
const shot = require('./shot');
const claude = require('./claude');

const ROOT = path.join(__dirname, '..', '..');
const PAGES = path.join(ROOT, 'src', 'pages');
const SHARED = path.join(PAGES, 'shared');
const ASSETS = path.join(ROOT, 'assets');
const UI_FILE = path.join(ROOT, 'src', 'ui', 'index.html');
const WEBVIEW_PRELOAD = path.join(__dirname, 'webview-preload.js');
const UI_PRELOAD = path.join(__dirname, 'preload.js');
const ICON = path.join(ASSETS, process.platform === 'win32' ? 'icon.ico' : 'logo-256.png');
const HOME_URL = 'fireshox://home/';
const GHOST_HOME = 'fireshox://ghost/';

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

// ---------------------------------------------------------------------------
// Identité du navigateur. Fire Shox se présente comme Google Chrome (même version que son moteur
// Chromium), jusque dans les détails que Google vérifie avant d'accepter une connexion : marque
// « Google Chrome » dans les indices client (en-têtes sec-ch-ua et navigator.userAgentData) et objet
// window.chrome complet (voir webview-preload.js). Si Google refuse malgré tout (« Couldn't sign you
// in »), on essaie une autre identité sur ses pages de connexion (Edge, puis Firefox), on relance la
// connexion et on retient celle qui passe (clé « googleLoginMode »).
// ---------------------------------------------------------------------------
const CHROME_FULL = process.versions.chrome;
const CHROME_MAJOR = CHROME_FULL.split('.')[0];
const CHROME_UA = (() => {
  const os = process.platform === 'win32' ? 'Windows NT 10.0; Win64; x64'
    : process.platform === 'darwin' ? 'Macintosh; Intel Mac OS X 10_15_7' : 'X11; Linux x86_64';
  return `Mozilla/5.0 (${os}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROME_MAJOR}.0.0.0 Safari/537.36`;
})();
const FIREFOX_UA = (() => {
  const os = process.platform === 'win32' ? 'Windows NT 10.0; Win64; x64'
    : process.platform === 'darwin' ? 'Macintosh; Intel Mac OS X 10.15' : 'X11; Linux x86_64';
  return `Mozilla/5.0 (${os}; rv:150.0) Gecko/20100101 Firefox/150.0`;
})();
app.userAgentFallback = CHROME_UA;

const IDENTITIES = {
  chrome: { ua: CHROME_UA, brand: 'Google Chrome' },
  edge: { ua: `${CHROME_UA} Edg/${CHROME_MAJOR}.0.0.0`, brand: 'Microsoft Edge' },
  firefox: { ua: FIREFOX_UA, brand: null },
};
const LOGIN_MODES = ['chrome', 'edge', 'firefox'];
const GOOGLE_LOGIN = /^https:\/\/(accounts\.google\.[a-z.]+|accounts\.youtube\.com)(\/|$)/i;
const GOOGLE_REJECTED = /^https:\/\/accounts\.google\.[a-z.]+\/(v3\/)?signin\/rejected/i;
const isGoogleLogin = (url) => GOOGLE_LOGIN.test(url || '');

let loginMode = null;
function getLoginMode() {
  if (!loginMode) {
    const saved = store.get('googleLoginMode');
    loginMode = LOGIN_MODES.includes(saved) ? saved : 'chrome';
  }
  return loginMode;
}
function setLoginMode(mode) {
  loginMode = mode;
  store.set('googleLoginMode', mode);
}
const identityFor = (url) => IDENTITIES[isGoogleLogin(url) ? getLoginMode() : 'chrome'];

function brandList(brand, full) {
  const v = full ? CHROME_FULL : CHROME_MAJOR;
  const list = [{ brand: 'Not?A_Brand', version: full ? '24.0.0.0' : '24' }, { brand: 'Chromium', version: v }];
  if (brand) list.push({ brand, version: v });
  return list;
}
const brandHeader = (brand, full) => brandList(brand, full).map((b) => `"${b.brand}";v="${b.version}"`).join(', ');

function setupIdentity(ses) {
  ses.webRequest.onBeforeSendHeaders((details, cb) => {
    if (!/^https?:/i.test(details.url)) { cb({}); return; }
    const id = identityFor(details.url);
    const h = details.requestHeaders;
    const uaKey = Object.keys(h).find((k) => k.toLowerCase() === 'user-agent') || 'User-Agent';
    h[uaKey] = id.ua;
    for (const k of Object.keys(h)) {
      const lk = k.toLowerCase();
      if (!lk.startsWith('sec-ch-ua')) continue;
      if (!id.brand) delete h[k];
      else if (lk === 'sec-ch-ua') h[k] = brandHeader(id.brand, false);
      else if (lk === 'sec-ch-ua-full-version-list') h[k] = brandHeader(id.brand, true);
    }
    cb({ requestHeaders: h });
  });
}

// Pour webview-preload.js : l'identité à afficher côté page (navigator.userAgentData, window.chrome).
ipcMain.on('identity:get', (e, url) => {
  const mode = isGoogleLogin(url) ? getLoginMode() : 'chrome';
  e.returnValue = { mode, brand: IDENTITIES[mode].brand, major: CHROME_MAJOR, full: CHROME_FULL };
});

const loginTries = new WeakMap();
const lastRejection = new WeakMap();
function watchGoogleLogin(wc) {
  let currentUa = null;
  wc.on('did-start-navigation', (e) => {
    if (!e.isMainFrame || e.isSameDocument) return;
    const ua = identityFor(e.url).ua;
    if (ua !== currentUa) { currentUa = ua; wc.setUserAgent(ua); }
  });
  wc.on('did-navigate', (e, maybeUrl) => {
    const url = typeof maybeUrl === 'string' ? maybeUrl : e.url;
    if (!GOOGLE_REJECTED.test(url || '')) return;
    // Une seule bascule par refus (la page de refus peut se charger deux fois de suite).
    if (Date.now() - (lastRejection.get(wc) || 0) < 5000) return;
    lastRejection.set(wc, Date.now());
    // Google a refusé cette identité : on passe à la suivante et on relance la connexion.
    const tried = loginTries.get(wc) || new Set();
    tried.add(getLoginMode());
    loginTries.set(wc, tried);
    const next = LOGIN_MODES.find((m) => !tried.has(m));
    if (!next) return;
    setLoginMode(next);
    let cont = 'https://accounts.google.com/';
    try { cont = new URL(url).searchParams.get('continue') || cont; } catch {}
    currentUa = IDENTITIES[next].ua;
    wc.setUserAgent(currentUa);
    setTimeout(() => {
      if (!wc.isDestroyed()) wc.loadURL('https://accounts.google.com/ServiceLogin?continue=' + encodeURIComponent(cont)).catch(() => {});
    }, 400);
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

// ---------------------------------------------------------------------------
// Mode Fantôme (navigation privée) : chaque fenêtre Fantôme a sa propre session EN MÉMOIRE (partition
// sans « persist: », unique par fenêtre). Ni historique, ni session d'onglets, ni liste de
// téléchargements, ni autorisations retenues ; tout est effacé à la fermeture de la fenêtre.
// ---------------------------------------------------------------------------
const ghostWindows = new Map(); // BrowserWindow → partition
let ghostSeq = 0;
const GHOST_PRIVATE_KEYS = new Set(['history', 'session']); // jamais écrites par l'interface Fantôme
const isGhostSession = (ses) => !!ses && !ses.isPersistent();
const ghostPartitionOf = (wc) => {
  const win = wc && !wc.isDestroyed() ? BrowserWindow.fromWebContents(wc) : null;
  return (win && ghostWindows.get(win)) || null;
};
async function forgetGhost(partition) {
  const ses = session.fromPartition(partition);
  try { await ses.clearStorageData(); } catch {}
  try { await ses.clearCache(); } catch {}
  try { await ses.clearAuthCache(); } catch {}
}

function createBrowserWindow(urls = [], opts = {}) {
  const st = store.get('window') || {};
  const isMac = process.platform === 'darwin';
  // opts.ghost : true = nouvelle session Fantôme ; une partition existante (onglet Fantôme détaché) =
  // même session que la fenêtre d'origine.
  const ghost = !opts.ghost ? null
    : (typeof opts.ghost === 'string' && /^fsx-ghost-[a-z0-9-]+$/.test(opts.ghost) ? opts.ghost : `fsx-ghost-${Date.now().toString(36)}-${++ghostSeq}`);
  if (ghost) setupSession(session.fromPartition(ghost));
  const win = new BrowserWindow({
    // opts.bounds : position imposée (onglet détaché, fenêtre restaurée).
    width: opts.bounds?.width || st.width || 1380,
    height: opts.bounds?.height || st.height || 880,
    x: opts.bounds ? opts.bounds.x : (windows.size ? undefined : st.x),
    y: opts.bounds ? opts.bounds.y : (windows.size ? undefined : st.y),
    minWidth: 560,
    minHeight: 420,
    title: ghost ? 'Fire Shox — Fantôme' : 'Fire Shox',
    icon: ICON,
    show: false,
    backgroundColor: ghost ? '#0b0a17' : '#0c0b10',
    titleBarStyle: 'hidden',
    ...(isMac ? { trafficLightPosition: { x: 14, y: 15 } } : { titleBarOverlay: { color: ghost ? '#0d0c1b' : '#0e0d13', symbolColor: '#ece6dc', height: 44 } }),
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
  if (ghost) ghostWindows.set(win, ghost);
  if (st.maximized && first) win.maximize();
  const query = { urls: JSON.stringify(ghost && !urls.length ? [GHOST_HOME] : urls), platform: process.platform, restore: (first || opts.session) && !ghost ? '1' : '0' };
  if (ghost) query.ghost = ghost;
  if (opts.tab) query.tab = JSON.stringify(opts.tab); // onglet détaché : titre, épinglé, état de la page
  if (opts.session && !ghost) rememberSession(win, opts.session, false); // fenêtre rouverte au démarrage
  win.loadFile(UI_FILE, { query });
  win.once('ready-to-show', () => win.show());

  const saveBounds = () => {
    if (win.isDestroyed() || win.isMinimized() || win.isFullScreen()) return;
    const maximized = win.isMaximized();
    const b = maximized ? (store.get('window') || {}) : win.getBounds();
    store.set('window', { x: b.x, y: b.y, width: b.width, height: b.height, maximized });
  };
  if (!ghost) {
    win.on('resize', saveBounds);
    win.on('move', saveBounds);
  }
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
  win.on('closed', () => {
    windows.delete(win);
    if (ghost) {
      ghostWindows.delete(win);
      // Effacée quand la DERNIÈRE fenêtre de cette session Fantôme se ferme.
      if (![...ghostWindows.values()].includes(ghost)) forgetGhost(ghost);
    }
  });
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
    if (code === 'KeyK') return 'toggle-claude';
    if (code === 'KeyN') return 'ghost-window';
    if (code === 'KeyS') return 'shoxshot';
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

// Pages qui gardent Ctrl+N pour elles (ShoxNotes : « nouvelle note »), en onglet comme dans le panneau.
const OWN_CTRL_N = /^fireshox:\/\/notes\//i;

function handleShortcutInput(win, e, input, contents) {
  if (input.type === 'keyDown' && input.key === 'Escape') {
    // Échap reste aussi pour la page : on prévient juste l'interface.
    win.webContents.send('shortcut', 'escape');
    return;
  }
  const s = shortcutFor(input);
  if (!s) return;
  if (s === 'new-window' && contents && OWN_CTRL_N.test(contents.getURL())) return;
  e.preventDefault();
  if (s === 'new-window') { createBrowserWindow(); return; }
  if (s === 'ghost-window') { createBrowserWindow([], { ghost: true }); return; }
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
      // La partition demandée par l'interface est gardée ; dans une fenêtre Fantôme, c'est TOUJOURS la
      // session en mémoire de la fenêtre (aucun onglet ne peut retomber sur la session normale).
      const ghost = ghostPartitionOf(contents);
      if (ghost) webPreferences.partition = ghost;
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
    if (win) handleShortcutInput(win, e, input, contents);
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

// Session de la fenêtre qui pose la question (interface ou onglet) : Fantôme ou normale.
function sessionOfSender(e) {
  const g = ghostPartitionOf(e.sender.hostWebContents || e.sender);
  return g ? session.fromPartition(g) : session.defaultSession;
}

function setupDownloads(ses) {
  const ghost = isGhostSession(ses);
  // Fantôme : seule la fenêtre Fantôme voit ses téléchargements, et la liste n'est pas gardée
  // (les fichiers, eux, restent dans le dossier Téléchargements).
  const sendUI = (channel, ...payload) => {
    if (!ghost) { broadcastUI(channel, ...payload); return; }
    for (const [w, p] of ghostWindows) if (!w.isDestroyed() && session.fromPartition(p) === ses) w.webContents.send(channel, ...payload);
  };
  ses.on('will-download', (_e, item) => {
    const dir = app.getPath('downloads');
    const savePath = uniquePath(path.join(dir, item.getFilename() || 'telechargement'));
    item.setSavePath(savePath);
    const rec = {
      id: ++dlSeq, name: path.basename(savePath), path: savePath, url: item.getURL(),
      total: item.getTotalBytes(), received: 0, state: 'progressing', paused: false, start: Date.now(),
    };
    downloads.set(rec.id, { item, rec, ses });
    sendUI('download:update', rec, true);
    let last = 0;
    item.on('updated', (_ev, state) => {
      rec.received = item.getReceivedBytes();
      rec.total = item.getTotalBytes();
      rec.state = state;
      rec.paused = item.isPaused();
      const now = Date.now();
      if (now - last > 200) { last = now; sendUI('download:update', rec); }
    });
    item.once('done', (_ev, state) => {
      rec.state = state;
      rec.received = item.getReceivedBytes();
      rec.end = Date.now();
      sendUI('download:update', rec);
      if (!ghost) {
        const list = (store.get('downloads') || []).filter((d) => d.id !== rec.id);
        list.unshift({ ...rec });
        store.set('downloads', list.slice(0, 200));
      }
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
  // Fantôme : les choix « se souvenir » ne vivent que le temps de la fenêtre.
  const memory = isGhostSession(ses) ? {} : null;
  const savedPerms = () => memory || store.get('permissions') || {};
  const keepPerms = (saved) => { if (!memory) store.set('permissions', saved); };
  ses.setPermissionRequestHandler((wc, permission, callback, details) => {
    const origin = originOf(details.requestingUrl || wc.getURL());
    if (origin.startsWith('fireshox://') || ALWAYS_OK.has(permission)) return callback(true);
    const label = PERMISSION_LABELS[permission];
    if (!label) return callback(false);
    const saved = savedPerms();
    const key = origin + '|' + permission;
    if (key in saved) return callback(!!saved[key]);
    const host = (() => { try { return new URL(origin).host; } catch { return origin; } })();
    const win = BrowserWindow.fromWebContents(wc.hostWebContents || wc) || focusedWindow();
    dialog.showMessageBox(win, {
      type: 'question', buttons: ['Autoriser', 'Bloquer'], defaultId: 1, cancelId: 1, title: 'Fire Shox — ShoxGuard',
      message: `${host} veut ${label}.`, checkboxLabel: 'Se souvenir de ce choix pour ce site', checkboxChecked: true,
    }).then((r) => {
      const ok = r.response === 0;
      if (r.checkboxChecked) { saved[key] = ok; keepPerms(saved); }
      callback(ok);
    }).catch(() => callback(false));
  });
  ses.setPermissionCheckHandler((_wc, permission, requestingOrigin) => {
    const origin = originOf(requestingOrigin);
    if (origin.startsWith('fireshox://') || ALWAYS_OK.has(permission)) return true;
    const saved = savedPerms();
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

// L'interface du navigateur (src/ui) d'une vraie fenêtre Fire Shox, et rien d'autre.
function isUiContents(wc) {
  if (!wc || wc.isDestroyed() || wc.getType() !== 'window') return false;
  const win = BrowserWindow.fromWebContents(wc);
  return !!win && windows.has(win) && wc.getURL().startsWith('file:');
}
function isUiSender(e) {
  return isUiContents(e.sender) && !!e.senderFrame && !e.senderFrame.parent && (e.senderFrame.url || '').startsWith('file:');
}
function focusedUi() {
  const w = focusedWindow();
  return w && isUiContents(w.webContents) ? w.webContents : null;
}
function setupVault() {
  vault.init({
    isUi: isUiSender,
    isUiContents,
    // Onglet → son interface ; fenêtre popup (connexion Google…) → la fenêtre Fire Shox active.
    uiFor: (wc) => uiOf(wc) || focusedUi(),
    openTab: (wc, url) => {
      const ui = uiOf(wc) || focusedUi();
      if (ui) ui.send('tab:new', { url, from: wc.id });
    },
    settings: () => store.get('settings') || {},
    // Fantôme : ShoxVault remplit, mais ne propose jamais d'enregistrer.
    noSave: (wc) => isGhostSession(wc.session),
  });
}
// ShoxBlock, ShoxShot, panneau Claude (fichiers à part dans src/main).
function setupExtras() {
  adblock.init({ store, uiOf, isUi: isUiSender, trusted, isGoogleLogin });
  shot.init({ isUi: isUiSender, trusted, dir: args['shot-dir'] ? path.resolve(String(args['shot-dir'])) : null });
  claude.init({ uiOf, settings: () => store.get('settings') || {} });
}
function isGhostUiSender(e) {
  const win = BrowserWindow.fromWebContents(e.sender);
  return !!win && ghostWindows.has(win) && e.sender === win.webContents;
}

ipcMain.on('store:get', (e, key) => {
  // « session » : chaque fenêtre relit SA session (plusieurs fenêtres, voir rememberSession).
  if (key === 'session' && trusted(e)) { const own = ownSession(e); if (own) { e.returnValue = own; return; } }
  e.returnValue = trusted(e) ? store.get(key) : undefined;
});
ipcMain.on('store:set', (e, key, value) => {
  if (!trusted(e) || typeof key !== 'string') return;
  if (GHOST_PRIVATE_KEYS.has(key) && isGhostUiSender(e)) return; // Fantôme : ni historique ni onglets gardés
  if (key === 'session' && isNormalUiSender(e)) { rememberSession(BrowserWindow.fromWebContents(e.sender), value); return; }
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
ipcMain.on('app:new-ghost-window', (e) => { if (trusted(e)) createBrowserWindow([], { ghost: true }); });

// ---------------------------------------------------------------------------
// Sessions de plusieurs fenêtres. Chaque fenêtre normale envoie sa session (clé « session ») ; on garde
// celle de chaque fenêtre ouverte dans « sessions » (la première reste aussi dans « session »). Au
// démarrage, toutes les fenêtres reviennent. Fermer UNE fenêtre parmi d'autres oublie ses onglets
// (comme Chrome) ; quitter Fire Shox, ou fermer la dernière fenêtre, les garde toutes.
// ---------------------------------------------------------------------------
const winSessions = new Map(); // BrowserWindow → { tabs, active, groups, bounds }
const trackedWins = new WeakSet();
let quittingApp = false;
app.on('before-quit', () => { quittingApp = true; });
function isNormalUiSender(e) {
  const w = BrowserWindow.fromWebContents(e.sender);
  return !!w && windows.has(w) && !ghostWindows.has(w) && e.sender === w.webContents && isUiSender(e);
}
function ownSession(e) {
  const w = BrowserWindow.fromWebContents(e.sender);
  return (w && e.sender === w.webContents && winSessions.get(w)) || null;
}
function sessionBounds(w) {
  try { return w.isMaximized() || w.isFullScreen() ? { ...w.getNormalBounds(), maximized: true } : w.getBounds(); } catch { return null; }
}
function persistSessions() {
  const list = [...windows].filter((w) => winSessions.has(w)).map((w) => winSessions.get(w));
  if (!list.length) return;
  store.set('sessions', list);
  store.set('session', list[0]);
}
function rememberSession(win, value, persist = true) {
  if (!win || win.isDestroyed() || !value || !Array.isArray(value.tabs)) return;
  winSessions.set(win, { ...value, bounds: sessionBounds(win) || value.bounds || null });
  if (!trackedWins.has(win)) {
    trackedWins.add(win);
    win.on('closed', () => {
      const othersOpen = [...windows].some((w) => w !== win && !w.isDestroyed() && !ghostWindows.has(w));
      if (quittingApp || !othersOpen) return; // dernière fenêtre ou fermeture de l'appli : on garde tout
      winSessions.delete(win);
      persistSessions();
    });
  }
  if (persist) persistSessions();
}
function restoreOtherWindows() {
  const s = store.get('settings') || {};
  if (s.startup && s.startup !== 'restore') return;
  const list = store.get('sessions');
  if (!Array.isArray(list) || list.length < 2) return;
  for (const sess of list.slice(1, 12)) {
    if (!sess || !Array.isArray(sess.tabs) || !sess.tabs.length) continue;
    const b = sess.bounds && Number.isFinite(sess.bounds.x) ? fitOnDisplay(sess.bounds, { x: sess.bounds.x + 60, y: sess.bounds.y + 20 }) : undefined;
    const w = createBrowserWindow([], { bounds: b, session: sess });
    if (sess.bounds && sess.bounds.maximized) w.maximize();
  }
}

// ---------------------------------------------------------------------------
// Onglet détaché (glissé hors de la bande d'onglets, ou « Déplacer vers une nouvelle fenêtre ») :
//  - lâché sur la bande d'onglets d'une autre fenêtre du même genre (normale / Fantôme) → il y entre ;
//  - dernier onglet de sa fenêtre → c'est la fenêtre entière qui se pose au point de lâcher ;
//  - sinon → nouvelle fenêtre (Fantôme si l'origine l'est), bande d'onglets sous le curseur, sur
//    l'écran du lâcher. L'état de la page (vidéo, défilement, champs) voyage avec l'adresse.
// ---------------------------------------------------------------------------
const focusedAt = new Map();
app.on('browser-window-focus', (_e, w) => focusedAt.set(w, Date.now()));
function fitOnDisplay(b, pt) {
  const wa = screen.getDisplayNearestPoint({ x: Math.round(pt.x), y: Math.round(pt.y) }).workArea;
  const width = Math.min(Math.round(b.width) || 1380, wa.width), height = Math.min(Math.round(b.height) || 880, wa.height);
  const x = Math.max(wa.x, Math.min(Math.round(b.x), wa.x + wa.width - width));
  const y = Math.max(wa.y, Math.min(Math.round(b.y), wa.y + wa.height - height));
  return { x, y, width, height };
}
ipcMain.handle('tab:detach', (e, info = {}) => {
  if (!trusted(e) || !isUiSender(e)) return { action: 'none' };
  const src = BrowserWindow.fromWebContents(e.sender);
  if (!src || !windows.has(src)) return { action: 'none' };
  const url = typeof info.url === 'string' && SAFE_SCHEMES.test(info.url) ? info.url : HOME_URL;
  // Onglet Fantôme : il reste dans la MÊME session Fantôme (sa partition), pour garder ses connexions.
  const ghost = ghostWindows.get(src) || false;
  const state = info.state && typeof info.state === 'object' && JSON.stringify(info.state).length < 400000 ? info.state : null;
  const tab = { title: String(info.title || '').slice(0, 300), pinned: !!info.pinned, state };
  const pt = Number.isFinite(info.screenX) && Number.isFinite(info.screenY) ? { x: Math.round(info.screenX), y: Math.round(info.screenY) } : null;
  if (pt) {
    const target = [...windows]
      .filter((w) => w !== src && !w.isDestroyed() && w.isVisible() && !w.isMinimized() && (ghostWindows.get(w) || false) === ghost && isUiContents(w.webContents))
      .sort((a, b) => (focusedAt.get(b) || 0) - (focusedAt.get(a) || 0))
      .find((w) => { const c = w.getContentBounds(); return pt.x >= c.x && pt.x < c.x + c.width && pt.y >= c.y - 8 && pt.y < c.y + 52; });
    if (target) {
      const c = target.getContentBounds();
      target.webContents.send('tab:new', { url, ...tab, at: pt.x - c.x });
      target.focus();
      return { action: 'merged', bounds: target.getBounds() };
    }
  }
  const sb = src.isMaximized() || src.isFullScreen() ? src.getNormalBounds() : src.getBounds();
  const grabX = Math.max(60, Math.min(sb.width - 120, Number(info.grabX) || 240));
  if (info.last) {
    if (!pt) return { action: 'none' };
    if (src.isFullScreen()) src.setFullScreen(false);
    if (src.isMaximized()) src.unmaximize();
    const b = fitOnDisplay({ x: pt.x - grabX, y: pt.y - 22, width: sb.width, height: sb.height }, pt);
    src.setBounds(b);
    src.focus();
    return { action: 'moved', bounds: b };
  }
  const want = pt ? { x: pt.x - grabX, y: pt.y - 22, width: sb.width, height: sb.height } : { x: sb.x + 36, y: sb.y + 36, width: sb.width, height: sb.height };
  const b = fitOnDisplay(want, pt || { x: sb.x + sb.width / 2, y: sb.y + sb.height / 2 });
  createBrowserWindow([url], { ghost, bounds: b, tab });
  return { action: 'window', bounds: b };
});

ipcMain.handle('download:list', (e) => {
  const ses = sessionOfSender(e);
  const ghost = isGhostSession(ses);
  return { active: [...downloads.values()].filter((d) => d.ses === ses).map((d) => d.rec), past: ghost ? [] : store.get('downloads') || [] };
});
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
// Installation silencieuse (sans les fenêtres de l'installateur) puis relance automatique, comme Chrome.
ipcMain.on('update:install', (e) => {
  if (!trusted(e) || !updater) return;
  adblock.flush();
  store.flush();
  vault.flush();
  updater.quitAndInstall(true, true);
});

// ---------------------------------------------------------------------------
// Pilotage de test (--run=étapes.json) : ouvrir, attendre, exécuter du JS, cliquer, capturer.
// ---------------------------------------------------------------------------
async function runSteps(file) {
  const steps = JSON.parse(fs.readFileSync(file, 'utf8'));
  const harness = !!args.harness;
  const first = steps.find((s) => s.open)?.open || HOME_URL;
  const size = steps.find((s) => s.size)?.size;
  // { "open": …, "ghost": true } : la première fenêtre est une fenêtre Fantôme.
  const firstGhost = !!steps.find((s) => s.open)?.ghost;
  let win = harness ? createHarnessWindow(first, size) : createBrowserWindow([first], { ghost: firstGhost });
  if (!harness && size) win.setContentSize(size[0], size[1]);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const listen = (w) => w.webContents.on('console-message', (e) => { if (e.level === 'error' || e.level === 'warning' || e.level === 3) console.log('[console]', e.message, e.sourceId ? '(' + e.sourceId.split('/').pop() + ':' + e.lineNumber + ')' : ''); });
  listen(win);
  await new Promise((r) => win.webContents.once('did-finish-load', r));
  await sleep(600);
  const log = (...m) => console.log('[run]', ...m);
  // Plusieurs fenêtres : { "newWindow": { "ghost": true, "url": "…" } } (devient la fenêtre pilotée),
  // { "useWindow": 0 } (revenir à une fenêtre), { "closeWindow": true } (fermer la fenêtre pilotée).
  const runWins = [win];
  const guest = async () => {
    if (harness) return win.webContents;
    const id = await win.webContents.executeJavaScript('window.FS && FS.activeContentsId && FS.activeContentsId()');
    return id ? webContents.fromId(id) : win.webContents;
  };
  for (const s of steps) {
    try {
      if (s.newWindow) {
        const o = typeof s.newWindow === 'object' ? s.newWindow : {};
        win = createBrowserWindow(o.url ? [o.url] : [], { ghost: !!o.ghost });
        if (size) win.setContentSize(size[0], size[1]);
        listen(win);
        await new Promise((r) => win.webContents.once('did-finish-load', r));
        await sleep(600);
        runWins.push(win);
        log('fenêtre', runWins.length - 1, o.ghost ? '(Fantôme)' : '');
      }
      if (s.useWindow !== undefined) { win = runWins[s.useWindow] || win; win.focus(); }
      if (s.closeWindow) {
        const w = win;
        await new Promise((r) => { w.once('closed', r); w.close(); });
        runWins.splice(runWins.indexOf(w), 1);
        win = runWins[0];
        await sleep(300);
      }
      if (s.open && s !== steps.find((x) => x.open)) {
        if (harness) await win.webContents.loadURL(s.open);
        else win.webContents.send('tab:new', { url: s.open });
        await sleep(400);
      }
      if (s.wait) await sleep(s.wait);
      if (s.js) { const r = await (await guest()).executeJavaScript(s.js, true); if (r !== undefined) log('js →', JSON.stringify(r).slice(0, 2000)); }
      if (s.ui) { const r = await win.webContents.executeJavaScript(s.ui, true); if (r !== undefined) log('ui →', JSON.stringify(r).slice(0, 2000)); }
      if (s.click || s.clickAt) {
        const target = s.target === 'ui' ? win.webContents : await guest();
        // clickAt : expression JS (dans la page ou l'interface) qui renvoie [x, y].
        const [x, y] = s.clickAt ? (await target.executeJavaScript(s.clickAt, true)).map(Math.round) : s.click;
        if (s.clickAt) log('clic en', x, y);
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
      // Onglets détachés : { "useNewest": true } pilote la dernière fenêtre ouverte ; { "winInfo": true }
      // liste fenêtres, écrans et onglets ; { "shotAll": "dossier/nom" } capture chaque fenêtre ;
      // { "drag": [[x, y], …] } vrai glisser souris dans l'interface (appui, déplacements, lâcher) ;
      // avec "dragFrom": "expression JS de l'interface → [x, y]", les points de "drag" sont relatifs.
      if (s.useNewest) {
        const w = [...windows].filter((x) => !x.isDestroyed()).pop();
        if (w && w !== win) { win = w; if (!runWins.includes(w)) { listen(w); runWins.push(w); } }
      }
      if (s.drag) {
        let pts = s.drag;
        if (s.dragFrom) {
          const [x0, y0] = (await win.webContents.executeJavaScript(s.dragFrom, true)).map(Math.round);
          pts = [[x0, y0], ...pts.map(([dx, dy]) => [x0 + dx, y0 + dy])];
          log('glisser depuis', x0, y0);
        }
        if (s.dragTo) { // point d'arrivée calculé : 8 étapes en ligne droite depuis le premier point
          const [x1, y1] = (await win.webContents.executeJavaScript(s.dragTo, true)).map(Math.round);
          const [x0, y0] = pts[0];
          pts = [[x0, y0], ...Array.from({ length: 8 }, (_, i) => [Math.round(x0 + ((x1 - x0) * (i + 1)) / 8), Math.round(y0 + ((y1 - y0) * (i + 1)) / 8)])];
          log('glisser vers', x1, y1);
        }
        const t = win.webContents;
        const cb = win.getContentBounds();
        const ev = (type, [x, y], extra = {}) => t.sendInputEvent({ type, x, y, globalX: cb.x + x, globalY: cb.y + y, ...extra });
        ev('mouseMove', pts[0]);
        ev('mouseDown', pts[0], { button: 'left', clickCount: 1 });
        for (const p of pts.slice(1)) { await sleep(40); ev('mouseMove', p, { modifiers: ['leftButtonDown'] }); }
        await sleep(s.hold || 120);
        ev('mouseUp', pts[pts.length - 1], { button: 'left', clickCount: 1 });
        await sleep(200);
      }
      if (s.winInfo) {
        const list = [];
        for (const w of [...windows]) {
          if (w.isDestroyed()) continue;
          let tabsInfo = null;
          try { tabsInfo = await w.webContents.executeJavaScript('window.FS ? FS.tabs().map((t) => t.title + (t.active ? " *" : "")) : null'); } catch {}
          list.push({ bounds: w.getBounds(), ghost: ghostWindows.has(w), driven: w === win, tabs: tabsInfo });
        }
        log('écrans →', JSON.stringify(screen.getAllDisplays().map((d) => ({ bounds: d.bounds, workArea: d.workArea, scale: d.scaleFactor }))));
        log('fenêtres →', JSON.stringify(list));
      }
      if (s.shotAll) {
        let i = 0;
        for (const w of [...windows]) {
          if (w.isDestroyed()) continue;
          const f = path.resolve(`${s.shotAll}-${i++}.png`);
          fs.mkdirSync(path.dirname(f), { recursive: true });
          fs.writeFileSync(f, (await w.webContents.capturePage()).toPNG());
          log('capture', f);
        }
      }
      if (s.log) log(s.log);
      if (s.quit) break;
    } catch (err) {
      log('ERREUR étape', JSON.stringify(s).slice(0, 200), String(err?.stack || err));
    }
  }
  adblock.flush();
  store.flush();
  vault.flush();
  app.exit(0);
}

// ---------------------------------------------------------------------------
// Chiffrement des cookies (fusible EnableCookieEncryption, depuis la 1.0.7) : les nouveaux cookies sont
// chiffrés par Windows ; ceux d'avant restent lisibles mais en clair. Au premier lancement, on les
// réécrit tous une fois pour qu'ils soient chiffrés à leur tour, sans déconnecter personne.
// ---------------------------------------------------------------------------
async function encryptOldCookies(ses) {
  if (!app.isPackaged || store.get('cookiesEncrypted')) return;
  let done = 0, failed = 0;
  try {
    const all = await ses.cookies.get({});
    for (const c of all) {
      if (c.session || !c.expirationDate) continue; // les cookies de session ne sont jamais écrits sur le disque
      const host = c.domain.replace(/^\./, '');
      const details = {
        url: `${c.secure ? 'https' : 'http'}://${host}${c.path || '/'}`,
        name: c.name, value: c.value, path: c.path, secure: c.secure, httpOnly: c.httpOnly,
        expirationDate: c.expirationDate, sameSite: c.sameSite,
      };
      if (!c.hostOnly) details.domain = c.domain;
      try { await ses.cookies.set(details); done++; } catch { failed++; }
    }
    await ses.cookies.flushStore();
  } catch (e) {
    console.error('[cookies] migration impossible', e);
    return;
  }
  store.set('cookiesEncrypted', true);
  console.log(`[cookies] ${done} cookie(s) réécrit(s) chiffrés, ${failed} ignoré(s)`);
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

// Une session (normale ou Fantôme) reçoit tout ce qui fait Fire Shox : sites fireshox://,
// téléchargements, autorisations, identité Chrome et ShoxBlock. Une seule fois par session.
const readySessions = new WeakSet();
function setupSession(ses) {
  if (!ses || readySessions.has(ses)) return;
  readySessions.add(ses);
  for (const fn of [registerInternalProtocol, setupDownloads, setupPermissions, setupIdentity, adblock.enable]) {
    try { fn(ses); } catch (err) { console.error('[session]', fn.name, err && err.message); }
  }
  try { ses.setSpellCheckerLanguages(['fr', 'en-US']); } catch {}
}

app.whenReady().then(() => {
  store.init();
  setupVault();
  setupExtras();
  const ses = session.defaultSession;
  setupSession(ses);
  app.on('session-created', (s) => setupSession(s));

  encryptOldCookies(ses);
  if (devRun) { runSteps(path.resolve(String(args.run))); return; }
  createBrowserWindow(args.urls);
  if (!args.urls.length) restoreOtherWindows(); // les autres fenêtres de la dernière session
  setupUpdater();

  app.on('activate', () => { if (windows.size === 0) createBrowserWindow(); });
});

app.on('window-all-closed', () => {
  adblock.flush();
  store.flush();
  vault.flush();
  if (process.platform !== 'darwin') app.quit();
});
app.on('before-quit', () => store.flush());

// Exposé pour les tests éventuels.
module.exports = { resolveInternal, shortcutFor, nativeImage };
