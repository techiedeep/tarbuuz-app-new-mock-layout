import { Injectable, computed, signal } from '@angular/core';
import { AddToCartPayload, BuuzCartItem } from '../models/buuz/cart.model';

const MAX_QUANTITY_PER_LINE = 20;
const MIN_QUANTITY_PER_LINE = 1;

/**
 * Root-provided so the cart survives navigation — the whole point of
 * moving cart state out of Buuz's own component (where an earlier
 * version just flipped a "justAdded" flag and forgot the kit entirely,
 * see buuz.ts's history) is that someone can add a kit, browse Kitchen
 * Lab or Events, and still find it waiting in the header's cart icon.
 * In-memory only, matching every other mock service in this app — no
 * backend exists to persist it across a real page reload/session either.
 *
 * Security/robustness notes (this is a mock, client-only cart, but the
 * validation below isn't skipped just because there's no backend yet):
 *  - Every quantity passed in is clamped to a sane integer range, so a
 *    caller (or a future bad actor scripting against these public
 *    methods) can't push a negative, zero, fractional, or absurdly large
 *    quantity into a total shown to the user.
 *  - unitPrice is defended the same way — never trusted to already be a
 *    finite, non-negative number, even though BuuzService.computeKitPrice()
 *    already guarantees that on its own.
 *  - Every mutation replaces the array (readonly items() output), the
 *    same immutable-signal-update pattern used everywhere else in this
 *    app (mix/garnishSelection in buuz.ts, etc.) rather than mutating
 *    items in place — callers can't accidentally hold a stale reference
 *    that silently goes out of sync.
 */
@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly _items = signal<readonly BuuzCartItem[]>([]);
  readonly items = this._items.asReadonly();

  readonly itemCount = computed(() => this._items().reduce((sum, item) => sum + item.quantity, 0));
  readonly subtotal = computed(() => {
    const total = this._items().reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    return Math.round(total * 100) / 100;
  });
  readonly hasItems = computed(() => this._items().length > 0);

  /** Every add is a new line, even if an identical kit is already in the
   *  cart — see the BuuzCartItem doc comment for why this doesn't try to
   *  merge/dedupe by kit contents. */
  addItem(payload: AddToCartPayload, quantity = 1): void {
    const item: BuuzCartItem = {
      ...payload,
      unitPrice: sanitizePrice(payload.unitPrice),
      id: generateLineId(),
      quantity: clampQuantity(quantity),
    };
    this._items.update((items) => [...items, item]);
  }

  updateQuantity(id: string, quantity: number): void {
    const safeQuantity = clampQuantity(quantity);
    this._items.update((items) => items.map((item) => (item.id === id ? { ...item, quantity: safeQuantity } : item)));
  }

  removeItem(id: string): void {
    this._items.update((items) => items.filter((item) => item.id !== id));
  }

  clear(): void {
    this._items.set([]);
  }
}

function clampQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return MIN_QUANTITY_PER_LINE;
  return Math.min(MAX_QUANTITY_PER_LINE, Math.max(MIN_QUANTITY_PER_LINE, Math.round(quantity)));
}

function sanitizePrice(price: number): number {
  if (!Number.isFinite(price) || price < 0) return 0;
  return Math.round(price * 100) / 100;
}

function generateLineId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for an environment without crypto.randomUUID (older
  // browsers/SSR contexts) - not cryptographically strong, but this id
  // only needs to be unique within one in-memory cart array, never
  // security-sensitive.
  return `cart-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
