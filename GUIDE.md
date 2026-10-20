# Guide du joueur — Pixel Village

Bienvenue ! Ce guide explique **comment jouer** : commandes, maisons, épreuves,
récompenses, inventaire, paramètres et partie à plusieurs. Il ne parle pas
d'installation ni de code : pour ça, voir [README.md](README.md).

> **Note de maintenance** — ce fichier décrit *toutes* les fonctionnalités
> jouables et doit être mis à jour à chaque nouveauté (voir la dernière section).
> État décrit : celui du commit `841c2f2` — portail, donjons et combat, butin
> et équipement, arme tenue en main et animation de frappe, donjons à plusieurs
> salles dont le nombre croît avec le niveau, plusieurs salles secrètes par
> donjon sur des murs différents, butin légendaire et mythique, maisons
> scellées par leur donjon, expéditions avancées qui se débloquent dans
> l'ordre, échoppe du colporteur avec sa bourse, et réinitialisation du
> personnage. Les
> commits qui ne touchent que la documentation ne changent rien à ce guide.

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
6. **Réinitialiser le personnage** : efface la progression de ce navigateur
   (récompenses, butin, pièces, donjons conquis) et remet le nom et la couleur
   par défaut. Le bouton demande **deux clics** : le premier l'arme pendant
   cinq secondes, le second efface tout. Les réglages de son et de touches ne
   sont pas touchés.

Tu commences au milieu du village, sur la place herbeuse au croisement des deux
chemins.

---

## 2. Commandes

| Touche | Action |
| ------ | ------ |
| `ZQSD` / `WASD` / flèches | se déplacer (les diagonales fonctionnent) |
| `E` | entrer dans une maison, sortir, lire le livre des énigmes, ouvrir le portail, vendre à l’échoppe, frapper un monstre, ouvrir un coffre, descendre d’une salle, ouvrir une fissure |
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
- Au **nord-est**, l'**échoppe du colporteur** : un bâtiment à l'auvent rayé,
  relié à la rue nord-sud par un chemin de terre. On y vend le butin en trop
  (voir la section 5).
- La carte est fermée par une **forêt** sur tout le pourtour ; impossible d'en
  sortir.
- Au **bout nord de la rue nord-sud**, une petite place dallée porte un
  **portail** lumineux entouré de deux piliers : c'est l'entrée des donjons —
  six au total, dont trois expéditions qui se débloquent au fil des victoires
  (voir la section 11).
- Trois maisons, chacune avec sa porte marron et son paillasson lumineux.
  Chacune est **gardée par un donjon** : sa porte reste scellée jusqu'à la
  victoire sur ce donjon (voir la section 4).

| Maison | Où | Depuis la place centrale | Donjon gardien |
| ------ | -- | ------------------------ | -------------- |
| Chaumière des runes | nord-ouest | grand-rue vers l'ouest, puis montée vers le nord | Crypte des brumes |
| Atelier des cristaux | sud-ouest | grand-rue vers l'ouest, puis descente vers le sud | Galerie des échos |
| Maison du sage | sud-est | rue nord-sud vers le sud, puis grand-rue vers l'est | Antre du gardien |

Quand tu t'approches d'une porte ouverte, une invite **« Entrer — … »** s'affiche
en bas de l'écran : appuie sur `E`. Devant une porte scellée, l'invite devient
**Porte scellée — donjon « Crypte des brumes »** et un **sceau violet** (deux
barreaux en croix et une gemme qui pulse) barre la porte. Les arbres, les
rochers, l'eau et les murs sont solides : ils arrêtent le personnage, c'est
normal.

En haut à gauche, tu vois ton nom, le nombre de joueurs en ligne et tes
récompenses gagnées.

---

## 4. Les maisons et leurs épreuves

Chaque maison contient une salle privée (on y entre seul), une épreuve et une
récompense durable. Le panneau à droite rappelle l'objectif et l'avancement.
Appuie sur `E` devant le seuil lumineux (ou `Échap`) pour ressortir : tu
réapparais exactement là où tu étais.

