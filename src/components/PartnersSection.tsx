import React from 'react';
import { ShieldCheck, Zap, CheckCircle2, ArrowRight } from 'lucide-react';

export const PartnersSection: React.FC = () => {
  const partners = [
    {
      name: 'Paytm for Business',
      tag: 'Official Merchant Partner',
      description: 'Native sync with Paytm Soundbox, EDC POS machines, and All-in-One QR codes.',
      badge: 'Certified Integration',
      logo: '/assets/aistudio/image_18826acc.png',
      isImage: true,
    },
    {
      name: 'WhatsApp Cloud API',
      tag: 'Official Meta BSP API',
      description: 'Official Tier-1 verified WhatsApp Business accounts with 99.9% inbox delivery.',
      badge: 'Meta Verified',
      isImage: false,
      color: '#25D366',
    },
    {
      name: 'Shopify India',
      tag: 'E-commerce Sync',
      description: 'Real-time order webhooks, customer metadata sync, and automated cart recovery.',
      badge: 'App Store Partner',
      isImage: false,
      color: '#95BF47',
    },
    {
      name: 'Shiprocket & Delhivery',
      tag: 'Logistics Intelligence',
      description: 'High-risk pincode telemetry, NDR automation, and real-time courier tracking.',
      badge: 'Logistics API',
      isImage: false,
      color: '#0066FF',
    },
    {
      name: 'Razorpay & UPI',
      tag: 'Payment Rails',
      description: 'Automated 1-tap dynamic UPI intent links for instant zero-fee customer settlement.',
      badge: 'Instant Settlement',
      isImage: false,
      color: '#3395FF',
    },
    {
      name: 'Google Gemini 2.5',
      tag: 'AI Foundation',
      description: 'Ultra-fast low-latency multi-agent reasoning, Hinglish copywriting, and risk scoring.',
      badge: 'Core Intelligence',
      isImage: false,
      color: '#8B5CF6',
    },
  ];

  return (
    <section id="partners" className="space-y-8 scroll-mt-24">
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAF2FF] dark:bg-[#0C243B] text-xs font-semibold text-[#0066FF] dark:text-[#38BDF8]">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Ecosystem & Integrations</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0F1E36] dark:text-white font-display">
          Connected to the Tools You Already Run Your Business On
        </h2>
        <p className="text-xs sm:text-sm text-[#475569] dark:text-[#94A3B8]">
          Zero code setup. Connect your Paytm merchant account or Shopify store in 2 minutes.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {partners.map((p, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-[#132238] rounded-2xl border border-[#E2E8F0] dark:border-[#1E3A5F] p-5 shadow-xs hover:border-[#0066FF] dark:hover:border-[#38BDF8] hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                {p.isImage ? (
                  <img src={p.logo} alt={p.name} className="h-6 w-auto object-contain dark:brightness-110" />
                ) : (
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="font-bold text-sm text-[#0F1E36] dark:text-white">{p.name}</span>
                  </div>
                )}
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F1F5F9] dark:bg-[#0C243B] text-[#475569] dark:text-[#38BDF8] border border-[#CBD5E1]/50 dark:border-[#1E456E]">
                  {p.badge}
                </span>
              </div>

              <div className="text-xs font-bold text-[#0066FF] dark:text-[#38BDF8] mb-1">
                {p.tag}
              </div>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                {p.description}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-[#F1F5F9] dark:border-[#1E3A5F] flex items-center justify-between text-[11px] font-medium text-[#0F1E36] dark:text-[#F8FAFC]">
              <span className="flex items-center gap-1.5 text-[#10B981]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Plug & Play Active</span>
              </span>
              <span className="text-xs text-[#0066FF] dark:text-[#38BDF8] font-bold">2-Min Sync →</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
