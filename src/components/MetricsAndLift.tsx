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
        <div className="flex items-center gap-2 text-xs text-[#555C57] dark:text-[#9DA49F] mb-1">
          <span>Incremental Revenue & Lift Science</span>
          <span>·</span>
          <span className="font-semibold text-[#0F2E22] dark:text-[#34D399]">BR-08 & BRULE-06 Control-Group Standard</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#141B18] dark:text-[#F0F3F1]">
          Measurable Business Impact
        </h2>
        <p className="text-sm text-[#555C57] dark:text-[#9DA49F] mt-0.5">
          Unlike vanity click counters, SELLVION runs scientific holdout control cohorts to separate organic repeat orders from real AI-driven incremental sales.
        </p>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#161C19] rounded-xl border border-[#EAE8E1] dark:border-[#232B26] p-5 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-xs text-[#6B726C] dark:text-[#8C948F] mb-1">
            <span>Incremental AI Revenue</span>
            <span className="text-[#059669] dark:text-[#34D399] font-medium">+22.8% Lift</span>
          </div>
          <div className="text-2xl font-bold text-[#0F2E22] dark:text-[#34D399] font-mono tabular-nums">
            ₹{metrics.incrementalAiRevenue.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-[#555C57] dark:text-[#9DA49F] mt-1">
            Measured against 10% holdout group
          </div>
        </div>

        <div className="bg-white dark:bg-[#161C19] rounded-xl border border-[#EAE8E1] dark:border-[#232B26] p-5 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-xs text-[#6B726C] dark:text-[#8C948F] mb-1">
            <span>COD Return-to-Origin (RTO)</span>
            <span className="text-[#059669] dark:text-[#34D399] font-medium">-14.6% Down</span>
          </div>
          <div className="text-2xl font-bold text-[#059669] dark:text-[#34D399] font-mono tabular-nums">
            {metrics.codRtoCurrentPct}%
          </div>
          <div className="text-[11px] text-[#555C57] dark:text-[#9DA49F] mt-1">
            Down from store baseline of 26.4%
          </div>
        </div>

        <div className="bg-white dark:bg-[#161C19] rounded-xl border border-[#EAE8E1] dark:border-[#232B26] p-5 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-xs text-[#6B726C] dark:text-[#8C948F] mb-1">
            <span>Direct Courier Loss Saved</span>
            <span className="text-[#0F2E22] dark:text-[#34D399] font-medium">Prevented</span>
          </div>
          <div className="text-2xl font-bold text-[#141B18] dark:text-[#F0F3F1] font-mono tabular-nums">
            ₹{metrics.rtoSavedAmount.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-[#555C57] dark:text-[#9DA49F] mt-1">
            From 482 prevented COD failures
          </div>
        </div>

        <div className="bg-white dark:bg-[#161C19] rounded-xl border border-[#EAE8E1] dark:border-[#232B26] p-5 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-xs text-[#6B726C] dark:text-[#8C948F] mb-1">
            <span>Merchant Manual Hours Saved</span>
            <span className="text-[#059669] dark:text-[#34D399] font-medium">Weekly</span>
          </div>
          <div className="text-2xl font-bold text-[#141B18] dark:text-[#F0F3F1] font-mono tabular-nums">
            {metrics.hoursSavedWeekly} Hours
          </div>
          <div className="text-[11px] text-[#555C57] dark:text-[#9DA49F] mt-1">
            Automated WhatsApp typing & tracking
          </div>
        </div>
      </div>

      {/* Cohort Comparison Bar Chart Mockup */}
      <div className="bg-white dark:bg-[#161C19] rounded-2xl border border-[#EAE8E1] dark:border-[#232B26] p-6 shadow-xs space-y-4 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-[#141B18] dark:text-[#F0F3F1]">
              Incremental Lift: AI Engaged Cohort vs Uncontacted Holdout
            </h3>
            <p className="text-xs text-[#6B726C] dark:text-[#8C948F] mt-0.5">
              Strictly verifies true incremental purchase causality (BRULE-06 compliant).
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-[#555C57] dark:text-[#9DA49F]">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[#0F2E22] dark:bg-[#34D399]" />
              <span className="text-[#141B18] dark:text-[#F0F3F1]">SELLVION Cohort (90%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[#D5D2C8] dark:bg-[#35433C]" />
              <span>Holdout Group (10%)</span>
            </div>
          </div>
        </div>

        {/* Visual Progress / Comparison Rows */}
        <div className="space-y-4 pt-2">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold text-[#141B18] dark:text-[#F0F3F1]">30-Day Repeat Purchase Rate</span>
              <span className="font-mono tabular-nums text-[#047857] dark:text-[#34D399] font-bold">
                28.4% vs 14.2% holdout (+100% relative lift)
              </span>
            </div>
            <div className="w-full h-3 bg-[#FAF9F5] dark:bg-[#1B2520] rounded-full overflow-hidden flex border border-[#EAE8E1] dark:border-[#28352E]">
              <div className="h-full bg-[#0F2E22] dark:bg-[#34D399] rounded-full" style={{ width: '56.8%' }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold text-[#141B18] dark:text-[#F0F3F1]">COD Order Delivery Success</span>
              <span className="font-mono tabular-nums text-[#047857] dark:text-[#34D399] font-bold">
                88.2% delivered vs 73.6% holdout (+14.6% fewer RTOs)
              </span>
            </div>
            <div className="w-full h-3 bg-[#FAF9F5] dark:bg-[#1B2520] rounded-full overflow-hidden flex border border-[#EAE8E1] dark:border-[#28352E]">
              <div className="h-full bg-[#059669] dark:bg-[#10B981] rounded-full" style={{ width: '88.2%' }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold text-[#141B18] dark:text-[#F0F3F1]">Udhaar 14-Day Collection Rate</span>
              <span className="font-mono tabular-nums text-[#047857] dark:text-[#34D399] font-bold">
                71.8% cleared vs 36.4% holdout (+97% faster collection)
              </span>
            </div>
            <div className="w-full h-3 bg-[#FAF9F5] dark:bg-[#1B2520] rounded-full overflow-hidden flex border border-[#EAE8E1] dark:border-[#28352E]">
              <div className="h-full bg-[#0F2E22] dark:bg-[#34D399] rounded-full" style={{ width: '71.8%' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Store ROI Calculator */}
      <div className="bg-[#FAF9F5] dark:bg-[#121714] rounded-2xl border border-[#E8E6DF] dark:border-[#232B26] p-6 shadow-xs space-y-6 transition-colors">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#555C57] dark:text-[#9DA49F] mb-1">
            <span>Interactive Projection</span>
            <span>·</span>
            <span className="font-semibold text-[#0F2E22] dark:text-[#34D399]">Store Value Calculator</span>
          </div>
          <h3 className="text-lg font-bold text-[#141B18] dark:text-[#F0F3F1]">
            Calculate SELLVION's Return for Your Store
          </h3>
          <p className="text-xs text-[#6B726C] dark:text-[#8C948F] mt-0.5">
            Adjust your store's numbers below to project monthly savings from COD RTO prevention and repeat reorders.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="flex justify-between text-xs mb-1.5 font-medium text-[#4A504B] dark:text-[#A7AFA9]">
              <span>Monthly Orders</span>
              <span className="font-mono tabular-nums font-bold text-[#0F2E22] dark:text-[#34D399]">
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
              className="w-full accent-[#0F2E22] dark:accent-[#34D399]"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1.5 font-medium text-[#4A504B] dark:text-[#A7AFA9]">
              <span>Average Order Value (AOV)</span>
              <span className="font-mono tabular-nums font-bold text-[#0F2E22] dark:text-[#34D399]">
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
              className="w-full accent-[#0F2E22] dark:accent-[#34D399]"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1.5 font-medium text-[#4A504B] dark:text-[#A7AFA9]">
              <span>COD Share of Orders</span>
              <span className="font-mono tabular-nums font-bold text-[#0F2E22] dark:text-[#34D399]">
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
              className="w-full accent-[#0F2E22] dark:accent-[#34D399]"
            />
          </div>
        </div>

        {/* Calculated Results Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-[#EAE8E1] dark:border-[#232B26]">
          <div className="p-4 bg-white dark:bg-[#161C19] rounded-xl border border-[#EAE8E1] dark:border-[#232B26] transition-colors">
            <div className="text-xs text-[#6B726C] dark:text-[#8C948F]">Prevented Failed Deliveries (RTO)</div>
            <div className="text-xl font-bold font-mono tabular-nums text-[#047857] dark:text-[#34D399] mt-1">
              {rtoOrdersPrevented} Orders / Month
            </div>
            <div className="text-[11px] text-[#555C57] dark:text-[#9DA49F] mt-0.5">
              Saved courier cost: ₹{estimatedRtoCostSaved.toLocaleString('en-IN')}
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-[#161C19] rounded-xl border border-[#EAE8E1] dark:border-[#232B26] transition-colors">
            <div className="text-xs text-[#6B726C] dark:text-[#8C948F]">Recovered Repeat Orders</div>
            <div className="text-xl font-bold font-mono tabular-nums text-[#047857] dark:text-[#34D399] mt-1">
              ₹{reorderLiftRevenue.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-[#555C57] dark:text-[#9DA49F] mt-0.5">
              From timely 28-day cadence prompts
            </div>
          </div>

          <div className="p-4 bg-[#0F2E22] dark:bg-[#153426] text-white rounded-xl transition-colors">
            <div className="text-xs text-[#A7F3D0]">Total Projected Monthly Value</div>
            <div className="text-xl font-bold font-mono tabular-nums text-white mt-1">
              ₹{totalNetGainMonthly.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-[#D1FAE5] mt-0.5">
              ROI: &gt;200x on SELLVION Pro (₹799/mo)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
