/**
 * Comprobación visual: abre la app en un Chromium headless -sin ventana- y
 * mide el DOM ya renderizado en varios anchos.
 *
 * Uso:
 *   npm run web                       (en otra terminal)
 *   npm run check:visual
 *   npm run check:visual -- --shots   guarda capturas en .responsive-shots/
 *
 * Complementa a `check:responsive`, que solo ejercita la aritmética: esto pilla
 * lo que unicamente se ve al renderizar -un texto que rompe una fila, un botón
 * cortado por su contenido, algo que se sale del contenedor-.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const BASE = process.env.APP_URL || 'http://localhost:8081';
const SHOTS = process.argv.includes('--shots');
const SHOT_DIR = path.join(ROOT, '.responsive-shots');

/** Anchos reales, del movil pequeño al escritorio. */
const VIEWPORTS = [
  { w: 320, h: 568, nombre: 'movil-pequeno' },
  { w: 360, h: 740, nombre: 'android' },
  { w: 390, h: 844, nombre: 'iphone' },
  { w: 430, h: 932, nombre: 'iphone-max' },
  { w: 600, h: 900, nombre: 'tablet-vertical' },
  { w: 768, h: 1024, nombre: 'tablet' },
  { w: 1024, h: 768, nombre: 'tablet-horizontal' },
  { w: 1440, h: 900, nombre: 'escritorio' },
];

/** Subconjuntos para iterar rapido: CHECK_WIDTHS=320 CHECK_ROUTES=sets */
const SOLO_ANCHOS = (process.env.CHECK_WIDTHS || '').split(',').filter(Boolean).map(Number);
const SOLO_RUTAS = (process.env.CHECK_ROUTES || '').split(',').filter(Boolean);

const RUTAS = [
  { url: '/', nombre: 'catalogo' },
  { url: '/packs', nombre: 'packs' },
  { url: '/collection', nombre: 'collection' },
  { url: '/binder', nombre: 'binder' },
  { url: '/sets', nombre: 'sets' },
  { url: '/profile', nombre: 'profile' },
];

let fallos = 0;
const aviso = (msg) => {
  console.log(`  ✗ ${msg}`);
  fallos += 1;
};

/**
 * Mide el documento ya pintado y devuelve lo que se sale del ancho.
 *
 * Ojo con el criterio: react-native-web pone `overflow: hidden` en html y body,
 * asi que un elemento que se pasa del ancho NO provoca scroll horizontal -se
 * recorta en silencio y desaparece-. Por eso no vale mirar `scrollWidth`: hay
 * que comparar cada caja con el viewport. Solo se perdona lo que cuelga de un
 * contenedor pensado para desplazarse (`overflowX` auto o scroll), como la fila
 * de numeros de la paginacion.
 */
function medir() {
  const doc = document.documentElement;
  const ancho = doc.clientWidth;
  const fuera = [];

  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    // Margen de 2px: los redondeos del navegador no son un fallo.
    if (r.right <= ancho + 2 && r.left >= -2) continue;

    const estilo = getComputedStyle(el);
    if (estilo.position === 'fixed') continue;
    if (estilo.visibility === 'hidden' || estilo.opacity === '0') continue;

    /*
      Un elemento que se sale puede ser un recorte a proposito -el arte del
      sobre pinta una imagen grande y la encuadra en una ventanita- o contenido
      que se esta cortando de verdad. Por overflow los dos son identicos, asi
      que se distinguen por el tamano del marco que recorta: un marco mucho mas
      estrecho que la pantalla es un encuadre deliberado; uno que ocupa casi
      todo el ancho es un contenedor de la pantalla comiendose lo que no cabe.

      La busqueda para en body a proposito: su `overflow: hidden` viene del
      reset de react-native-web, no es una decision de diseno, y darlo por
      bueno cegaba la comprobacion entera.
    */
    const MARCO_MAX = ancho * 0.9;
    let contenido = false;
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const o = getComputedStyle(p);
      if (!['auto', 'scroll', 'hidden', 'clip'].includes(o.overflowX)) continue;
      const pr = p.getBoundingClientRect();
      const cabe = pr.right <= ancho + 2 && pr.left >= -2;
      if (o.overflowX === 'auto' || o.overflowX === 'scroll') {
        // Pensado para desplazarse: nada se pierde.
        if (cabe) { contenido = true; break; }
        continue;
      }
      if (cabe && pr.width <= MARCO_MAX) { contenido = true; break; }
    }
    if (contenido) continue;

    fuera.push({
      tag: el.tagName.toLowerCase(),
      texto: (el.textContent || '').trim().slice(0, 40),
      left: Math.round(r.left),
      right: Math.round(r.right),
      width: Math.round(r.width),
    });
  }

  // Solo los contenedores mas externos; los hijos que arrastran son consecuencia.
  const unicos = [];
  for (const d of fuera) {
    if (!unicos.some((u) => u.left <= d.left && u.right >= d.right && u.width >= d.width)) {
      unicos.push(d);
    }
  }

  return {
    clientWidth: ancho,
    fuera: unicos.slice(0, 5),
    totalFuera: unicos.length,
    textoVisible: (document.body.textContent || '').trim().length,
  };
}

