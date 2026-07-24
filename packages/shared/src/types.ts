export enum Suit {
  SPADES = 'SPADES',
  HEARTS = 'HEARTS',
  DIAMONDS = 'DIAMONDS',
  CLUBS = 'CLUBS',
}

export enum Rank {
  TWO = 'TWO',
  THREE = 'THREE',
  FOUR = 'FOUR',
  FIVE = 'FIVE',
  SIX = 'SIX',
  SEVEN = 'SEVEN',
  EIGHT = 'EIGHT',
  NINE = 'NINE',
  TEN = 'TEN',
  JACK = 'JACK',
  QUEEN = 'QUEEN',
  KING = 'KING',
  ACE = 'ACE',
}

export const RANK_ORDER: Rank[] = [
  Rank.TWO,
  Rank.THREE,
  Rank.FOUR,
  Rank.FIVE,
  Rank.SIX,
  Rank.SEVEN,
  Rank.EIGHT,
  Rank.NINE,
  Rank.TEN,
  Rank.JACK,
  Rank.QUEEN,
  Rank.KING,
  Rank.ACE,
];

export const RANK_VALUES: Record<Rank, number> = {
  [Rank.TWO]: 2,
  [Rank.THREE]: 3,
  [Rank.FOUR]: 4,
  [Rank.FIVE]: 5,
  [Rank.SIX]: 6,
  [Rank.SEVEN]: 7,
  [Rank.EIGHT]: 8,
  [Rank.NINE]: 9,
  [Rank.TEN]: 10,
  [Rank.JACK]: 11,
  [Rank.QUEEN]: 12,
  [Rank.KING]: 13,
  [Rank.ACE]: 14,
};

export enum Team {
  A = 'A',
  B = 'B',
}

export enum GamePhase {
  LOBBY = 'LOBBY',
  DEALING = 'DEALING',
  PLAYING = 'PLAYING',
  ROUND_END = 'ROUND_END',
  GAME_END = 'GAME_END',
}

export enum RoomVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
}

export enum PlayerRole {
  PLAYER = 'PLAYER',
  SPECTATOR = 'SPECTATOR',
  BOT = 'BOT',
}

export enum TargetScore {
  FIFTY = 50,
  HUNDRED = 100,
  TWO_HUNDRED = 200,
  FIVE_HUNDRED = 500,
}

export enum TurnTimer {
  THIRTY = 30,
  FORTY_FIVE = 45,
  SIXTY = 60,
}

export interface CardDTO {
  id: string;
  suit: Suit;
  rank: Rank;
  isMindi?: boolean;
}

export interface PlayerDTO {
  id: string;
  userId: string;
  displayName: string;
  avatar: string;
  seatIndex: number;
  team: Team;
  isReady: boolean;
  isConnected: boolean;
  isBot: boolean;
  role: PlayerRole;
  trickCount: number;
  mindiCount: number;
  cardCount: number;
}

export interface TrickPlayDTO {
  playerId: string;
  card: CardDTO;
  seatIndex: number;
}

export interface TrickDTO {
  plays: TrickPlayDTO[];
  leadSuit: Suit | null;
  winnerId: string | null;
  winnerSeatIndex: number | null;
}

export interface RoundScoreDTO {
  roundNumber: number;
  teamATricks: number;
  teamBTricks: number;
  teamAMindi: number;
  teamBMindi: number;
  teamAPoints: number;
  teamBPoints: number;
  coatTeam: Team | null;
  doubleCoat: boolean;
  dealerSeatIndex: number;
}

export interface MatchScoreDTO {
  teamA: number;
  teamB: number;
  roundsPlayed: number;
  targetScore: TargetScore;
}

export interface RoomSettingsDTO {
  targetScore: TargetScore;
  maxRounds: number;
  visibility: RoomVisibility;
  turnTimer: TurnTimer;
  autoPlayTimeout: boolean;
  botsEnabled: boolean;
  password?: string;
}

export interface RoomStateDTO {
  id: string;
  code: string;
  name: string;
  hostId: string;
  settings: RoomSettingsDTO;
  phase: GamePhase;
  players: PlayerDTO[];
  spectators: PlayerDTO[];
  currentTurnSeatIndex: number | null;
  currentTrick: TrickDTO;
  completedTricks: TrickDTO[];
  dealerSeatIndex: number;
  roundNumber: number;
  matchScore: MatchScoreDTO;
  roundHistory: RoundScoreDTO[];
  inviteLink: string;
  hasPassword: boolean;
}

export interface GameStateDTO {
  room: RoomStateDTO;
  myPlayerId: string | null;
  myHand: CardDTO[];
  canPlay: boolean;
  validCards: string[];
}

export interface UserDTO {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  isGuest: boolean;
}

export interface ChatMessageDTO {
  id: string;
  roomId: string;
  userId: string;
  displayName: string;
  message: string;
  emoji?: string;
  timestamp: string;
}

export interface MatchHistoryDTO {
  id: string;
  roomCode: string;
  winnerTeam: Team | null;
  teamAScore: number;
  teamBScore: number;
  rounds: number;
  finishedAt: string;
}

export interface ServerStatsDTO {
  activeRooms: number;
  activePlayers: number;
  activeGames: number;
  uptime: number;
}

export interface AuthResponse {
  token: string;
  user: UserDTO;
}

export interface ApiError {
  code: string;
  message: string;
}

export const MINDI_RANK = Rank.TEN;
export const CARDS_PER_PLAYER = 13;
export const MAX_PLAYERS = 4;
export const TRICK_POINTS = 1;
export const MINDI_POINTS = 2;
export const COAT_POINTS = 13;
export const DOUBLE_COAT_MULTIPLIER = 2;

export const SUIT_SYMBOLS: Record<Suit, string> = {
  [Suit.SPADES]: '♠',
  [Suit.HEARTS]: '♥',
  [Suit.DIAMONDS]: '♦',
  [Suit.CLUBS]: '♣',
};

export const SUIT_COLORS: Record<Suit, 'red' | 'black'> = {
  [Suit.SPADES]: 'black',
  [Suit.HEARTS]: 'red',
  [Suit.DIAMONDS]: 'red',
  [Suit.CLUBS]: 'black',
};

export const DEFAULT_AVATARS = ['🎴', '🃏', '👑', '🎯', '🔥', '⚡', '🌟', '🎲'];

export function getPartnerSeat(seatIndex: number): number {
  return (seatIndex + 2) % MAX_PLAYERS;
}

export function getTeamForSeat(seatIndex: number): Team {
  return seatIndex % 2 === 0 ? Team.A : Team.B;
}

export function isMindiCard(rank: Rank): boolean {
  return rank === MINDI_RANK;
}

export function compareCards(a: CardDTO, b: CardDTO, leadSuit: Suit): number {
  if (a.suit === leadSuit && b.suit !== leadSuit) return 1;
  if (b.suit === leadSuit && a.suit !== leadSuit) return -1;
  if (a.suit === leadSuit && b.suit === leadSuit) {
    return RANK_VALUES[a.rank] - RANK_VALUES[b.rank];
  }
  return 0;
}

export function getWinningPlay(plays: TrickPlayDTO[], leadSuit: Suit): TrickPlayDTO {
  return plays.reduce((winner, play) => {
    if (compareCards(play.card, winner.card, leadSuit) > 0) return play;
    return winner;
  });
}
