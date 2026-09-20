import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthApi } from '../services/auth-api';

/**
 * Functional guard (the modern Angular pattern, replacing class-based
 * CanActivate) — redirects to home if nobody's signed in rather than
 * rendering a profile page with no session behind it. Doesn't attempt to
 * reopen the login modal on redirect; that's a reasonable follow-up but
 * wasn't part of what was asked for here.
 */
export const authGuard: CanActivateFn = () => {
  const authApi = inject(AuthApi);
  const router = inject(Router);

  if (authApi.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/']);
};
