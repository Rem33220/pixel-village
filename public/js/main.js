// Point d'entrée du client : boucle de jeu, connexion, chat, HUD, maisons.
import { CONFIG } from './config.js';
import { generateWorld, isSolid } from './map.js';
import { Renderer } from './renderer.js';
import { initInput, moveVector, isTyping, setInputEnabled } from './input.js';
import { createConnection, websocketUrl } from './net.js';
import { createInventory, equipmentSummary, itemBonusLabel } from './inventory.js';
import { createShopPanel, drawShop, nearShop, sellAll, sellItem } from './shop.js';
import { createSettingsPanel, getBindings, labelFor } from './settings.js';
import { playSound } from './audio.js';
import {
  DASH_SPEED,
  abilityState,
  createSkills,
  gainXp,
  prepareAbilities,
  progress,
  sanitizeSkills,
  serializeSkills,
  skillEffects,
  startDash,
  tickAbilities,
  unlockSkill,
  xpForKill
} from './skills.js';
import { createSkillPanel } from './skills-panel.js';
import {
  buildHouses,
  buildInterior,
  createChallenge,
  updateChallenge,
  answerQuiz,
  openQuiz,
  drawChallenge,
  drawHouseSeal,
  houseForDungeon,
  houseUnlocked,
  houseWithArticle,
  nearTome,
  ENTER_RANGE,
  QUIZ,
  REWARDS,
  relicEffects
} from './houses.js';
import {
  DUNGEONS,
  LOOT,
  PORTAL_RANGE,
  RARITIES,
  addItem,
  attackRun,
  chestNear,
  coinsLabel,
  crackNear,
  createRun,
  createVault,
  drawMonster,
  drawPortal,
  drawRun,
  dungeonTotals,
  dungeonTimeoutMs,
  dungeonUnlocked,
  enterSecretRoom,
  equipItem,
  equippedWeapon,
  exitAction,
  leaveSecretRoom,
  missingDungeons,
  monsterNear,
  nearExit as nearRoomExit,
  nextRoom,
  openChest,
  playerStats,
  roomLabel,
  sanitizeVault,
  specialAttack,
  updateRun,
  ownsItem
} from './dungeons.js';

const world = generateWorld();
const houses = buildHouses(world);

const state = {
  mode: 'menu', // menu | connecting | online | solo
  world,
  houses,
  players: new Map(),
  selfId: null,
  name: 'Aventurier',
  color: CONFIG.colors[0],
  conn: null,
  renderer: null,
  lastSent: { x: 0, y: 0 },
  lastSentAt: 0,
  // Maison en cours de visite : { house, room, challenge }
  inside: null,
  savedPos: null,
  rewards: new Set(),
  // Effets chiffrés des récompenses (voir houses.js) : recalculés à chaque
  // déblocage, ils alimentent les statistiques et la portée des fissures.
  relics: { secretRange: 0, dropBonus: 0, xpBonus: 0, pv: 0, regen: 0, speed: 0 },
  // Donjons vaincus (localStorage « pixel-village:dungeons ») : chaque donjon
  // conquis ouvre la maison qu'il garde.
  conquered: new Set(),
  // Butin et équipement (localStorage « pixel-village:loot »).
  vault: createVault(),
  // Expérience et arbre de compétences (localStorage « pixel-village:skills »).
  skills: createSkills(),
  // Donjon en cours : { dungeon, room, monsters, chests, pv… }
  run: null
};

const els = {
  login: document.getElementById('login'),
  form: document.getElementById('login-form'),
  name: document.getElementById('name-input'),
  colors: document.getElementById('color-list'),
  solo: document.getElementById('solo-btn'),
  canvas: document.getElementById('screen'),
  hudName: document.getElementById('hud-name'),
  hudPlayers: document.getElementById('hud-players'),
  hudRewards: document.getElementById('hud-rewards'),
  chatLog: document.getElementById('chat-log'),
  chatForm: document.getElementById('chat-form'),
  chatInput: document.getElementById('chat-input'),
  status: document.getElementById('status'),
  statusText: document.getElementById('status-text'),
  reconnect: document.getElementById('reconnect-btn'),
  prompt: document.getElementById('prompt'),
  promptText: document.getElementById('prompt-text'),
  challenge: document.getElementById('challenge'),
  challengeTitle: document.getElementById('challenge-title'),
  challengeGoal: document.getElementById('challenge-goal'),
  challengeStatus: document.getElementById('challenge-status'),
  challengeAnswers: document.getElementById('challenge-answers'),
  inventoryBtn: document.getElementById('inventory-btn'),
  settingsBtn: document.getElementById('settings-btn'),
  returnMenuBtn: document.getElementById('return-menu-btn'),
  settingsMenuBtn: document.getElementById('settings-menu-btn'),
  hint: document.getElementById('hint'),
  challengeHelp: document.getElementById('challenge-help'),
  hudPv: document.getElementById('hud-pv'),
  hudPvFill: document.getElementById('hud-pv-fill'),
  hudPvText: document.getElementById('hud-pv-text'),
  hudXp: document.getElementById('hud-xp'),
  hudLevel: document.getElementById('hud-level'),
  hudXpFill: document.getElementById('hud-xp-fill'),
  hudXpText: document.getElementById('hud-xp-text'),
  hudGear: document.getElementById('hud-gear'),
  hudCoins: document.getElementById('hud-coins'),
  skillsBtn: document.getElementById('skills-btn'),
  abilities: document.getElementById('abilities'),
  abilityDash: document.getElementById('ability-dash'),
  abilityDashState: document.querySelector('#ability-dash .ability-state'),
  abilitySpecial: document.getElementById('ability-special'),
  abilitySpecialState: document.querySelector('#ability-special .ability-state'),
  resetBtn: document.getElementById('reset-btn'),
  resetNote: document.getElementById('reset-note'),
  portal: document.getElementById('portal'),
  portalList: document.getElementById('portal-list'),
  portalClose: document.getElementById('portal-close')
};

const HOUSE_HELP = 'E : sortir · Échap : quitter la maison';
const DUNGEON_HELP = 'E : attaquer, ouvrir un coffre, sortir · Espace : ruade · F : tourbillon · K : compétences · Échap : quitter';

// Panneaux modaux : le déplacement est coupé tant que l'un d'eux est ouvert.
function refreshInputState() {
  setInputEnabled(!(
    inventory.isOpen() || settingsPanel.isOpen() || isPortalOpen()
    || isShopOpen() || skillsPanel.isOpen()
  ));
}

const settingsPanel = createSettingsPanel({
  onToggle: () => {
    refreshInputState();
    playSound('click');
  },
  onBindingsChanged: () => {
    updateHint();
  }
});

const inventory = createInventory({
  getRewards: () => state.rewards,
  getVault: () => state.vault,
  onChange: () => {
    refreshInputState();
    playSound('click');
  },
  onEquip: (id) => toggleEquip(id)
});

const shopPanel = createShopPanel({
  getVault: () => state.vault,
  onChange: () => {
    refreshInputState();
    playSound('click');
  },
  onSell: (id, amount) => sellLoot(id, amount)
});

const skillsPanel = createSkillPanel({
  getSkills: () => state.skills,
  onUnlock: (id) => unlockSkillFromUi(id),
  onToggle: () => {
    refreshInputState();
    playSound('click');
  }
});

// --- Personnages -----------------------------------------------------------

function makePlayer(id, name, color, x, y) {
  return {
    id,
    name,
    color,
    x,
    y,
    rx: x,
    ry: y,
    dir: 'down',
    moving: false,
    phase: 0,
    chatText: '',
    chatUntil: 0,
    speed: 1
  };
}

// Une pose complète tous les ~0,55 tuile parcourue : l'animation suit la
// vitesse réelle du personnage au lieu d'un rythme fixe.
const WALK_POSE_PER_TILE = 1 / 0.55;

function advanceWalk(player, distance) {
  if (!distance) return;
  player.phase = (player.phase + distance * WALK_POSE_PER_TILE) % 4;
}

function canStand(x, y) {
  const radius = 0.3;
  return !isSolid(state.world, Math.floor(x - radius), Math.floor(y - radius))
    && !isSolid(state.world, Math.floor(x + radius), Math.floor(y - radius))
    && !isSolid(state.world, Math.floor(x - radius), Math.floor(y + radius))
    && !isSolid(state.world, Math.floor(x + radius), Math.floor(y + radius));
}

// Un personnage déjà engagé dans une tuile pleine (recalage réseau, décor
// poussé sous ses pieds) ne doit jamais rester figé : on le laisse sortir de
// la tuile avant de réappliquer la règle de collision. Sans cela, approcher
// d'un mur au pixel près suffisait à bloquer toutes les directions.
function moveWithCollision(player, dx, dy) {
  const wedged = !canStand(player.rx, player.ry);
  if (dx) {
    const nx = player.rx + dx;
    if (wedged || canStand(nx, player.ry)) player.rx = nx;
  }
  if (dy) {
    const ny = player.ry + dy;
    if (wedged || canStand(player.rx, ny)) player.ry = ny;
  }
  player.rx = Math.min(Math.max(player.rx, 1), state.world.w - 1);
  player.ry = Math.min(Math.max(player.ry, 1), state.world.h - 1);
}

