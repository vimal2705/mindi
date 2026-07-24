import { describe, it, expect } from 'vitest';
import { GameEngine } from '../src/engine/GameEngine.js';
import { GamePhase, MAX_PLAYERS } from '@mindi-coat/shared';

describe('GameEngine', () => {
  const createRoom = () =>
    new GameEngine({
      id: 'room-1',
      code: 'TEST01',
      name: 'Test Room',
      hostId: 'p0',
      hostUserId: 'u0',
      settings: {},
      inviteBaseUrl: 'http://localhost:5173',
    });

  it('requires 4 players to start', () => {
    const room = createRoom();
    for (let i = 0; i < 3; i++) {
      room.addPlayer({ id: `p${i}`, userId: `u${i}`, displayName: `Player ${i}` });
    }
    expect(room.canStart()).toBe(false);
  });

  it('deals 13 cards to each player', () => {
    const room = createRoom();
    for (let i = 0; i < MAX_PLAYERS; i++) {
      const p = room.addPlayer({ id: `p${i}`, userId: `u${i}`, displayName: `Player ${i}` });
      p!.isReady = true;
    }
    room.startGame();
    expect(room.phase).toBe(GamePhase.PLAYING);
    for (const player of room.players) {
      expect(player.getHand().length).toBe(13);
    }
  });

  it('validates follow suit rule', () => {
    const room = createRoom();
    for (let i = 0; i < MAX_PLAYERS; i++) {
      const p = room.addPlayer({ id: `p${i}`, userId: `u${i}`, displayName: `Player ${i}` });
      p!.isReady = true;
    }
    room.startGame();
    const current = room.players.find((p) => p.seatIndex === room.roundEngine!.currentTurnSeatIndex)!;
    const leadCard = current.getHand()[0];
    room.playCard(current.id, leadCard.id);
    expect(room.roundEngine!.currentTrick.leadSuit).toBe(leadCard.suit);
  });
});
