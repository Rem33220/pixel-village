// Serveur de jeu : sert les fichiers du client + gère le monde en WebSocket.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateWorld, isSolid } from '../public/js/map.js';
import { CONFIG } from '../public/js/config.js';

// WebSocket maison (server/websocket.js) : aucune dépendance.
import { WebSocketServer } from './websocket.js';

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const wsBackend = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? 'WebSocket + Supabase (identité/perso)'
  : 'WebSocket intégré, zéro dépendance';

async function supabaseAuthGetUser(token) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !token) return { user: null, error: 'missing' };
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { user: null, error: text || `auth ${res.status}` };
    }
    const user = await res.json();
    return { user, error: null };
  } catch (e) {
    return { user: null, error: e?.message || String(e) };
  }
}

async function supabaseSelectCharacter(id) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !id) return { data: null, error: 'missing' };
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/characters?id=eq.${encodeURIComponent(id)}&select=*`,
      {
        method: 'GET',
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          Accept: 'application/vnd.pgrst.object+json',
        },
      }
    );
    if (res.status === 406) {
      // no rows
      return { data: null, error: null };
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { data: null, error: text || `rest ${res.status}` };
    }
    const data = await res.json();
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e?.message || String(e) };
  }
}

async function supabaseUpsertCharacter(payload) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return { data: null, error: 'missing' };
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/characters?on_conflict=id`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { data: null, error: text || `rest ${res.status}` };
    }
    const data = await res.json();
    // return single row
    const row = Array.isArray(data) ? data[0] : data;
    return { data: row, error: null };
  } catch (e) {
    return { data: null, error: e?.message || String(e) };
  }
}

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
  ws.on('error', () => {});
  ws.on('pong', () => { ws.isAlive = true; });

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
