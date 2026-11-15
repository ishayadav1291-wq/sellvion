import React, { useState } from 'react';
import {
  Send,
  RefreshCw,
  CheckCheck,
  ShieldCheck,
  RotateCcw,
  ShieldAlert,
  IndianRupee,
  TrendingUp,
  MessageCircle,
  ArrowRight,
  QrCode,
  CheckCircle2,
  Users,
  History,
  Search,
  Phone,
  MapPin,
  Clock,
  ChevronRight,
  X,
  Sparkles,
} from 'lucide-react';
import { Customer } from '../types';

export type ProductTourTab = 'whatsapp' | 'cod' | 'udhaar' | 'calculator' | 'customers';

interface ProductTourProps {
  activeTab: ProductTourTab;
  onChangeTab: (tab: ProductTourTab) => void;
  customers: Customer[];
  onOpenWorkspace: (workspaceTab?: string) => void;
  onActionTriggered?: (customerName: string, actionType: string, amount: number) => void;
}

type ScenarioKey = 'reorder' | 'cod_prepay' | 'udhaar' | 'winback';

interface DraftHistoryItem {
  id: string;
  scenario: ScenarioKey;
  scenarioLabel: string;
  customer: string;
  tone: 'warm_hinglish' | 'direct' | 'festival';
  toneLabel: string;
  message: string;
  timestamp: string;
  status: 'Sent' | 'Rewritten' | 'Saved';
}

