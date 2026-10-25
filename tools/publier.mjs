// Publication en une seule commande : contrôles, tests, commit, push.
//
//   node tools/publier.mjs "Message du commit"
//
// Le script refuse de publier si un fichier ne passe pas `node --check` ou si
// un test échoue : le jeu officiel ne reçoit que du code vérifié. Il ne fait
// jamais de `--force`, de `push` sans vérification ni de commit vide, et
// n'efface jamais de fichier local. Si le dossier n'est pas encore un dépôt
// Git, il l'initialise et demande l'adresse GitHub une seule fois. Après le
// push, Render redéploie tout seul (voir render.yaml).
//
// Aucune dépendance : uniquement la bibliothèque standard de Node.

import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';
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

// --- 1. Dépôt Git relié à GitHub ----------------------------------------
//
// Le dossier peut venir d'un zip : sans .git, rien n'est poussable. Plutôt que
// de refuser la publication, on initialise le dépôt et on demande une seule
// fois l'adresse GitHub (elle reste enregistrée dans .git/config).

function ask(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    let answered = false;
    rl.question(question, (answer) => {
      answered = true;
      rl.close();
      resolve((answer ?? '').trim());
    });
    rl.on('close', () => {
      if (!answered) resolve('');
    });
  });
}

function githubOwner(url) {
  const ssh = /^git@[\w.-]+:([\w.-]+)\//.exec(url);
  if (ssh) return ssh[1];
  const https = /^https?:\/\/[^/]+\/([\w.-]+)\//.exec(url);
  return https ? https[1] : null;
}

// Accepte « compte/dépôt », une URL https ou une URL SSH.
function normalizeRemote(value) {
  const cleaned = value.trim().replace(/\/+$/, '').replace(/\.git$/i, '');
  if (!cleaned) return null;
  if (/^[\w.-]+\/[\w.-]+$/.test(cleaned)) return `https://github.com/${cleaned}.git`;
  if (/^https?:\/\/[^\s]+\/[\w.-]+\/[\w.-]+$/i.test(cleaned)) return `${cleaned}.git`;
  if (/^git@[\w.-]+:[\w.-]+\/[\w.-]+$/i.test(cleaned)) return `${cleaned}.git`;
  return null;
}

async function prepareRepository() {
  if (gitText(['rev-parse', '--is-inside-work-tree']) !== 'true') {
    info('Initialisation du dépôt Git local…');
    const init = git(['init'], { quiet: true });
    if (init.status !== 0) {
      console.error(`${init.stdout ?? ''}${init.stderr ?? ''}`);
      stop('Impossible d’initialiser le dépôt Git dans ce dossier.');
    }
    git(['symbolic-ref', 'HEAD', 'refs/heads/main'], { quiet: true });
    ok('Dépôt Git créé dans ce dossier.');
  }

  let origin = gitText(['remote', 'get-url', 'origin']);
  if (!origin) {
    console.log('');
    console.log('  Adresse du dépôt GitHub de Pixel Village, par exemple :');
    console.log('    https://github.com/moncompte/pixel-village.git');
    console.log('  Dépôt pas encore créé ? https://github.com/new puis copier son adresse.');
    while (!origin) {
      const answer = await ask('  URL du dépôt : ');
      if (!answer) {
        stop(
          'Aucune adresse fournie : rien n’a été envoyé. ' +
            'Double-clique sur « Publier sur GitHub.bat » pour la saisir.'
        );
      }
      const url = normalizeRemote(answer);
      if (!url) {
        console.log('  Adresse non reconnue — exemple : https://github.com/moncompte/pixel-village.git');
        continue;
      }
      const added = git(['remote', 'add', 'origin', url], { quiet: true });
      if (added.status !== 0) {
        console.error(`${added.stdout ?? ''}${added.stderr ?? ''}`);
        stop('Impossible d’enregistrer l’adresse du dépôt.');
      }
      origin = url;
      ok(`Dépôt distant enregistré : ${url}`);
    }
  }

  // Identité Git : sans elle, le tout premier commit échoue sur une machine neuve.
  const owner = githubOwner(origin) ?? 'pixel-village';
  if (!gitText(['config', 'user.email'])) {
    git(['config', 'user.email', `${owner}@users.noreply.github.com`], { quiet: true });
    ok(`E-mail Git local configuré (${owner}@users.noreply.github.com).`);
  }
  if (!gitText(['config', 'user.name'])) {
    git(['config', 'user.name', owner], { quiet: true });
    ok(`Nom Git local configuré (${owner}).`);
  }

  // GitHub attend la branche main : on s'y place avant de committer.
  const branch = gitText(['branch', '--show-current']);
  if (branch && branch !== 'main') {
    const renamed = git(['branch', '-M', 'main'], { quiet: true });
    if (renamed.status !== 0) stop('Impossible de placer la branche locale sur « main ».');
  }
}

