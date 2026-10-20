// Point d'entrée du client : boucle de jeu, connexion, chat, HUD, maisons.
import { CONFIG } from './config.js';
import { generateWorld, isSolid } from './map.js';
import { Renderer } from './renderer.js';
import { initInput, moveVector, isTyping, setInputEnabled } from './input.js';
import { createConnection, websocketUrl } from './net.js';
import { createInventory } from './inventory.js';
import {
  buildHouses,
  buildInterior,
  createChallenge,
  updateChallenge,
  answerQuiz,
  openQuiz,
  drawChallenge,
  nearTome,
  nearExit,
  ENTER_RANGE,
  QUIZ,
  REWARDS
} from './houses.js';

const world = generateWorld();
const houses = buildHouses(world);

// Vitesse appliquée quand les Bottes de vent sont obtenues.
const SPEED_WITH_BOOTS = 1.25;

const state = {
  mode: 'menu', // menu | connecting | online | solo
  world,
  houses,
  players: new Map(),
  selfId: null,
  name: 'Aventurier',
  color: CONFIG.colors[0],
  conn: null,
  renderer: null,
  lastSent: { x: 0, y: 0 },
  lastSentAt: 0,
  // Maison en cours de visite : { house, room, challenge }
  inside: null,
  savedPos: null,
  rewards: new Set()
};

const els = {
  login: document.getElementById('login'),
  form: document.getElementById('login-form'),
  name: document.getElementById('name-input'),
  colors: document.getElementById('color-list'),
  solo: document.getElementById('solo-btn'),
  canvas: document.getElementById('screen'),
  hudName: document.getElementById('hud-name'),
  hudPlayers: document.getElementById('hud-players'),
  hudRewards: document.getElementById('hud-rewards'),
  chatLog: document.getElementById('chat-log'),
  chatForm: document.getElementById('chat-form'),
  chatInput: document.getElementById('chat-input'),
  status: document.getElementById('status'),
  statusText: document.getElementById('status-text'),
  reconnect: document.getElementById('reconnect-btn'),
  prompt: document.getElementById('prompt'),
  promptText: document.getElementById('prompt-text'),
  challenge: document.getElementById('challenge'),
  challengeTitle: document.getElementById('challenge-title'),
  challengeGoal: document.getElementById('challenge-goal'),
  challengeStatus: document.getElementById('challenge-status'),
  challengeAnswers: document.getElementById('challenge-answers'),
  inventoryBtn: document.getElementById('inventory-btn')
};

// Inventaire : panneau modal, le déplacement est coupé pendant qu'il est ouvert.
const inventory = createInventory({
  getRewards: () => state.rewards,
  onChange: (open) => setInputEnabled(!open)
});

// --- Personnages -----------------------------------------------------------

function makePlayer(id, name, color, x, y) {
  return {
    id,
    name,
    color,
    x,
    y,
    rx: x,
    ry: y,
    dir: 'down',
    moving: false,
    phase: 0,
    chatText: '',
    chatUntil: 0,
    speed: 1
  };
}

// Une pose complète tous les ~0,55 tuile parcourue : l'animation suit la
// vitesse réelle du personnage au lieu d'un rythme fixe.
const WALK_POSE_PER_TILE = 1 / 0.55;

function advanceWalk(player, distance) {
  if (!distance) return;
  player.phase = (player.phase + distance * WALK_POSE_PER_TILE) % 4;
}

function canStand(x, y) {
  const radius = 0.3;
  return !isSolid(state.world, Math.floor(x - radius), Math.floor(y - radius))
    && !isSolid(state.world, Math.floor(x + radius), Math.floor(y - radius))
    && !isSolid(state.world, Math.floor(x - radius), Math.floor(y + radius))
    && !isSolid(state.world, Math.floor(x + radius), Math.floor(y + radius));
}

function moveWithCollision(player, dx, dy) {
  if (dx) {
    const nx = player.rx + dx;
    if (canStand(nx, player.ry)) player.rx = nx;
  }
  if (dy) {
    const ny = player.ry + dy;
    if (canStand(player.rx, ny)) player.ry = ny;
  }
  player.rx = Math.min(Math.max(player.rx, 1), state.world.w - 1);
  player.ry = Math.min(Math.max(player.ry, 1), state.world.h - 1);
}

