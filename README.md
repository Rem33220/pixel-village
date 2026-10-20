# Pixel Village — mini MMO RPG en pixel art

Un jeu de rôle massivement multijoueur minimaliste, jouable **directement dans le
navigateur** : un village en pixel art, des personnages qui se croisent en temps
réel, un chat, un mode solo de secours et **trois maisons à visiter, chacune avec
son épreuve et sa récompense**.

> **Tu veux juste jouer ?** Le **[guide du joueur](GUIDE.md)** explique les
> commandes, les maisons, les épreuves, l'inventaire et les paramètres. Ce
> README-ci s'occupe de l'installation, du déploiement et du code.

- Client : HTML + Canvas 2D, **aucune étape de build**, aucun asset à télécharger.
- Serveur : Node.js + WebSocket, la carte et les collisions sont simulées
  côté serveur.
- **Zéro dépendance, zéro npm** : le WebSocket est intégré au projet
  (`server/websocket.js`). Il n'y a rien à installer et aucune commande `npm`
  à taper : `node server/index.js` ou un double-clic sur `Lancer le jeu.bat`.

---

## 1. Lancer le jeu sur ton PC (double-clic, sans npm)

Le projet **n'utilise plus npm du tout** : aucune dépendance à installer, aucune
commande à taper. Le serveur embarque son propre WebSocket
(`server/websocket.js`).

### Le plus simple : `Lancer le jeu.bat`

1. Ouvre le dossier du projet (celui qui contient `server` et `public`).
2. Double-clique sur **[Lancer le jeu.bat](Lancer%20le%20jeu.bat)**.
3. Une fenêtre noire s'ouvre, puis ton navigateur se lance sur le jeu.
4. Pour arrêter : ferme la fenêtre noire (ou `Ctrl+C` dedans).

Ce fichier fait tout le travail :

- il cherche `node.exe` partout où Windows peut l'avoir installé, **même quand
  la commande `node` n'est pas reconnue dans le terminal** ;
