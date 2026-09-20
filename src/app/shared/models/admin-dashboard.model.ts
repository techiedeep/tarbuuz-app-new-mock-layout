/**
 * Admin Dashboard models.
 *
 * No AdminDashboardService or admin route exists in this app yet — per
 * instruction, this file completes the model layer only. Field shapes are
 * kept exactly as provided (including the real backend's naming) so that
 * whenever an admin service/page is actually built, it can consume these
 * directly without a translation layer.
 *
 * Security note: type definitions only, no logic — matches OWASP guidance
 * that a model layer should never itself carry authorization decisions;
 * that belongs in guards/services that consume these types.
 */

export interface AdminStats {
  totalUsers: number;
  totalEvents: number;
  totalBids: number;
  totalSubscriptions: number;
  activeUsers: number;
  revenueThisMonth: number;
  growthRate: number;
  pendingReviews: number;
  totalAcceptedBids: number;
  totalMenuValidations: number;
  newUsersLast7Days: number;
  foodieProfileCount: number;
  hostProfileCount: number;
  supplierProfileCount: number;
  totalActiveSubscriptions: number;
  totalSubscriptionsAllTime: number;
  basicSubscriptionCount: number;
  professionalSubscriptionCount: number;
  enterpriseSubscriptionCount: number;
}

export interface UserActivity {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  accountStatus: string;
  verified: boolean;
  eventsCreated: number;
  bidsPlaced: number;
  lastActive: string;
  joinedAt: string;
  subscriptionTier: string;
}

export interface RecentActivity {
  id: string;
  type: 'USER_REGISTERED' | 'EVENT_CREATED' | 'BID_PLACED' | 'SUBSCRIPTION' | 'REVIEW';
  message: string;
  user: string;
  timestamp: string;
  icon: string;
  color: string;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  percentage: number;
}

export type AdminSection =
  | 'overview'
  | 'users'
  | 'events'
  | 'bids'
  | 'subscriptions'
  | 'reports'
  | 'settings';
