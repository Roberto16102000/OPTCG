import * as cheerio from 'cheerio';

export const BASE_EN = 'https://en.onepiece-cardgame.com';
export const BASE_JP = 'https://www.onepiece-cardgame.com';

/** Colecciones solo en el sitio japonés, sin cardlist EN. OP-16 y ST-30 ya están en EN. */
export const JP_ONLY_PACKS = [];

const JP_COLOR_MAP = {
  赤: 'Red',
  緑: 'Green',
  青: 'Blue',
  紫: 'Purple',
  黒: 'Black',
  黄: 'Yellow',
};

export function cleanText(value) {
  return (value || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Misma lógica que formatSetDisplayName en src/utils/cards.ts */
export function cleanPackTitle(html) {
  let s = cleanText(html);
  if (!s) return s;
  const rawCategory = s;
  const prefixes = [
    /^BOOSTER PACK\s*/i,
    /^ブースターパック\s*/,
    /^STARTER DECK(?: EX)?\s*/i,
    /^スターターデッキ\s*/,
    /^EXTRA BOOSTER\s*/i,
    /^PREMIUM BOOSTER\s*/i,
    /^ULTRA DECK\s*/i,
    /^ULTIMATE DECK\s*/i,
    /^Promotion card\s*/i,
    /^Other Product Card\s*/i,
    /^Family Deck Set\s*/i,
    /^Limited Product Card\s*/i,
  ];
  for (const prefix of prefixes) {
    s = s.replace(prefix, '');
  }
  s = s.replace(/^\s*-\s*/, '').trim();
  if (!s) return rawCategory;
  const bracket = s.match(/\[([^\]]+)\]\s*$/) || s.match(/【([^】]+)】\s*$/);
  if (!bracket) return s;
  const code = bracket[1].trim();
  let title = s.slice(0, bracket.index).trim().replace(/^-\s*/, '').replace(/\s*-\s*$/, '');
  if (!title) return `[${code}]`;
  return `${title} [${code}]`;
}

function stripAnyPrefix(value, prefixes) {
  if (!value) return '';
  for (const prefix of prefixes) {
    if (value.startsWith(prefix)) return value.slice(prefix.length);
  }
  return value;
}

export function normalizeJpColor(raw) {
  const stripped = (raw || '').replace(/^色/, '').trim();
  if (!stripped) return '';
  return stripped
    .split('/')
    .map((part) => JP_COLOR_MAP[part.trim()] || part.trim())
    .join('/');
}

/** Normaliza campos JP para el catálogo (colores EN, nombre de set EN). */
export function normalizeJpCard(card, pack) {
  const cost = (card.cost || '').replace(/^ライフ/, 'Life');
  const power = (card.power || '').replace(/^パワー/, 'Power');
  const counter = (card.counter || '').replace(/^カウンター/, 'Counter');

  return {
    ...card,
    cost,
    power,
    counter,
    color: normalizeJpColor(card.color),
    family: (card.family || '').replace(/^特徴/, '').trim(),
    ability: (card.ability || '').replace(/^テキスト/, '').trim(),
    trigger: card.trigger?.replace(/^トリガー/, '').trim() || card.trigger,
    set: { name: pack.titleEn },
  };
}

const ILLUSTRATION_TYPES = [
  'Comic',
  'Animation',
  'Original Illustrations',
  'Other',
];

function collectCardIdsFromHtml(html) {
  const $ = cheerio.load(html);
  const ids = [];
  $('div.resultCol a[data-src]').each((_, el) => {
    const src = $(el).attr('data-src') || '';
    const id = src.replace(/^#\/?/, '').replace(/^cardlist\//, '');
    if (id && !ids.includes(id)) ids.push(id);
  });
  return ids;
}

export function createScraper(base) {
  const cardlist = `${base}/cardlist/`;
  const isJp = base.includes('www.onepiece-cardgame.com');

  function toImageUrl(relative) {
    if (!relative) return '';
    const path = relative.replace(/^\.\.\//, '').replace(/^\//, '');
    return `${base}/${path}`;
  }

  function fieldText($, dl, selector) {
    const raw = dl.find(selector).first().text();
    return cleanText(raw);
  }

  function parseCard($, cardId, packTitle) {
    const dl = $(`dl[id="${cardId}"]`);
    if (!dl.length) return null;

    const spans = dl
      .find('dt .infoCol span')
      .map((_, el) => $(el).text().trim())
      .get();

    const imgRel = dl.find('dd .frontCol img').attr('data-src');
    const imageUrl = toImageUrl(imgRel);

    const color = stripAnyPrefix(fieldText($, dl, 'dd .backCol .color'), [
      'Color',
      '色',
    ]);
    const family = stripAnyPrefix(fieldText($, dl, 'dd .backCol .feature'), [
      'Type',
      '特徴',
    ]);
    const ability = stripAnyPrefix(fieldText($, dl, 'dd .backCol .text'), [
      'Effect',
      'テキスト',
    ]);
    const triggerRaw = fieldText($, dl, 'dd .backCol .trigger');
    const trigger =
      triggerRaw && triggerRaw !== '-'
        ? stripAnyPrefix(triggerRaw, ['Trigger', 'トリガー'])
        : '';

    const costRaw = fieldText($, dl, 'dd .backCol .col2 .cost');
    const powerRaw = fieldText($, dl, 'dd .backCol .col2 .power');
    const counterRaw = fieldText($, dl, 'dd .backCol .col2 .counter');

    const cost = costRaw && costRaw !== '-' ? costRaw : '';
    const power = powerRaw && powerRaw !== '-' ? powerRaw : '';
    const counter = counterRaw && counterRaw !== '-' ? counterRaw : '-';

    return {
      id: cardId,
      code: spans[0] || cardId,
      rarity: spans[1] || '',
      type: spans[2] || '',
      name: dl.find('dt .cardName').first().text().trim(),
      images: {
        small: imageUrl,
        large: imageUrl,
      },
      cost,
      power,
      counter,
      color,
      family,
      ability,
      trigger: trigger || undefined,
      set: { name: packTitle },
    };
  }

  async function fetchPackIds() {
    const html = await (await fetch(cardlist)).text();
    const $ = cheerio.load(html);
    const packs = [];
    $('#series option').each((_, el) => {
      const id = $(el).attr('value');
      if (id && /^\d+$/.test(id)) {
        packs.push({
          id,
          title: cleanPackTitle($(el).html() || ''),
        });
      }
    });
    return packs;
  }

  async function fetchPackIllustrationMap(packId) {
    const map = new Map();
    for (const ill of ILLUSTRATION_TYPES) {
      const url = `${cardlist}?series=${packId}&illustrations[]=${encodeURIComponent(ill)}`;
      const html = await (await fetch(url)).text();
      for (const id of collectCardIdsFromHtml(html)) {
        if (!map.has(id)) map.set(id, ill);
      }
    }
    return map;
  }

  async function fetchPackCards(packId, packTitle, options = {}) {
    const { skipIllustrations = false } = options;
    const url = `${cardlist}?series=${packId}`;
    const html = await (await fetch(url)).text();
    const $ = cheerio.load(html);

    const title =
      packTitle ||
      cleanPackTitle($(`#series option[value="${packId}"]`).html() || '') ||
      packId;

    const cardIds = collectCardIdsFromHtml(html);
    const illustrationMap = skipIllustrations
      ? new Map()
      : await fetchPackIllustrationMap(packId);

    const cards = [];
    for (const cardId of cardIds) {
      const card = parseCard($, cardId, title);
      if (card) {
        card.illustrationType = illustrationMap.get(cardId);
        cards.push(card);
      }
    }
    return cards;
  }

  return {
    base,
    isJp,
    cardlist,
    fetchPackIds,
    fetchPackCards,
    parseCard,
    toImageUrl,
  };
}

const enScraper = createScraper(BASE_EN);

export const fetchPackIds = enScraper.fetchPackIds;
export const fetchPackCards = enScraper.fetchPackCards;
export const parseCard = enScraper.parseCard;
export const toImageUrl = enScraper.toImageUrl;

export function mergeCatalog(byId, cards, options = {}) {
  const { replace = false } = options;
  for (const card of cards) {
    if (!byId.has(card.id) || replace) {
      byId.set(card.id, card);
    }
  }
}
