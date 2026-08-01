# One Piece TCG — Web Catalog (v2)

Versión visual de producción del catálogo. No es un prototipo desechable: es la referencia de UI/UX acordada para la experiencia web.

## Abrir en local

El catálogo carga `assets/data/official-catalog.json` por red (no funciona con `file://` por CORS). Desde la raíz del repo:

```bash
npx --yes serve . -p 3456
```

Luego abre:

- **http://localhost:3456/** (redirige solo al catálogo), o
- **http://localhost:3456/web/catalog.html**

## Archivos

| Archivo | Descripción |
|---------|-------------|
| `catalog.html` | Catálogo v2 (mobile-first, gamificación, modal inmersivo) |
| `tcgplayer-prices.html` | Consulta precios TCGplayer API (Market/Low/Mid/High) |
| `../prototype/catalog-prototype.html` | v1 histórica (solo referencia) |

## Precios TCGplayer

```bash
npm run tcgplayer:prices
```

Abre **http://localhost:3460/web/tcgplayer-prices.html** — introduce tu Public/Private Key, obtén token y busca cartas One Piece (category 68).

Documentación: [Getting Started](https://docs.tcgplayer.com/docs/getting-started), [Authorize Application](https://docs.tcgplayer.com/reference/app_authorizeapplication), [List Product Market Prices](https://docs.tcgplayer.com/reference/pricing_getproductprices-1).

## Colección

El estado “owned” se guarda en `localStorage` (`opc-collection-v2`). Pulsa **↻ Sync** para recargar datos del JSON oficial.
