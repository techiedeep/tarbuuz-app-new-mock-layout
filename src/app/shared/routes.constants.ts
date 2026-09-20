/**
 * Centralized route path constants — the single source of truth for every
 * internal destination in the app.
 *
 * Before this file existed, the same path strings ('/kitchen-lab', '/pricing',
 * etc.) were duplicated as raw literals across header.ts, footer.ts, home.ts,
 * and app.routes.ts independently. Nothing tied those copies together —
 * TypeScript has no way to know that four separate string literals are
 * "supposed" to stay in sync. Renaming a route meant hunting down every
 * place it was typed out by hand; missing one wouldn't cause a compile
 * error, it would just silently produce a dead link that only a human (or
 * a user) would ever notice.
 *
 * Every file that links to or registers one of these routes should import
 * from here rather than typing the path directly.
 */
export const ROUTE_PATHS = {
  home: '/',
  events: '/events',
  createEvent: '/create-event',
  buuz: '/buuz',
  buuzCheckout: '/buuz/checkout',
  kitchenLab: '/kitchen-lab',
  adminDashboard: '/admin',
  supplierMarketplace: '/marketplace',
  about: '/about',
  ourStory: '/our-story',
  pricing: '/pricing',
  careers: '/careers',
  blog: '/blog',
  contact: '/contact',
  privacy: '/privacy',
  terms: '/terms',
  cookies: '/cookies',
} as const;
