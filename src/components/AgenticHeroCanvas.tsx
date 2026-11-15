import React, { useState } from 'react';
import {
  Bot,
  BrainCircuit,
  MessageSquareText,
  ShieldCheck,
  TrendingUp,
  UserSearch,
  Play,
  CheckCircle2,
  ArrowRight,
  Cpu,
} from 'lucide-react';
import { AgentSummary, AppLanguage, ConsoleTabId, WorkflowRecord } from '../types';
import { apiRequest } from '../lib/api';
import {
  localizeAgentName,
  localizeAgentRole,
  localizeAgentScope,
  localizeWorkflowType,
  tr,
} from '../i18n/translations';

interface AgenticHeroCanvasProps {
  language: AppLanguage;
  agents: AgentSummary[];
  workflows: WorkflowRecord[];
  onOpenConsole: (tab?: ConsoleTabId) => void;
  onActionQueued?: (msg: string) => void;
}

const AGENT_VISUAL_META: Record<
  string,
  {
    code: string;
    shortNameEn: string;
    shortNameHi: string;
    icon: React.ComponentType<{ className?: string }>;
    tools: string[];
  }
> = {
  'Customer Intelligence Agent': {
    code: '01',
    shortNameEn: 'Customer Intelligence',
    shortNameHi: 'ग्राहक जानकारी',
    icon: UserSearch,
    tools: ['customers.query', 'orders.history', 'udhaar.ledger'],
  },
  'Behaviour & Prediction Agent': {
    code: '02',
    shortNameEn: 'Behaviour & Prediction',
    shortNameHi: 'व्यवहार अनुमान',
    icon: BrainCircuit,
    tools: ['cadence.forecast', 'cod.riskScorer', 'priority.rank'],
  },
  'Engagement & Copy Agent': {
    code: '03',
    shortNameEn: 'Engagement & Copy',
    shortNameHi: 'संदेश ड्राफ्ट',
    icon: MessageSquareText,
    tools: ['gemini.draftMessage', 'i18n.templates', 'upi.linkBuilder'],
  },
  'Policy & Safety Guard': {
    code: '04',
    shortNameEn: 'Policy & Safety Guard',
    shortNameHi: 'सुरक्षा रक्षक',
    icon: ShieldCheck,
    tools: ['consent.optOutCheck', 'quietHours.ist', 'autonomy.caps'],
  },
  'Execution & Measurement Agent': {
    code: '05',
    shortNameEn: 'Execution & Measure',
    shortNameHi: 'निष्पादन व मापन',
    icon: TrendingUp,
    tools: ['whatsapp.send', 'approval.queue', 'outcome.reconcile'],
  },
};

