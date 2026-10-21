// Maisons du village : intérieurs, épreuves et récompenses.
//
// Chaque maison est une « instance » privée : le joueur y entre seul, et
// l'intérieur n'est pas synchronisé avec les autres joueurs (le serveur reçoit
// juste l'information « je suis à l'intérieur » pour masquer l'avatar). Du coup
// la même logique sert en ligne et en solo, sans état partagé à maintenir.

import { T } from './map.js';

export const TILE_SIZE = 16;

// Distance (en tuiles) à laquelle on peut entrer / sortir d'une maison.
export const ENTER_RANGE = 1.8;
export const EXIT_RANGE = 1.6;

// Chaque récompense de maison donne un petit avantage au village **et** un
// effet réel en donjon. `relic` est la part chiffrée, lue par `relicEffects`
// puis passée à `playerStats` et à `createRun`.
export const REWARDS = {
  lampe: {
    name: 'Lampe du veilleur',
    detail: 'Sa flamme ne s’éteint pas sous terre : les fissures se trahissent de plus loin.',
    effect: 'halo de lumière autour du personnage',
    dungeonEffect: 'fissures repérées à 1,3 tuile de plus · +10 % de butin',
    relic: { secretRange: 1.3, dropBonus: 0.1 },
    house: 'Chaumière des runes'
  },
  bottes: {
    name: 'Bottes de vent',
    detail: 'Elles ne s’usent pas sur la pierre des donjons.',
    effect: 'vitesse +25 % au village',
    dungeonEffect: 'vitesse +25 % en donjon, ruades comprises',
    relic: { speed: 0.25 },
    house: 'Atelier des cristaux'
  },
  medaille: {
    name: 'Médaillon du sage',
    detail: 'Le savoir du sage veille sur toi, même dans le noir.',
    effect: 'aura dorée au-dessus de la tête',
    dungeonEffect: '+15 % d’XP · +5 PV · +0,5 PV/s',
    relic: { xpBonus: 0.15, pv: 5, regen: 0.5 },
    house: 'Maison du sage'
  }
};

// Additionne les effets chiffrés des récompenses obtenues. Un identifiant
// inconnu ou une sauvegarde abîmée est simplement ignoré.
export function relicEffects(rewards) {
  const out = { secretRange: 0, dropBonus: 0, xpBonus: 0, pv: 0, regen: 0, speed: 0 };
  if (!rewards || typeof rewards.has !== 'function') return out;
  for (const id of rewards) {
    const relic = REWARDS[id]?.relic;
    if (!relic) continue;
    for (const key of Object.keys(out)) {
      if (typeof relic[key] === 'number') out[key] += relic[key];
    }
  }
  return out;
}

// Chaque maison est scellée par un donjon : sa porte reste fermée tant que le
// donjon associé n'a pas été conquis (toutes ses salles ordinaires vidées).
const HOUSE_SPECS = [
  {
    id: 'runes',
    name: 'Chaumière des runes',
    article: 'la',
    challenge: 'runes',
    reward: 'lampe',
    requiredDungeon: 'crypte',
    goal: 'Allume les quatre runes dans l’ordre qu’elles t’ont montré.',
    rewardLine: 'Récompense : la Lampe du veilleur.'
  },
  {
    id: 'cristaux',
    name: 'Atelier des cristaux',
    article: 'l’',
    challenge: 'cristaux',
    reward: 'bottes',
    requiredDungeon: 'galerie',
    goal: 'Réveille les six cristaux avant la fin du sablier (32 s).',
    rewardLine: 'Récompense : les Bottes de vent.'
  },
  {
    id: 'devinettes',
    name: 'Maison du sage',
    article: 'la',
    challenge: 'devinettes',
    reward: 'medaille',
    requiredDungeon: 'antre',
    goal: 'Réponds aux trois énigmes du livre, sans une seule erreur.',
    rewardLine: 'Récompense : le Médaillon du sage.'
  }
];

