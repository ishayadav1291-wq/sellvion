import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

interface FaqItem {
  q: string;
  a: string;
  category: string;
}

const FAQS: FaqItem[] = [
  {
    category: 'Paytm Integration',
    q: 'How does SELLVION connect with my Paytm Merchant account?',
    a: 'Sign in with your Paytm for Business credentials. Within two minutes, your store transactions, QR payments, and customer phone numbers sync securely so you can start reviewing repeat order and udhaar reminders right away.',
  },
  {
    category: 'WhatsApp Safety',
    q: 'Will SELLVION spam my customers on WhatsApp?',
    a: 'No. Messages go out strictly through the official WhatsApp Business API. We automatically pause sending during night hours (9 PM – 9 AM IST), limit how often any customer receives a message (at most once every 48 hours), and stop immediately if a buyer replies STOP.',
  },
  {
    category: 'COD Return Protection',
    q: 'How does SELLVION cut down Cash-on-Delivery returns?',
    a: 'Every returned COD parcel costs ₹200–₹350 in two-way shipping. Before you hand a parcel to the courier, SELLVION checks incomplete addresses, pincode return history, and order value. For risky orders, it sends a polite WhatsApp message offering a small instant discount (like ₹50 off) if they pay via UPI upfront.',
  },
  {
    category: 'Control & Approvals',
    q: 'Can I check messages before they go to my customers?',
    a: 'Yes, always. By default, SELLVION asks for your 1-tap approval before sending any message. You can edit the Hinglish text or snooze it. Once you trust a category (such as regular reorder nudges), you can turn on auto-send for that specific rule anytime.',
  },
  {
    category: 'Measuring Results',
    q: 'How do I know which sales actually came from SELLVION?',
    a: 'We keep 10% of eligible customers aside as an uncontacted comparison group. By comparing repeat purchases between customers who received reminders and those who didn’t, your dashboard shows the genuine extra revenue SELLVION generated.',
  },
  {
    category: 'Udhaar & Collections',
    q: 'How do digital udhaar reminders work for repeat shop customers?',
    a: 'When a credit balance goes past its due date, SELLVION prepares a respectful Hinglish reminder with a direct Paytm UPI payment link. As soon as the buyer pays via Paytm, GPay, or PhonePe, your ledger updates automatically.',
  },
];

export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="space-y-8 scroll-mt-24">
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAF2FF] dark:bg-[#0C243B] text-xs font-semibold text-[#0066FF] dark:text-[#38BDF8]">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Frequently Asked Questions</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0F1E36] dark:text-white font-display">
          Common Questions from Indian Merchants
        </h2>
        <p className="text-xs sm:text-sm text-[#475569] dark:text-[#94A3B8]">
          Plain answers on setup, WhatsApp limits, COD checks, and billing.
        </p>
      </div>

      <div className="max-w-3xl mx-auto space-y-3">
        {FAQS.map((item, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className={`rounded-2xl border transition-all ${
                isOpen
                  ? 'bg-white dark:bg-[#132238] border-[#0066FF] dark:border-[#38BDF8] shadow-sm'
                  : 'bg-white/80 dark:bg-[#132238]/70 border-[#E2E8F0] dark:border-[#1E3A5F] hover:border-[#CBD5E1]'
              }`}
            >
              <button
                onClick={() => toggle(idx)}
                className="w-full text-left p-5 flex items-center justify-between gap-4 cursor-pointer"
              >
                <div>
                  <span className="text-[10px] font-bold tracking-wider uppercase text-[#0066FF] dark:text-[#38BDF8] block mb-1">
                    {item.category}
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-[#0F1E36] dark:text-white">
                    {item.q}
                  </h3>
                </div>
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 ${
                    isOpen
                      ? 'bg-[#0066FF] text-white rotate-180'
                      : 'bg-[#F1F5F9] dark:bg-[#0C243B] text-[#64748B] dark:text-[#94A3B8]'
                  }`}
                >
                  <ChevronDown className="w-4 h-4" />
                </div>
              </button>

              {isOpen && (
                <div className="px-5 pb-5 text-xs sm:text-sm text-[#475569] dark:text-[#94A3B8] leading-relaxed border-t border-[#F1F5F9] dark:border-[#1E3A5F] mt-2 pt-3">
                  {item.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
