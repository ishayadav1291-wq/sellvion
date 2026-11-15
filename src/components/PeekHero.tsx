import React from 'react';
import {
  Bot,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Users,
  ShoppingCart,
  IndianRupee,
  MessageCircle,
  Sparkles,
  Store,
} from 'lucide-react';
import { ProductTourTab } from './ProductTour';
import { AgenticHeroCanvas } from './AgenticHeroCanvas';
import {
  AgentSummary,
  AnalyticsSummaryResponse,
  AppLanguage,
  ConsoleTabId,
  CustomerRecord,
  WorkflowRecord,
} from '../types';
import { t, tr } from '../i18n/translations';

interface PeekHeroProps {
  language: AppLanguage;
  onOpenConsole: (tab?: ConsoleTabId) => void;
  onSelectTourTab: (tab: ProductTourTab) => void;
  agents: AgentSummary[];
  workflows: WorkflowRecord[];
  customers: CustomerRecord[];
  analytics: AnalyticsSummaryResponse | null;
  onActionQueued?: (msg: string) => void;
}

export const PeekHero: React.FC<PeekHeroProps> = ({
  language,
  onOpenConsole,
  onSelectTourTab,
  agents,
  workflows,
  customers,
  analytics,
  onActionQueued,
}) => {
  const jumpToTour = (tab: ProductTourTab) => {
    onSelectTourTab(tab);
    const el = document.getElementById('how-it-works');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div id="home" className="space-y-12 scroll-mt-24">
      {/* 1. HOME HERO SECTION MATCHING RECORDING & REFERENCE REPOSITORY */}
      <section className="relative -mx-4 sm:-mx-6 lg:-mx-8 -mt-8 overflow-hidden bg-gradient-to-br from-white via-[#F8FAFC] to-[#EFF6FF] dark:from-[#071A35] dark:via-[#092045] dark:to-[#0B2956] text-[#071A35] dark:text-white border-b border-[#E2E8F0] dark:border-[#1E3A5F] transition-colors duration-150">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-spatial-grid opacity-75 dark:opacity-60"
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 grid lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Left Column: Hero Copy, Loop Cadence, CTAs & Live Store Metrics */}
          <div className="lg:col-span-5 space-y-5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#2563EB] dark:text-[#22D3EE]">
              <Bot className="w-4 h-4 shrink-0" />
              <span>{t(language, 'heroEyebrow')}</span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-[#071A35] dark:text-white leading-[1.06]">
              {t(language, 'heroTitle')}
            </h1>

            <p className="text-base text-[#475569] dark:text-[#CBD5E1] max-w-xl leading-relaxed">
              {t(language, 'heroSubtitle')}
            </p>

            {/* Operational Loop Cadence */}
            <div className="text-[11px] font-mono font-semibold text-[#64748B] dark:text-[#94A3B8] tracking-wide">
              {tr(
                language,
                'UNDERSTAND · DECIDE · ACT · VERIFY · MEASURE',
                'समझें · निर्णय लें · कार्य करें · सत्यापित करें · मापें'
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                onClick={() => onOpenConsole('agents')}
                className="h-12 px-6 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-bold flex items-center gap-2 shadow-[0_8px_24px_rgba(37,99,235,0.28)] transition-colors cursor-pointer"
              >
                <span>{t(language, 'tryDemoBtn')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <a
                href="#teammates"
                className="h-12 px-6 rounded-xl border border-[#CBD5E1] dark:border-[#335C8E] bg-white dark:bg-[#0B254B] hover:border-[#2563EB] dark:hover:border-[#22D3EE] text-[#071A35] dark:text-white text-sm font-bold inline-flex items-center justify-center transition-colors"
              >
                {tr(language, 'Meet the 5 Teammates', '5 AI साथियों से मिलें')}
              </a>
            </div>

            {/* Real Store Live Metrics */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[#E2E8F0] dark:border-[#1E3A5F] text-xs">
              <div>
                <div className="text-xl font-extrabold text-[#071A35] dark:text-white tabular-nums">
                  {analytics?.actualObserved.totalCustomers ?? customers.length}
                </div>
                <div className="text-[#64748B] dark:text-[#94A3B8]">
                  {tr(language, 'Buyers remembered', 'याद रखे गए ग्राहक')}
                </div>
              </div>
              <div>
                <div className="text-xl font-extrabold text-[#2563EB] dark:text-[#22D3EE] tabular-nums">
                  {analytics?.opportunities.pendingApprovals ?? 0}
                </div>
                <div className="text-[#64748B] dark:text-[#94A3B8]">
                  {tr(language, 'Pending your tap', 'मंजूरी बाकी')}
                </div>
              </div>
              <div>
                <div className="text-xl font-extrabold text-[#071A35] dark:text-white tabular-nums">
                  {analytics?.actualObserved.executedActions ?? 0}
                </div>
                <div className="text-[#64748B] dark:text-[#94A3B8]">
                  {tr(language, 'Verified actions', 'सत्यापित कार्य')}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Multi-Agent Command Graph */}
          <div className="lg:col-span-7">
            <AgenticHeroCanvas
              language={language}
              agents={agents}
              workflows={workflows}
              onOpenConsole={onOpenConsole}
              onActionQueued={onActionQueued}
            />
          </div>
        </div>
      </section>

      {/* PRESERVED: 6 Feature Capability Cards Bar */}
      <section
        id="teammates"
        className="scroll-mt-24 bg-white dark:bg-[#132238] rounded-3xl border border-[#E2E8F0] dark:border-[#1E3A5F] p-6 lg:p-8 shadow-sm transition-colors"
      >
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 divide-y lg:divide-y-0 lg:divide-x divide-[#F1F5F9] dark:divide-[#1E3A5F]">
          <div
            onClick={() => jumpToTour('customers')}
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

          <div
            onClick={() => jumpToTour('whatsapp')}
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

          <div
            onClick={() => jumpToTour('cod')}
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

          <div
            onClick={() => jumpToTour('udhaar')}
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

          <div
            onClick={() => jumpToTour('whatsapp')}
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

          <div
            onClick={() => onOpenConsole('agents')}
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

      {/* PRESERVED: Bottom Stats Strip */}
      <section className="bg-[#F0F7FF] dark:bg-[#0C243B] border border-[#D6E8FF] dark:border-[#1E456E] rounded-2xl p-4 lg:p-6 shadow-xs">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 items-center">
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
    </div>
  );
};
