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
  WINDOW: 11
};

// Tuiles qui bloquent le passage.
export const SOLID_TILES = new Set([
  T.WATER,
  T.TREE,
  T.ROCK,
  T.WALL,
  T.ROOF,
  T.DOOR,
  T.WINDOW
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

  // Lac au nord-est, avec une plage de sable.
  const lakeX = 46;
  const lakeY = 13;
  const lakeRX = 9;
  const lakeRY = 5;
  for (let y = lakeY - lakeRY - 2; y <= lakeY + lakeRY + 2; y++) {
    for (let x = lakeX - lakeRX - 2; x <= lakeX + lakeRX + 2; x++) {
      const d = ((x - lakeX) / lakeRX) ** 2 + ((y - lakeY) / lakeRY) ** 2;
      if (d <= 1) set(x, y, T.WATER);
      else if (d <= 1.45) set(x, y, T.SAND);
    }
  }

  // Chemins : une grand-rue horizontale et une rue verticale qui se croisent.
  for (let x = 6; x <= 58; x++) {
    set(x, 21, T.PATH);
    set(x, 22, T.PATH);
  }
  for (let y = 8; y <= 36; y++) {
    set(29, y, T.PATH);
    set(30, y, T.PATH);
  }

  // Maisons du village.
  const house = (hx, hy, hw, hh) => {
    for (let y = 0; y < hh; y++) {
      for (let x = 0; x < hw; x++) {
        set(hx + x, hy + y, y < 2 ? T.ROOF : T.WALL);
      }
    }
    set(hx + Math.floor(hw / 2), hy + hh - 1, T.DOOR);
    if (hw >= 5) {
      set(hx + 1, hy + hh - 2, T.WINDOW);
      set(hx + hw - 2, hy + hh - 2, T.WINDOW);
    }
  };

  house(9, 12, 6, 4);
  house(19, 27, 6, 4);
  house(39, 26, 7, 5);

  // Zone de départ dégagée.
  for (let y = 23; y <= 27; y++) {
    for (let x = 28; x <= 33; x++) {
      const tile = get(x, y);
      if (tile === T.TREE || tile === T.ROCK) set(x, y, T.GRASS);
    }
  }

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
    if (nearBuilding(x, y)) continue;
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
    set(x, y, rand() < 0.65 ? T.FLOWER : T.ROCK);
  }

  return {
    w,
    h,
    tiles,
    spawn: { x: 30.5, y: 24.5 }
  };
}

export function tileAt(world, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= world.w || ty >= world.h) return T.TREE;
  return world.tiles[ty * world.w + tx];
}

export function isSolid(world, tx, ty) {
  return SOLID_TILES.has(tileAt(world, tx, ty));
}
