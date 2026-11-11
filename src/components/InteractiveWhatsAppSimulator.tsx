import React, { useState } from 'react';
import { Send, Sparkles, RefreshCw, CheckCheck, ShieldCheck, ArrowRight, Play, RotateCcw } from 'lucide-react';
import { Customer } from '../types';

interface InteractiveWhatsAppSimulatorProps {
  customers: Customer[];
  onActionTriggered?: (customerName: string, actionType: string, amount: number) => void;
}

type ScenarioKey = 'reorder' | 'cod_prepay' | 'udhaar' | 'winback';

export const InteractiveWhatsAppSimulator: React.FC<InteractiveWhatsAppSimulatorProps> = ({
  customers,
  onActionTriggered,
}) => {
  const [selectedScenario, setSelectedScenario] = useState<ScenarioKey>('reorder');
  const [selectedTone, setSelectedTone] = useState<'warm_hinglish' | 'direct' | 'festival'>('warm_hinglish');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [messageText, setMessageText] = useState<string>(
    'Namaste Priya ji! 🙏 Hope aapka din achha ja raha hai. Aapka favorite Darjeeling First Flush Gold Blend khatam hone wala hoga (~28 din pehle mangwaya tha). Kya hum ek fresh batch dispatch karein? 1-tap reorder aur complimentary organic green tea sample paayein: https://sellvion.in/reorder/CUST-101'
  );
  const [sentState, setSentState] = useState<'idle' | 'sent' | 'replied'>('idle');
  const [customerReply, setCustomerReply] = useState<string>('');

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
      label: 'Predictive Reorder',
      customer: 'Priya Sharma',
      actionName: 'reorder_reminder',
      city: 'Pune',
      context: 'Darjeeling Gold Blend reorder window opened today (28-day cadence)',
      defaultReply: 'Haan ji bilkul dispatch kar dijiye! Same address par. Green tea sample add kar dijiyega. Thank you! 🙏',
      impactAmount: 1450,
      impactLabel: '+₹1,450 Repeat Revenue Recovered',
    },
    cod_prepay: {
      label: 'COD RTO Prevention',
      customer: 'Vikramaditya Solanki',
      actionName: 'cod_prepay',
      city: 'Surat',
      context: 'First-time COD order (₹4,200) with 68% estimated return risk',
      defaultReply: 'Address confirm hai: Flat 402, Royal Residency, Citylight. UPI se ₹4,100 pay kar diya hai discount ke sath. Receipt attached ✓',
      impactAmount: 4200,
      impactLabel: 'Converted ₹4,200 COD to Prepaid (Saved ₹280 RTO cost)',
    },
    udhaar: {
      label: 'Gentle Udhaar Khata',
      customer: 'Sunita Agarwal',
      actionName: 'udhaar_reminder',
      city: 'Jaipur',
      context: '₹3,450 grocery balance is 7 days past agreed due date',
      defaultReply: 'Namaste bhaiya, bilkul! Abhi GPay se ₹3,450 bhej diya hai. Check kar lijiye. Aagle hafte naya order deti hoon.',
      impactAmount: 3450,
      impactLabel: 'Collected ₹3,450 Overdue Udhaar with 0 Friction',
    },
    winback: {
      label: 'VIP Win-Back',
      customer: 'Rajesh Nair',
      actionName: 'winback_offer',
      city: 'Bengaluru',
      context: '101 days inactive (previous 5-star repeat buyer of Malabar spices)',
      defaultReply: 'Great to hear from you! Just placed the order using code FRESH15 for 2 packs of whole black pepper. Looking forward!',
      impactAmount: 1800,
      impactLabel: 'Reactivated Lapsed VIP Buyer (+₹1,800)',
    },
  };

  const handleScenarioChange = (scenario: ScenarioKey) => {
    setSelectedScenario(scenario);
    setSentState('idle');
    setCustomerReply('');

    if (scenario === 'reorder') {
      setMessageText(
        'Namaste Priya ji! 🙏 Hope aapka din achha ja raha hai. Aapka favorite Darjeeling First Flush Gold Blend khatam hone wala hoga (~28 din pehle mangwaya tha). Kya hum ek fresh batch dispatch karein? 1-tap reorder aur complimentary organic green tea sample paayein: https://sellvion.in/reorder/CUST-101'
      );
    } else if (scenario === 'cod_prepay') {
      setMessageText(
        'Namaste Vikramaditya ji! 🙏 Aapka order #ORD-9932 (Kashmiri Saffron & Shilajit) pack ho chuka hai. Fast priority dispatch aur guaranteed delivery ke liye abhi UPI se pay karein aur ₹100 instant cashback discount paayein: https://pay.sellvion.in/prepay/ORD-9932 - Ya delivery address confirm karne ke liye reply karein "CONFIRM"'
      );
    } else if (scenario === 'udhaar') {
      setMessageText(
        'Namaste Sunita ji! 🙏 Asha hai sab theek hai. Aapka monthly pantry khata balance ₹3,450 pending hai. Agar aap free hain toh aaj UPI ke through clear kar sakte hain: https://pay.sellvion.in/khata/CUST-103 - Koi question ho toh zaroor batayein!'
      );
    } else if (scenario === 'winback') {
      setMessageText(
        'Namaste Rajesh ji! 🌿 Kafi time ho gaya aapse baat kiye huye. Fresh harvest Malabar Black Pepper & organic cardamom ka naya lot aaya hai. Aap hamare valued customer hain, isliye aapke liye 15% VIP discount code "FRESH15" reserve kiya hai: https://sellvion.in/vip/CUST-104'
      );
    }
  };

  const handleRegenerateWithGemini = async () => {
    setIsGenerating(true);
    const config = scenarioConfigs[selectedScenario];
    try {
      const res = await fetch('/api/ai/draft-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: config.customer,
          customerCity: config.city,
          productName: selectedScenario === 'reorder' ? 'Darjeeling Gold Blend Tea' : 'Artisan Pantry Items',
          lastOrderDaysAgo: selectedScenario === 'reorder' ? 28 : selectedScenario === 'winback' ? 101 : 12,
          recommendedAction: config.actionName,
          tone: selectedTone,
          udhaarAmount: selectedScenario === 'udhaar' ? 3450 : 0,
        }),
      });
      const data = await res.json();
      if (data.draft) {
        setMessageText(data.draft);
      }
    } catch (err) {
      console.error('Failed to regenerate draft:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSimulateSend = () => {
    setSentState('sent');
    const config = scenarioConfigs[selectedScenario];

    setTimeout(() => {
      setSentState('replied');
      setCustomerReply(config.defaultReply);
      if (onActionTriggered) {
        onActionTriggered(config.customer, config.label, config.impactAmount);
      }
    }, 1400);
  };

  const activeConfig = scenarioConfigs[selectedScenario];

  return (
    <div className="bg-[#F8FAFC] dark:bg-[#0F172A] rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] p-6 lg:p-8 shadow-sm transition-colors">
      {/* Header and Scenario Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#E2E8F0] dark:border-[#1E293B]">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#64748B] dark:text-[#94A3B8] mb-1">
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#E0F2FE] dark:bg-[#0C2E4E] text-[#0284C7] dark:text-[#38BDF8] font-semibold border border-[#BAE6FD] dark:border-[#1E3A5F]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0284C7] dark:bg-[#38BDF8] animate-ping" />
              Live Interactive Sandbox
            </span>
            <span>·</span>
            <span>Zero real charges or live dispatches</span>
          </div>
          <h3 className="text-xl font-bold text-[#0F172A] dark:text-white tracking-tight">
            See how SELLVION engages Indian buyers
          </h3>
        </div>

        {/* Interactive Scenario Tabs (Skyblue) */}
        <div className="flex items-center gap-1 p-1 bg-[#E0F2FE] dark:bg-[#1E293B] rounded-xl overflow-x-auto">
          {(Object.keys(scenarioConfigs) as ScenarioKey[]).map((key) => {
            const isSelected = selectedScenario === key;
            return (
              <button
                key={key}
                onClick={() => handleScenarioChange(key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-white dark:bg-[#0284C7] text-[#0284C7] dark:text-white shadow-xs font-semibold'
                    : 'text-[#0369A1] dark:text-[#94A3B8] hover:text-[#0284C7] dark:hover:text-white'
                }`}
              >
                {scenarioConfigs[key].label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Controls on left, Phone Mockup on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6 items-start">
        {/* Left: Intelligence Context & Controls */}
        <div className="lg:col-span-6 space-y-5">
          {/* Autonomous Reasoning Card */}
          <div className="bg-white dark:bg-[#132238] rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] p-5 shadow-2xs transition-colors">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#0284C7] dark:bg-[#38BDF8]" />
                <span className="text-xs font-semibold text-[#0284C7] dark:text-[#38BDF8] uppercase tracking-wider">
                  AI Orchestrator Analysis
                </span>
              </div>
              <span className="text-xs text-[#64748B] dark:text-[#94A3B8] font-mono tabular-nums">
                Target: {activeConfig.customer} ({activeConfig.city})
              </span>
            </div>

            <p className="text-sm text-[#334155] dark:text-[#CBD5E1] leading-relaxed mb-4">
              {activeConfig.context}
            </p>

            <div className="flex items-center justify-between text-xs pt-3 border-t border-[#F1F5F9] dark:border-[#1E293B] text-[#64748B] dark:text-[#94A3B8]">
              <span>Policy Guard: Consent verified ✓</span>
              <span>Quiet hours: In window (11:30 AM IST)</span>
            </div>
          </div>

          {/* Tone & AI Prompt Controls */}
          <div className="bg-white dark:bg-[#132238] rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] p-5 shadow-2xs space-y-4 transition-colors">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-[#475569] dark:text-[#CBD5E1]">
                Conversational Persona & Tone
              </label>
              <span className="text-xs text-[#0284C7] dark:text-[#38BDF8] font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Powered by Gemini
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'warm_hinglish', label: 'Warm & Polite' },
                { id: 'direct', label: 'Direct & Clear' },
                { id: 'festival', label: 'Festival Offer' },
              ].map((tone) => (
                <button
                  key={tone.id}
                  onClick={() => setSelectedTone(tone.id as any)}
                  className={`py-2 px-3 text-xs rounded-lg border text-center transition-all cursor-pointer ${
                    selectedTone === tone.id
                      ? 'border-[#0284C7] dark:border-[#38BDF8] bg-[#F0F9FF] dark:bg-[#0C243B] text-[#0284C7] dark:text-[#7DD3FC] font-semibold shadow-xs'
                      : 'border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#1E293B] text-[#64748B] dark:text-[#94A3B8] hover:border-[#BAE6FD]'
                  }`}
                >
                  {tone.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleRegenerateWithGemini}
                disabled={isGenerating}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50 shadow-sm shadow-[#0284C7]/20 cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Gemini is composing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-[#BAE6FD]" />
                    <span>Regenerate Message Draft</span>
                  </>
                )}
              </button>

              <button
                onClick={handleSimulateSend}
                disabled={sentState !== 'idle'}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#E0F2FE] hover:bg-[#BAE6FD] dark:bg-[#1E3A5F] dark:hover:bg-[#254A78] text-[#0369A1] dark:text-[#7DD3FC] text-xs font-semibold rounded-lg border border-[#BAE6FD] dark:border-[#2A4D7A] transition-colors disabled:opacity-50 whitespace-nowrap cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Simulate Send</span>
              </button>
            </div>
          </div>

          {/* Outcome Result Banner */}
          {sentState === 'replied' && (
            <div className="bg-[#F0F9FF] dark:bg-[#0C243B] border border-[#BAE6FD] dark:border-[#1E456E] rounded-xl p-4 text-[#0369A1] dark:text-[#BAE6FD] flex items-center justify-between gap-3 animate-fadeIn transition-colors">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-[#0284C7] dark:text-[#38BDF8] shrink-0" />
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-[#0284C7] dark:text-[#38BDF8]">
                    Customer Responded (Simulated)
                  </div>
                  <div className="text-xs font-semibold mt-0.5">
                    {activeConfig.impactLabel}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setSentState('idle');
                  setCustomerReply('');
                }}
                className="text-xs text-[#0284C7] dark:text-[#38BDF8] underline hover:text-[#0369A1] cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>
          )}
        </div>

        {/* Right: Modern Smartphone Mockup */}
        <div className="lg:col-span-6 flex justify-center">
          <div className="w-full max-w-[340px] bg-white dark:bg-[#132238] rounded-[2.25rem] p-3 shadow-xl border border-[#E2E8F0] dark:border-[#1E293B] ring-8 ring-[#F1F5F9] dark:ring-[#0B1320] transition-colors">
            {/* Phone Speaker & Camera Notch */}
            <div className="w-28 h-4 bg-[#E2E8F0] dark:bg-[#1E293B] rounded-full mx-auto mb-3" />

            {/* WhatsApp Header (Sky Blue) */}
            <div className="bg-[#0284C7] text-white rounded-t-2xl p-3 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#0369A1] flex items-center justify-center font-bold text-xs text-white">
                  {activeConfig.customer.charAt(0)}
                </div>
                <div>
                  <div className="text-xs font-semibold leading-tight">
                    {activeConfig.customer}
                  </div>
                  <div className="text-[10px] text-[#E0F2FE] leading-none mt-0.5">
                    Online · Business Verified
                  </div>
                </div>
              </div>
              <span className="text-[10px] text-white/90 font-mono">WhatsApp</span>
            </div>

            {/* WhatsApp Chat Body */}
            <div className="bg-[#F8FAFC] dark:bg-[#0A101D] p-3 min-h-[300px] flex flex-col justify-end space-y-3 rounded-b-2xl transition-colors">
              {/* Date separator */}
              <div className="text-center">
                <span className="text-[10px] bg-[#E2E8F0] dark:bg-[#1E293B] text-[#64748B] dark:text-[#94A3B8] px-2 py-0.5 rounded shadow-2xs font-mono">
                  Today
                </span>
              </div>

              {/* Merchant Outgoing Message Bubble */}
              <div className="bg-[#E0F2FE] dark:bg-[#0C2E4E] text-[#0F172A] dark:text-[#F8FAFC] rounded-xl rounded-tr-xs p-3 ml-6 shadow-2xs border border-[#BAE6FD] dark:border-[#194572] relative">
                <p className="text-xs leading-relaxed break-words whitespace-pre-wrap">
                  {messageText}
                </p>
                <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-[#64748B] dark:text-[#94A3B8]">
                  <span>11:32 AM</span>
                  <CheckCheck
                    className={`w-3 h-3 ${
                      sentState !== 'idle' ? 'text-[#0284C7]' : 'text-[#94A3B8]'
                    }`}
                  />
                </div>
              </div>

              {/* Customer Incoming Message Reply Bubble */}
              {customerReply && (
                <div className="bg-white dark:bg-[#132238] text-[#0F172A] dark:text-[#F8FAFC] rounded-xl rounded-tl-xs p-3 mr-6 shadow-2xs border border-[#E2E8F0] dark:border-[#1E293B] animate-fadeIn">
                  <p className="text-xs leading-relaxed">{customerReply}</p>
                  <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-[#64748B] dark:text-[#94A3B8]">
                    <span>11:34 AM</span>
                  </div>
                </div>
              )}
            </div>

            {/* Phone bottom bar */}
            <div className="w-24 h-1 bg-[#CBD5E1] dark:bg-[#1E293B] rounded-full mx-auto mt-3 mb-1" />
          </div>
        </div>
      </div>
    </div>
  );
};
