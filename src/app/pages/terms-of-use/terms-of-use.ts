import { AfterViewInit, Component, ElementRef, OnDestroy, signal } from '@angular/core';
import { Header } from '../../components/header/header';
import { Footer } from '../../components/footer/footer';

const SECTIONS = [
  { id: 'acceptance', label: '1. Acceptance of Terms' },
  { id: 'eligibility', label: '2. Eligibility' },
  { id: 'services', label: '3. Description of Services' },
  { id: 'account', label: '4. Account Registration & Security' },
  { id: 'conduct', label: '5. User Conduct' },
  { id: 'bookings', label: '6. Bookings and Transactions' },
  { id: 'surplus', label: '7. Surplus Food Marketplace' },
  { id: 'reviews', label: '8. Ratings & Reviews' },
  { id: 'ip', label: '9. Intellectual Property' },
  { id: 'privacy', label: '10. Privacy and Data' },
  { id: 'ai', label: '11. AI-Powered Services' },
  { id: 'payments', label: '12. Payment Processing' },
  { id: 'liability', label: '13. Disclaimers & Liability' },
  { id: 'indemnification', label: '14. Indemnification' },
  { id: 'termination', label: '15. Termination' },
  { id: 'arbitration', label: '16. Dispute Resolution' },
  { id: 'classaction', label: '17. Class Action Waiver' },
  { id: 'general', label: '18. General Provisions' },
  { id: 'hostterms', label: '19. Terms for Hosts' },
  { id: 'foodieterms', label: '20. Terms for Foodies' },
  { id: 'suppliers', label: '21. Terms for Suppliers' },
] as const;

/**
 * Terms of Use — was a dead Footer link (routes.constants had '/terms'
 * defined, but no route was ever registered, same gap Contact and
 * Careers had before they got real destinations).
 *
 * Content note: the source draft this was built from used "Event Host"
 * to mean the party throwing the event and "Culinary Professional"/
 * "Chef" as a separate cooking role — the opposite of how this app
 * actually names things (Foodie throws the event, Host is the one who
 * bids on and caters it). Rather than ship a legal document that
 * contradicts the product's own role names, every section was reconciled
 * to the real three roles — Foodie, Host, Supplier — including moving
 * obligations to the party that actually owes them (e.g. the "notify of
 * changes within 48 hours" duty runs from Foodie to Host, not the
 * reverse, since the Foodie is the one whose event details might change).
 * Section 3.3's AI feature list was also factual-checked against what
 * this platform actually ships (Smart Menu, Agentic Chef, Intelligent
 * Bidding, Predictive Analytics, Dietary Intelligence, Budget Optimizer)
 * rather than the generic "8 specialized agents" / "chef-event matching"
 * language from the original draft, which doesn't describe any real
 * feature here.
 */
@Component({
  selector: 'app-terms-of-use',
  standalone: true,
  imports: [Header,Footer],
  templateUrl: './terms-of-use.html',
  styleUrl: './terms-of-use.scss',
})
export class TermsOfUse implements AfterViewInit, OnDestroy {
  readonly sections = SECTIONS;
  readonly activeSection = signal<string>(SECTIONS[0].id);

  private observer?: IntersectionObserver;

  constructor(private readonly elementRef: ElementRef<HTMLElement>) {}

  ngAfterViewInit(): void {
    // Scroll-spy: highlights whichever section heading is currently
    // nearest the top of the viewport, so the TOC reflects where you
    // actually are on a 21-section document rather than only updating
    // when you deliberately click a TOC entry.
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
