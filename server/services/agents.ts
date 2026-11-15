import { DatabaseSync } from 'node:sqlite';
import { generateId } from '../utils/crypto.ts';
import { writeAuditLog } from '../db/database.ts';
import { generateCustomerMessage } from './geminiService.ts';
import { sendWhatsAppMessageViaProvider } from './integrations.ts';

export const SPECIALIZED_AGENTS = [
  {
    name: 'Customer Intelligence Agent',
    role: 'Builds customer profiles and purchase memory from orders, payment history, and preferences.',
    permissionScope: 'Read business customers, orders, payments',
  },
  {
    name: 'Behaviour & Prediction Agent',
    role: 'Identifies reorder windows, inactive buyers, and explainable COD delivery risks.',
    permissionScope: 'Score orders and classify customer cadence',
  },
  {
    name: 'Engagement & Copy Agent',
    role: 'Prepares polite customer messages in simple English, Hinglish, or Hindi.',
    permissionScope: 'Draft messages only (cannot send directly)',
  },
  {
    name: 'Policy & Safety Guard',
    role: 'Checks customer consent, opt-outs, quiet hours, frequency caps, and autonomy limits.',
    permissionScope: 'Enforce safety policy and block non-compliant sends',
  },
  {
    name: 'Execution & Measurement Agent',
    role: 'Dispatches approved messages via verified providers and tracks replies and order outcomes.',
    permissionScope: 'Execute permitted provider actions and record telemetry',
  },
] as const;

export interface PolicyEvaluation {
  allowed: boolean;
  requiresApproval: boolean;
  blockedReasons: string[];
  checks: {
    consentOk: boolean;
    notOptedOut: boolean;
    notEmergencyPaused: boolean;
    withinFrequencyCap: boolean;
    withinQuietHours: boolean;
    autonomyMode: string;
  };
}

export function getIstHour(): number {
  const now = new Date();
  const istString = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour12: false, hour: '2-digit' });
  return Number(istString) % 24;
}

export function isTimeInQuietHours(startHHMM: string, endHHMM: string, currentHour?: number): boolean {
  const hour = currentHour ?? getIstHour();
  const startH = Number(startHHMM.split(':')[0] || 21);
  const endH = Number(endHHMM.split(':')[0] || 9);
  if (startH > endH) {
    return hour >= startH || hour < endH;
  }
  return hour >= startH && hour < endH;
}

