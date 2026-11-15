import React, { useEffect, useState } from 'react';
import {
  X,
  MapPin,
  Phone,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Send,
  RefreshCw,
  Truck,
  PackageCheck,
  RotateCcw,
} from 'lucide-react';
import { AppLanguage, OrderRecord } from '../../types';
import { apiRequest } from '../../lib/api';
import { localizeOrderStatus, localizePaymentMode, tr } from '../../i18n/translations';

interface OrderDetailModalProps {
  language?: AppLanguage;
  orderId: string | null;
  onClose: () => void;
  onRefresh: () => void;
  onNotify: (msg: string) => void;
}

interface OrderDetailResponse {
  order: OrderRecord & {
    customer_total_spent?: number;
    cod_reliability_score?: number;
    consent_whatsapp?: number;
    opted_out?: number;
  };
  assessment?: {
    risk_score: number;
    risk_band: string;
    recommended_action: string;
    status: string;
  } | null;
  priorStats?: {
    prior_orders: number;
    delivered_orders: number;
    rto_orders: number;
  };
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  language = 'en',
  orderId,
  onClose,
  onRefresh,
  onNotify,
}) => {
  const [data, setData] = useState<OrderDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    apiRequest<OrderDetailResponse>(`/api/orders/${orderId}`)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled)
          onNotify(
            err instanceof Error
              ? err.message
              : tr(language, 'Failed to load order details.', 'ऑर्डर विवरण लोड नहीं हो सका।')
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId, onNotify, language]);

  useEffect(() => {
    if (!orderId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [orderId, onClose]);

  if (!orderId) return null;

  const handleAction = async (
    action: 'verify_address' | 'prepare_prepay' | 'escalate' | 'mark_delivered' | 'mark_rto'
  ) => {
    if (!data) return;
    setBusyAction(action);
    try {
      const res = await apiRequest<{ message: string }>(`/api/orders/${data.order.id}/action`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      onNotify(res.message);
      onRefresh();
      const updated = await apiRequest<OrderDetailResponse>(`/api/orders/${data.order.id}`);
      setData(updated);
    } catch (err: unknown) {
      onNotify(
        err instanceof Error
          ? err.message
          : tr(language, 'Order action failed.', 'ऑर्डर कार्रवाई विफल रही।')
      );
    } finally {
      setBusyAction(null);
    }
  };

  const order = data?.order;
  const score = Number(order?.cod_risk_score || 0);
  const riskLevel = score >= 60 ? 'high' : score >= 35 ? 'medium' : 'low';
  let reasons: string[] = [];
  let items: string[] = [];
  if (order) {
    try {
      reasons = JSON.parse(order.risk_reasons_json || '[]');
    } catch {
      reasons = [];
    }
    try {
      items = JSON.parse(order.items_json || '[]');
    } catch {
      items = [];
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-[#0B1E40] border border-[#CBD5E1] dark:border-[#1E3A5F] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-[#E2E8F0] dark:border-[#1E3A5F] flex items-center justify-between bg-[#F8FAFC] dark:bg-[#071A35]">
          <div>
            <div className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8]">
              {tr(language, 'Order Details', 'ऑर्डर विवरण')}
            </div>
            <h3 className="text-base font-extrabold text-[#071A35] dark:text-white tabular-nums">
              {order
                ? `${order.order_number} · ₹${Number(order.total_amount).toLocaleString('en-IN')}`
                : tr(language, 'Loading...', 'लोड हो रहा है...')}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label={tr(language, 'Close order details', 'ऑर्डर विवरण बंद करें')}
            className="p-2 rounded-lg hover:bg-[#E2E8F0] dark:hover:bg-[#061533] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {loading || !order ? (
            <div className="py-12 text-center text-[#64748B] flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>{tr(language, 'Loading order details...', 'ऑर्डर विवरण लोड हो रहा है...')}</span>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#061533] border border-[#E2E8F0] dark:border-[#1E3A5F]">
                  <div className="text-[#64748B] dark:text-[#94A3B8]">
                    {tr(language, 'Payment Mode', 'भुगतान माध्यम')}
                  </div>
                  <div className="font-extrabold text-[#071A35] dark:text-white mt-0.5">
                    {localizePaymentMode(language, order.payment_mode)}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#061533] border border-[#E2E8F0] dark:border-[#1E3A5F]">
                  <div className="text-[#64748B] dark:text-[#94A3B8]">
                    {tr(language, 'Delivery Status', 'डिलीवरी स्थिति')}
                  </div>
                  <div className="font-extrabold text-[#2563EB] dark:text-[#22D3EE] mt-0.5">
                    {localizeOrderStatus(language, order.status)}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#061533] border border-[#E2E8F0] dark:border-[#1E3A5F]">
                  <div className="text-[#64748B] dark:text-[#94A3B8]">
                    {tr(language, 'Return Risk', 'रिटर्न जोखिम')}
                  </div>
                  <div
                    className={`font-extrabold mt-0.5 flex items-center gap-1 ${
                      riskLevel === 'high'
                        ? 'text-[#DC2626]'
                        : riskLevel === 'medium'
                        ? 'text-[#D97706]'
                        : 'text-[#16A34A]'
                    }`}
                  >
                    {riskLevel === 'high' ? (
                      <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                    ) : riskLevel === 'medium' ? (
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>
                      {order.payment_mode !== 'COD'
                        ? tr(language, 'Low (Prepaid)', 'कम (प्रीपेड)')
                        : riskLevel === 'high'
                        ? `${tr(language, 'High Risk', 'उच्च जोखिम')} (${score})`
                        : riskLevel === 'medium'
                        ? `${tr(language, 'Needs Review', 'समीक्षा बाकी')} (${score})`
                        : `${tr(language, 'Low Risk', 'कम जोखिम')} (${score})`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[#E2E8F0] dark:border-[#1E3A5F] p-4 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-extrabold text-[#071A35] dark:text-white">
                      {order.customer_name || tr(language, 'Customer', 'ग्राहक')}
                    </div>
                    <div className="flex items-center gap-3 text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" /> {order.customer_phone || 'N/A'}
                      </span>
                      <span>{order.customer_city || 'India'}</span>
                    </div>
                  </div>
                  <div className="text-right tabular-nums text-[#475569] dark:text-[#CBD5E1]">
                    <div>
                      {tr(language, 'Prior orders', 'पिछले ऑर्डर')}: {data.priorStats?.prior_orders ?? 0}
                    </div>
                    <div>
                      {tr(language, 'Delivered', 'डिलीवर')}: {data.priorStats?.delivered_orders ?? 0} ·{' '}
                      {tr(language, 'Returned', 'वापस')}: {data.priorStats?.rto_orders ?? 0}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#1E3A5F] flex items-start gap-2 text-[#334155] dark:text-[#CBD5E1]">
                  <MapPin className="w-4 h-4 text-[#2563EB] dark:text-[#22D3EE] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">
                      {tr(language, 'Delivery Address:', 'डिलीवरी पता:')}
                    </span>{' '}
                    {order.delivery_address || tr(language, 'Address missing', 'पता उपलब्ध नहीं')}{' '}
                    {order.pincode
                      ? `— ${tr(language, 'Pincode', 'पिनकोड')} ${order.pincode}`
                      : `(${tr(language, 'No pincode', 'पिनकोड नहीं')})`}
                  </div>
                </div>

                {items.length > 0 && (
                  <div className="text-[#475569] dark:text-[#CBD5E1]">
                    <span className="font-semibold">{tr(language, 'Items:', 'सामान:')}</span>{' '}
                    {items.join(', ')}
                  </div>
                )}
              </div>

              {order.payment_mode === 'COD' && (
                <div className="rounded-xl bg-[#EFF6FF] dark:bg-[#061533] border border-[#BFDBFE] dark:border-[#1E3A5F] p-4 space-y-2">
                  <div className="font-bold text-[#071A35] dark:text-white flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-[#2563EB] dark:text-[#22D3EE]" />
                    <span>
                      {tr(language, 'Why this order was checked', 'इस ऑर्डर की जांच क्यों की गई')}
                    </span>
                  </div>
                  {reasons.length === 0 ? (
                    <p className="text-[#16A34A] font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      {tr(
                        language,
                        'Complete address and reliable buyer profile.',
                        'पूरा पता और भरोसेमंद ग्राहक प्रोफ़ाइल।'
                      )}
                    </p>
                  ) : (
                    <ul className="space-y-1.5 text-[#334155] dark:text-[#CBD5E1]">
                      {reasons.map((r) => (
                        <li key={r} className="flex items-start gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-[#D97706] shrink-0 mt-0.5" />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {data.assessment?.recommended_action && (
                    <div className="pt-1 font-semibold text-[#2563EB] dark:text-[#22D3EE]">
                      {tr(language, 'Suggested step:', 'सुझाया गया कदम:')}{' '}
                      {data.assessment.recommended_action}
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#E2E8F0] dark:border-[#1E3A5F]">
                {order.payment_mode === 'COD' && order.status === 'Pending_Verification' && (
                  <>
                    <button
                      disabled={busyAction !== null}
                      onClick={() => handleAction('prepare_prepay')}
                      className="h-9 px-3.5 rounded-lg bg-[#2563EB] hover:bg-[#071A35] text-white font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{tr(language, 'Prepare UPI Prepay Request', 'UPI प्रीपे अनुरोध बनाएं')}</span>
                    </button>
                    <button
                      disabled={busyAction !== null}
                      onClick={() => handleAction('verify_address')}
                      className="h-9 px-3.5 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] hover:border-[#16A34A] font-bold text-[#071A35] dark:text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                      <span>{tr(language, 'Verify Address', 'पता सत्यापित करें')}</span>
                    </button>
                    <button
                      disabled={busyAction !== null}
                      onClick={() => handleAction('escalate')}
                      className="h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] text-[#DC2626] font-semibold cursor-pointer disabled:opacity-50"
                    >
                      {tr(language, 'Manual Review / Call', 'मैन्युअल कॉल / समीक्षा')}
                    </button>
                  </>
                )}

                {order.status === 'In_Transit' && (
                  <>
                    <button
                      disabled={busyAction !== null}
                      onClick={() => handleAction('mark_delivered')}
                      className="h-9 px-3.5 rounded-lg bg-[#16A34A] text-white font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <PackageCheck className="w-3.5 h-3.5" />
                      <span>{tr(language, 'Mark Delivered', 'डिलीवर दर्ज करें')}</span>
                    </button>
                    <button
                      disabled={busyAction !== null}
                      onClick={() => handleAction('mark_rto')}
                      className="h-9 px-3.5 rounded-lg border border-[#FCA5A5] text-[#DC2626] font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{tr(language, 'Record Return (RTO)', 'रिटर्न (RTO) दर्ज करें')}</span>
                    </button>
                  </>
                )}

                {(order.status === 'Delivered' || order.status === 'RTO_Returned') && (
                  <div className="flex items-center gap-2 text-[#64748B] dark:text-[#94A3B8] font-semibold">
                    <Truck className="w-4 h-4" />
                    <span>
                      {tr(language, 'Outcome recorded:', 'परिणाम दर्ज:')}{' '}
                      {order.actual_outcome || localizeOrderStatus(language, order.status)}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
