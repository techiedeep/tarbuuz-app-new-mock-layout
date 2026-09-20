/**
 * A Foodie's feedback on a chef's menu recommendation — ratings plus an
 * optional change-request comment. Distinct from user-response.model.ts,
 * which is the simpler accept/reject action itself. No service consumes
 * this yet; completes the model layer only, per instruction.
 */
export interface UserFeedback {
  eventId: string;
  profileId: string;
  eventStatus: string;
  changeRequestedComment: string;
  recommendationStatus: string;
  updatedByUserId: string;
  changeRequestedByUserId: string;
  menuCreativityRating: number;
  dietaryAccommodationRating: number;
  overallAppealRating: number;
}
