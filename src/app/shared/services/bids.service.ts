import { Injectable } from '@angular/core';
import { Observable, delay, of } from 'rxjs';
import { Bid, BusinessType, RatedBid, ratedBidToScoreRows } from '../models/bid.model';
import { FoodieEvent } from '../models/foodie-event.model';

const SIMULATED_LATENCY_MS = 700;

// Uses the real BusinessType enum (see bid.model.ts) rather than the
// previous ad-hoc 'supplier'/'venue' strings — this describes what kind
// of food business is bidding, a different axis from this app's own
// Foodie/Supplier/Host roles, and the enum's actual vocabulary reads
// more realistically than a generic placeholder pair ever did.
const SUPPLIER_POOL: ReadonlyArray<{ name: string; type: BusinessType }> = [
  { name: 'Sweet Cream Creamery', type: BusinessType.CATERING },
  { name: 'Golden Acre Farm Table', type: BusinessType.PRIVATE_HOST },
  { name: 'The Copper Table', type: BusinessType.RESTAURANT },
  { name: 'Basil & Bloom Catering', type: BusinessType.CATERING },
  { name: 'Ember & Oak Events', type: BusinessType.BANQUET },
];

/**
 * Mock bid data, generated per event rather than hardcoded once, so
 * different events plausibly show different bidders and scores instead of
 * the exact same three names everywhere. Not backed by a real matching
 * algorithm — this is illustrative, standing in for what Intelligent
 * Bidding would actually return.
 */
@Injectable({ providedIn: 'root' })
export class BidsService {
  getBidsForEvent(event: FoodieEvent): Observable<Bid[]> {
    const bids = this.generateBids(event);
    return of(bids).pipe(delay(SIMULATED_LATENCY_MS));
  }

  private generateBids(event: FoodieEvent): Bid[] {
    // Deterministic "random" seeded from the event id, so reloading the
    // same event's drawer shows the same bids rather than reshuffling
    // every time — a real backend response wouldn't change between two
    // requests for the same event either.
    const seed = this.hashCode(event.id);
    const count = 3;

    const bids: Bid[] = Array.from({ length: count }, (_, i) => {
      const supplier = SUPPLIER_POOL[(seed + i) % SUPPLIER_POOL.length];
      const compositeScore = 9.4 - i * 1.1 - ((seed + i) % 5) * 0.1;
      const pricePerGuest = 45 + i * 12 + ((seed + i) % 15);
      const verdicts: Array<'within' | 'over' | 'under'> = ['within', 'over', 'under'];

      // Real seven-category AI scoring, matching RatedBid exactly (the
      // actual DTO shape from the ranking backend) rather than the
      // earlier four-category placeholder set (Cuisine Fit, Budget Fit,
      // Availability, Review Score) that never matched what the real
      // score breakdown is supposed to show.
      const ratedBid: RatedBid = {
        id: `${event.id}-bid-${i + 1}`,
        eventId: event.id,
        eventName: event.eventName,
        bidderBusinessType: supplier.type,
        bidderProfileId: `${supplier.name.toLowerCase().replace(/\s+/g, '-')}`,
        bidderName: supplier.name,
        bidAmount: pricePerGuest,
        currency: 'USD',
        proposal: this.proposalFor(supplier.name, event),
        estimatedCompletionDate: event.eventDate,
        status: 'submitted',
        serviceCapacity: event.guestCount + 10,
        rank: i + 1,
        normalisedCpp: Math.round((pricePerGuest / 100) * 100) / 100,
        budgetVerdict: verdicts[(seed + i) % verdicts.length],
        confidence: i === 0 ? 'high' : i === 1 ? 'medium' : 'low',
        selectionRationale: null,
        tradeOffs: null,
        compositeScore: Math.round(compositeScore * 10) / 10,
        budgetComplianceScore: Math.max(0, 10 - i * 1.2 - ((seed + i) % 5) * 0.2),
        cuisineCapabilityScore: Math.max(0, 9.5 - i * 1.5 - ((seed + i * 3) % 8) * 0.1),
        capacityFitScore: Math.max(0, 10 - i * 0.5 - ((seed + i * 7) % 6) * 0.1),
        businessTypeScore: Math.max(0, 8 - i * 1.3 - ((seed + i * 4) % 6) * 0.1),
        proposalQualityScore: Math.max(0, 9.2 - i * 1.8 - ((seed + i * 2) % 7) * 0.1),
        valueInclusionsScore: Math.max(0, 8.5 - i * 1.1 - ((seed + i * 6) % 5) * 0.1),
        occasionTimingScore: Math.max(0, 9 - i * 0.9 - ((seed + i * 9) % 4) * 0.1),
        strengths: [],
        weaknesses: [],
        redFlags: [],
      };

      return {
        id: ratedBid.id,
        eventId: ratedBid.eventId,
        eventName: ratedBid.eventName,
        rank: ratedBid.rank!,
        compositeScore: ratedBid.compositeScore!,
        bidderName: ratedBid.bidderName,
        bidderBusinessType: ratedBid.bidderBusinessType,
        bidAmount: ratedBid.bidAmount.toFixed(2),
        currency: ratedBid.currency,
        serviceCapacity: `Up to ${ratedBid.serviceCapacity} guests`,
        normalisedCpp: ratedBid.normalisedCpp,
        estimatedCompletionDate: ratedBid.estimatedCompletionDate,
        budgetVerdict: ratedBid.budgetVerdict as 'within' | 'over' | 'under',
        proposal: ratedBid.proposal,
        scoreRows: ratedBidToScoreRows(ratedBid),
        confidence: ratedBid.confidence,
        tradeOffs: i === 0 ? `This bid's ${ratedBid.normalisedCpp! < 1 ? 'lower' : 'higher'}-than-average price per guest is offset by the strongest capacity and timing fit among all bids received - a real trade-off worth knowing, not just the top score.` : null,
      };
    });

    return bids.sort((a, b) => b.compositeScore - a.compositeScore).map((bid, i) => ({ ...bid, rank: i + 1 }));
  }

  private proposalFor(name: string, event: FoodieEvent): string {
    const cuisine = event.preferredCuisines[0] ?? 'seasonal';
    return `We'd build the menu around ${cuisine.toLowerCase()} flavors, sized for ${event.guestCount} guests, with your special request \u2014 "${event.specialRequest}" \u2014 built into the plan from the start, not added on after.`;
  }

  private hashCode(value: string): number {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }
}
