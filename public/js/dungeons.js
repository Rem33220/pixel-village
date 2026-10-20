// Donjons : le portail du bout du chemin nord ouvre trois instances privées de
// difficulté croissante. Comme les maisons, tout se joue côté client (le monde
// des autres joueurs s'arrête à la porte) : le serveur ne reçoit que
// « je suis à l'intérieur ».
//
// Ce module ne touche pas au DOM : il est testable avec `node` seul
// (voir tests/dungeons.test.mjs).

import { T, TILE_SIZE, isSolid } from './map.js';

// --- Réglages --------------------------------------------------------------

export const BASE_STATS = { attack: 4, defense: 0, pv: 30 };

export const PORTAL_RANGE = 1.7;
export const CHEST_RANGE = 1.2;
export const ATTACK_RANGE = 1.35;
export const ATTACK_COOLDOWN = 0.42;
// Durée du geste de frappe : lever de l'arme, coup, retour au repos.
export const SWING_TIME = 0.28;
export const CONTACT_RANGE = 0.95;
export const MONSTER_COOLDOWN = 1.1;
export const MONSTER_AGGRO = 5;
// Petit répit à l'arrivée : le temps de comprendre où l'on est.
export const ENTRY_GRACE = 1.2;
export const DROP_CHANCE = 0.3;

export const PLAYER_RADIUS = 0.3;
const MONSTER_RADIUS = 0.26;

// --- Butin ----------------------------------------------------------------

// `color` sert à dessiner l'icône (aucun fichier image), `attack` et `defense`
// sont les bonus réels appliqués une fois l'objet équipé.
export const LOOT = {
  dague: {
    name: 'Dague rouillée',
    kind: 'arme',
    art: 'dague',
    attack: 2,
    defense: 0,
    rarity: 'commun',
    color: '#b8b2a4',
    detail: 'Une lame courte encore solide, oubliée dans la crypte.'
  },
  tunique: {
    name: 'Tunique de cuir',
    kind: 'armure',
    attack: 0,
    defense: 1,
    rarity: 'commun',
    color: '#a9713f',
    detail: 'Du cuir souple : de quoi encaisser les crocs des baveux.'
  },
  epee_courte: {
    name: 'Épée courte',
    kind: 'arme',
    art: 'epee',
    attack: 4,
    defense: 0,
    rarity: 'commun',
    color: '#cfd6de',
    detail: 'L’arme des veilleurs de la crypte. Simple et efficace.'
  },
  hache: {
    name: 'Hache de pierre',
    kind: 'arme',
    art: 'hache',
    attack: 6,
    defense: 0,
    rarity: 'rare',
    color: '#8b939c',
    detail: 'Lourde, taillée dans la roche de la galerie.'
  },
  mailles: {
    name: 'Cotte de mailles',
    kind: 'armure',
    attack: 0,
    defense: 3,
    rarity: 'rare',
    color: '#9aa7b4',
    detail: 'Des anneaux serrés qui amortissent les coups de griffes.'
  },
  lame_brumes: {
    name: 'Lame des brumes',
    kind: 'arme',
    art: 'lame',
    glow: true,
    attack: 9,
    defense: 0,
    rarity: 'epique',
    color: '#8ff0f7',
    detail: 'Elle laisse un filet de brume derrière chaque coup.'
  },
  plastron: {
    name: 'Plastron runique',
    kind: 'armure',
    attack: 0,
    defense: 5,
    rarity: 'rare',
    color: '#c9803f',
    detail: 'Des runes gravées dans le métal détournent une partie des coups.'
  },
  epee_gardien: {
    name: 'Épée du gardien',
    kind: 'arme',
    art: 'epee',
    glow: true,
    attack: 13,
    defense: 0,
    rarity: 'epique',
    color: '#f6d34d',
    detail: 'La lame du gardien de l’antre. Elle ne pardonne pas.'
  },
  armure_gardien: {
    name: 'Armure du gardien',
    kind: 'armure',
    attack: 0,
    defense: 8,
    rarity: 'epique',
    color: '#7ee08a',
    detail: 'Des plaques épaisses : les golems eux-mêmes frappent moins fort.'
  },
  gantelets: {
    name: 'Gantelets de pierre',
    kind: 'armure',
    attack: 0,
    defense: 4,
    rarity: 'rare',
    color: '#6d747c',
    detail: 'Deux gantelets massifs qui protègent les avant-bras.'
  },
  // Butin des salles secrètes : il ne tombe jamais au hasard.
  lame_ombre: {
    name: 'Lame d’ombre',
    kind: 'arme',
    art: 'lame',
    glow: true,
    attack: 18,
    defense: 0,
    rarity: 'legendaire',
    color: '#c78bff',
    detail: 'Forgée dans le noir de l’antre, elle boit la lumière autour d’elle.'
  },
  cape_ombre: {
    name: 'Cape d’ombre',
    kind: 'armure',
    attack: 0,
    defense: 10,
    rarity: 'legendaire',
    color: '#6f4bd6',
    detail: 'Le tissu se referme sur les coups comme une nuit sans étoiles.'
  }
};

// Niveaux de rareté, du plus courant au plus rare : sert au tri de
// l'inventaire et aux couleurs du portail.
export const RARITY_ORDER = ['commun', 'rare', 'epique', 'legendaire'];

// Silhouettes d'armes dessinées en main (voir public/js/weapons.js) :
// dague courte, épée, hache et lame longue. Une arme sans `art` connu tombe
// sur l'épée.
export const WEAPON_ARTS = ['dague', 'epee', 'hache', 'lame'];

