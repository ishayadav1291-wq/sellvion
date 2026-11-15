import React, { useState } from 'react';
import {
  Bot,
  Play,
  ArrowDown,
  ShieldCheck,
  UserCheck,
  CheckCircle2,
  X,
  ArrowRight,
  Activity,
} from 'lucide-react';
import { Customer, Order, PendingAction } from '../types';

interface TeammatesWorkspaceProps {
  customers: Customer[];
  orders: Order[];
  actions: PendingAction[];
  onNavigateTab: (tab: string) => void;
  onNotify: (msg: string) => void;
}

interface TeammateDef {
  id: string;
  name: string;
  role: string;
  scope: string;
  tools: string[];
  runs: number;
  targetTab: string;
  recentTrace: string;
}

export const TeammatesWorkspace: React.FC<TeammatesWorkspaceProps> = ({
  customers,
  orders,
  actions,
  onNavigateTab,
  onNotify,
}) => {
  const [selectedTeammate, setSelectedTeammate] = useState<TeammateDef | null>(null);
  const [lastCheckResult, setLastCheckResult] = useState<{
    title: string;
    summary: string;
    targetTab: string;
  } | null>(null);

  const teammates: TeammateDef[] = [
    {
      id: 'intel',
      name: 'Customer Intelligence Agent',
      role: 'Tracks customer order history, purchase rhythm, and active khata balances.',
      scope: 'Read-only store records',
      tools: ['customers.query', 'orders.history'],
      runs: customers.length * 4,
      targetTab: 'customers',
      recentTrace: `Tracking ${customers.length} customer profiles and repeat purchase intervals.`,
    },
    {
      id: 'predict',
      name: 'Behaviour & Prediction Agent',
      role: 'Scores COD return risk and identifies buyers whose products are running low.',
      scope: 'Risk & reorder scoring',
      tools: ['cadence.forecast', 'cod.riskScorer'],
      runs: orders.length * 6,
      targetTab: 'cod-risk',
      recentTrace: `Flagged ${orders.filter((o) => (o.codRiskScore || 0) >= 50).length} high-risk COD orders before pickup.`,
    },
    {
      id: 'copy',
      name: 'Engagement & Copy Agent',
      role: 'Drafts polite Hindi/Hinglish WhatsApp check-ins and payment reminders.',
      scope: 'Drafts only (no direct send)',
      tools: ['draft.hinglish', 'upi.linkBuilder'],
      runs: actions.length + 18,
      targetTab: 'inbox',
      recentTrace: `${actions.filter((a) => a.status === 'pending_approval').length} personalized drafts waiting in Approvals.`,
    },
    {
      id: 'guard',
      name: 'Policy & Safety Guard',
      role: 'Enforces night quiet hours (9 PM–9 AM IST), opt-outs, and frequency caps.',
      scope: 'Blocks unsafe dispatches',
      tools: ['quietHours.ist', 'optOut.check'],
      runs: actions.length + 24,
      targetTab: 'autonomy',
      recentTrace: 'Verified opt-in consent and daytime delivery window across all queued messages.',
    },
    {
      id: 'exec',
      name: 'Execution & Measurement Agent',
      role: 'Dispatches approved messages via WhatsApp and verifies resulting orders or UPI payments.',
      scope: 'Approved actions only',
      tools: ['whatsapp.send', 'outcome.verify'],
      runs: actions.filter((a) => a.status === 'approved').length + 14,
      targetTab: 'metrics',
      recentTrace: 'Reconciles confirmed reorders, prepaid conversions, and settled udhaar balances.',
    },
  ];

  const runCheck = (type: 'reorders' | 'cod' | 'udhaar') => {
    if (type === 'reorders') {
      const due = customers.filter((c) => c.segment === 'reorder_due');
      const msg = `Found ${due.length} regular customers due for reorder (${due.map((c) => c.name).join(', ') || 'none'}).`;
      setLastCheckResult({ title: 'Reorder Cadence Scan Complete', summary: msg, targetTab: 'inbox' });
      onNotify(msg);
    } else if (type === 'cod') {
      const risky = orders.filter((o) => (o.codRiskScore || 0) >= 50);
      const msg = `Scanned ${orders.length} orders: ${risky.length} COD orders flagged for UPI prepay check.`;
      setLastCheckResult({ title: 'COD Risk Scan Complete', summary: msg, targetTab: 'cod-risk' });
      onNotify(msg);
    } else {
      const pendingUdhaar = customers.filter((c) => c.outstandingUdhaar > 0);
      const total = pendingUdhaar.reduce((sum, c) => sum + c.outstandingUdhaar, 0);
      const msg = `Checked digital khata: ₹${total.toLocaleString('en-IN')} pending across ${pendingUdhaar.length} customers.`;
      setLastCheckResult({ title: 'Udhaar Ledger Scan Complete', summary: msg, targetTab: 'udhaar' });
      onNotify(msg);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Actions */}
      <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#1E3A5F] bg-white dark:bg-[#132238] p-5 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div className="space-y-1">
          <h2 className="text-lg font-extrabold text-[#0F1E36] dark:text-white flex items-center gap-2">
            <Bot className="w-5 h-5 text-[#0066FF] dark:text-[#38BDF8]" />
            <span>AI Teammates · Store Coordinator</span>
          </h2>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            5 specialized teammates work together across customer memory, COD risk, Hinglish copy, safety checks, and delivery tracking.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => runCheck('reorders')}
            className="h-9 px-3.5 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Find Reorders Due</span>
          </button>
          <button
            onClick={() => runCheck('cod')}
            className="h-9 px-3.5 rounded-xl bg-[#0F1E36] dark:bg-[#0C243B] hover:bg-[#0066FF] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Check Risky COD</span>
          </button>
          <button
            onClick={() => runCheck('udhaar')}
            className="h-9 px-3.5 rounded-xl border border-[#CBD5E1] dark:border-[#1E3A5F] hover:border-[#0066FF] text-xs font-bold text-[#0F1E36] dark:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Play className="w-3.5 h-3.5 text-[#0066FF] dark:text-[#38BDF8]" />
            <span>Check Pending Udhaar</span>
          </button>
        </div>
      </div>

      {lastCheckResult && (
        <div className="rounded-2xl border border-[#BAE6FD] dark:border-[#1E456E] bg-[#F0F9FF] dark:bg-[#0C243B] p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5 text-xs">
            <div className="font-bold text-[#0066FF] dark:text-[#38BDF8]">{lastCheckResult.title}</div>
            <div className="text-[#0F1E36] dark:text-[#F8FAFC]">{lastCheckResult.summary}</div>
          </div>
          <button
            onClick={() => onNavigateTab(lastCheckResult.targetTab)}
            className="px-3.5 py-2 rounded-xl bg-[#0066FF] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <span>Open Results</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Hub-and-Spoke 5 Teammates View */}
      <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#1E3A5F] bg-white dark:bg-[#132238] p-5 space-y-5 shadow-xs">
        <div className="flex flex-col items-center gap-2 text-xs">
          <div className="w-full max-w-md py-2.5 px-4 rounded-xl bg-[#0F1E36] text-white border border-[#0066FF] text-center font-bold shadow-xs">
            Central Store Coordinator · Assigns & Verifies 5 Teammates
          </div>
          <ArrowDown className="w-4 h-4 text-[#0066FF] dark:text-[#38BDF8]" />
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {teammates.map((tm, idx) => (
            <button
              key={tm.id}
              onClick={() => setSelectedTeammate(tm)}
              className="text-left rounded-2xl border border-[#E2E8F0] dark:border-[#1E3A5F] hover:border-[#0066FF] dark:hover:border-[#38BDF8] bg-[#F8FAFC] dark:bg-[#0F1A2C] p-4 flex flex-col justify-between gap-3 transition-colors cursor-pointer"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-[#0066FF] dark:text-[#38BDF8]">
                  <span className="font-mono">Teammate 0{idx + 1}</span>
                  <span className="tabular-nums text-[#64748B] dark:text-[#94A3B8]">
                    {tm.runs} runs
                  </span>
                </div>
                <div className="text-xs font-extrabold text-[#0F1E36] dark:text-white">
                  {tm.name}
                </div>
                <p className="text-[11px] text-[#475569] dark:text-[#CBD5E1] leading-snug">
                  {tm.role}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap gap-1">
                  {tm.tools.map((tool) => (
                    <span
                      key={tool}
                      className="px-1.5 py-0.5 rounded bg-white dark:bg-[#132238] border border-[#E2E8F0] dark:border-[#1E3A5F] text-[10px] font-mono text-[#475569] dark:text-[#94A3B8]"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
                <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#1E3A5F] flex items-center justify-between text-[11px]">
                  <span className="text-[#64748B] dark:text-[#94A3B8] truncate">{tm.scope}</span>
                  <span className="font-bold text-[#0066FF] dark:text-[#38BDF8] shrink-0">Inspect →</span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Verification Pipeline Strip */}
        <div className="grid sm:grid-cols-3 gap-3 pt-1 text-xs">
          <div className="p-3 rounded-xl bg-[#F0F7FF] dark:bg-[#0C243B] border border-[#BAE6FD] dark:border-[#1E456E] font-bold text-[#0F1E36] dark:text-white flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#0066FF] dark:text-[#38BDF8]" />
            <span>Safety & Approval Check</span>
          </div>
          <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#0F1A2C] border border-[#E2E8F0] dark:border-[#1E3A5F] font-bold text-[#0F1E36] dark:text-white flex items-center justify-center gap-2">
            <UserCheck className="w-4 h-4 text-[#16A34A]" />
            <span>Safe WhatsApp Dispatch</span>
          </div>
          <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#0F1A2C] border border-[#E2E8F0] dark:border-[#1E3A5F] font-bold text-[#0F1E36] dark:text-white flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
            <span>Verified Order & UPI Outcome</span>
          </div>
        </div>
      </div>

      {/* Teammate Detail Modal */}
      {selectedTeammate && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#132238] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#BAE6FD] dark:border-[#1E3A5F] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#1E3A5F]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#0066FF] text-white flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0F1E36] dark:text-white">
                    {selectedTeammate.name}
                  </h3>
                  <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                    Permission: {selectedTeammate.scope}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedTeammate(null)}
                className="p-1.5 text-[#64748B] hover:text-[#0F1E36] dark:hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-[#475569] dark:text-[#CBD5E1] leading-relaxed bg-[#F8FAFC] dark:bg-[#0F1A2C] p-3 rounded-xl border border-[#E2E8F0] dark:border-[#1E3A5F]">
                {selectedTeammate.role}
              </p>

              <div className="flex items-center gap-2 text-[#0066FF] dark:text-[#38BDF8] bg-[#F0F9FF] dark:bg-[#0C243B] p-3 rounded-xl border border-[#BAE6FD] dark:border-[#1E456E]">
                <Activity className="w-4 h-4 shrink-0" />
                <span>{selectedTeammate.recentTrace}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E8F0] dark:border-[#1E3A5F]">
              <button
                onClick={() => setSelectedTeammate(null)}
                className="px-3 py-1.5 text-xs text-[#64748B] cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const target = selectedTeammate.targetTab;
                  setSelectedTeammate(null);
                  onNavigateTab(target);
                }}
                className="px-4 py-2 bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <span>Go to Workspace View</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
