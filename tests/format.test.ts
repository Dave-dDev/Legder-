import { describe, expect, it } from 'vitest';
import {
  formatAmount,
  formatDate,
  formatDecimalAmount,
  formatMonth,
  formatPercent,
} from '../src/core/format';

describe('formatAmount', () => {
  it('renders cents as a two-decimal amount', () => {
    expect(formatAmount(0)).toBe('0.00');
    expect(formatAmount(5)).toBe('0.05');
    expect(formatAmount(1250)).toBe('12.50');
    expect(formatAmount(100)).toBe('1.00');
  });

  it('groups thousands', () => {
    expect(formatAmount(123456789)).toBe('1,234,567.89');
  });

  it('handles negatives', () => {
    expect(formatAmount(-500)).toBe('-5.00');
  });
});

describe('formatDecimalAmount', () => {
  it('omits the thousands separator for machine-readable output', () => {
    expect(formatDecimalAmount(123456789)).toBe('1234567.89');
    expect(formatDecimalAmount(5)).toBe('0.05');
    expect(formatDecimalAmount(100)).toBe('1.00');
    expect(formatDecimalAmount(-500)).toBe('-5.00');
  });
});

describe('formatMonth', () => {
  it('shortens a YYYY-MM key', () => {
    expect(formatMonth('2026-03')).toBe('Mar 2026');
    expect(formatMonth('2026-12')).toBe('Dec 2026');
  });

  it('passes malformed keys through', () => {
    expect(formatMonth('2026-13')).toBe('2026-13');
    expect(formatMonth('nope')).toBe('nope');
  });
});

describe('formatDate', () => {
  it('formats an ISO date for display', () => {
    expect(formatDate('2026-03-04')).toBe('4 Mar 2026');
  });
});

describe('formatPercent', () => {
  it('rounds a share to a whole percent', () => {
    expect(formatPercent(0)).toBe('0%');
    expect(formatPercent(0.625)).toBe('63%');
    expect(formatPercent(1)).toBe('100%');
  });
});