export const ProductTour: React.FC<ProductTourProps> = ({
  activeTab,
  onChangeTab,
  customers,
  onOpenWorkspace,
  onActionTriggered,
}) => {
  // 1. WhatsApp Simulator state
  const [selectedScenario, setSelectedScenario] = useState<ScenarioKey>('reorder');
  const [selectedTone, setSelectedTone] = useState<'warm_hinglish' | 'direct' | 'festival'>('warm_hinglish');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [messageText, setMessageText] = useState<string>(
    'Namaste Priya ji! 🙏 Aapka Darjeeling First Flush Gold Blend khatam hone wala hoga (~28 din pehle mangwaya tha). Kya hum fresh batch dispatch karein? Reorder link: https://sellvion.in/r/101'
  );
  const [sentState, setSentState] = useState<'idle' | 'sent' | 'replied'>('idle');
  const [customerReply, setCustomerReply] = useState<string>('');
  const [draftHistory, setDraftHistory] = useState<DraftHistoryItem[]>([
    {
      id: 'DH-101',
      scenario: 'udhaar',
      scenarioLabel: 'Udhaar Reminder',
      customer: 'Sunita Agarwal',
      tone: 'festival',
      toneLabel: 'Festival Offer',
      message:
        'Namaste Sunita ji! 🙏 Aapka ₹3,450 ka monthly khata balance pending hai. Jab free hon tab is UPI link se clear kar dein: https://pay.sellvion.in/u/103 — Dhanyawad!',
      timestamp: 'Today, 11:32 AM',
      status: 'Sent',
    },
    {
      id: 'DH-102',
      scenario: 'reorder',
      scenarioLabel: 'Repeat Order',
      customer: 'Priya Sharma',
      tone: 'warm_hinglish',
      toneLabel: 'Warm Hinglish',
      message:
        'Namaste Priya ji! 🙏 Aapka Darjeeling First Flush Gold Blend khatam hone wala hoga (~28 din pehle mangwaya tha). Kya hum fresh batch dispatch karein? Reorder link: https://sellvion.in/r/101',
      timestamp: 'Today, 10:15 AM',
      status: 'Rewritten',
    },
    {
      id: 'DH-103',
      scenario: 'cod_prepay',
      scenarioLabel: 'COD Confirmation',
      customer: 'Vikram Solanki',
      tone: 'direct',
      toneLabel: 'Short & Direct',
      message:
        'Namaste Vikram ji! 🙏 Aapka ₹4,200 order pack ho gaya hai. Fast dispatch ke liye abhi UPI se pay karein aur ₹100 instant discount paayein: https://pay.sellvion.in/p/9932',
      timestamp: 'Yesterday, 4:40 PM',
      status: 'Sent',
    },
  ]);

  // 2. Quick COD Checker state
  const [codBuyer, setCodBuyer] = useState<'new' | 'repeat'>('new');
  const [codPincode, setCodPincode] = useState<string>('141001');
  const [codAmount, setCodAmount] = useState<number>(3800);
  const [codAddress, setCodAddress] = useState<'complete' | 'incomplete'>('incomplete');

  // 3. Udhaar Preview state
  const [udhaarPaid, setUdhaarPaid] = useState<boolean>(false);

  // 4. Savings Calculator state
  const [calcOrders, setCalcOrders] = useState<number>(800);
  const [calcAov, setCalcAov] = useState<number>(1500);
  const [calcCodPct, setCalcCodPct] = useState<number>(65);

  // 5. Customer 360 state
  const [custSearch, setCustSearch] = useState<string>('');
  const [custSegment, setCustSegment] = useState<string>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const scenarioConfigs: Record<
    ScenarioKey,
    {
      label: string;
      customer: string;
      actionName: string;
      city: string;
      context: string;
      defaultReply: string;
      impactAmount: number;
      impactLabel: string;
    }
  > = {
    reorder: {
      label: 'Repeat Order',
      customer: 'Priya Sharma',
      actionName: 'reorder_reminder',
      city: 'Pune',
      context: 'Ordered Darjeeling Tea 28 days ago (usually reorders every 28–30 days).',
      defaultReply: 'Haan ji bhej dijiye! Same address par dispatch kar dena. Thank you 🙏',
      impactAmount: 1450,
      impactLabel: '+₹1,450 repeat order confirmed',
    },
    cod_prepay: {
      label: 'COD Confirmation',
      customer: 'Vikram Solanki',
      actionName: 'cod_prepay',
      city: 'Surat',
      context: 'First-time ₹4,200 COD order with missing flat/house number.',
      defaultReply: 'Address: Flat 402, Royal Residency, Citylight. UPI se ₹4,100 pay kar diya ✓',
      impactAmount: 4200,
      impactLabel: 'Converted to Prepaid · Saved ₹280 return shipping',
    },
    udhaar: {
      label: 'Udhaar Reminder',
      customer: 'Sunita Agarwal',
      actionName: 'udhaar_reminder',
      city: 'Jaipur',
      context: '₹3,450 monthly khata balance pending for 7 days past due date.',
      defaultReply: 'Namaste bhaiya, abhi UPI se ₹3,450 bhej diya hai. Check kar lijiye.',
      impactAmount: 3450,
      impactLabel: '₹3,450 collected cleanly via UPI',
    },
    winback: {
      label: 'Win-Back',
      customer: 'Rajesh Nair',
      actionName: 'winback_offer',
      city: 'Bengaluru',
      context: 'Regular customer inactive for 90+ days since last spice purchase.',
      defaultReply: 'Just placed an order with code FRESH15 for 2 packs of black pepper!',
      impactAmount: 1800,
      impactLabel: '+₹1,800 returning customer order',
    },
  };

  const handleScenarioChange = (scenario: ScenarioKey) => {
    setSelectedScenario(scenario);
    setSentState('idle');
    setCustomerReply('');
    if (scenario === 'reorder') {
      setMessageText(
        'Namaste Priya ji! 🙏 Aapka Darjeeling First Flush Gold Blend khatam hone wala hoga (~28 din pehle mangwaya tha). Kya hum fresh batch dispatch karein? Reorder link: https://sellvion.in/r/101'
      );
    } else if (scenario === 'cod_prepay') {
      setMessageText(
        'Namaste Vikram ji! 🙏 Aapka ₹4,200 order pack ho gaya hai. Fast dispatch ke liye abhi UPI se pay karein aur ₹100 instant discount paayein: https://pay.sellvion.in/p/9932 — Ya address confirm karne ke liye "YES" reply karein.'
      );
    } else if (scenario === 'udhaar') {
      setMessageText(
        'Namaste Sunita ji! 🙏 Aapka ₹3,450 ka monthly khata balance pending hai. Jab free hon tab is UPI link se clear kar dein: https://pay.sellvion.in/u/103 — Dhanyawad!'
      );
    } else {
      setMessageText(
        'Namaste Rajesh ji! 🌿 Naya fresh harvest Malabar Black Pepper stock mein aaya hai. Aapke liye 15% special code "FRESH15" active hai: https://sellvion.in/vip'
      );
    }
  };

  const toneLabelMap: Record<'warm_hinglish' | 'direct' | 'festival', string> = {
    warm_hinglish: 'Warm Hinglish',
    direct: 'Short & Direct',
    festival: 'Festival Offer',
  };

  const recordDraftHistory = (
    draftMessage: string,
    status: DraftHistoryItem['status'],
    scenarioOverride?: ScenarioKey
  ) => {
    const scen = scenarioOverride || selectedScenario;
    const cfg = scenarioConfigs[scen];
    const nowLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setDraftHistory((prev) => [
      {
        id: `DH-${Date.now()}`,
        scenario: scen,
        scenarioLabel: cfg.label,
        customer: cfg.customer,
        tone: selectedTone,
        toneLabel: toneLabelMap[selectedTone],
        message: draftMessage,
        timestamp: `Today, ${nowLabel}`,
        status,
      },
      ...prev.slice(0, 9),
    ]);
  };

  const handleRewriteDraft = async () => {
    setIsGenerating(true);
    const config = scenarioConfigs[selectedScenario];
    try {
      const res = await fetch('/api/ai/draft-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: config.customer,
          customerCity: config.city,
          productName: selectedScenario === 'reorder' ? 'Darjeeling Gold Blend Tea' : 'Store Items',
          lastOrderDaysAgo: selectedScenario === 'reorder' ? 28 : 14,
          recommendedAction: config.actionName,
          tone: selectedTone,
          udhaarAmount: selectedScenario === 'udhaar' ? 3450 : 0,
        }),
      });
      const data = await res.json();
      if (data.draft) {
        setMessageText(data.draft);
        recordDraftHistory(data.draft, 'Rewritten');
      }
    } catch {
      recordDraftHistory(messageText, 'Saved');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSimulateSend = () => {
    setSentState('sent');
    const config = scenarioConfigs[selectedScenario];
    recordDraftHistory(messageText, 'Sent');
    setTimeout(() => {
      setSentState('replied');
      setCustomerReply(config.defaultReply);
      onActionTriggered?.(config.customer, config.label, config.impactAmount);
    }, 900);
  };

  // COD Calculation
  let riskScore = 15;
  const riskReasons: string[] = [];
  if (codBuyer === 'new') {
    riskScore += 25;
    riskReasons.push('First-time COD buyer');
  } else {
    riskScore -= 8;
  }
  if (['141001', '800001', '226001'].includes(codPincode)) {
    riskScore += 22;
    riskReasons.push(`High return rate in pincode ${codPincode}`);
  }
  if (codAmount > 2500) {
    riskScore += 15;
    riskReasons.push('Order value above ₹2,500');
  }
  if (codAddress === 'incomplete') {
    riskScore += 18;
    riskReasons.push('Missing flat / house number');
  }
  riskScore = Math.min(Math.max(riskScore, 8), 92);

  // Calculator math
  const codOrdersCount = Math.round(calcOrders * (calcCodPct / 100));
  const preventedReturns = Math.round(codOrdersCount * (0.25 - 0.11));
  const savedFreight = preventedReturns * 240;
  const repeatSales = Math.round(calcOrders * 0.14 * calcAov);
  const totalMonthlyValue = savedFreight + repeatSales;

  const activeConfig = scenarioConfigs[selectedScenario];

  return (
    <section id="how-it-works" className="scroll-mt-24 space-y-6">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0F1E36] dark:text-white font-display">
            How SELLVION Works for Your Store
          </h2>
          <p className="text-sm text-[#475569] dark:text-[#94A3B8] mt-1 max-w-2xl">
            Try the four everyday jobs SELLVION handles—from polite Hinglish follow-ups to stopping risky COD parcels before dispatch.
          </p>
        </div>

        <button
          onClick={() => onOpenWorkspace('inbox')}
          className="px-4 py-2.5 text-xs font-bold text-[#0066FF] dark:text-[#38BDF8] bg-[#EAF2FF] dark:bg-[#0C243B] hover:bg-[#DBEAFE] dark:hover:bg-[#132F4C] rounded-xl transition-colors flex items-center gap-1.5 self-start md:self-auto cursor-pointer shrink-0"
        >
          <span>Open Full Merchant Workspace</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Unified Interactive Tour Container */}
      <div className="bg-white dark:bg-[#132238] rounded-3xl border border-[#E2E8F0] dark:border-[#1E3A5F] shadow-sm overflow-hidden">
        {/* Clean 4-Tab Bar */}
        <div className="border-b border-[#E2E8F0] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#0F1A2C] px-4 sm:px-6 pt-3 flex items-center gap-2 overflow-x-auto">
          {[
            { id: 'whatsapp', label: '1. WhatsApp Follow-ups', icon: MessageCircle },
            { id: 'cod', label: '2. COD Return Check', icon: ShieldAlert },
            { id: 'udhaar', label: '3. Udhaar & UPI Links', icon: IndianRupee },
            { id: 'calculator', label: '4. Monthly Savings', icon: TrendingUp },
            { id: 'customers', label: '5. Customer 360', icon: Users },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onChangeTab(tab.id as ProductTourTab)}
                className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
                  isSelected
                    ? 'border-[#0066FF] text-[#0066FF] dark:text-[#38BDF8] bg-white dark:bg-[#132238] rounded-t-xl'
                    : 'border-transparent text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F1E36] dark:hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-6 lg:p-8">
          {/* TAB 1: WhatsApp Follow-ups */}
          {activeTab === 'whatsapp' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-6 space-y-5">
                {/* Scenario Pills */}
                <div>
                  <label className="text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] block mb-2">
                    Choose a customer situation
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(scenarioConfigs) as ScenarioKey[]).map((key) => (
                      <button
                        key={key}
                        onClick={() => handleScenarioChange(key)}
                        className={`px-3.5 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                          selectedScenario === key
                            ? 'bg-[#0066FF] text-white border-[#0066FF] shadow-xs'
                            : 'bg-[#F8FAFC] dark:bg-[#0F1A2C] text-[#475569] dark:text-[#94A3B8] border-[#E2E8F0] dark:border-[#1E3A5F] hover:border-[#0066FF]'
                        }`}
                      >
                        {scenarioConfigs[key].label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Why SELLVION spotted this */}
                <div className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#0F1A2C] border border-[#E2E8F0] dark:border-[#1E3A5F] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#0F1E36] dark:text-white">
                      {activeConfig.customer} · {activeConfig.city}
                    </span>
                    <span className="text-[#10B981] font-semibold">Opted in · Daytime window</span>
                  </div>
                  <p className="text-xs text-[#475569] dark:text-[#94A3B8] leading-relaxed">
                    {activeConfig.context}
                  </p>
                </div>

                {/* Tone Picker & Actions */}
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] block">
                    Message Tone
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'warm_hinglish', label: 'Warm Hinglish' },
                      { id: 'direct', label: 'Short & Direct' },
                      { id: 'festival', label: 'Festival Offer' },
                    ].map((tone) => (
                      <button
                        key={tone.id}
                        onClick={() => setSelectedTone(tone.id as any)}
                        className={`py-2 px-3 text-xs rounded-xl border transition-all cursor-pointer ${
                          selectedTone === tone.id
                            ? 'border-[#0066FF] bg-[#EAF2FF] dark:bg-[#0C243B] text-[#0066FF] dark:text-[#38BDF8] font-bold'
                            : 'border-[#E2E8F0] dark:border-[#1E3A5F] text-[#64748B] dark:text-[#94A3B8]'
                        }`}
                      >
                        {tone.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      onClick={handleRewriteDraft}
                      disabled={isGenerating}
                      className="px-4 py-2.5 text-xs font-semibold text-[#0F1E36] dark:text-white bg-white dark:bg-[#0F1A2C] border border-[#CBD5E1] dark:border-[#1E3A5F] hover:border-[#0066FF] rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                      <span>{isGenerating ? 'Writing draft...' : 'Rewrite Draft'}</span>
                    </button>

                    <button
                      onClick={handleSimulateSend}
                      disabled={sentState !== 'idle'}
                      className="px-5 py-2.5 text-xs font-bold text-white bg-[#0066FF] hover:bg-[#0052CC] rounded-xl flex items-center gap-2 shadow-sm shadow-[#0066FF]/20 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Test Message</span>
                    </button>
                  </div>
                </div>

                {sentState === 'replied' && (
                  <div className="p-4 rounded-2xl bg-[#ECFDF5] dark:bg-[#064E3B]/40 border border-[#A7F3D0] dark:border-[#065F46] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 text-xs text-[#065F46] dark:text-[#6EE7B7] font-semibold">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{activeConfig.impactLabel}</span>
                    </div>
                    <button
                      onClick={() => {
                        setSentState('idle');
                        setCustomerReply('');
                      }}
                      className="text-xs font-semibold text-[#047857] dark:text-[#6EE7B7] underline flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Clean Phone Preview */}
              <div className="lg:col-span-6 flex justify-center">
                <div className="w-full max-w-[330px] bg-white dark:bg-[#0F1A2C] rounded-[2rem] p-3 shadow-lg border border-[#E2E8F0] dark:border-[#1E3A5F]">
                  <div className="bg-[#0066FF] text-white rounded-t-2xl px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">
                        {activeConfig.customer.charAt(0)}
                      </div>
                      <div>
                        <div className="text-xs font-bold">{activeConfig.customer}</div>
                        <div className="text-[10px] text-[#E0F2FE]">WhatsApp Business</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#F8FAFC] dark:bg-[#09101D] p-3.5 min-h-[250px] flex flex-col justify-end space-y-3 rounded-b-2xl">
                    <div className="bg-[#E0F2FE] dark:bg-[#0C2E4E] text-[#0F172A] dark:text-[#F8FAFC] rounded-xl rounded-tr-xs p-3 ml-5 border border-[#BAE6FD] dark:border-[#194572]">
                      <p className="text-xs leading-relaxed whitespace-pre-wrap">{messageText}</p>
                      <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                        <span>11:32 AM</span>
                        <CheckCheck className={`w-3.5 h-3.5 ${sentState !== 'idle' ? 'text-[#0066FF]' : 'text-[#94A3B8]'}`} />
                      </div>
                    </div>

                    {customerReply && (
                      <div className="bg-white dark:bg-[#132238] text-[#0F172A] dark:text-[#F8FAFC] rounded-xl rounded-tl-xs p-3 mr-5 border border-[#E2E8F0] dark:border-[#1E3A5F]">
                        <p className="text-xs leading-relaxed">{customerReply}</p>
                        <div className="text-right mt-1 text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                          11:34 AM
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Restored Draft History Panel */}
              <div className="lg:col-span-12 pt-5 border-t border-[#E2E8F0] dark:border-[#1E3A5F] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#0F1E36] dark:text-white">
                    <History className="w-4 h-4 text-[#0066FF] dark:text-[#38BDF8]" />
                    <span>Draft History</span>
                    <span className="text-[11px] font-semibold text-[#64748B] dark:text-[#94A3B8] tabular-nums">
                      ({draftHistory.length} saved drafts)
                    </span>
                  </div>
                  <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                    Click any previous draft to load it back into the preview
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {draftHistory.slice(0, 6).map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSelectedScenario(item.scenario);
                        setSelectedTone(item.tone);
                        setMessageText(item.message);
                        setSentState('idle');
                        setCustomerReply('');
                      }}
                      className="p-3.5 rounded-2xl bg-[#F8FAFC] dark:bg-[#0F1A2C] border border-[#E2E8F0] dark:border-[#1E3A5F] hover:border-[#0066FF] dark:hover:border-[#38BDF8] transition-colors cursor-pointer flex flex-col justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-[#0F1E36] dark:text-white truncate">
                          {item.customer} · {item.scenarioLabel}
                        </span>
                        <span
                          className={`text-[10px] font-bold shrink-0 ${
                            item.status === 'Sent'
                              ? 'text-[#16A34A]'
                              : 'text-[#0066FF] dark:text-[#38BDF8]'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#475569] dark:text-[#CBD5E1] line-clamp-2 leading-relaxed">
                        {item.message}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-[#64748B] dark:text-[#94A3B8] pt-1 border-t border-[#E2E8F0]/70 dark:border-[#1E3A5F]">
                        <span>{item.toneLabel} · {item.timestamp}</span>
                        <span className="font-bold text-[#0066FF] dark:text-[#38BDF8]">Load →</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COD Return Check */}
          {activeTab === 'cod' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-7 space-y-4">
                <h3 className="text-lg font-bold text-[#0F1E36] dark:text-white">
                  Check Before You Ship
                </h3>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                  Every returned COD parcel costs ~₹280 in two-way shipping. Test how SELLVION spots high-risk orders before courier pickup.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs">
                  <div>
                    <label className="font-semibold text-[#475569] dark:text-[#CBD5E1] block mb-1.5">
                      Customer History
                    </label>
                    <select
                      value={codBuyer}
                      onChange={(e) => setCodBuyer(e.target.value as 'new' | 'repeat')}
                      className="w-full p-2.5 rounded-xl border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#0F1A2C] text-[#0F1E36] dark:text-white"
                    >
                      <option value="new">First-time buyer</option>
                      <option value="repeat">Repeat verified buyer</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-[#475569] dark:text-[#CBD5E1] block mb-1.5">
                      Delivery Pincode
                    </label>
                    <select
                      value={codPincode}
                      onChange={(e) => setCodPincode(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#0F1A2C] text-[#0F1E36] dark:text-white"
                    >
                      <option value="141001">141001 (Ludhiana — High RTO zone)</option>
                      <option value="800001">800001 (Patna — High RTO zone)</option>
                      <option value="400001">400001 (Mumbai — Low RTO zone)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-[#475569] dark:text-[#CBD5E1] block mb-1.5">
                      Address Quality
                    </label>
                    <select
                      value={codAddress}
                      onChange={(e) => setCodAddress(e.target.value as 'complete' | 'incomplete')}
                      className="w-full p-2.5 rounded-xl border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#0F1A2C] text-[#0F1E36] dark:text-white"
                    >
                      <option value="incomplete">Missing house / flat number</option>
                      <option value="complete">Full address with landmark</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between font-semibold text-[#475569] dark:text-[#CBD5E1] mb-1.5">
                      <span>Order Amount</span>
                      <span className="font-mono text-[#0066FF]">₹{codAmount.toLocaleString('en-IN')}</span>
                    </div>
                    <input
                      type="range"
                      min="400"
                      max="6000"
                      step="200"
                      value={codAmount}
                      onChange={(e) => setCodAmount(Number(e.target.value))}
                      className="w-full accent-[#0066FF] mt-2"
                    />
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 p-6 rounded-2xl bg-[#F8FAFC] dark:bg-[#0F1A2C] border border-[#E2E8F0] dark:border-[#1E3A5F] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8]">
                    Estimated Return Risk
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      riskScore >= 60
                        ? 'bg-[#FEE2E2] text-[#DC2626]'
                        : riskScore >= 35
                        ? 'bg-[#FEF3C7] text-[#D97706]'
                        : 'bg-[#DCFCE7] text-[#16A34A]'
                    }`}
                  >
                    {riskScore >= 60 ? 'High Risk' : riskScore >= 35 ? 'Moderate Risk' : 'Low Risk'}
                  </span>
                </div>

                <div className="text-4xl font-extrabold font-mono tabular-nums text-[#0F1E36] dark:text-white">
                  {riskScore}%
                </div>

                {riskReasons.length > 0 && (
                  <ul className="space-y-1.5 text-xs text-[#475569] dark:text-[#94A3B8]">
                    {riskReasons.map((r, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="pt-3 border-t border-[#E2E8F0] dark:border-[#1E3A5F] text-xs">
                  <div className="font-bold text-[#0F1E36] dark:text-white mb-1">Recommended Action:</div>
                  <p className="text-[#0066FF] dark:text-[#38BDF8] font-medium">
                    {riskScore >= 60
                      ? 'Send WhatsApp ₹50 UPI discount offer to convert to prepaid before dispatch.'
                      : riskScore >= 35
                      ? 'Send quick WhatsApp address confirmation message.'
                      : 'Safe to ship immediately via standard courier.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Udhaar & UPI Links */}
          {activeTab === 'udhaar' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-6 space-y-4">
                <h3 className="text-lg font-bold text-[#0F1E36] dark:text-white">
                  Get Paid Without Awkward Calls
                </h3>
                <p className="text-sm text-[#475569] dark:text-[#94A3B8] leading-relaxed">
                  Track customer credit in one place. When a payment is overdue, SELLVION sends a polite Hinglish reminder with a 1-tap Paytm UPI link and settles the ledger automatically.
                </p>

                <div className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#0F1A2C] border border-[#E2E8F0] dark:border-[#1E3A5F] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-[#0F1E36] dark:text-white">Sunita Agarwal · Jaipur</div>
                      <div className="text-xs text-[#64748B]">Monthly grocery khata · Due 7 days ago</div>
                    </div>
                    <div className="text-lg font-extrabold font-mono tabular-nums text-[#0F1E36] dark:text-white">
                      {udhaarPaid ? '₹0' : '₹3,450'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setUdhaarPaid(!udhaarPaid)}
                      className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                        udhaarPaid
                          ? 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]'
                          : 'bg-[#0066FF] hover:bg-[#0052CC] text-white'
                      }`}
                    >
                      {udhaarPaid ? '✓ Paid via Paytm UPI (Click to Reset)' : 'Simulate 1-Tap UPI Payment'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6 flex justify-center">
                <div className="w-full max-w-sm p-6 rounded-2xl bg-[#F8FAFC] dark:bg-[#0F1A2C] border border-[#E2E8F0] dark:border-[#1E3A5F] text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#EAF2FF] dark:bg-[#0C243B] text-[#0066FF] flex items-center justify-center mx-auto">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8]">
                      Paytm All-in-One UPI Link
                    </div>
                    <div className="text-2xl font-extrabold font-mono text-[#0F1E36] dark:text-white mt-1">
                      {udhaarPaid ? 'SETTLED ✓' : '₹3,450.00'}
                    </div>
                  </div>
                  <div className="text-xs text-[#475569] dark:text-[#94A3B8] bg-white dark:bg-[#132238] p-3 rounded-xl border border-[#E2E8F0] dark:border-[#1E3A5F]">
                    "Namaste Sunita ji! 🙏 Aapka ₹3,450 khata balance pending hai. Jab free hon tab is link se pay kar dein."
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Monthly Savings Calculator */}
          {activeTab === 'calculator' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <div className="flex justify-between text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] mb-2">
                    <span>Monthly Orders</span>
                    <span className="font-mono text-[#0066FF]">{calcOrders.toLocaleString('en-IN')}</span>
                  </div>
                  <input
                    type="range"
                    min="200"
                    max="5000"
                    step="100"
                    value={calcOrders}
                    onChange={(e) => setCalcOrders(Number(e.target.value))}
                    className="w-full accent-[#0066FF]"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] mb-2">
                    <span>Average Order Value</span>
                    <span className="font-mono text-[#0066FF]">₹{calcAov.toLocaleString('en-IN')}</span>
                  </div>
                  <input
                    type="range"
                    min="500"
                    max="5000"
                    step="100"
                    value={calcAov}
                    onChange={(e) => setCalcAov(Number(e.target.value))}
                    className="w-full accent-[#0066FF]"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] mb-2">
                    <span>COD Share</span>
                    <span className="font-mono text-[#0066FF]">{calcCodPct}%</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="90"
                    step="5"
                    value={calcCodPct}
                    onChange={(e) => setCalcCodPct(Number(e.target.value))}
                    className="w-full accent-[#0066FF]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="p-5 rounded-2xl bg-[#F8FAFC] dark:bg-[#0F1A2C] border border-[#E2E8F0] dark:border-[#1E3A5F]">
                  <div className="text-xs text-[#64748B] dark:text-[#94A3B8]">Saved from Fewer Returns</div>
                  <div className="text-2xl font-extrabold font-mono text-[#0F1E36] dark:text-white mt-1">
                    ₹{savedFreight.toLocaleString('en-IN')}
                  </div>
                  <div className="text-xs text-[#64748B] mt-0.5">{preventedReturns} returned parcels avoided/mo</div>
                </div>

                <div className="p-5 rounded-2xl bg-[#F8FAFC] dark:bg-[#0F1A2C] border border-[#E2E8F0] dark:border-[#1E3A5F]">
                  <div className="text-xs text-[#64748B] dark:text-[#94A3B8]">Extra Repeat Sales</div>
                  <div className="text-2xl font-extrabold font-mono text-[#0F1E36] dark:text-white mt-1">
                    ₹{repeatSales.toLocaleString('en-IN')}
                  </div>
                  <div className="text-xs text-[#64748B] mt-0.5">From timely reorder reminders</div>
                </div>

                <div className="p-5 rounded-2xl bg-[#0066FF] text-white shadow-md shadow-[#0066FF]/20">
                  <div className="text-xs text-[#BAE6FD]">Estimated Monthly Gain</div>
                  <div className="text-2xl font-extrabold font-mono mt-1">
                    ₹{totalMonthlyValue.toLocaleString('en-IN')}
                  </div>
                  <div className="text-xs text-[#E0F2FE] mt-0.5">Against ₹799/mo Pro plan</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Restored Customer 360 Screen */}
          {activeTab === 'customers' && (
            <div className="space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-xs text-[#64748B] dark:text-[#94A3B8] mb-0.5">
                    <span>Customer Intelligence Graph</span>
                    <span>·</span>
                    <span className="font-semibold text-[#0066FF] dark:text-[#38BDF8]">
                      RFM Cadence & Udhaar Memory
                    </span>
                  </div>
                  <h3 className="text-lg font-extrabold text-[#0F1E36] dark:text-white">
                    Customer 360
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search name, city, SKU..."
                      value={custSearch}
                      onChange={(e) => setCustSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-[#F8FAFC] dark:bg-[#0F1A2C] border border-[#E2E8F0] dark:border-[#1E3A5F] rounded-xl text-[#0F172A] dark:text-white focus:outline-none focus:ring-1 focus:ring-[#0066FF]"
                    />
                  </div>
                  <button
                    onClick={() => onOpenWorkspace('customers')}
                    className="px-3.5 py-2 bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <span>Manage in Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Segment Filter Bar */}
              <div className="flex items-center gap-1.5 p-1 bg-[#EFF6FF] dark:bg-[#0F1A2C] rounded-xl overflow-x-auto text-xs">
                {[
                  { id: 'all', label: 'All Customers' },
                  { id: 'reorder_due', label: 'Reorder Due' },
                  { id: 'first_time', label: 'High COD Risk' },
                  { id: 'high_udhaar', label: 'Udhaar Overdue' },
                  { id: 'loyal', label: 'Active Regulars' },
                  { id: 'inactive', label: 'Lapsed VIPs' },
                ].map((segTab) => (
                  <button
                    key={segTab.id}
                    onClick={() => setCustSegment(segTab.id)}
                    className={`px-3 py-1.5 font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                      custSegment === segTab.id
                        ? 'bg-white dark:bg-[#0066FF] text-[#0066FF] dark:text-white shadow-xs'
                        : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#0066FF] dark:hover:text-white'
                    }`}
                  >
                    {segTab.label}
                  </button>
                ))}
              </div>

              {/* Customer 360 Data Table */}
              <div className="overflow-x-auto rounded-2xl border border-[#E2E8F0] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#0F1A2C]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-white dark:bg-[#0B1320] border-b border-[#E2E8F0] dark:border-[#1E3A5F] text-[#64748B] dark:text-[#94A3B8] font-semibold">
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Location</th>
                      <th className="py-3 px-4">Purchase Cycle</th>
                      <th className="py-3 px-4">Favorite / Last SKU</th>
                      <th className="py-3 px-4 text-right">Lifetime Spend</th>
                      <th className="py-3 px-4 text-center">COD Reliability</th>
                      <th className="py-3 px-4 text-right">Udhaar Balance</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1E3A5F] bg-white dark:bg-[#132238] text-[#334155] dark:text-[#CBD5E1]">
                    {customers
                      .filter((c) => {
                        if (custSegment !== 'all') {
                          if (custSegment === 'loyal') {
                            if (c.segment !== 'loyal' && c.segment !== 'regular') return false;
                          } else if (c.segment !== custSegment) {
                            return false;
                          }
                        }
                        if (!custSearch.trim()) return true;
                        const q = custSearch.toLowerCase();
                        return (
                          c.name.toLowerCase().includes(q) ||
                          c.city.toLowerCase().includes(q) ||
                          c.lastProductOrdered.toLowerCase().includes(q)
                        );
                      })
                      .slice(0, 6)
                      .map((cust) => (
                        <tr
                          key={cust.id}
                          onClick={() => setSelectedCustomer(cust)}
                          className="hover:bg-[#F0F9FF] dark:hover:bg-[#1A2E4C] transition-colors cursor-pointer"
                        >
                          <td className="py-3 px-4 font-bold text-[#0F1E36] dark:text-white">
                            {cust.name}
                          </td>
                          <td className="py-3 px-4 text-[#64748B] dark:text-[#94A3B8]">
                            {cust.city}, {cust.state}
                          </td>
                          <td className="py-3 px-4 font-mono tabular-nums">
                            {cust.daysSinceLastOrder}d / {cust.averageOrderCadenceDays}d cycle
                          </td>
                          <td className="py-3 px-4 max-w-[200px] truncate">
                            {cust.lastProductOrdered}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-[#0F1E36] dark:text-white">
                            ₹{cust.totalSpent.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-center font-mono tabular-nums">
                            <span
                              className={`font-bold ${
                                cust.codReliabilityScore >= 80
                                  ? 'text-[#16A34A]'
                                  : cust.codReliabilityScore >= 60
                                  ? 'text-[#D97706]'
                                  : 'text-[#DC2626]'
                              }`}
                            >
                              {cust.codReliabilityScore}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums">
                            <span
                              className={
                                cust.outstandingUdhaar > 0
                                  ? 'text-[#DC2626]'
                                  : 'text-[#64748B] dark:text-[#94A3B8]'
                              }
                            >
                              {cust.outstandingUdhaar > 0
                                ? `₹${cust.outstandingUdhaar.toLocaleString('en-IN')}`
                                : '₹0'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCustomer(cust);
                              }}
                              className="text-[#0066FF] dark:text-[#38BDF8] font-bold hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                            >
                              <span>Inspect</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Customer 360 Slide-Over Drawer */}
              {selectedCustomer && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end">
                  <div className="bg-white dark:bg-[#0B1E40] w-full max-w-md h-full overflow-y-auto p-6 shadow-2xl border-l border-[#E2E8F0] dark:border-[#1E3A5F] flex flex-col justify-between space-y-5">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#E2E8F0] dark:border-[#1E3A5F]">
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-wider text-[#0066FF] dark:text-[#38BDF8]">
                            Customer 360 Profile
                          </div>
                          <h4 className="text-lg font-extrabold text-[#0F1E36] dark:text-white">
                            {selectedCustomer.name}
                          </h4>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">
                            <span className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5" /> {selectedCustomer.phone}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" /> {selectedCustomer.city},{' '}
                              {selectedCustomer.state}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedCustomer(null)}
                          className="p-1.5 rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-[#132238] cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#061533] border border-[#E2E8F0] dark:border-[#1E3A5F]">
                          <div className="text-[#64748B] dark:text-[#94A3B8]">Lifetime Spend</div>
                          <div className="text-base font-extrabold font-mono text-[#0F1E36] dark:text-white mt-0.5">
                            ₹{selectedCustomer.totalSpent.toLocaleString('en-IN')}
                          </div>
                        </div>
                        <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#061533] border border-[#E2E8F0] dark:border-[#1E3A5F]">
                          <div className="text-[#64748B] dark:text-[#94A3B8]">Outstanding Udhaar</div>
                          <div
                            className={`text-base font-extrabold font-mono mt-0.5 ${
                              selectedCustomer.outstandingUdhaar > 0
                                ? 'text-[#DC2626]'
                                : 'text-[#0066FF] dark:text-[#38BDF8]'
                            }`}
                          >
                            ₹{selectedCustomer.outstandingUdhaar.toLocaleString('en-IN')}
                          </div>
                        </div>
                        <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#061533] border border-[#E2E8F0] dark:border-[#1E3A5F]">
                          <div className="text-[#64748B] dark:text-[#94A3B8] flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Purchase Cadence
                          </div>
                          <div className="text-sm font-bold font-mono text-[#0F1E36] dark:text-white mt-0.5">
                            {selectedCustomer.daysSinceLastOrder}d /{' '}
                            {selectedCustomer.averageOrderCadenceDays}d cycle
                          </div>
                        </div>
                        <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#061533] border border-[#E2E8F0] dark:border-[#1E3A5F]">
                          <div className="text-[#64748B] dark:text-[#94A3B8]">COD Reliability</div>
                          <div className="text-sm font-bold font-mono text-[#0F1E36] dark:text-white mt-0.5">
                            {selectedCustomer.codReliabilityScore}% score
                          </div>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-[#EFF6FF] dark:bg-[#061533] border border-[#BFDBFE] dark:border-[#1E3A5F] space-y-1 text-xs">
                        <div className="font-bold text-[#0066FF] dark:text-[#38BDF8] flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Customer Memory Graph & Insights</span>
                        </div>
                        <p className="text-[#334155] dark:text-[#CBD5E1] leading-relaxed">
                          {selectedCustomer.aiInsightSummary || selectedCustomer.notes}
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[#E2E8F0] dark:border-[#1E3A5F] flex items-center gap-2">
                      <button
                        onClick={() => {
                          const firstName = selectedCustomer.name.split(' ')[0];
                          const customDraft =
                            selectedCustomer.outstandingUdhaar > 0
                              ? `Namaste ${firstName} ji! 🙏 Aapka ₹${selectedCustomer.outstandingUdhaar.toLocaleString(
                                  'en-IN'
                                )} ka monthly khata balance pending hai. Jab free hon tab UPI link se clear kar dein — Dhanyawad!`
                              : `Namaste ${firstName} ji! 🙏 Aapka ${selectedCustomer.lastProductOrdered} stock fresh aaya hai. Kya hum repeat pack dispatch karein?`;
                          setMessageText(customDraft);
                          recordDraftHistory(
                            customDraft,
                            'Saved',
                            selectedCustomer.outstandingUdhaar > 0 ? 'udhaar' : 'reorder'
                          );
                          setSelectedCustomer(null);
                          onChangeTab('whatsapp');
                        }}
                        className="flex-1 py-2.5 px-4 bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Draft Custom WhatsApp</span>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedCustomer(null);
                          onOpenWorkspace('customers');
                        }}
                        className="py-2.5 px-3 border border-[#CBD5E1] dark:border-[#1E3A5F] text-xs font-bold rounded-xl cursor-pointer"
                      >
                        Full View
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
