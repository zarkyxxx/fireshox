// Publication de Fire Shox (remplace publish.ps1, qui se bloquait sous PowerShell 5.1) :
//   1. construit l'installateur Windows (dist/FireShox-Setup.exe)            — sauf --skip-build
//   2. pousse le code sur la branche main
//   3. crée (ou complète) la version GitHub v<version> : installateur + latest.yml (mises à jour auto)
//   4. avec --site : pousse le dossier site/ sur la branche gh-pages (GitHub Pages)
// Usage : node tools/publish.js [--skip-build] [--site] [--site-only] [--notes "texte"]
'use strict';
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const GH = 'F:\\unity\\LeVraiGoulot\\Tools\\gh\\bin\\gh.exe';
const REPO = 'zarkyxxx/fireshox';
const REMOTE = `https://github.com/${REPO}.git`;
const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const opt = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };

const cache = path.join(ROOT, '.cache');
const env = {
  ...process.env,
  ELECTRON_CACHE: path.join(cache, 'electron'),
  ELECTRON_BUILDER_CACHE: path.join(cache, 'electron-builder'),
  npm_config_cache: path.join(cache, 'npm'),
  TEMP: path.join(cache, 'tmp'),
  TMP: path.join(cache, 'tmp'),
  GIT_TERMINAL_PROMPT: '0',
  GCM_INTERACTIVE: 'never',
};
fs.mkdirSync(env.TEMP, { recursive: true });

function run(cmd, list, o = {}) {
  const r = spawnSync(cmd, list, { cwd: o.cwd || ROOT, env, stdio: o.capture ? 'pipe' : 'inherit', shell: !!o.shell, encoding: 'utf8' });
  if (r.status !== 0 && !o.allowFail) {
    throw new Error(`${cmd} ${list.join(' ')} → code ${r.status}${o.capture ? '\n' + (r.stderr || '') : ''}`);
  }
  return r;
}
const step = (t) => console.log(`\n== ${t}`);

const version = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
const tag = `v${version}`;
const token = run(GH, ['auth', 'token'], { capture: true }).stdout.trim();
const auth = `http.https://github.com/.extraheader=AUTHORIZATION: basic ${Buffer.from(`x-access-token:${token}`).toString('base64')}`;
const git = (list, o) => run('git', ['-c', 'credential.helper=', '-c', auth, '-c', 'core.autocrlf=false', ...list], o);

if (!flag('--site-only')) {
  if (!flag('--skip-build')) {
    step(`Construction de l'installateur ${tag}`);
    fs.rmSync(path.join(ROOT, 'dist'), { recursive: true, force: true });
    run('npx', ['electron-builder', '--win', 'nsis', '--publish', 'never'], { shell: true });
  }
  const files = ['dist/FireShox-Setup.exe', 'dist/FireShox-Setup.exe.blockmap', 'dist/latest.yml'];
  for (const f of files) if (!fs.existsSync(path.join(ROOT, f))) throw new Error(`Fichier manquant : ${f}`);
  const yml = fs.readFileSync(path.join(ROOT, 'dist/latest.yml'), 'utf8');
  if (!yml.includes(`version: ${version}`)) throw new Error(`latest.yml ne correspond pas à la version ${version}`);

  step('Code source → branche main');
  if (!fs.existsSync(path.join(ROOT, '.git'))) git(['init', '-b', 'main']);
  git(['add', '-A']);
  git(['-c', 'user.name=Fire Shox', '-c', 'user.email=fireshox@users.noreply.github.com', 'commit', '-q', '-m', `Fire Shox ${version}`], { allowFail: true });
  git(['push', '-q', REMOTE, 'HEAD:main']);

  step(`Version GitHub ${tag}`);
  const exists = run(GH, ['release', 'view', tag, '--repo', REPO], { capture: true, allowFail: true }).status === 0;
  if (exists) run(GH, ['release', 'upload', tag, ...files, '--repo', REPO, '--clobber']);
  else {
    const notes = opt('--notes') || `Fire Shox ${version} — télécharger FireShox-Setup.exe ci-dessous.`;
    run(GH, ['release', 'create', tag, ...files, '--repo', REPO, '--title', `Fire Shox ${version}`, '--notes', notes, '--latest']);
  }
}

if (flag('--site') || flag('--site-only')) {
  step('Site public → branche gh-pages');
  const tmp = path.join(cache, 'gh-pages');
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.cpSync(path.join(ROOT, 'site'), tmp, { recursive: true });
  fs.writeFileSync(path.join(tmp, '.nojekyll'), '');
  git(['init', '-q', '-b', 'gh-pages'], { cwd: tmp });
  git(['add', '-A'], { cwd: tmp });
  git(['-c', 'user.name=Fire Shox', '-c', 'user.email=fireshox@users.noreply.github.com', 'commit', '-q', '-m', `Site Fire Shox ${version}`], { cwd: tmp });
  git(['push', '-q', '-f', REMOTE, 'gh-pages'], { cwd: tmp });
  const pages = run(GH, ['api', `repos/${REPO}/pages`], { capture: true, allowFail: true });
  if (pages.status !== 0) run(GH, ['api', '-X', 'POST', `repos/${REPO}/pages`, '-f', 'source[branch]=gh-pages', '-f', 'source[path]=/']);
}

console.log(`\n== Terminé : https://zarkyxxx.github.io/fireshox/  —  https://github.com/${REPO}/releases/tag/${tag}`);
