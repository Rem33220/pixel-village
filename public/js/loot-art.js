// Icônes du butin : un dessin 16 × 16 propre à chaque objet, peint au canvas
// comme le reste du jeu (aucun fichier image). La silhouette vient de l'objet,
// la teinte de sa couleur, et une gemme ou une rune d'accent rappelle la
// rareté. Le sac, l'échoppe et le détail d'un objet utilisent tous cette même
// image, donc un objet se reconnaît d'un coup d'œil partout.

import { LOOT, ITEM_ICONS } from './dungeons.js';

const SIZE = 16;
const OUTLINE = '#1b1424';
const GOLD = '#e0a83c';
const GOLD_DARK = '#a87a24';
const WOOD = '#6b4a2f';
const WOOD_DARK = '#432b1b';
const STEEL = '#dfe6ee';
const STEEL_DARK = '#9aa7b4';
const BONE = '#ece6d2';

function shade(hex, amount) {
  const value = parseInt(hex.slice(1), 16);
  const clamp = (n) => Math.max(0, Math.min(255, n));
  const r = clamp(((value >> 16) & 255) + amount);
  const g = clamp(((value >> 8) & 255) + amount);
  const b = clamp((value & 255) + amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

// --- Silhouettes ------------------------------------------------------------

const SHAPES = {
  // --- Lames ---------------------------------------------------------------
  dague(c, k) {
    for (let i = 0; i < 6; i++) px(c, 11 - i, 2 + i, 2, 1, i < 2 ? k.light : k.main);
    px(c, 12, 1, 1, 1, k.light);
    px(c, 4, 7, 1, 1, OUTLINE); // ébréchure
    px(c, 10, 5, 1, 1, k.dark);
    px(c, 5, 10, 6, 1, GOLD);
    px(c, 5, 11, 6, 1, GOLD_DARK);
    px(c, 8, 11, 2, 3, WOOD);
    px(c, 7, 14, 4, 1, GOLD_DARK);
  },
  coutelas(c, k) {
    px(c, 6, 1, 4, 10, k.main);
    px(c, 6, 1, 1, 10, k.light);
    px(c, 9, 2, 1, 9, k.dark);
    px(c, 7, 0, 2, 1, k.light);
    px(c, 10, 5, 1, 2, OUTLINE); // brèche
    px(c, 10, 7, 1, 1, k.main);
    px(c, 4, 11, 8, 1, GOLD);
    px(c, 4, 12, 8, 1, GOLD_DARK);
    px(c, 6, 13, 3, 3, WOOD);
    px(c, 5, 15, 5, 1, GOLD_DARK);
  },
  epee(c, k) {
    px(c, 7, 0, 2, 1, k.light);
    px(c, 7, 1, 2, 10, k.main);
    px(c, 7, 1, 1, 10, k.light);
    px(c, 8, 2, 1, 9, k.dark);
    px(c, 3, 11, 10, 1, GOLD);
    px(c, 3, 12, 10, 1, GOLD_DARK);
    px(c, 7, 12, 2, 3, WOOD);
    px(c, 6, 15, 4, 1, GOLD);
  },
  lame_longue(c, k) {
    px(c, 7, 0, 2, 12, k.main);
    px(c, 7, 0, 1, 12, k.light);
    px(c, 8, 2, 1, 10, k.dark);
    px(c, 8, 3, 1, 7, '#f7f2e6'); // gouttière
    px(c, 4, 12, 8, 1, GOLD);
    px(c, 3, 13, 2, 1, GOLD);
    px(c, 11, 13, 2, 1, GOLD);
    px(c, 7, 13, 2, 2, WOOD);
    px(c, 6, 15, 4, 1, GOLD_DARK);
  },
  epee_gemme(c, k) {
    px(c, 7, 0, 2, 1, k.light);
    px(c, 6, 1, 4, 10, k.main);
    px(c, 6, 1, 1, 10, k.light);
    px(c, 9, 2, 1, 9, k.dark);
    px(c, 2, 11, 12, 1, GOLD);
    px(c, 2, 12, 12, 1, GOLD_DARK);
    px(c, 7, 10, 2, 1, k.accent);
    px(c, 7, 12, 2, 3, WOOD);
    px(c, 6, 15, 4, 1, GOLD);
  },
  epee_runes(c, k) {
    px(c, 7, 0, 2, 1, k.light);
    px(c, 7, 1, 2, 10, k.main);
    px(c, 7, 1, 1, 10, k.light);
    px(c, 8, 2, 1, 9, k.dark);
    for (let i = 0; i < 4; i++) px(c, 8, 3 + i * 2, 1, 1, k.accent);
    px(c, 3, 11, 10, 1, GOLD);
    px(c, 7, 12, 2, 3, WOOD);
    px(c, 6, 15, 4, 1, GOLD_DARK);
  },
  lame_courbe(c, k) {
    for (let i = 0; i < 9; i++) {
      const x = 9 + Math.round(Math.sin(i / 2.6) * 1.4);
      px(c, x, 2 + i, 2, 1, i < 2 ? k.light : k.main);
    }
    px(c, 5, 11, 5, 1, GOLD);
    px(c, 5, 12, 5, 1, GOLD_DARK);
    px(c, 6, 12, 2, 3, WOOD);
    px(c, 5, 15, 4, 1, GOLD_DARK);
  },
  lame_onde(c, k) {
    for (let i = 0; i < 10; i++) px(c, i % 2 ? 8 : 6, 1 + i, 2, 1, i < 2 ? k.light : k.main);
    px(c, 5, 11, 7, 1, GOLD);
    px(c, 5, 12, 7, 1, GOLD_DARK);
    px(c, 7, 12, 2, 3, WOOD);
    px(c, 6, 15, 4, 1, GOLD_DARK);
  },
  fauchon(c, k) {
    for (let i = 0; i < 8; i++) {
      const x = 7 + Math.round(i * 0.7);
      px(c, x, 1 + i, 4, 1, k.main);
      px(c, x, 1 + i, 1, 1, k.light);
    }
    px(c, 4, 10, 5, 1, GOLD);
    px(c, 5, 11, 2, 4, WOOD);
    px(c, 4, 15, 4, 1, GOLD_DARK);
  },

  // --- Armes d'hast --------------------------------------------------------
  hache(c, k) {
    px(c, 7, 2, 2, 14, WOOD);
    px(c, 7, 2, 1, 14, shade(WOOD, 30));
    px(c, 2, 3, 5, 7, k.main);
    px(c, 1, 4, 1, 5, k.light);
    px(c, 2, 3, 5, 1, k.light);
    px(c, 6, 3, 1, 7, k.dark);
    px(c, 2, 10, 4, 1, k.dark);
    px(c, 7, 12, 3, 2, GOLD_DARK);
  },
  marteau(c, k) {
    px(c, 7, 4, 2, 12, WOOD);
    px(c, 4, 1, 8, 6, k.main);
    px(c, 4, 1, 8, 1, k.light);
    px(c, 4, 6, 8, 1, k.dark);
    px(c, 3, 2, 1, 4, k.dark);
    px(c, 12, 2, 1, 4, k.dark);
    px(c, 6, 7, 4, 1, GOLD_DARK);
    px(c, 5, 15, 6, 1, GOLD_DARK);
  },
  fleau(c, k) {
    px(c, 4, 12, 2, 4, WOOD);
    px(c, 5, 9, 1, 3, WOOD_DARK);
    for (let i = 0; i < 3; i++) px(c, 6 + i, 8 - i, 1, 1, STEEL_DARK);
    px(c, 10, 2, 4, 4, k.main);
    px(c, 10, 2, 4, 1, k.light);
    px(c, 12, 5, 2, 1, k.dark);
    px(c, 9, 3, 1, 1, k.dark);
    px(c, 14, 3, 1, 1, k.dark);
    px(c, 11, 0, 1, 2, k.dark);
    px(c, 11, 7, 1, 2, k.dark);
  },
  trident(c, k) {
    px(c, 7, 5, 2, 11, WOOD);
    px(c, 4, 6, 8, 1, GOLD_DARK);
    for (const x of [4, 7, 10]) {
      px(c, x, 1, 1, 6, k.main);
      px(c, x, 0, 1, 1, k.light);
    }
    px(c, 10, 1, 1, 3, k.dark);
  },
  harpon(c, k) {
    px(c, 7, 3, 2, 13, WOOD);
    px(c, 6, 1, 3, 3, k.main);
    px(c, 6, 1, 3, 1, k.light);
    px(c, 4, 3, 2, 1, k.dark);
    px(c, 10, 4, 2, 1, k.dark);
    px(c, 3, 6, 1, 1, STEEL_DARK);
    px(c, 2, 8, 2, 1, STEEL_DARK);
  },
  lance(c, k) {
    px(c, 7, 2, 2, 14, WOOD);
    px(c, 7, 2, 1, 14, shade(WOOD, 30));
    px(c, 6, 0, 4, 2, k.main);
    px(c, 7, 0, 2, 2, k.light);
    px(c, 6, 2, 4, 1, k.dark);
    px(c, 8, 3, 5, 4, k.accent);
    px(c, 8, 3, 5, 1, k.light);
    px(c, 12, 4, 1, 2, k.dark);
    px(c, 6, 8, 4, 1, GOLD_DARK);
  },
  sceptre(c, k) {
    px(c, 7, 6, 2, 10, STEEL_DARK);
    px(c, 7, 6, 1, 10, STEEL);
    px(c, 5, 1, 6, 6, k.main);
    px(c, 5, 1, 2, 2, k.light);
    px(c, 9, 5, 2, 2, k.dark);
    px(c, 4, 3, 1, 2, GOLD);
    px(c, 11, 3, 1, 2, GOLD);
    px(c, 6, 7, 4, 1, GOLD);
  },

  // --- Armures -------------------------------------------------------------
  tunique(c, k) {
    px(c, 4, 2, 8, 3, k.main);
    px(c, 3, 3, 2, 3, k.dark);
    px(c, 11, 3, 2, 3, k.dark);
    px(c, 4, 5, 8, 8, k.main);
    px(c, 4, 5, 8, 1, k.light);
    px(c, 5, 7, 6, 1, k.dark);
    px(c, 5, 9, 6, 1, k.dark);
    px(c, 4, 12, 8, 2, WOOD_DARK);
    px(c, 6, 12, 2, 2, GOLD_DARK);
  },
  mailles(c, k) {
    px(c, 4, 2, 8, 11, k.main);
    px(c, 3, 3, 2, 4, k.dark);
    px(c, 11, 3, 2, 4, k.dark);
    px(c, 4, 2, 8, 1, k.light);
    for (let y = 3; y < 13; y += 2) {
      for (let x = 5; x < 11; x += 2) px(c, x + (y % 4 === 3 ? 1 : 0), y, 1, 1, k.dark);
    }
  },
  plastron(c, k) {
    px(c, 4, 2, 8, 11, k.main);
    px(c, 4, 2, 8, 1, k.light);
    px(c, 4, 2, 1, 11, k.light);
    px(c, 11, 3, 1, 10, k.dark);
    px(c, 3, 3, 2, 3, k.dark);
    px(c, 11, 3, 2, 3, k.dark);
    px(c, 6, 2, 1, 3, OUTLINE);
    px(c, 9, 2, 1, 3, OUTLINE);
    px(c, 5, 13, 6, 1, GOLD_DARK);
  },
  plastron_cloute(c, k) {
    SHAPES.plastron(c, k);
    for (let i = 0; i < 3; i++) px(c, 6 + i * 2, 7, 1, 1, STEEL);
    for (let i = 0; i < 3; i++) px(c, 6 + i * 2, 10, 1, 1, STEEL);
  },
  cuirasse(c, k) {
    px(c, 3, 2, 10, 11, k.main);
    px(c, 3, 2, 10, 1, k.light);
    px(c, 3, 3, 1, 10, k.light);
    px(c, 12, 3, 1, 10, k.dark);
    px(c, 6, 2, 4, 2, k.dark);
    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < 4; i++) px(c, 5 + i * 2, 6 + row * 2, 1, 1, k.accent);
    }
    px(c, 4, 12, 8, 1, GOLD_DARK);
  },
  epaulieres(c, k) {
    px(c, 2, 2, 5, 3, k.main);
    px(c, 2, 2, 5, 1, k.light);
    px(c, 2, 4, 5, 1, k.dark);
    px(c, 9, 2, 5, 3, k.main);
    px(c, 9, 2, 5, 1, k.light);
    px(c, 9, 4, 5, 1, k.dark);
    px(c, 3, 5, 4, 3, k.main);
    px(c, 9, 5, 4, 3, k.main);
    px(c, 3, 7, 4, 1, k.dark);
    px(c, 9, 7, 4, 1, k.dark);
    px(c, 7, 3, 2, 4, k.dark);
    px(c, 5, 9, 6, 2, k.accent);
  },
  gantelets(c, k) {
    px(c, 4, 4, 8, 6, k.main);
    px(c, 4, 4, 8, 1, k.light);
    px(c, 4, 9, 8, 1, k.dark);
    px(c, 5, 1, 6, 3, k.dark);
    px(c, 5, 10, 2, 4, k.main);
    px(c, 7, 10, 2, 3, k.main);
    px(c, 9, 10, 2, 4, k.main);
    px(c, 3, 11, 2, 2, k.dark);
    px(c, 5, 13, 6, 1, GOLD_DARK);
  },
  cape(c, k) {
    px(c, 5, 1, 6, 3, k.dark);
    px(c, 4, 3, 8, 2, k.main);
    px(c, 6, 2, 4, 1, k.light);
    px(c, 3, 5, 10, 8, k.main);
    px(c, 3, 5, 1, 8, k.light);
    px(c, 12, 5, 1, 8, k.dark);
    px(c, 2, 13, 3, 1, k.main);
    px(c, 11, 13, 3, 1, k.main);
    px(c, 2, 14, 2, 1, k.dark);
    px(c, 12, 14, 2, 1, k.dark);
    px(c, 7, 6, 2, 6, k.dark);
    px(c, 6, 4, 4, 1, GOLD);
  },
  bouclier(c, k) {
    px(c, 3, 2, 10, 2, k.main);
    px(c, 2, 4, 12, 5, k.main);
    px(c, 3, 9, 10, 2, k.main);
    px(c, 5, 11, 6, 2, k.main);
    px(c, 6, 13, 4, 1, k.main);
    px(c, 7, 14, 2, 1, k.main);
    px(c, 3, 2, 10, 1, k.light);
    px(c, 2, 4, 1, 5, k.light);
    px(c, 13, 4, 1, 5, k.dark);
    px(c, 3, 10, 10, 1, k.dark);
    px(c, 7, 2, 2, 12, GOLD);
    px(c, 3, 6, 10, 2, GOLD);
    px(c, 7, 2, 1, 12, GOLD_DARK);
    px(c, 3, 7, 10, 1, GOLD_DARK);
    px(c, 6, 5, 4, 1, k.dark);
  },
  heaume(c, k) {
    px(c, 5, 1, 6, 1, k.main);
    px(c, 4, 2, 8, 11, k.main);
    px(c, 4, 2, 8, 1, k.light);
    px(c, 4, 2, 1, 11, k.light);
    px(c, 11, 3, 1, 10, k.dark);
    px(c, 4, 11, 8, 2, k.dark);
    px(c, 5, 6, 6, 1, OUTLINE);
    px(c, 5, 8, 2, 3, OUTLINE);
    px(c, 9, 8, 2, 3, OUTLINE);
    px(c, 7, 8, 2, 3, k.dark);
    px(c, 7, 0, 2, 2, k.accent);
    px(c, 5, 13, 6, 1, GOLD_DARK);
  },
  casque_os(c, k) {
    px(c, 4, 3, 8, 7, BONE);
    px(c, 4, 3, 8, 1, '#f7f3e2');
    px(c, 5, 10, 6, 2, BONE);
    px(c, 5, 5, 2, 2, OUTLINE);
    px(c, 9, 5, 2, 2, OUTLINE);
    px(c, 7, 8, 2, 1, OUTLINE);
    for (let i = 0; i < 3; i++) px(c, 5 + i * 2, 11, 1, 3, BONE);
    px(c, 11, 8, 1, 3, k.accent);
  },
  masque(c, k) {
    px(c, 4, 2, 8, 11, k.main);
    px(c, 4, 2, 8, 1, k.light);
    px(c, 5, 5, 2, 2, OUTLINE);
    px(c, 9, 5, 2, 2, OUTLINE);
    px(c, 7, 8, 2, 1, k.dark);
    px(c, 6, 10, 4, 1, k.dark);
    px(c, 3, 4, 1, 6, k.dark);
    px(c, 12, 4, 1, 6, k.dark);
  },
  couronne(c, k) {
    px(c, 3, 9, 10, 4, k.main);
    px(c, 3, 9, 10, 1, k.light);
    px(c, 3, 12, 10, 1, k.dark);
    px(c, 3, 5, 2, 4, k.main);
    px(c, 7, 3, 2, 6, k.main);
    px(c, 11, 5, 2, 4, k.main);
    px(c, 3, 4, 2, 1, k.light);
    px(c, 7, 2, 2, 1, k.light);
    px(c, 11, 4, 2, 1, k.light);
    px(c, 3, 3, 1, 1, k.accent);
    px(c, 7, 1, 1, 1, k.accent);
    px(c, 11, 3, 1, 1, k.accent);
    px(c, 5, 10, 1, 1, k.accent);
    px(c, 8, 10, 1, 1, k.accent);
    px(c, 10, 10, 1, 1, k.accent);
    px(c, 3, 13, 10, 1, GOLD_DARK);
  },
  broche(c, k) {
    px(c, 4, 2, 8, 8, GOLD_DARK);
    px(c, 5, 3, 6, 6, k.main);
    px(c, 5, 3, 6, 1, k.light);
    px(c, 5, 8, 6, 1, k.dark);
    px(c, 7, 4, 2, 4, k.accent);
    px(c, 8, 5, 1, 2, '#fff6d8');
    px(c, 2, 5, 2, 2, GOLD);
    px(c, 12, 5, 2, 2, GOLD);
    px(c, 6, 10, 4, 2, GOLD_DARK);
    px(c, 7, 12, 2, 2, GOLD);
  },

  // --- Talismans -----------------------------------------------------------
  plume(c, k) {
    for (let i = 0; i < 10; i++) px(c, 4 + i, 12 - i, 1, 1, STEEL_DARK);
    for (let i = 0; i < 6; i++) px(c, 5 + i, 9 - i, 3, 2, k.main);
    px(c, 6, 8, 2, 2, k.light);
    px(c, 3, 14, 2, 1, WOOD_DARK);
  },
  dent(c, k) {
    px(c, 4, 2, 8, 3, k.main);
    px(c, 4, 2, 8, 1, k.light);
    px(c, 5, 5, 6, 4, k.main);
    px(c, 6, 9, 4, 3, k.main);
    px(c, 7, 12, 2, 2, k.main);
    px(c, 4, 12, 2, 3, k.main);
    px(c, 10, 12, 2, 3, k.main);
    px(c, 10, 3, 2, 8, k.dark);
    px(c, 9, 6, 1, 3, k.light);
  },
  boussole(c, k) {
    px(c, 2, 2, 12, 12, OUTLINE);
    px(c, 3, 3, 10, 10, k.main);
    px(c, 3, 3, 10, 1, k.light);
    px(c, 3, 12, 10, 1, k.dark);
    px(c, 7, 5, 2, 6, STEEL);
    px(c, 7, 5, 2, 2, '#e05c4b');
    px(c, 7, 11, 2, 1, STEEL_DARK);
    px(c, 4, 4, 1, 1, GOLD_DARK);
    px(c, 11, 11, 1, 1, GOLD_DARK);
  },
  sceau(c, k) {
    px(c, 4, 2, 8, 8, k.main);
    px(c, 4, 2, 8, 1, k.light);
    px(c, 4, 9, 8, 1, k.dark);
    px(c, 6, 4, 1, 4, k.accent);
    px(c, 9, 4, 1, 4, k.accent);
    px(c, 6, 5, 4, 1, k.accent);
    px(c, 5, 10, 2, 4, k.dark);
    px(c, 9, 10, 2, 4, k.dark);
    px(c, 5, 13, 2, 2, k.main);
    px(c, 9, 13, 2, 2, k.main);
  },
  anneau(c, k) {
    px(c, 5, 5, 6, 7, k.main);
    px(c, 6, 6, 4, 5, OUTLINE);
    px(c, 5, 5, 6, 1, k.light);
    px(c, 5, 11, 6, 1, k.dark);
    px(c, 6, 2, 4, 3, k.accent);
    px(c, 7, 3, 2, 1, '#fff6d8');
    px(c, 4, 8, 1, 2, GOLD_DARK);
    px(c, 11, 8, 1, 2, GOLD_DARK);
  }
};

