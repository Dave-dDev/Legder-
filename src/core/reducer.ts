import { createId } from './id';
import { sortByDateDesc } from './aggregation';
import type { ClothingItem } from '../types';

export type Action =
  | { readonly type: 'add'; readonly item: Omit<ClothingItem, 'id'> }
  | { readonly type: 'remove'; readonly id: string }
  | { readonly type: 'replaceAll'; readonly items: readonly ClothingItem[] };

/**
 * Pure state transition: every mutation returns a new list ordered newest
 * first. Immutability keeps rendering trivially predictable.
 */
export function reduceItems(
  state: readonly ClothingItem[],
  action: Action,
): ClothingItem[] {
  switch (action.type) {
    case 'add':
      return sortByDateDesc([...state, { ...action.item, id: createId() }]);
    case 'remove':
      return state.filter((item) => item.id !== action.id);
    case 'replaceAll':
      return sortByDateDesc([...action.items]);
  }
}