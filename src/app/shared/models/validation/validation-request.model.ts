/**
 * Typed contracts for the menu contextual validation API request payload.
 * Matches the shape expected by POST /api/MenuContextualValidation — this
 * is the "Accept or Reject Validation & Approve Menu" stage of the
 * process stepper (stage 3), currently a label only. No
 * ValidationService/AgenticChefService exists yet; completes the model
 * layer only, per instruction. Preserved exactly as provided, including
 * the snake_case field names — these match a real external API contract,
 * not an internal naming choice, and renaming them would just create a
 * translation layer with no benefit until that API is actually called.
 */

export type SpiceLevel = 'mild' | 'medium' | 'hot' | 'extra-hot';

export interface ValidationMenuItemRequest {
  readonly name: string;
  readonly description: string;
  readonly dietary_info: readonly string[];
  readonly allergens: readonly string[];
  readonly quantity: string;
  readonly calorie_count: number;
}

export interface ValidationMenuRequest {
  readonly starters: readonly ValidationMenuItemRequest[];
  readonly main_courses: readonly ValidationMenuItemRequest[];
  readonly desserts: readonly ValidationMenuItemRequest[];
  readonly drinks: readonly ValidationMenuItemRequest[];
}

export interface ValidationRequest {
  readonly menu: ValidationMenuRequest;
  readonly cuisine: string;
  readonly event_type: string;
  readonly dietary: string;
  readonly allergens: string;
  readonly location: string;
  readonly event_date: string;
  readonly budget_per_person: number;
  readonly spice_level: SpiceLevel;
  readonly original_query: string;
  readonly special_request: string;
  readonly additional_request: string;
}

// ── Agentic chef review ──────────────────────────────────────────────

export interface AgenticChefDishItem {
  readonly id: string;
  readonly dishName: string;
  readonly courseType: 'starters' | 'main_courses' | 'desserts' | 'drinks';
}

export interface AgenticChefDishItemsById {
  readonly starters: readonly AgenticChefDishItem[];
  readonly mainCourses: readonly AgenticChefDishItem[];
  readonly desserts: readonly AgenticChefDishItem[];
  readonly drinks: readonly AgenticChefDishItem[];
}

export interface AgenticChefReviewRequest {
  readonly eventId: string;
  readonly validationRequest: ValidationRequest;
  readonly dishItemsWithId: AgenticChefDishItemsById;
}
