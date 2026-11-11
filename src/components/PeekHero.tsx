import React, { useState } from 'react';
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
  Bot,
  X,
  Play,
  ShoppingCart,
  Shield,
  IndianRupee,
  MessageCircle,
  Store,
  Layers,
  Check,
  ChevronRight,
  Activity,
} from 'lucide-react';
import { InteractiveWhatsAppSimulator } from './InteractiveWhatsAppSimulator';
import { Customer, MetricSummary } from '../types';

interface PeekHeroProps {
  customers: Customer[];
  metrics: MetricSummary;
  onNavigateTab: (tab: string) => void;
  onActionTriggered?: (customerName: string, actionType: string, amount: number) => void;
  onOpenConsole?: (tab?: string) => void;
}

interface AgentDetail {
  agent: string;
  role: string;
  guard: string;
  uptime: string;
  systemPromptSnippet: string;
  model: string;
  recentActivity: string;
  targetTab: string;
}

const AGENTS_DATA: AgentDetail[] = [
  {
    agent: 'Customer Intelligence Agent',
    role: 'Builds customer 360 memory graph from past orders and category preferences.',
    guard: 'Tenant-scoped isolation only',
    uptime: '99.98%',
    model: 'Gemini 2.5 Flash (Customer Graph Engine)',
    systemPromptSnippet: 'You are the SELLVION Customer Intelligence Agent. Analyze order frequency intervals, category affinities, and calculate rolling average cadence for Indian retail merchants.',
    recentActivity: 'Indexed 12 repeat purchase rhythms for Ludhiana & Bengaluru customer clusters.',
    targetTab: 'customers',
  },
  {
    agent: 'Behaviour & Prediction Agent',
    role: 'Calculates SKU replenishment cadence, COD return risk, and churn signals.',
    guard: 'Returns explainable confidence & reason codes',
    uptime: '99.95%',
    model: 'Gemini 2.5 Flash (Risk Scorer)',
    systemPromptSnippet: 'Evaluate order parameters: cart value, pincode risk tier, address completeness, and buyer order history. Calculate an explainable COD risk score (0-100).',
    recentActivity: 'Flagged ORD-9932 (Ludhiana) with 68% COD RTO risk due to missing house/floor number.',
    targetTab: 'cod-risk',
  },
  {
    agent: 'Engagement & Copy Agent',
    role: 'Composes polite, respectful Hinglish WhatsApp drafts tailored to customer tone.',
    guard: 'No send without policy clearance',
    uptime: '100%',
    model: 'Gemini 2.5 Flash (Hinglish Drafter)',
    systemPromptSnippet: 'Draft courteous, authentic WhatsApp messages in natural Hinglish. Never spam, include verified 1-tap UPI payment or reorder links, and adhere to Indian cultural hospitality.',
    recentActivity: 'Drafted 3 personalized replenishment check-ins for organic tea and mustard oil.',
    targetTab: 'inbox',
  },
  {
    agent: 'Policy & Safety Guard',
    role: 'Enforces opt-out lists, quiet hours (9PM-9AM IST), and frequency caps.',
    guard: 'Fails closed if evidence missing',
    uptime: '100%',
    model: 'Deterministic Policy Engine (FR-016)',
    systemPromptSnippet: 'Enforce quiet hours between 21:00 and 09:00 IST. Cap messages to 1 per customer per 48 hours. Require minimum 85% confidence for autonomous dispatches.',
    recentActivity: 'Blocked 1 dispatch scheduled at 22:30 IST; queued for morning delivery at 09:15 IST.',
    targetTab: 'autonomy',
  },
  {
    agent: 'Execution & Measurement Agent',
    role: 'Submits via official provider APIs and attributes revenue to holdout cohorts.',
    guard: 'Idempotent calls & bounded retries',
    uptime: '99.99%',
    model: 'Provider API Orchestrator (Meta Cloud API)',
    systemPromptSnippet: 'Deliver approved messages via official WhatsApp Business Cloud API. Log delivery receipts and calculate incremental lift against uncontacted 10% holdout cohort.',
    recentActivity: 'Measured +22.8% true incremental revenue lift across 30-day cohort trial.',
    targetTab: 'metrics',
  },
];

