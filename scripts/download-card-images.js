/**
 * Descarga imágenes del catálogo oficial a public/card-images/ para servir en web
 * sin pasar por wsrv.nl (mucho más rápido).
 *
 * Uso:
 *   npm run sync:images              # todas las cartas
 *   npm run sync:images -- --limit 50  # solo las primeras 50 (prueba)
 *
 * Requiere: npm run sync:official (official-catalog.json)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CATALOG_FILE = path.join(__dirname, '..', 'assets', 'data', 'official-catalog.json');
const OUT_DIR = path.join(__dirname, '..', 'public', 'card-images');
const MANIFEST_FILE = path.join(__dirname, '..', 'assets', 'data', 'card-image-manifest.json');

const CONCURRENCY = Number(process.env.IMAGE_DL_CONCURRENCY || 10);
const DELAY_MS = Number(process.env.IMAGE_DL_DELAY_MS || 80);
const FORCE = process.argv.includes('--force');

function parseLimit() {
  const idx = process.argv.indexOf('--limit');
  if (idx === -1 || !process.argv[idx + 1]) return null;
  const n = Number(process.argv[idx + 1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function safeFileName(cardId) {
  return cardId.replace(/[^a-zA-Z0-9._-]/g, '_') + '.png';
}

async function downloadOne(card, images) {
  const url = card.images?.large || card.images?.small;
  if (!url) return null;

  const fileName = safeFileName(card.id);
  const filePath = path.join(OUT_DIR, fileName);
  const webPath = `/card-images/${fileName}`;

  if (!FORCE && fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
    images[card.id] = webPath;
    return 'skipped';
  }

  const res = await fetch(url, {
    headers: { 'User-Agent': 'one-piece-collection/1.0' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${card.id}`);

  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 500) throw new Error(`File too small for ${card.id}`);

  fs.writeFileSync(filePath, buf);
  images[card.id] = webPath;
  return 'downloaded';
}

async function runPool(items, worker) {
  let index = 0;
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  async function workerLoop() {
    while (index < items.length) {
      const i = index++;
      const card = items[i];
      try {
        const result = await worker(card);
        if (result === 'downloaded') downloaded += 1;
        else if (result === 'skipped') skipped += 1;
        if (DELAY_MS > 0) await sleep(DELAY_MS);
      } catch (err) {
        failed += 1;
        console.warn(`  ✗ ${card.id}: ${err.message}`);
      }
      if ((i + 1) % 100 === 0 || i + 1 === items.length) {
        process.stdout.write(
          `\r  Progreso: ${i + 1}/${items.length} (↓${downloaded} ⊘${skipped} ✗${failed})`
        );
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => workerLoop()));
  console.log('');
  return { downloaded, skipped, failed };
}

async function main() {
  if (!fs.existsSync(CATALOG_FILE)) {
    console.error('No existe official-catalog.json. Ejecuta: npm run sync:official');
    process.exit(1);
  }

  const catalog = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8'));
  let cards = catalog.cards ?? [];
  const limit = parseLimit();
  if (limit) cards = cards.slice(0, limit);

  fs.mkdirSync(OUT_DIR, { recursive: true });

  let existing = {};
  if (fs.existsSync(MANIFEST_FILE) && !FORCE) {
    try {
      existing = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8')).images ?? {};
    } catch {
      existing = {};
    }
  }

  const images = { ...existing };
  console.log(`Descargando imágenes de ${cards.length} cartas → public/card-images/`);

  const stats = await runPool(cards, (card) => downloadOne(card, images));

  const manifest = {
    source: catalog.source,
    catalogSyncedAt: catalog.syncedAt,
    syncedAt: new Date().toISOString(),
    count: Object.keys(images).length,
    images,
  };

  fs.mkdirSync(path.dirname(MANIFEST_FILE), { recursive: true });
  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 0));

  console.log(
    `Listo: ${stats.downloaded} nuevas, ${stats.skipped} ya existían, ${stats.failed} fallos.`
  );
  console.log(`Manifiesto: assets/data/card-image-manifest.json (${manifest.count} rutas)`);
  console.log('Reinicia npm run web para usar imágenes locales.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