// --- Récompenses -----------------------------------------------------------

function applyRewards(player) {
  if (!player) return;
  player.rewards = state.rewards;
  player.speed = 1 + (state.relics.speed ?? 0);
}

function loadRewards() {
  try {
    const list = JSON.parse(localStorage.getItem('pixel-village:rewards') || '[]');
    if (Array.isArray(list)) {
      for (const id of list) {
        if (REWARDS[id]) state.rewards.add(id);
      }
    }
  } catch {
    /* stockage indisponible (mode privé) */
  }
  state.relics = relicEffects(state.rewards);
}

function saveRewards() {
  try {
    localStorage.setItem('pixel-village:rewards', JSON.stringify(Array.from(state.rewards)));
  } catch {
    /* stockage indisponible */
  }
}

function loadConquered() {
  try {
    const list = JSON.parse(localStorage.getItem('pixel-village:dungeons') || '[]');
    if (Array.isArray(list)) {
      for (const id of list) {
        if (DUNGEONS.some((dungeon) => dungeon.id === id)) state.conquered.add(id);
      }
    }
  } catch {
    /* stockage indisponible (mode privé) */
  }
}

function saveConquered() {
  try {
    localStorage.setItem('pixel-village:dungeons', JSON.stringify(Array.from(state.conquered)));
  } catch {
    /* stockage indisponible */
  }
}

function syncGear() {
  if (state.mode !== 'online' || !state.conn) return;
  // Les bottes et Pas léger se cumulent ; le serveur borne la vitesse à 1,6.
  const boots = 1 + (state.relics.speed ?? 0);
  state.conn.send({
    t: 'gear',
    speed: boots * (1 + skillEffects(state.skills).speed)
  });
}

function grantReward(id) {
  const isNew = !state.rewards.has(id);
  if (isNew) {
    state.rewards.add(id);
    state.relics = relicEffects(state.rewards);
    saveRewards();
    applyRewards(state.players.get(state.selfId));
    syncGear();
    updateRewardsHud();
    inventory.render();
  }
  return isNew;
}

function updateRewardsHud() {
  if (!els.hudRewards) return;
  els.hudRewards.replaceChildren();
  for (const id of state.rewards) {
    const chip = document.createElement('span');
    chip.className = 'chip reward';
    const item = REWARDS[id];
    chip.title = item
      ? `${item.detail} En donjon : ${item.dungeonEffect}`
      : '';
    chip.textContent = REWARDS[id]?.name ?? id;
    els.hudRewards.append(chip);
  }
  els.hudRewards.classList.toggle('hidden', state.rewards.size === 0);
}

// --- Butin et équipement ---------------------------------------------------

function loadVault() {
  try {
    state.vault = sanitizeVault(JSON.parse(localStorage.getItem('pixel-village:loot') || 'null'));
  } catch {
    state.vault = createVault();
  }
}

function saveVault() {
  try {
    localStorage.setItem('pixel-village:loot', JSON.stringify(state.vault));
  } catch {
    /* stockage indisponible */
  }
}

// --- Expérience et compétences --------------------------------------------

function loadSkills() {
  try {
    state.skills = sanitizeSkills(JSON.parse(localStorage.getItem('pixel-village:skills') || 'null'));
  } catch {
    state.skills = createSkills();
  }
}

function saveSkills() {
  try {
    localStorage.setItem('pixel-village:skills', JSON.stringify(serializeSkills(state.skills)));
  } catch {
    /* stockage indisponible */
  }
}

// HUD : niveau, barre d'expérience et rappel des points en attente.
function updateSkillsHud() {
  if (!els.hudXp) return;
  const info = progress(state.skills);
  const points = state.skills.points;
  els.hudXp.classList.remove('hidden');
  els.hudLevel.textContent = points > 0
    ? `Niv. ${info.level} · ${points} pt${points > 1 ? 's' : ''}`
    : `Niv. ${info.level}`;
  els.hudLevel.title = `${points} point${points > 1 ? 's' : ''} de compétence à dépenser (K).`;
  els.hudXpText.textContent = info.maxed ? 'niveau maximum' : `${info.xp} / ${info.need} XP`;
  els.hudXpFill.style.width = `${Math.round(info.ratio * 100)}%`;
  els.hudXp.title = info.maxed
    ? 'Niveau maximum atteint.'
    : `Encore ${info.need - info.xp} XP avant le niveau ${info.level + 1}.`;
}

// Compétence achetée depuis le panneau : on sauvegarde, on recalcule les
// statistiques et on ajuste les PV courants sans soigner ni blesser.
function unlockSkillFromUi(id) {
  const result = unlockSkill(state.skills, id);
  if (!result.ok) return result;
  saveSkills();
  syncGear();
  applyGearToRun();
  updateGearHud();
  updatePvHud(true);
  updateSkillsHud();
  playSound('rune');
  pushChat(`Compétence apprise : ${result.node.name}.`, 'system');
  return result;
}

// Expérience gagnée en tuant : la valeur du monstre dépend de sa puissance et
// de la profondeur du donjon, et Érudit l'augmente.
function grantKillXp(killed) {
  const run = state.run;
  const monsters = (Array.isArray(killed) ? killed : [killed]).filter(Boolean);
  if (!run || monsters.length === 0) return 0;

  const stats = playerStats(state.vault, state.skills, state.relics);
  let gained = 0;
  for (const monster of monsters) {
    gained += xpForKill(monster, run.dungeon.level, stats.xpBonus);
  }
  if (gained <= 0) return 0;

  const result = gainXp(state.skills, gained);
  saveSkills();
  updateSkillsHud();
  // Le panneau est fermé pendant un combat : inutile de le redessiner.
  if (skillsPanel.isOpen()) skillsPanel.render();

  if (result.levels > 0) {
    playSound('level');
    const suffix = result.levels > 1 ? ` (+${result.levels} niveaux)` : '';
    pushChat(
      `Niveau ${result.level}${suffix} ! +${result.levels} point${result.levels > 1 ? 's' : ''} de compétence — K pour ouvrir l’arbre.`,
      'system'
    );
  }
  return gained;
}

// Barre des capacités (ruade et tourbillon), visible seulement en donjon.
function paintAbility(element, stateText, data, key, name) {
  if (!element) return;
  element.classList.remove('ready', 'cooling', 'locked', 'active');
  if (!data.unlocked) {
    element.classList.add('locked');
    stateText.textContent = 'à débloquer (K)';
    return;
  }
  if (data.cooldown > 0) {
    element.classList.add('cooling');
    stateText.textContent = `${data.cooldown.toFixed(1)} s`;
    return;
  }
  element.classList.add('ready');
  if (key === 'dash' && data.max > 1) stateText.textContent = `${data.charges}/${data.max}`;
  else stateText.textContent = key === 'special' ? 'prêt' : 'prête';
  if (name) element.title = name;
}

let abilitySignature = '';

function updateAbilityBar(force = false) {
  if (!els.abilities) return;
  const run = state.run;
  // La boucle appelle cette fonction à chaque image : on ne touche au DOM que
  // quand un compteur change réellement.
  const signature = run
    ? `${run.dashCharges}|${Math.ceil(run.dashCd * 10)}|${Math.ceil(run.specialCd * 10)}|${run.dashTime > 0}`
    : 'none';
  if (!force && signature === abilitySignature) return;
  abilitySignature = signature;

  els.abilities.classList.toggle('hidden', !run);
  if (!run) return;
  const data = abilityState(state.skills, run);
  paintAbility(els.abilityDash, els.abilityDashState, data.dash, 'dash', 'Ruade (Espace)');
  paintAbility(els.abilitySpecial, els.abilitySpecialState, data.special, 'special', 'Tourbillon (F)');
  els.abilityDash.classList.toggle('active', (run.dashTime ?? 0) > 0);
}

// Ruade : direction du déplacement, ou du regard si l'on est à l'arrêt.
const FACING = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
};

function tryDash() {
  const run = state.run;
  const me = state.players.get(state.selfId);
  if (!run || !me) return false;
  if (inventory.isOpen() || settingsPanel.isOpen() || isPortalOpen()
    || isShopOpen() || skillsPanel.isOpen()) return false;

  const vector = moveVector();
  const dir = vector.x || vector.y ? vector : FACING[me.dir] ?? FACING.down;
  if (!startDash(state.skills, run, dir)) return false;

  playSound('dash');
  updateAbilityBar();
  return true;
}

