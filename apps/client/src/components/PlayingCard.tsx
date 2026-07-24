import { memo } from 'react';
import { motion } from 'framer-motion';
import {
  SUIT_COLORS,
  SUIT_SYMBOLS,
  Rank,
  type CardDTO,
  type Suit,
} from '@mindi-coat/shared';

const RANK_LABELS: Record<Rank, string> = {
  [Rank.TWO]: '2',
  [Rank.THREE]: '3',
  [Rank.FOUR]: '4',
  [Rank.FIVE]: '5',
  [Rank.SIX]: '6',
  [Rank.SEVEN]: '7',
  [Rank.EIGHT]: '8',
  [Rank.NINE]: '9',
  [Rank.TEN]: '10',
  [Rank.JACK]: 'J',
  [Rank.QUEEN]: 'Q',
  [Rank.KING]: 'K',
  [Rank.ACE]: 'A',
};

interface PlayingCardProps {
  card?: CardDTO;
  faceDown?: boolean;
  selected?: boolean;
  disabled?: boolean;
  small?: boolean;
  onClick?: () => void;
  layoutId?: string;
}

export const PlayingCard = memo(function PlayingCard({
  card,
  faceDown = false,
  selected = false,
  disabled = false,
  small = false,
  onClick,
  layoutId,
}: PlayingCardProps) {
  const size = small ? 'w-10 h-14 text-[10px]' : 'w-14 h-20 sm:w-16 sm:h-24 text-sm';

  if (faceDown || !card) {
    return (
      <motion.div
        layoutId={layoutId}
        className={`${size} rounded-lg card-shadow bg-gradient-to-br from-blue-900 to-blue-950 border border-blue-700 flex items-center justify-center`}
      />
    );
  }

  const color = SUIT_COLORS[card.suit as Suit];
  const textColor = color === 'red' ? 'text-red-600' : 'text-slate-900';

  return (
    <motion.button
      type="button"
      layoutId={layoutId}
      whileHover={!disabled ? { y: -8, scale: 1.05 } : undefined}
      whileTap={!disabled ? { scale: 0.95 } : undefined}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`${size} rounded-lg card-shadow bg-[var(--card-white)] border-2 flex flex-col items-center justify-between p-1 transition-all ${
        selected ? 'border-amber-400 -translate-y-3 ring-2 ring-amber-400/50' : 'border-slate-200'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={`font-bold ${textColor}`}>{RANK_LABELS[card.rank]}</span>
      <span className={`text-xl ${textColor}`}>{SUIT_SYMBOLS[card.suit as Suit]}</span>
      {card.isMindi && (
        <span className="text-[8px] bg-amber-400 text-amber-950 px-1 rounded font-bold">M</span>
      )}
    </motion.button>
  );
});
