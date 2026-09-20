/**
 * Models for the Buuz cocktail-kit builder — build a mix from a format
 * (ice cubes/spheres/bottle), ingredients (weighted by role for the ratio
 * donut), and garnishes, either from a one-click template or from
 * scratch. Replaces an earlier, speculative set of Buuz models (a
 * drink-catalog-with-seasonal-pairings concept) that never matched what
 * this page actually is — confirmed nothing imported them, so replaced
 * outright rather than layered alongside.
 */

export type IngredientRole = 'citrus' | 'fruit' | 'herb' | 'sweetener' | 'spice' | 'mixer' | 'custom';

export interface BuuzFormat {
  readonly key: string;
  readonly icon: string;
  readonly name: string;
  readonly desc: string;
  /** Which CSS shape to render in the format card — see BuuzFormatShape. */
  readonly shape: BuuzFormatShape;
  /** Base price in USD for this format at the included ingredient/garnish
   *  allowance — see BuuzService.computeKitPrice() for how extras on top
   *  of that allowance add to it. */
  readonly basePrice: number;
}

export type BuuzFormatShape = 'cube' | 'sphere' | 'bottle';

export interface BuuzIngredient {
  readonly key: string;
  readonly name: string;
  readonly icon: string;
  readonly role: IngredientRole;
  /** Drives both the donut segment color and the legend swatch. */
  readonly color: string;
}

export interface BuuzGarnish {
  readonly key: string;
  readonly name: string;
  readonly icon: string;
}

export interface BuuzTemplate {
  readonly name: string;
  readonly icon: string;
  readonly format: string; // BuuzFormat.key
  readonly mix: readonly string[]; // BuuzIngredient.key[]
  readonly garnish: readonly string[]; // BuuzGarnish.key[]
}

/** How strongly each role weights toward the mix ratio — a mixer
 *  dominates a glass far more than a sprig of herb does, so the donut
 *  should reflect that rather than splitting evenly per ingredient. */
export const ROLE_WEIGHT: Record<IngredientRole, number> = {
  mixer: 5,
  fruit: 3,
  citrus: 2,
  sweetener: 1.5,
  herb: 0.6,
  spice: 0.6,
  custom: 2,
};

/** One resolved slice of the mix, ready to render as a donut segment
 *  and a legend row. rounded values always sum to exactly 100 — see
 *  BuuzService.computeRatios() for the remainder-absorbing rounding
 *  that guarantees that. */
export interface BuuzMixRatio {
  readonly ingredient: BuuzIngredient;
  readonly percent: number; // exact, pre-rounding
  readonly rounded: number; // integer, sums to 100 across a full mix
}
