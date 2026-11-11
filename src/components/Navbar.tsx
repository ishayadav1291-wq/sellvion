import React from 'react';
import { Bot, Sparkles, LayoutDashboard, Send, ShieldCheck, Sun, Moon } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingCount: number;
  onOpenCopilot: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  pendingCount,
  onOpenCopilot,
  theme,
  onToggleTheme,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#FAF9F5]/90 dark:bg-[#0E1210]/90 backdrop-blur-md border-b border-[#EAE8E1] dark:border-[#232B26] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setActiveTab('overview')}
            className="flex items-center gap-2.5 text-left focus:outline-none group"
          >
            <div className="w-8 h-8 rounded-lg bg-[#0F2E22] dark:bg-[#1E4D3B] text-[#E8F5E9] flex items-center justify-center font-bold text-sm tracking-wider shadow-sm group-hover:bg-[#184534] dark:group-hover:bg-[#28634C] transition-colors">
              S
            </div>
            <span className="text-xl font-bold tracking-tight text-[#141B18] dark:text-[#F0F3F1] font-sans">
              SELLVION
            </span>
          </button>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1 text-sm font-medium text-[#555C57] dark:text-[#9DA49F]">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'overview'
                ? 'text-[#0F2E22] dark:text-[#E8F5E9] bg-[#EAE8DF] dark:bg-[#1E2622] font-semibold'
                : 'hover:text-[#141B18] dark:hover:text-[#F0F3F1] hover:bg-[#F2F1EA] dark:hover:bg-[#18201C]'
            }`}
          >
            Overview & Demo
          </button>

          <button
            onClick={() => setActiveTab('inbox')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'inbox'
                ? 'text-[#0F2E22] dark:text-[#E8F5E9] bg-[#EAE8DF] dark:bg-[#1E2622] font-semibold'
                : 'hover:text-[#141B18] dark:hover:text-[#F0F3F1] hover:bg-[#F2F1EA] dark:hover:bg-[#18201C]'
            }`}
          >
            <span>Approval Inbox</span>
            {pendingCount > 0 && (
              <span className="text-xs bg-[#0F2E22] dark:bg-[#235843] text-white px-1.5 py-0.2 rounded-full font-mono tabular-nums">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('customers')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'customers'
                ? 'text-[#0F2E22] dark:text-[#E8F5E9] bg-[#EAE8DF] dark:bg-[#1E2622] font-semibold'
                : 'hover:text-[#141B18] dark:hover:text-[#F0F3F1] hover:bg-[#F2F1EA] dark:hover:bg-[#18201C]'
            }`}
          >
            Customer 360
          </button>

          <button
            onClick={() => setActiveTab('cod-risk')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'cod-risk'
                ? 'text-[#0F2E22] dark:text-[#E8F5E9] bg-[#EAE8DF] dark:bg-[#1E2622] font-semibold'
                : 'hover:text-[#141B18] dark:hover:text-[#F0F3F1] hover:bg-[#F2F1EA] dark:hover:bg-[#18201C]'
            }`}
          >
            COD Protection
          </button>

          <button
            onClick={() => setActiveTab('udhaar')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'udhaar'
                ? 'text-[#0F2E22] dark:text-[#E8F5E9] bg-[#EAE8DF] dark:bg-[#1E2622] font-semibold'
                : 'hover:text-[#141B18] dark:hover:text-[#F0F3F1] hover:bg-[#F2F1EA] dark:hover:bg-[#18201C]'
            }`}
          >
            Udhaar Khata
          </button>

          <button
            onClick={() => setActiveTab('autonomy')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'autonomy'
                ? 'text-[#0F2E22] dark:text-[#E8F5E9] bg-[#EAE8DF] dark:bg-[#1E2622] font-semibold'
                : 'hover:text-[#141B18] dark:hover:text-[#F0F3F1] hover:bg-[#F2F1EA] dark:hover:bg-[#18201C]'
            }`}
          >
            Earned Autonomy
          </button>

          <button
            onClick={() => setActiveTab('metrics')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'metrics'
                ? 'text-[#0F2E22] dark:text-[#E8F5E9] bg-[#EAE8DF] dark:bg-[#1E2622] font-semibold'
                : 'hover:text-[#141B18] dark:hover:text-[#F0F3F1] hover:bg-[#F2F1EA] dark:hover:bg-[#18201C]'
            }`}
          >
            Incremental ROI
          </button>

          <button
            onClick={() => setActiveTab('comparison')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'comparison'
                ? 'text-[#0F2E22] dark:text-[#E8F5E9] bg-[#EAE8DF] dark:bg-[#1E2622] font-semibold'
                : 'hover:text-[#141B18] dark:hover:text-[#F0F3F1] hover:bg-[#F2F1EA] dark:hover:bg-[#18201C]'
            }`}
          >
            Compare
          </button>
        </nav>

        {/* Zone 3: Actions + Global Theme Toggle */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Global Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            className="p-2 text-[#555C57] dark:text-[#A7AFA9] bg-white dark:bg-[#161C19] border border-[#DDD9CF] dark:border-[#28322C] rounded-lg hover:border-[#B8B4A6] dark:hover:border-[#3E4C43] hover:text-[#141B18] dark:hover:text-white transition-colors shadow-2xs whitespace-nowrap shrink-0"
          >
            {theme === 'light' ? (
              <Moon className="w-4 h-4 text-[#4A5568]" />
            ) : (
              <Sun className="w-4 h-4 text-[#FBBF24]" />
            )}
          </button>

          <button
            onClick={onOpenCopilot}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#0F2E22] dark:text-[#E8F5E9] bg-white dark:bg-[#161C19] border border-[#DDD9CF] dark:border-[#28322C] rounded-lg hover:border-[#B8B4A6] dark:hover:border-[#3E4C43] hover:bg-[#FAF9F5] dark:hover:bg-[#1C2420] shadow-2xs transition-colors whitespace-nowrap shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#059669] dark:text-[#34D399]" />
            <span>Ask AI Employee</span>
          </button>
        </div>
      </div>

      {/* Mobile nav bar for smaller viewports */}
      <div className="lg:hidden flex items-center gap-1 px-4 py-2 overflow-x-auto border-t border-[#EAE8E1] dark:border-[#232B26] bg-[#FAF9F5] dark:bg-[#0E1210] text-xs">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-2.5 py-1 rounded-md shrink-0 ${activeTab === 'overview' ? 'bg-[#0F2E22] dark:bg-[#1E4D3B] text-white' : 'text-[#555C57] dark:text-[#9DA49F]'}`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('inbox')}
          className={`px-2.5 py-1 rounded-md shrink-0 ${activeTab === 'inbox' ? 'bg-[#0F2E22] dark:bg-[#1E4D3B] text-white' : 'text-[#555C57] dark:text-[#9DA49F]'}`}
        >
          Inbox ({pendingCount})
        </button>
        <button
          onClick={() => setActiveTab('customers')}
          className={`px-2.5 py-1 rounded-md shrink-0 ${activeTab === 'customers' ? 'bg-[#0F2E22] dark:bg-[#1E4D3B] text-white' : 'text-[#555C57] dark:text-[#9DA49F]'}`}
        >
          Customers 360
        </button>
        <button
          onClick={() => setActiveTab('cod-risk')}
          className={`px-2.5 py-1 rounded-md shrink-0 ${activeTab === 'cod-risk' ? 'bg-[#0F2E22] dark:bg-[#1E4D3B] text-white' : 'text-[#555C57] dark:text-[#9DA49F]'}`}
        >
          COD Protection
        </button>
        <button
          onClick={() => setActiveTab('udhaar')}
          className={`px-2.5 py-1 rounded-md shrink-0 ${activeTab === 'udhaar' ? 'bg-[#0F2E22] dark:bg-[#1E4D3B] text-white' : 'text-[#555C57] dark:text-[#9DA49F]'}`}
        >
          Udhaar Khata
        </button>
        <button
          onClick={() => setActiveTab('autonomy')}
          className={`px-2.5 py-1 rounded-md shrink-0 ${activeTab === 'autonomy' ? 'bg-[#0F2E22] dark:bg-[#1E4D3B] text-white' : 'text-[#555C57] dark:text-[#9DA49F]'}`}
        >
          Autonomy
        </button>
        <button
          onClick={() => setActiveTab('metrics')}
          className={`px-2.5 py-1 rounded-md shrink-0 ${activeTab === 'metrics' ? 'bg-[#0F2E22] dark:bg-[#1E4D3B] text-white' : 'text-[#555C57] dark:text-[#9DA49F]'}`}
        >
          ROI & Lift
        </button>
        <button
          onClick={() => setActiveTab('comparison')}
          className={`px-2.5 py-1 rounded-md shrink-0 ${activeTab === 'comparison' ? 'bg-[#0F2E22] dark:bg-[#1E4D3B] text-white' : 'text-[#555C57] dark:text-[#9DA49F]'}`}
        >
          Compare
        </button>
      </div>
    </header>
  );
};
