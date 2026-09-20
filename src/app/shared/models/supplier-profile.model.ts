/**
 * Supplier profile models.
 *
 * SupplierCompanyInfo/SupplierSettings/SupplierProfile/
 * createDefaultSupplierProfile are the app's own working shape —
 * SupplierProfileService and the Supplier profile page are built around
 * them, so they're kept as the primary type rather than replaced wholesale.
 *
 * Reconciliation against the real uploaded models:
 *  - PRODUCT_CATEGORY_OPTIONS was previously 6 invented categories with no
 *    icons/descriptions. Replaced with the real, authoritative 10-category
 *    list from the backend contract (profile/supplier-profile.interface.ts)
 *    — this was a genuine data error, not just a naming difference.
 *  - Two real DTOs overlap with SupplierCompanyInfo: SupplierInformation
 *    (supplier/supplier.model.ts) and the real SupplierProfile
 *    (profile/supplier-profile.interface.ts). Their extra fields
 *    (businessType, establishedYear/annualRevenue, employeeCount, userId,
 *    rating) are added below as SupplierProfileExtendedFields — optional,
 *    additive — rather than merged directly into SupplierCompanyInfo,
 *    since that type's fields are all wired to required reactive-form
 *    validators today; adding required fields with no matching form
 *    controls would silently break saving. Wiring these into the actual
 *    form is follow-up UI work, not a model-layer change.
 *  - Real NotificationSettings (newBidOpportunities/contractUpdates/
 *    marketingUpdates/paymentReminders) covers different concerns than
 *    the working SupplierSettings (newBidAlerts/smsNotifications/
 *    publicProfile) — kept both under distinct names rather than
 *    collapsing them, since they're not actually the same setting set.
 *  - Products/Certifications/BidActivity below are the real DTO shapes;
 *    the Supplier page's current Products/Certifications tabs are still
 *    static illustrative content, not backed by these yet.
 */

export interface SupplierCompanyInfo {
  companyName: string;
  productCategory: string;
  address: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  website: string;
  description: string;
  yearEstablished: number | null;
  serviceArea: string;
}

/** Additional real backend fields not yet wired into the working company
 *  form — see file-level note. Optional so existing profile data (created
 *  before this file existed) remains valid without a migration. */
export interface SupplierProfileExtendedFields {
  userId?: string;
  businessType?: string;
  employeeCount?: string;
  revenue?: string;
  annualRevenue?: string;
  rating?: number;
  completionPercentage?: number;
}

export interface SupplierSettings {
  newBidAlerts: boolean;
  smsNotifications: boolean;
  publicProfile: boolean;
}

export interface SupplierProfile {
  companyInfo: SupplierCompanyInfo;
  settings: SupplierSettings;
}

export function createDefaultSupplierProfile(overrides: Partial<SupplierCompanyInfo> = {}): SupplierProfile {
  return {
    companyInfo: {
      companyName: '',
      productCategory: '',
      address: '',
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      website: '',
      description: '',
      yearEstablished: null,
      serviceArea: '',
      ...overrides,
    },
    settings: {
      newBidAlerts: true,
      smsNotifications: false,
      publicProfile: true,
    },
  };
}

export interface ProductCategoryOption {
  readonly value: string;
  readonly label: string;
  readonly icon?: string;
  readonly description?: string;
}

/** The real, authoritative category list (10 categories with icon +
 *  description) — replaces a previous 6-category placeholder list that
 *  didn't match the actual backend contract. value/label kept separate
 *  from the real model's plain `name` field, matching this app's existing
 *  convention (a stored value shouldn't change if the display label is
 *  ever reworded) — values below are this app's own slugs, not present
 *  in the source data, since the original only provided display names. */
export const PRODUCT_CATEGORY_OPTIONS: readonly ProductCategoryOption[] = [
  { value: 'desserts-sweets', label: 'Desserts & Sweets', icon: '🍰', description: 'Anything sweet, separate from the main menu' },
  { value: 'beverages-bar', label: 'Beverages & Bar', icon: '🍹', description: 'Drinks beyond what the host provides' },
  { value: 'decor-styling', label: 'Decor & Styling', icon: '🎈', description: 'Visual atmosphere of the space' },
  { value: 'tableware-rentals', label: 'Tableware & Rentals', icon: '🍽️', description: 'Physical equipment for serving/seating' },
  { value: 'specialty-food-stations', label: 'Specialty Food Stations', icon: '🧀', description: 'Experiential, live-prepared food — distinct from the plated menu' },
  { value: 'entertainment-experiences', label: 'Entertainment & Experiences', icon: '🎶', description: 'Things guests actively do or watch' },
  { value: 'photography-media', label: 'Photography & Media', icon: '📸', description: 'Capturing the event' },
  { value: 'favors-gifting', label: 'Favors & Gifting', icon: '🎁', description: 'Take-home items' },
  { value: 'staffing-service', label: 'Staffing & Service', icon: '🧑‍🍳', description: 'Human labor beyond the host/kitchen' },
  { value: 'logistics-venue-support', label: 'Logistics & Venue Support', icon: '🚚', description: "Infrastructure that isn't food or decor" },
];

// ── Real DTOs not yet wired to any service — see file-level note ──────

export interface SupplierStats {
  activeContracts: number;
  onTimeDelivery: number;
  products: number;
  revenueYTD: string;
}

export interface SupplierProduct {
  id: string;
  title: string;
  description: string;
  icon: string;
  price: string;
  tags: string[];
  category: string;
}

export interface SupplierCertification {
  id?: string;
  supplierProfileId: string;
  icon: string;
  title: string;
  description: string;
  status: 'active' | 'pending';
}

export interface SupplierBidActivity {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'won' | 'lost';
  date: string;
}

export interface SupplierBiddingStats {
  totalBids: number;
  winRate: number;
  activeContracts: number;
  contractValue: string;
  totalBidsTrend: string;
  winRateTrend: string;
  activeContractsTrend: string;
  contractValueTrend: string;
}

export interface SupplierBusinessPreferences {
  minimumOrder: number;
  paymentTerms: string;
  leadTime: number;
  deliveryDays: string;
}

/** The real backend's business-notification toggle set — distinct from
 *  the working SupplierSettings above; see file-level note. */
export interface SupplierNotificationPreferences {
  newBidOpportunities: boolean;
  contractUpdates: boolean;
  marketingUpdates: boolean;
  paymentReminders: boolean;
}