export function evaluatePolicyGuard(
  db: DatabaseSync,
  params: {
    businessId: string;
    customerId: string;
    actionType: 'reorder_reminder' | 'cod_prepay' | 'cod_verify' | 'udhaar_reminder' | 'winback_offer';
    confidence: number;
    overrideQuietHours?: boolean;
  }
): PolicyEvaluation {
  const settings = db
    .prepare('SELECT * FROM business_settings WHERE business_id = ?')
    .get(params.businessId) as
    | {
        reorder_mode: string;
        cod_prepay_mode: string;
        udhaar_mode: string;
        winback_mode: string;
        max_daily_messages: number;
        quiet_hours_start: string;
        quiet_hours_end: string;
        min_confidence: number;
        emergency_pause_all: number;
      }
    | undefined;

  const customer = db
    .prepare('SELECT consent_whatsapp, opted_out FROM customers WHERE id = ? AND business_id = ?')
    .get(params.customerId, params.businessId) as { consent_whatsapp: number; opted_out: number } | undefined;

  const recentMsgCount = db
    .prepare(
      `SELECT COUNT(*) AS cnt FROM message_history
       WHERE business_id = ? AND customer_id = ? AND direction = 'outbound'
         AND status IN ('sent', 'delivered', 'read', 'simulated')
         AND created_at >= datetime('now', '-48 hours')`
    )
    .get(params.businessId, params.customerId) as { cnt: number };

  const blockedReasons: string[] = [];
  const consentOk = Boolean(customer?.consent_whatsapp === 1);
  const notOptedOut = Boolean(customer && customer.opted_out === 0);
  const notEmergencyPaused = !settings?.emergency_pause_all;
  const maxMsgs = settings?.max_daily_messages ?? 1;
  const withinFrequencyCap = recentMsgCount.cnt < maxMsgs;
  const inQuiet = params.overrideQuietHours
    ? false
    : isTimeInQuietHours(settings?.quiet_hours_start || '21:00', settings?.quiet_hours_end || '09:00');
  const withinQuietHours = !inQuiet;

  if (!consentOk) blockedReasons.push('Customer has not granted WhatsApp consent.');
  if (!notOptedOut) blockedReasons.push('Customer has opted out of messages.');
  if (!notEmergencyPaused) blockedReasons.push('Emergency Pause All automation is active.');
  if (!withinFrequencyCap) blockedReasons.push(`48-hour frequency cap (${maxMsgs}) already reached for this customer.`);
  if (!withinQuietHours) {
    blockedReasons.push(`Currently in quiet hours (${settings?.quiet_hours_start || '21:00'}–${settings?.quiet_hours_end || '09:00'} IST).`);
  }

  let autonomyMode = 'approval_required';
  if (settings) {
    if (params.actionType === 'reorder_reminder') autonomyMode = settings.reorder_mode;
    else if (params.actionType === 'cod_prepay' || params.actionType === 'cod_verify') autonomyMode = settings.cod_prepay_mode;
    else if (params.actionType === 'udhaar_reminder') autonomyMode = settings.udhaar_mode;
    else if (params.actionType === 'winback_offer') autonomyMode = settings.winback_mode;
  }

  const minConf = settings?.min_confidence ?? 85;
  const canAutoExecute =
    autonomyMode === 'bounded_autonomous' &&
    params.confidence >= minConf &&
    blockedReasons.length === 0;

  return {
    allowed: consentOk && notOptedOut && notEmergencyPaused,
    requiresApproval: !canAutoExecute,
    blockedReasons,
    checks: {
      consentOk,
      notOptedOut,
      notEmergencyPaused,
      withinFrequencyCap,
      withinQuietHours,
      autonomyMode,
    },
  };
}

export function scoreCodOrderRisk(params: {
  isFirstTimeBuyer: boolean;
  pincode: string;
  address: string;
  amount: number;
  priorRtoCount?: number;
}): {
  score: number;
  band: 'low' | 'moderate' | 'high';
  reasons: string[];
  evidence: Record<string, unknown>;
  recommendedAction: string;
} {
  let score = 12;
  const reasons: string[] = [];

  if (params.isFirstTimeBuyer) {
    score += 24;
    reasons.push('First-time buyer with no prior delivered orders');
  } else {
    score -= 6;
  }

  if (params.priorRtoCount && params.priorRtoCount > 0) {
    score += 25;
    reasons.push(`${params.priorRtoCount} previous undelivered/returned order(s)`);
  }

  const elevatedPincodes = ['141001', '800001', '226001', '395007'];
  if (elevatedPincodes.includes(params.pincode.trim())) {
    score += 18;
    reasons.push(`Pincode ${params.pincode} has elevated regional return history`);
  }

  const addr = params.address.trim();
  const hasUnitNumber = /\d+/.test(addr) && addr.length >= 18;
  if (!hasUnitNumber) {
    score += 18;
    reasons.push('Delivery address appears incomplete (missing flat, house, or street number)');
  }

  if (params.amount >= 2500) {
    score += 14;
    reasons.push(`High COD order value (₹${params.amount.toLocaleString('en-IN')})`);
  }

  score = Math.max(5, Math.min(95, score));
  const band: 'low' | 'moderate' | 'high' = score >= 60 ? 'high' : score >= 35 ? 'moderate' : 'low';
  const recommendedAction =
    band === 'high'
      ? 'Verify address with customer or prepare an optional UPI prepayment request before dispatch.'
      : band === 'moderate'
      ? 'Confirm delivery address via WhatsApp before booking courier.'
      : 'Low risk — proceed with standard dispatch.';

  return {
    score,
    band,
    reasons,
    evidence: {
      isFirstTimeBuyer: params.isFirstTimeBuyer,
      hasUnitNumber,
      pincode: params.pincode,
      orderAmount: params.amount,
      priorRtoCount: params.priorRtoCount ?? 0,
    },
    recommendedAction,
  };
}

