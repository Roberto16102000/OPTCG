/**
 * Comprueba que la disposición aguanta en cualquier ancho de ventana.
 *
 * Uso: npm run check:responsive
 *
 * No abre un navegador: transpila los módulos de layout reales y ejecuta su
 * aritmética sobre un barrido de anchos, verificando que ninguna fila mide más
 * que su contenedor y que las fichas no bajan de un tamaño usable.
 */
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, '.responsive-check');

/** Anchos reales: móviles pequeños, teléfonos, tablets y escritorio. */
const WIDTHS = [
  280, 300, 320, 340, 360, 375, 390, 412, 414, 430, 480, 540, 600, 640, 700,
  720, 759, 760, 800, 900, 1024, 1180, 1280, 1440, 1600, 1920,
];
/** Altos para lo que también depende del alto. */
const HEIGHTS = [480, 568, 667, 740, 844, 900, 1080];

/** Padding horizontal de cada contenedor, para saber cuánto hay disponible. */
const PAD = { catalog: 32, collection: 32 };

let fallos = 0;
const aviso = (msg) => {
  console.log(`  ✗ ${msg}`);
  fallos += 1;
};

function transpile() {
  fs.rmSync(OUT, { recursive: true, force: true });
  // Se llama al tsc instalado con node directamente: `npx` en Windows es un
  // .cmd y `execFileSync` no lo sabe lanzar sin shell.
  const tsc = path.join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc');
  execFileSync(
    process.execPath,
    [
      tsc,
      'src/utils/responsiveLayout.ts',
      'src/utils/catalogGrid.ts',
      'src/utils/collectionView.ts',
      'src/utils/wantedModalSlots.ts',
      '--ignoreConfig',
      '--outDir', OUT,
      '--module', 'es2022',
      '--target', 'es2022',
      '--skipLibCheck',
    ],
    { cwd: ROOT, stdio: 'pipe' }
  );
  // `tsc` no reescribe las rutas de import al emitir ESM.
  for (const f of fs.readdirSync(path.join(OUT, 'utils'))) {
    const ruta = path.join(OUT, 'utils', f);
    fs.writeFileSync(
      ruta,
      fs.readFileSync(ruta, 'utf8').replace(/from '(\.\.?\/[^']+)'/g, (_, p) => `from '${p}.js'`)
    );
  }
}

/**
 * Proporcion del sobre recortado, leida de `boosterImages.ts`. No se copia a
 * mano: ese modulo importa react-native y no se puede transpilar suelto, asi
 * que se extrae del fuente y se falla si el recorte deja de estar donde estaba.
 * Asi la comprobacion no puede quedarse midiendo un valor viejo.
 */
function leerAspectoDelSobre() {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'utils', 'boosterImages.ts'), 'utf8');
  const m = src.match(/booster: \{[^}]*width: (\d+), height: (\d+)[^}]*\}/);
  if (!m) {
    throw new Error('No se encuentra ART_CROPS.booster en boosterImages.ts; actualiza la comprobacion.');
  }
  return Number(m[1]) / Number(m[2]);
}

