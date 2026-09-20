import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HostBiddingService } from '../../shared/services/host-bidding.service';
import { ReviewMenuService } from '../../shared/services/review-menu.service';
import { AgenticChefService } from '../../shared/services/agentic-chef.service';
import { AgenticChef } from '../agentic-chef/agentic-chef';
import { Footer } from '../../components/footer/footer';
import { BiddingOpportunity } from '../../shared/models/host-bidding.model';
import { BidSubmission, BusinessType, BUSINESS_TYPE_LABELS } from '../../shared/models/bid.model';
import { CUISINE_ICONS, AMBIENCE_MAP, FoodieEvent } from '../../shared/models/foodie-event.model';
import { CourseSection } from '../../shared/models/menu/menu-recommendation.model';

interface BusinessTypeOption {
  readonly value: BusinessType;
  readonly label: string;
}

const CURRENCY_SYMBOLS: Record<string, string> = { USD: '$', GBP: '£', EUR: '€', INR: '₹' };

/**
 * Submit Bid — the page a Host lands on after clicking "Submit Bid →" on
 * a Bidding Events opportunity card. Reuses the same event-header /
 * meta-chip / menu-preview visual language established on Review Menu
 * and the Agentic Chef drawer, but this page's own reason to exist is
 * the bid form itself: bidderBusinessType, bidAmount, serviceCapacity,
 * proposal — field-for-field the same FormGroup the old standalone
 * component used, so a Host's muscle memory around this form doesn't
 * need to relearn anything, just look different.
 */
