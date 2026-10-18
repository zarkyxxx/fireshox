// Jeux vidéo — données de la bibliothèque (fireshox://jeux/)
// =====================================================================
// JEUX : les jeux installés. VIDE pour l'instant → la page affiche « Aucun jeu installé ».
// Pour ajouter un jeu :
//   1. mettre le jeu dans  F:\fireshox\src\pages\jeux\<id>\index.html   (adresse fireshox://jeux/<id>/)
//   2. déposer sa jaquette  F:\fireshox\assets\jeux\<id>\cover.jpg       (format portrait, ex. 600 × 900)
//      et (facultatif) une bannière large  F:\fireshox\assets\jeux\<id>\banner.jpg (ex. 1920 × 620)
//   3. ajouter une ligne ci-dessous, par exemple :
//      { id: 'squid', titre: 'Squid Shox', image: '/assets/jeux/squid/cover.jpg', banniere: '/assets/jeux/squid/banner.jpg',
//        lancement: 'fireshox://jeux/squid/', description: 'Un jeu de survie à ressorts.', genre: 'Survie' },
//   Une carte QR qui mène à fireshox://jeux/?game=<id> ouvrira alors directement la fiche du jeu.
// =====================================================================
window.JEUX = [
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
