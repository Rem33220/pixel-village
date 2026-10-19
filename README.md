# Pixel Village — mini MMO RPG en pixel art

Un jeu de rôle massivement multijoueur minimaliste, jouable **directement dans le
navigateur** : un village en pixel art, des personnages qui se croisent en temps
réel, un chat et un mode solo de secours.

- Client : HTML + Canvas 2D, **aucune étape de build**, aucun asset à télécharger.
- Serveur : Node.js + WebSocket, la carte et les collisions sont simulées
  côté serveur.
- **Aucune dépendance obligatoire** : le WebSocket est intégré au projet
  (`server/websocket.js`), donc pas de `npm install` à faire. Le paquet `ws`
  reste utilisé automatiquement s'il est installé.

---

## 1. Lancer le jeu dans VS Code

### Prérequis

- [Node.js](https://nodejs.org) **20 ou plus** (version LTS conseillée) : c'est
  le seul logiciel à installer, il contient déjà npm.
- [VS Code](https://code.visualstudio.com).

> **Aucun `npm install` n'est nécessaire.** Le serveur embarque son propre
> WebSocket (`server/websocket.js`) et n'utilise le paquet `ws` que s'il est déjà
> présent. Une fois Node.js installé, le jeu démarre avec une seule commande.

### Étapes

1. Dans VS Code : **Fichier → Ouvrir le dossier…** et choisis le dossier du projet.
2. Ouvre un terminal : **Terminal → Nouveau terminal** (ou `` Ctrl+` ``).
3. Vérifie que Node répond :

   ```powershell
   node -v
   ```

   Tu dois voir `v20.x.x` ou plus. Si la commande est inconnue, va voir la
   section « npm / node n'est pas reconnu » juste en dessous.

4. Démarre le serveur :

   ```powershell
   node server/index.js
   ```

   (ou `npm run dev` si npm fonctionne : le serveur redémarre alors tout seul
   quand tu modifies un fichier de `server/`.)

5. Ouvre <http://localhost:3000> dans ton navigateur.
6. Pour tester le multijoueur : ouvre un **deuxième onglet** sur la même adresse,
   choisis un autre nom et une autre couleur, puis bouge dans le village.

Au démarrage, le serveur affiche `Pixel Village prêt : http://localhost:3000`
suivi du moteur WebSocket utilisé (`paquet ws` ou `WebSocket intégré`). Pour
arrêter le serveur : `Ctrl+C` dans le terminal.

### « npm » ou « node » n'est pas reconnu (Windows)

Cette erreur veut dire que **Node.js n'est pas installé**, ou que VS Code a été
ouvert avant l'installation et garde l'ancienne liste de programmes.

1. **Vérifie** dans un terminal PowerShell de VS Code :

   ```powershell
   node -v
   npm -v
   ```

2. **Installe Node.js** si les deux commandes échouent. Le plus simple :

   ```powershell
   winget install OpenJS.NodeJS.LTS --source winget
   ```

   Ou télécharge l'installateur **LTS** sur <https://nodejs.org> et laisse
   cochée l'option **Add to PATH**.

3. **Ferme complètement VS Code** (toutes les fenêtres, pas juste « Recharger la
   fenêtre »), puis rouvre-le. Un terminal déjà ouvert ne voit jamais un
   programme installé après son démarrage. En cas de doute, redémarre le PC.

4. Si `node -v` fonctionne mais pas `npm -v`, vérifie que ce dossier est bien
   dans le `PATH` (Panneau de configuration → Variables d'environnement) :

   ```text
   C:\Program Files\nodejs\
   ```

5. Erreur du type *« npm.ps1 ne peut pas être chargé car l'exécution de scripts
   est désactivée »* : c'est PowerShell, pas npm. Dans un terminal PowerShell :

   ```powershell
   Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
   ```

   Ou, sans rien changer au système, lance `npm.cmd install`, ou choisis
   **Command Prompt** dans le menu `+` du terminal VS Code.

6. Rien ne marche ? Ce n'est pas bloquant : si `node -v` répond, lance
   directement `node server/index.js`. Le jeu n'a besoin d'aucun paquet npm.

### Commandes

| Commande                | Effet                                             |
| ----------------------- | ------------------------------------------------- |
| `node server/index.js`  | démarre le jeu (aucune dépendance requise)        |
| `npm run dev`           | idem, avec rechargement auto (si npm fonctionne)  |
| `npm start`             | idem, sans rechargement (utilisé en production)   |
| `npm install`           | optionnel : installe `ws` au lieu du WebSocket intégré |

### Contrôles

| Touche                         | Action                        |
| ------------------------------ | ----------------------------- |
| `ZQSD` / `WASD` / flèches      | se déplacer                   |
| `Entrée`                       | ouvrir le chat                |
| `Échap`                        | fermer le chat                |
| Clic sur une pastille          | changer la couleur du personnage |

Les touches sont lues via `event.code` : les touches **physiques** fonctionnent
donc aussi bien sur un clavier AZERTY que QWERTY.

---

## 2. Comment le projet est organisé

```text
.
├── package.json          # scripts + dépendance optionnelle ws
├── render.yaml           # déploiement Render en un clic (Blueprint)
├── server/
│   ├── index.js          # serveur HTTP (fichiers) + WebSocket + boucle de jeu
│   └── websocket.js      # WebSocket intégré, sans aucune dépendance
└── public/               # tout le jeu (c'est ce dossier qu'on publie)
    ├── index.html
    ├── style.css
    └── js/
        ├── config.js     # réglages partagés client/serveur
        ├── map.js        # génération de la carte + collisions
        ├── sprites.js    # pixel art des personnages (dessiné en ASCII)
        ├── renderer.js   # caméra, tuiles, personnages, bulles de chat
        ├── input.js      # clavier
        ├── net.js        # connexion WebSocket
        └── main.js       # boucle de jeu, chat, interface
```

Le serveur est **autoritaire** : le client envoie seulement une direction, le
serveur déplace les personnages, applique les collisions et rediffuse l'état
16 fois par seconde. Le client prédit son propre déplacement puis se recale
doucement sur le serveur, ce qui rend le jeu fluide même avec de la latence.

La carte est générée avec une graine fixe (`WORLD_SEED`). Client et serveur
obtiennent donc **exactement la même grille**, sans envoyer de fichiers.

---

## 3. Personnaliser le jeu

| Envie                          | Fichier                        | Où regarder                          |
| ------------------------------ | ------------------------------ | ------------------------------------ |
| Changer le village (lac, maisons, arbres) | `public/js/map.js`  | fonction `generateWorld`             |
| Changer la vitesse             | `public/js/config.js`          | `speed` (tuiles/seconde)             |
| Changer les couleurs           | `public/js/config.js`          | `colors`                             |
| Redessiner les personnages     | `public/js/sprites.js`         | tableaux `DOWN_BASE`, `SIDE_BASE`…   |
| Changer le look des tuiles     | `public/js/renderer.js`        | `drawTile` et ses fonctions          |
| Changer le port                | `public/js/config.js`          | `port` (ou variable `PORT`)          |
| Changer la taille du chat      | `public/js/config.js`          | `maxChatLength`                      |

Les sprites font 12 × 16 pixels et sont dessinés avec des caractères :

```js
'...hhhhhh...',   // h = cheveux
'..hhhhhhhh..',
'..hssssssh..',   // s = peau
'..hseSSesh..',   // e = yeux
```

Chaque lettre correspond à une couleur dans `BASE_PALETTE`. Tu peux redessiner
un personnage sans aucune compétence en dessin ni logiciel externe.

---

## 4. Mettre le jeu en ligne gratuitement (sans téléchargement)

Un « launcher » sans téléchargement, c'est en réalité **une page web** : le joueur
clique et le jeu se lance dans son navigateur. Pour un jeu multijoueur, il faut
deux choses :

1. **le client** (le dossier `public/`) ;
2. **le serveur** Node/WebSocket, qui doit tourner en continu.

### Option A — Render : tout-en-un, gratuit (recommandé)

[Render](https://render.com) héberge le serveur **et** le client sur la même URL.
Aucun réglage à faire dans le code : le client se connecte automatiquement au
même serveur que la page (`wss://…/ws`), donc le chat et le multijoueur marchent.

#### Étape 1 — Mettre le projet sur GitHub (sans terminal)

1. Crée un compte sur <https://github.com> (gratuit).
2. En haut à droite : **+ → New repository**. Nom : `pixel-village`.
   Coche **Private** si tu veux cacher le code (Render accepte les dépôts
   privés), puis **Create repository**.
3. Sur la page du dépôt vide : **uploading an existing file**.
4. Ouvre le dossier du projet dans l'explorateur Windows, puis glisse dans la
   page GitHub **tout le contenu** du dossier : `package.json`, `render.yaml`,
   `README.md`, `server/` et `public/`.
   - Glisse les **dossiers** (pas leur contenu) : GitHub recrée l'arborescence.
   - **Ne glisse pas** `node_modules` ni `.git` : inutiles ici.
   - `.gitignore` commence par un point, Windows le cache : peu importe.
5. En bas : **Commit changes**.

> Alternative si Git est installé : dans VS Code, onglet **Source Control** →
> **Publish to GitHub** → choisis ton compte et le nom du dépôt. Pas besoin de
> taper de commande.

#### Étape 2 — Créer le service sur Render

1. Va sur <https://dashboard.render.com> puis **Get Started / Sign up** et
   choisis **GitHub** : le compte se crée en un clic, sans carte bancaire.
2. Autorise Render à lire tes dépôts. Si Render affiche *No repositories found*,
   clique sur **Configure account** et donne accès au dépôt `pixel-village`
   (ou à tous tes dépôts).
3. En haut à droite : **+ New → Web Service**.
4. Sélectionne `pixel-village` puis **Connect**.
5. Remplis le formulaire exactement comme ceci :

   | Champ | Valeur |
   | --- | --- |
   | **Name** | `pixel-village` (donne l'URL `pixel-village.onrender.com`) |
   | **Language / Runtime** | **Node** |
   | **Region** | **Frankfurt** (le plus proche de la France) |
   | **Branch** | `main` |
   | **Root Directory** | laisser **vide** |
   | **Build Command** | `npm install` |
   | **Start Command** | `node server/index.js` |
   | **Instance Type / Compute plan** | **Free** |

6. Facultatif mais utile : section **Advanced** → **Health Check Path** =
   `/healthz` (le serveur expose déjà cette route).
7. Clique sur **Deploy Web Service** (ou **Create Web Service**).

Render installe puis démarre le serveur. Suis les logs dans l'onglet
**Logs / Events** : au bout de 1 à 3 minutes tu dois voir

```text
Pixel Village prêt : http://localhost:10000  [paquet ws]
```

(le texte entre crochets indique le moteur WebSocket : `paquet ws` ou
`WebSocket intégré (sans dépendance)` — les deux fonctionnent).

Le port `10000` est normal : Render fournit son propre port via `process.env.PORT`
(le jeu le lit déjà). Le statut passe à **Live** en vert.

#### Étape 3 — Tester et partager

1. Ouvre l'URL affichée en haut du service, du type
   `https://pixel-village.onrender.com`. C'est ton « launcher » : les joueurs
   cliquent, le jeu se lance dans le navigateur, sans rien télécharger.
2. Ouvre la même URL dans un **deuxième onglet** : les deux personnages se
   voient et le chat fonctionne.
3. Partage simplement ce lien.

#### Étape 4 — Mettre à jour le jeu

À chaque modification envoyée sur GitHub (nouvel upload, **Commit changes**, ou
`git push`), Render redéploie tout seul. Rien d'autre à faire.

#### Option encore plus rapide : le Blueprint

Le fichier [render.yaml](render.yaml) décrit déjà tout le service. Sur Render :
**+ New → Blueprint** → choisis le dépôt → **Deploy Blueprint**. Render crée le
service avec les bons réglages, sans formulaire à remplir.

#### À savoir sur l'offre gratuite

- **Pas de carte bancaire** : 0,1 CPU et 512 Mo de RAM.
- **WebSocket accepté**, sans durée maximale imposée. Le chat et le temps réel
  fonctionnent donc sur le plan gratuit.
- Le service **s'endort après 15 minutes** sans aucune visite (y compris sans
  message WebSocket). La visite suivante affiche une page de chargement pendant
  **30 à 60 secondes**, puis tout repart. C'est normal.
- Un redéploiement coupe les connexions en cours : les joueurs sont alors
  basculés en mode solo par le client (prévu dans `net.js`).
- Le disque est **éphémère** : pas de sauvegarde de fichier côté serveur. Les
  scores/positions sont en mémoire et repartent à zéro à chaque redémarrage.

### Option B — itch.io pour la page de jeu + Render pour le serveur

[itch.io](https://itch.io) est gratuit, sert de vitrine, et permet aux joueurs de
lancer le jeu **dans le navigateur** (aucun téléchargement). Il n'exécute pas de
Node : garde Render pour le serveur.

1. Déploie d'abord le serveur sur Render (option A) et note son URL.
2. Dans `public/js/config.js`, renseigne :

   ```js
   serverUrl: 'https://pixel-village.onrender.com',
   ```

   (ou ajoute `?server=https://pixel-village.onrender.com` à l'URL itch.io).
3. Zippe **le contenu** de `public/` (pas le dossier lui-même) : `index.html`
   doit être à la racine du zip.
4. Sur itch.io : **Create new project → Kind of project: HTML**.
5. Uploade le zip, coche **This file will be played in the browser**, puis
   publie.

Limites itch.io pour un jeu HTML : 500 Mo décompressés, 200 Mo par fichier,
1 000 fichiers. Le mode solo fonctionne même si le serveur est endormi.

### Option C — autres hébergeurs (état en octobre 2026)

| Service                  | Gratuit | WebSocket | Remarque                                                        |
| ------------------------ | ------- | --------- | --------------------------------------------------------------- |
| **Render**               | oui     | oui       | Dormir après 15 min, ~1 min de réveil. Sans carte.              |
| **Koyeb**                | oui     | oui       | 1 service gratuit, scale-to-zero après 1 h, **carte demandée**. |
| **Railway**              | oui     | oui       | 1 $ de crédit/mois seulement : trop juste pour un serveur 24/7. |
| **Deno Deploy**          | oui     | oui       | Runtime Deno : il faut adapter le serveur, pas de Node classique. |
| **Cloudflare Workers**   | oui     | oui       | Nécessite Durable Objects : réécriture du serveur.              |
| **Fly.io**               | non     | oui       | Plus d'offre gratuite pour les nouveaux comptes.                |
| **Glitch**               | non     | —         | Hébergement d'apps fermé depuis juillet 2025.                   |
| **Vercel / Netlify**     | oui     | non       | Très bien pour le client statique, pas pour un WebSocket continu. |

Sources : [Render — déployer gratuitement](https://render.com/docs/free),
[Koyeb — instances gratuites](https://www.koyeb.com/docs/reference/instances),
[Railway — plans](https://docs.railway.com/pricing/plans),
[Deno Deploy — tarifs](https://deno.com/deploy/pricing),
[itch.io — jeux HTML5](https://itch.io/docs/creators/html5),
[itch.io — FAQ créateurs](https://itch.io/docs/creators/faq).

---

## 5. Dépannage

| Problème                                   | Solution                                                                 |
| ------------------------------------------ | ------------------------------------------------------------------------ |
| `npm : commande introuvable`               | Node.js absent ou VS Code ouvert avant l'installation : voir la section dédiée. |
| `Cannot find package 'ws'`                 | Normal : le WebSocket intégré prend le relais. `npm install` si tu veux `ws`. |
| `node : commande introuvable`              | Node.js n'est pas installé, ou pas dans le `PATH` (rouvrir VS Code).     |
| « Serveur injoignable — tu joues en solo » | Vérifie que `npm run dev` tourne et que l'URL/port sont bons.            |
| Le port 3000 est occupé                    | PowerShell : `$env:PORT=4000; npm run dev` puis <http://localhost:4000>. |
| Le serveur Render met du temps à répondre  | Il était endormi : attends 30 à 60 secondes et recharge.                 |
| Render : *No repositories found*           | Dans Render, **Configure account** puis autorise l'accès au dépôt GitHub. |
| Render : le build échoue sur `npm install` | Remplace **Build Command** par `echo aucune dependance` : le jeu n'a besoin d'aucun paquet. |
| Render : statut *Live* mais page 502       | **Start Command** doit être `node server/index.js` (pas `npm run dev`).   |
| Render : le chat ne marche pas en ligne    | Vérifie l'onglet **Logs** ; le client utilise automatiquement `wss://` de la page. |
| Sur itch.io, le chat reste en solo         | `serverUrl` doit être en **https** (donc `wss://` automatiquement).      |
| Les sprites sont flous                     | Garde `image-rendering: pixelated` (déjà dans `style.css`).              |

---

## 6. Pistes pour aller plus loin

- Monstres et combat au tour par tour ou en temps réel.
- Inventaire, objets au sol, PNJ marchands.
- Comptes joueurs et sauvegarde en base (SQLite/PostgreSQL).
- Plusieurs maps avec téléportation et donjons.
- Contrôles tactiles pour mobile.
- Éditeur de carte visuel (Tiled) et chargement d'un JSON.

Bon jeu, et surtout : tout est fait pour être modifié.
