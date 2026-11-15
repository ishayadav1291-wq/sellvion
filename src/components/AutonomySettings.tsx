import React, { useState, useEffect } from 'react';
import { ShieldCheck, PauseOctagon, Save } from 'lucide-react';
import { AppLanguage, AutonomyLevel, AutonomyPolicyConfig } from '../types';
import { apiRequest } from '../lib/api';
import { tr } from '../i18n/translations';

interface AutonomySettingsProps {
  config: AutonomyPolicyConfig;
  language?: AppLanguage;
  onSaved: (cfg: AutonomyPolicyConfig) => void;
  onNotify: (msg: string) => void;
}

export const AutonomySettings: React.FC<AutonomySettingsProps> = ({
  config,
  language = 'en',
  onSaved,
  onNotify,
}) => {
  const [form, setForm] = useState<AutonomyPolicyConfig>(config);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(config);
  }, [config]);

  const handleSave = async (nextConfig?: AutonomyPolicyConfig) => {
    const payload = nextConfig || form;
    setSaving(true);
    try {
      await apiRequest('/api/business/settings', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      onSaved(payload);
      onNotify(
        payload.emergencyPauseAll
          ? tr(
              language,
              'Emergency pause enabled: all AI sends paused.',
              'आपातकालीन रोक सक्रिय: सभी AI संदेश रोक दिए गए।'
            )
          : tr(language, 'Safety rules saved.', 'सुरक्षा नियम सेव हो गए।')
      );
    } catch (err: unknown) {
      onNotify(
        err instanceof Error
          ? err.message
          : tr(language, 'Failed to save safety rules.', 'सुरक्षा नियम सेव नहीं हो सके।')
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Emergency Pause Bar */}
      <div
        className={`rounded-2xl border p-4 flex flex-wrap items-center justify-between gap-4 transition-colors ${
          form.emergencyPauseAll
            ? 'border-[#DC2626] bg-[#FEF2F2] dark:bg-[#450A0A]/40'
            : 'border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#0B1E40]'
        }`}
      >
        <div className="flex items-center gap-3">
          <PauseOctagon
            className={`w-6 h-6 shrink-0 ${
              form.emergencyPauseAll ? 'text-[#DC2626]' : 'text-[#2563EB] dark:text-[#22D3EE]'
            }`}
          />
          <div>
            <div className="text-sm font-extrabold text-[#071A35] dark:text-white">
              {tr(language, 'Emergency Pause All Automation', 'सभी ऑटोमेशन तुरंत रोकें')}
            </div>
            <div className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              {tr(
                language,
                'Immediately stops all automated and queued WhatsApp sends across your store.',
                'आपके स्टोर में सभी ऑटोमेटेड और कतार में लगे WhatsApp संदेश तुरंत रोक देता है।'
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            const updated = { ...form, emergencyPauseAll: !form.emergencyPauseAll };
            setForm(updated);
            handleSave(updated);
          }}
          className={`h-10 px-4 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
            form.emergencyPauseAll
              ? 'bg-[#DC2626] text-white'
              : 'bg-[#071A35] dark:bg-[#22D3EE] text-white dark:text-[#071A35] hover:bg-[#2563EB]'
          }`}
        >
          {form.emergencyPauseAll
            ? tr(language, 'Paused — Click to Resume', 'रुका हुआ — शुरू करने के लिए क्लिक करें')
            : tr(language, 'Pause All Sends', 'सभी संदेश रोकें')}
        </button>
      </div>

      <div className="grid lg:grid-cols-12 gap-4">
        {/* Per-Workflow Earned Autonomy */}
        <div className="lg:col-span-7 rounded-2xl border border-[#E2E8F0] dark:border-[#1E3A5F] bg-white dark:bg-[#0B1E40] p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#2563EB] dark:text-[#22D3EE]" />
            <h3 className="text-base font-extrabold text-[#071A35] dark:text-white">
              {tr(language, 'Earned Autonomy by Workflow', 'कार्य के अनुसार मंज़ूरी स्तर')}
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            {(
              [
                {
                  key: 'reorderReminders',
                  label: tr(language, 'Reorder Reminders', 'रीऑर्डर रिमाइंडर'),
                },
                {
                  key: 'codPrepayNudges',
                  label: tr(language, 'COD Address & UPI Checks', 'COD पता और UPI जांच'),
                },
                {
                  key: 'udhaarReminders',
                  label: tr(language, 'Udhaar Payment Reminders', 'उधार भुगतान रिमाइंडर'),
                },
                {
                  key: 'winbackOffers',
                  label: tr(language, 'Inactive Customer Win-Back', 'निष्क्रिय ग्राहक वापसी ऑफ़र'),
                },
              ] as const
            ).map((item) => (
              <div
                key={item.key}
                className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#061533] border border-[#E2E8F0] dark:border-[#1E3A5F] flex flex-wrap items-center justify-between gap-3"
              >
                <div className="font-bold text-[#071A35] dark:text-white">{item.label}</div>
                <select
                  aria-label={item.label}
                  value={form[item.key]}
                  onChange={(e) => setForm({ ...form, [item.key]: e.target.value as AutonomyLevel })}
                  className="h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#0B1E40] text-xs font-semibold text-[#071A35] dark:text-white cursor-pointer"
                >
                  <option value="recommendation_only">
                    {tr(language, 'Suggestions Only', 'केवल सुझाव')}
                  </option>
                  <option value="approval_required">
                    {tr(language, 'Ask Me First (Approval Queue)', 'पहले मुझसे पूछें (मंज़ूरी कतार)')}
                  </option>
                  <option value="bounded_autonomous">
                    {tr(language, 'Auto Within Limits', 'सीमा में स्वतः')}
                  </option>
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* Guardrails */}
        <div className="lg:col-span-5 rounded-2xl border border-[#E2E8F0] dark:border-[#1E3A5F] bg-white dark:bg-[#0B1E40] p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-base font-extrabold text-[#071A35] dark:text-white">
              {tr(language, 'Customer Respect & Spend Guardrails', 'ग्राहक सम्मान और खर्च सुरक्षा सीमाएँ')}
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">
                  {tr(language, 'Quiet Hours Start (IST)', 'शांत समय शुरुआत (IST)')}
                </label>
                <input
                  type="time"
                  value={form.quietHoursStart}
                  onChange={(e) => setForm({ ...form, quietHoursStart: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#061533] text-[#071A35] dark:text-white"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">
                  {tr(language, 'Quiet Hours End (IST)', 'शांत समय समाप्ति (IST)')}
                </label>
                <input
                  type="time"
                  value={form.quietHoursEnd}
                  onChange={(e) => setForm({ ...form, quietHoursEnd: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#061533] text-[#071A35] dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">
                  {tr(language, 'Max Messages per Buyer (48h)', 'प्रति खरीदार अधिकतम संदेश (48 घंटे)')}
                </label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={form.maxDailyMessagesPerCustomer}
                  onChange={(e) =>
                    setForm({ ...form, maxDailyMessagesPerCustomer: Number(e.target.value) })
                  }
                  className="w-full h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#061533] text-[#071A35] dark:text-white tabular-nums"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">
                  {tr(language, 'Min Confidence for Auto (%)', 'ऑटो के लिए न्यूनतम भरोसा (%)')}
                </label>
                <input
                  type="number"
                  min={50}
                  max={99}
                  value={form.minConfidenceForAutonomous}
                  onChange={(e) =>
                    setForm({ ...form, minConfidenceForAutonomous: Number(e.target.value) })
                  }
                  className="w-full h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#061533] text-[#071A35] dark:text-white tabular-nums"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">
                  {tr(language, 'Max Auto Discount (%)', 'अधिकतम ऑटो छूट (%)')}
                </label>
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={form.maxAutonomousDiscountPct}
                  onChange={(e) =>
                    setForm({ ...form, maxAutonomousDiscountPct: Number(e.target.value) })
                  }
                  className="w-full h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#061533] text-[#071A35] dark:text-white tabular-nums"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">
                  {tr(language, 'Daily Offer Cap (₹)', 'दैनिक ऑफ़र सीमा (₹)')}
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.dailySpendCapInr}
                  onChange={(e) => setForm({ ...form, dailySpendCapInr: Number(e.target.value) })}
                  className="w-full h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#061533] text-[#071A35] dark:text-white tabular-nums"
                />
              </div>
            </div>
          </div>

          <button
            disabled={saving}
            onClick={() => handleSave()}
            className="w-full h-10 rounded-xl bg-[#2563EB] hover:bg-[#071A35] text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>
              {saving
                ? tr(language, 'Saving...', 'सेव हो रहा है...')
                : tr(language, 'Save Safety Settings', 'सुरक्षा सेटिंग्स सेव करें')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
