import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/database.js';

export class ReconnectManager {
  private sessions = new Map<string, { userId: string; roomId: string; playerId: string }>();

  async createSession(userId: string, roomId: string, playerId: string): Promise<string> {
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.reconnectSession.create({
      data: { token, userId, roomId, playerId, expiresAt },
    });

    this.sessions.set(token, { userId, roomId, playerId });
    return token;
  }

  async validateSession(
    token: string,
  ): Promise<{ userId: string; roomId: string; playerId: string } | null> {
    const cached = this.sessions.get(token);
    if (cached) return cached;

    const session = await prisma.reconnectSession.findUnique({ where: { token } });
    if (!session || session.expiresAt < new Date()) return null;

    const data = {
      userId: session.userId,
      roomId: session.roomId,
      playerId: session.playerId,
    };
    this.sessions.set(token, data);
    return data;
  }

  invalidate(token: string): void {
    this.sessions.delete(token);
  }
}

export const reconnectManager = new ReconnectManager();
