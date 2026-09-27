/**
 * Service worker mínimo: da la cáscara de la app sin red y deja pasar todo lo
 * demás. No cachea las imágenes de cartas a propósito: son miles y llenarían
 * el almacenamiento del móvil sin que el usuario lo pida.
 */
const CACHE = 'op-collection-v1';
const SHELL = ['/', '/manifest.json', '/icons/icon-1024.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
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
