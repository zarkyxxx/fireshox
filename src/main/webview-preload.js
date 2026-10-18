// Préchargement de chaque onglet. Seuls les sites internes (fireshox://…) reçoivent
// l'API « window.fireshox » : stockage persistant partagé et ouverture d'onglets.
'use strict';
const { contextBridge, ipcRenderer } = require('electron');

// Identité côté page (voir main.js, « Identité du navigateur ») : ce que voient les scripts des sites
// doit correspondre aux en-têtes envoyés. Chrome/Edge : marques complètes et window.chrome comme dans
// le vrai Chrome. Firefox (secours pour la connexion Google) : pas d'indices client ni de window.chrome.
if (/^https?:$/.test(location.protocol)) {
  let id = null;
  try { id = ipcRenderer.sendSync('identity:get', location.href); } catch {}
  if (id) {
    try {
      contextBridge.executeInMainWorld({
        args: [id],
        func: (id) => {
          const N = Navigator.prototype;
          if (id.mode === 'firefox') {
            try { delete N.userAgentData; } catch {}
            try { Object.defineProperty(N, 'vendor', { get: () => '', configurable: true }); } catch {}
            try { Object.defineProperty(N, 'productSub', { get: () => '20100101', configurable: true }); } catch {}
            try { delete window.chrome; } catch {}
            return;
          }
          const list = (full) => {
            const v = full ? id.full : id.major;
            return [{ brand: 'Not?A_Brand', version: full ? '24.0.0.0' : '24' }, { brand: 'Chromium', version: v }, { brand: id.brand, version: v }];
          };
          const uad = navigator.userAgentData;
          if (uad) {
            const P = Object.getPrototypeOf(uad);
            const high = P.getHighEntropyValues;
            const toJSON = P.toJSON;
            try { Object.defineProperty(P, 'brands', { get: () => list(false), configurable: true }); } catch {}
            try {
              Object.defineProperty(P, 'getHighEntropyValues', {
                configurable: true, writable: true,
                value: { getHighEntropyValues(hints) {
                  return high.call(this, hints).then((v) => {
                    if (v.brands) v.brands = list(false);
                    if (v.fullVersionList) v.fullVersionList = list(true);
                    return v;
                  });
                } }.getHighEntropyValues,
              });
            } catch {}
            if (toJSON) {
              try {
                Object.defineProperty(P, 'toJSON', {
                  configurable: true, writable: true,
                  value: { toJSON() { const o = toJSON.call(this); o.brands = list(false); return o; } }.toJSON,
                });
              } catch {}
            }
          }
          // window.chrome tel que le vrai Chrome l'expose aux pages web.
          const c = window.chrome || {};
          if (!c.app) {
            c.app = {
              isInstalled: false,
              InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' },
              RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' },
              getDetails() { return null; },
              getIsInstalled() { return false; },
              runningState() { return 'cannot_run'; },
            };
          }
          if (!c.csi) {
            c.csi = function csi() {
              return { startE: Math.round(performance.timeOrigin), onloadT: Date.now(), pageT: performance.now(), tran: 15 };
            };
          }
          if (!c.loadTimes) {
            c.loadTimes = function loadTimes() {
              const t = performance.timing || {};
              const s = (x) => (x || Date.now()) / 1000;
              return {
                requestTime: s(t.navigationStart), startLoadTime: s(t.navigationStart), commitLoadTime: s(t.responseStart),
                finishDocumentLoadTime: s(t.domContentLoadedEventEnd), finishLoadTime: s(t.loadEventEnd), firstPaintTime: s(t.responseEnd),
                firstPaintAfterLoadTime: 0, navigationType: 'Other', wasFetchedViaSpdy: true, wasNpnNegotiated: true,
                npnNegotiatedProtocol: 'h2', wasAlternateProtocolAvailable: false, connectionInfo: 'h2',
              };
            };
          }
          if (!window.chrome) {
            try { Object.defineProperty(window, 'chrome', { value: c, writable: true, configurable: true, enumerable: true }); } catch {}
          }
        },
      });
    } catch {}
  }
}

if (location.protocol === 'fireshox:') {
  const listeners = new Set();
  ipcRenderer.on('store:changed', (_e, key, value) => {
    for (const fn of listeners) { try { fn(key, value); } catch (err) { console.error(err); } }
  });
  contextBridge.exposeInMainWorld('fireshox', {
    // Lecture synchrone : fireshox.get('bench.speed', [])
    get: (key, fallback) => {
      const v = ipcRenderer.sendSync('store:get', String(key));
      return v === undefined || v === null ? fallback : v;
    },
    // Écriture (sauvegardée sur disque, survit à la fermeture du navigateur)
    set: (key, value) => ipcRenderer.send('store:set', String(key), value),
    // Être prévenu quand une autre page ou l'interface change une valeur
    onChange: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    // Ouvrir une adresse : { background: true } pour un onglet en arrière-plan, { sameTab: true } pour remplacer
    open: (url, opts) => ipcRenderer.send('page:open', String(url), opts || {}),
    info: () => ipcRenderer.invoke('app:info'),
    downloads: () => ipcRenderer.invoke('download:list'),
    downloadAction: (id, action) => ipcRenderer.send('download:action', id, action),
    clearDownloads: () => ipcRenderer.send('download:clear'),
    clearData: (what) => ipcRenderer.invoke('data:clear', what),
    checkUpdate: () => ipcRenderer.invoke('update:check'),
    installUpdate: () => ipcRenderer.send('update:install'),
    newWindow: (urls) => ipcRenderer.send('app:new-window', urls || []),
    openDefaultApps: () => ipcRenderer.send('shell:default-apps'),
    // Mode Fantôme et ShoxBlock (page Paramètres, accueil Fantôme)
    newGhostWindow: () => ipcRenderer.send('app:new-ghost-window'),
    shoxblock: {
      info: () => ipcRenderer.invoke('shoxblock:info'),
      unallow: (site) => ipcRenderer.invoke('shoxblock:unallow', String(site)),
      update: () => ipcRenderer.invoke('shoxblock:update'),
    },
  });
}

