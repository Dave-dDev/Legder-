/**
 * Deterministic number and date formatting.
 *
 * Amounts are handled as integer cents everywhere else in the app, so all
 * formatting here is a pure presentational concern. Grouping is done by hand
 * rather than via `Intl` to keep output stable across runtimes and locales.
 */

const GROUP_SEPARATOR = /\B(?=(\d{3})+(?!\d))/g;

/** `12345` -> `"123.45"`, `1234567` -> `"12,345.67"`, `-500` -> `"-5.00"`. */
export function formatAmount(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const absolute = Math.abs(Math.trunc(cents));
  const whole = String(Math.floor(absolute / 100)).replace(GROUP_SEPARATOR, ',');
  const fraction = String(absolute % 100).padStart(2, '0');
  return `${sign}${whole}.${fraction}`;
}

/**
 * Same value, but with no thousands separator. Required for machine-readable
 * output: a grouped `1,234.56` would be split into two columns by a
 * spreadsheet unless it were quoted.
 */
export function formatDecimalAmount(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const absolute = Math.abs(Math.trunc(cents));
  return `${sign}${Math.floor(absolute / 100)}.${String(absolute % 100).padStart(2, '0')}`;
}

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/** `2026-03` -> `"Mar 2026"`. Returns the input unchanged if it is malformed. */
export function formatMonth(month: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return month;
  const year = match[1] as string;
  const index = Number(match[2] as string) - 1;
  const name = MONTH_NAMES[index];
  return name === undefined ? month : `${name} ${year}`;
}

/** `2026-03-04` -> `"4 Mar 2026"`, for the records table. */
export function formatDate(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return date;
  const month = formatMonth(`${match[1] as string}-${match[2] as string}`);
  const [, year, , day] = match;
  return `${Number(day)} ${month.slice(0, 3)} ${year}`;
}

/** `2026-03-04` -> `"Wed, 4 Mar 2026"`, used for accessible chart labels. */
export function formatDateLong(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return date;
  const [, year, month, day] = match;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** `0.42` -> `"42%"`. */
export function formatPercent(share: number): string {
  return `${Math.round(share * 100)}%`;
}
