import { useEffect, useCallback, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketResponse,
} from '@mindi-coat/shared';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/authStore';
import { useGameStore } from '@/store/gameStore';
import { audioManager } from '@/lib/audio';

type EmitFn = {
  <K extends keyof ClientToServerEvents>(
    event: K,
    ...args: [...Parameters<ClientToServerEvents[K]>]
  ): void;
};

export function useSocket(): { emit: EmitFn } {
  const token = useAuthStore((s) => s.token);
  const soundEnabled = useAuthStore((s) => s.soundEnabled);
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);

  const {
    setRoom,
    setGameState,
    addChatMessage,
    setTyping,
    setLastRoundScore,
    setGameWinner,
    setMatchScore,
    setIsDealing,
  } = useGameStore();

  useEffect(() => {
    audioManager.setEnabled(soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    if (!token) return;
    const socket = getSocket(token);
    socketRef.current = socket;

    socket.on('room-updated', (room) => setRoom(room));
    socket.on('game-state', (state) => setGameState(state));
    socket.on('shuffle', () => {
      audioManager.play('shuffle');
      setIsDealing(true);
    });
    socket.on('deal-cards', ({ gameState }) => {
      audioManager.play('deal');
      setGameState(gameState);
      setTimeout(() => setIsDealing(false), 1500);
    });
    socket.on('play-card', ({ gameState }) => {
      audioManager.play('play');
      setGameState(gameState);
    });
    socket.on('trick-winner', ({ gameState }) => {
      audioManager.play('win');
      setGameState(gameState);
    });
    socket.on('round-end', ({ roundScore, gameState }) => {
      setLastRoundScore(roundScore);
      setGameState(gameState);
    });
    socket.on('score-update', ({ matchScore }) => setMatchScore(matchScore));
    socket.on('game-end', ({ winnerTeam, matchScore }) => {
      audioManager.play('gameover');
      setGameWinner(winnerTeam);
      setMatchScore(matchScore);
    });
    socket.on('chat-message', addChatMessage);
    socket.on('typing', ({ userId, isTyping }) => setTyping(userId, isTyping));
    socket.on('error', (err) => console.error('Socket error:', err));

    socket.io.on('reconnect', () => {
      const sessionToken = useAuthStore.getState().sessionToken;
      if (sessionToken) {
        socket.emit(
          'reconnect',
          { sessionToken },
          (
            res: SocketResponse<{
              room: import('@mindi-coat/shared').RoomStateDTO;
              gameState: import('@mindi-coat/shared').GameStateDTO;
            }>,
          ) => {
            if (res.success && res.data) {
              setRoom(res.data.room);
              setGameState(res.data.gameState);
            }
          },
        );
      }
    });

    return () => {
      socket.off('room-updated');
      socket.off('game-state');
      socket.off('shuffle');
      socket.off('deal-cards');
      socket.off('play-card');
      socket.off('trick-winner');
      socket.off('round-end');
      socket.off('score-update');
      socket.off('game-end');
      socket.off('chat-message');
      socket.off('typing');
      socket.off('error');
    };
  }, [
    token,
    setRoom,
    setGameState,
    addChatMessage,
    setTyping,
    setLastRoundScore,
    setGameWinner,
    setMatchScore,
    setIsDealing,
  ]);

  const emit = useCallback<EmitFn>((event, ...args) => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit(event, ...(args as Parameters<ClientToServerEvents[typeof event]>));
  }, []);

  return { emit };
}
