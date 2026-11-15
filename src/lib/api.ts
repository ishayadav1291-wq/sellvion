import { AppMode } from '../types';

const TOKEN_STORAGE_KEY = 'sellvion_auth_token';
const MODE_STORAGE_KEY = 'sellvion_mode_override';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // ignore storage failures
  }
}

export function getModeHeader(): AppMode | null {
  try {
    const val = localStorage.getItem(MODE_STORAGE_KEY);
    return val === 'demo' || val === 'live' ? val : null;
  } catch {
    return null;
  }
}

export function setModeHeader(mode: AppMode | null): void {
  try {
    if (mode) localStorage.setItem(MODE_STORAGE_KEY, mode);
    else localStorage.removeItem(MODE_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const modeOverride = getModeHeader();

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token && modeOverride !== 'demo') {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (modeOverride === 'demo') {
    headers.set('x-sellvion-mode', 'demo');
  }

  const resp = await fetch(path, {
    ...options,
    headers,
    credentials: 'include',
  });

  const text = await resp.text();
  let data: unknown = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  if (!resp.ok) {
    const errMsg =
      typeof data === 'object' && data && 'error' in data
        ? String((data as { error: unknown }).error)
        : `Request failed (${resp.status})`;
    throw new ApiError(errMsg, resp.status);
  }

  return data as T;
}
