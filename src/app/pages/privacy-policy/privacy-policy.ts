import { AfterViewInit, Component, ElementRef, OnDestroy, signal } from '@angular/core';
import { Header } from '../../components/header/header';
import { Footer } from '../../components/footer/footer';

const SECTIONS = [
  { id: 'collection', label: '1. Information We Collect' },
  { id: 'use', label: '2. How We Use Your Information' },
  { id: 'sharing', label: '3. How We Share Your Information' },
  { id: 'retention', label: '4. Data Retention' },
  { id: 'security', label: '5. Data Security' },
  { id: 'rights', label: '6. Your Privacy Rights' },
  { id: 'children', label: "7. Children's Privacy" },
  { id: 'cookies', label: '8. Cookies and Tracking' },
  { id: 'transfers', label: '9. International Transfers' },
  { id: 'changes', label: '10. Changes to This Policy' },
  { id: 'contact', label: '11. Contact Us' },
  { id: 'state', label: '12. State-Specific Disclosures' },
  { id: 'additional', label: '13. Additional Information' },
] as const;

/**
 * Privacy Policy — was a dead Footer link (routes.constants had
 * '/privacy' defined, no route registered), same gap Terms/Contact/
 * Careers had before real destinations. Same content-accuracy pass as
 * Terms of Use: role names reconciled to Foodie/Host/Supplier, the
 * "8-agent" / "chef-event matching" language replaced with the real
 * shipped features (Smart Menu, Agentic Chef, Intelligent Bidding,
 * Predictive Analytics).
 *
 * Email consolidation: the source draft used six different addresses
 * (privacy@, dpo@, security@, support@, unsubscribe@, hr@) that don't
 * exist as real inboxes on this platform — only info@tarbuuz.ai does.
 * Every reference now points there. That also meant redesigning Section
 * 11 entirely: six contact cards that would now all show the identical
 * address is a real design problem, not just a find-and-replace — the
 * fix is one prominent email banner plus a response-time table by
 * request category, so the "which team do I email" distinction that
 * used to live in six repeated addresses now lives in what to expect,
 * not which account to write to.
 */
@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  imports: [Header,Footer],
  templateUrl: './privacy-policy.html',
  styleUrl: './privacy-policy.scss',
})
export class PrivacyPolicy implements AfterViewInit, OnDestroy {
  readonly sections = SECTIONS;
  readonly activeSection = signal<string>(SECTIONS[0].id);

  private observer?: IntersectionObserver;

  constructor(private readonly elementRef: ElementRef<HTMLElement>) {}

  ngAfterViewInit(): void {
    const options: IntersectionObserverInit = { rootMargin: '-15% 0px -70% 0px', threshold: 0 };
    this.observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          this.activeSection.set(entry.target.id);
        }
      }
    }, options);

    for (const s of SECTIONS) {
      const el = this.elementRef.nativeElement.querySelector(`#${s.id}`);
      if (el) this.observer.observe(el);
    }
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  scrollTo(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
