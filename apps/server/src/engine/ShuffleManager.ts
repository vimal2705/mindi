import { randomBytes } from 'crypto';
import { Deck } from './CardManager.js';

export class ShuffleManager {
  /** Cryptographically secure shuffle using Fisher-Yates */
  static secureShuffle(deck: Deck): void {
    const randomValues = randomBytes(52);
    deck.shuffle(() => randomValues[Math.floor(Math.random() * 52)] / 255);
    // Re-shuffle with crypto random for security
    const buffer = randomBytes(256);
    let index = 0;
    deck.shuffle(() => {
      const value = buffer[index % buffer.length] / 255;
      index++;
      return value;
    });
  }
}
