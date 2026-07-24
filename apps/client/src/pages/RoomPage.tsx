import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GamePhase } from '@mindi-coat/shared';
import { useGameStore } from '@/store/gameStore';
import { useAuthStore } from '@/store/authStore';
import { useSocket } from '@/hooks/useSocket';
import { GameTable } from '@/components/GameTable';
import { GameEndModal } from '@/components/GameEndModal';

export function RoomPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { emit } = useSocket();
  const user = useAuthStore((s) => s.user);
  const { room, gameState, chatMessages, gameWinner, matchScore, isDealing, reset } =
    useGameStore();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!room && code) {
      emit('join-room', { code }, (res) => {
        if (!res.success) setError(res.error?.message ?? 'Failed to join');
      });
    }
  }, [code, room, emit]);

  const isHost = room?.players.some((p) => p.userId === user?.id && p.id === room.hostId);
  const myPlayer = room?.players.find((p) => p.userId === user?.id);
  const isPlaying = room?.phase === GamePhase.PLAYING || room?.phase === GamePhase.DEALING;

  const toggleReady = () => {
    const newReady = !ready;
    setReady(newReady);
    emit('player-ready', { ready: newReady }, () => {});
  };

  const startGame = () => {
    emit('start-game', (res) => {
      if (!res.success) setError(res.error?.message ?? 'Cannot start game');
    });
  };

  const playCard = (cardId: string) => {
    emit('play-card', { cardId }, () => {});
  };

  const sendChat = (message: string) => {
    emit('chat-message', { message }, () => {});
  };

  const sendEmoji = (emoji: string) => {
    emit('emoji', { emoji }, () => {});
    emit('chat-message', { message: emoji }, () => {});
  };

  const copyInvite = () => {
    if (room?.inviteLink) {
      navigator.clipboard.writeText(room.inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (gameWinner && matchScore) {
    return (
      <GameEndModal
        winnerTeam={gameWinner}
        matchScore={matchScore}
        onClose={() => {
          reset();
          navigate('/lobby');
        }}
      />
    );
  }

  if (isPlaying && gameState) {
    return (
      <div className="min-h-screen p-2 md:p-4">
        <GameTable
          gameState={gameState}
          onPlayCard={playCard}
          onSendChat={sendChat}
          onEmoji={sendEmoji}
          chatMessages={chatMessages}
          isDealing={isDealing}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-3xl mx-auto">
      <div className="glass rounded-2xl p-6 space-y-6">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">{room?.name ?? 'Loading...'}</h1>
            <p className="text-amber-400 font-mono text-lg tracking-widest">{room?.code ?? code}</p>
          </div>
          <button
            type="button"
            onClick={copyInvite}
            className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg text-sm"
          >
            {copied ? 'Copied!' : 'Copy Invite Link'}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {room?.players.map((player) => (
            <div
              key={player.id}
              className={`glass rounded-xl p-4 text-center ${
                player.isReady ? 'ring-2 ring-emerald-500' : ''
              }`}
            >
              <span className="text-3xl">{player.avatar}</span>
              <p className="font-semibold mt-2 truncate">{player.displayName}</p>
              <p className="text-xs text-slate-400">Team {player.team}</p>
              {player.isReady && <p className="text-xs text-emerald-400 mt-1">Ready</p>}
            </div>
          ))}
          {Array.from({ length: Math.max(0, 4 - (room?.players.length ?? 0)) }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="glass rounded-xl p-4 text-center border border-dashed border-slate-600"
            >
              <span className="text-3xl opacity-30">🪑</span>
              <p className="text-slate-500 mt-2 text-sm">Waiting...</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          {myPlayer && (
            <button
              type="button"
              onClick={toggleReady}
              className={`px-6 py-3 rounded-xl font-bold ${
                ready ? 'bg-amber-600 hover:bg-amber-500' : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
            >
              {ready ? 'Not Ready' : 'Ready'}
            </button>
          )}
          {isHost && (
            <button
              type="button"
              onClick={startGame}
              disabled={(room?.players.length ?? 0) < 4}
              className="px-6 py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 disabled:opacity-40"
            >
              Start Game
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              emit('leave-room');
              reset();
              navigate('/lobby');
            }}
            className="px-6 py-3 rounded-xl font-bold bg-red-900/50 hover:bg-red-800/50"
          >
            Leave
          </button>
        </div>

        {error && <p className="text-red-400">{error}</p>}
      </div>
    </div>
  );
}
