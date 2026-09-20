import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Header } from '../../components/header/header';
import { Footer } from '../../components/footer/footer';
import { ReviewMenuService } from '../../shared/services/review-menu.service';
import {
  KitchenLabCourseType,
  COURSE_TYPE_LABELS,
  RecipeSubmission,
} from '../../shared/models/menu/kitchen-lab-recipe.model';

interface CourseTypeOption {
  readonly value: KitchenLabCourseType;
  readonly label: string;
}

const DIETARY_OPTIONS = ['Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free', 'Contains alcohol', 'Non-alcoholic'] as const;
const ALLERGEN_FREE_OPTIONS = ['Nut-free', 'Gluten-free', 'Dairy-free', 'Shellfish-free', 'Egg-free', 'Soy-free', 'Vegan'] as const;

// Real upload-size ceiling for the video field. This app has no real
// file-storage backend to enforce a limit server-side, so it's enforced
// here instead - without one, nothing stops someone from picking a
// multi-gigabyte file that then sits in memory as an object URL for the
// rest of the session.
const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024; // 100MB

/**
 * Submit Recipe — the real functional page Kitchen Lab's own landing
 * page only ever illustrated with a fake recording-timer demo. A home
 * cook uploads an actual video file and writes out the complete recipe
 * here; on submit it's persisted into the same repository
 * review-menu.service.ts's getKitchenLabRecipes() already serves to the
 * Kitchen Lab picker on Review Menu - so a recipe submitted here is
 * genuinely selectable by a Foodie afterward, not just a success message
 * that goes nowhere.
 *
 * "Saved to the vector DB" in the product sense is implemented honestly:
 * this app has no real vector database or embedding model anywhere.
 * embeddingText (built in the model file) is a plain concatenation of
 * this recipe's searchable fields, and matchRecipesToEvent() on the
 * service scores it against an event's stated preferences via
 * keyword/tag overlap - a deliberate, transparent stand-in for what a
 * real similarity search would do server-side, not a claim that real
 * semantic embedding happens in this browser.
 */
