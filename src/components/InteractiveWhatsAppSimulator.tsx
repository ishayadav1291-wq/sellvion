import React, { useState } from 'react';
import { Send, Sparkles, RefreshCw, CheckCheck, ShieldCheck, ArrowRight } from 'lucide-react';
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
    <div className="bg-[#FAF9F5] dark:bg-[#121714] rounded-2xl border border-[#E8E6DF] dark:border-[#232B26] p-6 lg:p-8 shadow-xs transition-colors">
      {/* Header and Scenario Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#EAE8E1] dark:border-[#232B26]">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#555C57] dark:text-[#9DA49F] mb-1">
            <span>Conversational Agent Preview</span>
            <span>·</span>
            <span className="font-medium text-[#0F2E22] dark:text-[#34D399]">Autonomous Hinglish WhatsApp</span>
          </div>
          <h3 className="text-xl font-bold text-[#141B18] dark:text-[#F0F3F1] tracking-tight">
            See how SELLVION engages Indian buyers
          </h3>
        </div>

        {/* Interactive Scenario Tabs */}
        <div className="flex items-center gap-1 p-1 bg-[#EFECE4] dark:bg-[#1B221E] rounded-xl overflow-x-auto">
          {(Object.keys(scenarioConfigs) as ScenarioKey[]).map((key) => {
            const isSelected = selectedScenario === key;
            return (
              <button
                key={key}
                onClick={() => handleScenarioChange(key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap shrink-0 ${
                  isSelected
                    ? 'bg-white dark:bg-[#25322A] text-[#0F2E22] dark:text-[#E8F5E9] shadow-xs font-semibold'
                    : 'text-[#616862] dark:text-[#9DA49F] hover:text-[#141B18] dark:hover:text-[#F0F3F1]'
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
          <div className="bg-white dark:bg-[#161C19] rounded-xl border border-[#EAE8E1] dark:border-[#232B26] p-5 shadow-xs transition-colors">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#059669] dark:bg-[#34D399]" />
                <span className="text-xs font-semibold text-[#0F2E22] dark:text-[#34D399] uppercase tracking-wider">
                  AI Orchestrator Analysis
                </span>
              </div>
              <span className="text-xs text-[#6B726C] dark:text-[#8C948F] font-mono tabular-nums">
                Target: {activeConfig.customer} ({activeConfig.city})
              </span>
            </div>

            <p className="text-sm text-[#2D332F] dark:text-[#D1D7D3] leading-relaxed mb-4">
              {activeConfig.context}
            </p>

            <div className="flex items-center justify-between text-xs pt-3 border-t border-[#F2F0E8] dark:border-[#232B26] text-[#555C57] dark:text-[#8C948F]">
              <span>Policy Guard: Consent verified ✓</span>
              <span>Quiet hours: In window (11:30 AM IST)</span>
            </div>
          </div>

          {/* Tone & AI Prompt Controls */}
          <div className="bg-white dark:bg-[#161C19] rounded-xl border border-[#EAE8E1] dark:border-[#232B26] p-5 shadow-xs space-y-4 transition-colors">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-[#4A504B] dark:text-[#A7AFA9]">
                Conversational Persona & Tone
              </label>
              <span className="text-xs text-[#059669] dark:text-[#34D399] font-medium flex items-center gap-1">
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
                  className={`py-2 px-3 text-xs rounded-lg border text-center transition-all ${
                    selectedTone === tone.id
                      ? 'border-[#0F2E22] dark:border-[#34D399] bg-[#F4F9F6] dark:bg-[#1E2E25] text-[#0F2E22] dark:text-[#E8F5E9] font-semibold'
                      : 'border-[#EAE8E1] dark:border-[#28322C] bg-white dark:bg-[#1A221E] text-[#555C57] dark:text-[#9DA49F] hover:border-[#D0CDBF] dark:hover:border-[#3E4C43]'
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
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0F2E22] dark:bg-[#1E4D3B] hover:bg-[#1A4535] dark:hover:bg-[#28634C] text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50 shadow-xs"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Gemini is composing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-[#34D399]" />
                    <span>Regenerate Message Draft</span>
                  </>
                )}
              </button>

              <button
                onClick={handleSimulateSend}
                disabled={sentState !== 'idle'}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#E8F5E9] dark:bg-[#153426] hover:bg-[#D5ECD8] dark:hover:bg-[#1C4533] text-[#065F46] dark:text-[#34D399] text-xs font-semibold rounded-lg border border-[#C2E4C9] dark:border-[#214D38] transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Simulate Send</span>
              </button>
            </div>
          </div>

          {/* Outcome Result Banner */}
          {sentState === 'replied' && (
            <div className="bg-[#EBF7EE] dark:bg-[#122E1F] border border-[#BCE8C5] dark:border-[#23583A] rounded-xl p-4 text-[#14482B] dark:text-[#A7F3D0] flex items-center justify-between gap-3 animate-fadeIn transition-colors">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-[#059669] dark:text-[#34D399] shrink-0" />
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-[#0F5132] dark:text-[#6EE7B7]">
                    Customer Responded
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
                className="text-xs text-[#065F46] dark:text-[#34D399] underline hover:text-[#043E2E] dark:hover:text-[#6EE7B7]"
              >
                Reset
              </button>
            </div>
          )}
        </div>

        {/* Right: Modern Smartphone Mockup */}
        <div className="lg:col-span-6 flex justify-center">
          <div className="w-full max-w-[340px] bg-[#FFFFFF] dark:bg-[#1A221E] rounded-[2.25rem] p-3 shadow-lg border border-[#D5D2C8] dark:border-[#2D3932] ring-8 ring-[#ECE9DF] dark:ring-[#141B17] transition-colors">
            {/* Phone Speaker & Camera Notch */}
            <div className="w-28 h-4 bg-[#E0DED5] dark:bg-[#25302A] rounded-full mx-auto mb-3" />

            {/* WhatsApp Header */}
            <div className="bg-[#075E54] dark:bg-[#0E443C] text-white rounded-t-2xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#128C7E] flex items-center justify-center font-bold text-xs text-white">
                  {activeConfig.customer.charAt(0)}
                </div>
                <div>
                  <div className="text-xs font-semibold leading-tight">
                    {activeConfig.customer}
                  </div>
                  <div className="text-[10px] text-[#A7F3D0] leading-none mt-0.5">
                    Online · Business Verified
                  </div>
                </div>
              </div>
              <span className="text-[10px] text-white/80 font-mono">WhatsApp</span>
            </div>

            {/* WhatsApp Chat Body */}
            <div className="bg-[#EFEAE2] dark:bg-[#0B1410] p-3 min-h-[300px] flex flex-col justify-end space-y-3 rounded-b-2xl transition-colors">
              {/* Date separator */}
              <div className="text-center">
                <span className="text-[10px] bg-[#E1DDD5] dark:bg-[#1B2720] text-[#555C57] dark:text-[#8C948F] px-2 py-0.5 rounded shadow-2xs font-mono">
                  Today
                </span>
              </div>

              {/* Merchant Outgoing Message Bubble */}
              <div className="bg-[#E7FDE1] dark:bg-[#0E3A28] text-[#111B21] dark:text-[#EAECE9] rounded-xl rounded-tr-xs p-3 ml-6 shadow-2xs border border-[#CDE5C8] dark:border-[#1A4D38] relative">
                <p className="text-xs leading-relaxed break-words whitespace-pre-wrap">
                  {messageText}
                </p>
                <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-[#667781] dark:text-[#8FA098]">
                  <span>11:32 AM</span>
                  <CheckCheck
                    className={`w-3 h-3 ${
                      sentState !== 'idle' ? 'text-[#34B7F1]' : 'text-[#8696A0] dark:text-[#5A6D63]'
                    }`}
                  />
                </div>
              </div>

              {/* Customer Incoming Message Reply Bubble */}
              {customerReply && (
                <div className="bg-white dark:bg-[#1A2620] text-[#111B21] dark:text-[#EAECE9] rounded-xl rounded-tl-xs p-3 mr-6 shadow-2xs border border-[#E2DFD8] dark:border-[#283830] animate-fadeIn">
                  <p className="text-xs leading-relaxed">{customerReply}</p>
                  <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-[#667781] dark:text-[#8FA098]">
                    <span>11:34 AM</span>
                  </div>
                </div>
              )}
            </div>

            {/* Phone bottom bar */}
            <div className="w-24 h-1 bg-[#D0CDC2] dark:bg-[#2C3831] rounded-full mx-auto mt-3 mb-1" />
          </div>
        </div>
      </div>
    </div>
  );
};