// Silhouette choisie pour chaque objet : deux objets de même famille ne se
// ressemblent plus (une dague n'est pas une épée, un heaume n'est pas un masque).
const SHAPES_BY_ITEM = {
  dague: 'dague',
  coutelas: 'coutelas',
  epee_courte: 'epee',
  lame_veilleur: 'lame_longue',
  epee_gardien: 'epee_gemme',
  epee_neant: 'epee_gemme',
  epee_orage: 'epee_runes',
  epee_cendres: 'epee_runes',
  lame_brumes: 'lame_courbe',
  lame_givre: 'lame_longue',
  lame_ombre: 'lame_courbe',
  lame_abysses: 'lame_onde',
  lame_neant: 'lame_onde',
  fauchon_neant: 'fauchon',
  hache: 'hache',
  marteau_cendres: 'marteau',
  fleau_cendres: 'fleau',
  trident_abysses: 'trident',
  harpon_abysses: 'harpon',
  lance_ombres: 'lance',
  sceptre_neant: 'sceptre',
  tunique: 'tunique',
  mailles: 'mailles',
  plastron: 'plastron',
  plastron_cloute: 'plastron_cloute',
  armure_gardien: 'plastron',
  cuirasse_abysses: 'cuirasse',
  epaulieres_abysses: 'epaulieres',
  gantelets: 'gantelets',
  gantelets_cendres: 'gantelets',
  gantelets_orage: 'gantelets',
  cape_ombre: 'cape',
  voile_neant: 'cape',
  bouclier_cendres: 'bouclier',
  casque_cendres: 'heaume',
  heaume_cristal: 'heaume',
  heaume_gardien: 'heaume',
  casque_os: 'casque_os',
  masque_neant: 'masque',
  couronne_neant: 'couronne',
  broche_gardien: 'broche',
  plume_noire: 'plume',
  dent_loup: 'dent',
  dent_golem: 'dent',
  boussole_rouillee: 'boussole',
  sceau_neant: 'sceau',
  anneau_trone: 'anneau'
};

