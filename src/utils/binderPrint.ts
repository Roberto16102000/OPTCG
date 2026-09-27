import { Platform } from 'react-native';

export interface PrintableSlot {
  code: string;
  name: string;
  uri: string;
}

export interface PrintBinderOptions {
  title: string;
  cols: number;
  rows: number;
  /** Una entrada por hueco y por página, en orden de lectura. */
  pages: (PrintableSlot | null)[][];
  cover?: string | null;
  /**
   * El mismo encuadre que se ve en pantalla: proporción del marco y posición
   * de la foto dentro de él, todo en fracciones.
   */
  coverLayout?: { aspect: number; width: number; height: number; left: number; top: number } | null;
}

export type PrintResult = 'ok' | 'unsupported';

/**
 * La ventana de impresión es `about:blank`: una ruta relativa como
 * `/card-images/OP01-001.png` no resolvería, así que se absolutiza.
 */
function absolute(uri: string): string {
  if (/^(data:|blob:|https?:)/.test(uri)) return uri;
  try {
    return new URL(uri, window.location.href).href;
  } catch {
    return uri;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Maqueta el binder para papel y lanza el diálogo de impresión. Se imprime un
 * documento aparte, no la pantalla: así el papel lleva una hoja del binder por
 * página y no se cuelan ni la navegación ni los ajustes. Va en un iframe y no
 * en una ventana nueva porque el bloqueador de emergentes cancelaba esta.
 */
export function printBinder(options: PrintBinderOptions): PrintResult {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return 'unsupported';

  const { title, cols, rows, pages, cover, coverLayout } = options;

  // El marco de papel copia la proporción del de pantalla; así las fracciones
  // del encuadre valen igual y el recorte impreso es el que se eligió.
  const box = coverLayout ?? { aspect: 16 / 9, width: 1, height: 1, left: 0, top: 0 };
  const pct = (value: number) => `${(value * 100).toFixed(3)}%`;

  /**
   * Se dimensiona en milímetros contra el área imprimible de un A4 en vez de
   * dejarlo al flujo: con columnas elásticas la rejilla se salía por la
   * derecha y la última fila se partía en dos páginas.
   */
  const PAGE_W = 190;
  const PAGE_H = 277;
  const GAP = 3;
  const HEADER_H = 10;
  const HEADER_GAP = 2;
  const CAPTION_H = 4;
  const cellWidth = (PAGE_W - (cols - 1) * GAP) / cols;
  const cellHeight =
    (PAGE_H - HEADER_H - HEADER_GAP - (rows - 1) * GAP) / rows - CAPTION_H;
  // La carta es 5:7; manda el lado que primero se queda corto.
  const slotW = Math.min(cellWidth, (cellHeight * 5) / 7);
  const slotH = (slotW * 7) / 5;
  const mm = (value: number) => `${value.toFixed(2)}mm`;

  // La portada respeta la forma que tenga la hoja en pantalla.
  const coverW = Math.min(PAGE_W, (PAGE_H - 30) * 0.72 * box.aspect);
  const coverH = coverW / box.aspect;

  const coverSheet = cover
    ? `<section class="sheet cover">
         <div class="frame" style="width:${mm(coverW)};height:${mm(coverH)}">
           <img src="${escapeHtml(absolute(cover))}" alt=""
                style="width:${pct(box.width)};height:${pct(box.height)};left:${pct(box.left)};top:${pct(box.top)}" />
         </div>
         <h1>${escapeHtml(title)}</h1>
       </section>`
    : '';

  const sheets = pages
    .map((slots, index) => {
      const cells = slots
        .map((slot) =>
          slot
            ? `<figure class="slot">
                 <img src="${escapeHtml(absolute(slot.uri))}" alt="${escapeHtml(slot.name)}" />
                 <figcaption>${escapeHtml(slot.code)}</figcaption>
               </figure>`
            : '<div class="slot empty"></div>'
        )
        .join('');
      return `<section class="sheet">
                <header><span>${escapeHtml(title)}</span><span>Página ${index + 1} de ${pages.length}</span></header>
                <div class="grid">${cells}</div>
              </section>`;
    })
    .join('');

  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.setAttribute('title', 'Impresión del binder');
  frame.style.cssText =
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(frame);

  const doc = frame.contentDocument;
  if (!doc) {
    frame.remove();
    return 'unsupported';
  }

  // Al terminar (o al cancelar) el iframe sobra; el plazo cubre a los
  // navegadores que no emiten 'afterprint'.
  const cleanup = () => frame.remove();
  frame.contentWindow?.addEventListener('afterprint', cleanup, { once: true });
  setTimeout(cleanup, 120000);

  doc.write(`<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  @page { size: A4; margin: 10mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color: #14202b; }
  .sheet { page-break-after: always; break-after: page; }
  .sheet:last-child { page-break-after: auto; break-after: auto; }
  header {
    display: flex; justify-content: space-between; align-items: baseline;
    height: ${HEADER_H}mm;
    font-size: 9pt; font-weight: 700; letter-spacing: .04em;
    border-bottom: 1pt solid #14202b; padding-bottom: 1.5mm; margin: 0 0 ${HEADER_GAP}mm;
  }
  header span:last-child { font-weight: 500; color: #4a5b6a; }
  .grid {
    display: grid;
    grid-template-columns: repeat(${cols}, ${mm(slotW)});
    gap: ${GAP}mm;
    justify-content: center;
  }
  .slot { margin: 0; width: ${mm(slotW)}; }
  .slot img {
    width: ${mm(slotW)}; height: ${mm(slotH)};
    object-fit: cover; border-radius: 2mm; display: block;
  }
  .slot figcaption {
    height: ${CAPTION_H}mm; line-height: ${CAPTION_H}mm;
    font-size: 6.5pt; text-align: center; color: #4a5b6a; overflow: hidden;
  }
  .slot.empty {
    width: ${mm(slotW)}; height: ${mm(slotH)};
    border: .6pt dashed #9aa8b4; border-radius: 2mm;
  }
  .cover {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    height: ${PAGE_H}mm; gap: 8mm;
  }
  /* Manda la proporción, no el ancho: el recorte impreso debe ser el mismo
     que se eligió en pantalla, y para eso el marco ha de tener su forma. */
  .cover .frame { position: relative; max-width: 100%; overflow: hidden; border-radius: 3mm; }
  /* Cada hoja ocupa una página exacta: así ninguna fila se parte. */
  .sheet { height: ${PAGE_H}mm; overflow: hidden; }
  .cover .frame img { position: absolute; object-fit: fill; }
  .cover h1 { font-size: 28pt; margin: 0; text-align: center; }
</style>
</head>
<body>
${coverSheet}
${sheets}
<script>
  // Esperar a las imágenes: sin esto el diálogo sale con huecos en blanco.
  var imgs = Array.prototype.slice.call(document.images);
  var pending = imgs.length;
  function ready() { if (--pending <= 0) setTimeout(function () { window.focus(); window.print(); }, 120); }
  if (!pending) setTimeout(function () { window.focus(); window.print(); }, 120);
  imgs.forEach(function (img) {
    if (img.complete) ready();
    else { img.addEventListener('load', ready); img.addEventListener('error', ready); }
  });
</script>
</body>
</html>`);
  doc.close();
  return 'ok';
}

/** Número de filas por hoja, para el pie informativo. */
export function sheetLabel(cols: number, rows: number): string {
  return `${cols}×${rows}`;
}