// Icônes 16 × 16 du butin, dessinées en ASCII. `b` prend la couleur de l'objet.
export const ITEM_ICONS = {
  arme: {
    palette: { k: '#1b1424', g: '#e0a83c', h: '#8a5a33' },
    rows: [
      '................',
      '............kk..',
      '...........kbbk.',
      '..........kbbk..',
      '.........kbbk...',
      '........kbbk....',
      '.......kbbk.....',
      '......kbbk......',
      '.....kbbk.......',
      '....kbbk........',
      '...kbbk.........',
      '..kkkkkk........',
      '..kgggk.........',
      '..kkkkk.........',
      '...khk..........',
      '....k...........'
    ]
  },
  armure: {
    palette: { k: '#1b1424' },
    rows: [
      '................',
      '................',
      '..kkk....kkk....',
      '.kbbkkkkkkbbk...',
      '.kbbbbbbbbbbk...',
      '.kbbbbbbbbbbk...',
      '.kbbbbbbbbbbk...',
      '.kbbbbbbbbbbk...',
      '..kbbbbbbbbk....',
      '..kbbbbbbbbk....',
      '..kbbbbbbbbk....',
      '..kbbbbbbbbk....',
      '..kbbbbbbbbk....',
      '...kkkkkkkk.....',
      '................',
      '................'
    ]
  }
};

// --- Monstres --------------------------------------------------------------

export const MONSTERS = {
  baveux: {
    name: 'Baveux',
    pv: 14,
    damage: 2,
    speed: 1.6,
    size: 12,
    tint: '#4fbf6a'
  },
  squelette: {
    name: 'Squelette',
    pv: 24,
    damage: 5,
    speed: 2.1,
    size: 13,
    tint: '#e8e4d0'
  },
  golem: {
    name: 'Golem',
    pv: 55,
    damage: 10,
    speed: 1.3,
    size: 15,
    tint: '#6d747c'
  },
  // Monstres des salles profondes et des passages secrets.
  araignee: {
    name: 'Araignée des fosses',
    pv: 18,
    damage: 3,
    speed: 2.7,
    size: 11,
    tint: '#8b5a9e'
  },
  spectre: {
    name: 'Spectre',
    pv: 34,
    damage: 7,
    speed: 1.8,
    size: 14,
    tint: '#9fe8f7'
  },
  ombre: {
    name: 'Ombre du gardien',
    pv: 80,
    damage: 13,
    speed: 1.9,
    size: 16,
    tint: '#7a5cd6'
  }
};

// --- Donjons ---------------------------------------------------------------

// Chaque donjon enchaîne plusieurs salles : l'escalier du bas mène à la salle
// suivante, et celui de la dernière salle ramène au village. Toutes les salles
// cachent aussi une **fissure** dans un mur (une seule par expédition, tirée
// avec la graine) qui ouvre une salle secrète : plus petite, plus dangereuse,
// avec un butin qu'on ne trouve nulle part ailleurs.
//
// `loot` liste tout le butin possible du donjon (pour le panneau du portail) ;
// chaque salle n'utilise que sa propre liste.
export const DUNGEONS = [
  {
    id: 'crypte',
    name: 'Crypte des brumes',
    level: 1,
    danger: 'Calme',
    accent: '#7ee08a',
    intro: 'Deux salles basses sous le village, et des murs qui craquent…',
    rooms: [
      {
        name: 'Crypte des brumes',
        intro: 'Des baveux rampent entre les piliers. Deux coffres t’attendent.',
        monsters: ['baveux', 'baveux'],
        chests: 2,
        loot: ['dague', 'tunique']
      },
      {
        name: 'Ossuaire effondré',
        intro: 'Des toiles pleines d’yeux et des baveux : trois coffres au fond.',
        monsters: ['baveux', 'araignee', 'baveux'],
        chests: 3,
        loot: ['epee_courte', 'tunique', 'dague']
      }
    ],
    secret: {
      name: 'Crypte oubliée',
      intro: 'Derrière la fissure, une salle que personne n’a pillée.',
      monsters: ['araignee', 'araignee'],
      chests: 1,
      loot: ['lame_brumes']
    },
    loot: ['dague', 'tunique', 'epee_courte', 'lame_brumes']
  },
  {
    id: 'galerie',
    name: 'Galerie des échos',
    level: 2,
    danger: 'Risqué',
    accent: '#8ff0f7',
    intro: 'Les squelettes ont entendu tes pas. Un puits descend dans le noir.',
    rooms: [
      {
        name: 'Galerie des échos',
        intro: 'Trois squelettes montent la garde. Trois coffres brillent dans le noir.',
        monsters: ['squelette', 'squelette', 'baveux'],
        chests: 3,
        loot: ['hache', 'mailles', 'plastron']
      },
      {
        name: 'Puits des murmures',
        intro: 'La galerie se resserre : un spectre flotte au-dessus des coffres.',
        monsters: ['squelette', 'spectre', 'baveux'],
        chests: 3,
        loot: ['lame_brumes', 'hache', 'mailles']
      }
    ],
    secret: {
      name: 'Chambre des échos',
      intro: 'Les murs y répètent chaque pas. Deux spectres gardent un coffre.',
      monsters: ['spectre', 'spectre'],
      chests: 1,
      loot: ['epee_gardien']
    },
    loot: ['hache', 'mailles', 'plastron', 'lame_brumes', 'epee_gardien']
  },
  {
    id: 'antre',
    name: 'Antre du gardien',
    level: 3,
    danger: 'Mortel',
    accent: '#f6d34d',
    intro: 'Trois salles de plus en plus profondes. Le gardien n’est pas seul.',
    rooms: [
      {
        name: 'Antre du gardien',
        intro: 'Deux golems montent la garde. Leur butin vaut le détour… si tu survis.',
        monsters: ['golem', 'golem', 'squelette'],
        chests: 3,
        loot: ['gantelets', 'plastron', 'mailles']
      },
      {
        name: 'Boyau des ombres',
        intro: 'Un boyau s’enfonce plus loin : araignées, spectre et golem s’y mêlent.',
        monsters: ['araignee', 'spectre', 'golem'],
        chests: 3,
        loot: ['armure_gardien', 'epee_gardien', 'gantelets']
      },
      {
        name: 'Cœur de l’antre',
        intro: 'Le fond de l’antre. Deux golems et une araignée veillent sur les derniers coffres.',
        monsters: ['golem', 'araignee', 'golem'],
        chests: 2,
        loot: ['epee_gardien', 'armure_gardien']
      }
    ],
    secret: {
      name: 'Antre oublié',
      intro: 'L’ombre du gardien t’attend, seule dans le noir. Deux coffres légendaires.',
      monsters: ['ombre'],
      chests: 2,
      loot: ['lame_ombre', 'cape_ombre']
    },
    loot: ['gantelets', 'plastron', 'mailles', 'armure_gardien', 'epee_gardien', 'lame_ombre', 'cape_ombre']
  }
];

