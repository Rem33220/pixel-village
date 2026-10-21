// Expérience, arbre de compétences et capacités : logique pure (skills.js)
// puis intégration au combat des donjons (dungeons.js). Aucun DOM ici.

import {
  BRANCHES,
  MAX_LEVEL,
  SKILLS,
  SKILL_BY_ID,
  DASH_COOLDOWN,
  REGEN_DELAY,
  SPECIAL_COOLDOWN,
  abilityState,
  branchSkills,
  canUnlock,
  createSkills,
  gainXp,
  isUnlocked,
  prepareAbilities,
  progress,
  sanitizeSkills,
  serializeSkills,
  skillEffects,
  startDash,
  tickAbilities,
  unlockSkill,
  xpForKill,
  xpNeeded
} from '../public/js/skills.js';
import {
  BASE_STATS,
  DROP_CHANCE,
  MONSTERS,
  attackRun,
  createRun,
  createVault,
  playerStats,
  specialAttack,
  updateRun
} from '../public/js/dungeons.js';

const fail = [];
const check = (label, ok, extra = '') => {
  console.log(`${ok ? 'OK  ' : 'ECHEC'} ${label}${extra ? ' — ' + extra : ''}`);
  if (!ok) fail.push(label);
};

// Débloque une liste de compétences en donnant autant de points que nécessaire,
// pour tester les effets sans simuler des heures de jeu.
function withSkills(ids, level = 20) {
  const skills = createSkills();
  skills.level = level;
  skills.points = 1 + (level - 1);
  for (const id of ids) {
    const result = unlockSkill(skills, id);
    if (!result.ok) throw new Error(`Déblocage impossible : ${id} (${result.reason})`);
  }
  return skills;
}

// --- Arbre -----------------------------------------------------------------
{
  check('arbre: quatre branches', BRANCHES.length === 4);
  check('arbre: seize compétences', SKILLS.length === 16);
  check('arbre: identifiants uniques', new Set(SKILLS.map((skill) => skill.id)).size === SKILLS.length);

  for (const branch of BRANCHES) {
    const nodes = branchSkills(branch.id);
    check(`${branch.id}: quatre paliers`, nodes.length === 4
      && nodes.map((node) => node.tier).join(',') === '1,2,3,4');

    for (const node of nodes) {
      check(`${node.id}: une catégorie connue`, ['lame', 'ombre', 'gardien', 'fortune'].includes(node.branch));
      check(`${node.id}: un effet ou une capacité`,
        Boolean(node.ability) || Object.keys(node.effect ?? {}).length > 0);
      for (const required of node.requires ?? []) {
        check(`${node.id}: prérequis ${required} existe`, Boolean(SKILL_BY_ID[required]));
        check(`${node.id}: prérequis du palier précédent`,
          SKILL_BY_ID[required].tier === node.tier - 1
          && SKILL_BY_ID[required].branch === node.branch);
      }
      if (node.tier > 1) check(`${node.id}: pas de palier orphelin`, (node.requires ?? []).length === 1);
    }
  }

  check('arbre: seize points pour tout prendre', SKILLS.length === 16 && MAX_LEVEL >= 16);
}

// --- Niveaux et expérience -------------------------------------------------
{
  const skills = createSkills();
  check('départ: niveau 1, un point', skills.level === 1 && skills.points === 1 && skills.xp === 0);
  check('courbe: XP croissante',
    Array.from({ length: MAX_LEVEL - 2 }, (_, i) => xpNeeded(i + 1))
      .every((value, index) => value < xpNeeded(index + 2)));

  const first = gainXp(skills, xpNeeded(1) - 1);
  check('XP: pas de niveau juste avant le seuil', first.levels === 0 && skills.level === 1);
  const up = gainXp(skills, 1);
  check('XP: niveau au seuil exact', up.levels === 1 && skills.level === 2 && skills.xp === 0);
  check('XP: un point par niveau', skills.points === 2);

  const saved = gainXp(skills, 10000);
  check('XP: niveaux en chaîne', saved.levels > 1 && skills.level > 2);
  check('XP: points = 1 + niveaux gagnés', skills.points === skills.level);

  const maxed = createSkills();
  gainXp(maxed, 10_000_000);
  check('XP: niveau maximum', maxed.level === MAX_LEVEL);
  check('XP: XP plafonnée au maximum', maxed.xp <= xpNeeded(MAX_LEVEL));
  check('XP: plus de point au-delà du maximum', gainXp(maxed, 10_000_000).levels === 0);

  const info = progress(createSkills());
  check('progression: barre à zéro', info.ratio === 0 && info.need === xpNeeded(1));
  check('progression: niveau max = barre pleine', progress(maxed).ratio === 1 && progress(maxed).maxed);

  check('XP: valeur d’un monstre',
    xpForKill({ xp: 10 }, 1, 0) === 10
    && xpForKill({ xp: 10 }, 3, 0) === 14
    && xpForKill({ xp: 10 }, 1, 0.5) === 15);
  check('XP: monstre sans valeur', xpForKill({}, 1, 0) === 0);
  check('XP: chaque monstre en rapporte',
    Object.values(MONSTERS).every((monster) => monster.xp > 0));
}