// Nom précédé de son article défini : « la Chaumière des runes »,
// « l’Atelier des cristaux ». Évite les « de Atelier » dans les messages.
export function houseWithArticle(house) {
  const article = house?.article ?? 'la';
  if (!house?.name) return '';
  return article.endsWith('’') || article.endsWith("'") ? `${article}${house.name}` : `${article} ${house.name}`;
}

// Une maison est ouverte quand son donjon figure dans les donjons conquis
// (un `Set` d'identifiants, relu depuis le navigateur).
export function houseUnlocked(house, cleared) {
  if (!house?.requiredDungeon) return true;
  return Boolean(cleared && typeof cleared.has === 'function' && cleared.has(house.requiredDungeon));
}

// Maison scellée par un donjon donné (pour annoncer la récompense du donjon).
export function houseForDungeon(dungeonId, list) {
  return (list ?? []).find((house) => house.requiredDungeon === dungeonId) ?? null;
}

// Runes disposées en carré autour du tapis central.
export const RUNE_PADS = [
  { x: 3.5, y: 4.5 },
  { x: 11.5, y: 4.5 },
  { x: 3.5, y: 7.5 },
  { x: 11.5, y: 7.5 }
];

export const CRYSTAL_SPOTS = [
  { x: 2.5, y: 4.5 },
  { x: 12.5, y: 4.5 },
  { x: 4.5, y: 2.5 },
  { x: 10.5, y: 2.5 },
  { x: 4.5, y: 8.5 },
  { x: 10.5, y: 8.5 }
];

export const TOME = { x: 7.5, y: 2.9 };

export const QUIZ = [
  {
    question: 'Je tombe du ciel et je fais pousser les fleurs. Qui suis-je ?',
    options: ['La pluie', 'La neige', 'Le vent'],
    answer: 0
  },
  {
    question: 'On me suit partout, mais on ne me rattrape jamais. Qui suis-je ?',
    options: ['L’ombre', 'Le vent', 'La lune'],
    answer: 0
  },
  {
    question: 'J’ai des dents, pourtant je ne mords personne. Qui suis-je ?',
    options: ['Le peigne', 'Le renard', 'La rivière'],
    answer: 0
  }
];

// --- Construction ---------------------------------------------------------

// Associe chaque porte du monde à une maison (même ordre que les appels
// house(...) de generateWorld).
export function buildHouses(world) {
  const doors = world.doors ?? [];
  return HOUSE_SPECS.map((spec, index) => {
    const door = doors[index] ?? { x: 30, y: 24 };
    return {
      ...spec,
      index,
      door,
      stand: { x: door.x + 0.5, y: door.y + 1.6 }
    };
  }).filter((house) => house.door);
}

function shuffle(list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Intérieur commun : une salle dallée, un tapis, des meubles et une porte.
export function buildInterior(house) {
  const w = 15;
  const h = 11;
  const tiles = new Uint8Array(w * h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1;
      let tile = edge ? T.BRICK : T.WOOD;
      if (!edge && (x * 5 + y * 7) % 6 === 0) tile = T.PLANK;
      tiles[y * w + x] = tile;
    }
  }

  // Tapis central.
  for (let y = 4; y <= 7; y++) {
    for (let x = 5; x <= 9; x++) tiles[y * w + x] = T.RUG;
  }

  const put = (x, y, tile) => {
    if (x <= 0 || y <= 0 || x >= w - 1 || y >= h - 1) return;
    tiles[y * w + x] = tile;
  };

  // Mobilier le long des murs (décor solide).
  put(2, 1, T.SHELF);
  put(3, 1, T.SHELF);
  put(11, 1, T.SHELF);
  put(12, 1, T.SHELF);
  put(2, 2, T.CRATE);
  put(12, 2, T.CRATE);
  put(2, 8, T.CRATE);
  put(12, 8, T.CRATE);

  // Porte de sortie, au milieu du mur du bas.
  tiles[(h - 1) * w + 7] = T.DOOR_STONE;

  return {
    w,
    h,
    tiles,
    house,
    // Assez haut pour ne pas être déjà dans la zone de sortie en arrivant.
    spawn: { x: 7.5, y: 8.6 },
    exit: { x: 7.5, y: h - 1 + 0.35 }
  };
}

