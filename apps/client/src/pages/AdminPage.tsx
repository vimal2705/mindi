import { useState } from 'react';
import { getAdminStats, getAdminRooms } from '@/lib/api';

export function AdminPage() {
  const [adminKey, setAdminKey] = useState('');
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [rooms, setRooms] = useState<unknown[]>([]);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const [statsRes, roomsRes] = await Promise.all([
        getAdminStats(adminKey),
        getAdminRooms(adminKey),
      ]);
      setStats(statsRes.stats);
      setRooms(roomsRes.rooms);
      setError('');
    } catch {
      setError('Invalid admin key or server error');
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-amber-400 mb-6">Admin Panel</h1>
      <div className="glass rounded-xl p-4 flex gap-2 mb-6">
        <input
          value={adminKey}
          onChange={(e) => setAdminKey(e.target.value)}
          placeholder="Admin secret key"
          type="password"
          className="flex-1 bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2"
        />
        <button
          type="button"
          onClick={load}
          className="bg-emerald-600 hover:bg-emerald-500 px-6 py-2 rounded-lg font-bold"
        >
          Load
        </button>
      </div>

      {error && <p className="text-red-400 mb-4">{error}</p>}

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {Object.entries(stats).map(([key, value]) => (
            <div key={key} className="glass rounded-xl p-4 text-center">
              <p className="text-xs text-slate-400 uppercase">{key}</p>
              <p className="text-2xl font-bold">{Math.round(value as number)}</p>
            </div>
          ))}
        </div>
      )}

      {rooms.length > 0 && (
        <div className="glass rounded-xl p-4">
          <h2 className="font-bold mb-3">Active Rooms ({rooms.length})</h2>
          <pre className="text-xs overflow-auto max-h-96 text-slate-400">
            {JSON.stringify(rooms, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
