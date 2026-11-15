import React, { useState, useEffect } from 'react';
import { X, Send, Sparkles, RefreshCw } from 'lucide-react';
import { AppLanguage } from '../types';
import { apiRequest } from '../lib/api';
import { tr } from '../i18n/translations';

interface AiCopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: AppLanguage;
}

export const AiCopilotModal: React.FC<AiCopilotModalProps> = ({
  isOpen,
  onClose,
  language,
}) => {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length <= 1 && (prev.length === 0 || prev[0].role === 'assistant')) {
        return [
          {
            role: 'assistant',
            text: tr(
              language,
              'Ask me about customers due for reorder, flagged COD orders, or pending udhaar balances in your store.',
              'अपने स्टोर में रीऑर्डर के लिए तैयार ग्राहकों, जोखिम वाले COD ऑर्डर या बकाया उधार के बारे में पूछें।'
            ),
          },
        ];
      }
      return prev;
    });
  }, [language]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAsk = async (qText?: string) => {
    const prompt = (qText ?? query).trim();
    if (!prompt || loading) return;

    setMessages((prev) => [...prev, { role: 'user', text: prompt }]);
    if (!qText) setQuery('');
    setLoading(true);

    try {
      const res = await apiRequest<{ reply: string }>('/api/ai/ask-copilot', {
        method: 'POST',
        body: JSON.stringify({ query: prompt, language }),
      });
      setMessages((prev) => [...prev, { role: 'assistant', text: res.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: tr(
            language,
            'Could not reach the store assistant right now. Please try again.',
            'अभी स्टोर सहायक से संपर्क नहीं हो सका। कृपया पुनः प्रयास करें।'
          ),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const presets = [
    tr(language, 'Which customers have pending udhaar?', 'किन ग्राहकों पर उधार बकाया है?'),
    tr(language, 'Which COD orders look risky?', 'कौन से COD ऑर्डर जोखिम भरे दिख रहे हैं?'),
    tr(language, 'Who is due to reorder soon?', 'कौन जल्द रीऑर्डर करने वाला है?'),
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#0B1E40] border border-[#CBD5E1] dark:border-[#1E3A5F] shadow-2xl overflow-hidden flex flex-col max-h-[82vh]">
        <div className="px-5 py-4 border-b border-[#E2E8F0] dark:border-[#1E3A5F] flex items-center justify-between bg-[#F8FAFC] dark:bg-[#071A35]">
          <div className="flex items-center gap-2 text-[#071A35] dark:text-white">
            <Sparkles className="w-4 h-4 text-[#2563EB] dark:text-[#22D3EE]" />
            <span className="text-sm font-extrabold">
              {tr(language, 'Ask Store Assistant', 'स्टोर सहायक से पूछें')}
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label={tr(language, 'Close store assistant', 'सहायक बंद करें')}
            className="p-1.5 rounded-lg hover:bg-[#E2E8F0] dark:hover:bg-white/10 text-[#071A35] dark:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs sm:text-sm">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-xl max-w-[90%] ${
                m.role === 'user'
                  ? 'ml-auto bg-[#2563EB] text-white'
                  : 'bg-[#F0F7FF] dark:bg-[#061533] text-[#071A35] dark:text-white'
              }`}
            >
              {m.text}
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-[#64748B]">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>{tr(language, 'Checking your store records...', 'आपके स्टोर रिकॉर्ड जांचे जा रहे हैं...')}</span>
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-[#E2E8F0] dark:border-[#1E3A5F] flex flex-wrap gap-1.5">
          {presets.map((preset) => (
            <button
              key={preset}
              onClick={() => handleAsk(preset)}
              className="px-2.5 py-1 rounded-lg bg-[#F8FAFC] dark:bg-[#061533] border border-[#E2E8F0] dark:border-[#1E3A5F] text-[11px] font-medium text-[#071A35] dark:text-white hover:border-[#2563EB] cursor-pointer"
            >
              {preset}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk();
          }}
          className="p-3 border-t border-[#E2E8F0] dark:border-[#1E3A5F] flex items-center gap-2"
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tr(language, 'Ask a question about your store...', 'अपने स्टोर के बारे में कोई प्रश्न पूछें...')}
            className="flex-1 h-10 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#061533] text-xs text-[#071A35] dark:text-white"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="h-10 px-4 rounded-lg bg-[#2563EB] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{tr(language, 'Ask', 'पूछें')}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
