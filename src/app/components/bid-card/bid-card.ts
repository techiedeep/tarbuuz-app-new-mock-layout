import { Component, EventEmitter, Output, computed, input } from '@angular/core';
import { DatePipe, DecimalPipe, TitleCasePipe } from '@angular/common';
import { Bid, BUSINESS_TYPE_LABELS, SCORE_RING_CIRCUMFERENCE, ringDashoffset } from '../../shared/models/bid.model';

/**
 * One bid card inside the bidding drawer, including the AI match-score
 * donut ring. Pulled out as its own component for the same reason as
 * EventCard: the original had this entire block — SVG geometry, score
 * bars, metrics grid, rank badge — duplicated inline inside a *ngFor with
 * no reusable boundary.
 */
@Component({
  selector: 'app-bid-card',
  standalone: true,
  imports: [DatePipe, DecimalPipe, TitleCasePipe],
  templateUrl: './bid-card.html',
  styleUrl: './bid-card.scss',
})
export class BidCard {
  // Signal-based input() — same fix, same reasoning as EventCard: a plain
  // @Input() isn't a signal, so computed() below would silently cache its
  // first result forever instead of tracking updates to `bid`.
  readonly bid = input.required<Bid>();
  readonly selected = input(false);
  readonly totalGuestCount = input<number | null>(null);

  @Output() select = new EventEmitter<Bid>();

  readonly ringCircumference = SCORE_RING_CIRCUMFERENCE;
  readonly ringDashoffset = computed(() => ringDashoffset(this.bid().compositeScore));

  /** BUSINESS_TYPE_LABELS over a titlecase pipe — real values like
   *  'private-host'/'cloud-kitchen' are hyphenated, and Angular's
   *  titlecase pipe only capitalizes after whitespace, not hyphens, so
   *  it would render "Private-host" instead of "Private Host". Falls
   *  back to the raw value for anything not in the map (e.g. legacy
   *  mock data), rather than showing nothing. */
  readonly businessTypeLabel = computed(() => {
    const type = this.bid().bidderBusinessType;
    return (BUSINESS_TYPE_LABELS as Record<string, string>)[type] ?? type;
  });

  readonly totalAmount = computed(() => {
    const guests = this.totalGuestCount();
    if (guests == null) return null;
    return Number(this.bid().bidAmount) * guests;
  });
}
