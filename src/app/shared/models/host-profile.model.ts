/**
 * Host (Venue) profile models.
 *
 * HostVenueInfo/HostSettings/HostProfile/createDefaultHostProfile are the
 * app's own working shape — HostProfileService and the Host profile page
 * are built around them, kept as primary rather than replaced.
 *
 * Reconciliation against the real uploaded models:
 *  - VENUE_TYPE_OPTIONS and FEATURE_OPTIONS have no equivalent in the
 *    real models (VenueProfile.venueType is just a free string there, and
 *    no canonical feature-name list was provided) — unlike Supplier's
 *    product categories, there was nothing authoritative to correct
 *    these against, so they're kept as-is.
 *  - The real VenueProfile has no phoneNumber field at all, while the
 *    working HostVenueInfo does (and it's wired to a required validator
 *    in the real venue-information form this was originally converted
 *    from). Kept phoneNumber rather than dropping it — the working form
 *    is the more concrete source of truth for what this app's UI needs.
 *  - Extra real fields (capacity range, rating, booking/view counts,
 *    profile image) added as HostProfileExtendedFields — optional,
 *    additive, same reasoning as SupplierProfileExtendedFields.
 *  - GalleryPhoto/EventPackage/BookingSlot/VenueFeature are the real DTO
 *    shapes for Gallery/Features, which are currently static illustrative
 *    content on the Host page, not backed by these yet.
 */

export interface HostVenueInfo {
  venueName: string;
  venueType: string;
  address: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  website: string;
  description: string;
}

/** Additional real backend fields not yet wired into the working venue
 *  form — see file-level note. */
export interface HostProfileExtendedFields {
  userId?: string;
  minCapacity?: number;
  maxCapacity?: number;
  priceRange?: string;
  operatingHours?: string;
  venueRating?: number | string;
  totalEvents?: number;
  activeBookings?: number;
  venueViews?: number;
  profileImageUrl?: string;
  completionPercentage?: number;
}

export interface HostSettings {
  newBidAlerts: boolean;
  smsNotifications: boolean;
  publicProfile: boolean;
}

export interface HostProfile {
  venueInfo: HostVenueInfo;
  features: string[];
  settings: HostSettings;
}

export function createDefaultHostProfile(overrides: Partial<HostVenueInfo> = {}): HostProfile {
  return {
    venueInfo: {
      venueName: '',
      venueType: '',
      address: '',
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      website: '',
      description: '',
      ...overrides,
    },
    features: [],
    settings: {
      newBidAlerts: true,
      smsNotifications: false,
      publicProfile: true,
    },
  };
}

export interface VenueTypeOption {
  readonly value: string;
  readonly label: string;
}

export const VENUE_TYPE_OPTIONS: readonly VenueTypeOption[] = [
  { value: 'farm-to-table', label: 'Farm-to-Table Supper Club' },
  { value: 'private-venue', label: 'Private Event Venue' },
  { value: 'outdoor', label: 'Outdoor / Garden Space' },
  { value: 'restaurant', label: 'Restaurant Buyout' },
  { value: 'rooftop', label: 'Rooftop' },
];

export const FEATURE_OPTIONS: readonly string[] = [
  'Outdoor Seating', 'On-site Parking', 'Farm Tour Included', 'Wheelchair Accessible',
  'Private Dining Room', 'AV Equipment', 'Pet Friendly',
];

// ── Real DTOs not yet wired to any service — see file-level note ──────

export interface VenueStats {
  totalEvents: number;
  activeBookings: number;
  venueViews: number;
  avgRating: number;
}

export interface GalleryPhoto {
  id: string;
  url: string;
  description: string;
  tags: string[];
  uploadedAt: string;
}

/** The real DTO for a bookable event package — distinct from this app's
 *  own simpler illustrative Products/offerings; carries venueProfileId
 *  and an active flag matching a real create/toggle flow. */
export interface HostEventPackage {
  id?: string;
  venueProfileId?: string;
  name: string;
  description: string;
  price: number;
  capacity: number;
  duration: string;
  features?: string[];
  active: boolean;
  icon?: string;
}

export interface BookingSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'available' | 'booked' | 'blocked';
  eventName?: string;
}

export interface HostFeatureCard {
  id?: string;
  icon: string;
  name: string;
  description: string;
  selected: boolean;
}

export interface AmenityCard {
  id?: string;
  icon: string;
  title: string;
  description: string;
}

/** A single toggleable venue feature with real backend identity — the
 *  working FEATURE_OPTIONS list above is just plain strings; this is
 *  the fuller DTO shape (id, category, per-venue profileId) for when
 *  Features moves off static content onto real CRUD. */
export interface VenueFeature {
  id: string;
  name: string;
  icon: string;
  selected: boolean;
  category: string;
  description?: string;
  profileId?: string;
}

export interface HostCuisineType {
  id?: string;
  venueProfileId: string;
  name: string;
  selected: boolean;
}
