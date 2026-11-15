import React, { useState, useEffect } from 'react';
import {
  IndianRupee,
  CheckCircle2,
  Send,
  Plus,
  X,
  User,
  Edit3,
  History,
  Check,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { AppLanguage, CustomerRecord, PaymentRecord, UdhaarRecord } from '../types';
import { apiRequest } from '../lib/api';
import { localizeWorkflowStatus, tr } from '../i18n/translations';

interface UdhaarLedgerProps {
  language?: AppLanguage;
  customers: CustomerRecord[];
  records: UdhaarRecord[];
  payments: PaymentRecord[];
  onRefresh: () => void;
  onNotify: (msg: string) => void;
  onOpenInbox: () => void;
  onViewCustomer?: (customerId: string) => void;
  compactLanding?: boolean;
}

function getDaysOverdue(dueDateStr?: string): number {
  if (!dueDateStr) return 0;
  const due = new Date(dueDateStr);
  if (Number.isNaN(due.getTime())) return 0;
  const diff = Math.floor((Date.now() - due.getTime()) / 86400000);
  return Math.max(0, diff);
}

export const UdhaarLedger: React.FC<UdhaarLedgerProps> = ({
  language = 'en',
  customers,
  records,
  payments,
  onRefresh,
  onNotify,
  onOpenInbox,
  onViewCustomer,
  compactLanding = false,
}) => {
  const [settleModal, setSettleModal] = useState<{
    customerId: string;
    name: string;
    balance: number;
  } | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<'UPI' | 'Cash' | 'Bank'>('UPI');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newCustomerId, setNewCustomerId] = useState(customers[0]?.id || '');
  const [newAmount, setNewAmount] = useState(1000);
  const [newNotes, setNewNotes] = useState('Monthly store credit');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editingApproval, setEditingApproval] = useState<{ id: string; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    if (!settleModal && !addModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSettleModal(null);
        setAddModalOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [settleModal, addModalOpen]);

  const customersWithUdhaar = customers.filter((c) => Number(c.outstanding_udhaar) > 0);
  const filteredUdhaar = customersWithUdhaar.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.city.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q)
    );
  });
  const totalPending = customersWithUdhaar.reduce((s, c) => s + Number(c.outstanding_udhaar), 0);
  const totalCollected = payments.reduce((s, p) => s + Number(p.amount), 0);

  const openSettle = (c: CustomerRecord) => {
    setSettleModal({ customerId: c.id, name: c.name, balance: Number(c.outstanding_udhaar) });
    setPayAmount(Number(c.outstanding_udhaar));
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleModal || payAmount <= 0) return;
    setBusy(true);
    try {
      const res = await apiRequest<{ message: string }>(
        `/api/udhaar/${settleModal.customerId}/payment`,
        {
          method: 'POST',
          body: JSON.stringify({ amount: payAmount, method: payMethod }),
        }
      );
      onNotify(res.message);
      setSettleModal(null);
      onRefresh();
    } catch (err: unknown) {
      onNotify(
        err instanceof Error
          ? err.message
          : tr(language, 'Payment recording failed.', 'भुगतान दर्ज नहीं हो सका।')
      );
    } finally {
      setBusy(false);
    }
  };

  const handlePrepareReminder = async (customerId: string) => {
    setBusy(true);
    try {
      const res = await apiRequest<{ message: string }>(
        `/api/udhaar/${customerId}/prepare-reminder`,
        { method: 'POST' }
      );
      onNotify(res.message);
      onRefresh();
    } catch (err: unknown) {
      onNotify(
        err instanceof Error
          ? err.message
          : tr(language, 'Could not prepare reminder.', 'रिमाइंडर तैयार नहीं हो सका।')
      );
    } finally {
      setBusy(false);
    }
  };

  const handleSaveAndSendInline = async (approvalId: string, sendNow: boolean) => {
    if (!editingApproval) return;
    setBusy(true);
    try {
      await apiRequest(`/api/approvals/${approvalId}`, {
        method: 'PATCH',
        body: JSON.stringify({ suggestedMessage: editingApproval.text }),
      });
      if (sendNow) {
        const res = await apiRequest<{ message: string }>(`/api/approvals/${approvalId}/decision`, {
          method: 'POST',
          body: JSON.stringify({ decision: 'approve' }),
        });
        onNotify(res.message);
      } else {
        onNotify(tr(language, 'Reminder message saved.', 'रिमाइंडर संदेश सहेजा गया।'));
      }
      setEditingApproval(null);
      onRefresh();
    } catch (err: unknown) {
      onNotify(
        err instanceof Error
          ? err.message
          : tr(language, 'Could not update reminder.', 'रिमाइंडर अपडेट नहीं हो सका।')
      );
    } finally {
      setBusy(false);
    }
  };

  const handleAddUdhaar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerId || newAmount <= 0) return;
    setBusy(true);
    try {
      await apiRequest('/api/udhaar', {
        method: 'POST',
        body: JSON.stringify({ customerId: newCustomerId, amount: newAmount, notes: newNotes }),
      });
      onNotify(tr(language, 'Pending balance recorded.', 'बकाया राशि दर्ज हो गई।'));
      setAddModalOpen(false);
      onRefresh();
    } catch (err: unknown) {
      onNotify(
        err instanceof Error ? err.message : tr(language, 'Failed to add entry.', 'प्रविष्टि विफल रही।')
      );
    } finally {
      setBusy(false);
    }
  };

  const PAGE_SIZE = 6;
  const totalPages = Math.max(1, Math.ceil(filteredUdhaar.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const displayCustomers = compactLanding
    ? filteredUdhaar.slice(0, 3)
    : filteredUdhaar.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#0B1E40] border border-[#E2E8F0] dark:border-[#1E3A5F] rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-6 text-xs">
          <div>
            <div className="text-[#64748B] dark:text-[#94A3B8]">
              {tr(language, 'Pending Customer Payments', 'ग्राहकों पर कुल बकाया (उधार)')}
            </div>
            <div className="text-lg font-extrabold text-[#D97706] tabular-nums">
              ₹{totalPending.toLocaleString('en-IN')}
            </div>
          </div>
          <div>
            <div className="text-[#64748B] dark:text-[#94A3B8]">
              {tr(language, 'Payments Recorded', 'वसूली गई राशि')}
            </div>
            <div className="text-lg font-extrabold text-[#16A34A] tabular-nums">
              ₹{totalCollected.toLocaleString('en-IN')}
            </div>
          </div>
          <div>
            <div className="text-[#64748B] dark:text-[#94A3B8]">
              {tr(language, 'Customers With Balance', 'बकाया वाले ग्राहक')}
            </div>
            <div className="text-lg font-extrabold text-[#071A35] dark:text-white tabular-nums">
              {customersWithUdhaar.length}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!compactLanding && (
            <>
              <div className="relative min-w-[180px]">
                <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={tr(language, 'Search customer, city, phone...', 'ग्राहक, शहर या फोन खोजें...')}
                  className="h-9 pl-8 pr-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#061533] text-xs text-[#071A35] dark:text-white"
                />
              </div>
              <button
                onClick={() => setHistoryOpen((v) => !v)}
                className="h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <History className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#22D3EE]" />
                <span>
                  {historyOpen
                    ? tr(language, 'Hide History', 'इतिहास छिपाएं')
                    : `${tr(language, 'Payment History', 'भुगतान इतिहास')} (${payments.length})`}
                </span>
              </button>
            </>
          )}
          <button
            onClick={() => {
              setNewCustomerId(customers[0]?.id || '');
              setAddModalOpen(true);
            }}
            disabled={customers.length === 0}
            className="h-9 px-3.5 rounded-lg bg-[#2563EB] hover:bg-[#071A35] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{tr(language, 'Add Credit Balance', 'उधार जोड़ें')}</span>
          </button>
        </div>
      </div>

      {historyOpen && !compactLanding && (
        <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#1E3A5F] bg-white dark:bg-[#0B1E40] p-4 space-y-2">
          <h4 className="text-xs font-extrabold text-[#071A35] dark:text-white">
            {tr(language, 'Recent Recorded Payments', 'हाल ही में प्राप्त भुगतान')}
          </h4>
          {payments.length === 0 ? (
            <p className="text-xs text-[#64748B]">
              {tr(language, 'No payments recorded yet.', 'अभी कोई भुगतान दर्ज नहीं है।')}
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
              {payments.slice(0, 9).map((p) => (
                <div
                  key={p.id}
                  className="p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#061533] flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-[#071A35] dark:text-white truncate">
                      {p.customer_name}
                    </div>
                    <div className="text-[11px] text-[#64748B]">
                      {p.method} · {p.paid_at.slice(0, 10)}
                    </div>
                  </div>
                  <div className="font-extrabold text-[#16A34A] tabular-nums shrink-0">
                    ₹{Number(p.amount).toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {displayCustomers.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-[#CBD5E1] dark:border-[#1E3A5F] text-center text-sm text-[#64748B]">
          {tr(
            language,
            'All customer credit balances are settled right now.',
            'अभी किसी भी ग्राहक पर कोई उधार बकाया नहीं है।'
          )}
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 gap-4">
          {displayCustomers.map((c) => {
            const matchingRecord = records.find((r) => r.customer_id === c.id && r.remaining_amount > 0);
            const dueDate = c.udhaar_due_date || matchingRecord?.due_date || '';
            const overdueDays = getDaysOverdue(dueDate);
            const followupStatus = matchingRecord?.latest_followup_status;
            const followupId = matchingRecord?.latest_followup_id;
            const followupMsg = matchingRecord?.latest_followup_message;
            const isEditingThis = Boolean(followupId && editingApproval?.id === followupId);

            return (
              <div
                key={c.id}
                className="rounded-2xl border border-[#E2E8F0] dark:border-[#1E3A5F] bg-white dark:bg-[#0B1E40] p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-base font-extrabold text-[#071A35] dark:text-white">{c.name}</h4>
                      <div className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                        {c.city} · {c.phone}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-extrabold text-[#D97706] tabular-nums flex items-center justify-end">
                        <IndianRupee className="w-4 h-4" />
                        {Number(c.outstanding_udhaar).toLocaleString('en-IN')}
                      </div>
                      <div
                        className={`text-[11px] font-bold ${
                          overdueDays > 0 ? 'text-[#DC2626]' : 'text-[#64748B]'
                        }`}
                      >
                        {overdueDays > 0
                          ? `${overdueDays} ${tr(language, 'days overdue', 'दिन से बकाया')}`
                          : dueDate
                          ? `${tr(language, 'Due', 'देय')} ${dueDate}`
                          : tr(language, 'Scheduled', 'नियोजित')}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#061533]">
                      <div className="text-[#64748B]">
                        {tr(language, 'Previous Payment', 'पिछला भुगतान')}
                      </div>
                      <div className="font-bold text-[#071A35] dark:text-white tabular-nums mt-0.5">
                        {matchingRecord?.last_payment_amount
                          ? `₹${Number(matchingRecord.last_payment_amount).toLocaleString(
                              'en-IN'
                            )} (${String(matchingRecord.last_payment_date || '').slice(0, 10)})`
                          : tr(language, 'No prior payment', 'कोई पिछला भुगतान नहीं')}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#061533]">
                      <div className="text-[#64748B]">
                        {tr(language, 'Follow-up Status', 'फॉलो-अप स्थिति')}
                      </div>
                      <div className="font-bold text-[#2563EB] dark:text-[#22D3EE] mt-0.5">
                        {followupStatus
                          ? localizeWorkflowStatus(language, followupStatus)
                          : tr(language, 'Not prepared yet', 'अभी तैयार नहीं')}
                      </div>
                    </div>
                  </div>

                  {isEditingThis && followupId && (
                    <div className="space-y-2 p-3 rounded-xl bg-[#EFF6FF] dark:bg-[#061533] border border-[#BFDBFE] dark:border-[#1E3A5F]">
                      <textarea
                        rows={3}
                        value={editingApproval!.text}
                        onChange={(e) =>
                          setEditingApproval({ id: followupId, text: e.target.value })
                        }
                        className="w-full rounded-lg border border-[#2563EB] bg-white dark:bg-[#0B1E40] p-2.5 text-xs"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          disabled={busy}
                          onClick={() => handleSaveAndSendInline(followupId, true)}
                          className="h-8 px-3 rounded-lg bg-[#2563EB] text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{tr(language, 'Save & Approve Send', 'सहेजें और भेजें')}</span>
                        </button>
                        <button
                          disabled={busy}
                          onClick={() => handleSaveAndSendInline(followupId, false)}
                          className="h-8 px-3 rounded-lg border border-[#CBD5E1] text-xs font-semibold cursor-pointer"
                        >
                          {tr(language, 'Save Draft Only', 'सिर्फ ड्राफ्ट सहेजें')}
                        </button>
                        <button
                          onClick={() => setEditingApproval(null)}
                          className="h-8 px-2 text-xs text-[#64748B] cursor-pointer"
                        >
                          {tr(language, 'Cancel', 'रद्द करें')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E2E8F0] dark:border-[#1E3A5F]">
                  <div className="flex flex-wrap items-center gap-2">
                    {followupStatus === 'pending_approval' && followupId ? (
                      <>
                        <button
                          disabled={busy}
                          onClick={() =>
                            setEditingApproval({ id: followupId, text: followupMsg || '' })
                          }
                          className="h-9 px-3 rounded-lg bg-[#2563EB] hover:bg-[#071A35] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>{tr(language, 'Edit & Approve', 'बदलें व मंजूर करें')}</span>
                        </button>
                        <button
                          onClick={onOpenInbox}
                          className="h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] text-xs font-bold cursor-pointer"
                        >
                          {tr(language, 'Open Action Center', 'मंजूरी केंद्र खोलें')}
                        </button>
                      </>
                    ) : (
                      <button
                        disabled={busy || c.opted_out === 1}
                        onClick={() => handlePrepareReminder(c.id)}
                        className="h-9 px-3.5 rounded-lg bg-[#2563EB] hover:bg-[#071A35] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{tr(language, 'Prepare Reminder', 'रिमाइंडर तैयार करें')}</span>
                      </button>
                    )}

                    <button
                      disabled={busy}
                      onClick={() => openSettle(c)}
                      className="h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] hover:border-[#16A34A] text-xs font-bold text-[#071A35] dark:text-white flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                      <span>{tr(language, 'Record Payment', 'भुगतान दर्ज करें')}</span>
                    </button>
                  </div>

                  {onViewCustomer && (
                    <button
                      onClick={() => onViewCustomer(c.id)}
                      className="text-xs font-bold text-[#2563EB] dark:text-[#22D3EE] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>{tr(language, 'View Customer', 'ग्राहक देखें')}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {!compactLanding && totalPages > 1 && (
          <div className="flex items-center justify-between text-xs text-[#64748B] pt-1">
            <span className="tabular-nums">
              {tr(language, 'Page', 'पृष्ठ')} {safePage} / {totalPages} · {filteredUdhaar.length}{' '}
              {tr(language, 'accounts', 'खाते')}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-8 px-2.5 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#0B1E40] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>{tr(language, 'Prev', 'पिछला')}</span>
              </button>
              <button
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 px-2.5 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#0B1E40] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-40"
              >
                <span>{tr(language, 'Next', 'अगला')}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
        </>
      )}

      {settleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#0B1E40] border border-[#CBD5E1] dark:border-[#1E3A5F] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-[#071A35] dark:text-white">
                {tr(language, 'Record Payment', 'भुगतान दर्ज करें')} · {settleModal.name}
              </h3>
              <button onClick={() => setSettleModal(null)} className="p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">
                  {tr(language, 'Amount Received', 'प्राप्त राशि')} (
                  {tr(language, 'Pending', 'बाकी')}: ₹{settleModal.balance.toLocaleString('en-IN')})
                </label>
                <input
                  type="number"
                  min={1}
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#061533]"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">
                  {tr(language, 'Payment Method', 'भुगतान माध्यम')}
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as typeof payMethod)}
                  className="w-full h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#061533]"
                >
                  <option value="UPI">UPI / Paytm</option>
                  <option value="Cash">{tr(language, 'Cash', 'नकद')}</option>
                  <option value="Bank">{tr(language, 'Bank Transfer', 'बैंक ट्रांसफर')}</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={busy}
                className="w-full h-10 rounded-lg bg-[#16A34A] text-white font-bold cursor-pointer disabled:opacity-50"
              >
                {busy
                  ? tr(language, 'Recording...', 'दर्ज हो रहा है...')
                  : tr(language, 'Confirm Payment Received', 'भुगतान की पुष्टि करें')}
              </button>
            </form>
          </div>
        </div>
      )}

      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#0B1E40] border border-[#CBD5E1] dark:border-[#1E3A5F] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-[#071A35] dark:text-white">
                {tr(language, 'Add Pending Balance', 'नया उधार जोड़ें')}
              </h3>
              <button onClick={() => setAddModalOpen(false)} className="p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddUdhaar} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">
                  {tr(language, 'Customer', 'ग्राहक')}
                </label>
                <select
                  value={newCustomerId}
                  onChange={(e) => setNewCustomerId(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#061533]"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.city})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">
                  {tr(language, 'Amount (₹)', 'राशि (₹)')}
                </label>
                <input
                  type="number"
                  min={1}
                  value={newAmount}
                  onChange={(e) => setNewAmount(Number(e.target.value))}
                  className="w-full h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#061533]"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">
                  {tr(language, 'Notes', 'टिप्पणी')}
                </label>
                <input
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#061533]"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="w-full h-10 rounded-lg bg-[#2563EB] text-white font-bold cursor-pointer"
              >
                {tr(language, 'Save Balance', 'उधार सहेजें')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
