/**
 * Buuz drink models. No BuuzService exists yet — the Buuz page has only
 * ever been built as a standalone HTML preview, never a real Angular
 * component. Completes the model layer only, per instruction.
 */
export type Season = 'summer' | 'spring' | 'autumn' | 'winter';

export interface Drink {
  readonly id: number;
  readonly name: string;
  readonly ingredients: string;
  readonly flavourTags: ReadonlyArray<string>;
  readonly season: Season;
  readonly story: string;
  readonly technique: string;
  readonly tagline: string;
  readonly imageUrl: string;
  readonly signatureNo: number;
}
