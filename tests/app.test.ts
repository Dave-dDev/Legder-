// @vitest-environment happy-dom

/**
 * Smoke test for the DOM wiring: it mounts the real `index.html` and boots the
 * real entry point, so a missing element id or a broken event delegation fails
 * here rather than in a browser.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { STORAGE_KEY } from '../src/core/storage';
import { todayIso } from '../src/ui/form';

const indexHtml = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '..', 'index.html'),
  'utf8',
);
const bodyMarkup = /<body>([\s\S]*)<\/body>/.exec(indexHtml)?.[1] ?? '';

function control(name: string): HTMLInputElement {
  const element = document.querySelector<HTMLInputElement>(`#${name}`);
  if (!element) throw new Error(`Missing control: ${name}`);
  return element;
}

function submitForm(fields: Record<string, string>): void {
  for (const [name, value] of Object.entries(fields)) {
    control(name).value = value;
  }
  document
    .querySelector<HTMLFormElement>('#clothing-form')
    ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}

function storedItems(): unknown[] {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw === null ? [] : (JSON.parse(raw) as unknown[]);
}

beforeAll(async () => {
  document.body.innerHTML = bodyMarkup;

  // happy-dom has no object URL support; the export path only needs a stub.
  const created: string[] = [];
  Object.defineProperty(URL, 'createObjectURL', {
    value: () => {
      created.push('created');
      return 'blob:stub';
    },
    configurable: true,
  });
  Object.defineProperty(URL, 'revokeObjectURL', { value: () => undefined, configurable: true });
  void created;

  await import('../src/main');
});

describe('boot', () => {
  it('defaults the date field to today', () => {
    expect(control('date').value).toBe(todayIso());
  });

  it('starts with an empty, non-crashing dashboard', () => {
    expect(document.querySelectorAll('#records tbody tr')).toHaveLength(0);
    expect(document.querySelector('#profit-chart .empty')?.textContent).toBe(
      'No profitable sales yet.',
    );
    expect(document.querySelector('#summary .empty')).not.toBeNull();
  });
});

describe('adding items', () => {
  it('rejects an invalid purchase price and reports it inline', () => {
    submitForm({ date: '2026-03-04', item: 'Jacket', purchase: '-4', sale: '10' });

    expect(document.querySelectorAll('#records tbody tr')).toHaveLength(0);
    const error = document.querySelector('#purchase-error');
    expect(error?.textContent).toMatch(/greater than zero/);
    expect(control('purchase').getAttribute('aria-invalid')).toBe('true');
    expect(storedItems()).toHaveLength(0);
  });

  it('clears the error as soon as the field is edited', () => {
    control('purchase').dispatchEvent(new Event('input', { bubbles: true }));
    expect(document.querySelector('#purchase-error')?.textContent).toBe('');
    expect(control('purchase').hasAttribute('aria-invalid')).toBe(false);
  });

  it('adds a valid item, renders its columns, and persists it', () => {
    submitForm({
      date: '2026-03-04',
      item: 'Vintage denim jacket',
      purchase: '20.00',
      sale: '35.00',
    });

    const rows = document.querySelectorAll('#records tbody tr');
    expect(rows).toHaveLength(1);
    expect(rows[0]?.textContent).toContain('Vintage denim jacket');
    expect(rows[0]?.textContent).toContain('20.00');
    expect(rows[0]?.textContent).toContain('35.00');
    expect(rows[0]?.textContent).toContain('15.00');
    expect(storedItems()).toHaveLength(1);
  });

  it('summarises profit, revenue and stock', () => {
    const summary = document.querySelector('#summary')?.textContent ?? '';
    expect(summary).toContain('15.00');
    expect(summary).toContain('Profit');
    expect(document.querySelector('#records-count')?.textContent).toBe('1 item, newest first');
  });

  it('draws both charts from the stored item', () => {
    expect(document.querySelector('#profit-chart .donut')).not.toBeNull();
    expect(document.querySelector('#monthly-chart .trend')).not.toBeNull();
    expect(document.querySelector('#monthly-chart .visually-hidden')?.textContent).toContain(
      'Mar 2026: 20.00 invested, 35.00 sold',
    );
  });

  it('rejects an impossible date', () => {
    const date = control('date');
    date.removeAttribute('type');
    date.value = '2025-02-29';
    submitForm({ date: '2025-02-29', item: 'Shirt', purchase: '1', sale: '' });
    expect(document.querySelector('#date-error')?.textContent).toMatch(/valid date/);
    expect(storedItems()).toHaveLength(1);
  });
});

describe('deleting items', () => {
  it('removes the row, updates totals and the store', () => {
    const button = document.querySelector<HTMLButtonElement>('#records button[data-delete]');
    button?.click();

    expect(document.querySelectorAll('#records tbody tr')).toHaveLength(0);
    expect(storedItems()).toHaveLength(0);
    expect(document.querySelector('#records-count')?.textContent).toBe('No items yet');
    expect(document.querySelector('#status')?.textContent).toMatch(/^Deleted /);
  });
});

describe('CSV export', () => {
  it('refuses politely when there is nothing to export', () => {
    document.querySelector<HTMLButtonElement>('#export-button')?.click();
    expect(document.querySelector('#status')?.textContent).toMatch(/Nothing to export/);
  });

  it('downloads a dated CSV once an item exists', () => {
    let created = 0;
    Object.defineProperty(URL, 'createObjectURL', {
      value: () => {
        created += 1;
        return 'blob:stub';
      },
      configurable: true,
    });

    submitForm({
      date: '2026-03-04',
      item: 'Vintage denim jacket',
      purchase: '20.00',
      sale: '35.00',
    });
    document.querySelector<HTMLButtonElement>('#export-button')?.click();

    expect(created).toBe(1);
    expect(document.querySelector('#status')?.textContent).toMatch(/^Exported 1 item/);
  });
});