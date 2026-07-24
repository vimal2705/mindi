import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { useSocket } from '@/hooks/useSocket';

export function HomePage() {
  const navigate = useNavigate();
  const { user, login, logout, token } = useAuthStore();
  const { emit } = useSocket();
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    setStatus('Starting...');
    try {
      await login(displayName || undefined, setStatus);
      setStatus('');
    } catch {
      setError(
        'Could not reach the game server. On free hosting it may take up to 60 seconds to wake up — please try again.',
      );
      setStatus('');
    } finally {
      setLoading(false);
    }
  };

  const handleFindMatch = () => {
    emit('find-match', (res) => {
      if (res.success && res.data) {
        navigate(`/room/${res.data.room.code}`);
      } else {
        setError(res.error?.message ?? 'Matchmaking failed');
      }
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <motion.span
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ repeat: Infinity, duration: 4 }}
          className="text-7xl block mb-4"
        >
          🎴
        </motion.span>
        <h1 className="text-4xl md:text-6xl font-black bg-gradient-to-r from-amber-400 to-emerald-400 bg-clip-text text-transparent">
          Mindi Coat
        </h1>
        <p className="text-slate-400 mt-2">Traditional Indian multiplayer card game</p>
      </motion.div>

      {!token ? (
        <div className="glass rounded-2xl p-6 w-full max-w-md space-y-4">
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Enter display name (optional)"
            disabled={loading}
            className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 py-3 rounded-xl font-bold text-lg"
          >
            {loading ? 'Connecting...' : 'Play as Guest'}
          </button>
          {status && (
            <p className="text-amber-300 text-sm text-center animate-pulse">{status}</p>
          )}
        </div>
      ) : (
        <div className="glass rounded-2xl p-6 w-full max-w-md space-y-3">
          <p className="text-center text-slate-300">
            Welcome, <span className="text-amber-400 font-semibold">{user?.displayName}</span>!
          </p>
          <button
            type="button"
            onClick={() => navigate('/lobby')}
            className="w-full bg-emerald-600 hover:bg-emerald-500 py-3 rounded-xl font-bold"
          >
            Enter Lobby
          </button>
          <button
            type="button"
            onClick={handleFindMatch}
            className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-bold"
          >
            Quick Match
          </button>
          <button
            type="button"
            onClick={logout}
            className="w-full text-slate-400 hover:text-white py-2 text-sm"
          >
            Logout
          </button>
        </div>
      )}

      {error && <p className="text-red-400 mt-4 text-sm text-center max-w-md">{error}</p>}

      <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl text-center text-sm text-slate-500">
        <div>4 Players</div>
        <div>Team Play</div>
        <div>Real-time</div>
        <div>Spectator Mode</div>
      </div>
    </div>
  );
}
