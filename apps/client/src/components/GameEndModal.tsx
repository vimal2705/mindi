import { motion } from 'framer-motion';
import type { Team, MatchScoreDTO } from '@mindi-coat/shared';

interface GameEndModalProps {
  winnerTeam: Team | null;
  matchScore: MatchScoreDTO;
  onClose: () => void;
}

export function GameEndModal({ winnerTeam, matchScore, onClose }: GameEndModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
    >
      <motion.div
        initial={{ scale: 0.8, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        className="glass rounded-2xl p-8 max-w-md w-full text-center space-y-4"
      >
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ repeat: 3, duration: 0.5 }}
          className="text-6xl"
        >
          🏆
        </motion.div>
        <h2 className="text-2xl font-bold text-amber-400">Game Over!</h2>
        {winnerTeam ? (
          <p className="text-lg">Team {winnerTeam} wins!</p>
        ) : (
          <p className="text-lg">It&apos;s a draw!</p>
        )}
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="bg-emerald-900/40 rounded-lg p-3">
            <p className="text-sm text-emerald-300">Team A</p>
            <p className="text-3xl font-bold">{matchScore.teamA}</p>
          </div>
          <div className="bg-blue-900/40 rounded-lg p-3">
            <p className="text-sm text-blue-300">Team B</p>
            <p className="text-3xl font-bold">{matchScore.teamB}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-full bg-emerald-600 hover:bg-emerald-500 py-3 rounded-xl font-semibold"
        >
          Back to Lobby
        </button>
      </motion.div>
    </motion.div>
  );
}