// ---------------------------------------------------------------------------
// Panneau Claude — bouton « 🔥 Demander à Claude » sur les pages de résultats Google.
// Monde isolé + shadow DOM fermé : la page ne voit rien. Le processus principal relit la recherche
// dans l'adresse de la page avant d'ouvrir le panneau.
// ---------------------------------------------------------------------------
if (window.top === window && location.protocol === 'https:' && /^www\.google\.(?:[a-z]{2,3}|co\.[a-z]{2}|com\.[a-z]{2})$/i.test(location.hostname)
  && location.pathname === '/search') {
  let show = false;
  try { show = ipcRenderer.sendSync('claude:google-button'); } catch {}
  if (show) { try { askClaudeButton(); } catch {} }
}

function askClaudeButton() {
  const CSS = `
    * { box-sizing: border-box; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; }
    .ask { position: fixed; display: flex; align-items: center; gap: 7px; height: 36px; padding: 0 15px 0 12px; margin: 0;
      border-radius: 999px; border: 1px solid rgba(255,138,0,.75); background: linear-gradient(180deg, #2a1a0e, #16131b);
      color: #ffd9a0; font-size: 13.5px; font-weight: 700; letter-spacing: .01em; white-space: nowrap; cursor: pointer;
      pointer-events: auto; outline: 0; box-shadow: 0 0 0 1px rgba(0,0,0,.25), 0 4px 16px rgba(255,90,0,.28);
      transition: transform .14s, box-shadow .18s, filter .18s, opacity .25s; animation: in .35s cubic-bezier(.2,1.3,.4,1); }
    .ask:hover { filter: brightness(1.15); box-shadow: 0 0 0 1px rgba(255,170,0,.6), 0 4px 22px rgba(255,110,0,.55); }
    .ask:active { transform: scale(.96); }
    .ask:focus-visible { box-shadow: 0 0 0 3px rgba(255,140,0,.6); }
    .ask .tx { background: linear-gradient(90deg, #ff7a1a, #ffb000 60%, #ffd84a); -webkit-background-clip: text; background-clip: text; color: transparent; }
    .ask.float { height: 44px; padding: 0 18px 0 15px; font-size: 14px; box-shadow: 0 10px 30px rgba(0,0,0,.35), 0 0 26px -6px rgba(255,100,0,.7); }
    @keyframes in { from { opacity: 0; transform: translateY(6px) scale(.92); } }
  `;
  let host = null, root = null, btn = null;
  function build() {
    host = document.createElement('fireshox-ask');
    for (const [k, v] of [['all', 'initial'], ['position', 'fixed'], ['top', '0'], ['left', '0'], ['width', '0'], ['height', '0'],
      ['display', 'block'], ['overflow', 'visible'], ['z-index', '2147483646'], ['pointer-events', 'none']]) host.style.setProperty(k, v, 'important');
    root = host.attachShadow({ mode: 'closed' });
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(CSS);
    root.adoptedStyleSheets = [sheet];
    btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ask';
    btn.title = 'Poser cette recherche à Claude, dans le panneau de Fire Shox';
    const fl = document.createElement('span');
    fl.textContent = '🔥';
    const tx = document.createElement('span');
    tx.className = 'tx';
    tx.textContent = 'Demander à Claude';
    btn.append(fl, tx);
    for (const t of ['mousedown', 'pointerdown', 'mouseup', 'pointerup']) btn.addEventListener(t, (e) => e.stopPropagation());
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!e.isTrusted) return; // seul un vrai clic de l'utilisateur
      ipcRenderer.send('claude:ask-google');
    });
    root.appendChild(btn);
    document.documentElement.appendChild(host);
  }
  // Près de la barre de recherche de Google s'il y a la place, sinon bouton flottant en bas à droite.
  function place() {
    if (!host) return;
    if (!host.isConnected) document.documentElement.appendChild(host);
    const q = new URLSearchParams(location.search).get('q');
    btn.style.display = q && q.trim() ? 'flex' : 'none';
    const field = document.querySelector('form[role=search] textarea[name=q], form[role=search] input[name=q], textarea[name=q], input[name=q]');
    const box = field && (field.closest('form[role=search] > div, form > div') || field.closest('form'));
    const r = box && box.getBoundingClientRect();
    const w = btn.offsetWidth || 170;
    const free = r ? innerWidth - r.right : 0;
    if (r && r.width > 200 && r.height > 20 && r.top >= 0 && r.bottom < 200 && free > w + 190) {
      btn.classList.remove('float');
      btn.style.left = Math.round(r.right + 14) + 'px';
      btn.style.top = Math.round(r.top + (r.height - btn.offsetHeight) / 2) + 'px';
      btn.style.right = btn.style.bottom = 'auto';
    } else {
      btn.classList.add('float');
      btn.style.left = btn.style.top = 'auto';
      btn.style.right = '22px';
      btn.style.bottom = '22px';
    }
  }
  let raf = false;
  const placeSoon = () => { if (!raf) { raf = true; requestAnimationFrame(() => { raf = false; place(); }); } };
  const start = () => {
    if (!document.documentElement || host) return;
    build();
    place();
    addEventListener('resize', placeSoon, { passive: true });
    addEventListener('scroll', placeSoon, { capture: true, passive: true });
    addEventListener('popstate', placeSoon);
    setInterval(place, 1000); // Google recompose son en-tête après coup
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}