// --- Récompenses -----------------------------------------------------------

function applyRewards(player) {
  if (!player) return;
  player.rewards = state.rewards;
  player.speed = state.rewards.has('bottes') ? SPEED_WITH_BOOTS : 1;
}

function loadRewards() {
  try {
    const list = JSON.parse(localStorage.getItem('pixel-village:rewards') || '[]');
    if (Array.isArray(list)) {
      for (const id of list) {
        if (REWARDS[id]) state.rewards.add(id);
      }
    }
  } catch {
    /* stockage indisponible (mode privé) */
  }
}

function saveRewards() {
  try {
    localStorage.setItem('pixel-village:rewards', JSON.stringify(Array.from(state.rewards)));
  } catch {
    /* stockage indisponible */
  }
}

function syncGear() {
  if (state.mode !== 'online' || !state.conn) return;
  state.conn.send({
    t: 'gear',
    speed: state.rewards.has('bottes') ? SPEED_WITH_BOOTS : 1
  });
}

function grantReward(id) {
  const isNew = !state.rewards.has(id);
  if (isNew) {
    state.rewards.add(id);
    saveRewards();
    applyRewards(state.players.get(state.selfId));
    syncGear();
    updateRewardsHud();
    inventory.render();
  }
  return isNew;
}

function updateRewardsHud() {
  if (!els.hudRewards) return;
  els.hudRewards.replaceChildren();
  for (const id of state.rewards) {
    const chip = document.createElement('span');
    chip.className = 'chip reward';
    chip.title = REWARDS[id]?.detail ?? '';
    chip.textContent = REWARDS[id]?.name ?? id;
    els.hudRewards.append(chip);
  }
  els.hudRewards.classList.toggle('hidden', state.rewards.size === 0);
}

// --- Interface -------------------------------------------------------------

function setStatus(text, canRetry = false) {
  if (!text) {
    els.status.classList.add('hidden');
    return;
  }
  els.status.classList.remove('hidden');
  els.statusText.textContent = text;
  els.reconnect.classList.toggle('hidden', !canRetry);
}

function pushChat(text, kind = 'chat', color = null) {
  const line = document.createElement('div');
  line.className = `line ${kind}`;
  if (color) {
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.style.background = color;
    line.append(dot);
  }
  line.append(document.createTextNode(text));
  els.chatLog.append(line);
  while (els.chatLog.children.length > 80) {
    els.chatLog.firstElementChild.remove();
  }
  els.chatLog.scrollTop = els.chatLog.scrollHeight;
}

function updateHud() {
  els.hudName.textContent = state.name;
  if (state.mode === 'online') {
    els.hudPlayers.textContent = `${state.players.size} en ligne`;
  } else if (state.mode === 'solo') {
    els.hudPlayers.textContent = 'solo';
  } else {
    els.hudPlayers.textContent = '…';
  }
}

function updateSwatches() {
  for (const button of els.colors.children) {
    button.classList.toggle('selected', button.dataset.color === state.color);
  }
}

function buildColorList() {
  for (const color of CONFIG.colors) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'swatch';
    button.dataset.color = color;
    button.style.background = color;
    button.setAttribute('aria-label', `Couleur ${color}`);
    button.addEventListener('click', () => {
      state.color = color;
      updateSwatches();
    });
    els.colors.append(button);
  }
  updateSwatches();
}

function loadSettings() {
  try {
    const name = localStorage.getItem('pixel-village:name');
    const color = localStorage.getItem('pixel-village:color');
    if (name) {
      state.name = name;
      els.name.value = name;
    }
    if (color && CONFIG.colors.includes(color)) state.color = color;
  } catch {
    /* stockage indisponible (mode privé) */
  }
}

function saveSettings() {
  try {
    localStorage.setItem('pixel-village:name', state.name);
    localStorage.setItem('pixel-village:color', state.color);
  } catch {
    /* stockage indisponible */
  }
}

// --- Maisons ---------------------------------------------------------------

function houseNear(player) {
  for (const house of houses) {
    const dx = player.rx - (house.door.x + 0.5);
    const dy = player.ry - (house.door.y + 0.5);
    if (Math.hypot(dx, dy) <= ENTER_RANGE) return house;
  }
  return null;
}

