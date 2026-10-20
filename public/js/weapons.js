// Armes tenues en main : chaque arme est peinte dans un petit canvas (pixel
// art, aucun fichier image), puis dessinée à la main du personnage avec une
// rotation. Le geste de frappe vient de `swingAngle` (dungeons.js) : il est
// commun à toutes les armes, seule la silhouette change.
//
// Repère du sprite : la poignée est au point (6, 16), la lame monte vers le
// haut. On translate donc le canvas sur la main, on tourne, puis on recopie le
// sprite décalé de -poignée.

import { LOOT, SWING_TIME, swingAngle } from './dungeons.js';

// Position de la main dans le sprite 12 × 16 (voir sprites.js), relative au
// point de contact des pieds (px, py).
const HAND = {
  down: { x: 4, y: -7 },
  up: { x: 4, y: -8 },
  right: { x: 5, y: -8 },
  left: { x: -5, y: -8 }
};

// Angle de repos en degrés (0 = lame vers le haut, positif = horaire).
const REST_ANGLE = { down: 26, up: 18, right: 58, left: 58 };

const GRIP_X = 6;
const GRIP_Y = 16;

const weaponCache = new Map();
let fist = null;

function canvas(width, height) {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return c;
}

function shade(hex, amount) {
  const value = parseInt(hex.slice(1), 16);
  const clamp = (n) => Math.max(0, Math.min(255, n));
  const r = clamp(((value >> 16) & 255) + amount);
  const g = clamp(((value >> 8) & 255) + amount);
  const b = clamp((value & 255) + amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function rgba(hex, alpha) {
  const value = parseInt(hex.slice(1), 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

// --- Silhouettes ------------------------------------------------------------

function paintWeapon(art, color) {
  const sprite = canvas(13, 20);
  const ctx = sprite.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const light = shade(color, 55);
  const dark = shade(color, -60);
  const gold = '#d8a63c';
  const goldDark = '#a87a24';
  const wood = '#6b4a2f';
  const woodDark = '#432b1b';

  // Lame à deux pixels : bord clair à gauche, métal à droite, pointe en haut.
  const blade = (top, bottom) => {
    rect(ctx, 5, top - 1, 2, 1, light);
    rect(ctx, 5, top, 2, bottom - top + 1, color);
    rect(ctx, 5, top, 1, bottom - top + 1, light);
    rect(ctx, 6, top, 1, bottom - top, dark);
  };

  const guard = () => {
    rect(ctx, 4, 12, 5, 2, gold);
    rect(ctx, 4, 13, 5, 1, goldDark);
  };

  const grip = () => {
    rect(ctx, 5, 14, 2, 4, wood);
    rect(ctx, 5, 15, 2, 1, woodDark);
    rect(ctx, 6, 16, 1, 1, woodDark);
  };

  const pommel = () => {
    rect(ctx, 5, 18, 3, 2, gold);
    rect(ctx, 5, 19, 3, 1, goldDark);
  };

  if (art === 'hache') {
    rect(ctx, 5, 2, 2, 17, wood);
    rect(ctx, 5, 2, 1, 17, shade(wood, 32));
    rect(ctx, 1, 3, 4, 7, color);
    rect(ctx, 0, 4, 1, 5, light);
    rect(ctx, 4, 3, 2, 7, dark);
    rect(ctx, 1, 2, 4, 1, light);
    rect(ctx, 2, 10, 3, 1, dark);
    rect(ctx, 3, 11, 2, 2, gold);
    rect(ctx, 3, 18, 2, 2, goldDark);
  } else if (art === 'dague') {
    blade(8, 11);
    guard();
    grip();
    pommel();
  } else if (art === 'lame') {
    // Lame longue et fine des donjons profonds.
    blade(2, 11);
    rect(ctx, 5, 5, 1, 6, '#f7f2e6');
    guard();
    grip();
    pommel();
    rect(ctx, 4, 12, 1, 1, '#f7f2e6');
    rect(ctx, 8, 12, 1, 1, '#f7f2e6');
  } else {
    blade(5, 11);
    guard();
    grip();
    pommel();
  }

  return sprite;
}

export function getWeaponSprite(itemId) {
  const item = LOOT[itemId];
  if (!item) return null;
  const art = item.art ?? 'epee';
  const key = `${art}|${item.color}`;
  let sprite = weaponCache.get(key);
  if (!sprite) {
    sprite = paintWeapon(art, item.color);
    weaponCache.set(key, sprite);
  }
  return sprite;
}

function fistSprite() {
  if (fist) return fist;
  fist = canvas(7, 7);
  const ctx = fist.getContext('2d');
  rect(ctx, 1, 1, 5, 5, '#f3c9a2');
  rect(ctx, 1, 1, 5, 1, '#ffe0bf');
  rect(ctx, 1, 5, 5, 1, '#d79b74');
  rect(ctx, 2, 2, 1, 1, '#d79b74');
  rect(ctx, 4, 2, 1, 1, '#d79b74');
  return fist;
}

// --- Geste de frappe --------------------------------------------------------

function canvasAngle(degrees) {
  return ((degrees - 90) * Math.PI) / 180;
}

// Traînée du coup : un arc clair qui suit la lame, plus un éclat à la pointe au
// moment de l'impact. Dessiné avant l'arme pour rester derrière elle.
function drawTrail(ctx, x, y, mirror, rest, progress) {
  if (progress < 0.2 || progress > 0.9) return;
  const alpha = Math.max(0, Math.min(0.85, 0.95 * (1 - Math.abs(progress - 0.55) / 0.5)));

  const from = mirror * (rest + swingAngle(Math.max(0, progress - 0.18)));
  const to = mirror * (rest + swingAngle(progress));

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = `rgba(255, 249, 226, ${alpha.toFixed(3)})`;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(x, y, 10, canvasAngle(from), canvasAngle(to), to < from);
  ctx.stroke();

  if (progress > 0.3 && progress < 0.75) {
    const tip = canvasAngle(to);
    const tx = Math.round(x + Math.cos(tip) * 10);
    const ty = Math.round(y + Math.sin(tip) * 10);
    ctx.fillStyle = `rgba(255, 252, 235, ${Math.min(1, alpha + 0.25).toFixed(3)})`;
    ctx.fillRect(tx - 1, ty - 1, 2, 2);
  }
  ctx.restore();
}

// Dessine l'arme tenue en main. `swing` est le temps restant du geste (comme
// `run.swing`) : 0 au repos. Sans arme, un poing n'apparaît que pendant la
// frappe.
export function drawHeldWeapon(ctx, options) {
  const { itemId = null, px = 0, py = 0, bob = 0, dir = 'down', swing = 0 } = options;
  const item = itemId ? LOOT[itemId] : null;
  const remaining = Math.max(0, Math.min(SWING_TIME, Number(swing) || 0));
  if (!item && remaining <= 0) return;

  const hand = HAND[dir] ?? HAND.down;
  const x = Math.round(px + hand.x);
  const y = Math.round(py + hand.y + bob);

  const progress = remaining > 0 ? 1 - remaining / SWING_TIME : 0;
  const mirror = dir === 'left' ? -1 : 1;
  const rest = REST_ANGLE[dir] ?? REST_ANGLE.down;
  const angle = mirror * (rest + (remaining > 0 ? swingAngle(progress) : 0));

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((angle * Math.PI) / 180);

  if (item) {
    if (item.glow) {
      const glow = ctx.createRadialGradient(0, -9, 0, 0, -9, 11);
      glow.addColorStop(0, rgba(item.color, 0.45));
      glow.addColorStop(1, rgba(item.color, 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, -9, 11, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.drawImage(getWeaponSprite(itemId), -GRIP_X, -GRIP_Y);
  } else {
    ctx.drawImage(fistSprite(), -3, -3);
  }

  ctx.restore();

  // Traînée du coup, par-dessus l'arme pour rester lisible.
  if (remaining > 0) drawTrail(ctx, x, y, mirror, rest, progress);
}
