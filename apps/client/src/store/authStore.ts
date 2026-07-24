import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserDTO } from '@mindi-coat/shared';
import { guestLogin } from '@/lib/api';

interface AuthState {
  token: string | null;
  user: UserDTO | null;
  sessionToken: string | null;
  darkMode: boolean;
  soundEnabled: boolean;
  login: (displayName?: string, onProgress?: (message: string) => void) => Promise<void>;
  logout: () => void;
  setSessionToken: (token: string) => void;
  toggleDarkMode: () => void;
  toggleSound: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      sessionToken: null,
      darkMode: true,
      soundEnabled: true,
      login: async (displayName, onProgress) => {
        const result = await guestLogin(displayName, onProgress);
        set({ token: result.token, user: result.user });
      },
      logout: () => set({ token: null, user: null, sessionToken: null }),
      setSessionToken: (sessionToken) => set({ sessionToken }),
      toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
    }),
    { name: 'mindi-coat-auth' },
  ),
);
