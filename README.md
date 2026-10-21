# Pixel Village — mini MMO RPG en pixel art

Un jeu de rôle massivement multijoueur minimaliste, jouable **directement dans le
navigateur** : un village en pixel art, des personnages qui se croisent en temps
réel, un chat, un mode solo de secours et **trois maisons à visiter, chacune avec
son épreuve et sa récompense** — mais chaque maison reste scellée tant que le
donjon qui la garde n'a pas été vaincu. Les trois donjons du portail en cachent
trois autres, des **expéditions avancées** qui se débloquent dans l'ordre et
gardent un butin mythique, tiré selon une **rareté pondérée** : les pièces les
plus fortes restent rares. Les **talismans** complètent l'arme et l'armure avec
des effets utilitaires (PV, expérience, butin, régénération). Chaque monstre
vaincu rapporte de l'**expérience** :
les niveaux donnent des points à dépenser dans un **arbre de compétences** à
quatre branches, qui améliore les statistiques et débloque la **ruade** et le
**tourbillon**. Au nord-est, l'**échoppe du colporteur** rachète le butin en trop
contre des pièces.

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
| Tester les épreuves     | `node tests/houses.test.mjs` (épreuves et sceaux des maisons)     |
| Tester les donjons      | `node tests/dungeons.test.mjs`                                     |
| Tester l'échoppe et la carte | `node tests/shop.test.mjs`                                    |
| Tester l'expérience et les compétences | `node tests/skills.test.mjs`                        |
| Publier une modification | `node tools/publier.mjs "Message du commit"` (ou double-clic sur **`Publier sur GitHub.bat`**) |
| Vérifier tout + publier | le script lance `node --check` et les quatre tests avant d'envoyer |

### Contrôles

| Touche                         | Action                        |
| ------------------------------ | ----------------------------- |
| `ZQSD` / `WASD` / flèches      | se déplacer                   |
| `E`                            | entrer dans une maison, sortir, agir, ouvrir le portail, frapper, ouvrir un coffre |
| `K`                            | ouvrir / fermer l'arbre de compétences |
| `Espace`                       | ruade (donjon, compétence)    |
| `F`                            | tourbillon (donjon, compétence) |
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
        ├── dungeons.js   # portail, salles, fissures, monstres, butin, équipement, bourse
        ├── decor.js      # décors des salles de donjon (palettes et motifs)
        ├── skills.js     # expérience, niveaux, arbre de compétences, capacités
        ├── skills-panel.js # panneau de l'arbre (touche K)
        ├── shop.js       # échoppe : vente du butin, panneau, décor du comptoir
        ├── inventory.js  # panneau d'inventaire (touche I) + icônes
        ├── settings.js   # paramètres : volume et touches personnalisables
        ├── audio.js      # sons synthétisés (aucun fichier audio)
        ├── sprites.js    # pixel art des personnages (dessiné en ASCII)
        ├── weapons.js    # arme tenue en main + animation de frappe
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
| Changer le village (maisons, échoppe, arbres) | `public/js/map.js` | fonction `generateWorld`, constante `SHOP` |
| Changer la vitesse             | `public/js/config.js`          | `speed` (tuiles/seconde)             |
| Changer les couleurs           | `public/js/config.js`          | `colors`                             |
| Redessiner les personnages     | `public/js/sprites.js`         | tableaux `DOWN_BASE`, `SIDE_BASE`…   |
| Redessiner les armes en main   | `public/js/weapons.js`         | `paintWeapon`, `REST_ANGLE`          |
| Régler le geste de frappe      | `public/js/dungeons.js`        | `SWING_TIME`, `swingAngle`           |
| Changer le look des tuiles     | `public/js/renderer.js`        | `drawTile` et ses fonctions          |
| Changer le décor d'un donjon   | `public/js/decor.js`           | `DECORS` (sol, murs, motif)          |
| Régler l'XP et l'arbre         | `public/js/skills.js`          | `MAX_LEVEL`, `xpNeeded`, `SKILLS`, `BRANCHES` |
| Régler ruade et tourbillon     | `public/js/skills.js`          | `DASH_TIME`, `DASH_SPEED`, `SPECIAL_RANGE`, `SPECIAL_MULT` |
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

