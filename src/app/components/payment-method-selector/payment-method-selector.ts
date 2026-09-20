import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';

export type PaymentMethod = 'card' | 'paypal' | 'venmo' | 'gpay' | 'applepay';

export interface CardDetails {
  readonly cardNumber: string;
  readonly expiry: string;
  readonly cvc: string;
  readonly nameOnCard: string;
}

export interface PaymentSubmission {
  readonly method: PaymentMethod;
  /** Only present when method === 'card' - the other four methods
   *  authenticate on the provider's own side (an app, a popup, a
   *  biometric prompt), so there's no card-like data to collect here
   *  for them at all. */
  readonly card?: CardDetails;
}

interface ProviderInfo {
  readonly name: string;
  readonly icon: string;
}

const PROVIDER_INFO: Record<PaymentMethod, ProviderInfo> = {
  // Never actually rendered - the @else branch that reads this is only
  // reached when selectedMethod() !== 'card' - but the template can't
  // express that narrowing on a signal() call the way TS narrows a
  // plain variable, so the indexed type has to include every
  // PaymentMethod key or the compiler (correctly) can't guarantee the
  // lookup is safe.
  card: { name: 'Card', icon: '💳' },
  paypal: { name: 'PayPal', icon: '🅿️' },
  venmo: { name: 'Venmo', icon: '💸' },
  gpay: { name: 'Google Pay', icon: '🅖' },
  applepay: { name: 'Apple Pay', icon: '🍎' },
};

/**
 * A previously-built standalone HTML/CSS/JS preview from earlier this
 * session, never actually wired into the real app as a component - the
 * real bid-cart.html shipped with only a bare card form instead. Built
 * as a real, reusable Angular component here rather than inline markup
 * duplicated wherever a payment step is needed, since "select a method,
 * then either fill a card form or hand off to a redirect flow" is a
 * complete, self-contained interaction that bid-cart isn't the only
 * plausible place to eventually need.
 *
 * Card is the only method that needs its own entry form on this page -
 * PayPal, Venmo, Google Pay, and Apple Pay all authenticate on the
 * provider's own side, so this component's job for those four is just
 * to hand off, not collect card-like fields itself.
 */
@Component({
  selector: 'app-payment-method-selector',
  standalone: true,
  imports: [CurrencyPipe],
  templateUrl: './payment-method-selector.html',
  styleUrl: './payment-method-selector.scss',
})
export class PaymentMethodSelector {
  @Input({ required: true }) amount = 0;
  @Input() currency = 'USD';
  @Input() isSubmitting = false;
  @Output() paymentSubmitted = new EventEmitter<PaymentSubmission>();

  readonly selectedMethod = signal<PaymentMethod>('card');

  readonly cardNumber = signal('');
  readonly expiry = signal('');
  readonly cvc = signal('');
  readonly nameOnCard = signal('');

  readonly providerInfo = PROVIDER_INFO;

  // Template calls this rather than indexing providerInfo[...] directly
  // three separate times (icon, name in the redirect text, name again in
  // the button label) - one lookup aliased via @if...as instead of
  // three identical index expressions.
  getProviderInfo(method: PaymentMethod): ProviderInfo {
    return this.providerInfo[method];
  }

  selectMethod(method: PaymentMethod): void {
    this.selectedMethod.set(method);
  }

  // Cosmetic formatting only, matching the pattern already established
  // on this same preview before it was rebuilt as a component - still
  // worth keeping since an unformatted 16-digit run doesn't read as a
  // card number the way "4242 4242 4242 4242" does.
  onCardNumberInput(value: string): void {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    this.cardNumber.set(digits.replace(/(\d{4})(?=\d)/g, '$1 '));
  }
  onExpiryInput(value: string): void {
    let digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length > 2) digits = digits.slice(0, 2) + ' / ' + digits.slice(2);
    this.expiry.set(digits);
  }
  onCvcInput(value: string): void {
    this.cvc.set(value.replace(/\D/g, '').slice(0, 4));
  }

  submit(): void {
    const method = this.selectedMethod();
    if (method === 'card') {
      this.paymentSubmitted.emit({
        method,
        card: {
          cardNumber: this.cardNumber(),
          expiry: this.expiry(),
          cvc: this.cvc(),
          nameOnCard: this.nameOnCard(),
        },
      });
      return;
    }
    // The four redirect-style methods have nothing to validate here -
    // submitting means "hand off to the provider," not "check a form."
    this.paymentSubmitted.emit({ method });
  }
}
