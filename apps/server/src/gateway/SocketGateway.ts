import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { z } from 'zod';
import {
  type ClientToServerEvents,
  type ServerToClientEvents,
  type InterServerEvents,
  type SocketData,
  GamePhase,
  RoomVisibility,
} from '@mindi-coat/shared';
import { isAllowedOrigin } from '../config/env.js';
import { authService } from '../services/AuthService.js';
import { roomService } from '../services/RoomService.js';
import { roomManager } from '../engine/RoomManager.js';
import { timerManager } from '../engine/TimerManager.js';
import { reconnectManager } from '../engine/ReconnectManager.js';
import { validateSocket } from '../middleware/validation.js';
import { v4 as uuidv4 } from 'uuid';

type GameSocket = import('socket.io').Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export class SocketGateway {
  private io: Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >;
  private startTime = Date.now();
  private processedEvents = new Set<string>();

  constructor(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: (origin, callback) => {
          if (isAllowedOrigin(origin)) callback(null, true);
          else callback(new Error('Not allowed by CORS'));
        },
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingInterval: 10000,
      pingTimeout: 5000,
      transports: ['websocket', 'polling'],
    });

    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token as string | undefined;
      if (!token) {
        next(new Error('AUTH_REQUIRED'));
        return;
      }
      const payload = authService.verifyToken(token);
      if (!payload) {
        next(new Error('INVALID_TOKEN'));
        return;
      }
      socket.data.userId = payload.userId;
      socket.data.username = payload.username;
      socket.data.displayName = payload.displayName;
      next();
    });

    this.io.on('connection', (socket) => this.handleConnection(socket));
  }

  private handleConnection(socket: GameSocket): void {
    socket.on('create-room', async (data, callback) => {
      try {
        if (this.isDuplicate(socket.id, 'create-room')) return;
        const parsed = validateSocket(
          z.object({
            name: z.string().min(2).max(40),
            settings: z.record(z.unknown()).optional(),
            password: z.string().min(4).max(32).optional(),
          }),
          data,
        );
        const settings = roomService.parseSettings(
          (parsed.settings ?? {}) as Partial<import('@mindi-coat/shared').RoomSettingsDTO>,
        );
        const room = await roomService.createRoom(
          socket.data.userId,
          parsed.name,
          settings,
          parsed.password,
        );
        const player = room.getPlayerByUserId(socket.data.userId)!;
        socket.data.roomId = room.id;
        socket.data.playerId = player.id;
        socket.join(room.id);
        const sessionToken = await reconnectManager.createSession(
          socket.data.userId,
          room.id,
          player.id,
        );
        socket.data.sessionToken = sessionToken;
        callback({ success: true, data: { room: room.toRoomStateDTO() } });
      } catch (error) {
        callback({
          success: false,
          error: { code: 'CREATE_ROOM_FAILED', message: (error as Error).message },
        });
      }
    });

    socket.on('join-room', async (data, callback) => {
      try {
        const parsed = validateSocket(
          z.object({
            code: z.string().min(4).max(8),
            password: z.string().optional(),
            asSpectator: z.boolean().optional(),
          }),
          data,
        );
        const { room, playerId } = await roomService.joinRoom(
          socket.data.userId,
          parsed.code,
          parsed.password,
          parsed.asSpectator,
        );
        socket.data.roomId = room.id;
        socket.data.playerId = playerId;
        socket.join(room.id);
        const sessionToken = await reconnectManager.createSession(
          socket.data.userId,
          room.id,
          playerId,
        );
        socket.data.sessionToken = sessionToken;
        this.broadcastRoom(room.id);
        callback({
          success: true,
          data: {
            room: room.toRoomStateDTO(),
            gameState: room.toGameStateDTO(socket.data.userId),
          },
        });
      } catch (error) {
        callback({
          success: false,
          error: { code: 'JOIN_ROOM_FAILED', message: (error as Error).message },
        });
      }
    });

    socket.on('find-match', async (callback) => {
      try {
        let room = roomManager.findPublicRoom();
        if (!room) {
          room = await roomService.createRoom(
            socket.data.userId,
            `Public Match ${Date.now().toString().slice(-4)}`,
            { visibility: RoomVisibility.PUBLIC },
          );
        }
        const { room: joined, playerId } = await roomService.joinRoom(
          socket.data.userId,
          room.code,
        );
        socket.data.roomId = joined.id;
        socket.data.playerId = playerId;
        socket.join(joined.id);
        this.broadcastRoom(joined.id);
        callback({ success: true, data: { room: joined.toRoomStateDTO() } });
        this.io.to(joined.id).emit('match-found', joined.toRoomStateDTO());
      } catch (error) {
        callback({
          success: false,
          error: { code: 'MATCHMAKING_FAILED', message: (error as Error).message },
        });
      }
    });

    socket.on('leave-room', async (callback) => {
      await this.handleLeave(socket);
      callback?.({ success: true });
    });

    socket.on('player-ready', async (data, callback) => {
      try {
        const room = this.getSocketRoom(socket);
        if (!room) throw new Error('NOT_IN_ROOM');
        const player = room.getPlayerByUserId(socket.data.userId);
        if (!player) throw new Error('NOT_A_PLAYER');
        player.isReady = data.ready;
        this.broadcastRoom(room.id);
        callback({ success: true });
      } catch (error) {
        callback({
          success: false,
          error: { code: 'READY_FAILED', message: (error as Error).message },
        });
      }
    });

    socket.on('start-game', async (callback) => {
      try {
        const room = this.getSocketRoom(socket);
        if (!room) throw new Error('NOT_IN_ROOM');
        const hostPlayer = room.getPlayer(room.hostId);
        if (hostPlayer?.userId !== socket.data.userId) throw new Error('NOT_HOST');
        if (!room.canStart()) throw new Error('CANNOT_START');

        await roomService.persistGameStart(room);
        room.startGame();

        this.io.to(room.id).emit('shuffle', {
          roomId: room.id,
          dealerSeatIndex: room.dealerSeatIndex,
        });

        for (const player of room.players) {
          const gameState = room.toGameStateDTO(player.userId);
          const sockets = await this.io.in(room.id).fetchSockets();
          for (const s of sockets) {
            if (s.data.userId === player.userId) {
              s.emit('deal-cards', { gameState, animated: true });
            }
          }
        }

        this.broadcastGameState(room.id);
        this.startTurnTimer(room);
        callback({ success: true, data: { room: room.toRoomStateDTO() } });
      } catch (error) {
        callback({
          success: false,
          error: { code: 'START_FAILED', message: (error as Error).message },
        });
      }
    });

    socket.on('play-card', async (data, callback) => {
      try {
        const room = this.getSocketRoom(socket);
        if (!room) throw new Error('NOT_IN_ROOM');
        const player = room.getPlayerByUserId(socket.data.userId);
        if (!player) throw new Error('NOT_A_PLAYER');

        const parsed = validateSocket(z.object({ cardId: z.string().uuid() }), data);
        const result = room.playCard(player.id, parsed.cardId);
        if (!result.success) throw new Error(result.reason);

        timerManager.clearTurnTimer(room.id);

        const playedCard = room.roundEngine?.currentTrick.plays.at(-1)?.card;
        this.io.to(room.id).emit('play-card', {
          play: {
            playerId: player.id,
            cardId: parsed.cardId,
            seatIndex: player.seatIndex,
          },
          gameState: room.toGameStateDTO(socket.data.userId),
        });

        if (room.roundEngine?.currentTrick.plays.length === 0 && playedCard) {
          const lastTrick = room.roundEngine.completedTricks.at(-1);
          if (lastTrick) {
            this.io.to(room.id).emit('trick-winner', {
              winnerId: lastTrick.winnerId!,
              winnerSeatIndex: lastTrick.winnerSeatIndex!,
              trick: room.roundEngine.trickToDTO(lastTrick),
              gameState: room.toGameStateDTO(socket.data.userId),
            });
          }
        }

        const phaseAfterPlay = room.phase;
        if (
          phaseAfterPlay === GamePhase.ROUND_END ||
          phaseAfterPlay === GamePhase.GAME_END
        ) {
          await roomService.persistRoundEnd(room);
          const roundScore = room.scoreManager.roundHistory.at(-1)!;
          this.io.to(room.id).emit('round-end', {
            roundScore,
            gameState: room.toGameStateDTO(socket.data.userId),
          });
          this.io.to(room.id).emit('score-update', {
            matchScore: room.scoreManager.matchScore,
          });

          if (phaseAfterPlay === GamePhase.GAME_END) {
            const winner = room.scoreManager.getWinnerTeam(room.settings.maxRounds);
            await roomService.persistGameEnd(room, winner);
            this.io.to(room.id).emit('game-end', {
              winnerTeam: winner,
              matchScore: room.scoreManager.matchScore,
              history: {
                id: uuidv4(),
                roomCode: room.code,
                winnerTeam: winner,
                teamAScore: room.scoreManager.matchScore.teamA,
                teamBScore: room.scoreManager.matchScore.teamB,
                rounds: room.scoreManager.matchScore.roundsPlayed,
                finishedAt: new Date().toISOString(),
              },
            });
          } else {
            setTimeout(() => {
              room.startNextRound();
              this.io.to(room.id).emit('shuffle', {
                roomId: room.id,
                dealerSeatIndex: room.dealerSeatIndex,
              });
              this.emitDealCards(room);
              this.broadcastGameState(room.id);
              this.startTurnTimer(room);
            }, 3000);
          }
        } else {
          this.broadcastGameState(room.id);
          this.startTurnTimer(room);
          await this.processBotTurns(room);
        }

        callback({
          success: true,
          data: { gameState: room.toGameStateDTO(socket.data.userId) },
        });
      } catch (error) {
        callback({
          success: false,
          error: { code: 'PLAY_FAILED', message: (error as Error).message },
        });
      }
    });

    socket.on('chat-message', async (data, callback) => {
      try {
        const room = this.getSocketRoom(socket);
        if (!room) throw new Error('NOT_IN_ROOM');
        const parsed = validateSocket(
          z.object({ message: z.string().min(1).max(500) }),
          data,
        );
        const message = {
          id: uuidv4(),
          roomId: room.id,
          userId: socket.data.userId,
          displayName: socket.data.displayName,
          message: parsed.message,
          timestamp: new Date().toISOString(),
        };
        this.io.to(room.id).emit('chat-message', message);
        callback({ success: true, data: { message } });
      } catch (error) {
        callback({
          success: false,
          error: { code: 'CHAT_FAILED', message: (error as Error).message },
        });
      }
    });

    socket.on('emoji', (data, callback) => {
      const room = this.getSocketRoom(socket);
      if (room) {
        this.io.to(room.id).emit('emoji', {
          userId: socket.data.userId,
          emoji: data.emoji,
        });
      }
      callback?.({ success: true });
    });

    socket.on('typing', (data) => {
      const room = this.getSocketRoom(socket);
      if (room) {
        socket.to(room.id).emit('typing', {
          userId: socket.data.userId,
          isTyping: data.isTyping,
        });
      }
    });

    socket.on('reconnect', async (data, callback) => {
      try {
        const session = await reconnectManager.validateSession(data.sessionToken);
        if (!session) throw new Error('INVALID_SESSION');
        const room = roomManager.getRoom(session.roomId);
        if (!room) throw new Error('ROOM_NOT_FOUND');
        const player = room.getPlayer(session.playerId);
        if (player) {
          player.isConnected = true;
          room.restorePlayerFromBot(player.id);
        }
        socket.data.roomId = room.id;
        socket.data.playerId = session.playerId;
        socket.data.sessionToken = data.sessionToken;
        socket.join(room.id);
        this.broadcastRoom(room.id);
        callback({
          success: true,
          data: {
            room: room.toRoomStateDTO(),
            gameState: room.toGameStateDTO(session.userId),
          },
        });
      } catch (error) {
        callback({
          success: false,
          error: { code: 'RECONNECT_FAILED', message: (error as Error).message },
        });
      }
    });

    socket.on('spectator-join', async (data, callback) => {
      try {
        const { room } = await roomService.joinRoom(
          socket.data.userId,
          data.code,
          data.password,
          true,
        );
        socket.data.roomId = room.id;
        socket.join(room.id);
        callback({ success: true, data: { room: room.toRoomStateDTO() } });
      } catch (error) {
        callback({
          success: false,
          error: { code: 'SPECTATOR_FAILED', message: (error as Error).message },
        });
      }
    });

    socket.on('admin-stats', (callback) => {
      callback({
        success: true,
        data: {
          stats: { ...roomManager.getStats(), uptime: (Date.now() - this.startTime) / 1000 },
        },
      });
    });

    socket.on('admin-rooms', (callback) => {
      callback({
        success: true,
        data: { rooms: roomManager.getAllRooms().map((r) => r.toRoomStateDTO()) },
      });
    });

    socket.on('ping', (callback) => {
      callback({ pong: Date.now() });
    });

    socket.on('disconnect', async () => {
      const room = this.getSocketRoom(socket);
      if (!room) return;
      const player = room.getPlayerByUserId(socket.data.userId);
      if (player) {
        player.isConnected = false;
        if (room.settings.botsEnabled && room.phase === GamePhase.PLAYING) {
          room.enableBotForPlayer(player.id);
          await this.processBotTurns(room);
        }
        this.io.to(room.id).emit('player-connected', {
          playerId: player.id,
          isConnected: false,
        });
      }
      this.broadcastRoom(room.id);
    });
  }

  private async processBotTurns(room: import('../engine/GameEngine.js').GameEngine): Promise<void> {
    let phase = room.phase;
    if (phase !== GamePhase.PLAYING || !room.roundEngine) return;
    const current = room.players.find(
      (p) => p.seatIndex === room.roundEngine!.currentTurnSeatIndex,
    );
    if (!current?.isBot) return;

    await new Promise((r) => setTimeout(r, 800));
    const cardId = room.getBotMove(current.id);
    if (!cardId) return;

    room.playCard(current.id, cardId);
    this.io.to(room.id).emit('play-card', {
      play: { playerId: current.id, cardId, seatIndex: current.seatIndex },
      gameState: room.toGameStateDTO(current.userId),
    });

    phase = room.phase;
    if (phase === GamePhase.ROUND_END || phase === GamePhase.GAME_END) {
      await roomService.persistRoundEnd(room);
      const roundScore = room.scoreManager.roundHistory.at(-1)!;
      this.io.to(room.id).emit('round-end', {
        roundScore,
        gameState: room.toGameStateDTO(current.userId),
      });
    }

    if (phase === GamePhase.PLAYING) {
      this.broadcastGameState(room.id);
      this.startTurnTimer(room);
      await this.processBotTurns(room);
    }
  }

  private startTurnTimer(room: import('../engine/GameEngine.js').GameEngine): void {
    if (room.phase !== GamePhase.PLAYING || !room.settings.autoPlayTimeout) return;
    timerManager.startTurnTimer(room, async (roomId, playerId) => {
      const r = roomManager.getRoom(roomId);
      if (!r || r.phase !== GamePhase.PLAYING) return;
      const player = r.getPlayer(playerId);
      if (!player) return;
      const cardId = r.getBotMove(playerId) ?? player.getValidPlays(r.roundEngine!.currentTrick.leadSuit)[0]?.id;
      if (cardId) {
        r.playCard(playerId, cardId);
        this.broadcastGameState(roomId);
        await this.processBotTurns(r);
      }
    });

    if (room.turnExpiresAt) {
      this.io.to(room.id).emit('turn-change', {
        seatIndex: room.roundEngine!.currentTurnSeatIndex,
        expiresAt: room.turnExpiresAt.toISOString(),
      });
    }
  }

  private emitDealCards(room: import('../engine/GameEngine.js').GameEngine): void {
    for (const player of room.players) {
      this.io.to(room.id).fetchSockets().then((sockets) => {
        for (const s of sockets) {
          if (s.data.userId === player.userId) {
            s.emit('deal-cards', {
              gameState: room.toGameStateDTO(player.userId),
              animated: true,
            });
          }
        }
      });
    }
  }

  private broadcastRoom(roomId: string): void {
    const room = roomManager.getRoom(roomId);
    if (!room) return;
    this.io.to(roomId).emit('room-updated', room.toRoomStateDTO());
  }

  private broadcastGameState(roomId: string): void {
    const room = roomManager.getRoom(roomId);
    if (!room) return;
    this.io.to(roomId).fetchSockets().then((sockets) => {
      for (const socket of sockets) {
        socket.emit('game-state', room.toGameStateDTO(socket.data.userId));
      }
    });
  }

  private getSocketRoom(socket: GameSocket) {
    if (!socket.data.roomId) return undefined;
    return roomManager.getRoom(socket.data.roomId);
  }

  private async handleLeave(socket: GameSocket): Promise<void> {
    const room = this.getSocketRoom(socket);
    if (!room) return;
    const player = room.getPlayerByUserId(socket.data.userId);
    if (player && room.phase === GamePhase.LOBBY) {
      room.removePlayer(player.id);
    } else if (player) {
      player.isConnected = false;
      if (room.settings.botsEnabled) room.enableBotForPlayer(player.id);
    }
    socket.leave(room.id);
    socket.data.roomId = undefined;
    this.broadcastRoom(room.id);
  }

  private isDuplicate(socketId: string, event: string): boolean {
    const key = `${socketId}:${event}:${Date.now()}`;
    if (this.processedEvents.has(key)) return true;
    this.processedEvents.add(key);
    if (this.processedEvents.size > 1000) {
      this.processedEvents.clear();
    }
    return false;
  }

  getIO() {
    return this.io;
  }
}
