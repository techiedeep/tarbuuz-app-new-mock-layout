import { Component, ElementRef, HostListener, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Login } from '../login/login';
import { AuthApi } from '../../shared/services/auth-api';
import { AuthModalService } from '../../shared/services/auth-modal.service';
import { capitalizeName } from '../../shared/utils/name-format';
import { profileRouteForRole } from '../../shared/utils/role-routing';

/**
 * Self-contained account-access unit: avatar, hover dropdown, and the login
 * modal it opens. Kept separate from Header so Header stays focused on
 * top-level site navigation rather than also owning modal-visibility state
 * for a feature that has nothing to do with routing.
 */
@Component({
  selector: 'app-user-menu',
  standalone: true,
  imports: [Login],
  templateUrl: './user-menu.html',
  styleUrl: './user-menu.scss',
})
export class UserMenu {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly authApi = inject(AuthApi);
  private readonly router = inject(Router);
  private readonly authModalService = inject(AuthModalService);

  // The dropdown's primary open/close behavior is plain CSS :hover (see
  // user-menu.scss) — genuinely mouse-driven, not JS-simulated. This signal
  // only backs the click-to-toggle fallback: touch devices have no real
  // hover state, and click also gives keyboard users a way in.
  readonly menuForcedOpen = signal(false);
  // Backed by the shared service now rather than a local signal, so
  // components with no relationship to UserMenu (Home's "Get Started"
  // CTA) can open this same modal without reaching into UserMenu itself.
  readonly showLoginModal = this.authModalService.isOpen;

  readonly isAuthenticated = this.authApi.isAuthenticated;
  readonly session = this.authApi.currentSession;
  readonly displayName = computed(() => {
    const s = this.session();
    return s ? `${capitalizeName(s.firstName)} ${capitalizeName(s.lastName)}`.trim() : '';
  });
  readonly initials = computed(() => {
    const s = this.session();
    return s ? `${s.firstName.charAt(0)}${s.lastName.charAt(0)}`.toUpperCase() : '';
  });

  // Drives the single "Dashboard" link, keyed to whichever profile the
  // account is currently active as - not "does this account have this
  // role at all". Two independent isFoodie/isHost checks here previously
  // showed a Dashboard link per role an account HAD, so a Foodie+Host
  // account saw two "Dashboard" entries stacked in the same dropdown
  // regardless of which one was actually active. "Dashboard" links to
  // /events for a Foodie, or /host-dashboard for a Host (the merged
  // bidding-opportunities/submitted-bids view). Supplier has no
  // dashboard of its own today, matching what actually exists for that
  // role, so it resolves to null and the button doesn't render at all.
  readonly activeDashboardRoute = computed<string | null>(() => {
    switch (this.session()?.activeRole) {
      case 'foodie':
        return '/events';
      case 'venue':
        return '/host-dashboard';
      default:
        return null;
    }
  });

  toggleMenu(): void {
    this.menuForcedOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuForcedOpen.set(false);
  }

  openLoginModal(): void {
    this.menuForcedOpen.set(false);
    this.authModalService.open();
  }

  closeLoginModal(): void {
    this.authModalService.close();
  }

  goToProfile(): void {
    this.menuForcedOpen.set(false);
    // Previously guessed via a fixed "which role wins" priority order
    // across the whole roles array, regardless of which one the account
    // was actually operating as - a multi-role account (e.g. Supplier +
    // Foodie) always landed on the same profile page every time. Now
    // uses the account's actual active role, same shared logic Login
    // uses after sign-in, so the two can't drift apart on this again.
    const role = this.session()?.activeRole;
    if (!role) return;
    this.router.navigateByUrl(profileRouteForRole(role));
  }

  goToDashboard(): void {
    this.menuForcedOpen.set(false);
    const route = this.activeDashboardRoute();
    if (!route) return;
    this.router.navigateByUrl(route);
  }

  signOut(): void {
    this.menuForcedOpen.set(false);
    this.authApi.signOut();
    this.router.navigateByUrl('/');
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.menuForcedOpen()) return;
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.closeMenu();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.showLoginModal()) {
      this.closeLoginModal();
    } else if (this.menuForcedOpen()) {
      this.closeMenu();
    }
  }
}