// --- Épreuves -------------------------------------------------------------

export function createChallenge(type) {
  if (type === 'runes') {
    return {
      type,
      phase: 'watch', // watch -> input -> won
      seq: shuffle([0, 1, 2, 3]),
      watchIndex: 0,
      wait: 900,
      step: 0,
      lastPad: -1,
      flash: 0,
      flashColor: '#7ee08a',
      message: 'Observe bien l’ordre des runes…'
    };
  }
  if (type === 'cristaux') {
    return {
      type,
      phase: 'run', // run -> won
      taken: CRYSTAL_SPOTS.map(() => false),
      time: 32,
      message: 'Cours toucher les six cristaux !'
    };
  }
  return {
    type: 'devinettes',
    phase: 'idle', // idle -> question -> won
    index: 0,
    message: 'Le livre du sage t’attend au fond de la salle.'
  };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function padAt(pos) {
  for (let i = 0; i < RUNE_PADS.length; i++) {
    if (distance(pos, RUNE_PADS[i]) < 0.8) return i;
  }
  return -1;
}

export function nearTome(pos) {
  return distance(pos, TOME) < 1.25;
}

export function nearExit(room, pos) {
  return distance(pos, room.exit) < EXIT_RANGE;
}

// Avance l'épreuve. Retourne 'won', 'retry' ou null.
export function updateChallenge(challenge, pos, dt) {
  if (challenge.type === 'runes') {
    if (challenge.flash > 0) challenge.flash = Math.max(0, challenge.flash - dt);
    if (challenge.phase === 'watch') {
      challenge.wait -= dt * 1000;
      if (challenge.wait <= 0) {
        challenge.watchIndex += 1;
        if (challenge.watchIndex >= challenge.seq.length) {
          challenge.phase = 'input';
          challenge.step = 0;
          challenge.wait = 0;
          challenge.message = 'À toi : reproduis la séquence.';
        } else {
          challenge.wait = 640;
        }
      }
      challenge.lastPad = padAt(pos);
      return null;
    }
    if (challenge.phase !== 'input') return null;

    const pad = padAt(pos);
    if (pad === challenge.lastPad) return null;
    challenge.lastPad = pad;
    if (pad < 0) return null;

    if (pad === challenge.seq[challenge.step]) {
      challenge.step += 1;
      challenge.flash = 0.18;
      challenge.flashColor = '#7ee08a';
      if (challenge.step >= challenge.seq.length) {
        challenge.phase = 'won';
        challenge.message = 'Les quatre runes brillent : épreuve réussie !';
        return 'won';
      }
      challenge.message = `Bien… ${challenge.step}/${challenge.seq.length}`;
      return null;
    }

    challenge.phase = 'watch';
    challenge.watchIndex = 0;
    challenge.wait = 700;
    challenge.step = 0;
    challenge.flash = 0.3;
    challenge.flashColor = '#e07e6a';
    challenge.message = 'Raté ! Regarde encore la séquence.';
    return 'wrong';
  }

  if (challenge.type === 'cristaux') {
    if (challenge.phase !== 'run') return null;
    challenge.time = Math.max(0, challenge.time - dt);
    for (let i = 0; i < CRYSTAL_SPOTS.length; i++) {
      if (challenge.taken[i]) continue;
      if (distance(pos, CRYSTAL_SPOTS[i]) < 0.75) challenge.taken[i] = true;
    }
    if (challenge.taken.every(Boolean)) {
      challenge.phase = 'won';
      challenge.message = 'Les six cristaux scintillent : épreuve réussie !';
      return 'won';
    }
    if (challenge.time <= 0) {
      challenge.taken = CRYSTAL_SPOTS.map(() => false);
      challenge.time = 32;
      challenge.message = 'Trop lent ! Le sablier se retourne, on recommence.';
      return 'retry';
    }
    return null;
  }

  return null;
}

// Réponse à une énigme (boutons du panneau). Retourne 'won', 'wrong', 'next'.
export function answerQuiz(challenge, index) {
  if (challenge.type !== 'devinettes' || challenge.phase !== 'question') return null;
  const question = QUIZ[challenge.index];
  if (index !== question.answer) {
    challenge.phase = 'question';
    challenge.index = 0;
    challenge.message = 'Faux ! On reprend à la première énigme.';
    return 'wrong';
  }
  challenge.index += 1;
  if (challenge.index >= QUIZ.length) {
    challenge.phase = 'won';
    challenge.message = 'Trois énigmes résolues : épreuve réussie !';
    return 'won';
  }
  challenge.message = `Bonne réponse (${challenge.index}/${QUIZ.length}).`;
  return 'next';
}

// Ouvre le livre des énigmes.
export function openQuiz(challenge) {
  if (challenge.type !== 'devinettes' || challenge.phase !== 'idle') return false;
  challenge.phase = 'question';
  challenge.index = 0;
  challenge.message = 'Réponds aux trois énigmes sans te tromper.';
  return true;
}

// --- Dessin des objets d'intérieur ---------------------------------------

function glow(ctx, cx, cy, radius, color) {
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawRune(ctx, pad, active, wrong) {
  const cx = pad.x * TILE_SIZE;
  const cy = pad.y * TILE_SIZE;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 5, 10, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#4b545c';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 1, 9, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#626d76';
  ctx.beginPath();
  ctx.ellipse(cx, cy - 1, 7.5, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();

  if (active) glow(ctx, cx, cy - 1, 18, wrong ? 'rgba(224,126,106,0.9)' : 'rgba(126,224,138,0.85)');

  ctx.fillStyle = active ? (wrong ? '#ffe3da' : '#e0ffe6') : '#37414a';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 6);
  ctx.lineTo(cx + 3.5, cy - 1);
  ctx.lineTo(cx, cy + 4);
  ctx.lineTo(cx - 3.5, cy - 1);
  ctx.closePath();
  ctx.fill();

  if (!active) {
    ctx.fillStyle = 'rgba(180, 210, 190, 0.18)';
    ctx.fillRect(cx - 1, cy - 2, 2, 1);
  }
}

function drawCrystal(ctx, spot, taken) {
  const cx = spot.x * TILE_SIZE;
  const cy = spot.y * TILE_SIZE;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 5, 7, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  if (taken) {
    ctx.fillStyle = '#2f6a72';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 2);
    ctx.lineTo(cx + 3, cy + 2);
    ctx.lineTo(cx, cy + 5);
    ctx.lineTo(cx - 3, cy + 2);
    ctx.closePath();
    ctx.fill();
    return;
  }

  glow(ctx, cx, cy - 2, 15, 'rgba(112, 232, 240, 0.5)');
  ctx.fillStyle = '#8ff0f7';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 9);
  ctx.lineTo(cx + 5, cy - 1);
  ctx.lineTo(cx, cy + 5);
  ctx.lineTo(cx - 5, cy - 1);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.fillRect(cx - 1, cy - 6, 1, 5);
}

