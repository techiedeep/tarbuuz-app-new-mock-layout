import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Header } from '../../components/header/header';
import { Footer } from '../../components/footer/footer';
import { AuthApi } from '../../shared/services/auth-api';
import { AuthModalService } from '../../shared/services/auth-modal.service';
import { FounderProfile, JourneyStage, OriginMilestone } from './our-story.models';

@Component({
  selector: 'app-our-story',
  imports: [Header, Footer],
  templateUrl: './our-story.html',
  styleUrl: './our-story.scss',
})
export class OurStory {
  private readonly router = inject(Router);
  private readonly authApi = inject(AuthApi);
  private readonly authModal = inject(AuthModalService);

  // Drives hiding "Start Your Journey" once someone's already signed
  // in - the button's only job is getting a first-time visitor into
  // registration, so a signed-in visitor has nothing left for it to do.
  readonly isLoggedIn = computed(() => this.authApi.isAuthenticated());

  // Home is where the login/register modal actually lives (mounted
  // once, globally) - navigating there first, then opening it, matches
  // the same navigate-then-act pattern already used everywhere else in
  // this app for a modal whose parent page isn't wherever the trigger
  // happened to be clicked from. Only ever reachable while signed out,
  // now that the button itself is hidden for a signed-in visitor - no
  // separate signed-in branch needed here anymore.
  startYourJourney(): void {
    this.router.navigateByUrl('/').then(() => {
      // Instant, not smooth - immediately followed by authModal.open(),
      // which locks page scroll via BodyScrollLockService. A still-
      // animating smooth scroll interrupted mid-flight by the lock
      // taking over produced unpredictable final scroll positions on
      // unlock (confirmed directly) - instant removes the race
      // entirely, and the modal covers the screen immediately anyway,
      // so the animation was never visible to begin with.
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      this.authModal.open();
    });
  }

  readonly founder: FounderProfile = {
    initials: 'PG',
    quote: "I didn't set out to build a food company. I set out to fix a broken journey - food just happened to be where I found it broken most often.",
    name: 'Prisha Garg',
    role: 'Founder & CEO, Tarbuuz.ai',
  };

  readonly journeyStages: readonly JourneyStage[] = [
    {
      number: '01',
      question: 'Why do we spend more time deciding what to eat than actually enjoying it?',
      answerIcon: '🍽️',
      isAi: true,
      productName: 'Smart Menu',
      productTag: 'Events',
      productTagIsAi: true,
      description: 'Describe the occasion - Smart Menu drafts complete, costed menus in seconds, so the deciding takes minutes, not weeks of back-and-forth.',
    },
    {
      number: '02',
      question: 'Why should finding the right chef, venue, or supplier feel like a part-time job?',
      answerIcon: '⚖️',
      isAi: true,
      productName: 'Intelligent Bidding',
      productTag: 'Events',
      productTagIsAi: true,
      description: 'Post once. Verified suppliers compete for you, ranked by real value - not just the lowest price - so the searching becomes someone else\'s job.',
    },
    {
      number: '03',
      question: "Why does 'the perfect drink' mean choosing between convenience and craft?",
      answerIcon: '🍹',
      isAi: false,
      productName: 'Buuz',
      productTag: 'Ready to pour',
      productTagIsAi: false,
      description: 'Real recipes, ready-mixed - cubes, spheres, or bottles. Add your own spirit, or skip it entirely. Craft without the labor.',
    },
    {
      number: '04',
      question: 'Why do brilliant home cooks and chefs have nowhere to turn a recipe into something real?',
      answerIcon: '👨‍🍳',
      isAi: false,
      productName: 'Kitchen Lab',
      productTag: 'Earn as you cook',
      productTagIsAi: false,
      description: "Rent a real commercial kitchen by the hour, license your recipe to the network, and earn a royalty every time it's used again.",
    },
    {
      number: '05',
      question: "And when the meal is over - what's actually left behind?",
      answerIcon: '✨',
      isAi: false,
      productName: 'The Journey, Completed',
      productTag: '',
      productTagIsAi: false,
      description: 'Not a receipt. A memory - the one thing every stage before it was actually in service of, from the first question to the last bite.',
    },
  ];

  readonly originMilestones: readonly OriginMilestone[] = [
    {
      label: 'The spark',
      segments: [
        { text: 'She spent ' },
        { text: 'eleven days', bold: true },
        { text: ' planning a single dinner for twelve people - chasing quotes, chasing chefs, chasing a bartender who never called back. The dinner was wonderful. The eleven days were not.' },
      ],
    },
    {
      label: 'The question',
      segments: [
        { text: 'She started asking everyone she knew the same thing: ' },
        { text: '"What\'s the part of planning food you actually enjoy?"', bold: true },
        { text: ' The answer was almost always the same - the eating. Never the arranging.' },
      ],
    },
    {
      label: 'The build',
      segments: [
        { text: 'Tarbuuz began as a single AI model matching hosts to chefs. It became a marketplace. Then ' },
        { text: 'Buuz', bold: true },
        { text: ' and ' },
        { text: 'Kitchen Lab', bold: true },
        { text: ' followed - not as new ideas, but as the same original question, asked again at a different stage of the journey.' },
      ],
    },
    {
      label: 'Today',
      segments: [
        { text: 'Tarbuuz exists to keep asking that question - ' },
        { text: 'at every stage food touches', bold: true },
        { text: ' - until the arranging disappears entirely, and only the eating is left.' },
      ],
    },
  ];
}
