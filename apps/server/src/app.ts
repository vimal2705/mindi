import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { env, isAllowedOrigin } from './config/env.js';
import { authRouter, adminRouter } from './routes/index.js';
import { SocketGateway } from './gateway/SocketGateway.js';

export function createApp() {
  const app = express();
  const httpServer = createServer(app);

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) callback(null, true);
        else callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));

  app.use(
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.RATE_LIMIT_MAX,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api', (_req, res) => {
    res.json({
      name: 'Mindi Coat API',
      version: '1.0.0',
      docs: '/api/docs',
    });
  });

  app.get('/api/docs', (_req, res) => {
    res.json({
      auth: {
        'POST /api/auth/guest': 'Create guest session',
        'GET /api/auth/me': 'Get current user (Bearer token)',
      },
      admin: {
        'GET /api/admin/stats': 'Server stats (x-admin-key header)',
        'GET /api/admin/rooms': 'Active rooms',
        'POST /api/admin/rooms/:roomId/kick': 'Kick player',
        'POST /api/admin/rooms/:roomId/end': 'End room',
        'GET /api/admin/history': 'Match history',
      },
      socket: {
        events: [
          'create-room',
          'join-room',
          'leave-room',
          'start-game',
          'play-card',
          'player-ready',
          'chat-message',
          'emoji',
          'typing',
          'reconnect',
          'spectator-join',
          'find-match',
        ],
      },
    });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/admin', adminRouter);

  const gateway = new SocketGateway(httpServer);

  return { app, httpServer, gateway };
}
