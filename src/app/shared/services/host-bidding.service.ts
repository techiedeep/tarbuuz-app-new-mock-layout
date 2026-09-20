import { Injectable, signal } from '@angular/core';
import { Observable, delay, of } from 'rxjs';
import { BiddingOpportunity, SubmittedBid } from '../models/host-bidding.model';
import { BidSubmission } from '../models/bid.model';

const SIMULATED_LATENCY_MS = 350;

/** Same mock/localStorage-free pattern as the simpler read-only services in
 *  this app (e.g. BidsService) — illustrative data, not backed by a real
 *  matching backend, since no bid-submission flow exists yet. Seeded once
 *  per instance so both tabs see consistent data. Field values (cuisines,
 *  dietary needs, ambience, per-guest budget/currency) deliberately match
 *  the shape a real event-creation payload uses, not a thinned-down
 *  summary of it. */
@Injectable({ providedIn: 'root' })
export class HostBiddingService {
  private readonly opportunities = signal<BiddingOpportunity[]>(this.seedOpportunities());
  private readonly submittedBids = signal<SubmittedBid[]>(this.seedSubmittedBids());

  getOpportunities(): Observable<BiddingOpportunity[]> {
    return of(this.opportunities()).pipe(delay(SIMULATED_LATENCY_MS));
  }

  // Single-item lookup for the Submit Bid page, rather than making that
  // page fetch the whole list and filter it client-side just to find the
  // one opportunity its route param actually points to.
  getOpportunityById(id: string): Observable<BiddingOpportunity | undefined> {
    return of(this.opportunities().find((o) => o.id === id)).pipe(delay(SIMULATED_LATENCY_MS));
  }

  getSubmittedBids(): Observable<SubmittedBid[]> {
    return of(this.submittedBids()).pipe(delay(SIMULATED_LATENCY_MS));
  }

  // The real submission this service previously had no method for at
  // all. Moves the opportunity being bid on out of the open list and
  // appends a matching SubmittedBid, mirroring what a real backend would
  // do to both collections when a bid comes in - so the just-submitted
  // bid actually shows up on the dashboard's "My Bids" tab afterward,
  // rather than the submission silently going nowhere.
  submitBid(submission: BidSubmission): Observable<SubmittedBid> {
    const opp = this.opportunities().find((o) => o.id === submission.eventId);
    const newBid: SubmittedBid = {
      id: `sb-${Date.now()}`,
      eventName: opp?.eventName ?? submission.eventName ?? 'Event',
      icon: opp?.icon ?? '🎉',
      eventDate: opp?.eventDate ?? new Date().toISOString().slice(0, 10),
      eventTime: opp?.eventTime ?? '',
      eventTimezone: opp?.eventTimezone,
      guestCount: opp?.guestCount ?? 0,
      location: opp?.location ?? '',
      preferredCuisines: opp?.preferredCuisines ?? [],
      dietaryPreferences: opp?.dietaryPreferences ?? [],
      eventAmbience: opp?.eventAmbience,
      bidAmountPerPerson: submission.bidAmount,
      bidCurrency: submission.currency,
      submittedAt: new Date().toISOString(),
      status: 'pending',
    };

    this.submittedBids.update((bids) => [newBid, ...bids]);
    if (opp) {
      this.opportunities.update((opps) => opps.filter((o) => o.id !== submission.eventId));
    }

    return of(newBid).pipe(delay(SIMULATED_LATENCY_MS));
  }

  private seedOpportunities(): BiddingOpportunity[] {
    const now = Date.now();
    const hoursFromNow = (h: number) => new Date(now + h * 60 * 60 * 1000).toISOString();
    return [
      {
        id: 'op-1', eventName: 'Rania\u2019s 40th Birthday', icon: '\uD83C\uDF82',
        eventDate: '2026-09-20', eventTime: '6:00 PM', eventTimezone: 'CST',
        guestCount: 45, location: 'Austin, TX',
        preferredCuisines: ['north indian', 'italian'], dietaryPreferences: ['vegetarian'],
        eventAmbience: 'festive', budgetPerPerson: 100, budgetCurrency: 'USD',
        matchScore: 94, bidClosingAt: hoursFromNow(46),
      },
      {
        id: 'op-2', eventName: 'Corporate Retreat Dinner', icon: '\uD83D\uDCBC',
        eventDate: '2026-10-18', eventTime: '7:30 PM', eventTimezone: 'CST',
        guestCount: 35, location: 'Dripping Springs, TX',
        preferredCuisines: ['thai', 'peruvian'], dietaryPreferences: ['gluten-free'],
        eventAmbience: 'formal', budgetPerPerson: 90, budgetCurrency: 'USD',
        matchScore: 88, bidClosingAt: hoursFromNow(72),
      },
      {
        id: 'op-3', eventName: 'Anniversary Celebration', icon: '\uD83E\uDD42',
        eventDate: '2026-11-08', eventTime: '5:00 PM', eventTimezone: 'CST',
        guestCount: 20, location: 'Austin, TX',
        preferredCuisines: ['italian', 'japanese'], dietaryPreferences: [],
        eventAmbience: 'intimate', budgetPerPerson: 90, budgetCurrency: 'USD',
        matchScore: 61, bidClosingAt: hoursFromNow(20),
      },
      {
        id: 'op-4', eventName: 'Graduation Brunch', icon: '\uD83C\uDF93',
        eventDate: '2026-12-02', eventTime: '11:00 AM', eventTimezone: 'CST',
        guestCount: 18, location: 'Austin, TX',
        preferredCuisines: ['mexican', 'north indian'], dietaryPreferences: ['vegetarian', 'nut-free'],
        eventAmbience: 'casual', budgetPerPerson: 90, budgetCurrency: 'USD',
        matchScore: 76, bidClosingAt: hoursFromNow(96),
      },
    ];
  }

  private seedSubmittedBids(): SubmittedBid[] {
    return [
      {
        id: 'sb-1', eventName: 'Graduation Brunch for Meera', icon: '\uD83C\uDF93',
        eventDate: '2026-05-03', eventTime: '12:00 PM', eventTimezone: 'CST',
        guestCount: 18, location: 'Austin, TX',
        preferredCuisines: ['indian', 'thai'], dietaryPreferences: ['vegetarian'],
        eventAmbience: 'festive', bidAmountPerPerson: 95, bidCurrency: 'USD',
        submittedAt: '2026-04-10T14:00:00Z', status: 'won',
      },
      {
        id: 'sb-2', eventName: 'The Copper Table Referral', icon: '\uD83E\uDD42',
        eventDate: '2026-07-22', eventTime: '7:00 PM', eventTimezone: 'CST',
        guestCount: 30, location: 'Austin, TX',
        preferredCuisines: ['italian'], dietaryPreferences: ['vegan'],
        eventAmbience: 'elegant', bidAmountPerPerson: 110, bidCurrency: 'USD',
        submittedAt: '2026-07-01T09:30:00Z', status: 'pending',
      },
      {
        id: 'sb-3', eventName: 'Summer Solstice Dinner', icon: '\u2600\uFE0F',
        eventDate: '2026-06-21', eventTime: '6:30 PM', eventTimezone: 'CST',
        guestCount: 40, location: 'Dripping Springs, TX',
        preferredCuisines: ['mexican', 'thai'], dietaryPreferences: [],
        eventAmbience: 'outdoor', bidAmountPerPerson: 95, bidCurrency: 'USD',
        submittedAt: '2026-06-01T11:15:00Z', status: 'declined',
      },
    ];
  }
}
