import { Injectable, signal } from '@angular/core';
import { Observable, delay, of } from 'rxjs';
import { CostBreakdown, CourseSection, MenuItem } from '../models/menu/menu-recommendation.model';
import { KitchenLabRecipe, KitchenLabCourseType, RecipeSubmission, buildEmbeddingText } from '../models/menu/kitchen-lab-recipe.model';
import { FoodieEvent } from '../models/foodie-event.model';

const SIMULATED_LATENCY_MS = 500;
const RECIPE_STORAGE_KEY = 'tarbuuz.kitchenLab.submittedRecipes';

/**
 * Mock Smart Menu generation + Kitchen Lab repository, backing the Review
 * Menu page. No real menu-generation AI is called here — a menu is
 * deterministically built from the event's own cuisine/dietary
 * preferences, standing in for what Smart Menu would actually return.
 * Per-event menu state (after add/remove edits) lives in a signal store,
 * same pattern as the other profile services, so navigating away and back
 * doesn't lose in-progress edits.
 */
@Injectable({ providedIn: 'root' })
export class ReviewMenuService {
  private readonly menusByEventId = signal<Record<string, CourseSection[]>>({});

  // Only newly-submitted recipes are persisted here - the seed set below
  // is static and already lives in code, so duplicating it into
  // localStorage too would just be a second copy to keep in sync. A page
  // reload after submitting a recipe still needs to see it in the
  // Kitchen Lab picker, which is what this survives across (the same
  // gap that was found and fixed for Agentic Chef's persistence earlier
  // - applying the same lesson here rather than repeating that mistake).
  private readonly submittedRecipes = signal<KitchenLabRecipe[]>(this.loadSubmittedRecipes());

  private loadSubmittedRecipes(): KitchenLabRecipe[] {
    try {
      const raw = localStorage.getItem(RECIPE_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as KitchenLabRecipe[]) : [];
    } catch {
      return [];
    }
  }

  private saveSubmittedRecipes(recipes: KitchenLabRecipe[]): void {
    try {
      localStorage.setItem(RECIPE_STORAGE_KEY, JSON.stringify(recipes));
    } catch {
      // Best-effort - a failed write shouldn't crash the submission flow;
      // the recipe is still usable for the rest of this session via the
      // in-memory signal either way.
    }
  }

  /** Overwrites an event's stored menu wholesale — used by Agentic Chef
   *  when attaching accepted recommendations back onto the Smart Menu.
   *  The other mutation methods below all touch one course or one item
   *  at a time; this exists because Agentic Chef's output is a fully-
   *  rebuilt course list (every accepted fix folded into the relevant
   *  dish's description at once), not a single-field edit. */
  replaceMenuForEvent(eventId: string, courses: CourseSection[]): void {
    this.menusByEventId.update((store) => ({ ...store, [eventId]: courses }));
  }

  getMenuForEvent(event: FoodieEvent): Observable<CourseSection[]> {
    const existing = this.menusByEventId()[event.id];
    if (existing) {
      return of(existing).pipe(delay(SIMULATED_LATENCY_MS));
    }
    const generated = this.generateMenu(event);
    this.menusByEventId.update((store) => ({ ...store, [event.id]: generated }));
    return of(generated).pipe(delay(SIMULATED_LATENCY_MS));
  }

  removeItem(eventId: string, courseId: string, itemId: string): Observable<CourseSection[]> {
    const updated = (this.menusByEventId()[eventId] ?? []).map((course) =>
      course.id === courseId ? { ...course, items: course.items.filter((i) => i.id !== itemId) } : course,
    );
    this.menusByEventId.update((store) => ({ ...store, [eventId]: updated }));
    return of(updated).pipe(delay(200));
  }

  updateItem(eventId: string, courseId: string, itemId: string, changes: Partial<MenuItem>): Observable<CourseSection[]> {
    const updated = (this.menusByEventId()[eventId] ?? []).map((course) =>
      course.id === courseId
        ? { ...course, items: course.items.map((i) => (i.id === itemId ? { ...i, ...changes } : i)) }
        : course,
    );
    this.menusByEventId.update((store) => ({ ...store, [eventId]: updated }));
    return of(updated).pipe(delay(200));
  }

