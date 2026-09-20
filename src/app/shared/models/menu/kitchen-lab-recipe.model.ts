/**
 * The Kitchen Lab recipe repository — home cooks submit recipes here per
 * the app's own marketing narrative ("cook once, get paid every time it's
 * served"), and a Foodie reviewing their Smart Menu can pull additional
 * dishes from this repository into their event's menu. No prior model or
 * service existed for this repository; built alongside the Review Menu
 * page since that's the first real feature to consume it.
 *
 * Extended for the actual submission flow (submit-recipe page): video
 * upload, full recipe detail, and an embeddingText field. This app has
 * no real vector database or embedding model - embeddingText is a plain
 * concatenation of a recipe's searchable attributes (name, description,
 * ingredients, cuisine, tags), and matchRecipesToEvent() in
 * review-menu.service.ts scores it against an event's stated
 * preferences with simple keyword/tag overlap. That's a deliberate,
 * honest stand-in for what a real vector similarity search would do
 * server-side, not a claim that real semantic embedding happens here.
 */

export type KitchenLabCourseType = 'starters' | 'main_courses' | 'desserts' | 'drinks';

export interface KitchenLabRecipe {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly price: number;
  readonly courseType: KitchenLabCourseType;
  readonly tags: string[];
  readonly allergenFree: string[];
  /** The home cook who submitted this recipe — surfaced in the picker so
   *  adding a dish feels like choosing someone's actual recipe, not
   *  picking a line item off a generic catalog. Matches Kitchen Lab's own
   *  "real people, real recipes" positioning. */
  readonly chefName: string;
  readonly rating: number;
  readonly timesServed: number;

  // ── Added for the real submission flow ──
  readonly cuisine: string;
  readonly ingredients: readonly string[];
  readonly instructions: string;
  readonly prepTimeMinutes: number;
  readonly cookTimeMinutes: number;
  readonly servings: number;
  /** Object URL for the uploaded video preview - not a real hosted
   *  asset, since this app has no file storage backend. Null for the
   *  seeded/mock recipes, which never went through a real upload. */
  readonly videoUrl: string | null;
  readonly submittedAt: string;
  /** See the file-level note above - a concatenation of searchable
   *  fields, not a real vector embedding. */
  readonly embeddingText: string;
}

/** What the submission form actually collects, before it's turned into
 *  a full KitchenLabRecipe (id, rating, timesServed, embeddingText, etc.
 *  are derived or start at zero, not something the submitter fills in). */
export interface RecipeSubmission {
  readonly name: string;
  readonly description: string;
  readonly price: number;
  readonly courseType: KitchenLabCourseType;
  readonly cuisine: string;
  readonly ingredients: readonly string[];
  readonly instructions: string;
  readonly tags: readonly string[];
  readonly allergenFree: readonly string[];
  readonly prepTimeMinutes: number;
  readonly cookTimeMinutes: number;
  readonly servings: number;
  readonly chefName: string;
  readonly videoUrl: string | null;
}

export function buildEmbeddingText(submission: RecipeSubmission): string {
  return [
    submission.name,
    submission.description,
    submission.cuisine,
    submission.ingredients.join(', '),
    submission.tags.join(', '),
    submission.allergenFree.map((a) => `${a}-free`).join(', '),
  ]
    .filter(Boolean)
    .join('. ')
    .toLowerCase();
}

export const COURSE_TYPE_LABELS: Record<KitchenLabCourseType, string> = {
  starters: 'Starters',
  main_courses: 'Main Courses',
  desserts: 'Desserts',
  drinks: 'Drinks',
};
