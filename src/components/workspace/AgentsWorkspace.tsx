import React, { useState, useEffect } from 'react';
import {
  Bot,
  Play,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ArrowDown,
  ShieldCheck,
  Clock,
  UserCheck,
  X,
  PhoneForwarded,
  Wrench,
  Terminal,
} from 'lucide-react';
import { AgentSummary, AppLanguage, ConsoleTabId, WorkflowRecord } from '../../types';
import { apiRequest } from '../../lib/api';
import {
  localizeAgentName,
  localizeAgentRole,
  localizeAgentScope,
  localizeWorkflowStatus,
  localizeWorkflowType,
  tr,
} from '../../i18n/translations';

interface AgentsWorkspaceProps {
  language?: AppLanguage;
  agents: AgentSummary[];
  workflows: WorkflowRecord[];
  onRefresh: () => void;
  onNotify: (msg: string) => void;
  onNavigateTab: (tab: ConsoleTabId) => void;
}

const AGENT_TOOLS_MAP: Record<string, string[]> = {
  'Customer Intelligence Agent': ['customers.query', 'orders.history', 'udhaar.ledger'],
  'Behaviour & Prediction Agent': ['cadence.forecast', 'cod.riskScorer', 'priority.rank'],
  'Engagement & Copy Agent': ['gemini.draftMessage', 'i18n.templates', 'upi.linkBuilder'],
  'Policy & Safety Guard': ['consent.optOutCheck', 'quietHours.ist', 'autonomy.caps'],
  'Execution & Measurement Agent': ['whatsapp.send', 'approval.queue', 'outcome.reconcile'],
};

function formatJsonPreview(raw?: string): string | null {
  if (!raw || raw === '{}') return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const entries = Object.entries(parsed).slice(0, 4);
    if (entries.length === 0) return null;
    return entries
      .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
      .join(' · ');
  } catch {
    return raw.slice(0, 140);
  }
}

