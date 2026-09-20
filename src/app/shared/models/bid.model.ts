/**
 * Bid models.
 *
 * The UI-facing Bid/ScoreRow shape below (compositeScore, rank,
 * bidderName, a flat scoreRows array) is the app's own working
 * abstraction — BidsService and BidCard are built around it, and the
 * generic {label,value,percent} array is what lets BidCard render any
 * number of score criteria without hardcoding four or seven separate
 * template blocks. Kept as primary.
 *
 * Reconciliation against the real uploaded bid-platform.model.ts:
 *  - The real RatedBid has seven specific named scores
 *    (budgetComplianceScore, cuisineCapabilityScore, capacityFitScore,
 *    businessTypeScore, proposalQualityScore, valueInclusionsScore,
 *    occasionTimingScore) instead of a generic array, plus
 *    strengths/weaknesses/redFlags and narrative fields (confidence,
 *    selectionRationale, tradeOffs). Added below as RatedBid — the raw
 *    DTO shape — along with ratedBidToScoreRows(), a mapping helper that
 *    turns the seven named scores into this app's existing scoreRows
 *    format, so BidCard could consume real API data without a rewrite
 *    if this ever connects to a real backend.
 *  - BusinessType is a real, specific enum (restaurant/cloud-kitchen/
 *    catering/etc.) — a different axis entirely from this app's own
 *    Foodie/Supplier/Host role system, describing what kind of food
 *    business is placing a bid, not which role placed it. The mock data
 *    in bids.service.ts previously used ad-hoc 'supplier'/'venue'
 *    strings for this; updated to use the real enum values, since that
 *    was self-contained mock data with no external contract to protect
 *    and the real vocabulary is a genuine improvement in realism.
 *  - Bid (the real "submit a bid" request shape), EventDetails,
 *    MenuSection, EventStatus, and BidStatus added for completeness —
 *    none are wired to a service yet (there's no real bid-submission
 *    flow, only the read-only bidding drawer).
 */

export type BudgetVerdict = 'within' | 'over' | 'under';

export interface ScoreRow {
  readonly label: string;
  readonly value: number;
  /** 0-100, drives the bar fill width directly. */
  readonly percent: number;
}

export interface RatedBidCard {
  readonly id: string;
  readonly eventId: string;
  readonly eventName: string;
  readonly rank: number;
  /** 0-10 composite AI match score, shown in the center of the donut ring. */
  readonly compositeScore: number;
  readonly bidderName: string;
  readonly bidderBusinessType: string;
  readonly bidAmount: string;
  readonly currency: string;
  readonly serviceCapacity: string;
  readonly normalisedCpp: number | null;
  readonly estimatedCompletionDate: string;
  readonly budgetVerdict: BudgetVerdict | null;
  readonly proposal: string;
  readonly scoreRows: readonly ScoreRow[];
  /** Narrative fields from the real RatedBid DTO - null until a real
   *  backend actually returns them, rather than fabricated for every
   *  mock bid regardless of confidence tier. */
  readonly confidence: string | null;
  readonly tradeOffs: string | null;
}

/** Alias kept for backward compatibility with existing imports —
 *  BidCard/BiddingDrawer/BidsService all import this as `Bid`. */
export type Bid = RatedBidCard;

/** The donut ring's geometry — r=38 gives a circumference of ~238.76,
 *  matching the real component's hardcoded stroke-dasharray value exactly
 *  (2 * π * 38 ≈ 238.76). Named here instead of left as a magic number in
 *  the template, since anyone changing the ring's radius later needs to
 *  know this has to move with it. */
export const SCORE_RING_RADIUS = 38;
export const SCORE_RING_CIRCUMFERENCE = 2 * Math.PI * SCORE_RING_RADIUS;

export function scoreToPercent(compositeScore: number): number {
  return Math.max(0, Math.min(100, (compositeScore / 10) * 100));
}

export function ringDashoffset(compositeScore: number): number {
  const percent = scoreToPercent(compositeScore);
  return SCORE_RING_CIRCUMFERENCE * (1 - percent / 100);
}

// ── Real DTOs — see file-level note ────────────────────────────────────

/** The real "submit a bid" request shape — distinct from RatedBidCard
 *  above, which is a read-only, already-scored bid for display. No
 *  submit-a-bid flow exists in this app yet (only the read-only
 *  Foodie-side bidding drawer). */
