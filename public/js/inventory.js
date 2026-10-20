// Inventaire : les récompenses gagnées dans les maisons, ouvert avec la touche I.
// Les icônes sont dessinées en pixel art (16 × 16) comme les personnages, donc
// aucun fichier image à télécharger.

import { REWARDS } from './houses.js';

export const ITEM_ORDER = ['lampe', 'bottes', 'medaille'];

const ICONS = {
  lampe: {
    palette: { k: '#3b3327', l: '#c9a24a', y: '#f6d34d', Y: '#fff3bd' },
    rows: [
      '................',
      '.....kkkkkk.....',
      '......k..k......',
      '...kkkkkkkkkk...',
      '...kllllllllk...',
      '...klYYYYYYlk...',
      '...klyyyyyylk...',
      '...klyYYYYylk...',
      '...klyyyyyylk...',
      '...klYYYYYYlk...',
      '...kllllllllk...',
      '...kkkkkkkkkk...',
      '......k..k......',
      '.....kk..kk.....',
      '................',
      '................'
    ]
  },
  bottes: {
    palette: { b: '#8a5a33', B: '#a9713f', k: '#4a2c18', w: '#bfe6f7' },
    rows: [
      '................',
      '................',
      '..bbbbb..bbbbb..',
      '..bBBBb..bBBBb..',
      '..bBBBb..bBBBb..',
      '..bBBBb..bBBBb..',
      '..bBBBBbbbBBBb..',
      '..bBBBBBBBBBBb..',
      '..bBBBBBBBBBBb..',
      '..bbbbbbbbbbbb..',
      '..kkkkkkkkkkkk..',
      '....ww...ww.....',
      '................',
      '................',
      '................',
      '................'
    ]
  },
  medaille: {
    palette: { k: '#4a2c18', r: '#b5564b', y: '#e0a83c', Y: '#f6d34d' },
    rows: [
      '................',
      '....kk....kk....',
      '...krrk..krrk...',
      '...krrk..krrk...',
      '....krrkkrrk....',
      '.....kkkkkk.....',
      '....yyyyyyyy....',
      '...yyYYYYYYyy...',
      '...yyYyyyyYyy...',
      '...yyYyyyyYyy...',
      '...yyYYYYYYyy...',
      '....yyyyyyyy....',
      '.....yyyyyy.....',
      '................',
      '................',
      '................'
    ]
  }
};

function makeIcon(name) {
  const icon = ICONS[name];
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  canvas.className = 'item-icon';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  icon.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const color = icon.palette[row[x]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  });

  return canvas;
}

export function createInventory({ getRewards, onChange }) {
  const root = document.getElementById('inventory');
  const grid = document.getElementById('inventory-grid');
  const detail = document.getElementById('inventory-detail');
  const count = document.getElementById('inventory-count');
  const closeBtn = document.getElementById('inventory-close');

  let selected = null;

  function isOpen() {
    return !root.classList.contains('hidden');
  }

  function renderDetail(id, owned) {
    const item = REWARDS[id];
    detail.replaceChildren();

    const title = document.createElement('h3');
    title.textContent = owned ? item.name : 'Emplacement vide';

    const source = document.createElement('p');
    source.className = 'inventory-source';
    source.textContent = owned ? `Gagné dans : ${item.house}` : `À gagner dans : ${item.house}`;

    const text = document.createElement('p');
    text.textContent = owned
      ? item.detail
      : 'Réussis l’épreuve de cette maison pour remplir cet emplacement.';

    detail.append(title, source, text);

    if (owned) {
      const effect = document.createElement('p');
      effect.className = 'inventory-effect';
      effect.textContent = `Effet : ${item.effect}`;
      detail.append(effect);
    }
  }

  function render() {
    const owned = getRewards();
    if (!selected || !REWARDS[selected]) {
      selected = ITEM_ORDER.find((id) => owned.has(id)) ?? ITEM_ORDER[0];
    }

    count.textContent = `${owned.size} / ${ITEM_ORDER.length} récompense${ITEM_ORDER.length > 1 ? 's' : ''}`;
    grid.replaceChildren();

    for (const id of ITEM_ORDER) {
      const has = owned.has(id);
      const item = REWARDS[id];

      const slot = document.createElement('button');
      slot.type = 'button';
      slot.className = `inventory-slot${has ? ' owned' : ' locked'}${selected === id ? ' selected' : ''}`;
      slot.setAttribute('aria-pressed', String(selected === id));
      slot.setAttribute('aria-label', has ? item.name : `Emplacement vide — ${item.house}`);

      if (has) {
        slot.append(makeIcon(id));
      } else {
        const mark = document.createElement('span');
        mark.className = 'inventory-locked-mark';
        mark.textContent = '?';
        slot.append(mark);
      }

      const label = document.createElement('span');
      label.className = 'inventory-slot-label';
      label.textContent = has ? item.name : 'Vide';
      slot.append(label);

      slot.addEventListener('click', () => {
        selected = id;
        render();
      });
      grid.append(slot);
    }

    renderDetail(selected, owned.has(selected));
  }

  function open() {
    if (isOpen()) return;
    root.classList.remove('hidden');
    render();
    closeBtn.focus();
    onChange?.(true);
  }

  function close() {
    if (!isOpen()) return;
    root.classList.add('hidden');
    closeBtn.blur();
    onChange?.(false);
  }

  function toggle() {
    if (isOpen()) close();
    else open();
  }

  closeBtn.addEventListener('click', close);
  root.addEventListener('click', (event) => {
    if (event.target === root) close();
  });

  return { open, close, toggle, render, isOpen };
}
