import { Injectable, signal } from '@angular/core';
import { Observable, delay, of, tap } from 'rxjs';
import {
  FoodiePersonalInfo,
  FoodiePreferences,
  FoodieProfile,
  FoodieSettings,
  createDefaultFoodieProfile,
} from '../models/foodie-profile.model';

const STORAGE_KEY = 'tarbuuz_mock_foodie_profiles';
const SIMULATED_LATENCY_MS = 300;

type ProfileStore = Record<string, FoodieProfile>;

/**
 * Deliberately separate from auth: MockAuthService/AuthApi answer "who is
 * logged in", this answers "what does their profile look like". A real
 * backend would very plausibly split these across two services too — combining
 * them into one god-service that handles both login and profile editing is
 * exactly the kind of thing that's easy to regret once a second profile
 * type (Supplier, Host) needs the same login flow but different profile
 * shape entirely.
 */
@Injectable({ providedIn: 'root' })
export class FoodieProfileService {
  private readonly profiles = signal<ProfileStore>(this.readFromLocalStorage());

  createProfileFor(userId: string, initialInfo: Partial<FoodiePersonalInfo>): Observable<FoodieProfile> {
    const profile = createDefaultFoodieProfile(initialInfo);
    this.updateStore((store) => ({ ...store, [userId]: profile }));
    return of(profile).pipe(delay(SIMULATED_LATENCY_MS));
  }

  getProfile(userId: string): Observable<FoodieProfile | undefined> {
    return of(this.profiles()[userId]).pipe(delay(SIMULATED_LATENCY_MS));
  }

  updatePersonalInfo(userId: string, changes: Partial<FoodiePersonalInfo>): Observable<FoodieProfile> {
    return this.patchProfile(userId, (profile) => ({
      ...profile,
      personalInfo: { ...profile.personalInfo, ...changes },
    }));
  }

  updatePreferences(userId: string, changes: Partial<FoodiePreferences>): Observable<FoodieProfile> {
    return this.patchProfile(userId, (profile) => ({
      ...profile,
      preferences: { ...profile.preferences, ...changes },
    }));
  }

  updateSettings(userId: string, changes: Partial<FoodieSettings>): Observable<FoodieProfile> {
    return this.patchProfile(userId, (profile) => ({
      ...profile,
      settings: { ...profile.settings, ...changes },
    }));
  }

  private patchProfile(userId: string, updater: (profile: FoodieProfile) => FoodieProfile): Observable<FoodieProfile> {
    const current = this.profiles()[userId] ?? createDefaultFoodieProfile();
    const next = updater(current);
    this.updateStore((store) => ({ ...store, [userId]: next }));
    return of(next).pipe(delay(SIMULATED_LATENCY_MS));
  }

  private updateStore(updater: (store: ProfileStore) => ProfileStore): void {
    const next = updater(this.profiles());
    this.profiles.set(next);
    this.writeToLocalStorage(next);
  }

  private readFromLocalStorage(): ProfileStore {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as ProfileStore) : {};
    } catch {
      return {};
    }
  }

  private writeToLocalStorage(store: ProfileStore): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch {
      // Same reasoning as MockUserStoreService — a failed write shouldn't
      // block the in-memory update the user is actively waiting on.
    }
  }
}
