// Donjons : le portail du bout du chemin nord ouvre des instances privées de
// difficulté croissante. Comme les maisons, tout se joue côté client (le monde
// des autres joueurs s'arrête à la porte) : le serveur ne reçoit que
// « je suis à l'intérieur ».
//
// Ce module ne touche pas au DOM : il est testable avec `node` seul
// (voir tests/dungeons.test.mjs).
//
// Les tests de ce fichier valident le comportement des donjons sans besoin du
// navigateur. Pour les relancer : `node tests/dungeons.test.mjs` (ou le
// lanceur `Lancer le jeu.bat`).

import { T, TILE_SIZE, isSolid } from './map.js';
import { DECORS, DEFAULT_DECOR } from './decor.js';
import {
  EXECUTE_THRESHOLD,
  REGEN_DELAY,
  SECOND_WIND_RATIO,
  SPECIAL_COOLDOWN,
  SPECIAL_MULT,
  SPECIAL_RANGE,
  skillEffects
} from './skills.js';

// --- Réglages --------------------------------------------------------------

export const BASE_STATS = { attack: 4, defense: 0, pv: 34 };

export const PORTAL_RANGE = 1.7;
export const CHEST_RANGE = 1.2;
export const ATTACK_RANGE = 1.35;
export const ATTACK_COOLDOWN = 0.42;
// Durée du geste de frappe : lever de l'arme, coup, retour au repos.
export const SWING_TIME = 0.28;
// Durée du tourbillon : le temps que mettent les lames à faire le tour du
// personnage. Le rendu s'en sert pour l'animation, updateRun la décompte.
export const SPIN_TIME = 0.55;
export const CONTACT_RANGE = 0.95;

// Dégâts de la ruade en passage : un coup modéré, mais qui peut tuer un
// monstre faible et ouvrir le coffre de la salle si les deux sont présents.
export const DASH_STRIDE_DAMAGE = 3;

export const MONSTER_COOLDOWN = 1.1;
export const MONSTER_AGGRO = 5;
// Petit répit à l'arrivée : le temps de comprendre où l'on est.
export const ENTRY_GRACE = 1.2;
export const DROP_CHANCE = 0.3;

export const PLAYER_RADIUS = 0.3;
const MONSTER_RADIUS = 0.26;

// --- Butin ----------------------------------------------------------------

// `color` sert à dessiner l'icône (aucun fichier image), `attack` et `defense`
// sont les bonus réels appliqués une fois l'objet équipé.
export const LOOT = {
  dague: {
    name: 'Dague rouillée',
    kind: 'arme',
    art: 'dague',
    attack: 2,
    defense: 0,
    rarity: 'commun',
    color: '#b8b2a4',
    detail: 'Une lame courte encore solide, oubliée dans la crypte.'
  },
  tunique: {
    name: 'Tunique de cuir',
    kind: 'armure',
    attack: 0,
    defense: 1,
    rarity: 'commun',
    color: '#a9713f',
    detail: 'Du cuir souple : de quoi encaisser les crocs des baveux.'
  },
  epee_courte: {
    name: 'Épée courte',
    kind: 'arme',
    art: 'epee',
    attack: 4,
    defense: 0,
    rarity: 'commun',
    color: '#cfd6de',
    detail: 'L’arme des veilleurs de la crypte. Simple et efficace.'
  },
  hache: {
    name: 'Hache de pierre',
    kind: 'arme',
    art: 'hache',
    attack: 6,
    defense: 0,
    rarity: 'rare',
    color: '#8b939c',
    detail: 'Lourde, taillée dans la roche de la galerie.'
  },
  mailles: {
    name: 'Cotte de mailles',
    kind: 'armure',
    attack: 0,
    defense: 3,
    rarity: 'rare',
    color: '#9aa7b4',
    detail: 'Des anneaux serrés qui amortissent les coups de griffes.'
  },
  lame_brumes: {
    name: 'Lame des brumes',
    kind: 'arme',
    art: 'lame',
    glow: true,
    attack: 9,
    defense: 0,
    rarity: 'epique',
    color: '#8ff0f7',
    detail: 'Elle laisse un filet de brume derrière chaque coup.'
  },
  plastron: {
    name: 'Plastron runique',
    kind: 'armure',
    attack: 0,
    defense: 5,
    rarity: 'rare',
    color: '#c9803f',
    detail: 'Des runes gravées dans le métal détournent une partie des coups.'
  },
  epee_gardien: {
    name: 'Épée du gardien',
    kind: 'arme',
    art: 'epee_gemme',
    glow: true,
    attack: 13,
    defense: 0,
    rarity: 'epique',
    color: '#f6d34d',
    detail: 'La lame du gardien de l’antre. Elle ne pardonne pas.'
  },
  armure_gardien: {
    name: 'Armure du gardien',
    kind: 'armure',
    attack: 0,
    defense: 8,
    rarity: 'epique',
    color: '#7ee08a',
    detail: 'Des plaques épaisses : les golems eux-mêmes frappent moins fort.'
  },
  gantelets: {
    name: 'Gantelets de pierre',
    kind: 'armure',
    attack: 0,
    defense: 4,
    rarity: 'rare',
    color: '#6d747c',
    detail: 'Deux gantelets massifs qui protègent les avant-bras.'
  },
  // Butin des salles secrètes : il ne tombe jamais au hasard.
  lame_ombre: {
    name: 'Lame d’ombre',
    kind: 'arme',
    art: 'cimeterre',
    glow: true,
    attack: 24,
    defense: 0,
    rarity: 'legendaire',
    color: '#c78bff',
    detail: 'Forgée dans le noir de l’antre, elle boit la lumière autour d’elle.'
  },
  cape_ombre: {
    name: 'Cape d’ombre',
    kind: 'armure',
    attack: 0,
    defense: 10,
    rarity: 'legendaire',
    color: '#6f4bd6',
    detail: 'Le tissu se referme sur les coups comme une nuit sans étoiles.'
  },
  // Butin des expéditions avancées (niveaux 4 à 6) : les objets épiques
  // tombent dans les salles, les mythiques restent dans les salles secrètes.
  trident_abysses: {
    name: 'Trident des abysses',
    kind: 'arme',
    art: 'trident',
    attack: 17,
    defense: 0,
    rarity: 'epique',
    color: '#7fd6ff',
    detail: 'Trois pointes forgées dans un métal qui ne rouille jamais.'
  },
  marteau_cendres: {
    name: 'Marteau des cendres',
    kind: 'arme',
    art: 'marteau',
    attack: 20,
    defense: 0,
    rarity: 'epique',
    color: '#ff9a5c',
    detail: 'Sa tête est encore chaude quand on le sort de la forge.'
  },
  epee_neant: {
    name: 'Épée du néant',
    kind: 'arme',
    art: 'epee_gemme',
    attack: 23,
    defense: 0,
    rarity: 'epique',
    color: '#ff8fb0',
    detail: 'La garde est froide, la lame boit la lumière des torches.'
  },
  lame_abysses: {
    name: 'Lame des abysses',
    kind: 'arme',
    art: 'lame_onde',
    glow: true,
    attack: 29,
    defense: 0,
    rarity: 'mythique',
    color: '#5fd0ff',
    detail: 'Elle ruisselle d’une eau noire qui ne sèche jamais.'
  },
  cuirasse_abysses: {
    name: 'Cuirasse abyssale',
    kind: 'armure',
    attack: 0,
    defense: 15,
    rarity: 'mythique',
    color: '#3f7fa8',
    detail: 'Des écailles de poisson des fosses, dures comme de la pierre.'
  },
  fleau_cendres: {
    name: 'Fléau des cendres',
    kind: 'arme',
    art: 'fleau',
    glow: true,
    attack: 33,
    defense: 0,
    rarity: 'mythique',
    color: '#ff6a3c',
    detail: 'Chaque coup soulève un nuage de braise qui reste dans les yeux.'
  },
  bouclier_cendres: {
    name: 'Bouclier de cendres',
    kind: 'armure',
    attack: 0,
    defense: 14,
    rarity: 'mythique',
    color: '#c9803f',
    detail: 'Compacté dans la fournaise : il absorbe les coups comme du sable.'
  },
  lame_neant: {
    name: 'Lame du néant',
    kind: 'arme',
    art: 'lame',
    glow: true,
    attack: 36,
    defense: 0,
    rarity: 'mythique',
    color: '#ff5f7a',
    detail: 'L’arme du trône : elle ne laisse derrière elle que du vide.'
  },
  couronne_neant: {
    name: 'Couronne du néant',
    kind: 'armure',
    attack: 0,
    defense: 17,
    rarity: 'mythique',
    color: '#d6a8ff',
    detail: 'Personne ne sait si elle protège ou si elle dévore celui qui la porte.'
  },
  // Butin des salles secrètes ajoutées quand le donjon grandit (niveaux 3 à 6).
  lance_ombres: {
    name: 'Lance des ombres',
    kind: 'arme',
    art: 'lance',
    attack: 16,
    defense: 0,
    rarity: 'epique',
    color: '#b48cff',
    detail: 'Sa pointe ne se trouve que là où la lumière ne va pas.'
  },
  casque_cendres: {
    name: 'Casque de cendres',
    kind: 'armure',
    attack: 0,
    defense: 13,
    rarity: 'mythique',
    color: '#e08a4a',
    detail: 'Il ne fond pas, même au plus près de la fournaise.'
  },
  epee_cendres: {
    name: 'Épée des cendres',
    kind: 'arme',
    art: 'epee_runes',
    glow: true,
    attack: 35,
    defense: 0,
    rarity: 'mythique',
    color: '#ffb27a',
    detail: 'On dit qu’elle a été trempée dans le dernier souffle de la forge.'
  },
  harpon_abysses: {
    name: 'Harpon des abysses',
    kind: 'arme',
    art: 'harpon',
    glow: true,
    attack: 31,
    defense: 0,
    rarity: 'mythique',
    color: '#3fa8c9',
    detail: 'Trois crochets, une seule envie : ne jamais remonter à vide.'
  },
  voile_neant: {
    name: 'Voile du néant',
    kind: 'armure',
    attack: 0,
    defense: 18,
    rarity: 'mythique',
    color: '#8f6fd6',
    detail: 'Il flotte derrière toi, et les coups semblent s’y perdre.'
  },
  sceptre_neant: {
    name: 'Sceptre du néant',
    kind: 'arme',
    art: 'sceptre',
    glow: true,
    attack: 40,
    defense: 0,
    rarity: 'mythique',
    color: '#ff5f7a',
    detail: 'Le trône ne protège pas : il ordonne.'
  },
  broche_gardien: {
    name: 'Broche du gardien',
    kind: 'armure',
    attack: 0,
    defense: 9,
    rarity: 'epique',
    color: '#f6d34d',
    detail: 'La pierre qu’elle tient s’illumine quand le danger approche.'
  },
  epaulieres_abysses: {
    name: 'Épaulières abyssales',
    kind: 'armure',
    attack: 0,
    defense: 14,
    rarity: 'mythique',
    color: '#4f9ec0',
    detail: 'Elles portent la pression de l’eau noire sans jamais céder.'
  },
  gantelets_cendres: {
    name: 'Gantelets de cendres',
    kind: 'armure',
    attack: 0,
    defense: 14,
    rarity: 'mythique',
    color: '#ff9a5c',
    detail: 'Ils tiennent chaud, même dans la neige du dehors.'
  },
  masque_neant: {
    name: 'Masque du néant',
    kind: 'armure',
    attack: 0,
    defense: 20,
    rarity: 'mythique',
    color: '#d6a8ff',
    detail: 'Il ne cache pas ton visage : il retire celui que tu avais.'
  },
  // --- Butin de variété ----------------------------------------------------
  // Les talismans occupent un troisième emplacement et misent sur l’utile
  // (expérience, butin, régénération, PV) plutôt que sur les dégâts bruts.
  // Les autres complètent les paliers bas, qui manquaient de choix.
  coutelas: {
    name: 'Coutelas ébréché',
    kind: 'arme',
    art: 'coutelas',
    attack: 3,
    defense: 0,
    attackCd: 0.92,
    rarity: 'commun',
    color: '#cfc7b4',
    detail: 'Sa lame est courte mais le poignet repart vite : il frappe plus souvent.'
  },
  casque_os: {
    name: 'Casque d’os',
    kind: 'armure',
    attack: 0,
    defense: 2,
    pv: 2,
    rarity: 'commun',
    color: '#d8d2bd',
    detail: 'Un crâne fendu, ajusté tant bien que mal : mieux que rien sous les crocs.'
  },
  plume_noire: {
    name: 'Plume de corbeau',
    kind: 'talisman',
    attack: 0,
    defense: 0,
    pv: 4,
    rarity: 'commun',
    color: '#6f748c',
    detail: 'Elle ne s’envole jamais. On dit qu’elle retient un peu de vie.'
  },
  dent_loup: {
    name: 'Dent de loup',
    kind: 'talisman',
    attack: 1,
    defense: 0,
    dropBonus: 0.05,
    rarity: 'commun',
    color: '#e6dfc4',
    detail: 'Portée en pendentif, elle rend les monstres un peu plus généreux.'
  },
  lame_veilleur: {
    name: 'Lame du veilleur',
    kind: 'arme',
    art: 'epee',
    attack: 7,
    defense: 0,
    range: 0.1,
    rarity: 'rare',
    color: '#b9d7e8',
    detail: 'L’épée de ronde de la galerie : un peu plus longue que les autres.'
  },
  plastron_cloute: {
    name: 'Plastron clouté',
    kind: 'armure',
    attack: 0,
    defense: 6,
    rarity: 'rare',
    color: '#8a6a4a',
    detail: 'Des clous de fer sur du cuir épais : rustique, mais efficace.'
  },
  boussole_rouillee: {
    name: 'Boussole rouillée',
    kind: 'talisman',
    attack: 0,
    defense: 0,
    xpBonus: 0.1,
    rarity: 'rare',
    color: '#c9a24a',
    detail: 'Son aiguille indique toujours la sortie… et le chemin des histoires.'
  },
  lame_givre: {
    name: 'Lame de givre',
    kind: 'arme',
    art: 'lame',
    glow: true,
    attack: 12,
    defense: 0,
    attackCd: 0.95,
    rarity: 'epique',
    color: '#aee8ff',
    detail: 'Le froid ralentit la main qui la tient, pas celle qui frappe.'
  },
  heaume_cristal: {
    name: 'Heaume de cristal',
    kind: 'armure',
    attack: 0,
    defense: 7,
    regen: 0.4,
    rarity: 'epique',
    color: '#9fe4f0',
    detail: 'Le cristal se fend au lieu de ton crâne, puis se referme lentement.'
  },
  dent_golem: {
    name: 'Dent de golem',
    kind: 'talisman',
    attack: 0,
    defense: 0,
    pv: 6,
    regen: 0.5,
    rarity: 'epique',
    color: '#9aa7b4',
    detail: 'Encore tiède, elle bat comme un petit cœur de pierre.'
  },
  epee_orage: {
    name: 'Épée d’orage',
    kind: 'arme',
    art: 'epee_runes',
    glow: true,
    attack: 26,
    defense: 0,
    execute: 0.15,
    rarity: 'legendaire',
    color: '#f6d34d',
    detail: 'Elle siffle avant de frapper, et les blessés ne s’en relèvent pas.'
  },
  heaume_gardien: {
    name: 'Heaume du gardien',
    kind: 'armure',
    attack: 0,
    defense: 12,
    pv: 6,
    rarity: 'legendaire',
    color: '#7ee08a',
    detail: 'La visière est fendue, mais rien n’a jamais traversé le heaume.'
  },
  fauchon_neant: {
    name: 'Fauchon du néant',
    kind: 'arme',
    art: 'fauchon',
    glow: true,
    attack: 38,
    defense: 0,
    attackCd: 0.94,
    rarity: 'mythique',
    color: '#ff5f7a',
    detail: 'Une lame large qui fauche plus vite que le regard ne la suit.'
  },
  sceau_neant: {
    name: 'Sceau du néant',
    kind: 'talisman',
    attack: 0,
    defense: 0,
    pv: 8,
    xpBonus: 0.35,
    dropBonus: 0.12,
    rarity: 'mythique',
    color: '#d6a8ff',
    detail: 'Le sceau du trône : il attire les histoires, les trésors et les ennuis.'
  },
  gantelets_orage: {
    name: 'Gantelets d’orage',
    kind: 'armure',
    attack: 0,
    defense: 12,
    regen: 0.3,
    rarity: 'legendaire',
    color: '#f6d34d',
    detail: 'L’électricité court encore entre les doigts quand on serre le poing.'
  },
  anneau_trone: {
    name: 'Anneau du trône',
    kind: 'talisman',
    attack: 0,
    defense: 0,
    pv: 7,
    xpBonus: 0.2,
    dropBonus: 0.08,
    rarity: 'legendaire',
    color: '#f2d24b',
    detail: 'Une bague trop large pour un doigt vivant, mais qui ne tombe jamais.'
  }
};

