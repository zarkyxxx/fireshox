// Panneau Claude — bouton « 🔥 Demander à Claude » sur les résultats de recherche Google.
// Le bouton vit dans webview-preload.js (monde isolé, shadow DOM fermé) ; ici on vérifie que l'envoi
// vient bien du cadre principal d'une page de résultats Google, et on relit la recherche dans l'adresse
// de la page (jamais un texte fourni par la page) avant de demander à l'interface d'ouvrir le panneau.
'use strict';
const { ipcMain } = require('electron');

const GOOGLE_SEARCH = /^https:\/\/www\.google\.(?:[a-z]{2,3}|co\.[a-z]{2}|com\.[a-z]{2})\/search\?/i;

function fromGoogleSearch(e) {
  const f = e.senderFrame;
  if (!f || f.parent) return false;
  if (!e.sender || e.sender.getType() !== 'webview') return false;
  return GOOGLE_SEARCH.test(f.url || '');
}

function init(hooks) {
  // Le bouton doit-il s'afficher ? (réglage « Bouton sur Google », section Claude des Paramètres)
  ipcMain.on('claude:google-button', (e) => {
    let on = false;
    try { on = fromGoogleSearch(e) && (hooks.settings() || {}).claudeGoogle !== false; } catch {}
    e.returnValue = on;
  });
  ipcMain.on('claude:ask-google', (e) => {
    if (!fromGoogleSearch(e)) return;
    let q = '';
    try { q = new URL(e.senderFrame.url).searchParams.get('q') || ''; } catch {}
    q = q.trim().slice(0, 2000);
    if (!q) return;
    const ui = hooks.uiOf(e.sender);
    if (ui && !ui.isDestroyed()) ui.send('claude:ask', { q, from: e.sender.id });
  });
}

module.exports = { init, GOOGLE_SEARCH };
