import { formatDecimalAmount } from './format';
import type { ClothingItem } from '../types';

/** Header row, in column order. */
export const CSV_HEADER = [
  'id',
  'date',
  'item',
  'purchasePrice',
  'salePrice',
  'profit',
] as const;

/** RFC 4180 line ending. */
const LINE_ENDING = '\r\n';

/** Values needing quotes: a delimiter, a quote, a newline, or edge whitespace. */
const MUST_QUOTE = /[",\r\n]|^ | $/;

/**
 * Escapes one field. Interior quotes are doubled and the whole field is wrapped
 * in quotes when it contains a delimiter, quote, newline, or edge whitespace.
 */
export function escapeCsvValue(value: string): string {
  if (value === '') return '';
  if (!MUST_QUOTE.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

/** Serialises a single item as a CSV row, without a trailing line ending. */
export function toCsvRow(item: ClothingItem): string {
  const sold = item.salePriceCents !== null;
  const profit = sold ? item.salePriceCents - item.purchasePriceCents : null;
  return [
    item.id,
    escapeCsvValue(item.date),
    escapeCsvValue(item.item),
    formatDecimalAmount(item.purchasePriceCents),
    sold ? formatDecimalAmount(item.salePriceCents) : '',
    profit === null ? '' : formatDecimalAmount(profit),
  ].join(',');
}

/**
 * Serialises every item to CSV, header row first, CRLF terminated, sorted
 * newest first. An empty list still yields the header row. A trailing `\r\n`
 * is added so the profit/loss column reads cleanly in spreadsheets.
 */
export function toCsv(items: readonly ClothingItem[]): string {
  const rows = [CSV_HEADER.join(','), ...items.map(toCsvRow)];
  return rows.join(LINE_ENDING) + LINE_ENDING;
}

/** `clothing-2026-03-04.csv` — safe on every platform. */
export function csvFilename(now: Date = new Date()): string {
  const iso = now.toISOString().slice(0, 10);
  return `clothing-${iso}.csv`;
}

/** Human summary used for the live-region announcement after an export. */
export function describeExport(items: readonly ClothingItem[]): string {
  if (items.length === 0) return 'Nothing to export yet.';
  const label = items.length === 1 ? 'item' : 'items';
  const sold = items.filter((item) => item.salePriceCents !== null).length;
  const profit = items.reduce(
    (sum, item) =>
      sum + (item.salePriceCents === null ? 0 : item.salePriceCents - item.purchasePriceCents),
    0,
  );
  return `Exported ${items.length} ${label}, ${sold} sold, total profit ${formatDecimalAmount(
    profit,
  )}.`;
}