// Niveaux de rareté, du plus courant au plus rare. `rank` sert au tri et aux
// tests, `label` à l’affichage. Un objet ne peut porter qu’une de ces raretés.
export const RARITIES = {
  commun: { label: 'Commun', rank: 0, color: '#b9c6bd' },
  rare: { label: 'Rare', rank: 1, color: '#082eee' },
  epique: { label: 'Épique', rank: 2, color: '#7516ce' },
  legendaire: { label: 'Légendaire', rank: 3, color: '#f3c923' },
  mythique: { label: 'Mythique', rank: 4, color: '#de1436' }
};

export const RARITY_ORDER = Object.keys(RARITIES);

// Poids de tirage par donjon et par type de salle. Une salle ordinaire suit sa
// propre liste (`spec.loot`), une salle secrète puise dans tout le donjon :
// c’est là que les raretés hautes sont privilégiées, sans jamais être
// garanties. Les poids sont relatifs : seules les raretés présentes dans le
// butin disponible comptent, puis sont renormalisées.
export const DROP_TABLES = {
  crypte: {
    room: { commun: 100 },
    secret: { commun: 45, epique: 55 }
  },
  galerie: {
    room: { rare: 92, epique: 8 },
    secret: { rare: 35, epique: 65 }
  },
  antre: {
    room: { rare: 70, epique: 30 },
    secret: { rare: 24, epique: 48, legendaire: 28 }
  },
  abysses: {
    room: { rare: 52, epique: 48 },
    secret: { rare: 12, epique: 42, legendaire: 39, mythique: 7 }
  },
  forge: {
    room: { rare: 27, epique: 73 },
    secret: { epique: 38, legendaire: 46, mythique: 16 }
  },
  trone: {
    room: { rare: 8, epique: 92 },
    secret: { epique: 25, legendaire: 47, mythique: 28 }
  }
};

// Poids de la rareté pour une salle. `secret` bascule sur la table des salles
// cachées ; un donjon inconnu retombe sur la Crypte.
export function dropChances(dungeon, secret = false) {
  const table = DROP_TABLES[dungeon?.id] ?? DROP_TABLES.crypte;
  return table[secret ? 'secret' : 'room'];
}

// Tire un objet dans `pool` en respectant les poids de rareté. `taken` évite
// de servir deux fois le même objet dans une salle tant que le pool le permet.
// Fonction pure : le générateur `random` est injecté pour les tests.
export function rollLootItem(pool, chances, random = Math.random, taken = []) {
  const excluded = new Set(taken);
  let available = pool.filter((id) => LOOT[id] && !excluded.has(id));
  if (available.length === 0) available = pool.filter((id) => LOOT[id]);
  if (available.length === 0) return null;

  const byRarity = new Map();
  for (const id of available) {
    const rarity = LOOT[id].rarity;
    if (!byRarity.has(rarity)) byRarity.set(rarity, []);
    byRarity.get(rarity).push(id);
  }

  // On ne garde que les raretés disponibles qui ont un poids positif. Si la
  // table n’en mentionne aucune (salle atypique), toutes les raretés présentes
  // ont le même poids.
  let keys = RARITY_ORDER.filter((rarity) => byRarity.has(rarity)
    && (chances?.[rarity] ?? 0) > 0);
  let weights = keys.map((rarity) => chances[rarity]);
  if (keys.length === 0) {
    keys = RARITY_ORDER.filter((rarity) => byRarity.has(rarity));
    weights = keys.map(() => 1);
  }

  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = random() * total;
  let chosen = keys[keys.length - 1];
  for (let i = 0; i < keys.length; i++) {
    roll -= weights[i];
    if (roll < 0) {
      chosen = keys[i];
      break;
    }
  }

  const items = byRarity.get(chosen);
  return items[Math.floor(random() * items.length)] ?? items[items.length - 1];
}

// Silhouettes d'armes dessinées en main (voir public/js/weapons.js) :
// dague courte, épée, hache et lame longue. Une arme sans `art` connu tombe
// sur l'épée.
export const WEAPON_ARTS = [
  'dague',
  'coutelas',
  'epee',
  'epee_gemme',
  'epee_runes',
  'lame',
  'cimeterre',
  'lame_onde',
  'fauchon',
  'hache',
  'marteau',
  'fleau',
  'trident',
  'lance',
  'harpon',
  'sceptre'
];

// Emplacements d'équipement, dans l'ordre où l'inventaire les affiche. Un
// objet s'équipe dans le slot qui porte le nom de son `kind`.
export const EQUIP_SLOTS = ['arme', 'armure', 'talisman'];

// Icônes 16 × 16 du butin, dessinées en ASCII. `b` prend la couleur de l'objet.
export const ITEM_ICONS = {
  arme: {
    palette: { k: '#1b1424', g: '#e0a83c', h: '#8a5a33' },
    rows: [
      '................',
      '............kk..',
      '...........kbbk.',
      '..........kbbk..',
      '.........kbbk...',
      '........kbbk....',
      '.......kbbk.....',
      '......kbbk......',
      '.....kbbk.......',
      '....kbbk........',
      '...kbbk.........',
      '..kkkkkk........',
      '..kgggk.........',
      '..kkkkk.........',
      '...khk..........',
      '....k...........'
    ]
  },
  armure: {
    palette: { k: '#1b1424' },
    rows: [
      '................',
      '................',
      '..kkk....kkk....',
      '.kbbkkkkkkbbk...',
      '.kbbbbbbbbbbk...',
      '.kbbbbbbbbbbk...',
      '.kbbbbbbbbbbk...',
      '.kbbbbbbbbbbk...',
      '..kbbbbbbbbk....',
      '..kbbbbbbbbk....',
      '..kbbbbbbbbk....',
      '..kbbbbbbbbk....',
      '..kbbbbbbbbk....',
      '...kkkkkkkk.....',
      '................',
      '................'
    ]
  },
  talisman: {
    palette: { k: '#1b1424' },
    rows: [
      '................',
      '....kk....kk....',
      '...kbbk..kbbk...',
      '....kbbkkbbk....',
      '.....kkbbkk.....',
      '......kbbk......',
      '.....kkkkkk.....',
      '....kbbbbbbk....',
      '...kbbbbbbbbk...',
      '...kbbbbbbbbk...',
      '...kbbbbbbbbk...',
      '....kbbbbbbk....',
      '.....kbbbbk.....',
      '......kkkk......',
      '................',
      '................'
    ]
  }
};

// --- Monstres --------------------------------------------------------------

export const MONSTERS = {
  baveux: {
    name: 'Baveux',
    pv: 20,
    damage: 3,
    xp: 12,
    speed: 1.6,
    size: 12,
    tint: '#4fbf6a'
  },
  squelette: {
    name: 'Squelette',
    pv: 32,
    damage: 6,
    xp: 20,
    speed: 2.1,
    size: 13,
    tint: '#e8e4d0'
  },
  golem: {
    name: 'Golem',
    pv: 75,
    damage: 12,
    xp: 45,
    speed: 1.3,
    size: 15,
    tint: '#6d747c'
  },
  // Monstres des salles profondes et des passages secrets.
  araignee: {
    name: 'Araignée des fosses',
    pv: 24,
    damage: 4,
    xp: 16,
    speed: 2.7,
    size: 11,
    tint: '#8b5a9e'
  },
  spectre: {
    name: 'Spectre',
    pv: 48,
    damage: 9,
    xp: 30,
    speed: 1.8,
    size: 14,
    tint: '#9fe8f7'
  },
  ombre: {
    name: 'Ombre du gardien',
    pv: 110,
    damage: 16,
    xp: 70,
    speed: 1.9,
    size: 16,
    tint: '#7a5cd6'
  },
  // Créatures des expéditions avancées.
  noye: {
    name: 'Noyé des abysses',
    pv: 58,
    damage: 10,
    xp: 38,
    speed: 1.7,
    size: 14,
    tint: '#4f9ec0'
  },
  gargouille: {
    name: 'Gargouille',
    pv: 64,
    damage: 11,
    xp: 42,
    speed: 2.6,
    size: 13,
    tint: '#8d7f6a'
  },
  seigneur: {
    name: 'Seigneur du néant',
    pv: 180,
    damage: 20,
    xp: 110,
    speed: 1.6,
    size: 17,
    tint: '#ff5f7a'
  }
};

