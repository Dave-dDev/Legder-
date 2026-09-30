/** Domain types shared by the pure logic and the UI layer. */

/** A single clothing item on the line: bought, and possibly sold. */
export interface ClothingItem {
  readonly id: string;
  /** ISO-8601 calendar date of the purchase, `YYYY-MM-DD`. */
  readonly date: string;
  /** The garment name or a short note identifying the item. */
  readonly item: string;
  /** Positive integer cost in minor units (cents). Avoids float drift. */
  readonly purchasePriceCents: number;
  /** Sale proceeds in cents, or `null` while the item is still in stock. */
  readonly salePriceCents: number | null;
}

/** Raw, untrusted strings straight out of the form. */
export interface ClothingDraft {
  readonly date: string;
  readonly item: string;
  readonly purchase: string;
  /** Empty string means "not yet sold". */
  readonly sale: string;
}

/** Which fields failed validation. Keyed by form field name. */
export type FieldErrors = Partial<Record<keyof ClothingDraft, string>>;

export type ValidationResult =
  | { readonly ok: true; readonly value: Omit<ClothingItem, 'id'> }
  | { readonly ok: false; readonly errors: FieldErrors };

/** Realised profit grouped by garment name, used by the profit chart. */
export interface ItemProfit {
  readonly item: string;
  /** Sum of (sale − purchase) for sold items of this name. */
  readonly totalCents: number;
  /** Number of sold items contributing to this row. */
  readonly count: number;
  /** 0..1 fraction of the overall realised profit. */
  readonly share: number;
}

export interface MonthlyTotal {
  /** `YYYY-MM`. */
  readonly month: string;
  /** Sum of purchase prices of items first bought in this month. */
  readonly investedCents: number;
  /** Sum of sale prices of items sold in this month. */
  readonly revenueCents: number;
  readonly count: number;
}