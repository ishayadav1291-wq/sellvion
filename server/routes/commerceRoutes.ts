import express from 'express';
import { getDb, writeAuditLog } from '../db/database.ts';
import { scoreCodOrderRisk, runOrchestratorWorkflow, reconcileOutcomeWorkflows } from '../services/agents.ts';
import { generateId } from '../utils/crypto.ts';

export const commerceRouter = express.Router();

function parseCsvLines(rawCsv: string): { headers: string[]; rows: string[][] } {
  const lines = rawCsv
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const out: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        out.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    out.push(current.trim());
    return out;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

// CUSTOMERS
commerceRouter.get('/customers', (req, res) => {
  const db = getDb();
  const businessId = req.auth!.businessId;
  const search = String(req.query.search || '').trim().toLowerCase();
  const segment = String(req.query.segment || 'all');
  const sort = String(req.query.sort || 'recent');
  const page = Math.max(1, Number(req.query.page || 1));
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize || 50)));

  const where: string[] = ['business_id = ?'];
  const params: Array<string | number> = [businessId];

  if (search) {
    where.push('(LOWER(name) LIKE ? OR LOWER(city) LIKE ? OR LOWER(phone) LIKE ? OR LOWER(last_product_ordered) LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }
  if (segment && segment !== 'all') {
    where.push('segment = ?');
    params.push(segment);
  }

  let orderBy = 'updated_at DESC';
  if (sort === 'spent_desc') orderBy = 'total_spent DESC';
  else if (sort === 'udhaar_desc') orderBy = 'outstanding_udhaar DESC';
  else if (sort === 'inactive_desc') orderBy = 'days_since_last_order DESC';
  else if (sort === 'name_asc') orderBy = 'name ASC';

  const countRow = db
    .prepare(`SELECT COUNT(*) AS total FROM customers WHERE ${where.join(' AND ')}`)
    .get(...params) as { total: number };

  const offset = (page - 1) * pageSize;
  const rows = db
    .prepare(
      `SELECT * FROM customers WHERE ${where.join(' AND ')} ORDER BY ${orderBy} LIMIT ? OFFSET ?`
    )
    .all(...params, pageSize, offset);

  return res.json({
    customers: rows,
    pagination: { page, pageSize, total: countRow.total },
  });
});

commerceRouter.get('/customers/:id', (req, res) => {
  const db = getDb();
  const businessId = req.auth!.businessId;
  const customer = db
    .prepare('SELECT * FROM customers WHERE id = ? AND business_id = ?')
    .get(req.params.id, businessId);

  if (!customer) {
    return res.status(404).json({ error: 'Customer not found.' });
  }

  const orders = db
    .prepare('SELECT * FROM orders WHERE customer_id = ? AND business_id = ? ORDER BY ordered_at DESC')
    .all(req.params.id, businessId);
  const payments = db
    .prepare('SELECT * FROM payments WHERE customer_id = ? AND business_id = ? ORDER BY paid_at DESC')
    .all(req.params.id, businessId);
  const udhaar = db
    .prepare('SELECT * FROM udhaar_records WHERE customer_id = ? AND business_id = ? ORDER BY created_at DESC')
    .all(req.params.id, businessId);
  const messages = db
    .prepare('SELECT * FROM message_history WHERE customer_id = ? AND business_id = ? ORDER BY created_at DESC')
    .all(req.params.id, businessId);
  const approvals = db
    .prepare('SELECT * FROM approvals WHERE customer_id = ? AND business_id = ? ORDER BY created_at DESC')
    .all(req.params.id, businessId) as Array<Record<string, any>>;

  type TimelineEvent = {
    id: string;
    type: 'order' | 'payment' | 'message' | 'approval';
    title: string;
    subtitle: string;
    status: string;
    amount?: number;
    timestamp: string;
  };

  const timeline: TimelineEvent[] = [
    ...(orders as Array<Record<string, any>>).map((o) => ({
      id: String(o.id),
      type: 'order' as const,
      title: `Order ${o.order_number}`,
      subtitle: `${String(o.payment_mode).replace('_', ' ')} · ${o.delivery_address || 'Store order'}`,
      status: String(o.status).replace('_', ' '),
      amount: Number(o.total_amount || 0),
      timestamp: String(o.ordered_at || o.created_at),
    })),
    ...(payments as Array<Record<string, any>>).map((p) => ({
      id: String(p.id),
      type: 'payment' as const,
      title: `Payment received (${p.method})`,
      subtitle: `Ref: ${p.reference_id || p.id}`,
      status: String(p.status),
      amount: Number(p.amount || 0),
      timestamp: String(p.paid_at),
    })),
    ...(messages as Array<Record<string, any>>).map((m) => ({
      id: String(m.id),
      type: 'message' as const,
      title: m.direction === 'inbound' ? 'Customer reply on WhatsApp' : 'WhatsApp message',
      subtitle: String(m.body || ''),
      status: String(m.status),
      timestamp: String(m.created_at),
    })),
    ...approvals.map((a) => ({
      id: String(a.id),
      type: 'approval' as const,
      title: String(a.title),
      subtitle: String(a.reason || ''),
      status: String(a.status).replace('_', ' '),
      timestamp: String(a.created_at),
    })),
  ].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return res.json({ customer, orders, payments, udhaar, messages, approvals, timeline });
});

