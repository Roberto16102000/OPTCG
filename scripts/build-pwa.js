#!/usr/bin/env node
/**
 * Exporta la versión web instalable.
 *
 * `expo export` copia todo `public/` a `dist/`. Ahí viven los 1,7 GB de
 * originales, que no admite ningún hosting: se apartan durante la exportación
 * y se devuelven al terminar.
 *
 * Lo que SÍ se publica es `card-hd`: las 5.775 cartas a 900 px que genera
 * `npm run build:hd`, unos 563 MB. En Cloudflare las peticiones a archivos
 * estáticos son gratis e ilimitadas y guardarlos no cuesta.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const heavy = resolve(root, 'public/card-images');
const parked = resolve(root, '.pwa-build/card-images');
/**
 * El manifiesto de imágenes locales viaja dentro del bundle. Si se exporta tal
 * cual, el sitio publicado pide una imagen que no está, se come un 404 por
 * carta y solo entonces cae a la URL oficial. Vaciarlo durante la exportación
 * hace que vaya directo a la buena.
 */
const manifest = resolve(root, 'assets/data/card-image-manifest.json');
const parkedManifest = resolve(root, '.pwa-build/card-image-manifest.json');

function park() {
  if (existsSync(parked) || existsSync(parkedManifest)) {
    throw new Error(
      `Quedaron ficheros apartados en ${dirname(parked)}. Devuélvelos a su sitio antes de exportar.`
    );
  }
  mkdirSync(dirname(parked), { recursive: true });

  if (existsSync(manifest)) {
    renameSync(manifest, parkedManifest);
    writeFileSync(manifest, `${JSON.stringify({ images: {} }, null, 2)}
`);
  }

  if (!existsSync(heavy)) return true;
  renameSync(heavy, parked);
  console.log('· Imágenes de cartas apartadas para no acabar en dist/');
  return true;
}

function restore() {
  if (existsSync(parked)) {
    renameSync(parked, heavy);
    console.log('· Imágenes de cartas devueltas a public/card-images');
  }
  if (existsSync(parkedManifest)) {
    renameSync(parkedManifest, manifest);
    console.log('· Manifiesto de imágenes locales restaurado');
  }
}

/**
 * Etiquetas que hacen instalable el sitio. Se inyectan en el HTML exportado y
 * no con `app/+html.tsx` porque esa vía solo actúa con `web.output: "static"`,
 * y ese modo renderiza las pantallas en Node, donde esta app usa APIs del
 * navegador y no arranca.
 */
const HEAD_TAGS = `
    <link rel="manifest" href="/manifest.json" />
    <meta name="theme-color" content="#c41e3a" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="OP Collection" />
    <link rel="apple-touch-icon" href="/icons/icon-1024.png" />
    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
          navigator.serviceWorker.register('/sw.js').catch(function () {});
        });
      }
    </script>
`;

function addPwaTags() {
  const file = resolve(root, 'dist/index.html');
  if (!existsSync(file)) throw new Error('No se generó dist/index.html');
  const html = readFileSync(file, 'utf8');
  if (html.includes('rel="manifest"')) return;
  if (!html.includes('</head>')) throw new Error('El HTML exportado no trae <head>');
  writeFileSync(file, html.replace('</head>', `${HEAD_TAGS}  </head>`));
  console.log('· Manifiesto, icono y service worker añadidos a dist/index.html');
}

let moved = false;
try {
  moved = park();
  // `shell: true`: en Windows npx es un .cmd y sin shell no se encuentra.
  const result = spawnSync('npx expo export -p web --output-dir dist', {
    cwd: root,
    stdio: 'inherit',
    shell: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
  } else {
    addPwaTags();
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (moved) restore();
}
