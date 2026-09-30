/** Collision-resistant record id, with a fallback for non-secure contexts. */
export function createId(): string {
  const webCrypto = globalThis.crypto;
  if (webCrypto && typeof webCrypto.randomUUID === 'function') {
    return webCrypto.randomUUID();
  }
  const random = Math.random().toString(36).slice(2, 10);
  return `item_${Date.now().toString(36)}_${random}`;
}
