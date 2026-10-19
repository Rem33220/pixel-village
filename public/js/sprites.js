// Sprites des personnages : du pixel art dessiné en "ASCII" puis peint dans des
// petits canvas. Aucune image à télécharger, et on peut modifier le personnage
// en éditant simplement les lignes ci-dessous (12 x 16 pixels).

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

const DOWN_LEGS_A = [
  '..pppppppp..',
  '..ppp..ppp..',
  '..ppp..ppp..',
  '..ooo..ooo..'
];

const DOWN_LEGS_B = [
  '..pppppppp..',
  '..p.pppp.p..',
  '..p.pppp.p..',
  '..o.oooo.o..'
];

const SIDE_LEGS_A = [
  '...pppppp...',
  '...ppp.ppp..',
  '...ppp.ppp..',
  '...ooo.ooo..'
];

const SIDE_LEGS_B = [
  '...pppppp...',
  '....ppp.pp..',
  '....ppp.pp..',
  '....ooo.oo..'
];

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

export function getPlayerSprite(color, direction, frame) {
  const dir = direction === 'left' || direction === 'right' ? 'side' : direction;
  const key = `${color}|${dir}|${frame}|${direction === 'left' ? 'l' : 'r'}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const palette = {
    ...BASE_PALETTE,
    b: color,
    B: shade(color, -42)
  };
  const base = dir === 'up' ? UP_BASE : dir === 'side' ? SIDE_BASE : DOWN_BASE;
  const legs = dir === 'side'
    ? frame ? SIDE_LEGS_B : SIDE_LEGS_A
    : frame ? DOWN_LEGS_B : DOWN_LEGS_A;

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
