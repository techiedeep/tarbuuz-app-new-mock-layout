import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, delay, map, of, switchMap, throwError } from 'rxjs';
import { AuthApi } from './auth-api';
import { MockUserStoreService } from './mock-user-store.service';
import { FoodieProfileService } from './foodie-profile.service';
import { SupplierProfileService } from './supplier-profile.service';
import { HostProfileService } from './host-profile.service';
import {
  ApiError,
  AuthSession,
  LoginEmailResponse,
  MockUser,
  RegisterRequest,
  RegisterResponse,
  UserRole,
} from '../models/auth.models';

/**
 * Standing in for a real backend until one exists. Every method matches
 * AuthApi exactly, so this is a drop-in for the real HTTP-backed
 * implementation later — swap the provider in app.config.ts, delete this
 * file, done.
 *
 * The OTP step can't send a real email here, so it accepts one fixed demo
 * code for every account: 123456. That's intentionally not a secret buried
 * in a random generator — a mock auth layer whose "verification" can't
 * actually be completed by anyone testing it isn't useful as a mock.
 */
const DEMO_OTP = '123456';
/** Small artificial delay so loading states are actually visible/testable
 *  in the UI, rather than every mock call resolving in the same tick a real
 *  network call never would. */
const SIMULATED_LATENCY_MS = 400;
const SESSION_STORAGE_KEY = 'tarbuuz_mock_session';

@Injectable({ providedIn: 'root' })
export class MockAuthService implements AuthApi {
  private readonly userStore = inject(MockUserStoreService);
  private readonly foodieProfileService = inject(FoodieProfileService);
  private readonly supplierProfileService = inject(SupplierProfileService);
  private readonly hostProfileService = inject(HostProfileService);

  // Rehydrated synchronously from localStorage at construction — not
  // async. authGuard calls isAuthenticated() the instant a route resolves;
  // if this session were restored via an Observable (e.g. re-fetching the
  // user record), there'd be a real race where the guard checks before
  // rehydration finishes and wrongly bounces an already-logged-in user
  // back to the homepage. Confirmed this exact failure mode directly:
  // navigating straight to a protected route (or simply reloading the
  // page) silently logged the user out even though their account data was
  // still sitting in localStorage the whole time. AuthSession was already
  // deliberately kept free of tokens/secrets, so storing it directly here
  // isn't a new exposure — it's the same non-sensitive identity claim a
  // decoded JWT would give you without a server round-trip.
  private readonly _session = signal<AuthSession | null>(this.readSessionFromStorage());
  readonly isAuthenticated = computed(() => this._session() !== null);
  readonly currentSession = computed(() => this._session());

  sendLoginCode(email: string): Observable<LoginEmailResponse> {
    return this.userStore.findByEmail(email).pipe(
      delay(SIMULATED_LATENCY_MS),
      switchMap((user) => {
        if (!user) {
          return this.fail<LoginEmailResponse>('No account found with that email. Create one to get started.');
        }
        if (!user.verified) {
          // Deliberately includes the literal phrase "verify your email" —
          // the real login.component.html branches its "Resend Code" link
          // on errorMessage containing exactly that phrase.
          return this.fail<LoginEmailResponse>('Please verify your email to continue. A code was sent when you registered.');
        }
        // Nothing to actually send in a mock layer — the fixed DEMO_OTP is
        // always valid — but the codeSent:true response is what the
        // component uses to advance to the code-entry step.
        return of<LoginEmailResponse>({ codeSent: true });
      }),
    );
  }

  verifyLoginCode(email: string, code: string): Observable<AuthSession> {
    if (code !== DEMO_OTP) {
      return this.fail<AuthSession>('That code doesn\u2019t look right. Double-check the 6 digits and try again.');
    }
    return this.userStore.findByEmail(email).pipe(
      delay(SIMULATED_LATENCY_MS),
      switchMap((user) => {
        if (!user) return this.fail<AuthSession>('No account found with that email.');
        return of(this.toSession(user));
      }),
      map((session) => {
        this.setSession(session);
        return session;
      }),
    );
  }

  resendLoginCode(_email: string): Observable<LoginEmailResponse> {
    return of<LoginEmailResponse>({ codeSent: true }).pipe(delay(SIMULATED_LATENCY_MS));
  }

  register(payload: RegisterRequest): Observable<RegisterResponse> {
    return this.userStore.findByEmail(payload.email).pipe(
      delay(SIMULATED_LATENCY_MS),
      switchMap((existing) => {
        if (existing) {
          return this.fail<RegisterResponse>('An account with this email already exists. Try signing in instead.', {
            email: 'This email is already registered.',
          });
        }

        const newUser: MockUser = {
          userId: this.generateUserId(),
          email: payload.email.trim().toLowerCase(),
          firstName: payload.firstName,
          lastName: payload.lastName,
          roles: payload.roles,
          verified: false,
        };

        return this.userStore.addUser(newUser).pipe(
          switchMap((user) => this.createProfileForRole(user, payload.roles[0])),
          map(() => ({ otpSent: true }) as RegisterResponse),
        );
      }),
    );
  }

