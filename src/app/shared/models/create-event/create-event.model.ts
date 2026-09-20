/**
 * Models for the 6-step Create Event wizard. No prior model/service
 * existed for this page — it was only ever a standalone HTML/vanilla-JS
 * reference — built alongside the real Angular conversion.
 */

export interface EventTypeOption {
  readonly key: string;
  readonly icon: string;
  readonly name: string;
  readonly desc: string;
}

export interface CuisineOption {
  readonly key: string;
  readonly name: string;
  readonly region: string;
}

export interface NamedOption {
  readonly key: string;
  readonly name: string;
}

/** The full wizard state — one object mirroring the original's plain
 *  `state`, now held as component signals rather than a single mutable
 *  object (see CreateEvent component for the per-field signals this
 *  shape maps onto). Kept here as a type mainly for the review step and
 *  the eventual submit payload.
 *
 *  ambiance and budget shapes reconciled against the real, backend-
 *  connected create-event component (validateStep()):
 *   - ambiance: `if (!this.formData.eventAmbience)` is a single truthy
 *     check on one value, not a collection — the real form is
 *     single-select, not the multi-select chips this was originally
 *     built with.
 *   - budget: `if (!budget || budget < 1)` with the message "valid
 *     budget per person" — a real number, not a range key like
 *     '5to15k'. The range-card UI this was originally built with didn't
 *     match the real model at all. */
export interface CreateEventFormState {
  eventType: string | null;
  eventTypeOther: string;
  eventName: string;
  date: string;
  time: string;
  timezone: string;
  duration: string;
  guestCount: string;
  cuisines: ReadonlySet<string>;
  dietary: ReadonlySet<string>;
  ambiance: string | null;
  budget: string;
  city: string;
  area: string;
  requests: string;
}

export interface MiniStepStatus {
  readonly label: string;
  readonly state: 'done' | 'current' | 'locked';
}
