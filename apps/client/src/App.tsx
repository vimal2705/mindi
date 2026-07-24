import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { HomePage } from '@/pages/HomePage';
import { LobbyPage } from '@/pages/LobbyPage';
import { RoomPage } from '@/pages/RoomPage';
import { AdminPage } from '@/pages/AdminPage';

function JoinRedirect() {
  const { code } = useParams<{ code: string }>();
  return <Navigate to={`/room/${code}`} replace />;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function App() {
  const { darkMode, toggleDarkMode, toggleSound, soundEnabled } = useAuthStore();

  return (
    <BrowserRouter>
      <div className={darkMode ? 'dark' : ''}>
        <header className="fixed top-0 right-0 p-4 flex gap-2 z-40">
          <button
            type="button"
            onClick={toggleDarkMode}
            className="glass px-3 py-1 rounded-lg text-sm"
          >
            {darkMode ? '🌙' : '☀️'}
          </button>
          <button
            type="button"
            onClick={toggleSound}
            className="glass px-3 py-1 rounded-lg text-sm"
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
        </header>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/lobby"
            element={
              <ProtectedRoute>
                <LobbyPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/room/:code"
            element={
              <ProtectedRoute>
                <RoomPage />
              </ProtectedRoute>
            }
          />
          <Route path="/join/:code" element={<JoinRedirect />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
