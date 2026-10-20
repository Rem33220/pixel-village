import { generateWorld, isSolid } from '../public/js/map.js';
import { buildHouses, buildInterior, nearExit as houseNearExit } from '../public/js/houses.js';
import {
  DUNGEONS,
  LOOT,
  ITEM_ICONS,
  MONSTERS,
  BASE_STATS,
  ENTRY_GRACE,
  PORTAL_RANGE,
  ROOM_SPAWN,
  addItem,
  attackRun,
  chestNear,
  createRun,
  createVault,
  equipItem,
  gearStats,
  getDungeon,
  itemCount,
  nearExit,
  openChest,
  ownsItem,
  playerStats,
  sanitizeVault,
  unequipSlot,
  updateRun
} from '../public/js/dungeons.js';

const world = generateWorld();
const fail = [];
const check = (label, ok, extra = '') => {
  console.log(`${ok ? 'OK  ' : 'ECHEC'} ${label}${extra ? ' — ' + extra : ''}`);
  if (!ok) fail.push(label);
};

const walkable = (room, x, y) => !isSolid(room, Math.floor(x), Math.floor(y));

function reachableFrom(room, start) {
  const seen = new Set([`${start.x},${start.y}`]);
  const queue = [start];
  while (queue.length) {
    const { x, y } = queue.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      const key = `${nx},${ny}`;
      if (seen.has(key)) continue;
      if (isSolid(room, nx, ny)) continue;
      seen.add(key);
      queue.push({ x: nx, y: ny });
    }
  }
  return seen;
}

// --- Portail du bout du chemin nord ---------------------------------------
{
  const portal = world.portal;
  check('portail: présent dans le monde', Boolean(portal));
  check('portail: au bout nord de la rue', portal.x === 30 && portal.y <= 8, `x=${portal.x} y=${portal.y}`);
  check('portail: sur une tuile praticable', walkable(world, portal.x, portal.y));

  // On doit pouvoir marcher du point de départ jusqu'au portail.
  const start = { x: Math.floor(world.spawn.x), y: Math.floor(world.spawn.y) };
  const seen = reachableFrom(world, start);
  check('portail: atteignable à pied depuis le spawn', seen.has('30,6') && seen.has('30,7'));
  check('portail: seuil dégagé devant', [[-1, 1], [0, 1], [1, 1], [0, 2]].every(([dx, dy]) => (
    !isSolid(world, Math.floor(portal.x) + dx, Math.floor(portal.y) + dy)
  )));
  check('portail: distance d’entrée cohérente', PORTAL_RANGE > 1 && PORTAL_RANGE < 2.5);
}