export function getDungeon(id) {
  return DUNGEONS.find((dungeon) => dungeon.id === id) ?? null;
}

export function dungeonOfItem(id) {
  return DUNGEONS.find((dungeon) => dungeon.loot.includes(id)) ?? null;
}

// Compte les salles, monstres et coffres d'un donjon (salle secrète comprise) :
// le panneau du portail affiche ces totaux.
export function dungeonTotals(dungeon) {
  const rooms = dungeon?.rooms ?? [];
  const secret = dungeon?.secret;
  return {
    rooms: rooms.length,
    monsters: rooms.reduce((sum, room) => sum + room.monsters.length, 0)
      + (secret?.monsters.length ?? 0),
    chests: rooms.reduce((sum, room) => sum + room.chests, 0) + (secret?.chests ?? 0),
    secret: Boolean(secret)
  };
}

// --- Génération des salles -------------------------------------------------

// Deux gabarits : les salles ordinaires (21 × 17) et les salles secrètes,
// plus petites et plus étouffantes (15 × 11).
const LAYOUTS = {
  room: {
    w: 21,
    h: 17,
    // Piliers fixes : ils ne bouchent jamais le couloir central.
    pillars: [[4, 4], [4, 8], [4, 12], [16, 4], [16, 8], [16, 12]],
    spawn: { x: 10.5, y: 13.6 },
    exitX: 10,
    minSpawnDistance: 5,
    chestSpots: [
      { x: 2.5, y: 2.5 },
      { x: 18.5, y: 2.5 },
      { x: 10.5, y: 3.5 },
      { x: 3.5, y: 13.5 },
      { x: 17.5, y: 13.5 },
      { x: 10.5, y: 9.5 }
    ],
    monsterSpots: [
      { x: 5.5, y: 11.5 },
      { x: 15.5, y: 11.5 },
      { x: 7.5, y: 4.5 },
      { x: 13.5, y: 4.5 },
      { x: 10.5, y: 7.5 },
      { x: 4.5, y: 6.5 },
      { x: 16.5, y: 6.5 },
      { x: 6.5, y: 14.5 },
      { x: 14.5, y: 14.5 },
      { x: 3.5, y: 8.5 },
      { x: 17.5, y: 8.5 }
    ]
  },
  secret: {
    w: 15,
    h: 11,
    pillars: [[3, 3], [11, 3], [3, 7], [11, 7]],
    spawn: { x: 7.5, y: 7.6 },
    exitX: 7,
    minSpawnDistance: 3.5,
    chestSpots: [
      { x: 7.5, y: 2.5 },
      { x: 2.5, y: 5.5 },
      { x: 12.5, y: 5.5 }
    ],
    monsterSpots: [
      { x: 4.5, y: 4.5 },
      { x: 10.5, y: 4.5 },
      { x: 3.5, y: 8.5 },
      { x: 11.5, y: 8.5 },
      { x: 5.5, y: 2.5 },
      { x: 9.5, y: 2.5 }
    ]
  }
};

export const ROOM_W = LAYOUTS.room.w;
export const ROOM_H = LAYOUTS.room.h;
export const ROOM_SPAWN = { ...LAYOUTS.room.spawn };
export const ROOM_EXIT = { x: LAYOUTS.room.exitX + 0.5, y: ROOM_H - 1 + 0.35 };

// Fissure des salles ordinaires : dans le mur est, à mi-hauteur. On s'en
// approche depuis l'intérieur de la salle (x = 19,4).
export const SECRET_RANGE = 1.4;
export const CRACK_TILE = { x: ROOM_W - 1, y: 8 };
export const CRACK_APPROACH = { x: ROOM_W - 1.6, y: 8.5 };

function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Un joueur expose sa position locale en `rx`/`ry` (et sa position serveur en
// `x`/`y`). On privilégie la position locale pour les interactions.
function pointOf(pos) {
  return { x: pos.rx ?? pos.x ?? 0, y: pos.ry ?? pos.y ?? 0 };
}

function canStand(world, x, y, radius = PLAYER_RADIUS) {
  return !isSolid(world, Math.floor(x - radius), Math.floor(y - radius))
    && !isSolid(world, Math.floor(x + radius), Math.floor(y - radius))
    && !isSolid(world, Math.floor(x - radius), Math.floor(y + radius))
    && !isSolid(world, Math.floor(x + radius), Math.floor(y + radius));
}

// Salle commune : dalles de pierre, plaques de mousse, piliers, escalier au
// milieu du mur du bas. `layoutName` vaut 'room' ou 'secret'.
export function buildRoom(dungeon, seed = 1, layoutName = 'room') {
  const layout = LAYOUTS[layoutName] ?? LAYOUTS.room;
  const w = layout.w;
  const h = layout.h;
  const tiles = new Uint8Array(w * h);
  const random = mulberry32(seed ^ 0x5f3a91);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1;
      let tile = edge ? T.STONE_WALL : T.STONE_FLOOR;
      if (!edge && ((x * 3 + y * 5) % 7 === 0 || random() < 0.05)) tile = T.MOSS;
      tiles[y * w + x] = tile;
    }
  }

  for (const [x, y] of layout.pillars) tiles[y * w + x] = T.STONE_WALL;

  // Escalier : vers la salle suivante, la sortie ou la salle d'origine.
  tiles[(h - 1) * w + layout.exitX] = T.DOOR_STONE;

  const room = {
    w,
    h,
    tiles,
    dungeon,
    spawn: { ...layout.spawn },
    exit: { x: layout.exitX + 0.5, y: h - 1 + 0.35 },
    // Point d'où l'on peut atteindre la fissure (salles ordinaires seulement).
    crack: layoutName === 'room' ? { ...CRACK_APPROACH } : null,
    crackTile: layoutName === 'room' ? { ...CRACK_TILE } : null,
    hasCrack: false
  };

  // La place de départ reste toujours dégagée.
  for (let y = room.spawn.y - 1.2; y <= room.spawn.y + 1; y++) {
    for (let x = room.spawn.x - 1.2; x <= room.spawn.x + 1.2; x++) {
      if (!isSolid(room, Math.floor(x), Math.floor(y))) continue;
      room.tiles[Math.floor(y) * w + Math.floor(x)] = T.STONE_FLOOR;
    }
  }

  return room;
}

