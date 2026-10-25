// Paramètres du joueur : volume des sons et touches personnalisables.
// Tout est conservé dans le navigateur (localStorage), sans compte.

import {
  playSound,
  setVolume as applyVolume,
  getVolume,
  setMuted as applyMuted,
  isMuted
} from './audio.js';
import { applySave, describeSave, exportSave, parseSave } from './save.js';

const KEYS_STORAGE = 'pixel-village:keys';
const SETTINGS_STORAGE = 'pixel-village:settings';

export const DEFAULT_BINDINGS = {
  up: 'KeyW',
  down: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  interact: 'KeyE',
  inventory: 'KeyI',
  settings: 'KeyP'
};

export const ACTION_LABELS = {
  up: 'Haut',
  down: 'Bas',
  left: 'Gauche',
  right: 'Droite',
  interact: 'Agir / entrer',
  inventory: 'Inventaire',
  settings: 'Paramètres'
};

const ACTION_ORDER = ['up', 'down', 'left', 'right', 'interact', 'inventory', 'settings'];

// Touches qu'on ne laisse pas réaffecter : elles servent au navigateur, au chat
// ou à l'annulation de la modification.
const RESERVED_CODES = new Set([
  'Escape',
  'Tab',
  'Enter',
  'NumpadEnter',
  'ShiftLeft',
  'ShiftRight',
  'ControlLeft',
  'ControlRight',
  'AltLeft',
  'AltRight',
  'MetaLeft',
  'MetaRight'
]);

const KEY_LABELS = {
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Space: 'Espace',
  Enter: 'Entrée',
  Escape: 'Échap',
  Tab: 'Tab',
  Backspace: 'Retour',
  ShiftLeft: 'Maj',
  ShiftRight: 'Maj',
  ControlLeft: 'Ctrl',
  ControlRight: 'Ctrl',
  AltLeft: 'Alt',
  AltRight: 'Alt',
  Backquote: '²',
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Semicolon: ';',
  Quote: "'",
  Comma: ',',
  Period: '.',
  Slash: '/',
  Backslash: '\\',
  NumpadAdd: '+',
  NumpadSubtract: '-'
};

// Les libellés suivent le clavier réel du joueur quand le navigateur sait le
// donner (Chrome/Edge) : sur AZERTY, KeyW s'affiche « Z ».
let layoutMap = null;
const panels = new Set();

if (typeof navigator !== 'undefined' && navigator.keyboard?.getLayoutMap) {
  navigator.keyboard.getLayoutMap()
    .then((map) => {
      layoutMap = map;
      for (const panel of panels) panel.refreshLabels();
    })
    .catch(() => {
      /* pas de plan de clavier : les libellés par défaut suffisent */
    });
}

export function labelFor(code) {
  if (!code) return '—';
  if (KEY_LABELS[code]) return KEY_LABELS[code];
  const fromKeyboard = layoutMap?.get(code);
  if (fromKeyboard) return fromKeyboard.toUpperCase();
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return `Pavé ${code.slice(6)}`;
  return code;
}

// --- État persistant -------------------------------------------------------

function uniqueBindings(source) {
  const result = {};
  const used = new Set();
  for (const action of ACTION_ORDER) {
    const candidate = typeof source?.[action] === 'string' ? source[action] : '';
    if (candidate && !used.has(candidate)) {
      result[action] = candidate;
      used.add(candidate);
      continue;
    }
    const fallback = DEFAULT_BINDINGS[action];
    if (!used.has(fallback)) {
      result[action] = fallback;
      used.add(fallback);
    }
  }
  // Une sauvegarde abîmée ne doit jamais laisser une action sans touche.
  for (const action of ACTION_ORDER) {
    if (!result[action]) result[action] = DEFAULT_BINDINGS[action];
  }
  return result;
}

let bindings = { ...DEFAULT_BINDINGS };
let volume = 100;
let muted = false;

function load() {
  try {
    bindings = uniqueBindings(JSON.parse(localStorage.getItem(KEYS_STORAGE) || '{}'));
  } catch {
    bindings = { ...DEFAULT_BINDINGS };
  }
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_STORAGE) || '{}');
    if (Number.isFinite(saved.volume)) volume = Math.min(100, Math.max(0, saved.volume));
    muted = saved.muted === true;
  } catch {
    /* réglages illisibles : on garde les valeurs par défaut */
  }
  applyVolume(volume);
  applyMuted(muted);
}

