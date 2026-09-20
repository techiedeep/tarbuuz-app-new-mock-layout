import { Injectable } from '@angular/core';
import {
  BuuzFormat,
  BuuzGarnish,
  BuuzIngredient,
  BuuzMixRatio,
  BuuzTemplate,
  ROLE_WEIGHT,
} from '../models/buuz/buuz.model';

/**
 * Static catalog + pure ratio math for the Buuz builder. Kept as plain
 * synchronous data (not Observables) since none of this is genuinely
 * async — it's a fixed catalog, not fetched from anywhere. Matches the
 * uploaded reference's data exactly (same keys, names, colors) so a
 * saved/shared mix built against one version stays valid against the other.
 */
@Injectable({ providedIn: 'root' })
export class BuuzService {
  readonly formats: readonly BuuzFormat[] = [
    { key: 'cube', icon: '🧊', name: 'Ice Cubes', desc: 'Freeze, drop in a glass, add your pour', shape: 'cube', basePrice: 18 },
    { key: 'sphere', icon: '⚪', name: 'Ice Spheres', desc: 'Slower melt, cleaner dilution, built for sipping', shape: 'sphere', basePrice: 22 },
    { key: 'bottle', icon: '🍾', name: 'Liquid Bottle', desc: 'Ready to shake or stir, no freezer required', shape: 'bottle', basePrice: 26 },
  ];

  readonly ingredients: readonly BuuzIngredient[] = [
    { key: 'lime', name: 'Lime', icon: '🍋', role: 'citrus', color: '#A8D533' },
    { key: 'lemon', name: 'Lemon', icon: '🍋', role: 'citrus', color: '#F4D03F' },
    { key: 'orange', name: 'Orange', icon: '🍊', role: 'citrus', color: '#F39C12' },
    { key: 'pineapple', name: 'Pineapple', icon: '🍍', role: 'fruit', color: '#F1C40F' },
    { key: 'mango', name: 'Mango', icon: '🥭', role: 'fruit', color: '#FF9F43' },
    { key: 'berries', name: 'Mixed Berries', icon: '🫐', role: 'fruit', color: '#6C5CE7' },
    { key: 'pomegranate', name: 'Pomegranate', icon: '🔴', role: 'fruit', color: '#C0392B' },
    { key: 'watermelon', name: 'Watermelon', icon: '🍉', role: 'fruit', color: '#FF6B81' },
    { key: 'mint', name: 'Mint', icon: '🌿', role: 'herb', color: '#27AE60' },
    { key: 'basil', name: 'Basil', icon: '🌿', role: 'herb', color: '#2ECC71' },
    { key: 'rosemary', name: 'Rosemary', icon: '🌲', role: 'herb', color: '#229954' },
    { key: 'thyme', name: 'Thyme', icon: '🌱', role: 'herb', color: '#58D68D' },
    { key: 'lavender', name: 'Lavender', icon: '💜', role: 'herb', color: '#9B59B6' },
    { key: 'simple-syrup', name: 'Simple Syrup', icon: '🍯', role: 'sweetener', color: '#F5CBA7' },
    { key: 'honey', name: 'Honey', icon: '🍯', role: 'sweetener', color: '#F39C12' },
    { key: 'agave', name: 'Agave', icon: '🌵', role: 'sweetener', color: '#D4AC0D' },
    { key: 'grenadine', name: 'Grenadine', icon: '🍒', role: 'sweetener', color: '#C0392B' },
    { key: 'maple', name: 'Maple Syrup', icon: '🍁', role: 'sweetener', color: '#A0522D' },
    { key: 'ginger', name: 'Ginger', icon: '🫚', role: 'spice', color: '#E67E22' },
    { key: 'chili', name: 'Chili', icon: '🌶️', role: 'spice', color: '#E74C3C' },
    { key: 'cinnamon', name: 'Cinnamon', icon: '🟤', role: 'spice', color: '#A0522D' },
    { key: 'soda', name: 'Soda Water', icon: '🥤', role: 'mixer', color: '#85C1E9' },
    { key: 'tonic', name: 'Tonic Water', icon: '🥤', role: 'mixer', color: '#AED6F1' },
    { key: 'gingerbeer', name: 'Ginger Beer', icon: '🍺', role: 'mixer', color: '#F0B27A' },
    { key: 'coconutwater', name: 'Coconut Water', icon: '🥥', role: 'mixer', color: '#A9DFBF' },
    { key: 'icedtea', name: 'Iced Tea', icon: '🍵', role: 'mixer', color: '#CA8A3D' },
  ];

  readonly popularKeys: readonly string[] = ['lime', 'mint', 'mango', 'ginger', 'honey', 'soda', 'basil', 'chili'];

  readonly garnishes: readonly BuuzGarnish[] = [
    { key: 'olives', name: 'Olives', icon: '🫒' },
    { key: 'cherry', name: 'Maraschino Cherry', icon: '🍒' },
    { key: 'mint-sprig', name: 'Mint Sprig', icon: '🌿' },
    { key: 'lime-wheel', name: 'Lime Wheel', icon: '🍋' },
    { key: 'orange-peel', name: 'Orange Peel', icon: '🍊' },
    { key: 'salted-rim', name: 'Salted Rim', icon: '🧂' },
    { key: 'sugared-rim', name: 'Sugared Rim', icon: '✨' },
    { key: 'umbrella', name: 'Cocktail Umbrella', icon: '☂️' },
    { key: 'rosemary-sprig', name: 'Rosemary Sprig', icon: '🌹' },
    { key: 'cinnamon-stick', name: 'Cinnamon Stick', icon: '🟤' },
  ];

