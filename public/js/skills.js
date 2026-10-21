// Expérience et arbre de compétences du personnage.
//
// Ce module ne touche pas au DOM : il décrit la progression (XP, niveaux,
// points), l'arbre (quatre branches, seize compétences) et les capacités qui
// en découlent (ruade, tourbillon, régénération, second souffle). Le rendu et
// les panneaux vivent ailleurs ; `dungeons.js` ne fait que consommer les
// effets calculés ici.
//
// Testable avec `node` seul : voir tests/skills.test.mjs.

// --- Réglages --------------------------------------------------------------

export const MAX_LEVEL = 20;

// Une ruade : une courte accélération, pas un téléport.
export const DASH_TIME = 0.24;
export const DASH_SPEED = 3.4;
export const DASH_COOLDOWN = 3.4;
// Le tourbillon frappe tout ce qui entoure le personnage, un peu plus loin
// qu'un coup normal.
export const SPECIAL_COOLDOWN = 6;
export const SPECIAL_RANGE = 2.3;
export const SPECIAL_MULT = 1.8;

// Régénération : elle ne démarre qu'après quelques secondes sans être touché.
export const REGEN_DELAY = 4;
// Second souffle : on se relève avec cette part des PV maximum.
export const SECOND_WIND_RATIO = 0.35;
// Sous cette part de PV, un monstre est « achevé » par Exécution.
export const EXECUTE_THRESHOLD = 0.35;

// --- Arbre -----------------------------------------------------------------

export const BRANCHES = [
  {
    id: 'lame',
    name: 'Lame',
    color: '#ff9a5c',
    blurb: 'Frapper plus fort, et frapper plusieurs ennemis à la fois.'
  },
  {
    id: 'ombre',
    name: 'Ombre',
    color: '#8ff0f7',
    blurb: 'Se déplacer vite, esquiver les coups et sortir du cercle.'
  },
  {
    id: 'gardien',
    name: 'Gardien',
    color: '#7ee08a',
    blurb: 'Encaisser, se soigner et se relever quand tout semble perdu.'
  },
  {
    id: 'fortune',
    name: 'Fortune',
    color: '#f6d34d',
    blurb: 'Gagner plus d’expérience, plus de butin, et porter plus loin.'
  }
];

