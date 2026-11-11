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
        <div className="flex items-center gap-2 text-xs text-[#555C57] dark:text-[#9DA49F] mb-1">
          <span>Predictive COD Risk Protection</span>
          <span>·</span>
          <span className="font-semibold text-[#0F2E22] dark:text-[#34D399]">Indian E-Commerce RTO Defense</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#141B18] dark:text-[#F0F3F1]">
          COD RTO Protection Center
        </h2>
        <p className="text-sm text-[#555C57] dark:text-[#9DA49F] mt-0.5">
          In India, 20–30% of Cash-on-Delivery orders fail and return to origin, versus 2–3% prepaid. SELLVION detects risky orders and converts them to prepaid before couriers are booked.
        </p>
      </div>

      {/* Key Metric Banners */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#161C19] rounded-xl border border-[#EAE8E1] dark:border-[#232B26] p-4 shadow-xs transition-colors">
          <div className="text-xs text-[#6B726C] dark:text-[#8C948F] font-medium">Store COD Baseline RTO</div>
          <div className="text-2xl font-bold text-[#DC2626] dark:text-[#F87171] font-mono tabular-nums mt-1">
            26.4%
          </div>
          <div className="text-[11px] text-[#8C8F8A] dark:text-[#6C7670] mt-0.5">Industry avg: 20-30%</div>
        </div>

        <div className="bg-white dark:bg-[#161C19] rounded-xl border border-[#EAE8E1] dark:border-[#232B26] p-4 shadow-xs transition-colors">
          <div className="text-xs text-[#6B726C] dark:text-[#8C948F] font-medium">Current AI-Protected RTO</div>
          <div className="text-2xl font-bold text-[#059669] dark:text-[#34D399] font-mono tabular-nums mt-1">
            11.8%
          </div>
          <div className="text-[11px] text-[#059669] dark:text-[#34D399] mt-0.5">-14.6% reduction in returns</div>
        </div>

        <div className="bg-white dark:bg-[#161C19] rounded-xl border border-[#EAE8E1] dark:border-[#232B26] p-4 shadow-xs transition-colors">
          <div className="text-xs text-[#6B726C] dark:text-[#8C948F] font-medium">Courier Cost & Damage Saved</div>
          <div className="text-2xl font-bold text-[#0F2E22] dark:text-[#34D399] font-mono tabular-nums mt-1">
            ₹1,42,800
          </div>
          <div className="text-[11px] text-[#555C57] dark:text-[#9DA49F] mt-0.5">Saved in last 30 days</div>
        </div>
      </div>

      {/* Flagged Live COD Orders Queue */}
      <div className="bg-white dark:bg-[#161C19] rounded-2xl border border-[#EAE8E1] dark:border-[#232B26] p-6 shadow-xs space-y-4 transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#141B18] dark:text-[#F0F3F1]">
              Flagged COD Orders Requiring Action
            </h3>
            <p className="text-xs text-[#555C57] dark:text-[#9DA49F] mt-0.5">
              Explainable predictions generated by SELLVION's Behaviour & Prediction Agent.
            </p>
          </div>
          <span className="text-xs text-[#B45309] dark:text-[#FBBF24] font-semibold bg-[#FEF3C7] dark:bg-[#3D2906] px-2.5 py-1 rounded-md">
            2 High Risk Orders
          </span>
        </div>

        <div className="divide-y divide-[#F2F0E8] dark:divide-[#232B26]">
          {orders
            .filter((o) => o.codRiskScore && o.codRiskScore >= 50)
            .map((order) => {
              const status = activeMitigations[order.id];

              return (
                <div
                  key={order.id}
                  className="py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 max-w-xl">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-[#141B18] dark:text-[#F0F3F1]">{order.id}</span>
                      <span>·</span>
                      <span className="font-medium text-[#2D332F] dark:text-[#D1D7D3]">{order.customerName}</span>
                      <span>·</span>
                      <span className="font-mono tabular-nums font-semibold text-[#141B18] dark:text-[#F0F3F1]">
                        ₹{order.amount.toLocaleString('en-IN')} (COD)
                      </span>
                    </div>

                    <div className="text-xs text-[#555C57] dark:text-[#9DA49F]">
                      Items: {order.items.join(', ')}
                    </div>

                    <div className="flex flex-wrap gap-2 text-[11px] text-[#991B1B] dark:text-[#F87171]">
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
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right mr-2">
                      <div className="text-sm font-bold font-mono text-[#DC2626] dark:text-[#F87171] tabular-nums">
                        {order.codRiskScore}% RTO Risk
                      </div>
                      <div className="text-[10px] text-[#6B726C] dark:text-[#8C948F]">High return likelihood</div>
                    </div>

                    {status ? (
                      <span className="px-3 py-1.5 text-xs font-semibold bg-[#E8F5E9] dark:bg-[#153426] text-[#065F46] dark:text-[#34D399] rounded-lg border border-[#C2E4C9] dark:border-[#214D38] flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> {status}
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleMitigate(order.id, 'verify')}
                          className="px-3 py-2 text-xs font-medium text-[#0F2E22] dark:text-[#E8F5E9] bg-[#FAF9F5] dark:bg-[#1A221E] border border-[#DDD9CF] dark:border-[#28322C] hover:bg-[#EAE8DF] dark:hover:bg-[#25302A] rounded-lg transition-colors"
                        >
                          Verify Address
                        </button>
                        <button
                          onClick={() => handleMitigate(order.id, 'prepay')}
                          className="px-3.5 py-2 text-xs font-semibold text-white bg-[#0F2E22] dark:bg-[#1E4D3B] hover:bg-[#1A4535] dark:hover:bg-[#28634C] rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-[#34D399]" />
                          <span>Send ₹50 UPI Prepay Offer</span>
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
      <div className="bg-[#FAF9F5] dark:bg-[#121714] rounded-2xl border border-[#E8E6DF] dark:border-[#232B26] p-6 shadow-xs space-y-6 transition-colors">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#555C57] dark:text-[#9DA49F] mb-1">
            <span>Interactive Risk Calculator</span>
            <span>·</span>
            <span className="font-semibold text-[#0F2E22] dark:text-[#34D399]">Explainable Scoring Sandbox</span>
          </div>
          <h3 className="text-lg font-bold text-[#141B18] dark:text-[#F0F3F1]">
            Test Any Indian Order for RTO Risk
          </h3>
          <p className="text-xs text-[#6B726C] dark:text-[#8C948F] mt-0.5">
            Simulate how SELLVION factors geography, basket value, and buyer history to protect your cashflow.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-medium text-[#4A504B] dark:text-[#A7AFA9] block mb-1.5">
              Buyer Relationship
            </label>
            <select
              value={simCustomerType}
              onChange={(e) => setSimCustomerType(e.target.value as any)}
              className="w-full text-xs p-2.5 rounded-lg border border-[#DDD9CF] dark:border-[#2D3932] bg-white dark:bg-[#1A241F] text-[#141B18] dark:text-[#E8ECE9] focus:outline-none focus:ring-1 focus:ring-[#0F2E22] dark:focus:ring-[#34D399]"
            >
              <option value="new">First-Time Buyer (No history)</option>
              <option value="repeat">Repeat Buyer (2+ completed orders)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-[#4A504B] dark:text-[#A7AFA9] block mb-1.5">
              Delivery Pincode
            </label>
            <select
              value={simPincode}
              onChange={(e) => setSimPincode(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-[#DDD9CF] dark:border-[#2D3932] bg-white dark:bg-[#1A241F] text-[#141B18] dark:text-[#E8ECE9] focus:outline-none focus:ring-1 focus:ring-[#0F2E22] dark:focus:ring-[#34D399]"
            >
              <option value="141001">141001 (Ludhiana - High RTO Tier)</option>
              <option value="800001">800001 (Patna - High RTO Tier)</option>
              <option value="226001">226001 (Lucknow - High RTO Tier)</option>
              <option value="560034">560034 (Bengaluru - Low RTO Tier)</option>
              <option value="411004">411004 (Pune - Low RTO Tier)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-[#4A504B] dark:text-[#A7AFA9] block mb-1.5">
              Address Quality
            </label>
            <select
              value={simAddressType}
              onChange={(e) => setSimAddressType(e.target.value as any)}
              className="w-full text-xs p-2.5 rounded-lg border border-[#DDD9CF] dark:border-[#2D3932] bg-white dark:bg-[#1A241F] text-[#141B18] dark:text-[#E8ECE9] focus:outline-none focus:ring-1 focus:ring-[#0F2E22] dark:focus:ring-[#34D399]"
            >
              <option value="missing_unit">Missing House / Flat / Street line</option>
              <option value="complete">Complete full address with landmark</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-[#4A504B] dark:text-[#A7AFA9] block mb-1.5">
              Cart Value (COD)
            </label>
            <select
              value={simOrderAmount}
              onChange={(e) => setSimOrderAmount(Number(e.target.value))}
              className="w-full text-xs p-2.5 rounded-lg border border-[#DDD9CF] dark:border-[#2D3932] bg-white dark:bg-[#1A241F] text-[#141B18] dark:text-[#E8ECE9] focus:outline-none focus:ring-1 focus:ring-[#0F2E22] dark:focus:ring-[#34D399]"
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
            className="px-5 py-2.5 bg-[#0F2E22] dark:bg-[#1E4D3B] hover:bg-[#1A4535] dark:hover:bg-[#28634C] text-white text-xs font-semibold rounded-xl transition-colors shadow-xs flex items-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#34D399]" />
            <span>Calculate Explainable Risk Score</span>
          </button>
        </div>

        {/* Simulation Output */}
        {simulatedScore && (
          <div className="p-5 bg-white dark:bg-[#161C19] rounded-xl border border-[#EAE8E1] dark:border-[#232B26] space-y-3 animate-fadeIn transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`text-2xl font-bold font-mono tabular-nums ${
                    simulatedScore.score >= 60
                      ? 'text-[#DC2626] dark:text-[#F87171]'
                      : simulatedScore.score >= 35
                      ? 'text-[#D97706] dark:text-[#FBBF24]'
                      : 'text-[#059669] dark:text-[#34D399]'
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
                      : 'bg-[#E8F5E9] dark:bg-[#153426] text-[#065F46] dark:text-[#34D399]'
                  }`}
                >
                  {simulatedScore.riskBand} COD Return Risk
                </span>
              </div>
            </div>

            <div className="text-xs text-[#2D332F] dark:text-[#D1D7D3] font-medium">
              Identified Risk Indicators:
            </div>
            <ul className="list-disc list-inside text-xs text-[#555C57] dark:text-[#9DA49F] space-y-1">
              {simulatedScore.factors.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>

            <div className="pt-2 border-t border-[#F2F0E8] dark:border-[#232B26] flex items-center justify-between text-xs">
              <span className="font-semibold text-[#0F2E22] dark:text-[#34D399]">
                Recommended Autonomous Action:
              </span>
              <span className="text-[#059669] dark:text-[#6EE7B7] font-medium">
                {simulatedScore.recommendation}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
