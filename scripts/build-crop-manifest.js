/**
 * Calcula el recorte de las cartas que traen relleno dentro del archivo.
 *
 * Uso:
 *   npm run build:crops
 *   npm run build:crops -- --umbral=0.5   baja el minimo para recortar
 *
 * Por que existe: el catalogo junta imagenes de cuatro sitios y no todas vienen
 * encuadradas igual. Unas 650 traen un borde transparente o blanco alrededor de
 * la carta, asi que al pintarlas en su hueco la carta se queda corta y aparece
 * el marco que se ve mal. Cuatro de ellas ademas estan descentradas: 4,7 % por
 * la izquierda y 0 % por la derecha.
 *
 * El recorte se guarda una vez aqui y lo usan los dos caminos por los que se
 * pinta una carta, para que no se muevan entre si:
 *   - `build-thumbs.js`, al generar la miniatura;
 *   - `resolveCardImageUrl`, que se lo pide al proxy con `cx/cy/cw/ch`.
 *
 * Lo que se quita son SOLO filas y columnas enteras uniformes y claras. El
 * marco blanco impreso de la propia carta no lo es -lleva la ilustracion
 * pegada- y por eso sobrevive; comprobado ampliando las esquinas de las peores.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, '..', 'public', 'card-images');
const OUT = path.join(__dirname, '..', 'assets', 'data', 'card-crop-manifest.json');

/** Ancho al que se mide el primer barrido. Rapido y suficiente para descartar. */
const ANCHO_SONDEO = 150;
/** Por debajo de este porcentaje del lado no se ve, y recortar solo da ruido. */
const UMBRAL = Number(process.argv.find((a) => a.startsWith('--umbral='))?.split('=')[1] || 1) / 100;
const CONCURRENCIA = 16;

/**
 * Un pixel cuenta como «fondo» si es transparente o casi blanco.
 *
 * El limite de 238 es deliberado: con 250 se colaba el ruido del borde y con
 * 220 empezaba a comerse el marco claro de algunas cartas.
 */
function esFondo(p) {
  return p[3] < 24 || (p[0] > 238 && p[1] > 238 && p[2] > 238);
}

/**
 * Cuanto se puede recortar como mucho. Red de seguridad por si una carta con
 * la ilustracion casi blanca engañara a la medida.
 */
const RECORTE_MAX = 0.15;
/** Fraccion de la linea que tiene que ser fondo para contarla como margen. */
const PUREZA = 0.95;
/**
 * Lineas sucias que se perdonan antes de darse por vencido.
 *
 * Hace falta: la primera columna de muchos originales trae ruido -en
 * `OP01-114` solo el 72 % es fondo- mientras que de la 1 a la 26 son fondo
 * puro. Con la regla estricta la medida se paraba en la columna 0 y daba
 * margen cero justo en las cartas que peor se veian.
 */
const RUIDO_TOLERADO = 2;
/** Proporcion de una carta del juego: 600 x 838. */
const FORMA_CARTA = 600 / 838;
/** Cuanto puede alejarse de esa forma antes de sospechar de la medida. */
const TOLERANCIA_FORMA = 0.008;

/**
 * Cuanto margen hay desde un borde, recorriendo hacia dentro.
 *
 * Se queda con la ultima linea que era fondo y para cuando encuentra
 * `RUIDO_TOLERADO + 1` seguidas que no lo son: eso ya es la carta.
 */
function margenDesde(total, fraccionFondo, tope) {
  let ultima = -1;
  for (let i = 0; i < total; i++) {
    if (i > tope) break;
    if (fraccionFondo(i) >= PUREZA) {
      ultima = i;
      continue;
    }
    if (i - ultima > RUIDO_TOLERADO) break;
  }
  return ultima + 1;
}

/** Filas y columnas de fondo desde cada borde, en pixeles de la imagen medida. */
async function medir(entrada, ancho) {
  let pipe = sharp(entrada);
  if (ancho) pipe = pipe.resize({ width: ancho, kernel: 'nearest' });
  const { data, info } = await pipe.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const c = info.channels;
  const px = (x, y) => {
    const i = (y * info.width + x) * c;
    return [data[i], data[i + 1], data[i + 2], data[i + 3]];
  };
  const fila = (y) => {
    let n = 0;
    for (let x = 0; x < info.width; x++) if (esFondo(px(x, y))) n++;
    return n / info.width;
  };
  const col = (x) => {
    let n = 0;
    for (let y = 0; y < info.height; y++) if (esFondo(px(x, y))) n++;
    return n / info.height;
  };

  const topeV = Math.floor(info.height * RECORTE_MAX);
  const topeH = Math.floor(info.width * RECORTE_MAX);
  const arriba = margenDesde(info.height, fila, topeV);
  const abajo = margenDesde(info.height, (i) => fila(info.height - 1 - i), topeV);
  const izq = margenDesde(info.width, col, topeH);
  const der = margenDesde(info.width, (i) => col(info.width - 1 - i), topeH);
  return { arriba, abajo, izq, der, w: info.width, h: info.height };
}

