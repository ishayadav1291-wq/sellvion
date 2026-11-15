import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { getDb } from './server/db/database.ts';
import { ensureDemoSeeded } from './server/db/seedDemo.ts';
import { resolveAuthContext } from './server/middleware/auth.ts';
import { authRouter } from './server/routes/authRoutes.ts';
import { commerceRouter } from './server/routes/commerceRoutes.ts';
import { agentRouter } from './server/routes/agentRoutes.ts';
import { isGeminiConfigured } from './server/services/geminiService.ts';
import { pythonAgentBridgeMiddleware } from './server/services/pythonAgentBridge.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const db = getDb();
  ensureDemoSeeded(db);

  const app = express();
  app.set('trust proxy', 1);

  // Security headers compatible with AI Studio iFrame hosting
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Capture rawBody for webhook HMAC signature verification
  app.use(
    express.json({
      limit: '4mb',
      verify: (req, _res, buf) => {
        (req as express.Request & { rawBody?: string }).rawBody = buf.toString('utf8');
      },
    })
  );

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'sellvion-platform',
      geminiConfigured: isGeminiConfigured(),
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/docs', (_req, res) => {
    res.json({
      name: 'SELLVION Merchant Platform API',
      version: '1.0.0',
      endpoints: [
        'GET /api/health',
        'GET /api/auth/me',
        'POST /api/auth/signup',
        'POST /api/auth/login',
        'POST /api/auth/logout',
        'POST /api/auth/forgot-password',
        'POST /api/auth/reset-password',
        'PATCH /api/business/profile',
        'GET /api/business/settings',
        'PUT /api/business/settings',
        'POST /api/business/reset-demo',
        'GET /api/customers',
        'POST /api/customers',
        'GET /api/customers/:id',
        'PATCH /api/customers/:id',
        'GET /api/products',
        'POST /api/products',
        'GET /api/orders',
        'POST /api/orders',
        'POST /api/orders/:id/action',
        'POST /api/cod/score',
        'GET /api/udhaar',
        'POST /api/udhaar',
        'POST /api/udhaar/:customerId/payment',
        'POST /api/udhaar/:customerId/prepare-reminder',
        'POST /api/imports/preview',
        'POST /api/imports/execute',
        'GET /api/imports/batches',
        'POST /api/imports/:batchId/rollback',
        'GET /api/agents',
        'GET /api/workflows',
        'POST /api/workflows/run',
        'POST /api/workflows/:id/retry',
        'POST /api/workflows/:id/escalate',
        'GET /api/approvals',
        'PATCH /api/approvals/:id',
        'POST /api/approvals/:id/decision',
        'POST /api/approvals/bulk-approve',
        'GET /api/integrations',
        'POST /api/integrations/:provider/connect',
        'POST /api/integrations/:provider/disconnect',
        'POST /api/integrations/shopify/sync',
        'POST /api/webhooks/:provider',
        'GET /api/analytics/summary',
        'GET /api/analytics/export',
        'GET /api/audit-logs',
        'GET /api/system/status',
        'GET /api/business/backup',
        'POST /api/ai/draft-message',
        'POST /api/ai/ask-copilot',
        'POST /api/ai/parse-voice-command',
      ],
    });
  });

  app.use('/api', resolveAuthContext);
  app.use('/api', pythonAgentBridgeMiddleware);
  app.use('/api', authRouter);
  app.use('/api', commerceRouter);
  app.use('/api', agentRouter);

  app.use('/api', (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('API Error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err?.message || 'Internal server error.' });
    }
  });

  return app;
}

async function startServer() {
  const app = createApp();
  const port = Number(process.env.PORT || 3000);

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`SELLVION server running on http://0.0.0.0:${port}`);
  });
}

const isDirectEntry =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectEntry && process.env.SELLVION_SKIP_LISTEN !== '1') {
  startServer();
}
