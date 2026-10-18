// Galerie nationale de Monsieur Claude — données (fireshox://images/)
// =====================================================================
// Le chef de projet n'a qu'à déposer les images et remplir titre / description.
//
// IMAGES : F:\fireshox\assets\photos\claude\01.jpg … 12.jpg
//   (.png ou .webp marchent aussi : si 01.jpg manque, le site essaie 01.png puis 01.webp)
//   Tant qu'une image manque, la case affiche « Œuvre en cours d'acquisition ».
//   La mosaïque s'adapte toute seule au format réel de chaque image (portrait, paysage…).
//
// CHAMPS :
//   fichier      chemin de l'image (commence par /assets/…)
//   titre        titre de l'œuvre ('' = « Sans titre »)
//   description  texte du cartel (HTML simple autorisé : <b>, <i>, <br>)
//   (facultatif) date : texte libre affiché sur le cartel, ex. '2024'
//   (facultatif) grand : true = l'œuvre prend deux colonnes dans la mosaïque
// Pour ajouter une 13e œuvre : copier une ligne et changer le numéro.
// =====================================================================

window.CLAUDE_OEUVRES = [
  { fichier: '/assets/photos/claude/01.jpg', titre: '', description: '', grand: true },
  { fichier: '/assets/photos/claude/02.jpg', titre: '', description: '' },
  { fichier: '/assets/photos/claude/03.jpg', titre: '', description: '' },
  { fichier: '/assets/photos/claude/04.jpg', titre: '', description: '' },
  { fichier: '/assets/photos/claude/05.jpg', titre: '', description: '' },
  { fichier: '/assets/photos/claude/06.jpg', titre: '', description: '' },
  { fichier: '/assets/photos/claude/07.jpg', titre: '', description: '' },
  { fichier: '/assets/photos/claude/08.jpg', titre: '', description: '', grand: true },
  { fichier: '/assets/photos/claude/09.jpg', titre: '', description: '' },
  { fichier: '/assets/photos/claude/10.jpg', titre: '', description: '' },
  { fichier: '/assets/photos/claude/11.jpg', titre: '', description: '' },
  { fichier: '/assets/photos/claude/12.jpg', titre: '', description: '' },
];
