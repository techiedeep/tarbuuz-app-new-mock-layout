/**
 * Event *creation* models — distinct from foodie-event.model.ts, which
 * models an already-created event for the dashboard/bidding views. This
 * is the shape a "Create Event" form and its supplier-linking follow-up
 * actions would submit. No EventCreationService exists yet — the
 * dashboard's "Create Event" button is currently a placeholder — so this
 * completes the model layer only, per instruction.
 */

export interface EventFormData {
  id?: string;
  eventType: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  eventTimezone: string;
  duration: string;
  guestCount: number;
  preferredCuisines: string[];
  dietaryPreferences: string[];
  eventAmbience: string;
  budget: number;
  eventLocation: string;
  specialRequest: string;
  contactName: string;
  createdByUserId?: string;
  createdByProfileType?: string;
  createdByProfileId?: string;
  status?: string;
  visibility?: string;
  coverImageUrl?: string;
}

export interface EventDetail {
  status: string;
  title: string;
  eventId: string;
  date: string;
  time: string;
  duration: string;
  ambience: string;
  location: string;
  cuisine: string;
  allergies: string[];
  budgetRange: string;
  specialNotes: string;
  guestCount: number;
}

export interface LinkSuppliersRequest {
  eventId: string;
  supplierIds: string[];
  removedSupplierIds?: string[];
  createdByProfileName: string;
  createdByUserId: string;
}

export interface UnlinkSuppliersRequest {
  eventId: string;
  supplierIds: string[];
}

export interface SupplierSummary {
  id: string;
  companyName: string;
  website: string;
  productCategory: string;
  selected: string;
}