- s'il ne le trouve pas, il propose d'installer Node.js (une question O/N : rien
  n'est installé sans ton accord) ;
- il démarre le serveur et ouvre `http://localhost:3000` ;
- si le serveur plante, la fenêtre reste ouverte pour afficher la cause.

> **npm n'est jamais utilisé**, ni pour jouer, ni pour mettre le jeu en ligne.
> Si `npm` reste introuvable sur ton PC, ce n'est plus un problème : seul
> **Node.js** est nécessaire.

### Vérifier que Node.js est là

Dans le terminal de VS Code, ou dans Invite de commandes :

```powershell
node -v
```

Tu dois voir `v18.x`, `v20.x`, `v22.x`… Si la commande est inconnue, Node.js
n'est pas installé (voir juste en dessous).

### Si Node.js manque

- Le plus simple : relance `Lancer le jeu.bat` et réponds **O** à la question.
- Ou installe-le depuis <https://nodejs.org/fr/download> : version **LTS**,
  laisse cochée l'option **Add to PATH**.
- Ou en ligne de commande :

  ```powershell
  winget install OpenJS.NodeJS.LTS --source winget
  ```

Après une installation manuelle, **ferme toutes les fenêtres de VS Code** (pas
« Recharger la fenêtre ») : un terminal déjà ouvert ne voit jamais un programme
installé après son démarrage. Le `.bat` n'a pas ce problème, il relit le disque
à chaque lancement.

### « npm n'est pas reconnu » : pourquoi, et pourquoi ce n'est plus grave

`npm` n'est pas un programme séparé : il est livré **avec** Node.js. L'erreur
`npm : commande introuvable` signifie donc que Node.js n'est pas installé, ou
que le terminal garde l'ancienne liste de programmes. Comme le jeu n'utilise
aucun paquet npm, il n'y a rien à réparer : il suffit que `node` fonctionne.

### Si tu préfères le terminal

```powershell
node server/index.js
```

puis <http://localhost:3000>. Ouvre un **deuxième onglet** sur la même adresse
pour tester le multijoueur (autre nom, autre couleur).

Au démarrage, le serveur affiche :

```text
Pixel Village prêt : http://localhost:3000  [WebSocket intégré, zéro dépendance]
```

### Commandes

| Action                  | Commande                                                          |
| ----------------------- | ----------------------------------------------------------------- |
| Lancer le jeu           | double-clic sur **`Lancer le jeu.bat`**                            |
| Lancer le serveur seul  | `node server/index.js`                                            |
| Changer le port         | `set PORT=4000` puis `node server/index.js` (PowerShell : `$env:PORT=4000; node server/index.js`) |
| Arrêter                 | `Ctrl+C` dans la fenêtre du serveur                               |
| Tester les épreuves     | `node tests/houses.test.mjs`                                      |
| Tester les donjons      | `node tests/dungeons.test.mjs`                                     |

### Contrôles

| Touche                         | Action                        |
| ------------------------------ | ----------------------------- |
| `ZQSD` / `WASD` / flèches      | se déplacer                   |
| `E`                            | entrer dans une maison, sortir, agir, ouvrir le portail, frapper, ouvrir un coffre |
| `I`                            | ouvrir / fermer l'inventaire  |
| `P`                            | ouvrir / fermer les paramètres |
| `1` `2` `3`                    | répondre aux énigmes          |
| `Entrée`                       | ouvrir le chat                |
| `Échap`                        | fermer le chat, l'inventaire ou les paramètres, quitter une maison ou un donjon |

Toutes ces touches (sauf `Entrée` et `Échap`) se changent dans les paramètres ;
les flèches restent toujours actives pour se déplacer.
| Clic sur une pastille          | changer la couleur du personnage |

Les touches sont lues via `event.code` : les touches **physiques** fonctionnent
donc aussi bien sur un clavier AZERTY que QWERTY.

---

## 2. Comment le projet est organisé

```text
.
├── GUIDE.md              # guide du joueur (commandes, maisons, inventaire…)
├── Lancer le jeu.bat     # double-clic : démarre le serveur + ouvre le navigateur
├── package.json          # métadonnées Node uniquement, aucune dépendance
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
        ├── houses.js     # maisons, épreuves et récompenses
        ├── dungeons.js   # portail, donjons, monstres, butin, équipement
        ├── inventory.js  # panneau d'inventaire (touche I) + icônes
        ├── settings.js   # paramètres : volume et touches personnalisables
        ├── audio.js      # sons synthétisés (aucun fichier audio)
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
| Changer les touches par défaut | `public/js/settings.js`        | `DEFAULT_BINDINGS`                   |
| Changer/ajouter des sons       | `public/js/audio.js`           | `SOUNDS`                             |

Les sprites font 12 × 16 pixels et sont dessinés avec des caractères :

```js
'...hhhhhh...',   // h = cheveux
'..hhhhhhhh..',
'..hssssssh..',   // s = peau
'..hseSSesh..',   // e = yeux
```

Chaque lettre correspond à une couleur dans `BASE_PALETTE`. Tu peux redessiner
un personnage sans aucune compétence en dessin ni logiciel externe.

### Les maisons, épreuves et récompenses

Trois maisons du village s'ouvrent avec `E` quand on se place devant leur porte.
Chacune est une **salle privée** : on y entre seul, et les autres joueurs voient
simplement l'avatar disparaître (il réapparaît à la même place en sortant).

| Maison                | Épreuve                                                  | Récompense          | Effet |
| --------------------- | -------------------------------------------------------- | ------------------- | ----- |
| Chaumière des runes   | reproduire de mémoire la séquence de 4 runes             | Lampe du veilleur   | halo de lumière autour du personnage |
| Atelier des cristaux  | toucher 6 cristaux en 32 secondes                        | Bottes de vent      | 25 % plus rapide |
| Maison du sage        | répondre aux 3 énigmes du livre sans erreur               | Médaillon du sage   | aura dorée au-dessus de la tête |

Toute la mécanique vit dans `public/js/houses.js` :

| Envie                                  | Où regarder                                    |
| -------------------------------------- | ---------------------------------------------- |
| Changer les énigmes et leurs réponses   | `QUIZ` (le champ `answer` est l'index correct) |
| Changer la durée des cristaux          | `createChallenge('cristaux')`, champ `time`    |
| Déplacer runes, cristaux, livre        | `RUNE_PADS`, `CRYSTAL_SPOTS`, `TOME`           |
| Changer les textes et récompenses      | `HOUSE_SPECS` et `REWARDS`                     |
| Changer la porte d'une maison          | `house(...)` dans `public/js/map.js`           |

Les récompenses sont conservées dans le navigateur
(`localStorage`, clé `pixel-village:rewards`) : on les garde d'une session à
l'autre, sans compte. Un joueur qui refait une épreuve gagnée garde sa
récompense. Si tu veux tout remettre à zéro, efface cette clé depuis la console
(F12).

### Les paramètres (touche P)

`P`, ou les boutons **Paramètres** (HUD et écran d'accueil), ouvrent un panneau
avec deux sections :

- **Son** : un curseur de volume des effets, un bouton pour couper/rétablir le
  son et un bouton **Tester**. Les sons sont synthétisés à la volée avec l'API
  Web Audio (clics, ramassage de cristal, rune, réussite, échec) : il n'y a
  aucun fichier audio dans le projet.
- **Touches** : un bouton par action (haut, bas, gauche, droite, agir,
  inventaire, paramètres). On clique sur la touche affichée, puis on appuie sur
  la nouvelle. Si la touche est déjà utilisée par une autre action, **les deux
  touches sont échangées** (jamais de doublon). `Échap` annule, et les touches
  réservées (`Entrée`, `Tab`, majuscules, contrôle, alt) sont refusées avec un
  message.

Les réglages sont enregistrés dans le navigateur : `pixel-village:settings`
pour le volume et la sourdine, `pixel-village:keys` pour les touches. Le bouton
**Réinitialiser** remet tout à zéro. Les libellés suivent le clavier réel quand
le navigateur le permet : sur AZERTY, la touche physique `KeyW` s'affiche « Z ».

Pendant qu'un panneau (inventaire ou paramètres) est ouvert, le personnage ne
bouge pas et aucun ordre n'est envoyé au serveur.

### L'inventaire (touche I)

`I`, ou le bouton **Sac (I)** en haut à gauche, ouvre l'inventaire : trois
emplacements avec les icônes pixel art des objets, et pour chacun son origine,
sa description et son effet. Les emplacements non gagnés restent visibles, avec
« ? » et l'indice de la maison qui les contient — c'est aussi la liste des
defis restants.

Pendant que l'inventaire est ouvert, le personnage ne bouge plus (aucun ordre
n'est envoyé au serveur) ; `I`, `Échap`, `Entrée` ou un clic à côté du panneau
le referment. Les icônes sont dessinées en ASCII dans `public/js/inventory.js`,
sur le même principe que les personnages : tu peux les redessiner sans
logiciel. Le panneau affiche aussi l'**équipement** (arme, armure) et le
**butin des donjons**, avec les boutons **Équiper** / **Retirer**.

### Les donjons et le portail

Le portail se trouve au bout nord de la rue nord-sud (`PORTAL` dans
`public/js/map.js`). Devant lui, `E` ouvre un panneau qui liste les donjons ;
en choisir un crée une **instance privée** générée par
`public/js/dungeons.js` : salle, monstres, coffres et butin. Comme pour une
maison, le serveur ne reçoit que « je suis à l'intérieur » : il ne connaît ni
les monstres, ni les PV, ni le butin, et rien de tout cela ne peut donc
désynchroniser les autres joueurs.

Tout se règle en haut du fichier :

| Réglage | Où | Effet |
| ------- | -- | ----- |
| `DUNGEONS` | `dungeons.js` | nom, niveau, monstres, nombre de coffres, liste du butin |
| `MONSTERS` | `dungeons.js` | PV, dégâts, vitesse et taille de chaque monstre |
| `LOOT` | `dungeons.js` | armes et armures : bonus, rareté, couleur d'icône |
| `BASE_STATS` | `dungeons.js` | attaque, défense et PV de base du personnage |
| `ENTRY_GRACE`, `MONSTER_AGGRO` | `dungeons.js` | répit à l'arrivée, distance de poursuite |
| `PLAYER_RADIUS`, `ROOM_W`, `ROOM_H` | `dungeons.js` | taille et collisions des salles |

Pour ajouter un donjon : une entrée dans `DUNGEONS` (avec ses identifiants de
butin déjà présents dans `LOOT`), et c'est tout — le panneau du portail, le
compteur de coffres et les tests le prennent automatiquement. Les tests
vérifient que chaque salle est atteignable à pied, que les coffres et les
monstres sont sur du sol libre et que le butin vient bien du bon donjon.

Le serveur reçoit seulement deux informations : *je suis à l'intérieur* (pour
masquer l'avatar) et *ma vitesse* (pour rester aligné avec les Bottes de vent,
bornée entre 1 et 1,6).

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
   `README.md`, `Lancer le jeu.bat`, `server/` et `public/`.
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
   | **Build Command** | `echo aucune dependance` (ou laisser vide) |
   | **Start Command** | `node server/index.js` |
   | **Instance Type / Compute plan** | **Free** |

6. Facultatif mais utile : section **Advanced** → **Health Check Path** =
   `/healthz` (le serveur expose déjà cette route).
7. Clique sur **Deploy Web Service** (ou **Create Web Service**).

Render démarre le serveur (aucune dépendance à installer, le déploiement prend
moins d'une minute). Suis les logs dans l'onglet **Logs / Events**, tu dois voir :

```text
Pixel Village prêt : http://localhost:10000  [WebSocket intégré, zéro dépendance]
```

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

### Option B — itch.io (page de jeu) + Render (serveur)

Deux rôles différents, deux services :

| Rôle | Service | Pourquoi |
| --- | --- | --- |
| Page publique, upload du client, bouton « jouer » dans le navigateur | **itch.io** | gratuit, sans carte, héberge des fichiers statiques et référence les jeux |
| Serveur Node (WebSocket, joueurs, chat, collisions) | **Render** | itch.io n'exécute pas de Node : il ne peut pas garder un serveur en vie |

Le joueur arrive sur `https://tonpseudo.itch.io/pixel-village`, itch.io charge
`public/` dans une iframe, et ce client se connecte en `wss://` au serveur
Render. Les deux restent gratuits, mais il y a **deux URL** et deux choses à
mettre à jour séparément.

#### Étape 1 — Render d'abord

Suis l'option A. À la fin, note l'URL du service, par exemple
`https://pixel-village.onrender.com`, et vérifie qu'elle affiche bien le jeu.
C'est ce serveur qui alimentera le multijoueur.

#### Étape 2 — Indiquer cette URL au client

Ouvre `public/js/config.js` et renseigne, **sans slash final** :

```js
serverUrl: 'https://pixel-village.onrender.com',
```

Pourquoi c'est obligatoire : dans une iframe itch.io, la page n'a pas la même
origine que le serveur. Sans cette ligne, le client chercherait un WebSocket sur
le domaine d'itch.io et basculerait en solo.

Le client transforme tout seul `https://` en `wss://` et `http://` en `ws://` :
n'écris pas `wss://` toi-même dans `serverUrl`.

Cette URL est **ignorée quand tu joues en local** (`localhost` / `127.0.0.1`) :
le client parle alors au serveur qui a servi la page, donc double-cliquer sur
`Lancer le jeu.bat` continue de fonctionner normalement. Elle ne sert que
lorsque le client est hébergé ailleurs (itch.io).

#### Étape 3 — Préparer le zip

- Sélectionne le **contenu** de `public/`, pas le dossier `public` lui-même.
- Le zip doit ressembler exactement à ceci :

```text
index.html
style.css
js/config.js
js/main.js
js/map.js
js/net.js
js/renderer.js
js/sprites.js
js/input.js
```

- `index.html` doit être **à la racine du zip**, jamais dans un sous-dossier
  `public/`.
- Ne mets ni `server/`, ni `package.json`, ni `README.md` : itch.io n'en a pas
  besoin.
- Windows : sélectionne les fichiers → clic droit → **Envoyer vers → Dossier
  compressé**, puis ouvre le zip pour vérifier qu'`index.html` apparaît dès
  l'ouverture (et non `public\index.html`).

#### Étape 4 — Créer le projet itch.io

1. <https://itch.io> → **Register** (gratuit, sans carte bancaire).
2. Menu de ton compte (en haut à droite) → **Upload new project**.
3. Remplis :

   | Champ | Valeur |
   | --- | --- |
   | **Title** | `Pixel Village` |
   | **Project URL** | `pixel-village` → donne `tonpseudo.itch.io/pixel-village` |
   | **Short description** | « Un mini MMO RPG en pixel art, jouable dans le navigateur. » |
   | **Classification** | **Games** |
   | **Kind of project** | **HTML** |
   | **Pricing** | **No payments** (gratuit, sans don) |
   | **Uploads** | ton fichier `.zip` |

4. Après l'upload, coche **This file will be played in the browser** : c'est ce
   qui transforme le zip en jeu intégré à la page.

#### Étape 5 — Régler l'affichage (embed)

Les champs apparaissent une fois la case cochée :

| Réglage | Valeur conseillée | Pourquoi |
| --- | --- | --- |
| **Embed options / dimensions** | `960 × 540` (ou `1280 × 720`) | le jeu occupe toute la fenêtre ; ces tailles tiennent dans la page |
| **Fullscreen button** | coché | en plein écran, le clavier reste capté par le jeu |
| **Mobile friendly** | décoché | le jeu se joue au clavier (ZQSD / flèches) |
| **Orientation** | paysage | — |

#### Étape 6 — Tester avant de publier

1. Garde la visibilité **Draft** et ouvre l'URL secrète proposée par itch.io.
2. **Clique une fois dans la zone de jeu** : sans ce clic, l'iframe ne reçoit pas
   les touches.
3. Vérifie que le HUD affiche le nombre de joueurs et que le chat répond. Si tu
   vois « Serveur injoignable — tu joues en solo », c'est que `serverUrl` est mal
   renseigné, ou que le serveur Render dort encore.
4. Ouvre la page dans un second onglet pour confirmer que les deux personnages
   se voient.

#### Étape 7 — Publier

Passe la visibilité sur **Public**, puis **Save**. Le lien
`https://tonpseudo.itch.io/pixel-village` est partageable : les joueurs cliquent
sur **Run game**, sans rien télécharger.

#### Étape 8 — Mettre à jour

- **Client modifié** (HTML/CSS/JS) : refais le zip, uploade-le, coche à nouveau
  **This file will be played in the browser**, supprime l'ancien upload, sauvegarde.
- **Serveur modifié** : envoie sur GitHub, Render redéploie tout seul.
- **URL du serveur changée** : mets à jour `config.js` **et** refais le zip.

#### Les pièges de l'option B

- **Le menu reste figé, les boutons ne réagissent pas** : le JavaScript du jeu
  n'a pas été chargé. Dans ce cas, le jeu affiche maintenant un **bandeau rouge
  en bas de l'écran** avec le fichier introuvable (par exemple
  `…/js/main.js`). Cause habituelle : le zip ne contient pas le dossier `js/`,
  ou l'upload n'a pas été refait après une modification. Recrée le zip en
  sélectionnant **tout** le contenu de `public/`, dossier `js/` compris, puis
  remplace l'upload sur itch.io.

