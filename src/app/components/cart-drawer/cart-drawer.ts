import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Router } from '@angular/router';
import { CartService } from '../../shared/services/cart.service';
import { ROUTE_PATHS } from '../../shared/routes.constants';

/**
 * The site-wide shopping cart, opened from the header's cart icon (see
 * header.ts/.html) - not scoped to the Buuz page itself, even though
 * Buuz is currently the only page that adds anything to it. Someone can
 * add a kit, then browse Kitchen Lab or Events, and still find it here:
 * that's the whole reason CartService is root-provided instead of living
 * inside Buuz's own component (see CartService's class doc).
 *
 * Follows the same @Input open / @Output closed contract as
 * SupplierMarketplaceDrawer (components/supplier-marketplace-drawer/) -
 * the header stays in control of when it's open, this component owns
 * only its own content, reading CartService directly rather than having
 * cart contents passed in as an Input (there's exactly one cart, and
 * every page that can open this drawer wants the same live one).
 */
@Component({
  selector: 'app-cart-drawer',
  standalone: true,
  imports: [CurrencyPipe],
  templateUrl: './cart-drawer.html',
  styleUrl: './cart-drawer.scss',
})
export class CartDrawer {
  private readonly router = inject(Router);
  private readonly cartService = inject(CartService);

  @Input() open = false;
  @Output() closed = new EventEmitter<void>();

  readonly items = this.cartService.items;
  readonly itemCount = this.cartService.itemCount;
  readonly subtotal = this.cartService.subtotal;
  readonly hasItems = this.cartService.hasItems;

  close(): void {
    this.closed.emit();
  }

  increment(id: string, currentQuantity: number): void {
    this.cartService.updateQuantity(id, currentQuantity + 1);
  }

  decrement(id: string, currentQuantity: number): void {
    if (currentQuantity <= 1) {
      // Dropping to zero via the minus button reads as "remove it," not
      // as a quantity of zero sitting in the cart - matches how most
      // real cart UIs treat the boundary.
      this.cartService.removeItem(id);
      return;
    }
    this.cartService.updateQuantity(id, currentQuantity - 1);
  }

  removeItem(id: string): void {
    this.cartService.removeItem(id);
  }

  proceedToCheckout(): void {
    if (!this.hasItems()) return;
    this.close();
    this.router.navigateByUrl(ROUTE_PATHS.buuzCheckout);
  }
}
