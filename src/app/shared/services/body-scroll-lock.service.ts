import { Injectable } from '@angular/core';

/**
 * Locks background page scroll while a modal or drawer is open.
 *
 * REWRITTEN from an earlier position: fixed-based approach after finding
 * a real, serious bug it caused: setting position: fixed on <body>
 * creates a new CSS containing block for any position: fixed descendant
 * of body - which includes every modal overlay in this app, since
 * they're all rendered inline in the component tree, not through a
 * portal outside <body>. The practical effect: opening the Login modal
 * (or any other overlay) while the page had been scrolled down at all
 * caused the overlay's "top: 0" to resolve against <body>'s own
 * offset position instead of the real viewport - rendering the entire
 * modal thousands of pixels off-screen and completely invisible,
 * confirmed directly by inspecting its actual bounding box. This
 * reproduced via multiple existing, unrelated triggers (Home's own
 * pre-existing "Get Started" button among them), not just a newly added
 * one - a real, previously-shipped regression, not a hypothetical risk.
 *
 * overflow: hidden on <body> does not create that containing block, so
 * fixed-position descendants stay correctly anchored to the viewport.
 * It's also simpler: there's no scroll offset to save and restore on
 * unlock, since the page never visually moves in the first place - it's
 * simply prevented from scrolling further while locked. The one thing
 * given up is iOS Safari's touch-drag rubber-band edge case still being
 * able to nudge the page slightly at the very top/bottom of its scroll
 * range - a minor cosmetic issue, and a far better trade than a
 * completely invisible, unusable modal.
 *
 * Built as a shared, reference-counted service rather than inline
 * document.body manipulation inside Login itself, because Login is not
 * the only overlay in this app (BiddingDrawer, SupplierMarketplaceDrawer,
 * the Agentic Chef drawer, CreateEvent, etc. all share the same
 * .modal-overlay/.drawer-backdrop pattern with the same gap). A
 * reference count specifically matters here: if two overlays ever
 * happen to be open at once, the first one closing must not silently
 * unlock scrolling while the second is still open. Each caller's
 * lock()/unlock() pair is independent; the body only actually unlocks
 * once every outstanding lock has released.
 */
@Injectable({ providedIn: 'root' })
export class BodyScrollLockService {
  private lockCount = 0;
  private savedScrollY = 0;

  lock(): void {
    this.lockCount++;
    if (this.lockCount > 1) return; // Already locked by another caller - just track the extra reference.

    // overflow: hidden resets window.scrollY to 0 the instant it's
    // applied - an element with no overflow has no scroll position to
    // report. Not visible to the person while the modal covers the
    // whole screen, but the position still needs to be restored on
    // unlock, or they'd land back at the top of the page instead of
    // where they actually were.
    this.savedScrollY = window.scrollY;

    // Compensates for the scrollbar disappearing when overflow: hidden
    // takes over on desktop - without this the page visibly shifts
    // sideways by the scrollbar's width the instant a modal opens.
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    // Both <html> and <body> - which element is actually the page's
    // scrolling container varies by browser/doctype, so overflow:hidden
    // on <body> alone isn't reliably enough to stop scrolling; confirmed
    // directly - <body>-only left a genuine scroll gap on the first
    // pass here.
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
  }

  unlock(): void {
    if (this.lockCount === 0) return; // Defensive - unlock() without a matching lock() should be a no-op, not go negative.
    this.lockCount--;
    if (this.lockCount > 0) return; // Other callers still hold a lock - stay locked until they all release.

    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    window.scrollTo(0, this.savedScrollY);
  }
}
