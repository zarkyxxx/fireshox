// Site de connexion de TEST pour ShoxVault (local uniquement : https://localhost:47443 et http://localhost:47080).
// Lancer :  node tools/vault-test/server.js   (certificat de test dans .cache/vault-test/, créé avec openssl)
// Identifiants de test (fictifs, propres à ce site local) : voir TEST ci-dessous.
// Ce serveur n'écrit rien sur le disque et ne journalise jamais le contenu des requêtes.
'use strict';
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const CERT = path.join(ROOT, '.cache', 'vault-test');
const TEST = { username: 'shox.testeur', password: 'Ressorts-Brulants-4812!', email: 'shox.testeur@example.test' };
const HTTPS_PORT = 47443;
const HTTP_PORT = 47080;

const page = (title, body, script = '') => `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${title}</title>
<meta name="viewport" content="width=device-width">
<style>
  body { margin: 0; font: 15px/1.5 'Segoe UI', system-ui, sans-serif; background: #f3f5f8; color: #1f2430; }
  header { background: #2b3a55; color: #fff; padding: 14px 28px; font-weight: 700; letter-spacing: .02em; }
  main { max-width: 440px; margin: 48px auto; background: #fff; border-radius: 10px; padding: 28px 32px 30px; box-shadow: 0 6px 30px rgba(20,30,60,.12); }
  h1 { margin: 0 0 6px; font-size: 24px; } p.lead { margin: 0 0 20px; color: #5b6475; }
  label { display: block; font-weight: 600; font-size: 13px; margin: 14px 0 6px; }
  input[type=text], input[type=email], input[type=password] { width: 100%; box-sizing: border-box; height: 42px; border: 1px solid #c9d0db; border-radius: 6px; padding: 0 12px; font-size: 15px; }
  input:focus { outline: 2px solid #3d7bfd; border-color: transparent; }
  button { margin-top: 20px; height: 42px; padding: 0 22px; border: 0; border-radius: 6px; background: #3d7bfd; color: #fff; font-weight: 700; font-size: 15px; cursor: pointer; }
  button[disabled] { background: #a9b6cc; cursor: default; }
  button.link { background: none; color: #3d7bfd; padding: 0; height: auto; margin: 0; font-weight: 600; }
  .row { display: flex; justify-content: space-between; align-items: center; margin-top: 22px; }
  .row button { margin: 0; }
  .flash { padding: 10px 14px; border-radius: 6px; margin-bottom: 16px; font-weight: 600; }
  .flash.ok { background: #e3f7e8; color: #1c6b34; } .flash.bad { background: #fde6e6; color: #9b1c1c; }
  .who { font-weight: 700; } iframe { width: 100%; height: 360px; border: 1px dashed #9aa5b8; border-radius: 8px; }
</style></head><body><header>Shox Test Corp — site de démo local</header><main>${body}</main>${script ? `<script>${script}</script>` : ''}</body></html>`;

function readBody(req) {
  return new Promise((resolve) => {
    let b = '';
    req.on('data', (c) => { b += c; if (b.length > 1e5) req.destroy(); });
    req.on('end', () => resolve(b));
  });
}

