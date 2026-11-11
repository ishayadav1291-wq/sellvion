import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { PeekHero } from './components/PeekHero';
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

import {
  INITIAL_CUSTOMERS,
  INITIAL_PENDING_ACTIONS,
  INITIAL_ORDERS,
  INITIAL_METRICS,
  INITIAL_AUTONOMY_CONFIG,
} from './data/mockData';
import { Customer, PendingAction, Order, MetricSummary, AutonomyPolicyConfig } from './types';
import {
  ShieldCheck,
  Sparkles,
  Check,
  ArrowRight,
  RotateCcw,
  X,
  Layers,
  Inbox,
  Users,
  ShieldAlert,
  IndianRupee,
  Sliders,
  TrendingUp,
  LayoutDashboard,
  ExternalLink,
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

  // Inside Merchant Console state (Modal / Workspace overlay)
  const [isConsoleOpen, setIsConsoleOpen] = useState<boolean>(false);
  const [consoleTab, setConsoleTab] = useState<string>('inbox');

  const openConsoleWithTab = (tab?: string) => {
    if (tab) setConsoleTab(tab);
    setIsConsoleOpen(true);
  };

  // Persistent Customers
  const [customers, setCustomers] = useState<Customer[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sellvion-customers');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) { /* ignore */ }
      }
    }
    return INITIAL_CUSTOMERS;
  });

  // Persistent Actions
  const [actions, setActions] = useState<PendingAction[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sellvion-actions');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) { /* ignore */ }
      }
    }
    return INITIAL_PENDING_ACTIONS;
  });

  // Persistent Orders
  const [orders, setOrders] = useState<Order[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sellvion-orders');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) { /* ignore */ }
      }
    }
    return INITIAL_ORDERS;
  });

  // Persistent Metrics
  const [metrics, setMetrics] = useState<MetricSummary>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sellvion-metrics');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) { /* ignore */ }
      }
    }
    return INITIAL_METRICS;
  });

  // Persistent Autonomy Config
  const [autonomyConfig, setAutonomyConfig] = useState<AutonomyPolicyConfig>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sellvion-autonomy');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) { /* ignore */ }
      }
    }
    return INITIAL_AUTONOMY_CONFIG;
  });

  // Save to localStorage on changes
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

  // Reset Demo Data
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
    showToast('✓ Demo data reset to initial clean state.');
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
      message: `Approved: WhatsApp sent to ${act.customerName}`,
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
    showToast('↩ Action reverted successfully. Returned to queue.');
  };

  const handleRejectAction = (id: string, reason?: string) => {
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
      message: `Action dismissed. Policy model updated.`,
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
    showToast(`Action snoozed for 24 hours.`);
  };

  const handleUpdateDraft = (id: string, newText: string) => {
    setActions((prev) =>
      prev.map((a) => (a.id === id ? { ...a, suggestedMessage: newText } : a))
    );
    showToast(`Message draft updated.`);
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
    showToast(`✓ Recorded ₹${amount.toLocaleString('en-IN')} payment received!`);
  };

  const handleSendUdhaarReminder = (customerName: string, amount: number) => {
    showToast(`✓ WhatsApp reminder sent to ${customerName} for ₹${amount.toLocaleString('en-IN')}`);
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
        ? `✓ Converted order #${orderId} to Prepaid UPI (Saved ₹280 courier return cost)`
        : `✓ Address verified for order #${orderId}. Approved for dispatch.`
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
    showToast(`✓ Simulation Success: ${actionType} triggered for ${customerName}`);
  };

  const handleAddCustomer = (newCustomer: Customer) => {
    setCustomers((prev) => [newCustomer, ...prev]);
    showToast(`✓ Customer ${newCustomer.name} added to Customer 360.`);
  };

  const pendingCount = actions.filter((a) => a.status === 'pending_approval').length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F2F8FE] via-white to-white dark:from-[#0B1320] dark:via-[#0B1320] dark:to-[#0B1320] text-[#0F172A] dark:text-[#F8FAFC] font-sans antialiased flex flex-col justify-between selection:bg-[#0066FF]/20 selection:text-[#0066FF] transition-colors duration-200">
      {/* 5-Second Interactive Undo Floating Toast */}
      {undoState && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0F172A] dark:bg-[#132238] text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-[#38BDF8] text-xs font-medium flex items-center gap-4 animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#38BDF8] animate-ping" />
            <span>{undoState.message}</span>
          </div>
          <button
            onClick={handleUndo}
            className="px-3 py-1.5 bg-[#0066FF] hover:bg-[#0052CC] text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer shadow-sm shadow-[#0066FF]/25 transition-transform active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Undo ({undoState.secondsRemaining}s)</span>
          </button>
        </div>
      )}

      {/* Standard Toast Notification */}
      {toastMessage && !undoState && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0066FF] text-white px-4 py-3 rounded-xl shadow-lg border border-[#38BDF8] text-xs font-medium flex items-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4 text-[#E0F2FE]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Floating Launcher for Inside Merchant Workspace */}
      <div className="fixed bottom-6 left-6 z-40">
        <button
          onClick={() => openConsoleWithTab('inbox')}
          className="group px-4 py-2.5 bg-[#0F1E36] dark:bg-[#132238] hover:bg-[#0066FF] text-white rounded-full shadow-2xl border border-[#1E3A5F] hover:border-[#38BDF8] flex items-center gap-2.5 text-xs font-bold transition-all transform hover:scale-105 cursor-pointer"
        >
          <div className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse" />
          <span>Launch Merchant Console</span>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-[#0066FF] group-hover:bg-white group-hover:text-[#0066FF] text-white text-[10px] font-mono font-bold">
              {pendingCount} Pending
            </span>
          )}
        </button>
      </div>

      {/* Global Navbar */}
      <Navbar
        onOpenConsole={openConsoleWithTab}
        pendingCount={pendingCount}
        theme={theme}
        onToggleTheme={toggleTheme}
        onResetData={handleResetData}
      />

      {/* Continuous Front Marketing Website Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-24">
        {/* 1. Hero, 6 Capability Cards, 4 Stats & Simulator */}
        <PeekHero
          customers={customers}
          metrics={metrics}
          onNavigateTab={openConsoleWithTab}
          onActionTriggered={handleActionTriggeredFromSimulator}
          onOpenConsole={openConsoleWithTab}
        />

        {/* 2. Feature Deep Dive: COD Risk Protection & Anti-RTO Engine */}
        <section id="features-cod" className="space-y-6 scroll-mt-24">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-[#E2E8F0] dark:border-[#1E3A5F]">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FEE2E2] dark:bg-[#450A0A] text-xs font-semibold text-[#DC2626] dark:text-[#F87171] mb-2">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Feature 01 · COD Return (RTO) Defense</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0F1E36] dark:text-white font-display">
                Stop Losing ₹280 on Courier Returns
              </h2>
              <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] mt-1 max-w-2xl">
                Real-time risk telemetry analyzes incomplete addresses, pincode carrier failure rates, and order amounts. Automatically converts high-risk cash orders to 1-tap UPI prepayment before courier dispatch.
              </p>
            </div>
            <button
              onClick={() => openConsoleWithTab('cod-risk')}
              className="px-4 py-2 rounded-xl bg-white dark:bg-[#132238] border border-[#CBD5E1] dark:border-[#1E3A5F] text-xs font-bold text-[#0066FF] dark:text-[#38BDF8] hover:bg-[#F0F9FF] dark:hover:bg-[#1A2E4C] transition-all flex items-center gap-1.5 self-start md:self-auto cursor-pointer"
            >
              <span>Manage Store Orders in Console</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          <CodRiskScorer
            orders={orders}
            onMitigateOrder={handleMitigateOrder}
          />
        </section>

        {/* 3. Feature Deep Dive: Customer Intelligence & Reorder Cadence */}
        <section id="features-reorder" className="space-y-6 scroll-mt-24">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-[#E2E8F0] dark:border-[#1E3A5F]">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E0F2FE] dark:bg-[#0C243B] text-xs font-semibold text-[#0066FF] dark:text-[#38BDF8] mb-2">
                <Users className="w-3.5 h-3.5" />
                <span>Feature 02 · Customer Intelligence & Rhythms</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0F1E36] dark:text-white font-display">
                Every Customer Has a Rhythm. SELLVION Predicts It.
              </h2>
              <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] mt-1 max-w-2xl">
                SELLVION builds an automated customer memory graph from order history and category preferences. It prompts repeat orders at the exact moment their supply runs low.
              </p>
            </div>
            <button
              onClick={() => openConsoleWithTab('customers')}
              className="px-4 py-2 rounded-xl bg-white dark:bg-[#132238] border border-[#CBD5E1] dark:border-[#1E3A5F] text-xs font-bold text-[#0066FF] dark:text-[#38BDF8] hover:bg-[#F0F9FF] dark:hover:bg-[#1A2E4C] transition-all flex items-center gap-1.5 self-start md:self-auto cursor-pointer"
            >
              <span>Open Customer 360 in Console</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          <Customer360
            customers={customers}
            onOpenDraftModal={() => openConsoleWithTab('inbox')}
            onAddCustomer={handleAddCustomer}
          />
        </section>

        {/* 4. Feature Deep Dive: Udhaar & Digital Bahi-Khata Recovery */}
        <section id="features-udhaar" className="space-y-6 scroll-mt-24">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-[#E2E8F0] dark:border-[#1E3A5F]">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#DCFCE7] dark:bg-[#0F3823] text-xs font-semibold text-[#16A34A] dark:text-[#4ADE80] mb-2">
                <IndianRupee className="w-3.5 h-3.5" />
                <span>Feature 03 · Respectful Digital Udhaar Recovery</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0F1E36] dark:text-white font-display">
                Recover Outstanding Udhaar Without Straining Relationships
              </h2>
              <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] mt-1 max-w-2xl">
                Automated, respectful Hinglish reminders with 1-tap UPI QR codes. Instant reconciliation through Paytm Soundbox and payment webhooks.
              </p>
            </div>
            <button
              onClick={() => openConsoleWithTab('udhaar')}
              className="px-4 py-2 rounded-xl bg-white dark:bg-[#132238] border border-[#CBD5E1] dark:border-[#1E3A5F] text-xs font-bold text-[#0066FF] dark:text-[#38BDF8] hover:bg-[#F0F9FF] dark:hover:bg-[#1A2E4C] transition-all flex items-center gap-1.5 self-start md:self-auto cursor-pointer"
            >
              <span>View Udhaar Ledger in Console</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          <UdhaarLedger
            customers={customers}
            onRecordPayment={handleRecordPayment}
            onSendReminder={handleSendUdhaarReminder}
          />
        </section>

        {/* 5. Feature Deep Dive: Earned Autonomy & Safety Policy */}
        <section id="features-autonomy" className="space-y-6 scroll-mt-24">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-[#E2E8F0] dark:border-[#1E3A5F]">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E0F2FE] dark:bg-[#0C243B] text-xs font-semibold text-[#0066FF] dark:text-[#38BDF8] mb-2">
                <Sliders className="w-3.5 h-3.5" />
                <span>Feature 04 · Human-in-the-Loop Governance</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0F1E36] dark:text-white font-display">
                Autonomy That You Earn and Control
              </h2>
              <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] mt-1 max-w-2xl">
                SELLVION starts in supervised mode. You review every message until you trust the AI. Enforces strict Indian Quiet Hours (9PM - 9AM IST) and automated frequency limits.
              </p>
            </div>
            <button
              onClick={() => openConsoleWithTab('autonomy')}
              className="px-4 py-2 rounded-xl bg-white dark:bg-[#132238] border border-[#CBD5E1] dark:border-[#1E3A5F] text-xs font-bold text-[#0066FF] dark:text-[#38BDF8] hover:bg-[#F0F9FF] dark:hover:bg-[#1A2E4C] transition-all flex items-center gap-1.5 self-start md:self-auto cursor-pointer"
            >
              <span>Configure Policy in Console</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          <AutonomySettings
            config={autonomyConfig}
            onUpdateConfig={(cfg) => {
              setAutonomyConfig(cfg);
              showToast('Earned autonomy policy saved and synced.');
            }}
          />
        </section>

        {/* 6. Science of Lift & 10% Uncontacted Holdout Cohort */}
        <section id="roi" className="space-y-6 scroll-mt-24">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-[#E2E8F0] dark:border-[#1E3A5F]">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E0F2FE] dark:bg-[#0C243B] text-xs font-semibold text-[#0066FF] dark:text-[#38BDF8] mb-2">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Mathematical Rigor · BRULE-06 Holdout Cohorts</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0F1E36] dark:text-white font-display">
                Measure True Incremental Revenue, Not Fake Vanity Claims
              </h2>
              <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] mt-1 max-w-2xl">
                By comparing contacted customers against an isolated 10% uncontacted holdout cohort, SELLVION proves true incremental sales lift with scientific transparency.
              </p>
            </div>
            <button
              onClick={() => openConsoleWithTab('metrics')}
              className="px-4 py-2 rounded-xl bg-white dark:bg-[#132238] border border-[#CBD5E1] dark:border-[#1E3A5F] text-xs font-bold text-[#0066FF] dark:text-[#38BDF8] hover:bg-[#F0F9FF] dark:hover:bg-[#1A2E4C] transition-all flex items-center gap-1.5 self-start md:self-auto cursor-pointer"
            >
              <span>View Store Analytics in Console</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          <MetricsAndLift metrics={metrics} />
        </section>

        {/* 7. Pricing & Competitive Comparison */}
        <section id="pricing" className="scroll-mt-24">
          <ComparisonMatrix />
        </section>

        {/* 8. Ecosystem Partners */}
        <PartnersSection />

        {/* 9. Frequently Asked Questions */}
        <FaqSection />

        {/* 10. High-Converting Bottom CTA Banner */}
        <section className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#002E6E] via-[#0066FF] to-[#00BAF2] p-8 sm:p-12 text-white shadow-2xl">
          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold text-[#BAE6FD] backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Available on Paytm for Business</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-display leading-tight">
              Ready to Turn Scattered Data into Predictable Sales?
            </h2>
            <p className="text-sm sm:text-base text-[#E0F2FE] leading-relaxed">
              Join over 10,000 Indian retailers and D2C brands automating repeat purchases and eliminating courier returns. Onboard in 2 minutes with your Paytm merchant ID.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => openConsoleWithTab('inbox')}
                className="px-6 py-3.5 bg-white text-[#002E6E] hover:bg-[#F0F9FF] font-extrabold text-sm rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Start Free on Paytm</span>
                <ArrowRight className="w-4 h-4 text-[#002E6E]" />
              </button>
              <button
                onClick={() => openConsoleWithTab('inbox')}
                className="px-5 py-3.5 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-semibold text-sm rounded-xl transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Explore Interactive Demo Console</span>
              </button>
            </div>
            <div className="text-xs text-[#BAE6FD] pt-2">
              ✓ No credit card required · Free 30-day trial · Cancel anytime with 1 tap
            </div>
          </div>
        </section>
      </main>

      {/* Inside Merchant Console Overlay / Modal (Full Operational Back-Office) */}
      {isConsoleOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 lg:p-6 animate-fadeIn">
          <div className="bg-white dark:bg-[#0B1320] w-full max-w-6xl h-[92vh] rounded-3xl shadow-2xl border border-[#BAE6FD] dark:border-[#1E3A5F] flex flex-col overflow-hidden">
            {/* Console Modal Header */}
            <div className="px-6 py-4 border-b border-[#E2E8F0] dark:border-[#1E3A5F] flex items-center justify-between bg-[#F8FAFC] dark:bg-[#132238] shrink-0">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#0066FF] text-white flex items-center justify-center font-bold text-xs">
                    S
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-[#0F1E36] dark:text-white font-display">
                        SELLVION Merchant Console
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-[#10B981]/15 text-[#10B981] text-[10px] font-bold">
                        Online · Paytm Soundbox Sync
                      </span>
                    </div>
                    <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                      Store: <strong>Mystic Spices & Naturals (Ludhiana)</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Console Tabs Switcher */}
              <div className="hidden md:flex items-center gap-1 bg-white dark:bg-[#0F1A2C] p-1 rounded-xl border border-[#E2E8F0] dark:border-[#1E3A5F] text-xs">
                <button
                  onClick={() => setConsoleTab('inbox')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    consoleTab === 'inbox'
                      ? 'bg-[#0066FF] text-white shadow-xs'
                      : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F1E36] dark:hover:text-white'
                  }`}
                >
                  <Inbox className="w-3.5 h-3.5" />
                  <span>Approvals</span>
                  {pendingCount > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      consoleTab === 'inbox' ? 'bg-white text-[#0066FF]' : 'bg-[#0066FF] text-white'
                    }`}>
                      {pendingCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setConsoleTab('customers')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    consoleTab === 'customers'
                      ? 'bg-[#0066FF] text-white shadow-xs'
                      : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F1E36] dark:hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Customers</span>
                </button>

                <button
                  onClick={() => setConsoleTab('cod-risk')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    consoleTab === 'cod-risk'
                      ? 'bg-[#0066FF] text-white shadow-xs'
                      : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F1E36] dark:hover:text-white'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>COD Shield</span>
                </button>

                <button
                  onClick={() => setConsoleTab('udhaar')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    consoleTab === 'udhaar'
                      ? 'bg-[#0066FF] text-white shadow-xs'
                      : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F1E36] dark:hover:text-white'
                  }`}
                >
                  <IndianRupee className="w-3.5 h-3.5" />
                  <span>Udhaar</span>
                </button>

                <button
                  onClick={() => setConsoleTab('autonomy')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    consoleTab === 'autonomy'
                      ? 'bg-[#0066FF] text-white shadow-xs'
                      : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F1E36] dark:hover:text-white'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Autonomy</span>
                </button>
              </div>

              {/* Close Console Button */}
              <button
                onClick={() => setIsConsoleOpen(false)}
                className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#0F1A2C] border border-[#CBD5E1] dark:border-[#1E3A5F] text-xs font-bold text-[#64748B] dark:text-[#CBD5E1] hover:text-[#0F1E36] dark:hover:text-white hover:border-[#0066FF] transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <X className="w-4 h-4" />
                <span>Back to Front Website</span>
              </button>
            </div>

            {/* Mobile Tab Pills */}
            <div className="md:hidden flex items-center gap-1 px-4 py-2 border-b border-[#E2E8F0] dark:border-[#1E3A5F] overflow-x-auto bg-[#F8FAFC] dark:bg-[#132238] text-xs shrink-0">
              <button
                onClick={() => setConsoleTab('inbox')}
                className={`px-3 py-1 rounded-full shrink-0 ${
                  consoleTab === 'inbox' ? 'bg-[#0066FF] text-white' : 'text-[#64748B]'
                }`}
              >
                Approvals ({pendingCount})
              </button>
              <button
                onClick={() => setConsoleTab('customers')}
                className={`px-3 py-1 rounded-full shrink-0 ${
                  consoleTab === 'customers' ? 'bg-[#0066FF] text-white' : 'text-[#64748B]'
                }`}
              >
                Customers
              </button>
              <button
                onClick={() => setConsoleTab('cod-risk')}
                className={`px-3 py-1 rounded-full shrink-0 ${
                  consoleTab === 'cod-risk' ? 'bg-[#0066FF] text-white' : 'text-[#64748B]'
                }`}
              >
                COD Risk
              </button>
              <button
                onClick={() => setConsoleTab('udhaar')}
                className={`px-3 py-1 rounded-full shrink-0 ${
                  consoleTab === 'udhaar' ? 'bg-[#0066FF] text-white' : 'text-[#64748B]'
                }`}
              >
                Udhaar
              </button>
              <button
                onClick={() => setConsoleTab('autonomy')}
                className={`px-3 py-1 rounded-full shrink-0 ${
                  consoleTab === 'autonomy' ? 'bg-[#0066FF] text-white' : 'text-[#64748B]'
                }`}
              >
                Autonomy
              </button>
            </div>

            {/* Console Content Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
              {consoleTab === 'inbox' && (
                <ApprovalInbox
                  actions={actions}
                  onApprove={handleApproveAction}
                  onReject={handleRejectAction}
                  onSnooze={handleSnoozeAction}
                  onUpdateDraft={handleUpdateDraft}
                />
              )}

              {consoleTab === 'customers' && (
                <Customer360
                  customers={customers}
                  onOpenDraftModal={() => setConsoleTab('inbox')}
                  onAddCustomer={handleAddCustomer}
                />
              )}

              {consoleTab === 'cod-risk' && (
                <CodRiskScorer
                  orders={orders}
                  onMitigateOrder={handleMitigateOrder}
                />
              )}

              {consoleTab === 'udhaar' && (
                <UdhaarLedger
                  customers={customers}
                  onRecordPayment={handleRecordPayment}
                  onSendReminder={handleSendUdhaarReminder}
                />
              )}

              {consoleTab === 'autonomy' && (
                <AutonomySettings
                  config={autonomyConfig}
                  onUpdateConfig={(cfg) => {
                    setAutonomyConfig(cfg);
                    showToast('Earned autonomy policy saved and synced.');
                  }}
                />
              )}

              {consoleTab === 'metrics' && (
                <MetricsAndLift metrics={metrics} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Copilot Dialog */}
      <AiCopilotModal
        isOpen={copilotOpen}
        onClose={() => setCopilotOpen(false)}
        customers={customers}
        metrics={metrics}
      />

      {/* Marketing Front Website Footer */}
      <footer className="border-t border-[#E2E8F0] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#080E18] py-12 mt-20 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 text-xs">
            {/* Brand Col */}
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
                The autonomous AI merchant teammate for Indian retail stores and D2C brands. Predict repeat orders, eliminate COD return risk, and automate digital bahi-khata collections on WhatsApp.
              </p>
              <div className="flex items-center gap-3 text-[#0066FF] dark:text-[#38BDF8] font-semibold pt-1">
                <button
                  onClick={handleResetData}
                  className="hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Demo State</span>
                </button>
              </div>
            </div>

            {/* Product Col */}
            <div className="space-y-2">
              <div className="font-bold text-[#0F1E36] dark:text-white uppercase tracking-wider text-[11px]">
                Product
              </div>
              <ul className="space-y-1.5 text-[#64748B] dark:text-[#94A3B8]">
                <li><a href="#how-it-works" className="hover:text-[#0066FF]">How it Works</a></li>
                <li><a href="#features-cod" className="hover:text-[#0066FF]">COD Risk Defense</a></li>
                <li><a href="#features-reorder" className="hover:text-[#0066FF]">Customer Intelligence</a></li>
                <li><a href="#features-udhaar" className="hover:text-[#0066FF]">Digital Udhaar Khata</a></li>
                <li><a href="#features-autonomy" className="hover:text-[#0066FF]">Earned Autonomy</a></li>
              </ul>
            </div>

            {/* Platform Col */}
            <div className="space-y-2">
              <div className="font-bold text-[#0F1E36] dark:text-white uppercase tracking-wider text-[11px]">
                Ecosystem
              </div>
              <ul className="space-y-1.5 text-[#64748B] dark:text-[#94A3B8]">
                <li><a href="#partners" className="hover:text-[#0066FF]">Paytm for Business</a></li>
                <li><a href="#partners" className="hover:text-[#0066FF]">WhatsApp Cloud API</a></li>
                <li><a href="#partners" className="hover:text-[#0066FF]">Shopify India Sync</a></li>
                <li><a href="#pricing" className="hover:text-[#0066FF]">Merchant Pricing</a></li>
                <li><a href="#roi" className="hover:text-[#0066FF]">Holdout Lift Science</a></li>
              </ul>
            </div>

            {/* Legal Col */}
            <div className="space-y-2">
              <div className="font-bold text-[#0F1E36] dark:text-white uppercase tracking-wider text-[11px]">
                Trust & Security
              </div>
              <ul className="space-y-1.5 text-[#64748B] dark:text-[#94A3B8]">
                <li><a href="#faq" className="hover:text-[#0066FF]">Quiet Hours (9PM-9AM)</a></li>
                <li><a href="#faq" className="hover:text-[#0066FF]">Opt-Out & Privacy</a></li>
                <li><a href="#faq" className="hover:text-[#0066FF]">AES-256 Data Isolation</a></li>
                <li><span className="text-[#10B981] font-semibold">99.98% System Uptime</span></li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-[#E2E8F0] dark:border-[#1E3A5F] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#64748B] dark:text-[#94A3B8]">
            <div>
              © 2026 SELLVION Technologies Pvt. Ltd. in collaboration with Paytm for Business. All rights reserved.
            </div>
            <div className="flex items-center gap-4">
              <span>Made with pride for Indian merchants 🇮🇳</span>
              <span>·</span>
              <button
                onClick={() => openConsoleWithTab('inbox')}
                className="text-[#0066FF] dark:text-[#38BDF8] font-bold hover:underline cursor-pointer"
              >
                Merchant Login →
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