// ---------------------------------------------------------------------------
// ShoxVault — la page de gestion fireshox://passwords/ est la SEULE à recevoir l'API des mots de passe
// (le processus principal vérifie aussi l'adresse de l'expéditeur à chaque appel).
// ---------------------------------------------------------------------------
if (location.protocol === 'fireshox:' && location.host === 'passwords' && window.top === window) {
  const str = (v) => (typeof v === 'string' ? v : '');
  contextBridge.exposeInMainWorld('shoxvault', {
    list: () => ipcRenderer.invoke('vault:mgr-list'),
    reveal: (id) => ipcRenderer.invoke('vault:mgr-reveal', str(id)),
    copy: (id, field) => ipcRenderer.invoke('vault:mgr-copy', str(id), field === 'username' ? 'username' : 'password'),
    update: (id, patch) => {
      const p = {};
      if (patch && typeof patch.username === 'string') p.username = patch.username;
      if (patch && typeof patch.password === 'string') p.password = patch.password;
      return ipcRenderer.invoke('vault:mgr-update', str(id), p);
    },
    remove: (id) => ipcRenderer.invoke('vault:mgr-delete', str(id)),
    add: (rec) => ipcRenderer.invoke('vault:mgr-add', { url: str(rec && rec.url), username: str(rec && rec.username), password: str(rec && rec.password) }),
    unblock: (origin) => ipcRenderer.invoke('vault:mgr-unblock', str(origin)),
    importCsv: () => ipcRenderer.invoke('vault:mgr-import'),
    onChange: (fn) => {
      const h = () => { try { fn(); } catch (err) { console.error(err); } };
      ipcRenderer.on('vault:changed', h);
      return () => ipcRenderer.removeListener('vault:changed', h);
    },
  });
}

// ---------------------------------------------------------------------------
// ShoxVault — sites web (https: et http://localhost), cadre principal uniquement.
// Tout ce code tourne dans le MONDE ISOLÉ du préchargement : la page ne voit ni ces variables, ni
// l'interface (shadow DOM fermé), et rien n'est ajouté à window. Un mot de passe n'arrive ici que
// pour être écrit dans le champ, et seulement si le processus principal a vérifié l'origine.
// ---------------------------------------------------------------------------
if (window.top === window && (location.protocol === 'https:'
  || (location.protocol === 'http:' && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)))) {
  try { shoxVault(); } catch {}
}

