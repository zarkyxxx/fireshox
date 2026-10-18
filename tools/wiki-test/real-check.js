// Vérification du VRAI textdb.dev, sans toucher aux pages du wiki :
//   node tools/wiki-test/real-check.js
// Écrit puis relit UNE fois la clé de test « <préfixe>-test » (même format que le navigateur),
// et vérifie (en lecture seule) que l'index réel est lisible.
'use strict';
const cloud = require('../../src/main/wiki-cloud.js');

const base = cloud.CONFIG.textdb;
const testKey = cloud.KEY.test();
const indexKey = cloud.KEY.index();

(async () => {
  const value = { test: true, at: Date.now(), texte: 'Vérification Wiki Shox — « accents », émojis 🔥 et <balises> inoffensives' };
  const w = await fetch(base + encodeURIComponent(testKey), {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(value),
  });
  console.log('écriture', testKey, '→', w.status, (await w.text()).slice(0, 120));
  const r = await fetch(base + encodeURIComponent(testKey), { headers: { accept: 'application/json' } });
  const raw = await r.text();
  console.log('lecture  →', r.status, 'brut :', raw.slice(0, 160));
  const back = cloud.decode(raw);
  const same = !!back && back.at === value.at && back.texte === value.texte;
  console.log('relu identique :', same);
  const i = await fetch(base + encodeURIComponent(indexKey), { headers: { accept: 'application/json' } });
  const iraw = await i.text();
  const idx = cloud.cleanIndex(cloud.decode(iraw));
  console.log('index réel (lecture seule) →', i.status, 'pages :', Object.keys(idx.pages).length, '| brut :', iraw.slice(0, 60));
  process.exit(same ? 0 : 1);
})().catch((err) => { console.error('ÉCHEC', err); process.exit(2); });
