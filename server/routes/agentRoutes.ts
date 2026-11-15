import express from 'express';
import { getDb, writeAuditLog } from '../db/database.ts';
import {
  SPECIALIZED_AGENTS,
  executeApprovedAction,
  runOrchestratorWorkflow,
} from '../services/agents.ts';
import {
  generateCopilotAnalysis,
  generateCustomerMessage,
  parseVoiceCommand,
} from '../services/geminiService.ts';
import type { IntegrationProvider } from '../services/integrations.ts';
import {
  decryptCredentialsSafe,
  disconnectIntegration,
  listIntegrations,
  syncShopifyCustomersAndOrders,
  verifyAndConnectIntegration,
} from '../services/integrations.ts';
import { generateId, verifyHmacSignature } from '../utils/crypto.ts';
import { rateLimit } from '../utils/rateLimit.ts';

export const agentRouter = express.Router();

const aiLimiter = rateLimit({ windowMs: 60_000, max: 40, keyPrefix: 'ai' });

// 1. AGENTS & WORKFLOWS
agentRouter.get('/agents', (req, res) => {
  const db = getDb();
  const businessId = req.auth!.businessId;

  const statsRows = db
    .prepare(
      `SELECT agent_name,
              COUNT(*) AS total_runs,
              SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_runs,
              SUM(CASE WHEN status IN ('failed', 'escalated') THEN 1 ELSE 0 END) AS attention_runs,
              ROUND(AVG(COALESCE(duration_ms, 0))) AS avg_duration_ms
       FROM agent_tasks
       WHERE business_id = ?
       GROUP BY agent_name`
    )
    .all(businessId) as Array<{
    agent_name: string;
    total_runs: number;
    completed_runs: number;
    attention_runs: number;
    avg_duration_ms: number;
  }>;

  const statsMap = new Map(statsRows.map((r) => [r.agent_name, r]));

  const recentTasks = db
    .prepare(
      `SELECT id, workflow_id, agent_name, status, reason, duration_ms, created_at
       FROM agent_tasks
       WHERE business_id = ?
       ORDER BY created_at DESC LIMIT 15`
    )
    .all(businessId);

  const agents = SPECIALIZED_AGENTS.map((a) => {
    const s = statsMap.get(a.name);
    return {
      ...a,
      totalRuns: s?.total_runs ?? 0,
      completedRuns: s?.completed_runs ?? 0,
      attentionRuns: s?.attention_runs ?? 0,
      avgDurationMs: s?.avg_duration_ms ?? 0,
    };
  });

  return res.json({ agents, recentTasks });
});

agentRouter.get('/workflows', (req, res) => {
  const db = getDb();
  const businessId = req.auth!.businessId;

  const workflows = db
    .prepare(
      `SELECT * FROM agent_workflows WHERE business_id = ? ORDER BY created_at DESC LIMIT 30`
    )
    .all(businessId) as Array<Record<string, any>>;

  const tasksByWf = new Map<string, unknown[]>();
  const tasks = db
    .prepare(
      `SELECT * FROM agent_tasks WHERE business_id = ? ORDER BY step_order ASC`
    )
    .all(businessId) as Array<Record<string, any>>;

  for (const t of tasks) {
    const wfId = String(t.workflow_id);
    if (!tasksByWf.has(wfId)) tasksByWf.set(wfId, []);
    tasksByWf.get(wfId)!.push(t);
  }

  return res.json({
    workflows: workflows.map((wf) => ({
      ...wf,
      tasks: tasksByWf.get(String(wf.id)) || [],
    })),
  });
});

