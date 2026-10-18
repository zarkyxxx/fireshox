// Jeux vidéo — données de la bibliothèque (fireshox://jeux/)
// =====================================================================
// JEUX : les jeux installés (le premier : Shox Runner, le jeu hors ligne). Liste vide → « Aucun jeu installé ».
// Pour ajouter un jeu :
//   1. mettre le jeu dans  F:\fireshox\src\pages\jeux\<id>\index.html   (adresse fireshox://jeux/<id>/)
//   2. déposer sa jaquette  F:\fireshox\assets\jeux\<id>\cover.jpg       (format portrait, ex. 600 × 900)
//      et (facultatif) une bannière large  F:\fireshox\assets\jeux\<id>\banner.jpg (ex. 1920 × 620)
//   3. ajouter une ligne ci-dessous, par exemple :
//      { id: 'squid', titre: 'Squid Shox', image: '/assets/jeux/squid/cover.jpg', banniere: '/assets/jeux/squid/banner.jpg',
//        lancement: 'fireshox://jeux/squid/', description: 'Un jeu de survie à ressorts.', genre: 'Survie' },
//   Une carte QR qui mène à fireshox://jeux/?game=<id> ouvrira alors directement la fiche du jeu.
// =====================================================================
//   Champs facultatifs : source (texte « Source » de la fiche), infos() → [[libellé, valeur], …] (chiffres de la fiche),
//   dessin(canvas, 'cover' | 'banner') → Promise : jaquette dessinée en direct (canvas) quand il n'y a pas d'image.
// =====================================================================
window.JEUX = [
  {
    id: 'runner',
    titre: 'Shox Runner',
    genre: 'Course sans fin',
    lancement: 'fireshox://runner/',
    source: 'Préinstallé',
    description: 'Le jeu hors ligne de Fire Shox. Le Y court sur ses Shox à ressorts et doit sauter par-dessus les plots de chantier, les poubelles du blocus, les cônes ○△□ et les biscuits dalgona volants… jusqu’à ce que Jack Shi débarque en face sur son vélo à 52 vitesses. Ramasse les Shox enflammées pour des points bonus : chaque tranche de 100 points rapporte 1 ShoxCoin. Il se lance aussi tout seul quand Internet est coupé.',
    // Jaquette et bannière dessinées en canvas par le jeu lui-même (fireshox://runner/game.js).
    // Pour une vraie image : mettre image: '/assets/jeux/runner/cover.jpg' (et banniere) — le dessin ne sert alors plus.
    dessin: (canvas, kind) => (window.ShoxRunner ? window.ShoxRunner.drawCover(canvas, kind) : Promise.reject(new Error('jeu absent'))),
    infos: () => {
      const best = Number((window.FX && FX.store.get('jeux.runner.best', 0)) || 0);
      const n = Number((window.FX && FX.store.get('jeux.runner.parties', 0)) || 0);
      return [['Record', String(best).padStart(5, '0')], ['Parties', FX.fmt(n)]];
    },
  },
];

// Jeux annoncés par les cartes QR de Shox Opening mais pas encore prêts.
// Une carte QR mène à fireshox://jeux/?game=<id> : si l'id n'est pas (encore) dans JEUX,
// la page affiche l'annonce « Jeu en préparation » avec ces réglages.
//   nom      : nom affiché en grand (nom de code tant que le vrai titre n'est pas décidé)
//   couleurs : deux couleurs d'ambiance de l'annonce
//   motif    : 'formes' (rond, triangle, carré), 'flammes' ou 'pancartes' (décor animé)
window.JEUX_PREVUS = {
  squid: { nom: 'SQUID', couleurs: ['#ff2d75', '#19d3b5'], motif: 'formes' },
  fire: { nom: 'FIRE', couleurs: ['#ff6a00', '#ffd84a'], motif: 'flammes' },
  lfi: { nom: 'LFI', couleurs: ['#b44dff', '#ff3d6e'], motif: 'pancartes' },
};
