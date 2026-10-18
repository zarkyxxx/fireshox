# Shox Opening — images à faire avec ChatGPT (par priorité)

Le site `fireshox://opening/` marche déjà sans ces images : chaque carte a un rendu de
remplacement. Dès qu'un fichier est déposé au bon endroit avec le bon nom, il remplace le rendu
(recharger la page suffit). Rien à modifier dans le code.

Les cartes faites à partir de **tes memes** (`assets/memes/`) n'ont besoin de rien : elles sont
déjà en place. Cette liste ne contient que ce qui manque encore.

## Comment faire

1. Copie un prompt dans ChatGPT (un prompt = une image).
2. Pour les images marquées **📎 joindre le logo**, joins aussi `F:\fireshox\assets\logo.png` dans le
   même message : c'est la référence pour le visage du Y.
3. Télécharge en **PNG**, renomme exactement comme indiqué, range dans le bon dossier (crée-le
   s'il n'existe pas). Chemins à partir de `F:\fireshox\` :
   - dos de carte : `assets\cards\back.png`
   - faces des paquets : `assets\cards\boosters\<booster>.png`
   - cartes : `assets\cards\<booster>\<id>.png` (booster = `squid`, `fire` ou `lfi`)
4. Format : **portrait 2:3, 1024 × 1536**.

Déjà écrit dans chaque prompt : pas de texte, pas de lettres ni de chiffres, pas de logo de marque,
pas de cadre (le site ajoute le cadre, le nom, la rareté et les stats). Le **bas de l'image (40 %)
est recouvert par le texte de la carte** : le sujet doit être dans le haut et le milieu.

Si ChatGPT refuse ou ajoute du texte, relance avec « même chose, mais sans aucun texte ni logo ».

---

## Priorité 1 — dos de carte et faces des 3 paquets

### `assets/cards/back.png` — dos de toutes les cartes
```
Illustration pour le dos d'une carte à collectionner, format portrait 2:3 (1024×1536), image plein cadre sans bordure. Motif parfaitement symétrique : au centre un grand anneau de flammes orange et jaunes qui tourbillonne autour d'un disque sombre, entouré de baskets de running noires à semelle à ressorts (quatre colonnes cylindriques chromées sous le talon) qui orbitent dans le feu. Fond noir profond avec un fin motif de losanges orange très discret et des braises qui flottent. Style illustration numérique premium, très contrasté, éclairage chaud. Aucun texte, aucune lettre, aucun chiffre, aucun logo de marque.
```

### `assets/cards/boosters/squid.png` — paquet Squid Shox
```
Illustration pour la face avant d'un sachet de cartes à collectionner (seulement l'illustration imprimée, pas le sachet), format portrait 2:3 (1024×1536), plein cadre. Univers d'une série de jeu de survie coréenne fictive : fond rose fuchsia lumineux, trois grands symboles géométriques blancs en néon (un cercle, un triangle, un carré) alignés dans le tiers supérieur, et au centre une paire de baskets de running vert sarcelle à colonnes de ressorts chromées, posée comme un trophée sous un projecteur. Petits pois vert sarcelle en fond. Le tiers inférieur reste plus sombre et uni (un titre sera ajouté par-dessus). Style affiche cinématographique, néon, très contrasté. Aucun texte, aucune lettre, aucun chiffre, aucun logo de marque.
```

### `assets/cards/boosters/fire.png` — paquet Fire Shox — 📎 joindre le logo
```
Illustration pour la face avant d'un sachet de cartes à collectionner (seulement l'illustration imprimée, pas le sachet), format portrait 2:3 (1024×1536), plein cadre. Reprends l'image jointe comme référence : l'homme de profil au chignon bouclé, avec écouteurs filaires blancs et sweat noir, au centre d'une tornade de flammes orange et jaunes où tourbillonnent des baskets de running noires à semelle à ressorts (quatre colonnes cylindriques chromées sous le talon). Placé dans la moitié haute de l'image, braises et étincelles partout, fond rouge sombre presque noir. Le tiers inférieur reste plus sombre (un titre sera ajouté par-dessus). Style illustration numérique épique, très contrasté. Aucun texte, aucune lettre, aucun chiffre, aucun logo de marque (pas de virgule de marque sur les chaussures).
```

### `assets/cards/boosters/lfi.png` — paquet LFI Shox (Mélenchon et Manon Aubry, en caricature)
```
Illustration pour la face avant d'un sachet de cartes à collectionner (seulement l'illustration imprimée, pas le sachet), format portrait 2:3 (1024×1536), plein cadre. Rendu photoréaliste cinématographique, même qualité que les autres paquets (éclairage dramatique, grain fin, profondeur de champ). Image parodique et absurde : Jean-Luc Mélenchon et Manon Aubry, souriants et pleins d'énergie, sur une scène de meeting, en plein saut au-dessus de l'estrade grâce à des baskets noires à colonnes de ressorts chromées sous le talon qui brillent et laissent des étincelles orange. Mélenchon tient un mégaphone rouge, Manon Aubry lève le poing. Derrière eux : projecteurs rouges, fumigènes rouges, confettis qui tombent, foule floue en contre-jour, quelques baskets à ressorts en flammes qui volent dans les airs. Les deux personnages occupent les deux tiers supérieurs ; le tiers inférieur est plus sombre et uni (un titre sera ajouté par-dessus). Palette rouge vif, bordeaux, touches orange feu. Ton bon enfant, aucune moquerie méchante. Aucun texte, aucune lettre, aucun chiffre, aucun logo de marque ni de parti.
```
Si ChatGPT refuse les vraies personnalités : envoyer deux photos d'eux, le montage sera fait à la main.

### `assets/cards/boosters/squid.png` — image fournie par l'utilisateur
L'utilisateur fournit sa propre image pour le paquet Squid Shox (le prompt ci-dessus reste une option).

---

## Priorité 2 — les cartes du Y (Légendaires et Épique) — 📎 joindre le logo

### `assets/cards/fire/le-y.png` — Le Y, forme incandescente (Légendaire)
```
Illustration de carte à collectionner légendaire, format portrait 2:3 (1024×1536), plein cadre, sans bordure. Reprends fidèlement l'image jointe comme référence : l'homme de profil au chignon bouclé, écouteurs filaires blancs, sweat noir, souriant, au centre d'un vortex de flammes orange et jaunes où tourbillonnent des baskets de running noires à colonnes de ressorts chromées. Version encore plus épique : rayons de lumière dorée, étincelles, aura incandescente, fond noir. Personnage centré dans la moitié haute, bas sombre. Aucun texte, aucune lettre, aucun chiffre, aucun logo de marque (pas de virgule de marque sur les chaussures).
```

### `assets/cards/lfi/le-y-megaphone.png` — Le Y au Mégaphone (Légendaire)
```
Illustration de carte à collectionner légendaire, format portrait 2:3 (1024×1536), plein cadre, sans bordure. Style affiche militante rétro en sérigraphie, rayons rouges en soleil, palette rouge vif, crème, bordeaux et touches de flammes orange. Reprends l'homme de l'image jointe comme référence (même visage, chignon bouclé, écouteurs filaires blancs, sweat noir) : il est debout sur une caisse, un mégaphone rouge à la main, souriant et charismatique, des baskets noires à colonnes de ressorts aux pieds ; autour de lui, des baskets à ressorts en flammes tourbillonnent comme dans l'image jointe. Héroïque et bon enfant. Personnage centré dans la moitié haute, bas sombre. Aucun texte, aucune lettre, aucun chiffre, aucun logo, aucun symbole de parti réel.
```

### `assets/cards/fire/chignon.png` — Le Chignon du Y (Épique)
```
Illustration de carte à collectionner, format portrait 2:3 (1024×1536), plein cadre, sans bordure. Reprends l'homme de l'image jointe comme référence (même visage de profil, chignon bouclé, écouteurs filaires blancs, sweat noir) : portrait épaules, son chignon s'embrase en une flamme élégante comme une couronne de feu, regard serein et confiant, étincelles autour, une basket noire à colonnes de ressorts en flammes passe en orbite derrière sa tête. Fond noir et rouge sombre, lumière orange. Style illustration numérique épique, flatteur. Visage centré dans la moitié haute, bas sombre. Aucun texte, aucune lettre, aucun chiffre, aucun logo de marque.
```

---

## Priorité 3 — cartes Shox du booster Fire

Style commun : illustration numérique épique, feu et braises, orange / jaune / rouge sur fond presque
noir, baskets noires à colonnes de ressorts chromées (jamais de logo).

### `assets/cards/fire/dragon.png` — Le Dragon Shox (Légendaire)
```
Illustration de carte à collectionner légendaire, format portrait 2:3 (1024×1536), plein cadre, sans bordure. Un dragon noir et orange immense, écailles comme de la gomme de semelle, enroulé autour d'une montagne de boîtes à chaussures dans un entrepôt en feu ; au lieu de feu il crache des ressorts chromés chauffés à blanc, et ses pattes sont chaussées de baskets à colonnes de ressorts. Lumière dorée, braises, ambiance épique. Dragon centré dans la moitié haute, bas sombre. Aucun texte, aucune lettre, aucun chiffre, aucun logo de marque.
```

### `assets/cards/fire/tornade.png` — La Tornade de Shox (Épique)
```
Illustration de carte à collectionner, format portrait 2:3 (1024×1536), plein cadre, sans bordure. Une tornade de feu orange et jaune qui tourbillonne, avec six paires de baskets noires à colonnes de ressorts chromées en orbite dans les flammes, débris et braises, ciel noir. Style illustration numérique épique, mouvement spectaculaire. Centré dans la moitié haute, bas sombre. Aucun texte, aucune lettre, aucun chiffre, aucun logo de marque.
```

### `assets/cards/fire/phenix.png` — Shox Phénix (Rare)
```
Illustration de carte à collectionner, format portrait 2:3 (1024×1536), plein cadre, sans bordure. Un phénix de feu majestueux, ailes déployées, dont le corps a la forme d'une basket de running noire à colonnes de ressorts, renaissant d'un tas de cendres. Flammes orange, jaunes et rouges, fond noir. Style illustration numérique épique. Centré dans la moitié haute, bas sombre. Aucun texte, aucune lettre, aucun chiffre, aucun logo de marque.
```

### `assets/cards/fire/ecouteurs.png` — Les Écouteurs du Y (Rare)
```
Illustration de carte à collectionner, format portrait 2:3 (1024×1536), plein cadre, sans bordure. Une paire d'écouteurs filaires blancs qui flotte comme une relique sacrée, le fil formant une spirale qui s'enroule autour d'une basket noire à colonnes de ressorts, entourée d'ondes sonores en flammes orange et d'étincelles, fond noir. Style illustration numérique épique. Centré dans la moitié haute, bas sombre. Aucun texte, aucune lettre, aucun chiffre, aucun logo de marque.
```

### `assets/cards/fire/lacet.png` — Lacet Incandescent (Commune)
```
Illustration de carte à collectionner, format portrait 2:3 (1024×1536), plein cadre, sans bordure. Gros plan sur un lacet de basket qui brûle doucement comme une mèche, flammes orange et étincelles, noué sur une basket noire à semelle à ressorts, fond presque noir avec braises flottantes. Style illustration numérique épique, très contrasté. Sujet centré dans la moitié haute, bas sombre. Aucun texte, aucune lettre, aucun chiffre, aucun logo de marque.
```

### `assets/cards/fire/semelle.png` — Semelle Braise (Commune)
```
Illustration de carte à collectionner, format portrait 2:3 (1024×1536), plein cadre, sans bordure. Une semelle de basket vue de côté, faite de charbon incandescent avec des fissures orange lumineuses, quatre colonnes de ressorts chromées sous le talon, posée sur un parquet qui fume. Fond sombre, braises. Style illustration numérique épique. Centré dans la moitié haute, bas sombre. Aucun texte, aucune lettre, aucun chiffre, aucun logo de marque.
```

### `assets/cards/fire/ressort.png` — Ressort Chauffé (Commune)
```
Illustration de carte à collectionner, format portrait 2:3 (1024×1536), plein cadre, sans bordure. Un gros ressort de basket à colonnes chauffé à blanc qui flotte dans le vide, dégradé du blanc au rouge, entouré d'étincelles et de chaleur qui fait onduler l'air, fond noir. Style rendu 3D réaliste et épique. Centré dans la moitié haute, bas sombre. Aucun texte, aucune lettre, aucun chiffre, aucun logo de marque.
```

### `assets/cards/fire/chaussette.png` — Chaussette Ignifugée (Commune)
```
Illustration de carte à collectionner, format portrait 2:3 (1024×1536), plein cadre, sans bordure. Une chaussette de sport blanche héroïque, avec une petite cape, debout fièrement au milieu des flammes à côté d'une basket noire à ressorts, sans brûler, éclairage orange dramatique, braises. Ton humoristique et épique. Centré dans la moitié haute, bas sombre. Aucun texte, aucune lettre, aucun chiffre, aucun logo de marque.
```

### `assets/cards/fire/boite.png` — Boîte Fumante (Commune)
```
Illustration de carte à collectionner, format portrait 2:3 (1024×1536), plein cadre, sans bordure. Une boîte à chaussures en carton noir entrouverte d'où s'échappent fumée et lueur orange intense, on devine à l'intérieur une basket noire à colonnes de ressorts incandescentes, posée sur un sol sombre parsemé de braises. Style illustration numérique épique. Centré dans la moitié haute, bas sombre. Aucun texte, aucune lettre, aucun chiffre, aucun logo de marque.
```

---

## Priorité 4 — cartes Shox du booster Squid

Style commun : série de jeu de survie coréenne **fictive**, décor géométrique, rose fuchsia + vert
sarcelle + noir, symboles cercle/triangle/carré, néon.

### `assets/cards/squid/shox-feu-vert.png` — La Shox Feu Vert (Rare)
```
Illustration de carte à collectionner, format portrait 2:3 (1024×1536), plein cadre, sans bordure. Une basket de running vert sarcelle à colonnes de ressorts chromées, figée en plein bond au-dessus d'un grand terrain de sable, avec derrière elle un énorme feu tricolore stylisé allumé au vert. Ambiance de jeu de survie coréen fictif, palette rose fuchsia, vert sarcelle et noir, éclairage néon. Sujet centré dans la moitié haute, bas sombre. Aucun texte, aucune lettre, aucun chiffre, aucun logo de marque.
```

### `assets/cards/squid/shox-vertes-456.png` — Shox Vertes 456 (Commune)
```
Illustration de carte à collectionner, format portrait 2:3 (1024×1536), plein cadre, sans bordure. Une paire de baskets de running vert sarcelle à colonnes de ressorts chromées, posée seule au milieu d'un dortoir géant aux lits superposés pastel, sous un projecteur. Palette rose fuchsia, vert sarcelle et noir, ambiance de jeu de survie coréen fictif. Sujet centré dans la moitié haute, bas sombre. Aucun texte, aucune lettre, aucun chiffre, aucun logo de marque.
```

### `assets/cards/squid/lacets-symboles.png` — Lacets ○△□ (Commune)
```
Illustration de carte à collectionner, format portrait 2:3 (1024×1536), plein cadre, sans bordure. Gros plan sur une basket rose fuchsia à colonnes de ressorts dont les lacets forment trois nœuds en forme de cercle, de triangle et de carré, lumière néon rose et vert sarcelle, fond sombre géométrique. Sujet centré dans la moitié haute, bas sombre. Aucun texte, aucune lettre, aucun chiffre, aucun logo de marque.
```

### `assets/cards/squid/joueur-218.png` — Joueur 218, a oublié ses Shox (Commune)
```
Illustration de carte à collectionner, format portrait 2:3 (1024×1536), plein cadre, sans bordure. Univers d'un jeu de survie coréen fictif, palette rose fuchsia, vert sarcelle et noir, néon. Un candidat maladroit en survêtement vert sarcelle (dossard vierge, sans chiffre) qui marche en chaussettes sur un terrain de sable, l'air gêné, pendant que sa paire de baskets à colonnes de ressorts est restée derrière lui dans un casier. Ton humoristique. Sujet centré dans la moitié haute, bas sombre. Aucun texte, aucune lettre, aucun chiffre, aucun logo de marque.
```

---

## Priorité 5 — cartes Shox du booster LFI

Style commun : affiche militante rétro (sérigraphie, rayons rouges en soleil), rouge vif / crème /
bordeaux, festif et bon enfant. Personnages fictifs, aucun symbole de parti réel.

### `assets/cards/lfi/shox-insoumises.png` — Les Shox Insoumises (Épique)
```
Illustration de carte à collectionner, format portrait 2:3 (1024×1536), plein cadre, sans bordure. Style affiche militante rétro en sérigraphie, fond de rayons rouges en soleil. Une paire de baskets rouges à colonnes de ressorts chromées, dressées fièrement comme des héroïnes, lacets dénoués qui flottent au vent comme des drapeaux, confettis. Palette rouge vif, crème, bordeaux. Centré dans la moitié haute, bas sombre. Aucun texte, aucune lettre, aucun chiffre, aucun logo, aucun symbole de parti réel.
```

### `assets/cards/lfi/blocus.png` — Le Blocus en Shox (Rare)
```
Illustration de carte à collectionner, format portrait 2:3 (1024×1536), plein cadre, sans bordure. Style affiche rétro en sérigraphie, palette rouge vif, crème et bordeaux. Devant le portail d'un lycée fictif bloqué par des barrières et des poubelles, une rangée de baskets à colonnes de ressorts de toutes les couleurs alignées comme une barricade, lycéens fictifs joyeux en arrière-plan. Ambiance festive et bon enfant. Centré dans la moitié haute, bas sombre. Aucun texte, aucune lettre, aucun chiffre, aucun logo, aucune personnalité réelle.
```

### `assets/cards/lfi/militant.png` — Militant en Shox (Commune)
```
Illustration de carte à collectionner, format portrait 2:3 (1024×1536), plein cadre, sans bordure. Style affiche militante rétro en sérigraphie, fond de rayons rouges en soleil, palette rouge vif, crème et bordeaux. Un manifestant fictif souriant, écharpe rouge, qui marche d'un pas décidé avec des baskets à colonnes de ressorts qui le font rebondir très haut à chaque pas. Ambiance festive et bon enfant. Centré dans la moitié haute, bas sombre. Aucun texte, aucune lettre, aucun chiffre, aucun logo, aucune personnalité réelle.
```

### `assets/cards/lfi/semelle-revolutionnaire.png` — Semelle Révolutionnaire (Commune)
```
Illustration de carte à collectionner, format portrait 2:3 (1024×1536), plein cadre, sans bordure. Style affiche rétro en sérigraphie, rayons rouges en soleil. Une semelle de basket rouge à quatre colonnes de ressorts chromées, levée vers le ciel comme un poing, sur fond de rayons rouge et crème. Palette rouge vif, crème, bordeaux. Centré dans la moitié haute, bas sombre. Aucun texte, aucune lettre, aucun chiffre, aucun logo.
```

---

## Pas de prompt : image à fournir par toi

- `assets/cards/lfi/ott-micro.png` — **.OTT au Micro** (Légendaire) : la vraie photo de .OTT au
  micro pendant le blocus du lycée. Portrait de préférence ; si l'image est en paysage, dépose-la
  quand même et préviens pour qu'on règle le cadrage dans `data.js`.

## Ajouter un nouveau meme

Dépose l'image dans `assets/memes/` puis ajoute une ligne dans `src/pages/opening/data.js`
(mode d'emploi en haut du fichier). Aucune image ChatGPT n'est nécessaire pour ces cartes-là.
