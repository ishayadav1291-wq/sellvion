import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  Send,
  AlertTriangle,
  Calculator,
  X,
  RefreshCw,
  Eye,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { AppLanguage, OrderRecord } from '../types';
import { apiRequest } from '../lib/api';
import { OrderDetailModal } from './workspace/OrderDetailModal';
import { localizeOrderStatus, tr } from '../i18n/translations';

interface CodRiskScorerProps {
  language?: AppLanguage;
  orders: OrderRecord[];
  onRefresh: () => void;
  onNotify: (msg: string) => void;
  compactLanding?: boolean;
}

export const CodRiskScorer: React.FC<CodRiskScorerProps> = ({
  language = 'en',
  orders,
  onRefresh,
  onNotify,
  compactLanding = false,
}) => {
  const [filterStatus, setFilterStatus] = useState<
    'all' | 'Pending_Verification' | 'In_Transit' | 'Delivered' | 'RTO_Returned'
  >('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [calcOpen, setCalcOpen] = useState(false);
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);

  const [isFirstTimeBuyer, setIsFirstTimeBuyer] = useState(true);
  const [pincode, setPincode] = useState('141001');
  const [address, setAddress] = useState('Near Bus Stand, Ludhiana');
  const [amount, setAmount] = useState(2850);
  const [calcResult, setCalcResult] = useState<{
    score: number;
    band: string;
    reasons: string[];
    recommendedAction: string;
  } | null>(null);

  useEffect(() => {
    setPage(1);
  }, [search, filterStatus]);

  useEffect(() => {
    if (!calcOpen || detailOrderId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCalcOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [calcOpen, detailOrderId]);

  const PAGE_SIZE = 6;

  const codOrders = orders.filter((o) => {
    if (o.payment_mode !== 'COD') return false;
    if (filterStatus !== 'all' && o.status !== filterStatus) return false;
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

  const totalPages = Math.max(1, Math.ceil(codOrders.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const displayOrders = compactLanding
    ? codOrders.slice(0, 3)
    : codOrders.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const flaggedCount = orders.filter(
    (o) => o.payment_mode === 'COD' && o.status === 'Pending_Verification'
  ).length;
  const rtoCount = orders.filter(
    (o) => o.payment_mode === 'COD' && o.status === 'RTO_Returned'
  ).length;

  const handleOrderAction = async (
    orderId: string,
    action: 'verify_address' | 'prepare_prepay' | 'escalate' | 'mark_delivered' | 'mark_rto'
  ) => {
    setBusyId(orderId);
    try {
      const res = await apiRequest<{ message: string }>(`/api/orders/${orderId}/action`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      onNotify(res.message);
      onRefresh();
    } catch (err: unknown) {
      onNotify(
        err instanceof Error ? err.message : tr(language, 'Action failed.', 'कार्रवाई विफल रही।')
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleScoreCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest<{
        score: number;
        band: string;
        reasons: string[];
        recommendedAction: string;
      }>('/api/cod/score', {
        method: 'POST',
        body: JSON.stringify({ isFirstTimeBuyer, pincode, address, amount }),
      });
      setCalcResult(res);
    } catch {
      onNotify(
        tr(language, 'Could not check order risk.', 'ऑर्डर जोखिम जांचा नहीं जा सका।')
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#0B1E40] border border-[#CBD5E1] dark:border-[#1E3A5F] rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-6 text-xs">
          <div>
            <div className="text-[#64748B] dark:text-[#94A3B8]">
              {tr(language, 'COD Orders', 'कुल COD ऑर्डर')}
            </div>
            <div className="text-lg font-extrabold text-[#071A35] dark:text-white tabular-nums">
              {orders.filter((o) => o.payment_mode === 'COD').length}
            </div>
          </div>
          <div>
            <div className="text-[#64748B] dark:text-[#94A3B8]">
              {tr(language, 'Orders That May Be Returned', 'रिटर्न जोखिम वाले ऑर्डर')}
            </div>
            <div className="text-lg font-extrabold text-[#D97706] tabular-nums">{flaggedCount}</div>
          </div>
          <div>
            <div className="text-[#64748B] dark:text-[#94A3B8]">
              {tr(language, 'Returned Parcels', 'वापस आए पार्सल (RTO)')}
            </div>
            <div className="text-lg font-extrabold text-[#DC2626] tabular-nums">{rtoCount}</div>
          </div>
          <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] max-w-xs">
            {tr(
              language,
              'Industry estimate: COD returns typically cost ~₹280 per order in two-way courier fees.',
              'अनुमान: हर COD रिटर्न में आने-जाने का लगभग ₹280 कूरियर खर्च बर्बाद होता है।'
            )}
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
                  placeholder={tr(language, 'Search COD order, buyer, pincode...', 'COD ऑर्डर, ग्राहक या पिनकोड खोजें...')}
                  className="h-9 pl-8 pr-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#061533] text-xs text-[#071A35] dark:text-white"
                />
              </div>
              <select
                aria-label={tr(language, 'Filter COD orders', 'COD ऑर्डर फ़िल्टर करें')}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                className="h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#061533] text-xs font-semibold text-[#071A35] dark:text-white"
              >
                <option value="all">{tr(language, 'All COD Orders', 'सभी COD ऑर्डर')}</option>
                <option value="Pending_Verification">{tr(language, 'Needs Check', 'जांच बाकी')}</option>
                <option value="In_Transit">{tr(language, 'In Transit', 'रास्ते में')}</option>
                <option value="Delivered">{tr(language, 'Delivered', 'डिलीवर')}</option>
                <option value="RTO_Returned">{tr(language, 'Returned (RTO)', 'रिटर्न (RTO)')}</option>
              </select>
            </>
          )}
          <button
            onClick={() => setCalcOpen(true)}
            className="h-9 px-3.5 rounded-lg bg-[#071A35] dark:bg-[#22D3EE] hover:bg-[#2563EB] text-white dark:text-[#071A35] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>{tr(language, 'Check Any Order', 'किसी ऑर्डर का जोखिम जांचें')}</span>
          </button>
        </div>
      </div>

      {displayOrders.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-[#CBD5E1] dark:border-[#1E3A5F] text-center text-sm text-[#64748B] dark:text-[#94A3B8]">
          {tr(
            language,
            'No Cash-on-Delivery orders match this view yet.',
            'इस श्रेणी में कोई COD ऑर्डर नहीं है।'
          )}
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 gap-4">
            {displayOrders.map((order) => {
              let reasons: string[] = [];
              try {
                reasons = JSON.parse(order.risk_reasons_json || '[]');
              } catch {
                reasons = [];
              }
              const score = Number(order.cod_risk_score || 0);
              const riskLevel = score >= 60 ? 'high' : score >= 35 ? 'medium' : 'low';
              const isPending = order.status === 'Pending_Verification';

              return (
                <div
                  key={order.id}
                  className="rounded-2xl border border-[#E2E8F0] dark:border-[#1E3A5F] bg-white dark:bg-[#0B1E40] p-5 flex flex-col justify-between gap-4 hover:border-[#2563EB] transition-colors"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs font-mono font-semibold text-[#64748B] dark:text-[#94A3B8]">
                          {order.order_number} · {order.ordered_at}
                        </div>
                        <h4 className="text-base font-extrabold text-[#071A35] dark:text-white truncate">
                          {order.customer_name || tr(language, 'Customer', 'ग्राहक')} · ₹
                          {Number(order.total_amount).toLocaleString('en-IN')}
                        </h4>
                        <div className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                          {order.delivery_address || tr(language, 'Address missing', 'पता अधूरा')} (
                          {order.pincode || tr(language, 'No pincode', 'पिनकोड नहीं')})
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div
                          className={`text-xs font-extrabold ${
                            riskLevel === 'high'
                              ? 'text-[#DC2626]'
                              : riskLevel === 'medium'
                              ? 'text-[#D97706]'
                              : 'text-[#16A34A]'
                          }`}
                        >
                          {riskLevel === 'high'
                            ? `${tr(language, 'High Risk', 'उच्च जोखिम')} (${score})`
                            : riskLevel === 'medium'
                            ? `${tr(language, 'Needs Review', 'समीक्षा बाकी')} (${score})`
                            : `${tr(language, 'Low Risk', 'कम जोखिम')} (${score})`}
                        </div>
                        <div className="text-[11px] font-semibold text-[#64748B] dark:text-[#94A3B8]">
                          {localizeOrderStatus(language, order.status)}
                        </div>
                      </div>
                    </div>

                    {reasons.length > 0 && (
                      <ul className="space-y-1 text-xs text-[#475569] dark:text-[#CBD5E1] bg-[#F8FAFC] dark:bg-[#061533] rounded-xl p-3 border border-[#E2E8F0] dark:border-[#1E3A5F]">
                        {reasons.slice(0, 3).map((r) => (
                          <li key={r} className="flex items-start gap-2">
                            <AlertTriangle className="w-3.5 h-3.5 text-[#D97706] shrink-0 mt-0.5" />
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E2E8F0] dark:border-[#1E3A5F]">
                    <div className="flex flex-wrap items-center gap-2">
                      {isPending ? (
                        <>
                          <button
                            disabled={busyId === order.id}
                            onClick={() => handleOrderAction(order.id, 'prepare_prepay')}
                            className="h-9 px-3.5 rounded-lg bg-[#2563EB] hover:bg-[#071A35] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{tr(language, 'Prepare UPI Request', 'UPI अनुरोध तैयार करें')}</span>
                          </button>
                          <button
                            disabled={busyId === order.id}
                            onClick={() => handleOrderAction(order.id, 'verify_address')}
                            className="h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] hover:border-[#16A34A] text-xs font-semibold text-[#071A35] dark:text-white flex items-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                            <span>{tr(language, 'Verify Address', 'पता सत्यापित करें')}</span>
                          </button>
                        </>
                      ) : (
                        !compactLanding &&
                        order.status === 'In_Transit' && (
                          <>
                            <button
                              disabled={busyId === order.id}
                              onClick={() => handleOrderAction(order.id, 'mark_delivered')}
                              className="h-8 px-3 rounded-lg bg-[#16A34A] text-white text-xs font-bold cursor-pointer"
                            >
                              {tr(language, 'Mark Delivered', 'डिलीवर दर्ज करें')}
                            </button>
                            <button
                              disabled={busyId === order.id}
                              onClick={() => handleOrderAction(order.id, 'mark_rto')}
                              className="h-8 px-3 rounded-lg border border-[#FCA5A5] text-[#DC2626] text-xs font-bold cursor-pointer"
                            >
                              {tr(language, 'Record Return', 'रिटर्न दर्ज करें')}
                            </button>
                          </>
                        )
                      )}
                      {busyId === order.id && (
                        <RefreshCw className="w-4 h-4 animate-spin text-[#2563EB]" />
                      )}
                    </div>

                    <button
                      onClick={() => setDetailOrderId(order.id)}
                      className="h-8 px-2.5 rounded-lg text-xs font-bold text-[#2563EB] dark:text-[#22D3EE] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{tr(language, 'Details', 'विवरण')}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {!compactLanding && totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-[#64748B] pt-1">
              <span className="tabular-nums">
                {tr(language, 'Page', 'पृष्ठ')} {safePage} / {totalPages} · {codOrders.length}{' '}
                {tr(language, 'COD orders', 'COD ऑर्डर')}
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

      <OrderDetailModal
        language={language}
        orderId={detailOrderId}
        onClose={() => setDetailOrderId(null)}
        onRefresh={onRefresh}
        onNotify={onNotify}
      />

      {calcOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#0B1E40] border border-[#CBD5E1] dark:border-[#1E3A5F] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-[#2563EB] dark:text-[#22D3EE]" />
                <h3 className="text-base font-extrabold text-[#071A35] dark:text-white">
                  {tr(language, 'Check COD Return Risk', 'COD रिटर्न जोखिम जांचें')}
                </h3>
              </div>
              <button
                onClick={() => setCalcOpen(false)}
                className="p-1.5 rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-[#061533] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleScoreCheck} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">
                    {tr(language, 'Pincode', 'पिनकोड')}
                  </label>
                  <input
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#061533]"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">
                    {tr(language, 'Order Amount (₹)', 'ऑर्डर राशि (₹)')}
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#061533]"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">
                  {tr(language, 'Delivery Address', 'डिलीवरी पता')}
                </label>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#061533]"
                />
              </div>
              <label className="flex items-center gap-2 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFirstTimeBuyer}
                  onChange={(e) => setIsFirstTimeBuyer(e.target.checked)}
                />
                <span>
                  {tr(
                    language,
                    'First-time buyer (no prior delivered orders)',
                    'नया ग्राहक (पहले कोई डिलीवर ऑर्डर नहीं)'
                  )}
                </span>
              </label>
              <button
                type="submit"
                className="w-full h-10 rounded-lg bg-[#2563EB] hover:bg-[#071A35] text-white font-bold cursor-pointer"
              >
                {tr(language, 'Check Risk', 'जोखिम जांचें')}
              </button>
            </form>

            {calcResult && (
              <div className="p-4 rounded-xl bg-[#EFF6FF] dark:bg-[#061533] border border-[#BFDBFE] dark:border-[#1E3A5F] space-y-2 text-xs">
                <div className="font-extrabold text-sm">
                  {calcResult.band === 'high'
                    ? `${tr(language, 'High Risk', 'उच्च जोखिम')} (${calcResult.score}/100)`
                    : calcResult.band === 'medium'
                    ? `${tr(language, 'Needs Review', 'समीक्षा बाकी')} (${calcResult.score}/100)`
                    : `${tr(language, 'Low Risk', 'कम जोखिम')} (${calcResult.score}/100)`}
                </div>
                <p className="font-semibold text-[#071A35] dark:text-white">
                  {calcResult.recommendedAction}
                </p>
                {calcResult.reasons.length > 0 && (
                  <ul className="list-disc pl-4 space-y-1 text-[#475569] dark:text-[#CBD5E1]">
                    {calcResult.reasons.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