export const PeekHero: React.FC<PeekHeroProps> = ({
  customers,
  metrics,
  onNavigateTab,
  onActionTriggered,
  onOpenConsole,
}) => {
  const [selectedAgent, setSelectedAgent] = useState<AgentDetail | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<{
    title: string;
    description: string;
    metrics: string;
    tab: string;
  } | null>(null);

  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div id="home" className="space-y-16 scroll-mt-24">
      {/* Hero Headline Section Matching Screenshot Exactly */}
      <section className="relative pt-6 pb-6 overflow-hidden">
        {/* Soft cyan & skyblue ambient wave backdrop matching mockup */}
        <div className="absolute top-0 right-0 -z-10 w-[550px] h-[550px] bg-gradient-to-bl from-[#00BAF2]/25 via-[#38BDF8]/15 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 left-0 -z-10 w-96 h-96 bg-[#0066FF]/10 rounded-full blur-3xl pointer-events-none" />
        {/* Curved right decorative sweep from mockup */}
        <div className="hidden lg:block absolute -right-20 top-10 w-96 h-96 border-[40px] border-[#00BAF2]/10 rounded-full pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-6 items-center">
          {/* Left Column: Copy & Actions (Matching Screenshot 1:1) */}
          <div className="lg:col-span-5 space-y-6 text-left">
            {/* Pill Kicker Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EAF2FF] dark:bg-[#0C243B] border border-[#BAE6FD] dark:border-[#1E456E] text-xs font-semibold text-[#0066FF] dark:text-[#38BDF8] shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-[#00BAF2]" />
              <span>AI-Powered for Merchants</span>
            </div>

            {/* Main Headline (4 Lines Exactly like image.png) */}
            <h1 className="text-4xl sm:text-5xl lg:text-[45px] font-extrabold text-[#0F1E36] dark:text-white tracking-tight leading-[1.12] font-display">
              Your AI Merchant<br />
              Teammate for<br />
              Higher Sales &<br />
              <span className="text-[#0066FF] dark:text-[#38BDF8] relative inline-block mt-0.5">
                Customer Retention
                {/* Curved artistic underline */}
                <svg
                  className="absolute -bottom-2 left-0 w-full h-3 text-[#0066FF] dark:text-[#38BDF8]"
                  viewBox="0 0 300 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M2 9C50 3 150 1 298 7"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>

            {/* Sub-headline */}
            <p className="text-base sm:text-lg text-[#475569] dark:text-[#94A3B8] leading-relaxed max-w-lg">
              Understand customers, predict demand, reduce COD risk, recover missed sales and automate collections — all in one platform.
            </p>

            {/* Hero CTA Button Strip */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                onClick={() => (onOpenConsole ? onOpenConsole('inbox') : scrollTo('pricing'))}
                className="px-6 py-3.5 text-sm font-bold text-white bg-[#0066FF] hover:bg-[#0052CC] rounded-xl transition-all shadow-lg shadow-[#0066FF]/25 hover:shadow-xl flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Start Free on Paytm</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </button>

              <button
                onClick={() => setIsVideoModalOpen(true)}
                className="px-5 py-3.5 text-sm font-semibold text-[#0F1E36] dark:text-[#F8FAFC] bg-white dark:bg-[#132238] border border-[#CBD5E1] dark:border-[#1E3A5F] hover:border-[#0066FF] hover:bg-[#F8FAFC] dark:hover:bg-[#1A2E4C] rounded-xl transition-all shadow-2xs flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <div className="w-5 h-5 rounded-full bg-[#0066FF] text-white flex items-center justify-center">
                  <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
                </div>
                <span>Watch Demo (1 min)</span>
              </button>
            </div>

            {/* Trust Badges Row */}
            <div className="flex flex-wrap items-center gap-5 pt-1 text-xs font-semibold text-[#334155] dark:text-[#94A3B8]">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-[#10B981]/20 text-[#10B981] flex items-center justify-center">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <span>No setup fee</span>
              </div>

              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-[#10B981]/20 text-[#10B981] flex items-center justify-center">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <span>Quick onboarding</span>
              </div>

              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-[#10B981]/20 text-[#10B981] flex items-center justify-center">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <span>Built for Indian merchants</span>
              </div>
            </div>
          </div>

          {/* Right Column: Exact 3D Bot with Laptop Dashboard & Storefront */}
          <div className="lg:col-span-7 relative flex justify-center items-center">
            <div className="relative w-full">
              <img
                src="/assets/aistudio/hero_bot_laptop_clean.png"
                alt="SELLVION AI Merchant Teammate Robot with Laptop Dashboard and Storefront"
                className="w-full h-auto object-contain select-none pointer-events-none drop-shadow-xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 6 Feature Capability Cards Bar (Matching Screenshot Row) */}
      <section className="bg-white dark:bg-[#132238] rounded-3xl border border-[#E2E8F0] dark:border-[#1E3A5F] p-6 lg:p-8 shadow-sm transition-colors">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 divide-y lg:divide-y-0 lg:divide-x divide-[#F1F5F9] dark:divide-[#1E3A5F]">
          {/* 1. Customer Intelligence */}
          <div
            onClick={() => scrollTo('features-reorder')}
            className="flex flex-col items-center text-center p-3 pt-4 lg:pt-3 hover:bg-[#F0F9FF] dark:hover:bg-[#1A2E4C] rounded-2xl transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#E0F2FE] dark:bg-[#0C2E4E] text-[#0066FF] dark:text-[#38BDF8] flex items-center justify-center mb-3 shadow-xs group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <h4 className="text-xs font-bold text-[#0F1E36] dark:text-[#F8FAFC] group-hover:text-[#0066FF] dark:group-hover:text-[#38BDF8] transition-colors">
              Customer Intelligence
            </h4>
            <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-1 leading-snug">
              Understand behaviour and find opportunities
            </p>
          </div>

          {/* 2. Reorder Prediction */}
          <div
            onClick={() => scrollTo('features-reorder')}
            className="flex flex-col items-center text-center p-3 pt-4 lg:pt-3 hover:bg-[#F0F9FF] dark:hover:bg-[#1A2E4C] rounded-2xl transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#E0F7FA] dark:bg-[#073642] text-[#00BAF2] flex items-center justify-center mb-3 shadow-xs group-hover:scale-110 transition-transform">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <h4 className="text-xs font-bold text-[#0F1E36] dark:text-[#F8FAFC] group-hover:text-[#0066FF] dark:group-hover:text-[#38BDF8] transition-colors">
              Reorder Prediction
            </h4>
            <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-1 leading-snug">
              Identify and convert reorder chances
            </p>
          </div>

          {/* 3. COD Risk Analysis */}
          <div
            onClick={() => scrollTo('features-cod')}
            className="flex flex-col items-center text-center p-3 pt-4 lg:pt-3 hover:bg-[#F0F9FF] dark:hover:bg-[#1A2E4C] rounded-2xl transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#E0F2FE] dark:bg-[#0C2E4E] text-[#0066FF] dark:text-[#38BDF8] flex items-center justify-center mb-3 shadow-xs group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h4 className="text-xs font-bold text-[#0F1E36] dark:text-[#F8FAFC] group-hover:text-[#0066FF] dark:group-hover:text-[#38BDF8] transition-colors">
              COD Risk Analysis
            </h4>
            <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-1 leading-snug">
              Detect risky orders and prevent returns
            </p>
          </div>

          {/* 4. Udhaar & Collections */}
          <div
            onClick={() => scrollTo('features-udhaar')}
            className="flex flex-col items-center text-center p-3 pt-4 lg:pt-3 hover:bg-[#F0F9FF] dark:hover:bg-[#1A2E4C] rounded-2xl transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#E0F2FE] dark:bg-[#0C2E4E] text-[#0066FF] dark:text-[#38BDF8] flex items-center justify-center mb-3 shadow-xs group-hover:scale-110 transition-transform">
              <IndianRupee className="w-6 h-6" />
            </div>
            <h4 className="text-xs font-bold text-[#0F1E36] dark:text-[#F8FAFC] group-hover:text-[#0066FF] dark:group-hover:text-[#38BDF8] transition-colors">
              Udhaar & Collections
            </h4>
            <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-1 leading-snug">
              Track payments and send smart reminders
            </p>
          </div>

          {/* 5. WhatsApp Automation */}
          <div
            onClick={() => scrollTo('how-it-works')}
            className="flex flex-col items-center text-center p-3 pt-4 lg:pt-3 hover:bg-[#F0F9FF] dark:hover:bg-[#1A2E4C] rounded-2xl transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#DCFCE7] dark:bg-[#0F3823] text-[#16A34A] flex items-center justify-center mb-3 shadow-xs group-hover:scale-110 transition-transform">
              <MessageCircle className="w-6 h-6" />
            </div>
            <h4 className="text-xs font-bold text-[#0F1E36] dark:text-[#F8FAFC] group-hover:text-[#0066FF] dark:group-hover:text-[#38BDF8] transition-colors">
              WhatsApp Automation
            </h4>
            <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-1 leading-snug">
              Send personalised messages and offers
            </p>
          </div>

          {/* 6. Multi-Agent AI */}
          <div
            onClick={() => scrollTo('features-autonomy')}
            className="flex flex-col items-center text-center p-3 pt-4 lg:pt-3 hover:bg-[#F0F9FF] dark:hover:bg-[#1A2E4C] rounded-2xl transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#E0F2FE] dark:bg-[#0C2E4E] text-[#0066FF] dark:text-[#38BDF8] flex items-center justify-center mb-3 shadow-xs group-hover:scale-110 transition-transform">
              <Sparkles className="w-6 h-6" />
            </div>
            <h4 className="text-xs sm:text-[13px] font-bold text-[#0F1E36] dark:text-[#F8FAFC] group-hover:text-[#0066FF] dark:group-hover:text-[#38BDF8] transition-colors">
              Multi-Agent AI
            </h4>
            <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-1 leading-snug">
              A team of AI agents working together for your business
            </p>
          </div>
        </div>
      </section>

      {/* Bottom Stats Strip (Matching Screenshot Bar) */}
      <section className="bg-[#F0F7FF] dark:bg-[#0C243B] border border-[#D6E8FF] dark:border-[#1E456E] rounded-2xl p-4 lg:p-6 shadow-xs">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 items-center">
          {/* Stat 1 */}
          <div className="flex items-center gap-3 justify-center md:justify-start">
            <div className="w-10 h-10 rounded-xl bg-[#0066FF] text-white flex items-center justify-center shrink-0 shadow-sm shadow-[#0066FF]/25">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-extrabold text-[#0F1E36] dark:text-white font-mono tabular-nums leading-tight">
                10,000+
              </div>
              <div className="text-xs text-[#64748B] dark:text-[#94A3B8] font-medium">
                Merchants (Target)
              </div>
            </div>
          </div>

          {/* Stat 2 */}
          <div className="flex items-center gap-3 justify-center md:justify-start">
            <div className="w-10 h-10 rounded-xl bg-[#0066FF] text-white flex items-center justify-center shrink-0 shadow-sm shadow-[#0066FF]/25">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-extrabold text-[#0066FF] dark:text-[#38BDF8] font-mono tabular-nums leading-tight">
                30%+
              </div>
              <div className="text-xs text-[#64748B] dark:text-[#94A3B8] font-medium">
                Revenue Uplift*
              </div>
            </div>
          </div>

          {/* Stat 3 */}
          <div className="flex items-center gap-3 justify-center md:justify-start">
            <div className="w-10 h-10 rounded-xl bg-[#0066FF] text-white flex items-center justify-center shrink-0 shadow-sm shadow-[#0066FF]/25">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-extrabold text-[#0F1E36] dark:text-white font-mono tabular-nums leading-tight">
                40%
              </div>
              <div className="text-xs text-[#64748B] dark:text-[#94A3B8] font-medium">
                Better Customer Retention*
              </div>
            </div>
          </div>

          {/* Stat 4 */}
          <div className="flex items-center gap-3 justify-center md:justify-start">
            <div className="w-10 h-10 rounded-xl bg-[#0066FF] text-white flex items-center justify-center shrink-0 shadow-sm shadow-[#0066FF]/25">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-extrabold text-[#0066FF] dark:text-[#38BDF8] font-mono tabular-nums leading-tight">
                50%
              </div>
              <div className="text-xs text-[#64748B] dark:text-[#94A3B8] font-medium">
                Lower COD Risk*
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive WhatsApp & AI Simulator Showcase */}
      <section id="how-it-works" className="scroll-mt-24">
        <InteractiveWhatsAppSimulator
          customers={customers}
          onActionTriggered={onActionTriggered}
        />
      </section>

      {/* Multi-Agent Architecture (5 Specialized Agents) */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto">
          <div className="text-xs font-semibold text-[#0066FF] dark:text-[#38BDF8] uppercase tracking-wider mb-1">
            System Architecture
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F1E36] dark:text-white font-display">
            5 Specialized AI Agents Under 1 Orchestrator
          </h2>
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] mt-1">
            Click any agent to inspect its real-time instructions, operational scope, and active logs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {AGENTS_DATA.map((ag, i) => (
            <div
              key={i}
              onClick={() => setSelectedAgent(ag)}
              className="bg-white dark:bg-[#132238] rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] p-4 shadow-2xs flex flex-col justify-between transition-all hover:border-[#0066FF] dark:hover:border-[#38BDF8] hover:shadow-md cursor-pointer group"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                  <span className="text-[10px] font-mono text-[#64748B] dark:text-[#94A3B8]">
                    {ag.uptime}
                  </span>
                </div>
                <div className="text-xs font-bold text-[#0F1E36] dark:text-[#F8FAFC] group-hover:text-[#0066FF] dark:group-hover:text-[#38BDF8] transition-colors mb-1">
                  {ag.agent}
                </div>
                <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                  {ag.role}
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-[#F1F5F9] dark:border-[#1E293B] flex items-center justify-between text-[10px] text-[#0066FF] dark:text-[#38BDF8] font-medium">
                <span>{ag.guard}</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Dynamic Agent Inspector Popup Modal */}
      {selectedAgent && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#132238] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#BAE6FD] dark:border-[#1E3A5F] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#1E3A5F]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#0066FF] text-white flex items-center justify-center shadow-xs">
                  <Bot className="w-4 h-4 text-[#BAE6FD]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                    {selectedAgent.agent}
                  </h3>
                  <div className="text-[10px] text-[#0066FF] dark:text-[#38BDF8] font-mono">
                    {selectedAgent.model}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedAgent(null)}
                className="p-1.5 text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[11px] font-semibold text-[#475569] dark:text-[#CBD5E1] block mb-1">
                  Agent Mission & Boundaries:
                </span>
                <p className="text-[#64748B] dark:text-[#94A3B8] leading-relaxed bg-[#F8FAFC] dark:bg-[#0B1320] p-3 rounded-lg border border-[#E2E8F0] dark:border-[#1E3A5F]">
                  {selectedAgent.role} Policy constraint: <strong>{selectedAgent.guard}</strong>.
                </p>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-[#475569] dark:text-[#CBD5E1] block mb-1">
                  Active System Prompt Directive:
                </span>
                <div className="font-mono text-[11px] bg-[#0F172A] text-[#38BDF8] p-3 rounded-lg border border-[#1E293B] overflow-x-auto leading-relaxed">
                  {selectedAgent.systemPromptSnippet}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-[#475569] dark:text-[#CBD5E1] block mb-1">
                  Live Execution Trace:
                </span>
                <div className="flex items-center gap-2 text-[#0066FF] dark:text-[#38BDF8] bg-[#F0F9FF] dark:bg-[#0C243B] p-2.5 rounded-lg border border-[#BAE6FD] dark:border-[#1E3A5F]">
                  <Activity className="w-3.5 h-3.5 shrink-0" />
                  <span>{selectedAgent.recentActivity}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E8F0] dark:border-[#1E3A5F]">
              <button
                onClick={() => setSelectedAgent(null)}
                className="px-3 py-1.5 text-xs text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const target = selectedAgent.targetTab;
                  setSelectedAgent(null);
                  onNavigateTab(target);
                }}
                className="px-4 py-2 bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm shadow-[#0066FF]/20 cursor-pointer"
              >
                <span>Inspect in {selectedAgent.targetTab.toUpperCase()}</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#BAE6FD]" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1-Minute Demo Video Modal */}
      {isVideoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#132238] rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-[#BAE6FD] dark:border-[#1E3A5F] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#1E3A5F]">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-[#0066FF] dark:text-[#38BDF8]" />
                <h3 className="text-base font-bold text-[#0F1E36] dark:text-[#F8FAFC]">
                  SELLVION in 60 Seconds
                </h3>
              </div>
              <button
                onClick={() => setIsVideoModalOpen(false)}
                className="p-1.5 text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F1E36] dark:hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="aspect-video bg-[#0F1E36] rounded-2xl flex flex-col items-center justify-center p-6 text-white text-center space-y-3 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[#0066FF]/20 to-[#00BAF2]/10" />
              <div className="w-14 h-14 rounded-full bg-[#0066FF] text-white flex items-center justify-center shadow-lg shadow-[#0066FF]/40 cursor-pointer hover:scale-110 transition-transform z-10">
                <Play className="w-6 h-6 fill-current ml-1" />
              </div>
              <div className="z-10">
                <div className="text-sm font-bold">Interactive Product Walkthrough</div>
                <div className="text-xs text-[#BAE6FD]">
                  How SELLVION predicts reorders and stops COD returns on Paytm
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E8F0] dark:border-[#1E3A5F]">
              <button
                onClick={() => {
                  setIsVideoModalOpen(false);
                  onNavigateTab('inbox');
                }}
                className="px-5 py-2.5 bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs font-semibold rounded-xl cursor-pointer"
              >
                Open Live Approval Inbox →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
