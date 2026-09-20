import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Header } from '../../components/header/header';
import { Footer } from '../../components/footer/footer';

interface WeeklyActivityPoint {
  readonly label: string;
  readonly value: number;
  readonly percentage: number;
}

interface DistributionSlice {
  readonly label: string;
  readonly value: number;
  readonly percentage: number;
  readonly color: string;
}

interface SubscriptionTier {
  readonly label: string;
  readonly value: number;
  readonly percentage: number;
}

interface ActivityEntry {
  readonly id: number;
  readonly icon: string;
  readonly color: string;
  readonly message: string;
  readonly user: string;
  readonly timestamp: string;
}

interface DonutSegment {
  readonly color: string;
  readonly dasharray: string;
  readonly dashoffset: number;
}

const WEEKLY_ACTIVITY: readonly WeeklyActivityPoint[] = [
  { label: 'Mon', value: 142, percentage: 62 },
  { label: 'Tue', value: 168, percentage: 74 },
  { label: 'Wed', value: 201, percentage: 88 },
  { label: 'Thu', value: 189, percentage: 83 },
  { label: 'Fri', value: 228, percentage: 100 },
  { label: 'Sat', value: 156, percentage: 68 },
  { label: 'Sun', value: 98, percentage: 43 },
];

const USER_TYPE_DISTRIBUTION: readonly DistributionSlice[] = [
  { label: 'Foodies', value: 11052, percentage: 60, color: '#f59e0b' },
  { label: 'Hosts', value: 5526, percentage: 30, color: '#6366f1' },
  { label: 'Suppliers', value: 1842, percentage: 10, color: '#10b981' },
];

const SUBSCRIPTION_TIERS: readonly SubscriptionTier[] = [
  { label: 'Enterprise', value: 946, percentage: 45 },
  { label: 'Professional', value: 736, percentage: 35 },
  { label: 'Basic', value: 421, percentage: 20 },
];

const RECENT_ACTIVITY: readonly ActivityEntry[] = [
  { id: 1, icon: '🎉', color: '#D4A94A', message: 'New event "Diwali Family Gathering" created', user: 'Priya Sharma', timestamp: '5 min ago' },
  { id: 2, icon: '👤', color: '#B5ABF0', message: 'New Host account verified', user: 'Marcus Webb', timestamp: '18 min ago' },
  { id: 3, icon: '🏷️', color: '#4A9B6E', message: 'Bid accepted for "Corporate Retreat Dinner"', user: 'Golden Spoon Catering', timestamp: '32 min ago' },
  { id: 4, icon: '✅', color: '#4A9B6E', message: "Menu approved for \"Rania's 40th Birthday\"", user: 'Rania Adler', timestamp: '1 hr ago' },
  { id: 5, icon: '⚠️', color: '#e2726c', message: 'Payment dispute flagged for review', user: 'System', timestamp: '2 hrs ago' },
  { id: 6, icon: '👤', color: '#B5ABF0', message: 'New Supplier account created', user: 'Sweetgrass Bakehouse', timestamp: '3 hrs ago' },
  { id: 7, icon: '🏷️', color: '#4A9B6E', message: '3 new bids submitted', user: 'Multiple hosts', timestamp: '4 hrs ago' },
  { id: 8, icon: '🎉', color: '#D4A94A', message: 'New event "Summer Solstice Dinner" created', user: 'James Okafor', timestamp: '6 hrs ago' },
];

const STATS = {
  totalUsers: 18420,
  growthRate: 12.4,
  newUsersLast7Days: 386,
  totalEvents: 1347,
  totalBids: 8906,
  totalAcceptedBids: 3241,
  totalMenuValidations: 2764,
  totalSubscriptions: 2103,
  activeUsers: 14208,
  revenueThisMonth: 184320,
  pendingReviews: 23,
} as const;

// Fixed platform-health readout, same as the reference mockup - this app
// has no real APM/monitoring backend to source live numbers from, so
// these stay honestly static rather than faking a live feed.
const PLATFORM_HEALTH = {
  apiUptime: '99.97%',
  avgResponse: '142ms',
  errorRate: '0.03%',
} as const;

