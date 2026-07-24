import { Rank, Suit, RANK_VALUES, type CardDTO } from '@mindi-coat/shared';
import type { Card } from './CardManager.js';

export class BotAI {
  /** Simple heuristic: play lowest valid card, save high cards and mindis when possible */
  static chooseCard(validCards: Card[], leadSuit: Suit | null, trickPosition: number): string {
    if (validCards.length === 1) return validCards[0].id;

    const sorted = [...validCards].sort(
      (a, b) => RANK_VALUES[a.rank] - RANK_VALUES[b.rank],
    );

    // Prefer not leading with mindi (10)
    const nonMindi = sorted.filter((c) => c.rank !== Rank.TEN);
    const pool = nonMindi.length > 0 ? nonMindi : sorted;

    if (trickPosition === 0) {
      // Leading: play mid-low card
      return pool[Math.floor(pool.length / 3)].id;
    }

    if (leadSuit) {
      const following = pool.filter((c) => c.suit === leadSuit);
      if (following.length > 0) {
        // Try to win with lowest winning card, else dump lowest
        const high = following[following.length - 1];
        return high.id;
      }
    }

    // Off-suit dump lowest
    return pool[0].id;
  }

  static chooseCardFromDTO(validCards: CardDTO[], leadSuit: Suit | null, trickPosition: number): string {
    const mapped = validCards.map(
      (c) =>
        ({
          id: c.id,
          suit: c.suit,
          rank: c.rank,
          rankCompare: c.rank,
        }) as Card & { rankCompare: string },
    );
    return this.chooseCard(mapped as unknown as Card[], leadSuit, trickPosition);
  }
}
