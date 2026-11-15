import React, { useState, useEffect } from 'react';
import {
  Check,
  X,
  Clock,
  Edit3,
  RefreshCw,
  Inbox,
  AlertCircle,
  CheckCheck,
  Eye,
  ShieldCheck,
  Calendar,
  ShoppingBag,
  CheckCircle2,
  Send,
} from 'lucide-react';
import { AppLanguage, AppMode, ApprovalRecord } from '../types';
import { apiRequest } from '../lib/api';
import { localizeAgentName, tr } from '../i18n/translations';

interface ApprovalInboxProps {
  approvals: ApprovalRecord[];
  appMode: AppMode;
  language?: AppLanguage;
  onRefresh: () => void;
  onNotify: (msg: string) => void;
}

type ActionTabId =
  | 'needs_approval'
  | 'scheduled'
  | 'executing'
  | 'completed'
  | 'failed_escalated'
  | 'history';

function parseMeta(metadataJson?: string): Record<string, unknown> {
  if (!metadataJson) return {};
  try {
    return JSON.parse(metadataJson) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export const ApprovalInbox: React.FC<ApprovalInboxProps> = ({
  approvals,
  appMode,
  language = 'en',
  onRefresh,
  onNotify,
}) => {
  const [tab, setTab] = useState<ActionTabId>('needs_approval');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmApprove, setConfirmApprove] = useState<ApprovalRecord | null>(null);
  const [scheduleTarget, setScheduleTarget] = useState<ApprovalRecord | null>(null);
  const [scheduleDateTime, setScheduleDateTime] = useState(() => {
    const tomorrow = new Date(Date.now() + 24 * 3600_000);
    return tomorrow.toISOString().slice(0, 16);
  });
  const [detailTarget, setDetailTarget] = useState<ApprovalRecord | null>(null);
  const [draftRevisions, setDraftRevisions] = useState<
    Array<{
      id: string;
      customerName: string;
      title: string;
      agentName: string;
      message: string;
      timestamp: string;
      status: 'edited' | 'approved' | 'rejected' | 'scheduled';
    }>
  >([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setConfirmApprove(null);
        setScheduleTarget(null);
        setDetailTarget(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const needsApprovalList = approvals.filter(
    (a) => a.status === 'pending_approval' && busyId !== a.id
  );
  const scheduledList = approvals.filter(
    (a) => (a.status === 'scheduled' || a.status === 'snoozed') && busyId !== a.id
  );
  const executingList = approvals.filter(
    (a) =>
      busyId === a.id ||
      a.status === 'approved' ||
      a.workflow_status === 'executing'
  );
  const completedList = approvals.filter(
    (a) => a.status === 'executed' && busyId !== a.id
  );
  const failedEscalatedList = approvals.filter(
    (a) =>
      (a.status === 'failed' || a.status === 'escalated' || a.status === 'rejected') &&
      busyId !== a.id
  );

  const visible =
    tab === 'needs_approval'
      ? needsApprovalList
      : tab === 'scheduled'
      ? scheduledList
      : tab === 'executing'
      ? executingList
      : tab === 'completed'
      ? completedList
      : failedEscalatedList;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleDecision = async (
    id: string,
    decision: 'approve' | 'reject' | 'schedule' | 'retry' | 'escalate',
    scheduledFor?: string
  ) => {
    setBusyId(id);
    try {
      const res = await apiRequest<{ message: string; ok?: boolean }>(`/api/approvals/${id}/decision`, {
        method: 'POST',
        body: JSON.stringify({ decision, scheduledFor }),
      });
      onNotify(res.message);
      setConfirmApprove(null);
      setScheduleTarget(null);
      onRefresh();
    } catch (err: unknown) {
      onNotify(
        err instanceof Error
          ? err.message
          : tr(language, 'Decision failed.', 'निर्णय दर्ज नहीं हो सका।')
      );
      onRefresh();
    } finally {
      setBusyId(null);
    }
  };

  const handleSaveDraft = async (id: string) => {
    if (!draftText.trim()) return;
    setBusyId(id);
    const targetAct = approvals.find((a) => a.id === id);
    try {
      await apiRequest(`/api/approvals/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ suggestedMessage: draftText }),
      });
      if (targetAct) {
        setDraftRevisions((prev) => [
          {
            id: `REV-${Date.now()}`,
            customerName: targetAct.customer_name,
            title: targetAct.title,
            agentName: targetAct.agent_name,
            message: draftText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: 'edited',
          },
          ...prev,
        ]);
      }
      setEditingId(null);
      onNotify(tr(language, 'Draft message updated.', 'ड्राफ़्ट संदेश अपडेट हो गया।'));
      onRefresh();
    } catch (err: unknown) {
      onNotify(
        err instanceof Error
          ? err.message
          : tr(language, 'Failed to save draft.', 'ड्राफ़्ट सेव नहीं हो सका।')
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleBulkApprove = async () => {
    const idsToApprove =
      selectedIds.length > 0 ? selectedIds : needsApprovalList.map((p) => p.id);
    if (idsToApprove.length === 0) return;
    setBusyId('bulk');
    try {
      const res = await apiRequest<{ succeeded: number; failed: number }>('/api/approvals/bulk-approve', {
        method: 'POST',
        body: JSON.stringify({ ids: idsToApprove }),
      });
      setSelectedIds([]);
      onNotify(
        tr(
          language,
          `Completed: ${res.succeeded} sent, ${res.failed} blocked or failed.`,
          `पूर्ण: ${res.succeeded} भेजे गए, ${res.failed} रोके गए या विफल रहे।`
        )
      );
      onRefresh();
    } catch (err: unknown) {
      onNotify(
        err instanceof Error
          ? err.message
          : tr(language, 'Bulk approve failed.', 'एक साथ मंज़ूरी विफल रही।')
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleSimulateRepeatOrder = async (act: ApprovalRecord) => {
    setBusyId(act.id);
    try {
      const meta = parseMeta(act.metadata_json);
      const productName =
        act.customer_last_product ||
        (typeof meta.productName === 'string' && meta.productName) ||
        'Regular Pack';
      const amount = Number(meta.orderAmount || 1150);
      await apiRequest('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          customerId: act.customer_id,
          items: [productName],
          totalAmount: amount,
          paymentMode: 'Prepaid_UPI',
        }),
      });
      onNotify(
        tr(
          language,
          `Recorded repeat purchase for ${act.customer_name} — outcome verified in Reports & AI Teammates.`,
          `${act.customer_name} का रीपीट ऑर्डर दर्ज हुआ — परिणाम रिपोर्ट्स और AI टीममेट्स में सत्यापित हैं।`
        )
      );
      onRefresh();
    } catch (err: unknown) {
      onNotify(
        err instanceof Error
          ? err.message
          : tr(language, 'Could not record repeat order.', 'रीपीट ऑर्डर दर्ज नहीं हो सका।')
      );
    } finally {
      setBusyId(null);
    }
  };

  const getStatusLabel = (act: ApprovalRecord) => {
    if (busyId === act.id) return tr(language, 'Executing', 'निष्पादन जारी');
    switch (act.status) {
      case 'pending_approval':
        return tr(language, 'Needs approval', 'मंज़ूरी बाकी');
      case 'scheduled':
      case 'snoozed':
        return tr(language, 'Scheduled', 'शेड्यूल किया गया');
      case 'approved':
        return tr(language, 'Executing', 'निष्पादन जारी');
      case 'executed':
        return tr(language, 'Completed', 'पूर्ण');
      case 'failed':
        return tr(language, 'Failed', 'विफल');
      case 'escalated':
        return tr(language, 'Escalated', 'एस्केलेटेड');
      case 'rejected':
        return tr(language, 'Rejected', 'अस्वीकृत');
      default:
        return act.status;
    }
  };

  const getStatusTone = (act: ApprovalRecord) => {
    if (busyId === act.id || act.status === 'approved') return 'text-[#2563EB] dark:text-[#22D3EE]';
    if (act.status === 'executed') return 'text-[#16A34A]';
    if (act.status === 'scheduled' || act.status === 'snoozed') return 'text-[#D97706]';
    if (act.status === 'failed' || act.status === 'escalated' || act.status === 'rejected') {
      return 'text-[#DC2626]';
    }
    return 'text-[#2563EB] dark:text-[#22D3EE]';
  };

  const getExecutionSummary = (act: ApprovalRecord) => {
    const meta = parseMeta(act.metadata_json);
    const rejectionNote = act.rejection_reason || (typeof meta.rejectionReason === 'string' ? meta.rejectionReason : '');

    if (busyId === act.id) {
      return tr(language, 'Sending action through provider gateway...', 'प्रोवाइडर गेटवे के ज़रिए भेजा जा रहा है...');
    }
    if (act.execution_error) {
      return tr(language, `Execution failed: ${act.execution_error}`, `निष्पादन विफल: ${act.execution_error}`);
    }
    if (act.execution_status === 'simulated') {
      return tr(
        language,
        `Demo Sandbox dispatch recorded (${act.provider_message_id || 'SIM'})`,
        `डेमो सैंडबॉक्स डिस्पैच दर्ज (${act.provider_message_id || 'SIM'})`
      );
    }
    if (act.execution_status === 'sent' || act.execution_status === 'delivered' || act.execution_status === 'read') {
      return `WhatsApp ${act.execution_status} · ID ${act.provider_message_id || 'VERIFIED'}`;
    }
    if (act.status === 'rejected') {
      return rejectionNote
        ? tr(language, `Dismissed by merchant: ${rejectionNote}`, `व्यापारी द्वारा रद्द: ${rejectionNote}`)
        : tr(language, 'Dismissed by merchant without sending.', 'व्यापारी द्वारा बिना भेजे रद्द किया गया।');
    }
    if (act.status === 'escalated') {
      return tr(
        language,
        'Escalated by Policy & Safety Guard or merchant for manual review.',
        'मैनुअल समीक्षा के लिए नीति रक्षक या व्यापारी द्वारा एस्केलेट किया गया।'
      );
    }
    if (act.status === 'scheduled' || act.status === 'snoozed') {
      return act.scheduled_for
        ? tr(
            language,
            `Scheduled for ${act.scheduled_for.slice(0, 16).replace('T', ' ')}`,
            `${act.scheduled_for.slice(0, 16).replace('T', ' ')} के लिए शेड्यूल`
          )
        : tr(language, 'Scheduled for later delivery.', 'बाद में भेजने के लिए शेड्यूल।');
    }
    if (act.status === 'executed') {
      return act.workflow_current_step === 'measure'
        ? tr(
            language,
            'Dispatched and tracked for customer response/order outcome.',
            'भेजा गया और ग्राहक प्रतिक्रिया/ऑर्डर परिणाम के लिए ट्रैक किया जा रहा है।'
          )
        : tr(language, 'Dispatched with merchant permission.', 'व्यापारी की अनुमति से भेजा गया।');
    }
    return tr(language, 'Awaiting merchant permission before dispatch.', 'भेजने से पहले आपकी मंज़ूरी की प्रतीक्षा है।');
  };

  return (
    <div className="space-y-4">
      {/* Action Center Tabs + Bulk Approve */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {(
            [
              { id: 'needs_approval', label: `${tr(language, 'Needs approval', 'मंज़ूरी बाकी')} (${needsApprovalList.length})` },
              { id: 'scheduled', label: `${tr(language, 'Scheduled', 'शेड्यूल')} (${scheduledList.length})` },
              { id: 'executing', label: `${tr(language, 'Executing', 'जारी')} (${executingList.length})` },
              { id: 'completed', label: `${tr(language, 'Completed', 'पूर्ण')} (${completedList.length})` },
              { id: 'failed_escalated', label: `${tr(language, 'Failed / Escalated', 'विफल / एस्केलेटेड')} (${failedEscalatedList.length})` },
              {
                id: 'history',
                label: `${tr(language, 'Draft History', 'ड्राफ्ट इतिहास')} (${
                  draftRevisions.length + completedList.length + failedEscalatedList.length + scheduledList.length
                })`,
              },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`h-9 px-3 rounded-lg font-bold transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
                tab === item.id
                  ? 'bg-[#2563EB] text-white'
                  : 'bg-white dark:bg-[#0B1E40] border border-[#E2E8F0] dark:border-[#1E3A5F] text-[#475569] dark:text-[#CBD5E1]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === 'needs_approval' && needsApprovalList.length > 0 && (
          <button
            onClick={handleBulkApprove}
            disabled={busyId === 'bulk'}
            className="h-9 px-3.5 rounded-lg bg-[#071A35] hover:bg-[#2563EB] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            <CheckCheck className="w-4 h-4 text-[#22D3EE]" />
            <span>
              {selectedIds.length > 0
                ? tr(language, `Approve Selected (${selectedIds.length})`, `चयनित मंज़ूर करें (${selectedIds.length})`)
                : tr(language, `Approve All (${needsApprovalList.length})`, `सभी मंज़ूर करें (${needsApprovalList.length})`)}
            </span>
          </button>
        )}
      </div>

      {tab === 'history' ? (
        <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#1E3A5F] bg-white dark:bg-[#0B1E40] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#E2E8F0] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#071A35] flex items-center justify-between text-xs">
            <span className="font-extrabold uppercase tracking-wider text-[#2563EB] dark:text-[#22D3EE]">
              {tr(language, 'Draft History & Decision Log', 'ड्राफ्ट इतिहास और निर्णय लॉग')}
            </span>
            <span className="text-[#64748B] dark:text-[#94A3B8] tabular-nums">
              {draftRevisions.length + completedList.length + failedEscalatedList.length + scheduledList.length}{' '}
              {tr(language, 'entries', 'प्रविष्टियाँ')}
            </span>
          </div>
          {draftRevisions.length + completedList.length + failedEscalatedList.length + scheduledList.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#64748B] dark:text-[#94A3B8]">
              {tr(
                language,
                'Edited, approved, scheduled, and dismissed WhatsApp drafts appear here.',
                'बदले गए, मंजूर, शेड्यूल और अस्वीकृत ड्राफ्ट यहाँ दिखाई देंगे।'
              )}
            </div>
          ) : (
            <div className="divide-y divide-[#E2E8F0] dark:divide-[#1E3A5F]">
              {draftRevisions.map((rev) => (
                <div key={rev.id} className="p-4 space-y-1.5 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-bold text-[#071A35] dark:text-white">
                      {rev.customerName} · <span className="text-[#64748B] font-normal">{rev.title}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-[#EFF6FF] dark:bg-[#0C2E4E] text-[#2563EB] dark:text-[#22D3EE] font-bold">
                      {tr(language, 'Edited Draft', 'संपादित ड्राफ्ट')} · {rev.timestamp}
                    </span>
                  </div>
                  <p className="p-2.5 rounded-lg bg-[#F8FAFC] dark:bg-[#061533] text-[#334155] dark:text-[#CBD5E1]">
                    {rev.message}
                  </p>
                </div>
              ))}
              {[...completedList, ...scheduledList, ...failedEscalatedList].map((act) => (
                <div key={`hist-${act.id}`} className="p-4 space-y-1.5 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-bold text-[#071A35] dark:text-white">
                      {act.customer_name} · <span className="text-[#64748B] font-normal">{act.title}</span>
                    </div>
                    <span className={`font-bold ${getStatusTone(act)}`}>
                      {getStatusLabel(act)}
                      {act.executed_at ? ` · ${act.executed_at.slice(0, 16).replace('T', ' ')}` : ''}
                    </span>
                  </div>
                  <p className="p-2.5 rounded-lg bg-[#F8FAFC] dark:bg-[#061533] text-[#334155] dark:text-[#CBD5E1]">
                    {act.suggested_message}
                  </p>
                  <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                    {localizeAgentName(language, act.agent_name)} · {getExecutionSummary(act)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : visible.length === 0 ? (
        <div className="p-10 rounded-2xl border border-dashed border-[#CBD5E1] dark:border-[#1E3A5F] text-center space-y-2">
          <Inbox className="w-8 h-8 text-[#94A3B8] mx-auto" />
          <p className="text-sm font-bold text-[#071A35] dark:text-white">
            {tr(language, 'Nothing in this queue right now', 'अभी इस कतार में कोई कार्य नहीं है')}
          </p>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            {tr(
              language,
              'Run a Customer Recovery, COD Protection, or Udhaar Check workflow to queue actions here.',
              'यहाँ कार्य जोड़ने के लिए ग्राहक वापसी, COD सुरक्षा या उधार जांच वर्कफ़्लो चलाएँ।'
            )}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((act) => {
            const isEditing = editingId === act.id;
            const isPending =
              act.status === 'pending_approval' ||
              act.status === 'scheduled' ||
              act.status === 'snoozed';
            const isFailed = act.status === 'failed' || act.status === 'escalated';
            const isCompletedRecovery =
              act.status === 'executed' &&
              (act.action_type === 'reorder_reminder' || act.action_type === 'winback_offer');

            return (
              <div
                key={act.id}
                className="rounded-2xl border border-[#E2E8F0] dark:border-[#1E3A5F] bg-white dark:bg-[#0B1E40] p-5 space-y-3.5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {act.status === 'pending_approval' && (
                      <input
                        type="checkbox"
                        aria-label={`Select ${act.title}`}
                        checked={selectedIds.includes(act.id)}
                        onChange={() => toggleSelect(act.id)}
                        className="mt-1 cursor-pointer"
                      />
                    )}
                    <div className="space-y-1">
                      <h4 className="text-base font-extrabold text-[#071A35] dark:text-white">
                        {act.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#475569] dark:text-[#CBD5E1]">
                        <span>
                          <strong className="text-[#071A35] dark:text-white">
                            {tr(language, 'Customer:', 'ग्राहक:')}
                          </strong>{' '}
                          {act.customer_name} ({act.customer_city || tr(language, 'India', 'भारत')})
                        </span>
                        {act.order_id && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">
                              {tr(language, 'Order', 'ऑर्डर')} {act.order_id}
                            </span>
                          </>
                        )}
                        <span aria-hidden="true">·</span>
                        <span>
                          <strong className="text-[#071A35] dark:text-white">
                            {tr(language, 'Agent:', 'एजेंट:')}
                          </strong>{' '}
                          <span className="text-[#2563EB] dark:text-[#22D3EE] font-semibold">
                            {localizeAgentName(language, act.agent_name)}
                          </span>
                        </span>
                      </div>
                      <div className="text-xs text-[#475569] dark:text-[#CBD5E1]">
                        <strong className="text-[#071A35] dark:text-white">
                          {tr(language, 'Reason:', 'कारण:')}
                        </strong>{' '}
                        {act.reason}
                      </div>
                    </div>
                  </div>

                  <div className="text-right text-xs space-y-0.5 shrink-0">
                    <div className={`font-bold flex items-center justify-end gap-1 ${getStatusTone(act)}`}>
                      {act.status === 'executed' ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : isFailed ? (
                        <AlertCircle className="w-3.5 h-3.5" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>{getStatusLabel(act)}</span>
                    </div>
                    <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                      {tr(language, 'Approval:', 'अनुमति:')} {act.required_permission} ({act.channel})
                    </div>
                    {act.scheduled_for && (
                      <div className="text-[11px] font-semibold text-[#D97706] tabular-nums">
                        {tr(language, 'Scheduled:', 'शेड्यूल:')} {act.scheduled_for.slice(0, 16).replace('T', ' ')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Editable Message Preview */}
                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      rows={3}
                      value={draftText}
                      onChange={(e) => setDraftText(e.target.value)}
                      className="w-full rounded-xl border border-[#2563EB] bg-[#F8FAFC] dark:bg-[#061533] p-3 text-sm text-[#071A35] dark:text-white"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSaveDraft(act.id)}
                        className="h-8 px-3 rounded-lg bg-[#2563EB] text-white text-xs font-bold cursor-pointer"
                      >
                        {tr(language, 'Save Message', 'संदेश सेव करें')}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="h-8 px-3 rounded-lg border border-[#CBD5E1] text-xs font-semibold cursor-pointer"
                      >
                        {tr(language, 'Cancel', 'रद्द करें')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#061533] border border-[#E2E8F0] dark:border-[#1E3A5F] text-sm text-[#071A35] dark:text-white leading-relaxed">
                    {act.suggested_message}
                  </div>
                )}

                {/* Actual Execution Result Line */}
                <div className="text-xs flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#F0F7FF] dark:bg-[#061533] text-[#334155] dark:text-[#CBD5E1]">
                  <span>
                    <strong className="text-[#071A35] dark:text-white">
                      {tr(language, 'Execution result:', 'निष्पादन परिणाम:')}
                    </strong>{' '}
                    {getExecutionSummary(act)}
                  </span>
                  {act.executed_at && (
                    <span className="text-[11px] text-[#64748B] tabular-nums">
                      {act.executed_at.slice(0, 16).replace('T', ' ')}
                    </span>
                  )}
                </div>

                {act.opted_out === 1 && (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#DC2626]">
                    <AlertCircle className="w-4 h-4" />
                    <span>
                      {tr(
                        language,
                        'Customer opted out — sending is blocked automatically by Policy Guard.',
                        'ग्राहक ने ऑप्ट-आउट किया है — नीति रक्षक द्वारा भेजना अपने आप रोका गया है।'
                      )}
                    </span>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E2E8F0] dark:border-[#1E3A5F]">
                  <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                    {appMode === 'demo'
                      ? tr(language, 'Demo Mode: Approving records a simulated WhatsApp dispatch.', 'डेमो मोड: मंज़ूरी देने पर सिमुलेटेड WhatsApp डिस्पैच दर्ज होता है।')
                      : tr(language, 'Live Mode: Sends through your connected WhatsApp Cloud API.', 'लाइव मोड: आपके जुड़े WhatsApp Cloud API से भेजा जाता है।')}
                  </span>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setDetailTarget(act)}
                      className="h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{tr(language, 'Details', 'विवरण')}</span>
                    </button>

                    {isPending && (
                      <>
                        <button
                          disabled={busyId === act.id || act.opted_out === 1}
                          onClick={() => setConfirmApprove(act)}
                          className="h-9 px-3.5 rounded-lg bg-[#2563EB] hover:bg-[#071A35] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{tr(language, 'Approve', 'मंज़ूर करें')}</span>
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(act.id);
                            setDraftText(act.suggested_message);
                          }}
                          className="h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>{tr(language, 'Edit', 'बदलें')}</span>
                        </button>
                        <button
                          disabled={busyId === act.id}
                          onClick={() => setScheduleTarget(act)}
                          className="h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>{tr(language, 'Schedule', 'शेड्यूल')}</span>
                        </button>
                        <button
                          disabled={busyId === act.id}
                          onClick={() => handleDecision(act.id, 'reject')}
                          className="h-9 px-3 rounded-lg text-xs font-semibold text-[#DC2626] hover:bg-[#FEE2E2] dark:hover:bg-[#450A0A] flex items-center gap-1 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>{tr(language, 'Reject', 'अस्वीकार')}</span>
                        </button>
                      </>
                    )}

                    {isFailed && (
                      <button
                        disabled={busyId === act.id}
                        onClick={() => handleDecision(act.id, 'retry')}
                        className="h-9 px-3.5 rounded-lg bg-[#2563EB] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>{tr(language, 'Retry Send', 'पुनः भेजें')}</span>
                      </button>
                    )}

                    {appMode === 'demo' && isCompletedRecovery && (
                      <button
                        disabled={busyId === act.id}
                        onClick={() => handleSimulateRepeatOrder(act)}
                        className="h-9 px-3.5 rounded-lg border border-[#16A34A] text-[#16A34A] hover:bg-[#16A34A] hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>{tr(language, 'Simulate Repeat Purchase (Demo)', 'रीपीट खरीद सिमुलेट करें (डेमो)')}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal before Approving */}
      {confirmApprove && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0B1E40] border border-[#CBD5E1] dark:border-[#1E3A5F] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-[#071A35] dark:text-white">
              <ShieldCheck className="w-5 h-5 text-[#2563EB] dark:text-[#22D3EE]" />
              <h3 className="text-base font-extrabold">{tr(language, 'Confirm Action', 'कार्रवाई की पुष्टि करें')}</h3>
            </div>
            <div className="text-xs text-[#475569] dark:text-[#CBD5E1] space-y-2">
              <p>
                {tr(language, `Send this ${confirmApprove.channel} message to`, `यह ${confirmApprove.channel} संदेश किसे भेजें:` )}{' '}
                <strong className="text-[#071A35] dark:text-white">
                  {confirmApprove.customer_name} ({confirmApprove.customer_phone})
                </strong>
                ?
              </p>
              <div className="p-3 rounded-xl bg-[#F0F7FF] dark:bg-[#061533] text-[#071A35] dark:text-white">
                {confirmApprove.suggested_message}
              </div>
              <p className="text-[11px] text-[#64748B]">
                {appMode === 'demo'
                  ? tr(language, 'Demo Mode: This records a simulated send inside your sandbox.', 'डेमो मोड: यह आपके सैंडबॉक्स में सिमुलेटेड भेजना दर्ज करता है।')
                  : tr(language, 'Live Mode: This dispatches via your connected WhatsApp Cloud API.', 'लाइव मोड: यह आपके जुड़े WhatsApp Cloud API से भेजा जाएगा।')}
              </p>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmApprove(null)}
                className="h-9 px-4 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] text-xs font-bold cursor-pointer"
              >
                {tr(language, 'Cancel', 'रद्द करें')}
              </button>
              <button
                disabled={busyId === confirmApprove.id}
                onClick={() => handleDecision(confirmApprove.id, 'approve')}
                className="h-9 px-4 rounded-lg bg-[#2563EB] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>
                  {busyId === confirmApprove.id
                    ? tr(language, 'Sending...', 'भेजा जा रहा है...')
                    : tr(language, 'Confirm & Send', 'पुष्टि करें और भेजें')}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Date/Time Modal */}
      {scheduleTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#0B1E40] border border-[#CBD5E1] dark:border-[#1E3A5F] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-[#071A35] dark:text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#2563EB]" />
                <span>{tr(language, 'Schedule Action', 'कार्रवाई शेड्यूल करें')}</span>
              </h3>
              <button onClick={() => setScheduleTarget(null)} className="p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <label className="block font-semibold">{tr(language, 'Pick Date & Time', 'तारीख और समय चुनें')}</label>
              <input
                type="datetime-local"
                value={scheduleDateTime}
                onChange={(e) => setScheduleDateTime(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#061533]"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setScheduleTarget(null)}
                className="h-9 px-3 rounded-lg border border-[#CBD5E1] text-xs font-bold cursor-pointer"
              >
                {tr(language, 'Cancel', 'रद्द करें')}
              </button>
              <button
                disabled={busyId === scheduleTarget.id}
                onClick={() => handleDecision(scheduleTarget.id, 'schedule', scheduleDateTime)}
                className="h-9 px-4 rounded-lg bg-[#2563EB] text-white text-xs font-bold cursor-pointer"
              >
                {tr(language, 'Save Schedule', 'शेड्यूल सेव करें')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Detail Drawer */}
      {detailTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 flex justify-end">
          <div className="w-full max-w-md bg-white dark:bg-[#0B1E40] h-full overflow-y-auto p-6 space-y-4 shadow-2xl border-l border-[#CBD5E1] dark:border-[#1E3A5F] text-xs">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-[#2563EB] dark:text-[#22D3EE] font-bold">
                  {localizeAgentName(language, detailTarget.agent_name)}
                </div>
                <h3 className="text-base font-extrabold text-[#071A35] dark:text-white">
                  {detailTarget.title}
                </h3>
              </div>
              <button onClick={() => setDetailTarget(null)} className="p-1.5 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#061533]">
                <div className="text-[#64748B]">{tr(language, 'Customer', 'ग्राहक')}</div>
                <div className="font-bold text-[#071A35] dark:text-white">
                  {detailTarget.customer_name} · {detailTarget.customer_phone}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#061533]">
                <div className="text-[#64748B]">{tr(language, 'Why Recommended', 'क्यों सुझाया गया')}</div>
                <div className="font-semibold text-[#071A35] dark:text-white">{detailTarget.reason}</div>
              </div>
              <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#061533]">
                <div className="text-[#64748B]">{tr(language, 'Permission Required & Status', 'आवश्यक अनुमति और स्थिति')}</div>
                <div className="font-semibold text-[#071A35] dark:text-white">
                  {detailTarget.required_permission} ({detailTarget.channel}) · {getStatusLabel(detailTarget)}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#061533]">
                <div className="text-[#64748B]">{tr(language, 'Execution Result', 'निष्पादन परिणाम')}</div>
                <div className="font-semibold text-[#071A35] dark:text-white">
                  {getExecutionSummary(detailTarget)}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#F0F7FF] dark:bg-[#061533] border border-[#BFDBFE] dark:border-[#1E3A5F]">
                <div className="text-[#64748B] mb-1">{tr(language, 'Prepared Message', 'तैयार संदेश')}</div>
                <div className="text-sm text-[#071A35] dark:text-white">{detailTarget.suggested_message}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
