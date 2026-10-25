// Sauvegarde du personnage (save.js) : validation du fichier importé et
// restauration dans le stockage du navigateur. Aucun DOM ici.

import {
  SAVE_FORMAT,
  SAVE_VERSION,
  applySave,
  collectSave,
  describeSave,
  parseSave
} from '../public/js/save.js';

// localStorage minimal, comme celui d'un navigateur.
const memory = new Map();
globalThis.localStorage = {
  getItem: (key) => (memory.has(key) ? memory.get(key) : null),
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: (key) => memory.delete(key),
  clear: () => memory.clear()
};

const fail = [];
const check = (label, ok, extra = '') => {
  console.log(`${ok ? 'OK  ' : 'ECHEC'} ${label}${extra ? ' — ' + extra : ''}`);
  if (!ok) fail.push(label);
};

const VALID = {
  format: SAVE_FORMAT,
  version: SAVE_VERSION,
  savedAt: '2026-10-25T10:00:00.000Z',
  player: { name: 'Aventurière', color: '#e8d6a4' },
  character: {
    rewards: ['cle-du-puits', 'lame'],
    dungeons: ['donjon-1'],
    loot: { items: [{ id: 'epee', count: 2 }], coins: 12 },
    skills: { level: 3, xp: 10, points: 2, unlocked: ['force'] }
  },
  settings: { sound: { volume: 60, muted: false }, keys: { up: 'KeyZ' } }
};

const text = (save) => JSON.stringify(save);

// --- Fichiers refusés -------------------------------------------------------

check('refus: texte vide', parseSave('').ok === false);
check('refus: JSON invalide', parseSave('{oops').ok === false);
check('refus: mauvais format', parseSave(text({ ...VALID, format: 'autre' })).ok === false);
check('refus: version future', parseSave(text({ ...VALID, version: SAVE_VERSION + 1 })).ok === false);
check('refus: version inconnue', parseSave(text({ ...VALID, version: 0 })).ok === false);
check('refus: personnage manquant', parseSave(text({ ...VALID, character: null })).ok === false);
check(
  'refus: récompenses abîmées',
  parseSave(text({ ...VALID, character: { ...VALID.character, rewards: [1, 2] } })).ok === false
);
check(
  'refus: donjons abîmés',
  parseSave(text({ ...VALID, character: { ...VALID.character, dungeons: 'donjon-1' } })).ok === false
);
check(
  'refus: butin abîmé',
  parseSave(text({ ...VALID, character: { ...VALID.character, loot: [] } })).ok === false
);
check(
  'refus: compétences abîmées',
  parseSave(text({ ...VALID, character: { ...VALID.character, skills: 'niveau 3' } })).ok === false
);

// --- Fichier valide ---------------------------------------------------------

const parsed = parseSave(text(VALID));
check('accepté: sauvegarde du jeu', parsed.ok === true);
check('accepté: nom conservé', parsed.ok && parsed.save.player.name === 'Aventurière');
check(
  'accepté: contenu du personnage',
  parsed.ok && parsed.save.character.rewards.length === 2
    && parsed.save.character.dungeons[0] === 'donjon-1'
    && parsed.save.character.skills.level === 3
);
check('accepté: réglages conservés', parsed.ok && parsed.save.settings.keys.up === 'KeyZ');

const longName = parseSave(text({ ...VALID, player: { name: 'X'.repeat(40) } }));
check('nom trop long: coupé à 14', longName.ok && longName.save.player.name.length === 14);

const withoutSettings = parseSave(text({ ...VALID, settings: undefined }));
check(
  'sans réglages: import possible',
  withoutSettings.ok === true && withoutSettings.save.settings.keys.up === undefined
);

// --- Restauration -----------------------------------------------------------

memory.clear();
localStorage.setItem('pixel-village:skills', text({ level: 9, xp: 0, points: 0, unlocked: [] }));
const restored = applySave(parsed.save);
const reloaded = collectSave();
check('restauration: écriture acceptée', restored === true);
check('restauration: récompenses remplacées', reloaded.character.rewards[0] === 'cle-du-puits');
check('restauration: donjons remplacés', reloaded.character.dungeons[0] === 'donjon-1');
check('restauration: niveau remplacé', reloaded.character.skills.level === 3);
check('restauration: nom du joueur', reloaded.player.name === 'Aventurière');
check('restauration: réglages restaurés', reloaded.settings.keys.up === 'KeyZ');
check('restauration: format et version', reloaded.format === SAVE_FORMAT && reloaded.version === SAVE_VERSION);
check('restauration: horodatage', /^\d{4}-\d{2}-\d{2}T/.test(reloaded.savedAt));

check('restauration: refus d’un objet vide', applySave({}) === false);
check('restauration: refus de null', applySave(null) === false);

// Le fichier exporté doit pouvoir être réimporté tel quel.
const roundTrip = parseSave(text(collectSave()));
check('aller-retour: export réimportable', roundTrip.ok === true);
check(
  'aller-retour: même personnage',
  roundTrip.ok && roundTrip.save.character.skills.level === 3
    && roundTrip.save.player.name === 'Aventurière'
);

// --- Résumé -----------------------------------------------------------------

const summary = describeSave(parsed.save);
check('résumé: nom et niveau', summary.includes('Aventurière') && summary.includes('niveau 3'), summary);
check('résumé: sauvegarde sans date', describeSave({}).includes('date inconnue'));

// --- Résumé des tests -------------------------------------------------------
if (fail.length > 0) {
  console.error(`\n${fail.length} échec(s) :`);
  for (const label of fail) console.error(`  - ${label}`);
  process.exit(1);
}
console.log('\nTous les tests passent');
