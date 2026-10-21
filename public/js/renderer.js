// Rendu du monde en pixel art sur un canvas 2D.
// La carte complète est pré-dessinée une fois dans un canvas hors écran, puis
// simplement recopiée avec la caméra : c'est rapide et ça reste net.

import { TILE_SIZE, T } from './map.js';
import { DECORS, DEFAULT_DECOR } from './decor.js';
import { getPlayerSprite } from './sprites.js';
import { drawHeldWeapon } from './weapons.js';

function tileRand(tx, ty, salt) {
  let h = (Math.imul(tx, 374761393) + Math.imul(ty, 668265263) + Math.imul(salt, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function drawGrass(ctx, px, py, tx, ty, dark) {
  ctx.fillStyle = dark ? '#5aa85c' : '#66b862';
  ctx.fillRect(px, py, 16, 16);
  ctx.fillStyle = dark ? '#4f9a53' : '#5cab5b';
  for (let i = 0; i < 3; i++) {
    const x = px + 1 + Math.floor(tileRand(tx, ty, i) * 13);
    const y = py + 1 + Math.floor(tileRand(tx, ty, i + 3) * 13);
    ctx.fillRect(x, y, 2, 1);
  }
  if (tileRand(tx, ty, 7) > 0.86) {
    ctx.fillStyle = dark ? '#54a057' : '#60af5e';
    ctx.fillRect(px + 3, py + 12, 1, 3);
    ctx.fillRect(px + 11, py + 4, 1, 3);
  }
}

function drawTree(ctx, px, py, tx, ty) {
  drawGrass(ctx, px, py, tx, ty, true);
  ctx.fillStyle = '#6b4a2f';
  ctx.fillRect(px + 7, py + 10, 3, 5);
  ctx.fillStyle = '#2c7a42';
  ctx.fillRect(px + 2, py + 1, 12, 10);
  ctx.fillRect(px, py + 4, 16, 5);
  ctx.fillStyle = '#3a9451';
  ctx.fillRect(px + 3, py + 2, 6, 4);
  ctx.fillRect(px + 10, py + 5, 4, 3);
  ctx.fillStyle = '#246637';
  ctx.fillRect(px + 2, py + 9, 11, 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
  ctx.fillRect(px + 1, py + 15, 14, 1);
}

function drawFlower(ctx, px, py, tx, ty) {
  const colors = ['#f4f0e2', '#f2d24b', '#e87a9a', '#b78ae0'];
  const color = colors[Math.floor(tileRand(tx, ty, 11) * colors.length)];
  const fx = px + 4 + Math.floor(tileRand(tx, ty, 12) * 7);
  const fy = py + 4 + Math.floor(tileRand(tx, ty, 13) * 7);
  ctx.fillStyle = '#3f8a44';
  ctx.fillRect(fx, fy + 2, 1, 2);
  ctx.fillStyle = color;
  ctx.fillRect(fx - 1, fy, 3, 1);
  ctx.fillRect(fx, fy - 1, 1, 3);
  ctx.fillStyle = '#f6d34d';
  ctx.fillRect(fx, fy, 1, 1);
}

function drawRock(ctx, px, py) {
  ctx.fillStyle = '#6d747c';
  ctx.fillRect(px + 4, py + 7, 8, 6);
  ctx.fillRect(px + 3, py + 9, 10, 3);
  ctx.fillStyle = '#8b939c';
  ctx.fillRect(px + 5, py + 6, 5, 3);
  ctx.fillStyle = '#565c63';
  ctx.fillRect(px + 7, py + 12, 5, 1);
}

function drawWall(ctx, px, py) {
  ctx.fillStyle = '#d8c3a1';
  ctx.fillRect(px, py, 16, 16);
  ctx.fillStyle = '#bfa987';
  ctx.fillRect(px, py + 5, 16, 1);
  ctx.fillRect(px, py + 11, 16, 1);
  ctx.fillRect(px + 5, py, 1, 5);
  ctx.fillRect(px + 11, py + 6, 1, 5);
  ctx.fillRect(px + 3, py + 12, 1, 4);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
  ctx.fillRect(px, py + 15, 16, 1);
}

function drawWindow(ctx, px, py) {
  ctx.fillStyle = '#8a6b45';
  ctx.fillRect(px + 3, py + 2, 10, 8);
  ctx.fillStyle = '#7fc2e8';
  ctx.fillRect(px + 4, py + 3, 8, 6);
  ctx.fillStyle = '#b9e4f7';
  ctx.fillRect(px + 5, py + 4, 3, 2);
  ctx.fillStyle = '#8a6b45';
  ctx.fillRect(px + 7, py + 3, 1, 6);
}

function drawDoor(ctx, px, py) {
  ctx.fillStyle = '#6f4526';
  ctx.fillRect(px + 4, py + 1, 8, 15);
  ctx.fillStyle = '#8a5a33';
  ctx.fillRect(px + 5, py + 2, 6, 13);
  ctx.fillStyle = '#4a2c18';
  ctx.fillRect(px + 5, py + 5, 6, 1);
  ctx.fillStyle = '#e0b24c';
  ctx.fillRect(px + 9, py + 8, 1, 1);
}

function drawRoof(ctx, px, py, tx, ty) {
  ctx.fillStyle = '#b5564b';
  ctx.fillRect(px, py, 16, 16);
  ctx.fillStyle = '#9c4339';
  ctx.fillRect(px, py + 4, 16, 1);
  ctx.fillRect(px, py + 9, 16, 1);
  ctx.fillRect(px, py + 14, 16, 1);
  ctx.fillStyle = '#c96b5d';
  const offset = (tx + ty) % 2 === 0 ? 2 : 6;
  ctx.fillRect(px + offset, py, 1, 4);
  ctx.fillRect(px + ((offset + 6) % 14), py + 5, 1, 4);
  ctx.fillRect(px + ((offset + 3) % 14), py + 10, 1, 4);
}

// --- Tuiles d'intérieur ----------------------------------------------------

function drawWood(ctx, px, py, tx, ty, dark) {
  ctx.fillStyle = dark ? '#8a6039' : '#96693f';
  ctx.fillRect(px, py, 16, 16);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.13)';
  ctx.fillRect(px, py + 7, 16, 1);
  const joint = (tx * 7 + ty * 3) % 12;
  ctx.fillRect(px + 2 + joint, py + 1, 1, 6);
  ctx.fillRect(px + 2 + ((joint + 5) % 12), py + 9, 1, 6);
  ctx.fillStyle = 'rgba(255, 240, 210, 0.07)';
  ctx.fillRect(px, py, 16, 1);
}

function drawBrick(ctx, px, py, tx, ty) {
  ctx.fillStyle = '#4a4a52';
  ctx.fillRect(px, py, 16, 16);
  ctx.fillStyle = '#3b3b43';
  ctx.fillRect(px, py + 7, 16, 1);
  ctx.fillRect(px, py + 15, 16, 1);
  const offset = ty % 2 === 0 ? 0 : 4;
  ctx.fillRect(px + ((offset + 3) % 16), py, 1, 7);
  ctx.fillRect(px + ((offset + 11) % 16), py + 8, 1, 7);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.fillRect(px + 1, py + 1, 6, 1);
  ctx.fillRect(px + 9, py + 9, 5, 1);
}

function drawRug(ctx, px, py, tx, ty) {
  ctx.fillStyle = '#9c3f3a';
  ctx.fillRect(px, py, 16, 16);
  ctx.fillStyle = '#8b3731';
  ctx.fillRect(px, py, 16, 1);
  ctx.fillRect(px, py + 15, 16, 1);
  ctx.fillStyle = '#c9803f';
  if ((tx + ty) % 2 === 0) {
    ctx.fillRect(px + 6, py + 6, 4, 4);
    ctx.fillStyle = '#e8d6a4';
    ctx.fillRect(px + 7, py + 7, 2, 2);
  } else {
    ctx.fillRect(px + 3, py + 3, 1, 1);
    ctx.fillRect(px + 12, py + 12, 1, 1);
  }
}

function drawTable(ctx, px, py) {
  drawWood(ctx, px, py, 0, 0, true);
  ctx.fillStyle = '#6b4a2f';
  ctx.fillRect(px + 1, py + 3, 14, 9);
  ctx.fillStyle = '#8a6238';
  ctx.fillRect(px + 2, py + 4, 12, 6);
  ctx.fillStyle = '#4a3220';
  ctx.fillRect(px + 3, py + 12, 2, 3);
  ctx.fillRect(px + 11, py + 12, 2, 3);
}

function drawShelf(ctx, px, py) {
  drawWood(ctx, px, py, 0, 0, true);
  ctx.fillStyle = '#4a3220';
  ctx.fillRect(px + 1, py + 1, 14, 14);
  ctx.fillStyle = '#6b4a2f';
  ctx.fillRect(px + 2, py + 2, 12, 5);
  ctx.fillRect(px + 2, py + 9, 12, 5);
  const books = ['#b5564b', '#3b8fd6', '#4fbf6a', '#e0a83c'];
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = books[i];
    ctx.fillRect(px + 3 + i * 3, py + 3, 2, 4);
    ctx.fillStyle = books[(i + 2) % 4];
    ctx.fillRect(px + 3 + i * 3, py + 10, 2, 4);
  }
}

function drawCrate(ctx, px, py) {
  drawWood(ctx, px, py, 0, 0, true);
  ctx.fillStyle = '#8a6238';
  ctx.fillRect(px + 2, py + 3, 12, 11);
  ctx.fillStyle = '#5d4023';
  ctx.fillRect(px + 2, py + 3, 12, 1);
  ctx.fillRect(px + 2, py + 13, 12, 1);
  ctx.fillRect(px + 2, py + 3, 1, 11);
  ctx.fillRect(px + 13, py + 3, 1, 11);
  ctx.beginPath();
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#5d4023';
  ctx.moveTo(px + 3.5, py + 4.5);
  ctx.lineTo(px + 12.5, py + 12.5);
  ctx.moveTo(px + 12.5, py + 4.5);
  ctx.lineTo(px + 3.5, py + 12.5);
  ctx.stroke();
}

// --- Tuiles de donjon ------------------------------------------------------

// Sol d'une salle de donjon. Chaque décor a son propre motif : dalles
// irrégulières de la Crypte, marbre poli de la Galerie, terre battue de
// l'Antre, pierre ruisselante des Abysses, basalte de la Forge, marbre noir
// du Trône. `accent` remplace la tuile de mousse par le motif du décor
// (mousse, rune, racine, flaque, braise ou éclat du néant).
function drawDungeonFloor(ctx, px, py, tx, ty, decor, accent) {
  const f = decor.floor;
  ctx.fillStyle = f.base;
  ctx.fillRect(px, py, 16, 16);

  if (decor.id === 'galerie') {
    // Grandes dalles polies : biseau clair et veine d'écho en diagonale.
    ctx.fillStyle = f.joint;
    ctx.fillRect(px, py + 15, 16, 1);
    ctx.fillRect(px + 15, py, 1, 16);
    ctx.fillStyle = f.hi;
    ctx.fillRect(px, py, 15, 1);
    ctx.fillRect(px, py, 1, 15);
    ctx.fillStyle = f.speck;
    ctx.fillRect(px + 15, py + 15, 1, 1);
    if (tileRand(tx, ty, 6) > 0.55) {
      ctx.strokeStyle = f.vein;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px + 4, py + 13);
      ctx.lineTo(px + 12, py + 4);
      ctx.stroke();
    }
  } else if (decor.id === 'antre') {
    // Terre battue : taches, cailloux et une racine affleurante.
    for (let i = 0; i < 3; i++) {
      const x = px + 1 + Math.floor(tileRand(tx, ty, i + 2) * 13);
      const y = py + 1 + Math.floor(tileRand(tx, ty, i + 7) * 13);
      ctx.fillStyle = i % 2 === 0 ? f.speck : f.hi;
      ctx.fillRect(x, y, 2, 1);
    }
    ctx.fillStyle = f.joint;
    ctx.fillRect(px + Math.floor(tileRand(tx, ty, 12) * 12), py + 9, 3, 1);
  } else if (decor.id === 'abysses') {
    // Dalles noyées : joints sombres et film d'eau qui luit.
    ctx.fillStyle = f.joint;
    ctx.fillRect(px, py + 15, 16, 1);
    ctx.fillRect(px + ((tx * 7 + ty) % 12) + 2, py, 1, 15);
    ctx.fillStyle = f.hi;
    ctx.fillRect(px + 1, py + 3, 8, 1);
    ctx.fillRect(px + 5, py + 11, 7, 1);
    ctx.fillStyle = f.speck;
    ctx.fillRect(px + 10, py + 6, 2, 1);
  } else if (decor.id === 'forge') {
    // Plaques de basalte soudées par la chaleur.
    ctx.fillStyle = f.joint;
    ctx.fillRect(px, py + 15, 16, 1);
    ctx.fillRect(px + 15, py, 1, 16);
    ctx.fillStyle = f.hi;
    ctx.fillRect(px, py, 13, 1);
    ctx.fillRect(px + 2, py + 2, 1, 6);
    if (tileRand(tx, ty, 8) > 0.7) {
      ctx.fillStyle = f.vein;
      ctx.fillRect(px + 4, py + 10, 5, 1);
      ctx.fillRect(px + 9, py + 11, 1, 2);
    }
  } else if (decor.id === 'trone') {
    // Marbre noir poli, veines de vide.
    ctx.fillStyle = f.joint;
    ctx.fillRect(px, py + 15, 16, 1);
    ctx.fillRect(px + 15, py, 1, 16);
    ctx.fillStyle = f.hi;
    ctx.fillRect(px, py, 15, 1);
    ctx.fillRect(px, py, 1, 15);
    ctx.strokeStyle = f.vein;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + 3, py + 12);
    ctx.lineTo(px + 7, py + 8);
    ctx.lineTo(px + 6, py + 5);
    ctx.lineTo(px + 11, py + 2);
    ctx.stroke();
    if (tileRand(tx, ty, 9) > 0.8) {
      ctx.fillStyle = f.vein;
      ctx.fillRect(px + 11, py + 10, 2, 1);
    }
  } else {
    // Crypte : dalles irrégulières, joints décalés pour éviter le damier.
    ctx.fillStyle = f.joint;
    ctx.fillRect(px, py + 7, 16, 1);
    ctx.fillRect(px + ((tx * 5 + ty * 3) % 14), py, 1, 7);
    ctx.fillRect(px + ((tx * 3 + ty * 7) % 14), py + 8, 1, 8);
    ctx.fillStyle = f.hi;
    ctx.fillRect(px + 1, py + 1, 6, 1);
    if (tileRand(tx, ty, 4) > 0.72) {
      ctx.fillStyle = f.speck;
      ctx.fillRect(px + 5, py + 11, 3, 1);
      ctx.fillRect(px + 9, py + 3, 2, 1);
    }
  }

  if (accent) drawDungeonAccent(ctx, px, py, tx, ty, decor);
}

