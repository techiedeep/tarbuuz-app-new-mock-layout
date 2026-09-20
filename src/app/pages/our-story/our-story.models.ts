/**
 * Data models for the Tarbuuz "Our Story" page.
 *
 * Follows the same convention as home.models.ts: repeated content blocks
 * (journey stages, origin milestones) are typed and data-driven; singular,
 * one-off content (hero copy, the manifesto quote) stays as direct markup
 * in the template, matching how home.html itself hardcodes its hero rather
 * than modeling it — consistent with the existing codebase's own pattern.
 */

export interface FounderProfile {
  readonly initials: string;
  readonly quote: string;
  readonly name: string;
  readonly role: string;
}

export interface JourneyStage {
  readonly number: string;
  readonly question: string;
  readonly answerIcon: string;
  readonly isAi: boolean;
  readonly productName: string;
  /** Empty string omits the tag entirely (used by the final "no product" stage). */
  readonly productTag: string;
  readonly productTagIsAi: boolean;
  readonly description: string;
}

/**
 * A single run of text within an origin-milestone paragraph. Modeled this
 * way — rather than storing a raw HTML string and binding via [innerHTML]
 * — so bold emphasis can sit at an arbitrary position in the sentence
 * without ever introducing an innerHTML binding into the codebase.
 */
export interface TextSegment {
  readonly text: string;
  readonly bold?: boolean;
}

export interface OriginMilestone {
  readonly label: string;
  readonly segments: readonly TextSegment[];
}

export interface TeamMember {
  readonly initials: string;
  readonly name: string;
  readonly role: string;
  readonly bio: string;
}

export interface TimelineEvent {
  readonly year: string;
  readonly title: string;
  readonly description: string;
}

export interface OurStoryStatDTO {
  readonly number: string;
  readonly label: string;
}

export interface OurStoryValue {
  readonly icon: string;
  readonly title: string;
  readonly description: string;
}

export interface ProblemPlate {
  readonly icon: string;
  readonly title: string;
  readonly description: string;
}

export interface MomentCard {
  readonly number: number;
  readonly emoji: string;
  readonly title: string;
  readonly description: string;
}

export interface PhaseCard {
  readonly version: string;
  readonly title: string;
  readonly features: readonly string[];
}

export interface VisionItem {
  readonly icon: string;
  readonly title: string;
  readonly description: string;
}

export interface ImpactStats {
  readonly users: string;
  readonly cities: string;
  readonly foodSaved: string;
  readonly revenue: string;
}

export interface Particle {
  readonly icon: string;
  readonly top: number;
  readonly left: number;
  readonly size: number;
  readonly duration: string;
  readonly delay: string;
  readonly dx: string;
  readonly dy: string;
}

export const TIMELINE: readonly TimelineEvent[] = [
  { year: 'Winter 2024', title: 'The Spark', description: 'Tarbuuz cancelled birthday event and food waste frustration leads to the initial concept. First sketches of the platform are drawn on restaurant napkins during late-night brainstorming sessions.' },
  { year: 'Early 2025', title: 'Team Assembly', description: 'Tarbuuz and Meg join as co-founders. Started with the concept and the technology to be used to build the platform.' },
  { year: 'Summer 2025', title: 'Initial Algorithm', description: 'Initial AI algorithms developed for automated menu suggestions and bidding options.' },
  { year: 'Winter 2025', title: 'Platform Launch', description: 'Soft launch with 10 chefs. First event posted (a 60th birthday party). First successful bid (Chef Maria wins at $1,800 vs. traditional quotes of $3,200).' },
  { year: 'Early 2026', title: 'Innovation Milestone', description: 'Launch of advanced AI recommendation engine and food safety tracking system. Partnership with major food distributors and sustainable farms established.' },
  { year: 'Today', title: 'National Expansion', description: 'Platform now serves 10+ cities with influencers promoting the brand.' },
];

export const VALUES: readonly OurStoryValue[] = [
  { icon: '🌱', title: 'Sustainability First', description: "Every feature we build considers environmental impact. We've helped divert over 2.3 million pounds of food from landfills while creating economic value." },
  { icon: '🤝', title: 'Empowering Talent', description: 'We believe every chef deserves access to premium ingredients and every supplier deserves fair partnerships. Our platform levels the playing field.' },
  { icon: '🎯', title: 'Intelligent Matching', description: "Our AI doesn't just connect people—it understands preferences, predicts needs, and creates perfect culinary partnerships." },
  { icon: '🏆', title: 'Quality Excellence', description: 'We maintain the highest standards in food safety, supplier verification, and culinary expertise to ensure exceptional experiences.' },
  { icon: '💡', title: 'Innovation Focus', description: 'We continuously push boundaries with cutting-edge technology, from supply chain optimization to predictive demand modeling.' },
  { icon: '❤️', title: 'Community Driven', description: 'Our platform thrives because our community shares knowledge, supports each other, and creates incredible experiences together.' },
];
