import { Component, DestroyRef, OnInit, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime, startWith } from 'rxjs';
import { AuthApi } from '../../shared/services/auth-api';
import { FoodieEventsService } from '../../shared/services/foodie-events.service';
import { CreateEventModalService } from '../../shared/services/create-event-modal.service';
import { CreateEvent } from '../create-event/create-event';
import { EventCard } from '../../components/event-card/event-card';
import { BiddingDrawer } from '../../components/bidding-drawer/bidding-drawer';
import { SupplierMarketplaceDrawer } from '../../components/supplier-marketplace-drawer/supplier-marketplace-drawer';
import { Header } from '../../components/header/header';
import { Footer } from '../../components/footer/footer';
import { capitalizeName } from '../../shared/utils/name-format';
import { EVENT_FILTERS, EventFilter, FoodieEvent } from '../../shared/models/foodie-event.model';
import { Bid } from '../../shared/models/bid.model';

@Component({
  selector: 'app-foodie-events',
  standalone: true,
  imports: [ReactiveFormsModule, EventCard, BiddingDrawer, SupplierMarketplaceDrawer, Header, Footer, CreateEvent],
  templateUrl: './foodie-events.html',
  styleUrl: './foodie-events.scss',
})
export class FoodieEvents implements OnInit {
  private readonly router = inject(Router);
  private readonly authApi = inject(AuthApi);
  private readonly eventsService = inject(FoodieEventsService);
  private readonly destroyRef = inject(DestroyRef);
  readonly createEventModal = inject(CreateEventModalService);

  openCreateEvent(): void {
    this.createEventModal.open();
  }

  readonly session = this.authApi.currentSession;
  readonly initials = computed(() => {
    const s = this.session();
    return s ? `${s.firstName.charAt(0)}${s.lastName.charAt(0)}`.toUpperCase() : '';
  });
  readonly displayName = computed(() => {
    const s = this.session();
    return s ? `${capitalizeName(s.firstName)} ${capitalizeName(s.lastName)}`.trim() : '';
  });

  readonly filters = EVENT_FILTERS;
  readonly selectedFilter = signal<EventFilter>('all');
  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly searchTerm = signal('');

  readonly isLoading = signal(true);
  readonly allEvents = signal<FoodieEvent[]>([]);

  readonly filteredEvents = computed(() =>
    this.eventsService.filterEvents(this.allEvents(), this.selectedFilter(), this.searchTerm()),
  );

  readonly totalEvents = computed(() => this.allEvents().length);
  readonly completedEvents = computed(() => this.allEvents().filter((e) => e.status === 'completed').length);
  readonly upcomingEvents = computed(
    () => this.allEvents().filter((e) => e.status !== 'completed' && e.status !== 'cancelled').length,
  );

  readonly biddingEvent = signal<FoodieEvent | null>(null);
  readonly showBiddingDrawer = signal(false);

  // Opens once a bid is accepted, replacing the bidding drawer rather
  // than stacking on top of it - matches the provided spec exactly
  // (showBiddingModal = false; openSupplierDrawer()). Lets the Foodie
  // browse specialty extras (cakes, decor, entertainment) right after
  // locking in their chef/venue, while the event they just decided on
  // is still front of mind.
  readonly showSupplierDrawer = signal(false);
  private acceptedEventId: string | null = null;
  private acceptedBidId: string | null = null;

  private wasModalOpen = false;

  constructor() {
    // Refreshes the list specifically when the Create Event modal closes
    // (not when it opens) — since the modal's parent page is always this
    // dashboard now, a newly-submitted event needs to actually appear
    // the moment it's closed, not require a manual reload. ngOnInit's
    // one-time getEvents() subscription would never pick that up on its
    // own since it only ever fires once, on initial load.
    effect(() => {
      const isOpen = this.createEventModal.isOpen();
      if (this.wasModalOpen && !isOpen) {
        this.loadEvents();
        // The modal itself scrolls the page while open (its own content
        // can be taller than the viewport), and closing it never reset
        // that - leaving the dashboard wherever the modal happened to
        // leave off instead of starting from the top like every other
        // page-entry action in this app does.
        window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      }
      this.wasModalOpen = isOpen;
    });
  }

  ngOnInit(): void {
    this.loadEvents();

    // debounceTime avoids re-filtering the whole grid on every single
    // keystroke — a search box with no debounce is a common source of
    // janky re-renders once the event list is large enough to matter.
    this.searchControl.valueChanges
      .pipe(startWith(''), debounceTime(200), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.searchTerm.set(value));
  }

  private loadEvents(): void {
    const userId = this.session()?.userId;
    if (!userId) {
      this.isLoading.set(false);
      return;
    }
    this.eventsService
      .getEvents(userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((events) => {
        this.isLoading.set(false);
        this.allEvents.set(events);
      });
  }

  setFilter(filter: EventFilter): void {
    this.selectedFilter.set(filter);
  }

  onReviewBids(event: FoodieEvent): void {
    this.biddingEvent.set(event);
    this.showBiddingDrawer.set(true);
  }

  onViewMenu(event: FoodieEvent): void {
    this.router.navigateByUrl(`/review-menu/${event.id}`);
  }

  closeBiddingDrawer(): void {
    this.showBiddingDrawer.set(false);
  }

  onBidAccepted({ event, bid }: { event: FoodieEvent; bid: Bid }): void {
    // Accepting a bid should update the event's status (e.g. to
    // 'scheduled') via FoodieEventsService once that mutation exists on
    // the service — not implemented here since the original component
    // never specified what happens server-side after acceptBid(), and
    // guessing at that contract risks being actively wrong rather than
    // just incomplete.
    console.info('Bid accepted', bid.id, 'for event', event.id);
    // Bidding drawer closes; supplier drawer replaces it - not both open
    // at once, matching the provided spec's onAcceptBidButtonClick()
    // exactly (showBiddingModal = false, then openSupplierDrawer()).
    this.acceptedEventId = event.id;
    this.acceptedBidId = bid.id;
    this.showBiddingDrawer.set(false);
    this.showSupplierDrawer.set(true);
  }

  closeSupplierDrawer(): void {
    this.showSupplierDrawer.set(false);
  }

  // Triggered by the supplier drawer's "Continue to Review →" button -
  // takes the Foodie to the Order Summary / bid-cart page for the bid
  // they just accepted, using the ids captured in onBidAccepted above.
  continueToBidCart(): void {
    if (!this.acceptedEventId || !this.acceptedBidId) return;
    this.router.navigateByUrl(`/bid-cart/${this.acceptedEventId}/${this.acceptedBidId}`).then(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    });
  }
}
