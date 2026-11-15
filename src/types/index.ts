export type AppLanguage = 'en' | 'hi';
export type AppMode = 'demo' | 'live';
export type AutonomyLevel = 'recommendation_only' | 'approval_required' | 'bounded_autonomous';

export type CustomerSegment =
  | 'regular'
  | 'loyal'
  | 'reorder_due'
  | 'at_risk'
  | 'inactive'
  | 'high_udhaar'
  | 'first_time';

export type ActionType =
  | 'reorder_reminder'
  | 'cod_prepay'
  | 'cod_verify'
  | 'udhaar_reminder'
  | 'winback_offer';

export type ActionStatus =
  | 'pending_approval'
  | 'approved'
  | 'executed'
  | 'rejected'
  | 'snoozed'
  | 'scheduled'
  | 'failed'
  | 'escalated';

export interface AuthSessionResponse {
  isAuthenticated: boolean;
  mode: AppMode;
  role: 'owner' | 'manager' | 'staff' | 'demo_visitor';
  user: {
    id: string;
    email: string;
    full_name: string;
    email_verified: number;
    created_at: string;
  } | null;
  business: {
    id: string;
    name: string;
    category: string;
    city: string;
    state: string;
    currency: string;
    timezone: string;
    preferred_language: string;
    store_url: string;
    mode: AppMode;
  } | null;
  settings: BusinessSettingsRow | null;
}

export interface BusinessSettingsRow {
  business_id: string;
  reorder_mode: AutonomyLevel;
  cod_prepay_mode: AutonomyLevel;
  udhaar_mode: AutonomyLevel;
  winback_mode: AutonomyLevel;
  max_daily_messages: number;
  quiet_hours_start: string;
  quiet_hours_end: string;
  min_confidence: number;
  max_discount_pct: number;
  daily_spend_cap_inr: number;
  emergency_pause_all: number;
}

export interface AutonomyPolicyConfig {
  reorderReminders: AutonomyLevel;
  codPrepayNudges: AutonomyLevel;
  udhaarReminders: AutonomyLevel;
  winbackOffers: AutonomyLevel;
  maxDailyMessagesPerCustomer: number;
  quietHoursStart: string;
  quietHoursEnd: string;
  minConfidenceForAutonomous: number;
  maxAutonomousDiscountPct: number;
  dailySpendCapInr: number;
  emergencyPauseAll: boolean;
}

export interface CustomerRecord {
  id: string;
  business_id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  address_line: string;
  pincode: string;
  primary_category: string;
  last_product_ordered: string;
  first_order_date: string;
  last_order_date: string;
  total_orders: number;
  total_spent: number;
  average_cadence_days: number;
  days_since_last_order: number;
  cod_reliability_score: number;
  outstanding_udhaar: number;
  udhaar_due_date: string;
  consent_whatsapp: number;
  opted_out: number;
  preferred_language: string;
  segment: CustomerSegment;
  holdout_group: number;
  notes: string;
  ai_insight: string;
  is_demo: number;
}

export interface OrderRecord {
  id: string;
  business_id: string;
  customer_id: string;
  customer_name?: string;
  customer_phone?: string;
  customer_city?: string;
  customer_total_orders?: number;
  order_number: string;
  items_json: string;
  total_amount: number;
  payment_mode: 'COD' | 'Prepaid_UPI' | 'Prepaid_Card' | 'Udhaar';
  delivery_address: string;
  pincode: string;
  status: 'Pending_Verification' | 'In_Transit' | 'Delivered' | 'RTO_Returned' | 'Cancelled';
  cod_risk_score: number;
  risk_reasons_json: string;
  courier_cost: number;
  actual_outcome: string;
  ordered_at: string;
}

export interface UdhaarRecord {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  customer_city: string;
  consent_whatsapp: number;
  opted_out: number;
  original_amount: number;
  remaining_amount: number;
  due_date: string;
  status: 'pending' | 'partial' | 'paid' | 'overdue';
  notes: string;
  created_at: string;
  last_payment_amount?: number | null;
  last_payment_date?: string | null;
  latest_followup_status?: string | null;
  latest_followup_id?: string | null;
  latest_followup_message?: string | null;
}

export interface CustomerTimelineEvent {
  id: string;
  type: 'order' | 'payment' | 'message' | 'approval';
  title: string;
  subtitle: string;
  status: string;
  amount?: number;
  timestamp: string;
}

export interface PaymentRecord {
  id: string;
  customer_id: string;
  customer_name: string;
  amount: number;
  method: string;
  reference_id: string;
  status: string;
  paid_at: string;
}

