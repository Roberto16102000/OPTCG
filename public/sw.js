/**
 * Service worker mínimo: da la cáscara de la app sin red y guarda las cartas
 * que ya se han visto.
 *
 * Las imágenes van en su propio cajón y con tope: son miles y guardarlas todas
 * llenaría el almacenamiento del móvil. Con el tope, lo último que miraste se
 * abre al instante y lo viejo se va cayendo solo.
 */
const CACHE = 'op-collection-v1';
const IMG_CACHE = 'op-cards-v1';
/** Cartas guardadas como mucho. A ~16 KB cada una son unos 10 MB. */
const IMG_MAX = 600;
/** El proxy por el que pasan las imágenes de carta. */
const IMG_HOSTS = ['wsrv.nl', 'images.weserv.nl'];
const SHELL = ['/', '/manifest.json', '/icons/icon-1024.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE && k !== IMG_CACHE).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Imágenes de carta: se sirven de lo guardado y, si no están, se piden y se
  // guardan. Es lo que hace que volver a una página ya vista sea instantáneo.
  if (IMG_HOSTS.includes(url.hostname)) {
    event.respondWith(servirCarta(request));
    return;
  }

  if (url.origin !== self.location.origin) return;

  // La navegación se sirve de red y cae a la copia guardada si no hay señal.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/')));
    return;
  }

  // Estático del propio sitio: primero lo guardado, y si no, red.
  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ??
        fetch(request).then((response) => {
          if (response.ok && url.pathname.startsWith('/_expo/')) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
    )
  );
});

async function servirCarta(request) {
  const cache = await caches.open(IMG_CACHE);
  const guardada = await cache.match(request);
  if (guardada) return guardada;

  const respuesta = await fetch(request);
  // Solo se guarda lo que llegó entero; una respuesta opaca o con error
  // dejaría una carta rota guardada para siempre.
  if (respuesta.ok && respuesta.type !== 'opaque') {
    await cache.put(request, respuesta.clone());
    void recortarCache(cache);
  }
  return respuesta;
}

/** Deja el cajón en el tope, tirando lo más antiguo. */
async function recortarCache(cache) {
  const keys = await cache.keys();
  if (keys.length <= IMG_MAX) return;
  for (const k of keys.slice(0, keys.length - IMG_MAX)) await cache.delete(k);
}
