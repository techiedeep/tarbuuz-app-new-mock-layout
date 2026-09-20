/**
 * Models for the Kitchen Lab page — the "cook once, get paid every time
 * it's served" recipe network: a lifecycle explainer, a live interactive
 * submission demo, AI-matching criteria, the royalty chain, stats, and an
 * FAQ. No prior model or service existed for this page (it was only ever
 * a standalone HTML/vanilla-JS reference), built alongside the real
 * Angular conversion.
 */

export interface LifecycleStage {
  readonly number: string;
  readonly icon: string;
  readonly title: string;
  readonly description: string;
  /** Drives the indigo "✨ Smart Menu" AI tag next to the stage title —
   *  only the AI-matching stage gets it, matching the app-wide rule that
   *  indigo is reserved for AI-driven features specifically. */
  readonly isAi: boolean;
}

export interface MatchCriterion {
  readonly icon: string;
  readonly title: string;
  readonly description: string;
}

export interface RoyaltyStep {
  readonly number: string;
  readonly title: string;
  readonly description: string;
}

export interface KitchenLabStat {
  readonly value: string;
  readonly label: string;
}

export interface FaqItem {
  readonly question: string;
  readonly answer: string;
}

export type KitchenChoice = 'network' | 'own';