commerceRouter.post('/customers', (req, res) => {
  const db = getDb();
  const businessId = req.auth!.businessId;
  const isDemo = req.auth!.mode === 'demo' ? 1 : 0;
  const {
    name,
    phone,
    email = '',
    city = '',
    state = '',
    addressLine = '',
    pincode = '',
    primaryCategory = 'Retail',
    lastProductOrdered = '',
    averageCadenceDays = 30,
    outstandingUdhaar = 0,
    udhaarDueDate = '',
    notes = '',
  } = req.body || {};

  if (!name || !phone) {
    return res.status(400).json({ error: 'Customer name and phone number are required.' });
  }

  const id = generateId('CUST');
  const today = new Date().toISOString().split('T')[0];
  const segment = Number(outstandingUdhaar) > 0 ? 'high_udhaar' : 'regular';

  db.prepare(
    `INSERT INTO customers (
      id, business_id, name, phone, email, city, state, address_line, pincode, primary_category,
      last_product_ordered, first_order_date, last_order_date, total_orders, total_spent,
      average_cadence_days, days_since_last_order, cod_reliability_score, outstanding_udhaar,
      udhaar_due_date, consent_whatsapp, opted_out, segment, notes, ai_insight, is_demo
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, 0, 85, ?, ?, 1, 0, ?, ?, ?, ?)`
  ).run(
    id,
    businessId,
    String(name).trim(),
    String(phone).trim(),
    String(email).trim(),
    String(city).trim(),
    String(state).trim(),
    String(addressLine).trim(),
    String(pincode).trim(),
    String(primaryCategory).trim(),
    String(lastProductOrdered).trim(),
    today,
    today,
    Number(averageCadenceDays) || 30,
    Number(outstandingUdhaar) || 0,
    String(udhaarDueDate || ''),
    segment,
    String(notes || 'Added by merchant.'),
    'Customer record created. Ready for purchase tracking.',
    isDemo
  );

  if (Number(outstandingUdhaar) > 0) {
    db.prepare(
      `INSERT INTO udhaar_records (id, business_id, customer_id, original_amount, remaining_amount, due_date, status, notes, is_demo)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', 'Opening balance', ?)`
    ).run(
      generateId('UDH'),
      businessId,
      id,
      Number(outstandingUdhaar),
      Number(outstandingUdhaar),
      udhaarDueDate || today,
      isDemo
    );
  }

  writeAuditLog(db, {
    id: generateId('AUD'),
    businessId,
    userId: req.auth!.userId,
    actorType: 'merchant',
    action: 'customer_created',
    entityType: 'customer',
    entityId: id,
  });

  const created = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
  return res.status(201).json({ customer: created });
});

commerceRouter.patch('/customers/:id', (req, res) => {
  const db = getDb();
  const businessId = req.auth!.businessId;
  const existing = db
    .prepare('SELECT id FROM customers WHERE id = ? AND business_id = ?')
    .get(req.params.id, businessId);
  if (!existing) return res.status(404).json({ error: 'Customer not found.' });

  const b = req.body || {};
  db.prepare(
    `UPDATE customers
     SET consent_whatsapp = COALESCE(?, consent_whatsapp),
         opted_out = COALESCE(?, opted_out),
         preferred_language = COALESCE(?, preferred_language),
         notes = COALESCE(?, notes),
         updated_at = datetime('now')
     WHERE id = ? AND business_id = ?`
  ).run(
    typeof b.consentWhatsApp === 'boolean' ? (b.consentWhatsApp ? 1 : 0) : null,
    typeof b.optedOut === 'boolean' ? (b.optedOut ? 1 : 0) : null,
    b.preferredLanguage ?? null,
    b.notes ?? null,
    req.params.id,
    businessId
  );

  const updated = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  return res.json({ customer: updated });
});

// PRODUCTS
commerceRouter.get('/products', (req, res) => {
  const db = getDb();
  const products = db
    .prepare('SELECT * FROM products WHERE business_id = ? ORDER BY created_at DESC')
    .all(req.auth!.businessId);
  return res.json({ products });
});

