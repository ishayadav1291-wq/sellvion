import React, { useState } from 'react';
import {
  Shield,
  ShieldAlert,
  Sliders,
  Clock,
  Sparkles,
  AlertOctagon,
  Check,
  Lock,
  X,
  Settings,
} from 'lucide-react';
import { AutonomyPolicyConfig, AutonomyLevel } from '../types';

interface AutonomySettingsProps {
  config: AutonomyPolicyConfig;
  onUpdateConfig: (newConfig: AutonomyPolicyConfig) => void;
}

export const AutonomySettings: React.FC<AutonomySettingsProps> = ({
  config,
  onUpdateConfig,
}) => {
  const [localConfig, setLocalConfig] = useState<AutonomyPolicyConfig>(config);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [activeRuleModal, setActiveRuleModal] = useState<string | null>(null);

  const handleLevelChange = (
    actionKey: 'reorderReminders' | 'codPrepayNudges' | 'udhaarReminders' | 'winbackOffers',
    level: AutonomyLevel
  ) => {
    const updated = { ...localConfig, [actionKey]: level };
    setLocalConfig(updated);
    onUpdateConfig(updated);
  };

  const handleToggleEmergencyPause = () => {
    const updated = { ...localConfig, emergencyPauseAll: !localConfig.emergencyPauseAll };
    setLocalConfig(updated);
    onUpdateConfig(updated);
  };

  const handleSave = () => {
    onUpdateConfig(localConfig);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Title & Introduction */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#64748B] dark:text-[#94A3B8] mb-1">
            <span>Safety & Governance</span>
            <span>·</span>
            <span className="font-semibold text-[#0284C7] dark:text-[#38BDF8]">FR-016 & FR-017 Policy Engine</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
            Earned Autonomy Controls
          </h2>
          <p className="text-sm text-[#475569] dark:text-[#94A3B8] mt-0.5">
            SELLVION does not run rogue. Autonomy is earned through your approvals and bounded by strict limits.
          </p>
        </div>

        {/* Emergency Kill Switch */}
        <button
          onClick={handleToggleEmergencyPause}
          className={`px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors shadow-xs cursor-pointer ${
            localConfig.emergencyPauseAll
              ? 'bg-[#DC2626] text-white hover:bg-[#B91C1C]'
              : 'bg-[#F8FAFC] dark:bg-[#132238] text-[#DC2626] dark:text-[#F87171] border border-[#FECACA] dark:border-[#522020] hover:bg-[#FEE2E2] dark:hover:bg-[#2C1818]'
          }`}
        >
          <AlertOctagon className="w-4 h-4" />
          <span>
            {localConfig.emergencyPauseAll
              ? 'EMERGENCY PAUSE ACTIVE (Click to Resume)'
              : 'Emergency Pause All Automation'}
          </span>
        </button>
      </div>

      {localConfig.emergencyPauseAll && (
        <div className="p-4 bg-[#FEE2E2] dark:bg-[#2C1818] border border-[#FECACA] dark:border-[#522020] rounded-xl text-xs text-[#991B1B] dark:text-[#F87171] flex items-center gap-2">
          <AlertOctagon className="w-5 h-5 shrink-0" />
          <span>
            All autonomous external dispatches are currently paused. All actions require manual merchant sign-off in the Approval Inbox.
          </span>
        </div>
      )}

      {/* Action Autonomy Matrix */}
      <div className="bg-white dark:bg-[#132238] rounded-2xl border border-[#E2E8F0] dark:border-[#1E3A5F] p-6 shadow-xs space-y-6 transition-colors">
        <div>
          <h3 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
            Autonomy Stage by Action Type
          </h3>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
            Configure how much independence each specialized agent operates with.
          </p>
        </div>

        <div className="space-y-4">
          {[
            {
              key: 'reorderReminders',
              title: 'Predictive Reorder Reminders',
              description: 'WhatsApp replenishment nudges sent to regular repeat buyers near their cadence window.',
              current: localConfig.reorderReminders,
            },
            {
              key: 'codPrepayNudges',
              title: 'COD Prepayment Incentives',
              description: 'Instant ₹50-₹100 UPI discount links sent to high-risk first-time COD buyers to prevent RTO.',
              current: localConfig.codPrepayNudges,
            },
            {
              key: 'udhaarReminders',
              title: 'Udhaar / Khata Collections',
              description: 'Polite reminder messages with payment links for balances overdue by >5 days.',
              current: localConfig.udhaarReminders,
            },
            {
              key: 'winbackOffers',
              title: 'Lapsed VIP Win-Back Offers',
              description: 'Special seasonal offers for customers inactive for 2x their normal cadence.',
              current: localConfig.winbackOffers,
            },
          ].map((item) => (
            <div
              key={item.key}
              className="p-4 rounded-xl border border-[#E2E8F0] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#0F1A2C] flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors"
            >
              <div className="max-w-md">
                <div className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">{item.title}</div>
                <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">{item.description}</div>
              </div>

              {/* 3-State Segmented Control */}
              <div className="flex items-center p-1 bg-[#E2E8F0] dark:bg-[#0B1320] rounded-xl text-xs shrink-0 border border-[#CBD5E1] dark:border-[#1E3A5F]">
                {[
                  { id: 'recommendation_only', label: 'Manual Only' },
                  { id: 'approval_required', label: 'Approval Required' },
                  { id: 'bounded_autonomous', label: 'Autonomous' },
                ].map((st) => {
                  const isSelected = item.current === st.id;
                  return (
                    <button
                      key={st.id}
                      onClick={() => handleLevelChange(item.key as any, st.id as any)}
                      className={`px-3 py-1.5 font-medium rounded-lg transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-white dark:bg-[#0284C7] text-[#0284C7] dark:text-white shadow-xs font-semibold'
                          : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]'
                      }`}
                    >
                      {st.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Safety Policy Guardrails with Clickable Config Modals */}
      <div className="bg-white dark:bg-[#132238] rounded-2xl border border-[#E2E8F0] dark:border-[#1E3A5F] p-6 shadow-xs space-y-6 transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              Safety Guardrails & Regulatory Limits
            </h3>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
              Click any policy rule below to customize thresholds dynamically.
            </p>
          </div>
          <span className="text-[11px] text-[#0284C7] dark:text-[#38BDF8] font-semibold">
            Click Card to Edit
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div
            onClick={() => setActiveRuleModal('quiet_hours')}
            className="p-4 rounded-xl border border-[#E2E8F0] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#0F1A2C] transition-all hover:border-[#0284C7] cursor-pointer group"
          >
            <div className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1 group-hover:text-[#0284C7]">
              Quiet Hours Policy
            </div>
            <div className="text-[#64748B] dark:text-[#94A3B8] mb-3">
              No WhatsApp messages dispatched outside daytime hours (IST).
            </div>
            <div className="font-mono text-sm font-bold text-[#0284C7] dark:text-[#38BDF8]">
              {localConfig.quietHoursStart} – {localConfig.quietHoursEnd} IST
            </div>
          </div>

          <div
            onClick={() => setActiveRuleModal('frequency_cap')}
            className="p-4 rounded-xl border border-[#E2E8F0] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#0F1A2C] transition-all hover:border-[#0284C7] cursor-pointer group"
          >
            <div className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1 group-hover:text-[#0284C7]">
              Message Frequency Cap
            </div>
            <div className="text-[#64748B] dark:text-[#94A3B8] mb-3">
              Max dispatches per individual buyer in any 48-hour window.
            </div>
            <div className="font-mono text-sm font-bold text-[#0284C7] dark:text-[#38BDF8]">
              {localConfig.maxDailyMessagesPerCustomer} Message / 48 Hours
            </div>
          </div>

          <div
            onClick={() => setActiveRuleModal('min_confidence')}
            className="p-4 rounded-xl border border-[#E2E8F0] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#0F1A2C] transition-all hover:border-[#0284C7] cursor-pointer group"
          >
            <div className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1 group-hover:text-[#0284C7]">
              Min Confidence Gate
            </div>
            <div className="text-[#64748B] dark:text-[#94A3B8] mb-3">
              Autonomous execution threshold required from AI models.
            </div>
            <div className="font-mono text-sm font-bold text-[#0284C7] dark:text-[#38BDF8]">
              {localConfig.minConfidenceForAutonomous}% Confidence
            </div>
          </div>

          <div
            onClick={() => setActiveRuleModal('max_discount')}
            className="p-4 rounded-xl border border-[#E2E8F0] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#0F1A2C] transition-all hover:border-[#0284C7] cursor-pointer group"
          >
            <div className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1 group-hover:text-[#0284C7]">
              Max Autonomous Discount
            </div>
            <div className="text-[#64748B] dark:text-[#94A3B8] mb-3">
              Capped discount rate for prepay incentives or VIP win-back.
            </div>
            <div className="font-mono text-sm font-bold text-[#0284C7] dark:text-[#38BDF8]">
              {localConfig.maxAutonomousDiscountPct}% Max Rate
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleSave}
            className="px-5 py-2 text-xs font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-xl transition-colors shadow-sm shadow-[#0284C7]/20 flex items-center gap-1.5 cursor-pointer"
          >
            {saveSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#BAE6FD]" />
                <span>Saved & Synchronized</span>
              </>
            ) : (
              <span>Save Policy Settings</span>
            )}
          </button>
        </div>
      </div>

      {/* Dynamic Rule Configurator Modal */}
      {activeRuleModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#132238] rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-[#BAE6FD] dark:border-[#1E3A5F] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#1E3A5F]">
              <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#0284C7] dark:text-[#38BDF8]" />
                <span>Configure Safety Rule</span>
              </h3>
              <button
                onClick={() => setActiveRuleModal(null)}
                className="p-1.5 text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {activeRuleModal === 'quiet_hours' && (
              <div className="space-y-3 text-xs">
                <p className="text-[#64748B] dark:text-[#94A3B8]">
                  Select the start and end of quiet hours (IST) when dispatches are paused.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-[#475569] dark:text-[#CBD5E1] block mb-1">Start Time</label>
                    <input
                      type="text"
                      value={localConfig.quietHoursStart}
                      onChange={(e) => setLocalConfig({ ...localConfig, quietHoursStart: e.target.value })}
                      className="w-full p-2 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#0F1A2C] font-mono text-[#0F172A] dark:text-[#F8FAFC]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#475569] dark:text-[#CBD5E1] block mb-1">End Time</label>
                    <input
                      type="text"
                      value={localConfig.quietHoursEnd}
                      onChange={(e) => setLocalConfig({ ...localConfig, quietHoursEnd: e.target.value })}
                      className="w-full p-2 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#0F1A2C] font-mono text-[#0F172A] dark:text-[#F8FAFC]"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeRuleModal === 'min_confidence' && (
              <div className="space-y-3 text-xs">
                <p className="text-[#64748B] dark:text-[#94A3B8]">
                  Minimum model certainty required before any autonomous dispatch is authorized.
                </p>
                <div>
                  <div className="flex justify-between font-mono font-bold text-[#0284C7] mb-1">
                    <span>Threshold</span>
                    <span>{localConfig.minConfidenceForAutonomous}%</span>
                  </div>
                  <input
                    type="range"
                    min="70"
                    max="98"
                    value={localConfig.minConfidenceForAutonomous}
                    onChange={(e) => setLocalConfig({ ...localConfig, minConfidenceForAutonomous: Number(e.target.value) })}
                    className="w-full accent-[#0284C7]"
                  />
                </div>
              </div>
            )}

            {activeRuleModal === 'max_discount' && (
              <div className="space-y-3 text-xs">
                <p className="text-[#64748B] dark:text-[#94A3B8]">
                  Maximum automated discount percentage allowed for prepayment incentives.
                </p>
                <div>
                  <div className="flex justify-between font-mono font-bold text-[#0284C7] mb-1">
                    <span>Discount Cap</span>
                    <span>{localConfig.maxAutonomousDiscountPct}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="25"
                    value={localConfig.maxAutonomousDiscountPct}
                    onChange={(e) => setLocalConfig({ ...localConfig, maxAutonomousDiscountPct: Number(e.target.value) })}
                    className="w-full accent-[#0284C7]"
                  />
                </div>
              </div>
            )}

            {activeRuleModal === 'frequency_cap' && (
              <div className="space-y-3 text-xs">
                <p className="text-[#64748B] dark:text-[#94A3B8]">
                  Maximum frequency of automated WhatsApp touches per 48-hour customer window.
                </p>
                <select
                  value={localConfig.maxDailyMessagesPerCustomer}
                  onChange={(e) => setLocalConfig({ ...localConfig, maxDailyMessagesPerCustomer: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#0F1A2C] text-[#0F172A] dark:text-[#F8FAFC]"
                >
                  <option value={1}>1 Message / 48h (Recommended)</option>
                  <option value={2}>2 Messages / 48h</option>
                  <option value={3}>3 Messages / 48h (High Frequency)</option>
                </select>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8F0] dark:border-[#1E3A5F]">
              <button
                onClick={() => {
                  onUpdateConfig(localConfig);
                  setActiveRuleModal(null);
                }}
                className="px-4 py-2 bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-semibold rounded-xl cursor-pointer"
              >
                Apply & Save Rule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