function shoxVault() {
  const VALUE = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  const getVal = (el) => { try { return VALUE.get.call(el) || ''; } catch { return ''; } };
  const setVal = (el, v) => VALUE.set.call(el, v);

  const SUBMIT_RX = /^\s*(se connecter|me connecter|connexion|connecter|s['’]identifier|identification|log\s?-?\s?in|sign\s?-?\s?in|suivant|next|continuer|continue|valider|ok|entrer|envoyer|submit|go|login|weiter|anmelden|siguiente|iniciar sesi[oó]n|acceder|accéder)\b/i;
  const NOT_SUBMIT_RX = /oubli|forgot|reset|cr[ée]er|create|inscri|sign\s?-?\s?up|register|afficher|masquer|show|hide|cancel|annuler|retour|back|aide|help/i;
  const USER_HINT = /user|login|e-?mail|courriel|ident|account|compte|pseudo|utilisateur|phone|t[ée]l[ée]phone|mobile|uid/i;
  const STEP1_HINT = /user|login|ident|account|compte|pseudo|utilisateur|e-?mail/i;
  const SKIP_HINT = /search|recherche|query|chercher|captcha|otp|coupon|promo|newsletter/i;

  const isInput = (el) => el instanceof HTMLInputElement;
  const isPw = (el) => isInput(el) && el.type === 'password';
  const isTextish = (el) => isInput(el) && (el.type === 'text' || el.type === 'email' || el.type === 'tel');
  const ac = (el) => (el.getAttribute('autocomplete') || '').toLowerCase();
  const hints = (el) => [el.name, el.id, el.getAttribute('aria-label'), el.placeholder].join(' ');
  const label = (b) => String(b.innerText || b.value || b.getAttribute('aria-label') || b.title || '').trim().slice(0, 60);

  function visible(el) {
    if (!el || !el.isConnected || el.disabled || el.type === 'hidden') return false;
    const r = el.getBoundingClientRect();
    if (r.width < 6 || r.height < 6) return false;
    if (r.right <= 0 || r.left >= innerWidth || r.bottom + scrollY <= 0) return false; // rangé hors de l'écran
    try { if (el.checkVisibility && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return false; } catch {}
    return true;
  }

  function looksUser(el) {
    if (!isTextish(el)) return false;
    const a = ac(el);
    if (/\b(username|email)\b/.test(a)) return true;
    if (/(one-time-code|new-password|cc-|street|postal|address)/.test(a)) return false;
    const h = hints(el);
    if (SKIP_HINT.test(h)) return false;
    return el.type === 'email' || USER_HINT.test(h);
  }
  // Étape 1 d'une connexion en deux temps (identifiant seul, comme Google) : critères plus stricts.
  function looksStep1(el) {
    if (!isTextish(el)) return false;
    if (/\busername\b/.test(ac(el))) return true;
    if (SKIP_HINT.test(hints(el))) return false;
    return STEP1_HINT.test([el.name, el.id].join(' '));
  }

  function usernameFor(pw) {
    const scope = pw.form || document;
    const all = [...scope.querySelectorAll('input')];
    const auto = all.find((i) => i !== pw && isTextish(i) && /\b(username|email)\b/.test(ac(i)) && visible(i));
    if (auto) return auto;
    const before = [];
    for (const i of all) { if (i === pw) break; if (isTextish(i) && visible(i)) before.push(i); }
    for (let k = before.length - 1; k >= 0; k--) if (looksUser(before[k])) return before[k];
    return pw.form && before.length ? before[before.length - 1] : null;
  }
  // Identifiant caché laissé par le site pour les gestionnaires de mots de passe (Google, étape 2).
  function hiddenUser(scope) {
    for (const i of scope.querySelectorAll('input')) {
      if (i.type !== 'password' && /\busername\b/.test(ac(i)) && getVal(i).trim()) return getVal(i).trim();
    }
    return '';
  }

  // Champs de connexion de la page : { user, pw } (pw = null à l'étape 1 d'une connexion en deux temps).
  function findTargets() {
    const out = [];
    const groups = new Map();
    const loose = [];
    for (const i of document.querySelectorAll('input')) {
      if (i.type === 'password') {
        if (!visible(i)) continue;
        const k = i.form || document;
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(i);
      } else if (looksStep1(i) && visible(i)) loose.push(i);
    }
    for (const [, pws] of groups) {
      if (pws.length >= 2) continue; // inscription ou changement de mot de passe : on n'y touche pas
      out.push({ user: usernameFor(pws[0]), pw: pws[0], form: pws[0].form });
    }
    if (!groups.size) {
      for (const u of loose) {
        if (u.form && [...u.form.querySelectorAll('input')].filter((x) => isTextish(x) && visible(x)).length > 2) continue;
        out.push({ user: u, pw: null, form: u.form });
        break;
      }
    }
    return out;
  }

  // ------------------------------------------------------------ détection de la connexion
  let last = null;
  let lastTimer = null;
  function capture(from) {
    const form = from && (from.form || (from.closest && from.closest('form')));
    const scope = form || document;
    const pws = [...scope.querySelectorAll('input[type=password]')].filter(visible);
    if (pws.length >= 2) return; // inscription / changement de mot de passe
    if (pws.length === 1) {
      const password = getVal(pws[0]);
      if (!password) return;
      const uf = usernameFor(pws[0]);
      const username = ((uf && getVal(uf)) || hiddenUser(scope) || (scope !== document ? hiddenUser(document) : '')).trim();
      if (last && last.u === username && last.p === password) return; // même envoi (clic puis submit)
      last = { u: username, p: password };
      clearTimeout(lastTimer);
      lastTimer = setTimeout(() => { last = null; }, 5000);
      ipcRenderer.send('vault:site-submit', { username, password });
      return;
    }
    // Étape 1 (identifiant seul) : le processus principal le garde quelques minutes pour l'étape 2.
    const users = [...scope.querySelectorAll('input')].filter((i) => (looksStep1(i) || (isTextish(i) && i.type === 'email')) && visible(i) && getVal(i).trim());
    if (users.length === 1) ipcRenderer.send('vault:site-step', getVal(users[0]).trim());
  }
  function looksSubmitClick(b) {
    const l = label(b);
    if (NOT_SUBMIT_RX.test(l)) return false;
    if (b instanceof HTMLButtonElement && b.type === 'submit' && b.form) return true;
    if (b instanceof HTMLInputElement && (b.type === 'submit' || b.type === 'image')) return true;
    return SUBMIT_RX.test(l);
  }

  // ------------------------------------------------------------ état
  const st = {
    accounts: null, autofill: true, prefer: null, cont: null, at: 0, pending: null,
    stepKnown: false, targets: [], auto: new WeakSet(), typed: new WeakSet(),
  };

  function query(force) {
    if (!force && st.accounts && Date.now() - st.at < 30000) return Promise.resolve();
    if (st.pending) return st.pending;
    st.pending = ipcRenderer.invoke('vault:site-query').then((r) => {
      st.accounts = (r && Array.isArray(r.accounts)) ? r.accounts : [];
      st.autofill = !!(r && r.autofill);
      st.prefer = (r && r.prefer) || null;
      st.stepKnown = !!(r && r.stepKnown);
      if (r && r.cont) st.cont = { id: r.cont, until: Date.now() + 30000 };
      st.at = Date.now();
    }).catch(() => { st.accounts = []; st.at = Date.now(); }).finally(() => { st.pending = null; });
    return st.pending;
  }

  let scanTimer = null;
  function scheduleScan(ms) {
    if (scanTimer) return;
    scanTimer = setTimeout(() => { scanTimer = null; scan(); }, ms == null ? 200 : ms);
  }
  async function scan() {
    if (!document.documentElement) return;
    st.targets = findTargets();
    if (st.targets.length) await query();
    syncPills();
    if (st.targets.length && st.accounts && st.accounts.length) autofill();
  }

  // Compte à remplir sans rien demander, ou null s'il y a un doute.
  function pickAccount(t) {
    const list = st.accounts || [];
    if (st.prefer) { const p = list.find((a) => a.id === st.prefer); if (p) return p; }
    // Identifiant déjà affiché par la page (champ rempli, ou champ caché de l'étape 2 façon Google).
    const shown = t.user ? getVal(t.user).trim() : (t.pw ? (hiddenUser(t.pw.form || document) || hiddenUser(document)) : '');
    if (shown) return list.find((a) => a.username === shown) || null;
    if (st.stepKnown) return null; // l'étape 1 a donné un autre identifiant : pas le mot de passe d'un autre compte
    return list.length === 1 ? list[0] : null;
  }
  function crossOriginAction(form) {
    const a = form && form.getAttribute('action');
    if (!a || /^\s*javascript:/i.test(a)) return false;
    try { return new URL(a, location.href).origin !== location.origin; } catch { return false; }
  }

  function autofill() {
    for (const t of st.targets) {
      const key = t.pw || t.user;
      if (st.auto.has(key)) continue;
      // Suite d'une « connexion en 1 clic » commencée à l'étape 1 : on remplit le mot de passe et on valide.
      if (st.cont && st.cont.until > Date.now() && t.pw) {
        const id = st.cont.id;
        st.cont = null;
        st.auto.add(key);
        fill(t, id, { submit: true, consume: true, user: true });
        return;
      }
      if (!st.autofill) continue;
      const acc = pickAccount(t);
      if (!acc) continue;
      st.auto.add(key);
      if (t.pw && getVal(t.pw)) continue; // déjà rempli (par l'utilisateur ou le site)
      if (st.typed.has(t.pw) || st.typed.has(t.user)) continue;
      if (t.user && getVal(t.user).trim() && getVal(t.user).trim() !== acc.username) continue;
      if (!t.pw && t.user && getVal(t.user).trim()) continue;
      if (crossOriginAction(t.form)) continue; // formulaire envoyé ailleurs : remplissage manuel seulement
      fill(t, acc.id, { submit: false });
    }
  }

  // Remplit comme un humain : focus, valeur via le setter natif, événements input et change.
  // Le focus n'est donné que pour un remplissage demandé par l'utilisateur (jamais volé au chargement).
  function typeInto(el, value, focus) {
    if (focus) { try { el.focus({ preventScroll: true }); } catch {} }
    setVal(el, value);
    el.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertReplacementText' }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'Unidentified' }));
  }

  async function fill(t, id, opts) {
    opts = opts || {};
    let cred = null;
    try { cred = await ipcRenderer.invoke('vault:site-fill', id, { oneClick: !!opts.submit && !t.pw, consume: !!opts.consume }); } catch {}
    if (!cred) return false;
    const user = t.user && t.user.isConnected ? t.user : null;
    const pw = t.pw && t.pw.isConnected ? t.pw : null;
    if (user && cred.username && getVal(user) !== cred.username) typeInto(user, cred.username, !!opts.user);
    if (pw) typeInto(pw, cred.password, !!opts.user);
    cred = null;
    const p = pills.get(user || pw) || pills.get(pw);
    if (p) { p.el.classList.remove('done'); void p.el.offsetWidth; p.el.classList.add('done'); }
    if (opts.submit) {
      if (!pw) st.cont = { id, until: Date.now() + 30000 }; // étape 2 sur la même page (sites « une seule page »)
      setTimeout(() => submitFrom(pw || user), 160);
    }
    return true;
  }

  function submitButton(field) {
    const ok = (b) => visible(b) && !b.disabled && b.getAttribute('aria-disabled') !== 'true';
    const form = field.form;
    if (form) {
      const typed = [...form.querySelectorAll('button, input[type=submit], input[type=image]')]
        .filter((b) => (b instanceof HTMLButtonElement ? b.type === 'submit' : true) && ok(b));
      const best = typed.find((b) => SUBMIT_RX.test(label(b)) && !NOT_SUBMIT_RX.test(label(b)))
        || (typed.length === 1 && !NOT_SUBMIT_RX.test(label(typed[0])) ? typed[0] : null);
      if (best) return best;
      if (typed.length) return null;
    }
    // Sans formulaire (Google…) : le bouton « Suivant / Se connecter » le plus proche du champ.
    let scope = field.parentElement;
    for (let d = 0; scope && d < 12; d++, scope = scope.parentElement) {
      const cands = [...scope.querySelectorAll('button, [role=button], input[type=submit], input[type=button]')].filter(ok);
      const best = cands.find((b) => SUBMIT_RX.test(label(b)) && !NOT_SUBMIT_RX.test(label(b)));
      if (best) return best;
    }
    return null;
  }
  function submitFrom(field) {
    if (!field || !field.isConnected) return;
    const btn = submitButton(field);
    if (btn) { btn.click(); return; }
    if (field.form) {
      try { field.form.requestSubmit(); } catch { try { field.form.submit(); } catch {} }
      return;
    }
    for (const type of ['keydown', 'keypress', 'keyup']) {
      field.dispatchEvent(new KeyboardEvent(type, { bubbles: true, cancelable: true, key: 'Enter', code: 'Enter' }));
    }
  }

  // ------------------------------------------------------------ interface dans la page (shadow DOM fermé)
  const CSS = `
    * { box-sizing: border-box; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; }
    .pill { position: fixed; display: flex; align-items: center; gap: 4px; margin: 0; padding: 0 9px 0 6px; height: 24px;
      border-radius: 999px; border: 1px solid rgba(255,138,0,.8); background: linear-gradient(180deg, #2a1a0e, #16131b);
      color: #ffd28a; font-size: 11.5px; font-weight: 700; letter-spacing: .02em; line-height: 1; white-space: nowrap;
      cursor: pointer; pointer-events: auto; outline: 0; box-shadow: 0 0 0 1px rgba(0,0,0,.35), 0 2px 10px rgba(255,90,0,.35);
      transition: transform .12s, box-shadow .15s, filter .15s; animation: pin .28s cubic-bezier(.2,1.4,.4,1); }
    .pill:hover { filter: brightness(1.18); box-shadow: 0 0 0 1px rgba(255,170,0,.65), 0 2px 18px rgba(255,110,0,.7); }
    .pill:active { transform: scale(.95); }
    .pill .fl { font-size: 12.5px; line-height: 1; }
    .pill .tx { background: linear-gradient(90deg, #ff6a00, #ffb000 60%, #ffd84a); -webkit-background-clip: text; background-clip: text; color: transparent; }
    .pill.compact { padding: 0 5px; }
    .pill.compact .tx { display: none; }
    .pill.done { animation: done .7s ease-out; }
    @keyframes pin { from { opacity: 0; transform: scale(.6); } }
    @keyframes done { 0% { box-shadow: 0 0 0 0 rgba(255,140,0,.9), 0 2px 10px rgba(255,90,0,.35); } 100% { box-shadow: 0 0 0 10px rgba(255,140,0,0), 0 2px 10px rgba(255,90,0,.35); } }
    .list { position: fixed; pointer-events: auto; padding: 6px; border-radius: 14px; background: #17151d; color: #f1ece4;
      border: 1px solid #3a3644; font-size: 13px; line-height: 1.3; text-align: left;
      box-shadow: 0 18px 50px rgba(0,0,0,.55), 0 0 0 1px rgba(255,122,0,.16), 0 0 34px -12px rgba(255,100,0,.6);
      animation: drop .14s ease-out; }
    @keyframes drop { from { opacity: 0; transform: translateY(-4px); } }
    .head { display: flex; align-items: center; gap: 6px; padding: 5px 8px 8px; margin-bottom: 4px; border-bottom: 1px solid #2b2833; font-size: 12px; }
    .head b { font-weight: 800; letter-spacing: .04em; background: linear-gradient(90deg, #ff4800, #ff8a00 55%, #ffc21a); -webkit-background-clip: text; background-clip: text; color: transparent; }
    .head .sub { margin-left: auto; padding-left: 12px; color: #8a8394; font-size: 11.5px; white-space: nowrap; }
    .row { display: flex; align-items: center; gap: 10px; padding: 7px 8px; border-radius: 9px; cursor: pointer; }
    .row.sel { background: rgba(255,122,0,.14); box-shadow: inset 3px 0 0 #ff8a00; }
    .av { width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; flex: none; font-weight: 800; font-size: 13px;
      color: #1d0b00; background: linear-gradient(135deg, hsl(var(--h, 30) 100% 62%), hsl(calc(var(--h, 30) - 22) 100% 47%)); box-shadow: 0 0 10px -2px rgba(255,110,0,.6); }
    .txt { display: grid; min-width: 0; flex: 1; }
    .txt b { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .txt small { color: #8a8394; font-size: 10.5px; letter-spacing: .14em; }
    .go { flex: none; color: #1d0b00; font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 999px; background: linear-gradient(90deg, #ff6a00, #ffb000); }
    .foot { display: flex; align-items: center; gap: 8px; margin-top: 4px; padding: 8px 8px 6px; border-top: 1px solid #2b2833; color: #ff9a1a; font-weight: 700; font-size: 12px; cursor: pointer; border-radius: 0 0 9px 9px; }
    .foot:hover { background: rgba(255,122,0,.1); }
  `;
  let host = null;
  let root = null;
  function shadow() {
    if (root) { if (!host.isConnected) document.documentElement.appendChild(host); return root; }
    host = document.createElement('fireshox-vault');
    for (const [k, v] of [['all', 'initial'], ['position', 'fixed'], ['top', '0'], ['left', '0'], ['width', '0'], ['height', '0'],
      ['display', 'block'], ['overflow', 'visible'], ['z-index', '2147483647'], ['pointer-events', 'none']]) host.style.setProperty(k, v, 'important');
    root = host.attachShadow({ mode: 'closed' });
    // Feuille construite (CSSOM) : pas bloquée par la CSP de la page, contrairement à <style>.
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(CSS);
    root.adoptedStyleSheets = [sheet];
    document.documentElement.appendChild(host);
    return root;
  }
  function h(tag, cls, text) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text != null) el.textContent = text;
    return el;
  }
  const swallow = (el) => {
    for (const t of ['mousedown', 'pointerdown', 'mouseup', 'pointerup']) el.addEventListener(t, (e) => { e.preventDefault(); e.stopPropagation(); });
  };
  const hue = (s) => { let x = 0; for (const c of String(s)) x = (x * 31 + c.charCodeAt(0)) >>> 0; return 14 + (x % 34); };

  const pills = new Map(); // champ → { el, target }
  function syncPills() {
    const want = new Map();
    if (st.accounts && st.accounts.length) for (const t of st.targets) want.set(t.user || t.pw, t);
    for (const [input, p] of pills) if (!want.has(input)) { p.el.remove(); pills.delete(input); }
    for (const [input, t] of want) {
      const p = pills.get(input);
      if (p) { p.target = t; continue; }
      const b = h('button', 'pill');
      b.type = 'button';
      b.title = 'Connexion en 1 clic — ShoxVault (Fire Shox)';
      b.append(h('span', 'fl', '🔥'), h('span', 'tx', 'ShoxVault'));
      swallow(b);
      b.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!e.isTrusted) return; // seul un vrai clic de l'utilisateur déclenche la connexion
        const cur = pills.get(input);
        if (cur) oneClick(cur.target, input);
      });
      shadow().appendChild(b);
      pills.set(input, { el: b, target: t });
    }
    if (list && !want.size) closeList();
    place();
    loop();
  }

  let loopTimer = null;
  function loop() {
    const need = pills.size > 0 || !!list;
    if (need && !loopTimer) loopTimer = setInterval(place, 150);
    if (!need && loopTimer) { clearInterval(loopTimer); loopTimer = null; }
  }
  let rafQueued = false;
  const placeSoon = () => { if (!rafQueued) { rafQueued = true; requestAnimationFrame(() => { rafQueued = false; place(); }); } };

  function place() {
    for (const [input, p] of pills) {
      const el = p.el;
      if (!input.isConnected || !visible(input)) { el.style.setProperty('display', 'none'); continue; }
      const r = input.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) { el.style.setProperty('display', 'none'); continue; }
      const ph = Math.round(Math.max(18, Math.min(24, r.height - 10)));
      el.classList.toggle('compact', r.width < 200);
      el.style.setProperty('display', 'flex');
      el.style.setProperty('height', ph + 'px');
      const gap = Math.max(4, Math.min(10, Math.round((r.height - ph) / 2)));
      el.style.setProperty('left', Math.round(r.right - el.offsetWidth - gap) + 'px');
      el.style.setProperty('top', Math.round(r.top + (r.height - ph) / 2) + 'px');
    }
    if (list) placeList();
  }

  function oneClick(t, input) {
    const accounts = st.accounts || [];
    if (!accounts.length) return;
    if (accounts.length === 1) { st.auto.add(t.pw || t.user); fill(t, accounts[0].id, { submit: true, user: true }); return; }
    const pref = st.prefer && accounts.find((a) => a.id === st.prefer);
    if (pref) { st.auto.add(t.pw || t.user); fill(t, pref.id, { submit: true, user: true }); return; }
    openList(t, true, input);
  }

  // ------------------------------------------------------------ liste des comptes (sous le champ)
  let list = null;
  function openList(t, oneClickMode, anchor) {
    closeList();
    const all = st.accounts || [];
    if (!all.length) return;
    const field = anchor || t.user || t.pw;
    const typed = !oneClickMode && field === t.user ? getVal(field).trim().toLowerCase() : '';
    const items = typed && !all.some((a) => a.username.toLowerCase() === typed)
      ? all.filter((a) => a.username.toLowerCase().startsWith(typed)) : all;
    if (!items.length) return;
    const el = h('div', 'list');
    swallow(el);
    const head = h('div', 'head');
    head.append(h('span', null, '🔥'), h('b', null, 'SHOXVAULT'),
      h('span', 'sub', oneClickMode ? 'Connexion en 1 clic' : (items.length > 1 ? items.length + ' comptes' : '1 compte')));
    el.append(head);
    items.forEach((a, i) => {
      const row = h('div', 'row');
      const av = h('span', 'av', (a.username || '?').trim().charAt(0).toUpperCase() || '?');
      av.style.setProperty('--h', String(hue(a.username)));
      const txt = h('span', 'txt');
      txt.append(h('b', null, a.username || '(sans identifiant)'), h('small', null, '••••••••••'));
      row.append(av, txt);
      if (oneClickMode) row.append(h('span', 'go', 'Connexion'));
      row.addEventListener('mousemove', () => select(i));
      row.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); if (e.isTrusted) choose(i); });
      el.append(row);
    });
    const foot = h('div', 'foot', '🔑  Gérer les mots de passe');
    foot.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      if (!e.isTrusted) return;
      closeList();
      ipcRenderer.send('vault:site-manage');
    });
    el.append(foot);
    shadow().appendChild(el);
    list = { el, target: t, oneClick: oneClickMode, items, sel: oneClickMode ? 0 : -1, anchor: field };
    select(list.sel);
    placeList();
    loop();
  }
  function select(i) {
    if (!list) return;
    list.sel = i;
    [...list.el.querySelectorAll('.row')].forEach((r, k) => r.classList.toggle('sel', k === i));
  }
  function choose(i) {
    const l = list;
    if (!l) return;
    const a = l.items[i];
    closeList();
    if (!a) return;
    st.auto.add(l.target.pw || l.target.user);
    fill(l.target, a.id, { submit: l.oneClick, user: true });
  }
  function closeList() {
    if (!list) return;
    list.el.remove();
    list = null;
    loop();
  }
  function placeList() {
    const a = list.anchor;
    if (!a || !a.isConnected || !visible(a)) { closeList(); return; }
    const r = a.getBoundingClientRect();
    const w = Math.round(Math.max(250, Math.min(380, r.width)));
    list.el.style.setProperty('width', w + 'px');
    const hgt = list.el.offsetHeight;
    let top = r.bottom + 6;
    if (top + hgt > innerHeight - 8 && r.top - hgt - 6 > 8) top = r.top - hgt - 6;
    list.el.style.setProperty('left', Math.round(Math.max(8, Math.min(r.left, innerWidth - w - 8))) + 'px');
    list.el.style.setProperty('top', Math.round(top) + 'px');
  }

  const targetOf = (el) => st.targets.find((t) => t.user === el || t.pw === el);

  // ------------------------------------------------------------ écouteurs (phase de capture)
  // Clavier dans la liste (avant la détection de l'envoi pour pouvoir avaler Entrée).
  window.addEventListener('keydown', (e) => {
    if (!list) {
      const t = e.key === 'ArrowDown' && !e.altKey && !e.ctrlKey ? targetOf(e.target) : null;
      if (t && st.accounts && st.accounts.length) { e.preventDefault(); e.stopImmediatePropagation(); openList(t, false, e.target); select(0); }
      return;
    }
    if (e.target !== list.anchor) return;
    const n = list.items.length;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault(); e.stopImmediatePropagation();
      select(list.sel < 0 ? (e.key === 'ArrowDown' ? 0 : n - 1) : (list.sel + (e.key === 'ArrowDown' ? 1 : n - 1)) % n);
    } else if (e.key === 'Enter' && list.sel >= 0) {
      e.preventDefault(); e.stopImmediatePropagation();
      choose(list.sel);
    } else if (e.key === 'Escape') {
      e.preventDefault(); e.stopImmediatePropagation();
      closeList();
    }
  }, true);
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.isComposing) return;
    const t = e.target;
    if (isPw(t) || isTextish(t)) { try { capture(t); } catch {} }
  }, true);
  window.addEventListener('submit', (e) => { try { capture(e.target); } catch {} }, true);
  window.addEventListener('click', (e) => {
    try {
      const t = e.target;
      if (!(t instanceof Element) || t === host) return;
      const b = t.closest('button, input[type=submit], input[type=image], input[type=button], [role=button]');
      if (b && looksSubmitClick(b)) capture(b);
    } catch {}
  }, true);
  window.addEventListener('input', (e) => {
    if (!e.isTrusted || !isInput(e.target)) return;
    st.typed.add(e.target);
    if (list && e.target === list.anchor) {
      if (!list.oneClick && e.target === list.target.user) openList(list.target, false, e.target); // filtre
      else closeList();
    }
  }, true);
  window.addEventListener('focusin', (e) => {
    if (isInput(e.target)) scheduleScan(30);
  }, true);
  window.addEventListener('focusout', (e) => {
    if (list && e.target === list.anchor) setTimeout(() => { if (list && document.activeElement !== list.anchor) closeList(); }, 150);
  }, true);
  // Champ de connexion sous le pointeur, même si un calque du site le recouvre (étiquette flottante de Google…).
  function fieldAt(x, y) {
    for (const t of st.targets) {
      for (const f of [t.user, t.pw]) {
        if (!f || !f.isConnected) continue;
        const r = f.getBoundingClientRect();
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return { t, f };
      }
    }
    return null;
  }
  window.addEventListener('mousedown', (e) => {
    if (!e.isTrusted || e.target === host) return;
    const hit = fieldAt(e.clientX, e.clientY);
    if (list && (!hit || hit.f !== list.anchor)) closeList();
    if (!hit || !st.accounts || !st.accounts.length) return;
    if (list) { closeList(); return; } // second clic dans le même champ : on referme
    if (st.accounts.length > 1 || !getVal(hit.f)) openList(hit.t, false, hit.f);
  }, true);
  addEventListener('scroll', placeSoon, { capture: true, passive: true });
  addEventListener('resize', placeSoon, { passive: true });

  // Demandes du navigateur : « Remplir » depuis l'icône clé, ou mots de passe modifiés.
  ipcRenderer.on('vault:fill-request', (_e, msg) => {
    const id = msg && typeof msg.id === 'string' ? msg.id : null;
    if (!id) return;
    st.targets = findTargets();
    const t = st.targets.find((x) => x.pw) || st.targets[0];
    if (!t) return;
    st.auto.add(t.pw || t.user);
    fill(t, id, { submit: false, user: true });
  });
  ipcRenderer.on('vault:refresh', () => { st.accounts = null; st.at = 0; scheduleScan(60); });

  // Les champs apparaissent souvent après coup (sites React, Google…) : on surveille la page.
  const mo = new MutationObserver(() => scheduleScan(200));
  const start = () => {
    if (!document.documentElement) return;
    mo.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['type', 'style', 'class', 'hidden', 'disabled'] });
    scheduleScan(40);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
  addEventListener('load', () => scheduleScan(80));
  addEventListener('pageshow', () => scheduleScan(80));
}