async function main() {
  if (!fs.existsSync(SRC)) {
    console.error(`No están las imágenes en ${SRC}.`);
    process.exit(1);
  }

  const archivos = fs.readdirSync(SRC);
  const sospechosas = [];

  // Primer barrido, en pequeño: descarta de golpe las que vienen bien.
  for (let i = 0; i < archivos.length; i += CONCURRENCIA) {
    await Promise.all(
      archivos.slice(i, i + CONCURRENCIA).map(async (nombre) => {
        try {
          const m = await medir(path.join(SRC, nombre), ANCHO_SONDEO);
          const peor = Math.max(m.arriba / m.h, m.abajo / m.h, m.izq / m.w, m.der / m.w);
          if (peor >= UMBRAL) sospechosas.push(nombre);
        } catch {
          /* una imagen ilegible no bloquea el resto; ya se ve en la cuenta final */
        }
      })
    );
    if (i % 1200 === 0) process.stderr.write(`  sondeo ${i}/${archivos.length}\r`);
  }

  process.stderr.write(`\n  ${sospechosas.length} sospechosas, midiendo a tamaño real\n`);

  // Segundo barrido, a resolucion nativa: el recorte va al proxy en pixeles del
  // original, asi que medir sobre la copia reducida dejaria hasta 4 px de error.
  const manifiesto = {};
  let descartadas = 0;
  for (let i = 0; i < sospechosas.length; i += CONCURRENCIA) {
    await Promise.all(
      sospechosas.slice(i, i + CONCURRENCIA).map(async (nombre) => {
        const id = nombre.replace(/\.[^.]+$/, '');
        try {
          const m = await medir(path.join(SRC, nombre), 0);
          const cw = m.w - m.izq - m.der;
          const ch = m.h - m.arriba - m.abajo;
          // Una imagen que se queda en nada es un error de medida, no un recorte.
          if (cw < m.w * 0.5 || ch < m.h * 0.5) {
            descartadas += 1;
            return;
          }
          const peor = Math.max(m.arriba / m.h, m.abajo / m.h, m.izq / m.w, m.der / m.w);
          if (peor < UMBRAL) {
            descartadas += 1;
            return;
          }

          /*
            El recorte existe para devolverle a la imagen la forma de una carta.
            Si se la aleja, la medida se ha comido parte de la carta -pasa con
            ilustraciones de borde muy claro-, asi que se tira.

            Sin esto colaban 47: entraban ya con 0,716 y salian con 0,730.
          */
          const lejosAntes = Math.abs(m.w / m.h - FORMA_CARTA);
          const lejosDespues = Math.abs(cw / ch - FORMA_CARTA);
          if (lejosDespues > lejosAntes && lejosDespues > TOLERANCIA_FORMA) {
            descartadas += 1;
            return;
          }

          manifiesto[id] = [m.izq, m.arriba, cw, ch, m.w, m.h];
        } catch {
          descartadas += 1;
        }
      })
    );
  }

  const ordenado = Object.fromEntries(Object.entries(manifiesto).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(OUT, `${JSON.stringify(ordenado)}\n`);

  const total = Object.keys(ordenado).length;
  console.log(`recortes: ${total} cartas (${descartadas} descartadas al medirlas de cerca)`);
  console.log(`manifiesto: ${OUT} · ${(fs.statSync(OUT).size / 1024).toFixed(1)} KB`);

  const peores = Object.entries(ordenado)
    .map(([id, [x, y, cw, ch, w, h]]) => ({ id, peor: Math.max(x / w, y / h, (w - x - cw) / w, (h - y - ch) / h) }))
    .sort((a, b) => b.peor - a.peor)
    .slice(0, 5);
  console.log('las peores:', peores.map((p) => `${p.id} ${(p.peor * 100).toFixed(1)}%`).join(', '));
}

main();
