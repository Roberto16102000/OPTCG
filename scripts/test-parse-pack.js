import * as cheerio from 'cheerio';

const packId = process.argv[2] || '569113';
const html = await (await fetch(`https://en.onepiece-cardgame.com/cardlist/?series=${packId}`)).text();
const $ = cheerio.load(html);

const packTitle = $(`#series option[value="${packId}"]`).text().replace(/\s+/g, ' ').trim();
console.log('pack', packTitle);

const cardIds = [];
$('div.resultCol a[data-src]').each((_, el) => {
  const src = $(el).attr('data-src') || '';
  const id = src.replace(/^#\/?/, '').replace(/^cardlist\//, '');
  if (id) cardIds.push(id);
});
console.log('cards', cardIds.length);

const id = cardIds.find((c) => c === 'OP13-001') || cardIds[1];
const dl = $(`dl[id="${id}"]`);
console.log('parsing', id, 'found', dl.length);
const spans = dl.find('dt .infoCol span').map((_, s) => $(s).text().trim()).get();
const imgRel = dl.find('dd .frontCol img').attr('data-src');
const img = imgRel ? `https://en.onepiece-cardgame.com${imgRel.startsWith('/') ? '' : '/'}${imgRel.replace(/^\//, '')}` : null;
console.log({
  name: dl.find('dt .cardName').first().text().trim(),
  spans,
  img,
  color: dl.find('dd .backCol .color').text().trim(),
  type: dl.find('dd .backCol .feature').text().trim(),
  effect: dl.find('dd .backCol .text').text().trim().slice(0, 80),
});