agentRouter.post('/workflows/run', async (req, res, next) => {
  try {
    const db = getDb();
    const {
      workflowType = 'reactivation',
      targetCustomerId,
      targetOrderId,
      language,
    } = req.body || {};

    const allowedTypes = ['reactivation', 'cod_protection', 'udhaar_collection', 'reorder_scan'];
    if (!allowedTypes.includes(workflowType)) {
      return res.status(400).json({ error: 'Invalid workflowType.' });
    }

    const result = await runOrchestratorWorkflow(db, {
      businessId: req.auth!.businessId,
      userId: req.auth!.userId,
      workflowType,
      targetCustomerId,
      targetOrderId,
      mode: req.auth!.mode,
      language,
      triggerSource: 'merchant_console',
    });

    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
});

agentRouter.post('/workflows/:id/retry', async (req, res, next) => {
  try {
    const db = getDb();
    const wf = db
      .prepare('SELECT * FROM agent_workflows WHERE id = ? AND business_id = ?')
      .get(req.params.id, req.auth!.businessId) as Record<string, any> | undefined;

    if (!wf) return res.status(404).json({ error: 'Workflow not found.' });

    const input = JSON.parse(String(wf.input_json || '{}')) as { customerId?: string; orderId?: string };
    const retried = await runOrchestratorWorkflow(db, {
      businessId: req.auth!.businessId,
      userId: req.auth!.userId,
      workflowType: wf.workflow_type,
      targetCustomerId: input.customerId,
      targetOrderId: input.orderId,
      mode: req.auth!.mode,
      triggerSource: 'retry',
    });

    return res.json(retried);
  } catch (err) {
    return next(err);
  }
});

agentRouter.post('/workflows/:id/escalate', (req, res) => {
  const db = getDb();
  const wf = db
    .prepare('SELECT id FROM agent_workflows WHERE id = ? AND business_id = ?')
    .get(req.params.id, req.auth!.businessId);

  if (!wf) return res.status(404).json({ error: 'Workflow not found.' });

  const reason = String(req.body?.reason || 'Escalated for human review by merchant.');
  db.prepare(
    `UPDATE agent_workflows SET status = 'escalated', current_step = 'human_review', error_message = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(reason, req.params.id);

  writeAuditLog(db, {
    id: generateId('AUD'),
    businessId: req.auth!.businessId,
    userId: req.auth!.userId,
    actorType: 'merchant',
    action: 'workflow_escalated',
    entityType: 'workflow',
    entityId: req.params.id,
    details: { reason },
  });

  return res.json({ ok: true });
});

// 2. APPROVAL INBOX
agentRouter.get('/approvals', (req, res) => {
  const db = getDb();
  const status = String(req.query.status || 'all');
  const where = ['a.business_id = ?'];
  const params: string[] = [req.auth!.businessId];
  if (status !== 'all') {
    where.push('a.status = ?');
    params.push(status);
  }

  const approvals = db
    .prepare(
      `SELECT a.*,
              c.name AS customer_name,
              c.phone AS customer_phone,
              c.city AS customer_city,
              c.last_product_ordered AS customer_last_product,
              c.consent_whatsapp,
              c.opted_out,
              w.status AS workflow_status,
              w.current_step AS workflow_current_step,
              (SELECT m.status FROM message_history m WHERE m.approval_id = a.id ORDER BY m.created_at DESC LIMIT 1) AS execution_status,
              (SELECT m.provider_message_id FROM message_history m WHERE m.approval_id = a.id ORDER BY m.created_at DESC LIMIT 1) AS provider_message_id,
              (SELECT m.error_message FROM message_history m WHERE m.approval_id = a.id ORDER BY m.created_at DESC LIMIT 1) AS execution_error,
              (SELECT m.created_at FROM message_history m WHERE m.approval_id = a.id ORDER BY m.created_at DESC LIMIT 1) AS executed_at
       FROM approvals a
       JOIN customers c ON c.id = a.customer_id
       LEFT JOIN agent_workflows w ON w.id = a.workflow_id
       WHERE ${where.join(' AND ')}
       ORDER BY CASE WHEN a.status = 'pending_approval' THEN 0 ELSE 1 END, a.created_at DESC`
    )
    .all(...params);

  return res.json({ approvals });
});

agentRouter.patch('/approvals/:id', (req, res) => {
  const db = getDb();
  const { suggestedMessage } = req.body || {};
  if (!suggestedMessage || !String(suggestedMessage).trim()) {
    return res.status(400).json({ error: 'Message text cannot be empty.' });
  }

  const existing = db
    .prepare('SELECT id FROM approvals WHERE id = ? AND business_id = ?')
    .get(req.params.id, req.auth!.businessId);
  if (!existing) return res.status(404).json({ error: 'Approval item not found.' });

  db.prepare(`UPDATE approvals SET suggested_message = ?, updated_at = datetime('now') WHERE id = ?`).run(
    String(suggestedMessage).trim(),
    req.params.id
  );

  writeAuditLog(db, {
    id: generateId('AUD'),
    businessId: req.auth!.businessId,
    userId: req.auth!.userId,
    actorType: 'merchant',
    action: 'approval_draft_edited',
    entityType: 'approval',
    entityId: req.params.id,
  });

  return res.json({ ok: true, approval: db.prepare('SELECT * FROM approvals WHERE id = ?').get(req.params.id) });
});

agentRouter.post('/approvals/:id/decision', async (req, res, next) => {
  try {
    const db = getDb();
    const businessId = req.auth!.businessId;
    const { decision, reason = '', scheduledFor = '', overrideQuietHours = true } = req.body || {};

    const existing = db
      .prepare('SELECT * FROM approvals WHERE id = ? AND business_id = ?')
      .get(req.params.id, businessId) as Record<string, any> | undefined;
    if (!existing) return res.status(404).json({ error: 'Approval item not found.' });

    if (decision === 'approve' || decision === 'retry') {
      const execRes = await executeApprovedAction(db, {
        businessId,
        approvalId: req.params.id,
        userId: req.auth!.userId,
        mode: req.auth!.mode,
        overrideQuietHours: Boolean(overrideQuietHours),
      });
      return res.status(execRes.ok ? 200 : 422).json(execRes);
    }

    if (decision === 'reject') {
      let existingMeta: Record<string, unknown> = {};
      try {
        existingMeta = JSON.parse(String(existing.metadata_json || '{}'));
      } catch {
        existingMeta = {};
      }
      const nextMeta = JSON.stringify({
        ...existingMeta,
        rejectionReason: String(reason || 'Dismissed by merchant'),
      });
      db.prepare(`UPDATE approvals SET status = 'rejected', metadata_json = ?, updated_at = datetime('now') WHERE id = ?`).run(
        nextMeta,
        req.params.id
      );
      if (existing.workflow_id) {
        db.prepare(`UPDATE agent_workflows SET status = 'completed', current_step = 'rejected_by_merchant', updated_at = datetime('now') WHERE id = ?`).run(existing.workflow_id);
      }
      writeAuditLog(db, {
        id: generateId('AUD'),
        businessId,
        userId: req.auth!.userId,
        actorType: 'merchant',
        action: 'approval_rejected',
        entityType: 'approval',
        entityId: req.params.id,
        details: { reason },
      });
      return res.json({ ok: true, status: 'rejected', message: 'Action rejected and logged.' });
    }

    if (decision === 'snooze' || decision === 'schedule') {
      const effectiveSchedule = scheduledFor || new Date(Date.now() + 24 * 3600_000).toISOString();
      db.prepare(`UPDATE approvals SET status = 'snoozed', scheduled_for = ?, updated_at = datetime('now') WHERE id = ?`).run(
        effectiveSchedule,
        req.params.id
      );
      writeAuditLog(db, {
        id: generateId('AUD'),
        businessId,
        userId: req.auth!.userId,
        actorType: 'merchant',
        action: decision === 'schedule' ? 'approval_scheduled' : 'approval_snoozed',
        entityType: 'approval',
        entityId: req.params.id,
        details: { scheduledFor: effectiveSchedule },
      });
      return res.json({
        ok: true,
        status: 'snoozed',
        scheduledFor: effectiveSchedule,
        message: decision === 'schedule' ? 'Action scheduled.' : 'Action snoozed.',
      });
    }

    if (decision === 'escalate') {
      db.prepare(`UPDATE approvals SET status = 'escalated', updated_at = datetime('now') WHERE id = ?`).run(req.params.id);
      return res.json({ ok: true, status: 'escalated', message: 'Escalated for manual review.' });
    }

    return res.status(400).json({ error: 'Unsupported decision.' });
  } catch (err) {
    return next(err);
  }
});

agentRouter.post('/approvals/bulk-approve', async (req, res, next) => {
  try {
    const db = getDb();
    const businessId = req.auth!.businessId;
    const ids = Array.isArray(req.body?.ids) ? (req.body.ids as string[]) : [];
    if (ids.length === 0) {
      return res.status(400).json({ error: 'No approval IDs selected.' });
    }

    const results: Array<{ id: string; ok: boolean; message: string }> = [];
    for (const id of ids) {
      const r = await executeApprovedAction(db, {
        businessId,
        approvalId: id,
        userId: req.auth!.userId,
        mode: req.auth!.mode,
        overrideQuietHours: true,
      });
      results.push({ id, ok: r.ok, message: r.message });
    }

    return res.json({
      ok: results.every((r) => r.ok),
      succeeded: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      results,
    });
  } catch (err) {
    return next(err);
  }
});

// 3. INTEGRATIONS & WEBHOOKS
agentRouter.get('/integrations', (req, res) => {
  const db = getDb();
  const integrations = listIntegrations(db, req.auth!.businessId);
  return res.json({ integrations, mode: req.auth!.mode });
});

agentRouter.post('/integrations/:provider/connect', async (req, res, next) => {
  try {
    const provider = req.params.provider as IntegrationProvider;
    if (!['whatsapp', 'shopify', 'shiprocket', 'razorpay', 'gemini'].includes(provider)) {
      return res.status(400).json({ error: 'Unknown integration provider.' });
    }

    const db = getDb();
    const result = await verifyAndConnectIntegration(db, {
      businessId: req.auth!.businessId,
      userId: req.auth!.userId,
      provider,
      credentials: req.body?.credentials || {},
    });

    return res.status(result.ok ? 200 : 400).json(result);
  } catch (err) {
    return next(err);
  }
});

agentRouter.post('/integrations/:provider/disconnect', (req, res) => {
  const provider = req.params.provider as IntegrationProvider;
  if (!['whatsapp', 'shopify', 'shiprocket', 'razorpay', 'gemini'].includes(provider)) {
    return res.status(400).json({ error: 'Unknown integration provider.' });
  }

  const db = getDb();
  disconnectIntegration(db, req.auth!.businessId, req.auth!.userId, provider);
  return res.json({ ok: true, status: 'disconnected' });
});

agentRouter.post('/integrations/shopify/sync', async (req, res, next) => {
  try {
    const db = getDb();
    const result = await syncShopifyCustomersAndOrders(db, req.auth!.businessId, req.auth!.userId);
    return res.status(result.ok ? 200 : 400).json(result);
  } catch (err) {
    return next(err);
  }
});

// WhatsApp Meta webhook verification challenge
agentRouter.get('/webhooks/whatsapp', (req, res) => {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'sellvion-verify-token';
  if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === verifyToken) {
    return res.status(200).send(String(req.query['hub.challenge'] || ''));
  }
  return res.status(403).send('Verification token mismatch');
});

agentRouter.post('/webhooks/:provider', (req, res) => {
  const provider = req.params.provider;
  const db = getDb();
  const rawBody = (req as express.Request & { rawBody?: string }).rawBody || JSON.stringify(req.body || {});
  const businessId = String(req.query.businessId || req.auth!.businessId);

  // Verify webhook signature when provider appSecret / webhookSecret is configured
  const acc = db
    .prepare('SELECT encrypted_credentials FROM integration_accounts WHERE business_id = ? AND provider = ?')
    .get(businessId, provider) as { encrypted_credentials?: string } | undefined;

  let signatureVerified = 0;
  if (acc?.encrypted_credentials) {
    const creds = decryptCredentialsSafe(acc.encrypted_credentials);
    const secret = creds?.appSecret || creds?.webhookSecret;
    const sigHeader =
      String(req.headers['x-hub-signature-256'] || req.headers['x-razorpay-signature'] || req.headers['x-shopify-hmac-sha256'] || '');
    if (secret) {
      const ok = verifyHmacSignature(rawBody, sigHeader, secret);
      if (!ok) {
        return res.status(401).json({ error: 'Invalid webhook signature.' });
      }
      signatureVerified = 1;
    }
  }

  const eventId = generateId('WHK');
  db.prepare(
    `INSERT INTO webhook_events (id, business_id, provider, event_type, signature_valid, payload_json, status)
     VALUES (?, ?, ?, ?, ?, ?, 'processed')`
  ).run(eventId, businessId, provider, String(req.body?.event || req.body?.object || 'event'), signatureVerified, rawBody);

  // Handle inbound WhatsApp STOP / OPT-OUT messages
  if (provider === 'whatsapp') {
    const entry = req.body?.entry?.[0]?.changes?.[0]?.value;
    const inbound = entry?.messages?.[0];
    if (inbound?.from && inbound?.text?.body) {
      const text = String(inbound.text.body).trim().toLowerCase();
      const normalizedFrom = String(inbound.from).replace(/[^\d]/g, '').slice(-10);
      if (normalizedFrom) {
        const cust = db
          .prepare(`SELECT id FROM customers WHERE business_id = ? AND REPLACE(REPLACE(phone, ' ', ''), '+', '') LIKE ?`)
          .get(businessId, `%${normalizedFrom}`) as { id: string } | undefined;

        if (cust) {
          db.prepare(
            `INSERT INTO message_history (id, business_id, customer_id, channel, direction, body, status, is_demo)
             VALUES (?, ?, ?, 'WhatsApp', 'inbound', ?, 'received', 0)`
          ).run(generateId('MSG'), businessId, cust.id, inbound.text.body);

          if (text === 'stop' || text === 'unsubscribe' || text === 'opt out') {
            db.prepare('UPDATE customers SET opted_out = 1, consent_whatsapp = 0 WHERE id = ?').run(cust.id);
          }
        }
      }
    }
  }

  return res.json({ ok: true, eventId, signatureVerified: Boolean(signatureVerified) });
});

// 4. ANALYTICS, EXPORTS & AUDIT LOGS
agentRouter.get('/analytics/summary', (req, res) => {
  const db = getDb();
  const businessId = req.auth!.businessId;
  const range = String(req.query.range || '30d');
  const days = range === '7d' ? 7 : range === '90d' ? 90 : range === 'all' ? 3650 : 30;
  const cutoffClause = range === 'all' ? '' : `AND ordered_at >= date('now', '-${days} days')`;

  const customerCount = (db.prepare('SELECT COUNT(*) AS cnt FROM customers WHERE business_id = ?').get(businessId) as { cnt: number }).cnt;
  const dueReorderCount = (
    db
      .prepare(
        `SELECT COUNT(*) AS cnt FROM customers WHERE business_id = ? AND (segment IN ('reorder_due', 'inactive') OR days_since_last_order >= average_cadence_days)`
      )
      .get(businessId) as { cnt: number }
  ).cnt;

  const orderAgg = db
    .prepare(
      `SELECT COUNT(*) AS total_orders,
              COALESCE(SUM(total_amount), 0) AS gross_revenue,
              COALESCE(SUM(CASE WHEN status = 'Delivered' THEN total_amount ELSE 0 END), 0) AS delivered_revenue,
              SUM(CASE WHEN payment_mode = 'COD' THEN 1 ELSE 0 END) AS cod_orders,
              SUM(CASE WHEN payment_mode = 'COD' AND status = 'Pending_Verification' THEN 1 ELSE 0 END) AS flagged_cod_orders,
              COALESCE(SUM(CASE WHEN payment_mode = 'COD' AND status = 'Pending_Verification' THEN total_amount ELSE 0 END), 0) AS flagged_cod_value,
              SUM(CASE WHEN payment_mode = 'COD' AND status = 'RTO_Returned' THEN 1 ELSE 0 END) AS rto_orders
       FROM orders WHERE business_id = ? ${cutoffClause}`
    )
    .get(businessId) as Record<string, number>;

  const udhaarAgg = db
    .prepare(
      `SELECT COALESCE(SUM(outstanding_udhaar), 0) AS pending_udhaar,
              COUNT(CASE WHEN outstanding_udhaar > 0 THEN 1 END) AS pending_accounts
       FROM customers WHERE business_id = ?`
    )
    .get(businessId) as { pending_udhaar: number; pending_accounts: number };

  const collectedAgg = db
    .prepare(`SELECT COALESCE(SUM(amount), 0) AS total_collected, COUNT(*) AS payment_count FROM payments WHERE business_id = ? AND status = 'captured'`)
    .get(businessId) as { total_collected: number; payment_count: number };

  const approvalAgg = db
    .prepare(
      `SELECT COUNT(CASE WHEN status = 'pending_approval' THEN 1 END) AS pending_approvals,
              COUNT(CASE WHEN status = 'executed' THEN 1 END) AS executed_approvals,
              COUNT(CASE WHEN status = 'failed' THEN 1 END) AS failed_approvals
       FROM approvals WHERE business_id = ?`
    )
    .get(businessId) as { pending_approvals: number; executed_approvals: number; failed_approvals: number };

  // Cohort holdout comparison directly from DB
  const engagedCohort = db
    .prepare(
      `SELECT COUNT(DISTINCT c.id) AS customers,
              COALESCE(SUM(CASE WHEN e.event_type = 'repeat_order_observed' THEN e.amount ELSE 0 END), 0) AS revenue
       FROM customers c
       LEFT JOIN analytics_events e ON e.customer_id = c.id AND e.business_id = c.business_id
       WHERE c.business_id = ? AND c.holdout_group = 0`
    )
    .get(businessId) as { customers: number; revenue: number };

  const holdoutCohort = db
    .prepare(
      `SELECT COUNT(DISTINCT c.id) AS customers,
              COALESCE(SUM(CASE WHEN e.event_type = 'holdout_order_observed' THEN e.amount ELSE 0 END), 0) AS revenue
       FROM customers c
       LEFT JOIN analytics_events e ON e.customer_id = c.id AND e.business_id = c.business_id
       WHERE c.business_id = ? AND c.holdout_group = 1`
    )
    .get(businessId) as { customers: number; revenue: number };

  const orderTrend = db
    .prepare(
      `SELECT date, orders, revenue FROM (
         SELECT ordered_at AS date, COUNT(*) AS orders, COALESCE(SUM(total_amount), 0) AS revenue
         FROM orders WHERE business_id = ? ${cutoffClause}
         GROUP BY ordered_at ORDER BY ordered_at DESC LIMIT 14
       ) ORDER BY date ASC`
    )
    .all(businessId);

  const paymentRows = db
    .prepare(
      `SELECT payment_mode, COUNT(*) AS cnt, COALESCE(SUM(total_amount), 0) AS value
       FROM orders WHERE business_id = ? ${cutoffClause}
       GROUP BY payment_mode`
    )
    .all(businessId) as Array<{ payment_mode: string; cnt: number; value: number }>;

  const statusRows = db
    .prepare(
      `SELECT status, COUNT(*) AS cnt
       FROM orders WHERE business_id = ? ${cutoffClause}
       GROUP BY status`
    )
    .all(businessId) as Array<{ status: string; cnt: number }>;

  const approvalStatusRows = db
    .prepare(
      `SELECT status, COUNT(*) AS cnt
       FROM approvals WHERE business_id = ?
       GROUP BY status`
    )
    .all(businessId) as Array<{ status: string; cnt: number }>;

  const segmentRows = db
    .prepare(
      `SELECT segment, COUNT(*) AS cnt
       FROM customers WHERE business_id = ?
       GROUP BY segment`
    )
    .all(businessId) as Array<{ segment: string; cnt: number }>;

  const messageCounts = db
    .prepare(
      `SELECT COUNT(CASE WHEN direction = 'outbound' AND status IN ('sent', 'delivered', 'read', 'simulated') THEN 1 END) AS outbound_sent,
              COUNT(CASE WHEN direction = 'inbound' THEN 1 END) AS inbound_replies
       FROM message_history WHERE business_id = ?`
    )
    .get(businessId) as { outbound_sent: number; inbound_replies: number };

  const draftsPrepared = (
    db.prepare(`SELECT COUNT(*) AS cnt FROM approvals WHERE business_id = ?`).get(businessId) as { cnt: number }
  ).cnt;

  const recoveryAgg = db
    .prepare(
      `SELECT COUNT(DISTINCT CASE WHEN event_type = 'repeat_order_observed' THEN customer_id END) AS customers_recovered,
              COUNT(CASE WHEN event_type = 'repeat_order_observed' THEN 1 END) AS repeat_purchases,
              COALESCE(SUM(CASE WHEN event_type = 'repeat_order_observed' THEN amount ELSE 0 END), 0) AS repeat_purchase_revenue,
              COUNT(CASE WHEN event_type IN ('repeat_order_observed', 'udhaar_collected') THEN 1 END) AS conversions_observed
       FROM analytics_events WHERE business_id = ?`
    )
    .get(businessId) as {
    customers_recovered: number;
    repeat_purchases: number;
    repeat_purchase_revenue: number;
    conversions_observed: number;
  };

  const wfHealth = db
    .prepare(
      `SELECT COUNT(CASE WHEN status = 'escalated' THEN 1 END) AS escalated_workflows,
              ROUND(AVG(CASE WHEN status = 'completed' THEN MAX(0, (julianday(updated_at) - julianday(created_at)) * 1440) END), 1) AS avg_resolution_minutes
       FROM agent_workflows WHERE business_id = ?`
    )
    .get(businessId) as { escalated_workflows: number; avg_resolution_minutes: number | null };

  const countMap = (rows: Array<{ cnt: number } & Record<string, any>>, keyField: string) => {
    const map: Record<string, number> = {};
    for (const r of rows) map[String(r[keyField])] = Number(r.cnt || 0);
    return map;
  };
  const payMap = countMap(paymentRows, 'payment_mode');
  const stMap = countMap(statusRows, 'status');
  const appMap = countMap(approvalStatusRows, 'status');
  const segMap = countMap(segmentRows, 'segment');

  const humanEscalations = (wfHealth.escalated_workflows || 0) + (appMap.escalated || 0);

  return res.json({
    mode: req.auth!.mode,
    range,
    actualObserved: {
      totalCustomers: customerCount,
      totalOrders: orderAgg.total_orders || 0,
      grossRevenue: orderAgg.gross_revenue || 0,
      deliveredRevenue: orderAgg.delivered_revenue || 0,
      codOrders: orderAgg.cod_orders || 0,
      codDeliveredCount: stMap.Delivered || 0,
      rtoOrders: orderAgg.rto_orders || 0,
      collectedPayments: collectedAgg.total_collected || 0,
      collectedPaymentCount: collectedAgg.payment_count || 0,
      executedActions: approvalAgg.executed_approvals || 0,
      failedActions: approvalAgg.failed_approvals || 0,
      customersRecovered: recoveryAgg.customers_recovered || 0,
      repeatPurchases: recoveryAgg.repeat_purchases || 0,
      repeatPurchaseRevenue: recoveryAgg.repeat_purchase_revenue || 0,
      messagesDelivered: messageCounts.outbound_sent || 0,
      humanEscalations,
      avgResolutionMinutes: wfHealth.avg_resolution_minutes ?? 0,
    },
    opportunities: {
      dueForReorderCount: dueReorderCount,
      flaggedCodOrders: orderAgg.flagged_cod_orders || 0,
      flaggedCodExposureInr: orderAgg.flagged_cod_value || 0,
      pendingUdhaarInr: udhaarAgg.pending_udhaar || 0,
      pendingUdhaarAccounts: udhaarAgg.pending_accounts || 0,
      pendingApprovals: approvalAgg.pending_approvals || 0,
    },
    cohorts: {
      engagedCustomers: engagedCohort.customers || 0,
      engagedObservedRevenue: engagedCohort.revenue || 0,
      holdoutCustomers: holdoutCohort.customers || 0,
      holdoutObservedRevenue: holdoutCohort.revenue || 0,
    },
    funnel: {
      customersTracked: customerCount,
      dueForFollowUp: dueReorderCount + (udhaarAgg.pending_accounts || 0),
      draftsPrepared,
      messagesDispatched: messageCounts.outbound_sent || 0,
      repliesReceived: messageCounts.inbound_replies || 0,
      conversionsObserved: recoveryAgg.conversions_observed || 0,
    },
    paymentBreakdown: {
      cod: payMap.COD || 0,
      prepaidUpi: payMap.Prepaid_UPI || 0,
      prepaidCard: payMap.Prepaid_Card || 0,
      udhaar: payMap.Udhaar || 0,
    },
    orderStatusBreakdown: {
      pendingVerification: stMap.Pending_Verification || 0,
      inTransit: stMap.In_Transit || 0,
      delivered: stMap.Delivered || 0,
      rtoReturned: stMap.RTO_Returned || 0,
    },
    approvalBreakdown: {
      needsApproval: appMap.pending_approval || 0,
      completed: (appMap.executed || 0) + (appMap.approved || 0),
      scheduled: (appMap.scheduled || 0) + (appMap.snoozed || 0),
      issues: (appMap.failed || 0) + (appMap.escalated || 0) + (appMap.rejected || 0),
    },
    customerSegments: segMap,
    orderTrend,
  });
});

agentRouter.get('/analytics/export', (req, res) => {
  const db = getDb();
  const businessId = req.auth!.businessId;
  const type = String(req.query.type || 'customers');

  const escapeCsv = (val: unknown) => {
    const str = String(val ?? '');
    return `"${str.replace(/"/g, '""')}"`;
  };

  let rows: Array<Record<string, unknown>> = [];
  if (type === 'orders') {
    rows = db.prepare('SELECT id, order_number, total_amount, payment_mode, status, cod_risk_score, ordered_at FROM orders WHERE business_id = ?').all(businessId) as Array<Record<string, unknown>>;
  } else if (type === 'audit') {
    rows = db.prepare('SELECT id, actor_type, action, entity_type, entity_id, created_at FROM audit_logs WHERE business_id = ? ORDER BY created_at DESC LIMIT 200').all(businessId) as Array<Record<string, unknown>>;
  } else {
    rows = db.prepare('SELECT id, name, phone, city, total_orders, total_spent, outstanding_udhaar, segment, last_order_date FROM customers WHERE business_id = ?').all(businessId) as Array<Record<string, unknown>>;
  }

  const headers = rows.length > 0 ? Object.keys(rows[0]) : ['empty'];
  const csvLines = [headers.join(',')];
  for (const row of rows) {
    csvLines.push(headers.map((h) => escapeCsv(row[h])).join(','));
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="sellvion-${type}-${new Date().toISOString().slice(0, 10)}.csv"`);
  return res.send(csvLines.join('\n'));
});

agentRouter.get('/audit-logs', (req, res) => {
  const db = getDb();
  const logs = db
    .prepare('SELECT * FROM audit_logs WHERE business_id = ? ORDER BY created_at DESC LIMIT 60')
    .all(req.auth!.businessId);
  return res.json({ logs });
});

agentRouter.get('/system/status', (req, res) => {
  const db = getDb();
  const businessId = req.auth!.businessId;
  const wfCounts = db
    .prepare(
      `SELECT status, COUNT(*) AS cnt FROM agent_workflows WHERE business_id = ? GROUP BY status`
    )
    .all(businessId) as Array<{ status: string; cnt: number }>;

  const connectedIntegrations = (
    db
      .prepare(`SELECT COUNT(*) AS cnt FROM integration_accounts WHERE business_id = ? AND status = 'connected'`)
      .get(businessId) as { cnt: number }
  ).cnt;

  const wfMap: Record<string, number> = {};
  for (const r of wfCounts) wfMap[r.status] = r.cnt;

  return res.json({
    ok: true,
    mode: req.auth!.mode,
    uptimeSeconds: Math.round(process.uptime()),
    connectedIntegrations,
    workflows: wfMap,
    timestamp: new Date().toISOString(),
  });
});

agentRouter.get('/business/backup', (req, res) => {
  const db = getDb();
  const businessId = req.auth!.businessId;

  const snapshot = {
    exportedAt: new Date().toISOString(),
    mode: req.auth!.mode,
    business: db.prepare('SELECT * FROM businesses WHERE id = ?').get(businessId),
    settings: db.prepare('SELECT * FROM business_settings WHERE business_id = ?').get(businessId),
    customers: db.prepare('SELECT * FROM customers WHERE business_id = ?').all(businessId),
    orders: db.prepare('SELECT * FROM orders WHERE business_id = ?').all(businessId),
    udhaarRecords: db.prepare('SELECT * FROM udhaar_records WHERE business_id = ?').all(businessId),
    payments: db.prepare('SELECT * FROM payments WHERE business_id = ?').all(businessId),
    approvals: db.prepare('SELECT * FROM approvals WHERE business_id = ?').all(businessId),
    workflows: db.prepare('SELECT * FROM agent_workflows WHERE business_id = ?').all(businessId),
    auditLogs: db.prepare('SELECT * FROM audit_logs WHERE business_id = ? ORDER BY created_at DESC LIMIT 200').all(businessId),
  };

  writeAuditLog(db, {
    id: generateId('AUD'),
    businessId,
    userId: req.auth!.userId,
    actorType: 'merchant',
    action: 'tenant_backup_exported',
    entityType: 'business',
    entityId: businessId,
  });

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="sellvion-backup-${businessId}-${new Date().toISOString().slice(0, 10)}.json"`
  );
  return res.send(JSON.stringify(snapshot, null, 2));
});

