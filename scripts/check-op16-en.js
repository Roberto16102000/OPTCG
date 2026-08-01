import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchPackIds } from './official-scraper.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CATALOG = path.join(__dirname, '..', 'assets', 'data', 'official-catalog.json');

const packs = await fetchPackIds();
const op16Packs = packs.filter((p) => /OP.?16|OP-16/i.test(p.title));
console.log('EN official site packs:', packs.length);
console.log('OP-16 on EN cardlist:', op16Packs.length ? op16Packs : 'NO (still JP-only merge)');

const data = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));
const op16 = data.cards.filter((c) => c.code?.startsWith('OP16'));
const enImg = op16.filter((c) => c.images?.large?.includes('en.onepiece-cardgame.com')).length;
const jpImg = op16.filter((c) => c.images?.large?.includes('onepiece-cardgame.com')).length;
console.log('\nBundled catalog:');
console.log('  syncedAt:', data.syncedAt);
console.log('  jpOnlyMergedAt:', data.jpOnlyMergedAt ?? 'n/a');
console.log('  OP16 cards:', op16.length);
console.log('  OP16 EN images:', enImg);
console.log('  OP16 JP images:', jpImg);
console.log('  set name:', op16[0]?.set?.name?.slice(0, 80));
