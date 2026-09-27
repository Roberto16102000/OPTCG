/**
 * Descarga el arte de los sobres (booster wrappers) a public/booster-images/
 * y genera assets/data/booster-image-manifest.json.
 *
 * Uso:
 *   npm run sync:boosters
 *   npm run sync:boosters -- --force   # vuelve a bajar los que ya existen
 *
 * Nota: el arte es de Bandai. Las páginas de producto oficiales de los sets
 * antiguos ya no existen (404) y las nuevas usan rutas con hash, así que se
 * toma del espejo público de optcgrush.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'public', 'booster-images');
const MANIFEST_FILE = path.join(__dirname, '..', 'assets', 'data', 'booster-image-manifest.json');

const BASE_URL = 'https://optcgrush.com/assets/Boosters';
const FORCE = process.argv.includes('--force');
const DELAY_MS = Number(process.env.IMAGE_DL_DELAY_MS || 150);

/** Ids de sobre en el sitio de origen → prefijo de código del catálogo. */
const PACKS = [
  'op01', 'op02', 'op03', 'op04', 'op05', 'op06', 'op07', 'op08',
  'op09', 'op10', 'op11', 'op12', 'op13', 'op14', 'op15', 'op16', 'op17',
  'eb01', 'eb02', 'eb03',
  'prb01', 'prb02',
  'promo',
];

/**
 * Sobres cuya imagen no sigue el patrón de `/assets/Boosters/`. El de promos no
 * es un booster de Bandai sino el Bonus Pack de los mazos de inicio.
 */
const OVERRIDES = {
  PROMO: 'https://optcgrush.com/assets/STs/Bonus%20pack.png',
  // El espejo de optcgrush aún no tiene el OP-17: se toma de la página oficial
  // del producto, que sí publica el arte del sobre suelto.
  OP17:
    'https://en.onepiece-cardgame.com/products/boosters/op17/images/others/product_pack.webp',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function downloadOne(packId, images) {
  const catalogIdEarly = packId.toUpperCase();
  // La extensión sale de la url real: no todos los overrides son png.
  const override = OVERRIDES[catalogIdEarly];
  const extension = override ? (override.match(/\.(\w+)(?:\?|$)/)?.[1] ?? 'png') : 'webp';
  const fileName = `${packId}.${extension}`;
  const filePath = path.join(OUT_DIR, fileName);
  const webPath = `/booster-images/${fileName}`;
  const catalogId = packId.toUpperCase();

  if (!FORCE && fs.existsSync(filePath)) {
    images[catalogId] = webPath;
    return { status: 'cached', bytes: fs.statSync(filePath).size };
  }

  const url = OVERRIDES[catalogId] ?? `${BASE_URL}/${fileName}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://optcgrush.com/' },
  });
  if (!res.ok) return { status: `http ${res.status}`, bytes: 0 };

  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(filePath, buffer);
  images[catalogId] = webPath;
  return { status: 'ok', bytes: buffer.length };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Fusiona: el manifiesto también guarda los mazos, los perfiles de encuadre
  // y los recortes medidos. Escribirlo entero se los llevaba por delante.
  const manifest = fs.existsSync(MANIFEST_FILE)
    ? JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'))
    : {};
  const images = manifest.images ?? {};
  let total = 0;
  let failed = 0;

  for (const packId of PACKS) {
    const { status, bytes } = await downloadOne(packId, images);
    total += bytes;
    if (status !== 'ok' && status !== 'cached') {
      failed += 1;
      console.warn(`  ✗ ${packId}: ${status}`);
    } else {
      console.log(`  ✓ ${packId} (${(bytes / 1024).toFixed(0)} kB, ${status})`);
    }
    if (status === 'ok') await sleep(DELAY_MS);
  }

  fs.writeFileSync(
    MANIFEST_FILE,
    JSON.stringify(
      { ...manifest, syncedAt: new Date().toISOString(), source: BASE_URL, images },
      null,
      2
    )
  );

  console.log(
    `\n${Object.keys(images).length}/${PACKS.length} sobres · ${(total / 1024 / 1024).toFixed(2)} MB · ${failed} fallos`
  );
  console.log(`Manifiesto: ${path.relative(process.cwd(), MANIFEST_FILE)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