  addRecipeToMenu(eventId: string, recipe: KitchenLabRecipe): Observable<CourseSection[]> {
    const courseId = recipe.courseType;
    const newItem: MenuItem = {
      id: `kl-${recipe.id}-${Date.now()}`,
      name: recipe.name,
      description: recipe.description,
      price: recipe.price,
      tags: recipe.tags,
      allergenFree: recipe.allergenFree,
      source: `Kitchen Lab · ${recipe.chefName}`,
    };
    const current = this.menusByEventId()[eventId] ?? [];
    const courseExists = current.some((c) => c.id === courseId);
    const updated = courseExists
      ? current.map((course) => (course.id === courseId ? { ...course, items: [...course.items, newItem] } : course))
      : [...current, this.emptyCourseFor(courseId, [newItem])];
    this.menusByEventId.update((store) => ({ ...store, [eventId]: updated }));
    return of(updated).pipe(delay(200));
  }

  getKitchenLabRecipes(): Observable<KitchenLabRecipe[]> {
    return of([...this.submittedRecipes(), ...this.seedRecipes()]).pipe(delay(300));
  }

  // The real submission flow: turns a RecipeSubmission (what the form on
  // submit-recipe actually collects) into a full KitchenLabRecipe -
  // generating its id, computing embeddingText, and defaulting rating/
  // timesServed to zero since a freshly submitted recipe genuinely has
  // neither yet. Persisted immediately so it's visible in the Kitchen
  // Lab picker (getKitchenLabRecipes above) right away, on this page
  // load and any future one.
  submitRecipe(submission: RecipeSubmission): Observable<KitchenLabRecipe> {
    const recipe: KitchenLabRecipe = {
      id: `kl-user-${Date.now()}`,
      name: submission.name,
      description: submission.description,
      price: submission.price,
      courseType: submission.courseType,
      tags: [...submission.tags],
      allergenFree: [...submission.allergenFree],
      chefName: submission.chefName,
      rating: 0,
      timesServed: 0,
      cuisine: submission.cuisine,
      ingredients: submission.ingredients,
      instructions: submission.instructions,
      prepTimeMinutes: submission.prepTimeMinutes,
      cookTimeMinutes: submission.cookTimeMinutes,
      servings: submission.servings,
      videoUrl: submission.videoUrl,
      submittedAt: new Date().toISOString(),
      embeddingText: buildEmbeddingText(submission),
    };

    const updated = [recipe, ...this.submittedRecipes()];
    this.submittedRecipes.set(updated);
    this.saveSubmittedRecipes(updated);

    return of(recipe).pipe(delay(SIMULATED_LATENCY_MS));
  }

  getCostBreakdown(courses: CourseSection[], event: FoodieEvent): CostBreakdown {
    const items = courses.map((c) => ({
      label: c.title,
      value: c.items.reduce((sum, item) => sum + item.price, 0),
    }));
    const totalPerPerson = items.reduce((sum, i) => sum + i.value, 0);
    // event.budget/guestCount are typed as required numbers, but this
    // computation runs inside a computed() signal on every change-
    // detection cycle — if real (e.g. backend) data ever doesn't match
    // that shape, a single undefined value here throws on every single
    // recompute, not once, which can disrupt far more of the page than
    // just this cost card. Guarding against that directly rather than
    // trusting the type is what actually prevents that class of failure.
    const guestCount = event.guestCount ?? 0;
    const budget = event.budget ?? 0;
    const grandTotal = totalPerPerson * guestCount;
    const withinBudget = budget > 0 ? grandTotal <= budget : true;
    return {
      items,
      totalPerPerson,
      totalGuests: guestCount,
      grandTotal,
      budgetRange: budget > 0 ? `$${budget.toLocaleString()}` : 'Not set',
      withinBudget,
    };
  }

  private emptyCourseFor(courseId: string, items: MenuItem[]): CourseSection {
    const meta: Record<string, { icon: string; title: string; description: string }> = {
      starters: { icon: '🥗', title: 'Starters', description: 'To open the meal' },
      main_courses: { icon: '🍽️', title: 'Main Courses', description: 'The centerpiece of the table' },
      desserts: { icon: '🍰', title: 'Desserts', description: 'To close things out' },
      drinks: { icon: '🥂', title: 'Drinks', description: 'Pairings and refreshments' },
    };
    const m = meta[courseId] ?? { icon: '🍴', title: courseId, description: '' };
    return { id: courseId, icon: m.icon, title: m.title, description: m.description, items };
  }

