/**
 * Payment domain models — shared between a future PaymentService and its
 * component. No payment flow exists yet (the process stepper's "Make
 * Payment" stage is currently just a label, not a wired step), so this
 * completes the model layer only, per instruction.
 *
 * Security note: this shape is deliberately built around Braintree's
 * client-side tokenization model — raw card data should never touch
 * Angular code or this app's own backend. Only the one-time nonce
 * Braintree's SDK produces client-side crosses the wire to the backend,
 * which is the correct PCI-scope-reducing pattern. Preserved exactly as
 * provided rather than "simplified," since that boundary is a real
 * security property, not incidental structure.
 */

/** Response from the backend's client-token endpoint. */
export interface BraintreeClientTokenResponse {
  readonly clientToken: string;
}

/**
 * Sent from Angular → backend → Braintree server-side SDK.
 * Raw card data never appears here; only the one-time nonce does.
 */
export interface PaymentCheckoutPayload {
  readonly nonce: string;
  readonly amount: number; // major currency units (e.g. 12.50 = £12.50)
  readonly orderId: string;
  readonly currency: string; // ISO 4217, e.g. 'GBP'
}

/** Standardised result from the backend after calling braintree.transaction.sale(). */
export interface PaymentResult {
  readonly success: boolean;
  readonly transactionId: string;
  readonly error?: string; // user-safe message only — never expose internal details
}

/** Internal state machine for the payment component. */
export type PaymentUIState =
  | 'loading' // fetching client token + initialising SDK
  | 'ready' // Venmo button + Hosted Fields rendered
  | 'processing' // tokenising or waiting for backend
  | 'error'; // recoverable error — shows retry
