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
export const ATTACK_TIME = 0.16;
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
    attack: 4,
    defense: 0,
    rarity: 'commun',
    color: '#cfd6de',
    detail: 'L’arme des veilleurs de la crypte. Simple et efficace.'
  },
  hache: {
    name: 'Hache de pierre',
    kind: 'arme',
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
  }
};

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
  }
};

// --- Donjons ---------------------------------------------------------------

export const DUNGEONS = [
  {
    id: 'crypte',
    name: 'Crypte des brumes',
    level: 1,
    danger: 'Calme',
    accent: '#7ee08a',
    intro: 'Des baveux rampent entre les piliers. Trois coffres t’attendent.',
    monsters: ['baveux', 'baveux'],
    chests: 3,
    loot: ['dague', 'tunique', 'epee_courte']
  },
  {
    id: 'galerie',
    name: 'Galerie des échos',
    level: 2,
    danger: 'Risqué',
    accent: '#8ff0f7',
    intro: 'Les squelettes ont entendu tes pas. Quatre coffres brillent dans le noir.',
    monsters: ['squelette', 'squelette', 'squelette', 'baveux'],
    chests: 4,
    loot: ['hache', 'mailles', 'lame_brumes', 'plastron']
  },
  {
    id: 'antre',
    name: 'Antre du gardien',
    level: 3,
    danger: 'Mortel',
    accent: '#f6d34d',
    intro: 'Deux golems montent la garde. Leur butin vaut le détour… si tu survis.',
    monsters: ['golem', 'golem', 'squelette'],
    chests: 3,
    loot: ['epee_gardien', 'armure_gardien', 'gantelets']
  }
];

export function getDungeon(id) {
  return DUNGEONS.find((dungeon) => dungeon.id === id) ?? null;
}

export function dungeonOfItem(id) {
  return DUNGEONS.find((dungeon) => dungeon.loot.includes(id)) ?? null;
}

// --- Génération des salles -------------------------------------------------

export const ROOM_W = 21;
export const ROOM_H = 17;

// Piliers fixes : ils ne bouchent jamais le couloir central.
const PILLARS = [
  [4, 4],
  [4, 8],
  [4, 12],
  [16, 4],
  [16, 8],
  [16, 12]
];

const CHEST_SPOTS = [
  { x: 2.5, y: 2.5 },
  { x: 18.5, y: 2.5 },
  { x: 10.5, y: 3.5 },
  { x: 3.5, y: 13.5 },
  { x: 17.5, y: 13.5 },
  { x: 10.5, y: 9.5 }
];

const MONSTER_SPOTS = [
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
];

export const ROOM_SPAWN = { x: 10.5, y: 13.6 };
export const ROOM_EXIT = { x: 10.5, y: ROOM_H - 1 + 0.35 };

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

