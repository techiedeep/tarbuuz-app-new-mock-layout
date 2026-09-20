import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { UserMenu } from '../../components/user-menu/user-menu';
import { Footer } from '../../components/footer/footer';
import { KitchenLabPicker } from '../../components/kitchen-lab-picker/kitchen-lab-picker';
import { AgenticChef } from '../agentic-chef/agentic-chef';
import { AuthApi } from '../../shared/services/auth-api';
import { FoodieEventsService } from '../../shared/services/foodie-events.service';
import { ReviewMenuService } from '../../shared/services/review-menu.service';
import { AgenticChefService } from '../../shared/services/agentic-chef.service';
import { CourseSection, MenuItem } from '../../shared/models/menu/menu-recommendation.model';
import { KitchenLabCourseType, KitchenLabRecipe } from '../../shared/models/menu/kitchen-lab-recipe.model';
import { FoodieEvent, CUISINE_ICONS, EventStatus, isMenuApprovedOrLater } from '../../shared/models/foodie-event.model';
import { CreateEventService } from '../../shared/services/create-event.service';

const EDIT_FIELD_LABELS: Record<string, string> = {
  name: 'Dish name',
  description: 'Description',
  price: 'Price',
};

@Component({
  selector: 'app-review-menu',
  standalone: true,
  imports: [RouterLink, UserMenu, Footer, KitchenLabPicker, AgenticChef, DatePipe, TitleCasePipe, ReactiveFormsModule],
  templateUrl: './review-menu.html',
  styleUrl: './review-menu.scss',
})
export class ReviewMenu implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authApi = inject(AuthApi);
  private readonly eventsService = inject(FoodieEventsService);
  private readonly reviewMenuService = inject(ReviewMenuService);
  private readonly agenticChefService = inject(AgenticChefService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly createEventService = inject(CreateEventService);

  readonly isLoading = signal(true);
  readonly notFound = signal(false);
  readonly event = signal<FoodieEvent | null>(null);
  readonly courses = signal<CourseSection[]>([]);
  readonly showAgenticChef = signal(false);

  // "Review With Agentic Chef" invites someone to go generate a
  // recommendation that doesn't exist yet - once one does, that label
  // is actively misleading, since there's nothing left to "review with"
  // and everything to just look at. Checked directly against storage
  // (hasPersistedResult), not the drawer's own open/close state, so the
  // label is correct the very first time this page renders, before the
  // drawer has ever been opened this session.
  readonly agenticChefButtonLabel = computed(() => {
    const ev = this.event();
    if (!ev) return 'Review With Agentic Chef →';
    return this.agenticChefService.hasPersistedResult(ev.id) ? 'View Chef Recommendations →' : 'Review With Agentic Chef →';
  });

  openAgenticChef(): void {
    this.showAgenticChef.set(true);
  }
  closeAgenticChef(): void {
    this.showAgenticChef.set(false);
  }

  // "Shop Specialty Extras" opens the shared SupplierMarketplaceDrawer
  // component - the full 10-category, all-listings browsing experience,
  // matching the standalone /marketplace page exactly. The drawer now
  // owns its own search/category-filter state internally; this page
  // only needs to know whether it's open.
  readonly showExtrasDrawer = signal(false);

  openExtrasDrawer(): void {
    this.showExtrasDrawer.set(true);
  }
  closeExtrasDrawer(): void {
    this.showExtrasDrawer.set(false);
  }

  // Tied directly to the event's own status field - not a separate flag
  // that has to be kept in sync with it by hand. Any status at or past
  // "menu approved" in the real workflow (submitted_for_bid, scheduled,
  // confirmed, completed, cancelled) means the button has already done
  // its job and has no reason to reappear, regardless of what a
  // separate, disconnected flag might otherwise say.
  readonly isApproved = computed(() => {
    const ev = this.event();
    return !!ev && isMenuApprovedOrLater(ev.status);
  });
  // Separate from isApproved: that one drives the persistent inline
  // banner that stays on the page indefinitely, while this one is just
  // the one-time celebratory popup shown at the moment of approval -
  // dismissing the popup shouldn't make the banner disappear too.
  //
  // Deliberately the same modal pattern as Create Event's own "You're
  // all set!" success popup, not a separate one-off design - both are
  // "you just crossed a milestone in the same 5-step journey" moments,
  // and showing two different modal styles for two steps on the same
  // stepper would make the stepper itself feel like decoration rather
  // than an accurate map of the process. miniStepLabels comes from
  // CreateEventService rather than being redeclared here, so both
  // modals are guaranteed to reference the same five steps.
  readonly showApprovedModal = signal(false);
  readonly isApproving = signal(false);
  readonly statusMessageIndex = signal(0);
  private statusIntervalId: ReturnType<typeof setInterval> | null = null;

  private readonly approvalStatusMessages: readonly string[] = [
    'Notifying verified hosts…',
    'Ranking bids by real value, not just price…',
    'Opening your event for bidding…',
  ];

  readonly currentStatusMessage = computed(() => this.approvalStatusMessages[this.statusMessageIndex()]);

  // Approve Menu is step index 2 in miniStepLabels - done along with the
  // two steps before it, with Review Bids (index 3) now the current
  // step and Make Payment (index 4) still locked.
  readonly miniSteps = computed(() =>
    this.createEventService.miniStepLabels.map((label, i) => ({
      label,
      state: (i <= 2 ? 'done' : i === 3 ? 'current' : 'locked') as 'done' | 'current' | 'locked',
    })),
  );

  readonly costBreakdown = computed(() => {
    const ev = this.event();
    if (!ev) return null;
    return this.reviewMenuService.getCostBreakdown(this.courses(), ev);
  });

  readonly pickerOpen = signal(false);
  readonly pickerCourseType = signal<KitchenLabCourseType | null>(null);

  // ── Editing a generated dish in place ──
  // One item editable at a time, tracked by id (not by course+index) so a
  // card can find its own edit state without the template needing to know
  // which course it belongs to. A single shared FormGroup, re-patched per
  // edit, rather than one FormGroup per card — courses can hold several
  // items each and instantiating a form per card for ones that aren't
  // even being edited would be wasted work for no benefit.
  readonly editingItemId = signal<string | null>(null);
  readonly editForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    description: ['', [Validators.required, Validators.maxLength(200)]],
    price: [0, [Validators.required, Validators.min(0.01), Validators.max(999)]],
  });

  ngOnInit(): void {
    const eventId = this.route.snapshot.paramMap.get('eventId');
    const userId = this.authApi.currentSession()?.userId;
    if (!eventId || !userId) {
      this.isLoading.set(false);
      this.notFound.set(true);
      return;
    }

    this.eventsService
      .getEvents(userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((events) => {
        const match = events.find((e) => e.id === eventId);
        if (!match) {
          this.isLoading.set(false);
          this.notFound.set(true);
          return;
        }
        this.event.set(match);
        this.loadMenu(match);
      });
  }

  private loadMenu(event: FoodieEvent): void {
    this.reviewMenuService
      .getMenuForEvent(event)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((courses) => {
        this.isLoading.set(false);
        this.courses.set(courses);
      });
  }

  removeItem(courseId: string, itemId: string | undefined): void {
    const ev = this.event();
    if (!ev || !itemId) return;
    // Editing the item you're about to remove would leave a dangling
    // open form with nothing left to save — close it first if it's the
    // one being edited.
    if (this.editingItemId() === itemId) this.editingItemId.set(null);
    this.reviewMenuService
      .removeItem(ev.id, courseId, itemId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((updated) => this.courses.set(updated));
  }

  startEdit(item: MenuItem): void {
    if (!item.id) return;
    this.editingItemId.set(item.id);
    this.editForm.reset({ name: item.name, description: item.description, price: item.price });
  }

  cancelEdit(): void {
    this.editingItemId.set(null);
  }

  isEditing(itemId: string | undefined): boolean {
    return !!itemId && this.editingItemId() === itemId;
  }

  saveEdit(courseId: string, itemId: string | undefined): void {
    if (!itemId) return;
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    const ev = this.event();
    if (!ev) return;
    const { name, description, price } = this.editForm.getRawValue();
    this.reviewMenuService
      .updateItem(ev.id, courseId, itemId, { name, description, price })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((updated) => {
        this.courses.set(updated);
        this.editingItemId.set(null);
      });
  }

  hasEditError(field: string): boolean {
    const control = this.editForm.get(field);
    return !!control && control.invalid && control.touched;
  }

  /** Same shape as every other form's error-message method in this app
   *  (Personal Info, Company Info, Venue Info) — kept locally rather than
   *  shared, since no shared validators/messages file exists yet in this
   *  project; that's a separate cleanup, not something to bundle into
   *  this feature. */
  getEditErrorMessage(field: string): string {
    const control = this.editForm.get(field);
    if (!control || !control.errors || !control.touched) return '';
    const errors = control.errors;
    const label = EDIT_FIELD_LABELS[field] ?? field;
    if (errors['required']) return `${label} is required`;
    if (errors['maxlength']) return `${label} must not exceed ${errors['maxlength'].requiredLength} characters`;
    if (errors['min']) return `${label} must be at least $${errors['min'].min}`;
    if (errors['max']) return `${label} must be $${errors['max'].max} or less`;
    return 'Invalid value';
  }

  private readonly knownCourseTypes: readonly string[] = ['starters', 'main_courses', 'desserts', 'drinks'];

  openPicker(courseId: string): void {
    // CourseSection.id is the real model's plain `string` (matching the
    // real API contract) — narrower than KitchenLabCourseType, so this
    // validates rather than casting blindly. Any course id outside the
    // four known types just opens the picker unfiltered instead of
    // guessing at a match.
   /* this.editingItemId.set(null);
    const courseType = this.knownCourseTypes.includes(courseId) ? (courseId as KitchenLabCourseType) : null;
    this.pickerCourseType.set(courseType);
    this.pickerOpen.set(true);
    */
  }

  closePicker(): void {
    this.pickerOpen.set(false);
  }

  onRecipePicked(recipe: KitchenLabRecipe): void {
    const ev = this.event();
    if (!ev) return;
    this.reviewMenuService
      .addRecipeToMenu(ev.id, recipe)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((updated) => {
        this.courses.set(updated);
        this.pickerOpen.set(false);
      });
  }

  approveMenu(): void {
    const ev = this.event();
    if (!ev) return;
    this.isApproving.set(true);
    // No real backend here (same mock pattern as everywhere else in this
    // app) - approveMenu() previously just flipped a separate flag in
    // ReviewMenuService with no relationship to the event's own status,
    // which is how a genuinely later-stage event (already past approval
    // - submitted for bid, scheduled, etc.) could still show this button
    // again on a fresh load, since that flag and the event's real status
    // had no way to disagree that either side would ever notice.
    // Updating the event's actual status here is the fix: it's the same
    // field foodie-events.ts, the status badge, and everything else
    // already treats as authoritative.
    this.eventsService.updateEventStatus(ev.id, 'submitted_for_bid');
    const updated: FoodieEvent = { ...ev, status: 'submitted_for_bid' as EventStatus };
    const approveTimeoutId = setTimeout(() => {
      this.event.set(updated);
      this.isApproving.set(false);
      this.statusMessageIndex.set(0);
      this.clearStatusInterval();
      this.statusIntervalId = setInterval(() => {
        this.statusMessageIndex.update((i) => (i + 1) % this.approvalStatusMessages.length);
      }, 2400);
      this.showApprovedModal.set(true);
    }, 500);
    this.destroyRef.onDestroy(() => clearTimeout(approveTimeoutId));
  }

  closeApprovedModal(): void {
    this.clearStatusInterval();
    this.showApprovedModal.set(false);
  }

  private clearStatusInterval(): void {
    if (this.statusIntervalId !== null) {
      clearInterval(this.statusIntervalId);
      this.statusIntervalId = null;
    }
  }

  // Primary and secondary CTAs both navigate away now, matching Create
  // Event's own modal exactly (goToHome / goToDashboard, same labels,
  // same destinations) - reverted from an earlier "Go to My Event" /
  // close-only version, since the inconsistent labeling and styling
  // against Create Event's modal was the actual bug being fixed here.
  //
  // Scroll-to-top runs inside navigateByUrl()'s .then(), after the
  // navigation actually completes, rather than firing immediately on
  // click - scrolling before the new route has finished loading would
  // reset the scroll position of the page being left, not the one being
  // arrived at. smooth rather than an instant jump, since this is a
  // deliberate "take me back to the top" action a person just clicked,
  // not an incidental one worth doing invisibly.
  goToHome(): void {
    this.clearStatusInterval();
    this.showApprovedModal.set(false);
    this.router.navigateByUrl('/').then(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    });
  }

  goToDashboard(): void {
    this.clearStatusInterval();
    this.showApprovedModal.set(false);
    this.router.navigateByUrl('/events').then(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    });
  }

  cuisineIcon(cuisine: string): string {
    return CUISINE_ICONS[cuisine.toLowerCase()] ?? CUISINE_ICONS['default'];
  }

  backToEvents(): void {
    this.router.navigateByUrl('/events');
  }

  /** window.print() rather than a PDF-generation library — every modern
   *  browser's print dialog already offers "Save as PDF" as a
   *  destination, so this one mechanism genuinely covers both "print"
   *  and "save" without adding a dependency for what the browser already
   *  does natively. The actual branded layout comes from the @media
   *  print stylesheet, not from anything built here. */
  printMenu(): void {
    window.print();
  }
}
