// Armes tenues en main : chaque arme est peinte dans un petit canvas (pixel
// art, aucun fichier image), puis dessinée à la main du personnage avec une
// rotation. Le geste de frappe vient de `swingAngle` (dungeons.js) : il est
// commun à toutes les armes, seule la silhouette change.
//
// Repère du sprite : la poignée est au point (6, 16), la lame monte vers le
// haut. On translate donc le canvas sur la main, on tourne, puis on recopie le
// sprite décalé de -poignée.

import { LOOT, SPIN_TIME, SWING_TIME, swingAngle } from './dungeons.js';

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

// Chaque arme a son geste : une dague pique droit devant, une épée fend l'air
// en grand arc, une hache retombe du haut, un marteau écrase, une lance perce
// de loin, un sceptre fait tourner son orbe. `kind` choisit la trajectoire,
// `reach` la taille de la traînée, `spark` la couleur de l'éclat laissé dans
// l'air et les options (double, heavy, mist…) la marque propre à l'arme.
const MOTIONS = {
  dague: { kind: 'stab', reach: 9, spark: '#fff4d8' },
  coutelas: { kind: 'stab', reach: 10, spark: '#ffe9a8', double: true },
  epee_courte: { kind: 'slash', reach: 12, spark: '#fff4d8' },
  lame_veilleur: { kind: 'slash', reach: 13, spark: '#b9d7e8' },
  epee_gardien: { kind: 'slash', reach: 14, spark: '#f6d34d' },
  epee_neant: { kind: 'slash', reach: 14, spark: '#ff8fb0' },
  epee_orage: { kind: 'slash', reach: 15, spark: '#f6d34d', bolts: true },
  epee_cendres: { kind: 'slash', reach: 15, spark: '#ffb27a', embers: true },
  lame_brumes: { kind: 'slash', reach: 14, spark: '#8ff0f7', mist: true },
  lame_givre: { kind: 'slash', reach: 13, spark: '#aee8ff', shards: true },
  lame_ombre: { kind: 'flurry', reach: 14, spark: '#c78bff' },
  lame_abysses: { kind: 'flurry', reach: 14, spark: '#5fd0ff', drops: true },
  lame_neant: { kind: 'flurry', reach: 15, spark: '#ff5f7a' },
  fauchon_neant: { kind: 'flurry', reach: 16, spark: '#ff5f7a' },
  hache: { kind: 'chop', reach: 12, spark: '#e8d6a4' },
  marteau_cendres: { kind: 'chop', reach: 13, spark: '#ff9a5c', heavy: true },
  fleau_cendres: { kind: 'chop', reach: 14, spark: '#ff6a3c', chain: true },
  harpon_abysses: { kind: 'sweep', reach: 16, spark: '#3fa8c9' },
  trident_abysses: { kind: 'sweep', reach: 17, spark: '#7fd6ff', triple: true },
  lance_ombres: { kind: 'sweep', reach: 18, spark: '#b48cff' },
  sceptre_neant: { kind: 'cast', reach: 10, spark: '#ff5f7a' }
};

// Repli pour une arme ajoutée plus tard : son dessin décide de son geste.
const MOTION_BY_ART = {
  dague: { kind: 'stab', reach: 9, spark: '#fff4d8' },
  epee: { kind: 'slash', reach: 13, spark: '#fff4d8' },
  lame: { kind: 'slash', reach: 14, spark: '#eaf6ff' },
  hache: { kind: 'chop', reach: 12, spark: '#e8d6a4' }
};

const DEFAULT_MOTION = { kind: 'slash', reach: 12, spark: '#fff4d8' };

// Angle ajouté au repos pour frapper droit devant, selon le regard.
const THRUST = { up: -10, down: 46, right: 32, left: 32 };

