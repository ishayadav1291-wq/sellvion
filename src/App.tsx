import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { PeekHero } from './components/PeekHero';
import { ApprovalInbox } from './components/ApprovalInbox';
import { Customer360 } from './components/Customer360';
import { CodRiskScorer } from './components/CodRiskScorer';
import { UdhaarLedger } from './components/UdhaarLedger';
import { AutonomySettings } from './components/AutonomySettings';
import { MetricsAndLift } from './components/MetricsAndLift';
import { ComparisonMatrix } from './components/ComparisonMatrix';
import { AiCopilotModal } from './components/AiCopilotModal';

import {
  INITIAL_CUSTOMERS,
  INITIAL_PENDING_ACTIONS,
  INITIAL_ORDERS,
  INITIAL_METRICS,
  INITIAL_AUTONOMY_CONFIG,
} from './data/mockData';
import { Customer, PendingAction, Order, MetricSummary, AutonomyPolicyConfig } from './types';
import { ShieldCheck, Sparkles, Check, ArrowUpRight } from 'lucide-react';

export default function App() {
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

  const [activeTab, setActiveTab] = useState<string>('overview');
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [actions, setActions] = useState<PendingAction[]>(INITIAL_PENDING_ACTIONS);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [metrics, setMetrics] = useState<MetricSummary>(INITIAL_METRICS);
  const [autonomyConfig, setAutonomyConfig] = useState<AutonomyPolicyConfig>(INITIAL_AUTONOMY_CONFIG);
  const [copilotOpen, setCopilotOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const handleApproveAction = (id: string) => {
    const act = actions.find((a) => a.id === id);
    if (!act) return;

    setActions((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'approved' } : a))
    );

    // Update business metrics in real-time
    const orderAmount = act.metadata?.orderAmount || 1450;
    setMetrics((prev) => ({
      ...prev,
      incrementalAiRevenue: prev.incrementalAiRevenue + orderAmount,
      totalRevenue: prev.totalRevenue + orderAmount,
      reactivatedThisMonth:
        act.type === 'winback_offer' ? prev.reactivatedThisMonth + 1 : prev.reactivatedThisMonth,
    }));

    showToast(`✓ Approved & Sent: WhatsApp message delivered to ${act.customerName}`);
  };

  const handleRejectAction = (id: string, reason?: string) => {
    setActions((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'rejected' } : a))
    );
    showToast(`Action dismissed. Policy model updated with feedback.`);
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

  const pendingCount = actions.filter((a) => a.status === 'pending_approval').length;

  return (
    <div className="min-h-screen bg-[#FAF9F5] dark:bg-[#0E1210] text-[#141B18] dark:text-[#E8ECE9] font-sans antialiased flex flex-col justify-between selection:bg-[#059669]/15 selection:text-[#065F46] transition-colors duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0F2E22] dark:bg-[#1E4D3B] text-white px-4 py-3 rounded-xl shadow-lg border border-[#1A4535] dark:border-[#2A654E] text-xs font-medium flex items-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4 text-[#34D399]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main App Layout */}
      <div>
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          pendingCount={pendingCount}
          onOpenCopilot={() => setCopilotOpen(true)}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === 'overview' && (
            <PeekHero
              customers={customers}
              metrics={metrics}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onActionTriggered={handleActionTriggeredFromSimulator}
            />
          )}

          {activeTab === 'inbox' && (
            <ApprovalInbox
              actions={actions}
              onApprove={handleApproveAction}
              onReject={handleRejectAction}
              onSnooze={handleSnoozeAction}
              onUpdateDraft={handleUpdateDraft}
            />
          )}

          {activeTab === 'customers' && (
            <Customer360
              customers={customers}
              onOpenDraftModal={() => setActiveTab('inbox')}
            />
          )}

          {activeTab === 'cod-risk' && (
            <CodRiskScorer
              orders={orders}
              onMitigateOrder={handleMitigateOrder}
            />
          )}

          {activeTab === 'udhaar' && (
            <UdhaarLedger
              customers={customers}
              onRecordPayment={handleRecordPayment}
              onSendReminder={handleSendUdhaarReminder}
            />
          )}

          {activeTab === 'autonomy' && (
            <AutonomySettings
              config={autonomyConfig}
              onUpdateConfig={(cfg) => {
                setAutonomyConfig(cfg);
                showToast('Earned autonomy policy saved and synced.');
              }}
            />
          )}

          {activeTab === 'metrics' && (
            <MetricsAndLift metrics={metrics} />
          )}

          {activeTab === 'comparison' && (
            <ComparisonMatrix />
          )}
        </main>
      </div>

      {/* Copilot Dialog */}
      <AiCopilotModal
        isOpen={copilotOpen}
        onClose={() => setCopilotOpen(false)}
        customers={customers}
        metrics={metrics}
      />

      {/* Anti-Slop Clean Quiet Footer */}
      <footer className="border-t border-[#EAE8E1] dark:border-[#232B26] bg-[#FAF9F5] dark:bg-[#0E1210] py-8 mt-16 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6B726C] dark:text-[#9DA49F]">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#141B18] dark:text-[#F0F3F1]">SELLVION</span>
            <span>·</span>
            <span>Autonomous AI employee for small & growing Indian merchants</span>
          </div>

          <div className="flex items-center gap-6">
            <span>Official WhatsApp Business Partner Integration</span>
            <span aria-hidden="true">·</span>
            <span>Holdout A/B Methodology (BRULE-06)</span>
            <span aria-hidden="true">·</span>
            <span>© 2026 SELLVION Technologies</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
