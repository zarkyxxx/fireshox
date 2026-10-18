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
  });
}
