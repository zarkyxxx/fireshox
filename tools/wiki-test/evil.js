// Simule un client malveillant qui écrit DIRECTEMENT dans le faux serveur (sans passer par Fire Shox) :
//   node tools/wiki-test/evil.js [port]
// Le navigateur doit tout afficher en texte inoffensif (aucune balise, aucun script, aucune image étrangère).
'use strict';
const PORT = Number(process.argv[2]) || 8790;
const P = 'fireshox-wiki-pw32z8m76tnr9a0k';
const put = (key, v) => fetch(`http://127.0.0.1:${PORT}/api/data/${key}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(v) });
const X = '<img src=x onerror="document.title=\'PIRATÉ\'"><script>document.title="PIRATÉ"</script>';

(async () => {
  const data = {
    titre: `Page piégée ${X}`,
    chapeau: `[[Image:javascript:alert(1)|x]] ${X}`,
    resume: `${X}\n\n[javascript:alert(1) lien js] [data:text/html,<b>x</b> data] [https://exemple.fr" onmouseover="alert(1) guillemets]\n\n[[Image:https://evil.example/pixel.gif|traqueur]]\n\n[[Image:https://files.catbox.moe/../../evil.jpg|chemin]]\n\n== Titre ${X} ==\n\n> citation ${X} — auteur ${X}\n\n| a ${X} | b |`,
    photo: 'https://evil.example/photo.jpg',
    legende: X,
    cadrage: '50%; background:url(https://evil.example/x)',
    infobox: [[`# Bloc ${X}`], [`Libellé ${X}`, `Valeur ${X} [[le-y]]`]],
    sections: [[`Section ${X}`, `Texte ${X}\n* puce ${X}`, 2]],
    galerie: [['javascript:alert(1)', 'js'], ['https://evil.example/g.jpg', 'étranger'], ['/assets/logo.png', `légende ${X}`], ['../../../etc/passwd.jpg', 'remontée']],
    voirAussi: ['le-y', '"><script>', 'javascript:alert(1)'],
    categories: [`Catégorie ${X}`],
    ebauche: false,
    statut: '<b>',
  };
  const page = { slug: 'page-piegee', title: data.titre, revision: 1, modified: Date.now(), author: `Pirate ${X}`, data };
  await put(`${P}-page-page-piegee`, page);
  await put(`${P}-hist-page-piegee`, [{ revision: 1, date: Date.now(), author: `Pirate ${X}`, summary: `Résumé ${X}`, title: data.titre, data }]);
  const idx = await (await fetch(`http://127.0.0.1:${PORT}/api/data/${P}-index`)).text();
  let index = {};
  try { index = JSON.parse(idx) || {}; } catch {}
  if (!index.pages) index.pages = {};
  index.pages['page-piegee'] = { title: data.titre, revision: 1, modified: Date.now(), author: `Pirate ${X}`, summary: `Résumé ${X}` };
  index.pages['<img src=x onerror=alert(1)>'] = { title: 'slug piégé', revision: 1, modified: Date.now(), author: 'x' };
  index.pages['__proto__'] = { title: 'proto', revision: 1 };
  await put(`${P}-index`, index);
  console.log('page piégée écrite');
})();