export interface ApprovalRecord {
  id: string;
  workflow_id: string | null;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  customer_city: string;
  customer_last_product?: string;
  consent_whatsapp: number;
  opted_out: number;
  order_id: string | null;
  action_type: ActionType;
  title: string;
  reason: string;
  agent_name: string;
  required_permission: string;
  confidence: number;
  potential_impact: string;
  suggested_message: string;
  channel: string;
  status: ActionStatus;
  scheduled_for: string | null;
  rejection_reason?: string;
  metadata_json: string;
  workflow_status?: string | null;
  workflow_current_step?: string | null;
  execution_status?: string | null;
  provider_message_id?: string | null;
  execution_error?: string | null;
  executed_at?: string | null;
  created_at: string;
}

export interface AgentSummary {
  name: string;
  role: string;
  permissionScope: string;
  totalRuns: number;
  completedRuns: number;
  attentionRuns: number;
  avgDurationMs: number;
}

export interface WorkflowTaskRow {
  id: string;
  workflow_id: string;
  agent_name: string;
  step_order: number;
  status: string;
  input_json?: string;
  output_json?: string;
  reason: string;
  confidence: number | null;
  duration_ms: number | null;
  error_message: string;
  created_at: string;
}

export interface WorkflowRecord {
  id: string;
  workflow_type: string;
  trigger_source: string;
  target_type: string;
  target_id: string;
  status: string;
  current_step: string;
  error_message: string;
  created_at: string;
  tasks: WorkflowTaskRow[];
}

export interface IntegrationStatusView {
  provider: 'whatsapp' | 'shopify' | 'shiprocket' | 'razorpay' | 'gemini';
  label: string;
  description: string;
  status: 'not_configured' | 'connected' | 'error' | 'disconnected';
  lastVerifiedAt: string | null;
  lastError: string;
  configSummary: Record<string, string>;
  requiredFields: Array<{ key: string; label: string; secret?: boolean; placeholder: string }>;
}

export interface AnalyticsSummaryResponse {
  mode: AppMode;
  range: string;
  actualObserved: {
    totalCustomers: number;
    totalOrders: number;
    grossRevenue: number;
    deliveredRevenue: number;
    codOrders: number;
    codDeliveredCount?: number;
    rtoOrders: number;
    collectedPayments: number;
    collectedPaymentCount: number;
    executedActions: number;
    failedActions: number;
    customersRecovered?: number;
    repeatPurchases?: number;
    repeatPurchaseRevenue?: number;
    messagesDelivered?: number;
    humanEscalations?: number;
    avgResolutionMinutes?: number;
  };
  opportunities: {
    dueForReorderCount: number;
    flaggedCodOrders: number;
    flaggedCodExposureInr: number;
    pendingUdhaarInr: number;
    pendingUdhaarAccounts: number;
    pendingApprovals: number;
  };
  cohorts: {
    engagedCustomers: number;
    engagedObservedRevenue: number;
    holdoutCustomers: number;
    holdoutObservedRevenue: number;
  };
  funnel?: {
    customersTracked: number;
    dueForFollowUp: number;
    draftsPrepared: number;
    messagesDispatched: number;
    repliesReceived: number;
    conversionsObserved: number;
  };
  paymentBreakdown?: {
    cod: number;
    prepaidUpi: number;
    prepaidCard: number;
    udhaar: number;
  };
  orderStatusBreakdown?: {
    pendingVerification: number;
    inTransit: number;
    delivered: number;
    rtoReturned: number;
  };
  approvalBreakdown?: {
    needsApproval: number;
    completed: number;
    scheduled: number;
    issues: number;
  };
  customerSegments?: Record<string, number>;
  orderTrend: Array<{ date: string; orders: number; revenue: number }>;
}

export interface AuditLogRecord {
  id: string;
  actor_type: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details_json: string;
  created_at: string;
}

export interface VoiceIntentResult {
  intent: string;
  targetTab: 'dashboard' | 'udhaar' | 'cod-risk' | 'customers' | 'inbox' | 'agents' | 'orders';
  summary: string;
  requiresConfirmation: boolean;
  suggestedWorkflow?: 'reactivation' | 'cod_protection' | 'udhaar_collection';
}

export type ConsoleTabId =
  | 'dashboard'
  | 'customers'
  | 'orders'
  | 'cod-risk'
  | 'udhaar'
  | 'agents'
  | 'inbox'
  | 'analytics'
  | 'settings'
  | 'autonomy'
  | 'integrations'
  | 'import';

export type SettingsSubTabId = 'autonomy' | 'integrations' | 'import' | 'profile' | 'audit';

// Preserved marketing page types for ProductTour & Simulator
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
  codReliabilityScore: number;
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
  confidence: number;
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
