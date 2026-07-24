import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import {
  DEFAULT_ROOM_SETTINGS,
  GamePhase,
  RoomVisibility,
  TargetScore,
  TurnTimer,
  type RoomSettingsDTO,
} from '@mindi-coat/shared';
import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
import { GameEngine } from '../engine/GameEngine.js';
import { roomManager } from '../engine/RoomManager.js';

export class RoomService {
  async createRoom(
    hostUserId: string,
    name: string,
    settings: Partial<RoomSettingsDTO> = {},
    password?: string,
  ): Promise<GameEngine> {
    const host = await prisma.user.findUnique({ where: { id: hostUserId } });
    if (!host) throw new Error('HOST_NOT_FOUND');

    const code = GameEngine.generateCode();
    const passwordHash = password ? await bcrypt.hash(password, 10) : null;
    const mergedSettings: RoomSettingsDTO = {
      ...DEFAULT_ROOM_SETTINGS,
      ...settings,
      password: passwordHash ?? undefined,
    };

    const dbRoom = await prisma.room.create({
      data: {
        code,
        name,
        hostId: hostUserId,
        password: passwordHash,
        settings: { ...mergedSettings, password: undefined } as object,
        visibility: mergedSettings.visibility,
      },
    });

    const playerId = uuidv4();
    await prisma.player.create({
      data: {
        id: playerId,
        roomId: dbRoom.id,
        userId: hostUserId,
        seatIndex: 0,
        team: 'A',
        isReady: false,
      },
    });

    const room = roomManager.createRoom({
      id: dbRoom.id,
      code,
      name,
      hostId: playerId,
      hostUserId,
      settings: mergedSettings,
      inviteBaseUrl: env.CLIENT_URL,
    });

    room.addPlayer({
      id: playerId,
      userId: hostUserId,
      displayName: host.displayName,
      avatar: host.avatar,
    });

    return room;
  }

