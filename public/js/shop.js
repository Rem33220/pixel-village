// Échoppe du colporteur : le joueur y revend le butin dont il n'a plus besoin
// contre des pièces. Comme les maisons et les donjons, tout se passe dans le
// navigateur : le serveur ignore les pièces et l'inventaire.
//
// Le module sépare volontairement deux choses :
//   - la vente, pure (elle ne touche qu'au `vault`) et donc testable avec node ;
//   - le panneau et le dessin de l'échoppe, qui n'utilisent le DOM que lorsqu'on
//     les appelle (l'import reste sans effet de bord).

import { TILE_SIZE } from './map.js';
import { LOOT, coinsLabel, isEquipped, itemCount, unequipSlot } from './dungeons.js';
import { createLootIcon } from './inventory.js';

// Distance (en tuiles) à laquelle on peut parler au colporteur.
export const SHOP_RANGE = 2.1;

// Prix de revente par rareté, en pièces. Un objet légendaire vaut donc quinze
// fois un objet commun : revendre ne remplace pas l'exploration, mais évite de
// garder dix dagues rouillées au fond du sac.
export const SELL_PRICES = {
  commun: 4,
  rare: 10,
  epique: 24,
  legendaire: 60,
  mythique: 140
};

export const RARITY_LABEL = {
  commun: 'Commun',
  rare: 'Rare',
  epique: 'Épique',
  legendaire: 'Légendaire',
  mythique: 'Mythique'
};

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Le joueur est-il devant le comptoir ?
export function nearShop(shop, pos) {
  if (!shop || !pos) return false;
  const x = pos.rx ?? pos.x;
  const y = pos.ry ?? pos.y;
  return distance({ x, y }, shop.stand) <= SHOP_RANGE;
}

// Prix d'un objet, ou 0 s'il est inconnu.
export function sellPrice(id) {
  const item = LOOT[id];
  if (!item) return 0;
  return SELL_PRICES[item.rarity] ?? SELL_PRICES.commun;
}

// Vend `amount` exemplaires. Retourne { id, count, coins } ou null s'il n'y a
// rien à vendre. Vendre le dernier exemplaire d'un objet équipé le retire.
export function sellItem(vault, id, amount = 1) {
  const item = LOOT[id];
  if (!vault || !item) return null;

  const owned = itemCount(vault, id);
  const wanted = Math.floor(Number(amount));
  if (owned <= 0 || !Number.isFinite(wanted) || wanted <= 0) return null;

  const count = Math.min(owned, wanted);
  const left = owned - count;
  if (left > 0) {
    vault.items[id] = left;
  } else {
    delete vault.items[id];
    if (isEquipped(vault, id)) unequipSlot(vault, item.kind);
  }

  const coins = count * sellPrice(id);
  vault.coins = (vault.coins ?? 0) + coins;
  return { id, count, coins };
}

// Vend tout ce qui reste de cet objet.
export function sellAll(vault, id) {
  return sellItem(vault, id, itemCount(vault, id));
}

// --- Dessin de l'échoppe (repère du monde, en pixels) ----------------------

function glow(ctx, cx, cy, radius, color) {
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
}

