import type { ClothingItem } from '../src/types';

let counter = 0;

/** Builds a clothing item with sensible defaults so each test states only what matters. */
export function item(overrides: Partial<ClothingItem> = {}): ClothingItem {
  counter += 1;
  return {
    id: `id-${counter}`,
    date: '2026-01-15',
    item: 'Vintage denim jacket',
    purchasePriceCents: 2000,
    salePriceCents: 3500,
    ...overrides,
  };
}

/** Minimal in-memory StorageLike, so tests never touch a real browser store. */
export function fakeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
    snapshot: () => Object.fromEntries(map),
  };
}