function motionFor(itemId, item) {
  return MOTIONS[itemId] ?? MOTION_BY_ART[item?.art] ?? DEFAULT_MOTION;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

const easeOut = (t) => 1 - (1 - t) * (1 - t);
const easeIn = (t) => t * t;

// 0 → 1 → 0 sur une fenêtre du geste : sert aux coups d'estoc, qui partent et
// reviennent sans s'arrêter.
function pulse(progress, start, peak, end) {
  if (progress <= start || progress >= end) return 0;
  if (progress < peak) return easeOut(clamp01((progress - start) / (peak - start)));
  return 1 - easeIn(clamp01((progress - peak) / (end - peak)));
}

// Pose de l'arme à un instant du geste : décalage d'angle, déplacement de la
// main, échelle et intensité (`power`) pour la traînée.
function weaponPose(motion, progress, dir) {
  switch (motion.kind) {
    case 'stab': {
      // Le coutelas pique deux fois dans le même geste.
      const out = motion.double
        ? Math.max(pulse(progress, 0.02, 0.3, 0.52), pulse(progress, 0.5, 0.72, 0.97))
        : pulse(progress, 0.04, 0.42, 0.92);
      return {
        angle: (THRUST[dir] ?? THRUST.down) * out,
        ox: out * motion.reach * 0.45,
        oy: -out * 0.6,
        scale: 1 + out * 0.06,
        power: out
      };
    }
    case 'chop': {
      // Armé au-dessus de la tête, puis retombée sèche et petit rebond.
      const raise = clamp01(progress / 0.32);
      const fall = clamp01((progress - 0.32) / 0.34);
      const settle = clamp01((progress - 0.66) / 0.34);
      const down = easeIn(fall);
      return {
        angle: -78 * easeOut(raise) + 96 * down - 18 * settle,
        ox: 0,
        oy: -4 * easeOut(raise) + 4 * down,
        scale: 1,
        power: down
      };
    }
    case 'sweep': {
      // Estoc long et horizontal, comme une lance.
      const out = progress < 0.34
        ? easeOut(progress / 0.34)
        : 1 - easeIn(clamp01((progress - 0.34) / 0.66));
      return {
        angle: (THRUST[dir] ?? THRUST.down) * out * 0.55,
        ox: out * motion.reach * 0.5,
        oy: -out * 0.8,
        scale: 1,
        power: out
      };
    }
    case 'cast': {
      // Le sceptre se lève et son orbe décrit un petit cercle.
      const lift = Math.sin(clamp01(progress / 0.8) * Math.PI);
      return {
        angle: -26 * lift + Math.sin(progress * Math.PI * 4) * 8,
        ox: 0,
        oy: -lift * 5,
        scale: 1,
        power: lift
      };
    }
    case 'flurry': {
      // Deux passes rapides enchaînées dans le même geste.
      const t = (progress * 2) % 1;
      return {
        angle: -84 + 226 * easeOut(t),
        ox: 0,
        oy: 0,
        scale: 1,
        power: 1 - Math.abs(t - 0.5) * 0.8
      };
    }
    default:
      return { angle: swingAngle(progress), ox: 0, oy: 0, scale: 1, power: 1 };
  }
}

function canvasAngle(degrees) {
  return ((degrees - 90) * Math.PI) / 180;
}

// Petit éclat au bout de l'arme, là où le coup porte.
function tipSpark(ctx, x, y, angleDeg, radius, color, alpha) {
  const rad = canvasAngle(angleDeg);
  const tx = Math.round(x + Math.cos(rad) * radius);
  const ty = Math.round(y + Math.sin(rad) * radius);
  ctx.fillStyle = rgba('#fffdf2', Math.min(1, alpha + 0.2));
  ctx.fillRect(tx - 1, ty - 1, 2, 2);
  ctx.fillStyle = rgba(color, alpha * 0.7);
  ctx.fillRect(tx - 2, ty, 1, 1);
  ctx.fillRect(tx + 1, ty, 1, 1);
}

// Poussière soulevée par un coup lourd, au sol.
function impactDust(ctx, x, y, mirror, color, power) {
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = rgba(color, 0.32 * power);
  for (let i = 0; i < 5; i++) {
    const dx = mirror * (4 + i * 2.4);
    const dy = 3 + ((i * 7) % 3);
    ctx.fillRect(Math.round(x + dx), Math.round(y + dy), 2, 1);
  }
}

// Traînée laissée par le geste. Chaque famille d'arme a sa marque : arc de
// taille, éclair d'estoc, sillage vertical du coup lourd, lignes d'air de la
// lance, anneau du sceptre.
function drawTrail(ctx, x, y, mirror, rest, motion, dir, progress, pose) {
  const spark = motion.spark ?? '#fff4d8';
  const reach = motion.reach;
  const now = mirror * (rest + pose.angle);
  const past = mirror * (rest + weaponPose(motion, Math.max(0, progress - 0.16), dir).angle);
  const power = pose.power ?? 0;
  if (power <= 0.04) return;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  if (motion.kind === 'slash' || motion.kind === 'flurry') {
    const alpha = Math.max(0, Math.min(0.9, (1.05 - Math.abs(progress - 0.55) * 2) * power));
    if (alpha > 0.05) {
      ctx.strokeStyle = rgba('#fff9e2', alpha);
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(x, y, reach, canvasAngle(past), canvasAngle(now), now < past);
      ctx.stroke();
      ctx.strokeStyle = rgba(spark, alpha * 0.75);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, reach + 1.5, canvasAngle(past), canvasAngle(now), now < past);
      ctx.stroke();
      if (progress > 0.26 && progress < 0.82) tipSpark(ctx, x, y, now, reach, spark, alpha);
    }
  } else if (motion.kind === 'stab') {
    const rad = canvasAngle(now);
    ctx.strokeStyle = rgba('#fffbe8', power * 0.65);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(rad) * reach * 0.25, y + Math.sin(rad) * reach * 0.25);
    ctx.lineTo(x + Math.cos(rad) * reach * 0.9, y + Math.sin(rad) * reach * 0.9);
    ctx.stroke();
    tipSpark(ctx, x, y, now, reach * 0.95, spark, power);
  } else if (motion.kind === 'chop') {
    const alpha = Math.max(0, Math.min(0.9, power * (1 - Math.abs(progress - 0.55) * 1.6)));
    if (alpha > 0.05) {
      ctx.strokeStyle = rgba('#fff2d0', alpha);
      ctx.lineWidth = motion.heavy ? 3.4 : 2.4;
      ctx.beginPath();
      ctx.arc(x, y - 1, reach, canvasAngle(past), canvasAngle(now), now < past);
      ctx.stroke();
      ctx.strokeStyle = rgba(spark, alpha * 0.6);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y - 1, reach - 1.5, canvasAngle(past), canvasAngle(now), now < past);
      ctx.stroke();
    }
    if (progress > 0.5) impactDust(ctx, x, y, mirror, spark, power);
  } else if (motion.kind === 'sweep') {
    const rad = canvasAngle(now);
    const dx = Math.cos(rad);
    const dy = Math.sin(rad);
    const lines = motion.triple ? 3 : 2;
    ctx.strokeStyle = rgba(spark, power * 0.55);
    ctx.lineWidth = 1;
    for (let i = 0; i < lines; i++) {
      const off = (i - (lines - 1) / 2) * 2.6;
      ctx.beginPath();
      ctx.moveTo(x + dx * 5 - dy * off, y + dy * 5 + dx * off);
      ctx.lineTo(x + dx * reach * 0.95 - dy * off, y + dy * reach * 0.95 + dx * off);
      ctx.stroke();
    }
    tipSpark(ctx, x, y, now, reach * 0.95, spark, power);
  } else if (motion.kind === 'cast') {
    const rad = canvasAngle(now);
    const tipX = x + Math.cos(rad) * reach * 0.8;
    const tipY = y + Math.sin(rad) * reach * 0.8;
    ctx.strokeStyle = rgba(spark, power * 0.7);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(tipX, tipY, 3 + power * 4, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const a = progress * 9 + (i * Math.PI) / 2;
      ctx.fillStyle = rgba(spark, power * 0.8);
      ctx.fillRect(
        Math.round(tipX + Math.cos(a) * (4 + i)),
        Math.round(tipY + Math.sin(a) * (4 + i)),
        1,
        1
      );
    }
  }

  // Marques propres à certaines armes, autour de la pointe.
  const rad = canvasAngle(now);
  const tipX = x + Math.cos(rad) * reach * 0.85;
  const tipY = y + Math.sin(rad) * reach * 0.85;
  if (motion.mist) {
    for (let i = 0; i < 3; i++) {
      const a = progress * 6 + i * 2.1;
      ctx.fillStyle = rgba(spark, 0.22 * power);
      ctx.beginPath();
      ctx.arc(tipX + Math.cos(a) * 3, tipY + Math.sin(a) * 3, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (motion.shards) {
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = rgba(spark, 0.7 * power);
      ctx.fillRect(Math.round(tipX - 3 + i * 3), Math.round(tipY - 2 - (i % 2) * 3), 1, 2);
    }
  } else if (motion.embers || motion.drops) {
    for (let i = 0; i < 4; i++) {
      const a = i * 1.9 + progress * 3;
      ctx.fillStyle = rgba(spark, 0.55 * power);
      ctx.fillRect(Math.round(tipX + Math.cos(a) * 4), Math.round(tipY + Math.sin(a) * 4), 1, 1);
    }
  } else if (motion.bolts) {
    ctx.fillStyle = rgba(spark, 0.8 * power);
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(Math.round(tipX + (i % 2 ? 2 : -1)), Math.round(tipY - 4 + i * 2), 1, 2);
    }
  } else if (motion.chain) {
    ctx.fillStyle = rgba('#c9b183', 0.7 * power);
    for (let i = 0; i < 3; i++) {
      const a = canvasAngle(past + (now - past) * (i / 3));
      ctx.fillRect(Math.round(x + Math.cos(a) * (reach - 3)), Math.round(y + Math.sin(a) * (reach - 3)), 1, 1);
    }
  }

  ctx.restore();
}

