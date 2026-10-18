# 🔥 Fire Shox

**L'amorti gravitationnel au service de votre navigation web. 100 % incandescent.**

Fire Shox est un vrai navigateur web (moteur Chromium, via Electron) fait pour une grosse
blague entre potes : onglets, favoris, historique, téléchargements, mises à jour
automatiques… et des sites maison :

| Dossier | Adresse | Ce que c'est |
| --- | --- | --- |
| Accueil | `fireshox://home` | Le logo géant (masquable), le Turbo Shox, la recherche SHOXBOOST |
| Shox Opening | `fireshox://opening` | Boosters Squid Shox, Fire Shox et LFI Shox, 8 cartes, légendaires à 5 % |
| ShoxBench | `fireshox://shoxbench` | Test de débit en **shox/s** + le Shoxomètre politique, avec classements sauvegardés |
| Wiki Shox | `fireshox://wiki` | L'encyclopédie incandescente |
| Images de Monsieur Claude | `fireshox://images` | La galerie nationale |
| Jeux vidéo | `fireshox://jeux` | Débloqués plus tard par les cartes QR |

## Télécharger

👉 **https://zarkyxxx.github.io/fireshox/** — ou directement
[FireShox-Setup.exe](https://github.com/zarkyxxx/fireshox/releases/latest/download/FireShox-Setup.exe) (Windows 10/11, 64 bits).

Windows peut afficher « Windows a protégé votre ordinateur » (l'appli n'est pas signée) :
cliquer sur **Informations complémentaires** puis **Exécuter quand même**.

## Développer

```bash
npm install
node node_modules/electron/install.js   # si electron.exe manque (npm 12 bloque les scripts)
npm start
```

- `src/main/` — processus principal (fenêtres, protocole `fireshox://`, téléchargements, autorisations, mises à jour)
- `src/ui/` — interface du navigateur (onglets, barre d'adresse, menus)
- `src/pages/<site>/` — sites internes, servis à `fireshox://<site>/`
- `assets/` — logo, icônes, et les images (cartes, photos) à déposer
- `site/` — le site public de téléchargement (GitHub Pages)
- `docs/BRIEF.md` — conventions communes et outil de test/capture

Construire l'installateur : `npm run dist` → `dist/FireShox-Setup.exe`.

---
Projet fun entre amis, aucune affiliation avec Nike ni personne.
