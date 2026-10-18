# Shox Opening — prompts ChatGPT pour les illustrations

Le site `fireshox://opening/` marche déjà sans aucune image : chaque carte a un rendu de
remplacement. Dès qu'un fichier est déposé au bon endroit avec le bon nom, il remplace le rendu
de remplacement (il suffit de recharger la page). Rien à modifier dans le code.

## Comment faire

1. Copie un prompt ci-dessous dans ChatGPT (un prompt = une image).
2. Pour les cartes marquées **📎 joindre le logo**, joins aussi l'image `F:\fireshox\assets\logo.png`
   dans le même message (c'est la référence pour le visage du mec).
3. Télécharge l'image en **PNG**, renomme-la exactement comme indiqué et range-la dans le bon
   dossier (crée les dossiers s'ils n'existent pas) :
   - cartes : `F:\fireshox\assets\cards\<booster>\<id>.png` (booster = `squid`, `fire` ou `lfi`)
   - faces des paquets : `F:\fireshox\assets\cards\boosters\<booster>.png`
   - dos de carte : `F:\fireshox\assets\cards\back.png`
4. Format conseillé : **portrait 2:3, 1024 × 1536**.

Règles communes déjà écrites dans chaque prompt : pas de texte, pas de lettres ni de chiffres,
pas de logo de marque, pas de cadre de carte (le cadre, le nom, la rareté et les stats sont
ajoutés par le site). Le **bas de l'image (40 %) est recouvert par le texte de la carte** : le
sujet doit être centré dans le haut et le milieu de l'image.

Si ChatGPT refuse ou fait n'importe quoi, relance avec « même chose, mais sans aucun texte ni logo ».

---

## Dos de carte et paquets

### `assets/cards/back.png` — dos de toutes les cartes
```
Illustration pour le dos d'une carte à collectionner, format portrait 2:3 (1024×1536), image plein cadre sans bordure. Motif parfaitement symétrique : au centre un grand anneau de flammes orange et jaunes qui tourbillonne autour d'un disque sombre, entouré de baskets de running noires à semelle à ressorts (quatre colonnes cylindriques chromées sous le talon) qui orbitent dans le feu. Fond noir profond avec un fin motif de losanges orange très discret et des braises qui flottent. Style illustration numérique premium, très contrasté, éclairage chaud. Aucun texte, aucune lettre, aucun chiffre, aucun logo de marque.
```

### `assets/cards/boosters/squid.png` — face du paquet Squid Shox
```
Illustration pour la face avant d'un sachet de cartes à collectionner (seulement l'illustration imprimée, pas le sachet), format portrait 2:3 (1024×1536), plein cadre. Univers d'une série de jeu de survie coréenne fictive : fond rose fuchsia lumineux, trois grands symboles géométriques blancs en néon (un cercle, un triangle, un carré) alignés dans le tiers supérieur, silhouettes de gardes en combinaison rose et masque noir en arrière-plan, petits pois vert sarcelle, une basket noire à colonnes de ressorts chromées posée comme un trophée. Le tiers inférieur reste plus sombre et uni (un titre sera ajouté par-dessus). Style affiche cinématographique, néon, très contrasté. Aucun texte, aucune lettre, aucun chiffre, aucun logo de marque.
```

### `assets/cards/boosters/fire.png` — face du paquet Fire Shox — 📎 joindre le logo
```
Illustration pour la face avant d'un sachet de cartes à collectionner (seulement l'illustration imprimée, pas le sachet), format portrait 2:3 (1024×1536), plein cadre. Reprends l'image jointe comme référence : l'homme de profil au chignon bouclé, avec écouteurs filaires blancs et sweat noir, au centre d'une tornade de flammes orange et jaunes où tourbillonnent des baskets de running noires à semelle à ressorts (quatre colonnes cylindriques chromées sous le talon). Placé dans la moitié haute de l'image, braises et étincelles partout, fond rouge sombre presque noir. Le tiers inférieur reste plus sombre (un titre sera ajouté par-dessus). Style illustration numérique épique, très contrasté. Aucun texte, aucune lettre, aucun chiffre, aucun logo de marque (pas de virgule de marque sur les chaussures).
```

### `assets/cards/boosters/lfi.png` — face du paquet LFI Shox
```
Illustration pour la face avant d'un sachet de cartes à collectionner (seulement l'illustration imprimée, pas le sachet), format portrait 2:3 (1024×1536), plein cadre. Style affiche militante rétro en sérigraphie : grand soleil de rayons rouges et rouge vif qui partent du centre, un gros mégaphone crème et rouge incliné dans le tiers supérieur, une foule joyeuse et fictive en baskets à semelle à ressorts qui défile en bas, banderoles et drapeaux rouges vierges, confettis. Ambiance festive et bon enfant. Le tiers inférieur reste plus sombre et uni (un titre sera ajouté par-dessus). Palette rouge, crème, bordeaux. Aucun texte, aucune lettre, aucun chiffre, aucun logo, aucun symbole de parti réel, aucune personnalité réelle.
```

---

## Booster Squid Shox — dossier `assets/cards/squid/`

Style commun (déjà inclus dans chaque prompt) : série de jeu de survie coréenne **fictive**, décor
géométrique, rose fuchsia + vert sarcelle + noir, symboles cercle/triangle/carré, néon.

### `squid/joueur-218.png` — Joueur 218 (Commune)
```
Illustration de carte à collectionner, format portrait 2:3 (1024×1536), plein cadre, sans bordure. Univers d'une série de jeu de survie coréenne fictive, décor géométrique pastel, palette rose fuchsia, vert sarcelle et noir, éclairage néon. Sujet : un candidat maladroit en survêtement vert sarcelle (dossard vierge, sans chiffre) qui marche en chaussettes sur un sol de terrain de jeu, l'air gêné, ses baskets à ressorts oubliées derrière lui. Sujet centré dans la moitié haute, bas de l'image sombre et calme. Ton humoristique. Aucun texte, aucune lettre, aucun chiffre, aucun logo de marque.
```

### `squid/garde-rond.png` — Garde Rond (Commune)
```
Illustration de carte à collectionner, format portrait 2:3 (1024×1536), plein cadre, sans bordure. Univers d'une série de jeu de survie coréenne fictive, palette rose fuchsia, vert sarcelle et noir, néon. Sujet : un garde en combinaison rose à capuche avec un masque noir brillant orné d'un cercle blanc, qui fait discrètement un petit saut dans un couloir géométrique coloré, il porte des baskets noires à colonnes de ressorts. Plan taille, centré dans la moitié haute, bas de l'image sombre. Ton humoristique. Aucun texte, aucune lettre, aucun chiffre, aucun logo de marque.
```

### `squid/garde-triangle.png` — Garde Triangle (Commune)
```
Illustration de carte à collectionner, format portrait 2:3 (1024×1536), plein cadre, sans bordure. Univers d'une série de jeu de survie coréenne fictive, palette rose fuchsia, vert sarcelle et noir, néon. Sujet : un garde en combinaison rose à capuche, masque noir orné d'un triangle blanc, caché dans l'angle d'un escalier labyrinthique pastel façon Escher, prêt à rebondir sur ses baskets à ressorts. Centré dans la moitié haute, bas sombre. Aucun texte, aucune lettre, aucun chiffre, aucun logo de marque.
```

### `squid/dalgona.png` — Biscuit Dalgona (Commune)
```
Illustration de carte à collectionner, format portrait 2:3 (1024×1536), plein cadre, sans bordure. Gros plan sur un biscuit au caramel rond et doré posé dans une boîte en métal, avec une silhouette de basket gravée au centre, une aiguille à côté et une fissure qui menace. Fond rose fuchsia et vert sarcelle flou, lumière dramatique, tension comique. Objet centré dans la moitié haute, bas de l'image sombre. Aucun texte, aucune lettre, aucun chiffre, aucun logo de marque.
```

### `squid/billes.png` — Billes à Ressorts (Commune)
```
Illustration de carte à collectionner, format portrait 2:3 (1024×1536), plein cadre, sans bordure. Ruelle de village coréen rétro en décor de studio pastel, des billes de verre multicolores munies de petits ressorts chromés qui rebondissent jusqu'au plafond, traînées de mouvement. Palette rose fuchsia, vert sarcelle, crème, éclairage néon. Sujet centré dans la moitié haute, bas sombre. Aucun texte, aucune lettre, aucun chiffre, aucun logo de marque.
```

### `squid/garde-carre.png` — Garde Carré, chef d'équipe (Rare)
```
Illustration de carte à collectionner, format portrait 2:3 (1024×1536), plein cadre, sans bordure. Univers d'une série de jeu de survie coréenne fictive, palette rose fuchsia, vert sarcelle et noir, néon. Sujet : un chef des gardes imposant en combinaison rose, masque noir orné d'un carré blanc, un mégaphone noir à la main, posture autoritaire, contre-plongée, baskets noires à colonnes de ressorts bien visibles. Centré dans la moitié haute, bas sombre. Aucun texte, aucune lettre, aucun chiffre, aucun logo de marque.
```

### `squid/poupee.png` — La Poupée Géante (Rare)
```
Illustration de carte à collectionner, format portrait 2:3 (1024×1536), plein cadre, sans bordure. Une poupée géante fictive en robe orange et chemisier jaune, couettes noires, debout au fond d'un grand terrain de sable sous un ciel peint, ses yeux qui brillent en rouge ; au premier plan des candidats en survêtement vert figés en plein saut sur leurs baskets à ressorts. Ambiance tendue et drôle, couleurs saturées. Poupée centrée dans la moitié haute, bas sombre. Aucun texte, aucune lettre, aucun chiffre, aucun logo de marque.
```

### `squid/pont-de-verre.png` — Pont de Verre (Rare)
```
Illustration de carte à collectionner, format portrait 2:3 (1024×1536), plein cadre, sans bordure. Un pont de dalles de verre suspendu au-dessus du vide dans un hangar sombre, certaines dalles sont des trampolines qui projettent un candidat en survêtement vert vers le haut, éclairage néon rose et vert sarcelle, vertige spectaculaire. Sujet centré dans la moitié haute, bas sombre. Aucun texte, aucune lettre, aucun chiffre, aucun logo de marque.
```

### `squid/recruteur.png` — Le Recruteur (Épique)
```
Illustration de carte à collectionner, format portrait 2:3 (1024×1536), plein cadre, sans bordure. Un homme élégant et mystérieux en costume sombre, sourire en coin, debout dans un quai de métro désert, il tend une carte de jeu vierge et tient de l'autre main une basket noire à colonnes de ressorts comme un défi. Éclairage néon fuchsia et vert sarcelle, style cinéma coréen. Personnage fictif. Centré dans la moitié haute, bas sombre. Aucun texte, aucune lettre, aucun chiffre, aucun logo de marque.
```

### `squid/maitre-du-jeu.png` — Le Maître du Jeu (Épique)
```
Illustration de carte à collectionner, format portrait 2:3 (1024×1536), plein cadre, sans bordure. Un personnage masqué fictif au masque noir géométrique anguleux, manteau noir, assis dans un fauteuil en cuir dans une loge sombre remplie d'écrans de surveillance roses et verts, il tient un verre et porte des baskets noires à ressorts chromés posées sur un pouf. Ambiance luxueuse et inquiétante mais drôle. Centré dans la moitié haute, bas sombre. Aucun texte, aucune lettre, aucun chiffre, aucun logo de marque.
```

### `squid/tirelire.png` — La Tirelire Géante (Légendaire)
```
Illustration de carte à collectionner légendaire, format portrait 2:3 (1024×1536), plein cadre, sans bordure. Une immense tirelire en forme de cochon en verre suspendue au plafond d'un dortoir géant, remplie de pièces d'or brillantes qui débordent, rayons de lumière dorée, des candidats en survêtement vert minuscules en dessous qui lèvent les yeux. Palette or, rose fuchsia, vert sarcelle, ambiance épique. Tirelire centrée dans la moitié haute, bas sombre. Aucun texte, aucune lettre, aucun chiffre, aucun logo de marque.
```

### `squid/joueur-001.png` — Joueur 001, le Mec aux Shox (Légendaire, la plus rare) — 📎 joindre le logo
```
Illustration de carte à collectionner légendaire, format portrait 2:3 (1024×1536), plein cadre, sans bordure. Reprends l'homme de l'image jointe comme référence (même visage, chignon bouclé, écouteurs filaires blancs) : il porte un survêtement vert sarcelle de candidat (dossard vierge), sourire confiant, et bondit au-dessus d'un terrain de jeu géométrique sur des baskets noires à colonnes de ressorts chromées en feu. Derrière lui, des gardes en combinaison rose médusés et un grand cercle de flammes orange. Palette rose fuchsia, vert sarcelle, orange feu. Héroïque et drôle. Personnage centré dans la moitié haute, bas sombre. Aucun texte, aucune lettre, aucun chiffre, aucun logo de marque.
```

---

## Booster Fire Shox — dossier `assets/cards/fire/`

Style commun : illustration numérique épique, **feu et braises**, orange / jaune / rouge sur fond
presque noir, baskets noires à colonnes de ressorts chromées (jamais de logo).

### `fire/lacet.png` — Lacet Incandescent (Commune)
```
Illustration de carte à collectionner, format portrait 2:3 (1024×1536), plein cadre, sans bordure. Gros plan sur un lacet de basket qui brûle doucement comme une mèche, flammes orange et étincelles, noué sur une basket noire à semelle à ressorts, fond presque noir avec braises flottantes. Style illustration numérique épique, très contrasté. Sujet centré dans la moitié haute, bas sombre. Aucun texte, aucune lettre, aucun chiffre, aucun logo de marque.
```

### `fire/semelle.png` — Semelle Braise (Commune)
```
Illustration de carte à collectionner, format portrait 2:3 (1024×1536), plein cadre, sans bordure. Une semelle de basket vue de côté, faite de charbon incandescent avec des fissures orange lumineuses, quatre colonnes de ressorts chromées sous le talon, posée sur un parquet qui fume. Fond sombre, braises. Style illustration numérique épique. Centré dans la moitié haute, bas sombre. Aucun texte, aucune lettre, aucun chiffre, aucun logo de marque.
```

### `fire/ressort.png` — Ressort Chauffé (Commune)
```
Illustration de carte à collectionner, format portrait 2:3 (1024×1536), plein cadre, sans bordure. Un gros ressort métallique chauffé à blanc qui flotte dans le vide, dégradé du blanc au rouge, entouré d'étincelles et de chaleur qui fait onduler l'air, fond noir. Style rendu 3D réaliste et épique. Centré dans la moitié haute, bas sombre. Aucun texte, aucune lettre, aucun chiffre, aucun logo de marque.
```

### `fire/chaussette.png` — Chaussette Ignifugée (Commune)
```
Illustration de carte à collectionner, format portrait 2:3 (1024×1536), plein cadre, sans bordure. Une chaussette de sport blanche héroïque, posée fièrement au milieu des flammes sans brûler, avec une petite cape, éclairage orange dramatique, braises. Ton humoristique et épique. Centré dans la moitié haute, bas sombre. Aucun texte, aucune lettre, aucun chiffre, aucun logo de marque.
```

### `fire/boite.png` — Boîte Fumante (Commune)
```
Illustration de carte à collectionner, format portrait 2:3 (1024×1536), plein cadre, sans bordure. Une boîte à chaussures en carton noir entrouverte d'où s'échappent fumée et lueur orange intense, comme un trésor dangereux, posée sur un sol sombre parsemé de braises. Style illustration numérique épique. Centré dans la moitié haute, bas sombre. Aucun texte, aucune lettre, aucun chiffre, aucun logo de marque.
```

### `fire/pompier.png` — Le Pompier Dépassé (Rare)
```
Illustration de carte à collectionner, format portrait 2:3 (1024×1536), plein cadre, sans bordure. Un pompier fictif en tenue complète, casque de travers, lance à incendie à la main, qui regarde avec admiration une paire de baskets noires à colonnes de ressorts en feu qu'il serre contre lui au lieu d'éteindre l'incendie. Flammes orange derrière, ton humoristique. Centré dans la moitié haute, bas sombre. Aucun texte, aucune lettre, aucun chiffre, aucun logo de marque.
```

### `fire/phenix.png` — Shox Phénix (Rare)
```
Illustration de carte à collectionner, format portrait 2:3 (1024×1536), plein cadre, sans bordure. Un phénix de feu majestueux, ailes déployées, dont le corps a la forme d'une basket de running noire à colonnes de ressorts, renaissant d'un tas de cendres. Flammes orange, jaunes et rouges, fond noir. Style illustration numérique épique. Centré dans la moitié haute, bas sombre. Aucun texte, aucune lettre, aucun chiffre, aucun logo de marque.
```

### `fire/ecouteurs.png` — Écouteurs Filaires (Rare)
```
Illustration de carte à collectionner, format portrait 2:3 (1024×1536), plein cadre, sans bordure. Une paire d'écouteurs filaires blancs qui flotte comme une relique sacrée, le fil formant une spirale, entourée d'ondes sonores en flammes orange et d'étincelles, fond noir. Style illustration numérique épique. Centré dans la moitié haute, bas sombre. Aucun texte, aucune lettre, aucun chiffre, aucun logo de marque.
```

### `fire/tornade.png` — La Tornade de Shox (Épique)
```
Illustration de carte à collectionner, format portrait 2:3 (1024×1536), plein cadre, sans bordure. Une tornade de feu orange et jaune qui tourbillonne, avec six paires de baskets noires à colonnes de ressorts chromées en orbite dans les flammes, débris et braises, ciel noir. Style illustration numérique épique, mouvement spectaculaire. Centré dans la moitié haute, bas sombre. Aucun texte, aucune lettre, aucun chiffre, aucun logo de marque.
```

### `fire/chignon.png` — Le Chignon de Feu (Épique) — 📎 joindre le logo
```
Illustration de carte à collectionner, format portrait 2:3 (1024×1536), plein cadre, sans bordure. Reprends l'homme de l'image jointe comme référence (même visage de profil, chignon bouclé, écouteurs filaires blancs, sweat noir) : portrait épaules, son chignon s'embrase en une flamme élégante comme une couronne de feu, regard serein et confiant, étincelles autour. Fond noir et rouge sombre, lumière orange. Style illustration numérique épique, flatteur. Visage centré dans la moitié haute, bas sombre. Aucun texte, aucune lettre, aucun chiffre, aucun logo de marque.
```

### `fire/dragon.png` — Le Dragon Shox (Légendaire)
```
Illustration de carte à collectionner légendaire, format portrait 2:3 (1024×1536), plein cadre, sans bordure. Un dragon noir et orange immense, écailles comme de la gomme de semelle, enroulé autour d'une montagne de boîtes à chaussures dans un entrepôt en feu ; au lieu de feu il crache des ressorts chromés chauffés à blanc. Lumière dorée, braises, ambiance épique. Dragon centré dans la moitié haute, bas sombre. Aucun texte, aucune lettre, aucun chiffre, aucun logo de marque.
```

### `fire/le-mec.png` — Le Mec aux Shox, forme incandescente (Légendaire, la plus rare) — 📎 joindre le logo
```
Illustration de carte à collectionner légendaire, format portrait 2:3 (1024×1536), plein cadre, sans bordure. Reprends fidèlement l'image jointe comme référence : l'homme de profil au chignon bouclé, écouteurs filaires blancs, sweat noir, souriant, au centre d'un vortex de flammes orange et jaunes où tourbillonnent des baskets de running noires à colonnes de ressorts chromées. Version encore plus épique : rayons de lumière dorée, étincelles, aura incandescente, fond noir. Personnage centré dans la moitié haute, bas sombre. Aucun texte, aucune lettre, aucun chiffre, aucun logo de marque (pas de virgule de marque sur les chaussures).
```

---

## Booster LFI Shox — dossier `assets/cards/lfi/`

Style commun : **affiche militante rétro** (sérigraphie, rayons rouges en soleil), rouge vif /
crème / bordeaux, manifestation festive et bon enfant. **Personnages fictifs uniquement**, aucune
personnalité réelle, aucun symbole de parti réel.

### `lfi/militant.png` — Militant en Shox (Commune)
```
Illustration de carte à collectionner, format portrait 2:3 (1024×1536), plein cadre, sans bordure. Style affiche militante rétro en sérigraphie, fond de rayons rouges en soleil, palette rouge vif, crème et bordeaux. Sujet : un manifestant fictif souriant, écharpe rouge, qui marche d'un pas décidé avec des baskets à colonnes de ressorts qui le font rebondir, sac à dos et thermos. Ambiance festive et bon enfant. Centré dans la moitié haute, bas sombre. Aucun texte, aucune lettre, aucun chiffre, aucun logo, aucune personnalité réelle.
```

### `lfi/banderole.png` — La Banderole (Commune)
```
Illustration de carte à collectionner, format portrait 2:3 (1024×1536), plein cadre, sans bordure. Style affiche militante rétro en sérigraphie, rayons rouges, palette rouge vif, crème et bordeaux. Sujet : une grande banderole crème vierge (sans aucune inscription) tenue à bout de bras par deux manifestants fictifs en baskets à ressorts, le tissu qui claque au vent, un peu de travers. Ambiance festive et drôle. Centré dans la moitié haute, bas sombre. Aucun texte, aucune lettre, aucun chiffre, aucun logo, aucune personnalité réelle.
```

### `lfi/tract.png` — Le Tract Brûlant (Commune)
```
Illustration de carte à collectionner, format portrait 2:3 (1024×1536), plein cadre, sans bordure. Style affiche militante rétro, palette rouge vif, crème et bordeaux. Sujet : une pile de tracts papier vierges (sans inscription lisible) dont le premier s'enflamme légèrement sur un bord, à la sortie d'une bouche de métro stylisée, des feuilles qui volent. Centré dans la moitié haute, bas sombre. Aucun texte, aucune lettre, aucun chiffre, aucun logo, aucune personnalité réelle.
```

### `lfi/megaphone.png` — Le Mégaphone Rouge (Commune)
```
Illustration de carte à collectionner, format portrait 2:3 (1024×1536), plein cadre, sans bordure. Style affiche militante rétro en sérigraphie, fond de rayons rouges en soleil. Sujet : un gros mégaphone rouge et crème vu de trois quarts, d'où sortent des ondes sonores énormes et des confettis, il tremble tellement qu'il fait rebondir une paire de baskets à ressorts posée à côté. Palette rouge, crème, bordeaux. Centré dans la moitié haute, bas sombre. Aucun texte, aucune lettre, aucun chiffre, aucun logo.
```

### `lfi/ballon.png` — Ballon Rouge (Commune)
```
Illustration de carte à collectionner, format portrait 2:3 (1024×1536), plein cadre, sans bordure. Style affiche rétro en sérigraphie, palette rouge vif, crème et bordeaux. Sujet : un gros ballon rouge gonflé à bloc qui s'envole au-dessus d'un cortège joyeux vu de loin, sa ficelle accrochée à une basket à ressorts qui pend dans le vide. Ciel crème avec rayons. Centré dans la moitié haute, bas sombre. Aucun texte, aucune lettre, aucun chiffre, aucun logo.
```

### `lfi/cheffe-cortege.png` — La Cheffe de Cortège (Rare)
```
Illustration de carte à collectionner, format portrait 2:3 (1024×1536), plein cadre, sans bordure. Style affiche militante rétro en sérigraphie, rayons rouges, palette rouge vif, crème et bordeaux. Sujet : une meneuse de cortège fictive, charismatique, foulard rouge, un mégaphone à la main et le poing vers le ciel en souriant, debout sur un banc avec des baskets à colonnes de ressorts, la foule derrière elle. Ambiance festive et bon enfant. Centré dans la moitié haute, bas sombre. Aucun texte, aucune lettre, aucun chiffre, aucun logo, aucune personnalité réelle.
```

### `lfi/camion-sono.png` — Le Camion Sono (Rare)
```
Illustration de carte à collectionner, format portrait 2:3 (1024×1536), plein cadre, sans bordure. Style affiche rétro en sérigraphie, palette rouge vif, crème et bordeaux. Sujet : un petit camion décoré de ballons rouges avec d'énormes enceintes sur le toit, les ondes sonores font rebondir des baskets à ressorts sur la route autour de lui, confettis, foule qui danse. Centré dans la moitié haute, bas sombre. Aucun texte, aucune lettre, aucun chiffre, aucun logo, aucune plaque lisible.
```

### `lfi/tribun.png` — Le Tribun du Pavé (Rare)
```
Illustration de carte à collectionner, format portrait 2:3 (1024×1536), plein cadre, sans bordure. Style affiche militante rétro en sérigraphie, rayons rouges en soleil. Sujet : un orateur fictif (personnage inventé, ne ressemblant à aucune personnalité réelle), barbe et cravate rouge desserrée, en plein discours passionné au micro sur une caisse en bois posée sur les pavés, montre au poignet qui indique qu'il parle depuis des heures, baskets à ressorts aux pieds. Ton humoristique. Centré dans la moitié haute, bas sombre. Aucun texte, aucune lettre, aucun chiffre, aucun logo.
```

### `lfi/assemblee.png` — L'Assemblée Debout (Épique)
```
Illustration de carte à collectionner, format portrait 2:3 (1024×1536), plein cadre, sans bordure. Style affiche militante rétro en sérigraphie, palette rouge vif, crème et bordeaux, rayons rouges. Sujet : une grande place la nuit remplie d'une foule fictive debout qui vote à main levée, tous les pieds en baskets à ressorts décollent du sol en même temps, guirlandes lumineuses, ambiance joyeuse et solidaire. Centré dans la moitié haute, bas sombre. Aucun texte, aucune lettre, aucun chiffre, aucun logo, aucune personnalité réelle.
```

### `lfi/hologramme.png` — Le Meeting Hologramme (Épique)
```
Illustration de carte à collectionner, format portrait 2:3 (1024×1536), plein cadre, sans bordure. Style affiche rétro-futuriste, palette rouge vif, crème et bleu holographique. Sujet : sur une scène de meeting, un orateur fictif en hologramme bleu translucide et scintillant (silhouette générique, visage non identifiable), dont seules les baskets à colonnes de ressorts sont bien réelles et colorées, devant une foule qui brandit des drapeaux rouges vierges. Centré dans la moitié haute, bas sombre. Aucun texte, aucune lettre, aucun chiffre, aucun logo, aucune personnalité réelle.
```

### `lfi/grande-marche.png` — La Grande Marche (Légendaire)
```
Illustration de carte à collectionner légendaire, format portrait 2:3 (1024×1536), plein cadre, sans bordure. Style affiche militante rétro en sérigraphie, monumentale. Sujet : un immense cortège fictif vu en plongée qui remplit une grande avenue, des milliers de baskets à ressorts qui rebondissent en même temps au point que le bitume ondule comme une vague, drapeaux rouges vierges, fumigènes rouges, confettis, soleil rouge géant à l'horizon. Épique et festif. Centré dans la moitié haute, bas sombre. Aucun texte, aucune lettre, aucun chiffre, aucun logo, aucune personnalité réelle.
```

### `lfi/mec-megaphone.png` — Le Mec au Mégaphone (Légendaire, la plus rare) — 📎 joindre le logo
```
Illustration de carte à collectionner légendaire, format portrait 2:3 (1024×1536), plein cadre, sans bordure. Style affiche militante rétro en sérigraphie, rayons rouges en soleil, palette rouge vif, crème, bordeaux et touches de flammes orange. Reprends l'homme de l'image jointe comme référence (même visage, chignon bouclé, écouteurs filaires blancs, sweat noir) : il est debout sur un camion, un mégaphone rouge à la main, souriant et charismatique, et devant lui une foule fictive en baskets à ressorts bondit de joie ; des baskets noires à colonnes de ressorts en flammes tourbillonnent autour de lui comme dans l'image jointe. Héroïque et bon enfant. Personnage centré dans la moitié haute, bas sombre. Aucun texte, aucune lettre, aucun chiffre, aucun logo, aucun symbole de parti réel.
```
