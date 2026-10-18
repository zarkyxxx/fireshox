// Wiki Shox — données de l'encyclopédie (fireshox://wiki/).
// =====================================================================
// Le chef de projet n'a qu'à REMPLIR les textes vides ('') et déposer les images.
//
// IMAGES (déposer les fichiers, rien d'autre à faire) :
//   photo principale :  F:\fireshox\assets\wiki\<slug>\main.jpg
//   galerie          :  F:\fireshox\assets\wiki\<slug>\1.jpg, 2.jpg, 3.jpg…
//   (.png ou .webp marchent aussi : si main.jpg manque, le site essaie main.png puis main.webp)
//   Un nom de fichier seul ('main.jpg') est cherché dans /assets/wiki/<slug>/ ;
//   un chemin qui commence par '/' est pris tel quel (ex. '/assets/logo.png').
//   Tant qu'une image manque, un joli emplacement « Photo à venir » s'affiche.
//
// TEXTES : du HTML simple (<p>, <b>, <i>, <ul><li>, <blockquote>, <table class="wikitable">…).
//   Raccourcis pratiques, utilisables partout (résumé, sections, infobox, légendes) :
//     [[theo]]  ou  [[Théo]]          → lien vers l'entrée (par slug ou par titre)
//     [[theo|le grand Théo]]          → lien avec un autre texte
//     {{réf}}                         → [réf. nécessaire]
//     {{note|Texte de la note}}       → note numérotée [1], listée dans « Notes et références »
//   Citations : '<blockquote>« Phrase. »<cite>Auteur</cite></blockquote>'
//
// CHAMPS d'une entrée :
//   slug       identifiant dans l'adresse (fireshox://wiki/#theo) et nom du dossier d'images
//   titre      titre affiché (et dans la barre latérale)
//   ebauche    true = bandeau « Cette page attend ses archives officielles » (mettre false une fois remplie)
//   resume     paragraphe d'introduction (vide = phrase neutre automatique)
//   photo      photo principale de l'infobox ; legende = texte sous la photo
//   infobox    liste de [Libellé, Valeur] ; une valeur vide s'affiche « à compléter »
//              une ligne ['# Titre de bloc'] crée un sous-titre dans l'infobox
//   sections   liste de [Titre, HTML] (sous-section : [Titre, HTML, 3]) ; HTML vide = section « à compléter »
//   galerie    liste de [fichier, légende]
//   voirAussi  liste de slugs (liens en bas de page)
//   categories liste de noms (cliquables : page de catégorie automatique)
// =====================================================================

// Champs proposés pour les ébauches (vides : rien n'est inventé sur ces personnes).
window.WIKI_CHAMPS = ['Nom complet', 'Surnom(s)', 'Première apparition', 'Spécialité', 'Signe distinctif', 'Citation fétiche'];

