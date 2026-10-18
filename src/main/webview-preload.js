// Préchargement de chaque onglet. Seuls les sites internes (fireshox://…) reçoivent
// l'API « window.fireshox » : stockage persistant partagé et ouverture d'onglets.
'use strict';
const { contextBridge, ipcRenderer } = require('electron');

// Pages de connexion Google : on y ressemble à Firefox jusqu'au bout (voir main.js, FIREFOX_UA).
if (/^accounts\.(google\.[a-z.]+|youtube\.com)$/i.test(location.hostname)) {
  try {
    contextBridge.executeInMainWorld({
      func: () => {
        const N = Navigator.prototype;
        try { delete N.userAgentData; } catch {}
        try { Object.defineProperty(N, 'vendor', { get: () => '', configurable: true }); } catch {}
        try { Object.defineProperty(N, 'productSub', { get: () => '20100101', configurable: true }); } catch {}
      },
    });
  } catch {}
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
