// Panneau de l'arbre de compétences, ouvert avec la touche K. Il ne calcule
// rien : `skills.js` fournit l'arbre et les règles, ce module se contente de
// les afficher et de remonter les clics.

import {
  BRANCHES,
  SKILL_BY_ID,
  branchSkills,
  canUnlock,
  isUnlocked,
  progress
} from './skills.js';

// Résumé lisible d'une compétence, à partir de ses effets chiffrés.
function effectText(node) {
  const e = node.effect ?? {};
  const parts = [];
  if (node.ability === 'dash') parts.push('Débloque la ruade (Espace)');
  if (node.ability === 'special') parts.push('Débloque le tourbillon (F)');
  if (e.attack) parts.push(`+${e.attack} ATQ`);
  if (e.defense) parts.push(`+${e.defense} DÉF`);
  if (e.pv) parts.push(`+${e.pv} PV maximum`);
  if (e.speed) parts.push(`+${Math.round(e.speed * 100)} % de vitesse`);
  if (e.xpBonus) parts.push(`+${Math.round(e.xpBonus * 100)} % d’expérience`);
  if (e.dropBonus) parts.push(`+${Math.round(e.dropBonus * 100)} % de chance de butin`);
  if (e.range) parts.push(`+${String(e.range).replace('.', ',')} de portée`);
  if (e.regen) parts.push(`+${String(e.regen).replace('.', ',')} PV par seconde, hors combat`);
  if (e.execute) parts.push(`+${Math.round(e.execute * 100)} % contre un monstre affaibli`);
  if (e.attackCd && e.attackCd < 1) {
    parts.push(`−${Math.round((1 - e.attackCd) * 100)} % de délai entre deux coups`);
  }
  if (e.dashInvuln) parts.push('Invulnérable pendant la ruade');
  if (e.dashCooldown) parts.push(`−${Math.abs(e.dashCooldown)} s de recharge de ruade`);
  if (e.dashCharges) parts.push(`+${e.dashCharges} charge de ruade`);
  if (e.revive) parts.push('Se relève une fois par expédition');
  return parts.join(' · ') || 'Aucun effet chiffré.';
}

export function createSkillPanel({ getSkills, onUnlock, onToggle } = {}) {
  const root = document.getElementById('skills');
  const tree = document.getElementById('skills-tree');
  const detail = document.getElementById('skills-detail');
  const points = document.getElementById('skills-points');
  const level = document.getElementById('skills-level');
  const xpFill = document.getElementById('skills-xp-fill');
  const xpText = document.getElementById('skills-xp-text');
  const closeBtn = document.getElementById('skills-close');

  let selectedId = null;

  function isOpen() {
    return !root.classList.contains('hidden');
  }

  function open() {
    if (isOpen()) return;
    selectedId = selectedId && SKILL_BY_ID[selectedId] ? selectedId : null;
    render();
    root.classList.remove('hidden');
    closeBtn.focus();
    onToggle?.();
  }

  function close() {
    if (!isOpen()) return;
    root.classList.add('hidden');
    closeBtn.blur();
    onToggle?.();
  }

  function toggle() {
    if (isOpen()) close();
    else open();
  }

  function select(id) {
    selectedId = id;
    render();
  }

  function renderSummary() {
    const skills = getSkills();
    const info = progress(skills);
    level.textContent = info.maxed ? `Niveau ${info.level} — maximum` : `Niveau ${info.level}`;
    xpText.textContent = info.maxed ? `${info.xp} XP` : `${info.xp} / ${info.need} XP`;
    xpFill.style.width = `${Math.round(info.ratio * 100)}%`;
    const left = skills.points;
    points.textContent = `${left} point${left > 1 ? 's' : ''} disponible${left > 1 ? 's' : ''}`;
  }

  function renderTree() {
    const skills = getSkills();
    tree.replaceChildren();

    for (const branch of BRANCHES) {
      const column = document.createElement('section');
      column.className = 'skills-branch';
      column.style.setProperty('--branch', branch.color);

      const title = document.createElement('h3');
      title.textContent = branch.name;
      column.append(title);

      const blurb = document.createElement('p');
      blurb.className = 'skills-branch-blurb';
      blurb.textContent = branch.blurb;
      column.append(blurb);

      for (const node of branchSkills(branch.id)) {
        const owned = isUnlocked(skills, node.id);
        const check = canUnlock(skills, node.id);
        const state = owned ? 'owned' : check.ok ? 'available' : 'locked';

        const button = document.createElement('button');
        button.type = 'button';
        button.className = `skills-node ${state}`;
        button.dataset.skill = node.id;
        button.setAttribute('aria-pressed', String(selectedId === node.id));

        const name = document.createElement('strong');
        name.textContent = owned ? `${node.name} ✓` : node.name;
        button.append(name);

        const hint = document.createElement('small');
        hint.textContent = owned
          ? 'Apprise'
          : check.ok
            ? '1 point — cliquer pour voir'
            : check.reason;
        button.append(hint);

        button.addEventListener('click', () => select(node.id));
        column.append(button);
      }

      tree.append(column);
    }
  }

  function renderDetail() {
    const skills = getSkills();
    detail.replaceChildren();

    const node = selectedId ? SKILL_BY_ID[selectedId] : null;
    if (!node) {
      const hint = document.createElement('p');
      hint.className = 'inventory-source';
      hint.textContent = 'Clique sur une compétence pour lire son effet et l’apprendre.';
      detail.append(hint);
      return;
    }

    const owned = isUnlocked(skills, node.id);
    const check = canUnlock(skills, node.id);
    const branch = BRANCHES.find((entry) => entry.id === node.branch);

    const title = document.createElement('h3');
    title.textContent = node.name;
    title.style.color = branch?.color ?? 'var(--cream)';

    const where = document.createElement('p');
    where.className = 'inventory-source';
    where.textContent = `${branch?.name ?? node.branch} · palier ${node.tier}`;

    const text = document.createElement('p');
    text.textContent = node.detail;

    const effects = document.createElement('p');
    effects.className = 'inventory-effect';
    effects.textContent = effectText(node);

    detail.append(title, where, text, effects);

    if (owned) {
      const state = document.createElement('p');
      state.className = 'inventory-equipped';
      state.textContent = 'Compétence apprise.';
      detail.append(state);
      return;
    }

    if (check.ok) {
      const action = document.createElement('button');
      action.type = 'button';
      action.className = 'btn small inventory-action';
      action.textContent = 'Apprendre — 1 point';
      action.addEventListener('click', () => {
        action.blur();
        const result = onUnlock?.(node.id);
        if (result?.ok) render();
      });
      detail.append(action);
    } else {
      const why = document.createElement('p');
      why.className = 'inventory-source';
      why.textContent = check.reason;
      detail.append(why);
    }
  }

  function render() {
    renderSummary();
    renderTree();
    renderDetail();
  }

  closeBtn.addEventListener('click', close);
  root.addEventListener('click', (event) => {
    if (event.target === root) close();
  });

  return {
    isOpen,
    open,
    close,
    toggle,
    render,
    select,
    getSelected: () => selectedId
  };
}
