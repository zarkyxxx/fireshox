// Préchargement de l'interface du navigateur (onglets, barre d'adresse, menus).
'use strict';
const { contextBridge, ipcRenderer } = require('electron');

const on = (channel) => (fn) => {
  const h = (_e, ...a) => fn(...a);
  ipcRenderer.on(channel, h);
  return () => ipcRenderer.removeListener(channel, h);
};

contextBridge.exposeInMainWorld('shell', {
  get: (key, fallback) => {
    const v = ipcRenderer.sendSync('store:get', String(key));
    return v === undefined || v === null ? fallback : v;
  },
  set: (key, value) => ipcRenderer.send('store:set', String(key), value),
  onStoreChange: on('store:changed'),
  onShortcut: on('shortcut'),
  onNewTab: on('tab:new'),
  onGuestContextMenu: on('guest:context-menu'),
  onDownload: on('download:update'),
  onDownloadRemoved: on('download:removed'),
  onWinState: on('win:state'),
  onUpdate: on('update:status'),
  guestOp: (id, op, a, b) => ipcRenderer.send('guest:op', id, op, a, b),
  downloads: () => ipcRenderer.invoke('download:list'),
  downloadAction: (id, action) => ipcRenderer.send('download:action', id, action),
  info: () => ipcRenderer.invoke('app:info'),
  newWindow: (urls) => ipcRenderer.send('app:new-window', urls || []),
  copyText: (t) => ipcRenderer.send('clipboard:write', t),
  setOverlay: (colors) => ipcRenderer.send('win:set-overlay', colors),
  fullscreen: (on) => ipcRenderer.send('win:fullscreen', on),
  installUpdate: () => ipcRenderer.send('update:install'),
  checkUpdate: () => ipcRenderer.invoke('update:check'),
  clearData: (what) => ipcRenderer.invoke('data:clear', what),
  // Onglet détaché : { url, title, pinned, state, last, screenX, screenY, grabX } → { action, bounds }
  detachTab: (info) => ipcRenderer.invoke('tab:detach', info),
  // ShoxVault : l'interface ne reçoit jamais de mot de passe enregistré, seulement les identifiants
  // du site affiché (et le mot de passe qu'on propose d'enregistrer, si on clique sur l'œil).
  vault: {
    site: (contentsId) => ipcRenderer.invoke('vault:ui-site', contentsId),
    revealOffer: (offerId) => ipcRenderer.invoke('vault:ui-reveal', String(offerId)),
    decide: (offerId, action, username) => ipcRenderer.invoke('vault:ui-decide', String(offerId), String(action), typeof username === 'string' ? username : undefined),
    fill: (contentsId, id) => ipcRenderer.send('vault:ui-fill', contentsId, String(id)),
    copyUsername: (id) => ipcRenderer.send('vault:ui-copy-user', String(id)),
    tabClosed: (contentsId) => ipcRenderer.send('vault:ui-tab-closed', contentsId),
    onOffer: on('vault:offer'),
    onChanged: on('vault:changed'),
  },
});

// Panneau Claude, ShoxBlock, ShoxShot, mode Fantôme (src/ui/panel.js et src/ui/extras.js).
contextBridge.exposeInMainWorld('fsx', {
  newGhostWindow: () => ipcRenderer.send('app:new-ghost-window'),
  onClaudeAsk: on('claude:ask'),
  block: {
    state: (contentsId) => ipcRenderer.invoke('shoxblock:state', contentsId),
    setSite: (contentsId, enabled) => ipcRenderer.invoke('shoxblock:set-site', contentsId, !!enabled),
    onCount: on('shoxblock:count'),
  },
  shot: {
    capture: (contentsId, mode, rect) => ipcRenderer.invoke('shot:capture', contentsId, String(mode), rect || null),
    copy: (id) => ipcRenderer.invoke('shot:copy', String(id)),
    save: (id) => ipcRenderer.invoke('shot:save', String(id)),
    openFolder: (id) => ipcRenderer.send('shot:open-folder', String(id || '')),
    discard: (id) => ipcRenderer.send('shot:discard', String(id)),
    folder: () => ipcRenderer.invoke('shot:folder'),
  },
});
