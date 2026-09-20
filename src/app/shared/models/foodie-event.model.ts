/**
 * Matches the real foodie-events-dashboard component's field usage exactly
 * (eventType, eventDate, eventTimezone, guestCount, eventAmbience,
 * preferredCuisines, dietaryPreferences, specialRequest, etc.) — this
 * isn't a redesigned shape, it's the same data the original template
 * already binds to, typed properly.
 */

export type EventStatus =
  | 'pending'
  | 'pending_for_review'
  | 'in_progress'
  | 'published'
  | 'submitted_for_bid'
  | 'approve_or_request_changes'
  | 'change_requested'
  | 'scheduled'
  | 'confirmed'
  | 'completed'
  | 'cancelled';

/**
 * The filter tabs a Foodie actually clicks — not a 1:1 mirror of
 * EventStatus. 'in_review' in particular is a genuine group: several
 * granular backend statuses (pending_for_review, approve_or_request_changes,
 * change_requested, in_progress) all mean roughly the same thing from a
 * Foodie's point of view — "this needs my attention or is being worked on"
 * — and forcing four separate tabs for that distinction would be a worse
 * filter UI, not a more precise one. 'scheduled' vs 'confirmed' stay
 * genuinely distinct: scheduled means a bid's been accepted and the date
 * is locked, confirmed means payment has actually gone through.
 */
export type EventFilter = 'all' | 'submitted_for_bid' | 'in_review' | 'scheduled' | 'confirmed' | 'completed' | 'cancelled';

export const FILTER_STATUS_GROUPS: Record<Exclude<EventFilter, 'all'>, readonly EventStatus[]> = {
  submitted_for_bid: ['submitted_for_bid'],
  in_review: ['pending', 'pending_for_review', 'in_progress', 'published', 'approve_or_request_changes', 'change_requested'],
  scheduled: ['scheduled'],
  confirmed: ['confirmed'],
  completed: ['completed'],
  cancelled: ['cancelled'],
};

export interface FoodieEvent {
  readonly id: string;
  readonly eventName: string;
  readonly eventType: string;
  readonly status: EventStatus;
  readonly eventDate: string; // ISO date
  readonly eventTimezone?: string;
  readonly eventTime: string;
  /** Real field, not previously modeled — confirmed absent by diffing
   *  this model against every `event.` reference the real dashboard
   *  template actually uses: the dashboard cards never display duration,
   *  so this gap was invisible in the UI, but the field is real and
   *  belongs on a complete model (an event-detail or edit screen would
   *  need it even though this card view doesn't). */
  readonly duration: string;
  readonly guestCount: number;
  readonly eventAmbience?: string;
  readonly preferredCuisines: readonly string[];
  readonly dietaryPreferences: readonly string[];
  readonly specialRequest: string;
  /** Real fields, same reasoning as duration above — present in the full
   *  backend contract, never rendered by this specific dashboard view. */
  readonly budget: number;
  readonly eventLocation: string;
  readonly contactName: string;
  readonly createdByUserId?: string;
  readonly createdByProfileType?: string;
  readonly createdByProfileId?: string;
  readonly visibility?: string;
  readonly coverImageUrl?: string;
  /** Only meaningful when status is 'submitted_for_bid' — bidClosingAt in
   *  the original component computes a countdown from a deadline like this. */
  readonly bidClosingAt?: string; // ISO datetime
  /** The real model's fields tying an event to the chef-assignment and
   *  menu-validation pipeline (see chef-profile.model.ts and
   *  menu/ai-menu-recommendation.model.ts) — optional and unused by any
   *  current view, since no chef-assignment or menu-review flow is built
   *  yet. Kept typed loosely (Chef below, unknown[] for menu sections)
   *  rather than importing CourseSection directly, to avoid coupling this
   *  core event model to the menu domain before anything actually
   *  consumes the relationship. */
  readonly assignedChef?: FoodieEventChef;
  readonly menuSections?: readonly unknown[];
  readonly userResponse?: string;
}

/** The real model's minimal Chef shape as it appears attached to an
 *  event — not the full ChefProfile in chef-profile.model.ts, just the
 *  assignment-relevant fields. */
