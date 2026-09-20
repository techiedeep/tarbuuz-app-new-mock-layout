/**
 * Chef profile models. No ChefProfileService or /chef-profile route exists
 * in this app yet — Chef is a real, distinct role in the source models
 * (separate from Supplier) but has no UI here at all. Per instruction,
 * this completes the model layer only.
 *
 * Consolidation note: the uploaded chef-profile.interface.ts defined its
 * own simpler inline CulinarySpecialty/DietarySpecialization shapes,
 * while separate culinary-specialty.model.ts / dietary-specialization
 * .model.ts files defined fuller versions explicitly documented as
 * "matches backend ...DTO" (with chefProfileId, displayOrder, createdAt,
 * updatedAt). Those are almost certainly two snapshots of the same
 * concept from different points in the real app's history — shipping
 * both would just be a same-name TypeScript collision. Kept the fuller,
 * DTO-matching versions as canonical and dropped the inline duplicates
 * rather than silently picking one with no explanation.
 */

export interface CulinarySpecialty {
  id: string;
  chefProfileId: string;
  name: string;
  icon: string;
  description?: string;
  selected: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

/** Request interface for both create and update — chefProfileId comes
 *  from route params or auth context; the backend validates ownership.
 *  displayOrder is auto-calculated by the component, not user input. */
export interface CulinarySpecialtyRequest {
  chefProfileId: string;
  name: string;
  icon: string;
  description?: string;
  selected?: boolean;
  displayOrder?: number;
}

export interface DietarySpecialization {
  id: string;
  chefProfileId: string;
  name: string;
  icon: string;
  description?: string;
  selected: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface DietarySpecializationRequest {
  chefProfileId: string;
  name: string;
  icon: string;
  description?: string;
  selected?: boolean;
  displayOrder?: number;
}

export interface ChefProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  yearsOfExperience: string;
  bio: string;
  hourlyRate: number;
  profilePicture?: string;
  rating: number;
  completionPercentage: number;
}

export interface ChefStats {
  eventsCompleted: number;
  successRate: number;
  specializations: number;
  revenue: string;
}

export interface PortfolioItem {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  emoji: string;
  tags: string[];
  chefProfileId: string;
}

export interface WorkExperience {
  id: string;
  title: string;
  company: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  description: string;
}

export interface ChefCompletionItem {
  id: string;
  icon: string;
  title: string;
  description: string;
  completed: boolean;
  action?: string;
  section?: string;
}

export interface ChefSidebarNavItem {
  id: string;
  icon: string;
  label: string;
  section: string;
  active: boolean;
}

export interface ChefNotificationSettings {
  newBookings: boolean;
  eventReminders: boolean;
  marketingUpdates: boolean;
  clientMessages: boolean;
}

/** Only the notification-related fields — matches a dedicated
 *  notification-preferences form that submits a subset of full account
 *  settings, distinct from ChefAccountSettings below. */
export interface ChefNotificationFormSettings {
  id?: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  marketingEmails: boolean;
  newMessages: boolean;
  bookingAlerts: boolean;
  reviewAlerts: boolean;
  weeklyDigest: boolean;
}

export interface ChefAccountSettings {
  id: string;
  chefProfileId: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  bookingAlerts: boolean;
  reviewAlerts: boolean;
  newMessages: boolean;
  newEventsAlerts: boolean;
  marketingEmails: boolean;
  weeklyDigest: boolean;
  profileVisibility: string;
  showHourlyRate: boolean;
  showContactInfo: boolean;
  autoAcceptBookings: boolean;
  requireDeposit: boolean;
  depositPercentage: number;
  cancellationHours: number;
}

export interface PasswordChange {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}
