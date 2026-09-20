import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Header } from '../../components/header/header';
import { Footer } from '../../components/footer/footer';

const ROLE_WORDS = ['Engineer', 'Designer', 'Storyteller', 'Problem-solver', 'Host'] as const;

const TEAMS = [
  {
    key: 'engineering',
    name: 'Engineering & AI',
    size: 'lg',
    pitch: 'Build the systems that plan a stranger\u2019s wedding menu in four seconds.',
  },
  {
    key: 'culinary',
    name: 'Culinary & Supply Ops',
    size: 'sm',
    pitch: 'Keep a promise an algorithm made to two hundred real guests.',
  },
  {
    key: 'design',
    name: 'Design',
    size: 'md',
    pitch: 'Make something inherently chaotic feel effortless.',
  },
  {
    key: 'growth',
    name: 'Growth & Partnerships',
    size: 'md',
    pitch: 'Find the hosts and chefs who make the marketplace worth joining.',
  },
] as const;

const INTEREST_AREAS = ['Engineering & AI', 'Culinary & Supply Ops', 'Design', 'Growth & Partnerships', 'Something else'] as const;

/**
 * Careers — was a dead Footer link (routes.constants had '/careers'
 * defined, but no route ever registered for it, same gap Contact had
 * before it got a real destination). This is a general expression-of-
 * interest page rather than a job board with specific postings — Tarbuuz
 * doesn't have a fixed list of open reqs to fill, so pretending otherwise
 * with fabricated job titles and fake requirements would be dishonest
 * content dressed as real listings. "Which team are you interested in"
 * plus "tell us what you want to build" gets someone's real interest on
 * record without inventing postings that don't exist.
 */
@Component({
  selector: 'app-careers',
  standalone: true,
  imports: [Header, Footer, ReactiveFormsModule],
  templateUrl: './careers.html',
  styleUrl: './careers.scss',
})
export class Careers implements OnInit, OnDestroy {
  readonly roleWords = ROLE_WORDS;
  readonly teams = TEAMS;
  readonly interestAreas = INTEREST_AREAS;

  // One deliberate, orchestrated motion moment for the whole page (per
  // the design brief: a single considered reveal beats scattered hover
  // effects everywhere) — the hero's role word cycles through the actual
  // range of people Tarbuuz is looking for, rather than sitting static.
  readonly activeRoleIndex = signal(0);
  private roleInterval?: ReturnType<typeof setInterval>;

  readonly form: FormGroup;
  readonly submitted = signal(false);
  readonly isSubmitting = signal(false);

  constructor(private readonly fb: FormBuilder) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      area: [INTEREST_AREAS[0], Validators.required],
      pitch: ['', [Validators.required, Validators.minLength(20)]],
      link: [''],
    });
  }

  ngOnInit(): void {
    this.roleInterval = setInterval(() => {
      this.activeRoleIndex.update((i) => (i + 1) % ROLE_WORDS.length);
    }, 2200);
  }

  ngOnDestroy(): void {
    if (this.roleInterval) clearInterval(this.roleInterval);
  }

  selectArea(area: string): void {
    this.form.get('area')?.setValue(area);
  }

  fieldError(field: string): string | null {
    const control = this.form.get(field);
    if (!control || !control.touched || control.valid) return null;
    if (control.errors?.['required']) return 'This field is required.';
    if (control.errors?.['email']) return 'Enter a valid email address.';
    if (control.errors?.['minlength']) {
      const needed = control.errors['minlength'].requiredLength;
      return `A little more detail helps \u2014 at least ${needed} characters.`;
    }
    return null;
  }

  markTouched(field: string): void {
    this.form.get(field)?.markAsTouched();
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.isSubmitting.set(true);
    // Simulated network delay, matching the pattern used everywhere else
    // in this mock app (Contact form, menu generation) — an instant
    // resolve would look broken next to every other async action here.
    setTimeout(() => {
      this.isSubmitting.set(false);
      this.submitted.set(true);
    }, 900);
  }

  submitAnother(): void {
    this.submitted.set(false);
    this.form.reset({ name: '', email: '', area: INTEREST_AREAS[0], pitch: '', link: '' });
  }
}
