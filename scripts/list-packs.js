const html = await (await fetch('https://en.onepiece-cardgame.com/cardlist/')).text();
console.log('len', html.length);
const idx = html.indexOf('id="series"');
console.log('series idx', idx);
if (idx >= 0) console.log(html.slice(idx, idx + 2000));

const values = [...html.matchAll(/value="(\d{5,})"/g)].map((m) => m[1]);
console.log('numeric values', [...new Set(values)].length, values.slice(0, 10));