@Component({
  selector: 'app-submit-bid',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, DatePipe, TitleCasePipe, AgenticChef, Footer],
  templateUrl: './submit-bid.html',
  styleUrl: './submit-bid.scss',
})
export class SubmitBid implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly hostBiddingService = inject(HostBiddingService);
  private readonly reviewMenuService = inject(ReviewMenuService);
  private readonly agenticChefService = inject(AgenticChefService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly isLoading = signal(true);
  readonly notFound = signal(false);
  readonly opportunity = signal<BiddingOpportunity | null>(null);
  readonly isSubmitting = signal(false);
  readonly showSuccessModal = signal(false);

  // Kept as its own signal (rather than only ever existing as a local
  // variable inside loadMenu()) specifically so the Agentic Chef drawer
  // below has a real FoodieEvent to bind to as its [event] input - the
  // drawer needs the same event object Review Menu would have used to
  // look up this event's persisted chef-recommendation state correctly.
  readonly syntheticEvent = signal<FoodieEvent | null>(null);

  // "Only when the Foodie accepted the recommendation on Review Menu's
  // drawer, else not" - checked via getPersistedResponse (not
  // getPersistedResult, which only answers for whichever event this
  // service's drawer currently has loaded in memory - a check this page
  // would never satisfy, since it never opens that drawer via Review
  // Menu's own flow). Worth flagging for whoever tests this:
  // BiddingOpportunity records in this app's mock host-bidding data
  // (op-1, op-2, etc.) aren't actually linked to any real, Foodie-
  // created event id - so with today's mock data, this will never
  // actually find a match. The check itself is correct and ready for
  // whenever a real opportunity carries its originating event's real id.
  readonly showChefRecommendationsButton = computed(() => {
    const ev = this.syntheticEvent();
    if (!ev) return false;
    return this.agenticChefService.getPersistedResponse(ev.id) === 'accept';
  });

  // The menu itself, replacing the old layout's dish list. Reuses
  // ReviewMenuService.getMenuForEvent() - the exact same service and
  // mock-generation logic Review Menu already uses - rather than a
  // second, separately-maintained menu source that could drift out of
  // sync with it. That service needs a full FoodieEvent, which
  // BiddingOpportunity isn't (it's a narrower, bid-list-specific shape),
  // so a synthetic FoodieEvent is assembled from the opportunity's own
  // fields with placeholder values only for the handful of fields the
  // generator doesn't actually read (eventType, duration, specialRequest,
  // contactName) - never fields that affect what menu gets generated.
  readonly courses = signal<CourseSection[]>([]);
  readonly isMenuLoading = signal(true);

  // Field-for-field identical to the old component's createBidForm() -
  // bidderBusinessType and serviceCapacity both required with min(1),
  // bidAmount required with min(1), proposal genuinely optional (no
  // validators at all). Kept even the exact field names, since a
  // BidSubmission built from this form's raw value should need no
  // remapping.
  readonly bidForm: FormGroup = this.fb.group({
    bidderBusinessType: ['', Validators.required],
    bidAmount: ['', [Validators.required, Validators.min(1)]],
    proposal: [''],
    serviceCapacity: ['', [Validators.required, Validators.min(1)]],
  });

  readonly businessTypeOptions: readonly BusinessTypeOption[] = (
    Object.values(BusinessType) as BusinessType[]
  ).map((value) => ({ value, label: BUSINESS_TYPE_LABELS[value] }));

  readonly currencySymbol = computed(() => {
    const currency = this.opportunity()?.budgetCurrency ?? 'USD';
    return CURRENCY_SYMBOLS[currency] ?? '$';
  });

  readonly ambience = computed(() => {
    const a = this.opportunity()?.eventAmbience;
    return a ? AMBIENCE_MAP[a] : undefined;
  });

  // Live countdown, refreshed on an interval - matches the pattern
  // already established for this same bidClosingAt field on the Host
  // Dashboard's own opportunity cards, so the same event shows a
  // consistent countdown whether viewed from the list or this page.
  readonly bidTimerText = signal('');
  private timerIntervalId: ReturnType<typeof setInterval> | null = null;

  readonly showAgenticChef = signal(false);

  readonly bidEstimate = computed(() => {
    const amount = Number(this.bidForm.get('bidAmount')?.value);
    const guests = this.opportunity()?.guestCount ?? 0;
    if (!amount || amount <= 0 || !guests) return null;
    return amount * guests;
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('opportunityId');
    if (!id) {
      this.isLoading.set(false);
      this.notFound.set(true);
      return;
    }

    this.hostBiddingService
      .getOpportunityById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((opp) => {
        this.isLoading.set(false);
        if (!opp) {
          this.notFound.set(true);
          return;
        }
        this.opportunity.set(opp);
        this.updateTimer();
        this.timerIntervalId = setInterval(() => this.updateTimer(), 30000);
        this.loadMenu(opp);
      });

    this.destroyRef.onDestroy(() => {
      if (this.timerIntervalId !== null) clearInterval(this.timerIntervalId);
    });
  }

  private loadMenu(opp: BiddingOpportunity): void {
    // Only the fields the mock menu generator actually reads (cuisines,
    // dietary needs, guest count, ambience) come from the real
    // opportunity. Everything else is a placeholder that has no bearing
    // on what gets generated - never silently substituted for a field
    // that *would* affect the output.
    const syntheticEvent: FoodieEvent = {
      id: opp.id,
      eventName: opp.eventName,
      eventType: 'other',
      status: 'submitted_for_bid',
      eventDate: opp.eventDate,
      eventTimezone: opp.eventTimezone,
      eventTime: opp.eventTime,
      duration: '',
      guestCount: opp.guestCount,
      eventAmbience: opp.eventAmbience,
      preferredCuisines: opp.preferredCuisines,
      dietaryPreferences: opp.dietaryPreferences,
      specialRequest: '',
      budget: opp.budgetPerPerson,
      eventLocation: opp.location,
      contactName: '',
    };

    this.syntheticEvent.set(syntheticEvent);

    this.reviewMenuService
      .getMenuForEvent(syntheticEvent)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((courses) => {
        this.courses.set(courses);
        this.isMenuLoading.set(false);
      });
  }

  private updateTimer(): void {
    const opp = this.opportunity();
    if (!opp) return;
    const msLeft = new Date(opp.bidClosingAt).getTime() - Date.now();
    if (msLeft <= 0) {
      this.bidTimerText.set('Bidding closed');
      return;
    }
    const totalHours = Math.floor(msLeft / (1000 * 60 * 60));
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    const mins = Math.floor((msLeft / (1000 * 60)) % 60);
    this.bidTimerText.set(days > 0 ? `${days}d ${hours}h left to bid` : `${hours}h ${mins}m left to bid`);
  }

  cuisineIcon(cuisine: string): string {
    return CUISINE_ICONS[cuisine.toLowerCase()] ?? CUISINE_ICONS['default'];
  }

  // Field-level error checks the template calls directly, rather than
  // repeating `bidForm.get('x')?.invalid && bidForm.get('x')?.touched`
  // inline four times - the exact condition the old component's
  // template used per field, just centralized once here.
  hasError(field: string): boolean {
    const control = this.bidForm.get(field);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  getErrorMessage(field: string): string {
    const control = this.bidForm.get(field);
    if (!control || !control.errors) return '';
    if (control.errors['required']) {
      if (field === 'bidderBusinessType') return 'Business type is required';
      if (field === 'bidAmount') return 'Bid amount is required';
      if (field === 'serviceCapacity') return 'Service capacity is required';
      return 'This field is required';
    }
    if (control.errors['min']) {
      if (field === 'bidAmount') return 'Bid amount must be greater than 0';
      if (field === 'serviceCapacity') return 'Service capacity must be at least 1 guest';
      return 'Value is too low';
    }
    return '';
  }

  onSubmit(): void {
    if (this.bidForm.invalid) {
      // Marking every control touched (not just the ones a person has
      // already visited) is what surfaces error messages on fields
      // they never focused at all - without this, clicking Submit
      // immediately on an empty form would fail validation silently,
      // with no visible indication of which fields need attention.
      this.bidForm.markAllAsTouched();
      return;
    }

    const opp = this.opportunity();
    if (!opp) return;

    this.isSubmitting.set(true);
    const raw = this.bidForm.getRawValue();
    const submission: BidSubmission = {
      eventId: opp.id,
      eventName: opp.eventName,
      bidderBusinessType: raw.bidderBusinessType,
      bidderProfileId: 'current-host', // Placeholder until a real host-profile ID is wired through auth
      bidAmount: Number(raw.bidAmount),
      currency: opp.budgetCurrency,
      proposal: (raw.proposal ?? '').trim(),
      estimatedCompletionDate: opp.eventDate,
      serviceCapacity: Number(raw.serviceCapacity),
      status: 'submitted',
    };

    this.hostBiddingService
      .submitBid(submission)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.isSubmitting.set(false);
        this.showSuccessModal.set(true);
      });
  }

  closeSuccessModal(): void {
    this.showSuccessModal.set(false);
    this.goToDashboard();
  }

  goToDashboard(): void {
    this.router.navigateByUrl('/host-dashboard').then(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    });
  }

  openAgenticChef(): void {
    this.showAgenticChef.set(true);
  }

  closeAgenticChef(): void {
    this.showAgenticChef.set(false);
  }
}
