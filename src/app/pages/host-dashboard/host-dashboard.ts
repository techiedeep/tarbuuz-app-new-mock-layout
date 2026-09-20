import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { Header } from '../../components/header/header';
import { Footer } from '../../components/footer/footer';
import { HostBiddingService } from '../../shared/services/host-bidding.service';
import {
  BiddingOpportunity,
  SubmittedBid,
  SUBMITTED_BID_STATUS_LABELS,
  matchTier,
} from '../../shared/models/host-bidding.model';
import { AMBIENCE_MAP, CUISINE_ICONS } from '../../shared/models/foodie-event.model';

// Capped the same way the Foodie dashboard's own event-card caps cuisine
// chips (MAX_VISIBLE_CUISINE_CHIPS there) — an opportunity with 5
// cuisines shouldn't render a taller card than one with 1.
const MAX_VISIBLE_CUISINE_CHIPS = 3;

type DashboardTab = 'opportunities' | 'bids';

/**
 * Host Dashboard — replaces the two separate pages a Host previously had
 * to check independently (Bidding Events, Submitted Bids), reached via
 * two separate dropdown entries. A Foodie already gets one "Dashboard"
 * entry; a Host had two, for what's really one underlying question —
 * "where do things stand with my bidding" — split across two places
 * for no reason a Host would find meaningful.
 *
 * Deliberately NOT merged into a single undifferentiated list: an open
 * opportunity (something to act on, closing soon) and an already-placed
 * bid (something to check the status of) are different tasks with
 * different fields and different urgency. Two tabs on one page keeps
 * them each legible on their own terms while removing the need to
 * navigate to a whole separate page and re-orient just to check the
 * other one — the actual complaint being solved here.
 */
@Component({
  selector: 'app-host-dashboard',
  standalone: true,
  imports: [ Header, Footer, DatePipe, TitleCasePipe],
  templateUrl: './host-dashboard.html',
  styleUrl: './host-dashboard.scss',
})
export class HostDashboard implements OnInit {
  private readonly biddingService = inject(HostBiddingService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  readonly isLoading = signal(true);
  readonly activeTab = signal<DashboardTab>('opportunities');

  readonly opportunities = signal<BiddingOpportunity[]>([]);
  readonly bids = signal<SubmittedBid[]>([]);

  readonly statusLabels = SUBMITTED_BID_STATUS_LABELS;
  matchTier = matchTier;

  // Summary counts drive both the top stat row and the tab labels, so
  // the two stay in sync by construction rather than by two separate
  // pieces of template text someone could edit independently and drift.
  readonly highMatchCount = computed(() => this.opportunities().filter((o) => o.matchScore >= 80).length);
  readonly pendingCount = computed(() => this.bids().filter((b) => b.status === 'pending').length);
  readonly wonCount = computed(() => this.bids().filter((b) => b.status === 'won').length);

  ngOnInit(): void {
    // Both lists load together rather than sequentially — a Host opening
    // this page cares about both tabs being ready, not just whichever
    // one happens to be active first, since switching tabs shouldn't
    // trigger its own separate loading spinner immediately after the
    // page has already finished loading.
    forkJoin({
      opportunities: this.biddingService.getOpportunities(),
      bids: this.biddingService.getSubmittedBids(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ opportunities, bids }) => {
        this.opportunities.set(opportunities);
        this.bids.set(bids);
        this.isLoading.set(false);
      });
  }

  selectTab(tab: DashboardTab): void {
    this.activeTab.set(tab);
  }

  closingMessage(bidClosingAt: string): string {
    const msRemaining = new Date(bidClosingAt).getTime() - Date.now();
    if (msRemaining <= 0) return 'Bid closed';
    const hours = Math.floor(msRemaining / (1000 * 60 * 60));
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} left to bid`;
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} left to bid`;
  }

  // Shared display helpers, reused for both tabs' cards rather than
  // duplicated per-tab — same lookup tables the Foodie dashboard's own
  // event-card component uses, so an opportunity and a Foodie's own event
  // show identical ambience icons/labels and cuisine icons for the same
  // underlying values, not two independently-maintained mappings that
  // could quietly drift apart.
  ambienceFor(ambience: string | undefined) {
    return ambience ? AMBIENCE_MAP[ambience] : undefined;
  }

  cuisineIcon(cuisine: string): string {
    return CUISINE_ICONS[cuisine.toLowerCase()] ?? CUISINE_ICONS['default'];
  }

  visibleCuisines(cuisines: readonly string[]): readonly string[] {
    return cuisines.slice(0, MAX_VISIBLE_CUISINE_CHIPS);
  }

  hiddenCuisineCount(cuisines: readonly string[]): number {
    return Math.max(0, cuisines.length - MAX_VISIBLE_CUISINE_CHIPS);
  }

  dietaryText(dietary: readonly string[]): string {
    return dietary.join(', ');
  }

  // Currency appended explicitly rather than baked into a pre-formatted
  // string in the data itself — an opportunity priced in EUR shouldn't
  // need its own separately-formatted field just to say so.
  formatBudget(amountPerPerson: number, currency: string): string {
    return `${amountPerPerson.toFixed(2)} ${currency}/guest`;
  }

  // "Submit Bid" previously had no click handler at all - navigates to
  // the dedicated Submit Bid page for this specific opportunity, rather
  // than opening an inline form on the card itself, since the actual bid
  // form needs real room (event details alongside it, an Agentic Chef
  // drawer, a proper success confirmation) that a card in a grid can't
  // provide.
  submitBid(opp: BiddingOpportunity): void {
    this.router.navigateByUrl(`/submit-bid/${opp.id}`).then(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    });
  }
}
