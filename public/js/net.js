// Petite surcouche WebSocket : connexion, envoi JSON, gestion des erreurs.
import { CONFIG } from './config.js';

export function websocketUrl() {
  const fromQuery = new URLSearchParams(window.location.search).get('server');
  // En local (double-clic sur le lanceur), on parle toujours au serveur qui a
  // servi la page : serverUrl ne sert qu'à l'hébergement distant (itch.io).
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);
  const configured = (fromQuery || (local ? '' : CONFIG.serverUrl) || '').trim();

  let origin;
  if (configured) {
    const url = new URL(configured.includes('://') ? configured : `https://${configured}`);
    origin = url.origin;
  } else {
    // Page chargée dans une iframe (itch.io) : le serveur n'est pas sur la même
    // origine, donc sans serverUrl la connexion ne peut pas aboutir.
    if (window.self !== window.top) {
      throw new Error('serverUrl est vide dans config.js');
    }
    origin = window.location.origin;
    if (!/^https?:/.test(origin)) throw new Error('Origine locale inconnue');
  }

  const protocol = origin.startsWith('https:') ? 'wss:' : 'ws:';
  const host = origin.replace(/^https?:/, '');
  return `${protocol}${host}${CONFIG.wsPath}`;
}

export function createConnection(handlers) {
  let ws = null;
  let open = false;
  let closedByUs = false;

  function connect({ name, color }) {
    closedByUs = false;
    open = false;

    let url;
    try {
      url = websocketUrl();
    } catch (error) {
      handlers.onClose?.(error);
      return;
    }

    try {
      ws = new WebSocket(url);
    } catch (error) {
      handlers.onClose?.(error);
      return;
    }

    const timer = setTimeout(() => {
      if (open) return;
      closedByUs = true;
      try {
        ws.close();
      } catch {
        /* déjà fermé */
      }
      handlers.onClose?.(new Error('Délai de connexion dépassé'));
    }, 5000);

    ws.addEventListener('open', () => {
      open = true;
      clearTimeout(timer);
      ws.send(JSON.stringify({ t: 'join', name, color }));
      handlers.onOpen?.();
    });

    ws.addEventListener('message', (event) => {
      let message;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }
      handlers.onMessage?.(message);
    });

    ws.addEventListener('close', () => {
      clearTimeout(timer);
      const wasOpen = open;
      open = false;
      if (closedByUs) return;
      handlers.onClose?.(new Error(wasOpen ? 'Connexion fermée' : 'Serveur injoignable'));
    });

    ws.addEventListener('error', () => {
      // L'événement "close" qui suit s'occupe du diagnostic.
    });
  }

  function send(message) {
    if (ws && open) ws.send(JSON.stringify(message));
  }

  function close() {
    closedByUs = true;
    try {
      ws?.close();
    } catch {
      /* déjà fermé */
    }
  }

  return { connect, send, close };
}
