import type { ClothingItem, ItemProfit, MonthlyTotal } from '../types';

/** True when the item has been sold (it has a sale price). */
export function isSold(item: ClothingItem): boolean {
  return item.salePriceCents !== null;
}

/** Realised profit in cents, or `null` while the item is in stock. */
export function profitCents(item: ClothingItem): number | null {
  if (item.salePriceCents === null) return null;
  return item.salePriceCents - item.purchasePriceCents;
}

/** Total money spent acquiring the whole line, in cents. */
export function totalInvested(items: readonly ClothingItem[]): number {
  return items.reduce((sum, item) => sum + item.purchasePriceCents, 0);
}

/** Total money taken in from sales, in cents. */
export function totalRevenue(items: readonly ClothingItem[]): number {
  return items.reduce(
    (sum, item) => sum + (item.salePriceCents ?? 0),
    0,
  );
}

/** Realised profit across sold items, in cents. Unsold stock contributes 0. */
export function totalProfit(items: readonly ClothingItem[]): number {
  return items.reduce(
    (sum, item) => sum + (item.salePriceCents === null ? 0 : item.salePriceCents - item.purchasePriceCents),
    0,
  );
}

export function itemCount(items: readonly ClothingItem[]): number {
  return items.length;
}

export function soldCount(items: readonly ClothingItem[]): number {
  return items.filter(isSold).length;
}

export function unsoldCount(items: readonly ClothingItem[]): number {
  return items.length - soldCount(items);
}

/**
 * Profit margin over sold items: `profit ÷ revenue`, as a 0..1 fraction, or
 * `null` when there have been no sales yet.
 */
export function profitMargin(items: readonly ClothingItem[]): number | null {
  const revenue = totalRevenue(items);
  if (revenue === 0) return null;
  return totalProfit(items) / revenue;
}

/** Newest first; ties broken by amount so the order is deterministic. */
export function sortByDateDesc(items: readonly ClothingItem[]): ClothingItem[] {
  return [...items].sort((a, b) =>
    a.date === b.date ? b.purchasePriceCents - a.purchasePriceCents : b.date.localeCompare(a.date),
  );
}

/** Realised profit by garment name, most profitable first. */
export function byItemProfit(items: readonly ClothingItem[]): ItemProfit[] {
  const buckets = new Map<string, { totalCents: number; count: number }>();
  for (const item of items) {
    const profit = profitCents(item);
    if (profit === null) continue;
    const bucket = buckets.get(item.item);
    if (bucket) {
      bucket.totalCents += profit;
      bucket.count += 1;
    } else {
      buckets.set(item.item, { totalCents: profit, count: 1 });
    }
  }

  const total = totalProfit(items);
  return [...buckets.entries()]
    .map(([item, { totalCents, count }]) => ({
      item,
      totalCents,
      count,
      share: total === 0 ? 0 : totalCents / total,
    }))
    .sort((a, b) =>
      a.totalCents === b.totalCents
        ? a.item.localeCompare(b.item)
        : b.totalCents - a.totalCents,
    );
}

/**
 * Per-month activity for items first bought in that month: money spent and
 * money taken in. Oldest first. Months with no activity are omitted.
 */
export function byMonth(items: readonly ClothingItem[]): MonthlyTotal[] {
  const buckets = new Map<string, { investedCents: number; revenueCents: number; count: number }>();
  for (const item of items) {
    const month = item.date.slice(0, 7);
    const bucket = buckets.get(month);
    if (bucket) {
      bucket.investedCents += item.purchasePriceCents;
      bucket.revenueCents += item.salePriceCents ?? 0;
      bucket.count += 1;
    } else {
      buckets.set(month, {
        investedCents: item.purchasePriceCents,
        revenueCents: item.salePriceCents ?? 0,
        count: 1,
      });
    }
  }

  return [...buckets.entries()]
    .map(([month, { investedCents, revenueCents, count }]) => ({
      month,
      investedCents,
      revenueCents,
      count,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

/** Steps a `YYYY-MM` key forward by one month. */
export function addMonths(month: string, delta: number): string {
  const [yearPart = '0', monthPart = '0'] = month.split('-');
  const year = Number(yearPart);
  const index = Number(monthPart) - 1 + delta;
  const nextYear = year + Math.floor(index / 12);
  const nextMonth = ((index % 12) + 12) % 12;
  return `${String(nextYear).padStart(4, '0')}-${String(nextMonth + 1).padStart(2, '0')}`;
}

/** Inclusive list of `YYYY-MM` keys between two months. */
export function monthRange(from: string, to: string): string[] {
  if (from > to) return [];
  const months: string[] = [];
  for (let cursor = from; cursor <= to; cursor = addMonths(cursor, 1)) {
    months.push(cursor);
    if (months.length > 600) break; // 50 years of guard against a bad key
  }
  return months;
}

/**
 * Inserts zero-activity months so a sparse history still reads as a continuous
 * chart. When the range would exceed `maxMonths`, the window slides to the
 * most recent `maxMonths` buckets.
 */
export function withZeroFilledMonths(
  monthly: readonly MonthlyTotal[],
  maxMonths = 12,
): MonthlyTotal[] {
  if (monthly.length === 0) return [];

  const all = [...monthly].sort((a, b) => a.month.localeCompare(b.month));
  const first = all[0]?.month;
  const last = all[all.length - 1]?.month;
  if (first === undefined || last === undefined) return [];

  const full = monthRange(first, last);
  if (full.length > maxMonths) {
    full.splice(0, full.length - maxMonths);
  }

  const index = new Map(all.map((entry) => [entry.month, entry]));
  return full.map(
    (month) => index.get(month) ?? { month, investedCents: 0, revenueCents: 0, count: 0 },
  );
}