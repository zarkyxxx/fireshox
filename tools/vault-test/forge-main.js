// TEST de sécurité ShoxVault : appels IPC forgés depuis des pages qui n'y ont pas droit.
// Lancer (serveur de test démarré) :  node_modules\electron\dist\electron.exe tools/vault-test/forge-main.js
// N'affiche jamais de mot de passe : seulement des vrai/faux.
'use strict';
const { app, BrowserWindow, protocol, session } = require('electron');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..', '..');
const PROFILE = path.join(ROOT, '.cache', 'profile-vault-forge');
fs.rmSync(PROFILE, { recursive: true, force: true });
app.setPath('userData', PROFILE);
app.commandLine.appendSwitch('ignore-certificate-errors'); // certificat de test local
protocol.registerSchemesAsPrivileged([{ scheme: 'fireshox', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }]);
const vault = require(path.join(ROOT, 'src', 'main', 'vault.js'));

const SECRET = 'Forge-Secret-' + Math.random().toString(36).slice(2, 8);
const results = [];
const check = (name, ok) => { results.push({ name, ok: !!ok }); console.log((ok ? 'OK   ' : 'ÉCHEC') + ' ' + name); };

app.whenReady().then(async () => {
  session.defaultSession.protocol.handle('fireshox', () => new Response('<!doctype html><title>t</title><body>page interne</body>', { headers: { 'content-type': 'text/html' } }));
  vault.init({ isUi: () => false, isUiContents: () => false, uiFor: () => null, openTab: () => {}, settings: () => ({}) });
  const win = new BrowserWindow({
    show: false, width: 900, height: 700,
    webPreferences: { preload: path.join(__dirname, 'forge-preload.js'), contextIsolation: true, sandbox: true, nodeIntegrationInSubFrames: true },
  });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const load = async (url) => { await win.loadURL(url).catch(() => {}); await sleep(400); };
  const js = (code, frame) => (frame || win.webContents.mainFrame).executeJavaScript(code, true);
  const inv = (ch, ...a) => `rawIpc.invoke(${JSON.stringify(ch)}${a.map((x) => ', ' + JSON.stringify(x)).join('')})`;

  try {
    // 1) La page de gestion peut ajouter et lister.
    await load('fireshox://passwords/');
    console.log('origine du cadre fireshox://passwords :', win.webContents.mainFrame.origin);
    const add = await js(inv('vault:mgr-add', { url: 'https://localhost:47443', username: 'forge', password: SECRET }));
    check('fireshox://passwords peut ajouter', add && add.ok);
    const list = await js(inv('vault:mgr-list'));
    check('fireshox://passwords liste le compte', list && list.entries.length === 1 && list.entries[0].username === 'forge');
    const id = list.entries[0].id;
    check('fireshox://passwords peut afficher', (await js(inv('vault:mgr-reveal', id))) === SECRET);

    // 2) Une autre page interne n'a droit à rien, même avec l'IPC brut.
    await load('fireshox://shoxbench/');
    check('shoxbench : liste refusée', (await js(inv('vault:mgr-list'))) === null);
    check('shoxbench : affichage refusé', (await js(inv('vault:mgr-reveal', id))) === null);
    check('shoxbench : copie refusée', (await js(inv('vault:mgr-copy', id, 'password'))) === false);
    check('shoxbench : suppression refusée', !(await js(inv('vault:mgr-delete', id))).ok);
    check('shoxbench : ajout refusé', !(await js(inv('vault:mgr-add', { url: 'https://evil.test', username: 'x', password: 'y' }))).ok);
    check('shoxbench : remplissage de site refusé', (await js(inv('vault:site-fill', id))) === null);
    // Faux chemin : fireshox://shoxbench/passwords/ n'est pas la page de gestion.
    await load('fireshox://shoxbench/passwords/');
    check('fireshox://shoxbench/passwords/ : refusé', (await js(inv('vault:mgr-list'))) === null);

    // 3) Le bon site (même origine exacte) reçoit le mot de passe… et rien d'autre.
    await load('https://localhost:47443/login');
    const q = await js(inv('vault:site-query'));
    check('https://localhost:47443 voit son compte', q && q.accounts.length === 1);
    const cred = await js(inv('vault:site-fill', id));
    check('https://localhost:47443 reçoit son mot de passe', cred && cred.password === SECRET);
    check('site : liste du coffre refusée', (await js(inv('vault:mgr-list'))) === null);
    check('site : canal de l\'interface refusé', (await js(inv('vault:ui-site', win.webContents.id))) === null);
    check('site : affichage par la page de gestion refusé', (await js(inv('vault:mgr-reveal', id))) === null);

    // 4) Iframe de la même origine : refusée (seul le cadre principal est servi).
    await js("new Promise((r) => { const f = document.createElement('iframe'); f.src = '/secure'; f.onload = r; document.body.append(f); })");
    await sleep(300);
    const same = win.webContents.mainFrame.frames[0];
    check('iframe même origine : remplissage refusé', same && (await js(inv('vault:site-fill', id), same)) === null);

    // 5) Autres origines : rien.
    for (const url of ['https://127.0.0.1:47443/login', 'http://localhost:47080/login']) {
      await load(url);
      const r = await js(inv('vault:site-query'));
      check(`${new URL(url).origin} : aucun compte`, r && r.accounts.length === 0);
      check(`${new URL(url).origin} : mot de passe refusé`, (await js(inv('vault:site-fill', id))) === null);
    }
    await load('https://localhost:47443/frame');
    await sleep(800);
    const other = win.webContents.mainFrame.frames[0];
    console.log('iframe :', other && other.url, other && other.origin);
    check('iframe 127.0.0.1 dans localhost : remplissage refusé', other && (await js(inv('vault:site-fill', id), other)) === null);
    check('iframe 127.0.0.1 dans localhost : requête refusée', other && (await js(inv('vault:site-query'), other)) === null);
    await load('data:text/html,<p>data</p>');
    check('page data: : refusée', (await js(inv('vault:site-query'))) === null);

    // 6) Enregistrement forgé depuis une page interne : ignoré.
    await load('fireshox://shoxbench/');
    await js(`rawIpc.send('vault:site-submit', { username: 'pirate', password: 'x' }), 1`);
    await sleep(200);
    await load('fireshox://passwords/');
    const after = await js(inv('vault:mgr-list'));
    check('envoi forgé depuis shoxbench ignoré', after.entries.length === 1);

    // 7) Import CSV (format d'export de Chrome). Seule la boîte de dialogue est simulée.
    const csv = path.join(ROOT, '.cache', 'vault-test', 'import-test.csv');
    fs.writeFileSync(csv, '﻿name,url,username,password,note\r\n'
      + `localhost,https://localhost:47443/login,forge,${SECRET},\r\n` // déjà là, même mot de passe → ignoré
      + 'exemple,https://exemple.test/connexion,"alice, la vraie","mdp,avec ""guillemets""\nsur 2 lignes",note\r\n'
      + 'ancien,http://vieux-site.test/,bob,mdp-http,\r\n' // http hors localhost → ignoré
      + 'appli,android://abc@com.example/,carl,mdp-android,\r\n' // pas un site → ignoré
      + 'local,http://localhost:47080/,dora,mdp-local,\r\n');
    require('electron').dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [csv] });
    await load('fireshox://shoxbench/');
    check('import refusé depuis shoxbench', !(await js(inv('vault:mgr-import'))).ok);
    await load('fireshox://passwords/');
    const imp = await js(inv('vault:mgr-import'));
    check('import CSV : 2 ajoutés, 3 ignorés', imp && imp.ok && imp.added === 2 && imp.updated === 0 && imp.skipped === 3);
    const l2 = await js(inv('vault:mgr-list'));
    const alice = l2.entries.find((x) => x.username === 'alice, la vraie');
    check('import CSV : virgules, guillemets et retour à la ligne lus', alice && alice.origin === 'https://exemple.test'
      && (await js(inv('vault:mgr-reveal', alice.id))) === 'mdp,avec "guillemets"\nsur 2 lignes');
    fs.rmSync(csv, { force: true });

    // 8) Fichier : chiffré, rien en clair.
    vault.flush();
    const raw = fs.readFileSync(path.join(PROFILE, 'passwords.json'), 'utf8');
    check('passwords.json ne contient aucun mot de passe en clair', ![SECRET, 'mdp-local', 'guillemets'].some((p) => raw.includes(p)));
    check('passwords.json contient bien un blob chiffré', /"pw":"[A-Za-z0-9+/=]{40,}"/.test(raw));
    const store = path.join(PROFILE, 'fireshox-data.json');
    check('fireshox-data.json ne contient pas le mot de passe', !fs.existsSync(store) || !fs.readFileSync(store, 'utf8').includes(SECRET));
    // 9) Chiffrement Windows indisponible : on refuse d'enregistrer (simulation).
    const ss = require('electron').safeStorage;
    let stubbed = false;
    try { ss.isEncryptionAvailable = () => false; stubbed = ss.isEncryptionAvailable() === false; } catch {}
    if (stubbed) {
      await load('fireshox://passwords/');
      const l3 = await js(inv('vault:mgr-list'));
      check('sans chiffrement : la page de gestion est prévenue', l3 && l3.available === false);
      const r3 = await js(inv('vault:mgr-add', { url: 'https://nouveau.test', username: 'x', password: 'y' }));
      check('sans chiffrement : ajout refusé', r3 && !r3.ok && r3.error === 'unavailable');
    } else console.log('(simulation « chiffrement indisponible » impossible : safeStorage non modifiable)');
  } catch (err) {
    console.log('ERREUR', err && err.stack);
    check('déroulé sans erreur', false);
  }
  const bad = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - bad}/${results.length} vérifications OK`);
  app.exit(bad ? 1 : 0);
});
