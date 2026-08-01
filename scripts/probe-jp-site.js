import * as cheerio from 'cheerio';

const JP = 'https://www.onepiece-cardgame.com';
const EN = 'https://en.onepiece-cardgame.com';

async function packIds(base) {
  const html = await (await fetch(`${base}/cardlist/`)).text();
  const $ = cheerio.load(html);
  const ids = [];
  $('#series option').each((_, el) => {
    const v = $(el).attr('value');
    if (v && /^\d+$/.test(v)) ids.push(v);
  });
  return ids;
}

const enIds = await packIds(EN);
const jpIds = await packIds(JP);
console.log('EN packs', enIds.length, 'JP packs', jpIds.length);
console.log('same first 5', enIds.slice(0, 5), jpIds.slice(0, 5));

// compare OP01 card image paths
for (const [label, base, series] of [
  ['EN', EN, '569101'],
  ['JP', JP, '550101'],
]) {
  const html = await (await fetch(`${base}/cardlist/?series=${series}`)).text();
  const $ = cheerio.load(html);
  const sample = [];
  $('div.resultCol a[data-src]').slice(0, 3).each((_, el) => {
    const id = ($(el).attr('data-src') || '').replace('#', '');
    const img = $(`dl[id="${id}"]`).find('dd .frontCol img').attr('data-src');
    sample.push({ id, img });
  });
  console.log(label, series, sample);
}