// --- Effets ----------------------------------------------------------------
{
  const none = skillEffects(createSkills());
  check('effets: neutres sans compétence',
    none.attack === 0 && none.defense === 0 && none.pv === 0
    && none.attackCd === 1 && !none.dash && !none.special && !none.revive);

  const lame = skillEffects(withSkills(['frappe', 'tourbillon', 'fureur', 'execution']));
  check('lame: bonus d’attaque cumulés', lame.attack === 5);
  check('lame: tourbillon débloqué', lame.special === true);
  check('lame: exécution', lame.execute > 0);

  const ombre = skillEffects(withSkills(['ruade', 'pas_leger', 'esquive', 'double_ruade']));
  check('ombre: ruade et esquive', ombre.dash && ombre.dashInvuln);
  check('ombre: deux charges', ombre.dashCharges === 1);
  check('ombre: recharge réduite', ombre.dashCooldown < 0);
  check('ombre: vitesse', ombre.speed > 0);

  const gardien = skillEffects(withSkills(['vigueur', 'peau_de_pierre', 'regeneration', 'second_souffle']));
  check('gardien: PV, défense, régénération', gardien.pv === 12 && gardien.defense === 2 && gardien.regen > 0);
  check('gardien: second souffle', gardien.revive === true);

  const fortune = skillEffects(withSkills(['erudit', 'fouilleur', 'vif_argent', 'oeil']));
  check('fortune: XP et butin', fortune.xpBonus > 0 && fortune.dropBonus > 0);
  check('fortune: coups plus rapides', fortune.attackCd < 1);
  check('fortune: portée', fortune.range > 0);
}

// --- Déblocage -------------------------------------------------------------
{
  const skills = createSkills();
  check('déblocage: inconnue refusée', !canUnlock(skills, 'inconnue').ok);
  const broke = createSkills();
  broke.points = 0;
  check('déblocage: sans point refusé', !canUnlock(broke, 'frappe').ok);
  check('déblocage: prérequis manquant', !canUnlock(withSkills([], 5), 'tourbillon').ok);

  const first = unlockSkill(skills, 'frappe');
  check('déblocage: première compétence', first.ok && isUnlocked(skills, 'frappe'));
  check('déblocage: le point est dépensé', skills.points === 0);
  check('déblocage: pas deux fois', !unlockSkill(skills, 'frappe').ok);
  check('déblocage: pas de point négatif', skills.points === 0);

  const chain = withSkills([], 5);
  const order = ['vigueur', 'peau_de_pierre', 'regeneration', 'second_souffle'];
  const results = order.map((id) => unlockSkill(chain, id));
  check('déblocage: branche complète', results.every((result) => result.ok) && chain.unlocked.size === 4);
  check('déblocage: points restants', chain.points === 1);
}

// --- Sauvegarde ------------------------------------------------------------
{
  const fresh = sanitizeSkills(null);
  check('sauvegarde: vide = personnage neuf',
    fresh.level === 1 && fresh.points === 1 && fresh.unlocked.size === 0);

  const dirty = sanitizeSkills({
    level: 3,
    xp: 999999,
    points: 42,
    unlocked: ['frappe', 'fureur', 'tourbillon', 'execution', 'ruade', 'inconnue']
  });
  check('sauvegarde: niveau borné', dirty.level === 3);
  check('sauvegarde: XP bornée', dirty.xp < xpNeeded(3));
  check('sauvegarde: points recalculés', dirty.points === 3 - dirty.unlocked.size);
  check('sauvegarde: budget respecté', dirty.unlocked.size <= 3);
  check('sauvegarde: identifiant inconnu ignoré', !dirty.unlocked.has('inconnue'));
  check('sauvegarde: prérequis respectés',
    [...dirty.unlocked].every((id) => (SKILL_BY_ID[id].requires ?? []).every((r) => dirty.unlocked.has(r))));

  const round = sanitizeSkills(serializeSkills(withSkills(['ruade', 'pas_leger'], 8)));
  check('sauvegarde: aller-retour', round.level === 8 && round.unlocked.has('pas_leger'));

  const tooHigh = sanitizeSkills({ level: 999, xp: 0, unlocked: [] });
  check('sauvegarde: niveau maximum', tooHigh.level === MAX_LEVEL);
  check('sauvegarde: expérience négative refusée', sanitizeSkills({ level: 2, xp: -50 }).xp === 0);
}

