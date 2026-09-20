import { Injectable, signal } from '@angular/core';

/**
 * Controls the login/registration modal's visibility from anywhere in the
 * app — UserMenu's avatar dropdown and Home's "Get Started" CTA both need
 * to trigger the same modal without a parent-child relationship to each
 * other. Same reasoning as CreateEventModalService: a signal-based
 * service that any component can read from or call open() on.
 *
 * The modal itself (<app-login>) stays mounted inside UserMenu rather
 * than moving to a global root-level mount — UserMenu already owns the
 * authenticated/unauthenticated avatar state this modal exists to change,
 * and moving <app-login> elsewhere would risk reintroducing the
 * backdrop-filter containing-block issue that was already fixed once for
 * this exact component.
 *
 * Pending-action support: some callers (Header's "Event" link) want more
 * than "show the login modal" — they want "show it, and once they've
 * actually signed in, carry on with what they originally clicked."
 * Without this, Login's own post-auth behavior (navigate to profile)
 * would always win, silently dropping the caller's real intent. A caller
 * that wants that continuation uses openWithPendingAction(); Login
 * consumes it once, at the moment auth actually succeeds, and only falls
 * back to its own default (navigate to profile) when nothing is pending —
 * so a plain "sign in from the avatar" flow is completely unaffected.
 */
@Injectable({ providedIn: 'root' })
export class AuthModalService {
  readonly isOpen = signal(false);
  private pendingAction: (() => void) | null = null;

  open(): void {
    this.isOpen.set(true);
  }

  openWithPendingAction(action: () => void): void {
    this.pendingAction = action;
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }

  /** Called once, at the moment auth succeeds. Returns and clears
   *  whatever action was pending, or null if the modal was opened plainly. */
  consumePendingAction(): (() => void) | null {
    const action = this.pendingAction;
    this.pendingAction = null;
    return action;
  }
}
