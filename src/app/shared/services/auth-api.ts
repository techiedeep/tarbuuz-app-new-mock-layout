import { Observable } from 'rxjs';
import {
  AuthSession,
  LoginEmailResponse,
  RegisterRequest,
  RegisterResponse,
  UserRole,
} from '../models/auth.models';

/**
 * The contract every auth backend — mock or real — must satisfy. Components
 * (Login, UserMenu) depend on this abstract class, never on a concrete
 * implementation, so swapping MockAuthService for a real HTTP-backed
 * AuthService later is a one-line change in app.config.ts's providers, with
 * zero changes to any component.
 *
 * Using an abstract class rather than a plain interface is deliberate:
 * TypeScript interfaces disappear at compile time and can't be used as an
 * Angular DI token, but an abstract class can — this is the standard
 * Angular pattern for "depend on an abstraction" DI.
 */
export abstract class AuthApi {
  abstract readonly isAuthenticated: () => boolean;
  abstract readonly currentSession: () => AuthSession | null;

  abstract sendLoginCode(email: string): Observable<LoginEmailResponse>;
  abstract verifyLoginCode(email: string, code: string): Observable<AuthSession>;
  abstract resendLoginCode(email: string): Observable<LoginEmailResponse>;

  abstract register(payload: RegisterRequest): Observable<RegisterResponse>;
  abstract verifyRegistrationOtp(email: string, otpCode: string): Observable<AuthSession>;
  abstract resendRegistrationCode(email: string): Observable<RegisterResponse>;

  // Adds a role the account doesn't already have (creating its profile
  // record) and makes it the active one - "enabling" a brand-new profile
  // type. switchActiveRole, by contrast, only moves between roles the
  // account already has; it never creates anything.
  abstract enableRole(role: UserRole): Observable<AuthSession>;
  abstract switchActiveRole(role: UserRole): void;

  abstract signOut(): void;
}
