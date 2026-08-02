/**
 * Añade al catálogo las cartas que la web oficial inglesa no publica, tomándolas
 * del conjunto abierto de onepiece.gg (api.dotgg.gg).
 *
 * Uso:
 *   npm run merge:dotgg
 *   npm run merge:dotgg -- --with-don   # incluye también las cartas DON!!
 *   npm run merge:dotgg -- --dry        # solo informa, no escribe
 *
 * Contexto: Bandai deja fuera de su cardlist EN unas 660 cartas —promos de
 * evento, exclusivos de producto e ilustraciones alternativas—, y tampoco sirve
 * sus imágenes (404). Para esas se usa el CDN de dotgg, que es un tercero
 * re-hospedando arte de Bandai: procedencia más débil, igual que las fotos de
 * tienda de ST-03 y ST-04, y por eso solo se usa donde no hay alternativa.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CATALOG_FILE = path.join(__dirname, '..', 'assets', 'data', 'official-catalog.json');

const API = 'https://api.dotgg.gg/cgfw/getcards?game=onepiece&mode=indexed';
const IMAGE_BASE = 'https://static.dotgg.gg/onepiece/card';

const WITH_DON = process.argv.includes('--with-don');
const DRY_RUN = process.argv.includes('--dry');

/** Los campos del catálogo oficial llevan prefijo: `7` → `Cost7`. */
function withPrefix(prefix, value) {
  if (value === null || value === undefined || value === '') return `${prefix}-`;
  return `${prefix}${value}`;
}

function toOnePieceCard(row, index) {
  const get = (name) => row[index[name]] ?? null;
  const id = String(get('id'));
  const image = `${IMAGE_BASE}/${id}.webp`;

  return {
    id,
    code: String(get('id_normal') ?? id),
    rarity: get('rarity') ?? '',
    type: get('cardType') ?? '',
    name: get('name') ?? '',
    images: { small: image, large: image },
    cost: withPrefix('Cost', get('Cost')),
    power: withPrefix('Power', get('Power')),
    counter: withPrefix('Counter', get('Counter')),
    color: get('Color') ?? '',
    family: get('Type') ?? undefined,
    ability: get('Effect') ?? undefined,
    trigger: get('Trigger') ?? undefined,
    set: { name: get('CardSets') ?? get('set') ?? 'Other Product Card' },
    // Marca la procedencia: estas no vienen del sitio oficial.
    notes: ['source:dotgg'],
  };
}

async function main() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8'));
  const existing = new Set(catalog.cards.map((card) => card.id));

  const res = await fetch(API, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`API dotgg: HTTP ${res.status}`);
  const payload = await res.json();

  const index = Object.fromEntries(payload.names.map((name, i) => [name, i]));
  const isDon = (row) => String(row[index.id]).startsWith('DON');

  let skippedDon = 0;
  const added = [];

  for (const row of payload.data) {
    const id = String(row[index.id]);
    if (existing.has(id)) continue;
    if (!WITH_DON && isDon(row)) {
      skippedDon += 1;
      continue;
    }
    added.push(toOnePieceCard(row, index));
  }

  const byPrefix = {};
  for (const card of added) {
    const prefix = card.id.split('-')[0];
    byPrefix[prefix] = (byPrefix[prefix] ?? 0) + 1;
  }

  console.log(`catálogo actual: ${catalog.cards.length}`);
  console.log(`dotgg: ${payload.data.length}`);
  console.log(`a añadir: ${added.length}${WITH_DON ? '' : `  (DON!! omitidas: ${skippedDon})`}`);
  console.log(
    '  ' +
      Object.entries(byPrefix)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([k, v]) => `${k}:${v}`)
        .join('  ')
  );

  if (DRY_RUN) {
    console.log('\n--dry: no se ha escrito nada');
    return;
  }

  catalog.cards = [...catalog.cards, ...added];
  catalog.count = catalog.cards.length;
  catalog.dotggMergedAt = new Date().toISOString();
  fs.writeFileSync(CATALOG_FILE, JSON.stringify(catalog, null, 0));

  console.log(`\ncatálogo nuevo: ${catalog.cards.length} cartas`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
