import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseOp16FromSpellmana } from './enrich-english-names.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'assets', 'data', 'op16-en-names.json');

const snapshot = path.join(
  process.env.USERPROFILE || '',
  '.cursor/projects/c-Users-User-one-piece-collection/agent-tools/30832456-d3d6-428d-b02f-818cc9d5f0f0.txt'
);

let text = '';
if (fs.existsSync(snapshot)) {
  text = fs.readFileSync(snapshot, 'utf8');
} else {
  const res = await fetch('https://spellmana.com/op16-cards-one-piece-card-game/', {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });
  text = await res.text();
}

import { ST30_EN_NAMES } from './enrich-english-names.js';

const names = { ...ST30_EN_NAMES, ...parseOp16FromSpellmana(text) };
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(names));
console.log('Wrote', OUT, Object.keys(names).length, 'names');
