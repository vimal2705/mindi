import { GamePhase } from '@mindi-coat/shared';
import { GameEngine, type GameRoomConfig } from './GameEngine.js';

export class RoomManager {
  private rooms = new Map<string, GameEngine>();
  private codeIndex = new Map<string, string>();
  private matchmakingQueue: string[] = [];

  createRoom(config: GameRoomConfig): GameEngine {
    const room = new GameEngine(config);
    this.rooms.set(room.id, room);
    this.codeIndex.set(room.code, room.id);
    if (config.settings.visibility === 'PUBLIC') {
      this.matchmakingQueue.push(room.id);
    }
    return room;
  }

  getRoom(roomId: string): GameEngine | undefined {
    return this.rooms.get(roomId);
  }

  getRoomByCode(code: string): GameEngine | undefined {
    const id = this.codeIndex.get(code.toUpperCase());
    return id ? this.rooms.get(id) : undefined;
  }

  deleteRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      this.codeIndex.delete(room.code);
      this.matchmakingQueue = this.matchmakingQueue.filter((id) => id !== roomId);
    }
    this.rooms.delete(roomId);
  }

  getAllRooms(): GameEngine[] {
    return Array.from(this.rooms.values());
  }

  findPublicRoom(): GameEngine | null {
    for (const roomId of this.matchmakingQueue) {
      const room = this.rooms.get(roomId);
      if (
        room &&
        room.phase === GamePhase.LOBBY &&
        room.players.length < 4 &&
        room.settings.visibility === 'PUBLIC'
      ) {
        return room;
      }
    }
    return null;
  }

  getStats() {
    const rooms = this.getAllRooms();
    return {
      activeRooms: rooms.length,
      activePlayers: rooms.reduce((sum, r) => sum + r.players.length, 0),
      activeGames: rooms.filter(
        (r) => r.phase !== GamePhase.LOBBY && r.phase !== GamePhase.GAME_END,
      ).length,
    };
  }
}

export const roomManager = new RoomManager();
