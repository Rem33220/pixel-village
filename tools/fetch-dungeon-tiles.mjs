#!/usr/bin/env node
// Download a fresh copy of the Donjon 5 tilemap JSON (nine tiles × 24 bytes).
// Le fichier public/images/dungeonTiles5.json reste dans le repo, mais le site
// de l'éditeur de tuiles a changé d'adresse ; cette commande le régénère depuis
// l'archive officielle attachée aux sorties de la commande précédente.
//
// Nécessite Node 18+ (fetch livré, aucune dépendance).
//
// Si vous avez déjà récupéré les fichiers, rendez-les exécutables et lancez-les :
//   chmod +x tools/dl-*.sh
//   tools/dl-historic.sh
//   tools/dl-dungeon-tiles.sh
//
// Si l'archive zip est manquante, pas d'impact sur le jeu : le serveur Node.js
// sert les tuiles déjà présentes dans le dossier public/, et le service de
// téléchargement continuera de les proposer.
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Répertoire cible (lien symbolique déjà créé par l'utilisateur pour que la
// sortie de la commande soit lisible par le système de fichiers).
const OUT = process.env.PX_DUNGEON_TILES_DIR || path.join(__dirname, '..', 'public', 'images');
const FILE = path.join(OUT, 'dungeonTiles5.json');

// URL source des tuiles du donjon 5 (public domain, reproductible).
const SRC =
  'https://gist.githubusercontent.com/mozilla/webmaker/tree/master/projects/pixel-art/dungeon/dungeon-5';

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https:') ? https : http;
    const req = mod.get(url, { timeout: 60_000 }, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} pour ${url}`));
      }
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function main() {
  console.log(`Récupération de ${SRC}...`);
  let text;
  try {
    text = await fetchText(SRC);
  } catch (err) {
    console.error('Impossible de récupérer les tuiles:', err.message);
    console.log(
      'Le jeu démarre quand même avec les tuiles déjà présentes sur le disque.'
    );
    return;
  }

  console.log(`Sauvegarde de ${FILE}...`);
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(FILE, text);
  console.log('OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
