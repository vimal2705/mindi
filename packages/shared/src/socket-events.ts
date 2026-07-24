import type {
  AuthResponse,
  ChatMessageDTO,
  GameStateDTO,
  MatchHistoryDTO,
  RoomSettingsDTO,
  RoomStateDTO,
  ServerStatsDTO,
  UserDTO,
} from './types.js';
import { TargetScore, TurnTimer, RoomVisibility } from './types.js';

// Client -> Server events
export interface ClientToServerEvents {
  'create-room': (
    data: {
      name: string;
      settings: Partial<RoomSettingsDTO>;
      password?: string;
    },
    callback: (response: SocketResponse<{ room: RoomStateDTO }>) => void,
  ) => void;
  'join-room': (
    data: { code: string; password?: string; asSpectator?: boolean },
    callback: (response: SocketResponse<{ room: RoomStateDTO; gameState?: GameStateDTO }>) => void,
  ) => void;
  'leave-room': (callback?: (response: SocketResponse) => void) => void;
  'start-game': (callback: (response: SocketResponse<{ room: RoomStateDTO }>) => void) => void;
  'player-ready': (
    data: { ready: boolean },
    callback: (response: SocketResponse) => void,
  ) => void;
  'play-card': (
    data: { cardId: string },
    callback: (response: SocketResponse<{ gameState: GameStateDTO }>) => void,
  ) => void;
  'chat-message': (
    data: { message: string },
    callback: (response: SocketResponse<{ message: ChatMessageDTO }>) => void,
  ) => void;
  emoji: (
    data: { emoji: string },
    callback: (response: SocketResponse) => void,
  ) => void;
  typing: (data: { isTyping: boolean }) => void;
  reconnect: (
    data: { sessionToken: string },
    callback: (response: SocketResponse<{ gameState: GameStateDTO; room: RoomStateDTO }>) => void,
  ) => void;
  'spectator-join': (
    data: { code: string; password?: string },
    callback: (response: SocketResponse<{ room: RoomStateDTO }>) => void,
  ) => void;
  'find-match': (
    callback: (response: SocketResponse<{ room: RoomStateDTO }>) => void,
  ) => void;
  'admin-kick': (
    data: { roomId: string; playerId: string },
    callback: (response: SocketResponse) => void,
  ) => void;
  'admin-end-room': (
    data: { roomId: string },
    callback: (response: SocketResponse) => void,
  ) => void;
  'admin-stats': (callback: (response: SocketResponse<{ stats: ServerStatsDTO }>) => void) => void;
  'admin-rooms': (
    callback: (response: SocketResponse<{ rooms: RoomStateDTO[] }>) => void,
  ) => void;
  ping: (callback: (response: { pong: number }) => void) => void;
}

// Server -> Client events
export interface ServerToClientEvents {
  'room-updated': (room: RoomStateDTO) => void;
  'game-state': (gameState: GameStateDTO) => void;
  'shuffle': (data: { roomId: string; dealerSeatIndex: number }) => void;
  'deal-cards': (data: { gameState: GameStateDTO; animated?: boolean }) => void;
  'play-card': (data: { play: { playerId: string; cardId: string; seatIndex: number }; gameState: GameStateDTO }) => void;
  'turn-change': (data: { seatIndex: number; expiresAt: string }) => void;
  'trick-winner': (data: { winnerId: string; winnerSeatIndex: number; trick: GameStateDTO['room']['currentTrick']; gameState: GameStateDTO }) => void;
  'round-end': (data: { roundScore: import('./types.js').RoundScoreDTO; gameState: GameStateDTO }) => void;
  'game-end': (data: { winnerTeam: import('./types.js').Team | null; matchScore: import('./types.js').MatchScoreDTO; history: MatchHistoryDTO }) => void;
  'score-update': (data: { matchScore: import('./types.js').MatchScoreDTO }) => void;
  'chat-message': (message: ChatMessageDTO) => void;
  emoji: (data: { userId: string; emoji: string }) => void;
  typing: (data: { userId: string; isTyping: boolean }) => void;
  'player-connected': (data: { playerId: string; isConnected: boolean }) => void;
  'spectator-joined': (spectator: import('./types.js').PlayerDTO) => void;
  error: (error: { code: string; message: string }) => void;
  'match-found': (room: RoomStateDTO) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  userId: string;
  username: string;
  displayName: string;
  roomId?: string;
  playerId?: string;
  sessionToken?: string;
  isAdmin?: boolean;
}

export interface SocketResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

export const DEFAULT_ROOM_SETTINGS: RoomSettingsDTO = {
  targetScore: TargetScore.HUNDRED,
  maxRounds: 10,
  visibility: RoomVisibility.PRIVATE,
  turnTimer: TurnTimer.FORTY_FIVE,
  autoPlayTimeout: true,
  botsEnabled: true,
};

export const SOCKET_EVENTS = {
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  CREATE_ROOM: 'create-room',
  JOIN_ROOM: 'join-room',
  LEAVE_ROOM: 'leave-room',
  START_GAME: 'start-game',
  SHUFFLE: 'shuffle',
  DEAL_CARDS: 'deal-cards',
  PLAY_CARD: 'play-card',
  TURN_CHANGE: 'turn-change',
  TRICK_WINNER: 'trick-winner',
  ROUND_END: 'round-end',
  GAME_END: 'game-end',
  SCORE_UPDATE: 'score-update',
  CHAT_MESSAGE: 'chat-message',
  EMOJI: 'emoji',
  TYPING: 'typing',
  RECONNECT: 'reconnect',
  SPECTATOR_JOIN: 'spectator-join',
  PLAYER_READY: 'player-ready',
  FIND_MATCH: 'find-match',
  ROOM_UPDATED: 'room-updated',
  GAME_STATE: 'game-state',
  MATCH_FOUND: 'match-found',
} as const;

export type SocketEventName = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

export type { AuthResponse, UserDTO, GameStateDTO, RoomStateDTO, ChatMessageDTO };
