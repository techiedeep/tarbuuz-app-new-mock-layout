import { Injectable, signal } from '@angular/core';
import { Observable, delay, of } from 'rxjs';
import {
  EventFilter,
  EventStatus,
  FILTER_STATUS_GROUPS,
  FoodieEvent,
} from '../models/foodie-event.model';

const STORAGE_KEY = 'tarbuuz_mock_foodie_events';
const SIMULATED_LATENCY_MS = 350;

/**
 * Same mock/localStorage pattern as FoodieProfileService — real service,
 * real Observable-returning API, standing in for a backend that doesn't
 * exist yet. Seeded once per userId on first access so returning users see
 * consistent data rather than a different random set every reload.
 */
@Injectable({ providedIn: 'root' })
export class FoodieEventsService {
  private readonly events = signal<Record<string, FoodieEvent[]>>(this.readFromLocalStorage());

  getEvents(userId: string): Observable<FoodieEvent[]> {
    const existing = this.events()[userId];
    if (existing) {
      return of(existing).pipe(delay(SIMULATED_LATENCY_MS));
    }
    const seeded = this.seedEventsFor();
    this.updateStore((store) => ({ ...store, [userId]: seeded }));
    return of(seeded).pipe(delay(SIMULATED_LATENCY_MS));
  }

  // A single event's own id is unique regardless of which user's list it
  // sits in, so this searches across every stored list rather than
  // requiring the caller (e.g. bid-cart, reached from a link that only
  // carries an event id) to also know and pass the owning user's id just
  // to look up one event.
  getEventById(eventId: string): Observable<FoodieEvent | undefined> {
    const allEvents = Object.values(this.events()).flat();
    const found = allEvents.find((e) => e.id === eventId);
    return of(found).pipe(delay(SIMULATED_LATENCY_MS));
  }

  /** Prepends a newly-created event to that user's list — prepended, not
   *  appended, so it's the first thing a Foodie sees on the dashboard
   *  right after creating it, matching what anyone would actually expect
   *  ("I just made this, why is it at the bottom"). Seeds the user's
   *  list first if this is their very first event, same as getEvents()
   *  does, so this never silently no-ops for a user with no prior
   *  events. */
  addEvent(userId: string, event: FoodieEvent): void {
    this.updateStore((store) => {
      const current = store[userId] ?? this.seedEventsFor();
      return { ...store, [userId]: [event, ...current] };
    });
  }

  // Same "search across every stored list" reasoning as getEventById -
  // the caller (Review Menu) knows the event id, not which user's list
  // it's filed under, so this finds and updates it wherever it actually
  // lives rather than requiring the caller to also track ownership.
  updateEventStatus(eventId: string, status: EventStatus): void {
    this.updateStore((store) => {
      const next: Record<string, FoodieEvent[]> = {};
      for (const [userId, events] of Object.entries(store)) {
        next[userId] = events.map((e) => (e.id === eventId ? { ...e, status } : e));
      }
      return next;
    });
  }

