// Sons du jeu : entièrement synthétisés avec l'API Web Audio, donc aucun
// fichier audio à télécharger. Le volume et la sourdine sont réglables dans les
// paramètres (panneau ouvert avec la touche P ou le bouton du HUD).
//
// Le contexte audio est créé au premier son : les navigateurs interdisent le
// démarrage d'un son avant une action du joueur, et attendre ce moment évite
// un contexte « suspendu » qui ne jouerait rien.

let ctx = null;
let master = null;
let volume = 1; // 0 → 1
let muted = false;

function ensureContext() {
  if (!ctx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
    master = ctx.createGain();
    master.gain.value = muted ? 0 : volume;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {
      /* le prochain vrai clic réessaiera */
    });
  }
  return ctx;
}

export function setVolume(percent) {
  const value = Number(percent);
  volume = Number.isFinite(value) ? Math.min(1, Math.max(0, value / 100)) : 1;
  if (master) master.gain.value = muted ? 0 : volume;
}

export function getVolume() {
  return Math.round(volume * 100);
}

export function setMuted(value) {
  muted = Boolean(value);
  if (master) master.gain.value = muted ? 0 : volume;
}

export function isMuted() {
  return muted;
}

// Un « bip » : fréquence de départ, glissando éventuel, durée et timbre.
function tone({ freq, endFreq = 0, start = 0, duration = 0.1, type = 'square', gain = 0.12 }) {
  if (muted || volume <= 0) return;
  const audio = ensureContext();
  if (!audio) return;

  const at = audio.currentTime + start;
  const osc = audio.createOscillator();
  const envelope = audio.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, at + duration);

  // Enveloppe courte : sans elle, chaque note claque (clics secs).
  envelope.gain.setValueAtTime(0.0001, at);
  envelope.gain.exponentialRampToValueAtTime(gain, at + 0.012);
  envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);

  osc.connect(envelope);
  envelope.connect(master);
  osc.start(at);
  osc.stop(at + duration + 0.03);
}

const SOUNDS = {
  click: () => tone({ freq: 540, duration: 0.055, gain: 0.07 }),
  pickups: () => {
    tone({ freq: 760, duration: 0.07, type: 'triangle', gain: 0.1 });
    tone({ freq: 1140, start: 0.06, duration: 0.09, type: 'triangle', gain: 0.1 });
  },
  rune: () => {
    tone({ freq: 620, duration: 0.09, type: 'sine', gain: 0.11 });
    tone({ freq: 930, start: 0.05, duration: 0.12, type: 'sine', gain: 0.09 });
  },
  enter: () => tone({ freq: 300, endFreq: 460, duration: 0.2, type: 'sine', gain: 0.1 }),
  // Sifflement du coup d'épée : bref, aigu, descendant.
  swing: () => {
    tone({ freq: 900, endFreq: 300, duration: 0.13, type: 'triangle', gain: 0.055 });
    tone({ freq: 1500, endFreq: 700, duration: 0.08, type: 'sine', gain: 0.03 });
  },
  fail: () => tone({ freq: 250, endFreq: 120, duration: 0.3, type: 'sawtooth', gain: 0.08 }),
  // Combat : un coup sec pour frapper, un grondement grave pour être touché.
  hit: () => {
    tone({ freq: 320, endFreq: 150, duration: 0.07, type: 'square', gain: 0.08 });
    tone({ freq: 640, start: 0.02, duration: 0.04, type: 'triangle', gain: 0.05 });
  },
  hurt: () => {
    tone({ freq: 170, endFreq: 80, duration: 0.22, type: 'sawtooth', gain: 0.1 });
  },
  success: () => {
    [523, 659, 784, 1046].forEach((freq, index) => {
      tone({ freq, start: index * 0.09, duration: 0.17, type: 'triangle', gain: 0.1 });
    });
  }
};

// Noms acceptés : click, pickup, rune, enter, swing, fail, success, hit, hurt.
export function playSound(name) {
  if (muted || volume <= 0) return;
  const key = name === 'pickup' ? 'pickups' : name;
  SOUNDS[key]?.();
}

// À appeler depuis un vrai geste (clic, touche) pour débloquer l'audio.
export function unlockAudio() {
  if (muted || volume <= 0) return;
  ensureContext();
}
