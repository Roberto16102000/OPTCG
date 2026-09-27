/**
 * Pone fondo blanco a las imágenes de producto que llegaron como foto de
 * tienda sobre un cartón beige, en vez del arte recortado que traen las demás.
 *
 * Uso:
 *   node scripts/whiten-deck-art.js --dry
 *   node scripts/whiten-deck-art.js
 *
 * El color no se sustituye a lo bruto por todo el archivo: se rellena por
 * inundación desde el borde, así solo cae el fondo conectado y no un tono
 * parecido que esté dentro del arte del mazo.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PNG } from 'pngjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(__dirname, '..', 'public', 'booster-images');

const DRY_RUN = process.argv.includes('--dry');
/** Margen por canal para dar por bueno un píxel de fondo. */
const TOLERANCIA = 26;
/** Hasta dónde se difumina el borde entre fondo y arte. */
const HALO = 70;

function dist(data, i, c) {
  return Math.max(
    Math.abs(data[i] - c[0]),
    Math.abs(data[i + 1] - c[1]),
    Math.abs(data[i + 2] - c[2])
  );
}

/** Color de fondo a partir de las cuatro esquinas, si coinciden. */
function seedColor(png) {
  const at = (x, y) => {
    const i = (png.width * y + x) << 2;
    return [png.data[i], png.data[i + 1], png.data[i + 2], png.data[i + 3]];
  };
  const esquinas = [at(1, 1), at(png.width - 2, 1), at(1, png.height - 2), at(png.width - 2, png.height - 2)];
  if (esquinas.some((c) => c[3] < 250)) return null;
  const [a] = esquinas;
  const iguales = esquinas.every(
    (c) => Math.abs(c[0] - a[0]) < 10 && Math.abs(c[1] - a[1]) < 10 && Math.abs(c[2] - a[2]) < 10
  );
  if (!iguales) return null;
  // Un fondo ya blanco no hay que tocarlo.
  if (a[0] > 245 && a[1] > 245 && a[2] > 245) return null;
  return a;
}

function whiten(png, seed) {
  const { width, height, data } = png;
  const relleno = new Uint8Array(width * height);
  const cola = [];

  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const p = y * width + x;
    if (relleno[p]) return;
    if (dist(data, p << 2, seed) > TOLERANCIA) return;
    relleno[p] = 1;
    cola.push(p);
  };

  for (let x = 0; x < width; x += 1) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    push(0, y);
    push(width - 1, y);
  }

  while (cola.length) {
    const p = cola.pop();
    const x = p % width;
    const y = (p / width) | 0;
    push(x - 1, y);
    push(x + 1, y);
    push(x, y - 1);
    push(x, y + 1);
  }

  let pintados = 0;
  for (let p = 0; p < relleno.length; p += 1) {
    if (!relleno[p]) continue;
    const i = p << 2;
    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
    data[i + 3] = 255;
    pintados += 1;
  }

  // El recorte deja un anillo de píxeles a medio camino entre el beige y el
  // arte. Se aclaran en proporción a lo cerca que estaban del fondo, que si no
  // queda un contorno sucio alrededor del mazo.
  let suavizados = 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const p = y * width + x;
      if (relleno[p]) continue;
      const vecino =
        relleno[p - 1] || relleno[p + 1] || relleno[p - width] || relleno[p + width];
      if (!vecino) continue;
      const i = p << 2;
      const d = dist(data, i, seed);
      if (d > HALO) continue;
      const k = 1 - d / HALO;
      data[i] += (255 - data[i]) * k;
      data[i + 1] += (255 - data[i + 1]) * k;
      data[i + 2] += (255 - data[i + 2]) * k;
      suavizados += 1;
    }
  }

  return { pintados, suavizados, total: width * height };
}

/**
 * PNG de verdad, mirando la cabecera y no la extension: en esta carpeta hay 14
 * archivos guardados como `.webp` que en realidad son PNG, y filtrando por
 * nombre se quedaban fuera.
 */
function isPng(ruta) {
  const fd = fs.openSync(ruta, 'r');
  const buf = Buffer.alloc(8);
  fs.readSync(fd, buf, 0, 8, 0);
  fs.closeSync(fd);
  return buf.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
}

function main() {
  const files = fs
    .readdirSync(DIR)
    .filter((f) => isPng(path.join(DIR, f)));
  let tocados = 0;

  for (const file of files) {
    const ruta = path.join(DIR, file);
    const png = PNG.sync.read(fs.readFileSync(ruta));
    const seed = seedColor(png);
    if (!seed) {
      console.log(`  ${file.padEnd(12)} se deja (transparente, blanco o esquinas distintas)`);
      continue;
    }

    const { pintados, suavizados, total } = whiten(png, seed);
    const pct = ((100 * pintados) / total).toFixed(1);
    console.log(
      `  ${file.padEnd(12)} fondo ${JSON.stringify(seed.slice(0, 3))} -> blanco` +
        ` · ${pct}% del lienzo, ${suavizados} px de borde suavizados`
    );
    tocados += 1;

    if (!DRY_RUN) fs.writeFileSync(ruta, PNG.sync.write(png));
  }

  console.log(`\nimágenes con fondo cambiado: ${tocados} de ${files.length}`);
  if (DRY_RUN) console.log('--dry: no se ha escrito nada');
}

main();
