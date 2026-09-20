import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  OnInit,
  QueryList,
  ViewChildren,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthApi } from '../../shared/services/auth-api';
import { FoodieProfileService } from '../../shared/services/foodie-profile.service';
import { Header } from '../../components/header/header';
import { Footer } from '../../components/footer/footer';
import { capitalizeName } from '../../shared/utils/name-format';
import {
  CUISINE_OPTIONS,
  DIETARY_OPTIONS,
  FoodieProfile as FoodieProfileModel,
  OCCASION_OPTIONS,
} from '../../shared/models/foodie-profile.model';

type TabId = 'personal' | 'preferences' | 'membership' | 'settings';
const TAB_ORDER: readonly TabId[] = ['personal', 'preferences', 'membership', 'settings'];
/** nav (≈57px) + tab bar height — used both as the scroll-to offset and as
 *  the scroll-spy activation threshold, so clicking a tab and scrolling to
 *  it manually agree on where a section "counts" as arrived. */
const TAB_BAR_OFFSET = 110;

/** Angular's built-in Validators.required only rejects null/undefined/''  —
 *  a field containing nothing but spaces passes it. This is the well-known
 *  gap the reference component's getErrorMessage() already has a branch
 *  for (errors['whitespace']), so it needs a validator that actually
 *  produces that key. Deliberately doesn't fire on a genuinely empty
 *  value — that's required's job, and firing both here would just mean
 *  two error messages competing for the same field. */
function whitespaceValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as string | null;
    if (value == null || value.length === 0) return null;
    return value.trim().length === 0 ? { whitespace: true } : null;
  };
}

/** Must start with a country code and contain digits only after that —
 *  spaces between groups are tolerated (people type "+44 7911 123456"
 *  naturally) but stripped before validating the actual digit run.
 *  Matches the reference's own hint text: "+1 5551234567 or +44 7911 123456". */
function phoneValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as string | null;
    if (!value) return null; // required (if present) handles the empty case
    const stripped = value.replace(/\s+/g, '');
    return /^\+[1-9]\d{6,14}$/.test(stripped) ? null : { phoneInvalid: true };
  };
}

const FIELD_LABELS: Record<string, string> = {
  firstName: 'First Name',
  lastName: 'Last Name',
  email: 'Email',
  phone: 'Phone Number',
  address: 'Address',
  bio: 'About Me',
};

