import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthApi } from './auth-api';
import {
  AuthSession,
  ApiError,
  LoginEmailRequest,
  LoginEmailResponse,
  LoginVerifyRequest,
  RegisterRequest,
  RegisterResponse,
  RegisterVerifyRequest,
  UserRole,
} from '../models/auth.models';

/**
 * The REAL implementation of AuthApi, for once a backend exists — not
 * currently provided anywhere (see app.config.ts, which provides
 * MockAuthService instead). Swapping to this is a one-line change in that
 * providers array once the endpoints below are confirmed against the
 * actual backend contract; nothing here has been exercised against a real
 * server yet.
 */
@Injectable({ providedIn: 'root' })
export class AuthService implements AuthApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/auth`;

  private readonly _session = signal<AuthSession | null>(null);
  readonly currentSession = computed(() => this._session());
  readonly isAuthenticated = computed(() => this._session() !== null);

  sendLoginCode(email: string): Observable<LoginEmailResponse> {
    const body: LoginEmailRequest = { email };
    return this.http
      .post<LoginEmailResponse>(`${this.baseUrl}/login/email`, body)
      .pipe(catchError((err) => this.normalizeError(err)));
  }

  verifyLoginCode(email: string, code: string): Observable<AuthSession> {
    const body: LoginVerifyRequest = { email, code };
    return this.http.post<AuthSession>(`${this.baseUrl}/login/verify`, body).pipe(
      tap((session) => this._session.set(session)),
      catchError((err) => this.normalizeError(err)),
    );
  }

  resendLoginCode(email: string): Observable<LoginEmailResponse> {
    const body: LoginEmailRequest = { email };
    return this.http
      .post<LoginEmailResponse>(`${this.baseUrl}/login/resend`, body)
      .pipe(catchError((err) => this.normalizeError(err)));
  }

  register(payload: RegisterRequest): Observable<RegisterResponse> {
    return this.http
      .post<RegisterResponse>(`${this.baseUrl}/register`, payload)
      .pipe(catchError((err) => this.normalizeError(err)));
  }

  verifyRegistrationOtp(email: string, otpCode: string): Observable<AuthSession> {
    const body: RegisterVerifyRequest = { email, otpCode };
    return this.http.post<AuthSession>(`${this.baseUrl}/register/verify`, body).pipe(
      tap((session) => this._session.set(session)),
      catchError((err) => this.normalizeError(err)),
    );
  }

  resendRegistrationCode(email: string): Observable<RegisterResponse> {
    const body: LoginEmailRequest = { email };
    return this.http
      .post<RegisterResponse>(`${this.baseUrl}/register/resend`, body)
      .pipe(catchError((err) => this.normalizeError(err)));
  }

  enableRole(role: UserRole): Observable<AuthSession> {
    return this.http.post<AuthSession>(`${this.baseUrl}/profile/enable`, { role }).pipe(
      tap((session) => this._session.set(session)),
      catchError((err) => this.normalizeError(err)),
    );
  }

  switchActiveRole(role: UserRole): void {
    const current = this._session();
    if (!current || !current.roles.includes(role)) return;
    // Optimistic - updates local state immediately rather than waiting on
    // the round-trip, matching switchActiveRole's synchronous, void
    // signature in the AuthApi contract (this is a same-account,
    // no-new-data operation, unlike enableRole which returns the session
    // the server actually persisted).
    this._session.set({ ...current, activeRole: role });
    this.http
      .post(`${this.baseUrl}/profile/switch-active`, { role })
      .pipe(catchError((err) => this.normalizeError(err)))
      .subscribe({ error: () => this._session.set(current) });
  }

  signOut(): void {
    this._session.set(null);
    // A real implementation also needs to invalidate the session
    // server-side (POST /auth/logout or equivalent) — not added here since
    // no logout flow was part of what was asked for, but flagging it since
    // clearing only local state leaves a live session behind.
  }

  private normalizeError(err: HttpErrorResponse): Observable<never> {
    const backendPayload = err.error as { message?: string; fieldErrors?: Record<string, string> } | null;
    const apiError: ApiError = {
      message: backendPayload?.message ?? 'Something went wrong. Please try again.',
      fieldErrors: backendPayload?.fieldErrors,
    };
    return throwError(() => apiError);
  }
}
