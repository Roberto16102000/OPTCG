/**
 * Comprueba que ninguna carta se quede corta dentro de su hueco.
 *
 * Uso:
 *   npm run check:framing
 *
 * Que mira: una carta se pinta con `contentFit="contain"` en un hueco con la
 * proporcion de una carta -600 x 838-. Si la imagen no tiene esa proporcion,
 * sobra sitio por dos lados y se ve el marco vacio. Eso es lo que se mide aqui,
 * sobre las miniaturas que de verdad se publican.
 *
 * Tambien comprueba que el recorte que se le pide al proxy sea coherente con el
 * que lleva la miniatura: si uno recortara y el otro no, la carta daria un
 * salto al cambiarse una por otra en la ficha.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const THUMBS = path.join(ROOT, 'public', 'card-thumbs');
const RECORTES = path.join(ROOT, 'assets', 'data', 'card-crop-manifest.json');

const FORMA_CARTA = 600 / 838;
/**
 * Cuanto puede desviarse antes de que se note el marco.
 *
 * A 0,020 el hueco que queda en una ficha de 300 px son unos 6 px por lado,
 * que ya se ven. Por debajo de eso no.
 */
const TOLERANCIA = 0.02;
const CONCURRENCIA = 24;

/**
 * Cartas que no tienen forma de carta y no es culpa nuestra.
 *
 * Las tres vienen de TCGplayer, que publica una foto encuadrada a su manera en
 * vez del arte oficial. No es relleno alrededor de la carta -eso lo quita el
 * recorte-, es que la imagen de origen ya esta cortada asi. Recortar mas se
 * comeria carta y rellenar devolveria las bandas que se estan quitando.
 *
 * Se listan una a una a proposito: si aparece una cuarta, la comprobacion
 * falla y hay que mirarla, en vez de que se cuele en silencio.
 */
const CONOCIDAS = new Set(['OP14-027_p2', 'ST29-008_p2', 'EB04-030_p1']);

let fallos = 0;
const aviso = (msg) => {
  console.log(`  ✗ ${msg}`);
  fallos += 1;
};

async function main() {
  if (!fs.existsSync(THUMBS)) {
    console.error('No están las miniaturas. Ejecuta antes: npm run build:thumbs');
    process.exit(1);
  }

  const recortes = fs.existsSync(RECORTES) ? JSON.parse(fs.readFileSync(RECORTES, 'utf8')) : {};
  const archivos = fs.readdirSync(THUMBS);
  let desencuadradas = [];

  for (let i = 0; i < archivos.length; i += CONCURRENCIA) {
    await Promise.all(
      archivos.slice(i, i + CONCURRENCIA).map(async (nombre) => {
        try {
          const m = await sharp(path.join(THUMBS, nombre)).metadata();
          const desvio = Math.abs(m.width / m.height - FORMA_CARTA);
          if (desvio > TOLERANCIA) {
            desencuadradas.push({
              id: nombre.replace('.webp', ''),
              forma: `${m.width}x${m.height}`,
              relacion: (m.width / m.height).toFixed(3),
              desvio,
            });
          }
        } catch {
          aviso(`${nombre}: no se puede leer`);
        }
      })
    );
  }

  console.log(`Encuadre · ${archivos.length} miniaturas, ${Object.keys(recortes).length} con recorte\n`);

  const conocidas = desencuadradas.filter((d) => CONOCIDAS.has(d.id));
  desencuadradas = desencuadradas.filter((d) => !CONOCIDAS.has(d.id));
  if (conocidas.length) {
    console.log(`  · ${conocidas.length} conocida(s) de TCGplayer, sin arreglo: ${conocidas.map((d) => d.id).join(', ')}`);
  }

  desencuadradas.sort((a, b) => b.desvio - a.desvio);
  if (desencuadradas.length) {
    aviso(
      `${desencuadradas.length} miniatura(s) sin forma de carta (${FORMA_CARTA.toFixed(3)} ± ${TOLERANCIA}) · ` +
        desencuadradas
          .slice(0, 6)
          .map((d) => `${d.id} ${d.forma}=${d.relacion}`)
          .join(', ')
    );
  } else {
    console.log('  ✓ todas las miniaturas tienen forma de carta');
  }

  // El recorte tiene que dejar la imagen con forma de carta; si no, la medida
  // se comio parte de la carta en vez de quitar relleno.
  let recortesMalos = 0;
  for (const [id, r] of Object.entries(recortes)) {
    const [, , cw, ch, w, h] = r;
    const lejosAntes = Math.abs(w / h - FORMA_CARTA);
    const lejosDespues = Math.abs(cw / ch - FORMA_CARTA);
    if (lejosDespues > lejosAntes && lejosDespues > 0.008) recortesMalos += 1;
  }
  if (recortesMalos) {
    aviso(`${recortesMalos} recorte(s) alejan la imagen de la forma de una carta`);
  } else {
    console.log('  ✓ todos los recortes acercan la imagen a la forma de una carta');
  }

  console.log(fallos === 0 ? '\n✓ Sin fallos.' : `\n${fallos} fallo(s).`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