// --- Donjons ---------------------------------------------------------------

// Chaque donjon enchaîne plusieurs salles : l'escalier du bas mène à la salle
// suivante, et celui de la dernière salle ramène au village. Toutes les salles
// cachent aussi une **fissure** dans un mur (une seule par expédition, tirée
// avec la graine) qui ouvre une salle secrète : plus petite, plus dangereuse,
// avec un butin qu'on ne trouve nulle part ailleurs.
//
// `loot` liste tout le butin possible du donjon (pour le panneau du portail) ;
// chaque salle n'utilise que sa propre liste.
export const DUNGEONS = [
  {
    id: 'crypte',
    name: 'Crypte des brumes',
    level: 1,
    danger: 'Calme',
    accent: '#7ee08a',
    // Décor de ses salles (voir public/js/decor.js) : la Crypte est la seule
    // en pierre moussue, chaque autre donjon a le sien.
    decor: 'crypte',
    intro: 'Deux salles basses sous le village, et des murs qui craquent…',
    // Où se trouvent les fissures : une par salle secrète, sur des murs
    // différents d'un donjon à l'autre.
    cracks: ['est_milieu'],
    rooms: [
      {
        name: 'Crypte des brumes',
        intro: 'Des baveux rampent entre les piliers. Deux coffres t’attendent.',
        monsters: ['baveux', 'baveux'],
        chests: 2,
        loot: ['dague', 'tunique', 'plume_noire', 'casque_os']
      },
      {
        name: 'Ossuaire effondré',
        intro: 'Des toiles pleines d’yeux et des baveux : trois coffres au fond.',
        monsters: ['baveux', 'araignee', 'baveux'],
        chests: 3,
        loot: ['epee_courte', 'tunique', 'coutelas', 'casque_os']
      }
    ],
    secrets: [
      {
        name: 'Crypte oubliée',
        intro: 'Derrière la fissure, une salle que personne n’a pillée.',
        monsters: ['araignee', 'araignee'],
        chests: 1,
        loot: ['lame_brumes']
      }
    ],
    loot: ['dague', 'tunique', 'epee_courte', 'coutelas', 'casque_os', 'plume_noire',
      'lame_brumes']
  },
  {
    id: 'galerie',
    name: 'Galerie des échos',
    level: 2,
    danger: 'Risqué',
    accent: '#8ff0f7',
    decor: 'galerie',
    intro: 'Les squelettes ont entendu tes pas. Un puits descend dans le noir.',
    cracks: ['ouest_milieu', 'nord_ouest'],
    rooms: [
      {
        name: 'Galerie des échos',
        intro: 'Trois squelettes montent la garde. Trois coffres brillent dans le noir.',
        monsters: ['squelette', 'squelette', 'baveux'],
        chests: 3,
        loot: ['hache', 'mailles', 'plastron', 'dent_loup']
      },
      {
        name: 'Puits des murmures',
        intro: 'La galerie se resserre : un spectre flotte au-dessus des coffres.',
        monsters: ['squelette', 'spectre', 'baveux'],
        chests: 3,
        loot: ['lame_brumes', 'hache', 'mailles', 'lame_veilleur']
      },
      {
        name: 'Passage des échos creux',
        intro: 'Des voix qui ne sont pas les tiennes te suivent entre les piliers.',
        monsters: ['spectre', 'squelette', 'baveux'],
        chests: 3,
        loot: ['plastron', 'hache', 'mailles', 'boussole_rouillee']
      }
    ],
    secrets: [
      {
        name: 'Chambre des échos',
        intro: 'Les murs y répètent chaque pas. Deux spectres gardent un coffre.',
        monsters: ['spectre', 'spectre'],
        chests: 1,
        loot: ['epee_gardien']
      },
      {
        name: 'Réduit du collectionneur',
        intro: 'Derrière le mur ouest : des trophées et une lance qui n’attend que toi.',
        monsters: ['spectre', 'squelette'],
        chests: 1,
        loot: ['lance_ombres']
      }
    ],
    loot: ['hache', 'mailles', 'plastron', 'dent_loup', 'lame_veilleur',
      'boussole_rouillee', 'lame_brumes', 'epee_gardien', 'lance_ombres']
  },
  {
    id: 'antre',
    name: 'Antre du gardien',
    level: 3,
    danger: 'Mortel',
    accent: '#f6d34d',
    decor: 'antre',
    intro: 'Trois salles de plus en plus profondes. Le gardien n’est pas seul.',
    cracks: ['est_haut', 'ouest_bas', 'sud_ouest'],
    rooms: [
      {
        name: 'Antre du gardien',
        intro: 'Deux golems montent la garde. Leur butin vaut le détour… si tu survis.',
        monsters: ['golem', 'golem', 'squelette'],
        chests: 3,
        loot: ['gantelets', 'plastron', 'mailles', 'plastron_cloute']
      },
      {
        name: 'Boyau des ombres',
        intro: 'Un boyau s’enfonce plus loin : araignées, spectre et golem s’y mêlent.',
        monsters: ['araignee', 'spectre', 'golem'],
        chests: 3,
        loot: ['armure_gardien', 'epee_gardien', 'gantelets', 'heaume_cristal']
      },
      {
        name: 'Salle des cristaux fêlés',
        intro: 'La lumière s’y brise en éclats. Les cristaux cachent des coffres.',
        monsters: ['araignee', 'squelette', 'spectre'],
        chests: 3,
        loot: ['mailles', 'plastron', 'gantelets', 'dent_golem']
      },
      {
        name: 'Cœur de l’antre',
        intro: 'Le fond de l’antre. Deux golems et une araignée veillent sur les derniers coffres.',
        monsters: ['golem', 'araignee', 'golem'],
        chests: 2,
        loot: ['epee_gardien', 'armure_gardien', 'plastron_cloute']
      }
    ],
    secrets: [
      {
        name: 'Antre oublié',
        intro: 'L’ombre du gardien t’attend, seule dans le noir. Deux coffres légendaires.',
        monsters: ['ombre'],
        chests: 2,
        loot: ['lame_ombre', 'cape_ombre']
      },
      {
        name: 'Cachette du gardien',
        intro: 'Un muret de pierre dissimule un troisième coffre, scellé depuis des années.',
        monsters: ['ombre', 'araignee'],
        chests: 1,
        loot: ['cape_ombre']
      },
      {
        name: 'Sanctuaire du gardien',
        intro: 'Une broche d’or repose sur l’autel. L’ombre qui la garde ne dort jamais.',
        monsters: ['ombre', 'golem'],
        chests: 2,
        loot: ['broche_gardien', 'cape_ombre']
      }
    ],
    loot: ['gantelets', 'plastron', 'mailles', 'plastron_cloute', 'heaume_cristal',
      'dent_golem', 'armure_gardien', 'epee_gardien', 'lame_ombre', 'cape_ombre',
      'broche_gardien']
  },
  // --- Expéditions avancées ------------------------------------------------
  // `requires` liste les donjons à conquérir avant d'ouvrir celui-ci. Les trois
  // premiers sont libres ; les suivants s'enchaînent (4 → 5 → 6).
  {
    id: 'abysses',
    name: 'Abysses noyées',
    level: 4,
    danger: 'Sans retour',
    accent: '#5fd0ff',
    decor: 'abysses',
    requires: ['crypte', 'galerie', 'antre'],
    intro: 'Sous l’antre, l’eau noire monte. Il faut les trois sceaux pour y descendre.',
    cracks: ['nord_ouest', 'sud_est', 'est_bas', 'ouest_haut'],
    rooms: [
      {
        name: 'Abysses noyées',
        intro: 'Des noyés sortent de l’eau en silence. Trois coffres sur la berge.',
        monsters: ['noye', 'noye', 'spectre'],
        chests: 3,
        loot: ['trident_abysses', 'armure_gardien', 'lame_brumes', 'lame_givre']
      },
      {
        name: 'Gouffre sans fond',
        intro: 'La galerie plonge : un noyé rôde autour d’une ombre du gardien.',
        monsters: ['noye', 'ombre', 'noye'],
        chests: 3,
        loot: ['trident_abysses', 'plastron', 'epee_gardien', 'heaume_cristal']
      },
      {
        name: 'Nef engloutie',
        intro: 'Une coque brisée, des spectres et deux coffres au sec.',
        monsters: ['noye', 'noye', 'spectre'],
        chests: 2,
        loot: ['armure_gardien', 'lame_brumes', 'dent_golem']
      },
      {
        name: 'Salle des marées',
        intro: 'L’eau monte et redescend au rythme d’une respiration.',
        monsters: ['noye', 'spectre', 'noye'],
        chests: 3,
        loot: ['epee_gardien', 'trident_abysses', 'plastron', 'lame_veilleur']
      },
      {
        name: 'Fosse des lampes',
        intro: 'Des lampes flottent sur l’eau noire. Certaines bougent contre le courant.',
        monsters: ['noye', 'ombre', 'spectre'],
        chests: 3,
        loot: ['armure_gardien', 'plastron', 'trident_abysses', 'plastron_cloute']
      }
    ],
    secrets: [
      {
        name: 'Cœur noyé',
        intro: 'Sous la coque, l’eau est tiède et une ombre garde le trésor.',
        monsters: ['ombre', 'noye'],
        chests: 2,
        loot: ['lame_abysses', 'cuirasse_abysses', 'epee_orage']
      },
      {
        name: 'Alcôve des perles',
        intro: 'Une faille du mur nord, un harpon planté dans le corail… et sa gardienne.',
        monsters: ['ombre', 'noye'],
        chests: 1,
        loot: ['harpon_abysses']
      },
      {
        name: 'Cachot du noyé',
        intro: 'Derrière le mur sud : une cuirasse accrochée à un crochet de fer.',
        monsters: ['ombre', 'noye'],
        chests: 1,
        loot: ['cuirasse_abysses']
      },
      {
        name: 'Passage des lampes sourdes',
        intro: 'Le mur ouest s’ouvre sur une galerie d’épaulières, noyées jusqu’au cou.',
        monsters: ['ombre', 'noye'],
        chests: 2,
        loot: ['epaulieres_abysses', 'cuirasse_abysses', 'heaume_gardien']
      }
    ],
    loot: ['trident_abysses', 'armure_gardien', 'lame_brumes', 'plastron', 'epee_gardien',
      'lame_givre', 'heaume_cristal', 'dent_golem', 'lame_veilleur', 'plastron_cloute',
      'lame_abysses', 'cuirasse_abysses', 'harpon_abysses', 'epaulieres_abysses',
      'epee_orage', 'heaume_gardien']
  },
  {
    id: 'forge',
    name: 'Forge des cendres',
    level: 5,
    danger: 'Infernal',
    accent: '#ff9a5c',
    decor: 'forge',
    requires: ['abysses'],
    intro: 'Les abysses n’étaient que l’entrée : la fournaise tourne encore, seule.',
    cracks: ['ouest_haut', 'nord_est', 'sud_ouest', 'est_bas', 'nord_ouest'],
    rooms: [
      {
        name: 'Forge des cendres',
        intro: 'Des gargouilles tournent au-dessus des enclumes. Trois coffres.',
        monsters: ['gargouille', 'golem', 'gargouille'],
        chests: 3,
        loot: ['marteau_cendres', 'armure_gardien', 'trident_abysses']
      },
      {
        name: 'Soufflet brisé',
        intro: 'Le soufflet pend : gargouille, ombre et golem se partagent la salle.',
        monsters: ['gargouille', 'ombre', 'golem'],
        chests: 3,
        loot: ['marteau_cendres', 'trident_abysses', 'plastron']
      },
      {
        name: 'Atelier des lames',
        intro: 'Des lames à moitié forgées pendent au plafond et claquent dans la chaleur.',
        monsters: ['gargouille', 'gargouille', 'golem'],
        chests: 3,
        loot: ['marteau_cendres', 'armure_gardien', 'trident_abysses']
      },
      {
        name: 'Bassin de trempe',
        intro: 'L’eau y bout toute seule. Deux golems gardent les lingots.',
        monsters: ['golem', 'ombre', 'golem'],
        chests: 3,
        loot: ['trident_abysses', 'plastron', 'marteau_cendres']
      },
      {
        name: 'Passage de la braise',
        intro: 'Le sol est tiède. Marche vite, ou brûle.',
        monsters: ['gargouille', 'golem', 'ombre'],
        chests: 3,
        loot: ['marteau_cendres', 'trident_abysses', 'armure_gardien']
      },
      {
        name: 'Grande fournaise',
        intro: 'La chaleur plie l’air. Deux golems et une gargouille gardent deux coffres.',
        monsters: ['golem', 'gargouille', 'golem'],
        chests: 2,
        loot: ['marteau_cendres', 'trident_abysses']
      }
    ],
    secrets: [
      {
        name: 'Enclume des cendres',
        intro: 'L’enclume d’origine : une ombre et une gargouille, deux coffres mythiques.',
        monsters: ['ombre', 'gargouille'],
        chests: 2,
        loot: ['fleau_cendres', 'bouclier_cendres', 'heaume_gardien']
      },
      {
        name: 'Réserve de charbon',
        intro: 'Une réserve close par un mur clair. Un casque repose sur les sacs.',
        monsters: ['gargouille', 'ombre'],
        chests: 1,
        loot: ['casque_cendres', 'sceau_neant']
      },
      {
        name: 'Salle des éperons',
        intro: 'Derrière le mur sud : des armures de travail, et une épée pour les vaincre.',
        monsters: ['ombre', 'gargouille'],
        chests: 1,
        loot: ['epee_cendres', 'lame_givre']
      },
      {
        name: 'Réduit du maître forgeur',
        intro: 'Ses gantelets sont encore sur l’établi. Quelqu’un les garde.',
        monsters: ['ombre', 'golem'],
        chests: 2,
        loot: ['gantelets_cendres', 'bouclier_cendres', 'heaume_cristal']
      },
      {
        name: 'Fosse à scories',
        intro: 'Le mur nord s’effondre sur une fosse pleine de ferraille brûlante.',
        monsters: ['ombre', 'gargouille'],
        chests: 2,
        loot: ['epee_cendres', 'casque_cendres']
      }
    ],
    loot: ['marteau_cendres', 'armure_gardien', 'trident_abysses', 'plastron',
      'heaume_cristal', 'lame_givre', 'fleau_cendres', 'bouclier_cendres',
      'casque_cendres', 'epee_cendres', 'gantelets_cendres', 'heaume_gardien',
      'sceau_neant']
  },
  {
    id: 'trone',
    name: 'Trône du néant',
    level: 6,
    danger: 'Néant',
    accent: '#ff5f7a',
    decor: 'trone',
    requires: ['forge'],
    intro: 'Au-delà de la forge, un trône attend celui qui a tout vaincu.',
    cracks: ['sud_ouest', 'est_milieu', 'ouest_bas', 'nord_ouest', 'sud_est', 'est_haut'],
    rooms: [
      {
        name: 'Marches du trône',
        intro: 'Des gargouilles montent la garde sur les marches.',
        monsters: ['gargouille', 'spectre', 'gargouille'],
        chests: 3,
        loot: ['epee_neant', 'marteau_cendres', 'armure_gardien']
      },
      {
        name: 'Salle des serments',
        intro: 'Deux ombres et un spectre prêtent serment dans le noir.',
        monsters: ['ombre', 'ombre', 'spectre'],
        chests: 3,
        loot: ['epee_neant', 'trident_abysses', 'plastron']
      },
      {
        name: 'Galerie des portraits',
        intro: 'Des visages peints te suivent du regard. Leurs cadres cachent des coffres.',
        monsters: ['spectre', 'ombre', 'gargouille'],
        chests: 3,
        loot: ['epee_neant', 'marteau_cendres', 'trident_abysses']
      },
      {
        name: 'Chambre des lames',
        intro: 'Des lames plantées dans le sol, alignées comme une garde d’honneur.',
        monsters: ['gargouille', 'gargouille', 'ombre'],
        chests: 3,
        loot: ['epee_neant', 'trident_abysses', 'armure_gardien']
      },
      {
        name: 'Escalier du vide',
        intro: 'On y monte sans voir le haut. Les spectres flottent à contre sens.',
        monsters: ['spectre', 'spectre', 'ombre'],
        chests: 3,
        loot: ['epee_neant', 'marteau_cendres', 'plastron']
      },
      {
        name: 'Salle du miroir brisé',
        intro: 'Le miroir te rend ton reflet… et celui de deux ombres.',
        monsters: ['ombre', 'gargouille', 'spectre'],
        chests: 3,
        loot: ['epee_neant', 'trident_abysses', 'marteau_cendres']
      },
      {
        name: 'Trône du néant',
        intro: 'Le seigneur du néant t’attend, seul, devant les derniers coffres.',
        monsters: ['seigneur'],
        chests: 2,
        loot: ['epee_neant', 'marteau_cendres']
      }
    ],
    secrets: [
      {
        name: 'Antichambre du néant',
        intro: 'Derrière le trône : une ombre veille sur le seigneur endormi.',
        monsters: ['ombre', 'seigneur'],
        chests: 2,
        loot: ['lame_neant', 'couronne_neant', 'fauchon_neant', 'anneau_trone']
      },
      {
        name: 'Garderobe du souverain',
        intro: 'Un voile noir pend au mur, et personne ne le porte… encore.',
        monsters: ['seigneur', 'ombre'],
        chests: 1,
        loot: ['voile_neant']
      },
      {
        name: 'Cachot des régents',
        intro: 'Trois régents ont péri ici. Le sceptre est resté, lui.',
        monsters: ['seigneur', 'ombre'],
        chests: 1,
        loot: ['sceptre_neant', 'gantelets_orage']
      },
      {
        name: 'Dernier réduit',
        intro: 'La dernière salle du monde, et son dernier trésor.',
        monsters: ['ombre', 'seigneur'],
        chests: 1,
        loot: ['couronne_neant']
      },
      {
        name: 'Salle du masque',
        intro: 'Le mur est cache un masque de pourpre. Il te regarde déjà.',
        monsters: ['seigneur', 'ombre'],
        chests: 2,
        loot: ['masque_neant', 'voile_neant']
      },
      {
        name: 'Trésor du néant',
        intro: 'Ce qu’il reste du royaume, derrière un dernier mur qui tremble.',
        monsters: ['seigneur', 'seigneur'],
        chests: 2,
        loot: ['sceptre_neant', 'masque_neant']
      }
    ],
    loot: ['epee_neant', 'marteau_cendres', 'armure_gardien', 'trident_abysses', 'plastron',
      'lame_neant', 'couronne_neant', 'voile_neant', 'sceptre_neant', 'masque_neant',
      'fauchon_neant', 'anneau_trone', 'gantelets_orage']
  }
];

