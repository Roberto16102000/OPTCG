/**
 * English display names for JP-only sets (OP-16, ST-30).
 * Uso: npm run enrich:en-names
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CATALOG = path.join(__dirname, '..', 'assets', 'data', 'official-catalog.json');
const NAMES_OUT = path.join(__dirname, '..', 'assets', 'data', 'en-card-names.json');

const COLORS = ['Red', 'Green', 'Blue', 'Purple', 'Black', 'Yellow'];
const TYPES = ['Character', 'Event', 'Leader', 'Stage'];

/** Official / community English names for ST-30 (deck list). */
export const ST30_EN_NAMES = {
  'ST30-001': 'Luffy & Ace',
  'ST30-002': 'Inazuma',
  'ST30-003': 'Edward Newgate',
  'ST30-004': 'Emporio Ivankov',
  'ST30-005': 'Jozu',
  'ST30-006': 'Jinbe',
  'ST30-007': 'Portgas D. Ace',
  'ST30-008': 'Marco',
  'ST30-009': 'LittleOars Jr.',
  'ST30-010': 'Crocodile',
  'ST30-011': 'Buggy',
  'ST30-012': 'Monkey.D.Luffy',
  'ST30-013': 'Mr.2 Bon Kurei (Bentham)',
  'ST30-014': 'Mr.3 (Galdino)',
  'ST30-015': 'The Name Of This Age Is Whitebeard!!',
  'ST30-016': 'Can You Fight, Luffy!!! Of Course!!!',
  'ST30-017': 'All You Ever Do Is Cause Trouble!!!',
};

/** OP-16 leaders (not always on third-party lists). */
const OP16_LEADER_NAMES = {
  'OP16-001': 'Portgas D. Ace',
  'OP16-022': 'Monkey D. Luffy',
  'OP16-041': 'Buggy',
  'OP16-060': 'Sengoku',
  'OP16-079': 'Yamato',
  'OP16-080': 'Marshall D. Teach',
};

/** Cards missing or mistyped on third-party English lists. */
const OP16_MANUAL_NAMES = {
  'OP16-003': 'Edward Newgate',
  'OP16-011': 'Vista',
  'OP16-026': 'Emporio Ivankov',
  'OP16-030': 'Trafalgar Law',
  'OP16-042': 'Impel Down Prisoner',
  'OP16-055': 'Mr.2 Bon Kurei (Bentham)',
  'OP16-056': 'Mr.3 (Galdino)',
  'OP16-063': 'Kuzan',
  'OP16-065': 'Sakazuki',
  'OP16-073': 'Borsalino',
  'OP16-105': 'Gecko Moria',
  'OP16-106': 'San Juan Wolf',
  'OP16-108': 'Shiryu',
};

/** spellmana.com lists cards as "IzoRed Character OP16-002" (no space before color). */
export function parseOp16FromSpellmana(html) {
  const text = html.replace(/<[^>]+>/g, ' ');
  const map = new Map();
  const re = new RegExp(
    `(.+?)(${COLORS.join('|')})\\s+(${TYPES.join('|')})\\s*(?:\\()?((?:OP16)-\\d+)(?:\\))?`,
    'gi'
  );
  let m;
  while ((m = re.exec(text)) !== null) {
    let name = m[1]
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/^(Related Posts|OP16 Cards|Spell Mana).*$/i, '')
      .trim();
    if (!name || name.length > 80) continue;
    map.set(m[4].toUpperCase(), name);
  }
  for (const [code, name] of Object.entries({ ...OP16_LEADER_NAMES, ...OP16_MANUAL_NAMES })) {
    map.set(code, name);
  }
  return Object.fromEntries(map);
}

export function baseCardCode(idOrCode) {
  const raw = (idOrCode || '').trim();
  const m = raw.match(/^((?:OP|ST|EB|PRB|GC)\d+-\d+)/i);
  return m ? m[1].toUpperCase() : raw.toUpperCase();
}

const SPELLMANA_URL = 'https://spellmana.com/op16-cards-one-piece-card-game/';
const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml',
};

export async function buildEnglishNameMap() {
  const bundled = path.join(__dirname, '..', 'assets', 'data', 'op16-en-names.json');
  let op16 = {};

  try {
    const res = await fetch(SPELLMANA_URL, { headers: FETCH_HEADERS });
    if (res.ok) {
      op16 = parseOp16FromSpellmana(await res.text());
    } else if (fs.existsSync(bundled)) {
      console.warn(`spellmana ${res.status}; using bundled ${bundled}`);
      op16 = JSON.parse(fs.readFileSync(bundled, 'utf8'));
    } else {
      throw new Error(`spellmana fetch ${res.status}`);
    }
  } catch (e) {
    if (fs.existsSync(bundled)) {
      console.warn(`spellmana error (${e.message}); using bundled names`);
      op16 = JSON.parse(fs.readFileSync(bundled, 'utf8'));
    } else {
      throw e;
    }
  }

  if (fs.existsSync(bundled) === false && Object.keys(op16).length > 50) {
    fs.mkdirSync(path.dirname(bundled), { recursive: true });
    fs.writeFileSync(bundled, JSON.stringify(op16, null, 0));
  }

  return { ...ST30_EN_NAMES, ...op16 };
}

export function applyEnglishNamesToCards(cards, nameMap) {
  let updated = 0;
  for (const card of cards) {
    const base = baseCardCode(card.code || card.id);
    const en = nameMap[base];
    if (en && en !== card.name) {
      card.name = en;
      updated += 1;
    }
  }
  return updated;
}

async function main() {
  console.log('Fetching OP-16 English names from spellmana.com...');
  const nameMap = await buildEnglishNameMap();
  const op16 = Object.keys(nameMap).filter((k) => k.startsWith('OP16')).length;
  const st30 = Object.keys(nameMap).filter((k) => k.startsWith('ST30')).length;
  console.log(`Name map: ${op16} OP16 + ${st30} ST30 (${Object.keys(nameMap).length} total)`);

  fs.mkdirSync(path.dirname(NAMES_OUT), { recursive: true });
  fs.writeFileSync(
    NAMES_OUT,
    JSON.stringify({ syncedAt: new Date().toISOString(), count: Object.keys(nameMap).length, names: nameMap })
  );
  console.log(`Saved ${NAMES_OUT}`);

  if (!fs.existsSync(CATALOG)) {
    console.log('No catalog file; run merge:jp-packs after sync:official.');
    return;
  }

  const data = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));
  const updated = applyEnglishNamesToCards(data.cards, nameMap);
  fs.writeFileSync(CATALOG, JSON.stringify(data));
  console.log(`Catalog updated: ${updated} cards renamed in ${CATALOG}`);
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
