import type { NextFunction, Request, Response } from 'express';

const BRIDGED_EXACT_PATHS = new Set([
  '/agents',
  '/workflows',
  '/workflows/run',
  '/approvals',
  '/approvals/bulk-approve',
  '/cod/score',
  '/ai/draft-message',
  '/ai/ask-copilot',
  '/ai/parse-voice-command',
  '/analytics/summary',
  '/agentic/agents',
  '/agentic/analyze',
]);

function shouldProxyToFastApi(path: string, method: string): boolean {
  if (BRIDGED_EXACT_PATHS.has(path)) return true;
  if (path.startsWith('/agentic/')) return true;
  if (/^\/workflows\/[^/]+\/(retry|escalate)$/.test(path) && method === 'POST') return true;
  if (/^\/approvals\/[^/]+$/.test(path) && method === 'PATCH') return true;
  if (/^\/approvals\/[^/]+\/decision$/.test(path) && method === 'POST') return true;
  if (/^\/udhaar\/[^/]+\/prepare-reminder$/.test(path) && method === 'POST') return true;
  return false;
}

export async function pythonAgentBridgeMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (process.env.USE_PYTHON_AGENT_BACKEND === 'false') {
    next();
    return;
  }

  if (!shouldProxyToFastApi(req.path, req.method)) {
    next();
    return;
  }

  const baseUrl = (process.env.FASTAPI_AGENT_URL || 'http://127.0.0.1:8010').replace(/\/$/, '');
  const targetUrl = `${baseUrl}${req.originalUrl}`;

  const forwardHeaders: Record<string, string> = {
    Accept: 'application/json',
  };
  if (req.headers.authorization) {
    forwardHeaders.Authorization = String(req.headers.authorization);
  }
  if (req.headers.cookie) {
    forwardHeaders.Cookie = String(req.headers.cookie);
  }
  if (req.headers['x-sellvion-mode']) {
    forwardHeaders['x-sellvion-mode'] = String(req.headers['x-sellvion-mode']);
  }

  const hasBody = !['GET', 'HEAD', 'OPTIONS'].includes(req.method.toUpperCase());
  if (hasBody) {
    forwardHeaders['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body: hasBody ? JSON.stringify(req.body ?? {}) : undefined,
      signal: AbortSignal.timeout(req.path.startsWith('/ai/') || req.path.startsWith('/agentic/') ? 15000 : 8000),
    });

    if (response.headers.get('x-sellvion-service') !== 'agentic-fastapi') {
      next();
      return;
    }

    const contentType = response.headers.get('content-type') || 'application/json';
    const rawText = await response.text();
    res.status(response.status);
    res.setHeader('Content-Type', contentType);
    res.setHeader('X-Sellvion-Engine', 'fastapi-langgraph');
    res.send(rawText);
  } catch {
    // Seamless local fallback to Node handlers when FastAPI worker is offline
    next();
  }
}
