import { UserRole } from '../models/auth.models';

/**
 * The single source of truth for "which profile page does this role land
 * on" — previously duplicated as a private method inside Login (used
 * after registration/login) with UserMenu's goToProfile() hardcoded to
 * /foodie-profile regardless of role, a real bug: a Supplier or Host
 * clicking "My Profile" from the header dropdown was sent to the wrong
 * page entirely. Extracted here so Login and UserMenu can't drift apart
 * on this logic again the way they already had.
 *
 * Takes the account's single active role directly, not its full roles
 * array with a "which one wins" priority order - that was a second,
 * separate bug this replaced: a multi-role account (e.g. Supplier +
 * Foodie) always landed on the same profile page regardless of which
 * one it was actually currently operating as, since the priority order
 * never even looked at activeRole.
 */
export function profileRouteForRole(role: UserRole): string {
  if (role === 'admin') return '/admin';
  if (role === 'supplier') return '/supplier-profile';
  if (role === 'venue') return '/host-profile';
  return '/foodie-profile';
}
