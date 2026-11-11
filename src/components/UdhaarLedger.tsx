import React, { useState } from 'react';
import {
  BookOpen,
  Send,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  Phone,
  ArrowRight,
} from 'lucide-react';
import { Customer } from '../types';

interface UdhaarLedgerProps {
  customers: Customer[];
  onRecordPayment: (customerId: string, amount: number) => void;
  onSendReminder: (customerName: string, amount: number) => void;
}

export const UdhaarLedger: React.FC<UdhaarLedgerProps> = ({
  customers,
  onRecordPayment,
  onSendReminder,
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(1000);
  const [reminderSentMap, setReminderSentMap] = useState<Record<string, string>>({});

  // Filter customers with udhaar
  const udhaarCustomers = customers.filter((c) => c.outstandingUdhaar > 0);
  const totalOutstanding = udhaarCustomers.reduce((acc, c) => acc + c.outstandingUdhaar, 0);

  const handleTriggerReminder = (cust: Customer) => {
    onSendReminder(cust.name, cust.outstandingUdhaar);
    setReminderSentMap((prev) => ({
      ...prev,
      [cust.id]: 'Gentle WhatsApp Sent Just Now',
    }));
  };

  const handleSettle = (customerId: string) => {
    onRecordPayment(customerId, paymentAmount);
    setSelectedCustomerId(null);
  };

  return (
    <div className="space-y-6">
      {/* Title & Introduction */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#555C57] dark:text-[#9DA49F] mb-1">
            <span>Digital Ledger & Khata</span>
            <span>·</span>
            <span className="font-semibold text-[#0F2E22] dark:text-[#34D399]">Courteous Payment Recovery</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-[#141B18] dark:text-[#F0F3F1]">
            Udhaar & Credit Collections
          </h2>
          <p className="text-sm text-[#555C57] dark:text-[#9DA49F] mt-0.5">
            Automate polite payment reminders that preserve relationships while accelerating cashflow into your bank account.
          </p>
        </div>
      </div>

      {/* KPI Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#161C19] rounded-xl border border-[#EAE8E1] dark:border-[#232B26] p-4 shadow-xs transition-colors">
          <div className="text-xs text-[#6B726C] dark:text-[#8C948F] font-medium">Total Active Udhaar Tracked</div>
          <div className="text-2xl font-bold text-[#141B18] dark:text-[#F0F3F1] font-mono tabular-nums mt-1">
            ₹{totalOutstanding.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-[#555C57] dark:text-[#9DA49F] mt-0.5">
            Across {udhaarCustomers.length} valued regular customers
          </div>
        </div>

        <div className="bg-white dark:bg-[#161C19] rounded-xl border border-[#EAE8E1] dark:border-[#232B26] p-4 shadow-xs transition-colors">
          <div className="text-xs text-[#6B726C] dark:text-[#8C948F] font-medium">Collected This Month</div>
          <div className="text-2xl font-bold text-[#059669] dark:text-[#34D399] font-mono tabular-nums mt-1">
            ₹64,200
          </div>
          <div className="text-[11px] text-[#059669] dark:text-[#34D399] mt-0.5">71.8% on-time recovery rate</div>
        </div>

        <div className="bg-white dark:bg-[#161C19] rounded-xl border border-[#EAE8E1] dark:border-[#232B26] p-4 shadow-xs transition-colors">
          <div className="text-xs text-[#6B726C] dark:text-[#8C948F] font-medium">Average Days to Collect</div>
          <div className="text-2xl font-bold text-[#0F2E22] dark:text-[#34D399] font-mono tabular-nums mt-1">
            5.2 Days
          </div>
          <div className="text-[11px] text-[#555C57] dark:text-[#9DA49F] mt-0.5">Down from 18 days manual follow-up</div>
        </div>
      </div>

      {/* Udhaar Ledger Table */}
      <div className="bg-white dark:bg-[#161C19] rounded-2xl border border-[#EAE8E1] dark:border-[#232B26] overflow-hidden shadow-xs transition-colors">
        <div className="p-4 border-b border-[#EAE8E1] dark:border-[#232B26] bg-[#FAF9F5] dark:bg-[#1A221E] flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#141B18] dark:text-[#F0F3F1]">
            Customer Khata Accounts
          </h3>
          <span className="text-xs text-[#555C57] dark:text-[#9DA49F] font-mono">
            Source of Truth: Merchant Khata API
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#FAF9F5] dark:bg-[#1A221E] border-b border-[#EAE8E1] dark:border-[#232B26] text-[#6B726C] dark:text-[#8C948F] font-semibold">
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-right">Balance Pending</th>
                <th className="py-3 px-4">Status & Aging</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2F0E8] dark:divide-[#232B26] text-[#2D332F] dark:text-[#D1D7D3]">
              {udhaarCustomers.map((cust) => {
                const reminderStatus = reminderSentMap[cust.id];

                return (
                  <tr key={cust.id} className="hover:bg-[#FAF9F5] dark:hover:bg-[#1B2420] transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#141B18] dark:text-[#F0F3F1]">{cust.name}</div>
                      <div className="text-[11px] text-[#555C57] dark:text-[#9DA49F]">{cust.city}</div>
                    </td>

                    <td className="py-3 px-4 font-mono text-[#555C57] dark:text-[#9DA49F]">
                      {cust.phone}
                    </td>

                    <td className="py-3 px-4 font-mono tabular-nums text-[#2D332F] dark:text-[#D1D7D3]">
                      {cust.udhaarDueDate || '2026-11-15'}
                    </td>

                    <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-[#B91C1C] dark:text-[#F87171]">
                      ₹{cust.outstandingUdhaar.toLocaleString('en-IN')}
                    </td>

                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#DC2626] dark:text-[#F87171]">
                        <Clock className="w-3 h-3" /> Overdue (7 days)
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right space-x-2">
                      {reminderStatus ? (
                        <span className="inline-flex items-center gap-1 text-xs text-[#065F46] dark:text-[#34D399] font-medium mr-2">
                          <CheckCircle2 className="w-3 h-3" /> {reminderStatus}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleTriggerReminder(cust)}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-[#0F2E22] dark:bg-[#1E4D3B] hover:bg-[#1A4535] dark:hover:bg-[#28634C] rounded-lg transition-colors inline-flex items-center gap-1"
                        >
                          <Send className="w-3 h-3 text-[#34D399]" />
                          <span>Send Nudge</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setSelectedCustomerId(cust.id);
                          setPaymentAmount(cust.outstandingUdhaar);
                        }}
                        className="px-2.5 py-1.5 text-xs font-medium text-[#0F2E22] dark:text-[#E8F5E9] bg-[#FAF9F5] dark:bg-[#1A221E] border border-[#DDD9CF] dark:border-[#28322C] hover:bg-[#EAE8DF] dark:hover:bg-[#25302A] rounded-lg transition-colors"
                      >
                        Record Payment
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {selectedCustomerId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#161C19] rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl border border-[#EAE8E1] dark:border-[#232B26] transition-colors">
            <h3 className="text-base font-bold text-[#141B18] dark:text-[#F0F3F1]">
              Record Payment Received
            </h3>
            <p className="text-xs text-[#555C57] dark:text-[#9DA49F]">
              Enter the amount collected via cash, UPI, or bank transfer.
            </p>

            <div>
              <label className="text-xs font-medium text-[#4A504B] dark:text-[#A7AFA9] block mb-1">
                Amount (₹)
              </label>
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                className="w-full p-2.5 text-sm font-mono tabular-nums rounded-lg border border-[#DDD9CF] dark:border-[#2D3932] bg-white dark:bg-[#1A241F] text-[#141B18] dark:text-[#E8ECE9] focus:outline-none focus:ring-1 focus:ring-[#0F2E22] dark:focus:ring-[#34D399]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedCustomerId(null)}
                className="px-4 py-2 text-xs text-[#555C57] dark:text-[#9DA49F] hover:text-[#141B18] dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSettle(selectedCustomerId)}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#0F2E22] dark:bg-[#1E4D3B] hover:bg-[#1A4535] dark:hover:bg-[#28634C] rounded-lg transition-colors"
              >
                Confirm & Settle Khata
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
