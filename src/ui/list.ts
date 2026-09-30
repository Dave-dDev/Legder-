import { formatAmount, formatDate } from '../core/format';
import type { ClothingItem } from '../types';
import { el, emptyState, replaceChildren } from './dom';

export interface ClothingView {
  /** Re-renders the table and the "N items" caption. */
  render(items: readonly ClothingItem[]): void;
}

/**
 * The clothing line table. A single delegated click listener is attached once,
 * so re-rendering rows never leaks handlers.
 */
export function createClothingView(
  container: HTMLElement,
  countContainer: HTMLElement,
): ClothingView {
  container.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.closest('button[data-delete]')) return;
    const row = target.closest<HTMLElement>('tr[data-id]');
    const id = row?.dataset['id'];
    if (id) container.dispatchEvent(new CustomEvent('item:delete', { detail: id }));
  });

  function render(items: readonly ClothingItem[]): void {
    replaceChildren(
      countContainer,
      items.length === 0
        ? 'No items yet'
        : `${items.length} ${items.length === 1 ? 'item' : 'items'}, newest first`,
    );

    if (items.length === 0) {
      replaceChildren(container, emptyState('Nothing recorded yet. Add your first item above.'));
      return;
    }

    const head = el('tr', {}, [
      el('th', { scope: 'col' }, ['Date']),
      el('th', { scope: 'col' }, ['Item']),
      el('th', { scope: 'col', class: 'num' }, ['Purchase']),
      el('th', { scope: 'col', class: 'num' }, ['Sale']),
      el('th', { scope: 'col', class: 'num' }, ['Profit']),
      el('th', { scope: 'col', class: 'actions' }, [
        el('span', { class: 'visually-hidden' }, ['Actions']),
      ]),
    ]);

    const body = el(
      'tbody',
      {},
      items.map((item) => {
        const sold = item.salePriceCents !== null;
        const described = sold
          ? `${item.item} bought ${formatDate(item.date)} for ${formatAmount(
              item.purchasePriceCents,
            )}, sold for ${formatAmount(item.salePriceCents)}`
          : `${item.item} bought ${formatDate(item.date)} for ${formatAmount(
              item.purchasePriceCents,
            )}, not yet sold`;

        return el('tr', { 'data-id': item.id }, [
          el('td', { class: 'nowrap' }, [formatDate(item.date)]),
          el('td', { class: 'item' }, [item.item]),
          el('td', { class: 'num' }, [formatAmount(item.purchasePriceCents)]),
          el('td', { class: 'num' }, [
            sold ? formatAmount(item.salePriceCents as number) : '—',
          ]),
          el('td', { class: 'num' }, [
            sold ? formatAmount((item.salePriceCents as number) - item.purchasePriceCents) : '—',
          ]),
          el('td', { class: 'actions' }, [
            el(
              'button',
              {
                type: 'button',
                class: 'button button--quiet',
                'data-delete': '',
                'aria-label': `Delete item: ${described}`,
              },
              ['Delete'],
            ),
          ]),
        ]);
      }),
    );

    const table = el('table', { class: 'records' }, [
      el('caption', { class: 'visually-hidden' }, [
        'Clothing line, newest first. Each row has a delete button.',
      ]),
      el('thead', {}, [head]),
      body,
    ]);

    replaceChildren(container, [el('div', { class: 'table-scroll' }, [table])]);
  }

  return { render };
}