// Couleur de la gemme, de la rune ou du cimier propre à certains objets.
const ACCENTS = {
  epee_gardien: '#fff3bd',
  epee_neant: '#ffd6e2',
  epee_orage: '#f6d34d',
  epee_cendres: '#ffd0a0',
  lame_brumes: '#eaffff',
  lame_givre: '#d8f4ff',
  lame_ombre: '#e2c8ff',
  lame_abysses: '#d8f7ff',
  lame_neant: '#ffd6e2',
  heaume_cristal: '#d8f4ff',
  casque_os: '#c9a4ff',
  sceau_neant: '#f0ddff',
  boussole_rouillee: '#f6d34d'
};

function iconCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  canvas.className = 'item-icon';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

// Repli pour un objet sans dessin dédié : l'icône générique de son type.
function fallbackIcon(item) {
  const icon = ITEM_ICONS[item.kind];
  const { canvas, ctx } = iconCanvas();
  if (!icon) return canvas;
  const palette = { ...icon.palette, b: item.color };
  icon.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const color = palette[row[x]];
      if (!color) continue;
      px(ctx, x, y, 1, 1, color);
    }
  });
  return canvas;
}

export function createLootIcon(id) {
  const item = LOOT[id];
  if (!item) return null;
  const shape = SHAPES[SHAPES_BY_ITEM[id]];
  if (!shape) return fallbackIcon(item);

  const { canvas, ctx } = iconCanvas();
  const colors = {
    main: item.color,
    light: shade(item.color, 55),
    dark: shade(item.color, -55),
    accent: ACCENTS[id] ?? '#ffe9a8'
  };
  shape(ctx, colors);
  return canvas;
}
