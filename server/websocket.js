// Mini serveur WebSocket (RFC 6455) sans aucune dépendance.
// Il sert de secours quand le paquet « ws » n'est pas installé : le jeu démarre
// alors avec « node server/index.js », sans npm install.
// API volontairement réduite à ce qu'utilise server/index.js :
//   new WebSocketServer({ server, path }), wss.on('connection'), wss.clients,
//   ws.on('message' | 'pong' | 'close'), ws.send(), ws.ping(), ws.close(),
//   ws.terminate(), ws.readyState, wss.close().

import crypto from 'node:crypto';
import { EventEmitter } from 'node:events';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

const OPEN = 1;
const CLOSING = 2;
const CLOSED = 3;

const OP_CONTINUATION = 0x0;
const OP_TEXT = 0x1;
const OP_BINARY = 0x2;
const OP_CLOSE = 0x8;
const OP_PING = 0x9;
const OP_PONG = 0xa;

const MAX_FRAME = 64 * 1024;

function encodeFrame(opcode, payload) {
  const length = payload.length;
  let header;

  if (length < 126) {
    header = Buffer.alloc(2);
    header[1] = length;
  } else if (length < 0x10000) {
    header = Buffer.alloc(4);
    header[1] = 126;
    header.writeUInt16BE(length, 2);
  } else {
    header = Buffer.alloc(10);
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(length), 2);
  }

  header[0] = 0x80 | opcode; // FIN + opcode, jamais masqué côté serveur
  return Buffer.concat([header, payload]);
}

function closePayload(code, reason) {
  const text = Buffer.from(String(reason ?? '').slice(0, 100), 'utf8');
  const payload = Buffer.alloc(2 + text.length);
  payload.writeUInt16BE(code, 0);
  text.copy(payload, 2);
  return payload;
}

export class WebSocketConnection extends EventEmitter {
  constructor(socket, { maxPayload = MAX_FRAME } = {}) {
    super();
    this.socket = socket;
    this.maxPayload = maxPayload;
    this.readyState = OPEN;
    this.isAlive = true;

    this.buffer = Buffer.alloc(0);
    this.fragments = [];
    this.fragmentOpcode = -1;
    this.fragmentLength = 0;
    this.closeEmitted = false;

    socket.setNoDelay?.(true);
    socket.on('data', (chunk) => this.handleData(chunk));
    socket.on('close', () => this.handleSocketClose());
    socket.on('end', () => {
      // Le client a fini d'écrire : on libère la connexion.
      socket.destroy();
      this.handleSocketClose();
    });
    socket.on('error', () => this.terminate());
  }

  // --- Lecture des trames --------------------------------------------------

  feed(chunk) {
    if (this.readyState === CLOSED) return;
    this.handleData(chunk);
  }

  handleData(chunk) {
    if (this.readyState === CLOSED) return;
    this.buffer = this.buffer.length ? Buffer.concat([this.buffer, chunk]) : chunk;

    // Un client qui annonce une trame énorme ne doit pas remplir la mémoire.
    if (this.buffer.length > this.maxPayload + 14 && !this.hasCompleteFrame()) {
      this.terminate();
      return;
    }

    while (this.readyState === OPEN && this.readFrame()) {
      /* on enchaîne les trames déjà présentes dans le tampon */
    }
  }

  hasCompleteFrame() {
    if (this.buffer.length < 2) return true;
    let length = this.buffer[1] & 0x7f;
    let offset = 2;
    if (length === 126) {
      if (this.buffer.length < 4) return true;
      length = this.buffer.readUInt16BE(2);
      offset = 4;
    } else if (length === 127) {
      if (this.buffer.length < 10) return true;
      return true; // trame géante : on la laissera refuser proprement
    }
    return this.buffer.length >= offset + 4 + length;
  }

  readFrame() {
    if (this.buffer.length < 2) return false;

    const first = this.buffer[0];
    const second = this.buffer[1];
    const fin = (first & 0x80) !== 0;
    const opcode = first & 0x0f;
    const masked = (second & 0x80) !== 0;

    let length = second & 0x7f;
    let offset = 2;

    if (length === 126) {
      if (this.buffer.length < 4) return false;
      length = this.buffer.readUInt16BE(2);
      offset = 4;
    } else if (length === 127) {
      if (this.buffer.length < 10) return false;
      const big = this.buffer.readBigUInt64BE(2);
      if (big > BigInt(this.maxPayload)) {
        this.close(1009, 'Message trop grand');
        return false;
      }
      length = Number(big);
      offset = 10;
    }

    if (length > this.maxPayload) {
      this.close(1009, 'Message trop grand');
      return false;
    }

    // Contrôle : les trames venant d'un client sont toujours masquées.
    if (!masked) {
      this.close(1002, 'Trame non masquée');
      return false;
    }

    if (this.buffer.length < offset + 4 + length) return false;

    const mask = this.buffer.subarray(offset, offset + 4);
    const payload = Buffer.allocUnsafe(length);
    for (let i = 0; i < length; i++) {
      payload[i] = this.buffer[offset + 4 + i] ^ mask[i & 3];
    }
    this.buffer = this.buffer.subarray(offset + 4 + length);

    this.handleFrame(fin, opcode, payload);
    return this.readyState !== CLOSED;
  }

