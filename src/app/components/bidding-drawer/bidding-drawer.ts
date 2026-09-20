import {
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BidCard } from '../bid-card/bid-card';
import { BidsService } from '../../shared/services/bids.service';
import { Bid } from '../../shared/models/bid.model';
import { FoodieEvent } from '../../shared/models/foodie-event.model';

/**
 * Fully self-contained: fetches its own bids when opened, owns its own
 * selection state, and only ever tells the parent two things — "I closed"
 * and "a bid was accepted". The parent (FoodieEvents) doesn't need to know
 * anything about bid-loading, scoring, or selection to use this.
 */
@Component({
  selector: 'app-bidding-drawer',
  standalone: true,
  imports: [BidCard],
  templateUrl: './bidding-drawer.html',
  styleUrl: './bidding-drawer.scss',
})
export class BiddingDrawer implements OnChanges {
  private readonly bidsService = inject(BidsService);
  private readonly destroyRef = inject(DestroyRef);

  @Input() event: FoodieEvent | null = null;
  @Input() open = false;

  @Output() closed = new EventEmitter<void>();
  @Output() accepted = new EventEmitter<{ event: FoodieEvent; bid: Bid }>();

  readonly bids = signal<Bid[]>([]);
  readonly isLoading = signal(false);
  readonly selectedBidId = signal<string | null>(null);
  readonly showSelectionError = signal(false);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open && this.event) {
      this.loadBids(this.event);
    }
    if (changes['open'] && !this.open) {
      // Reset so reopening for a different event doesn't briefly flash the
      // previous event's stale selection before the new bids load in.
      this.selectedBidId.set(null);
      this.showSelectionError.set(false);
    }
  }

  private loadBids(event: FoodieEvent): void {
    this.isLoading.set(true);
    this.bids.set([]);
    this.bidsService
      .getBidsForEvent(event)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((bids) => {
        this.isLoading.set(false);
        this.bids.set(bids);
      });
  }

  selectBid(bid: Bid): void {
    this.selectedBidId.set(bid.id);
    this.showSelectionError.set(false);
  }

  close(): void {
    this.closed.emit();
  }

  acceptSelectedBid(): void {
    const bid = this.bids().find((b) => b.id === this.selectedBidId());
    if (!bid || !this.event) {
      this.showSelectionError.set(true);
      return;
    }
    this.accepted.emit({ event: this.event, bid });
  }
}
