/**
 * Models backing the Host's dropdown-linked Dashboard page (merged from
 * the two separate pages Bidding Events and Submitted Bids used to be).
 * Distinct from bid.model.ts's RatedBidCard/RatedBid, which model a bid
 * from the *Foodie* side reviewing incoming bids — these model the same
 * underlying concept from the *Host* side placing them.
 *
 * Field set intentionally matches FoodieEvent's own card fields
 * (eventTime, eventTimezone, preferredCuisines, dietaryPreferences,
 * eventAmbience) rather than inventing a parallel shape — a Host looking
 * at an opportunity needs the same event details a Foodie's own
 * dashboard card already shows, not a thinner summary of them.
 */

export interface BiddingOpportunity {
  readonly id: string;
  readonly eventName: string;
  readonly icon: string;
  readonly eventDate: string;
  readonly eventTime: string;
  readonly eventTimezone?: string;
  readonly guestCount: number;
  readonly location: string;
  readonly preferredCuisines: readonly string[];
  readonly dietaryPreferences: readonly string[];
  readonly eventAmbience?: string;
  /** Per-guest budget as a plain number plus an explicit currency code,
   *  rather than a single pre-formatted string — so the currency can be
   *  appended consistently at render time instead of being baked into
   *  data that a differently-priced event would need to duplicate. */
  readonly budgetPerPerson: number;
  readonly budgetCurrency: string;
  /** How well this event fits the venue's profile, 0-100 — lets a Host
   *  triage at a glance rather than opening every opportunity to find out
   *  it's a poor fit. Ties back to the "Intelligent Bidding" matching
   *  concept established elsewhere in the app. */
  readonly matchScore: number;
  readonly bidClosingAt: string; // ISO datetime
}

export type SubmittedBidStatus = 'pending' | 'won' | 'declined';

export interface SubmittedBid {
  readonly id: string;
  readonly eventName: string;
  readonly icon: string;
  readonly eventDate: string;
  readonly eventTime: string;
  readonly eventTimezone?: string;
  readonly guestCount: number;
  readonly location: string;
  readonly preferredCuisines: readonly string[];
  readonly dietaryPreferences: readonly string[];
  readonly eventAmbience?: string;
  readonly bidAmountPerPerson: number;
  readonly bidCurrency: string;
  readonly submittedAt: string; // ISO datetime
  readonly status: SubmittedBidStatus;
}

export const SUBMITTED_BID_STATUS_LABELS: Record<SubmittedBidStatus, string> = {
  pending: 'Awaiting Response',
  won: 'Won',
  declined: 'Not Selected',
};

export function matchTier(score: number): 'high' | 'medium' | 'low' {
  if (score >= 80) return 'high';
  if (score >= 60) return 'medium';
  return 'low';
}