**Une maison, un donjon.** Chaque maison porte un sceau : sa porte reste fermée
tant que le donjon associé n'est pas conquis (toutes ses salles ordinaires
vidées). `HOUSE_SPECS[].requiredDungeon` porte le lien, `houseUnlocked(house,
conquered)` répond à la question, `houseForDungeon(id, houses)` fait le chemin
inverse pour annoncer la maison débloquée. Le `Set` des donjons conquis est
relu/écrit dans `localStorage` sous `pixel-village:dungeons` (`loadConquered`,
`saveConquered`), et mis à jour par `conquerDungeon` quand `updateRun` émet
`events.finished`.

| Maison                | Donjon gardien       | Épreuve                                                  | Récompense          | Effet |
| --------------------- | -------------------- | -------------------------------------------------------- | ------------------- | ----- |
| Chaumière des runes   | Crypte des brumes    | reproduire de mémoire la séquence de 4 runes             | Lampe du veilleur   | halo · fissures à +1,3 tuile · +10 % de butin |
| Atelier des cristaux  | Galerie des échos    | toucher 6 cristaux en 32 secondes                        | Bottes de vent      | +25 % de vitesse au village et en donjon |
| Maison du sage        | Antre du gardien     | répondre aux 3 énigmes du livre sans erreur               | Médaillon du sage   | aura · +15 % XP · +5 PV · +0,5 PV/s |

Côté rendu, `drawHouseSeal` (`houses.js`) peint le sceau dans le repère du
monde : barreaux en croix et gemme violette qui pulse quand la porte est close,
simple lueur verte au linteau quand elle est ouverte. Le décor du village dans
`main.js` appelle le portail puis un sceau par maison ; l'invite et le refus
(`enterHouse`) lisent le même `Set`, et le panneau du portail affiche l'état de
chaque sceau (`Conquis — … est ouverte` / `Garde la porte de …`).

Toute la mécanique vit dans `public/js/houses.js` :

