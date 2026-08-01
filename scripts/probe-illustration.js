import * as cheerio from 'cheerio';

async function countCards(url) {
  const html = await (await fetch(url)).text();
  const $ = cheerio.load(html);
  const ids = new Set();
  $('div.resultCol a[data-src]').each((_, el) => {
    const s = $(el).attr('data-src');
    if (s) ids.add(s.replace(/^#\/?/, ''));
  });
  return ids.size;
}

const base = 'https://en.onepiece-cardgame.com/cardlist/?series=569113';
console.log('all', await countCards(base));
for (const ill of ['Comic', 'Animation', 'Original Illustrations', 'Other']) {
  const q = `illustrations[]=${encodeURIComponent(ill)}`;
  console.log(ill, await countCards(`${base}&${q}`));
}
