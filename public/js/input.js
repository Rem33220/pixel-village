// Clavier : ZQSD, WASD et flèches. On lit `event.code`, donc les touches
// physiques fonctionnent aussi bien sur clavier AZERTY que QWERTY.

import { getBindings } from './settings.js';

const pressed = new Set();
let enabled = true;

// Les flèches restent toujours disponibles pour marcher, en plus des touches
// choisies dans les paramètres (voir public/js/settings.js).
const ARROW_CODES = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

function isMoveCode(code) {
  const keys = getBindings();
  return ARROW_CODES.has(code)
    || code === keys.up
    || code === keys.down
    || code === keys.left
    || code === keys.right;
}

export function isTyping(event) {
  const el = event.target;
  if (!(el instanceof HTMLElement)) return false;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable;
}

export function initInput() {
  window.addEventListener('keydown', (event) => {
    if (isTyping(event)) return;
    pressed.add(event.code);
    if (isMoveCode(event.code)) event.preventDefault();
  });

  window.addEventListener('keyup', (event) => {
    pressed.delete(event.code);
  });

  window.addEventListener('blur', () => pressed.clear());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pressed.clear();
  });
}

// Coupe le déplacement sans toucher au clavier lui-même : utilisé quand un
// panneau (inventaire) est ouvert, pour ne pas envoyer d'ordre au serveur.
// On vide aussi les touches maintenues : sans cela, une direction encore
// enfoncée repartirait toute seule à la fermeture du panneau.
export function setInputEnabled(value) {
  enabled = Boolean(value);
  pressed.clear();
}

export function moveVector() {
  if (!enabled) return { x: 0, y: 0 };

  const keys = getBindings();
  let x = 0;
  let y = 0;
  if (pressed.has(keys.left) || pressed.has('ArrowLeft')) x -= 1;
  if (pressed.has(keys.right) || pressed.has('ArrowRight')) x += 1;
  if (pressed.has(keys.up) || pressed.has('ArrowUp')) y -= 1;
  if (pressed.has(keys.down) || pressed.has('ArrowDown')) y += 1;

  const length = Math.hypot(x, y);
  if (length === 0) return { x: 0, y: 0 };
  return { x: x / length, y: y / length };
}
