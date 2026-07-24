import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
import { DEFAULT_AVATARS, type UserDTO } from '@mindi-coat/shared';

export interface JwtPayload {
  userId: string;
  username: string;
  displayName: string;
  isGuest: boolean;
}

export class AuthService {
  signToken(payload: JwtPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '7d' });
  }

  verifyToken(token: string): JwtPayload | null {
    try {
      return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch {
      return null;
    }
  }

  async guestLogin(displayName?: string): Promise<{ token: string; user: UserDTO }> {
    const suffix = uuidv4().slice(0, 6);
    const username = `guest_${suffix}`;
    const name = displayName?.trim() || `Guest ${suffix.toUpperCase()}`;
    const avatar = DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)];

    const user = await prisma.user.create({
      data: {
        username,
        displayName: name,
        avatar,
        isGuest: true,
      },
    });

    const token = this.signToken({
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      isGuest: true,
    });

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        isGuest: user.isGuest,
      },
    };
  }

  async getUser(userId: string): Promise<UserDTO | null> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
      isGuest: user.isGuest,
    };
  }
}

export const authService = new AuthService();
