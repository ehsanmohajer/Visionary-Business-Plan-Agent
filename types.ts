
export enum Language {
  EN = 'en',
  FI = 'fi'
}

export type SubscriptionTier = 'free' | 'plus' | 'pro';
export type SubscriptionStatus = 'active' | 'pending' | 'expired' | 'none';

export interface UserMessage {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  message: string;
  createdAt: string;
  replied: boolean;
}

export interface PaymentReceipt {
  id: string;
  userId: string;
  email: string;
  tier: SubscriptionTier;
  amount: number;
  fileName: string;
  fileData?: string; // Base64 simulated for preview
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  phone?: string;
  email: string;
  password?: string;
  role: 'user' | 'admin';
  tier: SubscriptionTier;
  subscriptionStatus: SubscriptionStatus;
  subscriptionEndDate?: string;
  generationsToday: number;
  lastGenerationDate: string;
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountPercent: number;
}

export interface SavedPlan {
  id: string;
  userId: string;
  userEmail: string;
  companyName: string;
  planText: string;
  createdAt: string;
  data: BusinessFormData;
}

export interface ExpenseItem {
  id: string;
  name: string;
  amount: number;
}

export interface BusinessFormData {
  businessType: string;
  companyName: string;
  description: string;
  uniqueness: string;
  targetAudience: string;
  competitors: string;
  competitorDifferentiator: string;
  marketTrends: string;
  revenueStreams: string;
  resources: string;
  deliveryProcess: string;
  customerReach: string;
  marketingChannels: string;
  brandImage: string;
  startupCosts: ExpenseItem[];
  fixedCosts: ExpenseItem[];
  variableCosts: ExpenseItem[];
  revenueGoal: number;
  risks: string;
  mitigation: string;
}