async function main() {
  const res = await fetch(BASE).catch(() => null);
  if (!res?.ok) {
    console.error(`No responde ${BASE}. Levanta la app con: npm run web`);
    process.exit(1);
  }

  if (SHOTS) fs.rmSync(SHOT_DIR, { recursive: true, force: true });
  if (SHOTS) fs.mkdirSync(SHOT_DIR, { recursive: true });

  const viewports = SOLO_ANCHOS.length
    ? VIEWPORTS.filter((v) => SOLO_ANCHOS.includes(v.w))
    : VIEWPORTS;
  const rutas = SOLO_RUTAS.length ? RUTAS.filter((r) => SOLO_RUTAS.includes(r.nombre)) : RUTAS;

  const browser = await chromium.launch({ headless: true });
  console.log(`Chromium headless · ${viewports.length} anchos × ${rutas.length} pantallas\n`);

  for (const vp of viewports) {
    const context = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
    const page = await context.newPage();
    const errores = [];
    page.on('pageerror', (e) => errores.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errores.push(m.text().slice(0, 120));
    });

    console.log(`${vp.w}×${vp.h} (${vp.nombre})`);
    for (const ruta of rutas) {
      await page.goto(`${BASE}${ruta.url}`, { waitUntil: 'networkidle', timeout: 60000 });
      // El bundle es grande y la primera pintura tarda; se espera a que haya texto.
      await page
        .waitForFunction(() => (document.body.textContent || '').trim().length > 40, { timeout: 30000 })
        .catch(() => {});
      await page.waitForTimeout(600);

      const m = await page.evaluate(medir);

      if (m.textoVisible < 40) {
        aviso(`${ruta.nombre}: la pantalla parece vacía`);
      }
      if (m.totalFuera > 0) {
        aviso(
          `${ruta.nombre}: ${m.totalFuera} elemento(s) cortados (ventana ${m.clientWidth}px) · ` +
            m.fuera
              .map((d) => `<${d.tag} ${d.left}..${d.right} w=${d.width} "${d.texto}">`)
              .join(', ')
        );
      } else {
        console.log(`  ✓ ${ruta.nombre}`);
      }

      if (SHOTS) {
        await page.screenshot({
          path: path.join(SHOT_DIR, `${vp.w}-${ruta.nombre}.png`),
          fullPage: false,
        });
      }
    }

    const graves = errores.filter((e) => !/DevTools|favicon|Download the React/i.test(e));
    if (graves.length) aviso(`${vp.w}px: ${graves.length} error(es) en consola · ${graves[0]}`);

    await context.close();
  }

  await browser.close();
  console.log(
    fallos === 0
      ? `\n✓ Sin fallos en ${viewports.length * rutas.length} combinaciones.`
      : `\n${fallos} fallo(s).`
  );
  if (SHOTS) console.log(`Capturas en ${SHOT_DIR}`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
