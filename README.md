# pixel-village2

Mini MMO RPG en pixel art, jouable directement dans le navigateur.
**Zéro dépendance** : aucun `npm install`, aucun build. `node server/index.js` suffit.

## Lancer en local

Sous Windows, le plus simple : **double-cliquer sur `Lancer le jeu.bat`**.
Il trouve Node.js (et propose de l'installer avec winget s'il manque), démarre
le serveur et ouvre le navigateur sur <http://localhost:3000>.

Sinon, en ligne de commande :

```bash
node server/index.js
```

Puis ouvrir <http://localhost:3000>.
Sans Node, `public/index.html` s'ouvre aussi en double-clic, mais uniquement en solo
(pas de chat ni de joueurs).

## Publier sur GitHub

Double-cliquer sur `Publier sur GitHub.bat` (ou `npm run publier`). Le script
`tools/publier.mjs` vérifie la syntaxe de tous les modules, lance les tests de
`tests/`, crée le commit puis pousse vers `origin/main` — et Render redéploie.
Il s'arrête au moindre échec : rien n'est envoyé si un test casse.

Inutile de préparer Git à la main : si le dossier n'est pas encore un dépôt, le
script l'initialise (branche `main`) et demande **une seule fois** l'adresse du
dépôt GitHub, par exemple `https://github.com/<compte>/<dépôt>.git`. L'adresse
reste enregistrée dans `.git/config` pour les publications suivantes.

- Dépôt pas encore créé : https://github.com/new → nom du dépôt → **Create
  repository** (sans README), puis copier l'URL affichée.
- Le dépôt existe déjà avec un historique séparé (dossier récupéré en zip) : les
  fichiers y sont rattachés par un nouveau commit, sans `--force`.
- Les commits non poussés par erreur ne sont jamais perdus : le script annule
  toute fusion conflictuelle et laisse le jeu officiel intact.
- Première fois sur un ordinateur : GitHub demande de se connecter. En mot de
  passe, indiquer un **jeton d'accès personnel**
  (https://github.com/settings/tokens → *Generate new token (classic)* → portée
  `repo`), puis le coller à la place du mot de passe. Git le retient ensuite.

## Structure

| Chemin | Rôle |
|---|---|
| `public/index.html` | page du jeu (HUD, chat, inventaire, donjons) |
| `public/style.css` | habillage du jeu |
| `public/js/` | tout le jeu : rendu, carte, joueurs, donjons, échoppe, compétences, son |
| `public/js/config.js` | réglages partagés client/serveur (port, vitesse, URL du serveur) |
| `server/index.js` | serveur HTTP + monde partagé en WebSocket |
| `server/websocket.js` | WebSocket maison (aucune dépendance npm) |
| `tests/` | tests du jeu (carte, donjons, maisons, échoppe, compétences) |
| `tools/publier.mjs` | publication vérifiée : syntaxe, tests, commit, push |
| `Lancer le jeu.bat` | lancement en double-clic (Windows) |
| `Publier sur GitHub.bat` | publication en double-clic (Windows) |
| `render.yaml` | déploiement Render (build vide, `node server/index.js`) |
| `supabase/characters.sql` | table du personnage (facultative) |

Le serveur sert `public/` et expose `/healthz` et le WebSocket `/ws`.

## Comptes et personnages (facultatif)

Le jeu accepte un jeton de session Supabase passé en `?token=…`. Le serveur le
vérifie sur `/auth/v1/user` et charge le personnage de `public.characters`.

1. Exécuter `supabase/characters.sql` dans le SQL Editor Supabase.
2. Copier `.env.example` en `.env` et renseigner `SUPABASE_URL` +
   `SUPABASE_SERVICE_ROLE_KEY`.

Sans ces variables, le serveur démarre en mode invité : le jeu reste complet,
la progression reste dans le navigateur.

## Déployer sur Render

1. Pousser ce dossier sur un dépôt GitHub.
2. Render → **New + → Blueprint** → choisir le dépôt → **Deploy Blueprint**.
3. Si le Blueprint n'est pas proposé : Web Service, runtime Node,
   build command `echo aucune dependance`, start command `node server/index.js`.
4. Dans **Environment**, ajouter `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY`.
5. Si le serveur a une autre URL que celle de la page, la renseigner dans
   `public/js/config.js` → `serverUrl` (ou passer `?server=https://…`).
