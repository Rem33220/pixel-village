// Carte du monde : générée de façon déterministe pour que le client et le
// serveur aient exactement la même grille, sans rien télécharger.

export const TILE_SIZE = 16;
export const WORLD_SEED = 20261019;

export const T = {
  GRASS: 0,
  GRASS2: 1,
  PATH: 2,
  WATER: 3,
  SAND: 4,
  TREE: 5,
  FLOWER: 6,
  ROCK: 7,
  WALL: 8,
  ROOF: 9,
  DOOR: 10,
  WINDOW: 11,
  // Tuiles des intérieurs de maison.
  WOOD: 12,
  PLANK: 13,
  RUG: 14,
  BRICK: 15,
  DOOR_STONE: 16,
  TABLE: 17,
  SHELF: 18,
  CRATE: 19,
  // Tuiles des donjons.
  STONE_FLOOR: 20,
  MOSS: 21,
  STONE_WALL: 22,
  // Petit mobilier propre à chaque maison.
  CRYSTAL_DECOR: 23,
  CANDLE: 24,
  PLANT: 25
};

// Palettes des trois maisons. Elles servent deux fois : le rendu extérieur
// (toit, murs, porte, fenêtres) et l'intérieur (plancher, murs, tapis,
// mobilier). `runes` est la chaumière moussue, `cristaux` l'atelier bleu et
// `devinettes` la maison du sage aux boiseries chaudes.
export const HOUSE_STYLES = {
  runes: {
    roof: { base: '#4f7f5a', shade: '#3c6547', hi: '#6f9f74', ridge: '#2f4f38' },
    wall: { base: '#e6dcc4', mortar: '#ccbfa3', hi: '#f6efdd' },
    door: { base: '#5f4a2f', panel: '#8a6b45', trim: '#e0b24c' },
    window: { frame: '#3f6749', glass: '#a9dcc6', glint: '#effff7' },
    floor: { base: '#8f6a42', plank: '#7a5734', joint: '#5d4023', hi: '#a98253' },
    brick: { base: '#d9cdb4', mortar: '#b9aa8c', hi: '#efe6d2' },
    rug: { base: '#4f7f5a', trim: '#2f4f38', pattern: '#c9e8b8' },
    wood: { dark: '#6b4a2f', mid: '#8a6238', light: '#a98253' }
  },
  cristaux: {
    roof: { base: '#4a6f8c', shade: '#3a5872', hi: '#6f9cba', ridge: '#2c4356' },
    wall: { base: '#cfdbe2', mortar: '#aebdc7', hi: '#edf6fa' },
    door: { base: '#3f5266', panel: '#5c7790', trim: '#9fe4f0' },
    window: { frame: '#2c4356', glass: '#8ff0f7', glint: '#eaffff' },
    floor: { base: '#6f7f8c', plank: '#5c6b77', joint: '#45515b', hi: '#8e9da8' },
    brick: { base: '#8fa3b0', mortar: '#738591', hi: '#b8cbd4' },
    rug: { base: '#3f6f8c', trim: '#2c4356', pattern: '#8ff0f7' },
    wood: { dark: '#4a5a66', mid: '#5f7382', light: '#8ba0ad' }
  },
  devinettes: {
    roof: { base: '#8a6a3f', shade: '#6f5331', hi: '#b08a55', ridge: '#4f3a22' },
    wall: { base: '#e0c9a2', mortar: '#b99c72', hi: '#f3e6cb' },
    door: { base: '#5c3a22', panel: '#7a5230', trim: '#f6d34d' },
    window: { frame: '#5c3a22', glass: '#f7d98a', glint: '#fff5cf' },
    floor: { base: '#8a5a3f', plank: '#74472f', joint: '#57341f', hi: '#a97454' },
    brick: { base: '#b98a5f', mortar: '#9a6f47', hi: '#d9ad7d' },
    rug: { base: '#7a3f52', trim: '#4f2433', pattern: '#f6d34d' },
    wood: { dark: '#4a2c18', mid: '#6b4a2f', light: '#8a6238' }
  }
};

// Portail des donjons : au bout nord de la rue nord-sud, sur la petite place
// dallée. Le client s'en sert pour proposer les donjons, le serveur n'en a pas
// besoin (chaque donjon est une instance privée).
export const PORTAL = { x: 30, y: 5.5 };

// Échoppe du colporteur : au nord-est, à la place de l'ancien lac. Elle achète
// le butin en trop contre des pièces. Comme les maisons et les donjons, c'est
// une affaire de client : le serveur ignore tout des pièces.
export const SHOP = { x: 43, y: 8, w: 7, h: 5 };

