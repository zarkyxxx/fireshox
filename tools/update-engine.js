// Met le moteur de Fire Shox (Electron = Chromium + correctifs de sécurité) à la dernière version stable,
// puis, s'il a changé, monte la version de Fire Shox et publie (installateur + mise à jour automatique).
// Usage : npm run moteur            (vérifie, met à jour et publie)
//         npm run moteur -- --check (vérifie seulement)
'use strict';
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const cache = path.join(ROOT, '.cache');
const env = {
  ...process.env,
  ELECTRON_CACHE: path.join(cache, 'electron'),
  ELECTRON_BUILDER_CACHE: path.join(cache, 'electron-builder'),
  npm_config_cache: path.join(cache, 'npm'),
  TEMP: path.join(cache, 'tmp'),
  TMP: path.join(cache, 'tmp'),
};
const run = (cmd, args, capture) => {
  const r = spawnSync(cmd, args, { cwd: ROOT, env, shell: true, encoding: 'utf8', stdio: capture ? 'pipe' : 'inherit' });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} → code ${r.status}\n${r.stderr || ''}`);
  return (r.stdout || '').trim();
};

const current = require(path.join(ROOT, 'node_modules', 'electron', 'package.json')).version;
const latest = run('npm', ['view', 'electron@latest', 'version'], true);
console.log(`Moteur actuel : Electron ${current} · dernier stable : Electron ${latest}`);
if (current === latest) { console.log('Déjà à jour, rien à faire.'); process.exit(0); }
if (process.argv.includes('--check')) { console.log('Une mise à jour du moteur est disponible : lance « npm run moteur ».'); process.exit(0); }

console.log(`\n== Installation d'Electron ${latest}`);
run('npm', ['install', '--save-dev', `electron@${latest}`]);
run('node', ['node_modules/electron/install.js']);
const chrome = run('node', ['-e', '"console.log(require(\'electron/package.json\').version)"'], true);
console.log(`Electron installé : ${chrome}`);

const pkgFile = path.join(ROOT, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
const parts = pkg.version.split('.').map(Number);
parts[2] += 1;
pkg.version = parts.join('.');
fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + '\n');
console.log(`Fire Shox passe en ${pkg.version}`);

console.log('\n== Construction et publication');
run('node', ['tools/publish.js', '--notes', `"Fire Shox ${pkg.version} : moteur mis à jour (Electron ${latest}), derniers correctifs de sécurité de Chromium."`]);
