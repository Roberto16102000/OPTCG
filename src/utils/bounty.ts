export function bountyFromProgress(owned: number, total: number): number {
  return Math.round((owned / Math.max(total, 1)) * 999_999_999);
}

/** Format USD market total as bounty display (฿ prefix, always with decimals). */
export function formatBounty(n: number): string {
  if (n >= 1e9) return `฿ ${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `฿ ${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `฿ ${(n / 1e3).toFixed(2)}K`;
  return `฿ ${n.toFixed(2)}`;
}

export function bountyFromCollectionUsd(
  entries: { cardId: string; quantity: number }[],
  priceByCardId: Record<string, number | undefined>
): number {
  return entries.reduce((sum, e) => {
    const unit = priceByCardId[e.cardId] ?? 0;
    return sum + unit * e.quantity;
  }, 0);
}
