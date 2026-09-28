/**
 * Mide el marco claro que Bandai deja alrededor de la carta en sus escaneos y
 * guarda cuánto recortar por cada lado.
 *
 * Uso:
 *   node scripts/measure-card-trim.js --dry
 *   node scripts/measure-card-trim.js
 *
 * No se recorta una cantidad fija porque el marco no es igual en todas: va de
 * 8 a 17 px sobre un lienzo de 600x838, y varias cartas no lo traen. Un valor
 * unico se comeria contenido en las que menos marco tienen.
 *
 * Solo mide PNG. Las imagenes de dotgg, Limitless y TCGplayer son WebP y vienen
 * a sangre, asi que no llevan entrada y no se recortan.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PNG } from 'pngjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMG_DIR = path.join(__dirname, '..', 'public', 'card-images');
const OUT_FILE = path.join(__dirname, '..', 'assets', 'data', 'card-trim-manifest.json');

const DRY_RUN = process.argv.includes('--dry');
const LIMIT = Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] || 0);

/** Color del marco: claro y casi sin saturacion. */
function esMarco(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return min > 205 && max - min < 26;
}

/**
 * Una linea cuenta como marco si mas de la mitad lo es.
 *
 * Exigir casi el 100 % no funciona: la insignia de rareza y el icono de la
 * esquina sobresalen hacia el margen, asi que la primera columna con un trozo
 * de insignia rompia la cuenta y el recorte se quedaba a medias. Midiendo por
 * mayoria sale ~22-25 px en todas las que traen marco, y sigue dando cero en
 * las que vienen a sangre.
 */
const UMBRAL = 0.5;
/** Tope de seguridad: mas de esto no es marco, es la carta. */
const MAX_FRAC = 0.05;

function medir(png) {
  const { width, height, data } = png;
  const en = (x, y) => {
    const i = (width * y + x) << 2;
    return data[i + 3] < 8 || esMarco(data[i], data[i + 1], data[i + 2]);
  };
  const columna = (x) => {
    let n = 0;
    for (let y = 0; y < height; y += 1) if (en(x, y)) n += 1;
    return n / height >= UMBRAL;
  };
  const fila = (y) => {
    let n = 0;
    for (let x = 0; x < width; x += 1) if (en(x, y)) n += 1;
    return n / width >= UMBRAL;
  };

  const topeX = Math.floor(width * MAX_FRAC);
  const topeY = Math.floor(height * MAX_FRAC);
  let l = 0;
  while (l < topeX && columna(l)) l += 1;
  let r = 0;
  while (r < topeX && columna(width - 1 - r)) r += 1;
  let t = 0;
  while (t < topeY && fila(t)) t += 1;
  let b = 0;
  while (b < topeY && fila(height - 1 - b)) b += 1;

  return { l, r, t, b, width, height };
}

function main() {
  const archivos = fs.readdirSync(IMG_DIR);
  const recortes = {};
  let conMarco = 0;
  let sinMarco = 0;
  let noPng = 0;
  let dudosas = 0;
  let i = 0;

  for (const nombre of archivos) {
    if (LIMIT && i >= LIMIT) break;
    const ruta = path.join(IMG_DIR, nombre);
    const buf = fs.readFileSync(ruta);
    if (buf.readUInt32BE(0) !== 0x89504e47) {
      noPng += 1;
      continue;
    }
    i += 1;
    let png;
    try {
      png = PNG.sync.read(buf);
    } catch {
      continue;
    }
    const m = medir(png);
    const id = nombre.replace(/\.png$/i, '');
    // Si algun lado llega al tope, la medida no encontro el borde de la carta
    // y recortar por ella se comeria contenido: mejor dejarla sin recorte.
    const topeX = Math.floor(m.width * MAX_FRAC);
    const topeY = Math.floor(m.height * MAX_FRAC);
    if (m.l >= topeX || m.r >= topeX || m.t >= topeY || m.b >= topeY) {
      dudosas += 1;
      continue;
    }
    if (m.l + m.r + m.t + m.b === 0) {
      sinMarco += 1;
    } else {
      conMarco += 1;
      // En fracciones: el tamaño en pantalla cambia con la pantalla.
      recortes[id] = {
        l: +(m.l / m.width).toFixed(5),
        r: +(m.r / m.width).toFixed(5),
        t: +(m.t / m.height).toFixed(5),
        b: +(m.b / m.height).toFixed(5),
      };
    }
    if (i % 500 === 0) process.stderr.write(`  ${i} medidas\n`);
  }

  console.log(`PNG medidos: ${i}  (WebP sin medir: ${noPng})`);
  console.log(`  con marco: ${conMarco}`);
  console.log(`  sin marco: ${sinMarco}`);
  if (dudosas) console.log(`  descartadas por medida dudosa: ${dudosas}`);

  const anchos = Object.values(recortes).map((c) => c.l);
  if (anchos.length) {
    anchos.sort((a, b2) => a - b2);
    const pct = (v) => `${(v * 100).toFixed(2)}%`;
    console.log(
      `  marco izquierdo  min ${pct(anchos[0])}  mediana ${pct(anchos[anchos.length >> 1])}  max ${pct(anchos.at(-1))}`
    );
  }

  if (DRY_RUN) {
    console.log('');
    console.log('--dry: no se ha escrito nada');
    return;
  }
  fs.writeFileSync(
    OUT_FILE,
    JSON.stringify({ measuredAt: new Date().toISOString(), count: conMarco, crops: recortes })
  );
  console.log('');
  console.log(`Guardado: ${OUT_FILE}`);
}

main();
