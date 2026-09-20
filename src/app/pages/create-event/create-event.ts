import { Component, DestroyRef, ElementRef, HostListener, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs';
import { CreateEventService } from '../../shared/services/create-event.service';
import { FoodieEventsService } from '../../shared/services/foodie-events.service';
import { CreateEventModalService } from '../../shared/services/create-event-modal.service';
import { CreateEventFormState } from '../../shared/models/create-event/create-event.model';
import { EventFormData } from '../../shared/models/event-creation.model';
import { AuthApi } from '../../shared/services/auth-api';

/**
 * The 6-step Create Event wizard — now a globally-mounted popup rather
 * than a routed page. Mounted once in the root App component and shown
 * via CreateEventModalService.isOpen(), so Header's "Event" link, Home's
 * hero CTA, and the dashboard's own "+ Create Event" button can all open
 * the exact same instance without navigating away from wherever they
 * were. Two real Angular-specific concerns the original standalone
 * reference never had to handle, both addressed the same way as in the
 * Kitchen Lab conversion: the submit-popup's rotating status-message
 * ticker runs on a setInterval that must be cleared via DestroyRef, and
 * the delivery banner's "continue anyway" dismissal resets itself if the
 * date changes to a new value.
 */
@Component({
  selector: 'app-create-event',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule],
  templateUrl: './create-event.html',
  styleUrl: './create-event.scss',
})
export class CreateEvent {
  private readonly createEventService = inject(CreateEventService);
  private readonly foodieEventsService = inject(FoodieEventsService);
  private readonly authApi = inject(AuthApi);
  private readonly router = inject(Router);
  private readonly elementRef = inject(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  readonly modalService = inject(CreateEventModalService);

  readonly eventTypes = this.createEventService.eventTypes;
  readonly dietaryOptions = this.createEventService.dietaryOptions;
  readonly ambianceOptions = this.createEventService.ambianceOptions;
  readonly deliveryApps = this.createEventService.deliveryApps;
  readonly stepLabels = this.createEventService.stepLabels;
  readonly timezones = this.createEventService.timezones;
  readonly popularCuisines = this.createEventService.popularCuisineKeys
    .map((k) => this.createEventService.findCuisine(k))
    .filter((c): c is NonNullable<typeof c> => !!c);

  // ── Wizard navigation ──
  readonly currentStep = signal(0);
  readonly maxReachedStep = signal(0);

  // ── Form state — one signal per field, matching the original's plain
  //    state object but reactive ──
  readonly eventType = signal<string | null>(null);
  readonly eventTypeOther = signal('');
  readonly eventName = signal('');
  readonly date = signal('');
  readonly time = signal('');

  // A native <input type="time"> renders its AM/PM segment empty by
  // default in most browsers — a blank slot next to filled hour/minute
  // fields reads as broken or half-entered, not just "not chosen yet".
  // Three explicit selects avoid that ambiguity entirely: every part is
  // always visibly filled with something, never an empty native widget
  // waiting to be understood. These combine into the same 24-hour
  // "HH:MM" string `time` always held — nothing downstream (validation,
  // EventFormData, FoodieEvent mapping) needs to know this UI exists.
  readonly timeHour = signal('');
  readonly timeMinute = signal('');
  readonly timePeriod = signal<'AM' | 'PM'>('AM');
  readonly hourOptions = Array.from({ length: 12 }, (_, i) => String(i + 1));
  readonly minuteOptions = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

  setTimeHour(h: string): void {
    this.timeHour.set(h);
    this.recomputeTime();
  }
  setTimeMinute(m: string): void {
    this.timeMinute.set(m);
    this.recomputeTime();
  }
  setTimePeriod(p: 'AM' | 'PM'): void {
    this.timePeriod.set(p);
    this.recomputeTime();
  }
  private recomputeTime(): void {
    const h = this.timeHour();
    const m = this.timeMinute();
    if (!h || !m) {
      this.time.set('');
      return;
    }
    let h24 = parseInt(h, 10) % 12;
    if (this.timePeriod() === 'PM') h24 += 12;
    this.time.set(`${String(h24).padStart(2, '0')}:${m}`);
  }
  readonly timezone = signal(this.createEventService.detectedTimezone());
  readonly duration = signal('2');
  readonly guestCount = signal('');
  readonly cuisines = signal<ReadonlySet<string>>(new Set());
  readonly dietary = signal<ReadonlySet<string>>(new Set());
  // Single-select and a real numeric value now — reconciled against the
  // real component's validateStep(), which checks `!eventAmbience` (one
  // value) and `budget < 1` (a number), not a Set size or a range key.
  readonly ambiance = signal<string | null>(null);
  readonly budget = signal('');
  readonly city = signal('');
  readonly area = signal('');
  readonly requests = signal('');

  readonly formState = computed<CreateEventFormState>(() => ({
    eventType: this.eventType(),
    eventTypeOther: this.eventTypeOther(),
    eventName: this.eventName(),
    date: this.date(),
    time: this.time(),
    timezone: this.timezone(),
    duration: this.duration(),
    guestCount: this.guestCount(),
    cuisines: this.cuisines(),
    dietary: this.dietary(),
    ambiance: this.ambiance(),
    budget: this.budget(),
    city: this.city(),
    area: this.area(),
    requests: this.requests(),
  }));

  readonly currentStepValid = computed(() => this.createEventService.isStepValid(this.currentStep(), this.formState()));

  // ── Per-field validation messages ──
  // A field only shows its error once it's actually been interacted with
  // (blurred, or the step's Continue button was clicked) — otherwise
  // every required field on a fresh step would show red before the user
  // has even had a chance to fill it in, which reads as broken, not helpful.
  private readonly touchedFields = signal<ReadonlySet<string>>(new Set());
  private readonly stepFieldNames: readonly (readonly string[])[] = [
    ['eventType', 'eventTypeOther'],
    ['eventName', 'date', 'time', 'timezone', 'duration'],
    ['guestCount', 'cuisines'],
    ['ambiance'],
    ['budget', 'city'],
    [],
  ];

  markTouched(field: string): void {
    if (this.touchedFields().has(field)) return;
    const next = new Set(this.touchedFields());
    next.add(field);
    this.touchedFields.set(next);
  }

  private markStepTouched(step: number): void {
    const fields = this.stepFieldNames[step] ?? [];
    if (fields.length === 0) return;
    const next = new Set(this.touchedFields());
    fields.forEach((f) => next.add(f));
    this.touchedFields.set(next);
  }

  fieldError(field: string): string {
    if (!this.touchedFields().has(field)) return '';
    return this.createEventService.fieldErrorMessage(field, this.formState());
  }

  readonly selectedEventTypeName = computed(() => {
    if (this.eventType() === 'other') return this.eventTypeOther();
    return this.createEventService.findEventType(this.eventType())?.name ?? null;
  });

  // ── Delivery banner (step 1) ──
  readonly daysUntilEvent = computed(() => this.createEventService.daysUntil(this.date()));
  readonly withinDeliveryWindow = computed(() => {
    const days = this.daysUntilEvent();
    return days !== null && days >= 0 && days <= 3;
  });
  private readonly dismissedForDate = signal<string | null>(null);
  readonly showDeliveryBanner = computed(() => this.withinDeliveryWindow() && this.dismissedForDate() !== this.date());
  readonly deliveryBannerHeadline = computed(() => {
    const days = this.daysUntilEvent();
    const when = days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`;
    return `⚡ Your event is ${when} — perfect timing for instant delivery`;
  });
  dismissDeliveryBanner(): void {
    this.dismissedForDate.set(this.date());
  }

  // ── Cuisine search + autocomplete ──
  readonly cuisineSearchControl = new FormControl('', { nonNullable: true });
  private readonly cuisineSearchTerm = signal('');
  readonly cuisineDropdownOpen = signal(false);
  readonly groupedCuisineResults = computed(() => {
    const results = this.createEventService.searchCuisines(this.cuisineSearchTerm());
    return Array.from(this.createEventService.groupCuisinesByRegion(results).entries());
  });
  readonly selectedCuisineNames = computed(() =>
    Array.from(this.cuisines())
      .map((k) => this.createEventService.findCuisine(k)?.name)
      .filter((n): n is string => !!n),
  );

  constructor() {
    this.cuisineSearchControl.valueChanges
      .pipe(debounceTime(120), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.cuisineSearchTerm.set(value);
        this.cuisineDropdownOpen.set(value.trim() !== '');
      });

    this.destroyRef.onDestroy(() => this.clearStatusInterval());

    // Reset to a blank wizard every time the popup opens — this is now a
    // globally-mounted, always-in-the-DOM component rather than a routed
    // page that gets torn down and recreated fresh on every navigation,
    // so without an explicit reset here, closing the popup after a
    // finished (or abandoned) attempt and reopening it later would show
    // whatever was left over from last time instead of a clean start.
    effect(() => {
      if (this.modalService.isOpen()) this.resetWizard();
    });
  }

  private resetWizard(): void {
    this.currentStep.set(0);
    this.maxReachedStep.set(0);
    this.eventType.set(null);
    this.eventTypeOther.set('');
    this.eventName.set('');
    this.date.set('');
    this.time.set('');
    this.timeHour.set('');
    this.timeMinute.set('');
    this.timePeriod.set('AM');
    this.timezone.set(this.createEventService.detectedTimezone());
    this.duration.set('2');
    this.guestCount.set('');
    this.cuisines.set(new Set());
    this.dietary.set(new Set());
    this.ambiance.set(null);
    this.budget.set('');
    this.city.set('');
    this.area.set('');
    this.requests.set('');
    this.touchedFields.set(new Set());
    this.dismissedForDate.set(null);
    this.cuisineSearchControl.setValue('');
    this.cuisineDropdownOpen.set(false);
    this.isSubmitting.set(false);
    this.clearStatusInterval();
    this.submittedEventData.set(null);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.cuisineDropdownOpen()) return;
    const wrap = this.elementRef.nativeElement.querySelector('.search-wrap');
    if (wrap && !wrap.contains(event.target)) this.cuisineDropdownOpen.set(false);
  }

  toggleCuisine(key: string): void {
    const next = new Set(this.cuisines());
    if (next.has(key)) next.delete(key);
    else next.add(key);
    this.cuisines.set(next);
    this.markTouched('cuisines');
  }

  addCuisineFromSearch(key: string): void {
    const next = new Set(this.cuisines());
    next.add(key);
    this.cuisines.set(next);
    this.markTouched('cuisines');
    this.cuisineSearchControl.setValue('');
    this.cuisineDropdownOpen.set(false);
  }

  // ── Dietary (optional, no validation requirement in the real form) / ambiance (single-select, required) ──
  toggleDietary(key: string): void {
    const next = new Set(this.dietary());
    if (next.has(key)) next.delete(key);
    else next.add(key);
    this.dietary.set(next);
  }

  selectAmbiance(key: string): void {
    this.ambiance.set(key);
    this.markTouched('ambiance');
  }

  // ── Review step summaries ──
  readonly reviewDietaryNames = computed(() =>
    Array.from(this.dietary()).map((k) => this.createEventService.findNamed(this.dietaryOptions, k)?.name).filter((n): n is string => !!n),
  );
  readonly reviewAmbianceName = computed(() => {
    const key = this.ambiance();
    return key ? (this.createEventService.findNamed(this.ambianceOptions, key)?.name ?? key) : null;
  });
  readonly durationLabel = computed(() => {
    const d = this.duration();
    return `${d}${d === '7' ? '+' : ''} hour${d === '1' ? '' : 's'}`;
  });

  // ── Step navigation ──
  goToStep(index: number): void {
    this.currentStep.set(index);
    this.maxReachedStep.set(Math.max(this.maxReachedStep(), index));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  isStepClickable(index: number): boolean {
    return index <= this.maxReachedStep() && index !== this.currentStep();
  }

  next(): void {
    this.markStepTouched(this.currentStep());
    if (!this.currentStepValid()) return;
    this.goToStep(this.currentStep() + 1);
  }

  back(): void {
    this.goToStep(this.currentStep() - 1);
  }

  // ── Submit + processing popup ──
  readonly isSubmitting = signal(false);
  readonly statusMessageIndex = signal(0);
  private statusIntervalId: ReturnType<typeof setInterval> | null = null;

  readonly currentStatusMessage = computed(() => this.createEventService.statusMessages[this.statusMessageIndex()]);
  readonly miniSteps = computed(() =>
    this.createEventService.miniStepLabels.map((label, i) => ({
      label,
      state: (i === 0 ? 'done' : i === 1 ? 'current' : 'locked') as 'done' | 'current' | 'locked',
    })),
  );

  /** The real EventFormData this whole wizard has been building toward —
   *  see CreateEventService.toEventFormData() for the actual field-by-
   *  field mapping and the judgment calls it documents (ambiance,
   *  budget). Built once, at submit time, not kept continuously in sync
   *  with the wizard's own in-progress state, since it only needs to
   *  exist once there's something complete to submit. No
   *  EventCreationService/backend exists yet to actually send this to —
   *  matches the same "model layer only" scope noted on
   *  event-creation.model.ts itself. */
  readonly submittedEventData = signal<EventFormData | null>(null);

  submitEvent(): void {
    const session = this.authApi.currentSession();
    const contactName = session ? `${session.firstName} ${session.lastName}`.trim() : '';
    this.submittedEventData.set(this.createEventService.toEventFormData(this.formState(), contactName));

    // The dashboard is a genuinely different audience from the payload
    // above — EventFormData is what a real backend would receive;
    // FoodieEvent is what this app's own dashboard renders. Both are
    // built from the same wizard state, but toFoodieEvent() keeps the
    // wizard's lowercase eventType key (dashboard icons look those up
    // directly) rather than mapEventType()'s uppercase backend codes.
    if (session) {
      const newEvent = this.createEventService.toFoodieEvent(this.formState(), session.userId, contactName);
      this.foodieEventsService.addEvent(session.userId, newEvent);
    }

    this.statusMessageIndex.set(0);
    this.clearStatusInterval();
    this.statusIntervalId = setInterval(() => {
      this.statusMessageIndex.update((i) => (i + 1) % this.createEventService.statusMessages.length);
    }, 2400);
    this.isSubmitting.set(true);
  }

  private clearStatusInterval(): void {
    if (this.statusIntervalId !== null) {
      clearInterval(this.statusIntervalId);
      this.statusIntervalId = null;
    }
  }

  goToHome(): void {
    this.clearStatusInterval();
    this.modalService.close();
    this.router.navigateByUrl('/').then(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    });
  }

  goToDashboard(): void {
    this.clearStatusInterval();
    this.modalService.close();
    this.router.navigateByUrl('/events').then(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    });
  }

  /** Dismisses just the submit-success sub-modal, not the whole wizard —
   *  matches that modal's own footer text ("safe to close this and come
   *  back anytime"). Leaves the wizard open on the Review step rather
   *  than forcing a destination the way the two CTA buttons above do. */
  closeSubmitModal(): void {
    this.clearStatusInterval();
    this.isSubmitting.set(false);
  }

  /** Dismisses the entire wizard popup — the outer overlay, not just the
   *  submit sub-modal. Triggered by the wizard's own close button, a
   *  backdrop click, or Escape when no sub-modal is showing. */
  closeWizard(): void {
    this.clearStatusInterval();
    this.modalService.close();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    // Two nesting levels share one Escape key: if the submit-success
    // sub-modal is showing, close just that first — otherwise close the
    // whole wizard. A single Escape press should never skip both layers
    // at once.
    if (this.isSubmitting()) {
      this.closeSubmitModal();
    } else if (this.modalService.isOpen()) {
      this.closeWizard();
    }
  }
}