function enterHouse(house) {
  const me = state.players.get(state.selfId);
  if (!me || state.inside) return;

  const room = buildInterior(house);
  state.savedPos = { x: me.rx, y: me.ry };
  state.inside = { house, room, challenge: createChallenge(house.challenge) };

  me.rx = room.spawn.x;
  me.ry = room.spawn.y;
  me.x = me.rx;
  me.y = me.ry;
  me.dir = 'up';
  me.moving = false;

  // Les collisions doivent utiliser la carte de l'intérieur, pas celle du
  // village.
  state.world = room;
  state.renderer.setWorld(room);
  state.renderer.centerOn(me.rx, me.ry);

  if (state.mode === 'online' && state.conn) {
    state.conn.send({ t: 'interior', inside: true });
  }

  els.challengeGoal.textContent = house.goal;
  els.challenge.classList.remove('hidden');
  answersKey = '';
  updateChallengePanel();
  updatePrompt(true);
  pushChat(`Tu entres — ${house.name}. ${house.goal}`, 'system');
}

function exitHouse() {
  const inside = state.inside;
  if (!inside) return;

  const me = state.players.get(state.selfId);
  const back = state.savedPos ?? inside.house.stand;
  state.inside = null;
  state.savedPos = null;

  answersKey = '';
  els.challenge.classList.add('hidden');
  els.challengeAnswers.replaceChildren();

  state.world = world;
  state.renderer.setWorld(world);
  if (me) {
    me.rx = back.x;
    me.ry = back.y;
    me.x = back.x;
    me.y = back.y;
    me.moving = false;
    state.renderer.centerOn(me.rx, me.ry);
  }

  if (state.mode === 'online' && state.conn) {
    state.conn.send({ t: 'interior', inside: false });
    syncGear();
  }
  updatePrompt(true);
}

function interact() {
  if (state.mode !== 'online' && state.mode !== 'solo') return;
  const me = state.players.get(state.selfId);
  if (!me) return;

  if (state.inside) {
    if (nearExit(state.inside.room, me)) {
      exitHouse();
      return;
    }
    const challenge = state.inside.challenge;
    if (challenge.type === 'devinettes' && challenge.phase === 'idle' && nearTome(me)) {
      if (openQuiz(challenge)) {
        answersKey = '';
        updateChallengePanel();
      }
    }
    return;
  }

  const house = houseNear(me);
  if (house) enterHouse(house);
}

function chooseAnswer(index) {
  const inside = state.inside;
  if (!inside) return;
  const result = answerQuiz(inside.challenge, index);
  if (!result) return;
  if (result === 'won') onChallengeWon();
  updateChallengePanel();
}

function onChallengeWon() {
  const inside = state.inside;
  if (!inside) return;
  const reward = REWARDS[inside.house.reward];
  const isNew = grantReward(inside.house.reward);
  if (isNew) {
    pushChat(`Épreuve réussie ! Récompense : ${reward.name} — ${reward.detail}.`, 'system');
  } else {
    pushChat(`Épreuve réussie à nouveau ! Tu possèdes déjà ${reward.name}.`, 'system');
  }
}

let answersKey = '';
let challengeStatus = '';

function renderAnswers(challenge) {
  const key = challenge.type === 'devinettes' && challenge.phase === 'question' ? `q${challenge.index}` : '';
  if (key === answersKey) return;
  answersKey = key;
  els.challengeAnswers.replaceChildren();
  if (!key) return;

  const question = QUIZ[challenge.index];
  question.options.forEach((label, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'answer';
    button.textContent = `${index + 1}. ${label}`;
    button.addEventListener('click', () => {
      button.blur();
      chooseAnswer(index);
    });
    els.challengeAnswers.append(button);
  });
}