// --- Statistiques du personnage --------------------------------------------
{
  const vault = createVault();
  const base = playerStats(vault);
  check('stats: sans compétence, comme avant',
    base.attack === BASE_STATS.attack && base.defense === 0 && base.pvMax === BASE_STATS.pv);

  const skills = withSkills(['frappe', 'vigueur', 'peau_de_pierre']);
  const boosted = playerStats(vault, skills);
  check('stats: attaque +2', boosted.attack === BASE_STATS.attack + 2);
  check('stats: défense +2', boosted.defense === 2);
  check('stats: PV +12', boosted.pvMax === BASE_STATS.pv + 12);
  check('stats: sans compétence, pas de capacité',
    base.special === false && base.dash === false && base.revive === false);

  const full = withSkills(['frappe', 'tourbillon', 'fureur', 'execution', 'vigueur', 'peau_de_pierre',
    'regeneration', 'second_souffle', 'erudit', 'fouilleur', 'vif_argent', 'oeil']);
  const stats = playerStats(vault, full);
  check('stats: portée allongée', stats.range > 1.35);
  check('stats: coups plus rapides', stats.attackCd < 0.42);
  check('stats: butin plus fréquent', stats.dropChance > DROP_CHANCE);
  check('stats: XP bonus', stats.xpBonus > 0);
}

// --- Combat : dégâts, exécution, tourbillon --------------------------------
function dummyMonster(overrides = {}) {
  return {
    id: 'test',
    type: 'baveux',
    name: 'Baveux',
    x: 5,
    y: 5,
    pv: 30,
    pvMax: 30,
    damage: 1,
    xp: 10,
    speed: 0,
    size: 12,
    tint: '#4fbf6a',
    dir: 'down',
    moving: false,
    alive: true,
    flash: 0,
    cd: 0,
    ...overrides
  };
}

{
  const run = createRun('crypte', 3);
  run.monsters = [dummyMonster({ pv: 100, pvMax: 100 })];
  const player = { rx: 5, ry: 6, dir: 'up' };
  const stats = playerStats(createVault(), withSkills(['frappe', 'tourbillon', 'fureur']));
  const result = attackRun(run, player, stats);
  check('combat: coup renforcé par l’arbre',
    result?.hit && run.monsters[0].pv === 100 - (BASE_STATS.attack + 5), `pv=${run.monsters[0].pv}`);

  const execRun = createRun('crypte', 3);
  execRun.monsters = [dummyMonster({ pv: 10, pvMax: 100 })];
  const plainRun = createRun('crypte', 3);
  plainRun.monsters = [dummyMonster({ pv: 10, pvMax: 100 })];
  const execStats = playerStats(createVault(), withSkills(['frappe', 'tourbillon', 'fureur', 'execution']));
  attackRun(execRun, { rx: 5, ry: 6 }, execStats);
  attackRun(plainRun, { rx: 5, ry: 6 }, playerStats(createVault(), withSkills(['frappe', 'tourbillon', 'fureur'])));
  check('combat: Exécution frappe plus fort un monstre affaibli',
    execRun.monsters[0].pv < plainRun.monsters[0].pv,
    `${execRun.monsters[0].pv} < ${plainRun.monsters[0].pv}`);
}

{
  const run = createRun('crypte', 4);
  run.monsters = [
    dummyMonster({ id: 'a', x: 5, y: 6, pv: 8 }),
    dummyMonster({ id: 'b', x: 6.4, y: 5, pv: 8 }),
    dummyMonster({ id: 'c', x: 6.2, y: 5.6, pv: 1000, pvMax: 1000 }),
    dummyMonster({ id: 'd', x: 9, y: 9, pv: 30 })
  ];
  const player = { rx: 5, ry: 5.4, dir: 'down' };
  const stats = playerStats(createVault(), withSkills(['frappe', 'tourbillon', 'fureur']));

  check('tourbillon: refusé sans la compétence',
    specialAttack(createRun('crypte', 4), player, playerStats(createVault())) === null);

  const result = specialAttack(run, player, stats);
  check('tourbillon: touche plusieurs monstres', result?.hits >= 2, `hits=${result?.hits}`);
  check('tourbillon: deux morts', result?.kills.length === 2);
  check('tourbillon: les morts sont marqués', run.monsters.filter((m) => !m.alive).length === 2);
  check('tourbillon: le monstre lointain est intact', run.monsters[3].pv === 30);
  check('tourbillon: délai armé', run.specialCd === SPECIAL_COOLDOWN);
  check('tourbillon: pas deux fois de suite', specialAttack(run, player, stats) === null);

  // Les dégâts valent 1,8 fois un coup normal, arrondis.
  const expected = Math.max(1, Math.round(stats.attack * 1.8));
  check('tourbillon: dégâts multipliés', run.monsters[2].pv === 1000 - expected,
    `${run.monsters[2].pv} / attendu ${1000 - expected}`);
}