// Tourbillon : frappe tous les monstres autour de soi. Les monstres vaincus
// rapportent leur expérience et leur butin comme un coup normal.
function useSpecial() {
  const run = state.run;
  const me = state.players.get(state.selfId);
  if (!run || !me) return false;

  const result = specialAttack(run, me, playerStats(state.vault, state.skills, state.relics));
  if (!result) return false;

  playSound('swing');
  if (result.hits > 0) playSound('hit');

  if (result.kills.length > 0) {
    playSound('success');
    const count = result.kills.length;
    pushChat(
      `Tourbillon : ${count} monstre${count > 1 ? 's' : ''} vaincu${count > 1 ? 's' : ''} d’un seul geste !`,
      'system'
    );
    for (const drop of result.drops) {
      grantLoot(drop);
      pushChat(
        `Il laisse tomber : ${LOOT[drop].name} (${RARITIES[LOOT[drop].rarity]?.label ?? 'Commun'}).`,
        'system'
      );
    }
    grantKillXp(result.kills);
    updateDungeonPanel(true);
  } else {
    updateDungeonPanel();
  }

  updateAbilityBar();
  return true;
}

function grantLoot(id) {
  if (!LOOT[id]) return false;
  addItem(state.vault, id);
  saveVault();
  updateGearHud();
  inventory.render();
  if (isPortalOpen()) {
    refreshPortalList();
  } else {
    refreshDungeonLootSoon();
  }
}

let _dungeonLootScheduled = false;
function refreshDungeonLootSoon() {
  if (_dungeonLootScheduled || !isPortalOpen()) return;
  _dungeonLootScheduled = true;
  requestAnimationFrame(() => {
    _dungeonLootScheduled = false;
    refreshDungeonLoot();
  });
}

const LOOT_LINE_RE = /^(.+?) — /;
function refreshDungeonLoot() {
  if (!isPortalOpen()) return;
  for (const card of els.portalList.children) {
    const header = card.querySelector('.portal-card-head');
    if (!header) continue;
    const nameEl = header.querySelector('h3');
    if (!nameEl) continue;
    const dungeon = DUNGEONS.find((entry) => entry.name === nameEl.textContent);
    if (!dungeon) continue;
    const lootList = card.querySelector('.portal-loot');
    if (!lootList) continue;
    const vault = state.vault;
    for (const li of lootList.children) {
      const text = (li.textContent || '').trim();
      const name = (LOOT_LINE_RE.exec(text)?.[1] || text).trim();
      if (!name) continue;
      const id = dungeon.loot.find((lootId) => LOOT[lootId]?.name === name);
      if (!id) continue;
      const owned = ownsItem(vault, id);
      li.style.textDecoration = owned ? 'line-through' : '';
      li.style.opacity = owned ? '0.6' : '';
    }
  }
}

function isDungeonConquered(id) {
  return state.conquered.has(id);
}

function toggleEquip(id) {
  const result = equipItem(state.vault, id);
  if (!result) return;
  saveVault();
  applyGearToRun();
  updateGearHud();
  updatePvHud(true);
  playSound(result === 'equipped' ? 'pickup' : 'click');
  inventory.render();
  const item = LOOT[id];
  if (item) {
    pushChat(
      result === 'equipped'
        ? `Tu portes : ${item.name} (${itemBonusLabel(item)}).`
        : `Tu retires ${item.name}.`,
      'system'
    );
  }
}

// L'armure change les points de vie maximum : on garde le même écart en
// cours de donjon au lieu de soigner ou de blesser brutalement.
function applyGearToRun() {
  const run = state.run;
  if (!run) return;
  const stats = playerStats(state.vault, state.skills, state.relics);
  const delta = stats.pvMax - run.pvMax;
  run.pvMax = stats.pvMax;
  run.pv = Math.max(1, Math.min(run.pvMax, run.pv + delta));
}

function updateGearHud() {
  if (!els.hudGear) return;
  const stats = playerStats(state.vault, state.skills, state.relics);
  els.hudGear.classList.remove('hidden');
  els.hudGear.textContent = `ATQ ${stats.attack} · DÉF ${stats.defense}`;
  els.hudGear.title = equipmentSummary(state.vault) || 'Aucun équipement — ouvre les coffres des donjons.';
}

// --- Bourse et échoppe -----------------------------------------------------

function updateCoinsHud() {
  if (!els.hudCoins) return;
  const coins = Math.max(0, Math.floor(state.vault.coins ?? 0));
  els.hudCoins.textContent = coinsLabel(coins);
  els.hudCoins.classList.remove('hidden');
}

function isShopOpen() {
  return shopPanel.isOpen();
}

function nearShopCounter(me) {
  return nearShop(world.shop, me);
}

function openShop() {
  if (isShopOpen() || state.run || state.inside) return;
  shopPanel.open();
  pushChat('Le colporteur : « Montre-moi ce que tu as en trop. »', 'system');
}

// Vente : le panneau passe par ici pour que la sauvegarde, le HUD et
// l'inventaire restent synchronisés.
function sellLoot(id, amount) {
  const before = state.vault.coins ?? 0;
  const result = amount >= 99 ? sellAll(state.vault, id) : sellItem(state.vault, id, amount);
  if (!result) return null;

  saveVault();
  applyGearToRun();
  updateGearHud();
  updatePvHud(true);
  updateCoinsHud();
  inventory.render();
  playSound('pickup');

  const item = LOOT[result.id];
  const gained = (state.vault.coins ?? 0) - before;
  pushChat(
    `Vendu : ${item.name} ×${result.count} → +${gained} pièce${gained > 1 ? 's' : ''} (bourse : ${coinsLabel(state.vault.coins)}).`,
    'system'
  );
  return result;
}

let pvText = '';
let pvRatio = -1;

function updatePvHud(force = false) {
  const run = state.run;
  if (!run) {
    els.hudPv.classList.add('hidden');
    pvText = '';
    pvRatio = -1;
    return;
  }
  const ratio = run.pvMax > 0 ? Math.max(0, Math.min(1, run.pv / run.pvMax)) : 0;
  const text = `${Math.ceil(run.pv)} / ${run.pvMax}`;
  if (!force && text === pvText && ratio === pvRatio) return;
  pvText = text;
  pvRatio = ratio;
  els.hudPv.classList.remove('hidden');
  els.hudPv.classList.toggle('low', ratio <= 0.3);
  els.hudPvText.textContent = text;
  els.hudPvFill.style.width = `${Math.round(ratio * 100)}%`;
}

// --- Interface -------------------------------------------------------------

function setStatus(text, canRetry = false) {
  if (!text) {
    els.status.classList.add('hidden');
    return;
  }
  els.status.classList.remove('hidden');
  els.statusText.textContent = text;
  els.reconnect.classList.toggle('hidden', !canRetry);
}

function pushChat(text, kind = 'chat', color = null) {
  const line = document.createElement('div');
  line.className = `line ${kind}`;
  if (color) {
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.style.background = color;
    line.append(dot);
  }
  line.append(document.createTextNode(text));
  els.chatLog.append(line);
  while (els.chatLog.children.length > 80) {
    els.chatLog.firstElementChild.remove();
  }
  els.chatLog.scrollTop = els.chatLog.scrollHeight;
}

function updateHud() {
  els.hudName.textContent = state.name;
  if (state.mode === 'online') {
    els.hudPlayers.textContent = `${state.players.size} en ligne`;
  } else if (state.mode === 'solo') {
    els.hudPlayers.textContent = 'solo';
  } else {
    els.hudPlayers.textContent = '…';
  }
}

function updateSwatches() {
  for (const button of els.colors.children) {
    button.classList.toggle('selected', button.dataset.color === state.color);
  }
}

function buildColorList() {
  for (const color of CONFIG.colors) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'swatch';
    button.dataset.color = color;
    button.style.background = color;
    button.setAttribute('aria-label', `Couleur ${color}`);
    button.addEventListener('click', () => {
      state.color = color;
      updateSwatches();
    });
    els.colors.append(button);
  }
  updateSwatches();
}

function loadSettings() {
  try {
    const name = localStorage.getItem('pixel-village:name');
    const color = localStorage.getItem('pixel-village:color');
    if (name) {
      state.name = name;
      els.name.value = name;
    }
    if (color && CONFIG.colors.includes(color)) state.color = color;
  } catch {
    /* stockage indisponible (mode privé) */
  }
}

function saveSettings() {
  try {
    localStorage.setItem('pixel-village:name', state.name);
    localStorage.setItem('pixel-village:color', state.color);
  } catch {
    /* stockage indisponible */
  }
}

// --- Maisons ---------------------------------------------------------------

function houseNear(player) {
  for (const house of houses) {
    const dx = player.rx - (house.door.x + 0.5);
    const dy = player.ry - (house.door.y + 0.5);
    if (Math.hypot(dx, dy) <= ENTER_RANGE) return house;
  }
  return null;
}