function updateChallengePanel() {
  const inside = state.inside;
  if (!inside) {
    els.challenge.classList.add('hidden');
    return;
  }
  const challenge = inside.challenge;
  els.challengeTitle.textContent = inside.house.name;

  let status = challenge.message ?? '';
  if (challenge.type === 'runes') {
    if (challenge.phase === 'watch') status = 'Observe la séquence des runes…';
    else if (challenge.phase === 'input') status = `À toi : reproduis la séquence (${challenge.step}/${challenge.seq.length}).`;
    else if (challenge.phase === 'won') status = 'Épreuve réussie ! Sors par la porte quand tu veux (E).';
  } else if (challenge.type === 'cristaux') {
    const done = challenge.taken.filter(Boolean).length;
    status = challenge.phase === 'won'
      ? 'Épreuve réussie ! Sors par la porte quand tu veux (E).'
      : `${done}/${challenge.taken.length} cristaux — ${challenge.time.toFixed(1)} s`;
  } else if (challenge.phase === 'question') {
    status = `Énigme ${challenge.index + 1}/${QUIZ.length} : ${QUIZ[challenge.index].question}`;
  } else if (challenge.phase === 'won') {
    status = 'Les trois énigmes sont résolues ! Sors par la porte quand tu veux (E).';
  } else {
    status = challenge.message || 'Le livre du sage t’attend (E).';
  }

  if (status !== challengeStatus) {
    challengeStatus = status;
    els.challengeStatus.textContent = status;
  }
  renderAnswers(challenge);
}

let promptKey = '';

function updatePrompt(force = false) {
  const me = state.players.get(state.selfId);
  let text = '';

  if (me && (state.mode === 'online' || state.mode === 'solo')) {
    if (state.inside) {
      if (nearExit(state.inside.room, me)) {
        text = 'Sortir de la maison';
      } else if (state.inside.challenge.type === 'devinettes'
        && state.inside.challenge.phase === 'idle'
        && nearTome(me)) {
        text = 'Lire le livre des énigmes';
      }
    } else {
      const house = houseNear(me);
      if (house) text = `Entrer — ${house.name}`;
    }
  }

  if (!force && text === promptKey) return;
  promptKey = text;
  if (!text) {
    els.prompt.classList.add('hidden');
    return;
  }
  els.promptText.textContent = text;
  els.prompt.classList.remove('hidden');
}

// --- Connexion -------------------------------------------------------------

function enterWorld(online) {
  const name = (els.name.value || '').trim().slice(0, CONFIG.maxNameLength) || 'Aventurier';
  state.name = name;
  saveSettings();
  setInputEnabled(true);
  els.login.classList.add('hidden');
  document.body.classList.add('playing');
  if (!online) {
    startSolo();
    return;
  }
  connect();
}

function connect() {
  state.mode = 'connecting';
  state.players.clear();
  state.selfId = null;
  state.lastSent = { x: 0, y: 0 };
  state.lastSentAt = 0;
  updateHud();
  setStatus('Connexion au serveur…');

  state.conn = createConnection({
    onMessage: handleMessage,
    onClose: handleConnectionLost
  });
  state.conn.connect({ name: state.name, color: state.color });
}

function handleConnectionLost(error) {
  console.warn('Connexion WebSocket perdue :', error?.message ?? error);
  state.conn?.close();
  state.conn = null;
  if (state.mode === 'online') {
    startSolo('Connexion perdue — tu joues en solo.');
  } else if (state.mode === 'connecting') {
    let target = '';
    try {
      target = ` (${websocketUrl()})`;
    } catch {
      /* pas d'URL exploitable : le message de l'erreur suffit */
    }
    const detail = error?.message ? ` : ${error.message}` : '';
    startSolo(`Serveur injoignable${target}${detail} — tu joues en solo.`);
  }
}

function startSolo(reason = '') {
  const previous = state.players.get(state.selfId);
  state.players.clear();
  state.selfId = 'local';

  if (previous) {
    previous.id = 'local';
    previous.moving = false;
    state.players.set('local', previous);
  } else {
    const spawn = world.spawn;
    state.players.set('local', makePlayer('local', state.name, state.color, spawn.x, spawn.y));
  }
  applyRewards(state.players.get('local'));

  state.mode = 'solo';
  state.conn = null;
  updateHud();
  setStatus(reason, Boolean(reason));
  if (reason) pushChat(reason, 'system');
}

