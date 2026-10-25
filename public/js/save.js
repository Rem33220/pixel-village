// Sauvegarde du personnage : un seul fichier JSON à exporter ou importer.
//
// La progression est déjà enregistrée automatiquement dans le navigateur
// (localStorage) après chaque action. Ce module sert à la mettre à l'abri :
// télécharger une copie, la restaurer après une fausse manipulation, ou la
// reprendre sur un autre appareil.
//
// Le fichier est lisible et versionné : si le format évolue un jour, la
// version permet de refuser proprement une sauvegarde trop récente au lieu de
// casser le personnage.

export const SAVE_FORMAT = 'pixel-village-save';
export const SAVE_VERSION = 1;

// Clés du personnage : les mêmes que RESET_KEYS dans main.js.
const NAME_KEY = 'pixel-village:name';
const COLOR_KEY = 'pixel-village:color';
const REWARDS_KEY = 'pixel-village:rewards';
const DUNGEONS_KEY = 'pixel-village:dungeons';
const LOOT_KEY = 'pixel-village:loot';
const SKILLS_KEY = 'pixel-village:skills';
// Réglages : ils voyagent avec la sauvegarde (volume, son coupé, touches).
const SOUND_KEY = 'pixel-village:settings';
const KEYS_KEY = 'pixel-village:keys';

// Une sauvegarde de ce jeu pèse quelques kilo-octets : au-delà, le fichier
// n'en est pas une.
const MAX_FILE_CHARS = 1_000_000;

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isStringList(value) {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function readString(key) {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

// --- Lecture de l'état courant --------------------------------------------

export function collectSave() {
  return {
    format: SAVE_FORMAT,
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    player: {
      name: readString(NAME_KEY),
      color: readString(COLOR_KEY)
    },
    character: {
      rewards: readJson(REWARDS_KEY, []),
      dungeons: readJson(DUNGEONS_KEY, []),
      loot: readJson(LOOT_KEY, null),
      skills: readJson(SKILLS_KEY, null)
    },
    settings: {
      sound: readJson(SOUND_KEY, {}),
      keys: readJson(KEYS_KEY, {})
    }
  };
}

// --- Validation d'un fichier importé --------------------------------------

function refuse(error) {
  return { ok: false, error };
}

// Accepte le texte d'un fichier .json et renvoie { ok: true, save } ou
// { ok: false, error } avec un message affichable tel quel.
export function parseSave(text) {
  if (typeof text !== 'string' || text.trim() === '') {
    return refuse('Fichier vide ou illisible.');
  }
  if (text.length > MAX_FILE_CHARS) {
    return refuse('Fichier trop volumineux pour être une sauvegarde.');
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return refuse('Ce fichier n’est pas du JSON valide.');
  }
  if (!isObject(data)) {
    return refuse('Ce fichier n’est pas une sauvegarde de Pixel Village.');
  }
  if (data.format !== SAVE_FORMAT) {
    return refuse('Ce fichier n’est pas une sauvegarde de Pixel Village.');
  }

  const version = Number(data.version);
  if (!Number.isInteger(version) || version < 1) {
    return refuse('Version de sauvegarde inconnue.');
  }
  if (version > SAVE_VERSION) {
    return refuse('Cette sauvegarde vient d’une version plus récente du jeu : mets-le à jour avant de l’importer.');
  }

  const player = isObject(data.player) ? data.player : {};
  if (!isObject(data.character)) {
    return refuse('Il manque le personnage dans cette sauvegarde.');
  }
  const character = data.character;
  if (!isStringList(character.rewards ?? [])) {
    return refuse('La liste des récompenses est abîmée.');
  }
  if (!isStringList(character.dungeons ?? [])) {
    return refuse('La liste des donjons conquis est abîmée.');
  }
  if ((character.loot ?? null) !== null && !isObject(character.loot)) {
    return refuse('Le butin est abîmé.');
  }
  if ((character.skills ?? null) !== null && !isObject(character.skills)) {
    return refuse('L’expérience et les compétences sont abîmées.');
  }

  const settings = isObject(data.settings) ? data.settings : {};

  return {
    ok: true,
    save: {
      format: SAVE_FORMAT,
      version,
      savedAt: typeof data.savedAt === 'string' ? data.savedAt : '',
      player: {
        name: typeof player.name === 'string' ? player.name.slice(0, 14) : '',
        color: typeof player.color === 'string' ? player.color : ''
      },
      character: {
        rewards: [...(character.rewards ?? [])],
        dungeons: [...(character.dungeons ?? [])],
        loot: character.loot ?? null,
        skills: character.skills ?? null
      },
      settings: {
        sound: isObject(settings.sound) ? settings.sound : {},
        keys: isObject(settings.keys) ? settings.keys : {}
      }
    }
  };
}

// --- Écriture --------------------------------------------------------------

// Remplace la progression du navigateur par celle du fichier. Les formats
// détaillés (butin, compétences) sont nettoyés au chargement par le jeu.
export function applySave(save) {
  if (!isObject(save) || !isObject(save.character)) return false;

  const writes = [
    [REWARDS_KEY, JSON.stringify(save.character.rewards ?? [])],
    [DUNGEONS_KEY, JSON.stringify(save.character.dungeons ?? [])],
    [LOOT_KEY, JSON.stringify(save.character.loot ?? null)],
    [SKILLS_KEY, JSON.stringify(save.character.skills ?? null)]
  ];
  if (save.player?.name) writes.push([NAME_KEY, save.player.name]);
  if (save.player?.color) writes.push([COLOR_KEY, save.player.color]);
  if (isObject(save.settings?.sound)) {
    writes.push([SOUND_KEY, JSON.stringify(save.settings.sound)]);
  }
  if (isObject(save.settings?.keys)) {
    writes.push([KEYS_KEY, JSON.stringify(save.settings.keys)]);
  }

  try {
    for (const [key, value] of writes) localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

// --- Export ----------------------------------------------------------------

function fileStamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// Résumé lisible affiché avant de confirmer un import.
export function describeSave(save) {
  const name = save?.player?.name || 'Aventurier';
  const level = Number(save?.character?.skills?.level) || 1;
  const date = new Date(save?.savedAt ?? '');
  const when = Number.isNaN(date.getTime())
    ? 'date inconnue'
    : date.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  return `${name} · niveau ${level} · sauvegardé le ${when}`;
}

// Télécharge la sauvegarde courante sous forme de fichier .json.
export function exportSave() {
  const save = collectSave();
  const blob = new Blob([`${JSON.stringify(save, null, 2)}\n`], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `pixel-village-sauvegarde-${fileStamp()}.json`;
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return save;
}
