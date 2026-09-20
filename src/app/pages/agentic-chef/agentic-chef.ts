import { Component, DestroyRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReviewMenuService } from '../../shared/services/review-menu.service';
import { AgenticChefService } from '../../shared/services/agentic-chef.service';
import { FoodieEvent } from '../../shared/models/foodie-event.model';
import { CourseSection } from '../../shared/models/menu/menu-recommendation.model';
import { ContextualValidationResult, ValidationIssue } from '../../shared/models/validation/validation-response.model';

type Stage = 'idle' | 'validating' | 'complete' | 'error';
type SectionKey = 'critical' | 'cc' | 'alignment' | 'budget' | 'recommended' | 'seasonal' | 'presentation' | 'nutritionist' | 'optional' | 'signature' | 'detailed';

/**
 * Agentic Chef — a Michelin-level validation pass over a specific
 * event's Smart Menu, run by 7 specialist agents (6 from the reference
 * this was built against, plus a genuinely new Nutritionist agent — see
 * AgenticChefService for why that one earns a real place here rather
 * than being folded into an existing agent).
 *
 * Originally a routed page (/agentic-chef/:eventId); converted to a
 * drawer opened from the Review Menu page, matching the same
 * self-contained pattern as BiddingDrawer: the parent supplies `event`
 * and `courses` as inputs (Review Menu already has both loaded — no
 * reason for this to independently re-fetch what's already on screen),
 * and this only ever tells the parent one thing — "I closed" — while
 * ReviewMenuService itself carries the "the menu changed" fact when
 * recommendations get attached.
 */
@Component({
  selector: 'app-agentic-chef',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './agentic-chef.html',
  styleUrl: './agentic-chef.scss',
})
export class AgenticChef implements OnChanges {
  private readonly reviewMenuService = inject(ReviewMenuService);
  readonly chefService = inject(AgenticChefService);
  private readonly destroyRef = inject(DestroyRef);

  @Input() event: FoodieEvent | null = null;
  @Input() courses: CourseSection[] = [];
  @Input() open = false;

  @Output() closed = new EventEmitter<void>();

  readonly agentDefs = this.chefService.agentDefs;

  readonly stage = signal<Stage>('idle');
  readonly result = signal<ContextualValidationResult | null>(null);
  readonly error = signal('');
  readonly openSections = signal<ReadonlySet<SectionKey>>(new Set(['critical', 'cc']));

