const files = [
  'https://en.onepiece-cardgame.com/js/cardlist.js?260518',
  'https://en.onepiece-cardgame.com/js/common_re.js?260518',
  'https://en.onepiece-cardgame.com/renewal/js/common.js?260518',
];

for (const url of files) {
  const t = await (await fetch(url)).text();
  console.log('\n===', url, 'len', t.length);

  const ajax = [...t.matchAll(/url\s*:\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
  console.log('ajax', [...new Set(ajax)].slice(0, 20));

  const fetchUrls = [...t.matchAll(/fetch\(\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
  console.log('fetch', [...new Set(fetchUrls)].slice(0, 20));

  const paths = [...t.matchAll(/['"](\/cardlist[^'"]*)['"]/g)].map((m) => m[1]);
  console.log('cardlist paths', [...new Set(paths)].slice(0, 20));

  if (t.includes('569115')) console.log('has 569115');
  if (t.includes('series')) {
    const idx = t.indexOf('series');
    console.log('series ctx', t.slice(Math.max(0, idx - 80), idx + 120));
  }
}
