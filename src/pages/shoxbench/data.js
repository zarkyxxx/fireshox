// ShoxBench — données (textes, serveurs, phrases). Tout est fictif.
// Aucune image externe n'est attendue : le site n'utilise que /assets/logo-*.png.
window.SB_DATA = {
  isp: { name: 'ShoxNet Fibre Incandescente', ip: '256.44.12.7', plan: 'Forfait Ressort Illimité' },

  // id, ville, hébergeur, distance (km), qualité (multiplicateur de débit)
  servers: [
    { id: 'sssm', city: 'Saint-Shox-sur-Mer', host: 'ShoxNet', km: 12, q: 1.0 },
    { id: 'rebond', city: 'Rebondville-les-Ressorts', host: 'Ressorts & Fils', km: 34, q: 1.08 },
    { id: 'crampon', city: "Crampon-d'en-Haut", host: 'Lacet Mobile', km: 77, q: 0.82 },
    { id: 'amorti', city: 'Amorti-la-Vallée', host: 'Fibre Incandescente SA', km: 58, q: 1.15 },
    { id: 'lacets', city: 'Lacets-sur-Loire', host: 'Cordonnerie Numérique', km: 121, q: 0.95 },
    { id: 'port', city: 'Port-Ressort', host: 'Le Y Télécom', km: 187, q: 1.22 },
    { id: 'talon', city: 'Talon-les-Bains', host: 'Semelle Haut Débit', km: 243, q: 0.9 },
    { id: 'bourg', city: 'Bourg-la-Semelle', host: 'BrûleNet', km: 312, q: 1.05 },
    { id: 'lac', city: 'Grand-Rebond-du-Lac', host: 'Amorti Télécom', km: 405, q: 0.88 },
    { id: 'pointure', city: 'Pointure-44 (lieu-dit)', host: 'Shox & Compagnie', km: 512, q: 0.74 },
    { id: 'flamme', city: 'Flamme-sur-Seine', host: 'Incendie Networks', km: 640, q: 1.3 },
    { id: 'mont', city: 'Mont-Ressort (sommet)', host: 'Altitude Shox', km: 890, q: 0.7 },
    { id: 'ile', city: 'Île-aux-Semelles', host: 'ShoxNet Outre-Mer', km: 7400, q: 0.62 },
    { id: 'nsc', city: 'New Shox City', host: 'Shox Interstellar', km: 6120, q: 1.4 },
    { id: 'lune', city: 'Base lunaire Amorti-1', host: 'Gravité Zéro Télécom', km: 384400, q: 0.5 },
  ],

  // Graduations non linéaires de la jauge de débit (shox/s)
  scale: [0, 10, 50, 100, 250, 500, 750, 1000, 1500],

  speedVerdicts: [
    { max: 5, text: 'Connexion en chaussettes. Même un escargot en tongs te double.' },
    { max: 60, text: 'Ça rebondit, mais mollement. Pense à regonfler tes ressorts.' },
    { max: 250, text: 'Débit honnête : tes Shox font le travail sans se plaindre.' },
    { max: 600, text: 'Belle détente ! Tu télécharges une paire de Shox en 0,3 seconde.' },
    { max: 1000, text: 'Débit incandescent. Le Y approuve d’un hochement de tête.' },
    { max: 9998, text: 'Niveau légendaire. Tes ressorts ont leur propre fan-club.' },
    { max: Infinity, text: 'SURCHAUFFE ! Tes ressorts ont dépassé le mur du son. Laisse refroidir cinq minutes.' },
  ],

  // Shoxomètre : 5 catégories, du plus à gauche au plus à droite (couleurs dans style.css)
  categories: ['Extrême gauche', 'Gauche', 'Centre', 'Droite', 'Extrême droite'],

  // ------------------------------------------------------------------ Shoxomètre politique
  // Réponses : de « Tout à fait d’accord » (+2) à « Pas du tout d’accord » (−2), « Sans avis » = 0.
  // Touche clavier = rang dans cette liste (1 à 5).
  answers: [
    { v: 2, label: 'Tout à fait d’accord' },
    { v: 1, label: 'Plutôt d’accord' },
    { v: 0, label: 'Sans avis' },
    { v: -1, label: 'Plutôt pas d’accord' },
    { v: -2, label: 'Pas du tout d’accord' },
  ],

  // Affirmations. axis : 'eco' (économie) ou 'soc' (société).
  // dir : sens de « d’accord » → −1 = vers la gauche, +1 = vers la droite.
  // Équilibre vérifié : sur chaque axe, 5 affirmations « d’accord = gauche » et 5 « d’accord = droite »,
  // donc répondre « d’accord » à tout donne pile le centre (50).
  // bonus : question pour rire, affichée « ne compte pas », ignorée dans le calcul.
  questions: [
    { id: 'imp-riches', axis: 'eco', dir: -1, theme: 'Impôts', t: 'Les plus hauts revenus et les grands patrimoines devraient être davantage imposés.' },
    { id: 'immig-baisse', axis: 'soc', dir: 1, theme: 'Immigration', t: 'L’immigration en France devrait être nettement réduite.' },
    { id: 'charges-baisse', axis: 'eco', dir: 1, theme: 'Impôts', t: 'Il faut baisser les impôts et les cotisations, quitte à réduire certaines dépenses publiques.' },
    { id: 'prevention', axis: 'soc', dir: -1, theme: 'Sécurité et justice', t: 'Pour faire reculer la délinquance, la prévention et l’éducation sont plus efficaces que des peines plus lourdes.' },
    { id: 'smic', axis: 'eco', dir: -1, theme: 'Travail', t: 'Le SMIC devrait être nettement augmenté, même si cela représente un coût pour les entreprises.' },
    { id: 'europe-souv', axis: 'soc', dir: 1, theme: 'Europe et souveraineté', t: 'La France devrait reprendre à l’Union européenne certaines compétences, comme le contrôle de ses frontières.' },
    { id: 'reglementation', axis: 'eco', dir: 1, theme: 'Entreprises', t: 'Alléger les règles et les normes imposées aux entreprises les aiderait à créer des emplois.' },
    { bonus: true, id: 'bonus-costume', theme: 'Question bonus Shox', t: 'Une paire de Shox, ça se porte aussi avec un costume de mariage.' },
    { id: 'environnement', axis: 'soc', dir: -1, theme: 'Environnement', t: 'La protection de l’environnement doit passer avant la croissance économique.' },
    { id: 'services-publics', axis: 'eco', dir: -1, theme: 'Services publics', t: 'L’État devrait investir davantage dans l’hôpital et l’école publique, quitte à augmenter la dépense publique.' },
    { id: 'police', axis: 'soc', dir: 1, theme: 'Sécurité et justice', t: 'Il faudrait davantage de policiers sur le terrain et des peines plus sévères pour les récidivistes.' },
    { id: 'chomage', axis: 'eco', dir: 1, theme: 'Travail', t: 'Les allocations chômage devraient être plus strictement liées à la recherche active d’un emploi.' },
    { id: 'refugies', axis: 'soc', dir: -1, theme: 'Immigration', t: 'La France devrait accueillir davantage de réfugiés qui fuient la guerre ou les persécutions.' },
    { id: 'nationalisation', axis: 'eco', dir: -1, theme: 'Entreprises', t: 'Certains secteurs essentiels, comme l’énergie ou les autoroutes, devraient être contrôlés par l’État.' },
    { id: 'ecole-autorite', axis: 'soc', dir: 1, theme: 'Société', t: 'L’école devrait remettre davantage l’accent sur l’autorité et la discipline.' },
    { id: 'dette', axis: 'eco', dir: 1, theme: 'Économie', t: 'Réduire la dette publique devrait être une priorité, même au prix d’économies dans les services publics.' },
    { id: 'fin-de-vie', axis: 'soc', dir: -1, theme: 'Mœurs et société', t: 'L’aide active à mourir devrait être autorisée en France, dans un cadre strict.' },
    { bonus: true, id: 'bonus-statue', theme: 'Question bonus Shox', t: 'Le Y mérite une statue en ressorts sur la place de la mairie.' },
    { id: 'retraite', axis: 'eco', dir: -1, theme: 'Travail', t: 'L’âge légal de départ à la retraite devrait être abaissé.' },
    { id: 'normes-eco', axis: 'soc', dir: 1, theme: 'Environnement', t: 'Les nouvelles normes écologiques ne devraient pas peser sur le pouvoir d’achat ni sur l’industrie.' },
    { id: 'temps-travail', axis: 'eco', dir: 1, theme: 'Travail', t: 'Entreprises et salariés devraient pouvoir négocier plus librement le temps de travail, au-delà des 35 heures.' },
    { id: 'cannabis', axis: 'soc', dir: -1, theme: 'Mœurs et société', t: 'La consommation de cannabis devrait être légalisée et encadrée par l’État.' },
  ],

  // Étapes de la fausse analyse : {n} réponses comptées, {eco} et {soc} = sous-scores calculés
  politicsSteps: [
    { t: 'Lecture de tes réponses', log: ['réponses.comptées = {n}', 'réponses.bonus = 2 (ignorées, désolé)'] },
    { t: 'Scan des ressorts de tes Shox', log: ['ressort[1].rebond = {a} %', 'ressort[2].rebond = {b} %'] },
    { t: 'Calcul de l’axe économique', log: ['axe.économie = {eco} / 100', 'pied.économique = en place'] },
    { t: 'Calcul de l’axe sociétal', log: ['axe.société = {soc} / 100', 'pied.sociétal = en place'] },
    { t: 'Comparaison avec 12 845 paires de référence', log: ['paires.comparées = 12 845', 'paires.identiques = 0 (normal)'] },
    { t: 'Recalibrage de l’aiguille', log: ['aiguille.hésitation = {a} %', 'aiguille.motivation = en hausse'] },
    { t: 'Rédaction du verdict par Le Y', log: ['verdict.signé = Le Y', 'verdict.sérieux = test simplifié, pour rire'] },
  ],

  // Phrases drôles, strictement symétriques : {c} = gauche / droite, {pied} = pied gauche / pied droit.
  politicsPhrases: {
    extreme: [
      'Tes Shox ne rebondissent plus que du {pied}. Pense à les faire tourner de temps en temps.',
      'L’aiguille est partie si loin à {c} qu’elle a dû demander son chemin pour revenir.',
      'Ta Shox {c} porte tout ton poids. L’autre se demande encore ce qu’elle fait là.',
      'Ressort {c} comprimé au maximum. Le Shoxomètre conseille trois sauts sur l’autre pied.',
    ],
    modere: [
      'Tes lacets penchent légèrement à {c}. Rien qu’un double nœud ne puisse rattraper.',
      'Ta semelle {c} est un poil plus usée : tu dois démarrer tes sprints de ce pied-là.',
      'Léger penchant des ressorts côté {c}. Une petite marche en crabe et tout rentre dans l’ordre.',
      'Ton {pied} rebondit 3 % plus haut que l’autre. Rien d’alarmant, sauf pour la géométrie.',
    ],
    centre: [
      'Équilibre parfait : tes deux ressorts rebondissent exactement à la même hauteur.',
      'Ni à gauche ni à droite : tu marches pile au milieu du trottoir. Les piétons te remercient.',
      'L’aiguille n’a pas su choisir. Elle a fini au centre, comme toi devant le rayon Shox.',
      'Tes deux semelles sont usées pareil. Le Y appelle ça « l’amorti zen ».',
    ],
    // Ajoutée quand les deux axes partent de côtés opposés (écart d’au moins 40 points)
    ecart: [
      'Petit détail : ton pied économique et ton pied sociétal partent chacun de leur côté. Tu marches en canard, mais avec style.',
      'Au passage, tes deux axes ne sont pas d’accord entre eux : une Shox de chaque modèle, en somme.',
    ],
  },
};
