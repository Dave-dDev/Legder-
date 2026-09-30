import type { ClothingDraft, FieldErrors, ValidationResult } from '../types';

/** Hard ceiling of 1,000,000.00 — guards against nonsense and integer overflow. */
export const MAX_AMOUNT_CENTS = 100_000_000;
export const MAX_ITEM_LENGTH = 120;

/** Accepts `12`, `12.5`, `12.50`. Rejects signs, exponents, separators, NaN. */
const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Strips control characters and collapses runs of whitespace, then trims. */
export function normalizeText(value: string): string {
  return (
    value
      // Matching control characters is the point here: they are stripped from
      // untrusted input before it can reach a value, a chart, or a CSV cell.
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001F\u007F]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/** True only for a syntactically valid, real calendar date in ISO form. */
export function isValidIsoDate(value: string): boolean {
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  // Date.UTC silently rolls over invalid days (30 Feb -> 2 Mar), so round-trip
  // the parts and require an exact match.
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

/** Parses a positive decimal string into integer cents, or `null` if invalid. */
export function parseAmountToCents(value: string): number | null {
  const trimmed = value.trim();
  if (!AMOUNT_PATTERN.test(trimmed)) return null;

  const [wholePart = '0', fractionPart = ''] = trimmed.split('.');
  const cents = Number(wholePart) * 100 + Number(fractionPart.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents) || cents <= 0) return null;
  if (cents > MAX_AMOUNT_CENTS) return null;
  return cents;
}

function validateDate(raw: string, errors: FieldErrors): string | undefined {
  const value = raw.trim();
  if (!value) {
    errors.date = 'Enter a date.';
    return undefined;
  }
  if (!isValidIsoDate(value)) {
    errors.date = 'Enter a valid date, for example 2026-03-04.';
    return undefined;
  }
  return value;
}

function validateItem(raw: string, errors: FieldErrors): string | undefined {
  const value = normalizeText(raw);
  if (!value) {
    errors.item = 'Describe the item, for example "Vintage denim jacket".';
    return undefined;
  }
  if (value.length > MAX_ITEM_LENGTH) {
    errors.item = `Keep the item note to ${MAX_ITEM_LENGTH} characters or fewer.`;
    return undefined;
  }
  return value;
}

function validatePrice(raw: string, errors: FieldErrors, field: keyof FieldErrors): number | undefined {
  const value = raw.trim();
  if (!value) {
    errors[field] = 'Enter a price.';
    return undefined;
  }
  if (/^\d+(\.\d+)?$/.test(value) && !AMOUNT_PATTERN.test(value)) {
    errors[field] = 'Use at most 2 decimal places, e.g. 12.50.';
    return undefined;
  }
  if (/^0*(\.0*)?$/.test(value)) {
    errors[field] = 'Price must be greater than zero.';
    return undefined;
  }
  if (value.startsWith('-')) {
    errors[field] = 'Price must be greater than zero.';
    return undefined;
  }
  if (/^\d+(\.\d*)?$/.test(value) && Number(value) > MAX_AMOUNT_CENTS / 100) {
    errors[field] = 'Price is too large.';
    return undefined;
  }

  const cents = parseAmountToCents(value);
  if (cents === null) {
    errors[field] = 'Enter a valid price, e.g. 12.50.';
    return undefined;
  }
  return cents;
}

/**
 * Validates raw form strings into a storable item (minus the id, which the
 * caller generates). The sale price is optional: an empty sale means the item
 * is still in stock. Never throws: failures come back as per-field messages.
 */
export function validateDraft(draft: ClothingDraft): ValidationResult {
  const errors: FieldErrors = {};

  const date = validateDate(draft.date, errors);
  const item = validateItem(draft.item, errors);
  const purchasePriceCents = validatePrice(draft.purchase, errors, 'purchase');
  const saleRaw = draft.sale.trim();
  const salePriceCents =
    saleRaw === '' ? null : validatePrice(draft.sale, errors, 'sale');

  if (
    date === undefined ||
    item === undefined ||
    purchasePriceCents === undefined ||
    (saleRaw !== '' && salePriceCents === undefined)
  ) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      date,
      item,
      purchasePriceCents,
      salePriceCents: salePriceCents === undefined ? null : salePriceCents,
    },
  };
}