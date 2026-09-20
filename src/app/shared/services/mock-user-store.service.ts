import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, ReplaySubject, catchError, map, of, take, tap } from 'rxjs';
import { MockUser } from '../models/auth.models';

const STORAGE_KEY = 'tarbuuz_mock_users';
// This project serves its static assets from public/ at the site root
// (public/favicon.ico -> /favicon.ico), not from a /assets/ prefix — this
// path needs to stay in sync with wherever public/mock-data/users.json
// actually lives.
const SEED_URL = '/mock-data/users.json';

/**
 * The mock "database" for auth — registering adds a record here, logging in
 * looks one up. Reads/writes are backed by localStorage so an account
 * created in one session is still there after a page reload or the browser
 * closing, not just for the lifetime of one tab.
 *
 * On first-ever load (nothing in localStorage yet), seeds from
 * public/mock-data/users.json — after that, localStorage is the source of
 * truth and the seed file is never consulted again. This is a mock/demo
 * persistence layer standing in for a real backend, not a substitute for
 * one: localStorage is per-browser, unencrypted, and trivially inspectable
 * in devtools, so nothing sensitive should ever end up in here once this
 * is replaced with a real API.
 */
@Injectable({ providedIn: 'root' })
export class MockUserStoreService {
  private readonly http = inject(HttpClient);

  private readonly users$ = new ReplaySubject<MockUser[]>(1);

  constructor() {
    this.loadInitialUsers();
  }

  private loadInitialUsers(): void {
    const stored = this.readFromLocalStorage();
    if (stored) {
      this.users$.next(stored);
      return;
    }

    this.http
      .get<{ users: MockUser[] }>(SEED_URL)
      .pipe(
        map((res) => res.users ?? []),
        catchError(() => of([] as MockUser[])),
      )
      .subscribe((seeded) => {
        this.writeToLocalStorage(seeded);
        this.users$.next(seeded);
      });
  }

  findByEmail(email: string): Observable<MockUser | undefined> {
    const normalized = email.trim().toLowerCase();
    return this.users$.pipe(
      take(1), // read the current snapshot and complete — users$ itself
      // never completes on its own (it's a live store, not a one-shot
      // request), and without take(1) every method built on it would
      // return an Observable that never completes either. That's not just
      // a style nit: addUser/updateUser call users$.next() from inside a
      // tap() that runs as part of *consuming* an emission from the same
      // subject. Without take(1) tearing the subscription down first, that
      // .next() call re-enters the still-active subscriber synchronously —
      // exactly the kind of Subject re-entrancy that silently produces a
      // pipeline which never calls next or error again. Confirmed this by
      // hand: without take(1), a real registration attempt hung forever
      // with isSubmitting stuck true and no error surfaced anywhere.
      map((users) => users.find((u) => u.email.toLowerCase() === normalized)),
    );
  }

  addUser(user: MockUser): Observable<MockUser> {
    return this.users$.pipe(
      take(1),
      map((users) => [...users, user]),
      tap((next) => this.persist(next)),
      map(() => user),
    );
  }

  updateUser(userId: string, changes: Partial<MockUser>): Observable<MockUser | undefined> {
    return this.users$.pipe(
      take(1),
      map((users) => users.map((u) => (u.userId === userId ? { ...u, ...changes } : u))),
      tap((next) => this.persist(next)),
      map((next) => next.find((u) => u.userId === userId)),
    );
  }

  private persist(users: MockUser[]): void {
    this.writeToLocalStorage(users);
    this.users$.next(users);
  }

  private readFromLocalStorage(): MockUser[] | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as MockUser[]) : null;
    } catch {
      // Corrupt or inaccessible storage shouldn't crash the app — fall
      // back to re-seeding as if this were a first-ever load.
      return null;
    }
  }

  private writeToLocalStorage(users: MockUser[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    } catch {
      // Storage can legitimately fail (private browsing, quota exceeded) —
      // the in-memory users$ stream still works for the rest of this
      // session, it just won't survive a reload. Not surfacing this to the
      // user since it doesn't block anything they're actively trying to do.
    }
  }
}