function shuffled(list, random) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Prépare une salle : tuiles, monstres, coffres et leur butin. Tout est tiré
// une fois pour toutes, donc un même `seed` donne exactement la même
// expédition (utile pour les tests).
function createRoomEntry(dungeon, spec, seed, { hidden = false } = {}) {
  const layoutName = hidden ? 'secret' : 'room';
  const layout = LAYOUTS[layoutName];
  const random = mulberry32(seed ^ 0x9e3779b9);
  const room = buildRoom(dungeon, seed, layoutName);

  const chestSpots = shuffled(layout.chestSpots, random).slice(0, spec.chests);
  const lootPool = shuffled(spec.loot, random);
  const chests = chestSpots.map((spot, index) => ({
    x: spot.x,
    y: spot.y,
    opened: false,
    item: lootPool[index % lootPool.length]
  }));

  // Les monstres commencent loin de l'escalier : on ne se fait pas encercler
  // à la seconde où l'on pose le pied dans la salle.
  const monsterSpots = shuffled(layout.monsterSpots, random)
    .filter((spot) => distance(spot, layout.spawn) >= layout.minSpawnDistance)
    .filter((spot) => chests.every((chest) => distance(spot, chest) > 1.4));

  const monsters = spec.monsters.map((type, index) => {
    const stats = MONSTERS[type] ?? MONSTERS.baveux;
    const spot = monsterSpots[index] ?? layout.monsterSpots[index % layout.monsterSpots.length];
    return {
      id: `${hidden ? 'secret' : 'salle'}-${index}-${type}`,
      type,
      name: stats.name,
      x: spot.x,
      y: spot.y,
      pv: stats.pv,
      pvMax: stats.pv,
      damage: stats.damage,
      speed: stats.speed,
      size: stats.size,
      tint: stats.tint,
      dir: 'down',
      moving: false,
      alive: true,
      flash: 0,
      cd: 0
    };
  });

  return { spec, random, room, chests, monsters, cleared: false, hidden };
}

// Active une salle : c'est elle que le reste du module interroge
// (`run.room`, `run.monsters`, `run.chests`).
function activateEntry(run, entry) {
  run.roomEntry = entry;
  run.room = entry.room;
  run.monsters = entry.monsters;
  run.chests = entry.chests;
  run.cleared = entry.cleared;
  run.grace = ENTRY_GRACE;
}

// Prépare une expédition complète : toutes les salles du donjon, la salle
// secrète, et la fissure cachée dans l'une des salles ordinaires.
export function createRun(dungeonId, seed = 1) {
  const dungeon = getDungeon(dungeonId) ?? DUNGEONS[0];
  const random = mulberry32(seed ^ 0x51ed27);
  const rooms = dungeon.rooms.map((spec, index) => (
    createRoomEntry(dungeon, spec, seed + index * 7919)
  ));

  // La fissure change de salle selon la graine : il faut explorer à chaque
  // descente, mais une même graine redonne la même disposition (tests).
  const secretRoomIndex = Math.floor(random() * rooms.length);
  rooms[secretRoomIndex].hasCrack = true;
  rooms[secretRoomIndex].room.hasCrack = true;

  const secretSpec = dungeon.secret ?? dungeon.rooms[dungeon.rooms.length - 1];
  const secret = createRoomEntry(dungeon, secretSpec, seed ^ 0x7a3d11, { hidden: true });

  const run = {
    dungeon,
    seed,
    random,
    rooms,
    secret,
    secretRoomIndex,
    secretFound: false,
    inSecret: false,
    secretReturn: null,
    roomIndex: 0,
    pv: BASE_STATS.pv,
    pvMax: BASE_STATS.pv,
    phase: 'run', // run | won | dead
    attackCd: 0,
    swing: 0,
    swingDir: 'down',
    grace: ENTRY_GRACE,
    floaters: [],
    message: dungeon.intro
  };

  activateEntry(run, rooms[0]);
  run.message = rooms[0].spec.intro;
  return run;
}

// --- Progression entre salles ---------------------------------------------

// Numéro affiché : la salle secrète vient après les salles ordinaires.
export function roomNumber(run) {
  return run.inSecret ? run.rooms.length + 1 : run.roomIndex + 1;
}

export function roomCount(run) {
  return run.rooms.length + (run.dungeon.secret ? 1 : 0);
}

export function isLastRoom(run) {
  return run.inSecret || run.roomIndex >= run.rooms.length - 1;
}

// Ce que fait l'escalier de la salle courante : descendre, remonter de la
// salle secrète, ou sortir du donjon.
export function exitAction(run) {
  if (run.inSecret) return 'secret';
  return isLastRoom(run) ? 'out' : 'next';
}

// Descend d'une salle. Retourne la nouvelle salle, ou null si l'on est déjà
// au fond (ou dans la salle secrète).
export function nextRoom(run) {
  if (run.inSecret || isLastRoom(run)) return null;
  run.roomIndex += 1;
  const entry = run.rooms[run.roomIndex];
  activateEntry(run, entry);
  run.message = entry.spec.intro;
  return entry;
}

// Ouvre la fissure : la salle secrète de l'expédition.
export function enterSecretRoom(run) {
  const entry = run.rooms[run.roomIndex];
  if (run.inSecret || !entry?.hasCrack) return null;
  run.inSecret = true;
  run.secretFound = true;
  run.secretReturn = { ...entry.room.crack };
  activateEntry(run, run.secret);
  run.message = run.secret.spec.intro;
  return run.secret;
}

// Ressort de la salle secrète vers la salle où se trouve la fissure.
export function leaveSecretRoom(run) {
  if (!run.inSecret) return null;
  run.inSecret = false;
  const entry = run.rooms[run.roomIndex];
  activateEntry(run, entry);
  run.message = entry.spec.intro;
  return entry;
}