### Les portes scellées

**Une maison, un donjon** : chaque maison est fermée par le sceau d'un donjon,
et un donjon ne garde qu'une seule maison.

| Maison | Sceau à briser |
| ------ | -------------- |
| Chaumière des runes | Crypte des brumes (niveau 1) |
| Atelier des cristaux | Galerie des échos (niveau 2) |
| Maison du sage | Antre du gardien (niveau 3) |

- Tant que le donjon n'est pas conquis, la porte affiche un **sceau violet** et
  l'invite **Porte scellée — donjon « … »**. `E` devant la porte rappelle
  dans le chat quel donjon il faut vaincre : rien ne s'ouvre.
- Un donjon est **conquis** quand **toutes ses salles ordinaires** sont vidées
  (tous les coffres ouverts, y compris ceux de la dernière salle). La salle
  secrète reste facultative.
- À la victoire, le chat annonce « Donjon conquis ! Le sceau de … se brise ».
  Le sceau disparaît de la porte (il ne reste qu'une petite lueur verte au
  linteau), l'invite redevient « Entrer — … », et le panneau du portail affiche
  **« Conquis — … est ouverte »** sur la carte du donjon.
- L'ouverture est **définitive** : elle est enregistrée dans le navigateur et
  survit au rechargement. Un donjon déjà vaincu peut être refait pour le butin
  sans refermer la maison.

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
**Récompenses du village**. Son en-tête affiche aussi la **bourse** : les pièces
amassées en revendant du butin.

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

**L'arme se voit en main** : dès qu'une arme est équipée, elle apparaît dans la
main droite du personnage, au village comme dans les donjons, avec sa propre
silhouette — dague courte, épée, hache ou lame longue. Les armes épiques
(lame des brumes, épée du gardien) brillent d'un halo de leur couleur. Retirer
l'arme la fait disparaître ; à mains nues, seul le poing apparaît pendant un
coup.

### Butin des donjons

Chaque objet trouvé dans un coffre apparaît ici avec son icône, son nom, son
bonus et un badge `×2` si tu en as plusieurs exemplaires. Clique sur un objet
puis sur **Équiper** : l'objet passe dans l'emplacement correspondant et tes
statistiques montent immédiatement. Le bouton devient **Retirer**.

| Arme | Bonus | Rareté | Où |
| ---- | ----- | ------ | -- |
| Dague rouillée | +2 ATQ | Commun | Crypte — 1re salle |
| Épée courte | +4 ATQ | Commun | Crypte — 2e salle |
| Hache de pierre | +6 ATQ | Rare | Galerie — salles 1 et 2 |
| Lame des brumes | +9 ATQ | Épique | Galerie — 2e salle, ou salle secrète de la Crypte |
| Épée du gardien | +13 ATQ | Épique | Antre — salles 2 à 4, ou salle secrète de la Galerie |
| Lance des ombres | +16 ATQ | Épique | Salle secrète de la Galerie |
| Trident des abysses | +17 ATQ | Épique | Abysses — salles 1 à 5, puis Forge et Trône |
| Lame d’ombre | +18 ATQ | Légendaire | Salle secrète de l’Antre |
| Marteau des cendres | +20 ATQ | Épique | Forge — salles 1 à 6, ou Trône |
| Lame des abysses | +22 ATQ | Mythique | Salle secrète des Abysses |
| Épée du néant | +23 ATQ | Épique | Trône — salles 1 à 7 |
| Harpon des abysses | +25 ATQ | Mythique | Salle secrète des Abysses |
| Fléau des cendres | +27 ATQ | Mythique | Salle secrète de la Forge |
| Épée des cendres | +30 ATQ | Mythique | Salle secrète de la Forge |
| Lame du néant | +34 ATQ | Mythique | Salle secrète du Trône |
| Sceptre du néant | +36 ATQ | Mythique | Salle secrète du Trône |