@Component({
  selector: 'app-foodie-profile',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, Header, Footer],
  templateUrl: './foodie-profile.html',
  styleUrl: './foodie-profile.scss',
})
export class FoodieProfile implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authApi = inject(AuthApi);
  private readonly profileService = inject(FoodieProfileService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChildren('sectionEl') private sectionEls!: QueryList<ElementRef<HTMLElement>>;

  readonly session = this.authApi.currentSession;
  readonly profile = signal<FoodieProfileModel | null>(null);
  readonly initials = computed(() => {
    const s = this.session();
    return s ? `${s.firstName.charAt(0)}${s.lastName.charAt(0)}`.toUpperCase() : '';
  });
  readonly displayName = computed(() => {
    const s = this.session();
    return s ? `${capitalizeName(s.firstName)} ${capitalizeName(s.lastName)}`.trim() : '';
  });

  readonly activeTab = signal<TabId>('personal');
  readonly tabs: ReadonlyArray<{ id: TabId; label: string }> = [
    { id: 'personal', label: 'Personal Info' },
    { id: 'preferences', label: 'Preferences' },
    { id: 'membership', label: 'Membership' },
    { id: 'settings', label: 'Settings' },
  ];

  readonly cuisineOptions = CUISINE_OPTIONS;

  // No real subscription/membership record exists anywhere in this app
  // yet (see pricing.ts's own TODO on submitProPayment) - defaulting to
  // 'free' here is not a placeholder standing in for missing data, it's
  // the actual, correct starting state: every account genuinely does
  // start on the Free plan, matching Pricing's own plan list.
  readonly membershipPlan = signal<'free' | 'pro' | 'enterprise'>('free');

  // Pricing's Plans section already has a real id ("pricing" - on the
  // <section> headed "Pick the plan that matches how often you host"),
  // but this app's router has no anchor-scrolling configured (confirmed
  // directly - provideRouter(routes) with no withInMemoryScrolling), so
  // a plain routerLink="/pricing" landed at the top of the page instead
  // of at the plans themselves. Same manual navigate-then-scroll pattern
  // already used everywhere else in this app for this exact situation.
  goToPricingPlans(): void {
    this.router.navigateByUrl('/pricing').then(() => {
      // A short settle delay before measuring - navigateByUrl's promise
      // resolves once the route change completes, but the newly
      // lazy-loaded Pricing page's layout isn't guaranteed to have
      // finished settling in that same tick, which produced an
      // inaccurate getBoundingClientRect() measurement (confirmed
      // directly - the scroll landed hundreds of pixels short of the
      // actual target).
      setTimeout(() => {
        const target = document.getElementById('pricing');
        if (!target) return;
        // Same reasoning and calculation as scrollToTab() above -
        // scrollIntoView's "start" alignment doesn't know about the
        // sticky nav sitting on top of the viewport at z-index 200, so it
        // landed the Plans heading partially hidden behind it. Measured
        // the nav's actual height directly rather than guessing a round
        // number.
        const headerOffset = document.querySelector('.nav')?.getBoundingClientRect().height ?? 0;
        const y = target.getBoundingClientRect().top + window.scrollY - headerOffset - 16;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }, 50);
    });
  }
  readonly dietaryOptions = DIETARY_OPTIONS;
  readonly occasionOptions = OCCASION_OPTIONS;

  readonly switcherOpen = signal(false);
  readonly isEditing = signal(false);
  readonly isSaving = signal(false);
  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);

  readonly personalInfoForm: FormGroup = this.fb.group({
    firstName: ['', [Validators.required, whitespaceValidator()]],
    lastName: ['', [Validators.required, whitespaceValidator()]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, phoneValidator()]],
    address: ['', [Validators.required, whitespaceValidator()]],
    bio: ['', [Validators.maxLength(500)]],
  });

  readonly bioLength = computed(() => (this.personalInfoForm.get('bio')?.value ?? '').length);

  /**
   * Deliberately a plain method, not computed(). FormGroup.valid is a
   * regular getter backed by Reactive Forms' own internal state, not a
   * Signal — computed() has no way to know when to re-run it, so it was
   * silently evaluating once (while the form was still empty and invalid)
   * and then never updating again, leaving Save permanently disabled even
   * once every field was actually valid. A plain method called directly
   * from the template gets re-checked on every change detection pass
   * instead, which is what this actually needs.
   */
  canSave(): boolean {
    return this.personalInfoForm.valid;
  }

  ngOnInit(): void {
    const userId = this.session()?.userId;
    // The authGuard on this route should make a missing session impossible
    // in practice, but a component shouldn't assume a guard upstream is the
    // only thing standing between it and a null value.
    if (!userId) {
      this.isLoading.set(false);
      return;
    }

    this.profileService
      .getProfile(userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          this.isLoading.set(false);
          if (!profile) {
            this.error.set('We couldn\u2019t find a profile for this account.');
            return;
          }
          this.profile.set(profile);
          this.personalInfoForm.patchValue(profile.personalInfo);
          this.personalInfoForm.disable(); // starts read-only, matches the reference HTML
        },
        error: () => {
          this.isLoading.set(false);
          this.error.set('Something went wrong loading your profile. Please try again.');
        },
      });
  }

  // ─────────────────────────── Personal Info ───────────────────────────

  hasError(fieldName: string): boolean {
    const control = this.personalInfoForm.get(fieldName);
    return !!control && control.invalid && control.touched;
  }

  /**
   * Verbatim from the existing personal-info component this page is being
   * aligned to — kept exactly as given rather than rewritten, so the error
   * copy a user sees here matches what they'd see anywhere else in the app
   * using the same method.
   */
  getErrorMessage(fieldName: string): string {
    const control = this.personalInfoForm.get(fieldName);
    if (!control || !control.errors || !control.touched) {
      return '';
    }

    const errors = control.errors;
    if (errors['required']) return `${this.getFieldLabel(fieldName)} is required`;
    if (errors['minlength']) return `${this.getFieldLabel(fieldName)} must be at least ${errors['minlength'].requiredLength} characters`;
    if (errors['maxlength']) return `${this.getFieldLabel(fieldName)} must not exceed ${errors['maxlength'].requiredLength} characters`;
    if (errors['email']) return 'Please enter a valid email address';
    if (errors['phoneInvalid']) return 'Phone number must start with country code and contain digits only (e.g. +15551234567 or +44 7911123456)';
    if (errors['pattern']) return `${this.getFieldLabel(fieldName)} format is invalid`;
    if (errors['whitespace']) return `${this.getFieldLabel(fieldName)} cannot be empty or whitespace only`;

    return 'Invalid value';
  }

  private getFieldLabel(fieldName: string): string {
    return FIELD_LABELS[fieldName] ?? fieldName;
  }

  enableEdit(): void {
    this.personalInfoForm.enable();
    this.isEditing.set(true);
  }

  cancelEdit(): void {
    const current = this.profile();
    if (current) this.personalInfoForm.patchValue(current.personalInfo);
    this.personalInfoForm.markAsUntouched();
    this.personalInfoForm.disable();
    this.isEditing.set(false);
  }

  saveProfile(): void {
    const userId = this.session()?.userId;
    if (!userId || !this.canSave()) {
      this.personalInfoForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.error.set(null);
    this.profileService
      .updatePersonalInfo(userId, this.personalInfoForm.getRawValue())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.profile.set(updated);
          this.isSaving.set(false);
          this.personalInfoForm.markAsUntouched();
          this.personalInfoForm.disable();
          this.isEditing.set(false);
        },
        error: () => {
          this.isSaving.set(false);
          this.error.set('Something went wrong saving your changes. Please try again.');
        },
      });
  }

  // ─────────────────────────── Preferences ────────────────────────────
  // No separate edit mode here, deliberately matching the reference HTML —
  // chips persist immediately on click, not behind a Save button.

  toggleCuisine(value: string): void {
    this.togglePreferenceItem('favoriteCuisines', value);
  }

  toggleDietary(value: string): void {
    this.togglePreferenceItem('dietaryPreferences', value);
  }

  toggleOccasion(value: string): void {
    this.togglePreferenceItem('typicalOccasions', value);
  }

  private togglePreferenceItem(
    key: 'favoriteCuisines' | 'dietaryPreferences' | 'typicalOccasions',
    value: string,
  ): void {
    const userId = this.session()?.userId;
    const current = this.profile();
    if (!userId || !current) return;

    const list = current.preferences[key];
    const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

    this.profileService
      .updatePreferences(userId, { [key]: next })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((updated) => this.profile.set(updated));
  }

  isCuisineSelected(value: string): boolean {
    return this.profile()?.preferences.favoriteCuisines.includes(value) ?? false;
  }

  isDietarySelected(value: string): boolean {
    return this.profile()?.preferences.dietaryPreferences.includes(value) ?? false;
  }

  isOccasionSelected(value: string): boolean {
    return this.profile()?.preferences.typicalOccasions.includes(value) ?? false;
  }

  // ───────────────────────────── Settings ─────────────────────────────
  // Same immediate-persist pattern as Preferences.

  toggleSetting(key: 'emailNotifications' | 'smsNotifications' | 'publicProfile'): void {
    const userId = this.session()?.userId;
    const current = this.profile();
    if (!userId || !current) return;

    this.profileService
      .updateSettings(userId, { [key]: !current.settings[key] })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((updated) => this.profile.set(updated));
  }

  // ──────────────────────── Profile switcher pill ─────────────────────

  toggleSwitcher(): void {
    this.switcherOpen.update((open) => !open);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.switcherOpen()) return;
    const target = event.target as HTMLElement;
    if (!target.closest('.switcher-wrap')) {
      this.switcherOpen.set(false);
    }
  }

  // ───────────────────── Tab bar: scroll-to + scroll-spy ────────────────
  // Same approach as the reference HTML: clicking a tab smooth-scrolls to
  // that section; scroll-spy tracks which section is currently under the
  // tab bar and highlights accordingly. Nothing is ever hidden — this is
  // navigation assistance over one continuous page, not a show/hide panel
  // switch. The naive "just use isIntersecting" version of this has a real
  // failure mode for the last section (there's nothing below it to scroll
  // past, so it can never satisfy a bottom-margin threshold) — ported the
  // same fix used in the reference: track every section's position
  // directly and force the last tab active once scrolled near the bottom.

  scrollToTab(tabId: TabId): void {
    const index = TAB_ORDER.indexOf(tabId);
    const target = this.sectionEls.get(index)?.nativeElement;
    if (!target) return;
    const y = target.getBoundingClientRect().top + window.scrollY - TAB_BAR_OFFSET;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (!this.sectionEls || this.sectionEls.length === 0) return;

    const scrollBottom = window.scrollY + window.innerHeight;
    const atPageBottom = scrollBottom >= document.documentElement.scrollHeight - 4;

    if (atPageBottom) {
      this.activeTab.set(TAB_ORDER[TAB_ORDER.length - 1]);
      return;
    }

    let active: TabId = TAB_ORDER[0];
    this.sectionEls.forEach((ref, i) => {
      if (ref.nativeElement.getBoundingClientRect().top - TAB_BAR_OFFSET <= 40) {
        active = TAB_ORDER[i];
      }
    });
    this.activeTab.set(active);
  }
}