export const AgentsWorkspace: React.FC<AgentsWorkspaceProps> = ({
  language = 'en',
  agents,
  workflows,
  onRefresh,
  onNotify,
  onNavigateTab,
}) => {
  const [runningType, setRunningType] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentSummary | null>(null);
  const [taskFilter, setTaskFilter] = useState<'all' | 'completed' | 'issues'>('all');

  const pipelineSteps = [
    tr(language, 'Customer detected', 'ग्राहक पहचाना गया'),
    tr(language, 'Context retrieved', 'संदर्भ लोड हुआ'),
    tr(language, 'Agents collaborate', 'एजेंट्स का सहयोग'),
    tr(language, 'Decision made', 'निर्णय तय हुआ'),
    tr(language, 'Action approved', 'मंजूरी मिली'),
    tr(language, 'Action executed', 'कार्य पूरा हुआ'),
    tr(language, 'Result verified', 'परिणाम सत्यापित'),
  ];

  const collabOrder = [
    { agent: 'Customer Intelligence Agent', short: tr(language, '1. Intel', '1. जानकारी') },
    { agent: 'Behaviour & Prediction Agent', short: tr(language, '2. Predict', '2. अनुमान') },
    { agent: 'Engagement & Copy Agent', short: tr(language, '3. Copy', '3. संदेश') },
    { agent: 'Policy & Safety Guard', short: tr(language, '4. Safety', '4. सुरक्षा') },
    { agent: 'Execution & Measurement Agent', short: tr(language, '5. Execute', '5. निष्पादन') },
  ];

  useEffect(() => {
    if (!selectedAgent) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedAgent(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedAgent]);

  const handleRunWorkflow = async (
    workflowType: 'reactivation' | 'cod_protection' | 'udhaar_collection'
  ) => {
    setRunningType(workflowType);
    try {
      const res = await apiRequest<{ message: string; status: string }>('/api/workflows/run', {
        method: 'POST',
        body: JSON.stringify({ workflowType }),
      });
      onNotify(res.message);
      onRefresh();
    } catch (err: unknown) {
      onNotify(
        err instanceof Error ? err.message : tr(language, 'Could not run check.', 'जांच नहीं चल सकी।')
      );
    } finally {
      setRunningType(null);
    }
  };

  const handleRetry = async (id: string) => {
    setRunningType(id);
    try {
      const res = await apiRequest<{ message: string }>(`/api/workflows/${id}/retry`, {
        method: 'POST',
      });
      onNotify(res.message);
      onRefresh();
    } catch (err: unknown) {
      onNotify(err instanceof Error ? err.message : tr(language, 'Re-run failed.', 'पुनः प्रयास विफल रहा।'));
    } finally {
      setRunningType(null);
    }
  };

  const handleEscalate = async (id: string) => {
    setRunningType(id);
    try {
      await apiRequest(`/api/workflows/${id}/escalate`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Merchant requested human review / manual phone call.' }),
      });
      onNotify(
        tr(
          language,
          'Workflow escalated for human follow-up.',
          'वर्कफ़्लो मानवीय समीक्षा के लिए आगे बढ़ाया गया।'
        )
      );
      onRefresh();
    } catch (err: unknown) {
      onNotify(err instanceof Error ? err.message : tr(language, 'Escalation failed.', 'एस्केलेशन विफल रहा।'));
    } finally {
      setRunningType(null);
    }
  };

  const getPipelineProgress = (wf: WorkflowRecord) => {
    const hasVerifiedOutcome = wf.tasks?.some((t) => t.step_order === 6);
    if (hasVerifiedOutcome) return 7;
    if (wf.status === 'completed' || wf.status === 'executed') return 6;
    if (wf.status === 'awaiting_approval') return 4;
    if (wf.status === 'escalated') return 4;
    if (wf.status === 'failed') return 3;
    return 2;
  };

  const allSelectedTasks = selectedAgent
    ? workflows.flatMap((wf) =>
        (wf.tasks || [])
          .filter((t) => t.agent_name === selectedAgent.name)
          .map((t) => ({ ...t, workflowType: wf.workflow_type, targetId: wf.target_id }))
      )
    : [];

  const selectedAgentTasks = allSelectedTasks
    .filter((t) => {
      if (taskFilter === 'completed') return t.status === 'completed';
      if (taskFilter === 'issues') return t.status === 'failed' || t.status === 'blocked' || t.status === 'escalated';
      return true;
    })
    .slice(0, 14);

  const issueCount = allSelectedTasks.filter(
    (t) => t.status === 'failed' || t.status === 'blocked' || t.status === 'escalated'
  ).length;

  return (
    <div className="space-y-6">
      {/* Orchestrator Controls */}
      <div className="rounded-2xl border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#0B1E40] p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-base font-extrabold text-[#071A35] dark:text-white flex items-center gap-2">
            <Bot className="w-5 h-5 text-[#2563EB] dark:text-[#22D3EE]" />
            <span>
              {tr(language, 'AI Teammates · Central Orchestrator', 'AI साथी · सेंट्रल ऑर्केस्ट्रेटर')}
            </span>
          </h3>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            {tr(
              language,
              'Assigns store checks across 5 specialised agents, enforces safety rules, and logs real inputs and outputs.',
              '5 विशेषज्ञ एजेंट्स को काम सौंपता है, सुरक्षा नियम जांचता है और हर चरण का असली इनपुट-आउटपुट दर्ज करता है।'
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            disabled={runningType !== null}
            onClick={() => handleRunWorkflow('reactivation')}
            className="h-9 px-3.5 rounded-lg bg-[#2563EB] hover:bg-[#071A35] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            <span>
              {runningType === 'reactivation'
                ? tr(language, 'Checking...', 'जांच जारी...')
                : tr(language, 'Find Reorders Due', 'रीऑर्डर ग्राहक खोजें')}
            </span>
          </button>
          <button
            disabled={runningType !== null}
            onClick={() => handleRunWorkflow('cod_protection')}
            className="h-9 px-3.5 rounded-lg bg-[#071A35] dark:bg-[#22D3EE] hover:bg-[#2563EB] text-white dark:text-[#071A35] text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            <span>
              {runningType === 'cod_protection'
                ? tr(language, 'Checking...', 'जांच जारी...')
                : tr(language, 'Check Risky COD', 'जोखिम वाले COD जांचें')}
            </span>
          </button>
          <button
            disabled={runningType !== null}
            onClick={() => handleRunWorkflow('udhaar_collection')}
            className="h-9 px-3.5 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] hover:border-[#2563EB] text-xs font-bold text-[#071A35] dark:text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#22D3EE]" />
            <span>
              {runningType === 'udhaar_collection'
                ? tr(language, 'Preparing...', 'तैयार हो रहा...')
                : tr(language, 'Check Pending Udhaar', 'बाकी उधार जांचें')}
            </span>
          </button>
        </div>
      </div>

      {/* Hub-and-Spoke Multi-Agent Topology */}
      <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#1E3A5F] bg-white dark:bg-[#0B1E40] p-5 space-y-4">
        <div className="text-xs font-bold uppercase tracking-wider text-[#2563EB] dark:text-[#22D3EE]">
          {tr(
            language,
            'Multi-Agent Topology (Click any teammate to inspect tools, inputs, outputs & history)',
            'मल्टी-एजेंट संरचना (टूल्स, इनपुट, आउटपुट और इतिहास देखने के लिए किसी साथी पर क्लिक करें)'
          )}
        </div>

        <div className="flex flex-col items-center gap-2 text-xs">
          <div className="w-full max-w-md py-2.5 px-4 rounded-xl bg-[#071A35] text-white border border-[#2563EB] text-center font-extrabold shadow-sm">
            {tr(
              language,
              'Central AI Orchestrator · Coordinates 5 Teammates',
              'सेंट्रल AI ऑर्केस्ट्रेटर · 5 साथियों का समन्वय'
            )}
          </div>
          <ArrowDown className="w-4 h-4 text-[#2563EB] dark:text-[#22D3EE]" />
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {agents.map((ag, idx) => {
            const tools = AGENT_TOOLS_MAP[ag.name] || [];
            const agentFailedOrBlocked = workflows
              .flatMap((w) => w.tasks || [])
              .filter(
                (t) =>
                  t.agent_name === ag.name &&
                  (t.status === 'failed' || t.status === 'blocked' || t.status === 'escalated')
              ).length;
            return (
              <button
                key={ag.name}
                onClick={() => {
                  setTaskFilter('all');
                  setSelectedAgent(ag);
                }}
                className="text-left rounded-2xl border border-[#E2E8F0] dark:border-[#1E3A5F] hover:border-[#2563EB] bg-[#F8FAFC] dark:bg-[#061533] p-4 flex flex-col justify-between gap-2.5 transition-colors cursor-pointer"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#2563EB] dark:text-[#22D3EE]">
                    <span className="font-mono">
                      {tr(language, 'Teammate', 'साथी')} 0{idx + 1}
                    </span>
                    <span className="tabular-nums text-[#64748B]">
                      {ag.totalRuns} {tr(language, 'runs', 'बार')}
                      {agentFailedOrBlocked > 0 && (
                        <span className="text-[#DC2626] ml-1">
                          ({agentFailedOrBlocked} {tr(language, 'blocked', 'रुके')})
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="text-xs font-extrabold text-[#071A35] dark:text-white">
                    {localizeAgentName(language, ag.name)}
                  </div>
                  <p className="text-[11px] text-[#475569] dark:text-[#CBD5E1] leading-snug">
                    {localizeAgentRole(language, ag.name, ag.role)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1">
                  {tools.slice(0, 2).map((tool) => (
                    <span
                      key={tool}
                      className="px-1.5 py-0.5 rounded bg-white dark:bg-[#0B1E40] border border-[#E2E8F0] dark:border-[#1E3A5F] text-[10px] font-mono text-[#475569] dark:text-[#94A3B8]"
                    >
                      {tool}
                    </span>
                  ))}
                </div>

                <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#1E3A5F] flex items-center justify-between text-[11px]">
                  <span className="text-[#64748B] truncate">
                    {localizeAgentScope(language, ag.name, ag.permissionScope)}
                  </span>
                  <span className="font-bold text-[#2563EB] dark:text-[#22D3EE] shrink-0">
                    {tr(language, 'Inspect →', 'जांचें →')}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col items-center gap-2 text-xs pt-1">
          <ArrowDown className="w-4 h-4 text-[#2563EB] dark:text-[#22D3EE]" />
          <div className="grid sm:grid-cols-3 gap-3 w-full">
            <div className="p-3 rounded-xl bg-[#EFF6FF] dark:bg-[#061533] border border-[#BFDBFE] dark:border-[#1E3A5F] text-center font-bold text-[#071A35] dark:text-white flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#2563EB] dark:text-[#22D3EE]" />
              <span>{tr(language, 'Safety & Approval Check', 'सुरक्षा और मंजूरी जांच')}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#061533] border border-[#E2E8F0] dark:border-[#1E3A5F] text-center font-bold text-[#071A35] dark:text-white flex items-center justify-center gap-2">
              <UserCheck className="w-4 h-4 text-[#16A34A]" />
              <span>{tr(language, 'Action Execution (Idempotent)', 'सुरक्षित संदेश निष्पादन')}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#061533] border border-[#E2E8F0] dark:border-[#1E3A5F] text-center font-bold text-[#071A35] dark:text-white flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
              <span>{tr(language, 'Closed-Loop Outcome Verification', 'बंद-लूप परिणाम सत्यापन')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Live 7-Step Workflow Pipeline */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-extrabold text-[#071A35] dark:text-white">
            {tr(
              language,
              'Multi-Agent Workflows & Step-by-Step Handoff',
              'मल्टी-एजेंट वर्कफ़्लो और चरणबद्ध प्रगति'
            )}
          </h4>
          <button
            onClick={() => onNavigateTab('inbox')}
            className="text-xs font-bold text-[#2563EB] dark:text-[#22D3EE] hover:underline cursor-pointer"
          >
            {tr(language, 'Open Action Center →', 'मंजूरी केंद्र खोलें →')}
          </button>
        </div>

        {workflows.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-[#CBD5E1] dark:border-[#1E3A5F] text-center text-xs text-[#64748B]">
            {tr(
              language,
              'No checks run yet. Click one of the buttons above to coordinate your AI team.',
              'अभी कोई जांच नहीं चली है। अपनी AI टीम चलाने के लिए ऊपर के बटन दबाएं।'
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {workflows.slice(0, 8).map((wf) => {
              const currentIdx = getPipelineProgress(wf);
              const isEscalated = wf.status === 'escalated';
              const isFailed = wf.status === 'failed';

              return (
                <div
                  key={wf.id}
                  className="rounded-2xl border border-[#E2E8F0] dark:border-[#1E3A5F] bg-white dark:bg-[#0B1E40] p-4 space-y-3 hover:border-[#93C5FD] dark:hover:border-[#22D3EE]/50 transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="font-extrabold text-[#071A35] dark:text-white capitalize">
                        {localizeWorkflowType(language, wf.workflow_type)}
                      </span>{' '}
                      <span className="text-[#64748B] font-mono text-[11px]">
                        · {wf.target_id} · {wf.created_at.slice(0, 16)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`font-bold uppercase text-[11px] ${
                          isFailed
                            ? 'text-[#DC2626]'
                            : isEscalated
                            ? 'text-[#D97706]'
                            : 'text-[#2563EB] dark:text-[#22D3EE]'
                        }`}
                      >
                        {localizeWorkflowStatus(language, wf.status)}
                      </span>
                      <button
                        disabled={runningType === wf.id}
                        onClick={() => handleRetry(wf.id)}
                        className="h-7 px-2.5 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] hover:border-[#2563EB] text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" /> {tr(language, 'Re-run', 'फिर चलाएं')}
                      </button>
                      {!isEscalated && (
                        <button
                          disabled={runningType === wf.id}
                          onClick={() => handleEscalate(wf.id)}
                          className="h-7 px-2.5 rounded-lg border border-[#FCA5A5] text-[#DC2626] text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <PhoneForwarded className="w-3 h-3" /> {tr(language, 'Escalate', 'कॉल के लिए भेजें')}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Collaborating Agents Handoff Strip */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    {collabOrder.map((stepMeta) => {
                      const task = wf.tasks?.find((t) => t.agent_name === stepMeta.agent);
                      const status = task?.status || 'waiting';
                      return (
                        <button
                          key={stepMeta.agent}
                          type="button"
                          onClick={() => {
                            const found = agents.find((a) => a.name === stepMeta.agent);
                            if (found) setSelectedAgent(found);
                          }}
                          className={`px-2 py-1 rounded-lg border font-semibold flex items-center gap-1 cursor-pointer ${
                            status === 'completed'
                              ? 'border-[#BBF7D0] dark:border-[#14532D] bg-[#F0FDF4] dark:bg-[#052E16]/40 text-[#16A34A]'
                              : status === 'blocked' || status === 'failed'
                              ? 'border-[#FCA5A5] bg-[#FEF2F2] dark:bg-[#450A0A]/40 text-[#DC2626]'
                              : 'border-[#E2E8F0] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#061533] text-[#64748B]'
                          }`}
                        >
                          <span>{stepMeta.short}</span>
                          {task?.duration_ms ? (
                            <span className="text-[10px] opacity-80 tabular-nums">
                              {task.duration_ms}ms
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>

                  {/* 7-Step Visual Pipeline */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 text-[11px]">
                    {pipelineSteps.map((label, idx) => {
                      const done = idx < currentIdx;
                      const current = idx === currentIdx;
                      return (
                        <div
                          key={label}
                          className={`p-2 rounded-lg border flex flex-col justify-between gap-1 ${
                            done
                              ? 'border-[#BBF7D0] dark:border-[#14532D] bg-[#F0FDF4] dark:bg-[#052E16]/30 text-[#16A34A]'
                              : current && isFailed
                              ? 'border-[#FCA5A5] bg-[#FEF2F2] dark:bg-[#450A0A]/40 text-[#DC2626]'
                              : current && isEscalated
                              ? 'border-[#FCD34D] bg-[#FFFBEB] dark:bg-[#451A03]/40 text-[#D97706]'
                              : current
                              ? 'border-[#93C5FD] bg-[#EFF6FF] dark:bg-[#061533] text-[#2563EB] dark:text-[#22D3EE]'
                              : 'border-[#E2E8F0] dark:border-[#1E3A5F] text-[#64748B] opacity-70'
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold tabular-nums">
                            <span>0{idx + 1}</span>
                            {done ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : current && isFailed ? (
                              <AlertTriangle className="w-3 h-3" />
                            ) : current ? (
                              <Clock className="w-3 h-3" />
                            ) : null}
                          </div>
                          <div className="font-semibold leading-tight text-[#071A35] dark:text-white">
                            {label}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {wf.error_message && (
                    <div className="text-xs text-[#DC2626] flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>{wf.error_message}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Agent Detail Drawer */}
      {selectedAgent && (
        <div className="fixed inset-0 z-50 bg-black/60 flex justify-end">
          <div className="w-full max-w-lg bg-white dark:bg-[#0B1E40] h-full overflow-y-auto p-6 space-y-5 shadow-2xl border-l border-[#CBD5E1] dark:border-[#1E3A5F]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-bold font-mono uppercase tracking-wider text-[#2563EB] dark:text-[#22D3EE]">
                  {tr(language, 'Specialised AI Teammate', 'विशेषज्ञ AI साथी')}
                </div>
                <h3 className="text-lg font-extrabold text-[#071A35] dark:text-white">
                  {localizeAgentName(language, selectedAgent.name)}
                </h3>
                <p className="text-xs text-[#475569] dark:text-[#CBD5E1] mt-1">
                  {localizeAgentRole(language, selectedAgent.name, selectedAgent.role)}
                </p>
              </div>
              <button
                onClick={() => setSelectedAgent(null)}
                aria-label={tr(language, 'Close agent drawer', 'विवरण बंद करें')}
                className="p-2 rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-[#061533] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#061533] border border-[#E2E8F0] dark:border-[#1E3A5F]">
                <div className="text-[#64748B]">{tr(language, 'Total Runs', 'कुल रन')}</div>
                <div className="text-base font-extrabold tabular-nums text-[#071A35] dark:text-white">
                  {selectedAgent.totalRuns}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#061533] border border-[#E2E8F0] dark:border-[#1E3A5F]">
                <div className="text-[#64748B]">{tr(language, 'Completed', 'पूर्ण')}</div>
                <div className="text-base font-extrabold tabular-nums text-[#16A34A]">
                  {selectedAgent.completedRuns}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#061533] border border-[#E2E8F0] dark:border-[#1E3A5F]">
                <div className="text-[#64748B]">{tr(language, 'Avg Speed', 'औसत समय')}</div>
                <div className="text-base font-extrabold tabular-nums text-[#071A35] dark:text-white">
                  {selectedAgent.avgDurationMs}ms
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#EFF6FF] dark:bg-[#061533] border border-[#BFDBFE] dark:border-[#1E3A5F] text-xs space-y-2">
              <div className="font-bold text-[#071A35] dark:text-white">
                {tr(language, 'Permission Boundary', 'अनुमति सीमा')}
              </div>
              <div className="text-[#475569] dark:text-[#CBD5E1]">
                {localizeAgentScope(language, selectedAgent.name, selectedAgent.permissionScope)}
              </div>
              <div className="pt-1 border-t border-[#BFDBFE]/60 dark:border-[#1E3A5F]">
                <div className="font-bold text-[#071A35] dark:text-white flex items-center gap-1.5 mb-1.5">
                  <Wrench className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#22D3EE]" />
                  <span>{tr(language, 'Available Tools', 'उपलब्ध टूल्स')}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(AGENT_TOOLS_MAP[selectedAgent.name] || []).map((tool) => (
                    <span
                      key={tool}
                      className="px-2 py-0.5 rounded bg-white dark:bg-[#0B1E40] border border-[#CBD5E1] dark:border-[#1E3A5F] text-[11px] font-mono text-[#071A35] dark:text-[#E2E8F0]"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Task Filter */}
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                  {tr(language, 'Execution Log', 'कार्य लॉग')} ({selectedAgentTasks.length})
                </h4>
                <div className="flex items-center gap-1 text-[11px]">
                  {(['all', 'completed', 'issues'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setTaskFilter(f)}
                      className={`px-2 py-1 rounded-md font-bold cursor-pointer ${
                        taskFilter === f
                          ? 'bg-[#2563EB] text-white'
                          : 'bg-[#F1F5F9] dark:bg-[#061533] text-[#64748B]'
                      }`}
                    >
                      {f === 'all'
                        ? tr(language, 'All', 'सभी')
                        : f === 'completed'
                        ? tr(language, 'Completed', 'पूर्ण')
                        : `${tr(language, 'Blocked', 'रुके')} (${issueCount})`}
                    </button>
                  ))}
                </div>
              </div>

              {selectedAgentTasks.length === 0 ? (
                <p className="text-xs text-[#64748B]">
                  {tr(
                    language,
                    'No matching tasks logged for this teammate yet.',
                    'इस साथी के लिए अभी कोई मेल खाने वाला कार्य दर्ज नहीं है।'
                  )}
                </p>
              ) : (
                <div className="space-y-2.5">
                  {selectedAgentTasks.map((task) => {
                    const inputSummary = formatJsonPreview(task.input_json);
                    const outputSummary = formatJsonPreview(task.output_json);
                    return (
                      <div
                        key={task.id}
                        className="p-3.5 rounded-xl border border-[#E2E8F0] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#061533] text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-[#071A35] dark:text-white capitalize">
                            {localizeWorkflowType(language, task.workflowType)} · {task.targetId}
                          </span>
                          <span
                            className={
                              task.status === 'completed'
                                ? 'text-[#16A34A]'
                                : task.status === 'failed' || task.status === 'blocked'
                                ? 'text-[#DC2626]'
                                : 'text-[#D97706]'
                            }
                          >
                            {localizeWorkflowStatus(language, task.status)}
                          </span>
                        </div>
                        <p className="text-[#475569] dark:text-[#CBD5E1]">{task.reason}</p>

                        {(inputSummary || outputSummary) && (
                          <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#1E3A5F] space-y-1 text-[11px] font-mono">
                            {inputSummary && (
                              <div className="text-[#64748B] flex items-start gap-1.5">
                                <Terminal className="w-3 h-3 mt-0.5 shrink-0 text-[#2563EB]" />
                                <span className="break-all">in: {inputSummary}</span>
                              </div>
                            )}
                            {outputSummary && (
                              <div className="text-[#071A35] dark:text-[#22D3EE] flex items-start gap-1.5">
                                <Terminal className="w-3 h-3 mt-0.5 shrink-0 text-[#16A34A]" />
                                <span className="break-all">out: {outputSummary}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
