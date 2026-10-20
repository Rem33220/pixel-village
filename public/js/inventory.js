// Inventaire : récompenses des maisons, équipement porté et butin des donjons,
// ouvert avec la touche I. Les icônes sont dessinées en pixel art (16 × 16)
// comme les personnages, donc aucun fichier image à télécharger.

import { REWARDS } from './houses.js';
import {
  LOOT,
  ITEM_ICONS,
  coinsLabel,
  dungeonOfItem,
  isEquipped,
  itemCount,
  ownsItem
} from './dungeons.js';

export const ITEM_ORDER = ['lampe', 'bottes', 'medaille'];

const SLOTS = [
  { id: 'arme', label: 'Arme', empty: 'Aucune arme' },
  { id: 'armure', label: 'Armure', empty: 'Aucune armure' }
];

const RARITY = {
  commun: 'Commun',
  rare: 'Rare',
  epique: 'Épique',
  legendaire: 'Légendaire'
};

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

function paintIcon(icon, palette) {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  canvas.className = 'item-icon';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  icon.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const color = palette[row[x]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  });

  return canvas;
}

function rewardIcon(id) {
  return paintIcon(ICONS[id], ICONS[id].palette);
}

// Icône d'un objet du butin, réutilisée par l'échoppe (voir shop.js).
export function createLootIcon(id) {
  const item = LOOT[id];
  const icon = ITEM_ICONS[item.kind];
  return paintIcon(icon, { ...icon.palette, b: item.color });
}

const lootIcon = createLootIcon;

function bonusLabel(item) {
  if (item.kind === 'arme') return `+${item.attack} ATQ`;
  return `+${item.defense} DÉF`;
}

