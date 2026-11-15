import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  Inbox,
  Users,
  ShoppingBag,
  ShieldAlert,
  IndianRupee,
  Bot,
  BarChart3,
  Settings,
  X,
  Mic,
  MicOff,
  Bell,
  LogOut,
  Check,
  Sparkles,
  Sliders,
  Link2,
  Upload,
  Store,
  ScrollText,
} from 'lucide-react';
import {
  AgentSummary,
  AnalyticsSummaryResponse,
  AppLanguage,
  AppMode,
  ApprovalRecord,
  AuditLogRecord,
  AuthSessionResponse,
  AutonomyPolicyConfig,
  ConsoleTabId,
  CustomerRecord,
  IntegrationStatusView,
  OrderRecord,
  PaymentRecord,
  SettingsSubTabId,
  UdhaarRecord,
  VoiceIntentResult,
  WorkflowRecord,
} from '../../types';
import { localizeActorType, localizeAuditAction, t, tr } from '../../i18n/translations';
import { apiRequest } from '../../lib/api';
import { MerchantDashboard } from './MerchantDashboard';
import { ApprovalInbox } from '../ApprovalInbox';
import { Customer360 } from '../Customer360';
import { OrdersView } from './OrdersView';
import { CodRiskScorer } from '../CodRiskScorer';
import { UdhaarLedger } from '../UdhaarLedger';
import { AgentsWorkspace } from './AgentsWorkspace';
import { AutonomySettings } from '../AutonomySettings';
import { IntegrationsHub } from './IntegrationsHub';
import { CsvImportWizard } from './CsvImportWizard';
import { MetricsAndLift } from '../MetricsAndLift';

interface MerchantWorkspaceProps {
  isOpen: boolean;
  activeTab: ConsoleTabId;
  onChangeTab: (tab: ConsoleTabId) => void;
  onClose: () => void;
  appMode: AppMode;
  isAuthenticated: boolean;
  businessName: string;
  businessInfo?: AuthSessionResponse['business'];
  language: AppLanguage;
  onChangeLanguage: (lang: AppLanguage) => void;
  customers: CustomerRecord[];
  orders: OrderRecord[];
  udhaarRecords: UdhaarRecord[];
  payments: PaymentRecord[];
  approvals: ApprovalRecord[];
  agents: AgentSummary[];
  workflows: WorkflowRecord[];
  integrations: IntegrationStatusView[];
  analytics: AnalyticsSummaryResponse | null;
  auditLogs: AuditLogRecord[];
  autonomyConfig: AutonomyPolicyConfig;
  range: '7d' | '30d' | '90d' | 'all';
  onChangeRange: (r: '7d' | '30d' | '90d' | 'all') => void;
  onUpdateAutonomy: (cfg: AutonomyPolicyConfig) => void;
  onRefreshAll: () => void;
  onNotify: (msg: string) => void;
  onResetDemo: () => void;
  onLogout: () => void;
  onOpenAuth: (mode: 'login' | 'signup') => void;
  onOpenCopilot: () => void;
}

