/**
 * A Foodie's accept/reject response to a menu analysis. No service
 * consumes this yet; completes the model layer only, per instruction.
 */
export interface MenuUserResponseRequest {
  eventId: string; // UUID
  menuId: string; // UUID
  userResponse: string; // 'accept' | 'reject' or free text
}
