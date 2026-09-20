import { Component, EventEmitter, Output, computed, inject, input } from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import {
  AMBIENCE_MAP,
  CUISINE_ICONS,
  EVENT_TYPE_ICONS,
  FoodieEvent,
  STATUS_META,
  StatusMeta,
} from '../../shared/models/foodie-event.model';
import { FoodieEventsService } from '../../shared/services/foodie-events.service';

/** How many cuisine chips render before the rest collapse into a single
 *  "+N" chip. Uncapped chip lists were the single biggest cause of
 *  inconsistent card heights across the grid — an event with 5 cuisines
 *  wrapped to a taller chip row than one with 1, and since Angular's grid
 *  only auto-equalizes height within a single row, cards in different rows
 *  ended up visibly different sizes. */
const MAX_VISIBLE_CUISINE_CHIPS = 3;

/**
 * One event card, fully self-contained — the real dashboard's event-card
 * markup was previously duplicated inline inside a *ngFor with no
 * component boundary at all. Pulling it out means the card's own display
 * logic (icon lookup, status meta, bid-closing countdown) lives in one
 * place instead of being re-derived wherever a card might be rendered.
 */
@Component({
  selector: 'app-event-card',
  standalone: true,
  imports: [DatePipe, TitleCasePipe],
  templateUrl: './event-card.html',
  styleUrl: './event-card.scss',
})
export class EventCard {
  private readonly eventsService = inject(FoodieEventsService);

  // Signal-based input(), not the @Input() decorator — deliberately.
  // computed() only re-evaluates when a *signal* it read changes; a plain
  // @Input() property is just a field Angular happens to assign to, so
  // every computed() below that reads `this.event` would silently cache
  // its very first result forever, regardless of how many times the input
  // actually updates afterward. Confirmed this directly: mutating a live
  // component's event input left every derived value frozen on stale data.
  // input() makes `event` itself the signal computed() needs to track.
  readonly event = input.required<FoodieEvent>();
  readonly showId = input(false);

  @Output() reviewBids = new EventEmitter<FoodieEvent>();
  @Output() viewMenu = new EventEmitter<FoodieEvent>();

  readonly statusMeta = computed(() => STATUS_META[this.event().status]);

  // The raw status alone can't tell this badge bidding has closed - status
  // stays 'submitted_for_bid' the whole time bids are being collected,
  // while "has the deadline passed" is a separate, time-based check
  // (bidClosingMessage). Left unreconciled, the badge kept reading "Bids
  // Open" even once bidding had genuinely closed and there was a
  // "Review Bids" action sitting right below it - two parts of the same
  // card contradicting each other. This computed is what the template
  // actually renders instead of statusMeta() directly, so the badge
  // reflects the same "closed" state as the card's own footer action.
  readonly displayStatusMeta = computed<StatusMeta>(() => {
    if (this.showReviewBidsAction()) return { label: 'Review Bids', cssClass: 'status-bid' };
    return this.statusMeta();
  });
  readonly typeIcon = computed(() => EVENT_TYPE_ICONS[this.event().eventType] ?? EVENT_TYPE_ICONS['default']);
  readonly ambience = computed(() => {
    const a = this.event().eventAmbience;
    return a ? AMBIENCE_MAP[a] : undefined;
  });

  readonly visibleCuisines = computed(() => this.event().preferredCuisines.slice(0, MAX_VISIBLE_CUISINE_CHIPS));
  readonly hiddenCuisineCount = computed(() =>
    Math.max(0, this.event().preferredCuisines.length - MAX_VISIBLE_CUISINE_CHIPS),
  );
  readonly dietaryText = computed(() => this.event().dietaryPreferences.join(', '));
  readonly bidClosingMessage = computed(() => this.eventsService.bidClosingMessage(this.event()));
  readonly showBidClosing = computed(() => this.event().status === 'submitted_for_bid');

  /** Review Bids only appears once BOTH conditions are true: the menu
   *  was approved, and bidding has actually closed. The menu-approval
   *  half isn't a separate check here because it doesn't need to be -
   *  'submitted_for_bid' is a status an event can only reach by being
   *  approved first (see ReviewMenu's approveMenu(), which is the only
   *  place that transitions an event into this status at all). Checking
   *  status === 'submitted_for_bid' is already checking "menu approved
   *  AND opened for bidding" in one condition, not skipping it. The
   *  second half - bidClosingMessage() === 'Bid closed' - is what
   *  additionally requires the deadline to have passed, not just bidding
   *  having started. Matches the original component's exact condition,
   *  not an "as soon as bids exist" shortcut that would let a Foodie
   *  lock in a decision before all bids are in. */
  readonly showReviewBidsAction = computed(
    () => this.event().status === 'submitted_for_bid' && this.bidClosingMessage() === 'Bid closed',
  );

  cuisineIcon(cuisine: string): string {
    return CUISINE_ICONS[cuisine.toLowerCase()] ?? CUISINE_ICONS['default'];
  }
}
