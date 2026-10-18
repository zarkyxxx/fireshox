# Fire Shox — cahier des charges commun (à lire avant de coder)

Fire Shox est un **vrai navigateur web** (Electron 44 = Chromium 14x) fait pour une grosse
blague entre potes. Identité : feu, orange/jaune sur fond très sombre, Nike Shox (baskets à
ressorts), et « le mec avec les Shox autour » = le logo (`assets/logo.png`, détouré, fond
transparent). L'utilisateur veut qu'on **abuse** de ce logo et du délire Shox partout.
Tout le texte est en **français**, ton drôle et bon enfant.

Projet : `F:\fireshox` (pas de git). Node 24, PowerShell 5.1 (pas de `&&` ; utiliser `;`).
Disque C: presque plein → ne rien écrire sur C: ; tout reste dans `F:\fireshox`.

## Architecture

- `src/main/` — processus principal (NE PAS MODIFIER sans demander au chef de projet).
- `src/ui/` — interface du navigateur (onglets…) — chef de projet.
- `src/pages/<site>/` — **les sites internes**, servis à l'adresse `fireshox://<site>/`.
  `fireshox://shoxbench/` → `src/pages/shoxbench/index.html`, `fireshox://shoxbench/app.js` → `src/pages/shoxbench/app.js`.
- Sur **n'importe quel** site interne, les chemins absolus `/shared/…` et `/assets/…` sont communs :
  - `/shared/base.css` — variables de couleur, polices (Outfit, Bungee, JetBrains Mono), boutons `.fs-btn`, `.fs-btn.fire`, panneau `.fs-panel`, emplacement d'image `.fs-slot`, texte `.fire-text`. **Lecture seule** : lis-le pour réutiliser les variables (`--bg`, `--surface`, `--fire-grad`, `--r-common/rare/epic/legend`…).
  - `/shared/fx.js` — `FX.store.get/set/onChange`, `FX.open(url,{background})`, `FX.sound(nom)`, `FX.burst(x,y,opts)`, `FX.toast(txt)`, `FX.rand/pick/sleep/fmt`. **Lecture seule** (si tu as besoin de plus, mets-le dans ton propre dossier).
  - `/assets/logo.png` (1024 px), `/assets/logo-512.png`, `logo-256`, `logo-128`, `logo-64`, `logo-32` (favicon).
- Scripts **classiques** (`<script src>`), pas de modules ES, pas de CDN, pas de dépendance npm à l'exécution : tout doit marcher hors ligne. Pas de framework.
- Chaque page : `<link rel="icon" href="/assets/logo-32.png">` et un `<title>` court (affiché dans l'onglet).

## Sauvegarde (survit à la fermeture du navigateur)

`FX.store.get(clé, défaut)` est **synchrone** ; `FX.store.set(clé, valeur)` écrit sur disque
(valeur JSON). Chaque site a son préfixe de clés et ne touche pas celles des autres :
`bench.*` (ShoxBench), `opening.*` (Shox Opening), `wiki.*`, `images.*`, `jeux.*`.
Clés partagées en **lecture** : `settings` (objet : `sound` false = sons coupés, `turbo` true = mode
TURBO activé depuis la barre d'adresse). Exception d'économie : tout site peut **ajouter** des
ShoxCoins via `opening.coins` (lire → ajouter → écrire).

## Tester et regarder son travail (obligatoire)

Lancer une page seule, la piloter et faire des captures :

```powershell
Set-Location F:\fireshox; & .\node_modules\electron\dist\electron.exe . --harness --profile=.cache/profile-<tonnom> --run=tools/steps/<tonfichier>.json
```

Fichier d'étapes (tableau JSON, exécuté dans l'ordre) :
`{"open": "fireshox://shoxbench/", "size": [1280, 800]}` (la 1re ouvre la fenêtre),
`{"wait": 800}`, `{"js": "code exécuté dans la page ; la valeur finale est affichée"}`,
`{"click": [x, y]}` (vrai clic souris), `{"key": "Enter"}`, `{"type": "texte"}`,
`{"shot": ".cache/shots/<tonnom>/01-accueil.png"}`, `{"quit": true}`.
Les erreurs JS de la page n'apparaissent pas seules : vérifie avec `{"js": "..."}` ou en
entourant ton code de try/catch qui écrit dans `document.title`. Regarde **toutes** tes
captures avec l'outil Read (images) et corrige ce qui est moche, déborde ou se chevauche.
Teste aussi en 1024×640 (petite fenêtre) et en 1600×900. Utilise un profil à toi
(`.cache/profile-<tonnom>`), jamais celui d'un autre agent.

## Images à venir

L'utilisateur fournira plus tard des images (générées avec ChatGPT ou des photos de potes).
Prévois des **emplacements** : chemins d'images définis dans un fichier de données
(`data.js` dans ton dossier), sous `assets/…` (voir ton brief), et un rendu de remplacement
joli (`.fs-slot` ou mieux) quand l'image n'existe pas encore (`img.onerror`). Le chef de
projet n'aura qu'à déposer les fichiers aux bons noms. Ne génère pas d'images toi-même.

## Contenu

- Grosse blague entre amis : humour absurde autour des Shox, du feu et du logo.
- Pas d'insulte, pas de contenu haineux ; ne rien inventer de méchant ou de faux sur des
  personnes réelles (les pages de potes restent des ébauches à remplir).
- Pas de vrais logos de marque dessinés ; pas de vraies personnalités politiques nommées.
- Qualité attendue : « niveau Chrome/Edge », fluide, animations soignées, pas de style
  « IA générique ». Responsive de 1024 px à 1920 px de large.

## À rendre

Quand tu as fini : liste des fichiers créés, clés de stockage utilisées, chemins d'images
attendus, captures finales (chemins), et ce qui reste à faire ou n'a pas pu être vérifié.
