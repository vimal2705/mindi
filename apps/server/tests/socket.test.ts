import { describe, it, expect } from 'vitest';
import { io } from 'socket.io-client';

const API_URL = process.env.VITE_API_URL || 'http://localhost:3001';
const SOCKET_URL = process.env.VITE_SOCKET_URL || 'http://localhost:3001';

describe.skipIf(!process.env.INTEGRATION_TEST)('Socket integration', () => {
  it('connects with JWT and responds to ping', async () => {
    const res = await fetch(`${API_URL}/api/auth/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: 'Socket Tester' }),
    });
    expect(res.ok).toBe(true);
    const { token } = await res.json();

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Connection timeout')), 5000);
      socket.on('connect', () => {
        socket.emit('ping', (response) => {
          clearTimeout(timeout);
          expect(response.pong).toBeTypeOf('number');
          socket.disconnect();
          resolve();
        });
      });
      socket.on('connect_error', reject);
    });
  }, 10000);
});
