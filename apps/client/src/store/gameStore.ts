import { create } from 'zustand';
import type {
  ChatMessageDTO,
  GameStateDTO,
  RoomStateDTO,
  RoundScoreDTO,
  Team,
  MatchScoreDTO,
} from '@mindi-coat/shared';

interface GameState {
  room: RoomStateDTO | null;
  gameState: GameStateDTO | null;
  chatMessages: ChatMessageDTO[];
  typingUsers: Set<string>;
  lastRoundScore: RoundScoreDTO | null;
  gameWinner: Team | null;
  matchScore: MatchScoreDTO | null;
  isDealing: boolean;
  setRoom: (room: RoomStateDTO | null) => void;
  setGameState: (state: GameStateDTO | null) => void;
  addChatMessage: (msg: ChatMessageDTO) => void;
  setTyping: (userId: string, isTyping: boolean) => void;
  setLastRoundScore: (score: RoundScoreDTO | null) => void;
  setGameWinner: (team: Team | null) => void;
  setMatchScore: (score: MatchScoreDTO) => void;
  setIsDealing: (dealing: boolean) => void;
  reset: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  room: null,
  gameState: null,
  chatMessages: [],
  typingUsers: new Set(),
  lastRoundScore: null,
  gameWinner: null,
  matchScore: null,
  isDealing: false,
  setRoom: (room) => set({ room }),
  setGameState: (gameState) => set({ gameState, room: gameState?.room ?? null }),
  addChatMessage: (msg) =>
    set((s) => ({ chatMessages: [...s.chatMessages.slice(-99), msg] })),
  setTyping: (userId, isTyping) =>
    set((s) => {
      const typingUsers = new Set(s.typingUsers);
      if (isTyping) typingUsers.add(userId);
      else typingUsers.delete(userId);
      return { typingUsers };
    }),
  setLastRoundScore: (lastRoundScore) => set({ lastRoundScore }),
  setGameWinner: (gameWinner) => set({ gameWinner }),
  setMatchScore: (matchScore) => set({ matchScore }),
  setIsDealing: (isDealing) => set({ isDealing }),
  reset: () =>
    set({
      room: null,
      gameState: null,
      chatMessages: [],
      typingUsers: new Set(),
      lastRoundScore: null,
      gameWinner: null,
      matchScore: null,
      isDealing: false,
    }),
}));