  readonly userResponse = this.chefService.userResponse;
  readonly isAttached = this.chefService.isAttached;

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['open'] || !this.open || !this.event) return;

    const eventId = this.event.id;
    this.chefService.resetForNewEvent(eventId);

    // If this exact event already has a completed validation - saved to
    // localStorage the moment it completed, whether that was five
    // minutes ago in this tab or three days ago before a page reload -
    // show that result and decision directly rather than making the
    // person click "Start Review" again to see something that already
    // exists. Only a genuinely never-validated event opens on the idle
    // "Start Review" state.
    const persisted = this.chefService.getPersistedResult(eventId);
    if (persisted) {
      this.result.set(persisted);
      this.stage.set('complete');
      this.openSections.set(new Set(['critical', 'cc']));
      return;
    }

    this.stage.set('idle');
    this.result.set(null);
    this.error.set('');
    this.openSections.set(new Set(['critical', 'cc']));
  }

  readonly idleContext = computed(() => {
    const ev = this.event;
    return ev ? `Reviewing the Smart Menu for ${ev.eventName} \u2014 ${ev.guestCount} guests` : '';
  });

  startValidation(): void {
    const ev = this.event;
    if (!ev) return;
    this.stage.set('validating');
    this.error.set('');
    this.chefService
      .validate(ev, this.courses)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.result.set(r);
          this.stage.set('complete');
        },
        error: () => {
          this.error.set('Something went wrong reaching the validation agents. Please try again.');
          this.stage.set('error');
        },
      });
  }

  toggleSection(key: SectionKey): void {
    const next = new Set(this.openSections());
    if (next.has(key)) next.delete(key);
    else next.add(key);
    this.openSections.set(next);
  }
  isSectionOpen(key: SectionKey): boolean {
    return this.openSections().has(key);
  }

  isAccepted(id: string): boolean {
    return this.chefService.isAccepted(id);
  }
  isIgnored(id: string): boolean {
    return this.chefService.isIgnored(id);
  }
  acceptSuggestion(id: string): void {
    this.chefService.acceptSuggestion(id);
  }
  ignoreSuggestion(id: string): void {
    this.chefService.ignoreSuggestion(id);
  }
  private allIssueIds(): string[] {
    const r = this.result();
    if (!r) return [];
    return [...r.critical_issues, ...r.recommended_enhancements, ...(r.nutritionist_analysis?.suggestions ?? [])].map((i) => i.id);
  }

  acceptAll(): void {
    this.allIssueIds().forEach((id) => this.chefService.acceptSuggestion(id));
    this.chefService.acceptAll();
    // Every issue is already marked accepted by the two lines above, so
    // attaching immediately here is correct, not premature - there's no
    // separate "now decide which ones to attach" step this is skipping
    // ahead of. Once "Accept" has been clicked, the recommendations
    // belong on the Smart Menu; that shouldn't require a second,
    // separate button click to actually happen.
    this.attachToSmartMenuAndRouteToHost();
  }
  rejectAll(): void {
    this.allIssueIds().forEach((id) => this.chefService.ignoreSuggestion(id));
    this.chefService.rejectAll();
  }

  readonly approvalConfig = computed(() => {
    const r = this.result();
    if (!r) return null;
    if (r.approval_status === 'APPROVED') {
      return { icon: '✓', text: 'Approved', message: 'This menu is ready to go to the host as-is.', cssClass: 'banner--approved' };
    }
    if (r.approval_status === 'APPROVED_WITH_SUGGESTIONS') {
      return { icon: '✦', text: 'Approved, with suggestions', message: 'Ready to send \u2014 a few optional enhancements below would make it even stronger.', cssClass: 'banner--suggestions' };
    }
    return { icon: '!', text: 'Needs changes first', message: 'Resolve the critical items below before this goes to the host.', cssClass: 'banner--changes' };
  });

  readonly summaryPills = computed(() => {
    const r = this.result();
    if (!r) return [];
    return [
      { label: 'Critical', value: r.critical_issues.length },
      { label: 'Recommended', value: r.recommended_enhancements.length },
      { label: 'Optional', value: r.optional_improvements.length },
    ];
  });

  // The "at a glance" scorecard grid — the actual fix for "too linear".
  // Every one of these numbers already existed, buried inside its own
  // full-width accordion the user had to scroll past to find. Surfacing
  // them together, up top, means someone can see the whole shape of the
  // result in one glance instead of reading eleven stacked sections to
  // build that picture themselves. sectionKey reuses the exact keys
  // toggleSection()/isSectionOpen() already use — clicking a tile jumps
  // straight to (and opens) the detail section behind it, rather than
  // being a second, disconnected summary that duplicates the real one.
  readonly scorecards = computed(() => {
    const r = this.result();
    if (!r) return [];
    const tier = (score: number): 'good' | 'warn' | 'risk' => (score >= 8 ? 'good' : score >= 6 ? 'warn' : 'risk');
    const cards: { key: SectionKey; icon: string; label: string; score: number; tier: 'good' | 'warn' | 'risk' }[] = [
      { key: 'alignment', icon: '🎯', label: 'Alignment', score: r.alignment_score, tier: tier(r.alignment_score) },
      { key: 'budget', icon: '💷', label: 'Budget', score: r.budget_score, tier: tier(r.budget_score) },
      { key: 'seasonal', icon: '🌱', label: 'Seasonal', score: r.seasonal_score, tier: tier(r.seasonal_score) },
    ];
    if (r.presentation_score != null) {
      cards.push({ key: 'presentation', icon: '🎨', label: 'Presentation', score: r.presentation_score, tier: tier(r.presentation_score) });
    }
    if (r.nutritionist_analysis) {
      const s = r.nutritionist_analysis.score;
      cards.push({ key: 'nutritionist', icon: '🥗', label: 'Nutrition', score: s, tier: tier(s) });
    }
    const ccCount = r.cross_contamination_risks.length;
    cards.push({
      key: 'cc', icon: '⚠', label: 'Allergen Safety',
      score: ccCount === 0 ? 10 : Math.max(10 - ccCount * 2, 3),
      tier: ccCount === 0 ? 'good' : ccCount <= 1 ? 'warn' : 'risk',
    });
    return cards;
  });

  // Opens (not just toggles) the section a scorecard tile points to, and
  // scrolls it into view — clicking a tile should always land the person
  // looking at that detail, not silently close it if it happened to
  // already be open from a previous click.
  jumpToSection(key: SectionKey): void {
    const next = new Set(this.openSections());
    next.add(key);
    this.openSections.set(next);
    setTimeout(() => {
      document.getElementById(`ac-section-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  readonly alignmentEntries = computed(() => {
    const r = this.result();
    if (!r) return [];
    return Object.entries(r.alignment_breakdown).map(([label, status]) => ({ label, status, detail: null as string | null }));
  });

  formatLabel(s: string): string {
    return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  alignDotClass(status: string): string {
    return `align-dot align-dot--${status}`;
  }
  ccSeverityClass(sev: string): string {
    return `cc-severity cc-severity--${sev.toLowerCase()}`;
  }
  seasonalTypeClass(type: string): string {
    return `seasonal-type seasonal-type--${type.toLowerCase()}`;
  }
  agentStatusClass(status: string): string {
    const ok = status === 'PASS' || status === 'WITHIN_BUDGET' || status === 'UNDER_BUDGET';
    return `agent-status ${ok ? 'agent-status--pass' : 'agent-status--review'}`;
  }
  agentStatusLabel(status: string): string {
    return this.formatLabel(status.toLowerCase());
  }
  budgetVerdictCssKey(v: string): string {
    return v.toLowerCase().includes('over') ? 'over' : v.toLowerCase().includes('under') ? 'under' : v.toLowerCase().includes('at') ? 'tight' : 'good';
  }
  budgetVerdictIcon(v: string): string {
    const key = this.budgetVerdictCssKey(v);
    return key === 'over' ? '⚠' : key === 'under' ? '↓' : key === 'tight' ? '~' : '✓';
  }
  budgetVerdictLabel(v: string): string {
    return this.formatLabel(v.toLowerCase());
  }
  budgetCurrency(): string {
    return '$';
  }
  issueCardClass(issue: ValidationIssue): string {
    return `issue-card issue-card--orange ${this.isAccepted(issue.id) ? 'issue-card--accepted' : ''} ${this.isIgnored(issue.id) ? 'issue-card--ignored' : ''}`;
  }

  objectEntries<T>(obj: Record<string, T>): [string, T][] {
    return Object.entries(obj);
  }

  detailedAgents = computed(() => {
    const r = this.result();
    return r ? this.objectEntries(r.detailed_analysis) : [];
  });

  // ── Attach accepted recommendations to the Smart Menu, route to host ──
  readonly isRoutingToHost = signal(false);

  attachToSmartMenuAndRouteToHost(): void {
    const ev = this.event;
    const r = this.result();
    if (!ev || !r) return;
    this.isRoutingToHost.set(true);

    const allIssues = [...r.critical_issues, ...r.recommended_enhancements, ...(r.nutritionist_analysis?.suggestions ?? [])];
    const acceptedIssues = allIssues.filter((i) => this.isAccepted(i.id));
    const dishSpecific = acceptedIssues.filter((i) => i.dish !== 'Menu-wide');
    const menuWide = acceptedIssues.filter((i) => i.dish === 'Menu-wide');

    const updatedCourses = this.courses.map((course, courseIdx) => ({
      ...course,
      items: course.items.map((item, itemIdx) => {
        const isFirstItemOverall = courseIdx === 0 && itemIdx === 0;
        const dishNote = dishSpecific.find((i) => i.dish === item.name);
        const menuWideNote = isFirstItemOverall && menuWide.length > 0 ? menuWide[0] : null;
        const note = dishNote ?? menuWideNote;
        if (!note) return item;
        return { ...item, description: `${item.description} \u2014 Chef's note: ${note.fix}` };
      }),
    }));

    setTimeout(() => {
      this.reviewMenuService.replaceMenuForEvent(ev.id, updatedCourses);
      this.chefService.markAttached();
      this.isRoutingToHost.set(false);
    }, 900);
  }

  close(): void {
    this.closed.emit();
  }
}