function entranceDungeon(house) {
  return DUNGEONS.find((dungeon) => dungeon.id === house.requiredDungeon) ?? null;
}

// Message affiché devant une porte scellée, et à l'appui sur E.
function sealText(house) {
  const dungeon = entranceDungeon(house);
  return dungeon
    ? `Porte scellée — donjon « ${dungeon.name} »`
    : 'Porte scellée';
}

function enterHouse(house) {
  const me = state.players.get(state.selfId);
  if (!me || state.inside) return;

  // Une maison ne s'ouvre qu'après la victoire sur son donjon gardien.
  if (!houseUnlocked(house, state.conquered)) {
    const dungeon = entranceDungeon(house);
    playSound('fail');
    pushChat(
      dungeon
        ? `La porte de ${houseWithArticle(house)} est scellée : il faut d’abord vaincre le donjon « ${dungeon.name} » (portail, au nord du village).`
        : `La porte de ${houseWithArticle(house)} est scellée.`,
      'system'
    );
    return;
  }

  const room = buildInterior(house);
  state.savedPos = { x: me.rx, y: me.ry };
  state.inside = { house, room, challenge: createChallenge(house.challenge) };

  me.rx = room.spawn.x;
  me.ry = room.spawn.y;
  me.x = me.rx;
  me.y = me.ry;
  me.dir = 'up';
  me.moving = false;

  // Les collisions doivent utiliser la carte de l'intérieur, pas celle du
  // village.
  state.world = room;
  state.renderer.setWorld(room);
  state.renderer.centerOn(me.rx, me.ry);

  if (state.mode === 'online' && state.conn) {
    state.conn.send({ t: 'interior', inside: true });
  }

  els.challengeGoal.textContent = house.goal;
  els.challengeHelp.textContent = HOUSE_HELP;
  els.challenge.classList.remove('hidden');
  answersKey = '';
  updateChallengePanel();
  updatePrompt(true);
  playSound('enter');
  pushChat(`Tu entres — ${house.name}. ${house.goal}`, 'system');
}

function exitHouse() {
  const inside = state.inside;
  if (!inside) return;

  const me = state.players.get(state.selfId);
  const back = state.savedPos ?? inside.house.stand;
  state.inside = null;
  state.savedPos = null;

  answersKey = '';
  els.challenge.classList.add('hidden');
  els.challengeHelp.textContent = HOUSE_HELP;
  els.challengeAnswers.replaceChildren();

  state.world = world;
  state.renderer.setWorld(world);
  if (me) {
    me.rx = back.x;
    me.ry = back.y;
    me.x = back.x;
    me.y = back.y;
    me.moving = false;
    state.renderer.centerOn(me.rx, me.ry);
  }

  if (state.mode === 'online' && state.conn) {
    state.conn.send({ t: 'interior', inside: false });
    syncGear();
  }
  playSound('click');
  updatePrompt(true);
}

// --- Réinitialisation du personnage ---------------------------------------

// Ce qu'un personnage possède : récompenses, butin (pièces comprises) et
// donjons conquis. Les réglages (son, touches) restent en place.
const RESET_KEYS = [
  'pixel-village:rewards',
  'pixel-village:loot',
  'pixel-village:dungeons',
  'pixel-village:skills',
  'pixel-village:name',
  'pixel-village:color'
];

function resetCharacter() {
  if (state.mode !== 'menu') return false;

  try {
    for (const key of RESET_KEYS) localStorage.removeItem(key);
  } catch {
    /* stockage indisponible : l'état en mémoire est réinitialisé quand même */
  }

  state.rewards.clear();
  state.relics = relicEffects(state.rewards);
  state.conquered.clear();
  state.vault = createVault();
  state.skills = createSkills();
  state.name = 'Aventurier';
  state.color = CONFIG.colors[0];

  els.name.value = state.name;
  updateSwatches();
  saveSettings();
  updateHud();
  updateRewardsHud();
  updateGearHud();
  updateCoinsHud();
  updateSkillsHud();
  inventory.render();
  shopPanel.render();
  skillsPanel.render();
  playSound('success');
  els.resetNote.textContent = 'Personnage réinitialisé : récompenses, butin, pièces, expérience et compétences effacés.';
  return true;
}

// --- Portail et donjons ----------------------------------------------------

function isPortalOpen() {
  return !els.portal.classList.contains('hidden');
}

function nearPortal(me) {
  const portal = world.portal;
  return Math.hypot(me.rx - portal.x, me.ry - portal.y) <= PORTAL_RANGE;
}

function dungeonCard(dungeon) {
  const unlocked = dungeonUnlocked(dungeon, state.conquered);
  const card = document.createElement('article');
  card.className = unlocked ? 'portal-card' : 'portal-card locked';

  const head = document.createElement('div');
  head.className = 'portal-card-head';
  const name = document.createElement('h3');
  name.textContent = dungeon.name;
  const level = document.createElement('span');
  level.className = `portal-level danger-${dungeon.level}`;
  level.textContent = `Niveau ${dungeon.level}`;
  head.append(name, level);

  const totals = dungeonTotals(dungeon);
  const info = document.createElement('p');
  info.className = 'portal-danger';
  info.textContent = `${dungeon.danger} · ${totals.rooms} salle${totals.rooms > 1 ? 's' : ''}${
    totals.secrets ? ` (+ ${totals.secrets} secrète${totals.secrets > 1 ? 's' : ''})` : ''
  } · ${totals.monsters} monstre${totals.monsters > 1 ? 's' : ''} · ${totals.chests} coffre${
    totals.chests > 1 ? 's' : ''
  }`;

  const intro = document.createElement('p');
  intro.className = 'portal-intro';
  intro.textContent = dungeon.intro;

  // Expédition avancée : on dit précisément ce qui manque pour l'ouvrir.
  let lock = null;
  if (!unlocked) {
    const missing = missingDungeons(dungeon, state.conquered);
    lock = document.createElement('p');
    lock.className = 'portal-locked';
    lock.textContent = missing.length
      ? `Verrouillé — vaincs d’abord : ${missing.map((entry) => entry.name).join(', ')}.`
      : 'Verrouillé.';
  }

  // Ce que la victoire ouvre au village : la maison gardée par ce donjon.
  // Les expéditions avancées ne gardent aucune maison : on affiche juste
  // leur état (vaincue ou non), sans promesse de récompense au village.
  const house = houseForDungeon(dungeon.id, houses);
  let seal = null;
  if (house) {
    const conquered = state.conquered.has(dungeon.id);
    seal = document.createElement('p');
    seal.className = conquered ? 'portal-seal open' : 'portal-seal';
    seal.textContent = conquered
      ? `Conquis — ${houseWithArticle(house)} est ouverte`
      : `Garde la porte de ${houseWithArticle(house)}`;
  } else if (unlocked) {
    const conquered = state.conquered.has(dungeon.id);
    seal = document.createElement('p');
    seal.className = conquered ? 'portal-seal open' : 'portal-seal';
    seal.textContent = conquered ? 'Expédition terminée' : 'Expédition — jamais vaincue';
  }

  const loot = document.createElement('ul');
  loot.className = 'portal-loot';
  const vault = state.vault;
  for (const id of dungeon.loot) {
    const item = LOOT[id];
    if (!item) continue;
    const li = document.createElement('li');
    li.className = `rarity-${item.rarity}`;
    const rarity = RARITIES[item.rarity]?.label ?? 'Commun';
    li.textContent = `${item.name} — ${rarity} · ${itemBonusLabel(item)}`;
    if (ownsItem(vault, id)) {
      li.style.textDecoration = 'line-through';
      li.style.opacity = '0.6';
    }
    loot.append(li);
  }

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn';
  button.disabled = !unlocked;
  button.textContent = unlocked ? `Entrer — niveau ${dungeon.level}` : 'Verrouillé';
  if (unlocked) button.addEventListener('click', () => enterDungeon(dungeon.id));

  card.append(head, info, intro);
  if (lock) card.append(lock);
  if (seal) card.append(seal);
  card.append(loot, button);
  return card;
}

function refreshPortalList() {
  if (!isPortalOpen()) return;
  els.portalList.replaceChildren();
  for (const dungeon of DUNGEONS) els.portalList.append(dungeonCard(dungeon));
}


function openPortal() {
  if (isPortalOpen() || state.run || state.inside) return;
  els.portal.classList.remove('hidden');
  refreshPortalList();
  refreshInputState();
  els.portalClose.focus();
  playSound('click');
}

function closePortal() {
  if (!isPortalOpen()) return;
  els.portal.classList.add('hidden');
  els.portalList.replaceChildren();
  els.portalClose.blur();
  refreshInputState();
}

let dungeonStatus = '';

