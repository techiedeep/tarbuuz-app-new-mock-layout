import { Component, DestroyRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, startWith } from 'rxjs';
import { ReviewMenuService } from '../../shared/services/review-menu.service';
import {
  COURSE_TYPE_LABELS,
  KitchenLabCourseType,
  KitchenLabRecipe,
} from '../../shared/models/menu/kitchen-lab-recipe.model';

/**
 * Self-contained, same shape as BiddingDrawer: fetches its own data when
 * opened, owns its own search/filter state, and only ever tells its
 * parent one thing — "this recipe was picked." The Review Menu page
 * doesn't need to know anything about the repository itself.
 */
@Component({
  selector: 'app-kitchen-lab-picker',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './kitchen-lab-picker.html',
  styleUrl: './kitchen-lab-picker.scss',
})
export class KitchenLabPicker implements OnChanges {
  private readonly reviewMenuService = inject(ReviewMenuService);
  private readonly destroyRef = inject(DestroyRef);

  @Input() open = false;
  /** Preselects the course filter to whichever section's "+ Add" button
   *  was actually clicked, so picking a starter doesn't require also
   *  re-filtering away from a default "all courses" view. */
  @Input() initialCourseType: KitchenLabCourseType | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() recipePicked = new EventEmitter<KitchenLabRecipe>();

  readonly courseLabels = COURSE_TYPE_LABELS;
  readonly courseFilters: ReadonlyArray<{ id: KitchenLabCourseType | 'all'; label: string }> = [
    { id: 'all', label: 'All Courses' },
    { id: 'starters', label: 'Starters' },
    { id: 'main_courses', label: 'Main Courses' },
    { id: 'desserts', label: 'Desserts' },
    { id: 'drinks', label: 'Drinks' },
  ];

  readonly isLoading = signal(true);
  readonly recipes = signal<KitchenLabRecipe[]>([]);
  readonly activeFilter = signal<KitchenLabCourseType | 'all'>('all');
  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly searchTerm = signal('');

  readonly filteredRecipes = computed(() => {
    const filter = this.activeFilter();
    const term = this.searchTerm().trim().toLowerCase();
    return this.recipes().filter((r) => {
      const matchesFilter = filter === 'all' || r.courseType === filter;
      const matchesSearch = !term || r.name.toLowerCase().includes(term) || r.chefName.toLowerCase().includes(term);
      return matchesFilter && matchesSearch;
    });
  });

  constructor() {
    this.searchControl.valueChanges
      .pipe(startWith(''), debounceTime(150), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.searchTerm.set(value));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.activeFilter.set(this.initialCourseType ?? 'all');
      if (this.recipes().length === 0) this.loadRecipes();
    }
  }

  private loadRecipes(): void {
    this.isLoading.set(true);
    this.reviewMenuService
      .getKitchenLabRecipes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((recipes) => {
        this.isLoading.set(false);
        this.recipes.set(recipes);
      });
  }

  setFilter(filter: KitchenLabCourseType | 'all'): void {
    this.activeFilter.set(filter);
  }

  pick(recipe: KitchenLabRecipe): void {
    this.recipePicked.emit(recipe);
  }

  close(): void {
    this.closed.emit();
  }
}
