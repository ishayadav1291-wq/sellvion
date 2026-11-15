import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { PeekHero } from './components/PeekHero';
import { ProductTour, ProductTourTab } from './components/ProductTour';
import { ComparisonMatrix } from './components/ComparisonMatrix';
import { PartnersSection } from './components/PartnersSection';
import { FaqSection } from './components/FaqSection';
import { MerchantWorkspace } from './components/workspace/MerchantWorkspace';
import { AuthModal } from './components/workspace/AuthModal';
import { AiCopilotModal } from './components/AiCopilotModal';
import { INITIAL_CUSTOMERS } from './data/mockData';
import {
  AgentSummary,
  AnalyticsSummaryResponse,
  AppLanguage,
  AppMode,
  ApprovalRecord,
  AuditLogRecord,
  AuthSessionResponse,
  AutonomyPolicyConfig,
  ConsoleTabId,
  Customer,
  CustomerRecord,
  IntegrationStatusView,
  OrderRecord,
  PaymentRecord,
  UdhaarRecord,
  WorkflowRecord,
} from './types';
import { apiRequest, setModeHeader, setStoredToken } from './lib/api';
import { useFirebase } from './context/FirebaseProvider';
import { tr } from './i18n/translations';
import { Sparkles, Check, ArrowRight, RotateCcw } from 'lucide-react';

const DEFAULT_AUTONOMY: AutonomyPolicyConfig = {
  reorderReminders: 'approval_required',
  codPrepayNudges: 'approval_required',
  udhaarReminders: 'approval_required',
  winbackOffers: 'recommendation_only',
  maxDailyMessagesPerCustomer: 1,
  quietHoursStart: '21:00',
  quietHoursEnd: '09:00',
  minConfidenceForAutonomous: 85,
  maxAutonomousDiscountPct: 10,
  dailySpendCapInr: 2500,
  emergencyPauseAll: false,
};

function mapRecordToCustomer(rec: CustomerRecord): Customer {
  return {
    id: rec.id,
    name: rec.name,
    phone: rec.phone,
    city: rec.city,
    state: rec.state,
    firstOrderDate: rec.first_order_date,
    lastOrderDate: rec.last_order_date,
    totalOrders: rec.total_orders,
    totalSpent: rec.total_spent,
    averageOrderCadenceDays: rec.average_cadence_days,
    daysSinceLastOrder: rec.days_since_last_order,
    primaryCategory: rec.primary_category,
    lastProductOrdered: rec.last_product_ordered,
    segment: rec.segment,
    codReliabilityScore: rec.cod_reliability_score,
    outstandingUdhaar: rec.outstanding_udhaar,
    udhaarDueDate: rec.udhaar_due_date || undefined,
    consentWhatsApp: Boolean(rec.consent_whatsapp),
    notes: rec.notes,
    aiInsightSummary: rec.ai_insight,
  };
}

