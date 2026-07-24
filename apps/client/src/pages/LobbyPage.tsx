import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TargetScore, TurnTimer, RoomVisibility } from '@mindi-coat/shared';
import { useSocket } from '@/hooks/useSocket';

export function LobbyPage() {
  const navigate = useNavigate();
  const { emit } = useSocket();
  const [roomName, setRoomName] = useState('');
  const [password, setPassword] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [targetScore, setTargetScore] = useState<TargetScore>(TargetScore.HUNDRED);
  const [turnTimer, setTurnTimer] = useState<TurnTimer>(TurnTimer.FORTY_FIVE);
  const [visibility, setVisibility] = useState<RoomVisibility>(RoomVisibility.PRIVATE);
  const [error, setError] = useState('');

  const createRoom = () => {
    emit(
      'create-room',
      {
        name: roomName || 'Mindi Room',
        settings: { targetScore, turnTimer, visibility, botsEnabled: true },
        password: password || undefined,
      },
      (res) => {
        if (res.success && res.data) {
          navigate(`/room/${res.data.room.code}`);
        } else {
          setError(res.error?.message ?? 'Failed to create room');
        }
      },
    );
  };

  const joinRoom = (asSpectator = false) => {
    emit(
      'join-room',
      { code: joinCode.toUpperCase(), password: password || undefined, asSpectator },
      (res) => {
        if (res.success && res.data) {
          navigate(`/room/${res.data.room.code}`);
        } else {
          setError(res.error?.message ?? 'Failed to join room');
        }
      },
    );
  };

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-amber-400">Game Lobby</h1>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-6 space-y-4">
          <h2 className="font-bold text-lg">Create Room</h2>
          <input
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="Room name"
            className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (optional)"
            type="password"
            className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2"
          />
          <label className="block text-sm text-slate-400">
            Target Score
            <select
              value={targetScore}
              onChange={(e) => setTargetScore(Number(e.target.value) as TargetScore)}
              className="w-full mt-1 bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2"
            >
              {Object.values(TargetScore)
                .filter((v) => typeof v === 'number')
                .map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
            </select>
          </label>
          <label className="block text-sm text-slate-400">
            Turn Timer
            <select
              value={turnTimer}
              onChange={(e) => setTurnTimer(Number(e.target.value) as TurnTimer)}
              className="w-full mt-1 bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2"
            >
              {Object.values(TurnTimer)
                .filter((v) => typeof v === 'number')
                .map((v) => (
                  <option key={v} value={v}>
                    {v}s
                  </option>
                ))}
            </select>
          </label>
          <label className="block text-sm text-slate-400">
            Visibility
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as RoomVisibility)}
              className="w-full mt-1 bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2"
            >
              <option value={RoomVisibility.PRIVATE}>Private</option>
              <option value={RoomVisibility.PUBLIC}>Public</option>
            </select>
          </label>
          <button
            type="button"
            onClick={createRoom}
            className="w-full bg-emerald-600 hover:bg-emerald-500 py-3 rounded-xl font-bold"
          >
            Create Room
          </button>
        </div>

        <div className="glass rounded-2xl p-6 space-y-4">
          <h2 className="font-bold text-lg">Join Room</h2>
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Room code"
            className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2 uppercase tracking-widest"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (if required)"
            type="password"
            className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2"
          />
          <button
            type="button"
            onClick={() => joinRoom(false)}
            className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-bold"
          >
            Join as Player
          </button>
          <button
            type="button"
            onClick={() => joinRoom(true)}
            className="w-full bg-purple-600 hover:bg-purple-500 py-3 rounded-xl font-bold"
          >
            Join as Spectator
          </button>
        </div>
      </div>

      {error && <p className="text-red-400 mt-4">{error}</p>}
    </div>
  );
}
