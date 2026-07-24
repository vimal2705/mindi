import { motion } from 'framer-motion';
import { PlayerSeat } from './PlayerSeat';
import { TrickArea } from './TrickArea';
import { PlayingCard } from './PlayingCard';
import { Scoreboard } from './Scoreboard';
import { RoomChat } from './RoomChat';
import type { GameStateDTO } from '@mindi-coat/shared';

interface GameTableProps {
  gameState: GameStateDTO;
  onPlayCard: (cardId: string) => void;
  onSendChat: (message: string) => void;
  onEmoji: (emoji: string) => void;
  chatMessages: import('@mindi-coat/shared').ChatMessageDTO[];
  isDealing?: boolean;
}

const SEAT_POSITIONS: Array<'bottom' | 'left' | 'top' | 'right'> = [
  'bottom',
  'left',
  'top',
  'right',
];

export function GameTable({
  gameState,
  onPlayCard,
  onSendChat,
  onEmoji,
  chatMessages,
  isDealing,
}: GameTableProps) {
  const { room, myHand, myPlayerId, canPlay, validCards } = gameState;
  const myPlayer = room.players.find((p) => p.id === myPlayerId);
  const mySeat = myPlayer?.seatIndex ?? 0;

  const getRelativeSeat = (seatIndex: number) => {
    const diff = (seatIndex - mySeat + 4) % 4;
    return SEAT_POSITIONS[diff];
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 h-full">
      <div className="relative min-h-[420px] md:min-h-[520px]">
        <div className="felt-table rounded-3xl relative w-full h-full min-h-[420px] border-4 border-amber-900/40 overflow-hidden">
          {room.players.map((player) => (
            <PlayerSeat
              key={player.id}
              player={player}
              position={getRelativeSeat(player.seatIndex)}
              isCurrentTurn={room.currentTurnSeatIndex === player.seatIndex}
              isMe={player.id === myPlayerId}
            />
          ))}

          <TrickArea trick={room.currentTrick} />

          {isDealing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex items-center justify-center bg-black/30 z-10"
            >
              <motion.p
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="text-xl font-bold text-amber-300"
              >
                Dealing cards...
              </motion.p>
            </motion.div>
          )}

          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 flex-wrap justify-center max-w-full px-2">
            {myHand.map((card) => (
              <PlayingCard
                key={card.id}
                card={card}
                disabled={!canPlay || !validCards.includes(card.id)}
                onClick={() => onPlayCard(card.id)}
                layoutId={card.id}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <Scoreboard matchScore={room.matchScore} roundHistory={room.roundHistory} />
        <RoomChat messages={chatMessages} onSend={onSendChat} onEmoji={onEmoji} />
      </div>
    </div>
  );
}