// --- Donjons : données cohérentes -----------------------------------------
{
  check('donjons: trois niveaux distincts', DUNGEONS.length === 3
    && new Set(DUNGEONS.map((d) => d.level)).size === 3);
  for (const dungeon of DUNGEONS) {
    check(`donjon ${dungeon.id}: butin connu`,
      dungeon.loot.length >= dungeon.chests && dungeon.loot.every((id) => LOOT[id]));
    check(`donjon ${dungeon.id}: monstres connus`,
      dungeon.monsters.length > 0 && dungeon.monsters.every((type) => MONSTERS[type]));
    check(`donjon ${dungeon.id}: accent de couleur`, /^#[0-9a-f]{6}$/i.test(dungeon.accent));
  }
  const items = new Set(DUNGEONS.flatMap((dungeon) => dungeon.loot));
  check('butin: tous les objets ont un type valide',
    [...items].every((id) => LOOT[id].kind === 'arme' || LOOT[id].kind === 'armure'));
  check('butin: au moins une arme et une armure', [...items].some((id) => LOOT[id].kind === 'arme')
    && [...items].some((id) => LOOT[id].kind === 'armure'));
  check('butin: chaque objet vient d’un donjon', [...items].every((id) => (
    DUNGEONS.some((dungeon) => dungeon.loot.includes(id))
  )));
}

// --- Icônes 16 × 16 -------------------------------------------------------
{
  for (const [kind, icon] of Object.entries(ITEM_ICONS)) {
    const rowsOk = icon.rows.length === 16 && icon.rows.every((row) => row.length === 16);
    check(`icône ${kind}: 16 lignes de 16 pixels`, rowsOk);
    const chars = new Set(icon.rows.join('').replace(/\./g, '').split(''));
    const known = [...chars].every((ch) => ch === 'b' || icon.palette[ch]);
    check(`icône ${kind}: toutes les couleurs définies`, known, [...chars].join(''));
  }
}

// --- Salles praticables et accessibles ------------------------------------
for (const dungeon of DUNGEONS) {
  const run = createRun(dungeon.id, 42);
  const room = run.room;

  check(`salle ${dungeon.id}: arrivée praticable`, walkable(room, room.spawn.x, room.spawn.y));
  check(`salle ${dungeon.id}: sortie pas déjà dans la zone de sortie`, !nearExit(room, room.spawn));
  check(`salle ${dungeon.id}: sortie détectée devant la porte`, nearExit(room, { x: 10.5, y: 15.4 }));

  const seen = reachableFrom(room, {
    x: Math.floor(room.spawn.x),
    y: Math.floor(room.spawn.y)
  });

  const chestsOk = run.chests.every((chest) => walkable(room, chest.x, chest.y)
    && seen.has(`${Math.floor(chest.x)},${Math.floor(chest.y)}`));
  check(`salle ${dungeon.id}: coffres sur du sol atteignable`, chestsOk);

  const monstersOk = run.monsters.every((monster) => walkable(room, monster.x, monster.y)
    && seen.has(`${Math.floor(monster.x)},${Math.floor(monster.y)}`));
  check(`salle ${dungeon.id}: monstres sur du sol atteignable`, monstersOk);

  check(`salle ${dungeon.id}: monstres loin de l’escalier`,
    run.monsters.every((monster) => Math.hypot(monster.x - ROOM_SPAWN.x, monster.y - ROOM_SPAWN.y) > 4.9));

  check(`salle ${dungeon.id}: coffres et monstres séparés`,
    run.chests.every((chest) => run.monsters.every((m) => Math.hypot(m.x - chest.x, m.y - chest.y) > 1)));

  const ids = run.chests.map((chest) => chest.item);
  check(`salle ${dungeon.id}: butin des coffres unique`, new Set(ids).size === ids.length);
  check(`salle ${dungeon.id}: butin tiré du donjon`, ids.every((id) => dungeon.loot.includes(id)));
}

// --- Déterminisme ---------------------------------------------------------
{
  const a = createRun('galerie', 7);
  const b = createRun('galerie', 7);
  const signature = (run) => JSON.stringify({
    chests: run.chests.map((chest) => [chest.x, chest.y, chest.item]),
    monsters: run.monsters.map((m) => [m.type, m.x, m.y])
  });
  check('génération: même graine = même expédition', signature(a) === signature(b));
  const c = createRun('galerie', 8);
  check('génération: graine différente = disposition différente', signature(a) !== signature(c));
}

// --- Combat ---------------------------------------------------------------
{
  const run = createRun('crypte', 3);
  const monster = run.monsters[0];
  const player = { rx: monster.x, ry: monster.y };
  const stats = playerStats(createVault());

  const first = attackRun(run, player, stats);
  check('combat: coup porté au monstre à portée', first?.hit === monster && first.damage === BASE_STATS.attack);
  check('combat: coup suivant bloqué par le délai', attackRun(run, player, stats) === null);
  check('combat: PV du monstre réduits', monster.pv === monster.pvMax - BASE_STATS.attack);

  // On laisse passer le délai puis on frappe jusqu'à la victoire.
  let result = null;
  let guard = 0;
  while (monster.alive && guard++ < 200) {
    updateRun(run, { rx: 0, ry: 0 }, 0.1, stats);
    result = attackRun(run, player, stats) ?? result;
  }
  check('combat: monstre vaincu après plusieurs coups', !monster.alive && result?.killed === monster);
  check('combat: drop éventuel tiré du donjon',
    result?.drop === null || run.dungeon.loot.includes(result?.drop));

  // Le délai du dernier coup doit être écoulé avant de tester un coup à vide.
  for (let i = 0; i < 10; i++) updateRun(run, { rx: 0, ry: 0 }, 0.1, stats);
  const nobody = attackRun(run, { rx: 2.5, ry: 15.5 }, stats);
  check('combat: coup dans le vide sans monstre', nobody !== null && nobody.hit === null);
}

// --- Dégâts, armure et mort ----------------------------------------------
{
  const run = createRun('antre', 11);
  const monster = run.monsters[0];
  monster.x = ROOM_SPAWN.x;
  monster.y = ROOM_SPAWN.y;
  const player = { rx: ROOM_SPAWN.x, ry: ROOM_SPAWN.y };

  const grace = updateRun(run, player, 0.1, { attack: 4, defense: 0 });
  check('dégâts: répit à l’arrivée', grace.damage === 0 && run.pv === run.pvMax);

  // On laisse le répit s'écouler (le monstre frappe pendant ce temps).
  updateRun(run, player, ENTRY_GRACE + 0.1, { attack: 4, defense: 0 });

  run.pv = run.pvMax;
  monster.cd = 0;
  const naked = updateRun(run, player, 0.05, { attack: 4, defense: 0 });
  check('dégâts: contact encaissé sans armure', naked.damage === monster.damage, `damage=${naked.damage}`);

  run.pv = run.pvMax;
  monster.cd = 0;
  const armored = updateRun(run, player, 0.05, { attack: 4, defense: 8 });
  check('dégâts: armure qui réduit les coups', armored.damage === monster.damage - 8, `damage=${armored.damage}`);

  run.pv = run.pvMax;
  monster.cd = 0;
  const tank = updateRun(run, player, 0.05, { attack: 4, defense: 99 });
  check('dégâts: un point minimum même très protégé', tank.damage === 1, `damage=${tank.damage}`);

  run.pv = 2;
  monster.cd = 0;
  let dead = null;
  let guard = 0;
  while (!dead && guard++ < 50) {
    dead = updateRun(run, player, 0.05, { attack: 4, defense: 0 });
    if (!dead.dead) run.pv = 1;
  }
  check('dégâts: mort quand les PV tombent à zéro', dead?.dead === true && run.phase === 'dead' && run.pv === 0);
}

// --- Coffres et salle nettoyée -------------------------------------------
{
  const run = createRun('crypte', 5);
  check('coffres: aucun à portée au départ', chestNear(run, run.room.spawn) === null);

  let opened = 0;
  let events = null;
  for (const chest of run.chests) {
    const item = openChest(run, { x: chest.x, y: chest.y });
    if (item) opened += 1;
  }
  check('coffres: chaque coffre donne son butin', opened === run.chests.length);
  check('coffres: un coffre ne se rouvre pas', openChest(run, { x: run.chests[0].x, y: run.chests[0].y }) === null);

  events = updateRun(run, { rx: 1, ry: 15 }, 0.05, { attack: 4, defense: 0 });
  check('coffres: salle nettoyée quand tout est ouvert', events.cleared && run.phase === 'won' && run.cleared);
}

// --- Équipement -----------------------------------------------------------
{
  const vault = createVault();
  check('équipement: inventaire vide au départ', Object.keys(vault.items).length === 0);

  check('équipement: impossible d’équiper un objet absent', equipItem(vault, 'epee_gardien') === null);

  addItem(vault, 'epee_gardien');
  const equipped = equipItem(vault, 'epee_gardien');
  check('équipement: arme équipée', equipped === 'equipped' && vault.equipped.arme === 'epee_gardien');
  check('équipement: statistiques mises à jour',
    gearStats(vault).attack === LOOT.epee_gardien.attack && gearStats(vault).attack > 0);
  check('équipement: PV maximum avec armure', playerStats(vault).pvMax === BASE_STATS.pv);

  check('équipement: second clic retire l’objet', equipItem(vault, 'epee_gardien') === 'unequipped'
    && vault.equipped.arme === null);
  check('équipement: retrait par emplacement', unequipSlot(vault, 'arme') === null);

  equipItem(vault, 'epee_gardien');
  addItem(vault, 'dague');
  equipItem(vault, 'dague');
  check('équipement: une seule arme à la fois', vault.equipped.arme === 'dague');

  addItem(vault, 'armure_gardien');
  equipItem(vault, 'armure_gardien');
  const stats = playerStats(vault);
  check('équipement: arme et armure cumulées',
    stats.attack === BASE_STATS.attack + LOOT.dague.attack
    && stats.defense === LOOT.armure_gardien.defense
    && stats.pvMax === BASE_STATS.pv + LOOT.armure_gardien.defense * 2);

  addItem(vault, 'dague');
  check('équipement: doublons comptés', itemCount(vault, 'dague') === 2 && ownsItem(vault, 'dague'));
}

// --- Sauvegarde tolérante ------------------------------------------------
{
  check('sauvegarde: contenu illisible ignoré', sanitizeVault(null).items && Object.keys(sanitizeVault('nope').items).length === 0);
  check('sauvegarde: objet inconnu ignoré', Object.keys(sanitizeVault({ items: { licorne: 3 } }).items).length === 0);

  const restored = sanitizeVault({
    items: { lame_brumes: 2, epee_gardien: 'oops', tunique: 1 },
    equipped: { arme: 'lame_brumes', armure: 'epee_gardien' }
  });
  check('sauvegarde: butin relu', itemCount(restored, 'lame_brumes') === 2 && itemCount(restored, 'epee_gardien') === 0);
  check('sauvegarde: arme équipée relue', restored.equipped.arme === 'lame_brumes');
  check('sauvegarde: armure du mauvais type refusée', restored.equipped.armure === null);

  const notOwned = sanitizeVault({ items: {}, equipped: { arme: 'hache' } });
  check('sauvegarde: impossible de porter un objet absent', notOwned.equipped.arme === null);

  const huge = sanitizeVault({ items: { dague: 1e9 } });
  check('sauvegarde: quantité bornée', itemCount(huge, 'dague') === 99);
}

// --- Sortie des maisons : même détection que côté donjon ------------------
// main.js utilise nearExit (dungeons.js) pour les maisons ET les donjons :
// les deux doivent répondre pareil sur une salle de maison.
{
  const house = buildHouses(generateWorld())[0];
  const room = buildInterior(house);
  const points = [
    room.spawn,
    { x: 7.5, y: 9.6 },
    { x: 7.5, y: 12 },
    { x: 2.5, y: 2.5 },
    { x: 7.5, y: room.h - 1 + 0.35 }
  ];
  check('maisons: nearExit identique pour les deux modules',
    points.every((point) => nearExit(room, point) === houseNearExit(room, point)));
  check('maisons: sortie détectée devant la porte', nearExit(room, { x: 7.5, y: 9.6 }));
  check('maisons: pas de sortie en plein milieu', !nearExit(room, { x: 7.5, y: 5.5 }));
}

// --- Donjons par identifiant ---------------------------------------------
{
  check('donjons: getDungeon retrouve chaque entrée', DUNGEONS.every((d) => getDungeon(d.id)?.id === d.id));
  check('donjons: identifiant inconnu refusé', getDungeon('mordor') === null);
}

console.log(fail.length ? `\n${fail.length} échec(s)` : '\nTous les tests passent');
process.exit(fail.length ? 1 : 0);
