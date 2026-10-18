// Shox Opening — données des boosters et des cartes.
//
// ═══════════════════════════════ AJOUTER UNE CARTE ═══════════════════════════════
// Une ligne dans la liste « cards » du bon booster suffit. Exemple avec un meme :
//
//   { id: 'jack-shi', name: 'Jack Shi', sub: 'Plus vieux, plus fort', rarity: 'legend',
//     img: 'memes/jack-shi.webp', text: '52 vitesses, une seule direction : la victoire.' },
//
//   id      identifiant unique dans le booster (lettres, chiffres, tirets) — ne plus le changer
//   rarity  'common' (Commune), 'rare', 'epic' (Épique) ou 'legend' (Légendaire)
//   img     image de la carte, chemin depuis F:\fireshox\assets\ (ex. 'memes/x.webp').
//           Sans img : /assets/cards/<booster>/<id>.png si le fichier existe, sinon rendu CSS.
//   Cadrage (facultatif, pour ne couper aucun visage) :
//     frame  'window' (photo dans une fenêtre sous le nom — conseillé pour les images en paysage),
//            'tall' (fenêtre haute, pour les portraits qu'on veut voir en entier) ou
//            'full' (image sur toute la carte, le texte passe par-dessus le bas).
//            Par défaut : 'window' si img est donné, sinon 'full'.
//     fit    'cover' (remplit, recadre) ou 'contain' (image entière sur un fond flou d'elle-même)
//     focus  point à garder visible quand on recadre, ex. '45% 25%' (x puis y)
//     zoom   agrandissement (1 par défaut), ex. 1.15
//   stats   facultatif : 3 valeurs (nombres 0-100 ou texte comme '∞') dans l'ordre de statLabels.
//           Sans stats, elles sont tirées d'après la rareté (toujours les mêmes pour une carte).
//   ley     true si la carte montre Le Y (le mec du logo) : les prompts demandent de joindre le logo
//   w       poids du tirage à l'intérieur de sa rareté (1 par défaut)
//   art     rendu de remplacement sans image : emoji, mark (gros texte de fond), logo (Le Y),
//           shoe (couleur d'une Shox dessinée), mask, banner
//
// Retirer une carte : la supprimer ici ET l'ajouter dans « retired » (avec sa rareté) pour que les
// joueurs qui l'avaient soient remboursés. Renommer un id : l'ajouter dans « aliases ».
// ═════════════════════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  const rarities = {
    common: { id: 'common', label: 'Commune', plural: 'Communes', rank: 1, weight: 58, color: '#9aa3ad', recycle: 5, stars: 1 },
    rare: { id: 'rare', label: 'Rare', plural: 'Rares', rank: 2, weight: 27, color: '#3d9bff', recycle: 15, stars: 2 },
    epic: { id: 'epic', label: 'Épique', plural: 'Épiques', rank: 3, weight: 10, color: '#b44dff', recycle: 50, stars: 3 },
    legend: { id: 'legend', label: 'Légendaire', plural: 'Légendaires', rank: 4, weight: 5, color: '#ffb000', recycle: 200, stars: 4 },
  };
  const order = ['common', 'rare', 'epic', 'legend'];

  const boosters = [
    {
      id: 'squid',
      name: 'Booster Squid Shox',
      short: 'Squid Shox',
      word: 'SQUID',
      tagline: '456 joueurs. Une seule paire.',
      price: 100,
      colors: { a: '#ff2f7d', b: '#12b98a', c: '#ffd1e3', dark: '#12060c', ink: '#2a0716' },
      statLabels: ['Survie', 'Rebond', 'Discrétion'],
      qr: { title: 'Jeu bonus n°456', sub: '« 1, 2, 3… Shox ! »', text: 'Avance quand la poupée regarde ailleurs. Rebondis, mais en silence.' },
      cards: [
        { id: 'joueur-218', name: 'Joueur 218', sub: 'A oublié ses Shox', rarity: 'common', stats: [18, 4, 35], art: { emoji: '🦶', mark: '218' },
          text: 'Ses Shox sont restées au vestiaire. Il fait tout le jeu en chaussettes.' },
        { id: 'shox-vertes-456', name: 'Shox Vertes 456', sub: 'Pointure unique', rarity: 'common', stats: [42, 55, 30], art: { shoe: '#19c38f', mark: '456' },
          text: 'Le vestiaire n\'avait que ça. Elles vont à tout le monde, et à personne.' },
        { id: 'lacets-symboles', name: 'Lacets ○△□', sub: 'Nœud réglementaire', rarity: 'common', stats: [30, 20, 64], art: { shoe: '#ff4f93', mark: '○△□' },
          text: 'Un rond, un triangle, un carré. Personne n\'a jamais réussi le nœud carré.' },
        { id: 'shox-feu-vert', name: 'La Shox Feu Vert', sub: '1, 2, 3… rebond !', rarity: 'rare', stats: [70, 81, 12], art: { emoji: '🚦', mark: '123' },
          text: 'Feu vert : elle rebondit. Feu rouge : elle rebondit quand même.' },
        { id: 'dalgona-shox', name: 'Le Dalgona Shox', sub: 'Épreuve n°2, version Shox', rarity: 'epic', stats: [12, 76, 88],
          img: 'memes/dalgona-shox.webp', frame: 'window', focus: '50% 52%',
          text: 'Découper la Shox sans casser le biscuit : quatre ressorts, zéro marge d\'erreur.' },
        { id: 'tralalero-shoxala', name: 'Tralalero Shoxalà', sub: 'Requin des plages, ○△□ aux pieds', rarity: 'epic', stats: [85, 92, 3],
          img: 'memes/tralalero-shoxala.webp', frame: 'window', focus: '62% 45%',
          text: 'Il n\'a pas de jambes, mais il a des Shox. La science n\'explique toujours pas comment il marche.' },
        { id: 'ancien-lenny', name: 'L\'Ancien & Lenny', sub: 'Sièges 13 et 14, épreuve du manège', rarity: 'epic', stats: [91, 77, 4],
          img: 'memes/ancien-lenny-manege.webp', frame: 'tall', focus: '50% 42%',
          text: 'Harnais bouclés, signes de la main en pleine attraction, zéro cri. L\'Ancien et Lenny ont survécu au manège ; leurs Shox, elles, ont hurlé pour eux.' },
        { id: 'dorian-bereal', name: 'Dorian, BeReal Express', sub: 'Mèche au vent, pris en 2 minutes chrono', rarity: 'rare', stats: [63, 70, 41],
          img: 'memes/dorian-bereal.webp', frame: 'tall', focus: '50% 55%',
          text: 'Le BeReal a sonné, Dorian a dégainé. Pas le temps de se coiffer : la mèche est partie avant lui, propulsée par ses Shox.' },
        { id: 'trio-malo-dorian-armand', name: 'Malo, Dorian & Armand', sub: 'Le trio d\'origine', rarity: 'epic', stats: [75, 68, 52],
          img: 'memes/trio-malo-dorian-armand.webp', frame: 'window', focus: '50% 40%',
          text: 'Trois joueurs, une seule photo, zéro Shox aux pieds… pour l\'instant. La légende dit qu\'ils se sont qualifiés pour toutes les épreuves en équipe.' },
        { id: 'yanis-2', name: 'Yanis 2', sub: 'A empoché la cagnotte des 456', rarity: 'epic', stats: [99, 40, 88],
          img: 'memes/yanis-2.webp', frame: 'window', focus: '50% 40%',
          text: 'Capuche relevée, billets en éventail : Yanis 2 est le seul à être sorti du jeu avec la cagnotte. Il a déjà tout dépensé en Shox.' },
        { id: 'charlotte', name: 'Charlotte', sub: 'Lunettes sur la tête, langue tirée', rarity: 'epic', stats: [80, 62, 35],
          img: 'memes/charlotte.webp', frame: 'tall', focus: '50% 30%',
          text: 'Lunettes rangées sur la tête, langue tirée, index levé : Charlotte a trouvé la réponse de l\'épreuve avant tout le monde, et elle tient à ce que ça se sache.' },
        { id: 'seg', name: 'Seg', sub: 'Polo fluo, sourire en coin', rarity: 'rare', stats: [55, 48, 70],
          img: 'memes/seg.webp', frame: 'tall', focus: '50% 30%',
          text: 'En polo vert fluo dans l\'escalier, Seg attend la photo de groupe depuis 45 minutes. Il ne s\'est jamais plaint. Il ne s\'est jamais levé non plus.' },
        { id: 'amaury-filtre', name: 'Amaury', sub: 'Édition fête foraine, visage à ressorts', rarity: 'rare', stats: [40, 95, 20],
          img: 'memes/amaury-filtre.webp', frame: 'tall', focus: '50% 40%',
          text: 'Néons violets et filtre étirant : Amaury a testé le premier visage à ressorts. Les ingénieurs Shox ont pris des notes, puis ont tout effacé.' },
        { id: 'matthias', name: 'Matthias', sub: 'Le Grand Maître du Triangle', rarity: 'epic', stats: [94, 50, 99],
          img: 'memes/matthias.webp', frame: 'tall', focus: '50% 45%',
          text: 'Mains en triangle, regard du dessous, moustache de conspirateur : Matthias contrôle le jeu depuis le début. Le triangle sur les masques des gardes ? C\'était lui.' },
        { id: 'les-jeux-video', name: '« Les jeux vidéo »', sub: 'Le surveillant suprême des écrans', rarity: 'legend', stats: [100, 20, 100],
          img: 'memes/les-jeux-video.webp', frame: 'window', focus: '50% 50%',
          text: 'Un téléphone sorti sous la table, et la sentence tombait : « Les jeux vidéo… ». Il voyait tous les écrans, même ceux cachés sous la trousse. Personne n\'a jamais fini une partie en sa présence.' },
        { id: 'eggorian', name: 'Eggorian', sub: 'Dorian, édition œuf de Pâques', rarity: 'legend', stats: [12, 99, 100],
          img: 'memes/eggorian.webp', frame: 'tall', focus: '50% 42%',
          text: 'Qui est arrivé en premier, Dorian ou l\'œuf ? La science a tranché : c\'est Eggorian. Ne jamais le poser sur des Shox à ressorts, il rebondit jusqu\'à l\'omelette.' },
        { id: 'le-y-lancer-456', name: 'Le Y, Lanceur de Shox', sub: 'Joueur 456 · Shox flambées', rarity: 'legend', ley: true, stats: [100, '∞', 20],
          img: 'memes/le-y-lancer-456.webp', frame: 'full', focus: '45% 26%',
          text: 'Il ne court pas : il dégaine. Chaque Shox lancée part en feu et revient comme un boomerang à ressorts.' },
        { id: 'le-y-tenue-456', name: 'Le Y, Défilé 456', sub: 'Tenue XXL, Shox presque vraies', rarity: 'legend', ley: true, stats: [96, 88, 0],
          img: 'memes/le-y-tenue-456.webp', frame: 'tall', fit: 'contain',
          text: 'Survêtement 456 en XXL, sacoche qui tient grâce à la foi, fausses Shox vertes dont les ressorts font des heures sup.' },
      ],
    },
    {
      id: 'fire',
      name: 'Booster Fire Shox',
      short: 'Fire Shox',
      word: 'FIRE',
      tagline: 'Édition incandescente. Manipuler avec des gants.',
      price: 150,
      colors: { a: '#ff7a00', b: '#ffd84a', c: '#ffe7b8', dark: '#140600', ink: '#2a0d00' },
      statLabels: ['Chaleur', 'Rebond', 'Style'],
      qr: { title: 'Jeu bonus', sub: 'La Course des Flammes', text: 'Saute de ressort en ressort sans te brûler les lacets.' },
      cards: [
        { id: 'lacet', name: 'Lacet Incandescent', sub: 'Ne se défait jamais', rarity: 'common', stats: [64, 10, 31], art: { emoji: '🧵', mark: '°C' },
          text: 'Brûle un peu quand on court trop vite. Ça fait partie du charme.' },
        { id: 'semelle', name: 'Semelle Braise', sub: 'Amorti 100 % charbon', rarity: 'common', stats: [70, 33, 22], art: { shoe: '#ff6a1a', mark: '°C' },
          text: 'Laisse des traces fumantes sur le parquet. Tes parents adorent.' },
        { id: 'ressort', name: 'Ressort Chauffé', sub: 'Pièce détachée officielle', rarity: 'common', stats: [58, 60, 15], art: { emoji: '🌀', mark: '°C' },
          text: 'Un ressort, deux ressorts… Après le quatrième, on commence à voler.' },
        { id: 'chaussette', name: 'Chaussette Ignifugée', sub: 'Le vrai héros méconnu', rarity: 'common', stats: [95, 2, 9], art: { emoji: '🧦', mark: '°C' },
          text: 'Résiste à 1 200 °C. Ne résiste pas à la machine à laver.' },
        { id: 'boite', name: 'Boîte Fumante', sub: 'Livraison express', rarity: 'common', stats: [48, 20, 44], art: { emoji: '📦', mark: '°C' },
          text: 'Une boîte à Shox qui fume. Ne pas ouvrir à l\'intérieur. Ni à l\'extérieur, en fait.' },
        { id: 'phenix', name: 'Shox Phénix', sub: 'Renaît de ses cendres', rarity: 'rare', stats: [81, 66, 72], art: { emoji: '🦅', mark: '°C' },
          text: 'Brûle au premier footing, renaît au deuxième. Garantie à vie.' },
        { id: 'ecouteurs', name: 'Les Écouteurs du Y', sub: 'Filaires, évidemment', rarity: 'rare', stats: [40, 35, 90], art: { emoji: '🎧', mark: '♪' },
          text: 'Tout droit sortis du logo. Ne captent qu\'une seule fréquence : celle du feu.' },
        { id: 'theo-ancetre', name: 'Théo, l\'Ancêtre', sub: 'Doyen du peloton des légendes', rarity: 'epic', stats: [90, 60, 75],
          img: 'memes/theo-ancetre.webp', frame: 'tall', focus: '50% 28%',
          text: 'Maillot de course, casquette et lunettes : l\'Ancêtre roulait déjà avant l\'invention du vélo. Jack Shi lui-même l\'appelle « maître ».' },
        { id: 'ocb-potion', name: 'OCB', sub: 'La potion verte officielle', rarity: 'epic', stats: [85, 50, 95],
          img: 'memes/ocb-potion.webp', frame: 'tall', focus: '50% 35%',
          text: 'Bouteille verte en main, regard de chimiste : OCB prépare la potion officielle des Shox. Recette secrète, couleur suspecte, effets incandescents.' },
        { id: 'virgil', name: 'Virgil', sub: 'Une coupe, un sourcil, un empire', rarity: 'epic', stats: [70, 55, 88],
          img: 'memes/virgil.webp', frame: 'tall', focus: '50% 40%',
          text: 'Une coupe à la main et un sourcil levé, regard de PDG : Virgil fête quelque chose. Personne ne sait quoi, mais il le fête très bien.' },
        { id: 'polo-ott', name: 'La Polo OTT', sub: 'Le carrosse rouge d\'Axel.OTT', rarity: 'rare', stats: [80, 45, 70],
          img: 'memes/polo-ott.webp', frame: 'window', focus: '50% 50%',
          text: 'Rouge feu et siège conducteur réglé en mode chill : la Polo d\'Axel.OTT emmène toute la bande au BK. Elle n\'a pas de ressorts, mais elle rebondit sur chaque dos-d\'âne.' },
        { id: 'bk-saint-geosmes', name: 'BK Saint-Geosmes', sub: 'Grillé à la flamme depuis 1954', rarity: 'epic', stats: [99, 30, 75],
          img: 'memes/bk-saint-geosmes.webp', frame: 'window', focus: '50% 30%',
          text: 'Le QG officiel après les cours. Les burgers y sont grillés à la flamme, et les milkshakes renversés de Meusieur IA classés monument historique.' },
        { id: 'cafe-clope-ancien', name: 'Café-Clope', sub: 'Le rituel sacré de l\'Ancien, 7 h 58', rarity: 'epic', stats: [85, 10, 60],
          img: 'memes/cafe-clope-ancien.webp', frame: 'window', focus: '50% 45%',
          text: 'Un café noir, une clope, une montre qui tourne : avant chaque épreuve, l\'Ancien respecte le rituel. Les Shox chauffent toutes seules à côté de lui.' },
        { id: 'tchiki-brrrr', name: 'Tchiki Brrrrr', sub: 'Sourcils incandescents', rarity: 'epic', stats: [100, 72, 15],
          img: 'memes/tchiki-brrrr.webp', frame: 'tall', focus: '50% 35%',
          text: 'Zéro cheveu, un sourcil pour deux yeux, et un cri de guerre : « Tchiki brrrrr ». Quand il le prononce, toutes les Shox de la pièce se mettent à vibrer.' },
        { id: 'tornade', name: 'La Tornade de Shox', sub: 'Six paires en orbite', rarity: 'epic', stats: [88, 92, 80], art: { emoji: '🌪️', mark: '°C' },
          text: 'Si tu entends un sifflement de ressorts, c\'est déjà trop tard.' },
        { id: 'chignon', name: 'Le Chignon du Y', sub: 'Coiffure certifiée 1 200 °C', rarity: 'epic', ley: true, stats: [97, 70, 99], art: { emoji: '☄️', mark: '°C' },
          text: 'Il ne se coiffe pas : il attise.' },
        { id: 'le-y-btbf', name: 'Le Y, Mode BTBF', sub: 'Écouteurs filaires branchés', rarity: 'epic', ley: true, stats: [77, 64, 95],
          img: 'memes/le-y-btbf.webp', frame: 'full', focus: '62% 30%',
          text: 'Quatre lettres orange à l\'écran, la main sous le menton. Lui seul sait. Les écouteurs aussi.' },
        { id: 'la-boussole', name: 'La Boussole', sub: 'Le nord est dans la pomme', rarity: 'epic', stats: [40, 58, 90],
          img: 'memes/la-boussole.webp', frame: 'window', focus: '52% 50%',
          text: 'Une pomme avec une vieille boussole dedans. Elle ne montre pas le nord : elle montre le chemin.' },
        { id: 'dragon', name: 'Le Dragon Shox', sub: 'Gardien de l\'entrepôt', rarity: 'legend', stats: [99, 85, 93], art: { emoji: '🐉', mark: '°C' },
          text: 'Il ne crache pas du feu : il crache des ressorts. Chauffés à blanc, quand même.' },
        { id: 'jack-shi', name: 'Jack Shi', sub: 'Plus vieux, plus fort, plus rapide', rarity: 'legend', stats: [88, 52, 99],
          img: 'memes/jack-shi.webp', frame: 'window', focus: '50% 40%',
          text: '52 vitesses, une seule direction : la victoire. Un vieux qui envoie du lourd.' },
        { id: 'le-y', name: 'Le Y', sub: 'Forme incandescente', rarity: 'legend', ley: true, stats: [100, '∞', 100], art: { logo: true, mark: '°C' },
          text: 'Au centre de la tornade de Shox, il sourit. Il a déjà choisi sa paire.' },
      ],
    },
    {
      id: 'lfi',
      name: 'Booster LFI Shox',
      short: 'LFI Shox',
      word: 'LFI',
      tagline: 'La Foulée Insoumise — édition meeting.',
      price: 100,
      colors: { a: '#ff2a3d', b: '#fff1dc', c: '#ffc9cf', dark: '#14030a', ink: '#2b0710' },
      statLabels: ['Décibels', 'Rebond', 'Ferveur'],
      qr: { title: 'Jeu bonus', sub: 'Manif Runner', text: 'Traverse le cortège, ramasse les tracts, évite les flaques.' },
      cards: [
        { id: 'militant', name: 'Militant en Shox', sub: '30 km de cortège par jour', rarity: 'common', stats: [44, 52, 70], art: { emoji: '🚶', mark: 'TOUS EN SHOX' },
          text: 'Ses mollets sont insoumis. Ses ressorts aussi.' },
        { id: 'semelle-revolutionnaire', name: 'Semelle Révolutionnaire', sub: 'Quatre ressorts, zéro compromis', rarity: 'common', stats: [30, 74, 91], art: { shoe: '#ff3347', mark: 'AMORTI POUR TOUS' },
          text: 'Elle a refusé l\'amorti standard. Personne ne l\'a jamais fait plier.' },
        { id: 'blocus', name: 'Le Blocus en Shox', sub: 'Lycée fermé, ressorts ouverts', rarity: 'rare', stats: [82, 66, 95], art: { emoji: '🚧', mark: 'BLOCUS' },
          text: 'Des poubelles, des barrières et quarante paires de Shox devant le portail. Personne n\'entre, tout le monde rebondit.' },
        { id: 'shox-insoumises', name: 'Les Shox Insoumises', sub: 'Elles refusent d\'être lacées', rarity: 'epic', stats: [55, 90, 99], art: { shoe: '#ff2a3d', mark: 'NON AUX LACETS' },
          text: 'Une paire rouge qui ne se laisse lacer par personne. Par principe.' },
        { id: 'dtn', name: 'DTN', sub: 'Le Candidat Shox', rarity: 'epic', stats: [64, 71, 97],
          img: 'memes/dtn.webp', frame: 'tall', focus: '50% 22%',
          text: 'Chemise impeccable, mains dans les poches, sourire de campagne. DTN n\'a qu\'un programme : remplacer tous les escaliers par des ressorts.' },
        { id: 'axel', name: 'Axel', sub: 'Le Gréviste du Jardin', rarity: 'epic', stats: [12, 58, 93],
          img: 'memes/axel.webp', frame: 'tall', focus: '48% 40%',
          text: 'Sous son arbre, Axel a voté la grève illimitée du sourire. Seule revendication : des Shox à sa pointure.' },
        { id: 'theo-caviezel-maire', name: 'Théo Caviezel', sub: 'Monsieur le Maire', rarity: 'legend', stats: [95, 70, 100],
          img: 'memes/theo-caviezel-maire.webp', frame: 'tall', focus: '50% 30%',
          text: 'Duffle-coat boutonné jusqu\'au menton, place de la fontaine : Monsieur le Maire inaugure le premier rond-point à ressorts de France. Discours prévu : trois heures, en Shox.' },
        { id: 'theo-caviezel-mob', name: 'Théo Caviezel', sub: 'Le Maire en tournée à mobylette', rarity: 'epic', stats: [70, 88, 60],
          img: 'memes/theo-caviezel-mob.webp', frame: 'tall', focus: '50% 40%',
          text: 'Bonnet bleu, mobylette et grand sourire : le maire fait la tournée des chemins. Promesse de campagne : une paire de Shox par administré, et des ressorts sur la mob.' },
        { id: 'lycee-diderot', name: 'Lycée Denis-Diderot', sub: 'Le QG du blocus', rarity: 'epic', stats: [70, 20, 100],
          img: 'memes/lycee-diderot.webp', frame: 'window', focus: '50% 50%',
          text: 'Là où tout a commencé : les cours de STI2D, les poubelles du blocus et les discours d\'OCB au mégaphone. Ce portail n\'a jamais vu passer autant de Shox.' },
        { id: 'meusieur-ia', name: 'Meusieur IA', sub: 'Malo, prédiction : milkshake renversé', rarity: 'epic', stats: [100, 30, 12],
          img: 'memes/meusieur-ia.webp', frame: 'tall', fit: 'contain',
          text: 'Meusieur IA a calculé 14 milliards de scénarios avant de renverser son milkshake. Résultat : une œuvre d\'art à la vanille sur la table. Taux de réussite annoncé : 100 %.' },
        { id: 'lucas-galoche', name: 'L\'Ancien sous Galoche', sub: 'L\'épreuve de l\'apnée', rarity: 'epic', stats: [99, 40, 3],
          img: 'memes/lucas-galoche.webp', frame: 'tall', focus: '50% 40%',
          text: 'Lumières, musique, foule : l\'Ancien a choisi ce moment pour tenter l\'apnée la plus longue de l\'histoire des Shox. Le chrono tourne encore.' },
        { id: 'amaury-planche', name: 'Amaury le Bâtisseur', sub: 'Une planche, zéro autorisation', rarity: 'rare', stats: [60, 45, 92],
          img: 'memes/amaury-planche.webp', frame: 'tall', focus: '25% 60%',
          text: 'Il a traversé la salle avec une planche plus longue que lui : Amaury construit la barricade du blocus. Le prof n\'a rien vu. Ou n\'a rien voulu voir.' },
        { id: 'theo-gosse', name: 'Théo, Saut Originel', sub: 'Avant les Shox, il y avait le vent', rarity: 'rare', stats: [35, 97, 50],
          img: 'memes/theo-gosse.webp', frame: 'tall', focus: '45% 12%',
          text: 'Face à la mer, bras tendus, envol parfait : le petit Théo s\'entraînait déjà au rebond. Les ressorts ne sont arrivés que dix ans plus tard.' },
        { id: 'og-dorian', name: 'OG Dorian', sub: 'Version originale, avant l\'œuf', rarity: 'rare', stats: [58, 46, 77],
          img: 'memes/og-dorian.webp', frame: 'window', focus: '50% 45%',
          text: 'Casque sur les oreilles, regard de négociateur : le Dorian des origines, bien avant de devenir Eggorian. Collector.' },
        { id: 'armand', name: 'Armand', sub: 'Mode zen activé', rarity: 'rare', stats: [21, 64, 90],
          img: 'memes/armand.webp', frame: 'tall', focus: '50% 45%',
          text: 'Cagoule, casque, yeux fermés, petit sourire : Armand écoute le bruit des ressorts. Personne n\'a jamais su ce qu\'il entendait.' },
        { id: 'bismillah-tenebres', name: 'C\'est les Ténèbres', sub: 'La pancarte légendaire du blocus', rarity: 'legend', stats: [100, 66, 0],
          img: 'memes/bismillah-tenebres.webp', frame: 'tall', focus: '50% 45%',
          text: 'Selon la légende, la phrase est sortie de la bouche d\'un faux lycéen… qui était en fait un policier infiltré. Démasqué en trois mots, devenu un mème en trois secondes.' },
        { id: 'ocb-megaphone', name: 'OCB au Mégaphone', sub: 'Blocus du lycée', rarity: 'legend', stats: [100, 61, 100], art: { emoji: '📢', mark: 'BLOCUS DU LYCÉE' },
          text: 'Une caisse en bois comme estrade, un mégaphone à la main : le blocus avait enfin son porte-parole.' },
        { id: 'le-y-micro', name: 'Le Y au Micro', sub: 'Orateur incandescent', rarity: 'legend', ley: true, stats: [100, '∞', 100], art: { logo: true, mark: 'LE Y ! LE Y !' },
          text: 'Quand il prend le micro, les Shox se lèvent toutes seules. Même celles en vitrine.' },
        { id: 'elwan', name: 'Elwan', sub: 'Le lycéen pro-blocus', rarity: 'epic', stats: [92, 70, 100],
          img: 'memes/elwan.webp', frame: 'window', focus: '50% 40%',
          text: 'Costume, cravate rouge, sourire en coin : il a défendu le blocus en direct sur LCI devant toute la France. Les poubelles du lycée n\'ont jamais eu un aussi bon avocat.' },
        { id: 'louise', name: 'Louise', sub: 'L\'anti-blocus au micro', rarity: 'epic', stats: [95, 55, 100],
          img: 'memes/louise.webp', frame: 'window', focus: '50% 40%',
          text: 'Micro en main, elle a dit non au blocus en direct sur LCI, sans trembler. Pour elle, le portail du lycée reste ouvert, Shox ou pas Shox.' },
        { id: 'grande-confrontation', name: 'La Grande Confrontation', sub: 'Louise contre Elwan, en direct', rarity: 'legend', stats: [100, 50, 100],
          img: 'memes/grande-confrontation.webp', frame: 'window', focus: '50% 40%',
          text: 'Blocus ou pas blocus ? Ils se sont affrontés en direct sur LCI pendant que tout le lycée regardait. Score final : match nul. Les Shox, elles, ont gagné.' },
      ],
    },
  ];

  // Cartes retirées du jeu (rareté = valeur de remboursement pour ceux qui les avaient).
  const retired = {
    'squid/garde-rond': 'common', 'squid/garde-triangle': 'common', 'squid/dalgona': 'common', 'squid/billes': 'common',
    'squid/garde-carre': 'rare', 'squid/poupee': 'rare', 'squid/pont-de-verre': 'rare',
    'squid/recruteur': 'epic', 'squid/maitre-du-jeu': 'epic', 'squid/tirelire': 'legend', 'squid/joueur-001': 'legend',
    'fire/pompier': 'rare',
    'lfi/banderole': 'common', 'lfi/tract': 'common', 'lfi/megaphone': 'common', 'lfi/ballon': 'common',
    'lfi/cheffe-cortege': 'rare', 'lfi/camion-sono': 'rare', 'lfi/tribun': 'rare',
    'lfi/assemblee': 'epic', 'lfi/hologramme': 'epic', 'lfi/grande-marche': 'legend',
  };
  // Cartes renommées : ancienne clé → nouvelle (la carte est conservée).
  const aliases = {
    'fire/le-mec': 'fire/le-y',
    'lfi/mec-megaphone': 'lfi/le-y-micro',
    'lfi/le-y-megaphone': 'lfi/le-y-micro',
    'lfi/ott-micro': 'lfi/ocb-megaphone',
    'lfi/ott-megaphone': 'lfi/ocb-megaphone',
    'fire/ott-potion': 'fire/ocb-potion',
  };

  // ------------------------------------------------------------ préparation automatique
  const hash = (s) => { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const STAT_RANGE = { common: [12, 60], rare: [35, 78], epic: [60, 92], legend: [84, 100] };
  for (const b of boosters) {
    b.cards.forEach((c, i) => {
      c.booster = b.id;
      c.key = b.id + '/' + c.id;
      c.art = c.art || {};
      // image : fournie (meme) ou emplacement attendu dans assets/cards
      if (c.img) {
        c.photo = true;
        c.img = c.img.startsWith('/') ? c.img : '/assets/' + c.img;
      } else {
        c.img = '/assets/cards/' + b.id + '/' + c.id + '.png';
      }
      c.frame = c.frame || (c.photo ? 'window' : 'full');
      c.fit = c.fit || 'cover';
      c.focus = c.focus || '50% 40%';
      if (!Array.isArray(c.stats) || c.stats.length < 3) {
        const [lo, hi] = STAT_RANGE[c.rarity] || STAT_RANGE.common;
        const h = hash(c.key);
        c.stats = [0, 1, 2].map((k) => lo + ((h >>> (k * 8)) % (hi - lo + 1)));
      }
    });
    // numéros : rangés par rareté (communes d'abord), puis dans l'ordre de la liste
    b.cards.slice().sort((x, y) => rarities[x.rarity].rank - rarities[y.rarity].rank || b.cards.indexOf(x) - b.cards.indexOf(y))
      .forEach((c, i) => { c.no = i + 1; });
    b.pack = '/assets/cards/boosters/' + b.id + '.png';
    b.game = 'fireshox://jeux/?game=' + b.id;
  }

  const byKey = {};
  for (const b of boosters) for (const c of b.cards) byKey[c.key] = c;

  // Rareté réellement tirée dans un booster : si une rareté n'a aucune carte, on prend la plus
  // proche (à égalité, la plus basse).
  function tierFor(b, r) {
    const has = (x) => b.cards.some((c) => c.rarity === x);
    if (has(r)) return r;
    const rk = rarities[r].rank;
    const cands = order.filter(has).sort((x, y) => Math.abs(rarities[x].rank - rk) - Math.abs(rarities[y].rank - rk) || rarities[x].rank - rarities[y].rank);
    return cands[0] || r;
  }
  // Probabilité de chaque rareté pour une carte tirée dans ce booster (après repli).
  function odds(b) {
    const out = { common: 0, rare: 0, epic: 0, legend: 0 };
    const tot = order.reduce((t, r) => t + rarities[r].weight, 0);
    for (const r of order) out[tierFor(b, r)] += rarities[r].weight / tot;
    return out;
  }
  // Probabilité qu'une carte précise sorte, pour une carte tirée (hors carte QR).
  function cardOdds(c) {
    const b = boosters.find((x) => x.id === c.booster);
    const same = b.cards.filter((x) => x.rarity === c.rarity);
    const tot = same.reduce((t, x) => t + (x.w || 1), 0);
    return odds(b)[c.rarity] * ((c.w || 1) / tot);
  }

  window.SO_DATA = {
    rarities,
    rarityOrder: ['legend', 'epic', 'rare', 'common'],
    boosters,
    booster: (id) => boosters.find((b) => b.id === id),
    card: (key) => byKey[key],
    retired,
    aliases,
    tierFor,
    odds,
    cardOdds,
    total: () => boosters.reduce((t, b) => t + b.cards.length, 0),
    back: '/assets/cards/back.png',
    economy: {
      start: 1000, // ShoxCoins au premier lancement
      daily: 250, // bonus quotidien de base
      dailyStep: 50, // + par jour de série
      dailyMax: 500,
    },
  };
})();
