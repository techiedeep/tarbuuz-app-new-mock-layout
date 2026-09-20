/**
 * Auth models — request/response shapes for the email+OTP login flow and
 * role-based registration flow.
 *
 * These are shared by both the real (HTTP) and mock (localStorage-backed)
 * implementations of AuthApi, so a component talking to either one sees
 * exactly the same shapes either way.
 */

// 'admin' isn't offered anywhere in the registration flow (Login's role
// picker only lets someone choose from the other four) - it exists purely
// as a value AuthSession.roles/activeRole can hold for an account that
// was seeded directly as an admin (see public/mock-data/users.json's
// admin@tarbuuz.com record), the same way a real backend would issue an
// admin account out-of-band rather than through public self-signup.
export type UserRole = 'foodie' | 'chef' | 'supplier' | 'venue' | 'admin';

export interface LoginEmailRequest {
  readonly email: string;
}

export interface LoginEmailResponse {
  readonly codeSent: boolean;
}

export interface LoginVerifyRequest {
  readonly email: string;
  readonly code: string;
}

export interface AuthSession {
  readonly userId: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly roles: readonly UserRole[];
  // Which of `roles` the account is currently operating as - distinct from
  // "which roles exist on this account at all". Defaults to roles[0] for
  // any session that predates this field (see MockAuthService.toSession).
  readonly activeRole: UserRole;
  readonly authenticated: true;
}

export interface RegisterRequest {
  readonly roles: readonly UserRole[];
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
}

export interface RegisterResponse {
  readonly otpSent: boolean;
}

export interface RegisterVerifyRequest {
  readonly email: string;
  readonly otpCode: string;
}

export interface ApiFieldErrors {
  readonly [fieldName: string]: string;
}

export interface ApiError {
  readonly message: string;
  readonly fieldErrors?: ApiFieldErrors;
}

/**
 * The record shape held in the mock "database" (seeded from
 * assets/mock-data/users.json, persisted at runtime to localStorage).
 * Deliberately separate from AuthSession — a session is "who's logged in
 * right now"; a stored user is a full account record, including data no
 * session object should be carrying around (e.g. verification state).
 */
export interface MockUser {
  readonly userId: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly roles: readonly UserRole[];
  /** Registration isn't considered complete until the OTP step succeeds —
   *  an unverified record can exist (someone abandoned registration
   *  mid-flow) but shouldn't be usable to log in. */
  readonly verified: boolean;
}

// ────────────────────────────────────────────────────────────────────────
// Real backend DTOs (from the uploaded auth model contract) — added for
// completeness, not force-integrated into the working mock pipeline above.
//
// Two deliberate, significant differences from this app's working types:
//  - This app's auth flow is entirely passwordless (email + OTP only —
//    the login modal never has a password field). The real RegisterRequest
//    requires a password. Renamed to RegisterRequestDTO to avoid a name
//    collision with the working RegisterRequest above, rather than force
//    a password field into a UI that was deliberately built without one.
//  - ProfileType/RoleName use an UPPERCASE, prefixed convention
//    (FOODIE, ROLE_FOODIE) versus this app's working UserRole union
//    (lowercase: 'foodie'). UserRole is compared against directly in
//    ~8 places across MockUserStoreService, all three profile services,
//    and Login's role-selection/routing logic — swapping the casing
//    convention would touch every one of those call sites for a pure
//    string-format change with no functional benefit, so UserRole stays
//    as the working type and ProfileType/RoleName are kept available
//    alongside it rather than replacing it.
// ────────────────────────────────────────────────────────────────────────

export enum ProfileType {
  CHEF = 'CHEF',
  VENUE = 'VENUE',
  SUPPLIER = 'SUPPLIER',
  FOODIE = 'FOODIE',
  FOOD_ENTHUSIAST = 'FOOD_ENTHUSIAST',
  ADMIN = 'ADMIN',
}

export const allProfileTypes: ProfileType[] = [ProfileType.VENUE, ProfileType.SUPPLIER, ProfileType.FOODIE];

export const PROFILE_TYPE_DISPLAY_NAME: Record<string, string> = {
  [ProfileType.FOODIE]: 'Foodie/Enthusiast Profile',
  [ProfileType.FOOD_ENTHUSIAST]: 'Foodie/Enthusiast Profile',
  [ProfileType.VENUE]: 'Venue Profile',
  [ProfileType.SUPPLIER]: 'Supplier Profile',
  [ProfileType.CHEF]: 'Chef Profile',
  [ProfileType.ADMIN]: 'Admin Profile',
};

export enum RoleName {
  ROLE_CHEF = 'ROLE_CHEF',
  ROLE_VENUE = 'ROLE_VENUE',
  ROLE_SUPPLIER = 'ROLE_SUPPLIER',
  ROLE_FOODIE = 'ROLE_FOODIE',
  ROLE_ADMIN = 'ROLE_ADMIN',
  ROLE_SUPER_ADMIN = 'ROLE_SUPER_ADMIN',
}

export interface RefreshTokenRequest {
  refreshToken: string;
  email: string;
}

/** The real backend's registration payload — requires a password. See
 *  file-level note on why this app's own passwordless RegisterRequest
 *  is kept as the working type instead. */
export interface RegisterRequestDTO {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  profileType: ProfileType;
  phone?: string;
}

export interface SendLoginOtpRequest {
  email: string;
}

export interface VerifyLoginOtpRequest {
  email: string;
  otpCode: string;
}

export interface VerifyRegistrationRequest {
  email: string;
  otpCode: string;
}

export interface ResendOtpRequest {
  email: string;
  requestType: 'LOGIN' | 'REGISTRATION';
}

export interface MessageResponse {
  message: string;
  success: boolean;
}

export interface AuthResponse {
  user: UserDTO;
  roles: string[];
  profiles: UserProfileDTO[];
  accessToken?: string;
}

export interface UserDTO {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  verified: boolean;
  accountStatus: string;
}

export interface StoredUser extends UserDTO {
  roles: string[];
  profiles: UserProfileDTO[];
}

export interface UserProfileDTO {
  id: string;
  profileType: ProfileType;
  profileId: string;
  isPrimary: boolean;
  isActive?: boolean;
  disabledReason?: string;
  isSuspended?: boolean;
  suspendedAt?: string;
  suspendedReason?: string;
}

export interface Role {
  id: number;
  name: RoleName | 'ROLE_SUPER_ADMIN';
}

export interface AuthState {
  user: StoredUser | null;
  isAuthenticated: boolean;
}

export interface ErrorResponse {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
}
