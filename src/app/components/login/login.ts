import { Component, DestroyRef, EventEmitter, Output, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthApi } from '../../shared/services/auth-api';
import { AuthModalService } from '../../shared/services/auth-modal.service';
import { BodyScrollLockService } from '../../shared/services/body-scroll-lock.service';
import { ApiError, UserRole } from '../../shared/models/auth.models';
import { profileRouteForRole } from '../../shared/utils/role-routing';

/** Requires at least one role selected — registrationForm.roles is shaped
 *  as an array for forward-compatibility with multi-role accounts, even
 *  though selection is currently single-select (see selectSingleRole). */
function atLeastOneRoleValidator(): ValidatorFn {
  return (control): ValidationErrors | null => {
    const value = control.value as UserRole[] | null;
    return value && value.length > 0 ? null : { required: true };
  };
}

/** Strips everything but digits and caps at 6 characters — used on every
 *  OTP field so paste, IME input, or a physical keyboard typing letters
 *  can't leave non-numeric characters sitting in a field that's about to
 *  be sent as a verification code. inputmode="numeric" in the template is
 *  only a soft mobile-keyboard hint; it doesn't actually block anything. */
function sanitizeOtpInput(value: string): string {
  return value.replace(/\D/g, '').slice(0, 6);
}

const SIX_DIGIT_CODE = /^\d{6}$/;
const RESEND_COOLDOWN_SECONDS = 30;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly authApi = inject(AuthApi);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authModalService = inject(AuthModalService);
  private readonly bodyScrollLock = inject(BodyScrollLockService);

  // Header/UserMenu mounts and unmounts this component via @if rather
  // than an [open] input toggling internal visibility - so this
  // component's own mount/unmount IS "modal open/closed" here, and the
  // constructor/onDestroy pair below is the correct, only place to hook
  // the lock to. Locked immediately on construction, not e.g. after the
  // form renders, since a user should never get even a brief window
  // where the background is still scrollable while this modal is
  // visible.
  constructor() {
    this.bodyScrollLock.lock();
    this.destroyRef.onDestroy(() => this.bodyScrollLock.unlock());
  }

  /** Header/UserMenu controls this component's presence via @if, so
   *  closing is just "tell the parent to stop rendering me" — no internal
   *  visibility state to keep in sync with the outside world. */
  @Output() readonly close = new EventEmitter<void>();

  // ─────────────────────────── Login (left side) ───────────────────────────
  readonly loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    code: ['', [Validators.pattern(SIX_DIGIT_CODE)]],
  });

  readonly loginStep = signal<'email' | 'code'>('email');
  readonly isLoginSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly registrationErrorMessage = signal<string | null>(null);

  readonly showResendCodeInput = signal(false);
  readonly resendCodeValue = signal('');
  readonly resendCodeError = signal<string | null>(null);

  readonly loginResendCooldown = signal(0);

  readonly buttonText = computed(() =>
    this.isLoginSubmitting() ? 'Please wait…' : this.loginStep() === 'email' ? 'Continue' : 'Verify & Sign-In',
  );

  // ─────────────────────── Registration (right side) ────────────────────────
  readonly registrationForm: FormGroup = this.fb.group({
    roles: [[] as UserRole[], [atLeastOneRoleValidator()]],
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    otpCode: ['', [Validators.pattern(SIX_DIGIT_CODE)]],
  });

  /** Chef is feature-flagged off to match the current three-role design
   *  (Foodie / Supplier / Hosts). Left as a signal rather than deleting the
   *  card outright, since the template's *ngIf="showChefCard" already
   *  supports re-enabling it without a template change. */
  readonly showChefCard = signal(false);

  readonly showRegistrationCode = signal(false);
  readonly isRegistrationSubmitting = signal(false);
  readonly registrationErrorMessages = signal<Record<string, string>>({});
  readonly registrationResendCooldown = signal(0);

  readonly registrationButtonText = computed(() =>
    this.isRegistrationSubmitting()
      ? 'Please wait…'
      : this.showRegistrationCode()
        ? 'Verify & Create Account'
        : 'Create Account',
  );

  onClose(): void {
    this.close.emit();
  }

  // Terms of Use / Privacy Notice inside this modal need to navigate
  // away entirely, not just close - but since this component is only
  // ever unmounted by its parent (Header/UserMenu) reacting to the
  // close output, navigating without emitting it first would leave this
  // modal mounted (and, since the scroll lock added earlier releases in
  // ngOnDestroy, still holding the page's scroll lock) on top of
  // whatever page navigateByUrl lands on. Closing first, same as
  // clicking the X, is what makes navigating away from here behave the
  // same as navigating away from anywhere else.
  navigateAndScrollToTop(path: string): void {
    this.onClose();
    this.router.navigateByUrl(path).then(() => window.scrollTo(0, 0));
  }

  /**
   * Routes to whichever profile page actually exists for this account's
   * role. Supplier and Host (stored as 'venue') both take priority over
   * Foodie if someone somehow holds multiple roles, checked in a fixed
   * order rather than roles[0] — same reasoning as createProfileForRole
   * on the mock service side.
   */
  private navigateToProfile(activeRole: UserRole): void {
    // A caller that opened this modal via openWithPendingAction() (Header's
    // "Event" link, wanting Create Event to open once sign-in actually
    // succeeds) gets that action instead of the default profile
    // navigation. Ordinary sign-in — the avatar dropdown, Home's "Get
    // Started" when logged out — never sets a pending action, so this
    // resolves to null there and behaves exactly as before.
    const pending = this.authModalService.consumePendingAction();
    if (pending) {
      pending();
      return;
    }
    this.router.navigateByUrl(profileRouteForRole(activeRole));
  }

  // ─────────────────────────────── Login flow ────────────────────────────────

  onLoginEmailInput(): void {
    this.errorMessage.set(null);
  }

  onLoginCodeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const clean = sanitizeOtpInput(input.value);
    input.value = clean; // reflect the stripped value in the field itself, not just the form model
    this.loginForm.get('code')?.setValue(clean);
  }

  continueWithEmailLogin(): void {
    const emailControl = this.loginForm.get('email');
    emailControl?.markAsTouched();
    if (emailControl?.invalid) return;

    if (this.loginStep() === 'code') {
      this.submitLoginCode();
      return;
    }

    this.isLoginSubmitting.set(true);
    this.errorMessage.set(null);
    this.authApi
      .sendLoginCode(emailControl!.value)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isLoginSubmitting.set(false);
          this.loginStep.set('code');
          this.successMessage.set('Login code sent to your email. Please check your inbox.');
        },
        error: (err: ApiError) => {
          this.isLoginSubmitting.set(false);
          this.errorMessage.set(err.message);
        },
      });
  }

  private submitLoginCode(): void {
    const email = this.loginForm.get('email')?.value;
    const code = this.loginForm.get('code')?.value;
    if (!SIX_DIGIT_CODE.test(code ?? '')) {
      this.loginForm.get('code')?.markAsTouched();
      return;
    }

    this.isLoginSubmitting.set(true);
    this.errorMessage.set(null);
    this.authApi
      .verifyLoginCode(email, code)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (session) => {
          this.isLoginSubmitting.set(false);
          this.successMessage.set('Signed in successfully.');
          this.close.emit();
          this.navigateToProfile(session.activeRole);
        },
        error: (err: ApiError) => {
          this.isLoginSubmitting.set(false);
          this.errorMessage.set(err.message);
        },
      });
  }

  onResendLoginCode(event: Event): void {
    event.preventDefault();
    if (this.loginResendCooldown() > 0) return;

    const email = this.loginForm.get('email')?.value;
    this.authApi
      .resendLoginCode(email)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.successMessage.set('A new code has been sent.');
          this.startCooldown(this.loginResendCooldown);
        },
        error: (err: ApiError) => this.errorMessage.set(err.message),
      });
  }

  /** Handles the specific case where a login attempt fails because the
   *  account's registration was never completed — offers to resend that
   *  original verification code inline, right where the error appeared,
   *  rather than sending the person back through registration from scratch. */
  onResendRegistrationFromLogin(event: Event): void {
    event.preventDefault();
    const email = this.loginForm.get('email')?.value;
    this.authApi
      .resendRegistrationCode(email)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.showResendCodeInput.set(true),
        error: (err: ApiError) => this.errorMessage.set(err.message),
      });
  }

  onResendCodeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const clean = sanitizeOtpInput(input.value);
    input.value = clean;
    this.resendCodeValue.set(clean);
    this.resendCodeError.set(null);
  }

  validateRegistrationAndLogin(email: string, code: string): void {
    if (!SIX_DIGIT_CODE.test(code)) {
      this.resendCodeError.set('Enter the 6-digit code from your email.');
      return;
    }
    this.isLoginSubmitting.set(true);
    this.authApi
      .verifyRegistrationOtp(email, code)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (session) => {
          this.isLoginSubmitting.set(false);
          this.close.emit();
          this.navigateToProfile(session.activeRole);
        },
        error: (err: ApiError) => {
          this.isLoginSubmitting.set(false);
          this.resendCodeError.set(err.message);
        },
      });
  }

  // ─────────────────────────── Registration flow ─────────────────────────────

  selectSingleRole(role: UserRole): void {
    // Stored as a single-item array rather than a scalar — keeps the field
    // shape forward-compatible with multi-role accounts without a form
    // migration later, even though today's UI only ever selects one.
    this.registrationForm.get('roles')?.setValue([role]);
    this.registrationForm.get('roles')?.markAsTouched();
  }

  onRegistrationFirstNameInput(): void {
    this.clearFieldError('firstName');
  }

  onRegistrationLastNameInput(): void {
    this.clearFieldError('lastName');
  }

  onRegistrationEmailInput(): void {
    this.clearFieldError('email');
  }

  private clearFieldError(field: string): void {
    if (!(field in this.registrationErrorMessages())) return;
    const next = { ...this.registrationErrorMessages() };
    delete next[field];
    this.registrationErrorMessages.set(next);
  }

  onRegistrationOtpInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const clean = sanitizeOtpInput(input.value);
    input.value = clean;
    this.registrationForm.get('otpCode')?.setValue(clean);
  }

  completeRegistration(): void {
    this.registrationForm.markAllAsTouched();
    if (this.registrationForm.invalid) return;

    const { roles, firstName, lastName, email } = this.registrationForm.value;
    this.isRegistrationSubmitting.set(true);
    this.registrationErrorMessages.set({});

    this.authApi
      .register({ roles, firstName, lastName, email })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isRegistrationSubmitting.set(false);
          this.showRegistrationCode.set(true);
        },
        error: (err: ApiError) => {
          this.isRegistrationSubmitting.set(false);
          this.registrationErrorMessages.set(err.fieldErrors ?? { form: err.message });
        },
      });
  }

  verifyRegistrationOtp(): void {
    const email = this.registrationForm.get('email')?.value;
    const otpCode = this.registrationForm.get('otpCode')?.value;
    if (!SIX_DIGIT_CODE.test(otpCode ?? '')) {
      this.registrationForm.get('otpCode')?.markAsTouched();
      return;
    }

    this.isRegistrationSubmitting.set(true);
    this.authApi
      .verifyRegistrationOtp(email, otpCode)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (session) => {
          this.isRegistrationSubmitting.set(false);
          this.close.emit();
          this.navigateToProfile(session.activeRole);
        },
        error: (err: ApiError) => {
          this.isRegistrationSubmitting.set(false);
          this.registrationErrorMessages.set({ form: err.message });
        },
      });
  }

  onResendRegistrationCode(event: Event): void {
    event.preventDefault();
    if (this.registrationResendCooldown() > 0) return;

    const email = this.registrationForm.get('email')?.value;
    this.authApi
      .resendRegistrationCode(email)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.startCooldown(this.registrationResendCooldown),
        error: (err: ApiError) => this.registrationErrorMessages.set({ form: err.message }),
      });
  }

  /** Client-side cooldown on resend actions — not a substitute for real
   *  server-side rate limiting, but it stops an impatient double-click from
   *  firing two OTP sends and confusing the person about which code is
   *  actually current. */
  private startCooldown(target: ReturnType<typeof signal<number>>): void {
    target.set(RESEND_COOLDOWN_SECONDS);
    const intervalId = setInterval(() => {
      const next = target() - 1;
      target.set(next);
      if (next <= 0) clearInterval(intervalId);
    }, 1000);
    this.destroyRef.onDestroy(() => clearInterval(intervalId));
  }
}
