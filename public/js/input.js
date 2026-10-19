// Clavier : ZQSD, WASD et flèches. On lit `event.code`, donc les touches
// physiques fonctionnent aussi bien sur clavier AZERTY que QWERTY.

const pressed = new Set();

const MOVE_CODES = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD'
]);

export function isTyping(event) {
  const el = event.target;
  if (!(el instanceof HTMLElement)) return false;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable;
}

export function initInput() {
  window.addEventListener('keydown', (event) => {
    if (isTyping(event)) return;
    pressed.add(event.code);
    if (MOVE_CODES.has(event.code)) event.preventDefault();
  });

  window.addEventListener('keyup', (event) => {
    pressed.delete(event.code);
  });

  window.addEventListener('blur', () => pressed.clear());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pressed.clear();
  });
}

export function moveVector() {
  let x = 0;
  let y = 0;
  if (pressed.has('ArrowLeft') || pressed.has('KeyA')) x -= 1;
  if (pressed.has('ArrowRight') || pressed.has('KeyD')) x += 1;
  if (pressed.has('ArrowUp') || pressed.has('KeyW')) y -= 1;
  if (pressed.has('ArrowDown') || pressed.has('KeyS')) y += 1;

  const length = Math.hypot(x, y);
  if (length === 0) return { x: 0, y: 0 };
  return { x: x / length, y: y / length };
}
