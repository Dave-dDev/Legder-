import { describe, expect, it } from 'vitest';
import { loadItems, saveItems, STORAGE_KEY, toItem } from '../src/core/storage';
import { reduceItems } from '../src/core/reducer';
import { item, fakeStorage } from './helpers';

describe('toItem', () => {
  it('accepts a well formed item', () => {
    const record = item();
    expect(toItem(record)).toEqual(record);
  });

  it('keeps an item with no sale price intact', () => {
    const record = item({ salePriceCents: null });
    expect(toItem(record)).toEqual(record);
  });

  it('rejects records with the wrong shape or impossible values', () => {
    expect(toItem(null)).toBeNull();
    expect(toItem('nope')).toBeNull();
    expect(toItem({ ...item(), id: '' })).toBeNull();
    expect(toItem({ ...item(), date: '04/03/2026' })).toBeNull();
    expect(toItem({ ...item(), purchasePriceCents: 12.5 })).toBeNull();
    expect(toItem({ ...item(), purchasePriceCents: -100 })).toBeNull();
    expect(toItem({ ...item(), salePriceCents: 'oops' })).toBeNull();
    expect(toItem({ ...item(), salePriceCents: 0 })).toBeNull();
  });
});

describe('loadItems', () => {
  it('returns an empty list when storage is unavailable', () => {
    expect(loadItems(null)).toEqual([]);
  });

  it('returns an empty list when nothing has been saved', () => {
    expect(loadItems(fakeStorage())).toEqual([]);
  });

  it('round-trips saved items', () => {
    const storage = fakeStorage();
    const records = [item(), item({ purchasePriceCents: 2500 })];
    expect(saveItems(records, storage)).toBe(true);
    expect(loadItems(storage)).toEqual(records);
  });

  it('survives corrupt JSON instead of throwing', () => {
    expect(loadItems(fakeStorage({ [STORAGE_KEY]: '{not json' }))).toEqual([]);
  });

  it('drops individual invalid records and keeps the good ones', () => {
    const good = item();
    const storage = fakeStorage({
      [STORAGE_KEY]: JSON.stringify([good, { id: 'bad', purchasePriceCents: 'oops' }, null]),
    });
    expect(loadItems(storage)).toEqual([good]);
  });

  it('returns an empty list when the payload is not an array', () => {
    expect(loadItems(fakeStorage({ [STORAGE_KEY]: '{"a":1}' }))).toEqual([]);
  });
});

describe('saveItems', () => {
  it('reports failure when the quota is exceeded', () => {
    const storage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => undefined,
    };
    expect(saveItems([item()], storage)).toBe(false);
  });
});

describe('reduceItems', () => {
  const draft = {
    date: '2026-05-01',
    item: 'Linen shirt',
    purchasePriceCents: 1200,
    salePriceCents: 2200,
  };

  it('adds an item with a generated id, newest first', () => {
    const next = reduceItems([item({ date: '2026-01-01' })], {
      type: 'add',
      item: draft,
    });
    expect(next).toHaveLength(2);
    expect(next[0]?.date).toBe('2026-05-01');
    expect(next[0]?.id).toBeTruthy();
  });

  it('adds an unsold item with a null sale', () => {
    const next = reduceItems([], {
      type: 'add',
      item: { ...draft, salePriceCents: null },
    });
    expect(next[0]?.salePriceCents).toBeNull();
  });

  it('removes by id and leaves the rest untouched', () => {
    const first = item({ id: 'keep' });
    const second = item({ id: 'drop' });
    const next = reduceItems([first, second], { type: 'remove', id: 'drop' });
    expect(next).toEqual([first]);
  });

  it('never mutates the previous state', () => {
    const state = [item({ id: 'a' })];
    const snapshot = JSON.stringify(state);
    reduceItems(state, { type: 'add', item: draft });
    reduceItems(state, { type: 'remove', id: 'a' });
    expect(JSON.stringify(state)).toBe(snapshot);
  });
});