| Armure | Bonus | Rareté | Où |
| ------ | ----- | ------ | -- |
| Tunique de cuir | +1 DÉF | Commun | Crypte — salles 1 et 2 |
| Cotte de mailles | +3 DÉF | Rare | Galerie — salles 1 à 3 |
| Gantelets de pierre | +4 DÉF | Rare | Antre — salles 1 à 4 |
| Plastron runique | +5 DÉF | Rare | Galerie — 1re salle |
| Armure du gardien | +8 DÉF | Épique | Antre — salles 2 à 4 |
| Broche du gardien | +9 DÉF | Épique | Salle secrète de l’Antre |
| Cape d’ombre | +10 DÉF | Légendaire | Salle secrète de l’Antre |
| Casque de cendres | +11 DÉF | Mythique | Salle secrète de la Forge |
| Cuirasse abyssale | +12 DÉF | Mythique | Salle secrète des Abysses |
| Gantelets de cendres | +12 DÉF | Mythique | Salle secrète de la Forge |
| Épaulières abyssales | +13 DÉF | Mythique | Salle secrète des Abysses |
| Bouclier de cendres | +14 DÉF | Mythique | Salle secrète de la Forge |
| Couronne du néant | +17 DÉF | Mythique | Salle secrète du Trône |
| Voile du néant | +18 DÉF | Mythique | Salle secrète du Trône |
| Masque du néant | +20 DÉF | Mythique | Salle secrète du Trône |

La **rareté** est écrite dans la fiche de chaque objet : *Commun*, *Rare*,
*Épique*, *Légendaire* (en violet) ou *Mythique* (en rose). Les objets
**légendaires** et **mythiques** ne sortent que des salles secrètes : ce sont
les seuls butins qu'on ne croise jamais dans une salle ordinaire.

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

### Vendre à l'échoppe du colporteur

Au nord-est du village, le colporteur rachète le butin dont tu n'as plus besoin.
Approche-toi du comptoir : l'invite **« Échoppe — vendre du butin »** apparaît,
et `E` ouvre son panneau. Le panneau liste tout ce que ton sac contient, avec la
quantité et le prix unitaire.

| Rareté | Prix par exemplaire |
| ------ | ------------------- |
| Commun | 4 pièces |
| Rare | 10 pièces |
| Épique | 24 pièces |
| Légendaire | 60 pièces |
| Mythique | 140 pièces |

