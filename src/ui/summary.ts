import {
  itemCount,
  profitMargin,
  soldCount,
  totalInvested,
  totalProfit,
  totalRevenue,
  unsoldCount,
} from '../core/aggregation';
import { formatAmount, formatPercent } from '../core/format';
import type { ClothingItem } from '../types';
import { el, emptyState, replaceChildren } from './dom';

interface Stat {
  readonly label: string;
  readonly value: string;
  readonly detail?: string;
}

function buildStats(items: readonly ClothingItem[]): Stat[] {
  const invested = totalInvested(items);
  const revenue = totalRevenue(items);
  const profit = totalProfit(items);
  const count = itemCount(items);
  const inStock = unsoldCount(items);
  const margin = profitMargin(items);

  return [
    {
      label: 'Total invested',
      value: formatAmount(invested),
      detail: `${count} ${count === 1 ? 'item' : 'items'} bought`,
    },
    {
      label: 'Revenue',
      value: formatAmount(revenue),
      detail: `${soldCount(items)} sold`,
    },
    {
      label: 'Profit',
      value: formatAmount(profit),
      detail: margin === null ? 'no sales yet' : `${formatPercent(margin)} margin on sales`,
    },
    {
      label: 'In stock',
      value: String(inStock),
      detail: inStock === 1 ? 'item awaiting a buyer' : 'items awaiting buyers',
    },
  ];
}

/** Headline numbers, rendered as a definition list. */
export function renderSummary(container: HTMLElement, items: readonly ClothingItem[]): void {
  if (items.length === 0) {
    replaceChildren(container, emptyState('Add an item to see your totals.'));
    return;
  }

  replaceChildren(
    container,
    el(
      'dl',
      { class: 'stats' },
      buildStats(items).flatMap((stat) => [
        el('div', { class: 'stat' }, [
          el('dt', { class: 'stat__label' }, [stat.label]),
          el('dd', { class: 'stat__value' }, [stat.value]),
          el('p', { class: 'stat__detail' }, [stat.detail ?? '']),
        ]),
      ]),
    ),
  );
}