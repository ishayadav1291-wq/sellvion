import React, { useState } from 'react';
import { ChevronDown, HelpCircle, ShieldCheck } from 'lucide-react';

interface FaqItem {
  q: string;
  a: string;
  category: string;
}

const FAQS: FaqItem[] = [
  {
    category: 'Paytm Integration',
    q: 'How does SELLVION connect with my Paytm Merchant account?',
    a: 'SELLVION connects seamlessly through the official Paytm for Business Developer API and Soundbox telemetry. Simply log in with your verified Paytm merchant credentials. Once connected, your daily store transactions, bahi-khata credit records, and customer phone numbers are securely synced with tenant-level AES-256 encryption.',
  },
  {
    category: 'WhatsApp & Spam Safety',
    q: 'Will SELLVION spam my customers on WhatsApp or get my number banned?',
    a: 'Never. SELLVION operates strictly on the official Meta WhatsApp Business Cloud API under BRULE-01 to BRULE-06 safety specifications. We enforce strict Quiet Hours (9:00 PM to 9:00 AM IST), cap contacts to a maximum of 1 message per customer every 48 hours, and instantly honor STOP/Opt-Out replies. Messages are drafted in warm, polite Hinglish personalized to past order history.',
  },
  {
    category: 'COD Return Protection',
    q: 'How does the COD Return (RTO) Risk Scorer save me money?',
    a: 'Every courier return costs Indian merchants between ₹200 and ₹350 in reverse shipping, packaging waste, and blocked inventory. SELLVION analyzes incoming cash-on-delivery orders against 4 explainable risk vectors: pincode courier RTO frequency, address incompleteness (missing flat/house number), first-time buyer status, and order value. For high-risk orders, SELLVION sends a gentle WhatsApp message offering a small instant discount (e.g. ₹50 off) to switch to 1-tap UPI prepayment before courier dispatch.',
  },
  {
    category: 'Autonomy & Approvals',
    q: 'Can I review and approve AI messages before they are sent to customers?',
    a: 'Yes! SELLVION begins in "Earned Autonomy Level 1: Supervised Mode". Every generated reorder prompt, udhaar reminder, and COD confirmation sits in your Approval Inbox with an explainable reason card and 1-tap edit draft capability. Only when an action type reaches >85% owner approval rate and >95% safety confidence can you choose to enable automated dispatches.',
  },
  {
    category: 'Holdout Science & ROI',
    q: 'What is the "10% Uncontacted Holdout Cohort" and how does it prove ROI?',
    a: 'Most marketing tools falsely take credit for sales that customers would have made anyway (natural reorders). SELLVION scientifically isolates a random, statistically sound 10% holdout group that is intentionally uncontacted. By comparing the purchase rate of contacted customers against uncontacted holdout customers, SELLVION proves true incremental revenue lift with mathematical transparency.',
  },
  {
    category: 'Udhaar & Collections',
    q: 'How does the digital bahi-khata recovery work for local stores?',
    a: 'When an udhaar balance reaches or exceeds your configured credit cycle (e.g. 15 or 30 days), SELLVION drafts a courteous, respectful reminder message containing a dynamic UPI intent link and QR code. Customers can settle in seconds via Paytm, Google Pay, or PhonePe. The moment payment is verified via your Soundbox or UPI webhook, your ledger reconciles automatically.',
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
          Everything You Need to Know Before Getting Started
        </h2>
        <p className="text-xs sm:text-sm text-[#475569] dark:text-[#94A3B8]">
          Clear answers for retail shop owners, D2C brand founders, and regional merchants.
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
                <div className="px-5 pb-5 pt-0 text-xs sm:text-sm text-[#475569] dark:text-[#94A3B8] leading-relaxed border-t border-[#F1F5F9] dark:border-[#1E3A5F] mt-2 pt-3">
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