export async function runOrchestratorWorkflow(
  db: DatabaseSync,
  params: {
    businessId: string;
    userId: string | null;
    workflowType: 'reactivation' | 'cod_protection' | 'udhaar_collection' | 'reorder_scan';
    targetCustomerId?: string;
    targetOrderId?: string;
    mode: 'demo' | 'live';
    language?: string;
    triggerSource?: string;
  }
): Promise<{
  workflowId: string;
  status: string;
  approvalId?: string;
  deduplicated?: boolean;
  tasks: Array<{ agentName: string; status: string; reason: string }>;
  message: string;
}> {
  const workflowId = generateId('WF');
  const isDemo = params.mode === 'demo' ? 1 : 0;

  // Step 1: Select target customer/order if not explicitly passed
  let customer: Record<string, any> | undefined;
  let order: Record<string, any> | undefined;

  if (params.targetOrderId) {
    order = db
      .prepare('SELECT * FROM orders WHERE id = ? AND business_id = ?')
      .get(params.targetOrderId, params.businessId) as Record<string, any> | undefined;
    if (order) {
      customer = db
        .prepare('SELECT * FROM customers WHERE id = ? AND business_id = ?')
        .get(order.customer_id, params.businessId) as Record<string, any> | undefined;
    }
  } else if (params.targetCustomerId) {
    customer = db
      .prepare('SELECT * FROM customers WHERE id = ? AND business_id = ?')
      .get(params.targetCustomerId, params.businessId) as Record<string, any> | undefined;
  } else if (params.workflowType === 'cod_protection') {
    order = db
      .prepare(
        `SELECT * FROM orders WHERE business_id = ? AND payment_mode = 'COD' AND status = 'Pending_Verification'
         ORDER BY cod_risk_score DESC LIMIT 1`
      )
      .get(params.businessId) as Record<string, any> | undefined;
    if (order) {
      customer = db
        .prepare('SELECT * FROM customers WHERE id = ? AND business_id = ?')
        .get(order.customer_id, params.businessId) as Record<string, any> | undefined;
    }
  } else if (params.workflowType === 'udhaar_collection') {
    customer = db
      .prepare(
        `SELECT * FROM customers WHERE business_id = ? AND outstanding_udhaar > 0
         ORDER BY outstanding_udhaar DESC LIMIT 1`
      )
      .get(params.businessId) as Record<string, any> | undefined;
  } else {
    customer = db
      .prepare(
        `SELECT * FROM customers WHERE business_id = ? AND (segment IN ('reorder_due', 'inactive', 'at_risk') OR days_since_last_order >= average_cadence_days)
         ORDER BY days_since_last_order DESC LIMIT 1`
      )
      .get(params.businessId) as Record<string, any> | undefined;
  }

  if (!customer) {
    db.prepare(
      `INSERT INTO agent_workflows (id, business_id, workflow_type, trigger_source, target_type, target_id, status, current_step, error_message, is_demo)
       VALUES (?, ?, ?, ?, 'business', ?, 'escalated', 'understand', 'No eligible customer or order found for this workflow.', ?)`
    ).run(workflowId, params.businessId, params.workflowType, params.triggerSource || 'manual', params.businessId, isDemo);

    return {
      workflowId,
      status: 'escalated',
      tasks: [],
      message: 'No matching customer or order found in your store records yet. Import customers or orders to run this workflow.',
    };
  }

  const targetType = order ? 'order' : 'customer';
  const targetId = String(order ? order.id : customer.id);

  // Idempotency: avoid duplicate awaiting_approval workflows for the exact same target & type within 15 minutes
  if (params.triggerSource !== 'retry') {
    const existingWf = db
      .prepare(
        `SELECT w.id AS workflow_id, a.id AS approval_id, a.title
         FROM agent_workflows w
         JOIN approvals a ON a.workflow_id = w.id
         WHERE w.business_id = ? AND w.workflow_type = ? AND w.target_id = ?
           AND w.status = 'awaiting_approval' AND a.status = 'pending_approval'
           AND w.created_at >= datetime('now', '-15 minutes')
         ORDER BY w.created_at DESC LIMIT 1`
      )
      .get(params.businessId, params.workflowType, targetId) as
      | { workflow_id: string; approval_id: string; title: string }
      | undefined;

    if (existingWf) {
      const existingTasks = db
        .prepare(`SELECT agent_name, status, reason FROM agent_tasks WHERE workflow_id = ? ORDER BY step_order ASC`)
        .all(existingWf.workflow_id) as Array<{ agent_name: string; status: string; reason: string }>;
      return {
        workflowId: existingWf.workflow_id,
        status: 'awaiting_approval',
        approvalId: existingWf.approval_id,
        deduplicated: true,
        tasks: existingTasks.map((t) => ({
          agentName: t.agent_name,
          status: t.status,
          reason: t.reason,
        })),
        message: `"${existingWf.title}" is already queued in your Approval Inbox.`,
      };
    }
  }

  db.prepare(
    `INSERT INTO agent_workflows (id, business_id, workflow_type, trigger_source, target_type, target_id, status, current_step, input_json, is_demo)
     VALUES (?, ?, ?, ?, ?, ?, 'running', 'understand', ?, ?)`
  ).run(
    workflowId,
    params.businessId,
    params.workflowType,
    params.triggerSource || 'manual',
    targetType,
    targetId,
    JSON.stringify({ customerId: customer.id, orderId: order?.id }),
    isDemo
  );

  const tasksOut: Array<{ agentName: string; status: string; reason: string }> = [];
  const insertTask = db.prepare(
    `INSERT INTO agent_tasks (id, workflow_id, business_id, agent_name, step_order, status, input_json, output_json, reason, confidence, duration_ms, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
  );

  // Agent 1: Customer Intelligence Agent
  const t1Start = Date.now();
  const intelReason = `Loaded profile for ${customer.name} (${customer.total_orders} orders, ₹${Number(customer.total_spent).toLocaleString('en-IN')} spend, ₹${Number(customer.outstanding_udhaar).toLocaleString('en-IN')} udhaar).`;
  insertTask.run(
    generateId('TSK'),
    workflowId,
    params.businessId,
    'Customer Intelligence Agent',
    1,
    'completed',
    JSON.stringify({ customerId: customer.id }),
    JSON.stringify({ segment: customer.segment, cadenceDays: customer.average_cadence_days }),
    intelReason,
    92,
    Math.max(12, Date.now() - t1Start)
  );
  tasksOut.push({ agentName: 'Customer Intelligence Agent', status: 'completed', reason: intelReason });

  // Agent 2: Behaviour & Prediction Agent
  const t2Start = Date.now();
  let actionType: 'reorder_reminder' | 'cod_prepay' | 'cod_verify' | 'udhaar_reminder' | 'winback_offer' = 'reorder_reminder';
  let confidence = 88;
  let predReason = '';
  let title = '';
  let impact = '';

  if (params.workflowType === 'cod_protection' && order) {
    const risk = scoreCodOrderRisk({
      isFirstTimeBuyer: Number(customer.total_orders) <= 1,
      pincode: String(order.pincode || customer.pincode || ''),
      address: String(order.delivery_address || customer.address_line || ''),
      amount: Number(order.total_amount || 0),
    });
    actionType = risk.score >= 60 ? 'cod_prepay' : 'cod_verify';
    confidence = Math.min(95, Math.max(70, risk.score + 18));
    predReason = `COD risk score ${risk.score}/100: ${risk.reasons.join('; ') || 'Standard order check'}.`;
    title = `COD Risk Check: Order ${order.order_number}`;
    impact = risk.recommendedAction;
  } else if (params.workflowType === 'udhaar_collection') {
    actionType = 'udhaar_reminder';
    confidence = 91;
    predReason = `Pending udhaar of ₹${Number(customer.outstanding_udhaar).toLocaleString('en-IN')} (due ${customer.udhaar_due_date || 'soon'}).`;
    title = `Udhaar Follow-Up: ${customer.name}`;
    impact = `Follow up on ₹${Number(customer.outstanding_udhaar).toLocaleString('en-IN')} balance`;
  } else if (Number(customer.days_since_last_order) >= Math.max(60, Number(customer.average_cadence_days) * 2)) {
    actionType = 'winback_offer';
    confidence = 86;
    predReason = `No purchase in ${customer.days_since_last_order} days (typical cycle ${customer.average_cadence_days} days).`;
    title = `Customer Reactivation: ${customer.name}`;
    impact = `Invite repeat order on ${customer.last_product_ordered || 'recent product'}`;
  } else {
    actionType = 'reorder_reminder';
    confidence = 90;
    predReason = `Customer is ${customer.days_since_last_order} days since last order (cycle: ${customer.average_cadence_days} days).`;
    title = `Reorder Check-in: ${customer.name}`;
    impact = `Prompt repeat order for ${customer.last_product_ordered || 'regular items'}`;
  }

  insertTask.run(
    generateId('TSK'),
    workflowId,
    params.businessId,
    'Behaviour & Prediction Agent',
    2,
    'completed',
    JSON.stringify({ actionType }),
    JSON.stringify({ confidence, predReason }),
    predReason,
    confidence,
    Math.max(15, Date.now() - t2Start)
  );
  tasksOut.push({ agentName: 'Behaviour & Prediction Agent', status: 'completed', reason: predReason });
  db.prepare(`UPDATE agent_workflows SET current_step = 'decide', updated_at = datetime('now') WHERE id = ?`).run(workflowId);

  // Agent 3: Engagement & Copy Agent
  const t3Start = Date.now();
  const draftResult = await generateCustomerMessage({
    customerName: String(customer.name),
    customerCity: String(customer.city || ''),
    productName: String(customer.last_product_ordered || ''),
    lastOrderDaysAgo: Number(customer.days_since_last_order || 0),
    actionType,
    language: params.language || String(customer.preferred_language || 'hinglish'),
    udhaarAmount: Number(customer.outstanding_udhaar || 0),
    orderId: order ? String(order.order_number) : undefined,
  });
  const copyReason = `Drafted personalized message via ${draftResult.model}.`;
  insertTask.run(
    generateId('TSK'),
    workflowId,
    params.businessId,
    'Engagement & Copy Agent',
    3,
    'completed',
    JSON.stringify({ language: params.language || customer.preferred_language }),
    JSON.stringify({ model: draftResult.model, draft: draftResult.draft }),
    copyReason,
    confidence,
    Math.max(25, Date.now() - t3Start)
  );
  tasksOut.push({ agentName: 'Engagement & Copy Agent', status: 'completed', reason: copyReason });
  db.prepare(`UPDATE agent_workflows SET current_step = 'act', updated_at = datetime('now') WHERE id = ?`).run(workflowId);

  // Agent 4: Policy & Safety Guard
  const policy = evaluatePolicyGuard(db, {
    businessId: params.businessId,
    customerId: String(customer.id),
    actionType,
    confidence,
  });

  if (!policy.allowed) {
    const failReason = `Policy blocked execution: ${policy.blockedReasons.join(' ')}`;
    insertTask.run(
      generateId('TSK'),
      workflowId,
      params.businessId,
      'Policy & Safety Guard',
      4,
      'escalated',
      JSON.stringify({ actionType }),
      JSON.stringify(policy),
      failReason,
      null,
      10
    );
    db.prepare(
      `UPDATE agent_workflows SET status = 'escalated', current_step = 'policy_blocked', error_message = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(failReason, workflowId);
    tasksOut.push({ agentName: 'Policy & Safety Guard', status: 'escalated', reason: failReason });

    return {
      workflowId,
      status: 'escalated',
      tasks: tasksOut,
      message: failReason,
    };
  }

  const guardReason = policy.requiresApproval
    ? `Consent verified. Queued for merchant approval (${policy.checks.autonomyMode}).${policy.blockedReasons.length ? ' Note: ' + policy.blockedReasons.join(' ') : ''}`
    : 'Consent, quiet hours, frequency cap, and confidence checks passed for bounded autonomy.';

  insertTask.run(
    generateId('TSK'),
    workflowId,
    params.businessId,
    'Policy & Safety Guard',
    4,
    'completed',
    JSON.stringify({ actionType }),
    JSON.stringify(policy),
    guardReason,
    100,
    14
  );
  tasksOut.push({ agentName: 'Policy & Safety Guard', status: 'completed', reason: guardReason });

  // Create persistent Approval record
  const approvalId = generateId('ACT');
  db.prepare(
    `INSERT INTO approvals (
      id, business_id, workflow_id, customer_id, order_id, action_type, title, reason,
      agent_name, required_permission, confidence, potential_impact, suggested_message,
      channel, status, metadata_json, is_demo
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'whatsapp_send', ?, ?, ?, 'WhatsApp', ?, ?, ?)`
  ).run(
    approvalId,
    params.businessId,
    workflowId,
    customer.id,
    order?.id || null,
    actionType,
    title,
    predReason,
    'Engagement & Copy Agent',
    confidence,
    impact,
    draftResult.draft,
    policy.requiresApproval ? 'pending_approval' : 'approved',
    JSON.stringify({
      orderId: order?.id,
      orderAmount: order?.total_amount,
      udhaarAmount: customer.outstanding_udhaar,
      productName: customer.last_product_ordered,
    }),
    isDemo
  );

  if (policy.requiresApproval) {
    db.prepare(
      `UPDATE agent_workflows SET status = 'awaiting_approval', current_step = 'approval_checkpoint', result_json = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(JSON.stringify({ approvalId }), workflowId);

    writeAuditLog(db, {
      id: generateId('AUD'),
      businessId: params.businessId,
      userId: params.userId,
      actorType: 'agent',
      action: 'workflow_awaiting_approval',
      entityType: 'workflow',
      entityId: workflowId,
      details: { approvalId, actionType, customerId: customer.id },
    });

    return {
      workflowId,
      status: 'awaiting_approval',
      approvalId,
      tasks: tasksOut,
      message: `Prepared "${title}" and placed it in your Approval Inbox.`,
    };
  }

  // Agent 5: Execution & Measurement Agent (Bounded Autonomous execution)
  const execResult = await executeApprovedAction(db, {
    businessId: params.businessId,
    approvalId,
    userId: params.userId,
    mode: params.mode,
  });
  tasksOut.push({
    agentName: 'Execution & Measurement Agent',
    status: execResult.ok ? 'completed' : 'failed',
    reason: execResult.message,
  });

  return {
    workflowId,
    status: execResult.ok ? 'completed' : 'failed',
    approvalId,
    tasks: tasksOut,
    message: execResult.message,
  };
}

export async function executeApprovedAction(
  db: DatabaseSync,
  params: {
    businessId: string;
    approvalId: string;
    userId: string | null;
    mode: 'demo' | 'live';
    overrideQuietHours?: boolean;
  }
): Promise<{ ok: boolean; status: string; alreadyExecuted?: boolean; message: string }> {
  const approval = db
    .prepare(
      `SELECT a.*, c.phone, c.name AS customer_name, c.holdout_group
       FROM approvals a
       JOIN customers c ON c.id = a.customer_id
       WHERE a.id = ? AND a.business_id = ?`
    )
    .get(params.approvalId, params.businessId) as Record<string, any> | undefined;

  if (!approval) {
    return { ok: false, status: 'failed', message: 'Approval record not found.' };
  }

  // Idempotency guard: never dispatch the same approval twice
  if (approval.status === 'executed') {
    return {
      ok: true,
      status: 'executed',
      alreadyExecuted: true,
      message: `Action for ${approval.customer_name} was already executed.`,
    };
  }

  const policy = evaluatePolicyGuard(db, {
    businessId: params.businessId,
    customerId: String(approval.customer_id),
    actionType: approval.action_type,
    confidence: Number(approval.confidence || 80),
    overrideQuietHours: params.overrideQuietHours ?? true,
  });

  if (!policy.allowed) {
    db.prepare(`UPDATE approvals SET status = 'escalated', updated_at = datetime('now') WHERE id = ?`).run(approval.id);
    return {
      ok: false,
      status: 'escalated',
      message: `Policy guard blocked dispatch: ${policy.blockedReasons.join(' ')}`,
    };
  }

  const sendResult = await sendWhatsAppMessageViaProvider(db, {
    businessId: params.businessId,
    toPhone: String(approval.phone),
    body: String(approval.suggested_message),
    mode: params.mode,
  });

  const isDemo = params.mode === 'demo' ? 1 : 0;
  const msgId = generateId('MSG');

  db.prepare(
    `INSERT INTO message_history (id, business_id, customer_id, approval_id, channel, direction, body, status, provider_message_id, error_message, is_demo)
     VALUES (?, ?, ?, ?, 'WhatsApp', 'outbound', ?, ?, ?, ?, ?)`
  ).run(
    msgId,
    params.businessId,
    approval.customer_id,
    approval.id,
    approval.suggested_message,
    sendResult.status,
    sendResult.providerMessageId || '',
    sendResult.error || '',
    isDemo
  );

  if (approval.workflow_id) {
    db.prepare(
      `INSERT INTO agent_tasks (id, workflow_id, business_id, agent_name, step_order, status, input_json, output_json, reason, duration_ms, error_message, completed_at)
       VALUES (?, ?, ?, 'Execution & Measurement Agent', 5, ?, ?, ?, ?, 60, ?, datetime('now'))`
    ).run(
      generateId('TSK'),
      approval.workflow_id,
      params.businessId,
      sendResult.ok ? 'completed' : 'failed',
      JSON.stringify({ approvalId: approval.id, channel: 'WhatsApp' }),
      JSON.stringify(sendResult),
      sendResult.ok ? `Dispatched (${sendResult.status})` : sendResult.error || 'Dispatch failed',
      sendResult.error || ''
    );

    db.prepare(
      `UPDATE agent_workflows
       SET status = ?, current_step = ?, error_message = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      sendResult.ok ? 'completed' : 'failed',
      sendResult.ok ? 'measure' : 'execution_failed',
      sendResult.error || '',
      approval.workflow_id
    );
  }

  if (!sendResult.ok) {
    db.prepare(`UPDATE approvals SET status = 'failed', updated_at = datetime('now') WHERE id = ?`).run(approval.id);
    writeAuditLog(db, {
      id: generateId('AUD'),
      businessId: params.businessId,
      userId: params.userId,
      actorType: 'agent',
      action: 'action_execution_failed',
      entityType: 'approval',
      entityId: approval.id,
      details: { error: sendResult.error },
    });
    return { ok: false, status: 'failed', message: sendResult.error || 'Provider execution failed.' };
  }

  db.prepare(`UPDATE approvals SET status = 'executed', updated_at = datetime('now') WHERE id = ?`).run(approval.id);

  db.prepare(
    `INSERT INTO analytics_events (id, business_id, event_type, customer_id, order_id, amount, holdout_group, metadata_json, is_demo)
     VALUES (?, ?, 'action_executed', ?, ?, 0, ?, ?, ?)`
  ).run(
    generateId('EVT'),
    params.businessId,
    approval.customer_id,
    approval.order_id || null,
    approval.holdout_group || 0,
    JSON.stringify({ actionType: approval.action_type, mode: params.mode }),
    isDemo
  );

  writeAuditLog(db, {
    id: generateId('AUD'),
    businessId: params.businessId,
    userId: params.userId,
    actorType: 'merchant',
    action: 'action_approved_and_executed',
    entityType: 'approval',
    entityId: approval.id,
    details: { messageStatus: sendResult.status, providerMessageId: sendResult.providerMessageId },
  });

  return {
    ok: true,
    status: 'executed',
    message:
      params.mode === 'demo'
        ? `Demo Mode: Simulated WhatsApp dispatch to ${approval.customer_name} recorded.`
        : `Sent WhatsApp message to ${approval.customer_name} (${sendResult.providerMessageId}).`,
  };
}