export function getDungeon(id) {
  return DUNGEONS.find((dungeon) => dungeon.id === id) ?? null;
}

// Un donjon est ouvert quand tous ceux listés dans `requires` sont conquis
// (un `Set` d'identifiants, relu depuis le navigateur). Sans `requires`, il
// est ouvert dès le départ : ce sont les trois donjons du village.
export function dungeonUnlocked(dungeon, conquered) {
  const requires = dungeon?.requires ?? [];
  if (requires.length === 0) return true;
  if (!conquered || typeof conquered.has !== 'function') return false;
  return requires.every((id) => conquered.has(id));
}

// Donjons encore à conquerir pour ouvrir celui-ci (pour l'invite du portail).
export function missingDungeons(dungeon, conquered) {
  return (dungeon?.requires ?? [])
    .filter((id) => !(conquered && typeof conquered.has === 'function' && conquered.has(id)))
    .map((id) => getDungeon(id))
    .filter(Boolean);
}

// Donjons ouverts d'emblée (les trois du village), et ceux qui s'enchaînent.
export function starterDungeons() {
  return DUNGEONS.filter((dungeon) => !dungeon.requires?.length);
}

export function dungeonOfItem(id) {
  return DUNGEONS.find((dungeon) => dungeon.loot.includes(id)) ?? null;
}

// Compte les salles, monstres et coffres d'un donjon (salles secrètes
// comprises) : le panneau du portail affiche ces totaux.
export function dungeonTotals(dungeon) {
  const rooms = dungeon?.rooms ?? [];
  const secrets = dungeon?.secrets ?? [];
  return {
    rooms: rooms.length,
    secrets: secrets.length,
    monsters: rooms.reduce((sum, room) => sum + room.monsters.length, 0)
      + secrets.reduce((sum, room) => sum + room.monsters.length, 0),
    chests: rooms.reduce((sum, room) => sum + room.chests, 0)
      + secrets.reduce((sum, room) => sum + room.chests, 0),
    secret: secrets.length > 0
  };
}

// --- Génération des salles -------------------------------------------------

// Deux gabarits : les salles ordinaires (21 × 17) et les salles secrètes,
// plus petites et plus étouffantes (15 × 11).
const LAYOUTS = {
  room: {
    w: 21,
    h: 17,
    // Piliers fixes : ils ne bouchent jamais le couloir central.
    pillars: [[4, 4], [4, 8], [4, 12], [16, 4], [16, 8], [16, 12]],
    spawn: { x: 10.5, y: 13.6 },
    exitX: 10,
    minSpawnDistance: 5,
    chestSpots: [
      { x: 2.5, y: 2.5 },
      { x: 18.5, y: 2.5 },
      { x: 10.5, y: 3.5 },
      { x: 3.5, y: 13.5 },
      { x: 17.5, y: 13.5 },
      { x: 10.5, y: 9.5 }
    ],
    monsterSpots: [
      { x: 5.5, y: 11.5 },
      { x: 15.5, y: 11.5 },
      { x: 7.5, y: 4.5 },
      { x: 13.5, y: 4.5 },
      { x: 10.5, y: 7.5 },
      { x: 4.5, y: 6.5 },
      { x: 16.5, y: 6.5 },
      { x: 6.5, y: 14.5 },
      { x: 14.5, y: 14.5 },
      { x: 3.5, y: 8.5 },
      { x: 17.5, y: 8.5 }
    ]
  },
  secret: {
    w: 15,
    h: 11,
    pillars: [[3, 3], [11, 3], [3, 7], [11, 7]],
    spawn: { x: 7.5, y: 7.6 },
    exitX: 7,
    minSpawnDistance: 3.5,
    chestSpots: [
      { x: 7.5, y: 2.5 },
      { x: 2.5, y: 5.5 },
      { x: 12.5, y: 5.5 }
    ],
    monsterSpots: [
      { x: 4.5, y: 4.5 },
      { x: 10.5, y: 4.5 },
      { x: 3.5, y: 8.5 },
      { x: 11.5, y: 8.5 },
      { x: 5.5, y: 2.5 },
      { x: 9.5, y: 2.5 }
    ]
  }
};

export const ROOM_W = LAYOUTS.room.w;
export const ROOM_H = LAYOUTS.room.h;
export const ROOM_SPAWN = { ...LAYOUTS.room.spawn };
export const ROOM_EXIT = { x: LAYOUTS.room.exitX + 0.5, y: ROOM_H - 1 + 0.35 };

// Fissures des salles ordinaires : chaque donjon choisit ses propres
// emplacements. `tile` est la tuile de mur fissurée (dessinée et pulsante),
// `approach` le point d'où l'on peut l'atteindre depuis l'intérieur.
// Les noms servent de clé dans `dungeon.cracks`.
// Portée volontairement courte : il faut se coller à la fissure pour y
// entrer. Plus large, un coup porté à un monstre proche déclenchait le
// passage en salle secrète.
export const SECRET_RANGE = 0.85;
export const CRACK_SPOTS = {
  est_milieu: { tile: { x: ROOM_W - 1, y: 8 }, approach: { x: ROOM_W - 1.6, y: 8.5 } },
  est_haut: { tile: { x: ROOM_W - 1, y: 4 }, approach: { x: ROOM_W - 1.6, y: 4.5 } },
  est_bas: { tile: { x: ROOM_W - 1, y: 12 }, approach: { x: ROOM_W - 1.6, y: 12.5 } },
  ouest_milieu: { tile: { x: 0, y: 8 }, approach: { x: 1.6, y: 8.5 } },
  ouest_haut: { tile: { x: 0, y: 4 }, approach: { x: 1.6, y: 4.5 } },
  ouest_bas: { tile: { x: 0, y: 12 }, approach: { x: 1.6, y: 12.5 } },
  nord_ouest: { tile: { x: 5, y: 0 }, approach: { x: 5.5, y: 1.6 } },
  nord_est: { tile: { x: 14, y: 0 }, approach: { x: 14.5, y: 1.6 } },
  sud_ouest: { tile: { x: 5, y: ROOM_H - 1 }, approach: { x: 5.5, y: ROOM_H - 2.5 } },
  sud_est: { tile: { x: 14, y: ROOM_H - 1 }, approach: { x: 14.5, y: ROOM_H - 2.5 } }
};
export const CRACK_SPOT_KEYS = Object.keys(CRACK_SPOTS);

