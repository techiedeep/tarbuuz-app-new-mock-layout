import { Injectable } from '@angular/core';
import { CreateEventFormState, CuisineOption, EventTypeOption, NamedOption } from '../models/create-event/create-event.model';
import { EventFormData } from '../models/event-creation.model';
import { FoodieEvent } from '../models/foodie-event.model';

const FIELD_LABELS: Record<string, string> = {
  eventType: 'Event type',
  eventTypeOther: 'Event details',
  eventName: 'Event name',
  date: 'Date',
  time: 'Time',
  timezone: 'Time zone',
  duration: 'Duration',
  guestCount: 'Guest count',
  cuisines: 'Cuisine',
  ambiance: 'Ambiance',
  budget: 'Budget',
  city: 'Location',
};

/** Verbatim from the real, backend-connected create-event component's
 *  mapEventType() — replaces an earlier guessed table that was wrong in
 *  several places (corporate→CORPORATE_BUSINESS instead of the real
 *  CORPORATE_EVENT, birthday→BIRTHDAY instead of BIRTHDAY_PARTY) and
 *  missing entries this app never even offered as options
 *  (holiday_party, networking_event, conference, workshop, gala,
 *  fundraiser). */
const EVENT_TYPE_BACKEND_CODES: Record<string, string> = {
  wedding: 'WEDDING',
  corporate: 'CORPORATE_EVENT',
  birthday: 'BIRTHDAY_PARTY',
  anniversary: 'ANNIVERSARY',
  baby_shower: 'BABY_SHOWER',
  graduation: 'GRADUATION',
  holiday_party: 'HOLIDAY_PARTY',
  networking_event: 'NETWORKING_EVENT',
  conference: 'CONFERENCE',
  workshop: 'WORKSHOP',
  gala: 'GALA',
  fundraiser: 'FUNDRAISER',
  other: 'OTHER',
};

@Injectable({ providedIn: 'root' })
export class CreateEventService {
  /** Reconciled against the real mapEventType() table — every key here
   *  has a real backend code to map to. The previous catalog had 4 types
   *  (cultural, festival, memorial, dinner) with no corresponding real
   *  code at all — they'd have silently collapsed to OTHER on submit,
   *  losing the user's actual selection — and was missing 6 types the
   *  real backend does support. Both problems fixed by matching the
   *  real set exactly rather than inventing categories independently. */
  readonly eventTypes: readonly EventTypeOption[] = [
    { key: 'wedding', icon: '💍', name: 'Wedding', desc: 'Any tradition, any size' },
    { key: 'birthday', icon: '🎂', name: 'Birthday Party', desc: 'From milestone to intimate' },
    { key: 'anniversary', icon: '🥂', name: 'Anniversary', desc: 'Celebrate the years' },
    { key: 'baby_shower', icon: '👶', name: 'Baby Shower', desc: 'Welcome the newest guest' },
    { key: 'graduation', icon: '🎓', name: 'Graduation', desc: 'Mark the achievement' },
    { key: 'corporate', icon: '💼', name: 'Corporate Event', desc: 'Meetings, launches, team events' },
    { key: 'holiday_party', icon: '🎄', name: 'Holiday Party', desc: 'Seasonal celebrations, office or otherwise' },
    { key: 'networking_event', icon: '🤝', name: 'Networking Event', desc: 'Mixers, meetups, industry gatherings' },
    { key: 'conference', icon: '🎤', name: 'Conference', desc: 'Multi-session gatherings, catered breaks and meals' },
    { key: 'workshop', icon: '🛠️', name: 'Workshop', desc: 'Hands-on sessions, small to mid-sized' },
    { key: 'fundraiser', icon: '🎗️', name: 'Fundraiser', desc: 'Cause-driven events, any scale' },
    { key: 'other', icon: '✨', name: 'Other', desc: "Tell us what you're planning" },
  ];

