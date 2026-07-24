import {
  Team,
  PlayerRole,
  getTeamForSeat,
  type PlayerDTO,
  DEFAULT_AVATARS,
} from '@mindi-coat/shared';
import { Card } from './CardManager.js';

export class GamePlayer {
  readonly id: string;
  readonly userId: string;
  displayName: string;
  avatar: string;
  readonly seatIndex: number;
  readonly team: Team;
  isReady = false;
  isConnected = true;
  isBot = false;
  role: PlayerRole = PlayerRole.PLAYER;
  trickCount = 0;
  mindiCount = 0;
  private hand: Card[] = [];

  constructor(params: {
    id: string;
    userId: string;
    displayName: string;
    seatIndex: number;
    avatar?: string;
    isBot?: boolean;
    role?: PlayerRole;
  }) {
    this.id = params.id;
    this.userId = params.userId;
    this.displayName = params.displayName;
    this.seatIndex = params.seatIndex;
    this.team = getTeamForSeat(params.seatIndex);
    this.avatar = params.avatar ?? DEFAULT_AVATARS[params.seatIndex % DEFAULT_AVATARS.length];
    this.isBot = params.isBot ?? false;
    this.role = params.role ?? PlayerRole.PLAYER;
  }

  receiveCards(cards: Card[]): void {
    this.hand.push(...cards);
  }

  getHand(): Card[] {
    return [...this.hand];
  }

  hasCard(cardId: string): boolean {
    return this.hand.some((c) => c.id === cardId);
  }

  playCard(cardId: string): Card | null {
    const index = this.hand.findIndex((c) => c.id === cardId);
    if (index === -1) return null;
    return this.hand.splice(index, 1)[0];
  }

  getCardsOfSuit(suit: import('@mindi-coat/shared').Suit): Card[] {
    return this.hand.filter((c) => c.suit === suit);
  }

  getValidPlays(leadSuit: import('@mindi-coat/shared').Suit | null): Card[] {
    if (!leadSuit) return this.getHand();
    const suited = this.getCardsOfSuit(leadSuit);
    return suited.length > 0 ? suited : this.getHand();
  }

  toDTO(): PlayerDTO {
    return {
      id: this.id,
      userId: this.userId,
      displayName: this.displayName,
      avatar: this.avatar,
      seatIndex: this.seatIndex,
      team: this.team,
      isReady: this.isReady,
      isConnected: this.isConnected,
      isBot: this.isBot,
      role: this.role,
      trickCount: this.trickCount,
      mindiCount: this.mindiCount,
      cardCount: this.hand.length,
    };
  }
}

export function createPlayersForRoom(
  entries: Array<{ id: string; userId: string; displayName: string; avatar?: string }>,
): GamePlayer[] {
  return entries.map(
    (entry, index) =>
      new GamePlayer({
        id: entry.id,
        userId: entry.userId,
        displayName: entry.displayName,
        seatIndex: index,
        avatar: entry.avatar,
      }),
  );
}

export const BOT_NAMES = ['Raja Bot', 'Rani Bot', 'Mindi Bot', 'Coat Bot'];
