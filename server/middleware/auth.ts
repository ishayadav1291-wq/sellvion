import type { Request, Response, NextFunction } from 'express';
import { getDb } from '../db/database.ts';
import { DEMO_BUSINESS_ID } from '../db/seedDemo.ts';
import { hashToken } from '../utils/crypto.ts';

export interface AuthContext {
  userId: string | null;
  email: string | null;
  fullName: string;
  businessId: string;
  businessName: string;
  role: 'owner' | 'manager' | 'staff' | 'demo_visitor';
  mode: 'demo' | 'live';
  isAuthenticated: boolean;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export function extractCookie(req: Request, name: string): string | null {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) {
      return decodeURIComponent(v.join('='));
    }
  }
  return null;
}

export function resolveAuthContext(req: Request, _res: Response, next: NextFunction): void {
  const db = getDb();
  const bearer = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7).trim()
    : null;
  const cookieToken = extractCookie(req, 'sellvion_session');
  const rawToken = bearer || cookieToken;
  const requestedMode = req.headers['x-sellvion-mode'];

  if (rawToken && requestedMode !== 'demo') {
    const tokenHash = hashToken(rawToken);
    const row = db
      .prepare(
        `SELECT s.user_id, s.business_id, s.expires_at, u.email, u.full_name,
                b.name AS business_name, b.mode AS business_mode, bm.role
         FROM sessions s
         JOIN users u ON u.id = s.user_id
         JOIN businesses b ON b.id = s.business_id
         JOIN business_members bm ON bm.business_id = s.business_id AND bm.user_id = s.user_id
         WHERE s.token_hash = ?`
      )
      .get(tokenHash) as
      | {
          user_id: string;
          business_id: string;
          expires_at: string;
          email: string;
          full_name: string;
          business_name: string;
          business_mode: 'demo' | 'live';
          role: 'owner' | 'manager' | 'staff';
        }
      | undefined;

    if (row && new Date(row.expires_at).getTime() > Date.now()) {
      req.auth = {
        userId: row.user_id,
        email: row.email,
        fullName: row.full_name,
        businessId: row.business_id,
        businessName: row.business_name,
        role: row.role,
        mode: row.business_mode,
        isAuthenticated: true,
      };
      return next();
    }
  }

  // Fallback to explicit Demo Sandbox tenant (strictly isolated from any Live business)
  const demoBiz = db
    .prepare('SELECT id, name, mode FROM businesses WHERE id = ?')
    .get(DEMO_BUSINESS_ID) as { id: string; name: string; mode: 'demo' | 'live' } | undefined;

  req.auth = {
    userId: null,
    email: null,
    fullName: 'Demo Merchant',
    businessId: demoBiz?.id || DEMO_BUSINESS_ID,
    businessName: demoBiz?.name || 'Mystic Spices & Naturals (Demo Store)',
    role: 'demo_visitor',
    mode: 'demo',
    isAuthenticated: false,
  };
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.auth || !req.auth.isAuthenticated) {
    return res.status(401).json({
      error: 'Authentication required for Live Mode operations.',
      code: 'AUTH_REQUIRED',
    });
  }
  return next();
}

export function requireRole(allowedRoles: Array<'owner' | 'manager' | 'staff' | 'demo_visitor'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth || !allowedRoles.includes(req.auth.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions for this action.',
        code: 'FORBIDDEN',
      });
    }
    return next();
  };
}
