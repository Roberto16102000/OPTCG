/**
 * Descarga el arte de los mazos de inicio (starter decks) a
 * public/booster-images/ y lo añade a assets/data/booster-image-manifest.json,
 * junto al de los sobres.
 *
 * Uso:
 *   npm run sync:decks
 *   npm run sync:decks -- --force
 *
 * Fuente: web oficial de Bandai. Los mazos usan dos formatos según su edad:
 * los medianos exponen `img_thumbnail.png` en una ruta estable, y los recientes
 * una ruta con hash que hay que leer de su página de producto. Los más antiguos
 * (ST01-04, ST15-20, ST23-28) ya no tienen arte individual publicado.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'public', 'booster-images');
const MANIFEST_FILE = path.join(__dirname, '..', 'assets', 'data', 'booster-image-manifest.json');

const ORIGIN = 'https://en.onepiece-cardgame.com';
const FORCE = process.argv.includes('--force');
const UA = { 'User-Agent': 'Mozilla/5.0' };

const DECK_NUMBERS = Array.from({ length: 36 }, (_, i) => String(i + 1).padStart(2, '0'));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Ruta estable de los mazos de edad media. */
async function findStableArt(n) {
  const url = `${ORIGIN}/images/products/decks/st${n}/img_thumbnail.png`;
  const res = await fetch(url, { method: 'HEAD', headers: UA });
  return res.ok ? url : null;
}

/**
 * Último recurso para los mazos que Bandai ya no publica: el catálogo público
 * de una tienda Shopify. Son fotos de producto de terceros, así que la
 * procedencia es más débil que la oficial; se usan solo si no hay alternativa.
 */
/**
 * Mazos que ninguna fuente automática cubre y cuya imagen se fijó a mano.
 * Son fotos de listado de terceros: la procedencia es la más débil de las tres.
 */
const OVERRIDES = {
  ST03: 'https://http2.mlstatic.com/D_NQ_NP_968140-MLU74129180601_012024-O.webp',
  ST04: 'https://http2.mlstatic.com/D_NQ_NP_894776-MPE52699777793_122022-O.webp',
};

const RETAILER = 'https://www.stompinggroundstcg.com';
let retailerIndex = null;

async function loadRetailerIndex() {
  if (retailerIndex) return retailerIndex;
  retailerIndex = {};
  for (let page = 1; page <= 6; page += 1) {
    const res = await fetch(`${RETAILER}/products.json?limit=250&page=${page}`, { headers: UA });
    if (!res.ok) break;
    const { products } = await res.json();
    if (!products?.length) break;
    for (const product of products) {
      // La tienda vende varios juegos y Gundam usa los mismos códigos ST-XX:
      // sin filtrar por proveedor se cuelan sus mazos.
      const isOnePiece =
        product.vendor === 'One Piece Card Game' || product.product_type === 'One Piece';
      if (!isOnePiece) continue;

      const match = `${product.title} ${product.handle}`.toUpperCase().match(/ST-?(\d{2})/);
      const image = product.images?.[0]?.src;
      if (!match || !image) continue;
      const id = `ST${match[1]}`;
      // Muchos mazos existen dos veces: la unidad y el "Display" (caja de 6).
      // Queremos la unidad, así que el display solo vale si no hay otra cosa.
      const isDisplay = /display/i.test(product.title);
      const previous = retailerIndex[id];
      if (previous && !previous.isDisplay) continue;
      if (previous && isDisplay) continue;

      // Shopify sirve variantes: la original ronda 1 MB y solo se usa como
      // miniatura, así que se pide una de 400 px.
      const clean = image.split('?')[0];
      retailerIndex[id] = {
        url: clean.replace(/(\.[a-z]+)$/i, '_400x$1'),
        isDisplay,
      };
    }
  }
  return retailerIndex;
}

async function findRetailerArt(n) {
  const index = await loadRetailerIndex();
  return index[`ST${n}`]?.url ?? null;
}

/** Ruta con hash, leída de la página de producto de los mazos recientes. */
async function findHashedArt(n) {
  for (const page of [`${ORIGIN}/products/st${n}.html`, `${ORIGIN}/products/decks/st${n}.php`]) {
    const res = await fetch(page, { headers: UA });
    if (!res.ok) continue;
    const html = await res.text();
    const match = html.match(/["'](\/onepiececg\/bccard\/[^"']*img_item0?1[^"']*)["']/);
    if (match) return ORIGIN + match[1];
  }
  return null;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const manifest = fs.existsSync(MANIFEST_FILE)
    ? JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'))
    : { images: {} };
  const images = manifest.images ?? {};

  const missing = [];
  let downloaded = 0;
  let bytes = 0;

  for (const n of DECK_NUMBERS) {
    const id = `ST${n}`;
    // Los mazos antiguos son PNG y los recientes webp: la extensión debe
    // coincidir o el servidor estático manda un content-type equivocado.
    const existing = ['png', 'webp']
      .map((ext) => path.join(OUT_DIR, `st${n}.${ext}`))
      .find((candidate) => fs.existsSync(candidate));

    if (!FORCE && existing) {
      images[id] = `/booster-images/${path.basename(existing)}`;
      console.log(`  · ${id} (ya estaba)`);
      continue;
    }

    const url =
      OVERRIDES[id] ??
      (await findStableArt(n)) ??
      (await findHashedArt(n)) ??
      (await findRetailerArt(n));
    if (!url) {
      missing.push(id);
      continue;
    }

    const fileName = `st${n}.${/\.png($|\?)/.test(url) ? 'png' : 'webp'}`;
    const filePath = path.join(OUT_DIR, fileName);

    const res = await fetch(url, { headers: UA });
    if (!res.ok) {
      missing.push(id);
      continue;
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(filePath, buffer);
    images[id] = `/booster-images/${fileName}`;
    downloaded += 1;
    bytes += buffer.length;
    console.log(`  ✓ ${id} (${(buffer.length / 1024).toFixed(0)} kB)`);
    await sleep(150);
  }

  fs.writeFileSync(
    MANIFEST_FILE,
    JSON.stringify({ ...manifest, decksSyncedAt: new Date().toISOString(), images }, null, 2)
  );

  console.log(`\n${downloaded} mazos nuevos · ${(bytes / 1024 / 1024).toFixed(2)} MB`);
  if (missing.length) {
    console.log(`Sin arte publicada en la web oficial (${missing.length}): ${missing.join(' ')}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