// Le joueur est-il devant la fissure d'une salle qui en cache une ?
export function crackNear(run, pos) {
  const entry = run.rooms[run.roomIndex];
  if (run.inSecret || !entry?.hasCrack || !entry.room.crack) return false;
  return distance(pointOf(pos), entry.room.crack) <= SECRET_RANGE;
}

// --- Combat et exploration -------------------------------------------------

// Angle du geste de frappe, en degrés : 0 = arme vers le haut, positif = sens
// horaire (vers la droite de l'écran). `progress` va de 0 (début du geste) à 1
// (retour au repos). Le calcul est pur, donc testable sans navigateur ; le
// rendu s'en sert pour faire tourner l'arme tenue en main.
export function swingAngle(progress) {
  const value = Number.isFinite(progress) ? progress : 0;
  const p = Math.max(0, Math.min(1, value));
  if (p < 0.3) return -70 * (p / 0.3); // armé en arrière
  if (p < 0.65) {
    const t = (p - 0.3) / 0.35;
    const ease = 1 - (1 - t) * (1 - t); // départ sec, arrivée souple
    return -70 + 160 * ease;
  }
  return 90 * (1 - (p - 0.65) / 0.35); // retour au repos
}

// Direction du coup : vers la cible si elle est connue, sinon celle du regard.
export function aimDirection(from, target) {
  if (!target) return from?.dir ?? 'down';
  const dx = target.x - from.x;
  const dy = target.y - from.y;
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'left' : 'right';
  return dy < 0 ? 'up' : 'down';
}

export function addFloater(run, x, y, text, color) {
  run.floaters.push({ x, y, text, color, life: 0.9, drift: 0 });
  if (run.floaters.length > 24) run.floaters.shift();
}

function updateFloaters(run, dt) {
  for (const floater of run.floaters) {
    floater.life -= dt;
    floater.drift += dt * 22;
  }
  run.floaters = run.floaters.filter((floater) => floater.life > 0);
}

function monsterInRange(run, pos) {
  let best = null;
  let bestDistance = Infinity;
  const point = pointOf(pos);
  for (const monster of run.monsters) {
    if (!monster.alive) continue;
    const d = distance(point, monster);
    if (d > ATTACK_RANGE) continue;
    if (d < bestDistance) {
      bestDistance = d;
      best = monster;
    }
  }
  return best;
}

// Monstre à portée de coup, ou null : sert aussi à l'invite « Attaquer ».
export function monsterNear(run, pos) {
  return monsterInRange(run, pos);
}

export function chestNear(run, pos) {
  const point = pointOf(pos);
  return run.chests.find((chest) => !chest.opened && distance(point, chest) <= CHEST_RANGE) ?? null;
}

export function openChest(run, pos) {
  const chest = chestNear(run, pos);
  if (!chest) return null;
  chest.opened = true;
  return chest.item;
}

export function nearExit(room, pos) {
  return distance(pointOf(pos), room.exit) < 1.6;
}

// Un coup : touche le monstre le plus proche s'il est à portée. Retourne
// { hit, killed, drop, damage } ou null si le coup part trop tôt.
export function attackRun(run, player, stats) {
  if (run.phase === 'dead') return null;
  if (run.attackCd > 0) return null;

  run.attackCd = ATTACK_COOLDOWN;
  run.swing = SWING_TIME;

  const target = monsterInRange(run, player);
  // Le personnage (et son arme) se tournent vers le monstre frappé.
  run.swingDir = aimDirection(pointOf(player), target);
  if (player && typeof player === 'object' && 'dir' in player) player.dir = run.swingDir;
  if (!target) return { hit: null, killed: null, drop: null, damage: 0 };

  const damage = Math.max(1, Math.round(stats.attack));
  target.pv = Math.max(0, target.pv - damage);
  target.flash = 0.16;
  addFloater(run, target.x, target.y - 1, `-${damage}`, '#ffe9a8');

  if (target.pv > 0) return { hit: target, killed: null, drop: null, damage };

  target.alive = false;
  target.moving = false;
  // Le butin tombé vient de la salle où l'on se trouve : plus on descend, plus
  // il est intéressant.
  const lootPool = run.roomEntry?.spec?.loot ?? run.dungeon.loot;
  const drop = run.random() < DROP_CHANCE
    ? lootPool[Math.floor(run.random() * lootPool.length)]
    : null;
  return { hit: target, killed: target, drop, damage };
}

// Avance l'expédition : les monstres poursuivent, frappent au contact, et les
// coffres tous ouverts déclarent la salle nettoyée.
export function updateRun(run, player, dt, stats) {
  const events = { damage: 0, dead: false, cleared: false, finished: false };
  if (run.attackCd > 0) run.attackCd = Math.max(0, run.attackCd - dt);
  if (run.swing > 0) run.swing = Math.max(0, run.swing - dt);
  if (run.grace > 0) run.grace = Math.max(0, run.grace - dt);
  updateFloaters(run, dt);

  if (run.phase === 'dead') return events;

  const defense = Math.max(0, stats?.defense ?? 0);

  for (const monster of run.monsters) {
    if (!monster.alive) continue;
    if (monster.flash > 0) monster.flash = Math.max(0, monster.flash - dt);
    if (monster.cd > 0) monster.cd = Math.max(0, monster.cd - dt);

    const dx = player.rx - monster.x;
    const dy = player.ry - monster.y;
    const d = Math.hypot(dx, dy) || 0.0001;

    if (d < MONSTER_AGGRO && d > 0.72) {
      const step = Math.min(monster.speed * dt, d - 0.7);
      const nx = monster.x + (dx / d) * step;
      const ny = monster.y + (dy / d) * step;
      if (canStand(run.room, nx, monster.y, MONSTER_RADIUS)) monster.x = nx;
      if (canStand(run.room, monster.x, ny, MONSTER_RADIUS)) monster.y = ny;
      if (Math.abs(dx) > Math.abs(dy)) monster.dir = dx < 0 ? 'left' : 'right';
      else monster.dir = dy < 0 ? 'up' : 'down';
      monster.moving = step > 0.001;
    } else {
      monster.moving = false;
    }

    if (d <= CONTACT_RANGE && monster.cd <= 0 && run.grace <= 0) {
      const amount = Math.max(1, monster.damage - defense);
      monster.cd = MONSTER_COOLDOWN;
      run.pv = Math.max(0, run.pv - amount);
      events.damage += amount;
      addFloater(run, player.rx, player.ry - 1.2, `-${amount}`, '#ff9a8a');
      if (run.pv <= 0) {
        run.phase = 'dead';
        events.dead = true;
        break;
      }
    }
  }

  if (!events.dead && !run.roomEntry.cleared && run.chests.every((chest) => chest.opened)) {
    run.roomEntry.cleared = true;
    run.cleared = true;
    events.cleared = true;
    run.message = run.inSecret
      ? 'La salle secrète est vidée : la fissure reste ouverte derrière toi.'
      : `Salle nettoyée : ${run.roomEntry.spec.name}.`;

    // Le donjon n'est « fini » que quand toutes les salles ordinaires sont
    // vidées ; la salle secrète reste un bonus facultatif.
    if (run.phase === 'run' && run.rooms.every((entry) => entry.cleared)) {
      run.phase = 'won';
      events.finished = true;
    }
  }

  return events;
}

