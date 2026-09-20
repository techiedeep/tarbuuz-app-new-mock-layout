import { Component, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Header } from '../../components/header/header';
import { Footer } from '../../components/footer/footer';
import { AuthApi } from '../../shared/services/auth-api';
import { AuthModalService } from '../../shared/services/auth-modal.service';
import { PaymentMethodSelector, PaymentSubmission } from '../../components/payment-method-selector/payment-method-selector';
import { ContactForm } from '../../components/contact-form/contact-form';
import {
  TimeLineItem,
  PricingStep,
  PricingPlan,
  ComparisonRow,
  FaqItem,
} from './pricing.models';

@Component({
  selector: 'app-pricing',
  imports: [Header, Footer, PaymentMethodSelector, ContactForm],
  templateUrl: './pricing.html',
  styleUrl: './pricing.scss',
})
export class Pricing {
  private readonly router = inject(Router);
  private readonly authApi = inject(AuthApi);
  private readonly authModal = inject(AuthModalService);

  // Drives hiding "Create Your First Event" in the closing CTA - a
  // signed-in visitor already has an account, so this specific button
  // (whose only job is getting a first-time visitor into the
  // login/register flow) has nothing left to do for them.
  readonly isLoggedIn = computed(() => this.authApi.isAuthenticated());

  // Same navigate-then-open-modal pattern already used by Home's own
  // "Get Started" and Our Story's "Start Your Journey" - the
  // login/register modal is mounted globally and opened via
  // AuthModalService, not owned by this page, so it's opened after
  // navigating home rather than attempting to render it here. Reused
  // as-is for the Free plan's own "Start Free" button - identical
  // requirement (go home, open the modal only if not already signed in).
  createFirstEvent(): void {
    this.router.navigateByUrl('/').then(() => {
      // window.scrollTo({top:0}), not scrollIntoView('hero') - that
      // approach was tried first, but scrollIntoView's "start" alignment
      // isn't reliably aware of the sticky nav sitting on top of the
      // viewport, leaving the hero badge's top ~11px genuinely clipped
      // behind it (confirmed directly by comparing their bounding
      // rects). Also instant, not smooth: a signed-out visitor
      // immediately follows this with authModal.open(), which locks
      // page scroll via BodyScrollLockService, and a still-animating
      // smooth scroll interrupted mid-flight by the lock produced
      // unpredictable final positions on unlock (confirmed directly,
      // fixed elsewhere in this app already). Runs for a signed-in
      // visitor too, unconditionally - this app has no scroll
      // restoration on navigation, so without this a signed-in click
      // landed wherever Pricing happened to be scrolled to, not the top
      // of Home.
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      if (this.authApi.isAuthenticated()) return;
      this.authModal.open();
    });
  }

  // ── Plan CTA dispatch ──
  // A single button template is shared across all three plan cards (see
  // pricing.html's @for loop), so one handler dispatches by plan name
  // rather than three separate template bindings each re-deriving which
  // plan they belong to.
  onPlanCtaClick(planName: PricingPlan['name']): void {
    if (planName === 'Free') {
      this.createFirstEvent();
      return;
    }
    if (planName === 'Pro') {
      // Same login check Free already goes through - the payment drawer
      // is real money-adjacent UI and has no business opening for
      // someone who isn't even signed in yet.
      if (!this.authApi.isAuthenticated()) {
        this.createFirstEvent();
        return;
      }
      this.openProPayment();
      return;
    }
    this.openContactSales();
  }

  // ── Pro plan - payment drawer ──
  // Reuses the exact same app-payment-method-selector already built for
  // bid-cart's real order-summary payment step - not a second,
  // parallel payment UI. Presented as a drawer here (rather than
  // bid-cart's inline step-switch) since Pricing has no equivalent
  // "cart" layout to switch away from.
  readonly showProPayment = signal(false);
  readonly isSubmittingProPayment = signal(false);
  readonly proPaymentError = signal('');

  openProPayment(): void {
    this.proPaymentError.set('');
    this.showProPayment.set(true);
  }
  closeProPayment(): void {
    this.showProPayment.set(false);
  }

