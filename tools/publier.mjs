// Publication en une seule commande : contrôles, tests, commit, push.
//
//   node tools/publier.mjs "Message du commit"
//
// Le script refuse de publier si un fichier ne passe pas `node --check` ou si
// un test échoue : le jeu officiel ne reçoit que du code vérifié. Il ne fait
// jamais de `reset`, de `--force` ni de commit vide. Après le push, Render
// redéploie tout seul (voir render.yaml).
//
// Aucune dépendance : uniquement la bibliothèque standard de Node.

import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);

const message = process.argv.slice(2).join(' ').trim() || 'Mise a jour du jeu';

const COLOR = process.stdout.isTTY;
const paint = (code, text) => (COLOR ? `\u001b[${code}m${text}\u001b[0m` : text);
const ok = (text) => console.log(`${paint(32, 'OK  ')} ${text}`);
const info = (text) => console.log(`${paint(36, '...')} ${text}`);
const fail = (text) => console.error(`${paint(31, 'ECHEC')} ${text}`);

function stop(reason) {
  if (reason) fail(reason);
  console.error('\nRien n’a été envoyé : le jeu officiel reste inchangé.');
  process.exit(1);
}

function git(args, { quiet = false } = {}) {
  return spawnSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: quiet ? 'pipe' : 'inherit'
  });
}

function gitText(args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  if (result.error || result.status !== 0) return null;
  return result.stdout.trim();
}

function walk(directory) {
  let entries;
  try {
    entries = readdirSync(directory, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries.flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.isFile() ? [full] : [];
  });
}

// --- 1. Dépôt Git exploitable -------------------------------------------
if (gitText(['rev-parse', '--is-inside-work-tree']) !== 'true') {
  stop('Ce dossier n’est pas un dépôt Git.');
}
if (!gitText(['remote', 'get-url', 'origin'])) {
  stop('Aucun dépôt distant « origin » : ajoute-le avec git remote add origin URL.');
}

// --- 2. Syntaxe de tous les modules -------------------------------------
info('Vérification de la syntaxe…');
const sources = [
  ...walk(path.join(root, 'public', 'js')),
  ...walk(path.join(root, 'server')),
  ...walk(path.join(root, 'tests')),
  ...walk(path.join(root, 'tools'))
].filter((file) => file.endsWith('.js') || file.endsWith('.mjs'));

