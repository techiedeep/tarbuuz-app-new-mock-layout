import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { PRODUCT_CATEGORY_OPTIONS, ProductCategoryOption } from '../../shared/models/supplier-profile.model';
import { MarketplaceListing, MARKETPLACE_LISTINGS } from '../../shared/data/marketplace-listings.data';

/**
 * A drawer for browsing specialty-extras suppliers - full search,
 * category filtering, and all 18 real listings, matching what the
 * standalone /marketplace page shows. Originally built inline inside
 * review-menu's own component for its "Specialty Extras" trigger;
 * extracted here once foodie-events needed the identical experience
 * after a Host accepts a bid, rather than build a second, independently
 * drifting copy of the same search/filter logic and markup a second
 * time. Both review-menu and foodie-events now use this same component.
 */
@Component({
  selector: 'app-supplier-marketplace-drawer',
  standalone: true,
  imports: [],
  templateUrl: './supplier-marketplace-drawer.html',
  styleUrl: './supplier-marketplace-drawer.scss',
})
export class SupplierMarketplaceDrawer {
  @Input() open = false;
  @Output() closed = new EventEmitter<void>();

  // Defaults match review-menu's "Shop Specialty Extras" context, where
  // there's no bid to continue reviewing yet - just closes. foodie-events
  // overrides both for its post-bid-acceptance context, where the
  // primary action needs to actually navigate somewhere afterward, not
  // just close the drawer.
  @Input() primaryActionLabel = 'Done Browsing →';
  @Output() primaryAction = new EventEmitter<void>();

  readonly categories: readonly ProductCategoryOption[] = PRODUCT_CATEGORY_OPTIONS;
  readonly activeCategory = signal<string | null>(null);
  readonly searchQuery = signal('');
  readonly listings: readonly MarketplaceListing[] = MARKETPLACE_LISTINGS;

  readonly filteredListings = computed(() => {
    const cat = this.activeCategory();
    const query = this.searchQuery().trim().toLowerCase();
    return this.listings.filter((l) => {
      const matchesCategory = !cat || l.category === cat;
      const matchesQuery =
        !query ||
        l.title.toLowerCase().includes(query) ||
        l.supplierName.toLowerCase().includes(query) ||
        l.description.toLowerCase().includes(query);
      return matchesCategory && matchesQuery;
    });
  });

  categoryCount(categoryValue: string): number {
    return this.listings.filter((l) => l.category === categoryValue).length;
  }

  selectCategory(value: string | null): void {
    this.activeCategory.set(this.activeCategory() === value ? null : value);
  }

  close(): void {
    this.closed.emit();
  }

  // Always closes the drawer first - regardless of context, the primary
  // button should never leave the drawer open - then separately emits
  // primaryAction so a parent that needs to do something more than just
  // close (like foodie-events navigating to bid-cart) has a hook to do
  // it, without forcing review-menu's simpler context to handle an event
  // it has nothing to do with.
  triggerPrimaryAction(): void {
    this.closed.emit();
    this.primaryAction.emit();
  }
}
