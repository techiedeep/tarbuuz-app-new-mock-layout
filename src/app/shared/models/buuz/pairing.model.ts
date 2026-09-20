import type { Season } from './drink.model';

export interface DrinkPairing {
  readonly drinkId: number;
  readonly season: Season;
  readonly flavourJourney: ReadonlyArray<string>;
  readonly foods: ReadonlyArray<string>;
  readonly occasion: string;
  readonly chefNote: string;
  readonly ambience: ReadonlyArray<string>;
}
