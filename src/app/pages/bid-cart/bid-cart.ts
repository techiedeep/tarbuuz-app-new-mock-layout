import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, TitleCasePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Header } from '../../components/header/header';
import { Footer } from '../../components/footer/footer';
import { PaymentMethodSelector, PaymentSubmission } from '../../components/payment-method-selector/payment-method-selector';
import { HostBiddingService } from '../../shared/services/host-bidding.service';
import { FoodieEventsService } from '../../shared/services/foodie-events.service';
import { BidsService } from '../../shared/services/bids.service';
import { Bid } from '../../shared/models/bid.model';
import { FoodieEvent } from '../../shared/models/foodie-event.model';

type CartStep = 'cart' | 'payment';

/**
 * Order Summary / Bid Cart - the page a Foodie lands on after accepting
 * a bid from the Review Bids drawer. Rebuilt from the provided reference
 * template rather than a prior version of this app, since no bid-cart
 * page existed anywhere in this codebase before now.
 *
 * Platform fee removed entirely per explicit instruction - grandTotal is
 * just the subtotal now, not subtotal + a 2% fee. serviceFee and the fee
 * line item are gone rather than zeroed out, since a $0.00 "Platform
 * fee" line would still visually claim a fee exists.
 *
 * app-braintree-payment doesn't exist anywhere in this codebase's
 * recoverable history - no real payment gateway integration has been
 * built yet. Replaced with a self-contained, illustrative card-entry
 * form (matching the pattern already established on the standalone
 * bid-cart preview built earlier this session) rather than reference a
 * component that would fail to resolve. Swap this section for the real
 * app-braintree-payment component once it exists.
 */
@Component({
  selector: 'app-bid-cart',
  standalone: true,
  imports: [Header, Footer, PaymentMethodSelector, CurrencyPipe, DatePipe, TitleCasePipe, DecimalPipe],
  templateUrl: './bid-cart.html',
  styleUrl: './bid-cart.scss',
})
export class BidCart implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly eventsService = inject(FoodieEventsService);
  private readonly bidsService = inject(BidsService);
  private readonly hostBiddingService = inject(HostBiddingService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isLoading = signal(true);
  readonly event = signal<FoodieEvent | null>(null);
  readonly bid = signal<Bid | null>(null);

  readonly cartStep = signal<CartStep>('cart');
  readonly isSubmittingPayment = signal(false);
  readonly showSuccessModal = signal(false);
  readonly paymentErrorMessage = signal('');

  readonly totalAmount = computed(() => {
    const bid = this.bid();
    const event = this.event();
    if (!bid || !event) return 0;
    return Number(bid.bidAmount) * event.guestCount;
  });

  // No platform fee - grandTotal is the subtotal, full stop.
  readonly grandTotal = computed(() => this.totalAmount());

  readonly scoreRows = computed(() => this.bid()?.scoreRows ?? []);

  readonly paymentOrderId = computed(() => this.bid()?.id ?? '');
  readonly paymentCurrency = computed(() => this.bid()?.currency ?? 'USD');
  readonly subtotal = computed(() => this.totalAmount());

  ngOnInit(): void {
    const eventId = this.route.snapshot.paramMap.get('eventId');
    const bidId = this.route.snapshot.paramMap.get('bidId');
    if (!eventId || !bidId) {
      this.goBack();
      return;
    }

    this.eventsService
      .getEventById(eventId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        if (!event) {
          this.isLoading.set(false);
          return;
        }
        this.event.set(event);

        this.bidsService
          .getBidsForEvent(event)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((bids) => {
            this.isLoading.set(false);
            this.bid.set(bids.find((b) => b.id === bidId) ?? bids[0] ?? null);
          });
      });
  }

  goBack(): void {
    this.router.navigateByUrl('/events').then(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    });
  }

  proceedToPayment(): void {
    this.cartStep.set('payment');
  }

  backToCart(): void {
    this.cartStep.set('cart');
    this.paymentErrorMessage.set('');
  }

  submitPayment(submission: PaymentSubmission): void {
    this.isSubmittingPayment.set(true);
    // Simulated latency, matching the pattern already established on
    // every other mock service in this app - no real payment gateway
    // call exists here (see the class-level note on app-braintree-payment).
    // A real integration would branch on submission.method here - card
    // details go to one flow, the four redirect-style methods go to
    // their own provider handoff instead.
    console.info('Payment submitted via', submission.method, submission.card ? '(card details collected)' : '(redirect flow)');
    setTimeout(() => {
      this.isSubmittingPayment.set(false);
      this.showSuccessModal.set(true);
    }, 900);
  }

  onPaymentError(message: string): void {
    this.paymentErrorMessage.set(message);
    this.isSubmittingPayment.set(false);
  }

  closeSuccessModal(): void {
    this.showSuccessModal.set(false);
    this.goBack();
  }
}
