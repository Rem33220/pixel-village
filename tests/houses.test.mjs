import { generateWorld, isSolid } from '../public/js/map.js';
import {
  buildHouses,
  buildInterior,
  createChallenge,
  updateChallenge,
  answerQuiz,
  openQuiz,
  nearExit,
  nearTome,
  QUIZ,
  RUNE_PADS,
  CRYSTAL_SPOTS,
  houseUnlocked,
  houseForDungeon,
  houseWithArticle,
  REWARDS,
  relicEffects
} from '../public/js/houses.js';
import { DUNGEONS } from '../public/js/dungeons.js';

const world = generateWorld();
const houses = buildHouses(world);
const fail = [];
const check = (label, ok, extra = '') => {
  console.log(`${ok ? 'OK  ' : 'ECHEC'} ${label}${extra ? ' — ' + extra : ''}`);
  if (!ok) fail.push(label);
};

// --- Sceaux : un donjon par maison ----------------------------------------
{
  const keys = houses.map((house) => house.requiredDungeon);
  check('sceaux: chaque maison a un donjon gardien', keys.every(Boolean), keys.join(', '));
  check('sceaux: un seul donjon par maison', new Set(keys).size === keys.length);
  check('sceaux: chaque donjon du village garde une maison', DUNGEONS
    .filter((dungeon) => !dungeon.requires?.length)
    .every((dungeon) => houses.filter((house) => house.requiredDungeon === dungeon.id).length === 1),
  DUNGEONS.map((d) => d.id).join(', '));
  check('sceaux: les expéditions avancées ne gardent aucune maison', DUNGEONS
    .filter((dungeon) => dungeon.requires?.length)
    .every((dungeon) => houseForDungeon(dungeon.id, houses) === null));
  check('sceaux: donjon inconnu ignoré', houseUnlocked({ requiredDungeon: 'abysses' }, new Set(['crypte'])) === false);

  const house = houses.find((h) => h.requiredDungeon === 'crypte');
  check('sceaux: fermée tant que le donjon n’est pas conquis',
    !houseUnlocked(house, new Set()) && !houseUnlocked(house, new Set(['antre'])));
  check('sceaux: ouverte après la victoire',
    houseUnlocked(house, new Set(['crypte'])) && houseUnlocked(house, new Set(['crypte', 'antre'])));
  check('sceaux: maison retrouvée depuis le donjon',
    houseForDungeon('galerie', houses)?.id === 'cristaux'
    && houseForDungeon('abysses', houses) === null);
  check('sceaux: article défini correct',
    houseWithArticle(houses.find((h) => h.id === 'runes')) === 'la Chaumière des runes'
    && houseWithArticle(houses.find((h) => h.id === 'cristaux')) === 'l’Atelier des cristaux');
}

// --- Récompenses : chaque maison donne un avantage en donjon ----------------
{
  const ids = Object.keys(REWARDS);
  check('récompenses: trois récompenses connues', ids.length === 3
    && ['lampe', 'bottes', 'medaille'].every((id) => REWARDS[id]));
  check('récompenses: chacune a un effet de donjon chiffré',
    ids.every((id) => Boolean(REWARDS[id].dungeonEffect) && Boolean(REWARDS[id].relic)));

  const none = relicEffects(new Set());
  check('récompenses: sans récompense, aucun bonus',
    Object.values(none).every((value) => value === 0));
  check('récompenses: sauvegarde absente ou invalide ignorée',
    Object.values(relicEffects(null)).every((value) => value === 0)
    && Object.values(relicEffects(new Set(['licorne']))).every((value) => value === 0));

  const all = relicEffects(new Set(ids));
  check('récompenses: les trois effets s’additionnent',
    all.secretRange === 1.3 && all.dropBonus === 0.1
    && all.xpBonus === 0.15 && all.pv === 5
    && all.regen === 0.5 && all.speed === 0.25,
    JSON.stringify(all));
  const lamp = relicEffects(new Set(['lampe']));
  check('récompenses: la lampe seule aide à trouver les fissures',
    lamp.secretRange > 0 && lamp.dropBonus > 0
    && lamp.xpBonus === 0 && lamp.pv === 0);
}

