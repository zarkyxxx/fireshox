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
    { id: 'port', city: 'Port-Ressort', host: 'Le Mec Télécom', km: 187, q: 1.22 },
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
    { max: 1000, text: 'Débit incandescent. Le Mec aux Shox approuve d’un hochement de tête.' },
    { max: 9998, text: 'Niveau légendaire. Tes ressorts ont leur propre fan-club.' },
    { max: Infinity, text: 'SURCHAUFFE ! Tes ressorts ont dépassé le mur du son. Laisse refroidir cinq minutes.' },
  ],

  // Shoxomètre : 5 catégories, du plus à gauche au plus à droite (couleurs dans style.css)
  categories: ['Extrême gauche', 'Gauche', 'Centre', 'Droite', 'Extrême droite'],

  // Étapes de la fausse analyse (les mêmes pour tout le monde)
  politicsSteps: [
    { t: 'Scan des ressorts de tes Shox', log: ['ressort[1].rebond = {a} %', 'ressort[2].rebond = {b} %', 'ressort[3].rebond = {c} %'] },
    { t: 'Mesure de l’usure des semelles', log: ['semelle.gauche.usure = {a} %', 'semelle.droite.usure = {b} %'] },
    { t: 'Analyse du sens de laçage', log: ['lacets.croisements = {n}', 'nœud = « double, réglementaire »'] },
    { t: 'Interrogation du ressort central', log: ['ressort.central : « sans commentaire »', 'ressort.central.humeur = rebondissante'] },
    { t: 'Comparaison avec 12 845 paires de référence', log: ['paires.comparées = 12 845', 'paires.identiques = 0 (normal)'] },
    { t: 'Recalibrage de l’aiguille', log: ['aiguille.hésitation = {a} %', 'aiguille.motivation = en hausse'] },
    { t: 'Rédaction du verdict par le Mec aux Shox', log: ['verdict.signé = oui', 'verdict.valeur_scientifique = 0'] },
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
      'Tes deux semelles sont usées pareil. Le Mec aux Shox appelle ça « l’amorti zen ».',
    ],
  },
};