| Envie                                  | Où regarder                                    |
| -------------------------------------- | ---------------------------------------------- |
| Changer les énigmes et leurs réponses   | `QUIZ` (le champ `answer` est l'index correct) |
| Changer la durée des cristaux          | `createChallenge('cristaux')`, champ `time`    |
| Déplacer runes, cristaux, livre        | `RUNE_PADS`, `CRYSTAL_SPOTS`, `TOME`           |
| Changer les textes et récompenses      | `HOUSE_SPECS` et `REWARDS`                     |
| Changer l'effet d'une récompense       | `relic` dans `REWARDS`, puis `relicEffects`    |
| Changer la porte d'une maison          | `house(...)` dans `public/js/map.js`           |
| Changer le donjon qui garde une maison | `requiredDungeon` dans `HOUSE_SPECS`           |

Les récompenses sont conservées dans le navigateur
(`localStorage`, clé `pixel-village:rewards`) : on les garde d'une session à
l'autre, sans compte. Un joueur qui refait une épreuve gagnée garde sa
récompense. Si tu veux tout remettre à zéro, efface cette clé depuis la console
(F12) — et `pixel-village:dungeons` pour refermer les maisons.

Chaque entrée de `REWARDS` porte un objet `relic` (chiffres) et un
`dungeonEffect` (texte affiché dans l'inventaire). `relicEffects(rewards)`
additionne ces chiffres sans toucher au DOM ; `main.js` garde le résultat dans
`state.relics`, le recalcule à chaque récompense et le passe à
`playerStats(vault, skills, relics)` ainsi qu'à `createRun(id, seed, relics)`.
C'est ce qui rend les récompenses utiles sous terre : le médaillon ajoute PV,
XP et régénération, la lampe allonge `run.secretRange` (lu par `crackNear`) et
ajoute du butin, les bottes augmentent `player.speed` au village comme en
donjon. Sans récompense, `relicEffects` renvoie des zéros et les statistiques
restent exactement celles d'avant.

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
logiciel. Le panneau affiche aussi l'**équipement** (arme, armure, talisman) et le
**butin des donjons**, avec les boutons **Équiper** / **Retirer**. La ligne
d'en-tête rappelle la bourse (« 2 butin · 68 pièces »).

### L'échoppe et la bourse

À la place de l'ancien lac, au nord-est, se dresse l'**échoppe du colporteur** :
un bâtiment de 7 × 5 tuiles (`SHOP` dans `public/js/map.js`) relié à la rue
nord-sud par un chemin de terre, avec un auvent rayé et un comptoir dessinés
par `drawShop` (`public/js/shop.js`, toujours sans fichier image). On s'arrête
devant le comptoir, `E` ouvre le panneau de vente, `Échap` ou un clic à côté le
referme — et le personnage ne bouge pas pendant ce temps.

Les pièces vivent dans le coffre du joueur : `vault.coins`, sérialisé avec le
reste dans `localStorage` (`pixel-village:loot`), relu par `sanitizeVault` (les
valeurs négatives sont ignorées, le total est plafonné). `createVault`
retourne donc `{ coins: 0, items: {}, equipped: {…} }`.

| Réglage | Où | Effet |
| ------- | -- | ----- |
| `SELL_PRICES` | `shop.js` | prix par rareté : 4 / 10 / 24 / 60 / 140 pièces |
| `SHOP_RANGE` | `shop.js` | distance à laquelle le comptoir répond |
| `SHOP` | `map.js` | position et taille de l'échoppe |
| `drawShop` | `shop.js` | auvent, comptoir, colporteur, enseigne |

La vente est **pure** et testée sans navigateur :

- `sellPrice(id)` lit la rareté de l'objet dans `LOOT` ;
- `sellItem(vault, id, n)` retire `n` exemplaires, crédite la bourse et
  **déséquipe** l'objet quand c'est le dernier (sinon le personnage garderait
  une arme fantôme) ;
- `sellAll(vault, id)` vend ce qui reste.

`main.js` centralise le passage par `sellLoot` : sauvegarde du coffre, HUD,
PV maximum (vendre une armure réduit les PV max), inventaire et panneau sont
rafraîchis ensemble, et la vente est annoncée dans le chat.

### Réinitialiser un personnage

Le bouton **Réinitialiser le personnage** de l'écran d'accueil efface les clés
de progression (`pixel-village:rewards`, `:loot`, `:dungeons`, `:name`,
`:color`), remet le nom et la couleur par défaut, et vide les `Set` en mémoire
(récompenses, donjons conquis) ainsi que la bourse. Il demande **deux clics**
(le premier arme le bouton pendant cinq secondes) pour éviter l'accident. Les
réglages — volume, sourdine, touches — ne sont pas touchés.

### Les donjons et le portail

Le portail se trouve au bout nord de la rue nord-sud (`PORTAL` dans
`public/js/map.js`). Devant lui, `E` ouvre un panneau qui liste les donjons ;
en choisir un crée une **instance privée** générée par
`public/js/dungeons.js` : plusieurs salles, leurs monstres, leurs coffres et une
salle secrète. Comme pour une maison, le serveur ne reçoit que « je suis à
l'intérieur » : il ne connaît ni les monstres, ni les PV, ni le butin, et rien
de tout cela ne peut donc désynchroniser les autres joueurs.

**Une expédition** (`createRun`) construit toutes les salles d'un coup : chaque
entrée de `dungeon.rooms` donne une salle de 21 × 17 (`buildRoom`), et chaque
entrée de `dungeon.secrets` une salle secrète de 15 × 11. L'escalier du bas
mène à la salle suivante (`nextRoom`) ; celui de la dernière salle sort du
donjon. Chaque salle secrète possède **sa propre fissure** : `createRun` choisit
des salles ordinaires distinctes (jamais la dernière) et y place les murs
déclarés par `dungeon.cracks`. `crackNear` détecte la fissure de la salle
courante, `enterSecretRoom` et `leaveSecretRoom` font l'aller-retour sans
perdre l'état de la salle d'origine. Le module ne touche pas au DOM : tout est
testable avec `node` seul.

**Le nombre de salles croît avec le niveau** : 2, 3, 4, 5, 6 puis 7, et les
salles secrètes suivent (1, 2, 3, 4, 5, 6). Un test vérifie ces deux croissances
et que le donjon de niveau N est plus long que le précédent.

**Chaque donjon a son décor** : `public/js/decor.js` ne contient que des
données (couleurs du sol, des murs et motif de l'accent), sans DOM, et
`dungeons.js` ne fait que retenir la clé du décor de son donjon sur chaque
salle (`room.decor`). C'est `renderer.js` qui dessine : dalles irrégulières et
mousse pour la Crypte, marbre et cristaux pour la Galerie, terre battue et
racines pour l'Antre, pierre noyée et flaques pour les Abysses, basalte et
braises pour la Forge, marbre noir et néant pour le Trône. Chaque salle tire
en plus une `variant` (0 à 2) qui change la densité du motif et le décalage des
dalles : deux salles d'une même descente ne se ressemblent pas. Un test
vérifie que les six donjons ont six décors distincts, que chaque palette porte
son identifiant (le rendu compare `decor.id`) et que les salles d'un donjon
n'ont pas toutes la même variante.

**Le butin est pondéré par rareté** : `RARITIES` fixe les cinq paliers
(`commun` → `mythique`) et `DROP_TABLES` donne, pour chaque donjon, les poids
d'une salle ordinaire et ceux d'une salle secrète. `createRoomEntry` tire chaque
coffre séparément avec `rollLootItem` : la rareté est choisie selon les poids,
puis l'objet uniformément parmi ceux de cette rareté ; `taken` évite les
doublons tant que le thème de la salle le permet. Une salle secrète puise dans
tout `dungeon.loot` — le butin d'élite y est favorisé, jamais garanti — alors
qu'une salle ordinaire reste limitée à son thème. Les monstres passent par le
même tirage dans `rollDrop`. Ajouter un objet se fait donc en trois endroits :
une entrée dans `LOOT` (avec `kind`, `rarity` et ses bonus), une place dans le
butin d'au moins un donjon, et éventuellement une salle. `gearStats` additionne
les trois emplacements (`arme`, `armure`, `talisman`) ; `playerStats` y ajoute
les effets de l'arbre.

**L'expérience et l'arbre** vivent dans `public/js/skills.js`, qui ne touche
pas au DOM : `MONSTERS[type].xp` donne la valeur d'un monstre, `xpForKill`
applique la profondeur du donjon (`1 + 0,2 × (niveau − 1)`) et le bonus
d'Érudit, et `gainXp` gère les niveaux en chaîne (un point par niveau,
20 niveaux maximum, 16 compétences). `playerStats(vault, skills)` fusionne
équipement et effets de l'arbre : c'est le seul point d'entrée utilisé par le
combat, donc les anciens appels sans compétences gardent exactement les
statistiques d'avant. `sanitizeSkills` recalcule les points à partir du niveau
et des prérequis : une sauvegarde trafiquée ne peut pas offrir plus de
compétences que de points gagnés. Le panneau (`skills-panel.js`) ne fait
qu'afficher l'arbre et remonter les clics ; `main.js` sauvegarde, recalcule les
statistiques et annonce les niveaux.

**Les capacités** sont des fonctions pures de `skills.js` qui manipulent les
compteurs de l'expédition : `prepareAbilities` arme les charges à l'entrée,
`tickAbilities` fait avancer les délais (même quand un panneau met le donjon
en pause), `startDash` consomme une ruade et `abilityState` alimente la barre
du bas. Le tourbillon, lui, est résolu par `specialAttack` dans `dungeons.js` :
il frappe tous les monstres d'un rayon, applique `SPECIAL_MULT` et renvoie les
morts et leur butin, que `main.js` transforme en XP et en objets. `updateRun`
gère la régénération (après `REGEN_DELAY` secondes sans coup) et le second
souffle (`events.revived`, 35 % des PV, deux secondes d'invulnérabilité).

Quand toutes les salles ordinaires sont vidées, `updateRun` passe `run.phase` à
`won` et renvoie `events.finished` : `main.js` appelle alors `conquerDungeon`,
qui ajoute l'identifiant à `state.conquered`, l'écrit dans
`pixel-village:dungeons` et annonce dans le chat la maison qui s'ouvre. C'est le
seul lien entre un donjon et une maison : `dungeons.js` ignore tout des maisons,
et `houses.js` ne connaît que l'identifiant du donjon gardien.

Les **expéditions avancées** (niveaux 4 à 6) portent une liste `requires` : les
Abysses noyées exigent les trois donjons du village, la Forge des cendres exige
les Abysses, le Trône du néant exige la Forge. `dungeonUnlocked(dungeon,
conquered)` répond à la question, `missingDungeons` fournit la liste lisible
pour la carte verrouillée et `starterDungeons` renvoie les trois donjons
ouverts d'emblée. La condition est évaluée à chaque ouverture du portail et
`enterDungeon` la revérifie : une carte grisée ne peut pas être forcée. À la
victoire, `conquerDungeon` compare l'état avant/après et annonce chaque
expédition qui vient de s'ouvrir. Aucune de ces trois expéditions ne garde de
maison : seuls les trois donjons du village sont liés à un sceau.

Tout se règle en haut du fichier :

| Réglage | Où | Effet |
| ------- | -- | ----- |
| `DUNGEONS` | `dungeons.js` | salles (`rooms`), salles secrètes (`secrets`), fissures (`cracks`), monstres, coffres, butin |
| `MONSTERS` | `dungeons.js` | PV, dégâts, XP, vitesse et taille de chaque monstre |
| `requires`, `dungeonUnlocked` | `dungeons.js` | chaîne de déblocage des expéditions avancées |
| `LOOT` | `dungeons.js` | armes, armures et talismans : bonus, rareté, couleur d'icône |
| `RARITIES`, `RARITY_ORDER` | `dungeons.js` | paliers de rareté, libellé, rang et couleur |
| `DROP_TABLES`, `dropChances` | `dungeons.js` | poids de tirage par donjon, salle ordinaire et salle secrète |
| `rollLootItem` | `dungeons.js` | tirage pondéré d'un objet, avec exclusion des doublons |
| `BASE_STATS` | `dungeons.js` | attaque, défense et PV de base du personnage |
| `ENTRY_GRACE`, `MONSTER_AGGRO` | `dungeons.js` | répit à chaque arrivée, distance de poursuite |
| `SWING_TIME`, `swingAngle` | `dungeons.js` | durée et trajectoire du coup |
| `WEAPON_ARTS`, `paintWeapon` | `dungeons.js`, `weapons.js` | silhouettes d'armes tenues en main |
| `LAYOUTS`, `ROOM_W`, `ROOM_H` | `dungeons.js` | tailles, piliers et places des salles et de la salle secrète |
| `SECRET_RANGE`, `CRACK_SPOTS` | `dungeons.js` | portée de la fissure et ses dix emplacements de mur (haut, bas, milieu, gauche, droite) |

Pour ajouter une salle : une entrée dans `rooms` (nom, intro, monstres,
nombre de coffres, butin), et c'est tout — la descente, le panneau et les
tests la prennent automatiquement. Pour ajouter une salle secrète : une entrée
dans `secrets` **et** une clé de `CRACK_SPOTS` dans `cracks` (une par secrète,
sur des murs différents). Pour ajouter un donjon : une entrée dans `DUNGEONS`
avec au moins deux salles et une `secrets`, plus un `requires` si l'expédition
doit rester fermée au départ. Un monstre inédit demande une entrée dans
`MONSTERS` **et** une branche dans `drawMonster` (le dessin est fait au canvas,
sans image). Les tests vérifient que chaque salle (secrète comprise) est
atteignable à pied depuis son arrivée, que les coffres et les monstres sont sur
du sol libre, que le butin vient bien du thème de la salle (ou de tout le
donjon pour une salle secrète), que chaque fissure est
atteignable et occupe une salle distincte, que les deux croissances (salles et
secrètes) tiennent, et qu'une même graine redonne la même expédition.

L'arme équipée est **visible dans la main** du personnage. Son identifiant vient
de l'inventaire (`equippedWeapon`), la silhouette est peinte par
`public/js/weapons.js` (aucun fichier image) et le rendu la fait tourner autour
de la main. Le coup est purement visuel : `attackRun` applique les dégâts à
l'appui sur `E` puis arme `run.swing` ; `swingAngle` (fonction pure, testée sans
navigateur) donne l'angle du geste image par image, avec une traînée claire et
le personnage tourné vers la cible. Seul le joueur voit son arme : le serveur
ne connaît pas l'équipement des autres joueurs.

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

Pour que ce soit **une seule commande**, `node tools/publier.mjs "message"`
vérifie la syntaxe de tous les modules, lance les quatre tests, refuse d'envoyer
si l'un échoue, commit, se met à jour depuis GitHub puis pousse sur `main`.
Le double-clic **`Publier sur GitHub.bat`** fait la même chose en demandant le
message. Un échec laisse le jeu officiel intact.

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