  /**
   * Registration only ever collects one role today (selectSingleRole in
   * the Login component), but roles is still an array — so this checks
   * membership rather than assuming roles[0]. 'venue' is the stored role
   * value for what the UI calls "Hosts" — matches the role card in the
   * registration form exactly. Also reused by enableRole() for a role
   * being added after the fact, hence the explicit `role` parameter
   * rather than deriving it from user.roles.
   */
  private createProfileForRole(user: MockUser, role: UserRole): Observable<unknown> {
    const initialInfo = { firstName: user.firstName, lastName: user.lastName, email: user.email };
    if (role === 'supplier') {
      return this.supplierProfileService.createProfileFor(user.userId, initialInfo);
    }
    if (role === 'venue') {
      return this.hostProfileService.createProfileFor(user.userId, initialInfo);
    }
    if (role === 'foodie') {
      return this.foodieProfileService.createProfileFor(user.userId, initialInfo);
    }
    return of(undefined);
  }

  verifyRegistrationOtp(email: string, otpCode: string): Observable<AuthSession> {
    if (otpCode !== DEMO_OTP) {
      return this.fail<AuthSession>('That code doesn\u2019t look right. Double-check the 6 digits and try again.');
    }
    return this.userStore.findByEmail(email).pipe(
      delay(SIMULATED_LATENCY_MS),
      switchMap((user) => {
        if (!user) return this.fail<MockUser | undefined>('No pending registration found for that email.');
        return this.userStore.updateUser(user.userId, { verified: true });
      }),
      switchMap((updated) => {
        if (!updated) return this.fail<AuthSession>('Something went wrong completing registration.');
        return of(this.toSession(updated));
      }),
      map((session) => {
        this.setSession(session);
        return session;
      }),
    );
  }

  resendRegistrationCode(_email: string): Observable<RegisterResponse> {
    return of<RegisterResponse>({ otpSent: true }).pipe(delay(SIMULATED_LATENCY_MS));
  }

  enableRole(role: UserRole): Observable<AuthSession> {
    const current = this._session();
    if (!current) {
      return this.fail<AuthSession>('You need to be signed in to enable a profile.');
    }
    if (current.roles.includes(role)) {
      // Already has it - enabling is a no-op, just make it active. Kept
      // as its own branch rather than folded into the "add it" path
      // below, since there's no user record to fetch-then-update for a
      // role that's already there.
      this.switchActiveRole(role);
      return of(this._session()!);
    }
    return this.userStore.findByEmail(current.email).pipe(
      delay(SIMULATED_LATENCY_MS),
      switchMap((user) => {
        if (!user) return this.fail<MockUser | undefined>('Account not found.');
        const updatedRoles = [...user.roles, role];
        return this.createProfileForRole(user, role).pipe(
          switchMap(() => this.userStore.updateUser(user.userId, { roles: updatedRoles })),
        );
      }),
      map((updated) => {
        if (!updated) throw new Error('Something went wrong enabling that profile.');
        // toSession() always resets activeRole to the account's primary
        // role (correct for login, where it's called from too) - so it
        // has to be overridden here to the role just enabled, or
        // enabling a new profile would never actually make it active.
        const session: AuthSession = { ...this.toSession(updated), activeRole: role };
        this.setSession(session);
        return session;
      }),
    );
  }

  // Synchronous and local-only, unlike enableRole - switching between
  // roles the account already has doesn't touch profile records at all,
  // so there's no real async work to represent with an Observable; kept
  // as a plain method rather than one that always resolves instantly
  // for consistency's sake.
  switchActiveRole(role: UserRole): void {
    const current = this._session();
    if (!current || !current.roles.includes(role)) return; // Can't switch to a role you don't have - use enableRole for that.
    const updated: AuthSession = { ...current, activeRole: role };
    this.setSession(updated);
  }

  signOut(): void {
    this._session.set(null);
    this.clearSessionFromStorage();
  }

  private setSession(session: AuthSession): void {
    this._session.set(session);
    this.writeSessionToStorage(session);
  }

  private readSessionFromStorage(): AuthSession | null {
    try {
      const raw = localStorage.getItem(SESSION_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as AuthSession) : null;
    } catch {
      return null;
    }
  }

  private writeSessionToStorage(session: AuthSession): void {
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch {
      // Same reasoning as every other mock store in this app — a failed
      // write shouldn't block the in-memory session the user is actively
      // using this tab, it just won't survive a reload.
    }
  }

  private clearSessionFromStorage(): void {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // Nothing meaningful to recover from here either.
    }
  }

  private toSession(user: MockUser): AuthSession {
    return {
      userId: user.userId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles,
      // Always the primary role (roles[0], the one originally registered
      // with) - never a role carried over from switching in a previous
      // session. Confirmed against the old UI's own design: isPrimary was
      // a fixed property on the profile record that never moved when you
      // switched; switching only ever changed that session's
      // currentProfileType. A user logging in with Host credentials
      // should land on Host, full stop - not wherever they last happened
      // to switch to before signing out.
      activeRole: user.roles[0],
      authenticated: true,
    };
  }

 private generateUserId(): string {
  return `user-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

  private fail<T>(message: string, fieldErrors?: Record<string, string>): Observable<T> {
    const error: ApiError = { message, fieldErrors };
    return throwError(() => error).pipe(delay(SIMULATED_LATENCY_MS));
  }
}