function syncPlayers(list) {
  const seen = new Set();
  for (const data of list) {
    seen.add(data.id);
    let player = state.players.get(data.id);
    if (!player) {
      player = makePlayer(data.id, data.name, data.color, data.x, data.y);
      state.players.set(data.id, player);
    }
    player.name = data.name;
    player.color = data.color;
    player.x = data.x;
    player.y = data.y;
    player.dir = data.dir;
    player.moving = data.moving;
  }
  for (const id of Array.from(state.players.keys())) {
    if (id === state.selfId) continue; // le serveur nous masque quand on est dans une maison
    if (!seen.has(id)) state.players.delete(id);
  }
}

function handleMessage(message) {
  // Ignore les messages tardifs d'une connexion abandonnée (passage en solo).
  if (state.mode !== 'online' && state.mode !== 'connecting') return;

  switch (message.t) {
    case 'welcome': {
      state.mode = 'online';
      state.selfId = String(message.id);
      syncPlayers(message.players);
      if (!state.players.has(state.selfId)) {
        const p = makePlayer(state.selfId, state.name, state.color, message.spawn.x, message.spawn.y);
        state.players.set(state.selfId, p);
      }
      applyRewards(state.players.get(state.selfId));
      syncGear();
      if (state.inside) state.conn.send({ t: 'interior', inside: true });
      updateHud();
      setStatus(null);
      pushChat('Bienvenue dans le village ! ZQSD / WASD pour bouger, E pour entrer dans une maison, I pour l’inventaire, Entrée pour discuter.', 'system');
      break;
    }
    case 'state': {
      // Pendant une visite, on ne touche pas à notre propre position.
      syncPlayers(message.players);
      updateHud();
      break;
    }
    case 'chat': {
      const player = state.players.get(String(message.id));
      if (player) {
        player.chatText = message.text;
        player.chatUntil = performance.now() + 6000;
      }
      pushChat(`${message.name} : ${message.text}`, 'chat', message.color);
      break;
    }
    case 'system': {
      pushChat(message.text, 'system');
      break;
    }
    case 'left': {
      state.players.delete(String(message.id));
      updateHud();
      break;
    }
    default:
      break;
  }
}

// --- Boucle de jeu ---------------------------------------------------------

function updateLocal(dt) {
  const me = state.players.get(state.selfId);
  if (!me) return;

  const vector = moveVector();
  me.moving = vector.x !== 0 || vector.y !== 0;

  if (me.moving) {
    if (Math.abs(vector.x) > Math.abs(vector.y)) {
      me.dir = vector.x < 0 ? 'left' : 'right';
    } else {
      me.dir = vector.y < 0 ? 'up' : 'down';
    }
    const speed = CONFIG.speed * (me.speed ?? 1);
    const beforeX = me.rx;
    const beforeY = me.ry;
    moveWithCollision(me, vector.x * speed * dt, vector.y * speed * dt);
    advanceWalk(me, Math.hypot(me.rx - beforeX, me.ry - beforeY));
  }

  if (state.mode === 'solo' || state.inside) {
    me.x = me.rx;
    me.y = me.ry;
    return;
  }

  if (!state.players.has(state.selfId)) return;

  // Réconciliation douce avec la position autoritaire du serveur.
  const errorX = me.x - me.rx;
  const errorY = me.y - me.ry;
  if (Math.hypot(errorX, errorY) > 2) {
    me.rx = me.x;
    me.ry = me.y;
  } else {
    const k = Math.min(1, dt * (me.moving ? 4 : 10));
    me.rx += errorX * k;
    me.ry += errorY * k;
  }
}

function updateRemotes(dt) {
  for (const player of state.players.values()) {
    if (player.id === state.selfId) continue;
    const k = Math.min(1, dt * 11);
    const beforeX = player.rx;
    const beforeY = player.ry;
    player.rx += (player.x - player.rx) * k;
    player.ry += (player.y - player.ry) * k;
    if (player.moving) advanceWalk(player, Math.hypot(player.rx - beforeX, player.ry - beforeY));
    if (Math.hypot(player.x - player.rx, player.y - player.ry) > 3) {
      player.rx = player.x;
      player.ry = player.y;
    }
  }
}

function tickInside(dt) {
  const inside = state.inside;
  if (!inside) return;
  const me = state.players.get(state.selfId);
  if (!me) return;

  const result = updateChallenge(inside.challenge, me, dt);
  if (result === 'won') onChallengeWon();
  updateChallengePanel();
}

let lastFrame = performance.now();

