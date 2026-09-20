import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FooterLinkColumn } from '../../shared/models/home/home.models';
import { ROUTE_PATHS } from '../../shared/routes.constants';
import { ContactForm } from '../contact-form/contact-form';

@Component({
  selector: 'app-footer',
  imports: [RouterLink, ContactForm],
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class Footer {
  private readonly router = inject(Router);

  readonly contactPath = ROUTE_PATHS.contact;
  readonly showContactForm = signal(false);

  // Every footer link except Contact (which opens a modal) navigates to
  // a real route - and every one of them needs the scroll reset below,
  // since the footer sits at the bottom of every page and a click here
  // is often a long way down whatever page it's on. Consolidated into
  // one Set rather than a chain of === comparisons in the template: that
  // chain is exactly how Buuz and Kitchen Lab got left out the first
  // time around - a new link added to linkColumns without a matching
  // entry added to the comparison chain would silently fall through to
  // a plain routerLink with no scroll reset. A Set built from the
  // link data itself can't drift out of sync with it the same way.
  private readonly scrollResetPaths = new Set<string>([
    ROUTE_PATHS.careers,
    ROUTE_PATHS.privacy,
    ROUTE_PATHS.terms,
    ROUTE_PATHS.home,
    ROUTE_PATHS.events,
    ROUTE_PATHS.buuz,
    ROUTE_PATHS.kitchenLab,
    ROUTE_PATHS.ourStory,
  ]);

  needsScrollReset(path: string): boolean {
    return this.scrollResetPaths.has(path);
  }

  openContactForm(): void {
    this.showContactForm.set(true);
  }
  closeContactForm(): void {
    this.showContactForm.set(false);
  }

  // Footer renders at the bottom of every page, so a click here is
  // frequently a long way down the page it's currently on — this router
  // has no scrollPositionRestoration configured (same root cause as the
  // earlier Buuz/Kitchen Lab fix), so without this, landing on Careers
  // would keep whatever scroll offset the previous page had rather than
  // opening at the top of the new one.
  navigateAndScrollToTop(path: string): void {
    this.router.navigateByUrl(path).then(() => window.scrollTo(0, 0));
  }

  readonly linkColumns: readonly FooterLinkColumn[] = [
    {
      heading: 'Products',
      links: [
        { label: 'Events', path: ROUTE_PATHS.events },
        { label: 'Buuz', path: ROUTE_PATHS.buuz },
        { label: 'Kitchen Lab', path: ROUTE_PATHS.kitchenLab },
      ],
    },
    {
      heading: 'Company',
      links: [
        { label: 'About Us', path: ROUTE_PATHS.ourStory },
        { label: 'Careers', path: ROUTE_PATHS.careers },
        { label: 'Contact', path: ROUTE_PATHS.contact },
      ],
    },
    {
      heading: 'Legal',
      links: [
        { label: 'Privacy', path: ROUTE_PATHS.privacy },
        { label: 'Terms', path: ROUTE_PATHS.terms },
      ],
    },
  ];

  // Computed once per render rather than hardcoded — the original static
  // HTML had "© 2026" baked in as plain text, which silently goes stale
  // every January 1st unless someone remembers to edit it by hand.
  readonly currentYear = new Date().getFullYear();
}