export interface BidSubmission {
  eventId: string;
  eventName?: string;
  bidderBusinessType: BusinessType;
  bidderProfileId: string;
  bidder?: string;
  bidAmount: number;
  currency: string;
  proposal: string;
  estimatedCompletionDate: string; // ISO date string
  serviceCapacity: number;
  id?: string;
  status: 'submitted' | 'accepted' | 'rejected' | 'withdrawn';
}

/** The raw AI-ranked response shape from /event/{id}/top-rated — see
 *  file-level note on ratedBidToScoreRows() for how this maps onto the
 *  working RatedBidCard/ScoreRow shape BidCard actually renders. */
export interface RatedBid {
  id: string;
  eventId: string;
  eventName: string;
  bidderBusinessType: string;
  bidderProfileId: string;
  bidderName: string;
  bidAmount: number;
  currency: string;
  proposal: string;
  estimatedCompletionDate: string;
  status: string;
  serviceCapacity: number;

  rank: number | null;
  normalisedCpp: number | null;
  budgetVerdict: string | null;
  confidence: string | null;
  selectionRationale: string | null;
  tradeOffs: string | null;
  compositeScore: number | null;

  budgetComplianceScore: number | null;
  cuisineCapabilityScore: number | null;
  capacityFitScore: number | null;
  businessTypeScore: number | null;
  proposalQualityScore: number | null;
  valueInclusionsScore: number | null;
  occasionTimingScore: number | null;
  strengths: string[];
  weaknesses: string[];
  redFlags: string[];
}

/** Maps a real RatedBid's seven named scores onto this app's existing
 *  generic scoreRows array, so BidCard's already-working template (which
 *  loops over `scoreRows`, not seven hardcoded fields) could render real
 *  API data with no template changes. Scores are 0-10 in the source DTO,
 *  matching this app's existing percent-conversion convention. */
export function ratedBidToScoreRows(bid: RatedBid): ScoreRow[] {
  const rows: Array<[string, number | null]> = [
    ['Budget Compliance', bid.budgetComplianceScore],
    ['Cuisine Capability', bid.cuisineCapabilityScore],
    ['Capacity Fit', bid.capacityFitScore],
    ['Business Type', bid.businessTypeScore],
    ['Proposal Quality', bid.proposalQualityScore],
    ['Value Inclusions', bid.valueInclusionsScore],
    ['Occasion Timing', bid.occasionTimingScore],
  ];
  return rows
    .filter((row): row is [string, number] => row[1] !== null)
    .map(([label, value]) => ({ label, value, percent: scoreToPercent(value) }));
}

export interface EventDetails {
  id: string;
  title: string;
  chefName: string;
  eventDate: Date;
  expectedGuests: number;
  cuisine: string;
  budgetRange: { min: number; max: number };
  status: EventStatus;
  menuPreview: MenuSection[];
}

export interface MenuSection {
  icon: string;
  title: string;
  description: string;
}

/** What kind of food business is placing a bid — a different axis from
 *  this app's own Foodie/Supplier/Host role system entirely. Real,
 *  specific enum; see file-level note. */
export enum BusinessType {
  RESTAURANT = 'restaurant',
  CLOUD_KITCHEN = 'cloud-kitchen',
  CATERING = 'catering',
  PRIVATE_HOST = 'private-host',
  CAFE = 'cafe',
  FOOD_TRUCK = 'food-truck',
  BANQUET = 'banquet',
  BAR_LOUNGE = 'bar-lounge',
  HOTEL_RESTAURANT = 'hotel-restaurant',
  OTHER = 'other',
}

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  [BusinessType.RESTAURANT]: 'Restaurant',
  [BusinessType.CLOUD_KITCHEN]: 'Cloud Kitchen',
  [BusinessType.CATERING]: 'Catering Service',
  [BusinessType.PRIVATE_HOST]: 'Private Host',
  [BusinessType.CAFE]: 'Café',
  [BusinessType.FOOD_TRUCK]: 'Food Truck',
  [BusinessType.BANQUET]: 'Banquet',
  [BusinessType.BAR_LOUNGE]: 'Bar & Lounge',
  [BusinessType.HOTEL_RESTAURANT]: 'Hotel Restaurant',
  [BusinessType.OTHER]: 'Other',
};

export enum EventStatus {
  ACCEPTING_BIDS = 'accepting-bids',
  BID_ACCEPTED = 'bid-accepted',
  CLOSED = 'closed',
}

export enum BidStatus {
  SUBMITTED = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}
