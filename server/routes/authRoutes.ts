import express from 'express';
import { getDb, writeAuditLog } from '../db/database.ts';
import { createBusinessScaffold, DEMO_BUSINESS_ID, ensureDemoSeeded } from '../db/seedDemo.ts';
import { requireAuth, requireRole } from '../middleware/auth.ts';
import {
  createSessionToken,
  generateId,
  hashPassword,
  hashToken,
  verifyPassword,
} from '../utils/crypto.ts';
import { rateLimit } from '../utils/rateLimit.ts';

export const authRouter = express.Router();

const authLimiter = rateLimit({ windowMs: 60_000, max: 30, keyPrefix: 'auth' });

function setSessionCookie(res: express.Response, token: string): void {
  res.cookie('sellvion_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

authRouter.get('/auth/me', (req, res) => {
  const db = getDb();
  const auth = req.auth!;
  const business = db
    .prepare('SELECT * FROM businesses WHERE id = ?')
    .get(auth.businessId) as Record<string, any> | undefined;

  const settings = db
    .prepare('SELECT * FROM business_settings WHERE business_id = ?')
    .get(auth.businessId) as Record<string, any> | undefined;

  let user: Record<string, any> | null = null;
  if (auth.userId) {
    user = db
      .prepare('SELECT id, email, full_name, email_verified, created_at FROM users WHERE id = ?')
      .get(auth.userId) as Record<string, any> | null;
  }

  res.json({
    isAuthenticated: auth.isAuthenticated,
    mode: auth.mode,
    role: auth.role,
    user,
    business,
    settings,
  });
});

authRouter.post('/auth/signup', authLimiter, (req, res) => {
  const { email, password, fullName, businessName, category, city, state, preferredLanguage, storeUrl } = req.body || {};

  if (!email || !password || !fullName || !businessName) {
    return res.status(400).json({ error: 'Name, email, password, and business name are required.' });
  }
  const cleanEmail = String(email).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists. Please log in.' });
  }

  const userId = generateId('USR');
  const businessId = generateId('BIZ');
  const verificationToken = createSessionToken();
  const rawSessionToken = createSessionToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  db.exec('BEGIN');
  try {
    db.prepare(
      `INSERT INTO users (id, email, password_hash, full_name, email_verified, verification_token)
       VALUES (?, ?, ?, ?, 0, ?)`
    ).run(userId, cleanEmail, hashPassword(String(password)), String(fullName).trim(), hashToken(verificationToken));

    createBusinessScaffold(db, {
      businessId,
      name: String(businessName).trim(),
      category: String(category || 'Retail & D2C').trim(),
      city: String(city || '').trim(),
      state: String(state || '').trim(),
      preferredLanguage: String(preferredLanguage || 'en'),
      storeUrl: String(storeUrl || '').trim(),
      userId,
    });

    db.prepare(
      `INSERT INTO sessions (id, user_id, business_id, token_hash, expires_at)
       VALUES (?, ?, ?, ?, ?)`
    ).run(generateId('SES'), userId, businessId, hashToken(rawSessionToken), expiresAt);

    writeAuditLog(db, {
      id: generateId('AUD'),
      businessId,
      userId,
      actorType: 'merchant',
      action: 'merchant_signed_up',
      entityType: 'business',
      entityId: businessId,
      ipAddress: req.ip || '',
    });

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    return res.status(500).json({ error: 'Failed to create account.' });
  }

  setSessionCookie(res, rawSessionToken);
  return res.status(201).json({
    token: rawSessionToken,
    verificationToken: process.env.NODE_ENV !== 'production' ? verificationToken : undefined,
    user: { id: userId, email: cleanEmail, fullName: String(fullName).trim(), emailVerified: false },
    businessId,
    mode: 'live',
  });
});

authRouter.post('/auth/login', authLimiter, (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  const cleanEmail = String(email).trim().toLowerCase();
  const db = getDb();

  const user = db
    .prepare('SELECT id, email, password_hash, full_name, email_verified FROM users WHERE email = ?')
    .get(cleanEmail) as
    | { id: string; email: string; password_hash: string; full_name: string; email_verified: number }
    | undefined;

  if (!user || !verifyPassword(String(password), user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const membership = db
    .prepare(
      `SELECT bm.business_id, bm.role, b.name AS business_name, b.mode
       FROM business_members bm
       JOIN businesses b ON b.id = bm.business_id
       WHERE bm.user_id = ? LIMIT 1`
    )
    .get(user.id) as { business_id: string; role: string; business_name: string; mode: string } | undefined;

  if (!membership) {
    return res.status(403).json({ error: 'No business workspace linked to this account.' });
  }

  const rawToken = createSessionToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  db.prepare(
    `INSERT INTO sessions (id, user_id, business_id, token_hash, expires_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(generateId('SES'), user.id, membership.business_id, hashToken(rawToken), expiresAt);

  writeAuditLog(db, {
    id: generateId('AUD'),
    businessId: membership.business_id,
    userId: user.id,
    actorType: 'merchant',
    action: 'merchant_logged_in',
    entityType: 'user',
    entityId: user.id,
    ipAddress: req.ip || '',
  });

  setSessionCookie(res, rawToken);
  return res.json({
    token: rawToken,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      emailVerified: Boolean(user.email_verified),
    },
    businessId: membership.business_id,
    businessName: membership.business_name,
    role: membership.role,
    mode: membership.mode,
  });
});

authRouter.post('/auth/logout', (req, res) => {
  const db = getDb();
  const bearer = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7).trim() : null;
  if (bearer) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(bearer));
  }
  res.clearCookie('sellvion_session', { path: '/' });
  return res.json({ ok: true });
});

authRouter.post('/auth/forgot-password', authLimiter, (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  const db = getDb();
  const user = db
    .prepare('SELECT id FROM users WHERE email = ?')
    .get(String(email).trim().toLowerCase()) as { id: string } | undefined;

  // Always return neutral response so email enumeration is prevented
  if (!user) {
    return res.json({
      ok: true,
      message: 'If an account matches this email, password reset instructions have been prepared.',
    });
  }

  const resetToken = createSessionToken();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  db.prepare(
    `INSERT INTO password_resets (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)`
  ).run(generateId('RST'), user.id, hashToken(resetToken), expiresAt);

  return res.json({
    ok: true,
    message: 'Password reset token generated (valid for 30 minutes).',
    devResetToken: process.env.NODE_ENV !== 'production' ? resetToken : undefined,
  });
});

authRouter.post('/auth/reset-password', authLimiter, (req, res) => {
  const { token, newPassword } = req.body || {};
  if (!token || !newPassword || String(newPassword).length < 8) {
    return res.status(400).json({ error: 'Valid reset token and new password (min 8 chars) are required.' });
  }

  const db = getDb();
  const row = db
    .prepare('SELECT id, user_id, expires_at, used FROM password_resets WHERE token_hash = ?')
    .get(hashToken(String(token))) as { id: string; user_id: string; expires_at: string; used: number } | undefined;

  if (!row || row.used === 1 || new Date(row.expires_at).getTime() < Date.now()) {
    return res.status(400).json({ error: 'Reset token is invalid or expired.' });
  }

  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(String(newPassword)), row.user_id);
  db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(row.id);
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(row.user_id);

  return res.json({ ok: true, message: 'Password updated. You can now log in with your new password.' });
});

authRouter.post('/auth/verify-email', requireAuth, (req, res) => {
  const { token } = req.body || {};
  const db = getDb();
  const user = db
    .prepare('SELECT id, verification_token FROM users WHERE id = ?')
    .get(req.auth!.userId) as { id: string; verification_token: string } | undefined;

  if (!user || !token || user.verification_token !== hashToken(String(token))) {
    return res.status(400).json({ error: 'Invalid verification token.' });
  }

  db.prepare('UPDATE users SET email_verified = 1 WHERE id = ?').run(user.id);
  return res.json({ ok: true, emailVerified: true });
});

authRouter.patch('/business/profile', requireAuth, requireRole(['owner', 'manager']), (req, res) => {
  const { name, category, city, state, currency, timezone, preferredLanguage, storeUrl } = req.body || {};
  const db = getDb();

  db.prepare(
    `UPDATE businesses
     SET name = COALESCE(?, name),
         category = COALESCE(?, category),
         city = COALESCE(?, city),
         state = COALESCE(?, state),
         currency = COALESCE(?, currency),
         timezone = COALESCE(?, timezone),
         preferred_language = COALESCE(?, preferred_language),
         store_url = COALESCE(?, store_url)
     WHERE id = ?`
  ).run(
    name ?? null,
    category ?? null,
    city ?? null,
    state ?? null,
    currency ?? null,
    timezone ?? null,
    preferredLanguage ?? null,
    storeUrl ?? null,
    req.auth!.businessId
  );

  writeAuditLog(db, {
    id: generateId('AUD'),
    businessId: req.auth!.businessId,
    userId: req.auth!.userId,
    actorType: 'merchant',
    action: 'business_profile_updated',
    entityType: 'business',
    entityId: req.auth!.businessId,
  });

  const updated = db.prepare('SELECT * FROM businesses WHERE id = ?').get(req.auth!.businessId);
  return res.json({ business: updated });
});

authRouter.get('/business/settings', (req, res) => {
  const db = getDb();
  const settings = db
    .prepare('SELECT * FROM business_settings WHERE business_id = ?')
    .get(req.auth!.businessId);
  return res.json({ settings });
});

authRouter.put('/business/settings', requireRole(['owner', 'manager', 'demo_visitor']), (req, res) => {
  const db = getDb();
  const b = req.body || {};
  const businessId = req.auth!.businessId;

  db.prepare(
    `UPDATE business_settings
     SET reorder_mode = COALESCE(?, reorder_mode),
         cod_prepay_mode = COALESCE(?, cod_prepay_mode),
         udhaar_mode = COALESCE(?, udhaar_mode),
         winback_mode = COALESCE(?, winback_mode),
         max_daily_messages = COALESCE(?, max_daily_messages),
         quiet_hours_start = COALESCE(?, quiet_hours_start),
         quiet_hours_end = COALESCE(?, quiet_hours_end),
         min_confidence = COALESCE(?, min_confidence),
         max_discount_pct = COALESCE(?, max_discount_pct),
         daily_spend_cap_inr = COALESCE(?, daily_spend_cap_inr),
         emergency_pause_all = COALESCE(?, emergency_pause_all),
         updated_at = datetime('now')
     WHERE business_id = ?`
  ).run(
    b.reorderReminders ?? b.reorder_mode ?? null,
    b.codPrepayNudges ?? b.cod_prepay_mode ?? null,
    b.udhaarReminders ?? b.udhaar_mode ?? null,
    b.winbackOffers ?? b.winback_mode ?? null,
    b.maxDailyMessagesPerCustomer ?? b.max_daily_messages ?? null,
    b.quietHoursStart ?? b.quiet_hours_start ?? null,
    b.quietHoursEnd ?? b.quiet_hours_end ?? null,
    b.minConfidenceForAutonomous ?? b.min_confidence ?? null,
    b.maxAutonomousDiscountPct ?? b.max_discount_pct ?? null,
    b.dailySpendCapInr ?? b.daily_spend_cap_inr ?? null,
    typeof b.emergencyPauseAll === 'boolean'
      ? b.emergencyPauseAll ? 1 : 0
      : typeof b.emergency_pause_all === 'number'
      ? b.emergency_pause_all
      : null,
    businessId
  );

  writeAuditLog(db, {
    id: generateId('AUD'),
    businessId,
    userId: req.auth!.userId,
    actorType: 'merchant',
    action: 'autonomy_settings_updated',
    entityType: 'business_settings',
    entityId: businessId,
    details: b,
  });

  const updated = db.prepare('SELECT * FROM business_settings WHERE business_id = ?').get(businessId);
  return res.json({ settings: updated });
});

authRouter.post('/business/reset-demo', (req, res) => {
  if (req.auth!.mode !== 'demo' && req.auth!.businessId !== DEMO_BUSINESS_ID) {
    return res.status(403).json({ error: 'Reset Demo is only available in Demo Mode.' });
  }
  const db = getDb();
  ensureDemoSeeded(db, true);
  return res.json({ ok: true, message: 'Demo sandbox reset to initial sample state.' });
});
