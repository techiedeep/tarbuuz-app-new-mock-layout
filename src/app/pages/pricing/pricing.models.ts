/**
 * Data models for the Tarbuuz Pricing page. Same convention as
 * home.models.ts and our-story.models.ts: every repeated content block
 * is typed and data-driven.
 */

export interface TimeLineItem {
  readonly label: string;
  readonly time: string;
}

export interface PricingStep {
  readonly number: string;
  readonly time: string;
  readonly title: string;
  readonly description: string;
}

export interface PlanFeature {
  readonly text: string;
  readonly isAi: boolean;
}

export interface PricingPlan {
  readonly name: string;
  readonly tagline: string;
  readonly priceDisplay: string;
  readonly priceSuffix: string;
  readonly billedNote: string;
  readonly ctaLabel: string;
  readonly ctaVariant: 'primary' | 'ghost';
  readonly featured: boolean;
  readonly badge: string;
  readonly features: readonly PlanFeature[];
  /** True for exactly one plan (Pro) — its price/billedNote are overridden
   *  live by the billing toggle rather than read from priceDisplay/billedNote above. */
  readonly isProPlan: boolean;
}

export type CellValue =
  | { readonly kind: 'text'; readonly value: string }
  | { readonly kind: 'check' }
  | { readonly kind: 'dash' };

export interface ComparisonRow {
  readonly feature: string;
  readonly free: CellValue;
  readonly pro: CellValue;
  readonly enterprise: CellValue;
}

export interface FaqItem {
  readonly question: string;
  readonly answer: string;
}
