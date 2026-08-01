import type { OnePieceCard } from '../types/card';

export function stripCardHtml(html: string): string {
  return html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');
}

function stripPrefix(value: string | number | undefined, prefix: string): string {
  if (value === undefined || value === null || value === '') return '-';
  const s = String(value).trim();
  if (s.startsWith(prefix)) {
    const rest = s.slice(prefix.length).trim();
    return rest || '-';
  }
  return s;
}

export function formatCardMetaLine(card: OnePieceCard): string {
  return `${card.code} | ${card.rarity} | ${card.type}`;
}

export type StatCell = { label: string; value: string };

function hasStatValue(value: string): boolean {
  return Boolean(value && value !== '-');
}

/** Fixed 2×2 grid (legacy layout). */
export function getCardStatGrid(card: OnePieceCard): StatCell[][] {
  const cells = getCardStatCells(card);
  const row1 = cells.slice(0, 2);
  const row2 = cells.slice(2);
  while (row1.length < 2) row1.push({ label: '', value: '' });
  while (row2.length < 2) row2.push({ label: '', value: '' });
  return [row1, row2];
}

/** Only stats with values — no empty Counter slot. */
export function getCardStatCells(card: OnePieceCard): StatCell[] {
  const isLeader = card.type === 'LEADER';
  const counter = stripPrefix(card.counter, 'Counter');
  const cells: StatCell[] = [
    {
      label: isLeader ? 'Life' : 'Cost',
      value: isLeader ? stripPrefix(card.cost, 'Life') : stripPrefix(card.cost, 'Cost'),
    },
    { label: 'Power', value: stripPrefix(card.power, 'Power') },
    { label: 'Color', value: card.color?.trim() || '—' },
  ];
  if (hasStatValue(counter)) {
    cells.push({ label: 'Counter', value: counter });
  }
  return cells.filter((c) => hasStatValue(c.value));
}
