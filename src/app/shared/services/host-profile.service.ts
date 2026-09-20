import { Injectable, signal } from '@angular/core';
import { Observable, delay, of } from 'rxjs';
import {
  HostProfile,
  HostSettings,
  HostVenueInfo,
  createDefaultHostProfile,
} from '../models/host-profile.model';

const STORAGE_KEY = 'tarbuuz_mock_host_profiles';
const SIMULATED_LATENCY_MS = 300;

type ProfileStore = Record<string, HostProfile>;

/** Same shape and reasoning as FoodieProfileService and
 *  SupplierProfileService — kept separate rather than generalized across
 *  roles, since a Host's data (venue type, features) has nothing
 *  structurally in common with a Supplier's (product category) beyond
 *  both having a settings block. */
@Injectable({ providedIn: 'root' })
export class HostProfileService {
  private readonly profiles = signal<ProfileStore>(this.readFromLocalStorage());

  createProfileFor(userId: string, initialInfo: Partial<HostVenueInfo>): Observable<HostProfile> {
    const profile = createDefaultHostProfile(initialInfo);
    this.updateStore((store) => ({ ...store, [userId]: profile }));
    return of(profile).pipe(delay(SIMULATED_LATENCY_MS));
  }

  getProfile(userId: string): Observable<HostProfile | undefined> {
    return of(this.profiles()[userId]).pipe(delay(SIMULATED_LATENCY_MS));
  }

  updateVenueInfo(userId: string, changes: Partial<HostVenueInfo>): Observable<HostProfile> {
    return this.patchProfile(userId, (profile) => ({
      ...profile,
      venueInfo: { ...profile.venueInfo, ...changes },
    }));
  }

  updateFeatures(userId: string, features: string[]): Observable<HostProfile> {
    return this.patchProfile(userId, (profile) => ({ ...profile, features }));
  }

  updateSettings(userId: string, changes: Partial<HostSettings>): Observable<HostProfile> {
    return this.patchProfile(userId, (profile) => ({
      ...profile,
      settings: { ...profile.settings, ...changes },
    }));
  }

  private patchProfile(userId: string, updater: (profile: HostProfile) => HostProfile): Observable<HostProfile> {
    const current = this.profiles()[userId] ?? createDefaultHostProfile();
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
      // Same reasoning as the other mock stores — a failed write shouldn't
      // block the in-memory update the user is actively waiting on.
    }
  }
}
