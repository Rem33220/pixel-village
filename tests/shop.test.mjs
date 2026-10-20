import { generateWorld, isSolid, tileAt, T } from '../public/js/map.js';
import {
  addItem,
  coinsLabel,
  createVault,
  equipItem,
  itemCount,
  ownsItem,
  sanitizeVault
} from '../public/js/dungeons.js';
import { SELL_PRICES, nearShop, sellAll, sellItem, sellPrice } from '../public/js/shop.js';

const world = generateWorld();
const shop = world.shop;
const fail = [];
const check = (label, ok, extra = '') => {
  console.log(`${ok ? 'OK  ' : 'ECHEC'} ${label}${extra ? ' — ' + extra : ''}`);
  if (!ok) fail.push(label);
};

const walkable = (x, y) => !isSolid(world, Math.floor(x), Math.floor(y));

// --- La carte : le lac laisse la place à l'échoppe -----------------------
{
  let water = 0;
  let sand = 0;
  for (let y = 0; y < world.h; y++) {
    for (let x = 0; x < world.w; x++) {
      const tile = tileAt(world, x, y);
      if (tile === T.WATER) water++;
      if (tile === T.SAND) sand++;
    }
  }
  check('carte: plus aucun lac (ni plage)', water === 0 && sand === 0, `eau=${water} sable=${sand}`);
  check('carte: l’échoppe existe', Boolean(shop && shop.door), JSON.stringify(shop?.door));
  check('carte: porte de l’échoppe peinte en porte', tileAt(world, shop.door.x, shop.door.y) === T.DOOR);
  check('carte: la porte reste solide', isSolid(world, shop.door.x, shop.door.y));
  check('carte: seuil et parvis praticables',
    walkable(shop.stand.x, shop.stand.y)
    && walkable(shop.stand.x - 1.5, shop.stand.y)
    && walkable(shop.stand.x + 1.5, shop.stand.y)
    && walkable(shop.stand.x, shop.stand.y + 1.5));
}

// --- L'échoppe est joignable à pied depuis le point de départ -------------
{
  const start = { x: Math.floor(world.spawn.x), y: Math.floor(world.spawn.y) };
  const seen = new Set([`${start.x},${start.y}`]);
  const queue = [start];
  while (queue.length) {
    const { x, y } = queue.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      const key = `${nx},${ny}`;
      if (seen.has(key) || isSolid(world, nx, ny)) continue;
      seen.add(key);
      queue.push({ x: nx, y: ny });
    }
  }
  const sx = Math.floor(shop.stand.x);
  const sy = Math.floor(shop.stand.y);
  check('accès: seuil de l’échoppe atteignable à pied', seen.has(`${sx},${sy}`));

  // Le chemin de terre part de la rue nord-sud et file jusqu'au parvis :
  // c'est ce qui garantit qu'aucun arbre ne pousse au milieu du trajet.
  let corridor = true;
  for (let x = 31; x <= shop.door.x; x++) {
    if (tileAt(world, x, 14) !== T.PATH || tileAt(world, x, 15) !== T.PATH) corridor = false;
  }
  check('accès: chemin de terre continu depuis la rue', corridor);
  check('accès: chemin praticable de bout en bout',
    Array.from({ length: shop.door.x - 31 + 1 }, (_, i) => walkable(31 + i, 14.5)).every(Boolean));
}

// --- Prix de revente ------------------------------------------------------
{
  check('prix: chaque rareté a un tarif', ['commun', 'rare', 'epique', 'legendaire']
    .every((rarity) => Number.isFinite(SELL_PRICES[rarity]) && SELL_PRICES[rarity] > 0));
  check('prix: une dague commune vaut 4 pièces', sellPrice('dague') === SELL_PRICES.commun);
  check('prix: la lame d’ombre (légendaire) vaut 60 pièces',
    sellPrice('lame_ombre') === SELL_PRICES.legendaire, `prix=${sellPrice('lame_ombre')}`);
  check('prix: objet inconnu sans valeur', sellPrice('brouette') === 0);
  check('bourse: libellé au singulier et au pluriel',
    coinsLabel(1) === '1 pièce' && coinsLabel(68) === '68 pièces' && coinsLabel(-4) === '0 pièce');
}

// --- Bourse et vente ------------------------------------------------------
{
  const vault = createVault();
  check('bourse: vide au départ', vault.coins === 0 && Object.keys(vault.items).length === 0);

  addItem(vault, 'dague');
  addItem(vault, 'dague');
  addItem(vault, 'lame_ombre');

  const one = sellItem(vault, 'dague');
  check('vente: une dague vendue', one?.count === 1 && one?.coins === SELL_PRICES.commun);
  check('vente: il reste une dague', itemCount(vault, 'dague') === 1);
  check('vente: la bourse se remplit', vault.coins === SELL_PRICES.commun, `coins=${vault.coins}`);

  const rest = sellAll(vault, 'dague');
  check('vente: tout vendre', rest?.count === 1 && !ownsItem(vault, 'dague'));
  check('vente: bourse doublée', vault.coins === SELL_PRICES.commun * 2);

  check('vente: objet absent refusé', sellItem(vault, 'dague') === null);
  check('vente: objet inconnu refusé', sellItem(vault, 'brouette') === null);
  check('vente: quantité absurde refusée', sellItem(vault, 'lame_ombre', 0) === null);

  // Dernier exemplaire équipé : il est retiré en même temps.
  equipItem(vault, 'lame_ombre');
  check('vente: arme équipée avant vente', vault.equipped.arme === 'lame_ombre');
  sellAll(vault, 'lame_ombre');
  check('vente: dernier exemplaire équipé automatiquement retiré', vault.equipped.arme === null);

  // Vente partielle : l'arme reste en main.
  addItem(vault, 'epee_courte');
  addItem(vault, 'epee_courte');
  equipItem(vault, 'epee_courte');
  sellItem(vault, 'epee_courte', 1);
  check('vente: un doublon vendu garde l’équipement', vault.equipped.arme === 'epee_courte');
}

// --- Sauvegarde de la bourse ---------------------------------------------
{
  const saved = sanitizeVault({ coins: 42, items: { dague: 2 }, equipped: {} });
  check('sauvegarde: pièces relues', saved.coins === 42);

  const broken = sanitizeVault({ coins: -5, items: {} });
  check('sauvegarde: pièces négatives ignorées', broken.coins === 0);

  const huge = sanitizeVault({ coins: 9999999 });
  check('sauvegarde: pièces plafonnées', huge.coins === 999999);

  const legacy = sanitizeVault({ items: { dague: 1 } });
  check('sauvegarde: ancienne sauvegarde sans pièces acceptée',
    legacy.coins === 0 && legacy.items.dague === 1);
}

// --- Portée de l'échoppe --------------------------------------------------
{
  check('invite: on peut vendre devant le comptoir', nearShop(shop, { rx: shop.stand.x, ry: shop.stand.y }));
  check('invite: rien à faire à l’autre bout du village', !nearShop(shop, { rx: 5, ry: 40 }));
}

console.log(fail.length ? `\n${fail.length} échec(s)` : '\nTous les tests passent');
process.exit(fail.length ? 1 : 0);