// 5. AI ENDPOINTS (Server-side Gemini + Deterministic Fallbacks)
agentRouter.post('/ai/draft-message', aiLimiter, async (req, res) => {
  const b = req.body || {};
  const result = await generateCustomerMessage({
    customerName: String(b.customerName || 'Customer'),
    customerCity: String(b.customerCity || ''),
    productName: String(b.productName || ''),
    lastOrderDaysAgo: Number(b.lastOrderDaysAgo || 0),
    actionType: String(b.recommendedAction || b.actionType || 'reorder_reminder'),
    tone: String(b.tone || 'warm_polite'),
    language: String(b.language || 'hinglish'),
    udhaarAmount: Number(b.udhaarAmount || 0),
    orderId: b.orderId ? String(b.orderId) : undefined,
    discountText: String(b.discountOffer || ''),
  });
  return res.json(result);
});

agentRouter.post('/ai/ask-copilot', aiLimiter, async (req, res) => {
  const db = getDb();
  const businessId = req.auth!.businessId;
  const { query = '', language = 'en' } = req.body || {};
  if (!String(query).trim()) {
    return res.status(400).json({ error: 'Question cannot be empty.' });
  }

  // Always ground copilot in real DB rows for the active tenant
  const customers = db
    .prepare('SELECT name, city, segment, last_product_ordered, days_since_last_order, average_cadence_days, outstanding_udhaar FROM customers WHERE business_id = ? LIMIT 30')
    .all(businessId) as Array<Record<string, any>>;

  const highRiskOrders = db
    .prepare(`SELECT order_number, total_amount, cod_risk_score, status FROM orders WHERE business_id = ? AND payment_mode = 'COD' AND cod_risk_score >= 50`)
    .all(businessId);

  const context = {
    mode: req.auth!.mode,
    businessName: req.auth!.businessName,
    totalCustomers: customers.length,
    dueForReorder: customers.filter((c) => c.segment === 'reorder_due' || c.days_since_last_order >= c.average_cadence_days),
    overdueUdhaar: customers
      .filter((c) => Number(c.outstanding_udhaar) > 0)
      .map((c) => ({ name: c.name, city: c.city, amount: c.outstanding_udhaar })),
    highRiskOrders,
  };

  const result = await generateCopilotAnalysis({ query: String(query), context, language: String(language) });
  return res.json(result);
});

agentRouter.post('/ai/parse-voice-command', aiLimiter, async (req, res) => {
  const transcript = String(req.body?.transcript || '').trim();
  if (!transcript) {
    return res.status(400).json({ error: 'Voice transcript is required.' });
  }
  const parsed = await parseVoiceCommand(transcript);
  return res.json(parsed);
});