export function reconcileOutcomeWorkflows(
  db: DatabaseSync,
  params: {
    businessId: string;
    customerId: string;
    orderId?: string;
    outcomeType: 'udhaar_payment' | 'repeat_order' | 'cod_delivered' | 'cod_rto';
    summary: string;
    amount?: number;
  }
): number {
  const workflowTypes =
    params.outcomeType === 'udhaar_payment'
      ? ['udhaar_collection']
      : params.outcomeType === 'repeat_order'
      ? ['reactivation', 'reorder_scan']
      : ['cod_protection'];

  const targetIds = [params.customerId, params.orderId].filter(Boolean) as string[];
  if (targetIds.length === 0) return 0;

  const placeholdersType = workflowTypes.map(() => '?').join(',');
  const placeholdersTarget = targetIds.map(() => '?').join(',');

  const matchingWorkflows = db
    .prepare(
      `SELECT id, status FROM agent_workflows
       WHERE business_id = ?
         AND workflow_type IN (${placeholdersType})
         AND target_id IN (${placeholdersTarget})
         AND status IN ('awaiting_approval', 'running', 'approved', 'executing', 'completed')
       ORDER BY created_at DESC LIMIT 3`
    )
    .all(params.businessId, ...workflowTypes, ...targetIds) as Array<{ id: string; status: string }>;

  let reconciled = 0;
  for (const wf of matchingWorkflows) {
    const hasVerifyTask = db
      .prepare(
        `SELECT id FROM agent_tasks WHERE workflow_id = ? AND step_order = 6 LIMIT 1`
      )
      .get(wf.id);

    if (!hasVerifyTask) {
      db.prepare(
        `INSERT INTO agent_tasks (id, workflow_id, business_id, agent_name, step_order, status, input_json, output_json, reason, confidence, duration_ms, completed_at)
         VALUES (?, ?, ?, 'Execution & Measurement Agent', 6, 'completed', ?, ?, ?, 100, 18, datetime('now'))`
      ).run(
        generateId('TSK'),
        wf.id,
        params.businessId,
        JSON.stringify({ outcomeType: params.outcomeType, amount: params.amount ?? 0 }),
        JSON.stringify({ verified: true }),
        params.summary
      );
    }

    db.prepare(
      `UPDATE agent_workflows
       SET status = 'completed', current_step = 'measure', updated_at = datetime('now')
       WHERE id = ?`
    ).run(wf.id);
    reconciled += 1;
  }

  return reconciled;
}
