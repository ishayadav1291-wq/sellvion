import React from 'react';
import { Check, X, ArrowRight, ShieldCheck } from 'lucide-react';
import { AppLanguage } from '../types';
import { tr } from '../i18n/translations';

interface ComparisonMatrixProps {
  language?: AppLanguage;
  onGetStarted: () => void;
}

export const ComparisonMatrix: React.FC<ComparisonMatrixProps> = ({
  language = 'en',
  onGetStarted,
}) => {
  const rows = [
    {
      feature: tr(
        language,
        'Learns each buyer’s reorder cycle',
        'हर ग्राहक का रीऑर्डर समय पहचानता है'
      ),
      sellvion: true,
      broadcast: false,
      crm: false,
    },
    {
      feature: tr(
        language,
        'Flags risky COD orders before dispatch',
        'डिस्पैच से पहले जोखिम वाले COD ऑर्डर पकड़ता है'
      ),
      sellvion: true,
      broadcast: false,
      crm: false,
    },
    {
      feature: tr(
        language,
        'Respectful Udhaar payment reminders',
        'विनम्र उधार और भुगतान रिमाइंडर'
      ),
      sellvion: true,
      broadcast: false,
      crm: false,
    },
    {
      feature: tr(
        language,
        'Human approval before messages go out',
        'संदेश जाने से पहले आपकी मंजूरी'
      ),
      sellvion: true,
      broadcast: false,
      crm: true,
    },
    {
      feature: tr(
        language,
        'Simple English & Hindi + Voice Commands',
        'सरल हिन्दी व अंग्रेज़ी + वॉइस कमांड'
      ),
      sellvion: true,
      broadcast: false,
      crm: false,
    },
  ];

  const plans = [
    {
      name: tr(language, 'Starter', 'स्टार्टर'),
      price: '₹0',
      period: tr(language, 'Free Forever', 'हमेशा मुफ्त'),
      summary: tr(
        language,
        'For local shops and new D2C sellers testing safe AI follow-ups.',
        'सुरक्षित AI फॉलो-अप जांचने वाली स्थानीय दुकानों और नए D2C विक्रेताओं के लिए।'
      ),
      points: [
        tr(language, 'Up to 100 tracked customers', '100 तक ग्राहक रिकॉर्ड'),
        tr(language, 'Action Center & COD risk check', 'मंजूरी केंद्र और COD जोखिम जांच'),
        tr(language, 'CSV import & demo sandbox', 'CSV अपलोड और डेमो सैंडबॉक्स'),
      ],
      cta: tr(language, 'Start Free', 'मुफ्त शुरू करें'),
      highlight: false,
    },
    {
      name: tr(language, 'Growth', 'ग्रोथ'),
      price: '₹1,499',
      period: tr(language, 'per month', 'प्रति माह'),
      summary: tr(
        language,
        'For growing stores automating reorders, COD protection, and khata.',
        'रीऑर्डर, COD सुरक्षा और उधार ऑटोमेशन वाली बढ़ती दुकानों के लिए।'
      ),
      points: [
        tr(language, 'Up to 2,500 customers', '2,500 तक ग्राहक'),
        tr(language, 'WhatsApp Cloud & Shopify sync', 'WhatsApp Cloud और Shopify सिंक'),
        tr(language, 'Holdout measurement & audit log', 'होल्डआउट तुलना और ऑडिट लॉग'),
      ],
      cta: tr(language, 'Create Store Account', 'दुकान खाता बनाएं'),
      highlight: true,
    },
    {
      name: tr(language, 'Multi-Store', 'मल्टी-स्टोर'),
      price: '₹3,999',
      period: tr(language, 'per month', 'प्रति माह'),
      summary: tr(
        language,
        'For multi-outlet retail teams with custom approval roles.',
        'कस्टम मंजूरी नियमों वाली मल्टी-स्टोर रिटेल टीमों के लिए।'
      ),
      points: [
        tr(language, 'Unlimited team members (RBAC)', 'असीमित टीम सदस्य (RBAC)'),
        tr(language, 'Shiprocket & Razorpay webhooks', 'Shiprocket और Razorpay वेबहुक्स'),
        tr(language, 'Priority onboarding support', 'प्राथमिक ऑनबोर्डिंग सहायता'),
      ],
      cta: tr(language, 'Get Started', 'शुरू करें'),
      highlight: false,
    },
  ];

  return (
    <div className="space-y-12">
      <div className="space-y-4">
        <div className="space-y-1">
          <div className="text-xs font-bold uppercase tracking-wider text-[#2563EB] dark:text-[#22D3EE] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            <span>{tr(language, 'Platform Differentiation', 'प्लेटफ़ॉर्म तुलना')}</span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#071A35] dark:text-white">
            {tr(
              language,
              'Why Merchants Choose SELLVION Over Broadcast Tools',
              'व्यापारी ब्रॉडकास्ट टूल्स के बजाय SELLVION क्यों चुनते हैं'
            )}
          </h2>
          <p className="text-sm text-[#475569] dark:text-[#CBD5E1] max-w-2xl">
            {tr(
              language,
              'Built to protect customer trust and prevent wasted courier fees, not blast spam.',
              'स्पैम भेजने के बजाय ग्राहक भरोसा बढ़ाने और बेकार कूरियर खर्च बचाने के लिए बनाया गया।'
            )}
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#0B1E40]">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#F8FAFC] dark:bg-[#071A35] border-b border-[#E2E8F0] dark:border-[#1E3A5F] text-[#071A35] dark:text-white">
              <tr>
                <th className="py-3.5 px-5 font-bold">
                  {tr(language, 'Capability', 'क्षमता')}
                </th>
                <th className="py-3.5 px-5 font-extrabold text-[#2563EB] dark:text-[#22D3EE] bg-[#EFF6FF] dark:bg-[#0B254B]">
                  SELLVION
                </th>
                <th className="py-3.5 px-5 font-semibold text-[#64748B] dark:text-[#94A3B8]">
                  {tr(language, 'WhatsApp Blaster', 'WhatsApp ब्लास्टर')}
                </th>
                <th className="py-3.5 px-5 font-semibold text-[#64748B] dark:text-[#94A3B8]">
                  {tr(language, 'Generic CRM', 'साधारण CRM')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1E3A5F]">
              {rows.map((r) => (
                <tr key={r.feature} className="hover:bg-[#F8FAFC] dark:hover:bg-[#061533]/60">
                  <td className="py-3.5 px-5 font-semibold text-[#071A35] dark:text-white">
                    {r.feature}
                  </td>
                  <td className="py-3.5 px-5 bg-[#EFF6FF]/60 dark:bg-[#0E2B57]/40">
                    <Check className="w-4 h-4 text-[#16A34A]" />
                  </td>
                  <td className="py-3.5 px-5">
                    {r.broadcast ? (
                      <Check className="w-4 h-4 text-[#16A34A]" />
                    ) : (
                      <X className="w-4 h-4 text-[#94A3B8]" />
                    )}
                  </td>
                  <td className="py-3.5 px-5">
                    {r.crm ? (
                      <Check className="w-4 h-4 text-[#16A34A]" />
                    ) : (
                      <X className="w-4 h-4 text-[#94A3B8]" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pricing Plans */}
      <div className="grid md:grid-cols-3 gap-5">
        {plans.map((p) => (
          <div
            key={p.name}
            className={`rounded-2xl p-6 flex flex-col justify-between gap-5 border ${
              p.highlight
                ? 'border-[#2563EB] bg-[#EFF6FF]/60 dark:bg-[#0E2B57] shadow-md'
                : 'border-[#E2E8F0] dark:border-[#1E3A5F] bg-white dark:bg-[#0B1E40]'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#2563EB] dark:text-[#22D3EE]">
                  {p.name}
                </span>
                {p.highlight && (
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#2563EB] dark:text-[#22D3EE]">
                    {tr(language, 'Recommended', 'लोकप्रिय')}
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-[#071A35] dark:text-white tabular-nums">
                  {p.price}
                </span>
                <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">{p.period}</span>
              </div>
              <p className="text-xs text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
                {p.summary}
              </p>
              <ul className="space-y-2 pt-3 border-t border-[#E2E8F0] dark:border-[#1E3A5F] text-xs text-[#071A35] dark:text-white">
                {p.points.map((pt) => (
                  <li key={pt} className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#22D3EE] shrink-0" />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={onGetStarted}
              className={`h-11 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                p.highlight
                  ? 'bg-[#2563EB] hover:bg-[#071A35] text-white'
                  : 'border border-[#CBD5E1] dark:border-[#1E3A5F] hover:border-[#2563EB] text-[#071A35] dark:text-white'
              }`}
            >
              <span>{p.cta}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
