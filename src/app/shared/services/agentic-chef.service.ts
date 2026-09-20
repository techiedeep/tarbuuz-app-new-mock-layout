import { Injectable, signal } from '@angular/core';
import { Observable, delay, of, tap } from 'rxjs';
import {
  ContextualValidationResult,
  ValidationIssue,
  CCRisk,
  BudgetAnalysis,
  AlignmentBreakdown,
  SeasonalContext,
  SeasonalRecommendation,
  SignatureDish,
  AgentAnalysis,
  CoursePalette,
  DishCostItem,
  CostOptimizationItem,
} from '../models/validation/validation-response.model';
import { NutritionistAnalysis, DietaryCoverageItem } from '../models/validation/nutritionist-analysis.model';
import { CourseSection, MenuItem } from '../models/menu/menu-recommendation.model';
import { FoodieEvent } from '../models/foodie-event.model';

export interface AgentDef {
  readonly key: string;
  readonly name: string;
  readonly icon: string;
}

/**
 * Generates a genuinely data-driven ContextualValidationResult from a
 * real event + its actual Smart Menu — not a fixed mock. Budget verdict
 * comes from the menu's real per-guest cost against the event's real
 * budget; dietary coverage comes from counting how many actual dishes
 * carry each stated dietary tag; cross-contamination risks come from
 * scanning real dish tags for genuine allergen/nut-free conflicts within
 * the same course. Content that's inherently qualitative (the signature
 * dish, presentation commentary) is still crafted rather than computed,
 * but grounded in the event's real cuisine and season.
 *
 * No real AI/backend exists — matches the same mock-service pattern as
 * every other service in this app.
 */
// Everything a Foodie has done with a given event's validation - the
// generated result, their accept/reject call, which individual
// suggestions they accepted or ignored, and whether it's been attached
// to the Smart Menu. Stored per event id since two different events'
// decisions must never bleed into each other.
interface PersistedChefState {
  result: ContextualValidationResult;
  response: 'accept' | 'reject' | '';
  acceptedIds: string[];
  ignoredIds: string[];
  attached: boolean;
}

const STORAGE_KEY = 'tarbuuz.agenticChef.stateByEventId';

@Injectable({ providedIn: 'root' })
export class AgenticChefService {
  readonly agentDefs: readonly AgentDef[] = [
    { key: 'alignment', name: 'Alignment', icon: '🎯' },
    { key: 'budget', name: 'Budget', icon: '💷' },
    { key: 'cross_contamination', name: 'Allergen Safety', icon: '⚠' },
    { key: 'seasonal', name: 'Seasonal Fit', icon: '🌱' },
    { key: 'presentation', name: 'Presentation', icon: '🎨' },
    { key: 'nutritionist', name: 'Nutritionist', icon: '🥗' },
    { key: 'signature', name: "Chef's Creation", icon: '⭐' },
  ];

  // ── Accept/reject/ignore state, per issue id — always reflects
  // whichever event is currently loaded (see resetForNewEvent below),
  // not a fixed single event. ──
  private readonly acceptedIds = signal<ReadonlySet<string>>(new Set());
  private readonly ignoredIds = signal<ReadonlySet<string>>(new Set());
  private readonly overallResponse = signal<'accept' | 'reject' | ''>('');
  private readonly attachedToSmartMenu = signal(false);

  // The validation result and the decision made on it previously lived
  // only in memory - wiped on every page reload, and only ever
  // remembering one event at a time even within a single session. Real
  // persistence: every mutation below is written to localStorage keyed
  // by event id, and reading it back (in resetForNewEvent) is what lets
  // "already validated, already decided" survive a full reload, a
  // different tab, or coming back to this event days later - not just a
  // drawer close/reopen in the same session.
  private readonly lastResult = signal<ContextualValidationResult | null>(null);
  private currentEventId: string | null = null;

  // localStorage itself isn't reactive - a plain read from it inside a
  // computed() would never re-trigger that computed() when a NEW write
  // happens later in the same session (e.g. review-menu's button label
  // needs to flip from "Review With Agentic Chef" to "View
  // Recommendations" the moment validation completes, without the page
  // reloading). Bumping this signal on every write, and having anything
  // that reads persisted state also read this signal, is what makes
  // that reactivity real instead of accidentally only working after a
  // fresh page load.
  private readonly persistenceVersion = signal(0);

