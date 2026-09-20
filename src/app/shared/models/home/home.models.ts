
export interface NavLink {
  readonly label: string;
  readonly path: string;
}

export interface HeroCapability {
  readonly icon: string;
  readonly name: string;
  readonly status: string;
}

export interface AiCapabilityCard {
  readonly icon: string;
  readonly title: string;
  readonly description: string;
}

export interface TabDemo {
  readonly icon: string;
  readonly label: string;
  readonly emoji: string;
  readonly image: string;
  readonly imageAlt: string;
  readonly title: string;
  readonly description: string;
  readonly features: readonly string[];
}

export interface FlowStep {
  readonly number: string;
  readonly title: string;
  readonly description: string;
}

export type ProductTagVariant = 'ai' | 'plain';

export interface ProductOffering {
  readonly visualClass: string;
  readonly icon: string;
  readonly showHalo: boolean;
  readonly image: string;
  readonly imageAlt: string;
  readonly tagVariant: ProductTagVariant;
  readonly tagLabel: string;
  readonly name: string;
  readonly description: string;
  readonly features: readonly string[];
  readonly ctaLabel: string;
  readonly ctaPath: string;
}

export type StatVariant = 'default' | 'amber' | 'indigo';

export interface StatItem {
  readonly value: string;
  readonly label: string;
  readonly variant: StatVariant;
}

export interface Testimonial {
  readonly quote: string;
  readonly authorInitials: string;
  readonly authorName: string;
  readonly authorRole: string;
}

export interface FaqItem {
  readonly question: string;
  readonly answer: string;
}

export interface FooterLinkColumn {
  readonly heading: string;
  readonly links: readonly NavLink[];
}


export interface ExternalNavLink {
  readonly label: string;
  readonly href: string;
}

export interface HomeFeature {
  readonly icon: string;
  readonly title: string;
  readonly description: string;
  readonly link: string;
}

export interface HomeStep {
  readonly number: number;
  readonly icon: string;
  readonly title: string;
  readonly description: string;
}

export interface HomeUserType {
  readonly icon: string;
  readonly title: string;
  readonly description: string;
  readonly features: readonly string[];
  readonly buttonText: string;
}

/** The real, richer testimonial DTO — distinct from this page's own
 *  working Testimonial above; see file-level note. */
export interface HomeTestimonialDTO {
  readonly content: string;
  readonly authorName: string;
  readonly authorAvatar: string;
  readonly authorRole: string;
  readonly authorLocation: string;
  readonly rating: number;
}

export interface HomeStatDTO {
  readonly number: string;
  readonly label: string;
}

export interface SocialLink {
  readonly icon: string;
  readonly href: string;
}

export interface HomeFooterSection {
  readonly title: string;
  readonly links: ReadonlyArray<{ label: string; href: string }>;
}