- **Le serveur Render s'endort** après 15 min sans visite. Le premier joueur
  arrive sur un serveur endormi : la page se charge, la connexion WebSocket
  échoue au bout de 5 s et le jeu passe en solo. Ouvre d'abord
  `https://pixel-village.onrender.com` (30 à 60 s de réveil), puis reviens sur la
  page itch.io — ou clique sur **Reconnecter** une fois le serveur réveillé.
- **Deux URL, deux mises à jour** : c'est le prix de l'option B. L'option A
  (tout sur Render) évite cette gymnastique.
- **HTTPS obligatoire** : `serverUrl` doit être en `https://`, sinon le
  navigateur bloque la connexion (contenu mixte).
- **itch.io n'exécute pas Node** : n'y uploade jamais le dossier `server/`.
- **Le mode solo fonctionne toujours**, même serveur éteint : on peut se
  promener dans le village sans connexion.

Limites d'upload itch.io pour un jeu HTML : 500 Mo décompressés, 200 Mo par
fichier, 1 000 fichiers — très au-dessus de ce projet (moins de 100 Ko).

#### Pourquoi choisir l'option B ?

- tu veux une **vraie page de jeu** : captures, description, commentaires,
  devlog, référencement interne d'itch.io ;
- tu veux pouvoir **mettre à jour le client sans redéployer** le serveur (et
  inversement) ;