export function createInventory({ getRewards, getVault, onChange, onEquip }) {
  const root = document.getElementById('inventory');
  const grid = document.getElementById('inventory-grid');
  const lootGrid = document.getElementById('inventory-loot');
  const lootEmpty = document.getElementById('inventory-loot-empty');
  const equipment = document.getElementById('inventory-equipment');
  const detail = document.getElementById('inventory-detail');
  const count = document.getElementById('inventory-count');
  const closeBtn = document.getElementById('inventory-close');

  let selected = { type: 'reward', id: ITEM_ORDER[0] };

  function isOpen() {
    return !root.classList.contains('hidden');
  }

  function ownedLoot() {
    const vault = getVault();
    return Object.keys(vault.items)
      .filter((id) => ownsItem(vault, id))
      .sort((a, b) => {
        const itemA = LOOT[a];
        const itemB = LOOT[b];
        if (itemA.kind !== itemB.kind) return itemA.kind === 'arme' ? -1 : 1;
        return itemB.attack + itemB.defense - (itemA.attack + itemA.defense);
      });
  }

  function select(next) {
    selected = next;
    render();
  }

  // --- Détail -------------------------------------------------------------

  function renderRewardDetail(id, owned) {
    const item = REWARDS[id];
    if (!item) return;

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

  function renderLootDetail(id) {
    const item = LOOT[id];
    const vault = getVault();
    const dungeon = dungeonOfItem(id);
    const has = ownsItem(vault, id);
    const equipped = isEquipped(vault, id);

    const title = document.createElement('h3');
    title.textContent = item.name;

    const source = document.createElement('p');
    source.className = 'inventory-source';
    source.textContent = dungeon
      ? `Butin — ${dungeon.name} (niveau ${dungeon.level})`
      : 'Butin des donjons';

    const stats = document.createElement('p');
    stats.className = 'inventory-effect';
    stats.textContent = `${RARITY[item.rarity] ?? 'Commun'} · ${item.kind === 'arme' ? 'Arme' : 'Armure'} · ${bonusLabel(item)}`;

    const text = document.createElement('p');
    text.textContent = item.detail;

    detail.append(title, source, stats, text);

    if (equipped) {
      const state = document.createElement('p');
      state.className = 'inventory-equipped';
      state.textContent = 'Équipé — il compte dans tes statistiques.';
      detail.append(state);
    }

    if (!has) return;

    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'btn small inventory-action';
    action.textContent = equipped ? 'Retirer' : 'Équiper';
    action.addEventListener('click', () => {
      action.blur();
      onEquip?.(id);
    });
    detail.append(action);
  }

  function renderSlotDetail(slot) {
    const vault = getVault();
    const id = vault.equipped[slot.id];
    const title = document.createElement('h3');
    title.textContent = `${slot.label}${id ? ` : ${LOOT[id].name}` : ''}`;

    const text = document.createElement('p');
    text.className = 'inventory-source';
    text.textContent = id
      ? bonusLabel(LOOT[id])
      : `Rien d’équipé. Choisis ${slot.id === 'arme' ? 'une arme' : 'une armure'} dans ton butin ci-dessus.`;

    detail.append(title, text);

    if (!id) return;

    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'btn small inventory-action';
    action.textContent = 'Retirer';
    action.addEventListener('click', () => {
      action.blur();
      onEquip?.(id);
    });
    detail.append(action);
  }

  function renderDetail() {
    detail.replaceChildren();
    if (selected.type === 'loot') {
      if (!LOOT[selected.id]) selected = { type: 'reward', id: ITEM_ORDER[0] };
      else {
        renderLootDetail(selected.id);
        return;
      }
    }
    if (selected.type === 'slot') {
      const slot = SLOTS.find((entry) => entry.id === selected.id);
      if (slot) {
        renderSlotDetail(slot);
        return;
      }
      selected = { type: 'reward', id: ITEM_ORDER[0] };
    }
    const owned = getRewards();
    if (!REWARDS[selected.id]) selected = { type: 'reward', id: ITEM_ORDER[0] };
    renderRewardDetail(selected.id, owned.has(selected.id));
  }

  // --- Grilles ------------------------------------------------------------

  function renderEquipment() {
    const vault = getVault();
    equipment.replaceChildren();

    for (const slot of SLOTS) {
      const id = vault.equipped[slot.id];
      const item = id ? LOOT[id] : null;

      const button = document.createElement('button');
      button.type = 'button';
      button.className = `inventory-slot equipment-slot${item ? ' owned' : ' locked'}${
        selected.type === 'slot' && selected.id === slot.id ? ' selected' : ''
      }`;
      button.setAttribute('aria-pressed', String(selected.type === 'slot' && selected.id === slot.id));
      button.setAttribute('aria-label', item ? `${slot.label} : ${item.name}` : `${slot.label} : vide`);

      if (item) {
        button.append(lootIcon(id));
      } else {
        const mark = document.createElement('span');
        mark.className = 'inventory-locked-mark';
        mark.textContent = '—';
        button.append(mark);
      }

      const label = document.createElement('span');
      label.className = 'inventory-slot-label';
      label.textContent = item ? item.name : slot.empty;
      button.append(label);

      const tag = document.createElement('span');
      tag.className = 'inventory-slot-tag';
      tag.textContent = item ? bonusLabel(item) : slot.label;
      button.append(tag);

      button.addEventListener('click', () => select({ type: 'slot', id: slot.id }));
      equipment.append(button);
    }
  }

  function renderLoot() {
    const vault = getVault();
    const ids = ownedLoot();
    lootGrid.replaceChildren();
    lootEmpty.classList.toggle('hidden', ids.length > 0);

    for (const id of ids) {
      const item = LOOT[id];
      const qty = itemCount(vault, id);
      const slot = document.createElement('button');
      slot.type = 'button';
      const equipped = isEquipped(vault, id);
      slot.className = `inventory-slot owned${equipped ? ' equipped' : ''}${
        selected.type === 'loot' && selected.id === id ? ' selected' : ''
      }`;
      slot.setAttribute('aria-pressed', String(selected.type === 'loot' && selected.id === id));
      slot.setAttribute('aria-label', `${item.name}${qty > 1 ? ` ×${qty}` : ''}${equipped ? ' (équipé)' : ''}`);

      slot.append(lootIcon(id));

      if (qty > 1) {
        const badge = document.createElement('span');
        badge.className = 'inventory-count-badge';
        badge.textContent = `×${qty}`;
        slot.append(badge);
      }

      const label = document.createElement('span');
      label.className = 'inventory-slot-label';
      label.textContent = item.name;
      slot.append(label);

      const tag = document.createElement('span');
      tag.className = `inventory-slot-tag rarity-${item.rarity}`;
      tag.textContent = equipped ? 'Équipé' : bonusLabel(item);
      slot.append(tag);

      slot.addEventListener('click', () => select({ type: 'loot', id }));
      lootGrid.append(slot);
    }
  }

  function renderRewards() {
    const owned = getRewards();
    grid.replaceChildren();

    for (const id of ITEM_ORDER) {
      const has = owned.has(id);
      const item = REWARDS[id];

      const slot = document.createElement('button');
      slot.type = 'button';
      slot.className = `inventory-slot${has ? ' owned' : ' locked'}${
        selected.type === 'reward' && selected.id === id ? ' selected' : ''
      }`;
      slot.setAttribute('aria-pressed', String(selected.type === 'reward' && selected.id === id));
      slot.setAttribute('aria-label', has ? item.name : `Emplacement vide — ${item.house}`);

      if (has) {
        slot.append(rewardIcon(id));
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

      slot.addEventListener('click', () => select({ type: 'reward', id }));
      grid.append(slot);
    }
  }

  function render() {
    const owned = getRewards();
    const vault = getVault();
    const loot = ownedLoot().length;
    count.textContent = `${owned.size} / ${ITEM_ORDER.length} récompenses · ${loot} butin · ${coinsLabel(vault.coins)}`;

    renderEquipment();
    renderLoot();
    renderRewards();
    renderDetail();
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

// Utilisé par le HUD pour nommer ce que l'on porte.
export function equipmentSummary(vault) {
  return SLOTS
    .map((slot) => {
      const id = vault.equipped[slot.id];
      return id ? `${slot.label} : ${LOOT[id].name}` : null;
    })
    .filter(Boolean)
    .join(' · ');
}