window.WIKI_ENTREES = [
  // -------------------------------------------------------------------
  {
    slug: 'ott',
    titre: '.OTT',
    ebauche: true,
    resume: '',
    photo: 'main.jpg',
    legende: '',
    infobox: [['Nom complet', ''], ['Surnom(s)', ''], ['Première apparition', ''], ['Spécialité', ''], ['Signe distinctif', ''], ['Citation fétiche', '']],
    sections: [['Biographie', ''], ['Origines', ''], ['Faits marquants', ''], ['Citations célèbres', '']],
    galerie: [['1.jpg', ''], ['2.jpg', ''], ['3.jpg', '']],
    voirAussi: ['les-shoxs'],
    categories: [],
  },
  // -------------------------------------------------------------------
  {
    slug: 'le-y',
    titre: 'LE Y',
    ebauche: true,
    resume: '',
    photo: 'main.jpg',
    legende: '',
    infobox: [['Nom complet', ''], ['Surnom(s)', ''], ['Première apparition', ''], ['Spécialité', ''], ['Signe distinctif', ''], ['Citation fétiche', '']],
    sections: [['Biographie', ''], ['Origines', ''], ['Faits marquants', ''], ['Citations célèbres', '']],
    galerie: [['1.jpg', ''], ['2.jpg', ''], ['3.jpg', '']],
    voirAussi: ['les-shoxs'],
    categories: [],
  },
  // -------------------------------------------------------------------
  // Seul article « inventé » : la légende des Shox dans l'univers Fire Shox.
  {
    slug: 'les-shoxs',
    titre: 'LES SHOXS',
    ebauche: false,
    resume:
      '<p>Les <b>Shoxs</b> (prononcé /ʃɔks/, parfois « Chox » chez les anciens) sont des chaussures légendaires à ressorts ' +
      'dont l\'amorti, réputé infini, serait à l\'origine du feu qui alimente le navigateur <b>Fire Shox</b>. ' +
      'Selon la tradition, une paire bien entretenue peut rebondir jusqu\'à la stratosphère, voire au-delà les jours de grand vent.{{réf}}</p>' +
      '<p>Objet de culte, de science et de nombreux bleus aux genoux, les Shoxs sont aujourd\'hui considérées comme ' +
      'la <b>quatrième forme de transport</b>, après la marche, le vélo et le toboggan.{{note|Classement établi par le Comité international du Rebond, qui ne s\'est réuni qu\'une fois, en plein saut.}}</p>',
    photo: '/assets/logo.png',
    legende: 'Le <b>Tourbillon Incandescent</b>, emblème officiel de Fire Shox : six Shoxs en orbite stable.{{réf}}',
    infobox: [
      ['# Généralités'],
      ['Autres noms', 'Les Ressorts Sacrés, les Rebondissantes, « les Shox à ressorts »'],
      ['Type', 'Chaussure à ressorts (catégorie poids lourd du confort)'],
      ['Composition', 'Caoutchouc, métal, fierté'],
      ['Ressorts', '4 par talon (officiellement){{note|Certains témoins en ont compté 5. Ils ont été priés de recompter.}}'],
      ['# Caractéristiques'],
      ['Température', 'Entre 900 et 1 200 °C (mode TURBO : non mesurable)'],
      ['Amorti', '100 % incandescent'],
      ['Vitesse de pointe', '999 Mbps{{réf}}'],
      ['Première apparition', 'Inconnue ; « bien avant le Wi-Fi »'],
      ['Statut', 'En rotation permanente'],
    ],
    sections: [
      ['Étymologie',
        '<p>Le mot <i>Shox</i> viendrait du bruit que fait un ressort comprimé au moment où il se libère : <i>chhh… OX !</i> ' +
        'Le « s » final de <b>Shoxs</b>, longtemps combattu par les puristes, est aujourd\'hui accepté comme un « s de majesté ».{{note|Décision prise à l\'unanimité des personnes présentes, c\'est-à-dire personne, la salle étant en train de rebondir.}}</p>'],
      ['Histoire', ''],
      ['Les origines', '<p>Les plus anciennes traces de Shoxs ont été retrouvées dans une cave, sous la forme de deux empreintes séparées de quatre mètres. ' +
        'Les archéologues en ont déduit soit l\'existence d\'un géant aux pieds minuscules, soit l\'invention du ressort. La seconde hypothèse l\'a emporté de justesse.{{réf}}</p>', 3],
      ['Le Grand Rebond', '<p>Un jour d\'été particulièrement chaud, un porteur de Shoxs aurait sauté si fort que ses semelles ont pris feu. ' +
        'Au lieu de retomber, il a continué de rebondir pendant trois jours, laissant derrière lui une traînée orange encore visible par temps clair. ' +
        'Cet épisode, connu sous le nom de <b>Grand Rebond</b>, marque le début de l\'<b>ère incandescente</b>.</p>', 3],
      ['Le Tourbillon Incandescent', '<p>Le phénomène le plus célèbre lié aux Shoxs est le <b>Tourbillon Incandescent</b> : plusieurs paires se mettent spontanément ' +
        'en orbite et tournent dans un anneau de flammes. Ce motif, jugé « extrêmement stylé » par la communauté scientifique, est devenu l\'emblème de Fire Shox (voir l\'infobox).</p>', 3],
      ['Fonctionnement',
        '<p>Le principe des Shoxs repose sur la <b>loi de Hooke-Shox</b>, qui stipule que la force de rebond est proportionnelle à la compression du ressort, ' +
        'multipliée par le niveau de confiance du porteur :</p>' +
        '<p class="formula">F = −k · x · 🔥</p>' +
        '<table class="wikitable"><caption>Modèles de Shoxs recensés</caption>' +
        '<tr><th>Modèle</th><th>Ressorts</th><th>Amorti</th><th>Température</th></tr>' +
        '<tr><td>Shox Classique</td><td>4</td><td>Moelleux</td><td>900 °C</td></tr>' +
        '<tr><td>Shox Braise</td><td>4 + 1 caché</td><td>Très moelleux</td><td>1 050 °C</td></tr>' +
        '<tr><td>Shox Turbo</td><td>Trop</td><td>Gravitationnel</td><td>Non mesurable{{réf}}</td></tr>' +
        '</table>'],
      ['L\'incandescence', '<p>Contrairement à une idée reçue, les Shoxs ne brûlent pas : elles <i>rayonnent</i>. ' +
        'La chaleur produite par les ressorts est intégralement recyclée en vitesse de navigation, ce qui explique les performances du navigateur.{{note|Mesures réalisées sur <a href="fireshox://shoxbench/">ShoxBench</a>, le banc d\'essai officiel.}}</p>', 3],
      ['Dans la culture',
        '<p>Les Shoxs ont inspiré un navigateur web entier, <b>Fire Shox</b>, ainsi que plusieurs de ses sites : ' +
        '<a href="fireshox://opening/">Shox Opening</a> (ouverture de packs de cartes), <a href="fireshox://shoxbench/">ShoxBench</a> (mesure de performances) ' +
        'et la présente encyclopédie.</p>' +
        '<p>Dans le langage courant, « avoir les Shox » signifie être en pleine forme, et « faire un Shox » désigne un retour spectaculaire après une chute.{{réf}}</p>'],
      ['Controverses',
        '<ul>' +
        '<li>Le débat « ressorts ronds ou ressorts carrés » divise encore la communauté. Les ressorts carrés n\'existent pas, ce qui n\'a jamais arrêté personne.</li>' +
        '<li>En 2019, une expérience visant à mesurer la hauteur maximale d\'un rebond a été interrompue, le sujet n\'étant pas redescendu avant le goûter.{{réf}}</li>' +
        '<li>Certains affirment qu\'il est impossible de marcher discrètement en Shoxs. Ils ont raison.</li>' +
        '</ul>'],
      ['Citations célèbres',
        '<blockquote>« Un Shox ne s\'use pas, il s\'aguerrit. »<cite>Proverbe des ressorts</cite></blockquote>' +
        '<blockquote>« J\'ai sauté une fois. Je ne suis jamais vraiment retombé. »<cite>Témoin anonyme du Grand Rebond</cite></blockquote>' +
        '<blockquote>« Tout ce qui monte en Shox finit par redescendre… mais avec style. »<cite>Théorème du ressort</cite></blockquote>'],
    ],
    galerie: [['/assets/logo.png', 'Le Tourbillon Incandescent (vue officielle)'], ['1.jpg', ''], ['2.jpg', ''], ['3.jpg', '']],
    voirAussi: [],
    categories: ['Légende de Fire Shox', 'Chaussure à ressorts', 'Phénomène incandescent', 'Article de qualité (auto-proclamé)'],
  },
  // -------------------------------------------------------------------
  {
    slug: 'jack-shi',
    titre: 'Jack Shi',
    ebauche: true,
    resume: '',
    photo: 'main.jpg',
    legende: '',
    infobox: [['Nom complet', ''], ['Surnom(s)', ''], ['Première apparition', ''], ['Spécialité', ''], ['Signe distinctif', ''], ['Citation fétiche', '']],
    sections: [['Biographie', ''], ['Origines', ''], ['Faits marquants', ''], ['Citations célèbres', '']],
    galerie: [['1.jpg', ''], ['2.jpg', ''], ['3.jpg', '']],
    voirAussi: ['les-shoxs'],
    categories: [],
  },
  // -------------------------------------------------------------------
  {
    slug: 'ancien-lune',
    titre: 'L\'Ancien Lune',
    ebauche: true,
    resume: '',
    photo: 'main.jpg',
    legende: '',
    infobox: [['Nom complet', ''], ['Surnom(s)', ''], ['Première apparition', ''], ['Spécialité', ''], ['Signe distinctif', ''], ['Citation fétiche', '']],
    sections: [['Biographie', ''], ['Origines', ''], ['Faits marquants', ''], ['Citations célèbres', '']],
    galerie: [['1.jpg', ''], ['2.jpg', ''], ['3.jpg', '']],
    voirAussi: ['les-shoxs'],
    categories: [],
  },
  // -------------------------------------------------------------------
  {
    slug: 'meusieur-ia',
    titre: 'Meusieur IA',
    ebauche: true,
    resume: '',
    photo: 'main.jpg',
    legende: '',
    infobox: [['Nom complet', ''], ['Surnom(s)', ''], ['Première apparition', ''], ['Spécialité', ''], ['Signe distinctif', ''], ['Citation fétiche', '']],
    sections: [['Biographie', ''], ['Origines', ''], ['Faits marquants', ''], ['Citations célèbres', '']],
    galerie: [['1.jpg', ''], ['2.jpg', ''], ['3.jpg', '']],
    voirAussi: ['les-shoxs'],
    categories: [],
  },
  // -------------------------------------------------------------------
  {
    slug: 'la-pomme',
    titre: 'La Pomme',
    ebauche: true,
    resume: '',
    photo: 'main.jpg',
    legende: '',
    infobox: [['Nom complet', ''], ['Surnom(s)', ''], ['Première apparition', ''], ['Spécialité', ''], ['Signe distinctif', ''], ['Citation fétiche', '']],
    sections: [['Biographie', ''], ['Origines', ''], ['Faits marquants', ''], ['Citations célèbres', '']],
    galerie: [['1.jpg', ''], ['2.jpg', ''], ['3.jpg', '']],
    voirAussi: ['les-shoxs'],
    categories: [],
  },
  // -------------------------------------------------------------------
  {
    slug: 'la-boussole',
    titre: 'La Boussole',
    ebauche: true,
    resume: '',
    photo: 'main.jpg',
    legende: '',
    infobox: [['Nom complet', ''], ['Surnom(s)', ''], ['Première apparition', ''], ['Spécialité', ''], ['Signe distinctif', ''], ['Citation fétiche', '']],
    sections: [['Biographie', ''], ['Origines', ''], ['Faits marquants', ''], ['Citations célèbres', '']],
    galerie: [['1.jpg', ''], ['2.jpg', ''], ['3.jpg', '']],
    voirAussi: ['les-shoxs'],
    categories: [],
  },
  // -------------------------------------------------------------------
  {
    slug: 'theo',
    titre: 'Théo',
    ebauche: true,
    resume: '',
    photo: 'main.jpg',
    legende: '',
    infobox: [['Nom complet', ''], ['Surnom(s)', ''], ['Première apparition', ''], ['Spécialité', ''], ['Signe distinctif', ''], ['Citation fétiche', '']],
    sections: [['Biographie', ''], ['Origines', ''], ['Faits marquants', ''], ['Citations célèbres', '']],
    galerie: [['1.jpg', ''], ['2.jpg', ''], ['3.jpg', '']],
    voirAussi: ['les-shoxs'],
    categories: [],
  },
  // -------------------------------------------------------------------
  {
    slug: 'lucas',
    titre: 'Lucas',
    ebauche: true,
    resume: '',
    photo: 'main.jpg',
    legende: '',
    infobox: [['Nom complet', ''], ['Surnom(s)', ''], ['Première apparition', ''], ['Spécialité', ''], ['Signe distinctif', ''], ['Citation fétiche', '']],
    sections: [['Biographie', ''], ['Origines', ''], ['Faits marquants', ''], ['Citations célèbres', '']],
    galerie: [['1.jpg', ''], ['2.jpg', ''], ['3.jpg', '']],
    voirAussi: ['les-shoxs'],
    categories: [],
  },
  // -------------------------------------------------------------------
  {
    slug: 'dorian',
    titre: 'Dorian',
    ebauche: true,
    resume: '',
    photo: 'main.jpg',
    legende: '',
    infobox: [['Nom complet', ''], ['Surnom(s)', ''], ['Première apparition', ''], ['Spécialité', ''], ['Signe distinctif', ''], ['Citation fétiche', '']],
    sections: [['Biographie', ''], ['Origines', ''], ['Faits marquants', ''], ['Citations célèbres', '']],
    galerie: [['1.jpg', ''], ['2.jpg', ''], ['3.jpg', '']],
    voirAussi: ['les-shoxs'],
    categories: [],
  },
  // -------------------------------------------------------------------
  {
    slug: 'amaury',
    titre: 'Amaury',
    ebauche: true,
    resume: '',
    photo: 'main.jpg',
    legende: '',
    infobox: [['Nom complet', ''], ['Surnom(s)', ''], ['Première apparition', ''], ['Spécialité', ''], ['Signe distinctif', ''], ['Citation fétiche', '']],
    sections: [['Biographie', ''], ['Origines', ''], ['Faits marquants', ''], ['Citations célèbres', '']],
    galerie: [['1.jpg', ''], ['2.jpg', ''], ['3.jpg', '']],
    voirAussi: ['les-shoxs'],
    categories: [],
  },
  // -------------------------------------------------------------------
  {
    slug: 'lenny-dupuis',
    titre: 'Lenny Dupuis',
    ebauche: true,
    resume: '',
    photo: 'main.jpg',
    legende: '',
    infobox: [['Nom complet', ''], ['Surnom(s)', ''], ['Première apparition', ''], ['Spécialité', ''], ['Signe distinctif', ''], ['Citation fétiche', '']],
    sections: [['Biographie', ''], ['Origines', ''], ['Faits marquants', ''], ['Citations célèbres', '']],
    galerie: [['1.jpg', ''], ['2.jpg', ''], ['3.jpg', '']],
    voirAussi: ['les-shoxs'],
    categories: [],
  },
  // -------------------------------------------------------------------
  {
    slug: 'matthias',
    titre: 'Matthias',
    ebauche: true,
    resume: '',
    photo: 'main.jpg',
    legende: '',
    infobox: [['Nom complet', ''], ['Surnom(s)', ''], ['Première apparition', ''], ['Spécialité', ''], ['Signe distinctif', ''], ['Citation fétiche', '']],
    sections: [['Biographie', ''], ['Origines', ''], ['Faits marquants', ''], ['Citations célèbres', '']],
    galerie: [['1.jpg', ''], ['2.jpg', ''], ['3.jpg', '']],
    voirAussi: ['les-shoxs'],
    categories: [],
  },
  // -------------------------------------------------------------------
  {
    slug: 'diego',
    titre: 'Diego',
    ebauche: true,
    resume: '',
    photo: 'main.jpg',
    legende: '',
    infobox: [['Nom complet', ''], ['Surnom(s)', ''], ['Première apparition', ''], ['Spécialité', ''], ['Signe distinctif', ''], ['Citation fétiche', '']],
    sections: [['Biographie', ''], ['Origines', ''], ['Faits marquants', ''], ['Citations célèbres', '']],
    galerie: [['1.jpg', ''], ['2.jpg', ''], ['3.jpg', '']],
    voirAussi: ['les-shoxs'],
    categories: [],
  },
  // -------------------------------------------------------------------
  {
    slug: 'nino',
    titre: 'Nino',
    ebauche: true,
    resume: '',
    photo: 'main.jpg',
    legende: '',
    infobox: [['Nom complet', ''], ['Surnom(s)', ''], ['Première apparition', ''], ['Spécialité', ''], ['Signe distinctif', ''], ['Citation fétiche', '']],
    sections: [['Biographie', ''], ['Origines', ''], ['Faits marquants', ''], ['Citations célèbres', '']],
    galerie: [['1.jpg', ''], ['2.jpg', ''], ['3.jpg', '']],
    voirAussi: ['les-shoxs'],
    categories: [],
  },
];

// Page d'accueil (fireshox://wiki/ sans #)
window.WIKI_ACCUEIL = {
  lumiere: 'les-shoxs', // article mis « en lumière »
  saviezVous: [
    'Une paire de Shoxs comprimée au maximum contient assez d\'énergie pour faire rebondir un frigo jusqu\'au troisième étage.{{réf}}',
    'Le [[les-shoxs|Grand Rebond]] aurait duré trois jours, ce qui en fait le plus long saut jamais enregistré sans escale.{{réf}}',
    'Wiki Shox est la seule encyclopédie dont les pages chauffent quand on les lit trop longtemps.',
    'Aucun ressort n\'a été blessé pendant la rédaction de cette encyclopédie.{{réf}}',
  ],
};