// Halo coloré autour d'une arme enchantée.
function weaponGlow(ctx, color) {
  const glow = ctx.createRadialGradient(0, -9, 0, 0, -9, 11);
  glow.addColorStop(0, rgba(color, 0.45));
  glow.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, -9, 11, 0, Math.PI * 2);
  ctx.fill();
}

// Dessine l'arme tenue en main. `swing` est le temps restant du geste (comme
// `run.swing`) : 0 au repos. `spin` est le temps restant du tourbillon : l'arme
// décrit alors un cercle complet autour du personnage. Sans arme, un poing
// n'apparaît que pendant la frappe.
export function drawHeldWeapon(ctx, options) {
  const {
    itemId = null, px = 0, py = 0, bob = 0, dir = 'down',
    swing = 0, spin = 0
  } = options;
  const item = itemId ? LOOT[itemId] : null;
  const remaining = Math.max(0, Math.min(SWING_TIME, Number(swing) || 0));
  const spinLeft = Math.max(0, Math.min(SPIN_TIME, Number(spin) || 0));
  if (!item && remaining <= 0 && spinLeft <= 0) return;

  const hand = HAND[dir] ?? HAND.down;

  // Tourbillon : l'arme tourne en ellipse autour du corps, pour suivre la
  // perspective du sol.
  if (spinLeft > 0) {
    const t = 1 - spinLeft / SPIN_TIME;
    const theta = -Math.PI / 2 + t * Math.PI * 3;
    const x = Math.round(px + Math.cos(theta) * 8);
    const y = Math.round(py - 6 + Math.sin(theta) * 3 + bob);
    const angle = (theta * 180) / Math.PI + 90;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((angle * Math.PI) / 180);
    if (item) {
      if (item.glow) weaponGlow(ctx, item.color);
      ctx.drawImage(getWeaponSprite(itemId), -GRIP_X, -GRIP_Y);
    } else {
      ctx.drawImage(fistSprite(), -3, -3);
    }
    ctx.restore();
    return;
  }

  const motion = motionFor(itemId, item);
  const progress = remaining > 0 ? 1 - remaining / SWING_TIME : 0;
  const mirror = dir === 'left' ? -1 : 1;
  const rest = REST_ANGLE[dir] ?? REST_ANGLE.down;
  const pose = remaining > 0
    ? weaponPose(motion, progress, dir)
    : { angle: 0, ox: 0, oy: 0, scale: 1, power: 0 };

  const x = Math.round(px + hand.x + mirror * pose.ox);
  const y = Math.round(py + hand.y + bob + pose.oy);

  // La traînée passe derrière l'arme : la lame reste lisible.
  if (remaining > 0 && pose.power > 0.02) {
    drawTrail(ctx, x, y, mirror, rest, motion, dir, progress, pose);
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((mirror * (rest + pose.angle) * Math.PI) / 180);
  ctx.scale(pose.scale ?? 1, pose.scale ?? 1);
  if (item) {
    if (item.glow) weaponGlow(ctx, item.color);
    ctx.drawImage(getWeaponSprite(itemId), -GRIP_X, -GRIP_Y);
  } else {
    ctx.drawImage(fistSprite(), -3, -3);
  }
  ctx.restore();
}
