import { describe, it, expect } from 'vitest';
import {
  Suit,
  Rank,
  compareCards,
  getWinningPlay,
  getPartnerSeat,
  getTeamForSeat,
  Team,
  isMindiCard,
} from './types.js';

describe('Mindi Coat shared rules', () => {
  it('identifies mindi cards as tens', () => {
    expect(isMindiCard(Rank.TEN)).toBe(true);
    expect(isMindiCard(Rank.ACE)).toBe(false);
  });

  it('assigns teams by seat', () => {
    expect(getTeamForSeat(0)).toBe(Team.A);
    expect(getTeamForSeat(1)).toBe(Team.B);
    expect(getPartnerSeat(0)).toBe(2);
    expect(getPartnerSeat(1)).toBe(3);
  });

  it('determines trick winner by lead suit', () => {
    const plays = [
      { playerId: 'p1', seatIndex: 0, card: { id: '1', suit: Suit.HEARTS, rank: Rank.FIVE } },
      { playerId: 'p2', seatIndex: 1, card: { id: '2', suit: Suit.HEARTS, rank: Rank.KING } },
      { playerId: 'p3', seatIndex: 2, card: { id: '3', suit: Suit.SPADES, rank: Rank.ACE } },
    ];
    const winner = getWinningPlay(plays, Suit.HEARTS);
    expect(winner.playerId).toBe('p2');
  });

  it('compares cards correctly', () => {
    const low = { id: '1', suit: Suit.CLUBS, rank: Rank.THREE };
    const high = { id: '2', suit: Suit.CLUBS, rank: Rank.QUEEN };
    expect(compareCards(high, low, Suit.CLUBS)).toBeGreaterThan(0);
  });
});
