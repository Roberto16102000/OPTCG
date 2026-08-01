/**
 * Descarga el catálogo desde el sitio oficial (más actualizado que API TCG).
 * Uso: npm run sync:official
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  fetchPackCards,
  fetchPackIds,
  mergeCatalog,
} from './official-scraper.js';
import { mergeJpOnlyIntoCatalog } from './merge-jp-only-packs.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'assets', 'data');
const OUT_FILE = path.join(OUT_DIR, 'official-catalog.json');

const DELAY_MS = Number(process.env.SYNC_DELAY_MS || 400);
const ONLY_PACK = process.env.SYNC_PACK || '';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log('Obteniendo lista de colecciones del sitio oficial...');
  let packs = await fetchPackIds();
  if (ONLY_PACK) {
    packs = packs.filter((p) => p.id === ONLY_PACK);
    if (!packs.length) throw new Error(`Pack no encontrado: ${ONLY_PACK}`);
  }

  console.log(`Colecciones a descargar: ${packs.length}`);
  const byId = new Map();
  let i = 0;

  for (const pack of packs) {
    i += 1;
    process.stdout.write(`[${i}/${packs.length}] ${pack.title.slice(0, 50)}... `);
    try {
      const cards = await fetchPackCards(pack.id, pack.title);
      mergeCatalog(byId, cards);
      console.log(`${cards.length} cartas (total único: ${byId.size})`);
    } catch (e) {
      console.log(`ERROR: ${e.message}`);
    }
    if (i < packs.length) await sleep(DELAY_MS);
  }

  const cards = [...byId.values()].sort((a, b) => a.code.localeCompare(b.code));
  const output = {
    source: 'https://en.onepiece-cardgame.com/cardlist/',
    syncedAt: new Date().toISOString(),
    packCount: packs.length,
    count: cards.length,
    cards,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(output));
  console.log(`\nGuardado: ${OUT_FILE}`);
  console.log(`Total: ${cards.length} cartas únicas`);

  console.log('\nMerging JP-only sets (if any)...');
  await mergeJpOnlyIntoCatalog(OUT_FILE);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
