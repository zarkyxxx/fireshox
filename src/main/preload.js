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
});
