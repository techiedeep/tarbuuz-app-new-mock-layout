/**
 * Replaces an earlier, unused CartItem/AddToCartPayload pair (a
 * drink-catalog shape that nothing in this app ever imported) with the
 * cart line item Buuz's real kit builder actually produces: a snapshot
 * of a finished kit — format, the resolved mix/garnish summary text, and
 * the price computed at the moment "Add to Cart" was clicked — not a
 * live reference back to the builder's current signals. That's what lets
 * someone add one kit, then keep changing the builder to assemble a
 * second one, without the first line item changing underneath them.
 */
export interface BuuzCartItem {
  /** Unique per line item, not per kit "kind" — adding the same exact
   *  mix twice deliberately creates two separate lines rather than
   *  merging into a quantity bump, since each was a distinct build
   *  action; the quantity stepper in the cart is for adjusting one line,
   *  not for the app to guess two adds were "the same" kit. */
  readonly id: string;
  readonly formatKey: string;
  readonly formatName: string;
  readonly formatIcon: string;
  readonly mixKeys: readonly string[];
  /** Human-readable ingredient list, e.g. "Lime, Mint, Agave" — resolved
   *  once at add-time so a line item still reads correctly even if the
   *  builder's own state (or a custom ingredient's name) changes later. */
  readonly mixSummary: string;
  readonly garnishSummary: string;
  /** USD, computed by BuuzService.computeKitPrice() at add-time. Always
   *  finite and >= 0 — CartService re-validates this on the way in. */
  readonly unitPrice: number;
  readonly quantity: number;
}

/** What Buuz.addToCart() hands to CartService.addItem() — everything a
 *  line item needs except the id and quantity, which the service owns. */
export type AddToCartPayload = Omit<BuuzCartItem, 'id' | 'quantity'>;
