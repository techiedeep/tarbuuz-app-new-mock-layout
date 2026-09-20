import { Injectable, signal } from '@angular/core';
import { Observable, delay, of } from 'rxjs';
import {
  SupplierCompanyInfo,
  SupplierProfile,
  SupplierSettings,
  createDefaultSupplierProfile,
} from '../models/supplier-profile.model';

const STORAGE_KEY = 'tarbuuz_mock_supplier_profiles';
const SIMULATED_LATENCY_MS = 300;

type ProfileStore = Record<string, SupplierProfile>;

/**
 * Same shape and reasoning as FoodieProfileService: kept as its own service
 * rather than folded into a shared "profile service" for every role,
 * because a Supplier's data shape (company info, product category) has
 * nothing structurally in common with a Foodie's (personal bio,
 * preferences) beyond both having a settings block. Forcing them through
 * one generic service would mean a lot of role-conditional branching for
 * no real benefit.
 */
@Injectable({ providedIn: 'root' })
export class SupplierProfileService {
  private readonly profiles = signal<ProfileStore>(this.readFromLocalStorage());

  createProfileFor(userId: string, initialInfo: Partial<SupplierCompanyInfo>): Observable<SupplierProfile> {
    const profile = createDefaultSupplierProfile(initialInfo);
    this.updateStore((store) => ({ ...store, [userId]: profile }));
    return of(profile).pipe(delay(SIMULATED_LATENCY_MS));
  }

  getProfile(userId: string): Observable<SupplierProfile | undefined> {
    return of(this.profiles()[userId]).pipe(delay(SIMULATED_LATENCY_MS));
  }

  updateCompanyInfo(userId: string, changes: Partial<SupplierCompanyInfo>): Observable<SupplierProfile> {
    return this.patchProfile(userId, (profile) => ({
      ...profile,
      companyInfo: { ...profile.companyInfo, ...changes },
    }));
  }

  updateSettings(userId: string, changes: Partial<SupplierSettings>): Observable<SupplierProfile> {
    return this.patchProfile(userId, (profile) => ({
      ...profile,
      settings: { ...profile.settings, ...changes },
    }));
  }

  private patchProfile(userId: string, updater: (profile: SupplierProfile) => SupplierProfile): Observable<SupplierProfile> {
    const current = this.profiles()[userId] ?? createDefaultSupplierProfile();
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
      // Same reasoning as FoodieProfileService/MockUserStoreService — a
      // failed write shouldn't block the in-memory update the user is
      // actively waiting on.
    }
  }
}
