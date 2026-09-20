/**
 * The nutritionist/dietician analysis — not part of the uploaded
 * reference, added because a genuinely thorough menu review for a real
 * event should cover nutritional balance and dietary-restriction
 * *coverage* (not just allergen cross-contact, which the
 * cross-contamination agent already owns). Reuses ValidationIssue for
 * nutritionistSuggestions so these plug into the exact same accept/
 * reject UI as the other agents' recommended enhancements, rather than
 * inventing a second interaction pattern for what's functionally the
 * same thing.
 */

import { ValidationIssue } from './validation-response.model';

export interface DietaryCoverageItem {
  readonly need: string; // e.g. "Vegetarian", "Gluten-Free"
  readonly guestsAffected: number | null; // null when the event didn't specify a count
  readonly compliantDishCount: number;
  readonly totalDishCount: number;
  readonly verdict: 'covered' | 'thin' | 'gap';
  readonly note: string;
}

export interface MacroBalanceNote {
  readonly label: string; // "Protein", "Carbohydrate-heavy", "Fresh & light"
  readonly observation: string;
}

export interface NutritionistAnalysis {
  readonly overallNotes: string;
  readonly estimatedCaloriesPerGuest: number;
  readonly macroBalance: readonly MacroBalanceNote[];
  readonly dietaryCoverage: readonly DietaryCoverageItem[];
  /** Spice/richness sequencing across courses — a genuinely useful
   *  dietician-adjacent read that has nothing to do with any single
   *  dish being "correct," only how they land one after another. */
  readonly paletteProgressionNote: string;
  readonly hydrationNote: string;
  readonly suggestions: readonly ValidationIssue[];
  readonly score: number; // 0-10, same scale as every other agent
}
