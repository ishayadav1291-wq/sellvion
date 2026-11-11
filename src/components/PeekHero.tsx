import React from 'react';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  RotateCcw,
  Clock,
  CheckCircle2,
  Users,
  Zap,
} from 'lucide-react';
import { InteractiveWhatsAppSimulator } from './InteractiveWhatsAppSimulator';
import { Customer, MetricSummary } from '../types';

interface PeekHeroProps {
  customers: Customer[];
  metrics: MetricSummary;
  onNavigateTab: (tab: string) => void;
  onActionTriggered?: (customerName: string, actionType: string, amount: number) => void;
}

export const PeekHero: React.FC<PeekHeroProps> = ({
  customers,
  metrics,
  onNavigateTab,
  onActionTriggered,
}) => {
  return (
    <div className="space-y-16">
      {/* Hero Headline Section */}
      <section className="text-center max-w-4xl mx-auto pt-6 pb-2">
        {/* Subtle kicker text with typographic separator (no pills) */}
        <div className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#059669] dark:text-[#34D399] mb-4">
          <span>Autonomous AI Employee</span>
          <span aria-hidden="true">·</span>
          <span>Indian E-Commerce & Retail</span>
          <span aria-hidden="true">·</span>
          <span>Earned Autonomy</span>
        </div>

        {/* Hero Title with text-wrap: balance */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#141B18] dark:text-[#F0F3F1] tracking-tight leading-[1.1] [text-wrap:balance]">
          Understand every customer. Take the next best action. Grow every business.
        </h1>

        {/* Subtitle */}
        <p className="mt-5 text-base sm:text-lg text-[#555C57] dark:text-[#9DA49F] max-w-2xl mx-auto leading-relaxed [text-wrap:balance]">
          SELLVION turns scattered order history, purchase rhythms, and bahi-khata udhaar records into timely reorders, COD return protection, and polite Hinglish WhatsApp actions.
        </p>

        {/* CTA Button Strip (Strict zero-pill, single-line buttons) */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => onNavigateTab('inbox')}
            className="px-6 py-3 text-sm font-semibold text-white bg-[#0F2E22] dark:bg-[#1E4D3B] hover:bg-[#1A4535] dark:hover:bg-[#28634C] rounded-xl transition-all shadow-sm hover:shadow flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <span>Open Approval Inbox</span>
            <ArrowRight className="w-4 h-4 text-[#34D399]" />
          </button>

          <button
            onClick={() => onNavigateTab('cod-risk')}
            className="px-6 py-3 text-sm font-semibold text-[#0F2E22] dark:text-[#E8F5E9] bg-white dark:bg-[#161C19] border border-[#DDD9CF] dark:border-[#28322C] hover:border-[#B8B4A6] dark:hover:border-[#3E4C43] hover:bg-[#FAF9F5] dark:hover:bg-[#1C2420] rounded-xl transition-colors shadow-2xs flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <span>Inspect COD RTO Defense</span>
          </button>
        </div>

        {/* Quiet Trust Proof Strip */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-[#6B726C] dark:text-[#8C948F]">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#059669] dark:text-[#34D399]" />
            <span>Human-in-the-loop approval by default</span>
          </div>
          <span aria-hidden="true" className="hidden sm:inline">·</span>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#059669] dark:text-[#34D399]" />
            <span>Official WhatsApp Business API</span>
          </div>
          <span aria-hidden="true" className="hidden sm:inline">·</span>
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-[#059669] dark:text-[#34D399]" />
            <span>Scientific holdout revenue proof</span>
          </div>
        </div>
      </section>

      {/* Interactive WhatsApp & AI Simulator Showcase */}
      <section>
        <InteractiveWhatsAppSimulator
          customers={customers}
          onActionTriggered={onActionTriggered}
        />
      </section>

      {/* Problem vs Solution: The Indian Merchant Reality */}
      <section className="bg-white dark:bg-[#161C19] rounded-3xl border border-[#EAE8E1] dark:border-[#232B26] p-8 lg:p-12 shadow-xs transition-colors">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="text-xs font-semibold text-[#059669] dark:text-[#34D399] uppercase tracking-wider mb-1">
            The Core Merchant Challenge
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#141B18] dark:text-[#F0F3F1]">
            Why small e-commerce merchants lose repeat revenue
          </h2>
          <p className="text-xs sm:text-sm text-[#555C57] dark:text-[#9DA49F] mt-2 leading-relaxed">
            Records are scattered across notebooks and separate systems. Regular buyers slip away quietly, while high COD returns eat profit margins.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left: Without SELLVION */}
          <div className="p-6 rounded-2xl bg-[#FFFBF8] dark:bg-[#201510] border border-[#F5E6DC] dark:border-[#382319] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#9A3412] dark:text-[#F97316]">
                Traditional Way
              </span>
              <span className="text-xs font-mono text-[#C2410C] dark:text-[#FB923C]">High Friction & Returns</span>
            </div>
            <ul className="space-y-3 text-xs text-[#431407] dark:text-[#FED7AA] leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-[#EA580C] font-bold">✕</span>
                <span>
                  <strong>20–30% COD orders return to origin (RTO)</strong>: Couriers charge both ways (₹200–₹300 loss per package) while inventory gets stuck in transit for weeks.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#EA580C] font-bold">✕</span>
                <span>
                  <strong>Lost repeat buyers</strong>: No visibility into replenishment cycles. A customer who buys chai every 28 days gets forgotten on day 35.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#EA580C] font-bold">✕</span>
                <span>
                  <strong>Manual follow-up fatigue</strong>: Typing WhatsApp reminders one by one feels awkward and drains 15+ merchant hours every week.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#EA580C] font-bold">✕</span>
                <span>
                  <strong>Scattered bahi-khata records</strong>: Customer orders in Shopify, udhaar in notebooks, messages in personal WhatsApp.
                </span>
              </li>
            </ul>
          </div>

          {/* Right: With SELLVION */}
          <div className="p-6 rounded-2xl bg-[#F4F9F6] dark:bg-[#11231B] border border-[#CCE8D7] dark:border-[#1F4031] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#065F46] dark:text-[#34D399]">
                The SELLVION Way
              </span>
              <span className="text-xs font-mono text-[#059669] dark:text-[#6EE7B7]">Autonomous Intelligence</span>
            </div>
            <ul className="space-y-3 text-xs text-[#064E3B] dark:text-[#D1FAE5] leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-[#059669] dark:text-[#34D399] font-bold">✓</span>
                <span>
                  <strong>COD RTO slashed to 11.8%</strong>: Detects high-risk orders in real time and automatically nudges ₹50 UPI prepayment discounts before shipping.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#059669] dark:text-[#34D399] font-bold">✓</span>
                <span>
                  <strong>Predictive reorder engine</strong>: Knows exactly when Priya’s tea or Sunita’s mustard oil is running low and drafts polite Hinglish check-ins.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#059669] dark:text-[#34D399] font-bold">✓</span>
                <span>
                  <strong>Earned Autonomy with Owner Control</strong>: You approve recommendations first. As trust builds, routine tasks automate safely under strict daily caps.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#059669] dark:text-[#34D399] font-bold">✓</span>
                <span>
                  <strong>Scientific holdout proof</strong>: Proves incremental revenue versus a holdout control group. Zero fake vanity metrics.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Multi-Agent Architecture (Page 8 of PDF) */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto">
          <div className="text-xs font-semibold text-[#059669] dark:text-[#34D399] uppercase tracking-wider mb-1">
            System Architecture
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#141B18] dark:text-[#F0F3F1]">
            5 Specialized AI Agents Under 1 Orchestrator
          </h2>
          <p className="text-xs sm:text-sm text-[#555C57] dark:text-[#9DA49F] mt-1">
            Each agent has narrow permissions, bounded tools, and zero authority to bypass policy rules.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            {
              agent: 'Customer Intelligence',
              role: 'Builds customer 360 memory graph from past orders and category preferences.',
              guard: 'Tenant-scoped isolation only',
            },
            {
              agent: 'Behaviour & Prediction',
              role: 'Calculates SKU replenishment cadence, COD return risk, and churn signals.',
              guard: 'Returns confidence & reason codes',
            },
            {
              agent: 'Engagement Agent',
              role: 'Composes polite, respectful Hinglish WhatsApp drafts tailored to customer tone.',
              guard: 'No send without policy clearance',
            },
            {
              agent: 'Policy & Safety Guard',
              role: 'Enforces opt-out lists, quiet hours (9PM-9AM IST), and frequency caps.',
              guard: 'Fails closed if evidence missing',
            },
            {
              agent: 'Execution & Measurement',
              role: 'Submits via official provider APIs and attributes revenue to holdout cohorts.',
              guard: 'Idempotent calls & bounded retries',
            },
          ].map((ag, i) => (
            <div
              key={i}
              className="bg-white dark:bg-[#161C19] rounded-xl border border-[#EAE8E1] dark:border-[#232B26] p-4 shadow-xs flex flex-col justify-between transition-colors"
            >
              <div>
                <div className="text-xs font-bold text-[#0F2E22] dark:text-[#34D399] mb-1">
                  {ag.agent}
                </div>
                <p className="text-[11px] text-[#555C57] dark:text-[#9DA49F] leading-relaxed">
                  {ag.role}
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-[#F2F0E8] dark:border-[#232B26] text-[10px] text-[#059669] dark:text-[#34D399] font-medium">
                {ag.guard}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
