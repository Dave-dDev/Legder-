/**
 * happy-dom v15 delegates `window.localStorage` to Node's experimental Web
 * Storage, which is only populated when Node runs with `--localstorage-file`.
 * Under plain `vitest run` that leaves `window.localStorage` undefined, so the
 * boot smoke test (tests/app.test.ts) fails before any assertion runs.
 * This file supplies a minimal in-memory implementation whenever the browser
 * environment exposes none. It is a test double, not app code.
 */
if (typeof window !== 'undefined' && typeof window.localStorage === 'undefined') {
  const store = new Map<string, string>();

  const stub: Storage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => (store.has(key) ? (store.get(key) as string) : null),
    key: (index: number) => (Array.from(store.keys())[index] ?? null),
    removeItem: (key: string) => void store.delete(key),
    setItem: (key: string, value: string) => void store.set(key, String(value)),
  };

  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: stub,
  });
}