// Auvent à rayures, comptoir, colporteur et enseigne à pièce d'or : aucun
// fichier image, tout est peint au canvas comme le reste du village.
export function drawShop(ctx, shop, now) {
  if (!shop || !shop.door) return;
  const cx = (shop.door.x + 0.5) * TILE_SIZE;
  const doorTop = shop.door.y * TILE_SIZE;
  const pulse = 0.5 + 0.5 * Math.sin(now / 620);

  // Lueur chaude de la boutique, visible de loin.
  glow(ctx, cx, doorTop + 6, 34, `rgba(246, 199, 94, ${0.1 + 0.05 * pulse})`);

  // Auvent : bandes crème et rouge, avec un liseré sombre.
  const awningW = 46;
  const awningX = cx - awningW / 2;
  const awningY = doorTop - 13;
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#e8d6a4' : '#b8574b';
    ctx.fillRect(awningX + i * (awningW / 8), awningY, awningW / 8, 8);
  }
  ctx.fillStyle = '#2b1f16';
  ctx.fillRect(awningX, awningY - 2, awningW, 2);
  ctx.fillRect(awningX, awningY + 8, awningW, 2);
  // Bords festonnés.
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(awningX + 6 + i * 11, awningY + 10, 5, 2);
  }

  // Comptoir en bois, avec un plateau clair.
  ctx.fillStyle = '#4a3220';
  ctx.fillRect(cx - 20, doorTop + 8, 40, 7);
  ctx.fillStyle = '#8a6238';
  ctx.fillRect(cx - 20, doorTop + 6, 40, 3);
  ctx.fillStyle = '#3a2718';
  ctx.fillRect(cx - 16, doorTop + 14, 3, 3);
  ctx.fillRect(cx + 13, doorTop + 14, 3, 3);

  // Le colporteur derrière son comptoir : il respire doucement.
  const bob = Math.sin(now / 700) * 0.8;
  ctx.fillStyle = '#6b4a2f';
  ctx.fillRect(cx - 7, doorTop + 3 + bob, 14, 6);
  ctx.fillStyle = '#e8b98a';
  ctx.fillRect(cx - 5, doorTop - 3 + bob, 10, 7);
  ctx.fillStyle = '#2b1f16';
  ctx.fillRect(cx - 5, doorTop - 4 + bob, 10, 2);
  ctx.fillRect(cx - 7, doorTop - 1 + bob, 2, 3);
  ctx.fillRect(cx + 5, doorTop - 1 + bob, 2, 3);
  ctx.fillStyle = '#1b1424';
  ctx.fillRect(cx - 3, doorTop + 0.5 + bob, 2, 2);
  ctx.fillRect(cx + 1, doorTop + 0.5 + bob, 2, 2);

  // Enseigne suspendue à droite de l'auvent : une pièce qui oscille.
  const sway = Math.sin(now / 900) * 1.2;
  ctx.fillStyle = '#2b1f16';
  ctx.fillRect(awningX + awningW - 4, awningY - 8, 1, 8);
  ctx.fillStyle = '#3a2718';
  ctx.fillRect(awningX + awningW - 12 + sway, awningY - 8, 17, 9);
  ctx.fillStyle = '#c9a24a';
  ctx.beginPath();
  ctx.arc(awningX + awningW - 3.5 + sway, awningY - 3.5, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(255, 243, 189, ${0.55 + 0.35 * pulse})`;
  ctx.fillRect(awningX + awningW - 5 + sway, awningY - 6, 1, 5);

  // Pièce posée sur le comptoir, qui scintille.
  ctx.fillStyle = `rgba(246, 211, 77, ${0.6 + 0.4 * pulse})`;
  ctx.fillRect(cx + 8, doorTop + 4, 3, 1);
  ctx.fillRect(cx + 9, doorTop + 5, 1, 1);
}

// --- Panneau de vente ------------------------------------------------------

export function createShopPanel({ getVault, onChange, onSell }) {
  const root = document.getElementById('shop');
  const list = document.getElementById('shop-list');
  const empty = document.getElementById('shop-empty');
  const coins = document.getElementById('shop-coins');
  const closeBtn = document.getElementById('shop-close');

  function isOpen() {
    return !root.classList.contains('hidden');
  }

  function sell(id, amount) {
    onSell?.(id, amount);
    render();
  }

  function row(id) {
    const item = LOOT[id];
    const vault = getVault();
    const qty = itemCount(vault, id);

    const li = document.createElement('li');
    li.className = 'shop-item';

    const icon = document.createElement('span');
    icon.className = 'shop-icon';
    icon.append(createLootIcon(id));
    li.append(icon);

    const info = document.createElement('div');
    info.className = 'shop-info';
    const name = document.createElement('span');
    name.className = `shop-name rarity-${item.rarity}`;
    name.textContent = item.name;
    const meta = document.createElement('span');
    meta.className = 'shop-meta';
    meta.textContent = `${RARITY_LABEL[item.rarity] ?? 'Commun'} · ${qty} en sac${
      isEquipped(vault, id) ? ' · équipé' : ''
    }`;
    info.append(name, meta);
    li.append(info);

    const price = document.createElement('span');
    price.className = 'shop-price';
    price.textContent = `+${sellPrice(id)}`;
    price.title = 'pièces par exemplaire';
    li.append(price);

    const one = document.createElement('button');
    one.type = 'button';
    one.className = 'btn small shop-sell';
    one.textContent = 'Vendre';
    one.addEventListener('click', () => {
      one.blur();
      sell(id, 1);
    });
    li.append(one);

    if (qty > 1) {
      const all = document.createElement('button');
      all.type = 'button';
      all.className = 'mini-btn shop-sell';
      all.textContent = `Tout (${qty})`;
      all.addEventListener('click', () => {
        all.blur();
        sell(id, qty);
      });
      li.append(all);
    }

    return li;
  }

  function render() {
    const vault = getVault();
    coins.textContent = `Bourse : ${coinsLabel(vault.coins)}`;
    list.replaceChildren();

    const ids = Object.keys(vault.items)
      .filter((id) => LOOT[id] && itemCount(vault, id) > 0)
      .sort((a, b) => {
        const itemA = LOOT[a];
        const itemB = LOOT[b];
        const rank = { mythique: 0, legendaire: 1, epique: 2, rare: 3, commun: 4 };
        const diff = (rank[itemA.rarity] ?? 9) - (rank[itemB.rarity] ?? 9);
        return diff !== 0 ? diff : itemA.name.localeCompare(itemB.name, 'fr');
      });

    for (const id of ids) list.append(row(id));
    empty.classList.toggle('hidden', ids.length > 0);
  }

  function open() {
    if (isOpen()) return;
    root.classList.remove('hidden');
    render();
    closeBtn.focus();
    onChange?.();
  }

  function close() {
    if (!isOpen()) return;
    root.classList.add('hidden');
    closeBtn.blur();
    onChange?.();
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
