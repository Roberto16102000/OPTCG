import { fetchPackIds } from './official-scraper.js';

const packs = await fetchPackIds();
console.log('Total packs on EN site:', packs.length);

const want = ['ST-31', 'ST-32', 'ST-33', 'ST-34', 'ST-35', 'ST-36'];
const found = new Map();

for (const p of packs) {
  const plain = p.title.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  for (const code of want) {
    if (plain.includes(code)) found.set(code, { id: p.id, title: plain.trim() });
  }
}

console.log('\nST-31 … ST-36 on official site:');
for (const code of want) {
  const hit = found.get(code);
  console.log(hit ? `  ✓ ${code}  packId=${hit.id}  ${hit.title.slice(0, 90)}` : `  ✗ ${code}  not in dropdown`);
}

const stPacks = packs
  .map((p) => ({
    id: p.id,
    title: p.title.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
  }))
  .filter((p) => /\[ST-\d+\]/i.test(p.title) || /ST-\d+/i.test(p.title));

const nums = stPacks
  .map((p) => {
    const m = p.title.match(/ST-(\d+)/i);
    return m ? Number(m[1]) : 0;
  })
  .filter((n) => n > 0);
console.log('\nHighest ST in dropdown:', nums.length ? `ST-${String(Math.max(...nums)).padStart(2, '0')}` : 'none');
console.log('Last 8 ST packs:');
stPacks
  .sort((a, b) => {
    const na = Number(a.title.match(/ST-(\d+)/i)?.[1] ?? 0);
    const nb = Number(b.title.match(/ST-(\d+)/i)?.[1] ?? 0);
    return na - nb;
  })
  .slice(-8)
  .forEach((p) => console.log(`  ${p.id}  ${p.title.slice(0, 100)}`));
