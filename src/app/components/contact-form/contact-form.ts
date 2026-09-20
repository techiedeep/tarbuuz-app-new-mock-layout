import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

const CONTACT_EMAIL = 'info@tarbuuz.ai';

const SUBJECT_TOPICS = [
  'General Inquiry',
  'Host an Event',
  'Become a Supplier',
  'Enterprise Membership',
  'Partnership',
  'Press',
  'Something Else',
] as const;

/**
 * Contact form — opened from the Footer's "Contact" link, which
 * previously routerLink'd to a /contact route that was never actually
 * registered (a dead link on every page that includes the footer).
 * Self-contained within Footer rather than a separate global-modal
 * service, since Footer itself is already the thing that's reused on
 * every page — there's no separate "parent page" to coordinate with the
 * way Create Event's modal needed to.
 *
 * Two genuinely different actions, matching what was asked for — not
 * two versions of the same thing:
 *  - "Send Message" mimics an in-app submission (this is a frontend-only
 *    mock, so it simulates a delivered message rather than actually
 *    reaching a backend).
 *  - "Open in Email App" builds a real mailto: link from the same fields
 *    and hands off to whatever mail client the user has configured —
 *    the literal "draft an email" option, not a second version of send.
 */
@Component({
  selector: 'app-contact-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './contact-form.html',
  styleUrl: './contact-form.scss',
})
export class ContactForm implements OnChanges {
  @Input() open = false;
  @Input() defaultSubject: (typeof SUBJECT_TOPICS)[number] = SUBJECT_TOPICS[0];
  @Output() closed = new EventEmitter<void>();

  readonly subjectTopics = SUBJECT_TOPICS;
  readonly contactEmail = CONTACT_EMAIL;

  readonly stage = signal<'form' | 'sent'>('form');
  readonly isSubmitting = signal(false);

  readonly form: FormGroup;

  constructor(private readonly fb: FormBuilder) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      subject: [SUBJECT_TOPICS[0], Validators.required],
      message: ['', [Validators.required, Validators.minLength(10)]],
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Fresh every time it opens — same reasoning as every other modal in
    // this app (Create Event, Agentic Chef): reopening after a previous
    // send shouldn't show the old confirmation screen or stale field
    // values from an unrelated earlier message.
    if (changes['open'] && this.open) {
      this.stage.set('form');
      this.isSubmitting.set(false);
      this.form.reset({ name: '', email: '', subject: this.defaultSubject, message: '' });
    }
  }

  fieldError(field: string): string | null {
    const control = this.form.get(field);
    if (!control || !control.touched || control.valid) return null;
    if (control.errors?.['required']) return 'This field is required.';
    if (control.errors?.['email']) return 'Enter a valid email address.';
    if (control.errors?.['minlength']) {
      const needed = control.errors['minlength'].requiredLength;
      return `Please enter at least ${needed} characters.`;
    }
    return 'Please check this field.';
  }

  markTouched(field: string): void {
    this.form.get(field)?.markAsTouched();
  }

  private buildMailtoUrl(): string {
    const { name, email, subject, message } = this.form.value;
    const fullSubject = `[Tarbuuz Contact] ${subject}`;
    const body =
      `${message}\n\n---\nFrom: ${name}\nReply-to: ${email}`;
    const params = new URLSearchParams({ subject: fullSubject, body });
    // URLSearchParams encodes spaces as '+' rather than '%20', which most
    // mail clients handle fine in a query string but is technically
    // incorrect inside a mailto: body/subject — replaced explicitly
    // rather than leaving literal '+' characters in someone's draft.
    const query = params.toString().replace(/\+/g, '%20');
    return `mailto:${this.contactEmail}?${query}`;
  }

  openInEmailApp(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    window.location.href = this.buildMailtoUrl();
  }

  sendMessage(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.isSubmitting.set(true);
    // Simulated network delay, matching the latency pattern used
    // elsewhere in this mock app (menu generation, validation) rather
    // than resolving instantly, which would look broken/too-fast next
    // to every other async action in the product.
    setTimeout(() => {
      this.isSubmitting.set(false);
      this.stage.set('sent');
    }, 900);
  }

  close(): void {
    this.closed.emit();
  }
}
