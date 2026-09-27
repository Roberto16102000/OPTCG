/**
 * Añade al catálogo las impresiones que no publican ni la cardlist oficial de
 * Bandai ni onepiece.gg, tomándolas de onepiece.limitlesstcg.com.
 *
 * Uso:
 *   npm run merge:limitless
 *   npm run merge:limitless -- --dry     solo informa, no escribe
 *   npm run merge:limitless -- --limit=5 corta tras N impresiones (pruebas)
 *
 * Contexto: son todas artes alternativos de cartas que ya tenemos -ninguna
 * carta base falta-. Unas rellenan huecos de nuestra numeración (teníamos
 * `OP01-077` con _p1, _p3, _p4 y _p5 pero no _p2) y otras van al final de la
 * serie. Limitless es un tercero re-hospedando arte de Bandai, igual que
 * dotgg: procedencia más débil, y por eso solo se usa donde no hay original.
 *
 * Una variante comparte todos los datos de juego con su carta base y solo
 * cambia el arte, así que se clona la base y se le pone su propio id, su
 * imagen y el set donde se imprimió. El set importa: si heredara el de la
 * base, un premio de torneo contaría como carta del booster y falsearía el
 * progreso de la colección.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CATALOG_FILE = path.join(__dirname, '..', 'assets', 'data', 'official-catalog.json');

const BASE = 'https://onepiece.limitlesstcg.com';
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; one-piece-collection/1.0)' };
const DELAY_MS = Number(process.env.LIMITLESS_DELAY_MS || 350);

const DRY_RUN = process.argv.includes('--dry');
const LIMIT = Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] || 0);

/** Prefijos de código con los que se recorre el buscador. */
const PREFIXES = [
  ...Array.from({ length: 17 }, (_, i) => `OP${String(i + 1).padStart(2, '0')}`),
  ...Array.from({ length: 36 }, (_, i) => `ST${String(i + 1).padStart(2, '0')}`),
  'EB01', 'EB02', 'EB03', 'EB04',
  'PRB01', 'PRB02',
  'P-',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getHtml(url) {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${url}`);
  return res.text();
}

function decodeEntities(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'");
}

/**
 * Cada fila del listado trae la imagen en `data-hover` -cuyo nombre lleva el id
 * exacto de la impresión- y el enlace a su versión. Es la única forma de saber
 * qué `?v=N` corresponde a qué `_pN`.
 */
function parseRows(html) {
  const out = [];
  const re = /<tr[^>]*data-hover="([^"]+)"[\s\S]*?href="(\/cards\/[^"]+)"/g;
  let m;
  while ((m = re.exec(html))) {
    const imageUrl = decodeEntities(m[1]);
    const file = imageUrl.split('/').pop()?.replace(/\.webp$/i, '') ?? '';
    const parsed = file.match(/^(.+?)_(EN|JP)$/);
    out.push({
      id: parsed ? parsed[1] : file,
      lang: parsed ? parsed[2] : '??',
      imageUrl,
      href: decodeEntities(m[2]),
    });
  }
  return out;
}

/** Todas las impresiones que Limitless conoce, por id. */
async function fetchAllPrints() {
  const prints = new Map();
  for (const prefix of PREFIXES) {
    let page = 1;
    let seen = 0;
    for (;;) {
      const url = `${BASE}/cards?q=${encodeURIComponent(prefix)}&unique=prints&display=list&page=${page}`;
      const rows = parseRows(await getHtml(url));
      if (!rows.length) break;
      for (const row of rows) if (!prints.has(row.id)) prints.set(row.id, row);
      seen += rows.length;
      if (rows.length < 50) break;
      page += 1;
      await sleep(DELAY_MS);
    }
    process.stderr.write(`  ${prefix}: ${seen} impresiones (acumulado ${prints.size})\n`);
    await sleep(DELAY_MS);
  }
  return prints;
}

/** Nombre del set donde salió esa impresión, leído de su propia ficha. */
async function fetchPrintSet(href) {
  const html = await getHtml(`${BASE}${href}`);
  const block = html.match(/<div class="card-prints-current">([\s\S]*?)<\/div>\s*<\/a>/);
  if (!block) return null;
  const spans = [...block[1].matchAll(/<span[^>]*>([\s\S]*?)<\/span>/g)].map((m) =>
    decodeEntities(m[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim())
  );
  const name = spans[0] || null;
  const kind = spans[1] || null;
  return name ? { name, kind } : null;
}

/**
 * Limitless escribe el codigo entre parentesis -`500 Years in the Future
 * (OP07)`- y nuestro catalogo lo espera entre corchetes y con guion,
 * `[OP-07]`. Sin traducirlo `getSetCodeFromName` no ve codigo y la carta
 * acabaria en `Promotion card` en vez de en su coleccion, falseando el
 * progreso del set.
 *
 * Los nombres sin codigo -packs de campeonato, Premium Card Collection- se
 * dejan tal cual: esos si son promos y ahi es donde deben ir.
 */
function normalizeSetName(raw) {
  const m = raw.match(/^(.*?)\s*\((OP|ST|EB|PRB|GC)(\d+)\)\s*$/i);
  if (!m) return raw;
  return `${m[1].trim()} [${m[2].toUpperCase()}-${m[3].padStart(2, '0')}]`;
}

function buildCard(base, print, setName) {
  return {
    ...base,
    id: print.id,
    images: { small: print.imageUrl, large: print.imageUrl },
    set: { name: setName },
    // Procedencia y papel: no viene del sitio oficial ni de dotgg, y son
    // tiradas premium -coleccion premium, premio de torneo, pack de evento-,
    // que es como las reparte el simulador de sobres.
    notes: ['source:limitless', 'premium'],
  };
}

async function main() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8'));
  const existing = new Set(catalog.cards.map((card) => card.id));
  const byId = new Map(catalog.cards.map((card) => [card.id, card]));

  console.log('Recorriendo onepiece.limitlesstcg.com...');
  const prints = await fetchAllPrints();

  const missing = [...prints.values()].filter((p) => !existing.has(p.id));
  console.log(`\nimpresiones en Limitless: ${prints.size}`);
  console.log(`catálogo actual: ${catalog.cards.length}`);
  console.log(`no las tenemos: ${missing.length}`);

  const added = [];
  const sinBase = [];
  const sinSet = [];
  const objetivo = LIMIT ? missing.slice(0, LIMIT) : missing;

  for (const [i, print] of objetivo.entries()) {
    const baseId = print.id.split('_')[0];
    const base = byId.get(baseId);
    // Sin carta base no hay datos de juego que clonar: se informa y se deja.
    if (!base) {
      sinBase.push(print.id);
      continue;
    }
    let info = null;
    try {
      info = await fetchPrintSet(print.href);
    } catch (err) {
      process.stderr.write(`  ${print.id}: ${err.message}\n`);
    }
    if (!info) {
      sinSet.push(print.id);
      continue;
    }
    const setName = normalizeSetName(info.name);
    added.push(buildCard(base, print, setName));
    process.stderr.write(
      `  [${i + 1}/${objetivo.length}] ${print.id} (${print.lang}) -> ${setName}\n`
    );
    await sleep(DELAY_MS);
  }

  console.log(`\na añadir: ${added.length}`);
  if (sinBase.length) console.log(`  sin carta base, omitidas: ${sinBase.length} (${sinBase.slice(0, 5).join(', ')})`);
  if (sinSet.length) console.log(`  sin set legible, omitidas: ${sinSet.length} (${sinSet.slice(0, 5).join(', ')})`);

  const porSet = {};
  for (const card of added) porSet[card.set.name] = (porSet[card.set.name] ?? 0) + 1;
  for (const [name, n] of Object.entries(porSet).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    console.log(`  ${n.toString().padStart(4)}  ${name}`);
  }

  if (DRY_RUN) {
    console.log('\n--dry: no se ha escrito nada');
    return;
  }

  catalog.cards = [...catalog.cards, ...added];
  catalog.count = catalog.cards.length;
  catalog.limitlessMergedAt = new Date().toISOString();
  fs.writeFileSync(CATALOG_FILE, JSON.stringify(catalog, null, 0));
  console.log(`\ncatálogo nuevo: ${catalog.cards.length} cartas`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