// Chaque compétence coûte un point et ne s'achète qu'une fois. Le palier
// donne l'ordre de déblocage ; `requires` impose la compétence précédente de
// la même branche.
export const SKILLS = [
  {
    id: 'frappe',
    branch: 'lame',
    tier: 1,
    name: 'Frappe affûtée',
    detail: 'Chaque coup porte un peu plus loin dans la chair.',
    effect: { attack: 2 }
  },
  {
    id: 'tourbillon',
    branch: 'lame',
    tier: 2,
    name: 'Tourbillon',
    requires: ['frappe'],
    ability: 'special',
    detail: 'Touche F : un coup circulaire qui frappe tous les monstres autour de toi.',
    effect: { special: true }
  },
  {
    id: 'fureur',
    branch: 'lame',
    tier: 3,
    name: 'Fureur',
    requires: ['tourbillon'],
    detail: 'La rage du combat arme chaque coup plus lourd.',
    effect: { attack: 3 }
  },
  {
    id: 'execution',
    branch: 'lame',
    tier: 4,
    name: 'Exécution',
    requires: ['fureur'],
    detail: 'Les monstres déjà affaiblis encaissent des dégâts bien plus lourds.',
    effect: { execute: 0.6 }
  },
  {
    id: 'ruade',
    branch: 'ombre',
    tier: 1,
    name: 'Ruade',
    requires: [],
    ability: 'dash',
    detail: 'Espace : une courte accélération qui traverse la salle.',
    effect: { dash: true }
  },
  {
    id: 'pas_leger',
    branch: 'ombre',
    tier: 2,
    name: 'Pas léger',
    requires: ['ruade'],
    detail: 'On se déplace plus vite, au village comme dans les donjons.',
    effect: { speed: 0.12 }
  },
  {
    id: 'esquive',
    branch: 'ombre',
    tier: 3,
    name: 'Esquive',
    requires: ['pas_leger'],
    detail: 'Pendant la ruade, aucun monstre ne peut te toucher.',
    effect: { dashInvuln: true, dashCooldown: -1 }
  },
  {
    id: 'double_ruade',
    branch: 'ombre',
    tier: 4,
    name: 'Double ruade',
    requires: ['esquive'],
    detail: 'Deux ruades prêtes d’avance : de quoi traverser deux salles d’un trait.',
    effect: { dashCharges: 1 }
  },
  {
    id: 'vigueur',
    branch: 'gardien',
    tier: 1,
    name: 'Vigueur',
    requires: [],
    detail: 'Un corps plus solide, dès l’entrée dans un donjon.',
    effect: { pv: 12 }
  },
  {
    id: 'peau_de_pierre',
    branch: 'gardien',
    tier: 2,
    name: 'Peau de pierre',
    requires: ['vigueur'],
    detail: 'Chaque coup encaissé fait moins mal.',
    effect: { defense: 2 }
  },
  {
    id: 'regeneration',
    branch: 'gardien',
    tier: 3,
    name: 'Régénération',
    requires: ['peau_de_pierre'],
    detail: 'Les blessures se referment lentement quand on n’est plus touché.',
    effect: { regen: 0.7 }
  },
  {
    id: 'second_souffle',
    branch: 'gardien',
    tier: 4,
    name: 'Second souffle',
    requires: ['regeneration'],
    detail: 'Une fois par expédition, un coup fatal te relève au lieu de te tuer.',
    effect: { revive: true }
  },
  {
    id: 'erudit',
    branch: 'fortune',
    tier: 1,
    name: 'Érudit',
    requires: [],
    detail: 'Les monstres vaincus rapportent plus d’expérience.',
    effect: { xpBonus: 0.2 }
  },
  {
    id: 'fouilleur',
    branch: 'fortune',
    tier: 2,
    name: 'Œil du fouilleur',
    requires: ['erudit'],
    detail: 'Les monstres laissent tomber leur butin plus souvent.',
    effect: { dropBonus: 0.15 }
  },
  {
    id: 'vif_argent',
    branch: 'fortune',
    tier: 3,
    name: 'Vif-argent',
    requires: ['fouilleur'],
    detail: 'Le bras repart plus vite : les coups s’enchaînent sans temps mort.',
    effect: { attackCd: 0.88 }
  },
  {
    id: 'oeil',
    branch: 'fortune',
    tier: 4,
    name: 'Œil vif',
    requires: ['vif_argent'],
    detail: 'Une portée d’attaque allongée : on touche avant d’être touché.',
    effect: { range: 0.35 }
  }
];

export const SKILL_BY_ID = Object.fromEntries(SKILLS.map((skill) => [skill.id, skill]));

export function branchSkills(branch) {
  return SKILLS.filter((skill) => skill.branch === branch);
}

// --- Progression -----------------------------------------------------------

// XP nécessaire pour passer du niveau `level` au suivant. La courbe est
// volontairement douce au début : la première expédition fait gagner un ou
// deux niveaux, les suivants demandent de plus en plus de descentes.
export function xpNeeded(level) {
  const n = Math.max(1, Math.floor(level));
  return 30 + 16 * (n - 1) + 4 * (n - 1) ** 2;
}

export function createSkills() {
  return { level: 1, xp: 0, points: 1, unlocked: new Set() };
}

// Expérience rapportée par un monstre vaincu : sa valeur propre, multipliée
// par la profondeur du donjon et par les bonus du personnage (Érudit).
export function xpForKill(monster, dungeonLevel = 1, xpBonus = 0) {
  const base = Number(monster?.xp);
  if (!Number.isFinite(base) || base <= 0) return 0;
  const depth = 1 + 0.2 * Math.max(0, dungeonLevel - 1);
  return Math.max(1, Math.round(base * depth * (1 + xpBonus)));
}

// Ajoute de l'expérience et gère les niveaux en chaîne. Chaque niveau donne un
// point de compétence. Retourne le nombre de niveaux gagnés et l'état à jour.
export function gainXp(skills, amount) {
  const before = skills.level;
  const added = Math.max(0, Math.floor(Number(amount) || 0));
  skills.xp += added;

  while (skills.level < MAX_LEVEL && skills.xp >= xpNeeded(skills.level)) {
    skills.xp -= xpNeeded(skills.level);
    skills.level += 1;
    skills.points += 1;
  }

  // Au niveau maximum, l'expérience restante ne sert plus : on la plafonne
  // pour que le HUD affiche toujours une barre pleine plutôt qu'un débordement.
  if (skills.level >= MAX_LEVEL) skills.xp = Math.min(skills.xp, xpNeeded(MAX_LEVEL));

  return {
    levels: skills.level - before,
    level: skills.level,
    points: skills.points,
    xp: skills.xp,
    need: xpNeeded(skills.level),
    maxed: skills.level >= MAX_LEVEL
  };
}

