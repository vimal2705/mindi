import type { Request, Response, NextFunction } from 'express';
import { authService } from '../services/AuthService.js';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    username: string;
    displayName: string;
    isGuest: boolean;
  };
}

export function jwtMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing token' });
    return;
  }
  const token = header.slice(7);
  const payload = authService.verifyToken(token);
  if (!payload) {
    res.status(401).json({ code: 'UNAUTHORIZED', message: 'Invalid token' });
    return;
  }
  req.user = payload;
  next();
}

export function optionalJwt(req: AuthRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    const payload = authService.verifyToken(header.slice(7));
    if (payload) req.user = payload;
  }
  next();
}

export function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== process.env.ADMIN_SECRET) {
    res.status(403).json({ code: 'FORBIDDEN', message: 'Admin access required' });
    return;
  }
  next();
}
