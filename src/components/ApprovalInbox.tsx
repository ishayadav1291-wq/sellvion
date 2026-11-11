import React, { useState } from 'react';
import {
  Check,
  X,
  Clock,
  Edit3,
  Send,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCheck,
  RotateCcw,
  MessageSquare,
  Wand2,
  RefreshCw,
} from 'lucide-react';
import { PendingAction, ActionStatus } from '../types';

interface ApprovalInboxProps {
  actions: PendingAction[];
  onApprove: (id: string) => void;
  onReject: (id: string, reason?: string) => void;
  onSnooze: (id: string) => void;
  onUpdateDraft: (id: string, newText: string) => void;
}

export const ApprovalInbox: React.FC<ApprovalInboxProps> = ({
  actions,
  onApprove,
  onReject,
  onSnooze,
  onUpdateDraft,
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [studioAction, setStudioAction] = useState<PendingAction | null>(null);
  const [studioDraft, setStudioDraft] = useState<string>('');
  const [isGeneratingTone, setIsGeneratingTone] = useState<boolean>(false);

  const [historyList, setHistoryList] = useState<
    Array<{
      id: string;
      customerName: string;
      title: string;
      status: ActionStatus;
      timestamp: string;
      outcome: string;
    }>
  >([
    {
      id: 'HIST-01',
      customerName: 'Meenakshi Sundaram',
      title: 'Filter Coffee 25-day Reorder Nudge',
      status: 'approved',
      timestamp: 'Yesterday, 4:15 PM',
      outcome: 'Customer reordered (₹1,200 UPI paid)',
    },
    {
      id: 'HIST-02',
      customerName: 'Kavita Verma',
      title: 'Udhaar Reminder ₹1,850',
      status: 'approved',
      timestamp: 'Yesterday, 11:20 AM',
      outcome: 'Message delivered & read',
    },
    {
      id: 'HIST-03',
      customerName: 'Rohit Khandelwal',
      title: 'COD Prepay ₹50 discount nudge',
      status: 'rejected',
      timestamp: '2 days ago',
      outcome: 'Merchant rejected (Manual phone verification preferred)',
    },
  ]);

  const pendingActions = actions.filter((a) => a.status === 'pending_approval');

  const filteredPending = pendingActions.filter((a) => {
    if (filterType === 'all') return true;
    return a.type === filterType;
  });

  const handleStartEdit = (action: PendingAction) => {
    setEditingActionId(action.id);
    setEditText(action.suggestedMessage);
  };

  const handleSaveEdit = (actionId: string) => {
    onUpdateDraft(actionId, editText);
    setEditingActionId(null);
  };

  const handleOpenStudio = (action: PendingAction) => {
    setStudioAction(action);
    setStudioDraft(action.suggestedMessage);
  };

  const handleApplyTone = async (tone: 'polite' | 'festive' | 'urgent') => {
    if (!studioAction) return;
    setIsGeneratingTone(true);
    try {
      const res = await fetch('/api/ai/draft-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: studioAction.type,
          customerName: studioAction.customerName,
          productName: studioAction.metadata?.productName || 'Assam Tea',
          cadenceDays: 28,
          daysSinceLastOrder: 28,
          languageTone: tone === 'festive' ? 'festive_friendly' : tone === 'urgent' ? 'urgent_courteous' : 'polite_hinglish',
        }),
      });
      const data = await res.json();
      if (data.draft) {
        setStudioDraft(data.draft);
      }
    } catch (err) {
      // Heuristic fallback
      if (tone === 'festive') {
        setStudioDraft(`Shubh Navratri ${studioAction.customerName.split(' ')[0]} ji! 🎉 Aapka favorite ${studioAction.metadata?.productName || 'order'} festive stock me ready hai. Order with 1-tap: sellvion.store/p/festive`);
      } else if (tone === 'urgent') {
        setStudioDraft(`Namaste ${studioAction.customerName.split(' ')[0]} ji, aapka COD order ship hone wala hai. Pay ₹50 less via UPI before 5 PM to confirm priority delivery: sellvion.store/prepay/upi`);
      }
    } finally {
      setIsGeneratingTone(false);
    }
  };

  const handleSaveStudioAndApprove = () => {
    if (!studioAction) return;
    onUpdateDraft(studioAction.id, studioDraft);
    handleApproveWithHistory({ ...studioAction, suggestedMessage: studioDraft });
    setStudioAction(null);
  };

  const handleApproveWithHistory = (action: PendingAction) => {
    onApprove(action.id);
    setHistoryList((prev) => [
      {
        id: `HIST-${Date.now()}`,
        customerName: action.customerName,
        title: action.title,
        status: 'approved',
        timestamp: 'Just now',
        outcome: `Sent to ${action.customerPhone} via WhatsApp (${action.potentialImpact})`,
      },
      ...prev,
    ]);
  };

  const handleRejectWithHistory = (action: PendingAction) => {
    onReject(action.id, 'Dismissed by merchant');
    setHistoryList((prev) => [
      {
        id: `HIST-${Date.now()}`,
        customerName: action.customerName,
        title: action.title,
        status: 'rejected',
        timestamp: 'Just now',
        outcome: 'Rejected by merchant (Model updated feedback loop)',
      },
      ...prev,
    ]);
  };

  const handleBulkApprove = () => {
    filteredPending.forEach((act) => {
      handleApproveWithHistory(act);
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Metrics Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#64748B] dark:text-[#94A3B8] mb-1">
            <span>Human Control by Default</span>
            <span>·</span>
            <span className="font-semibold text-[#0284C7] dark:text-[#38BDF8]">Earned Autonomy State Machine</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-[#0F172A] dark:text-white">
            Approval Inbox
          </h2>
          <p className="text-sm text-[#64748B] dark:text-[#94A3B8] mt-0.5">
            Review recommendations generated by SELLVION agents before they reach customers.
          </p>
        </div>

        {/* Action tabs: Pending vs Audit History */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-[#E0F2FE] dark:bg-[#1E293B] rounded-xl">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                activeTab === 'pending'
                  ? 'bg-white dark:bg-[#0284C7] text-[#0284C7] dark:text-white shadow-xs font-semibold'
                  : 'text-[#0369A1] dark:text-[#94A3B8] hover:text-[#0284C7] dark:hover:text-white'
              }`}
            >
              Pending Review ({pendingActions.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-white dark:bg-[#0284C7] text-[#0284C7] dark:text-white shadow-xs font-semibold'
                  : 'text-[#0369A1] dark:text-[#94A3B8] hover:text-[#0284C7] dark:hover:text-white'
              }`}
            >
              Decision History ({historyList.length})
            </button>
          </div>

          {activeTab === 'pending' && filteredPending.length > 0 && (
            <button
              onClick={handleBulkApprove}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-xl transition-all shadow-sm shadow-[#0284C7]/20 flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <CheckCheck className="w-4 h-4 text-[#E0F2FE]" />
              <span>Approve All ({filteredPending.length})</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === 'pending' ? (
        <>
          {/* Filter Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-[#64748B] dark:text-[#94A3B8] font-medium mr-1 whitespace-nowrap">Filter:</span>
            {[
              { id: 'all', label: 'All Opportunities' },
              { id: 'reorder_reminder', label: 'Predictive Reorders' },
              { id: 'cod_prepay', label: 'COD Risk Prepayment' },
              { id: 'cod_verify', label: 'COD Verification' },
              { id: 'udhaar_reminder', label: 'Udhaar Clearance' },
              { id: 'winback_offer', label: 'VIP Win-Back' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterType(f.id)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                  filterType === f.id
                    ? 'bg-[#0284C7] text-white font-medium shadow-xs'
                    : 'bg-white dark:bg-[#132238] border border-[#E2E8F0] dark:border-[#1E293B] text-[#64748B] dark:text-[#94A3B8] hover:border-[#BAE6FD] hover:text-[#0284C7]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Pending Action Cards */}
          {filteredPending.length === 0 ? (
            <div className="bg-white dark:bg-[#132238] rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] p-12 text-center transition-colors">
              <div className="w-12 h-12 rounded-full bg-[#E0F2FE] dark:bg-[#0C2E4E] text-[#0284C7] dark:text-[#38BDF8] flex items-center justify-center mx-auto mb-3 shadow-2xs">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#0F172A] dark:text-white">
                All Caught Up! Zero Pending Approvals
              </h3>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8] max-w-md mx-auto mt-1">
                SELLVION is monitoring customer cadence and order intake in real-time. New opportunities will appear as reorder windows approach.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPending.map((action) => {
                const isEditing = editingActionId === action.id;

                return (
                  <div
                    key={action.id}
                    className="bg-white dark:bg-[#132238] rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] p-5 lg:p-6 shadow-2xs hover:border-[#BAE6FD] dark:hover:border-[#0284C7]/50 transition-all"
                  >
                    {/* Top Row: Title, Customer, Impact */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-[#F1F5F9] dark:border-[#1E293B]">
                      <div>
                        <div className="flex items-center gap-2 text-xs text-[#64748B] dark:text-[#94A3B8] mb-1">
                          <span className="font-semibold text-[#0284C7] dark:text-[#38BDF8]">
                            {action.customerName}
                          </span>
                          <span>·</span>
                          <span>{action.customerCity}</span>
                          <span>·</span>
                          <span className="font-mono tabular-nums">{action.createdAt}</span>
                        </div>
                        <h3 className="text-base font-bold text-[#0F172A] dark:text-white tracking-tight">
                          {action.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Confidence score */}
                        <div className="text-right">
                          <div className="text-xs font-semibold text-[#0284C7] dark:text-[#38BDF8] font-mono tabular-nums">
                            {action.confidence}% AI Confidence
                          </div>
                          <div className="text-[11px] text-[#0284C7] dark:text-[#7DD3FC] font-medium">
                            {action.potentialImpact}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Middle: Reason Code & Explainability */}
                    <div className="py-3">
                      <div className="text-xs text-[#64748B] dark:text-[#94A3B8] mb-1 font-medium">
                        Explainable Signal Basis:
                      </div>
                      <p className="text-xs text-[#334155] dark:text-[#CBD5E1] bg-[#F8FAFC] dark:bg-[#0B1320] p-3 rounded-lg border border-[#E2E8F0] dark:border-[#1E293B] leading-relaxed">
                        {action.reason}
                      </p>
                    </div>

                    {/* WhatsApp Message Draft Preview / Edit Box */}
                    <div className="py-2">
                      <div className="flex items-center justify-between text-xs text-[#64748B] dark:text-[#94A3B8] mb-1.5">
                        <span className="font-medium text-[#0284C7] dark:text-[#38BDF8] flex items-center gap-1.5">
                          <span>WhatsApp Hinglish Draft</span>
                          <span className="text-[10px] text-[#0284C7] dark:text-[#7DD3FC] font-mono">
                            (Provider: Approved Business API)
                          </span>
                        </span>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleOpenStudio(action)}
                            className="text-xs text-[#0284C7] dark:text-[#38BDF8] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                          >
                            <Sparkles className="w-3 h-3 text-[#0EA5E9]" />
                            <span>Open Tone Studio</span>
                          </button>
                          {!isEditing && (
                            <button
                              onClick={() => handleStartEdit(action)}
                              className="text-xs text-[#64748B] dark:text-[#94A3B8] hover:text-[#0284C7] flex items-center gap-1 font-medium cursor-pointer"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Quick Edit</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="space-y-2">
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            rows={3}
                            className="w-full text-xs p-3 rounded-lg border border-[#0284C7] dark:border-[#38BDF8] bg-white dark:bg-[#0B1320] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none ring-1 ring-[#0284C7] dark:ring-[#38BDF8]"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setEditingActionId(null)}
                              className="px-3 py-1.5 text-xs text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveEdit(action.id)}
                              className="px-3 py-1.5 text-xs font-medium bg-[#0284C7] text-white rounded-lg hover:bg-[#0369A1] cursor-pointer"
                            >
                              Save Draft
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-[#F0F9FF] dark:bg-[#0C243B] border border-[#BAE6FD] dark:border-[#1E456E] rounded-xl p-3.5 text-xs text-[#0F172A] dark:text-[#F8FAFC] leading-relaxed relative font-sans">
                          {action.suggestedMessage}
                        </div>
                      )}
                    </div>

                    {/* Bottom Actions Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-2 border-t border-[#F1F5F9] dark:border-[#1E293B]">
                      <div className="flex items-center gap-2 text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#0284C7] dark:text-[#38BDF8]" />
                        <span>Consent Verified · Safe Sending Window</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onSnooze(action.id)}
                          className="px-3 py-1.5 text-xs font-medium text-[#64748B] dark:text-[#94A3B8] hover:text-[#0284C7] hover:bg-[#F0F7FF] dark:hover:bg-[#1E293B] rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>Snooze 24h</span>
                        </button>

                        <button
                          onClick={() => handleRejectWithHistory(action)}
                          className="px-3 py-1.5 text-xs font-medium text-[#DC2626] dark:text-[#F87171] hover:bg-[#FEE2E2] dark:hover:bg-[#3E1A1A] rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>

                        <button
                          onClick={() => handleApproveWithHistory(action)}
                          className="px-4 py-1.5 text-xs font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg transition-colors shadow-sm shadow-[#0284C7]/20 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5 text-[#BAE6FD]" />
                          <span>Approve & Send</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* History & Audit Trail View (FR-018) */
        <div className="bg-white dark:bg-[#132238] rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] overflow-hidden shadow-2xs transition-colors">
          <div className="p-4 border-b border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#0F172A] flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-wider text-[#0284C7] dark:text-[#38BDF8]">
              Tamper-evident Action Audit Log
            </div>
            <div className="text-xs text-[#64748B] dark:text-[#94A3B8] font-mono">
              Scanned 100% merchant actions
            </div>
          </div>

          <div className="divide-y divide-[#F1F5F9] dark:divide-[#1E293B]">
            {historyList.map((hist) => (
              <div
                key={hist.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2 text-[#64748B] dark:text-[#94A3B8] mb-0.5">
                    <span className="font-semibold text-[#0F172A] dark:text-white">
                      {hist.customerName}
                    </span>
                    <span>·</span>
                    <span className="font-mono tabular-nums">{hist.timestamp}</span>
                  </div>
                  <div className="font-medium text-[#334155] dark:text-[#CBD5E1]">{hist.title}</div>
                  <div className="text-[#64748B] dark:text-[#94A3B8] mt-0.5">{hist.outcome}</div>
                </div>

                <div className="shrink-0">
                  {hist.status === 'approved' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-[#E0F2FE] dark:bg-[#0C2E4E] text-[#0369A1] dark:text-[#7DD3FC] border border-[#BAE6FD] dark:border-[#194572]">
                      <Check className="w-3 h-3" /> Approved & Sent
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-[#FEE2E2] dark:bg-[#3E1A1A] text-[#DC2626] dark:text-[#F87171] border border-[#FECACA] dark:border-[#522020]">
                      <X className="w-3 h-3" /> Dismissed
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dynamic Action Tone Studio Modal */}
      {studioAction && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#132238] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#BAE6FD] dark:border-[#1E3A5F] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#1E3A5F]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#0284C7] text-white flex items-center justify-center shadow-xs">
                  <Wand2 className="w-4 h-4 text-[#BAE6FD]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                    AI Message Tone Studio
                  </h3>
                  <div className="text-[10px] text-[#0284C7] dark:text-[#38BDF8] font-mono">
                    Recipient: {studioAction.customerName} ({studioAction.customerCity})
                  </div>
                </div>
              </div>
              <button
                onClick={() => setStudioAction(null)}
                className="p-1.5 text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Tone Presets */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-[#475569] dark:text-[#CBD5E1] block">
                Select AI Generation Persona:
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={isGeneratingTone}
                  onClick={() => handleApplyTone('polite')}
                  className="p-2 text-center rounded-lg border border-[#BAE6FD] dark:border-[#1E3A5F] bg-[#F0F9FF] dark:bg-[#0C243B] text-[#0284C7] dark:text-[#38BDF8] text-xs font-semibold hover:bg-[#E0F2FE] cursor-pointer"
                >
                  Polite Hinglish
                </button>
                <button
                  type="button"
                  disabled={isGeneratingTone}
                  onClick={() => handleApplyTone('festive')}
                  className="p-2 text-center rounded-lg border border-[#E2E8F0] dark:border-[#1E3A5F] bg-white dark:bg-[#0F1A2C] text-[#0F172A] dark:text-[#F8FAFC] text-xs font-semibold hover:bg-[#F8FAFC] cursor-pointer"
                >
                  🎉 Festive Mood
                </button>
                <button
                  type="button"
                  disabled={isGeneratingTone}
                  onClick={() => handleApplyTone('urgent')}
                  className="p-2 text-center rounded-lg border border-[#E2E8F0] dark:border-[#1E3A5F] bg-white dark:bg-[#0F1A2C] text-[#0F172A] dark:text-[#F8FAFC] text-xs font-semibold hover:bg-[#F8FAFC] cursor-pointer"
                >
                  ⚡ Time-Limited
                </button>
              </div>
            </div>

            {/* Draft Editor */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-[#64748B] dark:text-[#94A3B8]">
                <span>WhatsApp Body Preview</span>
                {isGeneratingTone && (
                  <span className="text-[#0284C7] dark:text-[#38BDF8] flex items-center gap-1 font-mono text-[10px]">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Generating with Gemini...
                  </span>
                )}
              </div>
              <textarea
                value={studioDraft}
                onChange={(e) => setStudioDraft(e.target.value)}
                rows={4}
                className="w-full text-xs p-3 rounded-xl border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#0F1A2C] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-1 focus:ring-[#0284C7]"
              />
              <div className="flex items-center justify-between text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                <span>Est. API Cost: ₹0.72 (Utility Category)</span>
                <span className="font-mono">{studioDraft.length} chars</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8F0] dark:border-[#1E3A5F]">
              <button
                type="button"
                onClick={() => setStudioAction(null)}
                className="px-3 py-1.5 text-xs text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveStudioAndApprove}
                className="px-4 py-2 bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm shadow-[#0284C7]/20 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 text-[#BAE6FD]" />
                <span>Save & Dispatch Now</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
