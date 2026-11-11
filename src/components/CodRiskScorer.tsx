import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Send,
  Sparkles,
  CheckCircle,
  Truck,
  RotateCcw,
  ArrowRight,
  X,
  MapPin,
  Package,
} from 'lucide-react';
import { Order } from '../types';

interface CodRiskScorerProps {
  orders: Order[];
  onMitigateOrder?: (orderId: string, actionType: 'prepay' | 'verify') => void;
}

export const CodRiskScorer: React.FC<CodRiskScorerProps> = ({
  orders,
  onMitigateOrder,
}) => {
  // Interactive Simulator inputs
  const [simCustomerType, setSimCustomerType] = useState<'new' | 'repeat'>('new');
  const [simPincode, setSimPincode] = useState<string>('141001');
  const [simOrderAmount, setSimOrderAmount] = useState<number>(3800);
  const [simAddressType, setSimAddressType] = useState<'complete' | 'missing_unit'>('missing_unit');
  const [simTime, setSimTime] = useState<'day' | 'late_night'>('late_night');
  const [simulatedScore, setSimulatedScore] = useState<{
    score: number;
    riskBand: 'High' | 'Moderate' | 'Low';
    factors: string[];
    recommendation: string;
  } | null>(null);

  const [activeMitigations, setActiveMitigations] = useState<Record<string, string>>({});
  const [diagnosticOrder, setDiagnosticOrder] = useState<Order | null>(null);

  const calculateRisk = () => {
    let score = 15; // baseline
    const factors: string[] = [];

    if (simCustomerType === 'new') {
      score += 25;
      factors.push('First-time buyer (+25% risk)');
    } else {
      score -= 10;
    }

    if (simPincode === '141001' || simPincode === '800001' || simPincode === '226001') {
      score += 22;
      factors.push(`Regional carrier RTO rate high in ${simPincode} (+22% risk)`);
    }

    if (simOrderAmount > 2500) {
      score += 15;
      factors.push(`High cart value for COD (>₹2,500) (+15% risk)`);
    }

    if (simAddressType === 'missing_unit') {
      score += 18;
      factors.push('Address incomplete: missing flat/house/floor line (+18% risk)');
    }

    if (simTime === 'late_night') {
      score += 10;
      factors.push('Impulse late-night order (11:30 PM - 4:00 AM) (+10% risk)');
    }

    score = Math.min(Math.max(score, 8), 92);

    let riskBand: 'High' | 'Moderate' | 'Low' = 'Low';
    let recommendation = 'Safe for standard dispatch.';

    if (score >= 60) {
      riskBand = 'High';
      recommendation = 'Hold dispatch. Trigger ₹75 UPI Prepayment Discount or WhatsApp Address Confirmation.';
    } else if (score >= 35) {
      riskBand = 'Moderate';
      recommendation = 'Send WhatsApp order dispatch confirmation with 1-tap OTP verification.';
    }

    setSimulatedScore({
      score,
      riskBand,
      factors,
      recommendation,
    });
  };

  const handleMitigate = (orderId: string, actionType: 'prepay' | 'verify') => {
    setActiveMitigations((prev) => ({
      ...prev,
      [orderId]: actionType === 'prepay' ? 'Prepay ₹50 link sent' : 'Address verification queued',
    }));
    if (onMitigateOrder) {
      onMitigateOrder(orderId, actionType);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Context */}
      <div>
        <div className="flex items-center gap-2 text-xs text-[#64748B] dark:text-[#94A3B8] mb-1">
          <span>Predictive COD Risk Protection</span>
          <span>·</span>
          <span className="font-semibold text-[#0284C7] dark:text-[#38BDF8]">Indian E-Commerce RTO Defense</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
          COD RTO Protection Center
        </h2>
        <p className="text-sm text-[#475569] dark:text-[#94A3B8] mt-0.5">
          In India, 20–30% of Cash-on-Delivery orders fail and return to origin, versus 2–3% prepaid. SELLVION detects risky orders and converts them to prepaid before couriers are booked.
        </p>
      </div>

      {/* Key Metric Banners */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#132238] rounded-xl border border-[#E2E8F0] dark:border-[#1E3A5F] p-4 shadow-xs transition-colors">
          <div className="text-xs text-[#64748B] dark:text-[#94A3B8] font-medium">Store COD Baseline RTO</div>
          <div className="text-2xl font-bold text-[#DC2626] dark:text-[#F87171] font-mono tabular-nums mt-1">
            26.4%
          </div>
          <div className="text-[11px] text-[#94A3B8] dark:text-[#64748B] mt-0.5">Industry avg: 20-30%</div>
        </div>

        <div className="bg-white dark:bg-[#132238] rounded-xl border border-[#E2E8F0] dark:border-[#1E3A5F] p-4 shadow-xs transition-colors">
          <div className="text-xs text-[#64748B] dark:text-[#94A3B8] font-medium">Current AI-Protected RTO</div>
          <div className="text-2xl font-bold text-[#0284C7] dark:text-[#38BDF8] font-mono tabular-nums mt-1">
            11.8%
          </div>
          <div className="text-[11px] text-[#0284C7] dark:text-[#38BDF8] mt-0.5">-14.6% reduction in returns</div>
        </div>

        <div className="bg-white dark:bg-[#132238] rounded-xl border border-[#E2E8F0] dark:border-[#1E3A5F] p-4 shadow-xs transition-colors">
          <div className="text-xs text-[#64748B] dark:text-[#94A3B8] font-medium">Courier Cost & Damage Saved</div>
          <div className="text-2xl font-bold text-[#0284C7] dark:text-[#38BDF8] font-mono tabular-nums mt-1">
            ₹1,42,800
          </div>
          <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">Saved in last 30 days</div>
        </div>
      </div>

      {/* Flagged Live COD Orders Queue */}
      <div className="bg-white dark:bg-[#132238] rounded-2xl border border-[#E2E8F0] dark:border-[#1E3A5F] p-6 shadow-xs space-y-4 transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              Flagged COD Orders Requiring Action
            </h3>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
              Click any order to inspect carrier telemetry, address diagnostics, and trigger mitigations.
            </p>
          </div>
          <span className="text-xs text-[#0284C7] dark:text-[#38BDF8] font-semibold bg-[#E0F2FE] dark:bg-[#0C2E4E] px-2.5 py-1 rounded-md border border-[#BAE6FD] dark:border-[#1E3A5F]">
            2 High Risk Orders
          </span>
        </div>

        <div className="divide-y divide-[#F1F5F9] dark:divide-[#1E3A5F]">
          {orders
            .filter((o) => o.codRiskScore && o.codRiskScore >= 50)
            .map((order) => {
              const status = activeMitigations[order.id];

              return (
                <div
                  key={order.id}
                  onClick={() => setDiagnosticOrder(order)}
                  className="py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-[#F0F9FF] dark:hover:bg-[#1A2E4C] p-2 rounded-xl transition-colors cursor-pointer group"
                >
                  <div className="space-y-1.5 max-w-xl">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-[#0F172A] dark:text-[#F8FAFC] group-hover:text-[#0284C7] dark:group-hover:text-[#38BDF8]">
                        {order.id}
                      </span>
                      <span>·</span>
                      <span className="font-medium text-[#334155] dark:text-[#CBD5E1]">{order.customerName}</span>
                      <span>·</span>
                      <span className="font-mono tabular-nums font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                        ₹{order.amount.toLocaleString('en-IN')} (COD)
                      </span>
                    </div>

                    <div className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                      Items: {order.items.join(', ')}
                    </div>

                    <div className="flex flex-wrap gap-2 text-[11px]">
                      {order.riskReasons?.map((r, i) => (
                        <span
                          key={i}
                          className="bg-[#FEE2E2] dark:bg-[#3E1A1A] px-2 py-0.5 rounded text-[#991B1B] dark:text-[#F87171] font-medium"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions & Status */}
                  <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <div className="text-right mr-2">
                      <div className="text-sm font-bold font-mono text-[#DC2626] dark:text-[#F87171] tabular-nums">
                        {order.codRiskScore}% RTO Risk
                      </div>
                      <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">High return likelihood</div>
                    </div>

                    {status ? (
                      <span className="px-3 py-1.5 text-xs font-semibold bg-[#E0F2FE] dark:bg-[#0C2E4E] text-[#0284C7] dark:text-[#38BDF8] rounded-lg border border-[#BAE6FD] dark:border-[#1E3A5F] flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> {status}
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleMitigate(order.id, 'verify')}
                          className="px-3 py-2 text-xs font-medium text-[#0F172A] dark:text-[#F8FAFC] bg-white dark:bg-[#1B2E4B] border border-[#CBD5E1] dark:border-[#1E3A5F] hover:bg-[#F8FAFC] dark:hover:bg-[#233857] rounded-lg transition-colors cursor-pointer"
                        >
                          Verify Address
                        </button>
                        <button
                          onClick={() => handleMitigate(order.id, 'prepay')}
                          className="px-3.5 py-2 text-xs font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shadow-[#0284C7]/20 cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-[#BAE6FD]" />
                          <span>Send ₹50 UPI Offer</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Interactive COD Risk Simulator */}
      <div className="bg-[#F8FAFC] dark:bg-[#0F1A2C] rounded-2xl border border-[#E2E8F0] dark:border-[#1E3A5F] p-6 shadow-xs space-y-6 transition-colors">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#64748B] dark:text-[#94A3B8] mb-1">
            <span>Interactive Risk Calculator</span>
            <span>·</span>
            <span className="font-semibold text-[#0284C7] dark:text-[#38BDF8]">Explainable Scoring Sandbox</span>
          </div>
          <h3 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">
            Test Any Indian Order for RTO Risk
          </h3>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
            Simulate how SELLVION factors geography, basket value, and buyer history to protect your cashflow.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-medium text-[#475569] dark:text-[#CBD5E1] block mb-1.5">
              Buyer Relationship
            </label>
            <select
              value={simCustomerType}
              onChange={(e) => setSimCustomerType(e.target.value as any)}
              className="w-full text-xs p-2.5 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#132238] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-1 focus:ring-[#0284C7] dark:focus:ring-[#38BDF8]"
            >
              <option value="new">First-Time Buyer (No history)</option>
              <option value="repeat">Repeat Buyer (2+ completed orders)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-[#475569] dark:text-[#CBD5E1] block mb-1.5">
              Delivery Pincode
            </label>
            <select
              value={simPincode}
              onChange={(e) => setSimPincode(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#132238] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-1 focus:ring-[#0284C7] dark:focus:ring-[#38BDF8]"
            >
              <option value="141001">141001 (Ludhiana - High RTO Tier)</option>
              <option value="800001">800001 (Patna - High RTO Tier)</option>
              <option value="226001">226001 (Lucknow - High RTO Tier)</option>
              <option value="560034">560034 (Bengaluru - Low RTO Tier)</option>
              <option value="411004">411004 (Pune - Low RTO Tier)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-[#475569] dark:text-[#CBD5E1] block mb-1.5">
              Address Quality
            </label>
            <select
              value={simAddressType}
              onChange={(e) => setSimAddressType(e.target.value as any)}
              className="w-full text-xs p-2.5 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#132238] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-1 focus:ring-[#0284C7] dark:focus:ring-[#38BDF8]"
            >
              <option value="missing_unit">Missing House / Flat / Street line</option>
              <option value="complete">Complete full address with landmark</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-[#475569] dark:text-[#CBD5E1] block mb-1.5">
              Cart Value (COD)
            </label>
            <select
              value={simOrderAmount}
              onChange={(e) => setSimOrderAmount(Number(e.target.value))}
              className="w-full text-xs p-2.5 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#132238] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-1 focus:ring-[#0284C7] dark:focus:ring-[#38BDF8]"
            >
              <option value={850}>₹850 (Low ticket)</option>
              <option value={1950}>₹1,950 (Medium ticket)</option>
              <option value={4200}>₹4,200 (High ticket)</option>
              <option value={7500}>₹7,500 (Very high ticket)</option>
            </select>
          </div>
        </div>

        <div className="flex justify-start">
          <button
            onClick={calculateRisk}
            className="px-5 py-2.5 bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-semibold rounded-xl transition-colors shadow-sm shadow-[#0284C7]/20 flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#BAE6FD]" />
            <span>Calculate Explainable Risk Score</span>
          </button>
        </div>

        {/* Simulation Output */}
        {simulatedScore && (
          <div className="p-5 bg-white dark:bg-[#132238] rounded-xl border border-[#BAE6FD] dark:border-[#1E3A5F] space-y-3 animate-fadeIn transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`text-2xl font-bold font-mono tabular-nums ${
                    simulatedScore.score >= 60
                      ? 'text-[#DC2626] dark:text-[#F87171]'
                      : simulatedScore.score >= 35
                      ? 'text-[#D97706] dark:text-[#FBBF24]'
                      : 'text-[#0284C7] dark:text-[#38BDF8]'
                  }`}
                >
                  {simulatedScore.score}% Risk Score
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                    simulatedScore.riskBand === 'High'
                      ? 'bg-[#FEE2E2] dark:bg-[#3E1A1A] text-[#991B1B] dark:text-[#F87171]'
                      : simulatedScore.riskBand === 'Moderate'
                      ? 'bg-[#FEF3C7] dark:bg-[#3D2906] text-[#92400E] dark:text-[#FBBF24]'
                      : 'bg-[#E0F2FE] dark:bg-[#0C2E4E] text-[#0284C7] dark:text-[#38BDF8]'
                  }`}
                >
                  {simulatedScore.riskBand} COD Return Risk
                </span>
              </div>
            </div>

            <div className="text-xs text-[#334155] dark:text-[#CBD5E1] font-medium">
              Identified Risk Indicators:
            </div>
            <ul className="list-disc list-inside text-xs text-[#64748B] dark:text-[#94A3B8] space-y-1">
              {simulatedScore.factors.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>

            <div className="pt-2 border-t border-[#F1F5F9] dark:border-[#1E3A5F] flex items-center justify-between text-xs">
              <span className="font-semibold text-[#0284C7] dark:text-[#38BDF8]">
                Recommended Autonomous Action:
              </span>
              <span className="text-[#0369A1] dark:text-[#7DD3FC] font-medium">
                {simulatedScore.recommendation}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Order Diagnostics Modal */}
      {diagnosticOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#132238] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#BAE6FD] dark:border-[#1E3A5F] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#1E3A5F]">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#0284C7] dark:text-[#38BDF8]" />
                <h3 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                  Order Diagnostics: #{diagnosticOrder.id}
                </h3>
              </div>
              <button
                onClick={() => setDiagnosticOrder(null)}
                className="p-1.5 text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#F8FAFC] dark:bg-[#0F1A2C] rounded-xl border border-[#E2E8F0] dark:border-[#1E3A5F] space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[#64748B] dark:text-[#94A3B8]">Buyer:</span>
                  <span className="font-bold text-[#0F172A] dark:text-[#F8FAFC]">{diagnosticOrder.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B] dark:text-[#94A3B8]">Items:</span>
                  <span className="text-[#0F172A] dark:text-[#F8FAFC]">{diagnosticOrder.items.join(', ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B] dark:text-[#94A3B8]">COD Amount:</span>
                  <span className="font-mono font-bold text-[#0F172A] dark:text-[#F8FAFC]">₹{diagnosticOrder.amount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span className="text-[#DC2626] dark:text-[#F87171]">Calculated RTO Risk:</span>
                  <span className="text-[#DC2626] dark:text-[#F87171] font-mono">{diagnosticOrder.codRiskScore}% High Risk</span>
                </div>
              </div>

              <div>
                <span className="font-semibold text-[#475569] dark:text-[#CBD5E1] block mb-1">
                  Identified Carrier Risk Factors:
                </span>
                <ul className="list-disc list-inside space-y-1 text-[#64748B] dark:text-[#94A3B8]">
                  {diagnosticOrder.riskReasons?.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                  <li>Courier return cost exposure: <strong>₹280 forward + reverse transit loss</strong></li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8F0] dark:border-[#1E3A5F]">
              <button
                onClick={() => {
                  handleMitigate(diagnosticOrder.id, 'verify');
                  setDiagnosticOrder(null);
                }}
                className="px-3.5 py-2 text-xs font-medium text-[#0F172A] dark:text-[#F8FAFC] bg-white dark:bg-[#1B2E4B] border border-[#CBD5E1] dark:border-[#1E3A5F] rounded-xl hover:bg-[#F8FAFC] cursor-pointer"
              >
                Queue Address Verification
              </button>
              <button
                onClick={() => {
                  handleMitigate(diagnosticOrder.id, 'prepay');
                  setDiagnosticOrder(null);
                }}
                className="px-4 py-2 bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-semibold rounded-xl shadow-sm shadow-[#0284C7]/20 flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#BAE6FD]" />
                <span>Send ₹50 UPI Prepay Offer</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
