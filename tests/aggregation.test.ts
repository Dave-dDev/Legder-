import { describe, expect, it } from 'vitest';
import {
  addMonths,
  byItemProfit,
  byMonth,
  isSold,
  itemCount,
  monthRange,
  profitCents,
  profitMargin,
  soldCount,
  sortByDateDesc,
  totalInvested,
  totalProfit,
  totalRevenue,
  unsoldCount,
  withZeroFilledMonths,
} from '../src/core/aggregation';
import { item } from './helpers';

describe('totals', () => {
  it('returns zero for an empty list', () => {
    expect(totalInvested([])).toBe(0);
    expect(totalRevenue([])).toBe(0);
    expect(totalProfit([])).toBe(0);
    expect(itemCount([])).toBe(0);
    expect(profitMargin([])).toBeNull();
  });

  it('sums exact cents without floating point drift', () => {
    const items = [
      item({ purchasePriceCents: 1000, salePriceCents: 1400 }),
      item({ purchasePriceCents: 2000, salePriceCents: 3000 }),
      item({ purchasePriceCents: 3000, salePriceCents: null }),
    ];
    expect(totalInvested(items)).toBe(6000);
    expect(totalRevenue(items)).toBe(4400);
    expect(totalProfit(items)).toBe(1400);
    expect(itemCount(items)).toBe(3);
    expect(soldCount(items)).toBe(2);
    expect(unsoldCount(items)).toBe(1);
  });

  it('treats unsold stock as zero revenue and zero profit', () => {
    const items = [item({ purchasePriceCents: 500, salePriceCents: null })];
    expect(totalRevenue(items)).toBe(0);
    expect(totalProfit(items)).toBe(0);
  });
});

describe('isSold and profitCents', () => {
  it('mirrors whether the item has a sale price', () => {
    expect(isSold(item())).toBe(true);
    expect(profitCents(item({ purchasePriceCents: 2000, salePriceCents: 3500 }))).toBe(1500);
    expect(profitCents(item({ purchasePriceCents: 2000, salePriceCents: 1000 }))).toBe(-1000);
  });

  it('returns null while the item is in stock', () => {
    expect(isSold(item({ salePriceCents: null }))).toBe(false);
    expect(profitCents(item({ salePriceCents: null }))).toBeNull();
  });
});

describe('profitMargin', () => {
  it('computes profit over the revenue of sold items', () => {
    const items = [
      item({ purchasePriceCents: 1000, salePriceCents: 1500 }),
      item({ purchasePriceCents: 1000, salePriceCents: 1500 }),
      item({ purchasePriceCents: 1000, salePriceCents: null }),
    ];
    expect(profitMargin(items)).toBeCloseTo(0.3333, 3);
  });

  it('is null when nothing has sold yet', () => {
    expect(profitMargin([item({ purchasePriceCents: 100, salePriceCents: null })])).toBeNull();
  });
});

describe('byItemProfit', () => {
  it('returns nothing for an empty list', () => {
    expect(byItemProfit([])).toEqual([]);
  });

  it('groups realised profit per garment name, most profitable first', () => {
    const result = byItemProfit([
      item({ item: 'Jacket', purchasePriceCents: 2000, salePriceCents: 4500 }),
      item({ item: 'Jacket', purchasePriceCents: 1000, salePriceCents: 1500 }),
      item({ item: 'Shirt', purchasePriceCents: 500, salePriceCents: 900 }),
      item({ item: 'Trousers', purchasePriceCents: 800, salePriceCents: null }),
    ]);

    expect(result).toEqual([
      { item: 'Jacket', totalCents: 3000, count: 2, share: 0.8823529411764706 },
      { item: 'Shirt', totalCents: 400, count: 1, share: 0.11764705882352941 },
    ]);
  });

  it('ignores unsold stock and exposes losses as negative totals', () => {
    const soldCheap = item({ item: 'Skirt', purchasePriceCents: 1000, salePriceCents: 400 });
    const result = byItemProfit([soldCheap, item({ item: 'Skirt', salePriceCents: null })]);
    expect(result).toEqual([{ item: 'Skirt', totalCents: -600, count: 1, share: 1 }]);
  });

  it('breaks ties alphabetically so rendering is deterministic', () => {
    const result = byItemProfit([
      item({ item: 'Tee', purchasePriceCents: 100, salePriceCents: 200 }),
      item({ item: 'Cap', purchasePriceCents: 100, salePriceCents: 200 }),
    ]);
    expect(result.map((entry) => entry.item)).toEqual(['Cap', 'Tee']);
  });
});

