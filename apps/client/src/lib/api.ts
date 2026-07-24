import type { AuthResponse, UserDTO } from '@mindi-coat/shared';

const API_URL = import.meta.env.VITE_API_URL || '';

export async function guestLogin(displayName?: string): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/api/auth/guest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName }),
  });
  if (!res.ok) throw new Error('Login failed');
  return res.json();
}

export async function getMe(token: string): Promise<{ user: UserDTO }> {
  const res = await fetch(`${API_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Unauthorized');
  return res.json();
}

export async function getAdminStats(adminKey: string) {
  const res = await fetch(`${API_URL}/api/admin/stats`, {
    headers: { 'x-admin-key': adminKey },
  });
  if (!res.ok) throw new Error('Admin access failed');
  return res.json();
}

export async function getAdminRooms(adminKey: string) {
  const res = await fetch(`${API_URL}/api/admin/rooms`, {
    headers: { 'x-admin-key': adminKey },
  });
  if (!res.ok) throw new Error('Admin access failed');
  return res.json();
}