await prepareRepository();

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

// Sur un dépôt GitHub encore vide, origin/main n'existe pas : les commits
// locaux sont alors tous à envoyer (sinon la première publication ne partirait
// jamais).
function aheadCount() {
  if (!gitText(['rev-parse', '--verify', 'origin/main'])) return countCommits('HEAD');
  return countCommits('origin/main..HEAD');
}

// Dossier déposé sur GitHub sans son historique (copie d'un zip) : aucun ancêtre
// commun avec origin/main. On repart de origin/main sans toucher aux fichiers,
// puis le contenu du dossier devient un nouveau commit par-dessus l'historique.
function adoptRemoteHistory() {
  info('Le dépôt GitHub a un historique séparé : rattachement des fichiers par-dessus…');
  const reset = git(['reset', 'origin/main'], { quiet: true });
  if (reset.status !== 0) {
    console.error(`${reset.stdout ?? ''}${reset.stderr ?? ''}`);
    stop('Impossible de rattacher ce dossier à l’historique de origin/main.');
  }
  git(['add', '-A'], { quiet: true });
  const removed = (gitText(['diff', '--cached', '--name-status']) ?? '')
    .split('\n')
    .filter((line) => line.startsWith('D'))
    .map((line) => line.split('\t')[1]);
  if (removed.length > 0) {
    console.log(`     ${removed.length} fichier(s) absents de ce dossier quitteront le jeu officiel :`);
    for (const file of removed.slice(0, 10)) console.log(`       ${file}`);
    if (removed.length > 10) console.log(`       … et ${removed.length - 10} autre(s)`);
  }
  if ((git(['diff', '--cached', '--quiet'], { quiet: true }).status ?? 0) === 0) {
    ok('Le jeu officiel contient déjà exactement ces fichiers.');
    return;
  }
  const commit = git(['commit', '-m', message], { quiet: true });
  if (commit.status !== 0) {
    console.error(`${commit.stdout ?? ''}${commit.stderr ?? ''}`);
    stop('Le commit de rattachement a échoué : aucun fichier local n’a été modifié.');
  }
  ok('Fichiers rattachés à l’historique du dépôt GitHub.');
}

function syncWithOrigin() {
  fetchOrigin();
  if (!gitText(['rev-parse', '--verify', 'origin/main'])) return;

  if (gitText(['merge-base', 'HEAD', 'origin/main']) === null) {
    adoptRemoteHistory();
    return;
  }

  const behind = countCommits('HEAD..origin/main');
  if (behind === 0) return;
  const ahead = aheadCount();

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
  const push = git(['push', '-u', 'origin', 'main'], { quiet: true });
  return { ok: push.status === 0, output: `${push.stdout ?? ''}${push.stderr ?? ''}`.trim() };
}

info('Synchronisation avec origin…');
syncWithOrigin();

let ahead = aheadCount();
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
        ? 'GitHub refuse l’envoi : vérifie l’adresse du dépôt (git remote get-url origin) et tes droits ' +
            'd’écriture. Si une fenêtre de connexion s’est fermée, relance et connecte-toi : le mot de ' +
            'passe attendu est un jeton d’accès personnel GitHub (Settings → Developer settings → Tokens).'
        : 'Impossible de joindre GitHub : vérifie la connexion internet, puis relance.'
    );
  }

  info('origin/main a avancé pendant l’envoi : nouvelle synchronisation, puis nouvel essai…');
  syncWithOrigin();
  ahead = aheadCount();
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