export const MerchantWorkspace: React.FC<MerchantWorkspaceProps> = ({
  isOpen,
  activeTab,
  onChangeTab,
  onClose,
  appMode,
  isAuthenticated,
  businessName,
  businessInfo,
  language,
  onChangeLanguage,
  customers,
  orders,
  udhaarRecords,
  payments,
  approvals,
  agents,
  workflows,
  integrations,
  analytics,
  auditLogs,
  autonomyConfig,
  range,
  onChangeRange,
  onUpdateAutonomy,
  onRefreshAll,
  onNotify,
  onResetDemo,
  onLogout,
  onOpenAuth,
  onOpenCopilot,
}) => {
  const [voiceInput, setVoiceInput] = useState('');
  const [listening, setListening] = useState(false);
  const [pendingVoiceConfirm, setPendingVoiceConfirm] = useState<VoiceIntentResult | null>(null);
  const [settingsSubTab, setSettingsSubTab] = useState<SettingsSubTabId>('autonomy');
  const [deepLinkCustomerId, setDeepLinkCustomerId] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const [profileName, setProfileName] = useState(businessName);
  const [profileCategory, setProfileCategory] = useState(businessInfo?.category || 'Retail & D2C');
  const [profileCity, setProfileCity] = useState(businessInfo?.city || '');
  const [profileState, setProfileState] = useState(businessInfo?.state || '');
  const [profileUrl, setProfileUrl] = useState(businessInfo?.store_url || '');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    setProfileName(businessInfo?.name || businessName);
    setProfileCategory(businessInfo?.category || 'Retail & D2C');
    setProfileCity(businessInfo?.city || '');
    setProfileState(businessInfo?.state || '');
    setProfileUrl(businessInfo?.store_url || '');
  }, [businessInfo, businessName]);

  useEffect(() => {
    if (activeTab === 'autonomy') {
      setSettingsSubTab('autonomy');
    } else if (activeTab === 'integrations') {
      setSettingsSubTab('integrations');
    } else if (activeTab === 'import') {
      setSettingsSubTab('import');
    }
  }, [activeTab]);

  useEffect(() => {
    if (!pendingVoiceConfirm) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPendingVoiceConfirm(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pendingVoiceConfirm]);

  if (!isOpen) return null;

  const effectiveTab: ConsoleTabId =
    activeTab === 'autonomy' || activeTab === 'integrations' || activeTab === 'import'
      ? 'settings'
      : activeTab;

  const pendingApprovals = approvals.filter((a) => a.status === 'pending_approval').length;

  const navItems: Array<{
    id: ConsoleTabId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }> = [
    { id: 'dashboard', label: t(language, 'tabDashboard'), icon: LayoutDashboard },
    { id: 'customers', label: t(language, 'tabCustomers'), icon: Users },
    { id: 'orders', label: t(language, 'tabOrders'), icon: ShoppingBag },
    { id: 'cod-risk', label: t(language, 'tabCod'), icon: ShieldAlert },
    { id: 'udhaar', label: t(language, 'tabUdhaar'), icon: IndianRupee },
    { id: 'agents', label: t(language, 'tabAgents'), icon: Bot },
    { id: 'inbox', label: t(language, 'tabInbox'), icon: Inbox, badge: pendingApprovals },
    { id: 'analytics', label: t(language, 'tabAnalytics'), icon: BarChart3 },
    { id: 'settings', label: t(language, 'tabSettings'), icon: Settings },
  ];

  const handleVoiceSubmit = async (transcriptText?: string) => {
    const query = (transcriptText ?? voiceInput).trim();
    if (!query) return;
    try {
      const parsed = await apiRequest<VoiceIntentResult>('/api/ai/parse-voice-command', {
        method: 'POST',
        body: JSON.stringify({ transcript: query }),
      });
      if (parsed.requiresConfirmation && parsed.suggestedWorkflow) {
        setPendingVoiceConfirm(parsed);
      } else {
        onChangeTab(parsed.targetTab);
        onNotify(parsed.summary);
      }
    } catch {
      onNotify(
        tr(language, 'Could not interpret voice command.', 'वॉइस कमांड समझ नहीं आया।')
      );
    }
  };

  const toggleMicrophone = () => {
    const SpeechRec =
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (!SpeechRec) {
      onNotify(
        tr(
          language,
          'Browser speech input unavailable — type your command in the box instead.',
          'ब्राउज़र माइक उपलब्ध नहीं है — कृपया बॉक्स में कमांड टाइप करें।'
        )
      );
      return;
    }

    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }

    const rec = new SpeechRec();
    rec.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
    rec.interimResults = false;
    rec.onresult = (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => {
      const spoken = event.results[0]?.[0]?.transcript || '';
      setVoiceInput(spoken);
      setListening(false);
      handleVoiceSubmit(spoken);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  };

  const confirmVoiceAction = async () => {
    if (!pendingVoiceConfirm?.suggestedWorkflow) {
      setPendingVoiceConfirm(null);
      return;
    }
    try {
      const res = await apiRequest<{ message: string }>('/api/workflows/run', {
        method: 'POST',
        body: JSON.stringify({ workflowType: pendingVoiceConfirm.suggestedWorkflow }),
      });
      onNotify(res.message);
      onRefreshAll();
      onChangeTab('inbox');
    } catch (err: unknown) {
      onNotify(err instanceof Error ? err.message : tr(language, 'Action failed.', 'कार्य विफल रहा।'));
    } finally {
      setPendingVoiceConfirm(null);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      onNotify(
        tr(
          language,
          'Create or sign in to a Live Store account to edit store profile.',
          'दुकान प्रोफ़ाइल बदलने के लिए लाइव स्टोर खाते में लॉगिन करें।'
        )
      );
      return;
    }
    setSavingProfile(true);
    try {
      await apiRequest('/api/business/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          name: profileName,
          category: profileCategory,
          city: profileCity,
          state: profileState,
          storeUrl: profileUrl,
        }),
      });
      onNotify(tr(language, 'Store profile saved.', 'दुकान प्रोफ़ाइल सहेजी गई।'));
      onRefreshAll();
    } catch (err: unknown) {
      onNotify(
        err instanceof Error
          ? err.message
          : tr(language, 'Could not update store profile.', 'दुकान प्रोफ़ाइल अपडेट नहीं हो सकी।')
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleExportCsv = (type: 'customers' | 'orders' | 'audit') => {
    window.location.href = `/api/analytics/export?type=${type}`;
  };

  const handleDownloadBackup = async () => {
    try {
      const payload = await apiRequest<Record<string, unknown>>('/api/business/backup');
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sellvion-backup-${appMode}-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      onNotify(tr(language, 'Store JSON backup downloaded.', 'दुकान का JSON बैकअप डाउनलोड हो गया।'));
    } catch (err: unknown) {
      onNotify(
        err instanceof Error
          ? err.message
          : tr(language, 'Backup download failed.', 'बैकअप डाउनलोड विफल रहा।')
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 flex items-center justify-center p-0 sm:p-4">
      <div className="bg-[#F8FAFC] dark:bg-[#061533] w-full max-w-[1440px] h-full sm:h-[94vh] sm:rounded-2xl shadow-2xl border border-[#CBD5E1] dark:border-[#1E3A5F] flex flex-col overflow-hidden">
        {/* Top Workspace Bar */}
        <header className="px-4 sm:px-6 h-16 border-b border-[#E2E8F0] dark:border-[#1E3A5F] bg-white dark:bg-[#071A35] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#2563EB] text-white flex items-center justify-center font-extrabold text-sm shrink-0">
              S
            </div>
            <div className="min-w-0">
              <div className="font-display font-extrabold text-sm text-[#071A35] dark:text-white truncate">
                {businessName}
              </div>
              <div className="text-[11px] font-semibold text-[#64748B] dark:text-[#94A3B8] truncate">
                {appMode === 'demo'
                  ? tr(language, 'Demo Mode (Sample Store)', 'डेमो मोड (नमूना स्टोर)')
                  : tr(language, 'Live Mode (Your Store)', 'लाइव मोड (आपकी दुकान)')}
              </div>
            </div>
          </div>

          {/* Voice + Natural Language Command Omnibar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVoiceSubmit();
            }}
            className="hidden md:flex items-center gap-1.5 flex-1 max-w-lg"
          >
            <button
              type="button"
              onClick={toggleMicrophone}
              aria-label={tr(language, 'Speak command', 'वॉइस कमांड बोलें')}
              className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 cursor-pointer border ${
                listening
                  ? 'bg-[#DC2626] border-[#DC2626] text-white'
                  : 'bg-[#F8FAFC] dark:bg-[#061533] border-[#CBD5E1] dark:border-[#1E3A5F] text-[#2563EB] dark:text-[#22D3EE]'
              }`}
            >
              {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <input
              value={voiceInput}
              onChange={(e) => setVoiceInput(e.target.value)}
              placeholder={listening ? t(language, 'voiceListening') : t(language, 'voicePlaceholder')}
              className="flex-1 h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#061533] text-xs text-[#071A35] dark:text-white"
            />
            <button
              type="submit"
              className="h-9 px-3 rounded-lg bg-[#2563EB] hover:bg-[#071A35] text-white text-xs font-bold shrink-0 cursor-pointer"
            >
              {tr(language, 'Run', 'चलाएं')}
            </button>
          </form>

          {/* Right Utility Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <select
              aria-label={tr(language, 'Workspace language', 'वर्कस्पेस भाषा')}
              value={language}
              onChange={(e) => onChangeLanguage(e.target.value as AppLanguage)}
              className="h-9 px-2.5 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#061533] text-xs font-bold text-[#071A35] dark:text-white cursor-pointer"
            >
              <option value="en">EN</option>
              <option value="hi">HI</option>
            </select>

            <button
              onClick={onOpenCopilot}
              className="h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] hover:border-[#2563EB] text-xs font-bold text-[#071A35] dark:text-white flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#22D3EE]" />
              <span className="hidden sm:inline">{tr(language, 'Ask AI', 'AI से पूछें')}</span>
            </button>

            <button
              onClick={() => onChangeTab('inbox')}
              aria-label={tr(language, 'Pending approvals', 'बाकी मंजूरी')}
              className="h-9 px-2.5 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] text-xs font-bold text-[#071A35] dark:text-white flex items-center gap-1.5 cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#22D3EE]" />
              <span className="tabular-nums">{pendingApprovals}</span>
            </button>

            {isAuthenticated ? (
              <button
                onClick={onLogout}
                title={tr(language, 'Sign out to Demo Mode', 'डेमो मोड में वापस जाएं')}
                className="h-9 px-2.5 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] text-xs font-semibold text-[#071A35] dark:text-white flex items-center gap-1 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tr(language, 'Logout', 'लॉगआउट')}</span>
              </button>
            ) : (
              <button
                onClick={() => onOpenAuth('signup')}
                className="h-9 px-3 rounded-lg bg-[#071A35] dark:bg-[#2563EB] text-white text-xs font-bold cursor-pointer whitespace-nowrap"
              >
                {tr(language, 'Go Live', 'लाइव जाएं')}
              </button>
            )}

            <button
              onClick={onClose}
              aria-label={tr(language, 'Close workspace', 'वर्कस्पेस बंद करें')}
              className="h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] text-xs font-bold text-[#071A35] dark:text-white flex items-center gap-1 cursor-pointer hover:bg-[#F8FAFC] dark:hover:bg-[#0B1E40]"
            >
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">{tr(language, 'Site', 'वेबसाइट')}</span>
            </button>
          </div>
        </header>

        {/* Body Layout: Compact Left Rail + Grid-Lines Main Content */}
        <div className="flex-1 flex overflow-hidden">
          <aside className="hidden md:flex w-56 border-r border-[#E2E8F0] dark:border-[#1E3A5F] bg-white dark:bg-[#0B1E40] flex-col p-3 gap-1 overflow-y-auto shrink-0">
            {navItems.map((item) => {
              const active = effectiveTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onChangeTab(item.id)}
                  className={`w-full h-10 px-3 rounded-xl text-xs font-bold flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#2563EB] text-white'
                      : 'text-[#475569] dark:text-[#CBD5E1] hover:bg-[#F8FAFC] dark:hover:bg-[#061533]'
                  }`}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] tabular-nums ${
                        active ? 'bg-white/20 text-white' : 'bg-[#2563EB] text-white'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </aside>

          {/* Mobile Horizontal Tab Strip + Main Canvas (Preserved Grid Lines Background) */}
          <div className="flex-1 flex flex-col overflow-hidden bg-spatial-grid">
            <div className="md:hidden flex items-center gap-1.5 px-3 py-2 border-b border-[#E2E8F0] dark:border-[#1E3A5F] bg-white dark:bg-[#0B1E40] overflow-x-auto shrink-0">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onChangeTab(item.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
                    effectiveTab === item.id
                      ? 'bg-[#2563EB] text-white'
                      : 'bg-[#F8FAFC] dark:bg-[#061533] text-[#475569] dark:text-[#CBD5E1]'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="px-1 py-0.2 rounded bg-black/20 text-[10px] tabular-nums">
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {effectiveTab === 'dashboard' && (
                <MerchantDashboard
                  language={language}
                  analytics={analytics}
                  customers={customers}
                  orders={orders}
                  approvals={approvals}
                  workflows={workflows}
                  appMode={appMode}
                  range={range}
                  onChangeRange={onChangeRange}
                  onNavigateTab={onChangeTab}
                  onResetDemo={onResetDemo}
                  onRefresh={onRefreshAll}
                  onNotify={onNotify}
                />
              )}

              {effectiveTab === 'customers' && (
                <Customer360
                  language={language}
                  customers={customers}
                  onRefresh={onRefreshAll}
                  onNotify={onNotify}
                  onOpenInbox={() => onChangeTab('inbox')}
                  onNavigateTab={onChangeTab}
                  initialCustomerId={deepLinkCustomerId}
                  onClearInitialCustomer={() => setDeepLinkCustomerId(null)}
                />
              )}

              {effectiveTab === 'orders' && (
                <OrdersView
                  language={language}
                  orders={orders}
                  customers={customers}
                  onRefresh={onRefreshAll}
                  onNotify={onNotify}
                  onNavigateTab={onChangeTab}
                />
              )}

              {effectiveTab === 'cod-risk' && (
                <CodRiskScorer
                  language={language}
                  orders={orders}
                  onRefresh={onRefreshAll}
                  onNotify={onNotify}
                />
              )}

              {effectiveTab === 'udhaar' && (
                <UdhaarLedger
                  language={language}
                  customers={customers}
                  records={udhaarRecords}
                  payments={payments}
                  onRefresh={onRefreshAll}
                  onNotify={onNotify}
                  onOpenInbox={() => onChangeTab('inbox')}
                  onViewCustomer={(custId) => {
                    setDeepLinkCustomerId(custId);
                    onChangeTab('customers');
                  }}
                />
              )}

              {effectiveTab === 'agents' && (
                <AgentsWorkspace
                  language={language}
                  agents={agents}
                  workflows={workflows}
                  onRefresh={onRefreshAll}
                  onNotify={onNotify}
                  onNavigateTab={onChangeTab}
                />
              )}

              {effectiveTab === 'inbox' && (
                <ApprovalInbox
                  language={language}
                  approvals={approvals}
                  appMode={appMode}
                  onRefresh={onRefreshAll}
                  onNotify={onNotify}
                />
              )}

              {effectiveTab === 'analytics' && (
                <MetricsAndLift
                  language={language}
                  analytics={analytics}
                  showExport
                  onExportCsv={handleExportCsv}
                  onNavigateTab={onChangeTab}
                />
              )}

              {effectiveTab === 'settings' && (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-[#0B1E40] border border-[#E2E8F0] dark:border-[#1E3A5F] rounded-2xl p-3 text-xs">
                    {(
                      [
                        { id: 'autonomy', label: t(language, 'tabAutonomy'), icon: Sliders },
                        { id: 'integrations', label: t(language, 'tabIntegrations'), icon: Link2 },
                        { id: 'import', label: t(language, 'tabImport'), icon: Upload },
                        { id: 'profile', label: tr(language, 'Store Profile', 'दुकान प्रोफ़ाइल'), icon: Store },
                        { id: 'audit', label: tr(language, 'Activity Log', 'गतिविधि लॉग'), icon: ScrollText },
                      ] as const
                    ).map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => setSettingsSubTab(sub.id)}
                        className={`h-9 px-3.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                          settingsSubTab === sub.id
                            ? 'bg-[#071A35] dark:bg-[#2563EB] text-white'
                            : 'bg-[#F8FAFC] dark:bg-[#061533] text-[#475569] dark:text-[#CBD5E1] hover:text-[#071A35] dark:hover:text-white'
                        }`}
                      >
                        <sub.icon className="w-3.5 h-3.5" />
                        <span>{sub.label}</span>
                      </button>
                    ))}
                  </div>

                  {settingsSubTab === 'autonomy' && (
                    <AutonomySettings
                      language={language}
                      config={autonomyConfig}
                      onSaved={onUpdateAutonomy}
                      onNotify={onNotify}
                    />
                  )}

                  {settingsSubTab === 'integrations' && (
                    <IntegrationsHub
                      language={language}
                      integrations={integrations}
                      appMode={appMode}
                      onRefresh={onRefreshAll}
                      onNotify={onNotify}
                    />
                  )}

                  {settingsSubTab === 'import' && (
                    <CsvImportWizard
                      language={language}
                      onRefresh={onRefreshAll}
                      onNotify={onNotify}
                    />
                  )}

                  {settingsSubTab === 'profile' && (
                    <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#1E3A5F] bg-white dark:bg-[#0B1E40] p-6 max-w-xl space-y-4">
                      <div>
                        <h3 className="text-base font-extrabold text-[#071A35] dark:text-white">
                          {tr(language, 'Store Profile & Data Backup', 'दुकान प्रोफ़ाइल और डेटा बैकअप')}
                        </h3>
                        <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">
                          {isAuthenticated
                            ? tr(
                                language,
                                'Update your live business name, category, and location.',
                                'अपनी दुकान का नाम, श्रेणी और शहर अपडेट करें।'
                              )
                            : tr(
                                language,
                                'Demo Mode store details are read-only. Create a Live Store account to customize.',
                                'डेमो मोड विवरण बदला नहीं जा सकता। अपना डेटा सहेजने के लिए लाइव स्टोर खाता बनाएं।'
                              )}
                        </p>
                      </div>
                      <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
                        <div>
                          <label className="block font-semibold mb-1">
                            {tr(language, 'Business Name', 'दुकान का नाम')}
                          </label>
                          <input
                            value={profileName}
                            onChange={(e) => setProfileName(e.target.value)}
                            disabled={!isAuthenticated}
                            className="w-full h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#061533] disabled:opacity-60"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block font-semibold mb-1">
                              {tr(language, 'Category', 'श्रेणी')}
                            </label>
                            <input
                              value={profileCategory}
                              onChange={(e) => setProfileCategory(e.target.value)}
                              disabled={!isAuthenticated}
                              className="w-full h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#061533] disabled:opacity-60"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold mb-1">
                              {tr(language, 'Store Website / URL', 'स्टोर वेबसाइट / लिंक')}
                            </label>
                            <input
                              value={profileUrl}
                              onChange={(e) => setProfileUrl(e.target.value)}
                              disabled={!isAuthenticated}
                              placeholder="https://..."
                              className="w-full h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#061533] disabled:opacity-60"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block font-semibold mb-1">
                              {tr(language, 'City', 'शहर')}
                            </label>
                            <input
                              value={profileCity}
                              onChange={(e) => setProfileCity(e.target.value)}
                              disabled={!isAuthenticated}
                              className="w-full h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#061533] disabled:opacity-60"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold mb-1">
                              {tr(language, 'State', 'राज्य')}
                            </label>
                            <input
                              value={profileState}
                              onChange={(e) => setProfileState(e.target.value)}
                              disabled={!isAuthenticated}
                              className="w-full h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#061533] disabled:opacity-60"
                            />
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {isAuthenticated ? (
                            <button
                              type="submit"
                              disabled={savingProfile}
                              className="h-10 px-5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold cursor-pointer disabled:opacity-50"
                            >
                              {savingProfile
                                ? tr(language, 'Saving...', 'सहेज रहे हैं...')
                                : tr(language, 'Save Store Profile', 'प्रोफ़ाइल सहेजें')}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onOpenAuth('signup')}
                              className="h-10 px-5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold cursor-pointer"
                            >
                              {tr(language, 'Create Live Store Account', 'लाइव स्टोर खाता बनाएं')}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={handleDownloadBackup}
                            className="h-10 px-4 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] hover:border-[#2563EB] text-xs font-bold text-[#071A35] dark:text-white cursor-pointer"
                          >
                            {tr(language, 'Download JSON Backup', 'JSON बैकअप डाउनलोड करें')}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {settingsSubTab === 'audit' && (
                    <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#1E3A5F] bg-white dark:bg-[#0B1E40] p-5 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-sm font-extrabold text-[#071A35] dark:text-white">
                          {tr(language, 'Store Activity & Audit History', 'दुकान गतिविधि और ऑडिट इतिहास')}
                        </h4>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={handleDownloadBackup}
                            className="text-xs font-bold text-[#2563EB] dark:text-[#22D3EE] hover:underline cursor-pointer"
                          >
                            {tr(language, 'Download JSON Backup', 'JSON बैकअप डाउनलोड')}
                          </button>
                          <button
                            onClick={() => handleExportCsv('audit')}
                            className="text-xs font-bold text-[#2563EB] dark:text-[#22D3EE] hover:underline cursor-pointer"
                          >
                            {tr(language, 'Download CSV →', 'CSV डाउनलोड करें →')}
                          </button>
                        </div>
                      </div>
                      {auditLogs.length === 0 ? (
                        <p className="text-xs text-[#64748B]">
                          {tr(language, 'No activity entries recorded yet.', 'अभी कोई गतिविधि दर्ज नहीं है।')}
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {auditLogs.map((log) => (
                            <div
                              key={log.id}
                              className="p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#061533] border border-[#E2E8F0] dark:border-[#1E3A5F] flex flex-wrap items-center justify-between gap-2 text-xs"
                            >
                              <div>
                                <span className="font-bold text-[#071A35] dark:text-white">
                                  {localizeAuditAction(language, log.action)}
                                </span>{' '}
                                <span className="text-[#64748B]">
                                  · {localizeActorType(language, log.actor_type)} · {log.entity_type} ({log.entity_id})
                                </span>
                              </div>
                              <span className="text-[11px] font-mono text-[#64748B] tabular-nums">
                                {log.created_at}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Explicit Voice Command Confirmation Modal */}
      {pendingVoiceConfirm && (
        <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0B1E40] border border-[#CBD5E1] dark:border-[#1E3A5F] p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-extrabold text-[#071A35] dark:text-white">
              {tr(language, 'Confirm Voice Action', 'वॉइस कार्य की पुष्टि करें')}
            </h3>
            <p className="text-sm text-[#475569] dark:text-[#CBD5E1]">
              {pendingVoiceConfirm.summary}
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setPendingVoiceConfirm(null)}
                className="h-9 px-4 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] text-xs font-bold cursor-pointer"
              >
                {tr(language, 'Cancel', 'रद्द करें')}
              </button>
              <button
                onClick={confirmVoiceAction}
                className="h-9 px-4 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{tr(language, 'Confirm & Prepare Draft', 'पुष्टि करें और ड्राफ्ट बनाएं')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
