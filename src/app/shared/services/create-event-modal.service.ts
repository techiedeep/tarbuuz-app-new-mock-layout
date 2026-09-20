import { Injectable, signal } from '@angular/core';

/**
 * Controls the Create Event modal's visibility from anywhere in the app —
 * Header's "Event" link, Home's hero CTA, and the Events dashboard's own
 * "+ Create Event" button all need to trigger the same popup without a
 * parent-child relationship to each other or to the modal itself. A
 * signal-based service is the simplest way to do that: the modal (mounted
 * once, globally, in the root app component) just reads `isOpen()`, and
 * any component anywhere can call `open()`.
 */
@Injectable({ providedIn: 'root' })
export class CreateEventModalService {
  readonly isOpen = signal(false);

  open(): void {
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }
}