  /** Deterministic, event-aware "generation" — real values seeded from the
   *  event's own cuisine/dietary preferences so different events produce
   *  visibly different menus, standing in for what Smart Menu would
   *  actually return from the AI pipeline. */
  private generateMenu(event: FoodieEvent): CourseSection[] {
    const isVeg = event.dietaryPreferences.some((d) => /vegetarian|vegan/i.test(d));
    const primaryCuisine = event.preferredCuisines[0] ?? 'Seasonal';

    const starters: MenuItem[] = [
      { id: 'gen-s1', name: `${primaryCuisine} Spiced Fritters`, description: 'Crisp, herb-forward, served with a cooling yogurt dip.', price: 8, tags: ['Vegetarian'], allergenFree: ['Nut-free'] },
      { id: 'gen-s2', name: 'Roasted Beet & Citrus Salad', description: 'Whipped feta, candied walnuts, sherry vinaigrette.', price: 9, tags: ['Vegetarian', 'Gluten-free'], allergenFree: ['Gluten-free'] },
    ];
    const mainCourses: MenuItem[] = [
      isVeg
        ? { id: 'gen-m1', name: `${primaryCuisine} Vegetable Biryani`, description: 'Layered basmati, charred vegetables, saffron.', price: 22, tags: ['Vegetarian'], allergenFree: ['Nut-free'] }
        : { id: 'gen-m1', name: `${primaryCuisine}-Spiced Roast Chicken`, description: 'Slow-roasted, finished with a bright herb sauce.', price: 26, tags: ['Gluten-free'], allergenFree: ['Gluten-free'] },
      { id: 'gen-m2', name: 'Charred Seasonal Vegetables', description: 'Whatever\u2019s best at the market that week.', price: 14, tags: ['Vegan', 'Gluten-free'], allergenFree: ['Vegan', 'Gluten-free'] },
    ];
    const desserts: MenuItem[] = [
      { id: 'gen-d1', name: 'Cardamom Pot de Cr\u00e8me', description: 'Silky custard, candied pistachio.', price: 10, tags: ['Vegetarian'], allergenFree: [] },
    ];
    const drinks: MenuItem[] = [
      { id: 'gen-dr1', name: 'House-Made Ginger Lemonade', description: 'Fresh ginger, mint, sparkling water.', price: 6, tags: ['Vegan', 'Non-alcoholic'], allergenFree: ['Vegan'] },
    ];

    return [
      { id: 'starters', icon: '🥗', title: 'Starters', description: 'To open the meal', items: starters },
      { id: 'main_courses', icon: '🍽️', title: 'Main Courses', description: 'The centerpiece of the table', items: mainCourses },
      { id: 'desserts', icon: '🍰', title: 'Desserts', description: 'To close things out', items: desserts },
      { id: 'drinks', icon: '🥂', title: 'Drinks', description: 'Pairings and refreshments', items: drinks },
    ];
  }

