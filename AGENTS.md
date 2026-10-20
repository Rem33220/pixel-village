# Règles du projet Pixel Village

Petit MMO en pixel art, **sans aucune dépendance** : `node server/index.js` suffit,
aucun `npm install`, aucun asset externe (les sprites, les tuiles, les icônes et
les sons sont générés par le code). Toute l'interface est en français.

## Documentation : deux fichiers, deux publics

- **[README.md](README.md)** — installation, déploiement, architecture, code.
- **[GUIDE.md](GUIDE.md)** — guide du joueur : commandes, maisons, épreuves,
  inventaire, paramètres, sauvegarde.

**À chaque fonctionnalité visible par le joueur** (maison, épreuve, objet,
touche, réglage, zone, règle de jeu), mettre à jour `GUIDE.md` dans le même
changement : la section concernée, la table de correspondance en fin de guide,
et la ligne « Le jeu actuel correspond au commit … ». Retirer aussi de la
section « Ce qui n'existe pas encore » ce qui vient d'être ajouté.

## Publication : chaque modification part directement

Le jeu officiel suit `main`, et Render redéploie à chaque `git push`.
**Toute modification validée est donc publiée dans la même foulée**, sans
demander confirmation : c'est l'autorisation permanente du projet.

1. `node --check` sur les fichiers JS modifiés.
2. `node tests/houses.test.mjs` (doit sortir en code 0) et les deux autres
   tests (`dungeons`, `shop`).
3. Tester le parcours réel dans le navigateur (`node server/index.js`, puis
   <http://localhost:3000>) quand le changement touche le client : connexion,
   déplacement, entrée dans une maison, épreuve, inventaire, paramètres.
4. Publier en une commande :

   ```bash
   node tools/publier.mjs "Message du commit"
   ```

   Le script vérifie la syntaxe de tous les modules, lance les trois tests,
   refuse de publier si l'un échoue, `git add -A`, commit, mise à jour en
   avance rapide depuis `origin/main`, puis `git push origin main`. Il ne fait
   jamais de `reset` ni de `--force` : en cas d'échec, le jeu officiel reste
   intact. Double-clic équivalent : `Publier sur GitHub.bat`.
5. Vérifier le déploiement une à deux minutes plus tard sur
   <https://pixel-village-pixel-village-onrender-com.onrender.com> : le
   changement doit être servi, pas seulement poussé.

## Conventions

- Code et textes en français, messages d'erreur compris.
- Modules ES dans `public/js/`, partagés client/serveur quand c'est possible
  (`map.js`, `config.js`) ; le serveur reste autoritaire sur les positions.
- Pas de nouvelle bibliothèque, pas de fichier binaire : dessiner et
  synthétiser (Canvas 2D, Web Audio).
- Les panneaux modaux (inventaire, paramètres) coupent le déplacement via
  `setInputEnabled` et sauvegardent leurs réglages dans `localStorage`.
