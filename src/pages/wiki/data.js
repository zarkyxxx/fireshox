// Wiki Shox — données de l'encyclopédie (fireshox://wiki/).
// =====================================================================
// WIKI PARTAGÉ : ce fichier est la VERSION D'ORIGINE livrée avec Fire Shox. Dès qu'une page est
// modifiée en ligne (onglet « Modifier »), la version en ligne la remplace chez tout le monde, et ce
// fichier ne sert plus pour cette page (sauf « Restaurer la version d'origine » dans l'historique).
// Les textes en ligne sont du wikitexte sûr (voir wikitext.js), jamais du HTML.
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
//   statut     'enrichissement' = petit bandeau « Article en cours d'enrichissement — d'autres archives arrivent »
//   chapeau    (facultatif) ligne d'homonymie en italique au-dessus du texte, ex. 'Ne pas confondre avec [[la-pomme]].'
//   resume     paragraphe d'introduction (vide = phrase neutre automatique)
//   photo      photo principale de l'infobox ; legende = texte sous la photo
//              Toutes les images (.jpg, .png, .webp) gardent leur format (portrait ou paysage).
//   cadrage    (facultatif) recadre la photo de l'infobox en portrait 4:5 autour d'un point,
//              ex. '52% 50%' (gauche→droite, haut→bas). Sans cadrage : image entière.
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
  // Rédigé uniquement d'après les images fournies et ce qu'a dit l'utilisateur (le logo, c'est lui).
  {
    slug: 'le-y',
    titre: 'LE Y',
    ebauche: false,
    statut: 'enrichissement',
    resume:
      '<p><b>Le Y</b> est le visage officiel de <b>Fire Shox</b> : c\'est lui que l\'on voit de profil au centre du logo du navigateur, ' +
      'entouré du [[les-shoxs|Tourbillon Incandescent]]. Il est surtout connu comme <b>le mec qui lance des Shox enflammées</b>, ' +
      'une discipline qu\'il pratique avec un sérieux remarquable.{{réf}}</p>' +
      '<p>On le reconnaît à son <b>chignon</b>, à ses <b>écouteurs filaires</b> et à sa <b>tenue 456</b> façon jeu de survie, ' +
      'portée avec des Shox pas toujours authentiques.{{note|Sur la photographie annotée de la galerie, la mention « fausses Nike Shox » figure noir sur blanc.}}</p>',
    photo: '/assets/memes/le-y-btbf.webp',
    legende: 'Le Y à son poste de travail, écouteurs filaires branchés, face à l\'écran « BTBF ».',
    infobox: [
      ['# Identité'],
      ['Nom d\'usage', 'Le Y'],
      ['Surnom', '« Le mec qui lance des Shox enflammées »'],
      ['Fonction', 'Visage officiel de Fire Shox (logo du navigateur)'],
      ['Spécialité', 'Lancer de Shox enflammées'],
      ['# Signes distinctifs'],
      ['Coiffure', 'Chignon'],
      ['Gabarit', '« Bien enrobé » (selon l\'annotation officielle){{réf}}'],
      ['Audio', 'Écouteurs filaires{{note|Aucune batterie à recharger : un choix de fiabilité, selon les spécialistes.}}'],
      ['Tenue de cérémonie', 'Survêtement vert n° 456'],
      ['Chaussures', 'Shox (parfois fausses)'],
      ['À l\'écran', '« BTBF »'],
    ],
    sections: [
      ['Biographie',
        '<p>Les archives officielles sur Le Y sont encore minces : la rédaction ne dispose à ce jour que de trois documents photographiques ' +
        'et du logo de Fire Shox. Tout ce qui suit en est tiré. Le reste de sa vie demeure, pour l\'instant, un mystère incandescent.{{réf}}</p>'],
      ['Le visage de Fire Shox',
        '<p>Le Y figure au centre du logo de Fire Shox, de profil, chignon et écouteurs filaires compris, tandis que six Shox enflammées tournent autour de lui ' +
        'dans un anneau de feu : c\'est le [[les-shoxs|Tourbillon Incandescent]]. Il s\'agit très probablement du seul logo de navigateur web équipé d\'écouteurs filaires.{{réf}}</p>'],
      ['Faits marquants', ''],
      ['Le lancer de Shox enflammées',
        '<p>Un document le montre en pleine action, vêtu du survêtement vert n° 456, une Shox en feu dans chaque main, ' +
        'sous le regard de gardes en combinaison rose et d\'autres participants visiblement impressionnés. ' +
        'La technique observée est irréprochable : appui fléchi, bras armé, regard déterminé.</p>' +
        '<p>Plusieurs Shox gisent déjà au sol, encore fumantes, ce qui laisse penser que la séance d\'entraînement durait depuis un moment.{{réf}}</p>', 3],
      ['La tenue 456',
        '<p>Une photographie annotée détaille sa tenue de cérémonie : veste de survêtement verte frappée du numéro <b>456</b> et d\'un triangle, ' +
        'sacoche en bandoulière, lunettes de soleil, <b>pantalon de camouflage</b> et chignon impeccable. ' +
        'Aux pieds, une paire de Shox vertes parfaitement assorties, identifiées par l\'annotation comme de <b>fausses</b> Shox, ' +
        'ce qui n\'enlève rien à leur rebond.{{réf}}</p>', 3],
      ['Morphologie',
        '<p>La photographie annotée de la tenue 456 qualifie officiellement Le Y de <b>« bien enrobé »</b>, une formule que la rédaction reprend ' +
        'avec le plus grand sérieux scientifique.{{note|L\'annotation figure en toutes lettres sur le document, juste à côté de la flèche qui pointe vers le survêtement.}}</p>' +
        '<p>Loin d\'être un détail, cet enrobage serait un <b>avantage décisif</b> pour un porteur de Shox. D\'après la [[les-shoxs|loi de Hooke-Shox]], ' +
        'plus on comprime un ressort, plus il rebondit : Le Y serait donc, en théorie, le porteur de Shox au rebond le plus puissant jamais recensé.{{réf}} ' +
        'Les mêmes spécialistes notent une stabilité remarquable au moment du lancer, le centre de gravité restant fermement ancré au sol pendant que les Shox, elles, décollent.{{réf}}</p>' +
        '<p>Le chignon, enfin, culmine au sommet de l\'ensemble, où il joue le rôle d\'antenne, de stabilisateur et de signe de ralliement.{{réf}}</p>', 3],
      ['Les écouteurs filaires',
        '<p>Le Y est fidèle aux écouteurs filaires, visibles aussi bien sur le logo que sur la photographie de bureau. ' +
        'Un écouteur filaire ne tombe jamais en panne de batterie au milieu d\'un lancer, ce qui, pour un lanceur de Shox, est un argument décisif.{{réf}}</p>', 3],
      ['BTBF',
        '<p>Sur la photographie de référence, son écran affiche en grandes lettres orange le sigle <b>« BTBF »</b>. ' +
        'Sa signification n\'a pas été communiquée à la rédaction ; elle est provisoirement classée « secret incandescent ».{{réf}}</p>', 3],
      ['Citations célèbres', ''],
    ],
    galerie: [
      ['/assets/memes/le-y-lancer-456.webp', 'Le lancer de Shox enflammées, en survêtement 456.'],
      ['/assets/memes/le-y-tenue-456.webp', 'La tenue 456 détaillée : chignon, sacoche, pantalon de camouflage et fausses Shox.'],
      ['/assets/logo.png', 'Le Y au centre du Tourbillon Incandescent, logo officiel de Fire Shox.'],
    ],
    voirAussi: ['les-shoxs'],
    categories: ['Visage de Fire Shox', 'Lanceur de Shox enflammées', 'Porteur d\'écouteurs filaires'],
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
    legende: 'Le <b>Tourbillon Incandescent</b>, emblème officiel de Fire Shox : six Shoxs en orbite stable autour de [[le-y|Le Y]].{{réf}}',
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
        'en orbite et tournent dans un anneau de flammes, autour de [[le-y|Le Y]]. Ce motif, jugé « extrêmement stylé » par la communauté scientifique, est devenu l\'emblème de Fire Shox (voir l\'infobox).</p>', 3],
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
        'et la présente encyclopédie. Leur ambassadeur le plus célèbre est [[le-y|Le Y]], visage du logo et lanceur de Shox enflammées.</p>' +
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
    galerie: [['/assets/logo.png', 'Le Tourbillon Incandescent autour de [[le-y|Le Y]] (vue officielle)'], ['/assets/memes/le-y-lancer-456.webp', '[[le-y|Le Y]] lançant des Shoxs enflammées.'], ['1.jpg', ''], ['2.jpg', '']],
    voirAussi: ['le-y'],
    categories: ['Légende de Fire Shox', 'Chaussure à ressorts', 'Phénomène incandescent', 'Article de qualité (auto-proclamé)'],
  },
  // -------------------------------------------------------------------
  // Rédigé uniquement d'après l'affiche fournie (textes de l'affiche cités tels quels).
  {
    slug: 'jack-shi',
    titre: 'Jack Shi',
    ebauche: false,
    statut: 'enrichissement',
    resume:
      '<p><b>Jack Shi</b> est un cycliste de légende, connu avant tout par son <b>affiche officielle</b> et par sa devise : ' +
      '« 52 vitesses, une seule direction : la victoire ». Casque vissé, lunettes miroir, maillot noir floqué à son nom et drapeau français à l\'épaule, ' +
      'il avance au milieu d\'un orage permanent{{réf}}, ce qui en fait l\'une des figures les plus électrisantes de Wiki Shox.</p>',
    photo: '/assets/memes/jack-shi.webp',
    cadrage: '51% 50%',
    legende: 'Jack Shi en plein effort (détail de l\'affiche officielle).',
    infobox: [
      ['# Cycliste'],
      ['Discipline', 'Cyclisme sur route, spécialité montée de cols'],
      ['Vitesses', '52'],
      ['Direction', 'Une seule : la victoire'],
      ['Maillot', 'Noir, floqué « JACK SHI »'],
      ['Couleurs', 'Drapeau français'],
      ['# Légende'],
      ['Col fétiche', 'Col du Mont 52 vitesses{{réf}}'],
      ['Devise', '« Plus vieux, plus fort, plus rapide »'],
      ['Réputation', '« Un vieux qui envoie du lourd » (selon l\'affiche)'],
      ['Météo habituelle', 'Orageuse{{réf}}'],
    ],
    sections: [
      ['L\'affiche officielle',
        '<p>La principale source connue sur Jack Shi est son affiche. On y voit le champion foncer droit vers le spectateur, ' +
        'au milieu d\'éclairs bleutés. Autour de lui : deux portraits géants du héros, une cassette de vélo marquée « 52T », ' +
        'un panneau routier « Col du Mont 52 vitesses », plusieurs couronnes dessinées et un drapeau français qui claque au vent. ' +
        'Le nom « JACK SHI » y apparaît en lettres électriques, au cas où un doute subsisterait.</p>'],
      ['Les 52 vitesses',
        '<p>Là où la plupart des vélos se contentent de quelques vitesses, Jack Shi en revendique <b>52</b>. ' +
        'Les mécaniciens s\'interrogent encore sur la façon de toutes les passer ; Jack Shi, lui, n\'en utiliserait qu\'une seule : ' +
        'celle qui mène à la victoire.{{réf}}</p>'],
      ['Le col du Mont 52 vitesses',
        '<p>Un panneau de l\'affiche signale le <b>Col du Mont 52 vitesses</b>. Son altitude, sa pente et même sa position sur une carte restent à confirmer{{réf}}, ' +
        'mais sa réputation est faite : on dit qu\'il faut au moins 52 vitesses pour en venir à bout.' +
        '{{note|Coïncidence troublante relevée par la rédaction : c\'est exactement le nombre de vitesses de Jack Shi.}}</p>'],
      ['Citations célèbres',
        '<blockquote>« 52 vitesses, une seule direction : la victoire. »<cite>Jack Shi, d\'après son affiche</cite></blockquote>' +
        '<blockquote>« Plus vieux, plus fort, plus rapide. »<cite>Devise de l\'affiche</cite></blockquote>' +
        '<blockquote>« Un vieux qui envoie du lourd. »<cite>Légende de l\'affiche</cite></blockquote>'],
    ],
    galerie: [['/assets/memes/jack-shi.webp', 'L\'affiche officielle de Jack Shi, en entier.'], ['1.jpg', ''], ['2.jpg', '']],
    voirAussi: ['les-shoxs'],
    categories: ['Cycliste', 'Légende des 52 vitesses', 'Affiche officielle'],
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
    // Rédigé uniquement d'après l'image fournie (une pomme avec une vieille boussole en laiton incrustée).
    slug: 'la-boussole',
    titre: 'La Boussole',
    ebauche: false,
    statut: 'enrichissement',
    chapeau: 'Ne doit pas être confondue avec [[la-pomme|La Pomme]].',
    resume:
      '<p><b>La Boussole</b> est un instrument d\'orientation à mi-chemin entre l\'outil de navigation et le fruit : ' +
      'une <b>vieille boussole en laiton</b> incrustée au cœur d\'une <b>pomme</b>. Elle indique le nord avec l\'assurance d\'une boussole ' +
      'et se conserve à peu près aussi longtemps qu\'une pomme.{{réf}}</p>',
    photo: '/assets/memes/la-boussole.webp',
    legende: 'La Boussole au repos, sur une table en bois, entre deux cartes anciennes et une corde.',
    infobox: [
      ['# Instrument'],
      ['Type', 'Boussole fruitière'],
      ['Boîtier', 'Laiton patiné'],
      ['Enveloppe', 'Pomme rouge et verte, avec queue et feuille'],
      ['Cadran', 'Bilingue (voir plus bas)'],
      ['# Utilisation'],
      ['Orientation relevée', 'Nord-nord-est (sur la photographie)'],
      ['Accessoires', 'Cartes anciennes, corde'],
      ['Comestible', 'Déconseillé{{réf}}'],
    ],
    sections: [
      ['Description',
        '<p>La Boussole se présente comme une pomme rouge et verte, queue et feuille comprises, dont une large partie a laissé place à une ' +
        'boussole ronde en laiton. Le boîtier est patiné, légèrement rouillé par endroits, et semble solidement enraciné dans la chair du fruit : ' +
        'de fines fibres brunes l\'entourent comme si la pomme avait poussé autour.</p>'],
      ['Origines',
        '<p>On ignore si la boussole a été glissée dans la pomme ou si la pomme a poussé autour de la boussole. ' +
        'Les fibres visibles autour du boîtier plaident pour la seconde hypothèse, qui a l\'avantage d\'être la plus poétique.{{réf}}</p>'],
      ['Le cadran bilingue',
        '<p>Le cadran mélange allègrement deux langues : on y lit « NW », « NE », « SW » et « SE » à l\'anglaise, mais « O » pour l\'ouest, à la française. ' +
        'La Boussole permet donc de se perdre dans deux langues à la fois, ce qui constitue une première mondiale.{{réf}}</p>'],
      ['Utilisation',
        '<ol><li>Poser La Boussole bien à plat (sa forme de pomme lui permet de tenir debout toute seule).</li>' +
        '<li>Attendre que l\'aiguille se stabilise.</li>' +
        '<li>Partir dans la direction indiquée, de préférence avec une carte ancienne et une corde, comme sur la photographie.</li></ol>' +
        '<p>En cas de petite faim, ne pas utiliser l\'instrument comme en-cas : le laiton est réputé indigeste.{{note|Aucune expérience n\'a été tentée. La rédaction préfère ne pas savoir.}}</p>'],
      ['Citations célèbres',
        '<blockquote>« Une pomme par jour éloigne le médecin ; une boussole par pomme éloigne le doute. »<cite>Proverbe des navigateurs{{réf}}</cite></blockquote>'],
    ],
    galerie: [['/assets/memes/la-boussole.webp', 'La Boussole, vue d\'ensemble.'], ['1.jpg', ''], ['2.jpg', '']],
    voirAussi: ['la-pomme', 'les-shoxs'],
    categories: ['Instrument d\'orientation', 'Fruit', 'Objet en laiton'],
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
    'Le visage au centre du logo de Fire Shox est celui de [[le-y|Le Y]], le mec qui lance des Shox enflammées.',
    '[[jack-shi|Jack Shi]] possède 52 vitesses mais n\'utilise qu\'une seule direction : la victoire.',
    'Wiki Shox est la seule encyclopédie dont les pages chauffent quand on les lit trop longtemps.',
    'Aucun ressort n\'a été blessé pendant la rédaction de cette encyclopédie.{{réf}}',
  ],
};
