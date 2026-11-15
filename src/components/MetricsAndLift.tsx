import React, { useState } from 'react';
import {
  BarChart3,
  Download,
  Users,
  IndianRupee,
  ShieldAlert,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { AnalyticsSummaryResponse, AppLanguage, ConsoleTabId } from '../types';
import { tr } from '../i18n/translations';

interface MetricsAndLiftProps {
  analytics: AnalyticsSummaryResponse | null;
  language?: AppLanguage;
  onExportCsv?: (type: 'customers' | 'orders' | 'audit') => void;
  showExport?: boolean;
  onNavigateTab?: (tab: ConsoleTabId) => void;
}

export const MetricsAndLift: React.FC<MetricsAndLiftProps> = ({
  analytics,
  language = 'en',
  onExportCsv,
  showExport = false,
  onNavigateTab,
}) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const obs = analytics?.actualObserved;
  const opp = analytics?.opportunities;
  const cohorts = analytics?.cohorts;
  const funnel = analytics?.funnel;
  const pay = analytics?.paymentBreakdown;
  const ordSt = analytics?.orderStatusBreakdown;
  const appSt = analytics?.approvalBreakdown;
  const trend = analytics?.orderTrend || [];
  const maxTrendRev = Math.max(1, ...trend.map((t) => Number(t.revenue || 0)));

  const funnelStages = [
    { label: tr(language, 'Customers tracked', 'ट्रैक किए गए ग्राहक'), count: funnel?.customersTracked ?? obs?.totalCustomers ?? 0 },
    { label: tr(language, 'Due for follow-up', 'फॉलो-अप बाकी'), count: funnel?.dueForFollowUp ?? opp?.dueForReorderCount ?? 0 },
    { label: tr(language, 'Drafts prepared', 'तैयार ड्राफ्ट'), count: funnel?.draftsPrepared ?? 0 },
    { label: tr(language, 'Messages sent', 'भेजे गए संदेश'), count: funnel?.messagesDispatched ?? 0 },
    { label: tr(language, 'Customer replies', 'ग्राहक जवाब'), count: funnel?.repliesReceived ?? 0 },
    { label: tr(language, 'Purchases / payments tracked', 'ट्रैक की गई खरीद / भुगतान'), count: funnel?.conversionsObserved ?? 0 },
  ];
  const maxFunnel = Math.max(1, ...funnelStages.map((s) => s.count));

  const engagedRev = cohorts?.engagedObservedRevenue ?? 0;
  const holdoutRev = cohorts?.holdoutObservedRevenue ?? 0;

  const selectedPoint = trend.find((t) => t.date === selectedDate) || null;

  const observedCards: Array<{
    label: string;
    value: string;
    tone: string;
    targetTab: ConsoleTabId;
  }> = [
    {
      label: tr(language, 'Delivered Revenue', 'डिलीवर राजस्व'),
      value: `₹${(obs?.deliveredRevenue ?? 0).toLocaleString('en-IN')}`,
      tone: 'text-[#071A35] dark:text-white',
      targetTab: 'orders',
    },
    {
      label: tr(language, 'Collected Payments', 'वसूल भुगतान'),
      value: `₹${(obs?.collectedPayments ?? 0).toLocaleString('en-IN')}`,
      tone: 'text-[#16A34A]',
      targetTab: 'udhaar',
    },
    {
      label: tr(language, 'Customers Recovered', 'लौटे ग्राहक'),
      value: String(obs?.customersRecovered ?? 0),
      tone: 'text-[#2563EB] dark:text-[#22D3EE]',
      targetTab: 'customers',
    },
    {
      label: tr(language, 'Messages Delivered', 'डिलीवर संदेश'),
      value: String(obs?.messagesDelivered ?? 0),
      tone: 'text-[#071A35] dark:text-white',
      targetTab: 'inbox',
    },
    {
      label: tr(language, 'Human Escalations', 'मानवीय एस्केलेशन'),
      value: String(obs?.humanEscalations ?? 0),
      tone: 'text-[#D97706]',
      targetTab: 'inbox',
    },
    {
      label: tr(language, 'Repeat Purchases', 'रीपीट खरीद'),
      value: String(obs?.repeatPurchases ?? 0),
      tone: 'text-[#16A34A]',
      targetTab: 'orders',
    },
  ];

  return (
    <div className="space-y-5">
      {/* Row 1: Observed Outcomes vs Open Opportunities & Holdout */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#0B1E40] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[#16A34A]">
                {tr(language, 'Actual Observed Results (Verified DB)', 'वास्तविक सत्यापित परिणाम (DB से)')}
              </div>
              <h3 className="text-base font-extrabold text-[#071A35] dark:text-white">
                {tr(language, 'Recorded Store Outcomes', 'दर्ज स्टोर परिणाम')}
              </h3>
            </div>
            <CheckCircle2 className="w-5 h-5 text-[#16A34A]" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            {observedCards.map((card) => (
              <button
                key={card.label}
                type="button"
                onClick={() => onNavigateTab?.(card.targetTab)}
                className={`text-left p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#061533] border border-[#E2E8F0] dark:border-[#1E3A5F] ${
                  onNavigateTab ? 'hover:border-[#2563EB] cursor-pointer' : 'cursor-default'
                } transition-colors`}
              >
                <div className="text-[#64748B] dark:text-[#94A3B8]">{card.label}</div>
                <div className={`text-lg font-extrabold tabular-nums mt-0.5 ${card.tone}`}>
                  {card.value}
                </div>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E2E8F0] dark:border-[#1E3A5F] text-xs text-[#64748B] dark:text-[#94A3B8]">
            <span>
              {tr(language, 'Completed:', 'पूर्ण:')}{' '}
              <strong className="text-[#071A35] dark:text-white tabular-nums">{obs?.executedActions ?? 0}</strong> ·{' '}
              {tr(language, 'Failed:', 'विफल:')}{' '}
              <strong className="text-[#DC2626] tabular-nums">{obs?.failedActions ?? 0}</strong> ·{' '}
              {tr(language, 'COD Delivered/Returned:', 'COD डिलीवर/वापस:')}{' '}
              <strong className="text-[#16A34A] tabular-nums">{obs?.codDeliveredCount ?? 0}</strong>/
              <strong className="text-[#DC2626] tabular-nums">{obs?.rtoOrders ?? 0}</strong>
            </span>
            <span>
              {tr(language, 'Avg resolution:', 'औसत समय:')}{' '}
              <strong className="text-[#071A35] dark:text-white tabular-nums">
                {obs?.avgResolutionMinutes ?? 0} {tr(language, 'min', 'मिनट')}
              </strong>
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#0B1E40] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[#2563EB] dark:text-[#22D3EE]">
                {tr(language, 'Open Opportunities & Holdout Control', 'खुले अवसर और होल्डआउट नियंत्रण')}
              </div>
              <h3 className="text-base font-extrabold text-[#071A35] dark:text-white">
                {tr(language, 'Pending Value & Control Check', 'बकाया मूल्य और नियंत्रण जांच')}
              </h3>
            </div>
            <BarChart3 className="w-5 h-5 text-[#2563EB] dark:text-[#22D3EE]" />
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <button
              type="button"
              onClick={() => onNavigateTab?.('customers')}
              className={`text-left p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#061533] border border-[#E2E8F0] dark:border-[#1E3A5F] ${
                onNavigateTab ? 'hover:border-[#2563EB] cursor-pointer' : 'cursor-default'
              }`}
            >
              <div className="text-[#64748B] dark:text-[#94A3B8] flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> {tr(language, 'Reorders Due', 'रीऑर्डर बाकी')}
              </div>
              <div className="text-lg font-extrabold text-[#071A35] dark:text-white tabular-nums mt-0.5">
                {opp?.dueForReorderCount ?? 0} {tr(language, 'customers', 'ग्राहक')}
              </div>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab?.('cod-risk')}
              className={`text-left p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#061533] border border-[#E2E8F0] dark:border-[#1E3A5F] ${
                onNavigateTab ? 'hover:border-[#2563EB] cursor-pointer' : 'cursor-default'
              }`}
            >
              <div className="text-[#64748B] dark:text-[#94A3B8] flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" /> {tr(language, 'Flagged COD Value', 'जोखिम वाला COD मूल्य')}
              </div>
              <div className="text-lg font-extrabold text-[#D97706] tabular-nums mt-0.5">
                ₹{(opp?.flaggedCodExposureInr ?? 0).toLocaleString('en-IN')}
              </div>
            </button>
            <div className="p-3 rounded-xl bg-[#EFF6FF] dark:bg-[#061533] border border-[#BFDBFE] dark:border-[#1E3A5F]">
              <div className="text-[#64748B] dark:text-[#94A3B8]">
                {tr(language, 'Contacted Buyers Observed', 'संपर्क किए गए खरीदार')}
              </div>
              <div className="text-base font-extrabold text-[#2563EB] dark:text-[#22D3EE] tabular-nums mt-0.5">
                ₹{engagedRev.toLocaleString('en-IN')} ({cohorts?.engagedCustomers ?? 0})
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#061533] border border-[#E2E8F0] dark:border-[#1E3A5F]">
              <div className="text-[#64748B] dark:text-[#94A3B8]">
                {tr(language, 'Control Group (No Message)', 'नियंत्रण समूह (बिना संदेश)')}
              </div>
              <div className="text-base font-extrabold text-[#071A35] dark:text-white tabular-nums mt-0.5">
                ₹{holdoutRev.toLocaleString('en-IN')} ({cohorts?.holdoutCustomers ?? 0})
              </div>
            </div>
          </div>

          {showExport && onExportCsv && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#E2E8F0] dark:border-[#1E3A5F]">
              <button
                onClick={() => onExportCsv('customers')}
                className="h-8 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:border-[#2563EB]"
              >
                <Download className="w-3.5 h-3.5" /> {tr(language, 'Export Customers CSV', 'ग्राहक CSV निर्यात')}
              </button>
              <button
                onClick={() => onExportCsv('orders')}
                className="h-8 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:border-[#2563EB]"
              >
                <Download className="w-3.5 h-3.5" /> {tr(language, 'Export Orders CSV', 'ऑर्डर CSV निर्यात')}
              </button>
              <button
                onClick={() => onExportCsv('audit')}
                className="h-8 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:border-[#2563EB]"
              >
                <Download className="w-3.5 h-3.5" /> {tr(language, 'Export Audit Log', 'ऑडिट लॉग निर्यात')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Visual Conversion Funnel & Breakdowns */}
      <div className="grid lg:grid-cols-12 gap-4">
        <div className="lg:col-span-6 rounded-2xl border border-[#E2E8F0] dark:border-[#1E3A5F] bg-white dark:bg-[#0B1E40] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-extrabold text-[#071A35] dark:text-white">
              {tr(language, 'Customer Follow-Up Funnel', 'ग्राहक फॉलो-अप फ़नल')}
            </h4>
            <Filter className="w-4 h-4 text-[#2563EB] dark:text-[#22D3EE]" />
          </div>
          <div className="space-y-2.5 text-xs">
            {funnelStages.map((st) => {
              const pct = Math.max(8, Math.round((st.count / maxFunnel) * 100));
              return (
                <div key={st.label} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#334155] dark:text-[#CBD5E1]">
                      {st.label}
                    </span>
                    <span className="font-extrabold tabular-nums text-[#071A35] dark:text-white">
                      {st.count}
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-[#F1F5F9] dark:bg-[#061533] overflow-hidden">
                    <div
                      style={{ width: `${st.count === 0 ? 0 : pct}%` }}
                      className="h-full rounded-full bg-gradient-to-r from-[#2563EB] to-[#22D3EE] transition-all"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-6 rounded-2xl border border-[#E2E8F0] dark:border-[#1E3A5F] bg-white dark:bg-[#0B1E40] p-5 space-y-4">
          <h4 className="text-sm font-extrabold text-[#071A35] dark:text-white">
            {tr(language, 'Store Distribution', 'स्टोर वितरण')}
          </h4>

          <div className="space-y-3 text-xs">
            <div>
              <div className="font-bold text-[#64748B] mb-1.5">
                {tr(language, 'Orders by Payment Mode', 'भुगतान माध्यम के अनुसार ऑर्डर')}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'COD', value: pay?.cod ?? 0, color: 'text-[#D97706]' },
                  { label: 'UPI', value: pay?.prepaidUpi ?? 0, color: 'text-[#16A34A]' },
                  { label: tr(language, 'Card', 'कार्ड'), value: pay?.prepaidCard ?? 0, color: 'text-[#2563EB] dark:text-[#22D3EE]' },
                  { label: tr(language, 'Khata', 'उधार खाता'), value: pay?.udhaar ?? 0, color: 'text-[#071A35] dark:text-white' },
                ].map((item) => (
                  <div key={item.label} className="p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#061533] text-center border border-[#E2E8F0]/60 dark:border-[#1E3A5F]">
                    <div className={`text-base font-extrabold tabular-nums ${item.color}`}>{item.value}</div>
                    <div className="text-[11px] text-[#64748B]">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="font-bold text-[#64748B] mb-1.5">
                {tr(language, 'Orders by Delivery Status', 'डिलीवरी स्थिति के अनुसार ऑर्डर')}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: tr(language, 'To Check', 'जांच बाकी'), value: ordSt?.pendingVerification ?? 0, color: 'text-[#D97706]' },
                  { label: tr(language, 'In Transit', 'रास्ते में'), value: ordSt?.inTransit ?? 0, color: 'text-[#2563EB] dark:text-[#22D3EE]' },
                  { label: tr(language, 'Delivered', 'डिलीवर'), value: ordSt?.delivered ?? 0, color: 'text-[#16A34A]' },
                  { label: tr(language, 'Returned', 'वापस'), value: ordSt?.rtoReturned ?? 0, color: 'text-[#DC2626]' },
                ].map((item) => (
                  <div key={item.label} className="p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#061533] text-center border border-[#E2E8F0]/60 dark:border-[#1E3A5F]">
                    <div className={`text-base font-extrabold tabular-nums ${item.color}`}>{item.value}</div>
                    <div className="text-[11px] text-[#64748B]">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="font-bold text-[#64748B] mb-1.5">
                {tr(language, 'Action Center Status', 'एक्शन सेंटर स्थिति')}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: tr(language, 'Needs Tap', 'मंज़ूरी बाकी'), value: appSt?.needsApproval ?? 0, color: 'text-[#2563EB] dark:text-[#22D3EE]' },
                  { label: tr(language, 'Sent', 'भेजे गए'), value: appSt?.completed ?? 0, color: 'text-[#16A34A]' },
                  { label: tr(language, 'Scheduled', 'शेड्यूल'), value: appSt?.scheduled ?? 0, color: 'text-[#D97706]' },
                  { label: tr(language, 'Issues', 'समस्याएँ'), value: appSt?.issues ?? 0, color: 'text-[#DC2626]' },
                ].map((item) => (
                  <div key={item.label} className="p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#061533] text-center border border-[#E2E8F0]/60 dark:border-[#1E3A5F]">
                    <div className={`text-base font-extrabold tabular-nums ${item.color}`}>{item.value}</div>
                    <div className="text-[11px] text-[#64748B]">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Interactive Order Trend Bars */}
      {trend.length > 0 && (
        <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#1E3A5F] bg-white dark:bg-[#0B1E40] p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-extrabold text-[#071A35] dark:text-white">
                {tr(language, 'Daily Order Trend (Click a bar for day details)', 'दैनिक ऑर्डर ट्रेंड (विवरण के लिए बार पर क्लिक करें)')}
              </h4>
              {selectedPoint && (
                <p className="text-xs font-bold text-[#2563EB] dark:text-[#22D3EE] tabular-nums mt-0.5">
                  {selectedPoint.date}: {selectedPoint.orders} {tr(language, 'order(s)', 'ऑर्डर')} · ₹{Number(selectedPoint.revenue).toLocaleString('en-IN')}
                </p>
              )}
            </div>
            {selectedPoint && (
              <button
                onClick={() => setSelectedDate(null)}
                className="text-xs text-[#64748B] hover:underline cursor-pointer"
              >
                {tr(language, 'Clear selection', 'चयन हटाएँ')}
              </button>
            )}
          </div>
          <div className="flex items-end gap-2 h-28 pt-2">
            {trend.map((pt) => {
              const heightPct = Math.max(12, Math.round((Number(pt.revenue) / maxTrendRev) * 100));
              const isSelected = selectedDate === pt.date;
              return (
                <button
                  key={pt.date}
                  onClick={() => setSelectedDate(isSelected ? null : pt.date)}
                  title={`${pt.date}: ₹${Number(pt.revenue).toLocaleString('en-IN')} (${pt.orders} ${tr(language, 'orders', 'ऑर्डर')})`}
                  className="flex-1 flex flex-col items-center gap-1 h-full justify-end cursor-pointer"
                >
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full max-w-[36px] rounded-t-lg transition-colors ${
                      isSelected ? 'bg-[#22D3EE]' : 'bg-[#2563EB] hover:bg-[#22D3EE]'
                    }`}
                  />
                  <span className="text-[10px] text-[#64748B] tabular-nums">{pt.date.slice(5)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="text-xs text-[#64748B] dark:text-[#94A3B8] flex items-center gap-2 px-1">
        <IndianRupee className="w-3.5 h-3.5 shrink-0" />
        <span>
          {tr(
            language,
            `Figures reflect real database records in the active workspace (${analytics?.mode === 'live' ? 'Live Store' : 'Demo Sample'}). Control group buyers receive no messages so results remain verifiable.`,
            `ये आंकड़े सक्रिय कार्यक्षेत्र (${analytics?.mode === 'live' ? 'लाइव स्टोर' : 'डेमो सैंपल'}) के वास्तविक डेटाबेस रिकॉर्ड दिखाते हैं। नियंत्रण समूह के खरीदारों को कोई संदेश नहीं भेजा जाता ताकि परिणाम सत्यापित रहें।`
          )}
        </span>
      </div>
    </div>
  );
};
