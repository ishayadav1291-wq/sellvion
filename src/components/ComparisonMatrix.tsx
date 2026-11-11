import React, { useState } from 'react';
import { Check, X, Minus, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { COMPARISON_DATA } from '../data/mockData';

export const ComparisonMatrix: React.FC = () => {
  const [selectedPlan, setSelectedPlan] = useState<{
    name: string;
    price: string;
    description: string;
  } | null>(null);

  const [storeUrl, setStoreUrl] = useState('');
  const [isActivated, setIsActivated] = useState(false);

  const handleOpenPlan = (name: string, price: string, description: string) => {
    setSelectedPlan({ name, price, description });
    setIsActivated(false);
  };

  const handleConfirmPlan = (e: React.FormEvent) => {
    e.preventDefault();
    setIsActivated(true);
  };

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2 text-xs text-[#64748B] dark:text-[#94A3B8] mb-1">
          <span>Market Positioning</span>
          <span>·</span>
          <span className="font-semibold text-[#0284C7] dark:text-[#38BDF8]">One Unified Autonomous Teammate</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
          How SELLVION Compares
        </h2>
        <p className="text-sm text-[#475569] dark:text-[#94A3B8] mt-0.5">
          Instead of stitching together a separate billing ledger, a WhatsApp broadcast tool, and a COD plugin, SELLVION acts as one autonomous AI employee connecting all three.
        </p>
      </div>

      {/* Comparison Table */}
      <div className="bg-white dark:bg-[#132238] rounded-2xl border border-[#E2E8F0] dark:border-[#1E3A5F] overflow-hidden shadow-xs transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F8FAFC] dark:bg-[#0F1A2C] border-b border-[#E2E8F0] dark:border-[#1E3A5F] text-[#64748B] dark:text-[#94A3B8] font-semibold">
                <th className="py-4 px-4 w-1/3">Capability</th>
                <th className="py-4 px-3 text-center">Khatabook / myBillBook</th>
                <th className="py-4 px-3 text-center">AiSensy / WATI</th>
                <th className="py-4 px-3 text-center">Shiprocket / GoKwik</th>
                <th className="py-4 px-4 text-center bg-[#0284C7] text-white font-bold">
                  SELLVION
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] dark:divide-[#1E3A5F] text-[#334155] dark:text-[#CBD5E1]">
              {COMPARISON_DATA.map((row, idx) => (
                <tr key={idx} className="hover:bg-[#F0F9FF] dark:hover:bg-[#1A2E4C] transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-[#0F172A] dark:text-[#F8FAFC]">{row.capability}</div>
                    <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">{row.detail}</div>
                  </td>

                  <td className="py-3.5 px-3 text-center font-medium text-[#64748B] dark:text-[#94A3B8]">
                    {row.khatabook}
                  </td>

                  <td className="py-3.5 px-3 text-center font-medium text-[#64748B] dark:text-[#94A3B8]">
                    {row.aisensy}
                  </td>

                  <td className="py-3.5 px-3 text-center font-medium text-[#64748B] dark:text-[#94A3B8]">
                    {row.shiprocket}
                  </td>

                  <td className="py-3.5 px-4 text-center font-bold text-[#0284C7] dark:text-[#38BDF8] bg-[#F0F9FF] dark:bg-[#0C243B]">
                    {row.sellvion}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transparent Pricing Cards (From Page 4 of PDF) */}
      <div>
        <div className="text-center max-w-xl mx-auto mb-6">
          <h3 className="text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">
            Accessible, Transparent Pricing for Indian Merchants
          </h3>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">
            Predictable monthly subscriptions with zero hidden commissions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-[#132238] rounded-xl border border-[#E2E8F0] dark:border-[#1E3A5F] p-5 shadow-xs flex flex-col justify-between transition-colors">
            <div>
              <div className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider">
                Starter
              </div>
              <div className="text-2xl font-bold font-mono text-[#0F172A] dark:text-[#F8FAFC] mt-2">
                Free
              </div>
              <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-1">
                For merchants starting digital record keeping.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-[#334155] dark:text-[#CBD5E1]">
                <li className="flex items-center gap-1.5">✓ Basic customer 360 profiles</li>
                <li className="flex items-center gap-1.5">✓ Up to 100 customer records</li>
                <li className="flex items-center gap-1.5">✓ Manual WhatsApp links</li>
              </ul>
            </div>
            <button
              onClick={() => handleOpenPlan('Starter', 'Free Forever', 'Includes basic Customer 360 & manual WhatsApp links.')}
              className="mt-6 w-full py-2 text-xs font-medium border border-[#CBD5E1] dark:border-[#1E3A5F] text-[#0F172A] dark:text-[#F8FAFC] rounded-lg hover:bg-[#F8FAFC] dark:hover:bg-[#1B2E4B] transition-colors cursor-pointer"
            >
              Get Started Free
            </button>
          </div>

          <div className="bg-white dark:bg-[#132238] rounded-xl border border-[#E2E8F0] dark:border-[#1E3A5F] p-5 shadow-xs flex flex-col justify-between transition-colors">
            <div>
              <div className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider">
                Growth
              </div>
              <div className="text-2xl font-bold font-mono text-[#0F172A] dark:text-[#F8FAFC] mt-2">
                ₹299 <span className="text-xs font-normal text-[#64748B] dark:text-[#94A3B8]">/ month</span>
              </div>
              <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-1">
                For growing stores scaling repeat orders.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-[#334155] dark:text-[#CBD5E1]">
                <li className="flex items-center gap-1.5">✓ Predictive reorder alerts</li>
                <li className="flex items-center gap-1.5">✓ Basic COD risk scoring</li>
                <li className="flex items-center gap-1.5">✓ Udhaar tracking & reminders</li>
                <li className="flex items-center gap-1.5">✓ Up to 1,000 customers</li>
              </ul>
            </div>
            <button
              onClick={() => handleOpenPlan('Growth', '₹299 / month', 'Ideal for growing brands with up to 1,000 customer records.')}
              className="mt-6 w-full py-2 text-xs font-medium border border-[#CBD5E1] dark:border-[#1E3A5F] text-[#0F172A] dark:text-[#F8FAFC] rounded-lg hover:bg-[#F8FAFC] dark:hover:bg-[#1B2E4B] transition-colors cursor-pointer"
            >
              Start Growth Trial
            </button>
          </div>

          <div className="bg-gradient-to-b from-[#0284C7] to-[#0369A1] text-white rounded-xl p-5 shadow-lg shadow-[#0284C7]/20 flex flex-col justify-between relative ring-2 ring-[#38BDF8] transition-colors">
            <div>
              <div className="text-xs font-bold text-[#BAE6FD] uppercase tracking-wider flex items-center justify-between">
                <span>Pro (Most Popular)</span>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded text-white font-semibold">Best Value</span>
              </div>
              <div className="text-2xl font-bold font-mono text-white mt-2">
                ₹799 <span className="text-xs font-normal text-[#BAE6FD]">/ month</span>
              </div>
              <p className="text-[11px] text-[#E0F2FE] mt-1">
                Full autonomous AI employee with earned autonomy.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-[#F0F9FF]">
                <li className="flex items-center gap-1.5">✓ Multi-agent orchestration</li>
                <li className="flex items-center gap-1.5">✓ Earned autonomy state machine</li>
                <li className="flex items-center gap-1.5">✓ Hinglish WhatsApp drafting</li>
                <li className="flex items-center gap-1.5">✓ Holdout incremental revenue lift</li>
                <li className="flex items-center gap-1.5">✓ Priority WhatsApp API sync</li>
              </ul>
            </div>
            <button
              onClick={() => handleOpenPlan('Pro (Full AI Employee)', '₹799 / month', 'Complete earned autonomy, multi-agent orchestration, and holdout incrementality.')}
              className="mt-6 w-full py-2 text-xs font-semibold bg-white hover:bg-[#F0F9FF] text-[#0284C7] rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              Activate Pro Plan
            </button>
          </div>

          <div className="bg-white dark:bg-[#132238] rounded-xl border border-[#E2E8F0] dark:border-[#1E3A5F] p-5 shadow-xs flex flex-col justify-between transition-colors">
            <div>
              <div className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider">
                Enterprise
              </div>
              <div className="text-2xl font-bold font-mono text-[#0F172A] dark:text-[#F8FAFC] mt-2">
                Custom
              </div>
              <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-1">
                For multi-warehouse D2C brands & retail chains.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-[#334155] dark:text-[#CBD5E1]">
                <li className="flex items-center gap-1.5">✓ Custom ERP / POS integrations</li>
                <li className="flex items-center gap-1.5">✓ Dedicated WhatsApp number routing</li>
                <li className="flex items-center gap-1.5">✓ Multi-tenant RBAC permissions</li>
                <li className="flex items-center gap-1.5">✓ Custom model fine-tuning</li>
              </ul>
            </div>
            <button
              onClick={() => handleOpenPlan('Enterprise', 'Custom Quota', 'Custom ERP & POS connectors with dedicated SLA guarantees.')}
              className="mt-6 w-full py-2 text-xs font-medium border border-[#CBD5E1] dark:border-[#1E3A5F] text-[#0F172A] dark:text-[#F8FAFC] rounded-lg hover:bg-[#F8FAFC] dark:hover:bg-[#1B2E4B] transition-colors cursor-pointer"
            >
              Contact Enterprise
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic Plan Activation / Checkout Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#132238] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#BAE6FD] dark:border-[#1E3A5F] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#1E3A5F]">
              <div>
                <h3 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                  {selectedPlan.name}
                </h3>
                <div className="text-xs font-bold font-mono text-[#0284C7] dark:text-[#38BDF8]">
                  {selectedPlan.price}
                </div>
              </div>
              <button
                onClick={() => setSelectedPlan(null)}
                className="p-1.5 text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isActivated ? (
              <div className="text-center py-6 space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#E0F2FE] dark:bg-[#0C243B] text-[#0284C7] dark:text-[#38BDF8] flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                  Plan Activated for {storeUrl || 'Your Store'}!
                </h4>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                  SELLVION Autonomous Agent sync has been provisioned. Your store orders and customer cadences are now connected.
                </p>
                <button
                  onClick={() => setSelectedPlan(null)}
                  className="px-5 py-2 bg-[#0284C7] text-white text-xs font-semibold rounded-xl"
                >
                  Return to Dashboard
                </button>
              </div>
            ) : (
              <form onSubmit={handleConfirmPlan} className="space-y-3 text-xs">
                <p className="text-[#64748B] dark:text-[#94A3B8]">
                  {selectedPlan.description}
                </p>

                <div>
                  <label className="text-[11px] font-medium text-[#475569] dark:text-[#CBD5E1] block mb-1">
                    Store Domain / Shopify URL
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. mysticspices.in or store.myshopify.com"
                    value={storeUrl}
                    onChange={(e) => setStoreUrl(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#0F1A2C] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-1 focus:ring-[#0284C7]"
                  />
                </div>

                <div className="p-3 rounded-xl bg-[#F0F9FF] dark:bg-[#0C243B] border border-[#BAE6FD] dark:border-[#1E3A5F] text-xs text-[#0284C7] dark:text-[#38BDF8] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>30-Day Zero Risk Money-Back Guarantee. Cancel anytime with 1 tap.</span>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8F0] dark:border-[#1E3A5F]">
                  <button
                    type="button"
                    onClick={() => setSelectedPlan(null)}
                    className="px-3 py-1.5 text-xs text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-semibold rounded-xl shadow-sm shadow-[#0284C7]/20 cursor-pointer"
                  >
                    Confirm & Provision Plan
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