async function main() {
  console.log('Transpilando los módulos de layout reales...');
  transpile();

  const L = await import(`file://${path.join(OUT, 'utils', 'responsiveLayout.js')}`);
  const C = await import(`file://${path.join(OUT, 'utils', 'catalogGrid.js')}`);
  const V = await import(`file://${path.join(OUT, 'utils', 'collectionView.js')}`);
  const W = await import(`file://${path.join(OUT, 'utils', 'wantedModalSlots.js')}`);

  console.log(`\nBarrido de ${WIDTHS.length} anchos (${WIDTHS[0]}–${WIDTHS.at(-1)} px)\n`);

  console.log('Catálogo: la fila de la rejilla cabe en el panel');
  for (const w of WIDTHS) {
    const cols = C.getGridColumns(w);
    const { width } = C.getTileSize(w, cols);
    const fila = cols * width + C.GRID_GAP * (cols - 1);
    const hueco = w - C.GRID_HORIZONTAL_PADDING * 2;
    if (fila > hueco) aviso(`${w}px: fila ${fila} > hueco ${hueco} (${cols} col)`);
    if (width < 40) aviso(`${w}px: ficha de ${width}px, ilegible`);
    if (cols < 2) aviso(`${w}px: ${cols} columna(s)`);
  }

  console.log('Collection: la fila de la rejilla cabe en el panel');
  for (const w of WIDTHS) {
    const cols = V.getCollectionGridColumns(w);
    const { width } = V.getCollectionTileSize(w, cols);
    const fila = cols * width + V.COLLECTION_GRID_GAP * (cols - 1);
    const hueco = w - PAD.collection;
    if (fila > hueco) aviso(`${w}px: fila ${fila} > hueco ${hueco} (${cols} col)`);
    if (width < 40) aviso(`${w}px: ficha de ${width}px, ilegible`);
  }

  console.log('Binder: las hojas caben en el tablero');
  for (const w of WIDTHS) {
    for (const cols of [2, 3, 4]) {
      const b = L.getBinderBoard(w, cols);
      if (b.pageWidth <= 0) aviso(`binder ${w}px ${cols}col: hoja de ${b.pageWidth}px`);
      const rejilla = cols * b.slotWidth + (cols - 1) * 8;
      if (rejilla > b.pageWidth) aviso(`binder ${w}px ${cols}col: rejilla ${rejilla} > hoja ${b.pageWidth}`);
      if (b.slotWidth < 44) aviso(`binder ${w}px ${cols}col: hueco de ${b.slotWidth}px`);
      const total = b.sheets * b.pageWidth;
      if (total > b.boardWidth) aviso(`binder ${w}px: ${b.sheets} hojas = ${total} > tablero ${b.boardWidth}`);
      if (b.spread && b.narrow) aviso(`binder ${w}px: pliego en pantalla estrecha`);
    }
  }

  console.log('Selector de cartas: la fila cabe y hay 3 columnas en estrecho');
  for (const w of WIDTHS) {
    const g = L.getPickerGrid(w);
    const fila = g.columns * (g.tileWidth + L.PICKER_TILE_CHROME) + 8 * (g.columns - 1);
    if (fila > g.browserWidth) aviso(`selector ${w}px: fila ${fila} > hueco ${g.browserWidth}`);
    if (!g.wide && g.columns < 3) aviso(`selector ${w}px: solo ${g.columns} columnas en estrecho`);
    if (g.tileWidth < 60) aviso(`selector ${w}px: ficha de ${g.tileWidth}px`);
  }

  console.log('Carrusel de sobres: la escala se mantiene en rango');
  // Medidas del propio carrusel y proporcion real del recorte del sobre, que
  // es la del codigo y no una estimacion: el carrusel solo muestra boosters
  // (OP/EB/PRB) y el de promos, todos con este encuadre.
  const CENTRO = 380;
  const LADO = 236;
  const SOLAPE = 58;
  const ASPECTO = leerAspectoDelSobre();
  for (const w of WIDTHS) {
    for (const h of HEIGHTS) {
      const s = L.getCarouselScale(w, h);
      if (s < 0.58 || s > 1) aviso(`carrusel ${w}x${h}: escala ${s}`);
      // Sobre central + dos laterales solapados, a escala.
      const ancho =
        CENTRO * s * ASPECTO + 2 * (LADO * s * ASPECTO - SOLAPE * s);
      if (ancho > w) aviso(`carrusel ${w}x${h}: sobres ${Math.round(ancho)}px > ventana ${w}px`);
    }
  }

  console.log('Ficha de carta: el panel cabe en la ventana');
  for (const w of WIDTHS) {
    for (const h of HEIGHTS) {
      const wide = w >= 720;
      const panel = W.wantedPanelSize(w, h - 8, wide);
      if (!wide && panel.width > w) aviso(`ficha ${w}px: panel ${panel.width} > ventana ${w}`);
      if (!wide) {
        const carta = W.wantedStackedCardSize(panel.width);
        if (carta.width > panel.width) aviso(`ficha ${w}px: carta ${carta.width} > panel ${panel.width}`);
        if (carta.width < 100) aviso(`ficha ${w}px: carta de ${carta.width}px`);
      }
    }
  }

  fs.rmSync(OUT, { recursive: true, force: true });

  console.log(
    fallos === 0
      ? `\n✓ Sin fallos. ${WIDTHS.length} anchos × ${HEIGHTS.length} altos.`
      : `\n${fallos} fallo(s).`
  );
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
