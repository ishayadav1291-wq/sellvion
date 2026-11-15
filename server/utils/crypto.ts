import crypto from 'crypto';

const RUNTIME_FALLBACK_SECRET = crypto.randomBytes(32).toString('hex');

function getAppSecret(): string {
  return process.env.SESSION_SECRET || process.env.APP_ENCRYPTION_KEY || RUNTIME_FALLBACK_SECRET;
}

function getEncryptionKey(): Buffer {
  return crypto.createHash('sha256').update(getAppSecret()).digest();
}

export function generateId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  const derived = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, 'hex');
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function createSessionToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function encryptCredentials(payload: Record<string, unknown>): string {
  const iv = crypto.randomBytes(12);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const json = JSON.stringify(payload);
  const encrypted = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${authTag.toString('base64')}.${encrypted.toString('base64')}`;
}

export function decryptCredentials(ciphertext: string): Record<string, unknown> | null {
  if (!ciphertext) return null;
  try {
    const parts = ciphertext.split('.');
    if (parts.length !== 3) return null;
    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    const encrypted = Buffer.from(parts[2], 'base64');
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
    return JSON.parse(decrypted);
  } catch {
    return null;
  }
}

export function verifyHmacSignature(rawBody: string, signatureHeader: string | undefined, secret: string, prefix = ''): boolean {
  if (!signatureHeader || !secret) return false;
  const expected = prefix + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(signatureHeader);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
