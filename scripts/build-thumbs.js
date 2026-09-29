/**
 * Genera las miniaturas de carta que se publican con la app.
 *
 * Uso:
 *   npm run build:thumbs
 *   npm run build:thumbs -- --limit=20   solo las primeras, para probar
 *   npm run build:thumbs -- --force      rehace las que ya existan
 *
 * Por qué existe: las rejillas piden 60 imágenes de golpe y hoy salen de un
 * proxy externo. Una copia propia a 240 px pesa ~16 KB en vez de ~314 KB del
 * original, se sirve desde el mismo dominio y no depende de nadie.
 *
 * Solo se generan para las rejillas. La ficha de carta y la apertura de sobres
 * siguen pidiendo la imagen grande: ahí se ve una carta cada vez y la calidad
 * importa más que el peso.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, '..', 'public', 'card-images');
const OUT = path.join(__dirname, '..', 'public', 'card-thumbs');

/**
 * Ancho de la miniatura. La ficha mas grande de una rejilla es la del catalogo,
 * de unos 179 px, y hoy ya se le pide al proxy 286 px (ancho x 1,6). A 300 px
 * la miniatura iguala esa calidad en vez de empeorarla.
 */
const WIDTH = 300;
/**
 * Calidad y esfuerzo del codificador. El esfuerzo 6 solo ahorra un 3 % frente
 * al 4 y multiplica el tiempo por varias veces: con 5.775 imagenes no compensa.
 */
const QUALITY = 60;
const EFFORT = 4;
/** Cuantas se codifican a la vez. `sharp` trabaja fuera del hilo principal. */
const CONCURRENCIA = 8;

const FORCE = process.argv.includes('--force');
const LIMIT = Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] || 0);

async function main() {
  if (!fs.existsSync(SRC)) {
    console.error(`No están las imágenes en ${SRC}. Ejecuta antes: npm run sync:images`);
    process.exit(1);
  }
  fs.mkdirSync(OUT, { recursive: true });

  const archivos = fs.readdirSync(SRC);
  let hechas = 0;
  let saltadas = 0;
  let fallos = 0;
  let bytes = 0;

  const pendientes = (LIMIT ? archivos.slice(0, LIMIT) : archivos).filter((nombre) => {
    if (FORCE) return true;
    const destino = path.join(OUT, `${nombre.replace(/\.[^.]+$/, '')}.webp`);
    if (!fs.existsSync(destino)) return true;
    saltadas += 1;
    bytes += fs.statSync(destino).size;
    return false;
  });

  // En tandas: `sharp` suelta el hilo principal, asi que varias a la vez
  // aprovechan los nucleos y bajan el tiempo total de horas a minutos.
  for (let i = 0; i < pendientes.length; i += CONCURRENCIA) {
    const tanda = pendientes.slice(i, i + CONCURRENCIA);
    await Promise.all(
      tanda.map(async (nombre) => {
        const id = nombre.replace(/\.[^.]+$/, '');
        const destino = path.join(OUT, `${id}.webp`);
        try {
          // `sharp` reconoce el formato por el contenido, que hace falta aqui:
          // 934 de estas imagenes son WebP guardadas con extension `.png`.
          await sharp(path.join(SRC, nombre))
            .resize({ width: WIDTH, withoutEnlargement: true })
            .webp({ quality: QUALITY, effort: EFFORT })
            .toFile(destino);
          hechas += 1;
          bytes += fs.statSync(destino).size;
        } catch (err) {
          fallos += 1;
          if (fallos <= 5) process.stderr.write(`  ${id}: ${err.message}
`);
        }
      })
    );
    if ((i + CONCURRENCIA) % 500 < CONCURRENCIA) {
      process.stderr.write(`  ${Math.min(i + CONCURRENCIA, pendientes.length)}/${pendientes.length}
`);
    }
  }

  const mb = (v) => (v / 1024 / 1024).toFixed(1);
  console.log(`miniaturas: ${hechas} nuevas, ${saltadas} ya estaban, ${fallos} fallos`);
  console.log(`peso total: ${mb(bytes)} MB  (${(bytes / Math.max(1, hechas + saltadas) / 1024).toFixed(1)} KB de media)`);
}

main();