export interface FoodieEventChef {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly assignmentStatus: string;
}

/** Label + CSS modifier for each status — one lookup table instead of the
 *  ad-hoc string interpolation (status-{{ event.status }}) the original
 *  template used, so a typo'd status can't silently produce an unstyled
 *  badge with no visual indication anything's wrong. */
export interface StatusMeta {
  readonly label: string;
  readonly cssClass: string;
}

export const STATUS_META: Record<EventStatus, StatusMeta> = {
  pending: { label: 'Pending', cssClass: 'status-pending' },
  pending_for_review: { label: 'Pending Review', cssClass: 'status-pending' },
  in_progress: { label: 'In Progress', cssClass: 'status-progress' },
  published: { label: 'Published', cssClass: 'status-pending' },
  submitted_for_bid: { label: 'Bids Open', cssClass: 'status-bid' },
  approve_or_request_changes: { label: 'Awaiting Your Approval', cssClass: 'status-progress' },
  change_requested: { label: 'Changes Requested', cssClass: 'status-warning' },
  scheduled: { label: 'Scheduled', cssClass: 'status-scheduled' },
  confirmed: { label: 'Confirmed', cssClass: 'status-confirmed' },
  completed: { label: 'Completed', cssClass: 'status-completed' },
  cancelled: { label: 'Cancelled', cssClass: 'status-cancelled' },
};

/**
 * Whether Review Menu's "✓ Approve Menu" button should be hidden for a
 * given status - approving the menu moves an event to submitted_for_bid,
 * so any status at or beyond that point in the real workflow means
 * approval already happened (or the event moved on some other way, e.g.
 * cancelled) and the button has no business reappearing.
 *
 * This replaces a separate, previously-persisted "approved event ids"
 * flag that lived only in ReviewMenuService's own localStorage key -
 * disconnected from the event's own real status, so the two could drift
 * out of sync with each other. The event's status field is already the
 * single, authoritative record of where it sits in the workflow; there's
 * no reason a second, parallel "is it approved" flag should exist
 * alongside it.
 */
const STATUSES_PAST_MENU_APPROVAL: readonly EventStatus[] = [
  'submitted_for_bid',
  'scheduled',
  'confirmed',
  'completed',
  'cancelled',
];

export function isMenuApprovedOrLater(status: EventStatus): boolean {
  return STATUSES_PAST_MENU_APPROVAL.includes(status);
}

export const EVENT_TYPE_ICONS: Record<string, string> = {
  birthday: '🎂', wedding: '💍', anniversary: '💐', corporate: '💼',
  graduation: '🎓', religious: '🕯️', 'baby-shower': '🍼', community: '🎉',
  default: '🎉',
};

export const CUISINE_ICONS: Record<string, string> = {
  'north indian': '🍛', 'south indian': '🥥', italian: '🍝', japanese: '🍣',
  lebanese: '🧆', peruvian: '🌶️', thai: '🍜', mexican: '🌮', default: '🍽️',
};

export const AMBIENCE_MAP: Record<string, { icon: string; label: string }> = {
  casual: { icon: '☀️', label: 'Casual' },
  elegant: { icon: '✨', label: 'Elegant' },
  rustic: { icon: '🌾', label: 'Rustic' },
  festive: { icon: '🎊', label: 'Festive' },
  intimate: { icon: '🕯️', label: 'Intimate' },
  // Added alongside the Create Event wizard integration — that wizard's
  // own ambiance options (formal, outdoor, traditional) had no entry
  // here at all, meaning a newly-created event choosing one of these
  // would silently lose its ambience badge on the dashboard card, not
  // error, just quietly show less than it should.
  formal: { icon: '🎩', label: 'Formal' },
  outdoor: { icon: '🌳', label: 'Outdoor' },
  traditional: { icon: '🪔', label: 'Traditional' },
};

export const EVENT_FILTERS: ReadonlyArray<{ id: EventFilter; label: string }> = [
  { id: 'all', label: 'All Events' },
  { id: 'submitted_for_bid', label: 'Submitted for Bid' },
  { id: 'in_review', label: 'In Review' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
];