// Motif décoratif posé sur les tuiles `MOSS` : c'est lui qui donne son
// caractère au décor (la Crypte reverdit, la Forge couve, le Trône se constelle).
function drawDungeonAccent(ctx, px, py, tx, ty, decor) {
  const a = decor.accent;

  if (a.kind === 'rune') {
    // Éclat de cristal serti dans la dalle.
    const cx = px + 8;
    const cy = py + 8;
    ctx.fillStyle = a.a;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 5);
    ctx.lineTo(cx + 3, cy);
    ctx.lineTo(cx, cy + 5);
    ctx.lineTo(cx - 3, cy);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = a.b;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 3);
    ctx.lineTo(cx + 1, cy);
    ctx.lineTo(cx, cy + 3);
    ctx.lineTo(cx - 1, cy);
    ctx.closePath();
    ctx.fill();
  } else if (a.kind === 'racine') {
    ctx.strokeStyle = a.a;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + 2, py + 3);
    ctx.lineTo(px + 8, py + 8);
    ctx.lineTo(px + 13, py + 7);
    ctx.lineTo(px + 11, py + 13);
    ctx.stroke();
    ctx.fillStyle = a.b;
    ctx.fillRect(px + 4, py + 10, 2, 1);
    ctx.fillRect(px + 12, py + 4, 1, 2);
  } else if (a.kind === 'flaque') {
    // Flaque d'eau noire, cerclée d'un reflet froid.
    ctx.fillStyle = a.a;
    ctx.beginPath();
    ctx.ellipse(px + 8, py + 9, 6, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = a.b;
    ctx.fillRect(px + 5, py + 7, 4, 1);
    ctx.fillRect(px + 9, py + 10, 2, 1);
    ctx.globalAlpha = 1;
  } else if (a.kind === 'braise') {
    // Fissure incandescente sous la dalle.
    ctx.fillStyle = a.a;
    ctx.fillRect(px + 2, py + 6, 5, 2);
    ctx.fillRect(px + 6, py + 8, 2, 3);
    ctx.fillStyle = a.b;
    ctx.fillRect(px + 3, py + 7, 3, 1);
    ctx.fillRect(px + 10, py + 11, 3, 1);
  } else if (a.kind === 'neant') {
    // Trou de néant piqué d'étoiles violettes.
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = a.a;
    ctx.fillRect(px + 2, py + 3, 12, 10);
    ctx.globalAlpha = 1;
    ctx.fillStyle = a.b;
    ctx.fillRect(px + 5, py + 6, 1, 1);
    ctx.fillRect(px + 9, py + 5, 1, 1);
    ctx.fillRect(px + 7, py + 9, 1, 1);
    ctx.fillRect(px + 11, py + 10, 1, 1);
  } else {
    // Mousse de la Crypte.
    ctx.fillStyle = a.a;
    for (let i = 0; i < 4; i++) {
      const x = px + 1 + Math.floor(tileRand(tx, ty, i + 5) * 13);
      const y = py + 1 + Math.floor(tileRand(tx, ty, i + 9) * 13);
      ctx.fillRect(x, y, 2 + (i % 2), 1);
    }
    ctx.fillStyle = a.b;
    ctx.fillRect(px + 3, py + 12, 2, 1);
  }
}

