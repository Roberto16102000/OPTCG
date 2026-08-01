/**
 * Añade illustrationType al catálogo existente sin re-scrapear todo.
 * Uso: npm run enrich:illustrations
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  fetchPackIds,
  fetchPackIllustrationMap,
} from './official-scraper.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CATALOG = path.join(__dirname, '..', 'assets', 'data', 'official-catalog.json');

function setCode(name) {
  const m = name?.match(/\[([^\]]+)\]\s*$/);
  return m ? m[1].trim() : null;
}

const catalog = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));
const packs = await fetchPackIds();
console.log('Packs:', packs.length);

let updated = 0;
for (let i = 0; i < packs.length; i++) {
  const pack = packs[i];
  process.stdout.write(`[${i + 1}/${packs.length}] ${pack.id}... `);
  const illMap = await fetchPackIllustrationMap(pack.id);
  const packCode = setCode(pack.title);
  let n = 0;
  for (const card of catalog.cards) {
    const cardCode = setCode(card.set?.name);
    if (cardCode && packCode && cardCode === packCode && illMap.has(card.id)) {
      card.illustrationType = illMap.get(card.id);
      n++;
      updated++;
    }
  }
  console.log(`etiquetadas ${n}`);
}

catalog.syncedAt = new Date().toISOString();
fs.writeFileSync(CATALOG, JSON.stringify(catalog));
console.log(`\nListo. ${updated} cartas con illustrationType.`);