// --- Combat : régénération et second souffle -------------------------------
{
  const run = createRun('crypte', 5);
  run.monsters = [];
  run.chests.forEach((chest) => { chest.opened = true; });
  run.pv = 10;
  run.pvMax = 100;
  run.sinceHit = 0;
  const stats = { attack: 4, defense: 0, regen: 2 };

  updateRun(run, { rx: 1, ry: 15 }, REGEN_DELAY - 0.1, stats);
  check('régénération: pas de soin avant le délai', run.pv === 10);
  const healed = updateRun(run, { rx: 1, ry: 15 }, 0.2, stats);
  check('régénération: soin après le délai', run.pv > 10 && healed.healed > 0);
  check('régénération: jamais au-delà du maximum', run.pv <= run.pvMax);

  const full = createRun('crypte', 5);
  full.monsters = [];
  full.pv = full.pvMax;
  const noHeal = updateRun(full, { rx: 1, ry: 15 }, 5, stats);
  check('régénération: rien à soigner', noHeal.healed === 0);
}

{
  const run = createRun('crypte', 6);
  const monster = run.monsters[0];
  run.chests.forEach((chest) => { chest.opened = true; });
  run.grace = 0;
  run.pv = 1;
  run.pvMax = 60;
  run.sinceHit = 0;

  const player = { rx: monster.x, ry: monster.y };
  const reviveStats = { attack: 4, defense: 0, revive: true };

  const first = updateRun(run, player, 0.05, reviveStats);
  check('second souffle: on ne meurt pas', first.revived === true && first.dead === false);
  check('second souffle: on se relève à 35 %', run.pv === Math.round(60 * 0.35), `pv=${run.pv}`);
  check('second souffle: répit accordé', run.invuln > 0);
  check('second souffle: utilisé une fois', run.reviveUsed === true);

  run.invuln = 0;
  run.grace = 0;
  monster.cd = 0;
  run.pv = 1;
  const second = updateRun(run, player, 0.05, reviveStats);
  check('second souffle: la seconde fois est fatale', second.dead === true && run.phase === 'dead');
}

// --- Capacités : ruade -----------------------------------------------------
{
  const plain = createRun('crypte', 7);
  prepareAbilities(createSkills(), plain);
  check('ruade: absente sans la compétence', plain.dashMax === 0 && !startDash(createSkills(), plain, { x: 1, y: 0 }));

  const skills = withSkills(['ruade']);
  const run = createRun('crypte', 7);
  prepareAbilities(skills, run);
  check('ruade: une charge prête', run.dashCharges === 1 && run.dashMax === 1);

  check('ruade: démarre dans la direction demandée',
    startDash(skills, run, { x: 1, y: 0 }) === true && run.dashTime > 0 && run.dashDir.x === 1);
  check('ruade: la charge est consommée', run.dashCharges === 0);
  check('ruade: pas deux ruades d’un coup', startDash(skills, run, { x: 0, y: 1 }) === false);

  tickAbilities(skills, run, 0.25);
  check('ruade: se termine', run.dashTime === 0);
  tickAbilities(skills, run, DASH_COOLDOWN + 0.1);
  check('ruade: recharge après le délai', run.dashCharges === 1);

  const double = withSkills(['ruade', 'pas_leger', 'esquive', 'double_ruade']);
  const fast = createRun('crypte', 7);
  prepareAbilities(double, fast);
  check('double ruade: deux charges', fast.dashCharges === 2);
  startDash(double, fast, { x: 0, y: 1 });
  tickAbilities(double, fast, 0.3);
  check('double ruade: une seconde charge disponible', startDash(double, fast, { x: 0, y: 1 }) === true);
  check('esquive: invulnérable pendant la ruade', fast.invuln > 0);

  const stateData = abilityState(double, fast);
  check('capacités: état lisible', stateData.dash.unlocked && stateData.dash.max === 2
    && stateData.dash.charges === 0);
  check('capacités: tourbillon non appris', stateData.special.unlocked === false);
}

// --- Résumé ----------------------------------------------------------------
if (fail.length > 0) {
  console.error(`\n${fail.length} échec(s) :`);
  for (const label of fail) console.error(`  - ${label}`);
  process.exit(1);
}
console.log('\nTous les tests passent');
