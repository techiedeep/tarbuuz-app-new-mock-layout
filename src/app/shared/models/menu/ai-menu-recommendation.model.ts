/**
 * Raw AI-generated menu recommendation models — the shape returned
 * directly by the recommendation engine (starters/main_courses/desserts/
 * drinks), before any transformation into the UI-facing CourseSection
 * format in menu-recommendation.model.ts. No service consumes this yet;
 * completes the model layer only, per instruction.
 */

export interface MenuRecommendationItem {
  id?: string;
  name: string;
  dietary_info: string[];
  allergens: string[];
  description: string;
  quantity: string;
  calorie_count: string | null;
}

export interface MenuRecommendation {
  starters: MenuRecommendationItem[];
  main_courses: MenuRecommendationItem[];
  desserts: MenuRecommendationItem[];
  drinks: MenuRecommendationItem[];
}

export interface ChefRecommendation {
  personalMessageByChef: string;
  menu: MenuRecommendation;
  menuCreativityRating?: number;
  dietaryAccommodationRating?: number;
  overallAppealRating?: number;
  changeRequestedComment?: string;
  userResponse?: string; // 'accept' | 'reject' | ''
}
