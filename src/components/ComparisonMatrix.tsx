import React from 'react';
import { Check, X, Minus, Sparkles, ArrowRight } from 'lucide-react';
import { COMPARISON_DATA } from '../data/mockData';

export const ComparisonMatrix: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2 text-xs text-[#555C57] dark:text-[#9DA49F] mb-1">
          <span>Market Positioning</span>
          <span>·</span>
          <span className="font-semibold text-[#0F2E22] dark:text-[#34D399]">One Unified Autonomous Teammate</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#141B18] dark:text-[#F0F3F1]">
          How SELLVION Compares
        </h2>
        <p className="text-sm text-[#555C57] dark:text-[#9DA49F] mt-0.5">
          Instead of stitching together a separate billing ledger, a WhatsApp broadcast tool, and a COD plugin, SELLVION acts as one autonomous AI employee connecting all three.
        </p>
      </div>

      {/* Comparison Table */}
      <div className="bg-white dark:bg-[#161C19] rounded-2xl border border-[#EAE8E1] dark:border-[#232B26] overflow-hidden shadow-xs transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#FAF9F5] dark:bg-[#1A221E] border-b border-[#EAE8E1] dark:border-[#232B26] text-[#6B726C] dark:text-[#8C948F] font-semibold">
                <th className="py-4 px-4 w-1/3">Capability</th>
                <th className="py-4 px-3 text-center">Khatabook / myBillBook</th>
                <th className="py-4 px-3 text-center">AiSensy / WATI</th>
                <th className="py-4 px-3 text-center">Shiprocket / GoKwik</th>
                <th className="py-4 px-4 text-center bg-[#0F2E22] dark:bg-[#1E4D3B] text-white font-bold">
                  SELLVION
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2F0E8] dark:divide-[#232B26] text-[#2D332F] dark:text-[#D1D7D3]">
              {COMPARISON_DATA.map((row, idx) => (
                <tr key={idx} className="hover:bg-[#FAF9F5] dark:hover:bg-[#1B2420] transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-[#141B18] dark:text-[#F0F3F1]">{row.capability}</div>
                    <div className="text-[11px] text-[#6B726C] dark:text-[#8C948F] mt-0.5">{row.detail}</div>
                  </td>

                  <td className="py-3.5 px-3 text-center font-medium text-[#555C57] dark:text-[#9DA49F]">
                    {row.khatabook}
                  </td>

                  <td className="py-3.5 px-3 text-center font-medium text-[#555C57] dark:text-[#9DA49F]">
                    {row.aisensy}
                  </td>

                  <td className="py-3.5 px-3 text-center font-medium text-[#555C57] dark:text-[#9DA49F]">
                    {row.shiprocket}
                  </td>

                  <td className="py-3.5 px-4 text-center font-bold text-[#065F46] dark:text-[#34D399] bg-[#F4F9F6] dark:bg-[#142B20]">
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
          <h3 className="text-xl font-bold text-[#141B18] dark:text-[#F0F3F1] tracking-tight">
            Accessible, Transparent Pricing for Indian Merchants
          </h3>
          <p className="text-xs text-[#555C57] dark:text-[#9DA49F] mt-1">
            Predictable monthly subscriptions with zero hidden commissions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-[#161C19] rounded-xl border border-[#EAE8E1] dark:border-[#232B26] p-5 shadow-xs flex flex-col justify-between transition-colors">
            <div>
              <div className="text-xs font-bold text-[#555C57] dark:text-[#9DA49F] uppercase tracking-wider">
                Starter
              </div>
              <div className="text-2xl font-bold font-mono text-[#141B18] dark:text-[#F0F3F1] mt-2">
                Free
              </div>
              <p className="text-[11px] text-[#6B726C] dark:text-[#8C948F] mt-1">
                For merchants starting digital record keeping.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-[#2D332F] dark:text-[#D1D7D3]">
                <li className="flex items-center gap-1.5">✓ Basic customer 360 profiles</li>
                <li className="flex items-center gap-1.5">✓ Up to 100 customer records</li>
                <li className="flex items-center gap-1.5">✓ Manual WhatsApp links</li>
              </ul>
            </div>
            <button className="mt-6 w-full py-2 text-xs font-medium border border-[#DDD9CF] dark:border-[#2D3932] text-[#141B18] dark:text-[#E8ECE9] rounded-lg hover:bg-[#FAF9F5] dark:hover:bg-[#1C2520] transition-colors">
              Get Started Free
            </button>
          </div>

          <div className="bg-white dark:bg-[#161C19] rounded-xl border border-[#EAE8E1] dark:border-[#232B26] p-5 shadow-xs flex flex-col justify-between transition-colors">
            <div>
              <div className="text-xs font-bold text-[#555C57] dark:text-[#9DA49F] uppercase tracking-wider">
                Growth
              </div>
              <div className="text-2xl font-bold font-mono text-[#141B18] dark:text-[#F0F3F1] mt-2">
                ₹299 <span className="text-xs font-normal text-[#6B726C] dark:text-[#8C948F]">/ month</span>
              </div>
              <p className="text-[11px] text-[#6B726C] dark:text-[#8C948F] mt-1">
                For growing stores scaling repeat orders.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-[#2D332F] dark:text-[#D1D7D3]">
                <li className="flex items-center gap-1.5">✓ Predictive reorder alerts</li>
                <li className="flex items-center gap-1.5">✓ Basic COD risk scoring</li>
                <li className="flex items-center gap-1.5">✓ Udhaar tracking & reminders</li>
                <li className="flex items-center gap-1.5">✓ Up to 1,000 customers</li>
              </ul>
            </div>
            <button className="mt-6 w-full py-2 text-xs font-medium border border-[#DDD9CF] dark:border-[#2D3932] text-[#141B18] dark:text-[#E8ECE9] rounded-lg hover:bg-[#FAF9F5] dark:hover:bg-[#1C2520] transition-colors">
              Start Growth Trial
            </button>
          </div>

          <div className="bg-[#0F2E22] dark:bg-[#153426] text-white rounded-xl p-5 shadow-sm flex flex-col justify-between relative ring-2 ring-[#059669] dark:ring-[#34D399] transition-colors">
            <div>
              <div className="text-xs font-bold text-[#A7F3D0] uppercase tracking-wider flex items-center justify-between">
                <span>Pro (Most Popular)</span>
                <span className="text-[10px] bg-[#1A4535] dark:bg-[#1D4A37] px-2 py-0.5 rounded text-[#D1FAE5]">Best Value</span>
              </div>
              <div className="text-2xl font-bold font-mono text-white mt-2">
                ₹799 <span className="text-xs font-normal text-[#A7F3D0]">/ month</span>
              </div>
              <p className="text-[11px] text-[#D1FAE5] mt-1">
                Full autonomous AI employee with earned autonomy.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-[#E8F5E9]">
                <li className="flex items-center gap-1.5">✓ Multi-agent orchestration</li>
                <li className="flex items-center gap-1.5">✓ Earned autonomy state machine</li>
                <li className="flex items-center gap-1.5">✓ Hinglish WhatsApp drafting</li>
                <li className="flex items-center gap-1.5">✓ Holdout incremental revenue lift</li>
                <li className="flex items-center gap-1.5">✓ Priority WhatsApp API sync</li>
              </ul>
            </div>
            <button className="mt-6 w-full py-2 text-xs font-semibold bg-[#34D399] hover:bg-[#10B981] text-[#064E3B] rounded-lg transition-colors">
              Activate Pro Plan
            </button>
          </div>

          <div className="bg-white dark:bg-[#161C19] rounded-xl border border-[#EAE8E1] dark:border-[#232B26] p-5 shadow-xs flex flex-col justify-between transition-colors">
            <div>
              <div className="text-xs font-bold text-[#555C57] dark:text-[#9DA49F] uppercase tracking-wider">
                Enterprise
              </div>
              <div className="text-2xl font-bold font-mono text-[#141B18] dark:text-[#F0F3F1] mt-2">
                Custom
              </div>
              <p className="text-[11px] text-[#6B726C] dark:text-[#8C948F] mt-1">
                For multi-warehouse D2C brands & retail chains.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-[#2D332F] dark:text-[#D1D7D3]">
                <li className="flex items-center gap-1.5">✓ Custom ERP / POS integrations</li>
                <li className="flex items-center gap-1.5">✓ Dedicated WhatsApp number routing</li>
                <li className="flex items-center gap-1.5">✓ Multi-tenant RBAC permissions</li>
                <li className="flex items-center gap-1.5">✓ Custom model fine-tuning</li>
              </ul>
            </div>
            <button className="mt-6 w-full py-2 text-xs font-medium border border-[#DDD9CF] dark:border-[#2D3932] text-[#141B18] dark:text-[#E8ECE9] rounded-lg hover:bg-[#FAF9F5] dark:hover:bg-[#1C2520] transition-colors">
              Contact Enterprise
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
