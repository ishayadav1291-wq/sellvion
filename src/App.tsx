import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { PeekHero } from './components/PeekHero';
import { ProductTour, ProductTourTab } from './components/ProductTour';
import { ApprovalInbox } from './components/ApprovalInbox';
import { Customer360 } from './components/Customer360';
import { CodRiskScorer } from './components/CodRiskScorer';
import { UdhaarLedger } from './components/UdhaarLedger';
import { AutonomySettings } from './components/AutonomySettings';
import { MetricsAndLift } from './components/MetricsAndLift';
import { ComparisonMatrix } from './components/ComparisonMatrix';
import { PartnersSection } from './components/PartnersSection';
import { FaqSection } from './components/FaqSection';
import { AiCopilotModal } from './components/AiCopilotModal';
import { TeammatesWorkspace } from './components/TeammatesWorkspace';

import {
  INITIAL_CUSTOMERS,
  INITIAL_PENDING_ACTIONS,
  INITIAL_ORDERS,
  INITIAL_METRICS,
  INITIAL_AUTONOMY_CONFIG,
} from './data/mockData';
import { Customer, PendingAction, Order, MetricSummary, AutonomyPolicyConfig } from './types';
import {
  Sparkles,
  Check,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Inbox,
  Users,
  ShieldAlert,
  IndianRupee,
  Sliders,
  TrendingUp,
  Sun,
  Moon,
  MessageSquare,
  Bot,
} from 'lucide-react';

interface UndoState {
  id: string;
  previousAction: PendingAction;
  previousMetrics: MetricSummary;
  message: string;
  secondsRemaining: number;
}

