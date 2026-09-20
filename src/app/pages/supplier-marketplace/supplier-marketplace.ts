import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Header } from '../../components/header/header';
import { Footer } from '../../components/footer/footer';
import { PRODUCT_CATEGORY_OPTIONS, ProductCategoryOption } from '../../shared/models/supplier-profile.model';
import { MARKETPLACE_LISTINGS } from '../../shared/data/marketplace-listings.data';

/**
 * Supplier Marketplace — a genuine gap: supplier-profile.ts is one
 * Supplier managing their own catalog, but there was nowhere for a
 * Foodie to browse and compare specialty add-ons across *multiple*
 * Suppliers. Categories are pulled directly from PRODUCT_CATEGORY_OPTIONS
 * (the same 10-category list already authoritative on the Supplier
 * Profile page) rather than a separate, possibly-drifting list.
 *
 * Originally built with an in-app cart and checkout flow, then
 * deliberately simplified: rather than a Foodie adding items to a cart
 * here, each listing now links straight to that Supplier's own portal —
 * this page's job is discovery and comparison across Suppliers, not
 * transacting on their behalf. There's only one supplier-profile route
 * in this build (no per-supplier public profile pages exist yet), so
 * every "View Supplier" link points there for now; a real backend would
 * need each Supplier's own profile to link to individually.
 */
@Component({
  selector: 'app-supplier-marketplace',
  standalone: true,
  imports: [Header, Footer, RouterLink],
  templateUrl: './supplier-marketplace.html',
  styleUrl: './supplier-marketplace.scss',
})
export class SupplierMarketplace {
  readonly categories: readonly ProductCategoryOption[] = PRODUCT_CATEGORY_OPTIONS;
  readonly listings = MARKETPLACE_LISTINGS;

  readonly activeCategory = signal<string | null>(null);
  readonly searchQuery = signal('');

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
}
