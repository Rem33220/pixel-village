import { generateWorld, isSolid, T } from '../public/js/map.js';
import { DECORS } from '../public/js/decor.js';
import { buildHouses, buildInterior, nearExit as houseNearExit } from '../public/js/houses.js';
import {
  DUNGEONS,
  LOOT,
  ITEM_ICONS,
  MONSTERS,
  BASE_STATS,
  ENTRY_GRACE,
  PORTAL_RANGE,
  RARITY_ORDER,
  SECRET_RANGE,
  SWING_TIME,
  WEAPON_ARTS,
  aimDirection,
  crackNear,
  CRACK_SPOTS,
  dungeonTotals,
  dungeonUnlocked,
  enterSecretRoom,
  equippedWeapon,
  exitAction,
  getDungeon,
  missingDungeons,
  starterDungeons,
  isLastRoom,
  leaveSecretRoom,
  nextRoom,
  roomCount,
  roomNumber,
  swingAngle,
  ROOM_SPAWN,
  addItem,
  attackRun,
  chestNear,
  createRun,
  createVault,
  equipItem,
  gearStats,
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
  check('donjons: six expéditions, six niveaux distincts', DUNGEONS.length === 6
    && new Set(DUNGEONS.map((d) => d.level)).size === 6);
  check('donjons: trois donjons de départ, trois expéditions avancées',
    starterDungeons().length === 3 && DUNGEONS.filter((d) => d.requires?.length).length === 3);
  for (const dungeon of DUNGEONS) {
    const rooms = dungeon.rooms ?? [];
    const secrets = dungeon.secrets ?? [];
    const specs = [...rooms, ...secrets];
    check(`donjon ${dungeon.id}: au moins deux salles + une secrète`,
      rooms.length >= 2 && secrets.length >= 1);
    check(`donjon ${dungeon.id}: une fissure par salle secrète`,
      (dungeon.cracks ?? []).length >= secrets.length
      && new Set(dungeon.cracks).size === dungeon.cracks.length
      && dungeon.cracks.every((key) => CRACK_SPOTS[key]));
    check(`donjon ${dungeon.id}: butin de chaque salle connu`,
      specs.every((spec) => spec.loot.every((id) => LOOT[id])));
    check(`donjon ${dungeon.id}: chaque coffre a un objet`,
      specs.every((spec) => spec.chests >= 1 && spec.loot.length >= spec.chests
        && new Set(spec.loot).size === spec.loot.length));
    check(`donjon ${dungeon.id}: monstres connus`,
      specs.every((spec) => spec.monsters.length > 0
        && spec.monsters.every((type) => MONSTERS[type])));
    check(`donjon ${dungeon.id}: accent de couleur`, /^#[0-9a-f]{6}$/i.test(dungeon.accent));

    const totals = dungeonTotals(dungeon);
    check(`donjon ${dungeon.id}: totaux = somme des salles`,
      totals.rooms === rooms.length
      && totals.secrets === secrets.length
      && totals.monsters === specs.reduce((sum, spec) => sum + spec.monsters.length, 0)
      && totals.chests === specs.reduce((sum, spec) => sum + spec.chests, 0)
      && totals.secret === true);

    const listed = new Set(dungeon.loot);
    const roomLoot = rooms.flatMap((spec) => spec.loot);
    const secretLoot = secrets.flatMap((spec) => spec.loot);
    check(`donjon ${dungeon.id}: butin du portail complet`,
      roomLoot.every((id) => listed.has(id))
      && secretLoot.every((id) => listed.has(id)));
    check(`donjon ${dungeon.id}: chaque salle secrète cache un butin nouveau`,
      secrets.every((spec) => spec.loot.some((id) => !roomLoot.includes(id))),
      secrets.map((spec) => spec.loot.join('+')).join(' | '));
  }

  // Plus le niveau monte, plus le donjon est long : salles ET secrètes.
  const ordered = DUNGEONS.slice().sort((a, b) => a.level - b.level);
  check('donjons: le nombre de salles croît avec le niveau',
    ordered.every((dungeon, index) => index === 0
      || dungeon.rooms.length > ordered[index - 1].rooms.length));
  check('donjons: le nombre de salles secrètes croît avec le niveau',
    ordered.every((dungeon, index) => index === 0
      || dungeon.secrets.length > ordered[index - 1].secrets.length));
  check('donjons: les fissures changent de mur d’un donjon à l’autre',
    new Set(DUNGEONS.map((dungeon) => dungeon.cracks[0])).size === DUNGEONS.length);

  const allSpecs = DUNGEONS.flatMap((dungeon) => [...dungeon.rooms, ...dungeon.secrets]);
  const items = new Set(DUNGEONS.flatMap((dungeon) => dungeon.loot));
  check('butin: tous les objets ont un type valide',
    [...items].every((id) => LOOT[id].kind === 'arme' || LOOT[id].kind === 'armure'));
  check('butin: au moins une arme et une armure', [...items].some((id) => LOOT[id].kind === 'arme')
    && [...items].some((id) => LOOT[id].kind === 'armure'));
  check('butin: chaque objet vient d’un donjon', [...items].every((id) => (
    DUNGEONS.some((dungeon) => dungeon.loot.includes(id))
  )));
  check('butin: chaque objet d’un donjon est dans une salle',
    [...items].every((id) => allSpecs.some((spec) => spec.loot.includes(id))));
  check('butin: raretés connues',
    Object.values(LOOT).every((item) => RARITY_ORDER.includes(item.rarity)));

  const legendaires = Object.entries(LOOT)
    .filter(([, item]) => item.rarity === 'legendaire')
    .map(([id]) => id);
  check('butin: objets légendaires présents', legendaires.length >= 2, legendaires.join(','));
  check('butin: les légendaires ne viennent que des salles secrètes',
    DUNGEONS.every((dungeon) => dungeon.loot
      .filter((id) => LOOT[id].rarity === 'legendaire')
      .every((id) => dungeon.secrets.some((spec) => spec.loot.includes(id)))));
  check('butin: au moins un objet épique par donjon',
    DUNGEONS.every((dungeon) => dungeon.loot.some((id) => LOOT[id].rarity === 'epique')));

  const nouveaux = ['araignee', 'spectre', 'ombre', 'noye', 'gargouille', 'seigneur'];
  check('monstres: six créatures au total',
    nouveaux.every((type) => MONSTERS[type] && MONSTERS[type].pv > 0));
  check('monstres: les expéditions avancées ont leurs propres créatures',
    ['noye', 'gargouille', 'seigneur'].every((type) => (
      DUNGEONS.some((d) => d.requires?.length && d.loot
        && [...d.rooms, ...d.secrets].some((spec) => spec.monsters.includes(type)))
    )));
  check('butin: rareté mythique réservée aux salles secrètes',
    DUNGEONS.every((dungeon) => dungeon.loot
      .filter((id) => LOOT[id].rarity === 'mythique')
      .every((id) => dungeon.secrets.some((spec) => spec.loot.includes(id))))
    && Object.values(LOOT).some((item) => item.rarity === 'mythique'));

  // --- Déblocage progressif des expéditions ------------------------------
  const starter = new Set();
  check('déblocage: les trois premiers donjons sont ouverts d’emblée',
    DUNGEONS.slice(0, 3).every((d) => dungeonUnlocked(d, starter)));
  check('déblocage: les abysses exigent les trois premiers',
    !dungeonUnlocked(getDungeon('abysses'), starter)
    && !dungeonUnlocked(getDungeon('abysses'), new Set(['crypte', 'galerie']))
    && dungeonUnlocked(getDungeon('abysses'), new Set(['crypte', 'galerie', 'antre'])));
  check('déblocage: la forge exige les abysses',
    !dungeonUnlocked(getDungeon('forge'), new Set(['crypte', 'galerie', 'antre']))
    && dungeonUnlocked(getDungeon('forge'), new Set(['abysses'])));
  check('déblocage: le trône exige la forge',
    !dungeonUnlocked(getDungeon('trone'), new Set(['abysses']))
    && dungeonUnlocked(getDungeon('trone'), new Set(['forge'])));
  check('déblocage: chaque `requires` existe',
    DUNGEONS.every((d) => (d.requires ?? []).every((id) => getDungeon(id))));
  check('déblocage: une chaîne sans boucle',
    DUNGEONS.every((d) => !(d.requires ?? []).includes(d.id)));
  check('déblocage: la liste des manquants est explicite',
    missingDungeons(getDungeon('abysses'), new Set(['crypte'])).map((d) => d.id).join(',')
      === 'galerie,antre'
    && missingDungeons(getDungeon('abysses'), new Set(['crypte', 'galerie', 'antre'])).length === 0);
  check('monstres: la salle secrète est au moins aussi dangereuse',
    DUNGEONS.every((dungeon) => {
      const pire = (types) => Math.max(...types.map((type) => MONSTERS[type].damage));
      const normal = dungeon.rooms.flatMap((room) => room.monsters);
      return dungeon.secrets.every((spec) => pire(spec.monsters) >= pire(normal));
    }));

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
  const entries = [...run.rooms, ...run.secrets];

  for (const entry of entries) {
    const room = entry.room;
    const label = `${dungeon.id}/${entry.spec.name}`;

    check(`${label}: arrivée praticable`, walkable(room, room.spawn.x, room.spawn.y));
    check(`${label}: sortie pas déjà dans la zone de sortie`, !nearExit(room, room.spawn));
    check(`${label}: sortie détectée devant l’escalier`,
      nearExit(room, { x: room.exit.x, y: room.exit.y - 0.7 }));

    const seen = reachableFrom(room, {
      x: Math.floor(room.spawn.x),
      y: Math.floor(room.spawn.y)
    });

    check(`${label}: coffres sur du sol atteignable`, entry.chests.every((chest) => (
      walkable(room, chest.x, chest.y) && seen.has(`${Math.floor(chest.x)},${Math.floor(chest.y)}`)
    )));

    check(`${label}: monstres sur du sol atteignable`, entry.monsters.every((monster) => (
      walkable(room, monster.x, monster.y) && seen.has(`${Math.floor(monster.x)},${Math.floor(monster.y)}`)
    )));

    const limite = entry.hidden ? 3.4 : 4.9;
    check(`${label}: monstres loin de l’arrivée`, entry.monsters.every((monster) => (
      Math.hypot(monster.x - room.spawn.x, monster.y - room.spawn.y) > limite
    )));

    check(`${label}: coffres et monstres séparés`,
      entry.chests.every((chest) => entry.monsters.every((m) => (
        Math.hypot(m.x - chest.x, m.y - chest.y) > 1
      ))));

    const ids = entry.chests.map((chest) => chest.item);
    check(`${label}: butin des coffres unique`, new Set(ids).size === ids.length);
    check(`${label}: butin tiré de la salle`, ids.every((id) => entry.spec.loot.includes(id)));
  }

  check(`${dungeon.id}: salles secrètes plus petites`,
    run.secrets.every((entry) => entry.room.w < run.rooms[0].room.w
      && entry.room.h < run.rooms[0].room.h));

  const hosts = run.rooms.filter((entry) => entry.hasCrack);
  check(`${dungeon.id}: une fissure par salle secrète`,
    hosts.length === run.secrets.length
    && new Set(hosts.map((entry) => entry.crackIndex)).size === run.secrets.length);
  check(`${dungeon.id}: les fissures occupent des salles distinctes`,
    new Set(hosts.map((entry) => run.rooms.indexOf(entry))).size === hosts.length);
  check(`${dungeon.id}: la fissure n’est pas un mur plein`,
    hosts.every((entry) => Boolean(entry.room.crack)
      && walkable(entry.room, entry.room.crack.x, entry.room.crack.y)));
  for (const entry of hosts) {
    const crackSeen = reachableFrom(entry.room, {
      x: Math.floor(entry.room.spawn.x),
      y: Math.floor(entry.room.spawn.y)
    });
    check(`${dungeon.id}/${entry.room.crackSpot}: fissure atteignable à pied`,
      crackSeen.has(`${Math.floor(entry.room.crack.x)},${Math.floor(entry.room.crack.y)}`));
    check(`${dungeon.id}/${entry.room.crackSpot}: fissure hors de portée au départ`,
      !crackNear({ ...run, roomIndex: run.rooms.indexOf(entry) }, entry.room.spawn));
  }
}

// --- Décors des salles ----------------------------------------------------
{
  const used = DUNGEONS.map((dungeon) => dungeon.decor);
  check('chaque donjon déclare un décor connu',
    used.every((key) => Boolean(DECORS[key])), used.join(', '));
  check('les six donjons ont six décors différents',
    new Set(used).size === DUNGEONS.length);
  check('tous les décors servent',
    Object.keys(DECORS).length === new Set(used).size);
  // Le rendu compare `decor.id` aux noms de décor : un identifiant oublié
  // ferait retomber toutes les salles sur le dessin de la Crypte.
  check('chaque palette porte son identifiant',
    Object.entries(DECORS).every(([key, palette]) => palette.id === key));

  for (const dungeon of DUNGEONS) {
    const palette = DECORS[dungeon.decor];
    check(`${dungeon.id}: palette complète`,
      ['floor', 'wall', 'accent'].every((part) => Boolean(palette?.[part]))
      && Boolean(palette?.accent?.kind));

    const entries = [
      ...createRun(dungeon.id, 77).rooms,
      ...createRun(dungeon.id, 77).secrets
    ];
    check(`${dungeon.id}: ses salles portent son décor`,
      entries.every((entry) => entry.room.decor === dungeon.decor));
    check(`${dungeon.id}: sol, murs et escalier seulement`,
      entries.every((entry) => entry.room.tiles.every((tile) => (
        tile === T.STONE_FLOOR || tile === T.MOSS
        || tile === T.STONE_WALL || tile === T.DOOR_STONE
      ))));
    check(`${dungeon.id}: chaque salle a des tuiles de motif`,
      entries.every((entry) => entry.room.tiles.includes(T.MOSS)));
  }

  // La densité du motif et le décalage des dalles dépendent de la salle, pas
  // seulement du donjon : deux salles d'une même descente ne doivent pas être
  // le même copier-coller.
  for (const dungeon of DUNGEONS) {
    const variants = new Set(createRun(dungeon.id, 5).rooms.map((entry) => entry.room.variant));
    check(`${dungeon.id}: variantes de motif d’une salle à l’autre`,
      variants.size > 1, [...variants].join(','));
  }
  check('les variantes restent dans les bornes du rendu',
    DUNGEONS.every((dungeon) => createRun(dungeon.id, 9).rooms.every((entry) => (
      entry.room.variant >= 0 && entry.room.variant <= 2
    ))));
}

// --- Déterminisme ---------------------------------------------------------
{
  const signature = (run) => JSON.stringify({
    cracks: run.rooms.map((entry) => entry.room.crackSpot ?? null),
    rooms: [...run.rooms, ...run.secrets].map((entry) => ({
      chests: entry.chests.map((chest) => [chest.x, chest.y, chest.item]),
      monsters: entry.monsters.map((m) => [m.type, m.x, m.y])
    }))
  });
  const a = createRun('galerie', 7);
  const b = createRun('galerie', 7);
  check('génération: même graine = même expédition', signature(a) === signature(b));
  const c = createRun('galerie', 8);
  check('génération: graine différente = disposition différente', signature(a) !== signature(c));
  check('génération: la fissure change de salle selon la graine',
    a.rooms.findIndex((entry) => entry.hasCrack) !== c.rooms.findIndex((entry) => entry.hasCrack)
    || a.rooms.some((entry, index) => entry.room.crackSpot !== c.rooms[index].room.crackSpot));
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

// --- Coffres, salles et fin du donjon ------------------------------------
{
  const run = createRun('crypte', 5);
  check('coffres: aucun à portée au départ', chestNear(run, run.room.spawn) === null);

  let opened = 0;
  for (const chest of run.chests) {
    const item = openChest(run, { x: chest.x, y: chest.y });
    if (item) opened += 1;
  }
  check('coffres: chaque coffre donne son butin', opened === run.chests.length);
  check('coffres: un coffre ne se rouvre pas', openChest(run, { x: run.chests[0].x, y: run.chests[0].y }) === null);

  let events = updateRun(run, { rx: 1, ry: 15 }, 0.05, { attack: 4, defense: 0 });
  check('coffres: salle nettoyée quand tout est ouvert',
    events.cleared && run.roomEntry.cleared && run.cleared && run.phase === 'run');
  check('coffres: le donjon n’est pas fini après la première salle', !events.finished);

  // Toutes les salles vidées → donjon nettoyé.
  const full = createRun('crypte', 5);
  let last = null;
  for (let i = 0; i < full.rooms.length; i++) {
    for (const chest of full.chests) openChest(full, { x: chest.x, y: chest.y });
    last = updateRun(full, { rx: 1, ry: 15 }, 0.05, { attack: 4, defense: 0 });
    if (i + 1 < full.rooms.length) nextRoom(full);
  }
  check('coffres: donjon nettoyé quand toutes les salles sont vidées',
    last?.cleared === true && last.finished === true && full.phase === 'won' && full.cleared);
}

// --- Descente de salle en salle ------------------------------------------
{
  const run = createRun('antre', 9);
  check('progression: départ dans la première salle',
    roomNumber(run) === 1 && roomCount(run) === run.rooms.length + run.secrets.length && !run.inSecret);
  check('progression: l’escalier descend d’une salle', exitAction(run) === 'next');
  check('progression: nom de salle exposé', Boolean(run.roomEntry.spec.name));

  const first = run.rooms[0];
  const second = nextRoom(run);
  check('progression: salle suivante active',
    second === run.rooms[1] && run.room === second.room
    && run.monsters === second.monsters && run.chests === second.chests && roomNumber(run) === 2);
  check('progression: la salle quittée garde son état', first.chests.every((chest) => !chest.opened));
  check('progression: nouveau répit à l’arrivée', run.grace === ENTRY_GRACE);

  while (exitAction(run) === 'next') nextRoom(run);
  check('progression: dernière salle = sortie du donjon',
    isLastRoom(run) && exitAction(run) === 'out' && roomNumber(run) === run.rooms.length);
  check('progression: impossible de descendre plus bas', nextRoom(run) === null);
}

// --- Fissure et salle secrète --------------------------------------------
{
  // Le Trône a quatre salles secrètes : chacune possède sa propre fissure,
  // sur un mur différent, et mène à sa propre salle.
  const run = createRun('trone', 42);
  const hosts = run.rooms
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => entry.hasCrack);

  check('secret: une fissure par salle secrète', hosts.length === run.secrets.length);
  check('secret: fissures sur des murs différents',
    new Set(hosts.map(({ entry }) => entry.room.crackSpot)).size === hosts.length);
  check('secret: portée cohérente', SECRET_RANGE > 0.8 && SECRET_RANGE < 2);

  const visited = [];
  for (const { entry: host, index } of hosts) {
    while (run.roomIndex < index) nextRoom(run);
    const away = { x: host.room.spawn.x, y: host.room.spawn.y };
    check(`secret/${host.room.crackSpot}: rien à faire loin du mur`, !crackNear(run, away));
    check(`secret/${host.room.crackSpot}: détectée devant le mur`,
      crackNear(run, host.room.crack));

    const secret = enterSecretRoom(run);
    visited.push(secret);
    check(`secret/${host.room.crackSpot}: salle secrète ouverte`,
      secret === run.secrets[host.crackIndex] && run.inSecret && run.secretFound
      && run.room === secret.room && run.monsters === secret.monsters);
    check(`secret/${host.room.crackSpot}: l’escalier remonte`, exitAction(run) === 'secret');
    check(`secret/${host.room.crackSpot}: pas de fissure à l’intérieur`,
      !crackNear(run, { x: 1.5, y: 5.5 }));

    const back = leaveSecretRoom(run);
    check(`secret/${host.room.crackSpot}: retour dans la salle d’origine`,
      back === host && !run.inSecret && run.room === host.room && run.monsters === host.monsters);
  }
  check('secret: chaque fissure mène à sa propre salle',
    new Set(visited).size === hosts.length);

  // La crypte (une seule secrète) numérote sa salle juste après les salles.
  const simple = createRun('crypte', 42);
  const simpleHost = simple.rooms.findIndex((entry) => entry.hasCrack);
  while (simple.roomIndex < simpleHost) nextRoom(simple);
  enterSecretRoom(simple);
  check('secret: numérotée après les salles ordinaires',
    roomNumber(simple) === simple.rooms.length + 1);

  // Une salle sans fissure ne s’ouvre pas.
  const other = createRun('crypte', 42);
  const plain = other.rooms.findIndex((entry) => !entry.hasCrack);
  if (plain >= 0) {
    while (other.roomIndex < plain) nextRoom(other);
    check('secret: pas de passage secret dans une salle sans fissure',
      enterSecretRoom(other) === null && !other.secretFound);
  }
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

// --- Arme en main et geste de frappe -------------------------------------
{
  const weapons = Object.entries(LOOT).filter(([, item]) => item.kind === 'arme');
  check('armes: chaque arme a une silhouette connue',
    weapons.length >= 5 && weapons.every(([, item]) => WEAPON_ARTS.includes(item.art)));
  check('armes: les silhouettes servent toutes',
    new Set(weapons.map(([, item]) => item.art)).size === WEAPON_ARTS.length);
  check('armes: armures sans silhouette de main',
    Object.values(LOOT).filter((item) => item.kind === 'armure').every((item) => !item.art));

  const vault = createVault();
  check('arme en main: rien à mains nues', equippedWeapon(vault) === null);
  addItem(vault, 'hache');
  equipItem(vault, 'hache');
  check('arme en main: suit l’arme équipée', equippedWeapon(vault) === 'hache');
  equipItem(vault, 'hache');
  check('arme en main: disparaît après retrait', equippedWeapon(vault) === null);

  check('geste: repos à zéro au début', swingAngle(0) === 0);
  check('geste: retour au repos à la fin', Math.abs(swingAngle(1)) < 1e-9);
  check('geste: armé en arrière', swingAngle(0.3) === -70);
  check('geste: frappe vers l’avant', swingAngle(0.65) === 90);
  const strike = [0.3, 0.4, 0.5, 0.6].map(swingAngle);
  check('geste: l’arme balaie toujours dans le même sens',
    strike.every((angle, index) => index === 0 || angle > strike[index - 1]), strike.join(' → '));
  check('geste: valeur bornée hors de [0, 1]',
    swingAngle(-3) === 0 && Math.abs(swingAngle(4)) < 1e-9 && swingAngle(NaN) === 0);

  const run = createRun('crypte', 21);
  const monster = run.monsters[0];
  const player = { rx: monster.x + 1, ry: monster.y, dir: 'up' };
  const hit = attackRun(run, player, playerStats(createVault()));
  check('frappe: animation lancée avec le coup', hit?.hit === monster && run.swing === SWING_TIME);
  check('frappe: le coup vise le monstre', run.swingDir === 'left' && player.dir === 'left', run.swingDir);
  updateRun(run, { rx: monster.x + 1, ry: monster.y }, SWING_TIME + 0.05, playerStats(createVault()));
  check('frappe: animation terminée après SWING_TIME', run.swing === 0);

  check('visée: vers le haut', aimDirection({ x: 0, y: 0 }, { x: 0, y: -3 }) === 'up');
  check('visée: vers la droite', aimDirection({ x: 0, y: 0 }, { x: 4, y: 1 }) === 'right');
  check('visée: sans cible, on garde le regard', aimDirection({ dir: 'left' }, null) === 'left');
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