  submitProPayment(submission: PaymentSubmission): void {
    this.isSubmittingProPayment.set(true);
    this.proPaymentError.set('');
    // No real payment gateway exists anywhere in this app yet (see the
    // identical note on bid-cart's own payment step) - simulated
    // latency matches every other mock async action in this codebase
    // rather than resolving instantly, which would look broken next to
    // the rest of the product.
    setTimeout(() => {
      this.isSubmittingProPayment.set(false);
      this.showProPayment.set(false);
      // TODO: once a real Foodie membership/subscription record exists
      // (see Foodie Profile's own new membership section), this is
      // where Pro would actually be applied to it.
    }, 900);
  }

  // ── Enterprise plan - Contact Sales ──
  // A second, independent instance of the same shared ContactForm
  // component Footer already uses - not the same modal instance, since
  // ContactForm has no global, cross-page trigger service (it's
  // deliberately self-contained per the component's own docs). Each
  // page that needs it renders and owns its own instance.
  readonly showContactSales = signal(false);
  openContactSales(): void {
    this.showContactSales.set(true);
  }
  closeContactSales(): void {
    this.showContactSales.set(false);
  }

  // ── Time comparison ──
  readonly timeOld: readonly TimeLineItem[] = [
    { label: 'Researching venues & chefs online', time: '6 hrs' },
    { label: 'Emailing & calling for quotes', time: '8 hrs' },
    { label: 'Comparing bids in spreadsheets', time: '4 hrs' },
    { label: 'Building a menu from scratch', time: '5 hrs' },
    { label: 'Checking dietary restrictions', time: '3 hrs' },
    { label: 'Negotiating & confirming bookings', time: '5 hrs' },
    { label: 'Coordinating via email chains', time: '3 hrs' },
  ];
  readonly timeTarbuuz: readonly TimeLineItem[] = [
    { label: 'Describe your event to Smart Menu', time: '2 min' },
    { label: 'Review the AI-generated menu', time: '5 min' },
    { label: 'Approve & open for bidding', time: '1 min' },
    { label: 'Review AI-ranked host bids', time: '10 min' },
    { label: 'Accept a bid & confirm payment', time: '2 min' },
  ];

  // ── How it works ──
  readonly steps: readonly PricingStep[] = [
    { number: '01', time: '2 min', title: 'Create Event', description: 'Guest count, budget, occasion - in plain language.' },
    { number: '02', time: '5 min', title: 'Review Menu', description: 'Smart Menu drafts a complete, costed menu instantly.' },
    { number: '03', time: '1 min', title: 'Approve Menu', description: 'One click opens it to verified hosts for bidding.' },
    { number: '04', time: '10 min', title: 'Review Bids', description: 'Compare bids already ranked by real value, not just price.' },
    { number: '05', time: '2 min', title: 'Make Payment', description: "Confirm your favorite bid. You're booked." },
  ];

  // ── Plans ──
  readonly plans: readonly PricingPlan[] = [
    {
      name: 'Free', tagline: 'For your first event, or your once-a-year gathering.',
      priceDisplay: '$0', priceSuffix: '', billedNote: 'No credit card required',
      ctaLabel: 'Start Free', ctaVariant: 'ghost', featured: false, badge: '', isProPlan: false,
      features: [
        { text: 'Unlimited events created', isAi: false },
        { text: 'Smart Menu - 3 generations/month', isAi: true },
        { text: 'Full marketplace bidding access', isAi: false },
        { text: 'Basic Dietary Intelligence', isAi: false },
        { text: 'Standard email support', isAi: false },
        { text: 'No service fees, ever', isAi: false },
      ],
    },
    {
      name: 'Pro', tagline: 'For anyone hosting more than a couple of events a year.',
      priceDisplay: '$29', priceSuffix: '/mo', billedNote: 'Billed monthly',
      ctaLabel: 'Start Pro', ctaVariant: 'primary', featured: true, badge: 'Most Popular', isProPlan: true,
      features: [
        { text: 'Everything in Free', isAi: false },
        { text: 'Unlimited Smart Menu generations', isAi: true },
        { text: 'Agentic Chef coordination', isAi: true },
        { text: 'Priority-ranked Intelligent Bidding', isAi: true },
        { text: 'Predictive Analytics forecasting', isAi: true },
        { text: 'Full Dietary Intelligence', isAi: false },
        { text: 'Priority live-chat support', isAi: false },
      ],
    },
    {
      name: 'Enterprise', tagline: 'For agencies, venues, and teams managing many events at once.',
      priceDisplay: 'Custom', priceSuffix: '', billedNote: 'Volume-based pricing',
      ctaLabel: 'Contact Sales', ctaVariant: 'ghost', featured: false, badge: '', isProPlan: false,
      features: [
        { text: 'Everything in Pro', isAi: false },
        { text: 'Budget Optimizer with custom targets', isAi: true },
        { text: 'Dedicated account manager', isAi: false },
        { text: 'Team & multi-event management', isAi: false },
        { text: 'API access & integrations', isAi: false },
        { text: 'Negotiated vendor network rates', isAi: false },
        { text: 'White-glove onboarding', isAi: false },
      ],
    },
  ];