// Tuiles qui bloquent le passage.
export const SOLID_TILES = new Set([
  T.WATER,
  T.TREE,
  T.ROCK,
  T.WALL,
  T.ROOF,
  T.DOOR,
  T.WINDOW,
  T.BRICK,
  T.DOOR_STONE,
  T.TABLE,
  T.SHELF,
  T.CRATE,
  T.STONE_WALL,
  T.CRYSTAL_DECOR,
  T.PLANT
]);

function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateWorld(seed = WORLD_SEED) {
  const w = 64;
  const h = 44;
  const tiles = new Uint8Array(w * h);
  const rand = mulberry32(seed);

  const set = (x, y, tile) => {
    if (x >= 0 && y >= 0 && x < w && y < h) tiles[y * w + x] = tile;
  };
  const get = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return T.TREE;
    return tiles[y * w + x];
  };

  // Sol de base : deux nuances d'herbe.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      tiles[y * w + x] = rand() < 0.3 ? T.GRASS2 : T.GRASS;
    }
  }

  // Forêt qui ferme la carte (2 tuiles d'épaisseur).
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x < 2 || y < 2 || x >= w - 2 || y >= h - 2) set(x, y, T.TREE);
    }
  }

  // Chemins : une grand-rue horizontale et une rue verticale qui se croisent.
  for (let x = 6; x <= 58; x++) {
    set(x, 21, T.PATH);
    set(x, 22, T.PATH);
  }
  for (let y = 4; y <= 36; y++) {
    set(29, y, T.PATH);
    set(30, y, T.PATH);
  }

  // Petite place dallée au bout nord du chemin : c'est là que se dresse le
  // portail des donjons, et on doit pouvoir en faire le tour.
  for (let y = 3; y <= 7; y++) {
    for (let x = 28; x <= 31; x++) set(x, y, T.PATH);
  }

  // Maisons du village. `doors` liste les portes rencontrées : le client s'en
  // sert pour proposer d'entrer, sans redécouvrir la carte. `houses` garde en
  // plus l'emplacement et le style de chaque bâtiment, pour que le rendu peigne
  // le bon toit et que l'intérieur reprenne la même palette.
  const doors = [];
  const buildings = [];
  const house = (hx, hy, hw, hh, style) => {
    for (let y = 0; y < hh; y++) {
      for (let x = 0; x < hw; x++) {
        set(hx + x, hy + y, y < 2 ? T.ROOF : T.WALL);
      }
    }
    const doorX = hx + Math.floor(hw / 2);
    const doorY = hy + hh - 1;
    doors.push({ x: doorX, y: doorY });
    set(doorX, doorY, T.DOOR);
    if (hw >= 5) {
      set(hx + 1, hy + hh - 2, T.WINDOW);
      set(hx + hw - 2, hy + hh - 2, T.WINDOW);
    }
    buildings.push({ x: hx, y: hy, w: hw, h: hh, style, door: { x: doorX, y: doorY } });
  };

  house(9, 12, 6, 4, 'runes');
  house(19, 27, 6, 4, 'cristaux');
  house(39, 26, 7, 5, 'devinettes');

  // Échoppe du colporteur, à la place de l'ancien lac : un bâtiment plus large
  // que les maisons, avec un comptoir dessiné devant la porte (voir shop.js).
  const shop = SHOP;
  for (let y = 0; y < shop.h; y++) {
    for (let x = 0; x < shop.w; x++) {
      set(shop.x + x, shop.y + y, y < 2 ? T.ROOF : T.WALL);
    }
  }
  const shopDoor = { x: shop.x + Math.floor(shop.w / 2), y: shop.y + shop.h - 1 };
  set(shopDoor.x, shopDoor.y, T.DOOR);
  set(shop.x + 1, shop.y + shop.h - 2, T.WINDOW);
  set(shop.x + shop.w - 2, shop.y + shop.h - 2, T.WINDOW);

  // Chemin de terre qui relie l'échoppe à la rue nord-sud, et petit parvis
  // devant son comptoir : on doit pouvoir y aller sans traverser la forêt.
  for (let x = 31; x <= shopDoor.x; x++) {
    set(x, 14, T.PATH);
    set(x, 15, T.PATH);
  }
  for (let y = shopDoor.y + 1; y <= shopDoor.y + 4; y++) {
    for (let x = shopDoor.x - 2; x <= shopDoor.x + 2; x++) set(x, y, T.PATH);
  }
  for (let x = shopDoor.x - 2; x <= shopDoor.x + 2; x++) set(x, shopDoor.y + 1, T.PATH);

  // Seuil dégagé devant chaque porte (on y arrive toujours du Sud).
  for (const door of doors) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = 1; dy <= 2; dy++) {
        const x = door.x + dx;
        const y = door.y + dy;
        const tile = get(x, y);
        if (tile === T.TREE || tile === T.ROCK) set(x, y, T.GRASS);
      }
    }
  }

  // Zone de départ dégagée.
  for (let y = 23; y <= 27; y++) {
    for (let x = 28; x <= 33; x++) {
      const tile = get(x, y);
      if (tile === T.TREE || tile === T.ROCK) set(x, y, T.GRASS);
    }
  }

  // Zone juste devant une porte : on la garde libre pour pouvoir entrer.
  const nearDoorFront = (x, y) => doors.some((door) => (
    Math.abs(x - door.x) <= 1 && y > door.y && y <= door.y + 2
  )) || (Math.abs(x - shopDoor.x) <= 2 && y > shopDoor.y && y <= shopDoor.y + 4);

  const nearBuilding = (x, y) => {
    for (let j = -1; j <= 1; j++) {
      for (let i = -1; i <= 1; i++) {
        const tile = get(x + i, y + j);
        if (tile === T.WALL || tile === T.ROOF || tile === T.DOOR || tile === T.WINDOW) {
          return true;
        }
      }
    }
    return false;
  };

  // Arbres éparpillés (obstacles).
  let planted = 0;
  for (let i = 0; i < 1200 && planted < 280; i++) {
    const x = 3 + Math.floor(rand() * (w - 6));
    const y = 3 + Math.floor(rand() * (h - 6));
    const tile = get(x, y);
    if (tile !== T.GRASS && tile !== T.GRASS2) continue;
    if (Math.abs(y - 21) <= 2 || Math.abs(y - 22) <= 2) continue;
    if (Math.abs(x - 29) <= 2 || Math.abs(x - 30) <= 2) continue;
    if (Math.hypot(x - 30.5, y - 25) < 6) continue;
    if (nearBuilding(x, y) || nearDoorFront(x, y)) continue;
    set(x, y, T.TREE);
    planted++;
  }

  // Fleurs (décor, traversables) et rochers (obstacles).
  for (let i = 0; i < 420; i++) {
    const x = 3 + Math.floor(rand() * (w - 6));
    const y = 3 + Math.floor(rand() * (h - 6));
    const tile = get(x, y);
    if (tile !== T.GRASS && tile !== T.GRASS2) continue;
    if (Math.hypot(x - 30.5, y - 25) < 5) continue;
    // Pas de rocher devant les maisons : sinon l'entrée peut être bouchée.
    if (nearBuilding(x, y) || nearDoorFront(x, y)) continue;
    set(x, y, rand() < 0.65 ? T.FLOWER : T.ROCK);
  }

  // Allée de l'échoppe : un chemin dégagé relie la grand-rue au comptoir. Sans
  // elle, les arbres et les rochers plantés plus haut formaient un dédale où
  // l'on se coinçait dès qu'on approchait de la boutique. Elle est tracée
  // après les plantations pour ne pas déplacer la forêt existante.
  for (let y = shopDoor.y + 1; y <= 22; y++) {
    for (let x = shopDoor.x - 1; x <= shopDoor.x + 1; x++) set(x, y, T.PATH);
  }
  // Petit parvis élargi devant le comptoir : deux tuiles de recul pour
  // s'arrêter devant le colporteur sans se sentir coincé contre le mur.
  for (let y = shopDoor.y + 1; y <= shopDoor.y + 3; y++) {
    for (let x = shopDoor.x - 2; x <= shopDoor.x + 2; x++) set(x, y, T.PATH);
  }

  return {
    w,
    h,
    tiles,
    spawn: { x: 30.5, y: 24.5 },
    // Position du portail, sur la place au bout du chemin nord.
    portal: { ...PORTAL },
    // Échoppe du colporteur : sa porte, son comptoir et le seuil où l'on
    // s'arrête pour vendre.
    shop: {
      ...SHOP,
      door: shopDoor,
      stand: { x: shopDoor.x + 0.5, y: shopDoor.y + 1.6 }
    },
    // Portes des maisons, renseignées par generateWorld pour que les deux
    // côtés (client et serveur) connaissent les mêmes coordonnées.
    doors,
    // Emprise et style de chaque maison : le rendu s'en sert pour distinguer
    // les trois façades et pour retrouver l'ambiance de leur intérieur.
    houses: buildings
  };
}

export function tileAt(world, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= world.w || ty >= world.h) return T.TREE;
  return world.tiles[ty * world.w + tx];
}

export function isSolid(world, tx, ty) {
  return SOLID_TILES.has(tileAt(world, tx, ty));
}