function drawTome(ctx, challenge, now) {
  const cx = TOME.x * TILE_SIZE;
  const cy = TOME.y * TILE_SIZE;
  const pulse = 0.6 + 0.4 * Math.sin(now / 420);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 7, 11, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pupitre.
  ctx.fillStyle = '#6b4a2f';
  ctx.fillRect(cx - 9, cy + 1, 18, 4);
  ctx.fillStyle = '#4a3220';
  ctx.fillRect(cx - 2, cy + 5, 4, 6);

  // Livre ouvert.
  ctx.fillStyle = '#e8dcc0';
  ctx.fillRect(cx - 7, cy - 5, 14, 7);
  ctx.fillStyle = '#c9bb9a';
  ctx.fillRect(cx - 1, cy - 5, 1, 7);
  ctx.fillStyle = '#7a6a4c';
  ctx.fillRect(cx - 5, cy - 3, 3, 1);
  ctx.fillRect(cx + 2, cy - 3, 3, 1);

  if (challenge.phase !== 'won') {
    glow(ctx, cx, cy - 2, 16, `rgba(246, 211, 77, ${0.22 + 0.18 * pulse})`);
  }
}

function drawExit(ctx, room, now) {
  const cx = 7.5 * TILE_SIZE;
  const cy = (room.h - 1) * TILE_SIZE + 8;
  const pulse = 0.5 + 0.5 * Math.sin(now / 500);

  glow(ctx, cx, cy, 20, `rgba(232, 214, 164, ${0.2 + 0.15 * pulse})`);
  ctx.fillStyle = `rgba(255, 244, 214, ${0.55 + 0.35 * pulse})`;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 4);
  ctx.lineTo(cx + 5, cy + 1);
  ctx.lineTo(cx + 2, cy + 1);
  ctx.lineTo(cx + 2, cy + 5);
  ctx.lineTo(cx - 2, cy + 5);
  ctx.lineTo(cx - 2, cy + 1);
  ctx.lineTo(cx - 5, cy + 1);
  ctx.closePath();
  ctx.fill();
}

