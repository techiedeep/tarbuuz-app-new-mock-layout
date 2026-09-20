import { Injectable } from '@angular/core';
import { FaqItem, KitchenLabStat, LifecycleStage, MatchCriterion, RoyaltyStep } from '../models/kitchen-lab/kitchen-lab.model';

/** Static content for the Kitchen Lab page. Plain synchronous data, not
 *  Observables — none of this is genuinely async, it's fixed marketing/
 *  explainer content, not fetched from anywhere. */
@Injectable({ providedIn: 'root' })
export class KitchenLabService {
  readonly lifecycleStages: readonly LifecycleStage[] = [
    { number: '01', icon: '🏠', title: 'Choose Your Kitchen', description: "Book a verified commercial kitchen from our network, or use your own <span class=separator>–</span> either way, you're ready to cook.", isAi: false },
    { number: '02', icon: '🎥', title: 'Record Your Prep', description: "Turn on recording before you start. It's your proof of process <span class=separator>–</span> and what makes your recipe trustworthy to hosts.", isAi: false },
    { number: '03', icon: '📤', title: 'Submit Your Recipe', description: 'Add your ingredients, steps, and the recording. Submit it to the Tarbuuz recipe network for review.', isAi: false },
    { number: '04', icon: '⭐', title: 'Get Reviewed & Rated', description: 'Hosts and diners rate recipes they experience. Ratings build over time and directly affect how often you get selected.', isAi: false },
    { number: '05', icon: '✨', title: 'Matched by Smart Menu', description: "When an event's needs fit your recipe <span class=separator>–</span> cuisine, diet, budget <span class=separator>–</span> and your ratings hold up, Smart Menu surfaces it automatically.", isAi: true },
    { number: '06', icon: '💰', title: 'Earn Royalties Automatically', description: 'Every time a host approves a menu with your recipe and books the event, you get paid. No invoicing, no chasing payment.', isAi: false },
  ];

  readonly matchCriteria: readonly MatchCriterion[] = [
    { icon: '🎯', title: 'Event Fit', description: "Cuisine style, dietary needs, guest count, and budget are matched against your recipe's actual profile <span class=separator>–</span> not just its title." },
    { icon: '⭐', title: 'Rating & Reviews', description: 'Recipes with stronger reviews are weighted higher <span class=separator>–</span> consistency and real feedback matter more than being new.' },
    { icon: '📈', title: 'Track Record', description: 'Recipes that performed well at similar past events get a visibility boost the next time a similar event comes up.' },
  ];

  readonly royaltySteps: readonly RoyaltyStep[] = [
    { number: '1', title: 'Your recipe is selected', description: "Smart Menu matches it to a host's event based on fit and rating." },
    { number: '2', title: 'The host approves the menu', description: 'Your recipe is one of the dishes in the menu they review and approve.' },
    { number: '3', title: 'The host books the event', description: 'A supplier bid is accepted and the event is confirmed.' },
    { number: '4', title: 'You get paid <span class=separator>–</span> automatically', description: 'A royalty is issued the moment the booking is confirmed. No invoicing.' },
  ];

  readonly stats: readonly KitchenLabStat[] = [
    { value: '500+', label: 'Recipes in the network' },
    { value: '4.7★', label: 'Average recipe rating' },
    { value: '$0', label: 'Cost to submit a recipe' },
  ];

  readonly faqItems: readonly FaqItem[] = [
    { question: 'Do I need professional equipment to record my prep?', answer: 'No <span class=separator>–</span> a phone camera is enough. What matters is that the process is visible and verifiable, not the production quality.' },
    { question: 'How much do I actually earn per royalty?', answer: "Royalty amounts vary by recipe complexity, serving size, and event scale <span class=separator>–</span> you'll see the exact rate before your recipe is ever submitted for matching." },
    { question: 'What if my recipe never gets selected?', answer: "There's no cost or obligation either way <span class=separator>–</span> recipes simply sit in the network until they're a genuine fit for an event. Improving ratings and keeping details accurate both help." },
    { question: 'Can I use my own kitchen instead of booking one?', answer: 'Yes <span class=separator>–</span> Kitchen Lab supports both. Booking a network kitchen is optional, not required, as long as your own space meets basic food-safety expectations.' },
    { question: 'When do I actually get paid?', answer: "Automatically, the moment a host both approves the menu and accepts a bid for the event your recipe was matched to <span class=separator>–</span> no manual invoicing on your end." },
  ];

  formatRecordingTime(totalSeconds: number): string {
    const m = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const s = String(totalSeconds % 60).padStart(2, '0');
    return `${m}:${s}`;
  }
}