  private readAllPersisted(): Record<string, PersistedChefState> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Record<string, PersistedChefState>) : {};
    } catch {
      // Corrupt JSON, storage disabled (private browsing), or no
      // localStorage at all (SSR) - treated the same as "nothing saved
      // yet" rather than throwing and breaking the drawer.
      return {};
    }
  }

  private writePersisted(eventId: string, state: PersistedChefState): void {
    try {
      const all = this.readAllPersisted();
      all[eventId] = state;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      this.persistenceVersion.update((v) => v + 1);
    } catch {
      // Best-effort - a failed write shouldn't crash the accept/reject
      // action that triggered it; the in-memory signals are still
      // correct for the rest of this session either way.
    }
  }

  private persistCurrent(): void {
    if (!this.currentEventId || !this.lastResult()) return;
    this.writePersisted(this.currentEventId, {
      result: this.lastResult()!,
      response: this.overallResponse(),
      acceptedIds: [...this.acceptedIds()],
      ignoredIds: [...this.ignoredIds()],
      attached: this.attachedToSmartMenu(),
    });
  }

  getPersistedResult(eventId: string): ContextualValidationResult | null {
    return this.currentEventId === eventId ? this.lastResult() : null;
  }

  // Distinct from getPersistedResult above: that one only answers for
  // whichever event the drawer currently has loaded (currentEventId).
  // review-menu needs to know "has this event ever been validated" to
  // pick its own button's label - before the drawer has been opened
  // even once this session - so this checks localStorage directly
  // rather than going through the drawer's in-memory tracking at all.
  hasPersistedResult(eventId: string): boolean {
    this.persistenceVersion(); // establishes the reactive dependency - see comment above persistenceVersion's declaration
    return !!this.readAllPersisted()[eventId];
  }

  // Distinct from getPersistedResult too: that one (like the in-memory
  // signals it reads) only answers for whichever event is currently
  // loaded into this service. A page like submit-bid needs to know "did
  // the Foodie accept this event's chef recommendations" without ever
  // having opened this drawer itself on this page - so this reads
  // localStorage directly, the same way hasPersistedResult does, rather
  // than depending on currentEventId being set to a match that may
  // never happen on this particular page.
  getPersistedResponse(eventId: string): 'accept' | 'reject' | '' {
    this.persistenceVersion();
    return this.readAllPersisted()[eventId]?.response ?? '';
  }

  isAccepted(id: string): boolean {
    return this.acceptedIds().has(id);
  }
  isIgnored(id: string): boolean {
    return this.ignoredIds().has(id);
  }
  acceptSuggestion(id: string): void {
    const next = new Set(this.acceptedIds());
    next.add(id);
    this.acceptedIds.set(next);
    const ign = new Set(this.ignoredIds());
    ign.delete(id);
    this.ignoredIds.set(ign);
    this.persistCurrent();
  }
  ignoreSuggestion(id: string): void {
    const next = new Set(this.ignoredIds());
    next.add(id);
    this.ignoredIds.set(next);
    const acc = new Set(this.acceptedIds());
    acc.delete(id);
    this.acceptedIds.set(acc);
    this.persistCurrent();
  }
  readonly userResponse = this.overallResponse.asReadonly();
  readonly isAttached = this.attachedToSmartMenu.asReadonly();

  acceptAll(): void {
    this.overallResponse.set('accept');
    this.persistCurrent();
  }
  rejectAll(): void {
    this.overallResponse.set('reject');
    this.persistCurrent();
  }
  markAttached(): void {
    this.attachedToSmartMenu.set(true);
    this.persistCurrent();
  }
  // Takes the event id being opened. "Switching events" now means:
  // save whatever's currently loaded (already done by persistCurrent()
  // after each mutation, but harmless to be safe here too), then check
  // localStorage for a saved record belonging to the NEW event id. If
  // one exists — this event was already validated and possibly already
  // decided, whether that was five minutes ago in this tab or three days
  // ago in a different one — load it in directly: result, response,
  // accepted/ignored ids, attached flag, all of it. Only a genuinely
  // never-validated event falls through to a real reset.
  resetForNewEvent(eventId: string): void {
    if (this.currentEventId === eventId) return;
    this.currentEventId = eventId;

    const saved = this.readAllPersisted()[eventId];
    if (saved) {
      this.lastResult.set(saved.result);
      this.overallResponse.set(saved.response);
      this.acceptedIds.set(new Set(saved.acceptedIds));
      this.ignoredIds.set(new Set(saved.ignoredIds));
      this.attachedToSmartMenu.set(saved.attached);
      return;
    }

    this.acceptedIds.set(new Set());
    this.ignoredIds.set(new Set());
    this.overallResponse.set('');
    this.attachedToSmartMenu.set(false);
    this.lastResult.set(null);
  }

  private readonly SIMULATED_LATENCY_MS = 2400;

  validate(event: FoodieEvent, courses: readonly CourseSection[]): Observable<ContextualValidationResult> {
    const result = this.buildResult(event, courses);
    return of(result).pipe(
      delay(this.SIMULATED_LATENCY_MS),
      tap(() => {
        this.lastResult.set(result);
        this.currentEventId = event.id;
        // Freshly generated, nothing decided yet - persisted immediately
        // so even a reload between "validation finished" and "clicked
        // Accept" doesn't lose the result itself.
        this.writePersisted(event.id, {
          result,
          response: this.overallResponse(),
          acceptedIds: [...this.acceptedIds()],
          ignoredIds: [...this.ignoredIds()],
          attached: this.attachedToSmartMenu(),
        });
      }),
    );
  }

  private allItems(courses: readonly CourseSection[]): MenuItem[] {
    return courses.flatMap((c) => c.items);
  }

  private buildBudgetAnalysis(event: FoodieEvent, courses: readonly CourseSection[]): BudgetAnalysis {
    const items = this.allItems(courses);
    const perPerson = items.reduce((sum, i) => sum + i.price, 0);
    const budgetPerPerson = event.guestCount > 0 ? event.budget / event.guestCount : event.budget;
    const pct = budgetPerPerson > 0 ? Math.round((perPerson / budgetPerPerson) * 100) : 100;
    const verdict: BudgetAnalysis['budget_verdict'] =
      pct > 110 ? 'OVER_BUDGET' : pct > 95 ? 'AT_BUDGET' : pct < 60 ? 'UNDER_BUDGET' : 'WITHIN_BUDGET';
    const sorted = [...items].sort((a, b) => b.price - a.price);
    return {
      budget_per_person: Math.round(budgetPerPerson),
      estimated_cost_per_person: Math.round(perPerson),
      estimated_food_cost_pct: Math.min(pct, 999),
      budget_verdict: verdict,
      primary_cost_drivers: sorted.slice(0, 2).map((i) => i.name),
    };
  }

  private buildDishCostBreakdown(courses: readonly CourseSection[]): DishCostItem[] {
    return this.allItems(courses).map((item) => ({
      dish: item.name,
      category: courses.find((c) => c.items.includes(item))?.title ?? '',
      cost_band: item.price >= 22 ? 'PREMIUM' : item.price >= 12 ? 'MID' : 'ECONOMY',
      verdict: 'pass',
    }));
  }

  private buildCostOptimization(
    event: FoodieEvent,
    courses: readonly CourseSection[],
    budget: BudgetAnalysis,
  ): CostOptimizationItem[] {
    if (budget.budget_verdict !== 'OVER_BUDGET') return [];
    const items = this.allItems(courses);
    const priciest = [...items].sort((a, b) => b.price - a.price)[0];
    if (!priciest) return [];
    return [
      {
        dish: priciest.name,
        current_issue: `At $${priciest.price}/guest, this is the single largest line item on the menu.`,
        suggestion: 'Consider a comparable but lower-cost preparation, or reduce the portion size slightly without changing the dish itself.',
        saving: `~$${Math.round(priciest.price * 0.25)}/guest`,
        quality_impact: 'minimal',
      },
    ];
  }

  private buildAlignment(
    event: FoodieEvent,
    courses: readonly CourseSection[],
  ): { breakdown: AlignmentBreakdown; score: number; notes: string } {
    const items = this.allItems(courses);
    const cuisineMatch = event.preferredCuisines.length === 0 || items.length > 0;
    const dietaryOk = event.dietaryPreferences.every((need) =>
      items.some((i) => i.tags.some((t) => t.toLowerCase().includes(need.toLowerCase().split('-')[0]))),
    );
    const hasVariety = new Set(items.map((i) => i.name)).size === items.length && items.length >= 4;
    const breakdown: AlignmentBreakdown = {
      query_intent: 'pass',
      cuisine_accuracy: cuisineMatch ? 'pass' : 'warning',
      event_suitability: 'pass',
      dietary_compliance: dietaryOk ? 'pass' : 'warning',
      allergen_compliance: 'pass',
      additional_requests: event.specialRequest ? 'pass' : 'not_applicable',
      variety_and_balance: hasVariety ? 'pass' : 'warning',
    };
    const passCount = Object.values(breakdown).filter((v) => v === 'pass').length;
    const applicable = Object.values(breakdown).filter((v) => v !== 'not_applicable').length;
    const score = Math.round((passCount / Math.max(applicable, 1)) * 10 * 10) / 10;
    const notes = dietaryOk
      ? `The menu genuinely reflects the ${event.guestCount}-guest brief — cuisine, course count, and stated preferences are all accounted for.`
      : `Most of the brief is well covered, but at least one stated dietary need (${event.dietaryPreferences.join(', ')}) doesn't have a clearly compliant dish yet — see Nutritionist section for specifics.`;
    return { breakdown, score, notes };
  }

  private buildCrossContamination(courses: readonly CourseSection[]): CCRisk[] {
    const risks: CCRisk[] = [];
    let idCounter = 1;
    for (const course of courses) {
      const nutFree = course.items.filter((i) => i.allergenFree.some((a) => a.toLowerCase().includes('nut')));
      const others = course.items.filter((i) => !i.allergenFree.some((a) => a.toLowerCase().includes('nut')));
      if (nutFree.length > 0 && others.length > 0) {
        risks.push({
          id: `cc-${idCounter++}`,
          at_risk_dish: nutFree[0].name,
          source_dishes: others.slice(0, 2).map((o) => o.name),
          equipment: 'shared prep surface',
          allergen: 'tree nuts',
          severity: 'MEDIUM',
          impact: 'MEDIUM',
          pathway_description: `${nutFree[0].name} is plated as nut-free, but shares the ${course.title.toLowerCase()} station with dishes that aren't — cross-contact is possible without a dedicated prep step.`,
          mitigation: 'Prep the nut-free dish first, on a cleaned surface, with its own utensils, before any nut-containing dish touches that station.',
        });
      }
    }
    return risks;
  }

  private deriveSeason(dateStr: string): 'spring' | 'summer' | 'autumn' | 'winter' {
    const month = dateStr ? new Date(dateStr + 'T00:00:00').getMonth() + 1 : new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'autumn';
    return 'winter';
  }

  private buildSeasonal(
    event: FoodieEvent,
    courses: readonly CourseSection[],
  ): { context: SeasonalContext; recs: SeasonalRecommendation[]; score: number } {
    const season = this.deriveSeason(event.eventDate);
    const seasonalPicks: Record<string, { dish: string; desc: string; peak: string }> = {
      spring: { dish: 'Spring Pea & Mint Crostini', desc: 'Fresh English peas, mint, ricotta, on a light toasted crostini.', peak: 'Peas and mint both peak March\u2013May.' },
      summer: { dish: 'Heirloom Tomato & Stone Fruit Salad', desc: 'Heirloom tomatoes, ripe peach, basil, aged balsamic.', peak: 'Tomatoes and stone fruit both peak June\u2013August.' },
      autumn: { dish: 'Roasted Squash & Sage Crostini', desc: 'Butternut squash, brown butter, crispy sage, toasted hazelnut.', peak: 'Winter squash peaks September\u2013November.' },
      winter: { dish: 'Citrus & Pomegranate Salad', desc: 'Blood orange, pomegranate, shaved fennel, mint.', peak: 'Citrus and pomegranate both peak December\u2013February.' },
    };
    const pick = seasonalPicks[season];
    const context: SeasonalContext = {
      event_date: event.eventDate || null,
      location: event.eventLocation || null,
      derived_season: season,
      derivation_note: event.eventDate ? `Derived from the event date (${event.eventDate}).` : 'No event date provided \u2014 assumed from today\u2019s date.',
      assumption_note: null,
    };
    const recs: SeasonalRecommendation[] = [
      {
        type: 'ADD',
        dish_name: pick.dish,
        description: pick.desc,
        reason: `A ${season} addition would round out the starters with something genuinely in-season rather than shipped-in.`,
        replaces: null,
        course: 'starters',
        dietary_info: ['Vegetarian'],
        allergens: season === 'autumn' ? ['Tree Nuts'] : [],
        seasonal_peak: pick.peak,
      },
    ];
    return { context, recs, score: 7.5 };
  }

  private buildPresentation(courses: readonly CourseSection[]): { palettes: Record<string, CoursePalette>; score: number } {
    const palettes: Record<string, CoursePalette> = {};
    for (const course of courses) {
      const colorWords = ['green', 'red', 'yellow', 'white', 'brown', 'orange', 'purple'];
      const found = new Set<string>();
      for (const item of course.items) {
        const text = (item.name + ' ' + item.description).toLowerCase();
        colorWords.forEach((c) => {
          if (text.includes(c)) found.add(c);
        });
      }
      const mono = found.size <= 1 && course.items.length > 1;
      palettes[course.id] = {
        color_count: found.size || 1,
        colors_present: Array.from(found).length ? Array.from(found) : ['neutral tones'],
        monochromatic: mono,
        verdict: mono ? 'warning' : 'pass',
        recommendation: mono ? `Consider a bright herb garnish or a colorful side element to lift ${course.title.toLowerCase()} visually.` : null,
      };
    }
    const warnCount = Object.values(palettes).filter((p) => p.monochromatic).length;
    return { palettes, score: Math.max(10 - warnCount * 1.5, 5) };
  }

  private buildSignatureDish(event: FoodieEvent): SignatureDish {
    const cuisine = event.preferredCuisines[0] ?? 'Seasonal';
    const season = this.deriveSeason(event.eventDate);
    return {
      name: `${event.eventName.split(' ')[0]}'s ${cuisine} Table`,
      tagline: 'A one-off dish, created for this event and this guest list only.',
      course: 'main_courses',
      description: `A ${cuisine.toLowerCase()}-rooted centerpiece built specifically around this event's guest count and season, designed to be the dish people ask about afterward.`,
      inspiration: `Drawn directly from the ${cuisine} cuisine already anchoring this menu, reinterpreted for a ${season} table.`,
      creative_twist: 'A textural contrast course \u2014 something crisp against something braised \u2014 rather than a single dominant texture across the whole plate.',
      dietary_info: event.dietaryPreferences.length ? [...event.dietaryPreferences] : ['Adaptable'],
      allergens: [],
      quantity: `${event.guestCount} servings`,
      calorie_count: 520,
      ingredients: [
        { ingredient: 'Base protein or centerpiece vegetable', quantity: `${event.guestCount} portions`, note: 'Sourced to match the stated budget tier' },
        { ingredient: 'Seasonal accompaniment', quantity: 'to taste' },
        { ingredient: 'Finishing element (herb oil, reduction, or crumble)', quantity: 'as garnish' },
      ],
      method: [
        'Prep the base component the morning of, holding at temperature.',
        'Build the seasonal accompaniment fresh, no more than 2 hours ahead.',
        'Plate to order, finishing element added last for visual impact.',
      ],
      plating: 'Centered, slightly off-axis, with the finishing element drizzled rather than pooled.',
      pairing: 'A crisp, low-tannin pour that won\u2019t compete with the dish\u2019s own seasoning.',
      chef_notes: `Built specifically for ${event.eventName} \u2014 not on the standard menu anywhere else.`,
    };
  }

  private buildNutritionist(event: FoodieEvent, courses: readonly CourseSection[]): NutritionistAnalysis {
    const items = this.allItems(courses);
    const coverage: DietaryCoverageItem[] = event.dietaryPreferences.map((need) => {
      const keyword = need.toLowerCase().split('-')[0];
      const compliant = items.filter((i) => i.tags.some((t) => t.toLowerCase().includes(keyword)));
      const ratio = items.length > 0 ? compliant.length / items.length : 0;
      const verdict: DietaryCoverageItem['verdict'] = compliant.length === 0 ? 'gap' : ratio < 0.4 ? 'thin' : 'covered';
      return {
        need,
        guestsAffected: null,
        compliantDishCount: compliant.length,
        totalDishCount: items.length,
        verdict,
        note:
          verdict === 'gap'
            ? `No dish on the current menu is tagged ${need} \u2014 this needs a genuine substitution, not just a garnish swap.`
            : verdict === 'thin'
              ? `Only ${compliant.length} of ${items.length} dishes are ${need} \u2014 comfortable for a couple of guests, tight if more than a handful need it.`
              : `${compliant.length} of ${items.length} dishes are ${need} \u2014 solid coverage across the meal.`,
      };
    });

    const estCalories = items.length * 380;
    const macroBalance = [
      {
        label: 'Protein',
        observation: items.some((i) => /chicken|beef|paneer|tofu|fish|lamb/i.test(i.name + i.description))
          ? 'At least one substantial protein source is present in the main course lineup.'
          : 'No single dish reads as a clear primary protein \u2014 worth confirming guests will leave satisfied, not just satiated.',
      },
      {
        label: 'Freshness',
        observation: items.some((i) => i.tags.some((t) => /vegan|vegetarian/i.test(t)))
          ? 'Good presence of fresh, plant-forward dishes balancing the richer courses.'
          : 'The menu leans richer across the board \u2014 a bright, acidic element somewhere would help cut through.',
      },
    ];

    const gapCount = coverage.filter((c) => c.verdict === 'gap').length;
    const score = Math.max(10 - gapCount * 2.5, 4);

    const suggestions: ValidationIssue[] = coverage
      .filter((c) => c.verdict !== 'covered')
      .map((c, i) => ({
        id: `nutr-${i + 1}`,
        agent: 'Nutritionist',
        tier: c.verdict === 'gap' ? 'critical' : 'recommended',
        dish: 'Menu-wide',
        issue: c.note,
        fix: `Add or convert one dish to genuinely satisfy ${c.need} \u2014 not a side note, a real dish a guest with that need would be glad to see.`,
        priority: c.verdict === 'gap' ? 1 : 2,
        impact: c.verdict === 'gap' ? 'HIGH' : 'MEDIUM',
      }));

    return {
      overallNotes:
        gapCount > 0
          ? `The menu is strong overall, but ${gapCount} stated dietary need${gapCount === 1 ? '' : 's'} genuinely need${gapCount === 1 ? 's' : ''} a real dish, not an adaptation of an existing one.`
          : 'Every stated dietary need has real, dedicated coverage on this menu \u2014 not just an adapted version of something else.',
      estimatedCaloriesPerGuest: estCalories,
      macroBalance,
      dietaryCoverage: coverage,
      paletteProgressionNote:
        items.length >= 3
          ? 'Course order builds sensibly from lighter to richer \u2014 no two heavy, dense dishes land back-to-back.'
          : 'With this few courses, sequencing matters less \u2014 the main event is doing most of the work.',
      hydrationNote: 'Standard water/non-alcoholic service is enough here \u2014 nothing on this menu is unusually salty or spice-forward enough to need extra hydration planning.',
      suggestions,
      score: Math.round(score * 10) / 10,
    };
  }

  private buildDetailedAnalysis(
    alignment: { breakdown: AlignmentBreakdown; score: number; notes: string },
    budget: BudgetAnalysis,
    ccCount: number,
    seasonalScore: number,
    presentationScore: number,
    nutritionist: NutritionistAnalysis,
  ): Record<string, AgentAnalysis> {
    return {
      Alignment: {
        icon: '🎯',
        score: alignment.score,
        status: alignment.score >= 8 ? 'PASS' : 'REVIEW',
        notes: alignment.notes,
        checks: Object.entries(alignment.breakdown).map(([name, status]) => ({
          name: name.replace(/_/g, ' '),
          status: status === 'pass' ? 'pass' : status === 'not_applicable' ? 'pass' : 'warning',
          detail: status,
        })),
      },
      Budget: {
        icon: '💷',
        score: budget.budget_verdict === 'OVER_BUDGET' ? 5 : 8.5,
        status: budget.budget_verdict,
        notes: `Estimated at $${budget.estimated_cost_per_person}/guest against a $${budget.budget_per_person}/guest budget (${budget.estimated_food_cost_pct}%).`,
        checks: [{ name: 'Per-guest cost vs budget', status: budget.budget_verdict === 'OVER_BUDGET' ? 'fail' : 'pass', detail: budget.budget_verdict }],
      },
      'Allergen Safety': {
        icon: '⚠',
        score: ccCount === 0 ? 10 : ccCount === 1 ? 7.5 : 5.5,
        status: ccCount === 0 ? 'PASS' : 'REVIEW',
        notes:
          ccCount === 0
            ? 'No shared-equipment allergen pathways detected across courses.'
            : `${ccCount} shared-equipment pathway${ccCount === 1 ? '' : 's'} identified \u2014 see Cross-Contamination section for mitigation steps.`,
        checks: [{ name: 'Cross-contact pathways', status: ccCount === 0 ? 'pass' : 'warning', detail: `${ccCount} found` }],
      },
      'Seasonal Fit': {
        icon: '🌱',
        score: seasonalScore,
        status: 'PASS',
        notes: 'Menu is broadly in-season; one enhancement suggested to sharpen it further.',
        checks: [{ name: 'Seasonal alignment', status: 'pass', detail: 'in-season' }],
      },
      Presentation: {
        icon: '🎨',
        score: presentationScore,
        status: presentationScore >= 8 ? 'PASS' : 'REVIEW',
        notes: 'Color and texture variety assessed per course \u2014 see Presentation section for any monochromatic flags.',
        checks: [{ name: 'Color variety per course', status: presentationScore >= 8 ? 'pass' : 'warning', detail: `${presentationScore}/10` }],
      },
      Nutritionist: {
        icon: '🥗',
        score: nutritionist.score,
        status: nutritionist.score >= 8 ? 'PASS' : 'REVIEW',
        notes: nutritionist.overallNotes,
        checks: nutritionist.dietaryCoverage.map((c) => ({
          name: c.need,
          status: c.verdict === 'covered' ? 'pass' : c.verdict === 'thin' ? 'warning' : 'fail',
          detail: c.note,
        })),
      },
    };
  }

  private buildResult(event: FoodieEvent, courses: readonly CourseSection[]): ContextualValidationResult {
    const budget = this.buildBudgetAnalysis(event, courses);
    const dishCosts = this.buildDishCostBreakdown(courses);
    const costOptimization = this.buildCostOptimization(event, courses, budget);
    const alignment = this.buildAlignment(event, courses);
    const ccRisks = this.buildCrossContamination(courses);
    const seasonal = this.buildSeasonal(event, courses);
    const presentation = this.buildPresentation(courses);
    const signatureDish = this.buildSignatureDish(event);
    const nutritionist = this.buildNutritionist(event, courses);
    const detailed = this.buildDetailedAnalysis(alignment, budget, ccRisks.length, seasonal.score, presentation.score, nutritionist);

    const criticalIssues: ValidationIssue[] = [];
    if (budget.budget_verdict === 'OVER_BUDGET') {
      criticalIssues.push({
        id: 'crit-budget',
        agent: 'Budget',
        tier: 'critical',
        dish: 'Menu-wide',
        issue: `Estimated cost is $${budget.estimated_cost_per_person}/guest against a $${budget.budget_per_person}/guest budget \u2014 ${budget.estimated_food_cost_pct}% of target.`,
        fix: 'Apply the cost-optimization suggestion below, or discuss a budget adjustment with the host before approving.',
        priority: 1,
        impact: 'BLOCKING',
      });
    }
    nutritionist.dietaryCoverage
      .filter((c) => c.verdict === 'gap')
      .forEach((c, i) => {
        criticalIssues.push({
          id: `crit-diet-${i}`,
          agent: 'Nutritionist',
          tier: 'critical',
          dish: 'Menu-wide',
          issue: c.note,
          fix: `Add a genuine ${c.need} dish before this menu goes to the host.`,
          priority: 1,
          impact: 'BLOCKING',
        });
      });

    const recommendedEnhancements: ValidationIssue[] = [
      ...costOptimization.map(
        (opt, i): ValidationIssue => ({
          id: `rec-cost-${i}`,
          agent: 'Budget',
          tier: 'recommended',
          dish: opt.dish,
          issue: opt.current_issue,
          fix: opt.suggestion,
          priority: 2,
          impact: 'MEDIUM',
        }),
      ),
      ...nutritionist.suggestions.filter((s) => s.tier === 'recommended'),
    ];

    const optionalImprovements: ValidationIssue[] = Object.entries(presentation.palettes)
      .filter(([, p]) => p.monochromatic)
      .map(
        ([courseId, p], i): ValidationIssue => ({
          id: `opt-pres-${i}`,
          agent: 'Presentation',
          tier: 'optional',
          dish: courses.find((c) => c.id === courseId)?.title ?? courseId,
          issue: 'This course reads visually monochromatic.',
          fix: p.recommendation ?? 'Add a bright garnish or colorful side element.',
          priority: 3,
          impact: 'LOW',
        }),
      );

    const overallScore =
      Math.round(
        ((alignment.score + (budget.budget_verdict === 'OVER_BUDGET' ? 5 : 8.5) + seasonal.score + presentation.score + nutritionist.score) / 5) * 10,
      ) / 10;
    const approvalStatus =
      criticalIssues.length > 0 ? 'REQUIRES_CHANGES' : recommendedEnhancements.length > 0 ? 'APPROVED_WITH_SUGGESTIONS' : 'APPROVED';

    return {
      approval_status: approvalStatus,
      overall_score: overallScore,
      processing_time: 3.2,
      executive_summary:
        criticalIssues.length > 0
          ? `This menu needs ${criticalIssues.length} thing${criticalIssues.length === 1 ? '' : 's'} addressed before it's ready for ${event.eventName} \u2014 mostly around ${criticalIssues[0].agent.toLowerCase()}.`
          : `This menu is genuinely ready for ${event.eventName} \u2014 ${recommendedEnhancements.length} optional enhancement${recommendedEnhancements.length === 1 ? '' : 's'} would sharpen it further, but nothing is blocking.`,
      alignment_breakdown: alignment.breakdown,
      alignment_score: alignment.score,
      alignment_notes: alignment.notes,
      cross_contamination_risks: ccRisks,
      cross_contamination_service_risk: { detected_style: 'plated', amplifies_risk: false, note: null },
      cc_score: ccRisks.length === 0 ? 10 : 7,
      budget_analysis: budget,
      dish_cost_breakdown: dishCosts,
      cost_optimization_plan: costOptimization,
      budget_score: budget.budget_verdict === 'OVER_BUDGET' ? 5 : 8.5,
      seasonal_context: seasonal.context,
      seasonal_recommendations: seasonal.recs,
      seasonal_score: seasonal.score,
      signature_dish: signatureDish,
      critical_issues: criticalIssues,
      recommended_enhancements: recommendedEnhancements,
      optional_improvements: optionalImprovements,
      presentation_score: presentation.score,
      presentation_course_palettes: presentation.palettes,
      presentation_vessel_recommendations: [],
      detailed_analysis: detailed,
      nutritionist_analysis: nutritionist,
      user_response: '',
    };
  }
}
