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
          <div className="flex items-center gap-2 text-xs text-[#555C57] dark:text-[#9DA49F] mb-1">
            <span>Safety & Governance</span>
            <span>·</span>
            <span className="font-semibold text-[#0F2E22] dark:text-[#34D399]">FR-016 & FR-017 Policy Engine</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-[#141B18] dark:text-[#F0F3F1]">
            Earned Autonomy Controls
          </h2>
          <p className="text-sm text-[#555C57] dark:text-[#9DA49F] mt-0.5">
            SELLVION does not run rogue. Autonomy is earned through your approvals and bounded by strict limits.
          </p>
        </div>

        {/* Emergency Kill Switch */}
        <button
          onClick={handleToggleEmergencyPause}
          className={`px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors shadow-xs ${
            localConfig.emergencyPauseAll
              ? 'bg-[#DC2626] text-white hover:bg-[#B91C1C]'
              : 'bg-[#FAF9F5] dark:bg-[#1A221E] text-[#991B1B] dark:text-[#F87171] border border-[#FECACA] dark:border-[#522020] hover:bg-[#FEE2E2] dark:hover:bg-[#2C1818]'
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
      <div className="bg-white dark:bg-[#161C19] rounded-2xl border border-[#EAE8E1] dark:border-[#232B26] p-6 shadow-xs space-y-6 transition-colors">
        <div>
          <h3 className="text-base font-bold text-[#141B18] dark:text-[#F0F3F1]">
            Autonomy Stage by Action Type
          </h3>
          <p className="text-xs text-[#6B726C] dark:text-[#8C948F] mt-0.5">
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
              className="p-4 rounded-xl border border-[#EAE8E1] dark:border-[#232B26] bg-[#FAF9F5] dark:bg-[#1A221E] flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors"
            >
              <div className="max-w-md">
                <div className="text-xs font-bold text-[#141B18] dark:text-[#F0F3F1]">{item.title}</div>
                <div className="text-[11px] text-[#555C57] dark:text-[#9DA49F] mt-0.5">{item.description}</div>
              </div>

              {/* 3-State Segmented Control */}
              <div className="flex items-center p-1 bg-[#E8E5DC] dark:bg-[#121815] rounded-xl text-xs shrink-0">
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
                      className={`px-3 py-1.5 font-medium rounded-lg transition-all ${
                        isSelected
                          ? 'bg-white dark:bg-[#25322A] text-[#0F2E22] dark:text-[#E8F5E9] shadow-xs font-semibold'
                          : 'text-[#616862] dark:text-[#9DA49F] hover:text-[#141B18] dark:hover:text-[#F0F3F1]'
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

      {/* Safety Policy Guardrails */}
      <div className="bg-white dark:bg-[#161C19] rounded-2xl border border-[#EAE8E1] dark:border-[#232B26] p-6 shadow-xs space-y-6 transition-colors">
        <div>
          <h3 className="text-base font-bold text-[#141B18] dark:text-[#F0F3F1]">
            Safety Guardrails & Regulatory Limits
          </h3>
          <p className="text-xs text-[#6B726C] dark:text-[#8C948F] mt-0.5">
            Strict policy rules enforced by the Policy/Safety Engine before any message can leave the platform.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-xl border border-[#EAE8E1] dark:border-[#232B26] bg-[#FAF9F5] dark:bg-[#1A221E] transition-colors">
            <div className="font-semibold text-[#141B18] dark:text-[#F0F3F1] mb-1">Quiet Hours Policy</div>
            <div className="text-[#555C57] dark:text-[#9DA49F] mb-3">
              No WhatsApp messages will be dispatched between these hours (IST).
            </div>
            <div className="font-mono text-sm font-bold text-[#0F2E22] dark:text-[#34D399]">
              21:00 – 09:00 IST
            </div>
          </div>

          <div className="p-4 rounded-xl border border-[#EAE8E1] dark:border-[#232B26] bg-[#FAF9F5] dark:bg-[#1A221E] transition-colors">
            <div className="font-semibold text-[#141B18] dark:text-[#F0F3F1] mb-1">Message Frequency Cap</div>
            <div className="text-[#555C57] dark:text-[#9DA49F] mb-3">
              Max messages any single customer can receive from SELLVION in 48 hours.
            </div>
            <div className="font-mono text-sm font-bold text-[#0F2E22] dark:text-[#34D399]">
              1 Message / 48 Hours
            </div>
          </div>

          <div className="p-4 rounded-xl border border-[#EAE8E1] dark:border-[#232B26] bg-[#FAF9F5] dark:bg-[#1A221E] transition-colors">
            <div className="font-semibold text-[#141B18] dark:text-[#F0F3F1] mb-1">Min Confidence Gate</div>
            <div className="text-[#555C57] dark:text-[#9DA49F] mb-3">
              Autonomous execution requires minimum AI model certainty.
            </div>
            <div className="font-mono text-sm font-bold text-[#0F2E22] dark:text-[#34D399]">
              85% Confidence
            </div>
          </div>

          <div className="p-4 rounded-xl border border-[#EAE8E1] dark:border-[#232B26] bg-[#FAF9F5] dark:bg-[#1A221E] transition-colors">
            <div className="font-semibold text-[#141B18] dark:text-[#F0F3F1] mb-1">Max Autonomous Discount</div>
            <div className="text-[#555C57] dark:text-[#9DA49F] mb-3">
              Capped discount rate for prepay incentives or VIP win-back.
            </div>
            <div className="font-mono text-sm font-bold text-[#0F2E22] dark:text-[#34D399]">
              10% or ₹100 Max
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleSave}
            className="px-5 py-2 text-xs font-semibold text-white bg-[#0F2E22] dark:bg-[#1E4D3B] hover:bg-[#1A4535] dark:hover:bg-[#28634C] rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
          >
            {saveSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#34D399]" />
                <span>Saved & Synchronized</span>
              </>
            ) : (
              <span>Save Policy Settings</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
