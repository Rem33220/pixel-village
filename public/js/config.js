// Configuration partagée entre le client (navigateur) et le serveur (Node).
// Ce fichier ne doit utiliser que du JavaScript universel (pas de DOM).
export const CONFIG = {
  // URL du serveur Node quand le client est hébergé ailleurs (ex. itch.io).
  // Exemple : 'https://pixel-village.onrender.com'. Vide = même origine que la page.
  // Astuce : on peut aussi passer ?server=https://mon-serveur.onrender.com dans l'URL.
  serverUrl: 'https://pixel-village-pixel-village-onrender-com.onrender.com',

  // Chemin WebSocket sur le serveur.
  wsPath: '/ws',

  // Port local (Render/Koyeb fournissent process.env.PORT, prioritaire).
  port: 3000,

  // Vitesse de marche, en tuiles par seconde. Identique côté client et serveur.
  speed: 4.2,

  // Palette des personnages (couleur du haut).
  colors: ['#3b8fd6', '#d6533b', '#4fbf6a', '#b45fd6', '#e0a83c', '#38b7b7'],

  maxNameLength: 14,
  maxChatLength: 120
};
