/**
 * Añade al catálogo las cartas que TCGplayer lista y no tenemos en ninguna otra
 * fuente: en la práctica, las expansiones en preventa que Bandai aún no publica
 * en su cardlist.
 *
 * Uso:
 *   npm run merge:tcgplayer -- --dry
 *   npm run merge:tcgplayer
 *
 * Solo se añaden códigos que no tenemos en absoluto. TCGplayer publica como
 * producto aparte cada estampado -Pre-Release, Release, premios de torneo- de
 * una carta que ya existe, porque tienen precio distinto: son unas 1.500 y no
 * son arte nuevo, así que quedan fuera por construcción.
 *
 * Estas cartas llegan SIN IMAGEN: el CDN devuelve 403 mientras el set está en
 * preventa. Van marcadas con `presale` para poder distinguirlas y quitarlas,
 * y la propia ficha de TCGplayer avisa de que nombre y rareza pueden cambiar
 * hasta la fecha de salida.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CATALOG_FILE = path.join(__dirname, '..', 'assets', 'data', 'official-catalog.json');

const API = 'https://mp-search-api.tcgplayer.com/v1/search/request?q=&isList=false';
const UA = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  'Content-Type': 'application/json',
};
/** La API rechaza páginas mayores. */
const SIZE = 50;
const DELAY_MS = Number(process.env.TCG_DELAY_MS || 250);

const DRY_RUN = process.argv.includes('--dry');

/** Forma de un código de carta: `OP18-022`, `EB05-036`, `P-110`. */
const CODE_RE = /^[A-Z]{1,4}\d{0,2}-\d{1,4}$/;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function cuerpo(from) {
  return {
    algorithm: 'sales_dismax',
    from,
    size: SIZE,
    filters: { term: { productLineName: ['one-piece-card-game'] }, range: {}, match: {} },
    listingSearch: { filters: { term: {}, range: {}, exclude: {} } },
    context: { cart: {}, shippingCountry: 'US' },
    settings: { useFuzzySearch: true, didYouMean: {} },
    sort: {},
  };
}

async function fetchProducts() {
  const porId = new Map();
  let total = null;

  for (let from = 0; total === null || from < total; from += SIZE) {
    let datos = null;
    for (let intento = 0; intento < 3 && !datos; intento += 1) {
      const res = await fetch(API, { method: 'POST', headers: UA, body: JSON.stringify(cuerpo(from)) });
      if (res.ok) datos = await res.json();
      else {
        process.stderr.write(`  from=${from}: HTTP ${res.status}, reintento\n`);
        await sleep(1500);
      }
    }
    if (!datos) break;

    const res = datos.results?.[0];
    if (total === null) {
      total = res?.totalResults ?? 0;
      process.stderr.write(`  productos declarados: ${total}\n`);
    }
    if (!res?.results?.length) break;
    for (const p of res.results) porId.set(p.productId, p);
    if (from % 1000 === 0) process.stderr.write(`  ${porId.size}/${total}\n`);
    await sleep(DELAY_MS);
  }

  return [...porId.values()];
}

function limpiarHtml(value) {
  if (!value) return undefined;
  return String(value)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim() || undefined;
}

/** `OP18` → `OP-18`; los códigos dobles y los sueltos se dejan igual. */
function formatSetCode(raw) {
  if (!raw) return null;
  const m = String(raw).toUpperCase().match(/^([A-Z]+)(\d+)$/);
  return m ? `${m[1]}-${m[2].padStart(2, '0')}` : String(raw).toUpperCase();
}

function toOnePieceCard(p) {
  const a = p.customAttributes ?? {};
  const codigo = String(a.number).toUpperCase();
  const setCode = formatSetCode(p.setCode);
  const setName = p.setName ? `${p.setName}${setCode ? ` [${setCode}]` : ''}` : undefined;

  return {
    id: codigo,
    code: codigo,
    rarity: a.rarityDbName || p.rarityName || '',
    type: Array.isArray(a.cardType) ? a.cardType[0] ?? '' : a.cardType ?? '',
    name: p.productName ?? '',
    // Sin arte publicado: la app cae al marcador en vez de romperse.
    images: { small: '', large: '' },
    cost: a.cost != null ? `Cost${a.cost}` : 'Cost-',
    power: a.power != null ? `Power${a.power}` : 'Power-',
    counter: a.counter != null ? `Counter${a.counter}` : 'Counter-',
    color: Array.isArray(a.color) ? a.color.join('/') : a.color ?? '',
    family: Array.isArray(a.subtypes) ? a.subtypes.join('/') || undefined : undefined,
    ability: limpiarHtml(a.description),
    set: setName ? { name: setName } : undefined,
    // Procedencia y estado: preventa, sin imagen y con datos provisionales.
    notes: ['source:tcgplayer', 'presale'],
  };
}

async function main() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8'));
  const codigos = new Set(catalog.cards.map((c) => String(c.code || c.id).toUpperCase()));

  console.log('Recorriendo el catálogo de One Piece en TCGplayer...');
  const productos = await fetchProducts();
  console.log(`\nproductos recogidos: ${productos.length}`);

  const conCodigo = productos.filter((p) => {
    const n = p.customAttributes?.number;
    return n && CODE_RE.test(String(n).toUpperCase());
  });
  console.log(`con código de carta: ${conCodigo.length}`);

  // Un mismo código aparece varias veces -estampados de Pre-Release, Release y
  // premios-; se conserva el primero, que es la impresión del set.
  const nuevas = new Map();
  for (const p of conCodigo) {
    const codigo = String(p.customAttributes.number).toUpperCase();
    if (codigos.has(codigo) || nuevas.has(codigo)) continue;
    nuevas.set(codigo, toOnePieceCard(p));
  }

  const added = [...nuevas.values()];
  console.log(`catálogo actual: ${catalog.cards.length}`);
  console.log(`a añadir: ${added.length}`);

  const porSet = {};
  for (const c of added) porSet[c.set?.name ?? '—'] = (porSet[c.set?.name ?? '—'] ?? 0) + 1;
  for (const [nombre, n] of Object.entries(porSet).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(4)}  ${nombre}`);
  }

  if (DRY_RUN) {
    console.log('\n--dry: no se ha escrito nada');
    return;
  }
  if (!added.length) {
    console.log('\nNada que añadir.');
    return;
  }

  catalog.cards = [...catalog.cards, ...added];
  catalog.count = catalog.cards.length;
  catalog.tcgplayerMergedAt = new Date().toISOString();
  fs.writeFileSync(CATALOG_FILE, JSON.stringify(catalog, null, 0));
  console.log(`\ncatálogo nuevo: ${catalog.cards.length} cartas`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