// Sceau du donjon sur la porte d'une maison : deux barreaux croisés et une
// gemme violette tant que le donjon gardien n'est pas vaincu. Une fois la
// maison ouverte, il ne reste qu'une petite lueur verte au linteau.
// Appelé dans le repère du monde (pixels).
export function drawHouseSeal(ctx, house, unlocked, now) {
  const cx = (house.door.x + 0.5) * TILE_SIZE;
  const cy = (house.door.y + 0.55) * TILE_SIZE;
  const pulse = 0.5 + 0.5 * Math.sin(now / 540);

  if (unlocked) {
    glow(ctx, cx, cy - 5, 9, `rgba(126, 224, 138, ${0.14 + 0.1 * pulse})`);
    ctx.fillStyle = `rgba(160, 236, 170, ${0.6 + 0.3 * pulse})`;
    ctx.fillRect(cx - 2, cy - 7, 4, 1);
    ctx.fillRect(cx - 1, cy - 6, 2, 2);
    return;
  }

  glow(ctx, cx, cy, 16, `rgba(150, 110, 226, ${0.22 + 0.14 * pulse})`);

  // Barreaux de fer en croix sur la porte.
  ctx.beginPath();
  ctx.moveTo(cx - 6, cy - 7);
  ctx.lineTo(cx + 6, cy + 7);
  ctx.moveTo(cx + 6, cy - 7);
  ctx.lineTo(cx - 6, cy + 7);
  ctx.strokeStyle = '#2b2733';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.strokeStyle = '#6f6a80';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Gemme du sceau, qui pulse lentement.
  ctx.fillStyle = `rgba(196, 164, 255, ${0.65 + 0.35 * pulse})`;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 3.5);
  ctx.lineTo(cx + 3.5, cy);
  ctx.lineTo(cx, cy + 3.5);
  ctx.lineTo(cx - 3.5, cy);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2b2733';
  ctx.fillRect(cx - 1, cy - 1, 2, 2);
}

// Dessine les objets de l'épreuve. Appelé dans le repère du monde (tuiles).
export function drawChallenge(ctx, challenge, room, now) {
  drawExit(ctx, room, now);

  if (challenge.type === 'runes') {
    const flashing = challenge.phase === 'watch' && challenge.wait > 220 ? challenge.seq[challenge.watchIndex] : -1;
    for (let i = 0; i < RUNE_PADS.length; i++) {
      const done = challenge.phase === 'won' || (challenge.phase === 'input' && challenge.seq.indexOf(i) < challenge.step);
      drawRune(ctx, RUNE_PADS[i], flashing === i || done, challenge.flash > 0 && challenge.flashColor === '#e07e6a' && flashing === i);
    }
    return;
  }

  if (challenge.type === 'cristaux') {
    for (let i = 0; i < CRYSTAL_SPOTS.length; i++) {
      drawCrystal(ctx, CRYSTAL_SPOTS[i], challenge.taken[i]);
    }
    return;
  }

  drawTome(ctx, challenge, now);
}