  private seedRecipes(): KitchenLabRecipe[] {
    const base = (overrides: Partial<KitchenLabRecipe>): KitchenLabRecipe => ({
      id: '', name: '', description: '', price: 0, courseType: 'starters', tags: [], allergenFree: [],
      chefName: '', rating: 0, timesServed: 0, cuisine: '', ingredients: [], instructions: '',
      prepTimeMinutes: 0, cookTimeMinutes: 0, servings: 4, videoUrl: null, submittedAt: '2026-01-01T00:00:00.000Z',
      embeddingText: '', ...overrides,
    });
    const withEmbedding = (r: KitchenLabRecipe): KitchenLabRecipe => ({
      ...r,
      embeddingText: `${r.name} ${r.description} ${r.cuisine} ${r.ingredients.join(' ')} ${r.tags.join(' ')}`.toLowerCase(),
    });

    return [
      withEmbedding(base({ id: 'kl-1', name: 'Grandma\u2019s Samosas', description: 'Hand-folded, spiced potato and pea filling.', price: 7, courseType: 'starters', tags: ['Vegetarian'], allergenFree: ['Nut-free'], chefName: 'Priya R.', rating: 4.9, timesServed: 214, cuisine: 'Indian', ingredients: ['potatoes', 'green peas', 'cumin', 'garam masala', 'samosa pastry'], instructions: 'Boil and mash potatoes, fold in spiced peas, wrap in pastry, deep-fry until golden.', prepTimeMinutes: 30, cookTimeMinutes: 20, servings: 12 })),
      withEmbedding(base({ id: 'kl-2', name: 'Burrata with Charred Peach', description: 'Local burrata, grilled stone fruit, basil oil.', price: 12, courseType: 'starters', tags: ['Vegetarian', 'Gluten-free'], allergenFree: ['Gluten-free'], chefName: 'Marco D.', rating: 4.8, timesServed: 156, cuisine: 'Italian', ingredients: ['burrata', 'peaches', 'basil', 'olive oil', 'sea salt'], instructions: 'Char peach halves on a hot grill, plate over burrata, finish with basil oil and sea salt.', prepTimeMinutes: 10, cookTimeMinutes: 8, servings: 4 })),
      withEmbedding(base({ id: 'kl-3', name: 'Slow-Braised Short Rib', description: 'Red wine braise, 8 hours, falls off the bone.', price: 32, courseType: 'main_courses', tags: ['Gluten-free'], allergenFree: ['Gluten-free'], chefName: 'James K.', rating: 5.0, timesServed: 98, cuisine: 'French', ingredients: ['beef short rib', 'red wine', 'carrots', 'celery', 'thyme'], instructions: 'Sear short ribs, braise in red wine and aromatics at low heat for 8 hours until fork-tender.', prepTimeMinutes: 25, cookTimeMinutes: 480, servings: 6 })),
      withEmbedding(base({ id: 'kl-4', name: 'Miso-Glazed Eggplant', description: 'Sticky-sweet glaze, sesame, scallion.', price: 18, courseType: 'main_courses', tags: ['Vegan'], allergenFree: ['Vegan', 'Nut-free'], chefName: 'Yuki T.', rating: 4.9, timesServed: 187, cuisine: 'Japanese', ingredients: ['eggplant', 'white miso', 'mirin', 'sesame seeds', 'scallion'], instructions: 'Score and roast eggplant, brush with miso glaze, broil until caramelized, top with sesame and scallion.', prepTimeMinutes: 15, cookTimeMinutes: 35, servings: 4 })),
      withEmbedding(base({ id: 'kl-5', name: 'Paneer Tikka Skewers', description: 'Char-grilled, yogurt marinade, mint chutney.', price: 16, courseType: 'main_courses', tags: ['Vegetarian', 'Gluten-free'], allergenFree: ['Gluten-free'], chefName: 'Priya R.', rating: 4.7, timesServed: 142, cuisine: 'Indian', ingredients: ['paneer', 'yogurt', 'bell peppers', 'red onion', 'mint chutney'], instructions: 'Marinate paneer and vegetables in spiced yogurt, skewer, char-grill, serve with mint chutney.', prepTimeMinutes: 40, cookTimeMinutes: 15, servings: 4 })),
      withEmbedding(base({ id: 'kl-6', name: 'Basque Burnt Cheesecake', description: 'Deeply caramelized top, silky center.', price: 11, courseType: 'desserts', tags: ['Vegetarian'], allergenFree: [], chefName: 'Elena V.', rating: 5.0, timesServed: 231, cuisine: 'Spanish', ingredients: ['cream cheese', 'eggs', 'sugar', 'heavy cream', 'flour'], instructions: 'Blend batter until smooth, bake at high heat uncovered until deeply burnished and just-set in the center.', prepTimeMinutes: 15, cookTimeMinutes: 60, servings: 10 })),
      withEmbedding(base({ id: 'kl-7', name: 'Mango Sticky Rice', description: 'Coconut sticky rice, fresh mango, toasted sesame.', price: 9, courseType: 'desserts', tags: ['Vegan', 'Gluten-free'], allergenFree: ['Vegan', 'Gluten-free'], chefName: 'Nok S.', rating: 4.9, timesServed: 165, cuisine: 'Thai', ingredients: ['glutinous rice', 'coconut milk', 'mango', 'sugar', 'sesame seeds'], instructions: 'Steam glutinous rice, fold in sweetened coconut milk, serve with fresh mango and toasted sesame.', prepTimeMinutes: 20, cookTimeMinutes: 25, servings: 4 })),
      withEmbedding(base({ id: 'kl-8', name: 'Cardamom Chai Old Fashioned', description: 'Bourbon, chai reduction, orange bitters.', price: 14, courseType: 'drinks', tags: ['Contains alcohol'], allergenFree: [], chefName: 'James K.', rating: 4.8, timesServed: 89, cuisine: 'American', ingredients: ['bourbon', 'chai reduction', 'orange bitters', 'sugar cube'], instructions: 'Stir bourbon, chai reduction, and bitters over ice, express orange peel over the top.', prepTimeMinutes: 10, cookTimeMinutes: 15, servings: 1 })),
      withEmbedding(base({ id: 'kl-9', name: 'Hibiscus Cooler', description: 'Steeped hibiscus, lime, soda.', price: 6, courseType: 'drinks', tags: ['Vegan', 'Non-alcoholic'], allergenFree: ['Vegan'], chefName: 'Elena V.', rating: 4.7, timesServed: 178, cuisine: 'Mexican', ingredients: ['dried hibiscus', 'lime', 'soda water', 'agave syrup'], instructions: 'Steep hibiscus in hot water, sweeten with agave, cool, top with soda water and lime.', prepTimeMinutes: 10, cookTimeMinutes: 10, servings: 4 })),
    ];
  }
}
