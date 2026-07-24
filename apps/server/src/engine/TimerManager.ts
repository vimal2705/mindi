import { GameEngine } from './GameEngine.js';

export class TimerManager {
  private timers = new Map<string, ReturnType<typeof setTimeout>>();

  startTurnTimer(
    room: GameEngine,
    onTimeout: (roomId: string, playerId: string) => void,
  ): void {
    this.clearTurnTimer(room.id);
    const ms = room.settings.turnTimer * 1000;
    room.turnExpiresAt = new Date(Date.now() + ms);

    const currentPlayer = room.players.find(
      (p) => p.seatIndex === room.roundEngine?.currentTurnSeatIndex,
    );
    if (!currentPlayer) return;

    const handle = setTimeout(() => {
      onTimeout(room.id, currentPlayer.id);
    }, ms);
    this.timers.set(room.id, handle);
  }

  clearTurnTimer(roomId: string): void {
    const handle = this.timers.get(roomId);
    if (handle) {
      clearTimeout(handle);
      this.timers.delete(roomId);
    }
  }

  clearAll(): void {
    for (const handle of this.timers.values()) {
      clearTimeout(handle);
    }
    this.timers.clear();
  }
}

export const timerManager = new TimerManager();
