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
  // bonus : question facultative sur l’univers Fire Shox (« Passer » possible), ignorée dans le calcul.
  //   short = libellé court du récapitulatif ; choices = réponses propres (sinon les 5 réponses ci-dessus),
  //   fan = enthousiasme de la réponse, pour « Ton verdict Shox ».
  questions: [
    { id: 'impots-vol', axis: 'eco', dir: 1, theme: 'Impôts', t: '« Les impôts, c’est du vol. »' },
    { id: 'velo', axis: 'soc', dir: -1, theme: 'Écologie', t: '« Le vélo partout, les voitures nulle part. »' },
    { bonus: true, id: 'b-jack', short: 'Jack Shi au Tour de France à 80 ans', t: 'Jack Shi pourrait gagner le Tour de France à 80 ans.' },
    { id: 'taxer-riches', axis: 'eco', dir: -1, theme: 'Impôts', t: '« Taxer les riches, c’est la base. »' },
    { id: 'autorite', axis: 'soc', dir: 1, theme: 'Société', t: '« Un peu d’autorité, ça n’a jamais tué personne. »' },
    { id: 'patron-voiture', axis: 'eco', dir: 1, theme: 'Entreprises', t: '« Un bon patron, il a le droit de rouler en grosse voiture. »' },
    { bonus: true, id: 'b-vitesses', short: '52 vitesses, pas assez', t: '52 vitesses, c’est pas assez.' },
    { id: 'conges', axis: 'eco', dir: -1, theme: 'Travail', t: '« Les vacances, c’est sacré, on touche pas aux congés. »' },
    { id: 'prison-education', axis: 'soc', dir: -1, theme: 'Justice', t: '« La prison, ça règle rien : il faut miser sur l’éducation. »' },
    { bonus: true, id: 'b-fausses', short: 'Les fausses Shox de Le Y', t: 'Les fausses Shox de Le Y valent les vraies.' },
    { id: 'travailler-plus', axis: 'eco', dir: 1, theme: 'Travail', t: '« Qui veut travailler plus doit pouvoir gagner plus. »' },
    { id: 'europe-main', axis: 'soc', dir: 1, theme: 'Europe', t: '« L’Europe décide de tout, faut reprendre la main chez nous. »' },
    { bonus: true, id: 'b-boussole', short: 'La Boussole a toujours raison', t: 'La Boussole indique toujours le bon chemin.' },
    { id: 'smic', axis: 'eco', dir: -1, theme: 'Salaires', t: '« Le SMIC, faut le monter, et vite. »' },
    { id: 'terre-accueil', axis: 'soc', dir: -1, theme: 'Immigration', t: '« La France, c’est une terre d’accueil, point. »' },
    { id: 'etat-ceinture', axis: 'eco', dir: 1, theme: 'Dépenses publiques', t: '« L’État dépense trop, faut serrer la ceinture. »' },
    { bonus: true, id: 'b-tralalero', short: 'Tralalero Shoxalà, Ballon d’Or', t: 'Tralalero Shoxalà mérite le Ballon d’Or.' },
    { id: 'policiers', axis: 'soc', dir: 1, theme: 'Sécurité', t: '« Plus de policiers dans la rue, et on dormira mieux. »' },
    { id: 'hopital-ecole', axis: 'eco', dir: -1, theme: 'Services publics', t: '« L’hôpital et l’école, ça n’a pas de prix : on paie ce qu’il faut. »' },
    { bonus: true, id: 'b-btbf', short: 'BTBF enseigné à l’école', t: 'BTBF devrait être enseigné à l’école.' },
    { id: 'chacun-sa-vie', axis: 'soc', dir: -1, theme: 'Mœurs', t: '« Chacun fait ce qu’il veut de sa vie, tant qu’il gêne personne. »' },
    { id: 'paperasse', axis: 'eco', dir: 1, theme: 'Entreprises', t: '« Moins de paperasse, et les entreprises embaucheront à tour de bras. »' },
    { bonus: true, id: 'b-dtn', short: 'DTN président', t: 'DTN ferait un bon président.' },
    { id: 'ceux-qui-sont-la', axis: 'soc', dir: 1, theme: 'Immigration', t: '« Avant d’accueillir plus de monde, on s’occupe déjà de ceux qui sont là. »' },
    { id: 'retraite-tot', axis: 'eco', dir: -1, theme: 'Retraite', t: '« La retraite, plus tôt on la prend, mieux c’est. »' },
    { bonus: true, id: 'b-axel', short: 'Axel sourira un jour', t: 'Axel va finir par sourire un jour.' },
    { id: 'cannabis', axis: 'soc', dir: -1, theme: 'Mœurs', t: '« Le cannabis, faudrait le légaliser une bonne fois pour toutes. »' },
    { id: 'ecolo-voiture', axis: 'soc', dir: 1, theme: 'Écologie', t: '« L’écologie, d’accord, mais pas en touchant à ma voiture. »' },
    {
      bonus: true, id: 'b-dalgona', short: 'Le Dalgona Shox', t: 'Le Dalgona Shox : on le mange ou on l’encadre ?',
      choices: [
        { label: 'On le mange', short: 'Mangé', fan: 1 },
        { label: 'On l’encadre', short: 'Encadré', fan: 2 },
        { label: 'On le mange, puis on encadre l’emballage', short: 'Les deux', fan: 2 },
        { label: 'Aucune idée, il me fait peur', short: 'Peur', fan: -1 },
      ],
    },
  ],

  // Libellés courts des 5 réponses (récapitulatif des bonus)
  answersShort: ['Tout à fait', 'Plutôt oui', 'Sans avis', 'Plutôt non', 'Pas du tout'],

  // « Ton verdict Shox » : selon l’enthousiasme moyen aux questions bonus (de +2 à −2)
  bonusVerdicts: [
    { min: 1.2, text: 'Fan absolu de l’univers Fire Shox : tu y crois plus fort que La Boussole elle-même. Le Y t’adopte officiellement.' },
    { min: 0.3, text: 'Bon public : tu soutiens l’univers Fire Shox, avec juste ce qu’il faut de recul.' },
    { min: -0.3, text: 'Neutre comme une Shox suisse. Le Y prend note, sans rancune.' },
    { min: -1.2, text: 'Sceptique du rebond : il en faudra plus pour te convaincre. Le Y y travaille.' },
    { min: -Infinity, text: 'Tu ne crois en rien, même pas en Tralalero Shoxalà. Le Y est vexé (il s’en remettra).' },
  ],
  bonusSkipped: 'Tu as passé toutes les questions bonus. Prudent comme un ressort neuf : on respecte.',

  // Étapes de la fausse analyse : {n} réponses comptées, {eco} et {soc} = sous-scores calculés
  politicsSteps: [
    { t: 'Lecture de tes réponses', log: ['réponses.comptées = {n}', 'réponses.bonus = {nb} (ignorées, désolé)'] },
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
