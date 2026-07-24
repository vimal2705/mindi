import { Router } from 'express';
import { z } from 'zod';
import { authService } from '../services/AuthService.js';
import { jwtMiddleware, adminMiddleware, type AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validation.js';
import { roomManager } from '../engine/RoomManager.js';
import { prisma } from '../config/database.js';

const authRouter = Router();

authRouter.post(
  '/guest',
  validateBody(z.object({ displayName: z.string().min(2).max(24).optional() })),
  async (req, res) => {
    try {
      const result = await authService.guestLogin(req.body.displayName);
      res.json(result);
    } catch {
      res.status(500).json({ code: 'AUTH_ERROR', message: 'Failed to create guest session' });
    }
  },
);

authRouter.get('/me', jwtMiddleware, async (req: AuthRequest, res) => {
  const user = await authService.getUser(req.user!.userId);
  if (!user) {
    res.status(404).json({ code: 'NOT_FOUND', message: 'User not found' });
    return;
  }
  res.json({ user });
});

const adminRouter = Router();
adminRouter.use(adminMiddleware);

adminRouter.get('/stats', (_req, res) => {
  const stats = roomManager.getStats();
  res.json({
    stats: {
      ...stats,
      uptime: process.uptime(),
    },
  });
});

adminRouter.get('/rooms', (_req, res) => {
  const rooms = roomManager.getAllRooms().map((r) => r.toRoomStateDTO());
  res.json({ rooms });
});

adminRouter.post('/rooms/:roomId/kick', async (req, res) => {
  const room = roomManager.getRoom(req.params.roomId);
  if (!room) {
    res.status(404).json({ code: 'NOT_FOUND', message: 'Room not found' });
    return;
  }
  const playerId = req.body.playerId as string;
  room.removePlayer(playerId);
  await prisma.player.deleteMany({ where: { id: playerId } });
  res.json({ success: true });
});

adminRouter.post('/rooms/:roomId/end', async (req, res) => {
  roomManager.deleteRoom(req.params.roomId);
  await prisma.room.update({
    where: { id: req.params.roomId },
    data: { status: 'CLOSED' },
  });
  res.json({ success: true });
});

adminRouter.get('/history', async (_req, res) => {
  const history = await prisma.matchHistory.findMany({
    take: 50,
    orderBy: { finishedAt: 'desc' },
  });
  res.json({ history });
});

export { authRouter, adminRouter };
