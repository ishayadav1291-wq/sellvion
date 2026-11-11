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
  Plus,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { Customer, CustomerSegment } from '../types';

interface Customer360Props {
  customers: Customer[];
  onOpenDraftModal?: (customer: Customer) => void;
  onAddCustomer?: (newCustomer: Customer) => void;
}

export const Customer360: React.FC<Customer360Props> = ({
  customers,
  onOpenDraftModal,
  onAddCustomer,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedSegment, setSelectedSegment] = useState<string>('all');
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState<boolean>(false);

  // New Customer Form State
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('+91 ');
  const [newCity, setNewCity] = useState('');
  const [newState, setNewState] = useState('Maharashtra');
  const [newProduct, setNewProduct] = useState('');
  const [newCadence, setNewCadence] = useState<number>(30);
  const [newUdhaar, setNewUdhaar] = useState<number>(0);

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
        return { label: 'Reorder Window Open', color: 'text-[#0284C7] dark:text-[#38BDF8]' };
      case 'first_time':
        return { label: 'First Time (COD Risk)', color: 'text-[#D97706] dark:text-[#FBBF24]' };
      case 'high_udhaar':
        return { label: 'Pending Khata / Udhaar', color: 'text-[#DC2626] dark:text-[#F87171]' };
      case 'inactive':
        return { label: 'Lapsed VIP (>90d)', color: 'text-[#64748B] dark:text-[#94A3B8]' };
      case 'regular':
        return { label: 'Active Regular', color: 'text-[#0284C7] dark:text-[#38BDF8]' };
      default:
        return { label: 'Customer', color: 'text-[#64748B] dark:text-[#94A3B8]' };
    }
  };

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newCust: Customer = {
      id: `CUST-${Math.floor(1000 + Math.random() * 9000)}`,
      name: newName.trim(),
      phone: newPhone.trim(),
      city: newCity.trim() || 'Mumbai',
      state: newState,
      firstOrderDate: new Date().toISOString().split('T')[0],
      lastOrderDate: new Date().toISOString().split('T')[0],
      totalOrders: 1,
      totalSpent: 1850,
      averageOrderCadenceDays: newCadence || 30,
      daysSinceLastOrder: 2,
      primaryCategory: 'Retail',
      lastProductOrdered: newProduct.trim() || 'Assam CTC Golden Blend (1kg)',
      segment: newUdhaar > 0 ? 'high_udhaar' : 'regular',
      codReliabilityScore: 85,
      outstandingUdhaar: newUdhaar,
      consentWhatsApp: true,
      notes: 'Customer added via manual merchant khata register.',
      aiInsightSummary: 'New customer profile registered. Cadence monitor initialized.',
    };

    if (onAddCustomer) {
      onAddCustomer(newCust);
    }

    setIsAddCustomerOpen(false);
    // Reset Form
    setNewName('');
    setNewPhone('+91 ');
    setNewCity('');
    setNewProduct('');
    setNewUdhaar(0);
  };

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#64748B] dark:text-[#94A3B8] mb-1">
            <span>Customer Intelligence Graph</span>
            <span>·</span>
            <span className="font-semibold text-[#0284C7] dark:text-[#38BDF8]">RFM Cadence & Udhaar Memory</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-[#0F172A] dark:text-white">
            Customer 360
          </h2>
          <p className="text-sm text-[#64748B] dark:text-[#94A3B8] mt-0.5">
            Unified purchase memory, reorder rhythms, and COD reliability across all channels.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search Input */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search name, city, SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-[#132238] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl text-[#0F172A] dark:text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:ring-1 focus:ring-[#0284C7] focus:border-[#0284C7] shadow-2xs"
            />
          </div>

          <button
            onClick={() => setIsAddCustomerOpen(true)}
            className="px-3.5 py-2 bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm shadow-[#0284C7]/20 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#BAE6FD]" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Segment Filter Bar */}
      <div className="flex items-center gap-1.5 p-1 bg-[#E0F2FE] dark:bg-[#1E293B] rounded-xl overflow-x-auto text-xs">
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
            className={`px-3 py-1.5 font-medium rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              selectedSegment === tab.id
                ? 'bg-white dark:bg-[#0284C7] text-[#0284C7] dark:text-white shadow-xs font-semibold'
                : 'text-[#0369A1] dark:text-[#94A3B8] hover:text-[#0284C7] dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Mobile Card Stack View (<768px) - Fixes Mobile Con */}
      <div className="block md:hidden space-y-3">
        {filteredCustomers.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#64748B] dark:text-[#94A3B8] bg-white dark:bg-[#132238] rounded-xl border border-[#E2E8F0] dark:border-[#1E3A5F]">
            No customers found.
          </div>
        ) : (
          filteredCustomers.map((cust) => {
            const seg = getSegmentLabel(cust.segment);
            return (
              <div
                key={cust.id}
                onClick={() => setActiveCustomer(cust)}
                className="p-4 bg-white dark:bg-[#132238] rounded-xl border border-[#E2E8F0] dark:border-[#1E3A5F] shadow-xs space-y-2.5 active:bg-[#F0F9FF] dark:active:bg-[#192E4D] transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-sm text-[#0F172A] dark:text-[#F8FAFC]">
                      {cust.name}
                    </div>
                    <div className={`text-[11px] font-medium ${seg.color}`}>
                      {seg.label}
                    </div>
                  </div>
                  <span className="text-xs font-mono tabular-nums font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                    ₹{cust.totalSpent.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-[#64748B] dark:text-[#94A3B8] pt-1 border-t border-[#F1F5F9] dark:border-[#1E3A5F]">
                  <div>
                    <span className="text-[#94A3B8] block text-[10px]">Cadence</span>
                    <span className="font-mono text-[#0F172A] dark:text-[#F8FAFC]">
                      {cust.daysSinceLastOrder}d / {cust.averageOrderCadenceDays}d
                    </span>
                  </div>
                  <div>
                    <span className="text-[#94A3B8] block text-[10px]">Udhaar Balance</span>
                    <span className={`font-mono font-semibold ${cust.outstandingUdhaar > 0 ? 'text-[#DC2626] dark:text-[#F87171]' : 'text-[#0284C7] dark:text-[#38BDF8]'}`}>
                      {cust.outstandingUdhaar > 0 ? `₹${cust.outstandingUdhaar}` : '₹0 Due'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <span className="text-[#64748B] dark:text-[#94A3B8] truncate max-w-[200px]">
                    {cust.lastProductOrdered}
                  </span>
                  <span className="text-[#0284C7] dark:text-[#38BDF8] font-semibold flex items-center gap-0.5">
                    Inspect <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Customer Data Table (hidden on mobile, visible md:table) */}
      <div className="hidden md:block bg-white dark:bg-[#132238] rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] overflow-hidden shadow-2xs transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F8FAFC] dark:bg-[#0F172A] border-b border-[#E2E8F0] dark:border-[#1E293B] text-[#64748B] dark:text-[#94A3B8] font-semibold">
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
            <tbody className="divide-y divide-[#F1F5F9] dark:divide-[#1E293B] text-[#334155] dark:text-[#CBD5E1]">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#64748B] dark:text-[#94A3B8]">
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
                      className="hover:bg-[#F0F9FF] dark:hover:bg-[#0C243B] cursor-pointer transition-colors group"
                    >
                      {/* Name & Segment */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#0F172A] dark:text-white group-hover:text-[#0284C7] dark:group-hover:text-[#38BDF8]">
                          {cust.name}
                        </div>
                        <div className={`text-[11px] font-medium ${seg.color}`}>
                          {seg.label}
                        </div>
                      </td>

                      {/* City */}
                      <td className="py-3 px-4 text-[#64748B] dark:text-[#94A3B8]">
                        <div>{cust.city}</div>
                        <div className="text-[10px] text-[#94A3B8]">{cust.state}</div>
                      </td>

                      {/* Cadence */}
                      <td className="py-3 px-4 font-mono tabular-nums">
                        {cust.averageOrderCadenceDays > 0 ? (
                          <div>
                            <span className={isDue ? 'font-bold text-[#0284C7] dark:text-[#38BDF8]' : 'text-[#334155] dark:text-[#CBD5E1]'}>
                              {cust.daysSinceLastOrder}d
                            </span>
                            <span className="text-[#94A3B8]"> / {cust.averageOrderCadenceDays}d cadence</span>
                          </div>
                        ) : (
                          <span className="text-[#94A3B8]">First order (2d ago)</span>
                        )}
                      </td>

                      {/* Last SKU */}
                      <td className="py-3 px-4 max-w-[200px] truncate" title={cust.lastProductOrdered}>
                        <div className="font-medium truncate text-[#0F172A] dark:text-white">{cust.lastProductOrdered}</div>
                        <div className="text-[10px] text-[#94A3B8]">{cust.primaryCategory}</div>
                      </td>

                      {/* Lifetime Spend */}
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        <div className="font-semibold text-[#0F172A] dark:text-white">
                          ₹{cust.totalSpent.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-[#94A3B8]">{cust.totalOrders} orders</div>
                      </td>

                      {/* COD Reliability Score */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`font-mono tabular-nums font-semibold ${
                            cust.codReliabilityScore >= 80
                              ? 'text-[#0284C7] dark:text-[#38BDF8]'
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
                          <div className="font-bold text-[#DC2626] dark:text-[#F87171]">
                            ₹{cust.outstandingUdhaar.toLocaleString('en-IN')}
                            <div className="text-[10px] text-[#DC2626] dark:text-[#F87171]">
                              {cust.udhaarDueDate ? 'Overdue' : 'Due'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[#94A3B8]">₹0</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveCustomer(cust);
                          }}
                          className="px-2.5 py-1 text-xs font-medium text-[#0284C7] dark:text-[#38BDF8] hover:bg-[#E0F2FE] dark:hover:bg-[#1E3A5F] rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
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

      {/* Customer 360 Deep Drawer */}
      {activeCustomer && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end animate-fadeIn">
          <div className="w-full max-w-lg bg-white dark:bg-[#0B1320] h-full shadow-2xl p-6 overflow-y-auto flex flex-col justify-between border-l border-[#E2E8F0] dark:border-[#1E293B] transition-colors">
            <div>
              {/* Drawer Header */}
              <div className="flex items-start justify-between pb-4 border-b border-[#E2E8F0] dark:border-[#1E293B]">
                <div>
                  <div className="flex items-center gap-2 text-xs text-[#64748B] dark:text-[#94A3B8] mb-1">
                    <span>ID: {activeCustomer.id}</span>
                    <span>·</span>
                    <span className="text-[#0284C7] dark:text-[#38BDF8] font-medium">WhatsApp Consent Active ✓</span>
                  </div>
                  <h3 className="text-xl font-bold text-[#0F172A] dark:text-white tracking-tight">
                    {activeCustomer.name}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#0284C7]" /> {activeCustomer.city}, {activeCustomer.state}
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      <Phone className="w-3 h-3 text-[#0284C7]" /> {activeCustomer.phone}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setActiveCustomer(null)}
                  className="p-1.5 text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white hover:bg-[#F0F7FF] dark:hover:bg-[#132238] rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* AI Insight Highlight */}
              <div className="my-5 p-4 rounded-xl bg-[#F0F9FF] dark:bg-[#0C243B] border border-[#BAE6FD] dark:border-[#1E456E] shadow-2xs transition-colors">
                <div className="flex items-center gap-2 text-xs font-bold text-[#0284C7] dark:text-[#38BDF8] uppercase tracking-wider mb-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#0EA5E9] dark:text-[#38BDF8]" />
                  <span>Autonomous AI Observation</span>
                </div>
                <p className="text-xs text-[#0369A1] dark:text-[#BAE6FD] leading-relaxed">
                  {activeCustomer.aiInsightSummary}
                </p>
              </div>

              {/* Cadence & Financial Health Grid */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="p-3 bg-[#F8FAFC] dark:bg-[#132238] rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] transition-colors">
                  <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">Reorder Cadence Rhythm</div>
                  <div className="text-sm font-bold text-[#0F172A] dark:text-white font-mono tabular-nums mt-0.5">
                    {activeCustomer.averageOrderCadenceDays > 0
                      ? `Every ${activeCustomer.averageOrderCadenceDays} Days`
                      : 'First Order Baseline'}
                  </div>
                  <div className="text-[11px] text-[#0284C7] dark:text-[#38BDF8] mt-0.5">
                    Last purchase: {activeCustomer.daysSinceLastOrder} days ago
                  </div>
                </div>

                <div className="p-3 bg-[#F8FAFC] dark:bg-[#132238] rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] transition-colors">
                  <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">COD Risk Profile</div>
                  <div
                    className={`text-sm font-bold font-mono tabular-nums mt-0.5 ${
                      activeCustomer.codReliabilityScore >= 80
                        ? 'text-[#0284C7] dark:text-[#38BDF8]'
                        : 'text-[#DC2626] dark:text-[#F87171]'
                    }`}
                  >
                    {activeCustomer.codReliabilityScore}% Reliability
                  </div>
                  <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                    {activeCustomer.codReliabilityScore < 50
                      ? 'Prepay discount nudge recommended'
                      : 'Safe for automated COD dispatch'}
                  </div>
                </div>

                <div className="p-3 bg-[#F8FAFC] dark:bg-[#132238] rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] transition-colors">
                  <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">Lifetime Revenue</div>
                  <div className="text-sm font-bold text-[#0F172A] dark:text-white font-mono tabular-nums mt-0.5">
                    ₹{activeCustomer.totalSpent.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                    {activeCustomer.totalOrders} total completed orders
                  </div>
                </div>

                <div className="p-3 bg-[#F8FAFC] dark:bg-[#132238] rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] transition-colors">
                  <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">Outstanding Udhaar</div>
                  <div
                    className={`text-sm font-bold font-mono tabular-nums mt-0.5 ${
                      activeCustomer.outstandingUdhaar > 0 ? 'text-[#DC2626] dark:text-[#F87171]' : 'text-[#0284C7] dark:text-[#38BDF8]'
                    }`}
                  >
                    ₹{activeCustomer.outstandingUdhaar.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                    {activeCustomer.outstandingUdhaar > 0 ? '7 days past agreed date' : 'Zero dues'}
                  </div>
                </div>
              </div>

              {/* Memory Graph Notes */}
              <div className="space-y-3 mb-5">
                <div className="text-xs font-semibold text-[#0F172A] dark:text-white">
                  Customer Memory Graph & Nuances
                </div>
                <div className="bg-[#F8FAFC] dark:bg-[#132238] p-3.5 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] text-xs text-[#334155] dark:text-[#CBD5E1] leading-relaxed transition-colors">
                  {activeCustomer.notes}
                </div>
              </div>
            </div>

            {/* Drawer Bottom Actions */}
            <div className="pt-4 border-t border-[#E2E8F0] dark:border-[#1E293B] flex items-center gap-2">
              <button
                onClick={() => {
                  if (onOpenDraftModal) onOpenDraftModal(activeCustomer);
                  setActiveCustomer(null);
                }}
                className="flex-1 py-2.5 px-4 bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-semibold rounded-xl transition-all shadow-sm shadow-[#0284C7]/20 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 text-[#BAE6FD]" />
                <span>Draft Custom WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic "+ Add New Customer" Modal */}
      {isAddCustomerOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#132238] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#BAE6FD] dark:border-[#1E3A5F] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#1E3A5F]">
              <h3 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
                <User className="w-4 h-4 text-[#0284C7] dark:text-[#38BDF8]" />
                <span>Register New Customer Khata</span>
              </h3>
              <button
                onClick={() => setIsAddCustomerOpen(false)}
                className="p-1.5 text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-medium text-[#475569] dark:text-[#CBD5E1] block mb-1">
                  Full Customer Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#0F1A2C] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-1 focus:ring-[#0284C7]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-[#475569] dark:text-[#CBD5E1] block mb-1">
                    Phone Number (WhatsApp)
                  </label>
                  <input
                    type="text"
                    required
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full p-2.5 font-mono rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#0F1A2C] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-1 focus:ring-[#0284C7]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-[#475569] dark:text-[#CBD5E1] block mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Pune, Jaipur"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#0F1A2C] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-1 focus:ring-[#0284C7]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-[#475569] dark:text-[#CBD5E1] block mb-1">
                  Primary SKU / Product Preference
                </label>
                <input
                  type="text"
                  placeholder="e.g. Organic Kashmiri Saffron (2g)"
                  value={newProduct}
                  onChange={(e) => setNewProduct(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#0F1A2C] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-1 focus:ring-[#0284C7]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-[#475569] dark:text-[#CBD5E1] block mb-1">
                    Reorder Cycle (Days)
                  </label>
                  <input
                    type="number"
                    min="7"
                    max="180"
                    value={newCadence}
                    onChange={(e) => setNewCadence(Number(e.target.value))}
                    className="w-full p-2.5 font-mono rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#0F1A2C] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-1 focus:ring-[#0284C7]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-[#475569] dark:text-[#CBD5E1] block mb-1">
                    Starting Udhaar (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={newUdhaar}
                    onChange={(e) => setNewUdhaar(Number(e.target.value))}
                    className="w-full p-2.5 font-mono rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#0F1A2C] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-1 focus:ring-[#0284C7]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8F0] dark:border-[#1E3A5F]">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(false)}
                  className="px-3 py-1.5 text-xs text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-semibold rounded-xl transition-colors shadow-sm shadow-[#0284C7]/20 cursor-pointer"
                >
                  Save Customer Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
