import { Component } from '@angular/core';

export interface ProcessStage {
  readonly num: number;
  readonly label: string;
}

/**
 * A purely informational legend, not a per-event "you are here" indicator —
 * this sits at the dashboard level, above a grid that can contain many
 * events simultaneously at different stages, so there's no single "current"
 * stage to point at here. Each event card's own status badge already shows
 * *that* event's position; this explains the full journey those badges are
 * drawn from. Kept as its own standalone component since the six-stage
 * list is a real, specific piece of domain knowledge that has no reason to
 * live inline in the dashboard page's own template.
 */
@Component({
  selector: 'app-process-stepper',
  standalone: true,
  templateUrl: './process-stepper.html',
  styleUrl: './process-stepper.scss',
})
export class ProcessStepper {
  readonly stages: readonly ProcessStage[] = [
    { num: 1, label: 'Create Event' },
    { num: 2, label: 'Review Menu & Chef Validation' },
    { num: 3, label: 'Accept or Reject Validation & Approve Menu' },
    { num: 4, label: 'Review Bids' },
    { num: 5, label: 'Make Payment' },
    { num: 6, label: 'Scheduled' },
  ];
}
