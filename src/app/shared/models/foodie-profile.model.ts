/**
 * Foodie profile models.
 *
 * FoodiePersonalInfo/FoodiePreferences/FoodieSettings/FoodieProfile/
 * createDefaultFoodieProfile are the app's own working shape —
 * FoodieProfileService and the Foodie profile page are built around
 * them, kept as primary rather than replaced.
 *
 * Reconciliation against the real uploaded models:
 *  - CUISINE_OPTIONS/DIETARY_OPTIONS/OCCASION_OPTIONS have no equivalent
 *    seed list in the real models (CuisinePreference/DietaryPreference
 *    there are just structural shapes — id/name/icon/selected — not a
 *    canonical set of values), so nothing to correct these against;
 *    kept as-is, unlike Supplier's product categories which did have an
 *    authoritative real list.
 *  - The real settings shape (food-enthusiast-profile settings file) is
 *    far more granular — 8 toggles vs. this app's working 3
 *    (emailNotifications/smsNotifications/publicProfile). Added as
 *    FoodieNotificationPreferences below rather than replacing
 *    FoodieSettings outright, since the working Settings tab's toggles
 *    are wired to exactly those 3 fields today; swapping the shape here
 *    without also rebuilding that tab would break saving silently.
 *  - Extra real profile fields (aiScore, completionPercentage,
 *    displayName, location, profileImage) added as
 *    FoodieProfileExtendedFields — optional, additive, same pattern as
 *    the Supplier/Host reconciliation.
 *  - ProfileStats/EventHistory/AIRecommendation/etc. are real DTOs for
 *    dashboard-style content this app doesn't render yet — added for
 *    completeness, not wired to any service.
 */

export interface FoodiePersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  bio: string;
}

/** Additional real backend fields not yet wired into the working
 *  Personal Info form — see file-level note. */
export interface FoodieProfileExtendedFields {
  id?: string;
  displayName?: string;
  location?: string;
  userType?: 'foodie';
  aiScore?: number;
  completionPercentage?: number;
  profileImage?: string;
}

export interface FoodiePreferences {
  favoriteCuisines: string[];
  dietaryPreferences: string[];
  typicalOccasions: string[];
}

export interface FoodieSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  publicProfile: boolean;
}

/** The real backend's fuller notification-preferences shape — distinct
 *  from the working FoodieSettings above; see file-level note. */
export interface FoodieNotificationPreferences {
  id?: string;
  foodieProfileId?: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  marketingEmails: boolean;
  newMessageAlerts: boolean;
  bookingUpdates: boolean;
  reviewAlerts: boolean;
  weeklyDigest: boolean;
}

export interface FoodieProfile {
  personalInfo: FoodiePersonalInfo;
  preferences: FoodiePreferences;
  settings: FoodieSettings;
}

/** A reasonable, empty starting point for a brand-new registration — every
 *  field present so the form never has to guard against undefined, with
 *  preferences/settings defaulted to sensible values rather than left blank. */
export function createDefaultFoodieProfile(overrides: Partial<FoodiePersonalInfo> = {}): FoodieProfile {
  return {
    personalInfo: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      bio: '',
      ...overrides,
    },
    preferences: {
      favoriteCuisines: [],
      dietaryPreferences: [],
      typicalOccasions: [],
    },
    settings: {
      emailNotifications: true,
      smsNotifications: false,
      publicProfile: true,
    },
  };
}

/** The fixed catalog of chip options shown in the Preferences tab — kept
 *  here rather than hardcoded in the template so the component and any
 *  future admin/config screen share one source of truth. */
export const CUISINE_OPTIONS: readonly string[] = [
  'North Indian', 'South Indian', 'Italian', 'Japanese', 'Lebanese', 'Peruvian', 'Thai', 'Mexican',
];
export const DIETARY_OPTIONS: readonly string[] = [
  'Vegetarian-friendly', 'Vegan', 'Nut-free', 'Gluten-free', 'Dairy-free',
];
export const OCCASION_OPTIONS: readonly string[] = [
  'Intimate Dinners', 'Milestone Birthdays', 'Cultural Celebrations', 'Corporate Events',
];

// ── Real DTOs not yet wired to any service — see file-level note ──────

export interface FoodieProfileStats {
  events: number;
  reviews: number;
  favorites: number;
  followers: number;
}

export interface FoodieDietaryPreferenceOption {
  id: string;
  name: string;
  icon: string;
  selected: boolean;
  custom?: boolean;
}

export interface FoodieCuisinePreferenceOption {
  id: string;
  name: string;
  icon: string;
  selected: boolean;
  custom?: boolean;
}

export interface FoodieEventHistoryEntry {
  id: string;
  title: string;
  date: string;
  location: string;
  chef: string;
  rating: number;
  image?: string;
}

/** A Foodie who has also enabled a Chef or Venue profile — the
 *  cross-role fields the real model exposes for that combined state. */
export interface FoodieProfessionalProfile {
  userType: 'chef' | 'venue';
  specializations?: string[];
  services?: string[];
  hourlyRate?: string;
  venueType?: string;
  cuisineCapabilities?: string[];
  eventTypes?: string[];
  minCapacity?: number;
  maxCapacity?: number;
}

export interface FoodieAnalyticsDataPoint {
  value: string;
  trend: string;
}

export type FoodieAnalytics = Record<string, FoodieAnalyticsDataPoint>;

export interface FoodieAIRecommendation {
  id: string;
  type: 'chef' | 'venue' | 'event';
  name: string;
  matchScore: number;
  description: string;
  image?: string;
  tags: string[];
}

export interface FoodieCompletionItem {
  id: string;
  icon: string;
  title: string;
  description: string;
  completed: boolean;
  section: string;
}