- **Vendre** cède un exemplaire ; **Tout vendre** cède la pile entière.
- Vendre le **dernier exemplaire** d'un objet équipé le retire automatiquement :
  ton ATQ ou ta DÉF redescend aussitôt (et tes PV maximum avec l'armure).
- Les **récompenses des maisons** ne se vendent pas : elles ne sont pas du butin.
- La bourse s'affiche dans l'en-tête du panneau, dans l'inventaire et en haut à
  gauche du jeu. `Échap` ou un clic à côté ferme l'échoppe.

*Astuce : les doublons de dague et de cotte de mailles rapportent peu, mais les
objets épiques et légendaires des salles secrètes font une vraie bourse —
plusieurs centaines de pièces sans risque.*

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
| `pixel-village:loot` | ton butin, ton équipement et ta **bourse** (`coins`) |
| `pixel-village:dungeons` | les donjons conquis : les maisons ouvertes **et les expéditions débloquées** |
| `pixel-village:keys` | tes touches personnalisées |
| `pixel-village:settings` | volume et sourdine |

Conséquences à connaître :

- Changer d'ordinateur ou de navigateur = repartir de zéro.
- Vider les données du site efface la progression.
- Gagner une récompense dans un navigateur ne la donne pas aux autres.

Le plus simple reste le bouton **Réinitialiser le personnage** de l'écran
d'accueil (deux clics). Sinon, depuis la console (F12) :

```js
localStorage.removeItem('pixel-village:rewards');
localStorage.removeItem('pixel-village:loot');
localStorage.removeItem('pixel-village:dungeons');
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
- Commence par la **Crypte des brumes** : elle ouvre la Chaumière des runes et
  sa lampe, puis sert de première marche vers la Galerie et l'Antre.
- La Lampe du veilleur est purement visuelle : elle ne remplace pas les
  récompenses de vitesse.
- Une porte marquée d'un **sceau violet** n'est pas cassée : il faut d'abord
  vaincre le donjon qu'elle indique (section 4).
- Si une porte semble bloquée, contourne par le chemin : il y a toujours un
  passage dégagé devant chaque maison.
- Avant de repartir en donjon, passe à l'échoppe : vendre trois doublons évite
  de confondre ta meilleure arme avec le reste du sac.

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
3. Appuie sur `E` : le **panneau du portail** liste les donjons, avec leur
   niveau, leur danger, le nombre de salles, de monstres et de coffres (salle
   secrète comprise), et le butin possible. Les trois premiers sont ouverts ;
   les trois **expéditions avancées** restent grisées, avec le bouton
   **Verrouillé** et le nom des donjons encore à vaincre.
4. Clique sur **Entrer — niveau …**. Tu y entres **seul** : les autres joueurs
   te voient disparaître, comme pour une maison.

Tu ne réapparais devant le portail qu'en sortant de la **dernière** salle, ou
en appuyant sur `Échap` (qui quitte le donjon à tout moment).

### Une descente de salle en salle

Chaque donjon enchaîne **plusieurs salles**, et le nombre grandit avec le
niveau : 2 pour la Crypte, 3 pour la Galerie, 4 pour l'Antre, 5 pour les
Abysses, 6 pour la Forge et 7 pour le Trône. À chaque salle s'ajoutent des
**salles secrètes** (1, 2, 3, 4, 5 puis 6), cachées derrière les fissures.

Le panneau de droite indique toujours où tu en es : `salle 2/4` pour une salle
ordinaire, `salle secrète 3/6` pour une salle secrète (elles ont leur propre
numérotation, puisqu'on y entre par les fissures et dans n'importe quel ordre).

- L'**escalier** au bas de chaque salle est marqué d'une flèche. **Flèche vers
  le bas** : `E` descend dans la salle suivante (le panneau affiche alors
  « Descendre — Ossuaire effondré »). **Flèche vers le haut**, dans la dernière
  salle : `E` sort du donjon.
- Les monstres et les coffres d'une salle restent tels quels quand tu la
  quittes : on ne remonte pas, mais une salle quittée ne se vide pas derrière
  toi.
- Tu gardes tes **PV** et ton équipement d'une salle à l'autre. Chaque
  arrivée te laisse **1,2 seconde de répit**.
- La fin du donjon est annoncée quand **toutes** les salles sont vidées :
  « Tous les coffres du donjon sont ouverts ! »

### Les salles secrètes

Chaque salle secrète est cachée derrière sa **propre fissure**, et chaque
donjon plante les siennes **à des endroits différents** : la Crypte n'a qu'une
fissure dans le mur de droite, l'Antre en a trois (mur de droite en haut, mur
de gauche en bas, mur du bas à gauche), le Trône en a six réparties sur tous
les murs. Les fissures d'un même donjon se trouvent toujours dans **des salles
ordinaires distinctes**, et l'ordre change à chaque expédition.

1. Approche-toi du mur : l'invite **« Fissure — entrer dans la salle
   secrète »** apparaît. La fissure pulse d'une lueur violette, sur le mur
   même (haut, bas, gauche ou droite selon les donjons).
2. Appuie sur `E` : tu passes derrière le mur. La salle est plus petite, les
   monstres y sont au moins aussi coriaces que dehors, et ses coffres
   contiennent un butin qu'on ne trouve **nulle part ailleurs** (épique,
   légendaire ou mythique).
3. L'escalier de la salle secrète te ramène dans la salle d'où tu viens, juste
   devant la fissure. Tu peux y retourner autant de fois que tu veux : les
   coffres déjà ouverts le restent.

Toutes sont **facultatives** : le donjon est considéré comme nettoyé sans elles.

### Les trois donjons

| Donjon | Niveau | Salles | Monstres | Coffres | Butin possible |
| ------ | ------ | ------ | -------- | ------- | -------------- |
| Crypte des brumes | 1 | 2 + 1 secrète | 4 baveux, 1 araignée | 5 + 1 | dague, tunique de cuir, épée courte ; lame des brumes dans la salle secrète |
| Galerie des échos | 2 | 3 + 2 secrètes | 4 squelettes, 3 baveux, 2 spectres | 9 + 2 | hache, cotte de mailles, plastron, lame des brumes ; épée du gardien et lance des ombres dans les salles secrètes |
| Antre du gardien | 3 | 4 + 3 secrètes | 5 golems, 3 araignées, 2 squelettes, 2 spectres | 11 + 5 | gantelets, plastron, cotte de mailles, armure et épée du gardien ; lame et cape d’ombre, broche du gardien dans les salles secrètes |

Chaque donjon est **rejouable** : la disposition, le contenu des coffres et
l'emplacement des fissures changent à chaque entrée, ce qui permet de récupérer
un objet manqué.

### Les expéditions avancées

Les trois donjons du village ne sont que le début. Une fois les **trois**
vaincus, trois **expéditions avancées** apparaissent au portail, puis
s'enchaînent : chacune exige la précédente. Le portail refuse d'entrer dans une
expédition verrouillée, et sa carte grise indique précisément ce qui manque
(« Verrouillé — vaincs d'abord : … »).

| Expédition | Niveau | Salles | Débloquée par | Monstres | Butin possible |
| ---------- | ------ | ------ | ------------- | -------- | -------------- |
| Abysses noyées | 4 | 5 + 4 secrètes | Crypte, Galerie et Antre | 9 noyés, 4 spectres, 2 ombres | trident des abysses, lame des brumes, plastron, armure et épée du gardien ; lame, cuirasse, harpon et épaulières abyssaux dans les salles secrètes |
| Forge des cendres | 5 | 6 + 5 secrètes | Abysses noyées | 8 golems, 7 gargouilles, 3 ombres | marteau des cendres, trident des abysses, plastron, armure du gardien ; fléau, bouclier, casque, gantelets et épée des cendres dans les salles secrètes |
| Trône du néant | 6 | 7 + 6 secrètes | Forge des cendres | 6 gargouilles, 6 spectres, 6 ombres, 1 seigneur | épée du néant, marteau des cendres, trident des abysses, armure du gardien ; lame, couronne, voile, masque et sceptre du néant dans les salles secrètes |

À chaque victoire, le chat annonce l'expédition qui vient de s'ouvrir :
« Nouveau donjon au portail : … ». La progression est enregistrée avec les
donjons conquis (section 8) : recharger la page ne reverrouille rien.

### Les créatures

| Monstre | PV | Dégâts par coup | Comportement |
| ------- | -- | --------------- | ------------ |
| Baveux | 14 | 2 | lent, poursuit de près |
| Araignée des fosses | 18 | 3 | très rapide, huit pattes |
| Squelette | 24 | 5 | rapide |
| Spectre | 34 | 7 | flotte, frappe fort |
| Golem | 55 | 10 | lent mais très dangereux |
| Ombre du gardien | 80 | 13 | boss de la salle secrète de l’Antre |
| Noyé des abysses | 42 | 8 | lent, sort de l’eau sans un bruit |
| Gargouille | 46 | 9 | très rapide, bat des ailes |
| Seigneur du néant | 130 | 16 | boss du Trône, lame rose et couronne |

### Le combat

- `E` **frappe** le monstre le plus proche (à moins d'une tuile et demie). Un
  coup toutes les 0,42 seconde.
- Chaque coup est **animé** : le personnage se tourne vers le monstre visé,
  lève son arme puis la rabat en un quart de seconde, avec une traînée claire
  qui suit la lame et un sifflement. Le coup porte dès l'appui sur `E` :
  l'animation ne retarde pas les dégâts.
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
- Le panneau de droite suit ta progression : `salle · coffres ouverts ·
  monstres restants · PV`. Quand tous les coffres d'une salle sont ouverts,
  elle est nettoyée ; quand toutes les salles le sont, le donjon est fini.
- Ouvre l'inventaire (`I`) et clique sur l'objet puis **Équiper** : il compte
  immédiatement dans tes statistiques (voir la section 5).

Pendant qu'un panneau est ouvert (inventaire, paramètres, portail), le donjon
est **en pause** : impossible de se faire tuer dans un menu.

### Ce que la victoire ouvre

Chaque donjon du village garde **une maison et une seule**. Les expéditions
avancées, elles, ne gardent aucune porte : elles s'ouvrent l'une l'autre (voir
plus haut) et servent d'escalier vers le butin mythique.

| Donjon | Maison débloquée | Épreuve qui s'y trouve |
| ------ | ---------------- | ---------------------- |
| Crypte des brumes | Chaumière des runes | les quatre runes |
| Galerie des échos | Atelier des cristaux | les six cristaux |
| Antre du gardien | Maison du sage | les trois énigmes |

La maison est ouverte dès que **toutes les salles ordinaires** du donjon sont
vidées — inutile de passer par la salle secrète. Le panneau du portail rappelle
l'état de chaque sceau : **« Garde la porte de … »** (violet) ou **« Conquis — …
est ouverte »** (vert). La porte, elle, perd son sceau violet et l'invite
redevient **« Entrer — … »** (voir la section 4).

### Conseils

- Combats **un monstre à la fois** : tu marches plus vite qu'eux, recule pour
  les séparer.
- Fais la Crypte des brumes en premier : ses objets rendent la Galerie et
  l'Antre bien plus faciles.
- L'**armure** fait deux choses à la fois : elle réduit les dégâts reçus et
  augmente tes PV maximum (2 PV par point de défense).
- Dans l'Antre, sans armure, un golem te tue en trois coups : n'y va pas les
  mains nues.
- **Longe les murs** : la fissure ne se signale qu'à un pas et demi. Une lueur
  violette dans la pierre trahit sa présence.
- La salle secrète de la Crypte donne une **lame des brumes** : c'est l'arme
  idéale pour aborder la Galerie.

---

## 12. Ce qui n'existe pas encore

Pour éviter les fausses attentes, voici ce qui **n'est pas** dans le jeu
aujourd'hui :

- pas de compétences, de sorts ni de progression par expérience ;
- pas d'échange d'objets ni de pièces entre joueurs (l'échoppe n'achète qu'au
  colporteur) ;
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
| nouvelle salle, salle secrète, fissure | 11 (Une descente de salle en salle, Les salles secrètes) |
| maison scellée, donjon gardien, condition d'accès | 3 (tableau des maisons), 4 (Les portes scellées), 8 et 11 |
| donjon verrouillé, déblocage progressif, expédition avancée | 11 (Les expéditions avancées) et 8 |
| nouvelle rareté (mythique), prix de vente | 5 (Butin, Vendre) et 11 |
| échoppe, bourse, prix de vente | 3, 5 (Vendre à l'échoppe), 8 et 9 |
| réinitialisation du personnage | 1 (L'écran d'accueil) et 8 |
| règle de combat (dégâts, PV, répit) | 11 |
| arme affichée en main, animation de frappe | 5 (Équipement) et 11 (Le combat) |
| changement de sauvegarde | 8 |
| limite ou règle multijoueur | 7 |
| commandes tactiles / mobile | 2, puis retirer la ligne de la section 12 |
