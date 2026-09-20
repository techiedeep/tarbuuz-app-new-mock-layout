import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Router } from '@angular/router';
import { Header } from '../../components/header/header';
import { Footer } from '../../components/footer/footer';
import { PaymentMethodSelector, PaymentSubmission } from '../../components/payment-method-selector/payment-method-selector';
import { CartService } from '../../shared/services/cart.service';
import { ROUTE_PATHS } from '../../shared/routes.constants';

type CheckoutStep = 'summary' | 'payment';

// Illustrative only, matching this app's existing convention of clearly
// marked mock numbers rather than a real shipping engine (see
// bid-cart.ts's own "no real payment gateway" note) - a real checkout
// would source this from an actual shipping calculator, not a flat rate
// baked into the client. No tax line - removed entirely per explicit
// instruction, not zeroed out, since a $0.00 "Tax" row would still
// visually claim a tax exists (same reasoning bid-cart.ts already
// applied to its own platform fee).
const FLAT_SHIPPING_USD = 6;

/**
 * Checkout for the Buuz cart - built directly from bid-cart's own
 * two-step (summary → payment) pattern rather than a third, independently
 * drifting checkout flow: same cartStep-style signal, same
 * app-payment-method-selector, same mock-submit-then-success-modal shape.
 * Guarded by authGuard in app.routes.ts, same as bid-cart, since this is
 * the one Buuz-adjacent page that actually takes payment - unlike /buuz
 * itself, which stays open to a signed-out visitor for browsing/building.
 *
 * Reads CartService directly rather than taking cart contents via a
 * route param - the cart is app-wide state, not something that belongs
 * serialized into a shareable/loggable URL (an event/bid id in a URL is
 * fine; a checkout's line items and prices are not something to leak
 * into browser history or a referrer header).
 */
@Component({
  selector: 'app-buuz-checkout',
  standalone: true,
  imports: [Header, Footer, PaymentMethodSelector, CurrencyPipe],
  templateUrl: './buuz-checkout.html',
  styleUrl: './buuz-checkout.scss',
})
export class BuuzCheckout {
  private readonly router = inject(Router);
  private readonly cartService = inject(CartService);

  readonly items = this.cartService.items;
  readonly hasItems = this.cartService.hasItems;
  readonly subtotal = this.cartService.subtotal;

  readonly shipping = computed(() => (this.hasItems() ? FLAT_SHIPPING_USD : 0));
  readonly grandTotal = computed(() => {
    const total = this.subtotal() + this.shipping();
    return Math.round(total * 100) / 100;
  });

  readonly checkoutStep = signal<CheckoutStep>('summary');
  readonly deliveryAddress = signal('');
  readonly addressTouched = signal(false);
  readonly addressMissing = computed(() => this.addressTouched() && this.deliveryAddress().trim().length === 0);

  readonly isSubmittingPayment = signal(false);
  readonly showSuccessModal = signal(false);
  readonly paymentErrorMessage = signal('');

  proceedToPayment(): void {
    this.addressTouched.set(true);
    if (!this.hasItems() || this.deliveryAddress().trim().length === 0) return;
    this.checkoutStep.set('payment');
  }

  backToSummary(): void {
    this.checkoutStep.set('summary');
    this.paymentErrorMessage.set('');
  }

  submitPayment(submission: PaymentSubmission): void {
    this.isSubmittingPayment.set(true);
    // Matches bid-cart.ts's own logging exactly on purpose - only the
    // payment method is ever logged, never card.cardNumber/cvc/etc.,
    // even to the console, even in this mock flow with no real gateway
    // behind it yet.
    console.info('Payment submitted via', submission.method, submission.card ? '(card details collected)' : '(redirect flow)');
    setTimeout(() => {
      this.isSubmittingPayment.set(false);
      this.showSuccessModal.set(true);
      // Clear only on confirmed success, not on navigating to the
      // payment step - abandoning checkout partway through (closing the
      // tab, hitting back) should leave the cart exactly as it was.
      this.cartService.clear();
    }, 900);
  }

  onPaymentError(message: string): void {
    this.paymentErrorMessage.set(message);
    this.isSubmittingPayment.set(false);
  }

  closeSuccessModal(): void {
    this.showSuccessModal.set(false);
    this.goToBuuz();
  }

  goToBuuz(): void {
    this.router.navigateByUrl(ROUTE_PATHS.buuz).then(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    });
  }
}
