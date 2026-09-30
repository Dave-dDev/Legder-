import { byItemProfit, byMonth } from './core/aggregation';
import { csvFilename, describeExport, toCsv } from './core/csv';
import { formatAmount } from './core/format';
import { reduceItems } from './core/reducer';
import { loadItems, saveItems } from './core/storage';
import type { ClothingItem } from './types';
import { renderItemProfitChart, renderMonthlyChart } from './ui/charts';
import { downloadTextFile } from './ui/download';
import { createFormView } from './ui/form';
import { createClothingView } from './ui/list';
import { renderSummary } from './ui/summary';
import './styles.css';

const form = document.querySelector<HTMLFormElement>('#clothing-form')!;
const summary = document.querySelector<HTMLElement>('#summary')!;
const profitChart = document.querySelector<HTMLElement>('#profit-chart')!;
const monthlyChart = document.querySelector<HTMLElement>('#monthly-chart')!;
const records = document.querySelector<HTMLElement>('#records')!;
const recordsCount = document.querySelector<HTMLElement>('#records-count')!;
const exportButton = document.querySelector<HTMLButtonElement>('#export-button')!;
const status = document.querySelector<HTMLElement>('#status');

function announce(message: string): void {
  if (status) status.textContent = message;
}

const storage = (() => {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
})();

if (storage === null) {
  announce('Browser storage is unavailable, so items will not persist.');
}

let items: readonly ClothingItem[] = loadItems(storage);

/** Persists a new state, then re-renders every region in one pass. */
function commit(next: readonly ClothingItem[]): void {
  items = next;
  saveItems(items, storage);
  renderAll();
}

function renderAll(): void {
  const listed = [...items];
  renderSummary(summary, listed);
  renderItemProfitChart(profitChart, byItemProfit(listed));
  renderMonthlyChart(monthlyChart, byMonth(listed));
  recordsView.render(listed);
}

const recordsView = createClothingView(records, recordsCount);

records.addEventListener('item:delete', (event) => {
  const id = (event as CustomEvent<string>).detail;
  const removed = items.find((item) => item.id === id);
  commit(reduceItems(items, { type: 'remove', id }));
  if (removed) {
    announce(
      `Deleted ${removed.item} bought ${removed.date} for ${formatAmount(
        removed.purchasePriceCents,
      )}.`,
    );
  }
});

createFormView(form, (value) => {
  commit(reduceItems(items, { type: 'add', item: value }));
});

exportButton.addEventListener('click', () => {
  if (items.length === 0) {
    announce('Nothing to export yet. Add an item first.');
    return;
  }
  downloadTextFile(toCsv(items), csvFilename(), 'text/csv');
  announce(describeExport(items));
});

renderAll();