  // ── Billing toggle — genuinely recalculates the Pro price, not decorative ──
  private readonly PRO_MONTHLY = 29;
  private readonly PRO_ANNUAL_TOTAL = 290; // 10x monthly rate = "2 months free"

  readonly isAnnual = signal(false);
  readonly proPriceDisplay = computed(() =>
    this.isAnnual() ? `$${Math.round(this.PRO_ANNUAL_TOTAL / 12)}` : `$${this.PRO_MONTHLY}`
  );
  readonly proBilledNote = computed(() =>
    this.isAnnual() ? `Billed $${this.PRO_ANNUAL_TOTAL}/year` : 'Billed monthly'
  );
  // The actual amount to charge via the payment drawer - matches
  // whatever proBilledNote is telling the person they're being billed,
  // not just the per-month display figure (which for annual billing is
  // a rounded-down monthly-equivalent, not the real charge amount).
  readonly proMonthlyEquivalent = computed(() => (this.isAnnual() ? this.PRO_ANNUAL_TOTAL : this.PRO_MONTHLY));

  toggleBilling(): void {
    this.isAnnual.update((v) => !v);
  }

  // ── Comparison table ──
  readonly comparisonRows: readonly ComparisonRow[] = [
    { feature: 'Smart Menu generations', free: { kind: 'text', value: '3 / month' }, pro: { kind: 'text', value: 'Unlimited' }, enterprise: { kind: 'text', value: 'Unlimited' } },
    { feature: 'Agentic Chef coordination', free: { kind: 'dash' }, pro: { kind: 'check' }, enterprise: { kind: 'check' } },
    { feature: 'Intelligent Bidding priority', free: { kind: 'text', value: 'Standard' }, pro: { kind: 'text', value: 'Priority' }, enterprise: { kind: 'text', value: 'Priority' } },
    { feature: 'Predictive Analytics', free: { kind: 'dash' }, pro: { kind: 'check' }, enterprise: { kind: 'check' } },
    { feature: 'Dietary Intelligence', free: { kind: 'text', value: 'Basic' }, pro: { kind: 'text', value: 'Full' }, enterprise: { kind: 'text', value: 'Full' } },
    { feature: 'Budget Optimizer', free: { kind: 'dash' }, pro: { kind: 'dash' }, enterprise: { kind: 'check' } },
    { feature: 'Support', free: { kind: 'text', value: 'Email' }, pro: { kind: 'text', value: 'Priority chat' }, enterprise: { kind: 'text', value: 'Dedicated manager' } },
    { feature: 'API access', free: { kind: 'dash' }, pro: { kind: 'dash' }, enterprise: { kind: 'check' } },
  ];

  // ── FAQ accordion — same pattern as Home ──
  readonly faqItems: readonly FaqItem[] = [
    { question: 'Can I cancel anytime?', answer: "Yes - Pro and Enterprise are both month-to-month unless you choose annual billing. Cancel anytime from your account settings; you'll keep access through the end of your current billing period." },
    { question: 'Do unused Smart Menu generations roll over?', answer: 'On the Free plan, no - your 3 monthly generations reset each cycle rather than accumulating. Pro and Enterprise include unlimited generations, so this stops being a question entirely.' },
    { question: 'Is there a service fee on bookings?', answer: "No - there's no service fee on any plan, including Free. You only ever pay the Host amount you actually agree to when you confirm a booking." },
    { question: 'Can I switch plans later?', answer: 'Anytime. Upgrades apply immediately; downgrades take effect at the start of your next billing cycle, so you never lose access mid-event.' },
  ];
  readonly openFaqIndex = signal<number | null>(null);

  toggleFaq(index: number): void {
    this.openFaqIndex.update((current) => (current === index ? null : index));
  }
}
