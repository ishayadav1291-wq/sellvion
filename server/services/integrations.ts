import { DatabaseSync } from 'node:sqlite';
import { decryptCredentials, encryptCredentials, generateId } from '../utils/crypto.ts';
import { writeAuditLog } from '../db/database.ts';
import { isGeminiConfigured } from './geminiService.ts';

export type IntegrationProvider = 'whatsapp' | 'shopify' | 'shiprocket' | 'razorpay' | 'gemini';

export interface IntegrationStatusView {
  provider: IntegrationProvider;
  label: string;
  description: string;
  status: 'not_configured' | 'connected' | 'error' | 'disconnected';
  lastVerifiedAt: string | null;
  lastError: string;
  configSummary: Record<string, string>;
  requiredFields: Array<{ key: string; label: string; secret?: boolean; placeholder: string }>;
}

const PROVIDER_META: Record<
  IntegrationProvider,
  {
    label: string;
    description: string;
    requiredFields: Array<{ key: string; label: string; secret?: boolean; placeholder: string }>;
  }
> = {
  whatsapp: {
    label: 'WhatsApp Cloud API',
    description: 'Send approved messages and receive customer replies via Meta webhooks.',
    requiredFields: [
      { key: 'phoneNumberId', label: 'Phone Number ID', placeholder: 'e.g. 104829182910421' },
      { key: 'wabaId', label: 'WhatsApp Business Account ID', placeholder: 'e.g. 108291827319' },
      { key: 'accessToken', label: 'Meta Graph Access Token', secret: true, placeholder: 'EAAG...' },
      { key: 'appSecret', label: 'Webhook App Secret (optional)', secret: true, placeholder: 'Meta App Secret' },
    ],
  },
  shopify: {
    label: 'Shopify Store Sync',
    description: 'Import and sync customers, products, and orders.',
    requiredFields: [
      { key: 'shopDomain', label: 'Shopify Store Domain', placeholder: 'your-store.myshopify.com' },
      { key: 'adminToken', label: 'Admin API Access Token', secret: true, placeholder: 'shpat_...' },
      { key: 'webhookSecret', label: 'Webhook Secret (optional)', secret: true, placeholder: 'Shopify webhook secret' },
    ],
  },
  shiprocket: {
    label: 'Shiprocket Logistics',
    description: 'Fetch shipment status, delivery outcomes, and courier return details.',
    requiredFields: [
      { key: 'email', label: 'Shiprocket API User Email', placeholder: 'api-user@yourstore.in' },
      { key: 'password', label: 'Shiprocket API Password', secret: true, placeholder: 'API password' },
    ],
  },
  razorpay: {
    label: 'Razorpay Payment Links',
    description: 'Create payment links with consent and reconcile captured payments.',
    requiredFields: [
      { key: 'keyId', label: 'Razorpay Key ID', placeholder: 'rzp_live_... or rzp_test_...' },
      { key: 'keySecret', label: 'Razorpay Key Secret', secret: true, placeholder: 'Key secret' },
      { key: 'webhookSecret', label: 'Webhook Secret (optional)', secret: true, placeholder: 'Razorpay webhook secret' },
    ],
  },
  gemini: {
    label: 'Google Gemini AI',
    description: 'Powers agent reasoning, multilingual message drafts, and voice commands.',
    requiredFields: [],
  },
};

export function listIntegrations(db: DatabaseSync, businessId: string): IntegrationStatusView[] {
  const rows = db
    .prepare(
      `SELECT provider, status, config_json, last_verified_at, last_error
       FROM integration_accounts WHERE business_id = ?`
    )
    .all(businessId) as Array<{
    provider: IntegrationProvider;
    status: 'not_configured' | 'connected' | 'error' | 'disconnected';
    config_json: string;
    last_verified_at: string | null;
    last_error: string;
  }>;

  const byProvider = new Map(rows.map((r) => [r.provider, r]));

  return (Object.keys(PROVIDER_META) as IntegrationProvider[]).map((provider) => {
    const meta = PROVIDER_META[provider];
    const row = byProvider.get(provider);

    if (provider === 'gemini') {
      const configured = isGeminiConfigured();
      return {
        provider,
        label: meta.label,
        description: meta.description,
        status: configured ? 'connected' : 'not_configured',
        lastVerifiedAt: configured ? new Date().toISOString() : null,
        lastError: configured ? '' : 'Server environment variable GEMINI_API_KEY is not set.',
        configSummary: { model: 'gemini-4-hydrogen', mode: 'server-side' },
        requiredFields: [],
      };
    }

    let configSummary: Record<string, string> = {};
    if (row?.config_json) {
      try {
        configSummary = JSON.parse(row.config_json);
      } catch {
        configSummary = {};
      }
    }

    return {
      provider,
      label: meta.label,
      description: meta.description,
      status: row?.status || 'not_configured',
      lastVerifiedAt: row?.last_verified_at || null,
      lastError: row?.last_error || 'Credentials not configured.',
      configSummary,
      requiredFields: meta.requiredFields,
    };
  });
}

