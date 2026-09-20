import { Component, DestroyRef, HostListener, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { Header } from '../../components/header/header';
import { Footer } from '../../components/footer/footer';
import { ROUTE_PATHS } from '../../shared/routes.constants';
import { CreateEventModalService } from '../../shared/services/create-event-modal.service';
import { AuthModalService } from '../../shared/services/auth-modal.service';
import { AuthApi } from '../../shared/services/auth-api';
import { ApiError, UserRole } from '../../shared/models/auth.models';
import {
  HeroCapability,
  AiCapabilityCard,
  TabDemo,
  FlowStep,
  ProductOffering,
  StatItem,
  Testimonial,
  FaqItem,
} from '../../shared/models/home/home.models';

@Component({
  selector: 'app-home',
  imports: [Header, Footer, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private readonly destroyRef = inject(DestroyRef);
  private readonly createEventModal = inject(CreateEventModalService);
  private readonly authModal = inject(AuthModalService);
  private readonly authApi = inject(AuthApi);
  private readonly router = inject(Router);

  // Events are a Foodie-only concept - there was no check at all here
  // before, meaning a signed-out visitor, or a signed-in Host or
  // Supplier, could reach /events and open the create-event modal just
  // as easily as a Foodie could. /events itself only guards
  // authentication (authGuard), not role, so this check has to live
  // here rather than being something the route already handles.
  //
  // 'switch' vs 'enable' reflects two genuinely different situations,
  // not just different wording for the same one: 'switch' means the
  // account already has a Foodie profile (just isn't currently operating
  // as it) - enabling would be a no-op there. 'enable' means it doesn't
  // exist yet and creating it is a real action with its own profile
  // record, same as registration does the first time.
  readonly accessMessage = signal('');
  readonly accessAction = signal<'sign-in' | 'switch' | 'enable' | null>(null);
  readonly isEnablingFoodie = signal(false);
  readonly enableError = signal('');

  // Drives hiding "Get Started - It's Free" in the closing CTA - that
  // button sits far down the page from accessMessage's banner (which
  // only renders once, near the hero). A signed-in non-Foodie clicking
  // it would trigger the same access check as the hero's own button,
  // but the resulting message would appear at the top of the page, far
  // from where they actually clicked - reading as an unrelated, broken
  // error rather than a response to their click. Hiding the button
  // avoids that mismatch rather than relocating or duplicating the
  // message near the bottom CTA too.
  readonly isLoggedInAsNonFoodie = computed(
    () => this.authApi.isAuthenticated() && this.authApi.currentSession()?.activeRole !== 'foodie',
  );

  openCreateEvent(): void {
    if (!this.authApi.isAuthenticated()) {
      // Straight to the login/register modal - no intermediate message
      // step for this case, since there's nothing to explain yet: they
      // just need to sign in, same as every other "not signed in" entry
      // point in this app (Get Started, Start Free).
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      this.authModal.open();
      return;
    }
    const session = this.authApi.currentSession();
    if (session?.activeRole === 'foodie') {
      this.accessMessage.set('');
      this.accessAction.set(null);
      this.router.navigateByUrl('/events').then(() => this.createEventModal.open());
      return;
    }
    this.enableError.set('');
    if (session?.roles.includes('foodie')) {
      // Already has a Foodie profile, just isn't currently on it -
      // switching is enough, no new profile to create.
      this.accessMessage.set(
        `You're currently on your ${this.roleDisplayName(session.activeRole)} profile. Switch to your Foodie profile to create an event.`,
      );
      this.accessAction.set('switch');
    } else {
      // No Foodie profile on this account at all yet - creating one is
      // a real action, same as registering with that role the first
      // time would have been.
      this.accessMessage.set(
        `Creating events needs a Foodie profile, and this account doesn't have one yet. Enable a Foodie profile to get started - it only takes a moment.`,
      );
      this.accessAction.set('enable');
    }
  }

  dismissAccessMessage(): void {
    this.accessMessage.set('');
    this.accessAction.set(null);
    this.enableError.set('');
  }

  // The one action available directly from the access-denied message
  // itself for a signed-out visitor - opens the same login/register flow
  // "Get Started" already uses, rather than leaving the message as a
  // dead end with no next step.
  signInFromAccessMessage(): void {
    this.accessMessage.set('');
    this.accessAction.set(null);
    // Instant, not smooth - this scroll is immediately followed by
    // authModal.open(), which locks page scroll via BodyScrollLockService.
    // A still-animating smooth scroll interrupted mid-flight by the lock
    // taking over produced unpredictable final scroll positions on
    // unlock (confirmed directly) - instant removes the race entirely,
    // and the modal covers the screen immediately anyway, so the
    // animation was never visible to begin with.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    this.authModal.open();
  }

  // Already has a Foodie profile - just needs to be made the active one.
  // Proceeds straight into event creation on success, since that was the
  // whole reason this popup opened in the first place.
  switchToFoodieAndCreateEvent(): void {
    this.authApi.switchActiveRole('foodie');
    this.dismissAccessMessage();
    this.router.navigateByUrl('/events').then(() => this.createEventModal.open());
  }

  // No Foodie profile on the account yet - creates one (a real action,
  // with its own profile record, same as registering with that role
  // originally would have done), then proceeds straight into event
  // creation on success, for the same reason as switchToFoodieAndCreateEvent.
  enableFoodieAndCreateEvent(): void {
    this.isEnablingFoodie.set(true);
    this.enableError.set('');
    this.authApi
      .enableRole('foodie')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isEnablingFoodie.set(false);
          this.dismissAccessMessage();
          this.router.navigateByUrl('/events').then(() => this.createEventModal.open());
        },
        error: (err: ApiError) => {
          this.isEnablingFoodie.set(false);
          this.enableError.set(err.message || 'Something went wrong enabling your Foodie profile. Please try again.');
        },
      });
  }

  private roleDisplayName(role: UserRole | undefined): string {
    switch (role) {
      case 'venue':
        return 'Host';
      case 'supplier':
        return 'Supplier';
      case 'chef':
        return 'Chef';
      case 'foodie':
        return 'Foodie';
      default:
        return 'current';
    }
  }

  // "Get Started" sits in the closing CTA at the bottom of a long page.
  // For a signed-in visitor, "get started" already has an obvious next
  // step — they don't have an account left to create, so sending them to
  // sign-in again would be a dead end. Route them straight to Create
  // Event instead, matching the exact same modal-parent behavior as
  // Header and Home's own hero CTA. A signed-out visitor still gets the
  // original login/register flow, scrolled to the hero first so closing
  // that modal doesn't strand them wherever they were on the page.
  getStarted(): void {
    if (this.authApi.isAuthenticated()) {
      this.openCreateEvent();
      return;
    }
    // Instant, not smooth - this scroll is immediately followed by
    // authModal.open(), which locks page scroll via BodyScrollLockService.
    // A still-animating smooth scroll interrupted mid-flight by the lock
    // taking over produced unpredictable final scroll positions on
    // unlock (confirmed directly) - instant removes the race entirely,
    // and the modal covers the screen immediately anyway, so the
    // animation was never visible to begin with.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    this.authModal.open();
  }

  // The "How it works" content lives on the Pricing page, not Home, and
  // this router has no anchorScrolling configured — a fragment link
  // alone would change the URL but never actually move the viewport.
  // Same navigate-then-act pattern as Header.openCreateEvent(): wait for
  // the Promise from navigateByUrl() to resolve (meaning Pricing is
  // actually mounted) before reaching for an element that doesn't exist
  // yet on the page currently on screen.
  seeHowItWorks(): void {
    this.router.navigateByUrl('/pricing').then(() => {
      // The navigateByUrl() Promise resolving means Angular has mounted
      // the new page, but not necessarily that the browser has finished
      // painting it. Confirmed directly: scrolling immediately after the
      // Promise resolves lands ~585px short and consistently, every
      // time, while the exact same scroll call made after landing on
      // /pricing normally (no SPA transition involved) works perfectly.
      // A short delay lets rendering settle before the scroll commits.
      setTimeout(() => {
        const el = document.getElementById('how-it-works');
        if (!el) return;
        const targetY = el.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: targetY, behavior: 'smooth' });
      }, 100);
    });
  }

  // The "Three products" section sits far down Home, and this router has
  // no scrollPositionRestoration configured — landing on Buuz, Kitchen
  // Lab, or the Events dashboard from way down this page would otherwise
  // keep whatever scroll offset Home had, dropping the visitor into the
  // middle of the new page's content instead of its top. An instant
  // jump, not smooth — this is a genuinely different page loading, not a
  // scroll within one, so animating the transition would look like a
  // glitch rather than a deliberate scroll.
  readonly buuzPath = ROUTE_PATHS.buuz;
  readonly kitchenLabPath = ROUTE_PATHS.kitchenLab;
  readonly eventsPath = ROUTE_PATHS.events;
  navigateAndScrollToTop(path: string): void {
    this.router.navigateByUrl(path).then(() => window.scrollTo(0, 0));
  }

  // ── Hero: "Inside Tarbuuz Events" capability panel ──
  // Auto-cycles through capability rows, mirroring the original page's
  // setInterval-driven highlight. The interval is explicitly cleared via
  // DestroyRef on component destroy — the original vanilla-JS version never
  // needed this, since a plain HTML page never "destroys" its script context,
  // but an Angular component can be created and destroyed many times across
  // a user's session (e.g. navigating away and back), so an uncleared
  // interval here would be a real, accumulating memory leak.
  readonly heroCapabilities: readonly HeroCapability[] = [
    { icon: '🍽️', name: 'Smart Menu', status: 'Generated 3 seasonal menus' },
    { icon: '🤖', name: 'Agentic Chef', status: 'Coordinating 3 chefs & prep' },
    { icon: '⚖️', name: 'Intelligent Bidding', status: '7 vendor bids ranked by value' },
    { icon: '📈', name: 'Predictive Analytics', status: 'Forecast spend & headcount' },
  ];
  readonly activeCapIndex = signal(0);

  // ── AI capability grid (static, no interaction) ──
  readonly aiCapabilities: readonly AiCapabilityCard[] = [
    { icon: '🍽️', title: 'Smart Menu', description: 'Describe the occasion and dietary needs - Menu Agent drafts complete, costed menus tuned to your guests, season, and budget in seconds.' },
    { icon: '🤖', title: 'Agentic Chef', description: 'An autonomous assistant that behaves like a chef, validates the Smart Menu, provides a signature dish, and keeps the budget and dietary requirements on the same page for you.' },
    { icon: '⚖️', title: 'Intelligent Bidding', description: 'Verified hosts compete for your event. Bidding Agent ranks every bid by true value - price, ratings, distance, and fit - not just the lowest number, and presents the top bids.' },
    { icon: '📈', title: 'Predictive Analytics', description: 'Forecasts built from the analysis of thousands of past events help Suppliers and Hosts avoid last-minute surprises and serve guests better.' },
    { icon: '🥗', title: 'Dietary Intelligence', description: 'Agentic Chef flags allergens and adapts every dish for vegan, halal, gluten-free, and more - no spreadsheet cross-checking required.' },
    { icon: '💰', title: 'Budget Optimizer', description: 'Set a target and let Agentic Chef rebalance menu, staffing, and hosts to hit it - showing exactly what each trade-off costs or saves.' },
  ];

  // ── Interactive tab demo ──
  readonly tabDemos: readonly TabDemo[] = [
    {
      icon: '🍽️', label: 'Smart Menu', emoji: '🍽️',
      image: 'images/home/smart-menu.jpg',
      imageAlt: 'Smart Menu screen generating multiple complete, priced menus for an event',
      title: 'Menus in seconds, not meetings',
      description: 'Type the occasion and headcount. Smart Menu returns multiple complete, priced menus you can tweak line by line.',
      features: ['Seasonal, budget-aware suggestions', 'Swap any dish and see cost update live', 'One click to send for chef review'],
    },
    {
      icon: '🤖', label: 'Agentic Chef', emoji: '🤖',
      image: 'images/home/agentic-chef.jpg',
      imageAlt: 'Agentic Chef dashboard assigning AI chef agents and building a prep and service timeline',
      title: 'An assistant that runs the kitchen',
      description: 'Agentic Chef turns an approved menu into a coordinated plan - assigning chefs, sequencing prep, and flagging conflicts before they happen.',
      features: ['Auto-assigns AI agent by specialty', 'Builds the prep & service timeline', 'Keeps every recipe in sync'],
    },
    {
      icon: '⚖️', label: 'Intelligent Bidding', emoji: '⚖️',
      image: 'images/home/bidding.jpg',
      imageAlt: 'Intelligent Bidding view ranking verified host bids by AI value score',
      title: 'Let hosts compete for you',
      description: 'Post once and watch verified hosts bid. AI scores each on real value so the best fit rises to the top automatically.',
      features: ['Transparent, ranked bid comparison', 'Scored on price, rating, and distance', 'No haggling - accept and go'],
    },
    {
      icon: '📈', label: 'Predictive Analytics', emoji: '📈',
      image: 'images/home/prediction.jpg',
      imageAlt: 'Predictive Analytics dashboard forecasting headcount and spend with confidence bands',
      title: 'Know before it happens',
      description: 'Predictive Analytics reads thousands of past events to forecast your real numbers - so budgets hold and nothing runs short.',
      features: ['Headcount & no-show forecasting', 'Spend projections with confidence bands', 'Ideal order quantities per dish'],
    },
  ];
  readonly activeTabIndex = signal(0);
  readonly activeTabDemo = computed(() => this.tabDemos[this.activeTabIndex()]);

  // ── "How it works" steps ──
  readonly flowSteps: readonly FlowStep[] = [
    { number: '01', title: 'Describe your event', description: 'The occasion, headcount, and vibe - in plain language, no forms marathon.' },
    { number: '02', title: 'AI builds the match', description: 'Menus generate, hosts bid, analytics forecast - all in one review-and-approve flow.' },
    { number: '03', title: 'You approve, they cook', description: 'Pick your favorites, confirm, and let real hosts and suppliers take it from there.' },
  ];

  // ── Product zigzag ──
  readonly products: readonly ProductOffering[] = [
    {
      visualClass: 'zv-events', icon: '🎪', showHalo: true,
      image: 'images/home/events.jpg',
      imageAlt: 'Tarbuuz Events marketplace turning an AI-generated menu and ranked host bids into a booking',
      tagVariant: 'ai', tagLabel: '✨ AI-Matched',
      name: 'Events',
      description: 'The core marketplace, powered by the full AI stack above - from Smart Menu to Predictive Analytics, all in one place.',
      features: ['AI-generated, costed menus', 'Ranked bids from verified hosts', 'Review, approve, and book in one flow'],
      ctaLabel: 'Start planning →', ctaPath: ROUTE_PATHS.events,
    },
    {
      visualClass: 'zv-buuz', icon: '🍹', showHalo: false,
      image: 'images/home/buuz.jpg',
      imageAlt: 'Buuz ready-to-pour cocktail and mocktail mixes - cubes, spheres, and a bottle on a marble counter',
      tagVariant: 'plain', tagLabel: 'Ready to pour',
      name: 'Buuz',
      description: 'Ready-to-pour cocktail and mocktail mixes - cubes, spheres, or bottles. Just add your spirit and serve.',
      features: ['Cubes, spheres, and bottled formats', 'Alcoholic, Non-Alcoholic, and zero-proof options', 'Ships nationwide, event-ready'],
      ctaLabel: 'Shop Buuz →', ctaPath: ROUTE_PATHS.buuz,
    },
    {
      visualClass: 'zv-kitchen', icon: '👨‍🍳', showHalo: false,
      image: 'images/home/kitchen-lab.jpg',
      imageAlt: 'Kitchen Lab commercial kitchen where chefs cook and earn royalties on licensed recipes',
      tagVariant: 'plain', tagLabel: 'Earn as you cook',
      name: 'Kitchen Lab',
      description: 'Rent commercial kitchen space by the hour - and earn ongoing royalties every time your recipes get used.',
      features: ['Book verified commercial kitchens', 'License your recipes to the network', 'Collect royalties on every use'],
      ctaLabel: 'Explore Kitchen Lab →', ctaPath: ROUTE_PATHS.kitchenLab,
    },
  ];

  // ── Stats ──
  readonly stats: readonly StatItem[] = [
    { value: '6', label: 'AI systems per event', variant: 'indigo' },
    { value: '10K+', label: 'Events planned', variant: 'default' },
    { value: '500+', label: 'Verified suppliers', variant: 'amber' },
    { value: '98%', label: 'Host satisfaction', variant: 'default' },
  ];

  // ── Testimonial ──
  readonly testimonial: Testimonial = {
    quote: 'I described a 20-person launch party on a Tuesday and had the full menu with quotes by Saturday morning. Tarbuuz did in a few days what used to take me two weeks of emails.',
    authorInitials: 'RP',
    authorName: 'Raina Patel',
    authorRole: 'Corporate Organizer',
  };

  // ── FAQ accordion ──
  readonly faqItems: readonly FaqItem[] = [
    { question: 'Does AI replace the chefs and vendors?', answer: 'Not at all. AI handles the tedious matching, drafting, and forecasting - then real, verified hosts and suppliers do the cooking and serving. You always review and approve before anything is booked.' },
    { question: 'How fast can I get a menu and quotes?', answer: 'Smart Menu returns complete draft menus in seconds, and most events receive their first ranked hosts bids within days of posting.' },
    { question: 'Can it handle dietary restrictions and allergies?', answer: 'Dietary Intelligence automatically flags allergens and adapts every dish for vegan, halal, kosher, gluten-free, and other needs across your whole guest list.' },
    { question: 'What does it cost to start?', answer: "Every Foodie account starts on our Free plan automatically when you register - no credit card required, and no subscription cost. Creating events, generating menus, and collecting bids are all included - and there's no service fee when you confirm a booking either." },
  ];
  readonly openFaqIndex = signal<number | null>(null);

  constructor() {
    const intervalId = setInterval(() => {
      this.activeCapIndex.update((i) => (i + 1) % this.heroCapabilities.length);
    }, 1800);

    this.destroyRef.onDestroy(() => clearInterval(intervalId));
  }

  selectTab(index: number): void {
    this.activeTabIndex.set(index);
  }

  toggleFaq(index: number): void {
    this.openFaqIndex.update((current) => (current === index ? null : index));
  }

  // ── Image preview (hover peek + click/tap pinned modal) ──
  // The "See it in action" panels and product shots carry fine detail -
  // menu line items, dashboard figures - that isn't legible at the size
  // they render inline. Hovering pops the full image up, centered, so it
  // can be read; clicking/tapping (or Enter/Space) "pins" it open for
  // touch and keyboard users, who get no hover and need an explicit close.
  //
  // Why two modes rather than one: a pinned overlay must capture pointer
  // events so its backdrop and close button work, but a hover overlay must
  // NOT - a full-screen backdrop sitting under the cursor would steal the
  // hover from the thumbnail, fire mouseleave, close, then immediately
  // reopen, flickering forever. So the hover overlay is pointer-events:none
  // (see home.scss) and closes off the thumbnail's own mouseleave instead.
  readonly preview = signal<{ src: string; alt: string } | null>(null);
  readonly previewPinned = signal(false);

  openHoverPreview(src: string, alt: string): void {
    if (this.previewPinned()) return; // a pinned preview owns the screen until dismissed
    this.preview.set({ src, alt });
  }

  openPinnedPreview(src: string, alt: string): void {
    this.preview.set({ src, alt });
    this.previewPinned.set(true);
  }

  onPreviewTriggerLeave(): void {
    if (!this.previewPinned()) this.preview.set(null);
  }

  closePreview(): void {
    this.preview.set(null);
    this.previewPinned.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscapePreview(): void {
    if (this.preview()) this.closePreview();
  }
}