export default function App() {
  // Theme state with localStorage
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sellvion-theme') as 'light' | 'dark' | null;
      if (saved) return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('sellvion-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Clear 2-mode navigation: Front Marketing Website OR Merchant Workspace
  const [viewMode, setViewMode] = useState<'website' | 'workspace'>('website');
  const [workspaceTab, setWorkspaceTab] = useState<string>('inbox');
  const [tourTab, setTourTab] = useState<ProductTourTab>('whatsapp');

  const openWorkspace = (tab?: string) => {
    if (tab) setWorkspaceTab(tab);
    setViewMode('workspace');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const backToWebsite = () => {
    setViewMode('website');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Persistent Store Data
  const [customers, setCustomers] = useState<Customer[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sellvion-customers');
      if (saved) {
        try { return JSON.parse(saved); } catch { /* ignore */ }
      }
    }
    return INITIAL_CUSTOMERS;
  });

  const [actions, setActions] = useState<PendingAction[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sellvion-actions');
      if (saved) {
        try { return JSON.parse(saved); } catch { /* ignore */ }
      }
    }
    return INITIAL_PENDING_ACTIONS;
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sellvion-orders');
      if (saved) {
        try { return JSON.parse(saved); } catch { /* ignore */ }
      }
    }
    return INITIAL_ORDERS;
  });

  const [metrics, setMetrics] = useState<MetricSummary>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sellvion-metrics');
      if (saved) {
        try { return JSON.parse(saved); } catch { /* ignore */ }
      }
    }
    return INITIAL_METRICS;
  });

  const [autonomyConfig, setAutonomyConfig] = useState<AutonomyPolicyConfig>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sellvion-autonomy');
      if (saved) {
        try { return JSON.parse(saved); } catch { /* ignore */ }
      }
    }
    return INITIAL_AUTONOMY_CONFIG;
  });

  useEffect(() => {
    localStorage.setItem('sellvion-customers', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem('sellvion-actions', JSON.stringify(actions));
  }, [actions]);

  useEffect(() => {
    localStorage.setItem('sellvion-orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('sellvion-metrics', JSON.stringify(metrics));
  }, [metrics]);

  useEffect(() => {
    localStorage.setItem('sellvion-autonomy', JSON.stringify(autonomyConfig));
  }, [autonomyConfig]);

  // Copilot and Toast states
  const [copilotOpen, setCopilotOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Undo Buffer State
  const [undoState, setUndoState] = useState<UndoState | null>(null);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const handleResetData = () => {
    setCustomers(INITIAL_CUSTOMERS);
    setActions(INITIAL_PENDING_ACTIONS);
    setOrders(INITIAL_ORDERS);
    setMetrics(INITIAL_METRICS);
    setAutonomyConfig(INITIAL_AUTONOMY_CONFIG);
    localStorage.removeItem('sellvion-customers');
    localStorage.removeItem('sellvion-actions');
    localStorage.removeItem('sellvion-orders');
    localStorage.removeItem('sellvion-metrics');
    localStorage.removeItem('sellvion-autonomy');
    setUndoState(null);
    showToast('Demo data reset to initial state.');
  };

  const handleApproveAction = (id: string) => {
    const act = actions.find((a) => a.id === id);
    if (!act) return;

    const prevAction = { ...act };
    const prevMetrics = { ...metrics };

    setActions((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'approved' } : a))
    );

    const orderAmount = act.metadata?.orderAmount || 1450;
    setMetrics((prev) => ({
      ...prev,
      incrementalAiRevenue: prev.incrementalAiRevenue + orderAmount,
      totalRevenue: prev.totalRevenue + orderAmount,
      reactivatedThisMonth:
        act.type === 'winback_offer' ? prev.reactivatedThisMonth + 1 : prev.reactivatedThisMonth,
    }));

    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    setUndoState({
      id,
      previousAction: prevAction,
      previousMetrics: prevMetrics,
      message: `Sent WhatsApp message to ${act.customerName}`,
      secondsRemaining: 5,
    });

    countdownIntervalRef.current = setInterval(() => {
      setUndoState((curr) => {
        if (!curr || curr.secondsRemaining <= 1) {
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
          return null;
        }
        return { ...curr, secondsRemaining: curr.secondsRemaining - 1 };
      });
    }, 1000);

    undoTimerRef.current = setTimeout(() => {
      setUndoState(null);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    }, 5000);
  };

  const handleUndo = () => {
    if (!undoState) return;
    setActions((prev) =>
      prev.map((a) => (a.id === undoState.id ? undoState.previousAction : a))
    );
    setMetrics(undoState.previousMetrics);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setUndoState(null);
    showToast('Action undone and returned to queue.');
  };

  const handleRejectAction = (id: string) => {
    const act = actions.find((a) => a.id === id);
    if (!act) return;

    const prevAction = { ...act };
    const prevMetrics = { ...metrics };

    setActions((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'rejected' } : a))
    );

    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    setUndoState({
      id,
      previousAction: prevAction,
      previousMetrics: prevMetrics,
      message: `Dismissed draft for ${act.customerName}`,
      secondsRemaining: 5,
    });

    countdownIntervalRef.current = setInterval(() => {
      setUndoState((curr) => {
        if (!curr || curr.secondsRemaining <= 1) {
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
          return null;
        }
        return { ...curr, secondsRemaining: curr.secondsRemaining - 1 };
      });
    }, 1000);

    undoTimerRef.current = setTimeout(() => {
      setUndoState(null);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    }, 5000);
  };

  const handleSnoozeAction = (id: string) => {
    setActions((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'snoozed' } : a))
    );
    showToast('Snoozed for 24 hours.');
  };

  const handleUpdateDraft = (id: string, newText: string) => {
    setActions((prev) =>
      prev.map((a) => (a.id === id ? { ...a, suggestedMessage: newText } : a))
    );
    showToast('Draft updated.');
  };

  const handleRecordPayment = (customerId: string, amount: number) => {
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === customerId
          ? { ...c, outstandingUdhaar: Math.max(0, c.outstandingUdhaar - amount) }
          : c
      )
    );
    setMetrics((prev) => ({
      ...prev,
      collectedThisMonth: prev.collectedThisMonth + amount,
      totalUdhaarTracked: Math.max(0, prev.totalUdhaarTracked - amount),
    }));
    showToast(`Recorded ₹${amount.toLocaleString('en-IN')} payment.`);
  };

  const handleSendUdhaarReminder = (customerName: string, amount: number) => {
    showToast(`WhatsApp reminder sent to ${customerName} for ₹${amount.toLocaleString('en-IN')}`);
  };

  const handleMitigateOrder = (orderId: string, actionType: 'prepay' | 'verify') => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              paymentMode: actionType === 'prepay' ? 'Prepaid_UPI' : o.paymentMode,
              status: actionType === 'prepay' ? 'In_Transit' : 'Delivered',
              codRiskScore: actionType === 'prepay' ? 12 : 25,
            }
          : o
      )
    );
    setMetrics((prev) => ({
      ...prev,
      rtoSavedAmount: prev.rtoSavedAmount + 280,
      codRtoCurrentPct: Math.max(8, Number((prev.codRtoCurrentPct - 0.4).toFixed(1))),
    }));
    showToast(
      actionType === 'prepay'
        ? `Sent UPI link for #${orderId} (₹280 return shipping saved)`
        : `Address verified for #${orderId}`
    );
  };

  const handleActionTriggeredFromSimulator = (
    customerName: string,
    actionType: string,
    amount: number
  ) => {
    setMetrics((prev) => ({
      ...prev,
      incrementalAiRevenue: prev.incrementalAiRevenue + amount,
    }));
    showToast(`${actionType} simulated for ${customerName}`);
  };

  const handleAddCustomer = (newCustomer: Customer) => {
    setCustomers((prev) => [newCustomer, ...prev]);
    showToast(`${newCustomer.name} added to Customers.`);
  };

  const pendingCount = actions.filter((a) => a.status === 'pending_approval').length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F2F8FE] via-white to-white dark:from-[#0B1320] dark:via-[#0B1320] dark:to-[#0B1320] text-[#0F172A] dark:text-[#F8FAFC] font-sans antialiased flex flex-col justify-between selection:bg-[#0066FF]/20 selection:text-[#0066FF] transition-colors duration-200">
      {/* 5-Second Undo Toast */}
      {undoState && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0F172A] dark:bg-[#132238] text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-[#38BDF8] text-xs font-medium flex items-center gap-4">
          <span>{undoState.message}</span>
          <button
            onClick={handleUndo}
            className="px-3 py-1.5 bg-[#0066FF] hover:bg-[#0052CC] text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer transition-transform active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Undo ({undoState.secondsRemaining}s)</span>
          </button>
        </div>
      )}

      {/* Standard Toast */}
      {toastMessage && !undoState && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0066FF] text-white px-4 py-3 rounded-xl shadow-lg border border-[#38BDF8] text-xs font-medium flex items-center gap-2">
          <Check className="w-4 h-4 text-[#E0F2FE]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {viewMode === 'website' ? (
        <>
          {/* Public Marketing Website */}
          <div>
            <Navbar
              onOpenConsole={openWorkspace}
              onSelectTourTab={setTourTab}
              pendingCount={pendingCount}
              theme={theme}
              onToggleTheme={toggleTheme}
            />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-20">
              {/* 1. Hero + 6 Capability Cards + 4 Key Stats */}
              <PeekHero
                onOpenConsole={openWorkspace}
                onSelectTourTab={setTourTab}
              />

              {/* 2. Single Unified Interactive Product Walkthrough */}
              <ProductTour
                activeTab={tourTab}
                onChangeTab={setTourTab}
                customers={customers}
                onOpenWorkspace={openWorkspace}
                onActionTriggered={handleActionTriggeredFromSimulator}
              />

              {/* 3. Transparent Pricing & Feature Comparison */}
              <section id="pricing" className="scroll-mt-24">
                <ComparisonMatrix />
              </section>

              {/* 4. Integrations & Partners */}
              <PartnersSection />

              {/* 5. Straightforward Merchant FAQ */}
              <FaqSection />

              {/* 6. Simple Final CTA Banner */}
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
                      onClick={() => openWorkspace('agents')}
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

          {/* Clean Footer */}
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
                    onClick={handleResetData}
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
                      <button onClick={() => openWorkspace('inbox')} className="hover:text-[#0066FF] cursor-pointer">
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
        </>
      ) : (
        /* Dedicated Merchant Workspace (Clean, Zero Nested Modals) */
        <div className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-[#0B1320]">
          {/* Workspace Header */}
          <header className="sticky top-0 z-40 bg-white dark:bg-[#132238] border-b border-[#E2E8F0] dark:border-[#1E3A5F]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={backToWebsite}
                  className="p-2 rounded-xl border border-[#E2E8F0] dark:border-[#1E3A5F] text-[#475569] dark:text-[#CBD5E1] hover:text-[#0066FF] hover:border-[#0066FF] transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Website</span>
                </button>

                <span className="h-5 w-px bg-[#CBD5E1] dark:bg-[#334155]" />

                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#0066FF] text-white flex items-center justify-center font-bold text-xs">
                    S
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#0F1E36] dark:text-white leading-tight">
                      Mystic Spices & Naturals
                    </div>
                    <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                      Ludhiana · Paytm Sync Active
                    </div>
                  </div>
                </div>
              </div>

              {/* Workspace Navigation Tabs */}
              <nav className="hidden lg:flex items-center gap-1 bg-[#F1F5F9] dark:bg-[#0B1320] p-1 rounded-xl text-xs">
                {[
                  { id: 'inbox', label: 'Approvals', icon: Inbox, badge: pendingCount },
                  { id: 'agents', label: 'AI Teammates', icon: Bot },
                  { id: 'customers', label: 'Customers', icon: Users },
                  { id: 'cod-risk', label: 'COD Orders', icon: ShieldAlert },
                  { id: 'udhaar', label: 'Udhaar', icon: IndianRupee },
                  { id: 'metrics', label: 'Impact', icon: TrendingUp },
                  { id: 'autonomy', label: 'Rules', icon: Sliders },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const active = workspaceTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setWorkspaceTab(tab.id)}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                        active
                          ? 'bg-white dark:bg-[#0066FF] text-[#0066FF] dark:text-white shadow-xs'
                          : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F1E36] dark:hover:text-white'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                      {typeof tab.badge === 'number' && tab.badge > 0 && (
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                            active ? 'bg-[#0066FF] text-white dark:bg-white dark:text-[#0066FF]' : 'bg-[#0066FF] text-white'
                          }`}
                        >
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              {/* Right Workspace Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCopilotOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-[#EAF2FF] dark:bg-[#0C243B] text-[#0066FF] dark:text-[#38BDF8] text-xs font-bold flex items-center gap-1.5 hover:bg-[#DBEAFE] transition-colors cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Ask Assistant</span>
                </button>

                <button
                  onClick={toggleTheme}
                  aria-label="Toggle theme"
                  className="p-2 text-[#64748B] dark:text-[#94A3B8] bg-[#F8FAFC] dark:bg-[#0F1A2C] border border-[#E2E8F0] dark:border-[#1E3A5F] rounded-xl cursor-pointer"
                >
                  {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-[#38BDF8]" />}
                </button>
              </div>
            </div>

            {/* Mobile Workspace Tabs */}
            <div className="lg:hidden flex items-center gap-1.5 px-4 py-2 border-t border-[#E2E8F0] dark:border-[#1E3A5F] overflow-x-auto text-xs">
              {[
                { id: 'inbox', label: `Approvals (${pendingCount})` },
                { id: 'agents', label: 'AI Teammates' },
                { id: 'customers', label: 'Customers' },
                { id: 'cod-risk', label: 'COD Orders' },
                { id: 'udhaar', label: 'Udhaar' },
                { id: 'metrics', label: 'Impact' },
                { id: 'autonomy', label: 'Rules' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setWorkspaceTab(tab.id)}
                  className={`px-3 py-1 rounded-full shrink-0 font-semibold ${
                    workspaceTab === tab.id ? 'bg-[#0066FF] text-white' : 'text-[#64748B]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </header>

          {/* Workspace Main Content */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {workspaceTab === 'inbox' && (
              <ApprovalInbox
                actions={actions}
                onApprove={handleApproveAction}
                onReject={handleRejectAction}
                onSnooze={handleSnoozeAction}
                onUpdateDraft={handleUpdateDraft}
              />
            )}

            {workspaceTab === 'customers' && (
              <Customer360
                customers={customers}
                onOpenDraftModal={() => setWorkspaceTab('inbox')}
                onAddCustomer={handleAddCustomer}
              />
            )}

            {workspaceTab === 'cod-risk' && (
              <CodRiskScorer
                orders={orders}
                onMitigateOrder={handleMitigateOrder}
              />
            )}

            {workspaceTab === 'udhaar' && (
              <UdhaarLedger
                customers={customers}
                onRecordPayment={handleRecordPayment}
                onSendReminder={handleSendUdhaarReminder}
              />
            )}

            {workspaceTab === 'metrics' && (
              <MetricsAndLift metrics={metrics} />
            )}

            {workspaceTab === 'agents' && (
              <TeammatesWorkspace
                customers={customers}
                orders={orders}
                actions={actions}
                onNavigateTab={setWorkspaceTab}
                onNotify={showToast}
              />
            )}

            {workspaceTab === 'autonomy' && (
              <AutonomySettings
                config={autonomyConfig}
                onUpdateConfig={(cfg) => {
                  setAutonomyConfig(cfg);
                  showToast('Store safety rules saved.');
                }}
              />
            )}
          </main>
        </div>
      )}

      {/* Assistant Modal */}
      <AiCopilotModal
        isOpen={copilotOpen}
        onClose={() => setCopilotOpen(false)}
        customers={customers}
        metrics={metrics}
      />
    </div>
  );
}