function updateDungeonPanel(force = false) {
  const run = state.run;
  if (!run) return;
  const opened = run.chests.filter((chest) => chest.opened).length;
  const alive = run.monsters.filter((monster) => monster.alive).length;
  const where = roomLabel(run);
  const timeStr = run.phase === 'won'
    ? ''
    : '';
  const status = run.phase === 'won'
    ? `Donjon nettoyé (${where}) ! Sors par l'escalier (E) ou avec Échap.`
    : `${where} · ${opened}/${run.chests.length} coffre${run.chests.length > 1 ? 's' : ''} ouvert${
      opened > 1 ? 's' : ''
    } · ${alive} monstre${alive > 1 ? 's' : ''} · PV ${Math.ceil(run.pv)}/${run.pvMax}${timeStr}`;
  if (!force && status === dungeonStatus) return;
  dungeonStatus = status;
  els.challengeStatus.textContent = status;
}

// Affiche la salle courante : titre, objectif et panneau de droite.
function refreshRunPanel(run = state.run) {
  if (!run) return;
  const spec = run.roomEntry.spec;
  els.challengeTitle.textContent = run.inSecret
    ? `Salle secrète — ${run.dungeon.name}`
    : `${run.dungeon.name} — niveau ${run.dungeon.level}`;
  const limit = dungeonTimeLimit(run.dungeon);
  const remain = Math.ceil(limit);
  els.challengeGoal.textContent = `${spec.name} (${roomLabel(run)}) — ${spec.intro}\n⏱ ${remain}s pour compléter le donjon`;
  dungeonStatus = '';
  updateDungeonPanel(true);
}

// Place le joueur dans la salle active et recadre la caméra.
function placeRunPlayer(pos) {
  const run = state.run;
  const me = state.players.get(state.selfId);
  if (!run || !me || !pos) return;
  me.rx = pos.x;
  me.ry = pos.y;
  me.x = pos.x;
  me.y = pos.y;
  me.dir = 'up';
  me.moving = false;
  state.world = run.room;
  state.renderer.setWorld(run.room);
  state.renderer.centerOn(me.rx, me.ry);
  updatePrompt(true);
}

function enterDungeon(id) {
  if (state.run || state.inside) return;
  const dungeon = DUNGEONS.find((entry) => entry.id === id);
  const me = state.players.get(state.selfId);
  if (!dungeon || !me) return;
  if (!dungeonUnlocked(dungeon, state.conquered)) return;

  closePortal();
  refreshPortalList();

  const run = createRun(id, Math.floor(Math.random() * 0x7fffffff), state.relics);
  prepareAbilities(state.skills, run);
  const stats = playerStats(state.vault, state.skills, state.relics);
  run.pvMax = stats.pvMax;
  run.pv = stats.pvMax;
  run.sinceHit = 0;

  state.savedPos = { x: me.rx, y: me.ry };
  state.run = run;

  me.rx = run.room.spawn.x;
  me.ry = run.room.spawn.y;
  me.x = me.rx;
  me.y = me.ry;
  me.dir = 'up';
  me.moving = false;

  state.world = run.room;
  state.renderer.setWorld(run.room);
  state.renderer.centerOn(me.rx, me.ry);

  if (state.mode === 'online' && state.conn) {
    state.conn.send({ t: 'interior', inside: true });
  }

  els.challengeHelp.textContent = DUNGEON_HELP;
  els.challenge.classList.remove('hidden');
  answersKey = '';
  refreshRunPanel(run);
  updatePvHud(true);
  updateGearHud();
  updatePrompt(true);
  playSound('enter');
  pushChat(`Tu entres dans ${dungeon.name} (niveau ${dungeon.level}) — ${run.roomEntry.spec.name}.`, 'system');
}

function exitDungeon(reason = 'sortie') {
  const run = state.run;
  if (!run) return;

  const me = state.players.get(state.selfId);
  const back = state.savedPos ?? { x: world.portal.x, y: world.portal.y + 1.5 };
  state.run = null;
  state.savedPos = null;

  els.challenge.classList.add('hidden');
  els.challengeHelp.textContent = HOUSE_HELP;
  els.challengeAnswers.replaceChildren();
  dungeonStatus = '';

  state.world = world;
  state.renderer.setWorld(world);
  if (me) {
    me.rx = back.x;
    me.ry = back.y;
    me.x = back.x;
    me.y = back.y;
    me.moving = false;
    state.renderer.centerOn(me.rx, me.ry);
  }

  if (state.mode === 'online' && state.conn) {
    state.conn.send({ t: 'interior', inside: false });
    syncGear();
  }

  updateGearHud();
  updatePvHud(true);
  updatePrompt(true);

  if (reason === 'defeat') {

    playSound('fail');
    pushChat('Tu es tombé… le portail te ramène au village. Ton butin et ton équipement sont conservés.', 'system');
  } else if (reason === 'timeout') {

    playSound('fail');
    pushChat(`Le chronomètre est écoulé : tu es expulsé du ${run.dungeon.name}.`, 'system');
  } else {
    playSound('click');
  }
}

function handleRunInteract() {
  const run = state.run;
  const me = state.players.get(state.selfId);
  if (!run || !me) return;

  if (nearRoomExit(run.room, me)) {
    const action = exitAction(run);
    if (action === 'out') {
      exitDungeon('sortie');
      return;
    }
    if (action === 'secret') {
      leaveSecretRoom(run);
      placeRunPlayer(run.secretReturn ?? run.room.crack);
      playSound('click');
      pushChat(`Tu remontes dans ${run.roomEntry.spec.name}.`, 'system');
    } else {
      nextRoom(run);
      placeRunPlayer(run.room.spawn);
      playSound('enter');
      pushChat(`Tu descends : ${run.roomEntry.spec.name}. ${run.roomEntry.spec.intro}`, 'system');
    }
    refreshRunPanel();
    updatePvHud(true);
    return;
  }

  // Un monstre à portée de coup passe avant la fissure : on ne bascule plus
  // dans la salle secrète en essayant de frapper un ennemi collé au mur.
  if (!monsterNear(run, me) && crackNear(run, me)) {
    const secret = enterSecretRoom(run);
    if (!secret) return;
    placeRunPlayer(run.room.spawn);
    refreshRunPanel();
    updatePvHud(true);
    playSound('rune');
    pushChat(`La fissure cède : tu entres dans ${secret.spec.name} !`, 'system');
    return;
  }

  if (chestNear(run, me)) {
    const id = openChest(run, me);
    if (id) {
      grantLoot(id);
      const item = LOOT[id];
      playSound('pickup');
      pushChat(
        `Coffre ouvert : ${item.name} (${RARITIES[item.rarity]?.label ?? 'Commun'} · ${
          itemBonusLabel(item)
        }). Touche I pour l’équiper.`,
        'system'
      );
      updateDungeonPanel(true);
      return;
    }
  }

  const result = attackRun(run, me, playerStats(state.vault, state.skills, state.relics));
  if (!result) return;

  // Le sifflement du coup part toujours ; l'impact a son propre son.
  playSound('swing');

  if (result.killed) {
    playSound('success');
    pushChat(`${result.killed.name} vaincu !`, 'system');
    if (result.drop) {
      grantLoot(result.drop);
      pushChat(
        `Il laisse tomber : ${LOOT[result.drop].name} (${
          RARITIES[LOOT[result.drop].rarity]?.label ?? 'Commun'
        }).`,
        'system'
      );
    }
    grantKillXp(result.killed);
    updateDungeonPanel(true);
  } else if (result.hit) {
    playSound('hit');
  }
  updateDungeonPanel();
}

// Donjon conquis : mémorisé dans le navigateur, il ouvre la maison qu'il garde
// (une maison par donjon). La victoire n'est annoncée qu'une seule fois.
function conquerDungeon(run) {
  const before = new Set(state.conquered);
  const isNew = !state.conquered.has(run.dungeon.id);
  if (isNew) {
    state.conquered.add(run.dungeon.id);
    saveConquered();
  }

  const house = houseForDungeon(run.dungeon.id, houses);
  if (house) {
    playSound('success');
    pushChat(
      isNew
        ? `Donjon conquis ! Le sceau de ${houseWithArticle(house)} se brise : la porte est ouverte.`
        : `${houseWithArticle(house)} est déjà ouverte : ce donjon avait été vaincu.`,
      'system'
    );
  }

  // Les expéditions avancées s'enchaînent : chaque victoire peut en ouvrir une.
  for (const dungeon of DUNGEONS) {
    if (before.has(dungeon.id)) continue;
    if (!dungeonUnlocked(dungeon, state.conquered)) continue;
    if (dungeonUnlocked(dungeon, before)) continue;
    playSound('success');
    pushChat(
      `Nouveau donjon au portail : ${dungeon.name} (niveau ${dungeon.level}, ${dungeon.danger}).`,
      'system'
    );
    // Ouvrir le portail pour que le joueur voie le nouveau donjon.
    openPortal();
  }
}

