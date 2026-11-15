import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  X,
  Package,
  Truck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Eye,
  ChevronLeft,
  ChevronRight,
  Upload,
} from 'lucide-react';
import { AppLanguage, ConsoleTabId, CustomerRecord, OrderRecord } from '../../types';
import { apiRequest } from '../../lib/api';
import { OrderDetailModal } from './OrderDetailModal';
import { localizeOrderStatus, localizePaymentMode, tr } from '../../i18n/translations';

interface OrdersViewProps {
  language?: AppLanguage;
  orders: OrderRecord[];
  customers: CustomerRecord[];
  onRefresh: () => void;
  onNotify: (msg: string) => void;
  onNavigateTab?: (tab: ConsoleTabId) => void;
}

const PAGE_SIZE = 10;

export const OrdersView: React.FC<OrdersViewProps> = ({
  language = 'en',
  orders,
  customers,
  onRefresh,
  onNotify,
  onNavigateTab,
}) => {
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<
    'all' | 'COD' | 'Prepaid_UPI' | 'Prepaid_Card' | 'Udhaar'
  >('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [customerId, setCustomerId] = useState(customers[0]?.id || '');
  const [itemName, setItemName] = useState('');
  const [totalAmount, setTotalAmount] = useState(1250);
  const [paymentMode, setPaymentMode] = useState<'COD' | 'Prepaid_UPI' | 'Prepaid_Card' | 'Udhaar'>(
    'COD'
  );
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [search, paymentFilter, statusFilter]);

  useEffect(() => {
    if (!createOpen || selectedOrderId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCreateOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [createOpen, selectedOrderId]);

  const filtered = orders.filter((o) => {
    if (paymentFilter !== 'all' && o.payment_mode !== paymentFilter) return false;
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        o.order_number.toLowerCase().includes(q) ||
        (o.customer_name || '').toLowerCase().includes(q) ||
        (o.delivery_address || '').toLowerCase().includes(q) ||
        (o.pincode || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageOrders = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || totalAmount <= 0) return;
    setSaving(true);
    try {
      const res = await apiRequest<{ order: OrderRecord; risk?: { band: string; score: number } }>(
        '/api/orders',
        {
          method: 'POST',
          body: JSON.stringify({
            customerId,
            items: itemName.trim() ? [itemName.trim()] : ['Store Order'],
            totalAmount,
            paymentMode,
            deliveryAddress: address,
            pincode,
          }),
        }
      );
      setCreateOpen(false);
      setItemName('');
      setAddress('');
      setPincode('');
      onNotify(
        paymentMode === 'COD' && (res.risk?.score || 0) >= 50
          ? tr(
              language,
              `Order ${res.order.order_number} added and flagged for address review.`,
              `ऑर्डर ${res.order.order_number} जोड़ा गया और पता जांच के लिए चिह्नित किया गया।`
            )
          : tr(
              language,
              `Order ${res.order.order_number} recorded.`,
              `ऑर्डर ${res.order.order_number} दर्ज हो गया।`
            )
      );
      onRefresh();
    } catch (err: unknown) {
      onNotify(
        err instanceof Error
          ? err.message
          : tr(language, 'Could not create order.', 'ऑर्डर बन नहीं सका।')
      );
    } finally {
      setSaving(false);
    }
  };

  const codCount = orders.filter((o) => o.payment_mode === 'COD').length;
  const prepaidCount = orders.filter((o) => o.payment_mode.startsWith('Prepaid')).length;
  const deliveredCount = orders.filter((o) => o.status === 'Delivered').length;
  const flaggedCount = orders.filter((o) => o.status === 'Pending_Verification').length;

  return (
    <div className="space-y-5">
      {/* Header + Quick Summary */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E2E8F0] dark:border-[#1E3A5F] bg-white dark:bg-[#0B1E40] p-4">
        <div className="flex flex-wrap items-center gap-6 text-xs">
          <div>
            <div className="text-[#64748B] dark:text-[#94A3B8]">
              {tr(language, 'Total Orders', 'कुल ऑर्डर')}
            </div>
            <div className="text-lg font-extrabold text-[#071A35] dark:text-white tabular-nums">
              {orders.length}
            </div>
          </div>
          <div>
            <div className="text-[#64748B] dark:text-[#94A3B8]">
              {tr(language, 'Prepaid', 'प्रीपेड')}
            </div>
            <div className="text-lg font-extrabold text-[#16A34A] tabular-nums">{prepaidCount}</div>
          </div>
          <div>
            <div className="text-[#64748B] dark:text-[#94A3B8]">
              {tr(language, 'Cash on Delivery', 'कैश ऑन डिलीवरी (COD)')}
            </div>
            <div className="text-lg font-extrabold text-[#2563EB] dark:text-[#22D3EE] tabular-nums">
              {codCount}
            </div>
          </div>
          <div>
            <div className="text-[#64748B] dark:text-[#94A3B8]">
              {tr(language, 'Needs Check', 'जांच बाकी')}
            </div>
            <div className="text-lg font-extrabold text-[#D97706] tabular-nums">{flaggedCount}</div>
          </div>
          <div>
            <div className="text-[#64748B] dark:text-[#94A3B8]">
              {tr(language, 'Delivered', 'डिलीवर हुए')}
            </div>
            <div className="text-lg font-extrabold text-[#071A35] dark:text-white tabular-nums">
              {deliveredCount}
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            const first = customers[0];
            setCustomerId(first?.id || '');
            setAddress(first?.address_line || '');
            setPincode(first?.pincode || '');
            setCreateOpen(true);
          }}
          disabled={customers.length === 0}
          className="h-9 px-4 rounded-lg bg-[#2563EB] hover:bg-[#071A35] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{tr(language, 'Add Order', 'ऑर्डर जोड़ें')}</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tr(
              language,
              'Search order ID, buyer, city, pincode...',
              'ऑर्डर नंबर, ग्राहक, शहर या पिनकोड खोजें...'
            )}
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#0B1E40] text-xs"
          />
        </div>
        <select
          aria-label={tr(language, 'Filter payment mode', 'भुगतान माध्यम चुनें')}
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value as typeof paymentFilter)}
          className="h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#0B1E40] text-xs font-semibold"
        >
          <option value="all">{tr(language, 'All Payment Modes', 'सभी भुगतान माध्यम')}</option>
          <option value="COD">{tr(language, 'Cash on Delivery (COD)', 'कैश ऑन डिलीवरी (COD)')}</option>
          <option value="Prepaid_UPI">{tr(language, 'UPI Prepaid', 'UPI प्रीपेड')}</option>
          <option value="Prepaid_Card">{tr(language, 'Card Prepaid', 'कार्ड प्रीपेड')}</option>
          <option value="Udhaar">{tr(language, 'Khata / Udhaar', 'खाता / उधार')}</option>
        </select>
        <select
          aria-label={tr(language, 'Filter order status', 'ऑर्डर स्थिति चुनें')}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#0B1E40] text-xs font-semibold"
        >
          <option value="all">{tr(language, 'All Statuses', 'सभी स्थितियां')}</option>
          <option value="Pending_Verification">{tr(language, 'Needs Verification', 'जांच बाकी')}</option>
          <option value="In_Transit">{tr(language, 'In Transit', 'रास्ते में')}</option>
          <option value="Delivered">{tr(language, 'Delivered', 'डिलीवर')}</option>
          <option value="RTO_Returned">{tr(language, 'Returned (RTO)', 'रिटर्न (RTO)')}</option>
        </select>
      </div>

      {/* Order Table */}
      {filtered.length === 0 ? (
        <div className="p-10 rounded-2xl border border-dashed border-[#CBD5E1] dark:border-[#1E3A5F] text-center space-y-3">
          <Package className="w-8 h-8 text-[#94A3B8] mx-auto" />
          <p className="text-sm font-bold text-[#071A35] dark:text-white">
            {tr(language, 'No orders match this view', 'इस फ़िल्टर में कोई ऑर्डर नहीं है')}
          </p>
          <p className="text-xs text-[#64748B]">
            {tr(
              language,
              'Add a new order or import your store orders CSV in Settings.',
              'नया ऑर्डर जोड़ें या सेटिंग्स से ऑर्डर CSV अपलोड करें।'
            )}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <button
              disabled={customers.length === 0}
              onClick={() => setCreateOpen(true)}
              className="h-9 px-3.5 rounded-lg bg-[#2563EB] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{tr(language, 'Add Order', 'ऑर्डर जोड़ें')}</span>
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
          <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#1E3A5F] bg-white dark:bg-[#0B1E40] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] dark:bg-[#061533] border-b border-[#E2E8F0] dark:border-[#1E3A5F] text-[#64748B] dark:text-[#94A3B8]">
                  <tr>
                    <th className="py-3 px-4 font-bold">{tr(language, 'Order', 'ऑर्डर')}</th>
                    <th className="py-3 px-4 font-bold">{tr(language, 'Customer', 'ग्राहक')}</th>
                    <th className="py-3 px-4 font-bold">{tr(language, 'Payment', 'भुगतान')}</th>
                    <th className="py-3 px-4 font-bold">{tr(language, 'Status', 'स्थिति')}</th>
                    <th className="py-3 px-4 font-bold text-right">{tr(language, 'Amount', 'राशि')}</th>
                    <th className="py-3 px-4 font-bold text-right">{tr(language, 'Action', 'कार्रवाई')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1E3A5F]">
                  {pageOrders.map((o) => {
                    const statusIcon =
                      o.status === 'Delivered' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                      ) : o.status === 'Pending_Verification' ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-[#D97706]" />
                      ) : o.status === 'RTO_Returned' ? (
                        <RotateCcw className="w-3.5 h-3.5 text-[#DC2626]" />
                      ) : (
                        <Truck className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#22D3EE]" />
                      );

                    return (
                      <tr
                        key={o.id}
                        onClick={() => setSelectedOrderId(o.id)}
                        className="hover:bg-[#F8FAFC] dark:hover:bg-[#061533] cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="font-bold text-[#071A35] dark:text-white tabular-nums">
                            {o.order_number}
                          </div>
                          <div className="text-[11px] text-[#64748B] tabular-nums">{o.ordered_at}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[#071A35] dark:text-white">
                            {o.customer_name || tr(language, 'Customer', 'ग्राहक')}
                          </div>
                          <div className="text-[11px] text-[#64748B]">
                            {o.customer_city || o.pincode || 'India'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-[#334155] dark:text-[#CBD5E1]">
                            {localizePaymentMode(language, o.payment_mode)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1.5 font-semibold text-[#071A35] dark:text-white">
                            {statusIcon}
                            <span>{localizeOrderStatus(language, o.status)}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-extrabold text-[#071A35] dark:text-white tabular-nums">
                          ₹{Number(o.total_amount).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOrderId(o.id);
                            }}
                            className="h-7 px-2.5 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] hover:border-[#2563EB] text-[11px] font-bold text-[#2563EB] dark:text-[#22D3EE] inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>{tr(language, 'Details', 'विवरण')}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-[#64748B]">
              <span className="tabular-nums">
                {tr(language, 'Page', 'पृष्ठ')} {safePage} / {totalPages} · {filtered.length}{' '}
                {tr(language, 'orders', 'ऑर्डर')}
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

      {/* Order Detail Modal */}
      <OrderDetailModal
        language={language}
        orderId={selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
        onRefresh={onRefresh}
        onNotify={onNotify}
      />

      {/* Add Order Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0B1E40] border border-[#CBD5E1] dark:border-[#1E3A5F] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-[#071A35] dark:text-white">
                {tr(language, 'Add New Order', 'नया ऑर्डर जोड़ें')}
              </h3>
              <button onClick={() => setCreateOpen(false)} className="p-1.5 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateOrder} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">
                  {tr(language, 'Customer *', 'ग्राहक *')}
                </label>
                <select
                  value={customerId}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    setCustomerId(nextId);
                    const c = customers.find((x) => x.id === nextId);
                    if (c) {
                      setAddress(c.address_line || '');
                      setPincode(c.pincode || '');
                    }
                  }}
                  className="w-full h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#061533]"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.city || c.phone})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">
                  {tr(language, 'Product / Items', 'उत्पाद / सामान')}
                </label>
                <input
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder={tr(language, 'e.g. Organic Tea 1kg', 'उदा. ऑर्गेनिक चाय 1kg')}
                  className="w-full h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#061533]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">
                    {tr(language, 'Order Amount (₹) *', 'ऑर्डर राशि (₹) *')}
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#061533]"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">
                    {tr(language, 'Payment Mode', 'भुगतान माध्यम')}
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as typeof paymentMode)}
                    className="w-full h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#061533]"
                  >
                    <option value="COD">{tr(language, 'Cash on Delivery (COD)', 'कैश ऑन डिलीवरी (COD)')}</option>
                    <option value="Prepaid_UPI">{tr(language, 'Prepaid UPI', 'UPI प्रीपेड')}</option>
                    <option value="Prepaid_Card">{tr(language, 'Prepaid Card', 'कार्ड प्रीपेड')}</option>
                    <option value="Udhaar">{tr(language, 'Store Khata / Udhaar', 'दुकान खाता / उधार')}</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-semibold mb-1">
                    {tr(language, 'Delivery Address', 'डिलीवरी पता')}
                  </label>
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder={tr(language, 'House/Flat No, Street...', 'मकान/फ्लैट नं, गली...')}
                    className="w-full h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#061533]"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">
                    {tr(language, 'Pincode', 'पिनकोड')}
                  </label>
                  <input
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="411001"
                    className="w-full h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#061533]"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full h-10 rounded-lg bg-[#2563EB] hover:bg-[#071A35] text-white font-bold cursor-pointer disabled:opacity-50"
              >
                {saving
                  ? tr(language, 'Saving...', 'सहेज रहे हैं...')
                  : tr(language, 'Save Order', 'ऑर्डर सहेजें')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
