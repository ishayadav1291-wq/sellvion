import React, { useState } from 'react';
import {
  TrendingUp,
  ShieldCheck,
  RotateCcw,
  Clock,
  Sparkles,
  Layers,
  ArrowUpRight,
  Info,
  X,
  CheckCircle2,
} from 'lucide-react';
import { MetricSummary } from '../types';

interface MetricsAndLiftProps {
  metrics: MetricSummary;
}

export const MetricsAndLift: React.FC<MetricsAndLiftProps> = ({ metrics }) => {
  // Interactive Merchant ROI Calculator
  const [calcMonthlyOrders, setCalcMonthlyOrders] = useState<number>(1200);
  const [calcAverageOrderValue, setCalcAverageOrderValue] = useState<number>(1600);
  const [calcCodPercentage, setCalcCodPercentage] = useState<number>(65);
  const [activeModalMetric, setActiveModalMetric] = useState<{
    title: string;
    value: string;
    formula: string;
    explanation: string;
  } | null>(null);

  // Calculations
  const codOrders = Math.round(calcMonthlyOrders * (calcCodPercentage / 100));
  const baselineRtoOrders = Math.round(codOrders * 0.25); // 25% average COD RTO
  const protectedRtoOrders = Math.round(codOrders * 0.11); // 11% with SELLVION
  const rtoOrdersPrevented = baselineRtoOrders - protectedRtoOrders;
  const estimatedRtoCostSaved = rtoOrdersPrevented * 240; // avg ₹240 courier forward+return fee + packaging loss
  const reorderLiftRevenue = Math.round(calcMonthlyOrders * 0.14 * calcAverageOrderValue); // 14% repeat order lift
  const totalNetGainMonthly = estimatedRtoCostSaved + reorderLiftRevenue;

  return (
    <div className="space-y-6">
      {/* Title & Introduction */}
      <div>
        <div className="flex items-center gap-2 text-xs text-[#64748B] dark:text-[#94A3B8] mb-1">
          <span>Incremental Revenue & Lift Science</span>
          <span>·</span>
          <span className="font-semibold text-[#0284C7] dark:text-[#38BDF8]">BR-08 & BRULE-06 Control-Group Standard</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
          Measurable Business Impact
        </h2>
        <p className="text-sm text-[#475569] dark:text-[#94A3B8] mt-0.5">
          Unlike vanity click counters, SELLVION runs scientific holdout control cohorts to separate organic repeat orders from real AI-driven incremental sales.
        </p>
      </div>

      {/* Primary KPI Cards with Dynamic Click Inspection */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => setActiveModalMetric({
            title: 'Incremental AI Revenue (+22.8% Lift)',
            value: `₹${metrics.incrementalAiRevenue.toLocaleString('en-IN')}`,
            formula: 'Incremental Lift = (Purchase Rate in 90% AI Group - Purchase Rate in 10% Holdout Group) × Total Contacted Buyers',
            explanation: 'Ensures you only count revenue that WOULD NOT have occurred organically without SELLVION’s predictive WhatsApp touchpoint.',
          })}
          className="bg-white dark:bg-[#132238] rounded-xl border border-[#E2E8F0] dark:border-[#1E3A5F] p-5 shadow-xs transition-all hover:border-[#0284C7] cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-[#64748B] dark:text-[#94A3B8] mb-1">
            <span className="group-hover:text-[#0284C7] transition-colors">Incremental AI Revenue</span>
            <span className="text-[#0284C7] dark:text-[#38BDF8] font-medium">+22.8% Lift</span>
          </div>
          <div className="text-2xl font-bold text-[#0284C7] dark:text-[#38BDF8] font-mono tabular-nums">
            ₹{metrics.incrementalAiRevenue.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-1">
            Measured against 10% holdout group (Click to inspect)
          </div>
        </div>

        <div
          onClick={() => setActiveModalMetric({
            title: 'COD Return-to-Origin (RTO) Reduction',
            value: `${metrics.codRtoCurrentPct}%`,
            formula: 'RTO Drop = (Store Baseline COD RTO 26.4%) - (Protected AI Group RTO 11.8%) = 14.6% Fewer Returns',
            explanation: 'High-risk COD buyers receive timely WhatsApp address confirmation with ₹50 UPI prepay discount links before packages are tendered to couriers.',
          })}
          className="bg-white dark:bg-[#132238] rounded-xl border border-[#E2E8F0] dark:border-[#1E3A5F] p-5 shadow-xs transition-all hover:border-[#0284C7] cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-[#64748B] dark:text-[#94A3B8] mb-1">
            <span className="group-hover:text-[#0284C7] transition-colors">COD Return-to-Origin</span>
            <span className="text-[#0284C7] dark:text-[#38BDF8] font-medium">-14.6% Down</span>
          </div>
          <div className="text-2xl font-bold text-[#0284C7] dark:text-[#38BDF8] font-mono tabular-nums">
            {metrics.codRtoCurrentPct}%
          </div>
          <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-1">
            Down from store baseline of 26.4%
          </div>
        </div>

        <div
          onClick={() => setActiveModalMetric({
            title: 'Direct Courier Loss Saved',
            value: `₹${metrics.rtoSavedAmount.toLocaleString('en-IN')}`,
            formula: 'Courier Loss Saved = 482 Prevented Returns × ₹280 Average Forward+Reverse Freight & Packaging Cost',
            explanation: 'Indian carriers charge full double-leg freight for returned packages plus merchant packaging loss. Every prevented RTO saves cash directly.',
          })}
          className="bg-white dark:bg-[#132238] rounded-xl border border-[#E2E8F0] dark:border-[#1E3A5F] p-5 shadow-xs transition-all hover:border-[#0284C7] cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-[#64748B] dark:text-[#94A3B8] mb-1">
            <span className="group-hover:text-[#0284C7] transition-colors">Direct Courier Loss Saved</span>
            <span className="text-[#0284C7] dark:text-[#38BDF8] font-medium">Prevented</span>
          </div>
          <div className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] font-mono tabular-nums">
            ₹{metrics.rtoSavedAmount.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-1">
            From 482 prevented COD failures
          </div>
        </div>

        <div
          onClick={() => setActiveModalMetric({
            title: 'Merchant Manual Hours Saved',
            value: `${metrics.hoursSavedWeekly} Hours / Week`,
            formula: 'Hours Saved = ~180 WhatsApp checks/follow-ups weekly × 5 mins per manual customer interaction',
            explanation: 'Automates customer replenishment tracking, drafting, and udhaar nudges so store founders can focus on procurement and growth.',
          })}
          className="bg-white dark:bg-[#132238] rounded-xl border border-[#E2E8F0] dark:border-[#1E3A5F] p-5 shadow-xs transition-all hover:border-[#0284C7] cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-[#64748B] dark:text-[#94A3B8] mb-1">
            <span className="group-hover:text-[#0284C7] transition-colors">Manual Hours Saved</span>
            <span className="text-[#0284C7] dark:text-[#38BDF8] font-medium">Weekly</span>
          </div>
          <div className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] font-mono tabular-nums">
            {metrics.hoursSavedWeekly} Hours
          </div>
          <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-1">
            Automated WhatsApp typing & tracking
          </div>
        </div>
      </div>

      {/* Cohort Comparison Bar Chart Mockup */}
      <div className="bg-white dark:bg-[#132238] rounded-2xl border border-[#E2E8F0] dark:border-[#1E3A5F] p-6 shadow-xs space-y-4 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              Incremental Lift: AI Engaged Cohort vs Uncontacted Holdout
            </h3>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
              Strictly verifies true incremental purchase causality (BRULE-06 compliant).
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-[#64748B] dark:text-[#94A3B8]">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[#0284C7] dark:bg-[#38BDF8]" />
              <span className="text-[#0F172A] dark:text-[#F8FAFC] font-sans font-medium">SELLVION Cohort (90%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[#CBD5E1] dark:bg-[#1E3A5F]" />
              <span className="font-sans">Holdout Group (10%)</span>
            </div>
          </div>
        </div>

        {/* Visual Progress / Comparison Rows */}
        <div className="space-y-4 pt-2">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">30-Day Repeat Purchase Rate</span>
              <span className="font-mono tabular-nums text-[#0284C7] dark:text-[#38BDF8] font-bold">
                28.4% vs 14.2% holdout (+100% relative lift)
              </span>
            </div>
            <div className="w-full h-3 bg-[#F8FAFC] dark:bg-[#0B1320] rounded-full overflow-hidden flex border border-[#E2E8F0] dark:border-[#1E3A5F]">
              <div className="h-full bg-[#0284C7] dark:bg-[#38BDF8] rounded-full" style={{ width: '56.8%' }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">COD Order Delivery Success</span>
              <span className="font-mono tabular-nums text-[#0284C7] dark:text-[#38BDF8] font-bold">
                88.2% delivered vs 73.6% holdout (+14.6% fewer RTOs)
              </span>
            </div>
            <div className="w-full h-3 bg-[#F8FAFC] dark:bg-[#0B1320] rounded-full overflow-hidden flex border border-[#E2E8F0] dark:border-[#1E3A5F]">
              <div className="h-full bg-[#0EA5E9] dark:bg-[#0284C7] rounded-full" style={{ width: '88.2%' }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Udhaar 14-Day Collection Rate</span>
              <span className="font-mono tabular-nums text-[#0284C7] dark:text-[#38BDF8] font-bold">
                71.8% cleared vs 36.4% holdout (+97% faster collection)
              </span>
            </div>
            <div className="w-full h-3 bg-[#F8FAFC] dark:bg-[#0B1320] rounded-full overflow-hidden flex border border-[#E2E8F0] dark:border-[#1E3A5F]">
              <div className="h-full bg-[#0284C7] dark:bg-[#38BDF8] rounded-full" style={{ width: '71.8%' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Store ROI Calculator */}
      <div className="bg-[#F8FAFC] dark:bg-[#0F1A2C] rounded-2xl border border-[#E2E8F0] dark:border-[#1E3A5F] p-6 shadow-xs space-y-6 transition-colors">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#64748B] dark:text-[#94A3B8] mb-1">
            <span>Interactive Projection</span>
            <span>·</span>
            <span className="font-semibold text-[#0284C7] dark:text-[#38BDF8]">Store Value Calculator</span>
          </div>
          <h3 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">
            Calculate SELLVION's Return for Your Store
          </h3>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
            Adjust your store's numbers below to project monthly savings from COD RTO prevention and repeat reorders.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="flex justify-between text-xs mb-1.5 font-medium text-[#475569] dark:text-[#CBD5E1]">
              <span>Monthly Orders</span>
              <span className="font-mono tabular-nums font-bold text-[#0284C7] dark:text-[#38BDF8]">
                {calcMonthlyOrders.toLocaleString('en-IN')}
              </span>
            </div>
            <input
              type="range"
              min="200"
              max="10000"
              step="100"
              value={calcMonthlyOrders}
              onChange={(e) => setCalcMonthlyOrders(Number(e.target.value))}
              className="w-full accent-[#0284C7]"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1.5 font-medium text-[#475569] dark:text-[#CBD5E1]">
              <span>Average Order Value (AOV)</span>
              <span className="font-mono tabular-nums font-bold text-[#0284C7] dark:text-[#38BDF8]">
                ₹{calcAverageOrderValue.toLocaleString('en-IN')}
              </span>
            </div>
            <input
              type="range"
              min="500"
              max="6000"
              step="100"
              value={calcAverageOrderValue}
              onChange={(e) => setCalcAverageOrderValue(Number(e.target.value))}
              className="w-full accent-[#0284C7]"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1.5 font-medium text-[#475569] dark:text-[#CBD5E1]">
              <span>COD Share of Orders</span>
              <span className="font-mono tabular-nums font-bold text-[#0284C7] dark:text-[#38BDF8]">
                {calcCodPercentage}%
              </span>
            </div>
            <input
              type="range"
              min="20"
              max="90"
              step="5"
              value={calcCodPercentage}
              onChange={(e) => setCalcCodPercentage(Number(e.target.value))}
              className="w-full accent-[#0284C7]"
            />
          </div>
        </div>

        {/* Calculated Results Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-[#E2E8F0] dark:border-[#1E3A5F]">
          <div className="p-4 bg-white dark:bg-[#132238] rounded-xl border border-[#E2E8F0] dark:border-[#1E3A5F] transition-colors">
            <div className="text-xs text-[#64748B] dark:text-[#94A3B8]">Prevented Failed Deliveries (RTO)</div>
            <div className="text-xl font-bold font-mono tabular-nums text-[#0284C7] dark:text-[#38BDF8] mt-1">
              {rtoOrdersPrevented} Orders / Month
            </div>
            <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
              Saved courier cost: ₹{estimatedRtoCostSaved.toLocaleString('en-IN')}
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-[#132238] rounded-xl border border-[#E2E8F0] dark:border-[#1E3A5F] transition-colors">
            <div className="text-xs text-[#64748B] dark:text-[#94A3B8]">Recovered Repeat Orders</div>
            <div className="text-xl font-bold font-mono tabular-nums text-[#0284C7] dark:text-[#38BDF8] mt-1">
              ₹{reorderLiftRevenue.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
              From timely 28-day cadence prompts
            </div>
          </div>

          <div className="p-4 bg-gradient-to-br from-[#0284C7] to-[#0369A1] text-white rounded-xl shadow-md shadow-[#0284C7]/20 transition-colors">
            <div className="text-xs text-[#BAE6FD]">Total Projected Monthly Value</div>
            <div className="text-xl font-bold font-mono tabular-nums text-white mt-1">
              ₹{totalNetGainMonthly.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-[#E0F2FE] mt-0.5">
              ROI: &gt;200x on SELLVION Pro (₹799/mo)
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Metric Methodology Modal */}
      {activeModalMetric && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#132238] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#BAE6FD] dark:border-[#1E3A5F] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#1E3A5F]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#0284C7] dark:text-[#38BDF8]" />
                <h3 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                  {activeModalMetric.title}
                </h3>
              </div>
              <button
                onClick={() => setActiveModalMetric(null)}
                className="p-1.5 text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#F0F9FF] dark:bg-[#0C243B] rounded-xl border border-[#BAE6FD] dark:border-[#1E3A5F]">
                <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mb-0.5">Current Value:</div>
                <div className="text-xl font-bold font-mono text-[#0284C7] dark:text-[#38BDF8]">
                  {activeModalMetric.value}
                </div>
              </div>

              <div>
                <span className="font-semibold text-[#475569] dark:text-[#CBD5E1] block mb-1">
                  BRULE-06 Calculation Formula:
                </span>
                <div className="p-2.5 bg-[#F8FAFC] dark:bg-[#0F1A2C] rounded-lg border border-[#E2E8F0] dark:border-[#1E3A5F] font-mono text-[11px] text-[#0F172A] dark:text-[#F8FAFC] leading-relaxed">
                  {activeModalMetric.formula}
                </div>
              </div>

              <div>
                <span className="font-semibold text-[#475569] dark:text-[#CBD5E1] block mb-1">
                  Scientific Rationale:
                </span>
                <p className="text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                  {activeModalMetric.explanation}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#E2E8F0] dark:border-[#1E3A5F]">
              <button
                onClick={() => setActiveModalMetric(null)}
                className="px-4 py-2 bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-semibold rounded-xl cursor-pointer"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