export default function App() {
  // Theme state with localStorage
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sellvion-theme') as 'light' | 'dark' | null;
      if (saved === 'light' || saved === 'dark') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  const [language, setLanguage] = useState<AppLanguage>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sellvion-lang');
      if (saved === 'en' || saved === 'hi') return saved;
    }
    return 'en';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('sellvion-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('sellvion-lang', language);
  }, [language]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Overlay console & modal states (matches recording flow)
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [consoleTab, setConsoleTab] = useState<ConsoleTabId>('dashboard');
  const [authModal, setAuthModal] = useState<{ open: boolean; mode: 'login' | 'signup' }>({
    open: false,
    mode: 'login',
  });
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [range, setRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [tourTab, setTourTab] = useState<ProductTourTab>('whatsapp');

  // Server-backed workspace state
  const [appMode, setAppMode] = useState<AppMode>('demo');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [businessName, setBusinessName] = useState('Mystic Spices & Naturals (Demo Store)');
  const [businessInfo, setBusinessInfo] = useState<AuthSessionResponse['business']>(null);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [udhaarRecords, setUdhaarRecords] = useState<UdhaarRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([]);
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowRecord[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationStatusView[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummaryResponse | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [autonomyConfig, setAutonomyConfig] = useState<AutonomyPolicyConfig>(DEFAULT_AUTONOMY);
  const { user: firebaseUser, cloudWorkspace, cloudCustomers, signOutFirebase } = useFirebase();

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 3600);
  }, []);

  const refreshWorkspace = useCallback(async () => {
    try {
      const [
        meRes,
        custRes,
        ordRes,
        udhaarRes,
        appRes,
        agentRes,
        wfRes,
        intRes,
        anaRes,
        auditRes,
      ] = await Promise.all([
        apiRequest<AuthSessionResponse>('/api/auth/me'),
        apiRequest<{ customers: CustomerRecord[] }>('/api/customers?pageSize=100'),
        apiRequest<{ orders: OrderRecord[] }>('/api/orders'),
        apiRequest<{ records: UdhaarRecord[]; payments: PaymentRecord[] }>('/api/udhaar'),
        apiRequest<{ approvals: ApprovalRecord[] }>('/api/approvals'),
        apiRequest<{ agents: AgentSummary[] }>('/api/agents'),
        apiRequest<{ workflows: WorkflowRecord[] }>('/api/workflows'),
        apiRequest<{ integrations: IntegrationStatusView[] }>('/api/integrations'),
        apiRequest<AnalyticsSummaryResponse>(`/api/analytics/summary?range=${range}`),
        apiRequest<{ logs: AuditLogRecord[] }>('/api/audit-logs'),
      ]);

      setIsAuthenticated(meRes.isAuthenticated);
      setAppMode(meRes.mode);
      setBusinessInfo(meRes.business);
      if (meRes.business?.name) setBusinessName(meRes.business.name);
      if (meRes.settings) {
        setAutonomyConfig({
          reorderReminders: meRes.settings.reorder_mode,
          codPrepayNudges: meRes.settings.cod_prepay_mode,
          udhaarReminders: meRes.settings.udhaar_mode,
          winbackOffers: meRes.settings.winback_mode,
          maxDailyMessagesPerCustomer: meRes.settings.max_daily_messages,
          quietHoursStart: meRes.settings.quiet_hours_start,
          quietHoursEnd: meRes.settings.quiet_hours_end,
          minConfidenceForAutonomous: meRes.settings.min_confidence,
          maxAutonomousDiscountPct: meRes.settings.max_discount_pct,
          dailySpendCapInr: meRes.settings.daily_spend_cap_inr,
          emergencyPauseAll: Boolean(meRes.settings.emergency_pause_all),
        });
      }
      setCustomers(custRes.customers);
      setOrders(ordRes.orders);
      setUdhaarRecords(udhaarRes.records);
      setPayments(udhaarRes.payments);
      setApprovals(appRes.approvals);
      setAgents(agentRes.agents);
      setWorkflows(wfRes.workflows);
      setIntegrations(intRes.integrations);
      setAnalytics(anaRes);
      setAuditLogs(auditRes.logs);
    } catch {
      // Keep graceful UI if server restarts momentarily
    }
  }, [range]);

  useEffect(() => {
    refreshWorkspace();
  }, [refreshWorkspace]);

  useEffect(() => {
    if (!firebaseUser || !cloudWorkspace) return;
    if (cloudWorkspace.name) setBusinessName(cloudWorkspace.name);
    setBusinessInfo((prev) => ({
      id: cloudWorkspace.id,
      name: cloudWorkspace.name,
      category: cloudWorkspace.category || prev?.category || 'Retail & D2C',
      city: cloudWorkspace.city || prev?.city || '',
      state: cloudWorkspace.state || prev?.state || '',
      currency: prev?.currency || 'INR',
      timezone: prev?.timezone || 'Asia/Kolkata',
      preferred_language: cloudWorkspace.preferredLanguage || prev?.preferred_language || 'en',
      store_url: cloudWorkspace.storeUrl || prev?.store_url || '',
      mode: prev?.mode || 'live',
    }));
    setAutonomyConfig((prev) => ({
      ...prev,
      emergencyPauseAll: cloudWorkspace.emergencyPauseAll ?? prev.emergencyPauseAll,
      reorderReminders: cloudWorkspace.reorderReminders || prev.reorderReminders,
      codPrepayNudges: cloudWorkspace.codPrepayNudges || prev.codPrepayNudges,
      udhaarReminders: cloudWorkspace.udhaarReminders || prev.udhaarReminders,
      winbackOffers: cloudWorkspace.winbackOffers || prev.winbackOffers,
      maxDailyMessagesPerCustomer:
        cloudWorkspace.maxDailyMessagesPerCustomer ?? prev.maxDailyMessagesPerCustomer,
      quietHoursStart: cloudWorkspace.quietHoursStart || prev.quietHoursStart,
      quietHoursEnd: cloudWorkspace.quietHoursEnd || prev.quietHoursEnd,
      minConfidenceForAutonomous:
        cloudWorkspace.minConfidenceForAutonomous ?? prev.minConfidenceForAutonomous,
      maxAutonomousDiscountPct:
        cloudWorkspace.maxAutonomousDiscountPct ?? prev.maxAutonomousDiscountPct,
      dailySpendCapInr: cloudWorkspace.dailySpendCapInr ?? prev.dailySpendCapInr,
    }));
  }, [firebaseUser, cloudWorkspace]);

  const openConsoleWithTab = (tab: ConsoleTabId = 'agents') => {
    setConsoleTab(tab);
    setIsConsoleOpen(true);
  };

  const handleResetDemo = async () => {
    try {
      await apiRequest('/api/business/reset-demo', { method: 'POST' });
      await refreshWorkspace();
      showToast(
        tr(
          language,
          'Demo sandbox reset to initial sample state.',
          'डेमो डेटा प्रारंभिक स्थिति में रीसेट हो गया।'
        )
      );
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : tr(language, 'Reset failed.', 'रीसेट विफल रहा।')
      );
    }
  };

  const handleLogout = async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    try {
      if (firebaseUser) await signOutFirebase();
    } catch {
      // ignore
    }
    setStoredToken(null);
    setModeHeader('demo');
    await refreshWorkspace();
    showToast(
      tr(language, 'Signed out. Switched back to Demo Mode.', 'लॉगआउट हो गया। डेमो मोड चालू है।')
    );
  };

  const handleActionTriggeredFromSimulator = (
    customerName: string,
    actionType: string
  ) => {
    showToast(`${actionType} simulated for ${customerName}`);
  };

  const mergedCustomers = useMemo<CustomerRecord[]>(() => {
    if (!firebaseUser || cloudCustomers.length === 0) return customers;
    const byId = new Map<string, CustomerRecord>();
    for (const c of customers) byId.set(c.id, c);
    for (const cc of cloudCustomers) {
      if (!byId.has(cc.id)) byId.set(cc.id, cc);
      else byId.set(cc.id, { ...byId.get(cc.id)!, opted_out: cc.opted_out, consent_whatsapp: cc.consent_whatsapp });
    }
    return Array.from(byId.values());
  }, [customers, cloudCustomers, firebaseUser]);

  const tourCustomers = useMemo<Customer[]>(() => {
    if (mergedCustomers.length > 0) return mergedCustomers.map(mapRecordToCustomer);
    return INITIAL_CUSTOMERS;
  }, [mergedCustomers]);

  const effectiveIsAuthenticated = isAuthenticated || Boolean(firebaseUser);
  const pendingCount = approvals.filter((a) => a.status === 'pending_approval').length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F2F8FE] via-white to-white dark:from-[#0B1320] dark:via-[#0B1320] dark:to-[#0B1320] text-[#0F172A] dark:text-[#F8FAFC] font-sans antialiased flex flex-col justify-between selection:bg-[#0066FF]/20 selection:text-[#0066FF] transition-colors duration-200">
      {/* Toast Feedback */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-60 bg-[#071A35] dark:bg-[#2563EB] text-white px-4 py-3 rounded-xl shadow-xl border border-[#22D3EE] text-xs font-semibold flex items-center gap-2 max-w-sm">
          <Check className="w-4 h-4 text-[#22D3EE] shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Compact Floating Workspace Launcher (as shown in recording) */}
      <div className="hidden sm:block fixed bottom-6 left-6 z-40">
        <button
          onClick={() => openConsoleWithTab('inbox')}
          className="h-11 px-4 rounded-xl bg-[#071A35] hover:bg-[#2563EB] text-white shadow-xl border border-[#1E3A5F] flex items-center gap-2.5 text-xs font-bold transition-colors cursor-pointer"
        >
          <span>{tr(language, 'Open Merchant Workspace', 'व्यापारी वर्कस्पेस खोलें')}</span>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 rounded-md bg-[#22D3EE] text-[#071A35] font-extrabold tabular-nums">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* Preserved Public Marketing Website with Recording Home Hero */}
      <div>
        <Navbar
          onOpenConsole={(tab) => openConsoleWithTab(tab || 'agents')}
          onOpenAuth={(mode) => setAuthModal({ open: true, mode })}
          onSelectTourTab={setTourTab}
          pendingCount={pendingCount}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-20">
          {/* 1. Home Hero from Recording + Preserved 6 Capability Cards & 4 Stats Strip */}
          <PeekHero
            language={language}
            onOpenConsole={(tab) => openConsoleWithTab(tab || 'agents')}
            onSelectTourTab={setTourTab}
            agents={agents}
            workflows={workflows}
            customers={customers}
            analytics={analytics}
            onActionQueued={(msg) => {
              showToast(msg);
              refreshWorkspace();
            }}
          />

          {/* 2. Preserved Unified Interactive Product Walkthrough */}
          <ProductTour
            activeTab={tourTab}
            onChangeTab={setTourTab}
            customers={tourCustomers}
            onOpenWorkspace={(tab) => openConsoleWithTab((tab as ConsoleTabId) || 'agents')}
            onActionTriggered={handleActionTriggeredFromSimulator}
          />

          {/* 3. Transparent Pricing & Feature Comparison (from https://github.com/sheCodesAI/sellvion) */}
          <section id="pricing" className="scroll-mt-24">
            <ComparisonMatrix
              language={language}
              onGetStarted={() => setAuthModal({ open: true, mode: 'signup' })}
            />
          </section>

          {/* 4. Preserved Integrations & Partners */}
          <PartnersSection />

          {/* 5. Preserved Straightforward Merchant FAQ */}
          <FaqSection />

          {/* 6. Preserved Final CTA Banner */}
          <section className="rounded-3xl bg-gradient-to-r from-[#002E6E] via-[#0066FF] to-[#00BAF2] p-8 sm:p-12 text-white shadow-xl">
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold text-[#BAE6FD]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Paytm for Business Integration</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-display leading-tight">
                Ready to Turn Past Orders into Repeat Sales?
              </h2>
              <p className="text-sm sm:text-base text-[#E0F2FE] leading-relaxed">
                Connect your Paytm merchant account or online store in 2 minutes. Review every message before it goes out.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => openConsoleWithTab('agents')}
                  className="px-6 py-3.5 bg-white text-[#002E6E] hover:bg-[#F0F9FF] font-extrabold text-sm rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>Explore AI Teammates</span>
                  <ArrowRight className="w-4 h-4 text-[#002E6E]" />
                </button>
              </div>
              <div className="text-xs text-[#BAE6FD] pt-1">
                No credit card required · Cancel anytime
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* Preserved Clean Footer */}
      <footer className="border-t border-[#E2E8F0] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#080E18] py-12 mt-20 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 text-xs">
            <div className="col-span-2 space-y-3">
              <div className="flex items-center gap-3">
                <img
                  src="/assets/aistudio/image_6fa37345.png"
                  alt="Paytm"
                  className="h-6 w-auto object-contain dark:brightness-110"
                />
                <span className="h-5 w-px bg-[#CBD5E1] dark:bg-[#334155]" />
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-lg bg-[#0066FF] text-white flex items-center justify-center font-bold text-xs">
                    S
                  </div>
                  <span className="font-extrabold text-sm text-[#0F1E36] dark:text-white font-display">
                    SELLVION
                  </span>
                </div>
              </div>
              <p className="text-[#64748B] dark:text-[#94A3B8] leading-relaxed max-w-sm">
                Built for Indian retail stores and D2C brands to automate repeat orders, reduce COD courier returns, and recover udhaar politely on WhatsApp.
              </p>
              <button
                onClick={handleResetDemo}
                className="text-[#0066FF] dark:text-[#38BDF8] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Demo Data</span>
              </button>
            </div>

            <div className="space-y-2">
              <div className="font-bold text-[#0F1E36] dark:text-white uppercase tracking-wider text-[11px]">
                Product
              </div>
              <ul className="space-y-1.5 text-[#64748B] dark:text-[#94A3B8]">
                <li>
                  <a href="#how-it-works" onClick={() => setTourTab('whatsapp')} className="hover:text-[#0066FF]">
                    WhatsApp Follow-ups
                  </a>
                </li>
                <li>
                  <a href="#how-it-works" onClick={() => setTourTab('cod')} className="hover:text-[#0066FF]">
                    COD Return Shield
                  </a>
                </li>
                <li>
                  <a href="#how-it-works" onClick={() => setTourTab('udhaar')} className="hover:text-[#0066FF]">
                    Udhaar & UPI Links
                  </a>
                </li>
                <li>
                  <a href="#how-it-works" onClick={() => setTourTab('calculator')} className="hover:text-[#0066FF]">
                    Savings Calculator
                  </a>
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <div className="font-bold text-[#0F1E36] dark:text-white uppercase tracking-wider text-[11px]">
                Company
              </div>
              <ul className="space-y-1.5 text-[#64748B] dark:text-[#94A3B8]">
                <li><a href="#pricing" className="hover:text-[#0066FF]">Pricing</a></li>
                <li><a href="#partners" className="hover:text-[#0066FF]">Integrations</a></li>
                <li><a href="#faq" className="hover:text-[#0066FF]">FAQ</a></li>
                <li>
                  <button onClick={() => openConsoleWithTab('agents')} className="hover:text-[#0066FF] cursor-pointer">
                    Merchant Login
                  </button>
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <div className="font-bold text-[#0F1E36] dark:text-white uppercase tracking-wider text-[11px]">
                Safeguards
              </div>
              <ul className="space-y-1.5 text-[#64748B] dark:text-[#94A3B8]">
                <li><span>Night Pause (9 PM – 9 AM IST)</span></li>
                <li><span>Instant STOP Opt-Out</span></li>
                <li><span>Owner Approval First</span></li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-[#E2E8F0] dark:border-[#1E3A5F] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#64748B] dark:text-[#94A3B8]">
            <div>© 2026 SELLVION Technologies Pvt. Ltd. All rights reserved.</div>
            <div>Built for Indian merchants 🇮🇳</div>
          </div>
        </div>
      </footer>

      {/* Workspace Overlay Popup (Matches Recording Flow on Explore AI Teammates click) */}
      <MerchantWorkspace
        isOpen={isConsoleOpen}
        activeTab={consoleTab}
        onChangeTab={setConsoleTab}
        onClose={() => setIsConsoleOpen(false)}
        appMode={appMode}
        isAuthenticated={effectiveIsAuthenticated}
        businessName={businessName}
        businessInfo={businessInfo}
        language={language}
        onChangeLanguage={setLanguage}
        customers={mergedCustomers}
        orders={orders}
        udhaarRecords={udhaarRecords}
        payments={payments}
        approvals={approvals}
        agents={agents}
        workflows={workflows}
        integrations={integrations}
        analytics={analytics}
        auditLogs={auditLogs}
        autonomyConfig={autonomyConfig}
        range={range}
        onChangeRange={setRange}
        onUpdateAutonomy={setAutonomyConfig}
        onRefreshAll={refreshWorkspace}
        onNotify={showToast}
        onResetDemo={handleResetDemo}
        onLogout={handleLogout}
        onOpenAuth={(mode) => setAuthModal({ open: true, mode })}
        onOpenCopilot={() => setCopilotOpen(true)}
      />

      {/* Auth Modal */}
      <AuthModal
        language={language}
        isOpen={authModal.open}
        initialMode={authModal.mode}
        onClose={() => setAuthModal((prev) => ({ ...prev, open: false }))}
        onAuthenticated={() => {
          refreshWorkspace();
          openConsoleWithTab('dashboard');
        }}
        onNotify={showToast}
      />

      {/* Store Assistant Modal */}
      <AiCopilotModal
        isOpen={copilotOpen}
        onClose={() => setCopilotOpen(false)}
        language={language}
      />
    </div>
  );
}
