import React, { useState, useEffect } from 'react';
import {
  Inbox,
  Users,
  ShieldAlert,
  IndianRupee,
  ArrowRight,
  RotateCcw,
  Upload,
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  Play,
} from 'lucide-react';
import {
  AnalyticsSummaryResponse,
  AppLanguage,
  AppMode,
  ApprovalRecord,
  ConsoleTabId,
  CustomerRecord,
  OrderRecord,
  WorkflowRecord,
} from '../../types';
import { apiRequest } from '../../lib/api';
import { localizeAgentName, localizeWorkflowStatus, localizeWorkflowType, tr } from '../../i18n/translations';

interface MerchantDashboardProps {
  language?: AppLanguage;
  analytics: AnalyticsSummaryResponse | null;
  customers: CustomerRecord[];
  orders: OrderRecord[];
  approvals: ApprovalRecord[];
  workflows: WorkflowRecord[];
  appMode: AppMode;
  range: '7d' | '30d' | '90d' | 'all';
  onChangeRange: (r: '7d' | '30d' | '90d' | 'all') => void;
  onNavigateTab: (tab: ConsoleTabId) => void;
  onResetDemo: () => void;
  onRefresh?: () => void;
  onNotify?: (msg: string) => void;
}

export const MerchantDashboard: React.FC<MerchantDashboardProps> = ({
  language = 'en',
  analytics,
  customers,
  orders,
  approvals,
  workflows,
  appMode,
  range,
  onChangeRange,
  onNavigateTab,
  onResetDemo,
  onRefresh,
  onNotify,
}) => {
  const [search, setSearch] = useState('');
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowRecord | null>(null);
  const [quickRunning, setQuickRunning] = useState<string | null>(null);

  const pipelineSteps = [
    { key: 'customer_identified', label: tr(language, 'Customer identified', 'ग्राहक पहचाना गया') },
    { key: 'opportunity_detected', label: tr(language, 'Opportunity detected', 'अवसर मिला') },
    { key: 'message_prepared', label: tr(language, 'Message prepared', 'संदेश तैयार') },
    { key: 'approval_required', label: tr(language, 'Approval required', 'मंजूरी बाकी') },
    { key: 'message_sent', label: tr(language, 'Message sent', 'संदेश भेजा गया') },
    { key: 'customer_response', label: tr(language, 'Customer response', 'ग्राहक प्रतिक्रिया') },
    { key: 'purchase_tracked', label: tr(language, 'Purchase tracked', 'ऑर्डर सत्यापित') },
  ];

  const handleQuickRun = async (
    workflowType: 'reactivation' | 'cod_protection' | 'udhaar_collection'
  ) => {
    setQuickRunning(workflowType);
    try {
      const res = await apiRequest<{ message: string }>('/api/workflows/run', {
        method: 'POST',
        body: JSON.stringify({ workflowType }),
      });
      onNotify?.(res.message);
      onRefresh?.();
    } catch (err: unknown) {
      onNotify?.(
        err instanceof Error
          ? err.message
          : tr(language, 'Could not run agent check.', 'एजेंट जांच शुरू नहीं हो सकी।')
      );
    } finally {
      setQuickRunning(null);
    }
  };

  useEffect(() => {
    if (!selectedWorkflow) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedWorkflow(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedWorkflow]);

  const obs = analytics?.actualObserved;
  const opp = analytics?.opportunities;
  const trend = analytics?.orderTrend || [];
  const maxTrendRev = Math.max(1, ...trend.map((t) => Number(t.revenue || 0)));

  const inactiveOrDueCount = customers.filter(
    (c) =>
      c.segment === 'reorder_due' ||
      c.segment === 'inactive' ||
      c.days_since_last_order >= c.average_cadence_days
  ).length;

  const priorityItems: Array<{
    id: string;
    title: string;
    subtitle: string;
    statusLabel: string;
    tone: 'red' | 'amber' | 'blue';
    targetTab: ConsoleTabId;
    actionLabel: string;
  }> = [
    ...orders
      .filter((o) => o.payment_mode === 'COD' && o.status === 'Pending_Verification')
      .slice(0, 3)
      .map((o) => ({
        id: `ord-${o.id}`,
        title: `${o.customer_name || tr(language, 'Customer', 'ग्राहक')} · ${o.order_number} (₹${Number(
          o.total_amount
        ).toLocaleString('en-IN')})`,
        subtitle: tr(
          language,
          'COD order flagged for address verification before dispatch',
          'डिस्पैच से पहले पता जांच के लिए चिह्नित COD ऑर्डर'
        ),
        statusLabel: tr(language, 'COD risk', 'COD जोखिम'),
        tone: 'red' as const,
        targetTab: 'cod-risk' as ConsoleTabId,
        actionLabel: tr(language, 'Review', 'जांचें'),
      })),
    ...customers
      .filter((c) => Number(c.outstanding_udhaar) > 0)
      .slice(0, 2)
      .map((c) => ({
        id: `udh-${c.id}`,
        title: `${c.name} · ₹${Number(c.outstanding_udhaar).toLocaleString('en-IN')} ${tr(
          language,
          'pending',
          'बाकी'
        )}`,
        subtitle: `${tr(language, 'Khata balance due', 'खाता बकाया तिथि')}: ${
          c.udhaar_due_date || tr(language, 'soon', 'जल्द')
        }`,
        statusLabel: tr(language, 'Payment pending', 'भुगतान बाकी'),
        tone: 'amber' as const,
        targetTab: 'udhaar' as ConsoleTabId,
        actionLabel: tr(language, 'Collect', 'वसूलें'),
      })),
    ...approvals
      .filter((a) => a.status === 'pending_approval')
      .slice(0, 2)
      .map((a) => ({
        id: `app-${a.id}`,
        title: `${a.customer_name} · ${a.title}`,
        subtitle: `${tr(language, 'Prepared by', 'तैयार किया')}: ${localizeAgentName(
          language,
          a.agent_name
        )} · ${tr(language, 'Ready for your review', 'आपकी मंजूरी के लिए तैयार')}`,
        statusLabel: tr(language, 'Needs approval', 'मंजूरी बाकी'),
        tone: 'blue' as const,
        targetTab: 'inbox' as ConsoleTabId,
        actionLabel: tr(language, 'Approve', 'मंजूर करें'),
      })),
    ...customers
      .filter(
        (c) => c.segment === 'reorder_due' || c.days_since_last_order >= c.average_cadence_days
      )
      .slice(0, 2)
      .map((c) => ({
        id: `cus-${c.id}`,
        title: `${c.name} · ${c.last_product_ordered || tr(language, 'Regular item', 'नियमित सामान')}`,
        subtitle: `${c.days_since_last_order} ${tr(
          language,
          'days since last order',
          'दिन पहले पिछला ऑर्डर'
        )} (${tr(language, 'usual cycle', 'सामान्य अंतराल')}: ${c.average_cadence_days}d)`,
        statusLabel: tr(language, 'Reorder due', 'रीऑर्डर का समय'),
        tone: 'blue' as const,
        targetTab: 'customers' as ConsoleTabId,
        actionLabel: tr(language, 'Follow up', 'संदेश भेजें'),
      })),
  ].filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.subtitle.toLowerCase().includes(q) ||
      item.statusLabel.toLowerCase().includes(q)
    );
  });

  const filteredWorkflows = workflows.filter((wf) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      wf.workflow_type.toLowerCase().includes(q) ||
      wf.target_id.toLowerCase().includes(q) ||
      wf.status.toLowerCase().includes(q)
    );
  });

  const getActiveStepIndex = (wf: WorkflowRecord) => {
    const hasVerifiedOutcome = wf.tasks?.some((t) => t.step_order === 6);
    if (hasVerifiedOutcome) return 7;
    if (wf.status === 'completed' || wf.status === 'executed') return 5;
    if (wf.status === 'awaiting_approval') return 3;
    if (wf.status === 'escalated') return 3;
    if (wf.status === 'failed') return 2;
    return 1;
  };

  return (
    <div className="space-y-6">
      {/* Top Bar: Title + Date Range + Search + Reset Demo */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-[#071A35] dark:text-white">
            {tr(language, "Today's Store Priorities", 'आज की प्राथमिकताएं')}
          </h2>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            {appMode === 'demo'
              ? tr(
                  language,
                  'Demo Store Sandbox — Sample store data and simulated WhatsApp dispatches.',
                  'डेमो स्टोर सैंडबॉक्स — नमूना दुकान डेटा और सिमुलेटेड संदेश लॉग।'
                )
              : tr(
                  language,
                  'Live Store Workspace — Real customer, order, and approval records.',
                  'लाइव स्टोर वर्कस्पेस — आपकी दुकान का वास्तविक ग्राहक, ऑर्डर और मंजूरी डेटा।'
                )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label={tr(language, 'Date range', 'समय अवधि')}
            value={range}
            onChange={(e) => onChangeRange(e.target.value as typeof range)}
            className="h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#0B1E40] text-xs font-bold text-[#071A35] dark:text-white cursor-pointer"
          >
            <option value="7d">{tr(language, 'Last 7 Days', 'पिछले 7 दिन')}</option>
            <option value="30d">{tr(language, 'Last 30 Days', 'पिछले 30 दिन')}</option>
            <option value="90d">{tr(language, 'Last 90 Days', 'पिछले 90 दिन')}</option>
            <option value="all">{tr(language, 'All Time', 'सभी समय')}</option>
          </select>

          {appMode === 'demo' ? (
            <button
              onClick={onResetDemo}
              className="h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#0B1E40] text-xs font-bold text-[#071A35] dark:text-white flex items-center gap-1.5 cursor-pointer hover:border-[#2563EB]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{tr(language, 'Reset Demo', 'डेमो रीसेट')}</span>
            </button>
          ) : (
            <button
              onClick={() => onNavigateTab('import')}
              className="h-9 px-3 rounded-lg bg-[#2563EB] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{tr(language, 'Upload CSV', 'CSV अपलोड')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Search + Quick Agent Run Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tr(
              language,
              'Search priorities, customers, or recent AI activity...',
              'प्राथमिकताएं, ग्राहक या हाल की AI गतिविधि खोजें...'
            )}
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#0B1E40] text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            disabled={quickRunning !== null}
            onClick={() => handleQuickRun('reactivation')}
            className="h-8 px-3 rounded-lg bg-[#2563EB] hover:bg-[#071A35] text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <Play className="w-3 h-3" />
            <span>
              {quickRunning === 'reactivation'
                ? tr(language, 'Running...', 'चल रहा है...')
                : tr(language, 'Recover Buyer', 'ग्राहक वापसी')}
            </span>
          </button>
          <button
            type="button"
            disabled={quickRunning !== null}
            onClick={() => handleQuickRun('cod_protection')}
            className="h-8 px-3 rounded-lg bg-[#071A35] dark:bg-[#22D3EE] hover:bg-[#2563EB] text-white dark:text-[#071A35] text-[11px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <Play className="w-3 h-3" />
            <span>
              {quickRunning === 'cod_protection'
                ? tr(language, 'Running...', 'चल रहा है...')
                : tr(language, 'Check COD', 'COD जांच')}
            </span>
          </button>
          <button
            type="button"
            disabled={quickRunning !== null}
            onClick={() => handleQuickRun('udhaar_collection')}
            className="h-8 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#0B1E40] hover:border-[#2563EB] text-[11px] font-bold text-[#071A35] dark:text-white flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <Play className="w-3 h-3 text-[#2563EB] dark:text-[#22D3EE]" />
            <span>
              {quickRunning === 'udhaar_collection'
                ? tr(language, 'Running...', 'चल रहा है...')
                : tr(language, 'Udhaar Check', 'उधार जांच')}
            </span>
          </button>
        </div>
      </div>

      {/* Guided Demo Walkthrough Strip */}
      {appMode === 'demo' && (
        <div className="rounded-2xl border border-[#BFDBFE] dark:border-[#1E3A5F] bg-[#F0F7FF] dark:bg-[#0B1E40] p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-extrabold text-[#071A35] dark:text-white">
              {tr(
                language,
                'Guided Demo Flow · Watch 5 AI Teammates Complete a Full Business Loop',
                'डेमो गाइड · देखें 5 AI साथी पूरा व्यापार कार्य कैसे निपटाते हैं'
              )}
            </span>
            <span className="text-[11px] font-mono text-[#2563EB] dark:text-[#22D3EE]">
              {tr(language, 'SANDBOX · SAFE TO TEST', 'सैंडबॉक्स · कोई भी कार्य आज़माएं')}
            </span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2 text-xs">
            <button
              type="button"
              onClick={() => onNavigateTab('customers')}
              className="text-left p-3 rounded-xl bg-white dark:bg-[#061533] border border-[#E2E8F0] dark:border-[#1E3A5F] hover:border-[#2563EB] transition-colors cursor-pointer"
            >
              <div className="font-bold text-[#2563EB] dark:text-[#22D3EE] font-mono">
                {tr(language, '01 · Inactive Buyer', '01 · निष्क्रिय ग्राहक')}
              </div>
              <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                {tr(language, 'Inspect overdue customer', 'रीऑर्डर वाले ग्राहक देखें')}
              </div>
            </button>
            <button
              type="button"
              disabled={quickRunning !== null}
              onClick={() => handleQuickRun('reactivation')}
              className="text-left p-3 rounded-xl bg-white dark:bg-[#061533] border border-[#E2E8F0] dark:border-[#1E3A5F] hover:border-[#2563EB] transition-colors cursor-pointer disabled:opacity-50"
            >
              <div className="font-bold text-[#2563EB] dark:text-[#22D3EE] font-mono">
                02 ·{' '}
                {quickRunning === 'reactivation'
                  ? tr(language, 'Running...', 'चल रहा है...')
                  : tr(language, 'Run Recovery', 'रिकवरी चलाएं')}
              </div>
              <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                {tr(language, 'Trigger 5-agent team', '5-एजेंट टीम शुरू करें')}
              </div>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('agents')}
              className="text-left p-3 rounded-xl bg-white dark:bg-[#061533] border border-[#E2E8F0] dark:border-[#1E3A5F] hover:border-[#2563EB] transition-colors cursor-pointer"
            >
              <div className="font-bold text-[#2563EB] dark:text-[#22D3EE]">
                {tr(language, '3. Inspect 5 Agents', '3. 5 एजेंट्स देखें')}
              </div>
              <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                {tr(language, 'View tools & safety', 'टूल्स व सुरक्षा जांचें')}
              </div>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('inbox')}
              className="text-left p-3 rounded-xl bg-white dark:bg-[#061533] border border-[#E2E8F0] dark:border-[#1E3A5F] hover:border-[#2563EB] transition-colors cursor-pointer"
            >
              <div className="font-bold text-[#2563EB] dark:text-[#22D3EE] font-mono">
                {tr(language, '04 · Approve & Send', '04 · मंजूर कर भेजें')}
              </div>
              <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                {tr(language, 'Open Action Center', 'मंजूरी केंद्र खोलें')}
              </div>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('analytics')}
              className="text-left p-3 rounded-xl bg-white dark:bg-[#061533] border border-[#E2E8F0] dark:border-[#1E3A5F] hover:border-[#16A34A] transition-colors cursor-pointer"
            >
              <div className="font-bold text-[#16A34A] font-mono">
                {tr(language, '05 · Verify Outcome', '05 · परिणाम देखें')}
              </div>
              <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                {tr(language, 'Measure repeat revenue', 'दोबारा बिक्री मापें')}
              </div>
            </button>
          </div>
        </div>
      )}

      {/* 6 Visual Overview Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          {
            tab: 'customers' as ConsoleTabId,
            icon: Users,
            label: tr(language, 'Customers to follow up', 'संपर्क के लिए ग्राहक'),
            value: String(inactiveOrDueCount),
            sub: `${obs?.totalCustomers ?? customers.length} ${tr(
              language,
              'total buyers',
              'कुल ग्राहक'
            )}`,
            tone: 'text-[#2563EB] dark:text-[#22D3EE]',
          },
          {
            tab: 'customers' as ConsoleTabId,
            icon: RefreshCw,
            label: tr(language, 'Reorders due', 'रीऑर्डर बाकी'),
            value: String(opp?.dueForReorderCount ?? 0),
            sub: tr(language, 'Reached usual buying gap', 'खरीद समय पूरा हुआ'),
            tone: 'text-[#2563EB] dark:text-[#22D3EE]',
          },
          {
            tab: 'cod-risk' as ConsoleTabId,
            icon: ShieldAlert,
            label: tr(language, 'Orders that may be returned', 'रिटर्न जोखिम वाले ऑर्डर'),
            value: String(opp?.flaggedCodOrders ?? 0),
            sub: `₹${(opp?.flaggedCodExposureInr ?? 0).toLocaleString('en-IN')} ${tr(
              language,
              'COD to check',
              'COD जांच बाकी'
            )}`,
            tone: 'text-[#D97706]',
          },
          {
            tab: 'udhaar' as ConsoleTabId,
            icon: IndianRupee,
            label: tr(language, 'Pending payments', 'बाकी भुगतान (उधार)'),
            value: `₹${(opp?.pendingUdhaarInr ?? 0).toLocaleString('en-IN')}`,
            sub: `₹${(obs?.collectedPayments ?? 0).toLocaleString('en-IN')} ${tr(
              language,
              'collected so far',
              'अब तक प्राप्त'
            )}`,
            tone: 'text-[#D97706]',
          },
          {
            tab: 'inbox' as ConsoleTabId,
            icon: Inbox,
            label: tr(language, 'Actions awaiting approval', 'मंजूरी के लिए कतार'),
            value: String(opp?.pendingApprovals ?? 0),
            sub: tr(language, 'Waiting for your tap to send', 'भेजने के लिए आपकी मंजूरी बाकी'),
            tone: 'text-[#2563EB] dark:text-[#22D3EE]',
          },
          {
            tab: 'inbox' as ConsoleTabId,
            icon: CheckCircle2,
            label: tr(language, 'Completed AI actions', 'पूरे किए गए AI कार्य'),
            value: String(obs?.executedActions ?? 0),
            sub: tr(language, 'Sent or verified with permission', 'अनुमति से भेजे व सत्यापित'),
            tone: 'text-[#16A34A]',
          },
        ].map((card) => (
          <button
            key={card.label}
            onClick={() => onNavigateTab(card.tab)}
            className="text-left rounded-2xl border border-[#E2E8F0] dark:border-[#1E3A5F] bg-white dark:bg-[#0B1E40] p-4 hover:border-[#2563EB] transition-colors cursor-pointer space-y-2.5"
          >
            <div className="flex items-center justify-between text-xs text-[#64748B] dark:text-[#94A3B8]">
              <span className="font-semibold">{card.label}</span>
              <card.icon className={`w-4 h-4 ${card.tone}`} />
            </div>
            <div className="text-2xl font-extrabold text-[#071A35] dark:text-white tabular-nums">
              {card.value}
            </div>
            <div className="flex items-center justify-between text-xs text-[#2563EB] dark:text-[#22D3EE] font-semibold">
              <span>{card.sub}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>
        ))}
      </div>

      {/* Today's Priorities + Recent AI Activity */}
      <div className="grid lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 rounded-2xl border border-[#E2E8F0] dark:border-[#1E3A5F] bg-white dark:bg-[#0B1E40] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-[#071A35] dark:text-white">
              {tr(language, "Today's Priorities", 'आज की प्राथमिकताएं')}
            </h3>
            <span className="text-xs font-mono text-[#64748B] dark:text-[#94A3B8] tabular-nums">
              {priorityItems.length} {tr(language, 'item(s)', 'कार्य')}
            </span>
          </div>

          {priorityItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#64748B]">
              {tr(
                language,
                'Nothing urgent matching your filter. Your store is up to date.',
                'आपकी खोज से जुड़ा कोई ज़रूरी कार्य नहीं है।'
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {priorityItems.slice(0, 6).map((item) => {
                const textColor =
                  item.tone === 'red'
                    ? 'text-[#DC2626]'
                    : item.tone === 'amber'
                    ? 'text-[#D97706]'
                    : 'text-[#2563EB] dark:text-[#22D3EE]';
                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#061533] border border-[#E2E8F0] dark:border-[#1E3A5F] flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className={`flex items-center gap-1.5 text-[11px] font-bold ${textColor}`}>
                        {item.tone === 'red' ? (
                          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                        ) : item.tone === 'amber' ? (
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <Inbox className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span>{item.statusLabel}</span>
                      </div>
                      <div className="font-bold text-[#071A35] dark:text-white truncate">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] truncate">
                        {item.subtitle}
                      </div>
                    </div>
                    <button
                      onClick={() => onNavigateTab(item.targetTab)}
                      className="h-8 px-3 rounded-lg bg-[#2563EB] hover:bg-[#071A35] text-white font-bold shrink-0 cursor-pointer transition-colors"
                    >
                      {item.actionLabel}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent AI Activity */}
        <div className="lg:col-span-5 rounded-2xl border border-[#E2E8F0] dark:border-[#1E3A5F] bg-white dark:bg-[#0B1E40] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-[#071A35] dark:text-white">
              {tr(language, 'Recent AI Activity', 'हाल की AI गतिविधि')}
            </h3>
            <button
              onClick={() => onNavigateTab('agents')}
              className="text-xs font-bold text-[#2563EB] dark:text-[#22D3EE] hover:underline cursor-pointer"
            >
              {tr(language, 'Open AI Teammates →', 'AI साथी देखें →')}
            </button>
          </div>

          {filteredWorkflows.length === 0 ? (
            <p className="text-xs text-[#64748B] py-6">
              {tr(
                language,
                'No AI activity yet. Open AI Teammates to run a customer or COD check.',
                'अभी कोई AI गतिविधि नहीं। जांच चलाने के लिए AI साथी खोलें।'
              )}
            </p>
          ) : (
            <div className="space-y-2.5">
              {filteredWorkflows.slice(0, 5).map((wf) => {
                const stepCount = getActiveStepIndex(wf);
                return (
                  <div
                    key={wf.id}
                    className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#061533] border border-[#E2E8F0] dark:border-[#1E3A5F] space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-bold text-[#071A35] dark:text-white capitalize truncate">
                          {localizeWorkflowType(language, wf.workflow_type)}
                        </div>
                        <div className="text-[11px] text-[#64748B] truncate">
                          {tr(language, 'Target', 'लक्ष्य')}: {wf.target_id} · {localizeWorkflowStatus(language, wf.status)}
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedWorkflow(wf)}
                        className="h-7 px-2.5 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] hover:border-[#2563EB] text-[11px] font-bold text-[#2563EB] dark:text-[#22D3EE] shrink-0 cursor-pointer"
                      >
                        {tr(language, 'View details', 'विवरण देखें')}
                      </button>
                    </div>
                    <div className="grid grid-cols-7 gap-1" title={`${stepCount}/7 steps completed`}>
                      {pipelineSteps.map((st, idx) => (
                        <div
                          key={st.key}
                          className={`h-1.5 rounded-full ${
                            idx < stepCount
                              ? 'bg-[#2563EB] dark:bg-[#22D3EE]'
                              : 'bg-[#E2E8F0] dark:bg-[#1E3A5F]'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recorded Order Volume */}
      <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#1E3A5F] bg-white dark:bg-[#0B1E40] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-extrabold text-[#071A35] dark:text-white">
              {tr(language, 'Recorded Order Volume', 'दर्ज ऑर्डर मात्रा')} ({obs?.totalOrders ?? 0}{' '}
              {tr(language, 'orders', 'ऑर्डर')})
            </h3>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] tabular-nums">
              {tr(
                language,
                'Total order value in selected period',
                'चुनी अवधि का कुल ऑर्डर मूल्य'
              )}
              : ₹{(obs?.grossRevenue ?? 0).toLocaleString('en-IN')}
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('orders')}
            className="text-xs font-bold text-[#2563EB] dark:text-[#22D3EE] hover:underline cursor-pointer"
          >
            {tr(language, 'View All Orders →', 'सभी ऑर्डर देखें →')}
          </button>
        </div>

        {trend.length === 0 ? (
          <div className="py-10 text-center text-xs text-[#64748B]">
            {tr(
              language,
              'No orders recorded yet. Add an order or upload a CSV to see daily trends.',
              'अभी कोई ऑर्डर दर्ज नहीं है। ट्रेंड देखने के लिए ऑर्डर जोड़ें या CSV अपलोड करें।'
            )}
          </div>
        ) : (
          <div className="flex items-end gap-2 h-36 pt-4">
            {trend.map((pt) => {
              const heightPct = Math.max(12, Math.round((Number(pt.revenue) / maxTrendRev) * 100));
              return (
                <div key={pt.date} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <div
                    title={`${pt.date}: ₹${Number(pt.revenue).toLocaleString('en-IN')} (${pt.orders} orders)`}
                    style={{ height: `${heightPct}%` }}
                    className="w-full max-w-[36px] rounded-t-lg bg-[#2563EB] hover:bg-[#22D3EE] transition-colors"
                  />
                  <span className="text-[10px] text-[#64748B] truncate max-w-full tabular-nums">
                    {pt.date.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Workflow Step Details Modal */}
      {selectedWorkflow && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#0B1E40] border border-[#CBD5E1] dark:border-[#1E3A5F] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-mono font-semibold text-[#64748B]">
                  {selectedWorkflow.id}
                </div>
                <h3 className="text-base font-extrabold text-[#071A35] dark:text-white capitalize">
                  {localizeWorkflowType(language, selectedWorkflow.workflow_type)}{' '}
                  {tr(language, 'Progress', 'प्रगति')}
                </h3>
              </div>
              <button
                onClick={() => setSelectedWorkflow(null)}
                aria-label={tr(language, 'Close workflow details', 'विवरण बंद करें')}
                className="p-1.5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {pipelineSteps.map((st, idx) => {
                const activeIdx = getActiveStepIndex(selectedWorkflow);
                const done = idx < activeIdx;
                const current = idx === activeIdx;
                return (
                  <div
                    key={st.key}
                    className={`p-2.5 rounded-xl border flex items-center justify-between ${
                      done
                        ? 'border-[#BBF7D0] dark:border-[#14532D] bg-[#F0FDF4] dark:bg-[#052E16]/40'
                        : current
                        ? 'border-[#93C5FD] dark:border-[#1E3A5F] bg-[#EFF6FF] dark:bg-[#061533]'
                        : 'border-[#E2E8F0] dark:border-[#1E3A5F] opacity-60'
                    }`}
                  >
                    <span className="font-bold text-[#071A35] dark:text-white">
                      {idx + 1}. {st.label}
                    </span>
                    {done ? (
                      <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                    ) : current ? (
                      selectedWorkflow.status === 'failed' ? (
                        <AlertTriangle className="w-4 h-4 text-[#DC2626]" />
                      ) : (
                        <Clock className="w-4 h-4 text-[#2563EB] dark:text-[#22D3EE]" />
                      )
                    ) : (
                      <span className="text-[11px] text-[#64748B]">
                        {tr(language, 'Waiting', 'प्रतीक्षा')}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {selectedWorkflow.tasks && selectedWorkflow.tasks.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[#E2E8F0] dark:border-[#1E3A5F]">
                <div className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                  {tr(language, 'Agent Execution Trace', 'एजेंट कार्य विवरण')}
                </div>
                <div className="space-y-1.5 text-xs">
                  {selectedWorkflow.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#061533] border border-[#E2E8F0] dark:border-[#1E3A5F] space-y-0.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-[#071A35] dark:text-white">
                          {localizeAgentName(language, task.agent_name)}
                        </span>
                        <span className="text-[11px] font-semibold text-[#16A34A] tabular-nums">
                          {localizeWorkflowStatus(language, task.status)}{' '}
                          {task.duration_ms ? `· ${task.duration_ms}ms` : ''}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#475569] dark:text-[#CBD5E1]">{task.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setSelectedWorkflow(null);
                  onNavigateTab('agents');
                }}
                className="h-9 px-4 rounded-lg bg-[#2563EB] text-white text-xs font-bold cursor-pointer"
              >
                {tr(language, 'Open in AI Teammates', 'AI साथी में खोलें')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
