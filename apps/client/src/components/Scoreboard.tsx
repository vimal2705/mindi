import { motion } from 'framer-motion';
import type { MatchScoreDTO, RoundScoreDTO } from '@mindi-coat/shared';

interface ScoreboardProps {
  matchScore: MatchScoreDTO;
  roundHistory: RoundScoreDTO[];
}

export function Scoreboard({ matchScore, roundHistory }: ScoreboardProps) {
  return (
    <div className="glass rounded-xl p-4 space-y-3">
      <h3 className="font-bold text-amber-400">Scoreboard</h3>
      <div className="grid grid-cols-2 gap-3">
        <motion.div
          className="bg-emerald-900/40 rounded-lg p-3 text-center border border-emerald-700/50"
          whileHover={{ scale: 1.02 }}
        >
          <p className="text-xs text-emerald-300">Team A</p>
          <p className="text-2xl font-bold">{matchScore.teamA}</p>
        </motion.div>
        <motion.div
          className="bg-blue-900/40 rounded-lg p-3 text-center border border-blue-700/50"
          whileHover={{ scale: 1.02 }}
        >
          <p className="text-xs text-blue-300">Team B</p>
          <p className="text-2xl font-bold">{matchScore.teamB}</p>
        </motion.div>
      </div>
      <p className="text-xs text-slate-400 text-center">
        Target: {matchScore.targetScore} · Round {matchScore.roundsPlayed}
      </p>
      {roundHistory.length > 0 && (
        <div className="max-h-32 overflow-y-auto text-xs space-y-1">
          {[...roundHistory].reverse().slice(0, 5).map((r) => (
            <div key={r.roundNumber} className="flex justify-between text-slate-400">
              <span>R{r.roundNumber}</span>
              <span>
                {r.teamAPoints}-{r.teamBPoints}
                {r.coatTeam && ` · Coat ${r.coatTeam}`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
