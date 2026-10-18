// Petit magasin clé → valeur persistant (fichier JSON dans le dossier de profil).
// Tout ce qui doit survivre à la fermeture du navigateur passe par ici :
// réglages, favoris, historique, scores ShoxBench, inventaire Shox Opening…
'use strict';
const { app } = require('electron');
const fs = require('fs');
const path = require('path');

let file = null;
let data = {};
let timer = null;

function init() {
  file = path.join(app.getPath('userData'), 'fireshox-data.json');
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8')) || {};
  } catch {
    // Fichier absent ou abîmé : on tente la copie de secours.
    try { data = JSON.parse(fs.readFileSync(file + '.bak', 'utf8')) || {}; } catch { data = {}; }
  }
}

function get(key) {
  return key === undefined ? data : data[key];
}

function set(key, value) {
  if (value === undefined || value === null) delete data[key];
  else data[key] = value;
  clearTimeout(timer);
  timer = setTimeout(flush, 250);
}

function flush() {
  clearTimeout(timer);
  timer = null;
  if (!file) return;
  try {
    const json = JSON.stringify(data);
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, json);
    if (fs.existsSync(file)) fs.copyFileSync(file, file + '.bak');
    fs.renameSync(tmp, file);
  } catch (e) {
    console.error('[store] écriture impossible', e);
  }
}

module.exports = { init, get, set, flush };
