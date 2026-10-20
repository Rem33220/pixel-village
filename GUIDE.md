# Guide du joueur — Pixel Village

Bienvenue ! Ce guide explique **comment jouer** : commandes, maisons, épreuves,
récompenses, inventaire, paramètres et partie à plusieurs. Il ne parle pas
d'installation ni de code : pour ça, voir [README.md](README.md).

> **Note de maintenance** — ce fichier décrit *toutes* les fonctionnalités
> jouables et doit être mis à jour à chaque nouveauté (voir la dernière section).
> État décrit : celui du commit `6276e10` (portail, donjons, combat, butin et
> équipement compris). Les commits qui ne touchent que la documentation ne
> changent rien à ce guide.

---

## Sommaire

1. [Rejoindre le village](#1-rejoindre-le-village)
2. [Commandes](#2-commandes)
3. [Se repérer dans le village](#3-se-repérer-dans-le-village)
4. [Les maisons et leurs épreuves](#4-les-maisons-et-leurs-épreuves)
5. [L'inventaire (`I`)](#5-linventaire-i)
6. [Les paramètres (`P`)](#6-les-paramètres-p)
7. [Jouer à plusieurs](#7-jouer-à-plusieurs)
8. [Ta sauvegarde](#8-ta-sauvegarde)
9. [Astuces](#9-astuces)
10. [En cas de problème](#10-en-cas-de-problème)
11. [Les donjons et le portail](#11-les-donjons-et-le-portail)
12. [Ce qui n'existe pas encore](#12-ce-qui-nexiste-pas-encore)
13. [Mettre ce guide à jour](#13-mettre-ce-guide-à-jour)

---

## 1. Rejoindre le village

### En ligne (le plus simple)

Ouvre <https://pixel-village-pixel-village-onrender-com.onrender.com> dans un
navigateur récent. Si le serveur dormait, la première page peut mettre 30 à
60 secondes à répondre : recharge simplement.

### Sur ton ordinateur

Double-clique sur **`Lancer le jeu.bat`** : il démarre le serveur et ouvre
<http://localhost:3000>. Ferme la fenêtre noire pour arrêter le jeu.

### L'écran d'accueil

1. **Nom du personnage** : 14 caractères maximum (mémorisé pour la prochaine fois).
2. **Couleur** : six pastilles, une seule à la fois (mémorisée aussi).
3. **Entrer dans le village** : partie en ligne, avec les autres joueurs.
4. **Jouer en solo** : le jeu démarre sans serveur. Tout fonctionne (maisons,
   épreuves, récompenses, inventaire), sauf le chat et les autres joueurs.
5. **Paramètres** : pour régler le son et les touches avant même de jouer.

Tu commences au milieu du village, sur la place herbeuse au croisement des deux
chemins.

---

## 2. Commandes

| Touche | Action |
| ------ | ------ |
| `ZQSD` / `WASD` / flèches | se déplacer (les diagonales fonctionnent) |
| `E` | entrer dans une maison, sortir, lire le livre des énigmes, ouvrir le portail, frapper un monstre, ouvrir un coffre |
| `I` | ouvrir / fermer l'inventaire |
| `P` | ouvrir / fermer les paramètres |
| `Entrée` | ouvrir le chat (puis `Entrée` pour envoyer) |
| `Échap` | fermer le chat, un panneau, quitter une maison ou un donjon |
| `1` `2` `3` | répondre aux énigmes de la Maison du sage |

Deux boutons sont aussi disponibles en haut à gauche : **Sac (I)** et
**Paramètres**. Toutes les touches de déplacement et d'action se changent dans
les paramètres ; les flèches restent toujours actives.

Un rappel des touches est affiché en bas à droite pendant la partie.

---

## 3. Se repérer dans le village

- Deux chemins de terre se croisent : une **grand-rue** est-ouest et une **rue
  nord-sud**. Les suivre évite les arbres.
- Un **lac** avec sa plage occupe le nord-est.
- La carte est fermée par une **forêt** sur tout le pourtour ; impossible d'en
  sortir.
- Au **bout nord de la rue nord-sud**, une petite place dallée porte un
  **portail** lumineux entouré de deux piliers : c'est l'entrée des donjons
  (voir la section 11).
- Trois maisons, chacune avec sa porte marron et son paillasson lumineux :

| Maison | Où | Depuis la place centrale |
| ------ | -- | ------------------------ |
| Chaumière des runes | nord-ouest | grand-rue vers l'ouest, puis montée vers le nord |
| Atelier des cristaux | sud-ouest | grand-rue vers l'ouest, puis descente vers le sud |
| Maison du sage | sud-est | rue nord-sud vers le sud, puis grand-rue vers l'est |

Quand tu t'approches d'une porte, une invite **« Entrer — … »** s'affiche en bas
de l'écran : appuie sur `E`. Les arbres, les rochers, l'eau et les murs sont
solides : ils arrêtent le personnage, c'est normal.

En haut à gauche, tu vois ton nom, le nombre de joueurs en ligne et tes
récompenses gagnées.

---

## 4. Les maisons et leurs épreuves

Chaque maison contient une salle privée (on y entre seul), une épreuve et une
récompense durable. Le panneau à droite rappelle l'objectif et l'avancement.
Appuie sur `E` devant le seuil lumineux (ou `Échap`) pour ressortir : tu
réapparais exactement là où tu étais.

### Chaumière des runes — l'épreuve de mémoire

- Quatre dalles de pierre sont disposées autour d'un tapis.
- Elles s'allument **l'une après l'autre**, toujours dans le même ordre pour
  cette tentative : observe bien.
- Quand le panneau affiche « À toi », marche sur les dalles dans le même ordre.
- Une erreur relance l'observation depuis le début (même ordre, rien n'est perdu).
- **Récompense : la Lampe du veilleur** — un halo de lumière t'accompagne.

*Astuce : les quatre dalles entourent le tapis ; commence par la plus proche de
toi pour ne pas traverser la salle inutilement.*

### Atelier des cristaux — l'épreuve de rapidité

- Six cristaux bleus sont répartis dans la salle.
- Tu as **32 secondes** pour les toucher tous : il suffit de marcher dessus.
- Le panneau affiche `x/6 cristaux` et le temps restant.
- Temps écoulé : les cristaux se rallument et le sablier repart de zéro.
- **Récompense : les Bottes de vent** — tu marches 25 % plus vite, partout.

*Astuce : fais le tour de la salle dans un sens sans revenir en arrière ; les
cristaux des coins sont les plus rapides à enchaîner.*

### Maison du sage — l'épreuve des énigmes

- Un livre ouvert t'attend au fond de la salle, sur un pupitre : approche-toi et
  appuie sur `E`.
- Trois énigmes, trois réponses possibles chacune. Réponds en cliquant sur le
  bouton, ou avec les touches `1`, `2`, `3`.
- **Une seule erreur** renvoie à la première énigme : il faut les trois d'affilée.
- **Récompense : le Médaillon du sage** — une aura dorée au-dessus de la tête.

### Après une épreuve

- Le panneau affiche « Épreuve réussie », la récompense apparaît en haut à
  gauche et un son de réussite retentit.
- On peut refaire une épreuve déjà gagnée (pour le plaisir) : la récompense
  reste acquise et n'est jamais donnée deux fois.

---

## 5. L'inventaire (`I`)

L'inventaire a trois parties : **Équipement**, **Butin des donjons** et
**Récompenses du village**.

### Équipement

Deux emplacements : une **arme** et une **armure**. Chacun affiche l'objet porté
et son bonus (`+4 ATQ`, `+3 DÉF`) ; clique dessus pour lire sa fiche ou le
retirer. Un emplacement vide indique simplement « Aucune arme » / « Aucune
armure ».

- **ATQ** (attaque) : dégâts de chaque coup (`E`), base 4 sans arme.
- **DÉF** (défense) : points de dégâts retirés à chaque coup reçu, et **+2 PV
  maximum par point de défense**.

L'arme et l'armure comptent ensemble : le HUD en haut à gauche affiche en
permanence `ATQ … · DÉF …` (survole-le pour voir les deux objets portés).

### Butin des donjons

Chaque objet trouvé dans un coffre apparaît ici avec son icône, son nom, son
bonus et un badge `×2` si tu en as plusieurs exemplaires. Clique sur un objet
puis sur **Équiper** : l'objet passe dans l'emplacement correspondant et tes
statistiques montent immédiatement. Le bouton devient **Retirer**.

| Arme | Bonus | Où |
| ---- | ----- | -- |
| Dague rouillée | +2 ATQ | Crypte des brumes |
| Épée courte | +4 ATQ | Crypte des brumes |
| Hache de pierre | +6 ATQ | Galerie des échos |
| Lame des brumes | +9 ATQ | Galerie des échos |
| Épée du gardien | +13 ATQ | Antre du gardien |

| Armure | Bonus | Où |
| ------ | ----- | -- |
| Tunique de cuir | +1 DÉF | Crypte des brumes |
| Cotte de mailles | +3 DÉF | Galerie des échos |
| Plastron runique | +5 DÉF | Galerie des échos |
| Gantelets de pierre | +4 DÉF | Antre du gardien |
| Armure du gardien | +8 DÉF | Antre du gardien |

Les objets ne se perdent jamais, même en tombant dans un donjon. Ils restent
dans le navigateur (voir la section 8).

### Récompenses du village

Trois emplacements, un par maison :

- **Obtenu** : icône, nom, maison d'origine, description et effet.
- **Vide** : affiché avec « ? » et l'indice « À gagner dans : … » — c'est aussi
  la liste de ce qu'il te reste à découvrir.

Clique sur un emplacement pour lire sa fiche. Pendant que l'inventaire est
ouvert, ton personnage ne bouge pas (et les autres joueurs ne te voient pas
glisser). Ferme avec `I`, `Échap`, `Entrée` ou un clic à côté du panneau.

| Objet | Effet réel |
| ----- | ---------- |
| Lampe du veilleur | halo de lumière autour du personnage |
| Bottes de vent | vitesse de marche +25 % (aussi côté serveur) |
| Médaillon du sage | aura dorée au-dessus de la tête |

---

## 6. Les paramètres (`P`)

Accessibles depuis l'écran d'accueil **et** en jeu.

### Son

- **Volume des effets** : curseur de 0 à 100 %, appliqué immédiatement.
- **Couper le son** : coupe tout sans perdre le réglage du volume.
- **Tester le son** : joue un petit arpège pour vérifier.
- Les sons (clic, cristal ramassé, rune validée, entrée, réussite, échec) sont
  générés par le navigateur : aucun téléchargement.

> Les navigateurs n'autorisent le son qu'après une action du joueur : si tu
> n'entends rien au tout premier écran, clique une fois dans la page.

### Touches

- Un bouton par action : haut, bas, gauche, droite, agir/entrer, inventaire,
  paramètres.
- Clique sur la touche affichée, puis **appuie sur la nouvelle**.
- Si la touche est déjà prise, **les deux actions échangent leurs touches** :
  aucun doublon n'est possible.
- `Échap` annule la modification en cours.
- `Entrée`, `Tab`, `Maj`, `Ctrl` et `Alt` sont refusées (touches du navigateur,
  du chat ou de l'annulation).
- **Réinitialiser** remet le volume à 100 %, réactive le son et rend les touches
  par défaut.

Les libellés suivent ton clavier quand le navigateur le permet : sur AZERTY, la
touche physique « W » s'affiche « Z ».

---

## 7. Jouer à plusieurs

- En mode en ligne, jusqu'à **50 joueurs** sur le même village.
- **Chat** : `Entrée`, tape ton message (120 caractères), `Entrée` pour envoyer.
  Un message toutes les 0,5 seconde maximum. Ton texte apparaît aussi dans une
  bulle au-dessus de ton personnage pendant quelques secondes.
- Les joueurs qui entrent dans une maison ou dans un donjon **disparaissent de
  la carte** : leur instance est privée. Ils réapparaissent à leur place en
  sortant.
- Si la connexion se coupe ou si le serveur est injoignable au démarrage, le
  jeu passe automatiquement en solo avec un bandeau, et tes récompenses sont
  conservées. Le bouton **Reconnecter** du bandeau permet de retenter la
  connexion sans quitter la partie.

Les épreuves ne sont pas jouables à deux : chacun visite sa propre salle.

---

## 8. Ta sauvegarde

Aucun compte, aucun mot de passe : tout est enregistré **dans ce navigateur**
(`localStorage`).

| Clé | Contenu |
| --- | ------- |
| `pixel-village:name` | ton nom |
| `pixel-village:color` | ta couleur |
| `pixel-village:rewards` | tes récompenses |
| `pixel-village:loot` | ton butin et ton équipement |
| `pixel-village:keys` | tes touches personnalisées |
| `pixel-village:settings` | volume et sourdine |

Conséquences à connaître :

- Changer d'ordinateur ou de navigateur = repartir de zéro.
- Vider les données du site efface la progression.
- Gagner une récompense dans un navigateur ne la donne pas aux autres.

Pour tout remettre à zéro depuis la console (F12), par exemple :

```js
localStorage.removeItem('pixel-village:rewards');
localStorage.removeItem('pixel-village:loot');
localStorage.removeItem('pixel-village:keys');
localStorage.removeItem('pixel-village:settings');
```

Puis recharge la page.

---

## 9. Astuces

- Les chemins de terre sont les trajets les plus fiables : la forêt est dense.
- Pour aller vite, marche en diagonale (deux touches à la fois) : la vitesse est
  la même, mais le trajet est plus court qu'un L.
- Fais l'Atelier des cristaux en dernier si tu veux garder le plaisir du chrono :
  les Bottes de vent rendent l'épreuve bien plus facile.
- La Lampe du veilleur est purement visuelle : elle ne remplace pas les
  récompenses de vitesse.
- Si une porte semble bloquée, contourne par le chemin : il y a toujours un
  passage dégagé devant chaque maison.

---

## 10. En cas de problème

| Symptôme | Que faire |
| -------- | --------- |
| « Serveur injoignable — tu joues en solo » | serveur endormi ou arrêté : attends 30 s et recharge, ou relance `Lancer le jeu.bat` |
| Le personnage ne bouge plus | vérifie qu'un panneau (`I`, `P`) n'est pas ouvert, puis reclique dans la page |
| Aucun son | clique une fois dans la page (règle du navigateur), puis vérifie le volume et la sourdine dans `P` |
| Une touche ne répond pas | elle a peut-être été réattribuée : `P` puis **Réinitialiser** |
| Le jeu semble figé après un changement de fenêtre | clique dans la page ; sinon recharge |
| Le site ne se met pas à jour | recharge avec `Ctrl+F5` (cache du navigateur) |

---

## 11. Les donjons et le portail

### Entrer dans un donjon

1. Suis la **rue nord-sud** jusqu'à son extrémité nord : une petite place dallée
   avec deux piliers et un tourbillon lumineux.
2. Approche-toi : l'invite **« Portail — choisir un donjon »** apparaît.
3. Appuie sur `E` : le **panneau du portail** liste les trois donjons, avec
   leur niveau, leur danger, le nombre de monstres et de coffres, et le butin
   possible.
4. Clique sur **Entrer — niveau …**. Tu y entres **seul** : les autres joueurs
   te voient disparaître, comme pour une maison.

Pour ressortir : monte sur l'**escalier lumineux** en bas de la salle et appuie
sur `E`, ou appuie sur `Échap`. Tu réapparais exactement devant le portail.

### Les trois donjons

| Donjon | Niveau | Danger | Monstres | Coffres | Butin possible |
| ------ | ------ | ------ | -------- | ------- | -------------- |
| Crypte des brumes | 1 | Calme | 2 baveux | 3 | dague, tunique de cuir, épée courte |
| Galerie des échos | 2 | Risqué | 3 squelettes + 1 baveux | 4 | hache de pierre, cotte de mailles, lame des brumes, plastron runique |
| Antre du gardien | 3 | Mortel | 2 golems + 1 squelette | 3 | épée du gardien, armure du gardien, gantelets de pierre |

Chaque donjon est **rejouable** : la disposition et le contenu des coffres
changent à chaque entrée, ce qui permet de récupérer un objet manqué.

| Monstre | PV | Dégâts par coup | Comportement |
| ------- | -- | --------------- | ------------ |
| Baveux | 14 | 2 | lent, poursuit de près |
| Squelette | 24 | 5 | rapide |
| Golem | 55 | 10 | lent mais très dangereux |

### Le combat

- `E` **frappe** le monstre le plus proche (à moins d'une tuile et demie). Un
  coup toutes les 0,42 seconde.
- Les dégâts que tu infliges sont ton **ATQ** : 4 à mains nues, plus le bonus de
  ton arme.
- Les monstres te poursuivent quand tu t'approches et frappent au contact,
  environ une fois par seconde.
- Tu subis `dégâts du monstre − DÉF` (toujours au moins 1 point).
- Tu as **1,2 seconde de répit** à l'arrivée : le temps de regarder la salle.
- Tes **PV** s'affichent en haut à gauche, dans la barre rouge.

**Si tu tombes** (PV à zéro) : tu es renvoyé devant le portail, avec tous tes
points de vie pour la prochaine visite. **Tu ne perds ni butin ni équipement.**

### Les coffres et le butin

- Approche-toi d'un coffre : l'invite **« Ouvrir le coffre »** apparaît.
  Appuie sur `E` : l'objet tombe directement dans ton inventaire.
- Chaque coffre contient un objet **différent** du donjon.
- Les monstres laissent parfois tomber un objet (environ une fois sur trois).
- Le panneau de droite suit ta progression : `coffres ouverts · monstres
  restants · PV`. Quand tous les coffres sont ouverts, la salle est nettoyée :
  il ne reste qu'à sortir.
- Ouvre l'inventaire (`I`) et clique sur l'objet puis **Équiper** : il compte
  immédiatement dans tes statistiques (voir la section 5).

Pendant qu'un panneau est ouvert (inventaire, paramètres, portail), le donjon
est **en pause** : impossible de se faire tuer dans un menu.

### Conseils

- Combats **un monstre à la fois** : tu marches plus vite qu'eux, recule pour
  les séparer.
- Fais la Crypte des brumes en premier : ses objets rendent la Galerie et
  l'Antre bien plus faciles.
- L'**armure** fait deux choses à la fois : elle réduit les dégâts reçus et
  augmente tes PV maximum (2 PV par point de défense).
- Dans l'Antre, sans armure, un golem te tue en trois coups : n'y va pas les
  mains nues.

---

## 12. Ce qui n'existe pas encore

Pour éviter les fausses attentes, voici ce qui **n'est pas** dans le jeu
aujourd'hui :

- pas de compétences, de sorts ni de progression par expérience ;
- pas de monnaie, de marchand ou d'échange entre joueurs ;
- pas de commandes tactiles pour téléphone ;
- pas de compte : la progression reste dans le navigateur.

---

## 13. Mettre ce guide à jour

À chaque nouvelle fonctionnalité **visible par le joueur**, mettre à jour la
section correspondante (et la ligne « jeu actuel » en haut) :

| Nouveauté | Section à compléter |
| --------- | ------------------- |
| nouvelle maison, épreuve ou récompense | 4 (et le tableau de l'inventaire, section 5) |
| nouvel objet, arme, armure, équipement | 5, plus une ligne dans le tableau des effets |
| nouvelle touche ou action | 2 et 6 |
| nouveau réglage (son, affichage…) | 6 |
| nouveau donjon, monstre, niveau ou butin | 11, et les tableaux de la section 5 |
| règle de combat (dégâts, PV, répit) | 11 |
| changement de sauvegarde | 8 |
| limite ou règle multijoueur | 7 |
| commandes tactiles / mobile | 2, puis retirer la ligne de la section 12 |
