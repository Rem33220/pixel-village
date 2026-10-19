// Sprites des personnages : du pixel art dessiné en "ASCII" puis peint dans des
// petits canvas. Aucune image à télécharger, et on peut modifier le personnage
// en éditant simplement les lignes ci-dessous (12 x 16 pixels).
//
// Cycle de marche : 4 poses (contact gauche, passage, contact droit, passage).
// Le corps fait 12 lignes, les jambes 4 lignes ; le rendu applique un rebond
// d'un pixel sur les poses de passage pour donner du poids au pas.

const BASE_PALETTE = {
  k: '#1b1424',
  s: '#f3c9a2',
  S: '#d79b74',
  e: '#241a2b',
  h: '#5b3a2a',
  H: '#422a1e',
  p: '#39436e',
  o: '#241d2c',
  w: '#f7f2e6'
};

const DOWN_BASE = [
  '...hhhhhh...',
  '..hhhhhhhh..',
  '..hhhhhhhh..',
  '..hssssssh..',
  '..hseSSesh..',
  '..hssssssh..',
  '...ssssss...',
  '..bbbbbbbb..',
  '.sbbbbbbbbs.',
  '.sbbbbbbbbs.',
  '..bbbbbbbb..',
  '..bbBBbbbb..'
];

const UP_BASE = [
  '...hhhhhh...',
  '..hhhhhhhh..',
  '..hhhhhhhh..',
  '..hhhhhhhh..',
  '..hhhhhhhh..',
  '..hhhhhhhh..',
  '...ssssss...',
  '..bbbbbbbb..',
  '.sbbbbbbbbs.',
  '.sbbbbbbbbs.',
  '..bbbbbbbb..',
  '..bbBBbbbb..'
];

const SIDE_BASE = [
  '....hhhh....',
  '...hhhhhh...',
  '...hhhhhh...',
  '...hssss....',
  '...hssses...',
  '...hssss....',
  '....ssss....',
  '...bbbbbb...',
  '..sbbbbbb...',
  '..sbbbbbb...',
  '...bbbbbb...',
  '...bBBbb....'
];

// --- Jambes, vue de face (down) et de dos (up) ------------------------------

// Pose 0 : jambe gauche posée, jambe droite levée.
const DOWN_LEGS_0 = [
  '..pppppppp..',
  '..pppppppp..',
  '..pppp.ppp..',
  '..ooo..oo...'
];

// Pose 1 : passage, jambes resserrées mais toujours distinctes.
const DOWN_LEGS_1 = [
  '..pppppppp..',
  '...pppppp...',
  '...pp.ppp...',
  '...oo.ooo...'
];

// Pose 2 : jambe droite posée, jambe gauche levée.
const DOWN_LEGS_2 = [
  '..pppppppp..',
  '..pppppppp..',
  '..ppp.pppp..',
  '...oo..ooo..'
];

// Pose 3 : second passage, identique à la pose 1 (marche symétrique).
const DOWN_LEGS_3 = [
  '..pppppppp..',
  '...pppppp...',
  '...pp.ppp...',
  '...oo.ooo...'
];

// --- Jambes, vue de profil ------------------------------------------------

// Pose 0 : grande foulée, pied avant à droite.
const SIDE_LEGS_0 = [
  '...pppppp...',
  '..pppppppp..',
  '..ppp..ppp..',
  '.ooo....ooo.'
];

// Pose 1 : passage, jambes serrées sous le corps.
const SIDE_LEGS_1 = [
  '...pppppp...',
  '...pppppp...',
  '....pppp....',
  '....oooo....'
];

// Pose 2 : foulée inverse, pieds plus proches.
const SIDE_LEGS_2 = [
  '...pppppp...',
  '..pppppppp..',
  '..ppp..ppp..',
  '..ooo..ooo..'
];

// Pose 3 : second passage, identique à la pose 1.
const SIDE_LEGS_3 = [
  '...pppppp...',
  '...pppppp...',
  '....pppp....',
  '....oooo....'
];

const LEGS = {
  down: [DOWN_LEGS_0, DOWN_LEGS_1, DOWN_LEGS_2, DOWN_LEGS_3],
  up: [DOWN_LEGS_0, DOWN_LEGS_1, DOWN_LEGS_2, DOWN_LEGS_3],
  side: [SIDE_LEGS_0, SIDE_LEGS_1, SIDE_LEGS_2, SIDE_LEGS_3]
};

const FRAME_COUNT = 4;

const cache = new Map();

function canvas(width, height) {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return c;
}

function paint(ctx, rows, palette) {
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const color = palette[row[x]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

function shade(hex, amount) {
  const value = parseInt(hex.slice(1), 16);
  const clamp = (n) => Math.max(0, Math.min(255, n));
  const r = clamp(((value >> 16) & 255) + amount);
  const g = clamp(((value >> 8) & 255) + amount);
  const b = clamp((value & 255) + amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// `frame` va de 0 à 3 ; toute autre valeur retombe sur la pose de repos.
export function getPlayerSprite(color, direction, frame) {
  const dir = direction === 'left' || direction === 'right' ? 'side' : direction;
  const step = Number.isInteger(frame) ? ((frame % FRAME_COUNT) + FRAME_COUNT) % FRAME_COUNT : 0;
  const flip = direction === 'left' ? 'l' : 'r';
  const key = `${color}|${dir}|${step}|${flip}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const palette = {
    ...BASE_PALETTE,
    b: color,
    B: shade(color, -42)
  };
  const base = dir === 'up' ? UP_BASE : dir === 'side' ? SIDE_BASE : DOWN_BASE;
  const legs = LEGS[dir][step];

  const sprite = canvas(12, 16);
  paint(sprite.getContext('2d'), [...base, ...legs], palette);

  if (direction === 'left') {
    const flipped = canvas(12, 16);
    const ctx = flipped.getContext('2d');
    ctx.translate(12, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(sprite, 0, 0);
    cache.set(key, flipped);
    return flipped;
  }

  cache.set(key, sprite);
  return sprite;
}