function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Un joueur expose sa position locale en `rx`/`ry` (et sa position serveur en
// `x`/`y`). On privilégie la position locale pour les interactions.
function pointOf(pos) {
  return { x: pos.rx ?? pos.x ?? 0, y: pos.ry ?? pos.y ?? 0 };
}

function canStand(world, x, y, radius = PLAYER_RADIUS) {
  return !isSolid(world, Math.floor(x - radius), Math.floor(y - radius))
    && !isSolid(world, Math.floor(x + radius), Math.floor(y - radius))
    && !isSolid(world, Math.floor(x - radius), Math.floor(y + radius))
    && !isSolid(world, Math.floor(x + radius), Math.floor(y + radius));
}

// Salle commune : dalles de pierre, plaques de mousse, piliers, escalier au
// milieu du mur du bas. `layoutName` vaut 'room' ou 'secret'. `crackSpot` est
// la clé de la fissure à placer dans ce mur (salles ordinaires seulement).
// La salle retient aussi le décor de son donjon (`decor`) : c'est le rendu qui
// choisit ainsi les dalles et les murs, sans que dungeons.js connaisse les
// couleurs.
export function buildRoom(dungeon, seed = 1, layoutName = 'room', crackSpot = null) {
  const layout = LAYOUTS[layoutName] ?? LAYOUTS.room;
  const w = layout.w;
  const h = layout.h;
  const tiles = new Uint8Array(w * h);
  const random = mulberry32(seed ^ 0x5f3a91);
  const decor = DECORS[dungeon.decor] ? dungeon.decor : DEFAULT_DECOR;
  // Variante de décor propre à la salle : elle change la densité du motif
  // (mousse, runes, braises…) et le décalage des dalles, donc deux salles ne se
  // ressemblent pas tout à fait. Les graines des salles diffèrent de 7919,
  // qui n'est pas un multiple de 3 : trois salles de suite prennent donc les
  // trois variantes.
  const variant = (seed >>> 0) % 3;
  const accentChance = 0.04 + variant * 0.015;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1;
      let tile = edge ? T.STONE_WALL : T.STONE_FLOOR;
      if (!edge && ((x * 3 + y * 5) % 7 === 0 || random() < accentChance)) tile = T.MOSS;
      tiles[y * w + x] = tile;
    }
  }

  for (const [x, y] of layout.pillars) tiles[y * w + x] = T.STONE_WALL;

  // Escalier : vers la salle suivante, la sortie ou la salle d'origine.
  tiles[(h - 1) * w + layout.exitX] = T.DOOR_STONE;

  const spot = layoutName === 'room' && crackSpot ? CRACK_SPOTS[crackSpot] : null;
  const room = {
    w,
    h,
    tiles,
    dungeon,
    decor,
    variant,
    spawn: { ...layout.spawn },
    exit: { x: layout.exitX + 0.5, y: h - 1 + 0.35 },
    // Point d'où l'on peut atteindre la fissure (salles ordinaires seulement).
    crack: spot ? { ...spot.approach } : null,
    crackTile: spot ? { ...spot.tile } : null,
    crackSpot: spot ? crackSpot : null,
    hasCrack: false
  };

  // La place de départ reste toujours dégagée.
  for (let y = room.spawn.y - 1.2; y <= room.spawn.y + 1; y++) {
    for (let x = room.spawn.x - 1.2; x <= room.spawn.x + 1.2; x++) {
      if (!isSolid(room, Math.floor(x), Math.floor(y))) continue;
      room.tiles[Math.floor(y) * w + Math.floor(x)] = T.STONE_FLOOR;
    }
  }

  return room;
}

function shuffled(list, random) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Prépare une salle : tuiles, monstres, coffres et leur butin. Tout est tiré
// une fois pour toutes, donc un même `seed` donne exactement la même
// expédition (utile pour les tests).
function createRoomEntry(dungeon, spec, seed, { hidden = false, crackSpot = null } = {}) {
  const layoutName = hidden ? 'secret' : 'room';
  const layout = LAYOUTS[layoutName];
  const random = mulberry32(seed ^ 0x9e3779b9);
  const room = buildRoom(dungeon, seed, layoutName, crackSpot);

  const chestSpots = shuffled(layout.chestSpots, random).slice(0, spec.chests);
  // Le contenu de chaque coffre est tiré séparément, avec les poids de rareté
  // de la salle : un même donjon ne sert donc pas toujours les mêmes objets.
  // Une salle secrète puise dans tout le butin du donjon, ce qui rend le butin
  // d’élite possible sans être garanti.
  const lootPool = hidden ? dungeon.loot : spec.loot;
  const chances = dropChances(dungeon, hidden);
  const taken = [];
  const chests = chestSpots.map((spot) => {
    const item = rollLootItem(lootPool, chances, random, taken);
    if (item) taken.push(item);
    return { x: spot.x, y: spot.y, opened: false, item };
  });

  // Les monstres commencent loin de l'escalier : on ne se fait pas encercler
  // à la seconde où l'on pose le pied dans la salle.
  const monsterSpots = shuffled(layout.monsterSpots, random)
    .filter((spot) => distance(spot, layout.spawn) >= layout.minSpawnDistance)
    .filter((spot) => chests.every((chest) => distance(spot, chest) > 1.4));

  const monsters = spec.monsters.map((type, index) => {
    const stats = MONSTERS[type] ?? MONSTERS.baveux;
    const spot = monsterSpots[index] ?? layout.monsterSpots[index % layout.monsterSpots.length];
    return {
      id: `${hidden ? 'secret' : 'salle'}-${index}-${type}`,
      type,
      name: stats.name,
      x: spot.x,
      y: spot.y,
      pv: stats.pv,
      pvMax: stats.pv,
      damage: stats.damage,
      xp: stats.xp ?? 0,
      speed: stats.speed,
      size: stats.size,
      tint: stats.tint,
      dir: 'down',
      moving: false,
      alive: true,
      flash: 0,
      cd: 0
    };
  });

  return { spec, random, room, chests, monsters, cleared: false, hidden };
}

// Active une salle : c'est elle que le reste du module interroge
// (`run.room`, `run.monsters`, `run.chests`).
function activateEntry(run, entry) {
  run.roomEntry = entry;
  run.room = entry.room;
  run.monsters = entry.monsters;
  run.chests = entry.chests;
  run.cleared = entry.cleared;
  run.grace = ENTRY_GRACE;
}// Prépare une expédition complète : toutes les salles du donjon, les salles
// secrètes, et les fissures cachées dans des salles ordinaires distinctes.
// Chaque salle secrète possède sa propre fissure, à l'emplacement déclaré par
// le donjon (`cracks`) : elles ne sont donc jamais toutes au même mur.
export function createRun(dungeonId, seed = 1, relics = null) {  const dungeon = getDungeon(dungeonId) ?? (()=>{
    if (!DUNGEONS.length) throw new Error('Aucun donjon disponible');
    return DUNGEONS[0];
  })();

  const relic = relics ?? {};
  const random = mulberry32(seed ^ 0x51ed27);
  const rooms = dungeon.rooms.map((spec, index) => (
    createRoomEntry(dungeon, spec, seed + index * 7919)
  ));

  const secretSpecs = dungeon.secrets;
  // Les murs fissurés viennent du donjon, mais l'ordre change avec la graine :
  // une même expédition ne révèle donc pas toujours les mêmes murs.
  const spotKeys = shuffled(
    (dungeon.cracks?.length ? dungeon.cracks : CRACK_SPOT_KEYS).slice(),
    random
  );

  // Les fissures occupent des salles ordinaires distinctes (toutes sauf la
  // dernière, qu'on quitte par l'escalier). Les emplacements de mur viennent
  // de `dungeon.cracks` : la première fissure du donjon n'est donc pas toujours
  // au même endroit d'un donjon à l'autre.
  const hostPool = shuffled(
    rooms.map((_, index) => index).filter((index) => index < rooms.length - 1),
    random
  );
  const secretRoomIndices = [];
  secretSpecs.forEach((spec, index) => {
    const roomIndex = hostPool[index % hostPool.length];
    const spot = spotKeys[index % spotKeys.length];
    const host = rooms[roomIndex];
    host.hasCrack = true;
    host.crackIndex = index;
    host.room.hasCrack = true;
    host.room.crack = { ...CRACK_SPOTS[spot].approach };
    host.room.crackTile = { ...CRACK_SPOTS[spot].tile };
    host.room.crackSpot = spot;
    secretRoomIndices[roomIndex] = index;
  });

  const secrets = secretSpecs.map((spec, index) => (
    createRoomEntry(dungeon, spec, seed ^ (0x7a3d11 + index * 7919), { hidden: true })
  ));

  const run = {
    dungeon,
    seed,
    random,
    // Effets chiffrés des récompenses du village (voir `relicEffects` dans
    // houses.js). La lampe allonge la portée de détection des fissures.
    relics: { ...relic },
    secretRange: SECRET_RANGE + Math.max(0, Number(relic.secretRange) || 0),
    rooms,
    secrets,
    secretRoomIndices,
    secretsFound: secretSpecs.map(() => false),
    secretIndex: 0,

    secretReturn: null,
    roomIndex: 0,
    pv: BASE_STATS.pv,
    pvMax: BASE_STATS.pv,
    phase: 'run', // run | won | dead
    attackCd: 0,
    swing: 0,
    swingDir: 'down',
    // Animation du tourbillon (touche F), décomptée par updateRun.
    spinTime: 0,
    grace: ENTRY_GRACE,
    // Capacités du personnage : `prepareAbilities` (skills.js) remplit les
    // charges de ruade selon l'arbre ; les compteurs existent dès la création
    // pour que le rendu et les tests n'aient jamais de champ manquant.
    dashMax: 0,
    dashCharges: 0,
    dashCd: 0,
    dashTime: 0,
    dashDir: null,
    specialCd: 0,
    invuln: 0,
    reviveUsed: false,sinceHit: REGEN_DELAY,
    floaters: [],
    dashKills: [],
    timeLeft: 180,
    message: dungeon.intro
  };

  activateEntry(run, rooms[0]);
  run.message = rooms[0].spec.intro;
  return run;
}

// --- Progression entre salles ---------------------------------------------

// Numéro affiché : les salles secrètes viennent après les salles ordinaires,
// dans l'ordre où elles ont étéouvertes.
export function roomNumber(run) {
  return run.inSecret ? run.rooms.length + run.secretIndex + 1 : run.roomIndex + 1;
}

export function roomCount(run) {
  return run.rooms.length + (run.secrets?.length ?? 0);
}

// Libellé affiché dans le panneau : les salles secrètes ont leur propre
// numérotation, puisqu'on y entre par les fissures et dans n'importe quel ordre.
export function roomLabel(run) {
  if (run.inSecret) {
    return `salle secrète ${(run.secretIndex ?? 0) + 1}/${run.secrets?.length ?? 1}`;
  }
  return `salle ${run.roomIndex + 1}/${run.rooms.length}`;
}

export function isLastRoom(run) {
  return run.inSecret || run.roomIndex >= run.rooms.length - 1;
}

// Ce que fait l'escalier de la salle courante : descendre, remonter de la
// salle secrète, ou sortir du donjon.
export function exitAction(run) {
  if (run.inSecret) return 'secret';
  return isLastRoom(run) ? 'out' : 'next';
}

// Descend d'une salle. Retourne la nouvelle salle, ou null si l'on est déjà
// au fond (ou dans la salle secrète).
export function nextRoom(run) {
  if (run.inSecret || isLastRoom(run)) return null;
  run.roomIndex += 1;
  const entry = run.rooms[run.roomIndex];
  activateEntry(run, entry);
  run.message = entry.spec.intro;
  run.dashKills = [];
  return entry;
}

// Ouvre la fissure : la salle secrète de l'expédition.
export function enterSecretRoom(run) {
  const entry = run.rooms[run.roomIndex];
  if (run.inSecret || !entry?.hasCrack || !hasSecretLamp(run)) return null;
  const index = entry.crackIndex ?? 0;
  const secret = run.secrets?.[index];
  if (!secret) return null;
  run.inSecret = true;
  run.secretIndex = index;
  if (run.secretsFound) run.secretsFound[index] = true;
  run.secretFound = true;
  run.secretReturn = { ...entry.room.crack };
  activateEntry(run, secret);
  run.message = secret.spec.intro;
  return secret;
}