@Component({
  selector: 'app-submit-recipe',
  standalone: true,
  imports: [Header, Footer, ReactiveFormsModule],
  templateUrl: './submit-recipe.html',
  styleUrl: './submit-recipe.scss',
})
export class SubmitRecipe {
  private readonly fb = inject(FormBuilder);
  private readonly reviewMenuService = inject(ReviewMenuService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly courseTypeOptions: readonly CourseTypeOption[] = (
    Object.keys(COURSE_TYPE_LABELS) as KitchenLabCourseType[]
  ).map((value) => ({ value, label: COURSE_TYPE_LABELS[value] }));

  readonly dietaryOptions = DIETARY_OPTIONS;
  readonly allergenFreeOptions = ALLERGEN_FREE_OPTIONS;

  readonly selectedTags = signal<readonly string[]>([]);
  readonly selectedAllergenFree = signal<readonly string[]>([]);

  readonly ingredients = signal<string[]>(['']);
  readonly ingredientErrorShown = signal(false);

  readonly videoFile = signal<File | null>(null);
  readonly videoPreviewUrl = signal<string | null>(null);
  readonly videoError = signal('');

  readonly isSubmitting = signal(false);
  readonly showSuccess = signal(false);
  readonly submittedRecipeName = signal('');

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    description: ['', [Validators.required, Validators.maxLength(400)]],
    courseType: ['' as KitchenLabCourseType | '', Validators.required],
    cuisine: ['', Validators.required],
    price: ['', [Validators.required, Validators.min(0.01)]],
    servings: ['', [Validators.required, Validators.min(1)]],
    prepTimeMinutes: ['', [Validators.required, Validators.min(0)]],
    cookTimeMinutes: ['', [Validators.required, Validators.min(0)]],
    instructions: ['', [Validators.required, Validators.maxLength(4000)]],
    chefName: ['', Validators.required],
  });

  constructor() {
    this.destroyRef.onDestroy(() => {
      // Object URLs are only released when explicitly revoked - without
      // this, navigating away from the page while a video preview is
      // loaded would leak that memory for the rest of the session.
      const url = this.videoPreviewUrl();
      if (url) URL.revokeObjectURL(url);
    });
  }

  hasError(field: keyof typeof this.form.controls): boolean {
    const control = this.form.get(field);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  getErrorMessage(field: string): string {
    const control = this.form.get(field);
    if (!control?.errors) return '';
    if (control.errors['required']) return 'This field is required';
    if (control.errors['min']) return 'Value must be greater than 0';
    if (control.errors['maxLength']) return 'Too long';
    return '';
  }

  toggleTag(tag: string): void {
    this.selectedTags.update((tags) => (tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag]));
  }
  toggleAllergenFree(tag: string): void {
    this.selectedAllergenFree.update((tags) => (tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag]));
  }

  addIngredientRow(): void {
    this.ingredients.update((list) => [...list, '']);
  }
  removeIngredientRow(index: number): void {
    this.ingredients.update((list) => list.filter((_, i) => i !== index));
  }
  updateIngredient(index: number, value: string): void {
    this.ingredients.update((list) => list.map((item, i) => (i === index ? value : item)));
  }
  private validIngredients(): string[] {
    return this.ingredients().map((i) => i.trim()).filter((i) => i.length > 0);
  }

  onVideoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.videoError.set('');

    if (!file.type.startsWith('video/')) {
      this.videoError.set('Please choose a video file.');
      input.value = '';
      return;
    }
    if (file.size > MAX_VIDEO_SIZE_BYTES) {
      this.videoError.set(`Video is too large (${(file.size / (1024 * 1024)).toFixed(0)}MB). Max size is 100MB.`);
      input.value = '';
      return;
    }

    const previousUrl = this.videoPreviewUrl();
    if (previousUrl) URL.revokeObjectURL(previousUrl);

    this.videoFile.set(file);
    this.videoPreviewUrl.set(URL.createObjectURL(file));
  }

  removeVideo(): void {
    const url = this.videoPreviewUrl();
    if (url) URL.revokeObjectURL(url);
    this.videoFile.set(null);
    this.videoPreviewUrl.set(null);
    this.videoError.set('');
  }

  submit(): void {
    const hasIngredients = this.validIngredients().length > 0;
    if (!hasIngredients) this.ingredientErrorShown.set(true);

    if (!this.videoFile()) {
      this.videoError.set('A video of the dish is required.');
    }

    if (this.form.invalid || !hasIngredients || !this.videoFile()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const raw = this.form.getRawValue();

    const submission: RecipeSubmission = {
      name: raw.name.trim(),
      description: raw.description.trim(),
      courseType: raw.courseType as KitchenLabCourseType,
      cuisine: raw.cuisine.trim(),
      price: Number(raw.price),
      servings: Number(raw.servings),
      prepTimeMinutes: Number(raw.prepTimeMinutes),
      cookTimeMinutes: Number(raw.cookTimeMinutes),
      instructions: raw.instructions.trim(),
      chefName: raw.chefName.trim(),
      ingredients: this.validIngredients(),
      tags: this.selectedTags(),
      allergenFree: this.selectedAllergenFree(),
      // Real object URL for this session's preview - not a hosted asset,
      // since this app has no file storage backend (see class-level note).
      videoUrl: this.videoPreviewUrl(),
    };

    this.reviewMenuService.submitRecipe(submission).subscribe((recipe) => {
      this.isSubmitting.set(false);
      this.submittedRecipeName.set(recipe.name);
      this.showSuccess.set(true);
    });
  }

  /** Clears every field back to its initial state - the reactive form plus
   *  the signal-driven pieces (ingredients, tags, allergens, video) that
   *  aren't part of the FormGroup. form.reset() also marks the controls
   *  pristine/untouched, so validation errors clear too. */
  clearForm(): void {
    this.form.reset();
    this.ingredients.set(['']);
    this.ingredientErrorShown.set(false);
    this.selectedTags.set([]);
    this.selectedAllergenFree.set([]);
    this.removeVideo();
  }

  submitAnother(): void {
    this.clearForm();
    this.showSuccess.set(false);
  }

  goToKitchenLab(): void {
    this.router.navigateByUrl('/kitchen-lab').then(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    });
  }
}
