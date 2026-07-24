import { motion, AnimatePresence } from 'framer-motion';
import { PlayingCard } from './PlayingCard';
import type { TrickDTO } from '@mindi-coat/shared';

interface TrickAreaProps {
  trick: TrickDTO;
}

const seatPositions = [
  'bottom-1/2 left-1/2 -translate-x-1/2 translate-y-8',
  'bottom-1/2 left-1/2 -translate-x-1/2 -translate-y-16',
  'bottom-1/2 left-1/2 -translate-x-24',
  'bottom-1/2 left-1/2 translate-x-8',
];

export function TrickArea({ trick }: TrickAreaProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <AnimatePresence>
        {trick.plays.map((play) => (
          <motion.div
            key={play.card.id}
            initial={{ opacity: 0, scale: 0.5, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`absolute ${seatPositions[play.seatIndex] ?? seatPositions[0]}`}
          >
            <PlayingCard card={play.card} small />
          </motion.div>
        ))}
      </AnimatePresence>
      {trick.leadSuit && (
        <div className="absolute top-1/3 text-xs text-amber-300/80 glass px-2 py-1 rounded">
          Lead: {trick.leadSuit}
        </div>
      )}
    </div>
  );
}
