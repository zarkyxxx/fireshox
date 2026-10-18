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
        { id: 'ott-micro', name: '.OTT au Micro', sub: 'Blocus du lycée', rarity: 'legend', stats: [100, 61, 100], art: { emoji: '🎤', mark: 'BLOCUS DU LYCÉE' },
          text: 'Une poubelle comme estrade, un micro à la main : le blocus avait enfin son porte-parole.' },
        { id: 'le-y-megaphone', name: 'Le Y au Mégaphone', sub: 'Orateur incandescent', rarity: 'legend', ley: true, stats: [100, '∞', 100], art: { logo: true, mark: 'LE Y ! LE Y !' },
          text: 'Quand il prend le mégaphone, les Shox se lèvent toutes seules. Même celles en vitrine.' },
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
  const aliases = { 'fire/le-mec': 'fire/le-y', 'lfi/mec-megaphone': 'lfi/le-y-megaphone' };

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
