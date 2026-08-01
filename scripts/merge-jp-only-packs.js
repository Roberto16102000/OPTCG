/**
 * Añade al catálogo colecciones que solo existen en el sitio japonés (p. ej. OP-16).
 * Uso: npm run merge:jp-packs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  applyEnglishNamesToCards,
  buildEnglishNameMap,
} from './enrich-english-names.js';
import {
  BASE_JP,
  JP_ONLY_PACKS,
  createScraper,
  mergeCatalog,
  normalizeJpCard,
} from './official-scraper.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CATALOG_FILE = path.join(__dirname, '..', 'assets', 'data', 'official-catalog.json');
const DELAY_MS = Number(process.env.SYNC_DELAY_MS || 400);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function mergeJpOnlyIntoCatalog(catalogPath = CATALOG_FILE) {
  if (!fs.existsSync(catalogPath)) {
    throw new Error(`No existe el catálogo: ${catalogPath}. Ejecuta npm run sync:official primero.`);
  }

  const data = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const byId = new Map((data.cards || []).map((c) => [c.id, c]));
  const before = byId.size;

  const jp = createScraper(BASE_JP);

  for (let i = 0; i < JP_ONLY_PACKS.length; i++) {
    const pack = JP_ONLY_PACKS[i];
    process.stdout.write(`[JP ${i + 1}/${JP_ONLY_PACKS.length}] ${pack.titleEn}... `);
    const raw = await jp.fetchPackCards(pack.id, pack.titleEn, {
      skipIllustrations: true,
    });
    const cards = raw.map((c) => normalizeJpCard(c, pack));
    mergeCatalog(byId, cards, { replace: true });
    console.log(`${cards.length} cards`);
    if (i < JP_ONLY_PACKS.length - 1) await sleep(DELAY_MS);
  }

  let cards = [...byId.values()].sort((a, b) => a.code.localeCompare(b.code));
  console.log('\nApplying English display names for JP-only sets...');
  const nameMap = await buildEnglishNameMap();
  const renamed = applyEnglishNamesToCards(cards, nameMap);
  console.log(`${renamed} cards renamed to English`);

  const output = {
    ...data,
    jpOnlyMergedAt: new Date().toISOString(),
    count: cards.length,
    cards,
  };

  fs.writeFileSync(catalogPath, JSON.stringify(output));
  const added = byId.size - before;
  console.log(`\nCatalog updated: ${catalogPath}`);
  console.log(`+${added} new cards (total ${cards.length})`);
  return { added, total: cards.length };
}

async function main() {
  await mergeJpOnlyIntoCatalog();
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