// --- Équipement ------------------------------------------------------------

export function createVault() {
  return { coins: 0, items: {}, equipped: { arme: null, armure: null } };
}

// Libellé de la bourse : « 1 pièce », « 24 pièces ».
export function coinsLabel(coins) {
  const value = Math.max(0, Math.floor(Number(coins) || 0));
  return `${value} pièce${value > 1 ? 's' : ''}`;
}

export function ownsItem(vault, id) {
  return (vault.items?.[id] ?? 0) > 0;
}

export function itemCount(vault, id) {
  return vault.items?.[id] ?? 0;
}

export function addItem(vault, id) {
  if (!LOOT[id]) return false;
  vault.items[id] = (vault.items[id] ?? 0) + 1;
  return true;
}

// Équipe l'objet, ou le retire s'il était déjà équipé.
// Retourne 'equipped', 'unequipped' ou null (objet absent / inconnu).
export function equipItem(vault, id) {
  const item = LOOT[id];
  if (!item || !ownsItem(vault, id)) return null;
  const slot = item.kind;
  if (vault.equipped[slot] === id) {
    vault.equipped[slot] = null;
    return 'unequipped';
  }
  vault.equipped[slot] = id;
  return 'equipped';
}

export function unequipSlot(vault, slot) {
  if (!(slot in vault.equipped) || !vault.equipped[slot]) return null;
  const previous = vault.equipped[slot];
  vault.equipped[slot] = null;
  return previous;
}

export function isEquipped(vault, id) {
  return Object.values(vault.equipped).includes(id);
}

// Identifiant de l'arme tenue en main (celle qui s'affiche dans le sprite),
// ou null à mains nues.
export function equippedWeapon(vault) {
  const id = vault?.equipped?.arme;
  return id && LOOT[id] ? id : null;
}

export function gearStats(vault) {
  const stats = { attack: 0, defense: 0 };
  for (const id of Object.values(vault.equipped)) {
    const item = LOOT[id];
    if (!item) continue;
    stats.attack += item.attack;
    stats.defense += item.defense;
  }
  return stats;
}

// Statistiques réelles du personnage : base + équipement. L'armure ajoute
// aussi des points de vie (2 par point de défense).
export function playerStats(vault) {
  const gear = gearStats(vault);
  return {
    attack: BASE_STATS.attack + gear.attack,
    defense: gear.defense,
    pvMax: BASE_STATS.pv + gear.defense * 2
  };
}

// Relit une sauvegarde sans faire confiance au contenu du navigateur.
export function sanitizeVault(raw) {
  const vault = createVault();
  if (!raw || typeof raw !== 'object') return vault;
  const coins = Math.floor(Number(raw.coins));
  if (Number.isFinite(coins) && coins > 0) vault.coins = Math.min(999999, coins);
  const items = raw.items && typeof raw.items === 'object' ? raw.items : {};
  for (const [id, count] of Object.entries(items)) {
    if (!LOOT[id]) continue;
    const value = Math.floor(Number(count));
    if (!Number.isFinite(value) || value <= 0) continue;
    vault.items[id] = Math.min(99, value);
  }
  const equipped = raw.equipped && typeof raw.equipped === 'object' ? raw.equipped : {};
  for (const slot of ['arme', 'armure']) {
    const id = equipped[slot];
    if (typeof id !== 'string' || !LOOT[id] || LOOT[id].kind !== slot) continue;
    if (!ownsItem(vault, id)) continue;
    vault.equipped[slot] = id;
  }
  return vault;
}

// --- Dessin ----------------------------------------------------------------

function glow(ctx, cx, cy, radius, color) {
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
}

