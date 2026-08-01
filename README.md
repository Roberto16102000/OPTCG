# One Piece TCG — Colección de cartas

App para explorar cartas de **One Piece TCG** y guardar tu colección personal.

**Fuente de datos:** sitio oficial [en.onepiece-cardgame.com/cardlist](https://en.onepiece-cardgame.com/cardlist/) (más actualizado que API TCG: OP-15, PRB-02, EB-03, etc.).

## Funciones

- Catálogo completo desde el sitio oficial (~4 490 cartas, incl. OP-16 solo en JP)
- Búsqueda por nombre, código o colección
- Filtro por expansión (OP-13, ST-29, EB-03…)
- Caché local para consultar sin conexión
- Añadir / quitar cartas de tu colección
- Cantidad por carta (copias)

## Requisitos

- Node.js 20+
- Expo Go o navegador (`npm run web`)

## Configuración

1. Instala dependencias:

   ```bash
   npm install
   ```

2. **Genera el catálogo oficial** (solo la primera vez o para actualizar):

   ```bash
   npm run sync:official
   ```

   Descarga las 51 colecciones del sitio oficial (EN) y fusiona OP-16 desde el sitio japonés; guarda `assets/data/official-catalog.json`.

3. Inicia la app:

   ```bash
   npm run web
   ```

   o `npm start` para móvil con Expo Go.

4. Pulsa **↻ Sync** en el catálogo para cargar las cartas en el dispositivo.

## Catálogo web (v2 — versión de producción visual)

La UI web acordada vive en **`web/catalog.html`** (mobile-first, modo oscuro, gamificación, modal inmersivo). No es un prototipo desechable.

```bash
npx --yes serve . -p 3456
```

Abre: **http://localhost:3456/** o **http://localhost:3456/web/catalog.html** (carga las 4524 cartas desde `assets/data/official-catalog.json`).

Detalles en [web/README.md](web/README.md). La carpeta `prototype/` conserva solo la v1 histórica.

## Actualizar cartas

Cuando Bandai publique sets nuevos en la web oficial:

```bash
npm run sync:official
npx expo start --web --clear
```

## Notas técnicas

- El sitio oficial **no ofrece una API JSON pública**; los datos vienen en HTML. El script `sync:official` los parsea (como [vegapull](https://github.com/coko7/vegapull)).
- En el navegador las imágenes del sitio oficial están bloqueadas por política de seguridad (`CORP: same-site`); la app usa un proxy de imágenes en web.
- La URL `?series=569115` es **una sola colección** (OP15-EB04), no todo el juego. El script descarga **todas** las colecciones del desplegable.

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run sync:official` | Catálogo EN + fusión OP-16 (JP) |
| `npm run merge:jp-packs` | Solo añade colecciones exclusivas JP (p. ej. OP-16) |
| `npm run web` | Abre la app en el navegador |
| `npm start` | Servidor Expo (móvil) |
