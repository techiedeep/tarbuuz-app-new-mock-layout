import { Component, DestroyRef, ElementRef, HostListener, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, startWith } from 'rxjs';
import { Header } from '../../components/header/header';
import { Footer } from '../../components/footer/footer';
import { BuuzService } from '../../shared/services/buuz.service';
import { CartService } from '../../shared/services/cart.service';
import { AuthApi } from '../../shared/services/auth-api';
import { AuthModalService } from '../../shared/services/auth-modal.service';
import { BuuzIngredient, BuuzTemplate } from '../../shared/models/buuz/buuz.model';

/**
 * The Buuz cocktail-kit builder — converted from a standalone HTML/vanilla-
 * JS reference into real signal-driven state. The original's plain
 * `state = { format, mix: Set, garnish: Set, activeTemplate }` object maps
 * onto signals directly; everything that was a DOM-query-and-mutate
 * "syncAll()" pass there is a computed() here instead, so the donut,
 * legend, summary card, and CTA all stay correct automatically rather
 * than needing to be manually kept in sync on every interaction.
 */
@Component({
  selector: 'app-buuz',
  standalone: true,
  imports: [Header, Footer, ReactiveFormsModule, CurrencyPipe],
  templateUrl: './buuz.html',
  styleUrl: './buuz.scss',
})
export class Buuz {
  private readonly buuzService = inject(BuuzService);
  private readonly cartService = inject(CartService);
  private readonly authApi = inject(AuthApi);
  private readonly authModal = inject(AuthModalService);
  private readonly elementRef = inject(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly formats = this.buuzService.formats;
  readonly ingredients = this.buuzService.ingredients;
  readonly garnishes = this.buuzService.garnishes;
  readonly templates = this.buuzService.templates;
  readonly popularIngredients = this.buuzService.popularKeys
    .map((key) => this.buuzService.findIngredient(key, new Map()))
    .filter((i): i is BuuzIngredient => !!i);

  // ── State — one signal per field of the original's plain state object ──
  readonly format = signal<string>('cube');
  readonly mix = signal<ReadonlySet<string>>(new Set());
  readonly garnishSelection = signal<ReadonlySet<string>>(new Set());
  readonly activeTemplate = signal<string | null>(null);
  readonly customIngredients = signal<ReadonlyMap<string, BuuzIngredient>>(new Map());

  // Cocktail vs Mocktail is purely about intent — the kit itself is
  // always just format + mix + garnish, with the spirit BYO. The toggle
  // doesn't filter the catalog (every mix here works either way); it
  // drives the hero copy and a small badge on the summary panel so the
  // page speaks to whichever the person is actually building.
  readonly kitMode = signal<'cocktail' | 'mocktail'>('cocktail');

  setKitMode(mode: 'cocktail' | 'mocktail'): void {
    this.kitMode.set(mode);
  }

  readonly selectedFormat = computed(() => this.formats.find((f) => f.key === this.format()) ?? this.formats[0]);

  readonly ratios = computed(() => this.buuzService.computeRatios(Array.from(this.mix()), this.customIngredients()));
  readonly donutGradient = computed(() => this.buuzService.buildDonutGradient(this.ratios()));
  readonly mixCount = computed(() => this.mix().size);

  readonly selectedGarnishes = computed(() =>
    Array.from(this.garnishSelection())
      .map((key) => this.buuzService.findGarnish(key))
      .filter((g): g is NonNullable<typeof g> => !!g),
  );

  readonly canAddToCart = computed(() => this.mixCount() >= 2);
  readonly summaryHint = computed(() =>
    this.canAddToCart() ? "You're ready — just add your favorite spirit" : 'Select at least 2 mix ingredients',
  );

  // Live price for the kit as currently configured - recomputed from the
  // format + how far mix/garnish counts sit past their included
  // allowance (see BuuzService.computeKitPrice) every time either
  // changes, so what's shown on the CTA button always matches exactly
  // what addToCart() is about to add to the cart.
  readonly kitPrice = computed(() =>
    this.buuzService.computeKitPrice(this.format(), this.mixCount(), this.selectedGarnishes().length),
  );

  // Brief inline "Added ✓" confirmation on the button itself, in addition
  // to (not instead of) the real cart add below - addToCart() now
  // genuinely persists the kit into CartService rather than just
  // flipping this flag and forgetting it, but the flag still gives
  // immediate feedback without forcing a navigation away from the builder.
  readonly justAdded = signal(false);

  // ── Search + custom-ingredient add ──
  readonly searchControl = new FormControl('', { nonNullable: true });
  private readonly searchTerm = signal('');
  readonly searchDropdownOpen = signal(false);

  readonly searchResults = computed(() => {
    const q = this.searchTerm().trim().toLowerCase();
    if (!q) return [];
    return this.ingredients.filter((i) => i.name.toLowerCase().includes(q)).slice(0, 6);
  });
  readonly showCustomOption = computed(() => this.searchTerm().trim() !== '' && this.searchResults().length === 0);

  constructor() {
    this.searchControl.valueChanges
      .pipe(startWith(''), debounceTime(120), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.searchTerm.set(value);
        this.searchDropdownOpen.set(value.trim() !== '');
      });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.searchDropdownOpen()) return;
    const searchWrap = this.elementRef.nativeElement.querySelector('.search-wrap');
    if (searchWrap && !searchWrap.contains(event.target)) {
      this.searchDropdownOpen.set(false);
    }
  }

  // ── Templates ──
  selectTemplate(template: BuuzTemplate): void {
    if (this.activeTemplate() === template.name) {
      // Clicking the already-active template again clears it — same
      // toggle-off behaviour as the original.
      this.activeTemplate.set(null);
      this.mix.set(new Set());
      this.garnishSelection.set(new Set());
      return;
    }
    this.activeTemplate.set(template.name);
    this.format.set(template.format);
    this.mix.set(new Set(template.mix));
    this.garnishSelection.set(new Set(template.garnish));
  }

  templateIngredientNames(template: BuuzTemplate): string {
    return template.mix
      .map((key) => this.buuzService.findIngredient(key, new Map())?.name)
      .filter(Boolean)
      .join(', ');
  }

  // ── Format ──
  selectFormat(key: string): void {
    this.format.set(key);
    this.activeTemplate.set(null);
  }

  // ── Mix ingredients (popular chips + search results) ──
  toggleMixIngredient(key: string): void {
    const next = new Set(this.mix());
    if (next.has(key)) next.delete(key);
    else next.add(key);
    this.mix.set(next);
    this.activeTemplate.set(null);
  }

  addExistingIngredient(key: string): void {
    const next = new Set(this.mix());
    next.add(key);
    this.mix.set(next);
    this.activeTemplate.set(null);
    this.closeSearch();
  }

  addCustomIngredient(rawName: string): void {
    const name = rawName.trim();
    if (!name) return;
    const key = this.buuzService.slugifyCustomKey(name);
    if (!this.customIngredients().get(key)) {
      const next = new Map(this.customIngredients());
      next.set(key, { key, name, icon: '✨', role: 'custom', color: '#D4A94A' });
      this.customIngredients.set(next);
    }
    const nextMix = new Set(this.mix());
    nextMix.add(key);
    this.mix.set(nextMix);
    this.activeTemplate.set(null);
    this.closeSearch();
  }

  private closeSearch(): void {
    this.searchControl.setValue('');
    this.searchDropdownOpen.set(false);
  }

  onSearchEnter(): void {
    const q = this.searchControl.value.trim();
    if (!q) return;
    const exact = this.ingredients.find((i) => i.name.toLowerCase() === q.toLowerCase());
    if (exact) {
      this.addExistingIngredient(exact.key);
      return;
    }
    const partial = this.ingredients.find((i) => i.name.toLowerCase().includes(q.toLowerCase()));
    if (partial) {
      this.addExistingIngredient(partial.key);
      return;
    }
    this.addCustomIngredient(q);
  }

  // ── Garnish ──
  toggleGarnish(key: string): void {
    const next = new Set(this.garnishSelection());
    if (next.has(key)) next.delete(key);
    else next.add(key);
    this.garnishSelection.set(next);
    this.activeTemplate.set(null);
  }

  // ── Cart ──
  // Adding a kit to the cart is the one action on this otherwise
  // open-to-anyone page that actually needs a real identity behind it -
  // the cart is what checkout charges, so it shouldn't be possible to
  // build one up anonymously and only discover a login wall at payment.
  // Not logged in: the kit currently on screen is captured in a closure
  // and handed to AuthModalService as a pending action rather than
  // dropped - the same "gate + resume" mechanism the Header's "Event"
  // link already uses (see AuthModalService's own doc comment). Login
  // stays a modal overlay on top of /buuz rather than a route change, so
  // once it closes post-login the person is already exactly where they
  // were, kit and all, with the item now actually in the cart.
  addToCart(): void {
    if (!this.canAddToCart()) return;

    if (!this.authApi.isAuthenticated()) {
      this.authModal.openWithPendingAction(() => this.performAddToCart());
      return;
    }

    this.performAddToCart();
  }

  private performAddToCart(): void {
    const fmt = this.selectedFormat();
    const mixNames = this.ratios().map((r) => r.ingredient.name);
    const garnishNames = this.selectedGarnishes().map((g) => g.name);

    this.cartService.addItem({
      formatKey: fmt.key,
      formatName: fmt.name,
      formatIcon: fmt.icon,
      mixKeys: Array.from(this.mix()),
      mixSummary: mixNames.join(', '),
      garnishSummary: garnishNames.length > 0 ? garnishNames.join(', ') : 'No garnish',
      unitPrice: this.kitPrice(),
    });

    this.justAdded.set(true);
    setTimeout(() => this.justAdded.set(false), 2400);
  }
}