// Portail du village : un cercle de pierre et un tourbillon lumineux.
export function drawPortal(ctx, portal, now) {
  const cx = portal.x * TILE_SIZE;
  const cy = portal.y * TILE_SIZE;
  const pulse = 0.5 + 0.5 * Math.sin(now / 520);

  glow(ctx, cx, cy, 34 + pulse * 6, `rgba(122, 96, 214, ${0.26 + 0.12 * pulse})`);

  // Dalles du cercle.
  ctx.fillStyle = '#4b4f63';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 2, 22, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3a3d50';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 2, 17, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tourbillon.
  for (let i = 0; i < 3; i++) {
    const angle = now / (420 + i * 130) + (i * Math.PI * 2) / 3;
    const rx = 11 - i * 2.5;
    const ry = 6 - i * 1.4;
    ctx.strokeStyle = `rgba(180, 156, 255, ${0.75 - i * 0.16})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 1, rx, ry, angle * 0.4, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = `rgba(226, 214, 255, ${0.35 + 0.35 * pulse})`;
  ctx.beginPath();
  ctx.arc(cx, cy, 3.5 + pulse, 0, Math.PI * 2);
  ctx.fill();

  // Deux piliers de pierre encadrent le portail.
  ctx.fillStyle = '#6b6f86';
  ctx.fillRect(cx - 24, cy - 16, 5, 20);
  ctx.fillRect(cx + 19, cy - 16, 5, 20);
  ctx.fillStyle = '#8589a3';
  ctx.fillRect(cx - 25, cy - 19, 7, 4);
  ctx.fillRect(cx + 18, cy - 19, 7, 4);
}

function drawChest(ctx, chest, now) {
  const cx = chest.x * TILE_SIZE;
  const cy = chest.y * TILE_SIZE;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 5, 9, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  if (!chest.opened) {
    const pulse = 0.5 + 0.5 * Math.sin(now / 380 + chest.x);
    glow(ctx, cx, cy, 16, `rgba(246, 211, 77, ${0.16 + 0.12 * pulse})`);
  }

  // Coffre : caisse en bois, ferrures, couvercle.
  ctx.fillStyle = '#6b4a2f';
  ctx.fillRect(cx - 8, cy - 4, 16, 8);
  ctx.fillStyle = '#8a6238';
  ctx.fillRect(cx - 8, cy - 8, 16, 5);
  ctx.fillStyle = '#4a3220';
  ctx.fillRect(cx - 8, cy - 4, 16, 2);
  ctx.fillRect(cx - 2, cy - 8, 1, 12);
  ctx.fillStyle = '#c9a24a';
  ctx.fillRect(cx - 8, cy - 8, 2, 12);
  ctx.fillRect(cx + 6, cy - 8, 2, 12);

  if (chest.opened) {
    ctx.fillStyle = '#241a05';
    ctx.fillRect(cx - 6, cy - 7, 12, 2);
  } else {
    ctx.fillStyle = '#f6d34d';
    ctx.fillRect(cx - 1, cy - 2, 2, 3);
  }
}

// Escalier de la salle : flèche vers le bas quand il mène à la salle suivante,
// vers le haut quand il ramène au village (ou à la salle d'origine).
function drawExitStairs(ctx, run, now) {
  const room = run.room;
  const cx = room.exit.x * TILE_SIZE;
  const cy = (room.h - 1) * TILE_SIZE + 8;
  const pulse = 0.5 + 0.5 * Math.sin(now / 500);
  const descending = exitAction(run) === 'next';
  const accent = descending ? run.dungeon.accent : '#f0e2b8';

  glow(ctx, cx, cy, 20, `rgba(232, 214, 164, ${0.18 + 0.14 * pulse})`);
  ctx.save();
  ctx.translate(cx, cy);
  if (descending) ctx.scale(1, -1);
  ctx.fillStyle = `rgba(255, 244, 214, ${0.55 + 0.3 * pulse})`;
  ctx.beginPath();
  ctx.moveTo(0, -4);
  ctx.lineTo(5, 1);
  ctx.lineTo(2, 1);
  ctx.lineTo(2, 5);
  ctx.lineTo(-2, 5);
  ctx.lineTo(-2, 1);
  ctx.lineTo(-5, 1);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.5 + 0.3 * pulse;
  ctx.fillRect(cx - 14, cy - 2, 4, 2);
  ctx.fillRect(cx + 10, cy - 2, 4, 2);
  ctx.globalAlpha = 1;
}

// Fissure d'un mur : elle pulse doucement pour se repérer dans le noir.
function drawCrack(ctx, room, now) {
  if (!room?.crackTile) return;
  const cx = room.crackTile.x * TILE_SIZE + 8;
  const cy = room.crackTile.y * TILE_SIZE + 8;
  const pulse = 0.5 + 0.5 * Math.sin(now / 420);

  glow(ctx, cx, cy, 15, `rgba(160, 120, 255, ${0.12 + 0.12 * pulse})`);
  ctx.strokeStyle = 'rgba(14, 12, 20, 0.9)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 5, cy - 7);
  ctx.lineTo(cx - 2, cy - 3);
  ctx.lineTo(cx - 4, cy);
  ctx.lineTo(cx - 1, cy + 3);
  ctx.lineTo(cx - 3, cy + 7);
  ctx.moveTo(cx - 2, cy - 3);
  ctx.lineTo(cx + 3, cy - 5);
  ctx.moveTo(cx - 4, cy);
  ctx.lineTo(cx + 2, cy + 2);
  ctx.stroke();

  ctx.strokeStyle = `rgba(190, 150, 255, ${0.3 + 0.35 * pulse})`;
  ctx.beginPath();
  ctx.moveTo(cx - 2, cy - 3);
  ctx.lineTo(cx - 1, cy + 4);
  ctx.stroke();
}

// Décor d'un donjon : escalier, fissure éventuelle, coffres, chiffres flottants.
export function drawRun(ctx, run, now) {
  drawExitStairs(ctx, run, now);

  const host = run.inSecret ? run.rooms[run.roomIndex] : run.roomEntry;
  if (!run.inSecret && host?.hasCrack) drawCrack(ctx, host.room, now);

  for (const chest of run.chests) drawChest(ctx, chest, now);

  ctx.font = 'bold 9px ui-monospace, "Cascadia Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const floater of run.floaters) {
    ctx.globalAlpha = Math.max(0, Math.min(1, floater.life * 1.6));
    ctx.fillStyle = floater.color;
    ctx.fillText(floater.text, floater.x * TILE_SIZE, floater.y * TILE_SIZE - 14 - floater.drift);
  }
  ctx.globalAlpha = 1;
}

// Un monstre, dessiné au sol à sa position. `run` sert à savoir s'il vient
// d'être touché.
export function drawMonster(ctx, monster, now) {
  const cx = monster.x * TILE_SIZE;
  const cy = monster.y * TILE_SIZE;
  const bob = monster.moving ? Math.round(Math.sin(now / 120) * 1.2) : Math.round(Math.sin(now / 700));

  ctx.fillStyle = 'rgba(8, 10, 14, 0.4)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 2, monster.size * 0.45, monster.size * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();

  const top = cy - monster.size + bob;

  if (monster.type === 'baveux') {
    ctx.fillStyle = '#2f8f4a';
    ctx.fillRect(cx - 7, cy - 4, 14, 6);
    ctx.fillRect(cx - 6, cy - 8, 12, 5);
    ctx.fillStyle = '#4fbf6a';
    ctx.fillRect(cx - 5, cy - 9, 10, 5);
    ctx.fillRect(cx - 8, cy - 3, 16, 4);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.fillRect(cx - 4, cy - 8, 3, 2);
    ctx.fillStyle = '#f7f2e6';
    ctx.fillRect(cx - 4, cy - 6, 2, 2);
    ctx.fillRect(cx + 2, cy - 6, 2, 2);
    ctx.fillStyle = '#241a2b';
    ctx.fillRect(cx - 4, cy - 5, 1, 1);
    ctx.fillRect(cx + 3, cy - 5, 1, 1);
  } else if (monster.type === 'squelette') {
    // Crâne.
    ctx.fillStyle = '#e8e4d0';
    ctx.fillRect(cx - 4, top + 1, 8, 6);
    ctx.fillStyle = '#f7f3e2';
    ctx.fillRect(cx - 3, top + 2, 6, 3);
    ctx.fillStyle = '#241a2b';
    ctx.fillRect(cx - 3, top + 3, 2, 2);
    ctx.fillRect(cx + 1, top + 3, 2, 2);
    // Cage thoracique et bras.
    ctx.fillStyle = '#cfc9b2';
    ctx.fillRect(cx - 1, top + 7, 2, 3);
    ctx.fillRect(cx - 4, top + 10, 8, 2);
    ctx.fillRect(cx - 3, top + 12, 6, 2);
    ctx.fillRect(cx - 6, top + 8, 2, 5);
    ctx.fillRect(cx + 4, top + 8, 2, 5);
    ctx.fillStyle = '#e8e4d0';
    ctx.fillRect(cx - 7, top + 13, 2, 2);
    ctx.fillRect(cx + 5, top + 13, 2, 2);
  } else if (monster.type === 'araignee') {
    // Araignée : huit pattes fines et un abdomen violet.
    ctx.strokeStyle = '#3a2148';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const y = cy - 8 + i * 2;
      ctx.moveTo(cx - 3, y);
      ctx.lineTo(cx - 8, y - 2 + i);
      ctx.moveTo(cx + 3, y);
      ctx.lineTo(cx + 8, y - 2 + i);
    }
    ctx.stroke();
    ctx.fillStyle = '#6d3f86';
    ctx.fillRect(cx - 4, cy - 9, 8, 7);
    ctx.fillRect(cx - 5, cy - 7, 10, 4);
    ctx.fillStyle = '#9b63b5';
    ctx.fillRect(cx - 3, cy - 8, 5, 2);
    ctx.fillStyle = '#f6d34d';
    ctx.fillRect(cx - 3, cy - 6, 2, 2);
    ctx.fillRect(cx + 1, cy - 6, 2, 2);
    ctx.fillStyle = '#241a2b';
    ctx.fillRect(cx - 3, cy - 5, 1, 1);
    ctx.fillRect(cx + 2, cy - 5, 1, 1);
  } else if (monster.type === 'spectre') {
    // Spectre : une capuche claire qui flotte au-dessus du sol.
    const float = Math.round(Math.sin(now / 300) * 2);
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#4c7a92';
    ctx.fillRect(cx - 6, top + 4 + float, 12, 9);
    for (let i = 0; i < 3; i++) ctx.fillRect(cx - 6 + i * 4, top + 12 + float, 3, 2);
    ctx.fillStyle = '#9fe8f7';
    ctx.fillRect(cx - 5, top + 1 + float, 10, 6);
    ctx.fillRect(cx - 4, top + 7 + float, 8, 2);
    ctx.fillStyle = '#0f1a22';
    ctx.fillRect(cx - 3, top + 3 + float, 2, 2);
    ctx.fillRect(cx + 1, top + 3 + float, 2, 2);
    ctx.globalAlpha = 1;
  } else if (monster.type === 'ombre') {
    // Ombre du gardien : silhouette noire, yeux et lame violets.
    ctx.fillStyle = '#141019';
    ctx.fillRect(cx - 7, top + 3, 14, 11);
    ctx.fillRect(cx - 9, top + 7, 3, 8);
    ctx.fillRect(cx + 6, top + 7, 3, 8);
    ctx.fillStyle = '#3a2b56';
    ctx.fillRect(cx - 6, top + 1, 12, 6);
    ctx.fillRect(cx - 6, top + 13, 12, 2);
    ctx.fillStyle = '#c78bff';
    ctx.fillRect(cx - 4, top + 3, 2, 2);
    ctx.fillRect(cx + 2, top + 3, 2, 2);
    ctx.fillRect(cx + 9, top - 2, 2, 13);
    ctx.fillStyle = '#7a5cd6';
    ctx.fillRect(cx + 8, top - 4, 2, 2);
  } else {
    // Golem : gros blocs de pierre.
    ctx.fillStyle = '#565c63';
    ctx.fillRect(cx - 7, top + 3, 14, 11);
    ctx.fillStyle = '#6d747c';
    ctx.fillRect(cx - 6, top, 12, 8);
    ctx.fillRect(cx - 9, top + 5, 3, 8);
    ctx.fillRect(cx + 6, top + 5, 3, 8);
    ctx.fillStyle = '#8b939c';
    ctx.fillRect(cx - 5, top + 1, 5, 3);
    ctx.fillRect(cx - 5, top + 9, 4, 3);
    ctx.fillStyle = '#f6d34d';
    ctx.fillRect(cx - 4, top + 4, 2, 2);
    ctx.fillRect(cx + 2, top + 4, 2, 2);
    ctx.fillStyle = '#3b3b43';
    ctx.fillRect(cx - 1, top + 12, 2, 3);
  }

  // Coup reçu : un éclat blanc.
  if (monster.flash > 0) {
    ctx.globalAlpha = Math.min(0.8, monster.flash * 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - monster.size * 0.5, top, monster.size, monster.size + 2);
    ctx.globalAlpha = 1;
  }

  // Nom et points de vie, seulement quand le monstre est blessé.
  if (monster.alive && monster.pv < monster.pvMax) {
    const width = 22;
    const x = cx - width / 2;
    const y = top - 6 + bob;
    ctx.fillStyle = 'rgba(8, 10, 14, 0.85)';
    ctx.fillRect(x - 1, y - 1, width + 2, 5);
    ctx.fillStyle = '#8c2f2f';
    ctx.fillRect(x, y, width, 3);
    ctx.fillStyle = '#e0563f';
    ctx.fillRect(x, y, Math.max(1, (width * monster.pv) / monster.pvMax), 3);
  }
}
