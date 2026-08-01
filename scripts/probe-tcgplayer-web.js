const tests = [
  ['search html', 'https://www.tcgplayer.com/search/one-piece-cardgame/product?q=Zoro&view=grid'],
  ['price guides', 'https://www.tcgplayer.com/categories/trading-and-collectible-card-games/one-piece-cardgame/price-guides'],
  ['product 454496', 'https://www.tcgplayer.com/product/454496'],
  ['mp search v2', 'https://mp-search-api.tcgplayer.com/v2/product/search?q=Zoro&categoryId=68'],
  ['mp search post', null],
];

async function get(url) {
  const r = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json,text/html' },
  });
  return { status: r.status, text: await r.text() };
}

for (const [name, url] of tests) {
  if (!url) continue;
  try {
    const { status, text } = await get(url);
    console.log(name, status, text.length);
    if (text.includes('marketPrice') || text.includes('Market Price')) console.log('  has marketPrice');
    const pid = text.match(/product\/(\d{5,})/g);
    if (pid) console.log('  product ids', [...new Set(pid)].slice(0, 5));
  } catch (e) {
    console.log(name, 'ERR', e.message);
  }
}
