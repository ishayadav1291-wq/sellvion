import React, { useState } from 'react';
import { Bot, Sparkles, LayoutDashboard, Send, ShieldCheck, Sun, Moon, ChevronDown, ArrowRight, X } from 'lucide-react';

interface NavbarProps {
  onOpenConsole: (view?: string) => void;
  pendingCount: number;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onResetData?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenConsole,
  pendingCount,
  theme,
  onToggleTheme,
  onResetData,
}) => {
  const [featuresDropdownOpen, setFeaturesDropdownOpen] = useState(false);

  const scrollToSection = (id: string) => {
    setFeaturesDropdownOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0B1320]/95 backdrop-blur-md border-b border-[#E2E8F0] dark:border-[#1E293B] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-6">
        {/* Left: Paytm | SELLVION Co-Branding Lockup */}
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="#home"
            className="flex items-center gap-3 text-left focus:outline-none group cursor-pointer"
          >
            {/* Paytm Logo Image from user attachment */}
            <div className="flex items-center">
              <img
                src="/assets/aistudio/image_6fa37345.png"
                alt="Paytm"
                className="h-6 sm:h-7 w-auto object-contain dark:brightness-110"
              />
            </div>

            {/* Vertical Divider */}
            <span className="h-6 w-px bg-[#CBD5E1] dark:bg-[#334155]" />

            {/* SELLVION Icon & Wordmark */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#6366F1] via-[#0066FF] to-[#00BAF2] text-white flex items-center justify-center font-bold text-sm tracking-wider shadow-sm shadow-[#0066FF]/25">
                S
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-extrabold tracking-tight text-[#0F1E36] dark:text-[#F8FAFC] font-display leading-tight">
                  SELLVION
                </span>
                <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] font-medium tracking-tight -mt-0.5">
                  AI Merchant Teammate
                </span>
              </div>
            </div>
          </a>
        </div>

        {/* Center: Navigation Links Matching Marketing Screenshot */}
        <nav className="hidden lg:flex items-center gap-1.5 text-xs font-semibold text-[#475569] dark:text-[#94A3B8]">
          <a
            href="#home"
            className="px-3.5 py-1.5 rounded-full bg-[#EAF2FF] dark:bg-[#0C243B] text-[#0066FF] dark:text-[#38BDF8] transition-all cursor-pointer font-bold"
          >
            Home
          </a>

          {/* Features Dropdown Menu */}
          <div className="relative">
            <button
              onClick={() => setFeaturesDropdownOpen(!featuresDropdownOpen)}
              className="px-3 py-1.5 rounded-full hover:text-[#0066FF] dark:hover:text-[#38BDF8] hover:bg-[#F8FAFC] dark:hover:bg-[#132238]/60 transition-all flex items-center gap-1 cursor-pointer"
            >
              <span>Features</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {featuresDropdownOpen && (
              <div
                className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-[#132238] rounded-2xl shadow-xl border border-[#BAE6FD] dark:border-[#1E3A5F] p-2 space-y-1 animate-fadeIn z-50 text-xs"
                onMouseLeave={() => setFeaturesDropdownOpen(false)}
              >
                <button
                  onClick={() => scrollToSection('features-cod')}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#F0F9FF] dark:hover:bg-[#1A2E4C] text-[#0F172A] dark:text-[#F8FAFC] flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <div className="font-semibold">COD Risk Protection</div>
                    <div className="text-[10px] text-[#64748B]">Slashes returns from 26% to 11%</div>
                  </div>
                  <span className="text-[10px] text-[#DC2626] font-mono">11.8%</span>
                </button>

                <button
                  onClick={() => scrollToSection('features-reorder')}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#F0F9FF] dark:hover:bg-[#1A2E4C] text-[#0F172A] dark:text-[#F8FAFC] flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <div className="font-semibold">Predictive Reorder Cadence</div>
                    <div className="text-[10px] text-[#64748B]">Automates repeat purchase prompts</div>
                  </div>
                  <span className="text-[10px] text-[#0066FF] font-mono">+22%</span>
                </button>

                <button
                  onClick={() => scrollToSection('features-udhaar')}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#F0F9FF] dark:hover:bg-[#1A2E4C] text-[#0F172A] dark:text-[#F8FAFC] flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <div className="font-semibold">Udhaar & Bahi-Khata</div>
                    <div className="text-[10px] text-[#64748B]">Gentle WhatsApp recovery with UPI QR</div>
                  </div>
                  <span className="text-[10px] text-[#16A34A] font-mono">UPI</span>
                </button>

                <button
                  onClick={() => scrollToSection('features-autonomy')}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#F0F9FF] dark:hover:bg-[#1A2E4C] text-[#0F172A] dark:text-[#F8FAFC] flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <div className="font-semibold">Earned Autonomy Policy</div>
                    <div className="text-[10px] text-[#64748B]">Human-in-the-loop owner approval</div>
                  </div>
                  <span className="text-[10px] text-[#0066FF] font-mono">FR-016</span>
                </button>
              </div>
            )}
          </div>

          <a
            href="#how-it-works"
            className="px-3 py-1.5 rounded-full hover:text-[#0066FF] dark:hover:text-[#38BDF8] hover:bg-[#F8FAFC] dark:hover:bg-[#132238]/60 transition-all cursor-pointer"
          >
            How it Works
          </a>

          <a
            href="#pricing"
            className="px-3 py-1.5 rounded-full hover:text-[#0066FF] dark:hover:text-[#38BDF8] hover:bg-[#F8FAFC] dark:hover:bg-[#132238]/60 transition-all cursor-pointer"
          >
            Pricing
          </a>

          <a
            href="#partners"
            className="px-3 py-1.5 rounded-full hover:text-[#0066FF] dark:hover:text-[#38BDF8] hover:bg-[#F8FAFC] dark:hover:bg-[#132238]/60 transition-all cursor-pointer"
          >
            Partners
          </a>

          <a
            href="#faq"
            className="px-3 py-1.5 rounded-full hover:text-[#0066FF] dark:hover:text-[#38BDF8] hover:bg-[#F8FAFC] dark:hover:bg-[#132238]/60 transition-all cursor-pointer"
          >
            Resources
          </a>
        </nav>

        {/* Right: Actions Matching Screenshot */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Global Theme Toggle */}
          <button
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            className="p-2 text-[#64748B] dark:text-[#94A3B8] bg-[#F8FAFC] dark:bg-[#132238] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl hover:border-[#BAE6FD] hover:text-[#0066FF] transition-colors cursor-pointer"
          >
            {theme === 'light' ? <Moon className="w-4 h-4 text-[#475569]" /> : <Sun className="w-4 h-4 text-[#38BDF8]" />}
          </button>

          {/* Login Button (Launches Merchant Workspace) */}
          <button
            onClick={() => onOpenConsole('inbox')}
            className="px-4 py-2 text-xs font-semibold text-[#0F1E36] dark:text-[#F8FAFC] bg-white dark:bg-[#132238] border border-[#CBD5E1] dark:border-[#1E3A5F] hover:border-[#0066FF] dark:hover:border-[#38BDF8] rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>Login</span>
            {pendingCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-[#0066FF] animate-pulse" />
            )}
          </button>

          {/* Primary CTA */}
          <button
            onClick={() => onOpenConsole('inbox')}
            className="px-4 py-2 text-xs font-bold text-white bg-[#0066FF] hover:bg-[#0052CC] rounded-xl shadow-md shadow-[#0066FF]/25 hover:shadow-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <span>Get Started Free</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Mobile Nav Drawer */}
      <div className="lg:hidden flex items-center gap-2 px-4 py-2 overflow-x-auto border-t border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0B1320] text-xs">
        <a href="#home" className="px-3 py-1 rounded-full bg-[#0066FF] text-white shrink-0">
          Home
        </a>
        <a href="#features-cod" className="px-3 py-1 rounded-full text-[#64748B] shrink-0">
          COD Protection
        </a>
        <a href="#how-it-works" className="px-3 py-1 rounded-full text-[#64748B] shrink-0">
          How it Works
        </a>
        <a href="#pricing" className="px-3 py-1 rounded-full text-[#64748B] shrink-0">
          Pricing
        </a>
        <button
          onClick={() => onOpenConsole('inbox')}
          className="px-3 py-1 rounded-full bg-[#EAF2FF] text-[#0066FF] font-bold shrink-0 ml-auto"
        >
          Live App ({pendingCount})
        </button>
      </div>
    </header>
  );
};