// Ressort de la salle secrète vers la salle où se trouve la fissure.
export function leaveSecretRoom(run) {
  if (!run.inSecret) return null;
  run.inSecret = false;
  const entry = run.rooms[run.roomIndex];
  activateEntry(run, entry);
  run.message = entry.spec.intro;
  return entry;
}

// Le joueur est-il devant la fissure d'une salle qui en cache une ?
function hasSecretLamp(run) {
  return Number(run.relics?.secretRange) > 0;
}

export function crackNear(run, pos) {
  const entry = run.rooms[run.roomIndex];
  if (run.inSecret || !entry?.hasCrack || !entry.room.crack || !hasSecretLamp(run)) return false;
  return distance(pointOf(pos), entry.room.crack) <= (run.secretRange ?? SECRET_RANGE);
}

// --- Combat et exploration -------------------------------------------------

// Angle du geste de frappe, en degrés : 0 = arme vers le haut, positif = sens
// horaire (vers la droite de l'écran). `progress` va de 0 (début du geste) à 1
// (retour au repos). Le calcul est pur, donc testable sans navigateur ; le
// rendu s'en sert pour faire tourner l'arme tenue en main.
export function swingAngle(progress) {
  const value = Number.isFinite(progress) ? progress : 0;
  const p = Math.max(0, Math.min(1, value));
  if (p < 0.3) return -70 * (p / 0.3); // armé en arrière
  if (p < 0.65) {
    const t = (p - 0.3) / 0.35;
    const ease = 1 - (1 - t) * (1 - t); // départ sec, arrivée souple
    return -70 + 160 * ease;
  }
  return 90 * (1 - (p - 0.65) / 0.35); // retour au repos
}

// Direction du coup : vers la cible si elle est connue, sinon celle du regard.
export function aimDirection(from, target) {
  if (!target) return from?.dir ?? 'down';
  const dx = target.x - from.x;
  const dy = target.y - from.y;
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'left' : 'right';
  return dy < 0 ? 'up' : 'down';
}

export function addFloater(run, x, y, text, color) {
  run.floaters.push({ x, y, text, color, life: 0.9, drift: 0 });
  if (run.floaters.length > 24) run.floaters.shift();
}

function updateFloaters(run, dt) {
  for (const floater of run.floaters) {
    floater.life -= dt;
    floater.drift += dt * 22;
  }
  run.floaters = run.floaters.filter((floater) => floater.life > 0);
}

function monsterInRange(run, pos, range = ATTACK_RANGE) {
  let best = null;
  let bestDistance = Infinity;
  const point = pointOf(pos);
  for (const monster of run.monsters) {
    if (!monster.alive) continue;
    const d = distance(point, monster);
    if (d > range) continue;
    if (d < bestDistance) {
      bestDistance = d;
      best = monster;
    }
  }
  return best;
}

// Butin laissé par un monstre : la chance dépend de l'équipement de fortune
// (Œil du fouilleur) et la liste vient de la salle où l'on se trouve. Le tirage
// suit les mêmes poids de rareté que les coffres, donc un monstre d'une salle
// secrète peut lâcher un objet d'élite, mais rarement.
function rollDrop(run, stats) {
  const chance = Math.min(0.95, stats?.dropChance ?? DROP_CHANCE);
  if (run.random() >= chance) return null;
  const hidden = Boolean(run.roomEntry?.hidden);
  const pool = hidden ? run.dungeon.loot : (run.roomEntry?.spec?.loot ?? run.dungeon.loot);
  return rollLootItem(pool, dropChances(run.dungeon, hidden), run.random);
}

// Dégâts d'un coup : Exécution ajoute un bonus contre un monstre déjà
// affaibli, et la valeur reste toujours au moins 1.
function strikeDamage(stats, target) {
  const base = Math.max(1, Math.round(stats.attack));
  const weakened = target.pvMax > 0 && target.pv / target.pvMax <= EXECUTE_THRESHOLD;
  const bonus = weakened ? 1 + Math.max(0, stats.execute ?? 0) : 1;
  return Math.max(1, Math.round(base * bonus));
}

// Monstre à portée de coup, ou null : sert aussi à l'invite « Attaquer ».
export function monsterNear(run, pos) {
  return monsterInRange(run, pos);
}

export function chestNear(run, pos) {
  const point = pointOf(pos);
  return run.chests.find((chest) => !chest.opened && distance(point, chest) <= CHEST_RANGE) ?? null;
}

export function openChest(run, pos) {
  const chest = chestNear(run, pos);
  if (!chest) return null;
  chest.opened = true;
  return chest.item;
}

export function nearExit(room, pos) {
  return distance(pointOf(pos), room.exit) < 1.6;
}

// Un coup : touche le monstre le plus proche s'il est à portée. Retourne
// { hit, killed, drop, damage } ou null si le coup part trop tôt.
export function attackRun(run, player, stats) {
  if (run.phase === 'dead') return null;
  if (run.attackCd > 0) return null;

  run.attackCd = stats?.attackCd ?? ATTACK_COOLDOWN;
  run.swing = SWING_TIME;

  const range = ATTACK_RANGE + Math.max(0, (stats?.range ?? ATTACK_RANGE) - ATTACK_RANGE);
  const target = monsterInRange(run, player, range);
  // Le personnage (et son arme) se tournent vers le monstre frappé.
  run.swingDir = aimDirection(pointOf(player), target);
  if (player && typeof player === 'object' && 'dir' in player) player.dir = run.swingDir;
  if (!target) return { hit: null, killed: null, drop: null, damage: 0 };

  const damage = strikeDamage(stats, target);
  target.pv = Math.max(0, target.pv - damage);
  target.flash = 0.16;
  addFloater(run, target.x, target.y - 1, `-${damage}`, '#ffe9a8');

  if (target.pv > 0) return { hit: target, killed: null, drop: null, damage };

  target.alive = false;
  target.moving = false;
  // Le butin tombé vient de la salle où l'on se trouve : plus on descend, plus
  // il est intéressant.
  const drop = rollDrop(run, stats);
  return { hit: target, killed: target, drop, damage };
}

// Tourbillon (touche F) : un coup circulaire qui frappe **tous** les monstres
// autour du personnage. Il faut l'avoir débloqué et attendre la fin du délai.
// Retourne { hits, kills, drops } ou null si le coup ne part pas.
export function specialAttack(run, player, stats) {
  if (run.phase === 'dead') return null;
  if (!stats?.special) return null;
  if (run.specialCd > 0) return null;

  run.specialCd = SPECIAL_COOLDOWN;
  run.swing = SWING_TIME * 1.7;
  run.spinTime = SPIN_TIME;

  const point = pointOf(player);
  const bonusRange = Math.max(0, (stats.range ?? ATTACK_RANGE) - ATTACK_RANGE);
  const reach = SPECIAL_RANGE + bonusRange;
  const targets = run.monsters.filter((monster) => (
    monster.alive && distance(point, monster) <= reach
  ));

  // On se tourne vers le monstre le plus proche, même hors de portée : le
  // geste ne part jamais dans le vide quand un ennemi est visible.
  let nearest = null;
  let nearestDistance = Infinity;
  for (const monster of run.monsters) {
    if (!monster.alive) continue;
    const d = distance(point, monster);
    if (d < nearestDistance) {
      nearestDistance = d;
      nearest = monster;
    }
  }
  run.swingDir = nearest ? aimDirection(point, nearest) : (player?.dir ?? 'down');
  if (player && typeof player === 'object' && 'dir' in player) player.dir = run.swingDir;

  const kills = [];
  const drops = [];
  for (const target of targets) {
    const damage = Math.max(1, Math.round(strikeDamage(stats, target) * SPECIAL_MULT));
    target.pv = Math.max(0, target.pv - damage);
    target.flash = 0.16;
    addFloater(run, target.x, target.y - 1, `-${damage}`, '#ffd08a');
    if (target.pv > 0) continue;

    target.alive = false;
    target.moving = false;
    kills.push(target);
    const drop = rollDrop(run, stats);
    if (drop) drops.push(drop);
  }

  return { hits: targets.length, kills, drops };
}

// Avance l'expédition : les monstres poursuivent, frappent au contact, et les
// coffres tous ouverts déclarent la salle nettoyée.
export function updateRun(run, player, dt, stats) {
  const events = { damage: 0, dead: false, cleared: false, finished: false, healed: 0, revived: false };
  if (run.attackCd > 0) run.attackCd = Math.max(0, run.attackCd - dt);
  if (run.swing > 0) run.swing = Math.max(0, run.swing - dt);
  if (run.spinTime > 0) run.spinTime = Math.max(0, run.spinTime - dt);
  if (run.grace > 0) run.grace = Math.max(0, run.grace - dt);
  if (run.invuln > 0) run.invuln = Math.max(0, run.invuln - dt);
  updateFloaters(run, dt);

  if (run.phase === 'dead') return events;

  const defense = Math.max(0, stats?.defense ?? 0);

  // Régénération : elle ne démarre qu'après REGEN_DELAY secondes sans coup
  // encaissé, sinon elle rendrait chaque combat interminable.
  run.sinceHit = (run.sinceHit ?? 0) + dt;
  const regen = Math.max(0, stats?.regen ?? 0);
  if (regen > 0 && run.sinceHit >= REGEN_DELAY && run.pv < run.pvMax) {
    const heal = Math.min(run.pvMax - run.pv, regen * dt);
    run.pv += heal;
    events.healed += heal;
  }

  for (const monster of run.monsters) {
    if (!monster.alive) continue;
    if (monster.flash > 0) monster.flash = Math.max(0, monster.flash - dt);
    if (monster.cd > 0) monster.cd = Math.max(0, monster.cd - dt);

    const dx = player.rx - monster.x;
    const dy = player.ry - monster.y;
    const d = Math.hypot(dx, dy) || 0.0001;

    if (d < MONSTER_AGGRO && d > 0.72) {
      const step = Math.min(monster.speed * dt, d - 0.7);
      const nx = monster.x + (dx / d) * step;
      const ny = monster.y + (dy / d) * step;
      if (canStand(run.room, nx, monster.y, MONSTER_RADIUS)) monster.x = nx;
      if (canStand(run.room, monster.x, ny, MONSTER_RADIUS)) monster.y = ny;
      if (Math.abs(dx) > Math.abs(dy)) monster.dir = dx < 0 ? 'left' : 'right';
      else monster.dir = dy < 0 ? 'up' : 'down';
      monster.moving = step > 0.001;
    } else {
      monster.moving = false;
    }

    // Pendant une ruade avec Esquive, aucun contact ne porte.
    if (d <= CONTACT_RANGE && monster.cd <= 0 && run.grace <= 0 && run.invuln <= 0) {
      const amount = Math.max(1, monster.damage - defense);
      monster.cd = MONSTER_COOLDOWN;
      run.pv = Math.max(0, run.pv - amount);
      run.sinceHit = 0;
      events.damage += amount;
      addFloater(run, player.rx, player.ry - 1.2, `-${amount}`, '#ff9a8a');
      if (run.pv <= 0) {
        // Second souffle : une fois par expédition, on se relève au lieu de
        // mourir, avec un court répit pour sortir du cercle.
        if (stats?.revive && !run.reviveUsed) {
          run.reviveUsed = true;
          run.pv = Math.max(1, Math.round(run.pvMax * SECOND_WIND_RATIO));
          run.invuln = 2;
          run.grace = Math.max(run.grace, 1);
          run.sinceHit = 0;
          events.revived = true;
          addFloater(run, player.rx, player.ry - 1.6, 'Second souffle !', '#8ff0f7');
          continue;
        }
        run.phase = 'dead';
        events.dead = true;
        break;
      }
    }

    // Ruade : quand le joueur traverse un monstre, le frappe en passant.
    if (run.dashTime > 0 && d <= CONTACT_RANGE && monster.cd <= 0) {
      const baseAttack = stats != null && stats.attack != null ? Math.round(stats.attack) : BASE_STATS.attack;
      const dashDmg = Math.max(1, Math.round(baseAttack * RUNNING_DAMAGE_MULT));
      monster.pv = Math.max(0, monster.pv - dashDmg);
      monster.flash = 0.16;
      monster.cd = MONSTER_COOLDOWN;
      addFloater(run, monster.x, monster.y - 1, `-${dashDmg}`, '#ffe9a8');
      if (monster.pv <= 0) {
        monster.alive = false;
        monster.moving = false;
        const drop = rollDrop(run, stats);
        run.dashKills = run.dashKills || [];
        run.dashKills.push({ monster, drop });
      }
    }
  }

  if (!events.dead && !run.roomEntry.cleared && run.chests.every((chest) => chest.opened)) {
    run.roomEntry.cleared = true;
    run.cleared = true;
    events.cleared = true;
    run.message = run.inSecret
      ? 'La salle secrète est vidée : la fissure reste ouverte derrière toi.'
      : `Salle nettoyée : ${run.roomEntry.spec.name}.`;

    // Le donjon n'est « fini » que quand toutes les salles ordinaires sont
    // vidées ; la salle secrète reste un bonus facultatif.
    if (run.phase === 'run' && run.rooms.every((entry) => entry.cleared)) {
      run.phase = 'won';
      events.finished = true;
    }
  }

  return events;
}