commerceRouter.post('/products', (req, res) => {
  const db = getDb();
  const isDemo = req.auth!.mode === 'demo' ? 1 : 0;
  const { sku = '', name, category = 'General', price = 0, typicalCadenceDays = 30, stockQty = 0 } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Product name is required.' });

  const id = generateId('PROD');
  db.prepare(
    `INSERT INTO products (id, business_id, sku, name, category, price, typical_cadence_days, stock_qty, is_demo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, req.auth!.businessId, sku, name, category, Number(price), Number(typicalCadenceDays), Number(stockQty), isDemo);

  return res.status(201).json({ product: db.prepare('SELECT * FROM products WHERE id = ?').get(id) });
});

// ORDERS & COD PROTECTION
commerceRouter.get('/orders', (req, res) => {
  const db = getDb();
  const businessId = req.auth!.businessId;
  const paymentMode = String(req.query.paymentMode || 'all');
  const status = String(req.query.status || 'all');

  const where = ['o.business_id = ?'];
  const params: Array<string> = [businessId];
  if (paymentMode !== 'all') {
    where.push('o.payment_mode = ?');
    params.push(paymentMode);
  }
  if (status !== 'all') {
    where.push('o.status = ?');
    params.push(status);
  }

  const orders = db
    .prepare(
      `SELECT o.*, c.name AS customer_name, c.phone AS customer_phone, c.city AS customer_city, c.total_orders AS customer_total_orders
       FROM orders o
       JOIN customers c ON c.id = o.customer_id
       WHERE ${where.join(' AND ')}
       ORDER BY o.ordered_at DESC`
    )
    .all(...params);

  return res.json({ orders });
});

commerceRouter.get('/orders/:id', (req, res) => {
  const db = getDb();
  const businessId = req.auth!.businessId;
  const order = db
    .prepare(
      `SELECT o.*, c.name AS customer_name, c.phone AS customer_phone, c.city AS customer_city,
              c.total_orders AS customer_total_orders, c.total_spent AS customer_total_spent,
              c.cod_reliability_score, c.consent_whatsapp, c.opted_out
       FROM orders o
       JOIN customers c ON c.id = o.customer_id
       WHERE o.id = ? AND o.business_id = ?`
    )
    .get(req.params.id, businessId) as Record<string, any> | undefined;

  if (!order) return res.status(404).json({ error: 'Order not found.' });

  const assessment = db
    .prepare('SELECT * FROM cod_risk_assessments WHERE order_id = ? AND business_id = ? ORDER BY created_at DESC LIMIT 1')
    .get(req.params.id, businessId);

  const priorStats = db
    .prepare(
      `SELECT COUNT(*) AS prior_orders,
              SUM(CASE WHEN status = 'Delivered' THEN 1 ELSE 0 END) AS delivered_orders,
              SUM(CASE WHEN status = 'RTO_Returned' THEN 1 ELSE 0 END) AS rto_orders
       FROM orders
       WHERE customer_id = ? AND business_id = ? AND id != ?`
    )
    .get(order.customer_id, businessId, order.id) as {
    prior_orders: number;
    delivered_orders: number;
    rto_orders: number;
  };

  return res.json({ order, assessment, priorStats });
});

commerceRouter.post('/orders', (req, res) => {
  const db = getDb();
  const businessId = req.auth!.businessId;
  const isDemo = req.auth!.mode === 'demo' ? 1 : 0;
  const { customerId, items = [], totalAmount, paymentMode = 'COD', deliveryAddress = '', pincode = '' } = req.body || {};

  if (!customerId || !totalAmount) {
    return res.status(400).json({ error: 'customerId and totalAmount are required.' });
  }

  const customer = db
    .prepare('SELECT * FROM customers WHERE id = ? AND business_id = ?')
    .get(customerId, businessId) as Record<string, any> | undefined;
  if (!customer) return res.status(404).json({ error: 'Customer not found.' });

  const orderId = generateId('ORD');
  const orderNumber = orderId;
  const addr = deliveryAddress || customer.address_line || '';
  const pin = pincode || customer.pincode || '';
  const risk =
    paymentMode === 'COD'
      ? scoreCodOrderRisk({
          isFirstTimeBuyer: Number(customer.total_orders) === 0,
          pincode: String(pin),
          address: String(addr),
          amount: Number(totalAmount),
        })
      : { score: 8, band: 'low' as const, reasons: [], evidence: {}, recommendedAction: 'Prepaid order' };

  const status = paymentMode === 'COD' && risk.score >= 50 ? 'Pending_Verification' : 'In_Transit';

  db.prepare(
    `INSERT INTO orders (
      id, business_id, customer_id, order_number, items_json, total_amount, payment_mode,
      delivery_address, pincode, status, cod_risk_score, risk_reasons_json, is_demo, ordered_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, date('now'))`
  ).run(
    orderId,
    businessId,
    customerId,
    orderNumber,
    JSON.stringify(items),
    Number(totalAmount),
    paymentMode,
    addr,
    pin,
    status,
    risk.score,
    JSON.stringify(risk.reasons),
    isDemo
  );

  if (paymentMode === 'COD') {
    db.prepare(
      `INSERT INTO cod_risk_assessments (id, business_id, order_id, risk_score, risk_band, reasons_json, evidence_json, recommended_action, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      generateId('COD'),
      businessId,
      orderId,
      risk.score,
      risk.band,
      JSON.stringify(risk.reasons),
      JSON.stringify(risk.evidence),
      risk.recommendedAction,
      risk.score >= 50 ? 'flagged' : 'safe'
    );
  }

  const firstItemName = Array.isArray(items) && items.length > 0 ? String(items[0]) : '';
  db.prepare(
    `UPDATE customers
     SET total_orders = total_orders + 1,
         total_spent = total_spent + ?,
         last_product_ordered = CASE WHEN ? != '' THEN ? ELSE last_product_ordered END,
         last_order_date = date('now'),
         days_since_last_order = 0,
         updated_at = datetime('now')
     WHERE id = ?`
  ).run(Number(totalAmount), firstItemName, firstItemName, customerId);

  if (Number(customer.holdout_group) === 1) {
    db.prepare(
      `INSERT INTO analytics_events (id, business_id, event_type, customer_id, order_id, amount, holdout_group, metadata_json, is_demo)
       VALUES (?, ?, 'holdout_order_observed', ?, ?, ?, 1, ?, ?)`
    ).run(generateId('EVT'), businessId, customerId, orderId, Number(totalAmount), JSON.stringify({ paymentMode }), isDemo);
  } else {
    const priorEngaged = db
      .prepare(
        `SELECT id FROM approvals
         WHERE business_id = ? AND customer_id = ? AND status = 'executed'
           AND action_type IN ('reorder_reminder', 'winback_offer')
         LIMIT 1`
      )
      .get(businessId, customerId);

    if (priorEngaged) {
      db.prepare(
        `INSERT INTO analytics_events (id, business_id, event_type, customer_id, order_id, amount, holdout_group, metadata_json, is_demo)
         VALUES (?, ?, 'repeat_order_observed', ?, ?, ?, 0, ?, ?)`
      ).run(generateId('EVT'), businessId, customerId, orderId, Number(totalAmount), JSON.stringify({ paymentMode }), isDemo);

      reconcileOutcomeWorkflows(db, {
        businessId,
        customerId,
        orderId,
        outcomeType: 'repeat_order',
        amount: Number(totalAmount),
        summary: `Verified repeat order ${orderNumber} (₹${Number(totalAmount).toLocaleString('en-IN')}) placed after customer follow-up.`,
      });
    }
  }

  return res.status(201).json({ order: db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId), risk });
});