// Salle commune : dalles de pierre, plaques de mousse, piliers, escalier de
// sortie au milieu du mur du bas.
export function buildRoom(dungeon, seed = 1) {
  const w = ROOM_W;
  const h = ROOM_H;
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

  for (const [x, y] of PILLARS) tiles[y * w + x] = T.STONE_WALL;

  // Escalier de sortie.
  tiles[(h - 1) * w + 10] = T.DOOR_STONE;

  const room = {
    w,
    h,
    tiles,
    dungeon,
    spawn: { ...ROOM_SPAWN },
    exit: { ...ROOM_EXIT }
  };

  // La place de départ reste toujours dégagée.
  for (let y = ROOM_SPAWN.y - 1.2; y <= ROOM_SPAWN.y + 1; y++) {
    for (let x = ROOM_SPAWN.x - 1.2; x <= ROOM_SPAWN.x + 1.2; x++) {
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

// Prépare une expédition : salle, monstres, coffres et leur butin. Tout est
// tiré une fois pour toutes, donc un même `seed` donne exactement la même
// expédition (utile pour les tests).
export function createRun(dungeonId, seed = 1) {
  const dungeon = getDungeon(dungeonId) ?? DUNGEONS[0];
  const room = buildRoom(dungeon, seed);
  const random = mulberry32(seed ^ 0x9e3779b9);

  const chestSpots = shuffled(CHEST_SPOTS, random).slice(0, dungeon.chests);
  const lootPool = shuffled(dungeon.loot, random);
  const chests = chestSpots.map((spot, index) => ({
    x: spot.x,
    y: spot.y,
    opened: false,
    item: lootPool[index % lootPool.length]
  }));

  // Les monstres commencent loin de l'escalier : on ne se fait pas encercler
  // à la seconde où l'on pose le pied dans la salle.
  const monsterSpots = shuffled(MONSTER_SPOTS, random)
    .filter((spot) => {
      if (distance(spot, ROOM_SPAWN) < 5) return false;
      return chests.every((chest) => distance(spot, chest) > 1.4);
    })
    .slice(0, dungeon.monsters.length);

  const monsters = dungeon.monsters.map((type, index) => {
    const spec = MONSTERS[type] ?? MONSTERS.baveux;
    const spot = monsterSpots[index] ?? MONSTER_SPOTS[index % MONSTER_SPOTS.length];
    return {
      id: `${type}-${index}`,
      type,
      name: spec.name,
      x: spot.x,
      y: spot.y,
      pv: spec.pv,
      pvMax: spec.pv,
      damage: spec.damage,
      speed: spec.speed,
      size: spec.size,
      tint: spec.tint,
      dir: 'down',
      moving: false,
      alive: true,
      flash: 0,
      cd: 0
    };
  });

  return {
    dungeon,
    room,
    seed,
    monsters,
    chests,
    random,
    pv: BASE_STATS.pv,
    pvMax: BASE_STATS.pv,
    phase: 'run', // run | won | dead
    cleared: false,
    attackCd: 0,
    swing: 0,
    grace: ENTRY_GRACE,
    floaters: [],
    message: dungeon.intro
  };
}

// --- Combat et exploration -------------------------------------------------

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
  run.swing = ATTACK_TIME;

  const target = monsterInRange(run, player);
  if (!target) return { hit: null, killed: null, drop: null, damage: 0 };

  const damage = Math.max(1, Math.round(stats.attack));
  target.pv = Math.max(0, target.pv - damage);
  target.flash = 0.16;
  addFloater(run, target.x, target.y - 1, `-${damage}`, '#ffe9a8');

  if (target.pv > 0) return { hit: target, killed: null, drop: null, damage };

  target.alive = false;
  target.moving = false;
  const drop = run.random() < DROP_CHANCE
    ? run.dungeon.loot[Math.floor(run.random() * run.dungeon.loot.length)]
    : null;
  return { hit: target, killed: target, drop, damage };
}

// Avance l'expédition : les monstres poursuivent, frappent au contact, et les
// coffres tous ouverts déclarent la salle nettoyée.
export function updateRun(run, player, dt, stats) {
  const events = { damage: 0, dead: false, cleared: false };
  if (run.attackCd > 0) run.attackCd = Math.max(0, run.attackCd - dt);
  if (run.swing > 0) run.swing = Math.max(0, run.swing - dt);
  if (run.grace > 0) run.grace = Math.max(0, run.grace - dt);
  updateFloaters(run, dt);

  if (run.phase !== 'run') return events;

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

  if (!events.dead && !run.cleared && run.chests.every((chest) => chest.opened)) {
    run.cleared = true;
    run.phase = 'won';
    events.cleared = true;
    run.message = 'Tous les coffres sont ouverts : la salle est nettoyée.';
  }

  return events;
}

// --- Équipement ------------------------------------------------------------

export function createVault() {
  return { items: {}, equipped: { arme: null, armure: null } };
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

function drawExitStairs(ctx, room, now, accent) {
  const cx = room.exit.x * TILE_SIZE;
  const cy = (room.h - 1) * TILE_SIZE + 8;
  const pulse = 0.5 + 0.5 * Math.sin(now / 500);

  glow(ctx, cx, cy, 20, `rgba(232, 214, 164, ${0.18 + 0.14 * pulse})`);
  ctx.fillStyle = `rgba(255, 244, 214, ${0.55 + 0.3 * pulse})`;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 4);
  ctx.lineTo(cx + 5, cy + 1);
  ctx.lineTo(cx + 2, cy + 1);
  ctx.lineTo(cx + 2, cy + 5);
  ctx.lineTo(cx - 2, cy + 5);
  ctx.lineTo(cx - 2, cy + 1);
  ctx.lineTo(cx - 5, cy + 1);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.5 + 0.3 * pulse;
  ctx.fillRect(cx - 14, cy - 2, 4, 2);
  ctx.fillRect(cx + 10, cy - 2, 4, 2);
  ctx.globalAlpha = 1;
}

// Décor d'un donjon : escalier de sortie, coffres, chiffres flottants.
export function drawRun(ctx, run, now) {
  drawExitStairs(ctx, run.room, now, run.dungeon.accent);

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