export function progress(skills) {
  const need = xpNeeded(skills.level);
  const maxed = skills.level >= MAX_LEVEL;
  return {
    level: skills.level,
    xp: Math.min(skills.xp, need),
    need,
    ratio: maxed ? 1 : Math.max(0, Math.min(1, skills.xp / need)),
    maxed
  };
}

// --- Effets ----------------------------------------------------------------

// Additionne les effets de toutes les compétences achetées. Les valeurs sont
// neutres quand rien n'est débloqué, ce qui permet d'appeler la fonction sans
// condition partout.
export function skillEffects(skills) {
  const out = {
    attack: 0,
    defense: 0,
    pv: 0,
    speed: 0,
    xpBonus: 0,
    dropBonus: 0,
    attackCd: 1,
    range: 0,
    regen: 0,
    revive: false,
    dash: false,
    dashInvuln: false,
    dashCharges: 0,
    dashCooldown: 0,
    execute: 0,
    special: false
  };
  if (!skills?.unlocked) return out;

  for (const id of skills.unlocked) {
    const node = SKILL_BY_ID[id];
    if (!node) continue;
    const effect = node.effect ?? {};
    for (const key of ['attack', 'defense', 'pv', 'speed', 'xpBonus', 'dropBonus', 'range', 'regen', 'execute']) {
      if (typeof effect[key] === 'number') out[key] += effect[key];
    }
    if (typeof effect.attackCd === 'number') out.attackCd *= effect.attackCd;
    if (typeof effect.dashCooldown === 'number') out.dashCooldown += effect.dashCooldown;
    if (typeof effect.dashCharges === 'number') out.dashCharges += effect.dashCharges;
    if (effect.revive) out.revive = true;
    if (effect.dash) out.dash = true;
    if (effect.dashInvuln) out.dashInvuln = true;
    if (effect.special) out.special = true;
  }

  return out;
}

// --- Déblocage -------------------------------------------------------------

// Une compétence est disponible si ses prérequis sont achetés et s'il reste
// un point. Retourne une raison lisible, utilisée telle quelle par le panneau.
export function canUnlock(skills, id) {
  const node = SKILL_BY_ID[id];
  if (!node) return { ok: false, reason: 'Compétence inconnue.' };
  if (skills.unlocked.has(id)) return { ok: false, reason: 'Déjà apprise.' };

  // On signale d'abord ce qui manque vraiment (le prérequis), avant de parler
  // des points : c'est plus utile quand plusieurs paliers sont encore fermés.
  const missing = (node.requires ?? []).filter((required) => !skills.unlocked.has(required));
  if (missing.length) {
    return {
      ok: false,
      reason: `Demande d’abord : ${missing.map((required) => SKILL_BY_ID[required]?.name ?? required).join(', ')}.`
    };
  }
  if (skills.points <= 0) return { ok: false, reason: 'Aucun point disponible.' };
  return { ok: true, reason: '' };
}

export function unlockSkill(skills, id) {
  const check = canUnlock(skills, id);
  if (!check.ok) return check;
  skills.unlocked.add(id);
  skills.points -= 1;
  return { ok: true, node: SKILL_BY_ID[id], reason: '' };
}

export function isUnlocked(skills, id) {
  return Boolean(skills?.unlocked?.has(id));
}

// --- Capacités -------------------------------------------------------------

// Prépare les compteurs d'une expédition : charges de ruade et délai du
// tourbillon. Appelé à l'entrée dans un donjon, et par les tests.
export function prepareAbilities(skills, run) {
  if (!run) return;
  const effects = skillEffects(skills);
  run.dashMax = effects.dash ? 1 + effects.dashCharges : 0;
  run.dashCharges = run.dashMax;
  run.dashCd = 0;
  run.dashTime = 0;
  run.dashDir = null;
  run.specialCd = 0;
  run.invuln = 0;
  run.reviveUsed = false;
  if (effects.revive) run.reviveUsed = false;
}