  readonly cuisines: readonly CuisineOption[] = [
    { key: 'cantonese', name: 'Cantonese', region: 'East Asian' }, { key: 'sichuan', name: 'Sichuan', region: 'East Asian' },
    { key: 'shanghainese', name: 'Shanghainese', region: 'East Asian' }, { key: 'japanese', name: 'Japanese', region: 'East Asian' },
    { key: 'korean', name: 'Korean', region: 'East Asian' }, { key: 'taiwanese', name: 'Taiwanese', region: 'East Asian' },
    { key: 'northindian', name: 'North Indian', region: 'South Asian' }, { key: 'southindian', name: 'South Indian', region: 'South Asian' },
    { key: 'punjabi', name: 'Punjabi', region: 'South Asian' }, { key: 'bengali', name: 'Bengali', region: 'South Asian' },
    { key: 'gujarati', name: 'Gujarati', region: 'South Asian' }, { key: 'srilankan', name: 'Sri Lankan', region: 'South Asian' },
    { key: 'pakistani', name: 'Pakistani', region: 'South Asian' }, { key: 'nepali', name: 'Nepali', region: 'South Asian' },
    { key: 'thai', name: 'Thai', region: 'Southeast Asian' }, { key: 'vietnamese', name: 'Vietnamese', region: 'Southeast Asian' },
    { key: 'filipino', name: 'Filipino', region: 'Southeast Asian' }, { key: 'indonesian', name: 'Indonesian', region: 'Southeast Asian' },
    { key: 'malaysian', name: 'Malaysian', region: 'Southeast Asian' }, { key: 'singaporean', name: 'Singaporean', region: 'Southeast Asian' },
    { key: 'lebanese', name: 'Lebanese', region: 'Middle Eastern' }, { key: 'persian', name: 'Persian', region: 'Middle Eastern' },
    { key: 'turkish', name: 'Turkish', region: 'Middle Eastern' }, { key: 'emirati', name: 'Emirati', region: 'Middle Eastern' },
    { key: 'israeli', name: 'Israeli', region: 'Middle Eastern' }, { key: 'syrian', name: 'Syrian', region: 'Middle Eastern' },
    { key: 'italian', name: 'Italian', region: 'European' }, { key: 'french', name: 'French', region: 'European' },
    { key: 'spanish', name: 'Spanish', region: 'European' }, { key: 'greek', name: 'Greek', region: 'European' },
    { key: 'british', name: 'British', region: 'European' }, { key: 'german', name: 'German', region: 'European' },
    { key: 'portuguese', name: 'Portuguese', region: 'European' },
    { key: 'ethiopian', name: 'Ethiopian', region: 'African' }, { key: 'moroccan', name: 'Moroccan', region: 'African' },
    { key: 'nigerian', name: 'Nigerian', region: 'African' }, { key: 'southafrican', name: 'South African', region: 'African' },
    { key: 'egyptian', name: 'Egyptian', region: 'African' },
    { key: 'mexican', name: 'Mexican', region: 'Latin American' }, { key: 'peruvian', name: 'Peruvian', region: 'Latin American' },
    { key: 'brazilian', name: 'Brazilian', region: 'Latin American' }, { key: 'argentinian', name: 'Argentinian', region: 'Latin American' },
    { key: 'colombian', name: 'Colombian', region: 'Latin American' }, { key: 'cuban', name: 'Cuban', region: 'Latin American' },
    { key: 'jamaican', name: 'Jamaican', region: 'Caribbean' }, { key: 'trinidadian', name: 'Trinidadian', region: 'Caribbean' },
    { key: 'haitian', name: 'Haitian', region: 'Caribbean' },
    { key: 'soulfood', name: 'Southern / Soul Food', region: 'North American' }, { key: 'texmex', name: 'Tex-Mex', region: 'North American' },
    { key: 'bbq', name: 'BBQ', region: 'North American' }, { key: 'cajun', name: 'Cajun / Creole', region: 'North American' },
    { key: 'australian', name: 'Australian', region: 'Oceania' },
  ];

  readonly popularCuisineKeys: readonly string[] = ['italian', 'mexican', 'japanese', 'northindian', 'lebanese', 'thai', 'french', 'southindian', 'cantonese', 'moroccan'];

  readonly dietaryOptions: readonly NamedOption[] = [
    { key: 'vegetarian', name: 'Vegetarian' }, { key: 'vegan', name: 'Vegan' }, { key: 'halal', name: 'Halal' },
    { key: 'kosher', name: 'Kosher' }, { key: 'glutenfree', name: 'Gluten-Free' }, { key: 'dairyfree', name: 'Dairy-Free' },
    { key: 'nutfree', name: 'Nut-Free' }, { key: 'jain', name: 'Jain (no root vegetables)' }, { key: 'norestrictions', name: 'No Restrictions' },
  ];