describe('byMonth', () => {
  it('returns nothing for an empty list', () => {
    expect(byMonth([])).toEqual([]);
  });

  it('groups invested vs revenue by purchase month, oldest first', () => {
    const result = byMonth([
      item({ date: '2026-02-28', purchasePriceCents: 2000, salePriceCents: 2500 }),
      item({ date: '2026-01-31', purchasePriceCents: 1000, salePriceCents: null }),
      item({ date: '2026-01-01', purchasePriceCents: 500, salePriceCents: 300 }),
    ]);

    expect(result).toEqual([
      { month: '2026-01', investedCents: 1500, revenueCents: 300, count: 2 },
      { month: '2026-02', investedCents: 2000, revenueCents: 2500, count: 1 },
    ]);
  });

  it('crosses a year boundary in the right order', () => {
    const result = byMonth([
      item({ date: '2026-01-05' }),
      item({ date: '2025-12-31' }),
      item({ date: '2025-11-01' }),
    ]);
    expect(result.map((entry) => entry.month)).toEqual(['2025-11', '2025-12', '2026-01']);
  });
});

describe('month arithmetic', () => {
  it('addMonths rolls over the year in both directions', () => {
    expect(addMonths('2026-01', 1)).toBe('2026-02');
    expect(addMonths('2026-11', 3)).toBe('2027-02');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2026-01', -13)).toBe('2024-12');
  });

  it('monthRange is inclusive at both ends', () => {
    expect(monthRange('2025-11', '2026-02')).toEqual([
      '2025-11',
      '2025-12',
      '2026-01',
      '2026-02',
    ]);
  });

  it('monthRange returns nothing when the range is inverted', () => {
    expect(monthRange('2026-05', '2026-01')).toEqual([]);
  });
});

describe('withZeroFilledMonths', () => {
  it('fills the gap between sparse months', () => {
    const result = withZeroFilledMonths([
      { month: '2026-01', investedCents: 1000, revenueCents: 500, count: 1 },
      { month: '2026-04', investedCents: 4000, revenueCents: 2000, count: 2 },
    ]);
    expect(result).toEqual([
      { month: '2026-01', investedCents: 1000, revenueCents: 500, count: 1 },
      { month: '2026-02', investedCents: 0, revenueCents: 0, count: 0 },
      { month: '2026-03', investedCents: 0, revenueCents: 0, count: 0 },
      { month: '2026-04', investedCents: 4000, revenueCents: 2000, count: 2 },
    ]);
  });

  it('returns nothing for no records', () => {
    expect(withZeroFilledMonths([])).toEqual([]);
  });

  it('slides the window to the most recent months when the span is too long', () => {
    const result = withZeroFilledMonths(
      [
        { month: '2024-01', investedCents: 1, revenueCents: 0, count: 1 },
        { month: '2026-06', investedCents: 2, revenueCents: 1, count: 1 },
      ],
      3,
    );
    expect(result.map((entry) => entry.month)).toEqual(['2026-04', '2026-05', '2026-06']);
  });
});

describe('sortByDateDesc', () => {
  it('orders newest first and does not mutate the input', () => {
    const input = [
      item({ date: '2026-01-01', purchasePriceCents: 100 }),
      item({ date: '2026-03-01', purchasePriceCents: 300 }),
      item({ date: '2026-02-01', purchasePriceCents: 200 }),
    ];
    const snapshot = [...input];
    const sorted = sortByDateDesc(input);

    expect(sorted.map((entry) => entry.date)).toEqual([
      '2026-03-01',
      '2026-02-01',
      '2026-01-01',
    ]);
    expect(input).toEqual(snapshot);
  });
});