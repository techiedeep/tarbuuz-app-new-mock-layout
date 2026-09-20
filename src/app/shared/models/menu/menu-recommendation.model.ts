/**
 * UI-facing menu recommendation models — the shape a "Review Menu & Chef
 * Validation" screen would render (course sections, priced items, event
 * summary, cost breakdown). Distinct from ai-menu-recommendation.model.ts,
 * which is the raw AI-generated recommendation shape before it's
 * transformed into this display format. No menu-review service/component
 * exists yet — this is stage 2 of the process stepper, currently a label
 * only — so this completes the model layer, per instruction.
 */

export interface UserInfo {
  initials: string;
  name: string;
  role: string;
}

export interface ChefSpecialty {
  label: string;
}

export interface ChefInfo {
  initials: string;
  name: string;
  specialties: string[];
  personalMessage: string;
}

export interface MenuItem {
  /** Optional in the real model — added here since the Review Menu page
   *  needs stable identity for add/remove operations that dish names
   *  alone can't reliably provide (two dishes could share a name). */
  id?: string;
  name: string;
  description: string;
  price: number;
  tags: string[];
  allergenFree: string[];
  preparation?: string;
  winePairing?: string;
  source?: string;
  dietary_info?: string[];
  allergens?: string[];
}

export interface CourseSection {
  id: string;
  icon: string;
  title: string;
  description: string;
  items: MenuItem[];
}

export interface EventSummary {
  eventType: string;
  date: string;
  time: string;
  guests: number;
  ambiance: string;
  budget: number;
  cuisineStyle: string;
  specialRequirements: string[];
}

export interface CostItem {
  label: string;
  value: number;
}

export interface CostBreakdown {
  items: CostItem[];
  totalPerPerson: number;
  totalGuests: number;
  grandTotal: number;
  budgetRange: string;
  withinBudget: boolean;
}

export interface TimelineItem {
  time: string;
  event: string;
}

export interface WinePairing {
  course: string;
  wine: string;
  description: string;
}