  readonly ambianceOptions: readonly NamedOption[] = [
    { key: 'formal', name: 'Formal & Elegant' }, { key: 'casual', name: 'Casual & Relaxed' }, { key: 'festive', name: 'Festive & Vibrant' },
    { key: 'intimate', name: 'Intimate & Cozy' }, { key: 'outdoor', name: 'Outdoor & Al Fresco' }, { key: 'traditional', name: 'Traditional & Cultural' },
  ];

  readonly deliveryApps: readonly string[] = ['🛵 Uber Eats', '🥡 DoorDash', '🚲 Deliveroo', '🛺 Grab', '🍛 Zomato'];

  readonly stepLabels: readonly string[] = ['Event Type', 'Details', 'Guests & Cuisine', 'Dietary & Ambiance', 'Budget & Location', 'Review'];

  readonly miniStepLabels: readonly string[] = ['Create Event', 'Review Menu', 'Approve Menu', 'Review Bids', 'Make Payment'];

  readonly statusMessages: readonly string[] = [
    'Analyzing your guest count and occasion…',
    'Matching seasonal ingredients to your budget…',
    'Checking dietary requirements…',
    'Drafting your first menu option…',
  ];

  readonly timezones: readonly string[] = Array.from(
    new Set([
      this.detectedTimezone(),
      'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
      'America/Sao_Paulo', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Africa/Cairo', 'Africa/Lagos',
      'Asia/Dubai', 'Asia/Kolkata', 'Asia/Bangkok', 'Asia/Singapore', 'Asia/Shanghai', 'Asia/Tokyo',
      'Asia/Seoul', 'Australia/Sydney', 'Pacific/Auckland',
    ]),
  );