async function handle(req, res) {
  const u = new URL(req.url, 'https://localhost');
  const send = (code, html, headers = {}) => { res.writeHead(code, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', ...headers }); res.end(html); };
  const redirect = (to) => { res.writeHead(302, { location: to }); res.end(); };

  // 1) Formulaire classique (même structure que the-internet.herokuapp.com/login).
  if (u.pathname === '/' || u.pathname === '/login') {
    const err = u.searchParams.get('err');
    return send(200, page('Connexion — Shox Test Corp', `
      ${err ? '<div class="flash bad" id="flash">Identifiant ou mot de passe invalide !</div>' : ''}
      <h1>Connexion</h1><p class="lead">Page de test : formulaire classique.</p>
      <form name="login" method="post" action="/authenticate">
        <label for="username">Identifiant</label><input type="text" name="username" id="username">
        <label for="password">Mot de passe</label><input type="password" name="password" id="password">
        <button class="radius" type="submit"><i>Login</i></button>
      </form>`));
  }
  if (u.pathname === '/authenticate' && req.method === 'POST') {
    const f = new URLSearchParams(await readBody(req));
    if (f.get('username') === TEST.username && f.get('password') === TEST.password) return redirect('/secure');
    return redirect('/login?err=1');
  }
  if (u.pathname === '/secure') {
    return send(200, page('Espace sécurisé', `<div class="flash ok" id="flash">Connecté : tu es dans l'espace sécurisé !</div>
      <h1>Espace sécurisé</h1><p class="lead">Bienvenue, <span class="who">${TEST.username}</span>.</p><a href="/login">Se déconnecter</a>`));
  }

  // 2) Page « React » : valeur suivie comme React (le setter de l'instance est surchargé) et pas de <form>.
  if (u.pathname === '/react') {
    return send(200, page('Connexion (React) — Shox Test Corp', `
      <h1>Connexion appli</h1><p class="lead">Champs contrôlés façon React, sans formulaire.</p>
      <div id="app"><label>E-mail ou identifiant</label><input type="text" name="user" autocomplete="username" id="ru">
      <label>Mot de passe</label><input type="password" name="pass" autocomplete="current-password" id="rp">
      <button id="go" disabled>Se connecter</button><div id="out"></div></div>`, `
      const state = { user: '', pass: '' };
      const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
      function track(el) {
        let tracked = desc.get.call(el);
        Object.defineProperty(el, 'value', { configurable: true, get() { return desc.get.call(this); }, set(v) { tracked = String(v); desc.set.call(this, v); } });
        el.addEventListener('input', () => { const cur = desc.get.call(el); if (cur !== tracked) { tracked = cur; state[el.name] = cur; render(); } });
      }
      const go = document.getElementById('go');
      function render() { go.disabled = !(state.user && state.pass); }
      track(document.getElementById('ru')); track(document.getElementById('rp'));
      go.addEventListener('click', async () => {
        const r = await fetch('/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: state.user, password: state.pass }) });
        const ok = r.ok;
        document.getElementById('app').innerHTML = ok ? '<div class="flash ok" id="flash">Connecté (React) !</div>' : '<div class="flash bad" id="flash">Refusé (React)</div>';
      });`));
  }
  if (u.pathname === '/api/login' && req.method === 'POST') {
    let j = {};
    try { j = JSON.parse(await readBody(req)); } catch {}
    const ok = (j.username === TEST.username || j.username === TEST.email) && j.password === TEST.password;
    res.writeHead(ok ? 200 : 401, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ ok }));
  }

  // 3) Connexion en deux étapes façon Google (identifiant, PUIS mot de passe sur une autre page).
  if (u.pathname === '/g/identifier') {
    return send(200, page('Connexion : deux étapes', `
      <h1>Connexion</h1><p class="lead">Étape 1 : adresse e-mail (comme Google).</p>
      <div><label for="identifierId">Adresse e-mail ou téléphone</label>
      <input type="email" id="identifierId" name="identifier" autocomplete="username webauthn" spellcheck="false">
      <input type="password" name="hiddenPassword" tabindex="-1" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px">
      <div class="row"><button class="link" type="button" id="create">Créer un compte</button><div id="identifierNext"><button type="button"><span>Suivant</span></button></div></div></div>`, `
      document.querySelector('#identifierNext button').addEventListener('click', () => {
        const v = document.getElementById('identifierId').value.trim();
        if (v) location.href = '/g/pwd?u=' + encodeURIComponent(v);
      });`));
  }
  if (u.pathname === '/g/pwd') {
    const who = (u.searchParams.get('u') || '').replace(/[<>&"']/g, '');
    return send(200, page('Connexion : mot de passe', `
      <h1>Bienvenue</h1><p class="lead">Étape 2 : <span class="who">${who}</span></p>
      <input type="email" name="identifier" value="${who}" autocomplete="username" hidden aria-hidden="true">
      <label for="pw">Saisissez votre mot de passe</label>
      <input type="password" name="Passwd" id="pw" autocomplete="current-password">
      <div class="row"><button class="link" type="button">Mot de passe oublié ?</button><div id="passwordNext"><button type="button"><span>Suivant</span></button></div></div>`, `
      document.querySelector('#passwordNext button').addEventListener('click', async () => {
        const r = await fetch('/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: ${JSON.stringify(who)}, password: document.getElementById('pw').value }) });
        location.href = r.ok ? '/g/done' : '/g/pwd?err=1&u=' + encodeURIComponent(${JSON.stringify(who)});
      });`));
  }
  if (u.pathname === '/g/done') return send(200, page('Connecté', '<div class="flash ok" id="flash">Connecté (deux étapes) !</div><h1>Compte</h1>'));

  // 4) Inscription : deux champs mot de passe → ShoxVault ne doit RIEN proposer.
  if (u.pathname === '/signup') {
    return send(200, page('Inscription', `<h1>Inscription</h1><p class="lead">Deux champs mot de passe.</p>
      <form method="post" action="/signup-done"><label>Identifiant</label><input type="text" name="username" id="su">
      <label>Mot de passe</label><input type="password" name="p1" id="sp1"><label>Confirmer</label><input type="password" name="p2" id="sp2">
      <button type="submit">Créer le compte</button></form>`));
  }
  if (u.pathname === '/signup-done') { await readBody(req); return send(200, page('Inscrit', '<div class="flash ok" id="flash">Compte créé.</div>')); }

  // 5) iframe d'une AUTRE origine (127.0.0.1) contenant le formulaire : ne doit rien recevoir.
  if (u.pathname === '/frame') {
    return send(200, page('Iframe', `<h1>Page avec iframe</h1><p class="lead">L'iframe vient de https://127.0.0.1:${HTTPS_PORT}.</p>
      <iframe id="fr" src="https://127.0.0.1:${HTTPS_PORT}/login"></iframe>`));
  }
  send(404, page('404', '<h1>404</h1>'));
}

const tls = { key: fs.readFileSync(path.join(CERT, 'key.pem')), cert: fs.readFileSync(path.join(CERT, 'cert.pem')) };
https.createServer(tls, (q, r) => handle(q, r).catch(() => { try { r.end(); } catch {} })).listen(HTTPS_PORT, () => console.log(`https://localhost:${HTTPS_PORT}/ prêt`));
http.createServer((q, r) => handle(q, r).catch(() => { try { r.end(); } catch {} })).listen(HTTP_PORT, () => console.log(`http://localhost:${HTTP_PORT}/ prêt`));
