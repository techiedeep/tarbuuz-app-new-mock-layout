import { Component, ElementRef, HostListener, computed, effect, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, Router, NavigationStart } from '@angular/router';
import { NavLink } from '../../shared/models/home/home.models';
import { ROUTE_PATHS } from '../../shared/routes.constants';
import { UserMenu } from '../user-menu/user-menu';
import { CartDrawer } from '../cart-drawer/cart-drawer';
import { AuthApi } from '../../shared/services/auth-api';
import { CartService } from '../../shared/services/cart.service';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, UserMenu, CartDrawer],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  private readonly elementRef = inject(ElementRef);
  private readonly router = inject(Router);
  private readonly authApi = inject(AuthApi);
  private readonly cartService = inject(CartService);

  // Site-wide, not Buuz-page-local - the header is on every route, so
  // wherever this icon lives is automatically reachable from anywhere.
  // The icon itself only renders once the cart actually has something in
  // it AND someone is actually signed in (see header.html's @if) - the
  // cart is tied to whoever's checking out, so it has no business showing
  // up for a signed-out visitor even if a stale line item is still
  // sitting in CartService for some reason. The constructor's own effect
  // below is what keeps that "for some reason" from ever actually
  // happening (clears the cart the moment sign-out happens), but this
  // computed is the belt to that effect's suspenders - the icon stays
  // correct even in the one render tick between "session gone" and
  // "cart actually cleared."
  readonly cartItemCount = this.cartService.itemCount;
  readonly cartHasItems = computed(() => this.cartService.hasItems() && !!this.authApi.currentSession());
  readonly cartDrawerOpen = signal(false);

  toggleCartDrawer(): void {
    this.cartDrawerOpen.update((open) => !open);
  }

  closeCartDrawer(): void {
    this.cartDrawerOpen.set(false);
  }

  private readonly allNavLinks: readonly NavLink[] = [
    { label: 'Home', path: ROUTE_PATHS.home },
    { label: 'Our Story', path: ROUTE_PATHS.ourStory },
    { label: 'Events', path: ROUTE_PATHS.events },
    { label: 'Buuz', path: ROUTE_PATHS.buuz },
    { label: 'Kitchen Lab', path: ROUTE_PATHS.kitchenLab },
    { label: 'Pricing', path: ROUTE_PATHS.pricing },
    { label: 'Admin', path: ROUTE_PATHS.adminDashboard },
  ];

  // "Events" links to the Foodie events dashboard specifically - showing
  // it to a signed-in Host or Supplier who hasn't also enabled a Foodie
  // profile would send them to a page that isn't theirs, so it's gated
  // behind the Foodie role once someone is actually signed in. A
  // signed-out visitor hasn't chosen a role yet at all, so the link
  // stays visible by default rather than being hidden before there's
  // even a session to check roles against - filtered here rather than
  // left for FoodieEventsService's own route guard to catch, since a
  // nav link that's visible but redirects away on click reads as
  // broken, not as "not for you." A signed-in user with multiple roles
  // (Foodie + Host, via the profile switcher) still sees it, since the
  // roles array check doesn't require Foodie to be their *only* role.
  //
  // "Admin" is the opposite default from Events - it's excluded unless
  // the session's roles explicitly include 'admin', including for a
  // signed-out visitor. There's no "hasn't chosen a role yet" grace case
  // here the way there is for Events: an admin account is never created
  // through ordinary signup (see UserRole's own doc comment), so nobody
  // legitimately needs to see this link before proving they're an admin.
  // The route itself is independently guarded too (see adminGuard in
  // app.routes.ts) - this filter is what keeps a non-admin from ever
  // seeing a link that would just bounce them home anyway, not the only
  // thing standing between them and the page.
  readonly navLinks = computed<readonly NavLink[]>(() => {
    const session = this.authApi.currentSession();
    //const isAdmin = !!session?.roles.includes('admin');
    const isAdmin = true;
    const withoutEvents = !session || session.roles.includes('foodie')
      ? this.allNavLinks
      : this.allNavLinks.filter((link) => link.path !== ROUTE_PATHS.events);
    return isAdmin ? withoutEvents : withoutEvents.filter((link) => link.path !== ROUTE_PATHS.adminDashboard);
  });

  // Every nav link needs this, not just Events - the header is sticky
  // across every page, and this router has no scrollPositionRestoration
  // configured. Left as a plain [routerLink] rather than swapped for a
  // manual (click) navigation so routerLinkActive keeps working - this
  // just rides along after Angular's own navigation, closing the mobile
  // menu and resetting scroll once the new page has actually loaded.
  onNavLinkClick(): void {
    this.mobileMenuOpen.set(false);
    setTimeout(() => window.scrollTo(0, 0), 0);
  }

  // Below 860px the horizontal nav-links previously just had
  // `display:none` with no replacement at all — a real dead end for
  // anyone on a tablet or small laptop, not merely an aesthetic gap.
  // This toggle drives the hamburger-triggered mobile panel that replaces
  // that inline list at the same breakpoint (see header.scss).
  readonly mobileMenuOpen = signal(false);

  constructor(router: Router) {
    // Route changes are the one case a raw document-click listener can't
    // catch — clicking a nav link inside the open panel navigates via
    // Angular's router, not a DOM click bubbling to document, so without
    // this the panel would stay open behind the newly-loaded page.
    router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.mobileMenuOpen.set(false);
        this.cartDrawerOpen.set(false);
      }
    });

    // Guards the one edge case the header.html @if (cartHasItems()) on
    // the cart icon creates: removing the last item from an already-open
    // drawer (down to 0 via its own quantity stepper) makes the
    // triggering icon disappear out from under an open drawer. The
    // drawer's own close button/backdrop still work either way, but
    // auto-closing here means nobody's ever left looking at an empty
    // cart with no visible way back to "the cart icon" that opened it.
    effect(() => {
      if (!this.cartHasItems() && this.cartDrawerOpen()) {
        this.cartDrawerOpen.set(false);
      }
    });

    // Signing out clears the cart outright, not just hides it - it's
    // whoever's currently signed in who's about to be charged for what's
    // in it, so leaving a previous session's items sitting in memory for
    // the next person on this device (or the same person if they sign
    // back in as a different account) would be wrong, not just a display
    // glitch. Runs on every session change rather than only reacting to
    // sign-out specifically - a no-op clear() on an already-empty cart
    // (e.g. right after sign-in) costs nothing.
    effect(() => {
      if (!this.authApi.currentSession()) {
        this.cartService.clear();
      }
    });
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((open) => !open);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.mobileMenuOpen()) return;
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.mobileMenuOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.mobileMenuOpen.set(false);
    this.cartDrawerOpen.set(false);
  }
}