function tickDungeon(dt) {
  const run = state.run;
  if (!run) return;
  // Le chronomètre s'arrête quand un panneau est ouvert (donjon en pause).
  if (inventory.isOpen() || settingsPanel.isOpen() || isPortalOpen()
    || isShopOpen() || skillsPanel.isOpen()) {
    run.timeLeft = Math.max(0, run.timeLeft || 0);
    return;
  }

  const me = state.players.get(state.selfId);
  if (!me) return;

  const events = updateRun(run, me, dt, playerStats(state.vault, state.skills, state.relics));
  if (events.damage > 0) playSound('hurt');
  if (events.revived) {
    playSound('level');
    pushChat('Second souffle ! Tu te relèves, une fois par expédition.', 'system');
    updatePvHud(true);
  }
  if (events.timedOut) {
    playSound('hurt');
    pushChat('Le temps est écoulé ! Tu es expulsé du donjon.', 'system');
    exitDungeon('defeat');
    return;
  }
  if (events.dead) {
    exitDungeon('defeat');
    return;
  }
  if (events.cleared) {
    playSound('success');
    pushChat(run.message, 'system');
  }
  if (events.finished) {
    pushChat('Tous les coffres du donjon sont ouverts ! Tu peux sortir par l’escalier.', 'system');
    conquerDungeon(run);
  }
  // Ruade : traiter les monstres tués en passant.
  if (run.dashKills && run.dashKills.length > 0) {
    const killed = run.dashKills;
    run.dashKills = [];
    for (const entry of killed) {
      const { monster, drop } = entry;
      const name = monster.name || 'monstre';
      playSound('kill');
      playSound('kill');
      pushChat(`La ruade a tué un ${name} en passant !`, 'combat');
      if (drop) grantLoot(drop);
      grantKillXp(monster, run.dungeon.level);
      updateDungeonPanel(true);
      if (isPortalOpen()) refreshPortalList();
    }
  }
  updateDungeonPanel();
  updatePvHud();
  updateAbilityBar();
}

function interact() {
  if (state.mode !== 'online' && state.mode !== 'solo') return;
  const me = state.players.get(state.selfId);
  if (!me) return;

  if (state.run) {
    handleRunInteract();
    return;
  }

  if (state.inside) {
    if (nearRoomExit(state.inside.room, me)) {
      exitHouse();
      return;
    }
    const challenge = state.inside.challenge;
    if (challenge.type === 'devinettes' && challenge.phase === 'idle' && nearTome(me)) {
      if (openQuiz(challenge)) {
        answersKey = '';
        updateChallengePanel();
      }
    }
    return;
  }

  if (nearPortal(me)) {
    openPortal();
    return;
  }

  if (nearShopCounter(me)) {
    openShop();
    return;
  }

  const house = houseNear(me);
  if (house) enterHouse(house);
}

function chooseAnswer(index) {
  const inside = state.inside;
  if (!inside) return;
  const result = answerQuiz(inside.challenge, index);
  if (!result) return;
  if (result === 'won') onChallengeWon();
  else if (result === 'wrong') playSound('fail');
  else if (result === 'next') playSound('pickup');
  updateChallengePanel();
}

function onChallengeWon() {
  const inside = state.inside;
  if (!inside) return;
  playSound('success');
  const reward = REWARDS[inside.house.reward];
  const isNew = grantReward(inside.house.reward);
  if (isNew) {
    pushChat(`Épreuve réussie ! Récompense : ${reward.name} — ${reward.detail}.`, 'system');
  } else {
    pushChat(`Épreuve réussie à nouveau ! Tu possèdes déjà ${reward.name}.`, 'system');
  }
}

let answersKey = '';
let challengeStatus = '';

function renderAnswers(challenge) {
  const key = challenge.type === 'devinettes' && challenge.phase === 'question' ? `q${challenge.index}` : '';
  if (key === answersKey) return;
  answersKey = key;
  els.challengeAnswers.replaceChildren();
  if (!key) return;

  const question = QUIZ[challenge.index];
  question.options.forEach((label, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'answer';
    button.textContent = `${index + 1}. ${label}`;
    button.addEventListener('click', () => {
      button.blur();
      chooseAnswer(index);
    });
    els.challengeAnswers.append(button);
  });
}

function updateChallengePanel() {
  const inside = state.inside;
  if (!inside) {
    els.challenge.classList.add('hidden');
    return;
  }
  const challenge = inside.challenge;
  els.challengeTitle.textContent = inside.house.name;

  let status = challenge.message ?? '';
  if (challenge.type === 'runes') {
    if (challenge.phase === 'watch') status = 'Observe la séquence des runes…';
    else if (challenge.phase === 'input') status = `À toi : reproduis la séquence (${challenge.step}/${challenge.seq.length}).`;
    else if (challenge.phase === 'won') status = 'Épreuve réussie ! Sors par la porte quand tu veux (E).';
  } else if (challenge.type === 'cristaux') {
    const done = challenge.taken.filter(Boolean).length;
    status = challenge.phase === 'won'
      ? 'Épreuve réussie ! Sors par la porte quand tu veux (E).'
      : `${done}/${challenge.taken.length} cristaux — ${challenge.time.toFixed(1)} s`;
  } else if (challenge.phase === 'question') {
    status = `Énigme ${challenge.index + 1}/${QUIZ.length} : ${QUIZ[challenge.index].question}`;
  } else if (challenge.phase === 'won') {
    status = 'Les trois énigmes sont résolues ! Sors par la porte quand tu veux (E).';
  } else {
    status = challenge.message || 'Le livre du sage t’attend (E).';
  }

  if (status !== challengeStatus) {
    challengeStatus = status;
    els.challengeStatus.textContent = status;
  }
  renderAnswers(challenge);
}

let promptKey = '';

function updatePrompt(force = false) {
  const me = state.players.get(state.selfId);
  let text = '';

  if (me && (state.mode === 'online' || state.mode === 'solo')) {
    if (state.run) {
      const run = state.run;
      if (nearRoomExit(run.room, me)) {
        const action = exitAction(run);
        text = action === 'out'
          ? 'Sortir du donjon'
          : action === 'secret'
            ? 'Remonter dans la salle'
            : `Descendre — ${run.rooms[run.roomIndex + 1].spec.name}`;
      } else if (monsterNear(run, me)) {
        text = 'Attaquer';
      } else if (crackNear(run, me)) {
        text = 'Fissure — entrer dans la salle secrète';
      } else if (chestNear(run, me)) text = 'Ouvrir le coffre';
    } else if (state.inside) {
      if (nearRoomExit(state.inside.room, me)) {
        text = 'Sortir de la maison';
      } else if (state.inside.challenge.type === 'devinettes'
        && state.inside.challenge.phase === 'idle'
        && nearTome(me)) {
        text = 'Lire le livre des énigmes';
      }
    } else if (nearPortal(me)) {
      text = 'Portail — choisir un donjon';
    } else if (nearShopCounter(me)) {
      text = 'Échoppe — vendre du butin';
    } else {
      const house = houseNear(me);
      if (house) {
        text = houseUnlocked(house, state.conquered)
          ? `Entrer — ${house.name}`
          : sealText(house);
      }
    }
  }

  if (!force && text === promptKey) return;
  promptKey = text;
  if (!text) {
    els.prompt.classList.add('hidden');
    return;
  }
  els.promptText.textContent = text;
  els.prompt.classList.remove('hidden');
}

// --- Connexion -------------------------------------------------------------

function returnToMainMenu() {
  if (state.mode === 'menu') return;
  if (state.mode === 'connecting') {
    state.conn?.close();
    state.conn = null;
  }

  if (state.inside) exitHouse();
  if (state.run) exitDungeon('sortie');
  if (state.conn) {
    state.conn.close();
    state.conn = null;
  }
  state.players.clear();
  state.selfId = null;
  state.mode = 'menu';
  state.lastSent = { x: 0, y: 0 };
  state.lastSentAt = 0;
  closePortal();
  inventory.close();
  settingsPanel.close();
  shopPanel.close();
  skillsPanel.close();
  els.chatInput.blur();
  els.challenge.classList.add('hidden');
  els.status.classList.add('hidden');
  els.reconnect.classList.add('hidden');
  els.prompt.classList.add('hidden');
  els.abilities.classList.add('hidden');
  document.body.classList.remove('playing');
  els.login.classList.remove('hidden');
  els.hudPlayers.textContent = '…';
  updateHud();
  setInputEnabled(false);
  els.name.focus();
  playSound('click');
}

function enterWorld(online) {
  const name = (els.name.value || '').trim().slice(0, CONFIG.maxNameLength) || 'Aventurier';
  state.name = name;
  saveSettings();
  setInputEnabled(true);
  els.login.classList.add('hidden');
  document.body.classList.add('playing');
  if (!online) {
    startSolo();
    return;
  }
  connect();
}