  handleFrame(fin, opcode, payload) {
    if (opcode === OP_CLOSE) {
      this.readyState = CLOSING;
      try {
        this.socket.end(encodeFrame(OP_CLOSE, closePayload(1000, '')));
      } catch {
        this.terminate();
      }
      return;
    }

    if (opcode === OP_PING) {
      if (this.readyState === OPEN && payload.length <= 125) {
        this.socket.write(encodeFrame(OP_PONG, payload));
      }
      return;
    }

    if (opcode === OP_PONG) {
      this.isAlive = true;
      this.emit('pong');
      return;
    }

    if (opcode === OP_CONTINUATION) {
      if (this.fragmentOpcode < 0) {
        this.close(1002, 'Fragment inattendu');
        return;
      }
      this.fragments.push(payload);
      this.fragmentLength += payload.length;
      if (this.fragmentLength > this.maxPayload) {
        this.close(1009, 'Message trop grand');
        return;
      }
      if (fin) this.flushFragments();
      return;
    }

    if (opcode === OP_TEXT || opcode === OP_BINARY) {
      if (this.fragmentOpcode >= 0) {
        this.close(1002, 'Nouvelle trame avant la fin du fragment');
        return;
      }
      if (fin) {
        this.emit('message', payload, opcode === OP_BINARY);
        return;
      }
      this.fragmentOpcode = opcode;
      this.fragments = [payload];
      this.fragmentLength = payload.length;
      return;
    }

    this.close(1002, 'Opcode inconnu');
  }

  flushFragments() {
    const message = this.fragments.length === 1
      ? this.fragments[0]
      : Buffer.concat(this.fragments, this.fragmentLength);
    const opcode = this.fragmentOpcode;
    this.fragments = [];
    this.fragmentLength = 0;
    this.fragmentOpcode = -1;
    this.emit('message', message, opcode === OP_BINARY);
  }

  // --- Écriture ------------------------------------------------------------

  send(data) {
    if (this.readyState !== OPEN) return;
    const payload = typeof data === 'string' ? Buffer.from(data, 'utf8') : Buffer.from(data);
    try {
      this.socket.write(encodeFrame(OP_TEXT, payload));
    } catch {
      this.terminate();
    }
  }

  ping(data = Buffer.alloc(0)) {
    if (this.readyState !== OPEN) return;
    const payload = Buffer.from(data).subarray(0, 125);
    try {
      this.socket.write(encodeFrame(OP_PING, payload));
    } catch {
      this.terminate();
    }
  }

  close(code = 1000, reason = '') {
    if (this.readyState === CLOSED) return;
    const wasOpen = this.readyState === OPEN;
    this.readyState = CLOSING;
    if (!wasOpen) return;
    try {
      this.socket.write(encodeFrame(OP_CLOSE, closePayload(code, reason)), () => {
        this.socket.end();
      });
    } catch {
      this.terminate();
    }
    // Filet de sécurité si le client ne répond pas à la fermeture.
    setTimeout(() => this.terminate(), 2000).unref?.();
  }

  terminate() {
    this.readyState = CLOSED;
    try {
      this.socket.destroy();
    } catch {
      /* déjà détruit */
    }
    this.handleSocketClose();
  }

  handleSocketClose() {
    this.readyState = CLOSED;
    this.buffer = Buffer.alloc(0);
    this.fragments = [];
    if (this.closeEmitted) return;
    this.closeEmitted = true;
    this.emit('close');
  }
}

export class WebSocketServer extends EventEmitter {
  constructor({ server, path = '/', maxPayload = MAX_FRAME } = {}) {
    super();
    this.path = path;
    this.maxPayload = maxPayload;
    this.clients = new Set();
    this.server = server;

    this.handleUpgrade = this.handleUpgrade.bind(this);
    server.on('upgrade', this.handleUpgrade);
  }

  handleUpgrade(req, socket, head) {
    socket.on('error', () => socket.destroy());

    const url = new URL(req.url ?? '/', 'http://localhost');
    const key = req.headers['sec-websocket-key'];
    const upgrade = String(req.headers.upgrade ?? '').toLowerCase();

    if (url.pathname !== this.path || upgrade !== 'websocket' || !key) {
      socket.write('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }

    const accept = crypto.createHash('sha1').update(key + GUID).digest('base64');
    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n'
      + 'Upgrade: websocket\r\n'
      + 'Connection: Upgrade\r\n'
      + `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
    );

    const ws = new WebSocketConnection(socket, { maxPayload: this.maxPayload });
    this.clients.add(ws);
    ws.on('close', () => this.clients.delete(ws));

    // Les gestionnaires sont branchés avant de traiter les octets déjà reçus.
    this.emit('connection', ws, req);
    if (head?.length) ws.feed(head);
  }

  close(callback) {
    this.server?.off?.('upgrade', this.handleUpgrade);
    for (const ws of Array.from(this.clients)) {
      try {
        ws.close(1001, 'Serveur arrêté');
      } catch {
        /* ignore */
      }
    }
    this.clients.clear();
    callback?.();
  }
}
