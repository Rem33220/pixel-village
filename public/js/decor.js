// Décors des salles de donjon : uniquement des données, sans DOM, pour que
// `dungeons.js` (qui choisit le décor) et `renderer.js` (qui le dessine)
// partagent les mêmes clés. Chaque donjon a son propre décor : la Crypte sent
// la mousse, la Galerie luit comme du marbre, l'Antre est de la terre battue,
// les Abysses ruissellent, la Forge couve sous la cendre et le Trône est un
// marbre noir veiné de vide.
//
// Une palette se compose de trois blocs :
//   floor  — dalles : base, joints, reflets, éclats
//   wall   — murs   : base, partie basse, joints, arêtes, ombre, liseré
//   accent — motif décoratif posé sur les tuiles `MOSS`
//            (`mousse`, `rune`, `racine`, `flaque`, `braise`, `neant`)

export const DECORS = {
  crypte: {
    id: 'crypte',
    label: 'pierre moussue',
    floor: {
      base: '#2b2f3a',
      joint: '#23262f',
      hi: 'rgba(255, 255, 255, 0.045)',
      speck: '#1d2028',
      vein: 'rgba(255, 255, 255, 0.05)'
    },
    wall: {
      base: '#3f444f',
      lower: '#2c3038',
      joint: '#22252c',
      hi: 'rgba(255, 255, 255, 0.07)',
      shadow: 'rgba(0, 0, 0, 0.25)',
      trim: '#4f8a52'
    },
    accent: { kind: 'mousse', a: '#3c6b3f', b: '#4f8a52' }
  },
  galerie: {
    id: 'galerie',
    label: 'marbre des échos',
    floor: {
      base: '#39404f',
      joint: '#2c323e',
      hi: 'rgba(200, 244, 255, 0.10)',
      speck: '#232936',
      vein: 'rgba(143, 240, 247, 0.12)'
    },
    wall: {
      base: '#4a5266',
      lower: '#363c4d',
      joint: '#262b38',
      hi: 'rgba(210, 248, 255, 0.11)',
      shadow: 'rgba(0, 0, 0, 0.28)',
      trim: '#6fd6e0'
    },
    accent: { kind: 'rune', a: '#2f6a72', b: '#8ff0f7' }
  },
  antre: {
    id: 'antre',
    label: 'terre battue',
    floor: {
      base: '#41372c',
      joint: '#332b22',
      hi: 'rgba(255, 236, 200, 0.06)',
      speck: '#2a231b',
      vein: 'rgba(255, 236, 200, 0.08)'
    },
    wall: {
      base: '#514536',
      lower: '#3b3329',
      joint: '#2b251d',
      hi: 'rgba(255, 236, 200, 0.09)',
      shadow: 'rgba(0, 0, 0, 0.30)',
      trim: '#b09a6a'
    },
    accent: { kind: 'racine', a: '#5b4630', b: '#8a6d47' }
  },
  abysses: {
    id: 'abysses',
    label: 'pierre ruisselante',
    floor: {
      base: '#25333b',
      joint: '#1d2930',
      hi: 'rgba(160, 230, 255, 0.08)',
      speck: '#172228',
      vein: 'rgba(95, 208, 255, 0.10)'
    },
    wall: {
      base: '#31434e',
      lower: '#24333c',
      joint: '#1a262d',
      hi: 'rgba(180, 235, 255, 0.10)',
      shadow: 'rgba(0, 0, 0, 0.31)',
      trim: '#3f8fa8'
    },
    accent: { kind: 'flaque', a: '#1f4e63', b: '#5fd0ff' }
  },
  forge: {
    id: 'forge',
    label: 'basalte et braise',
    floor: {
      base: '#3a2f2c',
      joint: '#2b2321',
      hi: 'rgba(255, 190, 140, 0.07)',
      speck: '#241c1a',
      vein: 'rgba(255, 154, 92, 0.15)'
    },
    wall: {
      base: '#4a3b34',
      lower: '#332823',
      joint: '#241b18',
      hi: 'rgba(255, 200, 160, 0.09)',
      shadow: 'rgba(0, 0, 0, 0.32)',
      trim: '#c96a2e'
    },
    accent: { kind: 'braise', a: '#8a3d1c', b: '#ff9a5c' }
  },
  trone: {
    id: 'trone',
    label: 'marbre du néant',
    floor: {
      base: '#221f2b',
      joint: '#1a1722',
      hi: 'rgba(210, 180, 255, 0.07)',
      speck: '#171420',
      vein: 'rgba(201, 164, 255, 0.13)'
    },
    wall: {
      base: '#332c44',
      lower: '#241f30',
      joint: '#181420',
      hi: 'rgba(220, 190, 255, 0.10)',
      shadow: 'rgba(0, 0, 0, 0.32)',
      trim: '#8a5fc0'
    },
    accent: { kind: 'neant', a: '#4a2d6b', b: '#c9a4ff' }
  }
};

// Décor de repli (une salle construite hors donjon, un test, etc.).
export const DEFAULT_DECOR = 'crypte';

export const DECOR_KEYS = Object.keys(DECORS);