function connect() {
  state.mode = 'connecting';
  state.players.clear();
  state.selfId = null;
  state.lastSent = { x: 0, y: 0 };
  state.lastSentAt = 0;
  updateHud();
  setStatus('Connexion au serveur…');

  state.conn = createConnection({
    onMessage: handleMessage,
    onClose: handleConnectionLost
  });
  let token = undefined;
  try {
    token = new URLSearchParams(window.location.search).get('token') || undefined;
  } catch { /* navigateur sans URL exploitable */ }
  state.conn.connect({ name: state.name, color: state.color, token });

  // Nettoyage de l'URL : le token n'est utile qu'au join.
  if (token) {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('token');
      window.history.replaceState({}, '', url);
    } catch { /* ignore */ }
  }
}

function handleConnectionLost(error) {
  console.warn('Connexion WebSocket perdue :', error?.message ?? error);
  state.conn?.close();
  state.conn = null;
  if (state.mode === 'online') {
    startSolo('Connexion perdue — tu joues en solo.');
  } else if (state.mode === 'connecting') {
    let target = '';
    try {
      target = ` (${websocketUrl()})`;
    } catch {
      /* pas d'URL exploitable : le message de l'erreur suffit */
    }
    const detail = error?.message ? ` : ${error.message}` : '';
    startSolo(`Serveur injoignable${target}${detail} — tu joues en solo.`);
  }
}

function startSolo(reason = '') {
  // Une éventuelle expédition en cours est abandonnée proprement : le joueur
  // revient au portail avant que la session solo ne prenne le relais.
  if (state.run) exitDungeon('sortie');
  closePortal();
  const previous = state.players.get(state.selfId);
  state.players.clear();
  state.selfId = 'local';

  if (previous) {
    previous.id = 'local';
    previous.moving = false;
    state.players.set('local', previous);
  } else {
    const spawn = world.spawn;
    state.players.set('local', makePlayer('local', state.name, state.color, spawn.x, spawn.y));
  }
  applyRewards(state.players.get('local'));

  state.mode = 'solo';
  state.conn = null;
  updateHud();
  setStatus(reason, Boolean(reason));
  if (reason) pushChat(reason, 'system');
}

function syncPlayers(list) {
  const seen = new Set();
  for (const data of list) {
    seen.add(data.id);
    let player = state.players.get(data.id);
    if (!player) {
      player = makePlayer(data.id, data.name, data.color, data.x, data.y);
      state.players.set(data.id, player);
    }
    player.name = data.name;
    player.color = data.color;
    player.x = data.x;
    player.y = data.y;
    player.dir = data.dir;
    player.moving = data.moving;
  }
  for (const id of Array.from(state.players.keys())) {
    if (id === state.selfId) continue; // le serveur nous masque quand on est dans une maison
    if (!seen.has(id)) state.players.delete(id);
  }
}

function handleMessage(message) {
  // Ignore les messages tardifs d'une connexion abandonnée (passage en solo).
  if (state.mode !== 'online' && state.mode !== 'connecting') return;

  switch (message.t) {
    case 'welcome': {
      state.mode = 'online';
      state.selfId = String(message.id);

      // Écrase le nom/couleur de connexion avec ceux du perso Supabase (si présents).
      if (message.name) state.name = message.name;
      if (message.color) state.color = message.color;
      updateSwatches();
      saveSettings();

      syncPlayers(message.players);
      if (!state.players.has(state.selfId)) {
        const p = makePlayer(state.selfId, state.name, state.color, message.spawn?.x ?? world.spawn.x, message.spawn?.y ?? world.spawn.y);
        state.players.set(state.selfId, p);
      }

      // Hydratation du perso depuis Supabase (données de base).
      if (message.level != null) {
        // Niveau affiché dans la page de jeu pixel-village-next.
        window.__PV_LEVEL = message.level;
      }
      if (message.coins != null) {
        window.__PV_COINS = message.coins;
      }
      if (message.x != null && message.y != null) {
        const me = state.players.get(state.selfId);
        if (me) {
          me.x = message.x;
          me.y = message.y;
          me.rx = message.x;
          me.ry = message.y;
        }
      }
      if (message.state && typeof message.state === 'object') {
        window.__PV_STATE = message.state;
      }

      applyRewards(state.players.get(state.selfId));
      syncGear();
      if (state.inside) state.conn.send({ t: 'interior', inside: true });
      updateHud();
      setStatus(null);
      pushChat('Bienvenue dans le village ! ZQSD / WASD pour bouger, E pour entrer dans une maison, I pour l’inventaire, Entrée pour discuter.', 'system');
      break;
    }
    case 'state': {
      // Pendant une visite, on ne touche pas à notre propre position.
      syncPlayers(message.players);
      updateHud();
      break;
    }
    case 'chat': {
      const player = state.players.get(String(message.id));
      if (player) {
        player.chatText = message.text;
        player.chatUntil = performance.now() + 6000;
      }
      pushChat(`${message.name} : ${message.text}`, 'chat', message.color);
      break;
    }
    case 'system': {
      pushChat(message.text, 'system');
      break;
    }
    case 'left': {
      state.players.delete(String(message.id));
      updateHud();
      break;
    }
    default:
      break;
  }
}

// --- Boucle de jeu ---------------------------------------------------------

function updateLocal(dt) {
  const me = state.players.get(state.selfId);
  if (!me) return;

  // Pas léger : le bonus de vitesse des compétences s'ajoute aux bottes.
  const skillSpeed = 1 + skillEffects(state.skills).speed;
  // Une ruade en cours prend la main sur la marche normale.
  const dash = state.run && state.run.dashTime > 0 ? state.run.dashDir : null;
  const beforeX = me.rx;
  const beforeY = me.ry;

  if (dash) {
    const speed = CONFIG.speed * DASH_SPEED;
    moveWithCollision(me, dash.x * speed * dt, dash.y * speed * dt);
    me.moving = true;
    if (Math.abs(dash.x) > Math.abs(dash.y)) me.dir = dash.x < 0 ? 'left' : 'right';
    else me.dir = dash.y < 0 ? 'up' : 'down';
  } else {
    const vector = moveVector();
    me.moving = vector.x !== 0 || vector.y !== 0;

    if (me.moving) {
      if (Math.abs(vector.x) > Math.abs(vector.y)) {
        me.dir = vector.x < 0 ? 'left' : 'right';
      } else {
        me.dir = vector.y < 0 ? 'up' : 'down';
      }
      const speed = CONFIG.speed * (me.speed ?? 1) * skillSpeed;
      moveWithCollision(me, vector.x * speed * dt, vector.y * speed * dt);
    }
  }

  if (me.moving) advanceWalk(me, Math.hypot(me.rx - beforeX, me.ry - beforeY));

  if (state.mode === 'solo' || state.inside || state.run) {
    me.x = me.rx;
    me.y = me.ry;
    return;
  }

  if (!state.players.has(state.selfId)) return;

  // Réconciliation douce avec la position autoritaire du serveur.
  const errorX = me.x - me.rx;
  const errorY = me.y - me.ry;
  if (Math.hypot(errorX, errorY) > 2) {
    me.rx = me.x;
    me.ry = me.y;
  } else {
    const k = Math.min(1, dt * (me.moving ? 4 : 10));
    me.rx += errorX * k;
    me.ry += errorY * k;
  }
}

function updateRemotes(dt) {
  for (const player of state.players.values()) {
    if (player.id === state.selfId) continue;
    const k = Math.min(1, dt * 11);
    const beforeX = player.rx;
    const beforeY = player.ry;
    player.rx += (player.x - player.rx) * k;
    player.ry += (player.y - player.ry) * k;
    if (player.moving) advanceWalk(player, Math.hypot(player.rx - beforeX, player.ry - beforeY));
    if (Math.hypot(player.x - player.rx, player.y - player.ry) > 3) {
      player.rx = player.x;
      player.ry = player.y;
    }
  }
}

function tickInside(dt) {
  const inside = state.inside;
  if (!inside) return;
  const me = state.players.get(state.selfId);
  if (!me) return;

  const challenge = inside.challenge;
  const takenBefore = challenge.taken ? challenge.taken.filter(Boolean).length : 0;
  const stepBefore = challenge.step ?? 0;

  const result = updateChallenge(challenge, me, dt);

  if (challenge.taken && challenge.taken.filter(Boolean).length > takenBefore) playSound('pickup');
  if (challenge.type === 'runes' && (challenge.step ?? 0) > stepBefore) playSound('rune');
  if (result === 'won') onChallengeWon();
  else if (result === 'retry' || result === 'wrong') playSound('fail');
  updateChallengePanel();
}

let lastFrame = performance.now();