export const AgenticHeroCanvas: React.FC<AgenticHeroCanvasProps> = ({
  language,
  agents,
  workflows,
  onOpenConsole,
  onActionQueued,
}) => {
  const [mode, setMode] = useState<'reactivation' | 'cod_protection' | 'udhaar_collection'>(
    'reactivation'
  );
  const [selectedAgentIdx, setSelectedAgentIdx] = useState<number>(0);
  const [running, setRunning] = useState(false);

  const workflowModes: Array<{
    id: 'reactivation' | 'cod_protection' | 'udhaar_collection';
    label: string;
    shortTask: string;
  }> = [
    {
      id: 'reactivation',
      label: tr(language, 'Customer Recovery', 'ग्राहक वापसी'),
      shortTask: tr(
        language,
        'Detect overdue repeat buyer → Draft reorder reminder',
        'रीऑर्डर समय पहचानें → विनम्र रिमाइंडर ड्राफ्ट तैयार करें'
      ),
    },
    {
      id: 'cod_protection',
      label: tr(language, 'COD Protection', 'COD सुरक्षा'),
      shortTask: tr(
        language,
        'Score risky parcel → Prepare UPI / address verification',
        'जोखिम वाला पार्सल जांचें → पता व UPI पुष्टि तैयार करें'
      ),
    },
    {
      id: 'udhaar_collection',
      label: tr(language, 'Udhaar Collection', 'उधार वसूली'),
      shortTask: tr(
        language,
        'Locate overdue balance → Prepare polite UPI reminder',
        'बकाया खाता खोजें → विनम्र UPI रिमाइंडर तैयार करें'
      ),
    },
  ];

  const sevenStages = [
    tr(language, 'Detected', 'पहचान'),
    tr(language, 'Context', 'संदर्भ'),
    tr(language, 'Agents', 'एजेंट्स'),
    tr(language, 'Decision', 'निर्णय'),
    tr(language, 'Approved', 'मंजूरी'),
    tr(language, 'Executed', 'भेजा गया'),
    tr(language, 'Verified', 'सत्यापित'),
  ];

  const displayAgents = agents.slice(0, 5);
  const activeAgent = displayAgents[selectedAgentIdx] || displayAgents[0] || null;
  const activeMeta = activeAgent ? AGENT_VISUAL_META[activeAgent.name] : undefined;

  const latestMatchingWf =
    workflows.find((w) => w.workflow_type === mode) || workflows[0] || null;

  const getCompletedStageCount = (wf: WorkflowRecord | null) => {
    if (!wf) return 4;
    if (wf.tasks?.some((t) => t.step_order === 6)) return 7;
    if (wf.status === 'completed' || wf.status === 'executed') return 6;
    if (wf.status === 'awaiting_approval') return 4;
    if (wf.status === 'escalated') return 4;
    return 3;
  };

  const completedStages = getCompletedStageCount(latestMatchingWf);

  const latestAgentTask = activeAgent
    ? workflows
        .flatMap((w) =>
          (w.tasks || [])
            .filter((t) => t.agent_name === activeAgent.name)
            .map((t) => ({ ...t, wfType: w.workflow_type, targetId: w.target_id }))
        )
        .shift() || null
    : null;

  const handleRunLiveCheck = async () => {
    setRunning(true);
    try {
      const res = await apiRequest<{ message: string }>('/api/workflows/run', {
        method: 'POST',
        body: JSON.stringify({ workflowType: mode }),
      });
      onActionQueued?.(res.message);
    } catch (err: unknown) {
      onActionQueued?.(
        err instanceof Error
          ? err.message
          : tr(language, 'Check queued in workspace.', 'जांच वर्कस्पेस में जोड़ दी गई।')
      );
    } finally {
      setRunning(false);
    }
  };

  const modeInfo = workflowModes.find((m) => m.id === mode) || workflowModes[0];
  const spokeX = [50, 150, 250, 350, 450];

  return (
    <div className="relative rounded-2xl border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#0B2246]/95 shadow-xl dark:shadow-2xl overflow-hidden text-[#071A35] dark:text-white transition-colors">
      {/* Top command graph header bar */}
      <div className="px-4 sm:px-5 py-3.5 border-b border-[#E2E8F0] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#071A35]/90 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-bold text-[#2563EB] dark:text-[#22D3EE]">
          <Cpu className="w-4 h-4 shrink-0" />
          <span>{tr(language, 'Multi-Agent Command Graph', 'मल्टी-एजेंट कमांड ग्राफ़')}</span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {workflowModes.map((wm) => {
            const active = wm.id === mode;
            return (
              <button
                key={wm.id}
                onClick={() => setMode(wm.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-[#2563EB] text-white shadow-xs'
                    : 'bg-white dark:bg-[#0F2A54] border border-[#E2E8F0] dark:border-transparent text-[#475569] dark:text-[#94A3B8] hover:text-[#071A35] dark:hover:text-white'
                }`}
              >
                {wm.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Hub-and-Spoke Visual */}
      <div className="p-4 sm:p-5 space-y-4">
        <div className="flex flex-col items-center">
          <div className="w-full flex flex-wrap items-center justify-between gap-2 mb-3 text-xs">
            <span className="text-[#475569] dark:text-[#94A3B8] truncate">{modeInfo.shortTask}</span>
            <button
              onClick={handleRunLiveCheck}
              disabled={running}
              className="h-8 px-3 rounded-lg bg-[#071A35] dark:bg-[#22D3EE] hover:bg-[#2563EB] dark:hover:bg-[#38BDF8] text-white dark:text-[#071A35] font-extrabold text-[11px] flex items-center gap-1.5 cursor-pointer disabled:opacity-60 shrink-0 transition-colors"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>
                {running
                  ? tr(language, 'Running Agents...', 'एजेंट चल रहे हैं...')
                  : tr(language, 'Run Live Check', 'लाइव जांच चलाएं')}
              </span>
            </button>
          </div>

          <div className="w-full max-w-sm rounded-xl border border-[#2563EB]/40 dark:border-[#2563EB]/80 bg-gradient-to-r from-[#EFF6FF] via-white to-[#ECFEFF] dark:from-[#0F2C5C] dark:via-[#133875] dark:to-[#0F2C5C] px-4 py-3 shadow-sm dark:shadow-[0_0_24px_rgba(37,99,235,0.28)] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-[#2563EB] flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5 text-white dark:text-[#22D3EE]" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB] dark:text-[#22D3EE]">
                  {tr(language, 'Central AI Orchestrator', 'सेंट्रल AI ऑर्केस्ट्रेटर')}
                </div>
                <div className="text-xs font-extrabold text-[#071A35] dark:text-white truncate">
                  {latestMatchingWf
                    ? `${tr(language, 'Coordinating', 'समन्वय')}: ${localizeWorkflowType(
                        language,
                        latestMatchingWf.workflow_type
                      )}`
                    : tr(language, 'Coordinates all 5 teammates', 'सभी 5 साथियों का समन्वय')}
                </div>
              </div>
            </div>
            <span className="text-[11px] font-bold text-[#475569] dark:text-[#CBD5E1] tabular-nums shrink-0">
              {workflows.length} {tr(language, 'tasks', 'कार्य')}
            </span>
          </div>

          {/* Animated SVG Workflow Lines linking Central Orchestrator to the 5 Teammates */}
          <svg
            viewBox="0 0 500 54"
            className="w-full h-11 overflow-visible"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {spokeX.map((x, idx) => {
              const isSelected = idx === selectedAgentIdx;
              return (
                <g key={x}>
                  <path
                    d={`M 250 2 C 250 28, ${x} 24, ${x} 52`}
                    fill="none"
                    className={`${isSelected ? 'animate-agent-flow' : ''} ${
                      isSelected
                        ? 'stroke-[#2563EB] dark:stroke-[#22D3EE]'
                        : 'stroke-[#CBD5E1] dark:stroke-[#1E3A5F]'
                    }`}
                    strokeWidth={isSelected ? 2.4 : 1.5}
                    strokeDasharray={isSelected ? '6 5' : undefined}
                  />
                  <circle
                    cx={x}
                    cy={50}
                    r={isSelected ? 3.5 : 2.5}
                    className={
                      isSelected
                        ? 'fill-[#2563EB] dark:fill-[#22D3EE]'
                        : 'fill-[#94A3B8] dark:fill-[#3B82F6]'
                    }
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {/* 5 Specialised AI Teammates Nodes */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {displayAgents.map((ag, idx) => {
            const meta = AGENT_VISUAL_META[ag.name];
            const Icon = meta?.icon || Bot;
            const isSelected = idx === selectedAgentIdx;
            const shortLabel = meta
              ? language === 'hi'
                ? meta.shortNameHi
                : meta.shortNameEn
              : localizeAgentName(language, ag.name);

            return (
              <button
                key={ag.name}
                type="button"
                onClick={() => setSelectedAgentIdx(idx)}
                className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                  isSelected
                    ? 'border-[#2563EB] dark:border-[#22D3EE] bg-[#EFF6FF] dark:bg-[#102E61] shadow-sm dark:shadow-[0_0_16px_rgba(34,211,238,0.2)]'
                    : 'border-[#E2E8F0] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#071A35]/80 hover:border-[#2563EB]/60'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isSelected
                        ? 'text-[#2563EB] dark:text-[#22D3EE]'
                        : 'text-[#64748B] dark:text-[#60A5FA]'
                    }`}
                  />
                  <span className="text-[10px] font-bold text-[#64748B] dark:text-[#94A3B8] tabular-nums">
                    {ag.totalRuns}
                  </span>
                </div>
                <div>
                  <div className="text-[11px] font-extrabold text-[#071A35] dark:text-white leading-tight">
                    {shortLabel}
                  </div>
                  <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8] truncate mt-0.5">
                    {localizeAgentScope(language, ag.name, ag.permissionScope)}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Agent Real Output Inspector */}
        {activeAgent && (
          <div className="rounded-xl border border-[#E2E8F0] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#071A35] p-3.5 space-y-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-extrabold text-[#071A35] dark:text-white flex items-center gap-2">
                <span className="text-[#2563EB] dark:text-[#22D3EE] tabular-nums">
                  #{activeMeta?.code || '01'}
                </span>
                <span>{localizeAgentName(language, activeAgent.name)}</span>
              </div>
              <button
                onClick={() => onOpenConsole('agents')}
                className="text-[11px] font-bold text-[#2563EB] dark:text-[#22D3EE] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>{tr(language, 'Inspect Full Trace', 'पूरा विवरण देखें')}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <p className="text-[11px] text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
              {latestAgentTask
                ? `${localizeWorkflowType(language, latestAgentTask.wfType)} (${latestAgentTask.targetId}): ${latestAgentTask.reason}`
                : localizeAgentRole(language, activeAgent.name, activeAgent.role)}
            </p>
            {activeMeta && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                <span className="font-bold text-[#2563EB] dark:text-[#60A5FA]">
                  {tr(language, 'Tools:', 'टूल्स:')}
                </span>
                {activeMeta.tools.map((tool) => (
                  <span
                    key={tool}
                    className="px-1.5 py-0.5 rounded bg-white dark:bg-[#0F2A54] border border-[#CBD5E1] dark:border-[#1E3A5F] font-mono text-[#071A35] dark:text-[#E2E8F0]"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 7-Stage Connected Execution Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px] text-[#64748B] dark:text-[#94A3B8]">
            <span className="font-semibold text-[#334155] dark:text-[#CBD5E1]">
              {tr(language, 'End-to-End Execution Pipeline', '7-चरणीय कार्य पाइपलाइन')}
            </span>
            <span className="tabular-nums text-[#2563EB] dark:text-[#22D3EE] font-bold">
              {completedStages}/7 {tr(language, 'steps active', 'चरण सक्रिय')}
            </span>
          </div>
          <div className="grid grid-cols-7 gap-1 text-[10px]">
            {sevenStages.map((stage, idx) => {
              const done = idx < completedStages;
              return (
                <div
                  key={stage}
                  className={`py-1.5 px-1 rounded-md border text-center truncate font-bold flex flex-col items-center gap-0.5 ${
                    done
                      ? 'border-[#2563EB]/40 dark:border-[#22D3EE]/50 bg-[#EFF6FF] dark:bg-[#0F2E5F] text-[#071A35] dark:text-white'
                      : 'border-[#E2E8F0] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#071A35]/60 text-[#94A3B8] dark:text-[#64748B]'
                  }`}
                >
                  <CheckCircle2
                    className={`w-3 h-3 ${
                      done ? 'text-[#2563EB] dark:text-[#22D3EE]' : 'text-[#CBD5E1] dark:text-[#334155]'
                    }`}
                  />
                  <span className="truncate w-full">{stage}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