  async joinRoom(
    userId: string,
    code: string,
    password?: string,
    asSpectator = false,
  ): Promise<{ room: GameEngine; playerId: string }> {
    let room = roomManager.getRoomByCode(code);
    if (!room) {
      const dbRoom = await prisma.room.findUnique({
        where: { code: code.toUpperCase() },
        include: { players: { include: { user: true } } },
      });
      if (!dbRoom) throw new Error('ROOM_NOT_FOUND');
      room = this.hydrateRoom(dbRoom);
    }

    if (room.settings.password && password) {
      const valid = await bcrypt.compare(password, room.settings.password);
      if (!valid) throw new Error('INVALID_PASSWORD');
    } else if (room.settings.password && !password) {
      throw new Error('PASSWORD_REQUIRED');
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('USER_NOT_FOUND');

    const existing = room.getPlayerByUserId(userId);
    if (existing) {
      existing.isConnected = true;
      if (existing.isBot) room.restorePlayerFromBot(existing.id);
      return { room, playerId: existing.id };
    }

    if (asSpectator) {
      const specId = uuidv4();
      room.addSpectator({
        id: specId,
        userId,
        displayName: user.displayName,
        avatar: user.avatar,
      });
      return { room, playerId: specId };
    }

    if (room.players.length >= 4) throw new Error('ROOM_FULL');
    if (room.phase !== GamePhase.LOBBY) throw new Error('GAME_IN_PROGRESS');

    const playerId = uuidv4();
    await prisma.player.create({
      data: {
        id: playerId,
        roomId: room.id,
        userId,
        seatIndex: room.players.length,
        team: room.players.length % 2 === 0 ? 'A' : 'B',
      },
    });

    room.addPlayer({
      id: playerId,
      userId,
      displayName: user.displayName,
      avatar: user.avatar,
    });

    return { room, playerId };
  }

  hydrateRoom(dbRoom: {
    id: string;
    code: string;
    name: string;
    hostId: string;
    settings: unknown;
    password: string | null;
    players: Array<{
      id: string;
      userId: string;
      seatIndex: number;
      isReady: boolean;
      isBot: boolean;
      user: { displayName: string; avatar: string };
    }>;
  }): GameEngine {
    const existing = roomManager.getRoom(dbRoom.id);
    if (existing) return existing;

    const settings = dbRoom.settings as RoomSettingsDTO;
    if (dbRoom.password) settings.password = dbRoom.password;

    const hostPlayer = dbRoom.players.find((p) => p.userId === dbRoom.hostId);
    const room = roomManager.createRoom({
      id: dbRoom.id,
      code: dbRoom.code,
      name: dbRoom.name,
      hostId: hostPlayer?.id ?? dbRoom.players[0]?.id ?? '',
      hostUserId: dbRoom.hostId,
      settings,
      inviteBaseUrl: env.CLIENT_URL,
    });

    for (const p of dbRoom.players) {
      const player = room.addPlayer({
        id: p.id,
        userId: p.userId,
        displayName: p.user.displayName,
        avatar: p.user.avatar,
      });
      if (player) {
        player.isReady = p.isReady;
        player.isBot = p.isBot;
      }
    }

    return room;
  }

  async persistGameStart(room: GameEngine): Promise<string> {
    const game = await prisma.game.create({
      data: {
        roomId: room.id,
        status: 'ACTIVE',
      },
    });
    room.dbGameId = game.id;
    return game.id;
  }

  async persistRoundEnd(room: GameEngine): Promise<void> {
    if (!room.dbGameId || !room.roundEngine) return;
    const score = room.roundEngine.calculateRoundScore();
    await prisma.round.create({
      data: {
        gameId: room.dbGameId,
        roundNumber: score.roundNumber,
        dealerSeatIndex: score.dealerSeatIndex,
        teamATricks: score.teamATricks,
        teamBTricks: score.teamBTricks,
        teamAMindi: score.teamAMindi,
        teamBMindi: score.teamBMindi,
        teamAPoints: score.teamAPoints,
        teamBPoints: score.teamBPoints,
        coatTeam: score.coatTeam,
        doubleCoat: score.doubleCoat,
      },
    });
    await prisma.game.update({
      where: { id: room.dbGameId },
      data: {
        teamAScore: room.scoreManager.matchScore.teamA,
        teamBScore: room.scoreManager.matchScore.teamB,
      },
    });
  }

  async persistGameEnd(room: GameEngine, winnerTeam: string | null): Promise<void> {
    if (!room.dbGameId) return;
    await prisma.game.update({
      where: { id: room.dbGameId },
      data: {
        status: 'FINISHED',
        winnerTeam,
        teamAScore: room.scoreManager.matchScore.teamA,
        teamBScore: room.scoreManager.matchScore.teamB,
        endedAt: new Date(),
      },
    });

    for (const player of room.players) {
      await prisma.matchHistory.create({
        data: {
          roomId: room.id,
          userId: player.userId,
          roomCode: room.code,
          winnerTeam,
          teamAScore: room.scoreManager.matchScore.teamA,
          teamBScore: room.scoreManager.matchScore.teamB,
          rounds: room.scoreManager.matchScore.roundsPlayed,
        },
      });
    }
  }

  parseSettings(input: Partial<RoomSettingsDTO>): Partial<RoomSettingsDTO> {
    const result: Partial<RoomSettingsDTO> = {};
    if (input.targetScore && Object.values(TargetScore).includes(input.targetScore)) {
      result.targetScore = input.targetScore;
    }
    if (input.maxRounds && input.maxRounds > 0 && input.maxRounds <= 50) {
      result.maxRounds = input.maxRounds;
    }
    if (input.visibility && Object.values(RoomVisibility).includes(input.visibility)) {
      result.visibility = input.visibility;
    }
    if (input.turnTimer && Object.values(TurnTimer).includes(input.turnTimer)) {
      result.turnTimer = input.turnTimer;
    }
    if (typeof input.autoPlayTimeout === 'boolean') result.autoPlayTimeout = input.autoPlayTimeout;
    if (typeof input.botsEnabled === 'boolean') result.botsEnabled = input.botsEnabled;
    return result;
  }
}

export const roomService = new RoomService();