function loop(now) {
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;

  if (state.mode === 'online' || state.mode === 'solo') {
    // Les délais des capacités avancent même quand le donjon est en pause :
    // une ruade ne doit pas rester bloquée parce qu'on a ouvert l'inventaire.
    if (state.run) tickAbilities(state.skills, state.run, dt);
    updateLocal(dt);
    updateRemotes(dt);
    if (state.inside) tickInside(dt);
    else if (state.run) tickDungeon(dt);
    const me = state.players.get(state.selfId);
    if (me) {
      // Arme en main et geste de frappe : le rendu lit ces trois champs.
      me.equippedWeapon = equippedWeapon(state.vault);
      me.swing = state.run ? state.run.swing : 0;
      me.spin = state.run ? state.run.spinTime ?? 0 : 0;
      me.swingDir = state.run?.swingDir ?? me.dir;
      updateAbilityBar();
      state.renderer.updateCamera(me.rx, me.ry, dt);
    }
    updatePrompt();
  }

  let decor;
  if (state.inside) {
    decor = (ctx, time) => drawChallenge(ctx, state.inside.challenge, state.inside.room, time);
  } else if (state.run) {
    decor = (ctx, time) => drawRun(ctx, state.run, time, state.players.get(state.selfId));
  } else {
    // Au village : le portail et le sceau de chaque maison.
    decor = (ctx, time) => {
      drawPortal(ctx, world.portal, time);
      drawShop(ctx, world.shop, time);
      for (const house of houses) {
        drawHouseSeal(ctx, house, houseUnlocked(house, state.conquered), time);
      }
    };
  }

  const actors = state.run
    ? state.run.monsters
      .filter((monster) => monster.alive)
      .map((monster) => ({
        ry: monster.y,
        draw: (ctx, time) => drawMonster(ctx, monster, time)
      }))
    : null;

  state.renderer.render(renderList(), state.selfId, now, decor, actors);
  requestAnimationFrame(loop);
}

// À l'intérieur d'une maison ou d'un donjon, on ne dessine que soi-même :
// l'instance est privée (les monstres passent par `actors`).
function renderList() {
  if (!state.inside && !state.run) return state.players;
  const me = state.players.get(state.selfId);
  if (!me) return new Map();
  return new Map([[me.id, me]]);
}

// --- Événements ------------------------------------------------------------

els.form.addEventListener('submit', (event) => {
  event.preventDefault();
  enterWorld(true);
});

els.solo.addEventListener('click', () => {
  enterWorld(false);
});

els.chatForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const text = els.chatInput.value.trim();
  els.chatInput.value = '';
  if (!text) return;
  if (state.mode === 'online' && state.conn) {
    state.conn.send({ t: 'chat', text: text.slice(0, CONFIG.maxChatLength) });
  } else {
    pushChat('Le chat nécessite une connexion au serveur.', 'system');
  }
  els.chatInput.blur();
});

els.reconnect.addEventListener('click', () => {
  connect();
});

els.inventoryBtn.addEventListener('click', () => {
  if (state.mode === 'menu' || state.mode === 'connecting') return;
  inventory.toggle();
});

els.skillsBtn.addEventListener('click', () => {
  if (state.mode === 'menu' || state.mode === 'connecting') return;
  skillsPanel.toggle();
});

els.settingsBtn.addEventListener('click', () => settingsPanel.toggle());
els.returnMenuBtn.addEventListener('click', returnToMainMenu);
els.settingsMenuBtn.addEventListener('click', () => settingsPanel.open());

// Réinitialisation en deux temps : le premier clic demande confirmation, le
// second efface le personnage. Passé cinq secondes, le bouton se désarme.
let resetArmed = false;
let resetTimer = 0;

function disarmReset() {
  resetArmed = false;
  els.resetBtn.classList.remove('confirm');
  els.resetBtn.textContent = 'Réinitialiser le personnage';
}

els.resetBtn.addEventListener('click', () => {
  if (!resetArmed) {
    resetArmed = true;
    els.resetBtn.classList.add('confirm');
    els.resetBtn.textContent = 'Confirmer : effacer mon personnage ?';
    els.resetNote.textContent = 'Clique une seconde fois pour confirmer. Rien n’a encore été effacé.';
    clearTimeout(resetTimer);
    resetTimer = setTimeout(disarmReset, 5000);
    return;
  }
  clearTimeout(resetTimer);
  disarmReset();
  resetCharacter();
});
els.portalClose.addEventListener('click', () => closePortal());
els.portal.addEventListener('click', (event) => {
  if (event.target === els.portal) closePortal();
});

// Rappel des touches affiché en bas à droite, toujours à jour après un
// changement dans les paramètres.
function updateHint() {
  const keys = getBindings();
  const move = `${labelFor(keys.up)}${labelFor(keys.left)}${labelFor(keys.down)}${labelFor(keys.right)}`;
  els.hint.textContent = `${move} ou flèches : bouger · ${labelFor(keys.interact)} : agir · K : compétences · ${labelFor(keys.inventory)} : sac · ${labelFor(keys.settings)} : paramètres`;
}

window.addEventListener('keydown', (event) => {
  const keys = getBindings();

  // Paramètres : accessibles aussi depuis l'écran d'accueil, pour régler le
  // volume avant même de jouer.
  if (event.code === keys.settings && !isTyping(event) && !isPortalOpen()) {
    event.preventDefault();
    settingsPanel.toggle();
    return;
  }

  // Arbre de compétences : K, depuis le village comme depuis un donjon.
  if (event.code === 'KeyK' && !isTyping(event)
    && state.mode !== 'menu' && state.mode !== 'connecting') {
    event.preventDefault();
    skillsPanel.toggle();
    return;
  }

  // Un panneau modal capte Échap et sa propre touche, et bloque le reste.
  if (inventory.isOpen() || settingsPanel.isOpen() || isPortalOpen()
    || isShopOpen() || skillsPanel.isOpen()) {
    if (event.code === 'Escape' || event.code === 'Enter') {
      event.preventDefault();
      inventory.close();
      settingsPanel.close();
      closePortal();
      shopPanel.close();
      skillsPanel.close();
    }
    return;
  }

  if (event.code === keys.inventory && !isTyping(event)
    && state.mode !== 'menu' && state.mode !== 'connecting') {
    event.preventDefault();
    inventory.toggle();
    return;
  }

  if (event.code === 'Enter' && !isTyping(event) && state.mode !== 'menu') {
    event.preventDefault();
    els.chatInput.focus();
    return;
  }

  if (event.code === 'Escape') {
    if (document.activeElement === els.chatInput) {
      els.chatInput.blur();
    } else if (state.inside) {
      exitHouse();
    } else if (state.run) {
      exitDungeon('sortie');
    }
    return;
  }

  if (isTyping(event)) return;

  if (event.code === keys.interact && (state.mode === 'online' || state.mode === 'solo')) {
    event.preventDefault();
    interact();
    return;
  }

  // Capacités de l'arbre : la ruade et le tourbillon ne servent qu'en donjon,
  // là où le client est seul maître du déplacement et des monstres.
  if (event.code === 'Space' && state.run) {
    event.preventDefault();
    tryDash();
    return;
  }

  if (event.code === 'KeyF' && state.run) {
    event.preventDefault();
    useSpecial();
    return;
  }

  const challenge = state.inside?.challenge;
  if (challenge && challenge.type === 'devinettes' && challenge.phase === 'question') {
    const digits = { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2 };
    if (event.code in digits) {
      event.preventDefault();
      chooseAnswer(digits[event.code]);
    }
  }
});

// --- Babel runtime helpers --------------------------------------------------

// Envoie la direction au serveur quand elle change, et la rafraîchit
// régulièrement pour ne pas être coupé par le délai d'inactivité du serveur.
setInterval(() => {
  if (state.mode !== 'online' || !state.conn || state.inside) return;
  const vector = moveVector();
  const x = Math.round(vector.x * 50) / 50;
  const y = Math.round(vector.y * 50) / 50;
  const changed = x !== state.lastSent.x || y !== state.lastSent.y;
  const idle = x === 0 && y === 0;
  // Marche verticale : x vaut 0, donc l'ancien test « x === 0 » coupait le
  // renvoi périodique et le serveur arrêtait le joueur au bout de 1,5 s.
  if (!changed && (idle || Date.now() - state.lastSentAt < 500)) return;
  state.lastSent = { x, y };
  state.lastSentAt = Date.now();
  state.conn.send({ t: 'input', dx: x, dy: y });
}, 100);

// --- Démarrage -------------------------------------------------------------

window.__pixelVillageReady = true;
state.renderer = new Renderer(els.canvas, world);
state.renderer.centerOn(world.spawn.x, world.spawn.y);
initInput();
buildColorList();
loadSettings();
loadRewards();
loadConquered();
loadVault();
loadSkills();
updateSwatches();
updateHud();
updateRewardsHud();
updateGearHud();
updateCoinsHud();
updateSkillsHud();
updateAbilityBar();
updateHint();
requestAnimationFrame(loop);