export async function verifyAndConnectIntegration(
  db: DatabaseSync,
  params: {
    businessId: string;
    userId: string | null;
    provider: IntegrationProvider;
    credentials: Record<string, string>;
  }
): Promise<{ ok: boolean; status: string; message: string; details?: Record<string, unknown> }> {
  const { businessId, userId, provider, credentials } = params;

  if (provider === 'gemini') {
    const ready = isGeminiConfigured();
    return {
      ok: ready,
      status: ready ? 'connected' : 'not_configured',
      message: ready
        ? 'Google Gemini server runtime is active (gemini-4-hydrogen).'
        : 'GEMINI_API_KEY is not set in server secrets.',
    };
  }

  // Validate required non-empty fields first
  const required = PROVIDER_META[provider].requiredFields.filter((f) => !f.label.includes('optional'));
  for (const field of required) {
    if (!credentials[field.key] || !String(credentials[field.key]).trim()) {
      return {
        ok: false,
        status: 'error',
        message: `Missing required field: ${field.label}`,
      };
    }
  }

  let verifyResult: { ok: boolean; message: string; summary?: Record<string, string> };

  try {
    if (provider === 'whatsapp') {
      const phoneId = credentials.phoneNumberId.trim();
      const token = credentials.accessToken.trim();
      const resp = await fetch(`https://graph.facebook.com/v20.0/${encodeURIComponent(phoneId)}?fields=display_phone_number,verified_name`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(6000),
      });
      if (!resp.ok) {
        const errBody = await resp.text();
        verifyResult = {
          ok: false,
          message: `Meta Graph API verification failed (${resp.status}): ${errBody.slice(0, 140)}`,
        };
      } else {
        const data = (await resp.json()) as { display_phone_number?: string; verified_name?: string };
        verifyResult = {
          ok: true,
          message: `Connected to WhatsApp (${data.verified_name || data.display_phone_number || phoneId})`,
          summary: {
            phoneNumberId: phoneId,
            displayPhone: data.display_phone_number || '',
            verifiedName: data.verified_name || '',
          },
        };
      }
    } else if (provider === 'shopify') {
      const domain = credentials.shopDomain.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
      const token = credentials.adminToken.trim();
      const resp = await fetch(`https://${domain}/admin/api/2024-10/shop.json`, {
        headers: { 'X-Shopify-Access-Token': token },
        signal: AbortSignal.timeout(6000),
      });
      if (!resp.ok) {
        verifyResult = {
          ok: false,
          message: `Shopify API rejected credentials (${resp.status}). Check domain and Admin token.`,
        };
      } else {
        const data = (await resp.json()) as { shop?: { name?: string; domain?: string; currency?: string } };
        verifyResult = {
          ok: true,
          message: `Connected to Shopify store: ${data.shop?.name || domain}`,
          summary: {
            shopDomain: domain,
            shopName: data.shop?.name || domain,
            currency: data.shop?.currency || 'INR',
          },
        };
      }
    } else if (provider === 'shiprocket') {
      const resp = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: credentials.email.trim(),
          password: credentials.password,
        }),
        signal: AbortSignal.timeout(6000),
      });
      if (!resp.ok) {
        verifyResult = {
          ok: false,
          message: `Shiprocket login failed (${resp.status}). Verify API user credentials.`,
        };
      } else {
        const data = (await resp.json()) as { token?: string; company_id?: number };
        verifyResult = {
          ok: Boolean(data.token),
          message: data.token ? 'Shiprocket API credentials verified.' : 'Shiprocket did not return an auth token.',
          summary: { email: credentials.email.trim(), companyId: String(data.company_id || '') },
        };
      }
    } else {
      // Razorpay verification
      const authHeader = Buffer.from(`${credentials.keyId.trim()}:${credentials.keySecret.trim()}`).toString('base64');
      const resp = await fetch('https://api.razorpay.com/v1/payments?count=1', {
        headers: { Authorization: `Basic ${authHeader}` },
        signal: AbortSignal.timeout(6000),
      });
      if (!resp.ok) {
        verifyResult = {
          ok: false,
          message: `Razorpay verification failed (${resp.status}). Check Key ID and Key Secret.`,
        };
      } else {
        verifyResult = {
          ok: true,
          message: 'Razorpay API credentials verified.',
          summary: { keyId: credentials.keyId.trim() },
        };
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network error during provider verification';
    verifyResult = { ok: false, message: `Connection error: ${msg}` };
  }

  const encrypted = verifyResult.ok ? encryptCredentials(credentials) : '';
  const newStatus = verifyResult.ok ? 'connected' : 'error';

  db.prepare(
    `INSERT INTO integration_accounts (id, business_id, provider, status, encrypted_credentials, config_json, last_verified_at, last_error, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(business_id, provider) DO UPDATE SET
       status = excluded.status,
       encrypted_credentials = CASE WHEN excluded.status = 'connected' THEN excluded.encrypted_credentials ELSE integration_accounts.encrypted_credentials END,
       config_json = excluded.config_json,
       last_verified_at = excluded.last_verified_at,
       last_error = excluded.last_error,
       updated_at = datetime('now')`
  ).run(
    generateId('INT'),
    businessId,
    provider,
    newStatus,
    encrypted,
    JSON.stringify(verifyResult.summary || {}),
    verifyResult.ok ? new Date().toISOString() : null,
    verifyResult.ok ? '' : verifyResult.message
  );

  writeAuditLog(db, {
    id: generateId('AUD'),
    businessId,
    userId,
    actorType: 'merchant',
    action: verifyResult.ok ? 'integration_connected' : 'integration_verification_failed',
    entityType: 'integration',
    entityId: provider,
    details: { status: newStatus, message: verifyResult.message },
  });

  return {
    ok: verifyResult.ok,
    status: newStatus,
    message: verifyResult.message,
    details: verifyResult.summary,
  };
}

