import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Header } from '../../components/header/header';
import { Footer } from '../../components/footer/footer';
import { KitchenLabService } from '../../shared/services/kitchen-lab.service';
import { AuthApi } from '../../shared/services/auth-api';
import { AuthModalService } from '../../shared/services/auth-modal.service';
import { KitchenChoice } from '../../shared/models/kitchen-lab/kitchen-lab.model';

/**
 * Kitchen Lab — converted from a standalone HTML/vanilla-JS reference.
 * The lifecycle/criteria/royalty/stats/FAQ sections are static content
 * rendering (straightforward signal-free @for loops).
 *
 * The page's own "Try Your Culinary Skills" section used to be a fake,
 * self-contained demo (kitchen choice → a recording timer → a recipe-name
 * input → a fake success message that went nowhere). That's gone: this
 * section is now honest lead-in to the real submission flow. It captures
 * exactly one real decision - which kitchen the cook will use - and hands
 * it to /submit-recipe as a query param, where it's the source of truth
 * for whether that form's video-upload section is required (see
 * SubmitRecipe.videoRequired). Kept here rather than fully owned by that
 * form's toggle only, so someone landing on this page still gets the
 * "which kitchen?" decision as a natural first step of the page's own
 * narrative - and the /submit-recipe page remains independently correct
 * for anyone who arrives there directly, since it has its own toggle too.
 */
@Component({
  selector: 'app-kitchen-lab',
  standalone: true,
  imports: [Header, Footer],
  templateUrl: './kitchen-lab.html',
  styleUrl: './kitchen-lab.scss',
})
export class KitchenLab {
  private readonly kitchenLabService = inject(KitchenLabService);
  private readonly router = inject(Router);
  private readonly authApi = inject(AuthApi);
  private readonly authModal = inject(AuthModalService);

  readonly lifecycleStages = this.kitchenLabService.lifecycleStages;
  readonly matchCriteria = this.kitchenLabService.matchCriteria;
  readonly royaltySteps = this.kitchenLabService.royaltySteps;
  readonly stats = this.kitchenLabService.stats;
  readonly faqItems = this.kitchenLabService.faqItems;

  // ── "Try Your Culinary Skills" - kitchen choice, then hand off ──
  readonly kitchenChoice = signal<KitchenChoice | null>(null);

  readonly continueHint = computed(() =>
    this.kitchenChoice() === null ? 'Choose a kitchen to continue' : '',
  );

  // Picking a kitchen is the first real commitment in this flow - both
  // branches end in something tied to an identity (a booking request, or
  // a hand-off to actually submitting a recipe), so the login check
  // happens right here rather than waiting until Submit. Not logged in:
  // same gate-and-resume pattern as Buuz's addToCart() - the choice
  // itself is captured in the pending action, so once sign-in succeeds
  // the card the person actually clicked ends up selected, not just the
  // login modal quietly closing with nothing having happened.
  selectKitchen(choice: KitchenChoice): void {
    if (!this.authApi.isAuthenticated()) {
      this.authModal.openWithPendingAction(() => this.kitchenChoice.set(choice));
      return;
    }
    this.kitchenChoice.set(choice);
  }

  // Booking a Tarbuuz kitchen isn't a form to fill in elsewhere - it's a
  // request the platform now owns, so Submit just confirms it in place.
  // Using your own kitchen still needs the actual recipe details, so that
  // branch continues to the real submission form exactly as before.
  readonly bookingSubmitted = signal(false);

  submit(): void {
    const choice = this.kitchenChoice();
    if (!choice) return;
    if (choice === 'network') {
      this.bookingSubmitted.set(true);
      // Auto-returns to the picker on its own - no button for the person
      // to click, since there's nothing left for them to decide here.
      // Reads bookingSubmitted back before resetting so a rapid
      // "choose again"-style re-selection within the 5s window (were a
      // control for that ever reintroduced) isn't clobbered by this
      // leftover timer firing late.
      setTimeout(() => {
        if (this.bookingSubmitted()) {
          this.bookingSubmitted.set(false);
          this.kitchenChoice.set(null);
        }
      }, 5000);
      return;
    }
    this.goToSubmitRecipe();
  }

  // Carries the choice across the route boundary as a query param (not
  // router state) specifically so it survives a page refresh and is
  // still correct if this link is ever shared or bookmarked mid-flow -
  // router-state extras don't survive either of those. SubmitRecipe
  // reads this once, at construction, as its own toggle's initial value;
  // it's still a real, changeable control there, not a one-way handoff.
  goToSubmitRecipe(): void {
    const choice = this.kitchenChoice();
    if (!choice) return;
    this.router
      .navigate(['/submit-recipe'], { queryParams: { kitchen: choice } })
      .then(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior }));
  }

  // Hero CTA at the top of the page - reachable before anyone has picked
  // a kitchen option down in "Try Your Culinary Skills", so unlike
  // goToSubmitRecipe() above this one carries no ?kitchen= query param;
  // SubmitRecipe already defaults sensibly (own kitchen, video required)
  // when it arrives with none. /submit-recipe itself is authGuard-gated
  // (see app.routes.ts), which previously meant a signed-out click here
  // just silently bounced to the home page with no explanation - this
  // does the login check up front instead, same gate-and-resume pattern
  // as selectKitchen(): not logged in opens the modal with the
  // navigation itself as the pending action, so it fires the moment
  // sign-in succeeds and the person lands on Submit Recipe, scrolled to
  // the top, having never seen the home page at all.
  goToSubmitRecipeDirect(): void {
    if (!this.authApi.isAuthenticated()) {
      this.authModal.openWithPendingAction(() => this.navigateToSubmitRecipe());
      return;
    }
    this.navigateToSubmitRecipe();
  }

  private navigateToSubmitRecipe(): void {
    this.router
      .navigateByUrl('/submit-recipe')
      .then(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior }));
  }

  // ── FAQ accordion — single item open at a time, matching the original ──
  readonly openFaqIndex = signal<number | null>(null);

  toggleFaq(index: number): void {
    this.openFaqIndex.update((current) => (current === index ? null : index));
  }
}
