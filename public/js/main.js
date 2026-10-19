// Point d'entrée du client : boucle de jeu, connexion, chat, HUD.
import { CONFIG } from './config.js';
import { generateWorld, isSolid } from './map.js';
import { Renderer } from './renderer.js';
import { initInput, moveVector, isTyping } from './input.js';
import { createConnection } from './net.js';

const world = generateWorld();

const state = {
  mode: 'menu', // menu | connecting | online | solo
  players: new Map(),
  selfId: null,
  name: 'Aventurier',
  color: CONFIG.colors[0],
  conn: null,
  renderer: null,
  lastSent: { x: 0, y: 0 },
  lastSentAt: 0
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
  chatLog: document.getElementById('chat-log'),
  chatForm: document.getElementById('chat-form'),
  chatInput: document.getElementById('chat-input'),
  status: document.getElementById('status'),
  statusText: document.getElementById('status-text'),
  reconnect: document.getElementById('reconnect-btn')
};

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
    chatText: '',
    chatUntil: 0
  };
}

function canStand(x, y) {
  const radius = 0.3;
  return !isSolid(world, Math.floor(x - radius), Math.floor(y - radius))
    && !isSolid(world, Math.floor(x + radius), Math.floor(y - radius))
    && !isSolid(world, Math.floor(x - radius), Math.floor(y + radius))
    && !isSolid(world, Math.floor(x + radius), Math.floor(y + radius));
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
  player.rx = Math.min(Math.max(player.rx, 1), world.w - 1);
  player.ry = Math.min(Math.max(player.ry, 1), world.h - 1);
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

// --- Connexion -------------------------------------------------------------

function enterWorld(online) {
  const name = (els.name.value || '').trim().slice(0, CONFIG.maxNameLength) || 'Aventurier';
  state.name = name;
  saveSettings();
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
    startSolo('Serveur injoignable — tu joues en solo.');
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
      updateHud();
      setStatus(null);
      pushChat('Bienvenue dans le village ! ZQSD / WASD pour bouger, Entrée pour discuter.', 'system');
      break;
    }
    case 'state': {
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
    moveWithCollision(me, vector.x * CONFIG.speed * dt, vector.y * CONFIG.speed * dt);
  }

  if (state.mode === 'solo') {
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
    player.rx += (player.x - player.rx) * k;
    player.ry += (player.y - player.ry) * k;
    if (Math.hypot(player.x - player.rx, player.y - player.ry) > 3) {
      player.rx = player.x;
      player.ry = player.y;
    }
  }
}

let lastFrame = performance.now();

function loop(now) {
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;

  if (state.mode === 'online' || state.mode === 'solo') {
    updateLocal(dt);
    updateRemotes(dt);
    const me = state.players.get(state.selfId);
    if (me) state.renderer.updateCamera(me.rx, me.ry, dt);
  }

  state.renderer.render(state.players, state.selfId, now);
  requestAnimationFrame(loop);
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

window.addEventListener('keydown', (event) => {
  if (event.code === 'Enter' && !isTyping(event) && state.mode !== 'menu') {
    event.preventDefault();
    els.chatInput.focus();
  }
  if (event.code === 'Escape' && document.activeElement === els.chatInput) {
    els.chatInput.blur();
  }
});

// Envoie la direction au serveur quand elle change, et la rafraîchit
// régulièrement pour ne pas être coupé par le délai d'inactivité du serveur.
setInterval(() => {
  if (state.mode !== 'online' || !state.conn) return;
  const vector = moveVector();
  const x = Math.round(vector.x * 50) / 50;
  const y = Math.round(vector.y * 50) / 50;
  const changed = x !== state.lastSent.x || y !== state.lastSent.y;
  if (!changed && (x === 0 || Date.now() - state.lastSentAt < 500)) return;
  state.lastSent = { x, y };
  state.lastSentAt = Date.now();
  state.conn.send({ t: 'input', dx: x, dy: y });
}, 100);

// --- Démarrage -------------------------------------------------------------

state.renderer = new Renderer(els.canvas, world);
state.renderer.centerOn(world.spawn.x, world.spawn.y);
initInput();
buildColorList();
loadSettings();
updateSwatches();
updateHud();
requestAnimationFrame(loop);
