/**
 * Typed contracts for all contextual validation API responses. Matches
 * the shape returned by POST /api/MenuContextualValidation. No
 * ValidationService exists yet; completes the model layer only, per
 * instruction. Preserved exactly as provided — see the note on
 * validation-request.model.ts about why the snake_case/real-API shape is
 * kept rather than "cleaned up."
 */

export type ApprovalStatus = 'APPROVED' | 'APPROVED_WITH_SUGGESTIONS' | 'REQUIRES_CHANGES';

export type CheckStatus = 'pass' | 'warning' | 'fail';
export type IssueTier = 'critical' | 'recommended' | 'optional';
export type ImpactLevel = 'BLOCKING' | 'HIGH' | 'MEDIUM' | 'LOW';
export type CostBand = 'ECONOMY' | 'MID' | 'PREMIUM' | 'LUXURY';
export type CCSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type SeasonalType = 'ADD' | 'SUBSTITUTE' | 'ENHANCE';
export type AlignStatus = 'pass' | 'warning' | 'fail' | 'not_applicable';

export interface ValidationCheck {
  name: string;
  status: CheckStatus;
  detail: string;
}

export interface ValidationIssue {
  id: string;
  agent: string;
  tier: IssueTier;
  dish: string;
  issue: string;
  fix: string;
  priority: number;
  impact: ImpactLevel;
}

// ── Cross-contamination ────────────────────────────────────────────────

export interface CCRisk {
  id: string;
  at_risk_dish: string;
  source_dishes: string[] | null;
  equipment: string;
  allergen: string;
  severity: CCSeverity;
  impact: ImpactLevel;
  pathway_description: string;
  mitigation: string;
}

export interface CCServiceRisk {
  detected_style: 'plated' | 'buffet' | 'family_style' | 'unknown';
  amplifies_risk: boolean;
  note: string | null;
}

// ── Budget ──────────────────────────────────────────────────────────────

export interface BudgetAnalysis {
  budget_per_person: number;
  estimated_cost_per_person: number;
  estimated_food_cost_pct: number;
  /** Lowercase variants: 'comfortable' | 'tight' | 'over'
   *  Uppercase variants returned by some API versions:
   *  'WITHIN_BUDGET' | 'AT_BUDGET' | 'OVER_BUDGET' | 'UNDER_BUDGET' */
  budget_verdict:
    | 'comfortable'
    | 'tight'
    | 'over'
    | 'WITHIN_BUDGET'
    | 'AT_BUDGET'
    | 'OVER_BUDGET'
    | 'UNDER_BUDGET'
    | string;
  primary_cost_drivers: string[];
}

export interface DishCostItem {
  dish: string;
  category: string;
  cost_band: CostBand;
  verdict: CheckStatus;
}

export interface CostOptimizationItem {
  dish: string;
  current_issue: string;
  suggestion: string;
  saving: string;
  quality_impact: 'none' | 'minimal' | 'moderate';
}

// ── Alignment ───────────────────────────────────────────────────────────

export interface AlignmentBreakdown {
  query_intent: AlignStatus;
  cuisine_accuracy: AlignStatus;
  event_suitability: AlignStatus;
  dietary_compliance: AlignStatus;
  allergen_compliance: AlignStatus;
  additional_requests: AlignStatus;
  variety_and_balance: AlignStatus;
}

// ── Seasonal ──────────────────────────────────────────────────────────

export interface SeasonalContext {
  event_date: string | null;
  location: string | null;
  derived_season: 'spring' | 'summer' | 'autumn' | 'winter';
  derivation_note: string | null;
  assumption_note: string | null;
  /** Legacy field — kept for backward compatibility */
  detected_season?: 'spring' | 'summer' | 'autumn' | 'winter' | 'assumed';
}

export interface SeasonalRecommendation {
  type: SeasonalType;
  dish_name: string;
  description: string;
  reason: string;
  replaces: string | null;
  course: string;
  dietary_info: string[];
  allergens: string[];
  seasonal_peak: string;
}

// ── Presentation ────────────────────────────────────────────────────────

export interface CoursePalette {
  color_count: number;
  colors_present: string[];
  monochromatic: boolean;
  verdict: 'pass' | 'warning';
  recommendation: string | null;
}

export interface VesselRecommendation {
  dish: string;
  vessel: string;
  reason: string;
}

// ── Signature dish ──────────────────────────────────────────────────────

export interface SignatureDishIngredient {
  ingredient: string;
  quantity: string;
  note?: string;
}

export interface SignatureDish {
  name: string;
  tagline: string;
  course: string;
  description: string;
  inspiration: string;
  creative_twist: string;
  dietary_info: string[];
  allergens: string[];
  quantity: string;
  calorie_count: number;
  ingredients: SignatureDishIngredient[];
  method: string[];
  plating: string;
  pairing: string;
  chef_notes: string;
}

// ── Agent analysis ──────────────────────────────────────────────────────

export interface AgentAnalysis {
  icon: string;
  score: number;
  status: string;
  notes: string;
  checks: ValidationCheck[];
}

// ── Full response ───────────────────────────────────────────────────────

export interface ContextualValidationResult {
  approval_status: ApprovalStatus;
  overall_score: number;
  processing_time: number;
  executive_summary: string;

  alignment_breakdown: AlignmentBreakdown;
  alignment_score: number;
  alignment_notes: string;

  cross_contamination_risks: CCRisk[];
  cross_contamination_service_risk: CCServiceRisk;
  cc_score: number;

  budget_analysis: BudgetAnalysis;
  dish_cost_breakdown: DishCostItem[];
  cost_optimization_plan: CostOptimizationItem[];
  budget_score: number;

  seasonal_context: SeasonalContext;
  seasonal_recommendations: SeasonalRecommendation[];
  seasonal_score: number;

  signature_dish: SignatureDish;

  critical_issues: ValidationIssue[];
  recommended_enhancements: ValidationIssue[];
  optional_improvements: ValidationIssue[];

  presentation_score: number | null;
  presentation_course_palettes: Record<string, CoursePalette>;
  presentation_vessel_recommendations: VesselRecommendation[];

  detailed_analysis: Record<string, AgentAnalysis>;

  /** Not part of the original API contract — added alongside the
   *  Agentic Chef page build as a genuinely useful seventh perspective
   *  (nutritional balance and dietary-coverage), reusing ValidationIssue
   *  for its own suggestions so they work through the same accept/
   *  reject flow as every other agent's recommendations. */
  nutritionist_analysis?: import('./nutritionist-analysis.model').NutritionistAnalysis;

  user_response?: 'accept' | 'reject' | '';
}

export interface ContextualValidationRequest {
  menu: Record<string, unknown>;
  original_query?: string;
  cuisine?: string;
  event_type?: string;
  dietary?: string;
  allergens?: string;
  spice_level?: string;
  special_request?: string;
  additional_request?: string;
  budget_per_person?: number;
  season?: string;
  location?: string;
}

// ── UI helper types ─────────────────────────────────────────────────────

export type ValidationStage = 'idle' | 'validating' | 'complete' | 'error';

export interface AgentProgress {
  name: string;
  icon: string;
  state: 'pending' | 'running' | 'complete' | 'error';
  score?: number;
  status?: string;
}
