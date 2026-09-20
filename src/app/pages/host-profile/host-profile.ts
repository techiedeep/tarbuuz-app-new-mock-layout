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
import { RouterLink } from '@angular/router';
import { AuthApi } from '../../shared/services/auth-api';
import { HostProfileService } from '../../shared/services/host-profile.service';
import { Header } from '../../components/header/header';
import { Footer } from '../../components/footer/footer';
import {
  FEATURE_OPTIONS,
  HostProfile as HostProfileModel,
  VENUE_TYPE_OPTIONS,
} from '../../shared/models/host-profile.model';

// Menu Packages intentionally excluded — removed from this rebuild per
// request; the tab order below is the full, current tab set.
type TabId = 'overview' | 'venue' | 'features' | 'gallery' | 'settings';
const TAB_ORDER: readonly TabId[] = ['overview', 'venue', 'features', 'gallery', 'settings'];
const TAB_BAR_OFFSET = 130;

function whitespaceValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as string | null;
    if (value == null || value.length === 0) return null;
    return value.trim().length === 0 ? { whitespace: true } : null;
  };
}

function phoneValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as string | null;
    if (!value) return null;
    const stripped = value.replace(/\s+/g, '');
    return /^\+[1-9]\d{6,14}$/.test(stripped) ? null : { phoneInvalid: true };
  };
}

const FIELD_LABELS: Record<string, string> = {
  venueName: 'Venue Name',
  venueType: 'Venue Type',
  address: 'Address',
  firstName: 'First Name',
  lastName: 'Last Name',
  email: 'Email',
  phoneNumber: 'Phone Number',
  website: 'Website',
  description: 'Venue Description',
};

@Component({
  selector: 'app-host-profile',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, Header, Footer],
  templateUrl: './host-profile.html',
  styleUrl: './host-profile.scss',
})
export class HostProfile implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authApi = inject(AuthApi);
  private readonly profileService = inject(HostProfileService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChildren('sectionEl') private sectionEls!: QueryList<ElementRef<HTMLElement>>;

  readonly session = this.authApi.currentSession;
  readonly profile = signal<HostProfileModel | null>(null);
  readonly venueTypeOptions = VENUE_TYPE_OPTIONS;
  readonly featureOptions = FEATURE_OPTIONS;

  readonly activeTab = signal<TabId>('overview');
  readonly tabs: ReadonlyArray<{ id: TabId; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'venue', label: 'Venue Info' },
    { id: 'features', label: 'Features' },
    { id: 'gallery', label: 'Gallery' },
    { id: 'settings', label: 'Settings' },
  ];

  readonly switcherOpen = signal(false);
  readonly isEditing = signal(false);
  readonly isSaving = signal(false);
  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly showSuccessModal = signal(false);

  readonly venueForm: FormGroup = this.fb.group({
    venueName: ['', [Validators.required, whitespaceValidator()]],
    venueType: ['', [Validators.required]],
    address: ['', [Validators.required, whitespaceValidator()]],
    firstName: ['', [Validators.required, whitespaceValidator()]],
    lastName: ['', [Validators.required, whitespaceValidator()]],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: ['', [Validators.required, phoneValidator()]],
    website: ['', [Validators.pattern(/^https?:\/\/.+\..+/)]],
    description: ['', [Validators.maxLength(500)]],
  });

  readonly descriptionLength = computed(() => (this.venueForm.get('description')?.value ?? '').length);

  ngOnInit(): void {
    const userId = this.session()?.userId;
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
          this.venueForm.patchValue(profile.venueInfo);
          this.venueForm.disable();
        },
        error: () => {
          this.isLoading.set(false);
          this.error.set('Something went wrong loading your profile. Please try again.');
        },
      });
  }

  // ─────────────────────────── Venue Info ───────────────────────────

  hasError(fieldName: string): boolean {
    const control = this.venueForm.get(fieldName);
    return !!control && control.invalid && control.touched;
  }

  /** Same method, verbatim, as Foodie and Supplier — one consistent set of
   *  error copy across every form in the app. */
  getErrorMessage(fieldName: string): string {
    const control = this.venueForm.get(fieldName);
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

  getVenueTypeLabel(value: string): string {
    return this.venueTypeOptions.find((t) => t.value === value)?.label ?? value;
  }

  canSave(): boolean {
    // Plain method, not computed() — FormGroup.valid is a regular getter,
    // not a Signal, so computed() can't track it and would silently freeze
    // at whatever it read the first time.
    return this.venueForm.valid;
  }

  enableEdit(): void {
    this.venueForm.enable();
    this.isEditing.set(true);
  }

  cancelEdit(): void {
    const current = this.profile();
    if (current) this.venueForm.patchValue(current.venueInfo);
    this.venueForm.markAsUntouched();
    this.venueForm.disable();
    this.isEditing.set(false);
  }

  saveVenueInfo(): void {
    const userId = this.session()?.userId;
    if (!userId || !this.canSave()) {
      this.venueForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.error.set(null);
    this.profileService
      .updateVenueInfo(userId, this.venueForm.getRawValue())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.profile.set(updated);
          this.isSaving.set(false);
          this.venueForm.markAsUntouched();
          this.venueForm.disable();
          this.isEditing.set(false);
          this.showSuccessModal.set(true);
        },
        error: () => {
          this.isSaving.set(false);
          this.error.set('Something went wrong saving your changes. Please try again.');
        },
      });
  }

  closeSuccessModal(): void {
    this.showSuccessModal.set(false);
  }

  // ───────────────────────────── Features ─────────────────────────────

  isFeatureSelected(feature: string): boolean {
    return this.profile()?.features.includes(feature) ?? false;
  }

  toggleFeature(feature: string): void {
    const userId = this.session()?.userId;
    const current = this.profile();
    if (!userId || !current) return;

    const next = current.features.includes(feature)
      ? current.features.filter((f) => f !== feature)
      : [...current.features, feature];

    this.profileService
      .updateFeatures(userId, next)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((updated) => this.profile.set(updated));
  }

  // ───────────────────────────── Settings ─────────────────────────────

  toggleSetting(key: 'newBidAlerts' | 'smsNotifications' | 'publicProfile'): void {
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
