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
import { AuthApi } from '../../shared/services/auth-api';
import { SupplierProfileService } from '../../shared/services/supplier-profile.service';
import { Header } from '../../components/header/header';
import { Footer } from '../../components/footer/footer';
import { capitalizeName } from '../../shared/utils/name-format';
import {
  PRODUCT_CATEGORY_OPTIONS,
  SupplierProfile as SupplierProfileModel,
} from '../../shared/models/supplier-profile.model';

type TabId = 'company' | 'products' | 'certifications' | 'settings';
const TAB_ORDER: readonly TabId[] = ['company', 'products', 'certifications', 'settings'];
const TAB_BAR_OFFSET = 130;

/** Same gap as Angular's built-in Validators.required — a whitespace-only
 *  value passes it. Identical to the validator used on the Foodie profile,
 *  duplicated here rather than shared to keep each page's form-validation
 *  file self-contained; if a third role needs the same thing, that's the
 *  point to extract it into shared/validators. */
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
  companyName: 'Company Name',
  productCategory: 'Product Category',
  address: 'Company Address',
  firstName: 'First Name',
  lastName: 'Last Name',
  email: 'Email',
  phoneNumber: 'Phone Number',
  website: 'Website',
  description: 'Company Description',
  yearEstablished: 'Year Established',
  serviceArea: 'Service Area',
};

@Component({
  selector: 'app-supplier-profile',
  standalone: true,
  imports: [ReactiveFormsModule, Header, Footer],
  templateUrl: './supplier-profile.html',
  styleUrl: './supplier-profile.scss',
})
export class SupplierProfile implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authApi = inject(AuthApi);
  private readonly profileService = inject(SupplierProfileService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChildren('sectionEl') private sectionEls!: QueryList<ElementRef<HTMLElement>>;

  readonly session = this.authApi.currentSession;
  readonly profile = signal<SupplierProfileModel | null>(null);
  readonly displayName = computed(() => {
    const companyName = this.profile()?.companyInfo?.companyName;
    if (companyName) return companyName;
    const s = this.session();
    return s ? `${capitalizeName(s.firstName)} ${capitalizeName(s.lastName)}`.trim() : '';
  });
  readonly productCategoryOptions = PRODUCT_CATEGORY_OPTIONS;

  readonly activeTab = signal<TabId>('company');
  readonly tabs: ReadonlyArray<{ id: TabId; label: string }> = [
    { id: 'company', label: 'Company Info' },
    { id: 'products', label: 'Products' },
    { id: 'certifications', label: 'Certifications' },
    { id: 'settings', label: 'Settings' },
  ];

  readonly switcherOpen = signal(false);
  readonly isEditing = signal(false);
  readonly isSaving = signal(false);
  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);

  readonly companyForm: FormGroup = this.fb.group({
    companyName: ['', [Validators.required, whitespaceValidator()]],
    productCategory: ['', [Validators.required]],
    address: ['', [Validators.required, whitespaceValidator()]],
    firstName: ['', [Validators.required, whitespaceValidator()]],
    lastName: ['', [Validators.required, whitespaceValidator()]],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: ['', [Validators.required, phoneValidator()]],
    website: ['', [Validators.pattern(/^https?:\/\/.+\..+/)]],
    description: ['', [Validators.required, Validators.maxLength(500)]],
    yearEstablished: ['', [Validators.min(1900), Validators.max(2024)]],
    serviceArea: [''],
  });

  readonly descriptionLength = computed(() => (this.companyForm.get('description')?.value ?? '').length);

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
          this.companyForm.patchValue(profile.companyInfo);
          this.companyForm.disable();
        },
        error: () => {
          this.isLoading.set(false);
          this.error.set('Something went wrong loading your profile. Please try again.');
        },
      });
  }

  // ─────────────────────────── Company Info ───────────────────────────

  hasError(fieldName: string): boolean {
    const control = this.companyForm.get(fieldName);
    return !!control && control.invalid && control.touched;
  }

  /** Same method, verbatim, as the Foodie profile and the real
   *  personal-info component this whole pattern is aligned to — one
   *  consistent set of error copy across every form in the app, not a
   *  slightly-different rewrite per page. */
  getErrorMessage(fieldName: string): string {
    const control = this.companyForm.get(fieldName);
    if (!control || !control.errors || !control.touched) {
      return '';
    }

    const errors = control.errors;
    if (errors['required']) return `${this.getFieldLabel(fieldName)} is required`;
    if (errors['minlength']) return `${this.getFieldLabel(fieldName)} must be at least ${errors['minlength'].requiredLength} characters`;
    if (errors['maxlength']) return `${this.getFieldLabel(fieldName)} must not exceed ${errors['maxlength'].requiredLength} characters`;
    if (errors['email']) return 'Please enter a valid email address';
    if (errors['phoneInvalid']) return 'Phone number must start with country code and contain digits only (e.g. +15551234567 or +44 7911123456)';
    if (errors['min']) return `${this.getFieldLabel(fieldName)} must be ${errors['min'].min} or later`;
    if (errors['max']) return `${this.getFieldLabel(fieldName)} must be ${errors['max'].max} or earlier`;
    if (errors['pattern']) return `${this.getFieldLabel(fieldName)} format is invalid`;
    if (errors['whitespace']) return `${this.getFieldLabel(fieldName)} cannot be empty or whitespace only`;

    return 'Invalid value';
  }

  private getFieldLabel(fieldName: string): string {
    return FIELD_LABELS[fieldName] ?? fieldName;
  }

  getProductCategoryLabel(value: string): string {
    return this.productCategoryOptions.find((c) => c.value === value)?.label ?? value;
  }

  canSave(): boolean {
    // Plain method, not computed() — see the identical note on the Foodie
    // profile: FormGroup.valid is a regular getter, not a Signal, so
    // computed() can't track it and would silently freeze at whatever it
    // read the first time. A method re-evaluates on every template check.
    return this.companyForm.valid;
  }

  enableEdit(): void {
    this.companyForm.enable();
    this.isEditing.set(true);
  }

  cancelEdit(): void {
    const current = this.profile();
    if (current) this.companyForm.patchValue(current.companyInfo);
    this.companyForm.markAsUntouched();
    this.companyForm.disable();
    this.isEditing.set(false);
  }

  saveCompanyInfo(): void {
    const userId = this.session()?.userId;
    if (!userId || !this.canSave()) {
      this.companyForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.error.set(null);
    this.profileService
      .updateCompanyInfo(userId, this.companyForm.getRawValue())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.profile.set(updated);
          this.isSaving.set(false);
          this.companyForm.markAsUntouched();
          this.companyForm.disable();
          this.isEditing.set(false);
        },
        error: () => {
          this.isSaving.set(false);
          this.error.set('Something went wrong saving your changes. Please try again.');
        },
      });
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
  // Same approach and same last-section fix as the Foodie profile.

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
