import React, { useState, useEffect } from 'react';
import {
  Search,
  UserPlus,
  X,
  Phone,
  MapPin,
  ShoppingBag,
  MessageSquare,
  ShieldOff,
  Check,
  Sparkles,
  IndianRupee,
  Clock,
  ChevronLeft,
  ChevronRight,
  Upload,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import {
  AppLanguage,
  ConsoleTabId,
  CustomerRecord,
  CustomerSegment,
  CustomerTimelineEvent,
} from '../types';
import { apiRequest } from '../lib/api';
import { localizeWorkflowStatus, tr } from '../i18n/translations';

interface Customer360Props {
  language?: AppLanguage;
  customers: CustomerRecord[];
  onRefresh: () => void;
  onNotify: (msg: string) => void;
  onOpenInbox: () => void;
  onNavigateTab?: (tab: ConsoleTabId) => void;
  compactLanding?: boolean;
  initialCustomerId?: string | null;
  onClearInitialCustomer?: () => void;
}

interface CustomerDetailPayload {
  customer: CustomerRecord;
  orders: Array<{
    id: string;
    order_number: string;
    total_amount: number;
    payment_mode: string;
    status: string;
    ordered_at: string;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    method: string;
    reference_id: string;
    paid_at: string;
  }>;
  messages: Array<{
    id: string;
    direction: string;
    body: string;
    status: string;
    created_at: string;
  }>;
  timeline?: CustomerTimelineEvent[];
}

type StatusIconKind = 'clock' | 'check' | 'refresh' | 'alert' | 'sparkles';

function getStatusDisplay(
  lang: AppLanguage,
  segment: CustomerSegment,
  outstandingUdhaar: number
): {
  label: string;
  icon: StatusIconKind;
  textColor: string;
} {
  if (outstandingUdhaar > 0 || segment === 'high_udhaar') {
    return {
      label: tr(lang, 'Payment Pending', 'भुगतान बाकी'),
      icon: 'clock',
      textColor: 'text-[#D97706]',
    };
  }
  switch (segment) {
    case 'loyal':
      return {
        label: tr(lang, 'Loyal Buyer', 'नियमित ग्राहक'),
        icon: 'check',
        textColor: 'text-[#16A34A]',
      };
    case 'reorder_due':
      return {
        label: tr(lang, 'Reorder Due', 'रीऑर्डर का समय'),
        icon: 'refresh',
        textColor: 'text-[#2563EB] dark:text-[#22D3EE]',
      };
    case 'at_risk':
      return {
        label: tr(lang, 'Needs Attention', 'ध्यान दें'),
        icon: 'alert',
        textColor: 'text-[#DC2626]',
      };
    case 'inactive':
      return {
        label: tr(lang, 'Inactive', 'निष्क्रिय'),
        icon: 'clock',
        textColor: 'text-[#D97706]',
      };
    case 'first_time':
      return {
        label: tr(lang, 'First-Time Buyer', 'नया ग्राहक'),
        icon: 'sparkles',
        textColor: 'text-[#2563EB] dark:text-[#22D3EE]',
      };
    default:
      return {
        label: tr(lang, 'Regular', 'सामान्य'),
        icon: 'check',
        textColor: 'text-[#16A34A]',
      };
  }
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

const PAGE_SIZE = 8;

export const Customer360: React.FC<Customer360Props> = ({
  language = 'en',
  customers,
  onRefresh,
  onNotify,
  onOpenInbox,
  onNavigateTab,
  compactLanding = false,
  initialCustomerId = null,
  onClearInitialCustomer,
}) => {
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState('all');
  const [sort, setSort] = useState('recent');
  const [page, setPage] = useState(1);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [drawerData, setDrawerData] = useState<CustomerDetailPayload | null>(null);
  const [loadingDrawer, setLoadingDrawer] = useState(false);

  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newProduct, setNewProduct] = useState('');
  const [newCadence, setNewCadence] = useState(30);
  const [newUdhaar, setNewUdhaar] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const [orderItemName, setOrderItemName] = useState('');
  const [orderAmount, setOrderAmount] = useState(1150);
  const [recordingOrder, setRecordingOrder] = useState(false);

  const openCustomerDrawer = async (customerId: string) => {
    setLoadingDrawer(true);
    try {
      const data = await apiRequest<CustomerDetailPayload>(`/api/customers/${customerId}`);
      setDrawerData(data);
    } catch (err: unknown) {
      onNotify(
        err instanceof Error
          ? err.message
          : tr(language, 'Failed to load customer timeline.', 'ग्राहक विवरण लोड नहीं हो सका।')
      );
    } finally {
      setLoadingDrawer(false);
    }
  };

  useEffect(() => {
    if (initialCustomerId) {
      openCustomerDrawer(initialCustomerId);
      onClearInitialCustomer?.();
    }
  }, [initialCustomerId]);

  useEffect(() => {
    setPage(1);
  }, [search, segment, sort]);

  useEffect(() => {
    if (!drawerData && !addModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDrawerData(null);
        setAddModalOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drawerData, addModalOpen]);

  const filtered = customers
    .filter((c) => {
      if (segment !== 'all' && c.segment !== segment) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.city.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          c.last_product_ordered.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sort === 'spent_desc') return b.total_spent - a.total_spent;
      if (sort === 'udhaar_desc') return b.outstanding_udhaar - a.outstanding_udhaar;
      if (sort === 'inactive_desc') return b.days_since_last_order - a.days_since_last_order;
      return a.name.localeCompare(b.name);
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const displayList = compactLanding
    ? filtered.slice(0, 4)
    : filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleToggleOptOut = async (customer: CustomerRecord) => {
    try {
      const nextOptOut = customer.opted_out === 0;
      await apiRequest(`/api/customers/${customer.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ optedOut: nextOptOut, consentWhatsApp: !nextOptOut }),
      });
      onNotify(
        nextOptOut
          ? tr(
              language,
              `${customer.name} opted out. Future sends are blocked automatically.`,
              `${customer.name} ऑप्ट-आउट हो गए। आगे संदेश अपने आप रुक जाएंगे।`
            )
          : tr(
              language,
              `${customer.name} WhatsApp consent enabled.`,
              `${customer.name} के लिए WhatsApp सहमति चालू हो गई।`
            )
      );
      onRefresh();
      if (drawerData?.customer.id === customer.id) {
        openCustomerDrawer(customer.id);
      }
    } catch (err: unknown) {
      onNotify(err instanceof Error ? err.message : tr(language, 'Update failed.', 'अपडेट विफल रहा।'));
    }
  };

  const handlePrepareFollowup = async (customerId: string) => {
    try {
      const res = await apiRequest<{ message: string }>('/api/workflows/run', {
        method: 'POST',
        body: JSON.stringify({ workflowType: 'reactivation', targetCustomerId: customerId }),
      });
      onNotify(res.message);
      onRefresh();
      onOpenInbox();
    } catch (err: unknown) {
      onNotify(
        err instanceof Error
          ? err.message
          : tr(language, 'Could not prepare follow-up.', 'संदेश तैयार नहीं हो सका।')
      );
    }
  };

  const handleRecordRepeatOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!drawerData) return;
    setRecordingOrder(true);
    try {
      const itemLabel =
        orderItemName.trim() || drawerData.customer.last_product_ordered || 'Repeat Pack';
      await apiRequest('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          customerId: drawerData.customer.id,
          items: [itemLabel],
          totalAmount: Math.max(1, Number(orderAmount || 1000)),
          paymentMode: 'Prepaid_UPI',
        }),
      });
      setOrderOpen(false);
      onNotify(
        tr(
          language,
          `Repeat order recorded for ${drawerData.customer.name}.`,
          `${drawerData.customer.name} के लिए नया रीऑर्डर दर्ज हो गया।`
        )
      );
      onRefresh();
      openCustomerDrawer(drawerData.customer.id);
    } catch (err: unknown) {
      onNotify(
        err instanceof Error ? err.message : tr(language, 'Could not record order.', 'ऑर्डर दर्ज नहीं हो सका।')
      );
    } finally {
      setRecordingOrder(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiRequest('/api/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: newName,
          phone: newPhone,
          city: newCity,
          lastProductOrdered: newProduct,
          averageCadenceDays: newCadence,
          outstandingUdhaar: newUdhaar,
        }),
      });
      setAddModalOpen(false);
      setNewName('');
      setNewPhone('');
      setNewCity('');
      setNewProduct('');
      setNewUdhaar(0);
      onNotify(tr(language, `Customer ${newName} added.`, `ग्राहक ${newName} जुड़ गया।`));
      onRefresh();
    } catch (err: unknown) {
      onNotify(
        err instanceof Error
          ? err.message
          : tr(language, 'Failed to create customer.', 'ग्राहक जोड़ने में त्रुटि हुई।')
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {!compactLanding && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-xs font-semibold text-[#2563EB] dark:text-[#22D3EE]">
              {tr(
                language,
                'Customer Intelligence Graph · RFM Cadence & Udhaar Memory',
                'ग्राहक इंटेलिजेंस ग्राफ · रीऑर्डर चक्र और उधार मेमोरी'
              )}
            </div>
            <h2 className="text-xl font-extrabold text-[#071A35] dark:text-white tracking-tight">
              {tr(language, 'Customer 360', 'ग्राहक 360')}
            </h2>
          </div>
          <span className="text-xs text-[#64748B] dark:text-[#94A3B8] tabular-nums">
            {filtered.length} {tr(language, 'profiles tracked', 'प्रोफ़ाइल ट्रैक')}
          </span>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#0B1E40] border border-[#E2E8F0] dark:border-[#1E3A5F] rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tr(
                language,
                'Search name, city, phone, product...',
                'नाम, शहर, फोन या उत्पाद खोजें...'
              )}
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#061533] text-xs"
            />
          </div>
          {!compactLanding && (
            <>
              <select
                aria-label={tr(language, 'Filter customer group', 'ग्राहक वर्ग चुनें')}
                value={segment}
                onChange={(e) => setSegment(e.target.value)}
                className="h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#061533] text-xs font-semibold"
              >
                <option value="all">{tr(language, 'All Customers', 'सभी ग्राहक')}</option>
                <option value="reorder_due">{tr(language, 'Reorder Due', 'रीऑर्डर का समय')}</option>
                <option value="inactive">{tr(language, 'Inactive', 'निष्क्रिय')}</option>
                <option value="high_udhaar">{tr(language, 'Payment Pending', 'भुगतान बाकी')}</option>
                <option value="first_time">{tr(language, 'First-Time Buyer', 'नए ग्राहक')}</option>
                <option value="loyal">{tr(language, 'Loyal Buyer', 'नियमित ग्राहक')}</option>
              </select>
              <select
                aria-label={tr(language, 'Sort customers', 'ग्राहक क्रम')}
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#061533] text-xs font-semibold"
              >
                <option value="recent">{tr(language, 'Sort: Name', 'क्रम: नाम')}</option>
                <option value="spent_desc">{tr(language, 'Highest Spend', 'सबसे अधिक खर्च')}</option>
                <option value="udhaar_desc">{tr(language, 'Highest Pending Payment', 'सबसे अधिक उधार')}</option>
                <option value="inactive_desc">
                  {tr(language, 'Longest Since Last Order', 'सबसे पुराना ऑर्डर')}
                </option>
              </select>
            </>
          )}
        </div>

        <button
          onClick={() => setAddModalOpen(true)}
          className="h-9 px-3.5 rounded-lg bg-[#2563EB] hover:bg-[#071A35] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>{tr(language, 'Add Customer', 'ग्राहक जोड़ें')}</span>
        </button>
      </div>

      {/* Customer Visual Cards */}
      {displayList.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-[#CBD5E1] dark:border-[#1E3A5F] text-center space-y-3">
          <p className="text-sm font-bold text-[#071A35] dark:text-white">
            {tr(language, 'No customers match this view.', 'कोई ग्राहक नहीं मिला।')}
          </p>
          <p className="text-xs text-[#64748B]">
            {tr(
              language,
              'Add your first customer or upload a store CSV to populate Customer Memory.',
              'ग्राहक मेमोरी शुरू करने के लिए ग्राहक जोड़ें या CSV अपलोड करें।'
            )}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <button
              onClick={() => setAddModalOpen(true)}
              className="h-9 px-3.5 rounded-lg bg-[#2563EB] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{tr(language, 'Add Customer', 'ग्राहक जोड़ें')}</span>
            </button>
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('import')}
                className="h-9 px-3.5 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{tr(language, 'Upload CSV', 'CSV अपलोड')}</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {displayList.map((c) => {
              const st = getStatusDisplay(language, c.segment, Number(c.outstanding_udhaar));
              const aov = Math.round(
                Number(c.total_spent || 0) / Math.max(1, Number(c.total_orders || 1))
              );

              return (
                <div
                  key={c.id}
                  className="rounded-2xl border border-[#E2E8F0] dark:border-[#1E3A5F] bg-white dark:bg-[#0B1E40] p-4 flex flex-col justify-between gap-3 hover:border-[#2563EB] transition-colors"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-[#EFF6FF] dark:bg-[#071A35] text-[#2563EB] dark:text-[#22D3EE] font-extrabold text-xs flex items-center justify-center shrink-0">
                          {getInitials(c.name)}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-extrabold text-[#071A35] dark:text-white truncate">
                            {c.name}
                          </h4>
                          <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] truncate">
                            {c.city || 'India'} · {c.total_orders} {tr(language, 'orders', 'ऑर्डर')}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className={`font-bold flex items-center gap-1.5 ${st.textColor}`}>
                        {st.icon === 'check' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        ) : st.icon === 'refresh' ? (
                          <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                        ) : st.icon === 'alert' ? (
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        ) : st.icon === 'sparkles' ? (
                          <Sparkles className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span>{st.label}</span>
                      </span>
                      <span className="font-bold text-[#071A35] dark:text-white tabular-nums">
                        ₹{Number(c.total_spent).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <p className="text-xs text-[#475569] dark:text-[#CBD5E1] line-clamp-2">
                      {c.last_product_ordered
                        ? `${tr(language, 'Usual item', 'पसंदीदा सामान')}: ${c.last_product_ordered}`
                        : c.ai_insight ||
                          tr(language, 'Ready for purchase tracking', 'खरीद ट्रैकिंग के लिए तैयार')}
                    </p>

                    <div className="grid grid-cols-3 gap-1.5 pt-1 text-[11px]">
                      <div className="p-2 rounded-lg bg-[#F8FAFC] dark:bg-[#061533]">
                        <div className="text-[#64748B]">{tr(language, 'Last order', 'पिछला ऑर्डर')}</div>
                        <div className="font-bold tabular-nums text-[#071A35] dark:text-white">
                          {c.days_since_last_order}
                          {tr(language, 'd ago', ' दिन')}
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-[#F8FAFC] dark:bg-[#061533]">
                        <div className="text-[#64748B]">{tr(language, 'Avg order', 'औसत बिल')}</div>
                        <div className="font-bold tabular-nums text-[#071A35] dark:text-white">
                          ₹{aov.toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-[#F8FAFC] dark:bg-[#061533]">
                        <div className="text-[#64748B]">{tr(language, 'Pending', 'उधार')}</div>
                        <div
                          className={`font-bold tabular-nums ${
                            Number(c.outstanding_udhaar) > 0
                              ? 'text-[#D97706]'
                              : 'text-[#071A35] dark:text-white'
                          }`}
                        >
                          ₹{Number(c.outstanding_udhaar).toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#E2E8F0] dark:border-[#1E3A5F]">
                    <button
                      onClick={() => openCustomerDrawer(c.id)}
                      className="text-xs font-bold text-[#2563EB] dark:text-[#22D3EE] hover:underline cursor-pointer"
                    >
                      {tr(language, 'View Profile', 'प्रोफ़ाइल देखें')}
                    </button>
                    <button
                      onClick={() => handlePrepareFollowup(c.id)}
                      disabled={c.opted_out === 1}
                      className="px-2.5 py-1 rounded-lg bg-[#EFF6FF] dark:bg-[#071A35] text-[11px] font-bold text-[#2563EB] dark:text-[#22D3EE] disabled:opacity-40 cursor-pointer"
                    >
                      {c.opted_out === 1
                        ? tr(language, 'Opted Out', 'ऑप्ट-आउट')
                        : tr(language, 'Send Reminder', 'रिमाइंडर तैयार करें')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {!compactLanding && totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-[#64748B] pt-1">
              <span className="tabular-nums">
                {tr(language, 'Page', 'पृष्ठ')} {safePage} / {totalPages} · {filtered.length}{' '}
                {tr(language, 'customers', 'ग्राहक')}
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

      {/* Customer Profile & Unified Timeline Drawer */}
      {(drawerData || loadingDrawer) && (
        <div className="fixed inset-0 z-50 bg-black/60 flex justify-end">
          <div className="w-full max-w-xl bg-white dark:bg-[#0B1E40] h-full overflow-y-auto p-6 space-y-5 shadow-2xl border-l border-[#CBD5E1] dark:border-[#1E3A5F]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                {drawerData && (
                  <div className="w-11 h-11 rounded-full bg-[#2563EB] text-white font-extrabold text-sm flex items-center justify-center shrink-0">
                    {getInitials(drawerData.customer.name)}
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-extrabold text-[#071A35] dark:text-white">
                    {drawerData?.customer.name || tr(language, 'Loading...', 'लोड हो रहा है...')}
                  </h3>
                  {drawerData && (
                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" /> {drawerData.customer.phone}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" /> {drawerData.customer.city},{' '}
                        {drawerData.customer.state}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => setDrawerData(null)}
                className="p-2 rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-[#061533] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {drawerData && (
              <>
                <div className="grid grid-cols-3 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#061533]">
                    <div className="text-[#64748B]">{tr(language, 'Total Orders', 'कुल ऑर्डर')}</div>
                    <div className="text-base font-extrabold tabular-nums text-[#071A35] dark:text-white">
                      {drawerData.customer.total_orders}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#061533]">
                    <div className="text-[#64748B]">{tr(language, 'Total Spent', 'कुल खरीद')}</div>
                    <div className="text-base font-extrabold tabular-nums text-[#071A35] dark:text-white">
                      ₹{Number(drawerData.customer.total_spent).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#061533]">
                    <div className="text-[#64748B]">{tr(language, 'Pending Payment', 'बाकी उधार')}</div>
                    <div className="text-base font-extrabold tabular-nums text-[#D97706]">
                      ₹{Number(drawerData.customer.outstanding_udhaar).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#EFF6FF] dark:bg-[#061533] border border-[#BFDBFE] dark:border-[#1E3A5F] space-y-1.5 text-xs">
                  <div className="font-bold text-[#2563EB] dark:text-[#22D3EE] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    <span>{tr(language, 'Customer Memory', 'ग्राहक मेमोरी')}</span>
                  </div>
                  <p className="text-[#071A35] dark:text-white">{drawerData.customer.ai_insight}</p>
                  {drawerData.customer.notes && (
                    <p className="text-[#64748B] dark:text-[#94A3B8]">{drawerData.customer.notes}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handlePrepareFollowup(drawerData.customer.id)}
                    disabled={drawerData.customer.opted_out === 1}
                    className="h-9 px-4 rounded-lg bg-[#2563EB] hover:bg-[#071A35] text-white text-xs font-bold cursor-pointer disabled:opacity-40"
                  >
                    {tr(language, 'Prepare Reminder', 'रिमाइंडर तैयार करें')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOrderItemName(drawerData.customer.last_product_ordered || 'Regular Pack');
                      setOrderAmount(
                        Math.max(
                          450,
                          Math.round(
                            Number(drawerData.customer.total_spent || 1150) /
                              Math.max(1, Number(drawerData.customer.total_orders || 1))
                          )
                        )
                      );
                      setOrderOpen((v) => !v);
                    }}
                    className="h-9 px-3 rounded-lg border border-[#16A34A] text-[#16A34A] hover:bg-[#16A34A] hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>{tr(language, 'Record Repeat Order', 'नया रीऑर्डर दर्ज करें')}</span>
                  </button>
                  <button
                    onClick={() => handleToggleOptOut(drawerData.customer)}
                    className="h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    {drawerData.customer.opted_out === 1 ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                        <span>{tr(language, 'Re-enable WhatsApp Consent', 'सहमति दोबारा चालू करें')}</span>
                      </>
                    ) : (
                      <>
                        <ShieldOff className="w-3.5 h-3.5 text-[#DC2626]" />
                        <span>{tr(language, 'Mark Opted Out', 'ऑप्ट-आउट चिह्नित करें')}</span>
                      </>
                    )}
                  </button>
                </div>

                {orderOpen && (
                  <form
                    onSubmit={handleRecordRepeatOrder}
                    className="p-3.5 rounded-xl bg-[#EFF6FF] dark:bg-[#061533] border border-[#BFDBFE] dark:border-[#1E3A5F] space-y-2.5 text-xs"
                  >
                    <div className="font-bold text-[#071A35] dark:text-white">
                      {tr(
                        language,
                        'Log Repeat Order (verifies open recovery workflows automatically)',
                        'रीऑर्डर दर्ज करें (खुले रिकवरी कार्य अपने आप सत्यापित होंगे)'
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={orderItemName}
                        onChange={(e) => setOrderItemName(e.target.value)}
                        placeholder={tr(language, 'Product name', 'उत्पाद का नाम')}
                        className="h-8 px-2.5 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#0B1E40]"
                      />
                      <input
                        type="number"
                        min={1}
                        value={orderAmount}
                        onChange={(e) => setOrderAmount(Number(e.target.value))}
                        placeholder="₹"
                        className="h-8 px-2.5 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#0B1E40] tabular-nums"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={recordingOrder}
                        className="h-8 px-3 rounded-lg bg-[#16A34A] text-white font-bold cursor-pointer disabled:opacity-50"
                      >
                        {recordingOrder
                          ? tr(language, 'Saving...', 'सहेज रहे हैं...')
                          : tr(language, 'Save Prepaid Order', 'प्रीपेड ऑर्डर सहेजें')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrderOpen(false)}
                        className="h-8 px-3 rounded-lg border border-[#CBD5E1] font-semibold cursor-pointer"
                      >
                        {tr(language, 'Cancel', 'रद्द करें')}
                      </button>
                    </div>
                  </form>
                )}

                {/* Unified Chronological Customer Activity Timeline */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748B] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />{' '}
                    {tr(language, 'Customer Activity Timeline', 'ग्राहक गतिविधि टाइमलाइन')}
                  </h4>
                  {(drawerData.timeline?.length || 0) === 0 ? (
                    <p className="text-xs text-[#64748B]">
                      {tr(language, 'No activity recorded yet.', 'अभी कोई गतिविधि दर्ज नहीं है।')}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {drawerData.timeline!.map((ev) => {
                        const icon =
                          ev.type === 'order' ? (
                            <ShoppingBag className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#22D3EE]" />
                          ) : ev.type === 'payment' ? (
                            <IndianRupee className="w-3.5 h-3.5 text-[#16A34A]" />
                          ) : ev.type === 'message' ? (
                            <MessageSquare className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#22D3EE]" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5 text-[#D97706]" />
                          );

                        return (
                          <div
                            key={`${ev.type}-${ev.id}`}
                            className="p-3 rounded-xl border border-[#E2E8F0] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#061533] text-xs flex items-start justify-between gap-3"
                          >
                            <div className="flex items-start gap-2.5 min-w-0">
                              <div className="mt-0.5 shrink-0">{icon}</div>
                              <div className="min-w-0">
                                <div className="font-bold text-[#071A35] dark:text-white">{ev.title}</div>
                                <div className="text-[#475569] dark:text-[#CBD5E1] break-words">
                                  {ev.subtitle}
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              {ev.amount !== undefined && (
                                <div className="font-extrabold tabular-nums text-[#071A35] dark:text-white">
                                  ₹{Number(ev.amount).toLocaleString('en-IN')}
                                </div>
                              )}
                              <div className="text-[11px] text-[#64748B]">
                                {localizeWorkflowStatus(language, ev.status)}
                              </div>
                              <div className="text-[10px] text-[#64748B] tabular-nums">
                                {ev.timestamp.slice(0, 10)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0B1E40] border border-[#CBD5E1] dark:border-[#1E3A5F] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-[#071A35] dark:text-white">
                {tr(language, 'Add New Customer', 'नया ग्राहक जोड़ें')}
              </h3>
              <button onClick={() => setAddModalOpen(false)} className="p-1.5 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">
                  {tr(language, 'Full Name *', 'पूरा नाम *')}
                </label>
                <input
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={tr(language, 'e.g. Ramesh Kulkarni', 'उदा. रमेश कुलकर्णी')}
                  className="w-full h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#061533]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">
                    {tr(language, 'WhatsApp Phone *', 'WhatsApp नंबर *')}
                  </label>
                  <input
                    required
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="+91 98..."
                    className="w-full h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#061533]"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">{tr(language, 'City', 'शहर')}</label>
                  <input
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    placeholder={tr(language, 'Pune', 'पुणे')}
                    className="w-full h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#061533]"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">
                  {tr(language, 'Regular Product', 'नियमित उत्पाद')}
                </label>
                <input
                  value={newProduct}
                  onChange={(e) => setNewProduct(e.target.value)}
                  placeholder={tr(language, 'e.g. Organic Tea 1kg', 'उदा. ऑर्गेनिक चाय 1kg')}
                  className="w-full h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#061533]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">
                    {tr(language, 'Usual Reorder Days', 'रीऑर्डर अंतराल (दिन)')}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={newCadence}
                    onChange={(e) => setNewCadence(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#061533]"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">
                    {tr(language, 'Pending Balance (₹)', 'बाकी उधार (₹)')}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={newUdhaar}
                    onChange={(e) => setNewUdhaar(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#061533]"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full h-10 rounded-lg bg-[#2563EB] hover:bg-[#071A35] text-white font-bold cursor-pointer disabled:opacity-50"
              >
                {submitting
                  ? tr(language, 'Saving...', 'सहेज रहे हैं...')
                  : tr(language, 'Save Customer', 'ग्राहक सहेजें')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