// --- Équipement ------------------------------------------------------------

export function createVault() {
  return { coins: 0, items: {}, equipped: { arme: null, armure: null, talisman: null } };
}

// Libellé de la bourse : « 1 pièce », « 24 pièces ».
export function coinsLabel(coins) {
  const value = Math.max(0, Math.floor(Number(coins) || 0));
  return `${value} pièce${value > 1 ? 's' : ''}`;
}

export function ownsItem(vault, id) {
  return (vault.items?.[id] ?? 0) > 0;
}

export function itemCount(vault, id) {
  return vault.items?.[id] ?? 0;
}

export function addItem(vault, id) {
  if (!LOOT[id]) return false;
  vault.items[id] = (vault.items[id] ?? 0) + 1;
  return true;
}

// Équipe l'objet, ou le retire s'il était déjà équipé.
// Retourne 'equipped', 'unequipped' ou null (objet absent / inconnu).
export function equipItem(vault, id) {
  const item = LOOT[id];
  if (!item || !ownsItem(vault, id)) return null;
  const slot = item.kind;
  if (vault.equipped[slot] === id) {
    vault.equipped[slot] = null;
    return 'unequipped';
  }
  vault.equipped[slot] = id;
  return 'equipped';
}

export function unequipSlot(vault, slot) {
  if (!(slot in vault.equipped) || !vault.equipped[slot]) return null;
  const previous = vault.equipped[slot];
  vault.equipped[slot] = null;
  return previous;
}

export function isEquipped(vault, id) {
  return Object.values(vault.equipped).includes(id);
}

// Identifiant de l'arme tenue en main (celle qui s'affiche dans le sprite),
// ou null à mains nues.
export function equippedWeapon(vault) {
  const id = vault?.equipped?.arme;
  return id && LOOT[id] ? id : null;
}

// Additionne l'équipement porté. Les armes et armures apportent l'attaque et
// la défense ; les talismans ajoutent des effets plus discrets (PV, régénération,
// expérience, butin, portée) et peuvent accélérer la cadence de frappe.
export function gearStats(vault) {
  const stats = {
    attack: 0,
    defense: 0,
    pv: 0,
    regen: 0,
    xpBonus: 0,
    dropBonus: 0,
    range: 0,
    execute: 0,
    attackCd: 1
  };
  for (const slot of EQUIP_SLOTS) {
    const item = LOOT[vault?.equipped?.[slot]];
    if (!item) continue;
    stats.attack += item.attack ?? 0;
    stats.defense += item.defense ?? 0;
    for (const key of ['pv', 'regen', 'xpBonus', 'dropBonus', 'range', 'execute']) {
      if (typeof item[key] === 'number') stats[key] += item[key];
    }
    if (typeof item.attackCd === 'number') stats.attackCd *= item.attackCd;
  }
  return stats;
}

// Statistiques réelles du personnage : base + équipement + compétences.
// L'armure ajoute aussi des points de vie (2 par point de défense). Sans
// arbre fourni, on obtient exactement les statistiques d'avant les
// compétences, ce qui garde les anciens appels (et les tests) valables.
export function playerStats(vault, skills = null, relics = null) {
  const gear = gearStats(vault ?? createVault());
  const bonus = skills ? skillEffects(skills) : skillEffects(null);
  const relic = relics ?? {};
  return {
    attack: BASE_STATS.attack + gear.attack + bonus.attack,
    defense: gear.defense + bonus.defense,
    pvMax: BASE_STATS.pv + gear.defense * 2 + gear.pv + bonus.pv
      + (Number(relic.pv) || 0),
    // Effets utilitaires : consommés par le combat et le déplacement.
    speed: bonus.speed,
    xpBonus: bonus.xpBonus + gear.xpBonus + (Number(relic.xpBonus) || 0),
    dropChance: Math.min(0.95, DROP_CHANCE + bonus.dropBonus + gear.dropBonus
      + (Number(relic.dropBonus) || 0)),
    attackCd: ATTACK_COOLDOWN * bonus.attackCd * gear.attackCd,
    range: ATTACK_RANGE + bonus.range + gear.range,
    execute: bonus.execute + gear.execute,
    regen: bonus.regen + gear.regen + (Number(relic.regen) || 0),
    revive: bonus.revive,
    special: bonus.special,
    dash: bonus.dash
  };
}

// Relit une sauvegarde sans faire confiance au contenu du navigateur.
export function sanitizeVault(raw) {
  const vault = createVault();
  if (!raw || typeof raw !== 'object') return vault;
  const coins = Math.floor(Number(raw.coins));
  if (Number.isFinite(coins) && coins > 0) vault.coins = Math.min(999999, coins);
  const items = raw.items && typeof raw.items === 'object' ? raw.items : {};
  for (const [id, count] of Object.entries(items)) {
    if (!LOOT[id]) continue;
    const value = Math.floor(Number(count));
    if (!Number.isFinite(value) || value <= 0) continue;
    vault.items[id] = Math.min(99, value);
  }
  const equipped = raw.equipped && typeof raw.equipped === 'object' ? raw.equipped : {};
  for (const slot of EQUIP_SLOTS) {
    const id = equipped[slot];
    if (typeof id !== 'string' || !LOOT[id] || LOOT[id].kind !== slot) continue;
    if (!ownsItem(vault, id)) continue;
    vault.equipped[slot] = id;
  }
  return vault;
}

// --- Dessin ----------------------------------------------------------------

function glow(ctx, cx, cy, radius, color) {
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
}

