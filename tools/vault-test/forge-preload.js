// TEST UNIQUEMENT (jamais chargé par Fire Shox) : donne à la page un accès IPC brut, comme si son
// moteur de rendu était compromis, pour vérifier que le processus principal refuse tout seul.
'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('rawIpc', {
  invoke: (ch, ...a) => ipcRenderer.invoke(ch, ...a),
  send: (ch, ...a) => ipcRenderer.send(ch, ...a),
});