commerceRouter.post('/orders/:id/action', async (req, res, next) => {
  try {
    const db = getDb();
    const businessId = req.auth!.businessId;
    const { action } = req.body || {}; // 'verify_address' | 'prepare_prepay' | 'escalate' | 'mark_delivered' | 'mark_rto'

  const order = db
    .prepare('SELECT * FROM orders WHERE id = ? AND business_id = ?')
    .get(req.params.id, businessId) as Record<string, any> | undefined;
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  if (action === 'verify_address') {
    db.prepare(`UPDATE orders SET status = 'In_Transit', actual_outcome = 'Address verified by merchant' WHERE id = ?`).run(order.id);
    db.prepare(`UPDATE cod_risk_assessments SET status = 'mitigated' WHERE order_id = ?`).run(order.id);
    writeAuditLog(db, {
      id: generateId('AUD'),
      businessId,
      userId: req.auth!.userId,
      actorType: 'merchant',
      action: 'cod_address_verified',
      entityType: 'order',
      entityId: order.id,
    });
    return res.json({ ok: true, message: `Order ${order.order_number} marked address-verified and ready for dispatch.` });
  }

  if (action === 'prepare_prepay') {
    // Runs orchestrator workflow to prepare consent-checked prepaid request in Approval Inbox (never auto-converts!)
    const wf = await runOrchestratorWorkflow(db, {
      businessId,
      userId: req.auth!.userId,
      workflowType: 'cod_protection',
      targetOrderId: order.id,
      mode: req.auth!.mode,
      triggerSource: 'cod_center',
    });
    return res.json({
      ok: true,
      workflow: wf,
      message: 'Prepayment confirmation request prepared in Approval Inbox. Order remains COD until customer pays.',
    });
  }

  if (action === 'escalate') {
    db.prepare(`UPDATE cod_risk_assessments SET status = 'escalated' WHERE order_id = ?`).run(order.id);
    writeAuditLog(db, {
      id: generateId('AUD'),
      businessId,
      userId: req.auth!.userId,
      actorType: 'merchant',
      action: 'cod_order_escalated',
      entityType: 'order',
      entityId: order.id,
    });
    return res.json({ ok: true, message: `Order ${order.order_number} escalated for manual phone review.` });
  }

    if (action === 'mark_delivered' || action === 'mark_rto') {
      const isDelivered = action === 'mark_delivered';
      const newStatus = isDelivered ? 'Delivered' : 'RTO_Returned';
      const courierCost = isDelivered ? 65 : 280;
      const isDemo = req.auth!.mode === 'demo' ? 1 : 0;

      db.prepare(`UPDATE orders SET status = ?, courier_cost = ?, actual_outcome = ? WHERE id = ?`).run(
        newStatus,
        courierCost,
        isDelivered ? 'Delivered to customer' : 'Returned to origin (RTO)',
        order.id
      );
      db.prepare(`UPDATE cod_risk_assessments SET status = 'resolved' WHERE order_id = ?`).run(order.id);
      db.prepare(
        `UPDATE customers
         SET cod_reliability_score = MIN(100, MAX(10, cod_reliability_score + ?)),
             updated_at = datetime('now')
         WHERE id = ?`
      ).run(isDelivered ? 5 : -15, order.customer_id);

      db.prepare(
        `INSERT INTO analytics_events (id, business_id, event_type, customer_id, order_id, amount, metadata_json, is_demo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        generateId('EVT'),
        businessId,
        isDelivered ? 'cod_delivered' : 'cod_rto_recorded',
        order.customer_id,
        order.id,
        Number(order.total_amount || 0),
        JSON.stringify({ courierCost }),
        isDemo
      );

      reconcileOutcomeWorkflows(db, {
        businessId,
        customerId: String(order.customer_id),
        orderId: String(order.id),
        outcomeType: isDelivered ? 'cod_delivered' : 'cod_rto',
        amount: Number(order.total_amount || 0),
        summary: isDelivered
          ? `Verified delivery of order ${order.order_number} (₹${Number(order.total_amount).toLocaleString('en-IN')}).`
          : `Recorded courier return (RTO) for order ${order.order_number}.`,
      });

      writeAuditLog(db, {
        id: generateId('AUD'),
        businessId,
        userId: req.auth!.userId,
        actorType: 'merchant',
        action: isDelivered ? 'order_marked_delivered' : 'order_marked_rto',
        entityType: 'order',
        entityId: order.id,
        details: { newStatus, courierCost },
      });

      return res.json({ ok: true, message: `Order ${order.order_number} outcome recorded as ${newStatus}.` });
    }

    return res.status(400).json({ error: 'Unsupported order action.' });
  } catch (err) {
    return next(err);
  }
});

commerceRouter.post('/cod/score', (req, res) => {
  const { isFirstTimeBuyer, pincode = '', address = '', amount = 0, priorRtoCount = 0 } = req.body || {};
  const result = scoreCodOrderRisk({
    isFirstTimeBuyer: Boolean(isFirstTimeBuyer),
    pincode: String(pincode),
    address: String(address),
    amount: Number(amount),
    priorRtoCount: Number(priorRtoCount),
  });
  return res.json(result);
});

// UDHAAR & COLLECTIONS
commerceRouter.get('/udhaar', (req, res) => {
  const db = getDb();
  const businessId = req.auth!.businessId;
  const records = db
    .prepare(
      `SELECT u.*, c.name AS customer_name, c.phone AS customer_phone, c.city AS customer_city,
              c.consent_whatsapp, c.opted_out,
              (SELECT p.amount FROM payments p WHERE p.customer_id = u.customer_id AND p.business_id = u.business_id ORDER BY p.paid_at DESC LIMIT 1) AS last_payment_amount,
              (SELECT p.paid_at FROM payments p WHERE p.customer_id = u.customer_id AND p.business_id = u.business_id ORDER BY p.paid_at DESC LIMIT 1) AS last_payment_date,
              (SELECT a.status FROM approvals a WHERE a.customer_id = u.customer_id AND a.business_id = u.business_id AND a.action_type = 'udhaar_reminder' ORDER BY a.created_at DESC LIMIT 1) AS latest_followup_status,
              (SELECT a.id FROM approvals a WHERE a.customer_id = u.customer_id AND a.business_id = u.business_id AND a.action_type = 'udhaar_reminder' ORDER BY a.created_at DESC LIMIT 1) AS latest_followup_id,
              (SELECT a.suggested_message FROM approvals a WHERE a.customer_id = u.customer_id AND a.business_id = u.business_id AND a.action_type = 'udhaar_reminder' ORDER BY a.created_at DESC LIMIT 1) AS latest_followup_message
       FROM udhaar_records u
       JOIN customers c ON c.id = u.customer_id
       WHERE u.business_id = ?
       ORDER BY u.remaining_amount DESC, u.due_date ASC`
    )
    .all(businessId);

  const payments = db
    .prepare(
      `SELECT p.*, c.name AS customer_name
       FROM payments p
       JOIN customers c ON c.id = p.customer_id
       WHERE p.business_id = ?
       ORDER BY p.paid_at DESC LIMIT 25`
    )
    .all(businessId);

  return res.json({ records, payments });
});

commerceRouter.post('/udhaar', (req, res) => {
  const db = getDb();
  const businessId = req.auth!.businessId;
  const isDemo = req.auth!.mode === 'demo' ? 1 : 0;
  const { customerId, amount, dueDate, notes = '' } = req.body || {};
  if (!customerId || !amount || Number(amount) <= 0) {
    return res.status(400).json({ error: 'Valid customerId and positive amount are required.' });
  }

  const cust = db
    .prepare('SELECT id FROM customers WHERE id = ? AND business_id = ?')
    .get(customerId, businessId);
  if (!cust) return res.status(404).json({ error: 'Customer not found.' });

  const id = generateId('UDH');
  const due = dueDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

  db.prepare(
    `INSERT INTO udhaar_records (id, business_id, customer_id, original_amount, remaining_amount, due_date, status, notes, is_demo)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
  ).run(id, businessId, customerId, Number(amount), Number(amount), due, notes, isDemo);

  db.prepare(
    `UPDATE customers SET outstanding_udhaar = outstanding_udhaar + ?, udhaar_due_date = ?, segment = 'high_udhaar', updated_at = datetime('now') WHERE id = ?`
  ).run(Number(amount), due, customerId);

  return res.status(201).json({ record: db.prepare('SELECT * FROM udhaar_records WHERE id = ?').get(id) });
});

commerceRouter.post('/udhaar/:customerId/payment', (req, res) => {
  const db = getDb();
  const businessId = req.auth!.businessId;
  const isDemo = req.auth!.mode === 'demo' ? 1 : 0;
  const { amount, method = 'UPI', referenceId = '' } = req.body || {};
  const paidAmt = Number(amount);

  if (!paidAmt || paidAmt <= 0) {
    return res.status(400).json({ error: 'Payment amount must be greater than zero.' });
  }

  const customer = db
    .prepare('SELECT * FROM customers WHERE id = ? AND business_id = ?')
    .get(req.params.customerId, businessId) as Record<string, any> | undefined;
  if (!customer) return res.status(404).json({ error: 'Customer not found.' });

  const newBalance = Math.max(0, Number(customer.outstanding_udhaar) - paidAmt);
  const paymentId = generateId('PAY');

  db.exec('BEGIN');
  try {
    db.prepare(
      `INSERT INTO payments (id, business_id, customer_id, amount, method, reference_id, status, recorded_by, is_demo)
       VALUES (?, ?, ?, ?, ?, ?, 'captured', ?, ?)`
    ).run(paymentId, businessId, customer.id, paidAmt, method, referenceId || `REC-${Date.now()}`, req.auth!.userId || 'merchant', isDemo);

    db.prepare(
      `UPDATE customers
       SET outstanding_udhaar = ?,
           segment = CASE WHEN ? = 0 AND segment = 'high_udhaar' THEN 'regular' ELSE segment END,
           updated_at = datetime('now')
       WHERE id = ?`
    ).run(newBalance, newBalance, customer.id);

    // Reconcile udhaar_records FIFO
    let remainingToApply = paidAmt;
    const openRecords = db
      .prepare(
        `SELECT id, remaining_amount FROM udhaar_records
         WHERE business_id = ? AND customer_id = ? AND remaining_amount > 0
         ORDER BY due_date ASC`
      )
      .all(businessId, customer.id) as Array<{ id: string; remaining_amount: number }>;

    for (const rec of openRecords) {
      if (remainingToApply <= 0) break;
      const applied = Math.min(remainingToApply, rec.remaining_amount);
      const nextRem = rec.remaining_amount - applied;
      db.prepare(
        `UPDATE udhaar_records
         SET remaining_amount = ?,
             status = CASE WHEN ? <= 0 THEN 'paid' ELSE 'partial' END,
             settled_at = CASE WHEN ? <= 0 THEN datetime('now') ELSE NULL END
         WHERE id = ?`
      ).run(nextRem, nextRem, nextRem, rec.id);
      remainingToApply -= applied;
    }

    db.prepare(
      `INSERT INTO analytics_events (id, business_id, event_type, customer_id, amount, metadata_json, is_demo)
       VALUES (?, ?, 'udhaar_collected', ?, ?, ?, ?)`
    ).run(generateId('EVT'), businessId, customer.id, paidAmt, JSON.stringify({ method }), isDemo);

    reconcileOutcomeWorkflows(db, {
      businessId,
      customerId: String(customer.id),
      outcomeType: 'udhaar_payment',
      amount: paidAmt,
      summary: `Reconciled ₹${paidAmt.toLocaleString('en-IN')} payment via ${method} (remaining balance ₹${newBalance.toLocaleString('en-IN')}).`,
    });

    writeAuditLog(db, {
      id: generateId('AUD'),
      businessId,
      userId: req.auth!.userId,
      actorType: 'merchant',
      action: 'udhaar_payment_recorded',
      entityType: 'payment',
      entityId: paymentId,
      details: { customerId: customer.id, amount: paidAmt, method },
    });

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    return res.status(500).json({ error: 'Failed to record payment.' });
  }

  return res.json({
    ok: true,
    paymentId,
    remainingBalance: newBalance,
    message: `Recorded ₹${paidAmt.toLocaleString('en-IN')} payment for ${customer.name}.`,
  });
});

commerceRouter.post('/udhaar/:customerId/prepare-reminder', async (req, res, next) => {
  try {
    const db = getDb();
    const result = await runOrchestratorWorkflow(db, {
      businessId: req.auth!.businessId,
      userId: req.auth!.userId,
      workflowType: 'udhaar_collection',
      targetCustomerId: req.params.customerId,
      mode: req.auth!.mode,
      language: req.body?.language,
      triggerSource: 'udhaar_ledger',
    });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

// CSV DATA IMPORTS (Preview, Validation, Mapping, Duplicate Detection, Execute, Rollback)
commerceRouter.post('/imports/preview', (req, res) => {
  const { csvText = '', entityType = 'customers' } = req.body || {};
  if (!String(csvText).trim()) {
    return res.status(400).json({ error: 'CSV content is empty.' });
  }
  const parsed = parseCsvLines(String(csvText));
  if (parsed.headers.length === 0 || parsed.rows.length === 0) {
    return res.status(400).json({ error: 'CSV must include a header row and at least one data row.' });
  }

  return res.json({
    entityType,
    headers: parsed.headers,
    totalRows: parsed.rows.length,
    sampleRows: parsed.rows.slice(0, 5),
  });
});

commerceRouter.post('/imports/execute', (req, res) => {
  const db = getDb();
  const businessId = req.auth!.businessId;
  const isDemo = req.auth!.mode === 'demo' ? 1 : 0;
  const { entityType = 'customers', filename = 'upload.csv', csvText = '', mapping = {} } = req.body || {};

  const parsed = parseCsvLines(String(csvText));
  if (parsed.headers.length === 0 || parsed.rows.length === 0) {
    return res.status(400).json({ error: 'Invalid CSV data.' });
  }

  const colIndex = (field: string): number => {
    const mappedHeader = mapping[field] || field;
    return parsed.headers.findIndex((h) => h.toLowerCase() === String(mappedHeader).toLowerCase());
  };

  const batchId = generateId('IMP');
  const insertedIds: string[] = [];
  const errors: Array<{ row: number; reason: string }> = [];
  let skippedRows = 0;

  db.exec('BEGIN');
  try {
    parsed.rows.forEach((cols, idx) => {
      const rowNum = idx + 2;
      const val = (field: string, fallback = ''): string => {
        const i = colIndex(field);
        return i >= 0 && cols[i] !== undefined ? cols[i].trim() : fallback;
      };

      if (entityType === 'customers') {
        const name = val('name');
        const phone = val('phone');
        if (!name || !phone) {
          errors.push({ row: rowNum, reason: 'Missing required name or phone' });
          return;
        }
        const dup = db
          .prepare('SELECT id FROM customers WHERE business_id = ? AND phone = ?')
          .get(businessId, phone);
        if (dup) {
          skippedRows += 1;
          return;
        }
        const id = generateId('CUST');
        const udhaar = Number(val('outstanding_udhaar', '0')) || 0;
        db.prepare(
          `INSERT INTO customers (id, business_id, name, phone, city, state, primary_category, last_product_ordered, average_cadence_days, outstanding_udhaar, segment, is_demo)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          id,
          businessId,
          name,
          phone,
          val('city'),
          val('state'),
          val('primary_category', 'General'),
          val('last_product_ordered'),
          Number(val('average_cadence_days', '30')) || 30,
          udhaar,
          udhaar > 0 ? 'high_udhaar' : 'regular',
          isDemo
        );
        insertedIds.push(id);
      } else if (entityType === 'products') {
        const name = val('name');
        if (!name) {
          errors.push({ row: rowNum, reason: 'Missing product name' });
          return;
        }
        const id = generateId('PROD');
        db.prepare(
          `INSERT INTO products (id, business_id, sku, name, category, price, typical_cadence_days, stock_qty, is_demo)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          id,
          businessId,
          val('sku'),
          name,
          val('category', 'General'),
          Number(val('price', '0')) || 0,
          Number(val('typical_cadence_days', '30')) || 30,
          Number(val('stock_qty', '0')) || 0,
          isDemo
        );
        insertedIds.push(id);
      } else if (entityType === 'orders' || entityType === 'udhaar' || entityType === 'payments') {
        const phone = val('phone');
        const customerName = val('customer_name', val('name'));
        let cust = phone
          ? (db.prepare('SELECT id FROM customers WHERE business_id = ? AND phone = ?').get(businessId, phone) as { id: string } | undefined)
          : undefined;
        if (!cust && customerName) {
          cust = db
            .prepare('SELECT id FROM customers WHERE business_id = ? AND LOWER(name) = LOWER(?)')
            .get(businessId, customerName) as { id: string } | undefined;
        }
        if (!cust) {
          errors.push({ row: rowNum, reason: 'No matching customer found by phone or name' });
          return;
        }

        const amount = Number(val('amount', val('total_amount', '0'))) || 0;
        if (amount <= 0) {
          errors.push({ row: rowNum, reason: 'Amount must be greater than 0' });
          return;
        }

        if (entityType === 'orders') {
          const id = generateId('ORD');
          const mode = val('payment_mode', 'COD');
          db.prepare(
            `INSERT INTO orders (id, business_id, customer_id, order_number, items_json, total_amount, payment_mode, delivery_address, pincode, status, is_demo, ordered_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending_Verification', ?, date('now'))`
          ).run(
            id,
            businessId,
            cust.id,
            val('order_number', id),
            JSON.stringify([val('items', 'Imported Item')]),
            amount,
            ['COD', 'Prepaid_UPI', 'Prepaid_Card', 'Udhaar'].includes(mode) ? mode : 'COD',
            val('delivery_address'),
            val('pincode'),
            isDemo
          );
          insertedIds.push(id);
        } else if (entityType === 'udhaar') {
          const id = generateId('UDH');
          db.prepare(
            `INSERT INTO udhaar_records (id, business_id, customer_id, original_amount, remaining_amount, due_date, status, notes, is_demo)
             VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
          ).run(id, businessId, cust.id, amount, amount, val('due_date', new Date().toISOString().split('T')[0]), val('notes', 'CSV Import'), isDemo);
          db.prepare('UPDATE customers SET outstanding_udhaar = outstanding_udhaar + ? WHERE id = ?').run(amount, cust.id);
          insertedIds.push(id);
        } else {
          const id = generateId('PAY');
          db.prepare(
            `INSERT INTO payments (id, business_id, customer_id, amount, method, reference_id, status, is_demo)
             VALUES (?, ?, ?, ?, ?, ?, 'captured', ?)`
          ).run(id, businessId, cust.id, amount, val('method', 'UPI'), val('reference_id', id), isDemo);
          insertedIds.push(id);
        }
      }
    });

    db.prepare(
      `INSERT INTO import_batches (id, business_id, entity_type, filename, total_rows, imported_rows, skipped_rows, error_rows_json, inserted_ids_json, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed')`
    ).run(
      batchId,
      businessId,
      entityType,
      filename,
      parsed.rows.length,
      insertedIds.length,
      skippedRows,
      JSON.stringify(errors),
      JSON.stringify(insertedIds)
    );

    writeAuditLog(db, {
      id: generateId('AUD'),
      businessId,
      userId: req.auth!.userId,
      actorType: 'merchant',
      action: 'csv_import_completed',
      entityType: 'import_batch',
      entityId: batchId,
      details: { entityType, imported: insertedIds.length, skipped: skippedRows, errors: errors.length },
    });

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    return res.status(500).json({ error: 'CSV import failed and was safely rolled back.' });
  }

  return res.status(201).json({
    batchId,
    totalRows: parsed.rows.length,
    importedRows: insertedIds.length,
    skippedRows,
    errors,
  });
});

commerceRouter.get('/imports/batches', (req, res) => {
  const db = getDb();
  const batches = db
    .prepare('SELECT * FROM import_batches WHERE business_id = ? ORDER BY created_at DESC LIMIT 20')
    .all(req.auth!.businessId);
  return res.json({ batches });
});

commerceRouter.post('/imports/:batchId/rollback', (req, res) => {
  const db = getDb();
  const businessId = req.auth!.businessId;
  const batch = db
    .prepare('SELECT * FROM import_batches WHERE id = ? AND business_id = ?')
    .get(req.params.batchId, businessId) as Record<string, any> | undefined;

  if (!batch) return res.status(404).json({ error: 'Import batch not found.' });
  if (batch.status === 'rolled_back') return res.status(400).json({ error: 'Batch already rolled back.' });

  const ids = JSON.parse(batch.inserted_ids_json || '[]') as string[];
  const tableMap: Record<string, string> = {
    customers: 'customers',
    products: 'products',
    orders: 'orders',
    payments: 'payments',
    udhaar: 'udhaar_records',
  };
  const table = tableMap[batch.entity_type];
  if (!table) return res.status(400).json({ error: 'Unsupported entity rollback.' });

  db.exec('BEGIN');
  try {
    const del = db.prepare(`DELETE FROM ${table} WHERE id = ? AND business_id = ?`);
    for (const id of ids) {
      del.run(id, businessId);
    }
    db.prepare(`UPDATE import_batches SET status = 'rolled_back' WHERE id = ?`).run(batch.id);
    writeAuditLog(db, {
      id: generateId('AUD'),
      businessId,
      userId: req.auth!.userId,
      actorType: 'merchant',
      action: 'csv_import_rolled_back',
      entityType: 'import_batch',
      entityId: batch.id,
      details: { removedRecords: ids.length },
    });
    db.exec('COMMIT');
  } catch {
    db.exec('ROLLBACK');
    return res.status(500).json({ error: 'Failed to roll back import batch.' });
  }

  return res.json({ ok: true, removedRecords: ids.length });
});