// --- Épreuve des runes : séquence reproduite correctement -------------------
{
  const house = houses.find((h) => h.id === 'runes');
  const ch = createChallenge(house.challenge);
  // Phase d'observation : on laisse le temps défiler.
  let guard = 0;
  while (ch.phase === 'watch' && guard++ < 400) updateChallenge(ch, { x: 7.5, y: 5.5 }, 0.05);
  check('runes: phase input après observation', ch.phase === 'input', `phase=${ch.phase}`);

  let result = null;
  for (const index of ch.seq) {
    // sortir de toute dalle, puis marcher sur la bonne
    updateChallenge(ch, { x: 7.5, y: 5.5 }, 0.05);
    result = updateChallenge(ch, RUNE_PADS[index], 0.05);
  }
  check('runes: victoire dans le bon ordre', ch.phase === 'won' && result === 'won');

  // Mauvais ordre : la séquence repart en observation.
  const bad = createChallenge('runes');
  let g = 0;
  while (bad.phase === 'watch' && g++ < 400) updateChallenge(bad, { x: 7.5, y: 5.5 }, 0.05);
  const wrong = RUNE_PADS.findIndex((_, i) => i !== bad.seq[0]);
  updateChallenge(bad, { x: 7.5, y: 5.5 }, 0.05);
  updateChallenge(bad, RUNE_PADS[wrong], 0.05);
  check('runes: mauvais ordre => retour en observation', bad.phase === 'watch' && bad.step === 0);
}

// --- Épreuve des cristaux -------------------------------------------------
{
  const ch = createChallenge('cristaux');
  let won = null;
  for (const spot of CRYSTAL_SPOTS) {
    won = updateChallenge(ch, spot, 0.05) ?? won;
  }
  check('cristaux: victoire en touchant les six', ch.phase === 'won' && won === 'won');

  const slow = createChallenge('cristaux');
  let retry = null;
  for (let i = 0; i < 800; i++) retry = updateChallenge(slow, { x: 7.5, y: 9 }, 0.05) ?? retry;
  check('cristaux: chrono écoulé => relance', retry === 'retry' && slow.taken.every((t) => !t), `time=${slow.time.toFixed(1)}`);

  const partial = createChallenge('cristaux');
  updateChallenge(partial, CRYSTAL_SPOTS[0], 0.05);
  check('cristaux: un cristal compté une seule fois', partial.taken.filter(Boolean).length === 1);
}

// --- Épreuve des énigmes ---------------------------------------------------
{
  const ch = createChallenge('devinettes');
  check('devinettes: lecture refusée avant le livre', openQuiz(ch) && ch.phase === 'question');
  let result = null;
  for (let i = 0; i < QUIZ.length; i++) result = answerQuiz(ch, QUIZ[i].answer) ?? result;
  check('devinettes: victoire avec les bonnes réponses', ch.phase === 'won' && result === 'won');

  const failed = createChallenge('devinettes');
  openQuiz(failed);
  answerQuiz(failed, QUIZ[0].answer);
  const wrongAnswer = (QUIZ[1].answer + 1) % QUIZ[1].options.length;
  const res = answerQuiz(failed, wrongAnswer);
  check('devinettes: erreur => retour à la première énigme', res === 'wrong' && failed.index === 0);
}

// --- Intérieurs praticables ----------------------------------------------
for (const house of houses) {
  const room = buildInterior(house);
  const walkable = (x, y) => !isSolid(room, Math.floor(x), Math.floor(y));
  check(`intérieur ${house.id}: arrivée praticable`, walkable(room.spawn.x, room.spawn.y));
  check(`intérieur ${house.id}: sortie détectée à l'arrivée`, !nearExit(room, room.spawn));
  check(`intérieur ${house.id}: sortie détectée devant la porte`, nearExit(room, { x: 7.5, y: 9.6 }));
  const reachable = RUNE_PADS.concat(CRYSTAL_SPOTS).every((p) => walkable(p.x, p.y));
  check(`intérieur ${house.id}: dalles et cristaux sur du sol libre`, reachable);
}

// --- Accès aux maisons depuis le point de départ -------------------------
{
  const start = { x: Math.floor(world.spawn.x), y: Math.floor(world.spawn.y) };
  const seen = new Set([`${start.x},${start.y}`]);
  const queue = [start];
  while (queue.length) {
    const { x, y } = queue.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      const key = `${nx},${ny}`;
      if (seen.has(key)) continue;
      if (isSolid(world, nx, ny)) continue;
      seen.add(key);
      queue.push({ x: nx, y: ny });
    }
  }
  for (const house of houses) {
    const sx = Math.floor(house.stand.x);
    const sy = Math.floor(house.stand.y);
    check(`accès ${house.id}: seuil atteignable à pied`, seen.has(`${sx},${sy}`));
    const apron = [[-1, 1], [0, 1], [1, 1], [0, 2]].every(([dx, dy]) => {
      return !isSolid(world, house.door.x + dx, house.door.y + dy);
    });
    check(`accès ${house.id}: devant de porte dégagé`, apron);
  }
}

console.log(fail.length ? `\n${fail.length} échec(s)` : '\nTous les tests passent');
process.exit(fail.length ? 1 : 0);
