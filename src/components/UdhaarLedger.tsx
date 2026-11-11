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
  QrCode,
  Receipt,
  X,
  FileText,
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
  const [statementCustomer, setStatementCustomer] = useState<Customer | null>(null);

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
          <div className="flex items-center gap-2 text-xs text-[#64748B] dark:text-[#94A3B8] mb-1">
            <span>Digital Ledger & Khata</span>
            <span>·</span>
            <span className="font-semibold text-[#0284C7] dark:text-[#38BDF8]">Courteous Payment Recovery</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
            Udhaar & Credit Collections
          </h2>
          <p className="text-sm text-[#475569] dark:text-[#94A3B8] mt-0.5">
            Automate polite payment reminders that preserve relationships while accelerating cashflow into your bank account.
          </p>
        </div>
      </div>

      {/* KPI Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#132238] rounded-xl border border-[#E2E8F0] dark:border-[#1E3A5F] p-4 shadow-xs transition-colors">
          <div className="text-xs text-[#64748B] dark:text-[#94A3B8] font-medium">Total Active Udhaar Tracked</div>
          <div className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] font-mono tabular-nums mt-1">
            ₹{totalOutstanding.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
            Across {udhaarCustomers.length} valued regular customers
          </div>
        </div>

        <div className="bg-white dark:bg-[#132238] rounded-xl border border-[#E2E8F0] dark:border-[#1E3A5F] p-4 shadow-xs transition-colors">
          <div className="text-xs text-[#64748B] dark:text-[#94A3B8] font-medium">Collected This Month</div>
          <div className="text-2xl font-bold text-[#0284C7] dark:text-[#38BDF8] font-mono tabular-nums mt-1">
            ₹64,200
          </div>
          <div className="text-[11px] text-[#0284C7] dark:text-[#38BDF8] mt-0.5">71.8% on-time recovery rate</div>
        </div>

        <div className="bg-white dark:bg-[#132238] rounded-xl border border-[#E2E8F0] dark:border-[#1E3A5F] p-4 shadow-xs transition-colors">
          <div className="text-xs text-[#64748B] dark:text-[#94A3B8] font-medium">Average Days to Collect</div>
          <div className="text-2xl font-bold text-[#0284C7] dark:text-[#38BDF8] font-mono tabular-nums mt-1">
            5.2 Days
          </div>
          <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">Down from 18 days manual follow-up</div>
        </div>
      </div>

      {/* Mobile Card Stack View (<768px) - Fixes Mobile Table Density */}
      <div className="block md:hidden space-y-3">
        {udhaarCustomers.map((cust) => {
          const reminderStatus = reminderSentMap[cust.id];

          return (
            <div
              key={cust.id}
              className="p-4 bg-white dark:bg-[#132238] rounded-xl border border-[#E2E8F0] dark:border-[#1E3A5F] shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold text-sm text-[#0F172A] dark:text-[#F8FAFC]">
                    {cust.name}
                  </div>
                  <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                    {cust.city} · {cust.phone}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold font-mono text-[#DC2626] dark:text-[#F87171]">
                    ₹{cust.outstandingUdhaar.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-[#DC2626] dark:text-[#F87171] font-medium">
                    Overdue
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#F1F5F9] dark:border-[#1E3A5F]">
                <button
                  onClick={() => setStatementCustomer(cust)}
                  className="text-xs text-[#0284C7] dark:text-[#38BDF8] hover:underline flex items-center gap-1 font-medium cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Statement</span>
                </button>

                <div className="flex items-center gap-2">
                  {reminderStatus ? (
                    <span className="text-[11px] text-[#0284C7] dark:text-[#38BDF8] font-medium">
                      ✓ Sent
                    </span>
                  ) : (
                    <button
                      onClick={() => handleTriggerReminder(cust)}
                      className="px-2.5 py-1.5 text-xs font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg transition-colors cursor-pointer"
                    >
                      Nudge
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSelectedCustomerId(cust.id);
                      setPaymentAmount(cust.outstandingUdhaar);
                    }}
                    className="px-2.5 py-1.5 text-xs font-medium text-[#0F172A] dark:text-[#F8FAFC] bg-white dark:bg-[#1B2E4B] border border-[#CBD5E1] dark:border-[#1E3A5F] rounded-lg cursor-pointer"
                  >
                    Pay
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Udhaar Ledger Table (hidden on mobile, visible md:table) */}
      <div className="hidden md:block bg-white dark:bg-[#132238] rounded-2xl border border-[#E2E8F0] dark:border-[#1E3A5F] overflow-hidden shadow-xs transition-colors">
        <div className="p-4 border-b border-[#E2E8F0] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#0F1A2C] flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
            Customer Khata Accounts
          </h3>
          <span className="text-xs text-[#0284C7] dark:text-[#38BDF8] font-mono">
            Source of Truth: Merchant Khata API
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F8FAFC] dark:bg-[#0F1A2C] border-b border-[#E2E8F0] dark:border-[#1E3A5F] text-[#64748B] dark:text-[#94A3B8] font-semibold">
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-right">Balance Pending</th>
                <th className="py-3 px-4">Status & Aging</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] dark:divide-[#1E3A5F] text-[#334155] dark:text-[#CBD5E1]">
              {udhaarCustomers.map((cust) => {
                const reminderStatus = reminderSentMap[cust.id];

                return (
                  <tr key={cust.id} className="hover:bg-[#F0F9FF] dark:hover:bg-[#1A2E4C] transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#0F172A] dark:text-[#F8FAFC]">{cust.name}</div>
                      <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">{cust.city}</div>
                    </td>

                    <td className="py-3 px-4 font-mono text-[#64748B] dark:text-[#94A3B8]">
                      {cust.phone}
                    </td>

                    <td className="py-3 px-4 font-mono tabular-nums text-[#334155] dark:text-[#CBD5E1]">
                      {cust.udhaarDueDate || '2026-11-15'}
                    </td>

                    <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-[#DC2626] dark:text-[#F87171]">
                      ₹{cust.outstandingUdhaar.toLocaleString('en-IN')}
                    </td>

                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#DC2626] dark:text-[#F87171]">
                        <Clock className="w-3 h-3" /> Overdue (7 days)
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => setStatementCustomer(cust)}
                        className="px-2.5 py-1.5 text-xs font-medium text-[#0284C7] dark:text-[#38BDF8] hover:bg-[#E0F2FE] dark:hover:bg-[#1E3A5F] rounded-lg transition-colors cursor-pointer"
                      >
                        Statement
                      </button>

                      {reminderStatus ? (
                        <span className="inline-flex items-center gap-1 text-xs text-[#0284C7] dark:text-[#38BDF8] font-medium mr-2">
                          <CheckCircle2 className="w-3 h-3" /> {reminderStatus}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleTriggerReminder(cust)}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg transition-colors inline-flex items-center gap-1 shadow-sm shadow-[#0284C7]/20 cursor-pointer"
                        >
                          <Send className="w-3 h-3 text-[#BAE6FD]" />
                          <span>Send Nudge</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setSelectedCustomerId(cust.id);
                          setPaymentAmount(cust.outstandingUdhaar);
                        }}
                        className="px-2.5 py-1.5 text-xs font-medium text-[#0F172A] dark:text-[#F8FAFC] bg-white dark:bg-[#1B2E4B] border border-[#CBD5E1] dark:border-[#1E3A5F] hover:bg-[#F8FAFC] dark:hover:bg-[#233857] rounded-lg transition-colors cursor-pointer"
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

      {/* Dynamic Khata Statement & UPI QR Modal */}
      {statementCustomer && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#132238] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#BAE6FD] dark:border-[#1E3A5F] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#1E3A5F]">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#0284C7] dark:text-[#38BDF8]" />
                <h3 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                  Khata Account Statement
                </h3>
              </div>
              <button
                onClick={() => setStatementCustomer(null)}
                className="p-1.5 text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#0F1A2C] border border-[#E2E8F0] dark:border-[#1E3A5F] space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#64748B] dark:text-[#94A3B8]">Customer:</span>
                <span className="font-bold text-[#0F172A] dark:text-[#F8FAFC]">{statementCustomer.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B] dark:text-[#94A3B8]">Phone:</span>
                <span className="font-mono text-[#0F172A] dark:text-[#F8FAFC]">{statementCustomer.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B] dark:text-[#94A3B8]">Due Date:</span>
                <span className="font-mono text-[#0F172A] dark:text-[#F8FAFC]">{statementCustomer.udhaarDueDate}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-[#E2E8F0] dark:border-[#1E3A5F] font-bold">
                <span className="text-[#0F172A] dark:text-[#F8FAFC]">Outstanding Balance:</span>
                <span className="text-[#DC2626] dark:text-[#F87171] font-mono text-sm">₹{statementCustomer.outstandingUdhaar.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Simulated UPI QR Code */}
            <div className="text-center p-4 bg-[#F0F9FF] dark:bg-[#0C243B] rounded-xl border border-[#BAE6FD] dark:border-[#1E3A5F] space-y-2">
              <div className="w-24 h-24 mx-auto bg-white p-2 rounded-lg shadow-xs flex items-center justify-center">
                <QrCode className="w-20 h-20 text-[#0284C7]" />
              </div>
              <div className="text-xs font-bold text-[#0284C7] dark:text-[#38BDF8]">
                Scan to Settle Khata via BHIM / GPay / PhonePe
              </div>
              <div className="text-[10px] font-mono text-[#64748B] dark:text-[#94A3B8]">
                upi://pay?pa=sellvion.merchant@okaxis&am={statementCustomer.outstandingUdhaar}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E8F0] dark:border-[#1E3A5F]">
              <button
                onClick={() => setStatementCustomer(null)}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-xl transition-colors cursor-pointer"
              >
                Close Statement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {selectedCustomerId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#132238] rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl border border-[#BAE6FD] dark:border-[#1E3A5F] transition-colors">
            <h3 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              Record Payment Received
            </h3>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              Enter the amount collected via cash, UPI, or bank transfer.
            </p>

            <div>
              <label className="text-xs font-medium text-[#475569] dark:text-[#CBD5E1] block mb-1">
                Amount (₹)
              </label>
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                className="w-full p-2.5 text-sm font-mono tabular-nums rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#0F1A2C] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-1 focus:ring-[#0284C7] dark:focus:ring-[#38BDF8]"
              />
            </div>

            {/* Quick Settle Preset Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const cust = udhaarCustomers.find((c) => c.id === selectedCustomerId);
                  if (cust) setPaymentAmount(cust.outstandingUdhaar);
                }}
                className="text-[11px] px-2.5 py-1 bg-[#F0F9FF] dark:bg-[#0C243B] text-[#0284C7] dark:text-[#38BDF8] rounded border border-[#BAE6FD] dark:border-[#1E3A5F] font-semibold cursor-pointer"
              >
                Full Settle
              </button>
              <button
                type="button"
                onClick={() => {
                  const cust = udhaarCustomers.find((c) => c.id === selectedCustomerId);
                  if (cust) setPaymentAmount(Math.round(cust.outstandingUdhaar / 2));
                }}
                className="text-[11px] px-2.5 py-1 bg-[#F8FAFC] dark:bg-[#132238] text-[#475569] dark:text-[#CBD5E1] rounded border border-[#E2E8F0] dark:border-[#1E3A5F] font-medium cursor-pointer"
              >
                50% Partial
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedCustomerId(null)}
                className="px-4 py-2 text-xs text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSettle(selectedCustomerId)}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg transition-colors cursor-pointer shadow-sm shadow-[#0284C7]/20"
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