// Mur d'une salle de donjon : même palette que le sol, motif propre au décor.
function drawDungeonWall(ctx, px, py, tx, ty, decor) {
  const w = decor.wall;

  if (decor.id === 'antre') {
    // Roche brute : cailloux arrondis empilés, sans assises régulières.
    ctx.fillStyle = w.base;
    ctx.fillRect(px, py, 16, 16);
    for (let i = 0; i < 3; i++) {
      const x = px + 3 + Math.floor(tileRand(tx, ty, i + 31) * 9);
      const y = py + 3 + i * 5;
      ctx.fillStyle = i % 2 === 0 ? w.lower : w.joint;
      ctx.beginPath();
      ctx.ellipse(x, y, 4.5, 2.8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = w.hi;
    ctx.fillRect(px + 3, py + 2, 3, 1);
    ctx.fillStyle = w.shadow;
    ctx.fillRect(px, py, 16, 2);
    if (tileRand(tx, ty, 27) > 0.82) {
      ctx.fillStyle = w.trim;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(px + 2, py + 11, 2, 2);
      ctx.globalAlpha = 1;
    }
    return;
  }

  // Assises de pierre communes aux cinq autres décors.
  ctx.fillStyle = w.base;
  ctx.fillRect(px, py, 16, 16);
  ctx.fillStyle = w.lower;
  ctx.fillRect(px, py + 8, 16, 8);
  ctx.fillRect(px, py + 15, 16, 1);
  const offset = ty % 2 === 0 ? 0 : 4;
  ctx.fillStyle = w.joint;
  ctx.fillRect(px + ((offset + 5) % 16), py, 1, 8);
  ctx.fillRect(px + ((offset + 12) % 16), py + 8, 1, 8);
  ctx.fillStyle = w.hi;
  ctx.fillRect(px + 1, py + 1, 7, 1);
  ctx.fillRect(px + 9, py + 9, 5, 1);
  ctx.fillStyle = w.shadow;
  ctx.fillRect(px, py, 16, 2);

  if (decor.id === 'galerie') {
    // Liseré d'écho : la pierre rend la lumière des cristaux.
    if (tileRand(tx, ty, 22) > 0.78) {
      ctx.fillStyle = w.trim;
      ctx.globalAlpha = 0.55;
      ctx.fillRect(px + 2, py + 12, 6, 1);
      ctx.globalAlpha = 1;
    }
  } else if (decor.id === 'abysses') {
    // Suintement : traînée sombre, goutte claire en bas.
    if (tileRand(tx, ty, 24) > 0.6) {
      const dx = px + 3 + Math.floor(tileRand(tx, ty, 25) * 10);
      ctx.fillStyle = 'rgba(10, 20, 26, 0.45)';
      ctx.fillRect(dx, py + 5, 2, 9);
      ctx.fillStyle = w.trim;
      ctx.globalAlpha = 0.4;
      ctx.fillRect(dx, py + 13, 2, 1);
      ctx.globalAlpha = 1;
    }
  } else if (decor.id === 'forge') {
    // Soudure encore chaude et têtes de rivet.
    if (tileRand(tx, ty, 26) > 0.7) {
      ctx.fillStyle = w.trim;
      ctx.globalAlpha = 0.45;
      ctx.fillRect(px + 2, py + 13, 5, 1);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = w.hi;
    ctx.fillRect(px + 2, py + 3, 1, 1);
    ctx.fillRect(px + 13, py + 11, 1, 1);
  } else if (decor.id === 'trone') {
    // Liseré violet au bas des blocs, comme un reflet du néant.
    ctx.fillStyle = w.trim;
    ctx.globalAlpha = 0.35;
    ctx.fillRect(px + 1, py + 15, 14, 1);
    ctx.globalAlpha = 1;
  } else if (tileRand(tx, ty, 21) > 0.85) {
    // Crypte : une touffe de mousse dans la pierre.
    ctx.fillStyle = w.trim;
    ctx.fillRect(px + 2, py + 10, 1, 3);
  }
}

function drawTile(ctx, px, py, tile, tx, ty, decor = null) {
  switch (tile) {
    case T.WATER: {
      ctx.fillStyle = '#3c7ed0';
      ctx.fillRect(px, py, 16, 16);
      const phase = (tx + ty) % 3;
      ctx.fillStyle = '#5d9be5';
      ctx.fillRect(px + 2 + phase, py + 4, 6, 1);
      ctx.fillRect(px + 8 - phase, py + 9, 5, 1);
      ctx.fillStyle = '#2f68b3';
      ctx.fillRect(px + 3 + phase, py + 13, 4, 1);
      break;
    }
    case T.SAND: {
      ctx.fillStyle = '#e3cf9c';
      ctx.fillRect(px, py, 16, 16);
      ctx.fillStyle = '#d3bd85';
      for (let i = 0; i < 3; i++) {
        const x = px + Math.floor(tileRand(tx, ty, i) * 14);
        const y = py + Math.floor(tileRand(tx, ty, i + 9) * 14);
        ctx.fillRect(x, y, 2, 1);
      }
      break;
    }
    case T.PATH: {
      ctx.fillStyle = '#c9b183';
      ctx.fillRect(px, py, 16, 16);
      ctx.fillStyle = '#b89f72';
      for (let i = 0; i < 4; i++) {
        const x = px + 1 + Math.floor(tileRand(tx, ty, i) * 13);
        const y = py + 2 + Math.floor(tileRand(tx, ty, i + 5) * 12);
        ctx.fillRect(x, y, 2, 1);
      }
      break;
    }
    case T.TREE:
      drawTree(ctx, px, py, tx, ty);
      break;
    case T.GRASS2:
      drawGrass(ctx, px, py, tx, ty, true);
      break;
    case T.FLOWER:
      drawGrass(ctx, px, py, tx, ty, false);
      drawFlower(ctx, px, py, tx, ty);
      break;
    case T.ROCK:
      drawGrass(ctx, px, py, tx, ty, false);
      drawRock(ctx, px, py);
      break;
    case T.ROOF:
      drawRoof(ctx, px, py, tx, ty);
      break;
    case T.WALL:
      drawWall(ctx, px, py);
      break;
    case T.WINDOW:
      drawWall(ctx, px, py);
      drawWindow(ctx, px, py);
      break;
    case T.DOOR:
      drawWall(ctx, px, py);
      drawDoor(ctx, px, py);
      break;
    case T.WOOD:
      drawWood(ctx, px, py, tx, ty, false);
      break;
    case T.PLANK:
      drawWood(ctx, px, py, tx, ty, true);
      break;
    case T.BRICK:
      drawBrick(ctx, px, py, tx, ty);
      break;
    case T.RUG:
      drawRug(ctx, px, py, tx, ty);
      break;
    case T.DOOR_STONE:
      drawBrick(ctx, px, py, tx, ty);
      drawDoor(ctx, px, py);
      break;
    case T.TABLE:
      drawTable(ctx, px, py);
      break;
    case T.SHELF:
      drawShelf(ctx, px, py);
      break;
    case T.CRATE:
      drawCrate(ctx, px, py);
      break;
    case T.STONE_FLOOR:
      drawDungeonFloor(ctx, px, py, tx, ty, decor ?? DECORS[DEFAULT_DECOR], false);
      break;
    case T.MOSS:
      drawDungeonFloor(ctx, px, py, tx, ty, decor ?? DECORS[DEFAULT_DECOR], true);
      break;
    case T.STONE_WALL:
      drawDungeonWall(ctx, px, py, tx, ty, decor ?? DECORS[DEFAULT_DECOR]);
      break;
    default:
      drawGrass(ctx, px, py, tx, ty, false);
      break;
  }
}

function buildMapCanvas(world) {
  const mapCanvas = document.createElement('canvas');
  mapCanvas.width = world.w * TILE_SIZE;
  mapCanvas.height = world.h * TILE_SIZE;
  const ctx = mapCanvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  // Une salle de donjon porte son décor (`world.decor`) ; le village et les
  // maisons n'en ont pas et gardent les tuiles habituelles.
  const decor = world.decor ? DECORS[world.decor] ?? null : null;
  // Décalage de motif propre à la salle (`world.variant`) : dans un même
  // donjon, deux salles n'ont donc pas les dalles fendues ni les éclats de
  // mousse au même endroit. Le village et les maisons gardent un décalage nul.
  const shift = decor ? (world.variant ?? 0) : 0;
  for (let y = 0; y < world.h; y++) {
    for (let x = 0; x < world.w; x++) {
      drawTile(ctx, x * TILE_SIZE, y * TILE_SIZE, world.tiles[y * world.w + x],
        x + shift * 53, y + shift * 31, decor);
    }
  }
  return mapCanvas;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBubble(ctx, text, cx, bottomY) {
  ctx.font = '11px ui-monospace, "Cascadia Mono", "Courier New", monospace';
  const label = text.length > 34 ? `${text.slice(0, 33)}…` : text;
  const width = Math.min(210, ctx.measureText(label).width + 12);
  const height = 18;
  const x = cx - width / 2;
  const y = bottomY - height;

  ctx.fillStyle = 'rgba(16, 22, 32, 0.92)';
  ctx.strokeStyle = 'rgba(232, 214, 164, 0.7)';
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, width, height, 4);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - 3, y + height);
  ctx.lineTo(cx + 3, y + height);
  ctx.lineTo(cx, y + height + 4);
  ctx.closePath();
  ctx.fillStyle = 'rgba(16, 22, 32, 0.92)';
  ctx.fill();

  ctx.fillStyle = '#f2f6fb';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, cx, y + height / 2 + 1);
}

// --- Effets des récompenses ------------------------------------------------

function drawLantern(ctx, px, py, now) {
  const pulse = 0.88 + 0.12 * Math.sin(now / 620);
  const radius = 26 * pulse;
  const gradient = ctx.createRadialGradient(px, py - 4, 0, px, py - 4, radius);
  gradient.addColorStop(0, 'rgba(255, 232, 168, 0.42)');
  gradient.addColorStop(0.55, 'rgba(255, 206, 112, 0.16)');
  gradient.addColorStop(1, 'rgba(255, 200, 100, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(px, py - 4, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawMedalAura(ctx, px, py, now) {
  const pulse = 0.75 + 0.25 * Math.sin(now / 480);
  ctx.strokeStyle = `rgba(246, 211, 77, ${0.28 + 0.18 * pulse})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(px, py + 1, 10, 4, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function drawMedal(ctx, px, py, now) {
  const bob = Math.sin(now / 460) * 1.2;
  const cx = px;
  const cy = py - 7 + bob;
  ctx.fillStyle = '#f6d34d';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + 2.5, cy + 2.5);
  ctx.lineTo(cx, cy + 5);
  ctx.lineTo(cx - 2.5, cy + 2.5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 249, 214, 0.9)';
  ctx.fillRect(cx - 1, cy + 1, 1, 2);
}

export class Renderer {
  constructor(canvas, world) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.world = world;
    this.mapCanvas = buildMapCanvas(world);
    this.scale = 4;
    this.camX = 0;
    this.camY = 0;
    this.viewW = 800;
    this.viewH = 600;
    this.dpr = 1;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.max(320, Math.floor(width * this.dpr));
    this.canvas.height = Math.max(240, Math.floor(height * this.dpr));
    this.viewW = this.canvas.width / this.dpr;
    this.viewH = this.canvas.height / this.dpr;
    this.ctx.imageSmoothingEnabled = false;
    // Zoom : plus l'écran est large, plus on voit de tuiles.
    this.scale = Math.max(2, Math.min(5, Math.round(this.viewW / 380)));
    this.clampCamera();
  }

  // Change de carte : monde extérieur ou intérieur d'une maison.
  setWorld(world) {
    this.world = world;
    this.mapCanvas = buildMapCanvas(world);
    this.clampCamera();
  }

  centerOn(x, y) {
    this.camX = x * TILE_SIZE - this.viewW / (2 * this.scale);
    this.camY = y * TILE_SIZE - this.viewH / (2 * this.scale);
    this.clampCamera();
  }

  clampCamera() {
    const worldW = this.world.w * TILE_SIZE;
    const worldH = this.world.h * TILE_SIZE;
    const viewTileW = this.viewW / this.scale;
    const viewTileH = this.viewH / this.scale;

    // Une salle plus petite que l'écran (intérieur, donjon) est centrée : une
    // caméra bloquée à zéro la collerait en haut à gauche, avec une grande
    // bande vide d'un seul côté.
    if (worldW <= viewTileW) {
      this.camX = (worldW - viewTileW) / 2;
    } else {
      this.camX = Math.min(Math.max(this.camX, 0), worldW - viewTileW);
    }
    if (worldH <= viewTileH) {
      this.camY = (worldH - viewTileH) / 2;
    } else {
      this.camY = Math.min(Math.max(this.camY, 0), worldH - viewTileH);
    }
  }

  updateCamera(targetX, targetY, dt) {
    const wantX = targetX * TILE_SIZE - this.viewW / (2 * this.scale);
    const wantY = targetY * TILE_SIZE - this.viewH / (2 * this.scale);
    const k = Math.min(1, dt * 9);
    this.camX += (wantX - this.camX) * k;
    this.camY += (wantY - this.camY) * k;
    this.clampCamera();
  }

  // `actors` : objets animés dessinés dans l'ordre de profondeur avec les
  // joueurs (monstres, par exemple). Chacun expose { ry, draw(ctx, now) }.
  render(players, selfId, now, decor = null, actors = null) {
    const ctx = this.ctx;
    const scale = this.scale;
    const camX = Math.round(this.camX);
    const camY = Math.round(this.camY);

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = '#0f1712';
    ctx.fillRect(0, 0, this.viewW, this.viewH);

    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(-camX, -camY);
    ctx.drawImage(this.mapCanvas, 0, 0);
    if (decor) decor(ctx, now);

    const list = Array.from(players.values()).sort((a, b) => a.ry - b.ry);

    const drawables = list.map((player) => ({ y: player.ry, player, actor: null }));
    for (const actor of actors ?? []) drawables.push({ y: actor.ry, player: null, actor });
    drawables.sort((a, b) => a.y - b.y);

    for (const entry of drawables) {
      if (entry.actor) {
        entry.actor.draw(ctx, now);
        continue;
      }
      const p = entry.player;
      const px = Math.round(p.rx * TILE_SIZE);
      const py = Math.round(p.ry * TILE_SIZE);
      const isSelf = p.id === selfId;

      // Récompenses : la lampe éclaire autour du personnage, le médaillon
      // ajoute une aura dorée. Les autres joueurs ne les voient pas.
      if (isSelf && p.rewards?.has('lampe')) drawLantern(ctx, px, py, now);
      if (isSelf && p.rewards?.has('medaille')) drawMedalAura(ctx, px, py, now);

      ctx.fillStyle = 'rgba(8, 14, 10, 0.28)';
      ctx.beginPath();
      ctx.ellipse(px, py + 2, 5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Pose de marche pilotée par la distance parcourue (4 poses), avec un
      // rebond de 1 px sur les poses de passage. Au repos, léger balancement.
      const frame = p.moving ? Math.floor(p.phase || 0) % 4 : 0;
      const bob = p.moving
        ? (frame % 2 === 1 ? -1 : 0)
        : (Math.floor(now / 900) % 2 === 0 ? 0 : -1);
      const sprite = getPlayerSprite(p.color, p.dir, frame);
      ctx.drawImage(sprite, px - 6, py - 15 + bob, 12, 16);

      // Arme équipée en main (`equippedWeapon`, lue dans l'inventaire) et geste
      // de frappe : pendant le coup, le personnage vise la direction du monstre.
      const swinging = (p.swing ?? 0) > 0;
      if (isSelf && (p.equippedWeapon || swinging)) {
        drawHeldWeapon(ctx, {
          itemId: p.equippedWeapon,
          px,
          py,
          bob,
          dir: swinging && p.swingDir ? p.swingDir : p.dir,
          swing: p.swing ?? 0
        });
      }

      if (isSelf && p.rewards?.has('medaille')) drawMedal(ctx, px, py - 15 + bob, now);
    }
    ctx.restore();

    // Pseudo et bulle de chat, dessinés en pixels écran pour rester lisibles.
    for (const p of list) {
      const sx = (p.rx * TILE_SIZE - camX) * scale;
      const sy = (p.ry * TILE_SIZE - camY) * scale;
      const labelY = sy - 15 * scale - 5;

      ctx.font = 'bold 12px ui-monospace, "Cascadia Mono", "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(8, 12, 18, 0.85)';
      ctx.fillStyle = p.id === selfId ? '#ffe9a8' : '#dfe9f5';
      ctx.strokeText(p.name, sx, labelY);
      ctx.fillText(p.name, sx, labelY);

      if (p.chatText && p.chatUntil > now) {
        drawBubble(ctx, p.chatText, sx, labelY - 12);
      }
    }
  }
}