/**
 * Admin Dashboard — converted from a standalone HTML/vanilla-JS mockup
 * into a real Angular component. The mockup's own script.js built every
 * section by hand-assembling innerHTML strings and re-querying the DOM
 * for state (sidebar collapsed/expanded, notifications open/closed, the
 * email-compose modal's validation) - all of that is signals/computed
 * here instead, the same conversion this app already did for Buuz and
 * Kitchen Lab.
 *
 * Uses the shared <app-header>/<app-footer> like every other page,
 * rather than the reference mockup's own standalone sidebar shell - the
 * sidebar (Overview nav item, "Back to App" link) is gone. The shared
 * header's own logo already routes to "/" the same as everywhere else in
 * the app, so it doubles as the way back out - no separate "Back to App"
 * control needed. Reached via the "Admin" link the shared header exposes
 * only to an admin-role session (see header.ts's navLinks()).
 *
 * Only the sections that had *real, wired-up* behavior in the mockup are
 * kept as real behavior: the Overview stats/charts/activity feed and the
 * Send Email quick action. The mockup's other nav items (Users, Events,
 * Bids, Subscriptions, Reports, Settings) were placeholders with no
 * actual click destinations wired in its script.js, so they were left
 * out entirely here rather than shipped as dead sidebar entries that
 * look clickable but go nowhere.
 */
@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [Header, Footer, ReactiveFormsModule, CurrencyPipe, DecimalPipe],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss',
})
export class AdminDashboard {
  private readonly fb = inject(FormBuilder);
  private readonly elementRef = inject(ElementRef);

  readonly stats = STATS;
  readonly platformHealth = PLATFORM_HEALTH;
  readonly weeklyActivity = WEEKLY_ACTIVITY;
  readonly userDistribution = USER_TYPE_DISTRIBUTION;
  readonly subscriptionTiers = SUBSCRIPTION_TIERS;
  readonly recentActivity = RECENT_ACTIVITY;

  // ── Donut (user-type distribution) ── same running-offset construction
  // as the mockup's script.js, just computed once here instead of
  // rebuilt into an SVG string every render.
  readonly totalProfiles = this.userDistribution.reduce((sum, d) => sum + d.value, 0);
  readonly donutSegments: readonly DonutSegment[] = (() => {
    let offset = 25;
    return this.userDistribution.map((d) => {
      const segment: DonutSegment = { color: d.color, dasharray: `${d.percentage} ${100 - d.percentage}`, dashoffset: offset };
      offset -= d.percentage;
      return segment;
    });
  })();

  // ── Notifications dropdown ──
  readonly notifOpen = signal(false);
  readonly notifPreview = this.recentActivity.slice(0, 5);

  toggleNotifications(): void {
    this.notifOpen.update((open) => !open);
  }

  closeNotifications(): void {
    this.notifOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.notifOpen()) return;
    const wrapper = this.elementRef.nativeElement.querySelector('.notif-wrapper');
    if (wrapper && !wrapper.contains(event.target)) {
      this.notifOpen.set(false);
    }
  }

  // ── Send Email quick action ── the mockup's only quick action with
  // real (if fake-network) submit behavior; validated the same way on
  // submit rather than as-you-type, matching the mockup's
  // validateEmailForm() exactly.
  readonly emailModalOpen = signal(false);
  readonly emailSubmitAttempted = signal(false);
  readonly emailSubmitting = signal(false);
  readonly emailSentSuccess = signal(false);

  readonly emailForm = this.fb.nonNullable.group({
    to: ['', [Validators.required, Validators.email]],
    subject: ['', [Validators.required, Validators.maxLength(150)]],
    body: ['', [Validators.required, Validators.maxLength(5000)]],
  });

  openEmailModal(): void {
    this.emailForm.reset({ to: '', subject: '', body: '' });
    this.emailSubmitAttempted.set(false);
    this.emailSentSuccess.set(false);
    this.emailModalOpen.set(true);
  }

  closeEmailModal(): void {
    this.emailModalOpen.set(false);
  }

  submitEmail(): void {
    this.emailSubmitAttempted.set(true);
    if (this.emailForm.invalid) return;

    this.emailSubmitting.set(true);
    // No real email-sending backend exists yet - this mirrors the
    // mockup's own fake-latency + success-state behavior exactly rather
    // than pretending a request actually went out.
    setTimeout(() => {
      this.emailSubmitting.set(false);
      this.emailSentSuccess.set(true);
      setTimeout(() => this.closeEmailModal(), 1400);
    }, 700);
  }

  fieldError(field: 'to' | 'subject' | 'body'): string | null {
    if (!this.emailSubmitAttempted()) return null;
    const control = this.emailForm.controls[field];
    if (!control.errors) return null;
    if (control.errors['required']) return `${this.fieldLabel(field)} is required`;
    if (control.errors['email']) return 'Enter a valid email address';
    if (control.errors['maxlength']) return `${this.fieldLabel(field)} is too long`;
    return 'Invalid value';
  }

  private fieldLabel(field: 'to' | 'subject' | 'body'): string {
    if (field === 'to') return 'Email';
    if (field === 'subject') return 'Subject';
    return 'Message';
  }
}
