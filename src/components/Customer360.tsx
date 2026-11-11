import React, { useState } from 'react';
import {
  Search,
  User,
  ShoppingBag,
  Clock,
  ShieldAlert,
  CreditCard,
  ChevronRight,
  X,
  Send,
  Sparkles,
  MapPin,
  Phone,
  CheckCircle2,
} from 'lucide-react';
import { Customer, CustomerSegment } from '../types';

interface Customer360Props {
  customers: Customer[];
  onOpenDraftModal?: (customer: Customer) => void;
}

export const Customer360: React.FC<Customer360Props> = ({
  customers,
  onOpenDraftModal,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedSegment, setSelectedSegment] = useState<string>('all');
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);

  const filteredCustomers = customers.filter((cust) => {
    const matchesSearch =
      cust.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cust.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cust.lastProductOrdered.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cust.phone.includes(searchTerm);

    if (!matchesSearch) return false;
    if (selectedSegment === 'all') return true;
    return cust.segment === selectedSegment;
  });

  const getSegmentLabel = (segment: CustomerSegment) => {
    switch (segment) {
      case 'reorder_due':
        return { label: 'Reorder Window Open', color: 'text-[#047857] dark:text-[#34D399]' };
      case 'first_time':
        return { label: 'First Time (COD Risk)', color: 'text-[#B45309] dark:text-[#FBBF24]' };
      case 'high_udhaar':
        return { label: 'Pending Khata / Udhaar', color: 'text-[#B91C1C] dark:text-[#F87171]' };
      case 'inactive':
        return { label: 'Lapsed VIP (>90d)', color: 'text-[#6B7280] dark:text-[#9CA3AF]' };
      case 'regular':
        return { label: 'Active Regular', color: 'text-[#1D4ED8] dark:text-[#60A5FA]' };
      default:
        return { label: 'Customer', color: 'text-[#4B5563] dark:text-[#9CA3AF]' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Introduction */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#555C57] dark:text-[#9DA49F] mb-1">
            <span>Customer Intelligence Graph</span>
            <span>·</span>
            <span className="font-semibold text-[#0F2E22] dark:text-[#34D399]">RFM Cadence & Udhaar Memory</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-[#141B18] dark:text-[#F0F3F1]">
            Customer 360
          </h2>
          <p className="text-sm text-[#555C57] dark:text-[#9DA49F] mt-0.5">
            Unified purchase memory, reorder rhythms, and COD reliability across all channels.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-[#8C8F8A] dark:text-[#6C7670] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, city, SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-[#161C19] border border-[#DDD9CF] dark:border-[#28322C] rounded-xl text-[#141B18] dark:text-[#E8ECE9] placeholder-[#8C8F8A] dark:placeholder-[#6C7670] focus:outline-none focus:ring-1 focus:ring-[#0F2E22] dark:focus:ring-[#34D399] shadow-2xs"
          />
        </div>
      </div>

      {/* Segment Filter Bar */}
      <div className="flex items-center gap-1.5 p-1 bg-[#EBE8DF] dark:bg-[#1B221E] rounded-xl overflow-x-auto text-xs">
        {[
          { id: 'all', label: 'All Customers' },
          { id: 'reorder_due', label: 'Reorder Due' },
          { id: 'first_time', label: 'High COD Risk' },
          { id: 'high_udhaar', label: 'Udhaar Overdue' },
          { id: 'regular', label: 'Active Regulars' },
          { id: 'inactive', label: 'Lapsed VIPs' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedSegment(tab.id)}
            className={`px-3 py-1.5 font-medium rounded-lg transition-all whitespace-nowrap shrink-0 ${
              selectedSegment === tab.id
                ? 'bg-white dark:bg-[#25322A] text-[#0F2E22] dark:text-[#E8F5E9] shadow-xs font-semibold'
                : 'text-[#616862] dark:text-[#9DA49F] hover:text-[#141B18] dark:hover:text-[#F0F3F1]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Customer Data Table */}
      <div className="bg-white dark:bg-[#161C19] rounded-2xl border border-[#EAE8E1] dark:border-[#232B26] overflow-hidden shadow-xs transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#FAF9F5] dark:bg-[#1A221E] border-b border-[#EAE8E1] dark:border-[#232B26] text-[#6B726C] dark:text-[#8C948F] font-semibold">
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Purchase Cycle</th>
                <th className="py-3 px-4">Favorite / Last SKU</th>
                <th className="py-3 px-4 text-right">Lifetime Spend</th>
                <th className="py-3 px-4 text-center">COD Reliability</th>
                <th className="py-3 px-4 text-right">Udhaar Balance</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2F0E8] dark:divide-[#232B26] text-[#2D332F] dark:text-[#D1D7D3]">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#6B726C] dark:text-[#8C948F]">
                    No customers found matching the search or segment filter.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  const seg = getSegmentLabel(cust.segment);
                  const isDue = cust.daysSinceLastOrder >= cust.averageOrderCadenceDays && cust.averageOrderCadenceDays > 0;

                  return (
                    <tr
                      key={cust.id}
                      onClick={() => setActiveCustomer(cust)}
                      className="hover:bg-[#FAF9F5] dark:hover:bg-[#1B2420] cursor-pointer transition-colors group"
                    >
                      {/* Name & Segment */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#141B18] dark:text-[#F0F3F1] group-hover:text-[#0F2E22] dark:group-hover:text-[#34D399]">
                          {cust.name}
                        </div>
                        <div className={`text-[11px] font-medium ${seg.color}`}>
                          {seg.label}
                        </div>
                      </td>

                      {/* City */}
                      <td className="py-3 px-4 text-[#555C57] dark:text-[#9DA49F]">
                        <div>{cust.city}</div>
                        <div className="text-[10px] text-[#8C8F8A] dark:text-[#6C7670]">{cust.state}</div>
                      </td>

                      {/* Cadence */}
                      <td className="py-3 px-4 font-mono tabular-nums">
                        {cust.averageOrderCadenceDays > 0 ? (
                          <div>
                            <span className={isDue ? 'font-bold text-[#047857] dark:text-[#34D399]' : 'text-[#2D332F] dark:text-[#D1D7D3]'}>
                              {cust.daysSinceLastOrder}d
                            </span>
                            <span className="text-[#8C8F8A] dark:text-[#6C7670]"> / {cust.averageOrderCadenceDays}d cadence</span>
                          </div>
                        ) : (
                          <span className="text-[#8C8F8A] dark:text-[#6C7670]">First order (2d ago)</span>
                        )}
                      </td>

                      {/* Last SKU */}
                      <td className="py-3 px-4 max-w-[200px] truncate" title={cust.lastProductOrdered}>
                        <div className="font-medium truncate text-[#141B18] dark:text-[#E8ECE9]">{cust.lastProductOrdered}</div>
                        <div className="text-[10px] text-[#8C8F8A] dark:text-[#6C7670]">{cust.primaryCategory}</div>
                      </td>

                      {/* Lifetime Spend */}
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        <div className="font-semibold text-[#141B18] dark:text-[#F0F3F1]">
                          ₹{cust.totalSpent.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-[#8C8F8A] dark:text-[#6C7670]">{cust.totalOrders} orders</div>
                      </td>

                      {/* COD Reliability Score */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`font-mono tabular-nums font-semibold ${
                            cust.codReliabilityScore >= 80
                              ? 'text-[#047857] dark:text-[#34D399]'
                              : cust.codReliabilityScore >= 50
                              ? 'text-[#D97706] dark:text-[#FBBF24]'
                              : 'text-[#DC2626] dark:text-[#F87171]'
                          }`}
                        >
                          {cust.codReliabilityScore}%
                        </span>
                      </td>

                      {/* Udhaar */}
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {cust.outstandingUdhaar > 0 ? (
                          <div className="font-bold text-[#B91C1C] dark:text-[#F87171]">
                            ₹{cust.outstandingUdhaar.toLocaleString('en-IN')}
                            <div className="text-[10px] text-[#DC2626] dark:text-[#F87171]">
                              {cust.udhaarDueDate ? 'Overdue' : 'Due'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[#8C8F8A] dark:text-[#6C7670]">₹0</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveCustomer(cust);
                          }}
                          className="px-2.5 py-1 text-xs font-medium text-[#0F2E22] dark:text-[#34D399] hover:bg-[#EAE8DF] dark:hover:bg-[#1E2722] rounded-lg transition-colors inline-flex items-center gap-1"
                        >
                          <span>Inspect</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer 360 Deep Drawer (Slide-in / Modal) */}
      {activeCustomer && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end animate-fadeIn">
          <div className="w-full max-w-lg bg-[#FAF9F5] dark:bg-[#121714] h-full shadow-2xl p-6 overflow-y-auto flex flex-col justify-between border-l border-[#DDD9CF] dark:border-[#232B26] transition-colors">
            <div>
              {/* Drawer Header */}
              <div className="flex items-start justify-between pb-4 border-b border-[#EAE8E1] dark:border-[#232B26]">
                <div>
                  <div className="flex items-center gap-2 text-xs text-[#555C57] dark:text-[#9DA49F] mb-1">
                    <span>ID: {activeCustomer.id}</span>
                    <span>·</span>
                    <span className="text-[#059669] dark:text-[#34D399] font-medium">WhatsApp Consent Active ✓</span>
                  </div>
                  <h3 className="text-xl font-bold text-[#141B18] dark:text-[#F0F3F1] tracking-tight">
                    {activeCustomer.name}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-[#6B726C] dark:text-[#8C948F] mt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {activeCustomer.city}, {activeCustomer.state}
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      <Phone className="w-3 h-3" /> {activeCustomer.phone}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setActiveCustomer(null)}
                  className="p-1.5 text-[#6B726C] dark:text-[#8C948F] hover:text-[#141B18] dark:hover:text-white hover:bg-[#EAE8DF] dark:hover:bg-[#1E2622] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* AI Insight Highlight */}
              <div className="my-5 p-4 rounded-xl bg-white dark:bg-[#161C19] border border-[#EAE8E1] dark:border-[#232B26] shadow-2xs transition-colors">
                <div className="flex items-center gap-2 text-xs font-bold text-[#0F2E22] dark:text-[#34D399] uppercase tracking-wider mb-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#059669] dark:text-[#34D399]" />
                  <span>Autonomous AI Observation</span>
                </div>
                <p className="text-xs text-[#2D332F] dark:text-[#D1D7D3] leading-relaxed">
                  {activeCustomer.aiInsightSummary}
                </p>
              </div>

              {/* Cadence & Financial Health Grid */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="p-3 bg-white dark:bg-[#161C19] rounded-xl border border-[#EAE8E1] dark:border-[#232B26] transition-colors">
                  <div className="text-[11px] text-[#6B726C] dark:text-[#8C948F]">Reorder Cadence Rhythm</div>
                  <div className="text-sm font-bold text-[#141B18] dark:text-[#F0F3F1] font-mono tabular-nums mt-0.5">
                    {activeCustomer.averageOrderCadenceDays > 0
                      ? `Every ${activeCustomer.averageOrderCadenceDays} Days`
                      : 'First Order Baseline'}
                  </div>
                  <div className="text-[11px] text-[#059669] dark:text-[#34D399] mt-0.5">
                    Last purchase: {activeCustomer.daysSinceLastOrder} days ago
                  </div>
                </div>

                <div className="p-3 bg-white dark:bg-[#161C19] rounded-xl border border-[#EAE8E1] dark:border-[#232B26] transition-colors">
                  <div className="text-[11px] text-[#6B726C] dark:text-[#8C948F]">COD Risk Profile</div>
                  <div
                    className={`text-sm font-bold font-mono tabular-nums mt-0.5 ${
                      activeCustomer.codReliabilityScore >= 80
                        ? 'text-[#047857] dark:text-[#34D399]'
                        : 'text-[#DC2626] dark:text-[#F87171]'
                    }`}
                  >
                    {activeCustomer.codReliabilityScore}% Reliability
                  </div>
                  <div className="text-[11px] text-[#6B726C] dark:text-[#8C948F] mt-0.5">
                    {activeCustomer.codReliabilityScore < 50
                      ? 'Prepay discount nudge recommended'
                      : 'Safe for automated COD dispatch'}
                  </div>
                </div>

                <div className="p-3 bg-white dark:bg-[#161C19] rounded-xl border border-[#EAE8E1] dark:border-[#232B26] transition-colors">
                  <div className="text-[11px] text-[#6B726C] dark:text-[#8C948F]">Lifetime Revenue</div>
                  <div className="text-sm font-bold text-[#141B18] dark:text-[#F0F3F1] font-mono tabular-nums mt-0.5">
                    ₹{activeCustomer.totalSpent.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[11px] text-[#6B726C] dark:text-[#8C948F] mt-0.5">
                    {activeCustomer.totalOrders} total completed orders
                  </div>
                </div>

                <div className="p-3 bg-white dark:bg-[#161C19] rounded-xl border border-[#EAE8E1] dark:border-[#232B26] transition-colors">
                  <div className="text-[11px] text-[#6B726C] dark:text-[#8C948F]">Outstanding Udhaar</div>
                  <div
                    className={`text-sm font-bold font-mono tabular-nums mt-0.5 ${
                      activeCustomer.outstandingUdhaar > 0 ? 'text-[#B91C1C] dark:text-[#F87171]' : 'text-[#047857] dark:text-[#34D399]'
                    }`}
                  >
                    ₹{activeCustomer.outstandingUdhaar.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[11px] text-[#6B726C] dark:text-[#8C948F] mt-0.5">
                    {activeCustomer.outstandingUdhaar > 0 ? '7 days past agreed date' : 'Zero dues'}
                  </div>
                </div>
              </div>

              {/* Memory Graph Notes & Customer Habits */}
              <div className="space-y-3 mb-5">
                <div className="text-xs font-semibold text-[#141B18] dark:text-[#F0F3F1]">
                  Customer Memory Graph & Nuances
                </div>
                <div className="bg-white dark:bg-[#161C19] p-3.5 rounded-xl border border-[#EAE8E1] dark:border-[#232B26] text-xs text-[#2D332F] dark:text-[#D1D7D3] leading-relaxed transition-colors">
                  {activeCustomer.notes}
                </div>
              </div>
            </div>

            {/* Drawer Bottom Actions */}
            <div className="pt-4 border-t border-[#EAE8E1] dark:border-[#232B26] flex items-center gap-2">
              <button
                onClick={() => {
                  if (onOpenDraftModal) onOpenDraftModal(activeCustomer);
                  setActiveCustomer(null);
                }}
                className="flex-1 py-2.5 px-4 bg-[#0F2E22] dark:bg-[#1E4D3B] text-white text-xs font-semibold rounded-xl hover:bg-[#1A4535] dark:hover:bg-[#28634C] transition-colors flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Send className="w-3.5 h-3.5 text-[#34D399]" />
                <span>Draft Custom WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