// Portail du village : un cercle de pierre et un tourbillon lumineux.
export function drawPortal(ctx, portal, now) {
  const cx = portal.x * TILE_SIZE;
  const cy = portal.y * TILE_SIZE;
  const pulse = 0.5 + 0.5 * Math.sin(now / 520);

  glow(ctx, cx, cy, 34 + pulse * 6, `rgba(122, 96, 214, ${0.26 + 0.12 * pulse})`);

  // Dalles du cercle.
  ctx.fillStyle = '#4b4f63';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 2, 22, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3a3d50';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 2, 17, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tourbillon.
  for (let i = 0; i < 3; i++) {
    const angle = now / (420 + i * 130) + (i * Math.PI * 2) / 3;
    const rx = 11 - i * 2.5;
    const ry = 6 - i * 1.4;
    ctx.strokeStyle = `rgba(180, 156, 255, ${0.75 - i * 0.16})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 1, rx, ry, angle * 0.4, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = `rgba(226, 214, 255, ${0.35 + 0.35 * pulse})`;
  ctx.beginPath();
  ctx.arc(cx, cy, 3.5 + pulse, 0, Math.PI * 2);
  ctx.fill();

  // Deux piliers de pierre encadrent le portail.
  ctx.fillStyle = '#6b6f86';
  ctx.fillRect(cx - 24, cy - 16, 5, 20);
  ctx.fillRect(cx + 19, cy - 16, 5, 20);
  ctx.fillStyle = '#8589a3';
  ctx.fillRect(cx - 25, cy - 19, 7, 4);
  ctx.fillRect(cx + 18, cy - 19, 7, 4);
}

function drawChest(ctx, chest, now) {
  const cx = chest.x * TILE_SIZE;
  const cy = chest.y * TILE_SIZE;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 5, 9, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  if (!chest.opened) {
    const pulse = 0.5 + 0.5 * Math.sin(now / 380 + chest.x);
    glow(ctx, cx, cy, 16, `rgba(246, 211, 77, ${0.16 + 0.12 * pulse})`);
  }

  // Coffre : caisse en bois, ferrures, couvercle.
  ctx.fillStyle = '#6b4a2f';
  ctx.fillRect(cx - 8, cy - 4, 16, 8);
  ctx.fillStyle = '#8a6238';
  ctx.fillRect(cx - 8, cy - 8, 16, 5);
  ctx.fillStyle = '#4a3220';
  ctx.fillRect(cx - 8, cy - 4, 16, 2);
  ctx.fillRect(cx - 2, cy - 8, 1, 12);
  ctx.fillStyle = '#c9a24a';
  ctx.fillRect(cx - 8, cy - 8, 2, 12);
  ctx.fillRect(cx + 6, cy - 8, 2, 12);

  if (chest.opened) {
    ctx.fillStyle = '#241a05';
    ctx.fillRect(cx - 6, cy - 7, 12, 2);
  } else {
    ctx.fillStyle = '#f6d34d';
    ctx.fillRect(cx - 1, cy - 2, 2, 3);
  }
}

// Escalier de la salle : flèche vers le bas quand il mène à la salle suivante,
// vers le haut quand il ramène au village (ou à la salle d'origine).
function drawExitStairs(ctx, run, now) {
  const room = run.room;
  const cx = room.exit.x * TILE_SIZE;
  const cy = (room.h - 1) * TILE_SIZE + 8;
  const pulse = 0.5 + 0.5 * Math.sin(now / 500);
  const descending = exitAction(run) === 'next';
  const accent = descending ? run.dungeon.accent : '#f0e2b8';

  glow(ctx, cx, cy, 20, `rgba(232, 214, 164, ${0.18 + 0.14 * pulse})`);
  ctx.save();
  ctx.translate(cx, cy);
  if (descending) ctx.scale(1, -1);
  ctx.fillStyle = `rgba(255, 244, 214, ${0.55 + 0.3 * pulse})`;
  ctx.beginPath();
  ctx.moveTo(0, -4);
  ctx.lineTo(5, 1);
  ctx.lineTo(2, 1);
  ctx.lineTo(2, 5);
  ctx.lineTo(-2, 5);
  ctx.lineTo(-2, 1);
  ctx.lineTo(-5, 1);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.5 + 0.3 * pulse;
  ctx.fillRect(cx - 14, cy - 2, 4, 2);
  ctx.fillRect(cx + 10, cy - 2, 4, 2);
  ctx.globalAlpha = 1;
}

// La fissure ne se révèle que si le joueur est dans sa portée de détection.
export function crackVisible(run, pos) {
  const host = run.inSecret ? null : run.rooms[run.roomIndex];
  return Boolean(host?.hasCrack && crackNear(run, pos));
}

// Fissure d'un mur : elle pulse doucement, mais ne se révèle qu'à portée.
function drawCrack(ctx, room, now) {
  if (!room?.crackTile) return;
  const cx = room.crackTile.x * TILE_SIZE + 8;
  const cy = room.crackTile.y * TILE_SIZE + 8;
  const pulse = 0.5 + 0.5 * Math.sin(now / 420);

  glow(ctx, cx, cy, 15, `rgba(160, 120, 255, ${0.12 + 0.12 * pulse})`);
  ctx.strokeStyle = 'rgba(14, 12, 20, 0.9)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 5, cy - 7);
  ctx.lineTo(cx - 2, cy - 3);
  ctx.lineTo(cx - 4, cy);
  ctx.lineTo(cx - 1, cy + 3);
  ctx.lineTo(cx - 3, cy + 7);
  ctx.moveTo(cx - 2, cy - 3);
  ctx.lineTo(cx + 3, cy - 5);
  ctx.moveTo(cx - 4, cy);
  ctx.lineTo(cx + 2, cy + 2);
  ctx.stroke();

  ctx.strokeStyle = `rgba(190, 150, 255, ${0.3 + 0.35 * pulse})`;
  ctx.beginPath();
  ctx.moveTo(cx - 2, cy - 3);
  ctx.lineTo(cx - 1, cy + 4);
  ctx.stroke();
}

// Décor d'un donjon : escalier, fissure éventuelle, coffres, chiffres flottants.
export function drawRun(ctx, run, now, pos = null) {
  drawExitStairs(ctx, run, now);

  const host = run.inSecret ? run.rooms[run.roomIndex] : run.roomEntry;
  const player = pos ?? run.playerPos;
  if (player && crackVisible(run, player)) {
    drawCrack(ctx, host.room, now);
  }

  for (const chest of run.chests) drawChest(ctx, chest, now);

  ctx.font = 'bold 9px ui-monospace, "Cascadia Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const floater of run.floaters) {
    ctx.globalAlpha = Math.max(0, Math.min(1, floater.life * 1.6));
    ctx.fillStyle = floater.color;
    ctx.fillText(floater.text, floater.x * TILE_SIZE, floater.y * TILE_SIZE - 14 - floater.drift);
  }
  ctx.globalAlpha = 1;
}

// Un monstre, dessiné au sol à sa position. `run` sert à savoir s'il vient
// d'être touché.
export function drawMonster(ctx, monster, now) {
  const cx = monster.x * TILE_SIZE;
  const cy = monster.y * TILE_SIZE;
  const bob = monster.moving ? Math.round(Math.sin(now / 120) * 1.2) : Math.round(Math.sin(now / 700));

  ctx.fillStyle = 'rgba(8, 10, 14, 0.4)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 2, monster.size * 0.45, monster.size * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();

  const top = cy - monster.size + bob;

  if (monster.type === 'baveux') {
    ctx.fillStyle = '#2f8f4a';
    ctx.fillRect(cx - 7, cy - 4, 14, 6);
    ctx.fillRect(cx - 6, cy - 8, 12, 5);
    ctx.fillStyle = '#4fbf6a';
    ctx.fillRect(cx - 5, cy - 9, 10, 5);
    ctx.fillRect(cx - 8, cy - 3, 16, 4);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.fillRect(cx - 4, cy - 8, 3, 2);
    ctx.fillStyle = '#f7f2e6';
    ctx.fillRect(cx - 4, cy - 6, 2, 2);
    ctx.fillRect(cx + 2, cy - 6, 2, 2);
    ctx.fillStyle = '#241a2b';
    ctx.fillRect(cx - 4, cy - 5, 1, 1);
    ctx.fillRect(cx + 3, cy - 5, 1, 1);
  } else if (monster.type === 'squelette') {
    // Crâne.
    ctx.fillStyle = '#e8e4d0';
    ctx.fillRect(cx - 4, top + 1, 8, 6);
    ctx.fillStyle = '#f7f3e2';
    ctx.fillRect(cx - 3, top + 2, 6, 3);
    ctx.fillStyle = '#241a2b';
    ctx.fillRect(cx - 3, top + 3, 2, 2);
    ctx.fillRect(cx + 1, top + 3, 2, 2);
    // Cage thoracique et bras.
    ctx.fillStyle = '#cfc9b2';
    ctx.fillRect(cx - 1, top + 7, 2, 3);
    ctx.fillRect(cx - 4, top + 10, 8, 2);
    ctx.fillRect(cx - 3, top + 12, 6, 2);
    ctx.fillRect(cx - 6, top + 8, 2, 5);
    ctx.fillRect(cx + 4, top + 8, 2, 5);
    ctx.fillStyle = '#e8e4d0';
    ctx.fillRect(cx - 7, top + 13, 2, 2);
    ctx.fillRect(cx + 5, top + 13, 2, 2);
  } else if (monster.type === 'araignee') {
    // Araignée : huit pattes fines et un abdomen violet.
    ctx.strokeStyle = '#3a2148';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const y = cy - 8 + i * 2;
      ctx.moveTo(cx - 3, y);
      ctx.lineTo(cx - 8, y - 2 + i);
      ctx.moveTo(cx + 3, y);
      ctx.lineTo(cx + 8, y - 2 + i);
    }
    ctx.stroke();
    ctx.fillStyle = '#6d3f86';
    ctx.fillRect(cx - 4, cy - 9, 8, 7);
    ctx.fillRect(cx - 5, cy - 7, 10, 4);
    ctx.fillStyle = '#9b63b5';
    ctx.fillRect(cx - 3, cy - 8, 5, 2);
    ctx.fillStyle = '#f6d34d';
    ctx.fillRect(cx - 3, cy - 6, 2, 2);
    ctx.fillRect(cx + 1, cy - 6, 2, 2);
    ctx.fillStyle = '#241a2b';
    ctx.fillRect(cx - 3, cy - 5, 1, 1);
    ctx.fillRect(cx + 2, cy - 5, 1, 1);
  } else if (monster.type === 'spectre') {
    // Spectre : une capuche claire qui flotte au-dessus du sol.
    const float = Math.round(Math.sin(now / 300) * 2);
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#4c7a92';
    ctx.fillRect(cx - 6, top + 4 + float, 12, 9);
    for (let i = 0; i < 3; i++) ctx.fillRect(cx - 6 + i * 4, top + 12 + float, 3, 2);
    ctx.fillStyle = '#9fe8f7';
    ctx.fillRect(cx - 5, top + 1 + float, 10, 6);
    ctx.fillRect(cx - 4, top + 7 + float, 8, 2);
    ctx.fillStyle = '#0f1a22';
    ctx.fillRect(cx - 3, top + 3 + float, 2, 2);
    ctx.fillRect(cx + 1, top + 3 + float, 2, 2);
    ctx.globalAlpha = 1;
  } else if (monster.type === 'ombre') {
    // Ombre du gardien : silhouette noire, yeux et lame violets.
    ctx.fillStyle = '#141019';
    ctx.fillRect(cx - 7, top + 3, 14, 11);
    ctx.fillRect(cx - 9, top + 7, 3, 8);
    ctx.fillRect(cx + 6, top + 7, 3, 8);
    ctx.fillStyle = '#3a2b56';
    ctx.fillRect(cx - 6, top + 1, 12, 6);
    ctx.fillRect(cx - 6, top + 13, 12, 2);
    ctx.fillStyle = '#c78bff';
    ctx.fillRect(cx - 4, top + 3, 2, 2);
    ctx.fillRect(cx + 2, top + 3, 2, 2);
    ctx.fillRect(cx + 9, top - 2, 2, 13);
    ctx.fillStyle = '#7a5cd6';
    ctx.fillRect(cx + 8, top - 4, 2, 2);
  } else if (monster.type === 'noye') {
    // Noyé : silhouette gonflée d'eau, algues et gouttes qui tombent.
    ctx.fillStyle = '#2f6a86';
    ctx.fillRect(cx - 6, cy - 9, 12, 11);
    ctx.fillRect(cx - 7, cy - 6, 14, 5);
    ctx.fillStyle = '#4f9ec0';
    ctx.fillRect(cx - 5, cy - 12, 10, 6);
    ctx.fillStyle = '#2f8f8a';
    ctx.fillRect(cx - 5, cy - 13, 3, 2);
    ctx.fillRect(cx + 2, cy - 13, 3, 2);
    ctx.fillRect(cx - 6, cy - 8, 2, 4);
    ctx.fillStyle = '#d8f7ff';
    ctx.fillRect(cx - 4, cy - 11, 2, 2);
    ctx.fillRect(cx + 2, cy - 11, 2, 2);
    ctx.fillStyle = '#0f2a36';
    ctx.fillRect(cx - 2, cy - 6, 4, 1);
    const drip = Math.round(Math.sin(now / 240) * 2);
    ctx.fillStyle = 'rgba(120, 200, 230, 0.55)';
    ctx.fillRect(cx - 5, cy - 1 + drip, 1, 3);
    ctx.fillRect(cx + 4, cy + 1 - drip, 1, 2);
  } else if (monster.type === 'gargouille') {
    // Gargouille : ailes de pierre qui battent, cornes et yeux jaunes.
    const flap = Math.round(Math.sin(now / 160) * 2);
    ctx.fillStyle = '#6f6455';
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy - 10);
    ctx.lineTo(cx - 12, cy - 13 - flap);
    ctx.lineTo(cx - 10, cy - 6);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 4, cy - 10);
    ctx.lineTo(cx + 12, cy - 13 - flap);
    ctx.lineTo(cx + 10, cy - 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#8d7f6a';
    ctx.fillRect(cx - 4, cy - 9, 8, 9);
    ctx.fillStyle = '#a3957e';
    ctx.fillRect(cx - 4, cy - 13, 8, 5);
    ctx.fillRect(cx - 5, cy - 15, 2, 3);
    ctx.fillRect(cx + 3, cy - 15, 2, 3);
    ctx.fillStyle = '#ffd24a';
    ctx.fillRect(cx - 3, cy - 12, 2, 2);
    ctx.fillRect(cx + 1, cy - 12, 2, 2);
    ctx.fillStyle = '#4a4238';
    ctx.fillRect(cx - 4, cy - 1, 3, 2);
    ctx.fillRect(cx + 1, cy - 1, 3, 2);
  } else if (monster.type === 'seigneur') {
    // Seigneur du néant : grand manteau, couronne et lame rose.
    const float = Math.round(Math.sin(now / 420) * 2);
    glow(ctx, cx, cy - 6 + float, monster.size, 'rgba(255, 95, 122, 0.22)');
    ctx.fillStyle = '#1a0f1c';
    ctx.fillRect(cx - 8, top + 4 + float, 16, 12);
    ctx.beginPath();
    ctx.moveTo(cx - 8, top + 16 + float);
    ctx.lineTo(cx - 4, top + 13 + float);
    ctx.lineTo(cx, top + 16 + float);
    ctx.lineTo(cx + 4, top + 13 + float);
    ctx.lineTo(cx + 8, top + 16 + float);
    ctx.lineTo(cx + 8, top + 19 + float);
    ctx.lineTo(cx - 8, top + 19 + float);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#3a2030';
    ctx.fillRect(cx - 6, top + 1 + float, 12, 6);
    ctx.fillStyle = '#2a1224';
    ctx.fillRect(cx - 4, top + 2 + float, 8, 5);
    // Couronne.
    ctx.fillStyle = '#ffd24a';
    ctx.fillRect(cx - 4, top - 2 + float, 8, 2);
    ctx.fillRect(cx - 4, top - 4 + float, 1, 2);
    ctx.fillRect(cx - 1, top - 5 + float, 2, 3);
    ctx.fillRect(cx + 3, top - 4 + float, 1, 2);
    // Yeux et lame.
    ctx.fillStyle = '#ff5f7a';
    ctx.fillRect(cx - 3, top + 3 + float, 2, 2);
    ctx.fillRect(cx + 1, top + 3 + float, 2, 2);
    ctx.fillRect(cx + 9, top - 3 + float, 2, 14);
    ctx.fillStyle = '#ffd6e2';
    ctx.fillRect(cx + 9, top - 3 + float, 1, 6);
  } else {
    // Golem : gros blocs de pierre.
    ctx.fillStyle = '#565c63';
    ctx.fillRect(cx - 7, top + 3, 14, 11);
    ctx.fillStyle = '#6d747c';
    ctx.fillRect(cx - 6, top, 12, 8);
    ctx.fillRect(cx - 9, top + 5, 3, 8);
    ctx.fillRect(cx + 6, top + 5, 3, 8);
    ctx.fillStyle = '#8b939c';
    ctx.fillRect(cx - 5, top + 1, 5, 3);
    ctx.fillRect(cx - 5, top + 9, 4, 3);
    ctx.fillStyle = '#f6d34d';
    ctx.fillRect(cx - 4, top + 4, 2, 2);
    ctx.fillRect(cx + 2, top + 4, 2, 2);
    ctx.fillStyle = '#3b3b43';
    ctx.fillRect(cx - 1, top + 12, 2, 3);
  }

  // Coup reçu : un éclat blanc.
  if (monster.flash > 0) {
    ctx.globalAlpha = Math.min(0.8, monster.flash * 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - monster.size * 0.5, top, monster.size, monster.size + 2);
    ctx.globalAlpha = 1;
  }

  // Nom et points de vie, seulement quand le monstre est blessé.
  if (monster.alive && monster.pv < monster.pvMax) {
    const width = 22;
    const x = cx - width / 2;
    const y = top - 6 + bob;
    ctx.fillStyle = 'rgba(8, 10, 14, 0.85)';
    ctx.fillRect(x - 1, y - 1, width + 2, 5);
    ctx.fillStyle = '#8c2f2f';
    ctx.fillRect(x, y, width, 3);
    ctx.fillStyle = '#e0563f';
    ctx.fillRect(x, y, Math.max(1, (width * monster.pv) / monster.pvMax), 3);
  }
}