  filterEvents(events: readonly FoodieEvent[], filter: EventFilter, searchTerm: string): FoodieEvent[] {
    const term = searchTerm.trim().toLowerCase();
    const statusesForFilter: readonly EventStatus[] | null = filter === 'all' ? null : FILTER_STATUS_GROUPS[filter];

    return events.filter((event) => {
      const matchesFilter = !statusesForFilter || statusesForFilter.includes(event.status);
      if (!matchesFilter) return false;
      if (!term) return true;
      const haystack = [
        event.eventName,
        event.eventType,
        ...event.preferredCuisines,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }

  /** How much longer bidding stays open, phrased the way a Foodie actually
   *  reads it — "2 days left" rather than a raw timestamp — or 'Bid closed'
   *  once the deadline has passed, which the event card uses to decide
   *  whether "Review Bids" should even be actionable. */
  bidClosingMessage(event: FoodieEvent): string {
    if (!event.bidClosingAt) return '';
    const msRemaining = new Date(event.bidClosingAt).getTime() - Date.now();
    if (msRemaining <= 0) return 'Bid closed';
    const hours = Math.floor(msRemaining / (1000 * 60 * 60));
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} left to bid`;
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} left to bid`;
  }

  private seedEventsFor(): FoodieEvent[] {
    const now = Date.now();
    const hoursFromNow = (h: number) => new Date(now + h * 60 * 60 * 1000).toISOString();

    return [
      {
        id: 'evt-1001', eventName: 'Rania\u2019s 40th Birthday', eventType: 'birthday',
        status: 'submitted_for_bid', eventDate: '2026-09-20', eventTimezone: 'CDT',
        eventTime: '6:00 PM', duration: '4 hours', guestCount: 45, eventAmbience: 'festive',
        preferredCuisines: ['North Indian', 'Italian'], dietaryPreferences: ['Vegetarian-friendly', 'Nut-free'],
        specialRequest: 'A dessert table that doubles as a photo backdrop, please.',
        budget: 4500, eventLocation: 'Austin, TX', contactName: 'Rania Malik',
        bidClosingAt: hoursFromNow(-2),
      },
      {
        id: 'evt-1002', eventName: 'Diwali Family Gathering', eventType: 'religious',
        status: 'approve_or_request_changes', eventDate: '2026-11-01', eventTimezone: 'PDT',
        eventTime: '5:30 PM', duration: '3 hours', guestCount: 25, eventAmbience: 'intimate',
        preferredCuisines: ['North Indian'], dietaryPreferences: ['Vegetarian-friendly'],
        specialRequest: 'Keep it entirely vegetarian, including dessert.',
        budget: 2200, eventLocation: 'San Jose, CA', contactName: 'Anjali Gupta',
      },
      {
        id: 'evt-1003', eventName: 'Anniversary Dinner \u2014 8 Years', eventType: 'anniversary',
        status: 'completed', eventDate: '2026-06-14', eventTimezone: 'CDT',
        eventTime: '7:00 PM', duration: '2.5 hours', guestCount: 12, eventAmbience: 'elegant',
        preferredCuisines: ['Italian', 'Japanese'], dietaryPreferences: [],
        specialRequest: 'A quiet, candlelit table \u2014 nothing too loud.',
        budget: 1800, eventLocation: 'Austin, TX', contactName: 'Maya Chen',
      },
      {
        id: 'evt-1004', eventName: 'Graduation Brunch for Meera', eventType: 'graduation',
        status: 'confirmed', eventDate: '2026-05-03', eventTimezone: 'CDT',
        eventTime: '11:00 AM', duration: '3 hours', guestCount: 18, eventAmbience: 'casual',
        preferredCuisines: ['Mexican', 'North Indian'], dietaryPreferences: ['Gluten-free'],
        specialRequest: 'Build-your-own mimosa bar if possible.',
        budget: 1600, eventLocation: 'Austin, TX', contactName: 'Sofia Reyes',
      },
      {
        id: 'evt-1005', eventName: 'Q3 Team Offsite Dinner', eventType: 'corporate',
        status: 'scheduled', eventDate: '2026-08-12', eventTimezone: 'CDT',
        eventTime: '6:30 PM', duration: '3 hours', guestCount: 30, eventAmbience: 'casual',
        preferredCuisines: ['Thai', 'Peruvian'], dietaryPreferences: ['Vegan', 'Nut-free'],
        specialRequest: 'Please label every dish clearly \u2014 several allergies on the team.',
        budget: 3200, eventLocation: 'Austin, TX', contactName: 'Ben Ortiz',
      },
      {
        id: 'evt-1006', eventName: 'Corporate Holiday Party', eventType: 'corporate',
        status: 'cancelled', eventDate: '2026-12-15', eventTimezone: 'CDT',
        eventTime: '7:00 PM', duration: '4 hours', guestCount: 80, eventAmbience: 'festive',
        preferredCuisines: ['Italian'], dietaryPreferences: [],
        specialRequest: 'Event postponed to next quarter.',
        budget: 9000, eventLocation: 'Austin, TX', contactName: 'Jane Doe',
      },
      {
        id: 'evt-1007', eventName: 'The Copper Table \u2014 Tasting Menu', eventType: 'anniversary',
        status: 'submitted_for_bid', eventDate: '2026-10-04', eventTimezone: 'CDT',
        eventTime: '7:00 PM', duration: '2.5 hours', guestCount: 8, eventAmbience: 'elegant',
        preferredCuisines: ['Japanese'], dietaryPreferences: [],
        specialRequest: 'Chef\u2019s choice tasting menu, wine pairing if available.',
        budget: 1400, eventLocation: 'Austin, TX', contactName: 'Sofia Reyes',
        bidClosingAt: hoursFromNow(46),
      },
    ];
  }

  private updateStore(updater: (store: Record<string, FoodieEvent[]>) => Record<string, FoodieEvent[]>): void {
    const next = updater(this.events());
    this.events.set(next);
    this.writeToLocalStorage(next);
  }

  private readFromLocalStorage(): Record<string, FoodieEvent[]> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private writeToLocalStorage(store: Record<string, FoodieEvent[]>): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch {
      // Same reasoning as every other mock store in this app — a failed
      // write shouldn't block the in-memory update the user is waiting on.
    }
  }
}
