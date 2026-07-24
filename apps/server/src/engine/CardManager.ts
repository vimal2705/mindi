import { Suit, Rank, isMindiCard, type CardDTO } from '@mindi-coat/shared';
import { v4 as uuidv4 } from 'uuid';

export class Card {
  readonly id: string;
  readonly suit: Suit;
  readonly rank: Rank;

  constructor(suit: Suit, rank: Rank, id?: string) {
    this.id = id ?? uuidv4();
    this.suit = suit;
    this.rank = rank;
  }

  get isMindi(): boolean {
    return isMindiCard(this.rank);
  }

  toDTO(): CardDTO {
    return {
      id: this.id,
      suit: this.suit,
      rank: this.rank,
      isMindi: this.isMindi,
    };
  }

  static fromDTO(dto: CardDTO): Card {
    return new Card(dto.suit, dto.rank, dto.id);
  }
}

export class Deck {
  private cards: Card[] = [];

  static createStandard(): Deck {
    const deck = new Deck();
    for (const suit of Object.values(Suit)) {
      for (const rank of Object.values(Rank)) {
        deck.cards.push(new Card(suit, rank));
      }
    }
    return deck;
  }

  shuffle(randomFn: () => number = Math.random): void {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(randomFn() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  deal(count: number): Card[] {
    if (count > this.cards.length) {
      throw new Error('Not enough cards in deck');
    }
    return this.cards.splice(0, count);
  }

  get remaining(): number {
    return this.cards.length;
  }

  reset(): void {
    this.cards = Deck.createStandard().cards;
  }
}
