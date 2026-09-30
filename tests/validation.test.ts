import { describe, expect, it } from 'vitest';
import {
  isValidIsoDate,
  MAX_AMOUNT_CENTS,
  normalizeText,
  parseAmountToCents,
  validateDraft,
} from '../src/core/validation';
import type { ClothingDraft } from '../src/types';

function draft(overrides: Partial<ClothingDraft> = {}): ClothingDraft {
  return {
    date: '2026-03-04',
    item: 'Vintage denim jacket',
    purchase: '20.00',
    sale: '35.00',
    ...overrides,
  };
}

describe('isValidIsoDate', () => {
  it('accepts a real calendar date', () => {
    expect(isValidIsoDate('2026-03-04')).toBe(true);
    expect(isValidIsoDate('2024-02-29')).toBe(true);
  });

  it('rejects malformed and impossible dates', () => {
    expect(isValidIsoDate('')).toBe(false);
    expect(isValidIsoDate('2026-3-4')).toBe(false);
    expect(isValidIsoDate('04/03/2026')).toBe(false);
    expect(isValidIsoDate('2026-13-01')).toBe(false);
    expect(isValidIsoDate('2026-00-10')).toBe(false);
    expect(isValidIsoDate('2025-02-29')).toBe(false);
    expect(isValidIsoDate('2026-04-31')).toBe(false);
  });
});

describe('parseAmountToCents', () => {
  it('converts a decimal string to integer cents', () => {
    expect(parseAmountToCents('12.50')).toBe(1250);
    expect(parseAmountToCents('12.5')).toBe(1250);
    expect(parseAmountToCents('12')).toBe(1200);
    expect(parseAmountToCents('0.01')).toBe(1);
    expect(parseAmountToCents(' 7.25 ')).toBe(725);
  });

  it('rejects zero, negatives and non-numbers', () => {
    expect(parseAmountToCents('0')).toBeNull();
    expect(parseAmountToCents('0.00')).toBeNull();
    expect(parseAmountToCents('-5')).toBeNull();
    expect(parseAmountToCents('abc')).toBeNull();
    expect(parseAmountToCents('')).toBeNull();
    expect(parseAmountToCents('1,5')).toBeNull();
  });

  it('rejects exponent notation, hex and Infinity', () => {
    expect(parseAmountToCents('1e3')).toBeNull();
    expect(parseAmountToCents('0x10')).toBeNull();
    expect(parseAmountToCents('Infinity')).toBeNull();
    expect(parseAmountToCents('NaN')).toBeNull();
  });

  it('rejects more than two decimal places', () => {
    expect(parseAmountToCents('12.505')).toBeNull();
  });

  it('rejects amounts above the ceiling', () => {
    expect(parseAmountToCents(String(MAX_AMOUNT_CENTS / 100 + 1))).toBeNull();
  });
});

describe('normalizeText', () => {
  it('collapses whitespace and strips control characters', () => {
    expect(normalizeText('  Vintage   Jacket  ')).toBe('Vintage Jacket');
    expect(normalizeText('line one\nline two')).toBe('line one line two');
    expect(normalizeText('tab\there\u0000')).toBe('tab here');
  });
});

describe('validateDraft', () => {
  it('accepts a well formed bought-and-sold draft', () => {
    const result = validateDraft(draft());
    expect(result).toEqual({
      ok: true,
      value: {
        date: '2026-03-04',
        item: 'Vintage denim jacket',
        purchasePriceCents: 2000,
        salePriceCents: 3500,
      },
    });
  });

  it('accepts an unsold draft and stores the sale as null', () => {
    const result = validateDraft(draft({ sale: '   ' }));
    expect(result).toEqual({
      ok: true,
      value: {
        date: '2026-03-04',
        item: 'Vintage denim jacket',
        purchasePriceCents: 2000,
        salePriceCents: null,
      },
    });
  });

  it('allows a sale below cost (a loss) and does not round-trip cents', () => {
    const result = validateDraft(draft({ purchase: '30.00', sale: '10.25' }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.salePriceCents).toBe(1025);
  });

  it('requires a date', () => {
    const result = validateDraft(draft({ date: '' }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.date).toBe('Enter a date.');
  });

  it('rejects an impossible date', () => {
    const result = validateDraft(draft({ date: '2025-02-29' }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.date).toMatch(/valid date/);
  });

  it('requires a non-blank item', () => {
    const result = validateDraft(draft({ item: '   ' }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.item).toBeDefined();
  });

  it('rejects a purchase of zero or less with a specific message', () => {
    for (const purchase of ['0', '0.00', '-4.20']) {
      const result = validateDraft(draft({ purchase }));
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.purchase).toBe('Price must be greater than zero.');
    }
  });

  it('rejects three decimal places with a specific message', () => {
    const result = validateDraft(draft({ purchase: '12.505' }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.purchase).toMatch(/2 decimal places/);
  });

  it('rejects a non-numeric sale price when one is supplied', () => {
    const result = validateDraft(draft({ sale: 'twelve' }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.sale).toBeDefined();
  });

  it('rejects an over-long item note', () => {
    const result = validateDraft(draft({ item: 'x'.repeat(121) }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.item).toMatch(/120/);
  });

  it('reports every failing field at once', () => {
    const result = validateDraft(draft({ date: '', item: '', purchase: '0', sale: '-1' }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual(['date', 'item', 'purchase', 'sale']);
    }
  });
});