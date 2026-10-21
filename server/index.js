// Serveur de jeu : sert les fichiers du client + gère le monde en WebSocket.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateWorld, isSolid } from '../public/js/map.js';
import { CONFIG } from '../public/js/config.js';

// WebSocket maison (server/websocket.js) : aucune dépendance, donc aucun
// « npm install » à faire. « node server/index.js » suffit.
import { createClient } from '@supabase/supabase-js';
import { WebSocketServer } from './websocket.js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const wsBackend = process.env.SUPABASE_URL
  ? 'WebSocket + Supabase (identité/perso)'
  : 'WebSocket intégré, zéro dépendance';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, '..', 'public');
const PORT = Number(process.env.PORT) || CONFIG.port;

const world = generateWorld();
const players = new Map();
let nextId = 1;

const TICK_MS = 60;
const STEP = TICK_MS / 1000;
const RADIUS = 0.3;
const MAX_PLAYERS = 50;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

function sendJson(ws, message) {
  if (ws.readyState === 1) ws.send(JSON.stringify(message));
}

function broadcast(message) {
  const data = JSON.stringify(message);
  for (const player of players.values()) {
    if (player.ws.readyState === 1) player.ws.send(data);
  }
}

function playerList() {
  // Les joueurs qui visitent une maison disparaissent de la carte : leur
  // intérieur est une instance privée, gérée uniquement par leur client.
  const visible = Array.from(players.values()).filter((player) => !player.inside);
  return visible.map((player) => ({
    id: player.id,
    name: player.name,
    color: player.color,
    x: Math.round(player.x * 1000) / 1000,
    y: Math.round(player.y * 1000) / 1000,
    dir: player.dir,
    moving: player.moving
  }));
}

function cleanName(value) {
  const name = String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, CONFIG.maxNameLength);
  return name || 'Aventurier';
}

function cleanChat(value) {
  return Array.from(String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ''))
    .slice(0, CONFIG.maxChatLength)
    .join('')
    .trim();
}

function canStand(x, y) {
  return !isSolid(world, Math.floor(x - RADIUS), Math.floor(y - RADIUS))
    && !isSolid(world, Math.floor(x + RADIUS), Math.floor(y - RADIUS))
    && !isSolid(world, Math.floor(x - RADIUS), Math.floor(y + RADIUS))
    && !isSolid(world, Math.floor(x + RADIUS), Math.floor(y + RADIUS));
}

function movePlayer(player, dx, dy) {
  if (dx) {
    const nx = player.x + dx;
    if (canStand(nx, player.y)) player.x = nx;
  }
  if (dy) {
    const ny = player.y + dy;
    if (canStand(player.x, ny)) player.y = ny;
  }
  player.x = Math.min(Math.max(player.x, 1), world.w - 1);
  player.y = Math.min(Math.max(player.y, 1), world.h - 1);
}

function stepPlayer(player) {
  if (player.inside) {
    player.dx = 0;
    player.dy = 0;
    player.moving = false;
    return;
  }

  if (Date.now() - player.lastInputAt > 1500) {
    player.dx = 0;
    player.dy = 0;
  }

  const length = Math.hypot(player.dx, player.dy);
  if (length < 0.01) {
    player.moving = false;
    return;
  }

  const nx = player.dx / length;
  const ny = player.dy / length;
  player.moving = true;
  if (Math.abs(nx) > Math.abs(ny)) {
    player.dir = nx < 0 ? 'left' : 'right';
  } else {
    player.dir = ny < 0 ? 'up' : 'down';
  }

  const distance = CONFIG.speed * player.speed * STEP;
  movePlayer(player, nx * distance, 0);
  movePlayer(player, 0, ny * distance);
}

// --- Serveur HTTP / fichiers statiques -------------------------------------

