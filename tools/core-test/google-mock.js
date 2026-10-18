// Faux résultats Google, en local, pour tester le bouton « 🔥 Demander à Claude » de webview-preload.js
// quand le vrai Google répond par une page reCAPTCHA (trafic automatisé). Rien n'est publié.
// Lancer : node tools/core-test/google-mock.js   (https://127.0.0.1:47444, certificat de .cache/vault-test)
// Puis Fire Shox avec : --ignore-certificate-errors "--host-resolver-rules=MAP www.google.com:443 127.0.0.1:47444"
'use strict';
const https = require('https');
const fs = require('fs');
const path = require('path');

const CERT = path.join(__dirname, '..', '..', '.cache', 'vault-test');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const page = (q) => `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(q)} - Recherche (maquette de test)</title>
<style>
  body { margin: 0; font: 14px/1.5 Arial, sans-serif; color: #202124; background: #fff; }
  header { display: flex; align-items: center; gap: 28px; padding: 20px 28px 12px; border-bottom: 1px solid #ebebeb; }
  .logo { font-size: 26px; font-weight: 700; color: #4285f4; letter-spacing: -1px; }
  form[role=search] { width: 690px; max-width: 52vw; }
  form[role=search] > div { display: flex; align-items: center; height: 46px; padding: 0 16px; border: 1px solid #dfe1e5; border-radius: 24px; box-shadow: 0 1px 6px rgba(32,33,36,.18); }
  textarea { flex: 1; border: 0; outline: 0; resize: none; height: 22px; font: 16px Arial, sans-serif; overflow: hidden; }
  .right { margin-left: auto; display: flex; gap: 14px; color: #5f6368; }
  .right span { width: 32px; height: 32px; border-radius: 50%; background: #f1f3f4; display: inline-block; }
  main { padding: 20px 28px 0 180px; max-width: 760px; }
  .res { margin-bottom: 26px; } .res a { color: #1a0dab; font-size: 20px; text-decoration: none; } .res cite { color: #006621; font-style: normal; display: block; }
</style></head><body>
<header><div class="logo">Maquette</div>
  <form role="search" action="/search"><div><textarea name="q" rows="1">${esc(q)}</textarea></div></form>
  <div class="right"><span></span><span></span><span></span></div></header>
<main>${[1, 2, 3, 4].map((i) => `<div class="res"><cite>https://exemple-${i}.test › shox</cite><a href="#">Résultat de test n° ${i} pour « ${esc(q)} »</a><p>Page factice servie en local pour vérifier le bouton de Fire Shox.</p></div>`).join('')}</main>
</body></html>`;

https.createServer({ key: fs.readFileSync(path.join(CERT, 'key.pem')), cert: fs.readFileSync(path.join(CERT, 'cert.pem')) }, (req, res) => {
  const u = new URL(req.url, 'https://www.google.com');
  if (u.pathname !== '/search') { res.writeHead(302, { location: '/search?q=nike+shox' }); res.end(); return; }
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
  res.end(page(u.searchParams.get('q') || ''));
}).listen(47444, '127.0.0.1', () => console.log('maquette Google : https://127.0.0.1:47444/search?q=…'));
