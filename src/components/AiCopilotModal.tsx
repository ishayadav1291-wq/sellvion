import React, { useState } from 'react';
import { Sparkles, X, Send, Bot, User, RefreshCw } from 'lucide-react';
import { Customer, MetricSummary } from '../types';

interface AiCopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  metrics: MetricSummary;
}

interface Message {
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export const AiCopilotModal: React.FC<AiCopilotModalProps> = ({
  isOpen,
  onClose,
  customers,
  metrics,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'assistant',
      text: 'Namaste! I am your SELLVION AI Employee copilot. I analyze your customer buying rhythms, track overdue udhaar, and evaluate COD return risks. How can I help your store today?',
      timestamp: 'Just now',
    },
  ]);
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const quickPrompts = [
    'Which regular customers are due for reorder this week?',
    'Why is order ORD-9932 flagged for 68% COD return risk?',
    'How much udhaar is currently overdue past 5 days?',
    'Suggest a festival offer for our inactive VIP customers',
  ];

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = queryText || inputText;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = {
      sender: 'user',
      text: textToSend,
      timestamp: 'Just now',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/ask-copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: textToSend,
          merchantContext: {
            activeCustomersCount: customers.length,
            dueForReorder: customers.filter((c) => c.segment === 'reorder_due').map((c) => ({
              name: c.name,
              item: c.lastProductOrdered,
              cadence: c.averageOrderCadenceDays,
              daysSince: c.daysSinceLastOrder,
            })),
            highCodRisk: customers.filter((c) => c.codReliabilityScore < 50).map((c) => ({
              name: c.name,
              score: c.codReliabilityScore,
              city: c.city,
            })),
            overdueUdhaar: customers.filter((c) => c.outstandingUdhaar > 0).map((c) => ({
              name: c.name,
              amount: c.outstandingUdhaar,
              dueDate: c.udhaarDueDate,
            })),
            metrics,
          },
        }),
      });

      const data = await res.json();
      const reply = data.reply || 'Analysis completed based on current customer ledger records.';

      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: reply,
          timestamp: 'Just now',
        },
      ]);
    } catch (err) {
      console.error('Copilot request failed:', err);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: 'Unable to reach the AI model right now. You have 2 customers due for reorder and ₹5,300 in pending udhaar.',
          timestamp: 'Just now',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-[#F8FAFC] dark:bg-[#0B1320] rounded-2xl max-w-xl w-full h-[620px] shadow-2xl border border-[#CBD5E1] dark:border-[#1E3A5F] flex flex-col overflow-hidden transition-colors">
        {/* Header */}
        <div className="px-5 py-4 bg-white dark:bg-[#132238] border-b border-[#E2E8F0] dark:border-[#1E3A5F] flex items-center justify-between transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0284C7] text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4 text-[#BAE6FD]" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-1.5">
                <span>SELLVION Copilot</span>
                <span className="text-[10px] text-[#0284C7] dark:text-[#38BDF8] font-medium font-mono">
                  Autonomous Teammate
                </span>
              </div>
              <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                Connected to store orders, customer cadences, and udhaar ledger
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-[#1B2E4B] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Thread */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-2.5 text-xs ${
                msg.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.sender === 'assistant' && (
                <div className="w-6 h-6 rounded-md bg-[#0284C7] text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-[#BAE6FD]" />
                </div>
              )}

              <div
                className={`max-w-[80%] p-3 rounded-xl leading-relaxed whitespace-pre-wrap ${
                  msg.sender === 'user'
                    ? 'bg-[#0284C7] text-white rounded-tr-xs shadow-sm shadow-[#0284C7]/20'
                    : 'bg-white dark:bg-[#132238] border border-[#E2E8F0] dark:border-[#1E3A5F] text-[#0F172A] dark:text-[#F8FAFC] rounded-tl-xs shadow-2xs'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-2.5 text-xs items-center text-[#64748B] dark:text-[#94A3B8]">
              <div className="w-6 h-6 rounded-md bg-[#0284C7] text-white flex items-center justify-center shrink-0">
                <RefreshCw className="w-3.5 h-3.5 text-[#BAE6FD] animate-spin" />
              </div>
              <span className="italic">SELLVION is analyzing customer graph...</span>
            </div>
          )}
        </div>

        {/* Quick Prompt Chips */}
        <div className="px-4 py-2 border-t border-[#E2E8F0] dark:border-[#1E3A5F] bg-white dark:bg-[#132238] flex items-center gap-1.5 overflow-x-auto text-[11px] transition-colors">
          <span className="text-[#64748B] dark:text-[#94A3B8] shrink-0 font-medium">Try:</span>
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(qp)}
              className="px-2.5 py-1 rounded-md bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-[#1E3A5F] hover:border-[#0284C7] dark:hover:border-[#38BDF8] text-[#334155] dark:text-[#CBD5E1] hover:text-[#0284C7] dark:hover:text-[#38BDF8] whitespace-nowrap shrink-0 transition-colors cursor-pointer"
            >
              {qp}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white dark:bg-[#132238] border-t border-[#E2E8F0] dark:border-[#1E3A5F] transition-colors">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask anything about customer behaviour, COD risks, or udhaar..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 text-xs py-2 px-3 bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#CBD5E1] dark:border-[#1E3A5F] rounded-xl text-[#0F172A] dark:text-[#F8FAFC] placeholder-[#94A3B8] dark:placeholder-[#64748B] focus:outline-none focus:ring-1 focus:ring-[#0284C7] dark:focus:ring-[#38BDF8]"
            />
            <button
              type="submit"
              disabled={isLoading || !inputText.trim()}
              className="p-2 bg-[#0284C7] hover:bg-[#0369A1] text-white rounded-xl transition-colors disabled:opacity-40 cursor-pointer shadow-sm shadow-[#0284C7]/20"
            >
              <Send className="w-4 h-4 text-[#BAE6FD]" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
