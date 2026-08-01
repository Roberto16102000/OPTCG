/**
 * Mapa id de carta → URL imagen del sitio japonés (www.onepiece-cardgame.com).
 * Los textos del catálogo siguen en inglés (en.onepiece-cardgame.com).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';

const JP_BASE = 'https://www.onepiece-cardgame.com';
const CARDLIST = `${JP_BASE}/cardlist/`;
const DELAY_MS = Number(process.env.SYNC_DELAY_MS || 350);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'assets', 'data', 'jp-image-map.json');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function toImageUrl(relative) {
  if (!relative) return '';
  const p = relative.replace(/^\.\.\//, '').replace(/^\//, '');
  return `${JP_BASE}/${p}`;
}

function collectIds(html) {
  const $ = cheerio.load(html);
  const out = [];
  $('div.resultCol a[data-src]').each((_, el) => {
    const src = $(el).attr('data-src') || '';
    const id = src.replace(/^#\/?/, '').replace(/^cardlist\//, '');
    if (id) out.push(id);
  });
  return [...new Set(out)];
}

async function fetchPackIds() {
  const html = await (await fetch(CARDLIST)).text();
  const $ = cheerio.load(html);
  const packs = [];
  $('#series option').each((_, el) => {
    const id = $(el).attr('value');
    if (id && /^\d+$/.test(id)) packs.push(id);
  });
  return packs;
}

async function imagesForPack(packId) {
  const html = await (await fetch(`${CARDLIST}?series=${packId}`)).text();
  const $ = cheerio.load(html);
  const map = {};
  for (const cardId of collectIds(html)) {
    const imgRel = $(`dl[id="${cardId}"]`).find('dd .frontCol img').attr('data-src');
    if (imgRel) map[cardId] = toImageUrl(imgRel);
  }
  return map;
}

async function main() {
  const packs = await fetchPackIds();
  console.log(`Colecciones JP: ${packs.length}`);
  const images = {};
  for (let i = 0; i < packs.length; i++) {
    const packId = packs[i];
    process.stdout.write(`[${i + 1}/${packs.length}] ${packId}... `);
    try {
      const chunk = await imagesForPack(packId);
      Object.assign(images, chunk);
      console.log(Object.keys(chunk).length, `(total ${Object.keys(images).length})`);
    } catch (e) {
      console.log('ERROR', e.message);
    }
    if (i < packs.length - 1) await sleep(DELAY_MS);
  }

  const output = {
    source: JP_BASE,
    syncedAt: new Date().toISOString(),
    count: Object.keys(images).length,
    images,
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(output));
  console.log(`\nGuardado ${OUT} (${output.count} imágenes)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