- tu acceptes deux services et deux URL.

Pour jouer avec des amis, l'option A suffit et reste plus simple.

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
| `npm : commande introuvable`               | **Sans importance** : le jeu n'utilise pas npm. Utilise `Lancer le jeu.bat`. |
| `node : commande introuvable`              | Node.js n'est pas installé : double-clique sur `Lancer le jeu.bat` et réponds **O**. |
| Le `.bat` se ferme aussitôt                | Ouvre-le depuis le dossier du projet (à côté de `server/`) ; il affiche la cause. |
| « Serveur injoignable — tu joues en solo » | Le serveur n'est pas lancé : double-clique sur `Lancer le jeu.bat`.        |
| Le port 3000 est occupé                    | PowerShell : `$env:PORT=4000; node server/index.js` puis <http://localhost:4000>. |
| Le serveur Render met du temps à répondre  | Il était endormi : attends 30 à 60 secondes et recharge.                 |
| Render : *No repositories found*           | Dans Render, **Configure account** puis autorise l'accès au dépôt GitHub. |
| Render : build en échec                | **Build Command** = `echo aucune dependance` (ou vide) : le jeu n'a aucun paquet à installer. |
| Render : statut *Live* mais page 502       | **Start Command** doit être `node server/index.js` (le `.bat` ne sert qu'en local). |
| Render : le chat ne marche pas en ligne    | Vérifie l'onglet **Logs** ; le client utilise automatiquement `wss://` de la page. |
| Sur itch.io, le chat reste en solo         | `serverUrl` doit être en **https** (donc `wss://` automatiquement).      |
| Les sprites sont flous                     | Garde `image-rendering: pixelated` (déjà dans `style.css`).              |

---

## 6. Pistes pour aller plus loin

- Un boss par donjon, avec plusieurs phases et un butin garanti.
- PNJ marchand, monnaie et échange d'objets entre joueurs.
- D'autres maisons, des épreuves à deux joueurs et des récompenses partagées.
- Comptes joueurs et sauvegarde en base (SQLite/PostgreSQL).
- Nouvelles zones et donjons générés à partir d'une graine plus variée.
- Contrôles tactiles pour mobile.
- Éditeur de carte visuel (Tiled) et chargement d'un JSON.

Bon jeu, et surtout : tout est fait pour être modifié.