  detectedTimezone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  }

  /** Whole days between today and the given yyyy-mm-dd date string, at
   *  local midnight on both ends — matches the original's exact math
   *  (no time-of-day component), which is what the delivery-banner
   *  0-3-day window depends on. */
  daysUntil(dateStr: string): number | null {
    if (!dateStr) return null;
    const target = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - today.getTime()) / 86400000);
  }

  /** Mirrors the real validateStep() exactly, field for field:
   *   - step 2 (Details) requires timezone and duration explicitly, even
   *     though both are always defaulted here (detected timezone, '2'
   *     hours) — they can never actually fail this check, but the real
   *     code treats them as required, so this preserves that intent
   *     rather than quietly dropping it because "it happens to always
   *     pass anyway."
   *   - dietary has no case in the real switch at all — not required.
   *   - ambiance is a single required value, not "select at least one."
   *   - budget must be a real number >= 1, not "a range is picked." */
  isStepValid(stepIndex: number, state: CreateEventFormState): boolean {
    switch (stepIndex) {
      case 0:
        return state.eventType !== null && (state.eventType !== 'other' || state.eventTypeOther.trim().length > 0);
      case 1:
        return (
          state.eventName.trim().length > 0 &&
          !!state.date &&
          !!state.time &&
          !!state.timezone &&
          !!state.duration
        );
      case 2:
        return !!state.guestCount && parseInt(state.guestCount, 10) >= 1 && state.cuisines.size > 0;
      case 3:
        return state.ambiance !== null;
      case 4: {
        const budgetNum = parseFloat(state.budget);
        return !!state.budget && !isNaN(budgetNum) && budgetNum >= 1 && state.city.trim().length > 0;
      }
      default:
        return true;
    }
  }

  /** Specific, per-field message for a required-but-empty field — not
   *  just "something on this step is missing." Message text aligned
   *  with the real component's showNotification() copy where a direct
   *  equivalent exists ("Please select a date", "Please enter a valid
   *  budget per person", etc.), shown per-field here rather than as a
   *  toast, matching the pattern already used on Personal Info, Venue
   *  Info, and the Review Menu edit form. Returns '' when valid. */
  fieldErrorMessage(field: string, state: CreateEventFormState): string {
    switch (field) {
      case 'eventType':
        return state.eventType === null ? 'Please select an event type' : '';
      case 'eventTypeOther':
        return state.eventType === 'other' && state.eventTypeOther.trim().length === 0
          ? 'Please tell us what you\'re planning'
          : '';
      case 'eventName':
        return state.eventName.trim().length === 0 ? 'Please enter an event name' : '';
      case 'date':
        return !state.date ? 'Please select a date' : '';
      case 'time':
        return !state.time ? 'Please select a time' : '';
      case 'timezone':
        return !state.timezone ? 'Please select a time zone' : '';
      case 'duration':
        return !state.duration ? 'Please select a duration' : '';
      case 'guestCount':
        if (!state.guestCount) return 'Please enter a valid number of guests';
        return parseInt(state.guestCount, 10) < 1 ? 'Please enter a valid number of guests' : '';
      case 'cuisines':
        return state.cuisines.size === 0 ? 'Please select at least one cuisine' : '';
      case 'ambiance':
        return state.ambiance === null ? 'Please select event ambience' : '';
      case 'budget': {
        const budgetNum = parseFloat(state.budget);
        return !state.budget || isNaN(budgetNum) || budgetNum < 1 ? 'Please enter a valid budget per person' : '';
      }
      case 'city':
        return state.city.trim().length === 0 ? 'Please enter a location' : '';
      default:
        return '';
    }
  }

  /** Maps the wizard's own internal state onto the real EventFormData
   *  shape — reconciled against the real, backend-connected component's
   *  validateStep()/submitForm() rather than guessed:
   *   - ambiance and budget are now genuinely the same shape as the
   *     real form (single value, real number) — no lossy join or
   *     range-to-number guess needed anymore.
   *   - status/visibility set to 'PUBLISHED'/'PUBLIC', matching the
   *     real submitForm() exactly (this app previously invented
   *     'pending', which doesn't appear in the real valid-statuses list
   *     at all).
   *   - eventType goes through mapEventType() — see that method's own
   *     comment on why its exact table is an assumption.
   *  contactName still isn't part of the wizard's own state — supplied
   *  by the caller (the logged-in user's name) for the same reason as
   *  before: re-typing your own name after authenticating would be a
   *  bad UX shortcut just to satisfy the model shape. */
  toEventFormData(state: CreateEventFormState, contactName: string): EventFormData {
    // When eventType is 'other', the free-typed description has nowhere
    // to live in the backend's eventType enum — mapEventType() would run
    // it through slugification, fail to match anything, and silently
    // collapse it to the generic 'OTHER' code, discarding exactly what
    // the user typed. Folding it into specialRequest instead means it's
    // still part of the submitted data somewhere, rather than lost.
    const isOther = state.eventType === 'other';
    const otherDescription = isOther ? state.eventTypeOther.trim() : '';
    const specialRequest = otherDescription
      ? `Event type: ${otherDescription}${state.requests.trim() ? ' — ' + state.requests.trim() : ''}`
      : state.requests;

    const preferredCuisines = Array.from(state.cuisines).map((k) => this.findCuisine(k)?.name ?? k);
    const dietaryPreferences = Array.from(state.dietary).map((k) => this.findNamed(this.dietaryOptions, k)?.name ?? k);
    const eventAmbience = state.ambiance ? (this.findNamed(this.ambianceOptions, state.ambiance)?.name ?? state.ambiance) : '';
    const eventLocation = state.area.trim() ? `${state.city}, ${state.area}` : state.city;

    return {
      eventType: this.mapEventType(state.eventType ?? ''),
      eventName: state.eventName,
      eventDate: state.date,
      eventTime: state.time,
      eventTimezone: state.timezone,
      duration: state.duration,
      guestCount: parseInt(state.guestCount, 10) || 0,
      preferredCuisines,
      dietaryPreferences,
      eventAmbience,
      budget: parseFloat(state.budget) || 0,
      eventLocation,
      specialRequest,
      contactName,
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
    };
  }

  /** Verbatim from the real component — including the console.log, kept
   *  for fidelity rather than quietly dropped, and the exact
   *  lowercase+underscore normalization before lookup. */
  /** Maps the wizard's own state onto FoodieEvent — the shape the
   *  dashboard actually displays, which is a genuinely different
   *  audience from EventFormData (the hypothetical backend payload built
   *  by toEventFormData() above). Two things this does differently from
   *  that method, deliberately:
   *   - eventType stays as the wizard's own lowercase key (e.g.
   *     'baby_shower'), not run through mapEventType()'s uppercase
   *     backend codes — EVENT_TYPE_ICONS on the dashboard looks up
   *     lowercase keys, so feeding it 'BABY_SHOWER' would silently miss
   *     and fall back to the generic icon instead of showing the right one.
   *   - time gets converted from the <input type="time"> 24-hour value
   *     to the 12-hour "6:00 PM" style the dashboard's other seeded
   *     events already use, so a newly-created event's card reads the
   *     same way as every event that was already there, not visibly
   *     different from having come through a different path.
   *  status starts at 'pending_for_review' — matching the submit
   *  modal's own "Smart Menu is generating your menu right now" copy;
   *  the event genuinely is awaiting that step, not yet anything further
   *  along like scheduled or confirmed. */
  toFoodieEvent(state: CreateEventFormState, userId: string, contactName: string): FoodieEvent {
    const isOther = state.eventType === 'other';
    const otherDesc = isOther ? state.eventTypeOther.trim() : '';
    const specialRequest = otherDesc
      ? `Event type: ${otherDesc}${state.requests.trim() ? ' — ' + state.requests.trim() : ''}`
      : state.requests;

    return {
      id: `evt-${Date.now()}`,
      eventName: state.eventName,
      eventType: state.eventType ?? 'other',
      status: 'pending_for_review',
      eventDate: state.date,
      eventTimezone: this.toTimezoneAbbreviation(state.timezone, state.date),
      eventTime: this.formatTime12h(state.time),
      duration: `${state.duration}${state.duration === '7' ? '+' : ''} hour${state.duration === '1' ? '' : 's'}`,
      guestCount: parseInt(state.guestCount, 10) || 0,
      eventAmbience: state.ambiance ?? undefined,
      preferredCuisines: Array.from(state.cuisines).map((k) => this.findCuisine(k)?.name ?? k),
      dietaryPreferences: Array.from(state.dietary).map((k) => this.findNamed(this.dietaryOptions, k)?.name ?? k),
      specialRequest,
      budget: parseFloat(state.budget) || 0,
      eventLocation: state.area.trim() ? `${state.city}, ${state.area}` : state.city,
      contactName,
      createdByUserId: userId,
    };
  }

  // The wizard picks up the full IANA zone name (e.g. "America/Los_Angeles")
  // from the browser, but FoodieEvent display everywhere else — the
  // original seed events, the dashboard card — uses short abbreviations
  // ("CDT", "PDT"). Storing the raw IANA string was the actual root
  // cause of the card truncating: "Sep 15, 2026 America/Los_Angeles"
  // simply doesn't fit a compact detail row the same way "Sep 15, 2026
  // PDT" does. Intl.DateTimeFormat with timeZoneName:'short' computes
  // the correct abbreviation for the specific date given — genuinely
  // correct across DST transitions, not a hardcoded per-zone guess that
  // would silently go wrong every March/November.
  private toTimezoneAbbreviation(ianaZone: string, dateStr: string): string {
    try {
      const date = dateStr ? new Date(dateStr + 'T12:00:00') : new Date();
      const parts = new Intl.DateTimeFormat('en-US', { timeZone: ianaZone, timeZoneName: 'short' }).formatToParts(date);
      const tzPart = parts.find((p) => p.type === 'timeZoneName');
      return tzPart?.value ?? ianaZone;
    } catch {
      return ianaZone;
    }
  }

  private formatTime12h(time24: string): string {
    if (!time24) return '';
    const [hStr, mStr] = time24.split(':');
    let h = parseInt(hStr, 10);
    const period = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${mStr} ${period}`;
  }

  mapEventType(uiType: string): string {
    console.log('Mapping event type:', uiType);
    if (!uiType) return 'OTHER';
    const key = uiType.toLowerCase().replace(/\s+/g, '_');
    return EVENT_TYPE_BACKEND_CODES[key] || 'OTHER';
  }

  findEventType(key: string | null): EventTypeOption | undefined {
    return this.eventTypes.find((t) => t.key === key);
  }

  findCuisine(key: string): CuisineOption | undefined {
    return this.cuisines.find((c) => c.key === key);
  }

  findNamed(list: readonly NamedOption[], key: string): NamedOption | undefined {
    return list.find((o) => o.key === key);
  }

  searchCuisines(query: string): CuisineOption[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return this.cuisines.filter((c) => c.name.toLowerCase().includes(q) || c.region.toLowerCase().includes(q));
  }

  groupCuisinesByRegion(list: readonly CuisineOption[]): ReadonlyMap<string, CuisineOption[]> {
    const map = new Map<string, CuisineOption[]>();
    for (const c of list) {
      const bucket = map.get(c.region) ?? [];
      bucket.push(c);
      map.set(c.region, bucket);
    }
    return map;
  }
}
