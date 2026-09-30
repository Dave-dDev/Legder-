import { isValidIsoDate, normalizeText } from './validation';
import type { ClothingItem } from '../types';

/** Versioned key for the clothing ledger. Old expense-schema data is ignored. */
export const STORAGE_KEY = 'simple-tracker:clothing:v1';

/** The slice of the DOM Storage API this module needs. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Type guard for untrusted JSON. Returns the item only if it is well formed. */
export function toItem(value: unknown): ClothingItem | null {
  if (typeof value !== 'object' || value === null) return null;
  const candidate = value as Record<string, unknown>;

  const id = candidate['id'];
  const date = candidate['date'];
  const item = candidate['item'];
  const purchasePriceCents = candidate['purchasePriceCents'];
  const salePriceCents = candidate['salePriceCents'];

  if (typeof id !== 'string' || id === '') return null;
  if (typeof date !== 'string' || !isValidIsoDate(date)) return null;
  if (typeof item !== 'string') return null;
  if (typeof purchasePriceCents !== 'number' || !Number.isSafeInteger(purchasePriceCents)) {
    return null;
  }
  if (purchasePriceCents <= 0) return null;

  if (salePriceCents !== null) {
    if (typeof salePriceCents !== 'number' || !Number.isSafeInteger(salePriceCents)) return null;
    if (salePriceCents <= 0) return null;
  }

  return {
    id,
    date,
    item: normalizeText(item),
    purchasePriceCents,
    salePriceCents,
  };
}

/**
 * Reads items from storage. Never throws: missing keys, malformed JSON and
 * individual corrupt records are all tolerated, so a bad write cannot brick
 * the app.
 */
export function loadItems(storage: StorageLike | null): ClothingItem[] {
  if (!storage) return [];

  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return [];
  }
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  return parsed
    .map(toItem)
    .filter((item): item is ClothingItem => item !== null);
}

/** Writes items to storage. Returns `false` if the quota was exceeded. */
export function saveItems(
  items: readonly ClothingItem[],
  storage: StorageLike | null,
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(items));
    return true;
  } catch {
    return false;
  }
}