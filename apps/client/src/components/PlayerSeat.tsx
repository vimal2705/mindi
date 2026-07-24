import { motion } from 'framer-motion';
import type { PlayerDTO } from '@mindi-coat/shared';

interface PlayerSeatProps {
  player: PlayerDTO;
  position: 'top' | 'left' | 'right' | 'bottom';
  isCurrentTurn?: boolean;
  isMe?: boolean;
}

const positionClasses = {
  top: 'top-2 left-1/2 -translate-x-1/2',
  bottom: 'bottom-28 left-1/2 -translate-x-1/2',
  left: 'left-2 top-1/2 -translate-y-1/2',
  right: 'right-2 top-1/2 -translate-y-1/2',
};

export function PlayerSeat({ player, position, isCurrentTurn, isMe }: PlayerSeatProps) {
  return (
    <motion.div
      animate={isCurrentTurn ? { scale: [1, 1.05, 1] } : { scale: 1 }}
      transition={{ repeat: isCurrentTurn ? Infinity : 0, duration: 1.5 }}
      className={`absolute ${positionClasses[position]} flex flex-col items-center gap-1`}
    >
      <div
        className={`relative flex items-center gap-2 glass rounded-full px-3 py-2 ${
          isCurrentTurn ? 'ring-2 ring-amber-400 shadow-lg shadow-amber-400/20' : ''
        } ${isMe ? 'border border-emerald-400/50' : ''}`}
      >
        <span className="text-2xl">{player.avatar}</span>
        <div className="text-left">
          <p className="text-sm font-semibold truncate max-w-24">{player.displayName}</p>
          <p className="text-xs text-slate-400">
            Team {player.team} · {player.cardCount} cards
          </p>
        </div>
        {!player.isConnected && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
        )}
        {player.isBot && (
          <span className="text-[10px] bg-purple-600 px-1 rounded">BOT</span>
        )}
        {player.isReady && !player.isBot && (
          <span className="text-[10px] bg-emerald-600 px-1 rounded">READY</span>
        )}
      </div>
    </motion.div>
  );
}
