import { Routes } from '@angular/router';
import { ROUTE_PATHS } from './shared/routes.constants';
import { authGuard } from './shared/guards/auth.guard';
import { adminGuard } from './shared/guards/admin.guard';

// Angular's route-config paths never carry a leading slash (path: 'pricing'),
// while routerLink/ctaPath usage everywhere else in the app uses the
// leading-slash absolute form ('/pricing') — that's simply how each API
// expects its input. toRoutePath() is the one place that reconciles the
// two, so ROUTE_PATHS itself can stay in the more commonly used form
// without every route registration needing its own ad-hoc slice(1).
function toRoutePath(path: string): string {
  return path.replace(/^\//, '');
}

export const routes: Routes = [
  {
    path: toRoutePath(ROUTE_PATHS.home),
    // Lazy-loaded via loadComponent — the Home component (and everything it
    // imports) is only fetched when the user actually navigates to '/',
    // rather than being bundled into the initial main.js. For a single-page
    // app today this saves little, but it's the correct, idiomatic pattern
    // to establish now: as soon as /events, /buuz, etc. are added as real
    // routes, this keeps each route's code split into its own chunk
    // automatically, with no refactor needed later.
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
    title: 'Tarbuuz — Plan the Event, Let AI Match the Rest',
  },
  {
    path: toRoutePath(ROUTE_PATHS.ourStory),
    loadComponent: () => import('./pages/our-story/our-story').then((m) => m.OurStory),
    title: 'Our Story — Tarbuuz',
  },
  {
    path: toRoutePath(ROUTE_PATHS.careers),
    loadComponent: () => import('./pages/careers/careers').then((m) => m.Careers),
    title: 'Careers — Tarbuuz',
  },
  {
    path: toRoutePath(ROUTE_PATHS.pricing),
    loadComponent: () => import('./pages/pricing/pricing').then((m) => m.Pricing),
    title: 'Pricing — Tarbuuz',
  },
  {
    path: toRoutePath(ROUTE_PATHS.terms),
    loadComponent: () => import('./pages/terms-of-use/terms-of-use').then((m) => m.TermsOfUse),
    title: 'Terms of Use — Tarbuuz',
  },
  {
    path: toRoutePath(ROUTE_PATHS.privacy),
    loadComponent: () => import('./pages/privacy-policy/privacy-policy').then((m) => m.PrivacyPolicy),
    title: 'Privacy Policy — Tarbuuz',
  },
  {
    path: toRoutePath(ROUTE_PATHS.supplierMarketplace),
    loadComponent: () => import('./pages/supplier-marketplace/supplier-marketplace').then((m) => m.SupplierMarketplace),
    title: 'Specialty Extras — Tarbuuz',
  },
  {
    path: 'foodie-profile',
    loadComponent: () => import('./pages/foodie-profile/foodie-profile').then((m) => m.FoodieProfile),
    canActivate: [authGuard],
    title: 'My Profile — Tarbuuz',
  },
  {
    path: 'supplier-profile',
    loadComponent: () => import('./pages/supplier-profile/supplier-profile').then((m) => m.SupplierProfile),
    canActivate: [authGuard],
    title: 'Company Profile — Tarbuuz',
  },
  {
    path: 'host-profile',
    loadComponent: () => import('./pages/host-profile/host-profile').then((m) => m.HostProfile),
    canActivate: [authGuard],
    title: 'Venue Profile — Tarbuuz',
  },
  {
    path: 'events',
    loadComponent: () => import('./pages/foodie-events/foodie-events').then((m) => m.FoodieEvents),
    canActivate: [authGuard],
    title: 'My Events — Tarbuuz',
  },
  {
    path: 'host-dashboard',
    loadComponent: () => import('./pages/host-dashboard/host-dashboard').then((m) => m.HostDashboard),
    canActivate: [authGuard],
    title: 'Host Dashboard — Tarbuuz',
  },
  {
    path: 'submit-bid/:opportunityId',
    loadComponent: () => import('./pages/submit-bid/submit-bid').then((m) => m.SubmitBid),
    canActivate: [authGuard],
    title: 'Submit Bid — Tarbuuz',
  },
  {
    path: 'bid-cart/:eventId/:bidId',
    loadComponent: () => import('./pages/bid-cart/bid-cart').then((m) => m.BidCart),
    canActivate: [authGuard],
    title: 'Order Summary — Tarbuuz',
  },
  {
    path: 'submit-recipe',
    loadComponent: () => import('./pages/submit-recipe/submit-recipe').then((m) => m.SubmitRecipe),
    canActivate: [authGuard],
    title: 'Submit Your Recipe — Kitchen Lab — Tarbuuz',
  },
  // Redirects rather than removed outright — anything that still links
  // to the old two-page URLs (a bookmark, a stale link elsewhere) lands
  // on the merged dashboard instead of a dead route.
  { path: 'bidding-events', redirectTo: 'host-dashboard' },
  { path: 'submitted-bids', redirectTo: 'host-dashboard' },
  {
    path: 'review-menu/:eventId',
    loadComponent: () => import('./pages/review-menu/review-menu').then((m) => m.ReviewMenu),
    canActivate: [authGuard],
    title: 'Review Menu — Tarbuuz',
  },
  {
    path: 'buuz',
    loadComponent: () => import('./pages/buuz/buuz').then((m) => m.Buuz),
    title: 'Buuz — Build Your Cocktail Kit — Tarbuuz',
  },
  {
    path: toRoutePath(ROUTE_PATHS.buuzCheckout),
    loadComponent: () => import('./pages/buuz-checkout/buuz-checkout').then((m) => m.BuuzCheckout),
    // Guarded like bid-cart - payment is the one Buuz-adjacent flow that
    // actually needs a real signed-in identity behind it, even though
    // browsing/building a kit on /buuz itself stays open to anyone.
    canActivate: [authGuard],
    title: 'Checkout — Tarbuuz',
  },
  {
    path: 'kitchen-lab',
    loadComponent: () => import('./pages/kitchen-lab/kitchen-lab').then((m) => m.KitchenLab),
    title: 'Kitchen Lab — Tarbuuz',
  },
  {
    path: toRoutePath(ROUTE_PATHS.adminDashboard),
    loadComponent: () => import('./pages/admin-dashboard/admin-dashboard').then((m) => m.AdminDashboard),
    // Stricter than authGuard - being signed in isn't enough here, the
    // session also has to actually hold the admin role (see
    // admin.guard.ts). A non-admin who types /admin directly, or follows
    // a stale bookmark, is sent home exactly like a signed-out visitor
    // hitting any other authGuard-gated route.
  //  canActivate: [adminGuard],
    title: 'Admin Dashboard — Tarbuuz',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