async function serveStatic(req, res) {
  const url = new URL(req.url ?? '/', 'http://localhost');
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';

  const filePath = path.join(PUBLIC_DIR, path.normalize(pathname));
  if (!filePath.startsWith(PUBLIC_DIR + path.sep)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  try {
    const data = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
}

const server = http.createServer((req, res) => {
  if (req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('ok');
    return;
  }
  serveStatic(req, res).catch((error) => {
    console.error('Erreur statique :', error);
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Erreur serveur');
  });
});

// --- WebSocket -------------------------------------------------------------

const wss = new WebSocketServer({ server, path: CONFIG.wsPath, maxPayload: 4096 });
const sockets = new Map();

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('error', () => {
    /* la déconnexion est traitée par l'événement « close » */
  });
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (raw, isBinary) => {
    if (isBinary) return;
    if (raw.length > 2048) return;
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (!message || typeof message.t !== 'string') return;

    if (message.t === 'join') {
      join(ws, message);
      return;
    }

    const player = sockets.get(ws);
    if (!player) return;

    if (message.t === 'input') {
      const dx = Number(message.dx);
      const dy = Number(message.dy);
      if (Number.isFinite(dx) && Number.isFinite(dy)) {
        player.dx = Math.max(-1, Math.min(1, dx));
        player.dy = Math.max(-1, Math.min(1, dy));
        player.lastInputAt = Date.now();
      }
      return;
    }

    if (message.t === 'interior') {
      // Le joueur entre dans une maison (ou en sort). On le fige sur place :
      // sa position dans l'intérieur n'a pas à être connue du serveur.
      player.inside = message.inside === true;
      player.dx = 0;
      player.dy = 0;
      player.moving = false;
      player.lastInputAt = Date.now();
      return;
    }

    if (message.t === 'gear') {
      // Multiplicateur de vitesse validé côté serveur (Bottes de vent).
      const speed = Number(message.speed);
      if (Number.isFinite(speed)) {
        player.speed = Math.max(1, Math.min(1.6, speed));
      }
      return;
    }

    if (message.t === 'chat') {
      const now = Date.now();
      if (now - player.lastChat < 500) return;
      const text = cleanChat(message.text);
      if (!text) return;
      player.lastChat = now;
      broadcast({
        t: 'chat',
        id: player.id,
        name: player.name,
        color: player.color,
        text
      });
    }
  });

  ws.on('close', () => {
    const player = sockets.get(ws);
    if (!player) return;
    sockets.delete(ws);
    players.delete(player.id);
    broadcast({ t: 'left', id: player.id });
  });
});

async function join(ws, message) {
  if (sockets.has(ws)) return;
  if (players.size >= MAX_PLAYERS) {
    sendJson(ws, { t: 'system', text: 'Serveur complet, réessaie dans un instant.' });
    ws.close();
    return;
  }

  // --- Connexion avec compte Supabase (optionnel) --------------------------------
  let supabaseId = null;
  let resolvedName = cleanName(message.name);
  let resolvedColor = CONFIG.colors.includes(message.color) ? message.color : CONFIG.colors[0];

  if (message.token && supabase) {
    const { data, error } = await supabase.auth.getUser(message.token);
    if (!error && data?.user) {
      supabaseId = data.user.id;
      if (!resolvedName || resolvedName === 'Aventurier') {
        resolvedName = cleanName(data.user.email?.split('@')[0] ?? 'Habitant');
      }
    } else {
      console.warn(`Token Supabase invalide : ${error?.message ?? 'inconnu'}`);
    }
  }

  // --- Perso Supabase : récupérer / créer ----------------------------------
  let character = null;
  if (supabaseId) {
    const { data: existing, error: fetchError } = await supabase
      .from('characters')
      .select('*')
      .eq('id', supabaseId)
      .maybeSingle();
    if (fetchError) {
      console.warn(`Erreur lecture perso Supabase : ${fetchError.message}`);
    } else {
      character = existing;
    }

    if (!character) {
      const payload = {
        id: supabaseId,
        display_name: resolvedName,
        class: 'paysan',
        level: 1,
        coins: 0,
        state: {},
        x: world.spawn.x,
        y: world.spawn.y,
      };
      const { data: inserted, error: insertError } = await supabase
        .from('characters')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();
      if (insertError) {
        console.warn(`Erreur création perso Supabase : ${insertError.message}`);
      } else {
        character = inserted;
      }
    }

    if (character) {
      resolvedName = cleanName(character.display_name ?? resolvedName);
      resolvedColor =
        message.color && CONFIG.colors.includes(message.color)
          ? message.color
          : (character.color ?? CONFIG.colors[0]);
    }
  }

  // --- Création du joueur (monde) ------------------------------------------
  const id = String(nextId++);
  const player = {
    id,
    supabaseId,
    ws,
    name: resolvedName,
    color: resolvedColor,
    x: character?.x ?? world.spawn.x,
    y: character?.y ?? world.spawn.y,
    dx: 0,
    dy: 0,
    dir: 'down',
    moving: false,
    speed: 1,
    inside: false,
    lastInputAt: Date.now(),
    lastChat: 0
  };

  players.set(id, player);
  sockets.set(ws, player);

  sendJson(ws, {
    t: 'welcome',
    id,
    supabaseId,
    spawn: world.spawn,
    players: playerList(),
    ...(character ?? {}),
  });
  broadcast({ t: 'system', text: `${player.name} rejoint le village.` });
  console.log(`${player.name} (${id}${supabaseId ? ' [' + supabaseId.slice(0, 8) + '…]' : ''}) a rejoint — ${players.size} joueur(s).`);
}

setInterval(() => {
  for (const player of players.values()) stepPlayer(player);
  broadcast({ t: 'state', players: playerList() });
}, TICK_MS);

const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    ws.ping();
  }
}, 30000);
heartbeat.unref?.();

server.listen(PORT, () => {
  console.log(`Pixel Village prêt : http://localhost:${PORT}  [${wsBackend}]`);
});

function shutdown() {
  console.log('\nArrêt du serveur…');
  for (const player of players.values()) {
    try {
      player.ws.close();
    } catch {
      /* ignore */
    }
  }
  wss.close();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1500).unref();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
