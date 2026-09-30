/**
 * ¿Ocupa la carta todo su hueco?
 *
 * Mide el DOM ya pintado: compara la caja que el layout reserva para la imagen
 * con los píxeles que la imagen ocupa de verdad dentro de ella. Con
 * `contentFit: contain`, si las proporciones no coinciden queda sitio sin usar
 * a los lados o arriba y abajo: eso es el marco que se ve mal.
 *
 * Se mide en las dos fases -la miniatura y la nítida del proxy- porque el fallo
 * seria justo que una de las dos se recortara y la otra no.
 */
import { chromium } from 'playwright';

/*
  Igual que los otros arneses: `APP_URL` manda y si no se asume el servidor de
  desarrollo. Antes solo leia argv y `npm run check:gap` reventaba, porque npm
  no pasa argumentos si no los pides con `--`.
*/
const BASE = process.env.APP_URL || process.argv[2] || 'http://localhost:8081';
const IDS = (process.env.CHECK_IDS || process.argv[3] || 'OP01-046,OP01-001')
  .split(',')
  .filter(Boolean);

const navegador = await chromium.launch({ headless: true });
const ctx = await navegador.newContext({ viewport: { width: 420, height: 880 }, serviceWorkers: 'block' });
const page = await ctx.newPage();

await page.goto(BASE, { waitUntil: 'load', timeout: 90000 });
/*
  Con la carga diferida solo se pintan las cartas que se ven, asi que esperar a
  «mas de diez imagenes» ya no se cumple nunca en un movil: son seis.
*/
await page.waitForFunction(
  () => [...document.querySelectorAll('img')].filter((i) => i.getBoundingClientRect().width > 100).length >= 4,
  { timeout: 90000 }
);
await page.waitForTimeout(3500);

/** Hueco sin usar dentro de la caja de la imagen, en porcentaje de cada lado. */
function medirHueco() {
  let peor = null;
  for (const img of document.querySelectorAll('img')) {
    const r = img.getBoundingClientRect();
    if (r.width < 180 || !img.naturalWidth) continue;
    const cajaRel = r.width / r.height;
    const imgRel = img.naturalWidth / img.naturalHeight;
    // `contain`: la imagen toca el lado que primero se queda corto.
    const anchoUsado = imgRel > cajaRel ? r.width : r.height * imgRel;
    const altoUsado = imgRel > cajaRel ? r.width / imgRel : r.height;
    const huecoH = (r.width - anchoUsado) / r.width;
    const huecoV = (r.height - altoUsado) / r.height;
    const dato = {
      src: (img.currentSrc || img.src).slice(-70),
      caja: `${Math.round(r.width)}x${Math.round(r.height)}`,
      nativo: `${img.naturalWidth}x${img.naturalHeight}`,
      huecoH: +(huecoH * 100).toFixed(1),
      huecoV: +(huecoV * 100).toFixed(1),
    };
    if (!peor || Math.max(dato.huecoH, dato.huecoV) > Math.max(peor.huecoH, peor.huecoV)) peor = dato;
  }
  return peor;
}

let fallos = 0;
for (const id of IDS) {
  /*
    Buscar la carta y abrirla.

    Hay que bajar buscandola: con la carga diferida una carta que no se ha
    visto todavia no existe como `img` en el DOM, asi que mirar solo lo que hay
    al entrar solo encontraba las seis primeras.
  */
  const intentar = (codigo) =>
    page.evaluate((c) => {
      for (const el of document.querySelectorAll('img')) {
        const src = el.currentSrc || el.src;
        if (src.includes(encodeURIComponent(c)) || src.includes(c)) {
          el.closest('[role="button"], button, div')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          return true;
        }
      }
      return false;
    }, codigo);

  let abierta = await intentar(id);
  if (!abierta) {
    const hayLista = await page.evaluate(() => {
      const cand = [...document.querySelectorAll('div')].filter((el) => {
        const s = getComputedStyle(el);
        return /auto|scroll/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 50;
      });
      const el = cand.sort((a, b) => b.scrollHeight - a.scrollHeight)[0];
      if (!el) return false;
      el.dataset.lista = '1';
      return true;
    });

    for (let paso = 1; hayLista && paso <= 12 && !abierta; paso++) {
      await page.evaluate((f) => {
        const el = document.querySelector('[data-lista]');
        el.scrollTop = el.scrollHeight * f;
      }, paso / 12);
      await page.waitForTimeout(1200);
      abierta = await intentar(id);
    }
  }

  if (!abierta) {
    // Saltarse una carta no puede contar como aprobado: una prueba que no mide
    // nada tiene que fallar, no dar verde.
    console.log(`  ✗ ${id}: no se pudo abrir, sin medir`);
    fallos++;
    continue;
  }

  await page.waitForTimeout(900);
  const fase1 = await page.evaluate(medirHueco);
  await page.waitForTimeout(6000);
  const fase2 = await page.evaluate(medirHueco);

  const linea = (f, etiqueta) =>
    f
      ? `${etiqueta}: caja ${f.caja} · imagen ${f.nativo} · hueco ${f.huecoH}% horizontal, ${f.huecoV}% vertical`
      : `${etiqueta}: nada pintado`;

  const peorHueco = Math.max(fase2?.huecoH ?? 99, fase2?.huecoV ?? 99);
  const ok = peorHueco <= 2;
  if (!ok) fallos++;
  console.log(`${ok ? '  ✓' : '  ✗'} ${id}`);
  console.log(`      ${linea(fase1, 'al abrir ')}`);
  console.log(`      ${linea(fase2, 'ya cargada')}`);

  await page.keyboard.press('Escape');
  await page.waitForTimeout(700);
}

console.log(fallos === 0 ? '\nSin huecos.' : `\n${fallos} carta(s) con hueco.`);
await navegador.close();
process.exit(fallos === 0 ? 0 : 1);