for (const file of sources) {
  const result = spawnSync(process.execPath, ['--check', file], { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) {
    console.error(result.stderr ?? '');
    stop(`Syntaxe invalide : ${path.relative(root, file)}`);
  }
}
ok(`${sources.length} fichiers sans erreur de syntaxe.`);

// --- 3. Tests ------------------------------------------------------------
info('Lancement des tests…');
const tests = readdirSync(path.join(root, 'tests'))
  .filter((name) => name.endsWith('.test.mjs'))
  .sort();

for (const name of tests) {
  const result = spawnSync(process.execPath, [path.join('tests', name)], {
    cwd: root,
    encoding: 'utf8'
  });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  const passed = output.split('\n').filter((line) => line.startsWith('OK')).length;
  if (result.status !== 0) {
    console.error(output);
    stop(`${name} échoue (code ${result.status}).`);
  }
  ok(`${name} — ${passed} contrôle${passed > 1 ? 's' : ''}.`);
}

// --- 4. Commit -----------------------------------------------------------
info('Préparation du commit…');
git(['add', '-A'], { quiet: true });
const staged = gitText(['diff', '--cached', '--name-only']);
const nothingStaged = (git(['diff', '--cached', '--quiet'], { quiet: true }).status ?? 0) === 0;

if (nothingStaged) {
  ok('Aucun changement local à enregistrer.');
} else {
  const lines = (staged ?? '').split('\n').filter(Boolean);
  console.log(`     ${lines.length} fichier${lines.length > 1 ? 's' : ''} :`);
  for (const line of lines) console.log(`       ${line}`);
  const commit = git(['commit', '-m', message], { quiet: true });
  if (commit.status !== 0) {
    console.error(`${commit.stdout ?? ''}${commit.stderr ?? ''}`);
    stop('Le commit a échoué (identité Git ou crochet refusant le commit ?).');
  }
  const first = (commit.stdout ?? '').split('\n')[0];
  ok(first || 'Commit créé.');
}

// --- 5. Synchronisation puis push ---------------------------------------
//
// Le dépôt distant peut avoir avancé (autre ordinateur, modification faite sur
// GitHub, autre session publiée entre-temps). Un push direct est alors refusé
// avec « fetch first ». On se synchronise donc d'abord : avance rapide quand
// c'est possible, sinon report des commits locaux pas encore publiés par-dessus
// origin/main. Rien n'est écrasé : si le report tombe sur un conflit, il est
// annulé et le jeu officiel reste intact.
function fetchOrigin() {
  const fetched = git(['fetch', 'origin'], { quiet: true });
  if (fetched.status !== 0) {
    console.error(`${fetched.stdout ?? ''}${fetched.stderr ?? ''}`);
    stop('Impossible de joindre origin (connexion, URL du dépôt ou droits GitHub).');
  }
}

const countCommits = (range) => Number(gitText(['rev-list', '--count', range]) ?? 0);

function syncWithOrigin() {
  fetchOrigin();
  if (!gitText(['rev-parse', '--verify', 'origin/main'])) return;

  const behind = countCommits('HEAD..origin/main');
  if (behind === 0) return;
  const ahead = countCommits('origin/main..HEAD');

  if (ahead === 0) {
    info(`origin/main a ${behind} commit(s) d’avance : mise à jour en avance rapide…`);
    const merge = git(['merge', '--ff-only', 'origin/main'], { quiet: true });
    if (merge.status !== 0) {
      console.error(`${merge.stdout ?? ''}${merge.stderr ?? ''}`);
      stop('Mise à jour impossible : rien n’a été écrasé, il faut fusionner à la main.');
    }
    return;
  }

  info(`origin/main a ${behind} commit(s) d’avance : report des ${ahead} commit(s) locaux par-dessus…`);
  const rebase = git(['rebase', 'origin/main'], { quiet: true });
  if (rebase.status !== 0) {
    git(['rebase', '--abort'], { quiet: true });
    console.error(`${rebase.stdout ?? ''}${rebase.stderr ?? ''}`);
    stop(
      'Tes changements et ceux déjà publiés touchent les mêmes lignes : rien n’a été envoyé, ' +
        'relance la publication après avoir fusionné ces fichiers à la main.'
    );
  }
}

// Git répond « rejected / fetch first » quand origin/main a bougé entre notre
// synchronisation et l'envoi : c'est un cas normal ici (plusieurs sessions
// publient), pas un problème de droits.
function pushFailureCause(output) {
  if (/non-fast-forward|fetch first|failed to update ref|rejected/i.test(output)) return 'course';
  if (/permission denied|authentication failed|could not read username|not found|40[13]/i.test(output)) {
    return 'droits';
  }
  return 'reseau';
}

function pushToOrigin() {
  const push = git(['push', 'origin', 'main'], { quiet: true });
  return { ok: push.status === 0, output: `${push.stdout ?? ''}${push.stderr ?? ''}`.trim() };
}

info('Synchronisation avec origin…');
syncWithOrigin();

let ahead = countCommits('origin/main..HEAD');
if (ahead === 0) {
  ok('Le jeu officiel est déjà à jour.');
  console.log('\nAucun envoi nécessaire.');
  process.exit(0);
}

info(`Envoi de ${ahead} commit(s) vers origin/main…`);
let attempt = pushToOrigin();
if (!attempt.ok) {
  const cause = pushFailureCause(attempt.output);
  if (cause !== 'course') {
    console.error(attempt.output);
    stop(
      cause === 'droits'
        ? 'GitHub refuse l’envoi : vérifie l’URL du dépôt (git remote get-url origin) et tes droits d’écriture.'
        : 'Impossible de joindre GitHub : vérifie la connexion internet, puis relance.'
    );
  }

  info('origin/main a avancé pendant l’envoi : nouvelle synchronisation, puis nouvel essai…');
  syncWithOrigin();
  ahead = countCommits('origin/main..HEAD');
  attempt = ahead === 0 ? { ok: true, output: '' } : pushToOrigin();
  if (!attempt.ok) {
    console.error(attempt.output);
    stop(
      'Une autre publication est arrivée en même temps : rien n’a été écrasé, ' +
        'relance simplement la publication dans un instant.'
    );
  }
}

ok('Publié. Render redéploie automatiquement (compter une à deux minutes).');
console.log('\nVérifie ensuite le jeu officiel :');
console.log('  https://pixel-village-pixel-village-onrender-com.onrender.com');
