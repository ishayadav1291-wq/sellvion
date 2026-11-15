import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Users,
  X,
  Play,
  ShoppingCart,
  IndianRupee,
  MessageCircle,
  Store,
  Check,
} from 'lucide-react';
import { ProductTourTab } from './ProductTour';

interface PeekHeroProps {
  onOpenConsole: (tab?: string) => void;
  onSelectTourTab: (tab: ProductTourTab) => void;
}

export const PeekHero: React.FC<PeekHeroProps> = ({
  onOpenConsole,
  onSelectTourTab,
}) => {
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  const jumpToTour = (tab: ProductTourTab) => {
    onSelectTourTab(tab);
    const el = document.getElementById('how-it-works');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div id="home" className="space-y-12 scroll-mt-24">
      {/* Hero Headline Section Matching Reference Design */}
      <section className="relative pt-6 pb-4 overflow-hidden">
        {/* Soft cyan & skyblue ambient wave backdrop */}
        <div className="absolute top-0 right-0 -z-10 w-[550px] h-[550px] bg-gradient-to-bl from-[#00BAF2]/25 via-[#38BDF8]/15 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 left-0 -z-10 w-96 h-96 bg-[#0066FF]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="hidden lg:block absolute -right-20 top-10 w-96 h-96 border-[40px] border-[#00BAF2]/10 rounded-full pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-6 items-center">
          {/* Left Column: Copy & Actions */}
          <div className="lg:col-span-5 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EAF2FF] dark:bg-[#0C243B] border border-[#BAE6FD] dark:border-[#1E456E] text-xs font-semibold text-[#0066FF] dark:text-[#38BDF8] shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-[#00BAF2]" />
              <span>AI-Powered for Merchants</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[45px] font-extrabold text-[#0F1E36] dark:text-white tracking-tight leading-[1.12] font-display">
              Your AI Merchant<br />
              Teammate for<br />
              Higher Sales &<br />
              <span className="text-[#0066FF] dark:text-[#38BDF8] relative inline-block mt-0.5">
                Customer Retention
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

            <p className="text-base sm:text-lg text-[#475569] dark:text-[#94A3B8] leading-relaxed max-w-lg">
              Understand customers, predict demand, reduce COD risk, recover missed sales and automate collections — all in one platform.
            </p>

            {/* Hero CTA Button Strip */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                onClick={() => onOpenConsole('agents')}
                className="px-6 py-3.5 text-sm font-bold text-white bg-[#0066FF] hover:bg-[#0052CC] rounded-xl transition-all shadow-lg shadow-[#0066FF]/25 hover:shadow-xl flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Explore AI Teammates</span>
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

      {/* 6 Feature Capability Cards Bar */}
      <section className="bg-white dark:bg-[#132238] rounded-3xl border border-[#E2E8F0] dark:border-[#1E3A5F] p-6 lg:p-8 shadow-sm transition-colors">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 divide-y lg:divide-y-0 lg:divide-x divide-[#F1F5F9] dark:divide-[#1E3A5F]">
          <div
            onClick={() => jumpToTour('whatsapp')}
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
            onClick={() => jumpToTour('calculator')}
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

      {/* Bottom Stats Strip */}
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

      {/* 1-Minute Demo Video Modal */}
      {isVideoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#132238] rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-[#BAE6FD] dark:border-[#1E3A5F] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#1E3A5F]">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-[#0066FF] dark:text-[#38BDF8]" />
                <h3 className="text-base font-bold text-[#0F1E36] dark:text-[#F8FAFC]">
                  How SELLVION Works in 60 Seconds
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
              <div className="w-14 h-14 rounded-full bg-[#0066FF] text-white flex items-center justify-center shadow-lg shadow-[#0066FF]/40 cursor-pointer hover:scale-105 transition-transform">
                <Play className="w-6 h-6 fill-current ml-1" />
              </div>
              <div>
                <div className="text-sm font-bold">See Live Store Walkthrough</div>
                <div className="text-xs text-[#BAE6FD] mt-1">
                  Approve WhatsApp drafts, stop risky COD shipments, and track udhaar payments.
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E8F0] dark:border-[#1E3A5F]">
              <button
                onClick={() => {
                  setIsVideoModalOpen(false);
                  onOpenConsole('inbox');
                }}
                className="px-5 py-2.5 bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs font-semibold rounded-xl cursor-pointer"
              >
                Open Merchant Workspace →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
