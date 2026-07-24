import type { AuthResponse, UserDTO } from '@mindi-coat/shared';

const API_URL = import.meta.env.VITE_API_URL || '';

const REQUEST_TIMEOUT_MS = 90_000;
const MAX_RETRIES = 4;
const RETRY_DELAY_MS = 3_000;

async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = MAX_RETRIES,
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);
      return res;
    } catch (error) {
      lastError = error;
      if (attempt < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  }
  throw lastError;
}

/** Wake Render free-tier server (may take 30–60s when sleeping). */
export async function wakeServer(onProgress?: (message: string) => void): Promise<void> {
  onProgress?.('Connecting to server...');
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      onProgress?.(
        attempt === 1
          ? 'Waking up server...'
          : `Server starting up (attempt ${attempt}/${MAX_RETRIES})...`,
      );
      const res = await fetchWithRetry(`${API_URL}/health`, {}, 1);
      if (res.ok) {
        onProgress?.('Server ready!');
        return;
      }
    } catch {
      if (attempt === MAX_RETRIES) break;
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
  throw new Error('Server unavailable');
}

export async function guestLogin(
  displayName?: string,
  onProgress?: (message: string) => void,
): Promise<AuthResponse> {
  await wakeServer(onProgress);
  onProgress?.('Creating guest session...');
  const res = await fetchWithRetry(`${API_URL}/api/auth/guest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName }),
  });
  if (!res.ok) throw new Error('Login failed');
  return res.json();
}

export async function getMe(token: string): Promise<{ user: UserDTO }> {
  const res = await fetchWithRetry(`${API_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Unauthorized');
  return res.json();
}

export async function getAdminStats(adminKey: string) {
  const res = await fetchWithRetry(`${API_URL}/api/admin/stats`, {
    headers: { 'x-admin-key': adminKey },
  });
  if (!res.ok) throw new Error('Admin access failed');
  return res.json();
}

export async function getAdminRooms(adminKey: string) {
  const res = await fetchWithRetry(`${API_URL}/api/admin/rooms`, {
    headers: { 'x-admin-key': adminKey },
  });
  if (!res.ok) throw new Error('Admin access failed');
  return res.json();
}