// Fait avancer les délais et recharge les ruades. À appeler à chaque image,
// même hors donjon, pour que les compteurs ne restent pas figés.
export function tickAbilities(skills, run, dt) {
  if (!run) return;
  const effects = skillEffects(skills);
  const cooldown = DASH_COOLDOWN + effects.dashCooldown;

  // `invuln` est décrémenté par `updateRun` (au même endroit que les dégâts
  // qu'il protège) : on ne le touche pas ici pour éviter un double compte.
  if (run.dashTime > 0) run.dashTime = Math.max(0, run.dashTime - dt);
  if (run.specialCd > 0) run.specialCd = Math.max(0, run.specialCd - dt);

  if (run.dashMax > 0 && run.dashCharges < run.dashMax) {
    run.dashCd = Math.max(0, (run.dashCd ?? 0) - dt);
    if (run.dashCd <= 0) {
      run.dashCharges += 1;
      run.dashCd = run.dashCharges < run.dashMax ? cooldown : 0;
    }
  } else if (run.dashMax > 0) {
    run.dashCd = 0;
  }
}

// Démarre une ruade dans une direction normalisée. Retourne false si la
// compétence n'est pas apprise, si aucune charge n'est prête ou si une ruade
// est déjà en cours.
export function startDash(skills, run, dir) {
  if (!run) return false;
  if (!skillEffects(skills).dash) return false;
  if (run.dashTime > 0 || (run.dashCharges ?? 0) <= 0) return false;

  const dx = Number(dir?.x) || 0;
  const dy = Number(dir?.y) || 0;
  const length = Math.hypot(dx, dy);
  run.dashDir = length > 0 ? { x: dx / length, y: dy / length } : null;
  run.dashTime = DASH_TIME;
  run.dashCharges = Math.max(0, run.dashCharges - 1);
  run.invuln = skillEffects(skills).dashInvuln ? Math.max(run.invuln ?? 0, DASH_TIME + 0.05) : run.invuln ?? 0;

  const effects = skillEffects(skills);
  if (run.dashCd <= 0 && run.dashCharges < run.dashMax) {
    run.dashCd = DASH_COOLDOWN + effects.dashCooldown;
  }
  return true;
}

// État lisible des capacités, pour la barre du bas et le panneau.
export function abilityState(skills, run) {
  const effects = skillEffects(skills);
  const cooldown = DASH_COOLDOWN + effects.dashCooldown;
  return {
    dash: {
      unlocked: effects.dash,
      ready: effects.dash && (run?.dashCharges ?? 0) > 0 && (run?.dashTime ?? 0) <= 0,
      charges: run?.dashCharges ?? 0,
      max: effects.dash ? 1 + effects.dashCharges : 0,
      cooldown: run?.dashCd ?? 0,
      full: cooldown
    },
    special: {
      unlocked: effects.special,
      ready: effects.special && (run?.specialCd ?? 0) <= 0,
      cooldown: run?.specialCd ?? 0,
      full: SPECIAL_COOLDOWN
    }
  };
}

// --- Sauvegarde ------------------------------------------------------------

// Relit une sauvegarde sans faire confiance au navigateur : niveau borné, XP
// cohérente, et surtout points recalculés à partir du niveau. Une sauvegarde
// trafiquée ne peut donc pas offrir plus de compétences que de points gagnés.
export function sanitizeSkills(raw) {
  const skills = createSkills();
  if (!raw || typeof raw !== 'object') return skills;

  const level = Math.floor(Number(raw.level));
  skills.level = Number.isFinite(level) ? Math.min(MAX_LEVEL, Math.max(1, level)) : 1;

  const xp = Math.floor(Number(raw.xp));
  skills.xp = Number.isFinite(xp) ? Math.min(Math.max(0, xp), xpNeeded(skills.level) - 1) : 0;

  const budget = 1 + (skills.level - 1);
  const list = Array.isArray(raw.unlocked) ? raw.unlocked : [];

  // On garde les compétences valides dans l'ordre des paliers, tant qu'il
  // reste des points et que les prérequis sont satisfaits.
  const ordered = [...new Set(list)]
    .map((id) => SKILL_BY_ID[id])
    .filter(Boolean)
    .sort((a, b) => a.tier - b.tier);

  let spent = 0;
  for (const node of ordered) {
    if (spent >= budget) break;
    if ((node.requires ?? []).some((required) => !skills.unlocked.has(required))) continue;
    skills.unlocked.add(node.id);
    spent += 1;
  }

  skills.points = Math.max(0, budget - spent);
  return skills;
}

// Version sérialisable (pour localStorage) : un tableau, jamais un Set.
export function serializeSkills(skills) {
  return {
    level: skills.level,
    xp: skills.xp,
    points: skills.points,
    unlocked: Array.from(skills.unlocked)
  };
}