export function disconnectIntegration(
  db: DatabaseSync,
  businessId: string,
  userId: string | null,
  provider: IntegrationProvider
): void {
  db.prepare(
    `UPDATE integration_accounts
     SET status = 'disconnected', encrypted_credentials = '', last_error = 'Disconnected by merchant', updated_at = datetime('now')
     WHERE business_id = ? AND provider = ?`
  ).run(businessId, provider);

  writeAuditLog(db, {
    id: generateId('AUD'),
    businessId,
    userId,
    actorType: 'merchant',
    action: 'integration_disconnected',
    entityType: 'integration',
    entityId: provider,
  });
}

export async function sendWhatsAppMessageViaProvider(
  db: DatabaseSync,
  params: {
    businessId: string;
    toPhone: string;
    body: string;
    mode: 'demo' | 'live';
  }
): Promise<{ ok: boolean; providerMessageId?: string; status: 'sent' | 'simulated' | 'failed'; error?: string }> {
  if (params.mode === 'demo') {
    return {
      ok: true,
      providerMessageId: `SIM-WA-${Date.now()}`,
      status: 'simulated',
    };
  }

  const row = db
    .prepare(
      `SELECT status, encrypted_credentials FROM integration_accounts
       WHERE business_id = ? AND provider = 'whatsapp'`
    )
    .get(params.businessId) as { status: string; encrypted_credentials: string } | undefined;

  if (!row || row.status !== 'connected' || !row.encrypted_credentials) {
    return {
      ok: false,
      status: 'failed',
      error: 'WhatsApp Cloud API is not connected. Configure and verify WhatsApp credentials in Integrations first.',
    };
  }

  const creds = decryptCredentials(row.encrypted_credentials) as { phoneNumberId?: string; accessToken?: string } | null;
  if (!creds?.phoneNumberId || !creds?.accessToken) {
    return {
      ok: false,
      status: 'failed',
      error: 'Stored WhatsApp credentials could not be decrypted.',
    };
  }

  const normalizedPhone = params.toPhone.replace(/[^\d]/g, '');
  const maxAttempts = 2;
  let lastError = 'WhatsApp delivery failed';

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const resp = await fetch(
        `https://graph.facebook.com/v20.0/${encodeURIComponent(creds.phoneNumberId)}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${creds.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: normalizedPhone,
            type: 'text',
            text: { body: params.body },
          }),
          signal: AbortSignal.timeout(7000),
        }
      );

      const data = (await resp.json()) as { messages?: Array<{ id?: string }>; error?: { message?: string } };
      if (resp.ok) {
        return {
          ok: true,
          providerMessageId: data.messages?.[0]?.id || `WA-${Date.now()}`,
          status: 'sent',
        };
      }

      lastError = data.error?.message || `WhatsApp Cloud API returned HTTP ${resp.status}`;
      // Do not retry client/auth/validation 4xx errors
      if (resp.status >= 400 && resp.status < 500) {
        return { ok: false, status: 'failed', error: lastError };
      }
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : 'WhatsApp network delivery failed';
    }

    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  }

  return {
    ok: false,
    status: 'failed',
    error: lastError,
  };
}

export async function syncShopifyCustomersAndOrders(
  db: DatabaseSync,
  businessId: string,
  userId: string | null
): Promise<{ ok: boolean; importedCustomers: number; importedOrders: number; message: string }> {
  const row = db
    .prepare(
      `SELECT status, encrypted_credentials FROM integration_accounts
       WHERE business_id = ? AND provider = 'shopify'`
    )
    .get(businessId) as { status: string; encrypted_credentials: string } | undefined;

  if (!row || row.status !== 'connected' || !row.encrypted_credentials) {
    return {
      ok: false,
      importedCustomers: 0,
      importedOrders: 0,
      message: 'Shopify is not connected. Connect Shopify credentials first.',
    };
  }

  const creds = decryptCredentials(row.encrypted_credentials) as { shopDomain?: string; adminToken?: string } | null;
  if (!creds?.shopDomain || !creds?.adminToken) {
    return { ok: false, importedCustomers: 0, importedOrders: 0, message: 'Missing Shopify credentials.' };
  }

  try {
    const resp = await fetch(`https://${creds.shopDomain}/admin/api/2024-10/orders.json?status=any&limit=25`, {
      headers: { 'X-Shopify-Access-Token': creds.adminToken },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) {
      return { ok: false, importedCustomers: 0, importedOrders: 0, message: `Shopify sync failed (HTTP ${resp.status})` };
    }
    const data = (await resp.json()) as {
      orders?: Array<{
        id: number;
        name: string;
        total_price: string;
        financial_status: string;
        gateway: string;
        created_at: string;
        customer?: { first_name?: string; last_name?: string; phone?: string; email?: string };
        shipping_address?: { city?: string; province?: string; address1?: string; zip?: string };
        line_items?: Array<{ title: string }>;
      }>;
    };

    const orders = data.orders || [];
    let importedCustomers = 0;
    let importedOrders = 0;

    for (const o of orders) {
      const custName = `${o.customer?.first_name || 'Shopify'} ${o.customer?.last_name || 'Buyer'}`.trim();
      const phone = o.customer?.phone || o.customer?.email || `SHOP-${o.id}`;
      let custRow = db
        .prepare('SELECT id FROM customers WHERE business_id = ? AND phone = ?')
        .get(businessId, phone) as { id: string } | undefined;

      if (!custRow) {
        const custId = generateId('CUST');
        db.prepare(
          `INSERT INTO customers (id, business_id, name, phone, email, city, state, address_line, pincode, total_orders, total_spent, last_product_ordered, last_order_date, segment, is_demo)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, 'regular', 0)`
        ).run(
          custId,
          businessId,
          custName,
          phone,
          o.customer?.email || '',
          o.shipping_address?.city || '',
          o.shipping_address?.province || '',
          o.shipping_address?.address1 || '',
          o.shipping_address?.zip || '',
          Number(o.total_price || 0),
          o.line_items?.[0]?.title || 'Shopify Order',
          o.created_at.slice(0, 10)
        );
        custRow = { id: custId };
        importedCustomers += 1;
      }

      const existingOrder = db
        .prepare('SELECT id FROM orders WHERE business_id = ? AND order_number = ?')
        .get(businessId, o.name) as { id: string } | undefined;

      if (!existingOrder) {
        const isCod = (o.gateway || '').toLowerCase().includes('cod') || o.financial_status === 'pending';
        db.prepare(
          `INSERT INTO orders (id, business_id, customer_id, order_number, items_json, total_amount, payment_mode, delivery_address, pincode, status, cod_risk_score, is_demo, ordered_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
        ).run(
          generateId('ORD'),
          businessId,
          custRow.id,
          o.name,
          JSON.stringify((o.line_items || []).map((i) => i.title)),
          Number(o.total_price || 0),
          isCod ? 'COD' : 'Prepaid_UPI',
          o.shipping_address?.address1 || '',
          o.shipping_address?.zip || '',
          'Pending_Verification',
          isCod ? 45 : 10,
          o.created_at.slice(0, 10)
        );
        importedOrders += 1;
      }
    }

    writeAuditLog(db, {
      id: generateId('AUD'),
      businessId,
      userId,
      actorType: 'system',
      action: 'shopify_sync_completed',
      entityType: 'integration',
      entityId: 'shopify',
      details: { importedCustomers, importedOrders },
    });

    return {
      ok: true,
      importedCustomers,
      importedOrders,
      message: `Synced ${importedCustomers} customers and ${importedOrders} orders from Shopify.`,
    };
  } catch (err: unknown) {
    return {
      ok: false,
      importedCustomers: 0,
      importedOrders: 0,
      message: err instanceof Error ? err.message : 'Shopify sync error',
    };
  }
}

export function decryptCredentialsSafe(encrypted: string): Record<string, string> | null {
  return decryptCredentials(encrypted) as Record<string, string> | null;
}
