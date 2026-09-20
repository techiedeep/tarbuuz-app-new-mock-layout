import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthApi } from '../services/auth-api';

/**
 * Same shape as authGuard, one check stricter: not just "signed in", but
 * "signed in as an account that actually holds the admin role." Checks
 * the account's full roles array rather than only activeRole - an admin
 * account only ever has the one role in practice (see
 * public/mock-data/users.json's seed record), but roles is the field
 * that actually answers "does this account have admin access at all,"
 * the same way header.ts's Events-link filtering reads roles rather than
 * activeRole for its own access check.
 *
 * A non-admin hitting /admin directly (typed URL, stale bookmark, or the
 * nav link that's never rendered for them in the first place - see
 * header.ts) is redirected home exactly like authGuard's own
 * not-signed-in case, rather than shown any kind of "forbidden" page
 * that would first have to confirm this route even exists.
 */
export const adminGuard: CanActivateFn = () => {
  const authApi = inject(AuthApi);
  const router = inject(Router);

  const session = authApi.currentSession();
  if (session && session.roles.includes('admin')) {
    return true;
  }

  return router.createUrlTree(['/']);
};
