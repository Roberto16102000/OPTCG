const html = await (await fetch('https://en.onepiece-cardgame.com/cardlist/?series=569115')).text();
const jsUrls = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
console.log('JS files:', jsUrls.filter((u) => u.includes('.js')).slice(0, 15));

for (const rel of jsUrls.filter((u) => u.includes('cardlist') || u.includes('search')).slice(0, 5)) {
  const url = rel.startsWith('http') ? rel : `https://en.onepiece-cardgame.com${rel}`;
  console.log('\n---', url);
  const js = await (await fetch(url)).text();
  const found = [...js.matchAll(/https?:\/\/[a-zA-Z0-9_./?=&%-]+/g)]
    .map((m) => m[0])
    .filter((u) => u.includes('json') || u.includes('api') || u.includes('card'));
  console.log([...new Set(found)].slice(0, 20));
}

// optcg public api probe
const sets = await fetch('https://optcg-api.arjunbansal-ai.workers.dev/sets');
console.log('\noptcg sets', sets.status);
if (sets.ok) {
  const j = await sets.json();
  const list = Array.isArray(j) ? j : j.sets || j.data || j;
  console.log('count', list?.length);
  console.log('last', list?.slice(-5)?.map((s) => s.id || s.set_id || s.name));
}