function loop(now) {
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;

  if (state.mode === 'online' || state.mode === 'solo') {
    updateLocal(dt);
    updateRemotes(dt);
    if (state.inside) tickInside(dt);
    const me = state.players.get(state.selfId);
    if (me) state.renderer.updateCamera(me.rx, me.ry, dt);
    updatePrompt();
  }

  const decor = state.inside
    ? (ctx, time) => drawChallenge(ctx, state.inside.challenge, state.inside.room, time)
    : null;

  state.renderer.render(renderList(), state.selfId, now, decor);
  requestAnimationFrame(loop);
}

// À l'intérieur, on ne dessine que soi-même : l'instance est privée.
function renderList() {
  if (!state.inside) return state.players;
  const me = state.players.get(state.selfId);
  if (!me) return new Map();
  return new Map([[me.id, me]]);
}

// --- Événements ------------------------------------------------------------

els.form.addEventListener('submit', (event) => {
  event.preventDefault();
  enterWorld(true);
});

els.solo.addEventListener('click', () => {
  enterWorld(false);
});

els.chatForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const text = els.chatInput.value.trim();
  els.chatInput.value = '';
  if (!text) return;
  if (state.mode === 'online' && state.conn) {
    state.conn.send({ t: 'chat', text: text.slice(0, CONFIG.maxChatLength) });
  } else {
    pushChat('Le chat nécessite une connexion au serveur.', 'system');
  }
  els.chatInput.blur();
});

els.reconnect.addEventListener('click', () => {
  connect();
});

els.inventoryBtn.addEventListener('click', () => {
  if (state.mode === 'menu' || state.mode === 'connecting') return;
  inventory.toggle();
});

window.addEventListener('keydown', (event) => {
  if (event.code === 'KeyI' && !isTyping(event)
    && state.mode !== 'menu' && state.mode !== 'connecting') {
    event.preventDefault();
    inventory.toggle();
    return;
  }

  // Inventaire ouvert : il capte Échap et Entrée, et bloque les autres touches.
  if (inventory.isOpen()) {
    if (event.code === 'Escape' || event.code === 'Enter') {
      event.preventDefault();
      inventory.close();
    }
    return;
  }

  if (event.code === 'Enter' && !isTyping(event) && state.mode !== 'menu') {
    event.preventDefault();
    els.chatInput.focus();
    return;
  }

  if (event.code === 'Escape') {
    if (document.activeElement === els.chatInput) {
      els.chatInput.blur();
    } else if (state.inside) {
      exitHouse();
    }
    return;
  }

  if (isTyping(event)) return;

  if (event.code === 'KeyE' && (state.mode === 'online' || state.mode === 'solo')) {
    event.preventDefault();
    interact();
    return;
  }

  const challenge = state.inside?.challenge;
  if (challenge && challenge.type === 'devinettes' && challenge.phase === 'question') {
    const digits = { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2 };
    if (event.code in digits) {
      event.preventDefault();
      chooseAnswer(digits[event.code]);
    }
  }
});

// Envoie la direction au serveur quand elle change, et la rafraîchit
// régulièrement pour ne pas être coupé par le délai d'inactivité du serveur.
setInterval(() => {
  if (state.mode !== 'online' || !state.conn || state.inside) return;
  const vector = moveVector();
  const x = Math.round(vector.x * 50) / 50;
  const y = Math.round(vector.y * 50) / 50;
  const changed = x !== state.lastSent.x || y !== state.lastSent.y;
  const idle = x === 0 && y === 0;
  // Marche verticale : x vaut 0, donc l'ancien test « x === 0 » coupait le
  // renvoi périodique et le serveur arrêtait le joueur au bout de 1,5 s.
  if (!changed && (idle || Date.now() - state.lastSentAt < 500)) return;
  state.lastSent = { x, y };
  state.lastSentAt = Date.now();
  state.conn.send({ t: 'input', dx: x, dy: y });
}, 100);

// --- Démarrage -------------------------------------------------------------

window.__pixelVillageReady = true;
state.renderer = new Renderer(els.canvas, world);
state.renderer.centerOn(world.spawn.x, world.spawn.y);
initInput();
buildColorList();
loadSettings();
loadRewards();
updateSwatches();
updateHud();
updateRewardsHud();
requestAnimationFrame(loop);
