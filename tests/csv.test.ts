import { describe, expect, it } from 'vitest';
import {
  CSV_HEADER,
  csvFilename,
  describeExport,
  escapeCsvValue,
  toCsv,
  toCsvRow,
} from '../src/core/csv';
import { item } from './helpers';

describe('escapeCsvValue', () => {
  it('leaves plain values unquoted', () => {
    expect(escapeCsvValue('Jacket')).toBe('Jacket');
    expect(escapeCsvValue('2026-03-04')).toBe('2026-03-04');
    expect(escapeCsvValue('')).toBe('');
  });

  it('quotes values containing a comma', () => {
    expect(escapeCsvValue('Jacket, wool')).toBe('"Jacket, wool"');
  });

  it('doubles embedded quotes and wraps the field', () => {
    expect(escapeCsvValue('The "Blue" Sale')).toBe('"The ""Blue"" Sale"');
  });

  it('quotes and preserves line breaks', () => {
    expect(escapeCsvValue('line one\nline two')).toBe('"line one\nline two"');
    expect(escapeCsvValue('carriage\r\nreturn')).toBe('"carriage\r\nreturn"');
  });

  it('quotes leading or trailing whitespace so it is not trimmed away', () => {
    expect(escapeCsvValue(' padded ')).toBe('" padded "');
  });
});

describe('toCsvRow', () => {
  it('writes id, date, item and exact ungrouped amounts', () => {
    const row = toCsvRow(
      item({ id: 'item-1', date: '2026-03-04', item: 'Jacket', purchasePriceCents: 123456, salePriceCents: 156789 }),
    );
    expect(row).toBe('item-1,2026-03-04,Jacket,1234.56,1567.89,333.33');
  });

  it('leaves sale and profit blank for unsold stock', () => {
    const row = toCsvRow(item({ id: 'unsold', salePriceCents: null }));
    expect(row.split(',')).toEqual(['unsold', '2026-01-15', 'Vintage denim jacket', '20.00', '', '']);
  });
});

describe('toCsv', () => {
  it('emits a header row even with no items', () => {
    expect(toCsv([])).toBe(`${CSV_HEADER.join(',')}\r\n`);
  });

  it('writes CRLF line endings after every row', () => {
    const csv = toCsv([item()]);
    expect(csv.endsWith('\r\n')).toBe(true);
    expect(csv.split('\r\n').filter(Boolean)).toHaveLength(2);
  });

  it('exports the computed profit as an exact, ungrouped number', () => {
    const csv = toCsv([item({ purchasePriceCents: 2000, salePriceCents: 3500 })]);
    expect(csv).toContain(',20.00,35.00,15.00');
  });

  it('keeps a hostile item on a single logical row', () => {
    const csv = toCsv([
      item({
        item: 'Jacket, "Grand"\ncheckout',
        purchasePriceCents: 9999,
        salePriceCents: 10000,
      }),
    ]);
    expect(csv.split('\r\n').filter(Boolean)).toHaveLength(2);
    expect(csv).toContain('"Jacket, ""Grand""\ncheckout"');
  });

  it('exports every item it is given, in order', () => {
    const rows = [toCsvRow(item({ id: 'a' })), toCsvRow(item({ id: 'b' }))];
    expect(toCsv([item({ id: 'a' }), item({ id: 'b' })]).split('\r\n').filter(Boolean)).toEqual([
      CSV_HEADER.join(','),
      ...rows,
    ]);
  });
});

describe('csvFilename', () => {
  it('derives a dated filename', () => {
    expect(csvFilename(new Date('2026-03-04T10:00:00Z'))).toBe('clothing-2026-03-04.csv');
  });
});

describe('describeExport', () => {
  it('reports nothing for an empty line', () => {
    expect(describeExport([])).toBe('Nothing to export yet.');
  });

  it('summarises the count, sold items and total profit', () => {
    const items = [
      item({ id: 'a', purchasePriceCents: 1000, salePriceCents: 1500 }),
      item({ id: 'b', purchasePriceCents: 2000, salePriceCents: null }),
    ];
    expect(describeExport(items)).toBe('Exported 2 items, 1 sold, total profit 5.00.');
  });

  it('uses the singular form for a single item', () => {
    expect(describeExport([item()])).toBe('Exported 1 item, 1 sold, total profit 15.00.');
  });
});