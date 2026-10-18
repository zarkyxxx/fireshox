// Fenêtre Fantôme (navigation privée) — chargé AVANT ui.js.
// Le processus principal ouvre la fenêtre avec ?ghost=<partition en mémoire>. Chaque <webview> créée
// par l'interface reçoit cette partition dès sa création (le processus principal l'impose aussi dans
// will-attach-webview : un onglet Fantôme ne peut jamais retomber sur la session normale).
'use strict';
(() => {
  const partition = new URLSearchParams(location.search).get('ghost');
  window.FS_GHOST = partition && /^fsx-ghost-[a-z0-9-]+$/.test(partition) ? partition : null;
  if (!window.FS_GHOST) return;
  document.documentElement.classList.add('ghost');
  document.body.classList.add('ghost');
  const create = Document.prototype.createElement;
  Document.prototype.createElement = function createElement(tag, options) {
    const el = create.call(this, tag, options);
    if (typeof tag === 'string' && tag.toLowerCase() === 'webview') el.setAttribute('partition', window.FS_GHOST);
    return el;
  };
})();