function saveBindings() {
  try {
    localStorage.setItem(KEYS_STORAGE, JSON.stringify(bindings));
  } catch {
    /* stockage indisponible */
  }
}

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_STORAGE, JSON.stringify({ volume, muted }));
  } catch {
    /* stockage indisponible */
  }
}

load();

export function getBindings() {
  return bindings;
}

export function getSettings() {
  return { volume, muted };
}

export function resetSettings() {
  bindings = { ...DEFAULT_BINDINGS };
  volume = 100;
  muted = false;
  applyVolume(volume);
  applyMuted(muted);
  saveBindings();
  saveSettings();
  return { volume, muted };
}

// --- Panneau ---------------------------------------------------------------

export function createSettingsPanel({ onToggle, onBindingsChanged } = {}) {
  const root = document.getElementById('settings');
  const closeBtn = document.getElementById('settings-close');
  const volumeInput = document.getElementById('settings-volume');
  const volumeValue = document.getElementById('settings-volume-value');
  const muteBtn = document.getElementById('settings-mute');
  const testBtn = document.getElementById('settings-test');
  const resetBtn = document.getElementById('settings-reset');
  const keysBox = document.getElementById('settings-keys');
  const statusLine = document.getElementById('settings-status');
  const exportBtn = document.getElementById('settings-export');
  const importBtn = document.getElementById('settings-import');
  const importFile = document.getElementById('settings-import-file');
  const saveLine = document.getElementById('settings-save-status');

  let listening = null;
  let note = '';
  // Sauvegarde lue dans un fichier, en attente de confirmation.
  let pendingSave = null;
  let importTimer = 0;

  function isOpen() {
    return !root.classList.contains('hidden');
  }

  function setNote(text) {
    note = text;
    statusLine.textContent = text;
  }

  function setSaveStatus(text) {
    saveLine.textContent = text;
  }

  // Désarme un import en attente : rien n'a encore été écrit.
  function disarmImport(message = '') {
    pendingSave = null;
    clearTimeout(importTimer);
    importBtn.classList.remove('confirm');
    importBtn.textContent = 'Importer une sauvegarde';
    setSaveStatus(message);
  }

  function syncVolume() {
    volumeInput.value = String(volume);
    volumeValue.textContent = `${volume} %`;
  }

  function syncMute() {
    muteBtn.textContent = muted ? 'Rétablir le son' : 'Couper le son';
    muteBtn.setAttribute('aria-pressed', String(muted));
  }

  function renderKeys() {
    keysBox.replaceChildren();
    for (const action of ACTION_ORDER) {
      const row = document.createElement('div');
      row.className = 'settings-key-row';

      const label = document.createElement('span');
      label.className = 'settings-key-name';
      label.textContent = ACTION_LABELS[action];

      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `settings-key-chip${listening === action ? ' listening' : ''}`;
      chip.dataset.action = action;
      chip.textContent = listening === action ? 'Appuie…' : labelFor(bindings[action]);
      chip.setAttribute('aria-label', `Modifier la touche ${ACTION_LABELS[action]}`);
      chip.addEventListener('click', () => {
        listening = action;
        setNote(`Appuie sur la nouvelle touche pour « ${ACTION_LABELS[action]} » (Échap pour annuler).`);
        renderKeys();
      });

      row.append(label, chip);
      keysBox.append(row);
    }
  }

  function assign(action, code) {
    const owner = ACTION_ORDER.find((other) => other !== action && bindings[other] === code);
    if (owner) {
      const previous = bindings[action];
      bindings[action] = code;
      bindings[owner] = previous;
      setNote(`${labelFor(code)} était pris par « ${ACTION_LABELS[owner]} » : les deux touches ont été échangées.`);
    } else {
      bindings[action] = code;
      setNote(`« ${ACTION_LABELS[action]} » utilise maintenant ${labelFor(code)}.`);
    }
    saveBindings();
    renderKeys();
    onBindingsChanged?.();
  }

  function handleCapture(event) {
    if (!listening) return;
    event.preventDefault();
    // stopImmediatePropagation : le gestionnaire global du jeu écoute aussi le
    // clavier sur window, et doit être bloqué, surtout pour Échap.
    event.stopImmediatePropagation();

    if (event.code === 'Escape') {
      listening = null;
      renderKeys();
      setNote('Modification annulée.');
      return;
    }
    if (RESERVED_CODES.has(event.code)) {
      setNote(`${labelFor(event.code)} est réservée : essaie une autre touche.`);
      return;
    }

    const action = listening;
    listening = null;
    assign(action, event.code);
  }

  window.addEventListener('keydown', handleCapture, true);

  function refresh() {
    syncVolume();
    syncMute();
    renderKeys();
  }

  function refreshLabels() {
    if (isOpen()) renderKeys();
  }

  function open() {
    if (isOpen()) return;
    root.classList.remove('hidden');
    listening = null;
    setNote('');
    disarmImport();
    refresh();
    closeBtn.focus();
    onToggle?.(true);
  }

  function close() {
    if (!isOpen()) return;
    root.classList.add('hidden');
    listening = null;
    closeBtn.blur();
    onToggle?.(false);
  }

  function toggle() {
    if (isOpen()) close();
    else open();
  }

  volumeInput.addEventListener('input', () => {
    volume = Number(volumeInput.value) || 0;
    applyVolume(volume);
    volumeValue.textContent = `${volume} %`;
    saveSettings();
  });

  volumeInput.addEventListener('change', () => {
    playSound('click');
  });

  muteBtn.addEventListener('click', () => {
    muted = !muted;
    applyMuted(muted);
    saveSettings();
    syncMute();
    playSound('click');
  });

  testBtn.addEventListener('click', () => {
    playSound('success');
  });

  resetBtn.addEventListener('click', () => {
    resetSettings();
    listening = null;
    refresh();
    setNote('Réglages remis à zéro.');
    onBindingsChanged?.();
    playSound('click');
  });

  exportBtn.addEventListener('click', async () => {
    exportBtn.disabled = true;
    const result = await exportSave();
    exportBtn.disabled = false;

    if (result.cancelled) {
      setSaveStatus('Export annulé : l’ancienne sauvegarde n’a pas été modifiée.');
      return;
    }
    setSaveStatus(`${describeSave(result.save)} — enregistré dans ${result.fileName}.`);
    playSound('success');
  });

  // Deux temps : choisir un fichier affiche son contenu, un second clic
  // remplace le personnage. Rien n'est écrasé par simple sélection.
  importBtn.addEventListener('click', () => {
    if (pendingSave) {
      const save = pendingSave;
      pendingSave = null;
      clearTimeout(importTimer);
      importBtn.classList.remove('confirm');
      importBtn.textContent = 'Importer une sauvegarde';

      if (!applySave(save)) {
        setSaveStatus('Impossible d’écrire dans le stockage du navigateur : sauvegarde non restaurée (mode privé ?).');
        playSound('fail');
        return;
      }
      setSaveStatus('Sauvegarde restaurée. Rechargement du personnage…');
      playSound('success');
      setTimeout(() => window.location.reload(), 500);
      return;
    }
    disarmImport();
    importFile.value = '';
    importFile.click();
  });

  importFile.addEventListener('change', async () => {
    const file = importFile.files?.[0];
    if (!file) return;

    let text = '';
    try {
      text = await file.text();
    } catch {
      /* lecture refusée : traité comme un fichier illisible */
    }

    const result = parseSave(text);
    if (!result.ok) {
      disarmImport(result.error);
      playSound('fail');
      return;
    }

    pendingSave = result.save;
    importBtn.classList.add('confirm');
    importBtn.textContent = 'Remplacer mon personnage ?';
    setSaveStatus(
      `${describeSave(pendingSave)} — clique sur « Remplacer mon personnage ? » pour charger ce fichier.`
    );
    playSound('click');

    clearTimeout(importTimer);
    importTimer = setTimeout(
      () => disarmImport('Import annulé : rien n’a été modifié.'),
      30_000
    );
  });

  closeBtn.addEventListener('click', close);
  root.addEventListener('click', (event) => {
    if (event.target === root) close();
  });

  panels.add({ refreshLabels });

  return {
    open,
    close,
    toggle,
    isOpen,
    refresh,
    refreshLabels,
    getVolumeState: () => ({ volume: getVolume(), muted: isMuted() })
  };
}
