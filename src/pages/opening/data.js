// Shox Opening — données des boosters et des cartes.
// Images attendues (déposer les fichiers aux bons noms, rien d'autre à changer) :
//   illustration de carte : /assets/cards/<booster>/<id-carte>.png   (portrait 2:3, sans texte)
//   face du paquet        : /assets/cards/boosters/<booster>.png     (portrait 2:3, sans texte)
//   dos de carte          : /assets/cards/back.png                   (portrait 2:3, sans texte)
// Tant qu'une image manque, un rendu de remplacement en CSS est affiché.
// Les prompts ChatGPT correspondants sont dans docs/PROMPTS_CARTES.md.
(function () {
  'use strict';

  const rarities = {
    common: { id: 'common', label: 'Commune', plural: 'Communes', rank: 1, weight: 58, color: '#9aa3ad', recycle: 5, stars: 1 },
    rare: { id: 'rare', label: 'Rare', plural: 'Rares', rank: 2, weight: 27, color: '#3d9bff', recycle: 15, stars: 2 },
    epic: { id: 'epic', label: 'Épique', plural: 'Épiques', rank: 3, weight: 10, color: '#b44dff', recycle: 50, stars: 3 },
    legend: { id: 'legend', label: 'Légendaire', plural: 'Légendaires', rank: 4, weight: 5, color: '#ffb000', recycle: 200, stars: 4 },
  };

  // stats : 3 valeurs dans l'ordre de statLabels du booster (nombre 0-100 ou texte).
  // art   : rendu de remplacement — emoji central, mark (gros texte de fond), logo (le mec du logo).
  // w     : poids du tirage à l'intérieur de sa rareté (1 par défaut).
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
        { id: 'joueur-218', name: 'Joueur 218', sub: 'Pieds plats', rarity: 'common', stats: [18, 4, 35], art: { emoji: '🦶', mark: '218' },
          text: 'A oublié ses Shox au vestiaire. Fait tout le jeu en chaussettes.' },
        { id: 'garde-rond', name: 'Garde Rond', sub: 'Shox roses réglementaires', rarity: 'common', stats: [40, 22, 61], art: { mask: 'circle', mark: '○' },
          text: 'Ne parle jamais. Rebondit très discrètement pendant les rondes de nuit.' },
        { id: 'garde-triangle', name: 'Garde Triangle', sub: 'Toujours dans un angle mort', rarity: 'common', stats: [38, 27, 70], art: { mask: 'triangle', mark: '△' },
          text: 'Interdit de courir dans les couloirs. Personne n\'a dit qu\'on ne pouvait pas rebondir.' },
        { id: 'dalgona', name: 'Biscuit Dalgona', sub: 'Épreuve n°2', rarity: 'common', stats: [12, 8, 50], art: { emoji: '🍪', mark: '02' },
          text: 'Découpe la Shox avec une aiguille sans casser le biscuit. Les ressorts, c\'est le plus dur.' },
        { id: 'billes', name: 'Billes à Ressorts', sub: 'Épreuve n°4', rarity: 'common', stats: [30, 45, 12], art: { emoji: '🎱', mark: '04' },
          text: 'Elles rebondissent jusqu\'au plafond. La partie dure depuis trois jours.' },
        { id: 'garde-carre', name: 'Garde Carré', sub: 'Chef d\'équipe', rarity: 'rare', stats: [58, 41, 66], art: { mask: 'square', mark: '□' },
          text: 'Donne les ordres au mégaphone. Ses Shox grincent quand il bluffe.' },
        { id: 'poupee', name: 'La Poupée Géante', sub: '« 1, 2, 3… Shox ! »', rarity: 'rare', stats: [99, 0, 20], art: { emoji: '🚦', mark: '01' },
          text: 'Feu vert : on rebondit. Feu rouge : on ne bouge plus. Même les ressorts.' },
        { id: 'pont-de-verre', name: 'Pont de Verre', sub: 'Épreuve n°5', rarity: 'rare', stats: [25, 77, 40], art: { emoji: '🌉', mark: '05' },
          text: 'Une dalle sur deux est en verre trempé. L\'autre est un trampoline.' },
        { id: 'recruteur', name: 'Le Recruteur', sub: 'Une partie de tape-Shox ?', rarity: 'epic', stats: [72, 68, 88], art: { emoji: '💼', mark: '?' },
          text: 'Il t\'offre 1 000 ShoxCoins si tu retournes sa Shox d\'une pichenette. Personne n\'a jamais gagné.' },
        { id: 'maitre-du-jeu', name: 'Le Maître du Jeu', sub: 'Masque noir, canapé en cuir', rarity: 'epic', stats: [90, 64, 95], art: { emoji: '🎭', mark: 'VIP' },
          text: 'Il regarde tout depuis sa loge en sirotant du jus de ressort.' },
        { id: 'tirelire', name: 'La Tirelire Géante', sub: '45,6 milliards de ShoxCoins', rarity: 'legend', w: 1.4, stats: [100, 12, 3], art: { emoji: '🐷', mark: '₪' },
          text: 'Suspendue au plafond. Chaque fois qu\'un joueur trébuche, elle fait « ding ».' },
        { id: 'joueur-001', name: 'Joueur 001', sub: 'Le Mec aux Shox', rarity: 'legend', w: 1, mec: true, stats: [100, '∞', 0], art: { logo: true, mark: '001' },
          text: 'Il a gagné toutes les épreuves en rebondissant. Personne ne sait comment il est entré.' },
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
        { id: 'semelle', name: 'Semelle Braise', sub: 'Amorti 100 % charbon', rarity: 'common', stats: [70, 33, 22], art: { emoji: '👟', mark: '°C' },
          text: 'Laisse des traces fumantes sur le parquet. Tes parents adorent.' },
        { id: 'ressort', name: 'Ressort Chauffé', sub: 'Pièce détachée officielle', rarity: 'common', stats: [58, 60, 15], art: { emoji: '🌀', mark: '°C' },
          text: 'Un ressort, deux ressorts… Après le quatrième, on commence à voler.' },
        { id: 'chaussette', name: 'Chaussette Ignifugée', sub: 'Le vrai héros méconnu', rarity: 'common', stats: [95, 2, 9], art: { emoji: '🧦', mark: '°C' },
          text: 'Résiste à 1 200 °C. Ne résiste pas à la machine à laver.' },
        { id: 'boite', name: 'Boîte Fumante', sub: 'Livraison express', rarity: 'common', stats: [48, 20, 44], art: { emoji: '📦', mark: '°C' },
          text: 'Ne pas ouvrir à l\'intérieur. Ni à l\'extérieur, en fait.' },
        { id: 'pompier', name: 'Le Pompier Dépassé', sub: 'Intervention n°4 456', rarity: 'rare', stats: [12, 47, 58], art: { emoji: '🚒', mark: '18' },
          text: 'Il est venu éteindre un feu. Il est reparti avec une paire et des flammes dans les yeux.' },
        { id: 'phenix', name: 'Shox Phénix', sub: 'Renaît de ses cendres', rarity: 'rare', stats: [81, 66, 72], art: { emoji: '🦅', mark: '°C' },
          text: 'Brûle au premier footing, renaît au deuxième. Garantie à vie.' },
        { id: 'ecouteurs', name: 'Écouteurs Filaires', sub: 'Tout droit sortis du logo', rarity: 'rare', stats: [40, 35, 90], art: { emoji: '🎧', mark: '♪' },
          text: 'Ne captent qu\'une seule fréquence : celle du feu.' },
        { id: 'tornade', name: 'La Tornade de Shox', sub: 'Six paires en orbite', rarity: 'epic', stats: [88, 92, 80], art: { emoji: '🌪️', mark: '°C' },
          text: 'Si tu entends un sifflement de ressorts, c\'est déjà trop tard.' },
        { id: 'chignon', name: 'Le Chignon de Feu', sub: 'Coiffure certifiée 1 200 °C', rarity: 'epic', mec: true, stats: [97, 70, 99], art: { emoji: '☄️', mark: '°C' },
          text: 'Il ne se coiffe pas : il attise.' },
        { id: 'dragon', name: 'Le Dragon Shox', sub: 'Gardien de l\'entrepôt', rarity: 'legend', w: 1.4, stats: [99, 85, 93], art: { emoji: '🐉', mark: '°C' },
          text: 'Il ne crache pas du feu : il crache des ressorts. Chauffés à blanc, quand même.' },
        { id: 'le-mec', name: 'Le Mec aux Shox', sub: 'Forme incandescente', rarity: 'legend', w: 1, mec: true, stats: [100, '∞', 100], art: { logo: true, mark: '°C' },
          text: 'Au centre de la tornade, il sourit. Il a déjà choisi sa paire.' },
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
        { id: 'banderole', name: 'La Banderole', sub: '« Rendez-nous les Shox »', rarity: 'common', stats: [20, 5, 66], art: { banner: 'RENDEZ-NOUS LES SHOX', mark: 'DES RESSORTS POUR TOUS' },
          text: 'Trois mètres de tissu, quatre fautes d\'orthographe, zéro regret.' },
        { id: 'tract', name: 'Le Tract Brûlant', sub: 'Papier ignifugé', rarity: 'common', stats: [10, 3, 41], art: { emoji: '📄', mark: 'AMORTI POUR TOUS' },
          text: 'Distribué à la sortie du métro. Lu par personne. Brûle quand même.' },
        { id: 'megaphone', name: 'Le Mégaphone Rouge', sub: 'Volume : 11', rarity: 'common', stats: [97, 8, 55], art: { emoji: '📢', mark: 'PLUS FORT !' },
          text: 'Message : inaudible. Ambiance : incroyable.' },
        { id: 'ballon', name: 'Ballon Rouge', sub: 'Gonflé à bloc', rarity: 'common', stats: [5, 88, 30], art: { emoji: '🎈', mark: 'ON LÂCHE RIEN' },
          text: 'S\'envole à chaque rebond du cortège. On ne l\'a jamais revu.' },
        { id: 'cheffe-cortege', name: 'La Cheffe de Cortège', sub: 'Connaît tous les slogans', rarity: 'rare', stats: [86, 54, 91], art: { emoji: '📣', mark: 'SEMELLES AU POUVOIR' },
          text: 'Même ceux d\'après-demain. Surtout ceux qui riment avec « ressort ».' },
        { id: 'camion-sono', name: 'Le Camion Sono', sub: 'Basses à 140 dB', rarity: 'rare', stats: [100, 75, 62], art: { emoji: '🚚', mark: 'BOUM BOUM SHOX' },
          text: 'Les Shox rebondissent toutes seules quand il passe. Les vitres aussi.' },
        { id: 'tribun', name: 'Le Tribun du Pavé', sub: 'Discours de trois heures', rarity: 'rare', stats: [92, 30, 88], art: { emoji: '🎤', mark: 'ET J\'AJOUTE…' },
          text: 'Il a tout abordé : le prix des lacets, l\'amorti, la justice semellaire.' },
        { id: 'assemblee', name: 'L\'Assemblée Debout', sub: 'Personne ne s\'assoit', rarity: 'epic', stats: [78, 90, 96], art: { emoji: '✊', mark: 'DEBOUT !' },
          text: 'Vote à main levée, adopté à pied levé. Les ressorts, c\'est fait pour ça.' },
        { id: 'hologramme', name: 'Le Meeting Hologramme', sub: 'Dans trois villes à la fois', rarity: 'epic', stats: [95, 60, 99], art: { emoji: '📡', mark: 'LILLE · LYON · MARSEILLE' },
          text: 'L\'orateur est en hologramme. Ses Shox, elles, sont bien réelles.' },
        { id: 'grande-marche', name: 'La Grande Marche', sub: 'Un million de ressorts', rarity: 'legend', w: 1.4, stats: [99, 99, 99], art: { emoji: '🚩', mark: 'LE REBOND C\'EST NOUS' },
          text: 'Le bitume a rebondi. Les journalistes aussi.' },
        { id: 'mec-megaphone', name: 'Le Mec au Mégaphone', sub: 'Orateur incandescent', rarity: 'legend', w: 1, mec: true, stats: [100, '∞', 100], art: { logo: true, mark: 'LE MEC ! LE MEC !' },
          text: 'Quand il prend le micro, les Shox se lèvent toutes seules. Même celles en vitrine.' },
      ],
    },
  ];

  // Numéro dans le booster (01 à 12) et clé d'inventaire « booster/id ».
  for (const b of boosters) {
    b.cards.forEach((c, i) => {
      c.no = i + 1;
      c.booster = b.id;
      c.key = b.id + '/' + c.id;
      c.img = '/assets/cards/' + b.id + '/' + c.id + '.png';
    });
    b.pack = '/assets/cards/boosters/' + b.id + '.png';
    b.game = 'fireshox://jeux/?game=' + b.id;
  }

  const byKey = {};
  for (const b of boosters) for (const c of b.cards) byKey[c.key] = c;

  window.SO_DATA = {
    rarities,
    rarityOrder: ['legend', 'epic', 'rare', 'common'],
    boosters,
    booster: (id) => boosters.find((b) => b.id === id),
    card: (key) => byKey[key],
    back: '/assets/cards/back.png',
    economy: {
      start: 1000, // ShoxCoins au premier lancement
      daily: 250, // bonus quotidien de base
      dailyStep: 50, // + par jour de série
      dailyMax: 500,
    },
  };
})();