  readonly templates: readonly BuuzTemplate[] = [
    { name: 'Citrus Spritz', icon: '🍋', format: 'bottle', mix: ['lime', 'lemon', 'orange', 'soda'], garnish: ['lime-wheel', 'mint-sprig'] },
    { name: 'Tropical Escape', icon: '🌴', format: 'cube', mix: ['pineapple', 'mango', 'coconutwater', 'lime'], garnish: ['orange-peel', 'umbrella'] },
    { name: 'Spiced Heat', icon: '🌶️', format: 'sphere', mix: ['mango', 'chili', 'ginger', 'lime'], garnish: ['salted-rim', 'lime-wheel'] },
    { name: 'Midnight Bloom', icon: '🍒', format: 'bottle', mix: ['grenadine', 'lavender', 'lemon', 'tonic'], garnish: ['cherry', 'sugared-rim'] },
    { name: 'Garden Fresh', icon: '🌿', format: 'cube', mix: ['rosemary', 'thyme', 'orange', 'agave'], garnish: ['rosemary-sprig', 'orange-peel'] },
    { name: 'Warm Spice', icon: '🫚', format: 'sphere', mix: ['ginger', 'cinnamon', 'honey', 'icedtea'], garnish: ['cinnamon-stick', 'orange-peel'] },
  ];

  findIngredient(key: string, custom: ReadonlyMap<string, BuuzIngredient>): BuuzIngredient | undefined {
    return this.ingredients.find((i) => i.key === key) ?? custom.get(key);
  }

  findGarnish(key: string): BuuzGarnish | undefined {
    return this.garnishes.find((g) => g.key === key);
  }

  /** Remainder-absorbing rounding — round every ratio except the last,
   *  then give the last one whatever's left. Round-half-up on all N
   *  independently can land on 99 or 101; this guarantees the donut and
   *  legend always sum to exactly 100. Matches the original component's
   *  algorithm exactly. */
  computeRatios(keys: readonly string[], custom: ReadonlyMap<string, BuuzIngredient>): BuuzMixRatio[] {
    const picked = keys
      .map((k) => this.findIngredient(k, custom))
      .filter((i): i is BuuzIngredient => !!i);
    const weights = picked.map((ing) => ROLE_WEIGHT[ing.role] ?? 2);
    const total = weights.reduce((a, b) => a + b, 0);
    if (total === 0) return [];

    const raw = picked.map((ing, i) => ({ ingredient: ing, percent: (weights[i] / total) * 100 }));
    let running = 0;
    return raw.map((r, i) => {
      if (i < raw.length - 1) {
        const rounded = Math.round(r.percent);
        running += rounded;
        return { ...r, rounded };
      }
      return { ...r, rounded: 100 - running };
    });
  }

  /** Builds the same conic-gradient CSS the original donut used, so the
   *  segment boundaries land exactly where the rounded legend percentages
   *  say they should. */
  buildDonutGradient(ratios: readonly BuuzMixRatio[]): string {
    if (ratios.length === 0) return '';
    let acc = 0;
    const stops = ratios.map((r) => {
      const start = acc;
      acc += r.rounded;
      return `${r.ingredient.color} ${start}% ${acc}%`;
    });
    return `conic-gradient(${stops.join(', ')})`;
  }

  slugifyCustomKey(name: string): string {
    return 'custom-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  // ── Pricing ──
  // A format's basePrice already covers a reasonable mix/garnish
  // allowance; going past that is what actually costs Tarbuuz more to
  // fulfill (more ingredient packets, more garnish units), so the price
  // scales with what's over the included allowance rather than being a
  // flat per-kit number regardless of how loaded it is.
  private static readonly INCLUDED_INGREDIENTS = 3;
  private static readonly INCLUDED_GARNISHES = 2;
  private static readonly EXTRA_INGREDIENT_FEE = 1.5;
  private static readonly EXTRA_GARNISH_FEE = 1;

  /** Always returns a finite, non-negative number, rounded to the cent -
   *  defends the one arithmetic boundary a malformed/negative count could
   *  otherwise push into a nonsensical (or negative) price, even though
   *  every call site today only ever passes non-negative counts. */
  computeKitPrice(formatKey: string, mixCount: number, garnishCount: number): number {
    const format = this.formats.find((f) => f.key === formatKey) ?? this.formats[0];
    const safeMixCount = Number.isFinite(mixCount) ? Math.max(0, mixCount) : 0;
    const safeGarnishCount = Number.isFinite(garnishCount) ? Math.max(0, garnishCount) : 0;

    const extraIngredients = Math.max(0, safeMixCount - BuuzService.INCLUDED_INGREDIENTS);
    const extraGarnishes = Math.max(0, safeGarnishCount - BuuzService.INCLUDED_GARNISHES);

    const total = format.basePrice + extraIngredients * BuuzService.EXTRA_INGREDIENT_FEE + extraGarnishes * BuuzService.EXTRA_GARNISH_FEE;
    return Math.round(total * 100) / 100;
  }
}
