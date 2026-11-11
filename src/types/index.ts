export type CustomerSegment = 'regular' | 'reorder_due' | 'at_risk' | 'inactive' | 'high_udhaar' | 'first_time';

export type ActionType = 'reorder_reminder' | 'cod_prepay' | 'cod_verify' | 'udhaar_reminder' | 'winback_offer';

export type ActionStatus = 'pending_approval' | 'approved' | 'rejected' | 'executed' | 'snoozed';

export type AutonomyLevel = 'recommendation_only' | 'approval_required' | 'bounded_autonomous';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  city: string;
  state: string;
  firstOrderDate: string;
  lastOrderDate: string;
  totalOrders: number;
  totalSpent: number;
  averageOrderCadenceDays: number;
  daysSinceLastOrder: number;
  primaryCategory: string;
  lastProductOrdered: string;
  segment: CustomerSegment;
  codReliabilityScore: number; // 0-100 (higher = more reliable, lower = higher RTO risk)
  outstandingUdhaar: number;
  udhaarDueDate?: string;
  consentWhatsApp: boolean;
  notes: string;
  aiInsightSummary: string;
}

export interface PendingAction {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerCity: string;
  type: ActionType;
  title: string;
  reason: string;
  confidence: number; // 0 to 100
  potentialImpact: string;
  status: ActionStatus;
  suggestedMessage: string;
  channel: 'WhatsApp';
  createdAt: string;
  expiresInHours: number;
  metadata?: {
    orderId?: string;
    orderAmount?: number;
    productName?: string;
    udhaarAmount?: number;
    daysOverdue?: number;
    codRiskScore?: number;
    riskFactors?: string[];
  };
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  date: string;
  amount: number;
  items: string[];
  paymentMode: 'COD' | 'Prepaid_UPI' | 'Prepaid_Card' | 'Udhaar';
  status: 'Delivered' | 'In_Transit' | 'Pending_Verification' | 'RTO_Returned' | 'Cancelled';
  codRiskScore?: number;
  riskReasons?: string[];
}

export interface MetricSummary {
  totalRevenue: number;
  incrementalAiRevenue: number;
  incrementalLiftPct: number;
  codRtoBaselinePct: number;
  codRtoCurrentPct: number;
  rtoSavedAmount: number;
  activeCustomers: number;
  reactivatedThisMonth: number;
  totalUdhaarTracked: number;
  collectedThisMonth: number;
  hoursSavedWeekly: number;
}

export interface AutonomyPolicyConfig {
  reorderReminders: AutonomyLevel;
  codPrepayNudges: AutonomyLevel;
  udhaarReminders: AutonomyLevel;
  winbackOffers: AutonomyLevel;
  maxDailyMessagesPerCustomer: number;
  quietHoursStart: string; // e.g. "21:00"
  quietHoursEnd: string;   // e.g. "09:00"
  minConfidenceForAutonomous: number; // e.g. 85%
  maxAutonomousDiscountPct: number;   // e.g. 10%
  emergencyPauseAll: boolean;
}
